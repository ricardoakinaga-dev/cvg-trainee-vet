import { describe, expect, it } from "vitest";

import {
  buildCriticalDecisionCoverageReport,
  validateCriticalDecisionCoverage,
} from "../../scripts/verify-critical-decision-coverage.mjs";

function syntheticCoverage(branches: number[]) {
  return {
    "packages/domain/src/assessment-policy.ts": {
      b: { 0: branches },
    },
    "packages/domain/src/content.ts": { b: { 0: [1, 1] } },
    "packages/application/src/authorization.ts": { b: { 0: [1, 1] } },
    "packages/domain/src/learning-state.ts": { b: { 0: [1, 1] } },
    "packages/application/src/attempt-use-cases.ts": { b: { 0: [1, 1] } },
    "packages/contracts/src/learning-state.ts": { b: { 0: [1, 1] } },
    "packages/domain/src/critical-decision-matrix.ts": { b: { 0: [1, 1] } },
  };
}

describe("critical decision coverage gate", () => {
  it("accepts complete coverage for every critical decision", () => {
    const coverage = syntheticCoverage([1, 1, 1, 1]);

    expect(validateCriticalDecisionCoverage(coverage)).toEqual([]);
    expect(buildCriticalDecisionCoverageReport(coverage)).toMatchObject({
      status: "PASS",
      task: "ENT95-05-C",
      decisionCount: 7,
      matrixCaseCount: 13,
    });
  });

  it("rejects missing and under-covered decision modules", () => {
    const coverage = syntheticCoverage([1, 0]);
    delete coverage["packages/domain/src/content.ts"];

    expect(validateCriticalDecisionCoverage(coverage)).toEqual(
      expect.arrayContaining([
        "NOTA branch coverage 50% is below 100%",
        "PUBLICACAO coverage is missing for packages/domain/src/content.ts",
      ]),
    );
  });
});
