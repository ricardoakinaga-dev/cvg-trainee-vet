import { describe, expect, it } from "vitest";

import {
  hashPassword,
  loginWithPassword,
  setAccountPassword,
  verifyPassword,
  type PasswordAuthTransactionalOperations,
  type PasswordAuthUseCaseDependencies,
} from "./password-auth.js";

const accountId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const validCredential = "Acesso-CVG-2026!Seguro";
const wrongCredential = "senha-incorreta-2026";
const replacementCredential = "Novo-Acesso-CVG-2026!";

function dependencies(
  passwordHash: string | null,
): PasswordAuthUseCaseDependencies & {
  readonly sessions: unknown[];
  readonly revokedSessions: readonly {
    readonly accountId: string;
    readonly revokedAt: Date;
  }[];
  readonly audits: unknown[];
  readonly passwordHashes: string[];
} {
  const sessions: unknown[] = [];
  const revokedSessions: { accountId: string; revokedAt: Date }[] = [];
  const audits: unknown[] = [];
  const passwordHashes: string[] = [];
  const operations: PasswordAuthTransactionalOperations = {
    account: {
      findByLogin: async () =>
        passwordHash === null
          ? null
          : {
              accountId,
              accountStatus: "ACTIVE",
              sessionGeneration: 7,
              roles: ["PARTICIPANT"],
              scopes: [scopeId],
              passwordHash,
            },
      findById: async () => ({
        accountId,
        accountStatus: "ACTIVE",
        sessionGeneration: 7,
        roles: ["PARTICIPANT"],
        scopes: [scopeId],
        passwordHash,
      }),
      setPassword: async (_accountId, nextHash) => {
        passwordHashes.push(nextHash);
      },
    },
    sessions: {
      create: async (record) => {
        sessions.push(record);
      },
      findActive: async () => null,
      revoke: async () => undefined,
      revokeAll: async (accountId, revokedAt) => {
        revokedSessions.push({ accountId, revokedAt });
        return 1;
      },
    },
    audit: {
      append: async (entry) => {
        audits.push(entry);
      },
    },
  };
  return {
    idFactory: () => "33333333-3333-4333-8333-333333333333",
    transaction: { run: async (work) => work(operations) },
    sessions,
    revokedSessions,
    audits,
    passwordHashes,
  };
}

describe("password authentication", () => {
  it("hashes passwords with a non-reversible salted format", async () => {
    const encoded = await hashPassword(validCredential);

    expect(encoded).toMatch(/^scrypt\$\d+\$\d+\$\d+\$/u);
    expect(encoded).not.toContain(validCredential);
    expect(await verifyPassword(validCredential, encoded)).toBe(true);
    expect(await verifyPassword(wrongCredential, encoded)).toBe(false);
    expect(await verifyPassword(validCredential, "malformed-hash")).toBe(false);
  });

  it("rejects passwords outside the bounded policy", async () => {
    await expect(hashPassword("short")).rejects.toMatchObject({
      code: "validation_error",
    });
    await expect(hashPassword("a".repeat(129))).rejects.toMatchObject({
      code: "validation_error",
    });
  });

  it("creates an HttpOnly session only for an active account with valid credentials", async () => {
    const credentialHash = await hashPassword(validCredential);
    const deps = dependencies(credentialHash);

    const result = await loginWithPassword(
      {
        login: " Trainee@CVG.Example ",
        password: validCredential,
        sessionExpiresInSeconds: 3600,
        correlationId: "44444444-4444-4444-8444-444444444444",
        sessionTokenFactory: () => "s".repeat(32),
        sessionIdFactory: () => "55555555-5555-4555-8555-555555555555",
      },
      deps,
    );

    expect(result.accountId).toBe(accountId);
    expect(result.session.cookie).toContain("HttpOnly");
    expect(result.session.cookie).toContain("SameSite=Lax");
    expect(deps.sessions).toHaveLength(1);
    expect(deps.sessions[0]).toMatchObject({ sessionGeneration: 7 });
    expect(JSON.stringify(deps.audits)).not.toContain(validCredential);
  });

  it("uses one public failure for unknown accounts and wrong passwords", async () => {
    const credentialHash = await hashPassword(validCredential);
    const known = dependencies(credentialHash);
    const unknown = dependencies(null);

    await expect(
      loginWithPassword(
        {
          login: "trainee@cvg.example",
          password: wrongCredential,
          sessionExpiresInSeconds: 3600,
          correlationId: "44444444-4444-4444-8444-444444444444",
        },
        known,
      ),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(
      loginWithPassword(
        {
          login: "ausente@cvg.example",
          password: wrongCredential,
          sessionExpiresInSeconds: 3600,
          correlationId: "44444444-4444-4444-8444-444444444444",
        },
        unknown,
      ),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    expect(known.sessions).toHaveLength(0);
    expect(unknown.sessions).toHaveLength(0);
  });

  it("sets a new password and revokes existing sessions", async () => {
    const deps = dependencies(await hashPassword(validCredential));
    const now = new Date("2026-08-11T22:00:00.000Z");
    await setAccountPassword(
      {
        principalId: accountId,
        currentPassword: validCredential,
        password: replacementCredential,
        correlationId: "66666666-6666-4666-8666-666666666666",
        now,
      },
      deps,
    );

    expect(deps.passwordHashes).toHaveLength(1);
    expect(deps.passwordHashes[0]).not.toContain(replacementCredential);
    expect(deps.revokedSessions).toEqual([{ accountId, revokedAt: now }]);
    expect(deps.audits).toHaveLength(1);
  });

  it("rejects a password change without the current password proof", async () => {
    const deps = dependencies(await hashPassword(validCredential));
    await expect(
      setAccountPassword(
        {
          principalId: accountId,
          currentPassword: wrongCredential,
          password: replacementCredential,
          correlationId: "77777777-7777-4777-8777-777777777777",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    expect(deps.passwordHashes).toHaveLength(0);
    expect(deps.revokedSessions).toHaveLength(0);
  });

  it("rejects setting the current password as the new password", async () => {
    const deps = dependencies(await hashPassword(validCredential));
    await expect(
      setAccountPassword(
        {
          principalId: accountId,
          currentPassword: validCredential,
          password: validCredential,
          correlationId: "88888888-8888-4888-8888-888888888888",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(deps.passwordHashes).toHaveLength(0);
    expect(deps.revokedSessions).toHaveLength(0);
    expect(deps.audits).toHaveLength(0);
  });
});
