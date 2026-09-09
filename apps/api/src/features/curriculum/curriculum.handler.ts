import {
  deriveJourneyNextAction,
  deriveJourneyNextActionTarget,
  deriveParticipantDashboard,
  type AssignmentTransitionCommand,
  type CurriculumRuntimeState,
  type EvaluateCurriculumModuleCommand,
  type MaterializedCurriculumAssignments,
  type ParticipantDashboardState,
  type ParticipantLearningJourneyState,
  type StaffDashboardState,
} from "@cvg/application";
import type {
  AssessmentWorkflowState,
  LearningAssignmentState,
} from "@cvg/domain";
import {
  adaptiveCurriculumAssignmentProjectionSchema,
  apiSuccessResponse,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowScopedTransitionRequestSchema,
  assignCurriculumFromDiagnosticRequestSchema,
  curriculumRuntimeEvaluationRequestSchema,
  learningAssignmentCreateRequestSchema,
  learningAssignmentScopedTransitionRequestSchema,
  parseDashboardProjection,
  parseParticipantCurriculumRuntime,
  parseParticipantLearningJourney,
  participantAssessmentWorkflowProjectionSchema,
  participantLearningAssignmentProjectionSchema,
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
import { isUuid } from "../../http/validation.js";

export function publicCurriculumRuntimeProjection(
  state: CurriculumRuntimeState,
): ApiSuccessEnvelope<unknown>["data"] {
  const evaluation = state.evaluation;
  return parseParticipantCurriculumRuntime({
    moduleId: evaluation.moduleId,
    version: state.version,
    status: evaluation.status,
    nextAction: evaluation.nextAction,
    ...(evaluation.scorePercent === undefined
      ? {}
      : { scorePercent: evaluation.scorePercent }),
    remediationCount: evaluation.remediationObjectiveIds.length,
    retentionReviews: evaluation.retentionReviews,
    practicalCompetenceClaim: evaluation.practicalCompetenceClaim,
  });
}

export function publicLearningAssignmentProjection(
  state: LearningAssignmentState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantLearningAssignmentProjectionSchema.parse({
    assignmentId: state.assignmentId,
    moduleId: state.moduleId,
    availableAt: state.availableAt,
    status: state.status,
    version: state.version,
    ...(state.blockReason === undefined
      ? {}
      : { blockReason: state.blockReason }),
  });
}

export function publicAdaptiveAssignmentProjection(
  state: MaterializedCurriculumAssignments,
): ApiSuccessEnvelope<unknown>["data"] {
  return adaptiveCurriculumAssignmentProjectionSchema.parse({
    assignments: state.assignments.map(({ state: assignment }) => ({
      availableAt: assignment.availableAt,
      status: assignment.status,
      version: assignment.version,
      ...(assignment.blockReason === undefined
        ? {}
        : { blockReason: assignment.blockReason }),
    })),
  });
}

export function publicAssessmentWorkflowProjection(
  state: AssessmentWorkflowState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAssessmentWorkflowProjectionSchema.parse({
    resultId: state.resultId,
    status: state.status,
    version: state.version,
  });
}

export function publicLearningJourneyProjection(
  state: ParticipantLearningJourneyState,
): ApiSuccessEnvelope<unknown>["data"] {
  // Re-derive the action and target at the public boundary. The participant
  // projection must not trust an internal repository/wiring to supply a stale
  // or provenance-free remediation target.
  const nextAction = deriveJourneyNextAction(state);
  const nextActionTarget = deriveJourneyNextActionTarget(state);
  return parseParticipantLearningJourney({
    assignments: state.assignments.map(({ state: assignment }) =>
      publicLearningAssignmentProjection(assignment),
    ),
    activities: state.activities.map((activity) => ({
      activityId: activity.activityId,
      slug: activity.slug,
      title: activity.title,
      status: activity.status,
      ...(activity.attemptId === undefined
        ? {}
        : { attemptId: activity.attemptId }),
      ...(activity.attemptStatus === undefined
        ? {}
        : { attemptStatus: activity.attemptStatus }),
      ...(activity.attemptVersion === undefined
        ? {}
        : { attemptVersion: activity.attemptVersion }),
      nextAction: activity.nextAction,
    })),
    results: state.results.map(({ state: result }) =>
      publicAssessmentWorkflowProjection(result),
    ),
    runtimes: state.runtimes.map((runtime) =>
      publicCurriculumRuntimeProjection(runtime),
    ),
    nextAction,
    ...(nextActionTarget === undefined
      ? {}
      : { nextActionTarget: { ...nextActionTarget } }),
  });
}

export function publicParticipantDashboardProjection(
  state: ParticipantDashboardState,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseDashboardProjection({
    kind: state.kind,
    nextAction: state.nextAction,
    path: state.path.map((item) => ({ ...item })),
    profile: state.profile.map((item) => ({ ...item })),
    ...(state.diagnosticProfile === undefined
      ? {}
      : {
          diagnosticProfile: state.diagnosticProfile.map((item) => ({
            ...item,
            recommendedModuleIds: [...item.recommendedModuleIds],
          })),
        }),
    progress: { ...state.progress },
  });
}

export function publicStaffDashboardProjection(
  state: StaffDashboardState,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseDashboardProjection({
    kind: "staff",
    scopes: [...state.scopes],
    generatedAt: state.generatedAt,
    metrics: {
      ...state.metrics,
      content: { ...state.metrics.content },
    },
    participants: state.participants.map((participant) => ({
      ...participant,
      ...(participant.lastSeenAt === undefined
        ? {}
        : { lastSeenAt: participant.lastSeenAt }),
      progress: { ...participant.progress },
      ...(participant.diagnosticProfile === undefined
        ? {}
        : {
            diagnosticProfile: participant.diagnosticProfile.map((item) => ({
              ...item,
              recommendedModuleIds: [...item.recommendedModuleIds],
            })),
          }),
    })),
  });
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

export async function handleDashboard(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const staffRole =
    principal.roles.includes("ADMIN") ||
    principal.roles.includes("MODERATOR") ||
    principal.roles.includes("CLINICAL_APPROVER");
  if (staffRole) {
    const staffScopeId = principal.scopes[0];
    if (
      dependencies.getStaffDashboard === undefined ||
      staffScopeId === undefined ||
      !isAllowed(principal, "VIEW_STAFF_DASHBOARD", {
        scopeId: staffScopeId,
      })
    ) {
      return errorResponse("forbidden", requestId);
    }
    const state = await dependencies.getStaffDashboard(
      principal.principalId,
      principal.scopes,
    );
    return {
      status: 200,
      body: apiSuccessResponse(
        publicStaffDashboardProjection(state),
        requestId,
      ),
    };
  }

  if (
    dependencies.getParticipantLearningJourney === undefined ||
    !principal.roles.includes("PARTICIPANT")
  ) {
    return errorResponse("forbidden", requestId);
  }
  const canViewJourney = principal.scopes.some((scopeId) =>
    isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId,
    }),
  );
  if (!canViewJourney) return errorResponse("forbidden", requestId);
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
      publicParticipantDashboardProjection(deriveParticipantDashboard(journey)),
      requestId,
    ),
  };
}

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
  if (
    dependencies.isParticipantInScope === undefined ||
    !(await dependencies.isParticipantInScope(
      parsed.data.participantId,
      parsed.data.scopeId,
    ))
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

export async function handleAssignCurriculumFromDiagnostic(
  request: ApiHttpRequest,
  diagnosticResultId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.assignCurriculumFromDiagnostic === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (!isUuid(diagnosticResultId)) return validationResponse(requestId);
  const parsed = assignCurriculumFromDiagnosticRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MANAGE_LEARNING_ASSIGNMENTS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.assignCurriculumFromDiagnostic({
    diagnosticResultId,
    scopeId: parsed.data.scopeId,
  });
  if (state.scopeId !== parsed.data.scopeId) {
    return errorResponse("forbidden", requestId);
  }
  return {
    status: 200,
    body: apiSuccessResponse(
      publicAdaptiveAssignmentProjection(state),
      requestId,
    ),
  };
}

export async function handleCreateLearningAssignment(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.createLearningAssignment === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = learningAssignmentCreateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MANAGE_LEARNING_ASSIGNMENTS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.createLearningAssignment(parsed.data);
  return {
    status: 201,
    body: apiSuccessResponse(
      publicLearningAssignmentProjection(state),
      requestId,
    ),
  };
}

export async function handleTransitionLearningAssignment(
  request: ApiHttpRequest,
  assignmentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionLearningAssignment === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = learningAssignmentScopedTransitionRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success || parsed.data.assignmentId !== assignmentId) {
    return validationResponse(requestId);
  }
  if (
    !isAllowed(principal, "MANAGE_LEARNING_ASSIGNMENTS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const event = {
    type: parsed.data.event,
    ...(parsed.data.now === undefined ? {} : { now: parsed.data.now }),
    ...(parsed.data.reason === undefined ? {} : { reason: parsed.data.reason }),
    ...(parsed.data.to === undefined ? {} : { to: parsed.data.to }),
  } as AssignmentTransitionCommand["event"];
  const state = await dependencies.transitionLearningAssignment({
    assignmentId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      publicLearningAssignmentProjection(state),
      requestId,
    ),
  };
}

export async function handleCreateAssessmentWorkflow(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.createAssessmentWorkflow === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = assessmentWorkflowCreateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MANAGE_ASSESSMENT_WORKFLOWS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.createAssessmentWorkflow(parsed.data);
  return {
    status: 201,
    body: apiSuccessResponse(
      publicAssessmentWorkflowProjection(state),
      requestId,
    ),
  };
}

export async function handleTransitionAssessmentWorkflow(
  request: ApiHttpRequest,
  resultId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionAssessmentWorkflow === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = assessmentWorkflowScopedTransitionRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success || parsed.data.resultId !== resultId) {
    return validationResponse(requestId);
  }
  if (
    !isAllowed(principal, "MANAGE_ASSESSMENT_WORKFLOWS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.transitionAssessmentWorkflow({
    resultId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event: { type: parsed.data.event },
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      publicAssessmentWorkflowProjection(state),
      requestId,
    ),
  };
}
