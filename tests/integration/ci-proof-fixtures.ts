import {
  digest as sha256Hex,
  RLS_ASSERTIONS,
  syntheticSelectedAssertions,
  RLS_DESCRIBE,
} from "../../scripts/ci-proof-contract.mjs";
import type { sourceInventory } from "../../scripts/ci-proof-contract.mjs";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

// Neutral local zip bytes and an explicit transport double. This fixture
// proves verifier bindings, never real GitHub or release certification.
export async function makeClaimArchiveFixture(directory: string, sha: string) {
  const names = [
    "candidate-audit.json",
    "candidate-independent-review.json",
    "candidate-risk-register.json",
  ];
  await mkdir(join(directory, "release-evidence"));
  const paths = names.map((name) => join(directory, "release-evidence", name));
  for (const path of paths)
    await writeFile(
      path,
      JSON.stringify({
        classification: "synthetic noncertifying claim bytes",
        path,
      }),
    );
  const zip = join(directory, "claims.zip");
  await promisify(execFile)(
    "zip",
    ["-q", zip, ...names.map((name) => `release-evidence/${name}`)],
    { cwd: directory },
  );
  const archive = await readFile(zip);
  const run = {
    id: 123,
    run_attempt: 2,
    head_sha: sha,
    repository: { full_name: "ricardoakinaga-dev/cvg-trainee-vet" },
    path: ".github/workflows/candidate.yml",
    status: "completed",
    conclusion: "success",
    created_at: "2026-01-01T00:00:00Z",
    run_started_at: "2026-01-01T00:01:00Z",
    updated_at: "2026-01-01T00:03:00Z",
  };
  const api =
    "https://api.github.com/repos/ricardoakinaga-dev/cvg-trainee-vet/actions/artifacts/55";
  const artifact = {
    id: 55,
    name: `candidate-artifacts-${sha}`,
    expired: false,
    workflow_run: { id: 123, head_sha: sha, run_attempt: 2 },
    created_at: "2026-01-01T00:02:00Z",
    updated_at: "2026-01-01T00:02:30Z",
    url: api,
    archive_download_url: `${api}/zip`,
    digest: `sha256:${sha256Hex(archive)}`,
  };
  const fetchImpl: typeof fetch = async (url) =>
    String(url).endsWith("/zip")
      ? new Response(Uint8Array.from(archive))
      : new Response(
          JSON.stringify(
            String(url).endsWith("/attempts/2")
              ? run
              : { total_count: 1, artifacts: [artifact] },
          ),
        );
  return { paths, fetchImpl };
}

