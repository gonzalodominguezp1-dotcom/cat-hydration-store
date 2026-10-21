import type { Job, Prisma } from "@prisma/client";
import { db } from "../db";

export type JobType = "supplier.submit_order" | "supplier.sync_inventory" | "supplier.poll_tracking";

export async function enqueueJob(
  type: JobType,
  payload: Prisma.InputJsonValue,
  opts: { dedupeKey?: string; runAt?: Date; maxAttempts?: number } = {},
  tx: Prisma.TransactionClient = db,
): Promise<boolean> {
  // ON CONFLICT DO NOTHING: a duplicate dedupeKey means the work is already
  // scheduled. Unlike catching the error, this does not abort a surrounding
  // Postgres transaction.
  const res = await tx.job.createMany({
    data: [{ type, payload, dedupeKey: opts.dedupeKey, runAt: opts.runAt, maxAttempts: opts.maxAttempts }],
    skipDuplicates: true,
  });
  return res.count === 1;
}

/** Atomically claims the next due job. Safe with several workers. */
export async function claimNextJob(workerId: string, staleLockMs = 10 * 60_000): Promise<Job | null> {
  const staleBefore = new Date(Date.now() - staleLockMs);
  const rows = await db.$queryRaw<Job[]>`
    UPDATE "Job" SET status = 'RUNNING', "lockedAt" = now(), "lockedBy" = ${workerId},
      attempts = attempts + 1, "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "Job"
      WHERE (status = 'PENDING' AND "runAt" <= now())
         OR (status = 'RUNNING' AND "lockedAt" < ${staleBefore})
      ORDER BY "runAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *`;
  return rows[0] ?? null;
}

export async function completeJob(id: string) {
  await db.job.update({ where: { id }, data: { status: "SUCCEEDED", lockedAt: null, lockedBy: null } });
}

/** Exponential backoff: 30s, 1m, 2m, 4m... capped at 1h. */
export function backoffMs(attempts: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 3_600_000);
}

export async function failJob(job: Job, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const dead = job.attempts >= job.maxAttempts;
  await db.job.update({
    where: { id: job.id },
    data: {
      status: dead ? "DEAD" : "PENDING",
      lastError: message.slice(0, 2000),
      runAt: dead ? job.runAt : new Date(Date.now() + backoffMs(job.attempts)),
      lockedAt: null,
      lockedBy: null,
    },
  });
  if (dead) {
    await db.incident.create({
      data: {
        level: "error",
        source: `job:${job.type}`,
        message: `Job ${job.id} agotó ${job.maxAttempts} intentos: ${message.slice(0, 500)}`,
        context: { jobId: job.id, payload: job.payload as Prisma.InputJsonValue },
      },
    });
  }
}
