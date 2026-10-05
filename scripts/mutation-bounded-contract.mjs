import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readContainedMutationFile } from "./mutation-safe-files.mjs";

const execFileAsync = promisify(execFile);

export const MUTATION_REPORT_SCOPES = Object.freeze([
  Object.freeze({
    id: "authorization",
    evidencePath: "reports/mutation/mutation.json",
    sources: Object.freeze(["packages/application/src/authorization.ts"]),
  }),
  Object.freeze({
    id: "critical",
    evidencePath: "reports/mutation-critical/mutation.json",
    sources: Object.freeze([
      "packages/application/src/session.ts",
      "apps/api/src/security/rate-limit-store.ts",
      "packages/application/src/account-recovery-use-cases.ts",
      "packages/application/src/attempt-use-cases.ts",
    ]),
  }),
  Object.freeze({
    id: "worker",
    evidencePath: "reports/mutation-worker/mutation.json",
    sources: Object.freeze(["apps/worker/src/loop.ts"]),
  }),
]);

export const MUTATION_TEST_FILES = Object.freeze([
  "packages/application/src/authorization.test.ts",
  "packages/application/src/authorization-mutation-closure.test.ts",
  "apps/api/src/routing/route-registry.test.ts",
  "packages/application/src/session.test.ts",
  "packages/application/src/session-mutation-closure.test.ts",
  "apps/api/src/security/rate-limit-store.test.ts",
  "apps/api/src/security/rate-limit-mutation-closure.test.ts",
  "packages/application/src/account-recovery-use-cases.test.ts",
  "packages/application/src/recovery-mutation-closure.test.ts",
  "packages/application/src/attempt-use-cases.test.ts",
  "packages/application/src/attempt-mutation-closure.test.ts",
  "apps/worker/src/loop.test.ts",
  "apps/worker/src/loop-mutation-closure.test.ts",
  "apps/worker/src/loop-branch-closure.test.ts",
]);

export const MUTATION_CONTROL_FILES = Object.freeze([
  ".github/workflows/candidate.yml",
  "config/triple-aaa-gates.json",
  "scripts/discover-candidate-mutation.mjs",
  "scripts/gate-config.mjs",
  "scripts/mutation-bounded-contract.mjs",
  "scripts/mutation-closure-cli.mjs",
  "scripts/mutation-identity-validation.mjs",
  "scripts/mutation-report-path.mjs",
  "scripts/mutation-result-reporter.mjs",
  "scripts/mutation-result-validation.mjs",
  "scripts/mutation-safe-files.mjs",
  "scripts/mutation-summary-contract.mjs",
  "scripts/release-evidence.mjs",
  "scripts/verify-aaa-candidate.mjs",
  "scripts/verify-evidence-consistency.mjs",
  "scripts/verify-mutation-closure.mjs",
  "scripts/verify-mutation-critical.mjs",
  "scripts/verify-triple-aaa.mjs",
  "scripts/write-mutation-summary.mjs",
]);

export const MUTATION_RUNNER_INPUT_FILES = Object.freeze([
  ...MUTATION_TEST_FILES,
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "vitest.config.ts",
  "scripts/coverage-exclusions.mjs",
  "scripts/verify-coverage-floor.mjs",
  "stryker.authorization.mjs",
  "stryker.critical.mjs",
  "stryker.worker.mjs",
  ...MUTATION_CONTROL_FILES,
]);

const sourceNames = MUTATION_REPORT_SCOPES.flatMap((scope) => scope.sources);
const digestPattern = /^[a-f0-9]{64}$/u;
const shaPattern = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u;
const runIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isSafeRelativePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !isAbsolute(value) &&
    !win32.isAbsolute(value) &&
    !value.includes(":") &&
    !value.includes("\\") &&
    value
      .split("/")
      .every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function requireValue(condition, detail) {
  if (!condition) throw new Error(detail);
}

