import { randomUUID } from "node:crypto";
import { claimNextJob, completeJob, failJob } from "./queue";
import { runJob } from "./handlers";
import { logger } from "../logger";

/** Processes due jobs until none are left. Returns how many ran. */
export async function drainQueue(workerId = `worker-${randomUUID()}`, max = 100): Promise<number> {
  let processed = 0;
  while (processed < max) {
    const job = await claimNextJob(workerId);
    if (!job) break;
    try {
      await runJob(job);
      await completeJob(job.id);
      logger.info("job.succeeded", { jobId: job.id, type: job.type });
    } catch (err) {
      logger.error("job.failed", { jobId: job.id, type: job.type, attempts: job.attempts, error: String(err) });
      await failJob(job, err);
    }
    processed++;
  }
  return processed;
}

async function main() {
  const workerId = `worker-${randomUUID()}`;
  logger.info("worker.started", { workerId });
  for (;;) {
    const n = await drainQueue(workerId);
    if (n === 0) await new Promise((r) => setTimeout(r, 2000));
  }
}

if (process.argv[1]?.endsWith("worker.ts")) {
  main().catch((err) => {
    logger.error("worker.crashed", { error: String(err) });
    process.exit(1);
  });
}
