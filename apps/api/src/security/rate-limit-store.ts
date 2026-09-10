import { createHash } from "node:crypto";

import type { RateLimitRiskClass } from "../routing/route-registry.js";

import { normalizeIpAddress } from "./trusted-proxy.js";

export type { RateLimitRiskClass };

export type RateLimitDecision = Readonly<{
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds?: number;
}>;

export type RateLimitStoreOptions = Readonly<{
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}>;

export type RateLimitStore = Readonly<{
  readonly increment: (
    key: string,
    maxRequests: number,
    windowMs: number,
    nowMs: number,
    options?: RateLimitStoreOptions,
  ) => Promise<RateLimitDecision>;
  readonly reset: (key: string) => Promise<void>;
}>;

export class RateLimitStoreError extends Error {
  public override readonly name = "RateLimitStoreError";

  public constructor(
    message: string,
    public readonly code: "timeout" | "aborted" | "backend",
  ) {
    super(message);
  }
}

export function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new RateLimitStoreError("rate-limit operation aborted", "aborted");
  }
}

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
  readonly failPolicy?: "fail-closed" | "fail-open";
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

export const FAIL_POLICY_BY_RISK_CLASS: Readonly<
  Record<RateLimitRiskClass, "fail-closed" | "fail-open">
> = Object.freeze({
  "public-low-risk": "fail-open",
  authentication: "fail-closed",
  recovery: "fail-closed",
  mutation: "fail-closed",
  "expensive-read": "fail-closed",
  internal: "fail-closed",
  "ai-assisted": "fail-closed",
});

const MAX_KEY_PART_LENGTH = 256;

function normalizedPart(value: string, fallback: string): string {
  const normalized = value.trim().slice(0, MAX_KEY_PART_LENGTH);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizedClientIp(value: string | undefined): string {
  if (value === undefined) return "unknown";
  return normalizeIpAddress(value) ?? "unknown";
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
    options: RateLimitStoreOptions = {},
  ): Promise<RateLimitDecision> {
    assertNotAborted(options.signal);
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

  async function increment(
    _key: string,
    _maxRequests: number,
    _windowMs: number,
    _nowMs: number,
    options: RateLimitStoreOptions = {},
  ): Promise<RateLimitDecision> {
    assertNotAborted(options.signal);
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
  const failPolicy =
    options.failPolicy ?? FAIL_POLICY_BY_RISK_CLASS[options.riskClass];

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
      if (failPolicy === "fail-open") {
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

export type RedisScriptClient = Readonly<{
  readonly eval: (
    script: string,
    keys: readonly string[],
    args: readonly (string | number)[],
  ) => Promise<unknown>;
}>;

export type BackendRequestLimiterOptions = Readonly<{
  readonly maxRequests: number;
  readonly windowMs: number;
}>;

export type BackendRequestLimiter = Readonly<{
  readonly check: (key: string, nowMs?: number) => Promise<RateLimitDecision>;
}>;

/**
 * AAA-CERT-003 §25: adaptador explícito de um `RateLimitStore` durável
 * (Redis/Valkey) para o formato `RequestRateLimiter` do servidor HTTP.
 * Não há fallback silencioso: o chamador injeta o store; sem store não há
 * limiter. O servidor usa o limitador em processo por padrão (documentado
 * em `createApiServer`); Redis exige injeção explícita deste adaptador.
 */
export function createBackendRequestLimiter(
  store: RateLimitStore,
  options: BackendRequestLimiterOptions,
): BackendRequestLimiter {
  if (!Number.isSafeInteger(options.maxRequests) || options.maxRequests < 1) {
    throw new RangeError("maxRequests must be a positive integer");
  }
  if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1) {
    throw new RangeError("windowMs must be a positive integer");
  }
  return Object.freeze({
    check: (key: string, nowMs = Date.now()) =>
      store.increment(key, options.maxRequests, options.windowMs, nowMs),
  });
}

export type RateLimitBackendDescriptor = Readonly<{
  readonly backend: "memory" | "redis" | "postgres-shared";
  readonly sharedBudget: boolean;
  readonly silentFallback: false;
}>;

/**
 * AAA-CERT-003 §25: declaração explícita do backend efetivo para evidência
 * de runtime. O valor nunca é inferido: cada caminho de wiring declara o
 * seu — fallback silencioso é proibido por construção (não existe ramo
 * `?? memory` aqui).
 */
export function describeRateLimitBackend(
  backend: RateLimitBackendDescriptor["backend"],
): RateLimitBackendDescriptor {
  if (
    backend !== "memory" &&
    backend !== "redis" &&
    backend !== "postgres-shared"
  ) {
    throw new RangeError(`unknown rate-limit backend: ${String(backend)}`);
  }
  return Object.freeze({
    backend,
    sharedBudget: backend !== "memory",
    silentFallback: false as const,
  });
}

export type RedisRateLimitStoreOptions = Readonly<{
  readonly timeoutMs?: number;
  readonly keyPrefix?: string;
}>;

const REDIS_FIXED_WINDOW_SCRIPT = [
  "local current = redis.call('INCR', KEYS[1])",
  "if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "return {current, ttl}",
].join("\n");

const DEFAULT_REDIS_TIMEOUT_MS = 500;
const DEFAULT_REDIS_KEY_PREFIX = "rl:v1";

function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  signal: AbortSignal | undefined,
): Promise<T> {
  assertNotAborted(signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new RateLimitStoreError("rate-limit backend timeout", "timeout"));
    }, timeoutMs);
    timer.unref?.();
  });
  const onAbort = (): void => {
    if (timer !== undefined) clearTimeout(timer);
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  return Promise.race([task, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  });
}

