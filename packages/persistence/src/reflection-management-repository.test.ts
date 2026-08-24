import { describe, expect, it } from "vitest";

import {
  reflectionManagementRowsToInstances,
  type ReflectionManagementRowShape,
} from "./reflection-management-repository.js";

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
