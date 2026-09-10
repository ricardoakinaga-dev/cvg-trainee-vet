import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

/**
 * AAA-CERT-004 — test summary from a real run (never hand-written).
 *
 * Executes the vitest unit+integration projects with the JSON reporter and
 * publishes `staging-evidence/test-summary.json`. E2E (Playwright) is
 * reported separately by `pnpm test:e2e` / staging.
 */
async function main() {
  const outFile = join(root, "test-results", "vitest-summary.json");
  await mkdir(join(root, "test-results"), { recursive: true });
  await execFileAsync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "--project",
      "unit",
      "--project",
      "integration",
      "--reporter=json",
      `--outputFile=${outFile}`,
    ],
    { cwd: root, timeout: 1800000, maxBuffer: 64 * 1024 * 1024 },
  );
  const report = JSON.parse(await readFile(outFile, "utf8"));
  const { stdout: sha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: root,
  });
  const summary = {
    format: "cvg-test-summary/v1",
    sha: sha.trim(),
    generatedAt: new Date().toISOString(),
    tests: {
      files: report.numTotalTestSuites ?? null,
      passed: report.numPassedTests ?? null,
      skipped: (report.numPendingTests ?? 0) + (report.numTodoTests ?? 0),
      failed: report.numFailedTests ?? null,
      source: "vitest unit+integration json reporter",
    },
    status: (report.numFailedTests ?? 1) === 0 ? "PASS" : "FAIL",
  };
  if (summary.status !== "PASS") throw new Error("test suite FAIL");
  await mkdir(join(root, "staging-evidence"), { recursive: true });
  await writeFile(
    join(root, "staging-evidence", "test-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(
    `test summary written (${summary.tests.passed} passed, ${summary.tests.skipped} skipped)`,
  );
}

await main().catch((error) => {
  console.error(`test summary failed: ${error.message}`);
  process.exitCode = 1;
});
