import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it, vi } from "vitest";

import {
  createObservability,
  deriveOperationalSnapshot,
  type LogRecord,
} from "@cvg/observability";
import * as http from "./http.js";

import { createApiServer, requestOutcome, routeTemplate } from "./server.js";
import type { ApiHttpDependencies } from "./http.js";
import { createApiRuntimeLifecycle } from "./composition/api-runtime-lifecycle.js";

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
  it.each([true, false])(
    "T23 drains disconnected readiness callback success=%s before resources",
    async (success) => {
      let release!: () => void;
      let enter!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const entered = new Promise<void>((resolve) => {
        enter = resolve;
      });
      const order: string[] = [];
      const server = createApiServer(
        {
          ...dependencies,
          healthcheck: async () => {
            enter();
            await held;
            order.push("callback.done");
            if (!success) throw new Error("synthetic readiness failure");
          },
          observability: createObservability({
            service: "api",
            sink: (record) => order.push(record.event),
          }),
        },
        { host: "127.0.0.1", port: 0 },
      );
      const resources = vi.fn(async () => {
        order.push("resources.close");
      });
      const runtime = createApiRuntimeLifecycle({
        listen: server.listen,
        beginInitialization: () => undefined,
        cancelInitialization: () => undefined,
        awaitInitialization: async () => undefined,
        closeServer: server.close,
        closeIntegrations: resources,
      });
      await runtime.listen();
      const client = request({
        host: "127.0.0.1",
        port: (server.address() as AddressInfo).port,
        path: "/health/ready",
        agent: false,
      });
      client.on("error", () => undefined);
      client.end();
      await entered;
      const disconnected = new Promise<void>((resolve) =>
        client.once("close", resolve),
      );
      client.destroy();
      await disconnected;
      const closing = runtime.close();
      try {
        await new Promise<void>((resolve) => setImmediate(resolve));
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(resources).not.toHaveBeenCalled();
        release();
        await closing;
        expect(order).toEqual([
          "callback.done",
          "http.request.completed",
          "resources.close",
        ]);
        expect(resources).toHaveBeenCalledTimes(1);
      } finally {
        release();
        client.destroy();
        await closing;
      }
    },
  );
  it("T23 shares shutdown and refuses reopening the listener", async () => {
    const api = createApiServer(dependencies, { host: "127.0.0.1", port: 0 });
    await api.listen();
    const first = api.close();
    const second = api.close();
    try {
      expect(first).toBe(second);
      await first;
      await expect(api.listen()).rejects.toThrow(/closing/u);
    } finally {
      await api.close();
    }
  });
  it("T23 exports the last admitted HTTP span after request drain", async () => {
    const exported: unknown[] = [];
    const collector = createServer((request, response) => {
      let text = "";
      request.on("data", (chunk) => {
        text += chunk;
      });
      request.on("end", () => {
        exported.push(JSON.parse(text));
        response.end("{}");
      });
    });
    await new Promise<void>((resolve) =>
      collector.listen(0, "127.0.0.1", resolve),
    );
    let release!: () => void;
    let entered!: () => void;
    const admitted = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blocking = new Promise<void>((resolve) => {
      release = resolve;
    });
    const api = createApiServer(
      {
        ...dependencies,
        healthcheck: async () => {
          entered();
          await blocking;
        },
      },
      {
        host: "127.0.0.1",
        port: 0,
        tracing: {
          enabled: true,
          endpoint: `http://127.0.0.1:${(collector.address() as AddressInfo).port}/v1/traces`,
          timeoutMs: 500,
        },
      },
    );
    await api.listen();
    try {
      const pending = fetch(
        `http://127.0.0.1:${(api.address() as AddressInfo).port}/health/ready`,
      );
      await admitted;
      const closing = api.close();
      release();
      const response = await pending;
      expect(response.status).toBe(200);
      await response.text();
      await closing;
      const spans = exported.flatMap((batch) =>
        (
          batch as {
            resourceSpans: Array<{
              scopeSpans: Array<{ spans: Array<{ name: string }> }>;
            }>;
          }
        ).resourceSpans.flatMap((resource) =>
          resource.scopeSpans.flatMap((scope) => scope.spans),
        ),
      );
      expect(spans).toContainEqual(
        expect.objectContaining({ name: "HTTP GET /health/ready" }),
      );
    } finally {
      release();
      await api.close();
      await new Promise<void>((resolve) => collector.close(() => resolve()));
    }
  });
  it("selects typed risk metadata from the registry and ignores client class hints and unmatched prefixes", async () => {
    const check = vi.fn(async () => ({ allowed: true, remaining: 1 }));
    const api = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      rateLimiter: { check },
    });
    await api.listen();
    try {
      const address = api.address();
      if (address === null || typeof address === "string")
        throw new Error("missing listener");
      const origin = `http://127.0.0.1:${address.port}`;
      for (const [path, method, riskClass] of [
        [
          "/api/v1/invitations/accept?riskClass=public-low-risk",
          "POST",
          "authentication",
        ],
        ["/api/v1/recovery/accept", "POST", "recovery"],
        ["/api/v1/attempts", "POST", "mutation"],
        ["/api/v1/learning-path", "GET", "expensive-read"],
        ["/api/v1/recovery/accept/unknown", "POST", "expensive-read"],
      ] as const) {
        const response = await fetch(origin + path, {
          method,
          headers: { "x-rate-limit-risk-class": "public-low-risk" },
          ...(method === "POST" ? { body: "{}" } : {}),
        });
        await response.text();
        expect(check).toHaveBeenLastCalledWith(
          expect.any(String),
          undefined,
          riskClass,
        );
      }
      const calls = check.mock.calls.length;
      for (const path of [
        "/health/live",
        "/health/ready",
        "/health/dependencies",
      ]) {
        const response = await fetch(origin + path);
        await response.text();
      }
      expect(check.mock.calls).toHaveLength(calls);
    } finally {
      await api.close();
    }
  });

  it("connects successful HTTP reads and mutations to SLOs without changing legacy series", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    let now = 1_000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(http, "handleApiRequest").mockImplementation(async (request) => {
      now += request.method === "GET" ? 400 : 2_000;
      return {
        status: 200,
        body: { success: true, data: {}, meta: { request_id: "slo-test" } },
      };
    });
    const api = createApiServer(
      { ...dependencies, observability },
      {
        host: "127.0.0.1",
        port: 0,
        allowedOrigins: ["http://localhost"],
      },
    );
    await api.listen();
    try {
      const address = api.address() as AddressInfo;
      for (const method of ["GET", "POST"]) {
        const response = await fetch(
          `http://127.0.0.1:${address.port}/api/v1/feedback`,
          {
            method,
            headers: { origin: "http://localhost" },
          },
        );
        expect(response.status).toBe(200);
        await response.text();
      }
      const metrics = observability.metrics.snapshot();
      expect(
        metrics.histograms.filter(
          (item) => item.name === "api.slo.duration_ms",
        ),
      ).toEqual([
        expect.objectContaining({
          count: 1,
          sum: 400,
          labels: { operation: "read" },
        }),
        expect.objectContaining({
          count: 1,
          sum: 2_000,
          labels: { operation: "mutation" },
        }),
      ]);
      expect(metrics.histograms).toContainEqual(
        expect.objectContaining({
          name: "api.request.duration_ms",
          count: 2,
          sum: 2_400,
          labels: { route: "/api/v1/feedback" },
        }),
      );
      expect(metrics.histograms).toContainEqual(
        expect.objectContaining({
          name: "http_request_duration_seconds",
          count: 2,
          sum: 2.4,
          labels: { route: "/api/v1/feedback" },
        }),
      );
      const slos = deriveOperationalSnapshot("READY", metrics).slos;
      expect(slos[1]).toMatchObject({ status: "PASS", observed: 395 });
      expect(slos[2]).toMatchObject({ status: "BREACHED", observed: 1_975 });
    } finally {
      await api.close();
    }
  });

  it("measures request duration with a monotonic clock under clock jumps", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    let monotonicNow = 50_000;
    let civilNow = Date.now();
    vi.spyOn(performance, "now").mockImplementation(() => monotonicNow);
    vi.spyOn(Date, "now").mockImplementation(() => civilNow);
    vi.spyOn(http, "handleApiRequest").mockImplementation(async () => {
      monotonicNow += 400;
      return {
        status: 200,
        body: { success: true, data: {}, meta: { request_id: "jump-test" } },
      };
    });
    const api = createApiServer(
      { ...dependencies, observability },
      { host: "127.0.0.1", port: 0 },
    );
    await api.listen();
    try {
      const address = api.address() as AddressInfo;
      const first = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/feedback`,
      );
      expect(first.status).toBe(200);
      await first.text();
      civilNow -= 60_000;
      const second = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/feedback`,
      );
      expect(second.status).toBe(200);
      await second.text();
      civilNow += 120_000;
      const third = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/feedback`,
      );
      expect(third.status).toBe(200);
      await third.text();

      const durations = observability.metrics
        .snapshot()
        .histograms.filter(
          (item) =>
            item.name === "api.request.duration_ms" &&
            item.labels.route === "/api/v1/feedback",
        );
      expect(durations).toHaveLength(1);
      expect(durations[0]).toMatchObject({ count: 3, sum: 1_200 });
    } finally {
      await api.close();
    }
  });

  it("excludes SLO observation for health, unmatched and error responses", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    const api = createApiServer(
      { ...dependencies, observability },
      { host: "127.0.0.1", port: 0 },
    );
    await api.listen();
    try {
      const address = api.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      await fetch(`${baseUrl}/health/live`);
      await fetch(`${baseUrl}/unknown`);
      const failed = await fetch(`${baseUrl}/api/v1/dashboard`);
      expect(failed.status).toBe(401);
      await failed.text();

      expect(
        observability.metrics
          .snapshot()
          .histograms.filter((item) => item.name === "api.slo.duration_ms"),
      ).toHaveLength(0);
    } finally {
      await api.close();
    }
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
    expect(routeTemplate("GET", "/api/v1/session/current")).toBe(
      "/api/v1/session/current",
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
      routeTemplate(
        "PATCH",
        "/api/v1/internal/feedback/ticket/triage-metadata",
      ),
    ).toBe("/api/v1/internal/feedback/:ticketId/triage-metadata");
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
      routeTemplate("GET", "/api/v1/internal/appeals/appeal/impact-preview"),
    ).toBe("/api/v1/internal/appeals/:appealId/impact-preview");
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
    expect(routeTemplate("POST", "/api/v1/diagnostics/b07/sessions")).toBe(
      "/api/v1/diagnostics/b07/sessions",
    );
    expect(
      routeTemplate("GET", "/api/v1/diagnostics/b07/sessions/current"),
    ).toBe("/api/v1/diagnostics/b07/sessions/current");
    expect(
      routeTemplate(
        "PUT",
        "/api/v1/diagnostics/b07/sessions/session/answers/item",
      ),
    ).toBe("/api/v1/diagnostics/b07/sessions/:sessionId/answers/:itemId");
    expect(
      routeTemplate(
        "POST",
        "/api/v1/diagnostics/b07/sessions/session/finalize",
      ),
    ).toBe("/api/v1/diagnostics/b07/sessions/:sessionId/finalize");
    expect(
      routeTemplate("GET", "/api/v1/diagnostics/b07/sessions/session"),
    ).toBe("/api/v1/diagnostics/b07/sessions/:sessionId");
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

      const duplicateQueryResponse = await fetch(
        `http://127.0.0.1:${address.port}/health/live?probe=one&probe=two`,
      );
      expect(duplicateQueryResponse.status).toBe(422);
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

  it("exports root spans and correlates logs when tracing is enabled", async () => {
    const exported: unknown[] = [];
    const collector = createServer((request, response) => {
      let text = "";
      request.on("data", (chunk) => {
        text += chunk;
      });
      request.on("end", () => {
        exported.push(JSON.parse(text));
        response.statusCode = 200;
        response.end("{}");
      });
    });
    await new Promise<void>((resolve) =>
      collector.listen(0, "127.0.0.1", resolve),
    );
    const collectorPort = (collector.address() as AddressInfo).port;
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "api",
      sink: (record) => records.push(record),
    });
    const api = createApiServer(
      { ...dependencies, observability },
      {
        host: "127.0.0.1",
        port: 0,
        tracing: {
          enabled: true,
          endpoint: `http://127.0.0.1:${collectorPort}/v1/traces`,
          serviceName: "cvg-api-test",
          timeoutMs: 2_000,
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
            traceparent:
              "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
          },
        },
      );
      expect(response.status).toBe(200);
      await api.close();

      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        traceId: "0af7651916cd43dd8448eb211c80319c",
      });
      expect(records[0]?.spanId).toMatch(/^[0-9a-f]{16}$/);
      expect(exported).toHaveLength(1);
      const spans = (
        exported[0] as {
          resourceSpans: Array<{
            scopeSpans: Array<{
              spans: Array<{
                traceId: string;
                parentSpanId: string;
                name: string;
              }>;
            }>;
          }>;
        }
      ).resourceSpans[0]?.scopeSpans[0]?.spans;
      expect(spans).toHaveLength(1);
      expect(spans?.[0]).toMatchObject({
        traceId: "0af7651916cd43dd8448eb211c80319c",
        parentSpanId: "b7ad6b7169203331",
        name: "HTTP GET /health/live",
      });
      expect(observability.metrics.snapshot().counters).toContainEqual(
        expect.objectContaining({ name: "http_requests_total" }),
      );
    } finally {
      await api.close();
      await new Promise<void>((resolve) => collector.close(() => resolve()));
    }
  });

  it("keeps serving traffic when the trace collector is down", async () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "api",
      sink: (record) => records.push(record),
    });
    const api = createApiServer(
      { ...dependencies, observability },
      {
        host: "127.0.0.1",
        port: 0,
        tracing: {
          enabled: true,
          endpoint: "http://127.0.0.1:1/v1/traces",
          timeoutMs: 50,
        },
      },
    );
    await api.listen();
    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/health/live`,
      );
      expect(response.status).toBe(200);
      expect(records).toHaveLength(1);
      expect(records[0]?.traceId).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      await api.close();
    }
  });

  it("drains in-flight requests on close instead of severing them", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    let releaseHealthcheck!: () => void;
    const healthcheckGate = new Promise<void>((resolve) => {
      releaseHealthcheck = resolve;
    });
    let enteredHealthcheck!: () => void;
    const enteredGate = new Promise<void>((resolve) => {
      enteredHealthcheck = resolve;
    });
    const api = createApiServer(
      {
        ...dependencies,
        observability,
        healthcheck: async () => {
          enteredHealthcheck();
          await healthcheckGate;
        },
      },
      { host: "127.0.0.1", port: 0 },
    );
    await api.listen();
    const address = api.address();
    if (address === null || typeof address === "string") return;
    try {
      const pending = fetch(`http://127.0.0.1:${address.port}/health/ready`);
      await enteredGate;
      const closing = api.close();
      releaseHealthcheck();
      const response = await pending;
      await closing;
      expect(response.status).toBe(200);
    } finally {
      releaseHealthcheck();
      await api.close();
    }
  });

  it("emits effective security headers without HSTS outside production", async () => {
    const api = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
    });
    await api.listen();
    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/health/live`,
      );
      expect(response.headers.get("content-security-policy")).toContain(
        "frame-ancestors 'none'",
      );
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("referrer-policy")).toBe("same-origin");
      expect(response.headers.get("permissions-policy")).toContain("camera=()");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
      expect(response.headers.get("strict-transport-security")).toBeNull();
    } finally {
      await api.close();
    }
  });

  it("emits HSTS when production HTTPS is declared", async () => {
    const api = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      securityHeaders: "production",
    });
    await api.listen();
    try {
      const address = api.address();
      if (address === null || typeof address === "string") return;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/health/live`,
      );
      expect(response.headers.get("strict-transport-security")).toContain(
        "max-age=",
      );
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

  it("ignores spoofed forwarded headers unless the proxy is trusted", async () => {
    const untrusted = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      rateLimit: { maxRequests: 1, windowMs: 10_000 },
    });
    await untrusted.listen();
    try {
      const address = untrusted.address();
      if (address === null || typeof address === "string") return;
      const url = `http://127.0.0.1:${address.port}/unknown`;
      await fetch(url, { headers: { "x-forwarded-for": "198.51.100.9" } });
      const spoofed = await fetch(url, {
        headers: { "x-forwarded-for": "192.0.2.5" },
      });
      expect(spoofed.status).toBe(429);
    } finally {
      await untrusted.close();
    }

    const trusted = createApiServer(dependencies, {
      host: "127.0.0.1",
      port: 0,
      rateLimit: { maxRequests: 1, windowMs: 10_000 },
      trustedProxies: ["127.0.0.1"],
    });
    await trusted.listen();
    try {
      const address = trusted.address();
      if (address === null || typeof address === "string") return;
      const url = `http://127.0.0.1:${address.port}/unknown`;
      await fetch(url, { headers: { "x-forwarded-for": "198.51.100.9" } });
      const distinct = await fetch(url, {
        headers: { "x-forwarded-for": "192.0.2.5" },
      });
      expect(distinct.status).toBe(404);
    } finally {
      await trusted.close();
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
