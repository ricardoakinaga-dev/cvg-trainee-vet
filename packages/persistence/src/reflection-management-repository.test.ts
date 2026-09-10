import { describe, expect, it } from "vitest";

import {
  createReflectionManagementReadRepository,
  reflectionManagementRowsToInstances,
  type ReflectionManagementRowShape,
} from "./reflection-management-repository.js";
import { createFakeDatabase } from "./test-support/fake-database.js";

const participantId = "22222222-2222-4222-8222-222222222222";
const activityId = "33333333-3333-4333-8333-333333333333";
const moduleId = "M02";
const itemOne = "44444444-4444-4444-8444-444444444444";
const itemTwo = "55555555-5555-4555-8555-555555555555";
const attemptId = "66666666-6666-4666-8666-666666666666";

function row(
  overrides: Partial<ReflectionManagementRowShape> = {},
): ReflectionManagementRowShape {
  return {
    participantId,
    activityId,
    moduleId,
    itemId: itemOne,
    attemptId: null,
    attemptStatus: null,
    attemptVersion: null,
    attemptUpdatedAt: null,
    answeredItemId: null,
    ...overrides,
  };
}

describe("reflection management persistence mapping", () => {
  it("counts items from the latest attempt without carrying response text", () => {
    const instances = reflectionManagementRowsToInstances([
      row({
        itemId: itemOne,
        attemptId: "77777777-7777-4777-8777-777777777777",
        attemptStatus: "EM_ANDAMENTO",
        attemptVersion: 1,
        attemptUpdatedAt: new Date("2026-08-23T10:00:00.000Z"),
        answeredItemId: itemOne,
      }),
      row({
        itemId: itemTwo,
        attemptId: "77777777-7777-4777-8777-777777777777",
        attemptStatus: "EM_ANDAMENTO",
        attemptVersion: 1,
        attemptUpdatedAt: new Date("2026-08-23T10:00:00.000Z"),
      }),
      row({
        itemId: itemOne,
        attemptId,
        attemptStatus: "SUBMETIDA",
        attemptVersion: 2,
        attemptUpdatedAt: new Date("2026-08-23T11:00:00.000Z"),
      }),
      row({
        itemId: itemTwo,
        attemptId,
        attemptStatus: "SUBMETIDA",
        attemptVersion: 2,
        attemptUpdatedAt: new Date("2026-08-23T11:00:00.000Z"),
        answeredItemId: itemTwo,
      }),
    ]);

    expect(instances).toEqual([
      {
        participantId,
        activityId,
        moduleId,
        itemCount: 2,
        answeredItemCount: 1,
        attemptStatus: "SUBMETIDA",
      },
    ]);
  });

  it("keeps an assignment without attempts as not started and rejects inconsistent groups", () => {
    expect(
      reflectionManagementRowsToInstances([row(), row({ itemId: itemTwo })]),
    ).toEqual([
      {
        participantId,
        activityId,
        moduleId,
        itemCount: 2,
        answeredItemCount: 0,
      },
    ]);

    expect(() =>
      reflectionManagementRowsToInstances([row(), row({ moduleId: "M03" })]),
    ).toThrowError(/module/u);
  });
});

