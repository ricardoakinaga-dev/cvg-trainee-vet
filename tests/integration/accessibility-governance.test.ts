import { expect, it } from "vitest";

import {
  buildAccessibilityGovernanceReport,
  loadAccessibilityGovernanceSnapshot,
  validateAccessibilityGovernanceSnapshot,
} from "../../scripts/verify-accessibility-governance.mjs";

it("accepts automated accessibility evidence and explicit manual gaps", () => {
  const snapshot = loadAccessibilityGovernanceSnapshot();

  expect(validateAccessibilityGovernanceSnapshot(snapshot)).toEqual([]);
  expect(buildAccessibilityGovernanceReport(snapshot)).toMatchObject({
    task: "ENT95-13-B",
    automatedEvidenceCount: 6,
    automatedPassCount: 6,
    manualGapCount: 5,
    status: "PASS_WITH_GAPS",
    releaseDisposition: "PILOT_BLOCKED",
  });
});

it("rejects missing automated evidence or an undocumented manual gap", () => {
  const snapshot = loadAccessibilityGovernanceSnapshot();
  const invalidSnapshot = {
    ...snapshot,
    automatedEvidence: snapshot.automatedEvidence.map((evidence, index) =>
      index === 0 ? { ...evidence, status: "FAIL", testPath: "" } : evidence,
    ),
    manualGaps: snapshot.manualGaps.slice(1),
  };

  expect(validateAccessibilityGovernanceSnapshot(invalidSnapshot)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("automated evidence"),
      expect.stringContaining("manual gaps"),
    ]),
  );
});
