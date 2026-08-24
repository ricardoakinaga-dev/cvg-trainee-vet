import { describe, expect, it } from "vitest";

import { parseParticipantLearningJourney } from "./journey.js";

const journey = {
  assignments: [
    {
      assignmentId: "11111111-1111-4111-8111-111111111111",
      moduleId: "M02",
      availableAt: "2026-08-10T05:00:00.000Z",
      status: "EM_ANDAMENTO",
      version: 1,
    },
  ],
  activities: [
    {
      activityId: "22222222-2222-4222-8222-222222222222",
      slug: "emergencia-m02-v1",
      title: "Emergência",
      status: "EM_ANDAMENTO",
      attemptId: "44444444-4444-4444-8444-444444444444",
      attemptStatus: "SALVA",
      attemptVersion: 2,
      nextAction: "RETOMAR_ATIVIDADE",
    },
  ],
  results: [
    {
      resultId: "33333333-3333-4333-8333-333333333333",
      status: "RESULTADO_DISPONIVEL",
      version: 1,
    },
  ],
  runtimes: [],
  nextActionTarget: {
    kind: "ACTIVITY",
    activityId: "22222222-2222-4222-8222-222222222222",
  },
  nextAction: "RETOMAR_ATIVIDADE",
} as const;

describe("participant learning journey projection", () => {
  it("accepts the aggregate projection without identity or scope fields", () => {
    expect(parseParticipantLearningJourney(journey)).toEqual(journey);
  });

  it("rejects internal participant and scope fields at every aggregate boundary", () => {
    expect(() =>
      parseParticipantLearningJourney({
        ...journey,
        participantId: "44444444-4444-4444-8444-444444444444",
        activities: [
          {
            ...journey.activities[0],
            scopeId: "55555555-5555-4555-8555-555555555555",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects a partial attempt projection", () => {
    expect(() =>
      parseParticipantLearningJourney({
        ...journey,
        activities: [
          {
            ...journey.activities[0],
            attemptId: undefined,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects a next-action target that is not one of the published activities", () => {
    expect(() =>
      parseParticipantLearningJourney({
        ...journey,
        nextActionTarget: {
          kind: "ACTIVITY",
          activityId: "55555555-5555-4555-8555-555555555555",
        },
      }),
    ).toThrow();
  });

  it("rejects internal fields on the next-action target", () => {
    expect(() =>
      parseParticipantLearningJourney({
        ...journey,
        nextActionTarget: {
          kind: "ACTIVITY",
          activityId: journey.activities[0].activityId,
          scopeId: "55555555-5555-4555-8555-555555555555",
        },
      }),
    ).toThrow();
  });
});
