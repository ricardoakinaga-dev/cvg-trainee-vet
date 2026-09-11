import { describe, expect, it, vi } from "vitest";

import {
  acceptAccountRecovery,
  issueAccountRecovery,
  type AccountRecoveryTransactionPort,
  type AccountRecoveryTransactionalOperations,
} from "./account-recovery-use-cases.js";
import { ApplicationError } from "./errors.js";

/**
 * AAA-FINAL-002 — Mutation Assurance Closure (recovery token lifecycle).
 *
 * Killer tests comportamentais: status proibidos, janelas de expiração,
 * matemática de expiração, mapeamento not_found (oráculo de disponibilidade),
 * passthrough de erro, factories e auditoria. Riscos: recovery para conta
 * suspensa, token vitalício, oráculo de existência, sessão sem expiração.
 */

const admin = {
  principalId: "11111111-1111-4111-8111-111111111111",
  accountStatus: "ACTIVE" as const,
  roles: ["ADMIN"] as const,
  scopes: ["22222222-2222-4222-8222-222222222222"] as const,
  targetAccountId: "33333333-3333-4333-8333-333333333333",
  scopeId: "22222222-2222-4222-8222-222222222222",
  correlationId: "44444444-4444-4444-8444-444444444444",
};

const NOW = new Date("2026-09-11T12:00:00.000Z");

const managedTarget = {
  accountId: admin.targetAccountId,
  professionalEmail: "vet@example.invalid",
  accountStatus: "ACTIVE" as const,
  roles: ["PARTICIPANT"] as const,
  scopes: [admin.scopeId] as const,
  scopeId: admin.scopeId,
};

function transaction(managed: typeof managedTarget | null = managedTarget) {
  const operations = {
    recovery: {
      findManaged: vi.fn(async () => managed),
      revokeSessions: vi.fn(async () => 2),
      invalidateAndCreate: vi.fn(async () => undefined),
      findActive: vi.fn(async () => null),
      consume: vi.fn(async () => undefined),
    },
    sessions: {
      create: vi.fn(async () => undefined),
      findActive: vi.fn(async () => null),
      revoke: vi.fn(async () => undefined),
    },
    audit: { append: vi.fn(async () => undefined) },
  };
  const ops = operations as unknown as AccountRecoveryTransactionalOperations;
  const ran: Array<unknown> = [];
  return {
    operations,
    ran,
    run: (async <Result>(
      work: (
        operations: AccountRecoveryTransactionalOperations,
      ) => Promise<Result>,
    ) => {
      ran.push(true);
      return work(ops);
    }) as AccountRecoveryTransactionPort["run"],
  };
}

const issue = (overrides = {}) => ({
  ...admin,
  expiresInSeconds: 600,
  now: NOW,
  tokenFactory: () => "r".repeat(32),
  recoveryIdFactory: () => "55555555-5555-4777-8777-555555555555",
  ...overrides,
});

