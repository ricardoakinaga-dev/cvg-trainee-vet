import { randomUUID } from "node:crypto";

import { confirmOperationalAiProposal } from "@cvg/domain";
import {
  type AccountSecurityStatus,
  type ApiHttpDependencies,
  type ApiHttpRequest,
  type ApiHttpResponse,
  type ApiPrincipal,
  type OperationalEvidence,
} from "./http.js";
import {
  accountActionRequestSchema,
  accountManagementListQuerySchema,
  accountManagementUpdateRequestSchema,
  accountOperationProjectionSchema,
  accountSessionRevokeRequestSchema,
  accountVerificationRequestSchema,
  apiSuccessResponse,
  assessmentRecalculationBatchRequestSchema,
  managedAccountPageProjectionSchema,
  parseAccountSecurity,
  parseAdminDashboard,
  parseAdminOperationsDashboard,
  parseAssessmentRecalculationResult,
  parseAuditTrail,
  parseModeratorDashboard,
  parseObservedItemStatistics,
  parseOperationsDashboard,
  parseSourceConflictDecision,
  observedItemStatisticsRequestSchema,
  operationalAiConfirmationProjectionSchema,
  operationalAiConfirmationRequestSchema,
  operationalAiProposalProjectionSchema,
  operationalAiProposalRequestSchema,
  revokedAccountSessionsProjectionSchema,
  sourceConflictDecisionRequestSchema,
} from "@cvg/contracts";
import {
  type IdentityProviderOperation,
  type IdentityProviderPort,
  type ManagedAccount,
  type RecalculateAffectedAssessmentsCommand,
} from "@cvg/application";
import type { Observability } from "@cvg/observability";
import {
  canViewOperationalAi,
  errorResponse,
  isAllowed,
  validationResponse,
} from "./http-support.js";

function dashboardMetricTotals(
  observability: Observability | undefined,
): Readonly<{
  readonly requestsTotal: number;
  readonly errorsTotal: number;
  readonly p95DurationMs: number | null;
}> {
  const counters = observability?.metrics.snapshot().counters ?? [];
  const requestCounters = counters.filter(
    (counter) => counter.name === "api.requests.total",
  );
  return Object.freeze({
    requestsTotal: requestCounters.reduce(
      (total, counter) => total + counter.value,
      0,
    ),
    errorsTotal: requestCounters
      .filter((counter) => counter.labels.outcome === "server_error")
      .reduce((total, counter) => total + counter.value, 0),
    p95DurationMs:
      observability?.metrics.quantile("api.request.duration_ms", 0.95) ?? null,
  });
}

export async function handleOperationsDashboard(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isAllowed(principal, "VIEW_INTERNAL_AUDIT", {})) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.dependencyStatus === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const dependency = await dependencies.dependencyStatus();
  const totals = dashboardMetricTotals(dependencies.observability);
  const evidence: OperationalEvidence = dependencies.operationalEvidence ?? {
    collector: "NOT_CONFIGURED",
    retention: "NOT_CONFIGURED",
    traces: "NOT_CONFIGURED",
    load: "NOT_EXECUTED",
    failover: "NOT_EXECUTED",
    replicas: "NOT_EXECUTED",
  };
  return {
    status: 200,
    body: apiSuccessResponse(
      parseOperationsDashboard({
        dependencyStatus: dependency.status,
        dependencies: dependency.dependencies,
        metrics: { ...totals },
        evidence,
      }),
      requestId,
    ),
  };
}

export async function handleAuditTrail(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isAllowed(principal, "VIEW_INTERNAL_AUDIT", {})) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.listAuditEntries === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const entries = await dependencies.listAuditEntries();
  return {
    status: 200,
    body: apiSuccessResponse(parseAuditTrail({ entries }), requestId),
  };
}

export async function handleAdminDashboard(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isAllowed(principal, "VIEW_ADMIN_DASHBOARD", {})) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.getInternalAdminDashboard === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const dashboard = await dependencies.getInternalAdminDashboard(
    principal.scopes,
  );
  return {
    status: 200,
    body: apiSuccessResponse(parseAdminDashboard(dashboard), requestId),
  };
}

export async function handleAdminOperationsDashboard(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isAllowed(principal, "VIEW_ADMIN_DASHBOARD", {})) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.getInternalAdminOperationsDashboard === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const dashboard = await dependencies.getInternalAdminOperationsDashboard(
    principal.scopes,
  );
  return {
    status: 200,
    body: apiSuccessResponse(
      parseAdminOperationsDashboard(dashboard),
      requestId,
    ),
  };
}

