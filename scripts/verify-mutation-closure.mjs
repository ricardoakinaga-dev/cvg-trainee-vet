import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import {
  openContainedMutationFile,
  readContainedMutationFile,
  validateDedicatedCandidateRoot,
} from "./mutation-safe-files.mjs";
import { validateMutationIdentities } from "./mutation-identity-validation.mjs";
import {
  runSuite,
  validateSuiteResult,
} from "./mutation-result-validation.mjs";
import {
  resolveRepositoryRoot,
  MUTATION_RUNNER_INPUT_FILES,
  validateCurrentBoundedMutationManifest,
} from "./mutation-bounded-contract.mjs";
import { runMutationClosureCli } from "./mutation-closure-cli.mjs";

export function verifyHistoricalClosure() {
  return {
    status: "NOT_VERIFIED",
    exitCode: 1,
    missing_proof: [
      "Green baseline and completed structured assertion results bound to the same candidate",
      "Exact source/operator/start/end/replacement identities and source digests for every historical mutant",
      "Individually reviewed semantic equivalence; switch labels and NO_EFFECT are not equivalence proof",
    ],
    detail:
      "SOA-31: historical mutation closure is quarantined. No sources or reports were written; existing summaries remain unverified. Provide a bounded manifest for a copied candidate to run runBoundedClosure.",
  };
}

function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

function isSafeRelativePath(name) {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    !isAbsolute(name) &&
    !win32.isAbsolute(name) &&
    !name.includes(":") &&
    !name.includes("\\") &&
    name
      .split("/")
      .every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

export function requireIsolatedRoot(root) {
  if (typeof root !== "string" || !isAbsolute(root)) {
    throw new Error("candidate root must be an absolute isolated path");
  }
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const target = resolve(root);
  if (target === repoRoot) {
    throw new Error("candidate root must not be the repository");
  }
  const repoInsideCandidate = relative(target, repoRoot);
  const candidateInsideRepo = relative(repoRoot, target);
  if (
    (!repoInsideCandidate.startsWith("..") &&
      !isAbsolute(repoInsideCandidate)) ||
    (!candidateInsideRepo.startsWith("..") && !isAbsolute(candidateInsideRepo))
  ) {
    throw new Error("candidate root overlaps the real repository tree");
  }
  return target;
}

function offsetOf(source, point) {
  const lines = source.split("\n");
  if (point.line > lines.length) return null;
  let offset = 0;
  for (let index = 0; index < point.line - 1; index += 1) {
    offset += lines[index].length + 1;
  }
  const columnOffset = offset + point.column - 1;
  return columnOffset <= offset + lines[point.line - 1].length
    ? columnOffset
    : null;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("missing bounded manifest");
  }
  const { root, vitest, config, sources, tests, identities } = manifest;
  if (typeof vitest !== "string" || !isAbsolute(vitest)) {
    throw new Error("manifest vitest entrypoint must be absolute");
  }
  if (
    config !== undefined &&
    config !== null &&
    (typeof config !== "string" ||
      config.startsWith("-") ||
      !isSafeRelativePath(config))
  ) {
    throw new Error("invalid config entry");
  }
  if (
    !sources ||
    typeof sources !== "object" ||
    Array.isArray(sources) ||
    Object.keys(sources).length === 0 ||
    Object.entries(sources).some(
      ([name, contents]) =>
        !isSafeRelativePath(name) || typeof contents !== "string",
    )
  ) {
    throw new Error("invalid sources manifest");
  }
  if (
    !Array.isArray(tests) ||
    tests.length === 0 ||
    tests.some(
      (test) =>
        typeof test !== "string" ||
        test.startsWith("-") ||
        !isSafeRelativePath(test),
    ) ||
    new Set(tests).size !== tests.length
  ) {
    throw new Error("invalid tests manifest");
  }
  return {
    root,
    vitest,
    candidateSha: manifest.candidateSha,
    candidateRunId:
      manifest.candidateRunId ?? manifest.provenance?.candidateRunId,
    config,
    sources,
    tests,
    identities,
    timeout: manifest.timeout,
  };
}

async function requireCleanCandidate(root, sources, tests, config) {
  for (const [name, contents] of Object.entries(sources)) {
    const onDisk = await readContainedMutationFile(root, name).catch(
      () => null,
    );
    if (onDisk === null || onDisk.bytes.toString("utf8") !== contents) {
      throw new Error(`${name} does not match the manifest contents`);
    }
  }
  for (const test of tests) {
    await readContainedMutationFile(root, test);
  }
  if (config !== undefined && config !== null) {
    await readContainedMutationFile(root, config);
  }
}

