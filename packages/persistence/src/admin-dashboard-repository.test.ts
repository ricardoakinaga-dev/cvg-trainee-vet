import { describe, expect, it, vi } from "vitest";

import {
  MAX_ADMIN_DASHBOARD_ACCOUNTS,
  createTrainingParticipantRepository,
  filterTrainingParticipantAccounts,
  type TrainingParticipantAccountRow,
} from "./admin-dashboard-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";

const rows: readonly TrainingParticipantAccountRow[] = [
  {
    participantId: "22222222-2222-4222-8222-222222222222",
    professionalEmail: "active@example.test",
    accountStatus: "ACTIVE",
    roles: ["PARTICIPANT"],
    scopeIds: [scopeId],
  },
  {
    participantId: "33333333-3333-4333-8333-333333333333",
    professionalEmail: "moderator@example.test",
    accountStatus: "ACTIVE",
    roles: ["MODERATOR"],
    scopeIds: [scopeId],
  },
  {
    participantId: "44444444-4444-4444-8444-444444444444",
    professionalEmail: "other-scope@example.test",
    accountStatus: "ACTIVE",
    roles: ["PARTICIPANT"],
    scopeIds: ["55555555-5555-4555-8555-555555555555"],
  },
  {
    participantId: "66666666-6666-4666-8666-666666666666",
    professionalEmail: "deactivated@example.test",
    accountStatus: "DEACTIVATED",
    roles: ["PARTICIPANT"],
    scopeIds: [scopeId],
  },
];

describe("admin dashboard account repository", () => {
  it("returns only participant accounts intersecting the requested scopes", () => {
    expect(filterTrainingParticipantAccounts(rows, [scopeId])).toEqual([
      {
        participantId: "22222222-2222-4222-8222-222222222222",
        professionalEmail: "active@example.test",
        accountStatus: "ACTIVE",
        scopeIds: [scopeId],
      },
    ]);
  });

  it("fails closed when no scope is requested", () => {
    expect(filterTrainingParticipantAccounts(rows, [])).toEqual([]);
  });

  it("maps bounded database rows before applying the participant projection", async () => {
    const limit = vi.fn(async () => [
      {
        participantId: "77777777-7777-4777-8777-777777777777",
        professionalEmail: " zed@example.test ",
        accountStatus: "ACTIVE",
        roles: [" PARTICIPANT ", "PARTICIPANT"],
        scopeIds: [` ${scopeId} `, scopeId],
      },
      {
        participantId: "88888888-8888-4888-8888-888888888888",
        professionalEmail: "moderator-only@example.test",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        scopeIds: [scopeId],
      },
    ]);
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => ({ limit })),
        })),
      })),
    };
    const repository = createTrainingParticipantRepository(db as never);

    await expect(
      repository.listParticipants([` ${scopeId} `]),
    ).resolves.toEqual([
      {
        participantId: "77777777-7777-4777-8777-777777777777",
        professionalEmail: " zed@example.test ",
        accountStatus: "ACTIVE",
        scopeIds: [scopeId],
      },
    ]);
    expect(limit).toHaveBeenCalledWith(MAX_ADMIN_DASHBOARD_ACCOUNTS);
  });

  it("rejects malformed database arrays and account statuses", async () => {
    const malformedRows = [
      {
        participantId: "99999999-9999-4999-8999-999999999999",
        professionalEmail: "invalid@example.test",
        accountStatus: "UNKNOWN",
        roles: ["PARTICIPANT"],
        scopeIds: [scopeId],
      },
    ];
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => ({ limit: vi.fn(async () => malformedRows) })),
        })),
      })),
    };

    await expect(
      createTrainingParticipantRepository(db as never).listParticipants([
        scopeId,
      ]),
    ).rejects.toThrow("account status is invalid");
  });

  it("rejects non-string role and scope arrays", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                participantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                professionalEmail: "invalid-array@example.test",
                accountStatus: "ACTIVE",
                roles: ["PARTICIPANT", 4],
                scopeIds: [scopeId],
              },
            ]),
          })),
        })),
      })),
    };

    await expect(
      createTrainingParticipantRepository(db as never).listParticipants([
        scopeId,
      ]),
    ).rejects.toThrow("roles is invalid");
  });
});
