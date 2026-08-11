import { randomUUID, timingSafeEqual } from "node:crypto";

import type {
  AnswerState,
  AppealState,
  AssessmentWorkflowState,
  AttemptState,
  FeedbackTicketState,
  LearningAssignmentState,
} from "@cvg/domain";
import {
  ApplicationError,
  clearSessionCookie,
  type CorrectionResult,
  type CorrectOpenResponseCommand,
  type AcceptInvitationCommand,
  type AcceptedInvitation,
  type CreatedSession,
  type CreateInvitationCommand,
  type CreatedInvitation,
  type LoggedInPassword,
  type LoginWithPasswordCommand,
  type SetAccountPasswordCommand,
  type AdvanceContentCommand,
  type AuthoringRecord,
  type ClinicalReviewQueuePage,
  type ClinicalReviewQueueQuery,
  type PublishAuthoringCommand,
  type ReviewAuthoringCommand,
  canAccess,
  type AccountStatus,
  buildParticipantDashboard,
  type Capability,
  type ContentRecord,
  type CurriculumRuntimeState,
  type EvaluateCurriculumModuleCommand,
  type AppealCreateCommand,
  type AppealTransitionCommand,
  type AssignmentCreateCommand,
  type AssignmentTransitionCommand,
  type WorkflowCreateCommand,
  type WorkflowTransitionCommand,
  type TicketCreateCommand,
  type TicketTransitionCommand,
  type ParticipantActivityState,
  type ParticipantLearningJourneyState,
  type ParticipantProgressState,
  type IdentityProviderOperation,
  type IdentityProviderPort,
  type SaveAnswerCommand,
  type SaveAnswerResult,
  type Role,
  type StartAttemptCommand,
  type SubmitAttemptCommand,
  type TransactionSecurityContext,
} from "@cvg/application";
import {
  apiErrorResponse,
  accountActionRequestSchema,
  accountOperationProjectionSchema,
  accountVerificationRequestSchema,
  apiSuccessResponse,
  parseAccountSecurity,
  parseOperationsDashboard,
  parseParticipantDashboard,
  authoringPublicationRequestSchema,
  authoringReviewRequestSchema,
  createAttemptRequestSchema,
  contentTransitionRequestSchema,
  parseParticipantActivity,
  curriculumRuntimeEvaluationRequestSchema,
  parseParticipantCurriculumRuntime,
  parseParticipantAttempt,
  parseParticipantProgress,
  parseParticipantLearningJourney,
  parseInternalAuthoringRecordProjection,
  clinicalReviewQueueQuerySchema,
  parseClinicalReviewQueuePage,
  correctOpenResponseRequestSchema,
  correctionResultProjectionSchema,
  acceptInvitationRequestSchema,
  activeSessionProjectionSchema,
  rotateSessionRequestSchema,
  createInvitationRequestSchema,
  loginRequestSchema,
  passwordUpdateRequestSchema,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowScopedTransitionRequestSchema,
  appealCreateRequestSchema,
  appealScopedTransitionRequestSchema,
  feedbackTicketParticipantCreateRequestSchema,
  feedbackTicketScopedTransitionRequestSchema,
  learningAssignmentCreateRequestSchema,
  learningAssignmentScopedTransitionRequestSchema,
  participantAppealProjectionSchema,
  participantAssessmentWorkflowProjectionSchema,
  participantFeedbackTicketProjectionSchema,
  participantLearningAssignmentProjectionSchema,
  saveAnswerRequestSchema,
  submitAttemptRequestSchema,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";
import type { Observability } from "@cvg/observability";
import type { DependencyStatus } from "@cvg/integrations";

type OperationalEvidenceStatus = "VERIFIED" | "NOT_CONFIGURED" | "NOT_EXECUTED";
type OperationalEvidence = Readonly<{
  readonly collector: OperationalEvidenceStatus;
  readonly retention: OperationalEvidenceStatus;
  readonly traces: OperationalEvidenceStatus;
  readonly load: OperationalEvidenceStatus;
  readonly failover: OperationalEvidenceStatus;
  readonly replicas: OperationalEvidenceStatus;
}>;

type AccountSecurityStatus = Readonly<{
  readonly provider: "EXTERNAL_IDENTITY_PROVIDER" | "NOT_CONFIGURED";
  readonly recovery: "AVAILABLE" | "UNAVAILABLE";
  readonly mfa: "ENABLED" | "NOT_ENABLED" | "UNAVAILABLE";
  readonly session: "ACTIVE" | "NO_SESSION";
}>;

export type ApiHttpRequest = Readonly<{
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly query?: Readonly<Record<string, string | undefined>>;
  readonly headers?: Readonly<Record<string, string | undefined>>;
}>;

export type ApiPrincipal = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
}>;

