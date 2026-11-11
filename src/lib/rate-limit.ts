import { q1 } from "./db";
import { HttpError } from "./http";

/** Fixed-window limiter stored in Postgres (works across instances). */
export async function rateLimit(key: string, max: number, windowSec: number) {
  const row = await q1<{ hits: number }>(
    `INSERT INTO rate_limits(key, window_start, hits)
     VALUES ($1, to_timestamp(floor(extract(epoch from now())/$2)*$2), 1)
     ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
     RETURNING hits`, [key, windowSec]);
  if (row && row.hits > max) throw new HttpError(429, "rate_limited", "Too many requests. Try again later.");
}
