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

  it("rejects malformed blueprint, bank, timestamp and random boundaries", () => {
    const invalidBlueprints: readonly [unknown, string][] = [
      [{ ...blueprint, id: " " }, "blueprint.id"],
      [{ ...blueprint, version: " " }, "blueprint.version"],
      [{ ...blueprint, itemCount: 0 }, "itemCount"],
      [{ ...blueprint, timeLimitMinutes: 0 }, "timeLimitMinutes"],
      [{ ...blueprint, objectiveItemCounts: {} }, "objectiveItemCounts"],
      [{ ...blueprint, itemCount: 21 }, "equal"],
    ];
    for (const [invalidBlueprint, message] of invalidBlueprints) {
      expect(() =>
        createSummativeExamSelection({
          blueprint: invalidBlueprint as never,
          bank: bank(),
          now: "2026-08-14T12:00:00.000Z",
          random: () => 0.5,
        }),
      ).toThrow(message);
    }

    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank().map((item, index) =>
          index === 0 ? { ...item, id: " " } : item,
        ),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("bank item id");
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank().map((item, index) =>
          index === 0 ? { ...item, objectiveId: " " } : item,
        ),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("objectiveId");
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank().map((item, index) =>
          index === 0 ? { ...item, choices: [{ id: "a", text: "A" }] } : item,
        ),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("at least two");
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank().map((item, index) =>
          index === 0
            ? {
                ...item,
                choices: [
                  { id: "a", text: "A" },
                  { id: "a", text: "B" },
                ],
              }
            : item,
        ),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("unique");
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank().map((item, index) =>
          index === 0
            ? {
                ...item,
                choices: [
                  { id: "a", text: "<b>A</b>" },
                  { id: "b", text: "B" },
                ],
              }
            : item,
        ),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("plain text");
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank().map((item, index) =>
          index === 0
            ? {
                ...item,
                choices: [
                  { id: " ", text: "A" },
                  { id: "b", text: "B" },
                ],
              }
            : item,
        ),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("choice id");
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank(),
        now: "invalid",
        random: () => 0.5,
      }),
    ).toThrow("timestamp");
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: bank(),
        now: "2026-08-14T12:00:00.000Z",
        random: () => 1,
      }),
    ).toThrow("random");
    expect(() =>
      createSummativeExamSelection({
        blueprint,
        bank: [...bank(), bank()[0]!],
        now: "2026-08-14T12:00:00.000Z",
        random: () => 0.5,
      }),
    ).toThrow("bank item ids");
  });
});
