import { Redis } from "ioredis";
import { config } from "./config.js";

// minimal worker entry point, real jobs get added from F2 on
const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

redis.on("error", (err) => console.error(`worker redis error: ${err.message}`));
redis.once("ready", () => console.log("worker is up"));

async function shutdown(signal: string): Promise<void> {
  console.log(`worker received ${signal}, shutting down`);
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
