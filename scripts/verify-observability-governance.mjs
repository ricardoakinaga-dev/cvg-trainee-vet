import { readFile } from "node:fs/promises";
import { join } from "node:path";

const POLICY_PATH = "observability-governance.json";
const DASHBOARD_PATH =
  "infra/observability/grafana/dashboards/cvg-overview.json";
const ALERT_RULES_PATH = "infra/observability/prometheus-alerts.yml";
const SOURCE_PATHS = [
  "apps/api/src/server.ts",
  "apps/api/src/server-http.ts",
  "apps/worker/src/loop.ts",
  "apps/worker/src/handlers.ts",
];
const RUNBOOK_PATH =
  "BRIEFING/08.RUNTIME/0804_observability_operational_contract.md";
const REQUIRED_SIGNAL_IDS = Object.freeze([
  "api_availability",
  "api_latency",
  "api_errors",
  "content_indexing",
  "ai_assistive",
  "worker_queue",
  "participant_experience",
  "observability_integrity",
]);
const REQUIRED_ALERT_NAMES = Object.freeze([
  "CvgCoreAvailabilityBreach",
  "CvgApiLatencyBreach",
  "CvgApiErrorRateBreach",
  "CvgIndexingFailures",
  "CvgAssistiveAiFailures",
  "CvgWorkerQueueBacklog",
  "CvgParticipantExperienceErrors",
  "CvgApiTargetDown",
  "CvgApiTargetAbsent",
  "CvgWorkerTargetDown",
  "CvgWorkerTargetAbsent",
  "CvgAlertmanagerDisconnected",
  "CvgObservabilityWatchdog",
  "CvgObservabilityWatchdogMissing",
]);
const KNOWN_SIGNAL_IDS = new Set(REQUIRED_SIGNAL_IDS);
const ALERT_SEVERITIES = new Set(["warning", "critical"]);
const FORBIDDEN_ALERT_MARKER =
  /\b(?:participantId|tutorId|email|prompt|sourceRefs|photo|pdf|ocr|token|secret|answer_key|correctChoiceIds)\b/iu;

function value(snapshot, path) {
  return snapshot.get(path);
}

