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
} from "@lobe/shared";

import { isConfigured, loadSettings, saveSettings } from "../lib/settings";

interface HealthResponse {
  status: "ok" | "error";
  ai: "configured" | "fallback";
  model: string;
}

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
    return { configured: false, reachable: false, model: null, ai: null };
  }

  try {
    const health = await requestApi<HealthResponse>("/health", {}, false);
    return {
      configured: true,
      reachable: health.status === "ok",
      model: health.model,
      ai: health.ai,
    };
  } catch {
    return { configured: true, reachable: false, model: null, ai: null };
  }
}

async function handleMessage(
  message: ExtensionRequest,
): Promise<ExtensionResponse> {
  try {
    switch (message.type) {
      case "settings:get":
        return { ok: true, data: await loadSettings() };
      case "settings:set":
        return {
          ok: true,
          data: await saveSettings(
            extensionSettingsSchema.parse(message.settings),
          ),
        };
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
      case "recipe:get": {
        try {
          const payload = await requestApi<{ recipe: unknown }>(
            "/v1/recipes/x",
          );
          return {
            ok: true,
            data: selectorRecipeSchema.parse(payload.recipe),
          };
        } catch {
          return { ok: true, data: bundledXRecipe };
        }
      }
      case "recipe:failure":
        await requestApi("/v1/recipes/failures", {
          method: "POST",
          body: JSON.stringify(
            recipeFailureRequestSchema.parse(message.failure),
          ),
        });
        return { ok: true, data: { queued: true } };
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
