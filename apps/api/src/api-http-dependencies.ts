import { randomUUID } from "node:crypto";

import {
  acceptInvitation,
  authenticateSessionCookie,
  advanceContent,
  advanceParticipantDigitalCase,
  createAppealState,
  createAssessmentWorkflowState,
  createAuditEntry,
  createFeedbackTicketState,
  createInvitation,
  createLearningAssignmentState,
  correctOpenResponse,
  evaluateAndPersistCurriculumModule,
  getAttemptFeedback,
  getInternalAdminDashboard,
  getInternalAdminOperationsDashboard,
  getInternalModeratorDashboard,
  getParticipantActivity,
  getParticipantCurriculumRuntime,
  getParticipantDigitalCase,
  getParticipantLearningJourney,
  getParticipantProgress,
  listAuditEntries,
  listFeedbackTicketStates,
  listManagedAccounts,
  loginWithPassword,
  publishAuthoringContent,
  recalculateAffectedAssessments,
  recordObservedItemStatistics,
  recordSourceConflictDecision,
  registerAssessmentRecalculationCandidates,
  revokeManagedAccountSessions,
  revokeSessionCookie,
  reviewAuthoringContent,
  rotateSession as rotateSessionCookie,
  runOperationalAiProposal,
  saveAnswer,
  setAccountPassword,
  startAttempt,
  submitAttempt,
  transitionAppealState,
  transitionAssessmentWorkflowState,
  transitionFeedbackTicketState,
  transitionLearningAssignmentState,
  updateManagedAccount,
} from "@cvg/application";
import type { RuntimeConfig } from "@cvg/config";
import { confirmOperationalAiProposal as confirmOperationalAiProposalPolicy } from "@cvg/domain";

import type { ApiHttpDependencies, ApiPrincipal } from "./http.js";
import type { ApiRuntimeResources } from "./api-runtime-resources.js";

function createAccessDependencies(
  resources: ApiRuntimeResources,
  authenticate: ApiHttpDependencies["authenticate"] | undefined,
  config: RuntimeConfig,
) {
  const {
    accountManagementDependencies,
    activityScopeResolver,
    attemptDependencies,
    invitationDependencies,
    passwordAuthDependencies,
    sessionRepository,
  } = resources;

  return {
    requestIdFactory: randomUUID,
    observability: resources.observability,
    ...(config.metricsScrapeToken === undefined
      ? {}
      : { metricsScrapeToken: config.metricsScrapeToken }),
    authenticate:
      authenticate ??
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
    resolveActivityScope: activityScopeResolver,
    resolveAttempt: (attemptId, context) =>
      attemptDependencies.transaction.run(
        (operations) => operations.attemptsPort.findById(attemptId),
        context,
      ),
    createInvitation: (command) =>
      createInvitation(command, invitationDependencies),
    acceptInvitation: (command) =>
      acceptInvitation(command, invitationDependencies),
    listManagedAccounts: (command) =>
      listManagedAccounts(command, accountManagementDependencies),
    updateManagedAccount: (command) =>
      updateManagedAccount(command, accountManagementDependencies),
    revokeManagedAccountSessions: (command) =>
      revokeManagedAccountSessions(command, accountManagementDependencies),
    loginWithPassword: (command) =>
      loginWithPassword(command, passwordAuthDependencies),
    setAccountPassword: (command) =>
      setAccountPassword(command, passwordAuthDependencies),
    revokeSession: (cookieHeader) =>
      revokeSessionCookie(cookieHeader, sessionRepository),
    rotateSession: (cookieHeader, expiresInSeconds) =>
      rotateSessionCookie(
        cookieHeader,
        { expiresInSeconds },
        sessionRepository,
      ),
  } satisfies Partial<ApiHttpDependencies>;
}

