import { describe, expect, it } from "vitest";

import {
  deriveParticipantCompetencyProfile,
  deriveParticipantDashboard,
  getStaffDashboard,
  type DashboardReadPort,
  type StaffDashboardState,
} from "./dashboard-use-cases.js";
import { evaluateModuleAttempt, getModuleDraftPack } from "@cvg/curriculum";
import type { ParticipantLearningJourneyState } from "./journey-use-cases.js";

const scopeId = "11111111-1111-4111-8111-111111111111";

const dashboard: StaffDashboardState = {
  scopes: [scopeId],
  generatedAt: "2026-08-23T12:00:00.000Z",
  metrics: {
    invitedParticipants: 2,
    activeParticipants: 1,
    inactiveParticipants: 0,
    assignedModules: 2,
    completedModules: 1,
    completionRatePercent: 50,
    medianProgressPercent: 50,
    pendingCorrections: 1,
    remediationParticipants: 1,
    retentionReviewsPending: 1,
    openFeedback: 1,
    content: {
      published: 4,
      inReview: 1,
      expired: 0,
      withdrawn: 0,
    },
  },
  participants: [
    {
      participantId: "22222222-2222-4222-8222-222222222222",
      professionalEmail: "vet@example.invalid",
      accountStatus: "ACTIVE",
      scopeIds: [scopeId],
      lastSeenAt: "2026-08-23T11:00:00.000Z",
      progress: {
        assignedModules: 2,
        completedModules: 1,
        progressPercent: 50,
        remediationModules: 1,
        retentionReviewsPending: 1,
      },
      pendingCorrections: 1,
      openFeedback: 1,
      nextAction: "AGUARDAR_CORRECAO_HUMANA",
      diagnosticProfile: [
        {
          themeId: "B07-S1",
          themeLabel: "Núcleo clínico e segurança",
          status: "BASELINE_REGISTRADA",
          scorePercent: 75,
          answeredItemCount: 30,
          itemCount: 40,
          recommendedModuleIds: ["M01", "M11"],
          lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
        {
          themeId: "B07-S2",
          themeLabel: "Emergência e priorização",
          status: "SEM_EVIDENCIA_DIGITAL",
          scorePercent: null,
          answeredItemCount: 0,
          itemCount: 40,
          recommendedModuleIds: [],
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
        {
          themeId: "B07-S3",
          themeLabel: "Internação, monitoramento e integração",
          status: "SEM_EVIDENCIA_DIGITAL",
          scorePercent: null,
          answeredItemCount: 0,
          itemCount: 40,
          recommendedModuleIds: [],
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
      ],
    },
  ],
};

function repository(value: StaffDashboardState): DashboardReadPort {
  return {
    findStaffDashboard: async () => value,
  };
}

describe("staff dashboard use case", () => {
  it("normalizes scopes and returns an immutable, scoped snapshot", async () => {
    const result = await getStaffDashboard(
      {
        principalId: "33333333-3333-4333-8333-333333333333",
        scopeIds: [scopeId, ` ${scopeId} `],
      },
      repository(dashboard),
    );

    expect(result).toEqual(dashboard);
    expect(result.scopes).toEqual([scopeId]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.metrics)).toBe(true);
    expect(Object.isFrozen(result.participants)).toBe(true);
  });

  it("fails closed when the principal or requested scope is empty", async () => {
    await expect(
      getStaffDashboard(
        { principalId: "", scopeIds: [scopeId] },
        repository(dashboard),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      getStaffDashboard(
        { principalId: "33333333-3333-4333-8333-333333333333", scopeIds: [] },
        repository(dashboard),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("rejects repository data outside the requested scope", async () => {
    await expect(
      getStaffDashboard(
        {
          principalId: "33333333-3333-4333-8333-333333333333",
          scopeIds: [scopeId],
        },
        repository({
          ...dashboard,
          scopes: ["44444444-4444-4444-8444-444444444444"],
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("keeps M02 quiz mastery separate from missing cases and requires authoritative completion to unlock M03", () => {
    const pack = getModuleDraftPack("M02");
    const answers = pack.items
      .filter((item) => item.responseMode === "CHOICE")
      .map((item) => ({
        itemId: item.id,
        selectedChoiceIds: item.correctChoiceIds ?? [],
      }));
    const evaluation = evaluateModuleAttempt({
      moduleId: "M02",
      catalog: pack,
      answers,
      completedAt: "2026-08-10T12:00:00.000Z",
      mode: "FORMATIVE_CHOICE",
    });
    const participantId = "33333333-3333-4333-8333-333333333333";
    const journey: ParticipantLearningJourneyState = {
      participantId,
      assignments: ["M01", "M02", "M03"].map((moduleId) => ({
        scopeId,
        state: {
          assignmentId: `synthetic-${moduleId}`,
          participantId,
          moduleId,
          availableAt: "2026-08-10T12:00:00.000Z",
          status:
            moduleId === "M01"
              ? ("CONCLUIDO" as const)
              : ("EM_ANDAMENTO" as const),
          version: 1,
        },
      })),
      activities: [],
      results: [],
      runtimes: [
        {
          participantId,
          scopeId,
          version: 1,
          updatedAt: "2026-08-10T12:00:00.000Z",
          evaluation,
        },
      ],
    };
    expect(evaluation.status).toBe("DOMINIO_DIGITAL");
    expect(evaluation.unansweredMandatoryItemIds).toHaveLength(2);
    const partial = deriveParticipantDashboard(journey);
    expect(partial.path.find((item) => item.moduleId === "M02")?.status).toBe(
      "EM_ANDAMENTO",
    );
    expect(partial.path.find((item) => item.moduleId === "M03")?.status).toBe(
      "EM_ANDAMENTO",
    );
    const assigned = {
      ...journey,
      assignments: journey.assignments.map((assignment) =>
        assignment.state.moduleId === "M03"
          ? {
              ...assignment,
              state: { ...assignment.state, status: "ATRIBUIDO" as const },
            }
          : assignment,
      ),
    };
    expect(
      deriveParticipantDashboard(assigned).path.find(
        (item) => item.moduleId === "M03",
      )?.status,
    ).toBe("BLOQUEADO_PRE_REQUISITO");
    const pendingCase = evaluateModuleAttempt({
      moduleId: "M02",
      catalog: pack,
      answers: [
        ...answers,
        ...pack.items
          .filter((item) => item.responseMode === "TEXT")
          .map((item) => ({
            itemId: item.id,
            text: "Caso sintético aguardando correção.",
          })),
      ],
      completedAt: "2026-08-10T12:00:00.000Z",
      mode: "MODULE_COMPLETION",
    });
    expect(pendingCase.activityProgress).toBe("AGUARDA_CORRECAO_HUMANA");
    expect(pendingCase.status).toBe("AGUARDA_CORRECAO_HUMANA");
    const completed = {
      ...assigned,
      assignments: assigned.assignments.map((assignment) =>
        assignment.state.moduleId === "M02"
          ? {
              ...assignment,
              state: {
                ...assignment.state,
                status: "CONCLUIDO_COM_RETENCAO_PENDENTE" as const,
              },
            }
          : assignment,
      ),
      completionReceipts: [
        {
          participantId,
          scopeId,
          moduleId: "M02",
          assignmentId: "synthetic-M02",
          completedAt: "2026-08-10T12:00:00.000Z",
          completedAssignmentVersion: 1,
        },
      ],
    };
    const final = deriveParticipantDashboard(completed);
    expect(final.path.find((item) => item.moduleId === "M02")?.status).toBe(
      "CONCLUIDO",
    );
    expect(final.path.find((item) => item.moduleId === "M03")?.status).toBe(
      "DISPONIVEL",
    );
    expect(
      final.profile.find((item) => item.moduleId === "M02")?.scorePercent,
    ).toBe(100);
  });

  it.each(["SALVA", "AGUARDA_CORRECAO_HUMANA"] as const)(
    "keeps M03 blocked when a completed M02 assignment still has a %s activity",
    (attemptStatus) => {
      const participantId = "33333333-3333-4333-8333-333333333333";
      const journey: ParticipantLearningJourneyState = {
        participantId,
        assignments: ["M01", "M02", "M03"].map((moduleId) => ({
          scopeId,
          state: {
            participantId,
            assignmentId: `synthetic-${moduleId}`,
            moduleId,
            availableAt: "2026-08-10T12:00:00.000Z",
            status:
              moduleId === "M03"
                ? "ATRIBUIDO"
                : "CONCLUIDO_COM_RETENCAO_PENDENTE",
            version: 1,
          },
        })),
        activities: [
          {
            scopeId,
            activityId: "44444444-4444-4444-8444-444444444444",
            moduleId: "M02",
            learningAssignmentId: "synthetic-M02",
            slug: "synthetic-pending-case",
            title: "Caso sintético pendente",
            status: "EM_ANDAMENTO",
            attemptStatus,
            nextAction:
              attemptStatus === "SALVA"
                ? "RETOMAR_ATIVIDADE"
                : "AGUARDAR_CORRECAO",
          },
        ],
        results: [],
        runtimes: [],
      };
      const result = deriveParticipantDashboard(journey);
      expect(result.path.find((item) => item.moduleId === "M02")?.status).toBe(
        "EM_ANDAMENTO",
      );
      expect(result.path.find((item) => item.moduleId === "M03")?.status).toBe(
        "BLOQUEADO_PRE_REQUISITO",
      );
      expect(result.progress.pendingCorrections).toBe(
        attemptStatus === "SALVA" ? 0 : 1,
      );
    },
  );

  it.each([false, true])(
    "resolves prerequisites in each assigned scope, reverse=%s",
    (reverse) => {
      const participantId = "33333333-3333-4333-8333-333333333333";
      const secondScope = "55555555-5555-4555-8555-555555555555";
      const assignments: ParticipantLearningJourneyState["assignments"] = [
        {
          scopeId,
          state: {
            participantId,
            assignmentId: "synthetic-active-M02",
            moduleId: "M02",
            status: "EM_ANDAMENTO",
            availableAt: "2026-08-10T12:00:00.000Z",
            version: 1,
          },
        },
        {
          scopeId,
          state: {
            participantId,
            assignmentId: "synthetic-active-M03",
            moduleId: "M03",
            status: "ATRIBUIDO",
            availableAt: "2026-08-10T12:00:00.000Z",
            version: 1,
          },
        },
        {
          scopeId: secondScope,
          state: {
            participantId,
            assignmentId: "synthetic-complete-M02",
            moduleId: "M02",
            status: "CONCLUIDO",
            availableAt: "2026-08-10T12:00:00.000Z",
            version: 1,
          },
        },
      ];
      const journey: ParticipantLearningJourneyState = {
        participantId,
        assignments: reverse ? [...assignments].reverse() : assignments,
        activities: [],
        runtimes: [],
        results: [],
        completionReceipts: [
          {
            participantId,
            scopeId: secondScope,
            moduleId: "M02",
            assignmentId: "synthetic-complete-M02",
            completedAt: "2026-08-10T12:00:00.000Z",
            completedAssignmentVersion: 1,
          },
        ],
      };
      expect(
        deriveParticipantDashboard(journey).path.find(
          (item) => item.moduleId === "M02",
        )?.status,
      ).toBe("EM_ANDAMENTO");
      expect(
        deriveParticipantDashboard(journey).path.find(
          (item) => item.moduleId === "M03",
        )?.status,
      ).toBe("BLOQUEADO_PRE_REQUISITO");
      const ownScopeTarget = {
        ...journey,
        assignments: journey.assignments.map((assignment) =>
          assignment.state.moduleId === "M03"
            ? { ...assignment, scopeId: secondScope }
            : assignment,
        ),
      };
      expect(
        deriveParticipantDashboard(ownScopeTarget).path.find(
          (item) => item.moduleId === "M03",
        )?.status,
      ).toBe("DISPONIVEL");
    },
  );

  it("derives participant progress, corrections, remediation and retention", () => {
    const journey: ParticipantLearningJourneyState = {
      participantId: "33333333-3333-4333-8333-333333333333",
      assignments: [],
      activities: [
        {
          scopeId,
          activityId: "44444444-4444-4444-8444-444444444444",
          slug: "atividade-concluida",
          title: "Atividade concluída",
          status: "CONCLUIDO",
          attemptStatus: "SUBMETIDA",
          nextAction: "AGUARDAR_CORRECAO",
        },
        {
          scopeId,
          activityId: "55555555-5555-4555-8555-555555555555",
          slug: "atividade-em-andamento",
          title: "Atividade em andamento",
          status: "EM_ANDAMENTO",
          nextAction: "RETOMAR_ATIVIDADE",
        },
      ],
      results: [],
      runtimes: [
        {
          participantId: "33333333-3333-4333-8333-333333333333",
          scopeId,
          version: 1,
          updatedAt: "2026-08-23T12:00:00.000Z",
          evaluation: {
            moduleId: "M02",
            status: "DOMINIO_DIGITAL",
            nextAction: "REVISAR_RETENCAO",
            objectiveResults: [],
            remediationObjectiveIds: ["M02-OBJ-01"],
            criticalErrorItemIds: [],
            invalidAnswerItemIds: [],
            unansweredChoiceItemIds: [],
            openResponseItemIds: [],
            retentionReviews: [
              {
                day: 30,
                dueAt: "2026-08-30T12:00:00.000Z",
                status: "PENDENTE",
              },
            ],
            practicalCompetenceClaim: "PROIBIDO_MVP",
            scorePercent: 90,
          },
        },
      ],
    };

    expect(deriveParticipantDashboard(journey)).toEqual({
      kind: "participant",
      nextAction: "REVISAR_RETENCAO",
      progress: {
        assignedActivities: 2,
        completedActivities: 1,
        progressPercent: 50,
        remediationObjectives: 1,
        retentionReviewsPending: 1,
        pendingCorrections: 1,
      },
      path: expect.arrayContaining([
        expect.objectContaining({
          moduleId: "M02",
          status: "RETENCAO_PENDENTE",
          nextAction: "EXECUTAR_RETENCAO",
        }),
      ]),
      profile: expect.arrayContaining([
        expect.objectContaining({
          moduleId: "M02",
          competence:
            "Reconhecer instabilidade, intervir em sequência e reavaliar resposta.",
          status: "RETENCAO_PENDENTE",
          scorePercent: 90,
          evidence: "AVALIACAO_MODULAR_DIGITAL",
          practicalCompetenceClaim: "PROIBIDO_MVP",
        }),
      ]),
    });
  });

  it("keeps the participant path scoped to assigned and evaluated modules", () => {
    const journey: ParticipantLearningJourneyState = {
      participantId: "33333333-3333-4333-8333-333333333333",
      assignments: [
        {
          scopeId,
          state: {
            assignmentId: "66666666-6666-4666-8666-666666666666",
            participantId: "33333333-3333-4333-8333-333333333333",
            moduleId: "M01",
            availableAt: "2026-08-23T12:00:00.000Z",
            status: "EM_ANDAMENTO",
            version: 1,
          },
        },
      ],
      activities: [],
      results: [],
      runtimes: [],
    };

    const result = deriveParticipantDashboard(journey);
    expect(result.path).toHaveLength(24);
    expect(result.profile).toHaveLength(24);
    expect(result.profile[0]).toMatchObject({
      moduleId: "M01",
      status: "SEM_EVIDENCIA_DIGITAL",
      scorePercent: null,
      evidence: "AVALIACAO_MODULAR_DIGITAL",
    });
    expect(result.profile[1]).toMatchObject({
      moduleId: "M02",
      status: "SEM_EVIDENCIA_DIGITAL",
      scorePercent: null,
    });
    expect(result.path[0]).toMatchObject({
      moduleId: "M01",
      status: "EM_ANDAMENTO",
      nextAction: "RETOMAR_MODULO",
    });
    expect(result.path[1]).toMatchObject({
      moduleId: "M02",
      status: "NAO_ATRIBUIDO",
      nextAction: "AGUARDAR_ATRIBUICAO",
    });
  });

  it("uses the latest digital evidence and keeps practical competence prohibited", () => {
    const journey: ParticipantLearningJourneyState = {
      participantId: "33333333-3333-4333-8333-333333333333",
      assignments: [],
      activities: [],
      results: [],
      runtimes: [
        {
          participantId: "33333333-3333-4333-8333-333333333333",
          scopeId,
          version: 1,
          updatedAt: "2026-08-20T12:00:00.000Z",
          evaluation: {
            moduleId: "M02",
            status: "EM_REMEDIACAO",
            nextAction: "EXECUTAR_REMEDIACAO",
            objectiveResults: [],
            remediationObjectiveIds: ["M02-OBJ-01"],
            criticalErrorItemIds: [],
            invalidAnswerItemIds: [],
            unansweredChoiceItemIds: [],
            openResponseItemIds: [],
            retentionReviews: [],
            practicalCompetenceClaim: "PROIBIDO_MVP",
            scorePercent: 40,
          },
        },
        {
          participantId: "33333333-3333-4333-8333-333333333333",
          scopeId,
          version: 2,
          updatedAt: "2026-08-23T12:00:00.000Z",
          evaluation: {
            moduleId: "M02",
            status: "DOMINIO_DIGITAL",
            nextAction: "REVISAR_RETENCAO",
            objectiveResults: [],
            remediationObjectiveIds: [],
            criticalErrorItemIds: [],
            invalidAnswerItemIds: [],
            unansweredChoiceItemIds: [],
            openResponseItemIds: [],
            retentionReviews: [],
            practicalCompetenceClaim: "PROIBIDO_MVP",
            scorePercent: 85,
          },
        },
        {
          participantId: "33333333-3333-4333-8333-333333333333",
          scopeId,
          version: 1,
          updatedAt: "2026-08-23T11:00:00.000Z",
          evaluation: {
            moduleId: "M03",
            status: "AGUARDA_CORRECAO_HUMANA",
            nextAction: "AGUARDAR_CORRECAO_HUMANA",
            objectiveResults: [],
            remediationObjectiveIds: [],
            criticalErrorItemIds: [],
            invalidAnswerItemIds: [],
            unansweredChoiceItemIds: [],
            openResponseItemIds: ["M03-Q01"],
            retentionReviews: [],
            practicalCompetenceClaim: "PROIBIDO_MVP",
          },
        },
      ],
    };

    const profile = deriveParticipantCompetencyProfile(journey);
    expect(profile).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleId: "M02",
          status: "DOMINIO_DIGITAL",
          scorePercent: 85,
          lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
        }),
        expect.objectContaining({
          moduleId: "M03",
          status: "AGUARDA_CORRECAO_HUMANA",
          scorePercent: null,
        }),
      ]),
    );
    expect(
      profile.every(
        (item) =>
          item.evidence === "AVALIACAO_MODULAR_DIGITAL" &&
          item.practicalCompetenceClaim === "PROIBIDO_MVP",
      ),
    ).toBe(true);
  });
});
