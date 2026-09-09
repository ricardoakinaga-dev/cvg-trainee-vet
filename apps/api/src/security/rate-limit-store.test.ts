import { describe, expect, it } from "vitest";

import {
  FAIL_POLICY_BY_RISK_CLASS,
  RISK_CLASS_LIMITS,
  buildRateLimitKey,
  createMemoryRateLimitStore,
  createRateLimitGuard,
  createRedisRateLimitStore,
  createScriptedRateLimitStore,
  type RateLimitKeyInput,
} from "./rate-limit-store.js";

const KEY_INPUT: RateLimitKeyInput = {
  principalId: "participant-1",
  clientIp: "10.0.0.8",
  route: "/api/v1/attempts/:attemptId/submit",
  riskClass: "mutation",
};

describe("distributed rate-limit store", () => {
  it("defines explicit limits for every risk class", () => {
    expect(Object.keys(RISK_CLASS_LIMITS).sort()).toEqual(
      [
        "ai-assisted",
        "authentication",
        "expensive-read",
        "internal",
        "mutation",
        "public-low-risk",
        "recovery",
      ].sort(),
    );
    for (const limits of Object.values(RISK_CLASS_LIMITS)) {
      expect(limits.maxRequests).toBeGreaterThan(0);
      expect(limits.windowMs).toBeGreaterThan(0);
    }
    expect(RISK_CLASS_LIMITS["authentication"].maxRequests).toBeLessThanOrEqual(
      RISK_CLASS_LIMITS["public-low-risk"].maxRequests,
    );
  });

  it("composes keys from principal, normalized ip, route and risk class", () => {
    const key = buildRateLimitKey(KEY_INPUT);
    expect(key).toContain("mutation");
    expect(key).toContain("/api/v1/attempts/:attemptId/submit");
    expect(key).toContain("10.0.0.8");
    expect(key).not.toContain("participant-1");
  });

  it("hashes the principal so keys never carry raw identity", () => {
    const first = buildRateLimitKey(KEY_INPUT);
    const second = buildRateLimitKey({
      ...KEY_INPUT,
      principalId: "participant-2",
    });
    expect(first).not.toBe(second);
    expect(second).not.toContain("participant-2");
  });

  it("normalizes ipv6 loopback and rejects empty routes fail-closed", () => {
    const loopback = buildRateLimitKey({ ...KEY_INPUT, clientIp: " ::1 " });
    expect(loopback).toContain("127.0.0.1");
    expect(loopback).not.toContain("::1");
    expect(() => buildRateLimitKey({ ...KEY_INPUT, route: " " })).toThrow(
      "route",
    );
    expect(
      buildRateLimitKey({
        route: "/api/v1/attempts/:attemptId/submit",
        riskClass: "mutation",
      }),
    ).toContain("unknown");
  });

  it("memory store allows a burst then reports retry-after deterministically", async () => {
    const store = createMemoryRateLimitStore();
    const windowMs = 1_000;
    const first = await store.increment("k", 2, windowMs, 1_000);
    const second = await store.increment("k", 2, windowMs, 1_001);
    const blocked = await store.increment("k", 2, windowMs, 1_002);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    await store.reset("k");
    expect(await store.increment("k", 2, windowMs, 1_003)).toMatchObject({
      allowed: true,
    });
  });

  it("guard applies fail-closed on store outage and fail-open when configured", async () => {
    const failing = createScriptedRateLimitStore({
      failures: 10,
      decision: { allowed: true, remaining: 1 },
    });
    const closed = createRateLimitGuard({
      store: failing,
      riskClass: "mutation",
      failPolicy: "fail-closed",
    });
    const open = createRateLimitGuard({
      store: failing,
      riskClass: "mutation",
      failPolicy: "fail-open",
    });
    await expect(closed.check(KEY_INPUT)).resolves.toMatchObject({
      allowed: false,
    });
    await expect(open.check(KEY_INPUT)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("guard emits a rejection metric and retry-after on denial", async () => {
    const store = createMemoryRateLimitStore();
    const rejected: string[] = [];
    const guard = createRateLimitGuard({
      store: createScriptedRateLimitStore({
        script: [{ allowed: false, remaining: 0, retryAfterSeconds: 7 }],
      }),
      riskClass: "authentication",
      failPolicy: "fail-closed",
      onRejection: (entry) => {
        rejected.push(`${entry.riskClass}:${entry.retryAfterSeconds}`);
      },
    });
    const decision = await guard.check(KEY_INPUT);
    expect(decision).toMatchObject({ allowed: false, retryAfterSeconds: 7 });
    expect(rejected).toEqual(["authentication:7"]);
    expect(store).toBeDefined();
  });

  it("declares an explicit fail policy per risk class", () => {
    expect(FAIL_POLICY_BY_RISK_CLASS).toMatchObject({
      authentication: "fail-closed",
      recovery: "fail-closed",
      mutation: "fail-closed",
      internal: "fail-closed",
      "ai-assisted": "fail-closed",
      "public-low-risk": "fail-open",
      "expensive-read": "fail-closed",
    });
  });

  it("guard defaults to the class fail policy when none is given", async () => {
    const failing = createScriptedRateLimitStore({ failures: 5 });
    const authGuard = createRateLimitGuard({
      store: failing,
      riskClass: "authentication",
    });
    await expect(authGuard.check(KEY_INPUT)).resolves.toMatchObject({
      allowed: false,
    });
    const publicGuard = createRateLimitGuard({
      store: failing,
      riskClass: "public-low-risk",
    });
    await expect(publicGuard.check(KEY_INPUT)).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("redis store decides with a single atomic eval and honors TTL", async () => {
    const calls: Array<{ script: string; keys: readonly string[] }> = [];
    const counts = new Map<string, number>();
    const store = createRedisRateLimitStore({
      eval: async (script, keys) => {
        calls.push({ script, keys });
        const count = (counts.get(keys[0] as string) ?? 0) + 1;
        counts.set(keys[0] as string, count);
        return [count, 1_000];
      },
    });
    const first = await store.increment("rl:test", 2, 60_000, Date.now());
    const second = await store.increment("rl:test", 2, 60_000, Date.now());
    const blocked = await store.increment("rl:test", 2, 60_000, Date.now());
    expect(calls).toHaveLength(3);
    expect(calls[0]?.script).toContain("INCR");
    expect(calls[0]?.script).toContain("PEXPIRE");
    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(blocked).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
  });

  it("redis store fails on backend timeout and honors cancellation", async () => {
    const hanging = createRedisRateLimitStore({
      eval: () => new Promise<never>(() => {}),
    });
    await expect(
      hanging.increment("rl:timeout", 1, 60_000, Date.now(), { timeoutMs: 5 }),
    ).rejects.toThrow("timeout");
    const controller = new AbortController();
    controller.abort();
    await expect(
      hanging.increment("rl:cancel", 1, 60_000, Date.now(), {
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted");
  });

  it("memory store honors cancellation", async () => {
    const store = createMemoryRateLimitStore();
    const controller = new AbortController();
    controller.abort();
    await expect(
      store.increment("rl:cancel", 1, 60_000, Date.now(), {
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted");
  });

  it("keeps exact counts under concurrent increments", async () => {
    const store = createMemoryRateLimitStore();
    const nowMs = 10_000;
    const decisions = await Promise.all(
      Array.from({ length: 50 }, () =>
        store.increment("rl:race", 10, 60_000, nowMs),
      ),
    );
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(10);
    expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(40);
    const blocked = await store.increment("rl:race", 10, 60_000, nowMs + 1);
    expect(blocked).toMatchObject({ allowed: false, retryAfterSeconds: 60 });
  });

  it("builds deterministic, bounded keys for arbitrary inputs (property loop)", () => {
    let seed = 0x9e3779b9;
    const next = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    const alphabet = "abcXYZ019:/.-_ \t::ffff:";
    const randomText = (max: number): string => {
      const length = Math.floor(next() * max);
      return Array.from(
        { length },
        () => alphabet[Math.floor(next() * alphabet.length)] as string,
      ).join("");
    };
    const classes = Object.keys(RISK_CLASS_LIMITS);
    for (let index = 0; index < 300; index += 1) {
      const input = {
        principalId: randomText(40),
        clientIp: randomText(48),
        route: `/api/v1/${randomText(12).replaceAll(/[^a-zA-Z0-9]+/gu, "x") || "x"}`,
        riskClass: classes[
          index % classes.length
        ] as keyof typeof RISK_CLASS_LIMITS,
      };
      const first = buildRateLimitKey(input);
      expect(buildRateLimitKey(input)).toBe(first);
      expect(first.length).toBeLessThanOrEqual(640);
      expect(first).not.toContain("\t");
      expect(first).not.toContain(" ");
    }
  });
});
