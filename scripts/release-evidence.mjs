import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { isEvidenceFresh } from "./evidence-freshness.mjs";
import { loadGateConfig } from "./gate-config.mjs";
import { validateCurrentMutationSummary } from "./mutation-summary-contract.mjs";
import { isRestoreSummaryV2 } from "./restore-summary-contract.mjs";
import { evaluateSameSha, executingCandidateIdentity } from "./same-sha.mjs";
import {
  coverageDenominatorsValid,
  sourceInventory,
  selectedTestInventory,
  selectedAssertionInventory,
  syntheticSelectedAssertions,
  testExecutionFailures,
  securityExecutionFailures,
  RLS_SUITE,
  authenticatedArtifactProof,
} from "./ci-proof-contract.mjs";

const execFileAsync = promisify(execFile);
const root = process.cwd();

const BUNDLE_FILES = Object.freeze([
  "manifest.json",
  "git-sha.txt",
  "provenance.json",
  "migration-head.txt",
  "artifact-digests.json",
  "ci-runs.json",
]);

const SUMMARY_FILES = Object.freeze([
  "coverage-summary.json",
  "test-summary.json",
  "security-summary.json",
  "rls-live-summary.json",
  "multi-instance-summary.json",
  "load-summary.json",
  "otel-summary.json",
  "mutation-summary.json",
  "redis-candidate-summary.json",
  "staging-summary.json",
  "restore-summary.json",
  "remote-ci-summary.json",
]);
const NATIVE_RAW_FILES = Object.freeze({
  "load-summary.json": "k6-summary.json",
  "otel-summary.json": "otel-spans.json",
  "multi-instance-summary.json": "ratelimit-live-results.json",
});

function runMeasurementValid(summary, run, collectedAt) {
  const measurement = summary?.measurement;
  const start = Date.parse(measurement?.startedAt);
  const end = Date.parse(measurement?.completedAt);
  const runStart = Date.parse(run?.runStartedAt);
  const upper = Date.parse(
    run?.status === "completed" ? run.updatedAt : collectedAt,
  );
  return (
    measurement?.status === "VERIFIED" &&
    measurement.checkout?.before === true &&
    measurement.checkout?.after === true &&
    summary.measured_head === summary.sha &&
    summary.sha === run?.headSha &&
    summary.generatedAt === measurement.completedAt &&
    [start, end, runStart, upper].every(Number.isFinite) &&
    runStart <= start &&
    start <= end &&
    end <= upper &&
    upper <= Date.now()
  );
}

/** @param {unknown} metrics */
export function k6ThresholdsPassed(metrics) {
  if (metrics === null || typeof metrics !== "object" || Array.isArray(metrics))
    return false;
  const mandatory = {
    errors: "rate<0.05",
    read_latency_ms: "p(95)<800",
    auth_rejected_latency_ms: "p(95)<800",
  };
  if (
    !Object.entries(mandatory).every(([name, threshold]) => {
      const configured = metrics[name]?.thresholds;
      return (
        configured &&
        typeof configured === "object" &&
        !Array.isArray(configured) &&
        Object.keys(configured).length === 1 &&
        Object.hasOwn(configured, threshold)
      );
    })
  )
    return false;
  return Object.values(metrics).every((metric) => {
    if (metric === null || typeof metric !== "object" || Array.isArray(metric))
      return false;
    if (!Object.hasOwn(metric, "thresholds")) return true;
    const thresholds = metric.thresholds;
    if (
      thresholds === null ||
      typeof thresholds !== "object" ||
      Array.isArray(thresholds) ||
      Object.keys(thresholds).length === 0
    )
      return false;
    return Object.values(thresholds).every(
      (threshold) =>
        // k6 legacy --summary-export stores !threshold.ok, a failure flag.
        threshold === false ||
        (threshold !== null &&
          typeof threshold === "object" &&
          !Array.isArray(threshold) &&
          Object.hasOwn(threshold, "ok") &&
          threshold.ok === true),
    );
  });
}

async function nativeMeasurementFailures(
  directory,
  file,
  summary,
  candidate,
  collectedAt,
) {
  const failures = [];
  const fail = (detail) =>
    failures.push(`${file} native measurement ${detail}`);
  if (!runMeasurementValid(summary, candidate, collectedAt))
    fail("identity/checkout/chronology invalid");
  const rawName = NATIVE_RAW_FILES[file];
  if (rawName === undefined) return failures;
  const raw = await readFile(join(directory, rawName)).catch(() => null);
  const digest =
    file === "multi-instance-summary.json"
      ? summary.reportSha256
      : summary.raw_sha256;
  if (
    raw === null ||
    !/^[a-f0-9]{64}$/u.test(digest ?? "") ||
    sha256Hex(raw) !== digest
  ) {
    fail("raw bytes/digest missing or mismatched");
    return failures;
  }
  try {
    let data;
    if (file === "otel-summary.json") {
      try {
        data = JSON.parse(raw.toString("utf8"));
      } catch {
        data = raw
          .toString("utf8")
          .trim()
          .split(/\r?\n/u)
          .map((line) => JSON.parse(line));
      }
    } else data = JSON.parse(raw.toString("utf8"));
    if (file === "load-summary.json") {
      const requests = data.metrics?.http_reqs?.count;
      const failed = data.metrics?.checks?.fails;
      const errors = data.metrics?.http_5xx_total?.count ?? 0;
      if (
        !Number.isSafeInteger(requests) ||
        requests <= 0 ||
        failed !== 0 ||
        errors !== 0 ||
        !k6ThresholdsPassed(data.metrics) ||
        summary.httpRequests !== requests ||
        summary.checksFails !== failed ||
        summary.failed_checks !== failed ||
        summary.http_5xx !== errors
      )
        fail("load decisions disagree with original metrics");
    } else if (file === "otel-summary.json") {
      const traces = new Set(
        [
          ...raw.toString("utf8").matchAll(/"traceId":\s*"([0-9a-f]{32})"/gu),
        ].map((match) => match[1]),
      );
      if (
        traces.size === 0 ||
        summary.bytes !== raw.length ||
        summary.distinctTraces !== traces.size
      )
        fail("OTel decisions disagree with original spans");
    } else {
      const requiredTests = {
        "tests/integration/ratelimit-redis-live.test.ts": 6,
        "tests/integration/ratelimit-redis-restart.test.ts": 2,
      };
      const result = data.testResults?.[0];
      const assertions = result?.assertionResults;
      const suiteCount = requiredTests[summary.suite];
      const count = assertions?.length;
      const measuredStart = Date.parse(summary.measurement?.startedAt);
      const measuredEnd = Date.parse(summary.measurement?.completedAt);
      if (
        summary.executionFormat !== "cvg-live-test-execution/v1" ||
        !suiteCount ||
        summary.startedAt !== summary.measurement?.startedAt ||
        !Number.isFinite(Date.parse(summary.completedAt)) ||
        Date.parse(summary.completedAt) < measuredEnd ||
        ![data.startTime, result?.startTime, result?.endTime].every(
          Number.isFinite,
        ) ||
        data.startTime < measuredStart ||
        result.startTime < data.startTime ||
        result.endTime < result.startTime ||
        result.endTime > measuredEnd ||
        summary.exitCode !== 0 ||
        summary.report !== rawName ||
        data.success !== true ||
        !Array.isArray(data.testResults) ||
        data.testResults.length !== 1 ||
        result.status !== "passed" ||
        typeof result.name !== "string" ||
        !(
          result.name === summary.suite ||
          result.name.endsWith(`/${summary.suite}`)
        ) ||
        !Array.isArray(assertions) ||
        count < suiteCount ||
        assertions.some(
          (test) =>
            test.status !== "passed" ||
            typeof test.fullName !== "string" ||
            test.fullName.trim() === "",
        ) ||
        new Set(assertions.map((test) => test.fullName)).size !== count ||
        data.numTotalTests !== count ||
        data.numPassedTests !== count ||
        data.numFailedTests !== 0 ||
        data.numPendingTests !== 0 ||
        data.numTodoTests !== 0 ||
        summary.executedTests !== count ||
        summary.passedTests !== count ||
        summary.failedTests !== 0 ||
        summary.skippedTests !== 0
      )
        fail(
          "live execution/suite/assertion counts disagree or are incomplete",
        );
    }
  } catch {
    fail("raw report is unparsable");
  }
  return failures;
}

