import {
  discoveredSelectorSchema,
  type DiscoveredSelector,
  type RecipeFailureRequest,
} from "@lobe/shared";
import { generateText, Output } from "ai";

import {
  CLASSIFICATION_MODEL,
  getOpenAiProvider,
  getOpenAiResponseOptions,
  hasOpenAiKey,
} from "./client";

export function compactRecipePrompt(failure: RecipeFailureRequest): string {
  const payload = JSON.stringify({
    pageKind: failure.pageKind,
    currentRecipeVersion: failure.currentRecipeVersion,
    layoutFingerprint: failure.layoutFingerprint,
    nodes: failure.nodes,
  });

  return payload.slice(0, 12_000);
}

export async function discoverRecipe(
  failure: RecipeFailureRequest,
): Promise<DiscoveredSelector | null> {
  if (!hasOpenAiKey()) {
    return null;
  }

  const openai = getOpenAiProvider();
  const result = await generateText({
    model: openai.responses(CLASSIFICATION_MODEL),
    output: Output.object({
      name: "x_selector_recipe",
      description: "CSS selectors for the current X web layout.",
      schema: discoveredSelectorSchema,
    }),
    system: `You repair a declarative CSS selector recipe for the X web app.
The input is a privacy-safe list of semantic DOM attributes, never a full page.
Prefer stable role, aria-label, href-shape, and data-testid attributes.
Never use generated class names, element IDs, XPath, JavaScript, or selectors that depend on post text.
The post selector must identify the outer post, and statusLink must resolve the outer post rather than a quoted post.
Return selectors only through the provided schema.`,
    prompt: compactRecipePrompt(failure),
    maxOutputTokens: 900,
    providerOptions: {
      openai: getOpenAiResponseOptions(),
    },
  });

  return discoveredSelectorSchema.parse(result.output);
}
