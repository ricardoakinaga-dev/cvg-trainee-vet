import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const helper = resolve("scripts/mutation-result-validation.mjs");
const identityHelper = resolve("scripts/mutation-identity-validation.mjs");
const digest = (source: string) =>
  createHash("sha256").update(source).digest("hex");

async function evaluate(module: string, expression: string) {
  const { stdout } = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    `const api = await import(${JSON.stringify(module)}); console.log(JSON.stringify(${expression}));`,
  ]);
  return JSON.parse(stdout) as Record<string, unknown>;
}

function report(failed = false) {
  return {
    numTotalTestSuites: 1,
    numPassedTestSuites: failed ? 0 : 1,
    numFailedTestSuites: failed ? 1 : 0,
    numPendingTestSuites: 0,
    numTotalTests: 1,
    numPassedTests: failed ? 0 : 1,
    numFailedTests: failed ? 1 : 0,
    numPendingTests: 0,
    numTodoTests: 0,
    startTime: 1000,
    success: !failed,
    testResults: [
      {
        name: "/fixture/math.test.ts",
        message: "",
        status: failed ? "failed" : "passed",
        startTime: 1001,
        endTime: 1002,
        assertionResults: [
          {
            fullName: "arithmetic adds",
            status: failed ? "failed" : "passed",
            failureMessages: failed
              ? ["AssertionError: expected 3 to be 2"]
              : [],
          },
        ],
      },
    ],
    cvgHarness: {
      runId: "fixture-run",
      reason: failed ? "failed" : "passed",
      unhandledErrors: [],
      suiteErrors: [],
      tests: [
        {
          file: "/fixture/math.test.ts",
          fullName: "arithmetic adds",
          errors: failed
            ? [{ name: "AssertionError", message: "expected 3 to be 2" }]
            : [],
          retryCount: 0,
          repeatCount: 0,
        },
      ],
    },
  };
}

function execution(value: unknown = report(), exitCode = 0) {
  return {
    report: value,
    exitCode,
    signal: null,
    processError: null,
    runId: "fixture-run",
    startedAt: 999,
    finishedAt: 1003,
    expectedFiles: ["/fixture/math.test.ts"],
  };
}

async function validate(value: unknown, baseline?: unknown) {
  return evaluate(
    helper,
    `api.validateSuiteResult(${JSON.stringify(value)}, ${JSON.stringify(baseline) ?? "undefined"})`,
  );
}

