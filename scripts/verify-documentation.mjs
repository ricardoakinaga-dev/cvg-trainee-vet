import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRequiredFiles = Object.freeze([
  "AGENTS.md",
  "docs/99_runtime_state.md",
  "docs/20_master_execution_log.md",
  "docs/30_backlog_master.md",
  "BRIEFING/00.DiSCOVERY/DISCOVERY ENGINE ENTERPRISE",
  "BRIEFING/00.DiSCOVERY/PROMPT MASTER ENTERPRISE — DISCOVERY ENGINE",
  "BRIEFING/01.PRD/PRD ENGINE ENTERPRISE",
  "BRIEFING/01.PRD/PROMPT MASTER ENTERPRISE — PRD ENGINE",
  "BRIEFING/02.ESPEC/SPEC ENGINE ENTERPRISE",
  "BRIEFING/02.ESPEC/PROMPT MASTER ENTERPRISE — SPEC ENGINE",
  "BRIEFING/03.BUILD/0300_build_engineer_master.md",
  "BRIEFING/03.BUILD/0301_roadmap.md",
  "BRIEFING/03.BUILD/0302_backlog_master.md",
  "BRIEFING/03.BUILD/0390_build_readiness.md",
  "BRIEFING/03.BUILD/0391_documentation_gate.md",
  "BRIEFING/04.AUDIT/0400_audit_scope.md",
  "BRIEFING/04.AUDIT/0401_audit_plan.md",
  "BRIEFING/04.AUDIT/0410_prd_adherence_audit.md",
  "BRIEFING/04.AUDIT/0411_spec_adherence_audit.md",
  "BRIEFING/04.AUDIT/0412_runtime_analysis.md",
  "BRIEFING/04.AUDIT/0413_logs_audit.md",
  "BRIEFING/04.AUDIT/0414_metrics_audit.md",
  "BRIEFING/04.AUDIT/0415_integrations_audit.md",
  "BRIEFING/04.AUDIT/0416_data_integrity_audit.md",
  "BRIEFING/04.AUDIT/0417_security_governance_audit.md",
  "BRIEFING/04.AUDIT/0418_operational_experience_audit.md",
  "BRIEFING/04.AUDIT/0420_gap_analysis.md",
  "BRIEFING/04.AUDIT/0421_remediation_plan.md",
  "BRIEFING/04.AUDIT/0490_audit_report.md",
  "BRIEFING/04.AUDIT/0491_full_construction_audit.md",
  "BRIEFING/04.AUDIT/0492_score_95_roadmap.md",
  "BRIEFING/04.AUDIT/0493_score_95_backlog.md",
  "BRIEFING/05.AGENT_LOOP-SESSION_PERSISTENCE/0500_loop_session_persistence_master.md",
  "BRIEFING/05.AGENT_LOOP-SESSION_PERSISTENCE/0501_runtime_state_contract.md",
  "BRIEFING/05.AGENT_LOOP-SESSION_PERSISTENCE/0502_execution_log_and_backlog_contract.md",
  "BRIEFING/05.AGENT_LOOP-SESSION_PERSISTENCE/0503_resume_and_recovery_protocol.md",
  "BRIEFING/05.AGENT_LOOP-SESSION_PERSISTENCE/0590_loop_validation.md",
  "BRIEFING/06.SKILL/0600_skill_engine_master.md",
  "BRIEFING/06.SKILL/0601_skill_registry.md",
  "BRIEFING/06.SKILL/0602_skill_quality_contract.md",
  "BRIEFING/06.SKILL/0690_skill_validation.md",
  "BRIEFING/07.AGENTS/0700_agents_governance.md",
  "BRIEFING/07.AGENTS/0701_roles_and_delegation.md",
  "BRIEFING/07.AGENTS/0702_review_and_security_gates.md",
  "BRIEFING/07.AGENTS/0790_agents_validation.md",
  "BRIEFING/08.RUNTIME/0800_runtime_master.md",
  "BRIEFING/08.RUNTIME/0801_environment_contract.md",
  "BRIEFING/08.RUNTIME/0802_deploy_health_recovery.md",
  "BRIEFING/08.RUNTIME/0803_secrets_config_and_observability.md",
  "BRIEFING/08.RUNTIME/0890_runtime_validation.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/README.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY/0090_discovery_validation.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0090_prd_validation.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md",
  "traceability.yml",
]);

const requiredBacklogIds = Object.freeze([
  "AUD-C0-001",
  "AUD-C0-002",
  "AUD-P1-001",
  "AUD-P1-002",
  "AUD-P1-003",
  "AUD-P1-004",
  "AUD-P1-005",
]);

const reportRowPattern =
  /^\|\s*(\d+)\.\s*.+?\|\s*(\d+)%\s*\|\s*\*\*(\d+)\*\*\s*\|/;

function readSnapshotValue(snapshot, path) {
  const value = snapshot.get(path);
  return typeof value === "string" ? value : null;
}

