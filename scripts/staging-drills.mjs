import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/* global fetch */

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

/**
 * @typedef {object} DrillContext
 * @property {string} evidenceDir
 * @property {string} appUrl
 * @property {string} superDatabaseUrl
 * @property {string} databaseName
 * @property {string} qdrantUrl
 * @property {string} collection
 * @property {Record<string, string | undefined>} workerEnv
 * @property {() => Promise<void>} restartWorker
 * @property {() => Promise<void>} stopWriters
 * @property {() => Promise<void>} startWriters
 * @property {{ bin: string; dataDir: string } | null} pgCtl
 * @property {() => Promise<void>} stopCollector
 * @property {() => Promise<void>} startCollector
 */

async function recordEvidence(evidenceDir, name, payload) {
  await writeFile(
    join(evidenceDir, name),
    `${JSON.stringify({ name, ...payload }, null, 2)}\n`,
  );
}

async function qdrantPoints(qdrantUrl, collection) {
  const response = await fetch(
    `${qdrantUrl}/collections/${collection}/points/count`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ exact: true }),
    },
  );
  if (response.status === 404) return -1;
  if (!response.ok) {
    throw new Error(`qdrant count failed with ${response.status}`);
  }
  const payload = await response.json();
  return payload.result?.count ?? -1;
}

