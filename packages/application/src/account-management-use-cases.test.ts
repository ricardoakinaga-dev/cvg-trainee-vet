import { describe, expect, it, vi } from "vitest";

import {
  listManagedAccounts,
  revokeManagedAccountSessions,
  updateManagedAccount,
  type AccountManagementTransactionalOperations,
  type AccountManagementUseCaseDependencies,
  type ManagedAccount,
} from "./account-management-use-cases.js";

const target: ManagedAccount = Object.freeze({
  accountId: "11111111-1111-4111-8111-111111111111",
  professionalEmail: "trainee@example.test",
  accountStatus: "ACTIVE",
  roles: Object.freeze(["PARTICIPANT"] as const),
  scopes: Object.freeze(["scope-a"]),
  version: 0,
  createdAt: new Date("2026-08-11T20:00:00.000Z"),
  updatedAt: new Date("2026-08-11T20:00:00.000Z"),
});

const admin = Object.freeze({
  principalId: "22222222-2222-4222-8222-222222222222",
  accountStatus: "ACTIVE" as const,
  roles: Object.freeze(["ADMIN"] as const),
  scopes: Object.freeze(["scope-a"]),
});

function dependencies(
  account: ManagedAccount | null = target,
): AccountManagementUseCaseDependencies & {
  readonly auditEntries: readonly unknown[];
  readonly revokedAccounts: readonly string[];
} {
  const auditEntries: unknown[] = [];
  const revokedAccounts: string[] = [];
  const operations: AccountManagementTransactionalOperations = {
    accounts: {
      list: vi.fn(async () =>
        Object.freeze({
          accounts: account === null ? [] : [account],
          nextCursor: null,
        }),
      ),
      findById: vi.fn(async () => account),
      update: vi.fn(async (input) =>
        account === null || input.expectedVersion !== account.version
          ? null
          : Object.freeze({
              ...account,
              ...(input.status === undefined
                ? {}
                : { accountStatus: input.status }),
              ...(input.roles === undefined ? {} : { roles: input.roles }),
              ...(input.scopes === undefined ? {} : { scopes: input.scopes }),
              version: account.version + 1,
              updatedAt: new Date("2026-08-11T21:00:00.000Z"),
            }),
      ),
    },
    sessions: {
      revokeAll: vi.fn(async (accountId: string) => {
        revokedAccounts.push(accountId);
        return 2;
      }),
    },
    audit: {
      append: vi.fn(async (entry) => {
        auditEntries.push(entry);
      }),
    },
  };

  return {
    idFactory: () => "33333333-3333-4333-8333-333333333333",
    transaction: { run: async (work) => work(operations) },
    auditEntries,
    revokedAccounts,
  };
}

