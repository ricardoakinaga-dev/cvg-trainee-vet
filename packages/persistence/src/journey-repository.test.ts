import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { PersistenceMappingError } from "./attempt-repository.js";
import { createParticipantJourneyRepository } from "./journey-repository.js";
import type * as schema from "./schema.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const activityId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const assignmentId = "55555555-5555-4555-8555-555555555555";
const resultId = "66666666-6666-4666-8666-666666666666";
const runtimeId = "77777777-7777-4777-8777-777777777777";

const activityRow = {
  activityId,
  scopeId,
  slug: "emergencia-m01-v1",
  title: "Emergência",
  status: "EM_ANDAMENTO",
  attemptId: null,
  attemptStatus: null,
  attemptVersion: null,
  attemptUpdatedAt: null,
};

type FakeActivityRow = Omit<
  typeof activityRow,
  "attemptId" | "attemptStatus" | "attemptVersion" | "attemptUpdatedAt"
> & {
  readonly attemptId: string | null;
  readonly attemptStatus: string | null;
  readonly attemptVersion: number | null;
  readonly attemptUpdatedAt: Date | null;
};

const runtimeRow = {
  id: runtimeId,
  participantId,
  scopeId,
  moduleId: "M01",
  version: 1,
  state: {
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
  },
  updatedAt: new Date("2026-08-10T05:00:00.000Z"),
  createdAt: new Date("2026-08-10T05:00:00.000Z"),
};

const assignmentRow = {
  id: assignmentId,
  participantId,
  scopeId,
  moduleId: "M01",
  availableAt: new Date("2026-08-10T05:00:00.000Z"),
  status: "DISPONIVEL",
  version: 0,
  blockReason: null,
  pausedFrom: null,
  createdAt: new Date("2026-08-10T05:00:00.000Z"),
  updatedAt: new Date("2026-08-10T05:00:00.000Z"),
};

const workflowRow = {
  resultId,
  attemptId,
  participantId,
  scopeId,
  ruleVersion: "synthetic-v1",
  version: 0,
  status: "RESULTADO_EM_PROCESSAMENTO",
  createdAt: new Date("2026-08-10T05:00:00.000Z"),
  updatedAt: new Date("2026-08-10T05:00:00.000Z"),
};

type FakeDatabaseInput = Readonly<{
  readonly activityRows?: readonly FakeActivityRow[];
  readonly runtimeRows?: readonly (typeof runtimeRow)[];
  readonly assignmentRows?: readonly (typeof assignmentRow)[];
  readonly workflowRows?: readonly (typeof workflowRow)[];
}>;

