import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

import { validateDocumentationSnapshot } from "../../scripts/verify-documentation.mjs";

const indexPath = "docs/current-index.json";
const runtimePath = "docs/99_runtime_state.md";
const reportPath = "docs/audits/repository-audit-2026-10-03.md";
const manifestPath =
  "docs/audits/repository-audit-2026-10-03-evidence/audit-manifest.json";
const barPath = ".agent/plans/2026-10-03-remediation-quality-bar.json";
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");

function fixture() {
  const report = readFileSync(reportPath, "utf8");
  const bar = readFileSync(barPath, "utf8");
  const head = "3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff";
  const manifest = readFileSync(manifestPath, "utf8");
  const index = {
    format: "cvg-continuity-index/v1",
    origin: "AUDIT-20261003-T11",
    generatedAt: "2026-10-03T13:30:00.000Z",
    continuity: {
      state: runtimePath,
      checkpointHeading: "CHECKPOINT PREVALENTE",
      log: "docs/20_master_execution_log.md",
      backlog: "docs/30_backlog_master.md",
      roadmap: "docs/60_roadmap_repository_remediation_2026-10-03.md",
      taskBacklog: "docs/61_backlog_repository_remediation_2026-10-03.md",
      executionPlan: ".agent/plans/2026-10-03-remediation-execution.md",
      traceability: "traceability.yml",
    },
    auditSnapshot: {
      head,
      report: reportPath,
      manifest: manifestPath,
      manifestSha256: digest(manifest),
      verdict: "REVISE",
    },
    qualityBar: { path: barPath, sha256: digest(bar) },
  };
  const state = [
    "## CHECKPOINT PREVALENTE — synthetic current",
    "- current_task: EXEC-AUDIT-20261003",
    "- status: IN_PROGRESS",
    "- last_completed_action: scoped check",
    "- next_action: continue full backlog",
    "- last_update: 2026-10-03T13:30:00.000Z",
    "- evidence: scoped report",
    "## CHECKPOINT ANTERIOR — historical",
    "- next_action: obsolete step",
  ].join("\n");
  const snapshot = new Map<string, string>([
    [indexPath, JSON.stringify(index)],
    [runtimePath, state],
    [reportPath, report],
    [manifestPath, manifest],
    [barPath, bar],
  ]);
  return { index, snapshot };
}

function validate(snapshot: Map<string, string>) {
  return validateDocumentationSnapshot(snapshot, {
    requiredFiles: [indexPath],
  });
}

function read(snapshot: Map<string, string>, path: string): string {
  const value = snapshot.get(path);
  if (value === undefined) throw new Error(`Missing fixture: ${path}`);
  return value;
}

it("validates the current checkpoint and immutable audit identity", () => {
  expect(validate(fixture().snapshot)).toEqual([]);
});

it("does not borrow a missing next action from a historical checkpoint", () => {
  const { snapshot } = fixture();
  snapshot.set(
    runtimePath,
    read(snapshot, runtimePath).replace(
      "- next_action: continue full backlog\n",
      "",
    ),
  );
  expect(validate(snapshot)).toContain("current checkpoint has no next_action");
});

it("rejects two competing current checkpoints", () => {
  const { snapshot } = fixture();
  snapshot.set(
    runtimePath,
    read(snapshot, runtimePath) + "\n## CHECKPOINT PREVALENTE — competing",
  );
  expect(validate(snapshot)).toContain(
    "runtime requires exactly one prevalent checkpoint",
  );
});

it("rejects an invalid current status or timestamp even when historical fields are valid", () => {
  const { snapshot } = fixture();
  snapshot.set(
    runtimePath,
    read(snapshot, runtimePath)
      .replace("status: IN_PROGRESS", "status: PASS")
      .replace(
        "last_update: 2026-10-03T13:30:00.000Z",
        "last_update: yesterday",
      ),
  );
  expect(validate(snapshot)).toContain("current checkpoint status is invalid");
  expect(validate(snapshot)).toContain(
    "current checkpoint timestamp is invalid",
  );
});

