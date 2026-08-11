import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

import { assertReleaseManifest } from "./release-manifest.mjs";

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
const composeEnvironment = {
  ...process.env,
  CVG_APP_IMAGE: `${manifest.image}@${manifest.imageDigest}`,
};

const steps = [
  "pull immutable application image",
  "run expand/contract migration",
  "deploy api-a and worker-a canary",
  "wait for health gate",
  "promote api-b, worker-b and edge",
  "record release id and digest",
];
if (!execute) {
  console.log(
    JSON.stringify({
      status: "DRY_RUN",
      releaseId: manifest.releaseId,
      imageDigest: manifest.imageDigest,
      rollbackImageDigest: manifest.rollbackImageDigest,
      healthTarget,
      steps,
      executeWith: "CVG_RELEASE_EXECUTE=true",
    }),
  );
  process.exit(0);
}

await runCompose(["pull", "api-a", "api-b", "worker-a", "worker-b"]);
await runCompose(["run", "--rm", "migrate"]);
await runCompose(["up", "-d", "--no-build", "api-a", "worker-a"]);
await waitForHealth(healthTarget);
await runCompose(["up", "-d", "--no-build", "api-b", "worker-b", "edge"]);
await waitForHealth(healthTarget);

console.log(
  JSON.stringify({
    status: "PASS",
    releaseId: manifest.releaseId,
    imageDigest: manifest.imageDigest,
    healthTarget,
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

function runCompose(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", composeArgs(args), {
      env: composeEnvironment,
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
