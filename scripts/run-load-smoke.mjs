import process from "node:process";

const target =
  process.env.CVG_LOAD_TARGET ?? "http://127.0.0.1:3000/health/live";
const requestCount = parsePositiveInteger(
  process.env.CVG_LOAD_REQUESTS ?? "200",
  "CVG_LOAD_REQUESTS",
  20_000,
);
const concurrency = parsePositiveInteger(
  process.env.CVG_LOAD_CONCURRENCY ?? "10",
  "CVG_LOAD_CONCURRENCY",
  200,
);
const timeoutMs = parsePositiveInteger(
  process.env.CVG_LOAD_TIMEOUT_MS ?? "5_000",
  "CVG_LOAD_TIMEOUT_MS",
  60_000,
);

try {
  new URL(target);
} catch {
  throw new Error("CVG_LOAD_TARGET must be an absolute URL");
}

function parsePositiveInteger(value, name, maximum) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${name} must be an integer from 1 to ${maximum}`);
  }
  return parsed;
}

const startedAt = performance.now();
let nextRequest = 0;
let completed = 0;
let successful = 0;
let failed = 0;
let totalLatencyMs = 0;
const latencies = [];
const statusCounts = new Map();

async function runWorker() {
  while (true) {
    const requestNumber = nextRequest;
    nextRequest += 1;
    if (requestNumber >= requestCount) return;

    const requestStartedAt = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(target, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      await response.arrayBuffer();
      const latencyMs = performance.now() - requestStartedAt;
      latencies.push(latencyMs);
      totalLatencyMs += latencyMs;
      statusCounts.set(
        String(response.status),
        (statusCounts.get(String(response.status)) ?? 0) + 1,
      );
      if (response.ok) successful += 1;
      else failed += 1;
    } catch {
      failed += 1;
      statusCounts.set(
        "network_error",
        (statusCounts.get("network_error") ?? 0) + 1,
      );
    } finally {
      clearTimeout(timeout);
      completed += 1;
    }
  }
}

await Promise.all(
  Array.from({ length: Math.min(concurrency, requestCount) }, () =>
    runWorker(),
  ),
);

latencies.sort((left, right) => left - right);
const p95Index = Math.max(0, Math.ceil(latencies.length * 0.95) - 1);
const elapsedMs = performance.now() - startedAt;
const result = {
  target: new URL(target).origin + new URL(target).pathname,
  requests: requestCount,
  concurrency: Math.min(concurrency, requestCount),
  completed,
  successful,
  failed,
  successRatePercent: Number(((successful / requestCount) * 100).toFixed(2)),
  throughputPerSecond: Number(((completed / elapsedMs) * 1_000).toFixed(2)),
  meanLatencyMs: Number(
    (totalLatencyMs / Math.max(1, latencies.length)).toFixed(2),
  ),
  p95LatencyMs: Number((latencies[p95Index] ?? 0).toFixed(2)),
  statusCounts: Object.fromEntries(statusCounts),
};

process.stdout.write(`${JSON.stringify(result)}\n`);
if (successful !== requestCount) process.exitCode = 1;
