import { ApplicationError } from "@cvg/application";
import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiHttpResponse,
} from "./http-types.js";
export type {
  AccountSecurityStatus,
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiHttpResponse,
  ApiPrincipal,
  OperationalEvidence,
  OperationalEvidenceStatus,
} from "./http-types.js";
import { errorResponse } from "./http-support.js";
import { routeApiRequest } from "./http-router.js";
export async function handleApiRequest(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const requestId = dependencies.requestIdFactory();

  try {
    return await routeApiRequest(request, requestId, dependencies);
  } catch (error) {
    if (error instanceof ApplicationError) {
      return errorResponse(error.code, requestId, error.status);
    }
    return errorResponse("internal_error", requestId);
  }
}
