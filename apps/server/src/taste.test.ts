import { describe, expect, test } from "bun:test";

import { buildTasteProfile } from "./taste";

describe("taste profile", () => {
  test("summarizes intents, topics, and creators", () => {
    const profile = buildTasteProfile([
      {
        intent: "build",
        needsReview: true,
        topics: ["Rust", "Databases"],
        authorName: "Ben Dicken",
        authorHandle: "@BenjDicken",
      },
      {
        intent: "learn",
        needsReview: false,
        topics: ["Rust"],
        authorName: "Ben Dicken",
        authorHandle: "@BenjDicken",
      },
    ]);

    expect(profile.totalSaves).toBe(2);
    expect(profile.reviewCount).toBe(1);
    expect(profile.intentCounts.build).toBe(1);
    expect(profile.topTopics[0]).toEqual({ name: "Rust", count: 2 });
    expect(profile.topCreators[0]?.count).toBe(2);
  });
});
