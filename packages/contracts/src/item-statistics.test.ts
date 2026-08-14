import { describe, expect, it } from "vitest";

import {
  observedItemStatisticsRequestSchema,
  parseObservedItemStatistics,
} from "./item-statistics.js";

const valid = {
  statisticsId: "stats-1",
  itemId: "item-1",
  scopeId: "scope-1",
  contentVersion: 2,
  observedAt: "2026-08-14T09:00:00.000Z",
  sampleSize: 20,
  correctCount: 12,
  appealCount: 1,
  difficulty: 0.6,
  appealRate: 0.05,
  discrimination: 0.35,
  distractorCounts: [{ key: "A", count: 8 }],
  anomalyCodes: [],
  requiresHumanReview: false,
  automaticDecision: "NONE",
};

describe("observed item statistics contract", () => {
  it("accepts an internal aggregate write without participant identity", () => {
    expect(
      observedItemStatisticsRequestSchema.parse({
        itemId: valid.itemId,
        scopeId: valid.scopeId,
        contentVersion: valid.contentVersion,
        observedAt: valid.observedAt,
        sampleSize: valid.sampleSize,
        correctCount: valid.correctCount,
        appealCount: valid.appealCount,
        discrimination: valid.discrimination,
        distractorCounts: valid.distractorCounts,
      }),
    ).toMatchObject({ itemId: "item-1", sampleSize: 20 });
  });

  it("accepts a redacted aggregate projection", () => {
    expect(parseObservedItemStatistics(valid)).toEqual(valid);
  });

  it("rejects raw participant data and automatic decisions", () => {
    expect(() =>
      parseObservedItemStatistics({ ...valid, participantId: "participant-1" }),
    ).toThrow();
    expect(() =>
      parseObservedItemStatistics({ ...valid, automaticDecision: "BLOCK" }),
    ).toThrow();
  });
});
