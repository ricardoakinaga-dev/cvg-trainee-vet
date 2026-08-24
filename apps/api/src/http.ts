import { randomUUID } from "node:crypto";

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
  createAuditEntry,
  type CorrectionResult,
  type CorrectOpenResponseCommand,
  type AcceptInvitationCommand,
  type AcceptedInvitation,
  type CreatedSession,
  type CreateInvitationCommand,
  type CreatedInvitation,
  type AdvanceContentCommand,
  type AuthoringRecord,
  type ReviewAuthoringCommand,
  canAccess,
  type AccountStatus,
  type AccountStatusChangeCommand,
  type AccountStatusChangeResult,
  type AccountRecoveryAcceptCommand,
  type AccountRecoveryAccepted,
  type AccountRecoveryIssueCommand,
  type AccountRecoveryIssueResult,
  type Capability,
  type ContentRecord,
  type CurriculumRuntimeState,
  type AuthoringReview,
  type EvaluateCurriculumModuleCommand,
  type AppealCreateCommand,
  type AppealReviewTransitionCommand,
  type GetParticipantAppealsCommand,
  type AssignmentCreateCommand,
  type AssignmentTransitionCommand,
  type AssignCurriculumFromDiagnosticCommand,
  type MaterializedCurriculumAssignments,
  type WorkflowCreateCommand,
  type WorkflowTransitionCommand,
  type TicketCreateCommand,
  type TicketTransitionCommand,
  type ParticipantFeedbackReadCommand,
  type ParticipantActivityState,
  type ParticipantLearningJourneyState,
  type ParticipantProgressState,
  deriveJourneyNextAction,
  deriveJourneyNextActionTarget,
  deriveParticipantDashboard,
  deriveParticipantDiagnosticProfile,
  type DiagnosticResultState,
  type EvaluateDiagnosticDraftCommand,
  type ParticipantDashboardState,
  type StaffDashboardState,
  type ContinuingEducationReportState,
  type ReflectionManagementState,
  type ContentReviewQueueState,
  type GetContentReviewQueueCommand,
  type AppealReviewQueueState,
  type GetAppealReviewQueueCommand,
  type AppealReviewHistoryState,
  type GetAppealReviewHistoryCommand,
  type FeedbackTriageQueueState,
  type GetFeedbackTriageQueueCommand,
  type SaveAnswerCommand,
  type SaveAnswerResult,
  type Role,
  type ResendAccountInvitationCommand,
  type ResendAccountInvitationResult,
  type StartAttemptCommand,
  type SubmitAttemptCommand,
  type TransactionSecurityContext,
  type AuditPort,
  type AuditOutcome,
  type AuditTrailState,
  type GetAuditTrailCommand,
} from "@cvg/application";
import {
  apiErrorResponse,
  apiSuccessResponse,
  authoringReviewRequestSchema,
  createAttemptRequestSchema,
  contentTransitionRequestSchema,
  parseParticipantActivity,
  curriculumRuntimeEvaluationRequestSchema,
  diagnosticEvaluationRequestSchema,
  parseParticipantCurriculumRuntime,
  parseParticipantAttempt,
  parseParticipantProgress,
  parseParticipantLearningJourney,
  parseDashboardProjection,
  continuingEducationReportProjectionSchema,
  continuingEducationReportQuerySchema,
  reflectionManagementProjectionSchema,
  reflectionManagementQuerySchema,
  contentReviewQueueProjectionSchema,
  contentReviewQueueQuerySchema,
  appealReviewQueueProjectionSchema,
  appealReviewQueueQuerySchema,
  appealReviewHistoryPathSchema,
  appealReviewHistoryProjectionSchema,
  appealReviewHistoryQuerySchema,
  feedbackTriageQueueProjectionSchema,
  feedbackTriageQueueQuerySchema,
  auditTrailProjectionSchema,
  auditTrailQuerySchema,
  internalAuthoringRecordQuerySchema,
  internalSessionScopesProjectionSchema,
  parseDiagnosticResultProjection,
  parseInternalAuthoringRecordProjection,
  correctOpenResponseRequestSchema,
  correctionResultProjectionSchema,
  acceptInvitationRequestSchema,
  accountStatusChangeProjectionSchema,
  accountStatusChangeRequestSchema,
  accountRecoveryAcceptProjectionSchema,
  accountRecoveryAcceptRequestSchema,
  accountRecoveryIssueProjectionSchema,
  accountRecoveryIssueRequestSchema,
  adaptiveCurriculumAssignmentProjectionSchema,
  assignCurriculumFromDiagnosticRequestSchema,
  resendAccountInvitationRequestSchema,
  resentAccountInvitationProjectionSchema,
  rotateSessionRequestSchema,
  createInvitationRequestSchema,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowScopedTransitionRequestSchema,
  appealCreateRequestSchema,
  appealQuerySchema,
  appealReviewTransitionRequestSchema,
  feedbackTicketParticipantCreateRequestSchema,
  feedbackTicketInternalTransitionRequestSchema,
  participantFeedbackTicketsProjectionSchema,
  learningAssignmentCreateRequestSchema,
  learningAssignmentScopedTransitionRequestSchema,
  participantAppealProjectionSchema,
  participantAppealsProjectionSchema,
  participantAssessmentWorkflowProjectionSchema,
  participantFeedbackTicketProjectionSchema,
  participantLearningAssignmentProjectionSchema,
  saveAnswerRequestSchema,
  submitAttemptRequestSchema,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";
import {
  deriveOperationalSnapshot,
  type Observability,
} from "@cvg/observability";
import type { DependencyStatus } from "@cvg/integrations";

export type ApiHttpRequest = Readonly<{
  readonly method: string;
  readonly path: string;
  readonly route?: string;
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
  readonly audit?: AuditPort;
  readonly approvedClinicalApproverId?: string;
  readonly createInvitation: (
    command: CreateInvitationCommand,
  ) => Promise<CreatedInvitation>;
  readonly changeAccountStatus?: (
    command: AccountStatusChangeCommand,
  ) => Promise<AccountStatusChangeResult>;
  readonly resendAccountInvitation?: (
    command: ResendAccountInvitationCommand,
  ) => Promise<ResendAccountInvitationResult>;
  readonly issueAccountRecovery?: (
    command: AccountRecoveryIssueCommand,
  ) => Promise<AccountRecoveryIssueResult>;
  readonly acceptInvitation: (
    command: AcceptInvitationCommand,
  ) => Promise<AcceptedInvitation>;
  readonly acceptAccountRecovery?: (
    command: AccountRecoveryAcceptCommand,
  ) => Promise<AccountRecoveryAccepted>;
  readonly revokeSession?: (cookieHeader: string | undefined) => Promise<void>;
  readonly rotateSession?: (
    cookieHeader: string | undefined,
    expiresInSeconds: number,
  ) => Promise<CreatedSession | null>;
  readonly createLearningAssignment?: (
    command: AssignmentCreateCommand,
  ) => Promise<LearningAssignmentState>;
  readonly assignCurriculumFromDiagnostic?: (
    command: AssignCurriculumFromDiagnosticCommand,
  ) => Promise<MaterializedCurriculumAssignments>;
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
  readonly getParticipantFeedback?: (
    command: ParticipantFeedbackReadCommand,
  ) => Promise<readonly FeedbackTicketState[]>;
  readonly transitionFeedbackTicket?: (
    command: TicketTransitionCommand,
  ) => Promise<FeedbackTicketState>;
  readonly resolveFeedbackTicketParticipant?: (
    ticketId: string,
    scopeId: string,
  ) => Promise<string | null>;
  readonly createAppeal?: (
    command: AppealCreateCommand,
  ) => Promise<AppealState>;
  readonly getParticipantAppeals?: (
    command: GetParticipantAppealsCommand,
  ) => Promise<readonly AppealState[]>;
  readonly transitionAppealReview?: (
    command: AppealReviewTransitionCommand,
  ) => Promise<AppealState>;
  readonly authenticate: (
    request: ApiHttpRequest,
  ) => Promise<ApiPrincipal | null>;
  readonly resolveActivityScope: (
    activityId: string,
    context: TransactionSecurityContext,
  ) => Promise<string | null>;
  readonly hasParticipantActivityItem?: (
    participantId: string,
    activityId: string,
    itemId: string,
  ) => Promise<boolean>;
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
    scopeId: string,
  ) => Promise<AuthoringRecord | null>;
  readonly reviewAuthoringContent?: (
    command: ReviewAuthoringCommand,
  ) => Promise<Readonly<{ record: AuthoringRecord; review: AuthoringReview }>>;
  readonly getParticipantProgress: (
    participantId: string,
    activityId: string,
  ) => Promise<ParticipantProgressState>;
  readonly getParticipantLearningJourney?: (
    participantId: string,
    scopeIds: readonly string[],
  ) => Promise<ParticipantLearningJourneyState>;
  readonly getStaffDashboard?: (
    principalId: string,
    scopeIds: readonly string[],
  ) => Promise<StaffDashboardState>;
  readonly getContinuingEducationReport?: (
    principalId: string,
    query: Readonly<{
      readonly scopeId: string;
      readonly moduleId?: string | undefined;
      readonly accountStatus?: AccountStatus | undefined;
    }>,
  ) => Promise<ContinuingEducationReportState>;
  readonly getReflectionManagementReport?: (
    principalId: string,
    query: Readonly<{ readonly scopeId: string }>,
  ) => Promise<ReflectionManagementState>;
  readonly getContentReviewQueue?: (
    command: GetContentReviewQueueCommand,
  ) => Promise<ContentReviewQueueState>;
  readonly getAppealReviewQueue?: (
    command: GetAppealReviewQueueCommand,
  ) => Promise<AppealReviewQueueState>;
  readonly getFeedbackTriageQueue?: (
    command: GetFeedbackTriageQueueCommand,
  ) => Promise<FeedbackTriageQueueState>;
  readonly getAppealReviewHistory?: (
    command: GetAppealReviewHistoryCommand,
  ) => Promise<AppealReviewHistoryState | null>;
  readonly getAuditTrail?: (
    command: GetAuditTrailCommand,
  ) => Promise<AuditTrailState>;
  readonly getParticipantCurriculumRuntime?: (
    participantId: string,
    moduleId: string,
  ) => Promise<CurriculumRuntimeState>;
  readonly evaluateCurriculumRuntime?: (
    command: EvaluateCurriculumModuleCommand,
  ) => Promise<CurriculumRuntimeState>;
  readonly evaluateDiagnosticDraft?: (
    command: EvaluateDiagnosticDraftCommand,
  ) => Promise<DiagnosticResultState>;
  readonly isParticipantInScope?: (
    participantId: string,
    scopeId: string,
  ) => Promise<boolean>;
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function redactDependencyStatus(value: DependencyStatus): DependencyStatus {
  const candidate: unknown = value;
  if (!isPlainRecord(candidate) || !isPlainRecord(candidate.dependencies)) {
    throw new Error("dependency status shape is invalid");
  }
  const status = candidate.status;
  const postgres = candidate.dependencies.postgres;
  const qdrant = candidate.dependencies.qdrant;
  const ai = candidate.dependencies.ai;
  if (status !== "READY" && status !== "DEGRADED" && status !== "NOT_READY") {
    throw new Error("dependency status value is invalid");
  }
  if (postgres !== "UP" && postgres !== "DOWN") {
    throw new Error("postgres dependency status is invalid");
  }
  if (qdrant !== "UP" && qdrant !== "DOWN" && qdrant !== "DISABLED") {
    throw new Error("qdrant dependency status is invalid");
  }
  if (ai !== "ENABLED" && ai !== "DISABLED") {
    throw new Error("ai dependency status is invalid");
  }
  return Object.freeze({
    status,
    dependencies: Object.freeze({ postgres, qdrant, ai }),
  });
}

function unexpectedOperationalInput(
  request: ApiHttpRequest,
): "body" | "query" | undefined {
  if (request.body !== undefined) return "body";
  if (request.query !== undefined && Object.keys(request.query).length > 0) {
    return "query";
  }
  return undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

function errorResponse(
  code: ApiErrorCode,
  requestId: string,
  status = statusByErrorCode[code],
): ApiHttpResponse {
  return { status, body: apiErrorResponse(code, requestId) };
}

type ApiRejectionAuditRequest = Readonly<{
  readonly method: string;
  readonly path: string;
  readonly route?: string;
  readonly scopeId?: string;
  readonly headers?: Readonly<Record<string, string | undefined>>;
}>;

function rejectionAuditOutcome(status: number): AuditOutcome {
  return status === 401 || status === 403 || status === 404
    ? "DENIED"
    : "FAILURE";
}

export async function recordApiRejectionAudit(
  dependencies: ApiHttpDependencies,
  request: ApiRejectionAuditRequest,
  response: ApiHttpResponse,
  principal?: ApiPrincipal,
): Promise<void> {
  if (dependencies.audit === undefined || response.status < 400) return;

  const requestId = response.body.meta.request_id;
  if (!isUuid(requestId)) return;
  const suppliedCorrelationId = request.headers?.["x-correlation-id"];
  const correlationId =
    suppliedCorrelationId !== undefined && isUuid(suppliedCorrelationId)
      ? suppliedCorrelationId
      : requestId;
  const errorCode = response.body.success
    ? "internal_error"
    : response.body.error.code;

  try {
    const requestedScopeId = request.scopeId;
    const scopeId =
      principal === undefined
        ? undefined
        : (principal.scopes.find(
            (candidate) => candidate === requestedScopeId,
          ) ?? principal.scopes[0]);
    if (principal !== undefined && scopeId === undefined) return;
    const auditEntry = createAuditEntry({
      auditId: randomUUID(),
      actorKind: principal === undefined ? "ANONYMOUS" : "AUTHENTICATED",
      ...(principal === undefined
        ? {}
        : { principalId: principal.principalId }),
      ...(scopeId === undefined ? {} : { scopeId }),
      action: "HTTP_REQUEST_REJECTED",
      resourceType: "http_route",
      resourceId: request.route ?? "unmatched",
      outcome: rejectionAuditOutcome(response.status),
      reasonCode: `api_${errorCode}`,
      requestId,
      correlationId,
      occurredAt: new Date().toISOString(),
    });
    await dependencies.audit.append(auditEntry);
  } catch {
    // A rejection audit must never turn a safe public error into an internal error.
  }
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
    ...(activity.reflection === undefined
      ? {}
      : {
          reflection: {
            ...activity.reflection,
            answers: activity.reflection.answers.map((answer) => ({
              ...answer,
            })),
          },
        }),
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

function publicAdaptiveAssignmentProjection(
  state: MaterializedCurriculumAssignments,
): ApiSuccessEnvelope<unknown>["data"] {
  return adaptiveCurriculumAssignmentProjectionSchema.parse({
    diagnosticResultId: state.diagnosticResultId,
    assignments: state.assignments.map(({ state: assignment }) =>
      publicLearningAssignmentProjection(assignment),
    ),
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

function publicFeedbackTicketsProjection(
  states: readonly FeedbackTicketState[],
): ApiSuccessEnvelope<unknown>["data"] {
  return participantFeedbackTicketsProjectionSchema.parse({
    tickets: states.map((state) => publicFeedbackTicketProjection(state)),
  });
}

function publicAppealProjection(
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

function publicAppealsProjection(
  states: readonly AppealState[],
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAppealsProjectionSchema.parse({
    appeals: states.map((state) => publicAppealProjection(state)),
  });
}

function publicLearningJourneyProjection(
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

function publicParticipantDashboardProjection(
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

function publicStaffDashboardProjection(
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

function publicContinuingEducationReportProjection(
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

function publicReflectionManagementProjection(
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

function publicContentReviewQueueProjection(
  state: ContentReviewQueueState,
): ApiSuccessEnvelope<unknown>["data"] {
  return contentReviewQueueProjectionSchema.parse({
    kind: state.kind,
    scopeId: state.scopeId,
    generatedAt: state.generatedAt,
    filters: { ...state.filters },
    items: state.items.map((item) => ({
      ...item,
      preflight: { ...item.preflight },
      ...(item.latestReview === undefined
        ? {}
        : { latestReview: { ...item.latestReview } }),
    })),
  });
}

function internalFeedbackTriageQueueProjection(
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

function internalAppealReviewQueueProjection(
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

function internalAppealReviewHistoryProjection(
  state: AppealReviewHistoryState,
): ApiSuccessEnvelope<unknown>["data"] {
  return appealReviewHistoryProjectionSchema.parse({
    appealId: state.appealId,
    events: state.events.map((event) => ({ ...event })),
  });
}

function internalAuditTrailProjection(
  state: AuditTrailState,
): ApiSuccessEnvelope<unknown>["data"] {
  return auditTrailProjectionSchema.parse({
    kind: state.kind,
    scopeId: state.scopeId,
    filters: { ...state.filters },
    items: state.items.map((item) => ({ ...item })),
  });
}

function isAllowed(
  principal: ApiPrincipal,
  capability: Capability,
  resource: Readonly<{ ownerId?: string; scopeId?: string }>,
  approvedClinicalApproverId?: string,
): boolean {
  const configuredClinicalIdentity = approvedClinicalApproverId;
  return canAccess({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    capability,
    resource,
    scopes: principal.scopes,
    ...(capability === "APPROVE_CLINICAL_CONTENT" ||
    capability === "PUBLISH_CONTENT" ||
    capability === "VIEW_INTERNAL_SOURCE" ||
    capability === "VIEW_AUDIT_TRAIL" ||
    capability === "VIEW_CONTENT_REVIEW_QUEUE" ||
    capability === "VIEW_FEEDBACK_QUEUE" ||
    capability === "TRANSITION_FEEDBACK_TICKET" ||
    capability === "REVIEW_APPEAL" ||
    capability === "VIEW_INTERNAL_SCOPES"
      ? {
          ...(configuredClinicalIdentity === undefined
            ? {}
            : { approvedClinicalApproverId: configuredClinicalIdentity }),
        }
      : {}),
  });
}

function internalAuthoringProjection(
  record: AuthoringRecord,
  availableActions: Readonly<{
    readonly requestAdjustments: boolean;
    readonly approveClinically: boolean;
  }>,
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
    ...(record.latestReview === undefined
      ? {}
      : { latestReview: record.latestReview }),
    availableActions,
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

async function handleDashboard(
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

async function handleContinuingEducationReport(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getContinuingEducationReport === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const rawQuery = request.query ?? {};
  const parsed = continuingEducationReportQuerySchema.safeParse({
    ...rawQuery,
    ...(rawQuery.page === undefined ? {} : { page: Number(rawQuery.page) }),
    ...(rawQuery.pageSize === undefined
      ? {}
      : { pageSize: Number(rawQuery.pageSize) }),
  });
  if (!parsed.success) return validationResponse(requestId);
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

async function handleAuditTrail(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getAuditTrail === undefined) {
    return errorResponse("internal_error", requestId);
  }
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

async function handleReflectionManagementReport(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getReflectionManagementReport === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = reflectionManagementQuerySchema.safeParse(request.query ?? {});
  if (!parsed.success) return validationResponse(requestId);
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

async function handleContentReviewQueue(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getContentReviewQueue === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const rawQuery = request.query ?? {};
  const rawLimit = rawQuery.limit;
  const parsed = contentReviewQueueQuerySchema.safeParse({
    scopeId: rawQuery.scopeId,
    ...(rawQuery.status === undefined ? {} : { status: rawQuery.status }),
    ...(rawLimit === undefined ? {} : { limit: Number(rawLimit) }),
  });
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(
      principal,
      "VIEW_CONTENT_REVIEW_QUEUE",
      {
        scopeId: parsed.data.scopeId,
      },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.getContentReviewQueue({
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
      publicContentReviewQueueProjection(state),
      requestId,
    ),
  };
}

async function handleAppealReviewQueue(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getAppealReviewQueue === undefined) {
    return errorResponse("internal_error", requestId);
  }
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

async function handleFeedbackTriageQueue(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getFeedbackTriageQueue === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const rawQuery = request.query ?? {};
  if (
    Object.keys(rawQuery).some(
      (key) => key !== "scopeId" && key !== "status" && key !== "limit",
    )
  ) {
    return validationResponse(requestId);
  }
  const rawLimit = rawQuery.limit;
  const parsed = feedbackTriageQueueQuerySchema.safeParse({
    scopeId: rawQuery.scopeId,
    ...(rawQuery.status === undefined ? {} : { status: rawQuery.status }),
    ...(rawLimit === undefined ? {} : { limit: Number(rawLimit) }),
  });
  if (!parsed.success) return validationResponse(requestId);
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
      limit: parsed.data.limit,
    },
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      internalFeedbackTriageQueueProjection(state),
      requestId,
    ),
  };
}

async function handleAppealReviewHistory(
  request: ApiHttpRequest,
  appealId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getAppealReviewHistory === undefined) {
    return errorResponse("internal_error", requestId);
  }
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

async function handleInternalSessionScopes(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (
    !isAllowed(
      principal,
      "VIEW_INTERNAL_SCOPES",
      {},
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const data = internalSessionScopesProjectionSchema.parse({
    kind: "internal_session_scopes",
    scopes: [...principal.scopes],
  });
  return {
    status: 200,
    body: apiSuccessResponse(data, requestId),
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

async function handleDiagnosticDraftEvaluation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.evaluateDiagnosticDraft === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = diagnosticEvaluationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MODERATE_CONTENT", {
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
    answers: parsed.data.answers.map((answer) => ({
      itemId: answer.itemId,
      selectedChoiceIds: [...answer.selectedChoiceIds],
    })),
    completedAt: parsed.data.completedAt,
  } satisfies EvaluateDiagnosticDraftCommand;
  const state = await dependencies.evaluateDiagnosticDraft(command);
  if (
    state.participantId !== command.participantId ||
    state.scopeId !== command.scopeId
  ) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.assignCurriculumFromDiagnostic !== undefined) {
    await dependencies.assignCurriculumFromDiagnostic({
      diagnosticResultId: state.resultId,
      scopeId: state.scopeId,
    });
  }
  const themes = deriveParticipantDiagnosticProfile([state]);
  const projection = parseDiagnosticResultProjection({
    resultId: state.resultId,
    diagnosticId: state.diagnosticId,
    version: state.version,
    completedAt: state.completedAt,
    themes: themes.map((theme) => ({
      ...theme,
      recommendedModuleIds: [...theme.recommendedModuleIds],
    })),
  });
  return {
    status: 200,
    body: apiSuccessResponse(projection, requestId),
  };
}

async function handleAssignCurriculumFromDiagnostic(
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

async function handleContentTransition(
  request: ApiHttpRequest,
  contentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = contentTransitionRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const baseCommand = {
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
  const command: AdvanceContentCommand =
    dependencies.approvedClinicalApproverId === undefined
      ? baseCommand
      : {
          ...baseCommand,
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        };
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
  request: ApiHttpRequest,
  contentId: string,
  versionText: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getInternalAuthoringRecord === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsedQuery = internalAuthoringRecordQuerySchema.safeParse(
    request.query ?? {},
  );
  if (!parsedQuery.success) return validationResponse(requestId, "scopeId");
  const version = Number(versionText);
  if (!Number.isSafeInteger(version) || version < 1) {
    return validationResponse(requestId, "version");
  }
  if (
    !isAllowed(
      principal,
      "VIEW_INTERNAL_SOURCE",
      { scopeId: parsedQuery.data.scopeId },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const record = await dependencies.getInternalAuthoringRecord(
    contentId,
    version,
    parsedQuery.data.scopeId,
  );
  if (record === null) return errorResponse("not_found", requestId);
  if (record.scopeId !== parsedQuery.data.scopeId) {
    return errorResponse("forbidden", requestId);
  }
  const isScopedStaff =
    principal.roles.includes("MODERATOR") ||
    principal.roles.includes("ADMIN") ||
    (principal.roles.includes("CLINICAL_APPROVER") &&
      dependencies.approvedClinicalApproverId === principal.principalId);
  if (!isScopedStaff && record.authorId !== principal.principalId) {
    return errorResponse("forbidden", requestId);
  }
  const availableActions = {
    requestAdjustments: isAllowed(
      principal,
      "MODERATE_CONTENT",
      { scopeId: record.scopeId },
      dependencies.approvedClinicalApproverId,
    ),
    approveClinically: isAllowed(
      principal,
      "APPROVE_CLINICAL_CONTENT",
      { scopeId: record.scopeId },
      dependencies.approvedClinicalApproverId,
    ),
  } as const;
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAuthoringProjection(record, availableActions),
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
  const capability: Capability =
    parsed.data.decision === "APROVAR_CLINICAMENTE"
      ? "APPROVE_CLINICAL_CONTENT"
      : "MODERATE_CONTENT";
  if (
    !isAllowed(
      principal,
      capability,
      { scopeId: parsed.data.scopeId },
      dependencies.approvedClinicalApproverId,
    )
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
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
  };
  const result = await dependencies.reviewAuthoringContent(command);
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAuthoringProjection(result.record, {
        requestAdjustments: isAllowed(
          principal,
          "MODERATE_CONTENT",
          { scopeId: result.record.scopeId },
          dependencies.approvedClinicalApproverId,
        ),
        approveClinically: isAllowed(
          principal,
          "APPROVE_CLINICAL_CONTENT",
          { scopeId: result.record.scopeId },
          dependencies.approvedClinicalApproverId,
        ),
      }),
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

async function handleAccountStatusChange(
  request: ApiHttpRequest,
  targetAccountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.changeAccountStatus === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (!isUuid(targetAccountId)) return validationResponse(requestId);
  const parsed = accountStatusChangeRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MANAGE_ACCOUNT_LIFECYCLE", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const result = await dependencies.changeAccountStatus({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId,
    scopeId: parsed.data.scopeId,
    expectedStatus: parsed.data.expectedStatus,
    status: parsed.data.status,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      accountStatusChangeProjectionSchema.parse({
        status: result.status,
        revokedSessions: result.revokedSessions,
      }),
      requestId,
    ),
  };
}

async function handleResendAccountInvitation(
  request: ApiHttpRequest,
  targetAccountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.resendAccountInvitation === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (!isUuid(targetAccountId)) return validationResponse(requestId);
  const parsed = resendAccountInvitationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MANAGE_ACCOUNT_LIFECYCLE", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const result = await dependencies.resendAccountInvitation({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId,
    scopeId: parsed.data.scopeId,
    expiresInSeconds: parsed.data.expiresInSeconds,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      resentAccountInvitationProjectionSchema.parse({
        professionalEmail: result.professionalEmail,
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
      }),
      requestId,
    ),
  };
}

async function handleIssueAccountRecovery(
  request: ApiHttpRequest,
  targetAccountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.issueAccountRecovery === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (!isUuid(targetAccountId)) return validationResponse(requestId);
  const parsed = accountRecoveryIssueRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MANAGE_ACCOUNT_LIFECYCLE", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const result = await dependencies.issueAccountRecovery({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId,
    scopeId: parsed.data.scopeId,
    expiresInSeconds: parsed.data.expiresInSeconds,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      accountRecoveryIssueProjectionSchema.parse({
        professionalEmail: result.professionalEmail,
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
        revokedSessions: result.revokedSessions,
      }),
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
  if (!parsed.success) return errorResponse("not_found", requestId);

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

async function handleAcceptAccountRecovery(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.acceptAccountRecovery === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = accountRecoveryAcceptRequestSchema.safeParse(request.body);
  if (!parsed.success) return errorResponse("not_found", requestId);
  const accepted = await dependencies.acceptAccountRecovery({
    token: parsed.data.token,
    sessionExpiresInSeconds: parsed.data.sessionExpiresInSeconds,
    correlationId: requestId,
  });
  return {
    status: 200,
    headers: { "set-cookie": accepted.session.cookie },
    body: apiSuccessResponse(
      accountRecoveryAcceptProjectionSchema.parse({ status: "active" }),
      requestId,
    ),
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
  });
  return {
    status: 201,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

async function handleGetParticipantFeedback(
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
  if (dependencies.resolveFeedbackTicketParticipant === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = feedbackTicketInternalTransitionRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success || parsed.data.ticketId !== ticketId) {
    return validationResponse(requestId);
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
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

async function handleGetParticipantAppeals(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getParticipantAppeals === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = appealQuerySchema.safeParse(request.query ?? {});
  if (!parsed.success) return validationResponse(requestId);

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

async function handleTransitionAppeal(
  request: ApiHttpRequest,
  appealId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionAppealReview === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = appealReviewTransitionRequestSchema.safeParse(request.body);
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

async function handleApiRequestCore(
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
        const status = redactDependencyStatus(
          await dependencies.dependencyStatus(),
        );
        return {
          status: status.status === "NOT_READY" ? 503 : 200,
          body: apiSuccessResponse(status, requestId),
        };
      } catch {
        return errorResponse("internal_error", requestId, 503);
      }
    }

    if (request.method === "GET" && request.path === "/internal/operations") {
      const principal = await dependencies.authenticate(request);
      if (principal === null) {
        return errorResponse("unauthenticated", requestId);
      }
      const authorized = canAccess({
        principalId: principal.principalId,
        accountStatus: principal.accountStatus,
        roles: principal.roles,
        capability: "VIEW_INTERNAL_AUDIT",
        scopes: principal.scopes,
      });
      if (!authorized) return errorResponse("forbidden", requestId);
      if (
        dependencies.dependencyStatus === undefined ||
        dependencies.observability === undefined
      ) {
        return errorResponse("internal_error", requestId, 503);
      }
      const unexpectedInput = unexpectedOperationalInput(request);
      if (unexpectedInput !== undefined) {
        return validationResponse(requestId, unexpectedInput);
      }
      try {
        const dependencyStatus = redactDependencyStatus(
          await dependencies.dependencyStatus(),
        );
        const snapshot = deriveOperationalSnapshot(
          dependencyStatus.status,
          dependencies.observability.metrics.snapshot(),
        );
        return {
          status: dependencyStatus.status === "NOT_READY" ? 503 : 200,
          body: apiSuccessResponse(
            {
              status: snapshot.status,
              dependencies: dependencyStatus.dependencies,
              slos: snapshot.slos,
              alerts: snapshot.alerts,
            },
            requestId,
          ),
        };
      } catch {
        return errorResponse("internal_error", requestId, 503);
      }
    }

    if (request.method === "GET" && request.path === "/internal/metrics") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      const authorized = canAccess({
        principalId: principal.principalId,
        accountStatus: principal.accountStatus,
        roles: principal.roles,
        capability: "VIEW_INTERNAL_AUDIT",
        scopes: principal.scopes,
      });
      if (!authorized) return errorResponse("forbidden", requestId);
      const prometheus = dependencies.observability?.metrics.prometheus;
      if (prometheus === undefined) {
        return errorResponse("internal_error", requestId);
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
      request.method === "POST" &&
      request.path === "/api/v1/invitations/accept"
    ) {
      return await handleAcceptInvitation(request, requestId, dependencies);
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/recovery/accept"
    ) {
      return await handleAcceptAccountRecovery(
        request,
        requestId,
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

    const accountStatusMatch = request.path.match(
      /^\/api\/v1\/internal\/accounts\/([^/]+)\/status$/u,
    );
    if (request.method === "PATCH" && accountStatusMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAccountStatusChange(
        request,
        accountStatusMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const accountInvitationMatch = request.path.match(
      /^\/api\/v1\/internal\/accounts\/([^/]+)\/invitation$/u,
    );
    if (request.method === "POST" && accountInvitationMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleResendAccountInvitation(
        request,
        accountInvitationMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const accountRecoveryMatch = request.path.match(
      /^\/api\/v1\/internal\/accounts\/([^/]+)\/recovery$/u,
    );
    if (request.method === "POST" && accountRecoveryMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleIssueAccountRecovery(
        request,
        accountRecoveryMatch[1],
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

    if (request.method === "GET" && request.path === "/api/v1/feedback") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetParticipantFeedback(
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

    if (request.method === "GET" && request.path === "/api/v1/appeals") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetParticipantAppeals(
        request,
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

    const appealHistoryMatch = request.path.match(
      /^\/api\/v1\/internal\/appeals\/([^/]+)\/history$/u,
    );
    if (request.method === "GET" && appealHistoryMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAppealReviewHistory(
        request,
        appealHistoryMatch[1],
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
      return await handleDashboard(requestId, principal, dependencies);
    }

    if (request.method === "GET" && request.path === "/api/v1/audit") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAuditTrail(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/reports/continuing-education"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleContinuingEducationReport(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/reports/reflections"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleReflectionManagementReport(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/content/review-queue"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleContentReviewQueue(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/appeals/review-queue"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAppealReviewQueue(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/feedback"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleFeedbackTriageQueue(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/session/scopes"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleInternalSessionScopes(
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

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/diagnostics/b07/evaluate"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleDiagnosticDraftEvaluation(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const diagnosticAssignmentMatch = request.path.match(
      /^\/api\/v1\/internal\/diagnostics\/([^/]+)\/assign$/u,
    );
    if (request.method === "POST" && diagnosticAssignmentMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAssignCurriculumFromDiagnostic(
        request,
        diagnosticAssignmentMatch[1],
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
        request,
        authoringRecordMatch[1],
        authoringRecordMatch[2],
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

export async function handleApiRequest(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  let principal: ApiPrincipal | undefined;
  const trackedDependencies: ApiHttpDependencies = {
    ...dependencies,
    authenticate: async (authenticatedRequest) => {
      const authenticatedPrincipal =
        await dependencies.authenticate(authenticatedRequest);
      principal = authenticatedPrincipal ?? undefined;
      return authenticatedPrincipal;
    },
  };
  const response = await handleApiRequestCore(request, trackedDependencies);
  await recordApiRejectionAudit(
    dependencies,
    {
      ...request,
      ...(request.query?.scopeId === undefined
        ? {}
        : { scopeId: request.query.scopeId }),
    },
    response,
    principal,
  );
  return response;
}
