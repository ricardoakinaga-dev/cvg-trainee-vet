import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";

import {
  finishEvidenceMeasurement,
  startEvidenceMeasurement,
} from "../../scripts/native-evidence-measurement.mjs";

const execute = promisify(execFile);
const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "cvg-native-evidence-"));
  roots.push(root);
  await mkdir(join(root, "apps"));
  await writeFile(
    join(root, "apps/source.ts"),
    "export const synthetic = true;\n",
  );
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

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("captures staging identity before measurements and binds each native summary", async () => {
  const source = await readFile(
    join(process.cwd(), "scripts/run-staging.mjs"),
    "utf8",
  );
  expect(source).toContain("startEvidenceMeasurement(root)");
  expect(source).toContain('"cvg-load-summary/v1"');
  expect(source).toContain('"cvg-otel-summary/v1"');
  expect(source).toContain('"cvg-staging-summary/v1"');
  expect(source).not.toContain("stdout: stagingSha");
  expect(source).toContain("await rm(summaryPath, { force: true })");
});

it("the real rate-limit producer uses the native multi-instance identity contract", async () => {
  const source = await readFile(
    join(process.cwd(), "scripts/run-ratelimit-live.mjs"),
    "utf8",
  );
  expect(source).toContain('"cvg-multi-instance-summary/v1"');
  expect(source).toContain("startEvidenceMeasurement(root)");
  expect(source).toMatch(/finishEvidenceMeasurement\(\s*measurement/u);
});

it("binds original measurement identity, chronology and exact raw bytes", async () => {
  const root = await fixture();
  const measurement = await startEvidenceMeasurement(root);
  const raw = '{"synthetic":true}\n';
  const proof = await finishEvidenceMeasurement(
    measurement,
    "cvg-load-summary/v1",
    raw,
  );
  expect(proof).toMatchObject({
    format: "cvg-load-summary/v1",
    sha: measurement.head,
    raw_sha256: createHash("sha256").update(raw).digest("hex"),
    measurement: {
      status: "VERIFIED",
      startedAt: measurement.startedAt,
      checkout: { before: true, after: true },
    },
  });
  expect(proof.generatedAt).toBe(proof.measurement.completedAt);
  expect(Date.parse(proof.generatedAt)).toBeGreaterThanOrEqual(
    Date.parse(measurement.startedAt),
  );
});

it("does not label a dirty checkout as the measured commit", async () => {
  const root = await fixture();
  await writeFile(join(root, "apps/source.ts"), "changed\n");
  const measurement = await startEvidenceMeasurement(root);
  const proof = await finishEvidenceMeasurement(
    measurement,
    "cvg-otel-summary/v1",
    "synthetic spans",
  );
  expect(proof).toMatchObject({
    sha: null,
    measured_head: measurement.head,
    measurement: {
      status: "NOT_VERIFIED",
      checkout: { before: false, after: false },
    },
  });
});

it("does not relabel a measurement when HEAD changes during the run", async () => {
  const root = await fixture();
  const measurement = await startEvidenceMeasurement(root);
  await execute(
    "git",
    [
      "-c",
      "user.name=Synthetic",
      "-c",
      "user.email=fixture@cvg.example",
      "commit",
      "--allow-empty",
      "--quiet",
      "-m",
      "new synthetic head",
    ],
    { cwd: root },
  );
  const proof = await finishEvidenceMeasurement(
    measurement,
    "cvg-staging-summary/v1",
  );
  expect(proof.sha).toBeNull();
  expect(proof.measured_head).toBe(measurement.head);
  expect(proof.measurement.status).toBe("NOT_VERIFIED");
});

it("detects runtime changes made after the measurement started", async () => {
  const root = await fixture();
  const measurement = await startEvidenceMeasurement(root);
  await writeFile(join(root, "apps/source.ts"), "changed\n");
  const proof = await finishEvidenceMeasurement(
    measurement,
    "cvg-multi-instance-summary/v1",
  );
  expect(proof).toMatchObject({
    sha: null,
    measurement: {
      status: "NOT_VERIFIED",
      checkout: { before: true, after: false },
    },
  });
});

it("missing Git identity stays diagnostic rather than unknown/PASS provenance", async () => {
  const root = await mkdtemp(join(tmpdir(), "cvg-no-git-evidence-"));
  roots.push(root);
  const measurement = await startEvidenceMeasurement(root);
  const proof = await finishEvidenceMeasurement(
    measurement,
    "cvg-multi-instance-summary/v1",
  );
  expect(proof).toMatchObject({
    sha: null,
    measured_head: null,
    measurement: { status: "NOT_VERIFIED" },
  });
});
