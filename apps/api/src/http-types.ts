import type {
  AppealState,
  AssessmentWorkflowState,
  AttemptState,
  FeedbackTicketState,
  LearningAssignmentState,
  OperationalAiConfirmation,
  OperationalAiProposal,
  ObservedItemStatistics,
  ObservedItemStatisticsInput,
  SourceConflictDecisionState,
} from "@cvg/domain";
import type {
  AuditEntry,
  CorrectionResult,
  CorrectOpenResponseCommand,
  AcceptInvitationCommand,
  AcceptedInvitation,
  CreatedSession,
  CreateInvitationCommand,
  CreatedInvitation,
  LoggedInPassword,
  LoginWithPasswordCommand,
  SetAccountPasswordCommand,
  AdvanceContentCommand,
  AuthoringRecord,
  ClinicalReviewQueuePage,
  ClinicalReviewQueueQuery,
  PublishAuthoringCommand,
  ReviewAuthoringCommand,
  AccountStatus,
  AccountManagementListResult,
  ListManagedAccountsCommand,
  ManagedAccount,
  RevokeManagedAccountSessionsCommand,
  RevokedManagedAccountSessions,
  UpdateManagedAccountCommand,
  AdminDashboard,
  AdminOperationsDashboard,
  ModeratorDashboard,
  ContentRecord,
  CurriculumRuntimeState,
  DigitalCaseRuntimeRecord,
  EvaluateCurriculumModuleCommand,
  AdvanceParticipantDigitalCaseCommand,
  AppealCreateCommand,
  AppealTransitionCommand,
  AssignmentCreateCommand,
  AssignmentTransitionCommand,
  WorkflowCreateCommand,
  WorkflowTransitionCommand,
  TicketCreateCommand,
  TicketTransitionCommand,
  FeedbackTicketListContext,
  ScopedFeedbackTicket,
  ParticipantActivityState,
  ParticipantLearningJourneyState,
  ParticipantProgressState,
  IdentityProviderPort,
  SaveAnswerCommand,
  SaveAnswerResult,
  Role,
  StartAttemptCommand,
  SubmitAttemptCommand,
  TransactionSecurityContext,
  RunOperationalAiProposalCommand,
  RecordSourceConflictDecisionCommand,
  RecalculateAffectedAssessmentsCommand,
  RecalculateAffectedAssessmentsResult,
  RegisterAssessmentRecalculationCandidatesCommand,
} from "@cvg/application";
import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@cvg/contracts";
import type { Observability } from "@cvg/observability";
import type { DependencyStatus } from "@cvg/integrations";

export type OperationalEvidenceStatus =
  "VERIFIED" | "NOT_CONFIGURED" | "NOT_EXECUTED";

export type OperationalEvidence = Readonly<{
  readonly collector: OperationalEvidenceStatus;
  readonly retention: OperationalEvidenceStatus;
  readonly traces: OperationalEvidenceStatus;
  readonly load: OperationalEvidenceStatus;
  readonly failover: OperationalEvidenceStatus;
  readonly replicas: OperationalEvidenceStatus;
}>;

export type AccountSecurityStatus = Readonly<{
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
      "principalId" | "accountStatus" | "roles" | "scopes"
    > &
      Pick<
        RecordSourceConflictDecisionCommand,
        "principalId" | "accountStatus" | "roles" | "scopes"
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
