import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { requireIsolatedRoot } from "../../scripts/verify-mutation-closure.mjs";
import { validateDedicatedCandidateRoot } from "../../scripts/mutation-safe-files.mjs";
import {
  runSuite,
  validateSuiteResult,
} from "../../scripts/mutation-result-validation.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const entrypoint = resolve(
  "tests/integration/support/mutation-closure-test-runner.mjs",
);
const productionCliEntrypoint = resolve("scripts/verify-mutation-closure.mjs");
const candidateRunId = "fixture-mutation-run-20261002";
const candidateSha = "a".repeat(40);
const digest = (source: string) =>
  createHash("sha256").update(source).digest("hex");

const sourceName = "src/math.mjs";
const source = "export function add(a, b) {\n  return a + b;\n}\n";
const secondSourceName = "src/subtract.mjs";
const secondSource = "export function subtract(a, b) {\n  return a - b;\n}\n";
const vitestPath = () => resolve("node_modules/vitest/vitest.mjs");
const testPrefix = `import { test, expect } from ${JSON.stringify(resolve("node_modules/vitest/dist/index.js"))};
import { add } from "./math.mjs";
`;
const identity = (sourceDigest: string, replacement = "a - b") => ({
  id: "F001",
  source: sourceName,
  sourceDigest,
  mutatorName: "ArithmeticOperator",
  location: { start: { line: 2, column: 10 }, end: { line: 2, column: 15 } },
  replacement,
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "cvg-mutation-candidate-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, sourceName), source);
  await writeFile(
    join(root, "src/math.test.mjs"),
    `${testPrefix} test("adds", () => expect(add(1, 2)).toBe(3));`,
  );
  await writeFile(
    join(root, "vitest.config.mjs"),
    `export default { test: { include: ["src/**/*.test.mjs"], fileParallelism: false, cache: false } };`,
  );
  await writeFile(
    join(root, ".cvg-mutation-candidate.json"),
    JSON.stringify({
      format: "cvg-mutation-candidate/v1",
      root,
      candidateSha,
      candidateRunId,
    }),
    { flag: "wx" },
  );
  return root;
}

async function runCli(
  root: string,
  manifest: unknown,
  currentRunId: string | null = candidateRunId,
  timeoutMs = 10_000,
) {
  const path = join(root, "manifest.json");
  await writeFile(path, JSON.stringify(manifest));
  const env = { ...process.env };
  if (currentRunId === null) delete env.CVG_MUTATION_CANDIDATE_ID;
  else env.CVG_MUTATION_CANDIDATE_ID = currentRunId;
  return execFileAsync(process.execPath, [entrypoint, path], {
    cwd: root,
    env,
    timeout: timeoutMs,
  }).then(
    (value) => ({ code: 0, stdout: value.stdout, stderr: "" }),
    (error: { code: number; stdout: string; stderr: string }) => error,
  );
}

async function runProductionCli(
  root: string,
  manifest: unknown,
  extraArgs: readonly string[] = [],
  currentRunId: string | null = candidateRunId,
  timeoutMs = 10_000,
) {
  const path = join(root, "manifest.json");
  await writeFile(path, JSON.stringify(manifest));
  const env = { ...process.env };
  if (currentRunId === null) delete env.CVG_MUTATION_CANDIDATE_ID;
  else env.CVG_MUTATION_CANDIDATE_ID = currentRunId;
  return execFileAsync(
    process.execPath,
    [productionCliEntrypoint, "--bounded-manifest", path, ...extraArgs],
    {
      cwd: root,
      env,
      timeout: timeoutMs,
    },
  ).then(
    (value) => ({ code: 0, stdout: value.stdout, stderr: "" }),
    (error: { code: number; stdout: string; stderr: string }) => error,
  );
}

const manifestOf = (root: string, overrides: Record<string, unknown> = {}) => ({
  root,
  candidateSha,
  candidateRunId,
  vitest: vitestPath(),
  config: "vitest.config.mjs",
  sources: { [sourceName]: source },
  tests: ["src/math.test.mjs"],
  identities: [identity(digest(source))],
  timeout: 30000,
  ...overrides,
});

describe("bounded candidate closure mode", () => {
  it("marks synthetic harness kills as test-only without candidate provenance", async () => {
    const root = await fixture();
    try {
      const result = await runCli(root, manifestOf(root));
      expect(result.code).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({
        status: "TEST_ONLY_KILLED",
        exitCode: 0,
        testOnly: true,
      });
      expect(payload).not.toHaveProperty("candidateRunId");
      expect(payload.results[0]).toMatchObject({
        outcome: "TEST_ONLY_KILLED",
        baselineDigest: digest(source),
        restored: true,
      });
      expect(payload.results[0].candidateDigest).not.toBe(digest(source));
      expect(payload.results[0].failedTests.length).toBeGreaterThan(0);
      expect(await readFile(join(root, sourceName), "utf8")).toBe(source);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 60000);

  it("downgrades each synthetic kill when test-only results are mixed", async () => {
    const root = await fixture();
    try {
      await writeFile(join(root, secondSourceName), secondSource);
      const result = await runCli(
        root,
        manifestOf(root, {
          sources: {
            [sourceName]: source,
            [secondSourceName]: secondSource,
          },
          identities: [
            identity(digest(source)),
            {
              ...identity(digest(secondSource), "a + b"),
              id: "F002",
              source: secondSourceName,
            },
          ],
        }),
      );
      const payload = JSON.parse(result.stdout);
      expect(payload.status).toBe("SURVIVED");
      expect(
        payload.results.map((entry: { outcome: string }) => entry.outcome),
      ).toEqual(["TEST_ONLY_KILLED", "NO_EFFECT"]);
      expect(
        payload.results.some(
          (entry: { outcome: string }) => entry.outcome === "KILLED",
        ),
      ).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 60000);

  it("rejects the repository root and ancestors before any write", async () => {
    for (const root of [repoRoot, resolve(repoRoot, ".."), "/"]) {
      const candidate = await fixture();
      try {
        const result = await runCli(candidate, manifestOf(candidate, { root }));
        expect(result.code).toBe(1);
        expect(JSON.parse(result.stdout)).toMatchObject({
          status: "HARNESS_ERROR",
        });
        expect(await readFile(join(candidate, sourceName), "utf8")).toBe(
          source,
        );
      } finally {
        await rm(candidate, { recursive: true, force: true });
      }
    }
  });

  it("does not mistake a sibling candidate directory for part of the repository", async () => {
    expect(() =>
      requireIsolatedRoot(resolve(repoRoot, "..", "cvg-candidate-copy")),
    ).not.toThrow();
  });

  it("rejects candidate roots without the private producer directory and marker", async () => {
    const root = await fixture();
    const untrusted = await mkdtemp(join(tmpdir(), "cvg-untrusted-tree-"));
    try {
      const sentinel = join(untrusted, "sentinel.txt");
      await writeFile(sentinel, "must remain unchanged\n");
      const result = await runCli(root, manifestOf(root, { root: untrusted }));
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(await readFile(sentinel, "utf8")).toBe("must remain unchanged\n");
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(untrusted, { recursive: true, force: true });
    }
  });

  it("requires the current run id before opening a candidate for mutation", async () => {
    const root = await fixture();
    try {
      const result = await runCli(root, manifestOf(root), null);
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(await readFile(join(root, sourceName), "utf8")).toBe(source);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires strict producer provenance for command-line closure", async () => {
    const root = await fixture();
    try {
      const result = await runProductionCli(root, manifestOf(root));
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(JSON.parse(result.stdout).detail).toMatch(
        /candidate manifest provenance is missing/u,
      );
      expect(await readFile(join(root, sourceName), "utf8")).toBe(source);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a FIFO bounded manifest without blocking", async () => {
    const root = await fixture();
    const manifestPath = join(root, "manifest.json");
    try {
      await execFileAsync("mkfifo", [manifestPath]);
      const startedAt = Date.now();
      const result = await execFileAsync(
        process.execPath,
        [productionCliEntrypoint, "--bounded-manifest", manifestPath],
        {
          cwd: root,
          env: {
            ...process.env,
            CVG_MUTATION_CANDIDATE_ID: candidateRunId,
          },
          timeout: 1_500,
        },
      ).then(
        (value) => ({ code: 0, stdout: value.stdout }),
        (error: { code: number; stdout: string }) => error,
      );
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(Date.now() - startedAt).toBeLessThan(1_500);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects FIFO test inputs promptly instead of blocking outside the timeout", async () => {
    const root = await fixture();
    try {
      const testPath = join(root, "src/math.test.mjs");
      await unlink(testPath);
      await execFileAsync("mkfifo", [testPath]);

      const startedAt = Date.now();
      const result = await runCli(
        root,
        manifestOf(root),
        candidateRunId,
        1_500,
      );
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(Date.now() - startedAt).toBeLessThan(1_500);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked parent that points outside the candidate and preserves its sentinel", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-outside-"));
    try {
      const outsideSource = join(outside, "math.mjs");
      await writeFile(outsideSource, source);
      await writeFile(
        join(outside, "math.test.mjs"),
        await readFile(join(root, "src/math.test.mjs"), "utf8"),
      );
      await rm(join(root, "src"), { recursive: true });
      await symlink(outside, join(root, "src"), "dir");

      const result = await runCli(root, manifestOf(root));
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(await readFile(outsideSource, "utf8")).toBe(source);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("rejects final source and test symlinks and traversal paths before writing", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-final-link-"));
    try {
      const outsideSource = join(outside, "sentinel.mjs");
      await writeFile(outsideSource, source);
      const sourcePath = join(root, sourceName);
      await unlink(sourcePath);
      await symlink(outsideSource, sourcePath, "file");

      const sourceLink = await runCli(root, manifestOf(root));
      expect(sourceLink.code).toBe(1);
      expect(JSON.parse(sourceLink.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(await readFile(outsideSource, "utf8")).toBe(source);

      await unlink(sourcePath);
      await writeFile(sourcePath, source);
      const testPath = join(root, "src/math.test.mjs");
      const outsideTest = join(outside, "sentinel.test.mjs");
      await writeFile(outsideTest, await readFile(testPath, "utf8"));
      await unlink(testPath);
      await symlink(outsideTest, testPath, "file");
      const testLink = await runCli(root, manifestOf(root));
      expect(testLink.code).toBe(1);
      expect(JSON.parse(testLink.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(await readFile(outsideSource, "utf8")).toBe(source);

      const traversal = await runCli(
        root,
        manifestOf(root, {
          sources: { "src/../outside.mjs": source },
        }),
      );
      expect(traversal.code).toBe(1);
      expect(JSON.parse(traversal.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(await readFile(outsideSource, "utf8")).toBe(source);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("uses each identity's own source digest across multiple source files", async () => {
    const root = await fixture();
    try {
      await writeFile(join(root, secondSourceName), secondSource);
      await writeFile(
        join(root, "src/math.test.mjs"),
        `${testPrefix}import { subtract } from "./subtract.mjs";\n` +
          `test("adds", () => expect(add(1, 2)).toBe(3));\n` +
          `test("subtracts", () => expect(subtract(3, 1)).toBe(2));`,
      );
      const secondIdentity = {
        ...identity(digest(secondSource), "a + b"),
        id: "F002",
        source: secondSourceName,
      };
      const manifest = manifestOf(root, {
        sources: {
          [sourceName]: source,
          [secondSourceName]: secondSource,
        },
        identities: [identity(digest(source)), secondIdentity],
      });

      const result = await runCli(root, manifest);
      expect(result.code).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({
        status: "TEST_ONLY_KILLED",
        exitCode: 0,
        testOnly: true,
      });
      expect(payload.results).toHaveLength(2);
      expect(
        payload.results.map(
          (entry: { baselineDigest: string }) => entry.baselineDigest,
        ),
      ).toEqual([digest(source), digest(secondSource)]);
      expect(
        payload.results.every((entry: { restored: boolean }) => entry.restored),
      ).toBe(true);
      expect(await readFile(join(root, sourceName), "utf8")).toBe(source);
      expect(await readFile(join(root, secondSourceName), "utf8")).toBe(
        secondSource,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an identity whose digest belongs to a different source", async () => {
    const root = await fixture();
    try {
      await writeFile(join(root, secondSourceName), secondSource);
      const crossedIdentity = {
        ...identity(digest(source)),
        source: secondSourceName,
      };
      const result = await runCli(
        root,
        manifestOf(root, {
          sources: {
            [sourceName]: source,
            [secondSourceName]: secondSource,
          },
          identities: [crossedIdentity],
        }),
      );
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "NOT_VERIFIED",
      });
      expect(await readFile(join(root, sourceName), "utf8")).toBe(source);
      expect(await readFile(join(root, secondSourceName), "utf8")).toBe(
        secondSource,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("restores the source without following a test-created symlink", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-restore-"));
    try {
      const sourcePath = join(root, sourceName);
      const outsideSentinel = join(outside, "sentinel.mjs");
      const sentinelContents = "outside sentinel must remain unchanged\n";
      await writeFile(outsideSentinel, sentinelContents);
      await writeFile(
        join(root, "src/math.test.mjs"),
        `${testPrefix}` +
          `import { readFile, symlink, unlink } from "node:fs/promises";\n` +
          `test("damages only this disposable fixture", async () => {\n` +
          `  if ((await readFile(${JSON.stringify(sourcePath)}, "utf8")) !== ${JSON.stringify(source)}) {\n` +
          `    await unlink(${JSON.stringify(sourcePath)});\n` +
          `    await symlink(${JSON.stringify(outsideSentinel)}, ${JSON.stringify(sourcePath)});\n` +
          `  }\n` +
          `  expect(add(1, 2)).toBe(3);\n` +
          `});`,
      );

      const result = await runCli(root, manifestOf(root));
      expect(result.code).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({ status: "HARNESS_ERROR" });
      expect(payload.results[0]).toMatchObject({
        outcome: "HARNESS_ERROR",
        restored: true,
      });
      expect(payload.results[0].detail).toMatch(
        /restor|symlink|symbolic link|ELOOP|file/u,
      );
      expect(await readFile(outsideSentinel, "utf8")).toBe(sentinelContents);
      expect(await readFile(sourcePath, "utf8")).toBe(source);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("restores through an atomic replacement without changing an external hard link", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-hardlink-"));
    try {
      const sourcePath = join(root, sourceName);
      const outsideSentinel = join(outside, "sentinel.mjs");
      const sentinelContents = "external sentinel must remain unchanged\n";
      await writeFile(outsideSentinel, sentinelContents);
      await writeFile(
        join(root, "src/math.test.mjs"),
        `${testPrefix}` +
          `import { link, readFile, unlink } from "node:fs/promises";\n` +
          `test("does not edit a hard-linked external file", async () => {\n` +
          `  if ((await readFile(${JSON.stringify(sourcePath)}, "utf8")) !== ${JSON.stringify(source)}) {\n` +
          `    await unlink(${JSON.stringify(sourcePath)});\n` +
          `    await link(${JSON.stringify(outsideSentinel)}, ${JSON.stringify(sourcePath)});\n` +
          `  }\n` +
          `  expect(add(1, 2)).toBe(3);\n` +
          `});`,
      );

      const result = await runCli(root, manifestOf(root));
      expect(result.code).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({ status: "HARNESS_ERROR" });
      expect(payload.results[0]).toMatchObject({
        outcome: "HARNESS_ERROR",
        restored: true,
      });
      expect(await readFile(outsideSentinel, "utf8")).toBe(sentinelContents);
      expect(await readFile(sourcePath, "utf8")).toBe(source);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("does not follow a candidate parent replaced during mutant execution", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-parent-race-"));
    try {
      const sourcePath = join(root, sourceName);
      const movedSourceDirectory = join(outside, "moved-src");
      const outsideSentinel = join(outside, "math.mjs");
      const sentinelContents = "outside path must remain unchanged\n";
      await writeFile(outsideSentinel, sentinelContents);
      await writeFile(
        join(root, "src/math.test.mjs"),
        `${testPrefix}` +
          `import { readFile, rename, symlink } from "node:fs/promises";\n` +
          `test("does not redirect the harness through a moved parent", async () => {\n` +
          `  if ((await readFile(${JSON.stringify(sourcePath)}, "utf8")) !== ${JSON.stringify(source)}) {\n` +
          `    await rename(${JSON.stringify(join(root, "src"))}, ${JSON.stringify(movedSourceDirectory)});\n` +
          `    await symlink(${JSON.stringify(outside)}, ${JSON.stringify(join(root, "src"))}, "dir");\n` +
          `  }\n` +
          `  expect(add(1, 2)).toBe(3);\n` +
          `});`,
      );

      const result = await runCli(root, manifestOf(root));
      expect(result.code).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({ status: "HARNESS_ERROR" });
      expect(payload.results[0]).toMatchObject({
        outcome: "HARNESS_ERROR",
        restored: false,
      });
      expect(await readFile(outsideSentinel, "utf8")).toBe(sentinelContents);
      expect(
        await readFile(join(movedSourceDirectory, "math.mjs"), "utf8"),
      ).toBe(source.replace("a + b", "a - b"));
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("rejects a moved candidate root rebound through a symlink without restoring outside", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-root-race-"));
    try {
      const sourcePath = join(root, sourceName);
      const movedCandidateRoot = join(outside, "moved-candidate");
      const outsideSentinel = join(outside, "sentinel.txt");
      const sentinelContents = "external sentinel must remain unchanged\n";
      await writeFile(outsideSentinel, sentinelContents);
      await writeFile(
        join(root, "src/math.test.mjs"),
        `${testPrefix}` +
          `import { readFile, rename, symlink } from "node:fs/promises";\n` +
          `test("cannot rebind the candidate root", async () => {\n` +
          `  if ((await readFile(${JSON.stringify(sourcePath)}, "utf8")) !== ${JSON.stringify(source)}) {\n` +
          `    await rename(${JSON.stringify(root)}, ${JSON.stringify(movedCandidateRoot)});\n` +
          `    await symlink(${JSON.stringify(movedCandidateRoot)}, ${JSON.stringify(root)}, "dir");\n` +
          `  }\n` +
          `  expect(add(1, 2)).toBe(3);\n` +
          `});`,
      );

      const result = await runCli(root, manifestOf(root));
      expect(result.code).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({ status: "HARNESS_ERROR" });
      expect(payload.results[0]).toMatchObject({
        outcome: "HARNESS_ERROR",
        restored: false,
      });
      expect(payload.results[0].detail).toMatch(/moved|refused|contained/u);
      expect(await readFile(outsideSentinel, "utf8")).toBe(sentinelContents);
      expect(await readFile(join(movedCandidateRoot, sourceName), "utf8")).toBe(
        source.replace("a + b", "a - b"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("rejects a candidate root rebound to an ordinary directory during baseline", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-root-rebind-"));
    const movedCandidateRoot = join(outside, "moved-candidate");
    const sourcePath = join(root, sourceName);
    const testPath = join(root, "src/math.test.mjs");
    const replacementSource = "replacement sentinel must remain unchanged\n";
    try {
      await writeFile(
        testPath,
        `${testPrefix}` +
          `import { mkdir, readFile, rename, writeFile } from "node:fs/promises";\n` +
          `test("cannot replace the candidate root during baseline", async () => {\n` +
          `  if ((await readFile(${JSON.stringify(sourcePath)}, "utf8")) === ${JSON.stringify(source)}) {\n` +
          `    await rename(${JSON.stringify(root)}, ${JSON.stringify(movedCandidateRoot)});\n` +
          `    await mkdir(${JSON.stringify(join(root, "src"))}, { recursive: true });\n` +
          `    await writeFile(${JSON.stringify(join(root, sourceName))}, ${JSON.stringify(source)});\n` +
          `    await writeFile(${JSON.stringify(join(root, "src/math.test.mjs"))}, ${JSON.stringify(`${testPrefix}import { writeFile } from "node:fs/promises";\ntest("adds", async () => { if (add(1, 2) !== 3) await writeFile(${JSON.stringify(join(root, "mutant-executed.txt"))}, "executed"); expect(add(1, 2)).toBe(3); });`)});\n` +
          `    await writeFile(${JSON.stringify(join(root, "vitest.config.mjs"))}, ${JSON.stringify(`export default { test: { include: ["src/**/*.test.mjs"], fileParallelism: false, cache: false } };`)});\n` +
          `    await writeFile(${JSON.stringify(join(root, "replacement-sentinel.txt"))}, ${JSON.stringify(replacementSource)});\n` +
          `  }\n` +
          `  expect(add(1, 2)).toBe(3);\n` +
          `});`,
      );

      const result = await runCli(root, manifestOf(root));
      expect(result.code).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({ status: "HARNESS_ERROR" });
      expect(payload.results[0]?.outcome).not.toBe("KILLED");
      expect(await readFile(join(movedCandidateRoot, sourceName), "utf8")).toBe(
        source,
      );
      expect(
        await readFile(join(root, "mutant-executed.txt"), "utf8").catch(
          () => null,
        ),
      ).toBeNull();
      expect(
        await readFile(join(root, "replacement-sentinel.txt"), "utf8"),
      ).toBe(replacementSource);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(movedCandidateRoot, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  }, 60000);

  it("rejects absolute runner paths when Vitest cwd is descriptor-anchored", async () => {
    const root = await fixture();
    const outside = await mkdtemp(
      join(tmpdir(), "cvg-mutation-config-rebind-"),
    );
    const movedRoot = join(outside, "original-root");
    let rootLease:
      Awaited<ReturnType<typeof validateDedicatedCandidateRoot>> | undefined;
    try {
      await symlink(resolve("node_modules"), join(root, "node_modules"), "dir");
      await mkdir(join(root, "scripts"), { recursive: true });
      await writeFile(
        join(root, "scripts/mutation-result-reporter.mjs"),
        await readFile(resolve("scripts/mutation-result-reporter.mjs"), "utf8"),
      );
      rootLease = await validateDedicatedCandidateRoot(root, {
        candidateSha,
        candidateRunId,
        expectedRunId: candidateRunId,
      });
      await rename(root, movedRoot);
      await mkdir(join(root, "src"), { recursive: true });
      await writeFile(join(root, sourceName), source);
      await writeFile(
        join(root, "src/math.test.mjs"),
        `${testPrefix} test("replacement test", () => expect(true).toBe(false));`,
      );
      await writeFile(
        join(root, "vitest.config.mjs"),
        `export default { root: ${JSON.stringify(root)}, test: { include: ["src/**/*.test.mjs"], fileParallelism: false, cache: false } };`,
      );

      expect(await rootLease.isStillCurrent()).toBe(false);
      const absoluteConfig = await runSuite({
        cwd: rootLease.executionPath,
        expectedRoot: movedRoot,
        files: ["src/math.test.mjs"],
        vitest: "node_modules/vitest/vitest.mjs",
        config: join(root, "vitest.config.mjs"),
        allowExternalRunnerPaths: false,
        project: undefined,
        timeout: 30000,
      });
      expect(absoluteConfig).toMatchObject({
        outcome: "HARNESS_ERROR",
        detail: expect.stringMatching(/descriptor.*relative|relative.*config/u),
      });

      const absoluteVitest = await runSuite({
        cwd: rootLease.executionPath,
        expectedRoot: movedRoot,
        files: ["src/math.test.mjs"],
        vitest: vitestPath(),
        config: "vitest.config.mjs",
        allowExternalRunnerPaths: false,
        project: undefined,
        timeout: 30000,
      });
      expect(absoluteVitest).toMatchObject({
        outcome: "HARNESS_ERROR",
        detail: expect.stringMatching(/descriptor.*relative|relative.*vitest/u),
      });

      const relativeConfig = await runSuite({
        cwd: rootLease.executionPath,
        expectedRoot: movedRoot,
        files: ["src/math.test.mjs"],
        vitest: "node_modules/vitest/vitest.mjs",
        config: "vitest.config.mjs",
        allowExternalRunnerPaths: false,
        project: undefined,
        timeout: 30000,
      });
      expect(validateSuiteResult(relativeConfig).outcome).toBe(
        "BASELINE_GREEN",
      );
    } finally {
      await rootLease?.close();
      await rm(root, { recursive: true, force: true });
      await rm(movedRoot, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  }, 60000);

  it("rejects test-input changes made during baseline before running mutants", async () => {
    const root = await fixture();
    const testPath = join(root, "src/math.test.mjs");
    const replacementTest = `${testPrefix} test("cannot change runner inputs during baseline", () => expect(add(1, 2)).toBe(3));`;
    try {
      await writeFile(
        testPath,
        `${testPrefix}` +
          `import { readFile, writeFile } from "node:fs/promises";\n` +
          `test("cannot change runner inputs during baseline", async () => {\n` +
          `  if ((await readFile(${JSON.stringify(testPath)}, "utf8")).includes("SELF_MODIFY_ONCE")) {\n` +
          `    await writeFile(${JSON.stringify(testPath)}, ${JSON.stringify(replacementTest)});\n` +
          `  }\n` +
          `  // SELF_MODIFY_ONCE\n` +
          `  expect(add(1, 2)).toBe(3);\n` +
          `});`,
      );
      const manifest = manifestOf(root, {
        tests: ["src/math.test.mjs"],
      });

      const result = await runCli(root, manifest);
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(JSON.parse(result.stdout).detail).toMatch(/input|digest|changed/u);
      expect(await readFile(join(root, sourceName), "utf8")).toBe(source);
      expect(await readFile(testPath, "utf8")).toBe(replacementTest);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 60000);

  it("rejects byte-mismatched UTF-8 baselines and preserves the original bytes", async () => {
    const root = await fixture();
    try {
      const sourcePath = join(root, sourceName);
      const invalidBytes = Buffer.concat([
        Buffer.from("export function add(a, b) {\n  return a + b; // "),
        Buffer.from([0x80]),
        Buffer.from("\n}\n"),
      ]);
      const decoded = invalidBytes.toString("utf8");
      await writeFile(sourcePath, invalidBytes);
      const manifest = manifestOf(root, {
        sources: { [sourceName]: decoded },
        identities: [identity(digest(decoded))],
      });

      const result = await runCli(root, manifest);
      expect(result.code).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({ status: "HARNESS_ERROR" });
      expect(payload.results[0]).toMatchObject({
        outcome: "HARNESS_ERROR",
        restored: true,
      });
      expect(await readFile(sourcePath)).toEqual(invalidBytes);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a result path whose parent is a symlink", async () => {
    const root = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-result-"));
    try {
      const outsideSentinel = join(outside, "result.json");
      await writeFile(outsideSentinel, "external sentinel\n");
      await symlink(outside, join(root, "out"), "dir");
      const result = await runProductionCli(
        root,
        manifestOf(root, { identities: [] }),
        ["--result-out", "out/result.json"],
      );
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "HARNESS_ERROR",
      });
      expect(await readFile(outsideSentinel, "utf8")).toBe(
        "external sentinel\n",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("publishes a complete result file exclusively after serialization", async () => {
    const root = await fixture();
    const outputDirectory = join(root, "out");
    try {
      await mkdir(outputDirectory);
      const result = await runProductionCli(root, manifestOf(root), [
        "--result-out",
        "out/result.json",
      ]);
      expect(result.code).toBe(1);
      const output = JSON.parse(
        await readFile(join(outputDirectory, "result.json"), "utf8"),
      );
      expect(output).toMatchObject({ status: "HARNESS_ERROR" });
      expect(await readdir(outputDirectory)).toEqual(["result.json"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses stale identities and reports survivors honestly", async () => {
    const root = await fixture();
    try {
      const stale = await runCli(
        root,
        manifestOf(root, { identities: [identity("0".repeat(64))] }),
      );
      expect(stale.code).toBe(1);
      expect(JSON.parse(stale.stdout)).toMatchObject({
        status: "NOT_VERIFIED",
      });
      expect(await readFile(join(root, sourceName), "utf8")).toBe(source);
      const survivor = await runCli(
        root,
        manifestOf(root, { identities: [identity(digest(source), "b + a")] }),
      );
      expect(survivor.code).toBe(1);
      expect(JSON.parse(survivor.stdout)).toMatchObject({ status: "SURVIVED" });
      expect(await readFile(join(root, sourceName), "utf8")).toBe(source);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stays fail-closed without arguments", async () => {
    const root = await fixture();
    try {
      const result = await execFileAsync(
        process.execPath,
        [productionCliEntrypoint],
        { cwd: root },
      ).then(
        () => ({ code: 0, stderr: "" }),
        (error: { code: number; stderr: string }) => error,
      );
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stderr)).toMatchObject({
        status: "NOT_VERIFIED",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
