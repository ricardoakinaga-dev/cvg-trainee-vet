import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

/**
 * AAA-CERT-003 §30 — durable Redis candidate evidence.
 *
 * Re-executa a matriz live (5 testes: shared budget, atomicidade paralela,
 * fail policy, timeout, spoof) + o restart drill (outage SIGKILL, política
 * observada, recuperação bounded, budget HTTP compartilhado A/B) contra
 * Redis/Valkey real e publica `release-evidence/redis-candidate-summary.json`
 * ancorado no HEAD corrente. Sem Redis disponível o script falha de forma
 * explícita (nunca escreve PASS sintético).
 */
async function run(command, args, env) {
  const child = await execFileAsync(command, args, {
    cwd: root,
    timeout: 600000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env },
  }).catch((error) => error);
  const ok = child.code === undefined;
  return {
    ok,
    stdout: String(child.stdout ?? ""),
    stderr: String(child.stderr ?? child.message ?? ""),
  };
}

async function main() {
  const redisBin =
    process.env.CVG_REDIS_SERVER_BIN?.trim() ||
    (await execFileAsync("sh", ["-c", "command -v redis-server"])
      .then(({ stdout }) => stdout.trim().split("\n")[0]?.trim() ?? "")
      .catch(() => ""));
  if (!redisBin) {
    throw new Error(
      "no redis-server binary (set CVG_REDIS_SERVER_BIN); refusing to write synthetic PASS",
    );
  }
  const version = await execFileAsync(redisBin, ["--version"])
    .then(({ stdout }) => stdout.trim())
    .catch(() => "unknown");

  const { stdout: sha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: root,
  });

  const matrix = await run("node", ["scripts/run-ratelimit-live.mjs"], {
    CVG_REDIS_SERVER_BIN: redisBin,
  });
  const restart = await run(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "--project",
      "integration",
      "tests/integration/ratelimit-redis-restart.test.ts",
    ],
    {
      CVG_REDIS_SERVER_BIN: redisBin,
      CVG_TEST_REDIS_URL: "redis://127.0.0.1:9",
      CVG_RUN_LIVE_REDIS_TESTS: "true",
    },
  );

  const summary = {
    format: "cvg-redis-candidate-summary/v1",
    sha: sha.trim(),
    generatedAt: new Date().toISOString(),
    backend: "redis",
    backendVersion: version,
    instances: 2,
    atomicity_test: matrix.ok ? "PASS" : "FAIL",
    shared_budget_test: matrix.ok ? "PASS" : "FAIL",
    restart_test: restart.ok ? "PASS" : "FAIL",
    timeout_test: matrix.ok ? "PASS" : "FAIL",
    spoof_test: matrix.ok ? "PASS" : "FAIL",
    fail_policy: {
      critical: "fail-closed",
      public_low_risk: "fail-open",
      test: matrix.ok ? "PASS" : "FAIL",
    },
    metrics: [
      "rate_limit_rejections_total{route}",
      "api.requests.total",
      "http_requests_total",
    ],
    metrics_cardinality: "bounded (route-template labels only)",
    silent_fallback: false,
    status: matrix.ok && restart.ok ? "PASS" : "FAIL",
  };
  if (summary.status !== "PASS") {
    console.error(matrix.stderr.slice(-2000));
    console.error(restart.stderr.slice(-2000));
    throw new Error(
      "redis candidate proof failed; summary not written as PASS",
    );
  }
  await mkdir(join(root, "release-evidence"), { recursive: true });
  await writeFile(
    join(root, "release-evidence", "redis-candidate-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(`redis candidate summary written (backend=${version})`);
}

await main().catch((error) => {
  console.error(`redis candidate proof failed: ${error.message}`);
  process.exitCode = 1;
});
