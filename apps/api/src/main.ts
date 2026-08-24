import { randomUUID } from "node:crypto";

import {
  authenticateSessionCookie,
  acceptAccountRecovery,
  assignCurriculumFromDiagnostic,
  changeAccountStatus,
  acceptInvitation,
  advanceContent,
  createAuthoringDraft,
  createAppealState,
  createAssessmentWorkflowState,
  createFeedbackTicketState,
  createLearningAssignmentState,
  createInvitation,
  correctOpenResponse,
  evaluateAndPersistDiagnosticDraft,
  evaluateAndPersistCurriculumModule,
  getParticipantActivity,
  getParticipantCurriculumRuntime,
  getAttemptFeedback,
  getParticipantLearningJourney,
  getParticipantProgress,
  getStaffDashboard,
  getContinuingEducationReport,
  getParticipantAppeals,
  getParticipantFeedback,
  getAuditTrail,
  getReflectionManagementReport,
  getContentReviewQueue,
  getAppealReviewQueue,
  getAppealReviewHistory,
  getFeedbackTriageQueue,
  getFeedbackTicketHistory,
  issueAccountRecovery,
  reviewAuthoringContent,
  saveAnswer,
  startAttempt,
  submitAttempt,
  transitionAppealReviewState,
  transitionAssessmentWorkflowState,
  transitionFeedbackTicketState,
  transitionLearningAssignmentState,
  revokeSessionCookie,
  resendAccountInvitation,
  rotateSession as rotateSessionCookie,
} from "@cvg/application";
import { loadRuntimeConfig } from "@cvg/config";
import {
  createServerIntegrations,
  type ServerIntegrationSet,
} from "@cvg/integrations";
import { createObservability } from "@cvg/observability";
import {
  createActivityScopeResolver,
  createAdaptiveAssignmentRepository,
  createActivityReadRepository,
  createAuthoringRepository,
  createAnswerUseCaseDependencies,
  createAttemptUseCaseDependencies,
  createContentUseCaseDependencies,
  createCorrectionUseCaseDependencies,
  createCorrectionReadRepository,
  createCurriculumRuntimeRepository,
  createInvitationUseCaseDependencies,
  createLearningStateRepository,
  createFeedbackTicketReadRepository,
  createPostgresRateLimiter,
  createProgressReadRepository,
  createParticipantJourneyRepository,
  createParticipantScopeResolver,
  createParticipantActivityItemResolver,
  createDashboardReadRepository,
  createDiagnosticResultRepository,
  createAccountManagementRepository,
  createAccountRecoveryTransaction,
  createAuditRepository,
  createAuditTrailRepository,
  createContinuingEducationReportRepository,
  createReflectionManagementReadRepository,
  createAppealReadRepository,
  createAppealReviewQueueRepository,
  createAppealReviewHistoryRepository,
  createAppealReviewTransitionRepository,
  createContentReviewQueueRepository,
  createFeedbackTriageQueueRepository,
  createFeedbackTicketHistoryRepository,
  createSessionRepository,
} from "@cvg/persistence";

import type { ApiHttpDependencies, ApiPrincipal } from "./http.js";
import type { ApiServer } from "./server.js";
import { createApiServer as createNodeApiServer } from "./server.js";

function configuredOrigins(
  environment: Record<string, string | undefined>,
): readonly string[] | undefined {
  const raw = environment.WEB_ORIGINS?.trim();
  if (raw === undefined || raw.length === 0) return undefined;
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return origins.length === 0 ? undefined : Object.freeze(origins);
}

export type ApiRuntimeOptions = Readonly<{
  readonly authenticate?: ApiHttpDependencies["authenticate"];
}>;

