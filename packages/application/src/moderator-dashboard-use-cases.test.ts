import { describe, expect, it } from "vitest";

import {
  buildModeratorDashboard,
  getInternalModeratorDashboard,
  type ModeratorParticipantSnapshot,
} from "./moderator-dashboard-use-cases.js";

const scopeId = "scope-1";
const participantId = "22222222-2222-4222-8222-222222222222";

const participant: ModeratorParticipantSnapshot = {
  participantId,
  professionalEmail: "vet@example.test",
  scopeIds: [scopeId],
  assignedQueueIds: ["queue-correction-1"],
  correctionPendingCount: 2,
  feedbackOpenCount: 1,
  technicalFailureCount: 0,
  journey: {
    participantId,
    assignments: [],
    activities: [],
    results: [],
    runtimes: [],
    nextAction: "INICIAR_BASELINE",
  },
};

describe("moderator dashboard", () => {
  it("projects only assigned queues and participants without practice validation", () => {
    const dashboard = buildModeratorDashboard(
      "moderator-1",
      [scopeId],
      [participant],
      [
        {
          queueId: "queue-correction-1",
          scopeId,
          kind: "CORRECTION",
          openCount: 2,
          overdueCount: 1,
        },
        {
          queueId: "queue-outside-scope",
          scopeId: "scope-2",
          kind: "FEEDBACK",
          openCount: 99,
          overdueCount: 99,
        },
      ],
    );

    expect(dashboard.participants).toHaveLength(1);
    expect(dashboard.queues).toHaveLength(1);
    expect(dashboard.queues[0]).toMatchObject({
      queueId: "queue-correction-1",
      overdueCount: 1,
    });
    expect(dashboard.participants[0]).toMatchObject({
      participantId,
      correctionPendingCount: 2,
      feedbackOpenCount: 1,
    });
    expect(dashboard.practiceValidation).toBe("NOT_AVAILABLE");
    expect(JSON.stringify(dashboard)).not.toContain("clinicalPractice");
  });

  it("does not leak an unassigned participant even when the scope matches", () => {
    const dashboard = buildModeratorDashboard(
      "moderator-1",
      [scopeId],
      [{ ...participant, assignedQueueIds: [] }],
      [],
    );

    expect(dashboard.participants).toEqual([]);
  });

  it("loads journeys only for persisted work assigned to the moderator", async () => {
    const getJourney = async (requestedParticipantId: string) => ({
      ...participant.journey,
      participantId: requestedParticipantId,
    });
    const dashboard = await getInternalModeratorDashboard(
      "moderator-1",
      [scopeId],
      {
        listAssignedWork: async () => ({
          participants: [
            {
              participantId,
              professionalEmail: participant.professionalEmail,
              scopeIds: [scopeId],
              assignedQueueIds: ["queue-correction-1"],
              correctionPendingCount: 1,
              feedbackOpenCount: 0,
              technicalFailureCount: 0,
            },
          ],
          queues: [
            {
              queueId: "queue-correction-1",
              scopeId,
              kind: "CORRECTION",
              openCount: 1,
              overdueCount: 0,
            },
          ],
        }),
        getParticipantLearningJourney: getJourney,
      },
    );

    expect(dashboard.participants[0]?.participantId).toBe(participantId);
    expect(dashboard.summary.correctionPending).toBe(1);
  });
});
