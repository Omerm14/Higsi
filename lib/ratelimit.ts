import { sql } from "./db";

// Fixed-window counters in Postgres — no extra vendor. Every action that
// hits these endpoints already pays a DB round-trip, and the abuse ceiling
// is bounded by credits anyway; this just stops runaway loops and
// brute-force probing. Old windows are purged by the reconciler cron.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number }> {
  const db = sql();
  const rows = (await db`
    insert into rate_limits (key, window_start, count)
    values (
      ${key},
      to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}),
      1
    )
    on conflict (key, window_start)
    do update set count = rate_limits.count + 1
    returning count
  `) as { count: number }[];
  const count = rows[0]?.count ?? 1;
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export function rateLimitResponse(): Response {
  return Response.json(
    { error: "Too many requests — slow down a little." },
    { status: 429 }
  );
}

export const RATE_LIMITS = {
  generatePerMinute: 10,
  generatePerHour: 60,
  uploadPerMinute: 20,
  jobsPollPerMinute: 120,
} as const;