it("rejects a superseded plan as the active task backlog", () => {
  const { index, snapshot } = fixture();
  index.continuity.taskBacklog = "docs/43_backlog_triple_aaa.md";
  snapshot.set(indexPath, JSON.stringify(index));
  expect(validate(snapshot)).toContain(
    "continuity index taskBacklog pointer is invalid",
  );
});

it("rejects relabelled or changed historical audit bytes", () => {
  const { snapshot } = fixture();
  snapshot.set(manifestPath, read(snapshot, manifestPath) + " ");
  snapshot.set(reportPath, "Changed historical report.");
  expect(validate(snapshot)).toContain(
    "audit snapshot manifest digest mismatch",
  );
  expect(validate(snapshot)).toContain("audit snapshot report digest mismatch");
});

it("rejects a modified quality bar rather than refreshing its expected digest", () => {
  const { snapshot } = fixture();
  snapshot.set(barPath, "weakened quality bar");
  expect(validate(snapshot)).toContain(
    "continuity quality bar digest mismatch",
  );
});

it("rejects a malformed current index", () => {
  const { snapshot } = fixture();
  snapshot.set(indexPath, "null");
  expect(validate(snapshot)).toContain(
    "continuity index is missing or malformed",
  );
});

it("rejects coherent reidentification of the historical audit HEAD", () => {
  const { index, snapshot } = fixture();
  index.auditSnapshot.head = "b".repeat(40);
  const changed = JSON.stringify({
    head: index.auditSnapshot.head,
    verdict: "REVISE",
    report: { path: reportPath, sha256: digest(read(snapshot, reportPath)) },
  });
  index.auditSnapshot.manifestSha256 = digest(changed);
  snapshot.set(manifestPath, changed);
  snapshot.set(indexPath, JSON.stringify(index));
  expect(validate(snapshot)).toContain("continuity audit anchor mismatch");
});

it("rejects refreshing every mutable digest after altering the historical report", () => {
  const { index, snapshot } = fixture();
  const changedReport = "Changed historical audit.";
  const changedManifest = JSON.stringify({
    head: index.auditSnapshot.head,
    verdict: "REVISE",
    report: { path: reportPath, sha256: digest(changedReport) },
  });
  index.auditSnapshot.manifestSha256 = digest(changedManifest);
  snapshot.set(reportPath, changedReport);
  snapshot.set(manifestPath, changedManifest);
  snapshot.set(indexPath, JSON.stringify(index));
  expect(validate(snapshot)).toContain("continuity audit anchor mismatch");
});

it("rejects refreshing the bar digest after removing frozen criteria", () => {
  const { index, snapshot } = fixture();
  const weakened = JSON.stringify({ id: "AR03-v1", tasks: [] });
  index.qualityBar.sha256 = digest(weakened);
  snapshot.set(barPath, weakened);
  snapshot.set(indexPath, JSON.stringify(index));
  expect(validate(snapshot)).toContain(
    "continuity quality bar anchor mismatch",
  );
});

it("rejects a nonexistent current calendar date", () => {
  const { snapshot } = fixture();
  snapshot.set(
    runtimePath,
    read(snapshot, runtimePath).replace(
      "2026-10-03T13:30:00.000Z",
      "2026-02-30T13:30:00Z",
    ),
  );
  expect(validate(snapshot)).toContain(
    "current checkpoint timestamp is invalid",
  );
});

it("does not parse the following field as an empty current next action", () => {
  const { snapshot } = fixture();
  snapshot.set(
    runtimePath,
    read(snapshot, runtimePath).replace(
      "next_action: continue full backlog",
      "next_action:",
    ),
  );
  expect(validate(snapshot)).toContain("current checkpoint has no next_action");
});

it("rejects a missing bar and an empty digest", () => {
  const { index, snapshot } = fixture();
  snapshot.delete(barPath);
  index.qualityBar.sha256 = "";
  snapshot.set(indexPath, JSON.stringify(index));
  expect(validate(snapshot)).toContain(
    "continuity quality bar digest mismatch",
  );
});
