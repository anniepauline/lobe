import {
  classificationSchema,
  intentDefinitions,
  type CapturedPost,
  type Classification,
  type IntentId,
} from "@lobe/shared";
import { generateText, Output } from "ai";

import {
  CLASSIFICATION_MODEL,
  getOpenAiProvider,
  getOpenAiResponseOptions,
  hasOpenAiKey,
} from "./client";

export interface ClassificationResult {
  classification: Classification;
  usedAi: boolean;
}

export interface ClassificationFeedbackExample {
  intent: IntentId;
  reason: string;
  excerpt: string;
  similarity: number | null;
}

export interface ClassificationFeedback {
  direct: ClassificationFeedbackExample | null;
  similar: ClassificationFeedbackExample[];
}

const intentGuide = intentDefinitions
  .map((intent) => `${intent.id}: ${intent.description}`)
  .join("\n");

function formatPost(post: CapturedPost): string {
  const media = post.media
    .map((item) => `${item.type}: ${item.alt ?? "No alt text"}`)
    .join("\n");

  return [
    `Author: ${post.author.name} (${post.author.handle})`,
    `Text: ${post.content.slice(0, 8_000)}`,
    media ? `Media:\n${media.slice(0, 1_500)}` : "Media: none",
  ].join("\n\n");
}

function formatFeedback(feedback: ClassificationFeedback): string {
  const direct = feedback.direct
    ? `Direct feedback for this exact bookmark:\nThe user chose ${feedback.direct.intent} because: ${feedback.direct.reason}`
    : "Direct feedback for this bookmark: none";
  const similar = feedback.similar.length
    ? feedback.similar
        .map(
          (example, index) =>
            `${index + 1}. ${example.intent}: ${example.reason}\nRelated post: ${example.excerpt}`,
        )
        .join("\n\n")
    : "No similar feedback yet.";

  return `${direct}\n\nSimilar past feedback:\n${similar}`;
}

export function applyDirectFeedback(
  classification: Classification,
  feedback: ClassificationFeedback,
): Classification {
  if (!feedback.direct) {
    return classification;
  }

  const alternatives = [
    ...new Set([
      classification.intent,
      ...classification.alternatives,
      ...intentDefinitions.map((intent) => intent.id),
    ]),
  ]
    .filter((intent) => intent !== feedback.direct?.intent)
    .slice(0, 3);

  return classificationSchema.parse({
    ...classification,
    intent: feedback.direct.intent,
    confidence: 1,
    why: feedback.direct.reason,
    alternatives,
  });
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

const fallbackAlternatives: Record<IntentId, IntentId[]> = {
  try: ["buy", "reference"],
  build: ["learn", "reference"],
  learn: ["reference", "build"],
  reference: ["learn", "share"],
  buy: ["try", "reference"],
  share: ["reference", "learn"],
};

export function fallbackClassification(post: CapturedPost): Classification {
  const text = post.content.toLowerCase();
  let intent: IntentId = "reference";

  if (
    includesAny(text, [
      "built",
      "build",
      "open source",
      "rewriting",
      "clone",
      "implementation",
    ])
  ) {
    intent = "build";
  } else if (
    includesAny(text, ["try", "launch", "available", "tool", "workflow"])
  ) {
    intent = "try";
  } else if (
    includesAny(text, ["learn", "guide", "explained", "tutorial", "course"])
  ) {
    intent = "learn";
  } else if (includesAny(text, ["buy", "price", "sale", "discount"])) {
    intent = "buy";
  } else if (includesAny(text, ["share", "send this", "tell everyone"])) {
    intent = "share";
  }

  const summary = post.content.replace(/\s+/g, " ").trim().slice(0, 240);

  return classificationSchema.parse({
    intent,
    confidence: 0.45,
    summary,
    topics: [],
    why: "A local fallback was used because OpenAI is not configured.",
    alternatives: fallbackAlternatives[intent],
  });
}

export async function classifyPost(
  post: CapturedPost,
  feedback: ClassificationFeedback = { direct: null, similar: [] },
): Promise<ClassificationResult> {
  if (!hasOpenAiKey()) {
    return {
      classification: applyDirectFeedback(
        fallbackClassification(post),
        feedback,
      ),
      usedAi: false,
    };
  }

  const openai = getOpenAiProvider();
  const result = await generateText({
    model: openai.responses(CLASSIFICATION_MODEL),
    output: Output.object({
      name: "bookmark_intent",
      description: "The user's likely reason for saving an X post.",
      schema: classificationSchema,
    }),
    system: `You classify deliberate bookmarks by user intent, not merely topic.

Available intents:
${intentGuide}

Choose the best intent. Confidence measures confidence in the user's intent, not confidence in the post's facts. Similar feedback is a preference signal only when the posts genuinely resemble each other. Direct feedback is authoritative. Keep the summary useful in search, topics concise, and alternatives ordered by likelihood.`,
    prompt: `${formatPost(post)}\n\n${formatFeedback(feedback)}`,
    maxOutputTokens: 700,
    providerOptions: {
      openai: getOpenAiResponseOptions(),
    },
  });

  return {
    classification: applyDirectFeedback(result.output, feedback),
    usedAi: true,
  };
}
