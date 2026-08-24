import { describe, expect, it } from "vitest";

import {
  deriveOperationalSnapshot,
  evaluateOperationalAlerts,
  evaluateSlo,
  type SloDefinition,
} from "./operations.js";
import type { MetricsSnapshot } from "./observability.js";

describe("operational SLO evaluation", () => {
  it("derives a redacted operational snapshot from process metrics", () => {
    const metrics: MetricsSnapshot = {
      counters: [
        {
          name: "api.requests.total",
          value: 995,
          labels: {
            route: "/api/v1/dashboard",
            status: "200",
            outcome: "success",
          },
        },
        {
          name: "api.requests.total",
          value: 5,
          labels: {
            route: "/api/v1/dashboard",
            status: "500",
            outcome: "server_error",
          },
        },
      ],
      histograms: [],
    };

    const snapshot = deriveOperationalSnapshot("READY", metrics);

    expect(snapshot.status).toBe("READY");
    expect(snapshot.slos).toEqual([
      expect.objectContaining({
        id: "core.availability",
        status: "PASS",
        observed: 0.995,
      }),
      expect.objectContaining({
        id: "api.read.p95",
        status: "NO_DATA",
        observed: null,
      }),
      expect.objectContaining({
        id: "api.mutation.p95",
        status: "NO_DATA",
        observed: null,
      }),
    ]);
    expect(snapshot.alerts).toEqual([
      { code: "slo_no_data", severity: "warning" },
      { code: "slo_no_data", severity: "warning" },
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(
      /participant|email|token|cookie|prompt|source|photo|pdf/iu,
    );
  });

  it("keeps dependency failure and availability breach visible", () => {
    const snapshot = deriveOperationalSnapshot("NOT_READY", {
      counters: [
        {
          name: "api.requests.total",
          value: 1,
          labels: { outcome: "success" },
        },
        {
          name: "api.requests.total",
          value: 1,
          labels: { outcome: "server_error" },
        },
      ],
      histograms: [],
    });

    expect(snapshot.slos[0]).toMatchObject({
      id: "core.availability",
      status: "BREACHED",
      observed: 0.5,
    });
    expect(snapshot.alerts).toEqual([
      { code: "postgres_not_ready", severity: "critical" },
      { code: "slo_breached", severity: "critical" },
      { code: "slo_no_data", severity: "warning" },
      { code: "slo_no_data", severity: "warning" },
    ]);
  });

  it("evaluates availability and latency without accepting incomplete samples", () => {
    const availability: SloDefinition = {
      id: "core.availability",
      kind: "availability",
      target: 0.995,
    };
    const latency: SloDefinition = {
      id: "api.read.p95",
      kind: "latency_p95_ms",
      target: 800,
    };

    expect(
      evaluateSlo(availability, { goodEvents: 999, totalEvents: 1_000 }),
    ).toMatchObject({
      id: "core.availability",
      status: "PASS",
      observed: 0.999,
    });
    expect(
      evaluateSlo(latency, { goodEvents: 0, totalEvents: 0, p95Ms: 920 }),
    ).toMatchObject({ id: "api.read.p95", status: "BREACHED", observed: 920 });
    expect(
      evaluateSlo(availability, { goodEvents: 0, totalEvents: 0 }),
    ).toEqual(expect.objectContaining({ status: "NO_DATA", observed: null }));
    expect(
      evaluateSlo(
        { id: "perfect.availability", kind: "availability", target: 1 },
        { goodEvents: 1, totalEvents: 1 },
      ),
    ).toMatchObject({ status: "PASS", errorBudgetRemaining: 100 });
    expect(
      evaluateSlo(
        { id: "perfect.availability", kind: "availability", target: 1 },
        { goodEvents: 0, totalEvents: 1 },
      ),
    ).toMatchObject({ status: "BREACHED", errorBudgetRemaining: 0 });
    expect(
      evaluateSlo(latency, { goodEvents: 0, totalEvents: 1, p95Ms: 400 }),
    ).toMatchObject({ status: "PASS" });
    expect(
      evaluateSlo(latency, { goodEvents: 0, totalEvents: 1 }),
    ).toMatchObject({ status: "NO_DATA", observed: null });
    expect(
      evaluateSlo(latency, {
        goodEvents: 0,
        totalEvents: 1,
        p95Ms: Number.NaN,
      }),
    ).toMatchObject({ status: "NO_DATA", observed: null });
    expect(
      evaluateSlo(latency, { goodEvents: 0, totalEvents: 1, p95Ms: -1 }),
    ).toMatchObject({ status: "NO_DATA", observed: null });
  });

  it("rejects invalid SLO definitions and measurements", () => {
    expect(() =>
      evaluateSlo(
        { id: " ", kind: "availability", target: 0.9 },
        { goodEvents: 1, totalEvents: 1 },
      ),
    ).toThrow("id");
    expect(() =>
      evaluateSlo(
        { id: "invalid", kind: "availability", target: 0 },
        { goodEvents: 1, totalEvents: 1 },
      ),
    ).toThrow("target");
    expect(() =>
      evaluateSlo(
        { id: "invalid", kind: "availability", target: 2 },
        { goodEvents: 1, totalEvents: 1 },
      ),
    ).toThrow("exceed");
    expect(() =>
      evaluateSlo(
        { id: "invalid", kind: "availability", target: 0.9 },
        { goodEvents: 2, totalEvents: 1 },
      ),
    ).toThrow("exceed");
    expect(() =>
      evaluateSlo(
        { id: "invalid", kind: "availability", target: 0.9 },
        { goodEvents: -1, totalEvents: 1 },
      ),
    ).toThrow("goodEvents");
    expect(() =>
      evaluateSlo(
        { id: "invalid", kind: "availability", target: 0.9 },
        { goodEvents: 0, totalEvents: Number.NaN },
      ),
    ).toThrow("totalEvents");
  });

  it("opens redacted alerts for dependency and SLO failures", () => {
    const alerts = evaluateOperationalAlerts({
      dependencyStatus: "NOT_READY",
      slos: [
        {
          id: "core.availability",
          kind: "availability",
          target: 0.995,
          status: "BREACHED",
          observed: 0.9,
          errorBudgetRemaining: 0,
        },
        {
          id: "api.read.p95",
          kind: "latency_p95_ms",
          target: 800,
          status: "NO_DATA",
          observed: null,
          errorBudgetRemaining: null,
        },
      ],
    });

    expect(alerts).toEqual([
      { code: "postgres_not_ready", severity: "critical" },
      { code: "slo_breached", severity: "critical" },
      { code: "slo_no_data", severity: "warning" },
    ]);
    expect(JSON.stringify(alerts)).not.toContain("participant");
    expect(
      evaluateOperationalAlerts({ dependencyStatus: "DEGRADED", slos: [] }),
    ).toEqual([{ code: "qdrant_degraded", severity: "warning" }]);
    expect(
      evaluateOperationalAlerts({ dependencyStatus: "READY", slos: [] }),
    ).toEqual([]);
    expect(
      evaluateOperationalAlerts({
        dependencyStatus: "READY",
        slos: [
          {
            id: "api.read.p95",
            kind: "latency_p95_ms",
            target: 800,
            status: "BREACHED",
            observed: 900,
            errorBudgetRemaining: 0,
          },
        ],
      }),
    ).toEqual([{ code: "slo_breached", severity: "warning" }]);
  });
});