export async function handleModeratorDashboard(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getInternalModeratorDashboard === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const requestedScopeId = request.query?.scopeId;
  if (requestedScopeId !== undefined && requestedScopeId.trim().length === 0) {
    return validationResponse(requestId, "scopeId");
  }
  const scopeIds =
    requestedScopeId === undefined
      ? principal.scopes
      : [requestedScopeId.trim()];
  if (
    scopeIds.length === 0 ||
    scopeIds.some(
      (scopeId) =>
        !isAllowed(principal, "VIEW_MODERATOR_DASHBOARD", { scopeId }),
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const dashboard = await dependencies.getInternalModeratorDashboard(
    principal.principalId,
    scopeIds,
  );
  return {
    status: 200,
    body: apiSuccessResponse(parseModeratorDashboard(dashboard), requestId),
  };
}

export async function handleOperationalAiProposal(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!canViewOperationalAi(principal)) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.runOperationalAiProposal === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = operationalAiProposalRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const proposal = await dependencies.runOperationalAiProposal({
    requestId,
    tool: parsed.data.tool,
    impact: parsed.data.impact,
    input: parsed.data.input,
    instructions: parsed.data.instructions,
    estimatedCostUsd: parsed.data.estimatedCostUsd,
    generatedAt: new Date().toISOString(),
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      operationalAiProposalProjectionSchema.parse(proposal),
      requestId,
    ),
  };
}

export async function handleOperationalAiConfirmation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!canViewOperationalAi(principal)) {
    return errorResponse("forbidden", requestId);
  }
  const parsed = operationalAiConfirmationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const confirmation = (
    dependencies.confirmOperationalAiProposal ?? confirmOperationalAiProposal
  )(parsed.data.proposal, {
    confirmedBy: principal.principalId,
    confirmedAt: parsed.data.confirmedAt,
    ...(parsed.data.rationale === undefined
      ? {}
      : { rationale: parsed.data.rationale }),
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      operationalAiConfirmationProjectionSchema.parse(confirmation),
      requestId,
    ),
  };
}

export async function handleObservedItemStatistics(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!canViewOperationalAi(principal)) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.recordObservedItemStatistics === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = observedItemStatisticsRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (!principal.scopes.includes(parsed.data.scopeId)) {
    return errorResponse("forbidden", requestId);
  }
  const statistics = await dependencies.recordObservedItemStatistics({
    statisticsId: randomUUID(),
    itemId: parsed.data.itemId,
    scopeId: parsed.data.scopeId,
    contentVersion: parsed.data.contentVersion,
    observedAt: parsed.data.observedAt,
    sampleSize: parsed.data.sampleSize,
    correctCount: parsed.data.correctCount,
    appealCount: parsed.data.appealCount,
    ...(parsed.data.discrimination === undefined
      ? {}
      : { discrimination: parsed.data.discrimination }),
    distractorCounts: parsed.data.distractorCounts,
  });
  return {
    status: 201,
    body: apiSuccessResponse(
      parseObservedItemStatistics(statistics),
      requestId,
    ),
  };
}

export async function handleSourceConflictDecision(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.recordSourceConflictDecision === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = sourceConflictDecisionRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (!principal.scopes.includes(parsed.data.scopeId)) {
    return errorResponse("forbidden", requestId);
  }
  const decision = await dependencies.recordSourceConflictDecision({
    ...parsed.data,
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    approvedClinicalApproverId: principal.principalId,
  });
  return {
    status: 201,
    body: apiSuccessResponse(parseSourceConflictDecision(decision), requestId),
  };
}

export async function handleAssessmentRecalculation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = assessmentRecalculationBatchRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success) return validationResponse(requestId);
  if (!principal.scopes.includes(parsed.data.scopeId)) {
    return errorResponse("forbidden", requestId);
  }
  const command = {
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    approvedClinicalApproverId: principal.principalId,
    scopeId: parsed.data.scopeId,
    itemId: parsed.data.itemId,
    reason: parsed.data.reason,
    passingScore: parsed.data.passingScore,
    recalculatedAt: parsed.data.recalculatedAt,
  } satisfies RecalculateAffectedAssessmentsCommand;
  if (parsed.data.candidates.length > 0) {
    if (dependencies.registerAssessmentRecalculationCandidates === undefined) {
      return errorResponse("internal_error", requestId);
    }
    await dependencies.registerAssessmentRecalculationCandidates({
      ...command,
      candidates: parsed.data.candidates,
    });
  }
  if (dependencies.recalculateAffectedAssessments === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const result = await dependencies.recalculateAffectedAssessments(command);
  return {
    status: 200,
    body: apiSuccessResponse(
      parseAssessmentRecalculationResult(result),
      requestId,
    ),
  };
}

