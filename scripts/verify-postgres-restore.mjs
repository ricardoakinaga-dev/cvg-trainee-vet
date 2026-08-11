import { randomUUID } from "node:crypto";
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

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
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

async function main() {
  const connection = parseConnection(sourceUrl);
  const storedBackupPath = optionalEnvironmentValue("CVG_RESTORE_BACKUP_FILE");
  const storedManifestPath = optionalEnvironmentValue(
    "CVG_RESTORE_BACKUP_MANIFEST",
  );
  if ((storedBackupPath === undefined) !== (storedManifestPath === undefined)) {
    throw new Error(
      "CVG_RESTORE_BACKUP_FILE and CVG_RESTORE_BACKUP_MANIFEST must be provided together",
    );
  }
  const targetDatabase = `cvg_restore_${randomUUID().replaceAll("-", "")}`;
  const markerTable = `cvg_restore_marker_${randomUUID().replaceAll("-", "")}`;
  const markerValue = randomUUID();
  const quotedMarkerTable = quoteIdentifier(markerTable);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "cvg-restore-"));
  let markerCreated = false;
  let targetCreated = false;
  let storedArtifact;

  try {
    if (storedBackupPath !== undefined && storedManifestPath !== undefined) {
      currentStage = "verify-backup-artifact";
      storedArtifact = await verifyBackupArtifact({
        backupPath: storedBackupPath,
        manifestPath: storedManifestPath,
      });
    }

    const startedAt = Date.now();
    const dumpPath =
      storedArtifact?.backupPath ?? join(temporaryDirectory, "database.dump");
    if (storedArtifact === undefined) {
      currentStage = "create-marker";
      await checked(
        commandFor("psql", [
          ...connectionArgs(connection),
          "-v",
          "ON_ERROR_STOP=1",
          "-c",
          `create table ${quotedMarkerTable} (marker text primary key); insert into ${quotedMarkerTable} (marker) values (${quoteLiteral(markerValue)});`,
        ]),
        connection,
      );
      markerCreated = true;

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

    currentStage = "create-target";
    const createTarget = await runCommand(
      commandFor("createdb", [
        ...administrativeConnectionArgs(connection),
        targetDatabase,
      ]),
      { env: commandEnvironment(connection) },
    );
    if (createTarget.code !== 0)
      throw new Error("target database creation failed");
    targetCreated = true;

    currentStage = "restore";
    const restore = await runCommand(
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
    if (restore.code !== 0) throw new Error("restore command failed");

    if (storedArtifact === undefined) {
      currentStage = "verify-marker";
      const markerCount = await checked(
        commandFor("psql", [
          ...connectionArgs(connection, targetDatabase),
          "-At",
          "-v",
          "ON_ERROR_STOP=1",
          "-c",
          `select count(*) from ${quotedMarkerTable} where marker = ${quoteLiteral(markerValue)};`,
        ]),
        connection,
      );
      if (markerCount !== "1")
        throw new Error("synthetic marker was not restored");

      console.log(
        JSON.stringify({
          status: "PASS",
          markerVerified: true,
          artifactVerified: false,
          verificationMode: "synthetic-marker",
          targetIsolated: true,
          rtoMs: Math.max(0, Date.now() - startedAt),
        }),
      );
      return;
    }

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
    console.log(
      JSON.stringify({
        status: "PASS",
        markerVerified: false,
        artifactVerified: true,
        verificationMode: "stored-artifact",
        backupId: storedArtifact.manifest.backupId,
        restoredObjects,
        targetIsolated: true,
        rtoMs: Math.max(0, Date.now() - startedAt),
      }),
    );
  } finally {
    if (targetCreated) {
      await runCommand(
        commandFor("dropdb", [
          ...administrativeConnectionArgs(connection),
          "--if-exists",
          targetDatabase,
        ]),
        { env: commandEnvironment(connection) },
      ).catch(() => undefined);
    }
    if (markerCreated) {
      await runCommand(
        commandFor("psql", [
          ...connectionArgs(connection),
          "-v",
          "ON_ERROR_STOP=1",
          "-c",
          `drop table if exists ${quotedMarkerTable};`,
        ]),
        { env: commandEnvironment(connection) },
      ).catch(() => undefined);
    }
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function optionalEnvironmentValue(name) {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}

try {
  await main();
} catch {
  fail();
}
