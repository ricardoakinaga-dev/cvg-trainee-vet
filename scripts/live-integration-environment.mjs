import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const TOKEN_PATTERN = /^[a-f0-9]{24}$/u;
const IDENTIFIER_PATTERN = /^cvg_live_(?:api_|worker_)?[a-f0-9]{24}$/u;

function requiredPostgresUrl(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required for live integration`);
  }
  const url = new URL(value);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new TypeError(`${name} must use PostgreSQL`);
  }
  if (url.hostname.length === 0 || url.username.length === 0) {
    throw new TypeError(`${name} must include host and username`);
  }
  return url;
}

function validateToken(token) {
  if (!TOKEN_PATTERN.test(token)) {
    throw new TypeError("live integration token must contain 24 hex digits");
  }
  return token;
}

function quoteIdentifier(identifier) {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new TypeError("unsafe live integration identifier");
  }
  return `"${identifier}"`;
}

function replaceDatabaseAndCredentials(source, databaseName, role, password) {
  const url = new URL(source.toString());
  url.pathname = `/${databaseName}`;
  if (role !== undefined) url.username = role;
  if (password !== undefined) url.password = password;
  return url.toString();
}

export function buildLiveIntegrationPlan(environment, suppliedToken) {
  const token = validateToken(suppliedToken ?? randomBytes(12).toString("hex"));
  const maintenance = requiredPostgresUrl(
    environment.CVG_TEST_ADMIN_DATABASE_URL,
    "CVG_TEST_ADMIN_DATABASE_URL",
  );
  const databaseName = `cvg_live_${token}`;
  const apiRoleName = `cvg_live_api_${token}`;
  const workerRoleName = `cvg_live_worker_${token}`;
  const apiPassword = `api_${token}`;
  const workerPassword = `worker_${token}`;

  return Object.freeze({
    token,
    databaseName,
    apiRoleName,
    workerRoleName,
    maintenanceDatabaseUrl: maintenance.toString(),
    adminDatabaseUrl: replaceDatabaseAndCredentials(maintenance, databaseName),
    apiDatabaseUrl: replaceDatabaseAndCredentials(
      maintenance,
      databaseName,
      apiRoleName,
      apiPassword,
    ),
    workerDatabaseUrl: replaceDatabaseAndCredentials(
      maintenance,
      databaseName,
      workerRoleName,
      workerPassword,
    ),
    apiPassword,
    workerPassword,
  });
}

export function buildLiveTestEnvironment(
  environment,
  plan,
  { includeQdrant, includeRestore },
) {
  return Object.freeze({
    ...environment,
    DATABASE_URL: plan.apiDatabaseUrl,
    CVG_TEST_ADMIN_DATABASE_URL: plan.adminDatabaseUrl,
    CVG_TEST_DATABASE_URL: plan.apiDatabaseUrl,
    CVG_TEST_WORKER_DATABASE_URL: plan.workerDatabaseUrl,
    CVG_RUN_LIVE_DB_TESTS: "true",
    CVG_RUN_LIVE_RESTORE_TESTS: includeRestore ? "true" : "false",
    CVG_RUN_LIVE_QDRANT_TESTS: includeQdrant ? "true" : "false",
  });
}

function buildVitestArguments({ includeQdrant, includeRestore, onlyRestore }) {
  const optionalExcludes = [
    ...(includeQdrant
      ? []
      : [
          "tests/integration/api-health.test.ts",
          "tests/integration/qdrant-live.test.ts",
          "tests/integration/worker-qdrant-live.test.ts",
        ]),
    ...(includeRestore ? [] : ["tests/integration/postgres-restore.test.ts"]),
  ];
  return [
    "exec",
    "vitest",
    "run",
    "--project",
    "integration",
    ...(onlyRestore ? ["tests/integration/postgres-restore.test.ts"] : []),
    ...optionalExcludes.flatMap((file) => ["--exclude", file]),
  ];
}

function createPsqlOperation(id, databaseUrl, input, environment) {
  const connection = requiredPostgresUrl(databaseUrl, `${id} database URL`);
  const password = decodeURIComponent(connection.password);
  connection.password = "";
  return Object.freeze({
    id,
    command: "psql",
    arguments: Object.freeze([
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--quiet",
      "--dbname",
      connection.toString(),
    ]),
    environment: Object.freeze({
      ...environment,
      ...(password.length === 0 ? {} : { PGPASSWORD: password }),
    }),
    input,
  });
}

function buildProvisionSql(plan) {
  const database = quoteIdentifier(plan.databaseName);
  const apiRole = quoteIdentifier(plan.apiRoleName);
  const workerRole = quoteIdentifier(plan.workerRoleName);
  return `
CREATE ROLE ${apiRole} LOGIN PASSWORD '${plan.apiPassword}' NOSUPERUSER NOBYPASSRLS;
CREATE ROLE ${workerRole} LOGIN PASSWORD '${plan.workerPassword}' NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE ${database} TEMPLATE template0;
`;
}

function buildGrantSql(plan) {
  const database = quoteIdentifier(plan.databaseName);
  const apiRole = quoteIdentifier(plan.apiRoleName);
  const workerRole = quoteIdentifier(plan.workerRoleName);
  return `
GRANT CONNECT ON DATABASE ${database} TO ${apiRole}, ${workerRole};
GRANT USAGE ON SCHEMA public TO ${apiRole}, ${workerRole};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${apiRole};
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${apiRole};
REVOKE ALL ON TABLE ai_suggestions, ai_suggestion_events FROM ${apiRole};
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  outbox_events,
  content_versions,
  ai_suggestions,
  ai_suggestion_events
TO ${workerRole};
`;
}

function buildIdentityVerificationSql(plan) {
  return `
DO $verification$
DECLARE
  api_is_unsafe boolean;
  worker_is_unsafe boolean;
BEGIN
  SELECT rolsuper OR rolbypassrls INTO api_is_unsafe
  FROM pg_roles WHERE rolname = '${plan.apiRoleName}';
  SELECT rolsuper OR rolbypassrls INTO worker_is_unsafe
  FROM pg_roles WHERE rolname = '${plan.workerRoleName}';
  IF api_is_unsafe IS DISTINCT FROM false OR worker_is_unsafe IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'live integration roles must be restricted';
  END IF;
  IF has_table_privilege('${plan.apiRoleName}', 'ai_suggestions', 'SELECT')
     OR has_table_privilege('${plan.apiRoleName}', 'ai_suggestion_events', 'SELECT') THEN
    RAISE EXCEPTION 'API role can access worker-only AI tables';
  END IF;
  IF NOT has_table_privilege('${plan.workerRoleName}', 'outbox_events', 'UPDATE')
     OR NOT has_table_privilege('${plan.workerRoleName}', 'ai_suggestion_events', 'INSERT') THEN
    RAISE EXCEPTION 'worker role is missing its explicit contract';
  END IF;
END
$verification$;
`;
}

function buildCleanupSql(plan) {
  const database = quoteIdentifier(plan.databaseName);
  const apiRole = quoteIdentifier(plan.apiRoleName);
  const workerRole = quoteIdentifier(plan.workerRoleName);
  return `
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${plan.databaseName}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${database};
DROP ROLE IF EXISTS ${apiRole};
DROP ROLE IF EXISTS ${workerRole};
`;
}

function buildOperations(environment, plan, flags) {
  const liveEnvironment = buildLiveTestEnvironment(environment, plan, flags);
  return Object.freeze({
    provision: createPsqlOperation(
      "provision",
      plan.maintenanceDatabaseUrl,
      buildProvisionSql(plan),
      environment,
    ),
    migrate: Object.freeze({
      id: "migrate",
      command: "pnpm",
      arguments: Object.freeze(["db:migrate"]),
      environment: Object.freeze({
        ...environment,
        DATABASE_URL: plan.adminDatabaseUrl,
      }),
    }),
    grant: createPsqlOperation(
      "grant",
      plan.adminDatabaseUrl,
      buildGrantSql(plan),
      environment,
    ),
    verifyIdentities: createPsqlOperation(
      "verify-identities",
      plan.adminDatabaseUrl,
      buildIdentityVerificationSql(plan),
      environment,
    ),
    vitest: Object.freeze({
      id: "vitest",
      command: "pnpm",
      arguments: Object.freeze(buildVitestArguments(flags)),
      environment: liveEnvironment,
    }),
    cleanup: createPsqlOperation(
      "cleanup",
      plan.maintenanceDatabaseUrl,
      buildCleanupSql(plan),
      environment,
    ),
  });
}

export async function runLiveIntegrationCommand(operation, signal) {
  await new Promise((resolve, reject) => {
    const child = spawn(operation.command, operation.arguments, {
      env: operation.environment,
      stdio: [
        operation.input === undefined ? "ignore" : "pipe",
        "inherit",
        "inherit",
      ],
    });
    let aborted = false;
    const abort = () => {
      aborted = true;
      child.kill("SIGTERM");
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.once("error", reject);
    child.once("close", (code, childSignal) => {
      signal?.removeEventListener("abort", abort);
      if (code === 0 && childSignal === null && !aborted) {
        resolve();
        return;
      }
      reject(
        new Error(
          aborted
            ? `${operation.id} aborted`
            : `${operation.id} failed with ${childSignal ?? code ?? "unknown"}`,
        ),
      );
    });
    if (operation.input !== undefined) {
      child.stdin.end(operation.input);
    }
  });
}

export async function executeLiveIntegration({
  environment,
  token,
  runCommand = runLiveIntegrationCommand,
  signal,
}) {
  const includeQdrant = environment.CVG_INCLUDE_LIVE_QDRANT === "true";
  const includeRestore = environment.CVG_INCLUDE_LIVE_RESTORE === "true";
  const onlyRestore = environment.CVG_ONLY_LIVE_RESTORE === "true";
  if (onlyRestore && !includeRestore) {
    throw new Error(
      "CVG_INCLUDE_LIVE_RESTORE is required for restore-only mode",
    );
  }
  if (
    includeQdrant &&
    (environment.CVG_TEST_QDRANT_URL === undefined ||
      environment.CVG_TEST_QDRANT_URL.trim().length === 0)
  ) {
    throw new Error(
      "CVG_TEST_QDRANT_URL is required when live Qdrant tests are enabled",
    );
  }

  const plan = buildLiveIntegrationPlan(environment, token);
  const operations = buildOperations(environment, plan, {
    includeQdrant,
    includeRestore,
    onlyRestore,
  });
  let primaryError;
  try {
    await runCommand(operations.provision, signal);
    await runCommand(operations.migrate, signal);
    await runCommand(operations.grant, signal);
    await runCommand(operations.verifyIdentities, signal);
    await runCommand(operations.vitest, signal);
  } catch (error) {
    primaryError = error;
  }

  try {
    await runCommand(operations.cleanup);
  } catch (cleanupError) {
    if (primaryError !== undefined) {
      throw new AggregateError(
        [primaryError, cleanupError],
        "live integration and cleanup failed",
      );
    }
    throw cleanupError;
  }
  if (primaryError !== undefined) throw primaryError;
}
