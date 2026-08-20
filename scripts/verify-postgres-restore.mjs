import { Buffer } from "node:buffer";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { URL } from "node:url";

import { verifyBackupArtifact } from "./backup-artifact.mjs";
import { buildDockerExecCommand } from "./postgres-command.mjs";
import {
  createRestoreResult,
  createRestoreTarget,
  parseRestoreInvariantResult,
  parseStoredRestorePaths,
} from "./verify-postgres-restore-support.mjs";

const sourceUrl =
  process.env.CVG_RESTORE_SOURCE_DATABASE_URL ??
  process.env.CVG_TEST_DATABASE_URL;
const dockerContainer =
  process.env.CVG_RESTORE_DOCKER_CONTAINER?.trim() || undefined;
let currentStage = "parse-source";

function fail() {
  console.error(
    JSON.stringify({
      status: "FAIL",
      code: "restore_verification_failed",
      stage: currentStage,
    }),
  );
  process.exit(1);
}

function parseConnection(value) {
  if (value === undefined) throw new Error("source database is required");
  const url = new URL(value);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("source database must be PostgreSQL");
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  const user = decodeURIComponent(url.username);
  if (!/^[A-Za-z0-9_-]+$/u.test(database) || user.length === 0) {
    throw new Error("source database identifier is invalid");
  }
  return Object.freeze({
    host: url.hostname,
    port: url.port || "5432",
    user,
    password: decodeURIComponent(url.password),
    database,
  });
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function commandFor(program, args, input = false) {
  if (dockerContainer === undefined) {
    return Object.freeze({ program, args });
  }
  return buildDockerExecCommand({
    container: dockerContainer,
    program,
    args,
    interactive: input,
  });
}

function connectionArgs(connection, database = connection.database) {
  if (dockerContainer !== undefined) {
    return ["-U", connection.user, "-d", database];
  }
  return [
    "-h",
    connection.host,
    "-p",
    connection.port,
    "-U",
    connection.user,
    "-d",
    database,
  ];
}

function administrativeConnectionArgs(connection) {
  if (dockerContainer !== undefined) {
    return ["-U", connection.user];
  }
  return ["-h", connection.host, "-p", connection.port, "-U", connection.user];
}

function commandEnvironment(connection) {
  return {
    ...process.env,
    ...(connection.password.length > 0
      ? { PGPASSWORD: connection.password }
      : {}),
  };
}

async function runCommand(command, options = {}) {
  const child = spawn(command.program, command.args, {
    env: options.env,
    stdio: ["pipe", "pipe", "ignore"],
  });
  const output = [];
  const outputStream =
    options.stdoutFile === undefined
      ? null
      : createWriteStream(options.stdoutFile, { mode: 0o600 });

  const stdoutPromise =
    outputStream === null
      ? new Promise((resolve, reject) => {
          child.stdout.on("data", (chunk) => output.push(chunk));
          child.stdout.on("error", reject);
          child.stdout.on("end", () =>
            resolve(Buffer.concat(output).toString("utf8")),
          );
        })
      : pipeline(child.stdout, outputStream).then(() => "");

  const stdinPromise =
    options.stdinFile === undefined
      ? (child.stdin.end(), Promise.resolve())
      : pipeline(createReadStream(options.stdinFile), child.stdin);

  const exitPromise = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });

  const [stdout, code] = await Promise.all([stdoutPromise, exitPromise]);
  await stdinPromise;
  return Object.freeze({ code, stdout });
}

async function checked(command, connection, options = {}) {
  const result = await runCommand(command, {
    ...options,
    env: commandEnvironment(connection),
  });
  if (result.code !== 0) throw new Error("restore command failed");
  return result.stdout.trim();
}

async function loadStoredArtifact(storedPaths) {
  if (storedPaths === undefined) return undefined;
  currentStage = "verify-backup-artifact";
  return verifyBackupArtifact(storedPaths);
}

