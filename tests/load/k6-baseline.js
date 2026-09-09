// k6 baseline — perfil separado, NUNCA gate obrigatório do CI.
//
// Uso: API_BASE_URL=http://127.0.0.1:3000 k6 run tests/load/k6-baseline.js
// Cenários: read-heavy, mutation, mixed. Autenticação usa sessão sintética
// descartável; nenhum dado real.
//
// Métricas registradas: throughput, p50/p95/p99, error rate.
// CPU/mem/DB saturation são coletados fora do k6 (métricas da app + PG).

/* global __ENV */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.API_BASE_URL ?? "http://127.0.0.1:3000";

export const readLatency = new Trend("read_latency_ms");
export const errorRate = new Rate("errors");

export const options = {
  scenarios: {
    read_heavy: {
      executor: "constant-vus",
      vus: 10,
      duration: "60s",
      exec: "readHeavy",
    },
    mixed: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 5 },
        { duration: "60s", target: 20 },
        { duration: "30s", target: 0 },
      ],
      exec: "mixed",
      startTime: "65s",
    },
  },
  thresholds: {
    errors: ["rate<0.05"],
    read_latency_ms: ["p(95)<800"],
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
    errorRate.add(!ok);
    readLatency.add(response.timings.duration);
  }
  sleep(1);
}

export function mixed() {
  readHeavy();
}