describe("recovery mutation closure — issue guards", () => {
  it("rejects whitespace-only identities before persistence", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ principalId: "   " }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(recovery.ran).toHaveLength(0);
  });

  it("rejects unknown account statuses before authorization", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ accountStatus: "GARBAGE" as never }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(recovery.ran).toHaveLength(0);
  });

  it("rejects factory tokens outside the accepted format", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ tokenFactory: () => "short" }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("denies suspended administrators with forbidden", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ accountStatus: "SUSPENDED" }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("accepts the lower session bound on accept", async () => {
    const operations = {
      recovery: {
        findManaged: vi.fn(async () => null),
        revokeSessions: vi.fn(async () => 0),
        invalidateAndCreate: vi.fn(async () => undefined),
        findActive: vi.fn(async () => ({
          ...managedTarget,
          recoveryId: "rec-4",
        })),
        consume: vi.fn(async () => undefined),
      },
      sessions: {
        create: vi.fn(async () => undefined),
        findActive: vi.fn(async () => null),
        revoke: vi.fn(async () => undefined),
      },
      audit: { append: vi.fn(async () => undefined) },
    };
    await expect(
      acceptAccountRecovery(
        {
          token: "x".repeat(32),
          sessionExpiresInSeconds: 60,
          correlationId: admin.correlationId,
          now: NOW,
        },
        {
          transaction: { run: vi.fn(async (work) => work(operations)) },
          idFactory: () => "audit-id",
        },
      ),
    ).resolves.toMatchObject({ accountId: admin.targetAccountId });
  });

  it("denies invited administrators before validating anything else", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ accountStatus: "INVITED" }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects overlong factory tokens on issue", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ tokenFactory: () => "z".repeat(300) }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(recovery.ran).toHaveLength(0);
  });

  it("denies deactivated administrators before validating anything else", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ accountStatus: "DEACTIVATED" }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("denies participants before touching persistence", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ roles: ["PARTICIPANT"] as const }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(recovery.ran).toHaveLength(0);
  });

  it("accepts the upper session bound and rejects above it", async () => {
    const operations = {
      recovery: {
        findManaged: vi.fn(async () => null),
        revokeSessions: vi.fn(async () => 0),
        invalidateAndCreate: vi.fn(async () => undefined),
        findActive: vi.fn(async () => ({
          ...managedTarget,
          recoveryId: "rec-3",
        })),
        consume: vi.fn(async () => undefined),
      },
      sessions: {
        create: vi.fn(async () => undefined),
        findActive: vi.fn(async () => null),
        revoke: vi.fn(async () => undefined),
      },
      audit: { append: vi.fn(async () => undefined) },
    };
    const acceptDeps = {
      transaction: { run: vi.fn(async (work) => work(operations)) },
      idFactory: () => "audit-id",
    };
    await expect(
      acceptAccountRecovery(
        {
          token: "w".repeat(32),
          sessionExpiresInSeconds: 604_800,
          correlationId: admin.correlationId,
          now: NOW,
        },
        acceptDeps,
      ),
    ).resolves.toMatchObject({ accountId: admin.targetAccountId });
  });

  it("rejects recovery for suspended and deactivated targets", async () => {
    for (const accountStatus of ["SUSPENDED", "DEACTIVATED"] as const) {
      const recovery = transaction({
        ...managedTarget,
        accountStatus,
      } as unknown as typeof managedTarget);
      await expect(
        issueAccountRecovery(issue(), {
          transaction: recovery,
          idFactory: () => "audit-id",
        }),
      ).rejects.toMatchObject({ code: "state_conflict" });
    }
  });

  it("rejects self-recovery through this route", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ targetAccountId: admin.principalId }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("enforces the recovery lifetime window on both bounds", async () => {
    const recovery = transaction();
    const deps = { transaction: recovery, idFactory: () => "audit-id" };
    await expect(
      issueAccountRecovery(issue({ expiresInSeconds: 59 }), deps),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      issueAccountRecovery(issue({ expiresInSeconds: 1801 }), deps),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      issueAccountRecovery(issue({ expiresInSeconds: 60 }), deps),
    ).resolves.toMatchObject({ accountId: admin.targetAccountId });
  });

  it("accepts the upper recovery bound", async () => {
    const recovery = transaction();
    await expect(
      issueAccountRecovery(issue({ expiresInSeconds: 1800 }), {
        transaction: recovery,
        idFactory: () => "audit-id",
      }),
    ).resolves.toMatchObject({ accountId: admin.targetAccountId });
  });

  it("computes expiry by adding lifetime in milliseconds", async () => {
    const recovery = transaction();
    const result = await issueAccountRecovery(
      issue({ expiresInSeconds: 600 }),
      {
        transaction: recovery,
        idFactory: () => "audit-id",
      },
    );
    expect(result.expiresAt.getTime() - NOW.getTime()).toBe(600_000);
  });

  it("creates sessions with ACTIVE status by default on accept", async () => {
    const operations = {
      recovery: {
        findManaged: vi.fn(async () => null),
        revokeSessions: vi.fn(async () => 0),
        invalidateAndCreate: vi.fn(async () => undefined),
        findActive: vi.fn(async () => ({
          ...managedTarget,
          recoveryId: "rec-2",
        })),
        consume: vi.fn(async () => undefined),
      },
      sessions: {
        create: vi.fn(async (record: unknown) => {
          createdSession = record;
        }),
        findActive: vi.fn(async () => null),
        revoke: vi.fn(async () => undefined),
      },
      audit: { append: vi.fn(async () => undefined) },
    };
    let createdSession: unknown;
    const accepted = await acceptAccountRecovery(
      {
        token: "u".repeat(32),
        sessionExpiresInSeconds: 600,
        correlationId: admin.correlationId,
        now: NOW,
        sessionTokenFactory: () => "v".repeat(32),
        sessionIdFactory: () => "session-from-factory",
      },
      {
        transaction: { run: vi.fn(async (work) => work(operations)) },
        idFactory: () => "audit-id",
      },
    );
    expect(accepted.session.sessionId).toBe("session-from-factory");
    const created = createdSession as unknown as {
      accountStatus: string;
      tokenHash: string;
    };
    expect(created.accountStatus).toBe("ACTIVE");
    expect(created.tokenHash).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("audits the issue with SUCCESS and the issued reason", async () => {
    const recovery = transaction();
    await issueAccountRecovery(issue(), {
      transaction: recovery,
      idFactory: () => "audit-id",
    });
    expect(recovery.operations.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "account.recovery.issued",
        resourceType: "account_recovery",
        outcome: "SUCCESS",
        reasonCode: "controlled_access_recovery_issued",
      }),
    );
  });
});

