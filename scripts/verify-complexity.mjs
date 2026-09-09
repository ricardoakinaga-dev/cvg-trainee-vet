import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");

const WARN_PROD = 500;
const HARD_PROD = 800;
const WARN_TEST = 800;
const HARD_TEST = 2000;

// Historic hotspots: capped at current size (ratchet — growth fails, shrink
// is welcome). Every entry needs a reason and an owner task. New files must
// stay within HARD limits; nothing here authorizes new god modules.
const EXCEPTIONS = new Map([
  [
    "apps/api/src/http.ts",
    { max: 4194, reason: "god-module extraction in progress (MOD-004)" },
  ],
  [
    "apps/api/src/http.test.ts",
    { max: 5103, reason: "god-test split in progress (MOD-004)" },
  ],
  [
    "packages/curriculum/src/catalog.ts",
    { max: 1596, reason: "pure domain catalog; partition planned" },
  ],
  [
    "packages/persistence/src/schema.ts",
    { max: 1532, reason: "monolithic drizzle schema; partition planned" },
  ],
  [
    "packages/persistence/src/learning-state-repository.ts",
    { max: 1407, reason: "repository split planned" },
  ],
  [
    "packages/persistence/src/diagnostic-session-repository.ts",
    { max: 1283, reason: "repository split planned" },
  ],
  [
    "packages/curriculum/src/learning-runtime.ts",
    { max: 1267, reason: "runtime split planned" },
  ],
  [
    "apps/web/app/operations/page.tsx",
    { max: 4296, reason: "visual bounded page; partition planned" },
  ],
  [
    "apps/web/app/page.tsx",
    { max: 2377, reason: "visual bounded page; partition planned" },
  ],
  [
    "apps/web/app/authoring/page.tsx",
    { max: 1377, reason: "visual bounded page; partition planned" },
  ],
  [
    "apps/web/app/diagnostic/page.tsx",
    { max: 851, reason: "visual bounded page; partition planned" },
  ],
]);

async function sourceFiles(directory) {
  const entries = await readdir(join(root, directory), {
    withFileTypes: true,
  }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") {
        files.push(...(await sourceFiles(path)));
      }
      continue;
    }
    if (path.endsWith(".ts") || path.endsWith(".tsx")) files.push(path);
  }
  return files;
}

export async function verifyComplexity() {
  const files = [
    ...(await sourceFiles("apps")),
    ...(await sourceFiles("packages")),
    ...(await sourceFiles("tests")),
    ...(await sourceFiles("scripts")),
  ].filter(
    (file) =>
      !file.includes("/dist/") &&
      !file.includes("/node_modules/") &&
      !file.endsWith(".d.ts"),
  );
  const failures = [];
  const warnings = [];
  for (const file of files.sort()) {
    const content = await readFile(join(root, file), "utf8");
    const lines = content === "" ? 0 : content.split("\n").length;
    const isTest =
      file.endsWith(".test.ts") ||
      file.endsWith(".test.tsx") ||
      file.includes(".spec.") ||
      file.startsWith("tests/");
    const exception = EXCEPTIONS.get(file);
    if (exception !== undefined) {
      if (lines > exception.max) {
        failures.push(
          `${file}: ${lines} lines exceeds ratchet cap ${exception.max} (${exception.reason})`,
        );
      }
      continue;
    }
    const hard = isTest ? HARD_TEST : HARD_PROD;
    const warn = isTest ? WARN_TEST : WARN_PROD;
    if (lines > hard) {
      failures.push(
        `${file}: ${lines} lines exceeds hard budget ${hard} — split the module or register a ratcheted exception with reason`,
      );
    } else if (lines > warn) {
      warnings.push(`${file}: ${lines} lines exceeds warning budget ${warn}`);
    }
  }
  return { failures, warnings };
}

async function main() {
  const { failures, warnings } = await verifyComplexity();
  for (const warning of warnings) console.log(`warn: ${warning}`);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`fail: ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `complexity gate: budgets hold (${WARN_PROD}/${HARD_PROD} prod, ${WARN_TEST}/${HARD_TEST} test, ${EXCEPTIONS.size} ratcheted exceptions)`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
