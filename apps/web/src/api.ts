import {
  apiErrorSchema,
  saveListResponseSchema,
  saveSchema,
  tasteProfileSchema,
  type IntentId,
  type Save,
  type TasteProfile,
} from "@lobe/shared";

import type { Connection } from "./config";

export interface SavePage {
  saves: Save[];
  nextCursor: string | null;
}

export class LobeApi {
  constructor(private readonly connection: Connection) {}

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.connection.apiToken}`);
    if (init.body) headers.set("Content-Type", "application/json");

    const response = await fetch(`${this.connection.apiUrl}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) {
      const payload = apiErrorSchema.safeParse(
        await response.json().catch(() => null),
      );
      throw new Error(
        payload.success
          ? payload.data.error.message
          : `Lobe returned ${response.status}.`,
      );
    }

    return response;
  }

  async verify(): Promise<void> {
    await this.request("/v1/saves?limit=1");
  }

  async listSaves(
    options: {
      query: string;
      intent: IntentId | null;
      cursor?: string;
    },
    signal?: AbortSignal,
  ): Promise<SavePage> {
    const query = new URLSearchParams();
    if (options.query) query.set("query", options.query);
    if (options.intent) query.set("intent", options.intent);
    if (options.cursor) query.set("cursor", options.cursor);
    query.set("limit", "30");

    const response = await this.request(
      `/v1/saves?${query}`,
      signal ? { signal } : {},
    );
    return saveListResponseSchema.parse(await response.json());
  }

  async getTaste(signal?: AbortSignal): Promise<TasteProfile> {
    const response = await this.request("/v1/taste", signal ? { signal } : {});
    const payload = (await response.json()) as { profile: unknown };
    return tasteProfileSchema.parse(payload.profile);
  }

  async updateIntent(id: string, intent: IntentId): Promise<Save> {
    const response = await this.request(`/v1/saves/${id}/intent`, {
      method: "PATCH",
      body: JSON.stringify({ intent }),
    });
    const payload = (await response.json()) as { save: unknown };
    return saveSchema.parse(payload.save);
  }

  async remove(canonicalUrl: string): Promise<void> {
    await this.request(
      `/v1/saves/by-url?url=${encodeURIComponent(canonicalUrl)}`,
      { method: "DELETE" },
    );
  }

  async screenshotUrl(
    save: Save,
    signal?: AbortSignal,
  ): Promise<string | null> {
    if (!save.screenshotUrl) return null;
    const response = await this.request(
      save.screenshotUrl,
      signal ? { signal } : {},
    );
    return URL.createObjectURL(await response.blob());
  }
}
