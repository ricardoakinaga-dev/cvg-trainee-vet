import { spawn } from "node:child_process";
import { URL } from "node:url";

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function connectionParts(name, value) {
  const url = new URL(value);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`${name} must use PostgreSQL`);
  }
  const role = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = decodeURIComponent(url.pathname.replace(/^\//u, ""));
  if (
    !/^[a-z_][a-z0-9_]*$/iu.test(role) ||
    !/^[a-z_][a-z0-9_]*$/iu.test(database)
  ) {
    throw new Error(`${name} contains an invalid role or database identifier`);
  }
  if (password.length === 0) throw new Error(`${name} must include a password`);
  return Object.freeze({ role, password, database });
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function roleProvisionSql({ migration, application, admin }) {
  const provisionRole = (role, password, attributes) => `
DO $cvg_provision$
DECLARE
  role_name text := ${quoteLiteral(role)};
  role_password text := ${quoteLiteral(password)};
BEGIN
  IF EXISTS (select 1 from pg_roles where rolname = role_name) THEN
    EXECUTE format('ALTER ROLE %I WITH LOGIN ${attributes} PASSWORD %L', role_name, role_password);
  ELSE
    EXECUTE format('CREATE ROLE %I WITH LOGIN ${attributes} PASSWORD %L', role_name, role_password);
  END IF;
END
$cvg_provision$;`;

  const appIdentifier = quoteIdentifier(application.role);
  const adminIdentifier = quoteIdentifier(admin.role);
  const migrationIdentifier = quoteIdentifier(migration.role);
  const databaseIdentifier = quoteIdentifier(migration.database);
  return [
    provisionRole(
      application.role,
      application.password,
      "NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE",
    ),
    provisionRole(
      admin.role,
      admin.password,
      "NOSUPERUSER BYPASSRLS NOCREATEDB CREATEROLE",
    ),
    `REVOKE CREATE ON SCHEMA public FROM PUBLIC;`,
    `GRANT CONNECT ON DATABASE ${databaseIdentifier} TO ${appIdentifier}, ${adminIdentifier};`,
    `GRANT USAGE ON SCHEMA public TO ${appIdentifier};`,
    `GRANT USAGE ON SCHEMA public TO ${adminIdentifier} WITH GRANT OPTION;`,
    `DO $cvg_runtime_grant$
BEGIN
  IF to_regprocedure('public.cvg_participant_in_scope(uuid,uuid)') IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.cvg_participant_in_scope(uuid, uuid) TO %I', ${quoteLiteral(application.role)});
  END IF;
END
$cvg_runtime_grant$;`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appIdentifier};`,
    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${adminIdentifier} WITH GRANT OPTION;`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appIdentifier};`,
    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${adminIdentifier} WITH GRANT OPTION;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${appIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${adminIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${appIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${adminIdentifier};`,
  ].join("\n");
}

const migration = connectionParts(
  "CVG_MIGRATION_DATABASE_URL",
  requiredEnvironment("CVG_MIGRATION_DATABASE_URL"),
);
const application = connectionParts(
  "CVG_TEST_DATABASE_URL",
  requiredEnvironment("CVG_TEST_DATABASE_URL"),
);
const admin = connectionParts(
  "CVG_TEST_ADMIN_DATABASE_URL",
  requiredEnvironment("CVG_TEST_ADMIN_DATABASE_URL"),
);

if (
  new Set([migration.role, application.role, admin.role]).size !== 3 ||
  migration.database !== application.database ||
  migration.database !== admin.database
) {
  throw new Error(
    "migration, application and admin URLs must use distinct roles in the same database",
  );
}

const child = spawn(
  "psql",
  [
    "--no-psqlrc",
    "--no-password",
    "--dbname",
    requiredEnvironment("CVG_MIGRATION_DATABASE_URL"),
    "--set=ON_ERROR_STOP=1",
    "--command",
    roleProvisionSql({ migration, application, admin }),
  ],
  { stdio: ["ignore", "inherit", "inherit"] },
);

child.once("error", (error) => {
  console.error(
    `PostgreSQL role provisioning could not start: ${error.message}`,
  );
  process.exitCode = 1;
});
child.once("close", (code, signal) => {
  if (signal !== null) {
    console.error(`PostgreSQL role provisioning stopped by ${signal}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
