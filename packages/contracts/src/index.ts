export {
  assertPublicProjection,
  PUBLIC_FORBIDDEN_FIELDS,
} from "./public-boundary.js";
export {
  createAttemptRequestSchema,
  parseParticipantAttempt,
  participantAttemptProjectionSchema,
  saveAnswerRequestSchema,
  submitAttemptRequestSchema,
} from "./assessment.js";
export type {
  CreateAttemptRequest,
  ParticipantAttemptProjection,
  SaveAnswerRequest,
  SubmitAttemptRequest,
} from "./assessment.js";
export {
  digitalCaseAdvanceRequestSchema,
  digitalCaseScopeQuerySchema,
  curriculumRuntimeEvaluationRequestSchema,
  parseParticipantDigitalCaseRuntime,
  parseParticipantActivity,
  parseParticipantCurriculumRuntime,
  participantActivityProjectionSchema,
  participantCurriculumRuntimeProjectionSchema,
  participantDigitalCaseRuntimeProjectionSchema,
} from "./learning.js";
export type {
  CurriculumRuntimeEvaluationRequest,
  DigitalCaseAdvanceRequest,
  ParticipantActivityProjection,
  ParticipantCurriculumRuntimeProjection,
  ParticipantDigitalCaseRuntimeProjection,
} from "./learning.js";
export { contentTransitionRequestSchema } from "./content.js";
export type { ContentTransitionRequest } from "./content.js";
export {
  authoringPublicationRequestSchema,
  authoringReviewRequestSchema,
  clinicalReviewQueueQuerySchema,
  clinicalReviewQueuePageSchema,
  internalAuthoringRecordProjectionSchema,
  parseClinicalReviewQueuePage,
  parseInternalAuthoringRecordProjection,
} from "./authoring.js";
export type {
  AuthoringPublicationRequest,
  ClinicalReviewQueuePage,
  ClinicalReviewQueueQuery,
  InternalAuthoringRecordProjection,
} from "./authoring.js";
export {
  correctOpenResponseRequestSchema,
  correctionResultProjectionSchema,
} from "./correction.js";
export type { CorrectOpenResponseRequest } from "./correction.js";
export {
  operationalAiConfirmationProjectionSchema,
  operationalAiConfirmationRequestSchema,
  operationalAiProposalProjectionSchema,
  operationalAiProposalRequestSchema,
} from "./operational-ai.js";
export type {
  OperationalAiConfirmationRequest,
  OperationalAiProposalProjection,
  OperationalAiProposalRequest,
} from "./operational-ai.js";
export {
  observedItemStatisticsProjectionSchema,
  observedItemStatisticsRequestSchema,
  parseObservedItemStatistics,
} from "./item-statistics.js";
export type { ObservedItemStatisticsProjection } from "./item-statistics.js";
export {
  parseSourceConflictDecision,
  sourceConflictDecisionProjectionSchema,
  sourceConflictDecisionRequestSchema,
} from "./source-conflict.js";
export type {
  SourceConflictDecisionProjection,
  SourceConflictDecisionRequest,
} from "./source-conflict.js";
export {
  assessmentRecalculationBatchRequestSchema,
  assessmentRecalculationCandidateSchema,
  assessmentRecalculationRequestSchema,
  assessmentRecalculationResultSchema,
  parseAssessmentRecalculationResult,
} from "./assessment-recalculation.js";
export type {
  AssessmentRecalculationBatchRequest,
  AssessmentRecalculationCandidateRequest,
  AssessmentRecalculationRequest,
  AssessmentRecalculationResult,
} from "./assessment-recalculation.js";
export {
  maintenanceWindowDecisionSchema,
  maintenanceWindowRequestSchema,
} from "./maintenance-window.js";
export type {
  MaintenanceWindowDecision,
  MaintenanceWindowRequest,
} from "./maintenance-window.js";
export {
  moderatorDashboardProjectionSchema,
  parseModeratorDashboard,
} from "./moderator-dashboard.js";
export type { ModeratorDashboardProjection } from "./moderator-dashboard.js";
export {
  acceptInvitationRequestSchema,
  createInvitationRequestSchema,
} from "./invitation.js";
export type {
  AcceptInvitationRequest,
  CreateInvitationRequest,
} from "./invitation.js";
export {
  activeSessionProjectionSchema,
  loginRequestSchema,
  passwordUpdateRequestSchema,
} from "./auth.js";
export type { LoginRequest, PasswordUpdateRequest } from "./auth.js";
export {
  parseParticipantProgress,
  participantProgressProjectionSchema,
} from "./progress.js";
export type { ParticipantProgressProjection } from "./progress.js";
export { rotateSessionRequestSchema } from "./session.js";
export type { RotateSessionRequest } from "./session.js";
export {
  appealCreateRequestSchema,
  appealScopedTransitionRequestSchema,
  appealTransitionRequestSchema,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowScopedTransitionRequestSchema,
  assessmentWorkflowTransitionRequestSchema,
  feedbackTicketCreateRequestSchema,
  feedbackTicketListProjectionSchema,
  feedbackTicketListQuerySchema,
  feedbackTicketParticipantCreateRequestSchema,
  feedbackTechnicalContextSchema,
  feedbackTicketScopedTransitionRequestSchema,
  feedbackTicketTransitionRequestSchema,
  internalFeedbackTicketProjectionSchema,
  learningAssignmentCreateRequestSchema,
  learningAssignmentScopedTransitionRequestSchema,
  learningAssignmentTransitionRequestSchema,
  participantAppealProjectionSchema,
  participantAssessmentWorkflowProjectionSchema,
  participantFeedbackTicketProjectionSchema,
  participantLearningAssignmentProjectionSchema,
} from "./learning-state.js";
export type {
  AppealCreateRequest,
  AppealScopedTransitionRequest,
  AppealTransitionRequest,
  AssessmentWorkflowCreateRequest,
  AssessmentWorkflowScopedTransitionRequest,
  AssessmentWorkflowTransitionRequest,
  FeedbackTicketCreateRequest,
  FeedbackTicketListProjection,
  FeedbackTicketListQuery,
  FeedbackTicketParticipantCreateRequest,
  FeedbackTechnicalContext,
  FeedbackTicketScopedTransitionRequest,
  FeedbackTicketTransitionRequest,
  InternalFeedbackTicketProjection,
  LearningAssignmentCreateRequest,
  LearningAssignmentScopedTransitionRequest,
  LearningAssignmentTransitionRequest,
  ParticipantAppealProjection,
  ParticipantAssessmentWorkflowProjection,
  ParticipantFeedbackTicketProjection,
  ParticipantLearningAssignmentProjection,
} from "./learning-state.js";
export {
  parseParticipantLearningJourney,
  participantLearningJourneyProjectionSchema,
} from "./journey.js";
export type { ParticipantLearningJourneyProjection } from "./journey.js";
export {
  accountActionRequestSchema,
  accountOperationProjectionSchema,
  accountVerificationRequestSchema,
} from "./account.js";
export type {
  AccountOperationProjection,
  AccountVerificationRequest,
} from "./account.js";
export {
  accountSecurityProjectionSchema,
  operationsDashboardProjectionSchema,
  parseAccountSecurity,
  parseOperationsDashboard,
  parseParticipantDashboard,
  participantDashboardProjectionSchema,
} from "./dashboard.js";
export type {
  AccountSecurityProjection,
  OperationsDashboardProjection,
  ParticipantDashboardProjection,
} from "./dashboard.js";
export {
  adminDashboardProjectionSchema,
  parseAdminDashboard,
} from "./admin-dashboard.js";
export type { AdminDashboardProjection } from "./admin-dashboard.js";
export {
  adminOperationsDashboardProjectionSchema,
  parseAdminOperationsDashboard,
} from "./admin-operations-dashboard.js";
export type { AdminOperationsDashboardProjection } from "./admin-operations-dashboard.js";
export { auditTrailProjectionSchema, parseAuditTrail } from "./audit.js";
export type { AuditEntryProjection, AuditTrailProjection } from "./audit.js";
export {
  accountManagementListQuerySchema,
  accountManagementUpdateRequestSchema,
  managedAccountPageProjectionSchema,
  accountSessionRevokeRequestSchema,
  revokedAccountSessionsProjectionSchema,
} from "./account-management.js";
export type {
  AccountManagementListQuery,
  AccountManagementUpdateRequest,
  ManagedAccountPageProjection,
  ManagedAccountProjection,
  AccountSessionRevokeRequest,
  RevokedAccountSessionsProjection,
} from "./account-management.js";
export {
  apiErrorCodeSchema,
  apiErrorResponse,
  apiSuccessResponse,
  parsePaginationQuery,
} from "./api.js";
export type {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  PaginationQuery,
} from "./api.js";
export {
  API_SURFACE,
  materializeApiSurfacePath,
  validateApiSurface,
} from "./api-surface.js";
export type {
  ApiSurfaceAuth,
  ApiSurfaceMethod,
  ApiSurfaceRoute,
  ApiSurfaceScope,
} from "./api-surface.js";
