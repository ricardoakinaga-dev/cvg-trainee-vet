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
  "AUDIT_CURSOR_SECRET",
  "CVG_MIGRATION_DATABASE_URL",
  "CVG_TEST_DATABASE_URL",
  "CVG_TEST_ADMIN_DATABASE_URL",
  "CVG_REAL_E2E_DATABASE_URL",
  "WEB_ORIGINS",
  "QDRANT_ENABLED",
  "QDRANT_URL",
  "QDRANT_API_KEY",
  "CVG_TEST_QDRANT_URL",
  "CVG_TEST_QDRANT_API_KEY",
  "AI_ENABLED",
]);
const requiredDatabaseEnvironmentKeys = Object.freeze([
  "DATABASE_URL",
  "CVG_MIGRATION_DATABASE_URL",
  "CVG_TEST_DATABASE_URL",
  "CVG_TEST_ADMIN_DATABASE_URL",
  "CVG_REAL_E2E_DATABASE_URL",
]);
const requiredWorkflowChecks = Object.freeze([
  ["PostgreSQL service", /image:\s*postgres:16/u],
  ["Qdrant service", /image:\s*qdrant\/qdrant:v1\.15\.5/u],
  [
    "same-SHA checkout verification",
    /name: Verify checkout SHA[\s\S]*EXPECTED_SHA:\s*\$\{\{\s*github\.sha\s*\}\}[\s\S]*git rev-parse HEAD/u,
  ],
  ["pinned Node setup", /node-version:\s*22\.22\.0/u],
  ["pinned pnpm setup", /corepack prepare pnpm@10\.33\.0/u],
  ["frozen lockfile install", /pnpm install --frozen-lockfile/u],
  ["quality verification", /run:\s*pnpm verify\b/u],
  ["release traceability", /run:\s*pnpm verify:traceability:release\b/u],
  ["database migrations", /run:\s*pnpm db:migrate\b/u],
  [
    "least-privilege database roles",
    /run:\s*node scripts\/provision-ci-postgres\.mjs/u,
  ],
  ["live PostgreSQL integration", /run:\s*pnpm test:integration:live\b/u],
  ["live Qdrant integration", /run:\s*pnpm test:integration:qdrant\b/u],
  ["synthetic restore", /run:\s*pnpm test:integration:restore\b/u],
  ["mocked browser E2E", /run:\s*pnpm test:e2e\b/u],
  ["real browser E2E", /CVG_RUN_REAL_E2E=true pnpm test:e2e/u],
  ["high-severity dependency audit", /pnpm audit --audit-level=high/u],
  ["artifact publication", /actions\/upload-artifact@(?:v4|[0-9a-f]{40})/u],
  ["artifact retention condition", /if:\s*always\(\)/u],
  ["coverage artifact path", /coverage\//u],
  ["browser report path", /playwright-report\//u],
  ["JUnit/test result path", /test-results\//u],
  [
    "artifact governance invocation",
    /node scripts\/ci-artifact-governance\.mjs[\s\S]*--sha "\$EXPECTED_SHA"[\s\S]*--out-dir ci-artifacts[\s\S]*--paths coverage playwright-report test-results/u,
  ],
  ["governed artifact publication path", /ci-artifacts\//u],
  ["Qdrant readiness check", /127\.0\.0\.1:6333\/readyz/u],
]);
const requiredRuntimeChecks = Object.freeze([
  [
    "real E2E API bootstrap outside test mode",
    /NODE_ENV=development API_HOST=127\.0\.0\.1 API_PORT=3101/u,
  ],
]);
const requiredArtifactGovernanceChecks = Object.freeze([
  ["CycloneDX SBOM generation", /bomFormat: "CycloneDX"/u],
  ["pinned CycloneDX schema", /specVersion: "1\.5"/u],
  ["SHA-256 hashing", /createHash\("sha256"\)/u],
  ["SBOM artifact output", /sbom\.cdx\.json/u],
  ["SHA-256 manifest output", /artifact-manifest\.sha256/u],
  ["artifact redaction scan", /findRedactionFindings/u],
]);

function envKeys(text) {
  return new Set(
    text
      .split("\n")
      .map((line) => /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line)?.[1])
      .filter((key) => key !== undefined),
  );
}

function envValue(text, key) {
  return new RegExp(`^${key}=([^\\r\\n]*)$`, "mu").exec(text)?.[1]?.trim();
}

function databaseConnectionIdentity(key, value) {
  const connection = new URL(value);
  if (
    connection.protocol !== "postgresql:" &&
    connection.protocol !== "postgres:"
  ) {
    throw new Error(`${key} is not PostgreSQL`);
  }
  const role = decodeURIComponent(connection.username);
  const database = decodeURIComponent(connection.pathname.slice(1));
  if (role.length === 0 || database.length === 0) {
    throw new Error(`${key} has no role or database`);
  }
  return { key, role, database };
}

function databaseContractFailures(text) {
  const values = requiredDatabaseEnvironmentKeys.map((key) => [
    key,
    envValue(text, key),
  ]);
  const missingKeys = values
    .filter(([, value]) => value === undefined || value.length === 0)
    .map(([key]) => key);
  if (missingKeys.length > 0) {
    return [`database URL contract is incomplete: ${missingKeys.join(", ")}`];
  }

  try {
    const connections = values.map(([key, value]) =>
      databaseConnectionIdentity(key, value),
    );
    const [runtime, migration, application, admin, realE2e] = connections;
    if (
      runtime === undefined ||
      migration === undefined ||
      application === undefined ||
      admin === undefined ||
      realE2e === undefined
    ) {
      return ["database URL contract is incomplete"];
    }
    if (runtime.role !== application.role) {
      return [
        "DATABASE_URL must use the application role used by CVG_TEST_DATABASE_URL",
      ];
    }
    if (realE2e.role !== admin.role) {
      return [
        "CVG_REAL_E2E_DATABASE_URL must use the fixture/admin role used by CVG_TEST_ADMIN_DATABASE_URL",
      ];
    }
    if (new Set([migration.role, application.role, admin.role]).size !== 3) {
      return [
        "database URLs must use distinct migration/application/admin roles",
      ];
    }
    if (
      new Set([
        runtime.database,
        migration.database,
        application.database,
        admin.database,
        realE2e.database,
      ]).size !== 1
    ) {
      return ["database URLs must target the same database"];
    }
    return [];
  } catch {
    return ["database URLs must use valid PostgreSQL connection URLs"];
  }
}

function workflowEnvironmentValue(text, key, indentation) {
  return new RegExp(`^${" ".repeat(indentation)}${key}:\\s*(\\S*)\\s*$`, "mu")
    .exec(text)?.[1]
    ?.trim();
}

function workflowStepEnvironmentValue(text, stepName, key, indentation) {
  const escapedStepName = stepName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const step = new RegExp(
    `^      - name: ${escapedStepName}\\r?\\n([\\s\\S]*?)(?=^      - name: |(?![\\s\\S]))`,
    "mu",
  ).exec(text)?.[1];
  if (step === undefined) return undefined;
  return workflowEnvironmentValue(step, key, indentation);
}

function workflowDatabaseContractFailures(text) {
  const workflowKeys = Object.freeze([
    ["DATABASE_URL", 6],
    ["CVG_MIGRATION_DATABASE_URL", 6],
    ["CVG_TEST_DATABASE_URL", 6],
    ["CVG_TEST_ADMIN_DATABASE_URL", 6],
    ["CVG_REAL_E2E_DATABASE_URL", 6],
  ]);
  const values = workflowKeys.map(([key, indentation]) => [
    key,
    workflowEnvironmentValue(text, key, indentation),
  ]);
  const missingKeys = values
    .filter(([, value]) => value === undefined || value.length === 0)
    .map(([key]) => key);
  if (missingKeys.length > 0) {
    return [
      `workflow database URL contract is incomplete: ${missingKeys.join(", ")}`,
    ];
  }

  const failures = databaseContractFailures(
    values.map(([key, value]) => `${key}=${value}`).join("\n"),
  );
  if (failures.length > 0) {
    return failures.map((failure) => `workflow ${failure}`);
  }

  const migrationOverride = workflowStepEnvironmentValue(
    text,
    "Apply migrations",
    "DATABASE_URL",
    10,
  );
  if (migrationOverride === undefined || migrationOverride.length === 0) {
    return ["workflow migration DATABASE_URL override is incomplete"];
  }
  try {
    const migration = databaseConnectionIdentity(
      "CVG_MIGRATION_DATABASE_URL",
      values[1][1],
    );
    const override = databaseConnectionIdentity(
      "workflow migration DATABASE_URL",
      migrationOverride,
    );
    if (
      migration.role !== override.role ||
      migration.database !== override.database
    ) {
      return [
        "workflow migration DATABASE_URL override must use CVG_MIGRATION_DATABASE_URL identity",
      ];
    }
  } catch {
    return ["workflow database URLs must use valid PostgreSQL connection URLs"];
  }
  return [];
}

function mutableActionPins(text) {
  const pins = [];
  const pattern =
    /^[ \t]*-?[ \t]*uses:[ \t]*([A-Za-z0-9_./-]+\/[\w.-]+)@([A-Za-z0-9_./-]+)(?:[ \t]+#.*)?$/gmu;
  for (const match of text.matchAll(pattern)) {
    const [, action, ref] = match;
    if (!/^[0-9a-f]{40}$/u.test(ref)) pins.push(`${action}@${ref}`);
  }
  return pins;
}

function invalid(message) {
  return new Error(`CI contract is invalid: ${message}`);
}

export function validateCiContract(contract) {
  const checkoutShaStep = contract.workflow.indexOf(
    "      - name: Verify checkout SHA",
  );
  const setupNodeStep = contract.workflow.indexOf(
    "      - name: Setup Node.js",
  );
  const enablePnpmStep = contract.workflow.indexOf("      - name: Enable pnpm");
  const installDependenciesStep = contract.workflow.indexOf(
    "      - name: Install dependencies",
  );
  const artifactGovernanceStep = contract.workflow.indexOf(
    "      - name: Generate and verify release artifacts",
  );
  const artifactPublicationStep = contract.workflow.indexOf(
    "      - name: Publish quality artifacts",
  );
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
    ...(contract.packageJson.scripts?.["verify:traceability:release"] ===
    undefined
      ? ["package.json must expose verify:traceability:release"]
      : []),
    ...(contract.packageJson.scripts?.verify?.includes(
      "pnpm verify:ci-contract",
    )
      ? []
      : ["pnpm verify must include pnpm verify:ci-contract"]),
    ...requiredEnvironmentKeys
      .filter((key) => !envKeys(contract.envExample).has(key))
      .map((key) => `.env.example is missing ${key}`),
    ...databaseContractFailures(contract.envExample),
    ...requiredWorkflowChecks
      .filter(([, pattern]) => !pattern.test(contract.workflow))
      .map(([name]) => `workflow is missing ${name}`),
    ...requiredArtifactGovernanceChecks
      .filter(
        ([, pattern]) => !pattern.test(contract.artifactGovernanceScript ?? ""),
      )
      .map(([name]) => `artifact governance script is missing ${name}`),
    ...workflowDatabaseContractFailures(contract.workflow),
    ...requiredRuntimeChecks
      .filter(([, pattern]) => !pattern.test(contract.playwrightConfig))
      .map(([name]) => `Playwright runtime is missing ${name}`),
    ...(mutableActionPins(contract.workflow).length > 0
      ? [
          `workflow must use immutable action pins: ${mutableActionPins(contract.workflow).join(", ")}`,
        ]
      : []),
    ...(enablePnpmStep < 0 || setupNodeStep < 0
      ? ["workflow must define Setup Node.js and Enable pnpm steps"]
      : enablePnpmStep > setupNodeStep
        ? ["workflow must enable pnpm before Setup Node.js cache resolution"]
        : []),
    ...(checkoutShaStep < 0 || installDependenciesStep < 0
      ? ["workflow must define checkout SHA and dependency installation steps"]
      : checkoutShaStep > installDependenciesStep
        ? ["workflow must verify checkout SHA before dependency installation"]
        : []),
    ...(artifactGovernanceStep < 0 || artifactPublicationStep < 0
      ? ["workflow must define artifact governance and publication steps"]
      : artifactGovernanceStep > artifactPublicationStep
        ? ["workflow must run artifact governance before artifact publication"]
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
    artifactGovernanceScript,
  ] = await Promise.all([
    readFile(join(rootDirectory, "package.json"), "utf8"),
    readFile(join(rootDirectory, ".env.example"), "utf8"),
    readFile(join(rootDirectory, ".github/workflows/quality.yml"), "utf8"),
    readFile(join(rootDirectory, "playwright.config.ts"), "utf8"),
    readFile(join(rootDirectory, ".nvmrc"), "utf8"),
    readFile(join(rootDirectory, "pnpm-lock.yaml"), "utf8"),
    readFile(join(rootDirectory, "scripts/ci-artifact-governance.mjs"), "utf8"),
  ]);

  return Object.freeze({
    packageJson: JSON.parse(packageText),
    envExample,
    workflow,
    playwrightConfig,
    nodeVersion: nodeVersion.trim(),
    lockfile,
    artifactGovernanceScript,
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
