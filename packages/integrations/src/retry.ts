import {
  QdrantClientConfigError,
  QdrantClientResourceExhaustedError,
  QdrantClientTimeoutError,
  QdrantClientUnexpectedResponseError,
} from "@qdrant/js-client-rest";

export type QdrantInitializationFailureClassification =
  | "timeout"
  | "network"
  | "rate_limited"
  | "server"
  | "configuration"
  | "client"
  | "unknown";

export type QdrantInitializationFailure = Readonly<{
  readonly classification: QdrantInitializationFailureClassification;
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly retryAfterMilliseconds?: number;
}>;

export type QdrantInitializationRetryPolicy = Readonly<{
  readonly maxAttempts: number;
  readonly baseDelayMilliseconds: number;
  readonly maxDelayMilliseconds: number;
  readonly jitterRatio: number;
}>;

export const DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY = Object.freeze({
  maxAttempts: 5,
  baseDelayMilliseconds: 5_000,
  maxDelayMilliseconds: 60_000,
  jitterRatio: 0.2,
} satisfies QdrantInitializationRetryPolicy);

const NETWORK_ERROR_CODES = new Set([
  "EAI_AGAIN",
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function errorName(error: unknown): string | undefined {
  if (!isRecord(error) || typeof error.name !== "string") return undefined;
  return error.name;
}

function errorMessage(error: unknown): string | undefined {
  if (!isRecord(error) || typeof error.message !== "string") return undefined;
  return error.message;
}

function networkErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!isRecord(current)) return undefined;
    if (
      typeof current.code === "string" &&
      NETWORK_ERROR_CODES.has(current.code)
    ) {
      return current.code;
    }
    current = current.cause;
  }
  return undefined;
}

function responseStatusCode(error: unknown): number | undefined {
  if (isRecord(error)) {
    for (const key of ["status", "statusCode"]) {
      const value = error[key];
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 100 &&
        value <= 599
      ) {
        return value;
      }
    }
  }

  const message = errorMessage(error);
  const match =
    message === undefined
      ? undefined
      : /^Unexpected Response:\s*(\d{3})\b/u.exec(message);
  if (match === undefined || match === null) return undefined;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function classifyHttpStatus(statusCode: number): QdrantInitializationFailure {
  if (statusCode === 429) {
    return Object.freeze({
      classification: "rate_limited",
      retryable: true,
      statusCode,
    });
  }
  if (statusCode === 408 || statusCode === 425) {
    return Object.freeze({
      classification: "timeout",
      retryable: true,
      statusCode,
    });
  }
  if (statusCode >= 500 && statusCode <= 599) {
    return Object.freeze({
      classification: "server",
      retryable: true,
      statusCode,
    });
  }
  if (statusCode >= 400 && statusCode <= 499) {
    return Object.freeze({
      classification: "client",
      retryable: false,
      statusCode,
    });
  }
  return Object.freeze({ classification: "unknown", retryable: false });
}

function retryAfterMilliseconds(error: unknown): number | undefined {
  if (!isRecord(error) || typeof error.retry_after !== "number") {
    return undefined;
  }
  if (!Number.isFinite(error.retry_after) || error.retry_after < 0) {
    return undefined;
  }
  return Math.round(error.retry_after * 1_000);
}

export function classifyQdrantInitializationError(
  error: unknown,
): QdrantInitializationFailure {
  const name = errorName(error);
  if (
    error instanceof QdrantClientTimeoutError ||
    name === "QdrantClientTimeoutError"
  ) {
    return Object.freeze({ classification: "timeout", retryable: true });
  }

  if (
    error instanceof QdrantClientResourceExhaustedError ||
    name === "QdrantClientResourceExhaustedError"
  ) {
    const retryAfter = retryAfterMilliseconds(error);
    return Object.freeze({
      classification: "rate_limited",
      retryable: true,
      statusCode: 429,
      ...(retryAfter === undefined
        ? {}
        : { retryAfterMilliseconds: retryAfter }),
    });
  }

  if (
    error instanceof QdrantClientConfigError ||
    name === "QdrantClientConfigError" ||
    error instanceof RangeError
  ) {
    return Object.freeze({ classification: "configuration", retryable: false });
  }

  const statusCode = responseStatusCode(error);
  if (
    error instanceof QdrantClientUnexpectedResponseError ||
    name === "QdrantClientUnexpectedResponseError" ||
    statusCode !== undefined
  ) {
    return classifyHttpStatus(statusCode ?? 0);
  }

  if (networkErrorCode(error) !== undefined) {
    return Object.freeze({ classification: "network", retryable: true });
  }

  return Object.freeze({ classification: "unknown", retryable: false });
}

function validateRetryPolicy(policy: QdrantInitializationRetryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new RangeError("retry maxAttempts must be a positive integer");
  }
  if (
    !Number.isFinite(policy.baseDelayMilliseconds) ||
    policy.baseDelayMilliseconds < 0
  ) {
    throw new RangeError("retry base delay must be non-negative");
  }
  if (
    !Number.isFinite(policy.maxDelayMilliseconds) ||
    policy.maxDelayMilliseconds < policy.baseDelayMilliseconds
  ) {
    throw new RangeError("retry max delay must cap the base delay");
  }
  if (
    !Number.isFinite(policy.jitterRatio) ||
    policy.jitterRatio < 0 ||
    policy.jitterRatio > 1
  ) {
    throw new RangeError("retry jitter ratio must be between zero and one");
  }
}

function safeRandom(random: () => number): number {
  const value = random();
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.5;
}

export function calculateQdrantInitializationRetryDelay(
  policy: QdrantInitializationRetryPolicy,
  failedAttempt: number,
  random: () => number = Math.random,
  retryAfterMillisecondsValue?: number,
): number {
  validateRetryPolicy(policy);
  if (!Number.isInteger(failedAttempt) || failedAttempt < 1) {
    throw new RangeError("retry attempt must be a positive integer");
  }

  const exponent = Math.min(failedAttempt - 1, 30);
  const exponentialDelay = Math.min(
    policy.maxDelayMilliseconds,
    policy.baseDelayMilliseconds * 2 ** exponent,
  );
  const jitter =
    exponentialDelay * policy.jitterRatio * (safeRandom(random) * 2 - 1);
  const backoffDelay = Math.max(0, Math.round(exponentialDelay + jitter));
  const retryAfter =
    retryAfterMillisecondsValue !== undefined &&
    Number.isFinite(retryAfterMillisecondsValue) &&
    retryAfterMillisecondsValue >= 0
      ? Math.round(retryAfterMillisecondsValue)
      : 0;
  return Math.min(
    policy.maxDelayMilliseconds,
    Math.max(backoffDelay, retryAfter),
  );
}
