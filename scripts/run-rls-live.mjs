import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { ephemeralPort, startEmbeddedPostgres } from "./live-embedded-pg.mjs";
import {
  executionIdentity,
  selectedAssertionInventory,
  RLS_SUITE,
} from "./ci-proof-contract.mjs";
import { isEvidenceFresh } from "./evidence-freshness.mjs";
import { composeRlsExecutionEvidence } from "./rls-execution-evidence.mjs";

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

/** @typedef {import('./ci-proof-contract.mjs').AssertionIdentity} AssertionIdentity */
/** @typedef {{clock: ()=>string, head:(root:string)=>Promise<string>, fresh:(root:string,sha:string)=>Promise<{fresh:boolean,detail:string}>, collect:(root:string,environment:Record<string,string|undefined>)=>Promise<AssertionIdentity[]>, temp:()=>Promise<string>, mkdir:(path:string)=>Promise<void>, remove:(path:string)=>Promise<void>, run:(report:string,root:string,environment:Record<string,string|undefined>)=>Promise<unknown>, read:(path:string)=>Promise<Uint8Array>, write:(path:string,bytes:Uint8Array)=>Promise<void>}} RlsIo */
/** @type {RlsIo} */
const measuredIo = {
  clock: () => new Date().toISOString(),
  head: async (checkoutRoot) =>
    (
      await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: checkoutRoot })
    ).stdout.trim(),
  fresh: (checkoutRoot, sha) => isEvidenceFresh(checkoutRoot, sha, sha),
  collect: (checkoutRoot, environment) =>
    selectedAssertionInventory(checkoutRoot, {
      filters: [RLS_SUITE],
      environment,
    }),
  temp: () => mkdtemp(join(tmpdir(), "cvg-rls-")),
  mkdir: async (path) => {
    await mkdir(path, { recursive: true });
  },
  remove: (path) => rm(path, { recursive: true, force: true }),
  run: (report, checkoutRoot, environment) =>
    execFileAsync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--project",
        "integration",
        "--reporter=json",
        `--outputFile=${report}`,
        RLS_SUITE,
      ],
      {
        cwd: checkoutRoot,
        env: environment,
        timeout: 600000,
        maxBuffer: 64 * 1024 * 1024,
      },
    ),
  read: (path) => readFile(path),
  write: (path, bytes) => writeFile(path, bytes),
};

/**
 * @param {{checkoutRoot?:string,environment?:Record<string,string|undefined>,syntheticFixture?:boolean,evidenceDirectory?:string,testFile?:string}} options
 * @param {Partial<RlsIo>} dependencies Explicit IO doubles in tests; default executes the actual runner.
 */
export async function runMeasuredRlsExecution(options = {}, dependencies = {}) {
  if (options.testFile !== undefined && options.testFile !== RLS_SUITE)
    throw new Error("RLS evidence requires the exact full matrix suite");
  const io = { ...measuredIo, ...dependencies };
  const checkoutRoot = options.checkoutRoot ?? root;
  const environment = options.environment ?? process.env;
  const runStartedAt = io.clock();
  const evidenceKind = environment.GITHUB_ACTIONS === "true" ? "ci" : "local";
  const ci = evidenceKind === "ci" ? executionIdentity(environment) : undefined;
  const sha = await io.head(checkoutRoot);
  if (ci && ci.executing_head !== sha)
    throw new Error("RLS producing CI SHA differs from measured checkout");
  const before = await io.fresh(checkoutRoot, sha);
  if (!before.fresh)
    throw new Error(`RLS checkout before execution invalid: ${before.detail}`);
  const beforeCheckedAt = io.clock();
  const evidenceDir =
    options.evidenceDirectory ?? join(checkoutRoot, "staging-evidence");
  const reportDir = await io.temp();
  try {
    await io.mkdir(evidenceDir);
    // A failed run must not leave an earlier PASS available for publication.
    await io.remove(join(evidenceDir, "rls-live-summary.json"));
    const selectionStartedAt = io.clock();
    const assertions = await io.collect(checkoutRoot, environment);
    const collectedAt = io.clock();
    const selection = {
      files: [RLS_SUITE],
      assertions,
      sha,
      checkoutRoot,
      startedAt: selectionStartedAt,
      collectedAt,
      ...(ci ? { ci } : {}),
    };
    // Preserve the independent collection even if execution or validation fails.
    await io.write(
      join(evidenceDir, "rls-inventory.json"),
      Buffer.from(
        `${JSON.stringify({ files: selection.files, assertions, collection: { sha, checkoutRoot, startedAt: selectionStartedAt, collectedAt, ...(ci ? { ci } : {}) } }, null, 2)}\n`,
      ),
    );
    const reportFile = join(reportDir, "results.json");
    const startedAt = io.clock();
    let exitCode = 0;
    try {
      await io.run(reportFile, checkoutRoot, environment);
    } catch (error) {
      exitCode =
        Number.isSafeInteger(error.code) && error.code > 0 ? error.code : 1;
    }
    const completedAt = io.clock();
    const raw = await io.read(reportFile);
    await io.write(join(evidenceDir, "rls-results.raw.json"), raw);
    const after = await io.fresh(checkoutRoot, sha);
    const afterSha = await io.head(checkoutRoot);
    const afterCheckedAt = io.clock();
    const result = composeRlsExecutionEvidence({
      evidenceKind,
      syntheticFixture: options.syntheticFixture === true,
      rawReportBytes: raw,
      selection,
      execution: {
        status: "EXECUTED",
        exitCode,
        startedAt,
        completedAt,
        checkoutRoot,
        ...(ci ? { ci } : {}),
      },
      checkout: {
        before: { sha, checkedAt: beforeCheckedAt, clean: before.fresh },
        after: { sha: afterSha, checkedAt: afterCheckedAt, clean: after.fresh },
      },
      runWindow: { startedAt: runStartedAt, observedAt: io.clock() },
      environment,
    });
    for (const [name, bytes] of Object.entries(result.files))
      await io.write(join(evidenceDir, name), bytes);
    return result.summary;
  } finally {
    await io.remove(reportDir);
  }
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

  try {
    const summary = await runMeasuredRlsExecution({
      testFile: process.argv[2] ?? RLS_SUITE,
      environment: {
        ...process.env,
        CVG_TEST_DATABASE_URL: appUrl,
        CVG_TEST_ADMIN_DATABASE_URL: adminUrl,
        CVG_RUN_LIVE_DB_TESTS: "true",
      },
    });
    log(
      `measured ${summary.executedTests} passed assertions (${summary.status}); raw evidence retained`,
    );
  } finally {
    await stop();
    log("disposable database stopped and removed");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  await main().catch((error) => {
    console.error(`RLS run failed: ${error.message}`);
    process.exitCode = 1;
  });
