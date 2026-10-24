import { Redis } from "ioredis";
import pg from "pg";
import { WhopClient } from "@whop/sdk";
import type { HealthCheck, HealthResponse } from "@receipts/shared";
import { config } from "./config.js";

const CHECK_TIMEOUT_MS = 3000;

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: CHECK_TIMEOUT_MS,
});
// idle client errors would otherwise crash the process when postgres goes away
pool.on("error", (err) => console.error(`pg pool error: ${err.message}`));

// remember the last connection error so a down redis reports the real cause
let lastRedisError: string | undefined;
const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1 });
redis.on("error", (err) => {
  lastRedisError = describeError(err);
});
redis.on("ready", () => {
  lastRedisError = undefined;
});

const whop = new WhopClient({
  token: config.whopApiKey,
  baseUrl: config.whopBaseUrl,
  apiVersionDate: config.whopApiVersionDate,
});

// node reports a refused connection as an AggregateError with an empty message
function describeError(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return describeError(err.errors[0]);
  }
  if (err instanceof Error) {
    const text = err.message || (err as NodeJS.ErrnoException).code || err.name;
    return text.replace(/\s+/g, " ").slice(0, 200);
  }
  return String(err);
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

async function timed(run: () => Promise<void>, fallbackError?: () => string | undefined): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await withTimeout(run(), CHECK_TIMEOUT_MS);
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    const message = fallbackError?.() || describeError(err);
    return { ok: false, error: message, ms: Date.now() - start };
  }
}

export function checkDb(): Promise<HealthCheck> {
  return timed(async () => {
    await pool.query("SELECT 1");
  });
}

export function checkRedis(): Promise<HealthCheck> {
  return timed(
    async () => {
      await redis.ping();
    },
    () => lastRedisError,
  );
}

export function checkWhop(): Promise<HealthCheck> {
  return timed(async () => {
    await whop.accounts.me({}, { timeoutInSeconds: CHECK_TIMEOUT_MS / 1000, maxRetries: 0 });
  });
}

export async function runHealthChecks(): Promise<HealthResponse> {
  const [db, redisCheck, whopCheck] = await Promise.all([checkDb(), checkRedis(), checkWhop()]);
  const allOk = db.ok && redisCheck.ok && whopCheck.ok;
  return {
    status: allOk ? "ok" : "degraded",
    checks: { db, redis: redisCheck, whop: whopCheck },
  };
}
