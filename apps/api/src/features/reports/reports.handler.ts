import type {
  ContinuingEducationReportState,
  ReflectionManagementState,
} from "@cvg/application";
import {
  apiSuccessResponse,
  continuingEducationReportProjectionSchema,
  continuingEducationReportQuerySchema,
  reflectionManagementProjectionSchema,
  reflectionManagementQuerySchema,
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

export function publicContinuingEducationReportProjection(
  state: ContinuingEducationReportState,
): ApiSuccessEnvelope<unknown>["data"] {
  return continuingEducationReportProjectionSchema.parse({
    kind: state.kind,
    scopeId: state.scopeId,
    generatedAt: state.generatedAt,
    filters: { ...state.filters },
    summary: { ...state.summary },
    participants: state.participants.map((participant) => ({
      ...participant,
    })),
    modules: state.modules.map((module) => ({ ...module })),
    pagination: { ...state.pagination },
    learningEvidence: state.learningEvidence,
    hoursClaim: state.hoursClaim,
    practicalCompetenceClaim: state.practicalCompetenceClaim,
  });
}

export function publicReflectionManagementProjection(
  state: ReflectionManagementState,
): ApiSuccessEnvelope<unknown>["data"] {
  return reflectionManagementProjectionSchema.parse({
    kind: state.kind,
    scopeId: state.scopeId,
    generatedAt: state.generatedAt,
    modules: state.modules.map((module) => ({
      moduleId: module.moduleId,
      totalAssignments: module.totalAssignments,
      counts: { ...module.counts },
    })),
    evidence: state.evidence,
    practicalCompetenceClaim: state.practicalCompetenceClaim,
  });
}

export async function handleContinuingEducationReport(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const rawQuery = request.query ?? {};
  const parsed = continuingEducationReportQuerySchema.safeParse({
    ...rawQuery,
    ...(rawQuery.page === undefined ? {} : { page: Number(rawQuery.page) }),
    ...(rawQuery.pageSize === undefined
      ? {}
      : { pageSize: Number(rawQuery.pageSize) }),
  });
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.getContinuingEducationReport === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(principal, "VIEW_PROGRAM_METRICS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.getContinuingEducationReport(
    principal.principalId,
    parsed.data,
  );
  return {
    status: 200,
    body: apiSuccessResponse(
      publicContinuingEducationReportProjection(state),
      requestId,
    ),
  };
}

export async function handleReflectionManagementReport(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = reflectionManagementQuerySchema.safeParse(request.query ?? {});
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.getReflectionManagementReport === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(principal, "VIEW_PROGRAM_METRICS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.getReflectionManagementReport(
    principal.principalId,
    parsed.data,
  );
  return {
    status: 200,
    body: apiSuccessResponse(
      publicReflectionManagementProjection(state),
      requestId,
    ),
  };
}
