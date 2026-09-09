import { describe, expect, it, vi } from "vitest";

import { createObservability } from "@cvg/observability";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import { handleOperationalRoutes } from "./ops.handler.js";

const staff: ApiPrincipal = {
  principalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  accountStatus: "ACTIVE",
  roles: ["ADMIN"],
  scopes: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
};

const participant: ApiPrincipal = {
  principalId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
};

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    healthcheck: async () => undefined,
    authenticate: async () => staff,
    ...overrides,
  } as ApiHttpDependencies;
}

function getRequest(path: string): ApiHttpRequest {
  return { method: "GET", path, body: undefined };
}

describe("ops feature handlers", () => {
  it("branch=liveness/risk=none: live answers without touching dependencies (200)", async () => {
    const healthcheck = vi.fn(async () => undefined);
    const response = await handleOperationalRoutes(
      getRequest("/health/live"),
      "request-1",
      baseDependencies({ healthcheck }),
    );
    expect(response?.status).toBe(200);
    expect(healthcheck).not.toHaveBeenCalled();
  });

  it("branch=passthrough/risk=none: non-operational routes fall through (null)", async () => {
    const response = await handleOperationalRoutes(
      getRequest("/api/v1/attempts"),
      "request-1",
      baseDependencies(),
    );
    expect(response).toBeNull();
  });

  it("branch=dependency-failure/risk=outage: ready maps a failed healthcheck to 503", async () => {
    const response = await handleOperationalRoutes(
      getRequest("/health/ready"),
      "request-1",
      baseDependencies({
        healthcheck: async () => {
          throw new Error("postgres down");
        },
      }),
    );
    expect(response?.status).toBe(503);
  });

  it("branch=dependency-missing/risk=unwired-port: dependencies endpoint without port (503)", async () => {
    const response = await handleOperationalRoutes(
      getRequest("/health/dependencies"),
      "request-1",
      baseDependencies(),
    );
    expect(response?.status).toBe(503);
  });

  it("branch=unauthenticated/risk=anonymous-probe: operations without session (401)", async () => {
    const response = await handleOperationalRoutes(
      getRequest("/internal/operations"),
      "request-1",
      baseDependencies({ authenticate: async () => null }),
    );
    expect(response?.status).toBe(401);
  });

  it("branch=forbidden/risk=privilege-escalation: operations denied to participant (403)", async () => {
    const response = await handleOperationalRoutes(
      getRequest("/internal/operations"),
      "request-1",
      baseDependencies({ authenticate: async () => ({ ...participant }) }),
    );
    expect(response?.status).toBe(403);
  });

  it("branch=happy-path/risk=none: operations returns redacted degraded status (200)", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    const response = await handleOperationalRoutes(
      getRequest("/internal/operations"),
      "request-1",
      baseDependencies({
        observability,
        dependencyStatus: async () => ({
          status: "DEGRADED" as const,
          dependencies: {
            postgres: "UP" as const,
            qdrant: "DOWN" as const,
            ai: "DISABLED" as const,
          },
        }),
      }),
    );
    expect(response?.status).toBe(200);
    expect(response?.body).toMatchObject({
      success: true,
      data: {
        dependencies: { postgres: "UP", qdrant: "DOWN", ai: "DISABLED" },
      },
    });
  });

  it("branch=unauthenticated/risk=anonymous-probe: metrics without session (401)", async () => {
    const response = await handleOperationalRoutes(
      getRequest("/internal/metrics"),
      "request-1",
      baseDependencies({ authenticate: async () => null }),
    );
    expect(response?.status).toBe(401);
  });
});
