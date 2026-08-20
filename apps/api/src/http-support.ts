import { timingSafeEqual } from "node:crypto";

import type { FeedbackTicketState } from "@cvg/domain";
import { inspectFeedbackContent } from "@cvg/domain";
import { canAccess, type Capability } from "@cvg/application";
import { apiErrorResponse, type ApiErrorCode } from "@cvg/contracts";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiHttpResponse,
  ApiPrincipal,
} from "./http.js";

const statusByErrorCode: Readonly<Record<ApiErrorCode, number>> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_error: 422,
  state_conflict: 409,
  idempotency_conflict: 409,
  rate_limited: 429,
  internal_error: 500,
};

const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._~:-]{0,127}$/u;

export function readIdempotencyKey(request: ApiHttpRequest): string | null {
  const header = Object.entries(request.headers ?? {}).find(
    ([name]) => name.toLowerCase() === "idempotency-key",
  )?.[1];
  if (header === undefined || !idempotencyKeyPattern.test(header)) return null;
  return header;
}

export function validationResponse(
  requestId: string,
  field?: string,
): ApiHttpResponse {
  return {
    status: 422,
    body: apiErrorResponse(
      "validation_error",
      requestId,
      field ? [{ code: "invalid_input", field }] : [],
    ),
  };
}

export function errorResponse(
  code: ApiErrorCode,
  requestId: string,
  status = statusByErrorCode[code],
): ApiHttpResponse {
  return { status, body: apiErrorResponse(code, requestId) };
}

export function hasMetricsScrapeToken(
  request: ApiHttpRequest,
  expectedToken: string | undefined,
): boolean {
  if (expectedToken === undefined) return false;
  const authorization = request.headers?.authorization;
  const prefix = "Bearer ";
  if (authorization === undefined || !authorization.startsWith(prefix)) {
    return false;
  }
  const provided = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(expectedToken);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

function feedbackSafetyReasonCodes(
  state: FeedbackTicketState,
): readonly string[] {
  const values = [
    inspectFeedbackContent(state.description),
    ...(state.response === undefined
      ? []
      : [inspectFeedbackContent(state.response.message)]),
  ];
  return Object.freeze([
    ...new Set(values.flatMap((inspection) => inspection.reasons)),
  ]);
}

export async function recordFeedbackSafetyEventIfNeeded(
  state: FeedbackTicketState,
  principalId: string,
  scopeId: string,
  requestId: string,
  action: "REDACTED",
  dependencies: ApiHttpDependencies,
): Promise<void> {
  const reasonCodes = feedbackSafetyReasonCodes(state);
  if (
    reasonCodes.length === 0 ||
    dependencies.recordFeedbackSafetyEvent === undefined
  ) {
    return;
  }
  await dependencies.recordFeedbackSafetyEvent({
    principalId,
    scopeId,
    ticketId: state.ticketId,
    requestId,
    action,
    reasonCodes,
  });
}

export function isAllowed(
  principal: ApiPrincipal,
  capability: Capability,
  resource: Readonly<{ ownerId?: string; scopeId?: string }>,
  approvedClinicalApproverId?: string,
): boolean {
  return canAccess({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    capability,
    resource,
    scopes: principal.scopes,
    ...(capability === "PUBLISH_CONTENT" ||
    capability === "VIEW_INTERNAL_SOURCE" ||
    capability === "APPROVE_CLINICAL_CONTENT" ||
    capability === "VIEW_CLINICAL_REVIEW_QUEUE" ||
    capability === "VIEW_FEEDBACK_TICKETS"
      ? {
          ...(approvedClinicalApproverId === undefined
            ? {}
            : { approvedClinicalApproverId }),
        }
      : {}),
  });
}

export function resolveDigitalCaseScope(
  principal: ApiPrincipal,
  requestedScopeId: string | undefined,
): string | null {
  const scopeId =
    requestedScopeId ??
    (principal.scopes.length === 1 ? principal.scopes[0] : undefined);
  if (
    scopeId === undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      scopeId,
    )
  ) {
    return null;
  }
  return scopeId;
}

export function canViewOperationalAi(principal: ApiPrincipal): boolean {
  return isAllowed(principal, "VIEW_INTERNAL_AUDIT", {});
}
