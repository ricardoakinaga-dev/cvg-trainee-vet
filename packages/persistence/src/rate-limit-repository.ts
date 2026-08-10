import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "./schema.js";

export type SharedRateLimitOptions = Readonly<{
  readonly maxRequests?: number;
  readonly windowMs?: number;
}>;

export type NormalizedSharedRateLimitOptions = Readonly<{
  readonly maxRequests: number;
  readonly windowMs: number;
}>;

export type SharedRateLimitDecision = Readonly<{
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds?: number;
}>;

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function positiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${field} must be a positive integer`);
  }
}

function normalizedKey(value: string): string {
  const key = value.trim().slice(0, 256);
  return key.length > 0 ? key : "anonymous";
}

function validNow(nowMs: number): void {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new RangeError("nowMs must be a non-negative number");
  }
}

export function normalizeSharedRateLimitOptions(
  options: SharedRateLimitOptions = {},
): NormalizedSharedRateLimitOptions {
  const maxRequests = options.maxRequests ?? 120;
  const windowMs = options.windowMs ?? 60_000;
  positiveInteger(maxRequests, "maxRequests");
  positiveInteger(windowMs, "windowMs");
  return Object.freeze({ maxRequests, windowMs });
}

export function createPostgresRateLimiter(
  db: DatabaseExecutor,
  options: SharedRateLimitOptions = {},
): Readonly<{
  readonly check: (
    key: string,
    nowMs?: number,
  ) => Promise<SharedRateLimitDecision>;
}> {
  const normalized = normalizeSharedRateLimitOptions(options);

  const check = async (
    key: string,
    nowMs = Date.now(),
  ): Promise<SharedRateLimitDecision> => {
    validNow(nowMs);
    const safeKey = normalizedKey(key);
    const now = new Date(nowMs);
    const expiresAt = new Date(nowMs + normalized.windowMs);
    const nowIso = now.toISOString();
    const expiresAtIso = expiresAt.toISOString();

    return db.transaction(async (transaction) => {
      await transaction.execute(
        sql`delete from rate_limit_buckets where expires_at <= ${nowIso}::timestamptz`,
      );
      const rows = await transaction.execute<{
        readonly count: number;
        readonly expiresAt: Date | string;
      }>(sql`
        insert into rate_limit_buckets (
          key,
          window_started_at,
          count,
          expires_at
        ) values (
          ${safeKey},
          ${nowIso}::timestamptz,
          1,
          ${expiresAtIso}::timestamptz
        )
        on conflict (key) do update set
          window_started_at = case
            when rate_limit_buckets.expires_at <= ${nowIso}::timestamptz
              then excluded.window_started_at
            else rate_limit_buckets.window_started_at
          end,
          count = case
            when rate_limit_buckets.expires_at <= ${nowIso}::timestamptz
              then 1
            else least(rate_limit_buckets.count + 1, ${normalized.maxRequests + 1})
          end,
          expires_at = case
            when rate_limit_buckets.expires_at <= ${nowIso}::timestamptz
              then excluded.expires_at
            else rate_limit_buckets.expires_at
          end
        returning count, expires_at as "expiresAt"
      `);
      const row = rows[0];
      if (row === undefined) {
        throw new Error("rate-limit bucket was not persisted");
      }
      if (row.count > normalized.maxRequests) {
        return Object.freeze({
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((new Date(row.expiresAt).getTime() - nowMs) / 1_000),
          ),
        });
      }
      return Object.freeze({
        allowed: true,
        remaining: normalized.maxRequests - row.count,
      });
    });
  };

  return Object.freeze({ check });
}
