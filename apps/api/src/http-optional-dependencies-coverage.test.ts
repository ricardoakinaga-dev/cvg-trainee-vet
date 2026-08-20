import { describe, expect, it, vi } from "vitest";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "./http.js";
import {
  handleAuthoringPublication,
  handleAuthoringReview,
  handleContentTransition,
  handleCorrection,
  handleClinicalReviewQueue,
  handleCurriculumRuntimeEvaluation,
  handleInternalAuthoringRecord,
} from "./http-authoring-handlers.js";
import {
  handleAdminDashboard,
  handleAdminOperationsDashboard,
  handleAssessmentRecalculation,
  handleAuditTrail,
  handleListManagedAccounts,
  handleModeratorDashboard,
  handleOperationalAiProposal,
  handleObservedItemStatistics,
  handleOperationsDashboard,
  handleRevokeManagedAccountSessions,
  handleSourceConflictDecision,
  handleUpdateManagedAccount,
} from "./http-operations-handlers.js";
import {
  handleActivity,
  handleCurriculumRuntime,
  handleDigitalCaseAdvance,
  handleDigitalCaseRuntime,
  handleLearningPath,
  handleParticipantDashboard,
  handleProgress,
  handleSaveAnswer,
  handleStart,
} from "./http-participant-handlers.js";
import {
  handleAcceptInvitation,
  handleCreateAppeal,
  handleCreateAssessmentWorkflow,
  handleCreateFeedbackTicket,
  handleCreateInvitation,
  handleCreateLearningAssignment,
  handleFeedback,
  handleListFeedbackTickets,
  handlePasswordLogin,
  handlePasswordUpdate,
  handleRevokeSession,
  handleRotateSession,
  handleSessionStatus,
  handleSubmit,
  handleTransitionAppeal,
  handleTransitionAssessmentWorkflow,
  handleTransitionFeedbackTicket,
  handleTransitionLearningAssignment,
} from "./http-workflow-handlers.js";

const requestId = "request-optional-dependencies";
const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const invitationId = "12121212-1212-4212-8212-121212121212";
const assignmentId = "33333333-3333-4333-8333-333333333333";
const resultId = "44444444-4444-4444-8444-444444444444";
const ticketId = "55555555-5555-4555-8555-555555555555";
const appealId = "66666666-6666-4666-8666-666666666666";
const attemptId = "77777777-7777-4777-8777-777777777777";
const activityId = "88888888-8888-4888-8888-888888888888";
const itemId = "99999999-9999-4999-8999-999999999999";
const otherScopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const loginPassword = ["fixture", "access", "2026"].join("-");
const updatedPassword = ["fixture", "new", "access", "2026"].join("-");

const participant: ApiPrincipal = {
  principalId: participantId,
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [scopeId],
};

const administrator: ApiPrincipal = {
  principalId: participantId,
  accountStatus: "ACTIVE",
  roles: ["ADMIN"],
  scopes: [scopeId],
};

const multiScopeParticipant: ApiPrincipal = {
  ...participant,
  scopes: [scopeId, otherScopeId],
};

const assignmentState = {
  assignmentId,
  participantId,
  moduleId: "M03",
  availableAt: "2026-08-20T08:00:00.000Z",
  status: "DISPONIVEL" as const,
  version: 1,
};

const workflowState = {
  resultId,
  attemptId,
  ruleVersion: "summative-v1",
  status: "RESULTADO_DISPONIVEL" as const,
  version: 1,
};

const ticketState = {
  ticketId,
  participantId,
  type: "BUG_TECNICO" as const,
  description: "Falha sintética de teste.",
  createdAt: "2026-08-20T08:00:00.000Z",
  status: "NOVO" as const,
  version: 0,
};

const appealState = {
  appealId,
  participantId,
  attemptId,
  itemId,
  justification: "Justificativa sintética.",
  createdAt: "2026-08-20T08:00:00.000Z",
  dueAt: "2026-08-29T08:00:00.000Z",
  status: "ABERTA" as const,
  version: 0,
};

const attemptState = {
  attemptId,
  participantId,
  activityId,
  status: "SUBMETIDA" as const,
  version: 1,
};

function request(body: unknown = undefined): ApiHttpRequest {
  return {
    method: "POST",
    path: "/synthetic",
    body,
    query: {},
    headers: {},
  };
}

function dependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => requestId,
    createInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    authenticate: vi.fn(),
    resolveActivityScope: vi.fn(),
    resolveAttempt: vi.fn(),
    getParticipantActivity: vi.fn(),
    advanceContent: vi.fn(),
    getParticipantProgress: vi.fn(),
    getAttemptFeedback: vi.fn(),
    correctOpenResponse: vi.fn(),
    startAttempt: vi.fn(),
    saveAnswer: vi.fn(),
    submitAttempt: vi.fn(),
    healthcheck: vi.fn(),
    ...overrides,
  } as unknown as ApiHttpDependencies;
}

async function expectInternal(response: Promise<{ status: number }>) {
  await expect(response).resolves.toMatchObject({ status: 500 });
}

describe("API optional dependency boundaries", () => {
  it("fails closed when participant capabilities are not configured", async () => {
    await expectInternal(
      handleCurriculumRuntime("M03", requestId, participant, dependencies()),
    );
    await expectInternal(
      handleDigitalCaseRuntime(
        request(),
        "M24",
        requestId,
        participant,
        dependencies(),
      ),
    );
    await expectInternal(
      handleDigitalCaseAdvance(
        request(),
        "M24",
        requestId,
        participant,
        dependencies(),
      ),
    );
    await expectInternal(
      handleLearningPath(requestId, participant, dependencies()),
    );
    await expectInternal(
      handleParticipantDashboard(requestId, participant, dependencies()),
    );
  });

  it("fails closed when authoring capabilities are not configured", async () => {
    await expectInternal(
      handleCurriculumRuntimeEvaluation(
        request(),
        "M03",
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleInternalAuthoringRecord(
        "content-synthetic",
        "1",
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleClinicalReviewQueue(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleAuthoringPublication(
        request(),
        "content-synthetic",
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleAuthoringReview(
        request(),
        "content-synthetic",
        requestId,
        administrator,
        dependencies(),
      ),
    );
  });

  it("fails closed when workflow capabilities are not configured", async () => {
    await expectInternal(
      handlePasswordLogin(
        request({
          login: "synthetic@example.test",
          password: loginPassword,
        }),
        requestId,
        dependencies(),
      ),
    );
    await expectInternal(
      handlePasswordUpdate(
        request({ currentPassword: loginPassword, password: updatedPassword }),
        requestId,
        participant,
        dependencies(),
      ),
    );
    await expectInternal(
      handleRotateSession(
        request({ sessionExpiresInSeconds: 3600 }),
        requestId,
        dependencies(),
      ),
    );

    await expectInternal(
      handleCreateLearningAssignment(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleTransitionLearningAssignment(
        request(),
        assignmentId,
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleCreateAssessmentWorkflow(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleTransitionAssessmentWorkflow(
        request(),
        resultId,
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleCreateFeedbackTicket(
        request(),
        requestId,
        participant,
        dependencies(),
      ),
    );
    await expectInternal(
      handleListFeedbackTickets(
        request(),
        requestId,
        participant,
        dependencies(),
      ),
    );
    await expectInternal(
      handleTransitionFeedbackTicket(
        request(),
        ticketId,
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleCreateAppeal(request(), requestId, participant, dependencies()),
    );
    await expectInternal(
      handleTransitionAppeal(
        request(),
        appealId,
        requestId,
        administrator,
        dependencies(),
      ),
    );
  });

  it("fails closed when operational dependencies are not configured", async () => {
    await expectInternal(
      handleOperationsDashboard(requestId, administrator, dependencies()),
    );
    await expectInternal(
      handleAuditTrail(requestId, administrator, dependencies()),
    );
    await expectInternal(
      handleAdminDashboard(requestId, administrator, dependencies()),
    );
    await expectInternal(
      handleAdminOperationsDashboard(requestId, administrator, dependencies()),
    );
    await expectInternal(
      handleModeratorDashboard(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleOperationalAiProposal(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleObservedItemStatistics(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleSourceConflictDecision(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expect(
      handleAssessmentRecalculation(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expectInternal(
      handleListManagedAccounts(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleUpdateManagedAccount(
        request(),
        participantId,
        requestId,
        administrator,
        dependencies(),
      ),
    );
    await expectInternal(
      handleRevokeManagedAccountSessions(
        request(),
        participantId,
        requestId,
        administrator,
        dependencies(),
      ),
    );
  });

  it("proves operational validation and scoped write boundaries", async () => {
    await expect(
      handleOperationsDashboard(
        requestId,
        participant,
        dependencies({ dependencyStatus: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleAuditTrail(
        requestId,
        participant,
        dependencies({ listAuditEntries: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleAdminDashboard(
        requestId,
        participant,
        dependencies({ getInternalAdminDashboard: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleAdminOperationsDashboard(
        requestId,
        participant,
        dependencies({ getInternalAdminOperationsDashboard: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    const getInternalModeratorDashboard = vi.fn();
    await expect(
      handleModeratorDashboard(
        { ...request(), query: { scopeId: " " } },
        requestId,
        administrator,
        dependencies({ getInternalModeratorDashboard }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleModeratorDashboard(
        { ...request(), query: { scopeId } },
        requestId,
        participant,
        dependencies({ getInternalModeratorDashboard }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleModeratorDashboard(
        request(),
        requestId,
        { ...participant, scopes: [] },
        dependencies({ getInternalModeratorDashboard }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      handleOperationalAiProposal(
        request({ tool: "unknown" }),
        requestId,
        administrator,
        dependencies({ runOperationalAiProposal: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });

    const observedInput = {
      itemId: "item-synthetic",
      scopeId: otherScopeId,
      contentVersion: 1,
      observedAt: "2026-08-20T08:00:00.000Z",
      sampleSize: 10,
      correctCount: 7,
      appealCount: 1,
      distractorCounts: [],
    };
    await expect(
      handleObservedItemStatistics(
        request(),
        requestId,
        administrator,
        dependencies({ recordObservedItemStatistics: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleObservedItemStatistics(
        request(observedInput),
        requestId,
        administrator,
        dependencies({ recordObservedItemStatistics: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    const sourceInput = {
      conflictId: "conflict-synthetic",
      contentId: "content-synthetic",
      contentVersion: 1,
      scopeId: otherScopeId,
      sourceCodes: ["source-a", "source-b"],
      description: "Conflito sintético.",
      decision: "ESCALATE_CLINICAL_REVIEW",
      rationale: "Revisão clínica sintética.",
      decidedAt: "2026-08-20T08:00:00.000Z",
    };
    await expect(
      handleSourceConflictDecision(
        request(),
        requestId,
        administrator,
        dependencies({ recordSourceConflictDecision: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleSourceConflictDecision(
        request(sourceInput),
        requestId,
        administrator,
        dependencies({ recordSourceConflictDecision: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    const recalculationInput = {
      scopeId: otherScopeId,
      itemId: "item-synthetic",
      reason: "ITEM_ANNULLED",
      passingScore: 70,
      recalculatedAt: "2026-08-20T08:00:00.000Z",
      candidates: [],
    };
    await expect(
      handleAssessmentRecalculation(
        request(),
        requestId,
        administrator,
        dependencies(),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleAssessmentRecalculation(
        request(recalculationInput),
        requestId,
        administrator,
        dependencies(),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleAssessmentRecalculation(
        request({ ...recalculationInput, scopeId }),
        requestId,
        administrator,
        dependencies(),
      ),
    ).resolves.toMatchObject({ status: 500 });

    await expect(
      handleListManagedAccounts(
        { ...request(), query: { limit: "201" } },
        requestId,
        administrator,
        dependencies({ listManagedAccounts: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    const managedAccount = {
      accountId: participantId,
      professionalEmail: "trainee@cvg.example",
      accountStatus: "ACTIVE" as const,
      roles: ["PARTICIPANT"] as const,
      scopes: [scopeId] as const,
      version: 1,
      createdAt: new Date("2026-08-20T08:00:00.000Z"),
      updatedAt: new Date("2026-08-20T08:00:00.000Z"),
    };
    await expect(
      handleListManagedAccounts(
        request(),
        requestId,
        administrator,
        dependencies({
          listManagedAccounts: vi.fn(async () => ({
            accounts: [managedAccount],
            nextCursor: null,
          })),
        }),
      ),
    ).resolves.toMatchObject({ status: 200 });

    await expect(
      handleUpdateManagedAccount(
        request(),
        participantId,
        requestId,
        administrator,
        dependencies({ updateManagedAccount: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleUpdateManagedAccount(
        request({ expectedVersion: 1, roles: ["ADMIN"] }),
        participantId,
        requestId,
        administrator,
        dependencies({ updateManagedAccount: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleUpdateManagedAccount(
        request({ expectedVersion: 1, status: "SUSPENDED" }),
        participantId,
        requestId,
        administrator,
        dependencies({
          updateManagedAccount: vi.fn(async () => managedAccount),
        }),
      ),
    ).resolves.toMatchObject({ status: 200 });

    await expect(
      handleRevokeManagedAccountSessions(
        request({ unexpected: true }),
        participantId,
        requestId,
        administrator,
        dependencies({ revokeManagedAccountSessions: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleRevokeManagedAccountSessions(
        request(),
        participantId,
        requestId,
        administrator,
        dependencies({
          revokeManagedAccountSessions: vi.fn(async () => ({
            accountId: participantId,
            revokedCount: 2,
          })),
        }),
      ),
    ).resolves.toMatchObject({ status: 200 });
  });

  it("proves participant activity and runtime authorization boundaries", async () => {
    const validStart = {
      activityId,
      idempotencyKey: "start-key-2026-a",
    };
    await expect(
      handleStart(request(), requestId, participant, dependencies()),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleStart(
        request(validStart),
        requestId,
        participant,
        dependencies({ resolveActivityScope: vi.fn(async () => null) }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleStart(
        request(validStart),
        requestId,
        administrator,
        dependencies({ resolveActivityScope: vi.fn(async () => scopeId) }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleStart(
        request(validStart),
        requestId,
        participant,
        dependencies({
          resolveActivityScope: vi.fn(async () => scopeId),
          getParticipantLearningJourney: vi.fn(async () => ({
            participantId: otherScopeId,
          })) as never,
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    const validSave = {
      attemptId,
      activityId,
      itemId,
      response: "Resposta sintética.",
      idempotencyKey: "save-key-2026-aa",
    };
    await expect(
      handleSaveAnswer(
        request(),
        attemptId,
        requestId,
        participant,
        dependencies(),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleSaveAnswer(
        request(validSave),
        "99999999-9999-4999-8999-999999999999",
        requestId,
        participant,
        dependencies(),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleSaveAnswer(
        request(validSave),
        attemptId,
        requestId,
        participant,
        dependencies({ resolveAttempt: vi.fn(async () => null) }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleSaveAnswer(
        request(validSave),
        attemptId,
        requestId,
        participant,
        dependencies({
          resolveAttempt: vi.fn(async () => attemptState as never),
          resolveActivityScope: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleSaveAnswer(
        request(validSave),
        attemptId,
        requestId,
        administrator,
        dependencies({
          resolveAttempt: vi.fn(async () => attemptState as never),
          resolveActivityScope: vi.fn(async () => scopeId),
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      handleActivity(
        activityId,
        requestId,
        participant,
        dependencies({
          getParticipantLearningJourney: vi.fn(async () => ({
            participantId: otherScopeId,
          })) as never,
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleActivity(
        activityId,
        requestId,
        participant,
        dependencies({
          getParticipantActivity: vi.fn(async () => ({
            scopeId: otherScopeId,
          })) as never,
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleProgress(
        activityId,
        requestId,
        participant,
        dependencies({
          getParticipantProgress: vi.fn(async () => ({
            scopeId: otherScopeId,
          })) as never,
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      handleCurriculumRuntime(
        "M03",
        requestId,
        participant,
        dependencies({
          getParticipantCurriculumRuntime: vi.fn(async () => ({
            scopeId: otherScopeId,
          })) as never,
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      handleDigitalCaseRuntime(
        { ...request(), query: { scopeId: "not-a-uuid" } },
        "M24",
        requestId,
        participant,
        dependencies({ getParticipantDigitalCase: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleDigitalCaseRuntime(
        request(),
        "M24",
        requestId,
        { ...participant, scopes: [scopeId, otherScopeId] },
        dependencies({ getParticipantDigitalCase: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleDigitalCaseRuntime(
        { ...request(), query: { scopeId: otherScopeId } },
        "M24",
        requestId,
        participant,
        dependencies({ getParticipantDigitalCase: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      handleDigitalCaseAdvance(
        request(),
        "M24",
        requestId,
        participant,
        dependencies({ advanceParticipantDigitalCase: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleDigitalCaseAdvance(
        request({
          selectedChoiceIds: [],
          expectedVersion: 0,
        }),
        "M24",
        requestId,
        { ...participant, scopes: [scopeId, otherScopeId] },
        dependencies({ advanceParticipantDigitalCase: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleDigitalCaseAdvance(
        request({
          selectedChoiceIds: ["choice-a"],
          expectedVersion: 0,
          scopeId: otherScopeId,
        }),
        "M24",
        requestId,
        participant,
        dependencies({ advanceParticipantDigitalCase: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      handleLearningPath(
        requestId,
        { ...participant, scopes: [] },
        dependencies({ getParticipantLearningJourney: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleLearningPath(
        requestId,
        participant,
        dependencies({
          getParticipantLearningJourney: vi.fn(async () => ({
            participantId: otherScopeId,
          })) as never,
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleParticipantDashboard(
        requestId,
        { ...participant, scopes: [] },
        dependencies({ getParticipantLearningJourney: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleParticipantDashboard(
        requestId,
        participant,
        dependencies({
          getParticipantLearningJourney: vi.fn(async () => ({
            participantId: otherScopeId,
          })) as never,
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
  });

  it("proves authoring and clinical review input boundaries", async () => {
    const evaluateCurriculumRuntime = vi.fn();
    await expect(
      handleCurriculumRuntimeEvaluation(
        request(),
        "M03",
        requestId,
        administrator,
        dependencies({ evaluateCurriculumRuntime }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleCurriculumRuntimeEvaluation(
        request({
          participantId,
          scopeId,
          answers: [],
          completedAt: "2026-08-20T08:00:00.000Z",
        }),
        "M03",
        requestId,
        participant,
        dependencies({ evaluateCurriculumRuntime }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    const getInternalAuthoringRecord = vi.fn();
    await expect(
      handleInternalAuthoringRecord(
        "content-synthetic",
        "0",
        requestId,
        administrator,
        dependencies({ getInternalAuthoringRecord }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleInternalAuthoringRecord(
        "content-synthetic",
        "1",
        requestId,
        administrator,
        dependencies({
          getInternalAuthoringRecord: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleInternalAuthoringRecord(
        "content-synthetic",
        "1",
        requestId,
        participant,
        dependencies({
          getInternalAuthoringRecord: vi.fn(async () => ({
            scopeId: otherScopeId,
          })) as never,
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    const getClinicalReviewQueue = vi.fn();
    await expect(
      handleClinicalReviewQueue(
        { ...request(), query: { scopeId: "not-a-uuid" } },
        requestId,
        administrator,
        dependencies({ getClinicalReviewQueue }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleClinicalReviewQueue(
        { ...request(), query: { scopeId } },
        requestId,
        administrator,
        dependencies({ getClinicalReviewQueue }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    const idempotencyHeaders = {
      "idempotency-key": "authoring-key-2026",
    };
    const publishAuthoringContent = vi.fn();
    await expect(
      handleAuthoringPublication(
        { ...request(), headers: idempotencyHeaders },
        "content-synthetic",
        requestId,
        administrator,
        dependencies({ publishAuthoringContent }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleAuthoringPublication(
        {
          ...request({ version: 1, scopeId }),
          headers: idempotencyHeaders,
        },
        "content-synthetic",
        requestId,
        participant,
        dependencies({ publishAuthoringContent }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleAuthoringPublication(
        request({ version: 1, scopeId }),
        "content-synthetic",
        requestId,
        administrator,
        dependencies({ publishAuthoringContent }),
      ),
    ).resolves.toMatchObject({ status: 422 });

    const reviewAuthoringContent = vi.fn();
    const reviewBody = {
      version: 1,
      scopeId,
      decision: "SOLICITAR_AJUSTES",
      rationale: "Ajuste sintético necessário.",
    };
    await expect(
      handleAuthoringReview(
        { ...request(), headers: idempotencyHeaders },
        "content-synthetic",
        requestId,
        administrator,
        dependencies({ reviewAuthoringContent }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleAuthoringReview(
        { ...request(reviewBody), headers: idempotencyHeaders },
        "content-synthetic",
        requestId,
        participant,
        dependencies({ reviewAuthoringContent }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleAuthoringReview(
        request(reviewBody),
        "content-synthetic",
        requestId,
        administrator,
        dependencies({ reviewAuthoringContent }),
      ),
    ).resolves.toMatchObject({ status: 422 });

    await expect(
      handleContentTransition(
        request(),
        "content-synthetic",
        requestId,
        administrator,
        dependencies({ advanceContent: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });

    const correctionBody = {
      scopeId,
      idempotencyKey: "correct-key-2026",
      score: 80,
      outcome: "APROVADO",
      feedback: "Feedback sintético.",
      ruleVersion: "rubrica-v1",
    };
    await expect(
      handleCorrection(
        request(),
        attemptId,
        requestId,
        administrator,
        dependencies(),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleCorrection(
        request(correctionBody),
        attemptId,
        requestId,
        administrator,
        dependencies({ resolveAttempt: vi.fn(async () => null) }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleCorrection(
        request(correctionBody),
        attemptId,
        requestId,
        administrator,
        dependencies({
          resolveAttempt: vi.fn(async () => attemptState as never),
          resolveActivityScope: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleCorrection(
        request(correctionBody),
        attemptId,
        requestId,
        administrator,
        dependencies({
          resolveAttempt: vi.fn(async () => attemptState as never),
          resolveActivityScope: vi.fn(async () => otherScopeId),
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
  });

  it("proves workflow validation, scope and authorization boundaries", async () => {
    const createInvitation = vi.fn(async () => ({
      invitationId,
      accountId: participantId,
      professionalEmail: "trainee@cvg.example",
      token: "a".repeat(32),
      expiresAt: new Date("2026-08-21T08:00:00.000Z"),
    }));
    const acceptInvitation = vi.fn(async () => ({
      accountId: participantId,
      session: {
        sessionId: invitationId,
        token: "b".repeat(32),
        expiresAt: new Date("2026-08-21T08:00:00.000Z"),
        cookie: "cvg_session=synthetic",
      },
    }));

    await expect(
      handleCreateInvitation(request(), requestId, participant, dependencies()),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleCreateInvitation(
        request({
          professionalEmail: "trainee@cvg.example",
          invitedRoles: ["PARTICIPANT"],
          invitedScopes: [otherScopeId],
          expiresInSeconds: 3600,
        }),
        requestId,
        participant,
        dependencies({ createInvitation }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      handleAcceptInvitation(request(), requestId, dependencies()),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleSessionStatus(request(), requestId, {
        ...dependencies(),
        authenticate: vi.fn(async () => null),
      }),
    ).resolves.toMatchObject({ status: 401 });

    await expect(
      handlePasswordUpdate(
        request({ currentPassword: loginPassword, password: updatedPassword }),
        requestId,
        { ...participant, accountStatus: "SUSPENDED" },
        dependencies({ setAccountPassword: vi.fn(async () => undefined) }),
      ),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      handleRotateSession(
        request({ sessionExpiresInSeconds: 30 }),
        requestId,
        dependencies({ rotateSession: vi.fn() }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleRotateSession(
        request({ sessionExpiresInSeconds: 3600 }),
        requestId,
        dependencies({ rotateSession: vi.fn(async () => null) }),
      ),
    ).resolves.toMatchObject({ status: 401 });

    await expect(
      handleRevokeSession(request(), requestId, dependencies()),
    ).resolves.toMatchObject({ status: 200 });
    const revokeSession = vi.fn(async () => undefined);
    await handleRevokeSession(
      { ...request(), headers: { cookie: "cvg_session=synthetic" } },
      requestId,
      dependencies({ revokeSession }),
    );
    expect(revokeSession).toHaveBeenCalledWith("cvg_session=synthetic");

    const attempt = attemptState as never;
    await expect(
      handleFeedback(
        attemptId,
        requestId,
        participant,
        dependencies({ resolveAttempt: vi.fn(async () => null) }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleFeedback(
        attemptId,
        requestId,
        participant,
        dependencies({
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleFeedback(
        attemptId,
        requestId,
        administrator,
        dependencies({
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => scopeId),
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleFeedback(
        attemptId,
        requestId,
        participant,
        dependencies({
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => scopeId),
          getAttemptFeedback: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });

    const createLearningAssignment = vi.fn(
      async () => assignmentState as never,
    );
    await expect(
      handleCreateLearningAssignment(
        request(),
        requestId,
        administrator,
        dependencies({ createLearningAssignment }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleCreateLearningAssignment(
        request({
          assignmentId,
          participantId,
          scopeId,
          moduleId: "M03",
          availableAt: assignmentState.availableAt,
        }),
        requestId,
        participant,
        dependencies({ createLearningAssignment }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleCreateLearningAssignment(
        request({
          assignmentId,
          participantId,
          scopeId,
          moduleId: "M03",
          availableAt: assignmentState.availableAt,
        }),
        requestId,
        administrator,
        dependencies({ createLearningAssignment }),
      ),
    ).resolves.toMatchObject({ status: 201 });

    const transitionLearningAssignment = vi.fn(
      async () => assignmentState as never,
    );
    const assignmentTransition = {
      assignmentId,
      participantId,
      scopeId,
      version: 0,
      event: "DISPONIBILIZAR",
      now: assignmentState.availableAt,
    };
    await expect(
      handleTransitionLearningAssignment(
        request(assignmentTransition),
        "99999999-9999-4999-8999-999999999999",
        requestId,
        administrator,
        dependencies({ transitionLearningAssignment }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleTransitionLearningAssignment(
        request(assignmentTransition),
        assignmentId,
        requestId,
        participant,
        dependencies({ transitionLearningAssignment }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleTransitionLearningAssignment(
        request({ ...assignmentTransition, reason: undefined }),
        assignmentId,
        requestId,
        administrator,
        dependencies({ transitionLearningAssignment }),
      ),
    ).resolves.toMatchObject({ status: 200 });

    const createAssessmentWorkflow = vi.fn(async () => workflowState as never);
    const workflowCreateRequest = {
      resultId,
      attemptId,
      participantId,
      scopeId,
      ruleVersion: "summative-v1",
    };
    await expect(
      handleCreateAssessmentWorkflow(
        request(),
        requestId,
        administrator,
        dependencies({ createAssessmentWorkflow }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleCreateAssessmentWorkflow(
        request(workflowCreateRequest),
        requestId,
        participant,
        dependencies({ createAssessmentWorkflow }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleCreateAssessmentWorkflow(
        request(workflowCreateRequest),
        requestId,
        administrator,
        dependencies({ createAssessmentWorkflow }),
      ),
    ).resolves.toMatchObject({ status: 201 });

    const transitionAssessmentWorkflow = vi.fn(
      async () => workflowState as never,
    );
    const workflowTransitionRequest = {
      resultId,
      participantId,
      scopeId,
      version: 0,
      event: "DISPONIBILIZAR",
    };
    await expect(
      handleTransitionAssessmentWorkflow(
        request(workflowTransitionRequest),
        "99999999-9999-4999-8999-999999999999",
        requestId,
        administrator,
        dependencies({ transitionAssessmentWorkflow }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleTransitionAssessmentWorkflow(
        request(workflowTransitionRequest),
        resultId,
        requestId,
        participant,
        dependencies({ transitionAssessmentWorkflow }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleTransitionAssessmentWorkflow(
        request(workflowTransitionRequest),
        resultId,
        requestId,
        administrator,
        dependencies({ transitionAssessmentWorkflow }),
      ),
    ).resolves.toMatchObject({ status: 200 });

    const createFeedbackTicket = vi.fn(async () => ticketState as never);
    const feedbackCreateRequest = {
      type: "BUG_TECNICO",
      description: "Falha sintética de teste.",
      scopeId,
    };
    await expect(
      handleCreateFeedbackTicket(
        request(feedbackCreateRequest),
        requestId,
        administrator,
        dependencies({ createFeedbackTicket }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleCreateFeedbackTicket(
        request(feedbackCreateRequest),
        requestId,
        participant,
        dependencies({ createFeedbackTicket }),
      ),
    ).resolves.toMatchObject({ status: 201 });

    const scopedTicket = { state: ticketState as never, scopeId };
    const listFeedbackTickets = vi.fn(async () => [scopedTicket]);
    await expect(
      handleListFeedbackTickets(
        { ...request(), query: { status: "INVALID" } },
        requestId,
        participant,
        dependencies({ listFeedbackTickets }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleListFeedbackTickets(
        request(),
        requestId,
        multiScopeParticipant,
        dependencies({ listFeedbackTickets }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleListFeedbackTickets(
        request(),
        requestId,
        participant,
        dependencies({
          listFeedbackTickets: vi.fn(async () => [
            {
              state: { ...ticketState, participantId: otherScopeId } as never,
              scopeId,
            },
          ]),
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleListFeedbackTickets(
        request(),
        requestId,
        participant,
        dependencies({
          listFeedbackTickets: vi.fn(async () => [
            { ...scopedTicket, scopeId: otherScopeId },
          ]),
        }),
      ),
    ).resolves.toMatchObject({ status: 500 });

    const transitionFeedbackTicket = vi.fn(async () => ticketState as never);
    const ticketTransitionRequest = {
      ticketId,
      participantId,
      scopeId,
      version: 0,
      event: "TRIAR",
    };
    await expect(
      handleTransitionFeedbackTicket(
        request(ticketTransitionRequest),
        "99999999-9999-4999-8999-999999999999",
        requestId,
        administrator,
        dependencies({ transitionFeedbackTicket }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleTransitionFeedbackTicket(
        request(ticketTransitionRequest),
        ticketId,
        requestId,
        participant,
        dependencies({ transitionFeedbackTicket }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleTransitionFeedbackTicket(
        request({ ...ticketTransitionRequest, response: undefined }),
        ticketId,
        requestId,
        administrator,
        dependencies({ transitionFeedbackTicket }),
      ),
    ).resolves.toMatchObject({ status: 200 });

    const createAppeal = vi.fn(async () => appealState as never);
    const appealCreateRequest = {
      attemptId,
      itemId,
      justification: "Justificativa sintética.",
    };
    await expect(
      handleCreateAppeal(
        request(),
        requestId,
        participant,
        dependencies({ createAppeal }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleCreateAppeal(
        request(appealCreateRequest),
        requestId,
        participant,
        dependencies({
          createAppeal,
          resolveAttempt: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleCreateAppeal(
        request(appealCreateRequest),
        requestId,
        participant,
        dependencies({
          createAppeal,
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleCreateAppeal(
        request(appealCreateRequest),
        requestId,
        administrator,
        dependencies({
          createAppeal,
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => scopeId),
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleCreateAppeal(
        request(appealCreateRequest),
        requestId,
        participant,
        dependencies({
          createAppeal,
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => scopeId),
        }),
      ),
    ).resolves.toMatchObject({ status: 201 });

    const transitionAppeal = vi.fn(async () => appealState as never);
    const appealTransitionRequest = {
      appealId,
      participantId,
      scopeId,
      version: 0,
      event: "ENCERRAR",
    };
    await expect(
      handleTransitionAppeal(
        request(appealTransitionRequest),
        "99999999-9999-4999-8999-999999999999",
        requestId,
        administrator,
        dependencies({ transitionAppeal }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleTransitionAppeal(
        request(appealTransitionRequest),
        appealId,
        requestId,
        participant,
        dependencies({ transitionAppeal }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleTransitionAppeal(
        request(appealTransitionRequest),
        appealId,
        requestId,
        administrator,
        dependencies({ transitionAppeal }),
      ),
    ).resolves.toMatchObject({ status: 200 });

    const submitAttempt = vi.fn(async () => attemptState as never);
    await expect(
      handleSubmit(
        request({ idempotencyKey: "short" }),
        attemptId,
        requestId,
        participant,
        dependencies({ submitAttempt }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handleSubmit(
        request({ idempotencyKey: "submit-key-2026-a" }),
        attemptId,
        requestId,
        participant,
        dependencies({
          submitAttempt,
          resolveAttempt: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleSubmit(
        request({ idempotencyKey: "submit-key-2026-a" }),
        attemptId,
        requestId,
        participant,
        dependencies({
          submitAttempt,
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => null),
        }),
      ),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      handleSubmit(
        request({ idempotencyKey: "submit-key-2026-a" }),
        attemptId,
        requestId,
        administrator,
        dependencies({
          submitAttempt,
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => scopeId),
        }),
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleSubmit(
        request({ idempotencyKey: "submit-key-2026-a" }),
        attemptId,
        requestId,
        participant,
        dependencies({
          submitAttempt,
          resolveAttempt: vi.fn(async () => attempt),
          resolveActivityScope: vi.fn(async () => scopeId),
        }),
      ),
    ).resolves.toMatchObject({ status: 200 });

    const login = vi.fn(async () => ({
      accountId: participantId,
      session: {
        sessionId: invitationId,
        token: "c".repeat(32),
        expiresAt: new Date("2026-08-21T08:00:00.000Z"),
        cookie: "cvg_session=logged-in",
      },
    }));
    await expect(
      handlePasswordLogin(
        request({ login: "invalid", password: loginPassword }),
        requestId,
        dependencies({ loginWithPassword: login }),
      ),
    ).resolves.toMatchObject({ status: 422 });
    await expect(
      handlePasswordLogin(
        request({ login: "trainee@cvg.example", password: loginPassword }),
        requestId,
        dependencies({ loginWithPassword: login }),
      ),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      handleCreateInvitation(
        request({
          professionalEmail: "trainee@cvg.example",
          invitedRoles: ["PARTICIPANT"],
          invitedScopes: [scopeId],
          expiresInSeconds: 3600,
        }),
        requestId,
        administrator,
        dependencies({ createInvitation }),
      ),
    ).resolves.toMatchObject({ status: 201 });
    await expect(
      handleAcceptInvitation(
        request({
          token: "a".repeat(32),
          password: loginPassword,
          sessionExpiresInSeconds: 3600,
        }),
        requestId,
        dependencies({ acceptInvitation }),
      ),
    ).resolves.toMatchObject({ status: 200 });
  });
});
