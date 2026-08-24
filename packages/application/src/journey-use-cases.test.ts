import { describe, expect, it } from "vitest";

import {
  deriveJourneyNextAction,
  deriveJourneyNextActionTarget,
  getParticipantLearningJourney,
  type ParticipantJourneyActivity,
  type ParticipantLearningJourneyState,
  type ParticipantJourneyReadPort,
} from "./journey-use-cases.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const assignmentId = "33333333-3333-4333-8333-333333333333";
const activityId = "44444444-4444-4444-8444-444444444444";

const state: ParticipantLearningJourneyState = {
  participantId,
  assignments: [
    {
      scopeId,
      state: {
        assignmentId,
        participantId,
        moduleId: "M02",
        availableAt: "2026-08-10T05:00:00.000Z",
        status: "EM_ANDAMENTO",
        version: 1,
      },
    },
  ],
  activities: [
    {
      scopeId,
      activityId,
      moduleId: "M02",
      slug: "emergencia-m02-v1",
      title: "Emergência",
      status: "EM_ANDAMENTO",
      attemptId: "55555555-5555-4555-8555-555555555555",
      attemptStatus: "SALVA",
      attemptVersion: 2,
      nextAction: "RETOMAR_ATIVIDADE",
    },
  ],
  results: [],
  runtimes: [],
};

const assignment = state.assignments[0];
const activity = state.activities[0];

if (assignment === undefined || activity === undefined) {
  throw new Error("journey fixture must contain an assignment and activity");
}

function repository(
  value: ParticipantLearningJourneyState,
): ParticipantJourneyReadPort {
  return {
    findParticipantLearningJourney: async () => value,
  };
}

describe("participant learning journey use case", () => {
  it("prioritizes an available assignment, a pending result, then consultation", () => {
    const availableAssignment = {
      ...assignment,
      state: { ...assignment.state, status: "DISPONIVEL" as const },
    } satisfies ParticipantLearningJourneyState["assignments"][number];
    const noActionActivity = {
      scopeId: activity.scopeId,
      activityId: activity.activityId,
      slug: activity.slug,
      title: activity.title,
      status: activity.status,
      nextAction: "CONSULTAR_PROXIMO_PASSO" as const,
    } satisfies ParticipantJourneyActivity;
    const pendingResult = {
      scopeId,
      participantId,
      state: {
        resultId: "88888888-8888-4888-8888-888888888888",
        attemptId: "99999999-9999-4999-8999-999999999999",
        ruleVersion: "synthetic-v1",
        version: 0,
        status: "RESULTADO_EM_PROCESSAMENTO" as const,
      },
    };

    expect(
      deriveJourneyNextAction({
        ...state,
        assignments: [availableAssignment],
        activities: [noActionActivity],
        results: [],
      }),
    ).toBe("INICIAR_ATIVIDADE");
    expect(
      deriveJourneyNextAction({
        ...state,
        assignments: [],
        activities: [noActionActivity],
        results: [pendingResult],
      }),
    ).toBe("AGUARDAR_CORRECAO_HUMANA");
    expect(
      deriveJourneyNextAction({
        ...state,
        assignments: [],
        activities: [noActionActivity],
        results: [],
      }),
    ).toBe("CONSULTAR_PROXIMO_PASSO");
  });

  it("fails closed for empty identity and data returned outside requested scopes", async () => {
    await expect(
      getParticipantLearningJourney(
        { participantId: "", scopeIds: [scopeId] },
        repository(state),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      getParticipantLearningJourney(
        { participantId, scopeIds: [scopeId] },
        repository({
          ...state,
          activities: [
            {
              ...activity,
              scopeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("returns an immutable journey with the resumable next action", async () => {
    const result = await getParticipantLearningJourney(
      { participantId, scopeIds: [scopeId] },
      repository(state),
    );

    expect(result.nextAction).toBe("RETOMAR_ATIVIDADE");
    expect(result.nextActionTarget).toEqual({
      kind: "ACTIVITY",
      activityId,
    });
    expect(result).toMatchObject(state);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.activities)).toBe(true);
    expect(Object.isFrozen(result.nextActionTarget)).toBe(true);
  });

  it("prioritizes remediation and rejects a repository identity mismatch", async () => {
    const remediationRuntime = {
      participantId,
      scopeId,
      version: 1,
      updatedAt: "2026-08-10T05:00:00.000Z",
      evaluation: {
        moduleId: "M02",
        status: "EM_REMEDIACAO" as const,
        nextAction: "EXECUTAR_REMEDIACAO" as const,
        objectiveResults: [],
        remediationObjectiveIds: ["OBJ-1"],
        criticalErrorItemIds: [],
        invalidAnswerItemIds: [],
        unansweredChoiceItemIds: [],
        openResponseItemIds: [],
        retentionReviews: [],
        practicalCompetenceClaim: "PROIBIDO_MVP" as const,
      },
    };

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        activities: [
          {
            ...activity,
            status: "EM_REFORCO",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        runtimes: [remediationRuntime],
      }),
    ).toEqual({ kind: "ACTIVITY", activityId });

    await expect(
      getParticipantLearningJourney(
        { participantId, scopeIds: [scopeId] },
        repository({
          ...state,
          activities: [
            {
              ...activity,
              status: "EM_REFORCO",
              nextAction: "INICIAR_ATIVIDADE",
            },
          ],
          runtimes: [remediationRuntime],
        }),
      ),
    ).resolves.toMatchObject({
      nextAction: "EXECUTAR_REMEDIACAO",
      nextActionTarget: { kind: "ACTIVITY", activityId },
    });

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        runtimes: [
          {
            ...remediationRuntime,
            evaluation: {
              ...remediationRuntime.evaluation,
              nextAction: "REVISAR_RETENCAO",
              status: "DOMINIO_DIGITAL",
              remediationObjectiveIds: [],
              retentionReviews: [
                {
                  day: 7,
                  dueAt: "2026-08-17T05:00:00.000Z",
                  status: "PENDENTE",
                },
              ],
            },
          },
        ],
      }),
    ).toBeUndefined();

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        activities: [
          {
            scopeId: activity.scopeId,
            activityId: activity.activityId,
            slug: activity.slug,
            title: activity.title,
            status: "EM_REFORCO",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        runtimes: [remediationRuntime],
      }),
    ).toBeUndefined();

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        activities: [
          {
            ...activity,
            scopeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            status: "EM_REFORCO",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        runtimes: [remediationRuntime],
      }),
    ).toBeUndefined();

    await expect(
      getParticipantLearningJourney(
        { participantId, scopeIds: [scopeId] },
        repository({
          ...state,
          participantId: "66666666-6666-4666-8666-666666666666",
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
