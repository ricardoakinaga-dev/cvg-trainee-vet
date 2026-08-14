import { describe, expect, it } from "vitest";

import type { ModuleEvaluationResult } from "@cvg/curriculum";
import { createInitialModuleEvaluation } from "@cvg/curriculum";

import type { ParticipantLearningJourneyState } from "./journey-use-cases.js";
import { buildParticipantDashboard } from "./dashboard-use-cases.js";

const state: ParticipantLearningJourneyState = {
  participantId: "11111111-1111-4111-8111-111111111111",
  assignments: [
    {
      scopeId: "scope-1",
      state: {
        assignmentId: "22222222-2222-4222-8222-222222222222",
        participantId: "11111111-1111-4111-8111-111111111111",
        moduleId: "M01",
        availableAt: "2026-08-10T00:00:00.000Z",
        status: "DISPONIVEL",
        version: 1,
      },
    },
  ],
  activities: [],
  results: [],
  runtimes: [],
  nextAction: "INICIAR_ATIVIDADE",
};

describe("participant dashboard use case", () => {
  it("projects the complete 24-month roadmap without internal content", () => {
    const dashboard = buildParticipantDashboard(state);

    expect(dashboard.totalMonths).toBe(24);
    expect(dashboard.totalModules).toBe(24);
    expect(dashboard.roadmap).toHaveLength(24);
    expect(dashboard.roadmap[0]).toMatchObject({
      moduleId: "M01",
      month: 1,
      status: "DISPONIVEL",
    });
    expect(dashboard.roadmap[1]).toMatchObject({
      moduleId: "M02",
      month: 2,
      status: "BLOQUEADO_PRE_REQUISITO",
    });
    expect(dashboard.recommendations).toEqual([
      expect.objectContaining({
        id: "NEXT_STUDY",
        href: "/dashboard",
      }),
      expect.objectContaining({
        id: "ACCOUNT_SECURITY",
        href: "/account",
      }),
      expect.objectContaining({
        id: "REPORT_FEEDBACK",
        href: "/#feedback-report-title",
      }),
    ]);
    expect(dashboard).not.toHaveProperty("ranking");
    expect(JSON.stringify(dashboard)).not.toContain("ranking");
    expect(JSON.stringify(dashboard)).not.toContain("sourceRefs");
    expect(JSON.stringify(dashboard)).not.toContain("correctChoiceIds");
  });

  it("does not present draft curriculum as available or mastered", () => {
    const dashboard = buildParticipantDashboard({
      participantId: state.participantId,
      assignments: [],
      activities: [],
      results: [],
      runtimes: [
        {
          participantId: state.participantId,
          scopeId: "scope-1",
          version: 1,
          updatedAt: "2026-08-11T00:00:00.000Z",
          evaluation: createInitialModuleEvaluation("M01"),
        },
      ],
      nextAction: "AGUARDAR_PUBLICACAO",
    });

    expect(dashboard.roadmap[0]).toMatchObject({
      status: "AGUARDANDO_PUBLICACAO",
      nextAction: "AGUARDAR_PUBLICACAO",
    });
    expect(dashboard.completedModules).toBe(0);
    expect(dashboard.activeModuleId).toBeUndefined();
    expect(dashboard.recommendations[0]).toMatchObject({
      id: "NEXT_STUDY",
      title: "Acompanhe sua próxima ação",
    });
  });

  it("maps runtime, assignment and prerequisite states to deterministic actions", () => {
    const runtime = (
      moduleId: string,
      status: ModuleEvaluationResult["status"],
      retentionReviews: ModuleEvaluationResult["retentionReviews"] = [],
    ): ModuleEvaluationResult => ({
      moduleId,
      status,
      nextAction:
        status === "EM_REMEDIACAO"
          ? "EXECUTAR_REMEDIACAO"
          : status === "AGUARDA_CORRECAO_HUMANA"
            ? "AGUARDAR_CORRECAO_HUMANA"
            : "REVISAR_RETENCAO",
      objectiveResults: [],
      remediationObjectiveIds: [],
      criticalErrorItemIds: [],
      invalidAnswerItemIds: [],
      unansweredChoiceItemIds: [],
      openResponseItemIds: [],
      retentionReviews,
      practicalCompetenceClaim: "PROIBIDO_MVP",
      scorePercent: 80,
    });
    const assignment = (
      moduleId: string,
      status:
        | "BLOQUEADO"
        | "CONCLUIDO"
        | "CONCLUIDO_COM_RETENCAO_PENDENTE"
        | "EM_REFORCO"
        | "ATRIBUIDO"
        | "EM_ANDAMENTO",
    ) => ({
      scopeId: "scope-1",
      state: {
        assignmentId: `${moduleId}-assignment`,
        participantId: state.participantId,
        moduleId,
        availableAt: "2026-08-10T00:00:00.000Z",
        status,
        version: 1,
        ...(status === "BLOQUEADO"
          ? { blockReason: "PRE_REQUISITO" as const }
          : {}),
      },
    });

    const stateWithoutNextAction = {
      participantId: state.participantId,
      activities: state.activities,
      results: state.results,
    };
    const dashboard = buildParticipantDashboard({
      ...stateWithoutNextAction,
      assignments: [
        assignment("M05", "BLOQUEADO"),
        assignment("M06", "CONCLUIDO_COM_RETENCAO_PENDENTE"),
        assignment("M07", "CONCLUIDO"),
        assignment("M08", "EM_REFORCO"),
        assignment("M09", "ATRIBUIDO"),
        assignment("M10", "EM_ANDAMENTO"),
      ],
      runtimes: [
        {
          participantId: state.participantId,
          scopeId: "scope-1",
          version: 1,
          updatedAt: "2026-08-10T00:00:00.000Z",
          evaluation: runtime("M01", "EM_REMEDIACAO"),
        },
        {
          participantId: state.participantId,
          scopeId: "scope-1",
          version: 1,
          updatedAt: "2026-08-10T00:00:00.000Z",
          evaluation: runtime("M02", "AGUARDA_CORRECAO_HUMANA"),
        },
        {
          participantId: state.participantId,
          scopeId: "scope-1",
          version: 1,
          updatedAt: "2026-08-10T00:00:00.000Z",
          evaluation: runtime("M03", "DOMINIO_DIGITAL", [
            { day: 30, dueAt: "2026-09-09T00:00:00.000Z", status: "PENDENTE" },
          ]),
        },
        {
          participantId: state.participantId,
          scopeId: "scope-1",
          version: 1,
          updatedAt: "2026-08-10T00:00:00.000Z",
          evaluation: runtime("M04", "DOMINIO_DIGITAL"),
        },
      ],
    });

    expect(dashboard.roadmap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleId: "M01", status: "EM_REMEDIACAO" }),
        expect.objectContaining({
          moduleId: "M02",
          status: "EM_ANDAMENTO",
          nextAction: "AGUARDAR_CORRECAO_HUMANA",
        }),
        expect.objectContaining({
          moduleId: "M03",
          status: "RETENCAO_PENDENTE",
        }),
        expect.objectContaining({
          moduleId: "M04",
          status: "CONCLUIDO_DIGITAL",
        }),
        expect.objectContaining({
          moduleId: "M05",
          status: "BLOQUEADO_PRE_REQUISITO",
        }),
        expect.objectContaining({
          moduleId: "M06",
          status: "RETENCAO_PENDENTE",
        }),
        expect.objectContaining({
          moduleId: "M07",
          status: "CONCLUIDO_DIGITAL",
        }),
        expect.objectContaining({ moduleId: "M08", status: "EM_REMEDIACAO" }),
        expect.objectContaining({ moduleId: "M09", status: "DISPONIVEL" }),
        expect.objectContaining({ moduleId: "M10", status: "DISPONIVEL" }),
      ]),
    );
    expect(dashboard.activeModuleId).toBe("M01");
    expect(dashboard.nextAction).toBe("EXECUTAR_REMEDIACAO");
  });

  it("uses the safe fallback when every module is blocked", () => {
    const allBlocked = Array.from({ length: 24 }, (_, index) => ({
      scopeId: "scope-1",
      state: {
        assignmentId: `blocked-${index + 1}`,
        participantId: state.participantId,
        moduleId: `M${String(index + 1).padStart(2, "0")}`,
        availableAt: "2026-08-10T00:00:00.000Z",
        status: "BLOQUEADO" as const,
        version: 1,
        blockReason: "PRE_REQUISITO" as const,
      },
    }));
    const dashboard = buildParticipantDashboard({
      participantId: state.participantId,
      activities: state.activities,
      results: state.results,
      runtimes: state.runtimes,
      assignments: allBlocked,
    });

    expect(dashboard.activeModuleId).toBeUndefined();
    expect(dashboard.nextAction).toBe("CONSULTAR_PROXIMO_PASSO");
  });
});
