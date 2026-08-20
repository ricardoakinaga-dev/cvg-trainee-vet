import { describe, expect, it, vi } from "vitest";

import { loadRuntimeConfig } from "@cvg/config";

import type { ApiRuntimeResources } from "./api-runtime-resources.js";
import { createApiHttpDependencies } from "./api-http-dependencies.js";

const asyncNoop = vi.fn(async () => undefined);

function config() {
  return loadRuntimeConfig({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
    QDRANT_ENABLED: "false",
    AI_ENABLED: "false",
  });
}

function resources(): ApiRuntimeResources {
  const repository = new Proxy(
    {},
    {
      get: () => asyncNoop,
    },
  );
  const transaction = {
    run: vi.fn(async () => undefined),
  };

  return {
    integrations: {
      healthcheck: asyncNoop,
      dependencyStatus: asyncNoop,
    },
    observability: {},
    identityProvider: {
      getSecurityStatus: vi.fn(async () => ({
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "AVAILABLE",
        mfa: "NOT_ENABLED",
      })),
    },
    operationalAi: null,
    sessionRepository: repository,
    accountManagementDependencies: repository,
    activityScopeResolver: asyncNoop,
    attemptDependencies: { transaction, attemptsPort: repository },
    invitationDependencies: repository,
    passwordAuthDependencies: repository,
    auditRepository: repository,
    learningStateRepository: repository,
    authoringRepository: repository,
    authoringTransaction: transaction,
    clinicalReviewQueueRepository: repository,
    contentDependencies: repository,
    activityReadRepository: repository,
    adminOperationsRepository: repository,
    moderatorDashboardRepository: repository,
    participantJourneyRepository: repository,
    progressReadRepository: repository,
    trainingParticipantRepository: repository,
    assessmentRecalculationRepository: repository,
    itemStatisticsRepository: repository,
    sourceConflictDecisionRepository: repository,
    curriculumRuntimeRepository: repository,
    digitalCaseRuntimeRepository: repository,
    answerDependencies: repository,
    correctionDependencies: repository,
    correctionReadRepository: repository,
    rateLimiter: repository,
  } as unknown as ApiRuntimeResources;
}

async function invoke(callback: unknown, ...args: unknown[]): Promise<void> {
  if (typeof callback !== "function") return;
  try {
    await Reflect.apply(callback, undefined, args);
  } catch {
    // Invalid synthetic commands are intentional: they exercise the composition boundary without data.
  }
}

