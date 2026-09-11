import { describe, expect, it } from "vitest";

import {
  calculateQdrantInitializationRetryDelay,
  classifyQdrantInitializationError,
  DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY,
} from "./retry.js";

/**
 * AAA-FINAL-003 — Coverage margin hardening (Qdrant degradation paths).
 *
 * Cada teste responde: risco = classificar errado um outage Qdrant
 * (retry infinito, desistência precoce, espera negativa); branch real =
 * extração/validação alternativa; comportamento = classificação e delay.
 */
describe("retry branch closure — failure classification", () => {
  it("treats non-object failures as unknown without crashing", () => {
    for (const error of [null, undefined, 42, "boom", true]) {
      expect(classifyQdrantInitializationError(error)).toEqual({
        classification: "unknown",
        retryable: false,
      });
    }
  });

  it("ignores non-string names and messages", () => {
    expect(
      classifyQdrantInitializationError({ name: 42, message: 42 }),
    ).toEqual({ classification: "unknown", retryable: false });
  });

  it("reads numeric status and statusCode keys within range", () => {
    expect(classifyQdrantInitializationError({ status: 503 })).toMatchObject({
      classification: "server",
      retryable: true,
      statusCode: 503,
    });
    expect(
      classifyQdrantInitializationError({ statusCode: 429 }),
    ).toMatchObject({
      classification: "rate_limited",
      retryable: true,
    });
  });

  it("rejects out-of-range, fractional and string statuses", () => {
    for (const error of [
      { status: 99 },
      { status: 600 },
      { status: 503.5 },
      { status: "503" },
      { statusCode: Number.NaN },
    ]) {
      expect(classifyQdrantInitializationError(error)).toEqual({
        classification: "unknown",
        retryable: false,
      });
    }
  });

  it("parses the unexpected-response message shape without SDK classes", () => {
    expect(
      classifyQdrantInitializationError({
        message: "Unexpected Response: 429 (busy)",
      }),
    ).toMatchObject({ classification: "rate_limited", retryable: true });
    expect(
      classifyQdrantInitializationError({ message: "nothing useful here" }),
    ).toEqual({ classification: "unknown", retryable: false });
    expect(classifyQdrantInitializationError({ message: 42 })).toEqual({
      classification: "unknown",
      retryable: false,
    });
  });

  it("classifies unknown HTTP ranges without retrying", () => {
    expect(classifyQdrantInitializationError({ status: 302 })).toEqual({
      classification: "unknown",
      retryable: false,
    });
  });

  it("drops invalid retry_after hints instead of waiting on them", () => {
    for (const retry_after of ["2", -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        classifyQdrantInitializationError({
          name: "QdrantClientResourceExhaustedError",
          retry_after,
        }),
      ).toEqual({
        classification: "rate_limited",
        retryable: true,
        statusCode: 429,
      });
    }
  });

  it("follows bounded cause chains for network codes", () => {
    const deep = { cause: { cause: { cause: { code: "ECONNRESET" } } } };
    expect(classifyQdrantInitializationError(deep)).toEqual({
      classification: "network",
      retryable: true,
    });
    const tooDeep = {
      cause: { cause: { cause: { cause: { code: "ECONNRESET" } } } },
    };
    expect(classifyQdrantInitializationError(tooDeep)).toEqual({
      classification: "unknown",
      retryable: false,
    });
    expect(classifyQdrantInitializationError({ cause: 42 })).toEqual({
      classification: "unknown",
      retryable: false,
    });
  });
});

describe("retry branch closure — delay computation guards", () => {
  const policy = DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY;

  it("rejects invalid policies and attempts fail-fast", () => {
    expect(() =>
      calculateQdrantInitializationRetryDelay({ ...policy, maxAttempts: 0 }, 1),
    ).toThrow(RangeError);
    expect(() =>
      calculateQdrantInitializationRetryDelay(
        { ...policy, baseDelayMilliseconds: -1 },
        1,
      ),
    ).toThrow(RangeError);
    expect(() =>
      calculateQdrantInitializationRetryDelay(
        { ...policy, maxDelayMilliseconds: 1 },
        1,
      ),
    ).toThrow(RangeError);
    expect(() =>
      calculateQdrantInitializationRetryDelay({ ...policy, jitterRatio: 2 }, 1),
    ).toThrow(RangeError);
    expect(() => calculateQdrantInitializationRetryDelay(policy, 0)).toThrow(
      RangeError,
    );
  });

  it("clamps hostile random sources to the neutral midpoint", () => {
    const expected = calculateQdrantInitializationRetryDelay(
      policy,
      1,
      () => 0.5,
    );
    for (const random of [() => 2, () => Number.NaN, () => -1]) {
      expect(calculateQdrantInitializationRetryDelay(policy, 1, random)).toBe(
        expected,
      );
    }
  });

  it("ignores invalid retry-after hints", () => {
    const expected = calculateQdrantInitializationRetryDelay(
      policy,
      1,
      () => 0.5,
    );
    for (const hint of [Number.NaN, -5, Number.POSITIVE_INFINITY]) {
      expect(
        calculateQdrantInitializationRetryDelay(policy, 1, () => 0.5, hint),
      ).toBe(expected);
    }
  });
});
