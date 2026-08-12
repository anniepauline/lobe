import type {
  IntentId,
  MediaItem,
  RecipeFailureRequest,
  SelectorRecipe,
} from "@lobe/shared";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const platformEnum = pgEnum("platform", ["x"]);
export const intentEnum = pgEnum("intent", [
  "try",
  "build",
  "learn",
  "reference",
  "buy",
  "share",
]);
export const saveStatusEnum = pgEnum("save_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);
export const recipeSourceEnum = pgEnum("recipe_source", [
  "bundled",
  "ai",
  "manual",
]);
export const recipeFailureStatusEnum = pgEnum("recipe_failure_status", [
  "pending",
  "processing",
  "resolved",
  "ignored",
]);
export const backgroundJobTypeEnum = pgEnum("background_job_type", [
  "classify_save",
  "discover_recipe",
]);
export const backgroundJobStatusEnum = pgEnum("background_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const selectorRecipes = pgTable(
  "selector_recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: platformEnum("platform").notNull(),
    layoutFingerprint: text("layout_fingerprint").notNull(),
    version: integer("version").notNull(),
    source: recipeSourceEnum("source").notNull(),
    selectors: jsonb("selectors")
      .$type<SelectorRecipe["selectors"]>()
      .notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("selector_recipes_platform_version_unique").on(
      table.platform,
      table.version,
    ),
    index("selector_recipes_active_idx").on(table.platform, table.active),
  ],
);

export const recipeFailures = pgTable(
  "recipe_failures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: platformEnum("platform").notNull(),
    currentRecipeVersion: integer("current_recipe_version").notNull(),
    pageKind: text("page_kind")
      .$type<RecipeFailureRequest["pageKind"]>()
      .notNull(),
    layoutFingerprint: text("layout_fingerprint").notNull(),
    nodes: jsonb("nodes").$type<RecipeFailureRequest["nodes"]>().notNull(),
    status: recipeFailureStatusEnum("status").notNull().default("pending"),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    resolvedByRecipeVersion: integer("resolved_by_recipe_version"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("recipe_failures_layout_unique").on(
      table.platform,
      table.layoutFingerprint,
    ),
    index("recipe_failures_status_idx").on(table.status, table.lastSeenAt),
  ],
);

export const saves = pgTable(
  "saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: platformEnum("platform").notNull(),
    sourceId: text("source_id").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    pageUrl: text("page_url").notNull(),
    content: text("content").notNull(),
    authorName: text("author_name").notNull(),
    authorHandle: text("author_handle").notNull(),
    authorAvatarUrl: text("author_avatar_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    media: jsonb("media").$type<MediaItem[]>().notNull().default([]),
    screenshotData: text("screenshot_data"),
    screenshotWidth: integer("screenshot_width"),
    screenshotHeight: integer("screenshot_height"),
    recipeVersion: integer("recipe_version").notNull(),
    layoutFingerprint: text("layout_fingerprint").notNull(),
    status: saveStatusEnum("status").notNull().default("pending"),
    intent: intentEnum("intent").$type<IntentId>(),
    confidence: real("confidence"),
    summary: text("summary"),
    topics: jsonb("topics").$type<string[]>().notNull().default([]),
    why: text("why"),
    suggestedIntents: jsonb("suggested_intents")
      .$type<IntentId[]>()
      .notNull()
      .default([]),
    needsReview: boolean("needs_review").notNull().default(false),
    failureReason: text("failure_reason"),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("saves_platform_source_id_unique").on(
      table.platform,
      table.sourceId,
    ),
    uniqueIndex("saves_canonical_url_unique").on(table.canonicalUrl),
    index("saves_status_created_idx").on(table.status, table.createdAt),
    index("saves_intent_created_idx").on(table.intent, table.createdAt),
    index("saves_embedding_hnsw_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 96 }),
    index("saves_search_trgm_idx").using(
      "gin",
      sql`(lower(${table.content} || ' ' || coalesce(${table.summary}, '') || ' ' || ${table.authorName} || ' ' || ${table.authorHandle})) gin_trgm_ops`,
    ),
  ],
);

export const intentFeedback = pgTable(
  "intent_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saveId: uuid("save_id")
      .notNull()
      .references(() => saves.id, { onDelete: "cascade" }),
    previousIntent: intentEnum("previous_intent").$type<IntentId>(),
    selectedIntent: intentEnum("selected_intent").$type<IntentId>().notNull(),
    modelConfidence: real("model_confidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("intent_feedback_save_idx").on(table.saveId)],
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: backgroundJobTypeEnum("type").notNull(),
    status: backgroundJobStatusEnum("status").notNull().default("pending"),
    saveId: uuid("save_id").references(() => saves.id, {
      onDelete: "cascade",
    }),
    recipeFailureId: uuid("recipe_failure_id").references(
      () => recipeFailures.id,
      { onDelete: "cascade" },
    ),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("background_jobs_claim_idx").on(
      table.status,
      table.availableAt,
      table.createdAt,
    ),
    index("background_jobs_save_idx").on(table.saveId),
  ],
);

export type SaveRow = typeof saves.$inferSelect;
export type NewSaveRow = typeof saves.$inferInsert;
export type BackgroundJobRow = typeof backgroundJobs.$inferSelect;