export interface ApiHttpDependencies {
  readonly requestIdFactory: () => string;
  readonly observability?: Observability;
  readonly metricsScrapeToken?: string;
  readonly operationalEvidence?: OperationalEvidence;
  readonly approvedClinicalApproverId?: string;
  readonly createInvitation: (
    command: CreateInvitationCommand,
  ) => Promise<CreatedInvitation>;
  readonly acceptInvitation: (
    command: AcceptInvitationCommand,
  ) => Promise<AcceptedInvitation>;
  readonly loginWithPassword?: (
    command: LoginWithPasswordCommand,
  ) => Promise<LoggedInPassword>;
  readonly setAccountPassword?: (
    command: SetAccountPasswordCommand,
  ) => Promise<void>;
  readonly revokeSession?: (cookieHeader: string | undefined) => Promise<void>;
  readonly rotateSession?: (
    cookieHeader: string | undefined,
    expiresInSeconds: number,
  ) => Promise<CreatedSession | null>;
  readonly createLearningAssignment?: (
    command: AssignmentCreateCommand,
  ) => Promise<LearningAssignmentState>;
  readonly transitionLearningAssignment?: (
    command: AssignmentTransitionCommand,
  ) => Promise<LearningAssignmentState>;
  readonly createAssessmentWorkflow?: (
    command: WorkflowCreateCommand,
  ) => Promise<AssessmentWorkflowState>;
  readonly transitionAssessmentWorkflow?: (
    command: WorkflowTransitionCommand,
  ) => Promise<AssessmentWorkflowState>;
  readonly createFeedbackTicket?: (
    command: TicketCreateCommand,
  ) => Promise<FeedbackTicketState>;
  readonly transitionFeedbackTicket?: (
    command: TicketTransitionCommand,
  ) => Promise<FeedbackTicketState>;
  readonly createAppeal?: (
    command: AppealCreateCommand,
  ) => Promise<AppealState>;
  readonly transitionAppeal?: (
    command: AppealTransitionCommand,
  ) => Promise<AppealState>;
  readonly authenticate: (
    request: ApiHttpRequest,
  ) => Promise<ApiPrincipal | null>;
  readonly resolveActivityScope: (activityId: string) => Promise<string | null>;
  readonly resolveAttempt: (
    attemptId: string,
    context?: TransactionSecurityContext,
  ) => Promise<AttemptState | null>;
  readonly getParticipantActivity: (
    participantId: string,
    activityId: string,
  ) => Promise<ParticipantActivityState>;
  readonly advanceContent: (
    command: AdvanceContentCommand,
  ) => Promise<ContentRecord>;
  readonly getInternalAuthoringRecord?: (
    contentId: string,
    version: number,
  ) => Promise<AuthoringRecord | null>;
  readonly getClinicalReviewQueue?: (
    scopeId: string,
    query: ClinicalReviewQueueQuery,
  ) => Promise<ClinicalReviewQueuePage>;
  readonly publishAuthoringContent?: (
    command: PublishAuthoringCommand,
  ) => Promise<Readonly<{ record: AuthoringRecord }>>;
  readonly reviewAuthoringContent?: (
    command: ReviewAuthoringCommand,
  ) => Promise<Readonly<{ record: AuthoringRecord }>>;
  readonly getAccountSecurity?: (
    principalId: string,
  ) => Promise<AccountSecurityStatus>;
  readonly identityProvider?: IdentityProviderPort;
  readonly getParticipantProgress: (
    participantId: string,
    activityId: string,
  ) => Promise<ParticipantProgressState>;
  readonly getParticipantLearningJourney?: (
    participantId: string,
    scopeIds: readonly string[],
  ) => Promise<ParticipantLearningJourneyState>;
  readonly getParticipantCurriculumRuntime?: (
    participantId: string,
    moduleId: string,
  ) => Promise<CurriculumRuntimeState>;
  readonly evaluateCurriculumRuntime?: (
    command: EvaluateCurriculumModuleCommand,
  ) => Promise<CurriculumRuntimeState>;
  readonly getAttemptFeedback: (
    participantId: string,
    attemptId: string,
  ) => Promise<CorrectionResult | null>;
  readonly correctOpenResponse: (
    command: CorrectOpenResponseCommand,
  ) => Promise<CorrectionResult>;
  readonly startAttempt: (
    command: StartAttemptCommand,
  ) => Promise<AttemptState>;
  readonly saveAnswer: (
    command: SaveAnswerCommand,
  ) => Promise<SaveAnswerResult>;
  readonly submitAttempt: (
    command: SubmitAttemptCommand,
  ) => Promise<AttemptState>;
  readonly healthcheck: () => Promise<void>;
  readonly dependencyStatus?: () => Promise<DependencyStatus>;
}

