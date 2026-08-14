import { describe, expect, it } from "vitest";

import {
  criticalDecisionMatrix,
  validateCriticalDecisionMatrix,
} from "./critical-decision-matrix.js";

describe("critical decision matrix", () => {
  it("requires both safe and rejected outcomes for every critical decision", () => {
    expect(validateCriticalDecisionMatrix(criticalDecisionMatrix)).toEqual([]);
    expect(criticalDecisionMatrix.length).toBeGreaterThanOrEqual(10);
  });

  it("rejects duplicate cases and missing outcomes", () => {
    const first = criticalDecisionMatrix[0];
    if (first === undefined) throw new Error("matrix is empty");

    expect(validateCriticalDecisionMatrix([first, first])).toContain(
      "duplicate critical decision case NOTA-APROVADA",
    );
    expect(
      validateCriticalDecisionMatrix(
        criticalDecisionMatrix.filter(
          (entry) => entry.caseId !== "PERMISSAO-PARTICIPANT-CROSS-SCOPE",
        ),
      ),
    ).toContain("critical decision PERMISSAO has no REJEITADO outcome");
    expect(
      validateCriticalDecisionMatrix(
        criticalDecisionMatrix.filter((entry) => entry.decision !== "ESTADO"),
      ),
    ).toContain("critical decision ESTADO has no cases");
  });
});
