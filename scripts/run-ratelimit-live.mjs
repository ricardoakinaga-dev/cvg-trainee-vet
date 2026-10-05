import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, URL } from "node:url";
import { join, resolve } from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import {
  finishEvidenceMeasurement,
  startEvidenceMeasurement,
} from "./native-evidence-measurement.mjs";

/* global setTimeout */

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const allowedSuites = new Set([
  "tests/integration/ratelimit-redis-live.test.ts",
  "tests/integration/ratelimit-redis-restart.test.ts",
]);

function log(message) {
  console.log(`[ratelimit-live] ${message}`);
}

async function findRedisServer() {
  if (process.env.CVG_REDIS_SERVER_BIN?.trim())
    return process.env.CVG_REDIS_SERVER_BIN.trim();
  try {
    const { stdout } = await execFileAsync("sh", [
      "-c",
      "command -v redis-server",
    ]);
    return stdout.trim().split("\n")[0]?.trim() || null;
  } catch {
    return null;
  }
}

async function waitForRedis(port, attempts = 50) {
  const net = await import("node:net");
  for (let index = 0; index < attempts; index += 1) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.connect({ host: "127.0.0.1", port });
        socket.once("connect", () => {
          socket.end();
          resolve();
        });
        socket.once("error", reject);
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("redis did not become ready");
}

function reportExecution(report, suite) {
  if (!Array.isArray(report?.testResults) || report.testResults.length !== 1)
    return null;
  const result = report.testResults[0];
  if (
    typeof result?.name !== "string" ||
    resolve(result.name) !== resolve(root, suite)
  )
    return null;
  if (result.status !== "passed" && result.status !== "failed") return null;
  if (!Array.isArray(result.assertionResults)) return null;
  const passed = result.assertionResults.filter(
    (test) => test.status === "passed",
  ).length;
  const failed = result.assertionResults.filter(
    (test) => test.status === "failed",
  ).length;
  const skipped = result.assertionResults.length - passed - failed;
  if (
    report.numTotalTests !== result.assertionResults.length ||
    report.numPassedTests !== passed ||
    report.numFailedTests !== failed ||
    report.numPendingTests + report.numTodoTests !== skipped
  )
    return null;
  return {
    executedTests: passed + failed,
    passedTests: passed,
    failedTests: failed,
    skippedTests: skipped,
  };
}

