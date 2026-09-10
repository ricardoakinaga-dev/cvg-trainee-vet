import { spawn, type ChildProcess } from "node:child_process";
import { connect } from "node:net";
import { describe, expect, it } from "vitest";

import {
  createBackendRequestLimiter,
  createRateLimitGuard,
  createRedisRateLimitStore,
  describeRateLimitBackend,
} from "../../apps/api/src/security/rate-limit-store.js";
import { createApiServer } from "../../apps/api/src/server.js";
import type { ApiHttpDependencies } from "../../apps/api/src/http.js";

import { liveRedisEnabled, TestRespClient } from "./redis-live-harness.js";

const REDIS_BIN = process.env.CVG_REDIS_SERVER_BIN?.trim() || "";
const canManageServer = liveRedisEnabled && REDIS_BIN.length > 0;

async function ephemeralPort(): Promise<number> {
  const net = await import("node:net");
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address !== null && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("could not allocate a port"));
        }
      });
    });
  });
}

async function waitForTcp(port: number, attempts = 100): Promise<void> {
  for (let index = 0; index < attempts; index += 1) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = connect({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (open) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`redis did not become ready on ${port}`);
}

function bootRedis(port: number): ChildProcess {
  const child = spawn(
    REDIS_BIN,
    [
      "--port",
      String(port),
      "--bind",
      "127.0.0.1",
      "--save",
      "",
      "--appendonly",
      "no",
    ],
    { stdio: "ignore" },
  );
  return child;
}

async function stopRedis(child: ChildProcess | null): Promise<void> {
  if (child === null || child.exitCode !== null) return;
  child.kill("SIGKILL");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 2000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function apiDependencies(): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-redis-restart",
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
    getParticipantProgress: async () => null,
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

describe.skipIf(!canManageServer)(
  "redis restart drill on real Redis (AAA-CERT-003 §27)",
  () => {
    it("recovers a shared budget after SIGKILL with explicit fail policy during outage", async () => {
      const port = await ephemeralPort();
      let child: ChildProcess | null = bootRedis(port);
      await waitForTcp(port);
      const url = `redis://127.0.0.1:${port}`;
      const namespace = `rl:restart:${Date.now().toString(36)}`;

      const connectStore = async () => {
        const client = await TestRespClient.connect(url);
        return {
          client,
          store: createRedisRateLimitStore(
            {
              eval: (script, keys, args) => client.eval(script, keys, args),
            },
            { keyPrefix: namespace, timeoutMs: 500 },
          ),
        };
      };

      const first = await connectStore();
      try {
        // Phase 1 — traffic flows on the durable backend.
        await expect(
          first.store.increment("drill", 10, 60_000, Date.now()),
        ).resolves.toMatchObject({ allowed: true });
        await expect(
          first.store.increment("drill", 10, 60_000, Date.now()),
        ).resolves.toMatchObject({ allowed: true });

        // Phase 2 — SIGKILL during traffic: observe the failure policy.
        await first.client.close();
        await stopRedis(child);
        child = null;
        const outageClient = await TestRespClient.connect(url).catch(
          () => null,
        );
        expect(outageClient).toBeNull();
        const failingStore = createRedisRateLimitStore(
          {
            eval: async () => {
              throw new Error("connection refused (drill outage)");
            },
          },
          { keyPrefix: namespace, timeoutMs: 100 },
        );
        const closed = createRateLimitGuard({
          store: failingStore,
          riskClass: "authentication",
        });
        const open = createRateLimitGuard({
          store: failingStore,
          riskClass: "public-low-risk",
        });
        await expect(
          closed.check({
            route: "/api/v1/session",
            riskClass: "authentication",
          }),
        ).resolves.toMatchObject({ allowed: false });
        await expect(
          open.check({ route: "/health/live", riskClass: "public-low-risk" }),
        ).resolves.toMatchObject({ allowed: true });

        // Phase 3 — restart, bounded reconnect, traffic recovers.
        child = bootRedis(port);
        await waitForTcp(port);
        const second = await connectStore();
        try {
          await expect(
            second.store.increment("drill", 10, 60_000, Date.now()),
          ).resolves.toMatchObject({ allowed: true });
        } finally {
          await second.client.close();
        }
      } finally {
        await stopRedis(child);
      }
    }, 120000);

    it("shares one HTTP budget across API A and API B on the same Redis backend", async () => {
      const port = await ephemeralPort();
      const child = bootRedis(port);
      await waitForTcp(port);
      const url = `redis://127.0.0.1:${port}`;
      const namespace = `rl:httpab:${Date.now().toString(36)}`;
      const client = await TestRespClient.connect(url);
      try {
        const backend = describeRateLimitBackend("redis");
        expect(backend).toMatchObject({
          backend: "redis",
          sharedBudget: true,
          silentFallback: false,
        });
        const shared = createBackendRequestLimiter(
          createRedisRateLimitStore(
            {
              eval: (script, keys, args) => client.eval(script, keys, args),
            },
            { keyPrefix: namespace },
          ),
          { maxRequests: 10, windowMs: 60_000 },
        );
        const apiA = createApiServer(apiDependencies(), {
          host: "127.0.0.1",
          port: 0,
          rateLimiter: shared,
        });
        const apiB = createApiServer(apiDependencies(), {
          host: "127.0.0.1",
          port: 0,
          rateLimiter: shared,
        });
        await apiA.listen();
        await apiB.listen();
        try {
          const addressA = apiA.address();
          const addressB = apiB.address();
          if (addressA === null || typeof addressA === "string") return;
          if (addressB === null || typeof addressB === "string") return;
          // 5 requests on A + 5 on B share the single budget of 10.
          for (let index = 0; index < 5; index += 1) {
            const responseA = await fetch(
              `http://127.0.0.1:${addressA.port}/unknown`,
            );
            expect(responseA.status).toBe(404);
            const responseB = await fetch(
              `http://127.0.0.1:${addressB.port}/unknown`,
            );
            expect(responseB.status).toBe(404);
          }
          // The 11th request is denied on either instance (shared budget).
          const denied = await fetch(
            `http://127.0.0.1:${addressA.port}/unknown`,
          );
          expect(denied.status).toBe(429);
          expect(denied.headers.get("retry-after")).not.toBeNull();
        } finally {
          await apiA.close();
          await apiB.close();
        }
      } finally {
        await client.close();
        await stopRedis(child);
      }
    }, 120000);
  },
);
