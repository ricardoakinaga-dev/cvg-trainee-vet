import { expect, it } from "vitest";

import {
  buildCapacityGovernanceReport,
  loadCapacityGovernanceSnapshot,
  validateCapacityGovernanceSnapshot,
} from "../../scripts/verify-capacity-governance.mjs";
import {
  validateCapacityExplorationEvidence,
  validateCapacityGaps,
  validateCapacityMetadata,
  validateCapacitySmokeEvidence,
} from "../../scripts/verify-capacity-governance-support.mjs";

it("keeps capacity governance validation composable by evidence block", () => {
  const snapshot = loadCapacityGovernanceSnapshot();

  expect(validateCapacityMetadata(snapshot)).toEqual([]);
  expect(validateCapacitySmokeEvidence(snapshot)).toEqual([]);
  expect(validateCapacityExplorationEvidence(snapshot)).toEqual([]);
  expect(validateCapacityGaps(snapshot)).toEqual([]);
});

it("accepts the local HA load smoke and keeps capacity gaps explicit", () => {
  const snapshot = loadCapacityGovernanceSnapshot();

  expect(validateCapacityGovernanceSnapshot(snapshot)).toEqual([]);
  expect(buildCapacityGovernanceReport(snapshot)).toMatchObject({
    task: "ENT95-04-C",
    requestCount: 200,
    successCount: 200,
    successRatePercent: 100,
    p95Milliseconds: 102.37,
    gapCount: 4,
    steppedLoadRuns: 3,
    failoverSuccessRatePercent: 100,
    soakStatus: "NOT_EXECUTED",
    status: "PASS_WITH_GAPS",
    releaseDisposition: "PILOT_BLOCKED",
  });
});

it("rejects inconsistent smoke metrics or an undocumented capacity gap", () => {
  const snapshot = loadCapacityGovernanceSnapshot();
  const invalidSnapshot = {
    ...snapshot,
    smokeEvidence: {
      ...snapshot.smokeEvidence,
      successCount: 199,
      p95Milliseconds: -1,
    },
    gaps: snapshot.gaps.slice(1),
  };

  expect(validateCapacityGovernanceSnapshot(invalidSnapshot)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("successCount"),
      expect.stringContaining("p95Milliseconds"),
      expect.stringContaining("capacity gaps"),
    ]),
  );
});

it("rejects incomplete exploratory capacity evidence", () => {
  const snapshot = loadCapacityGovernanceSnapshot();
  const invalidSnapshot = {
    ...snapshot,
    explorationEvidence: {
      ...snapshot.explorationEvidence,
      failover: {
        ...snapshot.explorationEvidence.failover,
        restoredHealthy: false,
      },
    },
  };

  expect(validateCapacityGovernanceSnapshot(invalidSnapshot)).toEqual(
    expect.arrayContaining([expect.stringContaining("restoredHealthy")]),
  );
});
