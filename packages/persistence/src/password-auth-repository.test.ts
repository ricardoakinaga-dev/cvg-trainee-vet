import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "./schema.js";
import {
  PersistenceMappingError,
  createPasswordAuthUseCaseDependencies,
} from "./password-auth-repository.js";

const accountId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const encodedCredentialHash =
  "scrypt$16384$8$1$0123456789abcdef$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

function fakeDatabase(
  rows: readonly unknown[] = [
    {
      accountId,
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: [scopeId],
      passwordHash: encodedCredentialHash,
    },
  ],
  updated: readonly { readonly id: string }[] = [{ id: accountId }],
): PostgresJsDatabase<typeof schema> & {
  readonly inserted: unknown[];
} {
  const inserted: unknown[] = [];
  const query = {
    from: () => query,
    where: () => query,
    limit: async () => rows,
  };
  const database = {
    inserted,
    execute: async () => undefined,
    select: () => query,
    insert: () => ({
      values: async (value: unknown) => {
        inserted.push(value);
      },
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => updated,
        }),
      }),
    }),
    transaction: async <Result>(work: (executor: unknown) => Promise<Result>) =>
      work(database),
  };
  return database as unknown as PostgresJsDatabase<typeof schema> & {
    readonly inserted: unknown[];
  };
}

describe("PostgreSQL password authentication persistence", () => {
  it("normalizes login and maps account entitlements without exposing storage details", async () => {
    const database = fakeDatabase();
    const dependencies = createPasswordAuthUseCaseDependencies(
      database,
      () => "33333333-3333-4333-8333-333333333333",
    );

    await expect(
      dependencies.transaction.run((operations) =>
        operations.account.findByLogin(" Trainee@CVG.Example "),
      ),
    ).resolves.toEqual({
      accountId,
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: [scopeId],
      passwordHash: encodedCredentialHash,
    });
    expect(database.inserted).toEqual([]);
  });

  it("fails closed for malformed account rows, login values, and missing updates", async () => {
    const invalidRows = fakeDatabase([
      {
        accountId,
        accountStatus: "UNKNOWN",
        roles: ["PARTICIPANT"],
        scopes: [scopeId],
        passwordHash: encodedCredentialHash,
      },
    ]);
    const invalidDependencies = createPasswordAuthUseCaseDependencies(
      invalidRows,
      () => "id",
    );
    await expect(
      invalidDependencies.transaction.run((operations) =>
        operations.account.findByLogin("trainee@cvg.example"),
      ),
    ).rejects.toBeInstanceOf(PersistenceMappingError);
    await expect(
      invalidDependencies.transaction.run((operations) =>
        operations.account.findByLogin("invalid"),
      ),
    ).rejects.toThrow("login");

    const missing = fakeDatabase([], []);
    const missingDependencies = createPasswordAuthUseCaseDependencies(
      missing,
      () => "id",
    );
    await expect(
      missingDependencies.transaction.run((operations) =>
        operations.account.setPassword(accountId, encodedCredentialHash),
      ),
    ).rejects.toThrow("account is not available");
    await expect(
      missingDependencies.transaction.run((operations) =>
        operations.account.setPassword(accountId, "raw-credential"),
      ),
    ).rejects.toThrow("passwordHash");
  });
});
