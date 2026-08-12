import {
  createOpenAI,
  type OpenAILanguageModelResponsesOptions,
} from "@ai-sdk/openai";

export const CLASSIFICATION_MODEL =
  process.env.OPENAI_CLASSIFICATION_MODEL ?? "gpt-5.6-luna";
export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

const allowedReasoningEfforts = new Set([
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const);

type ReasoningEffort =
  typeof allowedReasoningEfforts extends Set<infer Value> ? Value : never;

function getReasoningEffort(): ReasoningEffort {
  const configured = process.env.OPENAI_REASONING_EFFORT ?? "low";
  return allowedReasoningEfforts.has(configured as ReasoningEffort)
    ? (configured as ReasoningEffort)
    : "low";
}

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAiProvider() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return createOpenAI({ apiKey });
}

export function getOpenAiResponseOptions(): OpenAILanguageModelResponsesOptions {
  return {
    reasoningEffort: getReasoningEffort(),
    store: false,
    textVerbosity: "low",
    strictJsonSchema: true,
  };
}
