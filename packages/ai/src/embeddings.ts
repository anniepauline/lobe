import { embed } from "ai";

import { EMBEDDING_MODEL, getOpenAiProvider, hasOpenAiKey } from "./client";

export async function createEmbedding(value: string): Promise<number[] | null> {
  if (!hasOpenAiKey()) {
    return null;
  }

  const input = value.replaceAll("\n", " ").trim().slice(0, 12_000);
  if (!input) {
    return null;
  }

  const openai = getOpenAiProvider();
  const result = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: input,
    maxRetries: 2,
  });

  if (result.embedding.length !== 1536) {
    throw new Error(
      `Embedding model returned ${result.embedding.length} dimensions; Lobe requires 1536`,
    );
  }

  return result.embedding;
}
