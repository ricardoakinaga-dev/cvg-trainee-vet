import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PROGRAM_PATH = new URL("../dual-99-program.json", import.meta.url);
const EXPECTED_TRACKS = Object.freeze({
  MATURITY: [90, 95, 72, 92, 88, 90, 82, 86, 75, 68, 88, 78, 78, 93, 86, 65],
  CODE_QUALITY: [
    78, 75, 85, 84, 52, 84, 86, 48, 70, 68, 65, 70, 46, 40, 47, 42,
  ],
});
const EXPECTED_DOMAINS = Object.freeze(
  Array.from({ length: 8 }, (_, index) => `C${index + 1}`),
);
const EXPECTED_FINDINGS = Object.freeze(
  Array.from({ length: 6 }, (_, index) => `RH0${index + 1}`),
);
const EXPECTED_GATES = Object.freeze(
  Array.from({ length: 9 }, (_, index) => `G99-${index}`),
);
const ALLOWED_STATUSES = new Set([
  "BLOCKED",
  "COMPLETED",
  "IN_PROGRESS",
  "OPEN",
  "WAITING_HUMAN_APPROVAL",
]);

export function loadDual99Program() {
  return JSON.parse(readFileSync(PROGRAM_PATH, "utf8"));
}

function validateMetadata(program, root) {
  const errors = [];
  if (program.programId !== "CVG-DUAL-99")
    errors.push("programId must be CVG-DUAL-99");
  if (program.version !== 1) errors.push("program version must be 1");
  if (program.status !== "IN_PROGRESS")
    errors.push("program status must remain IN_PROGRESS");
  if (program.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push("release disposition must remain PILOT_BLOCKED");
  }
  if (!Array.isArray(program.sourceDocuments)) {
    errors.push("sourceDocuments must be a non-empty array");
  } else {
    for (const path of program.sourceDocuments) {
      try {
        readFileSync(`${root}${path}`, "utf8");
      } catch {
        errors.push(`source document does not exist: ${path}`);
      }
    }
  }
  return errors;
}

function validateTrack(track, expectedScores) {
  const errors = [];
  if (!expectedScores) return [`track ${String(track?.id)} is not canonical`];
  if (track.targetScore !== 99)
    errors.push(`track ${track.id} targetScore must be 99`);
  if (!Number.isFinite(track.baseline))
    errors.push(`track ${track.id} baseline must be finite`);
  if (!Array.isArray(track.items) || track.items.length !== 16) {
    errors.push(`track ${track.id} must contain exactly 16 items`);
    return errors;
  }
  for (const [index, item] of track.items.entries()) {
    if (item.item !== index + 1)
      errors.push(`track ${track.id} item order is invalid`);
    if (item.baselineScore !== expectedScores[index]) {
      errors.push(
        `track ${track.id} item ${index + 1} baselineScore is invalid`,
      );
    }
  }
  return errors;
}

function validateTracks(program) {
  const tracks = program.tracks;
  if (!Array.isArray(tracks) || tracks.length !== 2)
    return ["program must contain MATURITY and CODE_QUALITY tracks"];
  const ids = new Set(tracks.map((track) => track.id));
  const errors = [];
  if (ids.size !== 2 || !ids.has("MATURITY") || !ids.has("CODE_QUALITY")) {
    errors.push("program tracks must be exactly MATURITY and CODE_QUALITY");
  }
  for (const track of tracks)
    errors.push(...validateTrack(track, EXPECTED_TRACKS[track.id]));
  return errors;
}

function validateDomains(program) {
  const domains = program.criticalDomains;
  if (!Array.isArray(domains) || domains.length !== EXPECTED_DOMAINS.length) {
    return ["criticalDomains must contain exactly C1-C8"];
  }
  const errors = [];
  for (const [index, domain] of domains.entries()) {
    if (domain.id !== EXPECTED_DOMAINS[index])
      errors.push("criticalDomains must be ordered C1-C8");
    if (domain.targetScore !== 99)
      errors.push(`domain ${domain.id} targetScore must be 99`);
    if (domain.status !== "OPEN")
      errors.push(`domain ${domain.id} must remain OPEN until re-audit`);
  }
  return errors;
}

