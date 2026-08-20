import process from "node:process";
import { fileURLToPath } from "node:url";

const REQUIRED_RULE_NAMES = Object.freeze([
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

const REQUIRED_TARGET_COUNTS = Object.freeze({
  "cvg-api": 2,
  "cvg-worker": 2,
  alertmanager: 1,
});

const WATCHDOG_QUERY =
  'ALERTS{alertname="CvgObservabilityWatchdog",alertstate="firing"}';

function flattenRules(rules) {
  return (rules?.groups ?? []).flatMap((group) => group?.rules ?? []);
}

function countByJob(targets) {
  return Object.freeze(
    Object.fromEntries(
      Object.keys(REQUIRED_TARGET_COUNTS).map((job) => [
        job,
        targets.filter((target) => target?.labels?.job === job).length,
      ]),
    ),
  );
}

function validateRules(rules, errors) {
  const loadedRules = flattenRules(rules);
  const names = loadedRules.map((rule) => rule?.name);
  const duplicates = names.filter(
    (name, index) => name !== undefined && names.indexOf(name) !== index,
  );
  for (const name of new Set(duplicates)) {
    errors.push(`rule ${name} is duplicated`);
  }
  for (const name of REQUIRED_RULE_NAMES) {
    if (!names.includes(name)) errors.push(`rule ${name} is missing`);
  }
  for (const rule of loadedRules) {
    if (rule?.health !== "ok") {
      errors.push(`rule ${rule?.name ?? "unknown"} is unhealthy`);
    }
  }
  return loadedRules;
}

function validateTargets(targets, errors) {
  const activeTargets = Array.isArray(targets?.activeTargets)
    ? targets.activeTargets
    : [];
  for (const [job, requiredCount] of Object.entries(REQUIRED_TARGET_COUNTS)) {
    const jobTargets = activeTargets.filter(
      (target) => target?.labels?.job === job,
    );
    if (jobTargets.length < requiredCount) {
      errors.push(
        `target job ${job} is absent or incomplete (${jobTargets.length}/${requiredCount})`,
      );
    }
    for (const target of jobTargets) {
      const instance = target?.labels?.instance ?? "unknown";
      if (target?.health !== "up") {
        errors.push(`target ${job}/${instance} is down`);
      }
      if (typeof target?.lastError === "string" && target.lastError !== "") {
        errors.push(`target ${job}/${instance} has scrape error`);
      }
    }
  }
  return activeTargets;
}

function validateAlertmanager(alertmanagers, errors) {
  const active = Array.isArray(alertmanagers?.activeAlertmanagers)
    ? alertmanagers.activeAlertmanagers
    : [];
  if (active.length === 0)
    errors.push("Alertmanager has no active destination");
  return active;
}

function validateWatchdog(watchdog, errors) {
  const firing = (watchdog?.result ?? []).some(
    (sample) =>
      sample?.metric?.alertname === "CvgObservabilityWatchdog" &&
      sample?.metric?.alertstate === "firing",
  );
  if (!firing) errors.push("watchdog is not firing");
  return firing ? "firing" : "missing";
}

export function validatePrometheusRuntime(snapshot) {
  const errors = [];
  const loadedRules = validateRules(snapshot?.rules, errors);
  const activeTargets = validateTargets(snapshot?.targets, errors);
  const activeAlertmanagers = validateAlertmanager(
    snapshot?.alertmanagers,
    errors,
  );
  const watchdog = validateWatchdog(snapshot?.watchdog, errors);

  return Object.freeze({
    status: errors.length === 0 ? "PASS" : "FAIL",
    loadedRuleCount: loadedRules.length,
    expectedRuleCount: REQUIRED_RULE_NAMES.length,
    targetCounts: countByJob(activeTargets),
    activeAlertmanagerCount: activeAlertmanagers.length,
    watchdog,
    errors: Object.freeze(errors),
  });
}

function assertRuntimeUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      "CVG_PROMETHEUS_RUNTIME_URL is required for the approved runtime probe",
    );
  }
  const url = new URL(value);
  if (!/^https?:$/iu.test(url.protocol)) {
    throw new Error("Prometheus runtime URL must use HTTP or HTTPS");
  }
  return url.toString().replace(/\/$/u, "");
}

async function readPrometheusEndpoint(baseUrl, path, fetchImpl) {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    signal: globalThis.AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(
      `Prometheus endpoint ${path} returned HTTP ${response.status}`,
    );
  }
  const payload = await response.json();
  if (payload?.status !== "success") {
    throw new Error(`Prometheus endpoint ${path} returned a failed payload`);
  }
  return payload.data;
}

export async function loadPrometheusRuntimeSnapshot(
  runtimeUrl,
  fetchImpl = globalThis.fetch,
) {
  const baseUrl = assertRuntimeUrl(runtimeUrl);
  const [rules, targets, alertmanagers, watchdog] = await Promise.all([
    readPrometheusEndpoint(baseUrl, "/api/v1/rules?type=alert", fetchImpl),
    readPrometheusEndpoint(baseUrl, "/api/v1/targets?state=active", fetchImpl),
    readPrometheusEndpoint(baseUrl, "/api/v1/alertmanagers", fetchImpl),
    readPrometheusEndpoint(
      baseUrl,
      `/api/v1/query?query=${encodeURIComponent(WATCHDOG_QUERY)}`,
      fetchImpl,
    ),
  ]);
  return Object.freeze({ rules, targets, alertmanagers, watchdog });
}

export async function verifyPrometheusRuntime(
  environment = process.env,
  fetchImpl = globalThis.fetch,
) {
  if (environment.CVG_VERIFY_PROMETHEUS_RUNTIME !== "true") {
    return Object.freeze({
      status: "NOT_EXECUTED",
      reason:
        "set CVG_VERIFY_PROMETHEUS_RUNTIME=true in the approved runtime environment",
    });
  }
  const snapshot = await loadPrometheusRuntimeSnapshot(
    environment.CVG_PROMETHEUS_RUNTIME_URL,
    fetchImpl,
  );
  return validatePrometheusRuntime(snapshot);
}

const invokedFile =
  process.argv[1] === undefined ? undefined : fileURLToPath(import.meta.url);
if (process.argv[1] === invokedFile) {
  try {
    const result = await verifyPrometheusRuntime();
    console.log(JSON.stringify(result));
    if (result.status === "FAIL") process.exitCode = 1;
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Prometheus runtime verification failed",
    );
    process.exitCode = 1;
  }
}
