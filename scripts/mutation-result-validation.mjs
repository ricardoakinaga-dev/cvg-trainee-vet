import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const reporter = join(
  dirname(fileURLToPath(import.meta.url)),
  "mutation-result-reporter.mjs",
);
const requireProof = (condition, detail) => {
  if (!condition) throw new Error(detail);
};
const testKey = (file, name) => JSON.stringify([file, name]);

function inspect(execution) {
  const {
    report,
    exitCode,
    signal,
    processError,
    runId,
    startedAt,
    finishedAt,
    expectedFiles,
  } = execution;
  requireProof(
    signal === null && processError === null && [0, 1].includes(exitCode),
    "process failure/timeout/crash",
  );
  requireProof(
    typeof runId === "string" &&
      runId.length > 0 &&
      Number.isFinite(startedAt) &&
      Number.isFinite(finishedAt) &&
      finishedAt >= startedAt,
    "missing execution identity/time",
  );
  requireProof(
    report && typeof report === "object",
    "missing structured report",
  );
  const countKeys = [
    "numTotalTests",
    "numPassedTests",
    "numFailedTests",
    "numPendingTests",
    "numTodoTests",
    "numTotalTestSuites",
    "numPassedTestSuites",
    "numFailedTestSuites",
    "numPendingTestSuites",
  ];
  requireProof(
    countKeys.every(
      (key) => Number.isSafeInteger(report[key]) && report[key] >= 0,
    ),
    "malformed counters",
  );
  requireProof(
    report.numTotalTests > 0 &&
      report.numPendingTests === 0 &&
      report.numTodoTests === 0 &&
      report.numPendingTestSuites === 0,
    "empty or incomplete suite",
  );
  requireProof(
    report.numTotalTestSuites > 0 &&
      report.numTotalTestSuites ===
        report.numPassedTestSuites + report.numFailedTestSuites,
    "inconsistent suite counters",
  );
  requireProof(
    report.startTime >= startedAt && report.startTime <= finishedAt,
    "stale report",
  );
  const proof = report.cvgHarness;
  requireProof(
    proof?.runId === runId && ["passed", "failed"].includes(proof.reason),
    "missing reporter completion proof",
  );
  requireProof(
    Array.isArray(proof.unhandledErrors) &&
      proof.unhandledErrors.length === 0 &&
      Array.isArray(proof.suiteErrors) &&
      proof.suiteErrors.length === 0,
    "unhandled/collection/hook error",
  );
  requireProof(
    Array.isArray(expectedFiles) &&
      expectedFiles.length > 0 &&
      new Set(expectedFiles).size === expectedFiles.length &&
      expectedFiles.every(
        (file) => typeof file === "string" && file.length > 0,
      ),
    "missing expected suite inventory",
  );
  requireProof(
    Array.isArray(report.testResults) &&
      report.testResults.length === expectedFiles.length,
    "missing test files",
  );
  requireProof(
    Array.isArray(proof.tests),
    "missing structured assertion details",
  );
  const details = new Map();
  for (const test of proof.tests) {
    const key = testKey(test.file, test.fullName);
    requireProof(
      !details.has(key) &&
        Array.isArray(test.errors) &&
        test.retryCount === 0 &&
        test.repeatCount === 0,
      "duplicate/retried test or missing error details",
    );
    details.set(key, test);
  }
  const files = new Set();
  const inventory = new Set();
  const failed = [];
  let passed = 0;
  for (const file of report.testResults) {
    requireProof(
      expectedFiles.includes(file.name) && !files.has(file.name),
      "unexpected/duplicate file",
    );
    files.add(file.name);
    requireProof(
      file.message === "" &&
        Array.isArray(file.assertionResults) &&
        file.assertionResults.length > 0,
      "collection error or no tests",
    );
    requireProof(
      file.startTime >= report.startTime &&
        file.endTime >= file.startTime &&
        file.endTime <= finishedAt,
      "invalid test timing",
    );
    let fileFailures = 0;
    for (const assertion of file.assertionResults) {
      requireProof(
        typeof assertion.fullName === "string" && assertion.fullName.length > 0,
        "missing test identity",
      );
      const key = testKey(file.name, assertion.fullName);
      requireProof(
        !inventory.has(key) && details.has(key),
        "duplicate/missing test identity",
      );
      inventory.add(key);
      const detail = details.get(key);
      requireProof(
        Array.isArray(assertion.failureMessages),
        "missing failure messages",
      );
      if (assertion.status === "passed") {
        requireProof(
          detail.errors.length === 0 && assertion.failureMessages.length === 0,
          "errors in passed test",
        );
        passed += 1;
      } else {
        requireProof(
          assertion.status === "failed" &&
            assertion.failureMessages.length > 0 &&
            detail.errors.length > 0,
          "incomplete test",
        );
        requireProof(
          detail.errors.every(
            (error) =>
              error.name === "AssertionError" &&
              typeof error.message === "string" &&
              error.message.length > 0,
          ),
          "non-assertion failure",
        );
        failed.push(key);
        fileFailures += 1;
      }
    }
    requireProof(
      file.status === (fileFailures > 0 ? "failed" : "passed"),
      "inconsistent file status",
    );
  }
  requireProof(
    inventory.size === details.size &&
      inventory.size === report.numTotalTests &&
      passed === report.numPassedTests &&
      failed.length === report.numFailedTests,
    "inconsistent test counters/inventory",
  );
  requireProof(
    report.success === (failed.length === 0) &&
      exitCode === (failed.length === 0 ? 0 : 1),
    "inconsistent exit/status",
  );
  requireProof(
    report.numFailedTestSuites > 0 === failed.length > 0,
    "inconsistent suite failure",
  );
  return { inventory: [...inventory].sort(), failed };
}

