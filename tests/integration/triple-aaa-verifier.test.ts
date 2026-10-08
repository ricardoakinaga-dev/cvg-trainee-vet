import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createRestoreSummary,
  isRestoreSummaryV2,
} from "../../scripts/restore-summary-contract.mjs";
import { sourceInventory } from "../../scripts/ci-proof-contract.mjs";

import { makeCiProofFixture } from "./ci-proof-fixtures.js";

const execFileAsync = promisify(execFile);
function cliFailure(error: unknown) {
  if (
    error === null ||
    typeof error !== "object" ||
    !("code" in error) ||
    typeof error.code !== "number" ||
    !("stdout" in error) ||
    typeof error.stdout !== "string" ||
    !("stderr" in error) ||
    typeof error.stderr !== "string"
  )
    throw error;
  return { code: error.code, stdout: error.stdout, stderr: error.stderr };
}
const root = fileURLToPath(new URL("../../", import.meta.url));
const VERIFIER = join(root, "scripts/verify-triple-aaa.mjs");
const CANDIDATE_SHA = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
let checkout: string;
let measuredInventory: Awaited<ReturnType<typeof sourceInventory>>;
let measuredTools: Record<string, string>;
beforeAll(async () => {
  checkout = await mkdtemp(join(tmpdir(), "cvg-verifier-checkout-"));
  execFileSync("git", [
    "clone",
    "--quiet",
    "--shared",
    "--no-checkout",
    root,
    checkout,
  ]);
  execFileSync("git", ["checkout", "--quiet", CANDIDATE_SHA], {
    cwd: checkout,
  });
  measuredInventory = await sourceInventory(checkout);
  const declared = JSON.parse(
    await readFile(join(checkout, "package.json"), "utf8"),
  ).devDependencies;
  measuredTools = {
    node: process.version,
    pnpm: "10.33.0",
    typescript: declared.typescript,
    vitest: declared.vitest,
    eslint: declared.eslint,
    playwright: declared["@playwright/test"],
    drizzleKit: declared["drizzle-kit"],
  };
});
afterAll(async () => {
  await rm(checkout, { recursive: true, force: true });
});

/**
 * AAA-V6 §125.25/125.26 — negative + positive self-tests for the final
 * verifier. Each case builds a FULL synthetic fixture bundle in tmpdir
 * (never the real evidence dirs) and asserts the verifier's exit code
 * and verdict. Fixture bundles are marked synthetic and can never
 * certify the product (§125.26/27).
 */

function sha256Hex(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

// Fixtures intentionally admit malformed summaries for negative CLI probes.
// Required happy-path fields remain typed; deletion uses the actual JS API.
type FixtureData = ReturnType<typeof makeCiProofFixture>;
type FixtureFiles = Omit<
  FixtureData,
  | "coverage-summary.json"
  | "test-summary.json"
  | "restore-summary.json"
  | "remote-ci-summary.json"
  | "sbom.cyclonedx.json"
  | "otel-summary.json"
  | "multi-instance-summary.json"
> & {
  "coverage-summary.json": Partial<FixtureData["coverage-summary.json"]> & {
    total?: FixtureData["coverage-summary.json"]["report"]["total"];
  };
  "test-summary.json": Partial<FixtureData["test-summary.json"]> & {
    note?: string;
  };
  "restore-summary.json": FixtureData["restore-summary.json"] & {
    rtoMs?: number;
  };
  "remote-ci-summary.json": Omit<
    FixtureData["remote-ci-summary.json"],
    "candidate"
  > & {
    candidate: Omit<
      FixtureData["remote-ci-summary.json"]["candidate"],
      "conclusion"
    > & { conclusion: string | null };
  };
  "sbom.cyclonedx.json": Omit<
    FixtureData["sbom.cyclonedx.json"],
    "components"
  > & {
    components: {
      name: string;
      version: string;
      description?: string;
      evidence?: { location: string };
    }[];
  };
  "otel-summary.json": Partial<FixtureData["otel-summary.json"]>;
  "multi-instance-summary.json": Partial<
    FixtureData["multi-instance-summary.json"]
  >;
};
function baseFiles(sha = CANDIDATE_SHA): FixtureFiles {
  return makeCiProofFixture(sha, measuredInventory, measuredTools);
}

function auditDoc() {
  const domains: Record<string, number> = {};
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
  ]) {
    domains[name] = 95;
  }
  for (const name of [
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
  ]) {
    domains[name] = 95;
  }
  return {
    version: "v6",
    candidate_sha: CANDIDATE_SHA,
    evidence_sha: CANDIDATE_SHA,
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
    candidate_sha: CANDIDATE_SHA,
    verdict: "PASS",
    reviewer: "synthetic",
    generated_at: new Date().toISOString(),
  };
}

async function writeBundle(dir: string, files: Record<string, unknown>) {
  await mkdir(dir, { recursive: true });
  const digests: Record<string, string> = {};
  const manifest: { path: string; sha256: string }[] = [];
  for (const [name, content] of Object.entries(files)) {
    const text =
      typeof content === "string"
        ? content
        : `${JSON.stringify(content, null, 2)}\n`;
    await writeFile(join(dir, name), text);
    if (name !== "artifact-digests.json" && name !== "manifest.json") {
      const digest = sha256Hex(text);
      digests[name] = digest;
      manifest.push({ path: name, sha256: digest });
    }
  }
  await writeFile(
    join(dir, "artifact-digests.json"),
    `${JSON.stringify(digests, null, 2)}\n`,
  );
  manifest.push({
    path: "artifact-digests.json",
    sha256: sha256Hex(`${JSON.stringify(digests, null, 2)}\n`),
  });
  await writeFile(
    join(dir, "manifest.json"),
    `${JSON.stringify({ format: "cvg-release-evidence/v1", commit: CANDIDATE_SHA, artifacts: manifest }, null, 2)}\n`,
  );
}

