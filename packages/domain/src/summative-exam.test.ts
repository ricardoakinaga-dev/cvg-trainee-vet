import { describe, expect, it } from "vitest";

import { createSummativeExamSelection } from "./summative-exam.js";

const blueprint = {
  id: "B07-SOMATIVA-V1",
  version: "1.0.0",
  itemCount: 20,
  timeLimitMinutes: 45,
  windowMinutes: 60,
  objectiveItemCounts: {
    "OBJ-01": 10,
    "OBJ-02": 10,
  },
} as const;

function bank() {
  return Array.from({ length: 30 }, (_, index) => ({
    id: `ITEM-${String(index + 1).padStart(2, "0")}`,
    objectiveId: index < 15 ? "OBJ-01" : "OBJ-02",
    choices: [
      { id: "a", text: "Alternativa A" },
      { id: "b", text: "Alternativa B" },
      { id: "c", text: "Alternativa C" },
    ],
  }));
}

describe("summative exam selection", () => {
  it("enforces a larger bank and a valid exam window", () => {
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank().slice(0, 29),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("at least 1.5 times");

    expect(() =>
      createSummativeExamSelection({
        blueprint: { ...blueprint, windowMinutes: 30 },
        bank: bank(),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("windowMinutes");

    expect(() =>
      createSummativeExamSelection({
        blueprint: {
          ...blueprint,
          itemCount: 19,
          objectiveItemCounts: { "OBJ-01": 9, "OBJ-02": 10 },
        },
        bank: bank(),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("from 10 to 15");
  });

  it("selects by objective, shuffles copies, and exposes the time window", () => {
    const source = bank();
    const selection = createSummativeExamSelection({
      blueprint,
      bank: source,
      now: "2026-08-14T12:00:00.000Z",
      random: () => 0.75,
    });

    expect(selection).toMatchObject({
      blueprintId: "B07-SOMATIVA-V1",
      blueprintVersion: "1.0.0",
      timeLimitMinutes: 45,
      windowMinutes: 60,
      availableFrom: "2026-08-14T12:00:00.000Z",
      expiresAt: "2026-08-14T13:00:00.000Z",
    });
    expect(selection.items).toHaveLength(20);
    expect(new Set(selection.items.map((item) => item.id)).size).toBe(20);
    expect(
      selection.items.filter((item) => item.objectiveId === "OBJ-01"),
    ).toHaveLength(10);
    expect(
      selection.items.filter((item) => item.objectiveId === "OBJ-02"),
    ).toHaveLength(10);
    expect(selection.items[0]?.choices).not.toBe(source[0]?.choices);
    expect(source[0]?.choices.map((choice) => choice.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(Object.isFrozen(selection)).toBe(true);
    expect(Object.isFrozen(selection.items)).toBe(true);
  });
});
