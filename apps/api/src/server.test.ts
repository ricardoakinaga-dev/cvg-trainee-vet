import { describe, expect, it, vi } from "vitest";

import { createObservability, type LogRecord } from "@cvg/observability";

import { createApiRequestHandlerMethods } from "./server-http.js";
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
  it("composes the request handler immutably", () => {
    const methods = createApiRequestHandlerMethods({
      dependencies,
      allowedOrigins: ["http://127.0.0.1:3000"],
      maxBodyBytes: 1024,
      rateLimiter: { check: async () => ({ allowed: true, remaining: 1 }) },
      trustedProxyCidrs: [],
    });

    expect(Object.isFrozen(methods)).toBe(true);
    expect(Object.keys(methods)).toEqual(["handle"]);
  });

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
    expect(routeTemplate("GET", "/internal/metrics/prometheus")).toBe(
      "/internal/metrics/prometheus",
    );
    expect(routeTemplate("POST", "/api/v1/invitations/accept")).toBe(
      "/api/v1/invitations/accept",
    );
    expect(routeTemplate("POST", "/api/v1/auth/login")).toBe(
      "/api/v1/auth/login",
    );
    expect(routeTemplate("GET", "/api/v1/session")).toBe("/api/v1/session");
    expect(routeTemplate("POST", "/api/v1/account/password")).toBe(
      "/api/v1/account/password",
    );
    expect(routeTemplate("POST", "/api/v1/account/mfa/enrollment/verify")).toBe(
      "/api/v1/account/mfa/enrollment/verify",
    );
    expect(routeTemplate("POST", "/api/v1/account/recovery/complete")).toBe(
      "/api/v1/account/recovery/complete",
    );
    expect(routeTemplate("POST", "/api/v1/session/revoke")).toBe(
      "/api/v1/session/revoke",
    );
    expect(routeTemplate("POST", "/api/v1/session/rotate")).toBe(
      "/api/v1/session/rotate",
    );
    expect(routeTemplate("POST", "/api/v1/internal/invitations")).toBe(
      "/api/v1/internal/invitations",
    );
    expect(routeTemplate("GET", "/api/v1/internal/admin/dashboard")).toBe(
      "/api/v1/internal/admin/dashboard",
    );
    expect(routeTemplate("GET", "/api/v1/internal/moderator/dashboard")).toBe(
      "/api/v1/internal/moderator/dashboard",
    );
    expect(routeTemplate("GET", "/api/v1/internal/admin/operations")).toBe(
      "/api/v1/internal/admin/operations",
    );
    expect(
      routeTemplate("POST", "/api/v1/internal/assessment-recalculations"),
    ).toBe("/api/v1/internal/assessment-recalculations");
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
    expect(routeTemplate("GET", "/api/v1/feedback")).toBe("/api/v1/feedback");
    expect(routeTemplate("PATCH", "/api/v1/internal/feedback/ticket")).toBe(
      "/api/v1/internal/feedback/:ticketId",
    );
    expect(routeTemplate("POST", "/api/v1/appeals")).toBe("/api/v1/appeals");
    expect(
      routeTemplate("POST", "/api/v1/internal/appeals/appeal/transition"),
    ).toBe("/api/v1/internal/appeals/:appealId/transition");
    expect(routeTemplate("POST", "/api/v1/attempts")).toBe("/api/v1/attempts");
    expect(routeTemplate("GET", "/api/v1/activities/activity/progress")).toBe(
      "/api/v1/activities/:activityId/progress",
    );
    expect(routeTemplate("GET", "/api/v1/activities/activity")).toBe(
      "/api/v1/activities/:activityId",
    );
    expect(routeTemplate("GET", "/api/v1/curriculum/modules/M03/runtime")).toBe(
      "/api/v1/curriculum/modules/:moduleId/runtime",
    );
    expect(routeTemplate("GET", "/api/v1/curriculum/modules/M24/case")).toBe(
      "/api/v1/curriculum/modules/:moduleId/case",
    );
    expect(
      routeTemplate("POST", "/api/v1/curriculum/modules/M24/case/advance"),
    ).toBe("/api/v1/curriculum/modules/:moduleId/case/advance");
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
      routeTemplate("POST", "/api/v1/internal/content/content/review"),
    ).toBe("/api/v1/internal/content/:contentId/review");
    expect(
      routeTemplate("GET", "/api/v1/internal/authoring/review-queue"),
    ).toBe("/api/v1/internal/authoring/review-queue");
    expect(
      routeTemplate("POST", "/api/v1/internal/curriculum/modules/M03/evaluate"),
    ).toBe("/api/v1/internal/curriculum/modules/:moduleId/evaluate");
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

  it("forwards the clinical review queue query without putting it in the route label", async () => {
    const getClinicalReviewQueue = vi.fn(async (_scopeId, query) => ({
      items: [],
      page: query.page,
      perPage: query.perPage,
      total: 0,
    }));
    const api = createApiServer(
      {
        ...dependencies,
        authenticate: async () => ({
          principalId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          accountStatus: "ACTIVE" as const,
          roles: ["CLINICAL_APPROVER" as const],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getClinicalReviewQueue,
      },
      { host: "127.0.0.1", port: 0 },
    );
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/internal/authoring/review-queue?scopeId=11111111-1111-4111-8111-111111111111&page=2&per_page=10&status=PENDING`,
      );
      expect(response.status).toBe(200);
      expect(getClinicalReviewQueue).toHaveBeenCalledWith(
        "11111111-1111-4111-8111-111111111111",
        { page: 2, perPage: 10, status: "PENDING" },
      );
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
        metricsScrapeToken: "x",
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
      const health = await fetch(`${baseUrl}/health/dependencies`, {
        headers: { authorization: "Bearer x" },
      });
      const healthBody = (await health.json()) as {
        data: { status: string; dependencies: Record<string, string> };
      };
      const unauthenticated = await fetch(`${baseUrl}/internal/metrics`);
      const exported = await fetch(`${baseUrl}/internal/metrics`, {
        headers: { "x-test-auditor": "true" },
      });
      const scraped = await fetch(`${baseUrl}/internal/metrics/prometheus`, {
        headers: { "x-test-auditor": "true" },
      });
      const exportedBody = (await exported.json()) as {
        data: { format: string; text: string };
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
      expect(scraped.status).toBe(200);
      expect(scraped.headers.get("content-type")).toContain("text/plain");
      expect(await scraped.text()).toContain("api_requests_total");
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

  it("uses forwarded client addresses only from configured trusted proxies", async () => {
    const untrustedKeys: string[] = [];
    const untrustedApi = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      rateLimiter: {
        check: async (key) => {
          untrustedKeys.push(key);
          return { allowed: true, remaining: 1 };
        },
      },
    });
    await untrustedApi.listen();

    try {
      const address = untrustedApi.address();
      if (address === null || typeof address === "string") return;
      await fetch(`http://127.0.0.1:${address.port}/unknown`, {
        headers: { "x-forwarded-for": "203.0.113.9" },
      });
      expect(untrustedKeys).toEqual(["127.0.0.1|unmatched"]);
    } finally {
      await untrustedApi.close();
    }

    const trustedKeys: string[] = [];
    const trustedApi = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      trustedProxyCidrs: ["127.0.0.1/32", "127.0.0.2/32"],
      rateLimiter: {
        check: async (key) => {
          trustedKeys.push(key);
          return { allowed: true, remaining: 1 };
        },
      },
    });
    await trustedApi.listen();

    try {
      const address = trustedApi.address();
      if (address === null || typeof address === "string") return;
      await fetch(`http://127.0.0.1:${address.port}/unknown`, {
        headers: {
          "x-forwarded-for": "203.0.113.9, 127.0.0.2",
        },
      });
      expect(trustedKeys).toEqual(["203.0.113.9|unmatched"]);
    } finally {
      await trustedApi.close();
    }
  });

  it("rejects invalid trusted proxy CIDRs before binding a socket", () => {
    expect(() =>
      createApiServer(dependencies, { trustedProxyCidrs: ["not-an-ip"] }),
    ).toThrow("trustedProxyCidrs");
  });

  it("returns a bounded dependency error when rate limiting fails", async () => {
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandledRejections.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);
    const api = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      rateLimiter: {
        check: async () => {
          throw new Error("rate limiter unavailable");
        },
      },
    });
    await api.listen();
    const abortController = new AbortController();
    const abortTimer = setTimeout(() => abortController.abort(), 300);

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(`http://127.0.0.1:${address.port}/unknown`, {
        signal: abortController.signal,
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: "internal_error" },
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(unhandledRejections).toEqual([]);
    } finally {
      clearTimeout(abortTimer);
      abortController.abort();
      process.off("unhandledRejection", onUnhandledRejection);
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

  it("rejects content-length values above the configured body limit", async () => {
    const api = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      maxBodyBytes: 4,
    });
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const oversizedLength = await fetch(`${baseUrl}/api/v1/attempts`, {
        method: "POST",
        headers: { "content-length": "999" },
        body: "x".repeat(999),
      });

      expect(oversizedLength.status).toBe(422);
    } finally {
      await api.close();
    }
  });

  it("records a valid traceparent and omits retry-after when unavailable", async () => {
    const observability = createObservability({ service: "api" });
    const api = createApiServer(
      { ...dependencies, observability },
      {
        host: "127.0.0.1",
        port: 0,
        rateLimiter: {
          check: async () => ({ allowed: false, remaining: 0 }),
        },
      },
    );
    await api.listen();

    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/health/live`,
        {
          headers: {
            traceparent: `00-${"a".repeat(32)}-${"b".repeat(16)}-01`,
          },
        },
      );
      expect(response.status).toBe(200);
      expect(observability.traces.snapshot()).toContainEqual(
        expect.objectContaining({
          traceId: "a".repeat(32),
          parentSpanId: "b".repeat(16),
        }),
      );

      const limited = await fetch(`http://127.0.0.1:${address.port}/unknown`);
      expect(limited.status).toBe(429);
      expect(limited.headers.get("retry-after")).toBeNull();
    } finally {
      await api.close();
    }
  });
});
