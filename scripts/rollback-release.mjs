import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

import {
  assertDistinctRollbackProvenance,
  assertReleaseManifest,
} from "./release-manifest.mjs";
import {
  RELEASE_HEALTH_SERVICES,
  assertCanaryGate,
  assertMutationGateClosed,
  assertOutboxDrained,
  assertReleaseServicesHealthy,
  assertRollbackServicesQuiescent,
  buildCanaryProbeArgs,
  buildRollbackRolloutPlan,
  buildRuntimeContainerNames,
  createCanaryGateState,
  parseComposePsHealthOutput,
  pullStepResult,
  recordCanaryProbe,
  resolveReleasePullMode,
} from "./release-execution.mjs";
import { runRuntimeProvenanceVerification } from "./verify-runtime-provenance.mjs";

const manifestPath =
  process.env.CVG_RELEASE_MANIFEST ??
  "infra/production/release-manifest.example.json";
const manifest = assertReleaseManifest(
  JSON.parse(await readFile(manifestPath, "utf8")),
);
const composeFile =
  process.env.CVG_COMPOSE_FILE ?? "infra/production/docker-compose.ha.yml";
const project = process.env.CVG_COMPOSE_PROJECT ?? "cvg-trainee-vet-ha";
const healthTarget =
  process.env.CVG_ROLLBACK_HEALTH_URL ??
  `http://127.0.0.1:3180${manifest.healthPath}`;
const execute = process.env.CVG_RELEASE_EXECUTE === "true";
const pullMode = resolveReleasePullMode(process.env);
const environment = {
  ...process.env,
  CVG_APP_IMAGE: `${manifest.image}@${manifest.rollbackImageDigest}`,
  CVG_SOURCE_SHA: manifest.rollbackSourceSha,
};
const rolloutPlan = buildRollbackRolloutPlan(manifest);

if (!execute) {
  console.log(
    JSON.stringify({
      status: "DRY_RUN",
      releaseId: manifest.releaseId,
      rollbackImageDigest: manifest.rollbackImageDigest,
      rollbackSourceSha: manifest.rollbackSourceSha,
      sourceSha: manifest.sourceSha,
      versionedRollback: manifest.sourceSha !== manifest.rollbackSourceSha,
      healthTarget,
      healthServices: RELEASE_HEALTH_SERVICES,
      mutationGateRequired: true,
      steps: rolloutPlan.map(({ id }) => id),
      executeWith: "CVG_RELEASE_EXECUTE=true",
    }),
  );
  process.exit(0);
}

if (
  process.env.CVG_RELEASE_LOCAL_REHEARSAL !== "true" ||
  process.env.CVG_REQUIRE_VERSIONED_ROLLBACK === "true"
) {
  assertDistinctRollbackProvenance(manifest);
}
assertMutationGateClosed(process.env);

if (pullMode === "required") {
  await runCompose(["pull", "api-a", "api-b", "worker-a", "worker-b"]);
} else {
  console.log(JSON.stringify(pullStepResult(pullMode)));
}
let provenance = null;
let workerProvenance = null;
let canaryProvenance = null;
let canary = null;
let workerStateBeforeDrain = null;
let drainEvidence = null;
let outboxDrainEvidence = null;
for (const step of rolloutPlan) {
  if (step.id === "prove-outbox-drained-before-n-minus-1") {
    const result = await runCompose(step.args, { capture: true });
    outboxDrainEvidence = assertOutboxDrained(result.stdout);
  } else if (step.args !== undefined) {
    await runCompose(step.args);
  }
  if (step.id === "inspect-n-workers-for-recovery") {
    workerStateBeforeDrain = await readServiceRecords(step.services);
  }
  if (step.id === "prove-n-workers-drained") {
    if (workerStateBeforeDrain === null) {
      throw new Error("rollback worker baseline was not inspected");
    }
    drainEvidence = assertRollbackServicesQuiescent(
      workerStateBeforeDrain,
      await readServiceRecords(step.services),
      { services: step.services },
    );
  }
  if (step.id === "prove-n-minus-1-workers") {
    await waitForServicesHealthy(step.services, "rollback-workers");
    workerProvenance = await verifyRuntimeProvenance(step.services);
  }
  if (step.id === "prove-rollback-api-canary-and-workers") {
    await waitForServicesHealthy(step.services, "rollback-canary");
    canaryProvenance = await verifyRuntimeProvenance(step.services);
  }
  if (step.id === "probe-rollback-api-canary") {
    canary = await waitForCanary(manifest.canaryService, manifest.healthPath);
  }
  if (step.id === "prove-rollback-promotion") {
    await waitForServicesHealthy(step.services, "rollback");
    provenance = await verifyRuntimeProvenance(step.services);
  }
  if (step.id === "restore-edge") await waitForHealth(healthTarget);
}
if (
  drainEvidence === null ||
  outboxDrainEvidence === null ||
  workerProvenance === null ||
  canaryProvenance === null ||
  canary === null ||
  provenance === null
) {
  throw new Error("rollback rollout plan did not complete its proof gate");
}

