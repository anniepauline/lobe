import {
  bundledXRecipe,
  type DiscoveredSelector,
  type RecipeFailureRequest,
  type SelectorRecipe,
} from "@lobe/shared";
import { and, desc, eq, max, or, sql } from "drizzle-orm";

import { db } from "./client";
import { backgroundJobs, recipeFailures, selectorRecipes } from "./schema";

export async function seedBundledRecipe(): Promise<void> {
  await db
    .insert(selectorRecipes)
    .values({
      platform: bundledXRecipe.platform,
      layoutFingerprint: bundledXRecipe.layoutFingerprint,
      version: bundledXRecipe.version,
      source: bundledXRecipe.source,
      selectors: bundledXRecipe.selectors,
      active: true,
      updatedAt: new Date(bundledXRecipe.updatedAt),
    })
    .onConflictDoNothing({
      target: [selectorRecipes.platform, selectorRecipes.version],
    });
}

export async function getActiveRecipe(): Promise<SelectorRecipe> {
  const [row] = await db
    .select()
    .from(selectorRecipes)
    .where(
      and(eq(selectorRecipes.platform, "x"), eq(selectorRecipes.active, true)),
    )
    .orderBy(desc(selectorRecipes.version))
    .limit(1);

  if (!row) {
    return bundledXRecipe;
  }

  return {
    platform: row.platform,
    layoutFingerprint: row.layoutFingerprint,
    version: row.version,
    source: row.source,
    selectors: row.selectors,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function recordRecipeFailure(
  failure: RecipeFailureRequest,
): Promise<string> {
  return db.transaction(async (transaction) => {
    const [row] = await transaction
      .insert(recipeFailures)
      .values({
        platform: failure.platform,
        currentRecipeVersion: failure.currentRecipeVersion,
        pageKind: failure.pageKind,
        layoutFingerprint: failure.layoutFingerprint,
        nodes: failure.nodes,
        status: "pending",
        lastSeenAt: new Date(failure.observedAt),
      })
      .onConflictDoUpdate({
        target: [recipeFailures.platform, recipeFailures.layoutFingerprint],
        set: {
          currentRecipeVersion: failure.currentRecipeVersion,
          pageKind: failure.pageKind,
          nodes: failure.nodes,
          status: "pending",
          occurrenceCount: sql`${recipeFailures.occurrenceCount} + 1`,
          lastSeenAt: new Date(failure.observedAt),
        },
      })
      .returning();

    if (!row) {
      throw new Error("Failed to record selector recipe failure");
    }

    const [existingJob] = await transaction
      .select({ id: backgroundJobs.id })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.recipeFailureId, row.id),
          or(
            eq(backgroundJobs.status, "pending"),
            eq(backgroundJobs.status, "processing"),
          ),
        ),
      )
      .limit(1);

    if (!existingJob) {
      await transaction.insert(backgroundJobs).values({
        type: "discover_recipe",
        recipeFailureId: row.id,
      });
    }

    return row.id;
  });
}

export async function getRecipeFailure(id: string) {
  const [row] = await db
    .select()
    .from(recipeFailures)
    .where(eq(recipeFailures.id, id))
    .limit(1);

  return row ?? null;
}

export async function activateDiscoveredRecipe(
  layoutFingerprint: string,
  discovered: DiscoveredSelector,
): Promise<SelectorRecipe> {
  return db.transaction(async (transaction) => {
    const [versionRow] = await transaction
      .select({ version: max(selectorRecipes.version) })
      .from(selectorRecipes)
      .where(eq(selectorRecipes.platform, "x"));

    const version = (versionRow?.version ?? 0) + 1;
    const now = new Date();

    await transaction
      .update(selectorRecipes)
      .set({ active: false, updatedAt: now })
      .where(eq(selectorRecipes.platform, "x"));

    const [created] = await transaction
      .insert(selectorRecipes)
      .values({
        platform: "x",
        layoutFingerprint,
        version,
        source: "ai",
        selectors: {
          post: discovered.post,
          unsavedControl: discovered.unsavedControl,
          savedControl: discovered.savedControl,
          actionGroup: discovered.actionGroup,
          content: discovered.content,
          userName: discovered.userName,
          statusLink: discovered.statusLink,
          media: discovered.media,
        },
        active: true,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to activate discovered selector recipe");
    }

    await transaction
      .update(recipeFailures)
      .set({
        status: "resolved",
        resolvedByRecipeVersion: version,
      })
      .where(
        and(
          eq(recipeFailures.platform, "x"),
          eq(recipeFailures.layoutFingerprint, layoutFingerprint),
        ),
      );

    return {
      platform: created.platform,
      layoutFingerprint: created.layoutFingerprint,
      version: created.version,
      source: created.source,
      selectors: created.selectors,
      updatedAt: created.updatedAt.toISOString(),
    };
  });
}

export async function markRecipeFailureProcessing(id: string): Promise<void> {
  await db
    .update(recipeFailures)
    .set({ status: "processing" })
    .where(eq(recipeFailures.id, id));
}

export async function markRecipeFailureIgnored(id: string): Promise<void> {
  await db
    .update(recipeFailures)
    .set({ status: "ignored" })
    .where(eq(recipeFailures.id, id));
}
