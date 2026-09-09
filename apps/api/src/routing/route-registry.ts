import type { Capability } from "@cvg/application";

export type RouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RouteAuth = "public" | "session" | "internal";

export type RateLimitRiskClass =
  | "public-low-risk"
  | "authentication"
  | "recovery"
  | "mutation"
  | "expensive-read"
  | "internal"
  | "ai-assisted";

export type AuthorizationEnforcement = "http" | "application" | "token";

export type RoutePathPattern = Readonly<
  { readonly exact: string } | { readonly regex: string }
>;

export type RouteDefinition = Readonly<{
  readonly method: RouteMethod | "*";
  readonly template: string;
  readonly telemetryTemplate: string;
  readonly path: RoutePathPattern;
  readonly auth: RouteAuth;
  readonly capabilities: readonly Capability[];
  readonly enforcement: AuthorizationEnforcement;
  readonly riskClass: RateLimitRiskClass;
  readonly telemetryGap: boolean;
  readonly note?: string;
}>;

function exact(
  method: RouteMethod,
  template: string,
  init: Omit<
    RouteDefinition,
    "method" | "template" | "telemetryTemplate" | "path"
  >,
): RouteDefinition {
  return Object.freeze({
    method,
    template,
    telemetryTemplate: template,
    path: Object.freeze({ exact: template }),
    ...init,
  });
}

function pattern(
  method: RouteMethod | "*",
  template: string,
  regex: string,
  init: Omit<
    RouteDefinition,
    "method" | "template" | "telemetryTemplate" | "path"
  >,
): RouteDefinition {
  return Object.freeze({
    method,
    template,
    telemetryTemplate: template,
    path: Object.freeze({ regex }),
    ...init,
  });
}

const PUBLIC_LOW: RateLimitRiskClass = "public-low-risk";
const AUTHN: RateLimitRiskClass = "authentication";
const RECOVERY: RateLimitRiskClass = "recovery";
const MUTATION: RateLimitRiskClass = "mutation";
const READ: RateLimitRiskClass = "expensive-read";
const INTERNAL: RateLimitRiskClass = "internal";

