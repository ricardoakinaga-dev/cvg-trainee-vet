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
  readonly traceId?: string;
  readonly spanId?: string;
  readonly durationMs?: number;
  readonly fields?: LogFields;
}>;

export type LogContext = Readonly<{
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
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
}>;

export type ObservabilityOptions = Readonly<{
  readonly service: string;
  readonly clock?: () => Date;
  readonly sink?: LogSink;
  readonly minimumLevel?: LogLevel;
}>;

export type Observability = Readonly<{
  readonly logger: Logger;
  readonly metrics: MetricsPort;
}>;

const MAX_STRING_LENGTH = 160;
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_DURATION_MS = 3_600_000;

const allowedFieldKeys = new Set([
  "account_status",
  "attempts",
  "batch_size",
  "claimed",
  "classification",
  "collection",
  "count",
  "delay_ms",
  "dependency",
  "duration_ms",
  "error_code",
  "event_type",
  "failed",
  "health",
  "job",
  "method",
  "max_attempts",
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

export function sanitizeCorrelationId(value: unknown): string | undefined {
  return safeIdentifier(value);
}

function sanitizeTraceId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(normalized) ? normalized : undefined;
}

function sanitizeSpanId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{16}$/.test(normalized) ? normalized : undefined;
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
    ...(base.traceId === undefined && next.traceId === undefined
      ? {}
      : { traceId: next.traceId ?? base.traceId }),
    ...(base.spanId === undefined && next.spanId === undefined
      ? {}
      : { spanId: next.spanId ?? base.spanId }),
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
    const traceId = sanitizeTraceId(merged.traceId);
    const spanId = sanitizeSpanId(merged.spanId);
    const durationMs = safeDuration(merged.durationMs);
    const record: LogRecord = Object.freeze({
      timestamp: clock().toISOString(),
      level,
      service,
      event: safeEvent(event),
      ...(requestId === undefined ? {} : { requestId }),
      ...(correlationId === undefined ? {} : { correlationId }),
      ...(traceId === undefined ? {} : { traceId }),
      ...(spanId === undefined ? {} : { spanId }),
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

  return Object.freeze({
    increment,
    observe,
    snapshot,
    prometheus: () => renderPrometheusMetrics(snapshot()),
  });
}

export function createObservability(
  options: ObservabilityOptions,
): Observability {
  return Object.freeze({
    logger: createLogger(options),
    metrics: createMetrics(),
  });
}
