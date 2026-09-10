import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { describe, expect, it } from "vitest";

import {
  BatchSpanProcessor,
  OtlpHttpExporter,
  TRACE_PARENT_VERSION,
  createTracer,
  extractTraceParent,
  generateSpanId,
  generateTraceId,
  injectTraceParent,
  type FinishedSpan,
  type TraceContext,
} from "./tracing.js";

const VALID_TRACE: TraceContext = {
  traceId: "0af7651916cd43dd8448eb211c80319c",
  spanId: "b7ad6b7169203331",
  sampled: true,
};

describe("tracing identifiers", () => {
  it("generates well-formed trace and span ids", () => {
    expect(generateTraceId()).toMatch(/^[0-9a-f]{32}$/);
    expect(generateTraceId()).not.toBe(generateTraceId());
    expect(generateSpanId()).toMatch(/^[0-9a-f]{16}$/);
    expect(generateSpanId()).not.toBe(generateSpanId());
  });

  it("round-trips W3C traceparent headers", () => {
    const header = injectTraceParent(VALID_TRACE);
    expect(header.startsWith(`${TRACE_PARENT_VERSION}-`)).toBe(true);
    expect(extractTraceParent(header)).toEqual(VALID_TRACE);
  });

  it("rejects malformed or all-zero traceparent headers", () => {
    expect(extractTraceParent(undefined)).toBeNull();
    expect(extractTraceParent("not-a-traceparent")).toBeNull();
    expect(
      extractTraceParent(
        "00-00000000000000000000000000000000-b7ad6b7169203331-01",
      ),
    ).toBeNull();
    expect(
      extractTraceParent(
        "00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01",
      ),
    ).toBeNull();
  });
});

describe("tracer and sampling", () => {
  it("links child spans to their parent and records timing", () => {
    const finished: FinishedSpan[] = [];
    const tracer = createTracer({
      onEnd: (span) => {
        finished.push(span);
      },
      sampleRatio: 1,
    });
    const root = tracer.startSpan("HTTP GET /health/live");
    const child = tracer.startSpan("authorize", { parent: root.context });
    child.setAttribute("route", "/health/live");
    child.end();
    root.end();

    expect(finished).toHaveLength(2);
    expect(child.context.traceId).toBe(root.context.traceId);
    expect(child.parentSpanId).toBe(root.context.spanId);
    expect(finished[0]?.endedAtMs).toBeGreaterThanOrEqual(
      finished[0]?.startedAtMs ?? 0,
    );
  });

  it("drops unsampled spans deterministically with an injected sampler", () => {
    const finished: FinishedSpan[] = [];
    const tracer = createTracer({
      onEnd: (span) => {
        finished.push(span);
      },
      sampleRatio: 0,
    });
    tracer.startSpan("HTTP GET /health/live").end();
    expect(finished).toHaveLength(0);
  });

  it("honors the incoming sampling flag for child spans", () => {
    const finished: FinishedSpan[] = [];
    const tracer = createTracer({
      onEnd: (span) => {
        finished.push(span);
      },
      sampleRatio: 1,
    });
    tracer
      .startSpan("child", {
        parent: { ...VALID_TRACE, sampled: false },
      })
      .end();
    expect(finished).toHaveLength(0);
  });
});

