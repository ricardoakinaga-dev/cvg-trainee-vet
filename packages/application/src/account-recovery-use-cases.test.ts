import { describe, expect, it, vi } from "vitest";

import {
  acceptAccountRecovery,
  issueAccountRecovery,
  type AccountRecoveryManagedAccount,
  type AccountRecoveryTransactionalOperations,
  type AccountRecoveryTransactionPort,
} from "./account-recovery-use-cases.js";

const admin = {
  principalId: "11111111-1111-4111-8111-111111111111",
  accountStatus: "ACTIVE" as const,
  roles: ["ADMIN"] as const,
  scopes: ["22222222-2222-4222-8222-222222222222"] as const,
  targetAccountId: "33333333-3333-4333-8333-333333333333",
  scopeId: "22222222-2222-4222-8222-222222222222",
  correlationId: "44444444-4444-4444-8444-444444444444",
};

const managedTarget = {
  accountId: admin.targetAccountId,
  professionalEmail: "vet@example.invalid",
  accountStatus: "ACTIVE" as const,
  roles: ["PARTICIPANT"] as const,
  scopes: [admin.scopeId] as const,
  scopeId: admin.scopeId,
};

function transaction(
  input: {
    readonly managed?: AccountRecoveryManagedAccount | null;
    readonly active?:
      (AccountRecoveryManagedAccount & { recoveryId: string }) | null;
    readonly runError?: unknown;
    readonly consumeError?: unknown;
  } = {},
): AccountRecoveryTransactionPort {
  const operations: AccountRecoveryTransactionalOperations = {
    recovery: {
      findManaged: vi.fn(async () =>
        input.managed === undefined ? managedTarget : input.managed,
      ),
      revokeSessions: vi.fn(async () => 0),
      invalidateAndCreate: vi.fn(async () => undefined),
      findActive: vi.fn(async () => input.active ?? null),
      consume: vi.fn(async () => {
        if (input.consumeError !== undefined) throw input.consumeError;
      }),
    },
    sessions: {
      create: vi.fn(async () => undefined),
      findActive: vi.fn(async () => null),
      revoke: vi.fn(async () => undefined),
    },
    audit: { append: vi.fn(async () => undefined) },
  };
  return {
    run: vi.fn(async (work) => {
      if (input.runError !== undefined) throw input.runError;
      return work(operations);
    }),
  };
}

