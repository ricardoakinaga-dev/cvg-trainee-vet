import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import {
  MUTATION_REPORT_SCOPES,
  resolveRepositoryRoot,
  sha256FileBytes,
  validateCurrentBoundedMutationManifest,
} from "./mutation-bounded-contract.mjs";
import {
  buildMutationSummary,
  sha256Bytes,
} from "./mutation-summary-contract.mjs";

const execFileAsync = promisify(execFile);
const runIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;

function failureSummary(candidateSha, candidateRunId, failures) {
  return {
    format: "cvg-mutation-summary/v1",
    status: "FAIL",
    sha: candidateSha,
    candidate_sha: candidateSha,
    candidate_run_id: candidateRunId,
    manifest_path: null,
    manifest_sha256: null,
    total: 0,
    raw_killed: 0,
    verified_kills: 0,
    equivalent_count: 0,
    critical_real_survivors: null,
    adjusted_score: null,
    scopes: [],
    reports: [],
    closure_results: [],
    failures,
  };
}

async function main() {
  const repositoryRoot = resolveRepositoryRoot();
  const candidateRunId = process.env.CVG_MUTATION_CANDIDATE_ID?.trim() ?? "";
  const expectedSha = process.env.EXPECTED_SHA?.trim().toLowerCase() ?? "";
  const failures = [];
  let summary;

  try {
    if (!runIdPattern.test(candidateRunId)) {
      throw new Error("CVG_MUTATION_CANDIDATE_ID is missing or invalid");
    }
    if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(expectedSha)) {
      throw new Error("EXPECTED_SHA is missing or malformed");
    }
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
    });
    if (stdout.trim().toLowerCase() !== expectedSha) {
      throw new Error("checked out HEAD differs from EXPECTED_SHA");
    }

    const manifestPath = `reports/mutation-bounded/${candidateRunId}/manifest.json`;
    const manifestBytes = await readFile(join(repositoryRoot, manifestPath));
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    const manifestSha256 = sha256Bytes(manifestBytes);
    try {
      await validateCurrentBoundedMutationManifest(manifest, {
        candidateRoot: manifest.root,
        repositoryRoot,
        expectedRunId: candidateRunId,
      });
    } catch (error) {
      failures.push(`bounded manifest validation failed: ${error.message}`);
    }
    if (
      manifest.provenance?.candidateSha !== expectedSha ||
      manifest.provenance?.candidateRunId !== candidateRunId
    ) {
      failures.push("bounded manifest candidate differs from the current run");
    }

    const reportDigests = [];
    for (const scope of MUTATION_REPORT_SCOPES) {
      const ref = manifest.provenance?.reports?.find(
        (report) => report.scope === scope.id,
      );
      const path = scope.evidencePath;
      try {
        const bytes = await readFile(join(repositoryRoot, path));
        const digest = sha256FileBytes(bytes);
        if (ref?.sha256 !== digest) {
          failures.push(`copied Stryker evidence is stale for ${scope.id}`);
        }
        reportDigests.push({ scope: scope.id, path, sha256: digest });
      } catch {
        failures.push(`copied Stryker evidence is missing for ${scope.id}`);
        reportDigests.push({ scope: scope.id, path, sha256: null });
      }
    }

    const closureResults = [];
    for (const group of [
      { group: "authorization", file: "authorization-closure.json" },
      { group: "critical-worker", file: "critical-worker-closure.json" },
    ]) {
      const path = `reports/mutation-bounded/${candidateRunId}/${group.file}`;
      try {
        const bytes = await readFile(join(repositoryRoot, path));
        closureResults.push({
          group: group.group,
          path,
          sha256: sha256Bytes(bytes),
          result: JSON.parse(bytes.toString("utf8")),
        });
      } catch {
        closureResults.push({
          group: group.group,
          path,
          sha256: null,
          result: null,
        });
      }
    }
    summary = buildMutationSummary({
      manifest,
      manifestSha256,
      candidateSha: expectedSha,
      candidateRunId,
      reports: reportDigests,
      closureResults,
      failures,
    });
  } catch (error) {
    failures.push(error.message);
    summary = failureSummary(
      /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(expectedSha) ? expectedSha : null,
      runIdPattern.test(candidateRunId) ? candidateRunId : null,
      failures,
    );
  }

  const summaryPath = join(repositoryRoot, "reports/mutation-summary.json");
  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, {
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      status: summary.status,
      summary: "reports/mutation-summary.json",
      failures: summary.failures,
    }),
  );
  if (summary.status !== "PASS") process.exitCode = 1;
}

await main().catch((error) => {
  console.error(`mutation summary generation failed: ${error.message}`);
  process.exitCode = 1;
});
