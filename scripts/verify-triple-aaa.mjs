import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

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

const RUNTIME_TOP_LEVELS = Object.freeze([
  "apps",
  "packages",
  "tests",
  "scripts",
  ".github",
]);
const RUNTIME_ROOT_FILES = Object.freeze([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "vitest.config.ts",
  "tsconfig.json",
  "tsconfig.base.json",
  "eslint.config.mjs",
  "drizzle.config.ts",
  "playwright.config.ts",
  "architecture-boundaries.json",
  "traceability.yml",
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

function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function isAncestor(sha, head) {
  try {
    await execFileAsync("git", ["merge-base", "--is-ancestor", sha, head], {
      cwd: root,
    });
    return true;
  } catch {
    return false;
  }
}

async function runtimeDiffEmpty(sha, head) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--name-only", sha, head, "--"],
      { cwd: root },
    );
    return (
      stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter(
          (line) =>
            RUNTIME_TOP_LEVELS.some(
              (top) => line === top || line.startsWith(`${top}/`),
            ) || RUNTIME_ROOT_FILES.includes(line),
        ).length === 0
    );
  } catch {
    return false;
  }
}

async function checkFresh(sha, head) {
  if (typeof sha !== "string" || !SHA_RE.test(sha)) {
    return { fresh: false, detail: `not a full SHA: ${String(sha)}` };
  }
  if (sha === head) return { fresh: true, detail: sha };
  if (!(await isAncestor(sha, head))) {
    return { fresh: false, detail: `${sha} is not an ancestor of ${head}` };
  }
  if (!(await runtimeDiffEmpty(sha, head))) {
    return { fresh: false, detail: `runtime diff since ${sha}` };
  }
  return { fresh: true, detail: `${sha} (docs-only since)` };
}

function scoreDomains(domains, names) {
  const values = names.map((name) => domains[name]);
  if (values.some((value) => typeof value !== "number")) return null;
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
  "rate_limit",
  "negative_tests",
  "security_testing",
  "supply_chain",
  "secrets",
  "audit",
]);
const OPERATIONS_DOMAINS = Object.freeze([
  "observability",
  "otel",
  "metrics",
  "timeouts",
  "retries",
  "worker",
  "multi_instance",
  "redis",
  "backup",
  "restore",
  "dr",
  "fault_drills",
  "load",
  "same_sha",
  "release_evidence",
]);

