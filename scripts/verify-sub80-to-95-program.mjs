import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PROGRAM_PATH = new URL("../sub80-to-95-program.json", import.meta.url);
const EXPECTED_ITEMS = [3, 9, 10, 12, 13, 16];
const EXPECTED_BASELINE_SCORES = new Map([
  [3, 72],
  [9, 75],
  [10, 68],
  [12, 78],
  [13, 78],
  [16, 65],
]);
const EXPECTED_TASK_IDS = {
  3: [
    "ENT95-03-A",
    "ENT95-03-B",
    "ENT95-03-C",
    "ENT95-03-D",
    "ENT95-03-E",
    "ENT95-03-F",
  ],
  9: ["ENT95-09-A", "ENT95-09-B", "ENT95-09-C", "ENT95-09-D", "ENT95-09-E"],
  10: ["ENT95-10-A", "ENT95-10-B", "ENT95-10-C", "ENT95-10-D", "ENT95-10-E"],
  12: ["ENT95-12-A", "ENT95-12-B", "ENT95-12-C", "ENT95-12-D", "ENT95-12-E"],
  13: ["ENT95-13-A", "ENT95-13-B", "ENT95-13-C", "ENT95-13-D"],
  16: ["ENT95-16-A", "ENT95-16-B", "ENT95-16-C", "ENT95-16-D"],
};
const REQUIRED_GATES = Array.from(
  { length: 10 },
  (_, index) => `G-S80-${index}`,
);
const ALLOWED_STATUSES = new Set([
  "COMPLETED",
  "IN_PROGRESS",
  "READY_FOR_NEXT_STEP",
  "WAITING_HUMAN_APPROVAL",
]);
const EXPECTED_TASK_STATUSES = new Map(
  Object.entries({
    COMPLETED: ["ENT95-03-A", "ENT95-09-B", "ENT95-10-A"],
    IN_PROGRESS: ["ENT95-12-B", "ENT95-13-B", "ENT95-16-B"],
    WAITING_HUMAN_APPROVAL: [
      "ENT95-03-B",
      "ENT95-03-D",
      "ENT95-03-E",
      "ENT95-03-F",
      "ENT95-09-E",
      "ENT95-10-B",
      "ENT95-10-E",
      "ENT95-12-A",
      "ENT95-12-C",
      "ENT95-13-C",
      "ENT95-16-A",
    ],
    READY_FOR_NEXT_STEP: [
      "ENT95-03-C",
      "ENT95-09-A",
      "ENT95-09-C",
      "ENT95-09-D",
      "ENT95-10-C",
      "ENT95-10-D",
      "ENT95-12-D",
      "ENT95-12-E",
      "ENT95-13-A",
      "ENT95-13-D",
      "ENT95-16-C",
      "ENT95-16-D",
    ],
  }).flatMap(([status, taskIds]) => taskIds.map((taskId) => [taskId, status])),
);

export function loadSub80To95Program() {
  return JSON.parse(readFileSync(PROGRAM_PATH, "utf8"));
}