describe("account recovery use cases", () => {
  it("issues a one-time recovery link only for an active scoped account", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(
        {
          ...admin,
          expiresInSeconds: 1800,
          now: new Date("2026-08-23T12:00:00.000Z"),
          tokenFactory: () => "a".repeat(32),
          recoveryIdFactory: () => "55555555-5555-4555-8555-555555555555",
        },
        { transaction: recovery, idFactory: () => "audit-id" },
      ),
    ).resolves.toMatchObject({
      accountId: admin.targetAccountId,
      professionalEmail: "vet@example.invalid",
      token: "a".repeat(32),
      revokedSessions: 0,
    });

    const operations = await recovery.run(async (value) => value);
    expect(operations.recovery.invalidateAndCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
        recoveryId: "55555555-5555-4555-8555-555555555555",
      }),
    );
    expect(operations.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "account.recovery.issued" }),
    );
  });

  it("does not issue recovery for an inactive account", async () => {
    const recovery = transaction({
      managed: { ...managedTarget, accountStatus: "SUSPENDED" },
    });
    await expect(
      issueAccountRecovery(
        {
          ...admin,
          expiresInSeconds: 1800,
        },
        { transaction: recovery, idFactory: () => "audit-id" },
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("rejects invalid issue inputs and unauthorized principals", async () => {
    const dependencies = {
      transaction: transaction(),
      idFactory: () => "audit-id",
    };
    await expect(
      issueAccountRecovery(
        { ...admin, principalId: "", expiresInSeconds: 1800 },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      issueAccountRecovery(
        { ...admin, accountStatus: "BROKEN" as never, expiresInSeconds: 1800 },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      issueAccountRecovery(
        { ...admin, roles: [], expiresInSeconds: 1800 },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      issueAccountRecovery({ ...admin, expiresInSeconds: 59 }, dependencies),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      issueAccountRecovery({ ...admin, expiresInSeconds: 1801 }, dependencies),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      issueAccountRecovery(
        {
          ...admin,
          expiresInSeconds: 1800,
          tokenFactory: () => "short",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      issueAccountRecovery(
        {
          ...admin,
          targetAccountId: admin.principalId,
          expiresInSeconds: 1800,
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      issueAccountRecovery(
        { ...admin, expiresInSeconds: 1800 },
        {
          transaction: transaction({ managed: null }),
          idFactory: () => "audit-id",
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      issueAccountRecovery(
        {
          ...admin,
          expiresInSeconds: 1800,
          now: new Date("invalid"),
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      issueAccountRecovery(
        {
          ...admin,
          expiresInSeconds: 1800,
          recoveryIdFactory: () => "",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("consumes a one-time recovery and creates a fresh session", async () => {
    const recoveryId = "55555555-5555-4555-8555-555555555555";
    const recovery = transaction({
      active: { ...managedTarget, recoveryId },
    });
    const result = await acceptAccountRecovery(
      {
        token: "b".repeat(32),
        sessionExpiresInSeconds: 3600,
        correlationId: admin.correlationId,
        now: new Date("2026-08-23T12:00:00.000Z"),
        sessionTokenFactory: () => "c".repeat(32),
        sessionIdFactory: () => "66666666-6666-4666-8666-666666666666",
      },
      { transaction: recovery, idFactory: () => "audit-id" },
    );
    expect(result).toMatchObject({
      accountId: admin.targetAccountId,
      session: { token: "c".repeat(32) },
    });
    const operations = await recovery.run(async (value) => value);
    expect(operations.recovery.consume).toHaveBeenCalledWith(
      recoveryId,
      new Date("2026-08-23T12:00:00.000Z"),
    );
    expect(operations.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "account.recovery.accepted" }),
    );
  });

  it("rejects malformed or already unavailable tokens before persistence", async () => {
    const recovery = transaction();
    await expect(
      acceptAccountRecovery(
        {
          token: "short",
          sessionExpiresInSeconds: 3600,
          correlationId: admin.correlationId,
        },
        { transaction: recovery, idFactory: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      acceptAccountRecovery(
        {
          token: "a".repeat(32),
          sessionExpiresInSeconds: 3600,
          correlationId: admin.correlationId,
        },
        { transaction: recovery, idFactory: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("normalizes acceptance lifetime, conflict, and unexpected failures", async () => {
    const validCommand = {
      token: "b".repeat(32),
      sessionExpiresInSeconds: 3600,
      correlationId: admin.correlationId,
    };
    await expect(
      acceptAccountRecovery(
        { ...validCommand, correlationId: "" },
        { transaction: transaction(), idFactory: () => "audit-id" },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      acceptAccountRecovery(
        { ...validCommand, sessionExpiresInSeconds: 59 },
        { transaction: transaction(), idFactory: () => "audit-id" },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      acceptAccountRecovery(
        { ...validCommand, now: new Date("invalid") },
        { transaction: transaction(), idFactory: () => "audit-id" },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      acceptAccountRecovery(validCommand, {
        transaction: transaction({
          active: { ...managedTarget, recoveryId: "recovery-id" },
          consumeError: Object.assign(new Error("race"), {
            name: "AccountRecoveryConflict",
          }),
        }),
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "state_conflict" });
    await expect(
      acceptAccountRecovery(validCommand, {
        transaction: transaction({
          runError: new Error("unexpected"),
        }),
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "internal_error" });
  });

  it("accepts with generated session material when factories are omitted", async () => {
    const result = await acceptAccountRecovery(
      {
        token: "d".repeat(32),
        sessionExpiresInSeconds: 3600,
        correlationId: admin.correlationId,
        now: new Date("2026-08-23T12:00:00.000Z"),
      },
      {
        transaction: transaction({
          active: { ...managedTarget, recoveryId: "recovery-id" },
        }),
        idFactory: () => "audit-id",
      },
    );
    expect(result.session.token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
  });
});
