import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  digest,
  executionIdentity,
  securityChronologyValid,
  securityJobGroups,
} from "./ci-proof-contract.mjs";
import { isEvidenceFresh } from "./evidence-freshness.mjs";

/* global AbortSignal, fetch */

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

const REPOSITORY = "ricardoakinaga-dev/cvg-trainee-vet";
const SECURITY_WORKFLOW_PATH = ".github/workflows/security.yml";

/**
 * Queries the security workflow runs for a SHA. Returns PASS/FAIL per
 * scanner only from completed conclusions; anything else (including
 * "no token, no query") stays unknown. Dependency review only runs on
 * PRs, so a push SHA records not-applicable rather than a fake PASS.
 */
export async function querySecurityWorkflow(sha, options = {}) {
  const unknown = {
    codeql: "unknown",
    osv: "unknown",
    dependencyReview: "unknown",
  };
  const token =
    options.token ??
    (process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || "");
  const fetchImpl = options.fetchImpl ?? fetch;
  if (token.trim() === "" || !/^[0-9a-f]{40}$/u.test(sha)) return unknown;
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "cvg-security-summary",
    };
    const response = await fetchImpl(
      `https://api.github.com/repos/${REPOSITORY}/actions/workflows/security.yml/runs?head_sha=${sha}&per_page=3`,
      { headers, signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok) return unknown;
    const runs = (await response.json()).workflow_runs ?? [];
    const run = runs[0];
    if (
      run === undefined ||
      run.head_sha !== sha ||
      !Number.isSafeInteger(run.id) ||
      run.id <= 0 ||
      !Number.isSafeInteger(run.run_attempt) ||
      run.run_attempt <= 0 ||
      run.repository?.full_name !== REPOSITORY ||
      typeof run.head_branch !== "string" ||
      !run.head_branch ||
      ![run.run_started_at, run.updated_at].every((time) =>
        Number.isFinite(Date.parse(time)),
      )
    )
      return unknown;
    // The authenticated endpoint selects security.yml. Refuse contradictory
    // workflow identity if supplied by the API; never use a generic payload
    // not-applicable flag as scanner proof.
    if (run.path !== SECURITY_WORKFLOW_PATH) return unknown;
    if (run.status !== "completed") return unknown;
    if (run.conclusion !== "success")
      return { ...unknown, codeql: "FAIL", osv: "FAIL" };
    const jobsResponse = await fetchImpl(
      `https://api.github.com/repos/${REPOSITORY}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
      { headers, signal: AbortSignal.timeout(20000) },
    );
    if (!jobsResponse.ok) return unknown;
    const payload = await jobsResponse.json();
    const jobs = payload.jobs ?? [];
    const collectedAt = new Date().toISOString();
    if (
      payload.total_count !== jobs.length ||
      !securityChronologyValid(run, jobs, collectedAt)
    )
      return unknown;
    const groups = securityJobGroups(jobs);
    const conclusionOf = (scanner) => {
      const matches = [...groups[scanner], ...groups.supplyChain];
      if (
        matches.length === 0 ||
        matches.some(
          (job) => job.status !== "completed" || job.conclusion === null,
        )
      )
        return null;
      return matches.every((job) => job.conclusion === "success")
        ? "success"
        : "failure";
    };
    const toStatus = (conclusion) =>
      conclusion === "success"
        ? "PASS"
        : conclusion === null
          ? "unknown"
          : "FAIL";
    const dependencyJobs = groups.dependencyReview;
    const nonPr = run.event === "push" || run.event === "schedule";
    let dependencyReview = "unknown";
    if (nonPr || run.event === "pull_request") {
      if (
        nonPr &&
        (dependencyJobs.length === 0 ||
          dependencyJobs.every(
            (job) => job.status === "completed" && job.conclusion === "skipped",
          ))
      ) {
        // security.yml explicitly limits this job to pull_request. This
        // exception applies only to that job; CodeQL/OSV still require success.
        dependencyReview = "not-applicable";
      } else if (
        dependencyJobs.length > 0 &&
        dependencyJobs.every(
          (job) => job.status === "completed" && job.conclusion !== null,
        )
      ) {
        dependencyReview = dependencyJobs.every(
          (job) => job.conclusion === "success",
        )
          ? "PASS"
          : "FAIL";
      }
    }
    return {
      codeql: toStatus(conclusionOf("codeql")),
      osv: toStatus(conclusionOf("osv")),
      dependencyReview,
      proof: {
        run,
        jobs,
        totalCount: payload.total_count,
        collectedAt,
      },
    };
  } catch {
    return unknown;
  }
}

function auditAdvisories(audit) {
  const entries = audit?.advisories ?? audit?.vulnerabilities;
  if (entries === null || typeof entries !== "object" || Array.isArray(entries))
    return null;
  const values = Object.values(entries);
  return values.every(
    (entry) =>
      entry &&
      ["low", "moderate", "high", "critical", "info"].includes(entry.severity),
  )
    ? values
    : null;
}

export function createSecuritySummary({
  sha,
  audit,
  fullAudit,
  secretsClean,
  remote,
  sbomComponents = null,
  execution = null,
  rawReport = null,
}) {
  const advisories = auditAdvisories(audit);
  const fullAdvisories = auditAdvisories(fullAudit);
  const count = (list, severity) =>
    list === null
      ? null
      : list.filter((entry) => entry.severity === severity).length;
  const high = count(advisories, "high");
  const critical = count(advisories, "critical");
  const moderate = count(fullAdvisories, "moderate");
  const low = count(fullAdvisories, "low");
  const auditClean =
    advisories !== null &&
    fullAdvisories !== null &&
    high === 0 &&
    critical === 0;
  return {
    format: "cvg-security-summary/v2",
    sha,
    generatedAt: new Date().toISOString(),
    audit: auditClean
      ? "pnpm audit --audit-level=high PASS"
      : "pnpm audit FAIL/unknown",
    audit_result: {
      status: auditClean ? "PASS" : "FAIL",
      command: "pnpm audit --audit-level=high",
      parsed: advisories !== null && fullAdvisories !== null,
      high,
      critical,
    },
    residual: { low, moderate, high, critical },
    secrets: secretsClean ? "verify:secrets clean" : "verify:secrets FAIL",
    secret_scan: secretsClean ? "PASS" : "FAIL",
    sbomComponents,
    codeql: remote.codeql,
    osv: remote.osv,
    dependency_review: remote.dependencyReview,
    scannerRun: remote.proof
      ? {
          run_id: remote.proof.run.id,
          run_attempt: remote.proof.run.run_attempt,
          sha: remote.proof.run.head_sha,
          repository: remote.proof.run.repository.full_name,
          workflow_path: remote.proof.run.path,
          ref: `refs/heads/${remote.proof.run.head_branch}`,
          workflow_ref: `${REPOSITORY}/${remote.proof.run.path}@refs/heads/${remote.proof.run.head_branch}`,
        }
      : null,
    execution,
    rawReport,
    status:
      /^[0-9a-f]{40}$/u.test(sha) &&
      auditClean &&
      secretsClean &&
      remote.codeql === "PASS" &&
      remote.osv === "PASS" &&
      ["PASS", "not-applicable"].includes(remote.dependencyReview)
        ? "PASS"
        : "FAIL",
  };
}

/**
 * AAA-CERT-004 — security summary from real scans (never hand-written).
 *
 * Runs `pnpm audit --audit-level=high`, `pnpm verify:secrets` and counts
 * SBOM components, then publishes `staging-evidence/security-summary.json`.
 * CodeQL/OSV/dependency-review run in the `security` workflow; this file
 * records their workflow reference, not their verdict.
 */
async function main() {
  const ci = executionIdentity();
  const startedAt = new Date().toISOString();
  const before = await isEvidenceFresh(
    root,
    ci.executing_head,
    ci.executing_head,
  );
  if (!before.fresh) throw new Error(before.detail);
  // pnpm audit exits non-zero when advisories exist: parse stdout from
  // the rejection instead of discarding it.
  const parseAudit = (promise) =>
    promise
      .then(({ stdout }) => JSON.parse(stdout))
      .catch((error) => {
        try {
          return JSON.parse(error.stdout);
        } catch {
          return null;
        }
      });
  // Full audit for residual counts (moderate/low are real advisories even
  // when they do not fail the high gate); the gate itself uses high+.
  const fullAudit = await parseAudit(
    execFileAsync("pnpm", ["audit", "--json"], {
      cwd: root,
      timeout: 300000,
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
  const audit = await parseAudit(
    execFileAsync("pnpm", ["audit", "--audit-level=high", "--json"], {
      cwd: root,
      timeout: 300000,
      maxBuffer: 64 * 1024 * 1024,
    }),
  );

  let secretsClean = true;
  let secretScan = { command: "pnpm verify:secrets", exitCode: 1, stdout: "" };
  try {
    const result = await execFileAsync("pnpm", ["verify:secrets"], {
      cwd: root,
      timeout: 120000,
    });
    secretScan = {
      command: "pnpm verify:secrets",
      exitCode: 0,
      stdout: result.stdout,
    };
  } catch {
    secretsClean = false;
  }

  let sbomComponents = null;
  try {
    const sbom = JSON.parse(
      await readFile(join(root, "sbom.cyclonedx.json"), "utf8"),
    );
    sbomComponents = Array.isArray(sbom.components)
      ? sbom.components.length
      : null;
  } catch {
    sbomComponents = null;
  }

  const { stdout: sha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: root,
  });
  // §125.8: remote scanners are PROVEN via the security workflow runs for
  // this SHA (queried here when a token exists); without results they
  // stay unknown — never inferred as zero findings.
  const remote = await querySecurityWorkflow(sha.trim());
  const completedAt = new Date().toISOString();
  const after = await isEvidenceFresh(root, sha.trim(), ci.executing_head);
  if (!after.fresh) throw new Error(after.detail);
  const raw = `${JSON.stringify({ audit, fullAudit, secretScan, remoteProof: remote.proof ?? null })}\n`;
  const summary = createSecuritySummary({
    sha: sha.trim(),
    audit,
    fullAudit,
    secretsClean,
    remote,
    sbomComponents,
    execution: {
      status: "EXECUTED",
      exitCode: 0,
      startedAt,
      completedAt,
      ci,
      checkout: { before: true, after: true },
    },
    rawReport: { path: "security-results.raw.json", sha256: digest(raw) },
  });
  summary.generatedAt = completedAt;
  await mkdir(join(root, "staging-evidence"), { recursive: true });
  await writeFile(join(root, "staging-evidence", summary.rawReport.path), raw);
  await writeFile(
    join(root, "staging-evidence", "security-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  if (summary.status !== "PASS") throw new Error("security summary FAIL");
  console.log(`security summary written (${JSON.stringify(summary.residual)})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(`security summary failed: ${error.message}`);
    process.exitCode = 1;
  });
}
