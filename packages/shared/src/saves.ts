import { z } from "zod";

import { httpUrlSchema } from "./api";
import { intentIdSchema } from "./categories";
import { platformSchema } from "./recipes";

const X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);
const xUrlSchema = httpUrlSchema.refine(
  (value) => X_HOSTS.has(new URL(value).hostname.toLocaleLowerCase()),
  "Expected an X or Twitter URL",
);

export const saveStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "failed",
]);

export type SaveStatus = z.infer<typeof saveStatusSchema>;

export const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: httpUrlSchema,
  alt: z.string().max(500).nullable(),
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

export const authorSchema = z.object({
  name: z.string().min(1).max(160),
  handle: z.string().regex(/^@[A-Za-z0-9_]{1,15}$/),
  avatarUrl: httpUrlSchema.nullable(),
});

export const screenshotSchema = z.object({
  dataUrl: z
    .string()
    .max(5_000_000)
    .refine(
      (value) => /^data:image\/(?:png|jpeg|webp);base64,/.test(value),
      "Expected a supported base64 image data URL",
    ),
  width: z.number().int().positive().max(8_000),
  height: z.number().int().positive().max(8_000),
});

export type Screenshot = z.infer<typeof screenshotSchema>;

export const capturedPostSchema = z
  .object({
    platform: platformSchema,
    sourceId: z.string().max(32).regex(/^\d+$/),
    canonicalUrl: xUrlSchema,
    pageUrl: xUrlSchema,
    content: z.string().min(1).max(50_000),
    author: authorSchema,
    publishedAt: z.iso.datetime().nullable(),
    media: z.array(mediaItemSchema).max(12),
    screenshot: screenshotSchema.nullable(),
    capturedAt: z.iso.datetime(),
    recipeVersion: z.number().int().positive(),
    layoutFingerprint: z.string().min(1).max(128),
  })
  .superRefine((capture, context) => {
    const statusId = /^\/[^/]+\/status\/(\d+)/.exec(
      new URL(capture.canonicalUrl).pathname,
    )?.[1];
    if (statusId !== capture.sourceId) {
      context.addIssue({
        code: "custom",
        message: "Canonical URL must contain the captured X status id",
        path: ["canonicalUrl"],
      });
    }
  });

export type CapturedPost = z.infer<typeof capturedPostSchema>;

export const createSaveRequestSchema = z.object({
  capture: capturedPostSchema,
});

export type CreateSaveRequest = z.infer<typeof createSaveRequestSchema>;

export const saveSchema = z.object({
  id: z.uuid(),
  platform: platformSchema,
  sourceId: z.string(),
  canonicalUrl: xUrlSchema,
  content: z.string(),
  author: authorSchema,
  publishedAt: z.iso.datetime().nullable(),
  media: z.array(mediaItemSchema),
  screenshotUrl: z.string().nullable(),
  status: saveStatusSchema,
  intent: intentIdSchema.nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  summary: z.string().nullable(),
  topics: z.array(z.string()),
  why: z.string().nullable(),
  userReason: z.string().nullable(),
  suggestedIntents: z.array(intentIdSchema),
  needsReview: z.boolean(),
  reviewDismissedAt: z.iso.datetime().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Save = z.infer<typeof saveSchema>;

export const createSaveResponseSchema = z.object({
  save: saveSchema,
  duplicate: z.boolean(),
});

export const saveListResponseSchema = z.object({
  saves: z.array(saveSchema),
  nextCursor: z.string().nullable(),
  search: z.object({
    mode: z.enum(["browse", "lexical", "semantic"]),
    semanticPending: z.boolean(),
    durationMs: z.number().nonnegative(),
  }),
});

export const updateIntentRequestSchema = z.object({
  intent: intentIdSchema,
});

export const submitFeedbackRequestSchema = z.object({
  intent: intentIdSchema,
  reason: z.string().trim().min(3).max(1_000),
});

export type SubmitFeedbackRequest = z.infer<typeof submitFeedbackRequestSchema>;

export const tasteProfileSchema = z.object({
  totalSaves: z.number().int().nonnegative(),
  intentCounts: z.record(intentIdSchema, z.number().int().nonnegative()),
  topTopics: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().positive(),
    }),
  ),
  topCreators: z.array(
    z.object({
      name: z.string(),
      handle: z.string(),
      count: z.number().int().positive(),
    }),
  ),
  recentThemes: z.array(z.string()),
});

export type TasteProfile = z.infer<typeof tasteProfileSchema>;