async function runReconcile(workerEnv) {
  const child = await execFileAsync(
    "pnpm",
    ["--dir", "apps/worker", "reconcile:qdrant"],
    {
      cwd: root,
      env: { ...process.env, ...workerEnv, CVG_WORKER_AUTOSTART: "false" },
      timeout: 240000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return child.stdout ?? "";
}

export async function drillReconcile(context) {
  const started = Date.now();
  const output = await runReconcile(context.workerEnv);
  const points = await qdrantPoints(context.qdrantUrl, context.collection);
  if (points <= 0) {
    throw new Error(
      `expected indexed points after reconcile, got ${points}. output: ${output.slice(-500)}`,
    );
  }
  await recordEvidence(context.evidenceDir, "drill-reconcile.json", {
    status: "PASS",
    points,
    durationMs: Date.now() - started,
  });
}

export async function drillQdrantLoss(context) {
  const started = Date.now();
  const before = await qdrantPoints(context.qdrantUrl, context.collection);
  if (before <= 0) throw new Error("reconcile drill must run first");
  const deleted = await fetch(
    `${context.qdrantUrl}/collections/${context.collection}`,
    { method: "DELETE" },
  );
  if (!deleted.ok)
    throw new Error(`collection delete failed: ${deleted.status}`);
  if ((await qdrantPoints(context.qdrantUrl, context.collection)) !== -1) {
    throw new Error("collection still present after delete");
  }
  await runReconcile(context.workerEnv);
  const after = await qdrantPoints(context.qdrantUrl, context.collection);
  if (after !== before) {
    throw new Error(`rebuild mismatch: before=${before} after=${after}`);
  }
  await recordEvidence(context.evidenceDir, "drill-qdrant-loss.json", {
    status: "PASS",
    pointsBefore: before,
    pointsAfter: after,
    durationMs: Date.now() - started,
  });
}

async function withAdmin(superDatabaseUrl, work) {
  const { createRequire } = await import("node:module");
  const require = createRequire(
    join(root, "packages/persistence/package.json"),
  );
  const postgres = require("postgres");
  const admin = postgres(superDatabaseUrl, { max: 1 });
  try {
    return await work(admin);
  } finally {
    await admin.end();
  }
}

async function tableCounts(superDatabaseUrl) {
  return withAdmin(superDatabaseUrl, async (admin) => {
    const rows = await admin.unsafe(
      "select 'attempts' as t, count(*)::int as c from attempts union all select 'sessions', count(*)::int from sessions",
    );
    return Object.fromEntries(rows.map((row) => [row.t, row.c]));
  });
}

export async function drillBackupRestore(context) {
  const started = Date.now();
  // Maintenance window: every writer stopped so TEMPLATE copy is consistent
  // (PostgreSQL refuses to clone a database with open sessions, including
  // our own counting connections — each admin session is opened and closed
  // around its statement).
  await context.stopWriters();
  const before = await tableCounts(context.superDatabaseUrl);
  // DDL on the database itself must run from the maintenance database.
  const maintenanceUrl = context.superDatabaseUrl.replace(
    /\/[^/]*$/,
    "/postgres",
  );
  await withAdmin(maintenanceUrl, async (admin) => {
    // Straggler sessions from SIGTERM'd pools linger server-side until TCP
    // teardown is noticed; the maintenance window force-disconnects them.
    await admin.unsafe(
      `SELECT pg_terminate_backend("pid") FROM "pg_stat_activity" WHERE "datname" = '${context.databaseName}' AND "pid" <> pg_backend_pid()`,
    );
    await admin.unsafe(
      `CREATE DATABASE "cvg_staging_backup" TEMPLATE "${context.databaseName}"`,
    );
    await admin.unsafe(`DROP DATABASE "${context.databaseName}"`);
    await admin.unsafe(
      `CREATE DATABASE "${context.databaseName}" TEMPLATE "cvg_staging_backup"`,
    );
    await admin.unsafe(`DROP DATABASE "cvg_staging_backup"`);
  });
  const restored = await tableCounts(context.superDatabaseUrl);
  for (const [table, count] of Object.entries(before)) {
    if (restored[table] !== count) {
      throw new Error(
        `restore mismatch on ${table}: before=${count} after=${restored[table]}`,
      );
    }
  }
  // Writers back: readiness proves the restored database serves traffic.
  await context.startWriters();
  const ready = await fetch(`${context.appUrl}/health/ready`);
  if (!ready.ok) throw new Error("restored stack is not ready");
  const after = await tableCounts(context.superDatabaseUrl);
  await recordEvidence(context.evidenceDir, "drill-backup-restore.json", {
    status: "PASS",
    counts: after,
    rtoMs: Date.now() - started,
  });
}

export async function drillFailover(context) {
  const started = Date.now();
  const checks = {};
  // Worker restart: reconcile still succeeds afterwards.
  await context.restartWorker();
  await runReconcile(context.workerEnv);
  checks.worker = "restarted+reconciled";
  // API restart: readiness returns on both replicas.
  await context.stopWriters();
  await context.startWriters();
  const ready = await fetch(`${context.appUrl}/health/ready`);
  if (!ready.ok) throw new Error("api pair did not recover");
  checks.api = "restarted+ready";
  // Qdrant restart is environment-managed; assert liveness + intact index.
  const qdrantReady = await fetch(`${context.qdrantUrl}/readyz`);
  if (!qdrantReady.ok) throw new Error("qdrant not ready");
  const points = await qdrantPoints(context.qdrantUrl, context.collection);
  if (points < 0) throw new Error("qdrant index missing after checks");
  checks.qdrant = `ready+${points}-points`;
  // PostgreSQL restart via pg_ctl when the runner exposes the binary.
  if (context.pgCtl === null) {
    checks.postgres = "skipped: no pg_ctl exposed by this environment";
  } else {
    const { execFile: execPgCtl } = await import("node:child_process");
    const run = promisify(execPgCtl);
    await run(context.pgCtl.bin, [
      "-D",
      context.pgCtl.dataDir,
      "-l",
      join(context.pgCtl.dataDir, "restart.log"),
      "-w",
      "-t",
      "120",
      "restart",
    ]);
    const readyAfter = await fetch(`${context.appUrl}/health/ready`);
    if (!readyAfter.ok) throw new Error("api did not recover after pg restart");
    checks.postgres = "restarted+ready";
  }
  await recordEvidence(context.evidenceDir, "drill-failover.json", {
    status: "PASS",
    checks,
    durationMs: Date.now() - started,
  });
}

export async function drillOtelOutage(context) {
  const started = Date.now();
  await context.stopCollector();
  try {
    // Traffic must keep flowing while telemetry is down (bounded flush).
    for (let index = 0; index < 5; index += 1) {
      const response = await fetch(`${context.appUrl}/health/live`);
      if (!response.ok) throw new Error("traffic failed during otel outage");
    }
  } finally {
    await context.startCollector();
  }
  const response = await fetch(`${context.appUrl}/health/live`);
  if (!response.ok) throw new Error("traffic failed after collector restart");
  await recordEvidence(context.evidenceDir, "drill-otel-outage.json", {
    status: "PASS",
    durationMs: Date.now() - started,
  });
}
