import { describe, expect, it, vi } from "vitest";

import {
  isModeratorDashboard,
  loadModeratorDashboard,
} from "../app/moderator/moderator-model.js";

const dashboard = {
  moderatorId: "11111111-1111-4111-8111-111111111111",
  scopeIds: ["scope-1"],
  practiceValidation: "NOT_AVAILABLE",
  summary: {
    participantsTotal: 1,
    correctionPending: 2,
    feedbackOpen: 3,
    technicalFailures: 4,
    overdueQueues: 5,
  },
  queues: [
    {
      queueId: "queue-1",
      scopeId: "scope-1",
      kind: "CORRECTION",
      openCount: 2,
      overdueCount: 1,
    },
  ],
  participants: [
    {
      participantId: "44444444-4444-4444-8444-444444444444",
      professionalEmail: "participant@example.test",
      scopeIds: ["scope-1"],
      progressPercent: 20,
      nextAction: "EXECUTAR_REMEDIACAO",
      gapCount: 1,
      remediationObjectiveIds: ["objective-1"],
      correctionPendingCount: 1,
      feedbackOpenCount: 0,
      technicalFailureCount: 0,
      digitalReinforcementPlan: ["objective-1"],
    },
  ],
} as const;

describe("moderator dashboard model", () => {
  it("validates a bounded dashboard projection", () => {
    expect(isModeratorDashboard(dashboard)).toBe(true);
    expect(
      isModeratorDashboard({ ...dashboard, practiceValidation: "AVAILABLE" }),
    ).toBe(false);
    expect(
      isModeratorDashboard({
        ...dashboard,
        queues: [{ ...dashboard.queues[0], kind: "UNKNOWN" }],
      }),
    ).toBe(false);
    expect(
      isModeratorDashboard({
        ...dashboard,
        summary: { ...dashboard.summary, overdueQueues: -1 },
      }),
    ).toBe(false);
    expect(isModeratorDashboard({ ...dashboard, moderatorId: "" })).toBe(false);
  });

  it("loads only a successful dashboard envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: dashboard }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadModeratorDashboard("/api")).resolves.toEqual(dashboard);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/api/v1/internal/moderator/dashboard",
      { credentials: "include", cache: "no-store" },
    );
  });
});
