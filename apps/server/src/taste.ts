import {
  INTENT_IDS,
  tasteProfileSchema,
  type IntentId,
  type TasteProfile,
} from "@lobe/shared";

interface TasteRow {
  intent: IntentId | null;
  needsReview: boolean;
  topics: string[];
  authorName: string;
  authorHandle: string;
}

export function buildTasteProfile(rows: TasteRow[]): TasteProfile {
  const intentCounts = Object.fromEntries(
    INTENT_IDS.map((intent) => [intent, 0]),
  ) as Record<IntentId, number>;
  const topics = new Map<string, { name: string; count: number }>();
  const creators = new Map<
    string,
    { name: string; handle: string; count: number }
  >();

  for (const row of rows) {
    if (row.intent) {
      intentCounts[row.intent] += 1;
    }

    for (const topic of row.topics) {
      const key = topic.trim().toLocaleLowerCase();
      if (!key) {
        continue;
      }

      const existing = topics.get(key);
      topics.set(key, {
        name: existing?.name ?? topic.trim(),
        count: (existing?.count ?? 0) + 1,
      });
    }

    const handle = row.authorHandle.toLocaleLowerCase();
    const existing = creators.get(handle);
    creators.set(handle, {
      name: existing?.name ?? row.authorName,
      handle: existing?.handle ?? row.authorHandle,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const topTopics = [...topics.values()]
    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name),
    )
    .slice(0, 12);
  const topCreators = [...creators.values()]
    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name),
    )
    .slice(0, 8);

  return tasteProfileSchema.parse({
    totalSaves: rows.length,
    reviewCount: rows.filter((row) => row.needsReview).length,
    intentCounts,
    topTopics,
    topCreators,
    recentThemes: topTopics.slice(0, 4).map((topic) => topic.name),
  });
}