function validateReport(report, errors) {
  if (!/Nota geral ponderada(?: reavaliada)?:/.test(report)) {
    errors.push("audit report has no weighted score");
  }

  const rows = report
    .split("\n")
    .map((line) => line.match(reportRowPattern))
    .filter((match) => match !== null);

  if (rows.length !== 16) {
    errors.push(
      `audit report score matrix must have 16 rows, found ${rows.length}`,
    );
  }

  const weights = rows.reduce((total, match) => total + Number(match[2]), 0);
  if (rows.length === 16 && weights !== 100) {
    errors.push(`audit report score weights must total 100, found ${weights}`);
  }

  const scores = rows.map((match) => Number(match[3]));
  if (scores.some((score) => score < 0 || score > 100)) {
    errors.push("audit report contains a score outside 0-100");
  }
}

function validateTraceability(manifest, errors) {
  if (!manifest.includes("version:"))
    errors.push("traceability has no version");
  if (!manifest.includes('project: "cvg-trainee-vet"')) {
    errors.push("traceability has no canonical project");
  }

  const artifactBlocks = manifest.split("\n  - id:").slice(1);
  if (artifactBlocks.length === 0) {
    errors.push("traceability has no artifact entries");
    return;
  }

  for (const block of artifactBlocks) {
    if (!block.includes("requirements:"))
      errors.push("traceability artifact has no requirements");
    if (!block.includes("documents:"))
      errors.push("traceability artifact has no documents");
    if (!block.includes("tests:"))
      errors.push("traceability artifact has no tests");
    if (!block.includes("status:"))
      errors.push("traceability artifact has no status");
  }

  const auditBlock = artifactBlocks.find(
    (block) =>
      block.startsWith(' "AUD-0491-FULL-CONSTRUCTION-AUDIT"') ||
      block.startsWith(' "AUD-0491-FULL-CONSTRUCTION-AUDIT"'),
  );
  if (auditBlock === undefined) {
    errors.push(
      "traceability has no AUD-0491-FULL-CONSTRUCTION-AUDIT artifact",
    );
  } else if (!auditBlock.includes("verification:")) {
    errors.push("AUD-0491 traceability artifact has no verification command");
  }
}

export function validateDocumentationSnapshot(snapshot, options = {}) {
  const errors = [];
  const requiredFiles = options.requiredFiles ?? defaultRequiredFiles;

  for (const path of requiredFiles) {
    const content = readSnapshotValue(snapshot, path);
    if (content === null || content.trim().length === 0) {
      errors.push(`missing required file: ${path}`);
    }
  }

  const runtimeState = readSnapshotValue(snapshot, "docs/99_runtime_state.md");
  if (runtimeState !== null) {
    for (const marker of [
      "status:",
      "last_completed_action:",
      "next_action:",
      "last_update:",
    ]) {
      if (!runtimeState.includes(marker))
        errors.push(`runtime state has no ${marker}`);
    }
  }

  const executionLog = readSnapshotValue(
    snapshot,
    "docs/20_master_execution_log.md",
  );
  if (
    executionLog !== null &&
    !executionLog.includes("AUD-0491-FULL-CONSTRUCTION-AUDIT")
  ) {
    errors.push("execution log has no current audit entry");
  }

  const backlog = readSnapshotValue(snapshot, "docs/30_backlog_master.md");
  if (backlog !== null) {
    for (const id of requiredBacklogIds) {
      if (!backlog.includes(id)) errors.push(`backlog has no ${id}`);
    }
  }

  const historicalReport = readSnapshotValue(
    snapshot,
    "BRIEFING/04.AUDIT/0490_audit_report.md",
  );
  if (
    historicalReport !== null &&
    (!historicalReport.includes("registro histórico") ||
      !historicalReport.includes("0491_full_construction_audit.md"))
  ) {
    errors.push("0490 is not explicitly linked as historical to 0491");
  }

  const currentReport = readSnapshotValue(
    snapshot,
    "BRIEFING/04.AUDIT/0491_full_construction_audit.md",
  );
  if (currentReport !== null) validateReport(currentReport, errors);

  const manifest = readSnapshotValue(snapshot, "traceability.yml");
  if (manifest !== null) validateTraceability(manifest, errors);

  return Object.freeze(errors);
}

export async function loadDocumentationSnapshot(root) {
  const snapshot = new Map();
  for (const path of defaultRequiredFiles) {
    try {
      snapshot.set(path, await readFile(join(root, path), "utf8"));
    } catch {
      snapshot.set(path, "");
    }
  }
  return snapshot;
}

async function main() {
  const root = process.cwd();
  const snapshot = await loadDocumentationSnapshot(root);
  const errors = validateDocumentationSnapshot(snapshot);
  if (errors.length > 0) {
    console.error(`documentation gate failed (${errors.length} findings):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    "documentation gate: canonical files, evidence, roadmap, backlog and traceability are consistent",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
