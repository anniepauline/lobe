import { afterEach, describe, expect, test } from "bun:test";
import type { Save } from "@lobe/shared";

import { LobeApi } from "./api";

const originalFetch = globalThis.fetch;

const save: Save = {
  id: "a6397a2b-d334-4dd2-91df-a85ffbe73050",
  platform: "x",
  sourceId: "2087546799200555424",
  canonicalUrl: "https://x.com/BenjDicken/status/2087546799200555424",
  content: "Rewriting Postgres in Rust: complete.",
  author: {
    name: "Ben Dicken",
    handle: "@BenjDicken",
    avatarUrl: null,
  },
  publishedAt: null,
  media: [],
  screenshotUrl: null,
  status: "ready",
  intent: "build",
  confidence: 0.93,
  summary: "A complete Postgres rewrite in Rust.",
  topics: ["Postgres", "Rust"],
  why: "Useful implementation inspiration.",
  userReason: null,
  suggestedIntents: [],
  needsReview: false,
  reviewDismissedAt: null,
  failureReason: null,
  createdAt: "2026-08-12T12:00:00.000Z",
  updatedAt: "2026-08-12T12:00:00.000Z",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Lobe web API", () => {
  test("sends authenticated intent and search filters", async () => {
    let request: Request | null = null;
    globalThis.fetch = (async (input, init) => {
      request = new Request(input, init);
      return Response.json({
        saves: [save],
        nextCursor: null,
        search: {
          mode: "semantic",
          semanticPending: false,
          durationMs: 12.4,
        },
      });
    }) as typeof fetch;

    const api = new LobeApi({
      apiUrl: "http://localhost:8787",
      apiToken: "secret-token",
    });
    const result = await api.listSaves({
      query: "rust database",
      intent: "build",
      needsReview: true,
    });

    expect(result.saves).toEqual([save]);
    expect(request).not.toBeNull();
    expect(request!.headers.get("Authorization")).toBe("Bearer secret-token");
    expect(new URL(request!.url).searchParams.get("query")).toBe(
      "rust database",
    );
    expect(new URL(request!.url).searchParams.get("intent")).toBe("build");
    expect(new URL(request!.url).searchParams.get("needsReview")).toBe("true");
  });

  test("surfaces the server error message", async () => {
    globalThis.fetch = (async () =>
      Response.json(
        { error: { code: "unauthorized", message: "Token expired." } },
        { status: 401 },
      )) as unknown as typeof fetch;

    const api = new LobeApi({
      apiUrl: "http://localhost:8787",
      apiToken: "expired-token",
    });

    expect(api.verify()).rejects.toThrow("Token expired.");
  });

  test("submits an explanation for reprocessing", async () => {
    let request: Request | null = null;
    globalThis.fetch = (async (input, init) => {
      request = new Request(input, init);
      return Response.json({
        save: {
          ...save,
          status: "pending",
          intent: "learn",
          userReason: "I want to study the implementation.",
        },
        reprocessing: true,
      });
    }) as typeof fetch;

    const api = new LobeApi({
      apiUrl: "http://localhost:8787",
      apiToken: "secret-token",
    });
    const updated = await api.submitFeedback(
      save.id,
      "learn",
      "I want to study the implementation.",
    );

    expect(updated.status).toBe("pending");
    expect(request!.method).toBe("POST");
    expect(await request!.json()).toEqual({
      intent: "learn",
      reason: "I want to study the implementation.",
    });
  });
});
