import { describe, expect, it } from "vitest";

import {
  deriveParticipantCompetencyProfile,
  deriveParticipantDashboard,
  getStaffDashboard,
  type DashboardReadPort,
  type StaffDashboardState,
} from "./dashboard-use-cases.js";
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
                day: 7,
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
