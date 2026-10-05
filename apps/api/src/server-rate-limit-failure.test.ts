import { describe, expect, it, vi } from "vitest";
import { dependencies } from "./http-boundary/fixtures.js";
import { createApiServer } from "./server.js";

describe("HTTP limiter callback failure boundary", () => {
  it.each(["sync", "async"])(
    "answers and audits a %s limiter rejection without leaking its error",
    async (kind) => {
      const audit = { append: vi.fn(async () => undefined) };
      const error = new Error("synthetic limiter private detail");
      const check = vi.fn(() => {
        if (kind === "sync") throw error;
        return Promise.reject(error);
      });
      const ownScope = "11111111-1111-4111-8111-111111111111";
      const authenticate = vi.fn(async () => null);
      const server = createApiServer(
        dependencies({
          audit,
          requestIdFactory: () => "44444444-4444-4444-8444-444444444444",
          authenticate,
        }),
        { host: "127.0.0.1", port: 0, rateLimiter: { check } },
      );
      await server.listen();
      const address = server.address();
      if (address === null || typeof address === "string")
        throw new Error("Owned listener address required");
      try {
        // This is harness containment, not a public response deadline.
        const response = await fetch(
          `http://127.0.0.1:${address.port}/api/v1/dashboard?scopeId=${ownScope}`,
          { signal: AbortSignal.timeout(500) },
        ).catch(() => undefined);
        expect(response?.status).toBe(429);
        expect(response?.headers.get("retry-after")).toBe("1");
        const body: unknown = await response!.json();
        expect(body).toMatchObject({
          success: false,
          error: { code: "rate_limited" },
        });
        expect(JSON.stringify(body)).not.toContain(error.message);
        expect(audit.append).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            actorKind: "ANONYMOUS",
            reasonCode: "api_rate_limited",
          }),
        );
        expect(authenticate).not.toHaveBeenCalled();
        const health = await fetch(
          `http://127.0.0.1:${address.port}/health/live`,
        );
        expect(health.status).toBe(200);
        expect(check).toHaveBeenCalledTimes(1);
      } finally {
        await server.close();
      }
    },
  );
});
