import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ACTIVE_HA_FIXTURE_SERVICE = "real-e2e-fixture";
const DEFAULT_FIXTURE_CONTAINER_FILE = "/tmp/cvg-real-e2e-fixture.json";
const DEFAULT_FIXTURE_PORT = 3102;

function assertLocalBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)
  ) {
    throw new Error("active HA E2E base URL must be local");
  }
  return parsed.toString().replace(/\/$/u, "");
}

export function buildActiveHaComposeArgs({
  composeFile,
  envFile,
  projectName,
}) {
  return [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    envFile,
    "--file",
    composeFile,
    "--profile",
    "e2e",
    "up",
    "--detach",
    "--no-deps",
    ACTIVE_HA_FIXTURE_SERVICE,
  ];
}

export function buildActiveHaPlaywrightEnvironment({
  baseUrl,
  fixtureFile,
  inherited,
}) {
  const localBaseUrl = assertLocalBaseUrl(baseUrl);
  const withoutDisposableMode = Object.fromEntries(
    Object.entries(inherited).filter(([key]) => key !== "CVG_RUN_REAL_E2E"),
  );
  return {
    ...withoutDisposableMode,
    BASE_URL: localBaseUrl,
    CVG_REAL_E2E_FIXTURE_FILE: fixtureFile,
    CVG_RUN_ACTIVE_HA_E2E: "true",
  };
}

function run(command, args, { cwd, env, capture = false } = {}) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
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
    child.once("close", (code, signal) => {
      resolveResult({ code: code ?? 1, signal, stdout, stderr });
    });
  });
}

async function waitForFixture(port) {
  const url = `http://127.0.0.1:${port}/ready`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The container is still starting.
    }
    await new Promise((resolveResult) => setTimeout(resolveResult, 250));
  }
  throw new Error("active HA E2E fixture did not become ready");
}

async function main() {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const composeFile = resolve(
    process.env.CVG_HA_COMPOSE_FILE ??
      join(projectRoot, "infra/production/docker-compose.ha.yml"),
  );
  const envFile = resolve(
    process.env.CVG_HA_ENV_FILE ??
      join(projectRoot, "infra/production/.env.local"),
  );
  const projectName =
    process.env.CVG_HA_COMPOSE_PROJECT ?? "cvg-trainee-vet-ha";
  const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
  const fixturePort = Number(
    process.env.CVG_REAL_E2E_FIXTURE_PORT ?? String(DEFAULT_FIXTURE_PORT),
  );
  if (
    !Number.isInteger(fixturePort) ||
    fixturePort < 1 ||
    fixturePort > 65_535
  ) {
    throw new Error("CVG_REAL_E2E_FIXTURE_PORT is invalid");
  }

  const tempDirectory = await mkdtemp(join(tmpdir(), "cvg-active-ha-e2e-"));
  const hostFixtureFile = join(
    tempDirectory,
    basename(DEFAULT_FIXTURE_CONTAINER_FILE),
  );
  const composePrefix = buildActiveHaComposeArgs({
    composeFile,
    envFile,
    projectName,
  }).slice(0, -4);
  const composeEnvironment = {
    ...process.env,
    CVG_REAL_E2E_FIXTURE_PORT: String(fixturePort),
  };
  let testCode = 1;
  let fixtureContainerId;

  try {
    await run(
      "docker",
      [...composePrefix, "rm", "--force", "--stop", ACTIVE_HA_FIXTURE_SERVICE],
      { cwd: projectRoot, env: composeEnvironment },
    );

    const up = await run(
      "docker",
      buildActiveHaComposeArgs({ composeFile, envFile, projectName }),
      { cwd: projectRoot, env: composeEnvironment },
    );
    if (up.code !== 0) throw new Error("active HA E2E fixture failed to start");

    await waitForFixture(fixturePort);
    const container = await run(
      "docker",
      [...composePrefix, "ps", "-q", ACTIVE_HA_FIXTURE_SERVICE],
      { cwd: projectRoot, env: composeEnvironment, capture: true },
    );
    const containerId = container.stdout.trim();
    if (container.code !== 0 || containerId.length === 0) {
      throw new Error("active HA E2E fixture container could not be resolved");
    }
    fixtureContainerId = containerId;
    const copied = await run(
      "docker",
      [
        "cp",
        `${containerId}:${DEFAULT_FIXTURE_CONTAINER_FILE}`,
        hostFixtureFile,
      ],
      { cwd: projectRoot, env: composeEnvironment },
    );
    if (copied.code !== 0) {
      throw new Error("active HA E2E fixture could not be copied");
    }

    const fixture = JSON.parse(await readFile(hostFixtureFile, "utf8"));
    if (
      typeof fixture.login !== "string" ||
      typeof fixture.password !== "string" ||
      typeof fixture.activityId !== "string" ||
      typeof fixture.itemId !== "string"
    ) {
      throw new Error("active HA E2E fixture is incomplete");
    }

    const playwright = await run(
      "pnpm",
      ["exec", "playwright", "test", "tests/e2e/real-runtime.spec.ts"],
      {
        cwd: projectRoot,
        env: buildActiveHaPlaywrightEnvironment({
          baseUrl,
          fixtureFile: hostFixtureFile,
          inherited: process.env,
        }),
      },
    );
    testCode = playwright.code;
  } finally {
    const stop = await run(
      "docker",
      [...composePrefix, "stop", "--timeout", "30", ACTIVE_HA_FIXTURE_SERVICE],
      { cwd: projectRoot, env: composeEnvironment },
    ).catch(() => ({ code: 1, signal: null, stdout: "", stderr: "" }));
    if (fixtureContainerId !== undefined) {
      const exitStatus = await run(
        "docker",
        ["inspect", "--format", "{{.State.ExitCode}}", fixtureContainerId],
        { cwd: projectRoot, env: composeEnvironment, capture: true },
      ).catch(() => ({ code: 1, signal: null, stdout: "", stderr: "" }));
      if (
        stop.code !== 0 ||
        exitStatus.code !== 0 ||
        exitStatus.stdout.trim() !== "0"
      ) {
        testCode = testCode === 0 ? 1 : testCode;
      }
    }
    await run(
      "docker",
      [...composePrefix, "rm", "--force", ACTIVE_HA_FIXTURE_SERVICE],
      { cwd: projectRoot, env: composeEnvironment },
    ).catch(() => undefined);
    await rm(tempDirectory, { recursive: true, force: true });
  }

  process.exitCode = testCode;
}

const invokedFile =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (invokedFile === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      JSON.stringify({
        status: "FAIL",
        code: "active_ha_e2e_failed",
        message: error instanceof Error ? error.message : "unknown error",
      }),
    );
    process.exitCode = 1;
  });
}
