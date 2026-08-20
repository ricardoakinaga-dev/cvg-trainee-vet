import process from "node:process";
import { fileURLToPath } from "node:url";

const ALERT_NAME_PREFIX = "CvgB99204SyntheticProbe";
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 30_000;

function assertRuntimeUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      "CVG_ALERTMANAGER_RUNTIME_URL is required for the approved lifecycle probe",
    );
  }
  const url = new URL(value);
  if (!/^https?:$/iu.test(url.protocol)) {
    throw new Error("Alertmanager runtime URL must use HTTP or HTTPS");
  }
  return url.toString().replace(/\/$/u, "");
}

function matchingAlerts(alerts, alertName) {
  return (Array.isArray(alerts) ? alerts : []).filter(
    (alert) => alert?.labels?.alertname === alertName,
  );
}

function activeAlert(alerts, alertName) {
  return matchingAlerts(alerts, alertName).find(
    (alert) => alert?.status?.state === "active",
  );
}

function acknowledgedAlert(alerts, alertName) {
  return matchingAlerts(alerts, alertName).find(
    (alert) =>
      alert?.status?.state === "suppressed" &&
      Array.isArray(alert?.status?.silencedBy) &&
      alert.status.silencedBy.length > 0,
  );
}

export function validateAlertLifecycle(snapshot) {
  const errors = [];
  const alertName = snapshot?.alertName;
  if (typeof alertName !== "string" || alertName.length === 0) {
    errors.push("synthetic alert name is missing");
  }
  if (activeAlert(snapshot?.active, alertName) === undefined) {
    errors.push("firing phase was not observed");
  }
  if (acknowledgedAlert(snapshot?.acknowledged, alertName) === undefined) {
    errors.push("acknowledgement phase was not observed");
  }
  if (matchingAlerts(snapshot?.resolved, alertName).length > 0) {
    errors.push("resolve phase was not observed");
  }

  return Object.freeze({
    status: errors.length === 0 ? "PASS" : "FAIL",
    phases: Object.freeze({
      firing: errors.some((error) => error.includes("firing"))
        ? "missing"
        : "observed",
      acknowledged: errors.some((error) => error.includes("acknowledgement"))
        ? "missing"
        : "observed",
      resolved: errors.some((error) => error.includes("resolve"))
        ? "missing"
        : "observed",
    }),
    errors: Object.freeze(errors),
  });
}

async function requestJson(baseUrl, path, init, fetchImpl) {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    signal: globalThis.AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(
      `Alertmanager endpoint ${path} returned HTTP ${response.status}`,
    );
  }
  const text = await response.text();
  return text.trim() === "" ? undefined : JSON.parse(text);
}

async function readSyntheticAlerts(baseUrl, fetchImpl) {
  return await requestJson(
    baseUrl,
    "/api/v2/alerts?active=true&silenced=true&inhibited=true",
    undefined,
    fetchImpl,
  );
}

async function waitForAlerts(baseUrl, fetchImpl, predicate) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let alerts = [];
  while (Date.now() < deadline) {
    alerts = await readSyntheticAlerts(baseUrl, fetchImpl);
    if (predicate(alerts)) return alerts;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return alerts;
}

function syntheticAlert(alertName, startsAt, endsAt) {
  return {
    labels: {
      alertname: alertName,
      owner: "sre",
      severity: "warning",
      signal: "observability_integrity",
    },
    annotations: { summary: "CVG synthetic Alertmanager lifecycle probe" },
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    generatorURL: "http://cvg.synthetic.invalid/b99-204",
  };
}

async function publishSyntheticAlert(
  baseUrl,
  fetchImpl,
  alertName,
  startsAt,
  endsAt,
) {
  await requestJson(
    baseUrl,
    "/api/v2/alerts",
    {
      method: "POST",
      body: JSON.stringify([syntheticAlert(alertName, startsAt, endsAt)]),
    },
    fetchImpl,
  );
}

function silenceIdFromResponse(silence) {
  return typeof silence?.silenceId === "string"
    ? silence.silenceId
    : typeof silence?.silenceID === "string"
      ? silence.silenceID
      : typeof silence?.id === "string"
        ? silence.id
        : undefined;
}

