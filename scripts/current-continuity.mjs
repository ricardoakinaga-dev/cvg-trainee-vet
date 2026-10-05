import { createHash } from "node:crypto";

const INDEX_PATH = "docs/current-index.json";
const REPORT_PATH = "docs/audits/repository-audit-2026-10-03.md";
const MANIFEST_PATH =
  "docs/audits/repository-audit-2026-10-03-evidence/audit-manifest.json";
const BAR_PATH = ".agent/plans/2026-10-03-remediation-quality-bar.json";
// Authorized baseline identities live outside the mutable index and artifacts.
// A new baseline requires an explicit reviewed policy change, not rehashing history.
const FROZEN_AUDIT = Object.freeze({
  head: "3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff",
  manifestSha256:
    "f90b8e0f95202ae67a692be7c3153fbae15e31ee46aab3cd7caaa3203f8c6a6f",
  reportSha256:
    "bf7849228b504cf8ca3ea31094f79c4fce06ac784292afa7ab7be48e5058a32e",
});
const FROZEN_BAR_SHA256 =
  "e25e519e0273267ae17004c7bd7209cc54b8e7cee9054ed6980578417ea37c40";
const POINTERS = Object.freeze({
  state: "docs/99_runtime_state.md",
  checkpointHeading: "CHECKPOINT PREVALENTE",
  log: "docs/20_master_execution_log.md",
  backlog: "docs/30_backlog_master.md",
  roadmap: "docs/60_roadmap_repository_remediation_2026-10-03.md",
  taskBacklog: "docs/61_backlog_repository_remediation_2026-10-03.md",
  executionPlan: ".agent/plans/2026-10-03-remediation-execution.md",
  traceability: "traceability.yml",
});

export const CONTINUITY_INDEX_FILES = Object.freeze([
  "docs/00_current_index.md",
  INDEX_PATH,
  REPORT_PATH,
  MANIFEST_PATH,
  BAR_PATH,
  ...Object.entries(POINTERS)
    .filter(([key]) => key !== "checkpointHeading")
    .map(([, path]) => path),
]);

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parsed(snapshot, path) {
  try {
    return JSON.parse(snapshot.get(path));
  } catch {
    return null;
  }
}

function digest(value) {
  return typeof value === "string"
    ? createHash("sha256").update(value).digest("hex")
    : null;
}

function validTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    return false;
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.exec(
      value,
    );
  if (parts === null) return false;
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day
  );
}

function validateCurrentCheckpoint(runtime, failures) {
  if (typeof runtime !== "string") {
    failures.push("runtime requires exactly one prevalent checkpoint");
    return;
  }
  const prevalent = [
    ...runtime.matchAll(/^## CHECKPOINT PREVALENTE(?:\s|$).*$/gmu),
  ];
  const first = /^## CHECKPOINT (?:PREVALENTE|ANTERIOR).*$/mu.exec(runtime);
  if (prevalent.length !== 1 || first?.index !== prevalent[0]?.index) {
    failures.push("runtime requires exactly one prevalent checkpoint");
    return;
  }
  const tail = runtime.slice(prevalent[0].index + prevalent[0][0].length);
  const end = tail.search(/^##\s/mu);
  const current = end < 0 ? tail : tail.slice(0, end);
  const fields = new Map();
  for (const match of current.matchAll(/^-[\t ]+([a-z_]+):[\t ]*(.*)$/gmu)) {
    if (fields.has(match[1]))
      failures.push(`current checkpoint repeats ${match[1]}`);
    fields.set(match[1], match[2].trim());
  }
  for (const name of [
    "current_task",
    "status",
    "last_completed_action",
    "next_action",
    "last_update",
    "evidence",
  ]) {
    if (!fields.get(name)) failures.push(`current checkpoint has no ${name}`);
  }
  if (
    ![
      "IN_PROGRESS",
      "READY_FOR_NEXT_STEP",
      "BLOCKED",
      "WAITING_HUMAN_APPROVAL",
      "COMPLETED",
    ].includes(fields.get("status"))
  ) {
    failures.push("current checkpoint status is invalid");
  }
  if (!validTimestamp(fields.get("last_update")))
    failures.push("current checkpoint timestamp is invalid");
}

export function validateContinuityIndex(snapshot) {
  const failures = [];
  const index = parsed(snapshot, INDEX_PATH);
  if (
    !object(index) ||
    index.format !== "cvg-continuity-index/v1" ||
    index.origin !== "AUDIT-20261003-T11" ||
    !validTimestamp(index.generatedAt)
  ) {
    return ["continuity index is missing or malformed"];
  }
  for (const [name, expected] of Object.entries(POINTERS)) {
    if (index.continuity?.[name] !== expected)
      failures.push(`continuity index ${name} pointer is invalid`);
  }
  validateCurrentCheckpoint(snapshot.get(POINTERS.state), failures);
  const audit = index.auditSnapshot;
  if (
    audit?.head !== FROZEN_AUDIT.head ||
    audit?.manifestSha256 !== FROZEN_AUDIT.manifestSha256 ||
    digest(snapshot.get(REPORT_PATH)) !== FROZEN_AUDIT.reportSha256
  )
    failures.push("continuity audit anchor mismatch");
  if (index.qualityBar?.sha256 !== FROZEN_BAR_SHA256)
    failures.push("continuity quality bar anchor mismatch");
  if (
    !object(audit) ||
    audit.manifest !== MANIFEST_PATH ||
    audit.report !== REPORT_PATH ||
    !/^[a-f0-9]{40}$/u.test(audit.head ?? "")
  ) {
    failures.push("continuity audit snapshot pointer is invalid");
  }
  const manifest = parsed(snapshot, MANIFEST_PATH);
  if (
    !/^[a-f0-9]{64}$/u.test(audit?.manifestSha256 ?? "") ||
    digest(snapshot.get(MANIFEST_PATH)) !== audit?.manifestSha256
  )
    failures.push("audit snapshot manifest digest mismatch");
  if (
    !object(manifest) ||
    manifest.head !== audit?.head ||
    manifest.verdict !== audit?.verdict ||
    manifest.report?.path !== REPORT_PATH
  )
    failures.push("audit snapshot identity mismatch");
  if (digest(snapshot.get(REPORT_PATH)) !== manifest?.report?.sha256)
    failures.push("audit snapshot report digest mismatch");
  if (
    index.qualityBar?.path !== BAR_PATH ||
    !/^[a-f0-9]{64}$/u.test(index.qualityBar?.sha256 ?? "") ||
    digest(snapshot.get(BAR_PATH)) !== index.qualityBar?.sha256
  )
    failures.push("continuity quality bar digest mismatch");
  return failures;
}