async function runVerifier(
  dir: string,
  extraArgs: string[] = [],
  docs: Partial<{
    audit: ReturnType<typeof auditDoc>;
    register: unknown;
    review: ReturnType<typeof reviewDoc>;
  }> = {},
  fixtureMode = true,
  extraEnv: Record<string, string> = {},
) {
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
      CANDIDATE_SHA,
      "--out",
      join(dir, "triple-aaa-verdict.json"),
      "--audit",
      auditPath,
      "--register",
      registerPath,
      "--review",
      reviewPath,
      ...(fixtureMode ? ["--fixture-mode"] : []),
      ...extraArgs,
    ],
    {
      cwd: checkout,
      timeout: 120000,
      env: {
        ...process.env,
        ...extraEnv,
        EXPECTED_SHA: CANDIDATE_SHA,
        GITHUB_ACTIONS: "true",
        GITHUB_RUN_ID: extraArgs.includes("--preflight") ? "13" : "99",
        GITHUB_RUN_ATTEMPT: extraArgs.includes("--preflight") ? "2" : "1",
        GITHUB_REPOSITORY: "ricardoakinaga-dev/cvg-trainee-vet",
        GITHUB_SHA: CANDIDATE_SHA,
        GITHUB_WORKFLOW_REF:
          "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/main",
      },
    },
  )
    .then((result) => ({ ...result, code: 0 }))
    .catch(cliFailure);
  return child;
}