function requireIdentity(identity, source, scopeId) {
  const location = identity?.location;
  for (const point of [location?.start, location?.end]) {
    requireValue(
      Number.isSafeInteger(point?.line) &&
        point.line > 0 &&
        Number.isSafeInteger(point?.column) &&
        point.column > 0,
      `scope ${scopeId} has malformed mutant identity location`,
    );
  }
  requireValue(
    typeof identity.id === "string" &&
      identity.id.length > 0 &&
      typeof identity.mutatorName === "string" &&
      identity.mutatorName.length > 0 &&
      typeof identity.replacement === "string" &&
      typeof identity.status === "string" &&
      identity.status.length > 0,
    `scope ${scopeId} has malformed mutant identity`,
  );
  const { start, end } = location;
  requireValue(
    end.line > start.line ||
      (end.line === start.line && end.column > start.column),
    `scope ${scopeId} has an invalid mutant identity range`,
  );
  const lines = source.split("\n");
  requireValue(
    start.line <= lines.length &&
      end.line <= lines.length &&
      start.column <= lines[start.line - 1].length + 1 &&
      end.column <= lines[end.line - 1].length + 1,
    `scope ${scopeId} has a mutant identity outside its source`,
  );
}

function expectedRunPath(candidateRunId, scopeId) {
  return `reports/mutation-runs/${candidateRunId}/${scopeId}/mutation.json`;
}

