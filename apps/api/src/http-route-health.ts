import { apiSuccessResponse } from "@cvg/contracts";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiHttpResponse,
  ApiPrincipal,
} from "./http-types.js";
import {
  errorResponse,
  hasMetricsScrapeToken,
  isAllowed,
} from "./http-support.js";

type DependencyStatus = Awaited<
  ReturnType<NonNullable<ApiHttpDependencies["dependencyStatus"]>>
>;
type DependencyStatusReader = NonNullable<
  ApiHttpDependencies["dependencyStatus"]
>;

type DependencyCacheEntry = Readonly<{
  readonly value: DependencyStatus | null;
  readonly expiresAt: number;
  readonly inFlight: Promise<DependencyStatus> | null;
}>;

const dependencyCacheTtlMs = 5_000;
const dependencyCache = new WeakMap<object, DependencyCacheEntry>();

function matches(
  request: ApiHttpRequest,
  path: string,
  method = "GET",
): boolean {
  return request.method === method && request.path === path;
}

async function readinessResponse(
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  try {
    await dependencies.healthcheck();
  } catch {
    return errorResponse("internal_error", requestId, 503);
  }
  return {
    status: 200,
    body: apiSuccessResponse({ status: "ready" }, requestId),
  };
}

async function authorizeDependencyRequest(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse | null> {
  try {
    if (hasMetricsScrapeToken(request, dependencies.metricsScrapeToken)) {
      return null;
    }
    let principal: ApiPrincipal | null;
    try {
      principal = await dependencies.authenticate(request);
    } catch {
      return errorResponse("unauthenticated", requestId);
    }
    if (principal === null) return errorResponse("unauthenticated", requestId);
    return isAllowed(principal, "VIEW_INTERNAL_AUDIT", {})
      ? null
      : errorResponse("forbidden", requestId);
  } catch {
    return errorResponse("unauthenticated", requestId);
  }
}

function dependencyStatusResponse(
  status: DependencyStatus,
  requestId: string,
): ApiHttpResponse {
  return {
    status: status.status === "NOT_READY" ? 503 : 200,
    headers: { "cache-control": "private, max-age=5" },
    body: apiSuccessResponse(status, requestId),
  };
}

function freshDependencyResponse(
  cached: DependencyCacheEntry | undefined,
  now: number,
  requestId: string,
): ApiHttpResponse | null {
  if (cached === undefined) return null;
  if (cached.value !== null && cached.expiresAt > now) {
    return dependencyStatusResponse(cached.value, requestId);
  }
  return null;
}

async function loadDependencyStatus(
  dependencies: ApiHttpDependencies,
  dependencyStatus: DependencyStatusReader,
): Promise<DependencyStatus> {
  const inFlight = dependencyStatus();
  dependencyCache.set(
    dependencies,
    Object.freeze({ value: null, expiresAt: 0, inFlight }),
  );
  const status = await inFlight;
  dependencyCache.set(
    dependencies,
    Object.freeze({
      value: status,
      expiresAt: Date.now() + dependencyCacheTtlMs,
      inFlight: null,
    }),
  );
  return status;
}

async function dependencyResponse(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const authorizationResponse = await authorizeDependencyRequest(
    request,
    requestId,
    dependencies,
  );
  if (authorizationResponse !== null) return authorizationResponse;
  if (dependencies.dependencyStatus === undefined) {
    return errorResponse("internal_error", requestId, 503);
  }
  try {
    const cached = dependencyCache.get(dependencies);
    const cachedResponse = freshDependencyResponse(
      cached,
      Date.now(),
      requestId,
    );
    if (cachedResponse !== null) return cachedResponse;
    if (cached !== undefined && cached.inFlight !== null) {
      return dependencyStatusResponse(await cached.inFlight, requestId);
    }
    const status = await loadDependencyStatus(
      dependencies,
      dependencies.dependencyStatus,
    );
    return dependencyStatusResponse(status, requestId);
  } catch {
    dependencyCache.delete(dependencies);
    return errorResponse("internal_error", requestId, 503);
  }
}

export async function routeHealthRequest(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse | null> {
  if (matches(request, "/health/live")) {
    return {
      status: 200,
      body: apiSuccessResponse({ status: "live" }, requestId),
    };
  }
  if (matches(request, "/health/ready")) {
    return await readinessResponse(requestId, dependencies);
  }
  if (matches(request, "/health/dependencies")) {
    return await dependencyResponse(request, requestId, dependencies);
  }
  return null;
}

function metricsAuthorized(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
): boolean {
  return hasMetricsScrapeToken(request, dependencies.metricsScrapeToken);
}

async function metricsPrincipal(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
  authorizedByScrapeToken: boolean,
): Promise<ApiPrincipal | null> {
  return authorizedByScrapeToken
    ? null
    : await dependencies.authenticate(request);
}

function metricsResponse(
  request: ApiHttpRequest,
  requestId: string,
  prometheus: () => string,
): ApiHttpResponse {
  if (request.path === "/internal/metrics/prometheus") {
    return {
      status: 200,
      body: apiSuccessResponse({ format: "prometheus" }, requestId),
      rawBody: prometheus(),
      rawContentType: "text/plain; version=0.0.4; charset=utf-8",
    };
  }
  return {
    status: 200,
    body: apiSuccessResponse(
      { format: "prometheus", text: prometheus() },
      requestId,
    ),
  };
}

export async function routeMetricsRequest(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse | null> {
  if (
    request.method !== "GET" ||
    !["/internal/metrics", "/internal/metrics/prometheus"].includes(
      request.path,
    )
  ) {
    return null;
  }
  const authorizedByScrapeToken = metricsAuthorized(request, dependencies);
  const principal = await metricsPrincipal(
    request,
    dependencies,
    authorizedByScrapeToken,
  );
  if (!authorizedByScrapeToken && principal === null) {
    return errorResponse("unauthenticated", requestId);
  }
  if (
    !authorizedByScrapeToken &&
    (principal === null || !isAllowed(principal, "VIEW_INTERNAL_AUDIT", {}))
  ) {
    return errorResponse("forbidden", requestId);
  }
  const prometheus = dependencies.observability?.metrics.prometheus;
  return prometheus === undefined
    ? errorResponse("internal_error", requestId)
    : metricsResponse(request, requestId, prometheus);
}
