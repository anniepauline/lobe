import {
  LOW_CONFIDENCE_THRESHOLD,
  type CapturedPost,
  type Classification,
  type IntentId,
} from "@lobe/shared";
import {
  and,
  asc,
  cosineDistance,
  desc,
  eq,
  getTableColumns,
  isNotNull,
  lt,
  type SQL,
  sql,
} from "drizzle-orm";

import { db } from "./client";
import { backgroundJobs, intentFeedback, saves, type SaveRow } from "./schema";

export interface CreateSaveResult {
  row: SaveRow;
  duplicate: boolean;
}

export interface ListSavesOptions {
  query: string;
  intent: IntentId | null;
  cursor: string | null;
  limit: number;
  embedding?: number[];
}

export interface ListSavesResult {
  rows: SaveRow[];
  nextCursor: string | null;
}

function captureToInsert(capture: CapturedPost): typeof saves.$inferInsert {
  return {
    platform: capture.platform,
    sourceId: capture.sourceId,
    canonicalUrl: capture.canonicalUrl,
    pageUrl: capture.pageUrl,
    content: capture.content,
    authorName: capture.author.name,
    authorHandle: capture.author.handle,
    authorAvatarUrl: capture.author.avatarUrl,
    publishedAt: capture.publishedAt ? new Date(capture.publishedAt) : null,
    media: capture.media,
    screenshotData: capture.screenshot?.dataUrl ?? null,
    screenshotWidth: capture.screenshot?.width ?? null,
    screenshotHeight: capture.screenshot?.height ?? null,
    recipeVersion: capture.recipeVersion,
    layoutFingerprint: capture.layoutFingerprint,
  };
}

export async function createSave(
  capture: CapturedPost,
): Promise<CreateSaveResult> {
  return db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(saves)
      .values(captureToInsert(capture))
      .onConflictDoNothing({
        target: [saves.platform, saves.sourceId],
      })
      .returning();

    if (!created) {
      const [existing] = await transaction
        .select()
        .from(saves)
        .where(
          and(
            eq(saves.platform, capture.platform),
            eq(saves.sourceId, capture.sourceId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new Error("Save conflict occurred without an existing record");
      }

      return { row: existing, duplicate: true };
    }

    await transaction.insert(backgroundJobs).values({
      type: "classify_save",
      saveId: created.id,
    });

    return { row: created, duplicate: false };
  });
}

export async function getSave(id: string): Promise<SaveRow | null> {
  const [row] = await db.select().from(saves).where(eq(saves.id, id)).limit(1);
  return row ?? null;
}

export async function deleteSaveByUrl(canonicalUrl: string): Promise<boolean> {
  const removed = await db
    .delete(saves)
    .where(eq(saves.canonicalUrl, canonicalUrl))
    .returning({ id: saves.id });

  return removed.length > 0;
}

export async function listSaves(
  options: ListSavesOptions,
): Promise<ListSavesResult> {
  const conditions: SQL[] = [];

  if (options.intent) {
    conditions.push(eq(saves.intent, options.intent));
  }

  if (options.cursor && !options.embedding) {
    const cursorDate = new Date(options.cursor);
    if (!Number.isNaN(cursorDate.valueOf())) {
      conditions.push(lt(saves.createdAt, cursorDate));
    }
  }

  if (options.embedding) {
    if (options.embedding.length !== 1536) {
      throw new Error("Search embedding must contain 1536 values");
    }

    const distance = cosineDistance(saves.embedding, options.embedding);
    const similarity = sql<number>`1 - (${distance})`;

    conditions.push(isNotNull(saves.embedding));

    const rows = await db.transaction(async (transaction) => {
      await transaction.execute(sql`set local hnsw.ef_search = 80`);
      await transaction.execute(
        sql`set local hnsw.iterative_scan = strict_order`,
      );
      return transaction
        .select({ ...getTableColumns(saves), similarity })
        .from(saves)
        .where(and(...conditions))
        .orderBy(asc(distance), desc(saves.createdAt))
        .limit(options.limit + 1);
    });

    const hasMore = rows.length > options.limit;
    const page = rows.slice(0, options.limit);

    return {
      rows: page,
      nextCursor: hasMore
        ? (page.at(-1)?.createdAt.toISOString() ?? null)
        : null,
    };
  }

  if (options.query) {
    const searchDocument = sql`lower(${saves.content} || ' ' || coalesce(${saves.summary}, '') || ' ' || ${saves.authorName} || ' ' || ${saves.authorHandle})`;
    conditions.push(
      sql`${searchDocument} like ${`%${options.query.toLocaleLowerCase()}%`}`,
    );
  }

  const rows = await db
    .select()
    .from(saves)
    .where(and(...conditions))
    .orderBy(desc(saves.createdAt))
    .limit(options.limit + 1);

  const hasMore = rows.length > options.limit;
  const page = rows.slice(0, options.limit);

  return {
    rows: page,
    nextCursor: hasMore ? (page.at(-1)?.createdAt.toISOString() ?? null) : null,
  };
}

