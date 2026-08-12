import { describe, expect, test } from "bun:test";
import { capturedPostSchema, recipeFailureRequestSchema } from "@lobe/shared";

import {
  compactRecipePrompt,
  EMBEDDING_MODEL,
  fallbackClassification,
} from "./index";

describe("AI fallbacks and prompt budgets", () => {
  test("locks vector dimensions to text-embedding-3-small", () => {
    expect(EMBEDDING_MODEL).toBe("text-embedding-3-small");
  });

  test("classifies build-oriented posts without a network call", () => {
    const capture = capturedPostSchema.parse({
      platform: "x",
      sourceId: "2087546799200555424",
      canonicalUrl: "https://x.com/BenjDicken/status/2087546799200555424",
      pageUrl: "https://x.com/home",
      content: "Rewriting Postgres in Rust: complete. Production-ready.",
      author: {
        name: "Ben Dicken",
        handle: "@BenjDicken",
        avatarUrl: null,
      },
      publishedAt: null,
      media: [],
      screenshot: null,
      capturedAt: new Date().toISOString(),
      recipeVersion: 1,
      layoutFingerprint: "x-web-2026-semantic-v1",
    });

    const result = fallbackClassification(capture);
    expect(result.intent).toBe("build");
    expect(result.confidence).toBeLessThan(0.78);
  });

  test("never sends an unbounded DOM sketch", () => {
    const failure = recipeFailureRequestSchema.parse({
      platform: "x",
      currentRecipeVersion: 1,
      pageKind: "home",
      layoutFingerprint: "fingerprint-1234",
      observedAt: new Date().toISOString(),
      nodes: Array.from({ length: 80 }, (_, index) => ({
        path: `article:nth-of-type(1) > div:nth-of-type(${index + 1})`,
        tag: "button",
        role: "button",
        testId: `control-${index}`,
        ariaLabel: "A".repeat(240),
        hrefShape: null,
        svgViewBox: "0 0 24 24",
        svgPathPrefix: "M4 4.5".repeat(20),
      })),
    });

    expect(compactRecipePrompt(failure).length).toBeLessThanOrEqual(12_000);
  });
});
