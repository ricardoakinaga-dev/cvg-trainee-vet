import { describe, expect, it } from "vitest";

import { parseModeratorDashboard } from "./moderator-dashboard.js";

const participantId = "22222222-2222-4222-8222-222222222222";

const projection = {
  moderatorId: "moderator-1",
  scopeIds: ["scope-1"],
  participants: [
    {
      participantId,
      professionalEmail: "vet@example.test",
      scopeIds: ["scope-1"],
      progressPercent: 25,
      nextAction: "INICIAR_BASELINE",
      gapCount: 1,
      remediationObjectiveIds: ["OBJ-1"],
      correctionPendingCount: 2,
      feedbackOpenCount: 1,
      technicalFailureCount: 0,
      digitalReinforcementPlan: ["OBJ-1"],
    },
  ],
  queues: [
    {
      queueId: "queue-1",
      scopeId: "scope-1",
      kind: "CORRECTION",
      openCount: 2,
      overdueCount: 1,
    },
  ],
  practiceValidation: "NOT_AVAILABLE",
  summary: {
    participantsTotal: 1,
    correctionPending: 2,
    feedbackOpen: 1,
    technicalFailures: 0,
    overdueQueues: 1,
  },
} as const;

describe("moderator dashboard contract", () => {
  it("accepts the scoped operational projection", () => {
    expect(parseModeratorDashboard(projection)).toEqual(projection);
  });

  it("rejects clinical-practice data at the contract boundary", () => {
    expect(() =>
      parseModeratorDashboard({ ...projection, clinicalPractice: true }),
    ).toThrow();
  });
});
