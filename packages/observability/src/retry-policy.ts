export type RetryPolicy = Readonly<{
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitterRatio: number;
}>;

export type RetryDependencies = Readonly<{
  readonly sleepMs?: (ms: number) => Promise<void>;
  readonly random?: () => number;
  readonly isRetryable?: (error: unknown) => boolean;
}>;

export type RetryResult<T> =
  | Readonly<{
      readonly ok: true;
      readonly value: T;
      readonly attempts: number;
    }>
  | Readonly<{
      readonly ok: false;
      readonly error: unknown;
      readonly attempts: number;
    }>;

export const NON_RETRYABLE_CODES: ReadonlySet<string> = Object.freeze(
  new Set([
    "VALIDATION",
    "VALIDATION_ERROR",
    "UNAUTHENTICATED",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "CONFLICT",
    "STATE_CONFLICT",
    "IDEMPOTENCY_CONFLICT",
    "MALFORMED_PROVIDER_OUTPUT",
    "NOT_FOUND",
  ]),
);

function assertPolicy(policy: RetryPolicy): void {
  if (!Number.isSafeInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer");
  }
  if (!Number.isSafeInteger(policy.baseDelayMs) || policy.baseDelayMs < 1) {
    throw new RangeError("baseDelayMs must be a positive integer");
  }
  if (!Number.isSafeInteger(policy.maxDelayMs) || policy.maxDelayMs < 1) {
    throw new RangeError("maxDelayMs must be a positive integer");
  }
  if (policy.maxDelayMs < policy.baseDelayMs) {
    throw new RangeError("maxDelayMs must cover baseDelayMs");
  }
  if (
    typeof policy.jitterRatio !== "number" ||
    !(policy.jitterRatio >= 0 && policy.jitterRatio <= 1)
  ) {
    throw new RangeError("jitterRatio must be between 0 and 1");
  }
}

export function retryDelayMs(
  policy: RetryPolicy,
  attempt: number,
  random: () => number = Math.random,
): number {
  assertPolicy(policy);
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new RangeError("attempt must be a positive integer");
  }
  const exponential = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * 2 ** (attempt - 1),
  );
  return Math.min(
    policy.maxDelayMs,
    Math.floor(exponential * (1 + policy.jitterRatio * random())),
  );
}

function defaultIsRetryable(error: unknown): boolean {
  if (error !== null && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && NON_RETRYABLE_CODES.has(code)) return false;
  }
  return true;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  dependencies: RetryDependencies = {},
): Promise<RetryResult<T>> {
  assertPolicy(policy);
  const sleepMs = dependencies.sleepMs ?? defaultSleep;
  const random = dependencies.random ?? Math.random;
  const isRetryable = dependencies.isRetryable ?? defaultIsRetryable;
  let attempt = 0;
  let lastError: unknown;
  while (attempt < policy.maxAttempts) {
    attempt += 1;
    try {
      const value = await operation();
      return Object.freeze({ ok: true as const, value, attempts: attempt });
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt >= policy.maxAttempts) {
        return Object.freeze({ ok: false as const, error, attempts: attempt });
      }
      await sleepMs(retryDelayMs(policy, attempt, random));
    }
  }
  return Object.freeze({
    ok: false as const,
    error: lastError,
    attempts: attempt,
  });
}