function validateFindings(program) {
  const findings = program.highFindings;
  if (
    !Array.isArray(findings) ||
    findings.length !== EXPECTED_FINDINGS.length
  ) {
    return ["highFindings must contain exactly RH01-RH06"];
  }
  const errors = [];
  for (const [index, finding] of findings.entries()) {
    if (finding.id !== EXPECTED_FINDINGS[index])
      errors.push("highFindings must be ordered RH01-RH06");
    if (finding.severity !== "HIGH")
      errors.push(`finding ${finding.id} severity must be HIGH`);
    if (finding.status !== "OPEN")
      errors.push(
        `finding ${finding.id} must remain OPEN until independent closure`,
      );
  }
  return errors;
}

function validateTraceability(program) {
  const traceability = program.traceability;
  const errors = [];
  if (traceability?.requiredRequirements !== 145)
    errors.push("traceability must require 145 requirements");
  if (traceability?.completeChains !== 0)
    errors.push(
      "traceability completeChains must remain 0 until evidence exists",
    );
  if (traceability?.localEvidenceRows !== 145)
    errors.push("traceability localEvidenceRows must be 145");
  if (traceability?.status !== "PASS_WITH_GAPS")
    errors.push("traceability status must remain PASS_WITH_GAPS");
  return errors;
}

function validateGates(program) {
  const gates = program.gates;
  if (!Array.isArray(gates)) return ["program gates must be an array"];
  const ids = new Set(gates.map((gate) => gate.id));
  const errors = [];
  for (const id of EXPECTED_GATES) {
    if (!ids.has(id)) errors.push(`required gate ${id} is missing`);
  }
  for (const gate of gates) {
    if (!ALLOWED_STATUSES.has(gate.status))
      errors.push(`gate ${gate.id} has an invalid status`);
  }
  return errors;
}

function validateBacklog(program, root) {
  const backlog = program.backlog;
  const taskIds = backlog?.taskIds;
  const errors = [];
  if (
    !Array.isArray(taskIds) ||
    taskIds.length !== 46 ||
    new Set(taskIds).size !== 46
  ) {
    errors.push("backlog taskIds must contain exactly 46 unique IDs");
  }
  if (backlog?.path !== "BRIEFING/04.AUDIT/0519_dual_99_backlog.md") {
    errors.push("backlog path must point to the Dual99 backlog");
    return errors;
  }
  let content;
  try {
    content = readFileSync(`${root}${backlog.path}`, "utf8");
  } catch {
    errors.push(`backlog does not exist: ${backlog.path}`);
    return errors;
  }
  for (const id of taskIds ?? [])
    if (!content.includes(id)) errors.push(`backlog is missing ${id}`);
  return errors;
}

export function validateDual99Program(program, root = ROOT) {
  return Object.freeze([
    ...validateMetadata(program, root),
    ...validateTracks(program),
    ...validateDomains(program),
    ...validateFindings(program),
    ...validateTraceability(program),
    ...validateGates(program),
    ...validateBacklog(program, root),
  ]);
}

export function buildDual99Report(program) {
  return Object.freeze({
    programId: program.programId,
    maturityItems:
      program.tracks.find((track) => track.id === "MATURITY")?.items.length ??
      0,
    codeQualityItems:
      program.tracks.find((track) => track.id === "CODE_QUALITY")?.items
        .length ?? 0,
    criticalDomains: program.criticalDomains?.length ?? 0,
    highFindings: program.highFindings?.length ?? 0,
    requirements: program.traceability?.requiredRequirements ?? 0,
    backlogTasks: program.backlog?.taskIds.length ?? 0,
    eligibleForIndependentReaudit: false,
    releaseDisposition: program.releaseDisposition,
  });
}

function main() {
  const program = loadDual99Program();
  const errors = validateDual99Program(program);
  if (errors.length > 0) {
    console.error("DUAL_99_PROGRAM_FAIL");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify({ status: "PASS_WITH_GAPS", ...buildDual99Report(program) }),
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
