import { describe, expect, it } from "vitest";

import { CAPABILITIES } from "@cvg/application";

import { routeTemplate } from "../server.js";
import { ROUTE_REGISTRY, matchRoute } from "./route-registry.js";

type CorpusRow = Readonly<{
  readonly method: string;
  readonly path: string;
  readonly template: string;
}>;

const CORPUS: readonly CorpusRow[] = [
  { method: "GET", path: "/health/live", template: "/health/live" },
  { method: "GET", path: "/health/ready", template: "/health/ready" },
  {
    method: "GET",
    path: "/health/dependencies",
    template: "/health/dependencies",
  },
  { method: "GET", path: "/internal/metrics", template: "/internal/metrics" },
  {
    method: "GET",
    path: "/internal/operations",
    template: "/internal/operations",
  },
  {
    method: "POST",
    path: "/api/v1/invitations/accept",
    template: "/api/v1/invitations/accept",
  },
  {
    method: "POST",
    path: "/api/v1/recovery/accept",
    template: "/api/v1/recovery/accept",
  },
  {
    method: "POST",
    path: "/api/v1/session/revoke",
    template: "/api/v1/session/revoke",
  },
  {
    method: "GET",
    path: "/api/v1/session/current",
    template: "/api/v1/session/current",
  },
  {
    method: "POST",
    path: "/api/v1/session/rotate",
    template: "/api/v1/session/rotate",
  },
  {
    method: "POST",
    path: "/api/v1/internal/invitations",
    template: "/api/v1/internal/invitations",
  },
  {
    method: "PATCH",
    path: "/api/v1/internal/accounts/acc-1/status",
    template: "/api/v1/internal/accounts/:accountId/status",
  },
  {
    method: "POST",
    path: "/api/v1/internal/accounts/acc-1/invitation",
    template: "/api/v1/internal/accounts/:accountId/invitation",
  },
  {
    method: "POST",
    path: "/api/v1/internal/accounts/acc-1/recovery",
    template: "/api/v1/internal/accounts/:accountId/recovery",
  },
  {
    method: "POST",
    path: "/api/v1/internal/learning-assignments",
    template: "/api/v1/internal/learning-assignments",
  },
  {
    method: "POST",
    path: "/api/v1/internal/learning-assignments/a-1/transition",
    template: "/api/v1/internal/learning-assignments/:assignmentId/transition",
  },
  {
    method: "POST",
    path: "/api/v1/internal/assessment-workflows",
    template: "/api/v1/internal/assessment-workflows",
  },
  {
    method: "POST",
    path: "/api/v1/internal/assessment-workflows/r-1/transition",
    template: "/api/v1/internal/assessment-workflows/:resultId/transition",
  },
  {
    method: "POST",
    path: "/api/v1/feedback",
    template: "/api/v1/feedback",
  },
  {
    method: "GET",
    path: "/api/v1/feedback",
    template: "/api/v1/feedback",
  },
  {
    method: "PATCH",
    path: "/api/v1/internal/feedback/t-1",
    template: "/api/v1/internal/feedback/:ticketId",
  },
  {
    method: "PATCH",
    path: "/api/v1/internal/feedback/t-1/triage-metadata",
    template: "/api/v1/internal/feedback/:ticketId/triage-metadata",
  },
  {
    method: "GET",
    path: "/api/v1/internal/feedback/t-1/history",
    template: "/api/v1/internal/feedback/:ticketId/history",
  },
  {
    method: "GET",
    path: "/api/v1/internal/feedback",
    template: "/api/v1/internal/feedback",
  },
  {
    method: "GET",
    path: "/api/v1/appeals",
    template: "/api/v1/appeals",
  },
  {
    method: "POST",
    path: "/api/v1/appeals",
    template: "/api/v1/appeals",
  },
  {
    method: "GET",
    path: "/api/v1/internal/appeals/ap-1/history",
    template: "/api/v1/internal/appeals/:appealId/history",
  },
  {
    method: "GET",
    path: "/api/v1/internal/appeals/ap-1/impact-preview",
    template: "/api/v1/internal/appeals/:appealId/impact-preview",
  },
  {
    method: "POST",
    path: "/api/v1/internal/appeals/ap-1/transition",
    template: "/api/v1/internal/appeals/:appealId/transition",
  },
  {
    method: "POST",
    path: "/api/v1/attempts",
    template: "/api/v1/attempts",
  },
  {
    method: "GET",
    path: "/api/v1/learning-path",
    template: "/api/v1/learning-path",
  },
  {
    method: "GET",
    path: "/api/v1/dashboard",
    template: "/api/v1/dashboard",
  },
  {
    method: "GET",
    path: "/api/v1/audit",
    template: "/api/v1/audit",
  },
  {
    method: "GET",
    path: "/api/v1/internal/reports/continuing-education",
    template: "/api/v1/internal/reports/continuing-education",
  },
  {
    method: "GET",
    path: "/api/v1/internal/reports/reflections",
    template: "/api/v1/internal/reports/reflections",
  },
  {
    method: "GET",
    path: "/api/v1/internal/content/review-queue",
    template: "/api/v1/internal/content/review-queue",
  },
  {
    method: "POST",
    path: "/api/v1/content/drafts",
    template: "/api/v1/content/drafts",
  },
  {
    method: "GET",
    path: "/api/v1/internal/appeals/review-queue",
    template: "/api/v1/internal/appeals/review-queue",
  },
  {
    method: "GET",
    path: "/api/v1/internal/session/scopes",
    template: "/api/v1/internal/session/scopes",
  },
  {
    method: "POST",
    path: "/api/v1/diagnostics/b07/sessions",
    template: "/api/v1/diagnostics/b07/sessions",
  },
  {
    method: "GET",
    path: "/api/v1/diagnostics/b07/sessions/current",
    template: "/api/v1/diagnostics/b07/sessions/current",
  },
  {
    method: "PUT",
    path: "/api/v1/diagnostics/b07/sessions/s-1/answers/i-1",
    template: "/api/v1/diagnostics/b07/sessions/:sessionId/answers/:itemId",
  },
  {
    method: "POST",
    path: "/api/v1/diagnostics/b07/sessions/s-1/finalize",
    template: "/api/v1/diagnostics/b07/sessions/:sessionId/finalize",
  },
  {
    method: "GET",
    path: "/api/v1/diagnostics/b07/sessions/s-1",
    template: "/api/v1/diagnostics/b07/sessions/:sessionId",
  },
  {
    method: "GET",
    path: "/api/v1/activities/act-1",
    template: "/api/v1/activities/:activityId",
  },
  {
    method: "GET",
    path: "/api/v1/activities/act-1/progress",
    template: "/api/v1/activities/:activityId/progress",
  },
  {
    method: "GET",
    path: "/api/v1/curriculum/modules/m-1/runtime",
    template: "/api/v1/curriculum/modules/:moduleId/runtime",
  },
  {
    method: "POST",
    path: "/api/v1/attempts/att-1/answers",
    template: "/api/v1/attempts/:attemptId/answers",
  },
  {
    method: "POST",
    path: "/api/v1/attempts/att-1/submit",
    template: "/api/v1/attempts/:attemptId/submit",
  },
  {
    method: "GET",
    path: "/api/v1/attempts/att-1/feedback",
    template: "/api/v1/attempts/:attemptId/feedback",
  },
  {
    method: "POST",
    path: "/api/v1/internal/attempts/att-1/correct",
    template: "/api/v1/internal/attempts/:attemptId/correct",
  },
  {
    method: "POST",
    path: "/api/v1/internal/content/c-1/transition",
    template: "/api/v1/internal/content/:contentId/transition",
  },
  {
    method: "GET",
    path: "/api/v1/internal/content/c-1/versions/3/authoring",
    template: "/api/v1/internal/content/:contentId/versions/:version/authoring",
  },
  {
    method: "POST",
    path: "/api/v1/internal/content/c-1/review",
    template: "/api/v1/internal/content/:contentId/review",
  },
  {
    method: "POST",
    path: "/api/v1/internal/curriculum/modules/m-1/evaluate",
    template: "/api/v1/internal/curriculum/modules/:moduleId/evaluate",
  },
  {
    method: "POST",
    path: "/api/v1/internal/diagnostics/b07/evaluate",
    template: "/api/v1/internal/diagnostics/b07/evaluate",
  },
  {
    method: "POST",
    path: "/api/v1/internal/diagnostics/d-1/assign",
    template: "/api/v1/internal/diagnostics/:diagnosticResultId/assign",
  },
  {
    method: "DELETE",
    path: "/api/v1/no-such-route",
    template: "unmatched",
  },
  {
    method: "GET",
    path: "/api/v1/attempts",
    template: "unmatched",
  },
];

