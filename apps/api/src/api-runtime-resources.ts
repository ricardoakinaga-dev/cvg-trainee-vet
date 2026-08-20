import { randomUUID } from "node:crypto";

import {
  createHttpIdentityProvider,
  createUnavailableIdentityProvider,
} from "@cvg/application";
import type { RuntimeConfig } from "@cvg/config";
import {
  createServerIntegrations,
  type ServerIntegrationSet,
} from "@cvg/integrations";
import {
  createObservability,
  createOtlpHttpTraceSink,
} from "@cvg/observability";
import {
  createActivityScopeResolver,
  createActivityReadRepository,
  createAccountManagementUseCaseDependencies,
  createAnswerUseCaseDependencies,
  createAssessmentRecalculationRepository,
  createAttemptUseCaseDependencies,
  createAuditRepository,
  createAuthoringRepository,
  createClinicalReviewQueueRepository,
  createContentUseCaseDependencies,
  createCorrectionReadRepository,
  createCorrectionUseCaseDependencies,
  createCurriculumRuntimeRepository,
  createDigitalCaseRuntimeRepository,
  createInvitationUseCaseDependencies,
  createItemStatisticsRepository,
  createLearningStateRepository,
  createModeratorDashboardRepository,
  createAdminOperationsRepository,
  createAuthoringTransactionPort,
  createPasswordAuthUseCaseDependencies,
  createParticipantJourneyRepository,
  createPostgresRateLimiter,
  createProgressReadRepository,
  createSessionRepository,
  createSourceConflictDecisionRepository,
  createTrainingParticipantRepository,
} from "@cvg/persistence";

type Database = ServerIntegrationSet["database"]["db"];

function createCoreResources(database: Database) {
  return Object.freeze({
    attemptDependencies: createAttemptUseCaseDependencies(database, randomUUID),
    answerDependencies: createAnswerUseCaseDependencies(database, randomUUID),
    contentDependencies: createContentUseCaseDependencies(database, randomUUID),
    correctionDependencies: createCorrectionUseCaseDependencies(
      database,
      randomUUID,
    ),
    correctionReadRepository: createCorrectionReadRepository(database),
    invitationDependencies: createInvitationUseCaseDependencies(
      database,
      randomUUID,
    ),
    passwordAuthDependencies: createPasswordAuthUseCaseDependencies(
      database,
      randomUUID,
    ),
    accountManagementDependencies: createAccountManagementUseCaseDependencies(
      database,
      randomUUID,
    ),
    sessionRepository: createSessionRepository(database),
  });
}

function createParticipantResources(database: Database) {
  return Object.freeze({
    activityScopeResolver: createActivityScopeResolver(database),
    activityReadRepository: createActivityReadRepository(database),
    progressReadRepository: createProgressReadRepository(database),
    curriculumRuntimeRepository: createCurriculumRuntimeRepository(database),
    digitalCaseRuntimeRepository: createDigitalCaseRuntimeRepository(database),
    participantJourneyRepository: createParticipantJourneyRepository(database),
    trainingParticipantRepository:
      createTrainingParticipantRepository(database),
    moderatorDashboardRepository: createModeratorDashboardRepository(database),
  });
}

function createWorkflowResources(database: Database) {
  return Object.freeze({
    adminOperationsRepository: createAdminOperationsRepository(database),
    itemStatisticsRepository: createItemStatisticsRepository(database),
    sourceConflictDecisionRepository:
      createSourceConflictDecisionRepository(database),
    assessmentRecalculationRepository:
      createAssessmentRecalculationRepository(database),
    authoringRepository: createAuthoringRepository(database),
    authoringTransaction: createAuthoringTransactionPort(database, randomUUID),
    clinicalReviewQueueRepository:
      createClinicalReviewQueueRepository(database),
    learningStateRepository: createLearningStateRepository(database),
    auditRepository: createAuditRepository(database),
    rateLimiter: createPostgresRateLimiter(database),
  });
}

function createRuntimeServices(
  config: RuntimeConfig,
  integrations: ServerIntegrationSet,
) {
  const identityProvider = config.identityProvider.configured
    ? createHttpIdentityProvider({
        baseUrl: config.identityProvider.url,
        bearerToken: config.identityProvider.token,
      })
    : createUnavailableIdentityProvider();
  const observability = createObservability({
    service: "api",
    ...(config.observability.configured
      ? {
          traceSink: createOtlpHttpTraceSink(config.observability.otlpEndpoint),
        }
      : {}),
  });

  return Object.freeze({
    identityProvider,
    observability,
    operationalAi: integrations.ai,
  });
}

export function createApiRuntimeResources(config: RuntimeConfig) {
  const integrations = createServerIntegrations(config);
  const database = integrations.database.db;

  return Object.freeze({
    integrations,
    ...createRuntimeServices(config, integrations),
    ...createCoreResources(database),
    ...createParticipantResources(database),
    ...createWorkflowResources(database),
  });
}

export type ApiRuntimeResources = ReturnType<typeof createApiRuntimeResources>;