export type ApiHttpResponse = Readonly<{
  readonly status: number;
  readonly body: ApiSuccessEnvelope<unknown> | ApiErrorEnvelope;
  readonly headers?: Readonly<Record<string, string>>;
  readonly rawBody?: string;
  readonly rawContentType?: string;
}>;

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

function validationResponse(
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

function errorResponse(
  code: ApiErrorCode,
  requestId: string,
  status = statusByErrorCode[code],
): ApiHttpResponse {
  return { status, body: apiErrorResponse(code, requestId) };
}

function hasMetricsScrapeToken(
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

function publicAttemptProjection(
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

function publicActivityProjection(
  activity: ParticipantActivityState,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseParticipantActivity({
    activityId: activity.activityId,
    slug: activity.slug,
    title: activity.title,
    items: activity.items.map((item) => ({ ...item })),
  });
}

function publicProgressProjection(
  progress: ParticipantProgressState,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseParticipantProgress({
    activityId: progress.activityId,
    assignmentStatus: progress.assignmentStatus,
    ...(progress.attemptStatus === undefined
      ? {}
      : { attemptStatus: progress.attemptStatus }),
    ...(progress.attemptVersion === undefined
      ? {}
      : { attemptVersion: progress.attemptVersion }),
    nextAction: progress.nextAction,
  });
}

function publicCurriculumRuntimeProjection(
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

function publicCorrectionProjection(
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

function publicLearningAssignmentProjection(
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

function publicAssessmentWorkflowProjection(
  state: AssessmentWorkflowState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAssessmentWorkflowProjectionSchema.parse({
    resultId: state.resultId,
    status: state.status,
    version: state.version,
  });
}

function publicFeedbackTicketProjection(
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

function publicAppealProjection(
  state: AppealState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAppealProjectionSchema.parse({
    appealId: state.appealId,
    attemptId: state.attemptId,
    itemId: state.itemId,
    status: state.status,
    version: state.version,
    ...(state.decision === undefined ? {} : { decision: state.decision }),
  });
}

function publicLearningJourneyProjection(
  state: ParticipantLearningJourneyState,
): ApiSuccessEnvelope<unknown>["data"] {
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
    nextAction: state.nextAction ?? "CONSULTAR_PROXIMO_PASSO",
  });
}

function isAllowed(
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
    capability === "VIEW_CLINICAL_REVIEW_QUEUE"
      ? {
          approvedClinicalApproverId:
            approvedClinicalApproverId ?? principal.principalId,
        }
      : {}),
  });
}

function internalAuthoringProjection(
  record: AuthoringRecord,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseInternalAuthoringRecordProjection({
    contentId: record.contentId,
    version: record.version,
    scopeId: record.scopeId,
    moduleId: record.moduleId,
    sessionId: record.sessionId,
    objectiveId: record.objectiveId,
    authorId: record.authorId,
    contentStatus: record.contentStatus,
    item: {
      title: record.title,
      prompt: record.prompt,
      responseMode: record.responseMode,
      ...(record.choices === undefined ? {} : { choices: record.choices }),
      ...(record.correctChoiceIds === undefined
        ? {}
        : { correctChoiceIds: record.correctChoiceIds }),
      ...(record.rubric === undefined ? {} : { rubric: record.rubric }),
      feedback: record.feedback,
      critical: record.critical,
      remediationTargetObjectiveId: record.remediationTargetObjectiveId,
      sourceRefs: record.sourceRefs,
      participant: record.participant,
    },
    preflight: record.preflight,
  });
}

function clinicalReviewQueueProjection(
  page: ClinicalReviewQueuePage,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseClinicalReviewQueuePage({
    items: page.items.map((item) => ({
      contentId: item.contentId,
      version: item.version,
      scopeId: item.scopeId,
      moduleId: item.moduleId,
      sessionId: item.sessionId,
      objectiveId: item.objectiveId,
      authorId: item.authorId,
      contentStatus: item.contentStatus,
      reviewStatus: item.reviewStatus,
      technicalChecksPassed: item.technicalChecksPassed,
      latestReview:
        item.latestReview === null
          ? null
          : {
              decision: item.latestReview.decision,
              reviewedAt: item.latestReview.reviewedAt,
            },
    })),
    page: page.page,
    perPage: page.perPage,
    total: page.total,
  });
}

async function handleStart(
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

async function handleSaveAnswer(
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

async function handleActivity(
  activityId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
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

async function handleProgress(
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

async function handleCurriculumRuntime(
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

async function handleLearningPath(
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

async function handleParticipantDashboard(
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

function dashboardMetricTotals(
  observability: Observability | undefined,
): Readonly<{
  readonly requestsTotal: number;
  readonly errorsTotal: number;
  readonly p95DurationMs: number | null;
}> {
  const counters = observability?.metrics.snapshot().counters ?? [];
  const requestCounters = counters.filter(
    (counter) => counter.name === "api.requests.total",
  );
  return Object.freeze({
    requestsTotal: requestCounters.reduce(
      (total, counter) => total + counter.value,
      0,
    ),
    errorsTotal: requestCounters
      .filter((counter) => counter.labels.outcome === "server_error")
      .reduce((total, counter) => total + counter.value, 0),
    p95DurationMs:
      observability?.metrics.quantile("api.request.duration_ms", 0.95) ?? null,
  });
}

async function handleOperationsDashboard(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (
    !canAccess({
      principalId: principal.principalId,
      accountStatus: principal.accountStatus,
      roles: principal.roles,
      capability: "VIEW_INTERNAL_AUDIT",
      scopes: principal.scopes,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.dependencyStatus === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const dependency = await dependencies.dependencyStatus();
  const totals = dashboardMetricTotals(dependencies.observability);
  const evidence: OperationalEvidence = dependencies.operationalEvidence ?? {
    collector: "NOT_CONFIGURED",
    retention: "NOT_CONFIGURED",
    traces: "NOT_CONFIGURED",
    load: "NOT_EXECUTED",
    failover: "NOT_EXECUTED",
    replicas: "NOT_EXECUTED",
  };
  return {
    status: 200,
    body: apiSuccessResponse(
      parseOperationsDashboard({
        dependencyStatus: dependency.status,
        dependencies: dependency.dependencies,
        metrics: {
          ...totals,
        },
        evidence,
      }),
      requestId,
    ),
  };
}

async function handleAccountSecurity(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const security =
    dependencies.getAccountSecurity === undefined
      ? {
          provider: "NOT_CONFIGURED" as const,
          recovery: "UNAVAILABLE" as const,
          mfa: "UNAVAILABLE" as const,
          session: "ACTIVE" as const,
        }
      : await dependencies.getAccountSecurity(principal.principalId);
  return {
    status: 200,
    body: apiSuccessResponse(parseAccountSecurity(security), requestId),
  };
}

async function handleAccountOperation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
  operation: (
    provider: IdentityProviderPort,
    principalId: string,
  ) => Promise<IdentityProviderOperation>,
): Promise<ApiHttpResponse> {
  const parsed = accountActionRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.identityProvider === undefined) {
    return errorResponse("state_conflict", requestId);
  }
  const result = await operation(
    dependencies.identityProvider,
    principal.principalId,
  );
  return {
    status: 202,
    body: apiSuccessResponse(
      accountOperationProjectionSchema.parse(result),
      requestId,
    ),
  };
}

async function handleAccountVerificationOperation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
  operation: (
    provider: IdentityProviderPort,
    principalId: string,
    operationId: string,
    verificationCode: string,
  ) => Promise<IdentityProviderOperation>,
): Promise<ApiHttpResponse> {
  const parsed = accountVerificationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.identityProvider === undefined) {
    return errorResponse("state_conflict", requestId);
  }
  const result = await operation(
    dependencies.identityProvider,
    principal.principalId,
    parsed.data.operationId,
    parsed.data.verificationCode,
  );
  return {
    status: 202,
    body: apiSuccessResponse(
      accountOperationProjectionSchema.parse(result),
      requestId,
    ),
  };
}

async function handleCurriculumRuntimeEvaluation(
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

async function handleContentTransition(
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
  } satisfies AdvanceContentCommand;
  const result = await dependencies.advanceContent(command);

  return {
    status: 200,
    body: apiSuccessResponse(
      {
        contentId: result.contentId,
        version: result.version,
        status: result.status,
      },
      requestId,
    ),
  };
}

async function handleInternalAuthoringRecord(
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
    !isAllowed(
      principal,
      "VIEW_INTERNAL_SOURCE",
      { scopeId: record.scopeId },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  return {
    status: 200,
    body: apiSuccessResponse(internalAuthoringProjection(record), requestId),
  };
}

async function handleClinicalReviewQueue(
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
    !isAllowed(
      principal,
      "VIEW_CLINICAL_REVIEW_QUEUE",
      { scopeId: parsed.data.scopeId },
      dependencies.approvedClinicalApproverId,
    )
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

async function handleAuthoringPublication(
  request: ApiHttpRequest,
  contentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.publishAuthoringContent === undefined) {
    return errorResponse("internal_error", requestId);
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

async function handleAuthoringReview(
  request: ApiHttpRequest,
  contentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.reviewAuthoringContent === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = authoringReviewRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const capability =
    parsed.data.decision === "APROVAR_CLINICAMENTE"
      ? ("APPROVE_CLINICAL_CONTENT" as const)
      : ("MODERATE_CONTENT" as const);
  if (
    !isAllowed(principal, capability, {
      scopeId: parsed.data.scopeId,
    })
  ) {
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

async function handleCorrection(
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

async function handleCreateInvitation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = createInvitationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const created = await dependencies.createInvitation({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    professionalEmail: parsed.data.professionalEmail,
    invitedRoles: parsed.data.invitedRoles,
    invitedScopes: parsed.data.invitedScopes,
    expiresInSeconds: parsed.data.expiresInSeconds,
    correlationId: requestId,
  });

  return {
    status: 201,
    body: apiSuccessResponse(
      {
        invitationId: created.invitationId,
        professionalEmail: created.professionalEmail,
        token: created.token,
        expiresAt: created.expiresAt.toISOString(),
      },
      requestId,
    ),
  };
}

async function handleAcceptInvitation(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = acceptInvitationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const accepted = await dependencies.acceptInvitation({
    token: parsed.data.token,
    sessionExpiresInSeconds: parsed.data.sessionExpiresInSeconds,
    correlationId: requestId,
  });

  return {
    status: 200,
    headers: { "set-cookie": accepted.session.cookie },
    body: apiSuccessResponse({ status: "active" }, requestId),
  };
}

async function handlePasswordLogin(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = loginRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.loginWithPassword === undefined) {
    return errorResponse("internal_error", requestId);
  }

  const loggedIn = await dependencies.loginWithPassword({
    login: parsed.data.login,
    password: parsed.data.password,
    sessionExpiresInSeconds: parsed.data.sessionExpiresInSeconds,
    correlationId: requestId,
  });
  return {
    status: 200,
    headers: { "set-cookie": loggedIn.session.cookie },
    body: apiSuccessResponse(
      activeSessionProjectionSchema.parse({ status: "active" }),
      requestId,
    ),
  };
}

async function handleSessionStatus(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const principal = await dependencies.authenticate(request);
  if (principal === null) return errorResponse("unauthenticated", requestId);
  return {
    status: 200,
    body: apiSuccessResponse(
      activeSessionProjectionSchema.parse({ status: "active" }),
      requestId,
    ),
  };
}

async function handlePasswordUpdate(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = passwordUpdateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.setAccountPassword === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (principal.accountStatus !== "ACTIVE") {
    return errorResponse("forbidden", requestId);
  }
  await dependencies.setAccountPassword({
    principalId: principal.principalId,
    password: parsed.data.password,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse({ status: "updated" }, requestId),
  };
}

async function handleRevokeSession(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.revokeSession !== undefined) {
    await dependencies.revokeSession(request.headers?.cookie);
  }
  return {
    status: 200,
    headers: { "set-cookie": clearSessionCookie() },
    body: apiSuccessResponse({ status: "revoked" }, requestId),
  };
}

async function handleRotateSession(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = rotateSessionRequestSchema.safeParse(request.body ?? {});
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.rotateSession === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const rotated = await dependencies.rotateSession(
    request.headers?.cookie,
    parsed.data.sessionExpiresInSeconds,
  );
  if (rotated === null) return errorResponse("unauthenticated", requestId);
  return {
    status: 200,
    headers: { "set-cookie": rotated.cookie },
    body: apiSuccessResponse({ status: "rotated" }, requestId),
  };
}

async function handleFeedback(
  attemptId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const attempt = await dependencies.resolveAttempt(attemptId, {
    participantId: principal.principalId,
  });
  if (attempt === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId);
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

async function handleCreateLearningAssignment(
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

async function handleTransitionLearningAssignment(
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

async function handleCreateAssessmentWorkflow(
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

async function handleTransitionAssessmentWorkflow(
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

async function handleCreateFeedbackTicket(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.createFeedbackTicket === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = feedbackTicketParticipantCreateRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "CREATE_FEEDBACK_TICKET", {
      ownerId: principal.principalId,
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.createFeedbackTicket({
    ticketId: randomUUID(),
    participantId: principal.principalId,
    scopeId: parsed.data.scopeId,
    type: parsed.data.type,
    description: parsed.data.description,
    createdAt: new Date().toISOString(),
  });
  return {
    status: 201,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

async function handleTransitionFeedbackTicket(
  request: ApiHttpRequest,
  ticketId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionFeedbackTicket === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = feedbackTicketScopedTransitionRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success || parsed.data.ticketId !== ticketId) {
    return validationResponse(requestId);
  }
  if (
    !isAllowed(principal, "TRANSITION_FEEDBACK_TICKET", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.transitionFeedbackTicket({
    ticketId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event: { type: parsed.data.event },
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

async function handleCreateAppeal(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.createAppeal === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = appealCreateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const attempt = await dependencies.resolveAttempt(parsed.data.attemptId, {
    participantId: principal.principalId,
  });
  if (attempt === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId);
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "CREATE_APPEAL", {
      ownerId: attempt.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
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

async function handleTransitionAppeal(
  request: ApiHttpRequest,
  appealId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionAppeal === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = appealScopedTransitionRequestSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.appealId !== appealId) {
    return validationResponse(requestId);
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
    ...(parsed.data.reviewerId === undefined
      ? {}
      : { reviewerId: parsed.data.reviewerId }),
    ...(parsed.data.decision === undefined
      ? {}
      : { decision: parsed.data.decision }),
  } as AppealTransitionCommand["event"];
  const state = await dependencies.transitionAppeal({
    appealId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event,
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicAppealProjection(state), requestId),
  };
}

async function handleSubmit(
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
  const scopeId = await dependencies.resolveActivityScope(current.activityId);
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
    idempotencyKey: parsed.data.idempotencyKey,
    correlationId: requestId,
    submittedAt: new Date().toISOString(),
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicAttemptProjection(state), requestId),
  };
}

export async function handleApiRequest(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const requestId = dependencies.requestIdFactory();

  try {
    if (request.method === "GET" && request.path === "/health/live") {
      return {
        status: 200,
        body: apiSuccessResponse({ status: "live" }, requestId),
      };
    }

    if (request.method === "GET" && request.path === "/health/ready") {
      try {
        await dependencies.healthcheck();
      } catch {
        return errorResponse("internal_error", requestId, 503);
      }
      return {
        status: 200,
        body: apiSuccessResponse({ status: "ready" }, requestId),
      };
    }

    if (request.method === "GET" && request.path === "/health/dependencies") {
      if (dependencies.dependencyStatus === undefined) {
        return errorResponse("internal_error", requestId, 503);
      }
      try {
        const status = await dependencies.dependencyStatus();
        return {
          status: status.status === "NOT_READY" ? 503 : 200,
          body: apiSuccessResponse(status, requestId),
        };
      } catch {
        return errorResponse("internal_error", requestId, 503);
      }
    }

    if (
      request.method === "GET" &&
      (request.path === "/internal/metrics" ||
        request.path === "/internal/metrics/prometheus")
    ) {
      const authorizedByScrapeToken = hasMetricsScrapeToken(
        request,
        dependencies.metricsScrapeToken,
      );
      const principal = authorizedByScrapeToken
        ? null
        : await dependencies.authenticate(request);
      if (!authorizedByScrapeToken && principal === null) {
        return errorResponse("unauthenticated", requestId);
      }
      const authorized =
        authorizedByScrapeToken ||
        (principal !== null &&
          canAccess({
            principalId: principal.principalId,
            accountStatus: principal.accountStatus,
            roles: principal.roles,
            capability: "VIEW_INTERNAL_AUDIT",
            scopes: principal.scopes,
          }));
      if (!authorized) return errorResponse("forbidden", requestId);
      const prometheus = dependencies.observability?.metrics.prometheus;
      if (prometheus === undefined) {
        return errorResponse("internal_error", requestId);
      }
      if (request.path === "/internal/metrics/prometheus") {
        return {
          status: 200,
          body: apiSuccessResponse({ format: "prometheus" }, requestId),
          rawBody: prometheus(),
          rawContentType: "text/plain; version=0.0.4; charset=utf-8",
        };
      }
      return {
        status: 200,
        body: apiSuccessResponse(
          { format: "prometheus", text: prometheus() },
          requestId,
        ),
      };
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/dashboard"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleOperationsDashboard(
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/account/security"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAccountSecurity(requestId, principal, dependencies);
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/account/recovery/start"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAccountOperation(
        request,
        requestId,
        principal,
        dependencies,
        (provider, principalId) => provider.beginRecovery(principalId),
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/account/mfa/enrollment"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAccountOperation(
        request,
        requestId,
        principal,
        dependencies,
        (provider, principalId) => provider.beginMfaEnrollment(principalId),
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/account/mfa/enrollment/verify"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAccountVerificationOperation(
        request,
        requestId,
        principal,
        dependencies,
        (provider, principalId, operationId, verificationCode) =>
          provider.verifyMfaEnrollment(
            principalId,
            operationId,
            verificationCode,
          ),
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/account/recovery/complete"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAccountVerificationOperation(
        request,
        requestId,
        principal,
        dependencies,
        (provider, principalId, operationId, verificationCode) =>
          provider.completeRecovery(principalId, operationId, verificationCode),
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/invitations/accept"
    ) {
      return await handleAcceptInvitation(request, requestId, dependencies);
    }

    if (request.method === "POST" && request.path === "/api/v1/auth/login") {
      return await handlePasswordLogin(request, requestId, dependencies);
    }

    if (request.method === "GET" && request.path === "/api/v1/session") {
      return await handleSessionStatus(request, requestId, dependencies);
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/account/password"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handlePasswordUpdate(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/session/revoke"
    ) {
      return await handleRevokeSession(request, requestId, dependencies);
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/session/rotate"
    ) {
      return await handleRotateSession(request, requestId, dependencies);
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/invitations"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateInvitation(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/learning-assignments"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateLearningAssignment(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const learningAssignmentTransitionMatch = request.path.match(
      /^\/api\/v1\/internal\/learning-assignments\/([^/]+)\/transition$/u,
    );
    if (request.method === "POST" && learningAssignmentTransitionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleTransitionLearningAssignment(
        request,
        learningAssignmentTransitionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/assessment-workflows"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateAssessmentWorkflow(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const assessmentWorkflowTransitionMatch = request.path.match(
      /^\/api\/v1\/internal\/assessment-workflows\/([^/]+)\/transition$/u,
    );
    if (request.method === "POST" && assessmentWorkflowTransitionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleTransitionAssessmentWorkflow(
        request,
        assessmentWorkflowTransitionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (request.method === "POST" && request.path === "/api/v1/feedback") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateFeedbackTicket(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const feedbackTransitionMatch = request.path.match(
      /^\/api\/v1\/internal\/feedback\/([^/]+)$/u,
    );
    if (request.method === "PATCH" && feedbackTransitionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleTransitionFeedbackTicket(
        request,
        feedbackTransitionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (request.method === "POST" && request.path === "/api/v1/appeals") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateAppeal(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const appealTransitionMatch = request.path.match(
      /^\/api\/v1\/internal\/appeals\/([^/]+)\/transition$/u,
    );
    if (request.method === "POST" && appealTransitionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleTransitionAppeal(
        request,
        appealTransitionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (request.method === "POST" && request.path === "/api/v1/attempts") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleStart(request, requestId, principal, dependencies);
    }

    if (request.method === "GET" && request.path === "/api/v1/learning-path") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleLearningPath(requestId, principal, dependencies);
    }

    if (request.method === "GET" && request.path === "/api/v1/dashboard") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleParticipantDashboard(
        requestId,
        principal,
        dependencies,
      );
    }

    const activityMatch = request.path.match(
      /^\/api\/v1\/activities\/([^/]+)$/,
    );
    if (request.method === "GET" && activityMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleActivity(
        activityMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const curriculumRuntimeMatch = request.path.match(
      /^\/api\/v1\/curriculum\/modules\/([^/]+)\/runtime$/u,
    );
    if (request.method === "GET" && curriculumRuntimeMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCurriculumRuntime(
        curriculumRuntimeMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const curriculumRuntimeEvaluationMatch = request.path.match(
      /^\/api\/v1\/internal\/curriculum\/modules\/([^/]+)\/evaluate$/u,
    );
    if (request.method === "POST" && curriculumRuntimeEvaluationMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCurriculumRuntimeEvaluation(
        request,
        curriculumRuntimeEvaluationMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const contentMatch = request.path.match(
      /^\/api\/v1\/internal\/content\/([^/]+)\/transition$/,
    );
    if (request.method === "POST" && contentMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleContentTransition(
        request,
        contentMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const authoringRecordMatch = request.path.match(
      /^\/api\/v1\/internal\/content\/([^/]+)\/versions\/(\d+)\/authoring$/u,
    );
    if (
      request.method === "GET" &&
      authoringRecordMatch?.[1] !== undefined &&
      authoringRecordMatch[2] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleInternalAuthoringRecord(
        authoringRecordMatch[1],
        authoringRecordMatch[2],
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/authoring/review-queue"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleClinicalReviewQueue(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const authoringReviewMatch = request.path.match(
      /^\/api\/v1\/internal\/content\/([^/]+)\/review$/u,
    );
    if (request.method === "POST" && authoringReviewMatch?.[1] !== undefined) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAuthoringReview(
        request,
        authoringReviewMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const authoringPublicationMatch = request.path.match(
      /^\/api\/v1\/internal\/content\/([^/]+)\/publish$/u,
    );
    if (
      request.method === "POST" &&
      authoringPublicationMatch?.[1] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAuthoringPublication(
        request,
        authoringPublicationMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const correctionMatch = request.path.match(
      /^\/api\/v1\/internal\/attempts\/([^/]+)\/correct$/,
    );
    if (request.method === "POST" && correctionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCorrection(
        request,
        correctionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const feedbackMatch = request.path.match(
      /^\/api\/v1\/attempts\/([^/]+)\/feedback$/,
    );
    if (request.method === "GET" && feedbackMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleFeedback(
        feedbackMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const progressMatch = request.path.match(
      /^\/api\/v1\/activities\/([^/]+)\/progress$/,
    );
    if (request.method === "GET" && progressMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleProgress(
        progressMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const submitMatch = request.path.match(
      /^\/api\/v1\/attempts\/([^/]+)\/submit$/,
    );
    if (request.method === "POST" && submitMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleSubmit(
        request,
        submitMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const answerMatch = request.path.match(
      /^\/api\/v1\/attempts\/([^/]+)\/answers$/,
    );
    if (request.method === "POST" && answerMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleSaveAnswer(
        request,
        answerMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    return errorResponse("not_found", requestId);
  } catch (error) {
    if (error instanceof ApplicationError) {
      return errorResponse(error.code, requestId, error.status);
    }
    return errorResponse("internal_error", requestId);
  }
}
