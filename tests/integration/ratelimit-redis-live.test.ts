import { describe, expect, it } from "vitest";

import {
  createRateLimitGuard,
  createRedisRateLimitStore,
  type RateLimitStore,
} from "../../apps/api/src/security/rate-limit-store.js";
import { createApiServer } from "../../apps/api/src/server.js";
import type { ApiHttpDependencies } from "../../apps/api/src/http.js";

import {
  liveRedisEnabled,
  liveRedisUrl,
  TestRespClient,
} from "./redis-live-harness.js";

function scriptClient(client: TestRespClient): {
  eval: (
    script: string,
    keys: readonly string[],
    args: readonly (string | number)[],
  ) => Promise<unknown>;
} {
  return {
    eval: (script, keys, args) => client.eval(script, keys, args),
  };
}

async function flushAll(): Promise<void> {
  const client = await TestRespClient.connect(liveRedisUrl as string);
  try {
    await client.command(["FLUSHALL"]);
  } finally {
    await client.close();
  }
}

function apiDependencies(): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-redis-live",
    authenticate: async () => null,
    resolveActivityScope: async () => null,
    resolveAttempt: async () => null,
    createInvitation: async () => {
      throw new Error("not used");
    },
    acceptInvitation: async () => {
      throw new Error("not used");
    },
    getParticipantActivity: async () => {
      throw new Error("not used");
    },
    advanceContent: async () => {
      throw new Error("not used");
    },
    getParticipantProgress: async () => {
      throw new Error("not used");
    },
    getAttemptFeedback: async () => null,
    correctOpenResponse: async () => {
      throw new Error("not used");
    },
    startAttempt: async () => {
      throw new Error("not used");
    },
    saveAnswer: async () => {
      throw new Error("not used");
    },
    submitAttempt: async () => {
      throw new Error("not used");
    },
    healthcheck: async () => undefined,
  };
}

async function redisBackedLimiter(
  maxRequests: number,
  windowMs: number,
  namespace = `rl:live:${Date.now().toString(36)}:${Math.floor(Math.random() * 1e6).toString(36)}`,
): Promise<{
  store: RateLimitStore;
  check: (key: string) => Promise<{ allowed: boolean }>;
  close: () => Promise<void>;
}> {
  const client = await TestRespClient.connect(liveRedisUrl as string);
  const store = createRedisRateLimitStore(scriptClient(client), {
    keyPrefix: namespace,
  });
  return {
    store,
    check: (key: string) =>
      store.increment(key, maxRequests, windowMs, Date.now()),
    close: () => client.close(),
  };
}

