import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertReleaseManifest } from "./release-manifest.mjs";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/iu;
const LOCAL_IMAGE_PATTERN = /^cvg-trainee-vet(?::[a-z0-9._-]+)?$/iu;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const DEFAULT_LOCAL_IMAGE = "cvg-trainee-vet:local";
const DEFAULT_COMPOSE_FILE = "infra/production/docker-compose.ha.yml";
const DEFAULT_COMPOSE_ENV_FILE = "infra/production/.env.local";
const DEFAULT_PROJECT = "cvg-trainee-vet-ha";
const DEFAULT_HEALTH_TARGET = "http://127.0.0.1:3180/health/ready";

export function assertLocalReleaseRehearsalEnabled(environment = process.env) {
  if (environment.CVG_RUN_LOCAL_RELEASE_REHEARSAL !== "true") {
    throw new Error(
      "local release rehearsal requires CVG_RUN_LOCAL_RELEASE_REHEARSAL=true",
    );
  }
}

export function parseRepositoryDigest(reference) {
  const separator = reference.lastIndexOf("@");
  if (separator < 1) {
    throw new Error("local image must expose an immutable repository digest");
  }
  const image = reference.slice(0, separator);
  const digest = reference.slice(separator + 1);
  if (!DIGEST_PATTERN.test(digest)) {
    throw new Error("local image must expose an immutable repository digest");
  }
  return Object.freeze({ image, digest });
}

export function createLocalReleaseManifest({
  releaseDigest,
  rollbackDigest,
  releaseId = "cvg-local-rehearsal",
  image = "cvg-trainee-vet",
  canarySeconds = 30,
}) {
  const manifest = {
    releaseId,
    image,
    imageDigest: releaseDigest,
    rollbackImageDigest: rollbackDigest,
    migrationStrategy: "EXPAND_CONTRACT",
    canaryService: "api-a",
    healthPath: "/health/ready",
    canarySeconds,
  };
  return Object.freeze(assertReleaseManifest(manifest));
}

export function buildLocalReleaseEnvironment(inherited = {}) {
  return Object.freeze({
    ...inherited,
    CVG_RELEASE_EXECUTE: "true",
    CVG_RELEASE_LOCAL_REHEARSAL: "true",
    CVG_RELEASE_PULL: "skip",
  });
}

