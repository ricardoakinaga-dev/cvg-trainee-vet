import { describe, expect, it, vi } from "vitest";

import {
  createOtlpHttpTraceSink,
  createMetricsPort,
  createObservability,
  sanitizeCorrelationId,
  type LogRecord,
  type TraceSpan,
} from "./observability.js";

describe("observability", () => {
  it("composes an immutable metrics port independently from the logger", () => {
    const metrics = createMetricsPort({
      safeMetricName: (value) => value,
      sanitizeLabels: (labels) => Object.freeze({ ...(labels ?? {}) }),
      labelsKey: (labels) => JSON.stringify(Object.entries(labels).sort()),
      renderPrometheusMetrics: () => "",
    });

    expect(Object.isFrozen(metrics)).toBe(true);
    metrics.increment("api.requests.total", { status: "200" });

    expect(metrics.snapshot().counters).toEqual([
      {
        name: "api.requests.total",
        value: 1,
        labels: { status: "200" },
      },
    ]);
  });

  it("exposes an immutable non-invasive collection policy", () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });

    expect(observability.collectionPolicy).toEqual({
      screenRecording: false,
      sessionReplay: false,
      behavioralProfiling: false,
      rawPayloads: false,
    });
    expect(Object.isFrozen(observability.collectionPolicy)).toBe(true);
  });

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
      fields: { method: "GET", status: 200 },
    });
    expect(records[0]?.fields).not.toHaveProperty("participantId");
    expect(records[0]?.fields).not.toHaveProperty("response");
    expect(records[0]?.fields).not.toHaveProperty("source");
    expect(records[0]?.fields).not.toHaveProperty("photo");
    expect(records[0]?.fields).not.toHaveProperty("prompt");
    expect(records[0]?.fields).not.toHaveProperty("token");
    expect(JSON.stringify(records)).not.toContain("clinical response");
  });

  it("correlates redacted logs and OTLP spans without exporting payloads", () => {
    const records: LogRecord[] = [];
    const spans: TraceSpan[] = [];
    const observability = createObservability({
      service: "api",
      sink: (record) => records.push(record),
      traceSink: (span) => spans.push(span),
    });
    const traceId = "a".repeat(32);
    const requestId = "request-observability-probe";
    const correlationId = "correlation-observability-probe";

    observability.logger.info("http.request.completed", {
      traceId,
      requestId,
      correlationId,
      fields: {
        route: "/health/live",
        response: "must never be exported",
      },
    });
    observability.traces.record({
      traceId,
      requestId,
      correlationId,
      name: "http.request",
      startedAt: new Date("2026-08-20T15:00:00.000Z"),
      endedAt: new Date("2026-08-20T15:00:00.010Z"),
      status: "ok",
      attributes: { method: "GET", route: "/health/live", status: 200 },
    });

    expect(records[0]).toMatchObject({ traceId, requestId, correlationId });
    expect(spans[0]).toMatchObject({ traceId, requestId, correlationId });
    expect(JSON.stringify(records)).not.toContain("must never be exported");
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
    metrics.increment("worker.other", {}, 1);
    metrics.increment("Worker.Events", { route: "/health/live" }, 1);
    metrics.observe("worker.duration", -1);
    metrics.observe("worker.duration", Number.NaN);
    metrics.observe("worker.duration", 10, { route: "/health/live" });
    metrics.observe("worker.duration", 4, { route: "/health/live" });

    expect(metrics.snapshot()).toEqual({
      counters: [
        {
          name: "worker.events",
          value: 6,
          labels: { route: "/health/live" },
        },
        { name: "worker.other", value: 1, labels: {} },
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

  it("retains a bounded duration sample for p95 dashboard KPIs", () => {
    const metrics = createObservability({
      service: "api",
      sink: () => undefined,
    }).metrics;

    metrics.observe("api.request.duration_ms", 10);
    metrics.observe("api.request.duration_ms", 20);
    metrics.observe("api.request.duration_ms", 30);

    expect(metrics.quantile("api.request.duration_ms", 0.95)).toBe(30);
    expect(
      metrics.quantile("api.request.duration_ms", 0.95, {
        route: "/health/live",
      }),
    ).toBeNull();
    expect(metrics.quantile("api.request.duration_ms", 1.1)).toBeNull();
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

    const rendered = observability.metrics.prometheus();

    expect(rendered).toContain("# TYPE worker_events_processed_total counter");
    expect(rendered).toContain(
      'worker_events_processed_total{event_type="content.published.v1"} 2',
    );
    expect(rendered).toContain("worker_batch_duration_seconds_count");
    expect(rendered).toContain("worker_batch_duration_seconds_sum");
    expect(rendered).not.toContain("participant");
    expect(observability.metrics.prometheus()).toBe(rendered);
  });

  it("rejects distinct internal metric names that collapse to one Prometheus family", () => {
    const observability = createObservability({
      service: "worker",
      sink: () => undefined,
    });

    observability.metrics.increment("worker.events:processed", {}, 1);
    observability.metrics.increment("worker.events_processed", {}, 1);

    expect(() => observability.metrics.prometheus()).toThrow(
      "Prometheus metric family collision",
    );
  });

  it("emits one HELP/TYPE pair per family and deterministic series ordering", () => {
    const observability = createObservability({
      service: "worker",
      sink: () => undefined,
    });

    observability.metrics.increment(
      "worker.events.processed",
      { event_type: "zeta" },
      1,
    );
    observability.metrics.increment(
      "worker.events.processed",
      { event_type: "alpha" },
      2,
    );
    observability.metrics.observe("worker.duration_ms", 10, {
      route: "/zeta",
    });
    observability.metrics.observe("worker.duration_ms", 5, {
      route: "/alpha",
    });

    const rendered = observability.metrics.prometheus();
    const helpLines = rendered.match(
      /^# HELP worker_events_processed_total .+$/gmu,
    );
    const typeLines = rendered.match(
      /^# TYPE worker_events_processed_total counter$/gmu,
    );

    expect(helpLines).toHaveLength(1);
    expect(typeLines).toHaveLength(1);
    expect(
      rendered.match(/^# TYPE worker_duration_seconds histogram$/gmu),
    ).toHaveLength(1);
    expect(
      rendered.match(/^# TYPE worker_duration_seconds_p95 gauge$/gmu),
    ).toHaveLength(1);
    expect(
      rendered.indexOf("# TYPE worker_events_processed_total counter"),
    ).toBeLessThan(
      rendered.indexOf('worker_events_processed_total{event_type="alpha"} 2'),
    );
    expect(
      rendered.indexOf('worker_events_processed_total{event_type="alpha"} 2'),
    ).toBeLessThan(
      rendered.indexOf('worker_events_processed_total{event_type="zeta"} 1'),
    );
  });

  it("preserves the complete Prometheus wire format for sorted families", () => {
    const observability = createObservability({
      service: "worker",
      sink: () => undefined,
    });

    observability.metrics.increment(
      "worker.events.processed",
      { event_type: "zeta" },
      1,
    );
    observability.metrics.increment(
      "worker.events.processed",
      { event_type: "alpha" },
      2,
    );
    observability.metrics.observe("worker.duration_ms", 10, {
      route: "/zeta",
    });
    observability.metrics.observe("worker.duration_ms", 5, {
      route: "/alpha",
    });

    expect(observability.metrics.prometheus()).toBe(
      [
        "# HELP worker_events_processed_total CVG metric worker_events_processed_total",
        "# TYPE worker_events_processed_total counter",
        'worker_events_processed_total{event_type="alpha"} 2',
        'worker_events_processed_total{event_type="zeta"} 1',
        "# HELP worker_duration_seconds CVG metric worker_duration_seconds",
        "# TYPE worker_duration_seconds histogram",
        'worker_duration_seconds_count{route="/alpha"} 1',
        'worker_duration_seconds_sum{route="/alpha"} 0.005',
        "# HELP worker_duration_seconds_p95 CVG metric worker_duration_seconds_p95",
        "# TYPE worker_duration_seconds_p95 gauge",
        'worker_duration_seconds_p95{route="/alpha"} 0.005',
        'worker_duration_seconds_count{route="/zeta"} 1',
        'worker_duration_seconds_sum{route="/zeta"} 0.01',
        'worker_duration_seconds_p95{route="/zeta"} 0.01',
      ].join("\n") + "\n",
    );
  });

  it("exports a bounded p95 gauge for latency SLO dashboards", () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });

    observability.metrics.observe("api.request.duration_ms", 100);
    observability.metrics.observe("api.request.duration_ms", 200);
    observability.metrics.observe("api.request.duration_ms", 300);

    expect(observability.metrics.prometheus()).toContain(
      "api_request_duration_seconds_p95 0.3",
    );
  });

  it("records bounded request spans and preserves route attributes", () => {
    const spans: TraceSpan[] = [];
    const observability = createObservability({
      service: "api",
      traceSink: (span) => spans.push(span),
      sink: () => undefined,
    });
    const startedAt = new Date("2026-08-09T20:00:00.000Z");
    const endedAt = new Date("2026-08-09T20:00:00.012Z");

    observability.traces.record({
      traceId: "a".repeat(32),
      parentSpanId: "b".repeat(16),
      name: "http.request",
      startedAt,
      endedAt,
      status: "ok",
      attributes: {
        method: "GET",
        route: "/api/v1/modules/:moduleId",
        status: 200,
        outcome: "success",
      },
    });

    expect(spans).toHaveLength(1);
    expect(observability.traces.snapshot()).toMatchObject([
      {
        traceId: "a".repeat(32),
        parentSpanId: "b".repeat(16),
        service: "api",
        name: "http.request",
        durationMs: 12,
        attributes: {
          method: "GET",
          route: "/api/v1/modules/:moduleId",
          status: 200,
          outcome: "success",
        },
      },
    ]);
    expect(JSON.stringify(spans)).not.toContain("participant");
    expect(JSON.stringify(spans)).not.toContain("payload");
  });

  it("exports OTLP spans without payload fields", () => {
    const requests: RequestInit[] = [];
    const sink = createOtlpHttpTraceSink(
      "http://collector:4318",
      async (input, init) => {
        expect(input).toBe("http://collector:4318/v1/traces");
        if (init !== undefined) requests.push(init);
        return new Response(null, { status: 200 });
      },
    );

    sink({
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
      requestId: "request-observability-probe",
      correlationId: "correlation-observability-probe",
      service: "api",
      name: "http.request",
      startedAt: "2026-08-09T20:00:00.000Z",
      endedAt: "2026-08-09T20:00:00.012Z",
      durationMs: 12,
      status: "ok",
      attributes: { method: "GET", route: "/health/live", status: 200 },
    });

    expect(requests).toHaveLength(1);
    const body = String(requests[0]?.body);
    expect(body).toContain("service.name");
    expect(body).toContain("http.status_code");
    expect(body).toContain("cvg.request_id");
    expect(body).toContain("cvg.correlation_id");
    expect(body).not.toContain("payload");
    expect(body).not.toContain("participant");
  });
});