export function buildBoundedMutationManifest(input) {
  const timeout = input?.timeout ?? 240000;
  requireValue(input && typeof input === "object", "missing manifest input");
  requireValue(
    typeof input.root === "string" && isAbsolute(input.root),
    "candidate root must be absolute",
  );
  requireValue(
    typeof input.vitest === "string" && isAbsolute(input.vitest),
    "Vitest entrypoint must be absolute",
  );
  requireValue(
    input.config === "vitest.config.ts",
    "unexpected candidate Vitest config",
  );
  requireValue(
    typeof input.candidateSha === "string" &&
      shaPattern.test(input.candidateSha),
    "candidate SHA is missing or malformed",
  );
  requireValue(
    typeof input.candidateRunId === "string" &&
      runIdPattern.test(input.candidateRunId),
    "candidate run id is missing or malformed",
  );
  requireValue(
    typeof input.repositoryRoot === "string" &&
      isAbsolute(input.repositoryRoot),
    "producer repository root must be absolute",
  );
  requireValue(
    typeof input.generatedAt === "string" &&
      Number.isFinite(Date.parse(input.generatedAt)),
    "manifest generation time is invalid",
  );
  requireValue(
    Number.isSafeInteger(timeout) && timeout > 0 && timeout <= 240000,
    "manifest timeout is outside the allowed range",
  );
  requireValue(
    Array.isArray(input.reports),
    "current Stryker reports are missing",
  );
  const runnerInputDigests = input.runnerInputDigests;
  requireValue(
    runnerInputDigests &&
      typeof runnerInputDigests === "object" &&
      !Array.isArray(runnerInputDigests) &&
      JSON.stringify(Object.keys(runnerInputDigests).sort()) ===
        JSON.stringify([...MUTATION_RUNNER_INPUT_FILES].sort()) &&
      Object.values(runnerInputDigests).every((digest) =>
        digestPattern.test(digest),
      ),
    "candidate mutation runner input digests are incomplete or malformed",
  );

  const expectedScopes = new Map(
    MUTATION_REPORT_SCOPES.map((scope) => [scope.id, scope]),
  );
  const reportsByScope = new Map();
  for (const reportRef of input.reports) {
    requireValue(
      reportRef &&
        expectedScopes.has(reportRef.scope) &&
        !reportsByScope.has(reportRef.scope),
      "Stryker report scopes are missing, unknown or duplicated",
    );
    const scope = expectedScopes.get(reportRef.scope);
    requireValue(
      reportRef.runId === input.candidateRunId,
      `Stryker report run id does not match candidate run id for ${scope.id}`,
    );
    requireValue(
      reportRef.path === expectedRunPath(input.candidateRunId, scope.id) &&
        reportRef.evidencePath === scope.evidencePath &&
        isSafeRelativePath(reportRef.path) &&
        digestPattern.test(reportRef.sha256),
      `Stryker report provenance is malformed for ${scope.id}`,
    );
    requireValue(
      Number.isFinite(reportRef.startedAt) &&
        Number.isFinite(reportRef.finishedAt) &&
        reportRef.finishedAt >= reportRef.startedAt &&
        reportRef.finishedAt <= Date.parse(input.generatedAt),
      `Stryker report timing is malformed for ${scope.id}`,
    );
    const report = reportRef.report;
    requireValue(
      report &&
        typeof report === "object" &&
        !Array.isArray(report) &&
        typeof report.projectRoot === "string" &&
        resolve(report.projectRoot) === resolve(input.root),
      `Stryker report project root does not match isolated candidate for ${scope.id}`,
    );
    const configuredSources = report.config?.mutate;
    requireValue(
      Array.isArray(configuredSources) &&
        JSON.stringify([...configuredSources].sort()) ===
          JSON.stringify([...scope.sources].sort()),
      `Stryker report mutation scope mismatch for ${scope.id}`,
    );
    requireValue(
      report.files &&
        typeof report.files === "object" &&
        !Array.isArray(report.files) &&
        JSON.stringify(Object.keys(report.files).sort()) ===
          JSON.stringify([...scope.sources].sort()),
      `Stryker report source inventory mismatch for ${scope.id}`,
    );
    reportsByScope.set(scope.id, { ...reportRef, report });
  }
  requireValue(
    reportsByScope.size === MUTATION_REPORT_SCOPES.length,
    "one or more current Stryker report scopes are missing",
  );

  const sources = {};
  const identities = [];
  const scopeCounts = [];
  let totalMutants = 0;
  let rawKilled = 0;
  for (const scope of MUTATION_REPORT_SCOPES) {
    const reportRef = reportsByScope.get(scope.id);
    let scopeTotal = 0;
    let scopeKilled = 0;
    for (const sourceName of scope.sources) {
      const file = reportRef.report.files[sourceName];
      requireValue(
        file && typeof file.source === "string" && Array.isArray(file.mutants),
        `Stryker report source entry is malformed for ${scope.id}/${sourceName}`,
      );
      if (sources[sourceName] !== undefined) {
        requireValue(
          sources[sourceName] === file.source,
          `Stryker source content differs between scopes for ${sourceName}`,
        );
      } else {
        sources[sourceName] = file.source;
      }
      for (const mutant of file.mutants) {
        requireIdentity(mutant, file.source, scope.id);
        scopeTotal += 1;
        totalMutants += 1;
        if (mutant.status === "Killed") {
          scopeKilled += 1;
          rawKilled += 1;
          continue;
        }
        identities.push({
          id: `${scope.id}:${sourceName}:${mutant.id}`,
          scopeId: scope.id,
          rawStatus: mutant.status,
          source: sourceName,
          sourceDigest: sha256(file.source),
          mutatorName: mutant.mutatorName,
          location: mutant.location,
          replacement: mutant.replacement,
        });
      }
    }
    requireValue(
      scopeTotal > 0,
      `Stryker report has no mutants for ${scope.id}`,
    );
    scopeCounts.push({
      id: scope.id,
      total: scopeTotal,
      rawKilled: scopeKilled,
      pendingMutants: scopeTotal - scopeKilled,
    });
  }
  requireValue(totalMutants > 0, "current Stryker reports contain no mutants");
  requireValue(
    Object.keys(sources).length === sourceNames.length,
    "current Stryker source inventory is incomplete",
  );

  const reports = MUTATION_REPORT_SCOPES.map((scope) => {
    const reportRef = reportsByScope.get(scope.id);
    const count = scopeCounts.find((item) => item.id === scope.id);
    return {
      scope: scope.id,
      path: reportRef.path,
      evidencePath: scope.evidencePath,
      sha256: reportRef.sha256,
      runId: reportRef.runId,
      startedAt: reportRef.startedAt,
      finishedAt: reportRef.finishedAt,
      totalMutants: count.total,
      rawKilled: count.rawKilled,
      pendingMutants: count.pendingMutants,
    };
  });

  return Object.freeze({
    root: resolve(input.root),
    vitest: resolve(input.vitest),
    config: input.config,
    candidateSha: input.candidateSha,
    sources: Object.freeze(sources),
    runnerInputDigests: Object.freeze({ ...runnerInputDigests }),
    tests: MUTATION_TEST_FILES,
    identities: Object.freeze(identities),
    timeout,
    provenance: Object.freeze({
      format: "cvg-bounded-mutation-manifest/v1",
      candidateRunId: input.candidateRunId,
      candidateSha: input.candidateSha,
      producerRoot: resolve(input.repositoryRoot),
      generatedAt: input.generatedAt,
      totalMutants,
      rawKilled,
      pendingMutants: totalMutants - rawKilled,
      scopes: Object.freeze(scopeCounts),
      reports: Object.freeze(reports),
    }),
  });
}

