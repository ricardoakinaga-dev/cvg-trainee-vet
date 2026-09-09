import { clearSessionCookie } from "@cvg/application";
import {
  apiSuccessResponse,
  rotateSessionRequestSchema,
  sessionCurrentProjectionSchema,
} from "@cvg/contracts";

import {
  errorResponse,
  validationResponse,
  type ApiHttpResponse,
} from "../../http/errors.js";
import type { ApiHttpDependencies, ApiHttpRequest } from "../../http.js";

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
