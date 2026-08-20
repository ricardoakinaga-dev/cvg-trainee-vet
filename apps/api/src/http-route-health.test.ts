import { describe, expect, it, vi } from "vitest";

import { createObservability } from "@cvg/observability";
import type { ApiHttpDependencies, ApiHttpRequest } from "./http-types.js";
import {
  routeHealthRequest,
  routeMetricsRequest,
} from "./http-route-health.js";

function request(
  method: string,
  path: string,
  headers: Readonly<Record<string, string | undefined>> = {},
): ApiHttpRequest {
  return { method, path, headers, body: undefined };
}

function dependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-health",
    authenticate: vi.fn(async () => null),
    healthcheck: vi.fn(async () => undefined),
    dependencyStatus: vi.fn(async () => ({
      status: "READY",
      postgres: "UP",
      qdrant: "DISABLED",
      ai: "DISABLED",
    })),
    ...overrides,
  } as ApiHttpDependencies;
}

describe("HTTP health routes", () => {
  it("returns null for paths outside the health surface", async () => {
    const response = await routeHealthRequest(
      request("GET", "/api/v1/unknown"),
      "request-health",
      dependencies(),
    );

    expect(response).toBeNull();
  });

  it("returns live and ready responses", async () => {
    const live = await routeHealthRequest(
      request("GET", "/health/live"),
      "request-health",
      dependencies(),
    );
    const ready = await routeHealthRequest(
      request("GET", "/health/ready"),
      "request-health",
      dependencies(),
    );

    expect(live?.status).toBe(200);
    expect(ready?.status).toBe(200);
  });

  it("fails closed when readiness or dependency checks fail", async () => {
    const ready = await routeHealthRequest(
      request("GET", "/health/ready"),
      "request-health",
      dependencies({ healthcheck: vi.fn(async () => Promise.reject()) }),
    );
    const missingDependencyDependencies = {
      ...dependencies(),
      dependencyStatus: undefined,
    } as unknown as ApiHttpDependencies;
    const missingDependencyCheck = await routeHealthRequest(
      request("GET", "/health/dependencies", {
        authorization: "Bearer x",
      }),
      "request-health",
      { ...missingDependencyDependencies, metricsScrapeToken: "x" },
    );

    expect(ready?.status).toBe(503);
    expect(missingDependencyCheck?.status).toBe(503);
  });

  it("requires internal authorization and caches dependency diagnostics", async () => {
    const dependencyStatus = vi.fn(async () => ({
      status: "READY" as const,
      dependencies: {
        postgres: "UP" as const,
        qdrant: "DISABLED" as const,
        ai: "DISABLED" as const,
      },
    }));
    const secured = dependencies({
      metricsScrapeToken: "x",
      dependencyStatus,
    });

    const denied = await routeHealthRequest(
      request("GET", "/health/dependencies"),
      "request-health",
      secured,
    );
    const first = await routeHealthRequest(
      request("GET", "/health/dependencies", { authorization: "Bearer x" }),
      "request-health",
      secured,
    );
    const second = await routeHealthRequest(
      request("GET", "/health/dependencies", { authorization: "Bearer x" }),
      "request-health",
      secured,
    );

    expect(denied?.status).toBe(401);
    expect(first?.status).toBe(200);
    expect(second?.status).toBe(200);
    expect(first?.headers).toEqual({ "cache-control": "private, max-age=5" });
    expect(dependencyStatus).toHaveBeenCalledOnce();
  });

  it("distinguishes an authenticated but unauthorized diagnostics caller", async () => {
    const response = await routeHealthRequest(
      request("GET", "/health/dependencies"),
      "request-health",
      dependencies({
        authenticate: vi.fn(async () => ({
          principalId: "participant-1",
          accountStatus: "ACTIVE" as const,
          roles: ["PARTICIPANT" as const],
          scopes: [],
        })),
        dependencyStatus: vi.fn(async () => ({
          status: "READY" as const,
          dependencies: {
            postgres: "UP" as const,
            qdrant: "DISABLED" as const,
            ai: "DISABLED" as const,
          },
        })),
      }),
    );

    expect(response?.status).toBe(403);
  });

  it("fails closed for authentication errors and unhealthy dependency status", async () => {
    const authenticationError = await routeHealthRequest(
      request("GET", "/health/dependencies"),
      "request-health",
      dependencies({
        authenticate: vi.fn(async () => {
          throw new Error("synthetic authentication failure");
        }),
      }),
    );
    const notReady = await routeHealthRequest(
      request("GET", "/health/dependencies", {
        authorization: "Bearer x",
      }),
      "request-health",
      dependencies({
        metricsScrapeToken: "x",
        dependencyStatus: vi.fn(async () => ({
          status: "NOT_READY" as const,
          dependencies: {
            postgres: "DOWN" as const,
            qdrant: "DISABLED" as const,
            ai: "DISABLED" as const,
          },
        })),
      }),
    );
    const dependencyFailure = await routeHealthRequest(
      request("GET", "/health/dependencies", {
        authorization: "Bearer x",
      }),
      "request-health",
      dependencies({
        metricsScrapeToken: "x",
        dependencyStatus: vi.fn(async () => {
          throw new Error("synthetic dependency failure");
        }),
      }),
    );

    expect(authenticationError?.status).toBe(401);
    expect(notReady?.status).toBe(503);
    expect(dependencyFailure?.status).toBe(503);
  });

  it("shares an in-flight dependency diagnostic request", async () => {
    const readyStatus = {
      status: "READY" as const,
      dependencies: {
        postgres: "UP" as const,
        qdrant: "DISABLED" as const,
        ai: "DISABLED" as const,
      },
    };
    let resolveStatus: ((value: typeof readyStatus) => void) | undefined;
    const statusPromise = new Promise<typeof readyStatus>((resolve) => {
      resolveStatus = resolve;
    });
    const dependencyStatus = vi.fn(async () => statusPromise);
    const secured = dependencies({
      metricsScrapeToken: "x",
      dependencyStatus,
    });
    const first = routeHealthRequest(
      request("GET", "/health/dependencies", { authorization: "Bearer x" }),
      "request-health",
      secured,
    );
    const second = routeHealthRequest(
      request("GET", "/health/dependencies", { authorization: "Bearer x" }),
      "request-health",
      secured,
    );

    resolveStatus?.(readyStatus);
    await expect(first).resolves.toMatchObject({ status: 200 });
    await expect(second).resolves.toMatchObject({ status: 200 });
    expect(dependencyStatus).toHaveBeenCalledOnce();
  });
});

