import { readdir, readFile } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

import { COVERAGE_EXCLUSIONS } from "./coverage-exclusions.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const COVERAGE_INCLUDE = Object.freeze([
  "packages/**/src/**/*.ts",
  "packages/**/src/**/*.tsx",
  "apps/**/src/**/*.ts",
  "apps/**/src/**/*.tsx",
  "apps/web/proxy.ts",
  "apps/web/app/**/*.ts",
  "apps/web/app/**/*.tsx",
]);

export const COVERAGE_EXCLUDE = Object.freeze([
  // Retain the existing test/barrel policy. Declaration files are type-only;
  // TSX tests are test sources, not production UI.
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.d.ts",
  "**/index.ts",
  ...COVERAGE_EXCLUSIONS,
]);

export const COVERAGE_FLOOR = Object.freeze({
  statements: 90,
  branches: 85,
  functions: 90,
  lines: 90,
});

const PRODUCTION_TSX_PROBES = Object.freeze([
  "apps/web/app/__coverage_denominator_probe__.tsx",
  "apps/web/src/__coverage_denominator_probe__.tsx",
  "apps/api/src/__coverage_denominator_probe__.tsx",
  "packages/domain/src/__coverage_denominator_probe__.tsx",
]);

const GENERATED_DIRECTORY_NAMES = new Set([
  ".next",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "__generated__",
]);

const EXCLUSION_REASONS = new Map([
  [
    "packages/persistence/src/schema.ts",
    "Drizzle structural schema declarations; repository behavior is covered by persistence tests",
  ],
  ["packages/persistence/src/test-support/**", "shared test fixtures"],
  ["apps/api/src/http-boundary/fixtures.ts", "HTTP boundary test fixtures"],
  [
    "apps/web/tests/operations-test-support.ts",
    "shared browser test fixtures outside the production coverage includes; imported only by browser test suites",
  ],
  [
    "apps/api/src/main.ts",
    "process composition root, exercised through integration coverage",
  ],
  [
    "apps/worker/src/main.ts",
    "process composition root, exercised through integration coverage",
  ],
  [
    "apps/worker/src/reconcile-command.ts",
    "process composition root, exercised through integration coverage",
  ],
]);

