import "server-only";
import { createHash } from "node:crypto";
import { query } from "@/lib/db";

type RateLimitPolicy = {
  /** Number of attempts allowed before further attempts are blocked. */
  limit: number;
  /** Rolling counter window, in minutes. */
  windowMinutes: number;
  /** Lockout duration after the limit is exceeded, in minutes. */
  blockMinutes: number;
};

/**
 * Persistent rate limiting for serverless deployments. Subjects are hashed so
 * email addresses, user IDs, and IP addresses are not stored in plain text.
 * Call once for each attempted action, after basic input validation.
 */
export async function consumeRateLimit(bucket: string, subject: string, policy: RateLimitPolicy): Promise<boolean> {
  const normalizedBucket = bucket.trim().slice(0, 80);
  const subjectHash = createHash("sha256").update(`${normalizedBucket}\0${subject}`).digest("hex");
  const result = await query<{ blocked: boolean }>(
    `INSERT INTO rate_limits AS existing (bucket, subject_hash, attempts, window_started_at, blocked_until, updated_at)
     VALUES ($1, $2, 1, now(), NULL, now())
     ON CONFLICT (bucket, subject_hash) DO UPDATE SET
       attempts = CASE
         WHEN existing.window_started_at < now() - ($4::int * interval '1 minute') THEN 1
         ELSE existing.attempts + 1
       END,
       window_started_at = CASE
         WHEN existing.window_started_at < now() - ($4::int * interval '1 minute') THEN now()
         ELSE existing.window_started_at
       END,
       blocked_until = CASE
         WHEN existing.blocked_until IS NOT NULL AND existing.blocked_until > now() THEN existing.blocked_until
         WHEN (CASE
           WHEN existing.window_started_at < now() - ($4::int * interval '1 minute') THEN 1
           ELSE existing.attempts + 1
         END) > $3 THEN now() + ($5::int * interval '1 minute')
         ELSE NULL
       END,
       updated_at = now()
     RETURNING (blocked_until IS NOT NULL AND blocked_until > now()) AS blocked`,
    [normalizedBucket, subjectHash, policy.limit, policy.windowMinutes, policy.blockMinutes],
  );
  return result.rows[0]?.blocked === true;
}

export function requestIpKey(request: Request): string {
  const value = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for") || "unknown";
  return value.split(",")[0].trim().slice(0, 100) || "unknown";
}
