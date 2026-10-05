import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

import {
  MUTATION_REPORT_SCOPES,
  resolveRepositoryRoot,
  validateCurrentBoundedMutationManifest,
} from "./mutation-bounded-contract.mjs";

const execFileAsync = promisify(execFile);

const CLOSURE_GROUPS = Object.freeze([
  Object.freeze({
    id: "authorization",
    scopes: Object.freeze(["authorization"]),
  }),
  Object.freeze({
    id: "critical-worker",
    scopes: Object.freeze(["critical", "worker"]),
  }),
]);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function failUnless(condition, message, failures) {
  if (!condition) failures.push(message);
}

export function buildMutationSummary({
  manifest,
  manifestSha256,
  candidateSha,
  candidateRunId,
  reports,
  closureResults,
  failures: initialFailures = [],
}) {
  const failures = [...initialFailures];
  const provenance = manifest?.provenance;
  failUnless(
    provenance?.format === "cvg-bounded-mutation-manifest/v1" &&
      provenance.candidateSha === candidateSha &&
      provenance.candidateRunId === candidateRunId,
    "current candidate manifest identity is invalid",
    failures,
  );

  const counts = provenance?.scopes ?? [];
  const identities = Array.isArray(manifest?.identities)
    ? manifest.identities
    : [];
  const closureByGroup = new Map(
    (closureResults ?? []).map((entry) => [entry.group, entry]),
  );
  const verifiedByScope = new Map();
  const closureEvidence = [];
  for (const group of CLOSURE_GROUPS) {
    const entry = closureByGroup.get(group.id);
    if (entry === undefined || entry.result === null) {
      failures.push(`mutation closure result is missing for ${group.id}`);
      closureEvidence.push({
        group: group.id,
        path: entry?.path ?? null,
        sha256: null,
        status: "MISSING",
      });
      for (const scopeId of group.scopes) verifiedByScope.set(scopeId, 0);
      continue;
    }
    const result = entry.result;
    const expectedIds = identities
      .filter((identity) => group.scopes.includes(identity.scopeId))
      .map((identity) => identity.id)
      .sort();
    const resultIds = Array.isArray(result.results)
      ? result.results.map((item) => item.id).sort()
      : [];
    const scopesMatch =
      Array.isArray(result.scopes) &&
      stableStringify(result.scopes) === stableStringify(group.scopes);
    const resultsMatch =
      resultIds.length === expectedIds.length &&
      stableStringify(resultIds) === stableStringify(expectedIds) &&
      new Set(resultIds).size === resultIds.length;
    const identityValid =
      result.candidateRunId === candidateRunId &&
      result.candidateSha === candidateSha &&
      result.manifestSha256 === manifestSha256;
    failUnless(
      scopesMatch,
      `mutation closure scope partition is invalid for ${group.id}`,
      failures,
    );
    failUnless(
      resultsMatch,
      `mutation closure identities differ from manifest for ${group.id}`,
      failures,
    );
    failUnless(
      identityValid,
      `mutation closure candidate identity is invalid for ${group.id}`,
      failures,
    );
    let groupKills = 0;
    for (const scopeId of group.scopes) {
      const scopeResults = (result.results ?? []).filter(
        (item) => item.scopeId === scopeId,
      );
      const expected = expectedIds.filter((id) =>
        id.startsWith(`${scopeId}:`),
      ).length;
      const kills = scopeResults.filter(
        (item) => item.outcome === "KILLED",
      ).length;
      verifiedByScope.set(scopeId, kills);
      groupKills += kills;
      failUnless(
        scopeResults.length === expected &&
          scopeResults.every((item) => item.outcome === "KILLED"),
        `mutation closure has unproven mutants for ${scopeId}`,
        failures,
      );
    }
    failUnless(
      result.status === "KILLED" &&
        result.exitCode === 0 &&
        result.mutantCount === expectedIds.length &&
        result.verifiedKills === groupKills &&
        result.realSurvivors === expectedIds.length - groupKills,
      `mutation closure did not close every mutant for ${group.id}`,
      failures,
    );
    closureEvidence.push({
      group: group.id,
      path: entry.path,
      sha256: entry.sha256 ?? sha256(Buffer.from(JSON.stringify(result))),
      status: result.status,
    });
  }
  failUnless(
    (closureResults ?? []).length === CLOSURE_GROUPS.length &&
      new Set((closureResults ?? []).map((entry) => entry.group)).size ===
        CLOSURE_GROUPS.length,
    "mutation closure result inventory is invalid",
    failures,
  );

  const summaryScopes = counts.map((count) => {
    const verified = verifiedByScope.get(count.id) ?? 0;
    return {
      id: count.id,
      total: count.total,
      raw_killed: count.rawKilled,
      verified_kills: verified,
      equivalent_count: 0,
      real_survivors: Math.max(0, count.pendingMutants - verified),
    };
  });
  const total = summaryScopes.reduce((value, scope) => value + scope.total, 0);
  const rawKilled = summaryScopes.reduce(
    (value, scope) => value + scope.raw_killed,
    0,
  );
  const verifiedKills = summaryScopes.reduce(
    (value, scope) => value + scope.verified_kills,
    0,
  );
  const realSurvivors = summaryScopes.reduce(
    (value, scope) => value + scope.real_survivors,
    0,
  );
  const denominator =
    total -
    summaryScopes.reduce((value, scope) => value + scope.equivalent_count, 0);
  const evidenceReports = (reports ?? []).map((report) => ({
    scope: report.scope,
    path: report.path,
    sha256: report.sha256,
  }));
  const reportsValid =
    evidenceReports.length === 3 &&
    new Set(evidenceReports.map((report) => report.scope)).size === 3 &&
    evidenceReports.every((report) => /^[a-f0-9]{64}$/u.test(report.sha256));
  failUnless(
    reportsValid,
    "current mutation report inventory is invalid",
    failures,
  );
  failUnless(
    total > 0 && denominator > 0,
    "current mutation report totals are empty",
    failures,
  );

  return {
    format: "cvg-mutation-summary/v1",
    status: failures.length === 0 && realSurvivors === 0 ? "PASS" : "FAIL",
    sha: candidateSha,
    candidate_sha: candidateSha,
    candidate_run_id: candidateRunId,
    manifest_path: `reports/mutation-bounded/${candidateRunId}/manifest.json`,
    manifest_sha256: manifestSha256,
    total,
    raw_killed: rawKilled,
    verified_kills: verifiedKills,
    equivalent_count: 0,
    critical_real_survivors: realSurvivors,
    adjusted_score:
      denominator === 0 ? 0 : (rawKilled + verifiedKills) / denominator,
    scopes: summaryScopes,
    reports: evidenceReports,
    closure_results: closureEvidence,
    failures,
  };
}

