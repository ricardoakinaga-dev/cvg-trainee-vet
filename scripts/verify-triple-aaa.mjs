import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { validateCurrentMutationSummary } from "./mutation-summary-contract.mjs";
import { isRestoreSummaryV2 } from "./restore-summary-contract.mjs";
import { isEvidenceFresh, latestAuditPath } from "./evidence-freshness.mjs";
import { validateArtifactDigests } from "./release-evidence.mjs";
import {
  findingsCounterFailures,
  riskRegisterFailures,
} from "./ci-proof-contract.mjs";

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

/**
 * AAA-V6 §125.22 — pnpm verify:triple-aaa.
 *
 * The ONLY promotion authority. Derives every field from prior verifiable
 * artifacts (never Markdown, never hand-passed results), evaluates all
 * invariants fail-closed, and writes release-evidence/triple-aaa-verdict.json.
 *
 * Usage:
 *   node scripts/verify-triple-aaa.mjs [--evidence-dir DIR] [--sha SHA]
 *     [--out FILE] [--fixture-mode]
 * `--fixture-mode` allows synthetic markers (self-tests only) and stamps
 * the output accordingly; real certification refuses fixture evidence.
 */

const SHA_RE = /^[0-9a-f]{40}$/u;
const FORBIDDEN_MARKERS = Object.freeze([
  "fixture",
  "synthetic",
  "example",
  "mock",
  "self-test",
]);

