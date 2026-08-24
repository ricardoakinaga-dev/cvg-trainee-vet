import { describe, expect, it } from "vitest";

import {
  AdaptiveAssignmentConflictError,
  AdaptiveAssignmentNotFoundError,
  AdaptiveAssignmentPersistenceError,
  createAdaptiveAssignmentRepository,
} from "./adaptive-assignment-repository.js";
import { diagnosticResults, learningAssignments } from "./schema.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const diagnosticResultId = "33333333-3333-4333-8333-333333333333";
const completedAt = "2026-08-24T12:00:00.000Z";
const availableAt = new Date(completedAt);

const diagnosticRow = {
  id: diagnosticResultId,
  participantId,
  scopeId,
  diagnosticId: "B07-DIAGNOSTIC-V1",
  diagnosticVersion: "0.1.0",
  result: {
    diagnosticId: "B07-DIAGNOSTIC-V1",
    version: "0.1.0",
    notPunitive: true,
    noGlobalPassFail: true,
    totalItemCount: 120,
    answeredItemCount: 2,
    themeResults: [
      {
        themeId: "B07-S1",
        itemCount: 40,
        answeredItemCount: 1,
        earnedPoints: 0,
        possiblePoints: 1,
        percent: 0,
        recommendedModuleIds: ["M01"],
      },
      {
        themeId: "B07-S2",
        itemCount: 40,
        answeredItemCount: 1,
        earnedPoints: 0,
        possiblePoints: 1,
        percent: 0,
        recommendedModuleIds: ["M02", "M10"],
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
    recommendedModuleIds: ["M01", "M02", "M10", "M11"],
    remediationObjectiveIds: [],
  },
  completedAt: availableAt,
  createdAt: availableAt,
} as typeof diagnosticResults.$inferSelect;

type AssignmentRow = typeof learningAssignments.$inferSelect;
type FakeBuilder = {
  readonly from: (source: object) => FakeBuilder;
  readonly where: (...conditions: readonly unknown[]) => FakeBuilder;
  readonly orderBy: (
    ...columns: readonly unknown[]
  ) => Promise<readonly unknown[]>;
  readonly limit: (
    ...values: readonly unknown[]
  ) => Promise<readonly unknown[]>;
  values: (row: Record<string, unknown>) => FakeBuilder;
  readonly onConflictDoNothing: () => FakeBuilder;
  readonly set: (values: Record<string, unknown>) => FakeBuilder;
  readonly returning: (
    ...columns: readonly unknown[]
  ) => Promise<readonly unknown[]>;
};

type FakeDatabase = Parameters<typeof createAdaptiveAssignmentRepository>[0];

function assignmentRow(
  moduleId: string,
  status: string,
  version: number,
): AssignmentRow {
  return {
    id: `44444444-4444-4444-8444-44444444444${moduleId.slice(-1)}`,
    participantId,
    scopeId,
    moduleId,
    availableAt,
    status,
    version,
    blockReason: null,
    pausedFrom: null,
    createdAt: availableAt,
    updatedAt: availableAt,
  };
}

function createFakeDatabase(
  options: {
    readonly diagnosticRows?: readonly (typeof diagnosticResults.$inferSelect)[];
    readonly assignmentRows?: readonly AssignmentRow[];
    readonly updateReturnsEmpty?: boolean;
  } = {},
): {
  readonly db: FakeDatabase;
  readonly assignments: () => readonly AssignmentRow[];
  readonly transactionCount: () => number;
} {
  const diagnosticRows = [...(options.diagnosticRows ?? [diagnosticRow])];
  const assignments = [...(options.assignmentRows ?? [])];
  let transactions = 0;
  let pendingInsert: Record<string, unknown> | undefined;
  let pendingUpdate: Record<string, unknown> | undefined;

  const executor = {
    execute: async () => [],
    select: () => {
      let source: object | undefined;
      const builder: FakeBuilder = {
        from(currentSource) {
          source = currentSource;
          return builder;
        },
        where() {
          return builder;
        },
        orderBy: async () =>
          source === learningAssignments
            ? [...assignments].sort((left, right) =>
                left.moduleId.localeCompare(right.moduleId),
              )
            : [],
        limit: async () => (source === diagnosticResults ? diagnosticRows : []),
        values() {
          return builder;
        },
        onConflictDoNothing() {
          if (pendingInsert !== undefined) {
            const duplicate = assignments.some(
              (row) =>
                row.participantId === pendingInsert?.participantId &&
                row.scopeId === pendingInsert?.scopeId &&
                row.moduleId === pendingInsert?.moduleId,
            );
            if (!duplicate) assignments.push(pendingInsert as AssignmentRow);
            pendingInsert = undefined;
          }
          return builder;
        },
        set(values) {
          pendingUpdate = values;
          return builder;
        },
        returning: async () => {
          if (options.updateReturnsEmpty === true) return [];
          const index = assignments.findIndex(
            (row) => row.status === "NAO_ATRIBUIDO",
          );
          if (index < 0 || pendingUpdate === undefined) return [];
          assignments[index] = {
            ...assignments[index],
            ...pendingUpdate,
          } as AssignmentRow;
          pendingUpdate = undefined;
          return [{ id: assignments[index].id }];
        },
      };
      return builder;
    },
    insert: () => {
      const builder = executor.select();
      const originalValues = builder.values;
      builder.values = (row: Record<string, unknown>) => {
        pendingInsert = row;
        return originalValues(row);
      };
      return builder;
    },
    update: () => executor.select(),
    transaction: async (work: (current: unknown) => Promise<unknown>) => {
      transactions += 1;
      return work(executor);
    },
  };

  return {
    db: executor as unknown as FakeDatabase,
    assignments: () => assignments,
    transactionCount: () => transactions,
  };
}

describe("adaptive assignment persistence", () => {
  it("materializes the scoped curriculum and replays without duplicate rows", async () => {
    const fake = createFakeDatabase();
    let nextId = 0;
    const repository = createAdaptiveAssignmentRepository(fake.db, () => {
      nextId += 1;
      return `55555555-5555-4555-8555-55555555555${nextId}`;
    });

    const input = {
      diagnosticResultId,
      scopeId,
      moduleIds: ["M01", "M02", "M10", "M11"],
    } as const;
    const first = await repository.materializeCurriculumAssignments(input);
    const replay = await repository.materializeCurriculumAssignments(input);

    expect(first.participantId).toBe(participantId);
    expect(first.assignments.map(({ state }) => state.moduleId)).toEqual([
      "M01",
      "M02",
      "M10",
      "M11",
    ]);
    expect(
      first.assignments.every(({ state }) => state.status === "ATRIBUIDO"),
    ).toBe(true);
    expect(replay.assignments.map(({ state }) => state.assignmentId)).toEqual(
      first.assignments.map(({ state }) => state.assignmentId),
    );
    expect(fake.assignments()).toHaveLength(4);
    expect(fake.transactionCount()).toBe(2);
  });

  it("promotes an existing unassigned row with optimistic version control", async () => {
    const fake = createFakeDatabase({
      assignmentRows: [assignmentRow("M01", "NAO_ATRIBUIDO", 0)],
    });
    const repository = createAdaptiveAssignmentRepository(
      fake.db,
      () => "66666666-6666-4666-8666-666666666666",
    );

    const result = await repository.materializeCurriculumAssignments({
      diagnosticResultId,
      scopeId,
      moduleIds: ["M01", "M02"],
    });

    expect(result.assignments.map(({ state }) => state.status)).toEqual([
      "ATRIBUIDO",
      "ATRIBUIDO",
    ]);
    expect(result.assignments[0]?.state.version).toBe(1);
    expect(fake.assignments()).toHaveLength(2);
  });

  it("fails closed for missing results, invalid modules, and concurrent promotion", async () => {
    const missing = createFakeDatabase({ diagnosticRows: [] });
    const missingRepository = createAdaptiveAssignmentRepository(missing.db);
    await expect(
      missingRepository.materializeCurriculumAssignments({
        diagnosticResultId,
        scopeId,
        moduleIds: ["M01"],
      }),
    ).rejects.toBeInstanceOf(AdaptiveAssignmentNotFoundError);

    const invalid = createAdaptiveAssignmentRepository(missing.db);
    await expect(
      invalid.materializeCurriculumAssignments({
        diagnosticResultId,
        scopeId,
        moduleIds: ["M25"],
      }),
    ).rejects.toBeInstanceOf(AdaptiveAssignmentPersistenceError);

    const conflict = createFakeDatabase({
      assignmentRows: [assignmentRow("M01", "NAO_ATRIBUIDO", 0)],
      updateReturnsEmpty: true,
    });
    const conflictRepository = createAdaptiveAssignmentRepository(conflict.db);
    await expect(
      conflictRepository.materializeCurriculumAssignments({
        diagnosticResultId,
        scopeId,
        moduleIds: ["M01"],
      }),
    ).rejects.toBeInstanceOf(AdaptiveAssignmentConflictError);
  });
});
