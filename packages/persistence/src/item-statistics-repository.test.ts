import { describe, expect, it, vi } from "vitest";

import { buildObservedItemStatistics } from "@cvg/domain";

import {
  createItemStatisticsRepository,
  itemStatisticsRowToState,
  itemStatisticsStateToRow,
} from "./item-statistics-repository.js";

const state = buildObservedItemStatistics({
  statisticsId: "stats-1",
  itemId: "item-1",
  scopeId: "scope-1",
  contentVersion: 2,
  observedAt: "2026-08-14T09:00:00.000Z",
  sampleSize: 20,
  correctCount: 12,
  appealCount: 1,
  discrimination: 0.35,
  distractorCounts: [{ key: "A", count: 8 }],
});

describe("item statistics persistence mapping", () => {
  it("maps a redacted aggregate to and from a database row", () => {
    const row = itemStatisticsStateToRow(state);

    expect(row).toMatchObject({
      id: "stats-1",
      itemId: "item-1",
      scopeId: "scope-1",
      contentVersion: 2,
      sampleSize: 20,
      correctCount: 12,
      appealCount: 1,
    });
    expect(itemStatisticsRowToState({ ...row, createdAt: new Date() })).toEqual(
      state,
    );
  });

  it("fails closed for invalid persisted values", () => {
    expect(() =>
      itemStatisticsRowToState({
        ...itemStatisticsStateToRow(state),
        sampleSize: 0,
        createdAt: new Date(),
      }),
    ).toThrow("sampleSize");
  });

  it("sets the scope security context before writing the aggregate", async () => {
    const execute = vi.fn(async () => undefined);
    const values = vi.fn(async () => undefined);
    const insert = vi.fn(() => ({ values }));
    const db = {
      transaction: async (work: (tx: unknown) => Promise<unknown>) =>
        work({ execute, insert }),
    } as never;

    await createItemStatisticsRepository(db).save(state);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ scopeId: "scope-1" }),
    );
  });
});
