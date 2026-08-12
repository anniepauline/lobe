import { afterAll, describe, expect, test } from "bun:test";
import { closeDatabase } from "@lobe/db";

import { app, processNextJob } from "./index";

const describeDatabase =
  process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

describeDatabase("server save flow", () => {
  const sourceId = `8${Date.now()}`;
  const canonicalUrl = `https://x.com/lobe/status/${sourceId}`;
  const authorization = { Authorization: "Bearer test-token" };
  let saveId = "";

  afterAll(async () => {
    if (saveId) {
      await app.request(
        `/v1/saves/by-url?url=${encodeURIComponent(canonicalUrl)}`,
        { method: "DELETE", headers: authorization },
      );
    }
    await closeDatabase();
  });

  test("requires a bearer token", async () => {
    const response = await app.request("/v1/saves");
    expect(response.status).toBe(401);
  });

  test("accepts immediately and organizes in the worker", async () => {
    const response = await app.request("/v1/saves", {
      method: "POST",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        capture: {
          platform: "x",
          sourceId,
          canonicalUrl,
          pageUrl: "https://x.com/home",
          content: "Rewriting Postgres in Rust: production-ready.",
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
        },
      }),
    });

    expect(response.status).toBe(202);
    const created = (await response.json()) as {
      save: { id: string; status: string };
    };
    saveId = created.save.id;
    expect(created.save.status).toBe("pending");

    expect(await processNextJob()).toBe(true);

    const readyResponse = await app.request(`/v1/saves/${saveId}`, {
      headers: authorization,
    });
    const ready = (await readyResponse.json()) as {
      save: { status: string; intent: string; needsReview: boolean };
    };

    expect(ready.save.status).toBe("ready");
    expect(ready.save.intent).toBe("build");
    expect(ready.save.needsReview).toBe(true);
  });

  test("searches and accepts intent feedback", async () => {
    const searchResponse = await app.request("/v1/saves?query=Rust", {
      headers: authorization,
    });
    const results = (await searchResponse.json()) as {
      saves: Array<{ id: string }>;
    };
    expect(results.saves.some((save) => save.id === saveId)).toBe(true);

    const feedbackResponse = await app.request(`/v1/saves/${saveId}/intent`, {
      method: "PATCH",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ intent: "learn" }),
    });
    const feedback = (await feedbackResponse.json()) as {
      save: { intent: string; needsReview: boolean };
    };

    expect(feedback.save.intent).toBe("learn");
    expect(feedback.save.needsReview).toBe(false);
  });
});