function normalizePath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function segmentMatches(patternSegment, pathSegment) {
  const escaped = patternSegment
    .replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
    .replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`).test(pathSegment);
}

function expandBraces(pattern) {
  const match = /\{([^{}]+)\}/.exec(pattern);
  if (match === null) return [pattern];
  const [whole, alternatives] = match;
  return alternatives
    .split(",")
    .flatMap((alternative) =>
      expandBraces(pattern.replace(whole, alternative)),
    );
}

function globMatches(pattern, path) {
  const pathSegments = normalizePath(path).split("/");
  return expandBraces(normalizePath(pattern)).some((expanded) => {
    const patternSegments = expanded.split("/");
    const matchFrom = (patternIndex, pathIndex) => {
      if (patternIndex === patternSegments.length) {
        return pathIndex === pathSegments.length;
      }
      if (patternSegments[patternIndex] === "**") {
        return (
          matchFrom(patternIndex + 1, pathIndex) ||
          (pathIndex < pathSegments.length &&
            matchFrom(patternIndex, pathIndex + 1))
        );
      }
      return (
        pathIndex < pathSegments.length &&
        segmentMatches(
          patternSegments[patternIndex],
          pathSegments[pathIndex],
        ) &&
        matchFrom(patternIndex + 1, pathIndex + 1)
      );
    };
    return matchFrom(0, 0);
  });
}

export function findGenericTsxExclusions(exclusions = COVERAGE_EXCLUDE) {
  return exclusions.filter((exclusion) =>
    PRODUCTION_TSX_PROBES.some((probe) => globMatches(exclusion, probe)),
  );
}

export function validateCoveragePolicy({
  include = [],
  exclude = [],
  thresholds = {},
} = {}) {
  const issues = [];
  const approvedIncludes = new Set(COVERAGE_INCLUDE);
  for (const pattern of include) {
    if (!approvedIncludes.has(pattern)) {
      issues.push(`unapproved production coverage include: ${pattern}`);
    }
  }
  for (const pattern of COVERAGE_INCLUDE) {
    if (!include.includes(pattern)) {
      issues.push(`production coverage include is missing ${pattern}`);
    }
  }
  const approvedExclusions = new Set(COVERAGE_EXCLUDE);
  for (const pattern of exclude) {
    if (!approvedExclusions.has(pattern)) {
      issues.push(`unapproved coverage exclusion: ${pattern}`);
    }
  }
  for (const pattern of COVERAGE_EXCLUDE) {
    if (!exclude.includes(pattern)) {
      issues.push(`coverage exclusion policy is missing ${pattern}`);
    }
  }
  for (const pattern of findGenericTsxExclusions(exclude)) {
    issues.push(`generic TSX exclusion is forbidden: ${pattern}`);
  }
  for (const [metric, floor] of Object.entries(COVERAGE_FLOOR)) {
    if (thresholds[metric] !== floor) {
      issues.push(`coverage ${metric} threshold must remain ${floor}%`);
    }
  }
  return issues;
}

function exclusionReason(path) {
  const normalized = normalizePath(path);
  const fileName = basename(normalized);
  if (fileName.endsWith(".d.ts")) return "TypeScript declaration file";
  if (/\.test\.tsx?$/.test(fileName)) return "test source";
  if (normalized.endsWith("/index.ts")) {
    return "existing index.ts barrel/entrypoint exclusion policy";
  }
  if (normalized === "apps/web/next.config.ts") {
    return "Next.js build configuration, not application runtime code";
  }
  for (const [pattern, reason] of EXCLUSION_REASONS) {
    if (globMatches(pattern, normalized)) return reason;
  }
  for (const pattern of COVERAGE_EXCLUSIONS) {
    if (globMatches(pattern, normalized)) {
      return `documented exclusion in scripts/coverage-exclusions.mjs (${pattern})`;
    }
  }
  if (
    normalized
      .split("/")
      .some((segment) => GENERATED_DIRECTORY_NAMES.has(segment))
  ) {
    return "generated, build, or vendored output";
  }
  return null;
}

async function walkTypeScriptFiles(directory, repositoryRoot, found) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = normalizePath(relative(repositoryRoot, absolutePath));
    if (entry.isDirectory()) {
      if (GENERATED_DIRECTORY_NAMES.has(entry.name)) continue;
      await walkTypeScriptFiles(absolutePath, repositoryRoot, found);
      continue;
    }
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue;
    found.push(relativePath);
  }
}

export async function collectProductionCoverageInventory(
  repositoryRoot = root,
) {
  const absoluteRoot = resolve(repositoryRoot);
  const sources = [];
  await Promise.all(
    ["apps", "packages"].map((directory) =>
      walkTypeScriptFiles(join(absoluteRoot, directory), absoluteRoot, sources),
    ),
  );

  const inventory = { included: [], excluded: [], unmapped: [] };
  for (const path of sources.sort()) {
    const reason = exclusionReason(path);
    if (reason !== null) {
      inventory.excluded.push({ path, reason });
    } else if (COVERAGE_INCLUDE.some((pattern) => globMatches(pattern, path))) {
      inventory.included.push(path);
    } else {
      inventory.unmapped.push(path);
    }
  }
  return inventory;
}

export function findMissingCoverageFiles(
  inventory,
  coverageFiles,
  repositoryRoot = root,
) {
  const absoluteRoot = resolve(repositoryRoot);
  const reported = new Set(
    Object.keys(coverageFiles).map((filePath) => {
      const absolutePath = isAbsolute(filePath)
        ? resolve(filePath)
        : resolve(absoluteRoot, filePath);
      return normalizePath(relative(absoluteRoot, absolutePath));
    }),
  );
  return inventory.included.filter((filePath) => !reported.has(filePath));
}

async function readCoverageFiles() {
  const raw = await readFile(
    join(root, "coverage", "coverage-final.json"),
    "utf8",
  );
  const files = JSON.parse(raw);
  if (files === null || typeof files !== "object" || Array.isArray(files)) {
    throw new Error("coverage-final.json must be a file-keyed object");
  }
  return files;
}

async function verifyCoverageInventory({ printManifest = false } = {}) {
  const inventory = await collectProductionCoverageInventory(root);
  const policyIssues = validateCoveragePolicy({
    include: COVERAGE_INCLUDE,
    exclude: COVERAGE_EXCLUDE,
    thresholds: COVERAGE_FLOOR,
  });
  const files = await readCoverageFiles();
  const missing = findMissingCoverageFiles(inventory, files, root);
  const issues = [
    ...policyIssues,
    ...inventory.unmapped.map(
      (path) => `production source is outside coverage.include: ${path}`,
    ),
    ...missing.map(
      (path) => `production source is missing from coverage report: ${path}`,
    ),
  ];

  if (issues.length === 0) {
    console.log(
      `ok: production coverage inventory = ${inventory.included.length} included, ${inventory.excluded.length} excluded`,
    );
  } else {
    for (const issue of issues) console.error(`FAIL: ${issue}`);
  }
  if (printManifest) {
    console.log(
      JSON.stringify(
        {
          format: "cvg-production-coverage-inventory/v1",
          included: inventory.included,
          excluded: inventory.excluded,
          unmapped: inventory.unmapped,
          missingFromReport: missing,
          policyIssues,
        },
        null,
        2,
      ),
    );
  }
  return issues.length === 0;
}

async function main() {
  const args = process.argv.slice(2);
  const inventoryOnly = args.includes("--inventory-only");
  const printManifest = args.includes("--print-manifest");
  const unknownArgs = args.filter(
    (argument) =>
      argument !== "--inventory-only" && argument !== "--print-manifest",
  );
  if (
    unknownArgs.length > 0 ||
    (printManifest && !inventoryOnly) ||
    new Set(args).size !== args.length
  ) {
    console.error(
      "Usage: node scripts/verify-coverage-floor.mjs [--inventory-only [--print-manifest]]",
    );
    process.exitCode = 2;
    return;
  }

  const inventoryOk = await verifyCoverageInventory({
    printManifest,
  });
  if (!inventoryOk) process.exitCode = 1;
  if (inventoryOnly) return;

  const raw = await readFile(
    join(root, "coverage", "coverage-summary.json"),
    "utf8",
  );
  const summary = JSON.parse(raw);
  const total = summary?.total;
  if (total === undefined || typeof total !== "object") {
    console.error("FAIL: coverage-summary.json has no total section");
    process.exitCode = 1;
    return;
  }
  let failed = false;
  for (const [key, floor] of Object.entries(COVERAGE_FLOOR)) {
    const section = total[key];
    if (section === undefined || typeof section.pct !== "number") {
      console.error(`FAIL: coverage ${key} is missing`);
      failed = true;
      continue;
    }
    const ok = section.pct >= floor;
    console.log(
      `${ok ? "ok" : "FAIL"}: coverage ${key} = ${section.pct.toFixed(2)}% (floor ${floor}%)`,
    );
    if (!ok) failed = true;
  }
  if (failed) process.exitCode = 1;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`FAIL: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
