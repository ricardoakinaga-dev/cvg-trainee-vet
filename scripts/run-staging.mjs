import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/* global clearTimeout, fetch, URL */

import { ephemeralPort, startEmbeddedPostgres } from "./live-embedded-pg.mjs";
import {
  drillBackupRestore,
  drillFailover,
  drillOtelOutage,
  drillQdrantLoss,
  drillReconcile,
} from "./staging-drills.mjs";

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");
const APP_PASSWORD = `cvg-stg-${randomUUID().replaceAll("-", "")}`;
const APP_ROLE = "cvg_staging_app";
const DATABASE = "cvg_staging";

/* global setTimeout */

function log(message) {
  console.log(`[staging] ${message}`);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(
      `${name} is required (staging uses explicit endpoints, never silent defaults)`,
    );
  }
  return value;
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

async function waitForHttp(url, attempts = 150) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function waitForTcp(host, port, attempts = 50) {
  const net = await import("node:net");
  for (let index = 0; index < attempts; index += 1) {
    const open = await new Promise((resolve) => {
      const socket = net.connect({ host, port });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (open) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`timed out waiting for tcp ${host}:${port}`);
}

function spawnLogged(name, command, args, env, cwd = root) {
  log(`starting ${name}`);
  // Detached process groups: `pnpm start` wrappers spawn grandchildren
  // (sh + node) that must die with the parent — kill(-pid) takes the group.
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let output = "";
  child.stdout?.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    output += chunk.toString();
  });
  return {
    name,
    child,
    output: () => output,
    async stop(signal = "SIGTERM") {
      if (child.exitCode !== null || child.signalCode !== null) return;
      try {
        // Negative pid targets the whole group (pnpm/sh/node chains).
        process.kill(-child.pid, signal);
      } catch {
        try {
          child.kill(signal);
        } catch {
          return;
        }
      }
      await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(), 10000);
        timer.unref?.();
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
      if (child.exitCode === null && child.signalCode === null) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          // already gone
        }
      }
    },
  };
}

async function findRedisServer() {
  if (process.env.CVG_REDIS_SERVER_BIN?.trim()) {
    return process.env.CVG_REDIS_SERVER_BIN.trim();
  }
  try {
    const { stdout } = await execFileAsync("sh", [
      "-c",
      "command -v redis-server",
    ]);
    const found = stdout.trim().split("\n")[0]?.trim();
    return found === undefined || found === "" ? null : found;
  } catch {
    return null;
  }
}

async function findEmbeddedPostgresBinDir() {
  const scope = join(root, "node_modules", ".pnpm");
  let entries = [];
  try {
    entries = await readdir(scope);
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.startsWith("@embedded-postgres+linux-x64@")) continue;
    return join(
      scope,
      entry,
      "node_modules",
      "@embedded-postgres",
      "linux-x64",
      "native",
      "bin",
    );
  }
  return null;
}

