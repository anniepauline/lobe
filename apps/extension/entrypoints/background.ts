import {
  bundledXRecipe,
  createSaveResponseSchema,
  extensionSettingsSchema,
  recipeFailureRequestSchema,
  saveSchema,
  selectorRecipeSchema,
  type ExtensionRequest,
  type ExtensionResponse,
  type ExtensionStatus,
  type SelectorRecipe,
} from "@lobe/shared";

import { isConfigured, loadSettings, saveSettings } from "../lib/settings";

interface HealthResponse {
  status: "ok" | "error";
  ai: "configured" | "fallback";
  model: string;
}

interface CachedRecipe {
  recipe: unknown;
  checkedAt: unknown;
}

const RECIPE_CACHE_KEY = "lobe:recipe:x";
const RECIPE_CACHE_TTL = 5 * 60_000;

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      return "Lobe server is offline.";
    }
    return error.message;
  }

  return "Lobe could not complete that request.";
}

async function requestApi<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const settings = await loadSettings();
  if (authenticated && !isConfigured(settings)) {
    throw new Error("Open Lobe settings to connect the extension.");
  }

  const headers = new Headers(init.headers);
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated) {
    headers.set("Authorization", `Bearer ${settings.apiToken}`);
  }

  const response = await fetch(`${settings.apiUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiError(
      payload?.error?.message ?? `Lobe server returned ${response.status}.`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getStatus(): Promise<ExtensionStatus> {
  const settings = await loadSettings();
  if (!isConfigured(settings)) {
    return {
      configured: false,
      reachable: false,
      authorized: false,
      model: null,
      ai: null,
    };
  }

  try {
    const health = await requestApi<HealthResponse>("/health", {}, false);
    try {
      await requestApi<unknown>("/v1/saves?limit=1");
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }

      return {
        configured: true,
        reachable: true,
        authorized: false,
        model: health.model,
        ai: health.ai,
      };
    }

    return {
      configured: true,
      reachable: health.status === "ok",
      authorized: true,
      model: health.model,
      ai: health.ai,
    };
  } catch {
    return {
      configured: true,
      reachable: false,
      authorized: false,
      model: null,
      ai: null,
    };
  }
}

async function loadCachedRecipe(): Promise<{
  recipe: SelectorRecipe;
  checkedAt: number;
} | null> {
  const stored = await browser.storage.local.get(RECIPE_CACHE_KEY);
  const cached = stored[RECIPE_CACHE_KEY] as CachedRecipe | undefined;
  const recipe = selectorRecipeSchema.safeParse(cached?.recipe);
  if (
    !recipe.success ||
    typeof cached?.checkedAt !== "number" ||
    !Number.isFinite(cached.checkedAt)
  ) {
    return null;
  }

  return { recipe: recipe.data, checkedAt: cached.checkedAt };
}

async function saveCachedRecipe(
  recipe: SelectorRecipe,
  checkedAt = Date.now(),
): Promise<void> {
  await browser.storage.local.set({
    [RECIPE_CACHE_KEY]: { recipe, checkedAt },
  });
}

async function getRecipe(): Promise<SelectorRecipe> {
  const cached = await loadCachedRecipe();
  if (cached && Date.now() - cached.checkedAt < RECIPE_CACHE_TTL) {
    return cached.recipe;
  }

  try {
    const payload = await requestApi<{ recipe: unknown }>("/v1/recipes/x");
    const recipe = selectorRecipeSchema.parse(payload.recipe);
    await saveCachedRecipe(recipe);
    return recipe;
  } catch {
    return cached?.recipe ?? bundledXRecipe;
  }
}

async function handleMessage(
  message: ExtensionRequest,
): Promise<ExtensionResponse> {
  try {
    switch (message.type) {
      case "settings:get":
        return { ok: true, data: await loadSettings() };
      case "settings:set": {
        const settings = await saveSettings(
          extensionSettingsSchema.parse(message.settings),
        );
        await browser.storage.local.remove(RECIPE_CACHE_KEY);
        return { ok: true, data: settings };
      }
      case "status:get":
        return { ok: true, data: await getStatus() };
      case "save:create": {
        const payload = await requestApi<unknown>("/v1/saves", {
          method: "POST",
          body: JSON.stringify({ capture: message.capture }),
        });
        return {
          ok: true,
          data: createSaveResponseSchema.parse(payload).save,
        };
      }
      case "save:remove":
        try {
          await requestApi<never>(
            `/v1/saves/by-url?url=${encodeURIComponent(message.canonicalUrl)}`,
            { method: "DELETE" },
          );
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) {
            throw error;
          }
        }
        return { ok: true, data: { removed: true } };
      case "save:get": {
        const payload = await requestApi<{ save: unknown }>(
          `/v1/saves/${message.id}`,
        );
        return { ok: true, data: saveSchema.parse(payload.save) };
      }
      case "save:intent": {
        const payload = await requestApi<{ save: unknown }>(
          `/v1/saves/${message.id}/intent`,
          {
            method: "PATCH",
            body: JSON.stringify({ intent: message.intent }),
          },
        );
        return { ok: true, data: saveSchema.parse(payload.save) };
      }
      case "save:feedback": {
        const payload = await requestApi<{ save: unknown }>(
          `/v1/saves/${message.id}/feedback`,
          {
            method: "POST",
            body: JSON.stringify({
              intent: message.intent,
              reason: message.reason,
            }),
          },
        );
        return { ok: true, data: saveSchema.parse(payload.save) };
      }
      case "save:feedback:dismiss": {
        const payload = await requestApi<{ save: unknown }>(
          `/v1/saves/${message.id}/feedback/dismiss`,
          { method: "POST" },
        );
        return { ok: true, data: saveSchema.parse(payload.save) };
      }
      case "recipe:get":
        return { ok: true, data: await getRecipe() };
      case "recipe:failure": {
        await requestApi("/v1/recipes/failures", {
          method: "POST",
          body: JSON.stringify(
            recipeFailureRequestSchema.parse(message.failure),
          ),
        });
        const cached = await loadCachedRecipe();
        if (cached) {
          await saveCachedRecipe(cached.recipe, 0);
        }
        return { ok: true, data: { queued: true } };
      }
    }
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

async function updateBadge(): Promise<void> {
  const settings = await loadSettings();
  await browser.action.setBadgeBackgroundColor({ color: "#9b6b43" });
  await browser.action.setBadgeText({
    text: isConfigured(settings) ? "" : "!",
  });
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: ExtensionRequest) =>
    handleMessage(message),
  );

  browser.runtime.onInstalled.addListener(() => void updateBadge());
  browser.storage.onChanged.addListener(() => void updateBadge());
  void updateBadge();
});