export function sha256Bytes(bytes) {
  return sha256(bytes);
}

async function readRegularRelativeFile(root, name) {
  const rootPath = resolve(root);
  if ((await realpath(rootPath)) !== rootPath) {
    throw new Error("mutation evidence root resolves through a symlink");
  }
  if (
    typeof name !== "string" ||
    name.length === 0 ||
    name.startsWith("/") ||
    name.includes("\\") ||
    name.includes(":") ||
    name.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error("mutation evidence path is unsafe");
  }
  let current = rootPath;
  const segments = name.split("/");
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    const stats = await lstat(current).catch(() => null);
    if (stats === null || stats.isSymbolicLink()) {
      throw new Error(
        `mutation evidence file is missing or symlinked: ${name}`,
      );
    }
    const final = index === segments.length - 1;
    if (final ? !stats.isFile() : !stats.isDirectory()) {
      throw new Error(`mutation evidence path has an invalid node: ${name}`);
    }
  }
  const fileReal = await realpath(current);
  const inside = relative(rootPath, fileReal);
  if (
    inside === "" ||
    inside === ".." ||
    inside.startsWith(`..${sep}`) ||
    resolve(rootPath, inside) !== fileReal
  ) {
    throw new Error(`mutation evidence file escapes its root: ${name}`);
  }
  return readFile(current);
}

