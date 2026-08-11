import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { URL } from "node:url";

const sourceUrl =
  process.env.CVG_RESTORE_SOURCE_DATABASE_URL ??
  process.env.CVG_TEST_DATABASE_URL;
const dockerContainer = process.env.CVG_RESTORE_DOCKER_CONTAINER?.trim();
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
  if (!/^[A-Za-z0-9_.-]+$/u.test(dockerContainer)) {
    throw new Error("restore container identifier is invalid");
  }
  return Object.freeze({
    program: "docker",
    args: ["exec", ...(input ? ["-i"] : []), dockerContainer, program, ...args],
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
    ...(dockerContainer === undefined && connection.password.length > 0
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
  const targetDatabase = `cvg_restore_${randomUUID().replaceAll("-", "")}`;
  const markerTable = `cvg_restore_marker_${randomUUID().replaceAll("-", "")}`;
  const markerValue = randomUUID();
  const quotedMarkerTable = quoteIdentifier(markerTable);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "cvg-restore-"));
  const dumpPath = join(temporaryDirectory, "database.dump");
  let markerCreated = false;
  let targetCreated = false;

  try {
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
    const startedAt = Date.now();
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

try {
  await main();
} catch {
  fail();
}
