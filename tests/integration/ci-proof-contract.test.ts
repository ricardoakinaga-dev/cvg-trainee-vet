import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { k6ThresholdsPassed } from "../../scripts/release-evidence.mjs";
import {
  coverageDenominatorsValid,
  deriveTestCounts,
  authenticatedArtifactProof,
  digest,
  testExecutionFailures,
  securityExecutionFailures,
  selectedAssertionInventory,
  riskRegisterFailures,
} from "../../scripts/ci-proof-contract.mjs";
import { makeCiProofFixture } from "./ci-proof-fixtures.js";
import * as proofContract from "../../scripts/ci-proof-contract.mjs";

// Temporary fixtures are not pnpm projects; invoke the installed Vitest CLI.
const vitestCli = fileURLToPath(
  new URL("../vitest.mjs", import.meta.resolve("vitest")),
);

describe("R22 raw reporter admission", () => {
  const complete = () => ({
    success: true,
    numTotalTestSuites: 2,
    numPassedTestSuites: 2,
    numFailedTestSuites: 0,
    numPendingTestSuites: 0,
    numTotalTests: 1,
    numPassedTests: 1,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults: [
      {
        name: "/checkout/a.test.ts",
        status: "passed",
        startTime: 100,
        endTime: 200,
        assertionResults: [
          {
            ancestorTitles: ["group"],
            title: "case",
            fullName: "group case",
            status: "passed",
          },
        ],
      },
    ],
  });
  const derive = (report: object) =>
    deriveTestCounts(report, ["a.test.ts"], "/checkout", 100, 200);
  it("preserves a valid nested suite report", () => {
    expect(derive(complete())).toEqual({
      files: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
    });
  });
  it.each([-1, -0.5])(
    "rejects cancelling pending/todo counters %s",
    (value) => {
      const report = complete();
      report.numPendingTests = value;
      report.numTodoTests = -value;
      expect(() => derive(report)).toThrow();
    },
  );
  it.each([
    "numTotalTestSuites",
    "numPassedTestSuites",
    "numFailedTestSuites",
    "numPendingTestSuites",
    "numPendingTests",
    "numTodoTests",
  ])("checks each supplied counter %s", (field) => {
    for (const value of [
      -1,
      0.5,
      Infinity,
      NaN,
      Number.MAX_SAFE_INTEGER + 1,
      "0",
      null,
    ]) {
      const report = complete();
      Reflect.set(report, field, value);
      expect(() => derive(report)).toThrow();
    }
  });
  it.each([
    { numTotalTestSuites: 99, numFailedTestSuites: 7 },
    { numPassedTestSuites: 1 },
    { numPendingTestSuites: 1 },
    { numTotalTestSuites: 1, numPassedTestSuites: 1 },
  ])("rejects inconsistent suite arithmetic %j", (delta) => {
    expect(() => derive({ ...complete(), ...delta })).toThrow();
  });
  it("calibrates nested and repeated describes against the installed reporter", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r22-report-"));
    try {
      await writeFile(
        join(dir, "case.test.ts"),
        `import {describe,it,expect} from ${JSON.stringify(import.meta.resolve("vitest"))};
describe('outer',()=>{describe('inner',()=>{it('case',()=>expect(1).toBe(1));});});
describe('repeat',()=>it('one',()=>expect(1).toBe(1)));
describe('repeat',()=>it('two',()=>expect(2).toBe(2)));
`,
      );
      await writeFile(
        join(dir, "vitest.config.mjs"),
        `export default {root:${JSON.stringify(dir)},cacheDir:${JSON.stringify(join(dir, "cache"))},test:{include:['case.test.ts'],maxWorkers:1,coverage:{enabled:false}}};`,
      );
      const start = Date.now();
      await promisify(execFile)(
        process.execPath,
        [
          vitestCli,
          "run",
          "--configLoader=runner",
          "--reporter=json",
          `--outputFile=${join(dir, "raw.json")}`,
        ],
        { cwd: dir, env: process.env, timeout: 30000 },
      );
      const raw = JSON.parse(await readFile(join(dir, "raw.json"), "utf8"));
      if (process.env.CVG_R22_ARTIFACT_DIR)
        await writeFile(
          join(
            process.env.CVG_R22_ARTIFACT_DIR,
            `${process.env.CVG_R22_ATTEMPT}-reporter-calibration.raw.json`,
          ),
          JSON.stringify(raw),
        );
      expect(raw.numTotalTestSuites).toBe(5);
      expect(raw.testResults).toHaveLength(1);
      expect(
        deriveTestCounts(raw, ["case.test.ts"], dir, start, Date.now()),
      ).toEqual({ files: 1, passed: 3, failed: 0, skipped: 0 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 40000);
});

describe("R22 P3 source identity binding", () => {
  const sha = "a".repeat(40);
  const entry = {
    id: "actual-P3",
    severity: "P3",
    finding: "synthetic",
    impact: "synthetic",
    owner: "synthetic",
    mitigation: "synthetic",
    validation: "synthetic",
    accepted_risk: true,
    material: true,
  };
  const audit = {
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 1,
    findings: [{ id: entry.id, severity: "P3" }],
  };
  const register = {
    format: "cvg-risk-register/v1",
    candidate_sha: sha,
    entries: [entry],
  };
  it("accepts the exact P3 source and registered identity", () => {
    expect(riskRegisterFailures(audit, register, sha)).toEqual([]);
  });
  it("rejects a different registered P3 with the same cardinality", () => {
    expect(
      riskRegisterFailures(
        audit,
        { ...register, entries: [{ ...entry, id: "unrelated-P3" }] },
        sha,
      ).length,
    ).toBeGreaterThan(0);
  });
  it("binds P3 identities even when the optional summary count is absent", () => {
    const withoutCount: Partial<typeof audit> = { ...audit };
    delete withoutCount.p3;
    expect(riskRegisterFailures(withoutCount, register, sha)).toEqual([]);
    expect(
      riskRegisterFailures(withoutCount, { ...register, entries: [] }, sha)
        .length,
    ).toBeGreaterThan(0);
  });
  it("rejects raw P3 count contradicting its findings", () => {
    expect(
      riskRegisterFailures({ ...audit, findings: [] }, register, sha).length,
    ).toBeGreaterThan(0);
  });
  it("rejects an extra registered P3 absent from the raw findings", () => {
    expect(
      riskRegisterFailures(
        { ...audit, p3: 2 },
        { ...register, entries: [entry, { ...entry, id: "extra" }] },
        sha,
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe("R10 complete ordinary execution profile", () => {
  it.each([
    NaN,
    Infinity,
    -Infinity,
    -1,
    0.1,
    Number.MAX_SAFE_INTEGER + 1,
    "0",
    null,
    undefined,
    true,
  ])("R10 findings source rejects non-counter %s", (value) => {
    for (const field of ["p0", "p1", "p2"]) {
      const audit = { p0: 0, p1: 0, p2: 0 };
      Reflect.set(audit, field, value);
      expect(
        proofContract.findingsCounterFailures(audit).length,
      ).toBeGreaterThan(0);
    }
    expect(
      proofContract.findingsCounterFailures({ p0: 0, p1: 0, p2: 0 }),
    ).toEqual([]);
  });
  const environment = {
    CVG_RUN_LIVE_DB_TESTS: "true",
    CVG_RUN_LIVE_QDRANT_TESTS: "true",
    CVG_RUN_LIVE_REDIS_TESTS: "true",
    CVG_RUN_LIVE_RESTORE_TESTS: "true",
    CVG_RUN_RESTORE_MIGRATION_DRILL: "true",
    CVG_OWNED_DISPOSABLE_BINDING_DATABASE: "true",
    CVG_TEST_DATABASE_URL: "postgresql://app@127.0.0.1:5432/disposable",
    CVG_TEST_ADMIN_DATABASE_URL: "postgresql://admin@127.0.0.1:5432/disposable",
    CVG_MIGRATION_DATABASE_URL:
      "postgresql://operator@127.0.0.1:5432/disposable",
    CVG_TEST_QDRANT_URL: "http://127.0.0.1:6333",
    CVG_TEST_REDIS_URL: "redis://127.0.0.1:6379",
    CVG_REDIS_SERVER_BIN: "/usr/bin/redis-server",
    CVG_STAGING_API_A_URL: "http://127.0.0.1:3101",
    CVG_STAGING_API_B_URL: "http://127.0.0.1:3112",
    CVG_STAGING_TLS_URL: "https://127.0.0.1:3443",
    CVG_STAGING_EVIDENCE_DIR: "/synthetic/evidence",
    CVG_STAGING_OTEL_SPANS_FILE: "/synthetic/evidence/spans.json",
    CVG_STAGING_REDIS_URL: "redis://127.0.0.1:6379",
  };
  it.each(Object.keys(environment))(
    "R10 ordinary rejects missing selected requirement %s",
    (key) => {
      const validate = Reflect.get(proofContract, "ordinaryTestEnvironment");
      expect(validate).toBeTypeOf("function");
      const missing: Record<string, string> = { ...environment };
      Reflect.deleteProperty(missing, key);
      expect(() => validate(missing)).toThrow(/ordinary test profile/u);
      expect(validate(environment)).toBe(environment);
    },
  );
  it("R10 current writer requires full profile before collection and uses it for execution", async () => {
    const source = await readFile(
      new URL("../../scripts/write-test-summary.mjs", import.meta.url),
      "utf8",
    );
    expect(source).toContain("ordinaryTestEnvironment(process.env)");
    expect(source.indexOf("ordinaryTestEnvironment(process.env)")).toBeLessThan(
      source.indexOf("files: await selectedTestInventory"),
    );
    expect(source).toContain("selectedTestInventory(root)");
    expect(source).toContain("selectedAssertionInventory(root)");
    expect(source).toContain("env: environment");
  });
  it("R10 actual list/report retains all gated cases and only complete environment yields zero skips", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r10-profile-"));
    try {
      const header = `import {describe,it,expect} from ${JSON.stringify(import.meta.resolve("vitest"))};\n`;
      await writeFile(
        join(dir, "unit.test.ts"),
        header + "it('ordinary assertion',()=>expect(2+2).toBe(4));\n",
      );
      const flags = Object.keys(environment).filter(
        (key) => environment[key as keyof typeof environment] === "true",
      );
      await writeFile(
        join(dir, "integration.test.ts"),
        header +
          flags
            .map(
              (flag) =>
                `describe.skipIf(process.env[${JSON.stringify(flag)}] !== 'true')('synthetic gate > ${flag}',()=>{it('original selected case',()=>expect(process.env[${JSON.stringify(flag)}]).toBe('true'));});`,
            )
            .join("\n"),
      );
      await writeFile(
        join(dir, "vitest.config.mjs"),
        `import {defineConfig} from ${JSON.stringify(import.meta.resolve("vitest/config"))};
export default defineConfig({root:${JSON.stringify(dir)},cacheDir:${JSON.stringify(join(dir, "cache"))},test:{maxWorkers:1,coverage:{enabled:false},projects:[{extends:true,test:{name:'unit',include:['unit.test.ts']}},{extends:true,test:{name:'integration',include:['integration.test.ts']}}]}});`,
      );
      const selection = await selectedAssertionInventory(dir, {
        environment: { ...process.env, ...environment },
      });
      const missing = { ...process.env };
      for (const flag of flags) Reflect.deleteProperty(missing, flag);
      for (const [label, env] of [
        ["missing", missing],
        ["complete", { ...process.env, ...environment }],
      ] as const) {
        const reportPath = join(dir, `${label}.raw.json`);
        const start = Date.now();
        await promisify(execFile)(
          process.execPath,
          [
            vitestCli,
            "run",
            "--configLoader=runner",
            "--project",
            "unit",
            "--project",
            "integration",
            "--reporter=json",
            `--outputFile=${reportPath}`,
          ],
          { cwd: dir, env, timeout: 60000 },
        );
        const end = Date.now();
        const raw = JSON.parse(await readFile(reportPath, "utf8"));
        expect(proofContract.reportedAssertionInventory(raw, dir)).toEqual(
          selection,
        );
        if (label === "missing") {
          expect(raw.numPendingTests).toBe(flags.length);
          expect(() =>
            deriveTestCounts(
              raw,
              ["integration.test.ts", "unit.test.ts"],
              dir,
              start,
              end,
            ),
          ).toThrow();
        } else {
          expect(
            deriveTestCounts(
              raw,
              ["integration.test.ts", "unit.test.ts"],
              dir,
              start,
              end,
            ),
          ).toMatchObject({ passed: flags.length + 1, failed: 0, skipped: 0 });
        }
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60000);
});

describe("R8 real Vitest selection/report contract", () => {
  it("preserves structural ancestors, literal separators and collisions through real collection and execution", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r8-selection-"));
    try {
      const config = `import { defineConfig } from ${JSON.stringify(import.meta.resolve("vitest/config"))};
export default defineConfig({ root: ${JSON.stringify(dir)}, cacheDir: ${JSON.stringify(join(dir, "cache"))}, test: { maxWorkers: 1, coverage: { enabled: false }, projects: [
{ extends: true, test: { name: 'unit', include: ['unit.test.ts'] } },
{ extends: true, test: { name: 'integration', include: ['integration.test.ts'] } }
] } });`;
      await writeFile(join(dir, "vitest.config.mjs"), config);
      const header = `import { describe, it, expect } from ${JSON.stringify(import.meta.resolve("vitest"))};\n`;
      await writeFile(
        join(dir, "unit.test.ts"),
        header +
          `
describe('literal > ancestor', () => { it('literal > title', () => expect(true).toBe(true)); });
describe('collision', () => { describe('branch', () => { it('leaf', () => expect(true).toBe(true)); }); });
describe('collision > branch', () => { it('leaf', () => expect(true).toBe(true)); });
`,
      );
      await writeFile(
        join(dir, "integration.test.ts"),
        header +
          `
describe('reporter a', () => { it('b c', () => expect(true).toBe(true)); });
describe('reporter a b', () => { it('c', () => expect(true).toBe(true)); });
describe('repeated', () => { it.each([1, 2])('same', () => expect(true).toBe(true)); });
`,
      );
      const execute = promisify(execFile);
      const { stdout } = await execute(
        process.execPath,
        [
          vitestCli,
          "list",
          "--configLoader=runner",
          "--project",
          "unit",
          "--project",
          "integration",
          "--json",
        ],
        { cwd: dir, timeout: 60000 },
      );
      const cliList = JSON.parse(stdout) as { file: string; name: string }[];
      await writeFile(join(dir, "test-list.raw.json"), stdout);
      const selection = await selectedAssertionInventory(dir);
      const startedAt = new Date().toISOString();
      const reportPath = join(dir, "test-results.raw.json");
      await execute(
        process.execPath,
        [
          vitestCli,
          "run",
          "--configLoader=runner",
          "--project",
          "unit",
          "--project",
          "integration",
          "--reporter=json",
          `--outputFile=${reportPath}`,
        ],
        { cwd: dir, timeout: 60000 },
      );
      const completedAt = new Date().toISOString();
      const raw = await readFile(reportPath, "utf8");
      const report = JSON.parse(raw);
      expect(report.numPassedTests).toBe(7);
      const files = makeCiProofFixture(
        "a".repeat(40),
        {
          lockfileSha256: "a".repeat(64),
          treeDigest: "b".repeat(64),
          workspaceManifests: {},
          migrationInventory: {},
          migrationHead: "0000_fixture",
          migrationFiles: 1,
        },
        {},
      );
      const summary = files["test-summary.json"];
      const runs = files["ci-runs.json"];
      Object.assign(summary.execution, {
        startedAt,
        completedAt,
        checkoutRoot: dir,
      });
      summary.generatedAt = completedAt;
      summary.tests = {
        files: 2,
        passed: 7,
        failed: 0,
        skipped: 0,
        source: "real Vitest fixture",
      };
      summary.executedTests = 7;
      const run = runs.runs[2]!;
      run.runStartedAt = startedAt;
      run.updatedAt = completedAt;
      runs.collectedAt = completedAt;
      const inventoryFiles = ["integration.test.ts", "unit.test.ts"];
      const inventory = JSON.stringify({
        files: inventoryFiles,
        assertions: selection,
      });
      await writeFile(join(dir, "test-inventory.json"), inventory);
      summary.rawReport.sha256 = digest(raw);
      summary.inventory.sha256 = digest(inventory);
      expect(selection.map((entry) => entry.name).sort()).toEqual(
        cliList.map((entry) => entry.name).sort(),
      );
      expect(
        await testExecutionFailures(
          dir,
          summary,
          run,
          completedAt,
          inventoryFiles,
          selection,
        ),
      ).toEqual([]);
      // Two different trees produce the same list label. Their structures must survive.
      const collision = selection.filter(
        (entry) => entry.name === "collision > branch > leaf",
      );
      expect(collision).toHaveLength(2);
      expect(
        new Set(collision.map((entry) => JSON.stringify(entry))).size,
      ).toBe(2);
      expect(
        selection.find(
          (entry) => entry.name === "literal > ancestor > literal > title",
        ),
      ).toMatchObject({
        ancestorTitles: ["literal > ancestor"],
        title: "literal > title",
      });
      // Preserve the displayed label and count while forging the structural identity.
      const forged = structuredClone(selection);
      const entry = forged.find(
        (item) => item.name === "collision > branch > leaf",
      )!;
      entry.ancestorTitles = ["collision", "branch"];
      const bytes = JSON.stringify({
        files: inventoryFiles,
        assertions: forged,
      });
      await writeFile(join(dir, "test-inventory.json"), bytes);
      summary.inventory.sha256 = digest(bytes);
      expect(
        (
          await testExecutionFailures(
            dir,
            summary,
            run,
            completedAt,
            inventoryFiles,
            selection,
          )
        ).join(" "),
      ).toMatch(/raw full assertion inventory differs/);
    } finally {
      if (process.env.CVG_CI_PROOF_RETAIN_RAW !== "1")
        await rm(dir, { recursive: true, force: true });
    }
  }, 180000);
});

describe("R7 direct proof consumers", () => {
  it.each([
    "valid complete",
    "forged test count",
    "missing test raw",
    "stale test",
    "partial raw assertions",
    "skipped RLS",
    "unexecuted RLS",
    "wrong RLS suite",
    "wrong scanner run",
    "wrong scanner repository",
    "wrong job SHA",
    "missing scanner raw",
    "invented audit",
    "CodeQL documentation upload",
    "OSV documentation upload",
    "OSV scan / documentation upload",
    "scanner duplicate alias",
    "scanner missing supply chain",
    "scanner reversed job window",
    "scanner reversed run window",
    "scanner future run window",
    "scanner job outside run window",
    "scanner duplicate job ID",
    "scanner qualified OSV valid",
    "R9 counterfeit RLS suffix titles",
    "R9 counterfeit RLS suffix titles with actual inventory",
    "R9 counterfeit RLS suffix titles with forged inventory",
    "R9 missing authoritative assertions",
  ])("valid raw baseline discriminates %s", async (scenario) => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r7-raw-"));
    try {
      const files = makeCiProofFixture(
        "a".repeat(40),
        {
          lockfileSha256: "a".repeat(64),
          treeDigest: "b".repeat(64),
          workspaceManifests: {},
          migrationInventory: {},
          migrationHead: "0000_fixture",
          migrationFiles: 1,
        },
        {},
      );
      const test = files["test-summary.json"],
        rls = files["rls-live-summary.json"],
        security = files["security-summary.json"];
      const runs = files["ci-runs.json"];
      const assertions = JSON.parse(files["test-inventory.json"]).assertions;
      const rlsAssertions = JSON.parse(files["rls-inventory.json"]).assertions;
      if (scenario.startsWith("R9 counterfeit RLS suffix titles")) {
        const raw = JSON.parse(files["rls-results.raw.json"]);
        for (const assertion of raw.testResults[0].assertionResults) {
          assertion.title = `counterfeit assertion ${assertion.title}`;
          assertion.fullName = [
            ...assertion.ancestorTitles,
            assertion.title,
          ].join(" ");
        }
        const inventory = JSON.parse(files["rls-inventory.json"]);
        inventory.assertions = raw.testResults[0].assertionResults
          .map((assertion: { ancestorTitles: string[]; title: string }) => ({
            file: "tests/integration/rls-full-matrix.test.ts",
            name: [...assertion.ancestorTitles, assertion.title].join(" > "),
            ancestorTitles: assertion.ancestorTitles,
            title: assertion.title,
          }))
          .sort((a: { name: string }, b: { name: string }) =>
            a.name.localeCompare(b.name),
          );
        files["rls-results.raw.json"] = JSON.stringify(raw);
        files["rls-inventory.json"] = JSON.stringify(inventory);
        rls.rawReport.sha256 = digest(files["rls-results.raw.json"]);
        rls.inventory.sha256 = digest(files["rls-inventory.json"]);
      }
      if (scenario === "forged test count") test.tests.passed = 999999;
      if (scenario === "stale test") test.generatedAt = "2000-01-01T00:00:00Z";
      if (scenario === "unexecuted RLS") {
        rls.executionStatus = "NOT_EXECUTED";
        rls.executedTests = 0;
      }
      if (scenario === "wrong RLS suite")
        rls.suite = "tests/integration/unrelated.test.ts";
      if (scenario === "partial raw assertions") {
        const raw = JSON.parse(files["test-results.raw.json"]);
        raw.testResults[0].assertionResults.pop();
        raw.numTotalTests -= 1;
        raw.numPassedTests -= 1;
        files["test-results.raw.json"] = JSON.stringify(raw);
        test.rawReport.sha256 = digest(files["test-results.raw.json"]);
        test.tests.passed = 7;
        test.executedTests = 7;
      }
      if (scenario === "skipped RLS") {
        const raw = JSON.parse(files["rls-results.raw.json"]);
        raw.testResults[0].assertionResults[0].status = "pending";
        files["rls-results.raw.json"] = JSON.stringify(raw);
        rls.rawReport.sha256 = digest(files["rls-results.raw.json"]);
      }
      if (scenario === "wrong scanner run") security.scannerRun.run_id = 999999;
      if (scenario === "wrong scanner repository")
        security.scannerRun.repository = "outside/repo";
      if (["invented audit", "wrong job SHA"].includes(scenario)) {
        const raw = JSON.parse(files["security-results.raw.json"]);
        if (scenario === "invented audit")
          raw.fullAudit.advisories.bad = { severity: "critical" };
        else raw.remoteProof.jobs[0].head_sha = "b".repeat(40);
        files["security-results.raw.json"] = JSON.stringify(raw);
        security.rawReport.sha256 = digest(files["security-results.raw.json"]);
      }
      if (
        scenario.startsWith("scanner ") ||
        scenario.includes("documentation upload")
      ) {
        const raw = JSON.parse(files["security-results.raw.json"]);
        const proof = raw.remoteProof;
        if (scenario === "CodeQL documentation upload")
          proof.jobs[0].name = scenario;
        if (
          scenario === "OSV documentation upload" ||
          scenario === "OSV scan / documentation upload"
        )
          proof.jobs[1].name = scenario;
        if (scenario === "scanner qualified OSV valid")
          proof.jobs[1].name = "OSV scan / osv-scan";
        if (scenario === "scanner duplicate alias")
          proof.jobs.push({
            ...proof.jobs[1],
            id: 100,
            name: "OSV scan / osv-scan",
          });
        if (scenario === "scanner missing supply chain")
          proof.jobs.splice(2, 1);
        if (scenario === "scanner reversed job window") {
          proof.jobs[0].started_at = proof.run.updated_at;
          proof.jobs[0].completed_at = proof.run.run_started_at;
        }
        if (scenario === "scanner reversed run window")
          proof.run.run_started_at = new Date(
            Date.parse(proof.run.updated_at) + 1000,
          ).toISOString();
        if (scenario === "scanner future run window")
          proof.run.updated_at = "2100-01-01T00:00:00Z";
        if (scenario === "scanner job outside run window")
          proof.jobs[0].completed_at = new Date(
            Date.parse(proof.run.updated_at) + 1000,
          ).toISOString();
        if (scenario === "scanner duplicate job ID")
          proof.jobs[1].id = proof.jobs[0].id;
        proof.totalCount = proof.jobs.length;
        const securityRun = runs.runs[1]!;
        securityRun.runStartedAt = proof.run.run_started_at;
        securityRun.updatedAt = proof.run.updated_at;
        files["security-results.raw.json"] = JSON.stringify(raw);
        security.rawReport.sha256 = digest(files["security-results.raw.json"]);
      }
      for (const [path, value] of Object.entries(files)) {
        if (
          (scenario === "missing test raw" &&
            path === "test-results.raw.json") ||
          (scenario === "missing scanner raw" &&
            path === "security-results.raw.json")
        )
          continue;
        await writeFile(
          join(dir, path),
          typeof value === "string" ? value : JSON.stringify(value),
        );
      }
      const failures = [
        ...(await testExecutionFailures(
          dir,
          test,
          runs.runs[2],
          runs.collectedAt,
          [
            "packages/application/src/fixture.test.ts",
            "tests/integration/fixture.test.ts",
          ],
          scenario === "R9 missing authoritative assertions"
            ? null
            : assertions,
        )),
        ...(await testExecutionFailures(
          dir,
          rls,
          runs.runs[2],
          runs.collectedAt,
          ["tests/integration/rls-full-matrix.test.ts"],
          scenario === "R9 counterfeit RLS suffix titles"
            ? null
            : scenario ===
                "R9 counterfeit RLS suffix titles with forged inventory"
              ? JSON.parse(files["rls-inventory.json"]).assertions
              : rlsAssertions,
        )),
        ...(await securityExecutionFailures(
          dir,
          security,
          runs.runs[2],
          runs.runs[1],
          runs.collectedAt,
        )),
      ];
      if (["valid complete", "scanner qualified OSV valid"].includes(scenario))
        expect(failures).toEqual([]);
      else expect(failures.join(" ")).toMatch(/raw execution invalid/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it.each([
    {},
    { errors: { thresholds: {} } },
    { errors: { thresholds: { "rate<0.05": false } } },
  ])("rejects vacuous configured load proof", (metrics) => {
    expect(k6ThresholdsPassed(metrics)).toBe(false);
  });
  it.each([false, { ok: true }])(
    "accepts the complete mandatory load profile",
    (value) => {
      expect(
        k6ThresholdsPassed({
          errors: { thresholds: { "rate<0.05": value } },
          read_latency_ms: { thresholds: { "p(95)<800": value } },
          auth_rejected_latency_ms: { thresholds: { "p(95)<800": value } },
        }),
      ).toBe(true);
    },
  );
  it("rejects invented zero coverage denominators", () => {
    expect(
      coverageDenominatorsValid(
        Object.fromEntries(
          ["lines", "statements", "functions", "branches"].map((key) => [
            key,
            { pct: 100, total: 0, covered: 0, skipped: 0 },
          ]),
        ),
      ),
    ).toBe(false);
  });
  const report = {
    success: true,
    numTotalTests: 1,
    numPassedTests: 1,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults: [
      {
        name: "/checkout/tests/integration/rls-full-matrix.test.ts",
        status: "passed",
        startTime: 100,
        endTime: 200,
        assertionResults: [
          { fullName: "denies foreign scope", status: "passed" },
        ],
      },
    ],
  };
  it("derives execution from all raw assertions and exact inventory", () => {
    expect(
      deriveTestCounts(
        report,
        ["tests/integration/rls-full-matrix.test.ts"],
        "/checkout",
        100,
        200,
      ),
    ).toEqual({ files: 1, passed: 1, failed: 0, skipped: 0 });
  });
  it.each([
    "absent suite",
    "invented count",
    "skip",
    "empty",
    "duplicate",
    "wrong window",
  ])("rejects %s raw execution", (scenario) => {
    const data = structuredClone(report);
    if (scenario === "absent suite")
      data.testResults[0]!.name = "/checkout/unrelated.test.ts";
    if (scenario === "invented count") data.numPassedTests = 999;
    if (scenario === "skip")
      data.testResults[0]!.assertionResults[0]!.status = "pending";
    if (scenario === "empty") data.testResults[0]!.assertionResults = [];
    if (scenario === "duplicate") data.testResults.push(data.testResults[0]!);
    if (scenario === "wrong window") data.testResults[0]!.endTime = 201;
    expect(() =>
      deriveTestCounts(
        data,
        ["tests/integration/rls-full-matrix.test.ts"],
        "/checkout",
        100,
        200,
      ),
    ).toThrow();
  });
  it("does not authenticate supplied JSON or environment claims without a credential", async () => {
    await expect(
      authenticatedArtifactProof({
        token: "",
        files: [],
        sha: "a".repeat(40),
        runId: 12,
        runAttempt: 1,
      }),
    ).rejects.toThrow(/authenticated/);
  });
  it.each([
    "matching bytes",
    "counterfeit bytes",
    "wrong run",
    "wrong attempt",
    "wrong SHA",
    "wrong repository",
    "pending run",
    "expired archive",
    "wrong archive digest",
    "missing proof",
    "incomplete inventory",
    "R9 archive from previous attempt",
    "R9 archive updated outside attempt",
    "R9 archive reversed chronology",
    "R9 archive foreign API origin",
  ])(
    "authenticated transport contract with synthetic remote: %s",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r7-transport-"));
      try {
        await mkdir(join(dir, "release-evidence"));
        const file = join(dir, "release-evidence/test-summary.json");
        await writeFile(file, '{"status":"PASS"}\n');
        const zip = join(dir, "proof.zip");
        await promisify(execFile)(
          "zip",
          ["-q", zip, "release-evidence/test-summary.json"],
          { cwd: dir },
        );
        const archive = await readFile(zip);
        if (scenario === "counterfeit bytes")
          await writeFile(file, '{"status":"PASS","passed":999999}\n');
        const run = {
          id: scenario === "wrong run" ? 13 : 12,
          run_attempt: scenario === "wrong attempt" ? 2 : 1,
          head_sha: scenario === "wrong SHA" ? "b".repeat(40) : "a".repeat(40),
          repository: {
            full_name:
              scenario === "wrong repository"
                ? "outside/repo"
                : "ricardoakinaga-dev/cvg-trainee-vet",
          },
          path: ".github/workflows/candidate.yml",
          status: scenario === "pending run" ? "in_progress" : "completed",
          conclusion: "success",
          created_at: "2026-01-01T00:00:00Z",
          run_started_at: "2026-01-01T00:01:00Z",
          updated_at: "2026-01-01T00:02:00Z",
        };
        const artifacts = [
          {
            id: 5,
            name: `candidate-artifacts-${"a".repeat(40)}`,
            expired: scenario === "expired archive",
            workflow_run: { id: 12, head_sha: "a".repeat(40) },
            digest: `sha256:${scenario === "wrong archive digest" ? "0".repeat(64) : digest(archive)}`,
            created_at:
              scenario === "R9 archive from previous attempt"
                ? "2026-01-01T00:00:30Z"
                : "2026-01-01T00:01:30Z",
            updated_at:
              scenario === "R9 archive updated outside attempt"
                ? "2026-01-01T00:03:00Z"
                : scenario === "R9 archive reversed chronology"
                  ? "2026-01-01T00:01:00Z"
                  : "2026-01-01T00:01:40Z",
            url: `https://api.github.com/repos/ricardoakinaga-dev/cvg-trainee-vet/actions/artifacts/5`,
            archive_download_url:
              scenario === "R9 archive foreign API origin"
                ? "https://example.invalid/5/zip"
                : "https://api.github.com/repos/ricardoakinaga-dev/cvg-trainee-vet/actions/artifacts/5/zip",
          },
        ];
        const fetchImpl: typeof fetch = async (url, options) => {
          expect(new Headers(options?.headers).get("Authorization")).toBe(
            "Bearer test-token",
          );
          if (String(url).endsWith("/zip"))
            return new Response(Uint8Array.from(archive));
          return new Response(
            JSON.stringify(
              String(url).endsWith("/attempts/1")
                ? run
                : {
                    total_count: scenario === "incomplete inventory" ? 2 : 1,
                    artifacts,
                  },
            ),
          );
        };
        const action = authenticatedArtifactProof({
          token: "test-token",
          files: [
            {
              path: file,
              archivePath:
                scenario === "missing proof"
                  ? "release-evidence/absent.json"
                  : "release-evidence/test-summary.json",
            },
          ],
          sha: "a".repeat(40),
          runId: 12,
          runAttempt: 1,
          fetchImpl,
        });
        if (scenario === "matching bytes")
          await expect(action).resolves.toMatchObject({
            trust: "AUTHENTICATED_GITHUB_ARTIFACT",
          });
        else await expect(action).rejects.toThrow();
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
});
