import { randomUUID } from "node:crypto";

import type {
  CorrectionResult,
  FeedbackTicketHistoryState,
  FeedbackTriageMetadataState,
  FeedbackTriageQueueState,
} from "@cvg/application";
import type { FeedbackTicketState } from "@cvg/domain";
import {
  apiSuccessResponse,
  correctionResultProjectionSchema,
  feedbackTicketHistoryPathSchema,
  feedbackTicketHistoryProjectionSchema,
  feedbackTicketHistoryQuerySchema,
  feedbackTicketInternalTransitionRequestSchema,
  feedbackTicketParticipantCreateRequestSchema,
  feedbackTriageMetadataPathSchema,
  feedbackTriageMetadataProjectionSchema,
  feedbackTriageMetadataRequestSchema,
  feedbackTriageQueueProjectionSchema,
  feedbackTriageQueueQuerySchema,
  participantFeedbackTicketProjectionSchema,
  participantFeedbackTicketsProjectionSchema,
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

export function publicCorrectionProjection(
  correction: CorrectionResult,
): ApiSuccessEnvelope<unknown>["data"] {
  return correctionResultProjectionSchema.parse({
    attemptStatus: correction.attempt.status,
    attemptVersion: correction.attempt.version,
    resultVersion: correction.result.version,
    score: correction.result.score,
    outcome: correction.result.outcome,
    feedback: correction.result.feedback,
  });
}

export function publicFeedbackTicketProjection(
  state: FeedbackTicketState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantFeedbackTicketProjectionSchema.parse({
    ticketId: state.ticketId,
    type: state.type,
    description: state.description,
    createdAt: state.createdAt,
    status: state.status,
    version: state.version,
  });
}

export function publicFeedbackTicketsProjection(
  states: readonly FeedbackTicketState[],
): ApiSuccessEnvelope<unknown>["data"] {
  return participantFeedbackTicketsProjectionSchema.parse({
    tickets: states.map((state) => publicFeedbackTicketProjection(state)),
  });
}

export function internalFeedbackTriageQueueProjection(
  state: FeedbackTriageQueueState,
): ApiSuccessEnvelope<unknown>["data"] {
  return feedbackTriageQueueProjectionSchema.parse({
    kind: state.kind,
    scopeId: state.scopeId,
    generatedAt: state.generatedAt,
    filters: { ...state.filters },
    items: state.items.map((item) => ({ ...item })),
  });
}

export function internalFeedbackTriageMetadataProjection(
  state: FeedbackTriageMetadataState,
): ApiSuccessEnvelope<unknown>["data"] {
  return feedbackTriageMetadataProjectionSchema.parse({
    ticketId: state.ticketId,
    scopeId: state.scopeId,
    status: state.status,
    version: state.version,
    priority: state.priority,
    ...(state.assigneeId === undefined ? {} : { assigneeId: state.assigneeId }),
  });
}

export function internalFeedbackTicketHistoryProjection(
  state: FeedbackTicketHistoryState,
): ApiSuccessEnvelope<unknown>["data"] {
  return feedbackTicketHistoryProjectionSchema.parse({
    ticketId: state.ticketId,
    events: state.events.map((event) => ({ ...event })),
  });
}

export async function handleFeedback(
  attemptId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const attempt = await dependencies.resolveAttempt(attemptId, {
    participantId: principal.principalId,
  });
  if (attempt === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId, {
    participantId: principal.principalId,
  });
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "VIEW_OWN_FEEDBACK", {
      ownerId: attempt.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  const correction = await dependencies.getAttemptFeedback(
    principal.principalId,
    attemptId,
  );
  if (correction === null) return errorResponse("not_found", requestId);
  return {
    status: 200,
    body: apiSuccessResponse(publicCorrectionProjection(correction), requestId),
  };
}

export async function handleCreateFeedbackTicket(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = feedbackTicketParticipantCreateRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.createFeedbackTicket === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const scopeId =
    principal.roles.includes("PARTICIPANT") && principal.scopes.length === 1
      ? principal.scopes[0]
      : undefined;
  if (scopeId === undefined) return validationResponse(requestId, "scopeId");
  if (
    !isAllowed(principal, "CREATE_FEEDBACK_TICKET", {
      ownerId: principal.principalId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.createFeedbackTicket({
    ticketId: randomUUID(),
    participantId: principal.principalId,
    scopeId,
    type: parsed.data.type,
    description: parsed.data.description,
    createdAt: new Date().toISOString(),
    actorId: principal.principalId,
    requestId,
    correlationId: requestId,
  });
  return {
    status: 201,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

export async function handleGetParticipantFeedback(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getParticipantFeedback === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    principal.scopes.length === 0 ||
    !principal.scopes.every((scopeId) =>
      isAllowed(principal, "VIEW_OWN_FEEDBACK", {
        ownerId: principal.principalId,
        scopeId,
      }),
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const states = await dependencies.getParticipantFeedback({
    participantId: principal.principalId,
    scopeIds: principal.scopes,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      publicFeedbackTicketsProjection(states),
      requestId,
    ),
  };
}

export async function handleTransitionFeedbackTicket(
  request: ApiHttpRequest,
  ticketId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = feedbackTicketInternalTransitionRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success || parsed.data.ticketId !== ticketId) {
    return validationResponse(requestId);
  }
  if (dependencies.transitionFeedbackTicket === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (dependencies.resolveFeedbackTicketParticipant === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(
      principal,
      "TRANSITION_FEEDBACK_TICKET",
      {
        scopeId: parsed.data.scopeId,
      },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const participantId = await dependencies.resolveFeedbackTicketParticipant(
    ticketId,
    parsed.data.scopeId,
  );
  if (participantId === null) return errorResponse("not_found", requestId);
  const state = await dependencies.transitionFeedbackTicket({
    ticketId,
    participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event: { type: parsed.data.event },
    actorId: principal.principalId,
    requestId,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

export async function handleUpdateFeedbackTriageMetadata(
  request: ApiHttpRequest,
  ticketId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsedPath = feedbackTriageMetadataPathSchema.safeParse({ ticketId });
  const parsedBody = feedbackTriageMetadataRequestSchema.safeParse(
    request.body,
  );
  if (!parsedPath.success || !parsedBody.success) {
    return validationResponse(requestId);
  }
  if (dependencies.updateFeedbackTriageMetadata === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !principal.scopes.some((scopeId) =>
      isAllowed(
        principal,
        "MANAGE_FEEDBACK_METADATA",
        { scopeId },
        dependencies.approvedClinicalApproverId,
      ),
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.updateFeedbackTriageMetadata({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
    ticketId: parsedPath.data.ticketId,
    expectedVersion: parsedBody.data.expectedVersion,
    priority: parsedBody.data.priority,
    assignment: parsedBody.data.assignment,
    requestId,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      internalFeedbackTriageMetadataProjection(state),
      requestId,
    ),
  };
}

export async function handleFeedbackTriageQueue(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const rawQuery = request.query ?? {};
  if (
    Object.keys(rawQuery).some(
      (key) =>
        key !== "scopeId" &&
        key !== "status" &&
        key !== "cursor" &&
        key !== "limit",
    )
  ) {
    return validationResponse(requestId);
  }
  const rawLimit = rawQuery.limit;
  const parsed = feedbackTriageQueueQuerySchema.safeParse({
    scopeId: rawQuery.scopeId,
    ...(rawQuery.status === undefined ? {} : { status: rawQuery.status }),
    ...(rawQuery.cursor === undefined ? {} : { cursor: rawQuery.cursor }),
    ...(rawLimit === undefined ? {} : { limit: Number(rawLimit) }),
  });
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.getFeedbackTriageQueue === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(
      principal,
      "VIEW_FEEDBACK_QUEUE",
      { scopeId: parsed.data.scopeId },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.getFeedbackTriageQueue({
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
      ...(parsed.data.cursor === undefined
        ? {}
        : { cursor: parsed.data.cursor }),
      limit: parsed.data.limit,
    },
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      internalFeedbackTriageQueueProjection(state),
      requestId,
      {
        has_next: state.hasNext,
        ...(state.nextCursor === undefined
          ? {}
          : { next_cursor: state.nextCursor }),
      },
    ),
  };
}

export async function handleFeedbackTicketHistory(
  request: ApiHttpRequest,
  ticketId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsedPath = feedbackTicketHistoryPathSchema.safeParse({ ticketId });
  if (!parsedPath.success) return validationResponse(requestId);
  const rawQuery = request.query ?? {};
  if (Object.keys(rawQuery).some((key) => key !== "limit")) {
    return validationResponse(requestId);
  }
  const parsedQuery = feedbackTicketHistoryQuerySchema.safeParse({
    ...(rawQuery.limit === undefined ? {} : { limit: Number(rawQuery.limit) }),
  });
  if (!parsedQuery.success) return validationResponse(requestId);
  if (dependencies.getFeedbackTicketHistory === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !principal.scopes.some((scopeId) =>
      isAllowed(
        principal,
        "VIEW_FEEDBACK_QUEUE",
        { scopeId },
        dependencies.approvedClinicalApproverId,
      ),
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.getFeedbackTicketHistory({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    ticketId: parsedPath.data.ticketId,
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
  if (!principal.scopes.includes(state.scopeId)) {
    return errorResponse("internal_error", requestId);
  }
  return {
    status: 200,
    body: apiSuccessResponse(
      internalFeedbackTicketHistoryProjection(state),
      requestId,
    ),
  };
}
