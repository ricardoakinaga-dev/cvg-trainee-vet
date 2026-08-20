import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import ts from "typescript";

const POLICY_PATH = "code-hotspot-policy.json";
const DEFAULT_MAX_LINES = 800;
const DEFAULT_MAX_FUNCTION_LINES = 50;
const SOURCE_ROOTS = Object.freeze(["apps", "packages", "scripts"]);
const SOURCE_FILE_PATTERN = /\.(?:mjs|ts|tsx)$/u;
const TEST_FILE_PATTERN = /(?:\.test\.|\.spec\.)/u;
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
]);
const SEVERITIES = new Set(["critical", "high", "medium"]);
const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

function collectFunctionMetrics(sourceFile, path, maxFunctionLines) {
  const functions = [];

  function visit(node) {
    if (FUNCTION_KINDS.has(node.kind)) {
      const startLine =
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          .line + 1;
      const endLine =
        sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
      const name =
        node.name?.getText(sourceFile) ??
        (node.kind === ts.SyntaxKind.Constructor
          ? "constructor"
          : "<anonymous>");

      functions.push(
        Object.freeze({
          path,
          name,
          startLine,
          endLine,
          lineCount: endLine - startLine + 1,
          isLong: endLine - startLine + 1 > maxFunctionLines,
        }),
      );
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return Object.freeze(functions);
}

function createSourceFileSnapshot(path, content, maxFunctionLines) {
  const sourceFile = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : path.endsWith(".ts")
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS,
  );
  const functions = collectFunctionMetrics(sourceFile, path, maxFunctionLines);
  const longestFunction = functions.reduce(
    (longest, current) =>
      current.lineCount > (longest?.lineCount ?? 0) ? current : longest,
    undefined,
  );

  return Object.freeze({
    path,
    lineCount:
      content.split(/\r?\n/u).length - (content.endsWith("\n") ? 1 : 0),
    functionCount: functions.length,
    longFunctionCount: functions.filter((fn) => fn.isLong).length,
    longestFunctionLines: longestFunction?.lineCount ?? 0,
    longestFunction: longestFunction ?? null,
    functions,
  });
}

function summarizeFunctionStats(sourceFiles) {
  const functions = sourceFiles.flatMap((file) => file.functions ?? []);
  const longestFunction = functions.reduce(
    (longest, current) =>
      current.lineCount > (longest?.lineCount ?? 0) ? current : longest,
    undefined,
  );

  return Object.freeze({
    functionCount: functions.length,
    longFunctionCount: functions.filter((fn) => fn.isLong).length,
    longestFunctionLines: longestFunction?.lineCount ?? 0,
    longestFunction: longestFunction ?? null,
  });
}

function validateFunctionRatchets(snapshot) {
  const errors = [];
  if (
    snapshot.functionStats !== undefined &&
    Number.isInteger(snapshot.maxLongFunctions) &&
    snapshot.functionStats.longFunctionCount > snapshot.maxLongFunctions
  ) {
    errors.push(
      `long production function count ${snapshot.functionStats.longFunctionCount} exceeds ratchet ${snapshot.maxLongFunctions}`,
    );
  }
  if (
    snapshot.functionStats !== undefined &&
    Number.isInteger(snapshot.maxLongestFunctionLines) &&
    snapshot.functionStats.longestFunctionLines >
      snapshot.maxLongestFunctionLines
  ) {
    errors.push(
      `longest production function ${snapshot.functionStats.longestFunctionLines} lines exceeds ratchet ${snapshot.maxLongestFunctionLines}`,
    );
  }
  return errors;
}

function validateHotspotMetadata(
  hotspot,
  sourceFiles,
  availableFiles,
  maxProductionLines,
) {
  const errors = [];
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
  return errors;
}

function validateUnclassifiedFiles(
  sourceFiles,
  hotspotsByPath,
  maxProductionLines,
) {
  return sourceFiles.flatMap((file) => {
    if (file.lineCount <= maxProductionLines) return [];
    const hotspot = hotspotsByPath.get(file.path);
    return hotspot === undefined
      ? [`production hotspot is not classified: ${file.path}`]
      : [];
  });
}

function validateBelowThreshold(
  hotspots,
  sourceFilesByPath,
  maxProductionLines,
) {
  return hotspots.flatMap((hotspot) => {
    const source = sourceFilesByPath.get(hotspot.path);
    return source !== undefined && source.lineCount <= maxProductionLines
      ? [`hotspot is below threshold: ${hotspot.path}`]
      : [];
  });
}

export function validateCodeHotspotSnapshot(snapshot) {
  const maxProductionLines = snapshot.maxProductionLines ?? DEFAULT_MAX_LINES;
  const sourceFiles = new Map(
    snapshot.sourceFiles.map((file) => [file.path, file]),
  );
  const availableFiles = new Set(snapshot.availableFiles);
  const hotspotsByPath = new Map();
  const errors = validateFunctionRatchets(snapshot);

  for (const hotspot of snapshot.hotspots) {
    if (hotspotsByPath.has(hotspot.path)) {
      errors.push(`duplicate hotspot: ${hotspot.path}`);
    }
    hotspotsByPath.set(hotspot.path, hotspot);
    errors.push(
      ...validateHotspotMetadata(
        hotspot,
        sourceFiles,
        availableFiles,
        maxProductionLines,
      ),
    );
  }

  errors.push(
    ...validateUnclassifiedFiles(
      snapshot.sourceFiles,
      hotspotsByPath,
      maxProductionLines,
    ),
    ...validateBelowThreshold(
      snapshot.hotspots,
      sourceFiles,
      maxProductionLines,
    ),
  );

  return Object.freeze(errors);
}

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
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
  const maxProductionFunctionLines =
    policy.maxProductionFunctionLines ?? DEFAULT_MAX_FUNCTION_LINES;
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
        createSourceFileSnapshot(path, content, maxProductionFunctionLines),
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
    maxProductionFunctionLines,
    maxLongFunctions: policy.maxLongFunctions,
    maxLongestFunctionLines: policy.maxLongestFunctionLines,
    functionStats: summarizeFunctionStats(sourceFiles),
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
        status: "PASS_WITH_DEBT_RATCHET",
        maxProductionLines: snapshot.maxProductionLines,
        maxProductionFunctionLines: snapshot.maxProductionFunctionLines,
        hotspotCount: planned.length,
        hotspots: planned.map(({ path, lineCount }) => ({ path, lineCount })),
        functionStats: snapshot.functionStats,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.endsWith("verify-code-hotspots.mjs")) {
  await main();
}