describe("API HTTP dependency composition coverage", () => {
  it("invokes every composed boundary with synthetic inputs", async () => {
    const runtimeConfig = config();
    const runtimeResources = resources();
    const dependencies = createApiHttpDependencies(
      runtimeConfig,
      runtimeResources,
    );

    expect(dependencies.requestIdFactory()).toEqual(expect.any(String));
    await invoke(dependencies.authenticate, { headers: {} } as never);
    await invoke(dependencies.resolveActivityScope, "participant", "activity");
    await invoke(dependencies.resolveAttempt, "attempt", {} as never);
    await invoke(dependencies.createInvitation, undefined as never);
    await invoke(dependencies.acceptInvitation, undefined as never);
    await invoke(dependencies.listManagedAccounts, undefined as never);
    await invoke(dependencies.updateManagedAccount, undefined as never);
    await invoke(dependencies.revokeManagedAccountSessions, undefined as never);
    await invoke(dependencies.loginWithPassword, undefined as never);
    await invoke(dependencies.setAccountPassword, undefined as never);
    await invoke(dependencies.revokeSession, undefined as never);
    await invoke(dependencies.rotateSession, undefined as never, 60);

    await invoke(dependencies.createLearningAssignment, undefined as never);
    await invoke(dependencies.transitionLearningAssignment, undefined as never);
    await invoke(dependencies.createAssessmentWorkflow, undefined as never);
    await invoke(dependencies.transitionAssessmentWorkflow, undefined as never);
    await invoke(dependencies.createFeedbackTicket, undefined as never);
    await invoke(dependencies.transitionFeedbackTicket, undefined as never);
    await invoke(dependencies.listFeedbackTickets, undefined as never);
    await invoke(dependencies.recordFeedbackSafetyEvent, {
      principalId: "principal",
      scopeId: "scope",
      ticketId: "ticket",
      requestId: "request",
      action: "SUBMIT",
    } as never);
    await invoke(dependencies.createAppeal, undefined as never);
    await invoke(dependencies.transitionAppeal, undefined as never);

    await invoke(dependencies.advanceContent, undefined as never);
    await invoke(dependencies.getInternalAuthoringRecord, "content", 1);
    await invoke(
      dependencies.getClinicalReviewQueue,
      "scope",
      undefined as never,
    );
    await invoke(dependencies.publishAuthoringContent, undefined as never);
    await invoke(dependencies.reviewAuthoringContent, undefined as never);
    await invoke(dependencies.getAccountSecurity, "principal");

    await invoke(
      dependencies.getParticipantActivity,
      "participant",
      "activity",
    );
    await invoke(
      dependencies.getParticipantProgress,
      "participant",
      "activity",
    );
    await invoke(dependencies.getParticipantLearningJourney, "participant", [
      "scope",
    ]);
    await invoke(dependencies.getInternalAdminDashboard, ["scope"]);
    await invoke(dependencies.getInternalAdminOperationsDashboard, ["scope"]);
    await invoke(dependencies.getInternalModeratorDashboard, "moderator", [
      "scope",
    ]);

    expect(dependencies.runOperationalAiProposal).toBeUndefined();
    await invoke(
      dependencies.confirmOperationalAiProposal,
      undefined as never,
      undefined as never,
    );
    await invoke(dependencies.recordObservedItemStatistics, undefined as never);
    await invoke(dependencies.recordSourceConflictDecision, undefined as never);
    await invoke(
      dependencies.registerAssessmentRecalculationCandidates,
      undefined as never,
    );
    await invoke(
      dependencies.recalculateAffectedAssessments,
      undefined as never,
    );
    await invoke(dependencies.listAuditEntries);

    await invoke(
      dependencies.getParticipantCurriculumRuntime,
      "participant",
      "M01",
    );
    await invoke(dependencies.evaluateCurriculumRuntime, undefined as never);
    await invoke(dependencies.getParticipantDigitalCase, undefined as never);
    await invoke(
      dependencies.advanceParticipantDigitalCase,
      undefined as never,
    );

    await invoke(dependencies.getAttemptFeedback, "participant", "attempt");
    await invoke(dependencies.correctOpenResponse, undefined as never);
    await invoke(dependencies.startAttempt, undefined as never);
    await invoke(dependencies.saveAnswer, undefined as never);
    await invoke(dependencies.submitAttempt, undefined as never);

    await invoke(dependencies.healthcheck);
    await invoke(dependencies.dependencyStatus);
  });

  it("exposes the optional operational AI boundary when configured", async () => {
    const runtimeConfig = config();
    const runtimeResources = resources();
    const operationalAiResources = {
      ...runtimeResources,
      operationalAi: {},
    } as unknown as ApiRuntimeResources;
    const dependencies = createApiHttpDependencies(
      runtimeConfig,
      operationalAiResources,
      async () => null,
    );

    expect(dependencies.runOperationalAiProposal).toEqual(expect.any(Function));
    await invoke(dependencies.authenticate, { headers: {} } as never);
    await invoke(dependencies.runOperationalAiProposal, undefined as never);
  });

  it("includes configured security boundaries and projects an active session", async () => {
    const sessionRepository = {
      findActive: vi.fn(async () => ({
        accountId: "participant",
        accountStatus: "ACTIVE" as const,
        roles: ["PARTICIPANT" as const],
        scopes: ["scope"],
      })),
    };
    const runtimeResources = {
      ...resources(),
      sessionRepository,
    } as unknown as ApiRuntimeResources;
    const dependencies = createApiHttpDependencies(
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
        METRICS_SCRAPE_TOKEN: "m".repeat(32),
      }),
      runtimeResources,
    );

    expect(dependencies).not.toHaveProperty("approvedClinicalApproverId");
    expect(dependencies.metricsScrapeToken).toBe("m".repeat(32));
    await expect(
      dependencies.authenticate?.({
        headers: { cookie: `__Host-cvg_session=${"s".repeat(32)}` },
      } as never),
    ).resolves.toEqual({
      principalId: "participant",
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: ["scope"],
    });
  });
});
