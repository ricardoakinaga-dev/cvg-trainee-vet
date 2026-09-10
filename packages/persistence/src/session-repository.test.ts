import { describe, expect, it } from "vitest";

import type { SessionRecord } from "@cvg/application";

import {
  PersistenceMappingError,
  sessionRecordToRow,
  sessionRowToPrincipal,
  createSessionRepository,
} from "./session-repository.js";
import { createFakeDatabase } from "./test-support/fake-database.js";
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

describe("session mapping validation", () => {
  it("rejects rows with invalid identity, token hash, roles, scopes or dates", () => {
    expect(() =>
      sessionRecordToRow({ ...record, sessionId: "" }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({ ...record, accountId: " " }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({ ...record, tokenHash: "short" }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({ ...record, accountStatus: "BLOCKED" as never }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({ ...record, roles: ["SUPERUSER"] as never }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({ ...record, roles: [42] as never }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({ ...record, scopes: [42] as never }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({
        ...record,
        expiresAt: new Date("invalid"),
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({
        ...record,
        revokedAt: new Date("invalid"),
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRecordToRow({
        ...record,
        lastSeenAt: new Date("invalid"),
      }),
    ).toThrow(PersistenceMappingError);
  });

  it("rejects principal rows with unsupported data", () => {
    expect(() =>
      sessionRowToPrincipal({
        accountId: "",
        status: "ACTIVE",
        roles: ["PARTICIPANT"],
        scopes: ["s1"],
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRowToPrincipal({
        accountId: "a",
        status: "PENDING",
        roles: ["PARTICIPANT"],
        scopes: ["s1"],
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRowToPrincipal({
        accountId: "a",
        status: "ACTIVE",
        roles: ["UNKNOWN"],
        scopes: ["s1"],
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      sessionRowToPrincipal({
        accountId: "a",
        status: "ACTIVE",
        roles: ["PARTICIPANT"],
        scopes: "s1",
      }),
    ).toThrow(PersistenceMappingError);
  });
});

describe("session repository operations", () => {
  const principalRow = {
    accountId: record.accountId,
    status: "ACTIVE",
    roles: ["PARTICIPANT"],
    scopes: record.scopes,
    sessionId: record.sessionId,
  };

  function repository(db: ReturnType<typeof createFakeDatabase>) {
    return createSessionRepository(
      db as unknown as Parameters<typeof createSessionRepository>[0],
    );
  }

  it("creates a session", async () => {
    const db = createFakeDatabase();
    await expect(repository(db).create(record)).resolves.toBeUndefined();
  });

  it("rejects sessions without scopes", async () => {
    const db = createFakeDatabase();
    await expect(
      repository(db).create({ ...record, scopes: [] }),
    ).rejects.toThrow("must include a scope");
  });

  it("finds an active session and refreshes lastSeenAt", async () => {
    const db = createFakeDatabase({ rows: [[], [principalRow]] });
    const principal = await repository(db).findActive(
      record.tokenHash,
      now,
    );
    expect(principal).toMatchObject({ accountId: record.accountId });
  });

  it("returns null when no active session matches", async () => {
    const db = createFakeDatabase({ rows: [[], []] });
    expect(
      await repository(db).findActive(record.tokenHash, now),
    ).toBeNull();
  });

  it("rejects invalid token hashes or timestamps", async () => {
    const db = createFakeDatabase();
    await expect(
      repository(db).findActive("nope", now),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      repository(db).findActive(record.tokenHash, new Date("invalid")),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      repository(db).revoke("nope", now),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      repository(db).revoke(record.tokenHash, new Date("invalid")),
    ).rejects.toThrow(PersistenceMappingError);
  });

  it("revokes an active session", async () => {
    const db = createFakeDatabase();
    await expect(
      repository(db).revoke(record.tokenHash, now),
    ).resolves.toBeUndefined();
  });

  it("rotates a session and fails when the old one is gone", async () => {
    const rotated = createFakeDatabase({
      rows: [[], [{ id: record.sessionId }]],
    });
    await expect(
      repository(rotated).rotate!(
        record.tokenHash,
        record,
        now,
      ),
    ).resolves.toBeUndefined();
    const gone = createFakeDatabase({ rows: [[]] });
    await expect(
      repository(gone).rotate!(record.tokenHash, record, now),
    ).rejects.toThrow("no longer active");
  });

  it("rejects rotation without scopes", async () => {
    const db = createFakeDatabase();
    await expect(
      repository(db).rotate!(record.tokenHash, { ...record, scopes: [] }, now),
    ).rejects.toThrow("must include a scope");
  });
});