describe("reflection management rows validation", () => {
  it("rejects rows with missing identity or conflicting modules", () => {
    expect(() =>
      reflectionManagementRowsToInstances([row({ participantId: " " })]),
    ).toThrow();
    expect(() =>
      reflectionManagementRowsToInstances([row({ activityId: "" })]),
    ).toThrow();
    expect(() =>
      reflectionManagementRowsToInstances([row({ moduleId: " " })]),
    ).toThrow();
    expect(() =>
      reflectionManagementRowsToInstances([row({ itemId: " " })]),
    ).toThrow();
    expect(() =>
      reflectionManagementRowsToInstances([
        row({ itemId: itemOne }),
        row({ itemId: itemTwo, moduleId: "M03" }),
      ]),
    ).toThrow("multiple modules");
  });

  it("rejects inconsistent answer and attempt metadata", () => {
    expect(() =>
      reflectionManagementRowsToInstances([
        row({ answeredItemId: itemTwo }),
      ]),
    ).toThrow("does not match");
    expect(() =>
      reflectionManagementRowsToInstances([
        row({ attemptId, attemptStatus: "SALVA" }),
      ]),
    ).toThrow("incomplete");
    expect(() =>
      reflectionManagementRowsToInstances([
        row({
          attemptId: null,
          attemptStatus: "SALVA",
          attemptVersion: 1,
          attemptUpdatedAt: "2026-08-10T01:00:00.000Z",
        }),
      ]),
    ).toThrow("without attempt");
    expect(() =>
      reflectionManagementRowsToInstances([
        row({
          attemptId,
          attemptStatus: "QUEBRADA",
          attemptVersion: 1,
          attemptUpdatedAt: "2026-08-10T01:00:00.000Z",
        }),
      ]),
    ).toThrow("invalid");
    expect(() =>
      reflectionManagementRowsToInstances([
        row({
          attemptId,
          attemptStatus: "SALVA",
          attemptVersion: 1,
          attemptUpdatedAt: "not-a-date",
        }),
      ]),
    ).toThrow();
    expect(() =>
      reflectionManagementRowsToInstances([
        row({
          attemptId,
          attemptStatus: "SALVA",
          attemptVersion: -1,
          attemptUpdatedAt: "2026-08-10T01:00:00.000Z",
        }),
      ]),
    ).toThrow("invalid");
  });

  it("rejects invalid versions when comparing attempt rows", () => {
    const base = row({
      attemptId,
      attemptStatus: "SALVA",
      attemptVersion: 1,
      attemptUpdatedAt: "2026-08-10T01:00:00.000Z",
    });
    expect(() =>
      reflectionManagementRowsToInstances([
        base,
        row({
          attemptId: "other",
          attemptStatus: "SALVA",
          attemptVersion: 1.5,
          attemptUpdatedAt: "2026-08-10T01:00:00.000Z",
        }),
      ]),
    ).toThrow("version");
  });
});

describe("reflection management read repository", () => {
  const reflectionRow: ReflectionManagementRowShape = {
    participantId,
    activityId,
    moduleId,
    itemId: itemOne,
    attemptId,
    attemptStatus: "SALVA",
    attemptVersion: 3,
    attemptUpdatedAt: "2026-08-10T01:00:00.000Z",
    answeredItemId: itemOne,
  };

  function repository(db: ReturnType<typeof createFakeDatabase>) {
    return createReflectionManagementReadRepository(
      db as unknown as Parameters<typeof createReflectionManagementReadRepository>[0],
      { now: () => new Date("2026-08-10T02:00:00.000Z") },
    );
  }

  it("rejects empty scopes and invalid timestamps", async () => {
    const db = createFakeDatabase();
    await expect(
      repository(db).findReflectionManagement({
        scopeId: " ",
      }),
    ).rejects.toThrow("required");
    const badClock = createReflectionManagementReadRepository(
      db as unknown as Parameters<typeof createReflectionManagementReadRepository>[0],
      { now: () => new Date("invalid") },
    );
    await expect(
      badClock.findReflectionManagement({
        scopeId: "99999999-9999-4999-8999-999999999999",
      }),
    ).rejects.toThrow("invalid");
  });

  it("aggregates reflections for every participant", async () => {
    const db = createFakeDatabase({
      rows: [[], [{ participantId }], [], [reflectionRow]],
    });
    const state = await repository(db).findReflectionManagement({
      scopeId: "99999999-9999-4999-8999-999999999999",
    });
    expect(state.modules).toHaveLength(1);
    expect(state.modules[0]).toMatchObject({ moduleId, totalAssignments: 1 });
  });

  it("returns an empty aggregate when there are no participants", async () => {
    const db = createFakeDatabase({ rows: [[], []] });
    const state = await repository(db).findReflectionManagement({
      scopeId: "99999999-9999-4999-8999-999999999999",
    });
    expect(state.modules).toHaveLength(0);
  });
});