async function git(args) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: root });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

// Coverage identity belongs to the measurement, never the bundle writer.
// Retain raw bytes so both the measurement digest and parsed report digest
// can be independently recomputed after the envelope is transferred.
function coverageMeasurementFailures(
  envelope,
  candidate = null,
  originalRun = null,
  collectedAt = null,
) {
  const proof = envelope?.measurement_provenance;
  const failures = [];
  const fail = (detail) => failures.push(`coverage measurement ${detail}`);
  if (!coverageDenominatorsValid(envelope?.report?.total))
    fail("denominators invalid or empty");
  if (
    envelope?.format !== "cvg-coverage-summary/v1" ||
    !/^[a-f0-9]{40}$/u.test(envelope.sha ?? "") ||
    proof?.format !== "cvg-coverage-provenance/v1" ||
    proof.status !== "PASS" ||
    proof.sha !== envelope.sha ||
    proof.measured_head !== proof.sha ||
    proof.runner !== "github-actions" ||
    proof.checkout?.before !== true ||
    proof.checkout?.after !== true ||
    proof.generatedAt !== envelope.generatedAt ||
    proof.measurement?.command !== "vitest run --coverage" ||
    proof.measurement.exitCode !== 0 ||
    proof.measurement.completedAt !== envelope.generatedAt ||
    !Number.isFinite(Date.parse(proof.measurement.startedAt)) ||
    !Number.isFinite(Date.parse(proof.measurement.completedAt)) ||
    Date.parse(proof.measurement.startedAt) >
      Date.parse(proof.measurement.completedAt) ||
    Date.parse(proof.measurement.completedAt) > Date.now() ||
    !/^[a-f0-9]{64}$/u.test(proof.raw_sha256 ?? "") ||
    !/^[a-f0-9]{64}$/u.test(proof.report_sha256 ?? "")
  )
    fail("identity/run provenance is invalid");
  try {
    if (
      typeof envelope.raw_report !== "string" ||
      sha256Hex(envelope.raw_report) !== proof?.raw_sha256 ||
      sha256Hex(JSON.stringify(envelope.report)) !== proof?.report_sha256 ||
      JSON.stringify(JSON.parse(envelope.raw_report)) !==
        JSON.stringify(envelope.report) ||
      JSON.stringify(envelope.total) !== JSON.stringify(envelope.report?.total)
    )
      fail("raw/report digest or totals disagree");
  } catch {
    fail("raw report is unparsable");
  }
  const identityConflict = (value) => {
    if (value === null || typeof value !== "object") return false;
    return Object.entries(value).some(
      ([key, entry]) =>
        (["sha", "candidate_sha", "evidence_sha"].includes(key) &&
          entry !== envelope.sha) ||
        (key === "generatedAt" && entry !== envelope.generatedAt) ||
        (key === "format" && entry === "cvg-coverage-summary/v1") ||
        identityConflict(entry),
    );
  };
  if (identityConflict(envelope?.report))
    fail("nested report identity conflicts");
  const ci = proof?.ci;
  const ciValid =
    Number.isSafeInteger(ci?.run_id) &&
    ci.run_id > 0 &&
    Number.isSafeInteger(ci?.run_attempt) &&
    ci.run_attempt > 0 &&
    typeof ci.workflow_ref === "string" &&
    ci.repository === "ricardoakinaga-dev/cvg-trainee-vet" &&
    ci.executing_head === envelope.sha &&
    typeof ci.ref === "string" &&
    /^refs\/(heads|tags|pull)\/.+/u.test(ci.ref) &&
    ci.workflow_ref ===
      `${ci.repository}/.github/workflows/candidate.yml@${ci.ref}`;
  if (!ciValid) fail("producer CI identity is invalid");
  if (
    candidate !== null &&
    (ci?.run_id !== candidate.run_id ||
      ci?.run_attempt !== candidate.run_attempt ||
      candidate.sha !== envelope.sha ||
      candidate.workflow_path !== ".github/workflows/candidate.yml" ||
      candidate.repository !== ci?.repository ||
      candidate.workflow_ref !== ci?.workflow_ref ||
      candidate.ref !== ci?.ref ||
      originalRun?.workflowRef !== ci?.workflow_ref ||
      originalRun?.ref !== ci?.ref ||
      originalRun?.repository !== ci?.repository ||
      originalRun?.headSha !== ci?.executing_head ||
      !runMeasurementValid(
        {
          ...proof,
          measurement: {
            ...proof?.measurement,
            status: "VERIFIED",
            checkout: proof?.checkout,
          },
        },
        originalRun,
        collectedAt,
      ))
  )
    fail(
      "producer differs from authenticated candidate SHA/run/attempt/workflow",
    );
  return failures;
}