function createLearningStateDependencies(resources: ApiRuntimeResources) {
  const { auditRepository, learningStateRepository } = resources;
  return {
    createLearningAssignment: (
      command: Parameters<typeof createLearningAssignmentState>[0],
    ) => createLearningAssignmentState(command, learningStateRepository),
    transitionLearningAssignment: (
      command: Parameters<typeof transitionLearningAssignmentState>[0],
    ) => transitionLearningAssignmentState(command, learningStateRepository),
    createAssessmentWorkflow: (
      command: Parameters<typeof createAssessmentWorkflowState>[0],
    ) => createAssessmentWorkflowState(command, learningStateRepository),
    transitionAssessmentWorkflow: (
      command: Parameters<typeof transitionAssessmentWorkflowState>[0],
    ) => transitionAssessmentWorkflowState(command, learningStateRepository),
    createFeedbackTicket: (
      command: Parameters<typeof createFeedbackTicketState>[0],
    ) => createFeedbackTicketState(command, learningStateRepository),
    transitionFeedbackTicket: (
      command: Parameters<typeof transitionFeedbackTicketState>[0],
    ) => transitionFeedbackTicketState(command, learningStateRepository),
    listFeedbackTickets: (
      context: Parameters<typeof listFeedbackTicketStates>[0],
    ) =>
      listFeedbackTicketStates(context, {
        list: learningStateRepository.listFeedbackTickets,
      }),
    recordFeedbackSafetyEvent: async ({
      principalId,
      scopeId,
      ticketId,
      requestId,
      action,
    }: Parameters<
      NonNullable<ApiHttpDependencies["recordFeedbackSafetyEvent"]>
    >[0]) =>
      auditRepository.append(
        createAuditEntry({
          auditId: randomUUID(),
          principalId,
          action: `FEEDBACK_${action}`,
          resourceType: "feedback_ticket",
          resourceId: ticketId,
          scopeId,
          outcome: "SUCCESS",
          reasonCode: "feedback_content_safety",
          requestId,
          correlationId: requestId,
          occurredAt: new Date().toISOString(),
        }),
      ),
    createAppeal: (command: Parameters<typeof createAppealState>[0]) =>
      createAppealState(command, learningStateRepository),
    transitionAppeal: (command: Parameters<typeof transitionAppealState>[0]) =>
      transitionAppealState(command, learningStateRepository),
  };
}

function createContentDependencies(resources: ApiRuntimeResources) {
  const {
    authoringRepository,
    authoringTransaction,
    clinicalReviewQueueRepository,
    contentDependencies,
    identityProvider,
  } = resources;
  return {
    advanceContent: (command: Parameters<typeof advanceContent>[0]) =>
      advanceContent(command, contentDependencies),
    getInternalAuthoringRecord: (contentId: string, version: number) =>
      authoringRepository.find(contentId, version),
    getClinicalReviewQueue: (
      scopeId: string,
      query: Parameters<
        typeof clinicalReviewQueueRepository.listClinicalReviewQueue
      >[1],
    ) => clinicalReviewQueueRepository.listClinicalReviewQueue(scopeId, query),
    publishAuthoringContent: (
      command: Parameters<typeof publishAuthoringContent>[0],
    ) =>
      publishAuthoringContent(command, {
        repository: authoringRepository,
        transition: (transitionCommand) =>
          advanceContent(transitionCommand, contentDependencies),
        transaction: authoringTransaction,
      }),
    reviewAuthoringContent: (
      command: Parameters<typeof reviewAuthoringContent>[0],
    ) =>
      reviewAuthoringContent(command, {
        repository: authoringRepository,
        transition: (transitionCommand) =>
          advanceContent(transitionCommand, contentDependencies),
        idFactory: randomUUID,
        transaction: authoringTransaction,
      }),
    identityProvider,
    getAccountSecurity: async (principalId: string) => {
      const status = await identityProvider.getSecurityStatus(principalId);
      return Object.freeze({ ...status, session: "ACTIVE" as const });
    },
  };
}

function createJourneyDependencies(resources: ApiRuntimeResources) {
  const {
    activityReadRepository,
    adminOperationsRepository,
    moderatorDashboardRepository,
    participantJourneyRepository,
    progressReadRepository,
    trainingParticipantRepository,
  } = resources;
  const readJourney = (participantId: string, scopeIds: readonly string[]) =>
    getParticipantLearningJourney(
      { participantId, scopeIds },
      participantJourneyRepository,
    );

  return {
    getParticipantActivity: (participantId: string, activityId: string) =>
      getParticipantActivity(
        { participantId, activityId },
        activityReadRepository,
      ),
    getParticipantProgress: (participantId: string, activityId: string) =>
      getParticipantProgress(
        { participantId, activityId },
        progressReadRepository,
      ),
    getParticipantLearningJourney: readJourney,
    getInternalAdminDashboard: (scopeIds: readonly string[]) =>
      getInternalAdminDashboard(scopeIds, {
        listParticipants: trainingParticipantRepository.listParticipants,
        getParticipantLearningJourney: readJourney,
      }),
    getInternalAdminOperationsDashboard: (scopeIds: readonly string[]) =>
      getInternalAdminOperationsDashboard(scopeIds, {
        getAdminDashboard: (requestedScopeIds) =>
          getInternalAdminDashboard(requestedScopeIds, {
            listParticipants: trainingParticipantRepository.listParticipants,
            getParticipantLearningJourney: readJourney,
          }),
        readSignals: (requestedScopeIds, now) =>
          adminOperationsRepository.readSignals(requestedScopeIds, now),
      }),
    getInternalModeratorDashboard: (
      moderatorId: string,
      scopeIds: readonly string[],
    ) =>
      getInternalModeratorDashboard(moderatorId, scopeIds, {
        listAssignedWork: moderatorDashboardRepository.listAssignedWork,
        getParticipantLearningJourney: readJourney,
      }),
  };
}

