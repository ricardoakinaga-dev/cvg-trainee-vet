import type { ApiHttpDependencies, ApiHttpRequest } from "./http-types.js";
import type { RouteHandler, RouteResult } from "./http-route-support.js";
import {
  matchRoute,
  matchesRoute,
  requirePrincipal,
  runRouteHandlers,
} from "./http-route-support.js";
import {
  handleActivity,
  handleCurriculumRuntime,
  handleDigitalCaseAdvance,
  handleDigitalCaseRuntime,
  handleLearningPath,
  handleParticipantDashboard,
  handleStart,
} from "./http-participant-handlers.js";

async function routeStartAttempt(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/attempts")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleStart(request, requestId, principal, dependencies);
}

async function routeLearningPath(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/learning-path")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleLearningPath(requestId, principal, dependencies);
}

async function routeParticipantDashboard(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/dashboard")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleParticipantDashboard(requestId, principal, dependencies);
}

async function routeActivity(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(request, "GET", /^\/api\/v1\/activities\/([^/]+)$/u);
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleActivity(match[1], requestId, principal, dependencies);
}

async function routeCurriculumRuntime(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "GET",
    /^\/api\/v1\/curriculum\/modules\/([^/]+)\/runtime$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleCurriculumRuntime(match[1], requestId, principal, dependencies);
}

async function routeDigitalCaseAdvance(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/curriculum\/modules\/([^/]+)\/case\/advance$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleDigitalCaseAdvance(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeDigitalCaseRuntime(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "GET",
    /^\/api\/v1\/curriculum\/modules\/([^/]+)\/case$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleDigitalCaseRuntime(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

const participantRouteHandlers: readonly RouteHandler[] = Object.freeze([
  routeStartAttempt,
  routeLearningPath,
  routeParticipantDashboard,
  routeActivity,
  routeCurriculumRuntime,
  routeDigitalCaseAdvance,
  routeDigitalCaseRuntime,
]);

export function routeParticipantRequest(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  return runRouteHandlers(
    request,
    requestId,
    dependencies,
    participantRouteHandlers,
  );
}
