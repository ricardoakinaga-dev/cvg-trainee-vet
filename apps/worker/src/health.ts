import { timingSafeEqual } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import type { Observability } from "@cvg/observability";

export type WorkerHealthServerOptions = Readonly<{
  readonly host?: string;
  readonly port?: number;
  readonly metricsScrapeToken?: string;
  readonly heartbeatTtlMs?: number;
  readonly readinessClock?: () => number;
  readonly observability: Observability;
}>;

type HealthRequestHandlerOptions = Readonly<{
  readonly readiness: () => WorkerReadinessState;
  readonly readinessClock: () => number;
  readonly heartbeatTtlMs: number;
  readonly metricsScrapeToken: string | undefined;
  readonly observability: Observability;
}>;

export type WorkerReadinessState = Readonly<{
  readonly initialized: boolean;
  readonly dependenciesHealthy: boolean;
  readonly syntheticProbePassed: boolean;
  readonly lastHeartbeatAt: number | null;
}>;

const defaultHeartbeatTtlMs = 15_000;
const maximumHeartbeatTtlMs = 300_000;

function heartbeatFresh(
  heartbeatAt: number | null,
  nowMs: number,
  heartbeatTtlMs: number,
): boolean {
  return (
    heartbeatAt !== null &&
    Number.isFinite(nowMs) &&
    heartbeatAt <= nowMs &&
    nowMs - heartbeatAt <= heartbeatTtlMs
  );
}

export function isWorkerReady(
  state: WorkerReadinessState,
  nowMs: number,
  heartbeatTtlMs: number,
): boolean {
  return (
    state.initialized &&
    state.dependenciesHealthy &&
    state.syntheticProbePassed &&
    heartbeatFresh(state.lastHeartbeatAt, nowMs, heartbeatTtlMs)
  );
}

export type WorkerHealthServer = Readonly<{
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly address: () => ReturnType<Server["address"]>;
  readonly markReady: () => void;
  readonly markDependenciesHealthy: () => void;
  readonly markDependenciesUnhealthy: () => void;
  readonly markSyntheticProbePassed: () => void;
  readonly markSyntheticProbeFailed: () => void;
  readonly markHeartbeat: () => void;
}>;

function assertPort(port: number): void {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError("worker health port must be between 0 and 65535");
  }
}

function assertHeartbeatTtl(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > maximumHeartbeatTtlMs) {
    throw new RangeError(
      `heartbeatTtlMs must be an integer between 1 and ${maximumHeartbeatTtlMs}`,
    );
  }
}

function authorized(
  request: IncomingMessage,
  expectedToken: string | undefined,
): boolean {
  if (expectedToken === undefined) return false;
  const authorization = request.headers.authorization;
  const prefix = "Bearer ";
  if (typeof authorization !== "string" || !authorization.startsWith(prefix)) {
    return false;
  }
  const provided = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(expectedToken);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: Readonly<Record<string, unknown>>,
): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}

function createReadinessController(readinessClock: () => number) {
  let readiness: WorkerReadinessState = Object.freeze({
    initialized: false,
    dependenciesHealthy: false,
    syntheticProbePassed: false,
    lastHeartbeatAt: null,
  });
  const update = (changes: Partial<WorkerReadinessState>): void => {
    readiness = Object.freeze({ ...readiness, ...changes });
  };

  return Object.freeze({
    get: () => readiness,
    markReady: () => update({ initialized: true }),
    markDependenciesHealthy: () => update({ dependenciesHealthy: true }),
    markDependenciesUnhealthy: () => update({ dependenciesHealthy: false }),
    markSyntheticProbePassed: () => update({ syntheticProbePassed: true }),
    markSyntheticProbeFailed: () => update({ syntheticProbePassed: false }),
    markHeartbeat: () => {
      const nowMs = readinessClock();
      if (!Number.isFinite(nowMs)) {
        throw new RangeError("readinessClock must return a finite number");
      }
      update({ lastHeartbeatAt: nowMs });
    },
  });
}

function createHealthRequestHandler(
  options: HealthRequestHandlerOptions,
): (request: IncomingMessage, response: ServerResponse) => void {
  const {
    readiness,
    readinessClock,
    heartbeatTtlMs,
    metricsScrapeToken,
    observability,
  } = options;
  const writeReadiness = (response: ServerResponse): void => {
    const nowMs = readinessClock();
    const state = readiness();
    const ready = isWorkerReady(state, nowMs, heartbeatTtlMs);
    writeJson(response, ready ? 200 : 503, {
      status: ready ? "ready" : "not_ready",
      checks: {
        initialized: state.initialized,
        dependencies: state.dependenciesHealthy,
        synthetic_probe: state.syntheticProbePassed,
        heartbeat: heartbeatFresh(state.lastHeartbeatAt, nowMs, heartbeatTtlMs),
      },
    });
  };
  const writeMetrics = (response: ServerResponse): void => {
    response.statusCode = 200;
    response.setHeader("content-type", "text/plain; version=0.0.4");
    response.setHeader("cache-control", "no-store");
    response.end(observability.metrics.prometheus());
  };
  return (request: IncomingMessage, response: ServerResponse): void => {
    const method = request.method ?? "GET";
    const route = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (method !== "GET") {
      writeJson(response, 405, { status: "method_not_allowed" });
      return;
    }
    if (route === "/health/live") {
      writeJson(response, 200, { status: "live" });
      return;
    }
    if (route === "/health/ready") {
      writeReadiness(response);
      return;
    }
    if (route === "/internal/metrics/prometheus") {
      if (!authorized(request, metricsScrapeToken)) {
        writeJson(response, 401, { status: "unauthorized" });
        return;
      }
      writeMetrics(response);
      return;
    }
    writeJson(response, 404, { status: "not_found" });
  };
}

export function createWorkerHealthServer(
  options: WorkerHealthServerOptions,
): WorkerHealthServer {
  const host = options.host ?? "0.0.0.0";
  const port = options.port ?? 9091;
  const heartbeatTtlMs = options.heartbeatTtlMs ?? defaultHeartbeatTtlMs;
  const readinessClock = options.readinessClock ?? Date.now;
  assertPort(port);
  assertHeartbeatTtl(heartbeatTtlMs);
  if (
    options.metricsScrapeToken !== undefined &&
    options.metricsScrapeToken.trim().length === 0
  ) {
    throw new TypeError("metricsScrapeToken must not be empty");
  }

  const readiness = createReadinessController(readinessClock);
  const server = createServer(
    createHealthRequestHandler({
      readiness: readiness.get,
      readinessClock,
      heartbeatTtlMs,
      metricsScrapeToken: options.metricsScrapeToken,
      observability: options.observability,
    }),
  );

  return Object.freeze({
    start: () =>
      new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          resolve();
        });
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    address: () => server.address(),
    markReady: readiness.markReady,
    markDependenciesHealthy: readiness.markDependenciesHealthy,
    markDependenciesUnhealthy: readiness.markDependenciesUnhealthy,
    markSyntheticProbePassed: readiness.markSyntheticProbePassed,
    markSyntheticProbeFailed: readiness.markSyntheticProbeFailed,
    markHeartbeat: readiness.markHeartbeat,
  });
}
