import { config } from "../config.js";
import { HttpError } from "../jury/errors.js";
import { redis } from "../redis.js";

const WINDOW_SECONDS = 3600;

// fixed hourly window per ip, a redis outage lets the request through rather than blocking sellers
export async function enforcePreviewRateLimit(ip: string): Promise<void> {
  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `rate:preview:${ip}:${bucket}`;
  let count: number;
  try {
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
  } catch (err) {
    console.error(`preview rate limit skipped: ${err instanceof Error ? err.message : err}`);
    return;
  }
  if (count > config.previewRateLimitPerHour) {
    throw new HttpError(429, "RATE_LIMITED", "too many previews from this address, try again in an hour");
  }
}
