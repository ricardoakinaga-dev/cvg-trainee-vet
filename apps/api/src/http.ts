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
  confirmOperationalAiProposal,
  inspectFeedbackContent,
  redactFeedbackContent,
  type OperationalAiConfirmation,
  type OperationalAiProposal,
  type ObservedItemStatistics,
  type ObservedItemStatisticsInput,
  type SourceConflictDecisionState,
} from "@cvg/domain";
import {
  ApplicationError,
  type AdvanceParticipantDigitalCaseCommand,
  type AuditEntry,
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
  type AccountManagementListResult,
  type ListManagedAccountsCommand,
  type ManagedAccount,
  type RevokeManagedAccountSessionsCommand,
  type RevokedManagedAccountSessions,
  type UpdateManagedAccountCommand,
  type AdminDashboard,
  type AdminOperationsDashboard,
  type ModeratorDashboard,
  buildParticipantDashboard,
  type Capability,
  type ContentRecord,
  type CurriculumRuntimeState,
  type DigitalCaseRuntimeRecord,
  type EvaluateCurriculumModuleCommand,
  type AppealCreateCommand,
  type AppealTransitionCommand,
  type AssignmentCreateCommand,
  type AssignmentTransitionCommand,
  type WorkflowCreateCommand,
  type WorkflowTransitionCommand,
  type TicketCreateCommand,
  type TicketTransitionCommand,
  type FeedbackTicketListContext,
  type ScopedFeedbackTicket,
  type ParticipantActivityState,
  type ParticipantLearningJourneyState,
  type ParticipantProgressState,
  isParticipantJourneyActivityCurrent,
  type IdentityProviderOperation,
  type IdentityProviderPort,
  projectParticipantDigitalCaseRuntime,
  type SaveAnswerCommand,
  type SaveAnswerResult,
  type Role,
  type StartAttemptCommand,
  type SubmitAttemptCommand,
  type TransactionSecurityContext,
  type RunOperationalAiProposalCommand,
  type RecordSourceConflictDecisionCommand,
  type RecalculateAffectedAssessmentsCommand,
  type RecalculateAffectedAssessmentsResult,
  type RegisterAssessmentRecalculationCandidatesCommand,
} from "@cvg/application";
import {
  apiErrorResponse,
  accountActionRequestSchema,
  accountManagementListQuerySchema,
  accountManagementUpdateRequestSchema,
  accountOperationProjectionSchema,
  accountVerificationRequestSchema,
  apiSuccessResponse,
  digitalCaseAdvanceRequestSchema,
  digitalCaseScopeQuerySchema,
  parseAuditTrail,
  parseAccountSecurity,
  parseAdminDashboard,
  parseAdminOperationsDashboard,
  parseModeratorDashboard,
  parseOperationsDashboard,
  parseParticipantDashboard,
  managedAccountPageProjectionSchema,
  revokedAccountSessionsProjectionSchema,
  authoringPublicationRequestSchema,
  authoringReviewRequestSchema,
  createAttemptRequestSchema,
  contentTransitionRequestSchema,
  parseParticipantActivity,
  curriculumRuntimeEvaluationRequestSchema,
  parseParticipantCurriculumRuntime,
  parseParticipantDigitalCaseRuntime,
  parseParticipantAttempt,
  parseParticipantProgress,
  parseParticipantLearningJourney,
  operationalAiConfirmationProjectionSchema,
  operationalAiConfirmationRequestSchema,
  operationalAiProposalProjectionSchema,
  operationalAiProposalRequestSchema,
  observedItemStatisticsRequestSchema,
  parseObservedItemStatistics,
  parseSourceConflictDecision,
  sourceConflictDecisionRequestSchema,
  assessmentRecalculationBatchRequestSchema,
  parseAssessmentRecalculationResult,
  parseInternalAuthoringRecordProjection,
  clinicalReviewQueueQuerySchema,
  parseClinicalReviewQueuePage,
  correctOpenResponseRequestSchema,
  correctionResultProjectionSchema,
  acceptInvitationRequestSchema,
  activeSessionProjectionSchema,
  accountSessionRevokeRequestSchema,
  rotateSessionRequestSchema,
  createInvitationRequestSchema,
  loginRequestSchema,
  passwordUpdateRequestSchema,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowScopedTransitionRequestSchema,
  appealCreateRequestSchema,
  appealScopedTransitionRequestSchema,
  feedbackTicketParticipantCreateRequestSchema,
  feedbackTicketListProjectionSchema,
  feedbackTicketListQuerySchema,
  feedbackTicketScopedTransitionRequestSchema,
  internalFeedbackTicketProjectionSchema,
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
  readonly applicationVersion?: string;
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
  readonly listManagedAccounts?: (
    command: ListManagedAccountsCommand,
  ) => Promise<AccountManagementListResult>;
  readonly updateManagedAccount?: (
    command: UpdateManagedAccountCommand,
  ) => Promise<ManagedAccount>;
  readonly revokeManagedAccountSessions?: (
    command: RevokeManagedAccountSessionsCommand,
  ) => Promise<RevokedManagedAccountSessions>;
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
  readonly listFeedbackTickets?: (
    context: FeedbackTicketListContext,
  ) => Promise<readonly ScopedFeedbackTicket[]>;
  readonly recordFeedbackSafetyEvent?: (
    input: Readonly<{
      readonly principalId: string;
      readonly scopeId: string;
      readonly ticketId: string;
      readonly requestId: string;
      readonly action: "BLOCKED" | "REDACTED";
      readonly reasonCodes: readonly string[];
    }>,
  ) => Promise<void>;
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
  readonly getInternalAdminDashboard?: (
    scopeIds: readonly string[],
  ) => Promise<AdminDashboard>;
  readonly getInternalAdminOperationsDashboard?: (
    scopeIds: readonly string[],
  ) => Promise<AdminOperationsDashboard>;
  readonly getInternalModeratorDashboard?: (
    moderatorId: string,
    scopeIds: readonly string[],
  ) => Promise<ModeratorDashboard>;
  readonly runOperationalAiProposal?: (
    command: Omit<RunOperationalAiProposalCommand, "costCeilingUsd">,
  ) => Promise<OperationalAiProposal>;
  readonly confirmOperationalAiProposal?: (
    proposal: OperationalAiProposal,
    confirmation: Readonly<{
      readonly confirmedBy: string;
      readonly confirmedAt: string;
      readonly rationale?: string;
    }>,
  ) => OperationalAiConfirmation;
  readonly recordObservedItemStatistics?: (
    input: ObservedItemStatisticsInput,
  ) => Promise<ObservedItemStatistics>;
  readonly recordSourceConflictDecision?: (
    command: Omit<
      RecordSourceConflictDecisionCommand,
      | "principalId"
      | "accountStatus"
      | "roles"
      | "scopes"
      | "approvedClinicalApproverId"
    > &
      Pick<
        RecordSourceConflictDecisionCommand,
        | "principalId"
        | "accountStatus"
        | "roles"
        | "scopes"
        | "approvedClinicalApproverId"
      >,
  ) => Promise<SourceConflictDecisionState>;
  readonly registerAssessmentRecalculationCandidates?: (
    command: RegisterAssessmentRecalculationCandidatesCommand,
  ) => Promise<Readonly<{ readonly registeredCount: number }>>;
  readonly recalculateAffectedAssessments?: (
    command: RecalculateAffectedAssessmentsCommand,
  ) => Promise<RecalculateAffectedAssessmentsResult>;
  readonly listAuditEntries?: () => Promise<readonly AuditEntry[]>;
  readonly getParticipantCurriculumRuntime?: (
    participantId: string,
    moduleId: string,
  ) => Promise<CurriculumRuntimeState>;
  readonly evaluateCurriculumRuntime?: (
    command: EvaluateCurriculumModuleCommand,
  ) => Promise<CurriculumRuntimeState>;
  readonly getParticipantDigitalCase?: (
    command: Readonly<{
      readonly participantId: string;
      readonly scopeId: string;
      readonly moduleId: string;
      readonly now: string;
    }>,
  ) => Promise<DigitalCaseRuntimeRecord>;
  readonly advanceParticipantDigitalCase?: (
    command: AdvanceParticipantDigitalCaseCommand,
  ) => Promise<DigitalCaseRuntimeRecord>;
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

function publicDigitalCaseRuntimeProjection(
  state: DigitalCaseRuntimeRecord,
): ApiSuccessEnvelope<unknown>["data"] {
  const projection = projectParticipantDigitalCaseRuntime(state);
  return parseParticipantDigitalCaseRuntime({
    moduleId: state.moduleId,
    ...projection,
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
    ...(state.resumeAt === undefined ? {} : { resumeAt: state.resumeAt }),
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

function feedbackSafetyReasonCodes(
  state: FeedbackTicketState,
): readonly string[] {
  const values = [
    inspectFeedbackContent(state.description),
    ...(state.response === undefined
      ? []
      : [inspectFeedbackContent(state.response.message)]),
  ];
  return Object.freeze([
    ...new Set(values.flatMap((inspection) => inspection.reasons)),
  ]);
}

async function recordFeedbackSafetyEventIfNeeded(
  state: FeedbackTicketState,
  principalId: string,
  scopeId: string,
  requestId: string,
  action: "REDACTED",
  dependencies: ApiHttpDependencies,
): Promise<void> {
  const reasonCodes = feedbackSafetyReasonCodes(state);
  if (
    reasonCodes.length === 0 ||
    dependencies.recordFeedbackSafetyEvent === undefined
  ) {
    return;
  }
  await dependencies.recordFeedbackSafetyEvent({
    principalId,
    scopeId,
    ticketId: state.ticketId,
    requestId,
    action,
    reasonCodes,
  });
}

function publicFeedbackTicketProjection(
  state: FeedbackTicketState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantFeedbackTicketProjectionSchema.parse({
    ticketId: state.ticketId,
    type: state.type,
    description: redactFeedbackContent(state.description),
    createdAt: state.createdAt,
    ...(state.alertedAt === undefined ? {} : { alertedAt: state.alertedAt }),
    status: state.status,
    version: state.version,
    priority: state.priority ?? "NORMAL",
    history: (
      state.history ?? [{ status: state.status, changedAt: state.createdAt }]
    ).map(({ status, changedAt }) => ({ status, changedAt })),
    ...(state.technicalContext === undefined
      ? {}
      : { technicalContext: state.technicalContext }),
    ...(state.response === undefined
      ? {}
      : {
          response: {
            message: redactFeedbackContent(state.response.message),
            respondedAt: state.response.respondedAt,
          },
        }),
  });
}

function internalFeedbackTicketProjection(
  scoped: ScopedFeedbackTicket,
): ApiSuccessEnvelope<unknown>["data"] {
  const state = scoped.state;
  return internalFeedbackTicketProjectionSchema.parse({
    ticketId: state.ticketId,
    participantId: state.participantId,
    scopeId: scoped.scopeId,
    type: state.type,
    description: redactFeedbackContent(state.description),
    createdAt: state.createdAt,
    ...(state.alertedAt === undefined ? {} : { alertedAt: state.alertedAt }),
    status: state.status,
    version: state.version,
    priority: state.priority ?? "NORMAL",
    history: state.history ?? [
      { status: state.status, changedAt: state.createdAt },
    ],
    ...(state.assigneeId === undefined ? {} : { assigneeId: state.assigneeId }),
    ...(state.technicalContext === undefined
      ? {}
      : { technicalContext: state.technicalContext }),
    ...(state.response === undefined
      ? {}
      : {
          response: {
            message: redactFeedbackContent(state.response.message),
            respondedAt: state.response.respondedAt,
            ...(state.response.respondedBy === undefined
              ? {}
              : { respondedBy: state.response.respondedBy }),
          },
        }),
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
    capability === "VIEW_CLINICAL_REVIEW_QUEUE" ||
    capability === "VIEW_FEEDBACK_TICKETS"
      ? {
          approvedClinicalApproverId:
            approvedClinicalApproverId ?? principal.principalId,
        }
      : {}),
  });
}

function resolveDigitalCaseScope(
  principal: ApiPrincipal,
  requestedScopeId: string | undefined,
): string | null {
  const scopeId =
    requestedScopeId ??
    (principal.scopes.length === 1 ? principal.scopes[0] : undefined);
  if (
    scopeId === undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      scopeId,
    )
  ) {
    return null;
  }
  return scopeId;
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

async function handleDigitalCaseRuntime(
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
  if (
    !isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
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

async function handleDigitalCaseAdvance(
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
  if (
    !isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
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

async function handleAuditTrail(
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
  if (dependencies.listAuditEntries === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const entries = await dependencies.listAuditEntries();
  return {
    status: 200,
    body: apiSuccessResponse(parseAuditTrail({ entries }), requestId),
  };
}

async function handleAdminDashboard(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isAllowed(principal, "VIEW_ADMIN_DASHBOARD", {})) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.getInternalAdminDashboard === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const dashboard = await dependencies.getInternalAdminDashboard(
    principal.scopes,
  );
  return {
    status: 200,
    body: apiSuccessResponse(parseAdminDashboard(dashboard), requestId),
  };
}

async function handleAdminOperationsDashboard(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!isAllowed(principal, "VIEW_ADMIN_DASHBOARD", {})) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.getInternalAdminOperationsDashboard === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const dashboard = await dependencies.getInternalAdminOperationsDashboard(
    principal.scopes,
  );
  return {
    status: 200,
    body: apiSuccessResponse(
      parseAdminOperationsDashboard(dashboard),
      requestId,
    ),
  };
}

async function handleModeratorDashboard(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.getInternalModeratorDashboard === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const requestedScopeId = request.query?.scopeId;
  if (requestedScopeId !== undefined && requestedScopeId.trim().length === 0) {
    return validationResponse(requestId, "scopeId");
  }
  const scopeIds =
    requestedScopeId === undefined
      ? principal.scopes
      : [requestedScopeId.trim()];
  if (
    scopeIds.length === 0 ||
    scopeIds.some(
      (scopeId) =>
        !isAllowed(principal, "VIEW_MODERATOR_DASHBOARD", { scopeId }),
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const dashboard = await dependencies.getInternalModeratorDashboard(
    principal.principalId,
    scopeIds,
  );
  return {
    status: 200,
    body: apiSuccessResponse(parseModeratorDashboard(dashboard), requestId),
  };
}

function canViewOperationalAi(principal: ApiPrincipal): boolean {
  return canAccess({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    capability: "VIEW_INTERNAL_AUDIT",
    scopes: principal.scopes,
  });
}

async function handleOperationalAiProposal(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!canViewOperationalAi(principal)) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.runOperationalAiProposal === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = operationalAiProposalRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const proposal = await dependencies.runOperationalAiProposal({
    requestId,
    tool: parsed.data.tool,
    impact: parsed.data.impact,
    input: parsed.data.input,
    instructions: parsed.data.instructions,
    estimatedCostUsd: parsed.data.estimatedCostUsd,
    generatedAt: new Date().toISOString(),
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      operationalAiProposalProjectionSchema.parse(proposal),
      requestId,
    ),
  };
}

async function handleOperationalAiConfirmation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!canViewOperationalAi(principal)) {
    return errorResponse("forbidden", requestId);
  }
  const parsed = operationalAiConfirmationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const confirmation = (
    dependencies.confirmOperationalAiProposal ?? confirmOperationalAiProposal
  )(parsed.data.proposal, {
    confirmedBy: principal.principalId,
    confirmedAt: parsed.data.confirmedAt,
    ...(parsed.data.rationale === undefined
      ? {}
      : { rationale: parsed.data.rationale }),
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      operationalAiConfirmationProjectionSchema.parse(confirmation),
      requestId,
    ),
  };
}

async function handleObservedItemStatistics(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!canViewOperationalAi(principal)) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.recordObservedItemStatistics === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = observedItemStatisticsRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (!principal.scopes.includes(parsed.data.scopeId)) {
    return errorResponse("forbidden", requestId);
  }
  const statistics = await dependencies.recordObservedItemStatistics({
    statisticsId: randomUUID(),
    itemId: parsed.data.itemId,
    scopeId: parsed.data.scopeId,
    contentVersion: parsed.data.contentVersion,
    observedAt: parsed.data.observedAt,
    sampleSize: parsed.data.sampleSize,
    correctCount: parsed.data.correctCount,
    appealCount: parsed.data.appealCount,
    ...(parsed.data.discrimination === undefined
      ? {}
      : { discrimination: parsed.data.discrimination }),
    distractorCounts: parsed.data.distractorCounts,
  });
  return {
    status: 201,
    body: apiSuccessResponse(
      parseObservedItemStatistics(statistics),
      requestId,
    ),
  };
}

async function handleSourceConflictDecision(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.recordSourceConflictDecision === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = sourceConflictDecisionRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (!principal.scopes.includes(parsed.data.scopeId)) {
    return errorResponse("forbidden", requestId);
  }
  const decision = await dependencies.recordSourceConflictDecision({
    ...parsed.data,
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
  });
  return {
    status: 201,
    body: apiSuccessResponse(parseSourceConflictDecision(decision), requestId),
  };
}

async function handleAssessmentRecalculation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.approvedClinicalApproverId === undefined) {
    return errorResponse("forbidden", requestId);
  }
  const parsed = assessmentRecalculationBatchRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success) return validationResponse(requestId);
  if (!principal.scopes.includes(parsed.data.scopeId)) {
    return errorResponse("forbidden", requestId);
  }
  const command = {
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
    scopeId: parsed.data.scopeId,
    itemId: parsed.data.itemId,
    reason: parsed.data.reason,
    passingScore: parsed.data.passingScore,
    recalculatedAt: parsed.data.recalculatedAt,
  } satisfies RecalculateAffectedAssessmentsCommand;
  if (parsed.data.candidates.length > 0) {
    if (dependencies.registerAssessmentRecalculationCandidates === undefined) {
      return errorResponse("internal_error", requestId);
    }
    await dependencies.registerAssessmentRecalculationCandidates({
      ...command,
      candidates: parsed.data.candidates,
    });
  }
  if (dependencies.recalculateAffectedAssessments === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const result = await dependencies.recalculateAffectedAssessments(command);
  return {
    status: 200,
    body: apiSuccessResponse(
      parseAssessmentRecalculationResult(result),
      requestId,
    ),
  };
}

function managedAccountProjection(account: ManagedAccount) {
  return {
    accountId: account.accountId,
    professionalEmail: account.professionalEmail,
    accountStatus: account.accountStatus,
    roles: [...account.roles],
    scopes: [...account.scopes],
    version: account.version,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

async function handleListManagedAccounts(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.listManagedAccounts === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = accountManagementListQuerySchema.safeParse(
    request.query ?? {},
  );
  if (!parsed.success) return validationResponse(requestId);
  const result = await dependencies.listManagedAccounts({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    limit: parsed.data.limit,
    ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
    ...(parsed.data.scopeId === undefined
      ? {}
      : { scopeId: parsed.data.scopeId }),
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      managedAccountPageProjectionSchema.parse({
        accounts: result.accounts.map(managedAccountProjection),
        nextCursor: result.nextCursor,
      }),
      requestId,
    ),
  };
}

async function handleUpdateManagedAccount(
  request: ApiHttpRequest,
  accountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.updateManagedAccount === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = accountManagementUpdateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (parsed.data.roles?.includes("ADMIN") === true) {
    return errorResponse("forbidden", requestId);
  }
  const updated = await dependencies.updateManagedAccount({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId: accountId,
    expectedVersion: parsed.data.expectedVersion,
    ...(parsed.data.status === undefined
      ? {}
      : { nextStatus: parsed.data.status }),
    ...(parsed.data.roles === undefined
      ? {}
      : { nextRoles: parsed.data.roles }),
    ...(parsed.data.scopes === undefined
      ? {}
      : { nextScopes: parsed.data.scopes }),
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      managedAccountPageProjectionSchema.shape.accounts.element.parse(
        managedAccountProjection(updated),
      ),
      requestId,
    ),
  };
}

async function handleRevokeManagedAccountSessions(
  request: ApiHttpRequest,
  accountId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.revokeManagedAccountSessions === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = accountSessionRevokeRequestSchema.safeParse(
    request.body ?? {},
  );
  if (!parsed.success) return validationResponse(requestId);
  const result = await dependencies.revokeManagedAccountSessions({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    targetAccountId: accountId,
    correlationId: requestId,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      revokedAccountSessionsProjectionSchema.parse(result),
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
    ...(parsed.data.event === "RETIRAR" &&
    parsed.data.withdrawalReasonCode !== undefined
      ? { withdrawalReasonCode: parsed.data.withdrawalReasonCode }
      : {}),
    ...(parsed.data.event === "RETIRAR" &&
    dependencies.approvedClinicalApproverId !== undefined
      ? { approvedClinicalApproverId: dependencies.approvedClinicalApproverId }
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
  const invitedScopes =
    parsed.data.invitedScopes.length === 0
      ? Object.freeze([...principal.scopes])
      : parsed.data.invitedScopes;
  if (invitedScopes.some((scopeId) => !principal.scopes.includes(scopeId))) {
    return errorResponse("forbidden", requestId);
  }

  const created = await dependencies.createInvitation({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    professionalEmail: parsed.data.professionalEmail,
    invitedRoles: parsed.data.invitedRoles,
    invitedScopes,
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
    ...(parsed.data.resumeAt === undefined
      ? {}
      : { resumeAt: parsed.data.resumeAt }),
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
    parsed.data.scopeId ??
    (principal.scopes.length === 1 ? principal.scopes[0] : undefined);
  if (scopeId === undefined) return errorResponse("forbidden", requestId);
  if (
    !isAllowed(principal, "CREATE_FEEDBACK_TICKET", {
      ownerId: principal.principalId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const contentInspection = inspectFeedbackContent(parsed.data.description);
  if (!contentInspection.safe) {
    if (dependencies.recordFeedbackSafetyEvent !== undefined) {
      await dependencies.recordFeedbackSafetyEvent({
        principalId: principal.principalId,
        scopeId,
        ticketId: "blocked",
        requestId,
        action: "BLOCKED",
        reasonCodes: contentInspection.reasons,
      });
    }
    return validationResponse(requestId, "description");
  }
  const createdAt = new Date().toISOString();
  const suppliedTechnicalContext = parsed.data.technicalContext;
  const technicalContext =
    suppliedTechnicalContext === undefined
      ? ({
          logicalPage: "/feedback",
          appVersion: dependencies.applicationVersion ?? "api-0.1.0",
          occurredAt: createdAt,
        } as const)
      : {
          logicalPage: suppliedTechnicalContext.logicalPage,
          appVersion: suppliedTechnicalContext.appVersion,
          ...(suppliedTechnicalContext.occurredAt === undefined
            ? {}
            : { occurredAt: suppliedTechnicalContext.occurredAt }),
          ...(suppliedTechnicalContext.errorCode === undefined
            ? {}
            : { errorCode: suppliedTechnicalContext.errorCode }),
        };
  const state = await dependencies.createFeedbackTicket({
    ticketId: randomUUID(),
    participantId: principal.principalId,
    scopeId,
    type: parsed.data.type,
    description: parsed.data.description,
    createdAt,
    technicalContext,
  });
  return {
    status: 201,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

async function handleListFeedbackTickets(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.listFeedbackTickets === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = feedbackTicketListQuerySchema.safeParse(request.query ?? {});
  if (!parsed.success) return validationResponse(requestId);

  const scopeId =
    parsed.data.scopeId ??
    (principal.scopes.length === 1 ? principal.scopes[0] : undefined);
  if (scopeId === undefined) return errorResponse("forbidden", requestId);

  const isStaff = principal.roles.some((role) =>
    ["MODERATOR", "ADMIN", "CLINICAL_APPROVER"].includes(role),
  );
  if (
    !isAllowed(
      principal,
      "VIEW_FEEDBACK_TICKETS",
      isStaff ? { scopeId } : { ownerId: principal.principalId, scopeId },
    )
  ) {
    return errorResponse("forbidden", requestId);
  }

  const context: FeedbackTicketListContext = {
    audience: isStaff ? "STAFF" : "PARTICIPANT",
    scopeId,
    ...(isStaff ? {} : { participantId: principal.principalId }),
    ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
    ...(parsed.data.priority === undefined
      ? {}
      : { priority: parsed.data.priority }),
  };
  const tickets = await dependencies.listFeedbackTickets(context);
  if (
    !isStaff &&
    tickets.some(
      (ticket) => ticket.state.participantId !== principal.principalId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  if (tickets.some((ticket) => ticket.scopeId !== scopeId)) {
    return errorResponse("internal_error", requestId);
  }
  for (const ticket of tickets) {
    await recordFeedbackSafetyEventIfNeeded(
      ticket.state,
      principal.principalId,
      ticket.scopeId,
      requestId,
      "REDACTED",
      dependencies,
    );
  }
  const projection = feedbackTicketListProjectionSchema.parse({
    tickets: tickets.map((ticket) =>
      isStaff
        ? internalFeedbackTicketProjection(ticket)
        : publicFeedbackTicketProjection(ticket.state),
    ),
  });
  return {
    status: 200,
    body: apiSuccessResponse(projection, requestId),
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
  const event = {
    type: parsed.data.event,
    actorId: principal.principalId,
    ...(parsed.data.now === undefined ? {} : { now: parsed.data.now }),
    ...(parsed.data.priority === undefined
      ? {}
      : { priority: parsed.data.priority }),
    ...(parsed.data.assigneeId === undefined
      ? {}
      : { assigneeId: parsed.data.assigneeId }),
    ...(parsed.data.response === undefined
      ? {}
      : { response: parsed.data.response }),
  } as TicketTransitionCommand["event"];
  const state = await dependencies.transitionFeedbackTicket({
    ticketId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event,
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
      request.path === "/api/v1/internal/admin/dashboard"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAdminDashboard(requestId, principal, dependencies);
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/admin/operations"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAdminOperationsDashboard(
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/moderator/dashboard"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleModeratorDashboard(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/operational-ai/proposals"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleOperationalAiProposal(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/operational-ai/proposals/confirm"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleOperationalAiConfirmation(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/item-statistics"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleObservedItemStatistics(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/source-conflicts/decisions"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleSourceConflictDecision(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/assessment-recalculations"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAssessmentRecalculation(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/accounts"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleListManagedAccounts(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const managedAccountUpdateMatch = request.path.match(
      /^\/api\/v1\/internal\/accounts\/([^/]+)$/u,
    );
    if (
      request.method === "PATCH" &&
      managedAccountUpdateMatch?.[1] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleUpdateManagedAccount(
        request,
        managedAccountUpdateMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const managedAccountSessionRevokeMatch = request.path.match(
      /^\/api\/v1\/internal\/accounts\/([^/]+)\/sessions\/revoke$/u,
    );
    if (
      request.method === "POST" &&
      managedAccountSessionRevokeMatch?.[1] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleRevokeManagedAccountSessions(
        request,
        managedAccountSessionRevokeMatch[1],
        requestId,
        principal,
        dependencies,
      );
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

    if (request.method === "GET" && request.path === "/api/v1/internal/audit") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAuditTrail(requestId, principal, dependencies);
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

    if (request.method === "GET" && request.path === "/api/v1/feedback") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleListFeedbackTickets(
        request,
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

    const digitalCaseAdvanceMatch = request.path.match(
      /^\/api\/v1\/curriculum\/modules\/([^/]+)\/case\/advance$/u,
    );
    if (request.method === "POST" && digitalCaseAdvanceMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleDigitalCaseAdvance(
        request,
        digitalCaseAdvanceMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const digitalCaseRuntimeMatch = request.path.match(
      /^\/api\/v1\/curriculum\/modules\/([^/]+)\/case$/u,
    );
    if (request.method === "GET" && digitalCaseRuntimeMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleDigitalCaseRuntime(
        request,
        digitalCaseRuntimeMatch[1],
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
