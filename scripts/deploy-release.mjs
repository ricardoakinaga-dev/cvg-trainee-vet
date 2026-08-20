import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

import {
  assertDistinctRollbackProvenance,
  assertReleaseManifest,
} from "./release-manifest.mjs";
import {
  RELEASE_HEALTH_SERVICES,
  assertReleaseServicesHealthy,
  assertCanaryGate,
  buildCanaryProbeArgs,
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
  process.env.CVG_CANARY_HEALTH_URL ??
  `http://127.0.0.1:3180${manifest.healthPath}`;
const execute = process.env.CVG_RELEASE_EXECUTE === "true";
const pullMode = resolveReleasePullMode(process.env);
const composeEnvironment = {
  ...process.env,
  CVG_APP_IMAGE: `${manifest.image}@${manifest.imageDigest}`,
  CVG_SOURCE_SHA: manifest.sourceSha,
};

const steps = [
  "pull immutable application image",
  "run expand/contract migration",
  "deploy api-a and worker-a canary",
  "wait for api-a and worker-a health gate",
  "deploy api-b and worker-b only after the canary gate",
  "wait for api-a, api-b, worker-a and worker-b health gate",
  "promote edge only after all four process gates",
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

if (pullMode === "required") {
  await runCompose(["pull", "api-a", "api-b", "worker-a", "worker-b"]);
} else {
  console.log(JSON.stringify(pullStepResult(pullMode)));
}
await runCompose(["run", "--rm", "migrate"]);
await runCompose(["up", "-d", "--no-build", "api-a", "worker-a"]);
await waitForServicesHealthy(["api-a", "worker-a"], "canary");
const canaryProvenance = await verifyRuntimeProvenance(
  manifest.sourceSha,
  manifest.imageDigest,
  ["api-a", "worker-a"],
);
const canary = await waitForCanary(manifest.canaryService, manifest.healthPath);
await runCompose(["up", "-d", "--no-build", "api-b", "worker-b"]);
await waitForServicesHealthy(RELEASE_HEALTH_SERVICES, "promotion");
const promotionProvenance = await verifyRuntimeProvenance(
  manifest.sourceSha,
  manifest.imageDigest,
  RELEASE_HEALTH_SERVICES,
);
await runCompose(["up", "-d", "--no-build", "edge"]);
await waitForHealth(healthTarget);

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

async function verifyRuntimeProvenance(sourceSha, digest, services) {
  const result = await runRuntimeProvenanceVerification({
    ...composeEnvironment,
    CVG_VERIFY_RUNTIME_PROVENANCE: "true",
    CVG_RUNTIME_EXPECTED_SOURCE_SHA: sourceSha,
    CVG_RUNTIME_EXPECTED_DIGEST: digest,
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
