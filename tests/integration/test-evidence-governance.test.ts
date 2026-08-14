import { describe, expect, it } from "vitest";

import {
  buildTestEvidenceGovernanceReport,
  loadTestEvidenceGovernanceSnapshot,
  validateTestEvidenceGovernance,
} from "../../scripts/verify-test-evidence-governance.mjs";

describe("test evidence governance", () => {
  it("accepts explicit synthetic evidence with honest SHA and artifact gaps", async () => {
    const snapshot = await loadTestEvidenceGovernanceSnapshot(process.cwd());
    expect(validateTestEvidenceGovernance(snapshot)).toEqual([]);
    expect(buildTestEvidenceGovernanceReport(snapshot)).toMatchObject({
      evidenceCount: 3,
      completeEvidence: 0,
      explicitGaps: 3,
      syntheticEvidence: 3,
      teardownVerified: 3,
      status: "PASS_WITH_GAPS",
      releaseDisposition: "PILOT_BLOCKED",
    });
  });

  it("rejects malformed commit evidence and non-synthetic fixtures", async () => {
    const snapshot = await loadTestEvidenceGovernanceSnapshot(process.cwd());
    const policy = JSON.parse(
      snapshot.get("test-evidence-governance.json") ?? "{}",
    ) as { evidence?: Array<Record<string, unknown>> };
    const firstEvidence = policy.evidence?.[0];
    if (firstEvidence === undefined)
      throw new Error("evidence fixture missing");
    policy.evidence = [
      {
        ...firstEvidence,
        commit: "not-a-sha",
        syntheticData: false,
      },
      ...(policy.evidence?.slice(1) ?? []),
    ];
    snapshot.set("test-evidence-governance.json", JSON.stringify(policy));

    const errors = validateTestEvidenceGovernance(snapshot);
    expect(errors.join(";")).toContain("commit");
    expect(errors.join(";")).toContain("syntheticData");
  });
});
