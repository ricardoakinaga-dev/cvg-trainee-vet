export type PersistencePackage = "cvg-persistence";

export {
  createPostgresDatabase,
  normalizeDatabaseOptions,
} from "./database.js";
export type {
  DatabaseHandle,
  DatabaseOptions,
  InternalKnowledgeMetadata,
  NormalizedDatabaseOptions,
} from "./database.js";
export {
  normalizeDatabaseSecurityContext,
  setDatabaseAccountProvisioningContext,
  setDatabaseAppealReviewContext,
  setDatabaseSecurityContext,
  setDatabaseSessionSecurityContext,
  setDatabaseTokenSecurityContext,
} from "./security-context.js";
export type {
  DatabaseAccountProvisioningContext,
  DatabaseAppealReviewSecurityContext,
  DatabaseSecurityContext,
  DatabaseTokenContextKind,
  DatabaseTokenSecurityContext,
  DatabaseSessionSecurityContext,
} from "./security-context.js";
export {
  createPostgresRateLimiter,
  normalizeSharedRateLimitOptions,
} from "./rate-limit-repository.js";
export type {
  NormalizedSharedRateLimitOptions,
  SharedRateLimitDecision,
  SharedRateLimitOptions,
} from "./rate-limit-repository.js";
export {
  accountInvitations,
  accountRecoveryRequests,
  accounts,
  aiSuggestions,
  assessmentIdempotency,
  assessmentResults,
  answerIdempotency,
  answers,
  appeals,
  appealReviewHistory,
  auditEntries,
  assessmentWorkflows,
  feedbackTickets,
  knowledgeDocuments,
  learningAssignments,
  sessions,
  contentVersions,
  contentEditorialRecords,
  contentReviewDecisions,
  diagnosticResults,
  learningActivityItems,
  rateLimitBuckets,
} from "./schema.js";
export type { KnowledgeDocument, NewKnowledgeDocument } from "./schema.js";
export {
  createAttemptUseCaseDependencies,
  createActivityScopeResolver,
  createParticipantScopeResolver,
  createOutboxInsert,
  attemptRowToState,
  attemptStateToRow,
  idempotencyRowToRecord,
  outboxEventToRow,
  validateOutboxPayload,
  PersistenceConflictError,
  PersistenceMappingError,
} from "./attempt-repository.js";
export type {
  AttemptInsertRow,
  AttemptRowShape,
  OutboxEventInput,
} from "./attempt-repository.js";
export {
  activityAssignments,
  attemptIdempotency,
  attempts,
  curriculumRuntimeStates,
  learningActivities,
  outboxEvents,
} from "./schema.js";
export type {
  PersistedAnswerSnapshot,
  PersistedAttemptSnapshot,
  PersistedCorrectionSnapshot,
  PersistedDiagnosticResult,
} from "./schema.js";
export {
  createLearningStateRepository,
  createAppealReadRepository,
  appealRowToState,
  appealStateToRow,
  assessmentWorkflowRowToState,
  assessmentWorkflowStateToRow,
  feedbackTicketRowToState,
  feedbackTicketStateToRow,
  learningAssignmentRowToState,
  learningAssignmentStateToRow,
  LearningStateMappingError,
  LearningStatePersistenceConflictError,
} from "./learning-state-repository.js";
export { createFeedbackTicketReadRepository } from "./feedback-ticket-read-repository.js";
export type { FeedbackTicketReadRepository } from "./feedback-ticket-read-repository.js";
export type {
  AppealReadRepository,
  AppealInsertRow,
  AppealRowShape,
  AssessmentWorkflowInsertRow,
  AssessmentWorkflowRowShape,
  FeedbackTicketInsertRow,
  FeedbackTicketRowShape,
  LearningAssignmentInsertRow,
  LearningAssignmentRowShape,
  LearningStateRepository,
  PersistenceContext,
  ScopedAppeal,
  ScopedAssessmentWorkflow,
  ScopedFeedbackTicket,
  ScopedLearningAssignment,
} from "./learning-state-repository.js";
export {
  answerIdempotencyRowToRecord,
  answerRowToState,
  answerStateToRow,
  createAnswerUseCaseDependencies,
} from "./answer-repository.js";
export type { AnswerInsertRow, AnswerRowShape } from "./answer-repository.js";
export {
  createSessionRepository,
  sessionRecordToRow,
  sessionRowToPrincipal,
} from "./session-repository.js";
export type {
  SessionInsertRow,
  SessionPrincipalRow,
} from "./session-repository.js";
export {
  activityRowsToState,
  createActivityReadRepository,
  createParticipantActivityItemResolver,
  reflectionRowsToState,
} from "./activity-repository.js";
export type {
  ActivityRowShape,
  ParticipantActivityItemResolver,
  ReflectionRowShape,
} from "./activity-repository.js";
export {
  ContentMappingError,
  createContentIndexSourceRepository,
  contentRowToRecord,
  createContentRepository,
  createContentUseCaseDependencies,
} from "./content-repository.js";
export type {
  ContentIndexSourcePort,
  ContentRowShape,
  IndexableContentRecord,
} from "./content-repository.js";
export {
  ProgressMappingError,
  createProgressReadRepository,
  progressRowToState,
} from "./progress-repository.js";
export type { ProgressRowShape } from "./progress-repository.js";
export {
  createCurriculumRuntimeRepository,
  curriculumRuntimeRowToState,
  curriculumRuntimeStateToRow,
  CurriculumRuntimeMappingError,
} from "./curriculum-runtime-repository.js";
export type {
  CurriculumRuntimeInsertRow,
  CurriculumRuntimeRowShape,
} from "./curriculum-runtime-repository.js";
export { createParticipantJourneyRepository } from "./journey-repository.js";
export { createContinuingEducationReportRepository } from "./continuing-education-report-repository.js";
export type { ContinuingEducationReportRepositoryOptions } from "./continuing-education-report-repository.js";
export { createDashboardReadRepository } from "./dashboard-repository.js";
export type { DashboardRepositoryOptions } from "./dashboard-repository.js";
export {
  createReflectionManagementReadRepository,
  reflectionManagementRowsToInstances,
} from "./reflection-management-repository.js";
export type {
  ReflectionManagementRepositoryOptions,
  ReflectionManagementRowShape,
} from "./reflection-management-repository.js";
export { createContentReviewQueueRepository } from "./content-review-queue-repository.js";
export { createAppealReviewQueueRepository } from "./appeal-review-queue-repository.js";
export { createAppealReviewHistoryRepository } from "./appeal-review-history-repository.js";
export { createAppealReviewTransitionRepository } from "./appeal-review-transition-repository.js";
export {
  createAppealRecalculationProcessor,
  createAppealRecalculationRepository,
} from "./appeal-recalculation-repository.js";
export {
  AccountRecoveryConflictError,
  createAccountRecoveryTransaction,
} from "./account-recovery-repository.js";
export {
  AccountManagementConflictError,
  accountStatusTransitionReason,
  createAccountManagementRepository,
} from "./account-management-repository.js";
export {
  createDiagnosticResultRepository,
  diagnosticResultRowToState,
  diagnosticResultStateToRow,
  DiagnosticResultMappingError,
} from "./diagnostic-result-repository.js";
export type {
  DiagnosticResultInsertRow,
  DiagnosticResultRowShape,
} from "./diagnostic-result-repository.js";
export {
  authoringRowToRecord,
  createAuthoringRepository,
} from "./authoring-repository.js";
export type { AuthoringRowShape } from "./authoring-repository.js";
export {
  OutboxMappingError,
  createOutboxRepository,
  outboxRowToRecord,
} from "./outbox-repository.js";
export type {
  OutboxEventRecord,
  OutboxRepositoryPort,
  OutboxStatus,
} from "./outbox-repository.js";
export { createAiSuggestionSink } from "./ai-suggestion-repository.js";
export type {
  AiSuggestionSinkPort,
  InternalAiSuggestion,
} from "./ai-suggestion-repository.js";
export {
  createInvitationUseCaseDependencies,
  invitationRecordToRow,
  invitationRowToRecord,
} from "./invitation-repository.js";
export type { InvitationRowShape } from "./invitation-repository.js";
export {
  AssessmentMappingError,
  assessmentIdempotencyRowToRecord,
  assessmentResultRowToState,
  assessmentResultStateToRow,
  createCorrectionReadRepository,
  createCorrectionUseCaseDependencies,
} from "./correction-repository.js";
export type { AssessmentResultRowShape } from "./correction-repository.js";
export { auditEntryToRow, createAuditRepository } from "./audit-repository.js";
export type { AuditInsertRow } from "./audit-repository.js";