async function readRegularRelativeFile(root, name) {
  requireValue(isSafeRelativePath(name), "manifest evidence path is unsafe");
  requireValue(resolve(root) === root, "evidence root is not canonical");
  return readContainedMutationFile(root, name);
}

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

export async function validateCurrentBoundedMutationManifest(
  manifest,
  { candidateRoot, repositoryRoot, expectedRunId },
) {
  requireValue(
    manifest?.provenance?.format === "cvg-bounded-mutation-manifest/v1",
    "candidate manifest provenance is missing or unsupported",
  );
  const provenance = manifest.provenance;
  requireValue(
    provenance.candidateRunId === expectedRunId &&
      manifest.candidateSha === provenance.candidateSha &&
      shaPattern.test(provenance.candidateSha),
    "manifest candidate identity does not match this run",
  );
  const repository = resolve(repositoryRoot);
  requireValue(
    resolve(provenance.producerRoot) === repository,
    "manifest producer root differs from the current repository",
  );
  const [headResult, markerFile] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repository }),
    readRegularRelativeFile(candidateRoot, ".cvg-mutation-candidate.json"),
  ]);
  const actualHead = headResult.stdout.trim();
  requireValue(
    actualHead === provenance.candidateSha,
    "manifest candidate SHA differs from the checked out commit",
  );
  const marker = JSON.parse(markerFile.bytes.toString("utf8"));
  requireValue(
    marker?.format === "cvg-mutation-candidate/v1" &&
      resolve(marker.root) === resolve(candidateRoot) &&
      marker.candidateSha === provenance.candidateSha &&
      marker.candidateRunId === expectedRunId,
    "isolated candidate marker does not match the manifest",
  );
  requireValue(
    resolve(manifest.root) === resolve(candidateRoot) &&
      resolve(manifest.vitest) ===
        resolve(candidateRoot, "node_modules/vitest/vitest.mjs") &&
      manifest.config === "vitest.config.ts" &&
      stableStringify(manifest.tests) === stableStringify(MUTATION_TEST_FILES),
    "manifest candidate root or bounded suite differs from the frozen contract",
  );
  requireValue(
    manifest.runnerInputDigests &&
      JSON.stringify(Object.keys(manifest.runnerInputDigests).sort()) ===
        JSON.stringify([...MUTATION_RUNNER_INPUT_FILES].sort()) &&
      Object.values(manifest.runnerInputDigests).every((digest) =>
        digestPattern.test(digest),
      ),
    "manifest candidate runner input inventory is invalid",
  );
  for (const inputPath of MUTATION_RUNNER_INPUT_FILES) {
    const candidateInput = await readRegularRelativeFile(
      candidateRoot,
      inputPath,
    );
    const committedInput = await execFileAsync(
      "git",
      ["show", `${provenance.candidateSha}:${inputPath}`],
      { cwd: repository, encoding: "buffer" },
    );
    requireValue(
      sha256(candidateInput.bytes) === manifest.runnerInputDigests[inputPath] &&
        candidateInput.bytes.equals(committedInput.stdout),
      `candidate runner input differs from committed HEAD: ${inputPath}`,
    );
  }

  const reports = [];
  for (const expectedScope of MUTATION_REPORT_SCOPES) {
    const ref = provenance.reports?.find(
      (item) => item.scope === expectedScope.id,
    );
    requireValue(
      ref,
      `manifest provenance is missing ${expectedScope.id} report`,
    );
    requireValue(
      ref.evidencePath === expectedScope.evidencePath &&
        ref.path === expectedRunPath(expectedRunId, expectedScope.id) &&
        ref.runId === expectedRunId,
      `manifest report path or run id is stale for ${expectedScope.id}`,
    );
    const evidence = await readRegularRelativeFile(repository, ref.path);
    requireValue(
      sha256(evidence.bytes) === ref.sha256,
      `current Stryker report digest does not match manifest for ${expectedScope.id}`,
    );
    requireValue(
      evidence.stats.mtimeMs >= ref.startedAt - 2_000 &&
        evidence.stats.mtimeMs <= ref.finishedAt + 2_000,
      `current Stryker report timestamp does not match this run for ${expectedScope.id}`,
    );
    const report = JSON.parse(evidence.bytes.toString("utf8"));
    for (const source of expectedScope.sources) {
      const candidateSource = await readRegularRelativeFile(
        candidateRoot,
        source,
      );
      const expected = await execFileAsync(
        "git",
        ["show", `${provenance.candidateSha}:${source}`],
        { cwd: repository, encoding: "buffer" },
      );
      requireValue(
        report.files?.[source]?.source === expected.stdout.toString("utf8") &&
          candidateSource.bytes.toString("utf8") ===
            expected.stdout.toString("utf8"),
        `Stryker source differs from committed candidate for ${source}`,
      );
    }
    reports.push({
      scope: expectedScope.id,
      path: ref.path,
      evidencePath: ref.evidencePath,
      sha256: ref.sha256,
      runId: ref.runId,
      startedAt: ref.startedAt,
      finishedAt: ref.finishedAt,
      report,
    });
  }
  requireValue(
    provenance.reports.length === MUTATION_REPORT_SCOPES.length,
    "manifest provenance contains unknown or duplicate reports",
  );
  const rebuilt = buildBoundedMutationManifest({
    root: manifest.root,
    vitest: manifest.vitest,
    config: manifest.config,
    candidateSha: provenance.candidateSha,
    candidateRunId: expectedRunId,
    repositoryRoot: repository,
    generatedAt: provenance.generatedAt,
    reports,
    runnerInputDigests: manifest.runnerInputDigests,
    timeout: manifest.timeout,
  });
  requireValue(
    stableStringify(rebuilt) === stableStringify(manifest),
    "manifest mutant identities or counts differ from current Stryker reports",
  );
  return {
    candidateSha: provenance.candidateSha,
    candidateRunId: expectedRunId,
    generatedAt: provenance.generatedAt,
    totalMutants: provenance.totalMutants,
    rawKilled: provenance.rawKilled,
    pendingMutants: provenance.pendingMutants,
    reportDigests: provenance.reports.map(({ scope, sha256: digest }) => ({
      scope,
      sha256: digest,
    })),
  };
}

export function sha256FileBytes(value) {
  return sha256(value);
}

export function resolveRepositoryRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}