describe("managed account lifecycle", () => {
  it("lists only accounts in the administrator scope", async () => {
    const result = await listManagedAccounts(
      {
        ...admin,
        limit: 50,
        correlationId: "request-1",
      },
      dependencies(),
    );

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.professionalEmail).toBe("trainee@example.test");
    expect(result.nextCursor).toBeNull();
  });

  it("denies non-admins, cross-scope targets, and ADMIN escalation", async () => {
    await expect(
      listManagedAccounts(
        {
          principalId: "participant",
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: ["scope-a"],
          limit: 50,
          correlationId: "request-2",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          nextScopes: ["scope-b"],
          correlationId: "request-3",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          nextRoles: ["ADMIN"],
          correlationId: "request-4",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("updates and audits a scoped account, revoking sessions on deactivation", async () => {
    const deps = dependencies();
    const result = await updateManagedAccount(
      {
        ...admin,
        targetAccountId: target.accountId,
        expectedVersion: 0,
        nextStatus: "DEACTIVATED",
        correlationId: "request-5",
      },
      deps,
    );

    expect(result.accountStatus).toBe("DEACTIVATED");
    expect(result.version).toBe(1);
    expect(deps.revokedAccounts).toEqual([target.accountId]);
    expect(deps.auditEntries).toHaveLength(1);
    expect(deps.auditEntries[0]).toMatchObject({
      action: "account.updated",
      outcome: "SUCCESS",
      resourceId: target.accountId,
    });
  });

  it("turns an optimistic-lock miss into a stable conflict", async () => {
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 9,
          nextStatus: "SUSPENDED",
          correlationId: "request-6",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("revokes sessions and records the count without exposing session material", async () => {
    const deps = dependencies();
    await expect(
      revokeManagedAccountSessions(
        {
          ...admin,
          targetAccountId: target.accountId,
          correlationId: "request-7",
        },
        deps,
      ),
    ).resolves.toEqual({ accountId: target.accountId, revokedCount: 2 });
    expect(deps.auditEntries[0]).toMatchObject({
      action: "account.sessions_revoked",
      resourceType: "account",
      outcome: "SUCCESS",
    });
    expect(JSON.stringify(deps.auditEntries)).not.toContain("token");
  });

  it("fails closed for malformed principals, correlation ids, limits, and scopes", async () => {
    await expect(
      listManagedAccounts(
        { ...admin, principalId: "", limit: 50, correlationId: "request-8" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      listManagedAccounts(
        { ...admin, limit: 0, correlationId: "request-9" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      listManagedAccounts(
        { ...admin, limit: 201, correlationId: "request-10" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      listManagedAccounts(
        {
          ...admin,
          limit: 50,
          status: "BROKEN" as never,
          correlationId: "request-11",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      listManagedAccounts(
        { ...admin, limit: 50, correlationId: "\u0001" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      listManagedAccounts(
        { ...admin, scopes: [], limit: 50, correlationId: "request-12" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      listManagedAccounts(
        {
          ...admin,
          limit: 50,
          scopeId: "scope-b",
          correlationId: "request-13",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("supports bounded filters and excludes accounts outside the returned scope", async () => {
    const filtered = dependencies(
      Object.freeze({ ...target, scopes: Object.freeze(["scope-b"]) }),
    );
    const result = await listManagedAccounts(
      {
        ...admin,
        limit: 50,
        status: "ACTIVE",
        scopeId: "scope-a",
        correlationId: "request-14",
      },
      filtered,
    );
    expect(result.accounts).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("rejects invalid update fields, missing targets, and immutable targets", async () => {
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: -1,
          nextStatus: "ACTIVE",
          correlationId: "request-15",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          nextStatus: "BROKEN" as never,
          correlationId: "request-16",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          nextRoles: ["ROOT" as never],
          correlationId: "request-17",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          nextScopes: ["   "],
          correlationId: "request-18",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          correlationId: "request-19",
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          nextStatus: "ACTIVE",
          correlationId: "request-20",
          now: new Date("invalid"),
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          nextStatus: "ACTIVE",
          correlationId: "request-21",
        },
        dependencies(null),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: admin.principalId,
          expectedVersion: 0,
          nextStatus: "ACTIVE",
          correlationId: "request-22",
        },
        dependencies(
          Object.freeze({ ...target, accountId: admin.principalId }),
        ),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      updateManagedAccount(
        {
          ...admin,
          targetAccountId: target.accountId,
          expectedVersion: 0,
          nextStatus: "ACTIVE",
          correlationId: "request-23",
        },
        dependencies(
          Object.freeze({
            ...target,
            roles: Object.freeze(["ADMIN"] as const),
          }),
        ),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("revokes sessions when active account roles or scopes change", async () => {
    const deps = dependencies();
    const result = await updateManagedAccount(
      {
        ...admin,
        scopes: ["scope-a", "scope-b"],
        targetAccountId: target.accountId,
        expectedVersion: 0,
        nextStatus: "ACTIVE",
        nextRoles: ["MODERATOR"],
        nextScopes: ["scope-a", "scope-b"],
        correlationId: "request-24",
        now: new Date("2026-08-11T22:00:00.000Z"),
      },
      deps,
    );
    expect(result.accountStatus).toBe("ACTIVE");
    expect(result.roles).toEqual(["MODERATOR"]);
    expect(result.scopes).toEqual(["scope-a", "scope-b"]);
    expect(deps.revokedAccounts).toEqual([target.accountId]);
    expect(deps.auditEntries[0]).toMatchObject({ scopeId: "scope-a" });
  });

  it("rejects invalid session-revocation dates and unavailable targets", async () => {
    await expect(
      revokeManagedAccountSessions(
        {
          ...admin,
          targetAccountId: target.accountId,
          correlationId: "request-25",
          now: new Date("invalid"),
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      revokeManagedAccountSessions(
        {
          ...admin,
          targetAccountId: target.accountId,
          correlationId: "request-26",
        },
        dependencies(null),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      revokeManagedAccountSessions(
        {
          ...admin,
          targetAccountId: target.accountId,
          correlationId: "request-27",
        },
        dependencies(
          Object.freeze({ ...target, scopes: Object.freeze(["scope-b"]) }),
        ),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
