import { randomBytes } from "node:crypto";

import { createMetricsPort } from "./metrics.js";

export { createMetricsPort } from "./metrics.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type SafeFieldValue = string | number | boolean | null;

export type LogFields = Readonly<Record<string, SafeFieldValue>>;

export type LogRecord = Readonly<{
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly event: string;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly fields?: LogFields;
}>;

export type LogContext = Readonly<{
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly fields?: LogFields;
}>;

export type LogSink = (record: LogRecord) => void;

export type Logger = Readonly<{
  readonly debug: (event: string, context?: LogContext) => void;
  readonly info: (event: string, context?: LogContext) => void;
  readonly warn: (event: string, context?: LogContext) => void;
  readonly error: (event: string, context?: LogContext) => void;
  readonly child: (context: LogContext) => Logger;
}>;

export type MetricLabels = Readonly<Record<string, string>>;

export type MetricsSnapshot = Readonly<{
  readonly counters: readonly Readonly<{
    readonly name: string;
    readonly value: number;
    readonly labels: MetricLabels;
  }>[];
  readonly histograms: readonly Readonly<{
    readonly name: string;
    readonly count: number;
    readonly sum: number;
    readonly min: number;
    readonly max: number;
    readonly labels: MetricLabels;
  }>[];
}>;

export type MetricsPort = Readonly<{
  readonly increment: (
    name: string,
    labels?: MetricLabels,
    amount?: number,
  ) => void;
  readonly observe: (
    name: string,
    value: number,
    labels?: MetricLabels,
  ) => void;
  readonly snapshot: () => MetricsSnapshot;
  readonly prometheus: () => string;
  readonly quantile: (
    name: string,
    quantile: number,
    labels?: MetricLabels,
  ) => number | null;
}>;

export type TraceSpan = Readonly<{
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly service: string;
  readonly name: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly status: "ok" | "error";
  readonly attributes: Readonly<{
    readonly method?: string;
    readonly route?: string;
    readonly status?: number;
    readonly outcome?: string;
  }>;
}>;

export type TraceSpanInput = Readonly<{
  readonly traceId?: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly status: "ok" | "error";
  readonly attributes?: Readonly<{
    readonly method?: string;
    readonly route?: string;
    readonly status?: number;
    readonly outcome?: string;
  }>;
}>;

export type TraceSink = (span: TraceSpan) => void;

type TraceFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type TracesPort = Readonly<{
  readonly record: (span: TraceSpanInput) => void;
  readonly snapshot: () => readonly TraceSpan[];
}>;

export type ObservabilityOptions = Readonly<{
  readonly service: string;
  readonly clock?: () => Date;
  readonly sink?: LogSink;
  readonly minimumLevel?: LogLevel;
  readonly traceSink?: TraceSink;
}>;

export type CollectionPolicy = Readonly<{
  readonly screenRecording: false;
  readonly sessionReplay: false;
  readonly behavioralProfiling: false;
  readonly rawPayloads: false;
}>;

export const nonInvasiveCollectionPolicy: CollectionPolicy = Object.freeze({
  screenRecording: false,
  sessionReplay: false,
  behavioralProfiling: false,
  rawPayloads: false,
});

export type Observability = Readonly<{
  readonly logger: Logger;
  readonly metrics: MetricsPort;
  readonly traces: TracesPort;
  readonly collectionPolicy: CollectionPolicy;
}>;

const MAX_STRING_LENGTH = 160;
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_DURATION_MS = 3_600_000;

const allowedFieldKeys = new Set([
  "account_status",
  "attempts",
  "batch_size",
  "claimed",
  "collection",
  "count",
  "dependency",
  "duration_ms",
  "error_code",
  "event_type",
  "failed",
  "health",
  "job",
  "method",
  "operation",
  "outcome",
  "processed",
  "provider",
  "queue",
  "reason",
  "request_status",
  "retryable",
  "route",
  "status",
  "version",
]);

const levelPriority: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function boundedString(value: string, maxLength = MAX_STRING_LENGTH): string {
  return removeControlCharacters(value).trim().slice(0, maxLength);
}

function removeControlCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("");
}

function safeIdentifier(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = removeControlCharacters(value).trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_IDENTIFIER_LENGTH ||
    !/^[a-zA-Z0-9._:-]+$/.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function safeTraceRoute(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const route = boundedString(value, MAX_IDENTIFIER_LENGTH);
  return /^\/[a-zA-Z0-9_/:.-]+$/u.test(route) ? route : undefined;
}

function safeTraceIdentifier(
  value: unknown,
  length: 16 | 32,
): string | undefined {
  if (
    typeof value !== "string" ||
    !new RegExp(`^[a-f0-9]{${length}}$`, "u").test(value)
  ) {
    return undefined;
  }
  return value;
}

function randomTraceIdentifier(bytes: 8 | 16): string {
  return randomBytes(bytes).toString("hex");
}

export function sanitizeCorrelationId(value: unknown): string | undefined {
  return safeIdentifier(value);
}

function safeEvent(value: string): string {
  const normalized = boundedString(value, MAX_IDENTIFIER_LENGTH);
  return /^[a-zA-Z0-9_.:-]+$/.test(normalized) ? normalized : "invalid_event";
}

function safeService(value: string): string {
  const normalized = safeIdentifier(value);
  return normalized ?? "unknown";
}

function safeFieldKey(value: string): string | undefined {
  const normalized = boundedString(value, 64).toLowerCase();
  return allowedFieldKeys.has(normalized) ? normalized : undefined;
}

function safeFieldValue(value: SafeFieldValue): SafeFieldValue | undefined {
  if (typeof value === "string") return boundedString(value);
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(-1_000_000_000, value) : undefined;
  }
  if (typeof value === "boolean" || value === null) return value;
  return undefined;
}

function sanitizeFields(fields: LogFields | undefined): LogFields | undefined {
  if (fields === undefined) return undefined;

  const entries = Object.entries(fields).flatMap(([key, value]) => {
    const safeKey = safeFieldKey(key);
    const safeValue = safeFieldValue(value);
    return safeKey === undefined || safeValue === undefined
      ? []
      : [[safeKey, safeValue] as const];
  });
  if (entries.length === 0) return undefined;
  return Object.freeze(Object.fromEntries(entries) as LogFields);
}

function safeDuration(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.min(MAX_DURATION_MS, value);
}

function mergeContexts(base: LogContext, next: LogContext): LogContext {
  const fields = { ...(base.fields ?? {}), ...(next.fields ?? {}) };
  return Object.freeze({
    ...(base.requestId === undefined && next.requestId === undefined
      ? {}
      : { requestId: next.requestId ?? base.requestId }),
    ...(base.correlationId === undefined && next.correlationId === undefined
      ? {}
      : { correlationId: next.correlationId ?? base.correlationId }),
    ...(base.durationMs === undefined && next.durationMs === undefined
      ? {}
      : { durationMs: next.durationMs ?? base.durationMs }),
    ...(Object.keys(fields).length === 0 ? {} : { fields }),
  });
}

