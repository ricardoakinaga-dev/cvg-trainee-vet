import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

async function findEmbeddedPostgresLib() {
  // pnpm isolates the native binaries, breaking their $ORIGIN rpath, so the
  // loader needs an explicit search path for libpq/libicu bundled alongside.
  const scope = join(root, "node_modules", ".pnpm");
  let entries = [];
  try {
    entries = await readdir(scope);
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.startsWith("@embedded-postgres+linux-x64@")) continue;
    const candidate = join(
      scope,
      entry,
      "node_modules",
      "@embedded-postgres",
      "linux-x64",
      "native",
      "lib",
    );
    try {
      const libs = await readdir(candidate);
      if (libs.includes("libpq.so.5")) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

const APP_ROLE = "cvg_rls_app";
const APP_PASSWORD = "cvg-rls-disposable-password";
const DATABASE = "cvg_rls_live";

function log(message) {
  console.log(`[rls-live] ${message}`);
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

async function repairNativeSymlinks() {
  // pnpm drops versioned .so symlinks inside the embedded-postgres native
  // tree (real files like libpq.so.5.18 survive). Recreate the soname links
  // the loader requests (libpq.so.5, libicuuc.so.60, ...) idempotently.
  const { readdir, symlink, lstat } = await import("node:fs/promises");
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

async function startEmbeddedPostgres() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const directory = await mkdtemp(join(tmpdir(), "cvg-rls-live-"));
  const port = 55440 + Math.floor(Math.random() * 500);
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
    instance,
    directory,
    maintenanceUrl: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`,
    dbUrl: (role, password) =>
      `postgresql://${role}:${password}@127.0.0.1:${port}/${DATABASE}`,
    async stop() {
      await instance.stop().catch(() => undefined);
      await rm(directory, { recursive: true, force: true });
    },
  };
}

async function migrate(databaseUrl) {
  await execFileAsync("pnpm", ["db:migrate"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    timeout: 240000,
    maxBuffer: 16 * 1024 * 1024,
  });
}

async function main() {
  const providedUrl = process.env.CVG_TEST_DATABASE_URL?.trim();
  const providedAdmin = process.env.CVG_TEST_ADMIN_DATABASE_URL?.trim();
  let stop = async () => undefined;
  let appUrl = providedUrl;
  let adminUrl = providedAdmin;

  if (appUrl === undefined || appUrl.length === 0) {
    log("no CVG_TEST_DATABASE_URL; booting disposable embedded PostgreSQL");
    const nativeLib =
      (await repairNativeSymlinks()) ?? (await findEmbeddedPostgresLib());
    if (nativeLib !== null) {
      process.env.LD_LIBRARY_PATH =
        nativeLib +
        (process.env.LD_LIBRARY_PATH === undefined ||
        process.env.LD_LIBRARY_PATH === ""
          ? ""
          : `:${process.env.LD_LIBRARY_PATH}`);
    }
    const embedded = await startEmbeddedPostgres();
    stop = embedded.stop;
    try {
      await sqlExec(
        embedded.maintenanceUrl,
        `CREATE ROLE "${APP_ROLE}" WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${APP_PASSWORD}'`,
      );
      await sqlExec(embedded.maintenanceUrl, `CREATE DATABASE "${DATABASE}"`);
      const superDbUrl = embedded.dbUrl("postgres", "postgres");
      await migrate(superDbUrl);
      for (const statement of [
        `GRANT CONNECT ON DATABASE "${DATABASE}" TO "${APP_ROLE}"`,
        `GRANT USAGE ON SCHEMA public TO "${APP_ROLE}"`,
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_ROLE}"`,
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${APP_ROLE}"`,
        // Local-only divergence, documented: CI grants EXECUTE per RLS
        // helper (see migration-governance static checks); the disposable
        // matrix needs every helper callable to exercise row policies.
        `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "${APP_ROLE}"`,
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${APP_ROLE}"`,
      ]) {
        await sqlExec(superDbUrl, statement);
      }
      appUrl = embedded.dbUrl(APP_ROLE, APP_PASSWORD);
      adminUrl = superDbUrl;
      log(`disposable database ready (${DATABASE})`);
    } catch (error) {
      await stop();
      throw error;
    }
  } else {
    log("using provided CVG_TEST_DATABASE_URL");
    if (adminUrl === undefined || adminUrl.length === 0) {
      throw new Error(
        "CVG_TEST_ADMIN_DATABASE_URL is required alongside CVG_TEST_DATABASE_URL",
      );
    }
  }

  const testFile =
    process.argv[2] ?? "tests/integration/rls-full-matrix.test.ts";
  log(`running ${testFile}`);
  try {
    const child = await execFileAsync(
      "pnpm",
      ["exec", "vitest", "run", "--project", "integration", testFile],
      {
        cwd: root,
        env: {
          ...process.env,
          CVG_TEST_DATABASE_URL: appUrl,
          CVG_TEST_ADMIN_DATABASE_URL: adminUrl,
          CVG_RUN_LIVE_DB_TESTS: "true",
        },
        timeout: 600000,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    process.stdout.write(child.stdout ?? "");
  } catch (error) {
    process.stdout.write(error.stdout ?? "");
    process.stderr.write(error.stderr ?? "");
    await stop();
    process.exit(typeof error.code === "number" ? error.code : 1);
  }
  await stop();
  log("disposable database stopped and removed");
}

await main();
