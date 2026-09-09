import { randomUUID } from "node:crypto";

import type {
  AppealDecisionImpactPreviewState,
  AppealReviewHistoryState,
  AppealReviewQueueState,
  AppealReviewTransitionCommand,
} from "@cvg/application";
import {
  apiSuccessResponse,
  appealCreateRequestSchema,
  appealDecisionImpactPathSchema,
  appealDecisionImpactProjectionSchema,
  appealDecisionImpactQuerySchema,
  appealQuerySchema,
  appealReviewHistoryPathSchema,
  appealReviewHistoryProjectionSchema,
  appealReviewHistoryQuerySchema,
  appealReviewQueueProjectionSchema,
  appealReviewQueueQuerySchema,
  appealReviewTransitionRequestSchema,
  participantAppealProjectionSchema,
  participantAppealsProjectionSchema,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";
import type { AppealState } from "@cvg/domain";

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

export function publicAppealProjection(
  state: AppealState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAppealProjectionSchema.parse({
    appealId: state.appealId,
    attemptId: state.attemptId,
    itemId: state.itemId,
    createdAt: state.createdAt,
    dueAt: state.dueAt,
    status: state.status,
    version: state.version,
    ...(state.decision === undefined ? {} : { decision: state.decision }),
  });
}

export function publicAppealsProjection(
  states: readonly AppealState[],
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAppealsProjectionSchema.parse({
    appeals: states.map((state) => publicAppealProjection(state)),
  });
}

export function internalAppealReviewQueueProjection(
  state: AppealReviewQueueState,
): ApiSuccessEnvelope<unknown>["data"] {
  return appealReviewQueueProjectionSchema.parse({
    kind: state.kind,
    scopeId: state.scopeId,
    generatedAt: state.generatedAt,
    filters: { ...state.filters },
    items: state.items.map((item) => ({
      appealId: item.appealId,
      participantId: item.participantId,
      attemptId: item.attemptId,
      itemId: item.itemId,
      justification: item.justification,
      createdAt: item.createdAt,
      dueAt: item.dueAt,
      status: item.status,
      version: item.version,
      ...(item.reviewerId === undefined ? {} : { reviewerId: item.reviewerId }),
      ...(item.decision === undefined ? {} : { decision: item.decision }),
      ...(item.decisionRationale === undefined
        ? {}
        : { decisionRationale: item.decisionRationale }),
      ...(item.decisionAt === undefined ? {} : { decisionAt: item.decisionAt }),
      ...(item.decisionCorrelationId === undefined
        ? {}
        : { decisionCorrelationId: item.decisionCorrelationId }),
    })),
  });
}

export function internalAppealReviewHistoryProjection(
  state: AppealReviewHistoryState,
): ApiSuccessEnvelope<unknown>["data"] {
  return appealReviewHistoryProjectionSchema.parse({
    appealId: state.appealId,
    events: state.events.map((event) => ({ ...event })),
  });
}

export function internalAppealDecisionImpactProjection(
  state: AppealDecisionImpactPreviewState,
): ApiSuccessEnvelope<unknown>["data"] {
  return appealDecisionImpactProjectionSchema.parse({
    kind: state.kind,
    appealId: state.appealId,
    decision: state.decision,
    appeal: { ...state.appeal },
    target: { ...state.target },
    latestResult: { ...state.latestResult },
    impact: { ...state.impact },
  });
}

export async function handleAppealReviewQueue(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const rawQuery = request.query ?? {};
  if (
    Object.keys(rawQuery).some(
      (key) => key !== "scopeId" && key !== "status" && key !== "limit",
    )
  ) {
    return validationResponse(requestId);
  }
  const rawLimit = rawQuery.limit;
  const parsed = appealReviewQueueQuerySchema.safeParse({
    scopeId: rawQuery.scopeId,
    ...(rawQuery.status === undefined ? {} : { status: rawQuery.status }),
    ...(rawLimit === undefined ? {} : { limit: Number(rawLimit) }),
  });
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.getAppealReviewQueue === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(
      principal,
      "REVIEW_APPEAL",
      { scopeId: parsed.data.scopeId },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.getAppealReviewQueue({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
    query: {
      scopeId: parsed.data.scopeId,
      ...(parsed.data.status === undefined
        ? {}
        : { status: parsed.data.status }),
      limit: parsed.data.limit,
    },
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAppealReviewQueueProjection(state),
      requestId,
    ),
  };
}

export async function handleAppealReviewHistory(
  request: ApiHttpRequest,
  appealId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsedPath = appealReviewHistoryPathSchema.safeParse({ appealId });
  if (!parsedPath.success) return validationResponse(requestId);
  const rawQuery = request.query ?? {};
  if (Object.keys(rawQuery).some((key) => key !== "limit")) {
    return validationResponse(requestId);
  }
  const parsedQuery = appealReviewHistoryQuerySchema.safeParse({
    ...(rawQuery.limit === undefined ? {} : { limit: Number(rawQuery.limit) }),
  });
  if (!parsedQuery.success) return validationResponse(requestId);
  if (dependencies.getAppealReviewHistory === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !principal.scopes.some((scopeId) =>
      isAllowed(
        principal,
        "REVIEW_APPEAL",
        { scopeId },
        dependencies.approvedClinicalApproverId,
      ),
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.getAppealReviewHistory({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    appealId: parsedPath.data.appealId,
    ...(parsedQuery.data.limit === undefined
      ? {}
      : { limit: parsedQuery.data.limit }),
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
  });
  if (state === null) return errorResponse("not_found", requestId);
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAppealReviewHistoryProjection(state),
      requestId,
    ),
  };
}

export async function handleAppealDecisionImpact(
  request: ApiHttpRequest,
  appealId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsedPath = appealDecisionImpactPathSchema.safeParse({ appealId });
  if (!parsedPath.success) return validationResponse(requestId);
  if (request.body !== undefined) return validationResponse(requestId);
  const rawQuery = request.query ?? {};
  if (Object.keys(rawQuery).some((key) => key !== "decision")) {
    return validationResponse(requestId);
  }
  const parsedQuery = appealDecisionImpactQuerySchema.safeParse(rawQuery);
  if (!parsedQuery.success) return validationResponse(requestId);
  if (dependencies.getAppealDecisionImpactPreview === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !principal.scopes.some((scopeId) =>
      isAllowed(
        principal,
        "REVIEW_APPEAL",
        { scopeId },
        dependencies.approvedClinicalApproverId,
      ),
    )
  ) {
    return errorResponse("forbidden", requestId);
  }

  const state = await dependencies.getAppealDecisionImpactPreview({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    appealId: parsedPath.data.appealId,
    decision: parsedQuery.data.decision,
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
  });
  if (state === null) return errorResponse("not_found", requestId);
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAppealDecisionImpactProjection(state),
      requestId,
    ),
  };
}

