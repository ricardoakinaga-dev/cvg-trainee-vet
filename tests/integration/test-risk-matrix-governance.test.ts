import { describe, expect, it } from "vitest";

import {
  buildTestRiskMatrixReport,
  loadTestRiskMatrixSnapshot,
  validateTestRiskMatrix,
} from "../../scripts/verify-test-risk-matrix.mjs";

describe("test risk matrix governance", () => {
  it("derives P0/P1 proof and test-layer coverage without promoting gaps", async () => {
    const snapshot = await loadTestRiskMatrixSnapshot(process.cwd());

    expect(validateTestRiskMatrix(snapshot)).toEqual([]);
    expect(buildTestRiskMatrixReport(snapshot)).toMatchObject({
      task: "ENT95-14-A",
      requirements: 87,
      requiredProofTypes: 4,
      status: "PASS_WITH_GAPS",
      releaseDisposition: "PILOT_BLOCKED",
      proofCoverageByType: {
        error: 63,
      },
    });
  });

  it("rejects a policy that omits denied/conflict proof obligations", async () => {
    const snapshot = await loadTestRiskMatrixSnapshot(process.cwd());
    const policy = JSON.parse(
      snapshot.get("test-risk-matrix.json") ?? "{}",
    ) as { proofTypes?: Array<{ id: string }> };
    policy.proofTypes = (policy.proofTypes ?? []).filter(
      ({ id }) => id !== "conflict",
    );
    snapshot.set("test-risk-matrix.json", JSON.stringify(policy));

    const errors = validateTestRiskMatrix(snapshot);

    expect(errors).toContain(
      "required proof types must be success,error,denied,conflict",
    );
  });

  it("rejects an error proof destination that is not linked from the matrix", async () => {
    const snapshot = await loadTestRiskMatrixSnapshot(process.cwd());
    const policy = JSON.parse(
      snapshot.get("test-risk-matrix.json") ?? "{}",
    ) as { proofReferencePaths?: { error?: string[] } };
    policy.proofReferencePaths = {
      error: [
        ...(policy.proofReferencePaths?.error ?? []),
        "tests/integration/not-linked-error-proof.test.ts",
      ],
    };
    snapshot.set("test-risk-matrix.json", JSON.stringify(policy));

    const errors = validateTestRiskMatrix(snapshot);

    expect(errors).toContain(
      "error proof reference is not linked from the premium matrix: tests/integration/not-linked-error-proof.test.ts",
    );
  });
});
