import { randomUUID } from "node:crypto";

import { createAuditEntry, type AuditOutcome } from "@cvg/application";

import type { ApiHttpResponse } from "./errors.js";
import type { ApiHttpDependencies, ApiPrincipal } from "./contracts.js";
import { isPlainRecord, isUuid } from "./validation.js";

export type ApiRejectionAuditRequest = Readonly<{
  readonly method: string;
  readonly path: string;
  readonly route?: string;
  readonly scopeId?: string;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string | undefined>>;
}>;

export function rejectionAuditOutcome(status: number): AuditOutcome {
  return status === 401 || status === 403 || status === 404
    ? "DENIED"
    : "FAILURE";
}

export async function recordApiRejectionAudit(
  dependencies: ApiHttpDependencies,
  request: ApiRejectionAuditRequest,
  response: ApiHttpResponse,
  principal?: ApiPrincipal,
): Promise<void> {
  if (dependencies.audit === undefined || response.status < 400) return;

  const requestId = response.body.meta.request_id;
  if (!isUuid(requestId)) return;
  const suppliedCorrelationId = request.headers?.["x-correlation-id"];
  const correlationId =
    suppliedCorrelationId !== undefined && isUuid(suppliedCorrelationId)
      ? suppliedCorrelationId
      : requestId;
  const errorCode = response.body.success
    ? "internal_error"
    : response.body.error.code;

  try {
    const requestedScopeId =
      request.scopeId ??
      (isPlainRecord(request.body) && typeof request.body.scopeId === "string"
        ? request.body.scopeId
        : undefined);
    const scopeId =
      principal === undefined
        ? undefined
        : (principal.scopes.find(
            (candidate) => candidate === requestedScopeId,
          ) ?? principal.scopes[0]);
    if (principal !== undefined && scopeId === undefined) {
      reportRejectionAuditFailure(
        dependencies,
        requestId,
        correlationId,
        "AUDIT_SCOPE_UNAVAILABLE",
      );
      return;
    }
    const auditEntry = createAuditEntry({
      auditId: randomUUID(),
      actorKind: principal === undefined ? "ANONYMOUS" : "AUTHENTICATED",
      ...(principal === undefined
        ? {}
        : { principalId: principal.principalId }),
      ...(scopeId === undefined ? {} : { scopeId }),
      action: "HTTP_REQUEST_REJECTED",
      resourceType: "http_route",
      resourceId: request.route ?? "unmatched",
      outcome: rejectionAuditOutcome(response.status),
      reasonCode: `api_${errorCode}`,
      requestId,
      correlationId,
      occurredAt: new Date().toISOString(),
    });
    await dependencies.audit.append(auditEntry);
  } catch {
    reportRejectionAuditFailure(
      dependencies,
      requestId,
      correlationId,
      "AUDIT_APPEND_FAILED",
    );
  }
}

function reportRejectionAuditFailure(
  dependencies: ApiHttpDependencies,
  requestId: string,
  correlationId: string,
  reason: "AUDIT_SCOPE_UNAVAILABLE" | "AUDIT_APPEND_FAILED",
): void {
  // Observer failures must preserve the original safe public rejection.
  try {
    dependencies.observability?.metrics.increment(
      "api.rejection_audit.failures",
      {
        reason,
      },
    );
  } catch {
    // A broken metrics sink must not suppress the independent diagnostic.
  }
  try {
    dependencies.observability?.logger.error("http.rejection.audit.failed", {
      requestId,
      correlationId,
      fields: { outcome: "failure", error_code: reason },
    });
  } catch {
    // Neither the original error nor request data is serialized here.
  }
}
