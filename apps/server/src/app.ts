import { createEmbedding, hasOpenAiKey, CLASSIFICATION_MODEL } from "@lobe/ai";
import {
  createSave,
  deleteSaveByUrl,
  getActiveRecipe,
  getSave,
  getScreenshot,
  getTasteProfileRows,
  listSaves,
  pingDatabase,
  recordRecipeFailure,
  serializeSave,
  updateSaveIntent,
} from "@lobe/db";
import {
  createSaveRequestSchema,
  recipeFailureRequestSchema,
  saveListQuerySchema,
  updateIntentRequestSchema,
} from "@lobe/shared";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";

import { requireAuth } from "./auth";
import { serverConfig } from "./config";
import { buildTasteProfile } from "./taste";

export const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (
        origin.startsWith("chrome-extension://") ||
        origin.startsWith("moz-extension://") ||
        (serverConfig.nodeEnv !== "production" &&
          /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin))
      ) {
        return origin;
      }

      return origin === serverConfig.appOrigin ? origin : null;
    },
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86_400,
  }),
);

app.use(
  "*",
  bodyLimit({
    maxSize: 8 * 1024 * 1024,
    onError: (context) =>
      context.json(
        {
          error: {
            code: "payload_too_large",
            message: "The captured bookmark is larger than 8 MB.",
          },
        },
        413,
      ),
  }),
);

app.get("/health", async (context) => {
  try {
    await pingDatabase();
    return context.json({
      status: "ok",
      database: "connected",
      ai: hasOpenAiKey() ? "configured" : "fallback",
      model: CLASSIFICATION_MODEL,
    });
  } catch {
    return context.json(
      {
        status: "error",
        database: "unavailable",
        ai: hasOpenAiKey() ? "configured" : "fallback",
        model: CLASSIFICATION_MODEL,
      },
      503,
    );
  }
});

app.use("/v1/*", requireAuth);

app.post("/v1/saves", async (context) => {
  const body = createSaveRequestSchema.safeParse(await context.req.json());
  if (!body.success) {
    return context.json(
      {
        error: {
          code: "invalid_capture",
          message: body.error.issues[0]?.message ?? "Invalid bookmark capture.",
        },
      },
      400,
    );
  }

  const result = await createSave(body.data.capture);
  const response = {
    save: serializeSave(result.row),
    duplicate: result.duplicate,
  };

  return result.duplicate
    ? context.json(response, 200)
    : context.json(response, 202);
});

app.get("/v1/saves", async (context) => {
  const query = saveListQuerySchema.safeParse({
    query: context.req.query("query") ?? "",
    intent: context.req.query("intent") ?? null,
    cursor: context.req.query("cursor") ?? null,
    limit: context.req.query("limit") ?? 30,
  });

  if (!query.success) {
    return context.json(
      {
        error: {
          code: "invalid_query",
          message: query.error.issues[0]?.message ?? "Invalid search query.",
        },
      },
      400,
    );
  }

  let embedding: number[] | undefined;
  if (query.data.query) {
    try {
      embedding = (await createEmbedding(query.data.query)) ?? undefined;
    } catch (error) {
      console.warn("Semantic query failed, using text search", error);
    }
  }

  const result = await listSaves(
    embedding ? { ...query.data, embedding } : query.data,
  );
  return context.json({
    saves: result.rows.map(serializeSave),
    nextCursor: result.nextCursor,
  });
});

app.delete("/v1/saves/by-url", async (context) => {
  const canonicalUrl = context.req.query("url");
  if (!canonicalUrl) {
    return context.json(
      {
        error: {
          code: "missing_url",
          message: "A canonical bookmark URL is required.",
        },
      },
      400,
    );
  }

  const removed = await deleteSaveByUrl(canonicalUrl);
  return removed
    ? context.body(null, 204)
    : context.json(
        {
          error: {
            code: "not_found",
            message: "That bookmark is not in Lobe.",
          },
        },
        404,
      );
});

app.get("/v1/saves/:id", async (context) => {
  const row = await getSave(context.req.param("id"));
  return row
    ? context.json({ save: serializeSave(row) })
    : context.json(
        {
          error: {
            code: "not_found",
            message: "That bookmark does not exist.",
          },
        },
        404,
      );
});

app.patch("/v1/saves/:id/intent", async (context) => {
  const body = updateIntentRequestSchema.safeParse(await context.req.json());
  if (!body.success) {
    return context.json(
      {
        error: {
          code: "invalid_intent",
          message: "Choose one of Lobe's supported intents.",
        },
      },
      400,
    );
  }

  const row = await updateSaveIntent(context.req.param("id"), body.data.intent);
  return row
    ? context.json({ save: serializeSave(row) })
    : context.json(
        {
          error: {
            code: "not_found",
            message: "That bookmark does not exist.",
          },
        },
        404,
      );
});

app.get("/v1/saves/:id/screenshot", async (context) => {
  const screenshot = await getScreenshot(context.req.param("id"));
  if (!screenshot) {
    return context.json(
      {
        error: {
          code: "not_found",
          message: "This bookmark has no captured screenshot.",
        },
      },
      404,
    );
  }

  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(
    screenshot.dataUrl,
  );
  if (!match?.[1] || !match[2]) {
    return context.json(
      {
        error: {
          code: "invalid_screenshot",
          message: "The stored screenshot could not be decoded.",
        },
      },
      500,
    );
  }

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Type": match[1],
    },
  });
});

app.get("/v1/taste", async (context) => {
  const rows = await getTasteProfileRows();
  return context.json({ profile: buildTasteProfile(rows) });
});

app.get("/v1/recipes/x", async (context) => {
  const recipe = await getActiveRecipe();
  return context.json({ recipe });
});

app.post("/v1/recipes/failures", async (context) => {
  const body = recipeFailureRequestSchema.safeParse(await context.req.json());
  if (!body.success) {
    return context.json(
      {
        error: {
          code: "invalid_recipe_failure",
          message: body.error.issues[0]?.message ?? "Invalid DOM sketch.",
        },
      },
      400,
    );
  }

  const id = await recordRecipeFailure(body.data);
  return context.json({ id, queued: true }, 202);
});

app.notFound((context) =>
  context.json(
    {
      error: {
        code: "not_found",
        message: "That Lobe endpoint does not exist.",
      },
    },
    404,
  ),
);

app.onError((error, context) => {
  console.error("Lobe server request failed", error);
  return context.json(
    {
      error: {
        code: "internal_error",
        message: "Lobe could not complete that request.",
      },
    },
    500,
  );
});
