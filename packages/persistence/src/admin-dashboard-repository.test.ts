import { describe, expect, it } from "vitest";

import {
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
});
