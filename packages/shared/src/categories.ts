import { z } from "zod";

export const INTENT_IDS = [
  "try",
  "build",
  "learn",
  "reference",
  "buy",
  "share",
] as const;

export const intentIdSchema = z.enum(INTENT_IDS);

export type IntentId = z.infer<typeof intentIdSchema>;

export interface IntentDefinition {
  id: IntentId;
  label: string;
  questionLabel: string;
  description: string;
  color: string;
}

export const intentDefinitions = [
  {
    id: "try",
    label: "Try it",
    questionLabel: "Try this",
    description: "A tool, workflow, place, recipe, or idea you want to try.",
    color: "#e96f3d",
  },
  {
    id: "build",
    label: "Build similar",
    questionLabel: "Build from this",
    description:
      "Something you want to recreate, remix, or use as product inspiration.",
    color: "#7d6ef1",
  },
  {
    id: "learn",
    label: "Learn",
    questionLabel: "Learn this",
    description:
      "A concept, technique, or explanation worth understanding deeply.",
    color: "#3b8bd4",
  },
  {
    id: "reference",
    label: "Reference",
    questionLabel: "Keep as reference",
    description: "Useful information you expect to look up again.",
    color: "#2f9e7a",
  },
  {
    id: "buy",
    label: "Buy",
    questionLabel: "Consider buying",
    description: "A product or service you may want to purchase.",
    color: "#bd7c24",
  },
  {
    id: "share",
    label: "Share",
    questionLabel: "Share later",
    description: "Something you want to send, quote, or discuss with someone.",
    color: "#ba5b87",
  },
] as const satisfies ReadonlyArray<IntentDefinition>;

export const intentById = Object.fromEntries(
  intentDefinitions.map((intent) => [intent.id, intent]),
) as Record<IntentId, IntentDefinition>;

export const classificationSchema = z.object({
  intent: intentIdSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(280),
  topics: z.array(z.string().min(1).max(40)).max(6),
  why: z.string().min(1).max(240),
  alternatives: z.array(intentIdSchema).min(2).max(3),
});

export type Classification = z.infer<typeof classificationSchema>;

export const LOW_CONFIDENCE_THRESHOLD = 0.78;