async function main() {
  const evidenceDir =
    flagValue("--evidence-dir") ?? join(root, "release-evidence");
  const auditPath =
    flagValue("--audit") ??
    join(root, "docs/audits/state-of-art-final-audit-v6.json");
  const registerPath =
    flagValue("--register") ??
    join(root, "docs/quality/residual-risk-register.json");
  const reviewPath =
    flagValue("--review") ?? join(root, "docs/audits/independent-review.json");
  const outPath =
    flagValue("--out") ?? join(evidenceDir, "triple-aaa-verdict.json");
  const fixtureMode = process.argv.includes("--fixture-mode");
  let candidateSha = flagValue("--sha");
  if (candidateSha === null) {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
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

  // ---- load required artifacts (§125.2) ----
  const required = [
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
    fail("audit v6 present", `${auditPath} missing`);
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
  if (!fixtureMode) {
    const haystack = JSON.stringify(evidence);
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

  // ---- same-SHA invariant (§125.4) ----
  const remote = evidence["remote-ci-summary.json"];
  const sameShaEvidence = [
    ["coverage", evidence["coverage-summary.json"]?.sha],
    ["mutation", evidence["mutation-summary.json"]?.sha],
    ["rls", evidence["rls-live-summary.json"]?.sha],
    ["redis", evidence["redis-candidate-summary.json"]?.sha],
    ["staging", evidence["staging-summary.json"]?.sha],
    ["sbom/provenance", evidence["provenance.json"]?.commit],
  ];
  let sameSha = shaValid;
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
    if (sha === candidateSha) continue;
    const fresh = await checkFresh(sha, candidateSha);
    if (!fresh.fresh) {
      sameSha = false;
      shaNotes.push(`${name}: ${fresh.detail}`);
    }
  }
  if (!sameSha) fail("same-SHA invariant", shaNotes.join("; ").slice(0, 300));

  // ---- remote CI invariant (§125.5) ----
  const remotePass =
    remote !== null &&
    remote.quality?.status === "PASS" &&
    remote.security?.status === "PASS" &&
    remote.candidate?.status === "PASS" &&
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
  const coverage = evidence["coverage-summary.json"];
  const covTotals = coverage?.total ?? coverage;
  const cov = {
    statements: covTotals?.statements?.pct ?? null,
    branches: covTotals?.branches?.pct ?? null,
    functions: covTotals?.functions?.pct ?? null,
    lines: covTotals?.lines?.pct ?? null,
  };
  const coveragePass =
    coverage !== null &&
    (cov.statements ?? 0) >= 90 &&
    (cov.branches ?? 0) >= 85 &&
    (cov.functions ?? 0) >= 90 &&
    (cov.lines ?? 0) >= 90 &&
    (coverage.status ?? "FAIL") === "PASS";
  if (!coveragePass) fail("coverage invariant", JSON.stringify(cov));

  // ---- mutation invariant (§125.7) ----
  const mutation = evidence["mutation-summary.json"];
  const mutationPass =
    mutation !== null &&
    (mutation.adjusted_score ?? 0) >= 0.9 &&
    mutation.critical_real_survivors === 0 &&
    mutation.status === "PASS";
  if (!mutationPass) {
    fail(
      "mutation invariant",
      `adjusted=${mutation?.adjusted_score} survivors=${mutation?.critical_real_survivors}`,
    );
  }

  // ---- security invariant (§125.8) ----
  const security = evidence["security-summary.json"];
  const secResidual = security?.residual ?? {};
  const securityPass =
    security !== null &&
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
    restore !== null &&
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
    const listed = new Set(
      (manifest.artifacts ?? []).map((entry) => entry.path),
    );
    digestsOk = true;
    for (const [file, expected] of Object.entries(digests)) {
      if (!listed.has(file)) {
        digestsOk = false;
        break;
      }
      try {
        const content = await readFile(join(evidenceDir, file), "utf8");
        if (sha256Hex(content) !== expected) {
          digestsOk = false;
          break;
        }
      } catch {
        digestsOk = false;
        break;
      }
    }
    if (!listed.has("artifact-digests.json") && digestsOk) {
      // Self-digest optional; bundle validity already covers presence.
    }
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
  const p2Entries = Array.isArray(register?.entries)
    ? register.entries.filter((entry) => entry.severity === "P2")
    : [];
  const p3Entries = Array.isArray(register?.entries)
    ? register.entries.filter((entry) => entry.severity === "P3")
    : [];
  const p0 = audit?.p0 ?? 1;
  const p1 = audit?.p1 ?? 1;
  if (typeof p0 !== "number" || typeof p1 !== "number") {
    fail("findings readable", "audit P0/P1 missing");
  }
  if (p0 > 0 || p1 > 0) {
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
      if (stated !== undefined && Math.abs(stated - scores[key]) > 0.06) {
        fail(
          "scores consistent with audit",
          `${key}: stated ${stated} vs computed ${scores[key]}`,
        );
      }
    }
  }
  const scoresPass =
    (scores.engineering ?? 0) >= 97 &&
    (scores.security ?? 0) >= 95 &&
    (scores.operations ?? 0) >= 95;
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
          p0 === 0 &&
          p1 === 0
        ? "PASS"
        : "REVISE";

  // ---- readiness derivation (§125.21) ----
  // Production evidence is out of scope for this program: without real
  // deployment telemetry the ceiling is STAGING_VERIFIED.
  const finalReadiness = stagingPass
    ? "STAGING_VERIFIED"
    : "TECHNICALLY_VERIFIED";

  const generatedAt = new Date().toISOString();
  const verdictDoc = {
    schema_version: 1,
    candidate_sha: candidateSha,
    generated_at: generatedAt,
    ...(fixtureMode ? { synthetic_verifier_test: true } : {}),
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

  process.exitCode = verdict === "PASS" ? 0 : 1;
}

await main().catch((error) => {
  console.error(`verify:triple-aaa failed: ${error.message}`);
  process.exitCode = 1;
});
