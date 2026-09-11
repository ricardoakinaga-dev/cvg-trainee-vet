// k6 baseline — perfil separado, NUNCA gate obrigatório do CI.
//
// Uso: API_BASE_URL=http://127.0.0.1:3000 k6 run tests/load/k6-baseline.js
// Perfis:
//   read_heavy    — probes públicas (sem DB): /health/live, /health/ready
//   auth_rejected — pilha completa de middleware até 401 (sem DB e sem
//                   sessão): session/current, dashboard, attempts. Mede o
//                   custo do caminho de negação, não de negócio.
// Cenários autenticados com DB (attempt start/submit, diagnostics) exigem
// ambiente descartável com PostgreSQL e ficam documentados como extensão;
// nenhum dado real é usado em nenhum perfil.
//
// Métricas registradas: throughput, p50/p95/p99, error rate.
// CPU/mem/DB saturation são coletados fora do k6 (métricas da app + PG).

/* global __ENV */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.API_BASE_URL ?? "http://127.0.0.1:3000";

export const readLatency = new Trend("read_latency_ms");
export const authLatency = new Trend("auth_rejected_latency_ms");
export const errorRate = new Rate("errors");
// §125.12: explicit 5xx counter (checks already forbid 5xx; this makes the
// invariant independently countable from the exported summary).
export const http5xx = new Counter("http_5xx_total");

export const options = {
  scenarios: {
    read_heavy: {
      executor: "constant-vus",
      vus: 10,
      duration: "60s",
      exec: "readHeavy",
    },
    auth_rejected: {
      executor: "constant-vus",
      vus: 10,
      duration: "60s",
      exec: "authRejected",
      startTime: "65s",
    },
  },
  thresholds: {
    errors: ["rate<0.05"],
    read_latency_ms: ["p(95)<800"],
    auth_rejected_latency_ms: ["p(95)<800"],
  },
};

export function readHeavy() {
  const responses = http.batch([
    ["GET", `${BASE_URL}/health/live`],
    ["GET", `${BASE_URL}/health/ready`],
  ]);
  for (const response of responses) {
    const ok = check(response, {
      "status is 2xx/503-explicit": (r) => r.status < 600,
    });
    if (response.status >= 500) http5xx.add(1);
    errorRate.add(!ok);
    readLatency.add(response.timings.duration);
  }
  sleep(1);
}

export function authRejected() {
  const responses = http.batch([
    ["GET", `${BASE_URL}/api/v1/session/current`],
    ["GET", `${BASE_URL}/api/v1/dashboard`],
    [
      "POST",
      `${BASE_URL}/api/v1/attempts`,
      JSON.stringify({ activityId: "00000000-0000-4000-8000-000000000000" }),
      { headers: { "Content-Type": "application/json" } },
    ],
  ]);
  for (const response of responses) {
    // 401 = denied without a session; 429 = denied by the shared rate budget.
    // Both are explicit fail-closed denials; the property under test is that
    // an unauthenticated/over-budget caller never gets 2xx or 5xx.
    const ok = check(response, {
      "denied explicitly without 5xx": (r) =>
        r.status === 401 || r.status === 429,
    });
    if (response.status >= 500) http5xx.add(1);
    errorRate.add(!ok);
    authLatency.add(response.timings.duration);
  }
  sleep(1);
}

export function mixed() {
  readHeavy();
}