export async function markSaveProcessing(id: string): Promise<void> {
  await db
    .update(saves)
    .set({
      status: "processing",
      failureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(saves.id, id));
}

export async function completeSaveClassification(
  id: string,
  classification: Classification,
  embedding: number[] | null,
): Promise<SaveRow | null> {
  const suggestedIntents = [
    ...new Set([classification.intent, ...classification.alternatives]),
  ].slice(0, 3);

  const [row] = await db
    .update(saves)
    .set({
      status: "ready",
      intent: classification.intent,
      confidence: classification.confidence,
      summary: classification.summary,
      topics: classification.topics,
      why: classification.why,
      suggestedIntents:
        classification.confidence < LOW_CONFIDENCE_THRESHOLD
          ? suggestedIntents
          : [],
      needsReview: classification.confidence < LOW_CONFIDENCE_THRESHOLD,
      failureReason: null,
      embedding,
      updatedAt: new Date(),
    })
    .where(eq(saves.id, id))
    .returning();

  return row ?? null;
}

export async function failSave(id: string, reason: string): Promise<void> {
  await db
    .update(saves)
    .set({
      status: "failed",
      failureReason: reason.slice(0, 1_000),
      updatedAt: new Date(),
    })
    .where(eq(saves.id, id));
}

export async function updateSaveIntent(
  id: string,
  selectedIntent: IntentId,
): Promise<SaveRow | null> {
  return db.transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(saves)
      .where(eq(saves.id, id))
      .limit(1);

    if (!current) {
      return null;
    }

    if (current.intent !== selectedIntent || current.needsReview) {
      await transaction.insert(intentFeedback).values({
        saveId: current.id,
        previousIntent: current.intent,
        selectedIntent,
        modelConfidence: current.confidence,
      });
    }

    const [updated] = await transaction
      .update(saves)
      .set({
        intent: selectedIntent,
        needsReview: false,
        suggestedIntents: [],
        updatedAt: new Date(),
      })
      .where(eq(saves.id, id))
      .returning();

    return updated ?? null;
  });
}

export async function getTasteProfileRows(): Promise<
  Array<Pick<SaveRow, "intent" | "topics" | "authorName" | "authorHandle">>
> {
  return db
    .select({
      intent: saves.intent,
      topics: saves.topics,
      authorName: saves.authorName,
      authorHandle: saves.authorHandle,
    })
    .from(saves)
    .where(eq(saves.status, "ready"));
}

export async function getScreenshot(id: string): Promise<{
  dataUrl: string;
  width: number | null;
  height: number | null;
} | null> {
  const [result] = await db
    .select({
      dataUrl: saves.screenshotData,
      width: saves.screenshotWidth,
      height: saves.screenshotHeight,
    })
    .from(saves)
    .where(eq(saves.id, id))
    .limit(1);

  if (!result?.dataUrl) {
    return null;
  }

  return {
    dataUrl: result.dataUrl,
    width: result.width,
    height: result.height,
  };
}
