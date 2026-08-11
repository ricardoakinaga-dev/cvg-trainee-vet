import { randomUUID, createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { basename, isAbsolute, relative, resolve } from "node:path";
import { URL } from "node:url";

const sourceUrl =
  process.env.CVG_BACKUP_SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const destination = process.env.CVG_BACKUP_DIRECTORY;
if (sourceUrl === undefined)
  throw new Error("backup source database is required");
if (destination === undefined || destination.trim() === "") {
  throw new Error(
    "CVG_BACKUP_DIRECTORY is required and must be external to the repository",
  );
}

const connection = parseConnection(sourceUrl);
const destinationPath = resolve(destination);
const workspacePath = resolve(process.cwd());
const relativeDestination = relative(workspacePath, destinationPath);
if (
  !isAbsolute(destination) &&
  !relativeDestination.startsWith("..") &&
  relativeDestination !== ".."
) {
  throw new Error("backup destination must not be inside the repository");
}

await mkdir(destinationPath, { recursive: true, mode: 0o700 });
const backupId = `cvg-backup-${new Date()
  .toISOString()
  .replace(/[^0-9]/gu, "")
  .slice(0, 14)}-${randomUUID().slice(0, 8)}`;
const backupPath = resolve(destinationPath, `${backupId}.dump`);
const manifestPath = resolve(destinationPath, `${backupId}.json`);
const command = commandFor(connection);
const startedAt = Date.now();
const child = spawn(command.program, command.args, {
  env: {
    ...process.env,
    ...(connection.password.length > 0
      ? { PGPASSWORD: connection.password }
      : {}),
  },
  stdio: ["ignore", "pipe", "ignore"],
});
const output = pipeline(
  child.stdout,
  createWriteStream(backupPath, { mode: 0o600 }),
);
const exitCode = await new Promise((resolveExit, reject) => {
  child.once("error", reject);
  child.once("close", (code) => resolveExit(code ?? 1));
});
await output;
if (exitCode !== 0) throw new Error("pg_dump failed");

const fileStats = await stat(backupPath);
const sha256 = await hashFile(backupPath);
const manifest = {
  backupId,
  database: connection.database,
  file: basename(backupPath),
  sha256,
  bytes: fileStats.size,
  createdAt: new Date().toISOString(),
  durationMs: Math.max(0, Date.now() - startedAt),
  format: "custom",
  rpoTarget: "PT1H",
  restoreVerifier: "scripts/verify-postgres-restore.mjs",
};
await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});

console.log(
  JSON.stringify({
    status: "PASS",
    backupId,
    file: basename(backupPath),
    manifest: basename(manifestPath),
    bytes: fileStats.size,
    sha256,
    rpoTarget: "PT1H",
    durationMs: manifest.durationMs,
  }),
);

function parseConnection(value) {
  const url = new URL(value);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("backup source must be PostgreSQL");
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  const user = decodeURIComponent(url.username);
  if (!/^[A-Za-z0-9_-]+$/u.test(database) || !/^[A-Za-z0-9_-]+$/u.test(user)) {
    throw new Error("backup database or user identifier is invalid");
  }
  return {
    host: url.hostname,
    port: url.port || "5432",
    user,
    password: decodeURIComponent(url.password),
    database,
  };
}

function commandFor(value) {
  const container = process.env.CVG_BACKUP_DOCKER_CONTAINER?.trim();
  if (container !== undefined && !/^[A-Za-z0-9_.-]+$/u.test(container)) {
    throw new Error("backup Docker container identifier is invalid");
  }
  const args = [
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    ...(container !== undefined && container.length > 0
      ? []
      : ["-h", value.host, "-p", value.port]),
    "-U",
    value.user,
    "-d",
    value.database,
  ];
  if (container !== undefined && container.length > 0) {
    return {
      program: "docker",
      args: ["exec", "-e", "PGPASSWORD", container, "pg_dump", ...args],
    };
  }
  return { program: "pg_dump", args };
}

async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
