import { describe, expect, it, vi } from "vitest";
import * as persistence from "@cvg/persistence";

import type { ApiHttpDependencies } from "../http.js";
import { createHttpRateLimiter } from "../main.js";
import { createApiServer } from "../server.js";
import { createMemoryRateLimitStore } from "../security/rate-limit-store.js";

const dependencies: ApiHttpDependencies = {
  requestIdFactory: () => "request-rate-class-test",
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

// Real HTTP server and production composition, with an explicitly synthetic
// shared store replacing only the PostgreSQL adapter. This is not a PG/Redis proof.
function syntheticProductionLimiter() {
  const store = createMemoryRateLimitStore();
  vi.spyOn(persistence, "createPostgresRateLimiter").mockImplementation(
    (_database, options = {}) => ({
      check: (key, now = Date.now()) =>
        store.increment(
          key,
          options.maxRequests ?? 120,
          options.windowMs ?? 60_000,
          now,
        ),
    }),
  );
  return createHttpRateLimiter(
    {},
    {} as Parameters<typeof createHttpRateLimiter>[1],
    () => undefined,
  );
}

async function withHttpServer(
  limiter: ReturnType<typeof createHttpRateLimiter>,
  run: (origin: string) => Promise<void>,
) {
  const api = createApiServer(dependencies, {
    host: "127.0.0.1",
    port: 0,
    rateLimiter: limiter,
  });
  await api.listen();
  try {
    const address = api.address();
    if (address === null || typeof address === "string")
      throw new Error("missing HTTP listener");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await api.close();
  }
}

describe("server-selected production HTTP rate classes (synthetic store)", () => {
  it.each([
    {
      path: "/api/v1/invitations/accept",
      method: "POST",
      limit: 20,
      status: 404,
    },
    { path: "/api/v1/recovery/accept", method: "POST", limit: 10, status: 404 },
    { path: "/api/v1/learning-path", method: "GET", limit: 120, status: 401 },
  ])(
    "denies request $limit+1 on $path using its registered class",
    async ({ path, method, limit, status }) => {
      await withHttpServer(syntheticProductionLimiter(), async (origin) => {
        for (let index = 0; index < limit; index++) {
          const response = await fetch(origin + path, {
            method,
            headers: {
              "content-type": "application/json",
              "x-rate-limit-risk-class": "public-low-risk",
            },
            ...(method === "POST" ? { body: "{}" } : {}),
          });
          expect(response.status).toBe(status);
          await response.text();
        }
        const denied = await fetch(origin + path, {
          method,
          ...(method === "POST" ? { body: "{}" } : {}),
        });
        expect(denied.status).toBe(429);
        expect(Number(denied.headers.get("retry-after"))).toBeGreaterThan(0);
        expect(await denied.json()).toMatchObject({
          success: false,
          error: { code: "rate_limited" },
        });
      });
    },
  );

  it("separates class budgets even for the same opaque key, keeping legacy checks at 120", async () => {
    const limiter = syntheticProductionLimiter();
    for (const riskClass of [
      "authentication",
      "recovery",
      "mutation",
      "internal",
      "ai-assisted",
      "public-low-risk",
      "expensive-read",
    ] as const) {
      const limit =
        riskClass === "authentication"
          ? 20
          : riskClass === "recovery" || riskClass === "ai-assisted"
            ? 10
            : riskClass === "mutation" || riskClass === "internal"
              ? 60
              : 120;
      for (let index = 0; index < limit; index++) {
        expect((await limiter.check("same-key", 1000, riskClass)).allowed).toBe(
          true,
        );
      }
      expect((await limiter.check("same-key", 1000, riskClass)).allowed).toBe(
        false,
      );
    }
    expect((await limiter.check("legacy-key", 1000)).remaining).toBe(119);
    expect(
      (await limiter.check("same-key", 61_000, "authentication")).allowed,
    ).toBe(true);
  });

  it("denies sensitive HTTP classes on backend failure while health remains live", async () => {
    vi.spyOn(persistence, "createPostgresRateLimiter").mockImplementation(
      () => ({
        check: async () => {
          throw new Error("synthetic backend unavailable");
        },
      }),
    );
    const limiter = createHttpRateLimiter(
      {},
      {} as Parameters<typeof createHttpRateLimiter>[1],
      () => undefined,
    );
    await withHttpServer(limiter, async (origin) => {
      for (const path of [
        "/api/v1/invitations/accept",
        "/api/v1/recovery/accept",
        "/api/v1/attempts",
      ]) {
        const response = await fetch(origin + path, {
          method: "POST",
          body: "{}",
        });
        expect(response.status).toBe(429);
        await response.text();
      }
      const health = await fetch(origin + "/health/live");
      expect(health.status).toBe(200);
      await health.text();
    });
  });
});
