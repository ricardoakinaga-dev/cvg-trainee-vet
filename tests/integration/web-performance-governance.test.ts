import { expect, it } from "vitest";

import {
  buildWebPerformanceGovernanceReport,
  loadWebPerformanceGovernanceSnapshot,
  validateWebPerformanceGovernanceSnapshot,
} from "../../scripts/verify-web-performance-governance.mjs";

it("accepts synthetic web budgets and keeps production gaps explicit", () => {
  const snapshot = loadWebPerformanceGovernanceSnapshot();

  expect(validateWebPerformanceGovernanceSnapshot(snapshot)).toEqual([]);
  expect(buildWebPerformanceGovernanceReport(snapshot)).toMatchObject({
    task: "ENT95-13-D",
    evidencePassCount: 3,
    measurementCount: 2,
    gapCount: 4,
    status: "PASS_WITH_GAPS",
    releaseDisposition: "PILOT_BLOCKED",
  });
});

it("rejects a budget breach or an undocumented manual gap", () => {
  const snapshot = loadWebPerformanceGovernanceSnapshot();
  const invalidSnapshot = {
    ...snapshot,
    measurements: snapshot.measurements.map((measurement, index) =>
      index === 0 ? { ...measurement, lcpMilliseconds: 3_001 } : measurement,
    ),
    manualGaps: snapshot.manualGaps.slice(1),
  };

  expect(validateWebPerformanceGovernanceSnapshot(invalidSnapshot)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("budget"),
      expect.stringContaining("manual gaps"),
    ]),
  );
});

it("rejects missing retry preservation evidence", () => {
  const snapshot = loadWebPerformanceGovernanceSnapshot();
  const invalidSnapshot = {
    ...snapshot,
    evidence: snapshot.evidence.filter(
      (evidence) => evidence.id !== "PERF-NETWORK-003",
    ),
  };

  expect(validateWebPerformanceGovernanceSnapshot(invalidSnapshot)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("missing required evidence PERF-NETWORK-003"),
    ]),
  );
});
