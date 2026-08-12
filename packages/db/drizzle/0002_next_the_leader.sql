ALTER TABLE "intent_feedback" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "saves" ADD COLUMN "user_reason" text;--> statement-breakpoint
ALTER TABLE "saves" ADD COLUMN "review_dismissed_at" timestamp with time zone;