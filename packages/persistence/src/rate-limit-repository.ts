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
type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];

type RateLimitBucketRow = Readonly<{
  readonly count: number;
  readonly expiresAt: Date | string;
}>;

type RateLimitWindow = Readonly<{
  readonly safeKey: string;
  readonly nowMs: number;
  readonly nowIso: string;
  readonly expiresAtIso: string;
}>;

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

function buildRateLimitWindow(
  key: string,
  nowMs: number,
  windowMs: number,
): RateLimitWindow {
  const now = new Date(nowMs);
  const expiresAt = new Date(nowMs + windowMs);
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isFinite(expiresAt.getTime())
  ) {
    throw new RangeError("rate-limit window is invalid");
  }
  return Object.freeze({
    safeKey: normalizedKey(key),
    nowMs,
    nowIso: now.toISOString(),
    expiresAtIso: expiresAt.toISOString(),
  });
}

async function deleteExpiredBuckets(
  transaction: DatabaseTransaction,
  nowIso: string,
): Promise<void> {
  await transaction.execute(
    sql`delete from rate_limit_buckets where expires_at <= ${nowIso}::timestamptz`,
  );
}

async function persistRateLimitBucket(
  transaction: DatabaseTransaction,
  window: RateLimitWindow,
  maxRequests: number,
): Promise<RateLimitBucketRow> {
  const rows = await transaction.execute<RateLimitBucketRow>(sql`
    insert into rate_limit_buckets (
      key,
      window_started_at,
      count,
      expires_at
    ) values (
      ${window.safeKey},
      ${window.nowIso}::timestamptz,
      1,
      ${window.expiresAtIso}::timestamptz
    )
    on conflict (key) do update set
      window_started_at = case
        when rate_limit_buckets.expires_at <= ${window.nowIso}::timestamptz
          then excluded.window_started_at
        else rate_limit_buckets.window_started_at
      end,
      count = case
        when rate_limit_buckets.expires_at <= ${window.nowIso}::timestamptz
          then 1
        else least(rate_limit_buckets.count + 1, ${maxRequests + 1})
      end,
      expires_at = case
        when rate_limit_buckets.expires_at <= ${window.nowIso}::timestamptz
          then excluded.expires_at
        else rate_limit_buckets.expires_at
      end
    returning count, expires_at as "expiresAt"
  `);
  const row = rows[0];
  if (row === undefined) {
    throw new Error("rate-limit bucket was not persisted");
  }
  return row;
}

function bucketExpiryMs(value: Date | string): number {
  const expiryMs = new Date(value).getTime();
  if (!Number.isFinite(expiryMs)) {
    throw new Error("rate-limit bucket expiry is invalid");
  }
  return expiryMs;
}

function buildRateLimitDecision(
  row: RateLimitBucketRow,
  normalized: NormalizedSharedRateLimitOptions,
  nowMs: number,
): SharedRateLimitDecision {
  const expiresAtMs = bucketExpiryMs(row.expiresAt);
  if (row.count > normalized.maxRequests) {
    return Object.freeze({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((expiresAtMs - nowMs) / 1_000)),
    });
  }
  return Object.freeze({
    allowed: true,
    remaining: normalized.maxRequests - row.count,
  });
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
    const window = buildRateLimitWindow(key, nowMs, normalized.windowMs);

    return db.transaction(async (transaction) => {
      await deleteExpiredBuckets(transaction, window.nowIso);
      const row = await persistRateLimitBucket(
        transaction,
        window,
        normalized.maxRequests,
      );
      return buildRateLimitDecision(row, normalized, window.nowMs);
    });
  };

  return Object.freeze({ check });
}