export function validateSub80To95Program(program) {
  const errors = [];
  const itemNumbers = program.items?.map((item) => item.item) ?? [];
  const sortedItems = [...itemNumbers].sort((left, right) => left - right);

  if (JSON.stringify(sortedItems) !== JSON.stringify(EXPECTED_ITEMS)) {
    errors.push("program must contain exactly items 3, 9, 10, 12, 13 and 16");
  }
  if (new Set(itemNumbers).size !== itemNumbers.length) {
    errors.push("program item numbers must be unique");
  }
  if (program.scopePolicy?.rule !== "ONLY_AUDITED_ITEMS_BELOW_80") {
    errors.push("scope policy must remain ONLY_AUDITED_ITEMS_BELOW_80");
  }
  if (program.scorePolicy?.promotionAuthority !== "INDEPENDENT_REAUDIT") {
    errors.push("score promotion authority must remain INDEPENDENT_REAUDIT");
  }
  if (program.scorePolicy?.currentScoresFrozen !== true) {
    errors.push("current scores must remain frozen until independent re-audit");
  }
  if (program.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push(
      "release disposition must remain PILOT_BLOCKED during planning",
    );
  }
  if (program.sprintCount !== 13) {
    errors.push("sprintCount must be 13 for the S0-S12 execution map");
  }
  if (program.durationWeeks !== 24) {
    errors.push(
      "durationWeeks must remain 24 unless the roadmap is rebaselined",
    );
  }

  for (const item of program.items ?? []) {
    const expectedBaselineScore = EXPECTED_BASELINE_SCORES.get(item.item);
    if (
      expectedBaselineScore !== undefined &&
      item.baselineScore !== expectedBaselineScore
    ) {
      errors.push(
        `item ${item.item} baselineScore must remain ${expectedBaselineScore}`,
      );
    }
    if (!Number.isFinite(item.baselineScore) || item.baselineScore >= 80) {
      errors.push(`item ${item.item} baselineScore must be below 80`);
    }
    if (item.targetScore !== 95) {
      errors.push(`item ${item.item} targetScore must be exactly 95`);
    }
    if (item.gap !== item.targetScore - item.baselineScore) {
      errors.push(
        `item ${item.item} gap must equal targetScore - baselineScore`,
      );
    }
    if (typeof item.owner !== "string" || item.owner.trim() === "") {
      errors.push(`item ${item.item} must have an owner`);
    }
    if (!Array.isArray(item.exitCriteria) || item.exitCriteria.length < 4) {
      errors.push(`item ${item.item} must have at least four exit criteria`);
    }
    if (
      !Array.isArray(item.evidenceRequired) ||
      item.evidenceRequired.length < 4
    ) {
      errors.push(
        `item ${item.item} must have at least four required evidence records`,
      );
    }
    const expectedTaskIds = EXPECTED_TASK_IDS[item.item] ?? [];
    if (JSON.stringify(item.taskIds) !== JSON.stringify(expectedTaskIds)) {
      errors.push(
        `item ${item.item} task coverage must match the canonical ENT95 backlog`,
      );
    }
  }

  const taskIds = program.tasks?.map((task) => task.id) ?? [];
  if (taskIds.length !== 29 || new Set(taskIds).size !== taskIds.length) {
    errors.push("program must contain 29 unique canonical tasks");
  }
  for (const task of program.tasks ?? []) {
    if (!EXPECTED_ITEMS.includes(task.item)) {
      errors.push(`task ${task.id} targets an item outside the sub-80 scope`);
    }
    if (!EXPECTED_TASK_IDS[task.item]?.includes(task.id)) {
      errors.push(`task ${task.id} is not canonical for item ${task.item}`);
    }
    if (!ALLOWED_STATUSES.has(task.status)) {
      errors.push(`task ${task.id} has an unsupported status`);
    }
    const expectedTaskStatus = EXPECTED_TASK_STATUSES.get(task.id);
    if (task.status !== expectedTaskStatus) {
      errors.push(
        `task ${task.id} status must remain ${expectedTaskStatus} until reconciled with the canonical backlog`,
      );
    }
    if (typeof task.owner !== "string" || task.owner.trim() === "") {
      errors.push(`task ${task.id} must have an owner`);
    }
    if (!Array.isArray(task.sprints) || task.sprints.length === 0) {
      errors.push(`task ${task.id} must be assigned to at least one sprint`);
    }
  }

  const gateIds = new Set((program.gates ?? []).map((gate) => gate.id));
  for (const gateId of REQUIRED_GATES) {
    if (!gateIds.has(gateId)) {
      errors.push(`required gate ${gateId} is missing`);
    }
  }
  for (const deliverable of Object.values(program.deliverables ?? {})) {
    try {
      readFileSync(new URL(`../${deliverable}`, import.meta.url), "utf8");
    } catch {
      errors.push(`declared deliverable does not exist: ${deliverable}`);
    }
  }
  for (const sourceDocument of program.sourceDocuments ?? []) {
    try {
      readFileSync(new URL(`../${sourceDocument}`, import.meta.url), "utf8");
    } catch {
      errors.push(`source document does not exist: ${sourceDocument}`);
    }
  }

  return errors;
}

export function buildSub80To95Report(program) {
  const statusCounts = Object.fromEntries(
    [...ALLOWED_STATUSES].map((status) => [
      status,
      program.tasks.filter((task) => task.status === status).length,
    ]),
  );
  return {
    programId: program.programId,
    baselineWeightedScore: program.baselineWeightedScore,
    targetFloor: program.targetFloor,
    itemNumbers: program.items.map((item) => item.item),
    itemCount: program.items.length,
    taskCount: program.tasks.length,
    statusCounts,
    gateCount: program.gates.length,
    sprintCount: program.sprintCount,
    durationWeeks: program.durationWeeks,
    releaseDisposition: program.releaseDisposition,
  };
}

function main() {
  const program = loadSub80To95Program();
  const errors = validateSub80To95Program(program);
  if (errors.length > 0) {
    console.error("SUB80_TO_95_PROGRAM_FAIL");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  const report = buildSub80To95Report(program);
  console.log(
    `SUB80_TO_95_PROGRAM_PASS id=${report.programId} items=${report.itemCount} tasks=${report.taskCount} sprints=${report.sprintCount} weeks=${report.durationWeeks} gates=${report.gateCount} target=${report.targetFloor} disposition=${report.releaseDisposition}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export { ROOT };
