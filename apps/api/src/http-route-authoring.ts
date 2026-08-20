import type { ApiHttpDependencies, ApiHttpRequest } from "./http-types.js";
import type { RouteHandler, RouteResult } from "./http-route-support.js";
import {
  matchRoute,
  matchesRoute,
  requirePrincipal,
  runRouteHandlers,
} from "./http-route-support.js";
import {
  handleAuthoringPublication,
  handleAuthoringReview,
  handleClinicalReviewQueue,
  handleContentTransition,
  handleCorrection,
  handleCurriculumRuntimeEvaluation,
  handleInternalAuthoringRecord,
} from "./http-authoring-handlers.js";
import {
  handleProgress,
  handleSaveAnswer,
} from "./http-participant-handlers.js";
import { handleFeedback } from "./http-workflow-handlers.js";
import { handleSubmit } from "./http-workflow-handlers.js";

async function routeCurriculumEvaluation(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/curriculum\/modules\/([^/]+)\/evaluate$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleCurriculumRuntimeEvaluation(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeContentTransition(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/content\/([^/]+)\/transition$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleContentTransition(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeInternalAuthoringRecord(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "GET",
    /^\/api\/v1\/internal\/content\/([^/]+)\/versions\/(\d+)\/authoring$/u,
  );
  if (match?.[1] === undefined || match[2] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleInternalAuthoringRecord(
    match[1],
    match[2],
    requestId,
    principal,
    dependencies,
  );
}

async function routeClinicalReviewQueue(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (
    !matchesRoute(request, "GET", "/api/v1/internal/authoring/review-queue")
  ) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleClinicalReviewQueue(request, requestId, principal, dependencies);
}

async function routeAuthoringReview(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/content\/([^/]+)\/review$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleAuthoringReview(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeAuthoringPublication(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/content\/([^/]+)\/publish$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleAuthoringPublication(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeCorrection(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/attempts\/([^/]+)\/correct$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleCorrection(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeAttemptFeedback(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "GET",
    /^\/api\/v1\/attempts\/([^/]+)\/feedback$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleFeedback(match[1], requestId, principal, dependencies);
}

async function routeProgress(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "GET",
    /^\/api\/v1\/activities\/([^/]+)\/progress$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleProgress(match[1], requestId, principal, dependencies);
}

async function routeSubmitAttempt(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/attempts\/([^/]+)\/submit$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleSubmit(request, match[1], requestId, principal, dependencies);
}

async function routeSaveAnswer(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/attempts\/([^/]+)\/answers$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleSaveAnswer(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

const authoringRouteHandlers: readonly RouteHandler[] = Object.freeze([
  routeCurriculumEvaluation,
  routeContentTransition,
  routeInternalAuthoringRecord,
  routeClinicalReviewQueue,
  routeAuthoringReview,
  routeAuthoringPublication,
  routeCorrection,
  routeAttemptFeedback,
  routeProgress,
  routeSubmitAttempt,
  routeSaveAnswer,
]);

export function routeAuthoringRequest(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  return runRouteHandlers(
    request,
    requestId,
    dependencies,
    authoringRouteHandlers,
  );
}
