import { describe, expect, it } from "vitest";

import { createObservability } from "@cvg/observability";

import { createWorkerHealthServer } from "./health.js";

describe("worker health and metrics server", () => {
  it("separates liveness, readiness, and authenticated Prometheus metrics", async () => {
    const observability = createObservability({ service: "worker" });
    observability.metrics.increment("worker.events.processed", {
      event_type: "synthetic.test",
      outcome: "success",
    });
    const server = createWorkerHealthServer({
      host: "127.0.0.1",
      port: 0,
      metricsScrapeToken: "m".repeat(32),
      observability,
    });
    await server.start();

    try {
      const address = server.address();
      expect(address).not.toBeNull();
      if (address === null || typeof address === "string") return;
      const baseUrl = `http://127.0.0.1:${address.port}`;

      await expect(fetch(`${baseUrl}/health/live`)).resolves.toMatchObject({
        status: 200,
      });
      await expect(fetch(`${baseUrl}/health/ready`)).resolves.toMatchObject({
        status: 503,
      });
      await expect(
        fetch(`${baseUrl}/internal/metrics/prometheus`),
      ).resolves.toMatchObject({ status: 401 });

      server.markReady();
      server.markDependenciesHealthy();
      server.markSyntheticProbePassed();
      server.markHeartbeat();
      await expect(fetch(`${baseUrl}/health/ready`)).resolves.toMatchObject({
        status: 200,
      });

      server.markDraining();
      const draining = await fetch(`${baseUrl}/health/ready`);
      expect(draining.status).toBe(503);
      await expect(draining.json()).resolves.toMatchObject({
        status: "not_ready",
        checks: { accepting_work: false },
      });
      const metrics = await fetch(`${baseUrl}/internal/metrics/prometheus`, {
        headers: { authorization: `Bearer ${"m".repeat(32)}` },
      });
      expect(metrics.status).toBe(200);
      expect(await metrics.text()).toContain("worker_events_processed_total");
    } finally {
      await server.close();
    }
  });

  it("fails closed on invalid options and serves non-GET/unknown routes", async () => {
    const observability = createObservability({ service: "worker" });
    expect(() =>
      createWorkerHealthServer({
        port: -1,
        observability,
      }),
    ).toThrow("worker health port");
    expect(() =>
      createWorkerHealthServer({
        metricsScrapeToken: "",
        observability,
      }),
    ).toThrow("metricsScrapeToken");

    const server = createWorkerHealthServer({
      host: "127.0.0.1",
      port: 0,
      metricsScrapeToken: "m".repeat(32),
      observability,
    });
    await server.start();
    try {
      const address = server.address();
      expect(address).not.toBeNull();
      if (address === null || typeof address === "string") return;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const post = await fetch(`${baseUrl}/health/live`, { method: "POST" });
      const unknown = await fetch(`${baseUrl}/unknown`);
      const metrics = await fetch(`${baseUrl}/internal/metrics/prometheus`);

      expect(post.status).toBe(405);
      expect(await post.json()).toEqual({ status: "method_not_allowed" });
      expect(unknown.status).toBe(404);
      expect(await unknown.json()).toEqual({ status: "not_found" });
      expect(metrics.status).toBe(401);
    } finally {
      await server.close();
      await server.close();
    }
  });

  it("keeps readiness closed when a heartbeat expires or a dependency fails", async () => {
    let now = 1_000;
    const observability = createObservability({ service: "worker" });
    const server = createWorkerHealthServer({
      host: "127.0.0.1",
      port: 0,
      heartbeatTtlMs: 100,
      readinessClock: () => now,
      observability,
    });
    await server.start();

    try {
      const address = server.address();
      expect(address).not.toBeNull();
      if (address === null || typeof address === "string") return;
      const baseUrl = `http://127.0.0.1:${address.port}`;

      server.markReady();
      server.markDependenciesHealthy();
      server.markSyntheticProbePassed();
      server.markHeartbeat();
      await expect(fetch(`${baseUrl}/health/ready`)).resolves.toMatchObject({
        status: 200,
      });

      now += 101;
      await expect(fetch(`${baseUrl}/health/ready`)).resolves.toMatchObject({
        status: 503,
      });

      server.markHeartbeat();
      server.markDependenciesUnhealthy();
      await expect(fetch(`${baseUrl}/health/ready`)).resolves.toMatchObject({
        status: 503,
      });
    } finally {
      await server.close();
    }
  });

  it("rejects invalid heartbeat TTL values", () => {
    const observability = createObservability({ service: "worker" });
    expect(() =>
      createWorkerHealthServer({ heartbeatTtlMs: 0, observability }),
    ).toThrow("heartbeatTtlMs");
    expect(() =>
      createWorkerHealthServer({ heartbeatTtlMs: 300_001, observability }),
    ).toThrow("heartbeatTtlMs");
  });
});
