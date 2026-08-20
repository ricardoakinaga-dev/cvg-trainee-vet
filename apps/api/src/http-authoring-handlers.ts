import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiHttpResponse,
  ApiPrincipal,
} from "./http.js";
import {
  type AdvanceContentCommand,
  type ClinicalReviewQueueQuery,
  type CorrectOpenResponseCommand,
  type EvaluateCurriculumModuleCommand,
  type PublishAuthoringCommand,
  type ReviewAuthoringCommand,
} from "@cvg/application";
import {
  apiSuccessResponse,
  authoringPublicationRequestSchema,
  authoringReviewRequestSchema,
  clinicalReviewQueueQuerySchema,
  contentTransitionRequestSchema,
  correctOpenResponseRequestSchema,
  curriculumRuntimeEvaluationRequestSchema,
} from "@cvg/contracts";
import {
  clinicalReviewQueueProjection,
  internalAuthoringProjection,
  publicCorrectionProjection,
  publicCurriculumRuntimeProjection,
} from "./http-projections.js";
import {
  errorResponse,
  isAllowed,
  readIdempotencyKey,
  validationResponse,
} from "./http-support.js";

export async function handleCurriculumRuntimeEvaluation(
  request: ApiHttpRequest,
  moduleId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.evaluateCurriculumRuntime === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = curriculumRuntimeEvaluationRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MODERATE_CONTENT", {
      ownerId: principal.principalId,
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const command = {
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    moduleId,
    answers: parsed.data.answers.map((answer) => ({
      itemId: answer.itemId,
      ...(answer.selectedChoiceIds === undefined
        ? {}
        : { selectedChoiceIds: [...answer.selectedChoiceIds] }),
      ...(answer.text === undefined ? {} : { text: answer.text }),
      ...(answer.structuredValues === undefined
        ? {}
        : { structuredValues: { ...answer.structuredValues } }),
    })),
    completedAt: parsed.data.completedAt,
    ...(parsed.data.mode === undefined ? {} : { mode: parsed.data.mode }),
  } satisfies EvaluateCurriculumModuleCommand;
  const state = await dependencies.evaluateCurriculumRuntime(command);
  return {
    status: 200,
    body: apiSuccessResponse(
      publicCurriculumRuntimeProjection(state),
      requestId,
    ),
  };
}

export async function handleContentTransition(
  request: ApiHttpRequest,
  contentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = contentTransitionRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const command = {
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    contentId,
    version: parsed.data.version,
    scopeId: parsed.data.scopeId,
    event: parsed.data.event,
    correlationId: requestId,
    ...(parsed.data.event === "RETIRAR" &&
    parsed.data.withdrawalReasonCode !== undefined
      ? { withdrawalReasonCode: parsed.data.withdrawalReasonCode }
      : {}),
    ...(parsed.data.event === "RETIRAR"
      ? { approvedClinicalApproverId: principal.principalId }
      : {}),
  } satisfies AdvanceContentCommand;
  const result = await dependencies.advanceContent(command);

  return {
    status: 200,
    body: apiSuccessResponse(
      {
        contentId: result.contentId,
        version: result.version,
        status: result.status,
        ...(result.withdrawalReasonCode === undefined
          ? {}
          : { withdrawalReasonCode: result.withdrawalReasonCode }),
        ...(result.withdrawnAt === undefined
          ? {}
          : { withdrawnAt: result.withdrawnAt }),
        ...(result.affectedParticipantCount === undefined
          ? {}
          : { affectedParticipantCount: result.affectedParticipantCount }),
      },
      requestId,
    ),
  };
}

export async function handleInternalAuthoringRecord(
  contentId: string,
  versionText: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getInternalAuthoringRecord === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const version = Number(versionText);
  if (!Number.isSafeInteger(version) || version < 1) {
    return validationResponse(requestId, "version");
  }
  const record = await dependencies.getInternalAuthoringRecord(
    contentId,
    version,
  );
  if (record === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "VIEW_INTERNAL_SOURCE", { scopeId: record.scopeId })
  ) {
    return errorResponse("forbidden", requestId);
  }
  return {
    status: 200,
    body: apiSuccessResponse(internalAuthoringProjection(record), requestId),
  };
}

export async function handleClinicalReviewQueue(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getClinicalReviewQueue === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = clinicalReviewQueueQuerySchema.safeParse(request.query ?? {});
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "VIEW_CLINICAL_REVIEW_QUEUE", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const query: ClinicalReviewQueueQuery = {
    page: parsed.data.page,
    perPage: parsed.data.per_page,
    status: parsed.data.status,
  };
  const page = await dependencies.getClinicalReviewQueue(
    parsed.data.scopeId,
    query,
  );
  return {
    status: 200,
    body: apiSuccessResponse(clinicalReviewQueueProjection(page), requestId),
  };
}

export async function handleAuthoringPublication(
  request: ApiHttpRequest,
  contentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.publishAuthoringContent === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const idempotencyKey = readIdempotencyKey(request);
  if (idempotencyKey === null) {
    return validationResponse(requestId, "Idempotency-Key");
  }
  const parsed = authoringPublicationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "PUBLISH_CONTENT", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const command: PublishAuthoringCommand = {
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    contentId,
    version: parsed.data.version,
    scopeId: parsed.data.scopeId,
    correlationId: requestId,
    idempotencyKey,
  };
  const result = await dependencies.publishAuthoringContent(command);
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAuthoringProjection(result.record),
      requestId,
    ),
  };
}

export async function handleAuthoringReview(
  request: ApiHttpRequest,
  contentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.reviewAuthoringContent === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const idempotencyKey = readIdempotencyKey(request);
  if (idempotencyKey === null) {
    return validationResponse(requestId, "Idempotency-Key");
  }
  const parsed = authoringReviewRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const capability =
    parsed.data.decision === "APROVAR_CLINICAMENTE"
      ? ("APPROVE_CLINICAL_CONTENT" as const)
      : ("MODERATE_CONTENT" as const);
  if (!isAllowed(principal, capability, { scopeId: parsed.data.scopeId })) {
    return errorResponse("forbidden", requestId);
  }
  const command: ReviewAuthoringCommand = {
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    contentId,
    version: parsed.data.version,
    scopeId: parsed.data.scopeId,
    decision: parsed.data.decision,
    rationale: parsed.data.rationale,
    correlationId: requestId,
    idempotencyKey,
  };
  const result = await dependencies.reviewAuthoringContent(command);
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAuthoringProjection(result.record),
      requestId,
    ),
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
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId);
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
  const command: CorrectOpenResponseCommand = {
    ...baseCommand,
    approvedClinicalApproverId: principal.principalId,
  };
  const result = await dependencies.correctOpenResponse(command);

  return {
    status: 200,
    body: apiSuccessResponse(publicCorrectionProjection(result), requestId),
  };
}
