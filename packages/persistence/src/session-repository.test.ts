import { describe, expect, it } from "vitest";

import type { SessionRecord } from "@cvg/application";

import {
  PersistenceMappingError,
  sessionRecordToRow,
  sessionRowToPrincipal,
} from "./session-repository.js";
import { sessions } from "./schema.js";

const now = new Date("2026-08-09T17:00:00.000Z");
const record: SessionRecord = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  accountId: "22222222-2222-4222-8222-222222222222",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: ["33333333-3333-4333-8333-333333333333"],
  tokenHash: "a".repeat(64),
  expiresAt: new Date("2026-08-09T18:00:00.000Z"),
  revokedAt: null,
  createdAt: now,
  lastSeenAt: now,
};

describe("PostgreSQL session mapping", () => {
  it("maps a server-side session without persisting its raw token", () => {
    const row = sessionRecordToRow(record);

    expect(row).toMatchObject({
      id: record.sessionId,
      accountId: record.accountId,
      tokenHash: record.tokenHash,
      roles: record.roles,
      scopes: record.scopes,
    });
    expect(row).not.toHaveProperty("token");
  });

  it("maps an active account row to a principal with immutable arrays", () => {
    const principal = sessionRowToPrincipal({
      accountId: record.accountId,
      status: "ACTIVE",
      roles: record.roles,
      scopes: record.scopes,
    });

    expect(principal).toEqual({
      accountId: record.accountId,
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: record.scopes,
    });
  });

  it("fails closed for invalid account status or role data", () => {
    expect(() =>
      sessionRowToPrincipal({
        accountId: record.accountId,
        status: "UNKNOWN",
        roles: record.roles,
        scopes: record.scopes,
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRowToPrincipal({
        accountId: record.accountId,
        status: "ACTIVE",
        roles: ["ROOT"],
        scopes: record.scopes,
      }),
    ).toThrow("role");
  });

  it("keeps the session table explicit", () => {
    expect(sessions).toBeDefined();
  });
});
