#!/usr/bin/env node
/**
 * Post-deploy smoke (BRIEFING/08.RUNTIME/0802 step 5, M08).
 *
 * Checks the three health surfaces of a deployed API without secrets:
 *   /health/live          must be 200
 *   /health/ready         must be 200
 *   /health/dependencies  200 (UP/DEGRADED) is acceptable; 503 NOT_READY fails
 * Prints one JSON line per check and exits 1 on any failure.
 *
 *   node scripts/deploy-smoke.mjs --base-url https://homolog.example.invalid
 */
import { argv, exit, stdout } from "node:process";
import { setTimeout, clearTimeout } from "node:timers";
import { URL } from "node:url";

/* global AbortController */

export const SMOKE_CHECKS = Object.freeze([
  Object.freeze({ name: "live", path: "/health/live", accept: [200] }),
  Object.freeze({ name: "ready", path: "/health/ready", accept: [200] }),
  Object.freeze({
    name: "dependencies",
    path: "/health/dependencies",
    accept: [200],
  }),
]);

export function parseSmokeArgs(args) {
  let baseUrl;
  let timeoutMs = 5000;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--base-url") {
      baseUrl = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--timeout-ms") {
      timeoutMs = Number(args[index + 1]);
      index += 1;
    } else if (arg.startsWith("--timeout-ms=")) {
      timeoutMs = Number(arg.slice("--timeout-ms=".length));
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (baseUrl === undefined || baseUrl.trim().length === 0) {
    throw new Error("--base-url is required");
  }
  const url = new URL(baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("--base-url must use http(s)");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer");
  }
  return Object.freeze({
    baseUrl: baseUrl.replace(/\/+$/u, ""),
    timeoutMs,
  });
}

export function evaluateSmoke(results) {
  const failures = results.filter((result) => !result.ok);
  return Object.freeze({
    ok: failures.length === 0,
    failed: failures.map((result) => result.name),
  });
}

async function probe(check, options, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(`${options.baseUrl}${check.path}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      redirect: "manual",
    });
    return Object.freeze({
      name: check.name,
      status: response.status,
      ok: check.accept.includes(response.status),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return Object.freeze({
      name: check.name,
      status: null,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.name : "unknown",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function runSmoke(options, fetchImpl = globalThis.fetch) {
  const results = [];
  for (const check of SMOKE_CHECKS) {
    results.push(await probe(check, options, fetchImpl));
  }
  return Object.freeze({ results, ...evaluateSmoke(results) });
}

async function main() {
  const options = parseSmokeArgs(argv.slice(2));
  const outcome = await runSmoke(options);
  for (const result of outcome.results) {
    stdout.write(`${JSON.stringify(result)}\n`);
  }
  stdout.write(
    `${JSON.stringify({ smoke: outcome.ok ? "PASS" : "FAIL", failed: outcome.failed })}\n`,
  );
  exit(outcome.ok ? 0 : 1);
}

if (import.meta.url === `file://${argv[1]}`) {
  main().catch((error) => {
    stdout.write(
      `${JSON.stringify({ smoke: "FAIL", error: error instanceof Error ? error.message : String(error) })}\n`,
    );
    exit(1);
  });
}
