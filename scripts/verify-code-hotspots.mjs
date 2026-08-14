import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const POLICY_PATH = "code-hotspot-policy.json";
const DEFAULT_MAX_LINES = 800;
const SOURCE_ROOTS = Object.freeze(["apps", "packages", "scripts"]);
const SOURCE_FILE_PATTERN = /\.(?:mjs|ts|tsx)$/u;
const TEST_FILE_PATTERN = /(?:\.test\.|\.spec\.)/u;
const SEVERITIES = new Set(["critical", "high", "medium"]);

export function validateCodeHotspotSnapshot(snapshot) {
  const errors = [];
  const maxProductionLines = snapshot.maxProductionLines ?? DEFAULT_MAX_LINES;
  const sourceFiles = new Map(
    snapshot.sourceFiles.map((file) => [file.path, file]),
  );
  const availableFiles = new Set(snapshot.availableFiles);
  const hotspotsByPath = new Map();

  for (const hotspot of snapshot.hotspots) {
    if (hotspotsByPath.has(hotspot.path)) {
      errors.push(`duplicate hotspot: ${hotspot.path}`);
    }
    hotspotsByPath.set(hotspot.path, hotspot);

    if (!sourceFiles.has(hotspot.path)) {
      errors.push(`hotspot source file is missing: ${hotspot.path}`);
    }
    if (hotspot.owner.trim() === "") {
      errors.push(`hotspot ${hotspot.path} has no owner`);
    }
    if (hotspot.plan.trim() === "") {
      errors.push(`hotspot ${hotspot.path} has no decomposition plan`);
    }
    if (!SEVERITIES.has(hotspot.severity)) {
      errors.push(`hotspot ${hotspot.path} has invalid severity`);
    }
    if (
      !Number.isInteger(hotspot.targetLineBudget) ||
      hotspot.targetLineBudget <= 0 ||
      hotspot.targetLineBudget > maxProductionLines
    ) {
      errors.push(`hotspot ${hotspot.path} has invalid target line budget`);
    }
    for (const testPath of hotspot.characterizationTests) {
      if (!availableFiles.has(testPath)) {
        errors.push(
          `hotspot ${hotspot.path} characterization test is missing: ${testPath}`,
        );
      }
    }
  }

  for (const file of snapshot.sourceFiles) {
    if (file.lineCount <= maxProductionLines) continue;
    const hotspot = hotspotsByPath.get(file.path);
    if (hotspot === undefined) {
      errors.push(`production hotspot is not classified: ${file.path}`);
    }
  }

  for (const hotspot of snapshot.hotspots) {
    const source = sourceFiles.get(hotspot.path);
    if (source !== undefined && source.lineCount <= maxProductionLines) {
      errors.push(`hotspot is below threshold: ${hotspot.path}`);
    }
  }

  return Object.freeze(errors);
}

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".next", "coverage", "dist", "node_modules"].includes(entry.name)) {
      continue;
    }
    const absolutePath = join(root, entry.name);
    const path = relative(process.cwd(), absolutePath);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

export async function loadCodeHotspotSnapshot(root = process.cwd()) {
  const policy = JSON.parse(await readFile(join(root, POLICY_PATH), "utf8"));
  const availableFiles = await walkFiles(root);
  const sourceFiles = [];

  for (const sourceRoot of SOURCE_ROOTS) {
    const absoluteRoot = join(root, sourceRoot);
    const files = await walkFiles(absoluteRoot);
    for (const path of files) {
      if (!SOURCE_FILE_PATTERN.test(path) || TEST_FILE_PATTERN.test(path)) {
        continue;
      }
      const content = await readFile(join(root, path), "utf8");
      sourceFiles.push(
        Object.freeze({ path, lineCount: content.split("\n").length }),
      );
    }
  }

  const sourceByPath = new Map(sourceFiles.map((file) => [file.path, file]));
  const hotspots = (policy.hotspots ?? []).map((hotspot) =>
    Object.freeze({
      ...hotspot,
      lineCount: sourceByPath.get(hotspot.path)?.lineCount ?? 0,
    }),
  );

  return Object.freeze({
    maxProductionLines: policy.maxProductionLines ?? DEFAULT_MAX_LINES,
    sourceFiles: Object.freeze(sourceFiles),
    availableFiles: Object.freeze(availableFiles),
    hotspots: Object.freeze(hotspots),
  });
}

async function main() {
  const snapshot = await loadCodeHotspotSnapshot();
  const errors = validateCodeHotspotSnapshot(snapshot);
  if (errors.length > 0) {
    console.error(`code hotspot gate failed (${errors.length} findings):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  const planned = snapshot.sourceFiles.filter(
    ({ path, lineCount }) =>
      lineCount > snapshot.maxProductionLines &&
      snapshot.hotspots.some((hotspot) => hotspot.path === path),
  );
  console.log(
    JSON.stringify(
      {
        status: "PASS_WITH_PLANNED_HOTSPOTS",
        maxProductionLines: snapshot.maxProductionLines,
        hotspotCount: planned.length,
        hotspots: planned.map(({ path, lineCount }) => ({ path, lineCount })),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.endsWith("verify-code-hotspots.mjs")) {
  await main();
}
