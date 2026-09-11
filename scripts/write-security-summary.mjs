import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/* global AbortSignal, fetch */

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

const REPOSITORY = "ricardoakinaga-dev/cvg-trainee-vet";

/**
 * Queries the security workflow runs for a SHA. Returns PASS/FAIL per
 * scanner only from completed conclusions; anything else (including
 * "no token, no query") stays unknown. Dependency review only runs on
 * PRs, so a push SHA records not-applicable rather than a fake PASS.
 */
async function querySecurityWorkflow(sha) {
  const unknown = {
    codeql: "unknown",
    osv: "unknown",
    dependencyReview: "not-applicable",
  };
  const token =
    process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || "";
  if (token === "") return unknown;
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "cvg-security-summary",
    };
    const response = await fetch(
      `https://api.github.com/repos/${REPOSITORY}/actions/workflows/security.yml/runs?head_sha=${sha}&per_page=3`,
      { headers, signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok) return unknown;
    const runs = (await response.json()).workflow_runs ?? [];
    const run = runs[0];
    if (run === undefined || run.head_sha !== sha) return unknown;
    const jobsResponse = await fetch(
      `https://api.github.com/repos/${REPOSITORY}/actions/runs/${run.id}/jobs?per_page=20`,
      { headers, signal: AbortSignal.timeout(20000) },
    );
    if (!jobsResponse.ok) return unknown;
    const jobs = (await jobsResponse.json()).jobs ?? [];
    const conclusionOf = (fragment) =>
      jobs.find((job) => job.name.includes(fragment))?.conclusion ?? null;
    const toStatus = (conclusion) =>
      conclusion === "success"
        ? "PASS"
        : conclusion === null
          ? "unknown"
          : "FAIL";
    return {
      codeql: toStatus(conclusionOf("CodeQL")),
      osv: toStatus(conclusionOf("OSV")),
      dependencyReview:
        conclusionOf("Dependency") === null
          ? "not-applicable"
          : toStatus(conclusionOf("Dependency")),
    };
  } catch {
    return unknown;
  }
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
  // pnpm audit exits non-zero when advisories exist: parse stdout from
  // the rejection instead of discarding it.
  const parseAudit = (promise) =>
    promise
      .then(({ stdout }) => JSON.parse(stdout || "{}"))
      .catch((error) => {
        try {
          return JSON.parse(error.stdout || "{}");
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
  const fullAdvisories = fullAudit
    ? Object.values(fullAudit.advisories ?? fullAudit.vulnerabilities ?? {})
    : [];
  const audit = await parseAudit(
    execFileAsync("pnpm", ["audit", "--audit-level=high", "--json"], {
      cwd: root,
      timeout: 300000,
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
  const advisories = audit
    ? Object.values(audit.advisories ?? audit.vulnerabilities ?? {})
    : [];
  const count = (list, severity) =>
    list.filter((entry) => entry.severity === severity).length;
  const high = count(advisories, "high");
  const critical = count(advisories, "critical");
  const moderate = count(fullAdvisories, "moderate");
  const low = count(fullAdvisories, "low");

  let secretsClean = true;
  try {
    await execFileAsync("pnpm", ["verify:secrets"], {
      cwd: root,
      timeout: 120000,
    });
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
  const summary = {
    format: "cvg-security-summary/v2",
    sha: sha.trim(),
    generatedAt: new Date().toISOString(),
    audit:
      high + critical === 0
        ? "pnpm audit --audit-level=high PASS"
        : "pnpm audit FAIL",
    residual: { low, moderate, high, critical },
    secrets: secretsClean ? "verify:secrets clean" : "verify:secrets FAIL",
    secret_scan: secretsClean ? "PASS" : "FAIL",
    sbomComponents,
    codeql: remote.codeql,
    osv: remote.osv,
    dependency_review: remote.dependencyReview,
    status:
      high + critical === 0 &&
      secretsClean &&
      remote.codeql === "PASS" &&
      remote.osv === "PASS"
        ? "PASS"
        : "FAIL",
  };
  if (summary.status !== "PASS") throw new Error("security summary FAIL");
  await mkdir(join(root, "staging-evidence"), { recursive: true });
  await writeFile(
    join(root, "staging-evidence", "security-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(
    `security summary written (high=${high} critical=${critical} moderate=${moderate} low=${low})`,
  );
}

await main().catch((error) => {
  console.error(`security summary failed: ${error.message}`);
  process.exitCode = 1;
});