console.log(
  JSON.stringify({
    status: "PASS",
    releaseId: manifest.releaseId,
    rollbackImageDigest: manifest.rollbackImageDigest,
    rollbackSourceSha: manifest.rollbackSourceSha,
    canary,
    drain: drainEvidence?.status,
    recoveredServices: drainEvidence?.recoveredServices ?? [],
    outboxDrain: outboxDrainEvidence?.status,
    provenance: provenance.status,
    healthTarget,
    healthServices: RELEASE_HEALTH_SERVICES,
  }),
);

function composeArgs(args) {
  return [
    "compose",
    ...(process.env.CVG_COMPOSE_ENV_FILE
      ? ["--env-file", process.env.CVG_COMPOSE_ENV_FILE]
      : []),
    ...(process.env.CVG_COMPOSE_METRICS_ENV_FILE
      ? ["--env-file", process.env.CVG_COMPOSE_METRICS_ENV_FILE]
      : []),
    "-f",
    composeFile,
    "-p",
    project,
    ...args,
  ];
}

async function verifyRuntimeProvenance(services) {
  const result = await runRuntimeProvenanceVerification({
    ...environment,
    CVG_VERIFY_RUNTIME_PROVENANCE: "true",
    CVG_RUNTIME_EXPECTED_SOURCE_SHA: manifest.rollbackSourceSha,
    CVG_RUNTIME_EXPECTED_DIGEST: manifest.rollbackImageDigest,
    CVG_RUNTIME_EXPECTED_QDRANT_IDENTITY: manifest.rollbackQdrantIdentity,
    CVG_RUNTIME_CONTAINERS: buildRuntimeContainerNames(project, services).join(
      ",",
    ),
  });
  if (result.status !== "PASS") {
    throw new Error("rollback runtime provenance attestation was not verified");
  }
  return result;
}

async function waitForCanary(service, healthPath) {
  const deadline = Date.now() + manifest.canarySeconds * 1_000;
  let state = createCanaryGateState({
    stableProbes: manifest.canaryStableProbes,
  });
  let lastError = "unreachable";
  while (Date.now() < deadline) {
    try {
      await runCompose(buildCanaryProbeArgs({ service, healthPath }));
      state = recordCanaryProbe(state, true);
      if (state.consecutiveSuccesses >= state.stableProbes) {
        return assertCanaryGate(state);
      }
    } catch (error) {
      state = recordCanaryProbe(state, false);
      lastError = error instanceof Error ? error.message : "probe failed";
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  try {
    return assertCanaryGate(state);
  } catch {
    throw new Error(
      `rollback canary health gate did not recover (${lastError}; ${state.consecutiveSuccesses}/${state.stableProbes} consecutive successes)`,
    );
  }
}

function runCompose(args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const stdio = capture ? ["ignore", "pipe", "pipe"] : "inherit";
    const child = spawn("docker", composeArgs(args), {
      env: environment,
      stdio,
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
    }
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`docker compose exited with code ${code}`));
      }
    });
  });
}

async function waitForServicesHealthy(services, phase) {
  const deadline = Date.now() + manifest.canarySeconds * 1_000;
  let lastError = "unreachable";
  while (Date.now() < deadline) {
    try {
      const result = await runCompose(
        ["ps", "--all", "--format", "json", ...services],
        { capture: true },
      );
      return assertReleaseServicesHealthy(
        parseComposePsHealthOutput(result.stdout),
        { phase, services },
      );
    } catch (error) {
      lastError = error instanceof Error ? error.message : "probe failed";
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`${phase} health gate timed out (${lastError})`);
}

async function readServiceRecords(services) {
  const result = await runCompose(
    ["ps", "--all", "--format", "json", ...services],
    { capture: true },
  );
  return parseComposePsHealthOutput(result.stdout);
}

async function waitForHealth(target) {
  const deadline = Date.now() + manifest.canarySeconds * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(target, {
        signal: globalThis.AbortSignal.timeout(5_000),
      });
      if (response.ok) return;
    } catch {
      // Retry until the health gate deadline; do not expose response bodies.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("rollback health gate failed");
}
