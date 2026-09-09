import { describe, expect, it, vi } from "vitest";

import { ApplicationError } from "@cvg/application";
import { createObservability } from "@cvg/observability";

import { handleApiRequest, type ApiHttpDependencies } from "../http.js";
import { attempt, dependencies } from "./fixtures.js";

describe("API HTTP boundary — operational boundary", () => {
  it("returns a liveness envelope without touching dependencies", async () => {
    const healthcheck = vi.fn(async () => undefined);
    const response = await handleApiRequest(
      { method: "GET", path: "/health/live", body: undefined },
      dependencies({ healthcheck }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "live" },
    });
    expect(healthcheck).not.toHaveBeenCalled();
  });
  it("records a redacted anonymous rejection with a normalized route", async () => {
    const audit = { append: vi.fn(async () => undefined) };
    const protectedFixture = ["opaque", "audit", "fixture"].join("-");
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts/11111111-1111-4111-8111-111111111111/submit",
        route: "/api/v1/attempts/:attemptId/submit",
        body: { token: protectedFixture },
      },
      dependencies({
        requestIdFactory: () => "11111111-1111-4111-8111-111111111111",
        audit,
        authenticate: async () => null,
      }),
    );

    expect(response.status).toBe(401);
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorKind: "ANONYMOUS",
        action: "HTTP_REQUEST_REJECTED",
        resourceType: "http_route",
        resourceId: "/api/v1/attempts/:attemptId/submit",
        outcome: "DENIED",
        reasonCode: "api_unauthenticated",
      }),
    );
    expect(JSON.stringify(audit.append.mock.calls[0])).not.toContain(
      protectedFixture,
    );
  });
  it("records an authenticated rejection with an authorized session scope", async () => {
    const audit = { append: vi.fn(async () => undefined) };
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/audit",
        query: { scopeId: "scope-1" },
        body: undefined,
      },
      dependencies({
        audit,
        requestIdFactory: () => "11111111-1111-4111-8111-111111111111",
      }),
    );

    // Validation-first (ADV-2026-09-01 precedent): the non-UUID scopeId is
    // rejected as 422 before the unwired-port check — no wiring-state leak.
    expect(response.status).toBe(422);
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorKind: "AUTHENTICATED",
        principalId: attempt.participantId,
        scopeId: "scope-1",
        action: "HTTP_REQUEST_REJECTED",
      }),
    );
  });
  it("does not attach a body scope outside the session to a rejection audit", async () => {
    const audit = { append: vi.fn(async () => undefined) };
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/content/drafts",
        body: {
          scopeId: "99999999-9999-4999-8999-999999999999",
        },
      },
      dependencies({
        audit,
        requestIdFactory: () => "11111111-1111-4111-8111-111111111111",
      }),
    );

    // Validation-first (ADV-2026-09-01 precedent): malformed input returns
    // 422 even when the optional draft port is unwired — no wiring-state leak.
    expect(response.status).toBe(422);
    expect(audit.append).not.toHaveBeenCalled();
  });
  it("returns redacted dependency health and protects metrics export", async () => {
    const dependencyStatus = vi.fn(async () => ({
      status: "DEGRADED" as const,
      dependencies: {
        postgres: "UP" as const,
        qdrant: "DOWN" as const,
        ai: "DISABLED" as const,
      },
    }));
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    observability.metrics.increment("api.requests.total", {
      route: "/health/dependencies",
      outcome: "success",
    });

    const health = await handleApiRequest(
      { method: "GET", path: "/health/dependencies", body: undefined },
      dependencies({ dependencyStatus }),
    );
    expect(health).toMatchObject({
      status: 200,
      body: {
        success: true,
        data: {
          status: "DEGRADED",
          dependencies: { postgres: "UP", qdrant: "DOWN", ai: "DISABLED" },
        },
      },
    });
    expect(JSON.stringify(health)).not.toContain("secret");
    expect(dependencyStatus).toHaveBeenCalledOnce();

    const metrics = await handleApiRequest(
      { method: "GET", path: "/internal/metrics", body: undefined },
      dependencies({
        observability,
        authenticate: async () => ({
          principalId: "auditor-1",
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [],
        }),
      }),
    );
    expect(metrics).toMatchObject({
      status: 200,
      body: {
        success: true,
        data: { format: "prometheus" },
      },
    });
    expect(JSON.stringify(metrics)).toContain("api_requests_total");
    expect(JSON.stringify(metrics)).not.toContain("participant");

    const denied = await handleApiRequest(
      { method: "GET", path: "/internal/metrics", body: undefined },
      dependencies(),
    );
    expect(denied.status).toBe(403);
  });
  it("exposes a protected operational snapshot with explicit no-data alerts", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    observability.metrics.increment("api.requests.total", {
      route: "/api/v1/dashboard",
      status: "200",
      outcome: "success",
    });
    const dependencyStatus = vi.fn(async () => ({
      status: "DEGRADED" as const,
      dependencies: {
        postgres: "UP" as const,
        qdrant: "DOWN" as const,
        ai: "DISABLED" as const,
      },
    }));

    const response = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependencies({
        observability,
        dependencyStatus,
        authenticate: async () => ({
          principalId: "auditor-1",
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [],
        }),
      }),
    );

    expect(response).toMatchObject({
      status: 200,
      body: {
        success: true,
        data: {
          status: "DEGRADED",
          dependencies: { postgres: "UP", qdrant: "DOWN", ai: "DISABLED" },
          slos: [
            { id: "core.availability", status: "PASS" },
            { id: "api.read.p95", status: "NO_DATA" },
            { id: "api.mutation.p95", status: "NO_DATA" },
          ],
          alerts: [
            { code: "qdrant_degraded", severity: "warning" },
            { code: "slo_no_data", severity: "warning" },
            { code: "slo_no_data", severity: "warning" },
          ],
        },
      },
    });
    expect(dependencyStatus).toHaveBeenCalledOnce();
    expect(JSON.stringify(response)).not.toMatch(
      /participant|email|token|cookie|prompt|source|photo|pdf/iu,
    );
  });
  it("fails closed when an operational snapshot cannot authenticate or read dependencies", async () => {
    const unauthenticated = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependencies({ authenticate: async () => null }),
    );
    expect(unauthenticated.status).toBe(401);

    const forbidden = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependencies(),
    );
    expect(forbidden.status).toBe(403);

    const unavailable = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependencies({
        observability: createObservability({
          service: "api",
          sink: () => undefined,
        }),
        dependencyStatus: async () => {
          throw new Error("dependency details stay internal");
        },
        authenticate: async () => ({
          principalId: "auditor-1",
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [],
        }),
      }),
    );
    expect(unavailable.status).toBe(503);
    expect(JSON.stringify(unavailable)).not.toContain(
      "dependency details stay internal",
    );
  });
  it("maps ready and not-ready dependency states to explicit operational statuses", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    const authenticateAuditor = async () => ({
      principalId: "auditor-1",
      accountStatus: "ACTIVE" as const,
      roles: ["AUDITOR" as const],
      scopes: [],
    });
    const dependenciesFor = (
      status: "READY" | "NOT_READY",
    ): ApiHttpDependencies =>
      dependencies({
        observability,
        authenticate: authenticateAuditor,
        dependencyStatus: async () => ({
          status,
          dependencies: {
            postgres: status === "READY" ? ("UP" as const) : ("DOWN" as const),
            qdrant: "DISABLED" as const,
            ai: "DISABLED" as const,
          },
        }),
      });

    const ready = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependenciesFor("READY"),
    );
    const notReady = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependenciesFor("NOT_READY"),
    );

    expect(ready).toMatchObject({
      status: 200,
      body: { success: true, data: { status: "READY" } },
    });
    expect(notReady).toMatchObject({
      status: 503,
      body: {
        success: true,
        data: {
          status: "NOT_READY",
          alerts: expect.arrayContaining([
            { code: "postgres_not_ready", severity: "critical" },
          ]),
        },
      },
    });
  });
  it("rejects unexpected operational input and allowlists dependency redaction", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    const dependencyStatus = vi.fn(
      async () =>
        ({
          status: "READY",
          dependencies: {
            postgres: "UP",
            qdrant: "DISABLED",
            ai: "DISABLED",
            internalLeak: "must-not-publish",
          },
        }) as unknown as Awaited<
          ReturnType<NonNullable<ApiHttpDependencies["dependencyStatus"]>>
        >,
    );
    const auditor = async () => ({
      principalId: "auditor-1",
      accountStatus: "ACTIVE" as const,
      roles: ["AUDITOR" as const],
      scopes: [],
    });
    const base = dependencies({
      observability,
      dependencyStatus,
      authenticate: auditor,
    });
    const unexpectedQuery = await handleApiRequest(
      {
        method: "GET",
        path: "/internal/operations",
        query: { participantId: "not-accepted" },
        body: undefined,
      },
      base,
    );
    const unexpectedBody = await handleApiRequest(
      {
        method: "GET",
        path: "/internal/operations",
        body: {},
      },
      base,
    );

    expect(unexpectedQuery.status).toBe(422);
    expect(unexpectedBody.status).toBe(422);
    expect(dependencyStatus).not.toHaveBeenCalled();

    const valid = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      base,
    );
    expect(valid.status).toBe(200);
    expect(valid.body).toMatchObject({
      success: true,
      data: {
        dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
      },
    });
    expect(JSON.stringify(valid)).not.toContain("must-not-publish");
  });
  it("keeps authentication, not-found, and conflict errors bounded", async () => {
    const diagnosticResultId = "33333333-3333-4333-8333-333333333333";
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const request = {
      method: "POST" as const,
      path: `/api/v1/internal/diagnostics/${diagnosticResultId}/assign`,
      body: { scopeId },
    };
    const unauthenticatedAssignment = vi.fn();
    const unauthenticated = await handleApiRequest(
      request,
      dependencies({
        assignCurriculumFromDiagnostic: unauthenticatedAssignment,
        authenticate: async () => null,
      }),
    );
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticatedAssignment).not.toHaveBeenCalled();

    const notFoundAssignment = vi.fn(async () => {
      throw new ApplicationError("not_found", "synthetic missing result");
    });
    const notFound = await handleApiRequest(
      request,
      dependencies({
        assignCurriculumFromDiagnostic: notFoundAssignment,
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(notFound.status).toBe(404);
    expect(notFound.body).toMatchObject({
      success: false,
      error: { code: "not_found" },
    });

    const conflictAssignment = vi.fn(async () => {
      throw new ApplicationError("state_conflict", "synthetic conflict");
    });
    const conflict = await handleApiRequest(
      request,
      dependencies({
        assignCurriculumFromDiagnostic: conflictAssignment,
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body).toMatchObject({
      success: false,
      error: { code: "state_conflict" },
    });
  });
  it("returns readiness failure without exposing infrastructure details", async () => {
    const response = await handleApiRequest(
      { method: "GET", path: "/health/ready", body: undefined },
      dependencies({
        healthcheck: async () => {
          throw new Error("postgres password=secret");
        },
      }),
    );

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "internal_error" },
    });
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });
});
