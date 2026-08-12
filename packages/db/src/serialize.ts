import { saveSchema, type Save } from "@lobe/shared";

import type { SaveRow } from "./schema";

export function serializeSave(row: SaveRow): Save {
  return saveSchema.parse({
    id: row.id,
    platform: row.platform,
    sourceId: row.sourceId,
    canonicalUrl: row.canonicalUrl,
    content: row.content,
    author: {
      name: row.authorName,
      handle: row.authorHandle,
      avatarUrl: row.authorAvatarUrl,
    },
    publishedAt: row.publishedAt?.toISOString() ?? null,
    media: row.media,
    screenshotUrl: row.screenshotData ? `/v1/saves/${row.id}/screenshot` : null,
    status: row.status,
    intent: row.intent,
    confidence: row.confidence,
    summary: row.summary,
    topics: row.topics,
    why: row.why,
    userReason: row.userReason,
    suggestedIntents: row.suggestedIntents,
    needsReview: row.needsReview,
    reviewDismissedAt: row.reviewDismissedAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
