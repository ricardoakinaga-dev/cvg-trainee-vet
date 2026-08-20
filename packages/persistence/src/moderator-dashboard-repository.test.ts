import { describe, expect, it, vi } from "vitest";

import {
  buildModeratorAssignedWork,
  createModeratorDashboardRepository,
  type ModeratorAssignedAccountRow,
  type ModeratorAssignedWorkRow,
} from "./moderator-dashboard-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";

const account: ModeratorAssignedAccountRow = {
  participantId,
  professionalEmail: "vet@example.test",
  roles: ["PARTICIPANT"],
  scopeIds: [scopeId],
};

const rows: readonly ModeratorAssignedWorkRow[] = [
  {
    participantId,
    scopeId,
    kind: "CORRECTION",
    technicalFailure: false,
    overdue: true,
  },
  {
    participantId,
    scopeId,
    kind: "FEEDBACK",
    technicalFailure: true,
    overdue: false,
  },
];

describe("moderator dashboard repository projection", () => {
  it("aggregates only assigned work for participant accounts in scope", () => {
    const result = buildModeratorAssignedWork("moderator-1", [scopeId], rows, [
      account,
    ]);

    expect(result.participants).toEqual([
      {
        participantId,
        professionalEmail: "vet@example.test",
        scopeIds: [scopeId],
        assignedQueueIds: [`CORRECTION:${scopeId}`, `FEEDBACK:${scopeId}`],
        correctionPendingCount: 1,
        feedbackOpenCount: 1,
        technicalFailureCount: 1,
      },
    ]);
    expect(result.queues).toEqual([
      {
        queueId: `CORRECTION:${scopeId}`,
        scopeId,
        kind: "CORRECTION",
        openCount: 1,
        overdueCount: 1,
      },
      {
        queueId: `FEEDBACK:${scopeId}`,
        scopeId,
        kind: "FEEDBACK",
        openCount: 1,
        overdueCount: 0,
      },
    ]);
  });

  it("drops work for non-participant or out-of-scope accounts", () => {
    expect(
      buildModeratorAssignedWork("moderator-1", [scopeId], rows, [
        { ...account, roles: ["MODERATOR"] },
      ]),
    ).toEqual({ participants: [], queues: [] });
  });

  it("reads feedback and correction queues through scoped transactions", async () => {
    const selectResults: unknown[][] = [
      [{ participantId, scopeId, type: "BUG_TECNICO" }],
      [{ participantId, scopeId, dueAt: new Date("2026-08-01T00:00:00.000Z") }],
      [
        {
          participantId,
          professionalEmail: account.professionalEmail,
          roles: account.roles,
          scopeIds: account.scopeIds,
        },
      ],
    ];
    const queryFor = (result: readonly unknown[]) => {
      const query = {
        from: vi.fn(),
        where: vi.fn(),
        then: (
          resolve: (value: readonly unknown[]) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(resolve, reject),
      };
      query.from.mockReturnValue(query);
      query.where.mockReturnValue(query);
      return query;
    };
    const tx = {
      execute: vi.fn(async () => undefined),
      select: vi.fn(() => queryFor(selectResults.shift() ?? [])),
    };
    const db = {
      transaction: vi.fn(async (work: (executor: typeof tx) => unknown) =>
        work(tx),
      ),
    };
    const repository = createModeratorDashboardRepository(db as never);

    await expect(
      repository.listAssignedWork("moderator-1", [scopeId]),
    ).resolves.toEqual({
      participants: [
        {
          participantId,
          professionalEmail: account.professionalEmail,
          scopeIds: [scopeId],
          assignedQueueIds: [`FEEDBACK:${scopeId}`, `CORRECTION:${scopeId}`],
          correctionPendingCount: 1,
          feedbackOpenCount: 1,
          technicalFailureCount: 1,
        },
      ],
      queues: [
        {
          queueId: `CORRECTION:${scopeId}`,
          scopeId,
          kind: "CORRECTION",
          openCount: 1,
          overdueCount: 1,
        },
        {
          queueId: `FEEDBACK:${scopeId}`,
          scopeId,
          kind: "FEEDBACK",
          openCount: 1,
          overdueCount: 0,
        },
      ],
    });
    expect(db.transaction).toHaveBeenCalledTimes(2);
    expect(tx.execute).toHaveBeenCalledTimes(4);
  });

  it("returns an empty projection before opening a transaction for invalid scope input", async () => {
    const db = { transaction: vi.fn() };
    const repository = createModeratorDashboardRepository(db as never);

    await expect(repository.listAssignedWork(" ", [scopeId])).resolves.toEqual({
      participants: [],
      queues: [],
    });
    await expect(
      repository.listAssignedWork("moderator-1", [" "]),
    ).resolves.toEqual({
      participants: [],
      queues: [],
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
