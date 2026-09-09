import { randomBytes } from "node:crypto";

export const TRACE_PARENT_VERSION = "00";

export type TraceContext = Readonly<{
  readonly traceId: string;
  readonly spanId: string;
  readonly sampled: boolean;
}>;

export type SpanStatus = "unset" | "ok" | "error";

export type SpanAttributeValue = string | number | boolean;

export type FinishedSpan = Readonly<{
  readonly name: string;
  readonly context: TraceContext;
  readonly parentSpanId?: string;
  readonly startedAtMs: number;
  readonly endedAtMs: number;
  readonly attributes: Readonly<Record<string, SpanAttributeValue>>;
  readonly status: SpanStatus;
}>;

export type Span = Readonly<{
  readonly context: TraceContext;
  readonly parentSpanId?: string;
  readonly setAttribute: (key: string, value: SpanAttributeValue) => void;
  readonly setStatus: (status: SpanStatus) => void;
  readonly end: () => void;
}>;

export type SpanExporter = Readonly<{
  readonly export: (spans: readonly FinishedSpan[]) => Promise<void>;
}>;

const MAX_ATTRIBUTES_PER_SPAN = 32;
const MAX_ATTRIBUTE_VALUE_LENGTH = 1024;

const FORBIDDEN_ATTRIBUTE_PATTERN =
  /password|passwd|cookie|session[_-]?token|recovery[_-]?token|invitation[_-]?token|patient|tutor|clinical|ai[_-]?prompt|ai[_-]?response|secret|authorization/i;

export function generateTraceId(): string {
  return randomBytes(16).toString("hex");
}

export function generateSpanId(): string {
  return randomBytes(8).toString("hex");
}

function isValidTraceId(value: string): boolean {
  return /^[0-9a-f]{32}$/.test(value) && value !== "0".repeat(32);
}

function isValidSpanId(value: string): boolean {
  return /^[0-9a-f]{16}$/.test(value) && value !== "0".repeat(16);
}

export function injectTraceParent(context: TraceContext): string {
  return `${TRACE_PARENT_VERSION}-${context.traceId}-${context.spanId}-${context.sampled ? "01" : "00"}`;
}

export function extractTraceParent(
  header: string | undefined,
): TraceContext | null {
  if (header === undefined) return null;
  const match =
    /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/u.exec(
      header.trim(),
    );
  if (match?.[1] !== TRACE_PARENT_VERSION) return null;
  const [, , traceId, spanId, flags] = match;
  if (
    traceId === undefined ||
    spanId === undefined ||
    flags === undefined ||
    !isValidTraceId(traceId) ||
    !isValidSpanId(spanId)
  ) {
    return null;
  }
  return Object.freeze({
    traceId,
    spanId,
    sampled: (Number.parseInt(flags, 16) & 1) === 1,
  });
}

function sanitizeAttribute(
  key: string,
  value: SpanAttributeValue,
): readonly [string, SpanAttributeValue] | null {
  if (typeof key !== "string" || key.length === 0 || key.length > 128) {
    return null;
  }
  if (FORBIDDEN_ATTRIBUTE_PATTERN.test(key)) return null;
  if (typeof value === "string") {
    const trimmed = value.slice(0, MAX_ATTRIBUTE_VALUE_LENGTH);
    return FORBIDDEN_ATTRIBUTE_PATTERN.test(trimmed)
      ? null
      : ([key, trimmed] as const);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? ([key, value] as const) : null;
  }
  return [key, value] as const;
}

export type TracerOptions = Readonly<{
  readonly sampleRatio?: number;
  readonly random?: () => number;
  readonly clock?: () => number;
  readonly onEnd?: (span: FinishedSpan) => void;
}>;

export type StartSpanOptions = Readonly<{
  readonly parent?: TraceContext;
  readonly attributes?: Readonly<Record<string, SpanAttributeValue>>;
}>;

export type Tracer = Readonly<{
  readonly startSpan: (name: string, options?: StartSpanOptions) => Span;
}>;

function noopSpan(context: TraceContext, parentSpanId?: string): Span {
  return Object.freeze({
    context,
    ...(parentSpanId === undefined ? {} : { parentSpanId }),
    setAttribute: () => undefined,
    setStatus: () => undefined,
    end: () => undefined,
  });
}

