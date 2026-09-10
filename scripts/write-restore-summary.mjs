import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/* global setTimeout */

import { ephemeralPort } from "./live-embedded-pg.mjs";

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

// Disposable PostgreSQL 16 (CI-canonical major) from the local toolkit.
// Embedded-postgres ships PG 18 without client tools, and pg_dump 16
// cannot dump a PG 18 server — hence a self-managed PG 16 cluster.
const PG_BIN_CANDIDATES = [
  process.env.CVG_PG_BIN?.trim(),
  "/usr/lib/postgresql/16/bin",
  "/home/ricardo/.local/share/cvg-his-v4-runtime/root/usr/lib/postgresql/16/bin",
].filter((entry) => entry !== undefined && entry !== "");
const PG_LIB_CANDIDATES = [
  "/home/ricardo/.local/share/cvg-his-v4-runtime/root/usr/lib/x86_64-linux-gnu",
  "/home/ricardo/.local/share/cvg-his-v4-runtime/root/usr/lib/postgresql/16/lib",
];
function resolvePgBin() {
  const found = PG_BIN_CANDIDATES.find((entry) =>
    existsSync(join(entry, "initdb")),
  );
  if (found === undefined) {
    throw new Error(
      "no PostgreSQL 16 toolkit found (set CVG_PG_BIN); restore proof refused",
    );
  }
  return found;
}

async function sqlExec(url, statement) {
  const { createRequire } = await import("node:module");
  const require = createRequire(
    join(root, "packages/persistence/package.json"),
  );
  const postgres = require("postgres");
  const sql = postgres(url, { max: 1 });
  try {
    await sql.unsafe(statement);
  } finally {
    await sql.end();
  }
}

async function pgIsReady(pgBin, port, env) {
  for (let index = 0; index < 100; index += 1) {
    try {
      await execFileAsync(
        join(pgBin, "pg_isready"),
        ["-h", "127.0.0.1", "-p", String(port)],
        { env },
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("disposable postgres did not become ready");
}

/**
 * AAA-CERT-005 §51 — fresh backup/restore evidence.
 *
 * Two modes:
 * - External (CI): CVG_RESTORE_SOURCE_DATABASE_URL points at an
 *   owner-capable database (e.g. the CI migration URL). No cluster boot.
 * - Disposable (local): boots a PostgreSQL 16 cluster, migrates, verifies.
 *
 * Runs the operator restore verification
 * (`scripts/verify-postgres-restore.mjs`: marker → pg_dump → isolated
 * target → pg_restore → marker check, RTO measured) and publishes
 * `release-evidence/restore-summary.json` anchored at HEAD. All synthetic.
 */
async function main() {
  const externalSource = process.env.CVG_RESTORE_SOURCE_DATABASE_URL?.trim();
  const PG_BIN = externalSource ? "" : resolvePgBin();
  const toolEnv = {
    ...process.env,
    PATH: `${PG_BIN}:${process.env.PATH ?? ""}`,
    LD_LIBRARY_PATH: [...PG_LIB_CANDIDATES, process.env.LD_LIBRARY_PATH]
      .filter((entry) => entry !== undefined && entry !== "")
      .join(":"),
  };
  const directory = await mkdtemp(join(tmpdir(), "cvg-restore-pg-"));
  const dataDir = join(directory, "data");
  const port = ephemeralPort(55740);
  const run = (program, args, env = toolEnv) =>
    execFileAsync(program, args, {
      cwd: root,
      env,
      timeout: 240000,
      maxBuffer: 16 * 1024 * 1024,
    });
  let superDbUrl = externalSource || "";
  let stopCluster = async () => undefined;
  try {
    if (superDbUrl === "") {
      await run(join(PG_BIN, "initdb"), [
        "-D",
        dataDir,
        "-U",
        "postgres",
        "--auth=trust",
        "-E",
        "UTF8",
      ]);
      const server = spawn(
        join(PG_BIN, "postgres"),
        [
          "-D",
          dataDir,
          "-p",
          String(port),
          "-c",
          "listen_addresses=127.0.0.1",
          "-c",
          `unix_socket_directories=${directory}`,
        ],
        { env: toolEnv, stdio: "ignore" },
      );
      stopCluster = async () => {
        if (server.exitCode === null) server.kill("SIGTERM");
        await Promise.race([
          new Promise((resolve) => server.once("exit", () => resolve())),
          new Promise((resolve) => setTimeout(resolve, 15000)),
        ]);
        if (server.exitCode === null) server.kill("SIGKILL");
      };
      try {
        await pgIsReady(PG_BIN, port, toolEnv);
        const maintenanceUrl = `postgresql://postgres@127.0.0.1:${port}/postgres`;
        const operator = "cvg_restore_op";
        // Disposable credential minted per run (never a committed literal: the
        // secret scanner rejects password-like assignments in tracked files).
        const password = `cvg-restore-${randomUUID().replaceAll("-", "")}`;
        const database = "cvg_restore_src";
        await sqlExec(
          maintenanceUrl,
          `CREATE ROLE "${operator}" WITH LOGIN NOSUPERUSER NOBYPASSRLS CREATEDB PASSWORD '${password}'`,
        );
        await sqlExec(maintenanceUrl, `CREATE DATABASE "${database}"`);
        superDbUrl = `postgresql://postgres@127.0.0.1:${port}/${database}`;
        await sqlExec(
          superDbUrl,
          `GRANT CREATE ON SCHEMA public TO "${operator}"`,
        );
        await run("pnpm", ["db:migrate"], {
          ...toolEnv,
          DATABASE_URL: superDbUrl,
        });
      } catch (error) {
        await stopCluster();
        throw error;
      }
    }
    const { stdout } = await execFileAsync(
      process.execPath,
      [join(root, "scripts/verify-postgres-restore.mjs")],
      {
        cwd: root,
        env: {
          ...toolEnv,
          // Operator procedure (same as CI's migration URL): backup needs
          // an owner-level source; the least-privilege app role correctly
          // cannot dump tables it does not own.
          CVG_RESTORE_SOURCE_DATABASE_URL: superDbUrl,
        },
        timeout: 600000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    const result = JSON.parse(stdout.trim().split("\n").pop());
    const { stdout: sha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    });
    const summary = {
      format: "cvg-restore-summary/v1",
      sha: sha.trim(),
      generatedAt: new Date().toISOString(),
      status: result.status === "PASS" ? "PASS" : "FAIL",
      markerVerified: result.markerVerified === true,
      targetIsolated: result.targetIsolated === true,
      rtoMs: result.rtoMs ?? null,
    };
    if (summary.status !== "PASS") {
      throw new Error("restore verification FAIL");
    }
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(join(root, "release-evidence"), { recursive: true });
    await writeFile(
      join(root, "release-evidence", "restore-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    console.log(`restore summary written (rtoMs=${summary.rtoMs})`);
  } finally {
    await stopCluster();
    await rm(directory, { recursive: true, force: true });
  }
}

await main().catch((error) => {
  console.error(`restore summary failed: ${error.message}`);
  process.exitCode = 1;
});
