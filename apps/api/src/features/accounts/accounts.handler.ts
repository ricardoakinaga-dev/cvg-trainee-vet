import {
  apiSuccessResponse,
  accountRecoveryAcceptProjectionSchema,
  accountRecoveryAcceptRequestSchema,
  accountRecoveryIssueProjectionSchema,
  accountRecoveryIssueRequestSchema,
  accountStatusChangeProjectionSchema,
  accountStatusChangeRequestSchema,
} from "@cvg/contracts";

import {
  errorResponse,
  validationResponse,
  type ApiHttpResponse,
} from "../../http/errors.js";
import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import { isAllowed } from "../../http/authorization.js";
import { isUuid } from "../../http/validation.js";

export async function handleAccountStatusChange(
  request: ApiHttpRequest,
  targetAccountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isUuid(targetAccountId)) return validationResponse(requestId);
  const parsed = accountStatusChangeRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.changeAccountStatus === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(principal, "MANAGE_ACCOUNT_LIFECYCLE", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const result = await dependencies.changeAccountStatus({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId,
    scopeId: parsed.data.scopeId,
    expectedStatus: parsed.data.expectedStatus,
    status: parsed.data.status,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      accountStatusChangeProjectionSchema.parse({
        status: result.status,
        revokedSessions: result.revokedSessions,
      }),
      requestId,
    ),
  };
}

export async function handleIssueAccountRecovery(
  request: ApiHttpRequest,
  targetAccountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isUuid(targetAccountId)) return validationResponse(requestId);
  const parsed = accountRecoveryIssueRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.issueAccountRecovery === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(principal, "MANAGE_ACCOUNT_LIFECYCLE", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const result = await dependencies.issueAccountRecovery({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId,
    scopeId: parsed.data.scopeId,
    expiresInSeconds: parsed.data.expiresInSeconds,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      accountRecoveryIssueProjectionSchema.parse({
        professionalEmail: result.professionalEmail,
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
        revokedSessions: result.revokedSessions,
      }),
      requestId,
    ),
  };
}

export async function handleAcceptAccountRecovery(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = accountRecoveryAcceptRequestSchema.safeParse(request.body);
  if (!parsed.success) return errorResponse("not_found", requestId);
  if (dependencies.acceptAccountRecovery === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const accepted = await dependencies.acceptAccountRecovery({
    token: parsed.data.token,
    sessionExpiresInSeconds: parsed.data.sessionExpiresInSeconds,
    correlationId: requestId,
  });
  return {
    status: 200,
    headers: { "set-cookie": accepted.session.cookie },
    body: apiSuccessResponse(
      accountRecoveryAcceptProjectionSchema.parse({ status: "active" }),
      requestId,
    ),
  };
}
