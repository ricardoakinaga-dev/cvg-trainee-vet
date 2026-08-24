import { describe, expect, it, vi } from "vitest";

import { createObservability, type LogRecord } from "@cvg/observability";

import { createApiServer, requestOutcome, routeTemplate } from "./server.js";
import type { ApiHttpDependencies } from "./http.js";

const dependencies: ApiHttpDependencies = {
  requestIdFactory: () => "request-server-test",
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

describe("API node server adapter", () => {
  it("normalizes routes before telemetry and classifies response outcomes", () => {
    expect(requestOutcome(200)).toBe("success");
    expect(requestOutcome(404)).toBe("client_error");
    expect(requestOutcome(503)).toBe("server_error");

    expect(routeTemplate("GET", "/health/live")).toBe("/health/live");
    expect(routeTemplate("GET", "/health/ready")).toBe("/health/ready");
    expect(routeTemplate("GET", "/health/dependencies")).toBe(
      "/health/dependencies",
    );
    expect(routeTemplate("GET", "/internal/metrics")).toBe("/internal/metrics");
    expect(routeTemplate("GET", "/internal/operations")).toBe(
      "/internal/operations",
    );
    expect(routeTemplate("POST", "/api/v1/invitations/accept")).toBe(
      "/api/v1/invitations/accept",
    );
    expect(routeTemplate("POST", "/api/v1/recovery/accept")).toBe(
      "/api/v1/recovery/accept",
    );
    expect(
      routeTemplate("POST", "/api/v1/internal/accounts/account/recovery"),
    ).toBe("/api/v1/internal/accounts/:accountId/recovery");
    expect(routeTemplate("POST", "/api/v1/session/revoke")).toBe(
      "/api/v1/session/revoke",
    );
    expect(routeTemplate("POST", "/api/v1/session/rotate")).toBe(
      "/api/v1/session/rotate",
    );
    expect(routeTemplate("POST", "/api/v1/internal/invitations")).toBe(
      "/api/v1/internal/invitations",
    );
    expect(routeTemplate("POST", "/api/v1/internal/learning-assignments")).toBe(
      "/api/v1/internal/learning-assignments",
    );
    expect(
      routeTemplate(
        "POST",
        "/api/v1/internal/learning-assignments/assignment/transition",
      ),
    ).toBe("/api/v1/internal/learning-assignments/:assignmentId/transition");
    expect(routeTemplate("POST", "/api/v1/internal/assessment-workflows")).toBe(
      "/api/v1/internal/assessment-workflows",
    );
    expect(
      routeTemplate(
        "POST",
        "/api/v1/internal/assessment-workflows/result/transition",
      ),
    ).toBe("/api/v1/internal/assessment-workflows/:resultId/transition");
    expect(routeTemplate("POST", "/api/v1/feedback")).toBe("/api/v1/feedback");
    expect(routeTemplate("PATCH", "/api/v1/internal/feedback/ticket")).toBe(
      "/api/v1/internal/feedback/:ticketId",
    );
    expect(
      routeTemplate("GET", "/api/v1/internal/feedback/ticket/history"),
    ).toBe("/api/v1/internal/feedback/:ticketId/history");
    expect(routeTemplate("POST", "/api/v1/appeals")).toBe("/api/v1/appeals");
    expect(routeTemplate("POST", "/api/v1/content/drafts")).toBe(
      "/api/v1/content/drafts",
    );
    expect(routeTemplate("GET", "/api/v1/internal/appeals/review-queue")).toBe(
      "/api/v1/internal/appeals/review-queue",
    );
    expect(
      routeTemplate("POST", "/api/v1/internal/appeals/appeal/transition"),
    ).toBe("/api/v1/internal/appeals/:appealId/transition");
    expect(routeTemplate("POST", "/api/v1/attempts")).toBe("/api/v1/attempts");
    expect(routeTemplate("GET", "/api/v1/dashboard")).toBe("/api/v1/dashboard");
    expect(routeTemplate("GET", "/api/v1/audit")).toBe("/api/v1/audit");
    expect(
      routeTemplate("GET", "/api/v1/internal/reports/continuing-education"),
    ).toBe("/api/v1/internal/reports/continuing-education");
    expect(routeTemplate("GET", "/api/v1/internal/content/review-queue")).toBe(
      "/api/v1/internal/content/review-queue",
    );
    expect(routeTemplate("GET", "/api/v1/internal/session/scopes")).toBe(
      "/api/v1/internal/session/scopes",
    );
    expect(routeTemplate("GET", "/api/v1/activities/activity/progress")).toBe(
      "/api/v1/activities/:activityId/progress",
    );
    expect(routeTemplate("GET", "/api/v1/activities/activity")).toBe(
      "/api/v1/activities/:activityId",
    );
    expect(routeTemplate("GET", "/api/v1/curriculum/modules/M03/runtime")).toBe(
      "/api/v1/curriculum/modules/:moduleId/runtime",
    );
    expect(routeTemplate("POST", "/api/v1/attempts/attempt/answers")).toBe(
      "/api/v1/attempts/:attemptId/answers",
    );
    expect(routeTemplate("POST", "/api/v1/attempts/attempt/submit")).toBe(
      "/api/v1/attempts/:attemptId/submit",
    );
    expect(routeTemplate("GET", "/api/v1/attempts/attempt/feedback")).toBe(
      "/api/v1/attempts/:attemptId/feedback",
    );
    expect(
      routeTemplate("POST", "/api/v1/internal/attempts/attempt/correct"),
    ).toBe("/api/v1/internal/attempts/:attemptId/correct");
    expect(
      routeTemplate("POST", "/api/v1/internal/content/content/transition"),
    ).toBe("/api/v1/internal/content/:contentId/transition");
    expect(
      routeTemplate("POST", "/api/v1/internal/curriculum/modules/M03/evaluate"),
    ).toBe("/api/v1/internal/curriculum/modules/:moduleId/evaluate");
    expect(
      routeTemplate("POST", "/api/v1/internal/diagnostics/b07/evaluate"),
    ).toBe("/api/v1/internal/diagnostics/b07/evaluate");
    expect(
      routeTemplate("POST", "/api/v1/internal/diagnostics/result/assign"),
    ).toBe("/api/v1/internal/diagnostics/:diagnosticResultId/assign");
    expect(routeTemplate("DELETE", "/unknown")).toBe("unmatched");
  });

  it("rejects invalid server limits before binding a socket", () => {
    expect(() => createApiServer(dependencies, { port: -1 })).toThrow("port");
    expect(() => createApiServer(dependencies, { maxBodyBytes: 0 })).toThrow(
      "maxBodyBytes",
    );
  });

  it("serves JSON envelopes and enforces a bounded request body", async () => {
    const api = createApiServer(dependencies, { host: "127.0.0.1", port: 0 });
    await api.listen();

    try {
      const address = api.address();
      expect(address).not.toBeNull();
      if (address === null || typeof address === "string") return;

      const response = await fetch(
        `http://127.0.0.1:${address.port}/health/live`,
      );
      const body = (await response.json()) as {
        success: boolean;
        data: { status: string };
      };

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(body).toEqual({
        success: true,
        data: { status: "live" },
        meta: { request_id: "request-server-test" },
      });
    } finally {
      await api.close();
    }
  });

  it("records only route-level request telemetry with correlation", async () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "api",
      sink: (record) => records.push(record),
    });
    const api = createApiServer(
      { ...dependencies, observability },
      { host: "127.0.0.1", port: 0 },
    );
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/health/live`,
        { headers: { "x-correlation-id": "local-correlation-1" } },
      );

      expect(response.status).toBe(200);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        event: "http.request.completed",
        requestId: "request-server-test",
        correlationId: "local-correlation-1",
        fields: {
          method: "GET",
          route: "/health/live",
          status: 200,
          outcome: "success",
        },
      });
      expect(observability.metrics.snapshot().counters).toContainEqual(
        expect.objectContaining({
          name: "api.requests.total",
          value: 1,
          labels: {
            route: "/health/live",
            status: "200",
            outcome: "success",
          },
        }),
      );
      expect(JSON.stringify(records)).not.toContain("participantId");
    } finally {
      await api.close();
    }
  });

  it("serves dependency health and protects the Prometheus exporter", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    observability.metrics.increment("api.requests.total", {
      route: "/health/dependencies",
      status: "200",
      outcome: "success",
    });
    const api = createApiServer(
      {
        ...dependencies,
        observability,
        dependencyStatus: async () => ({
          status: "DEGRADED" as const,
          dependencies: {
            postgres: "UP" as const,
            qdrant: "DOWN" as const,
            ai: "DISABLED" as const,
          },
        }),
        authenticate: async (request) =>
          request.headers?.["x-test-auditor"] === "true"
            ? {
                principalId: "auditor-test",
                accountStatus: "ACTIVE" as const,
                roles: ["AUDITOR" as const],
                scopes: [],
              }
            : null,
      },
      { host: "127.0.0.1", port: 0 },
    );
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const health = await fetch(`${baseUrl}/health/dependencies`);
      const healthBody = (await health.json()) as {
        data: { status: string; dependencies: Record<string, string> };
      };
      const unauthenticated = await fetch(`${baseUrl}/internal/metrics`);
      const exported = await fetch(`${baseUrl}/internal/metrics`, {
        headers: { "x-test-auditor": "true" },
      });
      const operations = await fetch(`${baseUrl}/internal/operations`, {
        headers: { "x-test-auditor": "true" },
      });
      const operationsWithQuery = await fetch(
        `${baseUrl}/internal/operations?participantId=not-accepted`,
        { headers: { "x-test-auditor": "true" } },
      );
      const exportedBody = (await exported.json()) as {
        data: { format: string; text: string };
      };
      const operationsBody = (await operations.json()) as {
        data: { status: string; alerts: readonly unknown[] };
      };

      expect(health.status).toBe(200);
      expect(healthBody.data).toEqual({
        status: "DEGRADED",
        dependencies: { postgres: "UP", qdrant: "DOWN", ai: "DISABLED" },
      });
      expect(unauthenticated.status).toBe(401);
      expect(exported.status).toBe(200);
      expect(exportedBody.data.format).toBe("prometheus");
      expect(exportedBody.data.text).toContain("api_requests_total");
      expect(exportedBody.data.text).not.toContain("participant");
      expect(operations.status).toBe(200);
      expect(operationsWithQuery.status).toBe(422);
      expect(operationsBody.data.status).toBe("DEGRADED");
      expect(operationsBody.data.alerts).toEqual(
        expect.arrayContaining([
          { code: "qdrant_degraded", severity: "warning" },
        ]),
      );
    } finally {
      await api.close();
    }
  });

  it("rejects cross-origin session mutations before the application layer", async () => {
    const api = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      allowedOrigins: ["http://web.internal"],
    });
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/attempts`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: "__Host-cvg_session=session",
            origin: "https://untrusted.invalid",
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: "forbidden" },
      });
    } finally {
      await api.close();
    }
  });

  it("records an edge rejection without reading the protected body", async () => {
    const audit = { append: vi.fn(async () => undefined) };
    const protectedFixture = ["opaque", "audit", "fixture"].join("-");
    const api = createApiServer(
      {
        ...dependencies,
        requestIdFactory: () => "11111111-1111-4111-8111-111111111111",
        audit,
      },
      {
        host: "127.0.0.1",
        port: 0,
        allowedOrigins: ["http://web.internal"],
      },
    );
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/attempts`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: "__Host-cvg_session=session",
            origin: "https://untrusted.invalid",
          },
          body: JSON.stringify({ token: protectedFixture }),
        },
      );

      expect(response.status).toBe(403);
      expect(audit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          actorKind: "ANONYMOUS",
          resourceType: "http_route",
          resourceId: "/api/v1/attempts",
          outcome: "DENIED",
          reasonCode: "api_forbidden",
        }),
      );
      expect(JSON.stringify(audit.append.mock.calls[0])).not.toContain(
        protectedFixture,
      );
    } finally {
      await api.close();
    }
  });

  it("limits repeated non-health requests while keeping liveness available", async () => {
    const api = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      rateLimit: { maxRequests: 1, windowMs: 10_000 },
    });
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const url = `http://127.0.0.1:${address.port}/unknown`;
      const first = await fetch(url);
      const second = await fetch(url);
      const live = await fetch(`http://127.0.0.1:${address.port}/health/live`);

      expect(first.status).toBe(404);
      expect(second.status).toBe(429);
      expect(await second.json()).toMatchObject({
        success: false,
        error: { code: "rate_limited" },
      });
      expect(second.headers.get("retry-after")).toBe("10");
      expect(live.status).toBe(200);
    } finally {
      await api.close();
    }
  });

  it("turns malformed JSON into a public validation error", async () => {
    const api = createApiServer(dependencies, { host: "127.0.0.1", port: 0 });
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/attempts`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "not-json",
        },
      );
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: "validation_error" },
      });
    } finally {
      await api.close();
    }
  });
});
