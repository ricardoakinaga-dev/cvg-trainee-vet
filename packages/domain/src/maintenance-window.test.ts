import { describe, expect, it } from "vitest";

import { evaluateMaintenanceWindow } from "./maintenance-window.js";

const criticalHours = [
  {
    intervalId: "hospital-critical-hours",
    startsAt: "2026-08-14T08:00:00.000Z",
    endsAt: "2026-08-14T18:00:00.000Z",
  },
] as const;

describe("maintenance window policy", () => {
  it("allows an approved window outside declared critical hours", () => {
    expect(
      evaluateMaintenanceWindow(
        {
          changeId: "change-1",
          startsAt: "2026-08-14T20:00:00.000Z",
          endsAt: "2026-08-14T21:00:00.000Z",
          approvedBy: "operator-1",
          approvedAt: "2026-08-14T12:00:00.000Z",
        },
        criticalHours,
      ),
    ).toMatchObject({ decision: "APPROVED_OUTSIDE_CRITICAL_HOURS" });
  });

  it("rejects overlap, missing approval, and missing protection intervals", () => {
    expect(
      evaluateMaintenanceWindow(
        {
          changeId: "change-1",
          startsAt: "2026-08-14T17:00:00.000Z",
          endsAt: "2026-08-14T19:00:00.000Z",
          approvedBy: "operator-1",
          approvedAt: "2026-08-14T12:00:00.000Z",
        },
        criticalHours,
      ).decision,
    ).toBe("REJECTED_CRITICAL_HOURS");
    expect(
      evaluateMaintenanceWindow(
        {
          changeId: "change-1",
          startsAt: "2026-08-14T20:00:00.000Z",
          endsAt: "2026-08-14T21:00:00.000Z",
        },
        criticalHours,
      ).decision,
    ).toBe("REJECTED_APPROVAL");
    expect(() =>
      evaluateMaintenanceWindow(
        {
          changeId: "change-1",
          startsAt: "2026-08-14T20:00:00.000Z",
          endsAt: "2026-08-14T21:00:00.000Z",
          approvedBy: "operator-1",
          approvedAt: "2026-08-14T12:00:00.000Z",
        },
        [],
      ),
    ).toThrow();
  });
});
