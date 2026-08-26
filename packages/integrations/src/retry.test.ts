import {
  QdrantClientConfigError,
  QdrantClientResourceExhaustedError,
  QdrantClientTimeoutError,
  QdrantClientUnexpectedResponseError,
} from "@qdrant/js-client-rest";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY,
  calculateQdrantInitializationRetryDelay,
  classifyQdrantInitializationError,
} from "./retry.js";

function transportError(code: string): Error {
  const error = new TypeError("fetch failed");
  Object.defineProperty(error, "cause", {
    configurable: true,
    value: { code },
  });
  return error;
}

describe("Qdrant initialization retry policy", () => {
  it("classifies known transient and permanent failures fail-closed", () => {
    expect(
      classifyQdrantInitializationError(
        new QdrantClientTimeoutError("request timed out"),
      ),
    ).toEqual({ classification: "timeout", retryable: true });
    expect(
      classifyQdrantInitializationError(transportError("ECONNREFUSED")),
    ).toEqual({ classification: "network", retryable: true });
    expect(
      classifyQdrantInitializationError(
        new QdrantClientUnexpectedResponseError(
          "Unexpected Response: 503 (Service Unavailable)",
        ),
      ),
    ).toEqual({
      classification: "server",
      retryable: true,
      statusCode: 503,
    });
    expect(
      classifyQdrantInitializationError(
        new QdrantClientResourceExhaustedError("busy", "2"),
      ),
    ).toEqual({
      classification: "rate_limited",
      retryable: true,
      retryAfterMilliseconds: 2_000,
      statusCode: 429,
    });
    expect(
      classifyQdrantInitializationError(
        new QdrantClientUnexpectedResponseError(
          "Unexpected Response: 401 (Unauthorized)",
        ),
      ),
    ).toEqual({ classification: "client", retryable: false, statusCode: 401 });
    expect(
      classifyQdrantInitializationError(
        new QdrantClientConfigError("invalid Qdrant configuration"),
      ),
    ).toEqual({ classification: "configuration", retryable: false });
    expect(
      classifyQdrantInitializationError(new RangeError("bad schema")),
    ).toEqual({ classification: "configuration", retryable: false });
    expect(
      classifyQdrantInitializationError(new Error("unrecognized failure")),
    ).toEqual({ classification: "unknown", retryable: false });
  });

  it("recognizes the bounded transient HTTP statuses and rejects ambiguous ones", () => {
    for (const statusCode of [408, 425, 500, 502, 504]) {
      expect(
        classifyQdrantInitializationError(
          new QdrantClientUnexpectedResponseError(
            `Unexpected Response: ${statusCode} (synthetic)`,
          ),
        ),
      ).toMatchObject({
        classification: statusCode >= 500 ? "server" : "timeout",
        retryable: true,
        statusCode,
      });
    }

    for (const statusCode of [400, 403, 404, 409, 422]) {
      expect(
        classifyQdrantInitializationError(
          new QdrantClientUnexpectedResponseError(
            `Unexpected Response: ${statusCode} (synthetic)`,
          ),
        ),
      ).toMatchObject({
        classification: "client",
        retryable: false,
        statusCode,
      });
    }
  });

  it("uses capped exponential backoff with deterministic jitter and bounded Retry-After", () => {
    const policy = DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY;

    expect(calculateQdrantInitializationRetryDelay(policy, 1, () => 0.5)).toBe(
      5_000,
    );
    expect(calculateQdrantInitializationRetryDelay(policy, 2, () => 0.5)).toBe(
      10_000,
    );
    expect(calculateQdrantInitializationRetryDelay(policy, 5, () => 0.5)).toBe(
      60_000,
    );
    expect(calculateQdrantInitializationRetryDelay(policy, 6, () => 0.5)).toBe(
      60_000,
    );
    expect(calculateQdrantInitializationRetryDelay(policy, 1, () => 0)).toBe(
      4_000,
    );
    expect(calculateQdrantInitializationRetryDelay(policy, 1, () => 1)).toBe(
      6_000,
    );
    expect(
      calculateQdrantInitializationRetryDelay(policy, 1, () => 0.5, 120_000),
    ).toBe(60_000);
    expect(
      calculateQdrantInitializationRetryDelay(policy, 1, () => 0.5, 8_000),
    ).toBe(8_000);
  });
});