export const ROUTE_REGISTRY: readonly RouteDefinition[] = Object.freeze([
  exact("GET", "/health/live", {
    auth: "public",
    capabilities: Object.freeze([]),
    enforcement: "http",
    riskClass: PUBLIC_LOW,
    telemetryGap: false,
  }),
  exact("GET", "/health/ready", {
    auth: "public",
    capabilities: Object.freeze([]),
    enforcement: "http",
    riskClass: PUBLIC_LOW,
    telemetryGap: false,
  }),
  exact("GET", "/health/dependencies", {
    auth: "public",
    capabilities: Object.freeze([]),
    enforcement: "http",
    riskClass: PUBLIC_LOW,
    telemetryGap: false,
  }),
  exact("GET", "/internal/metrics", {
    auth: "internal",
    capabilities: Object.freeze(["VIEW_INTERNAL_AUDIT"]),
    enforcement: "http",
    riskClass: INTERNAL,
    telemetryGap: false,
  }),
  exact("GET", "/internal/operations", {
    auth: "internal",
    capabilities: Object.freeze(["VIEW_INTERNAL_AUDIT"]),
    enforcement: "http",
    riskClass: INTERNAL,
    telemetryGap: false,
  }),
  exact("POST", "/api/v1/invitations/accept", {
    auth: "public",
    capabilities: Object.freeze([]),
    enforcement: "token",
    riskClass: AUTHN,
    telemetryGap: false,
    note: "one-time invitation token; no session required",
  }),
  exact("POST", "/api/v1/recovery/accept", {
    auth: "public",
    capabilities: Object.freeze([]),
    enforcement: "token",
    riskClass: RECOVERY,
    telemetryGap: false,
    note: "one-time recovery token; no session required",
  }),
  exact("POST", "/api/v1/session/revoke", {
    auth: "session",
    capabilities: Object.freeze([]),
    enforcement: "http",
    riskClass: AUTHN,
    telemetryGap: false,
    note: "session cookie required; no capability beyond a live session",
  }),
  exact("GET", "/api/v1/session/current", {
    auth: "session",
    capabilities: Object.freeze([]),
    enforcement: "http",
    riskClass: AUTHN,
    telemetryGap: false,
    note: "session cookie required; no capability beyond a live session",
  }),
  exact("POST", "/api/v1/session/rotate", {
    auth: "session",
    capabilities: Object.freeze([]),
    enforcement: "http",
    riskClass: AUTHN,
    telemetryGap: false,
    note: "session cookie required; no capability beyond a live session",
  }),
  exact("POST", "/api/v1/internal/invitations", {
    auth: "internal",
    capabilities: Object.freeze(["MANAGE_ACCOUNT_LIFECYCLE"]),
    enforcement: "application",
    riskClass: MUTATION,
    telemetryGap: false,
  }),
  exact("POST", "/api/v1/internal/learning-assignments", {
    auth: "internal",
    capabilities: Object.freeze(["MANAGE_LEARNING_ASSIGNMENTS"]),
    enforcement: "http",
    riskClass: MUTATION,
    telemetryGap: false,
  }),
  exact("POST", "/api/v1/internal/assessment-workflows", {
    auth: "internal",
    capabilities: Object.freeze(["MANAGE_ASSESSMENT_WORKFLOWS"]),
    enforcement: "http",
    riskClass: MUTATION,
    telemetryGap: false,
  }),
  exact("POST", "/api/v1/feedback", {
    auth: "session",
    capabilities: Object.freeze(["CREATE_FEEDBACK_TICKET"]),
    enforcement: "http",
    riskClass: MUTATION,
    telemetryGap: false,
  }),
  exact("GET", "/api/v1/feedback", {
    auth: "session",
    capabilities: Object.freeze(["VIEW_OWN_FEEDBACK"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
    note: "F-REG-004 closed in R2-001: registry governs the runtime",
  }),
  exact("GET", "/api/v1/appeals", {
    auth: "session",
    capabilities: Object.freeze(["VIEW_OWN_APPEALS"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
  }),
  exact("POST", "/api/v1/appeals", {
    auth: "session",
    capabilities: Object.freeze(["CREATE_APPEAL"]),
    enforcement: "http",
    riskClass: MUTATION,
    telemetryGap: false,
  }),
  exact("POST", "/api/v1/attempts", {
    auth: "session",
    capabilities: Object.freeze(["START_OWN_ATTEMPT"]),
    enforcement: "http",
    riskClass: MUTATION,
    telemetryGap: false,
  }),
  exact("GET", "/api/v1/learning-path", {
    auth: "session",
    capabilities: Object.freeze(["VIEW_OWN_ACTIVITY"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
  }),
  exact("GET", "/api/v1/dashboard", {
    auth: "session",
    capabilities: Object.freeze(["VIEW_OWN_ACTIVITY", "VIEW_STAFF_DASHBOARD"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
    note: "participant branch uses VIEW_OWN_ACTIVITY; staff branch VIEW_STAFF_DASHBOARD",
  }),
  exact("GET", "/api/v1/audit", {
    auth: "session",
    capabilities: Object.freeze(["VIEW_AUDIT_TRAIL"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
  }),
  exact("GET", "/api/v1/internal/reports/continuing-education", {
    auth: "internal",
    capabilities: Object.freeze(["VIEW_PROGRAM_METRICS"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
  }),
  exact("GET", "/api/v1/internal/reports/reflections", {
    auth: "internal",
    capabilities: Object.freeze(["VIEW_PROGRAM_METRICS"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
    note: "F-REG-006 closed in R2-001: registry governs the runtime",
  }),
  exact("GET", "/api/v1/internal/content/review-queue", {
    auth: "internal",
    capabilities: Object.freeze(["VIEW_CONTENT_REVIEW_QUEUE"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
  }),
  exact("POST", "/api/v1/content/drafts", {
    auth: "internal",
    capabilities: Object.freeze(["AUTHOR_CONTENT"]),
    enforcement: "application",
    riskClass: MUTATION,
    telemetryGap: false,
  }),
  exact("GET", "/api/v1/internal/appeals/review-queue", {
    auth: "internal",
    capabilities: Object.freeze(["REVIEW_APPEAL"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
  }),
  exact("GET", "/api/v1/internal/feedback", {
    auth: "internal",
    capabilities: Object.freeze(["VIEW_FEEDBACK_QUEUE"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
    note: "F-REG-005 closed in R2-001: registry governs the runtime",
  }),
  exact("GET", "/api/v1/internal/session/scopes", {
    auth: "internal",
    capabilities: Object.freeze(["VIEW_INTERNAL_SCOPES"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
  }),
  exact("POST", "/api/v1/diagnostics/b07/sessions", {
    auth: "session",
    capabilities: Object.freeze(["START_OWN_DIAGNOSTIC_SESSION"]),
    enforcement: "http",
    riskClass: MUTATION,
    telemetryGap: false,
  }),
  exact("GET", "/api/v1/diagnostics/b07/sessions/current", {
    auth: "session",
    capabilities: Object.freeze(["VIEW_OWN_DIAGNOSTIC_SESSION"]),
    enforcement: "http",
    riskClass: READ,
    telemetryGap: false,
  }),
  pattern(
    "PUT",
    "/api/v1/diagnostics/b07/sessions/:sessionId/answers/:itemId",
    "^\\/api\\/v1\\/diagnostics\\/b07\\/sessions\\/[^/]+\\/answers\\/[^/]+$",
    {
      auth: "session",
      capabilities: Object.freeze(["SAVE_OWN_DIAGNOSTIC_ANSWER"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
    },
  ),
  pattern(
    "POST",
    "/api/v1/diagnostics/b07/sessions/:sessionId/finalize",
    "^\\/api\\/v1\\/diagnostics\\/b07\\/sessions\\/[^/]+\\/finalize$",
    {
      auth: "session",
      capabilities: Object.freeze(["FINALIZE_OWN_DIAGNOSTIC_SESSION"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
    },
  ),
  pattern(
    "GET",
    "/api/v1/diagnostics/b07/sessions/:sessionId",
    "^\\/api\\/v1\\/diagnostics\\/b07\\/sessions\\/[^/]+$",
    {
      auth: "session",
      capabilities: Object.freeze(["VIEW_OWN_DIAGNOSTIC_SESSION"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
    },
  ),
  pattern(
    "*",
    "/api/v1/activities/:activityId",
    "^\\/api\\/v1\\/activities\\/[^/]+$",
    {
      auth: "session",
      capabilities: Object.freeze(["VIEW_OWN_ACTIVITY"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves GET",
    },
  ),
  pattern(
    "*",
    "/api/v1/activities/:activityId/progress",
    "^\\/api\\/v1\\/activities\\/[^/]+\\/progress$",
    {
      auth: "session",
      capabilities: Object.freeze(["VIEW_OWN_ACTIVITY"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves GET",
    },
  ),
  pattern(
    "*",
    "/api/v1/curriculum/modules/:moduleId/runtime",
    "^\\/api\\/v1\\/curriculum\\/modules\\/[^/]+\\/runtime$",
    {
      auth: "session",
      capabilities: Object.freeze(["VIEW_OWN_ACTIVITY"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves GET",
    },
  ),
  pattern(
    "*",
    "/api/v1/attempts/:attemptId/answers",
    "^\\/api\\/v1\\/attempts\\/[^/]+\\/answers$",
    {
      auth: "session",
      capabilities: Object.freeze(["SAVE_OWN_ANSWER"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST",
    },
  ),
  pattern(
    "*",
    "/api/v1/attempts/:attemptId/submit",
    "^\\/api\\/v1\\/attempts\\/[^/]+\\/submit$",
    {
      auth: "session",
      capabilities: Object.freeze(["SUBMIT_OWN_ATTEMPT"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST",
    },
  ),
  pattern(
    "*",
    "/api/v1/attempts/:attemptId/feedback",
    "^\\/api\\/v1\\/attempts\\/[^/]+\\/feedback$",
    {
      auth: "session",
      capabilities: Object.freeze(["VIEW_OWN_FEEDBACK"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves GET",
    },
  ),
  pattern(
    "*",
    "/api/v1/internal/attempts/:attemptId/correct",
    "^\\/api\\/v1\\/internal\\/attempts\\/[^/]+\\/correct$",
    {
      auth: "internal",
      capabilities: Object.freeze(["CORRECT_ATTEMPT"]),
      enforcement: "application",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST; capability enforced in correction use case",
    },
  ),
  pattern(
    "*",
    "/api/v1/internal/content/:contentId/transition",
    "^\\/api\\/v1\\/internal\\/content\\/[^/]+\\/transition$",
    {
      auth: "internal",
      capabilities: Object.freeze([
        "AUTHOR_CONTENT",
        "MODERATE_CONTENT",
        "APPROVE_CLINICAL_CONTENT",
        "PUBLISH_CONTENT",
      ]),
      enforcement: "application",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST; capability selected by event in content use case",
    },
  ),
  pattern(
    "GET",
    "/api/v1/internal/content/:contentId/versions/:version/authoring",
    "^\\/api\\/v1\\/internal\\/content\\/[^/]+\\/versions\\/\\d+\\/authoring$",
    {
      auth: "internal",
      capabilities: Object.freeze(["VIEW_INTERNAL_SOURCE"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
    },
  ),
  pattern(
    "POST",
    "/api/v1/internal/content/:contentId/review",
    "^\\/api\\/v1\\/internal\\/content\\/[^/]+\\/review$",
    {
      auth: "internal",
      capabilities: Object.freeze([
        "MODERATE_CONTENT",
        "APPROVE_CLINICAL_CONTENT",
      ]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "capability selected by review decision at the http layer",
    },
  ),
  pattern(
    "*",
    "/api/v1/internal/curriculum/modules/:moduleId/evaluate",
    "^\\/api\\/v1\\/internal\\/curriculum\\/modules\\/[^/]+\\/evaluate$",
    {
      auth: "internal",
      capabilities: Object.freeze(["MODERATE_CONTENT"]),
      enforcement: "http",
      riskClass: INTERNAL,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST",
    },
  ),
  exact("POST", "/api/v1/internal/diagnostics/b07/evaluate", {
    auth: "internal",
    capabilities: Object.freeze(["MODERATE_CONTENT"]),
    enforcement: "http",
    riskClass: INTERNAL,
    telemetryGap: false,
  }),
  pattern(
    "POST",
    "/api/v1/internal/diagnostics/:diagnosticResultId/assign",
    "^\\/api\\/v1\\/internal\\/diagnostics\\/[^/]+\\/assign$",
    {
      auth: "internal",
      capabilities: Object.freeze(["MANAGE_LEARNING_ASSIGNMENTS"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
    },
  ),
  pattern(
    "*",
    "/api/v1/internal/learning-assignments/:assignmentId/transition",
    "^\\/api\\/v1\\/internal\\/learning-assignments\\/[^/]+\\/transition$",
    {
      auth: "internal",
      capabilities: Object.freeze(["MANAGE_LEARNING_ASSIGNMENTS"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST",
    },
  ),
  pattern(
    "*",
    "/api/v1/internal/assessment-workflows/:resultId/transition",
    "^\\/api\\/v1\\/internal\\/assessment-workflows\\/[^/]+\\/transition$",
    {
      auth: "internal",
      capabilities: Object.freeze(["MANAGE_ASSESSMENT_WORKFLOWS"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST",
    },
  ),
  pattern(
    "GET",
    "/api/v1/internal/feedback/:ticketId/history",
    "^\\/api\\/v1\\/internal\\/feedback\\/[^/]+\\/history$",
    {
      auth: "internal",
      capabilities: Object.freeze(["VIEW_FEEDBACK_QUEUE"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
    },
  ),
  pattern(
    "PATCH",
    "/api/v1/internal/feedback/:ticketId/triage-metadata",
    "^\\/api\\/v1\\/internal\\/feedback\\/[^/]+\\/triage-metadata$",
    {
      auth: "internal",
      capabilities: Object.freeze(["MANAGE_FEEDBACK_METADATA"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
    },
  ),
  pattern(
    "GET",
    "/api/v1/internal/appeals/:appealId/impact-preview",
    "^\\/api\\/v1\\/internal\\/appeals\\/[^/]+\\/impact-preview$",
    {
      auth: "internal",
      capabilities: Object.freeze(["REVIEW_APPEAL"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
    },
  ),
  pattern(
    "GET",
    "/api/v1/internal/appeals/:appealId/history",
    "^\\/api\\/v1\\/internal\\/appeals\\/[^/]+\\/history$",
    {
      auth: "internal",
      capabilities: Object.freeze(["REVIEW_APPEAL"]),
      enforcement: "http",
      riskClass: READ,
      telemetryGap: false,
      note: "F-REG-003 closed in R2-001: registry governs the runtime",
    },
  ),
  pattern(
    "*",
    "/api/v1/internal/feedback/:ticketId",
    "^\\/api\\/v1\\/internal\\/feedback\\/[^/]+$",
    {
      auth: "internal",
      capabilities: Object.freeze(["TRANSITION_FEEDBACK_TICKET"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves PATCH",
    },
  ),
  pattern(
    "*",
    "/api/v1/internal/accounts/:accountId/recovery",
    "^\\/api\\/v1\\/internal\\/accounts\\/[^/]+\\/recovery$",
    {
      auth: "internal",
      capabilities: Object.freeze(["MANAGE_ACCOUNT_LIFECYCLE"]),
      enforcement: "http",
      riskClass: RECOVERY,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST",
    },
  ),
  pattern(
    "*",
    "/api/v1/internal/appeals/:appealId/transition",
    "^\\/api\\/v1\\/internal\\/appeals\\/[^/]+\\/transition$",
    {
      auth: "internal",
      capabilities: Object.freeze(["REVIEW_APPEAL"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "routeTemplate() classifies any method; dispatch serves POST",
    },
  ),
  pattern(
    "PATCH",
    "/api/v1/internal/accounts/:accountId/status",
    "^\\/api\\/v1\\/internal\\/accounts\\/[^/]+\\/status$",
    {
      auth: "internal",
      capabilities: Object.freeze(["MANAGE_ACCOUNT_LIFECYCLE"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "F-REG-001 closed in R2-001: registry governs the runtime",
    },
  ),
  pattern(
    "POST",
    "/api/v1/internal/accounts/:accountId/invitation",
    "^\\/api\\/v1\\/internal\\/accounts\\/[^/]+\\/invitation$",
    {
      auth: "internal",
      capabilities: Object.freeze(["MANAGE_ACCOUNT_LIFECYCLE"]),
      enforcement: "http",
      riskClass: MUTATION,
      telemetryGap: false,
      note: "F-REG-002 closed in R2-001: registry governs the runtime",
    },
  ),
]);

const compiledPatterns = new WeakMap<RouteDefinition, RegExp>();

function compiledPattern(definition: RouteDefinition): RegExp | null {
  if (!("regex" in definition.path)) return null;
  const cached = compiledPatterns.get(definition);
  if (cached !== undefined) return cached;
  const compiled = new RegExp(definition.path.regex, "u");
  compiledPatterns.set(definition, compiled);
  return compiled;
}

function matches(
  definition: RouteDefinition,
  method: string,
  path: string,
): boolean {
  if (definition.method !== "*" && definition.method !== method) return false;
  if ("exact" in definition.path) return definition.path.exact === path;
  const compiled = compiledPattern(definition);
  return compiled === null ? false : compiled.test(path);
}

export function matchRoute(
  method: string,
  path: string,
): RouteDefinition | null {
  for (const definition of ROUTE_REGISTRY) {
    if (matches(definition, method, path)) return definition;
  }
  return null;
}
