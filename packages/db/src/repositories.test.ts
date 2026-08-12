import { afterAll, describe, expect, test } from "bun:test";
import { capturedPostSchema } from "@lobe/shared";

import {
  claimNextJob,
  closeDatabase,
  completeJob,
  completeSaveClassification,
  createSave,
  deleteSaveByUrl,
  getActiveRecipe,
  getSave,
  listSaves,
  markSaveProcessing,
  seedBundledRecipe,
  serializeSave,
  updateSaveIntent,
} from "./index";

const describeDatabase =
  process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

describeDatabase("Postgres repositories", () => {
  const sourceId = `9${Date.now()}`;
  const canonicalUrl = `https://x.com/lobe/status/${sourceId}`;

  afterAll(async () => {
    await deleteSaveByUrl(canonicalUrl);
    await closeDatabase();
  });

  test("persists, queues, classifies, searches, and updates a save", async () => {
    await seedBundledRecipe();
    const recipe = await getActiveRecipe();

    expect(recipe.selectors.unsavedControl).toContain("bookmark");

    const capture = capturedPostSchema.parse({
      platform: "x",
      sourceId,
      canonicalUrl,
      pageUrl: "https://x.com/home",
      content: "Rewriting Postgres in Rust with production-ready behavior.",
      author: {
        name: "Ben Dicken",
        handle: "@BenjDicken",
        avatarUrl: null,
      },
      publishedAt: "2026-08-12T12:00:00.000Z",
      media: [],
      screenshot: null,
      capturedAt: new Date().toISOString(),
      recipeVersion: recipe.version,
      layoutFingerprint: recipe.layoutFingerprint,
    });

    const created = await createSave(capture);
    const duplicate = await createSave(capture);

    expect(created.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.row.id).toBe(created.row.id);

    const job = await claimNextJob();
    expect(job?.saveId).toBe(created.row.id);

    await markSaveProcessing(created.row.id);
    const embedding = Array.from(
      { length: 1536 },
      (_, index) => ((index * 7919) % 10_007) / 10_007,
    );
    await completeSaveClassification(
      created.row.id,
      {
        intent: "build",
        confidence: 0.91,
        summary: "A production-ready Postgres reimplementation in Rust.",
        topics: ["Postgres", "Rust", "databases"],
        why: "The post is useful as a blueprint for a similar build.",
        alternatives: ["learn", "reference"],
      },
      embedding,
    );

    if (job) {
      await completeJob(job.id);
    }

    const stored = await getSave(created.row.id);
    expect(stored?.status).toBe("ready");
    expect(stored?.intent).toBe("build");

    const results = await listSaves({
      query: "Rust",
      intent: null,
      cursor: null,
      limit: 10,
    });
    expect(results.rows.some((row) => row.id === created.row.id)).toBe(true);

    const semanticResults = await listSaves({
      query: "database implementation",
      intent: null,
      cursor: null,
      limit: 10,
      embedding,
    });
    expect(semanticResults.rows[0]?.id).toBe(created.row.id);

    const updated = await updateSaveIntent(created.row.id, "learn");
    expect(updated?.intent).toBe("learn");
    expect(updated ? serializeSave(updated).needsReview : true).toBe(false);
  });
});
