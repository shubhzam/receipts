import { Redis } from "ioredis";
import { config } from "./config.js";

// shared by the rate limit and the job queue producer
export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1 });
redis.on("error", (err) => console.error(`api redis error: ${err.message}`));
