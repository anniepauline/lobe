import { embed } from "ai";

import { EMBEDDING_MODEL, getOpenAiProvider, hasOpenAiKey } from "./client";

const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;
const SEARCH_CACHE_LIMIT = 512;

interface CachedEmbedding {
  embedding: number[];
  expiresAt: number;
}

const searchCache = new Map<string, CachedEmbedding>();
const pendingSearches = new Map<string, Promise<number[] | null>>();

function normalizeSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function rememberSearch(key: string, embedding: number[]): void {
  searchCache.delete(key);
  searchCache.set(key, {
    embedding,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });

  const oldest = searchCache.keys().next().value as string | undefined;
  if (searchCache.size > SEARCH_CACHE_LIMIT && oldest) {
    searchCache.delete(oldest);
  }
}

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

export function getCachedSearchEmbedding(value: string): number[] | null {
  const key = normalizeSearch(value);
  const cached = searchCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }

  rememberSearch(key, cached.embedding);
  return cached.embedding;
}

export function warmSearchEmbedding(value: string): Promise<number[] | null> {
  const key = normalizeSearch(value);
  if (!key || !hasOpenAiKey()) {
    return Promise.resolve(null);
  }

  const cached = getCachedSearchEmbedding(key);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = pendingSearches.get(key);
  if (pending) {
    return pending;
  }

  const task = createEmbedding(key)
    .then((embedding) => {
      if (embedding) {
        rememberSearch(key, embedding);
      }
      return embedding;
    })
    .finally(() => pendingSearches.delete(key));
  pendingSearches.set(key, task);
  return task;
}

export function clearSearchEmbeddingCache(): void {
  searchCache.clear();
  pendingSearches.clear();
}
