import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  deriveTestCounts,
  digest,
  executionIdentity,
  selectedTestInventory,
  selectedAssertionInventory,
  reportedAssertionInventory,
  ordinaryTestEnvironment,
} from "./ci-proof-contract.mjs";
import { isEvidenceFresh } from "./evidence-freshness.mjs";
import { validateOrdinaryRuntimeReceipt } from "./ordinary-execution-profile.mjs";

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
  const environment = ordinaryTestEnvironment(process.env);
  const ci = executionIdentity();
  const sha = ci.executing_head;
  const runtimeProvenance = validateOrdinaryRuntimeReceipt(environment, sha);
  const checkout = await isEvidenceFresh(root, sha, sha);
  if (!checkout.fresh) throw new Error(checkout.detail);
  const inventory = {
    files: await selectedTestInventory(root),
    assertions: await selectedAssertionInventory(root),
  };
  const startedAt = new Date().toISOString();
  const outFile = join(root, "test-results", "vitest-summary.json");
  await mkdir(join(root, "test-results"), { recursive: true });
  await execFileAsync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "--configLoader=runner",
      "--project",
      "unit",
      "--project",
      "integration",
      "--reporter=json",
      `--outputFile=${outFile}`,
    ],
    {
      cwd: root,
      timeout: 1800000,
      maxBuffer: 64 * 1024 * 1024,
      env: environment,
    },
  );
  const completedAt = new Date().toISOString();
  const after = await isEvidenceFresh(root, sha, sha);
  if (!after.fresh) throw new Error(after.detail);
  const raw = await readFile(outFile);
  const report = JSON.parse(raw.toString("utf8"));
  const counts = deriveTestCounts(
    report,
    inventory.files,
    root,
    Date.parse(startedAt),
    Date.parse(completedAt),
  );
  if (
    JSON.stringify(reportedAssertionInventory(report, root)) !==
    JSON.stringify(inventory.assertions)
  )
    throw new Error(
      "selected structural assertion inventory differs from execution",
    );
  const inventoryBytes = `${JSON.stringify(inventory)}\n`;
  const summary = {
    format: "cvg-test-summary/v1",
    sha,
    generatedAt: completedAt,
    tests: { ...counts, source: "vitest unit+integration json reporter" },
    executionStatus: "EXECUTED",
    runtimeProvenance,
    executedTests: counts.passed,
    execution: {
      status: "EXECUTED",
      exitCode: 0,
      startedAt,
      completedAt,
      ci,
      checkoutRoot: root,
      checkout: { before: true, after: true },
    },
    rawReport: { path: "test-results.raw.json", sha256: digest(raw) },
    inventory: { path: "test-inventory.json", sha256: digest(inventoryBytes) },
    status: "PASS",
  };
  if (summary.status !== "PASS") throw new Error("test suite FAIL");
  await mkdir(join(root, "staging-evidence"), { recursive: true });
  await writeFile(join(root, "staging-evidence", summary.rawReport.path), raw);
  await writeFile(
    join(root, "staging-evidence", summary.inventory.path),
    inventoryBytes,
  );
  await writeFile(
    join(root, "staging-evidence", "test-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(
    `test summary written (${summary.tests.passed} passed, ${summary.tests.skipped} skipped)`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  await main().catch((error) => {
    console.error(`test summary failed: ${error.message}`);
    process.exitCode = 1;
  });
