import { clearSessionCookie } from "@cvg/application";
import {
  apiSuccessResponse,
  internalSessionScopesProjectionSchema,
  rotateSessionRequestSchema,
  sessionCurrentProjectionSchema,
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

export async function handleRevokeSession(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.revokeSession !== undefined) {
    await dependencies.revokeSession(request.headers?.cookie);
  }
  return {
    status: 200,
    headers: { "set-cookie": clearSessionCookie() },
    body: apiSuccessResponse({ status: "revoked" }, requestId),
  };
}

export async function handleCurrentSession(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const principal = await dependencies.authenticate(request);
  if (principal === null) return errorResponse("unauthenticated", requestId);

  return {
    status: 200,
    body: apiSuccessResponse(
      sessionCurrentProjectionSchema.parse({ status: "active" }),
      requestId,
    ),
  };
}

export async function handleRotateSession(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = rotateSessionRequestSchema.safeParse(request.body ?? {});
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.rotateSession === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const rotated = await dependencies.rotateSession(
    request.headers?.cookie,
    parsed.data.sessionExpiresInSeconds,
  );
  if (rotated === null) return errorResponse("unauthenticated", requestId);
  return {
    status: 200,
    headers: { "set-cookie": rotated.cookie },
    body: apiSuccessResponse({ status: "rotated" }, requestId),
  };
}

export async function handleInternalSessionScopes(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (
    !isAllowed(
      principal,
      "VIEW_INTERNAL_SCOPES",
      {},
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const data = internalSessionScopesProjectionSchema.parse({
    kind: "internal_session_scopes",
    scopes: [...principal.scopes],
  });
  return {
    status: 200,
    body: apiSuccessResponse(data, requestId),
  };
}
