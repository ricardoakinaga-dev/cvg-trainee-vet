import { isValidIsoTimestamp } from "./timestamp.js";

export type DistractorObservation = Readonly<{
  readonly key: string;
  readonly count: number;
}>;

export type ItemAnomalyCode =
  | "LOW_SAMPLE"
  | "EXTREME_DIFFICULTY"
  | "LOW_DISCRIMINATION"
  | "HIGH_APPEAL_RATE";

export type ObservedItemStatisticsInput = Readonly<{
  readonly statisticsId: string;
  readonly itemId: string;
  readonly scopeId: string;
  readonly contentVersion: number;
  readonly observedAt: string;
  readonly sampleSize: number;
  readonly correctCount: number;
  readonly appealCount: number;
  readonly discrimination?: number;
  readonly distractorCounts: readonly DistractorObservation[];
}>;

export type ObservedItemStatistics = Readonly<{
  readonly statisticsId: string;
  readonly itemId: string;
  readonly scopeId: string;
  readonly contentVersion: number;
  readonly observedAt: string;
  readonly sampleSize: number;
  readonly correctCount: number;
  readonly appealCount: number;
  readonly difficulty: number;
  readonly appealRate: number;
  readonly discrimination: number | null;
  readonly distractorCounts: readonly DistractorObservation[];
  readonly anomalyCodes: readonly ItemAnomalyCode[];
  readonly requiresHumanReview: boolean;
  readonly automaticDecision: "NONE";
}>;

export class ItemStatisticsDomainError extends Error {
  public override readonly name = "ItemStatisticsDomainError";

  public constructor(message: string) {
    super(message);
  }
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ItemStatisticsDomainError(`${field} is required`);
  }
  if (value.length > 256 || /<[^>]*>/u.test(value)) {
    throw new ItemStatisticsDomainError(`${field} is invalid`);
  }
}

function assertCount(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ItemStatisticsDomainError(
      `${field} must be a non-negative integer`,
    );
  }
}

function roundRatio(value: number): number {
  return Number(value.toFixed(4));
}

function validateDistractors(
  values: readonly DistractorObservation[],
  incorrectCount: number,
): readonly DistractorObservation[] {
  if (!Array.isArray(values) || values.length > 32) {
    throw new ItemStatisticsDomainError("distractorCounts is invalid");
  }
  const keys = new Set<string>();
  let total = 0;
  const normalized = values.map((value) => {
    assertNonEmpty(value.key, "distractor key");
    assertCount(value.count, "distractor count");
    if (keys.has(value.key)) {
      throw new ItemStatisticsDomainError(
        "distractorCounts contains duplicates",
      );
    }
    keys.add(value.key);
    total += value.count;
    return Object.freeze({ key: value.key, count: value.count });
  });
  if (total > incorrectCount) {
    throw new ItemStatisticsDomainError(
      "distractorCounts exceeds incorrect responses",
    );
  }
  return Object.freeze(normalized);
}

export function buildObservedItemStatistics(
  input: ObservedItemStatisticsInput,
): ObservedItemStatistics {
  assertNonEmpty(input.statisticsId, "statisticsId");
  assertNonEmpty(input.itemId, "itemId");
  assertNonEmpty(input.scopeId, "scopeId");
  if (!Number.isInteger(input.contentVersion) || input.contentVersion < 1) {
    throw new ItemStatisticsDomainError("contentVersion is invalid");
  }
  if (!isValidIsoTimestamp(input.observedAt)) {
    throw new ItemStatisticsDomainError("observedAt is invalid");
  }
  if (!Number.isInteger(input.sampleSize) || input.sampleSize < 1) {
    throw new ItemStatisticsDomainError(
      "sampleSize must be a positive integer",
    );
  }
  assertCount(input.correctCount, "correctCount");
  assertCount(input.appealCount, "appealCount");
  if (input.correctCount > input.sampleSize) {
    throw new ItemStatisticsDomainError("correctCount exceeds sampleSize");
  }
  if (input.appealCount > input.sampleSize) {
    throw new ItemStatisticsDomainError("appealCount exceeds sampleSize");
  }
  if (
    input.discrimination !== undefined &&
    (!Number.isFinite(input.discrimination) ||
      input.discrimination < -1 ||
      input.discrimination > 1)
  ) {
    throw new ItemStatisticsDomainError("discrimination is invalid");
  }

  const incorrectCount = input.sampleSize - input.correctCount;
  const distractorCounts = validateDistractors(
    input.distractorCounts,
    incorrectCount,
  );
  const difficulty = roundRatio(input.correctCount / input.sampleSize);
  const appealRate = roundRatio(input.appealCount / input.sampleSize);
  const anomalyCodes: ItemAnomalyCode[] = [];
  if (input.sampleSize < 5) anomalyCodes.push("LOW_SAMPLE");
  if (difficulty <= 0.05 || difficulty >= 0.95) {
    anomalyCodes.push("EXTREME_DIFFICULTY");
  }
  if (input.discrimination !== undefined && input.discrimination < 0.1) {
    anomalyCodes.push("LOW_DISCRIMINATION");
  }
  if (appealRate >= 0.1) anomalyCodes.push("HIGH_APPEAL_RATE");

  return Object.freeze({
    statisticsId: input.statisticsId,
    itemId: input.itemId,
    scopeId: input.scopeId,
    contentVersion: input.contentVersion,
    observedAt: input.observedAt,
    sampleSize: input.sampleSize,
    correctCount: input.correctCount,
    appealCount: input.appealCount,
    difficulty,
    appealRate,
    discrimination: input.discrimination ?? null,
    distractorCounts,
    anomalyCodes: Object.freeze(anomalyCodes),
    requiresHumanReview: anomalyCodes.length > 0,
    automaticDecision: "NONE" as const,
  });
}