describe("telemetry redaction", () => {
  it("refuses sensitive attribute keys and oversized values", () => {
    const finished: FinishedSpan[] = [];
    const tracer = createTracer({
      onEnd: (span) => {
        finished.push(span);
      },
      sampleRatio: 1,
    });
    const span = tracer.startSpan("HTTP POST /api/v1/recovery/accept");
    span.setAttribute("password", "hunter2-hunter2");
    span.setAttribute("cookie", "__Host-cvg_session=abc");
    span.setAttribute("session_token", "tok");
    span.setAttribute("recovery_token", "tok");
    span.setAttribute("invitation_token", "tok");
    span.setAttribute("patient", "data");
    span.setAttribute("tutor", "data");
    span.setAttribute("clinical_answer", "data");
    span.setAttribute("ai_prompt", "data");
    span.setAttribute("ai_response", "data");
    span.setAttribute("route", "/api/v1/recovery/accept");
    span.setAttribute("huge", "x".repeat(4096));
    span.end();

    expect(finished).toHaveLength(1);
    const attributes = finished[0]?.attributes ?? {};
    expect(attributes.route).toBe("/api/v1/recovery/accept");
    const serialized = JSON.stringify(attributes);
    for (const secret of [
      "hunter2",
      "__Host-cvg_session",
      "clinical",
      "ai_prompt",
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(JSON.stringify(attributes.huge ?? "").length).toBeLessThan(2048);
  });
});

describe("OTLP exporter and degradation", () => {
  it("posts valid OTLP/JSON to a collector and survives its absence", async () => {
    const received: Array<{ path: string; body: unknown }> = [];
    const server = createServer((request, response) => {
      let text = "";
      request.on("data", (chunk) => {
        text += chunk;
      });
      request.on("end", () => {
        received.push({ path: request.url ?? "", body: JSON.parse(text) });
        response.statusCode = 200;
        response.end("{}");
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as AddressInfo).port;
    try {
      const exporter = new OtlpHttpExporter({
        endpoint: `http://127.0.0.1:${port}/v1/traces`,
        timeoutMs: 2_000,
        serviceName: "cvg-api-test",
      });
      const finished: FinishedSpan[] = [];
      const tracer = createTracer({
        onEnd: (span) => {
          finished.push(span);
        },
        sampleRatio: 1,
      });
      tracer.startSpan("HTTP GET /health/live").end();
      await exporter.export(finished);

      expect(received).toHaveLength(1);
      expect(received[0]?.path).toBe("/v1/traces");
      const payload = received[0]?.body as {
        resourceSpans: Array<{
          scopeSpans: Array<{ spans: Array<{ traceId: string }> }>;
        }>;
      };
      expect(payload.resourceSpans[0]?.scopeSpans[0]?.spans).toHaveLength(1);
      expect(
        payload.resourceSpans[0]?.scopeSpans[0]?.spans[0]?.traceId,
      ).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("times out against a dead collector without hanging the caller", async () => {
    const exporter = new OtlpHttpExporter({
      endpoint: "http://127.0.0.1:1/v1/traces",
      timeoutMs: 50,
      serviceName: "cvg-api-test",
    });
    await expect(exporter.export([])).rejects.toThrow();
  });

  it("bounds the batch queue and counts drops when the backend stalls", async () => {
    let calls = 0;
    const stalled = {
      export: async () => {
        calls += 1;
        throw new Error("collector down");
      },
    };
    const processor = new BatchSpanProcessor(stalled, { maxQueue: 4 });
    const tracer = createTracer({
      onEnd: (span) => {
        void processor.onEnd(span);
      },
      sampleRatio: 1,
    });
    for (let index = 0; index < 10; index += 1) {
      tracer.startSpan(`span-${index}`).end();
    }
    await processor.flush();
    expect(calls).toBeLessThanOrEqual(4);
    expect(processor.dropped()).toBeGreaterThan(0);
    await processor.close();
  });
});

describe("batch span processor scheduled flush (AAA-FINAL-006)", () => {
  it("exports queued spans on a timer without waiting for close", async () => {
    const exported: FinishedSpan[][] = [];
    const processor = new BatchSpanProcessor(
      {
        export: async (spans) => {
          exported.push([...spans]);
        },
      },
      { flushIntervalMs: 10 },
    );
    const tracer = createTracer({
      onEnd: (span) => {
        void processor.onEnd(span);
      },
      sampleRatio: 1,
    });
    tracer.startSpan("timed-span").end();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(exported.length).toBeGreaterThanOrEqual(1);
    expect(exported.flat().map((span) => span.name)).toContain("timed-span");
    await processor.close();
  });

  it("rejects non-positive flush intervals fail-closed", () => {
    expect(
      () =>
        new BatchSpanProcessor(
          { export: async () => undefined },
          { flushIntervalMs: 0 },
        ),
    ).toThrow("flushIntervalMs");
  });
});
