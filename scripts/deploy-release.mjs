import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

import {
  assertDistinctRollbackProvenance,
  assertReleaseManifest,
} from "./release-manifest.mjs";
import {
  RELEASE_HEALTH_SERVICES,
  assertMutationGateClosed,
  assertReleaseServicesHealthy,
  assertReleaseServicesStoppedCleanly,
  assertCanaryGate,
  buildCanaryProbeArgs,
  buildRuntimeContainerNames,
  buildDeployRolloutPlan,
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
  process.env.CVG_CANARY_HEALTH_URL ??
  `http://127.0.0.1:3180${manifest.healthPath}`;
const execute = process.env.CVG_RELEASE_EXECUTE === "true";
const pullMode = resolveReleasePullMode(process.env);
const composeEnvironment = {
  ...process.env,
  CVG_APP_IMAGE: `${manifest.image}@${manifest.imageDigest}`,
  CVG_SOURCE_SHA: manifest.sourceSha,
};
const rolloutPlan = buildDeployRolloutPlan(manifest);

const steps = [
  "pull immutable application image",
  ...rolloutPlan.map(({ id }) => id),
  "record release id and digest",
];
if (!execute) {
  console.log(
    JSON.stringify({
      status: "DRY_RUN",
      releaseId: manifest.releaseId,
      imageDigest: manifest.imageDigest,
      rollbackImageDigest: manifest.rollbackImageDigest,
      sourceSha: manifest.sourceSha,
      rollbackSourceSha: manifest.rollbackSourceSha,
      canaryStableProbes: manifest.canaryStableProbes,
      versionedRollback: manifest.sourceSha !== manifest.rollbackSourceSha,
      healthTarget,
      healthServices: RELEASE_HEALTH_SERVICES,
      mutationGateRequired: true,
      steps,
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
let canary = null;
let canaryProvenance = null;
let promotionProvenance = null;
for (const step of rolloutPlan) {
  if (step.args !== undefined) await runCompose(step.args);
  if (step.id === "prove-n-minus-1-baseline") {
    await waitForServicesHealthy(step.services, "n-minus-1-baseline");
    await verifyRuntimeProvenance(
      manifest.rollbackSourceSha,
      manifest.rollbackImageDigest,
      step.services,
      manifest.rollbackQdrantIdentity,
    );
  }
  if (step.id === "prove-n-minus-1-workers-drained") {
    await verifyServicesStoppedCleanly(step.services, "n-minus-1-drain");
  }
  if (step.id === "prove-n-workers") {
    await waitForServicesHealthy(step.services, "workers-n");
    await verifyRuntimeProvenance(
      manifest.sourceSha,
      manifest.imageDigest,
      step.services,
      manifest.qdrantIdentity,
    );
  }
  if (step.id === "prove-api-peer-n-minus-1") {
    await waitForServicesHealthy(step.services, "api-peer-n-minus-1");
    await verifyRuntimeProvenance(
      manifest.rollbackSourceSha,
      manifest.rollbackImageDigest,
      step.services,
      manifest.rollbackQdrantIdentity,
    );
  }
  if (step.id === "prove-api-canary-and-n-workers") {
    await waitForServicesHealthy(step.services, "canary");
    canaryProvenance = await verifyRuntimeProvenance(
      manifest.sourceSha,
      manifest.imageDigest,
      step.services,
      manifest.qdrantIdentity,
    );
  }
  if (step.id === "probe-api-canary") {
    canary = await waitForCanary(manifest.canaryService, manifest.healthPath);
  }
  if (step.id === "prove-promotion") {
    await waitForServicesHealthy(step.services, "promotion");
    promotionProvenance = await verifyRuntimeProvenance(
      manifest.sourceSha,
      manifest.imageDigest,
      step.services,
      manifest.qdrantIdentity,
    );
  }
  if (step.id === "promote-edge") await waitForHealth(healthTarget);
}

if (
  canary === null ||
  canaryProvenance === null ||
  promotionProvenance === null
) {
  throw new Error("release rollout plan did not complete every proof gate");
}

console.log(
  JSON.stringify({
    status: "PASS",
    releaseId: manifest.releaseId,
    imageDigest: manifest.imageDigest,
    sourceSha: manifest.sourceSha,
    canary,
    provenance: {
      canary: canaryProvenance.status,
      promotion: promotionProvenance.status,
    },
    healthTarget,
    healthServices: RELEASE_HEALTH_SERVICES,
    rollback:
      "use scripts/rollback-release.mjs with the previous immutable digest",
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

function runCompose(args, { quiet = false, capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const stdio = capture
      ? ["ignore", "pipe", "pipe"]
      : quiet
        ? "ignore"
        : "inherit";
    const child = spawn("docker", composeArgs(args), {
      env: composeEnvironment,
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

async function verifyServicesStoppedCleanly(services, phase) {
  const result = await runCompose(
    ["ps", "--all", "--format", "json", ...services],
    { capture: true },
  );
  return assertReleaseServicesStoppedCleanly(
    parseComposePsHealthOutput(result.stdout),
    { phase, services },
  );
}

async function waitForCanary(service, healthPath) {
  const deadline = Date.now() + manifest.canarySeconds * 1_000;
  let state = createCanaryGateState({
    stableProbes: manifest.canaryStableProbes,
  });
  let lastError = "unreachable";
  while (Date.now() < deadline) {
    try {
      await runCompose(buildCanaryProbeArgs({ service, healthPath }), {
        quiet: true,
      });
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
      `canary health gate did not recover (${lastError}; ${state.consecutiveSuccesses}/${state.stableProbes} consecutive successes)`,
    );
  }
}

async function verifyRuntimeProvenance(
  sourceSha,
  digest,
  services,
  qdrantIdentity,
) {
  const result = await runRuntimeProvenanceVerification({
    ...composeEnvironment,
    CVG_VERIFY_RUNTIME_PROVENANCE: "true",
    CVG_RUNTIME_EXPECTED_SOURCE_SHA: sourceSha,
    CVG_RUNTIME_EXPECTED_DIGEST: digest,
    CVG_RUNTIME_EXPECTED_QDRANT_IDENTITY: qdrantIdentity,
    CVG_RUNTIME_CONTAINERS: buildRuntimeContainerNames(project, services).join(
      ",",
    ),
  });
  if (result.status !== "PASS") {
    throw new Error("release runtime provenance attestation was not verified");
  }
  return result;
}

async function waitForHealth(target) {
  const deadline = Date.now() + manifest.canarySeconds * 1000;
  let lastStatus = "unreachable";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(target, {
        signal: globalThis.AbortSignal.timeout(5_000),
      });
      lastStatus = String(response.status);
      if (response.ok) return;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : "request failed";
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`health gate failed (${lastStatus})`);
}
