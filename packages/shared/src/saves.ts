import { z } from "zod";

import { intentIdSchema } from "./categories";
import { platformSchema } from "./recipes";

export const saveStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "failed",
]);

export type SaveStatus = z.infer<typeof saveStatusSchema>;

export const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.url(),
  alt: z.string().max(500).nullable(),
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

export const authorSchema = z.object({
  name: z.string().min(1).max(160),
  handle: z.string().min(2).max(64),
  avatarUrl: z.url().nullable(),
});

export const screenshotSchema = z.object({
  dataUrl: z
    .string()
    .max(5_000_000)
    .refine(
      (value) => value.startsWith("data:image/"),
      "Expected image data URL",
    ),
  width: z.number().int().positive().max(8_000),
  height: z.number().int().positive().max(8_000),
});

export const capturedPostSchema = z.object({
  platform: platformSchema,
  sourceId: z.string().regex(/^\d+$/),
  canonicalUrl: z.url(),
  pageUrl: z.url(),
  content: z.string().min(1).max(50_000),
  author: authorSchema,
  publishedAt: z.iso.datetime().nullable(),
  media: z.array(mediaItemSchema).max(12),
  screenshot: screenshotSchema.nullable(),
  capturedAt: z.iso.datetime(),
  recipeVersion: z.number().int().positive(),
  layoutFingerprint: z.string().min(1).max(128),
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
  canonicalUrl: z.url(),
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
  suggestedIntents: z.array(intentIdSchema),
  needsReview: z.boolean(),
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
});

export const updateIntentRequestSchema = z.object({
  intent: intentIdSchema,
});

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
