import { describe, expect, it, vi } from "vitest";

import {
  recordObservedItemStatistics,
  type ItemStatisticsWritePort,
} from "./item-statistics-use-cases.js";

const input = {
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
};

describe("record observed item statistics", () => {
  it("persists an aggregate without persisting raw responses or making a decision", async () => {
    const save = vi.fn<ItemStatisticsWritePort["save"]>(async () => undefined);

    const result = await recordObservedItemStatistics(input, { save });

    expect(save).toHaveBeenCalledWith(result);
    expect(result.automaticDecision).toBe("NONE");
    expect(result.requiresHumanReview).toBe(false);
    expect(JSON.stringify(result)).not.toContain("participantId");
  });

  it("persists anomaly flags for human review rather than changing state", async () => {
    const save = vi.fn<ItemStatisticsWritePort["save"]>(async () => undefined);

    const result = await recordObservedItemStatistics(
      {
        ...input,
        sampleSize: 4,
        correctCount: 0,
        appealCount: 2,
        discrimination: -0.4,
        distractorCounts: [],
      },
      { save },
    );

    expect(result.requiresHumanReview).toBe(true);
    expect(result.automaticDecision).toBe("NONE");
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not call persistence for an invalid aggregate", async () => {
    const save = vi.fn<ItemStatisticsWritePort["save"]>(async () => undefined);

    await expect(
      recordObservedItemStatistics({ ...input, sampleSize: 0 }, { save }),
    ).rejects.toThrow("sampleSize");
    expect(save).not.toHaveBeenCalled();
  });
});
