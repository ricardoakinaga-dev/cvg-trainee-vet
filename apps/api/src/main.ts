import { randomUUID } from "node:crypto";

import {
  authenticateSessionCookie,
  acceptInvitation,
  advanceContent,
  createAppealState,
  createAssessmentWorkflowState,
  createFeedbackTicketState,
  createLearningAssignmentState,
  createInvitation,
  correctOpenResponse,
  evaluateAndPersistCurriculumModule,
  getParticipantActivity,
  getParticipantCurriculumRuntime,
  getAttemptFeedback,
  getParticipantLearningJourney,
  getParticipantProgress,
  createHttpIdentityProvider,
  createUnavailableIdentityProvider,
  publishAuthoringContent,
  saveAnswer,
  startAttempt,
  submitAttempt,
  transitionAppealState,
  transitionAssessmentWorkflowState,
  transitionFeedbackTicketState,
  transitionLearningAssignmentState,
  revokeSessionCookie,
  rotateSession as rotateSessionCookie,
} from "@cvg/application";
import { loadRuntimeConfig } from "@cvg/config";
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
  createAuthoringRepository,
  createAnswerUseCaseDependencies,
  createAttemptUseCaseDependencies,
  createContentUseCaseDependencies,
  createCorrectionUseCaseDependencies,
  createCorrectionReadRepository,
  createCurriculumRuntimeRepository,
  createInvitationUseCaseDependencies,
  createLearningStateRepository,
  createPostgresRateLimiter,
  createProgressReadRepository,
  createParticipantJourneyRepository,
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
  const authoringRepository = createAuthoringRepository(
    integrations.database.db,
  );
  const learningStateRepository = createLearningStateRepository(
    integrations.database.db,
  );
  const rateLimiter = createPostgresRateLimiter(integrations.database.db);
  const apiDependencies: ApiHttpDependencies = {
    requestIdFactory: randomUUID,
    observability,
    ...(config.approvedClinicalApproverId === undefined
      ? {}
      : { approvedClinicalApproverId: config.approvedClinicalApproverId }),
    ...(config.metricsScrapeToken === undefined
      ? {}
      : { metricsScrapeToken: config.metricsScrapeToken }),
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
    resolveAttempt: (attemptId, context) =>
      attemptDependencies.transaction.run(
        (operations) => operations.attemptsPort.findById(attemptId),
        context,
      ),
    createInvitation: (command) =>
      createInvitation(command, invitationDependencies),
    acceptInvitation: (command) =>
      acceptInvitation(command, invitationDependencies),
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
    transitionLearningAssignment: (command) =>
      transitionLearningAssignmentState(command, learningStateRepository),
    createAssessmentWorkflow: (command) =>
      createAssessmentWorkflowState(command, learningStateRepository),
    transitionAssessmentWorkflow: (command) =>
      transitionAssessmentWorkflowState(command, learningStateRepository),
    createFeedbackTicket: (command) =>
      createFeedbackTicketState(command, learningStateRepository),
    transitionFeedbackTicket: (command) =>
      transitionFeedbackTicketState(command, learningStateRepository),
    createAppeal: (command) =>
      createAppealState(command, learningStateRepository),
    transitionAppeal: (command) =>
      transitionAppealState(command, learningStateRepository),
    getParticipantActivity: (participantId, activityId) =>
      getParticipantActivity(
        { participantId, activityId },
        activityReadRepository,
      ),
    advanceContent: (command) => advanceContent(command, contentDependencies),
    getInternalAuthoringRecord: (contentId, version) =>
      authoringRepository.find(contentId, version),
    publishAuthoringContent: (command) =>
      publishAuthoringContent(command, {
        repository: authoringRepository,
        transition: (transitionCommand) =>
          advanceContent(transitionCommand, contentDependencies),
      }),
    identityProvider,
    getAccountSecurity: async (principalId) => {
      const status = await identityProvider.getSecurityStatus(principalId);
      return Object.freeze({ ...status, session: "ACTIVE" as const });
    },
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
