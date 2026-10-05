import type {
  AppealState,
  AssessmentWorkflowState,
  AttemptState,
  FeedbackTicketState,
  LearningAssignmentState,
} from "@cvg/domain";
import type {
  CorrectionResult,
  CorrectOpenResponseCommand,
  AcceptInvitationCommand,
  AcceptedInvitation,
  CreatedSession,
  CreateInvitationCommand,
  CreatedInvitation,
  AdvanceContentCommand,
  AuthoringRecord,
  ReviewAuthoringCommand,
  AccountStatus,
  AccountStatusChangeCommand,
  AccountStatusChangeResult,
  AccountRecoveryAcceptCommand,
  AccountRecoveryAccepted,
  AccountRecoveryIssueCommand,
  AccountRecoveryIssueResult,
  ContentRecord,
  CreateAuthoringDraftCommand,
  CurriculumRuntimeState,
  AuthoringReview,
  EvaluateCurriculumModuleCommand,
  AppealCreateCommand,
  AppealReviewTransitionCommand,
  GetParticipantAppealsCommand,
  AssignmentCreateCommand,
  AssignmentTransitionCommand,
  AssignCurriculumFromDiagnosticCommand,
  MaterializedCurriculumAssignments,
  WorkflowCreateCommand,
  WorkflowTransitionCommand,
  TicketCreateCommand,
  TicketTransitionCommand,
  ParticipantFeedbackReadCommand,
  ParticipantActivityState,
  ParticipantAttemptSnapshot,
  ParticipantLearningJourneyState,
  ParticipantProgressState,
  DiagnosticResultState,
  DiagnosticSessionCatalog,
  DiagnosticSessionRepositoryPort,
  EvaluateDiagnosticDraftCommand,
  StaffDashboardState,
  ContinuingEducationReportState,
  ReflectionManagementState,
  ContentReviewQueueState,
  GetContentReviewQueueCommand,
  AppealReviewQueueState,
  GetAppealReviewQueueCommand,
  AppealReviewHistoryState,
  GetAppealReviewHistoryCommand,
  AppealDecisionImpactPreviewState,
  GetAppealDecisionImpactPreviewCommand,
  FeedbackTriageQueueState,
  GetFeedbackTriageQueueCommand,
  FeedbackTriageMetadataState,
  UpdateFeedbackTriageMetadataCommand,
  FeedbackTicketHistoryState,
  GetFeedbackTicketHistoryCommand,
  SaveAnswerCommand,
  SaveAnswerResult,
  Role,
  ResendAccountInvitationCommand,
  ResendAccountInvitationResult,
  StartAttemptCommand,
  SubmitAttemptCommand,
  TransactionSecurityContext,
  AuditPort,
  AuditTrailState,
  GetAuditTrailCommand,
} from "@cvg/application";
import type { Observability } from "@cvg/observability";
import type { DependencyStatus } from "@cvg/integrations";

export type ParticipantActivityItemKind = "QUESTAO" | "CASO" | "REFLEXAO";

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
  readonly sessionId?: string;
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
  readonly getParticipantAttempt?: (
    participantId: string,
    attemptId: string,
  ) => Promise<ParticipantAttemptSnapshot>;
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
    ownerId?: string,
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