async function main() {
  const mode = process.argv[2] ?? "verify";
  const withBrowser = process.argv.includes("--browser");
  const evidenceDir = join(root, "staging-evidence");
  await mkdir(evidenceDir, { recursive: true });

  const qdrantUrl = required("CVG_STAGING_QDRANT_URL");
  const otelBin = process.env.CVG_OTEL_COLLECTOR_BIN?.trim() || null;
  const otelEndpoint = process.env.CVG_STAGING_OTEL_ENDPOINT?.trim() || null;
  if (otelBin === null && otelEndpoint === null) {
    throw new Error(
      "set CVG_OTEL_COLLECTOR_BIN (managed collector) or CVG_STAGING_OTEL_ENDPOINT (external collector)",
    );
  }

  const extraProcs = [];
  const stopExtra = async () => {
    for (const proc of extraProcs.splice(0).reverse()) {
      try {
        await proc.stop("SIGKILL");
      } catch {
        // best effort teardown
      }
    }
  };

  // 1. PostgreSQL.
  let appUrl = process.env.CVG_STAGING_DATABASE_URL?.trim();
  let superUrl;
  let embeddedDir = null;
  let stopPg = async () => undefined;
  if (appUrl === undefined || appUrl.length === 0) {
    const embedded = await startEmbeddedPostgres(ephemeralPort(55540));
    embeddedDir = embedded.directory;
    await sqlExec(
      embedded.maintenanceUrl,
      `CREATE ROLE "${APP_ROLE}" WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${APP_PASSWORD}'`,
    );
    await sqlExec(embedded.maintenanceUrl, `CREATE DATABASE "${DATABASE}"`);
    superUrl = embedded.dbUrl("postgres", "postgres", DATABASE);
    await execFileAsync("pnpm", ["db:migrate"], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: superUrl },
      timeout: 240000,
      maxBuffer: 16 * 1024 * 1024,
    });
    for (const statement of [
      `GRANT CONNECT ON DATABASE "${DATABASE}" TO "${APP_ROLE}"`,
      `GRANT USAGE ON SCHEMA public TO "${APP_ROLE}"`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_ROLE}"`,
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${APP_ROLE}"`,
      `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "${APP_ROLE}"`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${APP_ROLE}"`,
    ]) {
      await sqlExec(superUrl, statement);
    }
    const port = new URL(superUrl).port;
    appUrl = `postgresql://${APP_ROLE}:${APP_PASSWORD}@127.0.0.1:${port}/${DATABASE}`;
    stopPg = embedded.stop;
    log(`disposable PostgreSQL ready (${DATABASE})`);
  } else {
    superUrl = process.env.CVG_STAGING_ADMIN_DATABASE_URL?.trim();
    if (superUrl === undefined || superUrl.length === 0) {
      throw new Error("CVG_STAGING_ADMIN_DATABASE_URL is required");
    }
    await execFileAsync("pnpm", ["db:migrate"], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: superUrl },
      timeout: 240000,
      maxBuffer: 16 * 1024 * 1024,
    });
  }

  // 2. Redis (always managed here: staging requires a real shared backend).
  const redisBin = await findRedisServer();
  if (redisBin === null) {
    throw new Error(
      "redis-server binary not found (set CVG_REDIS_SERVER_BIN); staging requires a real Redis",
    );
  }
  const redisPort = 6390 + Math.floor(Math.random() * 500);
  const redis = spawnLogged("redis", redisBin, [
    "--port",
    String(redisPort),
    "--bind",
    "127.0.0.1",
    "--save",
    "",
    "--appendonly",
    "no",
  ]);
  extraProcs.push(redis);
  await waitForTcp("127.0.0.1", redisPort);
  const redisUrl = `redis://127.0.0.1:${redisPort}`;
  log(`disposable Redis ready (${redisUrl})`);

  // 3. OTel collector (managed when a binary is provided). Reap stale
  // collectors from killed runs first: they all share the staging config
  // path and the default :8888 telemetry port.
  try {
    const { stdout } = await execFileAsync("sh", [
      "-c",
      "pgrep -af 'otelcol-contrib --config' || true",
    ]);
    for (const line of stdout.split("\n")) {
      if (line.includes("otelcol-staging.yaml")) {
        const pid = Number(line.split(/\s+/)[0]);
        if (Number.isSafeInteger(pid)) {
          try {
            process.kill(pid, "SIGKILL");
          } catch {
            // already gone
          }
        }
      }
    }
  } catch {
    // best effort reaping
  }
  let collectorEndpoint = otelEndpoint;
  let stopCollector = async () => undefined;
  let startCollector = async () => undefined;
  const spansFile = join(evidenceDir, "otel-spans.json");
  await writeFile(spansFile, "");
  if (otelBin !== null) {
    const otlpHttpPort = 14318 + Math.floor(Math.random() * 500);
    const otlpGrpcPort = 15317 + Math.floor(Math.random() * 500);
    const collectorConfig = join(evidenceDir, "otelcol-staging.yaml");
    await writeFile(
      collectorConfig,
      `receivers:\n  otlp:\n    protocols:\n      http:\n        endpoint: 127.0.0.1:${otlpHttpPort}\n      grpc:\n        endpoint: 127.0.0.1:${otlpGrpcPort}\nprocessors:\n  batch: {}\nexporters:\n  file/traces:\n    path: ${spansFile}\nservice:\n  pipelines:\n    traces:\n      receivers: [otlp]\n      processors: [batch]\n      exporters: [file/traces]\n    metrics:\n      receivers: [otlp]\n      processors: [batch]\n      exporters: [file/traces]\n    logs:\n      receivers: [otlp]\n      processors: [batch]\n      exporters: [file/traces]\n`,
    );
    let collector = null;
    startCollector = async () => {
      collector = spawnLogged("otelcol", otelBin, [
        "--config",
        collectorConfig,
      ]);
      extraProcs.push(collector);
      await waitForTcp("127.0.0.1", otlpHttpPort, 100);
    };
    stopCollector = async () => {
      if (collector !== null) {
        await collector.stop("SIGKILL");
        collector = null;
      }
    };
    await startCollector();
    collectorEndpoint = `http://127.0.0.1:${otlpHttpPort}/v1/traces`;
    log(`managed OTel collector ready (${collectorEndpoint})`);
  }

  const auditSecret =
    randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const tracesEndpoint =
    collectorEndpoint ??
    (() => {
      throw new Error("OTel endpoint unresolved");
    })();
  const collection = "cvg_staging_knowledge_v1";
  const baseEnv = {
    NODE_ENV: "development",
    DATABASE_URL: appUrl,
    AUDIT_CURSOR_SECRET: auditSecret,
    WEB_ORIGINS: "http://127.0.0.1:3100",
    QDRANT_ENABLED: "true",
    QDRANT_URL: qdrantUrl,
    QDRANT_COLLECTION: collection,
    QDRANT_INDEX_VERSION: "v1",
    EMBEDDING_PROVIDER: "fake",
    EMBEDDING_MODEL: "cvg-staging-embedding-v1",
    EMBEDDING_DIMENSION: "64",
    AI_ENABLED: "false",
    TRUSTED_PROXIES: "127.0.0.1",
    OTEL_TRACES_ENABLED: "true",
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: tracesEndpoint,
    OTEL_SERVICE_NAME: "cvg-staging",
  };
  const workerEnv = { ...baseEnv };

  // Web build precondition: Next bakes /api rewrites at BUILD time from
  // CVG_API_INTERNAL_URL. A stale build serves 404 for every proxied call.
  try {
    const manifest = JSON.parse(
      await readFile(join(root, "apps/web/.next/routes-manifest.json"), "utf8"),
    );
    const rewrites = [
      ...(manifest?.rewrites?.beforeFiles ?? []),
      ...(manifest?.rewrites?.afterFiles ?? []),
    ];
    const proxiesApi = rewrites.some(
      (rule) =>
        typeof rule.source === "string" &&
        rule.source.startsWith("/api/v1/") &&
        typeof rule.destination === "string" &&
        rule.destination.startsWith("http://127.0.0.1:3101/api/v1/"),
    );
    if (!proxiesApi) {
      throw new Error(
        "web build has no /api rewrite to 127.0.0.1:3101; rebuild with CVG_API_INTERNAL_URL=http://127.0.0.1:3101",
      );
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        "web production build missing; run pnpm --dir apps/web build first",
      );
    }
    throw error;
  }

  // 4. Writers: API x2 + worker + fixture + web + TLS.
  const writers = [];
  const dumpWriters = (label) => {
    for (const proc of [...writers, ...extraProcs]) {
      const out = proc.output().slice(-2000);
      console.error(`[staging] ${label} ${proc.name} output tail:\n${out}`);
    }
  };
  const fixtureFile = join(tmpdir(), `cvg-staging-fixture-${process.pid}.json`);
  async function startWriters() {
    const apiA = spawnLogged(
      "api-a",
      "pnpm",
      ["--filter", "@cvg/api", "start"],
      {
        ...baseEnv,
        API_HOST: "127.0.0.1",
        API_PORT: "3101",
      },
    );
    const apiB = spawnLogged(
      "api-b",
      "pnpm",
      ["--filter", "@cvg/api", "start"],
      {
        ...baseEnv,
        API_HOST: "127.0.0.1",
        API_PORT: "3112",
      },
    );
    const worker = spawnLogged(
      "worker",
      "pnpm",
      ["--filter", "@cvg/worker", "start"],
      baseEnv,
    );
    writers.push(apiA, apiB, worker);
    await waitForHttp("http://127.0.0.1:3101/health/ready");
    await waitForHttp("http://127.0.0.1:3112/health/ready");
    const fixture = spawnLogged(
      "fixture",
      "node",
      ["scripts/real-e2e-fixture-server.mjs"],
      {
        ...baseEnv,
        DATABASE_URL: superUrl,
        CVG_REAL_E2E_DATABASE_URL: superUrl,
        CVG_REAL_E2E_FIXTURE_FILE: fixtureFile,
        CVG_REAL_E2E_FIXTURE_PORT: "3102",
      },
    );
    writers.push(fixture);
    await waitForHttp("http://127.0.0.1:3102/ready");
    const web = spawnLogged(
      "web",
      "pnpm",
      [
        "--dir",
        "apps/web",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3100",
      ],
      { CVG_API_INTERNAL_URL: "http://127.0.0.1:3101" },
    );
    writers.push(web);
    await waitForHttp("http://127.0.0.1:3100/");
    const tls = spawnLogged(
      "tls",
      "node",
      ["scripts/staging-tls-terminator.mjs", "3443", "http://127.0.0.1:3101"],
      {
        CVG_STAGING_TLS_CERT: join(
          tmpdir(),
          `cvg-staging-cert-${process.pid}.pem`,
        ),
        CVG_STAGING_TLS_KEY: join(
          tmpdir(),
          `cvg-staging-key-${process.pid}.pem`,
        ),
      },
    );
    writers.push(tls);
    await waitForTcp("127.0.0.1", 3443);
    log("writers started (api-a, api-b, worker, fixture, web, tls)");
  }
  async function stopWriters() {
    for (const proc of writers.splice(0).reverse()) {
      try {
        await proc.stop();
      } catch {
        // best effort teardown
      }
    }
  }
  const stopAll = async () => {
    await stopWriters();
    await stopExtra();
    await stopPg();
  };
  process.once("SIGINT", () => void stopAll());
  process.once("SIGTERM", () => void stopAll());

  try {
    await startWriters();
  } catch (error) {
    dumpWriters("boot-failure");
    throw error;
  }

  const pgBinDir = await findEmbeddedPostgresBinDir();
  const pgCtl =
    pgBinDir === null || embeddedDir === null
      ? null
      : { bin: join(pgBinDir, "pg_ctl"), dataDir: join(embeddedDir, "data") };
  const drillContext = {
    evidenceDir,
    appUrl: "http://127.0.0.1:3101",
    superDatabaseUrl: superUrl,
    databaseName: DATABASE,
    qdrantUrl,
    collection,
    workerEnv,
    restartWorker: async () => {
      const index = writers.findIndex((proc) => proc.name === "worker");
      if (index !== -1) {
        const [worker] = writers.splice(index, 1);
        await worker?.stop("SIGKILL");
      }
      const worker = spawnLogged(
        "worker",
        "pnpm",
        ["--filter", "@cvg/worker", "start"],
        baseEnv,
      );
      writers.push(worker);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    },
    stopWriters,
    startWriters,
    pgCtl,
    stopCollector,
    startCollector,
  };

  if (mode === "up") {
    log("staging UP (Ctrl-C to tear down)");
    console.log(
      JSON.stringify(
        {
          apiA: "http://127.0.0.1:3101",
          apiB: "http://127.0.0.1:3112",
          tls: "https://127.0.0.1:3443",
          web: "http://127.0.0.1:3100",
          fixture: "http://127.0.0.1:3102",
          redis: redisUrl,
          qdrant: qdrantUrl,
        },
        null,
        2,
      ),
    );
    await new Promise(() => undefined);
    return;
  }

  // verify: failure drills first (they restart writers), then the HTTP-level
  // staging spec, then optionally the browser journey.
  const fail = async (error) => {
    console.error(`[staging] FAILED: ${error?.message ?? error}`);
    dumpWriters("failure");
    try {
      await stopAll();
    } catch {
      // teardown continues
    }
    process.exit(1);
  };
  try {
    await drillReconcile(drillContext);
    log("drill reconcile PASS");
    await drillQdrantLoss(drillContext);
    log("drill qdrant-loss PASS");
    await drillBackupRestore(drillContext);
    log("drill backup-restore PASS");
    await drillFailover(drillContext);
    log("drill failover PASS");
    if (otelBin === null) {
      await writeFile(
        join(evidenceDir, "drill-otel-outage.json"),
        `${JSON.stringify({ name: "drill-otel-outage.json", status: "SKIP", reason: "external collector is not stoppable by the runner; use CVG_OTEL_COLLECTOR_BIN for a managed outage proof" }, null, 2)}\n`,
      );
      log("drill otel-outage SKIP (external collector)");
    } else {
      await drillOtelOutage(drillContext);
      log("drill otel-outage PASS");
    }
  } catch (error) {
    await fail(error);
    return;
  }

  const stagingEnv = {
    CVG_STAGING_API_A_URL: "http://127.0.0.1:3101",
    CVG_STAGING_API_B_URL: "http://127.0.0.1:3112",
    CVG_STAGING_TLS_URL: "https://127.0.0.1:3443",
    CVG_STAGING_WEB_URL: "http://127.0.0.1:3100",
    CVG_STAGING_REDIS_URL: redisUrl,
    CVG_STAGING_QDRANT_URL: qdrantUrl,
    CVG_STAGING_EVIDENCE_DIR: evidenceDir,
    CVG_STAGING_OTEL_SPANS_FILE:
      otelBin !== null ? join(evidenceDir, "otel-spans.json") : "",
    NODE_TLS_REJECT_UNAUTHORIZED: "0",
  };
  try {
    const child = await execFileAsync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--project",
        "integration",
        "tests/integration/staging-stack.test.ts",
      ],
      {
        cwd: root,
        env: { ...process.env, ...stagingEnv },
        timeout: 600000,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    process.stdout.write(child.stdout ?? "");
  } catch (error) {
    process.stdout.write(error.stdout ?? "");
    process.stderr.write(error.stderr ?? "");
    await fail(error);
    return;
  }

  if (otelBin !== null) {
    const spans = await readFile(
      join(evidenceDir, "otel-spans.json"),
      "utf8",
    ).catch(() => "");
    const traceIds = new Set(
      [...spans.matchAll(/"traceId":\s*"([0-9a-f]{32})"/gu)].map((m) => m[1]),
    );
    await writeFile(
      join(evidenceDir, "otel-summary.json"),
      `${JSON.stringify({ status: spans.length > 0 && traceIds.size > 0 ? "PASS" : "FAIL", bytes: spans.length, distinctTraces: traceIds.size }, null, 2)}\n`,
    );
    if (spans.length === 0 || traceIds.size === 0) {
      await fail(new Error("otel summary: no spans reached the collector"));
      return;
    }
  }

  if (withBrowser) {
    log("running browser staging-journey spec against staging");
    // Precondition guard: the spec needs a live fixture server AND its file.
    // Fail fast here instead of producing cryptic ENOENT/ECONNREFUSED later.
    try {
      const { readFile: readFixtureFile } = await import("node:fs/promises");
      const ready = await fetch("http://127.0.0.1:3102/ready");
      if (!ready.ok) throw new Error("fixture /ready is not ok");
      const fixtureRaw = await readFixtureFile(fixtureFile, "utf8");
      const fixtureParsed = JSON.parse(fixtureRaw);
      if (fixtureParsed.source !== "authoring-publication-v1") {
        throw new Error("fixture file has unexpected source");
      }
    } catch (error) {
      await fail(new Error(`browser precondition failed: ${error.message}`));
      return;
    }
    try {
      const child = await execFileAsync(
        "pnpm",
        ["exec", "playwright", "test", "staging-journey"],
        {
          cwd: root,
          env: {
            ...process.env,
            CVG_STAGING_BROWSER: "1",
            CVG_STAGING_EXTERNAL: "1",
            BASE_URL: "http://127.0.0.1:3100",
            CVG_REAL_E2E_FIXTURE_FILE: fixtureFile,
            CVG_REAL_E2E_FIXTURE_PORT: "3102",
          },
          timeout: 600000,
          maxBuffer: 64 * 1024 * 1024,
        },
      );
      process.stdout.write(child.stdout ?? "");
    } catch (error) {
      process.stdout.write(error.stdout ?? "");
      process.stderr.write(error.stderr ?? "");
      await fail(error);
      return;
    }
  }

  await stopAll();
  log("staging verify PASS; stack torn down");
}

await main().catch(async (error) => {
  console.error(`[staging] fatal: ${error.message}`);
  process.exit(1);
});