async function createSyntheticSilence(baseUrl, fetchImpl, alertName, endsAt) {
  const silence = await requestJson(
    baseUrl,
    "/api/v2/silences",
    {
      method: "POST",
      body: JSON.stringify({
        matchers: [{ name: "alertname", value: alertName, isRegex: false }],
        startsAt: new Date().toISOString(),
        endsAt: endsAt.toISOString(),
        createdBy: "cvg-b99-204-probe",
        comment: "synthetic acknowledgement probe",
      }),
    },
    fetchImpl,
  );
  const silenceId = silenceIdFromResponse(silence);
  if (silenceId === undefined)
    throw new Error("Alertmanager did not return a silence id");
  return silenceId;
}

async function cleanupSyntheticProbe(
  baseUrl,
  fetchImpl,
  probe,
  silenceId,
  resolved,
) {
  if (!resolved) {
    try {
      await publishSyntheticAlert(
        baseUrl,
        fetchImpl,
        probe.alertName,
        probe.startedAt,
        new Date(Date.now() - 1_000),
      );
    } catch {
      // Preserve the original lifecycle failure; cleanup is best effort.
    }
  }
  if (silenceId === undefined) return;
  try {
    await requestJson(
      baseUrl,
      `/api/v2/silence/${encodeURIComponent(silenceId)}`,
      { method: "DELETE" },
      fetchImpl,
    );
  } catch {
    // Preserve the lifecycle result; the next probe can reconcile the silence.
  }
}

async function runSyntheticLifecycle(baseUrl, fetchImpl, probe) {
  let silenceId;
  let resolved = false;
  try {
    await publishSyntheticAlert(
      baseUrl,
      fetchImpl,
      probe.alertName,
      probe.startedAt,
      probe.activeEndsAt,
    );
    const active = await waitForAlerts(
      baseUrl,
      fetchImpl,
      (alerts) => activeAlert(alerts, probe.alertName) !== undefined,
    );
    silenceId = await createSyntheticSilence(
      baseUrl,
      fetchImpl,
      probe.alertName,
      probe.activeEndsAt,
    );
    const acknowledged = await waitForAlerts(
      baseUrl,
      fetchImpl,
      (alerts) => acknowledgedAlert(alerts, probe.alertName) !== undefined,
    );
    await publishSyntheticAlert(
      baseUrl,
      fetchImpl,
      probe.alertName,
      probe.startedAt,
      new Date(Date.now() - 1_000),
    );
    resolved = true;
    const resolvedSnapshot = await waitForAlerts(
      baseUrl,
      fetchImpl,
      (alerts) => matchingAlerts(alerts, probe.alertName).length === 0,
    );
    return Object.freeze({
      active,
      acknowledged,
      resolved: resolvedSnapshot,
      silenceId,
    });
  } finally {
    await cleanupSyntheticProbe(baseUrl, fetchImpl, probe, silenceId, resolved);
  }
}

export async function verifyAlertmanagerLifecycle(
  environment = process.env,
  fetchImpl = globalThis.fetch,
) {
  if (environment.CVG_VERIFY_ALERTMANAGER_LIFECYCLE !== "true") {
    return Object.freeze({
      status: "NOT_EXECUTED",
      reason:
        "set CVG_VERIFY_ALERTMANAGER_LIFECYCLE=true in the approved runtime environment",
    });
  }
  const baseUrl = assertRuntimeUrl(environment.CVG_ALERTMANAGER_RUNTIME_URL);
  const probe = Object.freeze({
    alertName: `${ALERT_NAME_PREFIX}${Date.now().toString(36)}`,
    startedAt: new Date(Date.now() - 1_000),
    activeEndsAt: new Date(Date.now() + 15 * 60_000),
  });
  const lifecycle = await runSyntheticLifecycle(baseUrl, fetchImpl, probe);
  const result = validateAlertLifecycle({
    alertName: probe.alertName,
    ...lifecycle,
  });
  return Object.freeze({
    ...result,
    mode: "live",
    alertName: probe.alertName,
    silenceId: lifecycle.silenceId,
    baseUrl,
  });
}

const invokedFile =
  process.argv[1] === undefined ? undefined : fileURLToPath(import.meta.url);
if (process.argv[1] === invokedFile) {
  try {
    const result = await verifyAlertmanagerLifecycle();
    console.log(JSON.stringify(result));
    if (result.status === "FAIL") process.exitCode = 1;
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Alertmanager lifecycle verification failed",
    );
    process.exitCode = 1;
  }
}
