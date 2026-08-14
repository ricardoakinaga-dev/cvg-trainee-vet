import { describe, expect, it } from "vitest";

import {
  buildObservedItemStatistics,
  type ObservedItemStatisticsInput,
} from "./item-statistics.js";

const baseInput: ObservedItemStatisticsInput = {
  statisticsId: "stats-1",
  itemId: "item-1",
  scopeId: "scope-1",
  contentVersion: 2,
  observedAt: "2026-08-14T09:00:00.000Z",
  sampleSize: 20,
  correctCount: 12,
  appealCount: 1,
  discrimination: 0.35,
  distractorCounts: [
    { key: "A", count: 2 },
    { key: "B", count: 3 },
    { key: "C", count: 3 },
  ],
};

describe("observed item statistics", () => {
  it("calculates difficulty, appeal rate and preserves distractor observations", () => {
    const result = buildObservedItemStatistics(baseInput);

    expect(result).toMatchObject({
      statisticsId: "stats-1",
      itemId: "item-1",
      difficulty: 0.6,
      appealRate: 0.05,
      discrimination: 0.35,
      requiresHumanReview: false,
      anomalyCodes: [],
    });
    expect(result.distractorCounts).toEqual(baseInput.distractorCounts);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("flags low sample, extreme difficulty, low discrimination and high appeals", () => {
    const result = buildObservedItemStatistics({
      ...baseInput,
      sampleSize: 4,
      correctCount: 4,
      appealCount: 2,
      discrimination: -0.2,
      distractorCounts: [],
    });

    expect(result.anomalyCodes).toEqual([
      "LOW_SAMPLE",
      "EXTREME_DIFFICULTY",
      "LOW_DISCRIMINATION",
      "HIGH_APPEAL_RATE",
    ]);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.automaticDecision).toBe("NONE");
  });

  it("does not invent discrimination when it was not observed", () => {
    const result = buildObservedItemStatistics({
      statisticsId: baseInput.statisticsId,
      itemId: baseInput.itemId,
      scopeId: baseInput.scopeId,
      contentVersion: baseInput.contentVersion,
      observedAt: baseInput.observedAt,
      sampleSize: baseInput.sampleSize,
      correctCount: baseInput.correctCount,
      appealCount: baseInput.appealCount,
      distractorCounts: baseInput.distractorCounts,
    });

    expect(result.discrimination).toBeNull();
    expect(result.anomalyCodes).not.toContain("LOW_DISCRIMINATION");
  });

  it("rejects impossible aggregates and invalid identifiers", () => {
    expect(() =>
      buildObservedItemStatistics({ ...baseInput, correctCount: 21 }),
    ).toThrow("correctCount");
    expect(() =>
      buildObservedItemStatistics({ ...baseInput, appealCount: 21 }),
    ).toThrow("appealCount");
    expect(() =>
      buildObservedItemStatistics({
        ...baseInput,
        distractorCounts: [{ key: "A", count: 20 }],
      }),
    ).toThrow("distractorCounts");
    expect(() =>
      buildObservedItemStatistics({ ...baseInput, itemId: " " }),
    ).toThrow("itemId");
  });
});
