import { describe, expect, it, vi } from "vitest";

import { createObservability } from "@cvg/observability";

import { dependencies } from "./http-boundary/fixtures.js";
import { createApiServer } from "./server.js";

describe("HTTP response authority under observer outage", () => {
  it.each(["healthy", "logger", "metrics", "both"])(
    "delivers the real safe 403 with %s observers",
    async (fault) => {
      const ownScope = "11111111-1111-4111-8111-111111111111";
      const foreignScope = "22222222-2222-4222-8222-222222222222";
      const lookup = vi.fn(async () => {
        throw new Error("forbidden lookup");
      });
      const audit = { append: vi.fn(async () => undefined) };
      const source = createObservability({
        service: "api",
        sink: () => {
          if (fault === "logger" || fault === "both")
            throw new Error("synthetic logger outage");
        },
      });
      const failMetric = () => {
        throw new Error("synthetic metric outage");
      };
      const observability =
        fault === "metrics" || fault === "both"
          ? {
              ...source,
              metrics: {
                ...source.metrics,
                increment: failMetric,
                observe: failMetric,
              },
            }
          : source;
      const api = createApiServer(
        dependencies({
          requestIdFactory: () => "44444444-4444-4444-8444-444444444444",
          authenticate: async () => ({
            principalId: "33333333-3333-4333-8333-333333333333",
            accountStatus: "ACTIVE",
            roles: ["PARTICIPANT"],
            scopes: [ownScope],
          }),
          audit,
          getAuditTrail: lookup,
          observability,
        }),
        { host: "127.0.0.1", port: 0 },
      );
      await api.listen();
      const address = api.address();
      if (address === null || typeof address === "string")
        throw new Error("Missing owned API address");
      try {
        // A harness containment limit, not an application response SLA.
        const response = await fetch(
          `http://127.0.0.1:${address.port}/api/v1/audit?scopeId=${foreignScope}`,
          {
            signal: AbortSignal.timeout(2_000),
          },
        ).catch(() => undefined);
        expect(response?.status).toBe(403);
        const body: unknown = await response!.json();
        expect(body).toMatchObject({
          success: false,
          error: { code: "forbidden" },
        });
        expect(JSON.stringify(body)).not.toContain(foreignScope);
        expect(JSON.stringify(body)).not.toContain("synthetic");
        expect(lookup).not.toHaveBeenCalled();
        expect(audit.append).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ scopeId: ownScope }),
        );
      } finally {
        await api.close();
      }
    },
  );
});
