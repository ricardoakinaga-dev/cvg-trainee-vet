import type {
  MetricLabels,
  MetricsPort,
  MetricsSnapshot,
} from "./observability.js";

export type MetricsPortDependencies = Readonly<{
  readonly safeMetricName: (value: string) => string;
  readonly sanitizeLabels: (labels: MetricLabels | undefined) => MetricLabels;
  readonly labelsKey: (labels: MetricLabels) => string;
  readonly renderPrometheusMetrics: (
    snapshot: MetricsSnapshot,
    quantileResolver?: (
      name: string,
      quantile: number,
      labels: MetricLabels,
    ) => number | null,
  ) => string;
}>;

type MetricCounter = Readonly<{
  readonly name: string;
  readonly value: number;
  readonly labels: MetricLabels;
}>;

type MetricHistogram = Readonly<{
  readonly name: string;
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
  readonly labels: MetricLabels;
}>;

type MetricObservation = Readonly<{
  readonly name: string;
  readonly value: number;
  readonly labels: MetricLabels;
}>;

type MetricsState = Readonly<{
  readonly counters: readonly MetricCounter[];
  readonly histograms: readonly MetricHistogram[];
  readonly observations: readonly MetricObservation[];
}>;

type MetricsStateStore = Readonly<{
  readonly read: () => MetricsState;
  readonly update: (updater: (state: MetricsState) => MetricsState) => void;
}>;

function createMetricsStateStore(): MetricsStateStore {
  let state: MetricsState = Object.freeze({
    counters: Object.freeze([]),
    histograms: Object.freeze([]),
    observations: Object.freeze([]),
  });
  return Object.freeze({
    read: () => state,
    update: (updater: (current: MetricsState) => MetricsState) => {
      state = updater(state);
    },
  });
}

function metricIndex(
  entries: readonly Readonly<{
    readonly name: string;
    readonly labels: MetricLabels;
  }>[],
  name: string,
  labels: MetricLabels,
  labelsKey: (labels: MetricLabels) => string,
): number {
  const key = labelsKey(labels);
  return entries.findIndex(
    (entry) => entry.name === name && labelsKey(entry.labels) === key,
  );
}

function upsertCounter(
  counters: readonly MetricCounter[],
  name: string,
  labels: MetricLabels,
  amount: number,
  labelsKey: (labels: MetricLabels) => string,
): readonly MetricCounter[] {
  const index = metricIndex(counters, name, labels, labelsKey);
  if (index === -1) {
    return Object.freeze([
      ...counters,
      Object.freeze({ name, value: amount, labels }),
    ]);
  }
  return Object.freeze(
    counters.map((counter, counterIndex) =>
      counterIndex === index
        ? Object.freeze({ ...counter, value: counter.value + amount })
        : counter,
    ),
  );
}

function upsertHistogram(
  histograms: readonly MetricHistogram[],
  name: string,
  labels: MetricLabels,
  value: number,
  labelsKey: (labels: MetricLabels) => string,
): readonly MetricHistogram[] {
  const index = metricIndex(histograms, name, labels, labelsKey);
  if (index === -1) {
    return Object.freeze([
      ...histograms,
      Object.freeze({
        name,
        count: 1,
        sum: value,
        min: value,
        max: value,
        labels,
      }),
    ]);
  }
  return Object.freeze(
    histograms.map((histogram, histogramIndex) =>
      histogramIndex === index
        ? Object.freeze({
            ...histogram,
            count: histogram.count + 1,
            sum: histogram.sum + value,
            min: Math.min(histogram.min, value),
            max: Math.max(histogram.max, value),
          })
        : histogram,
    ),
  );
}

function incrementMetric(
  store: MetricsStateStore,
  dependencies: MetricsPortDependencies,
  name: string,
  labels: MetricLabels,
  amount: number,
): void {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const safeName = dependencies.safeMetricName(name);
  const safeLabels = dependencies.sanitizeLabels(labels);
  store.update((state) =>
    Object.freeze({
      ...state,
      counters: upsertCounter(
        state.counters,
        safeName,
        safeLabels,
        amount,
        dependencies.labelsKey,
      ),
    }),
  );
}

function observeMetric(
  store: MetricsStateStore,
  dependencies: MetricsPortDependencies,
  name: string,
  value: number,
  labels: MetricLabels,
): void {
  if (!Number.isFinite(value) || value < 0) return;
  const safeName = dependencies.safeMetricName(name);
  const safeLabels = dependencies.sanitizeLabels(labels);
  store.update((state) =>
    Object.freeze({
      ...state,
      observations: Object.freeze(
        [
          ...state.observations,
          Object.freeze({ name: safeName, value, labels: safeLabels }),
        ].slice(-10_000),
      ),
      histograms: upsertHistogram(
        state.histograms,
        safeName,
        safeLabels,
        value,
        dependencies.labelsKey,
      ),
    }),
  );
}

function metricsSnapshot(state: MetricsState): MetricsSnapshot {
  return Object.freeze({
    counters: Object.freeze(
      state.counters.map((counter) =>
        Object.freeze({ ...counter, labels: { ...counter.labels } }),
      ),
    ),
    histograms: Object.freeze(
      state.histograms.map((histogram) =>
        Object.freeze({ ...histogram, labels: { ...histogram.labels } }),
      ),
    ),
  });
}

function metricQuantile(
  state: MetricsState,
  dependencies: MetricsPortDependencies,
  name: string,
  quantileValue: number,
  labels?: MetricLabels,
): number | null {
  if (
    !Number.isFinite(quantileValue) ||
    quantileValue < 0 ||
    quantileValue > 1
  ) {
    return null;
  }
  const safeName = dependencies.safeMetricName(name);
  const safeLabels =
    labels === undefined ? undefined : dependencies.sanitizeLabels(labels);
  const values = state.observations
    .filter(
      (observation) =>
        observation.name === safeName &&
        (safeLabels === undefined ||
          dependencies.labelsKey(observation.labels) ===
            dependencies.labelsKey(safeLabels)),
    )
    .map((observation) => observation.value)
    .sort((left, right) => left - right);
  if (values.length === 0) return null;
  const index = Math.min(
    values.length - 1,
    Math.max(0, Math.ceil(quantileValue * values.length) - 1),
  );
  return values[index] ?? null;
}

export function createMetricsPort(
  dependencies: MetricsPortDependencies,
): MetricsPort {
  const store = createMetricsStateStore();
  const increment = (
    name: string,
    labels: MetricLabels = {},
    amount = 1,
  ): void => incrementMetric(store, dependencies, name, labels, amount);
  const observe = (
    name: string,
    value: number,
    labels: MetricLabels = {},
  ): void => observeMetric(store, dependencies, name, value, labels);
  const snapshot = (): MetricsSnapshot => metricsSnapshot(store.read());
  const quantile = (
    name: string,
    quantileValue: number,
    labels?: MetricLabels,
  ): number | null =>
    metricQuantile(store.read(), dependencies, name, quantileValue, labels);
  return Object.freeze({
    increment,
    observe,
    snapshot,
    prometheus: () =>
      dependencies.renderPrometheusMetrics(snapshot(), quantile),
    quantile,
  });
}