function defaultSink(record: LogRecord): void {
  const line = JSON.stringify(record);
  if (record.level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

function createLogger(
  options: ObservabilityOptions,
  baseContext: LogContext = {},
): Logger {
  const service = safeService(options.service);
  const clock = options.clock ?? (() => new Date());
  const sink = options.sink ?? defaultSink;
  const minimumLevel = options.minimumLevel ?? "info";
  const minimumPriority = levelPriority[minimumLevel];

  function emit(
    level: LogLevel,
    event: string,
    context: LogContext = {},
  ): void {
    if (levelPriority[level] < minimumPriority) return;

    const merged = mergeContexts(baseContext, context);
    const fields = sanitizeFields(merged.fields);
    const requestId = sanitizeCorrelationId(merged.requestId);
    const correlationId = sanitizeCorrelationId(merged.correlationId);
    const durationMs = safeDuration(merged.durationMs);
    const record: LogRecord = Object.freeze({
      timestamp: clock().toISOString(),
      level,
      service,
      event: safeEvent(event),
      ...(requestId === undefined ? {} : { requestId }),
      ...(correlationId === undefined ? {} : { correlationId }),
      ...(durationMs === undefined ? {} : { durationMs }),
      ...(fields === undefined ? {} : { fields }),
    });
    sink(record);
  }

  return Object.freeze({
    debug: (event: string, context?: LogContext) =>
      emit("debug", event, context),
    info: (event: string, context?: LogContext) => emit("info", event, context),
    warn: (event: string, context?: LogContext) => emit("warn", event, context),
    error: (event: string, context?: LogContext) =>
      emit("error", event, context),
    child: (context: LogContext) =>
      createLogger(options, mergeContexts(baseContext, context)),
  });
}

function safeMetricName(value: string): string {
  const normalized = boundedString(value, MAX_IDENTIFIER_LENGTH).toLowerCase();
  return /^[a-z][a-z0-9_.:-]*$/.test(normalized)
    ? normalized
    : "invalid_metric";
}

function sanitizeLabels(labels: MetricLabels | undefined): MetricLabels {
  const entries = Object.entries(labels ?? {}).flatMap(([key, value]) => {
    const safeKey = safeFieldKey(key);
    const safeValue =
      safeKey === "route"
        ? (() => {
            const route = boundedString(value, MAX_IDENTIFIER_LENGTH);
            return /^\/[a-zA-Z0-9_/:.-]+$/u.test(route) ? route : undefined;
          })()
        : safeIdentifier(value);
    return safeKey === undefined || safeValue === undefined
      ? []
      : [[safeKey, safeValue] as const];
  });
  return Object.freeze(Object.fromEntries(entries) as MetricLabels);
}

function labelsKey(labels: MetricLabels): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(labels).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
}

function prometheusMetricName(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9_]/gu, "_").toLowerCase();
  return /^[a-zA-Z_]/u.test(normalized) ? normalized : `metric_${normalized}`;
}

function prometheusCounterName(value: string): string {
  const name = prometheusMetricName(value);
  return name.endsWith("_total") ? name : `${name}_total`;
}

function prometheusHistogramName(
  value: string,
): Readonly<{ readonly name: string; readonly scale: number }> {
  const name = prometheusMetricName(value);
  return name.endsWith("_ms")
    ? Object.freeze({
        name: `${name.slice(0, -3)}_seconds`,
        scale: 0.001,
      })
    : Object.freeze({ name, scale: 1 });
}