async function envelopCoverage(source, commit, proofSource) {
  const raw = await readFile(source, "utf8").catch(() => {
    throw new Error(`summary source unreadable: ${source}`);
  });
  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    throw new Error(`coverage source unparsable: ${source}`);
  }
  let envelope;
  if (report.format === "cvg-coverage-summary/v1") envelope = report;
  else {
    if (
      ["sha", "format", "status", "generatedAt", "measurement_provenance"].some(
        (key) => Object.hasOwn(report, key),
      )
    )
      throw new Error("coverage source has an unrecognized identity envelope");
    if (typeof proofSource !== "string")
      throw new Error("raw coverage requires measured-run provenance");
    const proof = await readJsonFile(proofSource).catch(() => null);
    envelope = {
      format: "cvg-coverage-summary/v1",
      sha: proof?.sha,
      generatedAt: proof?.generatedAt,
      status: proof?.status,
      total: report.total,
      report,
      raw_report: raw,
      measurement_provenance: proof,
    };
  }
  const failures = coverageMeasurementFailures(envelope);
  if (failures.length) throw new Error(failures.join("; "));
  const fresh = await isEvidenceFresh(root, envelope.sha, commit);
  if (!fresh.fresh)
    throw new Error(`coverage measured SHA is not fresh: ${fresh.detail}`);
  const total = envelope.report.total ?? {};
  const pct = (key) => total[key]?.pct ?? null;
  // Floors from the gate config (matrix G06–G09); missing config fails
  // the envelope rather than defaulting (fail-closed).
  const gates = await loadGateConfig().catch(() => null);
  if (gates === null)
    throw new Error("gate config missing: config/triple-aaa-gates.json");
  const floors = {
    statements: gates.coverage.statements_min,
    branches: gates.coverage.branches_min,
    functions: gates.coverage.functions_min,
    lines: gates.coverage.lines_min,
  };
  const meets = Object.entries(floors).every(
    ([key, floor]) => typeof pct(key) === "number" && pct(key) >= floor,
  );
  if (!meets || envelope.status !== "PASS")
    throw new Error(
      "coverage measurement is below configured floors or failed",
    );
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

async function migrationHead() {
  const journal = JSON.parse(
    await readFile(
      join(root, "packages/persistence/drizzle/meta/_journal.json"),
      "utf8",
    ),
  );
  const entries = journal.entries ?? [];
  return entries.length > 0 ? entries[entries.length - 1].tag : "unknown";
}

async function digestTree() {
  return (await sourceInventory(root)).treeDigest;
}

async function toolVersions() {
  const declared = JSON.parse(
    await readFile(join(root, "package.json"), "utf8").catch(() => "{}"),
  ).devDependencies;
  const pick = (name) =>
    typeof declared?.[name] === "string" ? declared[name] : "unknown";
  const pnpmVersion = await execFileAsync("pnpm", ["--version"])
    .then(({ stdout }) => stdout.trim())
    .catch(() => "unknown");
  return {
    node: process.version,
    pnpm: pnpmVersion,
    typescript: pick("typescript"),
    vitest: pick("vitest"),
    eslint: pick("eslint"),
    playwright: pick("@playwright/test"),
    drizzleKit: pick("drizzle-kit"),
  };
}

async function workspaceManifestDigests() {
  const manifests = ["package.json"];
  for (const scope of ["apps", "packages"]) {
    const entries = await readdir(join(root, scope), {
      withFileTypes: true,
    }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory())
        manifests.push(join(scope, entry.name, "package.json"));
    }
  }
  const digests = {};
  for (const manifest of manifests.sort()) {
    const content = await readFile(join(root, manifest), "utf8").catch(
      () => null,
    );
    if (content !== null) digests[manifest] = sha256Hex(content);
  }
  return digests;
}

export function flagValue(name) {
  const equals = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (equals !== undefined) return equals.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const next = process.argv[index + 1];
  // A bare flag at the end (or followed by another flag) has no value.
  if (next === undefined || next.startsWith("--")) return null;
  return next;
}

function readJsonFile(path) {
  return readFile(path, "utf8").then((text) => JSON.parse(text));
}

export function validateSbom(sbom) {
  const failures = [];
  if (sbom === null || typeof sbom !== "object") {
    return ["sbom is not a JSON object"];
  }
  if (sbom.bomFormat !== "CycloneDX") {
    failures.push(
      `sbom bomFormat is ${String(sbom.bomFormat)}, expected CycloneDX`,
    );
  }
  if (typeof sbom.specVersion !== "string" || sbom.specVersion.length === 0) {
    failures.push("sbom specVersion is missing");
  }
  if (!Array.isArray(sbom.components) || sbom.components.length === 0) {
    failures.push("sbom has no components");
  }
  if (sbom.metadata === undefined || typeof sbom.metadata !== "object") {
    failures.push("sbom metadata is missing");
  }
  return failures;
}

// The manifest pins the digest index; the index pins every payload. The
// index never hashes itself, and the manifest is the validation root.
export async function validateArtifactDigests(
  directory,
  manifest,
  digests,
  derivedArtifacts = [],
) {
  const failures = [];
  const entries = manifest?.artifacts;
  if (
    !Array.isArray(entries) ||
    digests === null ||
    typeof digests !== "object" ||
    Array.isArray(digests)
  )
    return ["artifact digest inventory is malformed"];
  const required = [
    ...BUNDLE_FILES,
    ...SUMMARY_FILES,
    ...Object.values(NATIVE_RAW_FILES),
    "sbom.cyclonedx.json",
  ].filter((file) => file !== "manifest.json");
  const listed = new Map();
  const hashPattern = /^[a-f0-9]{64}$/u;
  const safePath = (file) =>
    typeof file === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(file);
  for (const entry of entries) {
    if (
      !safePath(entry?.path) ||
      listed.has(entry.path) ||
      entry.path === "manifest.json" ||
      !hashPattern.test(entry.sha256 ?? "")
    ) {
      failures.push(
        "manifest contains invalid, duplicate or unhashed artifact",
      );
      continue;
    }
    listed.set(entry.path, entry.sha256);
  }
  for (const file of required) {
    if (!listed.has(file)) failures.push(`manifest digest missing: ${file}`);
    if (file !== "artifact-digests.json" && !Object.hasOwn(digests, file))
      failures.push(`artifact digest missing: ${file}`);
  }
  for (const [file, expected] of Object.entries(digests)) {
    if (
      !safePath(file) ||
      file === "artifact-digests.json" ||
      !listed.has(file) ||
      !hashPattern.test(expected)
    )
      failures.push(`invalid artifact digest: ${file}`);
  }
  // Check manifest hashes independently, including the digest index bytes.
  for (const [file, expected] of listed) {
    if (file !== "artifact-digests.json" && digests[file] !== expected)
      failures.push(`digest inventories disagree: ${file}`);
    const actual = await lstat(join(directory, file))
      .then(async (stat) =>
        stat.isFile() ? sha256Hex(await readFile(join(directory, file))) : null,
      )
      .catch(() => null);
    if (actual !== expected) failures.push(`manifest digest mismatch: ${file}`);
  }
  // Computed verdicts are outputs, never inputs to certification. External
  // audit/review inputs supplied explicitly by a verifier have separate
  // validation; all remaining bundle bytes must belong to its inventory.
  const derived = new Set([
    "triple-aaa-verdict.json",
    ...derivedArtifacts
      .filter((path) => dirname(resolve(path)) === resolve(directory))
      .map((path) => basename(path)),
  ]);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "manifest.json" || listed.has(entry.name)) continue;
    if (!derived.has(entry.name) || !entry.isFile())
      failures.push(`unlisted artifact: ${entry.name}`);
  }
  return failures;
}

