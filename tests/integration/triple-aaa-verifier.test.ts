import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const root = "/home/ricardo/cvg-trainee-vet";
const VERIFIER = join(root, "scripts/verify-triple-aaa.mjs");
const FAKE_SHA = "a".repeat(40);

/**
 * AAA-V6 §125.25/125.26 — negative + positive self-tests for the final
 * verifier. Each case builds a FULL synthetic fixture bundle in tmpdir
 * (never the real evidence dirs) and asserts the verifier's exit code
 * and verdict. Fixture bundles are marked synthetic and can never
 * certify the product (§125.26/27).
 */

function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

function baseFiles(sha = FAKE_SHA) {
  const pass = "PASS";
  return {
    "coverage-summary.json": {
      total: {
        statements: { pct: 91.5 },
        branches: { pct: 86.1 },
        functions: { pct: 95.9 },
        lines: { pct: 92.2 },
      },
      status: pass,
      sha,
    },
    "mutation-summary.json": {
      format: "cvg-mutation-summary/v1",
      sha,
      total: 100,
      raw_killed: 80,
      equivalent_count: 5,
      verified_kills: 15,
      critical_real_survivors: 0,
      adjusted_score: 0.97,
      status: pass,
    },
    "test-summary.json": { status: pass, sha },
    "security-summary.json": {
      status: pass,
      sha,
      residual: { low: 0, moderate: 0, high: 0, critical: 0 },
      secret_scan: pass,
      codeql: pass,
      osv: pass,
      dependency_review: pass,
    },
    "rls-live-summary.json": {
      status: pass,
      sha,
      failed: 0,
      cross_scope_read_denied: true,
      cross_scope_write_denied: true,
      anonymous_denied: true,
      service_identity_constrained: true,
      pool_context_isolated: true,
      force_rls_verified: true,
      bypassrls_absent: true,
      superuser_absent: true,
    },
    "redis-candidate-summary.json": {
      status: pass,
      sha,
      backend: "redis",
      api_instances: 2,
      shared_budget: pass,
      atomicity: pass,
      timeout: pass,
      restart: pass,
      reconnect: pass,
      trusted_proxy: pass,
      spoof_rejection: pass,
      critical_fail_closed: pass,
    },
    "staging-summary.json": {
      status: pass,
      sha,
      api_instances: 2,
      postgres: pass,
      redis: pass,
      worker: pass,
      qdrant: pass,
      web: pass,
      tls: pass,
      otel_collector: pass,
      browser_journey: pass,
      fault_drills: pass,
    },
    "otel-summary.json": { status: pass },
    "load-summary.json": { status: pass, failed_checks: 0, http_5xx: 0 },
    "restore-summary.json": {
      status: pass,
      sha,
      integrity_verified: true,
      rtoMs: 444,
    },
    "remote-ci-summary.json": {
      format: "cvg-remote-ci-summary/v2",
      sha,
      quality: { status: pass, sha, run_id: 11 },
      security: { status: pass, sha, run_id: 12 },
      candidate: { status: pass, sha, run_id: 13 },
      all_same_sha: true,
      status: pass,
    },
    "sbom.cyclonedx.json": {
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      metadata: {},
      components: [{ name: "x", version: "1" }],
    },
    "provenance.json": { commit: sha, branch: "main" },
    "git-sha.txt": `${sha}\n`,
    "migration-head.txt": "0054_aaa_content_indexer_service\n",
    "ci-runs.json": { status: "missing-blocked", commit: sha },
    "multi-instance-summary.json": { status: pass, sha },
    "otel-summary.json": { status: pass },
    "test-summary.json": { status: pass, sha },
  };
}

function auditDoc() {
  const domains = {};
  for (const name of [
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
  ]) {
    domains[name] = 97;
  }
  for (const name of [
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
  ]) {
    domains[name] = 95;
  }
  for (const name of [
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
  ]) {
    domains[name] = 95;
  }
  return {
    version: "v6",
    candidate_sha: FAKE_SHA,
    evidence_sha: FAKE_SHA,
    p0: 0,
    p1: 0,
    p2: 1,
    domains,
    aaa_engineering: 97,
    aaa_security: 95,
    aaa_operations: 95,
    triple_aaa: "PASS",
    readiness: "STAGING_VERIFIED",
  };
}

