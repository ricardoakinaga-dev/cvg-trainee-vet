import { expect, it } from "vitest";

import {
  buildSub80To95Report,
  loadSub80To95Program,
  validateSub80To95Program,
} from "../../scripts/verify-sub80-to-95-program.mjs";

it("accepts only the six audited items below 80 and preserves their canonical task states", () => {
  const program = loadSub80To95Program();

  expect(validateSub80To95Program(program)).toEqual([]);
  expect(buildSub80To95Report(program)).toMatchObject({
    programId: "CVG-SUB80-TO-95",
    baselineWeightedScore: 83.24,
    targetFloor: 95,
    itemNumbers: [3, 9, 10, 12, 13, 16],
    itemCount: 6,
    taskCount: 29,
    sprintCount: 13,
    durationWeeks: 24,
    statusCounts: {
      COMPLETED: 3,
      IN_PROGRESS: 3,
      READY_FOR_NEXT_STEP: 12,
      WAITING_HUMAN_APPROVAL: 11,
    },
    releaseDisposition: "PILOT_BLOCKED",
  });
});

it("rejects an item outside the sub-80 baseline or an unsupported score promotion", () => {
  const program = loadSub80To95Program();
  const invalidProgram = {
    ...program,
    items: [
      ...program.items.slice(0, -1),
      {
        ...program.items.at(-1)!,
        item: 14,
        baselineScore: 93,
        targetScore: 96,
      },
    ],
    scorePolicy: {
      ...program.scorePolicy,
      promotionAuthority: "PROGRAM_MANAGER",
    },
  };

  expect(validateSub80To95Program(invalidProgram)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("exactly items 3, 9, 10, 12, 13 and 16"),
      expect.stringContaining("baselineScore must be below 80"),
      expect.stringContaining("targetScore must be exactly 95"),
      expect.stringContaining("INDEPENDENT_REAUDIT"),
    ]),
  );
});

it("rejects missing execution evidence, ownership or canonical task coverage", () => {
  const program = loadSub80To95Program();
  const invalidProgram = {
    ...program,
    items: program.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            owner: "",
            exitCriteria: [],
            evidenceRequired: [],
            taskIds: item.taskIds.slice(1),
          }
        : item,
    ),
    gates: program.gates.slice(1),
  };

  expect(validateSub80To95Program(invalidProgram)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("owner"),
      expect.stringContaining("exit criteria"),
      expect.stringContaining("evidence"),
      expect.stringContaining("task coverage"),
      expect.stringContaining("G-S80-0"),
    ]),
  );
});

it("rejects drift from the audited baseline and canonical task status", () => {
  const program = loadSub80To95Program();
  const invalidProgram = {
    ...program,
    items: program.items.map((item) =>
      item.item === 3 ? { ...item, baselineScore: 71, gap: 24 } : item,
    ),
    tasks: program.tasks.map((task) =>
      task.id === "ENT95-03-A"
        ? { ...task, status: "READY_FOR_NEXT_STEP" }
        : task,
    ),
  };

  expect(validateSub80To95Program(invalidProgram)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("item 3 baselineScore must remain 72"),
      expect.stringContaining("task ENT95-03-A status must remain COMPLETED"),
    ]),
  );
});

it("rejects a sprint count that disagrees with the S0-S12 execution map", () => {
  const program = loadSub80To95Program();

  expect(validateSub80To95Program({ ...program, sprintCount: 12 })).toContain(
    "sprintCount must be 13 for the S0-S12 execution map",
  );
});
