import { readFile } from "node:fs/promises";

import {
  createCurriculumMaterializationPlan,
  curriculumV3,
} from "../packages/curriculum/dist/index.js";

const INVENTORY_PATH = "curriculum-inventory.json";
const DEFAULT_INPUT = Object.freeze({
  scopeId: "11111111-1111-4111-8111-111111111111",
  authorId: "22222222-2222-4222-8222-222222222222",
  participantId: "450e95ed-452c-445a-a6e4-066fe771394c",
  availableAt: "2026-01-01T00:00:00.000Z",
});

function freeze(value) {
  return Object.freeze(value);
}

export function buildCurriculumInventoryExpectation(input = DEFAULT_INPUT) {
  const plan = createCurriculumMaterializationPlan(input);
  const modules = plan.modules.map((module) =>
    freeze({
      moduleId: module.moduleId,
      itemCount: module.items.length,
      objectiveCount: new Set(module.items.map((item) => item.objectiveId))
        .size,
      criticalItemCount: module.items.filter(
        (item) => item.authoringItem.critical,
      ).length,
      contentStatus: module.contentStatus,
      releaseDisposition: "PILOT_BLOCKED",
    }),
  );
  const riskPriorityOrder = [...modules]
    .sort(
      (left, right) =>
        right.criticalItemCount - left.criticalItemCount ||
        left.moduleId.localeCompare(right.moduleId),
    )
    .map((module) => module.moduleId);

  return freeze({
    curriculumId: "CVG-CURRICULUM-24M",
    curriculumVersion: "3.0.0",
    moduleCount: modules.length,
    sessionCount: curriculumV3.modules.reduce(
      (total, module) => total + module.sessions.length,
      0,
    ),
    contentCount: modules.reduce(
      (total, module) => total + module.itemCount,
      0,
    ),
    modules: freeze(modules),
    riskPriorityOrder: freeze(riskPriorityOrder),
  });
}

export function validateCurriculumInventory(inventory, expectation) {
  const errors = [];
  if (inventory.version !== 1) {
    errors.push("inventory version must be 1");
  }
  if (inventory.curriculumId !== expectation.curriculumId) {
    errors.push("curriculum id does not match the canonical catalog");
  }
  if (inventory.curriculumVersion !== expectation.curriculumVersion) {
    errors.push("curriculum version does not match the canonical catalog");
  }
  if (inventory.moduleCount !== expectation.moduleCount) {
    errors.push(`module count must equal ${expectation.moduleCount}`);
  }
  if (inventory.sessionCount !== expectation.sessionCount) {
    errors.push(`session count must equal ${expectation.sessionCount}`);
  }
  if (inventory.contentCount !== expectation.contentCount) {
    errors.push(`content count must equal ${expectation.contentCount}`);
  }
  if (inventory.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push("release disposition must remain PILOT_BLOCKED");
  }

  const expectedModules = new Map(
    expectation.modules.map((module) => [module.moduleId, module]),
  );
  const seenModules = new Set();
  for (const module of inventory.modules ?? []) {
    if (seenModules.has(module.moduleId)) {
      errors.push(`inventory module ${module.moduleId} is duplicated`);
    }
    seenModules.add(module.moduleId);
    const expected = expectedModules.get(module.moduleId);
    if (expected === undefined) {
      errors.push(`inventory module is unknown: ${module.moduleId}`);
      continue;
    }
    for (const field of [
      "itemCount",
      "objectiveCount",
      "criticalItemCount",
      "contentStatus",
      "releaseDisposition",
    ]) {
      if (module[field] !== expected[field]) {
        errors.push(
          `${module.moduleId} ${field} does not match canonical catalog`,
        );
      }
    }
  }

  const expectedModuleIds = expectation.modules.map(
    (module) => module.moduleId,
  );
  if (
    JSON.stringify([...seenModules].sort()) !==
    JSON.stringify([...expectedModuleIds].sort())
  ) {
    errors.push("inventory modules do not match the canonical module set");
  }

  if (
    JSON.stringify(inventory.riskPriorityOrder ?? []) !==
    JSON.stringify(expectation.riskPriorityOrder)
  ) {
    errors.push("risk priority order must contain each module exactly once");
  }

  return freeze(errors);
}

export async function loadCurriculumInventory(source = INVENTORY_PATH) {
  if (typeof source === "object" && source !== null) return source;
  return JSON.parse(await readFile(source, "utf8"));
}

async function main() {
  const inventory = await loadCurriculumInventory();
  const expectation = buildCurriculumInventoryExpectation();
  const errors = validateCurriculumInventory(inventory, expectation);
  if (errors.length > 0) {
    console.error(
      `curriculum inventory gate failed (${errors.length} findings):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify(
      {
        status: "PASS_WITH_PLANNED_CLINICAL_REVIEW",
        curriculumId: expectation.curriculumId,
        curriculumVersion: expectation.curriculumVersion,
        moduleCount: expectation.moduleCount,
        sessionCount: expectation.sessionCount,
        contentCount: expectation.contentCount,
        riskPriorityOrder: expectation.riskPriorityOrder,
        releaseDisposition: inventory.releaseDisposition,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.endsWith("verify-curriculum-inventory.mjs")) {
  await main();
}