describe("mutation harness structured results", () => {
  it("refuses an empty selection before launching a runner", async () => {
    expect(
      await evaluate(
        helper,
        `await api.runSuite({ cwd: "/missing", files: [], vitest: "/missing" })`,
      ),
    ).toMatchObject({ outcome: "HARNESS_ERROR" });
  });

  it("accepts a complete green baseline", async () => {
    expect(await validate(execution())).toMatchObject({
      outcome: "BASELINE_GREEN",
    });
  });

  it("requires a green baseline and does not credit unbound assertions as kills", async () => {
    expect(await validate(execution(report(true), 1))).toMatchObject({
      outcome: "HARNESS_ERROR",
    });
    expect(
      await validate(execution(report(true), 1), execution()),
    ).toMatchObject({ outcome: "ASSERTION_FAILURE", countableKill: false });
    expect(await validate(execution(), execution())).toMatchObject({
      outcome: "NO_EFFECT",
    });
  });

  it.each([undefined, null, "{", {}, { testResults: [] }])(
    "rejects missing or malformed reporter data: %j",
    async (value) => {
      expect(await validate({ ...execution(), report: value })).toMatchObject({
        outcome: "HARNESS_ERROR",
      });
    },
  );

  it("rejects empty, skipped and inconsistent execution", async () => {
    for (const patch of [
      { numTotalTests: 0, testResults: [] },
      { numPendingTests: 1 },
      { numPassedTests: 8 },
      { success: false },
      { cvgHarness: undefined },
      { startTime: 1 },
    ]) {
      expect(
        await validate(execution({ ...report(), ...patch })),
      ).toMatchObject({ outcome: "HARNESS_ERROR" });
    }
  });

  it("rejects infrastructure, timeout, crash, compilation and unhandled errors", async () => {
    const baseline = execution();
    for (const patch of [
      { exitCode: null, processError: "ENOENT" },
      { exitCode: 1, signal: "SIGTERM" },
      { exitCode: 137 },
      { processError: "ETIMEDOUT" },
    ]) {
      expect(
        await validate({ ...execution(report(true), 1), ...patch }, baseline),
      ).toMatchObject({ outcome: "HARNESS_ERROR" });
    }
    for (const name of ["Error", "SyntaxError", "TypeError"]) {
      const value = report(true);
      value.cvgHarness.tests[0]!.errors[0]!.name = name;
      expect(await validate(execution(value, 1), baseline)).toMatchObject({
        outcome: "HARNESS_ERROR",
      });
    }
    const value = report(true);
    expect(
      await validate(
        execution(
          {
            ...value,
            cvgHarness: {
              ...value.cvgHarness,
              unhandledErrors: [{ name: "Error" }],
            },
          },
          1,
        ),
        baseline,
      ),
    ).toMatchObject({ outcome: "HARNESS_ERROR" });
  });

  it("rejects stale, duplicate and changed test inventories", async () => {
    const value = report();
    expect(
      await validate({ ...execution(), runId: "different-run" }),
    ).toMatchObject({ outcome: "HARNESS_ERROR" });
    value.testResults[0]!.assertionResults.push(
      value.testResults[0]!.assertionResults[0]!,
    );
    expect(await validate(execution(value))).toMatchObject({
      outcome: "HARNESS_ERROR",
    });
    const changed = report(true);
    changed.testResults[0]!.assertionResults[0]!.fullName = "different test";
    expect(await validate(execution(changed, 1), execution())).toMatchObject({
      outcome: "HARNESS_ERROR",
    });
  });
});

describe("mutation harness exact identities", () => {
  const source = "export const value = 1 + 2;\n";
  const mutant = {
    source: "fixture/math.ts",
    sourceDigest: digest(source),
    mutatorName: "ArithmeticOperator",
    location: { start: { line: 1, column: 21 }, end: { line: 1, column: 26 } },
    replacement: "1 - 2",
  };

  it("matches exact identities without nearby-line credit", async () => {
    expect(
      await evaluate(
        identityHelper,
        `api.validateMutationIdentities(${JSON.stringify([mutant])}, ${JSON.stringify({ "fixture/math.ts": source })})`,
      ),
    ).toMatchObject({ valid: true });
    const other = { ...mutant, replacement: "1 * 2" };
    const changedLocation = {
      ...mutant,
      location: { ...mutant.location, start: { line: 1, column: 22 } },
    };
    for (const candidate of [
      other,
      changedLocation,
      { ...mutant, mutatorName: "OtherOperator" },
    ]) {
      expect(
        await evaluate(
          identityHelper,
          `({ equal: api.mutationIdentityKey(${JSON.stringify(mutant)}) === api.mutationIdentityKey(${JSON.stringify(candidate)}) })`,
        ),
      ).toEqual({ equal: false });
    }
  });

  it("rejects duplicate identities, missing source/digest and stale hashes", async () => {
    for (const identities of [
      [mutant, mutant],
      [{ ...mutant, sourceDigest: "0".repeat(64) }],
      [{ ...mutant, sourceDigest: undefined }],
      [{ ...mutant, source: "absent.ts" }],
    ]) {
      expect(
        await evaluate(
          identityHelper,
          `api.validateMutationIdentities(${JSON.stringify(identities)}, ${JSON.stringify({ "fixture/math.ts": source })})`,
        ),
      ).toMatchObject({ valid: false, outcome: "NOT_VERIFIED" });
    }
  });
});

