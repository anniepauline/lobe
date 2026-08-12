import { and, asc, eq, lt, lte, sql } from "drizzle-orm";

import { db } from "./client";
import { backgroundJobs, type BackgroundJobRow } from "./schema";

const MAX_JOB_ATTEMPTS = 3;

export async function claimNextJob(): Promise<BackgroundJobRow | null> {
  return db.transaction(async (transaction) => {
    const [job] = await transaction
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.status, "pending"),
          lte(backgroundJobs.availableAt, new Date()),
        ),
      )
      .orderBy(
        sql`case when ${backgroundJobs.type} = 'classify_save' then 0 else 1 end`,
        asc(backgroundJobs.createdAt),
      )
      .limit(1)
      .for("update", { skipLocked: true });

    if (!job) {
      return null;
    }

    const [claimed] = await transaction
      .update(backgroundJobs)
      .set({
        status: "processing",
        attempts: job.attempts + 1,
        lockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, job.id))
      .returning();

    return claimed ?? null;
  });
}

export async function completeJob(id: string): Promise<void> {
  await db
    .update(backgroundJobs)
    .set({
      status: "completed",
      lockedAt: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobs.id, id));
}

export async function retryOrFailJob(
  job: BackgroundJobRow,
  error: unknown,
): Promise<boolean> {
  const message =
    error instanceof Error ? error.message : "Unknown worker error";
  const exhausted = job.attempts >= MAX_JOB_ATTEMPTS;
  const delayMs = 2 ** Math.max(0, job.attempts - 1) * 2_000;

  await db
    .update(backgroundJobs)
    .set({
      status: exhausted ? "failed" : "pending",
      availableAt: exhausted ? new Date() : new Date(Date.now() + delayMs),
      lockedAt: null,
      lastError: message.slice(0, 1_000),
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobs.id, job.id));

  return exhausted;
}

export async function releaseStaleJobs(
  staleAfterMs = 5 * 60_000,
): Promise<number> {
  const released = await db
    .update(backgroundJobs)
    .set({
      status: "pending",
      lockedAt: null,
      availableAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(backgroundJobs.status, "processing"),
        lt(backgroundJobs.lockedAt, new Date(Date.now() - staleAfterMs)),
      ),
    )
    .returning({ id: backgroundJobs.id });

  return released.length;
}
