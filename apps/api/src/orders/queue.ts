import { Queue } from "bullmq";
import { redis } from "../redis.js";

export const FULFILL_QUEUE = "fulfill";
export const FULFILL_ATTEMPTS = 3;
const BACKOFF_MS = 5000;

const fulfillQueue = new Queue(FULFILL_QUEUE, { connection: redis });
fulfillQueue.on("error", (err) => console.error(`fulfill queue error: ${err.message}`));

// the job id is the idempotency key, adding the same order twice is a no-op
export function fulfillJobId(orderId: string): string {
  return `fulfill-${orderId}`;
}

export async function enqueueFulfill(orderId: string): Promise<void> {
  await fulfillQueue.add(
    "fulfill",
    { orderId },
    { jobId: fulfillJobId(orderId), attempts: FULFILL_ATTEMPTS, backoff: { type: "exponential", delay: BACKOFF_MS } },
  );
}