describe("triple-aaa verifier self-tests", () => {
  it.each([
    "original residual",
    "zero residuals",
    "matching source identity",
    "empty object",
    "wrong entries key",
    "empty with declared residual",
    "entries object",
    "duplicate identity",
    "unknown severity",
    "blank mitigation",
    "nonboolean acceptance",
    "nonboolean material",
    "wrong candidate identity",
    "wrong finding identity",
    "wrong finding count",
    "malformed findings source",
  ])("R10 current CLI reconciles residual risk: %s", async (scenario) => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r10-risk-"));
    try {
      const audit = auditDoc();
      let register: unknown = registerDoc();
      const baseline = registerDoc();
      if (scenario === "zero residuals") {
        audit.p2 = 0;
        register = { ...baseline, entries: [] };
      }
      if (scenario === "empty object") register = {};
      if (scenario === "wrong entries key")
        register = { format: baseline.format, entry: baseline.entries };
      if (scenario === "empty with declared residual")
        register = { ...baseline, entries: [] };
      if (scenario === "entries object")
        register = { ...baseline, entries: {} };
      if (scenario === "duplicate identity")
        register = {
          ...baseline,
          entries: [...baseline.entries, ...baseline.entries],
        };
      const first = baseline.entries[0]!;
      if (scenario === "matching source identity")
        Reflect.set(audit, "findings", [
          { id: first.id, severity: first.severity },
        ]);
      if (scenario === "unknown severity") first.severity = "P7";
      if (scenario === "blank mitigation") first.mitigation = "   ";
      if (scenario === "nonboolean acceptance")
        Reflect.set(first, "accepted_risk", "true");
      if (scenario === "nonboolean material")
        Reflect.set(first, "material", "false");
      if (
        [
          "unknown severity",
          "blank mitigation",
          "nonboolean acceptance",
          "nonboolean material",
        ].includes(scenario)
      )
        register = baseline;
      if (scenario === "wrong candidate identity")
        register = { ...baseline, candidate_sha: "f".repeat(40) };
      if (scenario === "wrong finding identity")
        Reflect.set(audit, "findings", [
          { id: "different-risk", severity: "P2" },
        ]);
      if (scenario === "wrong finding count")
        Reflect.set(audit, "findings", []);
      if (scenario === "malformed findings source")
        Reflect.set(audit, "findings", {});
      await writeBundle(dir, baseFiles());
      const result = await runVerifier(dir, [], { audit, register });
      expect(result.code).toBe(
        [
          "original residual",
          "zero residuals",
          "matching source identity",
        ].includes(scenario)
          ? 0
          : 1,
      );
      const verdict = JSON.parse(
        await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
      );
      expect(verdict.synthetic_verifier_test).toBe(true);
      if (result.code !== 0) expect(verdict.verdict).not.toBe("PASS");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it.each(
    ["p0", "p1", "p2"].flatMap((field) =>
      [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, null, "0"].map((value) => ({
        field,
        value,
      })),
    ),
  )(
    "R10 current CLI rejects invalid counter $field=$value",
    async ({ field, value }) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r10-count-"));
      try {
        const audit = auditDoc();
        Reflect.set(audit, field, value);
        await writeBundle(dir, baseFiles());
        const result = await runVerifier(dir, [], { audit });
        expect(result.code, `${field}=${String(value)}`).toBe(1);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it("R7 refuses unmarked self-consistent claims in real mode without authenticated remote bytes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r7-unmarked-"));
    try {
      await writeBundle(dir, baseFiles());
      const result = await runVerifier(dir, [], {}, false, {
        CVG_MUTATION_CANDIDATE_ID: "candidate-run-1",
        GH_TOKEN: "",
        GITHUB_TOKEN: "",
      });
      const verdict = JSON.parse(
        await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
      );
      expect(result.code).toBe(1);
      expect(verdict.readiness).toBe("NOT_VERIFIED");
      expect(verdict.verdict).not.toBe("PASS");
      expect(result.stderr).toContain(
        "remote execution trust root unavailable",
      );
      expect(verdict.synthetic_verifier_test).toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it.each([
    "valid local proof",
    "forged provenance",
    "invented migration",
    "zero coverage",
    "missing k6 inventory",
    "empty k6 inventory",
    "forged test count",
    "unexecuted RLS",
    "wrong scanner identity",
  ])("R7 complete public consumer baseline: %s", async (scenario) => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r7-complete-"));
    try {
      const files = baseFiles();
      if (scenario === "forged provenance") {
        files["provenance.json"].lockfileSha256 = "0".repeat(64);
        files["provenance.json"].treeDigest = "0".repeat(64);
        files["provenance.json"].workspaceManifests = {
          "package.json": "0".repeat(64),
        };
      }
      if (scenario === "invented migration") {
        files["provenance.json"].migrationHead = "9999_never_applied";
        files["provenance.json"].migrationFiles = 9999;
        files["migration-head.txt"] = "9999_never_applied\n";
      }
      if (scenario === "zero coverage") {
        const coverage = files["coverage-summary.json"];
        if (!coverage.report || !coverage.measurement_provenance)
          throw new Error("complete coverage fixture required");
        for (const metric of Object.values(coverage.report.total))
          Object.assign(metric, { pct: 100, total: 0, covered: 0, skipped: 0 });
        coverage.raw_report = JSON.stringify(coverage.report);
        coverage.measurement_provenance.raw_sha256 = sha256Hex(
          coverage.raw_report,
        );
        coverage.measurement_provenance.report_sha256 = sha256Hex(
          JSON.stringify(coverage.report),
        );
      }
      if (
        scenario === "missing k6 inventory" ||
        scenario === "empty k6 inventory"
      ) {
        const raw = JSON.parse(files["k6-summary.json"]);
        for (const name of [
          "errors",
          "read_latency_ms",
          "auth_rejected_latency_ms",
        ]) {
          if (scenario === "missing k6 inventory")
            Reflect.deleteProperty(raw.metrics, name);
          else raw.metrics[name].thresholds = {};
        }
        files["k6-summary.json"] = JSON.stringify(raw);
        files["load-summary.json"].raw_sha256 = sha256Hex(
          files["k6-summary.json"],
        );
      }
      if (scenario === "forged test count" && files["test-summary.json"].tests)
        files["test-summary.json"].tests.passed = 999999;
      if (scenario === "unexecuted RLS") {
        files["rls-live-summary.json"].executionStatus = "NOT_EXECUTED";
        files["rls-live-summary.json"].executedTests = 0;
      }
      if (scenario === "wrong scanner identity")
        files["security-summary.json"].scannerRun.run_id = 999999;
      await writeBundle(dir, files);
      const result = await runVerifier(dir);
      const verdict = JSON.parse(
        await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
      );
      if (scenario === "valid local proof") {
        expect(result.code).toBe(0);
        expect(verdict).toMatchObject({
          verdict: "PASS",
          synthetic_verifier_test: true,
          proof_scope: "SYNTHETIC_LOCAL_INTEGRITY",
        });
      } else {
        expect(result.code).toBe(1);
        expect(verdict.readiness).toBe("NOT_VERIFIED");
        expect(result.stderr).toMatch(
          /provenance|coverage|load decisions|test raw|security raw/u,
        );
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it.each([
    ["legacy false", { "p(95)<500": false }, true],
    ["legacy true", { "p(95)<500": true }, false],
    ["object true", { "p(95)<500": { ok: true } }, true],
    ["object false", { "p(95)<500": { ok: false } }, false],
    ["mixed failure", { "p(95)<500": false, "p(99)<1000": true }, false],
    ["unknown string", { "p(95)<500": "false" }, false],
    ["unknown number", { "p(95)<500": 0 }, false],
    ["unknown null", { "p(95)<500": null }, false],
    ["unknown array", { "p(95)<500": [] }, false],
    ["unknown object", { "p(95)<500": {} }, false],
    ["unknown ok type", { "p(95)<500": { ok: "true" } }, false],
    ["null container", null, false],
    ["string container", "false", false],
    ["array container", [false], false],
  ] as const)(
    "R6 k6 original threshold schema through public CLI: %s",
    async (_scenario, thresholds, passed) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r6-k6-"));
      try {
        const files = baseFiles();
        files["k6-summary.json"] = JSON.stringify({
          metrics: {
            http_reqs: { count: 30 },
            checks: { fails: 0 },
            http_5xx_total: { count: 0 },
            errors: { thresholds: { "rate<0.05": false } },
            read_latency_ms: { thresholds: { "p(95)<800": false } },
            auth_rejected_latency_ms: { thresholds: { "p(95)<800": false } },
            http_req_duration: { thresholds },
          },
        });
        files["load-summary.json"].raw_sha256 = sha256Hex(
          files["k6-summary.json"],
        );
        const originalLoad = JSON.stringify(files["load-summary.json"]);
        await writeBundle(dir, files);
        const strictProgram = `
          import { validateBundle } from ${JSON.stringify(join(root, "scripts/release-evidence.mjs"))};
          const failures = await validateBundle(process.argv[1], {
            strict: true, head: process.argv[2], syntheticFixtureMode: true,
            expectedMutationRunId: process.argv[3]
            , testInventory: ["packages/application/src/fixture.test.ts", "tests/integration/fixture.test.ts"]
          });
          console.log(JSON.stringify(failures));
          process.exitCode = failures.length === 0 ? 0 : 1;
        `;
        const strict = await execFileAsync(
          process.execPath,
          [
            "--input-type=module",
            "--eval",
            strictProgram,
            dir,
            CANDIDATE_SHA,
            files["mutation-summary.json"].candidate_run_id,
          ],
          {
            cwd: checkout,
            env: {
              ...process.env,
              EXPECTED_SHA: CANDIDATE_SHA,
              GITHUB_ACTIONS: "true",
              GITHUB_RUN_ID: "99",
              GITHUB_RUN_ATTEMPT: "1",
              GITHUB_REPOSITORY: "ricardoakinaga-dev/cvg-trainee-vet",
              GITHUB_SHA: CANDIDATE_SHA,
              GITHUB_WORKFLOW_REF:
                "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/main",
            },
          },
        )
          .then((result) => ({ ...result, code: 0 }))
          .catch(cliFailure);
        expect(strict.code).toBe(passed ? 0 : 1);
        if (!passed)
          expect(JSON.parse(strict.stdout)).toContainEqual(
            expect.stringContaining(
              "load decisions disagree with original metrics",
            ),
          );
        const result = await runVerifier(dir);
        const verdict = JSON.parse(
          await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
        );
        expect(result.code).toBe(passed ? 0 : 1);
        expect(verdict.readiness).toBe(
          passed ? "STAGING_VERIFIED" : "NOT_VERIFIED",
        );
        expect(await readFile(join(dir, "k6-summary.json"), "utf8")).toBe(
          files["k6-summary.json"],
        );
        expect(
          JSON.parse(await readFile(join(dir, "load-summary.json"), "utf8")),
        ).toEqual(JSON.parse(originalLoad));
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    120000,
  );

  it.each([
    "positive",
    "native absent",
    "native dirty",
    "native wrong head",
    "native reversed time",
    "native raw absent",
    "native raw tampered",
    "load raw contradiction",
    "otel raw contradiction",
    "live zero",
    "live skipped",
    "live unrelated",
    "live report mismatch",
    "live incomplete",
    "audit negative",
    "audit typed negative",
    "coverage before run",
    "coverage wrong ref",
    "coverage wrong executing head",
  ])(
    "R5 actual CLI cryptographic native/CI decision contract: %s",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r5-contract-"));
      try {
        const files = baseFiles();
        const load = files["load-summary.json"];
        const coverage = files["coverage-summary.json"].measurement_provenance;
        if (coverage === undefined) throw new Error("proof required");
        if (scenario === "native absent")
          Reflect.deleteProperty(load, "measurement");
        if (scenario === "native dirty")
          load.measurement.checkout.after = false;
        if (scenario === "native wrong head")
          load.measured_head = "b".repeat(40);
        if (scenario === "native reversed time")
          load.measurement.startedAt = "2099-01-01T00:00:00Z";
        if (scenario === "native raw absent")
          Reflect.deleteProperty(files, "k6-summary.json");
        if (scenario === "native raw tampered") files["k6-summary.json"] += " ";
        if (scenario === "load raw contradiction") {
          files["k6-summary.json"] = JSON.stringify({
            metrics: { checks: { fails: 1 }, http_reqs: { count: 30 } },
          });
          load.raw_sha256 = sha256Hex(files["k6-summary.json"]);
        }
        if (scenario === "otel raw contradiction")
          files["otel-summary.json"].distinctTraces = 999;
        if (scenario === "live zero")
          files["multi-instance-summary.json"].executedTests = 0;
        if (scenario === "live skipped")
          files["multi-instance-summary.json"].skippedTests = 1;
        if (scenario === "live unrelated")
          files["multi-instance-summary.json"].suite =
            "tests/integration/unrelated.test.ts";
        if (scenario === "live report mismatch")
          files["multi-instance-summary.json"].reportSha256 = "f".repeat(64);
        if (scenario === "live incomplete") {
          files["ratelimit-live-results.json"] = JSON.stringify({
            success: true,
            numTotalTests: 1,
            numPassedTests: 1,
            startTime: Date.parse(load.measurement.startedAt),
            numFailedTests: 0,
            numPendingTests: 0,
            numTodoTests: 0,
            testResults: [
              {
                name: "/synthetic-checkout/tests/integration/ratelimit-redis-live.test.ts",
                status: "passed",
                startTime: Date.parse(load.measurement.startedAt),
                endTime: Date.parse(load.measurement.completedAt),
                assertionResults: [
                  { fullName: "synthetic one invariant", status: "passed" },
                ],
              },
            ],
          });
          Object.assign(files["multi-instance-summary.json"], {
            executedTests: 1,
            passedTests: 1,
            reportSha256: sha256Hex(files["ratelimit-live-results.json"]),
          });
        }
        if (scenario === "audit negative")
          files["security-summary.json"].audit = "pnpm audit FAIL/unknown";
        if (scenario === "audit typed negative")
          files["security-summary.json"].audit_result.status = "FAIL";
        if (scenario === "coverage before run") {
          coverage.measurement.startedAt = "2000-01-01T00:00:00Z";
          coverage.measurement.completedAt = "2000-01-01T00:01:00Z";
          coverage.generatedAt = coverage.measurement.completedAt;
          files["coverage-summary.json"].generatedAt = coverage.generatedAt;
        }
        if (scenario === "coverage wrong ref")
          coverage.ci.workflow_ref =
            "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/unrelated";
        if (scenario === "coverage wrong executing head")
          coverage.ci.executing_head = "b".repeat(40);
        await writeBundle(dir, files); // Recompute all real bytes/digests after the adversarial change.
        const result = await runVerifier(dir);
        const verdict = JSON.parse(
          await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
        );
        expect(result.code).toBe(scenario === "positive" ? 0 : 1);
        expect(verdict.readiness).toBe(
          scenario === "positive" ? "STAGING_VERIFIED" : "NOT_VERIFIED",
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it.each(["runtime filename", "claim value", "generic claim key"])(
    "R4 real-mode coverage screen distinguishes inventory from claims: %s",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r4-screen-"));
      try {
        const files = baseFiles();
        const coverage = files["coverage-summary.json"];
        if (!coverage.report || !coverage.measurement_provenance)
          throw new Error("coverage fixture incomplete");
        Object.assign(coverage.report, {
          [join(checkout, "apps/api/src/http-boundary/fixtures.ts")]: {
            ...coverage.report.total,
            ...(scenario === "claim value" ? { note: "synthetic claim" } : {}),
          },
          ...(scenario === "generic claim key"
            ? { "synthetic-claim": { status: "PASS" } }
            : {}),
        });
        coverage.raw_report = JSON.stringify(coverage.report);
        coverage.measurement_provenance.raw_sha256 = sha256Hex(
          coverage.raw_report,
        );
        coverage.measurement_provenance.report_sha256 = sha256Hex(
          JSON.stringify(coverage.report),
        );
        await writeBundle(dir, files);
        const result = await runVerifier(dir, [], {}, false);
        expect(result.code).toBe(1);
        const verdict = JSON.parse(
          await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
        );
        expect(verdict.verdict).toBe(
          scenario === "runtime filename" ? "REVISE" : "FAIL",
        );
        expect(verdict.readiness).toBe("NOT_VERIFIED");
        if (scenario === "runtime filename") {
          expect(result.stderr).not.toContain("forgery");
          expect(result.stderr).toContain(
            "current candidate mutation run id is required",
          );
        } else expect(result.stderr).toContain("evidence forgery screen");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it.each([
    "valid",
    "raw bytes",
    "report bytes",
    "missing proof",
    "wrong producer",
    "wrong attempt",
    "wrong workflow",
    "failed measurement",
    "missing provenance attempt",
    "mismatched ci-runs",
  ])(
    "R4 strict measured-run proof recomputes real bundle bytes: %s",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r4-measured-"));
      try {
        const files = baseFiles();
        const coverage = files["coverage-summary.json"];
        if (
          !coverage.measurement_provenance ||
          !coverage.report ||
          !coverage.raw_report
        )
          throw new Error("coverage fixture incomplete");
        switch (scenario) {
          case "raw bytes":
            coverage.raw_report += " ";
            break;
          case "report bytes":
            coverage.report.total.lines.pct += 0.1;
            break;
          case "missing proof":
            Reflect.deleteProperty(coverage, "measurement_provenance");
            break;
          case "wrong producer":
            coverage.measurement_provenance.ci.run_id = 99;
            break;
          case "wrong attempt":
            coverage.measurement_provenance.ci.run_attempt = 3;
            break;
          case "wrong workflow":
            coverage.measurement_provenance.ci.workflow_ref =
              "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/quality.yml@refs/heads/main";
            break;
          case "failed measurement":
            coverage.measurement_provenance.measurement.exitCode = 1;
            break;
          case "missing provenance attempt":
            Reflect.deleteProperty(files["provenance.json"].ci, "runAttempt");
            break;
          case "mismatched ci-runs": {
            const candidate = files["ci-runs.json"].runs.find(
              (run) => run.workflow === "candidate",
            );
            if (!candidate) throw new Error("candidate fixture missing");
            candidate.runAttempt = 3;
            break;
          }
        }
        await writeBundle(dir, files);
        const result = await runVerifier(dir);
        expect(result.code).toBe(scenario === "valid" ? 0 : 1);
        const verdict = JSON.parse(
          await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
        );
        expect(verdict.assurance.release_evidence).toBe(
          scenario === "valid" ? "PASS" : "FAIL",
        );
        expect(verdict.readiness).toBe(
          scenario === "valid" ? "STAGING_VERIFIED" : "NOT_VERIFIED",
        );
        if (scenario !== "valid")
          expect(result.stderr).toMatch(
            /coverage measurement|provenance|ci-runs/u,
          );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it.each([
    "valid",
    "different workflow SHA",
    "pending final",
    "unauthenticated",
    "wrong provenance",
    "unlisted payload",
  ])("R4 F03 strict Node boundary: %s", async (scenario) => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r4-strict-"));
    try {
      const files = baseFiles();
      if (scenario === "pending final") {
        files["remote-ci-summary.json"].phase = "preflight";
        files["remote-ci-summary.json"].candidate.status = "pending";
        files["remote-ci-summary.json"].candidate.execution_status =
          "in_progress";
        files["remote-ci-summary.json"].candidate.conclusion = null;
      }
      if (scenario === "unauthenticated")
        files["remote-ci-summary.json"].authenticated = false;
      if (scenario === "wrong provenance")
        files["provenance.json"].commit = "b".repeat(40);
      await writeBundle(dir, files);
      if (scenario === "unlisted payload")
        await writeFile(
          join(dir, "unexpected-payload.json"),
          '{"status":"PASS"}\n',
        );
      const result = await execFileAsync(
        "node",
        [
          "--input-type=module",
          "-e",
          `import { validateBundle } from ${JSON.stringify(join(root, "scripts/release-evidence.mjs"))}; const failures = await validateBundle(process.argv[1], { strict: true, head: process.argv[2], phase: "promotion", syntheticFixtureMode: true, expectedMutationRunId: "candidate-run-1", testInventory: ["packages/application/src/fixture.test.ts", "tests/integration/fixture.test.ts"] }); console.log(JSON.stringify(failures)); process.exitCode = failures.length ? 1 : 0;`,
          dir,
          CANDIDATE_SHA,
        ],
        {
          cwd: checkout,
          env: {
            ...process.env,
            EXPECTED_SHA: CANDIDATE_SHA,
            GITHUB_ACTIONS: "true",
            GITHUB_RUN_ID: "99",
            GITHUB_RUN_ATTEMPT: "1",
            GITHUB_REPOSITORY: "ricardoakinaga-dev/cvg-trainee-vet",
            GITHUB_SHA:
              scenario === "different workflow SHA"
                ? "b".repeat(40)
                : CANDIDATE_SHA,
            GITHUB_WORKFLOW_REF:
              "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/main",
          },
        },
      )
        .then((result) => ({ ...result, code: 0 }))
        .catch(cliFailure);
      const valid = ["valid", "different workflow SHA"].includes(scenario);
      expect(result.code).toBe(valid ? 0 : 1);
      const failures: string[] = JSON.parse(result.stdout);
      if (valid) expect(failures).toEqual([]);
      else expect(failures.join(" ")).toMatch(/remote|provenance|unlisted/u);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it.each([
    ["otel-summary.json", "sha"],
    ["load-summary.json", "sha"],
    ["multi-instance-summary.json", "sha"],
    ["coverage-summary.json", "format"],
    ["security-summary.json", "format"],
    ["otel-summary.json", "format"],
    ["load-summary.json", "format"],
    ["rls-live-summary.json", "format"],
    ["redis-candidate-summary.json", "format"],
    ["staging-summary.json", "format"],
    ["multi-instance-summary.json", "format"],
  ] as const)(
    "R4 rejects missing %s %s with recomputed byte digests",
    async (file, field) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r4-schema-"));
      try {
        const files = baseFiles();
        Reflect.deleteProperty(files[file], field);
        await writeBundle(dir, files);
        expect((await runVerifier(dir)).code).not.toBe(0);
        const verdict = JSON.parse(
          await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
        );
        expect(verdict.readiness).toBe("NOT_VERIFIED");
        expect(verdict.assurance.release_evidence).toBe("FAIL");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );

  it.each([
    { triple_aaa: "REVISE", readiness: "NOT_VERIFIED" },
    { triple_aaa: "FAIL", readiness: "STAGING_VERIFIED" },
    { triple_aaa: "PASS", readiness: "NOT_VERIFIED" },
  ])("R4 rejects contradictory audit decision %j", async (decision) => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r4-audit-"));
    try {
      await writeBundle(dir, baseFiles());
      const result = await runVerifier(dir, [], {
        audit: { ...auditDoc(), ...decision },
      });
      expect(result.code).not.toBe(0);
      const verdict = JSON.parse(
        await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
      );
      expect(verdict.readiness).toBe("NOT_VERIFIED");
      expect(result.stderr).toContain("audit decision/readiness");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it.each(["valid", "missing", "stale", "failure"])(
    "candidate public CLI reads canonical bundled RLS: %s",
    async (scenario) => {
      const sandbox = await mkdtemp(join(tmpdir(), "cvg-r3-candidate-"));
      try {
        await cp(join(root, "scripts"), join(sandbox, "scripts"), {
          recursive: true,
        });
        await cp(join(root, "config"), join(sandbox, "config"), {
          recursive: true,
        });
        await writeFile(join(sandbox, "package.json"), '{"type":"module"}\n');
        await writeFile(
          join(sandbox, ".gitignore"),
          "release-evidence/\nstaging-evidence/\n",
        );
        for (const args of [
          ["init", "--quiet"],
          ["config", "user.email", "synthetic@example.invalid"],
          ["config", "user.name", "Synthetic"],
          ["add", "."],
          ["commit", "--quiet", "-m", "synthetic candidate scripts"],
        ])
          execFileSync("git", args, { cwd: sandbox });
        const sha = execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: sandbox,
          encoding: "utf8",
        }).trim();
        await mkdir(join(sandbox, "release-evidence"));
        if (scenario !== "missing")
          await writeFile(
            join(sandbox, "release-evidence/rls-live-summary.json"),
            JSON.stringify({
              ...baseFiles(sha)["rls-live-summary.json"],
              sha: scenario === "stale" ? "b".repeat(40) : sha,
              status: scenario === "failure" ? "FAIL" : "PASS",
            }),
          );
        const bin = await mkdtemp(join(tmpdir(), "cvg-r3-offline-pnpm-"));
        try {
          await writeFile(
            join(bin, "pnpm"),
            "#!/bin/sh\nprintf '%s' '{\"advisories\":{}}'\n",
            { mode: 0o700 },
          );
          const child = await execFileAsync(
            process.execPath,
            [join(sandbox, "scripts/verify-aaa-candidate.mjs")],
            {
              cwd: sandbox,
              timeout: 30000,
              env: {
                ...process.env,
                PATH: `${bin}:${process.env.PATH}`,
                GH_TOKEN: "",
                GITHUB_TOKEN: "",
              },
            },
          )
            .then((result) => ({ ...result, code: 0 }))
            .catch(cliFailure);
          expect(child.code ?? 0).toBe(1); // Other assurance gates remain absent; this is a discriminant RLS input probe.
          const output = `${child.stdout}${child.stderr}`;
          if (scenario === "valid")
            expect(output).toContain("ok: RLS live matrix PASS");
          else expect(output).toContain("FAIL: RLS live matrix PASS");
        } finally {
          await rm(bin, { recursive: true, force: true });
        }
      } finally {
        await rm(sandbox, { recursive: true, force: true });
      }
    },
    120000,
  );
  it("writes the v2 partial verification duration contract", () => {
    const summary = createRestoreSummary({
      result: {
        status: "PASS",
        markerVerified: true,
        targetIsolated: true,
        verificationDurationMs: 444,
      },
      sha: "a".repeat(40),
      generatedAt: "2026-10-02T12:00:00.000Z",
    });

    expect(summary).toMatchObject({
      format: "cvg-restore-summary/v2",
      status: "PASS",
      integrity_verified: true,
      verificationDurationMs: 444,
    });
    expect(summary).not.toHaveProperty("rtoMs");
    expect(isRestoreSummaryV2(summary)).toBe(true);
    expect(isRestoreSummaryV2({ ...summary, rtoMs: 444 })).toBe(false);
    expect(isRestoreSummaryV2({ ...summary, sha: undefined })).toBe(false);
    expect(isRestoreSummaryV2({ ...summary, targetIsolated: false })).toBe(
      false,
    );
    expect(isRestoreSummaryV2({ ...summary, markerVerified: false })).toBe(
      false,
    );
    expect(() =>
      createRestoreSummary({
        result: {
          status: "PASS",
          markerVerified: true,
          targetIsolated: true,
          verificationDurationMs: 444,
        },
        sha: "invalid",
        generatedAt: "2026-10-02T12:00:00.000Z",
      }),
    ).toThrow("restore summary SHA is invalid");

    const nonisolated = createRestoreSummary({
      result: {
        status: "PASS",
        markerVerified: true,
        targetIsolated: false,
        verificationDurationMs: 444,
      },
      sha: "a".repeat(40),
      generatedAt: "2026-10-02T12:00:00.000Z",
    });
    expect(nonisolated).toMatchObject({
      status: "FAIL",
      integrity_verified: false,
      targetIsolated: false,
    });
  });

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
    expect(verdict.readiness).toBe("STAGING_VERIFIED");
    expect(verdict.evidence_sha).toBe(CANDIDATE_SHA);
  }, 120000);

  it.each([
    "empty digests",
    "omitted digest",
    "unhashed manifest",
    "test status absent",
    "otel empty",
    "multi-instance empty",
    "otel counters missing",
    "multi-instance suite missing",
    "duplicate manifest entry",
    "digest index unhashed",
    "missing both inventories",
    "digest traversal",
    ...[
      "coverage",
      "test",
      "security",
      "rls-live",
      "multi-instance",
      "load",
      "otel",
      "mutation",
      "redis-candidate",
      "staging",
      "restore",
      "remote-ci",
    ].map((name) => `incomplete ${name}-summary.json`),
  ])(
    "strict public bundle CLI refuses %s with recomputed manifest hashes",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r3-bundle-"));
      try {
        const files = baseFiles();
        if (scenario === "test status absent")
          delete files["test-summary.json"].status;
        if (scenario === "otel empty") files["otel-summary.json"] = {};
        if (scenario === "multi-instance empty")
          files["multi-instance-summary.json"] = {};
        if (scenario === "otel counters missing")
          files["otel-summary.json"] = { status: "PASS" };
        if (scenario === "multi-instance suite missing")
          files["multi-instance-summary.json"] = {
            status: "PASS",
            sha: CANDIDATE_SHA,
          };
        if (scenario.startsWith("incomplete "))
          Reflect.set(files, scenario.slice("incomplete ".length), {
            status: "PASS",
            sha: CANDIDATE_SHA,
          });
        await writeBundle(dir, files);
        if (
          [
            "empty digests",
            "omitted digest",
            "unhashed manifest",
            "duplicate manifest entry",
            "digest index unhashed",
            "missing both inventories",
            "digest traversal",
          ].includes(scenario)
        ) {
          const digests: Record<string, string> = JSON.parse(
            await readFile(join(dir, "artifact-digests.json"), "utf8"),
          );
          const manifest: { artifacts: { path: string; sha256?: string }[] } =
            JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
          if (scenario === "empty digests")
            for (const key of Object.keys(digests)) delete digests[key];
          if (scenario === "omitted digest")
            delete digests["test-summary.json"];
          if (scenario === "missing both inventories") {
            delete digests["test-summary.json"];
            manifest.artifacts = manifest.artifacts.filter(
              (entry) => entry.path !== "test-summary.json",
            );
          }
          if (scenario === "digest traversal")
            digests["../outside.json"] = "a".repeat(64);
          if (scenario === "duplicate manifest entry") {
            const entry = manifest.artifacts[0];
            if (entry === undefined)
              throw new Error("manifest fixture inventory absent");
            manifest.artifacts.push({ ...entry });
          }
          const raw = `${JSON.stringify(digests, null, 2)}\n`;
          await writeFile(join(dir, "artifact-digests.json"), raw);
          for (const entry of manifest.artifacts) {
            if (entry.path === "artifact-digests.json")
              entry.sha256 = sha256Hex(raw);
            if (
              scenario === "unhashed manifest" &&
              entry.path === "test-summary.json"
            )
              delete entry.sha256;
            if (
              scenario === "digest index unhashed" &&
              entry.path === "artifact-digests.json"
            )
              delete entry.sha256;
          }
          await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest));
        }
        const child = await runVerifier(dir);
        expect(child.code).toBe(1);
        const verdict = JSON.parse(
          await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
        );
        expect(verdict.readiness).toBe("NOT_VERIFIED");
        expect(verdict.assurance.release_evidence).toBe("FAIL");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    120000,
  );

  it("separates known-good executing preflight from final promotion", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-preflight-bundle-"));
    try {
      const files = baseFiles();
      files["remote-ci-summary.json"].phase = "preflight";
      files["remote-ci-summary.json"].promotion_verified = false;
      files["provenance.json"].ci.runId = "13";
      files["provenance.json"].ci.runAttempt = "2";
      files["remote-ci-summary.json"].candidate = {
        ...files["remote-ci-summary.json"].candidate,
        status: "pending",
        sha: CANDIDATE_SHA,
        run_id: 13,
        run_attempt: 2,
        workflow_path: ".github/workflows/candidate.yml",
        execution_status: "in_progress",
        conclusion: null,
      };
      files["ci-runs.json"].evaluation.phase = "preflight";
      const candidate = files["ci-runs.json"].runs.find(
        (run) => run.workflow === "candidate",
      );
      if (!candidate) throw new Error("candidate fixture is missing");
      candidate.status = "in_progress";
      candidate.conclusion = null;
      candidate.selfRun = true;
      await writeBundle(dir, files);
      expect(
        (
          await runVerifier(dir, [
            "--preflight",
            "--self-candidate-run-id",
            "13",
          ])
        ).code ?? 0,
      ).toBe(0);
      const verdict = JSON.parse(
        await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
      );
      expect(verdict).toMatchObject({
        verdict: "PREFLIGHT_PASS",
        readiness: "NOT_VERIFIED",
        phase: "preflight",
      });
      expect((await runVerifier(dir)).code ?? 0).not.toBe(0);
      expect(
        (
          await runVerifier(dir, [
            "--preflight",
            "--self-candidate-run-id",
            "14",
          ])
        ).code ?? 0,
      ).not.toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 120000);

  it.each([".nvmrc", "patches/@qdrant__js-client-rest@1.19.0.patch"])(
    "rejects dirty checkout %s at identical SHA through the final verifier",
    async (relativePath) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-dirty-verifier-"));
      const path = join(checkout, relativePath);
      const original = await readFile(path, "utf8");
      try {
        await writeBundle(dir, baseFiles());
        await writeFile(path, `${original}\n`);
        const child = await runVerifier(dir);
        expect(child.code ?? 0).not.toBe(0);
        expect(`${child.stdout}${child.stderr}`).toContain(
          "candidate checkout fresh",
        );
        expect(
          JSON.parse(
            await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
          ).readiness,
        ).toBe("NOT_VERIFIED");
      } finally {
        await writeFile(path, original);
        await rm(dir, { recursive: true, force: true });
      }
    },
  );

  it("anti-forgery: synthetic markers rejected in real mode", async () => {
    const dir = join(
      tmpdir(),
      `cvg-3a-af-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
    );
    const files = baseFiles();
    files["test-summary.json"] = {
      status: "PASS",
      sha: CANDIDATE_SHA,
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
        CANDIDATE_SHA,
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
    )
      .then((result) => ({ ...result, code: 0 }))
      .catch(cliFailure);
    expect(child.code ?? 0).not.toBe(0);
  }, 120000);

  it("anti-forgery: SBOM inventory is not a claim, while missing run proof fails closed", async () => {
    // Regression: the real SBOM embeds component paths such as
    // scripts/real-e2e-fixture-server.mjs — inventory content must never
    // trip the forgery screen (§125.27 covers claims, not inventories).
    const dir = join(
      tmpdir(),
      `cvg-3a-inv-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
    );
    const files = baseFiles();
    files["sbom.cyclonedx.json"] = {
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      metadata: {},
      components: [
        {
          name: "scripts",
          version: "1",
          description: "example inventory with fixture server reference",
        },
        {
          name: "app",
          version: "1",
          evidence: { location: "scripts/real-e2e-fixture-server.mjs" },
        },
      ],
    };
    // Raw json-summary also inventories genuine runtime filenames. Its
    // measured bytes/digests remain subject to the strict coverage contract.
    const coverage = files["coverage-summary.json"];
    if (!coverage.report || !coverage.measurement_provenance)
      throw new Error("coverage fixture is incomplete");
    Object.assign(coverage.report, {
      [join(root, "apps/api/src/http-boundary/fixtures.ts")]:
        coverage.report.total,
    });
    coverage.raw_report = JSON.stringify(coverage.report);
    coverage.measurement_provenance.raw_sha256 = sha256Hex(coverage.raw_report);
    coverage.measurement_provenance.report_sha256 = sha256Hex(
      JSON.stringify(coverage.report),
    );
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
        CANDIDATE_SHA,
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
    )
      .then((result) => ({ ...result, code: 0 }))
      .catch(cliFailure);
    const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    expect(output).not.toMatch(/forgery/);
    expect(output).toContain("current candidate mutation run id is required");
    expect(child.code ?? 0).not.toBe(0);
  }, 120000);

  it.each([
    ["coverage branches 84.99", { files: null, docs: null }],
    ["coverage legacy flat below floor", { files: null, docs: null }],
    ["mutation adjusted 89.99", { files: null, docs: null }],
    ["mutation adjusted 94.99", { files: null, docs: null }],
    ["critical survivors 1", { files: null, docs: null }],
    ["P1 equals 1", { files: null, docs: null }],
    ["quality SHA mismatch", { files: null, docs: null }],
    ["candidate run missing", { files: null, docs: null }],
    ["codeql field missing", { files: null, docs: null }],
    ["stale mutation evidence", { files: null, docs: null }],
    ["security pending", { files: null, docs: null }],
    ["redis backend memory", { files: null, docs: null }],
    ["pool isolation false", { files: null, docs: null }],
    ["audit measured SHA stale", { files: null, docs: null }],
    ["audit candidate SHA mismatch", { files: null, docs: null }],
    [
      "candidate execution pending with PASS label",
      { files: null, docs: null },
    ],
    ["quality execution pending with PASS label", { files: null, docs: null }],
    ["SBOM missing", { files: null, docs: null }],
    ["digest mismatch", { files: null, docs: null }],
    ["manifest hash mismatch", { files: null, docs: null }],
    ["staging unknown", { files: null, docs: null }],
    ["independent review REVISE", { files: null, docs: null }],
    ["engineering 96", { files: null, docs: null }],
    ["engineering 96.99 no round-up", { files: null, docs: null }],
    ["operations 94", { files: null, docs: null }],
    ["operations 94.99 no round-up", { files: null, docs: null }],
    ["restore legacy RTO field", { files: null, docs: null }],
    ["restore missing verification duration", { files: null, docs: null }],
    ["restore negative verification duration", { files: null, docs: null }],
    ["restore fractional verification duration", { files: null, docs: null }],
    ["restore legacy alias present", { files: null, docs: null }],
    ["restore missing summary SHA", { files: null, docs: null }],
    ["restore stale summary SHA", { files: null, docs: null }],
    ["restore target not isolated", { files: null, docs: null }],
    ["restore marker not verified", { files: null, docs: null }],
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
        case "candidate execution pending with PASS label":
          files["remote-ci-summary.json"].candidate.execution_status =
            "in_progress";
          break;
        case "quality execution pending with PASS label":
          files["remote-ci-summary.json"].quality.execution_status =
            "in_progress";
          break;
        case "audit measured SHA stale":
          docs = { audit: { ...auditDoc(), evidence_sha: "b".repeat(40) } };
          break;
        case "audit candidate SHA mismatch":
          docs = { audit: { ...auditDoc(), candidate_sha: "b".repeat(40) } };
          break;
        case "coverage branches 84.99":
          if (files["coverage-summary.json"].report === undefined)
            throw new Error("coverage fixture report absent");
          files["coverage-summary.json"].report.total.branches.pct = 84.99;
          break;
        case "coverage legacy flat below floor":
          // Pre-envelope raw shape: still read, never assumed PASS.
          files["coverage-summary.json"] = {
            total: {
              statements: { pct: 91.5, total: 1000, covered: 915, skipped: 0 },
              branches: { pct: 84.99, total: 10000, covered: 8499, skipped: 0 },
              functions: { pct: 95.9, total: 1000, covered: 959, skipped: 0 },
              lines: { pct: 92.2, total: 1000, covered: 922, skipped: 0 },
            },
          };
          break;
        case "mutation adjusted 89.99":
          files["mutation-summary.json"].adjusted_score = 0.8999;
          break;
        case "mutation adjusted 94.99":
          // Gate floor is 0.95 (matrix G10): 94.99 must fail closed even
          // though it would have passed the legacy 0.90 floor.
          files["mutation-summary.json"].adjusted_score = 0.9499;
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
        case "candidate run missing":
          Reflect.deleteProperty(files["remote-ci-summary.json"], "candidate");
          files["remote-ci-summary.json"].all_same_sha = false;
          files["remote-ci-summary.json"].status = "FAIL";
          break;
        case "codeql field missing":
          Reflect.deleteProperty(files["security-summary.json"], "codeql");
          break;
        case "stale mutation evidence":
          // SHA-shaped but not the candidate and not an ancestor known to
          // git: freshness must reject it.
          files["mutation-summary.json"].sha = "c".repeat(40);
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
          Reflect.deleteProperty(files, "sbom.cyclonedx.json");
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
        case "engineering 96.99 no round-up": {
          // §48: 96.99 != 97. Fractional mean consistent with the stated
          // aggregate must still fail the score invariant.
          const audit = auditDoc();
          const names = [
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
          ];
          for (const name of names) audit.domains[name] = 97;
          audit.domains.ci = 96.89;
          audit.aaa_engineering = 96.99;
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
              ].includes(name)
            ) {
              audit.domains[name] = 94;
            }
          }
          audit.aaa_operations = 94;
          docs = { audit };
          break;
        }
        case "operations 94.99 no round-up": {
          // §48: 94.99 != 95.
          const audit = auditDoc();
          audit.domains.same_sha = 94.8;
          audit.aaa_operations = 94.99;
          docs = { audit };
          break;
        }
        case "restore legacy RTO field":
          files["restore-summary.json"].format = "cvg-restore-summary/v1";
          files["restore-summary.json"].rtoMs = 444;
          Reflect.deleteProperty(
            files["restore-summary.json"],
            "verificationDurationMs",
          );
          break;
        case "restore missing verification duration":
          Reflect.deleteProperty(
            files["restore-summary.json"],
            "verificationDurationMs",
          );
          break;
        case "restore negative verification duration":
          files["restore-summary.json"].verificationDurationMs = -1;
          break;
        case "restore fractional verification duration":
          files["restore-summary.json"].verificationDurationMs = 1.25;
          break;
        case "restore legacy alias present":
          files["restore-summary.json"].rtoMs = 444;
          break;
        case "restore missing summary SHA":
          Reflect.deleteProperty(files["restore-summary.json"], "sha");
          break;
        case "restore stale summary SHA":
          files["restore-summary.json"].sha = "b".repeat(40);
          break;
        case "restore target not isolated":
          files["restore-summary.json"].targetIsolated = false;
          break;
        case "restore marker not verified":
          files["restore-summary.json"].markerVerified = false;
          break;
        default:
          break;
      }
      if (_label === "digest mismatch") {
        await writeBundle(dir, files);
        const { appendFile } = await import("node:fs/promises");
        await appendFile(join(dir, "staging-summary.json"), " ");
      } else if (_label === "manifest hash mismatch") {
        // P2-EVID-SELF: digests.json is correct but manifest declares a
        // divergent sha256 — the cross-check must catch it.
        await writeBundle(dir, files);
        const { readFile, writeFile } = await import("node:fs/promises");
        const manifest: { artifacts: { path: string; sha256?: string }[] } =
          JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
        const entry = manifest.artifacts.find(
          (item) => typeof item.sha256 === "string",
        );
        if (entry === undefined)
          throw new Error("hashed manifest fixture entry absent");
        entry.sha256 = "0".repeat(64);
        await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest));
      } else {
        await writeBundle(dir, files);
      }
      const child = await runVerifier(dir, [], docs);
      expect(child.code ?? 0).not.toBe(0);
      const verdict = JSON.parse(
        await readFile(join(dir, "triple-aaa-verdict.json"), "utf8"),
      );
      expect(verdict.verdict).not.toBe("PASS");
      expect(verdict.readiness).toBe("NOT_VERIFIED");
      if (_label.startsWith("restore ")) {
        const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
        if (_label === "restore stale summary SHA") {
          expect(output).toContain("same-SHA invariant");
        } else if (_label === "restore missing summary SHA") {
          expect(output).toContain("same-SHA invariant");
          expect(output).toContain("restore invariant");
        } else {
          expect(output).toContain("restore invariant");
        }
      }
    },
    120000,
  );
});
