import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");

const WARN_PROD = 500;
const HARD_PROD = 800;
const WARN_TEST = 800;
const HARD_TEST = 2000;

// Function budgets (production only, test files excluded): warn above 80
// lines, fail above 150 unless ratcheted below. Historic long functions are
// capped at current size; new functions must stay within the hard budget.
const WARN_FN = 80;
const HARD_FN = 150;

// Historic hotspots: capped at current size (ratchet — growth fails, shrink
// is welcome). Every entry needs a reason and an owner task. New files must
// stay within HARD limits; nothing here authorizes new god modules.
const EXCEPTIONS = new Map([
  [
    "apps/api/src/http.ts",
    {
      max: 1167,
      reason: "composition root: types + dispatch table (AAA-FINAL-001)",
    },
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

// Ratcheted long functions: key is "path#function", value is the cap.
// Growth fails; shrink is welcome. Repository factories group cohesive
// per-operation closures by design; the dispatch table shrinks as routes
// migrate to feature routers.
const FUNCTION_EXCEPTIONS = new Map([
  ["apps/api/src/http.ts#handleApiRequestCore", 761],
  ["apps/api/src/main.ts#createApiRuntime", 435],
  ["apps/api/src/server.ts#createApiServer", 166],
  ["apps/worker/src/main.ts#createWorkerRuntime", 208],
  ["packages/application/src/authoring-use-cases.ts#createAuthoringDraft", 165],
  ["packages/curriculum/src/learning-runtime.ts#evaluateModuleAttempt", 187],
  ["packages/integrations/src/qdrant.ts#createQdrantVectorStore", 270],
  [
    "packages/persistence/src/account-management-repository.ts#createAccountManagementRepository",
    152,
  ],
  ["packages/persistence/src/account-recovery-repository.ts#operations", 172],
  ["packages/persistence/src/answer-repository.ts#createAnswerOperations", 249],
  ["packages/persistence/src/attempt-repository.ts#createOperations", 203],
  [
    "packages/persistence/src/authoring-repository.ts#createAuthoringRepository",
    215,
  ],
  [
    "packages/persistence/src/content-repository.ts#materializePublishedAuthoringActivity",
    246,
  ],
  [
    "packages/persistence/src/continuing-education-report-repository.ts#createContinuingEducationReportRepository",
    201,
  ],
  [
    "packages/persistence/src/correction-repository.ts#createCorrectionUseCaseDependencies",
    154,
  ],
  [
    "packages/persistence/src/dashboard-repository.ts#createDashboardReadRepository",
    215,
  ],
  [
    "packages/persistence/src/diagnostic-session-repository.ts#createDiagnosticSessionRepository",
    463,
  ],
  [
    "packages/persistence/src/journey-repository.ts#createParticipantJourneyRepository",
    180,
  ],
  [
    "packages/persistence/src/learning-state-repository.ts#createLearningStateRepository",
    432,
  ],
]);

function topLevelFunctions(content) {
  const lines = content.split("\n");
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(?:export )?(?:async )?function (\w+)/u.exec(lines[index]);
    if (match === null) continue;
    let body = -1;
    for (let j = index; j < lines.length; j += 1) {
      if (lines[j].includes(")") && lines[j].trimEnd().endsWith("{")) {
        body = j;
        break;
      }
    }
    if (body === -1) continue;
    let depth = 0;
    for (let j = body; j < lines.length; j += 1) {
      depth += (lines[j].match(/\{/gu) ?? []).length;
      depth -= (lines[j].match(/\}/gu) ?? []).length;
      if (depth === 0) {
        found.push({ name: match[1], size: j - index + 1 });
        break;
      }
    }
  }
  return found;
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
    if (!isTest && (file.startsWith("apps/") || file.startsWith("packages/"))) {
      for (const fn of topLevelFunctions(content)) {
        const key = `${file}#${fn.name}`;
        const cap = FUNCTION_EXCEPTIONS.get(key);
        if (cap !== undefined) {
          if (fn.size > cap) {
            failures.push(
              `${key}: ${fn.size} lines exceeds ratchet cap ${cap}`,
            );
          }
          continue;
        }
        if (fn.size > HARD_FN) {
          failures.push(
            `${key}: ${fn.size} lines exceeds function budget ${HARD_FN} — split the function or register a ratcheted exception`,
          );
        } else if (fn.size > WARN_FN) {
          warnings.push(
            `${key}: ${fn.size} lines exceeds function warning budget ${WARN_FN}`,
          );
        }
      }
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