export function createApiRuntime(
  environment: Record<string, string | undefined>,
  options: ApiRuntimeOptions = {},
): Readonly<{
  service: "api";
  config: ReturnType<typeof loadRuntimeConfig>;
  integrations: ServerIntegrationSet;
  server: ApiServer;
  listen: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const config = loadRuntimeConfig(environment);
  const integrations = createServerIntegrations(config);
  const observability = createObservability({ service: "api" });
  const webOrigins = configuredOrigins(environment);
  const attemptDependencies = createAttemptUseCaseDependencies(
    integrations.database.db,
    randomUUID,
  );
  const answerDependencies = createAnswerUseCaseDependencies(
    integrations.database.db,
    randomUUID,
  );
  const contentDependencies = createContentUseCaseDependencies(
    integrations.database.db,
    randomUUID,
  );
  const correctionDependencies = createCorrectionUseCaseDependencies(
    integrations.database.db,
    randomUUID,
  );
  const correctionReadRepository = createCorrectionReadRepository(
    integrations.database.db,
  );
  const invitationDependencies = createInvitationUseCaseDependencies(
    integrations.database.db,
    randomUUID,
  );
  const sessionRepository = createSessionRepository(integrations.database.db);
  const activityReadRepository = createActivityReadRepository(
    integrations.database.db,
  );
  const progressReadRepository = createProgressReadRepository(
    integrations.database.db,
  );
  const curriculumRuntimeRepository = createCurriculumRuntimeRepository(
    integrations.database.db,
  );
  const participantJourneyRepository = createParticipantJourneyRepository(
    integrations.database.db,
  );
  const dashboardReadRepository = createDashboardReadRepository(
    integrations.database.db,
  );
  const continuingEducationReportRepository =
    createContinuingEducationReportRepository(integrations.database.db);
  const reflectionManagementReadRepository =
    createReflectionManagementReadRepository(integrations.database.db);
  const contentReviewQueueRepository = createContentReviewQueueRepository(
    integrations.database.db,
  );
  const feedbackTriageQueueRepository = createFeedbackTriageQueueRepository(
    integrations.database.db,
  );
  const feedbackTicketHistoryRepository = createFeedbackTicketHistoryRepository(
    integrations.database.db,
  );
  const diagnosticResultRepository = createDiagnosticResultRepository(
    integrations.database.db,
  );
  const adaptiveAssignmentRepository = createAdaptiveAssignmentRepository(
    integrations.database.db,
  );
  const accountManagementRepository = createAccountManagementRepository(
    integrations.database.db,
  );
  const accountRecoveryTransaction = createAccountRecoveryTransaction(
    integrations.database.db,
  );
  const authoringRepository = createAuthoringRepository(
    integrations.database.db,
  );
  const learningStateRepository = createLearningStateRepository(
    integrations.database.db,
  );
  const feedbackTicketReadRepository = createFeedbackTicketReadRepository(
    integrations.database.db,
  );
  const appealReadRepository = createAppealReadRepository(
    integrations.database.db,
  );
  const appealReviewQueueRepository = createAppealReviewQueueRepository(
    integrations.database.db,
  );
  const appealReviewHistoryRepository = createAppealReviewHistoryRepository(
    integrations.database.db,
  );
  const appealReviewTransitionRepository =
    createAppealReviewTransitionRepository(integrations.database.db);
  const rateLimiter = createPostgresRateLimiter(integrations.database.db);
  const audit = createAuditRepository(integrations.database.db);
  const auditTrailRepository = createAuditTrailRepository(
    integrations.database.db,
    { cursorSecret: config.auditCursorSecret },
  );
  const apiDependencies: ApiHttpDependencies = {
    requestIdFactory: randomUUID,
    observability,
    audit,
    ...(config.approvedClinicalApproverId === undefined
      ? {}
      : { approvedClinicalApproverId: config.approvedClinicalApproverId }),
    authenticate:
      options.authenticate ??
      (async (request) => {
        const principal = await authenticateSessionCookie(
          request.headers?.cookie,
          sessionRepository,
        );
        return principal === null
          ? null
          : ({
              principalId: principal.accountId,
              accountStatus: principal.accountStatus,
              roles: principal.roles,
              scopes: principal.scopes,
            } satisfies ApiPrincipal);
      }),
    resolveActivityScope: createActivityScopeResolver(integrations.database.db),
    hasParticipantActivityItem: createParticipantActivityItemResolver(
      integrations.database.db,
    ),
    isParticipantInScope: createParticipantScopeResolver(
      integrations.database.db,
    ),
    resolveAttempt: (attemptId, context) =>
      attemptDependencies.transaction.run(
        (operations) => operations.attemptsPort.findById(attemptId),
        context,
      ),
    createInvitation: (command) =>
      createInvitation(command, invitationDependencies),
    changeAccountStatus: (command) =>
      changeAccountStatus(command, {
        repository: accountManagementRepository,
        idFactory: randomUUID,
      }),
    resendAccountInvitation: (command) =>
      resendAccountInvitation(command, {
        repository: accountManagementRepository,
        idFactory: randomUUID,
      }),
    issueAccountRecovery: (command) =>
      issueAccountRecovery(command, {
        transaction: accountRecoveryTransaction,
        idFactory: randomUUID,
      }),
    acceptInvitation: (command) =>
      acceptInvitation(command, invitationDependencies),
    acceptAccountRecovery: (command) =>
      acceptAccountRecovery(command, {
        transaction: accountRecoveryTransaction,
        idFactory: randomUUID,
      }),
    revokeSession: (cookieHeader) =>
      revokeSessionCookie(cookieHeader, sessionRepository),
    rotateSession: (cookieHeader, expiresInSeconds) =>
      rotateSessionCookie(
        cookieHeader,
        { expiresInSeconds },
        sessionRepository,
      ),
    createLearningAssignment: (command) =>
      createLearningAssignmentState(command, learningStateRepository),
    assignCurriculumFromDiagnostic: (command) =>
      assignCurriculumFromDiagnostic(
        command,
        diagnosticResultRepository,
        adaptiveAssignmentRepository,
      ),
    transitionLearningAssignment: (command) =>
      transitionLearningAssignmentState(command, learningStateRepository),
    createAssessmentWorkflow: (command) =>
      createAssessmentWorkflowState(command, learningStateRepository),
    transitionAssessmentWorkflow: (command) =>
      transitionAssessmentWorkflowState(command, learningStateRepository),
    createFeedbackTicket: (command) =>
      createFeedbackTicketState(command, learningStateRepository),
    getParticipantFeedback: (command) =>
      getParticipantFeedback(command, feedbackTicketReadRepository),
    transitionFeedbackTicket: (command) =>
      transitionFeedbackTicketState(command, learningStateRepository),
    resolveFeedbackTicketParticipant: (ticketId, scopeId) =>
      feedbackTriageQueueRepository.findFeedbackTicketParticipant(
        ticketId,
        scopeId,
      ),
    createAppeal: (command) =>
      createAppealState(command, learningStateRepository),
    getParticipantAppeals: (command) =>
      getParticipantAppeals(command, appealReadRepository),
    transitionAppealReview: (command) =>
      transitionAppealReviewState(command, appealReviewTransitionRepository),
    getParticipantActivity: (participantId, activityId) =>
      getParticipantActivity(
        { participantId, activityId },
        activityReadRepository,
      ),
    advanceContent: (command) => advanceContent(command, contentDependencies),
    createAuthoringDraft: (command) =>
      createAuthoringDraft(command, {
        repository: authoringRepository,
        idFactory: randomUUID,
      }),
    getInternalAuthoringRecord: (contentId, version, scopeId) =>
      authoringRepository.find(contentId, version, scopeId),
    reviewAuthoringContent: (command) =>
      reviewAuthoringContent(command, {
        repository: authoringRepository,
        transition: (transitionCommand) =>
          advanceContent(transitionCommand, contentDependencies),
      }),
    getParticipantProgress: (participantId, activityId) =>
      getParticipantProgress(
        { participantId, activityId },
        progressReadRepository,
      ),
    getParticipantLearningJourney: (participantId, scopeIds) =>
      getParticipantLearningJourney(
        { participantId, scopeIds },
        participantJourneyRepository,
      ),
    evaluateDiagnosticDraft: (command) =>
      evaluateAndPersistDiagnosticDraft(command, diagnosticResultRepository),
    getStaffDashboard: (principalId, scopeIds) =>
      getStaffDashboard({ principalId, scopeIds }, dashboardReadRepository),
    getContinuingEducationReport: (principalId, query) =>
      getContinuingEducationReport(
        { principalId, query },
        continuingEducationReportRepository,
      ),
    getReflectionManagementReport: (principalId, query) =>
      getReflectionManagementReport(
        { principalId, query },
        reflectionManagementReadRepository,
      ),
    getContentReviewQueue: (command) =>
      getContentReviewQueue(command, contentReviewQueueRepository),
    getAppealReviewQueue: (command) =>
      getAppealReviewQueue(command, appealReviewQueueRepository),
    getFeedbackTriageQueue: (command) =>
      getFeedbackTriageQueue(command, feedbackTriageQueueRepository),
    getFeedbackTicketHistory: (command) =>
      getFeedbackTicketHistory(command, feedbackTicketHistoryRepository),
    getAppealReviewHistory: (command) =>
      getAppealReviewHistory(command, appealReviewHistoryRepository),
    getAuditTrail: (command) => getAuditTrail(command, auditTrailRepository),
    getParticipantCurriculumRuntime: (participantId, moduleId) =>
      getParticipantCurriculumRuntime(
        { participantId, moduleId },
        curriculumRuntimeRepository,
      ),
    evaluateCurriculumRuntime: (command) =>
      evaluateAndPersistCurriculumModule(command, curriculumRuntimeRepository),
    getAttemptFeedback: (participantId, attemptId) =>
      getAttemptFeedback(
        { participantId, attemptId },
        correctionReadRepository,
      ),
    correctOpenResponse: (command) =>
      correctOpenResponse(command, correctionDependencies),
    startAttempt: (command) => startAttempt(command, attemptDependencies),
    saveAnswer: (command) => saveAnswer(command, answerDependencies),
    submitAttempt: (command) => submitAttempt(command, attemptDependencies),
    healthcheck: integrations.healthcheck,
    dependencyStatus: integrations.dependencyStatus,
  };
  const server = createNodeApiServer(apiDependencies, {
    host: environment.API_HOST ?? "127.0.0.1",
    port: environment.API_PORT ? Number(environment.API_PORT) : 3000,
    ...(webOrigins === undefined ? {} : { allowedOrigins: webOrigins }),
    rateLimiter,
  });

  return Object.freeze({
    service: "api" as const,
    config,
    integrations,
    server,
    listen: async () => {
      await integrations.initialize();
      await server.listen();
    },
    close: async () => {
      await server.close();
      await integrations.close();
    },
  });
}

if (process.env.NODE_ENV !== "test") {
  const runtime = createApiRuntime(process.env);
  void runtime.listen().catch(() => {
    process.exitCode = 1;
  });
}
