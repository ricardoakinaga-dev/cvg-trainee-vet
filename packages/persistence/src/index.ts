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
  setDatabaseSecurityContext,
} from "./security-context.js";
export type { DatabaseSecurityContext } from "./security-context.js";
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
  accounts,
  aiSuggestions,
  assessmentIdempotency,
  assessmentResults,
  answerIdempotency,
  answers,
  appeals,
  auditEntries,
  assessmentWorkflows,
  feedbackTickets,
  knowledgeDocuments,
  learningAssignments,
  sessions,
  contentVersions,
  contentEditorialRecords,
  contentReviewDecisions,
  learningActivityItems,
  rateLimitBuckets,
} from "./schema.js";
export type { KnowledgeDocument, NewKnowledgeDocument } from "./schema.js";
export {
  createAttemptUseCaseDependencies,
  createActivityScopeResolver,
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
} from "./schema.js";
export {
  createLearningStateRepository,
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
export type {
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
} from "./activity-repository.js";
export type { ActivityRowShape } from "./activity-repository.js";
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
export {
  authoringRowToRecord,
  createAuthoringRepository,
} from "./authoring-repository.js";
export type { AuthoringRowShape } from "./authoring-repository.js";
export { createClinicalReviewQueueRepository } from "./clinical-review-queue-repository.js";
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
export { createPasswordAuthUseCaseDependencies } from "./password-auth-repository.js";