function summaryComplete(file, parsed, gates, phase, executingRun) {
  const formats = {
    "coverage-summary.json": "cvg-coverage-summary/v1",
    "test-summary.json": "cvg-test-summary/v1",
    "security-summary.json": "cvg-security-summary/v2",
    "rls-live-summary.json": "cvg-rls-live-summary/v1",
    "multi-instance-summary.json": "cvg-multi-instance-summary/v1",
    "load-summary.json": "cvg-load-summary/v1",
    "otel-summary.json": "cvg-otel-summary/v1",
    "mutation-summary.json": "cvg-mutation-summary/v1",
    "redis-candidate-summary.json": "cvg-redis-candidate-summary/v2",
    "staging-summary.json": "cvg-staging-summary/v1",
    "restore-summary.json": "cvg-restore-summary/v2",
    "remote-ci-summary.json": "cvg-remote-ci-summary/v2",
  };
  if (parsed.format !== formats[file]) return false;
  const positive = (value) => Number.isSafeInteger(value) && value > 0;
  const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0;
  const passes = (fields) => fields.every((field) => parsed[field] === "PASS");
  switch (file) {
    case "test-summary.json": {
      const tests = parsed.tests;
      return (
        parsed.format === "cvg-test-summary/v1" &&
        tests !== null &&
        typeof tests === "object" &&
        positive(tests.files) &&
        positive(tests.passed) &&
        nonnegative(tests.skipped) &&
        tests.failed === 0 &&
        typeof tests.source === "string" &&
        tests.source.trim().length > 0
      );
    }
    case "otel-summary.json":
      return positive(parsed.bytes) && positive(parsed.distinctTraces);
    case "multi-instance-summary.json":
      return typeof parsed.suite === "string" && parsed.suite.trim().length > 0;
    case "load-summary.json":
      return parsed.failed_checks === 0 && parsed.http_5xx === 0;
    case "coverage-summary.json": {
      const total = parsed.report?.total ?? parsed.total;
      return (
        gates !== null &&
        coverageDenominatorsValid(total) &&
        ["statements", "branches", "functions", "lines"].every(
          (key) =>
            Number.isFinite(total?.[key]?.pct) &&
            total[key].pct >= gates.coverage[`${key}_min`] &&
            total[key].pct <= 100,
        )
      );
    }
    case "security-summary.json":
      return (
        parsed.audit === "pnpm audit --audit-level=high PASS" &&
        parsed.audit_result?.status === "PASS" &&
        parsed.audit_result.parsed === true &&
        parsed.audit_result.command === "pnpm audit --audit-level=high" &&
        parsed.audit_result.high === parsed.residual?.high &&
        parsed.audit_result.critical === parsed.residual?.critical &&
        ["low", "moderate", "high", "critical"].every((key) =>
          nonnegative(parsed.residual?.[key]),
        ) &&
        parsed.residual.high === 0 &&
        parsed.residual.critical === 0 &&
        passes(["secret_scan", "codeql", "osv"]) &&
        ["PASS", "not-applicable"].includes(parsed.dependency_review)
      );
    case "rls-live-summary.json":
      return (
        parsed.failed === 0 &&
        [
          "cross_scope_read_denied",
          "cross_scope_write_denied",
          "anonymous_denied",
          "service_identity_constrained",
          "pool_context_isolated",
          "force_rls_verified",
          "bypassrls_absent",
          "superuser_absent",
        ].every((field) => parsed[field] === true)
      );
    case "redis-candidate-summary.json":
      return (
        ["redis", "valkey"].includes(parsed.backend) &&
        positive(parsed.api_instances) &&
        parsed.api_instances >= 2 &&
        passes([
          "shared_budget",
          "atomicity",
          "timeout",
          "restart",
          "reconnect",
          "trusted_proxy",
          "spoof_rejection",
          "critical_fail_closed",
        ])
      );
    case "staging-summary.json":
      return (
        positive(parsed.api_instances) &&
        parsed.api_instances >= 2 &&
        passes([
          "postgres",
          "redis",
          "worker",
          "qdrant",
          "web",
          "tls",
          "otel_collector",
          "browser_journey",
          "fault_drills",
        ])
      );
    case "restore-summary.json":
      return isRestoreSummaryV2(parsed);
    case "remote-ci-summary.json":
      return (
        parsed.phase === phase &&
        parsed.authenticated === true &&
        (phase === "promotion"
          ? parsed.promotion_verified === true
          : parsed.promotion_verified === false) &&
        ["quality", "security", "candidate"].every((key) => {
          const run = parsed[key];
          return (
            run !== null &&
            typeof run === "object" &&
            positive(run.run_id) &&
            positive(run.run_attempt) &&
            run.workflow_path === `.github/workflows/${key}.yml` &&
            run.sha === parsed.sha &&
            (key === "candidate" && phase === "preflight"
              ? run.status === "pending" &&
                run.execution_status === "in_progress" &&
                run.conclusion === null &&
                run.run_id === executingRun?.runId &&
                run.run_attempt === executingRun?.runAttempt &&
                run.workflow_path === executingRun?.workflowPath &&
                run.sha === executingRun?.headSha
              : run.status === "PASS" &&
                run.execution_status === "completed" &&
                run.conclusion === "success")
          );
        }) &&
        parsed.all_same_sha === true
      );
    default:
      return true; // Mutation has its complete provenance contract below.
  }
}

