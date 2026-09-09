import { describe, expect, it, vi } from "vitest";

import { type DiagnosticResultState } from "@cvg/application";
import { type DiagnosticSessionFinalizationState } from "@cvg/application";

import { handleApiRequest } from "../http.js";
import {
  attempt,
  dependencies,
  diagnosticAggregate,
  diagnosticCatalog,
  diagnosticDependencies,
  diagnosticSessionId,
  finalizedDiagnosticAggregate,
} from "./fixtures.js";

describe("API HTTP boundary — diagnostics boundary", () => {
  it("persists the B-07 draft evaluation only behind scoped moderation and returns theme aggregates", async () => {
    const state: DiagnosticResultState = {
      resultId: "33333333-3333-4333-8333-333333333333",
      participantId: attempt.participantId,
      scopeId: "11111111-1111-4111-8111-111111111111",
      diagnosticId: "B07-DIAGNOSTIC-V1",
      version: "0.1.0",
      completedAt: "2026-08-23T12:00:00.000Z",
      result: {
        diagnosticId: "B07-DIAGNOSTIC-V1",
        version: "0.1.0",
        notPunitive: true,
        noGlobalPassFail: true,
        totalItemCount: 120,
        answeredItemCount: 1,
        themeResults: [
          {
            themeId: "B07-S1",
            itemCount: 40,
            answeredItemCount: 1,
            earnedPoints: 1,
            possiblePoints: 1,
            percent: 100,
            recommendedModuleIds: ["M01"],
          },
          {
            themeId: "B07-S2",
            itemCount: 40,
            answeredItemCount: 0,
            earnedPoints: 0,
            possiblePoints: 0,
            percent: 0,
            recommendedModuleIds: ["M02"],
          },
          {
            themeId: "B07-S3",
            itemCount: 40,
            answeredItemCount: 0,
            earnedPoints: 0,
            possiblePoints: 0,
            percent: 0,
            recommendedModuleIds: ["M11"],
          },
        ],
        recommendedModuleIds: ["M01", "M02", "M11"],
        remediationObjectiveIds: ["M01-OBJ-01"],
      },
    };
    const evaluateDiagnosticDraft = vi.fn(async () => state);
    const assignCurriculumFromDiagnostic = vi.fn(async () => ({
      diagnosticResultId: state.resultId,
      participantId: state.participantId,
      scopeId: state.scopeId,
      assignments: [],
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/diagnostics/b07/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: "11111111-1111-4111-8111-111111111111",
          completedAt: "2026-08-23T12:00:00.000Z",
          answers: [{ itemId: "B07-S1-I001", selectedChoiceIds: ["a"] }],
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        evaluateDiagnosticDraft,
        assignCurriculumFromDiagnostic,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        diagnosticId: "B07-DIAGNOSTIC-V1",
        themes: [
          { themeId: "B07-S1", scorePercent: 100 },
          expect.anything(),
          expect.anything(),
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(
      "remediationObjectiveIds",
    );
    expect(JSON.stringify(response.body)).not.toContain("answer_key");
    expect(evaluateDiagnosticDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        participantId: attempt.participantId,
        scopeId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(assignCurriculumFromDiagnostic).toHaveBeenCalledWith({
      diagnosticResultId: state.resultId,
      scopeId: state.scopeId,
    });
  });
  it("rejects a diagnostic draft for a participant outside the moderator scope", async () => {
    const evaluateDiagnosticDraft = vi.fn(async () => {
      throw new Error("must not evaluate an out-of-scope participant");
    });
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/diagnostics/b07/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: "11111111-1111-4111-8111-111111111111",
          completedAt: "2026-08-23T12:00:00.000Z",
          answers: [{ itemId: "B07-S1-I001", selectedChoiceIds: ["a"] }],
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        isParticipantInScope: async () => false,
        evaluateDiagnosticDraft,
      }),
    );

    expect(response.status).toBe(403);
    expect(evaluateDiagnosticDraft).not.toHaveBeenCalled();
  });
  it("materializes a diagnostic curriculum without accepting participant identity", async () => {
    const diagnosticResultId = "33333333-3333-4333-8333-333333333333";
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const assignment = {
      assignmentId: "44444444-4444-4444-8444-444444444444",
      participantId: attempt.participantId,
      moduleId: "M01",
      availableAt: "2026-08-23T12:00:00.000Z",
      status: "ATRIBUIDO" as const,
      version: 1,
    };
    const assignCurriculumFromDiagnostic = vi.fn(async () => ({
      diagnosticResultId,
      participantId: attempt.participantId,
      scopeId,
      assignments: [{ scopeId, state: assignment }],
    }));

    const staffResponse = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/diagnostics/${diagnosticResultId}/assign`,
        body: { scopeId },
      },
      dependencies({
        assignCurriculumFromDiagnostic,
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );

    expect(staffResponse.status).toBe(200);
    expect(staffResponse.body).toMatchObject({
      success: true,
      data: {
        assignments: [
          {
            availableAt: assignment.availableAt,
            status: assignment.status,
            version: assignment.version,
          },
        ],
      },
    });
    expect(JSON.stringify(staffResponse.body)).not.toContain("participantId");
    expect(JSON.stringify(staffResponse.body)).not.toContain(
      "diagnosticResultId",
    );
    expect(JSON.stringify(staffResponse.body)).not.toContain("assignmentId");
    expect(JSON.stringify(staffResponse.body)).not.toContain("moduleId");
    expect(assignCurriculumFromDiagnostic).toHaveBeenCalledWith({
      diagnosticResultId,
      scopeId,
    });

    const participantResponse = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/diagnostics/${diagnosticResultId}/assign`,
        body: { scopeId },
      },
      dependencies({ assignCurriculumFromDiagnostic }),
    );
    expect(participantResponse.status).toBe(403);
    expect(assignCurriculumFromDiagnostic).toHaveBeenCalledTimes(1);
  });
  it("rejects an invalid diagnostic result identifier before assignment", async () => {
    const assignCurriculumFromDiagnostic = vi.fn();
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/diagnostics/not-a-uuid/assign",
        body: {
          scopeId: "11111111-1111-4111-8111-111111111111",
        },
      },
      dependencies({
        assignCurriculumFromDiagnostic,
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(assignCurriculumFromDiagnostic).not.toHaveBeenCalled();
  });
  it("runs the participant diagnostic journey through the safe public projection", async () => {
    const start = vi.fn(async () => diagnosticAggregate);
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/diagnostics/b07/sessions",
        body: { idempotencyKey: "diagnostic-start-http-2026" },
      },
      diagnosticDependencies({
        diagnosticSessionRepository: {
          start,
          findCurrent: vi.fn(async () => diagnosticAggregate),
          findById: vi.fn(async () => diagnosticAggregate),
          saveAnswer: vi.fn(async () => diagnosticAggregate),
          finalize: vi.fn(async () => {
            throw new Error("not used");
          }),
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        participantId: attempt.participantId,
        scopeId: "scope-1",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        diagnosticId: "B07-DIAGNOSTIC-V1",
        diagnosticVersion: "0.1.0",
        status: "EM_ANDAMENTO",
        itemCount: 120,
        items: expect.any(Array),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("correctChoiceIds");
    expect(JSON.stringify(response.body)).not.toContain("recommendedModuleIds");
  });
  it("maps public diagnostic item ids to the canonical evaluator id and checkpoints with CAS version", async () => {
    const saveAnswer = vi.fn(async () => ({
      ...diagnosticAggregate,
      session: { ...diagnosticAggregate.session, version: 1 },
      answers: [
        {
          canonicalItemId: "B07-S1-I001",
          selectedChoiceIds: ["a"],
          savedAt: "2026-08-26T14:01:00.000Z",
        },
      ],
    }));
    const response = await handleApiRequest(
      {
        method: "PUT",
        path: `/api/v1/diagnostics/b07/sessions/${diagnosticSessionId}/answers/${diagnosticCatalog.items[0]?.publicItemId}`,
        body: {
          version: 0,
          selectedChoiceIds: ["a"],
          idempotencyKey: "diagnostic-answer-http-2026",
        },
      },
      diagnosticDependencies({
        diagnosticSessionRepository: {
          start: vi.fn(async () => diagnosticAggregate),
          findCurrent: vi.fn(async () => diagnosticAggregate),
          findById: vi.fn(async () => diagnosticAggregate),
          saveAnswer,
          finalize: vi.fn(async () => {
            throw new Error("not used");
          }),
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(saveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalItemId: "B07-S1-I001",
        expectedVersion: 0,
        selectedChoiceIds: ["a"],
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { version: 1, answeredItemCount: 1 },
    });
  });
  it("finalizes once and never exposes assignment or evaluator-only recommendation fields", async () => {
    const finalize = vi.fn(
      async () =>
        ({
          aggregate: finalizedDiagnosticAggregate,
          assignments: {
            diagnosticResultId:
              finalizedDiagnosticAggregate.result?.resultId ?? "",
            participantId: attempt.participantId,
            scopeId: "scope-1",
            assignments: [{ internal: "must-not-leak" }],
          },
        }) as unknown as DiagnosticSessionFinalizationState,
    );
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/diagnostics/b07/sessions/${diagnosticSessionId}/finalize`,
        body: {
          version: 0,
          idempotencyKey: "diagnostic-finalize-http-2026",
        },
      },
      diagnosticDependencies({
        diagnosticSessionRepository: {
          start: vi.fn(async () => diagnosticAggregate),
          findCurrent: vi.fn(async () => diagnosticAggregate),
          findById: vi.fn(async () => diagnosticAggregate),
          saveAnswer: vi.fn(async () => diagnosticAggregate),
          finalize,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 0 }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: "FINALIZADA",
        currentOrdinal: null,
        nextAction: "CONTINUAR_TRILHA",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("assignment");
    expect(JSON.stringify(response.body)).not.toContain("recommendedModuleIds");
  });
  it("does not guess a scope when the participant has more than one active scope", async () => {
    const start = vi.fn(async () => diagnosticAggregate);
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/diagnostics/b07/sessions",
        body: { idempotencyKey: "diagnostic-start-ambiguous-2026" },
      },
      diagnosticDependencies({
        authenticate: async () => ({
          principalId: attempt.participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: ["scope-1", "scope-2"],
        }),
        diagnosticSessionRepository: {
          start,
          findCurrent: vi.fn(async () => diagnosticAggregate),
          findById: vi.fn(async () => diagnosticAggregate),
          saveAnswer: vi.fn(async () => diagnosticAggregate),
          finalize: vi.fn(async () => {
            throw new Error("not used");
          }),
        },
      }),
    );

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "state_conflict",
        details: [{ code: "diagnostic_scope_ambiguous" }],
      },
    });
    expect(start).not.toHaveBeenCalled();
  });
});
