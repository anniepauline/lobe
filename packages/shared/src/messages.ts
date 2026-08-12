import type { IntentId } from "./categories";
import type { ExtensionSettings } from "./api";
import type { CapturedPost, Save } from "./saves";

export type ExtensionRequest =
  | { type: "settings:get" }
  | { type: "settings:set"; settings: ExtensionSettings }
  | { type: "save:create"; capture: CapturedPost }
  | { type: "save:remove"; canonicalUrl: string }
  | { type: "save:get"; id: string }
  | { type: "save:intent"; id: string; intent: IntentId };

export type ExtensionResponse =
  | { ok: true; data: Save | ExtensionSettings | null }
  | { ok: false; error: string };
