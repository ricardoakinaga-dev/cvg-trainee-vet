import { expect, it } from "vitest";

import {
  loadCurriculumInventory,
  validateCurriculumInventory,
} from "../../scripts/verify-curriculum-inventory.mjs";

const expectation = {
  curriculumId: "CVG-CURRICULUM-24M",
  curriculumVersion: "3.0.0",
  moduleCount: 2,
  sessionCount: 8,
  contentCount: 4,
  modules: [
    {
      moduleId: "M01",
      itemCount: 2,
      objectiveCount: 1,
      criticalItemCount: 2,
      contentStatus: "PROJECAO_VERIFICADA",
      releaseDisposition: "PILOT_BLOCKED",
    },
    {
      moduleId: "M02",
      itemCount: 2,
      objectiveCount: 1,
      criticalItemCount: 3,
      contentStatus: "PROJECAO_VERIFICADA",
      releaseDisposition: "PILOT_BLOCKED",
    },
  ],
  riskPriorityOrder: ["M02", "M01"],
};

it("accepts the versioned inventory with risk-first ordering", async () => {
  const inventory = await loadCurriculumInventory({
    version: 1,
    curriculumId: expectation.curriculumId,
    curriculumVersion: expectation.curriculumVersion,
    moduleCount: expectation.moduleCount,
    sessionCount: expectation.sessionCount,
    contentCount: expectation.contentCount,
    releaseDisposition: "PILOT_BLOCKED",
    riskPriorityOrder: ["M02", "M01"],
    modules: expectation.modules,
  });

  expect(validateCurriculumInventory(inventory, expectation)).toEqual([]);
});

it("rejects drift, duplicate modules and a release disposition that is not blocked", () => {
  const inventory = {
    version: 1,
    curriculumId: expectation.curriculumId,
    curriculumVersion: expectation.curriculumVersion,
    moduleCount: 3,
    sessionCount: 8,
    contentCount: 4,
    releaseDisposition: "RELEASE_READY",
    riskPriorityOrder: ["M01", "M01"],
    modules: [expectation.modules[0], expectation.modules[0]],
  };

  expect(validateCurriculumInventory(inventory, expectation)).toEqual([
    "module count must equal 2",
    "release disposition must remain PILOT_BLOCKED",
    "inventory module M01 is duplicated",
    "inventory modules do not match the canonical module set",
    "risk priority order must contain each module exactly once",
  ]);
});
