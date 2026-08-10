export type RequestHeaders = Readonly<Record<string, string | undefined>>;

export type RateLimitOptions = Readonly<{
  readonly maxRequests?: number;
  readonly windowMs?: number;
  readonly maxKeys?: number;
}>;

export type RateLimitDecision = Readonly<{
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds?: number;
}>;

export type RateLimiter = Readonly<{
  readonly check: (key: string, nowMs?: number) => RateLimitDecision;
  readonly size: () => number;
}>;

export type RequestRateLimiter = Readonly<{
  readonly check: (
    key: string,
    nowMs?: number,
  ) => RateLimitDecision | Promise<RateLimitDecision>;
}>;

type RateLimitEntry = Readonly<{
  readonly windowStartedAt: number;
  readonly count: number;
}>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SAME_SITE_VALUES = new Set(["same-origin", "same-site"]);

function positiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${field} must be a positive integer`);
  }
}

function normalizedKey(value: string): string {
  const key = value.trim().slice(0, 256);
  return key.length > 0 ? key : "anonymous";
}

function validNow(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("nowMs must be a non-negative number");
  }
}

export function createRateLimiter(options: RateLimitOptions = {}): RateLimiter {
  const maxRequests = options.maxRequests ?? 120;
  const windowMs = options.windowMs ?? 60_000;
  const maxKeys = options.maxKeys ?? 10_000;
  positiveInteger(maxRequests, "maxRequests");
  positiveInteger(windowMs, "windowMs");
  positiveInteger(maxKeys, "maxKeys");

  let entries: ReadonlyMap<string, RateLimitEntry> = new Map();

  function check(key: string, nowMs = Date.now()): RateLimitDecision {
    validNow(nowMs);
    const safeKey = normalizedKey(key);
    const activeEntries = [...entries].filter(
      ([, entry]) => nowMs - entry.windowStartedAt < windowMs,
    );
    const existing = activeEntries.find(
      ([entryKey]) => entryKey === safeKey,
    )?.[1];
    const retainedEntries =
      existing === undefined && activeEntries.length >= maxKeys
        ? activeEntries.slice(1)
        : activeEntries;
    const nextEntries = new Map(retainedEntries);

    if (existing !== undefined && existing.count >= maxRequests) {
      entries = nextEntries;
      return Object.freeze({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.windowStartedAt + windowMs - nowMs) / 1_000),
        ),
      });
    }

    const nextEntry: RateLimitEntry =
      existing === undefined
        ? { windowStartedAt: nowMs, count: 1 }
        : { ...existing, count: existing.count + 1 };
    entries = new Map([...nextEntries, [safeKey, nextEntry]]);
    return Object.freeze({
      allowed: true,
      remaining: Math.max(0, maxRequests - nextEntry.count),
    });
  }

  return Object.freeze({
    check,
    size: () => entries.size,
  });
}

function normalizedOrigin(value: string): string | undefined {
  try {
    const origin = new URL(value).origin;
    return origin === "null" ? undefined : origin;
  } catch {
    return undefined;
  }
}

function allowedOrigin(value: string, origins: readonly string[]): boolean {
  const origin = normalizedOrigin(value);
  if (origin === undefined) return false;
  return origins.some((candidate) => normalizedOrigin(candidate) === origin);
}

function hasSessionCookie(headers: RequestHeaders): boolean {
  const cookie = headers.cookie;
  return (
    typeof cookie === "string" &&
    /(?:^|;\s*)__Host-cvg_session=[^;]+/u.test(cookie)
  );
}

export function isCsrfAllowed(
  method: string,
  headers: RequestHeaders,
  allowedOrigins: readonly string[],
): boolean {
  const normalizedMethod = method.toUpperCase();
  if (SAFE_METHODS.has(normalizedMethod) || !hasSessionCookie(headers)) {
    return true;
  }

  if (headers.origin !== undefined) {
    return allowedOrigin(headers.origin, allowedOrigins);
  }
  if (headers.referer !== undefined) {
    return allowedOrigin(headers.referer, allowedOrigins);
  }

  const fetchSite = headers["sec-fetch-site"]?.toLowerCase();
  return fetchSite !== undefined && SAME_SITE_VALUES.has(fetchSite);
}
