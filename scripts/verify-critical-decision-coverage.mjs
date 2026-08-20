import { readFile } from "node:fs/promises";

export const CRITICAL_DECISION_TARGETS = Object.freeze([
  Object.freeze({
    id: "NOTA",
    path: "packages/domain/src/assessment-policy.ts",
    minimumBranchCoverage: 100,
  }),
  Object.freeze({
    id: "PUBLICACAO",
    path: "packages/domain/src/content.ts",
    minimumBranchCoverage: 100,
  }),
  Object.freeze({
    id: "PERMISSAO",
    path: "packages/application/src/authorization.ts",
    minimumBranchCoverage: 100,
  }),
  Object.freeze({
    id: "ESTADO",
    path: "packages/domain/src/learning-state.ts",
    minimumBranchCoverage: 100,
  }),
  Object.freeze({
    id: "IDEMPOTENCIA",
    path: "packages/application/src/attempt-use-cases.ts",
    minimumBranchCoverage: 100,
  }),
  Object.freeze({
    id: "CONTRATO_ESTADO",
    path: "packages/contracts/src/learning-state.ts",
    minimumBranchCoverage: 100,
  }),
  Object.freeze({
    id: "MATRIZ",
    path: "packages/domain/src/critical-decision-matrix.ts",
    minimumBranchCoverage: 100,
  }),
]);

const coveragePath = "coverage/coverage-final.json";

function flattenCounters(counters) {
  if (counters === null || typeof counters !== "object") return [];
  return Object.values(counters).flatMap((value) =>
    Array.isArray(value) ? value : [value],
  );
}

function percentage(counters) {
  const values = flattenCounters(counters);
  if (values.length === 0) return 100;
  const covered = values.filter((value) => value > 0).length;
  return Number(((covered / values.length) * 100).toFixed(2));
}

function findCoverageEntry(coverage, path) {
  const entry = Object.entries(coverage).find(([file]) => file.endsWith(path));
  return entry?.[1] ?? null;
}

export function validateCriticalDecisionCoverage(coverage) {
  const errors = [];
  if (coverage === null || typeof coverage !== "object") {
    return Object.freeze(["coverage report is not an object"]);
  }
  for (const target of CRITICAL_DECISION_TARGETS) {
    const entry = findCoverageEntry(coverage, target.path);
    if (entry === null) {
      errors.push(`${target.id} coverage is missing for ${target.path}`);
      continue;
    }
    const branchCoverage = percentage(entry.b);
    if (branchCoverage < target.minimumBranchCoverage) {
      errors.push(
        `${target.id} branch coverage ${branchCoverage}% is below ${target.minimumBranchCoverage}%`,
      );
    }
  }
  return Object.freeze(errors);
}

export function buildCriticalDecisionCoverageReport(coverage) {
  const errors = validateCriticalDecisionCoverage(coverage);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return Object.freeze({
    status: "PASS",
    task: "ENT95-05-C",
    decisionCount: CRITICAL_DECISION_TARGETS.length,
    matrixCaseCount: 13,
    targets: Object.freeze(
      CRITICAL_DECISION_TARGETS.map((target) => {
        const entry = findCoverageEntry(coverage, target.path);
        return Object.freeze({
          id: target.id,
          path: target.path,
          branchCoverage: percentage(entry.b),
          minimumBranchCoverage: target.minimumBranchCoverage,
        });
      }),
    ),
  });
}

async function main() {
  const coverage = JSON.parse(await readFile(coveragePath, "utf8"));
  const report = buildCriticalDecisionCoverageReport(coverage);
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1]?.endsWith("verify-critical-decision-coverage.mjs")) {
  await main();
}