function registerDoc() {
  return {
    format: "cvg-risk-register/v1",
    entries: [
      {
        id: "RF-T1",
        severity: "P2",
        finding: "synthetic residual",
        impact: "none",
        owner: "test",
        mitigation: "none needed",
        validation: "self-test",
        accepted_risk: true,
        material: false,
      },
    ],
  };
}

function reviewDoc() {
  return {
    format: "cvg-independent-review/v1",
    candidate_sha: FAKE_SHA,
    verdict: "PASS",
    reviewer: "synthetic",
    generated_at: new Date().toISOString(),
  };
}

async function writeBundle(dir, files) {
  await mkdir(dir, { recursive: true });
  const digests = {};
  const manifest = [];
  for (const [name, content] of Object.entries(files)) {
    const text =
      typeof content === "string"
        ? content
        : `${JSON.stringify(content, null, 2)}\n`;
    await writeFile(join(dir, name), text);
    if (name !== "artifact-digests.json" && name !== "manifest.json") {
      digests[name] = sha256Hex(text);
      manifest.push({ path: name, sha256: digests[name] });
    }
  }
  await writeFile(
    join(dir, "artifact-digests.json"),
    `${JSON.stringify(digests, null, 2)}\n`,
  );
  manifest.push({
    path: "artifact-digests.json",
    sha256: sha256Hex(JSON.stringify(digests, null, 2)),
  });
  await writeFile(
    join(dir, "manifest.json"),
    `${JSON.stringify({ format: "cvg-release-evidence/v1", commit: FAKE_SHA, artifacts: manifest }, null, 2)}\n`,
  );
}

async function runVerifier(dir, extraArgs = [], docs = {}) {
  const auditPath = join(dir, "audit-v6.json");
  const registerPath = join(dir, "risk-register.json");
  const reviewPath = join(dir, "review.json");
  await writeFile(
    auditPath,
    `${JSON.stringify(docs.audit ?? auditDoc(), null, 2)}\n`,
  );
  await writeFile(
    registerPath,
    `${JSON.stringify(docs.register ?? registerDoc(), null, 2)}\n`,
  );
  await writeFile(
    reviewPath,
    `${JSON.stringify(docs.review ?? reviewDoc(), null, 2)}\n`,
  );
  const child = await execFileAsync(
    "node",
    [
      VERIFIER,
      "--evidence-dir",
      dir,
      "--sha",
      FAKE_SHA,
      "--out",
      join(dir, "triple-aaa-verdict.json"),
      "--audit",
      auditPath,
      "--register",
      registerPath,
      "--review",
      reviewPath,
      "--fixture-mode",
      ...extraArgs,
    ],
    { cwd: root, timeout: 120000 },
  ).catch((error) => error);
  return child;
}

