import type { ApiHttpDependencies, ApiHttpRequest } from "./http-types.js";
import type { RouteHandler, RouteResult } from "./http-route-support.js";
import {
  matchRoute,
  matchesRoute,
  requirePrincipal,
  runRouteHandlers,
} from "./http-route-support.js";
import {
  handleAcceptInvitation,
  handleCreateAppeal,
  handleCreateAssessmentWorkflow,
  handleCreateFeedbackTicket,
  handleCreateInvitation,
  handleCreateLearningAssignment,
  handleListFeedbackTickets,
  handlePasswordLogin,
  handlePasswordUpdate,
  handleRevokeSession,
  handleRotateSession,
  handleSessionStatus,
  handleTransitionAppeal,
  handleTransitionAssessmentWorkflow,
  handleTransitionFeedbackTicket,
  handleTransitionLearningAssignment,
} from "./http-workflow-handlers.js";

async function routeAcceptInvitation(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/invitations/accept")) {
    return null;
  }
  return handleAcceptInvitation(request, requestId, dependencies);
}

async function routePasswordLogin(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/auth/login")) return null;
  return handlePasswordLogin(request, requestId, dependencies);
}

async function routeSessionStatus(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/session")) return null;
  return handleSessionStatus(request, requestId, dependencies);
}

async function routePasswordUpdate(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/account/password")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handlePasswordUpdate(request, requestId, principal, dependencies);
}

async function routeSessionRevoke(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/session/revoke")) return null;
  return handleRevokeSession(request, requestId, dependencies);
}

async function routeSessionRotate(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/session/rotate")) return null;
  return handleRotateSession(request, requestId, dependencies);
}

async function routeCreateInvitation(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/internal/invitations")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleCreateInvitation(request, requestId, principal, dependencies);
}

async function routeCreateLearningAssignment(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/internal/learning-assignments")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleCreateLearningAssignment(
    request,
    requestId,
    principal,
    dependencies,
  );
}

async function routeTransitionLearningAssignment(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/learning-assignments\/([^/]+)\/transition$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleTransitionLearningAssignment(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeCreateAssessmentWorkflow(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/internal/assessment-workflows")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleCreateAssessmentWorkflow(
    request,
    requestId,
    principal,
    dependencies,
  );
}

async function routeTransitionAssessmentWorkflow(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/assessment-workflows\/([^/]+)\/transition$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleTransitionAssessmentWorkflow(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeListFeedback(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/feedback")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleListFeedbackTickets(request, requestId, principal, dependencies);
}

async function routeCreateFeedback(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/feedback")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleCreateFeedbackTicket(
    request,
    requestId,
    principal,
    dependencies,
  );
}

async function routeTransitionFeedback(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "PATCH",
    /^\/api\/v1\/internal\/feedback\/([^/]+)$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleTransitionFeedbackTicket(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeCreateAppeal(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/appeals")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleCreateAppeal(request, requestId, principal, dependencies);
}

async function routeTransitionAppeal(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/appeals\/([^/]+)\/transition$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleTransitionAppeal(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

const workflowRouteHandlers: readonly RouteHandler[] = Object.freeze([
  routeAcceptInvitation,
  routePasswordLogin,
  routeSessionStatus,
  routePasswordUpdate,
  routeSessionRevoke,
  routeSessionRotate,
  routeCreateInvitation,
  routeCreateLearningAssignment,
  routeTransitionLearningAssignment,
  routeCreateAssessmentWorkflow,
  routeTransitionAssessmentWorkflow,
  routeListFeedback,
  routeCreateFeedback,
  routeTransitionFeedback,
  routeCreateAppeal,
  routeTransitionAppeal,
]);

export function routeWorkflowRequest(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  return runRouteHandlers(
    request,
    requestId,
    dependencies,
    workflowRouteHandlers,
  );
}