async function createSyntheticMarker(connection, target) {
  currentStage = "create-marker";
  await checked(
    commandFor("psql", [
      ...connectionArgs(connection),
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `create table ${target.quotedMarkerTable} (marker text primary key); insert into ${target.quotedMarkerTable} (marker) values (${quoteLiteral(target.markerValue)});`,
    ]),
    connection,
  );
  return true;
}

async function createSyntheticBackup(connection, dumpPath) {
  currentStage = "backup";
  const dump = await runCommand(
    commandFor("pg_dump", [
      ...connectionArgs(connection),
      "--format=custom",
      "--no-owner",
      "--no-privileges",
    ]),
    { env: commandEnvironment(connection), stdoutFile: dumpPath },
  );
  if (dump.code !== 0) throw new Error("backup command failed");
}

async function createTargetDatabase(connection, targetDatabase) {
  currentStage = "create-target";
  const result = await runCommand(
    commandFor("createdb", [
      ...administrativeConnectionArgs(connection),
      targetDatabase,
    ]),
    { env: commandEnvironment(connection) },
  );
  if (result.code !== 0) throw new Error("target database creation failed");
  return true;
}

async function restoreDump(connection, targetDatabase, dumpPath) {
  currentStage = "restore";
  const result = await runCommand(
    commandFor(
      "pg_restore",
      [
        ...connectionArgs(connection, targetDatabase),
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
      ],
      true,
    ),
    { env: commandEnvironment(connection), stdinFile: dumpPath },
  );
  if (result.code !== 0) throw new Error("restore command failed");
}

async function verifySyntheticMarker(connection, target, targetDatabase) {
  currentStage = "verify-marker";
  const markerCount = await checked(
    commandFor("psql", [
      ...connectionArgs(connection, targetDatabase),
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `select count(*) from ${target.quotedMarkerTable} where marker = ${quoteLiteral(target.markerValue)};`,
    ]),
    connection,
  );
  if (markerCount !== "1") throw new Error("synthetic marker was not restored");
  return true;
}

async function verifyRestoredInvariants(connection, targetDatabase) {
  currentStage = "verify-restored-invariants";
  const result = await checked(
    commandFor("psql", [
      ...connectionArgs(connection, targetDatabase),
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `select
        exists (select 1 from pg_catalog.pg_class where relname = 'audit_entries' and relrowsecurity and relforcerowsecurity),
        exists (select 1 from pg_catalog.pg_policy where polname = 'audit_entries_insert_with_context'),
        exists (select 1 from pg_catalog.pg_policy where polname = 'audit_entries_select_with_context'),
        exists (select 1 from pg_catalog.pg_trigger as tg join pg_catalog.pg_class as relation on relation.oid = tg.tgrelid where relation.relname = 'audit_entries' and tg.tgname = 'audit_entries_append_only' and not tg.tgisinternal),
        exists (select 1 from pg_catalog.pg_class where relname = 'attempts' and relrowsecurity and relforcerowsecurity),
        exists (select 1 from pg_catalog.pg_class where relname = 'answers' and relrowsecurity and relforcerowsecurity),
        exists (select 1 from pg_catalog.pg_class where relname = 'attempt_idempotency' and relrowsecurity and relforcerowsecurity),
        exists (select 1 from pg_catalog.pg_class where relname = 'answer_idempotency' and relrowsecurity and relforcerowsecurity),
        exists (select 1 from pg_catalog.pg_class as relation join pg_catalog.pg_index as idx on idx.indexrelid = relation.oid where relation.relname = 'attempts_open_participant_activity_idx' and idx.indisunique),
        exists (select 1 from pg_catalog.pg_class as relation join pg_catalog.pg_index as idx on idx.indexrelid = relation.oid where relation.relname = 'answers_attempt_item_idx' and idx.indisunique);`,
    ]),
    connection,
  );
  return parseRestoreInvariantResult(result);
}

