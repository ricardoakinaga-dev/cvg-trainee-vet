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

it("preserves the exact ordered diagnostics for every validation group", () => {
  const program = loadSub80To95Program();
  const invalidProgram = {
    ...program,
    scopePolicy: { ...program.scopePolicy, rule: "BROADER_SCOPE" },
    scorePolicy: {
      ...program.scorePolicy,
      promotionAuthority: "PROGRAM_MANAGER",
      currentScoresFrozen: false,
    },
    releaseDisposition: "PILOT_APPROVED",
    sprintCount: 12,
    durationWeeks: 25,
    items: program.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            baselineScore: 81,
            targetScore: 94,
            gap: 0,
            owner: "",
            exitCriteria: [],
            evidenceRequired: [],
            taskIds: [],
          }
        : index === program.items.length - 1
          ? { ...item, item: 3, baselineScore: 72, gap: 23 }
          : item,
    ),
    tasks: [
      {
        ...program.tasks[0],
        item: 14,
        status: "UNSUPPORTED_STATUS",
        owner: "",
        sprints: [],
      },
      ...program.tasks.slice(1, -1),
    ],
    gates: [],
    deliverables: {
      ...program.deliverables,
      missing: "missing-deliverable.md",
    },
    sourceDocuments: [...program.sourceDocuments, "missing-source.md"],
  };

  expect(validateSub80To95Program(invalidProgram)).toEqual([
    "program must contain exactly items 3, 9, 10, 12, 13 and 16",
    "program item numbers must be unique",
    "scope policy must remain ONLY_AUDITED_ITEMS_BELOW_80",
    "score promotion authority must remain INDEPENDENT_REAUDIT",
    "current scores must remain frozen until independent re-audit",
    "release disposition must remain PILOT_BLOCKED during planning",
    "sprintCount must be 13 for the S0-S12 execution map",
    "durationWeeks must remain 24 unless the roadmap is rebaselined",
    "item 3 baselineScore must remain 72",
    "item 3 baselineScore must be below 80",
    "item 3 targetScore must be exactly 95",
    "item 3 gap must equal targetScore - baselineScore",
    "item 3 must have an owner",
    "item 3 must have at least four exit criteria",
    "item 3 must have at least four required evidence records",
    "item 3 task coverage must match the canonical ENT95 backlog",
    "item 3 task coverage must match the canonical ENT95 backlog",
    "program must contain 29 unique canonical tasks",
    "task ENT95-03-A targets an item outside the sub-80 scope",
    "task ENT95-03-A is not canonical for item 14",
    "task ENT95-03-A has an unsupported status",
    "task ENT95-03-A status must remain COMPLETED until reconciled with the canonical backlog",
    "task ENT95-03-A must have an owner",
    "task ENT95-03-A must be assigned to at least one sprint",
    "required gate G-S80-0 is missing",
    "required gate G-S80-1 is missing",
    "required gate G-S80-2 is missing",
    "required gate G-S80-3 is missing",
    "required gate G-S80-4 is missing",
    "required gate G-S80-5 is missing",
    "required gate G-S80-6 is missing",
    "required gate G-S80-7 is missing",
    "required gate G-S80-8 is missing",
    "required gate G-S80-9 is missing",
    "declared deliverable does not exist: missing-deliverable.md",
    "source document does not exist: missing-source.md",
  ]);
});