export async function validateBundle(directory, options = {}) {
  const strict = options.strict === true;
  const expectedHead = options.head ?? null;
  const syntheticFixtureMode = options.syntheticFixtureMode === true;
  const expectedMutationRunId = syntheticFixtureMode
    ? (options.expectedMutationRunId ?? null)
    : (process.env.CVG_MUTATION_CANDIDATE_ID?.trim() ?? null);
  const failures = [];
  const phase = options.phase ?? "promotion";
  let executingRun = null;
  if (strict && !["preflight", "promotion"].includes(phase))
    failures.push("strict validation phase is invalid");
  if (strict) {
    try {
      executingRun = executingCandidateIdentity(
        expectedHead,
        process.env,
        phase,
      );
    } catch (error) {
      failures.push(error.message);
    }
  }
  const manifest = await readJsonFile(join(directory, "manifest.json")).catch(
    () => null,
  );
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    !Array.isArray(manifest.artifacts) ||
    manifest.artifacts.some(
      (entry) =>
        entry === null ||
        typeof entry !== "object" ||
        typeof entry.path !== "string",
    )
  )
    return ["manifest.json is missing or unparsable"];
  for (const file of [
    ...BUNDLE_FILES,
    ...SUMMARY_FILES,
    "sbom.cyclonedx.json",
  ]) {
    if (file === "manifest.json") continue;
    const listed = (manifest.artifacts ?? []).some(
      (entry) => entry.path === file,
    );
    if (!listed) {
      failures.push(`manifest does not list ${file}`);
    }
  }
  const sha = await readFile(join(directory, "git-sha.txt"), "utf8")
    .then((text) => text.trim())
    .catch(() => "");
  if (!/^[0-9a-f]{40}$/u.test(sha)) {
    failures.push("git-sha.txt is not a full commit SHA");
  } else if (manifest.commit !== sha) {
    failures.push("manifest commit does not match git-sha.txt");
  }
  const digests = await readJsonFile(
    join(directory, "artifact-digests.json"),
  ).catch(() => null);
  if (digests === null || typeof digests !== "object") {
    failures.push("artifact-digests.json is missing or unparsable");
  } else if (!strict) {
    for (const [file, expected] of Object.entries(digests)) {
      const actual = await readFile(join(directory, file), "utf8")
        .then((text) => sha256Hex(text))
        .catch(() => null);
      if (actual === null) {
        failures.push(`digested artifact missing: ${file}`);
      } else if (actual !== expected) {
        failures.push(`digest mismatch: ${file}`);
      }
    }
  }
  const sbomEntry = manifest.artifacts.find(
    (entry) => entry.path === "sbom.cyclonedx.json",
  );
  const sbomStatus =
    sbomEntry?.status ?? (sbomEntry?.sha256 ? "present" : undefined);
  if (sbomStatus === "present") {
    const sbom = await readJsonFile(
      join(directory, "sbom.cyclonedx.json"),
    ).catch(() => null);
    if (sbom === null) {
      failures.push("sbom.cyclonedx.json listed present but unreadable");
    } else {
      failures.push(...validateSbom(sbom).map((finding) => `sbom: ${finding}`));
    }
  } else if (sbomStatus !== "missing-blocked") {
    failures.push("sbom status must be present or missing-blocked");
  }
  if (strict) {
    failures.push(
      ...(await validateArtifactDigests(
        directory,
        manifest,
        digests,
        options.derivedArtifacts,
      )),
    );
    if (manifest.format !== "cvg-release-evidence/v1")
      failures.push("manifest format is invalid");
    const provenance = await readJsonFile(
      join(directory, "provenance.json"),
    ).catch(() => null);
    try {
      const measured = await sourceInventory(root);
      for (const key of Object.keys(measured)) {
        if (JSON.stringify(provenance?.[key]) !== JSON.stringify(measured[key]))
          failures.push(
            `release provenance ${key} differs from authoritative checkout inventory`,
          );
      }
      const tools = await toolVersions();
      if (JSON.stringify(provenance?.tools) !== JSON.stringify(tools))
        failures.push(
          "release provenance tools differ from measured tool declarations",
        );
    } catch (error) {
      failures.push(
        `release provenance inventory unavailable: ${error.message}`,
      );
    }
    const migration = await readFile(
      join(directory, "migration-head.txt"),
      "utf8",
    )
      .then((text) => text.trim())
      .catch(() => null);
    if (
      provenance?.format !== "cvg-release-provenance/v1" ||
      provenance.commit !== sha ||
      typeof provenance.branch !== "string" ||
      provenance.branch.trim().length === 0 ||
      !Number.isFinite(Date.parse(provenance.buildTimestamp)) ||
      !/^[a-f0-9]{64}$/u.test(provenance.lockfileSha256 ?? "") ||
      !/^[a-f0-9]{64}$/u.test(provenance.treeDigest ?? "") ||
      provenance.migrationHead !== migration ||
      migration === "unknown" ||
      !Number.isSafeInteger(provenance.migrationFiles) ||
      provenance.migrationFiles < 0 ||
      [
        "node",
        "pnpm",
        "typescript",
        "vitest",
        "eslint",
        "playwright",
        "drizzleKit",
      ].some(
        (key) =>
          typeof provenance.tools?.[key] !== "string" ||
          provenance.tools[key] === "unknown" ||
          provenance.tools[key].trim().length === 0,
      ) ||
      !provenance.workspaceManifests ||
      !Object.hasOwn(provenance.workspaceManifests, "package.json") ||
      Object.values(provenance.workspaceManifests).some(
        (hash) => !/^[a-f0-9]{64}$/u.test(hash),
      ) ||
      !Number.isSafeInteger(Number(provenance.ci?.runId)) ||
      Number(provenance.ci?.runId) <= 0 ||
      !Number.isSafeInteger(Number(provenance.ci?.runAttempt)) ||
      Number(provenance.ci?.runAttempt) <= 0 ||
      !provenance.ci?.workflowRef?.startsWith(
        "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@",
      )
    )
      failures.push(
        "release provenance identity/fields are incomplete or invalid",
      );
    const remote = await readJsonFile(
      join(directory, "remote-ci-summary.json"),
    ).catch(() => null);
    if (remote?.sha !== expectedHead)
      failures.push("remote CI SHA differs from strict candidate HEAD");
    if (
      phase === "promotion" &&
      remote?.candidate?.run_id === executingRun?.runId
    )
      failures.push(
        "final promotion requires an independent completed producer run",
      );
    const ciRuns = await readJsonFile(join(directory, "ci-runs.json")).catch(
      () => null,
    );
    const producer = ciRuns?.runs?.find((run) => run.workflow === "candidate");
    const timestamp = Date.parse(provenance?.buildTimestamp);
    if (
      !producer ||
      Number(provenance?.ci?.runId) !== producer.id ||
      Number(provenance?.ci?.runAttempt) !== producer.runAttempt ||
      provenance?.ci?.workflowSha !== producer.headSha ||
      provenance?.ci?.workflowRef !== producer.workflowRef ||
      timestamp < Date.parse(producer.runStartedAt) ||
      timestamp >
        (phase === "preflight" ? Date.now() : Date.parse(producer.updatedAt))
    )
      failures.push(
        "release provenance differs from original producing workflow/run/attempt/chronology",
      );
    if (Array.isArray(ciRuns?.runs)) {
      const decision = evaluateSameSha(expectedHead, ciRuns.runs, {
        requireCandidate: true,
        phase,
        executingRun,
        selfCandidateRunId: phase === "preflight" ? executingRun?.runId : null,
      });
      if (!decision.ok)
        failures.push(
          `ci-runs original execution decision failed: ${decision.reason}`,
        );
    }
    if (
      ciRuns?.format !== "cvg-ci-runs/v1" ||
      ciRuns.authenticated !== true ||
      !Number.isFinite(Date.parse(ciRuns.collectedAt)) ||
      Date.parse(ciRuns.collectedAt) > Date.now() ||
      ciRuns.headSha !== sha ||
      ciRuns.evaluation?.ok !== true ||
      ciRuns.evaluation.phase !== phase ||
      !Array.isArray(ciRuns.runs) ||
      ciRuns.runs.length !== 3 ||
      ["quality", "security", "candidate"].some((workflow) => {
        const runs =
          ciRuns?.runs?.filter((run) => run.workflow === workflow) ?? [];
        const run = runs[0];
        const normalized = remote?.[workflow];
        return (
          runs.length !== 1 ||
          !normalized ||
          run.id !== normalized.run_id ||
          run.runAttempt !== normalized.run_attempt ||
          run.workflowPath !== normalized.workflow_path ||
          run.headSha !== normalized.sha ||
          run.status !== normalized.execution_status ||
          run.conclusion !== normalized.conclusion ||
          run.repository !== "ricardoakinaga-dev/cvg-trainee-vet" ||
          typeof run.ref !== "string" ||
          !/^refs\/(heads|tags|pull)\/.+/u.test(run.ref) ||
          run.workflowRef !==
            `${run.repository}/${run.workflowPath}@${run.ref}` ||
          ![run.createdAt, run.runStartedAt, run.updatedAt].every((value) =>
            Number.isFinite(Date.parse(value)),
          ) ||
          Date.parse(run.createdAt) > Date.parse(run.runStartedAt) ||
          Date.parse(run.runStartedAt) > Date.parse(run.updatedAt) ||
          Date.parse(run.updatedAt) > Date.parse(ciRuns.collectedAt) ||
          run.repository !== normalized.repository ||
          run.workflowRef !== normalized.workflow_ref ||
          run.ref !== normalized.ref ||
          run.createdAt !== normalized.created_at ||
          run.runStartedAt !== normalized.run_started_at ||
          run.updatedAt !== normalized.updated_at
        );
      })
    )
      failures.push(
        "ci-runs authenticated identity/phase differs from remote summary",
      );
    const summaryGates = await loadGateConfig().catch(() => null);
    let producerTransportVerified =
      syntheticFixtureMode || phase !== "promotion";
    if (!syntheticFixtureMode && phase === "promotion") {
      try {
        const names = Object.keys(digests ?? {}).filter(
          (name) => !["remote-ci-summary.json", "ci-runs.json"].includes(name),
        );
        await authenticatedArtifactProof({
          sha: expectedHead,
          runId: remote?.candidate?.run_id,
          runAttempt: remote?.candidate?.run_attempt,
          runs: ciRuns?.runs ?? [],
          files: [
            ...names.map((name) => ({
              path: join(directory, name),
              archivePath: `release-evidence/${name}`,
            })),
            ...(options.trustedClaims ?? []),
          ],
        });
        producerTransportVerified = true;
      } catch (error) {
        failures.push(
          `remote execution trust root unavailable: ${error.message}`,
        );
      }
    }
    if (
      typeof expectedMutationRunId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u.test(expectedMutationRunId)
    ) {
      failures.push("strict validation requires the current mutation run id");
    }
    // AAA-CERT-004 §35 + shared freshness rule: final promotion admits no
    // stale or placeholder evidence. Every summary must be present, parse,
    // PASS (where the format defines a status) and satisfy isEvidenceFresh
    // against the validated HEAD (exact match, or ancestor with docs-only
    // diff — docs-only commits never invalidate runtime evidence).
    if (expectedHead === null || !/^[0-9a-f]{40}$/u.test(expectedHead)) {
      failures.push("strict validation requires a full HEAD sha");
    } else {
      const topLevel = await git(["rev-parse", "--show-toplevel"]);
      const bundleRoot = topLevel === "unknown" ? root : topLevel;
      {
        const headFresh = await isEvidenceFresh(
          bundleRoot,
          sha,
          expectedHead,
        ).catch(() => ({ fresh: false, detail: "freshness check failed" }));
        if (!headFresh.fresh) {
          failures.push(`git-sha.txt not fresh: ${headFresh.detail}`);
        }
      }
      for (const file of SUMMARY_FILES) {
        const parsed = await readJsonFile(join(directory, file)).catch(
          () => null,
        );
        if (
          parsed === null ||
          typeof parsed !== "object" ||
          Array.isArray(parsed)
        ) {
          failures.push(`${file} is missing or unparsable`);
          continue;
        }
        if (parsed.status === "missing-blocked") {
          failures.push(`${file} is missing-blocked`);
          continue;
        }
        if (parsed.status !== "PASS") {
          failures.push(`${file} status is ${String(parsed.status)}`);
        }
        if (!summaryComplete(file, parsed, summaryGates, phase, executingRun))
          failures.push(
            `${file} required summary fields are incomplete or invalid`,
          );
        if (
          ["test-summary.json", "rls-live-summary.json"].includes(file) &&
          !producerTransportVerified
        ) {
          // A refused promotion cannot gain validation by collecting an
          // unauthenticated packet's tests. Keep this boundary NOT_EVALUATED.
          failures.push(
            `${file} authoritative inventory not evaluated: remote execution trust root unavailable`,
          );
        } else if (
          ["test-summary.json", "rls-live-summary.json"].includes(file)
        ) {
          try {
            const inventory =
              file === "rls-live-summary.json"
                ? [RLS_SUITE]
                : syntheticFixtureMode && options.testInventory
                  ? options.testInventory
                  : await selectedTestInventory(bundleRoot);
            const assertions = syntheticFixtureMode
              ? syntheticSelectedAssertions(inventory)
              : await selectedAssertionInventory(
                  bundleRoot,
                  file === "rls-live-summary.json"
                    ? { filters: [RLS_SUITE] }
                    : {},
                );
            failures.push(
              ...(
                await testExecutionFailures(
                  directory,
                  parsed,
                  ciRuns?.runs?.find((run) => run.workflow === "candidate"),
                  ciRuns?.collectedAt,
                  inventory,
                  assertions,
                )
              ).map((failure) => `${file}: ${failure}`),
            );
          } catch (error) {
            failures.push(
              `${file} authoritative inventory unavailable: ${error.message}`,
            );
          }
        }
        if (file === "security-summary.json")
          failures.push(
            ...(await securityExecutionFailures(
              directory,
              parsed,
              ciRuns?.runs?.find((run) => run.workflow === "candidate"),
              ciRuns?.runs?.find((run) => run.workflow === "security"),
              ciRuns?.collectedAt,
            )),
          );
        if (file === "coverage-summary.json") {
          const remote = await readJsonFile(
            join(directory, "remote-ci-summary.json"),
          ).catch(() => null);
          failures.push(
            ...coverageMeasurementFailures(
              parsed,
              remote?.candidate ?? {},
              ciRuns?.runs?.find((run) => run.workflow === "candidate"),
              ciRuns?.collectedAt,
            ),
          );
        }
        if (
          Object.hasOwn(NATIVE_RAW_FILES, file) ||
          file === "staging-summary.json"
        ) {
          failures.push(
            ...(await nativeMeasurementFailures(
              directory,
              file,
              parsed,
              ciRuns?.runs?.find((run) => run.workflow === "candidate"),
              ciRuns?.collectedAt,
            )),
          );
        }
        {
          const fresh = await isEvidenceFresh(
            bundleRoot,
            parsed.sha,
            expectedHead,
          ).catch(() => ({ fresh: false, detail: "freshness check failed" }));
          if (!fresh.fresh) {
            failures.push(`${file} not fresh: ${fresh.detail}`);
          }
        }
      }
      const mutation = await readJsonFile(
        join(directory, "mutation-summary.json"),
      ).catch(() => null);
      // Mutation floor from the gate config (matrix G10–G11).
      const strictGates = await loadGateConfig().catch(() => null);
      if (strictGates === null) {
        failures.push("gate config missing: config/triple-aaa-gates.json");
      }
      if (mutation !== null) {
        if (
          strictGates === null ||
          typeof mutation.adjusted_score !== "number" ||
          mutation.adjusted_score < strictGates.mutation.adjusted_critical_min
        ) {
          failures.push(
            `mutation adjusted score < ${strictGates?.mutation.adjusted_critical_min ?? "?"}`,
          );
        }
        if (
          strictGates === null ||
          typeof mutation.critical_real_survivors !== "number" ||
          mutation.critical_real_survivors >
            strictGates.mutation.real_critical_survivors_max
        ) {
          failures.push("mutation critical real survivors above gate maximum");
        }
        if (mutation.candidate_sha !== expectedHead) {
          failures.push("mutation candidate SHA does not match strict HEAD");
        }
        if (
          typeof expectedMutationRunId === "string" &&
          mutation.candidate_run_id !== expectedMutationRunId
        ) {
          failures.push(
            "mutation candidate run id differs from this workflow run",
          );
        }
        if (
          !/^[a-f0-9]{64}$/u.test(mutation.manifest_sha256 ?? "") ||
          mutation.manifest_path !==
            `reports/mutation-bounded/${mutation.candidate_run_id}/manifest.json`
        ) {
          failures.push(
            "mutation bounded manifest identity is missing or malformed",
          );
        }
        if (!syntheticFixtureMode) {
          try {
            await validateCurrentMutationSummary(mutation, {
              repositoryRoot: bundleRoot,
              expectedRunId: expectedMutationRunId,
              expectedSha: expectedHead,
              requireExpectedRunId: true,
            });
          } catch (error) {
            failures.push(
              `current mutation provenance invalid: ${error.message}`,
            );
          }
        }
        const expectedMutationReports = [
          ["authorization", "reports/mutation/mutation.json"],
          ["critical", "reports/mutation-critical/mutation.json"],
          ["worker", "reports/mutation-worker/mutation.json"],
        ];
        if (
          !Array.isArray(mutation.reports) ||
          mutation.reports.length !== expectedMutationReports.length ||
          expectedMutationReports.some(([scope, path]) => {
            const report = mutation.reports.find(
              (item) => item.scope === scope,
            );
            return (
              report?.path !== path ||
              !/^[a-f0-9]{64}$/u.test(report.sha256 ?? "")
            );
          })
        ) {
          failures.push(
            "mutation report digest inventory is missing or malformed",
          );
        }
        const expectedClosures = [
          [
            "authorization",
            `reports/mutation-bounded/${mutation.candidate_run_id}/authorization-closure.json`,
          ],
          [
            "critical-worker",
            `reports/mutation-bounded/${mutation.candidate_run_id}/critical-worker-closure.json`,
          ],
        ];
        if (
          !Array.isArray(mutation.closure_results) ||
          mutation.closure_results.length !== expectedClosures.length ||
          expectedClosures.some(([group, path]) => {
            const result = mutation.closure_results.find(
              (item) => item.group === group,
            );
            return (
              result?.path !== path ||
              !/^[a-f0-9]{64}$/u.test(result.sha256 ?? "") ||
              result.status !== "KILLED"
            );
          })
        ) {
          failures.push(
            "mutation closure result inventory is missing or malformed",
          );
        }
      }
      const redis = await readJsonFile(
        join(directory, "redis-candidate-summary.json"),
      ).catch(() => null);
      if (
        redis !== null &&
        redis.backend !== "redis" &&
        redis.backend !== "valkey"
      ) {
        failures.push("redis candidate backend is not durable");
      }
    }
  }
  return failures;
}

