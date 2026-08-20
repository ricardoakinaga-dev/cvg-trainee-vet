import { ApplicationError } from "@cvg/application";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiHttpResponse,
  ApiPrincipal,
} from "./http-types.js";

export type RouteResult = ApiHttpResponse | null;

export type RouteHandler = (
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
) => Promise<RouteResult>;

export async function requirePrincipal(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
): Promise<ApiPrincipal> {
  const principal = await dependencies.authenticate(request);
  if (principal === null) {
    throw new ApplicationError("unauthenticated", "Authentication required");
  }
  return principal;
}

export function matchesRoute(
  request: ApiHttpRequest,
  method: string,
  path: string,
): boolean {
  return request.method === method && request.path === path;
}

export function matchRoute(
  request: ApiHttpRequest,
  method: string,
  pattern: RegExp,
): RegExpMatchArray | null {
  return request.method === method ? request.path.match(pattern) : null;
}

export async function runRouteHandlers(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
  handlers: readonly RouteHandler[],
): Promise<RouteResult> {
  for (const handler of handlers) {
    const response = await handler(request, requestId, dependencies);
    if (response !== null) return response;
  }
  return null;
}
