import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

import { assertReleaseManifest } from "./release-manifest.mjs";
import {
  pullStepResult,
  resolveReleasePullMode,
} from "./release-execution.mjs";

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
};

if (!execute) {
  console.log(
    JSON.stringify({
      status: "DRY_RUN",
      releaseId: manifest.releaseId,
      rollbackImageDigest: manifest.rollbackImageDigest,
      healthTarget,
      executeWith: "CVG_RELEASE_EXECUTE=true",
    }),
  );
  process.exit(0);
}

if (pullMode === "required") {
  await runCompose(["pull", "api-a", "api-b", "worker-a", "worker-b"]);
} else {
  console.log(JSON.stringify(pullStepResult(pullMode)));
}
await runCompose([
  "up",
  "-d",
  "--no-build",
  "api-a",
  "api-b",
  "worker-a",
  "worker-b",
]);
await waitForHealth(healthTarget);

console.log(
  JSON.stringify({
    status: "PASS",
    releaseId: manifest.releaseId,
    rollbackImageDigest: manifest.rollbackImageDigest,
    healthTarget,
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

function runCompose(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", composeArgs(args), {
      env: environment,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker compose exited with code ${code}`));
    });
  });
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
