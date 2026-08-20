import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ACTIVE_HA_FIXTURE_SERVICE = "real-e2e-fixture";
const DEFAULT_FIXTURE_FILE_NAME = "cvg-real-e2e-fixture.json";
const DEFAULT_FIXTURE_PORT = 3102;

export function buildActiveHaReadinessUrl(baseUrl) {
  return `${assertLocalBaseUrl(baseUrl)}/health/ready`;
}

export function buildActiveHaFixtureUrl(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("active HA fixture port is invalid");
  }
  return `http://127.0.0.1:${port}/fixture`;
}

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
  const url = buildActiveHaFixtureUrl(port);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const fixture = await response.json();
        if (isFixture(fixture)) return fixture;
      }
    } catch {
      // The container is still starting.
    }
    await new Promise((resolveResult) => setTimeout(resolveResult, 250));
  }
  throw new Error("active HA E2E fixture did not become ready");
}

function isFixture(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.adminLogin === "string" &&
    typeof value.adminPassword === "string" &&
    typeof value.login === "string" &&
    typeof value.password === "string" &&
    typeof value.activityId === "string" &&
    typeof value.itemId === "string"
  );
}

async function waitForActiveRuntime(baseUrl) {
  const url = buildActiveHaReadinessUrl(baseUrl);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The web proxy is still converging on a ready API replica.
    }
    await new Promise((resolveResult) => setTimeout(resolveResult, 250));
  }
  throw new Error("active HA web runtime did not become ready");
}

function resolveActiveHaConfiguration(projectRoot) {
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

  const composeOptions = { composeFile, envFile, projectName };
  return Object.freeze({
    baseUrl,
    fixturePort,
    composeEnvironment: {
      ...process.env,
      CVG_REAL_E2E_FIXTURE_PORT: String(fixturePort),
    },
    composeArgs: buildActiveHaComposeArgs(composeOptions),
    composePrefix: buildActiveHaComposeArgs(composeOptions).slice(0, -4),
  });
}

async function startActiveHaFixture({
  projectRoot,
  composeArgs,
  composePrefix,
  composeEnvironment,
  fixturePort,
  hostFixtureFile,
}) {
  await run(
    "docker",
    [...composePrefix, "rm", "--force", "--stop", ACTIVE_HA_FIXTURE_SERVICE],
    { cwd: projectRoot, env: composeEnvironment },
  );

  const up = await run("docker", composeArgs, {
    cwd: projectRoot,
    env: composeEnvironment,
  });
  if (up.code !== 0) throw new Error("active HA E2E fixture failed to start");

  const fixture = await waitForFixture(fixturePort);
  const container = await run(
    "docker",
    [...composePrefix, "ps", "-q", ACTIVE_HA_FIXTURE_SERVICE],
    { cwd: projectRoot, env: composeEnvironment, capture: true },
  );
  const containerId = container.stdout.trim();
  if (container.code !== 0 || containerId.length === 0) {
    throw new Error("active HA E2E fixture container could not be resolved");
  }
  await writeFile(hostFixtureFile, JSON.stringify(fixture), "utf8");
  return containerId;
}

async function runActiveHaPlaywright({
  projectRoot,
  baseUrl,
  hostFixtureFile,
}) {
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
  return playwright.code;
}

async function safeRun(command, args, options) {
  return run(command, args, options).catch(() => ({
    code: 1,
    signal: null,
    stdout: "",
    stderr: "",
  }));
}

async function reportFixtureTeardownFailure({
  projectRoot,
  composeEnvironment,
  stop,
  exitStatus,
  fixtureContainerId,
}) {
  const fixtureLogs = await safeRun(
    "docker",
    ["logs", "--tail", "120", fixtureContainerId],
    { cwd: projectRoot, env: composeEnvironment, capture: true },
  );
  console.error(
    JSON.stringify({
      status: "FAIL",
      code: "active_ha_e2e_fixture_teardown",
      stopCode: stop.code,
      inspectCode: exitStatus.code,
      fixtureExitCode: exitStatus.stdout.trim(),
      fixtureLogs: `${fixtureLogs.stdout}${fixtureLogs.stderr}`.trim(),
    }),
  );
}

async function teardownActiveHaFixture({
  projectRoot,
  composePrefix,
  composeEnvironment,
  fixtureContainerId,
  testCode,
}) {
  const stop = await safeRun(
    "docker",
    [...composePrefix, "stop", "--timeout", "30", ACTIVE_HA_FIXTURE_SERVICE],
    { cwd: projectRoot, env: composeEnvironment },
  );
  let finalTestCode = testCode;
  if (fixtureContainerId !== undefined) {
    const exitStatus = await safeRun(
      "docker",
      ["inspect", "--format", "{{.State.ExitCode}}", fixtureContainerId],
      { cwd: projectRoot, env: composeEnvironment, capture: true },
    );
    if (
      stop.code !== 0 ||
      exitStatus.code !== 0 ||
      exitStatus.stdout.trim() !== "0"
    ) {
      await reportFixtureTeardownFailure({
        projectRoot,
        composeEnvironment,
        stop,
        exitStatus,
        fixtureContainerId,
      });
      finalTestCode = finalTestCode === 0 ? 1 : finalTestCode;
    }
  }
  await safeRun(
    "docker",
    [...composePrefix, "rm", "--force", ACTIVE_HA_FIXTURE_SERVICE],
    { cwd: projectRoot, env: composeEnvironment },
  );
  return finalTestCode;
}

async function main() {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const configuration = resolveActiveHaConfiguration(projectRoot);
  const tempDirectory = await mkdtemp(join(tmpdir(), "cvg-active-ha-e2e-"));
  const hostFixtureFile = join(tempDirectory, DEFAULT_FIXTURE_FILE_NAME);
  let fixtureContainerId;
  let testCode = 1;

  try {
    fixtureContainerId = await startActiveHaFixture({
      projectRoot,
      composeArgs: configuration.composeArgs,
      composePrefix: configuration.composePrefix,
      composeEnvironment: configuration.composeEnvironment,
      fixturePort: configuration.fixturePort,
      hostFixtureFile,
    });
    await waitForActiveRuntime(configuration.baseUrl);
    testCode = await runActiveHaPlaywright({
      projectRoot,
      baseUrl: configuration.baseUrl,
      hostFixtureFile,
    });
  } finally {
    testCode = await teardownActiveHaFixture({
      projectRoot,
      composePrefix: configuration.composePrefix,
      composeEnvironment: configuration.composeEnvironment,
      fixtureContainerId,
      testCode,
    });
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
