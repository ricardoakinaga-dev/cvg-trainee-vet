import type { ApiHttpDependencies, ApiHttpRequest } from "./http-types.js";
import type { RouteHandler, RouteResult } from "./http-route-support.js";
import {
  matchRoute,
  matchesRoute,
  requirePrincipal,
  runRouteHandlers,
} from "./http-route-support.js";
import {
  handleAccountOperation,
  handleAccountSecurity,
  handleAccountVerificationOperation,
  handleAdminDashboard,
  handleAdminOperationsDashboard,
  handleAssessmentRecalculation,
  handleAuditTrail,
  handleListManagedAccounts,
  handleModeratorDashboard,
  handleObservedItemStatistics,
  handleOperationalAiConfirmation,
  handleOperationalAiProposal,
  handleOperationsDashboard,
  handleRevokeManagedAccountSessions,
  handleSourceConflictDecision,
  handleUpdateManagedAccount,
} from "./http-operations-handlers.js";

async function routeAdminDashboard(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/internal/admin/dashboard")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleAdminDashboard(requestId, principal, dependencies);
}

async function routeAdminOperations(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/internal/admin/operations")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleAdminOperationsDashboard(requestId, principal, dependencies);
}

async function routeModeratorDashboard(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/internal/moderator/dashboard")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleModeratorDashboard(request, requestId, principal, dependencies);
}

async function routeOperationalAiProposal(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (
    !matchesRoute(request, "POST", "/api/v1/internal/operational-ai/proposals")
  ) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleOperationalAiProposal(
    request,
    requestId,
    principal,
    dependencies,
  );
}

async function routeOperationalAiConfirmation(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (
    !matchesRoute(
      request,
      "POST",
      "/api/v1/internal/operational-ai/proposals/confirm",
    )
  ) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleOperationalAiConfirmation(
    request,
    requestId,
    principal,
    dependencies,
  );
}

async function routeItemStatistics(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/internal/item-statistics")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleObservedItemStatistics(
    request,
    requestId,
    principal,
    dependencies,
  );
}

async function routeSourceConflictDecision(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (
    !matchesRoute(
      request,
      "POST",
      "/api/v1/internal/source-conflicts/decisions",
    )
  ) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleSourceConflictDecision(
    request,
    requestId,
    principal,
    dependencies,
  );
}

async function routeAssessmentRecalculation(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (
    !matchesRoute(request, "POST", "/api/v1/internal/assessment-recalculations")
  ) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleAssessmentRecalculation(
    request,
    requestId,
    principal,
    dependencies,
  );
}

async function routeManagedAccounts(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/internal/accounts")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleListManagedAccounts(request, requestId, principal, dependencies);
}

async function routeManagedAccountUpdate(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "PATCH",
    /^\/api\/v1\/internal\/accounts\/([^/]+)$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleUpdateManagedAccount(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeManagedAccountSessionRevoke(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  const match = matchRoute(
    request,
    "POST",
    /^\/api\/v1\/internal\/accounts\/([^/]+)\/sessions\/revoke$/u,
  );
  if (match?.[1] === undefined) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleRevokeManagedAccountSessions(
    request,
    match[1],
    requestId,
    principal,
    dependencies,
  );
}

async function routeOperationsDashboard(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/internal/dashboard")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleOperationsDashboard(requestId, principal, dependencies);
}

async function routeAuditTrail(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/internal/audit")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleAuditTrail(requestId, principal, dependencies);
}

async function routeAccountSecurity(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "GET", "/api/v1/account/security")) return null;
  const principal = await requirePrincipal(request, dependencies);
  return handleAccountSecurity(requestId, principal, dependencies);
}

async function routeAccountRecoveryStart(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/account/recovery/start")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleAccountOperation(
    request,
    requestId,
    principal,
    dependencies,
    (provider, principalId) => provider.beginRecovery(principalId),
  );
}

async function routeMfaEnrollment(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/account/mfa/enrollment")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleAccountOperation(
    request,
    requestId,
    principal,
    dependencies,
    (provider, principalId) => provider.beginMfaEnrollment(principalId),
  );
}

async function routeMfaEnrollmentVerification(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/account/mfa/enrollment/verify")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleAccountVerificationOperation(
    request,
    requestId,
    principal,
    dependencies,
    (provider, principalId, operationId, verificationCode) =>
      provider.verifyMfaEnrollment(principalId, operationId, verificationCode),
  );
}

async function routeRecoveryCompletion(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  if (!matchesRoute(request, "POST", "/api/v1/account/recovery/complete")) {
    return null;
  }
  const principal = await requirePrincipal(request, dependencies);
  return handleAccountVerificationOperation(
    request,
    requestId,
    principal,
    dependencies,
    (provider, principalId, operationId, verificationCode) =>
      provider.completeRecovery(principalId, operationId, verificationCode),
  );
}

const internalRouteHandlers: readonly RouteHandler[] = Object.freeze([
  routeAdminDashboard,
  routeAdminOperations,
  routeModeratorDashboard,
  routeOperationalAiProposal,
  routeOperationalAiConfirmation,
  routeItemStatistics,
  routeSourceConflictDecision,
  routeAssessmentRecalculation,
  routeManagedAccounts,
  routeManagedAccountUpdate,
  routeManagedAccountSessionRevoke,
  routeOperationsDashboard,
  routeAuditTrail,
  routeAccountSecurity,
  routeAccountRecoveryStart,
  routeMfaEnrollment,
  routeMfaEnrollmentVerification,
  routeRecoveryCompletion,
]);

export function routeInternalRequest(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<RouteResult> {
  return runRouteHandlers(
    request,
    requestId,
    dependencies,
    internalRouteHandlers,
  );
}
