import { describe, expect, test } from "bun:test";

import {
  bundledXRecipe,
  capturedPostSchema,
  classificationSchema,
  intentById,
  selectorRecipeSchema,
} from "./index";

describe("shared contracts", () => {
  test("keeps intent metadata aligned with the model enum", () => {
    const result = classificationSchema.parse({
      intent: "build",
      confidence: 0.92,
      summary: "A compact Postgres-compatible database written in Rust.",
      topics: ["Postgres", "Rust", "databases"],
      why: "The post emphasizes a production-ready reimplementation.",
      alternatives: ["learn", "reference"],
    });

    expect(result.intent).toBe("build");
    expect(intentById[result.intent].label).toBe("Build similar");
  });

  test("ships a valid semantic X selector recipe", () => {
    const recipe = selectorRecipeSchema.parse(bundledXRecipe);

    expect(recipe.selectors.post).toContain('data-testid="tweet"');
    expect(recipe.selectors.unsavedControl).toContain('data-testid="bookmark"');
    expect(recipe.selectors.savedControl).toContain(
      'data-testid="removeBookmark"',
    );
  });

  test("rejects captures without a canonical X status id", () => {
    const result = capturedPostSchema.safeParse({
      platform: "x",
      sourceId: "not-a-status-id",
      canonicalUrl: "https://x.com/example/status/not-a-status-id",
      pageUrl: "https://x.com/home",
      content: "A useful post",
      author: {
        name: "Example",
        handle: "@example",
        avatarUrl: null,
      },
      publishedAt: null,
      media: [],
      screenshot: null,
      capturedAt: new Date().toISOString(),
      recipeVersion: 1,
      layoutFingerprint: "x-web-2026-semantic-v1",
    });

    expect(result.success).toBe(false);
  });
});
