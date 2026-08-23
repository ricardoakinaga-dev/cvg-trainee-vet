import { describe, expect, it, vi } from "vitest";

import { createAccountRecoveryTransaction } from "./account-recovery-repository.js";

function emptyDatabase(
  options: Readonly<{
    readonly selectRows?: readonly unknown[];
    readonly returningRows?: readonly unknown[];
  }> = {},
) {
  const query = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    orderBy: () => query,
    limit: async () => options.selectRows ?? [],
    update: () => query,
    set: () => query,
    returning: async () => options.returningRows ?? [],
    insert: () => query,
    values: async () => [],
    execute: async () => undefined,
  };
  const database = {
    transaction: async (work: (executor: unknown) => unknown) => work(database),
    select: () => query,
    update: () => query,
    insert: () => query,
    execute: vi.fn(async () => undefined),
  };
  return database;
}

describe("account recovery persistence invariants", () => {
  it("rejects malformed token hashes before querying", async () => {
    const db = emptyDatabase();
    const transaction = createAccountRecoveryTransaction(db as never);
    await expect(
      transaction.run((operations) =>
        operations.recovery.findActive(
          "short",
          new Date("2026-08-23T12:00:00.000Z"),
        ),
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("returns no target for an empty scoped lookup", async () => {
    const db = emptyDatabase();
    const transaction = createAccountRecoveryTransaction(db as never);
    await expect(
      transaction.run((operations) =>
        operations.recovery.findManaged(
          "33333333-3333-4333-8333-333333333333",
          "22222222-2222-4222-8222-222222222222",
        ),
      ),
    ).resolves.toBeNull();
  });

  it("rejects invalid expiry before opening database work", async () => {
    const transaction = createAccountRecoveryTransaction(
      emptyDatabase() as never,
    );
    await expect(
      transaction.run((operations) =>
        operations.recovery.consume(
          "33333333-3333-4333-8333-333333333333",
          new Date("invalid"),
        ),
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("validates scoped identifiers and dates before queries", async () => {
    const transaction = createAccountRecoveryTransaction(
      emptyDatabase() as never,
    );
    const timestamp = new Date("2026-08-23T12:00:00.000Z");
    await expect(
      transaction.run((operations) =>
        operations.recovery.findManaged("", "scope-id"),
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      transaction.run((operations) =>
        operations.recovery.findManaged("account-id", ""),
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      transaction.run((operations) =>
        operations.recovery.revokeSessions("", "scope-id", timestamp),
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      transaction.run((operations) =>
        operations.recovery.revokeSessions("account-id", "", timestamp),
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      transaction.run((operations) =>
        operations.recovery.revokeSessions(
          "account-id",
          "scope-id",
          new Date("invalid"),
        ),
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("maps a valid managed account and rejects malformed identity snapshots", async () => {
    const baseRow = {
      accountId: "33333333-3333-4333-8333-333333333333",
      professionalEmail: "vet@example.invalid",
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: ["22222222-2222-4222-8222-222222222222"],
    };
    const scopeId = "22222222-2222-4222-8222-222222222222";
    const valid = createAccountRecoveryTransaction(
      emptyDatabase({ selectRows: [baseRow] }) as never,
    );
    await expect(
      valid.run((operations) =>
        operations.recovery.findManaged(baseRow.accountId, scopeId),
      ),
    ).resolves.toMatchObject({
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: baseRow.scopes,
    });

    for (const row of [
      { ...baseRow, accountStatus: "BROKEN" },
      { ...baseRow, roles: ["UNKNOWN"] },
      { ...baseRow, roles: "PARTICIPANT" },
      { ...baseRow, scopes: [] },
      { ...baseRow, scopes: [""] },
      { ...baseRow, scopes: "scope" },
    ]) {
      const transaction = createAccountRecoveryTransaction(
        emptyDatabase({ selectRows: [row] }) as never,
      );
      await expect(
        transaction.run((operations) =>
          operations.recovery.findManaged(baseRow.accountId, scopeId),
        ),
      ).rejects.toBeInstanceOf(Error);
    }
  });

  it("creates a hash-only recovery request and validates its dates", async () => {
    const createdAt = new Date("2026-08-23T12:00:00.000Z");
    const input = {
      recoveryId: "55555555-5555-4555-8555-555555555555",
      accountId: "33333333-3333-4333-8333-333333333333",
      scopeId: "22222222-2222-4222-8222-222222222222",
      tokenHash: "a".repeat(64),
      roles: ["PARTICIPANT"] as const,
      scopes: ["22222222-2222-4222-8222-222222222222"] as const,
      expiresAt: new Date("2026-08-23T12:30:00.000Z"),
      createdBy: "11111111-1111-4111-8111-111111111111",
      createdAt,
    };
    const database = emptyDatabase();
    const transaction = createAccountRecoveryTransaction(database as never);
    await expect(
      transaction.run((operations) =>
        operations.recovery.invalidateAndCreate(input),
      ),
    ).resolves.toBeUndefined();
    await expect(
      transaction.run((operations) =>
        operations.recovery.invalidateAndCreate({
          ...input,
          expiresAt: createdAt,
        }),
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      transaction.run((operations) =>
        operations.recovery.invalidateAndCreate({
          ...input,
          expiresAt: new Date("invalid"),
        }),
      ),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      transaction.run((operations) =>
        operations.recovery.invalidateAndCreate({
          ...input,
          createdAt: new Date("invalid"),
        }),
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("maps an active recovery snapshot and atomically consumes it once", async () => {
    const row = {
      recoveryId: "55555555-5555-4555-8555-555555555555",
      accountId: "33333333-3333-4333-8333-333333333333",
      scopeId: "22222222-2222-4222-8222-222222222222",
      professionalEmail: "vet@example.invalid",
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: ["22222222-2222-4222-8222-222222222222"],
    };
    const timestamp = new Date("2026-08-23T12:00:00.000Z");
    const mapped = createAccountRecoveryTransaction(
      emptyDatabase({
        selectRows: [row],
        returningRows: [{ id: row.recoveryId }],
      }) as never,
    );
    await expect(
      mapped.run((operations) =>
        operations.recovery.findActive("a".repeat(64), timestamp),
      ),
    ).resolves.toMatchObject({
      recoveryId: row.recoveryId,
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
    });
    await expect(
      mapped.run((operations) =>
        operations.recovery.consume(row.recoveryId, timestamp),
      ),
    ).resolves.toBeUndefined();

    const unavailable = createAccountRecoveryTransaction(
      emptyDatabase({ selectRows: [] }) as never,
    );
    await expect(
      unavailable.run((operations) =>
        operations.recovery.findActive("a".repeat(64), timestamp),
      ),
    ).resolves.toBeNull();
    await expect(
      unavailable.run((operations) =>
        operations.recovery.consume(row.recoveryId, timestamp),
      ),
    ).rejects.toThrow("already consumed");
  });
});
