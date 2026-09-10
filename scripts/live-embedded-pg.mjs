import { readdir, symlink, lstat, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/* global setTimeout */

const root = join(fileURLToPath(import.meta.url), "..", "..");

export async function repairEmbeddedPostgresSymlinks() {
  // pnpm drops versioned .so symlinks inside the embedded-postgres native
  // tree (real files like libpq.so.5.18 survive). Recreate the soname links
  // the loader requests (libpq.so.5, libicuuc.so.60, ...) idempotently.
  const scope = join(root, "node_modules", ".pnpm");
  let entries = [];
  try {
    entries = await readdir(scope);
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.startsWith("@embedded-postgres+linux-x64@")) continue;
    const lib = join(
      scope,
      entry,
      "node_modules",
      "@embedded-postgres",
      "linux-x64",
      "native",
      "lib",
    );
    let files = [];
    try {
      files = await readdir(lib);
    } catch {
      continue;
    }
    for (const file of files) {
      const match = /^(lib.*\.so)\.(\d+)\.[\d.]+$/u.exec(file);
      if (match === null) continue;
      const link = join(lib, `${match[1]}.${match[2]}`);
      try {
        await lstat(link);
      } catch {
        await symlink(join(lib, file), link);
      }
    }
    return lib;
  }
  return null;
}

export async function startEmbeddedPostgres(port) {
  const nativeLib = await repairEmbeddedPostgresSymlinks();
  if (nativeLib !== null) {
    process.env.LD_LIBRARY_PATH =
      nativeLib +
      (process.env.LD_LIBRARY_PATH === undefined ||
      process.env.LD_LIBRARY_PATH === ""
        ? ""
        : `:${process.env.LD_LIBRARY_PATH}`);
  }
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const directory = await mkdtemp(join(tmpdir(), "cvg-live-pg-"));
  const instance = new EmbeddedPostgres({
    databaseDir: join(directory, "data"),
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
  });
  await instance.initialise();
  await instance.start();
  return {
    directory,
    maintenanceUrl: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`,
    dbUrl: (role, password, database = "postgres") =>
      `postgresql://${role}:${password}@127.0.0.1:${port}/${database}`,
    async stop() {
      // pg_ctl stop (smart) waits for lingering sessions from SIGTERM'd
      // pools, so terminate backends first; bounded with SIGKILL fallback.
      try {
        const { createRequire } = await import("node:module");
        const require = createRequire(
          join(root, "packages/persistence/package.json"),
        );
        const postgres = require("postgres");
        const admin = postgres(
          `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`,
          { max: 1, connect_timeout: 5 },
        );
        try {
          await admin.unsafe(
            `SELECT pg_terminate_backend("pid") FROM "pg_stat_activity" WHERE "pid" <> pg_backend_pid()`,
          );
        } catch {
          // server may already be gone
        }
        await admin.end();
      } catch {
        // best effort; fall through to pg_ctl
      }
      await Promise.race([
        instance.stop().catch(() => undefined),
        // Ref'd on purpose: the race must always settle so teardown logs.
        new Promise((resolve) => {
          setTimeout(() => resolve("timeout"), 20000);
        }),
      ]);
      await rm(directory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    },
  };
}

export function ephemeralPort(from = 55440, span = 500) {
  return from + Math.floor(Math.random() * span);
}
