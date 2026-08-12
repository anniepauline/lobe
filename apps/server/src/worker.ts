import { classifyPost, createEmbedding, discoverRecipe } from "@lobe/ai";
import {
  activateDiscoveredRecipe,
  claimNextJob,
  completeJob,
  completeSaveClassification,
  failSave,
  getRecipeFailure,
  getSave,
  markSaveProcessing,
  releaseStaleJobs,
  retryOrFailJob,
  seedBundledRecipe,
} from "@lobe/db";
import {
  capturedPostSchema,
  recipeFailureRequestSchema,
  type CapturedPost,
} from "@lobe/shared";

function rowToCapture(
  row: NonNullable<Awaited<ReturnType<typeof getSave>>>,
): CapturedPost {
  return capturedPostSchema.parse({
    platform: row.platform,
    sourceId: row.sourceId,
    canonicalUrl: row.canonicalUrl,
    pageUrl: row.pageUrl,
    content: row.content,
    author: {
      name: row.authorName,
      handle: row.authorHandle,
      avatarUrl: row.authorAvatarUrl,
    },
    publishedAt: row.publishedAt?.toISOString() ?? null,
    media: row.media,
    screenshot: null,
    capturedAt: row.createdAt.toISOString(),
    recipeVersion: row.recipeVersion,
    layoutFingerprint: row.layoutFingerprint,
  });
}

export async function processNextJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) {
    return false;
  }

  try {
    if (job.type === "classify_save") {
      if (!job.saveId) {
        throw new Error("Classification job is missing save_id");
      }

      const row = await getSave(job.saveId);
      if (!row) {
        await completeJob(job.id);
        return true;
      }

      await markSaveProcessing(row.id);
      const capture = rowToCapture(row);
      const { classification } = await classifyPost(capture);
      const embedding = await createEmbedding(
        [
          classification.summary,
          capture.content,
          `Intent: ${classification.intent}`,
          `Topics: ${classification.topics.join(", ")}`,
        ].join("\n"),
      );

      await completeSaveClassification(row.id, classification, embedding);
      await completeJob(job.id);
      return true;
    }

    if (!job.recipeFailureId) {
      throw new Error("Recipe discovery job is missing recipe_failure_id");
    }

    const failure = await getRecipeFailure(job.recipeFailureId);
    if (!failure) {
      await completeJob(job.id);
      return true;
    }

    const request = recipeFailureRequestSchema.parse({
      platform: failure.platform,
      currentRecipeVersion: failure.currentRecipeVersion,
      pageKind: failure.pageKind,
      layoutFingerprint: failure.layoutFingerprint,
      nodes: failure.nodes,
      observedAt: failure.lastSeenAt.toISOString(),
    });
    const discovered = await discoverRecipe(request);

    if (discovered) {
      await activateDiscoveredRecipe(failure.layoutFingerprint, discovered);
    }

    await completeJob(job.id);
    return true;
  } catch (error) {
    const exhausted = await retryOrFailJob(job, error);
    if (exhausted && job.saveId) {
      const reason =
        error instanceof Error ? error.message : "Background processing failed";
      await failSave(job.saveId, reason);
    }

    return true;
  }
}

export async function initializeWorker(): Promise<void> {
  await seedBundledRecipe();
  await releaseStaleJobs();
}

export function startWorker(signal: AbortSignal): void {
  const tick = async () => {
    if (signal.aborted) {
      return;
    }

    try {
      const processed = await processNextJob();
      setTimeout(tick, processed ? 0 : 750);
    } catch (error) {
      console.error("Lobe worker tick failed", error);
      setTimeout(tick, 2_000);
    }
  };

  void tick();
}
