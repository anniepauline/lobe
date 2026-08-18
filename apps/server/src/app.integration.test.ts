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

  test("rejects malformed capture JSON", async () => {
    const response = await app.request("/v1/saves", {
      method: "POST",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: "{not-json",
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
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

  test("attaches a screenshot after the bookmark is accepted", async () => {
    const attachResponse = await app.request(`/v1/saves/${saveId}/screenshot`, {
      method: "PUT",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        screenshot: {
          dataUrl: "data:image/png;base64,aGVsbG8=",
          width: 320,
          height: 180,
        },
      }),
    });
    expect(attachResponse.status).toBe(204);

    const screenshotResponse = await app.request(
      `/v1/saves/${saveId}/screenshot`,
      { headers: authorization },
    );
    expect(screenshotResponse.status).toBe(200);
    expect(screenshotResponse.headers.get("Content-Type")).toBe("image/png");
    expect(await screenshotResponse.text()).toBe("hello");
  });

  test("searches, dismisses uncertainty, and reprocesses feedback", async () => {
    const searchResponse = await app.request("/v1/saves?query=Rust", {
      headers: authorization,
    });
    const results = (await searchResponse.json()) as {
      saves: Array<{ id: string }>;
    };
    expect(results.saves.some((save) => save.id === saveId)).toBe(true);

    const reviewResponse = await app.request("/v1/saves?needsReview=true", {
      headers: authorization,
    });
    const reviewResults = (await reviewResponse.json()) as {
      saves: Array<{ id: string }>;
    };
    expect(reviewResults.saves.some((save) => save.id === saveId)).toBe(true);

    const pendingResponse = await app.request("/v1/saves/reviews/pending", {
      headers: authorization,
    });
    const pending = (await pendingResponse.json()) as {
      save: { id: string } | null;
    };
    expect(pending.save?.id).toBe(saveId);

    const dismissResponse = await app.request(
      `/v1/saves/${saveId}/feedback/dismiss`,
      {
        method: "POST",
        headers: authorization,
      },
    );
    const dismissed = (await dismissResponse.json()) as {
      save: { needsReview: boolean; reviewDismissedAt: string | null };
    };
    expect(dismissed.save.needsReview).toBe(true);
    expect(dismissed.save.reviewDismissedAt).not.toBeNull();

    const dismissedPendingResponse = await app.request(
      "/v1/saves/reviews/pending",
      { headers: authorization },
    );
    const dismissedPending = (await dismissedPendingResponse.json()) as {
      save: { id: string } | null;
    };
    expect(dismissedPending.save?.id).not.toBe(saveId);

    const feedbackResponse = await app.request(`/v1/saves/${saveId}/feedback`, {
      method: "POST",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "learn",
        reason: "I want to study how the Rust implementation works.",
      }),
    });
    expect(feedbackResponse.status).toBe(202);
    const feedback = (await feedbackResponse.json()) as {
      save: {
        intent: string;
        needsReview: boolean;
        status: string;
        userReason: string;
      };
    };

    expect(feedback.save.intent).toBe("learn");
    expect(feedback.save.needsReview).toBe(false);
    expect(feedback.save.status).toBe("pending");
    expect(feedback.save.userReason).toContain("study");

    expect(await processNextJob()).toBe(true);
    const readyResponse = await app.request(`/v1/saves/${saveId}`, {
      headers: authorization,
    });
    const ready = (await readyResponse.json()) as {
      save: { intent: string; status: string; why: string };
    };
    expect(ready.save.intent).toBe("learn");
    expect(ready.save.status).toBe("ready");
    expect(ready.save.why).toContain("Rust implementation");
  });

  test("rejects empty feedback", async () => {
    const response = await app.request(`/v1/saves/${saveId}/feedback`, {
      method: "POST",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ intent: "learn", reason: "" }),
    });
    expect(response.status).toBe(400);
  });
});
