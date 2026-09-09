import {
  apiSuccessResponse,
  acceptInvitationRequestSchema,
  createInvitationRequestSchema,
  resendAccountInvitationRequestSchema,
  resentAccountInvitationProjectionSchema,
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

export async function handleCreateInvitation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = createInvitationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const created = await dependencies.createInvitation({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    professionalEmail: parsed.data.professionalEmail,
    invitedRoles: parsed.data.invitedRoles,
    invitedScopes: parsed.data.invitedScopes,
    expiresInSeconds: parsed.data.expiresInSeconds,
    correlationId: requestId,
  });

  return {
    status: 201,
    body: apiSuccessResponse(
      {
        invitationId: created.invitationId,
        professionalEmail: created.professionalEmail,
        token: created.token,
        expiresAt: created.expiresAt.toISOString(),
      },
      requestId,
    ),
  };
}

export async function handleResendAccountInvitation(
  request: ApiHttpRequest,
  targetAccountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isUuid(targetAccountId)) return validationResponse(requestId);
  const parsed = resendAccountInvitationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.resendAccountInvitation === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(principal, "MANAGE_ACCOUNT_LIFECYCLE", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const result = await dependencies.resendAccountInvitation({
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
      resentAccountInvitationProjectionSchema.parse({
        professionalEmail: result.professionalEmail,
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
      }),
      requestId,
    ),
  };
}

export async function handleAcceptInvitation(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = acceptInvitationRequestSchema.safeParse(request.body);
  if (!parsed.success) return errorResponse("not_found", requestId);

  const accepted = await dependencies.acceptInvitation({
    token: parsed.data.token,
    sessionExpiresInSeconds: parsed.data.sessionExpiresInSeconds,
    correlationId: requestId,
  });

  return {
    status: 200,
    headers: { "set-cookie": accepted.session.cookie },
    body: apiSuccessResponse({ status: "active" }, requestId),
  };
}
