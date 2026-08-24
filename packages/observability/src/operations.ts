import type { MetricsSnapshot } from "./observability.js";

export type SloDefinition = Readonly<{
  readonly id: string;
  readonly kind: "availability" | "latency_p95_ms";
  readonly target: number;
}>;

export type SloMeasurement = Readonly<{
  readonly goodEvents: number;
  readonly totalEvents: number;
  readonly p95Ms?: number;
}>;

export type SloEvaluation = Readonly<{
  readonly id: string;
  readonly kind: SloDefinition["kind"];
  readonly target: number;
  readonly status: "PASS" | "BREACHED" | "NO_DATA";
  readonly observed: number | null;
  readonly errorBudgetRemaining: number | null;
}>;

export type DependencyOperationalStatus = "READY" | "DEGRADED" | "NOT_READY";

export type OperationalAlert = Readonly<{
  readonly code:
    "postgres_not_ready" | "qdrant_degraded" | "slo_breached" | "slo_no_data";
  readonly severity: "warning" | "critical";
}>;

export type OperationalAlertInput = Readonly<{
  readonly dependencyStatus: DependencyOperationalStatus;
  readonly slos: readonly SloEvaluation[];
}>;

export type OperationalSnapshot = Readonly<{
  readonly status: DependencyOperationalStatus;
  readonly slos: readonly SloEvaluation[];
  readonly alerts: readonly OperationalAlert[];
}>;

const defaultOperationalSlos = [
  {
    id: "core.availability",
    kind: "availability" as const,
    target: 0.995,
  },
  {
    id: "api.read.p95",
    kind: "latency_p95_ms" as const,
    target: 800,
  },
  {
    id: "api.mutation.p95",
    kind: "latency_p95_ms" as const,
    target: 1_500,
  },
] satisfies readonly SloDefinition[];

export const DEFAULT_OPERATIONAL_SLOS: readonly SloDefinition[] = Object.freeze(
  defaultOperationalSlos.map((definition) => Object.freeze(definition)),
);

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be finite and non-negative`);
  }
}

function assertDefinition(definition: SloDefinition): void {
  if (definition.id.trim().length === 0) {
    throw new RangeError("SLO id must not be empty");
  }
  if (!Number.isFinite(definition.target) || definition.target <= 0) {
    throw new RangeError("SLO target must be positive");
  }
  if (definition.kind === "availability" && definition.target > 1) {
    throw new RangeError("availability target must not exceed one");
  }
}

function availabilityBudget(target: number, observed: number): number {
  if (target === 1) return observed >= 1 ? 100 : 0;
  return Math.max(0, ((observed - target) / (1 - target)) * 100);
}

function latencyBudget(target: number, observed: number): number {
  return Math.max(0, ((target - observed) / target) * 100);
}

export function evaluateSlo(
  definition: SloDefinition,
  measurement: SloMeasurement,
): SloEvaluation {
  assertDefinition(definition);
  assertFiniteNonNegative(measurement.goodEvents, "goodEvents");
  assertFiniteNonNegative(measurement.totalEvents, "totalEvents");
  if (measurement.goodEvents > measurement.totalEvents) {
    throw new RangeError("goodEvents must not exceed totalEvents");
  }

  if (definition.kind === "availability") {
    if (measurement.totalEvents === 0) {
      return Object.freeze({
        id: definition.id,
        kind: definition.kind,
        target: definition.target,
        status: "NO_DATA",
        observed: null,
        errorBudgetRemaining: null,
      });
    }
    const observed = measurement.goodEvents / measurement.totalEvents;
    return Object.freeze({
      id: definition.id,
      kind: definition.kind,
      target: definition.target,
      status: observed >= definition.target ? "PASS" : "BREACHED",
      observed,
      errorBudgetRemaining: availabilityBudget(definition.target, observed),
    });
  }

  if (
    measurement.p95Ms === undefined ||
    !Number.isFinite(measurement.p95Ms) ||
    measurement.p95Ms < 0
  ) {
    return Object.freeze({
      id: definition.id,
      kind: definition.kind,
      target: definition.target,
      status: "NO_DATA",
      observed: null,
      errorBudgetRemaining: null,
    });
  }

  const observed = measurement.p95Ms;
  return Object.freeze({
    id: definition.id,
    kind: definition.kind,
    target: definition.target,
    status: observed <= definition.target ? "PASS" : "BREACHED",
    observed,
    errorBudgetRemaining: latencyBudget(definition.target, observed),
  });
}

export function evaluateOperationalAlerts(
  input: OperationalAlertInput,
): readonly OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  if (input.dependencyStatus === "NOT_READY") {
    alerts.push({ code: "postgres_not_ready", severity: "critical" });
  } else if (input.dependencyStatus === "DEGRADED") {
    alerts.push({ code: "qdrant_degraded", severity: "warning" });
  }

  for (const slo of input.slos) {
    if (slo.status === "BREACHED") {
      alerts.push({
        code: "slo_breached",
        severity: slo.kind === "availability" ? "critical" : "warning",
      });
    } else if (slo.status === "NO_DATA") {
      alerts.push({ code: "slo_no_data", severity: "warning" });
    }
  }
  return Object.freeze(alerts.map((alert) => Object.freeze(alert)));
}

function requestMeasurement(metrics: MetricsSnapshot): SloMeasurement {
  return metrics.counters.reduce(
    (measurement, counter) => {
      if (
        counter.name !== "api.requests.total" ||
        !Number.isFinite(counter.value) ||
        counter.value < 0
      ) {
        return measurement;
      }
      return {
        goodEvents:
          measurement.goodEvents +
          (counter.labels.outcome === "success" ? counter.value : 0),
        totalEvents: measurement.totalEvents + counter.value,
      };
    },
    { goodEvents: 0, totalEvents: 0 },
  );
}

function requiredDefinition(id: string): SloDefinition {
  const definition = DEFAULT_OPERATIONAL_SLOS.find((item) => item.id === id);
  if (definition === undefined) {
    throw new Error(`missing operational SLO: ${id}`);
  }
  return definition;
}

export function deriveOperationalSnapshot(
  dependencyStatus: DependencyOperationalStatus,
  metrics: MetricsSnapshot,
): OperationalSnapshot {
  const availability = evaluateSlo(
    requiredDefinition("core.availability"),
    requestMeasurement(metrics),
  );
  const slos = Object.freeze([
    availability,
    evaluateSlo(requiredDefinition("api.read.p95"), {
      goodEvents: 0,
      totalEvents: 0,
    }),
    evaluateSlo(requiredDefinition("api.mutation.p95"), {
      goodEvents: 0,
      totalEvents: 0,
    }),
  ]);
  return Object.freeze({
    status: dependencyStatus,
    slos,
    alerts: evaluateOperationalAlerts({ dependencyStatus, slos }),
  });
}