export function makeCiProofFixture(
  sha: string,
  measuredInventory: Awaited<ReturnType<typeof sourceInventory>>,
  measuredTools: Record<string, string>,
) {
  const pass = "PASS";
  const generatedAt = new Date(Date.now() - 1000).toISOString();
  const startedAt = new Date(Date.now() - 2000).toISOString();
  const runStartedAt = new Date(Date.now() - 60000).toISOString();
  const runCompletedAt = new Date().toISOString();
  const workflowRef =
    "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/main";
  const native = {
    measured_head: sha,
    generatedAt,
    measurement: {
      status: "VERIFIED",
      startedAt,
      completedAt: generatedAt,
      checkout: { before: true, after: true },
    },
  };
  const suite = "tests/integration/ratelimit-redis-live.test.ts";
  const rawLive = JSON.stringify({
    success: true,
    numTotalTests: 6,
    numPassedTests: 6,
    startTime: Date.parse(startedAt),
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults: [
      {
        name: `/synthetic-checkout/${suite}`,
        status: "passed",
        startTime: Date.parse(startedAt),
        endTime: Date.parse(generatedAt),
        assertionResults: Array.from({ length: 6 }, (_, i) => ({
          fullName: `synthetic invariant ${i}`,
          status: "passed",
        })),
      },
    ],
  });
  const rawLoad = JSON.stringify({
    metrics: {
      http_reqs: { count: 30 },
      checks: { fails: 0 },
      http_5xx_total: { count: 0 },
      errors: { thresholds: { "rate<0.05": false } },
      read_latency_ms: { thresholds: { "p(95)<800": false } },
      auth_rejected_latency_ms: { thresholds: { "p(95)<800": false } },
    },
  });
  const rawOtel = JSON.stringify({
    resourceSpans: [{ traceId: "a".repeat(32) }, { traceId: "b".repeat(32) }],
  });
  const workflowMetadata = (workflow: string) => ({
    repository: "ricardoakinaga-dev/cvg-trainee-vet",
    workflow_ref: `ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/${workflow}.yml@refs/heads/main`,
    ref: "refs/heads/main",
    created_at: runStartedAt,
    run_started_at: runStartedAt,
    updated_at: runCompletedAt,
  });
  const coverageReport = {
    total: {
      statements: { pct: 91.5, total: 1000, covered: 915, skipped: 0 },
      branches: { pct: 86.1, total: 1000, covered: 861, skipped: 0 },
      functions: { pct: 95.9, total: 1000, covered: 959, skipped: 0 },
      lines: { pct: 92.2, total: 1000, covered: 922, skipped: 0 },
    },
  };
  const rawCoverage = `${JSON.stringify(coverageReport, null, 2)}\n`;
  const execution = {
    status: "EXECUTED",
    exitCode: 0,
    startedAt,
    completedAt: generatedAt,
    checkoutRoot: "/measured-checkout",
    checkout: { before: true, after: true },
    ci: {
      run_id: 13,
      run_attempt: 2,
      repository: "ricardoakinaga-dev/cvg-trainee-vet",
      workflow_ref: workflowRef,
      ref: "refs/heads/main",
      executing_head: sha,
    },
  };
  const testInventory = [
    "packages/application/src/fixture.test.ts",
    "tests/integration/fixture.test.ts",
  ];
  const rlsInventory = ["tests/integration/rls-full-matrix.test.ts"];
  const rlsNames = [
    ...new Set(Object.values(RLS_ASSERTIONS)),
    "isolates staff reads by scope membership",
  ];
  const rawTests = (
    files: string[],
    names: string[],
    ancestorTitles: string[] = [],
  ) =>
    JSON.stringify({
      success: true,
      numTotalTests: files.length * names.length,
      numPassedTests: files.length * names.length,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      testResults: files.map((file) => ({
        name: `/measured-checkout/${file}`,
        status: "passed",
        startTime: Date.parse(startedAt),
        endTime: Date.parse(generatedAt),
        assertionResults: names.map((title) => ({
          fullName: [...ancestorTitles, title].join(" "),
          ancestorTitles,
          title,
          status: "passed",
        })),
      })),
    });
  const testRaw = rawTests(testInventory, ["case1", "case2", "case3", "case4"]);
  const rlsRaw = rawTests(rlsInventory, rlsNames, [RLS_DESCRIBE]);
  const inventoryBytes = JSON.stringify({
    files: testInventory,
    assertions: syntheticSelectedAssertions(testInventory),
  });
  const rlsInventoryBytes = JSON.stringify({
    files: rlsInventory,
    assertions: syntheticSelectedAssertions(rlsInventory),
  });
  const rawSecurity = JSON.stringify({
    audit: { advisories: {} },
    fullAudit: { advisories: {} },
    secretScan: {
      command: "pnpm verify:secrets",
      exitCode: 0,
      stdout: "clean",
    },
    remoteProof: {
      totalCount: 4,
      collectedAt: runCompletedAt,
      run: {
        id: 12,
        run_attempt: 2,
        head_sha: sha,
        repository: { full_name: "ricardoakinaga-dev/cvg-trainee-vet" },
        head_branch: "main",
        path: ".github/workflows/security.yml",
        event: "pull_request",
        status: "completed",
        conclusion: "success",
        run_started_at: runStartedAt,
        updated_at: runCompletedAt,
      },
      jobs: [
        "CodeQL javascript-typescript",
        "OSV scan",
        "Audit, secrets and SBOM",
        "Dependency review",
      ].map((name, index) => ({
        id: index + 1,
        name,
        run_id: 12,
        run_attempt: 2,
        head_sha: sha,
        started_at: startedAt,
        completed_at: generatedAt,
        status: "completed",
        conclusion: "success",
      })),
    },
  });
  return {
    "coverage-summary.json": {
      format: "cvg-coverage-summary/v1",
      status: pass,
      sha,
      generatedAt,
      total: coverageReport.total,
      report: coverageReport,
      raw_report: rawCoverage,
      measurement_provenance: {
        format: "cvg-coverage-provenance/v1",
        status: pass,
        sha,
        generatedAt,
        measured_head: sha,
        runner: "github-actions",
        checkout: { before: true, after: true },
        raw_sha256: sha256Hex(rawCoverage),
        report_sha256: sha256Hex(JSON.stringify(coverageReport)),
        measurement: {
          command: "vitest run --coverage",
          startedAt: new Date(Date.now() - 2000).toISOString(),
          completedAt: generatedAt,
          exitCode: 0,
        },
        ci: {
          run_id: 13,
          run_attempt: 2,
          repository: "ricardoakinaga-dev/cvg-trainee-vet",
          executing_head: sha,
          ref: "refs/heads/main",
          workflow_ref:
            "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/main",
        },
      },
    },
    "mutation-summary.json": {
      format: "cvg-mutation-summary/v1",
      sha,
      candidate_sha: sha,
      candidate_run_id: "candidate-run-1",
      manifest_path: "reports/mutation-bounded/candidate-run-1/manifest.json",
      manifest_sha256: "b".repeat(64),
      reports: [
        {
          scope: "authorization",
          path: "reports/mutation/mutation.json",
          sha256: "c".repeat(64),
        },
        {
          scope: "critical",
          path: "reports/mutation-critical/mutation.json",
          sha256: "d".repeat(64),
        },
        {
          scope: "worker",
          path: "reports/mutation-worker/mutation.json",
          sha256: "e".repeat(64),
        },
      ],
      closure_results: [
        {
          group: "authorization",
          path: "reports/mutation-bounded/candidate-run-1/authorization-closure.json",
          sha256: "f".repeat(64),
          status: "KILLED",
        },
        {
          group: "critical-worker",
          path: "reports/mutation-bounded/candidate-run-1/critical-worker-closure.json",
          sha256: "0".repeat(64),
          status: "KILLED",
        },
      ],
      total: 100,
      raw_killed: 80,
      equivalent_count: 5,
      verified_kills: 15,
      critical_real_survivors: 0,
      adjusted_score: 0.97,
      status: pass,
    },
    "test-summary.json": {
      format: "cvg-test-summary/v1",
      status: pass,
      sha,
      generatedAt,
      execution,
      executionStatus: "EXECUTED",
      executedTests: 8,
      rawReport: { path: "test-results.raw.json", sha256: sha256Hex(testRaw) },
      inventory: {
        path: "test-inventory.json",
        sha256: sha256Hex(inventoryBytes),
      },
      tests: {
        files: 2,
        passed: 8,
        skipped: 0,
        failed: 0,
        source: "vitest-json",
      },
    },
    "security-summary.json": {
      format: "cvg-security-summary/v2",
      audit: "pnpm audit --audit-level=high PASS",
      audit_result: {
        status: "PASS",
        parsed: true,
        command: "pnpm audit --audit-level=high",
        high: 0,
        critical: 0,
      },
      status: pass,
      sha,
      generatedAt,
      execution,
      rawReport: {
        path: "security-results.raw.json",
        sha256: sha256Hex(rawSecurity),
      },
      scannerRun: {
        run_id: 12,
        run_attempt: 2,
        sha,
        repository: "ricardoakinaga-dev/cvg-trainee-vet",
        workflow_path: ".github/workflows/security.yml",
        ref: "refs/heads/main",
        workflow_ref:
          "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/security.yml@refs/heads/main",
      },
      residual: { low: 0, moderate: 0, high: 0, critical: 0 },
      secret_scan: pass,
      codeql: pass,
      osv: pass,
      dependency_review: pass,
    },
    "rls-live-summary.json": {
      format: "cvg-rls-live-summary/v1",
      status: pass,
      sha,
      generatedAt,
      execution,
      executionStatus: "EXECUTED",
      executedTests: 7,
      suite: rlsInventory[0],
      tests: { files: 1, passed: 7, failed: 0, skipped: 0 },
      rawReport: { path: "rls-results.raw.json", sha256: sha256Hex(rlsRaw) },
      inventory: {
        path: "rls-inventory.json",
        sha256: sha256Hex(rlsInventoryBytes),
      },
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
      format: "cvg-redis-candidate-summary/v2",
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
      ...native,
      format: "cvg-staging-summary/v1",
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
    "otel-summary.json": {
      ...native,
      raw_sha256: sha256Hex(rawOtel),
      format: "cvg-otel-summary/v1",
      sha,
      status: pass,
      bytes: Buffer.byteLength(rawOtel),
      distinctTraces: 2,
    },
    "load-summary.json": {
      ...native,
      raw_sha256: sha256Hex(rawLoad),
      httpRequests: 30,
      checksFails: 0,
      format: "cvg-load-summary/v1",
      sha,
      status: pass,
      failed_checks: 0,
      http_5xx: 0,
    },
    "restore-summary.json": {
      format: "cvg-restore-summary/v2",
      status: pass,
      sha,
      markerVerified: true,
      targetIsolated: true,
      integrity_verified: true,
      verificationDurationMs: 444,
    },
    "remote-ci-summary.json": {
      format: "cvg-remote-ci-summary/v2",
      sha,
      phase: "promotion",
      authenticated: true,
      promotion_verified: true,
      quality: {
        ...workflowMetadata("quality"),
        status: pass,
        sha,
        run_id: 11,
        run_attempt: 2,
        workflow_path: ".github/workflows/quality.yml",
        execution_status: "completed",
        conclusion: "success",
      },
      security: {
        ...workflowMetadata("security"),
        status: pass,
        sha,
        run_id: 12,
        run_attempt: 2,
        workflow_path: ".github/workflows/security.yml",
        execution_status: "completed",
        conclusion: "success",
      },
      candidate: {
        ...workflowMetadata("candidate"),
        status: pass,
        sha,
        run_id: 13,
        run_attempt: 2,
        workflow_path: ".github/workflows/candidate.yml",
        execution_status: "completed",
        conclusion: "success",
      },
      all_same_sha: true,
      status: pass,
    },
    "sbom.cyclonedx.json": {
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      metadata: {},
      components: [{ name: "x", version: "1" }],
    },
    "provenance.json": {
      format: "cvg-release-provenance/v1",
      commit: sha,
      branch: "main",
      buildTimestamp: generatedAt,
      ...measuredInventory,
      tools: measuredTools,
      ci: {
        runId: "13",
        runAttempt: "2",
        workflowSha: sha,
        workflowRef:
          "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/main",
      },
    },
    "git-sha.txt": `${sha}\n`,
    "migration-head.txt": `${measuredInventory.migrationHead}\n`,
    "ci-runs.json": {
      format: "cvg-ci-runs/v1",
      authenticated: true,
      collectedAt: runCompletedAt,
      headSha: sha,
      evaluation: { ok: true, phase: "promotion" },
      runs: ["quality", "security", "candidate"].map((workflow, index) => ({
        workflow,
        id: index + 11,
        runAttempt: 2,
        workflowPath: `.github/workflows/${workflow}.yml`,
        repository: "ricardoakinaga-dev/cvg-trainee-vet",
        workflowRef:
          workflow === "candidate"
            ? workflowRef
            : `ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/${workflow}.yml@refs/heads/main`,
        ref: "refs/heads/main",
        createdAt: runStartedAt,
        runStartedAt,
        updatedAt: runCompletedAt,
        headSha: sha,
        status: "completed",
        conclusion: "success" as string | null,
        selfRun: false,
      })),
    },
    "multi-instance-summary.json": {
      ...native,
      format: "cvg-multi-instance-summary/v1",
      status: pass,
      sha,
      suite,
      executionFormat: "cvg-live-test-execution/v1",
      executedTests: 6,
      passedTests: 6,
      failedTests: 0,
      skippedTests: 0,
      exitCode: 0,
      startedAt,
      completedAt: generatedAt,
      report: "ratelimit-live-results.json",
      reportSha256: sha256Hex(rawLive),
    },
    "ratelimit-live-results.json": rawLive,
    "k6-summary.json": rawLoad,
    "otel-spans.json": rawOtel,
    "test-results.raw.json": testRaw,
    "rls-results.raw.json": rlsRaw,
    "test-inventory.json": inventoryBytes,
    "rls-inventory.json": rlsInventoryBytes,
    "security-results.raw.json": rawSecurity,
  };
}
