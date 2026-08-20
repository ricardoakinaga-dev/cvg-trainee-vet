import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const criticalMatrixTest =
  "tests/integration/critical-decision-coverage.test.ts";

export const CRITICAL_MUTATION_CASES = Object.freeze([
  Object.freeze({
    id: "NOTA",
    path: "packages/domain/src/assessment-policy.ts",
    from: "objective.critical && objective.percent < 80",
    to: "objective.critical && objective.percent <= 80",
    focalTests: [
      criticalMatrixTest,
      "packages/domain/src/assessment-policy.test.ts",
    ],
  }),
  Object.freeze({
    id: "PUBLICACAO",
    path: "packages/domain/src/content.ts",
    from: "if (nextStatus === undefined) {",
    to: "if (nextStatus !== undefined) {",
    focalTests: [criticalMatrixTest, "packages/domain/src/content.test.ts"],
  }),
  Object.freeze({
    id: "PERMISSAO",
    path: "packages/application/src/authorization.ts",
    from: 'request.accountStatus !== "ACTIVE"',
    to: 'request.accountStatus === "ACTIVE"',
    focalTests: [
      criticalMatrixTest,
      "packages/application/src/authorization.test.ts",
    ],
  }),
  Object.freeze({
    id: "ESTADO",
    path: "packages/domain/src/learning-state.ts",
    from: "const nextStatus = assignmentTransitions[state.status][event.type];\n  if (nextStatus === undefined) {",
    to: "const nextStatus = assignmentTransitions[state.status][event.type];\n  if (nextStatus !== undefined) {",
    focalTests: [
      criticalMatrixTest,
      "packages/domain/src/learning-state.test.ts",
    ],
  }),
  Object.freeze({
    id: "IDEMPOTENCIA",
    path: "packages/application/src/attempt-use-cases.ts",
    from: "if (record === null) return null;",
    to: "if (record !== null) return null;",
    focalTests: [
      criticalMatrixTest,
      "packages/application/src/attempt-use-cases.test.ts",
    ],
  }),
  Object.freeze({
    id: "CONTRATO_ESTADO",
    path: "packages/contracts/src/learning-state.ts",
    from: "const versionSchema = z.number().int().nonnegative();",
    to: "const versionSchema = z.number().int().positive();",
    focalTests: ["packages/contracts/src/learning-state.test.ts"],
  }),
  Object.freeze({
    id: "MATRIZ",
    path: "packages/domain/src/critical-decision-matrix.ts",
    from: "if (decisionCases.length === 0) {",
    to: "if (decisionCases.length > 0) {",
    focalTests: [criticalMatrixTest],
  }),
]);

export function validateMutationCase(mutation, source) {
  const errors = [];
  if (typeof mutation?.id !== "string" || mutation.id.trim() === "") {
    errors.push("mutation id is required");
  }
  if (typeof mutation?.path !== "string" || mutation.path.trim() === "") {
    errors.push("mutation path is required");
  }
  if (typeof mutation?.from !== "string" || mutation.from.length === 0) {
    errors.push("mutation source replacement is required");
  }
  if (typeof mutation?.to !== "string" || mutation.to.length === 0) {
    errors.push("mutation target replacement is required");
  }
  const replacementCount =
    typeof mutation?.from === "string" && mutation.from.length > 0
      ? source.split(mutation.from).length - 1
      : 0;
  if (replacementCount !== 1) {
    errors.push("mutation replacement must match exactly once");
  }
  if (
    !Array.isArray(mutation?.focalTests) ||
    mutation.focalTests.length === 0
  ) {
    errors.push("mutation focalTests must not be empty");
  }
  return Object.freeze(errors);
}

export function summarizeMutationResults(results) {
  const mutationCount = results.length;
  const killedCount = results.filter((result) => result.killed).length;
  const mutationScorePercent =
    mutationCount === 0
      ? 0
      : Number(((killedCount / mutationCount) * 100).toFixed(2));
  return Object.freeze({
    status: mutationScorePercent >= 90 ? "PASS" : "FAIL",
    task: "B99-303",
    mutationCount,
    killedCount,
    survivedCount: mutationCount - killedCount,
    mutationScorePercent,
    minimumMutationScorePercent: 90,
    results: Object.freeze(results.map((result) => Object.freeze(result))),
  });
}

function buildVitestConfig({ targetPath, mutatedSource, focalTests }) {
  const targetAbsolute =
    targetPath === undefined ? undefined : resolve(root, targetPath);
  const plugin =
    mutatedSource === undefined
      ? ""
      : `plugins: [{
          name: "cvg-critical-mutation-source",
          enforce: "pre",
          load(id) {
            const normalized = id.replaceAll("\\\\", "/");
            if (
              normalized === ${JSON.stringify(targetAbsolute)} ||
              normalized.startsWith(${JSON.stringify(`${targetAbsolute}?`)})
            ) {
              return ${JSON.stringify(mutatedSource)};
            }
            return null;
          },
        }],`;
  return `export default {
  root: ${JSON.stringify(root)},
  ${plugin}
  test: {
    include: ${JSON.stringify(focalTests)},
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
};
`;
}

function runVitest(configPath, focalTests) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        ...focalTests,
        "--config",
        configPath,
        "--pool=forks",
        "--maxWorkers=1",
      ],
      {
        cwd: root,
        env: { ...process.env, NODE_ENV: "test" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (exitCode, signal) => {
      resolveResult({
        passed: exitCode === 0 && signal === null,
        exitCode,
        signal,
        output: output.slice(-4_000),
      });
    });
  });
}

async function writeConfig(directory, name, options) {
  const configPath = join(directory, `${name}.mjs`);
  await writeFile(configPath, buildVitestConfig(options), "utf8");
  return configPath;
}

async function loadMutationSources() {
  const loaded = [];
  for (const mutation of CRITICAL_MUTATION_CASES) {
    const source = await readFile(resolve(root, mutation.path), "utf8");
    const errors = validateMutationCase(mutation, source);
    if (errors.length > 0) {
      throw new Error(`${mutation.id}: ${errors.join("; ")}`);
    }
    loaded.push({
      mutation,
      source,
      mutatedSource: source.replace(mutation.from, mutation.to),
    });
  }
  return loaded;
}

async function runMutationVerification() {
  const loaded = await loadMutationSources();
  const allFocalTests = [
    ...new Set(loaded.flatMap(({ mutation }) => mutation.focalTests)),
  ];
  const directory = await mkdtemp(join(tmpdir(), "cvg-critical-mutation-"));
  try {
    const baselineConfig = await writeConfig(directory, "baseline", {
      focalTests: allFocalTests,
    });
    const baseline = await runVitest(baselineConfig, allFocalTests);
    if (!baseline.passed) {
      throw new Error(`critical mutation baseline failed:\n${baseline.output}`);
    }

    const results = [];
    for (const { mutation, mutatedSource } of loaded) {
      const configPath = await writeConfig(directory, mutation.id, {
        targetPath: mutation.path,
        mutatedSource,
        focalTests: mutation.focalTests,
      });
      const result = await runVitest(configPath, mutation.focalTests);
      results.push({
        id: mutation.id,
        killed: !result.passed,
        exitCode: result.exitCode,
        signal: result.signal,
        ...(result.passed ? { output: result.output } : {}),
      });
    }
    return summarizeMutationResults(results);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith("verify-critical-mutation.mjs")) {
  const report = await runMutationVerification();
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "PASS") process.exitCode = 1;
}
