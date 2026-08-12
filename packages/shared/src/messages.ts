import type { IntentId } from "./categories";
import type { ExtensionSettings } from "./api";
import type { RecipeFailureRequest, SelectorRecipe } from "./recipes";
import type { CapturedPost, Save, SubmitFeedbackRequest } from "./saves";

export interface ExtensionStatus {
  configured: boolean;
  reachable: boolean;
  authorized: boolean;
  model: string | null;
  ai: "configured" | "fallback" | null;
}

export type ExtensionRequest =
  | { type: "settings:get" }
  | { type: "settings:set"; settings: ExtensionSettings }
  | { type: "save:create"; capture: CapturedPost }
  | { type: "save:remove"; canonicalUrl: string }
  | { type: "save:get"; id: string }
  | { type: "save:feedback:pending" }
  | { type: "save:intent"; id: string; intent: IntentId }
  | ({ type: "save:feedback"; id: string } & SubmitFeedbackRequest)
  | { type: "save:feedback:dismiss"; id: string }
  | { type: "recipe:get" }
  | { type: "recipe:failure"; failure: RecipeFailureRequest }
  | { type: "status:get" };

export type ExtensionResponse<T = ExtensionResponseData> =
  { ok: true; data: T } | { ok: false; error: string };

export type ExtensionResponseData =
  | Save
  | ExtensionSettings
  | SelectorRecipe
  | ExtensionStatus
  | { removed: true }
  | { queued: true }
  | null;
