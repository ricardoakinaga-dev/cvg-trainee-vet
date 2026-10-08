import { describe, expect, it } from "vitest";
import {
  SMOKE_CHECKS,
  evaluateSmoke,
  parseSmokeArgs,
  runSmoke,
} from "../../scripts/deploy-smoke.mjs";

function fakeFetch(statusByPath: Record<string, number | "abort">) {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    const status = statusByPath[path];
    if (status === "abort") {
      await new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
      });
    }
    return new Response("{}", { status: status as number });
  }) as typeof fetch;
}

describe("deploy smoke (0802 step 5)", () => {
  it("parses the base url and timeout, rejecting unknown or invalid input", () => {
    expect(parseSmokeArgs(["--base-url", "https://h.invalid/"])).toEqual({
      baseUrl: "https://h.invalid",
      timeoutMs: 5000,
    });
    expect(
      parseSmokeArgs(["--base-url=http://127.0.0.1:3000", "--timeout-ms=250"]),
    ).toEqual({ baseUrl: "http://127.0.0.1:3000", timeoutMs: 250 });
    expect(() => parseSmokeArgs([])).toThrow("--base-url is required");
    expect(() => parseSmokeArgs(["--base-url", "ftp://x"])).toThrow("http(s)");
    expect(() => parseSmokeArgs(["--base-url", "http://x", "--nope"])).toThrow(
      "unknown argument",
    );
    expect(() =>
      parseSmokeArgs(["--base-url", "http://x", "--timeout-ms", "0"]),
    ).toThrow("positive integer");
  });

  it("checks live, ready and dependencies in order and passes when all accept", async () => {
    const outcome = await runSmoke(
      { baseUrl: "http://api.invalid", timeoutMs: 1000 },
      fakeFetch({
        "/health/live": 200,
        "/health/ready": 200,
        "/health/dependencies": 200,
      }),
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.results.map((r) => r.name)).toEqual(
      SMOKE_CHECKS.map((c) => c.name),
    );
  });

  it("fails closed on NOT_READY, server errors, redirects and timeouts", async () => {
    const notReady = await runSmoke(
      { baseUrl: "http://api.invalid", timeoutMs: 1000 },
      fakeFetch({
        "/health/live": 200,
        "/health/ready": 503,
        "/health/dependencies": 503,
      }),
    );
    expect(notReady.ok).toBe(false);
    expect(notReady.failed).toEqual(["ready", "dependencies"]);

    const redirected = await runSmoke(
      { baseUrl: "http://api.invalid", timeoutMs: 1000 },
      fakeFetch({
        "/health/live": 302,
        "/health/ready": 200,
        "/health/dependencies": 200,
      }),
    );
    expect(redirected.failed).toEqual(["live"]);

    const timedOut = await runSmoke(
      { baseUrl: "http://api.invalid", timeoutMs: 20 },
      fakeFetch({
        "/health/live": "abort",
        "/health/ready": 200,
        "/health/dependencies": 200,
      }),
    );
    expect(timedOut.ok).toBe(false);
    expect(timedOut.results[0]).toMatchObject({
      name: "live",
      status: null,
      error: "AbortError",
    });
  });

  it("evaluates results without mutating them", () => {
    const results = Object.freeze([
      Object.freeze({ name: "live", ok: true }),
      Object.freeze({ name: "ready", ok: false }),
    ]);
    expect(evaluateSmoke(results)).toEqual({ ok: false, failed: ["ready"] });
  });
});
