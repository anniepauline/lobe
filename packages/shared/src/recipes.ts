import { z } from "zod";

export const platformSchema = z.literal("x");

export type Platform = z.infer<typeof platformSchema>;

export const selectorSetSchema = z.object({
  post: z.string().min(1),
  unsavedControl: z.string().min(1),
  savedControl: z.string().min(1),
  actionGroup: z.string().min(1),
  content: z.string().min(1),
  userName: z.string().min(1),
  statusLink: z.string().min(1),
  media: z.string().min(1),
});

export const selectorRecipeSchema = z.object({
  platform: platformSchema,
  layoutFingerprint: z.string().min(1),
  version: z.number().int().positive(),
  source: z.enum(["bundled", "ai", "manual"]),
  selectors: selectorSetSchema,
  updatedAt: z.iso.datetime(),
});

export type SelectorRecipe = z.infer<typeof selectorRecipeSchema>;

export const bundledXRecipe: SelectorRecipe = {
  platform: "x",
  layoutFingerprint: "x-web-2026-semantic-v1",
  version: 1,
  source: "bundled",
  selectors: {
    post: 'article[data-testid="tweet"]',
    unsavedControl: 'button[data-testid="bookmark"]',
    savedControl: 'button[data-testid="removeBookmark"]',
    actionGroup: '[role="group"]',
    content: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
    statusLink: 'a[href*="/status/"]',
    media:
      'a[href*="/photo/"] img, [data-testid="videoPlayer"] video, [data-testid="tweetPhoto"] img',
  },
  updatedAt: "2026-08-12T00:00:00.000Z",
};

export const compactDomNodeSchema = z.object({
  path: z.string().max(240),
  tag: z.string().max(32),
  role: z.string().max(80).nullable(),
  testId: z.string().max(120).nullable(),
  ariaLabel: z.string().max(240).nullable(),
  hrefShape: z.string().max(240).nullable(),
  svgViewBox: z.string().max(80).nullable(),
  svgPathPrefix: z.string().max(160).nullable(),
});

export const recipeFailureRequestSchema = z.object({
  platform: platformSchema,
  currentRecipeVersion: z.number().int().positive(),
  pageKind: z.enum(["home", "status", "bookmarks", "search", "other"]),
  layoutFingerprint: z.string().min(8).max(128),
  nodes: z.array(compactDomNodeSchema).max(80),
  observedAt: z.iso.datetime(),
});

export type RecipeFailureRequest = z.infer<typeof recipeFailureRequestSchema>;

export const discoveredSelectorSchema = selectorSetSchema.extend({
  explanation: z.string().min(1).max(400),
});

export type DiscoveredSelector = z.infer<typeof discoveredSelectorSchema>;
