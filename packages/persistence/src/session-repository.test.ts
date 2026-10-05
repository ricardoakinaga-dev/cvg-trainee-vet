import { describe, expect, it, vi } from "vitest";

import type { SessionRecord } from "@cvg/application";

import {
  PersistenceMappingError,
  sessionRecordToRow,
  sessionRowToPrincipal,
  createSessionRepository,
} from "./session-repository.js";
import { createFakeDatabase as createSharedFakeDatabase } from "./test-support/fake-database.js";
import { sessions } from "./schema.js";

// Local adapter: do not expand the shared harness for this repository's lock.
function createFakeDatabase(
  options: Parameters<typeof createSharedFakeDatabase>[0] = {},
) {
  const db = createSharedFakeDatabase(options);
  const lock = vi.fn();
  const decorate = (executor: typeof db): typeof db & { lock: typeof lock } => {
    const select = executor.select;
    const transaction = executor.transaction;
    return Object.assign(executor, {
      lock,
      select: (...args: Parameters<typeof select>) => {
        const builder = select(...args);
        return Object.assign(builder, {
          for: (mode: string, configuration: unknown) => {
            lock(mode, configuration);
            return builder;
          },
        });
      },
      transaction: (action: Parameters<typeof transaction>[0]) =>
        transaction(async (child) => action(decorate(child))),
    });
  };
  return decorate(db);
}

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

  it("preserves a stored session identity for internal recovery and rejects malformed bindings", () => {
    const row = {
      accountId: record.accountId,
      status: "ACTIVE",
      roles: record.roles,
      scopes: record.scopes,
      sessionId: record.sessionId,
    };
    expect(sessionRowToPrincipal(row)).toMatchObject({
      sessionId: record.sessionId,
    });
    expect(() =>
      sessionRowToPrincipal({ ...row, sessionId: "invalid" }),
    ).toThrow(PersistenceMappingError);
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
    expect(() => sessionRecordToRow({ ...record, sessionId: "" })).toThrow(
      PersistenceMappingError,
    );
    expect(() => sessionRecordToRow({ ...record, accountId: " " })).toThrow(
      PersistenceMappingError,
    );
    expect(() => sessionRecordToRow({ ...record, tokenHash: "short" })).toThrow(
      PersistenceMappingError,
    );
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
    createdAt: record.createdAt,
    lastSeenAt: record.lastSeenAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
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
    const principal = await repository(db).findActive(record.tokenHash, now);
    expect(principal).toMatchObject({ accountId: record.accountId });
    expect(db.lock).toHaveBeenCalledWith("update", { of: sessions });
    expect(principal?.sessionLifetime).toEqual({
      createdAt: now,
      lastSeenAt: now,
      expiresAt: record.expiresAt,
    });
  });

  it("returns null when no active session matches", async () => {
    const db = createFakeDatabase({ rows: [[], []] });
    expect(await repository(db).findActive(record.tokenHash, now)).toBeNull();
  });

  it.each([
    { roles: ["ADMIN"], elapsed: 30 * 60 * 1_000 },
    { roles: ["MODERATOR"], elapsed: 30 * 60 * 1_000 },
    { roles: ["PARTICIPANT"], elapsed: 8 * 60 * 60 * 1_000 },
    { roles: ["AUTHOR"], elapsed: 1 },
  ])(
    "denies expired idle or missing base-role proof: $roles",
    async ({ roles, elapsed }) => {
      const updates: unknown[] = [];
      const db = createFakeDatabase({
        rows: [
          [],
          [
            {
              ...principalRow,
              roles,
              expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1_000),
            },
          ],
        ],
        onUpdate: (_table, value) => updates.push(value),
      });
      expect(
        await repository(db).findActive(
          record.tokenHash,
          new Date(now.getTime() + elapsed),
        ),
      ).toBeNull();
      expect(updates).toHaveLength(0);
    },
  );

  it.each([
    {
      name: "absolute equality",
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1_000),
      lastSeenAt: now,
    },
    { name: "future activity", lastSeenAt: new Date(now.getTime() + 1) },
    { name: "future creation", createdAt: new Date(now.getTime() + 1) },
    {
      name: "activity before creation",
      lastSeenAt: new Date(now.getTime() - 1),
    },
    { name: "stored expiry equality", expiresAt: now },
    { name: "revoked", revokedAt: now },
    { name: "suspended", status: "SUSPENDED" },
    { name: "missing creation", createdAt: undefined },
    { name: "malformed activity", lastSeenAt: new Date("invalid") },
  ])("never refreshes invalid proof: $name", async (override) => {
    const updates: unknown[] = [];
    const db = createFakeDatabase({
      rows: [[], [{ ...principalRow, ...override }]],
      onUpdate: (_table, value) => updates.push(value),
    });
    expect(await repository(db).findActive(record.tokenHash, now)).toBeNull();
    expect(updates).toEqual([]);
  });

  it("refreshes only after validating the previous activity and copies internal deadline proof", async () => {
    const updates: unknown[] = [];
    const next = new Date(now.getTime() + 1_000);
    const db = createFakeDatabase({
      rows: [[], [principalRow]],
      onUpdate: (_table, value) => updates.push(value),
    });
    const principal = await repository(db).findActive(record.tokenHash, next);
    expect(updates).toEqual([{ lastSeenAt: next }]);
    expect(principal?.sessionLifetime?.createdAt).toEqual(record.createdAt);
    expect(principal?.sessionLifetime?.createdAt).not.toBe(record.createdAt);
    expect(principal?.sessionLifetime?.lastSeenAt).toEqual(next);
  });

  it("rejects invalid token hashes or timestamps", async () => {
    const db = createFakeDatabase();
    await expect(repository(db).findActive("nope", now)).rejects.toThrow(
      PersistenceMappingError,
    );
    await expect(
      repository(db).findActive(record.tokenHash, new Date("invalid")),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(repository(db).revoke("nope", now)).rejects.toThrow(
      PersistenceMappingError,
    );
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
      rows: [[], [principalRow], [{ id: record.sessionId }]],
    });
    await expect(
      repository(rotated).rotate!(record.tokenHash, record, now),
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

  it.each([
    { name: "reset absolute origin", createdAt: new Date(now.getTime() + 1) },
    {
      name: "extended absolute deadline",
      expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1_000 + 1),
    },
    {
      name: "different account",
      accountId: "44444444-4444-4444-8444-444444444444",
    },
    { name: "different roles", roles: ["ADMIN"] as const },
    {
      name: "different scopes",
      scopes: ["44444444-4444-4444-8444-444444444444"],
    },
    { name: "stale refresh", lastSeenAt: new Date(now.getTime() - 1) },
    { name: "already revoked", revokedAt: now },
  ])("rejects unsafe rotation before any write: $name", async (override) => {
    const writes: unknown[] = [];
    const db = createFakeDatabase({
      rows: [[], [principalRow]],
      onUpdate: (_table, value) => writes.push(value),
      onInsert: (_table, value) => writes.push(value),
    });
    await expect(
      repository(db).rotate!(record.tokenHash, { ...record, ...override }, now),
    ).rejects.toThrow("preserve session identity and absolute deadline");
    expect(writes).toEqual([]);
  });

  it("rechecks idle and revocation under the rotation lock", async () => {
    for (const previous of [
      { ...principalRow, revokedAt: now },
      {
        ...principalRow,
        roles: ["MODERATOR"],
        lastSeenAt: new Date(now.getTime() - 30 * 60 * 1_000),
        createdAt: new Date(now.getTime() - 30 * 60 * 1_000),
      },
    ]) {
      const writes: unknown[] = [];
      const db = createFakeDatabase({
        rows: [[], [previous]],
        onUpdate: (_table, value) => writes.push(value),
        onInsert: (_table, value) => writes.push(value),
      });
      await expect(
        repository(db).rotate!(record.tokenHash, record, now),
      ).rejects.toThrow("no longer active");
      expect(writes).toEqual([]);
      expect(db.lock).toHaveBeenCalledWith("update", { of: sessions });
    }
  });
});
