import { describe, expect, it, vi } from "vitest";

import {
  buildAdminOperationsSignals,
  createAdminOperationsRepository,
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

  it("reads scoped operational rows in one transaction and projects them", async () => {
    const responses: unknown[][] = [
      [
        {
          accountId: "account-1",
          status: "ACTIVE",
          roles: ["PARTICIPANT"],
        },
      ],
      [
        {
          accountId: "account-1",
          lastSeenAt: new Date("2026-07-30T12:00:00.000Z"),
        },
      ],
      [{ status: "ABERTA", dueAt: new Date("2026-08-13T12:00:00.000Z") }],
      [{ participantId: "participant-1", moduleId: "OBJ-1" }],
      [
        {
          participantId: "participant-1",
          state: { remediationObjectiveIds: ["OBJ-2"] },
        },
      ],
      [
        {
          status: "PUBLICADO",
          validUntil: null,
          nextReviewAt: new Date("2026-08-13T12:00:00.000Z"),
        },
      ],
      [{ status: "NOVO", type: "BUG_TECNICO" }],
    ];
    const tx = {
      execute: vi.fn(async () => undefined),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => responses.shift() ?? []),
        })),
      })),
    };
    const db = {
      transaction: vi.fn(async (callback: (executor: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    await expect(
      createAdminOperationsRepository(db as never).readSignals(
        [" scope-1 ", "scope-1"],
        now,
      ),
    ).resolves.toEqual({
      accounts: {
        invited: 0,
        active: 1,
        suspended: 0,
        deactivated: 0,
        inactiveOver14Days: 1,
      },
      corrections: { open: 1, overdue: 1, slaBreaches: 1 },
      remediation: { participants: 1, objectives: 2 },
      contentValidity: { valid: 1, dueForReview: 1, expired: 0, withdrawn: 0 },
      feedback: { open: 1, technicalFailures: 1 },
    });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.execute).toHaveBeenCalledTimes(2);
    expect(responses).toHaveLength(0);
  });

  it("handles a scoped query with no participant accounts and rejects invalid time", async () => {
    const emptyTx = {
      execute: vi.fn(async () => undefined),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => []),
        })),
      })),
    };
    const db = {
      transaction: vi.fn(
        async (callback: (executor: typeof emptyTx) => unknown) =>
          callback(emptyTx),
      ),
    };

    await expect(
      createAdminOperationsRepository(db as never).readSignals(
        ["scope-1"],
        now,
      ),
    ).resolves.toEqual({
      accounts: {
        invited: 0,
        active: 0,
        suspended: 0,
        deactivated: 0,
        inactiveOver14Days: 0,
      },
      corrections: { open: 0, overdue: 0, slaBreaches: 0 },
      remediation: { participants: 0, objectives: 0 },
      contentValidity: { valid: 0, dueForReview: 0, expired: 0, withdrawn: 0 },
      feedback: { open: 0, technicalFailures: 0 },
    });

    expect(() =>
      buildAdminOperationsSignals([], [], [], [], [], new Date("invalid")),
    ).toThrow("now is invalid");
  });
});
