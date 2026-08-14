import { describe, expect, it } from "vitest";

import {
  maintenanceWindowDecisionSchema,
  maintenanceWindowRequestSchema,
} from "./maintenance-window.js";

describe("maintenance window contracts", () => {
  it("accepts an approved request with protected intervals", () => {
    expect(
      maintenanceWindowRequestSchema.parse({
        changeId: "change-1",
        startsAt: "2026-08-14T20:00:00.000Z",
        endsAt: "2026-08-14T21:00:00.000Z",
        approvedBy: "operator-1",
        approvedAt: "2026-08-14T12:00:00.000Z",
        protectedIntervals: [
          {
            intervalId: "hospital-critical-hours",
            startsAt: "2026-08-14T08:00:00.000Z",
            endsAt: "2026-08-14T18:00:00.000Z",
          },
        ],
      }),
    ).toMatchObject({ changeId: "change-1" });
  });

  it("rejects an incomplete request and validates the decision projection", () => {
    expect(() => maintenanceWindowRequestSchema.parse({})).toThrow();
    expect(() =>
      maintenanceWindowDecisionSchema.parse({
        changeId: "change-1",
        decision: "APPROVED_OUTSIDE_CRITICAL_HOURS",
        overlaps: [],
      }),
    ).not.toThrow();
  });
});