describe.skipIf(!liveRedisEnabled)(
  "redis multi-instance rate limiting on real Redis",
  () => {
    it("shares one budget across two instances: 5+5 pass, 11th denied", async () => {
      await flushAll();
      // One shared namespace = one shared budget, like two API replicas
      // behind the same Redis.
      const namespace = `rl:shared:${Date.now().toString(36)}`;
      const instanceA = await redisBackedLimiter(10, 60_000, namespace);
      const instanceB = await redisBackedLimiter(10, 60_000, namespace);
      try {
        const key = `live-bypass:${Date.now()}`;
        for (let index = 0; index < 5; index += 1) {
          await expect(instanceA.check(key)).resolves.toMatchObject({
            allowed: true,
          });
          await expect(instanceB.check(key)).resolves.toMatchObject({
            allowed: true,
          });
        }
        await expect(instanceA.check(key)).resolves.toMatchObject({
          allowed: false,
        });
        await expect(instanceB.check(key)).resolves.toMatchObject({
          allowed: false,
        });
      } finally {
        await instanceA.close();
        await instanceB.close();
      }
    });

    it("keeps exact counts under 50 parallel increments against one budget of 10", async () => {
      await flushAll();
      const instance = await redisBackedLimiter(10, 60_000);
      try {
        const key = `live-atomic:${Date.now()}`;
        const decisions = await Promise.all(
          Array.from({ length: 50 }, () => instance.check(key)),
        );
        expect(decisions.filter((d) => d.allowed)).toHaveLength(10);
        expect(decisions.filter((d) => !d.allowed)).toHaveLength(40);
      } finally {
        await instance.close();
      }
    });

    it("fails closed for mutation and open for public-low-risk on backend outage", async () => {
      const unreachable = "redis://127.0.0.1:1";
      const dead = await TestRespClient.connect(unreachable).catch(() => null);
      expect(dead).toBeNull();
      const failingStore = createRedisRateLimitStore(
        {
          eval: async () => {
            throw new Error("connection refused (synthetic outage)");
          },
        },
        { timeoutMs: 50 },
      );
      const closed = createRateLimitGuard({
        store: failingStore,
        riskClass: "mutation",
        failPolicy: "fail-closed",
      });
      const open = createRateLimitGuard({
        store: failingStore,
        riskClass: "public-low-risk",
        failPolicy: "fail-open",
      });
      await expect(
        closed.check({
          route: "/api/v1/attempts",
          riskClass: "mutation",
        }),
      ).resolves.toMatchObject({ allowed: false });
      await expect(
        open.check({ route: "/health/live", riskClass: "public-low-risk" }),
      ).resolves.toMatchObject({ allowed: true });
    });

    it("times out a stalled backend instead of hanging the request path", async () => {
      const client = await TestRespClient.connect(liveRedisUrl as string);
      try {
        await client.command(["CLIENT", "PAUSE", "300"]);
        const slow = createRedisRateLimitStore(scriptClient(client), {
          timeoutMs: 100,
        });
        await expect(
          slow.increment("live:slow", 10, 60_000, Date.now()),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it("honors trusted forwarded IPs and ignores spoofed ones across two API instances", async () => {
      await flushAll();
      const shared = await redisBackedLimiter(10, 60_000);
      const limiter = {
        check: (key: string) => shared.check(`proxy-live:${key}`),
      };
      const untrusted = createApiServer(apiDependencies(), {
        host: "127.0.0.1",
        port: 0,
        rateLimiter: limiter,
      });
      const trusted = createApiServer(apiDependencies(), {
        host: "127.0.0.1",
        port: 0,
        rateLimiter: limiter,
        trustedProxies: ["127.0.0.1"],
      });
      await untrusted.listen();
      await trusted.listen();
      try {
        const untrustedAddress = untrusted.address();
        const trustedAddress = trusted.address();
        if (untrustedAddress === null || typeof untrustedAddress === "string")
          return;
        if (trustedAddress === null || typeof trustedAddress === "string")
          return;
        const untrustedUrl = `http://127.0.0.1:${untrustedAddress.port}/unknown`;
        const trustedUrl = `http://127.0.0.1:${trustedAddress.port}/unknown`;
        // Untrusted: forged XFF is ignored, every request shares the socket-IP
        // bucket — 10 pass, the 11th is denied despite rotating identities.
        for (let index = 0; index < 10; index += 1) {
          const response = await fetch(untrustedUrl, {
            headers: { "x-forwarded-for": `198.51.100.${index + 1}` },
          });
          expect(response.status).toBe(404);
        }
        const denied = await fetch(untrustedUrl, {
          headers: { "x-forwarded-for": "198.51.100.99" },
        });
        expect(denied.status).toBe(429);
        // Trusted: each forwarded identity gets its own budget — 10 distinct
        // identities all pass against the same shared backend.
        for (let index = 0; index < 10; index += 1) {
          const response = await fetch(trustedUrl, {
            headers: { "x-forwarded-for": `203.0.113.${index + 1}` },
          });
          expect(response.status).toBe(404);
        }
        // Malformed forwarded value falls back to the socket IP (fail-closed):
        // the trusted server already consumed its socket-IP bucket above only
        // if a malformed header maps there — assert it is served, not crashed.
        const malformed = await fetch(trustedUrl, {
          headers: { "x-forwarded-for": "not-an-ip!!!" },
        });
        expect([404, 429]).toContain(malformed.status);
      } finally {
        await untrusted.close();
        await trusted.close();
        await shared.close();
      }
    }, 60000);
  },
);