describe("HTTP metrics routes", () => {
  it("requires either the scrape token or an authorized principal", async () => {
    const unauthenticated = await routeMetricsRequest(
      request("GET", "/internal/metrics"),
      "request-health",
      dependencies({ metricsScrapeToken: "x" }),
    );
    const authorized = await routeMetricsRequest(
      request("GET", "/internal/metrics/prometheus", {
        authorization: "Bearer x",
      }),
      "request-health",
      dependencies({
        metricsScrapeToken: "x",
        observability: createObservability({
          service: "api",
          sink: () => undefined,
        }),
      }),
    );

    expect(unauthenticated?.status).toBe(401);
    expect(authorized?.status).toBe(200);
    expect(authorized?.rawContentType).toContain("text/plain");
  });

  it("returns null for non-metrics paths", async () => {
    const response = await routeMetricsRequest(
      request("GET", "/health/live"),
      "request-health",
      dependencies(),
    );

    expect(response).toBeNull();
  });

  it("supports the JSON metrics representation and rejects unsupported methods", async () => {
    const prometheus = vi.fn(() => "# HELP synthetic_metric 1\n");
    const baseObservability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    const dependenciesWithMetrics = dependencies({
      authenticate: vi.fn(async () => ({
        principalId: "administrator-1",
        accountStatus: "ACTIVE" as const,
        roles: ["ADMIN" as const],
        scopes: [],
      })),
      observability: {
        ...baseObservability,
        metrics: { ...baseObservability.metrics, prometheus },
      },
    });
    const json = await routeMetricsRequest(
      request("GET", "/internal/metrics"),
      "request-health",
      dependenciesWithMetrics,
    );
    const unsupported = await routeMetricsRequest(
      request("POST", "/internal/metrics"),
      "request-health",
      dependenciesWithMetrics,
    );
    const unavailable = await routeMetricsRequest(
      request("GET", "/internal/metrics"),
      "request-health",
      dependencies({
        authenticate: vi.fn(async () => ({
          principalId: "administrator-2",
          accountStatus: "ACTIVE" as const,
          roles: ["ADMIN" as const],
          scopes: [],
        })),
      }),
    );

    expect(json?.status).toBe(200);
    expect(json?.body).toMatchObject({ data: { format: "prometheus" } });
    expect(prometheus).toHaveBeenCalledOnce();
    expect(unsupported).toBeNull();
    expect(unavailable?.status).toBe(500);
  });
});
