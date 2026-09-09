import { canAccess } from "@cvg/application";
import type { DependencyStatus } from "@cvg/integrations";
import { apiSuccessResponse, type ApiSuccessEnvelope } from "@cvg/contracts";
import {
  deriveOperationalSnapshot,
  type Observability,
} from "@cvg/observability";

import {
  errorResponse,
  validationResponse,
  type ApiHttpResponse,
} from "../../http/errors.js";
import type { ApiHttpDependencies, ApiHttpRequest } from "../../http.js";
import { isPlainRecord } from "../../http/validation.js";

export function redactDependencyStatus(
  value: DependencyStatus,
): DependencyStatus {
  const candidate: unknown = value;
  if (!isPlainRecord(candidate) || !isPlainRecord(candidate.dependencies)) {
    throw new Error("dependency status shape is invalid");
  }
  const status = candidate.status;
  const postgres = candidate.dependencies.postgres;
  const qdrant = candidate.dependencies.qdrant;
  const ai = candidate.dependencies.ai;
  if (status !== "READY" && status !== "DEGRADED" && status !== "NOT_READY") {
    throw new Error("dependency status value is invalid");
  }
  if (postgres !== "UP" && postgres !== "DOWN") {
    throw new Error("postgres dependency status is invalid");
  }
  if (qdrant !== "UP" && qdrant !== "DOWN" && qdrant !== "DISABLED") {
    throw new Error("qdrant dependency status is invalid");
  }
  if (ai !== "ENABLED" && ai !== "DISABLED") {
    throw new Error("ai dependency status is invalid");
  }
  return Object.freeze({
    status,
    dependencies: Object.freeze({ postgres, qdrant, ai }),
  });
}

export function unexpectedOperationalInput(
  request: ApiHttpRequest,
): "body" | "query" | undefined {
  if (request.body !== undefined) return "body";
  if (request.query !== undefined && Object.keys(request.query).length > 0) {
    return "query";
  }
  return undefined;
}

export function operationalSnapshotEnvelope(
  status: DependencyStatus,
  observability: Observability,
): ApiSuccessEnvelope<unknown>["data"] {
  const snapshot = deriveOperationalSnapshot(
    status.status,
    observability.metrics.snapshot(),
  );
  return {
    status: snapshot.status,
    dependencies: status.dependencies,
    slos: snapshot.slos,
    alerts: snapshot.alerts,
  };
}

/**
 * Operational endpoints (liveness, readiness, dependencies, internal
 * operations/metrics). Returns `null` when the request targets any other
 * route so the main dispatch table keeps ownership of product routes.
 */
export async function handleOperationalRoutes(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse | null> {
  if (request.method === "GET" && request.path === "/health/live") {
    return {
      status: 200,
      body: apiSuccessResponse({ status: "live" }, requestId),
    };
  }

  if (request.method === "GET" && request.path === "/health/ready") {
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

  if (request.method === "GET" && request.path === "/health/dependencies") {
    if (dependencies.dependencyStatus === undefined) {
      return errorResponse("internal_error", requestId, 503);
    }
    try {
      const status = redactDependencyStatus(
        await dependencies.dependencyStatus(),
      );
      return {
        status: status.status === "NOT_READY" ? 503 : 200,
        body: apiSuccessResponse(status, requestId),
      };
    } catch {
      return errorResponse("internal_error", requestId, 503);
    }
  }

  if (request.method === "GET" && request.path === "/internal/operations") {
    const principal = await dependencies.authenticate(request);
    if (principal === null) {
      return errorResponse("unauthenticated", requestId);
    }
    const authorized = canAccess({
      principalId: principal.principalId,
      accountStatus: principal.accountStatus,
      roles: principal.roles,
      capability: "VIEW_INTERNAL_AUDIT",
      scopes: principal.scopes,
    });
    if (!authorized) return errorResponse("forbidden", requestId);
    if (
      dependencies.dependencyStatus === undefined ||
      dependencies.observability === undefined
    ) {
      return errorResponse("internal_error", requestId, 503);
    }
    const unexpectedInput = unexpectedOperationalInput(request);
    if (unexpectedInput !== undefined) {
      return validationResponse(requestId, unexpectedInput);
    }
    try {
      const dependencyStatus = redactDependencyStatus(
        await dependencies.dependencyStatus(),
      );
      return {
        status: dependencyStatus.status === "NOT_READY" ? 503 : 200,
        body: apiSuccessResponse(
          operationalSnapshotEnvelope(
            dependencyStatus,
            dependencies.observability,
          ),
          requestId,
        ),
      };
    } catch {
      return errorResponse("internal_error", requestId, 503);
    }
  }

  if (request.method === "GET" && request.path === "/internal/metrics") {
    const principal = await dependencies.authenticate(request);
    if (principal === null) return errorResponse("unauthenticated", requestId);
    const authorized = canAccess({
      principalId: principal.principalId,
      accountStatus: principal.accountStatus,
      roles: principal.roles,
      capability: "VIEW_INTERNAL_AUDIT",
      scopes: principal.scopes,
    });
    if (!authorized) return errorResponse("forbidden", requestId);
    const prometheus = dependencies.observability?.metrics.prometheus;
    if (prometheus === undefined) {
      return errorResponse("internal_error", requestId);
    }
    return {
      status: 200,
      body: apiSuccessResponse(
        { format: "prometheus", text: prometheus() },
        requestId,
      ),
    };
  }

  return null;
}
