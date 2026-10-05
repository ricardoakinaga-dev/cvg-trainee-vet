import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { isEvidenceFresh } from "./evidence-freshness.mjs";

const execute = promisify(execFile);
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function headAt(root) {
  return execute("git", ["rev-parse", "HEAD"], { cwd: root })
    .then(({ stdout }) => stdout.trim())
    .catch(() => null);
}

function ciIdentity(environment) {
  const runId = Number(environment.GITHUB_RUN_ID);
  const attempt = Number(environment.GITHUB_RUN_ATTEMPT);
  const workflow = environment.GITHUB_WORKFLOW_REF;
  const repository = environment.GITHUB_REPOSITORY;
  const executingHead = environment.GITHUB_SHA;
  const ref = environment.GITHUB_REF;
  if (
    environment.GITHUB_ACTIONS !== "true" ||
    !Number.isSafeInteger(runId) ||
    runId <= 0 ||
    !Number.isSafeInteger(attempt) ||
    attempt <= 0 ||
    typeof repository !== "string" ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository) ||
    typeof executingHead !== "string" ||
    !/^[a-f0-9]{40}$/u.test(executingHead) ||
    typeof ref !== "string" ||
    !/^refs\/(heads|tags|pull)\/[^\s@]+$/u.test(ref) ||
    typeof workflow !== "string" ||
    !workflow.startsWith(`${repository}/.github/workflows/`) ||
    !/^.*\/\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml@refs\/(heads|tags|pull)\/[^\s@]+$/u.test(
      workflow,
    ) ||
    !workflow.endsWith(`@${ref}`)
  )
    return null;
  return {
    run_id: runId,
    run_attempt: attempt,
    workflow_ref: workflow,
    repository,
    executing_head: executingHead,
    ref,
  };
}

function actualCoverage(root) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "vitest", "run", "--coverage"], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

// The injected function is for contract tests only. The CLI always executes
// the complete official suite; no CLI flag accepts a runner or a substitute report.
export async function measureCoverage(
  root,
  run = actualCoverage,
  environment = process.env,
) {
  const directory = join(root, "coverage");
  const reportPath = join(directory, "coverage-summary.json");
  const proofPath = join(directory, "coverage-provenance.json");
  await mkdir(directory, { recursive: true });
  await rm(reportPath, { force: true });
  await rm(proofPath, { force: true });
  const head = await headAt(root);
  const before = await isEvidenceFresh(root, head, head);
  const ci = ciIdentity(environment);
  const startedAt = new Date().toISOString();
  let exitCode;
  try {
    exitCode = await run(root);
  } catch {
    exitCode = 1;
  }
  const completedAt = new Date().toISOString();
  const raw = await readFile(reportPath).catch(() => null);
  let report;
  try {
    report = raw === null ? null : JSON.parse(raw.toString("utf8"));
  } catch {
    report = null;
  }
  const validReport =
    report !== null &&
    typeof report === "object" &&
    ["statements", "branches", "functions", "lines"].every(
      (key) =>
        typeof report.total?.[key]?.pct === "number" &&
        Number.isFinite(report.total[key].pct) &&
        report.total[key].pct >= 0 &&
        report.total[key].pct <= 100 &&
        Number.isSafeInteger(report.total[key].total) &&
        report.total[key].total > 0,
    );
  const after = await isEvidenceFresh(root, head, await headAt(root));
  const ciAfter = ciIdentity(environment);
  const measured = exitCode === 0 && validReport;
  const verified =
    measured &&
    before.fresh &&
    after.fresh &&
    ci !== null &&
    ci.executing_head === head &&
    JSON.stringify(ci) === JSON.stringify(ciAfter);
  const proof = {
    format: "cvg-coverage-provenance/v1",
    status: verified ? "PASS" : measured ? "NOT_VERIFIED" : "FAIL",
    sha: verified ? head : null,
    measured_head: head,
    generatedAt: completedAt,
    runner: ci === null ? "local" : "github-actions",
    ci,
    raw_sha256: raw === null ? null : hash(raw),
    report_sha256: validReport ? hash(JSON.stringify(report)) : null,
    measurement: {
      command: "vitest run --coverage",
      startedAt,
      completedAt,
      exitCode,
    },
    checkout: { before: before.fresh, after: after.fresh },
  };
  await writeFile(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  return { proof, exitCode: measured ? 0 : exitCode || 2 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2)
    throw new Error(
      "Coverage measurement runs the full official suite without selection arguments",
    );
  const result = await measureCoverage(process.cwd());
  console.log(`coverage measurement: ${result.proof.status}`);
  process.exitCode = result.exitCode;
}
