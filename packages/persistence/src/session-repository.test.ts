import { describe, expect, it, vi } from "vitest";

import type { SessionRecord } from "@cvg/application";

import {
  PersistenceMappingError,
  createSessionRepository,
  sessionRecordToRow,
  sessionRowToPrincipal,
} from "./session-repository.js";
import { sessions } from "./schema.js";

const now = new Date("2026-08-09T17:00:00.000Z");
const record: SessionRecord = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  accountId: "22222222-2222-4222-8222-222222222222",
  sessionGeneration: 4,
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
      sessionGeneration: record.sessionGeneration,
    });
    expect(row).not.toHaveProperty("token");
  });

  it("maps an active account row to a principal with immutable arrays", () => {
    const principal = sessionRowToPrincipal({
      accountId: record.accountId,
      status: "ACTIVE",
      roles: record.roles,
      scopes: record.scopes,
      sessionGeneration: record.sessionGeneration,
    });

    expect(principal).toEqual({
      accountId: record.accountId,
      accountStatus: "ACTIVE",
      sessionGeneration: record.sessionGeneration,
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

  it("rejects malformed session metadata and timestamps", () => {
    expect(() => sessionRecordToRow({ ...record, sessionId: " " })).toThrow(
      "sessionId must not be empty",
    );
    expect(() =>
      sessionRecordToRow({ ...record, tokenHash: "not-a-digest" }),
    ).toThrow("tokenHash must be a SHA-256 hex digest");
    expect(() =>
      sessionRecordToRow({ ...record, scopes: ["scope", 4] as never }),
    ).toThrow("scopes must be an array of strings");
    expect(() =>
      sessionRecordToRow({ ...record, expiresAt: new Date("invalid") }),
    ).toThrow("expiresAt must be a valid timestamp");
    expect(() =>
      sessionRecordToRow({
        ...record,
        revokedAt: new Date("invalid"),
      }),
    ).toThrow("revokedAt must be a valid timestamp");
  });

  it("covers active lookup, revocation, bulk revocation and rotation", async () => {
    const selectedRows = [
      {
        accountId: record.accountId,
        status: "ACTIVE",
        roles: record.roles,
        scopes: record.scopes,
        sessionGeneration: record.sessionGeneration,
        sessionId: record.sessionId,
      },
    ];
    const updateWhere = vi.fn(() => ({
      returning: vi.fn(async () => [{ id: record.sessionId }]),
    }));
    const database = {
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => selectedRows),
            })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: updateWhere })),
      })),
      transaction: vi.fn(async (work: (tx: typeof database) => unknown) =>
        work(database),
      ),
    };
    const repository = createSessionRepository(database as never);

    await repository.create(record);
    await expect(repository.findActive("a".repeat(64), now)).resolves.toEqual({
      accountId: record.accountId,
      accountStatus: "ACTIVE",
      sessionGeneration: record.sessionGeneration,
      roles: record.roles,
      scopes: record.scopes,
    });
    await repository.revoke("a".repeat(64), now);
    await expect(repository.revokeAll(record.accountId, now)).resolves.toBe(1);
    if (repository.rotate === undefined) throw new Error("rotate is required");
    await repository.rotate(
      "a".repeat(64),
      {
        ...record,
        sessionId: "77777777-7777-4777-8777-777777777777",
      },
      now,
    );

    expect(database.insert).toHaveBeenCalled();
    expect(database.select).toHaveBeenCalled();
    expect(database.update).toHaveBeenCalled();
    expect(database.transaction).toHaveBeenCalledOnce();
  });

  it("returns null for an inactive lookup and rejects inactive rotation", async () => {
    const noRowsDatabase = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({ limit: vi.fn(async () => []) })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: vi.fn(async () => []) })),
        })),
      })),
      transaction: vi.fn(async (work: (tx: typeof noRowsDatabase) => unknown) =>
        work(noRowsDatabase),
      ),
    };
    const repository = createSessionRepository(noRowsDatabase as never);

    await expect(
      repository.findActive("a".repeat(64), now),
    ).resolves.toBeNull();
    if (repository.rotate === undefined) throw new Error("rotate is required");
    await expect(
      repository.rotate("a".repeat(64), record, now),
    ).rejects.toThrow("session is no longer active");
    await expect(repository.revokeAll(" ", now)).rejects.toThrow(
      "accountId must not be empty",
    );
  });

  it("keeps the session table explicit", () => {
    expect(sessions).toBeDefined();
  });
});
