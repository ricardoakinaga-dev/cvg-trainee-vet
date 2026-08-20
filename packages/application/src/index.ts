export { canAccess } from "./authorization.js";
export type {
  AccountStatus,
  AuthorizationRequest,
  AuthorizationResource,
  Capability,
  Role,
} from "./authorization.js";
export {
  listManagedAccounts,
  revokeManagedAccountSessions,
  updateManagedAccount,
} from "./account-management-use-cases.js";
export type {
  AccountManagementAccountPort,
  AccountManagementListQuery,
  AccountManagementListResult,
  AccountManagementPrincipal,
  AccountManagementSessionPort,
  AccountManagementTransactionPort,
  AccountManagementTransactionalOperations,
  AccountManagementUpdateInput,
  AccountManagementUseCaseDependencies,
  ListManagedAccountsCommand,
  ManagedAccount,
  RevokeManagedAccountSessionsCommand,
  RevokedManagedAccountSessions,
  UpdateManagedAccountCommand,
} from "./account-management-use-cases.js";
export type {
  ClinicalReviewQueueFilter,
  ClinicalReviewQueueItem,
  ClinicalReviewQueuePage,
  ClinicalReviewQueuePort,
  ClinicalReviewQueueQuery,
} from "./authoring-review-queue.js";
export { ApplicationError, toApplicationError } from "./errors.js";
export type { ApplicationErrorCode, ApplicationErrorDetail } from "./errors.js";
export { createAuditEntry, listAuditEntries } from "./audit.js";
export type {
  AuditEntry,
  AuditEntryInput,
  AuditOutcome,
  AuditPort,
  AuditReadPort,
} from "./audit.js";
export { startAttempt, submitAttempt } from "./attempt-use-cases.js";
export type {
  AttemptActivityPort,
  AttemptEventPublisherPort,
  AttemptIdempotencyPort,
  AttemptRepositoryPort,
  AttemptSubmittedEvent,
  AttemptTransactionPort,
  AttemptTransactionalOperations,
  AttemptUseCaseDependencies,
  IdempotencyRecord,
  StartAttemptCommand,
  SubmitAttemptCommand,
} from "./attempt-use-cases.js";
export { saveAnswer } from "./answer-use-cases.js";
export type {
  AnswerEventPublisherPort,
  AnswerIdempotencyPort,
  AnswerIdempotencyRecord,
  AnswerRepositoryPort,
  AnswerSavedEvent,
  AnswerTransactionPort,
  AnswerTransactionalOperations,
  AnswerUseCaseDependencies,
  SaveAnswerCommand,
  SaveAnswerResult,
} from "./answer-use-cases.js";
export { correctOpenResponse } from "./correction-use-cases.js";
export type {
  AssessmentCorrectedEvent,
  CorrectionEventPublisherPort,
  CorrectionIdempotencyPort,
  CorrectionIdempotencyRecord,
  CorrectionResult,
  CorrectionResultsPort,
  CorrectionAttemptsPort,
  CorrectionTransactionPort,
  CorrectionTransactionalOperations,
  CorrectionUseCaseDependencies,
  CorrectOpenResponseCommand,
} from "./correction-use-cases.js";
export type { TransactionSecurityContext } from "./transaction-context.js";
export { getAttemptFeedback } from "./feedback-use-cases.js";
export type {
  FeedbackReadPort,
  GetAttemptFeedbackCommand,
} from "./feedback-use-cases.js";
export { listFeedbackTicketStates } from "./feedback-list.js";
export type {
  FeedbackTicketListAudience,
  FeedbackTicketListContext,
  FeedbackTicketReadPort,
} from "./feedback-list.js";
export { recordObservedItemStatistics } from "./item-statistics-use-cases.js";
export type { ItemStatisticsWritePort } from "./item-statistics-use-cases.js";
export {
  recalculateAffectedAssessments,
  registerAssessmentRecalculationCandidates,
} from "./assessment-recalculation-use-cases.js";
export type {
  AssessmentRecalculationCandidate,
  AssessmentRecalculationCandidateWritePort,
  AssessmentRecalculationNotification,
  AssessmentRecalculationPort,
  RecalculateAffectedAssessmentsCommand,
  RecalculateAffectedAssessmentsResult,
  RegisterAssessmentRecalculationCandidatesCommand,
} from "./assessment-recalculation-use-cases.js";
export { runOperationalAiProposal } from "./operational-ai-agent.js";
export type {
  OperationalAiGenerator,
  RunOperationalAiProposalCommand,
} from "./operational-ai-agent.js";
export { recordSourceConflictDecision } from "./source-conflict-use-cases.js";
export type {
  RecordSourceConflictDecisionCommand,
  SourceConflictDecisionWritePort,
} from "./source-conflict-use-cases.js";
export { acceptInvitation, createInvitation } from "./invitation-use-cases.js";
export type {
  AcceptInvitationCommand,
  AcceptedInvitation,
  CreateInvitationCommand,
  CreatedInvitation,
  InvitationAccountPort,
  InvitationPort,
  InvitationRecord,
  InvitationTransactionPort,
  InvitationTransactionalOperations,
  InvitationUseCaseDependencies,
} from "./invitation-use-cases.js";
export {
  authenticateSessionCookie,
  clearSessionCookie,
  createSession,
  hashSessionToken,
  revokeSessionCookie,
  rotateSession,
} from "./session.js";
export { getParticipantActivity } from "./activity-use-cases.js";
export type {
  ActivityReadPort,
  GetParticipantActivityCommand,
  ParticipantActivityChoice,
  ParticipantActivityItem,
  ParticipantActivityState,
} from "./activity-use-cases.js";
export {
  evaluateAndPersistCurriculumModule,
  getParticipantCurriculumRuntime,
} from "./curriculum-runtime-use-cases.js";
export type {
  CurriculumRuntimeReadPort,
  CurriculumRuntimeState,
  CurriculumRuntimeWriteInput,
  CurriculumRuntimeWritePort,
  EvaluateCurriculumModuleCommand,
  GetParticipantCurriculumRuntimeCommand,
} from "./curriculum-runtime-use-cases.js";
export {
  advanceParticipantDigitalCase,
  getParticipantDigitalCase,
  projectParticipantDigitalCaseRuntime,
} from "./digital-case-use-cases.js";
export type {
  AdvanceParticipantDigitalCaseCommand,
  DigitalCaseRuntimeRecord,
  DigitalCaseRuntimeReadPort,
  DigitalCaseRuntimeRepositoryPort,
  DigitalCaseRuntimeWriteInput,
  GetParticipantDigitalCaseCommand,
} from "./digital-case-use-cases.js";
export {
  advanceContent,
  advanceContentWithinTransaction,
  expireDueContent,
} from "./content-use-cases.js";
export type {
  AdvanceContentCommand,
  ContentExpiryUseCaseDependencies,
  ContentEventPublisherPort,
  ContentRecord,
  ContentRepositoryPort,
  ContentTransactionPort,
  ContentTransactionalOperations,
  ContentUseCaseDependencies,
  ContentWorkflowEvent,
  ExpireContentCommand,
  ExpireContentResult,
} from "./content-use-cases.js";
export {
  publishAuthoringContent,
  reviewAuthoringContent,
  runAuthoringPreflight,
} from "./authoring-use-cases.js";
export type {
  AuthoringChoice,
  AuthoringIdempotencyPort,
  AuthoringIdempotencyRecord,
  AuthoringParticipantItem,
  AuthoringPreflight,
  AuthoringPreflightResult,
  AuthoringRecord,
  AuthoringRepositoryPort,
  AuthoringRubric,
  AuthoringSourceRef,
  AuthoringPublicationDependencies,
  AuthoringPublicationResult,
  AuthoringReviewDependencies,
  AuthoringReviewResult,
  AuthoringTransactionPort,
  AuthoringTransactionalOperations,
  AuthoringWorkflowOperation,
  ClinicalApproverPort,
  ClinicalApproverRecord,
  ClinicalReviewDecision,
  ClinicalReviewRecord,
  PublishAuthoringCommand,
  ReviewAuthoringCommand,
} from "./authoring-use-cases.js";
export type {
  CreateSessionInput,
  CreatedSession,
  RotateSessionInput,
  SessionPrincipal,
  SessionRecord,
  SessionRepositoryPort,
} from "./session.js";
export {
  deriveProgressNextAction,
  getParticipantProgress,
} from "./progress-use-cases.js";
export type {
  AssignmentStatus,
  GetParticipantProgressCommand,
  ParticipantProgressState,
  ProgressNextAction,
  ProgressReadPort,
} from "./progress-use-cases.js";
export {
  createAppealState,
  createAssessmentWorkflowState,
  createFeedbackTicketState,
  createLearningAssignmentState,
  transitionAppealState,
  transitionAssessmentWorkflowState,
  transitionFeedbackTicketState,
  transitionLearningAssignmentState,
} from "./learning-state-use-cases.js";
export type {
  AppealCreateCommand,
  AppealTransitionCommand,
  AssignmentCreateCommand,
  AssignmentTransitionCommand,
  WorkflowCreateCommand,
  WorkflowTransitionCommand,
  TicketCreateCommand,
  TicketTransitionCommand,
  LearningStateContext,
  LearningStateRepositoryPort,
  ScopedAppeal,
  ScopedAssessmentWorkflow,
  ScopedFeedbackTicket,
  ScopedLearningAssignment,
} from "./learning-state-use-cases.js";
export {
  deriveJourneyNextAction,
  getNextParticipantJourneyActivity,
  getParticipantLearningJourney,
  isParticipantJourneyActivityCurrent,
} from "./journey-use-cases.js";
export { buildParticipantDashboard } from "./dashboard-use-cases.js";
export type {
  ParticipantDashboard,
  ParticipantDashboardModule,
  ParticipantDashboardModuleStatus,
} from "./dashboard-use-cases.js";
export {
  buildAdminDashboard,
  getInternalAdminDashboard,
} from "./admin-dashboard-use-cases.js";
export type {
  AdminDashboard,
  AdminDashboardParticipant,
  AdminDashboardParticipantAccount,
  AdminDashboardParticipantSnapshot,
  AdminDashboardReadDependencies,
  AdminDashboardSummary,
  AdminDashboardTrainingModule,
} from "./admin-dashboard-use-cases.js";
export {
  buildAdminOperationsDashboard,
  getInternalAdminOperationsDashboard,
} from "./admin-operations-dashboard-use-cases.js";
export type {
  AdminOperationsDashboard,
  AdminOperationsDashboardReadDependencies,
  AdminOperationsSignals,
} from "./admin-operations-dashboard-use-cases.js";
export {
  buildModeratorDashboard,
  getInternalModeratorDashboard,
} from "./moderator-dashboard-use-cases.js";
export type {
  ModeratorDashboard,
  ModeratorDashboardParticipant,
  ModeratorAssignedParticipantSnapshot,
  ModeratorDashboardReadData,
  ModeratorDashboardReadDependencies,
  ModeratorParticipantSnapshot,
  ModeratorQueueKind,
  ModeratorQueueSnapshot,
} from "./moderator-dashboard-use-cases.js";
export {
  createHttpIdentityProvider,
  createUnavailableIdentityProvider,
} from "./identity-provider.js";
export type {
  IdentityProviderOperation,
  IdentityProviderPort,
  IdentityProviderSecurityStatus,
} from "./identity-provider.js";
export type {
  GetParticipantLearningJourneyCommand,
  JourneyNextAction,
  ParticipantJourneyActivity,
  ParticipantJourneyReadPort,
  ParticipantLearningJourneyState,
} from "./journey-use-cases.js";
export {
  hashPassword,
  loginWithPassword,
  passwordPolicy,
  setAccountPassword,
  verifyPassword,
} from "./password-auth.js";
export type {
  LoggedInPassword,
  LoginWithPasswordCommand,
  PasswordAccountRecord,
  PasswordAuthAccountPort,
  PasswordAuthTransactionPort,
  PasswordAuthTransactionalOperations,
  PasswordAuthUseCaseDependencies,
  SetAccountPasswordCommand,
} from "./password-auth.js";
