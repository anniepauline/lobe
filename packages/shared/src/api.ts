import { z } from "zod";

import { intentIdSchema } from "./categories";

export const httpUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Expected an HTTP or HTTPS URL");

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const saveListQuerySchema = z.object({
  query: z.string().trim().max(300).default(""),
  intent: intentIdSchema.nullable().default(null),
  cursor: z.string().nullable().default(null),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const extensionSettingsSchema = z.object({
  apiUrl: httpUrlSchema,
  apiToken: z.string().max(500),
  showConfirmation: z.boolean(),
  captureScreenshot: z.boolean(),
});

export type ExtensionSettings = z.infer<typeof extensionSettingsSchema>;

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  apiUrl: "http://localhost:8787",
  apiToken: "",
  showConfirmation: true,
  captureScreenshot: true,
};
