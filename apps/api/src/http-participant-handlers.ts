import {
  type ApiHttpDependencies,
  type ApiHttpRequest,
  type ApiHttpResponse,
  type ApiPrincipal,
} from "./http.js";
import {
  digitalCaseAdvanceRequestSchema,
  digitalCaseScopeQuerySchema,
  parseParticipantDashboard,
  apiSuccessResponse,
} from "@cvg/contracts";
import {
  type AdvanceParticipantDigitalCaseCommand,
  buildParticipantDashboard,
  isParticipantJourneyActivityCurrent,
} from "@cvg/application";
import {
  isAllowed,
  resolveDigitalCaseScope,
  errorResponse,
  validationResponse,
} from "./http-support.js";
import {
  publicActivityProjection,
  publicAttemptProjection,
  publicCurriculumRuntimeProjection,
  publicDigitalCaseRuntimeProjection,
  publicLearningJourneyProjection,
  publicProgressProjection,
} from "./http-projections.js";
import {
  createAttemptRequestSchema,
  saveAnswerRequestSchema,
} from "@cvg/contracts";

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

  if (dependencies.getParticipantLearningJourney !== undefined) {
    const journey = await dependencies.getParticipantLearningJourney(
      principal.principalId,
      principal.scopes,
    );
    if (
      journey.participantId !== principal.principalId ||
      !isParticipantJourneyActivityCurrent(journey, parsed.data.activityId)
    ) {
      return errorResponse("forbidden", requestId);
    }
  }

  const state = await dependencies.startAttempt({
    participantId: principal.principalId,
    activityId: parsed.data.activityId,
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
  const scopeId = await dependencies.resolveActivityScope(current.activityId);
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "SAVE_OWN_ANSWER", {
      ownerId: current.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  const result = await dependencies.saveAnswer({
    attemptId,
    participantId: principal.principalId,
    activityId: parsed.data.activityId,
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

export async function handleActivity(
  activityId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getParticipantLearningJourney !== undefined) {
    const journey = await dependencies.getParticipantLearningJourney(
      principal.principalId,
      principal.scopes,
    );
    if (
      journey.participantId !== principal.principalId ||
      !isParticipantJourneyActivityCurrent(journey, activityId)
    ) {
      return errorResponse("forbidden", requestId);
    }
  }

  const activity = await dependencies.getParticipantActivity(
    principal.principalId,
    activityId,
  );
  if (
    !isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId: activity.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  return {
    status: 200,
    body: apiSuccessResponse(publicActivityProjection(activity), requestId),
  };
}

export async function handleProgress(
  activityId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const progress = await dependencies.getParticipantProgress(
    principal.principalId,
    activityId,
  );
  if (
    !isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId: progress.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  return {
    status: 200,
    body: apiSuccessResponse(publicProgressProjection(progress), requestId),
  };
}

export async function handleCurriculumRuntime(
  moduleId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getParticipantCurriculumRuntime === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const state = await dependencies.getParticipantCurriculumRuntime(
    principal.principalId,
    moduleId,
  );
  if (
    !isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId: state.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  return {
    status: 200,
    body: apiSuccessResponse(
      publicCurriculumRuntimeProjection(state),
      requestId,
    ),
  };
}

export async function handleDigitalCaseRuntime(
  request: ApiHttpRequest,
  moduleId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getParticipantDigitalCase === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsedScope = digitalCaseScopeQuerySchema.safeParse({
    scopeId: request.query?.scopeId,
  });
  if (!parsedScope.success) return validationResponse(requestId, "scopeId");
  const scopeId = resolveDigitalCaseScope(principal, parsedScope.data.scopeId);
  if (scopeId === null) return validationResponse(requestId, "scopeId");
  const allowed = isAllowed(principal, "VIEW_OWN_ACTIVITY", {
    ownerId: principal.principalId,
    scopeId,
  });
  if (!allowed) return errorResponse("forbidden", requestId);
  const state = await dependencies.getParticipantDigitalCase({
    participantId: principal.principalId,
    scopeId,
    moduleId,
    now: new Date().toISOString(),
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      publicDigitalCaseRuntimeProjection(state),
      requestId,
    ),
  };
}

export async function handleDigitalCaseAdvance(
  request: ApiHttpRequest,
  moduleId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.advanceParticipantDigitalCase === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = digitalCaseAdvanceRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const scopeId = resolveDigitalCaseScope(principal, parsed.data.scopeId);
  if (scopeId === null) return validationResponse(requestId, "scopeId");
  const allowed = isAllowed(principal, "VIEW_OWN_ACTIVITY", {
    ownerId: principal.principalId,
    scopeId,
  });
  if (!allowed) return errorResponse("forbidden", requestId);
  const command = {
    participantId: principal.principalId,
    scopeId,
    moduleId,
    selectedChoiceIds: [...parsed.data.selectedChoiceIds],
    expectedVersion: parsed.data.expectedVersion,
    now: new Date().toISOString(),
  } satisfies AdvanceParticipantDigitalCaseCommand;
  const state = await dependencies.advanceParticipantDigitalCase(command);
  return {
    status: 200,
    body: apiSuccessResponse(
      publicDigitalCaseRuntimeProjection(state),
      requestId,
    ),
  };
}

export async function handleLearningPath(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getParticipantLearningJourney === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const canViewJourney = principal.scopes.some((scopeId) =>
    isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId,
    }),
  );
  if (!canViewJourney) return errorResponse("forbidden", requestId);

  const state = await dependencies.getParticipantLearningJourney(
    principal.principalId,
    principal.scopes,
  );
  if (state.participantId !== principal.principalId) {
    return errorResponse("forbidden", requestId);
  }
  return {
    status: 200,
    body: apiSuccessResponse(publicLearningJourneyProjection(state), requestId),
  };
}

export async function handleParticipantDashboard(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getParticipantLearningJourney === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const canViewDashboard = principal.scopes.some((scopeId) =>
    isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId,
    }),
  );
  if (!canViewDashboard) return errorResponse("forbidden", requestId);

  const journey = await dependencies.getParticipantLearningJourney(
    principal.principalId,
    principal.scopes,
  );
  if (journey.participantId !== principal.principalId) {
    return errorResponse("forbidden", requestId);
  }
  return {
    status: 200,
    body: apiSuccessResponse(
      parseParticipantDashboard(buildParticipantDashboard(journey)),
      requestId,
    ),
  };
}
