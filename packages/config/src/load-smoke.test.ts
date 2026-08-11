import { describe, expect, it } from "vitest";

import { loadLoadSmokeConfig, parsePositiveInteger } from "./load-smoke.js";

describe("loadLoadSmokeConfig", () => {
  it("uses a numeric default timeout that runs without environment overrides", () => {
    expect(loadLoadSmokeConfig({})).toMatchObject({
      target: "http://127.0.0.1:3000/health/live",
      requestCount: 200,
      concurrency: 10,
      timeoutMs: 5000,
    });
  });

  it("accepts bounded integer overrides", () => {
    expect(
      loadLoadSmokeConfig({
        CVG_LOAD_TARGET: "http://127.0.0.1:3180/health/live",
        CVG_LOAD_REQUESTS: "100",
        CVG_LOAD_CONCURRENCY: "20",
        CVG_LOAD_TIMEOUT_MS: "7500",
      }),
    ).toMatchObject({
      requestCount: 100,
      concurrency: 20,
      timeoutMs: 7500,
    });
  });

  it("rejects formatted or unsafe integer values", () => {
    expect(parsePositiveInteger(5, "CVG_LOAD_TIMEOUT_MS", 60_000)).toBe(5);
    expect(() =>
      parsePositiveInteger("5_000", "CVG_LOAD_TIMEOUT_MS", 60_000),
    ).toThrow("CVG_LOAD_TIMEOUT_MS");
    expect(() =>
      parsePositiveInteger("0", "CVG_LOAD_TIMEOUT_MS", 60_000),
    ).toThrow("CVG_LOAD_TIMEOUT_MS");
  });

  it("rejects a non-absolute target", () => {
    expect(() =>
      loadLoadSmokeConfig({ CVG_LOAD_TARGET: "/health/live" }),
    ).toThrow("CVG_LOAD_TARGET");
  });
});