async function verifyStoredArtifact(
  connection,
  targetDatabase,
  storedArtifact,
  rtoMs,
  invariantsVerified,
) {
  currentStage = "verify-restored-artifact";
  const restoredObjectCount = await checked(
    commandFor("psql", [
      ...connectionArgs(connection, targetDatabase),
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "select count(*) from pg_catalog.pg_class as relation inner join pg_catalog.pg_namespace as schema on schema.oid = relation.relnamespace where schema.nspname not in ('pg_catalog', 'information_schema') and relation.relkind in ('r', 'p', 'v', 'm', 'f', 'S');",
    ]),
    connection,
  );
  const restoredObjects = Number(restoredObjectCount);
  if (!Number.isSafeInteger(restoredObjects) || restoredObjects < 1) {
    throw new Error("stored backup restored no application objects");
  }
  return createRestoreResult({
    mode: "stored-artifact",
    backupId: storedArtifact.manifest.backupId,
    restoredObjects,
    invariantsVerified,
    rtoMs,
  });
}

async function verifyRestoredOutput(
  connection,
  target,
  targetDatabase,
  storedArtifact,
  startedAt,
) {
  const rtoMs = Math.max(0, Date.now() - startedAt);
  const invariants = await verifyRestoredInvariants(connection, targetDatabase);
  const invariantsVerified = Object.values(invariants).every(
    (value) => value === true,
  );
  return storedArtifact === undefined
    ? createRestoreResult({
        mode: "synthetic-marker",
        markerVerified: await verifySyntheticMarker(
          connection,
          target,
          targetDatabase,
        ),
        invariantsVerified,
        rtoMs,
      })
    : verifyStoredArtifact(
        connection,
        targetDatabase,
        storedArtifact,
        rtoMs,
        invariantsVerified,
      );
}

async function dropTargetDatabase(connection, targetDatabase, targetCreated) {
  if (!targetCreated) return;
  await runCommand(
    commandFor("dropdb", [
      ...administrativeConnectionArgs(connection),
      "--if-exists",
      targetDatabase,
    ]),
    { env: commandEnvironment(connection) },
  ).catch(() => undefined);
}

async function dropSyntheticMarker(connection, target, markerCreated) {
  if (!markerCreated) return;
  await runCommand(
    commandFor("psql", [
      ...connectionArgs(connection),
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `drop table if exists ${target.quotedMarkerTable};`,
    ]),
    { env: commandEnvironment(connection) },
  ).catch(() => undefined);
}

async function cleanupRestore(
  connection,
  target,
  temporaryDirectory,
  targetCreated,
  markerCreated,
) {
  await dropTargetDatabase(connection, target.targetDatabase, targetCreated);
  await dropSyntheticMarker(connection, target, markerCreated);
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function main() {
  const connection = parseConnection(sourceUrl);
  const storedPaths = parseStoredRestorePaths(process.env);
  const target = createRestoreTarget();
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "cvg-restore-"));
  let markerCreated = false;
  let targetCreated = false;

  try {
    const storedArtifact = await loadStoredArtifact(storedPaths);
    const startedAt = Date.now();
    const dumpPath =
      storedArtifact?.backupPath ?? join(temporaryDirectory, "database.dump");
    if (storedArtifact === undefined) {
      markerCreated = await createSyntheticMarker(connection, target);
      await createSyntheticBackup(connection, dumpPath);
    }
    targetCreated = await createTargetDatabase(
      connection,
      target.targetDatabase,
    );
    await restoreDump(connection, target.targetDatabase, dumpPath);
    console.log(
      JSON.stringify(
        await verifyRestoredOutput(
          connection,
          target,
          target.targetDatabase,
          storedArtifact,
          startedAt,
        ),
      ),
    );
  } finally {
    await cleanupRestore(
      connection,
      target,
      temporaryDirectory,
      targetCreated,
      markerCreated,
    );
  }
}

if (process.argv[1]?.endsWith("verify-postgres-restore.mjs")) {
  try {
    await main();
  } catch {
    fail();
  }
}
