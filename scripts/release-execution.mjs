const RELEASE_PULL_MODES = new Set(["required", "skip"]);
export const DEFAULT_CANARY_STABLE_PROBES = 3;
export const RELEASE_HEALTH_SERVICES = Object.freeze([
  "api-a",
  "api-b",
  "worker-a",
  "worker-b",
]);
export const RELEASE_WORKER_SERVICES = Object.freeze(["worker-a", "worker-b"]);

function rolloutStep(id, { args, services } = {}) {
  return Object.freeze({
    id,
    ...(args === undefined ? {} : { args: Object.freeze([...args]) }),
    ...(services === undefined
      ? {}
      : { services: Object.freeze([...services]) }),
  });
}

export function assertMutationGateClosed(environment = process.env) {
  if (environment.CVG_RELEASE_MUTATION_GATE_CLOSED !== "true") {
    throw new Error(
      "CVG_RELEASE_MUTATION_GATE_CLOSED=true is required during worker cutover",
    );
  }
  return true;
}

export function buildOutboxDrainProbeArgs() {
  return Object.freeze([
    "exec",
    "-T",
    "postgres",
    "sh",
    "-ec",
    'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "select count(*) from outbox_events where status in (\'PENDING\', \'PROCESSING\')"',
  ]);
}

export function assertOutboxDrained(output) {
  if (typeof output !== "string" || !/^\s*\d+\s*$/u.test(output)) {
    throw new Error("rollback outbox drain probe returned invalid output");
  }
  const pendingOrProcessing = Number(output.trim());
  if (!Number.isSafeInteger(pendingOrProcessing)) {
    throw new Error("rollback outbox drain probe returned invalid output");
  }
  if (pendingOrProcessing !== 0) {
    throw new Error(
      `rollback outbox drain gate failed (${pendingOrProcessing} active events)`,
    );
  }
  return Object.freeze({ status: "PASS", pendingOrProcessing });
}

export function buildDeployRolloutPlan(manifest) {
  const drainSeconds = assertWorkerDrainSeconds(manifest?.workerDrainSeconds);
  return Object.freeze([
    rolloutStep("prove-n-minus-1-baseline", {
      services: RELEASE_HEALTH_SERVICES,
    }),
    rolloutStep("close-edge-mutation-gate", {
      args: ["stop", "-t", String(drainSeconds), "edge"],
      services: ["edge"],
    }),
    rolloutStep("drain-n-minus-1-workers", {
      args: ["stop", "-t", String(drainSeconds), ...RELEASE_WORKER_SERVICES],
      services: RELEASE_WORKER_SERVICES,
    }),
    rolloutStep("prove-n-minus-1-workers-drained", {
      services: RELEASE_WORKER_SERVICES,
    }),
    rolloutStep("expand-contract-migration", {
      args: ["run", "--rm", "migrate"],
    }),
    rolloutStep("start-n-workers", {
      args: ["up", "-d", "--no-build", ...RELEASE_WORKER_SERVICES],
      services: RELEASE_WORKER_SERVICES,
    }),
    rolloutStep("prove-n-workers", { services: RELEASE_WORKER_SERVICES }),
    rolloutStep("prove-api-peer-n-minus-1", { services: ["api-b"] }),
    rolloutStep("start-api-canary", {
      args: ["up", "-d", "--no-build", "api-a"],
      services: ["api-a"],
    }),
    rolloutStep("prove-api-canary-and-n-workers", {
      services: ["api-a", ...RELEASE_WORKER_SERVICES],
    }),
    rolloutStep("probe-api-canary", { services: ["api-a"] }),
    rolloutStep("start-api-peer", {
      args: ["up", "-d", "--no-build", "api-b"],
      services: ["api-b"],
    }),
    rolloutStep("prove-promotion", { services: RELEASE_HEALTH_SERVICES }),
    rolloutStep("promote-edge", {
      args: ["up", "-d", "--no-build", "edge"],
      services: ["edge"],
    }),
  ]);
}

