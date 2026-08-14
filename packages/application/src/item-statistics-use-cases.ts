import {
  buildObservedItemStatistics,
  ItemStatisticsDomainError,
  type ObservedItemStatistics,
  type ObservedItemStatisticsInput,
} from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export interface ItemStatisticsWritePort {
  readonly save: (statistics: ObservedItemStatistics) => Promise<void>;
}

function normalizeStatisticsError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (error instanceof ItemStatisticsDomainError) {
    return new ApplicationError("validation_error", error.message);
  }
  return error instanceof Error
    ? new ApplicationError(
        "internal_error",
        "Item statistics could not be recorded",
      )
    : new ApplicationError(
        "internal_error",
        "Item statistics could not be recorded",
      );
}

export async function recordObservedItemStatistics(
  input: ObservedItemStatisticsInput,
  repository: ItemStatisticsWritePort,
): Promise<ObservedItemStatistics> {
  try {
    const statistics = buildObservedItemStatistics(input);
    await repository.save(statistics);
    return statistics;
  } catch (error) {
    throw normalizeStatisticsError(error);
  }
}