function fakeDatabase(input: FakeDatabaseInput = {}) {
  const results = [
    input.activityRows ?? [],
    input.runtimeRows ?? [],
    input.assignmentRows ?? [],
    input.workflowRows ?? [],
  ];
  let selectIndex = 0;
  const transaction = {
    execute: async () => undefined,
    select: () => {
      const rows = results[selectIndex++] ?? [];
      const query = {
        from: () => query,
        innerJoin: () => query,
        leftJoin: () => query,
        where: () => query,
        orderBy: async () => rows,
        then: (
          resolve: (value: readonly unknown[]) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve(rows).then(resolve, reject),
      };
      return query;
    },
  };
  return {
    transaction: async (
      callback: (value: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PostgresJsDatabase<typeof schema>;
}

describe("participant journey persistence", () => {
  it("returns an empty fail-closed journey without scopes", async () => {
    const repository = createParticipantJourneyRepository(fakeDatabase());

    await expect(
      repository.findParticipantLearningJourney(participantId, []),
    ).resolves.toMatchObject({
      participantId,
      assignments: [],
      activities: [],
      results: [],
      runtimes: [],
    });
  });

  it("aggregates activities, assignments, workflows, and runtime under context", async () => {
    const repository = createParticipantJourneyRepository(
      fakeDatabase({
        activityRows: [
          activityRow,
          {
            ...activityRow,
            attemptId,
            attemptStatus: "SALVA",
            attemptVersion: 2,
            attemptUpdatedAt: new Date("2026-08-10T06:00:00.000Z"),
          },
        ],
        runtimeRows: [runtimeRow],
        assignmentRows: [assignmentRow],
        workflowRows: [workflowRow],
      }),
    );

    const journey = await repository.findParticipantLearningJourney(
      participantId,
      [scopeId, scopeId],
    );

    expect(journey.activities).toMatchObject([
      {
        activityId,
        attemptId,
        attemptStatus: "SALVA",
        nextAction: "RETOMAR_ATIVIDADE",
      },
    ]);
    expect(journey.assignments).toHaveLength(1);
    expect(journey.results).toHaveLength(1);
    expect(journey.runtimes).toHaveLength(1);
  });

  it("keeps the latest attempt and preserves an activity without attempts", async () => {
    const noAttemptActivityId = "88888888-8888-4888-8888-888888888888";
    const multiAttemptActivityId = "99999999-9999-4999-8999-999999999999";
    const repository = createParticipantJourneyRepository(
      fakeDatabase({
        activityRows: [
          {
            ...activityRow,
            activityId: noAttemptActivityId,
            slug: "a-emergency-m01-v1",
          },
          {
            ...activityRow,
            activityId: multiAttemptActivityId,
            slug: "b-emergency-m01-v1",
            attemptId,
            attemptStatus: "SALVA",
            attemptVersion: 2,
            attemptUpdatedAt: null,
          },
          {
            ...activityRow,
            activityId: multiAttemptActivityId,
            slug: "b-emergency-m01-v1",
            attemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            attemptStatus: "SALVA",
            attemptVersion: 1,
            attemptUpdatedAt: null,
          },
        ],
      }),
    );

    const journey = await repository.findParticipantLearningJourney(
      participantId,
      [scopeId],
    );

    expect(journey.activities).toHaveLength(2);
    expect(journey.activities[0]).toMatchObject({
      activityId: noAttemptActivityId,
      nextAction: "CONSULTAR_PROXIMO_PASSO",
    });
    expect(journey.activities[1]?.attemptId).toBe(attemptId);
  });

  it("rejects invalid attempt metadata before it reaches the public boundary", async () => {
    await expect(
      createParticipantJourneyRepository(
        fakeDatabase({
          activityRows: [{ ...activityRow, attemptStatus: "INVALIDO" }],
        }),
      ).findParticipantLearningJourney(participantId, [scopeId]),
    ).rejects.toBeInstanceOf(PersistenceMappingError);

    await expect(
      createParticipantJourneyRepository(
        fakeDatabase({
          activityRows: [{ ...activityRow, attemptStatus: "SALVA" }],
        }),
      ).findParticipantLearningJourney(participantId, [scopeId]),
    ).rejects.toBeInstanceOf(PersistenceMappingError);

    await expect(
      createParticipantJourneyRepository(
        fakeDatabase({
          activityRows: [
            {
              ...activityRow,
              attemptId,
              attemptStatus: "SALVA",
              attemptVersion: -1,
            },
          ],
        }),
      ).findParticipantLearningJourney(participantId, [scopeId]),
    ).rejects.toBeInstanceOf(PersistenceMappingError);
  });

  it("requires a participant identity at the persistence boundary", async () => {
    await expect(
      createParticipantJourneyRepository(
        fakeDatabase(),
      ).findParticipantLearningJourney("", [scopeId]),
    ).rejects.toBeInstanceOf(PersistenceMappingError);
  });

  it("rejects malformed activity state instead of publishing it", async () => {
    const repository = createParticipantJourneyRepository(
      fakeDatabase({
        activityRows: [{ ...activityRow, status: "INVALIDO" }],
      }),
    );

    await expect(
      repository.findParticipantLearningJourney(participantId, [scopeId]),
    ).rejects.toBeInstanceOf(PersistenceMappingError);
  });
});
