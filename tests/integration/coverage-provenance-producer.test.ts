import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";

import { measureCoverage } from "../../scripts/run-coverage-with-provenance.mjs";

const execute = promisify(execFile);
const roots: string[] = [];
const report = {
  total: Object.fromEntries(
    ["statements", "branches", "functions", "lines"].map((key) => [
      key,
      { pct: 95, total: 100, covered: 95 },
    ]),
  ),
};
const ci = {
  GITHUB_ACTIONS: "true",
  GITHUB_REPOSITORY: "synthetic/cvg",
  GITHUB_RUN_ID: "17",
  GITHUB_RUN_ATTEMPT: "2",
  GITHUB_REF: "refs/heads/main",
  GITHUB_WORKFLOW_REF:
    "synthetic/cvg/.github/workflows/candidate.yml@refs/heads/main",
};

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "cvg-coverage-producer-"));
  roots.push(root);
  await mkdir(join(root, "apps"));
  await writeFile(
    join(root, "apps/source.ts"),
    "export const synthetic = true;\n",
  );
  await writeFile(join(root, ".gitignore"), "coverage/\n");
  await execute("git", ["init", "--quiet"], { cwd: root });
  await execute("git", ["add", "."], { cwd: root });
  await execute(
    "git",
    [
      "-c",
      "user.name=Synthetic",
      "-c",
      "user.email=fixture@cvg.example",
      "commit",
      "--quiet",
      "-m",
      "synthetic fixture",
    ],
    { cwd: root },
  );
  return root;
}

async function writeReport(root: string) {
  await writeFile(
    join(root, "coverage/coverage-summary.json"),
    JSON.stringify(report),
  );
  return 0;
}

async function ciAt(root: string) {
  const { stdout } = await execute("git", ["rev-parse", "HEAD"], { cwd: root });
  return { ...ci, GITHUB_SHA: stdout.trim() };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("routes official coverage through the measurement producer", async () => {
  const manifest: unknown = JSON.parse(
    await readFile(join(process.cwd(), "package.json"), "utf8"),
  );
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    !("scripts" in manifest) ||
    manifest.scripts === null ||
    typeof manifest.scripts !== "object" ||
    !("test:coverage" in manifest.scripts)
  )
    throw new Error("Missing official coverage command");
  expect(manifest.scripts["test:coverage"]).toBe(
    "node scripts/run-coverage-with-provenance.mjs",
  );
});

it("binds fresh raw bytes and measurement time to the clean producer run", async () => {
  const root = await fixture();
  const result = await measureCoverage(root, writeReport, await ciAt(root));
  const { stdout } = await execute("git", ["rev-parse", "HEAD"], { cwd: root });
  expect(result.exitCode).toBe(0);
  expect(result.proof).toMatchObject({
    status: "PASS",
    sha: stdout.trim(),
    ci: {
      run_id: 17,
      run_attempt: 2,
      executing_head: stdout.trim(),
      repository: "synthetic/cvg",
      ref: "refs/heads/main",
      workflow_ref: ci.GITHUB_WORKFLOW_REF,
    },
    checkout: { before: true, after: true },
  });
  expect(result.proof.raw_sha256).toBe(
    createHash("sha256")
      .update(await readFile(join(root, "coverage/coverage-summary.json")))
      .digest("hex"),
  );
  expect(result.proof.generatedAt).toBe(result.proof.measurement.completedAt);
});

it("cannot reuse a prior report when the successful child produced none", async () => {
  const root = await fixture();
  await mkdir(join(root, "coverage"));
  await writeReport(root);
  await writeFile(
    join(root, "coverage/coverage-provenance.json"),
    JSON.stringify({ status: "PASS", sha: "old" }),
  );
  const result = await measureCoverage(root, async () => 0, await ciAt(root));
  expect(result.exitCode).toBe(2);
  expect(result.proof.status).toBe("FAIL");
  expect(result.proof.raw_sha256).toBeNull();
});

it("does not turn a failed child with plausible report bytes into PASS", async () => {
  const root = await fixture();
  const result = await measureCoverage(
    root,
    async (root: string) => {
      await writeReport(root);
      return 1;
    },
    await ciAt(root),
  );
  expect(result.exitCode).toBe(1);
  expect(result.proof.status).toBe("FAIL");
});

it("keeps local and changed-runtime measurements diagnostic", async () => {
  const root = await fixture();
  const local = await measureCoverage(root, writeReport, {});
  expect(local.proof).toMatchObject({
    status: "NOT_VERIFIED",
    sha: null,
    runner: "local",
  });
  const changed = await measureCoverage(
    root,
    async (directory: string) => {
      await writeFile(join(directory, "apps/source.ts"), "changed source");
      return writeReport(directory);
    },
    await ciAt(root),
  );
  expect(changed.proof).toMatchObject({
    status: "NOT_VERIFIED",
    sha: null,
    checkout: { before: true, after: false },
  });
  expect(changed.exitCode).toBe(0);
});

it("rejects empty totals and mismatched producer workflow identity", async () => {
  const root = await fixture();
  const empty = await measureCoverage(
    root,
    async (directory: string) => {
      await writeFile(
        join(directory, "coverage/coverage-summary.json"),
        '{"total":{}}',
      );
      return 0;
    },
    await ciAt(root),
  );
  expect(empty.exitCode).toBe(2);
  const wrongWorkflow = await measureCoverage(root, writeReport, {
    ...(await ciAt(root)),
    GITHUB_WORKFLOW_REF:
      "unrelated/repo/.github/workflows/candidate.yml@refs/heads/main",
  });
  expect(wrongWorkflow.proof.status).toBe("NOT_VERIFIED");
});

it.each([undefined, "0".repeat(40), "unknown"])(
  "rejects an executing CI head absent or different from the measured checkout: %s",
  async (executingHead) => {
    const root = await fixture();
    const result = await measureCoverage(root, writeReport, {
      ...ci,
      ...(executingHead === undefined ? {} : { GITHUB_SHA: executingHead }),
    });
    expect(result.proof).toMatchObject({ status: "NOT_VERIFIED", sha: null });
    expect(result.proof.measured_head).toBe((await ciAt(root)).GITHUB_SHA);
  },
);

it("rejects a workflow ref that does not exactly identify the executing ref", async () => {
  const root = await fixture();
  const result = await measureCoverage(root, writeReport, {
    ...(await ciAt(root)),
    GITHUB_REF: "refs/heads/unrelated",
  });
  expect(result.proof).toMatchObject({ status: "NOT_VERIFIED", sha: null });
});

it("does not upgrade a mismatched starting CI identity during measurement", async () => {
  const root = await fixture();
  const actual = await ciAt(root);
  const environment = { ...actual, GITHUB_SHA: "0".repeat(40) };
  const result = await measureCoverage(
    root,
    async (directory: string) => {
      environment.GITHUB_SHA = actual.GITHUB_SHA;
      return writeReport(directory);
    },
    environment,
  );
  expect(result.proof).toMatchObject({
    status: "NOT_VERIFIED",
    sha: null,
    ci: { executing_head: "0".repeat(40) },
  });
});
