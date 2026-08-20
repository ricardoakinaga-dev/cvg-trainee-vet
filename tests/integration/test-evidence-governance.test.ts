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

  it("preserves the complete diagnostic contract for malformed policy evidence", async () => {
    const snapshot = await loadTestEvidenceGovernanceSnapshot(process.cwd());
    const policy = JSON.parse(
      snapshot.get("test-evidence-governance.json") ?? "{}",
    ) as {
      version?: unknown;
      taskId?: unknown;
      releaseDisposition?: unknown;
      evidence?: Array<Record<string, unknown> | null>;
    };
    policy.version = 2;
    policy.taskId = "WRONG-TASK";
    policy.releaseDisposition = "PILOT_READY";
    policy.evidence = [
      null,
      {
        id: "E-BAD",
        requirementIds: [],
        taskIds: [],
        artifactId: "",
        command: "node secret: leaked",
        timestamp: "not-a-timestamp",
        environment: "",
        seed: "",
        syntheticData: false,
        sanitization: "plain",
        teardown: "pending",
        retention: "",
        commit: "not-a-sha",
        artifact: "missing-artifact.txt",
        paths: ["missing-evidence.txt"],
      },
    ];
    snapshot.set("test-evidence-governance.json", JSON.stringify(policy));

    expect(validateTestEvidenceGovernance(snapshot)).toEqual([
      "policy version must be 1",
      "task id is invalid",
      "test evidence cannot release the pilot",
      "evidence entry must be an object",
      "evidence E-BAD has no requirementIds",
      "evidence E-BAD has no taskIds",
      "evidence E-BAD has no artifactId",
      "evidence E-BAD has no reproducible command",
      "evidence E-BAD has invalid timestamp",
      "evidence E-BAD has invalid environment",
      "evidence E-BAD has invalid seed",
      "evidence E-BAD has invalid retention",
      "evidence E-BAD syntheticData must be true",
      "evidence E-BAD sanitization must be redacted",
      "evidence E-BAD teardown must be verified",
      "evidence E-BAD commit must be a SHA or explicit GAP",
      "evidence E-BAD artifact must exist or be an explicit GAP",
      "evidence E-BAD path missing-evidence.txt does not exist",
      "evidence E-BAD contains an unredacted secret marker",
    ]);
  });
});
