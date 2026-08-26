import { describe, expect, it, vi } from "vitest";

import {
  createObservability,
  renderPrometheusMetrics,
  sanitizeCorrelationId,
  type LogRecord,
} from "./observability.js";

describe("observability", () => {
  it("emits only bounded, redacted structured fields", () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "api",
      clock: () => new Date("2026-08-09T20:00:00.000Z"),
      sink: (record) => records.push(record),
    });

    observability.logger.info("http.request.completed", {
      requestId: "request-123",
      correlationId: "corr-123",
      durationMs: 12.5,
      fields: {
        method: "GET",
        route: "/api/v1/activities/:activityId",
        status: 200,
        classification: "server",
        delay_ms: 5_000,
        max_attempts: 5,
        participantId: "participant-secret",
        response: "clinical response must never be logged",
        source: "protected-source",
        photo: "photo-data",
        prompt: "internal prompt",
        token: "removed",
      },
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      timestamp: "2026-08-09T20:00:00.000Z",
      level: "info",
      service: "api",
      event: "http.request.completed",
      requestId: "request-123",
      correlationId: "corr-123",
      durationMs: 12.5,
      fields: {
        method: "GET",
        status: 200,
        classification: "server",
        delay_ms: 5_000,
        max_attempts: 5,
      },
    });
    expect(records[0]?.fields).not.toHaveProperty("participantId");
    expect(records[0]?.fields).not.toHaveProperty("response");
    expect(records[0]?.fields).not.toHaveProperty("source");
    expect(records[0]?.fields).not.toHaveProperty("photo");
    expect(records[0]?.fields).not.toHaveProperty("prompt");
    expect(records[0]?.fields).not.toHaveProperty("token");
    expect(JSON.stringify(records)).not.toContain("clinical response");
  });

  it("rejects untrusted correlation identifiers", () => {
    expect(sanitizeCorrelationId("corr-123_abc")).toBe("corr-123_abc");
    expect(sanitizeCorrelationId(" ")).toBeUndefined();
    expect(sanitizeCorrelationId("corr with spaces")).toBeUndefined();
    expect(sanitizeCorrelationId("x".repeat(129))).toBeUndefined();
  });

  it("keeps counters and duration observations bounded by safe labels", () => {
    const observability = createObservability({
      service: "worker",
      sink: () => undefined,
    });

    observability.metrics.increment("worker.events.processed", {
      event_type: "content.published.v1",
      status: "success",
      response: "must be removed",
    });
    observability.metrics.observe("worker.batch.duration_ms", 24, {
      outcome: "success",
    });

    const snapshot = observability.metrics.snapshot();
    expect(snapshot.counters).toEqual([
      {
        name: "worker.events.processed",
        value: 1,
        labels: { event_type: "content.published.v1", status: "success" },
      },
    ]);
    expect(snapshot.histograms[0]).toMatchObject({
      name: "worker.batch.duration_ms",
      count: 1,
      sum: 24,
      min: 24,
      max: 24,
    });
    expect(JSON.stringify(snapshot)).not.toContain("must be removed");
  });

  it("supports level filtering, child context, invalid values and default sinks", () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "invalid service name",
      minimumLevel: "warn",
      sink: (record) => records.push(record),
    });

    observability.logger.debug("filtered.debug");
    observability.logger.info("filtered.info");
    observability.logger.warn("event with spaces", {
      requestId: 42 as unknown as string,
      correlationId: "bad correlation",
      durationMs: -1,
      fields: {
        route: "/health/live\u0000",
        status: Number.NaN,
        retryable: true,
        reason: null,
        count: -2,
        unknown: "removed",
      },
    });

    const child = observability.logger.child({
      requestId: "base-request",
      fields: { route: "/health/live" },
    });
    child.error("error event", {
      correlationId: "child-correlation",
      durationMs: Number.POSITIVE_INFINITY,
      fields: { status: 500, outcome: "error" },
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      level: "warn",
      service: "unknown",
      event: "invalid_event",
      fields: {
        route: "/health/live",
        retryable: true,
        reason: null,
        count: -2,
      },
    });
    expect(records[0]).not.toHaveProperty("requestId");
    expect(records[0]).not.toHaveProperty("correlationId");
    expect(records[0]).not.toHaveProperty("durationMs");
    expect(records[1]).toMatchObject({
      level: "error",
      requestId: "base-request",
      correlationId: "child-correlation",
      fields: { route: "/health/live", status: 500, outcome: "error" },
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const defaultObservability = createObservability({ service: "api" });
    defaultObservability.logger.info("default.info");
    defaultObservability.logger.error("default.error");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("handles invalid metrics, repeated points and sanitized route labels", () => {
    const metrics = createObservability({
      service: "worker",
      sink: () => undefined,
    }).metrics;

    metrics.increment("not a metric", { route: "not-a-route" }, 0);
    metrics.increment("not a metric", { route: "not-a-route" }, Number.NaN);
    metrics.increment(
      "Worker.Events",
      { route: "/health/live", unknown: "removed" },
      2,
    );
    metrics.increment("Worker.Events", { route: "/health/live" }, 3);
    metrics.observe("worker.duration", -1);
    metrics.observe("worker.duration", Number.NaN);
    metrics.observe("worker.duration", 10, { route: "/health/live" });
    metrics.observe("worker.duration", 4, { route: "/health/live" });

    expect(metrics.snapshot()).toEqual({
      counters: [
        {
          name: "worker.events",
          value: 5,
          labels: { route: "/health/live" },
        },
      ],
      histograms: [
        {
          name: "worker.duration",
          count: 2,
          sum: 14,
          min: 4,
          max: 10,
          labels: { route: "/health/live" },
        },
      ],
    });
  });

  it("exports counters and histogram aggregates in redacted Prometheus text", () => {
    const observability = createObservability({
      service: "worker",
      sink: () => undefined,
    });

    observability.metrics.increment(
      "worker.events.processed",
      {
        event_type: "content.published.v1",
      },
      2,
    );
    observability.metrics.observe("worker.batch.duration_ms", 12, {
      outcome: "success",
    });

    const rendered = renderPrometheusMetrics(observability.metrics.snapshot());

    expect(rendered).toContain("# TYPE worker_events_processed counter");
    expect(rendered).toContain(
      'worker_events_processed{event_type="content.published.v1"} 2',
    );
    expect(rendered).toContain("worker_batch_duration_ms_count");
    expect(rendered).toContain("worker_batch_duration_ms_sum");
    expect(rendered).not.toContain("participant");
    expect(observability.metrics.prometheus()).toBe(rendered);
  });
});
