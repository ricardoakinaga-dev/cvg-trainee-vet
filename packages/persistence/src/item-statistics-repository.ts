import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  buildObservedItemStatistics,
  type DistractorObservation,
  type ItemAnomalyCode,
  type ObservedItemStatistics,
} from "@cvg/domain";
import type { ItemStatisticsWritePort } from "@cvg/application";

import { itemStatistics } from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export class ItemStatisticsMappingError extends Error {
  public override readonly name = "ItemStatisticsMappingError";

  public constructor(message: string) {
    super(message);
  }
}

export type ItemStatisticsRowShape = Readonly<{
  readonly id: string;
  readonly itemId: string;
  readonly scopeId: string;
  readonly contentVersion: number;
  readonly observedAt: Date | string;
  readonly sampleSize: number;
  readonly correctCount: number;
  readonly appealCount: number;
  readonly difficulty: number;
  readonly appealRate: number;
  readonly discrimination: number | null;
  readonly distractorCounts: unknown;
  readonly anomalyCodes: unknown;
  readonly requiresHumanReview: boolean;
  readonly automaticDecision: string;
  readonly createdAt: Date | string;
}>;

export type ItemStatisticsInsertRow = Readonly<
  Omit<
    ItemStatisticsRowShape,
    "createdAt" | "observedAt" | "distractorCounts" | "anomalyCodes"
  > & {
    readonly observedAt: Date;
    readonly distractorCounts: readonly DistractorObservation[];
    readonly anomalyCodes: readonly ItemAnomalyCode[];
  }
>;

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ItemStatisticsMappingError(`${field} is required`);
  }
}

function timestamp(value: Date | string, field: string): string {
  const parsed =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ItemStatisticsMappingError(`${field} is invalid`);
  }
  return parsed.toISOString();
}

function distractors(value: unknown): readonly DistractorObservation[] {
  if (!Array.isArray(value)) {
    throw new ItemStatisticsMappingError("distractorCounts is invalid");
  }
  return Object.freeze(
    value.map((item) => {
      if (
        item === null ||
        typeof item !== "object" ||
        typeof item.key !== "string" ||
        typeof item.count !== "number"
      ) {
        throw new ItemStatisticsMappingError("distractorCounts is invalid");
      }
      return Object.freeze({ key: item.key, count: item.count });
    }),
  );
}

function anomalies(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ItemStatisticsMappingError("anomalyCodes is invalid");
  }
  return Object.freeze(value as string[]);
}

function assertNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new ItemStatisticsMappingError(`${field} is invalid`);
  }
}

export function itemStatisticsStateToRow(
  state: ObservedItemStatistics,
): ItemStatisticsInsertRow {
  try {
    const verified = buildObservedItemStatistics({
      statisticsId: state.statisticsId,
      itemId: state.itemId,
      scopeId: state.scopeId,
      contentVersion: state.contentVersion,
      observedAt: state.observedAt,
      sampleSize: state.sampleSize,
      correctCount: state.correctCount,
      appealCount: state.appealCount,
      ...(state.discrimination === null
        ? {}
        : { discrimination: state.discrimination }),
      distractorCounts: state.distractorCounts,
    });
    return {
      id: verified.statisticsId,
      itemId: verified.itemId,
      scopeId: verified.scopeId,
      contentVersion: verified.contentVersion,
      observedAt: new Date(verified.observedAt),
      sampleSize: verified.sampleSize,
      correctCount: verified.correctCount,
      appealCount: verified.appealCount,
      difficulty: verified.difficulty,
      appealRate: verified.appealRate,
      discrimination: verified.discrimination,
      distractorCounts: verified.distractorCounts,
      anomalyCodes: verified.anomalyCodes,
      requiresHumanReview: verified.requiresHumanReview,
      automaticDecision: verified.automaticDecision,
    };
  } catch (error) {
    throw new ItemStatisticsMappingError(
      error instanceof Error ? error.message : "item statistics are invalid",
    );
  }
}

export function itemStatisticsRowToState(
  row: ItemStatisticsRowShape,
): ObservedItemStatistics {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.itemId, "itemId");
  assertNonEmpty(row.scopeId, "scopeId");
  assertNumber(row.difficulty, "difficulty");
  assertNumber(row.appealRate, "appealRate");
  if (row.discrimination !== null && row.discrimination !== undefined)
    assertNumber(row.discrimination, "discrimination");
  if (row.automaticDecision !== "NONE") {
    throw new ItemStatisticsMappingError("automaticDecision is not supported");
  }
  timestamp(row.createdAt, "createdAt");
  try {
    const state = buildObservedItemStatistics({
      statisticsId: row.id,
      itemId: row.itemId,
      scopeId: row.scopeId,
      contentVersion: row.contentVersion,
      observedAt: timestamp(row.observedAt, "observedAt"),
      sampleSize: row.sampleSize,
      correctCount: row.correctCount,
      appealCount: row.appealCount,
      ...(row.discrimination === null || row.discrimination === undefined
        ? {}
        : { discrimination: row.discrimination }),
      distractorCounts: distractors(row.distractorCounts),
    });
    const persistedAnomalies = anomalies(row.anomalyCodes);
    if (
      JSON.stringify(persistedAnomalies) !==
        JSON.stringify(state.anomalyCodes) ||
      row.requiresHumanReview !== state.requiresHumanReview ||
      Math.abs(row.difficulty - state.difficulty) > 0.0001 ||
      Math.abs(row.appealRate - state.appealRate) > 0.0001
    ) {
      throw new ItemStatisticsMappingError(
        "persisted item statistics do not match the aggregate",
      );
    }
    return state;
  } catch (error) {
    if (error instanceof ItemStatisticsMappingError) throw error;
    throw new ItemStatisticsMappingError(
      error instanceof Error ? error.message : "item statistics are invalid",
    );
  }
}

export function createItemStatisticsRepository(
  db: DatabaseExecutor,
): ItemStatisticsWritePort {
  return Object.freeze({
    save: async (state: ObservedItemStatistics): Promise<void> => {
      await db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, {
          scopeId: state.scopeId,
        });
        await executor
          .insert(itemStatistics)
          .values(itemStatisticsStateToRow(state));
      });
    },
  });
}