export function buildRollbackRolloutPlan(manifest) {
  const drainSeconds = assertWorkerDrainSeconds(manifest?.workerDrainSeconds);
  return Object.freeze([
    rolloutStep("inspect-n-workers-for-recovery", {
      services: RELEASE_WORKER_SERVICES,
    }),
    rolloutStep("close-edge-mutation-gate", {
      args: ["stop", "-t", String(drainSeconds), "edge"],
      services: ["edge"],
    }),
    rolloutStep("drain-n-workers", {
      args: ["stop", "-t", String(drainSeconds), ...RELEASE_WORKER_SERVICES],
      services: RELEASE_WORKER_SERVICES,
    }),
    rolloutStep("prove-n-workers-drained", {
      services: RELEASE_WORKER_SERVICES,
    }),
    rolloutStep("prove-outbox-drained-before-n-minus-1", {
      args: buildOutboxDrainProbeArgs(),
    }),
    rolloutStep("start-n-minus-1-workers", {
      args: ["up", "-d", "--no-build", ...RELEASE_WORKER_SERVICES],
      services: RELEASE_WORKER_SERVICES,
    }),
    rolloutStep("prove-n-minus-1-workers", {
      services: RELEASE_WORKER_SERVICES,
    }),
    rolloutStep("start-rollback-api-canary", {
      args: ["up", "-d", "--no-build", "api-a"],
      services: ["api-a"],
    }),
    rolloutStep("prove-rollback-api-canary-and-workers", {
      services: ["api-a", ...RELEASE_WORKER_SERVICES],
    }),
    rolloutStep("probe-rollback-api-canary", { services: ["api-a"] }),
    rolloutStep("start-rollback-api-peer", {
      args: ["up", "-d", "--no-build", "api-b"],
      services: ["api-b"],
    }),
    rolloutStep("prove-rollback-promotion", {
      services: RELEASE_HEALTH_SERVICES,
    }),
    rolloutStep("restore-edge", {
      args: ["up", "-d", "--no-build", "edge"],
      services: ["edge"],
    }),
  ]);
}

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

export function assertReleaseServicesStoppedCleanly(
  records,
  { phase = "drain", services = RELEASE_WORKER_SERVICES } = {},
) {
  if (!Array.isArray(records) || !Array.isArray(services)) {
    throw new Error("compose graceful-stop records are invalid");
  }
  const statuses = services.map((service) => {
    const matches = records.filter(
      (record) =>
        record !== null &&
        typeof record === "object" &&
        (record.Service ?? record.service) === service,
    );
    if (matches.length !== 1) {
      return Object.freeze({ service, state: "missing", exitCode: "missing" });
    }
    const record = matches[0];
    return Object.freeze({
      service,
      state: String(record.State ?? record.state ?? "unknown"),
      exitCode: String(record.ExitCode ?? record.exitCode ?? "unknown"),
    });
  });
  const failures = statuses.filter(
    ({ state, exitCode }) => state !== "exited" || exitCode !== "0",
  );
  if (failures.length > 0) {
    throw new Error(
      `${phase} graceful-stop gate failed (${failures
        .map(
          ({ service, state, exitCode }) => `${service}: ${state}/${exitCode}`,
        )
        .join(", ")})`,
    );
  }
  return Object.freeze({
    status: "PASS",
    phase,
    services: Object.freeze(statuses.map(({ service }) => service)),
    statuses: Object.freeze(statuses),
  });
}

export function assertRollbackServicesQuiescent(
  beforeRecords,
  afterRecords,
  { services = RELEASE_WORKER_SERVICES } = {},
) {
  if (
    !Array.isArray(beforeRecords) ||
    !Array.isArray(afterRecords) ||
    !Array.isArray(services)
  ) {
    throw new Error("rollback quiescence records are invalid");
  }
  const statuses = services.map((service) => {
    const before = serviceProcessStatus(beforeRecords, service);
    const after = serviceProcessStatus(afterRecords, service);
    const validBefore = ["running", "exited"].includes(before.state);
    const cleanRunningStop =
      before.state === "running" &&
      after.state === "exited" &&
      after.exitCode === "0";
    const alreadyQuiescent =
      before.state === "exited" && after.state === "exited";
    return Object.freeze({
      service,
      beforeState: before.state,
      afterState: after.state,
      exitCode: after.exitCode,
      valid: validBefore && (cleanRunningStop || alreadyQuiescent),
      recovered: before.state === "exited",
    });
  });
  const failures = statuses.filter(({ valid }) => !valid);
  if (failures.length > 0) {
    throw new Error(
      `rollback quiescence gate failed (${failures
        .map(
          ({ service, beforeState, afterState, exitCode }) =>
            `${service}: ${beforeState}→${afterState}/${exitCode}`,
        )
        .join(", ")})`,
    );
  }
  const recoveredServices = Object.freeze(
    statuses.filter(({ recovered }) => recovered).map(({ service }) => service),
  );
  return Object.freeze({
    status: recoveredServices.length > 0 ? "PASS_WITH_RECOVERY" : "PASS",
    services: Object.freeze([...services]),
    recoveredServices,
    statuses: Object.freeze(statuses),
  });
}

function serviceProcessStatus(records, service) {
  const matches = records.filter(
    (record) =>
      record !== null &&
      typeof record === "object" &&
      (record.Service ?? record.service) === service,
  );
  if (matches.length !== 1) {
    return Object.freeze({ state: "missing", exitCode: "missing" });
  }
  const record = matches[0];
  return Object.freeze({
    state: String(record.State ?? record.state ?? "unknown"),
    exitCode: String(record.ExitCode ?? record.exitCode ?? "unknown"),
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

function assertWorkerDrainSeconds(workerDrainSeconds) {
  if (
    !Number.isInteger(workerDrainSeconds) ||
    workerDrainSeconds < 1 ||
    workerDrainSeconds > 300
  ) {
    throw new Error("workerDrainSeconds must be between 1 and 300");
  }
  return workerDrainSeconds;
}
