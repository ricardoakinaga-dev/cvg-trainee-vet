import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const expectedNodeVersion = "22.22.0";
const expectedPnpmVersion = "10.33.0";
const requiredEnvironmentKeys = Object.freeze([
  "NODE_ENV",
  "API_HOST",
  "API_PORT",
  "DATABASE_URL",
  "CVG_TEST_DATABASE_URL",
  "CVG_REAL_E2E_DATABASE_URL",
  "CVG_REAL_E2E_ADMIN_DATABASE_URL",
  "WEB_ORIGINS",
  "QDRANT_ENABLED",
  "QDRANT_URL",
  "QDRANT_API_KEY",
  "CVG_TEST_QDRANT_URL",
  "CVG_TEST_QDRANT_API_KEY",
  "AI_ENABLED",
]);
const requiredWorkflowChecks = Object.freeze([
  ["PostgreSQL service", /image:\s*postgres:16/u],
  ["Qdrant service", /image:\s*qdrant\/qdrant:v1\.15\.5/u],
  ["pinned Node setup", /node-version:\s*22\.22\.0/u],
  ["pinned pnpm setup", /corepack prepare pnpm@10\.33\.0/u],
  ["frozen lockfile install", /pnpm install --frozen-lockfile/u],
  ["quality verification", /run:\s*pnpm verify\b/u],
  [
    "database migrations",
    /run:\s*(?:DATABASE_URL="\$CVG_REAL_E2E_ADMIN_DATABASE_URL"\s+)?pnpm db:migrate\b/u,
  ],
  ["live PostgreSQL integration", /run:\s*pnpm test:integration:live\b/u],
  ["live Qdrant integration", /run:\s*pnpm test:integration:qdrant\b/u],
  ["synthetic restore", /run:\s*pnpm test:integration:restore\b/u],
  ["mocked browser E2E", /run:\s*pnpm test:e2e\b/u],
  ["real browser E2E", /CVG_RUN_REAL_E2E=true pnpm test:e2e/u],
  ["real E2E admin database", /CVG_REAL_E2E_ADMIN_DATABASE_URL:/u],
  ["least privilege app role", /Configure least-privilege app role/u],
  ["high-severity dependency audit", /pnpm audit --audit-level=high/u],
  ["artifact publication", /actions\/upload-artifact@v4/u],
  ["artifact retention condition", /if:\s*always\(\)/u],
  ["coverage artifact path", /coverage\//u],
  ["browser report path", /playwright-report\//u],
  ["JUnit/test result path", /test-results\//u],
  ["Qdrant readiness check", /127\.0\.0\.1:6333\/readyz/u],
]);
const requiredRuntimeChecks = Object.freeze([
  [
    "real E2E API bootstrap outside test mode",
    /NODE_ENV=development API_HOST=127\.0\.0\.1 API_PORT=3101/u,
  ],
]);

function envKeys(text) {
  return new Set(
    text
      .split("\n")
      .map((line) => /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line)?.[1])
      .filter((key) => key !== undefined),
  );
}

function invalid(message) {
  return new Error(`CI contract is invalid: ${message}`);
}

export function validateCiContract(contract) {
  const setupNodeStep = contract.workflow.indexOf(
    "      - name: Setup Node.js",
  );
  const enablePnpmStep = contract.workflow.indexOf("      - name: Enable pnpm");
  const failures = [
    ...(contract.packageJson.packageManager !== `pnpm@${expectedPnpmVersion}`
      ? [`packageManager must be pnpm@${expectedPnpmVersion}`]
      : []),
    ...(contract.packageJson.engines?.node !== `>=${expectedNodeVersion} <23`
      ? [`engines.node must be >=${expectedNodeVersion} <23`]
      : []),
    ...(contract.packageJson.engines?.pnpm !== `>=${expectedPnpmVersion} <11`
      ? [`engines.pnpm must be >=${expectedPnpmVersion} <11`]
      : []),
    ...(contract.nodeVersion !== expectedNodeVersion
      ? [`.nvmrc must pin Node ${expectedNodeVersion}`]
      : []),
    ...(contract.lockfile.includes("lockfileVersion: '9.0'")
      ? []
      : ["pnpm-lock.yaml must use lockfileVersion 9.0"]),
    ...(contract.packageJson.scripts?.["test:integration:qdrant"] === undefined
      ? ["package.json must expose test:integration:qdrant"]
      : []),
    ...(contract.packageJson.scripts?.verify?.includes(
      "pnpm verify:ci-contract",
    )
      ? []
      : ["pnpm verify must include pnpm verify:ci-contract"]),
    ...requiredEnvironmentKeys
      .filter((key) => !envKeys(contract.envExample).has(key))
      .map((key) => `.env.example is missing ${key}`),
    ...requiredWorkflowChecks
      .filter(([, pattern]) => !pattern.test(contract.workflow))
      .map(([name]) => `workflow is missing ${name}`),
    ...requiredRuntimeChecks
      .filter(([, pattern]) => !pattern.test(contract.playwrightConfig))
      .map(([name]) => `Playwright runtime is missing ${name}`),
    ...(enablePnpmStep < 0 || setupNodeStep < 0
      ? ["workflow must define Setup Node.js and Enable pnpm steps"]
      : enablePnpmStep > setupNodeStep
        ? ["workflow must enable pnpm before Setup Node.js cache resolution"]
        : []),
  ];

  if (failures.length > 0) throw invalid(failures.join("; "));

  return Object.freeze({
    status: "PASS",
    nodeVersion: expectedNodeVersion,
    pnpmVersion: expectedPnpmVersion,
    requiredEnvironmentKeys: requiredEnvironmentKeys.length,
    requiredWorkflowChecks: requiredWorkflowChecks.length,
    requiredRuntimeChecks: requiredRuntimeChecks.length,
  });
}

export async function readCiContract(rootDirectory = projectRoot) {
  const [
    packageText,
    envExample,
    workflow,
    playwrightConfig,
    nodeVersion,
    lockfile,
  ] = await Promise.all([
    readFile(join(rootDirectory, "package.json"), "utf8"),
    readFile(join(rootDirectory, ".env.example"), "utf8"),
    readFile(join(rootDirectory, ".github/workflows/quality.yml"), "utf8"),
    readFile(join(rootDirectory, "playwright.config.ts"), "utf8"),
    readFile(join(rootDirectory, ".nvmrc"), "utf8"),
    readFile(join(rootDirectory, "pnpm-lock.yaml"), "utf8"),
  ]);

  return Object.freeze({
    packageJson: JSON.parse(packageText),
    envExample,
    workflow,
    playwrightConfig,
    nodeVersion: nodeVersion.trim(),
    lockfile,
  });
}

const invokedFile =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (invokedFile === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(validateCiContract(await readCiContract())));
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "FAIL",
        code: "ci_contract_invalid",
        message: error instanceof Error ? error.message : "unknown error",
      }),
    );
    process.exitCode = 1;
  }
}