export function createTracer(options: TracerOptions = {}): Tracer {
  const sampleRatio = options.sampleRatio ?? 1;
  if (!(sampleRatio >= 0 && sampleRatio <= 1)) {
    throw new RangeError("sampleRatio must be between 0 and 1");
  }
  const random = options.random ?? Math.random;
  const clock = options.clock ?? (() => Date.now());
  const onEnd = options.onEnd ?? (() => undefined);

  function shouldSample(parent: TraceContext | undefined): boolean {
    if (parent !== undefined) return parent.sampled;
    if (sampleRatio >= 1) return true;
    if (sampleRatio <= 0) return false;
    return random() < sampleRatio;
  }

  function startSpan(name: string, spanOptions: StartSpanOptions = {}): Span {
    const traceId = spanOptions.parent?.traceId ?? generateTraceId();
    const context: TraceContext = Object.freeze({
      traceId,
      spanId: generateSpanId(),
      sampled: shouldSample(spanOptions.parent),
    });
    const startedAtMs = clock();
    if (!context.sampled) {
      return noopSpan(context, spanOptions.parent?.spanId);
    }
    const attributes = new Map<string, SpanAttributeValue>();
    for (const [key, value] of Object.entries(spanOptions.attributes ?? {})) {
      const sanitized = sanitizeAttribute(key, value);
      if (sanitized !== null && attributes.size < MAX_ATTRIBUTES_PER_SPAN) {
        attributes.set(sanitized[0], sanitized[1]);
      }
    }
    let status: SpanStatus = "unset";
    let ended = false;
    return Object.freeze({
      context,
      ...(spanOptions.parent === undefined
        ? {}
        : { parentSpanId: spanOptions.parent.spanId }),
      setAttribute: (key: string, value: SpanAttributeValue) => {
        if (ended) return;
        const sanitized = sanitizeAttribute(key, value);
        if (sanitized !== null && attributes.size < MAX_ATTRIBUTES_PER_SPAN) {
          attributes.set(sanitized[0], sanitized[1]);
        }
      },
      setStatus: (next: SpanStatus) => {
        if (!ended) status = next;
      },
      end: () => {
        if (ended) return;
        ended = true;
        onEnd(
          Object.freeze({
            name,
            context,
            ...(spanOptions.parent === undefined
              ? {}
              : { parentSpanId: spanOptions.parent.spanId }),
            startedAtMs,
            endedAtMs: clock(),
            attributes: Object.freeze(Object.fromEntries(attributes)),
            status,
          }),
        );
      },
    });
  }

  return Object.freeze({ startSpan });
}

export type OtlpHttpExporterOptions = Readonly<{
  readonly endpoint: string;
  readonly timeoutMs?: number;
  readonly serviceName?: string;
}>;

function otlpAttributes(
  attributes: Readonly<Record<string, SpanAttributeValue>>,
): Array<{
  key: string;
  value: { stringValue?: string; intValue?: string; boolValue?: boolean };
}> {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value:
      typeof value === "string"
        ? { stringValue: value }
        : typeof value === "number"
          ? { intValue: String(Math.trunc(value)) }
          : { boolValue: value },
  }));
}

function toOtlpPayload(
  spans: readonly FinishedSpan[],
  serviceName: string,
): unknown {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: serviceName } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "cvg-tracing" },
            spans: spans.map((span) => ({
              traceId: span.context.traceId,
              spanId: span.context.spanId,
              parentSpanId: span.parentSpanId ?? "",
              name: span.name,
              startTimeUnixNano: String(span.startedAtMs * 1_000_000),
              endTimeUnixNano: String(span.endedAtMs * 1_000_000),
              attributes: otlpAttributes(span.attributes),
              status: {
                code:
                  span.status === "ok" ? 1 : span.status === "error" ? 2 : 0,
              },
            })),
          },
        ],
      },
    ],
  };
}

export class OtlpHttpExporter {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly serviceName: string;

  public constructor(options: OtlpHttpExporterOptions) {
    if (!/^https?:\/\//u.test(options.endpoint)) {
      throw new RangeError("OTLP endpoint must use http(s)");
    }
    if (
      options.timeoutMs !== undefined &&
      (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1)
    ) {
      throw new RangeError("timeoutMs must be a positive integer");
    }
    this.endpoint = options.endpoint;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.serviceName = options.serviceName ?? "cvg";
  }

  public async export(spans: readonly FinishedSpan[]): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    timer.unref?.();
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toOtlpPayload(spans, this.serviceName)),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`OTLP export failed with status ${response.status}`);
      }
      await response.text().catch(() => undefined);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error("OTLP export timed out");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export type BatchSpanProcessorOptions = Readonly<{
  readonly maxQueue?: number;
}>;

const DEFAULT_MAX_QUEUE = 2048;

export class BatchSpanProcessor {
  private readonly exporter: SpanExporter;
  private readonly maxQueue: number;
  private queue: FinishedSpan[] = [];
  private droppedSpans = 0;
  private closed = false;

  public constructor(
    exporter: SpanExporter,
    options: BatchSpanProcessorOptions = {},
  ) {
    if (
      options.maxQueue !== undefined &&
      (!Number.isSafeInteger(options.maxQueue) || options.maxQueue < 1)
    ) {
      throw new RangeError("maxQueue must be a positive integer");
    }
    this.exporter = exporter;
    this.maxQueue = options.maxQueue ?? DEFAULT_MAX_QUEUE;
  }

  public async onEnd(span: FinishedSpan): Promise<void> {
    if (this.closed) {
      this.droppedSpans += 1;
      return;
    }
    if (this.queue.length >= this.maxQueue) {
      this.queue.shift();
      this.droppedSpans += 1;
    }
    this.queue.push(span);
  }

  public dropped(): number {
    return this.droppedSpans;
  }

  public pending(): number {
    return this.queue.length;
  }

  public async flush(): Promise<void> {
    const batch = this.queue;
    this.queue = [];
    const limit = this.maxQueue;
    for (let index = 0; index < batch.length; index += limit) {
      const chunk = batch.slice(index, index + limit);
      try {
        await this.exporter.export(chunk);
      } catch {
        this.droppedSpans += chunk.length;
      }
    }
  }

  public async close(): Promise<void> {
    this.closed = true;
    await this.flush();
  }
}