async function captureRunnerInputs(
  root,
  manifest,
  validated,
  strictProvenance,
) {
  const names = strictProvenance
    ? MUTATION_RUNNER_INPUT_FILES
    : [...validated.tests, ...(validated.config ? [validated.config] : [])];
  const snapshot = new Map();
  for (const name of names) {
    const file = await readContainedMutationFile(root, name);
    const actualDigest = sha256Hex(file.bytes);
    const expectedDigest = strictProvenance
      ? manifest.runnerInputDigests?.[name]
      : actualDigest;
    if (actualDigest !== expectedDigest) {
      throw new Error(`candidate runner input digest mismatch: ${name}`);
    }
    snapshot.set(name, actualDigest);
  }
  return snapshot;
}

async function assertRunnerInputsUnchanged(root, snapshot, stage) {
  for (const [name, expectedDigest] of snapshot) {
    const file = await readContainedMutationFile(root, name);
    if (sha256Hex(file.bytes) !== expectedDigest) {
      throw new Error(`candidate runner input changed ${stage}: ${name}`);
    }
  }
}

async function captureCandidateSourceBytes(root, sources) {
  const snapshots = new Map();
  for (const name of Object.keys(sources)) {
    snapshots.set(name, (await readContainedMutationFile(root, name)).bytes);
  }
  return snapshots;
}

async function assertCandidateSourcesUnchanged(root, snapshots, stage) {
  for (const [name, expectedBytes] of snapshots) {
    const file = await readContainedMutationFile(root, name);
    if (!file.bytes.equals(expectedBytes)) {
      throw new Error(`candidate source changed ${stage}: ${name}`);
    }
  }
}

async function assertCandidateExecutionState(root, runnerInputs, stage) {
  if (!(await root.isStillCurrent())) {
    throw new Error(`candidate root changed ${stage}`);
  }
  await assertRunnerInputsUnchanged(root, runnerInputs, stage);
}

async function evaluateCandidate({
  root,
  cwd,
  identity,
  sources,
  tests,
  vitest,
  config,
  budget,
  baselineExecution,
  runnerInputs,
  sourceSnapshots,
  allowExternalRunnerPaths,
}) {
  const source = sources[identity.source];
  let baselineDigest = sha256Hex(Buffer.from(source, "utf8"));
  const start = offsetOf(source, identity.location.start);
  const end = offsetOf(source, identity.location.end);
  if (
    start === null ||
    end === null ||
    end <= start ||
    source.slice(start, end) === identity.replacement
  ) {
    return {
      id: identity.id,
      scopeId: identity.scopeId,
      outcome: "HARNESS_ERROR",
      detail: "identity does not select a replaceable source range",
      restored: true,
      baselineDigest,
      candidateDigest: null,
      failedTests: [],
    };
  }
  const candidate =
    source.slice(0, start) + identity.replacement + source.slice(end);
  let sourceFile;
  let baselineFile;
  try {
    sourceFile = await openContainedMutationFile(root, identity.source);
    baselineFile = await sourceFile.read();
    baselineDigest = sha256Hex(baselineFile.bytes);
    if (
      !baselineFile.bytes.equals(Buffer.from(source, "utf8")) ||
      baselineDigest !== identity.sourceDigest
    ) {
      throw new Error("source no longer matches its identity baseline");
    }
    await sourceFile.replace(Buffer.from(candidate, "utf8"), baselineFile.mode);
  } catch (error) {
    let restored = false;
    try {
      const current = await sourceFile?.read();
      restored =
        baselineFile !== undefined &&
        current?.bytes.equals(baselineFile.bytes) === true &&
        sha256Hex(current.bytes) === baselineDigest &&
        (await sourceFile?.isStillContained()) === true;
    } catch {
      restored = false;
    }
    await sourceFile?.close().catch(() => undefined);
    return {
      id: identity.id,
      scopeId: identity.scopeId,
      outcome: "HARNESS_ERROR",
      detail: error.message,
      restored,
      baselineDigest,
      candidateDigest: null,
      failedTests: [],
    };
  }
  const candidateBytes = Buffer.from(candidate, "utf8");
  const candidateDigest = sha256Hex(candidateBytes);
  let execution;
  let executionError;
  try {
    await assertCandidateExecutionState(
      root,
      runnerInputs,
      "before mutant suite",
    );
    execution = await runSuite({
      cwd: root.executionPath,
      expectedRoot: cwd,
      files: tests,
      vitest,
      config,
      allowExternalRunnerPaths,
      timeout: budget,
    });
  } catch (error) {
    executionError = error;
  }
  try {
    await assertCandidateExecutionState(
      root,
      runnerInputs,
      "after mutant execution",
    );
  } catch (error) {
    executionError ??= error;
  }
  try {
    if (!(await sourceFile.isStillContained())) {
      executionError ??= new Error(
        "candidate root or source parent moved during mutation execution",
      );
    } else {
      const currentCandidate = await sourceFile.read();
      if (!currentCandidate.bytes.equals(candidateBytes)) {
        executionError ??= new Error(
          "candidate source changed during mutation execution",
        );
      }
    }
  } catch (error) {
    executionError ??= error;
  }
  let restoreError;
  try {
    if (!(await sourceFile.isStillContained())) {
      throw new Error(
        "candidate root or source parent moved; restoration was refused",
      );
    }
    await sourceFile.replace(baselineFile.bytes, baselineFile.mode);
  } catch (error) {
    restoreError = error;
  }
  let restoredSource;
  try {
    if (await sourceFile.isStillContained()) {
      restoredSource = await sourceFile.read();
    } else {
      restoredSource = null;
    }
  } catch {
    restoredSource = null;
  }
  const restored =
    restoredSource !== null &&
    restoredSource.bytes.equals(baselineFile.bytes) &&
    sha256Hex(restoredSource.bytes) === baselineDigest &&
    (await sourceFile.isStillContained());
  await sourceFile.close().catch(() => undefined);
  try {
    await assertCandidateSourcesUnchanged(
      root,
      sourceSnapshots,
      "after mutant restoration",
    );
    await assertCandidateExecutionState(
      root,
      runnerInputs,
      "after mutant restoration",
    );
  } catch (error) {
    executionError ??= error;
  }
  const verdict = execution
    ? validateSuiteResult(execution, baselineExecution)
    : { outcome: "HARNESS_ERROR", detail: executionError?.message };
  const base = {
    id: identity.id,
    scopeId: identity.scopeId,
    baselineDigest,
    candidateDigest,
    restored,
    baselineRun: baselineExecution.runId,
    candidateRun: execution?.runId ?? null,
    failedTests: verdict.failedTests ?? [],
  };
  if (!restored) {
    return {
      ...base,
      outcome: "HARNESS_ERROR",
      detail: `candidate source was not restored: ${
        restoreError?.message ?? "baseline digest mismatch"
      }`,
    };
  }
  if (executionError) {
    return {
      ...base,
      outcome: "HARNESS_ERROR",
      detail: executionError.message,
    };
  }
  if (
    verdict.outcome === "ASSERTION_FAILURE" &&
    candidateDigest !== baselineDigest
  ) {
    return { ...base, outcome: "KILLED" };
  }
  if (verdict.outcome === "NO_EFFECT") {
    return { ...base, outcome: "NO_EFFECT" };
  }
  return {
    ...base,
    outcome: "HARNESS_ERROR",
    detail: verdict.detail ?? "candidate outcome is not a proven kill",
  };
}