describe("route registry", () => {
  it("declares a complete classification for every route", () => {
    expect(ROUTE_REGISTRY.length).toBeGreaterThan(50);
    for (const definition of ROUTE_REGISTRY) {
      expect(definition.template.length).toBeGreaterThan(0);
      expect(definition.telemetryTemplate).toBe(definition.template);
      expect(["public", "session", "internal"]).toContain(definition.auth);
      expect([
        "public-low-risk",
        "authentication",
        "recovery",
        "mutation",
        "expensive-read",
        "internal",
        "ai-assisted",
      ]).toContain(definition.riskClass);
      expect(["http", "application", "token"]).toContain(
        definition.enforcement,
      );
      expect(Array.isArray(definition.capabilities)).toBe(true);
    }
  });

  it("forbids private routes without explicit authorization", () => {
    const sessionLifecycle = new Set([
      "POST /api/v1/session/revoke",
      "GET /api/v1/session/current",
      "POST /api/v1/session/rotate",
    ]);
    const violations = ROUTE_REGISTRY.filter(
      (definition) =>
        definition.auth !== "public" &&
        !sessionLifecycle.has(`${definition.method} ${definition.template}`) &&
        (definition.capabilities.length === 0 ||
          definition.enforcement === "token"),
    );
    expect(violations).toEqual([]);
  });

  it("authorizes session lifecycle by live session possession, explicitly", () => {
    const lifecycle = ROUTE_REGISTRY.filter((definition) =>
      [
        "POST /api/v1/session/revoke",
        "GET /api/v1/session/current",
        "POST /api/v1/session/rotate",
      ].includes(`${definition.method} ${definition.template}`),
    );
    expect(lifecycle).toHaveLength(3);
    for (const definition of lifecycle) {
      expect(definition.auth).toBe("session");
      expect(definition.enforcement).toBe("http");
      expect(definition.capabilities).toEqual([]);
      expect(definition.note).toMatch(/live session/);
    }
  });

  it("keeps public routes on an explicit allowlist", () => {
    const publicTemplates = ROUTE_REGISTRY.filter(
      (definition) => definition.auth === "public",
    ).map((definition) => `${definition.method} ${definition.template}`);
    expect(publicTemplates.sort()).toEqual(
      [
        "GET /health/dependencies",
        "GET /health/live",
        "GET /health/ready",
        "POST /api/v1/invitations/accept",
        "POST /api/v1/recovery/accept",
      ].sort(),
    );
  });

  it("has no duplicate method+template entries", () => {
    const keys = ROUTE_REGISTRY.map(
      (definition) => `${definition.method} ${definition.template}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("matches every corpus path to its canonical template", () => {
    for (const row of CORPUS) {
      expect(matchRoute(row.method, row.path)?.template ?? "unmatched").toBe(
        row.template,
      );
    }
  });

  it("stays in parity with routeTemplate: the registry governs the runtime", () => {
    for (const row of CORPUS) {
      const legacy = routeTemplate(row.method, row.path);
      const next = matchRoute(row.method, row.path)?.template ?? "unmatched";
      expect(next).toBe(legacy);
    }
  });

  it("leaves zero known telemetry gaps: every dispatch route classifies", () => {
    for (const row of CORPUS.filter(
      (entry) => entry.template !== "unmatched",
    )) {
      expect(routeTemplate(row.method, row.path)).toBe(row.template);
    }
  });

  it("gives every entry a first-match witness: no shadowed matchers", () => {
    const matched = new Set<string>();
    for (const row of CORPUS.filter(
      (entry) => entry.template !== "unmatched",
    )) {
      const hit = matchRoute(row.method, row.path);
      if (hit !== null) {
        matched.add(`${hit.method} ${hit.template}`);
      }
    }
    const missing = ROUTE_REGISTRY.map(
      (definition) => `${definition.method} ${definition.template}`,
    ).filter((key) => !matched.has(key));
    expect(missing).toEqual([]);
  });

  it("uses only capabilities defined by the authorization layer", () => {
    for (const definition of ROUTE_REGISTRY) {
      for (const capability of definition.capabilities) {
        expect(CAPABILITIES.has(capability)).toBe(true);
      }
    }
  });
});
