import { randomBytes } from "node:crypto";

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

export type Observability = Readonly<{
  readonly logger: Logger;
  readonly metrics: MetricsPort;
  readonly traces: TracesPort;
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

function prometheusLabelValue(value: string): string {
  return value
    .replace(/\\/gu, "\\\\")
    .replace(/\n/gu, "\\n")
    .replace(/"/gu, '\\"');
}

function prometheusLabels(labels: MetricLabels): string {
  const entries = Object.entries(sanitizeLabels(labels)).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  if (entries.length === 0) return "";
  return `{${entries
    .map(([key, value]) => `${key}="${prometheusLabelValue(value)}"`)
    .join(",")}}`;
}

export function renderPrometheusMetrics(snapshot: MetricsSnapshot): string {
  const lines: string[] = [];
  for (const counter of snapshot.counters) {
    const name = prometheusMetricName(counter.name);
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name}${prometheusLabels(counter.labels)} ${counter.value}`);
  }
  for (const histogram of snapshot.histograms) {
    const name = prometheusMetricName(histogram.name);
    const labels = prometheusLabels(histogram.labels);
    lines.push(`# TYPE ${name}_count gauge`);
    lines.push(`${name}_count${labels} ${histogram.count}`);
    lines.push(`# TYPE ${name}_sum gauge`);
    lines.push(`${name}_sum${labels} ${histogram.sum}`);
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

function createMetrics(): MetricsPort {
  type Counter = Readonly<{
    readonly name: string;
    readonly value: number;
    readonly labels: MetricLabels;
  }>;
  type Histogram = Readonly<{
    readonly name: string;
    readonly count: number;
    readonly sum: number;
    readonly min: number;
    readonly max: number;
    readonly labels: MetricLabels;
  }>;

  let counters: readonly Counter[] = [];
  let histograms: readonly Histogram[] = [];
  let observations: readonly Readonly<{
    readonly name: string;
    readonly value: number;
    readonly labels: MetricLabels;
  }>[] = [];

  function increment(
    name: string,
    labels: MetricLabels = {},
    amount = 1,
  ): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const safeName = safeMetricName(name);
    const safeLabels = sanitizeLabels(labels);
    const key = labelsKey(safeLabels);
    const index = counters.findIndex(
      (counter) =>
        counter.name === safeName && labelsKey(counter.labels) === key,
    );
    if (index === -1) {
      counters = [
        ...counters,
        Object.freeze({ name: safeName, value: amount, labels: safeLabels }),
      ];
      return;
    }
    counters = counters.map((counter, counterIndex) =>
      counterIndex === index
        ? Object.freeze({ ...counter, value: counter.value + amount })
        : counter,
    );
  }

  function observe(
    name: string,
    value: number,
    labels: MetricLabels = {},
  ): void {
    if (!Number.isFinite(value) || value < 0) return;
    const safeName = safeMetricName(name);
    const safeLabels = sanitizeLabels(labels);
    observations = [
      ...observations,
      Object.freeze({ name: safeName, value, labels: safeLabels }),
    ].slice(-10_000);
    const key = labelsKey(safeLabels);
    const index = histograms.findIndex(
      (histogram) =>
        histogram.name === safeName && labelsKey(histogram.labels) === key,
    );
    if (index === -1) {
      histograms = [
        ...histograms,
        Object.freeze({
          name: safeName,
          count: 1,
          sum: value,
          min: value,
          max: value,
          labels: safeLabels,
        }),
      ];
      return;
    }
    histograms = histograms.map((histogram, histogramIndex) =>
      histogramIndex === index
        ? Object.freeze({
            ...histogram,
            count: histogram.count + 1,
            sum: histogram.sum + value,
            min: Math.min(histogram.min, value),
            max: Math.max(histogram.max, value),
          })
        : histogram,
    );
  }

  const snapshot = (): MetricsSnapshot =>
    Object.freeze({
      counters: Object.freeze(
        counters.map((counter) =>
          Object.freeze({ ...counter, labels: { ...counter.labels } }),
        ),
      ),
      histograms: Object.freeze(
        histograms.map((histogram) =>
          Object.freeze({ ...histogram, labels: { ...histogram.labels } }),
        ),
      ),
    });

  const quantile = (
    name: string,
    quantileValue: number,
    labels?: MetricLabels,
  ): number | null => {
    if (
      !Number.isFinite(quantileValue) ||
      quantileValue < 0 ||
      quantileValue > 1
    ) {
      return null;
    }
    const safeName = safeMetricName(name);
    const safeLabels =
      labels === undefined ? undefined : sanitizeLabels(labels);
    const values = observations
      .filter(
        (observation) =>
          observation.name === safeName &&
          (safeLabels === undefined ||
            labelsKey(observation.labels) === labelsKey(safeLabels)),
      )
      .map((observation) => observation.value)
      .sort((left, right) => left - right);
    if (values.length === 0) return null;
    const index = Math.min(
      values.length - 1,
      Math.max(0, Math.ceil(quantileValue * values.length) - 1),
    );
    return values[index] ?? null;
  };

  return Object.freeze({
    increment,
    observe,
    snapshot,
    prometheus: () => renderPrometheusMetrics(snapshot()),
    quantile,
  });
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
    metrics: createMetrics(),
    traces: createTraces(options),
  });
}
