import { describe, expect, it } from "vitest";

import {
  RISK_CLASS_LIMITS,
  buildRateLimitKey,
  createMemoryRateLimitStore,
  createRateLimitGuard,
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
});