function parseRedisDecision(reply: unknown): { count: number; ttlMs: number } {
  if (
    !Array.isArray(reply) ||
    typeof reply[0] !== "number" ||
    typeof reply[1] !== "number" ||
    !Number.isSafeInteger(reply[0]) ||
    !Number.isFinite(reply[1])
  ) {
    throw new RateLimitStoreError(
      "rate-limit backend returned a malformed reply",
      "backend",
    );
  }
  return { count: reply[0], ttlMs: reply[1] };
}

export function createRedisRateLimitStore(
  client: RedisScriptClient,
  options: RedisRateLimitStoreOptions = {},
): RateLimitStore {
  const timeoutMs = options.timeoutMs ?? DEFAULT_REDIS_TIMEOUT_MS;
  const prefix = (options.keyPrefix ?? DEFAULT_REDIS_KEY_PREFIX).trim();
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("timeoutMs must be a positive integer");
  }
  if (prefix.length === 0) {
    throw new RangeError("keyPrefix must not be empty");
  }

  async function increment(
    key: string,
    maxRequests: number,
    windowMs: number,
    nowMs: number,
    storeOptions: RateLimitStoreOptions = {},
  ): Promise<RateLimitDecision> {
    assertNotAborted(storeOptions.signal);
    if (!Number.isSafeInteger(maxRequests) || maxRequests < 1) {
      throw new RangeError("maxRequests must be a positive integer");
    }
    if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
      throw new RangeError("windowMs must be a positive integer");
    }
    if (!Number.isFinite(nowMs) || nowMs < 0) {
      throw new RangeError("nowMs must be a non-negative number");
    }
    void nowMs;
    const effectiveTimeout = storeOptions.timeoutMs ?? timeoutMs;
    const reply = await withTimeout(
      client.eval(
        REDIS_FIXED_WINDOW_SCRIPT,
        [`${prefix}:${key}`],
        [maxRequests, windowMs],
      ),
      effectiveTimeout,
      storeOptions.signal,
    ).catch((error: unknown) => {
      if (error instanceof RateLimitStoreError) throw error;
      throw new RateLimitStoreError(
        "rate-limit backend unavailable",
        "backend",
      );
    });
    const { count, ttlMs } = parseRedisDecision(reply);
    if (count > maxRequests) {
      return Object.freeze({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1_000)),
      });
    }
    return Object.freeze({
      allowed: true,
      remaining: Math.max(0, maxRequests - count),
    });
  }

  async function reset(key: string): Promise<void> {
    await withTimeout(
      client.eval(
        "redis.call('DEL', KEYS[1]) return 1",
        [`${prefix}:${key}`],
        [],
      ),
      timeoutMs,
      undefined,
    );
  }

  return Object.freeze({ increment, reset });
}