export async function runLocalReleaseRehearsal(environment = process.env) {
  assertLocalReleaseRehearsalEnabled(environment);

  const localImage = environment.CVG_LOCAL_RELEASE_IMAGE ?? DEFAULT_LOCAL_IMAGE;
  assertLocalImage(localImage);

  const composeFile = environment.CVG_COMPOSE_FILE ?? DEFAULT_COMPOSE_FILE;
  const composeEnvFile =
    environment.CVG_COMPOSE_ENV_FILE ?? DEFAULT_COMPOSE_ENV_FILE;
  const project = environment.CVG_COMPOSE_PROJECT ?? DEFAULT_PROJECT;
  const healthTarget =
    environment.CVG_CANARY_HEALTH_URL ?? DEFAULT_HEALTH_TARGET;
  assertLoopbackUrl(healthTarget);
  if (!existsSync(composeFile)) {
    throw new Error(`local rehearsal compose file not found: ${composeFile}`);
  }
  if (!existsSync(composeEnvFile)) {
    throw new Error(`local rehearsal env file not found: ${composeEnvFile}`);
  }

  const releaseImage = await inspectRepositoryDigest(localImage);
  const rehearsalId = `${process.pid}-${Date.now()}`;
  const rehearsalContainer = `cvg-release-rehearsal-${rehearsalId}`;
  const rollbackTag = `cvg-trainee-vet:local-rollback-${rehearsalId}`;
  let temporaryManifestDirectory;
  let rollbackImageCreated = false;
  let runtimeRestored = false;

  try {
    await runCommand("docker", [
      "create",
      "--name",
      rehearsalContainer,
      localImage,
    ]);
    await runCommand("docker", [
      "commit",
      "--change",
      "LABEL cvg.local.rehearsal=rollback",
      rehearsalContainer,
      rollbackTag,
    ]);
    rollbackImageCreated = true;
    const rollbackImage = await inspectRepositoryDigest(rollbackTag);
    const manifest = createLocalReleaseManifest({
      releaseDigest: releaseImage.digest,
      rollbackDigest: rollbackImage.digest,
      image: releaseImage.image,
    });

    temporaryManifestDirectory = await mkdtemp(
      join(tmpdir(), "cvg-local-release-"),
    );
    const manifestPath = join(temporaryManifestDirectory, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const releaseEnvironment = {
      ...buildLocalReleaseEnvironment(environment),
      CVG_RELEASE_MANIFEST: manifestPath,
      CVG_COMPOSE_FILE: composeFile,
      CVG_COMPOSE_ENV_FILE: composeEnvFile,
      CVG_COMPOSE_PROJECT: project,
      CVG_CANARY_HEALTH_URL: healthTarget,
      CVG_ROLLBACK_HEALTH_URL: healthTarget,
    };

    await runCommand(process.execPath, ["scripts/deploy-release.mjs"], {
      environment: releaseEnvironment,
    });
    await runCommand(process.execPath, ["scripts/rollback-release.mjs"], {
      environment: releaseEnvironment,
    });

    await restoreLocalRuntime({
      composeEnvFile,
      composeFile,
      healthTarget,
      image: localImage,
      project,
      environment,
    });
    runtimeRestored = true;

    const result = {
      status: "PASS",
      mode: "LOCAL_REHEARSAL",
      releaseId: manifest.releaseId,
      releaseDigest: manifest.imageDigest,
      rollbackDigest: manifest.rollbackImageDigest,
      deploy: "PASS",
      rollback: "PASS",
      runtimeRestored: true,
      healthTarget,
    };
    console.log(JSON.stringify(result));
    return Object.freeze(result);
  } finally {
    await removeContainer(rehearsalContainer);
    if (temporaryManifestDirectory) {
      await rm(temporaryManifestDirectory, { force: true, recursive: true });
    }
    if (rollbackImageCreated && runtimeRestored) {
      await removeImage(rollbackTag);
    } else if (rollbackImageCreated) {
      console.error(
        `rollback rehearsal image retained for recovery: ${rollbackTag}`,
      );
    }
  }
}

async function inspectRepositoryDigest(image) {
  const result = await runCommand("docker", ["image", "inspect", image], {
    capture: true,
  });
  const records = JSON.parse(result.stdout);
  const repositoryDigest = records[0]?.RepoDigests?.[0];
  if (typeof repositoryDigest !== "string") {
    throw new Error(`image has no immutable repository digest: ${image}`);
  }
  return parseRepositoryDigest(repositoryDigest);
}

async function restoreLocalRuntime({
  composeEnvFile,
  composeFile,
  healthTarget,
  image,
  project,
  environment,
}) {
  await runCompose(
    ["up", "-d", "--no-build", "api-a", "api-b", "worker-a", "worker-b"],
    {
      composeEnvFile,
      composeFile,
      environment: { ...environment, CVG_APP_IMAGE: image },
      project,
    },
  );
  await waitForHealth(healthTarget);
}

function runCompose(args, options) {
  return runCommand(
    "docker",
    [
      "compose",
      ...(options.composeEnvFile ? ["--env-file", options.composeEnvFile] : []),
      "--file",
      options.composeFile,
      "--project-name",
      options.project,
      ...args,
    ],
    { environment: options.environment },
  );
}

async function waitForHealth(target) {
  const deadline = Date.now() + 60_000;
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
  throw new Error(`local rehearsal health gate failed (${lastStatus})`);
}

function assertLocalImage(image) {
  if (!LOCAL_IMAGE_PATTERN.test(image)) {
    throw new Error(
      "local release rehearsal accepts only the local cvg-trainee-vet image",
    );
  }
}

function assertLoopbackUrl(value) {
  const url = new URL(value);
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("local release rehearsal health target must be loopback");
  }
}

function runCommand(command, args, options = {}) {
  const environment = options.environment ?? process.env;
  const stdio = options.capture
    ? ["ignore", "pipe", "pipe"]
    : options.quiet
      ? "ignore"
      : "inherit";
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: environment, stdio });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} ${args[0] ?? "command"} failed (${code}): ${stderr
            .trim()
            .slice(-1_000)}`,
        ),
      );
    });
  });
}

async function removeContainer(name) {
  await runCommand("docker", ["rm", "-f", name], { quiet: true }).catch(
    () => undefined,
  );
}

async function removeImage(name) {
  await runCommand("docker", ["image", "rm", name], { quiet: true }).catch(
    () => undefined,
  );
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  runLocalReleaseRehearsal().catch((error) => {
    console.error(error instanceof Error ? error.message : "rehearsal failed");
    process.exitCode = 1;
  });
}
