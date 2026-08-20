import { describe, expect, it } from "vitest";

import {
  buildSkipGovernanceReport,
  loadSkipGovernanceSnapshot,
  validateSkipGovernance,
} from "../../scripts/verify-skip-governance.mjs";

describe("conditional skip governance", () => {
  it("accepts the explicit live-environment skip inventory", async () => {
    const snapshot = await loadSkipGovernanceSnapshot(process.cwd());
    expect(validateSkipGovernance(snapshot)).toEqual([]);
    expect(buildSkipGovernanceReport(snapshot)).toMatchObject({
      guardedFiles: 17,
      guardedTests: 21,
      unexplainedSkips: 0,
      observedRuns: 20,
      flakyFailures: 0,
      status: "PASS",
      releaseDisposition: "PILOT_BLOCKED",
    });
  });

  it("rejects an unclassified skip and a run above the flaky limit", async () => {
    const snapshot = await loadSkipGovernanceSnapshot(process.cwd());
    const policy = JSON.parse(snapshot.get("skip-governance.json") ?? "{}") as {
      skips?: Array<Record<string, unknown>>;
      observedRuns?: Array<Record<string, unknown>>;
    };

    policy.skips = [
      ...(policy.skips ?? []),
      {
        path: "tests/integration/unclassified.test.ts",
        testCount: 1,
        guard: ["CVG_TEST_DATABASE_URL"],
        reason: "missing classification",
      },
    ];
    policy.observedRuns = [
      ...(policy.observedRuns ?? []),
      {
        mode: "synthetic-flaky-run",
        flakyFailures: 1,
        skippedTests: 0,
      },
    ];
    snapshot.set("skip-governance.json", JSON.stringify(policy));

    const errors = validateSkipGovernance(snapshot);
    expect(errors.join(";")).toContain("does not exist");
    expect(errors.join(";")).toContain("flaky rate");
  });

  it("rejects a skip inventory whose test denominator drifted", async () => {
    const snapshot = await loadSkipGovernanceSnapshot(process.cwd());
    const policy = JSON.parse(snapshot.get("skip-governance.json") ?? "{}") as {
      skips?: Array<Record<string, unknown>>;
    };
    policy.skips = (policy.skips ?? []).map((entry) =>
      entry.path === "tests/integration/postgres-attempt-repository.test.ts"
        ? { ...entry, testCount: 1 }
        : entry,
    );
    snapshot.set("skip-governance.json", JSON.stringify(policy));

    expect(validateSkipGovernance(snapshot).join(";")).toContain(
      "declares 1 tests but contains 2",
    );
  });
});
