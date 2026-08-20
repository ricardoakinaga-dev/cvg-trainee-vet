const RELEASE_PULL_MODES = new Set(["required", "skip"]);
export const DEFAULT_CANARY_STABLE_PROBES = 3;
export const RELEASE_HEALTH_SERVICES = Object.freeze([
  "api-a",
  "api-b",
  "worker-a",
  "worker-b",
]);

export function createCanaryGateState({
  stableProbes = DEFAULT_CANARY_STABLE_PROBES,
} = {}) {
  assertStableProbeCount(stableProbes);
  return Object.freeze({
    stableProbes,
    probes: 0,
    consecutiveSuccesses: 0,
    transientFailures: 0,
  });
}

export function recordCanaryProbe(state, succeeded) {
  if (
    state === null ||
    typeof state !== "object" ||
    !Number.isInteger(state.stableProbes) ||
    typeof succeeded !== "boolean"
  ) {
    throw new Error("canary probe state is invalid");
  }
  return Object.freeze({
    ...state,
    probes: state.probes + 1,
    consecutiveSuccesses: succeeded ? state.consecutiveSuccesses + 1 : 0,
    transientFailures: succeeded
      ? state.transientFailures
      : state.transientFailures + 1,
  });
}

export function assertCanaryGate(state) {
  if (
    state === null ||
    typeof state !== "object" ||
    !Number.isInteger(state.stableProbes) ||
    state.consecutiveSuccesses < state.stableProbes
  ) {
    const consecutiveSuccesses =
      state !== null && typeof state === "object"
        ? state.consecutiveSuccesses
        : 0;
    const stableProbes =
      state !== null && typeof state === "object" ? state.stableProbes : 0;
    throw new Error(
      `canary health gate did not recover (${consecutiveSuccesses}/${stableProbes} consecutive successes)`,
    );
  }
  return Object.freeze({
    status: "PASS",
    probes: state.probes,
    consecutiveSuccesses: state.consecutiveSuccesses,
    transientFailures: state.transientFailures,
  });
}

export function buildRuntimeContainerNames(
  project,
  services = RELEASE_HEALTH_SERVICES,
) {
  if (
    typeof project !== "string" ||
    !/^[a-z0-9][a-z0-9_-]*$/iu.test(project) ||
    !Array.isArray(services) ||
    services.length === 0 ||
    services.some((service) => !RELEASE_HEALTH_SERVICES.includes(service))
  ) {
    throw new Error("runtime provenance project or services are invalid");
  }
  return Object.freeze(services.map((service) => `${project}-${service}-1`));
}

export function parseComposePsHealthOutput(output) {
  if (typeof output !== "string") {
    throw new Error("compose health output must be text");
  }
  const records = [];
  for (const line of output.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("compose health output contains invalid JSON");
    }
    if (Array.isArray(parsed)) records.push(...parsed);
    else records.push(parsed);
  }
  return records;
}

export function assertReleaseServicesHealthy(
  records,
  { phase = "release", services = RELEASE_HEALTH_SERVICES } = {},
) {
  if (!Array.isArray(records) || !Array.isArray(services)) {
    throw new Error("compose health records are invalid");
  }
  const statuses = services.map((service) => {
    const matches = records.filter(
      (record) =>
        record !== null &&
        typeof record === "object" &&
        (record.Service ?? record.service) === service,
    );
    if (matches.length !== 1) {
      return Object.freeze({ service, state: "missing", health: "missing" });
    }
    const record = matches[0];
    return Object.freeze({
      service,
      state: String(record.State ?? record.state ?? "unknown"),
      health: String(record.Health ?? record.health ?? "unknown"),
    });
  });
  const failures = statuses.filter(
    ({ state, health }) => state !== "running" || health !== "healthy",
  );
  if (failures.length > 0) {
    throw new Error(
      `${phase} health gate failed (${failures
        .map(({ service, state, health }) => `${service}: ${state}/${health}`)
        .join(", ")})`,
    );
  }
  return Object.freeze({
    phase,
    services: Object.freeze(statuses.map(({ service }) => service)),
    statuses: Object.freeze(statuses),
  });
}

export function buildCanaryProbeArgs({ service, healthPath }) {
  if (service !== "api-a") {
    throw new Error("canary probe service must be api-a");
  }
  if (
    typeof healthPath !== "string" ||
    !/^\/health\/[A-Za-z0-9/_-]+$/u.test(healthPath)
  ) {
    throw new Error("canary probe health path is invalid");
  }
  const target = JSON.stringify(`http://127.0.0.1:3000${healthPath}`);
  return [
    "exec",
    "-T",
    service,
    "node",
    "-e",
    `fetch(${target}, { signal: AbortSignal.timeout(5000) }).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))`,
  ];
}

export function resolveReleasePullMode(environment = process.env) {
  const mode = environment.CVG_RELEASE_PULL ?? "required";
  if (!RELEASE_PULL_MODES.has(mode)) {
    throw new Error("CVG_RELEASE_PULL must be required or skip");
  }
  if (mode === "skip" && environment.CVG_RELEASE_LOCAL_REHEARSAL !== "true") {
    throw new Error(
      "CVG_RELEASE_PULL=skip requires CVG_RELEASE_LOCAL_REHEARSAL=true",
    );
  }
  return mode;
}

export function pullStepResult(mode) {
  if (mode === "required") return null;
  return Object.freeze({
    status: "LOCAL_REHEARSAL",
    pull: "skipped",
    reason: "immutable image is already present in the local daemon",
  });
}

function assertStableProbeCount(stableProbes) {
  if (
    !Number.isInteger(stableProbes) ||
    stableProbes < 1 ||
    stableProbes > 60
  ) {
    throw new Error("canaryStableProbes must be between 1 and 60");
  }
}