function createOperationalDependencies(
  resources: ApiRuntimeResources,
  config: RuntimeConfig,
) {
  const {
    assessmentRecalculationRepository,
    itemStatisticsRepository,
    operationalAi,
    sourceConflictDecisionRepository,
  } = resources;
  return {
    ...(operationalAi === null
      ? {}
      : {
          runOperationalAiProposal: (
            command: Omit<
              Parameters<typeof runOperationalAiProposal>[0],
              "costCeilingUsd"
            >,
          ) =>
            runOperationalAiProposal(
              {
                ...command,
                costCeilingUsd: config.operationalAiCostCeilingUsd,
              },
              operationalAi,
            ),
        }),
    confirmOperationalAiProposal: (
      proposal: Parameters<typeof confirmOperationalAiProposalPolicy>[0],
      confirmation: Parameters<typeof confirmOperationalAiProposalPolicy>[1],
    ) => confirmOperationalAiProposalPolicy(proposal, confirmation),
    recordObservedItemStatistics: (
      input: Parameters<typeof recordObservedItemStatistics>[0],
    ) => recordObservedItemStatistics(input, itemStatisticsRepository),
    recordSourceConflictDecision: (
      command: Parameters<typeof recordSourceConflictDecision>[0],
    ) =>
      recordSourceConflictDecision(command, {
        transaction: sourceConflictDecisionRepository.transaction,
      }),
    registerAssessmentRecalculationCandidates: (
      command: Parameters<typeof registerAssessmentRecalculationCandidates>[0],
    ) =>
      registerAssessmentRecalculationCandidates(
        command,
        assessmentRecalculationRepository,
      ),
    recalculateAffectedAssessments: (
      command: Parameters<typeof recalculateAffectedAssessments>[0],
    ) =>
      recalculateAffectedAssessments(
        command,
        assessmentRecalculationRepository,
      ),
    listAuditEntries: () => listAuditEntries(resources.auditRepository),
  };
}

function createCurriculumDependencies(resources: ApiRuntimeResources) {
  const { curriculumRuntimeRepository, digitalCaseRuntimeRepository } =
    resources;
  return {
    getParticipantCurriculumRuntime: (
      participantId: string,
      moduleId: string,
    ) =>
      getParticipantCurriculumRuntime(
        { participantId, moduleId },
        curriculumRuntimeRepository,
      ),
    evaluateCurriculumRuntime: (
      command: Parameters<typeof evaluateAndPersistCurriculumModule>[0],
    ) =>
      evaluateAndPersistCurriculumModule(command, curriculumRuntimeRepository),
    getParticipantDigitalCase: (
      command: Parameters<typeof getParticipantDigitalCase>[0],
    ) => getParticipantDigitalCase(command, digitalCaseRuntimeRepository),
    advanceParticipantDigitalCase: (
      command: Parameters<typeof advanceParticipantDigitalCase>[0],
    ) => advanceParticipantDigitalCase(command, digitalCaseRuntimeRepository),
  };
}

function createAttemptDependencies(resources: ApiRuntimeResources) {
  const {
    answerDependencies,
    attemptDependencies,
    correctionDependencies,
    correctionReadRepository,
  } = resources;
  return {
    getAttemptFeedback: (participantId: string, attemptId: string) =>
      getAttemptFeedback(
        { participantId, attemptId },
        correctionReadRepository,
      ),
    correctOpenResponse: (command: Parameters<typeof correctOpenResponse>[0]) =>
      correctOpenResponse(command, correctionDependencies),
    startAttempt: (command: Parameters<typeof startAttempt>[0]) =>
      startAttempt(command, attemptDependencies),
    saveAnswer: (command: Parameters<typeof saveAnswer>[0]) =>
      saveAnswer(command, answerDependencies),
    submitAttempt: (command: Parameters<typeof submitAttempt>[0]) =>
      submitAttempt(command, attemptDependencies),
  };
}

function createHealthDependencies(resources: ApiRuntimeResources) {
  return {
    healthcheck: resources.integrations.healthcheck,
    dependencyStatus: resources.integrations.dependencyStatus,
  };
}

export function createApiHttpDependencies(
  config: RuntimeConfig,
  resources: ApiRuntimeResources,
  authenticate?: ApiHttpDependencies["authenticate"],
): ApiHttpDependencies {
  return {
    ...createAccessDependencies(resources, authenticate, config),
    ...createLearningStateDependencies(resources),
    ...createContentDependencies(resources),
    ...createJourneyDependencies(resources),
    ...createOperationalDependencies(resources, config),
    ...createCurriculumDependencies(resources),
    ...createAttemptDependencies(resources),
    ...createHealthDependencies(resources),
  } satisfies ApiHttpDependencies;
}
