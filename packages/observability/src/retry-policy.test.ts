import { describe, expect, it } from "vitest";

import {
  NON_RETRYABLE_CODES,
  executeWithRetry,
  retryDelayMs,
  type RetryPolicy,
} from "./retry-policy.js";

const POLICY: RetryPolicy = {
  maxAttempts: 4,
  baseDelayMs: 100,
  maxDelayMs: 1_000,
  jitterRatio: 0.5,
};

describe("retry policy", () => {
  it("computes bounded exponential backoff with jitter", () => {
    expect(retryDelayMs(POLICY, 1, () => 0)).toBe(100);
    expect(retryDelayMs(POLICY, 2, () => 0)).toBe(200);
    expect(retryDelayMs(POLICY, 3, () => 0)).toBe(400);
    expect(retryDelayMs(POLICY, 10, () => 0)).toBe(1_000);
    const jittered = retryDelayMs(POLICY, 2, () => 1);
    expect(jittered).toBeGreaterThanOrEqual(200);
    expect(jittered).toBeLessThanOrEqual(300);
  });

  it("rejects invalid policies fail-closed", () => {
    expect(() =>
      retryDelayMs({ ...POLICY, maxAttempts: 0 }, 1, () => 0),
    ).toThrow("maxAttempts");
    expect(() =>
      retryDelayMs({ ...POLICY, baseDelayMs: 0 }, 1, () => 0),
    ).toThrow("baseDelayMs");
    expect(() =>
      retryDelayMs({ ...POLICY, maxDelayMs: 50 }, 1, () => 0),
    ).toThrow("maxDelayMs");
    expect(() =>
      retryDelayMs({ ...POLICY, jitterRatio: 2 }, 1, () => 0),
    ).toThrow("jitterRatio");
  });

  it("retries transient failures and returns the first success", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const result = await executeWithRetry(
      async () => {
        calls += 1;
        if (calls < 3)
          throw Object.assign(new Error("boom"), { code: "ETIMEDOUT" });
        return "ok";
      },
      POLICY,
      { sleepMs: async (ms) => void sleeps.push(ms), random: () => 0 },
    );
    expect(result).toMatchObject({ ok: true, value: "ok", attempts: 3 });
    expect(sleeps).toEqual([100, 200]);
  });

  it("never retries validation, auth, forbidden, conflict or malformed output", async () => {
    for (const code of NON_RETRYABLE_CODES) {
      const sleeps: number[] = [];
      let calls = 0;
      const result = await executeWithRetry(
        async () => {
          calls += 1;
          throw Object.assign(new Error(code), { code });
        },
        POLICY,
        { sleepMs: async (ms) => void sleeps.push(ms), random: () => 0 },
      );
      expect(calls).toBe(1);
      expect(sleeps).toEqual([]);
      expect(result).toMatchObject({ ok: false, attempts: 1 });
    }
  });

  it("stops after maxAttempts and reports the last error", async () => {
    const sleeps: number[] = [];
    const result = await executeWithRetry(
      async () => {
        throw Object.assign(new Error("down"), { code: "ECONNREFUSED" });
      },
      { ...POLICY, maxAttempts: 2 },
      { sleepMs: async (ms) => void sleeps.push(ms), random: () => 0 },
    );
    expect(result).toMatchObject({ ok: false, attempts: 2 });
    expect(sleeps).toEqual([100]);
    if (!result.ok) {
      expect(String(result.error)).toContain("down");
    }
  });
});
