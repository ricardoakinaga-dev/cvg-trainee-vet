import { describe, expect, it, vi } from "vitest";

import {
  buildRateLimitKey,
  createBackendRequestLimiter,
  createMemoryRateLimitStore,
  createRateLimitGuard,
  createRedisRateLimitStore,
  describeRateLimitBackend,
  RateLimitStoreError,
} from "./rate-limit-store.js";

/**
 * AAA-FINAL-002 — Mutation Assurance Closure (rate-limit policy).
 *
 * Killer tests comportamentais: matriz de validação, normalização de
 * chaves, expiração de janela, replay de script, failover de backend,
 * timeout por chamada, chaves Redis, códigos de erro e retry-after.
 * Riscos: bypass por chave malformada, budgets vazando entre chaves,
 * fail-open silencioso, retry-after zero.
 */

describe("rate-limit mutation closure — validation matrix", () => {
  it("rejects non-positive budgets, windows and clocks", () => {
    const memory = createMemoryRateLimitStore();
    expect(() =>
      createBackendRequestLimiter(memory, { maxRequests: 0, windowMs: 1000 }),
    ).toThrow(RangeError);
    expect(() =>
      createBackendRequestLimiter(memory, { maxRequests: 2.5, windowMs: 1000 }),
    ).toThrow(RangeError);
    expect(() =>
      createBackendRequestLimiter(memory, { maxRequests: 10, windowMs: -1 }),
    ).toThrow(RangeError);
    expect(() => describeRateLimitBackend("auto" as never)).toThrow(RangeError);
  });

  it("accepts boundary value one for budgets, windows and timeouts", async () => {
    const memory = createMemoryRateLimitStore();
    const limiter = createBackendRequestLimiter(memory, {
      maxRequests: 1,
      windowMs: 1,
    });
    await expect(limiter.check("one", 0)).resolves.toMatchObject({
      allowed: true,
    });
    const client = { eval: async () => [1, 1] };
    const store = createRedisRateLimitStore(client, { timeoutMs: 1 });
    await expect(store.increment("k", 1, 1, 0)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("rejects invalid redis store options", () => {
    const client = { eval: async () => [1, 1000] };
    expect(() => createRedisRateLimitStore(client, { timeoutMs: 0 })).toThrow(
      RangeError,
    );
    expect(() =>
      createRedisRateLimitStore(client, { keyPrefix: "  " }),
    ).toThrow(RangeError);
  });

  it("rejects overlong routes instead of truncating silently", () => {
    expect(() =>
      buildRateLimitKey({
        route: `/${"r".repeat(300)}`,
        riskClass: "mutation",
      }),
    ).toThrow(RangeError);
    expect(() =>
      buildRateLimitKey({ route: "   ", riskClass: "mutation" }),
    ).toThrow(RangeError);
  });
});

describe("rate-limit mutation closure — key normalization", () => {
  it("falls back blank parts and formats keys stably", () => {
    const key = buildRateLimitKey({
      principalId: "participant-1",
      clientIp: "10.0.0.8",
      route: "/api/v1/attempts/:attemptId/submit",
      riskClass: "mutation",
    });
    expect(key).toContain("risk:mutation|");
    expect(key).toContain("route:/api/v1/attempts/:attemptId/submit|");
    expect(key.split("|")).toHaveLength(4);
    const blank = buildRateLimitKey({
      principalId: "   ",
      route: "/health/live",
      riskClass: "public-low-risk",
    });
    expect(blank).toContain("principal:anonymous");
    expect(blank).toContain("client:unknown");
  });

  it("truncates oversized parts and trims routes", () => {
    const long = buildRateLimitKey({
      principalId: "p",
      clientIp: "10.0.0.9",
      route: "/ok",
      riskClass: "mutation",
    });
    expect(long.length).toBeLessThanOrEqual(4 * 256 + 64);
    const spaced = buildRateLimitKey({
      route: "  /health/live  ",
      riskClass: "public-low-risk",
    });
    expect(spaced).toContain("route:/health/live|");
    const exact = `/${"s".repeat(255)}`;
    expect(exact).toHaveLength(256);
    expect(
      buildRateLimitKey({ route: exact, riskClass: "mutation" }),
    ).toContain(`route:${exact}|`);
  });

  it("falls back blank and whitespace risk classes", () => {
    expect(
      buildRateLimitKey({ route: "/health/live", riskClass: "   " as never }),
    ).toContain("risk:unknown|");
  });

  it("falls back blank risk classes without collapsing valid ones", () => {
    expect(
      buildRateLimitKey({ route: "/health/live", riskClass: "" as never }),
    ).toContain("risk:unknown|");
    expect(
      buildRateLimitKey({ route: "/health/live", riskClass: "mutation" }),
    ).toContain("risk:mutation|");
  });

  it("treats a missing principal as anonymous", () => {
    const key = buildRateLimitKey({
      route: "/health/live",
      riskClass: "public-low-risk",
    });
    expect(key).toContain("principal:anonymous");
  });

  it("maps unparseable IPs to unknown instead of crashing", () => {
    const key = buildRateLimitKey({
      clientIp: "not-an-ip!!!",
      route: "/health/live",
      riskClass: "public-low-risk",
    });
    expect(key).toContain("client:unknown");
  });
});

describe("rate-limit mutation closure — direct store guards", () => {
  it("rejects invalid budgets at the memory increment", async () => {
    const store = createMemoryRateLimitStore();
    await expect(store.increment("k", 0, 1000, 0)).rejects.toThrow(RangeError);
    await expect(store.increment("k", 1.5, 1000, 0)).rejects.toThrow(
      RangeError,
    );
    await expect(store.increment("k", 10, 0, 0)).rejects.toThrow(RangeError);
    await expect(store.increment("k", 10, 1000, Number.NaN)).rejects.toThrow(
      RangeError,
    );
    await expect(store.increment("k", 10, 1000, -1)).rejects.toThrow(
      RangeError,
    );
  });

  it("rejects invalid budgets at the redis increment", async () => {
    const store = createRedisRateLimitStore({ eval: async () => [1, 1000] });
    await expect(store.increment("k", 0, 1000, 0)).rejects.toThrow(RangeError);
    await expect(store.increment("k", 10, 0, 0)).rejects.toThrow(RangeError);
    await expect(store.increment("k", 10, 1000, Number.NaN)).rejects.toThrow(
      RangeError,
    );
  });
});

describe("rate-limit mutation closure — window lifecycle", () => {
  it("prunes expired windows and re-allows traffic", async () => {
    const limiter = createBackendRequestLimiter(createMemoryRateLimitStore(), {
      maxRequests: 1,
      windowMs: 1000,
    });
    await expect(limiter.check("sweep", 0)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(limiter.check("sweep", 500)).resolves.toMatchObject({
      allowed: false,
    });
    await expect(limiter.check("sweep", 1000)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("computes remaining as max minus count", async () => {
    const limiter = createBackendRequestLimiter(createMemoryRateLimitStore(), {
      maxRequests: 3,
      windowMs: 60_000,
    });
    await expect(limiter.check("count", 0)).resolves.toMatchObject({
      remaining: 2,
    });
    await expect(limiter.check("count", 0)).resolves.toMatchObject({
      remaining: 1,
    });
  });
});

describe("rate-limit mutation closure — scripted store contract", () => {
  it("replays scripted decisions in order then falls back", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const store = createScriptedRateLimitStore({
      script: [
        { allowed: true, remaining: 5 },
        { allowed: false, remaining: 0, retryAfterSeconds: 7 },
      ],
    });
    await expect(store.increment("k", 10, 1000, 0)).resolves.toMatchObject({
      remaining: 5,
    });
    await expect(store.increment("k", 10, 1000, 0)).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 7,
    });
    await expect(store.increment("k", 10, 1000, 0)).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("fails exactly the scripted times then recovers", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const store = createScriptedRateLimitStore({ failures: 1 });
    await expect(store.increment("k", 10, 1000, 0)).rejects.toThrow();
    await expect(store.increment("k", 10, 1000, 0)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("resolves reset without side effects", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    await expect(
      createScriptedRateLimitStore({}).reset("k"),
    ).resolves.toBeUndefined();
  });
});

describe("rate-limit mutation closure — redis store contract", () => {
  function capturingClient(reply: unknown) {
    const calls: Array<{ script: string; keys: unknown; args: unknown }> = [];
    return {
      calls,
      eval: async (script: string, keys: unknown, args: unknown) => {
        calls.push({ script, keys, args });
        return reply;
      },
    };
  }

  it("addresses namespaced keys with budget arguments", async () => {
    const client = capturingClient([3, 60_000]);
    const store = createRedisRateLimitStore(client, { keyPrefix: "t" });
    await store.increment("budget-key", 10, 30_000, Date.now());
    expect(client.calls[0]?.keys).toEqual(["t:budget-key"]);
    expect(client.calls[0]?.args).toEqual([10, 30_000]);
  });

  it("rejects every malformed backend reply fail-closed", async () => {
    for (const reply of [
      [1.5, 100],
      [1, Number.NaN],
      "garbage",
      null,
      [1],
      [1, 2, 3].slice(0, 1),
    ]) {
      const store = createRedisRateLimitStore(capturingClient(reply));
      await expect(
        store.increment("k", 10, 1000, Date.now()),
      ).rejects.toMatchObject({
        name: "RateLimitStoreError",
        code: "backend",
      });
    }
  });

  it("floors retry-after at one second", async () => {
    const store = createRedisRateLimitStore(capturingClient([11, 0]));
    await expect(
      store.increment("k", 10, 1000, Date.now()),
    ).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  it("preserves timeout codes instead of wrapping them", async () => {
    const store = createRedisRateLimitStore({
      eval: () => new Promise(() => undefined),
    });
    const error = await store
      .increment("k", 10, 1000, Date.now(), { timeoutMs: 20 })
      .catch((entry: unknown) => entry);
    expect(error).toBeInstanceOf(RateLimitStoreError);
    expect((error as RateLimitStoreError).code).toBe("timeout");
  });

  it("allows with the wall clock when none is injected", async () => {
    const guard = createRateLimitGuard({
      store: createMemoryRateLimitStore(),
      riskClass: "mutation",
    });
    await expect(
      guard.check({ route: "/api/v1/clock", riskClass: "mutation" }),
    ).resolves.toMatchObject({ allowed: true });
  });

  it("drives decisions from the injected clock", async () => {
    let now = 0;
    const guard = createRateLimitGuard({
      store: createMemoryRateLimitStore(),
      riskClass: "mutation",
      clock: () => now,
    });
    for (let index = 0; index < 60; index += 1) {
      await expect(
        guard.check({ route: "/api/v1/z", riskClass: "mutation" }),
      ).resolves.toMatchObject({ allowed: true });
    }
    await expect(
      guard.check({ route: "/api/v1/z", riskClass: "mutation" }),
    ).resolves.toMatchObject({ allowed: false });
    now = 61_000;
    await expect(
      guard.check({ route: "/api/v1/z", riskClass: "mutation" }),
    ).resolves.toMatchObject({ allowed: true });
  });

  it("denies fail-closed classes when the backend denies without a listener", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const guard = createRateLimitGuard({
      store: createScriptedRateLimitStore({
        script: [{ allowed: false, remaining: 0, retryAfterSeconds: 2 }],
      }),
      riskClass: "public-low-risk",
    });
    await expect(
      guard.check({ route: "/health/live", riskClass: "public-low-risk" }),
    ).resolves.toMatchObject({ allowed: false });
  });

  it("allows without a listener when the backend allows", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const guard = createRateLimitGuard({
      store: createScriptedRateLimitStore({
        script: [{ allowed: true, remaining: 3 }],
      }),
      riskClass: "mutation",
    });
    await expect(
      guard.check({ route: "/api/v1/y", riskClass: "mutation" }),
    ).resolves.toMatchObject({ allowed: true, remaining: 3 });
  });

  it("honors per-call timeout overrides", async () => {
    let calls = 0;
    const store = createRedisRateLimitStore({
      eval: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 200));
        return [1, 1000];
      },
    });
    await expect(
      store.increment("k", 10, 1000, Date.now(), { timeoutMs: 20 }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(calls).toBe(1);
  });

  it("wraps transport failures with the backend code", async () => {
    const store = createRedisRateLimitStore({
      eval: async () => {
        throw new Error("boom");
      },
    });
    await expect(
      store.increment("k", 10, 1000, Date.now()),
    ).rejects.toMatchObject({
      code: "backend",
    });
  });

  it("aborts before touching the backend", async () => {
    const evalSpy = vi.fn(async () => [1, 1000]);
    const store = createRedisRateLimitStore({ eval: evalSpy });
    const controller = new AbortController();
    controller.abort();
    await expect(
      store.increment("k", 10, 1000, Date.now(), { signal: controller.signal }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(evalSpy).not.toHaveBeenCalled();
  });
});

describe("rate-limit mutation closure — adapter fail policy", () => {
  it("fails closed on backend outage by default", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const limiter = createBackendRequestLimiter(
      createScriptedRateLimitStore({ failures: 99 }),
      { maxRequests: 10, windowMs: 60_000 },
    );
    await expect(limiter.check("outage")).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  it("fails open only with explicit opt-in", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const limiter = createBackendRequestLimiter(
      createScriptedRateLimitStore({ failures: 99 }),
      { maxRequests: 10, windowMs: 60_000, failPolicy: "fail-open" },
    );
    await expect(limiter.check("outage")).resolves.toMatchObject({
      allowed: true,
    });
  });
});

describe("rate-limit mutation closure — guard policy", () => {
  it("notifies rejections with key, route and risk", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const seen: Array<unknown> = [];
    const guard = createRateLimitGuard({
      store: createScriptedRateLimitStore({
        script: [{ allowed: false, remaining: 0, retryAfterSeconds: 9 }],
      }),
      riskClass: "mutation",
      onRejection: (entry) => {
        seen.push(entry);
      },
    });
    const decision = await guard.check({
      route: "/api/v1/attempts",
      riskClass: "mutation",
    });
    expect(decision).toMatchObject({ allowed: false });
    expect(seen[0]).toMatchObject({
      route: "/api/v1/attempts",
      riskClass: "mutation",
      retryAfterSeconds: 9,
    });
  });

  it("stays silent on allowed decisions", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const seen: Array<unknown> = [];
    const guard = createRateLimitGuard({
      store: createScriptedRateLimitStore({
        script: [{ allowed: true, remaining: 4 }],
      }),
      riskClass: "mutation",
      onRejection: (entry) => {
        seen.push(entry);
      },
    });
    await expect(
      guard.check({ route: "/api/v1/y", riskClass: "mutation" }),
    ).resolves.toMatchObject({ allowed: true });
    expect(seen).toHaveLength(0);
  });

  it("embeds the normalized client IP and stays deterministic", async () => {
    const first = buildRateLimitKey({
      principalId: "participant-1",
      clientIp: "10.0.0.8",
      route: "/api/v1/attempts/:attemptId/submit",
      riskClass: "mutation",
    });
    expect(first).toContain("client:10.0.0.8|");
    expect(
      buildRateLimitKey({
        principalId: "participant-1",
        clientIp: "10.0.0.8",
        route: "/api/v1/attempts/:attemptId/submit",
        riskClass: "mutation",
      }),
    ).toBe(first);
  });

  it("namespaces redis keys with a custom prefix", async () => {
    const calls: Array<{ keys: unknown }> = [];
    const store = createRedisRateLimitStore(
      {
        eval: async (_script: string, keys: unknown, _args: unknown) => {
          calls.push({ keys });
          return [1, 60_000];
        },
      },
      { keyPrefix: "custom" },
    );
    await store.increment("k", 10, 1000, Date.now());
    expect(calls[0]?.keys).toEqual(["custom:k"]);
  });

  it("works without a rejection listener", async () => {
    const { createScriptedRateLimitStore } =
      await import("./rate-limit-store.js");
    const guard = createRateLimitGuard({
      store: createScriptedRateLimitStore({
        script: [{ allowed: false, remaining: 0 }],
      }),
      riskClass: "mutation",
    });
    await expect(
      guard.check({ route: "/api/v1/x", riskClass: "mutation" }),
    ).resolves.toMatchObject({ allowed: false });
  });
});
