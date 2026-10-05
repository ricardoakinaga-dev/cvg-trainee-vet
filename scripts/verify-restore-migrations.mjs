import { createHash, randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";

import { buildRestoreMigrationPlan } from "./restore-migration-compatibility.mjs";
import {
  createRestoreToolRunner,
  runRoleProvisioningCommand,
} from "./restore-tool-runner.mjs";
import {
  restoreApplicationGrantMatrixMatches,
  restoreIntegrityCatalogMatches,
} from "./restore-integrity-contract.mjs";
import { verifyIndexerPolicyContract } from "./restore-policy-contract.mjs";
import { ephemeralPort } from "./live-embedded-pg.mjs";
import {
  applicationExcludedTables,
  applicationTablePrivileges,
  roleProvisionSql,
} from "./provision-ci-postgres.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const runTool = createRestoreToolRunner({ cwd: root });
const migrationsFolder = join(root, "packages/persistence/drizzle");
const snapshotHeadTag = "0053_aaa_content_integrity";
const integrityTableNames = Object.freeze([
  "content_versions",
  "ai_suggestions",
]);
const applicationPrivilegeNames = Object.freeze([
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
]);
const pgBinCandidates = [
  process.env.CVG_PG_BIN?.trim(),
  "/usr/lib/postgresql/16/bin",
  "/home/ricardo/.local/share/cvg-his-v4-runtime/root/usr/lib/postgresql/16/bin",
].filter((candidate) => candidate !== undefined && candidate !== "");
const pgLibraryPaths = [
  "/home/ricardo/.local/share/cvg-his-v4-runtime/root/usr/lib/x86_64-linux-gnu",
  "/home/ricardo/.local/share/cvg-his-v4-runtime/root/usr/lib/postgresql/16/lib",
];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function resolvePgBin() {
  for (const candidate of pgBinCandidates) {
    if (!existsSync(join(candidate, "initdb"))) continue;
    try {
      const { stdout } = await execFileAsync(
        join(candidate, "postgres"),
        ["--version"],
        {
          timeout: 10_000,
          maxBuffer: 1024 * 1024,
        },
      );
      if (/^postgres \(PostgreSQL\) 16\./u.test(stdout.trim()))
        return resolve(candidate);
    } catch {
      // Continue to the next known local PostgreSQL 16 toolkit.
    }
  }
  throw new Error("PostgreSQL 16 toolkit is unavailable");
}

async function readMigrationManifest() {
  const journalPath = join(migrationsFolder, "meta/_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  requireCondition(
    journal?.dialect === "postgresql" && Array.isArray(journal.entries),
    "migration journal is invalid",
  );
  const sqlFiles = (await readdir(migrationsFolder))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const journalFiles = journal.entries
    .map((entry) => `${entry.tag}.sql`)
    .sort();
  requireCondition(
    JSON.stringify(sqlFiles) === JSON.stringify(journalFiles),
    "migration journal and SQL files do not match",
  );
  const hashesByTag = Object.create(null);
  for (const entry of journal.entries) {
    const contents = await readFile(join(migrationsFolder, `${entry.tag}.sql`));
    hashesByTag[entry.tag] = createHash("sha256")
      .update(contents)
      .digest("hex");
  }
  requireCondition(
    journal.entries.some((entry) => entry.tag === snapshotHeadTag),
    "expected historical snapshot head is absent",
  );
  buildRestoreMigrationPlan(journal.entries, hashesByTag, [
    {
      hash: hashesByTag[journal.entries[0]?.tag],
      created_at: String(journal.entries[0]?.when),
    },
  ]);
  return Object.freeze({ journal, hashesByTag });
}

function makeToolEnvironment(pgBin) {
  return Object.freeze({
    PATH: `${pgBin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
    LD_LIBRARY_PATH: pgLibraryPaths.join(":"),
    LANG: "C",
    LC_ALL: "C",
  });
}

async function validateCustomDumpArchive(pgBin, archivePath, sqlPath, env) {
  await rm(sqlPath, { force: true });
  try {
    await runTool(join(pgBin, "pg_restore"), ["--list", archivePath], env);
    await runTool(
      join(pgBin, "pg_restore"),
      ["--no-owner", "--no-privileges", "--file", sqlPath, archivePath],
      env,
      180_000,
    );
    return (await readFile(sqlPath)).length > 0;
  } catch {
    return false;
  } finally {
    await rm(sqlPath, { force: true });
  }
}

function connectionUrl(role, database, port) {
  return `postgresql://${role}@127.0.0.1:${port}/${database}`;
}

async function withSqlClient(url, action, socketDirectory, port) {
  const require = createRequire(
    join(root, "packages/persistence/package.json"),
  );
  const postgres = require("postgres");
  const sql = postgres(url, {
    host: socketDirectory,
    port,
    max: 1,
    connect_timeout: 5,
    onnotice: () => undefined,
  });
  try {
    return await action(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function migrateDatabase(databaseUrl, folder, socketDirectory, port) {
  const [{ drizzle }, { migrate }] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("drizzle-orm/postgres-js/migrator"),
  ]);
  await withSqlClient(
    databaseUrl,
    async (sql) => {
      await migrate(drizzle(sql), { migrationsFolder: folder });
    },
    socketDirectory,
    port,
  );
}

async function readMigrationRows(databaseUrl, socketDirectory, port) {
  return withSqlClient(
    databaseUrl,
    async (sql) =>
      sql.unsafe(
        'SELECT "hash", "created_at"::text AS "created_at" FROM "drizzle"."__drizzle_migrations" ORDER BY "created_at" ASC, "id" ASC',
      ),
    socketDirectory,
    port,
  );
}

async function readTableIntegrityCatalog(databaseUrl, socketDirectory, port) {
  return withSqlClient(
    databaseUrl,
    async (sql) => {
      const columns = await sql.unsafe(
        "SELECT c.relname AS table_name, a.attname AS column_name, format_type(a.atttypid, a.atttypmod) AS data_type, a.attnotnull AS not_null, a.attidentity AS identity_kind, a.attgenerated AS generated_kind, pg_get_expr(d.adbin, d.adrelid) AS default_expression, count(*) OVER (PARTITION BY c.relname)::int AS catalog_row_count FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum WHERE n.nspname = 'public' AND c.relname = ANY($1) AND a.attnum > 0 AND NOT a.attisdropped ORDER BY c.relname, a.attnum",
        [integrityTableNames],
      );
      const constraints = await sql.unsafe(
        "SELECT table_class.relname AS table_name, constraint_row.conname AS constraint_name, constraint_row.contype AS constraint_type, constraint_row.convalidated AS validated, pg_get_constraintdef(constraint_row.oid, true) AS definition, count(*) OVER (PARTITION BY table_class.relname)::int AS catalog_row_count FROM pg_constraint constraint_row JOIN pg_class table_class ON table_class.oid = constraint_row.conrelid JOIN pg_namespace n ON n.oid = table_class.relnamespace WHERE n.nspname = 'public' AND table_class.relname = ANY($1) ORDER BY table_class.relname, constraint_row.conname",
        [integrityTableNames],
      );
      const indexes = await sql.unsafe(
        "SELECT table_class.relname AS table_name, index_class.relname AS index_name, index_row.indisunique AS is_unique, index_row.indisprimary AS is_primary, index_row.indisvalid AS is_valid, index_row.indisready AS is_ready, pg_get_indexdef(index_row.indexrelid) AS definition, count(*) OVER (PARTITION BY table_class.relname)::int AS catalog_row_count FROM pg_index index_row JOIN pg_class table_class ON table_class.oid = index_row.indrelid JOIN pg_namespace n ON n.oid = table_class.relnamespace JOIN pg_class index_class ON index_class.oid = index_row.indexrelid WHERE n.nspname = 'public' AND table_class.relname = ANY($1) ORDER BY table_class.relname, index_class.relname",
        [integrityTableNames],
      );
      return { columns, constraints, indexes };
    },
    socketDirectory,
    port,
  );
}

async function readApplicationPrivilegeCatalog(
  databaseUrl,
  applicationRole,
  socketDirectory,
  port,
) {
  return withSqlClient(
    databaseUrl,
    async (sql) => {
      const grants = await sql.unsafe(
        "SELECT c.relname AS table_name, privilege.privilege_name AS privilege, has_table_privilege($1, c.oid, privilege.privilege_name) AS granted FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace CROSS JOIN unnest($2::text[]) AS privilege(privilege_name) WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f') ORDER BY c.relname, privilege.privilege_name",
        [applicationRole, applicationPrivilegeNames],
      );
      const role = await sql.unsafe(
        "SELECT r.rolsuper, r.rolbypassrls, r.rolcreatedb, r.rolcreaterole, r.rolreplication, has_database_privilege(r.rolname, current_database(), 'CONNECT') AS can_connect, has_database_privilege(r.rolname, current_database(), 'CREATE') AS can_create_database, has_schema_privilege(r.rolname, 'public', 'USAGE') AS can_use_public, has_schema_privilege(r.rolname, 'public', 'CREATE') AS can_create_public, (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relowner = r.oid) AS owned_public_relations FROM pg_roles r WHERE r.rolname = $1",
        [applicationRole],
      );
      return { grants, role };
    },
    socketDirectory,
    port,
  );
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve();
  return new Promise((resolveExit) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolveExit();
    }, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveExit();
    });
  });
}

