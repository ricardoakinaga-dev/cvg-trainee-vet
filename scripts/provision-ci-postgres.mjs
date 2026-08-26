import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { URL } from "node:url";
import { fileURLToPath } from "node:url";

export function requiredEnvironment(name, environment = process.env) {
  const value = environment[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function connectionParts(name, value) {
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
  if (/[\r\n]/u.test(password)) {
    throw new Error(`${name} password contains an invalid line break`);
  }
  const sslMode = url.searchParams.get("sslmode") ?? undefined;
  if (
    sslMode !== undefined &&
    !new Set([
      "disable",
      "allow",
      "prefer",
      "require",
      "verify-ca",
      "verify-full",
    ]).has(sslMode)
  ) {
    throw new Error(`${name} contains an invalid sslmode`);
  }
  return Object.freeze({
    role,
    password,
    database,
    host: url.hostname.length === 0 ? undefined : url.hostname,
    port: url.port.length === 0 ? undefined : url.port,
    sslMode,
  });
}

export function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function escapePgpassPart(value) {
  return value.replaceAll("\\", "\\\\").replaceAll(":", "\\:");
}

export function pgpassEntry(connection) {
  return [
    connection.host ?? "*",
    connection.port ?? "5432",
    connection.database,
    connection.role,
    connection.password,
  ]
    .map(escapePgpassPart)
    .join(":");
}

export function postgresProvisionArgs(connection, sqlFile) {
  const args = [
    "--no-psqlrc",
    "--no-password",
    "--dbname",
    connection.database,
    "--username",
    connection.role,
  ];
  if (connection.host !== undefined) args.push("--host", connection.host);
  if (connection.port !== undefined) args.push("--port", connection.port);
  args.push("--set=ON_ERROR_STOP=1", "--file", sqlFile);
  return Object.freeze(args);
}

const inheritedProcessEnvironmentKeys = new Set([
  "CI",
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "PATH",
  "TERM",
  "TMPDIR",
]);

export function postgresProcessEnvironment(
  environment,
  connection,
  pgpassFile,
) {
  const safeEnvironment = Object.fromEntries(
    Object.entries(environment).filter(([key]) =>
      inheritedProcessEnvironmentKeys.has(key),
    ),
  );
  return Object.freeze({
    ...safeEnvironment,
    PGPASSFILE: pgpassFile,
    ...(connection.sslMode === undefined
      ? {}
      : { PGSSLMODE: connection.sslMode }),
  });
}

async function createTemporaryProvisionFiles(connection, sql) {
  const directory = await mkdtemp(join(tmpdir(), "cvg-pgpass-"));
  const pgpassFile = join(directory, "pgpass");
  const sqlFile = join(directory, "provision.sql");
  try {
    await writeFile(pgpassFile, `${pgpassEntry(connection)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await writeFile(sqlFile, `${sql}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await Promise.all([chmod(pgpassFile, 0o600), chmod(sqlFile, 0o600)]);
    return Object.freeze({ directory, pgpassFile, sqlFile });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export const applicationTablePrivileges = Object.freeze({
  accounts: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  account_invitations: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  account_recovery_requests: Object.freeze([
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
  ]),
  content_versions: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  content_editorial_records: Object.freeze([
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
  ]),
  content_review_decisions: Object.freeze([
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
  ]),
  authoring_draft_idempotency: Object.freeze(["SELECT", "INSERT"]),
  learning_activities: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  learning_activity_items: Object.freeze([
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
  ]),
  ai_suggestions: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  activity_assignments: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  curriculum_runtime_states: Object.freeze([
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
  ]),
  diagnostic_results: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  attempts: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  assessment_results: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  answers: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  attempt_idempotency: Object.freeze(["SELECT", "INSERT"]),
  answer_idempotency: Object.freeze(["SELECT", "INSERT"]),
  assessment_idempotency: Object.freeze(["SELECT", "INSERT"]),
  sessions: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  rate_limit_buckets: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  outbox_events: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  audit_entries: Object.freeze(["SELECT", "INSERT"]),
  learning_assignments: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  assessment_workflows: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  feedback_tickets: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  feedback_ticket_history: Object.freeze(["SELECT", "INSERT"]),
  appeals: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
  appeal_review_history: Object.freeze(["SELECT", "INSERT"]),
});

export const applicationExcludedTables = Object.freeze(["knowledge_documents"]);

export const rlsHelperProcedures = Object.freeze([
  "public.cvg_learning_activity_in_scope(uuid,text)",
  "public.cvg_learning_activity_for_participant(uuid,text)",
  "public.cvg_learning_activity_item_insert_allowed(uuid,uuid,text)",
  "public.cvg_learning_activity_content_for_participant(uuid,text)",
  "public.cvg_participant_in_scope(uuid,uuid)",
  "public.cvg_learning_activity_assignment_insert_allowed(uuid,uuid,uuid,text)",
  "public.cvg_learning_activity_assignment_write_allowed(uuid,uuid,uuid,text,text)",
  "public.cvg_learning_activity_journey_visible(uuid,text)",
  "public.cvg_learning_activity_scope_for_participant(uuid,text)",
]);

export function rlsHelperGrantSql(applicationRole, adminRole) {
  const procedures = rlsHelperProcedures.map(quoteLiteral).join(", ");
  return `DO $cvg_runtime_grants$
DECLARE
  helper_procedure text;
BEGIN
  FOREACH helper_procedure IN ARRAY ARRAY[${procedures}] LOOP
    IF to_regprocedure(helper_procedure) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', helper_procedure);
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO %I',
        helper_procedure,
        ${quoteLiteral(applicationRole)}
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO %I WITH GRANT OPTION',
        helper_procedure,
        ${quoteLiteral(adminRole)}
      );
    END IF;
  END LOOP;
END
$cvg_runtime_grants$;`;
}

function applicationTableGrantSql(applicationIdentifier) {
  return Object.entries(applicationTablePrivileges).map(
    ([table, privileges]) =>
      `GRANT ${privileges.join(", ")} ON TABLE public.${quoteIdentifier(table)} TO ${applicationIdentifier};`,
  );
}

export function roleProvisionSql({ migration, application, admin }) {
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
    "BEGIN;",
    provisionRole(
      application.role,
      application.password,
      "NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION",
    ),
    provisionRole(
      admin.role,
      admin.password,
      "NOSUPERUSER BYPASSRLS NOCREATEDB CREATEROLE NOREPLICATION",
    ),
    `REVOKE ALL PRIVILEGES ON DATABASE ${databaseIdentifier} FROM PUBLIC;`,
    `REVOKE ALL PRIVILEGES ON DATABASE ${databaseIdentifier} FROM ${appIdentifier}, ${adminIdentifier};`,
    `GRANT CONNECT ON DATABASE ${databaseIdentifier} TO ${migrationIdentifier}, ${appIdentifier};`,
    `GRANT CONNECT ON DATABASE ${databaseIdentifier} TO ${adminIdentifier} WITH GRANT OPTION;`,
    `REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;`,
    `REVOKE ALL PRIVILEGES ON SCHEMA public FROM ${appIdentifier}, ${adminIdentifier};`,
    `GRANT USAGE ON SCHEMA public TO ${appIdentifier};`,
    `GRANT USAGE ON SCHEMA public TO ${adminIdentifier} WITH GRANT OPTION;`,
    `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;`,
    `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;`,
    `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${appIdentifier}, ${adminIdentifier};`,
    `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${appIdentifier}, ${adminIdentifier};`,
    `REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;`,
    `REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM ${appIdentifier}, ${adminIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON TABLES FROM ${appIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${appIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON FUNCTIONS FROM ${appIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM ${appIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${appIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON FUNCTIONS FROM ${appIdentifier};`,
    `REVOKE UPDATE, DELETE ON TABLE public."authoring_draft_idempotency" FROM ${appIdentifier}, PUBLIC;`,
    `REVOKE UPDATE, DELETE ON TABLE public."feedback_ticket_history" FROM ${appIdentifier}, PUBLIC;`,
    ...applicationTableGrantSql(appIdentifier),
    rlsHelperGrantSql(application.role, admin.role),
    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${adminIdentifier} WITH GRANT OPTION;`,
    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${adminIdentifier} WITH GRANT OPTION;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM ${adminIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${adminIdentifier};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${adminIdentifier} WITH GRANT OPTION;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${adminIdentifier} WITH GRANT OPTION;`,
    "COMMIT;",
  ].join("\n");
}

export async function provisionCiPostgres(
  environment = process.env,
  spawnProcess = spawn,
) {
  const migrationDatabaseUrl = requiredEnvironment(
    "CVG_MIGRATION_DATABASE_URL",
    environment,
  );
  const migration = connectionParts(
    "CVG_MIGRATION_DATABASE_URL",
    migrationDatabaseUrl,
  );
  const application = connectionParts(
    "CVG_TEST_DATABASE_URL",
    requiredEnvironment("CVG_TEST_DATABASE_URL", environment),
  );
  const admin = connectionParts(
    "CVG_TEST_ADMIN_DATABASE_URL",
    requiredEnvironment("CVG_TEST_ADMIN_DATABASE_URL", environment),
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

  const provisionFiles = await createTemporaryProvisionFiles(
    migration,
    roleProvisionSql({ migration, application, admin }),
  );
  let cleanupPromise;
  const cleanup = () => {
    cleanupPromise ??= rm(provisionFiles.directory, {
      recursive: true,
      force: true,
    });
    return cleanupPromise;
  };

  let child;
  try {
    child = spawnProcess(
      "psql",
      postgresProvisionArgs(migration, provisionFiles.sqlFile),
      {
        env: postgresProcessEnvironment(
          environment,
          migration,
          provisionFiles.pgpassFile,
        ),
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
  } catch (error) {
    await cleanup();
    throw error;
  }

  child.once("error", (error) => {
    console.error(
      `PostgreSQL role provisioning could not start: ${error.message}`,
    );
    process.exitCode = 1;
    void cleanup().catch((cleanupError) => {
      console.error(
        `PostgreSQL role provisioning cleanup failed: ${cleanupError.message}`,
      );
    });
  });
  child.once("close", (code, signal) => {
    void cleanup().then(
      () => {
        if (signal !== null) {
          console.error(`PostgreSQL role provisioning stopped by ${signal}`);
          process.exitCode = 1;
          return;
        }
        process.exitCode = code ?? 1;
      },
      (cleanupError) => {
        console.error(
          `PostgreSQL role provisioning cleanup failed: ${cleanupError.message}`,
        );
        process.exitCode = 1;
      },
    );
  });

  return child;
}

if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  void provisionCiPostgres().catch((error) => {
    console.error(
      `PostgreSQL role provisioning failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  });
}
