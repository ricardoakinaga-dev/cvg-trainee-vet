import { describe, expect, it } from "vitest";

import {
  buildModeratorAssignedWork,
  type ModeratorAssignedAccountRow,
  type ModeratorAssignedWorkRow,
} from "./moderator-dashboard-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";

const account: ModeratorAssignedAccountRow = {
  participantId,
  professionalEmail: "vet@example.test",
  roles: ["PARTICIPANT"],
  scopeIds: [scopeId],
};

const rows: readonly ModeratorAssignedWorkRow[] = [
  {
    participantId,
    scopeId,
    kind: "CORRECTION",
    technicalFailure: false,
    overdue: true,
  },
  {
    participantId,
    scopeId,
    kind: "FEEDBACK",
    technicalFailure: true,
    overdue: false,
  },
];

describe("moderator dashboard repository projection", () => {
  it("aggregates only assigned work for participant accounts in scope", () => {
    const result = buildModeratorAssignedWork("moderator-1", [scopeId], rows, [
      account,
    ]);

    expect(result.participants).toEqual([
      {
        participantId,
        professionalEmail: "vet@example.test",
        scopeIds: [scopeId],
        assignedQueueIds: [`CORRECTION:${scopeId}`, `FEEDBACK:${scopeId}`],
        correctionPendingCount: 1,
        feedbackOpenCount: 1,
        technicalFailureCount: 1,
      },
    ]);
    expect(result.queues).toEqual([
      {
        queueId: `CORRECTION:${scopeId}`,
        scopeId,
        kind: "CORRECTION",
        openCount: 1,
        overdueCount: 1,
      },
      {
        queueId: `FEEDBACK:${scopeId}`,
        scopeId,
        kind: "FEEDBACK",
        openCount: 1,
        overdueCount: 0,
      },
    ]);
  });

  it("drops work for non-participant or out-of-scope accounts", () => {
    expect(
      buildModeratorAssignedWork("moderator-1", [scopeId], rows, [
        { ...account, roles: ["MODERATOR"] },
      ]),
    ).toEqual({ participants: [], queues: [] });
  });
});
