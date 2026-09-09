import { createHash } from "node:crypto";

import type { RateLimitRiskClass } from "../routing/route-registry.js";

export type { RateLimitRiskClass };

export type RateLimitDecision = Readonly<{
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds?: number;
}>;

export type RateLimitStore = Readonly<{
  readonly increment: (
    key: string,
    maxRequests: number,
    windowMs: number,
    nowMs: number,
  ) => Promise<RateLimitDecision>;
  readonly reset: (key: string) => Promise<void>;
}>;

export type RateLimitClassLimits = Readonly<{
  readonly maxRequests: number;
  readonly windowMs: number;
}>;

export type RateLimitKeyInput = Readonly<{
  readonly principalId?: string;
  readonly clientIp?: string;
  readonly route: string;
  readonly riskClass: RateLimitRiskClass;
}>;

export type RateLimitGuardOptions = Readonly<{
  readonly store: RateLimitStore;
  readonly riskClass: RateLimitRiskClass;
  readonly failPolicy: "fail-closed" | "fail-open";
  readonly clock?: () => number;
  readonly onRejection?: (
    entry: Readonly<{
      readonly key: string;
      readonly route: string;
      readonly riskClass: RateLimitRiskClass;
      readonly retryAfterSeconds: number;
    }>,
  ) => void;
}>;

export type RateLimitGuard = Readonly<{
  readonly check: (input: RateLimitKeyInput) => Promise<RateLimitDecision>;
}>;

export const RISK_CLASS_LIMITS: Readonly<
  Record<RateLimitRiskClass, RateLimitClassLimits>
> = Object.freeze({
  "public-low-risk": Object.freeze({ maxRequests: 120, windowMs: 60_000 }),
  authentication: Object.freeze({ maxRequests: 20, windowMs: 60_000 }),
  recovery: Object.freeze({ maxRequests: 10, windowMs: 60_000 }),
  mutation: Object.freeze({ maxRequests: 60, windowMs: 60_000 }),
  "expensive-read": Object.freeze({ maxRequests: 120, windowMs: 60_000 }),
  internal: Object.freeze({ maxRequests: 60, windowMs: 60_000 }),
  "ai-assisted": Object.freeze({ maxRequests: 10, windowMs: 60_000 }),
});

const MAX_KEY_PART_LENGTH = 256;

function normalizedPart(value: string, fallback: string): string {
  const normalized = value.trim().slice(0, MAX_KEY_PART_LENGTH);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizedClientIp(value: string | undefined): string {
  if (value === undefined) return "unknown";
  const normalized = value.trim();
  if (normalized === "::1") return "127.0.0.1";
  if (normalized.length === 0 || normalized.length > 64) return "unknown";
  if (!/^[a-zA-Z0-9.:]+$/.test(normalized)) return "unknown";
  return normalized;
}

function principalHash(principalId: string | undefined): string {
  if (principalId === undefined || principalId.trim().length === 0) {
    return "anonymous";
  }
  return createHash("sha256")
    .update(`cvg-ratelimit-v1|${principalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function buildRateLimitKey(input: RateLimitKeyInput): string {
  const route = input.route.trim();
  if (route.length === 0) {
    throw new RangeError("route must not be empty");
  }
  if (route.length > MAX_KEY_PART_LENGTH) {
    throw new RangeError("route exceeds the key budget");
  }
  const parts = [
    `risk:${normalizedPart(input.riskClass, "unknown")}`,
    `client:${normalizedClientIp(input.clientIp)}`,
    `route:${route}`,
    `principal:${principalHash(input.principalId)}`,
  ];
  return parts.join("|");
}

type MemoryEntry = {
  windowStartedAt: number;
  count: number;
};

export function createMemoryRateLimitStore(): RateLimitStore {
  let entries = new Map<string, MemoryEntry>();

  async function increment(
    key: string,
    maxRequests: number,
    windowMs: number,
    nowMs: number,
  ): Promise<RateLimitDecision> {
    if (!Number.isSafeInteger(maxRequests) || maxRequests < 1) {
      throw new RangeError("maxRequests must be a positive integer");
    }
    if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
      throw new RangeError("windowMs must be a positive integer");
    }
    if (!Number.isFinite(nowMs) || nowMs < 0) {
      throw new RangeError("nowMs must be a non-negative number");
    }
    for (const [entryKey, entry] of entries) {
      if (nowMs - entry.windowStartedAt >= windowMs) entries.delete(entryKey);
    }
    const existing = entries.get(key);
    if (existing !== undefined && existing.count >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.windowStartedAt + windowMs - nowMs) / 1_000),
      );
      return Object.freeze({ allowed: false, remaining: 0, retryAfterSeconds });
    }
    const next: MemoryEntry =
      existing === undefined
        ? { windowStartedAt: nowMs, count: 1 }
        : {
            windowStartedAt: existing.windowStartedAt,
            count: existing.count + 1,
          };
    entries = new Map(entries.set(key, next));
    return Object.freeze({
      allowed: true,
      remaining: Math.max(0, maxRequests - next.count),
    });
  }

  async function reset(key: string): Promise<void> {
    entries.delete(key);
  }

  return Object.freeze({ increment, reset });
}

export function createScriptedRateLimitStore(
  options: Readonly<{
    readonly script?: readonly RateLimitDecision[];
    readonly failures?: number;
    readonly decision?: RateLimitDecision;
  }> = {},
): RateLimitStore {
  const script = [...(options.script ?? [])];
  let failuresLeft = options.failures ?? 0;
  const fallback =
    options.decision ?? Object.freeze({ allowed: true, remaining: 1 });

  async function increment(): Promise<RateLimitDecision> {
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      throw new Error("rate-limit store unavailable (scripted)");
    }
    return script.length > 0 ? (script.shift() as RateLimitDecision) : fallback;
  }

  async function reset(): Promise<void> {
    return undefined;
  }

  return Object.freeze({ increment, reset });
}

export function createRateLimitGuard(
  options: RateLimitGuardOptions,
): RateLimitGuard {
  const clock = options.clock ?? (() => Date.now());
  const limits = RISK_CLASS_LIMITS[options.riskClass];

  async function check(input: RateLimitKeyInput): Promise<RateLimitDecision> {
    const key = buildRateLimitKey({ ...input, riskClass: options.riskClass });
    const nowMs = clock();
    try {
      const decision = await options.store.increment(
        key,
        limits.maxRequests,
        limits.windowMs,
        nowMs,
      );
      if (!decision.allowed) {
        options.onRejection?.(
          Object.freeze({
            key,
            route: input.route,
            riskClass: options.riskClass,
            retryAfterSeconds: decision.retryAfterSeconds ?? 1,
          }),
        );
      }
      return decision;
    } catch {
      if (options.failPolicy === "fail-open") {
        return Object.freeze({ allowed: true, remaining: 0 });
      }
      return Object.freeze({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 1,
      });
    }
  }

  return Object.freeze({ check });
}
