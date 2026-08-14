import { describe, expect, it } from "vitest";

import {
  buildAdminOperationsSignals,
  type AdminAccountOperationalRow,
  type AdminContentValidityRow,
  type AdminCorrectionRow,
  type AdminFeedbackRow,
  type AdminRemediationRow,
} from "./admin-operations-repository.js";

const now = new Date("2026-08-14T12:00:00.000Z");

const accounts: readonly AdminAccountOperationalRow[] = [
  {
    status: "ACTIVE",
    roles: ["PARTICIPANT"],
    lastSeenAt: new Date("2026-08-01T12:00:00.000Z"),
  },
  { status: "INVITED", roles: ["PARTICIPANT"], lastSeenAt: null },
  { status: "SUSPENDED", roles: ["MODERATOR"], lastSeenAt: now },
];

const corrections: readonly AdminCorrectionRow[] = [
  { status: "ABERTA", dueAt: new Date("2026-08-13T12:00:00.000Z") },
  { status: "DECIDIDA", dueAt: new Date("2026-08-13T12:00:00.000Z") },
];

const remediation: readonly AdminRemediationRow[] = [
  { participantId: "participant-1", objectiveIds: ["OBJ-1", "OBJ-2"] },
  { participantId: "participant-1", objectiveIds: ["OBJ-2"] },
];

const content: readonly AdminContentValidityRow[] = [
  { status: "PUBLICADO", validUntil: null, nextReviewAt: null },
  {
    status: "PUBLICADO",
    validUntil: new Date("2026-08-13T12:00:00.000Z"),
    nextReviewAt: new Date("2026-08-13T12:00:00.000Z"),
  },
  { status: "RETIRADO", validUntil: null, nextReviewAt: null },
];

const feedback: readonly AdminFeedbackRow[] = [
  { status: "NOVO", type: "BUG_TECNICO" },
  { status: "RESOLVIDO", type: "BUG_TECNICO" },
];

describe("admin operations repository projection", () => {
  it("calculates account, SLA, remediation, validity, and feedback signals", () => {
    expect(
      buildAdminOperationsSignals(
        accounts,
        corrections,
        remediation,
        content,
        feedback,
        now,
      ),
    ).toEqual({
      accounts: {
        invited: 1,
        active: 1,
        suspended: 1,
        deactivated: 0,
        inactiveOver14Days: 1,
      },
      corrections: { open: 1, overdue: 1, slaBreaches: 1 },
      remediation: { participants: 1, objectives: 2 },
      contentValidity: { valid: 1, dueForReview: 1, expired: 1, withdrawn: 1 },
      feedback: { open: 1, technicalFailures: 1 },
    });
  });
});
