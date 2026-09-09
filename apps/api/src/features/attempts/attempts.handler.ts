import type { AnswerState, AttemptState } from "@cvg/domain";
import type { CorrectOpenResponseCommand } from "@cvg/application";
import {
  apiSuccessResponse,
  correctOpenResponseRequestSchema,
  correctionResultProjectionSchema,
  createAttemptRequestSchema,
  parseParticipantAttempt,
  saveAnswerRequestSchema,
  submitAttemptRequestSchema,
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
import {
  isAllowed,
  type ParticipantActivityItemKind,
} from "../../http/authorization.js";

export function publicAttemptProjection(
  state: AttemptState,
  answers: readonly AnswerState[] = [],
): ApiSuccessEnvelope<unknown>["data"] {
  return parseParticipantAttempt({
    attemptId: state.attemptId,
    activityId: state.activityId,
    status: state.status,
    version: state.version,
    answers: answers.map((answer) => ({
      itemId: answer.itemId,
      response: answer.response,
      savedAt: answer.savedAt,
    })),
  });
}

export async function handleStart(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = createAttemptRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const scopeId = await dependencies.resolveActivityScope(
    parsed.data.activityId,
    { participantId: principal.principalId },
  );
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "START_OWN_ATTEMPT", {
      ownerId: principal.principalId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  const state = await dependencies.startAttempt({
    participantId: principal.principalId,
    activityId: parsed.data.activityId,
    scopeId,
    idempotencyKey: parsed.data.idempotencyKey,
    correlationId: requestId,
  });
  return {
    status: 201,
    body: apiSuccessResponse(publicAttemptProjection(state), requestId),
  };
}

export async function handleSaveAnswer(
  request: ApiHttpRequest,
  attemptId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = saveAnswerRequestSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.attemptId !== attemptId) {
    return validationResponse(requestId);
  }

  const current = await dependencies.resolveAttempt(attemptId, {
    participantId: principal.principalId,
  });
  if (current === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(current.activityId, {
    participantId: principal.principalId,
  });
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "SAVE_OWN_ANSWER", {
      ownerId: current.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  const answerableItemKinds: readonly ParticipantActivityItemKind[] = [
    "QUESTAO",
    "CASO",
    "REFLEXAO",
  ];
  const itemBelongsToActivity =
    dependencies.hasParticipantActivityItem === undefined
      ? (
          await dependencies.getParticipantActivity(
            principal.principalId,
            current.activityId,
          )
        ).items.some(
          (item) =>
            item.itemId === parsed.data.itemId &&
            (item.kind === "QUESTAO" ||
              item.kind === "CASO" ||
              item.kind === "REFLEXAO"),
        )
      : await dependencies.hasParticipantActivityItem(
          principal.principalId,
          current.activityId,
          parsed.data.itemId,
          answerableItemKinds,
        );
  if (!itemBelongsToActivity) {
    return errorResponse("not_found", requestId);
  }

  const result = await dependencies.saveAnswer({
    attemptId,
    participantId: principal.principalId,
    activityId: parsed.data.activityId,
    scopeId,
    itemId: parsed.data.itemId,
    response: parsed.data.response,
    idempotencyKey: parsed.data.idempotencyKey,
    correlationId: requestId,
    savedAt: new Date().toISOString(),
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      publicAttemptProjection(result.attempt, [result.answer]),
      requestId,
    ),
  };
}

export async function handleSubmit(
  request: ApiHttpRequest,
  attemptId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = submitAttemptRequestSchema.safeParse({
    ...(request.body !== null &&
    typeof request.body === "object" &&
    !Array.isArray(request.body)
      ? request.body
      : {}),
    attemptId,
  });
  if (!parsed.success) return validationResponse(requestId);

  const current = await dependencies.resolveAttempt(parsed.data.attemptId, {
    participantId: principal.principalId,
  });
  if (current === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(current.activityId, {
    participantId: principal.principalId,
  });
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "SUBMIT_OWN_ATTEMPT", {
      ownerId: current.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  const state = await dependencies.submitAttempt({
    attemptId: parsed.data.attemptId,
    participantId: principal.principalId,
    scopeId,
    idempotencyKey: parsed.data.idempotencyKey,
    correlationId: requestId,
    submittedAt: new Date().toISOString(),
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicAttemptProjection(state), requestId),
  };
}

export async function handleCorrection(
  request: ApiHttpRequest,
  attemptId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = correctOpenResponseRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const attempt = await dependencies.resolveAttempt(attemptId, {
    scopeId: parsed.data.scopeId,
  });
  if (attempt === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId, {
    scopeId: parsed.data.scopeId,
  });
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (scopeId !== parsed.data.scopeId)
    return errorResponse("forbidden", requestId);

  const baseCommand: CorrectOpenResponseCommand = {
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    scopeId,
    attemptId,
    idempotencyKey: parsed.data.idempotencyKey,
    correlationId: requestId,
    score: parsed.data.score,
    outcome: parsed.data.outcome,
    feedback: parsed.data.feedback,
    ruleVersion: parsed.data.ruleVersion,
  };
  const command: CorrectOpenResponseCommand =
    dependencies.approvedClinicalApproverId === undefined
      ? baseCommand
      : {
          ...baseCommand,
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        };
  const result = await dependencies.correctOpenResponse(command);

  const projection = correctionResultProjectionSchema.parse({
    attemptStatus: result.attempt.status,
    attemptVersion: result.attempt.version,
    resultVersion: result.result.version,
    score: result.result.score,
    outcome: result.result.outcome,
    feedback: result.result.feedback,
  });
  return {
    status: 200,
    body: apiSuccessResponse(projection, requestId),
  };
}
