import { randomUUID } from "node:crypto";

import type {
  AppealState,
  AssessmentWorkflowState,
  AttemptState,
  FeedbackTicketState,
  LearningAssignmentState,
} from "@cvg/domain";
import {
  ApplicationError,
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
  type ContentRecord,
  type CreateAuthoringDraftCommand,
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
  type DiagnosticResultState,
  type DiagnosticSessionCatalog,
  type DiagnosticSessionRepositoryPort,
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
  type AppealDecisionImpactPreviewState,
  type GetAppealDecisionImpactPreviewCommand,
  type FeedbackTriageQueueState,
  type GetFeedbackTriageQueueCommand,
  type FeedbackTriageMetadataState,
  type UpdateFeedbackTriageMetadataCommand,
  type FeedbackTicketHistoryState,
  type GetFeedbackTicketHistoryCommand,
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
  apiSuccessResponse,
  parseParticipantActivity,
  curriculumRuntimeEvaluationRequestSchema,
  parseParticipantCurriculumRuntime,
  parseParticipantProgress,
  parseParticipantLearningJourney,
  parseDashboardProjection,
  continuingEducationReportProjectionSchema,
  continuingEducationReportQuerySchema,
  reflectionManagementProjectionSchema,
  reflectionManagementQuerySchema,
  auditTrailProjectionSchema,
  auditTrailQuerySchema,
  internalSessionScopesProjectionSchema,
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
  createInvitationRequestSchema,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowScopedTransitionRequestSchema,
  learningAssignmentCreateRequestSchema,
  learningAssignmentScopedTransitionRequestSchema,
  participantAssessmentWorkflowProjectionSchema,
  participantLearningAssignmentProjectionSchema,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";
import {
  deriveOperationalSnapshot,
  type Observability,
} from "@cvg/observability";
import type { DependencyStatus } from "@cvg/integrations";
import {
  errorResponse,
  validationResponse,
  type ApiHttpResponse,
} from "./http/errors.js";
import {
  handleCorrection,
  handleSaveAnswer,
  handleStart,
  handleSubmit,
} from "./features/attempts/attempts.handler.js";
import {
  isAllowed,
  type ParticipantActivityItemKind,
} from "./http/authorization.js";
import {
  handleDiagnosticDraftEvaluation,
  handleFinalizeDiagnosticSession,
  handleGetDiagnosticSession,
  handleSaveDiagnosticSessionAnswer,
  handleStartDiagnosticSession,
} from "./features/diagnostics/diagnostics.handler.js";
import { isUuid } from "./http/validation.js";
import {
  handleAuthoringReview,
  handleContentReviewQueue,
  handleContentTransition,
  handleCreateAuthoringDraft,
  handleInternalAuthoringRecord,
} from "./features/content/content.handler.js";
import {
  handleAppealDecisionImpact,
  handleAppealReviewHistory,
  handleAppealReviewQueue,
  handleCreateAppeal,
  handleGetParticipantAppeals,
  handleTransitionAppeal,
} from "./features/appeals/appeals.handler.js";
import {
  handleCreateFeedbackTicket,
  handleFeedback,
  handleFeedbackTicketHistory,
  handleFeedbackTriageQueue,
  handleGetParticipantFeedback,
  handleTransitionFeedbackTicket,
  handleUpdateFeedbackTriageMetadata,
} from "./features/feedback/feedback.handler.js";
import {
  handleCurrentSession,
  handleRevokeSession,
  handleRotateSession,
} from "./features/session/session.handler.js";

export type { ApiHttpResponse };

export type ApiHttpRequest = Readonly<{
  readonly method: string;
  readonly path: string;
  readonly route?: string;
  readonly body: unknown;
  readonly query?: Readonly<Record<string, string | undefined>>;
  readonly queryDuplicateKeys?: readonly string[];
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
  readonly diagnosticSessionRepository?: DiagnosticSessionRepositoryPort;
  readonly diagnosticSessionCatalog?: DiagnosticSessionCatalog;
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
  readonly updateFeedbackTriageMetadata?: (
    command: UpdateFeedbackTriageMetadataCommand,
  ) => Promise<FeedbackTriageMetadataState>;
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
    itemKinds?: readonly ParticipantActivityItemKind[],
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
  readonly createAuthoringDraft?: (
    command: CreateAuthoringDraftCommand,
  ) => Promise<AuthoringRecord>;
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
  readonly getFeedbackTicketHistory?: (
    command: GetFeedbackTicketHistoryCommand,
  ) => Promise<FeedbackTicketHistoryState | null>;
  readonly getAppealReviewHistory?: (
    command: GetAppealReviewHistoryCommand,
  ) => Promise<AppealReviewHistoryState | null>;
  readonly getAppealDecisionImpactPreview?: (
    command: GetAppealDecisionImpactPreviewCommand,
  ) => Promise<AppealDecisionImpactPreviewState | null>;
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

type ApiRejectionAuditRequest = Readonly<{
  readonly method: string;
  readonly path: string;
  readonly route?: string;
  readonly scopeId?: string;
  readonly body?: unknown;
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
    const requestedScopeId =
      request.scopeId ??
      (isPlainRecord(request.body) && typeof request.body.scopeId === "string"
        ? request.body.scopeId
        : undefined);
    const scopeId =
      principal === undefined
        ? undefined
        : principal.scopes.find((candidate) => candidate === requestedScopeId);
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

function publicAssessmentWorkflowProjection(
  state: AssessmentWorkflowState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAssessmentWorkflowProjectionSchema.parse({
    resultId: state.resultId,
    status: state.status,
    version: state.version,
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
  const parsed = accountRecoveryAcceptRequestSchema.safeParse(request.body);
  if (!parsed.success) return errorResponse("not_found", requestId);
  if (dependencies.acceptAccountRecovery === undefined) {
    return errorResponse("internal_error", requestId);
  }
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

async function handleApiRequestCore(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const requestId = dependencies.requestIdFactory();

  try {
    if ((request.queryDuplicateKeys?.length ?? 0) > 0) {
      return validationResponse(requestId);
    }
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
      request.method === "GET" &&
      request.path === "/api/v1/session/current"
    ) {
      return await handleCurrentSession(request, requestId, dependencies);
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

    const feedbackTriageMetadataMatch = request.path.match(
      /^\/api\/v1\/internal\/feedback\/([^/]+)\/triage-metadata$/u,
    );
    if (request.method === "PATCH" && feedbackTriageMetadataMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleUpdateFeedbackTriageMetadata(
        request,
        feedbackTriageMetadataMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const feedbackHistoryMatch = request.path.match(
      /^\/api\/v1\/internal\/feedback\/([^/]+)\/history$/u,
    );
    if (request.method === "GET" && feedbackHistoryMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleFeedbackTicketHistory(
        request,
        feedbackHistoryMatch[1],
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

    const appealDecisionImpactMatch = request.path.match(
      /^\/api\/v1\/internal\/appeals\/([^/]+)\/impact-preview$/u,
    );
    if (request.method === "GET" && appealDecisionImpactMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAppealDecisionImpact(
        request,
        appealDecisionImpactMatch[1],
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
      request.method === "POST" &&
      request.path === "/api/v1/content/drafts"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateAuthoringDraft(
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

    if (
      request.method === "POST" &&
      request.path === "/api/v1/diagnostics/b07/sessions"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleStartDiagnosticSession(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/diagnostics/b07/sessions/current"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetDiagnosticSession(
        requestId,
        principal,
        dependencies,
      );
    }

    const diagnosticSessionAnswerMatch = request.path.match(
      /^\/api\/v1\/diagnostics\/b07\/sessions\/([^/]+)\/answers\/([^/]+)$/u,
    );
    if (
      request.method === "PUT" &&
      diagnosticSessionAnswerMatch?.[1] !== undefined &&
      diagnosticSessionAnswerMatch[2] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleSaveDiagnosticSessionAnswer(
        request,
        diagnosticSessionAnswerMatch[1],
        diagnosticSessionAnswerMatch[2],
        requestId,
        principal,
        dependencies,
      );
    }

    const diagnosticSessionFinalizeMatch = request.path.match(
      /^\/api\/v1\/diagnostics\/b07\/sessions\/([^/]+)\/finalize$/u,
    );
    if (
      request.method === "POST" &&
      diagnosticSessionFinalizeMatch?.[1] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleFinalizeDiagnosticSession(
        request,
        diagnosticSessionFinalizeMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const diagnosticSessionMatch = request.path.match(
      /^\/api\/v1\/diagnostics\/b07\/sessions\/([^/]+)$/u,
    );
    if (request.method === "GET" && diagnosticSessionMatch?.[1] !== undefined) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetDiagnosticSession(
        requestId,
        principal,
        dependencies,
        diagnosticSessionMatch[1],
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
      ...(request.query?.scopeId === undefined &&
      isPlainRecord(request.body) &&
      typeof request.body.scopeId === "string"
        ? { scopeId: request.body.scopeId }
        : {}),
    },
    response,
    principal,
  );
  return response;
}