export async function runBoundedClosure(manifest, options = {}) {
  let candidateRootLease;
  try {
    const validated = validateManifest(manifest);
    const target = requireIsolatedRoot(validated.root);
    candidateRootLease = await validateDedicatedCandidateRoot(target, {
      candidateSha: validated.candidateSha,
      candidateRunId: validated.candidateRunId,
      expectedRunId: options.expectedRunId,
    });
    let candidateProvenance;
    const testOnly = options.testOnlyAllowMissingProvenance === true;
    if (!testOnly) {
      if (typeof options.expectedRunId !== "string" || !options.expectedRunId) {
        throw new Error("current candidate run id is required");
      }
      candidateProvenance = await validateCurrentBoundedMutationManifest(
        manifest,
        {
          candidateRoot: target,
          repositoryRoot: resolveRepositoryRoot(),
          expectedRunId: options.expectedRunId,
        },
      );
    }
    const allowExternalRunnerPaths = candidateProvenance === undefined;
    const suiteVitest = allowExternalRunnerPaths
      ? validated.vitest
      : relative(target, validated.vitest);
    if (!allowExternalRunnerPaths && !isSafeRelativePath(suiteVitest)) {
      throw new Error("candidate Vitest entrypoint is outside the root");
    }
    const proof =
      validated.identities.length === 0
        ? { valid: candidateProvenance?.pendingMutants === 0 }
        : validateMutationIdentities(validated.identities, validated.sources);
    if (!proof.valid) {
      return {
        status: proof.outcome ?? "NOT_VERIFIED",
        exitCode: 1,
        detail:
          proof.detail ?? "manifest has no proven current mutant identities",
        results: [],
      };
    }
    const requestedScopes = options.scopeIds;
    if (
      requestedScopes !== undefined &&
      (!Array.isArray(requestedScopes) ||
        requestedScopes.length === 0 ||
        new Set(requestedScopes).size !== requestedScopes.length ||
        requestedScopes.some(
          (scope) =>
            !candidateProvenance?.reportDigests.some(
              (report) => report.scope === scope,
            ),
        ))
    ) {
      throw new Error("requested mutation scopes are invalid or duplicated");
    }
    const identities =
      requestedScopes === undefined
        ? validated.identities
        : validated.identities.filter((identity) =>
            requestedScopes.includes(identity.scopeId),
          );
    if (candidateProvenance !== undefined) {
      for (const scope of requestedScopes ??
        candidateProvenance.reportDigests.map((report) => report.scope)) {
        const expected = manifest.provenance.scopes.find(
          (item) => item.id === scope,
        );
        const actual = identities.filter(
          (identity) => identity.scopeId === scope,
        ).length;
        if (!expected || expected.pendingMutants !== actual) {
          throw new Error(
            `manifest pending identities differ from report count for ${scope}`,
          );
        }
      }
    }
    await requireCleanCandidate(
      candidateRootLease,
      validated.sources,
      validated.tests,
      validated.config,
    );
    const runnerInputs = await captureRunnerInputs(
      candidateRootLease,
      manifest,
      validated,
      candidateProvenance !== undefined,
    );
    const sourceSnapshots = await captureCandidateSourceBytes(
      candidateRootLease,
      validated.sources,
    );
    await assertCandidateExecutionState(
      candidateRootLease,
      runnerInputs,
      "before baseline",
    );
    await assertCandidateSourcesUnchanged(
      candidateRootLease,
      sourceSnapshots,
      "before baseline",
    );
    const budget =
      Number.isSafeInteger(validated.timeout) &&
      validated.timeout > 0 &&
      validated.timeout <= 240000
        ? validated.timeout
        : null;
    if (budget === null) throw new Error("invalid execution budget");
    const baselineExecution = await runSuite({
      cwd: candidateRootLease.executionPath,
      expectedRoot: target,
      files: validated.tests,
      vitest: suiteVitest,
      config: validated.config,
      allowExternalRunnerPaths,
      timeout: budget,
    });
    await assertCandidateExecutionState(
      candidateRootLease,
      runnerInputs,
      "after baseline",
    );
    await assertCandidateSourcesUnchanged(
      candidateRootLease,
      sourceSnapshots,
      "after baseline",
    );
    const baseline = validateSuiteResult(baselineExecution);
    if (baseline.outcome !== "BASELINE_GREEN") {
      return {
        status: "HARNESS_ERROR",
        exitCode: 1,
        detail: `baseline ${baseline.outcome}: ${baseline.detail ?? "not green"}`,
        results: [],
      };
    }
    const results = [];
    for (const identity of identities) {
      await assertCandidateExecutionState(
        candidateRootLease,
        runnerInputs,
        "before mutant execution",
      );
      await assertCandidateSourcesUnchanged(
        candidateRootLease,
        sourceSnapshots,
        "before mutant execution",
      );
      const result = await evaluateCandidate({
        root: candidateRootLease,
        cwd: target,
        identity,
        sources: validated.sources,
        tests: validated.tests,
        vitest: suiteVitest,
        config: validated.config,
        budget,
        baselineExecution,
        runnerInputs,
        sourceSnapshots,
        allowExternalRunnerPaths,
      });
      results.push(result);
      if (result.outcome === "HARNESS_ERROR") break;
    }
    const evidenceStatus = results.some(
      (result) => result.outcome === "HARNESS_ERROR",
    )
      ? "HARNESS_ERROR"
      : results.some((result) => result.outcome === "NOT_VERIFIED")
        ? "NOT_VERIFIED"
        : results.every((result) => result.outcome === "KILLED")
          ? "KILLED"
          : "SURVIVED";
    const status =
      candidateProvenance === undefined && evidenceStatus === "KILLED"
        ? "TEST_ONLY_KILLED"
        : evidenceStatus;
    const outputResults =
      candidateProvenance === undefined
        ? results.map((result) =>
            result.outcome === "KILLED"
              ? { ...result, outcome: "TEST_ONLY_KILLED" }
              : result,
          )
        : results;
    const verifiedKills = results.filter(
      (result) => result.outcome === "KILLED",
    ).length;
    return {
      status,
      exitCode: status === "KILLED" || status === "TEST_ONLY_KILLED" ? 0 : 1,
      results: outputResults,
      ...(candidateProvenance === undefined ? { testOnly: true } : {}),
      ...(candidateProvenance === undefined
        ? {}
        : {
            candidateRunId: candidateProvenance.candidateRunId,
            candidateSha: candidateProvenance.candidateSha,
            manifestSha256: options.manifestSha256,
            scopes:
              requestedScopes ??
              candidateProvenance.reportDigests.map((report) => report.scope),
            mutantCount: identities.length,
            verifiedKills,
            realSurvivors: identities.length - verifiedKills,
          }),
    };
  } catch (error) {
    return {
      status: "HARNESS_ERROR",
      exitCode: 1,
      detail: error.message,
      results: [],
    };
  } finally {
    await candidateRootLease?.close().catch(() => undefined);
  }
}

await runMutationClosureCli({
  scriptName: "verify-mutation-closure.mjs",
  runBoundedClosure,
  verifyHistoricalClosure,
});
