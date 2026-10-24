import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { AnthropicLlmClient } from "./llm/anthropic-llm-client.js";
import { fulfillOrder } from "./orders/fulfill.js";
import { FULFILL_ATTEMPTS, FULFILL_QUEUE } from "./orders/queue.js";

// bullmq workers need blocking commands that never give up
const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const llm = new AnthropicLlmClient(config.anthropicApiKey, config.llmModel);

redis.on("error", (err) => console.error(`worker redis error: ${err.message}`));
redis.once("ready", () => console.log("worker is up"));

const worker = new Worker<{ orderId: string }>(
  FULFILL_QUEUE,
  (job) => fulfillOrder(job.data.orderId, llm, job.attemptsMade + 1 >= FULFILL_ATTEMPTS),
  { connection: redis },
);

worker.on("completed", (job) => console.log(`fulfill job ${job.id} done`));
worker.on("failed", (job, err) => console.error(`fulfill job ${job?.id} failed: ${err.message}`));
worker.on("error", (err) => console.error(`worker error: ${err.message}`));

async function shutdown(signal: string): Promise<void> {
  console.log(`worker received ${signal}, shutting down`);
  await worker.close();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
