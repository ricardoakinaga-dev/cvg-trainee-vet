import { describe, expect, it } from "vitest";

import { accountInvitations, learningAssignments, sessions } from "./schema.js";
import {
  createContinuingEducationReportRepository,
  type ContinuingEducationReportRepositoryOptions,
} from "./continuing-education-report-repository.js";

type QueryRows = ReadonlyMap<object, readonly unknown[]>;
type FakeDatabase = Parameters<
  typeof createContinuingEducationReportRepository
>[0];
type FakeQueryBuilder = {
  readonly from: (source: object) => FakeQueryBuilder;
  readonly innerJoin: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly leftJoin: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly where: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly groupBy: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly then: <TResult1 = readonly unknown[], TResult2 = never>(
    onfulfilled?:
      ((value: readonly unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};
type FakeExecutor = {
  readonly execute: (
    ...args: readonly unknown[]
  ) => Promise<readonly unknown[]>;
  readonly select: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly transaction: <T>(
    callback: (transaction: FakeExecutor) => Promise<T>,
  ) => Promise<T>;
};

function fakeDatabase(rows: QueryRows): FakeDatabase {
  const executor: FakeExecutor = {
    execute: async () => [],
    select: (..._args: readonly unknown[]) => {
      let table: object | undefined;
      const builder: FakeQueryBuilder = {
        from(source: object) {
          table = source;
          return builder;
        },
        innerJoin(..._args: readonly unknown[]) {
          return builder;
        },
        leftJoin(..._args: readonly unknown[]) {
          return builder;
        },
        where(..._args: readonly unknown[]) {
          return builder;
        },
        groupBy(..._args: readonly unknown[]) {
          return builder;
        },
        then<TResult1 = readonly unknown[], TResult2 = never>(
          onfulfilled?:
            | ((value: readonly unknown[]) => TResult1 | PromiseLike<TResult1>)
            | null,
          onrejected?:
            ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ): Promise<TResult1 | TResult2> {
          return Promise.resolve(
            rows.get(table ?? accountInvitations) ?? [],
          ).then(onfulfilled, onrejected);
        },
      };
      return builder;
    },
    transaction: async <T>(
      callback: (transaction: FakeExecutor) => Promise<T>,
    ) => callback(executor),
  };
  return executor as unknown as FakeDatabase;
}

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantIds = {
  active: "22222222-2222-4222-8222-222222222222",
  invited: "33333333-3333-4333-8333-333333333333",
  suspended: "44444444-4444-4444-8444-444444444444",
} as const;

function member(
  participantId: string,
  accountStatus: "ACTIVE" | "INVITED" | "SUSPENDED",
  lastSeenAt: string | null,
) {
  return {
    participantId,
    professionalEmail: `${participantId}@example.invalid`,
    accountStatus,
    lastSeenAt,
  };
}

describe("continuing education report persistence adapter", () => {
  it("aggregates only completed digital module minutes and applies account/module filters", async () => {
    const repository = createContinuingEducationReportRepository(
      fakeDatabase(
        new Map<object, readonly unknown[]>([
          [
            accountInvitations,
            [
              member(
                participantIds.active,
                "ACTIVE",
                "2026-08-23T19:00:00.000Z",
              ),
              member(participantIds.invited, "INVITED", null),
              member(participantIds.suspended, "SUSPENDED", null),
            ],
          ],
          [
            learningAssignments,
            [
              {
                participantId: participantIds.active,
                moduleId: "M01",
                status: "CONCLUIDO",
              },
              {
                participantId: participantIds.active,
                moduleId: "M02",
                status: "EM_ANDAMENTO",
              },
              {
                participantId: participantIds.invited,
                moduleId: "M01",
                status: "CONCLUIDO",
              },
              {
                participantId: participantIds.suspended,
                moduleId: "M02",
                status: "ATRIBUIDO",
              },
            ],
          ],
          [sessions, []],
        ]),
      ),
      {
        now: () => new Date("2026-08-23T20:00:00.000Z"),
      } satisfies ContinuingEducationReportRepositoryOptions,
    );

    const result = await repository.findContinuingEducationReport({
      scopeId,
    });

    expect(result.summary).toMatchObject({
      participantCount: 3,
      invitedParticipants: 1,
      activeParticipants: 1,
      suspendedParticipants: 1,
      deactivatedParticipants: 0,
      assignedModules: 4,
      completedModules: 2,
      completionRatePercent: 50,
      completedDigitalMinutes: 840,
      completedDigitalHours: 14,
    });
    expect(result.modules).toEqual([
      expect.objectContaining({
        moduleId: "M01",
        month: 1,
        scheduledMinutes: 420,
        assignedParticipants: 2,
        completedParticipants: 2,
      }),
      expect.objectContaining({
        moduleId: "M02",
        month: 2,
        scheduledMinutes: 360,
        assignedParticipants: 2,
        completedParticipants: 0,
      }),
    ]);

    const filtered = await repository.findContinuingEducationReport({
      scopeId,
      moduleId: "M01",
      accountStatus: "ACTIVE",
    });
    expect(filtered.filters).toEqual({
      scopeId,
      moduleId: "M01",
      accountStatus: "ACTIVE",
    });
    expect(filtered.summary).toMatchObject({
      participantCount: 1,
      assignedModules: 1,
      completedModules: 1,
      completedDigitalMinutes: 420,
    });
  });
});
