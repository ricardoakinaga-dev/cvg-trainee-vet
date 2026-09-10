import { describe, expect, it, vi } from "vitest";

import type {
  AccountManagementResendInput,
  AccountManagementStatusInput,
} from "@cvg/application";

import {
  AccountManagementConflictError,
  accountStatusTransitionReason,
  createAccountManagementRepository,
} from "./account-management-repository.js";
import { PersistenceMappingError } from "./attempt-repository.js";

describe("account management persistence invariants", () => {
  it("uses auditable, non-sensitive status transition reason codes", () => {
    expect(accountStatusTransitionReason("ACTIVE", "DEACTIVATED")).toBe(
      "account_status_active_to_deactivated",
    );
    expect(accountStatusTransitionReason("INVITED", "SUSPENDED")).toBe(
      "account_status_invited_to_suspended",
    );
    expect(() =>
      accountStatusTransitionReason("UNKNOWN" as never, "ACTIVE"),
    ).toThrow();
    expect(() =>
      accountStatusTransitionReason("ACTIVE", "INVITED" as never),
    ).toThrow();
  });

  it("exposes a distinct conflict for concurrent or invalid lifecycle changes", () => {
    const error = new AccountManagementConflictError("conflict");
    expect(error.name).toBe("AccountManagementConflict");
    expect(error).toBeInstanceOf(Error);
  });

  it("keeps the expected status as the optimistic concurrency boundary", () => {
    expect(accountStatusTransitionReason("SUSPENDED", "ACTIVE")).toBe(
      "account_status_suspended_to_active",
    );
  });

  it("rejects malformed lifecycle inputs before opening a transaction", async () => {
    const transaction = vi.fn();
    const repository = createAccountManagementRepository({
      transaction,
    } as never);
    const statusInput: AccountManagementStatusInput = {
      targetAccountId: "33333333-3333-4333-8333-333333333333",
      scopeId: "22222222-2222-4222-8222-222222222222",
      expectedStatus: "ACTIVE",
      status: "SUSPENDED",
      principalId: "11111111-1111-4111-8111-111111111111",
      now: new Date("2026-08-23T12:00:00.000Z"),
      audit: {
        auditId: "44444444-4444-4444-8444-444444444444",
        principalId: "11111111-1111-4111-8111-111111111111",
        action: "account.status.changed",
        resourceType: "account",
        resourceId: "33333333-3333-4333-8333-333333333333",
        scopeId: "22222222-2222-4222-8222-222222222222",
        outcome: "SUCCESS",
        reasonCode: "account_lifecycle_transition",
        requestId: "55555555-5555-4555-8555-555555555555",
        correlationId: "55555555-5555-4555-8555-555555555555",
        occurredAt: "2026-08-23T12:00:00.000Z",
      },
    };
    await expect(
      repository.changeStatus({ ...statusInput, targetAccountId: " " }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      repository.changeStatus({
        ...statusInput,
        expectedStatus: "UNKNOWN" as never,
      }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      repository.changeStatus({ ...statusInput, status: "INVITED" as never }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      repository.changeStatus({
        ...statusInput,
        now: new Date("invalid"),
      }),
    ).rejects.toBeInstanceOf(Error);

    const resendInput: AccountManagementResendInput = {
      targetAccountId: statusInput.targetAccountId,
      scopeId: statusInput.scopeId,
      principalId: statusInput.principalId,
      invitationId: "66666666-6666-4666-8666-666666666666",
      tokenHash: "a".repeat(64),
      expiresAt: new Date("2026-08-23T13:00:00.000Z"),
      createdAt: new Date("2026-08-23T12:00:00.000Z"),
      audit: {
        ...statusInput.audit,
        action: "account.invitation.resent",
        resourceType: "account_invitation",
        resourceId: "66666666-6666-4666-8666-666666666666",
      },
    };
    await expect(
      repository.resendInvitation({ ...resendInput, invitationId: " " }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      repository.resendInvitation({ ...resendInput, tokenHash: "short" }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      repository.resendInvitation({
        ...resendInput,
        expiresAt: new Date("invalid"),
      }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      repository.resendInvitation({
        ...resendInput,
        expiresAt: resendInput.createdAt,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(transaction).not.toHaveBeenCalled();

    const query = {
      from: () => query,
      innerJoin: () => query,
      where: () => query,
      orderBy: () => query,
      limit: async () => [],
    };
    const emptyRepository = createAccountManagementRepository({
      transaction: async (work: (executor: never) => unknown) =>
        work({
          execute: async () => undefined,
          select: () => query,
        } as never),
    } as never);
    await expect(emptyRepository.changeStatus(statusInput)).resolves.toBeNull();
    await expect(
      emptyRepository.resendInvitation(resendInput),
    ).resolves.toBeNull();
  });
});

import { createFakeDatabase } from "./test-support/fake-database.js";

describe("account management repository flows", () => {
  const audit = {
    auditId: "88888888-8888-4888-8888-888888888888",
    actorKind: "AUTHENTICATED",
    principalId: "55555555-5555-4555-8555-555555555555",
    action: "account_status_changed",
    resourceType: "account",
    resourceId: "22222222-2222-4222-8222-222222222222",
    scopeId: "33333333-3333-4333-8333-333333333333",
    outcome: "SUCCESS",
    requestId: "req-1",
    correlationId: "corr-1",
    occurredAt: "2026-08-10T05:00:00.000Z",
  } as const;

  const statusInput = {
    targetAccountId: "22222222-2222-4222-8222-222222222222",
    scopeId: "33333333-3333-4333-8333-333333333333",
    expectedStatus: "ACTIVE",
    status: "SUSPENDED",
    principalId: "55555555-5555-4555-8555-555555555555",
    now: new Date("2026-08-10T05:00:00.000Z"),
    audit,
  } as const;

  const membershipRow = {
    accountId: statusInput.targetAccountId,
    professionalEmail: "profissional@example.com",
    accountStatus: "ACTIVE",
    roles: ["PARTICIPANT"],
    scopes: [statusInput.scopeId],
    acceptedAt: new Date("2026-08-01T00:00:00.000Z"),
  };

  function repository(db: ReturnType<typeof createFakeDatabase>) {
    return createAccountManagementRepository(
      db as unknown as Parameters<typeof createAccountManagementRepository>[0],
    );
  }

  it("changes status and revokes sessions when suspending", async () => {
    const db = createFakeDatabase({
      rows: [
        [],
        [membershipRow],
        [{ id: statusInput.targetAccountId, status: "SUSPENDED" }],
        [{ id: "sess-2" }, { id: "sess-3" }],
        [],
      ],
    });
    const result = await repository(db).changeStatus({ ...statusInput });
    expect(result).toMatchObject({
      accountId: statusInput.targetAccountId,
      status: "SUSPENDED",
      revokedSessions: 2,
    });
  });

  it("keeps the reason unchanged when the status did not actually change", async () => {
    const db = createFakeDatabase({
      rows: [
        [],
        [membershipRow],
        [{ id: statusInput.targetAccountId, status: "ACTIVE" }],
        [],
      ],
    });
    const result = await repository(db).changeStatus({
      ...statusInput,
      status: "ACTIVE",
    });
    expect(result?.revokedSessions).toBe(0);
  });

  it("returns null when the participant membership does not exist", async () => {
    const db = createFakeDatabase({ rows: [[], []] });
    const result = await repository(db).changeStatus({ ...statusInput });
    expect(result).toBeNull();
  });

  it("conflicts when the account status changed before the action", async () => {
    const db = createFakeDatabase({
      rows: [[], [{ ...membershipRow, accountStatus: "SUSPENDED" }]],
    });
    await expect(
      repository(db).changeStatus({ ...statusInput }),
    ).rejects.toThrow(AccountManagementConflictError);
  });

  it("conflicts when an invited account is activated without accepting", async () => {
    const db = createFakeDatabase({
      rows: [
        [],
        [{ ...membershipRow, accountStatus: "INVITED", acceptedAt: null }],
      ],
    });
    await expect(
      repository(db).changeStatus({
        ...statusInput,
        expectedStatus: "INVITED",
        status: "ACTIVE",
      }),
    ).rejects.toThrow("must accept");
  });

  it("conflicts when the update affects no row", async () => {
    const db = createFakeDatabase({ rows: [[], [membershipRow], []] });
    await expect(
      repository(db).changeStatus({ ...statusInput }),
    ).rejects.toThrow("concurrently");
  });

  it("resends an invitation and expires the previous one", async () => {
    const resend = {
      targetAccountId: statusInput.targetAccountId,
      scopeId: statusInput.scopeId,
      principalId: "55555555-5555-4555-8555-555555555555",
      invitationId: "99999999-9999-4999-8999-999999999999",
      tokenHash: "b".repeat(64),
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-10T05:00:00.000Z"),
      audit,
    } as const;
    const db = createFakeDatabase({
      rows: [[], [], [membershipRow], [], [], [], []],
    });
    const target = await repository(db).resendInvitation({ ...resend });
    expect(target).toMatchObject({
      accountId: statusInput.targetAccountId,
      professionalEmail: membershipRow.professionalEmail,
    });
  });

  it("returns null when the invited membership does not exist", async () => {
    const resend = {
      targetAccountId: statusInput.targetAccountId,
      scopeId: statusInput.scopeId,
      principalId: "55555555-5555-4555-8555-555555555555",
      invitationId: "99999999-9999-4999-8999-999999999999",
      tokenHash: "b".repeat(64),
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-10T05:00:00.000Z"),
      audit,
    } as const;
    const db = createFakeDatabase({ rows: [[], [], []] });
    expect(await repository(db).resendInvitation({ ...resend })).toBeNull();
  });

  it("rejects resend inputs with invalid dates or token hashes", async () => {
    const db = createFakeDatabase();
    const resend = {
      targetAccountId: statusInput.targetAccountId,
      scopeId: statusInput.scopeId,
      principalId: "55555555-5555-4555-8555-555555555555",
      invitationId: "99999999-9999-4999-8999-999999999999",
      tokenHash: "short",
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-10T05:00:00.000Z"),
      audit,
    } as const;
    await expect(
      repository(db).resendInvitation({ ...resend }),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      repository(db).resendInvitation({
        ...resend,
        tokenHash: "b".repeat(64),
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("after");
  });
});
