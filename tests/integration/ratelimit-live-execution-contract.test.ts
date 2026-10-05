import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const suite = "tests/integration/ratelimit-redis-live.test.ts";

async function runFixture(mode: string, selectedSuite = suite) {
  const directory = await mkdtemp(join(tmpdir(), "cvg-ratelimit-contract-"));
  const binaryDirectory = join(directory, "bin");
  const evidenceDirectory = join(directory, "evidence");
  await mkdir(binaryDirectory);
  await mkdir(evidenceDirectory);
  await writeFile(
    join(evidenceDirectory, "multi-instance-summary.json"),
    JSON.stringify({ status: "PASS", executedTests: 99 }),
  );
  const executable = `#!${process.execPath}\n`;
  await writeFile(
    join(binaryDirectory, "sh"),
    executable + "process.exit(1);\n",
    { mode: 0o700 },
  );
  await writeFile(
    join(binaryDirectory, "pnpm"),
    executable +
      `
    const fs = require("node:fs");
    const path = require("node:path");
    const mode = process.env.R1_TEST_RATE_LIMIT_MODE;
    const outputArgument = process.argv.find(argument => argument.startsWith("--outputFile="));
    const skipped = mode === "skip";
    const failed = mode === "fail";
    const empty = mode === "empty";
    const status = skipped ? "pending" : failed ? "failed" : "passed";
    if (outputArgument !== undefined && mode !== "missing-report") {
      fs.writeFileSync(outputArgument.slice("--outputFile=".length), JSON.stringify({
        success: !failed, numTotalTests: empty ? 0 : 1, numPassedTests: mode === "bad-count" ? 2 : skipped || failed || empty ? 0 : 1,
        numFailedTests: failed ? 1 : 0, numPendingTests: skipped ? 1 : 0,
        numTodoTests: 0,
        testResults: [{ name: path.resolve(process.cwd(), mode === "wrong-suite" ? "unrelated.test.ts" : ${JSON.stringify(suite)}),
          status: failed ? "failed" : "passed", assertionResults: empty ? [] : [{ status }] }],
      }));
    }
    console.log(failed ? "synthetic runner failure" : "synthetic runner exit zero");
    process.exit(failed ? 1 : 0);
  `,
    { mode: 0o700 },
  );
  const environment = {
    ...process.env,
    PATH: binaryDirectory,
    CVG_TEST_REDIS_URL: mode === "absent" ? "" : "redis://127.0.0.1:1",
    CVG_REDIS_SERVER_BIN: "",
    CVG_RATE_LIMIT_EVIDENCE_DIR: evidenceDirectory,
    R1_TEST_RATE_LIMIT_MODE: mode,
  };
  try {
    let stdout = "";
    let stderr = "";
    const code = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [join(root, "scripts/run-ratelimit-live.mjs"), selectedSuite],
        {
          cwd: root,
          env: environment,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.once("error", reject);
      child.once("close", resolve);
    });
    const summary: unknown = await readFile(
      join(evidenceDirectory, "multi-instance-summary.json"),
      "utf8",
    )
      .then(JSON.parse)
      .catch(() => null);
    return { code, stdout, stderr, summary };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("live rate-limit execution evidence", () => {
  it("records Redis absence as NOT_EXECUTED and exits nonzero", async () => {
    const result = await runFixture("absent");
    expect(result.code).toBe(2);
    expect(result.summary).toMatchObject({
      status: "NOT_EXECUTED",
      executedTests: 0,
    });
    expect(result.stdout).toContain("NOT_EXECUTED");
  });
  it("rejects an unrelated suite rather than counting its exit zero", async () => {
    const result = await runFixture(
      "pass",
      "tests/integration/migration-governance.test.ts",
    );
    expect(result.code).toBe(2);
    expect(result.summary).toMatchObject({
      status: "NOT_EXECUTED",
      executedTests: 0,
    });
  });
  it.each(["skip", "missing-report", "empty", "wrong-suite", "bad-count"])(
    "does not promote exit zero with %s to PASS",
    async (mode) => {
      const result = await runFixture(mode);
      expect(result.code).not.toBe(0);
      expect(result.summary).toMatchObject({
        status: "NOT_EXECUTED",
        executedTests: 0,
      });
    },
  );
  it("records execution failure and preserves its nonzero exit", async () => {
    const result = await runFixture("fail");
    expect(result.code).toBe(1);
    expect(result.summary).toMatchObject({ status: "FAIL", executedTests: 1 });
    expect(result.stdout).toContain("synthetic runner failure");
  });
  it("records PASS only with a matching report and actually passed tests", async () => {
    const result = await runFixture("pass");
    expect(result.code).toBe(0);
    expect(result.summary).toMatchObject({
      status: "PASS",
      executedTests: 1,
      passedTests: 1,
      skippedTests: 0,
    });
  });
});
