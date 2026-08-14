import { describe, expect, it } from "vitest";

import {
  createAccountManagementRepositories,
  createAccountManagementUseCaseDependencies,
  managedAccountRowToRecord,
  type ManagedAccountRowShape,
} from "./account-management-repository.js";

const row: ManagedAccountRowShape = {
  accountId: "11111111-1111-4111-8111-111111111111",
  professionalEmail: "trainee@example.test",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: ["scope-a"],
  version: 3,
  createdAt: new Date("2026-08-11T20:00:00.000Z"),
  updatedAt: new Date("2026-08-11T21:00:00.000Z"),
};

describe("managed account persistence mapping", () => {
  it("projects lifecycle fields without password or session material", () => {
    const account = managedAccountRowToRecord(row);

    expect(account).toEqual({
      accountId: row.accountId,
      professionalEmail: row.professionalEmail,
      accountStatus: row.accountStatus,
      roles: row.roles,
      scopes: row.scopes,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    expect(account).not.toHaveProperty("passwordHash");
    expect(account).not.toHaveProperty("tokenHash");
  });

  it("fails closed for invalid status, roles, version, and timestamps", () => {
    expect(() => managedAccountRowToRecord({ ...row, accountId: "" })).toThrow(
      "accountId",
    );
    expect(() =>
      managedAccountRowToRecord({ ...row, professionalEmail: "" }),
    ).toThrow("professionalEmail");
    expect(() =>
      managedAccountRowToRecord({ ...row, accountStatus: "UNKNOWN" }),
    ).toThrow("account status");
    expect(() =>
      managedAccountRowToRecord({ ...row, roles: ["ROOT"] }),
    ).toThrow("role");
    expect(() => managedAccountRowToRecord({ ...row, version: -1 })).toThrow(
      "version",
    );
    expect(() =>
      managedAccountRowToRecord({ ...row, updatedAt: new Date("invalid") }),
    ).toThrow("updatedAt");
    expect(() =>
      managedAccountRowToRecord({ ...row, roles: [1] as never }),
    ).toThrow("roles");
    expect(() => managedAccountRowToRecord({ ...row, scopes: [""] })).toThrow(
      "scopes",
    );
    expect(
      managedAccountRowToRecord({
        ...row,
        createdAt: "2026-08-11T20:00:00.000Z" as never,
      }).createdAt,
    ).toEqual(row.createdAt);
  });
});

function fakeExecutor(
  selectedRows: readonly ManagedAccountRowShape[] = [],
  updatedRows: readonly ManagedAccountRowShape[] = [],
) {
  const selectQuery = {
    where: () => selectQuery,
    orderBy: () => selectQuery,
    limit: async () => [...selectedRows],
  };
  const updateQuery = {
    where: () => ({ returning: async () => [...updatedRows] }),
  };
  return {
    select: () => ({ from: () => selectQuery }),
    update: () => ({ set: () => updateQuery }),
    transaction: async (work: (executor: never) => unknown) =>
      work(fakeExecutor(selectedRows, updatedRows) as never),
  } as never;
}

describe("managed account repositories", () => {
  it("lists with scope/status filters, paginates, and finds accounts", async () => {
    const second = Object.freeze({
      ...row,
      accountId: "44444444-4444-4444-8444-444444444444",
      professionalEmail: "second@example.test",
    });
    const repositories = createAccountManagementRepositories(
      fakeExecutor([row, second]),
    );
    const page = await repositories.accounts.list({
      limit: 1,
      status: "ACTIVE",
      scopeId: "scope-a",
    });
    expect(page.accounts).toHaveLength(1);
    expect(page.nextCursor).toBe(row.professionalEmail);

    const emptyConditions = createAccountManagementRepositories(
      fakeExecutor([row]),
    );
    expect(await emptyConditions.accounts.list({ limit: 10 })).toMatchObject({
      nextCursor: null,
    });
    expect(await repositories.accounts.findById(row.accountId)).toMatchObject({
      accountId: row.accountId,
    });
    expect(
      await createAccountManagementRepositories(
        fakeExecutor(),
      ).accounts.findById(row.accountId),
    ).toBeNull();
  });

  it("fails closed for invalid repository inputs and maps optimistic updates", async () => {
    const updated = Object.freeze({ ...row, version: 4 });
    const repositories = createAccountManagementRepositories(
      fakeExecutor([], [updated]),
    );
    await expect(repositories.accounts.findById("")).rejects.toThrow(
      "accountId",
    );
    await expect(
      repositories.accounts.update({
        accountId: "",
        expectedVersion: 0,
      }),
    ).rejects.toThrow("accountId");
    await expect(
      repositories.accounts.update({
        accountId: row.accountId,
        expectedVersion: -1,
      }),
    ).rejects.toThrow("expectedVersion");
    await expect(
      repositories.accounts.update({
        accountId: row.accountId,
        expectedVersion: 3,
        status: "SUSPENDED",
        roles: ["MODERATOR"],
        scopes: ["scope-a"],
      }),
    ).resolves.toMatchObject({ version: 4 });

    const conflict = createAccountManagementRepositories(fakeExecutor([], []));
    await expect(
      conflict.accounts.update({
        accountId: row.accountId,
        expectedVersion: 3,
      }),
    ).resolves.toBeNull();
  });

  it("revokes only active sessions and validates the timestamp", async () => {
    const repositories = createAccountManagementRepositories(
      fakeExecutor([], [{ ...row }]),
    );
    await expect(
      repositories.sessions.revokeAll(
        row.accountId,
        new Date("2026-08-11T22:00:00.000Z"),
      ),
    ).resolves.toBe(1);
    await expect(
      repositories.sessions.revokeAll("", new Date()),
    ).rejects.toThrow("accountId");
    await expect(
      repositories.sessions.revokeAll(row.accountId, new Date("invalid")),
    ).rejects.toThrow("revokedAt");
  });

  it("provides transaction-scoped repositories to the application layer", async () => {
    const database = fakeExecutor();
    const dependencies = createAccountManagementUseCaseDependencies(
      database,
      () => "55555555-5555-4555-8555-555555555555",
    );
    await expect(
      dependencies.transaction.run(async (operations) =>
        operations.accounts.findById(row.accountId),
      ),
    ).resolves.toBeNull();
  });
});
