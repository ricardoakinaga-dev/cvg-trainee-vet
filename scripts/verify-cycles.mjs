import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(fileURLToPath(import.meta.url), "..", "..");

const WORKSPACE_PACKAGES = new Map([
  ["@cvg/api", "apps/api/src"],
  ["@cvg/web", "apps/web/app"],
  ["@cvg/worker", "apps/worker/src"],
  ["@cvg/application", "packages/application/src"],
  ["@cvg/config", "packages/config/src"],
  ["@cvg/contracts", "packages/contracts/src"],
  ["@cvg/curriculum", "packages/curriculum/src"],
  ["@cvg/domain", "packages/domain/src"],
  ["@cvg/integrations", "packages/integrations/src"],
  ["@cvg/observability", "packages/observability/src"],
  ["@cvg/persistence", "packages/persistence/src"],
  ["@cvg/ui", "packages/ui/src"],
]);

async function listTsFiles(directory) {
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") {
        files.push(...(await listTsFiles(path)));
      }
      continue;
    }
    if (
      (path.endsWith(".ts") || path.endsWith(".tsx")) &&
      !path.endsWith(".d.ts") &&
      !path.endsWith(".test.ts") &&
      !path.endsWith(".test.tsx")
    ) {
      files.push(path);
    }
  }
  return files;
}

function importedSpecifiers(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const specifiers = [];
  for (const statement of ast.statements) {
    if (
      (ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }
  return specifiers;
}

function sourceCandidates(base) {
  if (base.endsWith(".js")) {
    const stem = base.slice(0, -3);
    return [`${stem}.ts`, `${stem}.tsx`, base];
  }
  return [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")];
}

function resolveSpecifier(specifier, fromFile, workspaceRoot) {
  if (specifier.startsWith(".")) {
    const base = resolve(dirname(fromFile), specifier);
    return sourceCandidates(base);
  }
  for (const [name, directory] of WORKSPACE_PACKAGES) {
    if (specifier === name || specifier.startsWith(`${name}/`)) {
      const rest = specifier.slice(name.length).replace(/^\//u, "");
      const base = resolve(
        workspaceRoot,
        directory,
        rest === "" ? "index" : rest,
      );
      return sourceCandidates(base);
    }
  }
  return [];
}

export async function verifyCycles(workspaceRoot = root) {
  const files = [];
  for (const directory of WORKSPACE_PACKAGES.values()) {
    files.push(...(await listTsFiles(join(workspaceRoot, directory))));
  }
  const existing = new Set(files);
  const graph = new Map();
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const edges = new Set();
    for (const specifier of importedSpecifiers(source, file)) {
      for (const candidate of resolveSpecifier(
        specifier,
        file,
        workspaceRoot,
      )) {
        if (existing.has(candidate)) {
          edges.add(candidate);
          break;
        }
      }
    }
    graph.set(file, [...edges].sort());
  }

  const cycles = [];
  const visited = new Set();
  const stack = [];
  function visit(node) {
    if (stack.includes(node)) {
      cycles.push([...stack.slice(stack.indexOf(node)), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.push(node);
    for (const edge of graph.get(node) ?? []) visit(edge);
    stack.pop();
  }
  for (const file of [...graph.keys()].sort()) visit(file);
  return cycles.map((cycle) =>
    cycle.map((file) => relative(workspaceRoot, file)).join(" -> "),
  );
}

async function main() {
  const cycles = await verifyCycles();
  if (cycles.length > 0) {
    for (const cycle of cycles) console.error(`cycle: ${cycle}`);
    process.exitCode = 1;
    return;
  }
  console.log("cycles gate: no import cycles across workspace sources");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
