import { expect, it } from "vitest";

import { validateJourneyCorrectionMetadata } from "../../scripts/journey-correction-governance-support.mjs";
import {
  buildJourneyCorrectionGovernanceReport,
  loadJourneyCorrectionGovernanceSnapshot,
  validateJourneyCorrectionGovernance,
} from "../../scripts/verify-journey-correction-governance.mjs";

it("accepts local journey, appeal, feedback and correction evidence with explicit gaps", async () => {
  const snapshot = await loadJourneyCorrectionGovernanceSnapshot(process.cwd());

  expect(validateJourneyCorrectionGovernance(snapshot)).toEqual([]);
  expect(buildJourneyCorrectionGovernanceReport(snapshot)).toMatchObject({
    taskCount: 4,
    evidenceCount: 4,
    evidencePassCount: 4,
    gapCount: 5,
    status: "PASS_WITH_GAPS",
    releaseDisposition: "PILOT_BLOCKED",
  });
});

it("keeps metadata and sensitive-marker checks composable", async () => {
  const snapshot = await loadJourneyCorrectionGovernanceSnapshot(process.cwd());

  expect(validateJourneyCorrectionMetadata(snapshot)).toEqual([]);
});

it("rejects missing owner-scoped evidence or a hidden production claim", async () => {
  const snapshot = await loadJourneyCorrectionGovernanceSnapshot(process.cwd());
  const invalidSnapshot = {
    ...snapshot,
    taskIds: snapshot.taskIds.slice(0, 3),
    evidence: snapshot.evidence.map((evidence, index) =>
      index === 0
        ? { ...evidence, testPaths: ["missing/journey.test.ts"] }
        : evidence,
    ),
    releaseDisposition: "PILOT_READY",
  };

  expect(validateJourneyCorrectionGovernance(invalidSnapshot)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("task ids"),
      expect.stringContaining("test path"),
      expect.stringContaining("PILOT_BLOCKED"),
    ]),
  );
});