function prometheusLabelValue(value: string): string {
  return value
    .replace(/\\/gu, "\\\\")
    .replace(/\n/gu, "\\n")
    .replace(/"/gu, '\\"');
}

function compareLexical(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function prometheusLabels(labels: MetricLabels): string {
  const entries = Object.entries(sanitizeLabels(labels)).sort(
    ([left], [right]) => compareLexical(left, right),
  );
  if (entries.length === 0) return "";
  return `{${entries
    .map(([key, value]) => `${key}="${prometheusLabelValue(value)}"`)
    .join(",")}}`;
}

function comparePrometheusSeries(
  left: Readonly<{ readonly name: string; readonly labels: MetricLabels }>,
  right: Readonly<{ readonly name: string; readonly labels: MetricLabels }>,
  nameResolver: (value: string) => string = prometheusMetricName,
): number {
  const nameOrder = compareLexical(
    nameResolver(left.name),
    nameResolver(right.name),
  );
  return nameOrder === 0
    ? compareLexical(
        prometheusLabels(left.labels),
        prometheusLabels(right.labels),
      )
    : nameOrder;
}

function appendPrometheusDescriptor(
  lines: string[],
  name: string,
  type: "counter" | "gauge" | "histogram",
): void {
  lines.push(`# HELP ${name} CVG metric ${name}`);
  lines.push(`# TYPE ${name} ${type}`);
}

function registerPrometheusFamily(
  families: Map<string, Readonly<{ source: string; type: string }>>,
  name: string,
  source: string,
  type: string,
): void {
  const existing = families.get(name);
  if (
    existing !== undefined &&
    (existing.source !== source || existing.type !== type)
  ) {
    throw new Error(`Prometheus metric family collision: ${name}`);
  }
  families.set(name, Object.freeze({ source, type }));
}

type PrometheusQuantileResolver = (
  name: string,
  quantile: number,
  labels: MetricLabels,
) => number | null;

function registerPrometheusFamilies(snapshot: MetricsSnapshot): void {
  const families = new Map<
    string,
    Readonly<{ readonly source: string; readonly type: string }>
  >();
  for (const counter of snapshot.counters) {
    registerPrometheusFamily(
      families,
      prometheusCounterName(counter.name),
      counter.name,
      "counter",
    );
  }
  for (const histogram of snapshot.histograms) {
    const descriptor = prometheusHistogramName(histogram.name);
    registerPrometheusFamily(
      families,
      descriptor.name,
      histogram.name,
      "histogram",
    );
    registerPrometheusFamily(
      families,
      `${descriptor.name}_p95`,
      `${histogram.name}:p95`,
      "gauge",
    );
  }
}

function appendPrometheusCounters(
  lines: string[],
  counters: MetricsSnapshot["counters"],
): void {
  let counterFamily: string | null = null;
  const orderedCounters = [...counters].sort((left, right) =>
    comparePrometheusSeries(left, right, prometheusCounterName),
  );
  for (const counter of orderedCounters) {
    const name = prometheusCounterName(counter.name);
    if (name !== counterFamily) {
      appendPrometheusDescriptor(lines, name, "counter");
      counterFamily = name;
    }
    lines.push(`${name}${prometheusLabels(counter.labels)} ${counter.value}`);
  }
}

function appendPrometheusHistograms(
  lines: string[],
  histograms: MetricsSnapshot["histograms"],
  quantileResolver?: PrometheusQuantileResolver,
): void {
  let histogramFamily: string | null = null;
  let histogramP95Family: string | null = null;
  const orderedHistograms = [...histograms].sort((left, right) =>
    comparePrometheusSeries(
      left,
      right,
      (value) => prometheusHistogramName(value).name,
    ),
  );
  for (const histogram of orderedHistograms) {
    const descriptor = prometheusHistogramName(histogram.name);
    const name = descriptor.name;
    const labels = prometheusLabels(histogram.labels);
    if (name !== histogramFamily) {
      appendPrometheusDescriptor(lines, name, "histogram");
      histogramFamily = name;
    }
    lines.push(`${name}_count${labels} ${histogram.count}`);
    lines.push(`${name}_sum${labels} ${histogram.sum * descriptor.scale}`);
    const p95 = quantileResolver?.(histogram.name, 0.95, histogram.labels);
    if (p95 !== null && p95 !== undefined) {
      const p95Name = `${name}_p95`;
      if (p95Name !== histogramP95Family) {
        appendPrometheusDescriptor(lines, p95Name, "gauge");
        histogramP95Family = p95Name;
      }
      lines.push(`${p95Name}${labels} ${p95 * descriptor.scale}`);
    }
  }
}

export function renderPrometheusMetrics(
  snapshot: MetricsSnapshot,
  quantileResolver?: PrometheusQuantileResolver,
): string {
  const lines: string[] = [];
  registerPrometheusFamilies(snapshot);
  appendPrometheusCounters(lines, snapshot.counters);
  appendPrometheusHistograms(lines, snapshot.histograms, quantileResolver);
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

function createTraces(options: ObservabilityOptions): TracesPort {
  let spans: readonly TraceSpan[] = [];
  const service = safeService(options.service);

  const record = (input: TraceSpanInput): void => {
    const parentSpanId = safeTraceIdentifier(input.parentSpanId, 16);
    const traceId = safeTraceIdentifier(input.traceId, 32);
    const route = safeTraceRoute(input.attributes?.route);
    const durationMs = Math.max(
      0,
      Math.min(
        MAX_DURATION_MS,
        input.endedAt.getTime() - input.startedAt.getTime(),
      ),
    );
    const span: TraceSpan = Object.freeze({
      traceId: traceId ?? randomTraceIdentifier(16),
      spanId: randomTraceIdentifier(8),
      ...(parentSpanId === undefined ? {} : { parentSpanId }),
      service,
      name: safeEvent(input.name),
      startedAt: input.startedAt.toISOString(),
      endedAt: input.endedAt.toISOString(),
      durationMs,
      status: input.status,
      attributes: Object.freeze({
        ...(input.attributes?.method === undefined
          ? {}
          : { method: boundedString(input.attributes.method, 16) }),
        ...(input.attributes?.route === undefined
          ? {}
          : route === undefined
            ? {}
            : { route }),
        ...(input.attributes?.status === undefined
          ? {}
          : { status: Math.max(100, Math.min(599, input.attributes.status)) }),
        ...(input.attributes?.outcome === undefined
          ? {}
          : { outcome: safeEvent(input.attributes.outcome) }),
      }),
    });
    spans = [...spans, span].slice(-10_000);
    options.traceSink?.(span);
  };

  return Object.freeze({
    record,
    snapshot: () =>
      Object.freeze(spans.map((span) => Object.freeze({ ...span }))),
  });
}

function traceTimestampNanoseconds(value: string): string {
  return (BigInt(Date.parse(value)) * 1_000_000n).toString();
}

function otlpAttribute(
  key: string,
  value: string | number,
): Readonly<{
  readonly key: string;
  readonly value: Readonly<Record<string, string>>;
}> {
  return Object.freeze({
    key,
    value:
      typeof value === "number"
        ? Object.freeze({ intValue: String(value) })
        : Object.freeze({ stringValue: value }),
  });
}

export function createOtlpHttpTraceSink(
  endpoint: string,
  fetchImpl: TraceFetch = globalThis.fetch,
): TraceSink {
  const normalizedEndpoint = endpoint.replace(/\/$/u, "");
  const target = normalizedEndpoint.endsWith("/v1/traces")
    ? normalizedEndpoint
    : `${normalizedEndpoint}/v1/traces`;
  return (span: TraceSpan): void => {
    const attributes = [
      ...(span.attributes.method === undefined
        ? []
        : [otlpAttribute("http.method", span.attributes.method)]),
      ...(span.attributes.route === undefined
        ? []
        : [otlpAttribute("http.route", span.attributes.route)]),
      ...(span.attributes.status === undefined
        ? []
        : [otlpAttribute("http.status_code", span.attributes.status)]),
      ...(span.attributes.outcome === undefined
        ? []
        : [otlpAttribute("cvg.outcome", span.attributes.outcome)]),
    ];
    const otlpSpan = {
      traceId: span.traceId,
      spanId: span.spanId,
      ...(span.parentSpanId === undefined
        ? {}
        : { parentSpanId: span.parentSpanId }),
      name: span.name,
      kind: 2,
      startTimeUnixNano: traceTimestampNanoseconds(span.startedAt),
      endTimeUnixNano: traceTimestampNanoseconds(span.endedAt),
      attributes,
      status: { code: span.status === "ok" ? 1 : 2 },
    };
    const body = JSON.stringify({
      resourceSpans: [
        {
          resource: {
            attributes: [otlpAttribute("service.name", span.service)],
          },
          scopeSpans: [
            {
              scope: { name: "cvg.observability" },
              spans: [otlpSpan],
            },
          ],
        },
      ],
    });
    void fetchImpl(target, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body,
    })
      .then((response) => {
        if (!response.ok) throw new Error("OTLP trace export failed");
      })
      .catch(() => undefined);
  };
}

export function createObservability(
  options: ObservabilityOptions,
): Observability {
  return Object.freeze({
    logger: createLogger(options),
    metrics: createMetricsPort({
      safeMetricName,
      sanitizeLabels,
      labelsKey,
      renderPrometheusMetrics,
    }),
    traces: createTraces(options),
    collectionPolicy: nonInvasiveCollectionPolicy,
  });
}
