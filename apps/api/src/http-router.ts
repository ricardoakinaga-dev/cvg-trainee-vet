import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiHttpResponse,
} from "./http-types.js";
import {
  findApiSurfaceRoute,
  type ApiSurfaceHandlerGroup,
} from "@cvg/contracts";
import { routeAuthoringRequest } from "./http-route-authoring.js";
import {
  routeHealthRequest,
  routeMetricsRequest,
} from "./http-route-health.js";
import { routeInternalRequest } from "./http-route-internal.js";
import { routeParticipantRequest } from "./http-route-participant.js";
import { routeWorkflowRequest } from "./http-route-workflow.js";
import { errorResponse } from "./http-support.js";

type RouteGroup = (
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
) => Promise<ApiHttpResponse | null>;

export const API_ROUTE_GROUPS: Readonly<
  Record<ApiSurfaceHandlerGroup, RouteGroup>
> = Object.freeze({
  health: routeHealthRequest,
  metrics: routeMetricsRequest,
  workflow: routeWorkflowRequest,
  internal: routeInternalRequest,
  participant: routeParticipantRequest,
  authoring: routeAuthoringRequest,
});

export async function routeApiRequest(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const canonicalRoute = findApiSurfaceRoute(request.method, request.path);
  if (canonicalRoute === null) return errorResponse("not_found", requestId);

  const routeGroup = API_ROUTE_GROUPS[canonicalRoute.handlerGroup];
  const response = await routeGroup(request, requestId, dependencies);
  return response ?? errorResponse("not_found", requestId);
}
