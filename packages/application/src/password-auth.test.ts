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
  readonly audits: unknown[];
  readonly passwordHashes: string[];
} {
  const sessions: unknown[] = [];
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
              roles: ["PARTICIPANT"],
              scopes: [scopeId],
              passwordHash,
            },
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

  it("sets a new password without returning credential material", async () => {
    const deps = dependencies(null);
    await setAccountPassword(
      {
        principalId: accountId,
        password: replacementCredential,
        correlationId: "66666666-6666-4666-8666-666666666666",
      },
      deps,
    );

    expect(deps.passwordHashes).toHaveLength(1);
    expect(deps.passwordHashes[0]).not.toContain(replacementCredential);
    expect(deps.audits).toHaveLength(1);
  });
});
