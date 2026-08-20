import { expect, it } from "vitest";

import {
  buildChangeControlReport,
  loadChangeControlSnapshot,
  validateChangeControlSnapshot,
} from "../../scripts/verify-change-control-governance.mjs";

it("accepts the canonical decisions, risks, changes and sprint score impacts", () => {
  const snapshot = loadChangeControlSnapshot();

  expect(validateChangeControlSnapshot(snapshot)).toEqual([]);
  expect(buildChangeControlReport(snapshot)).toMatchObject({
    programId: "CVG-PREMIUM-ENTERPRISE-95",
    decisionCount: 3,
    riskCount: 2,
    changeRequestCount: 3,
    sprintImpactCount: 3,
    scoreChangedCount: 0,
    status: "PASS_WITH_GAPS",
    releaseDisposition: "PILOT_BLOCKED",
  });
});

it("rejects a material change without rollback or a score impact record", () => {
  const snapshot = loadChangeControlSnapshot();
  const invalidSnapshot = {
    ...snapshot,
    changeRequests: snapshot.changeRequests.map((changeRequest, index) =>
      index === 0
        ? {
            ...changeRequest,
            rollback: "",
            scoreImpact: undefined,
          }
        : changeRequest,
    ),
  };

  expect(validateChangeControlSnapshot(invalidSnapshot)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("rollback"),
      expect.stringContaining("scoreImpact"),
    ]),
  );
});