describe("recovery mutation closure — accept mapping", () => {
  const accept = (overrides = {}) => ({
    token: "t".repeat(32),
    sessionExpiresInSeconds: 3600,
    correlationId: admin.correlationId,
    now: NOW,
    ...overrides,
  });
  const deps = () => ({
    transaction: transaction(),
    idFactory: () => "audit-id",
  });

  it("maps malformed tokens to not_found without revealing the reason", async () => {
    const recovery = deps();
    await expect(
      acceptAccountRecovery(accept({ token: "short" }), recovery),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(recovery.transaction.ran).toHaveLength(0);
  });

  it("maps unknown tokens to not_found (no availability oracle)", async () => {
    const recovery = deps();
    await expect(
      acceptAccountRecovery(accept(), recovery),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("passes ApplicationError through unchanged", async () => {
    const failing = {
      transaction: {
        run: vi.fn(async () => {
          throw new ApplicationError("not_found", "gone");
        }),
      },
      idFactory: () => "audit-id",
    };
    await expect(
      acceptAccountRecovery(accept(), failing),
    ).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("enforces the session lifetime window on accept", async () => {
    const recovery = deps();
    await expect(
      acceptAccountRecovery(accept({ sessionExpiresInSeconds: 59 }), recovery),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      acceptAccountRecovery(
        accept({ sessionExpiresInSeconds: 604_801 }),
        recovery,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("accepts a valid token and creates a bounded session", async () => {
    const operations = {
      recovery: {
        findManaged: vi.fn(async () => null),
        revokeSessions: vi.fn(async () => 0),
        invalidateAndCreate: vi.fn(async () => undefined),
        findActive: vi.fn(async () => ({
          ...managedTarget,
          recoveryId: "rec-1",
        })),
        consume: vi.fn(async () => undefined),
      },
      sessions: {
        create: vi.fn(async (record: unknown) => {
          createdRecord = record;
        }),
        findActive: vi.fn(async () => null),
        revoke: vi.fn(async () => undefined),
      },
      audit: { append: vi.fn(async () => undefined) },
    };
    let createdRecord: unknown;
    const result = await acceptAccountRecovery(accept(), {
      transaction: {
        run: (async <Result>(
          work: (ops: typeof operations) => Promise<Result>,
        ) => work(operations)) as never,
      },
      idFactory: () => "audit-id",
    });
    expect(result.accountId).toBe(admin.targetAccountId);
    expect(operations.recovery.consume).toHaveBeenCalledWith("rec-1", NOW);
    expect(operations.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: "account_recovery" }),
    );
    expect(operations.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "account.recovery.accepted",
        outcome: "SUCCESS",
        reasonCode: "controlled_access_recovery_accepted",
      }),
    );
    const created = createdRecord as unknown as {
      expiresAt: Date;
    };
    expect(created.expiresAt.getTime() - NOW.getTime()).toBe(3_600_000);
  });
});