async function main() {
  const suite =
    process.argv[2] ?? "tests/integration/ratelimit-redis-live.test.ts";
  const evidenceDir = resolve(
    process.env.CVG_RATE_LIMIT_EVIDENCE_DIR?.trim() ||
      join(root, "staging-evidence"),
  );
  await mkdir(evidenceDir, { recursive: true });
  const measurement = await startEvidenceMeasurement(root);
  const startedAt = measurement.startedAt;
  let summary = {
    format: "cvg-multi-instance-summary/v1",
    executionFormat: "cvg-live-test-execution/v1",
    status: "NOT_EXECUTED",
    sha: null,
    suite,
    startedAt,
    executedTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    reason: "execution has not completed",
  };
  async function record(status, reason, counts = {}, extra = {}) {
    summary = {
      ...summary,
      ...counts,
      ...extra,
      ...(await finishEvidenceMeasurement(
        measurement,
        "cvg-multi-instance-summary/v1",
      )),
      status,
      reason,
      completedAt: new Date().toISOString(),
    };
    await writeFile(
      join(evidenceDir, "multi-instance-summary.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
    log(`${status}: ${reason}`);
  }
  // Replace any previous PASS before checking prerequisites or starting a child.
  await record("NOT_EXECUTED", "execution has not completed");
  await rm(join(evidenceDir, "ratelimit-live-results.json"), { force: true });
  if (!allowedSuites.has(suite)) {
    await record(
      "NOT_EXECUTED",
      "requested suite is not a supported live rate-limit suite",
    );
    process.exitCode = 2;
    return;
  }
  let stop = async () => undefined;
  let directory;
  let redisUrl = process.env.CVG_TEST_REDIS_URL?.trim();
  try {
    if (redisUrl === undefined || redisUrl.length === 0) {
      const bin = await findRedisServer();
      if (bin === null) {
        await record(
          "NOT_EXECUTED",
          "no redis-server binary; set CVG_REDIS_SERVER_BIN or CVG_TEST_REDIS_URL",
        );
        process.exitCode = 2;
        return;
      }
      const port = 6390 + Math.floor(Math.random() * 500);
      log(`booting disposable redis on 127.0.0.1:${port}`);
      const child = spawn(
        bin,
        [
          "--port",
          String(port),
          "--bind",
          "127.0.0.1",
          "--save",
          "",
          "--appendonly",
          "no",
        ],
        { stdio: "ignore" },
      );
      let spawnFailure;
      child.once("error", (error) => {
        spawnFailure = error;
      });
      stop = async () => {
        if (
          spawnFailure !== undefined ||
          child.exitCode !== null ||
          child.signalCode !== null
        )
          return;
        const stopped = new Promise((resolve) => child.once("exit", resolve));
        child.kill("SIGTERM");
        await stopped;
      };
      await waitForRedis(port);
      if (spawnFailure !== undefined) throw spawnFailure;
      redisUrl = `redis://127.0.0.1:${port}`;
    }
    directory = await mkdtemp(join(tmpdir(), "cvg-ratelimit-report-"));
    const reportPath = join(directory, "vitest.json");
    const args = [
      "exec",
      "vitest",
      "run",
      "--project",
      "integration",
      suite,
      "--reporter=default",
      "--reporter=json",
      `--outputFile=${reportPath}`,
    ];
    let exitCode = 0;
    let commandError;
    try {
      const child = await execFileAsync("pnpm", args, {
        cwd: root,
        env: {
          ...process.env,
          CVG_TEST_REDIS_URL: redisUrl,
          CVG_RUN_LIVE_REDIS_TESTS: "true",
        },
        timeout: 600000,
        maxBuffer: 64 * 1024 * 1024,
      });
      process.stdout.write(child.stdout ?? "");
      process.stderr.write(child.stderr ?? "");
    } catch (error) {
      commandError = error;
      process.stdout.write(error.stdout ?? "");
      process.stderr.write(error.stderr ?? "");
      exitCode = typeof error.code === "number" ? error.code : 1;
    }
    const reportBytes = await readFile(reportPath).catch(() => null);
    if (reportBytes !== null) {
      await writeFile(
        join(evidenceDir, "ratelimit-live-results.json"),
        reportBytes,
      );
    }
    let report;
    try {
      report =
        reportBytes === null ? undefined : JSON.parse(reportBytes.toString());
    } catch {
      report = undefined;
    }
    const counts = reportExecution(report, suite);
    const proof = {
      exitCode,
      command: ["pnpm", ...args],
      ...(reportBytes === null
        ? {}
        : {
            report: "ratelimit-live-results.json",
            reportSha256: createHash("sha256")
              .update(reportBytes)
              .digest("hex"),
          }),
    };
    if (
      exitCode !== 0 ||
      commandError !== undefined ||
      counts?.failedTests > 0 ||
      report?.success === false ||
      report?.testResults?.some((result) => result.status === "failed")
    ) {
      await record("FAIL", "live suite failed", counts ?? {}, proof);
      process.exitCode = exitCode || 1;
    } else if (
      counts === null ||
      counts.executedTests === 0 ||
      counts.skippedTests !== 0 ||
      report?.success !== true
    ) {
      await record(
        "NOT_EXECUTED",
        "missing, skipped, empty or mismatched live suite report",
        counts ?? {},
        proof,
      );
      process.exitCode = 2;
    } else {
      await record(
        "PASS",
        "matching live suite executed with no failures or skips",
        counts,
        proof,
      );
    }
  } catch (error) {
    await record("FAIL", "live test runner could not complete");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await stop();
    if (directory !== undefined)
      await rm(directory, { recursive: true, force: true });
  }
}

await main();