async function generate(outDir, options) {
  await mkdir(outDir, { recursive: true });
  const commit = await git(["rev-parse", "HEAD"]);
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const lockfile = await readFile(join(root, "pnpm-lock.yaml"), "utf8").catch(
    () => "",
  );
  const files = await readdir(join(root, "packages/persistence/drizzle")).catch(
    () => [],
  );
  const provenance = {
    format: "cvg-release-provenance/v1",
    commit,
    branch,
    buildTimestamp: new Date().toISOString(),
    tools: await toolVersions(),
    lockfileSha256: lockfile === "" ? "unknown" : sha256Hex(lockfile),
    workspaceManifests: await workspaceManifestDigests(),
    migrationHead: await migrationHead(),
    migrationFiles: files.filter((file) => file.endsWith(".sql")).length,
    treeDigest: await digestTree(),
    ci:
      process.env.GITHUB_RUN_ID === undefined
        ? { runner: "local" }
        : {
            runner: process.env.RUNNER_NAME ?? "github-hosted",
            os: process.env.RUNNER_OS ?? "unknown",
            runId: process.env.GITHUB_RUN_ID,
            runAttempt: process.env.GITHUB_RUN_ATTEMPT,
            workflowRef: process.env.GITHUB_WORKFLOW_REF,
            workflowSha: process.env.GITHUB_SHA,
            workflow: process.env.GITHUB_WORKFLOW ?? "unknown",
          },
  };
  Object.assign(provenance, await sourceInventory(root));
  if (options.producerProvenance) {
    const original = await readJsonFile(options.producerProvenance);
    if (
      original.commit !== commit ||
      original.format !== "cvg-release-provenance/v1"
    )
      throw new Error("original producer provenance identity differs");
    Object.assign(provenance, original);
  }

  const artifacts = [];
  const writeArtifact = async (name, content) => {
    await writeFile(join(outDir, name), content);
    artifacts.push({ path: name, sha256: sha256Hex(content) });
  };

  await writeArtifact("git-sha.txt", `${commit}\n`);
  await writeArtifact(
    "provenance.json",
    `${JSON.stringify(provenance, null, 2)}\n`,
  );
  await writeArtifact("migration-head.txt", `${provenance.migrationHead}\n`);

  for (const summary of SUMMARY_FILES) {
    const source = options.summaries[summary];
    if (source === null) {
      await writeArtifact(
        summary,
        `${JSON.stringify({ status: "missing-blocked", commit }, null, 2)}\n`,
      );
    } else if (summary === "coverage-summary.json") {
      await writeArtifact(
        summary,
        await envelopCoverage(source, commit, options.coverageProvenance),
      );
    } else {
      await writeArtifact(
        summary,
        await readFile(source, "utf8").catch(() => {
          throw new Error(`summary source unreadable: ${source}`);
        }),
      );
    }
  }
  for (const [summary, name] of Object.entries(NATIVE_RAW_FILES)) {
    if (options.summaries[summary] === null) continue;
    const source = options.nativeRaw?.[name];
    if (typeof source !== "string")
      throw new Error(`native raw source required: ${name}`);
    const content = await readFile(source).catch(() => {
      throw new Error(`native raw source unreadable: ${source}`);
    });
    await writeArtifact(name, content);
  }
  for (const summary of [
    "test-summary.json",
    "rls-live-summary.json",
    "security-summary.json",
  ]) {
    const source = options.summaries[summary];
    if (source === null) continue;
    const parsed = await readJsonFile(source);
    for (const descriptor of [
      parsed.rawReport,
      ...(summary === "security-summary.json" ? [] : [parsed.inventory]),
    ]) {
      if (
        !descriptor ||
        !/^[a-z0-9][a-z0-9.-]*\.json$/u.test(descriptor.path ?? "")
      )
        throw new Error(`mandatory raw report/inventory missing: ${summary}`);
      const content = await readFile(join(dirname(source), descriptor.path));
      if (sha256Hex(content) !== descriptor.sha256)
        throw new Error(`mandatory raw digest differs: ${summary}`);
      await writeArtifact(descriptor.path, content);
    }
  }

  if (options.sbom === null) {
    artifacts.push({ path: "sbom.cyclonedx.json", status: "missing-blocked" });
  } else {
    await copyFile(options.sbom, join(outDir, "sbom.cyclonedx.json"));
    const content = await readFile(join(outDir, "sbom.cyclonedx.json"), "utf8");
    const sbomFailures = validateSbom(JSON.parse(content));
    if (sbomFailures.length > 0) {
      throw new Error(`invalid SBOM: ${sbomFailures.join("; ")}`);
    }
    artifacts.push({ path: "sbom.cyclonedx.json", sha256: sha256Hex(content) });
  }

  if (options.ciRuns === null) {
    await writeArtifact(
      "ci-runs.json",
      `${JSON.stringify({ status: "missing-blocked", commit }, null, 2)}\n`,
    );
  } else {
    await writeArtifact(
      "ci-runs.json",
      await readFile(options.ciRuns, "utf8").catch(() => {
        throw new Error(`ci-runs source unreadable: ${options.ciRuns}`);
      }),
    );
  }

  const manifest = {
    format: "cvg-release-evidence/v1",
    commit,
    artifacts,
  };
  await writeFile(
    join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const digests = {};
  for (const entry of artifacts) {
    if (entry.sha256 !== undefined) digests[entry.path] = entry.sha256;
  }
  const digestsContent = `${JSON.stringify(digests, null, 2)}\n`;
  await writeFile(join(outDir, "artifact-digests.json"), digestsContent);
  manifest.artifacts.push({
    path: "artifact-digests.json",
    sha256: sha256Hex(digestsContent),
  });
  await writeFile(
    join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`release evidence written to ${outDir} at ${commit}`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const directory = await mkdtemp(join(tmpdir(), "cvg-evidence-"));
    try {
      await generate(directory, {
        sbom: null,
        ciRuns: null,
        summaries: {
          "coverage-summary.json": null,
          "test-summary.json": null,
          "security-summary.json": null,
          "rls-live-summary.json": null,
          "multi-instance-summary.json": null,
          "load-summary.json": null,
          "otel-summary.json": null,
          "mutation-summary.json": null,
          "redis-candidate-summary.json": null,
          "staging-summary.json": null,
          "restore-summary.json": null,
          "remote-ci-summary.json": null,
        },
      });
      const failures = await validateBundle(directory);
      if (failures.length > 0) {
        for (const failure of failures) console.error(`- ${failure}`);
        process.exitCode = 1;
        return;
      }
      console.log("release evidence self-test: generate + validate PASS");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
    return;
  }
  const checkDir = flagValue("--check");
  if (checkDir !== null) {
    const strictHead = flagValue("--strict");
    if (process.argv.includes("--strict") && strictHead === null)
      throw new Error("strict validation requires a full HEAD sha");
    const failures =
      strictHead === null
        ? await validateBundle(checkDir)
        : await validateBundle(checkDir, {
            strict: true,
            head: strictHead,
            phase: process.argv.includes("--preflight")
              ? "preflight"
              : "promotion",
          });
    if (failures.length > 0) {
      for (const failure of failures) console.error(`- ${failure}`);
      process.exitCode = 1;
      return;
    }
    console.log(`release evidence valid: ${checkDir}`);
    return;
  }
  const outDir = flagValue("--out-dir") ?? "release-evidence";
  await generate(outDir, {
    producerProvenance: flagValue("--producer-provenance"),
    nativeRaw: {
      "k6-summary.json": flagValue("--load-raw"),
      "otel-spans.json": flagValue("--otel-raw"),
      "ratelimit-live-results.json": flagValue("--multi-instance-report"),
    },
    coverageProvenance: flagValue("--coverage-provenance"),
    sbom: flagValue("--sbom"),
    ciRuns: flagValue("--ci-runs"),
    summaries: {
      "coverage-summary.json": flagValue("--coverage-summary"),
      "test-summary.json": flagValue("--test-summary"),
      "security-summary.json": flagValue("--security-summary"),
      "rls-live-summary.json": flagValue("--rls-live-summary"),
      "multi-instance-summary.json": flagValue("--multi-instance-summary"),
      "load-summary.json": flagValue("--load-summary"),
      "otel-summary.json": flagValue("--otel-summary"),
      "mutation-summary.json": flagValue("--mutation-summary"),
      "redis-candidate-summary.json": flagValue("--redis-candidate-summary"),
      "staging-summary.json": flagValue("--staging-summary"),
      "restore-summary.json": flagValue("--restore-summary"),
      "remote-ci-summary.json": flagValue("--remote-ci-summary"),
    },
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(`release evidence failed: ${error.message}`);
    process.exitCode = 1;
  });
}
