import { describe, expect, it, vi } from "vitest";

import type { CurriculumRuntimeState } from "./curriculum-runtime-use-cases.js";
import {
  buildAdminDashboard,
  getInternalAdminDashboard,
  type AdminDashboardParticipantSnapshot,
} from "./admin-dashboard-use-cases.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const firstParticipantId = "22222222-2222-4222-8222-222222222222";
const secondParticipantId = "33333333-3333-4333-8333-333333333333";

const firstRuntime: CurriculumRuntimeState = {
  participantId: firstParticipantId,
  scopeId,
  version: 1,
  updatedAt: "2026-08-11T20:00:00.000Z",
  evaluation: {
    moduleId: "M01",
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
    scorePercent: 100,
  },
};

const snapshots: readonly AdminDashboardParticipantSnapshot[] = [
  {
    participantId: firstParticipantId,
    professionalEmail: "active@example.test",
    accountStatus: "ACTIVE",
    scopeIds: [scopeId],
    journey: {
      participantId: firstParticipantId,
      assignments: [
        {
          scopeId,
          state: {
            assignmentId: "44444444-4444-4444-8444-444444444444",
            participantId: firstParticipantId,
            moduleId: "M01",
            availableAt: "2026-08-11T20:00:00.000Z",
            status: "CONCLUIDO",
            version: 2,
          },
        },
        {
          scopeId,
          state: {
            assignmentId: "55555555-5555-4555-8555-555555555555",
            participantId: firstParticipantId,
            moduleId: "M02",
            availableAt: "2026-08-11T20:00:00.000Z",
            status: "EM_ANDAMENTO",
            version: 1,
          },
        },
      ],
      activities: [],
      results: [],
      runtimes: [firstRuntime],
      nextAction: "RETOMAR_ATIVIDADE",
    },
  },
  {
    participantId: secondParticipantId,
    professionalEmail: "invited@example.test",
    accountStatus: "INVITED",
    scopeIds: [scopeId],
    journey: {
      participantId: secondParticipantId,
      assignments: [],
      activities: [],
      results: [],
      runtimes: [],
      nextAction: "AGUARDAR_PUBLICACAO",
    },
  },
];

describe("admin dashboard use cases", () => {
  it("summarizes participants, progress, and the full curriculum catalog", () => {
    const dashboard = buildAdminDashboard(snapshots);

    expect(dashboard.summary).toEqual({
      participantsTotal: 2,
      activeParticipants: 1,
      invitedParticipants: 1,
      participantsInProgress: 1,
      averageProgressPercent: 2,
      assignedModules: 2,
      completedModules: 1,
    });
    expect(dashboard.participants[0]).toMatchObject({
      professionalEmail: "active@example.test",
      assignedModules: 2,
      completedModules: 1,
      progressPercent: 4,
      activeModuleId: "M02",
    });
    expect(dashboard.trainingCatalog).toHaveLength(24);
    expect(dashboard.trainingCatalog[0]).toMatchObject({
      moduleId: "M01",
      assignedParticipants: 1,
      completedParticipants: 1,
    });
  });

  it("loads each participant journey only inside the account scopes", async () => {
    const getParticipantLearningJourney = vi.fn(
      async (participantId: string) => {
        const snapshot = snapshots.find(
          (candidate) => candidate.participantId === participantId,
        );
        if (snapshot === undefined)
          throw new Error("fixture participant missing");
        return snapshot.journey;
      },
    );

    const dashboard = await getInternalAdminDashboard([scopeId], {
      listParticipants: async () =>
        snapshots.map(({ journey: _, ...account }) => account),
      getParticipantLearningJourney,
    });

    expect(getParticipantLearningJourney).toHaveBeenCalledTimes(2);
    expect(getParticipantLearningJourney).toHaveBeenCalledWith(
      firstParticipantId,
      [scopeId],
    );
    expect(dashboard.participants).toHaveLength(2);
  });
});