export function validateSuiteResult(execution, baseline) {
  try {
    const current = inspect(execution);
    if (baseline === undefined) {
      requireProof(current.failed.length === 0, "baseline must be green");
      return { outcome: "BASELINE_GREEN", tests: current.inventory };
    }
    const initial = inspect(baseline);
    requireProof(initial.failed.length === 0, "baseline must be green");
    requireProof(
      JSON.stringify(initial.inventory) === JSON.stringify(current.inventory),
      "baseline test inventory changed",
    );
    return {
      outcome: current.failed.length > 0 ? "ASSERTION_FAILURE" : "NO_EFFECT",
      countableKill: false,
      failedTests: current.failed,
      missingProof: "isolated candidate and exact mutation identity binding",
    };
  } catch (error) {
    return { outcome: "HARNESS_ERROR", detail: error.message };
  }
}

export async function runSuite({
  cwd,
  expectedRoot = cwd,
  files,
  vitest,
  config,
  allowExternalRunnerPaths = false,
  project,
  timeout = 240000,
}) {
  if (
    !Array.isArray(files) ||
    files.length === 0 ||
    files.some(
      (file) =>
        typeof file !== "string" || file.length === 0 || file.startsWith("-"),
    ) ||
    new Set(files).size !== files.length ||
    !Number.isSafeInteger(timeout) ||
    timeout <= 0 ||
    timeout > 240000
  ) {
    return {
      outcome: "HARNESS_ERROR",
      detail: "invalid suite selection or execution budget",
    };
  }
  const descriptorCwd =
    typeof cwd === "string" && /^\/proc\/self\/fd\/\d+$/u.test(cwd);
  if (
    descriptorCwd &&
    ((typeof config === "string" && isAbsolute(config)) ||
      (!allowExternalRunnerPaths &&
        typeof vitest === "string" &&
        isAbsolute(vitest)))
  ) {
    return {
      outcome: "HARNESS_ERROR",
      detail:
        "descriptor-backed suites require relative config and candidate Vitest paths",
    };
  }
  const suiteReporter =
    descriptorCwd && !allowExternalRunnerPaths
      ? "scripts/mutation-result-reporter.mjs"
      : reporter;
  const directory = await mkdtemp(join(tmpdir(), "cvg-mutation-result-"));
  const output = join(directory, "result.json");
  const execution = {
    runId: randomUUID(),
    startedAt: Date.now(),
    finishedAt: null,
    expectedFiles: files.map((file) => resolve(expectedRoot, file)),
    exitCode: null,
    signal: null,
    processError: null,
    report: null,
  };
  try {
    try {
      await execFileAsync(
        process.execPath,
        [
          vitest,
          "run",
          ...files,
          ...(config ? ["--config", config] : []),
          ...(project ? ["--project", project] : []),
          "--reporter",
          suiteReporter,
          "--outputFile",
          output,
          "--no-cache",
          "--retry",
          "0",
        ],
        {
          cwd,
          timeout,
          killSignal: "SIGKILL",
          maxBuffer: 8 * 1024 * 1024,
          env: { ...process.env, CVG_MUTATION_RUN_ID: execution.runId },
        },
      );
      execution.exitCode = 0;
    } catch (error) {
      execution.exitCode = Number.isInteger(error.code) ? error.code : null;
      execution.signal = error.signal ?? null;
      execution.processError = error.killed
        ? "process killed or timed out"
        : typeof error.code === "string"
          ? error.code
          : null;
    }
    execution.finishedAt = Date.now();
    try {
      execution.report = JSON.parse(await readFile(output, "utf8"));
    } catch {
      execution.processError ??= "missing or malformed JSON report";
    }
    return execution;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