function flagValue(name) {
  const equals = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (equals !== undefined) return equals.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const next = process.argv[index + 1];
  if (next === undefined || next.startsWith("--")) return null;
  return next;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function checkFresh(sha, head) {
  return isEvidenceFresh(process.cwd(), sha, head);
}

function scoreDomains(domains, names) {
  const values = names.map((name) => domains[name]);
  if (
    values.length === 0 ||
    values.some(
      (value) =>
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 100,
    )
  )
    return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const ENGINEERING_DOMAINS = Object.freeze([
  "architecture",
  "modularity",
  "domain",
  "application",
  "contracts",
  "testing",
  "coverage",
  "mutation",
  "maintainability",
  "ci",
  "traceability",
]);
const SECURITY_DOMAINS = Object.freeze([
  "auth",
  "authz",
  "rls",
  "session",
  "recovery",
  "csrf",
  "rate_limit",
  "redis_failure_policy",
  "input_validation",
  "security_testing",
  "supply_chain",
  "secrets",
  "audit",
  "ai_qdrant_trust",
]);
const OPERATIONS_DOMAINS = Object.freeze([
  "observability",
  "otel",
  "metrics",
  "health_readiness",
  "timeouts",
  "retries",
  "shutdown",
  "worker",
  "multi_instance",
  "redis",
  "postgres",
  "qdrant_recovery",
  "backup",
  "restore",
  "dr",
  "fault_drills",
  "load",
  "remote_ci",
  "same_sha",
  "release_evidence",
]);

async function main() {
  const evidenceDir =
    flagValue("--evidence-dir") ?? join(root, "release-evidence");
  const auditPath =
    flagValue("--audit") ??
    (await latestAuditPath(root).catch(() =>
      join(root, "docs/audits/missing-final-audit.json"),
    ));
  const registerPath =
    flagValue("--register") ??
    join(root, "docs/quality/residual-risk-register.json");
  const reviewPath =
    flagValue("--review") ??
    join(root, "docs/audits/independent-review-v2.json");
  const outPath =
    flagValue("--out") ?? join(evidenceDir, "triple-aaa-verdict.json");
  const fixtureMode = process.argv.includes("--fixture-mode");
  const preflight = process.argv.includes("--preflight");
  const selfRunId = Number(flagValue("--self-candidate-run-id"));
  let candidateSha = flagValue("--sha");
  if (candidateSha === null) {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
    }).catch(() => ({ stdout: "" }));
    candidateSha = stdout.trim();
  }

  const failures = [];
  const fatals = [];
  const fail = (invariant, detail = "") => {
    failures.push(`REVISE: ${invariant}${detail === "" ? "" : ` — ${detail}`}`);
  };
  const fatal = (invariant, detail = "") => {
    fatals.push(`FAIL: ${invariant}${detail === "" ? "" : ` — ${detail}`}`);
  };

  // Single source of truth: config/triple-aaa-gates.json (matrix G01–G73).
  // Missing/invalid config is fatal — thresholds are never defaulted.
  let gates = null;
  try {
    const { loadGateConfig } = await import("./gate-config.mjs");
    gates = await loadGateConfig();
  } catch (error) {
    fatal("gate config", error.message);
  }
  const covMin = gates?.coverage ?? null;
  const mutMin = gates?.mutation?.adjusted_critical_min ?? null;
  const mutSurvMax = gates?.mutation?.real_critical_survivors_max ?? null;
  const scoreMin = gates?.scores ?? null;
  const findingsMax = gates?.findings ?? null;

  // ---- load required artifacts (§125.2) ----
  const required = [
    "multi-instance-summary.json",
    "coverage-summary.json",
    "mutation-summary.json",
    "test-summary.json",
    "security-summary.json",
    "rls-live-summary.json",
    "redis-candidate-summary.json",
    "staging-summary.json",
    "otel-summary.json",
    "load-summary.json",
    "restore-summary.json",
    "remote-ci-summary.json",
    "sbom.cyclonedx.json",
    "provenance.json",
    "artifact-digests.json",
  ];
  const evidence = {};
  for (const file of required) {
    try {
      evidence[file] = await readJson(join(evidenceDir, file));
    } catch {
      fail("required artifact present", `${file} missing or unparsable`);
      evidence[file] = null;
    }
  }
  let audit = null;
  let register = null;
  let review = null;
  try {
    audit = await readJson(auditPath);
  } catch {
    fail("current audit present", `${auditPath} missing`);
  }
  try {
    register = await readJson(registerPath);
  } catch {
    fail("risk register present", `${registerPath} missing`);
  }
  try {
    review = await readJson(reviewPath);
  } catch {
    fail("independent review present", `${reviewPath} missing`);
  }

  // ---- anti-forgery (§125.27) ----
  // Claim artifacts only: inventories (SBOM, digests, manifest) legitimately
  // contain substrings like "fixture"/"example" as component names, file
  // paths and descriptions — they are inputs, never certification claims.
  // Regression: real SBOM embeds scripts/real-e2e-fixture-server.mjs.
  if (!fixtureMode) {
    const claimFiles = Object.entries(evidence)
      .filter(
        ([name]) =>
          name !== "sbom.cyclonedx.json" &&
          name !== "artifact-digests.json" &&
          name !== "manifest.json",
      )
      .map(([name, content]) => {
        if (name !== "coverage-summary.json" || !content) return content;
        // json-summary keys inventory runtime filenames, which can legitimately
        // contain "fixtures". Scan their values and all envelope claims. The
        // raw bytes are validated against this report by the strict digest
        // contract below, so they do not form a second textual claim channel.
        const { raw_report: rawReport, report, ...claims } = content;
        const inventory = Object.fromEntries(
          Object.entries(report ?? {}).map(([file, metrics], index) => {
            const runtimePath = relative(process.cwd(), file);
            const runtimeFilename =
              isAbsolute(file) &&
              /^(apps|packages)\/.+\.(ts|tsx|mts|cts)$/u.test(runtimePath);
            return [runtimeFilename ? `runtime_file_${index}` : file, metrics];
          }),
        );
        return {
          ...claims,
          report: inventory,
          raw_report_present: typeof rawReport === "string",
        };
      });
    const haystack = JSON.stringify(claimFiles);
    const hit = FORBIDDEN_MARKERS.find((marker) =>
      haystack.toLowerCase().includes(marker),
    );
    if (hit !== undefined) {
      fatal("evidence forgery screen", `marker "${hit}" in real evidence`);
    }
  }

  // ---- candidate SHA (§125.3) ----
  const shaValid = SHA_RE.test(candidateSha);
  if (!shaValid) fail("candidate SHA valid", String(candidateSha));
  const candidateFresh = await checkFresh(candidateSha, candidateSha);
  if (!candidateFresh.fresh)
    fail("candidate checkout fresh", candidateFresh.detail);
  const auditFresh = await checkFresh(
    audit?.evidence_sha ?? audit?.sha,
    candidateSha,
  );
  const auditIdentity =
    audit?.candidate_sha === candidateSha && auditFresh.fresh;
  if (!auditIdentity)
    fail(
      "audit identity/freshness",
      `candidate=${audit?.candidate_sha}; ${auditFresh.detail}`,
    );
  const auditDecision =
    audit?.triple_aaa === "PASS" && audit?.readiness === "STAGING_VERIFIED";
  if (!auditDecision)
    fail(
      "audit decision/readiness",
      `decision=${audit?.triple_aaa}; readiness=${audit?.readiness}`,
    );

  // ---- same-SHA invariant (§125.4) ----
  const remote = evidence["remote-ci-summary.json"];
  const sameShaEvidence = [
    ["test", evidence["test-summary.json"]?.sha],
    ["security", evidence["security-summary.json"]?.sha],
    ["coverage", evidence["coverage-summary.json"]?.sha],
    ["mutation", evidence["mutation-summary.json"]?.sha],
    ["restore", evidence["restore-summary.json"]?.sha],
    ["rls", evidence["rls-live-summary.json"]?.sha],
    ["redis", evidence["redis-candidate-summary.json"]?.sha],
    ["staging", evidence["staging-summary.json"]?.sha],
    ["otel", evidence["otel-summary.json"]?.sha],
    ["load", evidence["load-summary.json"]?.sha],
    ["multi-instance", evidence["multi-instance-summary.json"]?.sha],
    ["sbom/provenance", evidence["provenance.json"]?.commit],
  ];
  let sameSha = shaValid && candidateFresh.fresh && auditIdentity;
  const shaNotes = [];
  if (remote) {
    for (const [name, run] of [
      ["quality", remote.quality],
      ["security", remote.security],
      ["candidate", remote.candidate],
    ]) {
      if (!run || run.sha !== candidateSha) {
        sameSha = false;
        shaNotes.push(`${name}.sha=${run?.sha ?? "missing"}`);
      }
    }
    if (remote.all_same_sha !== true) {
      sameSha = false;
      shaNotes.push("all_same_sha!=true");
    }
  } else {
    sameSha = false;
  }
  for (const [name, sha] of sameShaEvidence) {
    if (typeof sha !== "string") {
      sameSha = false;
      shaNotes.push(`${name}.sha missing`);
      continue;
    }
    const fresh = await checkFresh(sha, candidateSha);
    if (!fresh.fresh) {
      sameSha = false;
      shaNotes.push(`${name}: ${fresh.detail}`);
    }
  }
  if (!sameSha) fail("same-SHA invariant", shaNotes.join("; ").slice(0, 300));

  // ---- remote CI invariant (§125.5) ----
  const preflightCandidate =
    preflight &&
    Number.isSafeInteger(selfRunId) &&
    selfRunId > 0 &&
    remote?.phase === "preflight" &&
    remote?.candidate?.run_id === selfRunId &&
    remote?.candidate?.execution_status === "in_progress" &&
    remote?.candidate?.conclusion === null &&
    remote?.candidate?.status === "pending";
  const completedSuccess = (run) =>
    run?.status === "PASS" &&
    run.execution_status === "completed" &&
    run.conclusion === "success" &&
    Number.isSafeInteger(run.run_id) &&
    run.run_id > 0;
  const remotePass =
    remote !== null &&
    remote.status === "PASS" &&
    remote.authenticated === true &&
    completedSuccess(remote.quality) &&
    completedSuccess(remote.security) &&
    (preflightCandidate || completedSuccess(remote.candidate)) &&
    remote.all_same_sha === true &&
    (remote.quality?.run_id ?? 0) > 0 &&
    (remote.security?.run_id ?? 0) > 0 &&
    (remote.candidate?.run_id ?? 0) > 0;
  if (!remotePass) {
    fail(
      "remote CI invariant",
      `quality=${remote?.quality?.status} security=${remote?.security?.status} candidate=${remote?.candidate?.status}`,
    );
  }

  // ---- coverage invariant (§125.6) ----
  // Bundle shape is the §125.4 envelope {sha,status,report:{total}};
  // the legacy flat {total} shape is still read (never assumed PASS).
  const coverage = evidence["coverage-summary.json"];
  const covTotals =
    coverage?.report?.total ?? coverage?.total ?? coverage ?? null;
  const cov = {
    statements: covTotals?.statements?.pct ?? null,
    branches: covTotals?.branches?.pct ?? null,
    functions: covTotals?.functions?.pct ?? null,
    lines: covTotals?.lines?.pct ?? null,
  };
  const coveragePass =
    coverage !== null &&
    covMin !== null &&
    (cov.statements ?? 0) >= covMin.statements_min &&
    (cov.branches ?? 0) >= covMin.branches_min &&
    (cov.functions ?? 0) >= covMin.functions_min &&
    (cov.lines ?? 0) >= covMin.lines_min &&
    (coverage.status ?? "FAIL") === "PASS";
  if (!coveragePass) fail("coverage invariant", JSON.stringify(cov));

  // ---- mutation invariant (§125.7) ----
  const mutation = evidence["mutation-summary.json"];
  const mutationRunId = process.env.CVG_MUTATION_CANDIDATE_ID?.trim();
  let mutationProvenancePass = fixtureMode;
  if (!fixtureMode) {
    try {
      const proof = await validateCurrentMutationSummary(mutation, {
        repositoryRoot: root,
        expectedRunId: mutationRunId,
        expectedSha: candidateSha,
        requireExpectedRunId: true,
      });
      mutationProvenancePass =
        proof.candidateRunId === mutationRunId &&
        proof.candidateSha === candidateSha;
    } catch (error) {
      mutationProvenancePass = false;
      fail("current mutation provenance", error.message);
    }
  }
  const mutationIdentityPass =
    fixtureMode ||
    (mutation?.candidate_sha === candidateSha &&
      /^[a-f0-9]{64}$/u.test(mutation?.manifest_sha256 ?? "") &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u.test(
        mutation?.candidate_run_id ?? "",
      ) &&
      mutationRunId !== undefined &&
      mutation.candidate_run_id === mutationRunId);
  const mutationPass =
    mutation !== null &&
    mutMin !== null &&
    mutSurvMax !== null &&
    (mutation.adjusted_score ?? 0) >= mutMin &&
    (mutation.critical_real_survivors ?? 1) <= mutSurvMax &&
    mutation.status === "PASS" &&
    mutationIdentityPass &&
    mutationProvenancePass;
  if (!mutationPass) {
    fail(
      "mutation invariant",
      `adjusted=${mutation?.adjusted_score} survivors=${mutation?.critical_real_survivors} candidate=${mutation?.candidate_sha}`,
    );
  }

  // ---- security invariant (§125.8) ----
  const security = evidence["security-summary.json"];
  const secResidual = security?.residual ?? {};
  const securityPass =
    security !== null &&
    security.audit === "pnpm audit --audit-level=high PASS" &&
    security.audit_result?.status === "PASS" &&
    security.audit_result.parsed === true &&
    security.audit_result.command === "pnpm audit --audit-level=high" &&
    security.audit_result.high === secResidual.high &&
    security.audit_result.critical === secResidual.critical &&
    (secResidual.high ?? 1) === 0 &&
    (secResidual.critical ?? 1) === 0 &&
    security.secret_scan === "PASS" &&
    security.codeql === "PASS" &&
    security.osv === "PASS" &&
    (security.dependency_review === "PASS" ||
      security.dependency_review === "not-applicable");
  if (!securityPass) {
    fail(
      "security invariant",
      `high=${secResidual.high} critical=${secResidual.critical} secrets=${security?.secret_scan} codeql=${security?.codeql} osv=${security?.osv} review=${security?.dependency_review}`,
    );
  }

  // ---- RLS invariant (§125.9) ----
  const rls = evidence["rls-live-summary.json"];
  const rlsFields = [
    "cross_scope_read_denied",
    "cross_scope_write_denied",
    "anonymous_denied",
    "service_identity_constrained",
    "pool_context_isolated",
    "force_rls_verified",
    "bypassrls_absent",
    "superuser_absent",
  ];
  const rlsPass =
    rls !== null &&
    rls.status === "PASS" &&
    (rls.failed ?? 1) === 0 &&
    rlsFields.every((field) => rls[field] === true);
  if (!rlsPass) {
    fail(
      "RLS invariant",
      rlsFields.filter((field) => rls?.[field] !== true).join(",") ||
        `status=${rls?.status}`,
    );
  }

  // ---- Redis invariant (§125.10) ----
  const redis = evidence["redis-candidate-summary.json"];
  const redisFields = [
    "shared_budget",
    "atomicity",
    "timeout",
    "restart",
    "reconnect",
    "trusted_proxy",
    "spoof_rejection",
    "critical_fail_closed",
  ];
  const redisPass =
    redis !== null &&
    redis.status === "PASS" &&
    (redis.backend === "redis" || redis.backend === "valkey") &&
    (redis.api_instances ?? 0) >= 2 &&
    redisFields.every((field) => redis[field] === "PASS");
  if (!redisPass) {
    fail(
      "Redis invariant",
      `backend=${redis?.backend} ${redisFields.filter((field) => redis?.[field] !== "PASS").join(",")}`,
    );
  }

  // ---- staging invariant (§125.11) ----
  const staging = evidence["staging-summary.json"];
  const stagingFields = [
    "postgres",
    "redis",
    "worker",
    "qdrant",
    "web",
    "tls",
    "otel_collector",
    "browser_journey",
    "fault_drills",
  ];
  const stagingPass =
    staging !== null &&
    staging.status === "PASS" &&
    (staging.api_instances ?? 0) >= 2 &&
    stagingFields.every((field) => staging[field] === "PASS");
  if (!stagingPass) {
    fail(
      "staging invariant",
      stagingFields.filter((field) => staging?.[field] !== "PASS").join(",") ||
        `status=${staging?.status}`,
    );
  }

  // ---- load invariant (§125.12) ----
  const load = evidence["load-summary.json"];
  const loadPass =
    load !== null &&
    (load.failed_checks ?? load.checksFails ?? 1) === 0 &&
    (load.http_5xx ?? 1) === 0;
  if (!loadPass) {
    fail(
      "load invariant",
      `failed=${load?.failed_checks ?? load?.checksFails} 5xx=${load?.http_5xx}`,
    );
  }

  // ---- restore invariant (§125.13) ----
  const restore = evidence["restore-summary.json"];
  const restorePass =
    isRestoreSummaryV2(restore) &&
    restore.status === "PASS" &&
    restore.integrity_verified === true;
  if (!restorePass) fail("restore invariant", `status=${restore?.status}`);

  // ---- supply-chain invariant (§125.14) ----
  let sbomOk = false;
  let provenanceOk = false;
  let digestsOk = false;
  try {
    const sbom = evidence["sbom.cyclonedx.json"];
    sbomOk =
      sbom !== null &&
      sbom.bomFormat === "CycloneDX" &&
      Array.isArray(sbom.components) &&
      sbom.components.length > 0;
  } catch {
    sbomOk = false;
  }
  try {
    const provenance = evidence["provenance.json"];
    provenanceOk =
      provenance !== null &&
      typeof provenance.commit === "string" &&
      provenance.commit.length > 0;
    if (provenanceOk) {
      const fresh = await checkFresh(provenance.commit, candidateSha);
      provenanceOk = fresh.fresh;
    }
  } catch {
    provenanceOk = false;
  }
  try {
    const digests = await readJson(join(evidenceDir, "artifact-digests.json"));
    const manifest = await readJson(join(evidenceDir, "manifest.json"));
    digestsOk =
      (
        await validateArtifactDigests(evidenceDir, manifest, digests, [
          auditPath,
          registerPath,
          reviewPath,
          outPath,
        ])
      ).length === 0;
  } catch {
    digestsOk = false;
  }
  // Actions pinning + lockfile presence from the candidate tree.
  let pinnedOk = false;
  let lockfileOk = false;
  try {
    const { readdir: listDir } = await import("node:fs/promises");
    const workflows = await listDir(join(root, ".github/workflows"));
    pinnedOk = true;
    for (const workflow of workflows) {
      if (!workflow.endsWith(".yml") && !workflow.endsWith(".yaml")) continue;
      const text = await readFile(
        join(root, ".github/workflows", workflow),
        "utf8",
      );
      const uses = [...text.matchAll(/uses:\s*([^\s#]+)/gu)].map((m) => m[1]);
      for (const ref of uses) {
        if (ref.startsWith("./") || ref.startsWith("docker://")) continue;
        if (!/@[0-9a-f]{40}/u.test(ref)) pinnedOk = false;
      }
    }
    await readFile(join(root, "pnpm-lock.yaml"), "utf8");
    lockfileOk = true;
  } catch {
    pinnedOk = false;
  }
  const supplyPass =
    sbomOk &&
    provenanceOk &&
    digestsOk &&
    pinnedOk &&
    lockfileOk &&
    (remote?.security?.status === "PASS" || false);
  if (!supplyPass) {
    fail(
      "supply-chain invariant",
      `sbom=${sbomOk} provenance=${provenanceOk} digests=${digestsOk} pinned=${pinnedOk} lockfile=${lockfileOk}`,
    );
  }

  // ---- evidence integrity (§125.15) ----
  if (!digestsOk) {
    fatal("evidence integrity", "artifact digests mismatch or unreadable");
  }

  // ---- findings (§125.16) ----
  const counterFailures = findingsCounterFailures(audit);
  for (const detail of counterFailures) fatal("findings counters", detail);
  for (const detail of riskRegisterFailures(audit, register, candidateSha))
    fail("risk register semantics", detail);
  const p2Entries = Array.isArray(register?.entries)
    ? register.entries.filter((entry) => entry?.severity === "P2")
    : [];
  const p3Entries = Array.isArray(register?.entries)
    ? register.entries.filter((entry) => entry?.severity === "P3")
    : [];
  const p0 = audit?.p0 ?? 1;
  const p1 = audit?.p1 ?? 1;
  // G69/G70 via gate config (p0_max/p1_max).
  if (
    findingsMax === null ||
    p0 > findingsMax.p0_max ||
    p1 > findingsMax.p1_max
  ) {
    fatal("findings P0/P1", `p0=${p0} p1=${p1}`);
  }
  const requiredRiskFields = [
    "id",
    "finding",
    "impact",
    "owner",
    "mitigation",
    "validation",
    "accepted_risk",
  ];
  const materialUnaccepted = [];
  for (const entry of p2Entries) {
    const missing = requiredRiskFields.filter(
      (field) => entry[field] === undefined || entry[field] === "",
    );
    if (missing.length > 0) {
      fail("P2 register complete", `${entry.id ?? "?"}: ${missing.join(",")}`);
    }
    if (entry.material === true && entry.accepted_risk !== true) {
      materialUnaccepted.push(entry.id);
    }
  }
  if (materialUnaccepted.length > 0) {
    fail("P2 material accepted", materialUnaccepted.join(","));
  }

  // ---- independent review (§125.18) ----
  const reviewPass =
    review !== null &&
    review.verdict === "PASS" &&
    typeof review.candidate_sha === "string" &&
    (await checkFresh(review.candidate_sha, candidateSha)).fresh;
  if (!reviewPass) {
    fail(
      "independent review",
      `verdict=${review?.verdict} sha=${review?.candidate_sha}`,
    );
  }

  // ---- scores (§125.17, computed from audit domains) ----
  const domains = audit?.domains ?? null;
  const engineering =
    domains === null ? null : scoreDomains(domains, ENGINEERING_DOMAINS);
  const securityScore =
    domains === null ? null : scoreDomains(domains, SECURITY_DOMAINS);
  const operations =
    domains === null ? null : scoreDomains(domains, OPERATIONS_DOMAINS);
  const round1 = (value) =>
    value === null ? null : Math.round(value * 10) / 10;
  const scores = {
    engineering: round1(engineering),
    security: round1(securityScore),
    operations: round1(operations),
  };
  if (
    scores.engineering === null ||
    scores.security === null ||
    scores.operations === null
  ) {
    fail("scores computable", "audit domains incomplete");
  } else {
    // Consistency: stated aggregates must equal the computed means.
    for (const [key, stated] of [
      ["engineering", audit?.aaa_engineering],
      ["security", audit?.aaa_security],
      ["operations", audit?.aaa_operations],
    ]) {
      if (
        stated !== undefined &&
        (typeof stated !== "number" ||
          !Number.isFinite(stated) ||
          stated < 0 ||
          stated > 100 ||
          Math.abs(stated - scores[key]) > 0.06)
      ) {
        fail(
          "scores consistent with audit",
          `${key}: stated ${stated} vs computed ${scores[key]}`,
        );
      }
    }
  }
  // §48/§82: thresholds apply to the RAW means — never to rounded values
  // (round1(96.99) === 97 must NOT pass). Rounded scores are display-only.
  const scoresPass =
    scoreMin !== null &&
    engineering !== null &&
    securityScore !== null &&
    operations !== null &&
    engineering >= scoreMin.engineering_min &&
    securityScore >= scoreMin.security_min &&
    operations >= scoreMin.operations_min;
  if (!scoresPass) {
    fail(
      "score invariant",
      `eng=${scores.engineering} sec=${scores.security} ops=${scores.operations}`,
    );
  }

  // ---- release evidence gate (§125.35/69) ----
  const { validateBundle } = await import("./release-evidence.mjs");
  let releasePass = false;
  try {
    const bundleFailures = await validateBundle(evidenceDir, {
      strict: true,
      head: candidateSha,
      phase: preflight ? "preflight" : "promotion",
      derivedArtifacts: [auditPath, registerPath, reviewPath, outPath],
      syntheticFixtureMode: fixtureMode,
      expectedMutationRunId: fixtureMode ? mutation?.candidate_run_id : null,
      testInventory: fixtureMode
        ? [
            "packages/application/src/fixture.test.ts",
            "tests/integration/fixture.test.ts",
          ]
        : null,
      trustedClaims: [auditPath, registerPath, reviewPath].map((path) => ({
        path,
        archivePath: `release-evidence/${basename(path)}`,
      })),
    });
    releasePass = bundleFailures.length === 0;
    if (!releasePass) {
      fail(
        "release evidence strict",
        bundleFailures.slice(0, 3).join("; ").slice(0, 250),
      );
    }
  } catch (error) {
    fail("release evidence strict", error.message);
  }

  // ---- verdict boolean (§125.19/20) ----
  const verdict =
    fatals.length > 0
      ? "FAIL"
      : failures.length === 0 &&
          remotePass &&
          sameSha &&
          coveragePass &&
          mutationPass &&
          securityPass &&
          rlsPass &&
          redisPass &&
          stagingPass &&
          supplyPass &&
          releasePass &&
          reviewPass &&
          scoresPass &&
          findingsMax !== null &&
          counterFailures.length === 0 &&
          p0 <= findingsMax.p0_max &&
          p1 <= findingsMax.p1_max
        ? preflight
          ? "PREFLIGHT_PASS"
          : "PASS"
        : "REVISE";

  // ---- readiness derivation (§125.21) ----
  // Production evidence is out of scope for this program: without real
  // deployment telemetry the ceiling is STAGING_VERIFIED.
  // Readiness cannot contradict any gate of the complete promotion verdict.
  const finalReadiness =
    verdict === "PASS" &&
    !preflight &&
    candidateFresh.fresh &&
    auditIdentity &&
    sameSha &&
    releasePass &&
    remotePass &&
    fatals.length === 0 &&
    stagingPass
      ? "STAGING_VERIFIED"
      : "NOT_VERIFIED";

  const generatedAt = new Date().toISOString();
  const verdictDoc = {
    schema_version: 1,
    candidate_sha: candidateSha,
    evidence_sha: audit?.evidence_sha ?? audit?.sha ?? null,
    audit_path: auditPath,
    phase: preflight ? "preflight" : "promotion",
    generated_at: generatedAt,
    ...(fixtureMode ? { synthetic_verifier_test: true } : {}),
    proof_scope: fixtureMode
      ? "SYNTHETIC_LOCAL_INTEGRITY"
      : "AUTHENTICATED_REMOTE_ARTIFACT_REQUIRED",
    remote: {
      quality: {
        status: remote?.quality?.status ?? "missing",
        sha: remote?.quality?.sha ?? null,
        run_id: remote?.quality?.run_id ?? 0,
      },
      security: {
        status: remote?.security?.status ?? "missing",
        sha: remote?.security?.sha ?? null,
        run_id: remote?.security?.run_id ?? 0,
      },
      candidate: remote?.candidate
        ? {
            status: remote.candidate.status ?? "missing",
            sha: remote.candidate.sha ?? null,
            run_id: remote.candidate.run_id ?? 0,
          }
        : { status: "missing", sha: null, run_id: 0 },
      same_sha: sameSha,
    },
    coverage: {
      statements: cov.statements,
      branches: cov.branches,
      functions: cov.functions,
      lines: cov.lines,
      status: coveragePass ? "PASS" : "FAIL",
    },
    mutation: {
      adjusted_critical_score: mutation?.adjusted_score ?? null,
      critical_real_survivors: mutation?.critical_real_survivors ?? null,
      status: mutationPass ? "PASS" : "FAIL",
    },
    assurance: {
      rls_live: rlsPass ? "PASS" : "FAIL",
      redis_candidate: redisPass ? "PASS" : "FAIL",
      staging: stagingPass ? "PASS" : "FAIL",
      supply_chain: supplyPass ? "PASS" : "FAIL",
      release_evidence: releasePass ? "PASS" : "FAIL",
      independent_review: reviewPass ? "PASS" : "FAIL",
    },
    findings: {
      p0,
      p1,
      p2: p2Entries.length,
      p3: p3Entries.length,
    },
    scores,
    verdict,
    readiness: finalReadiness,
  };

  await mkdir(evidenceDir, { recursive: true });
  await writeFile(outPath, `${JSON.stringify(verdictDoc, null, 2)}\n`);

  // ---- human-readable rendering (§125.24, derived from the JSON) ----
  const line = (label, value) => `${label.padEnd(22, " ")} = ${value}`;
  console.log(`\n${line("FINAL_CANDIDATE_SHA", verdictDoc.candidate_sha)}`);
  console.log("");
  console.log(line("Remote Quality", verdictDoc.remote.quality.status));
  console.log(line("Remote Security", verdictDoc.remote.security.status));
  console.log(line("Remote Candidate", verdictDoc.remote.candidate.status));
  console.log(line("Same-SHA", verdictDoc.remote.same_sha ? "PASS" : "FAIL"));
  console.log("");
  console.log(line("Coverage", verdictDoc.coverage.status));
  console.log(line("Critical Mutation", verdictDoc.mutation.status));
  console.log(line("RLS", verdictDoc.assurance.rls_live));
  console.log(line("Redis Candidate", verdictDoc.assurance.redis_candidate));
  console.log(line("Staging", verdictDoc.assurance.staging));
  console.log(line("Supply Chain", verdictDoc.assurance.supply_chain));
  console.log(line("Release Evidence", verdictDoc.assurance.release_evidence));
  console.log(
    line("Independent Review", verdictDoc.assurance.independent_review),
  );
  console.log("");
  console.log(line("P0", String(verdictDoc.findings.p0)));
  console.log(line("P1", String(verdictDoc.findings.p1)));
  console.log(line("P2", String(verdictDoc.findings.p2)));
  console.log("");
  console.log(line("AAA Engineering", String(verdictDoc.scores.engineering)));
  console.log(line("AAA Security", String(verdictDoc.scores.security)));
  console.log(line("AAA Operations", String(verdictDoc.scores.operations)));
  console.log("");
  console.log(`TRIPLE AAA = ${verdict}`);
  console.log(`READINESS  = ${finalReadiness}`);
  if (fatals.length > 0) {
    console.error(`\nverify:triple-aaa: FAIL (${fatals.length} fatal)`);
    for (const fatal of fatals) console.error(`- ${fatal}`);
  }
  if (failures.length > 0) {
    console.error(`\nverify:triple-aaa: REVISE (${failures.length} open)`);
    for (const failure of failures.slice(0, 12)) console.error(`- ${failure}`);
  }
  if (verdict === "PASS") console.log("\nverify:triple-aaa: PASS");

  process.exitCode = verdict === "PASS" || verdict === "PREFLIGHT_PASS" ? 0 : 1;
}

await main().catch((error) => {
  console.error(`verify:triple-aaa failed: ${error.message}`);
  process.exitCode = 1;
});