export async function handleGetParticipantAppeals(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = appealQuerySchema.safeParse(request.query ?? {});
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.getParticipantAppeals === undefined) {
    return errorResponse("internal_error", requestId);
  }

  const attempt = await dependencies.resolveAttempt(parsed.data.attemptId, {
    participantId: principal.principalId,
  });
  if (attempt === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId, {
    participantId: principal.principalId,
  });
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "VIEW_OWN_APPEALS", {
      ownerId: attempt.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  const states = await dependencies.getParticipantAppeals({
    participantId: principal.principalId,
    scopeId,
    attemptId: parsed.data.attemptId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicAppealsProjection(states), requestId),
  };
}

export async function handleCreateAppeal(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = appealCreateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.createAppeal === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const attempt = await dependencies.resolveAttempt(parsed.data.attemptId, {
    participantId: principal.principalId,
  });
  if (attempt === null) return errorResponse("not_found", requestId);
  if (
    attempt.status !== "CORRIGIDA_AUTOMATICAMENTE" &&
    attempt.status !== "CORRIGIDA_HUMANAMENTE"
  ) {
    return errorResponse("state_conflict", requestId);
  }
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId, {
    participantId: principal.principalId,
  });
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "CREATE_APPEAL", {
      ownerId: attempt.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const itemBelongsToActivity =
    dependencies.hasParticipantActivityItem === undefined
      ? (
          await dependencies.getParticipantActivity(
            principal.principalId,
            attempt.activityId,
          )
        ).items.some(
          (item) =>
            item.itemId === parsed.data.itemId &&
            (item.kind === "QUESTAO" || item.kind === "CASO"),
        )
      : await dependencies.hasParticipantActivityItem(
          principal.principalId,
          attempt.activityId,
          parsed.data.itemId,
        );
  if (!itemBelongsToActivity) {
    return errorResponse("not_found", requestId);
  }
  const state = await dependencies.createAppeal({
    appealId: randomUUID(),
    participantId: principal.principalId,
    scopeId,
    attemptId: parsed.data.attemptId,
    itemId: parsed.data.itemId,
    justification: parsed.data.justification,
    createdAt: new Date().toISOString(),
  });
  return {
    status: 201,
    body: apiSuccessResponse(publicAppealProjection(state), requestId),
  };
}

export async function handleTransitionAppeal(
  request: ApiHttpRequest,
  appealId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = appealReviewTransitionRequestSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.appealId !== appealId) {
    return validationResponse(requestId);
  }
  if (dependencies.transitionAppealReview === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(principal, "REVIEW_APPEAL", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const event = {
    type: parsed.data.event,
    ...(parsed.data.decision === undefined
      ? {}
      : { decision: parsed.data.decision }),
    ...(parsed.data.decisionRationale === undefined
      ? {}
      : { decisionRationale: parsed.data.decisionRationale }),
  } as AppealReviewTransitionCommand["event"];
  const state = await dependencies.transitionAppealReview({
    appealId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    actorId: principal.principalId,
    correlationId: requestId,
    event,
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicAppealProjection(state), requestId),
  };
}
