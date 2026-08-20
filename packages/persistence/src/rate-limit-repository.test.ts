import { describe, expect, it } from "vitest";

import {
  createPostgresRateLimiter,
  normalizeSharedRateLimitOptions,
} from "./rate-limit-repository.js";
import type * as schema from "./schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type RateLimitRow = Readonly<{
  readonly count: number;
  readonly expiresAt: Date | string;
}>;

function fakeDatabase(rows: readonly RateLimitRow[]) {
  return {
    transaction: async (
      callback: (
        transaction: Readonly<{
          readonly execute: () => Promise<readonly unknown[]>;
        }>,
      ) => Promise<unknown>,
    ) => {
      let execution = 0;
      const transaction = {
        execute: async () => {
          execution += 1;
          return execution === 1 ? [] : rows;
        },
      };
      return callback(transaction);
    },
  } as unknown as PostgresJsDatabase<typeof schema>;
}

describe("shared rate-limit repository", () => {
  it("normalizes bounded window settings", () => {
    expect(
      normalizeSharedRateLimitOptions({ maxRequests: 3, windowMs: 2_000 }),
    ).toEqual({ maxRequests: 3, windowMs: 2_000 });
  });

  it("rejects unsafe limits", () => {
    expect(() => normalizeSharedRateLimitOptions({ maxRequests: 0 })).toThrow(
      "maxRequests",
    );
    expect(() => normalizeSharedRateLimitOptions({ windowMs: 0 })).toThrow(
      "windowMs",
    );
    expect(() => normalizeSharedRateLimitOptions({ maxRequests: 1.5 })).toThrow(
      "maxRequests",
    );
    expect(() =>
      normalizeSharedRateLimitOptions({ windowMs: Number.NaN }),
    ).toThrow("windowMs");
  });

  it("returns an allowed decision and normalizes an empty key", async () => {
    const limiter = createPostgresRateLimiter(
      fakeDatabase([{ count: 1, expiresAt: "2026-08-10T05:00:10.000Z" }]),
      { maxRequests: 2, windowMs: 10_000 },
    );

    await expect(limiter.check("   ", 1_000)).resolves.toEqual({
      allowed: true,
      remaining: 1,
    });
  });

  it("returns retry information when the bucket is exhausted", async () => {
    const limiter = createPostgresRateLimiter(
      fakeDatabase([{ count: 3, expiresAt: new Date(2_000) }]),
      { maxRequests: 2, windowMs: 1_000 },
    );

    await expect(limiter.check("synthetic", 1_000)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 1,
    });
  });

  it("fails closed when the bucket write has no returned row", async () => {
    const limiter = createPostgresRateLimiter(fakeDatabase([]), {
      maxRequests: 2,
      windowMs: 1_000,
    });

    await expect(limiter.check("synthetic", 1_000)).rejects.toThrow(
      "rate-limit bucket was not persisted",
    );
  });

  it("fails closed when an exhausted bucket has an invalid expiry", async () => {
    const limiter = createPostgresRateLimiter(
      fakeDatabase([{ count: 3, expiresAt: "invalid" }]),
      { maxRequests: 2, windowMs: 1_000 },
    );

    await expect(limiter.check("synthetic", 1_000)).rejects.toThrow(
      "rate-limit bucket expiry is invalid",
    );
  });

  it("rejects invalid clock values before opening a transaction", async () => {
    const limiter = createPostgresRateLimiter(fakeDatabase([]));

    await expect(limiter.check("synthetic", -1)).rejects.toThrow("nowMs");
    await expect(limiter.check("synthetic", Number.NaN)).rejects.toThrow(
      "nowMs",
    );
  });
});
