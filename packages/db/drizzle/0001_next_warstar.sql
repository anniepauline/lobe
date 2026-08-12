CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
DROP INDEX "saves_embedding_hnsw_idx";--> statement-breakpoint
CREATE INDEX "saves_search_trgm_idx" ON "saves" USING gin ((lower("content" || ' ' || coalesce("summary", '') || ' ' || "author_name" || ' ' || "author_handle")) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "saves_embedding_hnsw_idx" ON "saves" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=96);