export async function validateCurrentMutationSummary(
  summary,
  {
    repositoryRoot = resolveRepositoryRoot(),
    expectedRunId,
    expectedSha,
    requireExpectedRunId = false,
  } = {},
) {
  const repository = resolve(repositoryRoot);
  const { stdout: headText } = await execFileAsync(
    "git",
    ["rev-parse", "HEAD"],
    { cwd: repository },
  );
  const head = headText.trim().toLowerCase();
  const runId =
    expectedRunId ??
    process.env.CVG_MUTATION_CANDIDATE_ID?.trim() ??
    summary?.candidate_run_id;
  const sha =
    expectedSha ?? process.env.EXPECTED_SHA?.trim().toLowerCase() ?? head;
  if (
    requireExpectedRunId &&
    !expectedRunId &&
    !process.env.CVG_MUTATION_CANDIDATE_ID
  ) {
    throw new Error("current candidate mutation run id is required");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u.test(runId ?? "")) {
    throw new Error("mutation summary candidate run id is invalid");
  }
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(sha) || sha !== head) {
    throw new Error("mutation summary candidate SHA differs from current HEAD");
  }
  if (
    summary?.format !== "cvg-mutation-summary/v1" ||
    summary.status !== "PASS" ||
    summary.sha !== sha ||
    summary.candidate_sha !== sha ||
    summary.candidate_run_id !== runId
  ) {
    throw new Error("mutation summary status or candidate identity is invalid");
  }
  const expectedManifestPath = `reports/mutation-bounded/${runId}/manifest.json`;
  if (summary.manifest_path !== expectedManifestPath) {
    throw new Error("mutation summary manifest path does not match this run");
  }
  const manifestBytes = await readRegularRelativeFile(
    repository,
    expectedManifestPath,
  );
  const manifestSha256 = sha256(manifestBytes);
  if (summary.manifest_sha256 !== manifestSha256) {
    throw new Error("mutation summary manifest digest is stale");
  }
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  await validateCurrentBoundedMutationManifest(manifest, {
    candidateRoot: manifest.root,
    repositoryRoot: repository,
    expectedRunId: runId,
  });

  const reports = [];
  for (const scope of MUTATION_REPORT_SCOPES) {
    const bytes = await readRegularRelativeFile(repository, scope.evidencePath);
    const digest = sha256(bytes);
    reports.push({ scope: scope.id, path: scope.evidencePath, sha256: digest });
  }
  const closureResults = [];
  for (const group of CLOSURE_GROUPS) {
    const file =
      group.id === "authorization"
        ? "authorization-closure.json"
        : "critical-worker-closure.json";
    const path = `reports/mutation-bounded/${runId}/${file}`;
    const bytes = await readRegularRelativeFile(repository, path);
    closureResults.push({
      group: group.id,
      path,
      sha256: sha256(bytes),
      result: JSON.parse(bytes.toString("utf8")),
    });
  }
  const rebuilt = buildMutationSummary({
    manifest,
    manifestSha256,
    candidateSha: sha,
    candidateRunId: runId,
    reports,
    closureResults,
  });
  if (stableStringify(rebuilt) !== stableStringify(summary)) {
    throw new Error(
      "mutation summary does not recompute from current reports and closure results",
    );
  }
  return {
    candidateSha: sha,
    candidateRunId: runId,
    manifestSha256,
    total: rebuilt.total,
    adjustedScore: rebuilt.adjusted_score,
    criticalRealSurvivors: rebuilt.critical_real_survivors,
  };
}
