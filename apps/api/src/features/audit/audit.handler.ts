import type { AuditTrailState, GetAuditTrailCommand } from "@cvg/application";
import {
  apiSuccessResponse,
  auditTrailProjectionSchema,
  auditTrailQuerySchema,
  type ApiSuccessEnvelope,
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

export function internalAuditTrailProjection(
  state: AuditTrailState,
): ApiSuccessEnvelope<unknown>["data"] {
  return auditTrailProjectionSchema.parse({
    kind: state.kind,
    scopeId: state.scopeId,
    filters: { ...state.filters },
    items: state.items.map((item) => ({ ...item })),
  });
}

export async function handleAuditTrail(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const rawQuery = request.query ?? {};
  const allowedKeys = new Set([
    "scopeId",
    "action",
    "resourceType",
    "resourceId",
    "principalId",
    "actorKind",
    "outcome",
    "from",
    "to",
    "cursor",
    "limit",
  ]);
  if (Object.keys(rawQuery).some((key) => !allowedKeys.has(key))) {
    return validationResponse(requestId);
  }
  const rawLimit = rawQuery.limit;
  const parsed = auditTrailQuerySchema.safeParse({
    scopeId: rawQuery.scopeId,
    ...(rawQuery.action === undefined ? {} : { action: rawQuery.action }),
    ...(rawQuery.resourceType === undefined
      ? {}
      : { resourceType: rawQuery.resourceType }),
    ...(rawQuery.resourceId === undefined
      ? {}
      : { resourceId: rawQuery.resourceId }),
    ...(rawQuery.principalId === undefined
      ? {}
      : { principalId: rawQuery.principalId }),
    ...(rawQuery.actorKind === undefined
      ? {}
      : { actorKind: rawQuery.actorKind }),
    ...(rawQuery.outcome === undefined ? {} : { outcome: rawQuery.outcome }),
    ...(rawQuery.from === undefined ? {} : { from: rawQuery.from }),
    ...(rawQuery.to === undefined ? {} : { to: rawQuery.to }),
    ...(rawQuery.cursor === undefined ? {} : { cursor: rawQuery.cursor }),
    ...(rawLimit === undefined ? {} : { limit: Number(rawLimit) }),
  });
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.getAuditTrail === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(
      principal,
      "VIEW_AUDIT_TRAIL",
      { scopeId: parsed.data.scopeId },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const query: GetAuditTrailCommand["query"] = {
    scopeId: parsed.data.scopeId,
    ...(parsed.data.action === undefined ? {} : { action: parsed.data.action }),
    ...(parsed.data.resourceType === undefined
      ? {}
      : { resourceType: parsed.data.resourceType }),
    ...(parsed.data.resourceId === undefined
      ? {}
      : { resourceId: parsed.data.resourceId }),
    ...(parsed.data.principalId === undefined
      ? {}
      : { principalId: parsed.data.principalId }),
    ...(parsed.data.actorKind === undefined
      ? {}
      : { actorKind: parsed.data.actorKind }),
    ...(parsed.data.outcome === undefined
      ? {}
      : { outcome: parsed.data.outcome }),
    ...(parsed.data.from === undefined ? {} : { from: parsed.data.from }),
    ...(parsed.data.to === undefined ? {} : { to: parsed.data.to }),
    ...(parsed.data.cursor === undefined ? {} : { cursor: parsed.data.cursor }),
    limit: parsed.data.limit,
  };
  const state = await dependencies.getAuditTrail({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
    query,
  });
  return {
    status: 200,
    body: apiSuccessResponse(internalAuditTrailProjection(state), requestId, {
      has_next: state.hasNext,
      ...(state.nextCursor === undefined
        ? {}
        : { next_cursor: state.nextCursor }),
    }),
  };
}
