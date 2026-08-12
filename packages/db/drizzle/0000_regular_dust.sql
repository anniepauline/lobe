CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."background_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."background_job_type" AS ENUM('classify_save', 'discover_recipe');--> statement-breakpoint
CREATE TYPE "public"."intent" AS ENUM('try', 'build', 'learn', 'reference', 'buy', 'share');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('x');--> statement-breakpoint
CREATE TYPE "public"."recipe_failure_status" AS ENUM('pending', 'processing', 'resolved', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."recipe_source" AS ENUM('bundled', 'ai', 'manual');--> statement-breakpoint
CREATE TYPE "public"."save_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "background_job_type" NOT NULL,
	"status" "background_job_status" DEFAULT 'pending' NOT NULL,
	"save_id" uuid,
	"recipe_failure_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"save_id" uuid NOT NULL,
	"previous_intent" "intent",
	"selected_intent" "intent" NOT NULL,
	"model_confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "platform" NOT NULL,
	"current_recipe_version" integer NOT NULL,
	"page_kind" text NOT NULL,
	"layout_fingerprint" text NOT NULL,
	"nodes" jsonb NOT NULL,
	"status" "recipe_failure_status" DEFAULT 'pending' NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"resolved_by_recipe_version" integer,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "platform" NOT NULL,
	"source_id" text NOT NULL,
	"canonical_url" text NOT NULL,
	"page_url" text NOT NULL,
	"content" text NOT NULL,
	"author_name" text NOT NULL,
	"author_handle" text NOT NULL,
	"author_avatar_url" text,
	"published_at" timestamp with time zone,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"screenshot_data" text,
	"screenshot_width" integer,
	"screenshot_height" integer,
	"recipe_version" integer NOT NULL,
	"layout_fingerprint" text NOT NULL,
	"status" "save_status" DEFAULT 'pending' NOT NULL,
	"intent" "intent",
	"confidence" real,
	"summary" text,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"why" text,
	"suggested_intents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"failure_reason" text,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selector_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "platform" NOT NULL,
	"layout_fingerprint" text NOT NULL,
	"version" integer NOT NULL,
	"source" "recipe_source" NOT NULL,
	"selectors" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_save_id_saves_id_fk" FOREIGN KEY ("save_id") REFERENCES "public"."saves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_recipe_failure_id_recipe_failures_id_fk" FOREIGN KEY ("recipe_failure_id") REFERENCES "public"."recipe_failures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_feedback" ADD CONSTRAINT "intent_feedback_save_id_saves_id_fk" FOREIGN KEY ("save_id") REFERENCES "public"."saves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "background_jobs_claim_idx" ON "background_jobs" USING btree ("status","available_at","created_at");--> statement-breakpoint
CREATE INDEX "background_jobs_save_idx" ON "background_jobs" USING btree ("save_id");--> statement-breakpoint
CREATE INDEX "intent_feedback_save_idx" ON "intent_feedback" USING btree ("save_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_failures_layout_unique" ON "recipe_failures" USING btree ("platform","layout_fingerprint");--> statement-breakpoint
CREATE INDEX "recipe_failures_status_idx" ON "recipe_failures" USING btree ("status","last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "saves_platform_source_id_unique" ON "saves" USING btree ("platform","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saves_canonical_url_unique" ON "saves" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "saves_status_created_idx" ON "saves" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "saves_intent_created_idx" ON "saves" USING btree ("intent","created_at");--> statement-breakpoint
CREATE INDEX "saves_embedding_hnsw_idx" ON "saves" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "selector_recipes_platform_version_unique" ON "selector_recipes" USING btree ("platform","version");--> statement-breakpoint
CREATE INDEX "selector_recipes_active_idx" ON "selector_recipes" USING btree ("platform","active");