async function serverOwnsPort(dataDir, server, port, socketDirectory) {
  try {
    const lines = (
      await readFile(join(dataDir, "postmaster.pid"), "utf8")
    ).split("\n");
    return (
      Number(lines[0]) === server.pid &&
      lines[1] === dataDir &&
      Number(lines[3]) === port &&
      lines[4]
        ?.split(",")
        .map((entry) => entry.trim())
        .includes(socketDirectory)
    );
  } catch {
    return false;
  }
}

async function main() {
  const startedAt = Date.now();
  const { journal, hashesByTag } = await readMigrationManifest();
  const snapshotIndex = journal.entries.findIndex(
    (entry) => entry.tag === snapshotHeadTag,
  );
  const nextMigration = journal.entries[snapshotIndex + 1];
  requireCondition(
    nextMigration?.tag === "0054_aaa_content_indexer_service",
    "expected pending migration 0054 is absent",
  );

  const pgBin = await resolvePgBin();
  const toolEnv = makeToolEnvironment(pgBin);
  const directory = await mkdtemp(join(tmpdir(), "cvg-restore-migrations-"));
  const dataDir = join(directory, "data");
  const fixtureFolder = join(directory, "historical-migrations");
  const dumpPath = join(directory, "historical-snapshot.dump");
  const semanticDriftDumpPath = join(directory, "semantic-drift-snapshot.dump");
  const corruptDumpPath = join(directory, "corrupt-snapshot.dump");
  const preflightSqlPath = join(directory, "snapshot-preflight.sql");
  const provisionRolesSqlPath = join(directory, "restore-roles.sql");
  const port = ephemeralPort(55740);
  const nonce = randomUUID().replaceAll("-", "").slice(0, 16);
  const restoreRole = `cvg_restore_${nonce}`;
  const applicationRole = `cvg_restore_app_${nonce}`;
  const restoreAdminRole = `cvg_restore_admin_${nonce}`;
  const sourceDatabase = `cvg_restore_source_${nonce}`;
  const targetDatabase = `cvg_restore_target_${nonce}`;
  const semanticTargetDatabase = `cvg_restore_semantic_target_${nonce}`;
  const defaultPrivilegeProbe = `cvg_restore_acl_probe_${nonce}`;
  const markerValue = randomUUID();
  const maintenanceUrl = connectionUrl("postgres", "postgres", port);
  let server;
  let serverStarted = false;
  let serverStderr = "";
  let roleCreated = false;
  let applicationRolesCreated = false;
  let sourceCreated = false;
  let targetCreated = false;
  let semanticTargetCreated = false;

  try {
    await runTool(
      join(pgBin, "initdb"),
      [
        "-D",
        dataDir,
        "-U",
        "postgres",
        "--auth-local=trust",
        "--auth-host=trust",
        "-E",
        "UTF8",
      ],
      toolEnv,
    );
    server = spawn(
      join(pgBin, "postgres"),
      [
        "-D",
        dataDir,
        "-p",
        String(port),
        "-c",
        "listen_addresses=",
        "-c",
        `unix_socket_directories=${directory}`,
        "-c",
        "log_min_messages=warning",
      ],
      { env: toolEnv, stdio: ["ignore", "ignore", "pipe"] },
    );
    server.stderr.setEncoding("utf8");
    server.stderr.on("data", (chunk) => {
      serverStderr = `${serverStderr}${chunk}`.slice(-4000);
    });
    server.on("error", (error) => {
      serverStderr = `${serverStderr}${error.message}`.slice(-4000);
    });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (server.exitCode !== null)
        throw new Error("disposable PostgreSQL failed to start");
      if (!(await serverOwnsPort(dataDir, server, port, directory))) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
        continue;
      }
      try {
        await runTool(
          join(pgBin, "pg_isready"),
          [
            "-h",
            directory,
            "-p",
            String(port),
            "-U",
            "postgres",
            "-d",
            "postgres",
          ],
          toolEnv,
          5_000,
        );
        serverStarted = true;
        break;
      } catch {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
      }
    }
    requireCondition(
      serverStarted,
      `disposable PostgreSQL did not become ready${serverStderr.trim() === "" ? "" : `: ${serverStderr.trim()}`}`,
    );

    await withSqlClient(
      maintenanceUrl,
      async (sql) => {
        await sql.unsafe(
          `CREATE ROLE "${restoreRole}" LOGIN NOSUPERUSER NOCREATEDB NOBYPASSRLS`,
        );
        roleCreated = true;
        await sql.unsafe(
          `CREATE DATABASE "${sourceDatabase}" OWNER "postgres"`,
        );
        sourceCreated = true;
      },
      directory,
      port,
    );

    const entriesThroughSnapshot = journal.entries.slice(0, snapshotIndex + 1);
    await mkdir(join(fixtureFolder, "meta"), { recursive: true });
    await writeFile(
      join(fixtureFolder, "meta/_journal.json"),
      `${JSON.stringify({ ...journal, entries: entriesThroughSnapshot }, null, 2)}\n`,
      { mode: 0o600, flag: "wx" },
    );
    for (const entry of entriesThroughSnapshot) {
      await copyFile(
        join(migrationsFolder, `${entry.tag}.sql`),
        join(fixtureFolder, `${entry.tag}.sql`),
      );
    }

    // The legacy migration chain contains SECURITY DEFINER functions whose
    // owner must bypass an existing FORCE RLS policy during creation. This
    // mirrors the repository's privileged migration principal; the restored
    // target and its pending migration use the non-superuser restore role.
    const sourceUrl = connectionUrl("postgres", sourceDatabase, port);
    const targetUrl = connectionUrl(restoreRole, targetDatabase, port);
    const semanticTargetUrl = connectionUrl(
      restoreRole,
      semanticTargetDatabase,
      port,
    );
    await migrateDatabase(sourceUrl, fixtureFolder, directory, port);
    const sourceRows = await readMigrationRows(sourceUrl, directory, port);
    const sourcePlan = buildRestoreMigrationPlan(
      journal.entries,
      hashesByTag,
      sourceRows,
    );
    requireCondition(
      sourcePlan.snapshotHeadTag === snapshotHeadTag &&
        sourcePlan.pendingTags[0] === nextMigration.tag,
      "historical source did not stop at the requested migration head",
    );

    await withSqlClient(
      sourceUrl,
      async (sql) => {
        await sql.unsafe(
          "CREATE TABLE public.cvg_restore_migration_marker (marker_value text PRIMARY KEY)",
        );
        await sql`INSERT INTO public.cvg_restore_migration_marker (marker_value) VALUES (${markerValue})`;
      },
      directory,
      port,
    );

    await runTool(
      join(pgBin, "pg_dump"),
      [
        "-h",
        directory,
        "-p",
        String(port),
        "-U",
        "postgres",
        "-d",
        sourceDatabase,
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file",
        dumpPath,
      ],
      toolEnv,
      180_000,
    );

    const snapshotPreflightVerified = await validateCustomDumpArchive(
      pgBin,
      dumpPath,
      preflightSqlPath,
      toolEnv,
    );
    requireCondition(
      snapshotPreflightVerified,
      "valid historical snapshot failed archive preflight",
    );

    const sourceIntegrity = await readTableIntegrityCatalog(
      sourceUrl,
      directory,
      port,
    );
    await withSqlClient(
      sourceUrl,
      (sql) =>
        sql.unsafe(
          "ALTER TABLE public.content_versions ADD COLUMN synthetic_semantic_drift text",
        ),
      directory,
      port,
    );
    await runTool(
      join(pgBin, "pg_dump"),
      [
        "-h",
        directory,
        "-p",
        String(port),
        "-U",
        "postgres",
        "-d",
        sourceDatabase,
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file",
        semanticDriftDumpPath,
      ],
      toolEnv,
      180_000,
    );
    const semanticDriftPreflightVerified = await validateCustomDumpArchive(
      pgBin,
      semanticDriftDumpPath,
      preflightSqlPath,
      toolEnv,
    );
    requireCondition(
      semanticDriftPreflightVerified,
      "synthetic semantic-drift snapshot failed archive preflight",
    );

    const dumpBytes = await readFile(dumpPath);
    requireCondition(dumpBytes.length > 5, "historical snapshot is too small");
    dumpBytes[0] ^= 0xff;
    await writeFile(corruptDumpPath, dumpBytes, { mode: 0o600, flag: "wx" });
    const corruptSnapshotRejected = !(await validateCustomDumpArchive(
      pgBin,
      corruptDumpPath,
      preflightSqlPath,
      toolEnv,
    ));
    requireCondition(
      corruptSnapshotRejected,
      "corrupt historical snapshot passed archive preflight",
    );
    const targetAbsentAfterCorruptSnapshot = await withSqlClient(
      maintenanceUrl,
      async (sql) => {
        const rows = await sql.unsafe(
          "SELECT NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS absent",
          [targetDatabase],
        );
        return rows[0]?.absent === true;
      },
      directory,
      port,
    );
    const corruptSnapshotAbortVerified =
      corruptSnapshotRejected && targetAbsentAfterCorruptSnapshot;
    requireCondition(
      corruptSnapshotAbortVerified,
      "target database exists after corrupt snapshot preflight rejection",
    );

    await withSqlClient(
      maintenanceUrl,
      async (sql) => {
        await sql.unsafe(
          `CREATE DATABASE "${semanticTargetDatabase}" OWNER "${restoreRole}"`,
        );
        semanticTargetCreated = true;
      },
      directory,
      port,
    );
    await runTool(
      join(pgBin, "pg_restore"),
      [
        "-h",
        directory,
        "-p",
        String(port),
        "-U",
        restoreRole,
        "-d",
        semanticTargetDatabase,
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
        semanticDriftDumpPath,
      ],
      toolEnv,
      180_000,
    );
    const semanticSnapshotRows = await readMigrationRows(
      semanticTargetUrl,
      directory,
      port,
    );
    const semanticSnapshotPlan = buildRestoreMigrationPlan(
      journal.entries,
      hashesByTag,
      semanticSnapshotRows,
    );
    const semanticSnapshotJournalVerified =
      semanticSnapshotPlan.snapshotHeadTag === snapshotHeadTag &&
      semanticSnapshotPlan.pendingTags[0] === nextMigration.tag;
    requireCondition(
      semanticSnapshotJournalVerified,
      "synthetic semantic-drift snapshot did not retain a valid migration prefix",
    );
    await migrateDatabase(semanticTargetUrl, migrationsFolder, directory, port);
    const semanticTargetIntegrity = await readTableIntegrityCatalog(
      semanticTargetUrl,
      directory,
      port,
    );
    const semanticSnapshotMismatchRejected =
      semanticDriftPreflightVerified &&
      semanticSnapshotJournalVerified &&
      !restoreIntegrityCatalogMatches(
        sourceIntegrity,
        semanticTargetIntegrity,
        integrityTableNames,
      );
    requireCondition(
      semanticSnapshotMismatchRejected,
      "catalog comparator accepted a valid-journal snapshot with schema drift",
    );

    await withSqlClient(
      maintenanceUrl,
      async (sql) => {
        await sql.unsafe(
          `CREATE DATABASE "${targetDatabase}" OWNER "${restoreRole}"`,
        );
        targetCreated = true;
      },
      directory,
      port,
    );

    await runTool(
      join(pgBin, "pg_restore"),
      [
        "-h",
        directory,
        "-p",
        String(port),
        "-U",
        restoreRole,
        "-d",
        targetDatabase,
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
        dumpPath,
      ],
      toolEnv,
      180_000,
    );

    const restoredRows = await readMigrationRows(targetUrl, directory, port);
    const restoredPlan = buildRestoreMigrationPlan(
      journal.entries,
      hashesByTag,
      restoredRows,
    );
    requireCondition(
      restoredPlan.snapshotHeadTag === snapshotHeadTag &&
        restoredPlan.pendingTags[0] === nextMigration.tag,
      "restored migration history is not the expected prefix",
    );
    const markerRows = await withSqlClient(
      targetUrl,
      (sql) =>
        sql.unsafe(
          "SELECT count(*)::int AS marker_count FROM public.cvg_restore_migration_marker WHERE marker_value = $1",
          [markerValue],
        ),
      directory,
      port,
    );
    const markerVerified = markerRows[0]?.marker_count === 1;
    requireCondition(markerVerified, "synthetic restore marker is missing");

    await migrateDatabase(targetUrl, migrationsFolder, directory, port);
    const finalRows = await readMigrationRows(targetUrl, directory, port);
    const finalPlan = buildRestoreMigrationPlan(
      journal.entries,
      hashesByTag,
      finalRows,
    );
    const migrationHistoryVerified =
      finalPlan.pendingTags.length === 0 &&
      finalPlan.appliedMigrationCount === journal.entries.length;
    requireCondition(
      migrationHistoryVerified,
      "final migration history is incomplete",
    );

    const targetIntegrity = await readTableIntegrityCatalog(
      targetUrl,
      directory,
      port,
    );
    const constraintsVerified = restoreIntegrityCatalogMatches(
      sourceIntegrity,
      targetIntegrity,
      integrityTableNames,
    );
    requireCondition(
      constraintsVerified,
      "restored content table constraints, indexes, or columns differ from the synthetic source",
    );

    const provisionSql = roleProvisionSql({
      migration: {
        role: restoreRole,
        password: randomUUID(),
        database: targetDatabase,
      },
      application: {
        role: applicationRole,
        password: randomUUID(),
        database: targetDatabase,
      },
      admin: {
        role: restoreAdminRole,
        password: randomUUID(),
        database: targetDatabase,
      },
    });
    await writeFile(provisionRolesSqlPath, `${provisionSql}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await runRoleProvisioningCommand({
      runTool,
      pgBin,
      targetDatabase,
      socketDirectory: directory,
      port,
      sqlPath: provisionRolesSqlPath,
      env: toolEnv,
    });
    applicationRolesCreated = true;
    await withSqlClient(
      targetUrl,
      (sql) =>
        sql.unsafe(
          `CREATE TABLE public."${defaultPrivilegeProbe}" (probe_id integer PRIMARY KEY)`,
        ),
      directory,
      port,
    );

    const applicationCatalog = await readApplicationPrivilegeCatalog(
      targetUrl,
      applicationRole,
      directory,
      port,
    );
    const applicationGrantMatrixVerified = restoreApplicationGrantMatrixMatches(
      applicationCatalog.grants,
      applicationTablePrivileges,
      applicationExcludedTables,
    );
    const applicationRoleLeastPrivilegeVerified =
      applicationCatalog.role.length === 1 &&
      applicationCatalog.role[0]?.rolsuper === false &&
      applicationCatalog.role[0]?.rolbypassrls === false &&
      applicationCatalog.role[0]?.rolcreatedb === false &&
      applicationCatalog.role[0]?.rolcreaterole === false &&
      applicationCatalog.role[0]?.rolreplication === false &&
      applicationCatalog.role[0]?.can_connect === true &&
      applicationCatalog.role[0]?.can_create_database === false &&
      applicationCatalog.role[0]?.can_use_public === true &&
      applicationCatalog.role[0]?.can_create_public === false;
    const applicationRoleDefaultPrivilegesDenied =
      applicationCatalog.grants.filter(
        (grant) => grant.table_name === defaultPrivilegeProbe,
      ).length === applicationPrivilegeNames.length &&
      applicationCatalog.grants
        .filter((grant) => grant.table_name === defaultPrivilegeProbe)
        .every((grant) => grant.granted === false);
    const applicationRoleHasNoOwnership =
      applicationCatalog.role.length === 1 &&
      applicationCatalog.role[0]?.owned_public_relations === 0;
    requireCondition(
      applicationGrantMatrixVerified,
      "restored application role grants differ from the local provisioning matrix",
    );
    requireCondition(
      applicationRoleLeastPrivilegeVerified,
      "restored application role has unexpected capabilities",
    );
    requireCondition(
      applicationRoleDefaultPrivilegesDenied,
      "new migration-owned relation inherited application privileges",
    );
    requireCondition(
      applicationRoleHasNoOwnership,
      "application role unexpectedly owns public relations",
    );

    const catalog = await withSqlClient(
      targetUrl,
      async (sql) => {
        const tables = await sql.unsafe(
          "SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN ('content_versions', 'ai_suggestions') ORDER BY c.relname",
        );
        const policies = await sql.unsafe(
          "SELECT policyname, tablename, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND policyname = ANY($1)",
          [
            [
              "content_versions_indexer_select_policy",
              "ai_suggestions_indexer_select_policy",
              "ai_suggestions_indexer_insert_policy",
              "ai_suggestions_indexer_update_policy",
            ],
          ],
        );
        const role = await sql.unsafe(
          "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
        );
        const socket = await sql.unsafe(
          "SELECT inet_client_addr() AS client_addr",
        );
        return { tables, policies, role, socket };
      },
      directory,
      port,
    );
    const rlsPoliciesVerified =
      catalog.tables.length === 2 &&
      catalog.tables.every(
        (table) =>
          table.relrowsecurity === true && table.relforcerowsecurity === true,
      ) &&
      verifyIndexerPolicyContract(catalog.policies);
    const targetOwnersMatchRestoreRole =
      catalog.tables.length === 2 &&
      catalog.tables.every((table) => table.owner === restoreRole);
    const targetRoleIsNonSuperuserNoBypass =
      catalog.role.length === 1 &&
      catalog.role[0]?.rolsuper === false &&
      catalog.role[0]?.rolbypassrls === false;
    const privateSocketVerified = catalog.socket[0]?.client_addr === null;
    requireCondition(
      rlsPoliciesVerified,
      "restored RLS settings or 0054 policies are invalid",
    );
    requireCondition(
      targetOwnersMatchRestoreRole,
      "restored table owners differ from restore role",
    );
    requireCondition(
      targetRoleIsNonSuperuserNoBypass,
      "restore role unexpectedly has superuser or BYPASSRLS privileges",
    );
    requireCondition(
      privateSocketVerified,
      "database connection did not use the private Unix socket",
    );

    console.log(
      JSON.stringify({
        status: "PASS",
        targetIsolated: true,
        privateSocketVerified,
        snapshotHeadTag: sourcePlan.snapshotHeadTag,
        targetHeadTag: finalPlan.snapshotHeadTag,
        repositoryHeadTag: journal.entries.at(-1)?.tag,
        appliedMigrationTags: journal.entries
          .slice(sourcePlan.appliedMigrationCount)
          .map((entry) => entry.tag),
        markerVerified,
        migrationHistoryVerified,
        constraintsVerified,
        semanticSnapshotMismatchRejected,
        applicationGrantMatrixVerified,
        applicationRoleLeastPrivilegeVerified,
        applicationRoleDefaultPrivilegesDenied,
        applicationRoleHasNoOwnership,
        snapshotPreflightVerified,
        corruptSnapshotAbortVerified,
        rlsPoliciesVerified,
        targetOwnersMatchRestoreRole,
        targetRoleIsNonSuperuserNoBypass,
        verificationDurationMs: Math.max(0, Date.now() - startedAt),
      }),
    );
  } finally {
    if (serverStarted) {
      await withSqlClient(
        maintenanceUrl,
        async (sql) => {
          if (semanticTargetCreated) {
            await sql.unsafe(
              `DROP DATABASE IF EXISTS "${semanticTargetDatabase}" WITH (FORCE)`,
            );
          }
          if (targetCreated) {
            await sql.unsafe(
              `DROP DATABASE IF EXISTS "${targetDatabase}" WITH (FORCE)`,
            );
          }
          if (sourceCreated) {
            await sql.unsafe(
              `DROP DATABASE IF EXISTS "${sourceDatabase}" WITH (FORCE)`,
            );
          }
          if (applicationRolesCreated) {
            await sql.unsafe(`DROP ROLE IF EXISTS "${restoreAdminRole}"`);
            await sql.unsafe(`DROP ROLE IF EXISTS "${applicationRole}"`);
          }
          if (roleCreated)
            await sql.unsafe(`DROP ROLE IF EXISTS "${restoreRole}"`);
        },
        directory,
        port,
      ).catch(() => undefined);
    }
    if (server !== undefined && server.exitCode === null) {
      server.kill("SIGTERM");
      await waitForExit(server, 15_000);
    }
    await rm(directory, { recursive: true, force: true });
  }
}

await main().catch((error) => {
  const causeMessage =
    typeof error?.cause?.message === "string"
      ? `; cause: ${error.cause.message}`
      : "";
  console.error(
    `restore migration drill failed: ${error.message}${causeMessage}`,
  );
  process.exitCode = 1;
});