function parseJson(snapshot, path, errors) {
  const raw = value(snapshot, path);
  if (typeof raw !== "string") {
    errors.push(`missing ${path}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    errors.push(`${path} is not valid JSON`);
    return null;
  }
}

function duplicateIds(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
}

function hasPanel(dashboard, title) {
  return (dashboard?.panels ?? []).some((panel) => {
    if (panel?.title !== title) return false;
    return (panel.targets ?? []).some(
      (target) => typeof target?.expr === "string" && target.expr.length > 0,
    );
  });
}

function hasMetricInDashboard(dashboard, metric) {
  return (dashboard?.panels ?? []).some((panel) =>
    (panel?.targets ?? []).some(
      (target) =>
        typeof target?.expr === "string" && target.expr.includes(metric),
    ),
  );
}

function hasAlertRule(alertRules, name) {
  return new RegExp(`^\\s*(?:-\\s*)?alert:\\s*${name}\\s*$`, "mu").test(
    alertRules,
  );
}

function hasRunbookAnnotation(alertRules, runbook) {
  return alertRules
    .split("\n")
    .some((line) => line.trim().startsWith(`runbook: ${runbook}`));
}

function validatePolicyMetadata(policy) {
  const errors = [];
  if (policy.version !== 1)
    errors.push("observability policy version must be 1");
  if (policy.service !== "cvg")
    errors.push("observability policy service must be cvg");
  if (policy.dashboard !== DASHBOARD_PATH)
    errors.push("observability policy dashboard path is not canonical");
  if (policy.alertRules !== ALERT_RULES_PATH)
    errors.push("observability policy alertRules path is not canonical");
  if (policy.externalEvidenceRequired !== true)
    errors.push("external observability evidence must remain required");
  if (policy.productionAcknowledgement !== "NOT_CONFIGURED")
    errors.push("production acknowledgement must remain NOT_CONFIGURED");
  return errors;
}

export function validateObservabilitySignal(signal, dashboard, snapshot) {
  const id = signal?.id ?? "unknown";
  const errors = [];
  if (typeof signal?.category !== "string" || signal.category.trim() === "")
    errors.push(`observability signal ${id} has no category`);
  if (typeof signal?.metric !== "string" || signal.metric.trim() === "")
    errors.push(`observability signal ${id} has no metric`);
  if (
    typeof signal?.dashboardPanelTitle !== "string" ||
    !hasPanel(dashboard, signal.dashboardPanelTitle)
  ) {
    errors.push(`observability signal ${id} dashboard panel is missing`);
  }
  if (typeof signal?.owner !== "string" || signal.owner.trim() === "")
    errors.push(`observability signal ${id} has no owner`);
  if (typeof signal?.escalation !== "string" || signal.escalation.trim() === "")
    errors.push(`observability signal ${id} has no escalation`);
  if (
    typeof signal?.runbook !== "string" ||
    !signal.runbook.startsWith(`${RUNBOOK_PATH}#`)
  ) {
    errors.push(`observability signal ${id} runbook is not canonical`);
  } else if (value(snapshot, RUNBOOK_PATH) === undefined) {
    errors.push(`observability signal ${id} runbook path does not exist`);
  }
  if (
    !Number.isInteger(signal?.acknowledgementWindowMinutes) ||
    signal.acknowledgementWindowMinutes < 5
  ) {
    errors.push(`observability signal ${id} acknowledgement window is invalid`);
  }
  if (signal?.piiSafe !== true)
    errors.push(`observability signal ${id} must be marked piiSafe`);
  if (!hasMetricInDashboard(dashboard, signal?.metric))
    errors.push(`observability signal ${id} metric is absent from dashboard`);
  const markers = Array.isArray(signal?.instrumentationMarkers)
    ? signal.instrumentationMarkers
    : [];
  for (const marker of markers) {
    const found = SOURCE_PATHS.some((path) =>
      String(value(snapshot, path) ?? "").includes(marker),
    );
    if (!found)
      errors.push(
        `observability signal ${id} marker is not instrumented: ${marker}`,
      );
  }
  return Object.freeze(errors);
}

function validateSignalCatalog(signals, dashboard, snapshot) {
  const errors = [];
  const signalIds = signals.map((signal) => signal?.id);
  if (signals.length !== REQUIRED_SIGNAL_IDS.length) {
    errors.push(
      `observability policy must contain ${REQUIRED_SIGNAL_IDS.length} signals`,
    );
  }
  for (const signalId of duplicateIds(signalIds)) {
    errors.push(`observability signal ${signalId} is duplicated`);
  }
  for (const requiredId of REQUIRED_SIGNAL_IDS) {
    if (!signalIds.includes(requiredId)) {
      errors.push(`observability signal ${requiredId} is missing`);
    }
  }
  for (const signal of signals) {
    errors.push(...validateObservabilitySignal(signal, dashboard, snapshot));
  }
  return errors;
}

export function validateObservabilityAlert(alert, alertRules) {
  const name = alert?.name ?? "unknown";
  const errors = [];
  if (!hasAlertRule(alertRules ?? "", name))
    errors.push(`observability alert ${name} is absent from alert rules`);
  if (!KNOWN_SIGNAL_IDS.has(alert?.signalId))
    errors.push(`observability alert ${name} references an unknown signal`);
  if (!ALERT_SEVERITIES.has(alert?.severity))
    errors.push(`observability alert ${name} has an invalid severity`);
  if (typeof alert?.owner !== "string" || alert.owner.trim() === "")
    errors.push(`observability alert ${name} has no owner`);
  if (
    typeof alert?.runbook !== "string" ||
    !alert.runbook.startsWith(`${RUNBOOK_PATH}#`)
  ) {
    errors.push(`observability alert ${name} runbook is not canonical`);
  } else if (!hasRunbookAnnotation(alertRules ?? "", alert.runbook)) {
    errors.push(`observability alert ${name} has no runbook annotation`);
  }
  if (
    !Number.isInteger(alert?.acknowledgementWindowMinutes) ||
    alert.acknowledgementWindowMinutes < 5
  ) {
    errors.push(
      `observability alert ${name} acknowledgement window is invalid`,
    );
  }
  if (
    !Number.isInteger(alert?.dedupeWindowMinutes) ||
    alert.dedupeWindowMinutes < 5
  ) {
    errors.push(`observability alert ${name} dedupe window is invalid`);
  }
  if (alert?.piiSafe !== true)
    errors.push(`observability alert ${name} must be marked piiSafe`);
  return Object.freeze(errors);
}

function validateAlertCatalog(alerts, alertRules) {
  const errors = [];
  const alertNames = alerts.map((alert) => alert?.name);
  if (alerts.length !== REQUIRED_ALERT_NAMES.length) {
    errors.push(
      `observability policy must contain ${REQUIRED_ALERT_NAMES.length} alerts`,
    );
  }
  for (const requiredName of REQUIRED_ALERT_NAMES) {
    if (!alertNames.includes(requiredName)) {
      errors.push(`observability alert ${requiredName} is missing`);
    }
  }
  for (const name of duplicateIds(alertNames)) {
    errors.push(`observability alert ${name} is duplicated`);
  }
  for (const alert of alerts) {
    errors.push(...validateObservabilityAlert(alert, alertRules));
  }
  return errors;
}

function validateAlertRules(alertRules) {
  const errors = [];
  const alertRuleNames = [
    ...(alertRules ?? "").matchAll(/^\s*(?:-\s*)?alert:\s*(\S+)\s*$/gmu),
  ].map((match) => match[1]);
  for (const name of duplicateIds(alertRuleNames)) {
    errors.push(`alert rule ${name} is duplicated`);
  }
  if (FORBIDDEN_ALERT_MARKER.test(alertRules ?? "")) {
    errors.push("alert rules contain forbidden PII or secret markers");
  }
  return errors;
}

export function validateObservabilityGovernance(snapshot) {
  const errors = [];
  const policy = parseJson(snapshot, POLICY_PATH, errors);
  const dashboard = parseJson(snapshot, DASHBOARD_PATH, errors);
  const alertRules = value(snapshot, ALERT_RULES_PATH);

  if (typeof alertRules !== "string") {
    errors.push(`missing ${ALERT_RULES_PATH}`);
  }
  if (policy === null) return Object.freeze(errors);

  errors.push(...validatePolicyMetadata(policy));
  errors.push(
    ...validateSignalCatalog(
      Array.isArray(policy.signals) ? policy.signals : [],
      dashboard,
      snapshot,
    ),
  );
  errors.push(
    ...validateAlertCatalog(
      Array.isArray(policy.alerts) ? policy.alerts : [],
      alertRules,
    ),
  );
  errors.push(...validateAlertRules(alertRules));
  return Object.freeze(errors);
}

export function buildObservabilityGovernanceReport(snapshot) {
  const errors = validateObservabilityGovernance(snapshot);
  if (errors.length > 0) throw new Error(errors.join("; "));
  const policy = JSON.parse(value(snapshot, POLICY_PATH));
  return Object.freeze({
    status: "PASS_WITH_EXTERNAL_OPERATIONAL_GAPS",
    service: policy.service,
    signalCount: policy.signals.length,
    alertCount: policy.alerts.length,
    runbookCount: new Set(
      policy.signals.map((signal) => signal.runbook.split("#")[0]),
    ).size,
    externalEvidenceRequired: policy.externalEvidenceRequired,
    productionAcknowledgement: policy.productionAcknowledgement,
  });
}

export async function loadObservabilityGovernanceSnapshot(
  rootOrSnapshot = process.cwd(),
) {
  if (rootOrSnapshot instanceof Map) return rootOrSnapshot;
  const root =
    typeof rootOrSnapshot === "string" ? rootOrSnapshot : process.cwd();
  const paths = [
    POLICY_PATH,
    DASHBOARD_PATH,
    ALERT_RULES_PATH,
    RUNBOOK_PATH,
    ...SOURCE_PATHS,
  ];
  const entries = await Promise.all(
    paths.map(async (path) => [path, await readFile(join(root, path), "utf8")]),
  );
  return new Map(entries);
}

async function main() {
  const snapshot = await loadObservabilityGovernanceSnapshot();
  const errors = validateObservabilityGovernance(snapshot);
  if (errors.length > 0) {
    console.error(
      `observability governance gate failed (${errors.length} findings):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify(buildObservabilityGovernanceReport(snapshot), null, 2),
  );
}

if (process.argv[1]?.endsWith("verify-observability-governance.mjs")) {
  await main();
}