describe("triple-aaa verifier self-tests", () => {
  it("positive fixture passes with synthetic marking", async () => {
    const dir = join(
      tmpdir(),
      `cvg-3a-pos-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
    );
    await writeBundle(dir, baseFiles());
    const child = await runVerifier(dir);
    expect(child.code ?? 0).toBe(0);
    const verdict = JSON.parse(
      await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
    );
    expect(verdict.verdict).toBe("PASS");
    expect(verdict.synthetic_verifier_test).toBe(true);
  }, 120000);

  it("anti-forgery: synthetic markers rejected in real mode", async () => {
    const dir = join(
      tmpdir(),
      `cvg-3a-af-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
    );
    const files = baseFiles();
    files["test-summary.json"] = {
      status: "PASS",
      sha: FAKE_SHA,
      note: "synthetic fixture must never certify",
    };
    await writeBundle(dir, files);
    const auditPath = join(dir, "audit-v6.json");
    const registerPath = join(dir, "risk-register.json");
    const reviewPath = join(dir, "review.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(auditPath, `${JSON.stringify(auditDoc(), null, 2)}\n`);
    await writeFile(
      registerPath,
      `${JSON.stringify(registerDoc(), null, 2)}\n`,
    );
    await writeFile(reviewPath, `${JSON.stringify(reviewDoc(), null, 2)}\n`);
    // Real mode: no --fixture-mode flag.
    const child = await execFileAsync(
      "node",
      [
        VERIFIER,
        "--evidence-dir",
        dir,
        "--sha",
        FAKE_SHA,
        "--out",
        join(dir, "triple-aaa-verdict.json"),
        "--audit",
        auditPath,
        "--register",
        registerPath,
        "--review",
        reviewPath,
      ],
      { cwd: root, timeout: 120000 },
    ).catch((error) => error);
    expect(child.code ?? 0).not.toBe(0);
  }, 120000);

  it.each([
    ["coverage branches 84.99", { files: null, docs: null }],
    ["mutation adjusted 89.99", { files: null, docs: null }],
    ["critical survivors 1", { files: null, docs: null }],
    ["P1 equals 1", { files: null, docs: null }],
    ["quality SHA mismatch", { files: null, docs: null }],
    ["security pending", { files: null, docs: null }],
    ["redis backend memory", { files: null, docs: null }],
    ["pool isolation false", { files: null, docs: null }],
    ["SBOM missing", { files: null, docs: null }],
    ["digest mismatch", { files: null, docs: null }],
    ["staging unknown", { files: null, docs: null }],
    ["independent review REVISE", { files: null, docs: null }],
    ["engineering 96", { files: null, docs: null }],
    ["operations 94", { files: null, docs: null }],
  ])(
    "negative: %s fails closed",
    async (_label) => {
      const dir = join(
        tmpdir(),
        `cvg-3a-neg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
      );
      const files = baseFiles();
      let docs = {};
      switch (_label) {
        case "coverage branches 84.99":
          files["coverage-summary.json"].total.branches.pct = 84.99;
          break;
        case "mutation adjusted 89.99":
          files["mutation-summary.json"].adjusted_score = 0.8999;
          break;
        case "critical survivors 1":
          files["mutation-summary.json"].critical_real_survivors = 1;
          break;
        case "P1 equals 1": {
          const audit = auditDoc();
          audit.p1 = 1;
          docs = { audit };
          break;
        }
        case "quality SHA mismatch":
          files["remote-ci-summary.json"].quality.sha = "b".repeat(40);
          break;
        case "security pending":
          files["remote-ci-summary.json"].security.status = "pending";
          break;
        case "redis backend memory":
          files["redis-candidate-summary.json"].backend = "memory";
          break;
        case "pool isolation false":
          files["rls-live-summary.json"].pool_context_isolated = false;
          break;
        case "SBOM missing":
          delete files["sbom.cyclonedx.json"];
          break;
        case "staging unknown":
          files["staging-summary.json"].status = "unknown";
          break;
        case "independent review REVISE": {
          const review = reviewDoc();
          review.verdict = "REVISE";
          docs = { review };
          break;
        }
        case "engineering 96": {
          const audit = auditDoc();
          for (const name of Object.keys(audit.domains)) {
            if (
              [
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
              ].includes(name)
            ) {
              audit.domains[name] = 96;
            }
          }
          audit.aaa_engineering = 96;
          docs = { audit };
          break;
        }
        case "operations 94": {
          const audit = auditDoc();
          for (const name of Object.keys(audit.domains)) {
            if (
              [
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
              ].includes(name)
            ) {
              audit.domains[name] = 94;
            }
          }
          audit.aaa_operations = 94;
          docs = { audit };
          break;
        }
        default:
          break;
      }
      if (_label === "digest mismatch") {
        await writeBundle(dir, files);
        const { appendFile } = await import("node:fs/promises");
        await appendFile(join(dir, "staging-summary.json"), " ");
      } else {
        await writeBundle(dir, files);
      }
      const child = await runVerifier(dir, [], docs);
      expect(child.code ?? 0).not.toBe(0);
    },
    120000,
  );
});