function managedAccountProjection(account: ManagedAccount) {
  return {
    accountId: account.accountId,
    professionalEmail: account.professionalEmail,
    accountStatus: account.accountStatus,
    roles: [...account.roles],
    scopes: [...account.scopes],
    version: account.version,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export async function handleListManagedAccounts(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.listManagedAccounts === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = accountManagementListQuerySchema.safeParse(
    request.query ?? {},
  );
  if (!parsed.success) return validationResponse(requestId);
  const result = await dependencies.listManagedAccounts({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    limit: parsed.data.limit,
    ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
    ...(parsed.data.scopeId === undefined
      ? {}
      : { scopeId: parsed.data.scopeId }),
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      managedAccountPageProjectionSchema.parse({
        accounts: result.accounts.map(managedAccountProjection),
        nextCursor: result.nextCursor,
      }),
      requestId,
    ),
  };
}

export async function handleUpdateManagedAccount(
  request: ApiHttpRequest,
  accountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.updateManagedAccount === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = accountManagementUpdateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (parsed.data.roles?.includes("ADMIN") === true) {
    return errorResponse("forbidden", requestId);
  }
  const updated = await dependencies.updateManagedAccount({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId: accountId,
    expectedVersion: parsed.data.expectedVersion,
    ...(parsed.data.status === undefined
      ? {}
      : { nextStatus: parsed.data.status }),
    ...(parsed.data.roles === undefined
      ? {}
      : { nextRoles: parsed.data.roles }),
    ...(parsed.data.scopes === undefined
      ? {}
      : { nextScopes: parsed.data.scopes }),
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      managedAccountPageProjectionSchema.shape.accounts.element.parse(
        managedAccountProjection(updated),
      ),
      requestId,
    ),
  };
}

export async function handleRevokeManagedAccountSessions(
  request: ApiHttpRequest,
  accountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.revokeManagedAccountSessions === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = accountSessionRevokeRequestSchema.safeParse(
    request.body ?? {},
  );
  if (!parsed.success) return validationResponse(requestId);
  const result = await dependencies.revokeManagedAccountSessions({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId: accountId,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      revokedAccountSessionsProjectionSchema.parse(result),
      requestId,
    ),
  };
}

export async function handleAccountSecurity(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const security: AccountSecurityStatus =
    dependencies.getAccountSecurity === undefined
      ? {
          provider: "NOT_CONFIGURED",
          recovery: "UNAVAILABLE",
          mfa: "UNAVAILABLE",
          session: "ACTIVE",
        }
      : await dependencies.getAccountSecurity(principal.principalId);
  return {
    status: 200,
    body: apiSuccessResponse(parseAccountSecurity(security), requestId),
  };
}

export async function handleAccountOperation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
  operation: (
    provider: IdentityProviderPort,
    principalId: string,
  ) => Promise<IdentityProviderOperation>,
): Promise<ApiHttpResponse> {
  const parsed = accountActionRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.identityProvider === undefined) {
    return errorResponse("state_conflict", requestId);
  }
  const result = await operation(
    dependencies.identityProvider,
    principal.principalId,
  );
  return {
    status: 202,
    body: apiSuccessResponse(
      accountOperationProjectionSchema.parse(result),
      requestId,
    ),
  };
}

export async function handleAccountVerificationOperation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
  operation: (
    provider: IdentityProviderPort,
    principalId: string,
    operationId: string,
    verificationCode: string,
  ) => Promise<IdentityProviderOperation>,
): Promise<ApiHttpResponse> {
  const parsed = accountVerificationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.identityProvider === undefined) {
    return errorResponse("state_conflict", requestId);
  }
  const result = await operation(
    dependencies.identityProvider,
    principal.principalId,
    parsed.data.operationId,
    parsed.data.verificationCode,
  );
  return {
    status: 202,
    body: apiSuccessResponse(
      accountOperationProjectionSchema.parse(result),
      requestId,
    ),
  };
}