describe("mutation harness real reporter contract in disposable fixtures", () => {
  it("uses the installed Vitest reporter for green/assertion/infrastructure results", async () => {
    const root = await mkdtemp(join(tmpdir(), "cvg-mutation-harness-"));
    try {
      const testFile = join(root, "math.test.mjs");
      const config = join(root, "vitest.config.mjs");
      const vitest = resolve("node_modules/vitest/vitest.mjs");
      const vitestImport = resolve("node_modules/vitest/dist/index.js");
      await writeFile(
        config,
        `export default { test: { include: ["**/*.test.mjs"], fileParallelism: false, cache: false } };`,
      );
      const prefix = `import { test, expect } from ${JSON.stringify(vitestImport)};`;
      const run = `await api.runSuite({ cwd: ${JSON.stringify(root)}, files: [${JSON.stringify(testFile)}], vitest: ${JSON.stringify(vitest)}, config: ${JSON.stringify(config)}, timeout: 20000 })`;
      await writeFile(
        testFile,
        `${prefix} test("adds", () => expect(1 + 1).toBe(2));`,
      );
      const baseline = await evaluate(helper, run);
      expect(await validate(baseline)).toMatchObject({
        outcome: "BASELINE_GREEN",
      });
      await writeFile(
        testFile,
        `${prefix} test("adds", () => expect(1 + 1).toBe(3));`,
      );
      expect(
        await validate(await evaluate(helper, run), baseline),
      ).toMatchObject({ outcome: "ASSERTION_FAILURE", countableKill: false });
      await writeFile(
        testFile,
        `${prefix} test("adds", () => { throw new Error("fixture infrastructure"); });`,
      );
      expect(
        await validate(await evaluate(helper, run), baseline),
      ).toMatchObject({ outcome: "HARNESS_ERROR" });
      for (const body of [
        `${prefix} const invalid = ;`,
        `${prefix} test.skip("adds", () => expect(2).toBe(2));`,
        `${prefix} test("adds", async () => { await new Promise(() => {}); }, 10);`,
        `${prefix} test("adds", () => { process.exit(2); });`,
        `${prefix} test("adds", async () => { Promise.reject(new Error("fixture unhandled")); await new Promise(resolve => setTimeout(resolve, 20)); expect(2).toBe(3); });`,
        `${prefix} import { beforeEach } from ${JSON.stringify(vitestImport)}; beforeEach(() => expect(2).toBe(3)); test("adds", () => expect(2).toBe(2));`,
        "export const noTests = true;",
      ]) {
        await writeFile(testFile, body);
        expect(
          await validate(await evaluate(helper, run), baseline),
        ).toMatchObject({ outcome: "HARNESS_ERROR" });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 90000);

  it.each(["closure", "critical"])(
    "quarantines historical %s entrypoint before writes or processes",
    async (name) => {
      const source = await readFile(
        resolve(`scripts/verify-mutation-${name}.mjs`),
        "utf8",
      );
      expect(source).not.toContain("await writeFile(TARGET,");
      expect(source).not.toContain("Math.min(");
      expect(source).not.toContain("equivalent_count: 10");
      expect(source).not.toContain("mutation-summary.json");
      expect(source).not.toContain("reports/");
      const result = await evaluate(
        resolve(`scripts/verify-mutation-${name}.mjs`),
        "api.verifyHistoricalClosure()",
      );
      expect(result).toMatchObject({ status: "NOT_VERIFIED", exitCode: 1 });
      const root = await mkdtemp(join(tmpdir(), "cvg-mutation-cli-"));
      try {
        const sentinel = join(root, "source.ts");
        await writeFile(sentinel, "export const value = 2;\n");
        for (const flags of [
          [],
          ["--write-summary"],
          ["--check-anchors"],
          ["--only=missing"],
        ]) {
          const result = await execFileAsync(
            process.execPath,
            [resolve(`scripts/verify-mutation-${name}.mjs`), ...flags],
            { cwd: root },
          ).then(
            () => ({ code: 0, stderr: "" }),
            (error: { code: number; stderr: string }) => error,
          );
          expect(result.code).toBe(1);
          expect(JSON.parse(result.stderr)).toMatchObject({
            status: "NOT_VERIFIED",
          });
          expect(await readFile(sentinel, "utf8")).toBe(
            "export const value = 2;\n",
          );
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});
