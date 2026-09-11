import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { ephemeralPort, startEmbeddedPostgres } from "./live-embedded-pg.mjs";

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

const APP_ROLE = "cvg_rls_app";
// Disposable credential minted per run (never a committed literal: the
// secret scanner rejects password-like assignments in tracked files).
const APP_PASSWORD = `cvg-rls-${randomUUID().replaceAll("-", "")}`;
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
    const embedded = await startEmbeddedPostgres(ephemeralPort());
    stop = embedded.stop;
    try {
      await sqlExec(
        embedded.maintenanceUrl,
        `CREATE ROLE "${APP_ROLE}" WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${APP_PASSWORD}'`,
      );
      await sqlExec(embedded.maintenanceUrl, `CREATE DATABASE "${DATABASE}"`);
      const superDbUrl = embedded.dbUrl("postgres", "postgres", DATABASE);
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
      appUrl = embedded.dbUrl(APP_ROLE, APP_PASSWORD, DATABASE);
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
  const { mkdtemp } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const reportDir = await mkdtemp(join(tmpdir(), "cvg-rls-"));
  const reportFile = join(reportDir, "results.json");
  try {
    const child = await execFileAsync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--project",
        "integration",
        "--reporter=json",
        `--outputFile=${reportFile}`,
        testFile,
      ],
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
  try {
    const { mkdir, readFile, writeFile } = await import("node:fs/promises");
    const evidenceDir = join(root, "staging-evidence");
    await mkdir(evidenceDir, { recursive: true });
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    }).catch(() => ({ stdout: "unknown" }));
    // §125.9: derive every invariant from named test outcomes in the JSON
    // report — never hand-typed. A missing/failed test yields false.
    let failed = 1;
    let results = [];
    try {
      const report = JSON.parse(await readFile(reportFile, "utf8"));
      failed = report.numFailedTests ?? 1;
      for (const suite of report.testResults ?? []) {
        for (const assertion of suite.assertionResults ?? []) {
          results.push({
            text: JSON.stringify(assertion),
            passed: assertion.status === "passed",
          });
        }
      }
    } catch {
      failed = 1;
      results = [];
    }
    const has = (fragment) =>
      results.some((entry) => entry.passed && entry.text.includes(fragment));
    const invariant = {
      cross_scope_read_denied: has(
        "denies participant A any read of participant B rows",
      ),
      cross_scope_write_denied: has(
        "denies participant writes outside their own identity",
      ),
      anonymous_denied: has("denies anonymous access to protected rows"),
      service_identity_constrained: has(
        "confines the content-indexer service identity to its contract",
      ),
      pool_context_isolated: has(
        "never leaks pooled RLS context across ten alternating checkouts",
      ),
      force_rls_verified: has(
        "audits owner, grants, RLS enforcement and least privilege live",
      ),
      bypassrls_absent: has(
        "audits owner, grants, RLS enforcement and least privilege live",
      ),
      superuser_absent: has(
        "audits owner, grants, RLS enforcement and least privilege live",
      ),
    };
    const allTrue = Object.values(invariant).every(Boolean) && failed === 0;
    await writeFile(
      join(evidenceDir, "rls-live-summary.json"),
      `${JSON.stringify(
        {
          format: "cvg-rls-live-summary/v1",
          status: allTrue ? "PASS" : "FAIL",
          sha: stdout.trim(),
          suite: testFile,
          failed,
          generatedAt: new Date().toISOString(),
          ...invariant,
        },
        null,
        2,
      )}\n`,
    );
  } catch {
    // evidence is best effort; the vitest result above is authoritative
  }
  await stop();
  log("disposable database stopped and removed");
}

await main();
