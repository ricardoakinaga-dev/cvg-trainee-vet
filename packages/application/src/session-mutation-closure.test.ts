import { describe, expect, it, vi } from "vitest";

import type { SessionPrincipal } from "./session.js";

import {
  authenticateSessionCookie,
  clearSessionCookie,
  createSession,
  hashSessionToken,
  revokeSessionCookie,
  rotateSession,
  type SessionRepositoryPort,
} from "./session.js";

/**
 * AAA-FINAL-002 — Mutation Assurance Closure (session lifecycle).
 *
 * Killer tests comportamentais para os surviving mutants do Stryker em
 * `session.ts`. Cada teste observa comportamento (allow/deny, expiração,
 * cookie, propagação de identidade), nunca implementação interna.
 * Riscos cobertos: sessão longa demais, expiração errada, cookie sem
 * flags, bypass de nome de cookie, status/roles/scopes perdidos,
 * revogação silenciosa, rotação sem repositório.
 */

const NOW = new Date("2026-09-11T12:00:00.000Z");
const TOKEN = "session-token-for-mutation-closure-12";

function repository(): SessionRepositoryPort & {
  created: Array<{ tokenHash: string; [key: string]: unknown }>;
} {
  const created: Array<{ tokenHash: string; [key: string]: unknown }> = [];
  return {
    created,
    create: async (record) => {
      created.push(record as never);
    },
    findActive: async () => null,
    revoke: async () => undefined,
    rotate: async () => undefined,
  };
}

function header(token: string): string {
  return `other=1; __Host-cvg_session=${token}; theme=dark`;
}

describe("session mutation closure — lifetime cap and expiry math", () => {
  it("rejects non-integer lifetimes", async () => {
    const repo = repository();
    await expect(
      createSession(
        {
          accountId: "account-1",
          expiresInSeconds: 1.5,
          tokenFactory: () => TOKEN,
        },
        repo,
        NOW,
      ),
    ).rejects.toThrow("outside the allowed range");
  });

  it("rejects lifetimes above seven days and accepts exactly seven days", async () => {
    const repo = repository();
    await expect(
      createSession(
        {
          accountId: "account-1",
          expiresInSeconds: 7 * 24 * 60 * 60 + 1,
          tokenFactory: () => TOKEN,
        },
        repo,
        NOW,
      ),
    ).rejects.toThrow("outside the allowed range");
    const week = await createSession(
      {
        accountId: "account-1",
        expiresInSeconds: 7 * 24 * 60 * 60,
        tokenFactory: () => TOKEN,
      },
      repo,
      NOW,
    );
    expect(week.expiresAt.getTime()).toBe(
      NOW.getTime() + 7 * 24 * 60 * 60 * 1_000,
    );
  });

  it("grants multi-day sessions within the cap (kills hour-scale mutant)", async () => {
    const repo = repository();
    const session = await createSession(
      {
        accountId: "account-1",
        expiresInSeconds: 2 * 24 * 60 * 60,
        tokenFactory: () => TOKEN,
      },
      repo,
      NOW,
    );
    expect(session.expiresAt.getTime()).toBe(
      NOW.getTime() + 2 * 24 * 60 * 60 * 1_000,
    );
  });

  it("computes expiry in milliseconds, not seconds", async () => {
    const repo = repository();
    const session = await createSession(
      {
        accountId: "account-1",
        expiresInSeconds: 60,
        tokenFactory: () => TOKEN,
      },
      repo,
      NOW,
    );
    expect(session.expiresAt.getTime() - NOW.getTime()).toBe(60_000);
  });
});

describe("session mutation closure — cookie contract", () => {
  it("emits name, flags, path and max-age on creation", async () => {
    const repo = repository();
    const session = await createSession(
      {
        accountId: "account-1",
        expiresInSeconds: 3600,
        tokenFactory: () => TOKEN,
      },
      repo,
      NOW,
    );
    expect(session.cookie).toContain(`__Host-cvg_session=${TOKEN}`);
    for (const flag of ["Path=/", "HttpOnly", "Secure", "SameSite=Lax"]) {
      expect(session.cookie).toContain(flag);
    }
    expect(session.cookie).toContain("Max-Age=3600");
  });

  it("ignores foreign cookie names and malformed parts", async () => {
    const repo = repository();
    const findActive = vi.fn(async () => null);
    const scoped: SessionRepositoryPort = { ...repo, findActive };
    await expect(
      authenticateSessionCookie("session=abc; other=1", scoped, NOW),
    ).resolves.toBeNull();
    await expect(
      authenticateSessionCookie("nameless-part; other=1", scoped, NOW),
    ).resolves.toBeNull();
    expect(findActive).not.toHaveBeenCalled();
  });

  it("rejects overlong tokens at creation", async () => {
    const repo = repository();
    await expect(
      createSession(
        {
          accountId: "account-1",
          expiresInSeconds: 60,
          tokenFactory: () => "z".repeat(300),
        },
        repo,
        NOW,
      ),
    ).rejects.toThrow("session token is invalid");
    expect(repo.created).toHaveLength(0);
  });

  it("rejects short and overlong tokens at the boundary", async () => {
    const repo = repository();
    await expect(
      createSession(
        {
          accountId: "account-1",
          expiresInSeconds: 60,
          tokenFactory: () => "x".repeat(31),
        },
        repo,
        NOW,
      ),
    ).rejects.toThrow("session token is invalid");
    const findActive = vi.fn(async () => null);
    const scoped: SessionRepositoryPort = { ...repo, findActive };
    await expect(
      authenticateSessionCookie(header("y".repeat(257)), scoped, NOW),
    ).resolves.toBeNull();
    expect(findActive).not.toHaveBeenCalled();
  });

  it("authenticates a live session with copied identity", async () => {
    const repo = repository();
    await createSession(
      {
        accountId: "account-9",
        roles: ["MODERATOR"],
        scopes: ["scope-9"],
        expiresInSeconds: 60,
        tokenFactory: () => TOKEN,
      },
      repo,
      NOW,
    );
    const found = async (): Promise<SessionPrincipal> => {
      const record = repo.created[0] as unknown as SessionPrincipal;
      return {
        accountId: record.accountId,
        accountStatus: record.accountStatus,
        roles: [...record.roles],
        scopes: [...record.scopes],
      };
    };
    const scoped: SessionRepositoryPort = {
      ...repo,
      findActive: async () => found(),
    };
    const principal = await authenticateSessionCookie(
      header(TOKEN),
      scoped,
      NOW,
    );
    expect(principal).toMatchObject({
      accountId: "account-9",
      roles: ["MODERATOR"],
      scopes: ["scope-9"],
    });
    expect(principal?.roles).not.toBe(repo.created[0]?.roles);
  });

  it("tolerates surrounding whitespace in the cookie value", async () => {
    const repo = repository();
    const scoped: SessionRepositoryPort = {
      ...repo,
      findActive: async () => ({
        accountId: "account-1",
        accountStatus: "ACTIVE" as const,
        roles: [],
        scopes: [],
      }),
    };
    const principal = await authenticateSessionCookie(
      `__Host-cvg_session=  ${TOKEN}  ; other=1`,
      scoped,
      NOW,
    );
    expect(principal).toMatchObject({ accountId: "account-1" });
  });

  it("clears the cookie with Max-Age=0", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
    expect(clearSessionCookie()).toContain("__Host-cvg_session=;");
  });
});

describe("session mutation closure — identity propagation", () => {
  it("defaults status to ACTIVE and propagates roles and scopes", async () => {
    const repo = repository();
    await createSession(
      {
        accountId: "account-1",
        expiresInSeconds: 60,
        tokenFactory: () => TOKEN,
        roles: ["PARTICIPANT"],
        scopes: ["scope-1"],
      },
      repo,
      NOW,
    );
    expect(repo.created[0]).toMatchObject({
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: ["scope-1"],
    });
  });

  it("persists explicit status, roles and scopes exactly", async () => {
    const repo = repository();
    await createSession(
      {
        accountId: "account-1",
        accountStatus: "SUSPENDED",
        roles: ["MODERATOR", "ADMIN"],
        scopes: ["a", "b"],
        expiresInSeconds: 60,
        tokenFactory: () => TOKEN,
      },
      repo,
      NOW,
    );
    expect(repo.created[0]).toMatchObject({
      accountStatus: "SUSPENDED",
      roles: ["MODERATOR", "ADMIN"],
      scopes: ["a", "b"],
    });
  });

  it("hashes tokens deterministically as lowercase hex", () => {
    const first = hashSessionToken(TOKEN);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
    expect(hashSessionToken(TOKEN)).toBe(first);
  });

  it("mints real tokens in the accepted format without a factory", async () => {
    const repo = repository();
    const session = await createSession(
      { accountId: "account-1", expiresInSeconds: 60 },
      repo,
      NOW,
    );
    expect(session.token).toMatch(/^[A-Za-z0-9_-]{32,256}$/u);
  });
});

describe("session mutation closure — rotation and revocation guards", () => {
  it("returns null without touching the repository for absent tokens", async () => {
    const repo = repository();
    const findActive = vi.fn(async () => null);
    const rotate = vi.fn(async () => undefined);
    const revoke = vi.fn(async () => undefined);
    const scoped: SessionRepositoryPort = {
      ...repo,
      findActive,
      rotate,
      revoke,
    };
    await expect(
      rotateSession(undefined, { expiresInSeconds: 60 }, scoped, NOW),
    ).resolves.toBeNull();
    await expect(
      rotateSession(
        header("unknown-token-00000000000000000000"),
        { expiresInSeconds: 60 },
        scoped,
        NOW,
      ),
    ).resolves.toBeNull();
    await revokeSessionCookie("garbage-without-separator", scoped, NOW);
    expect(rotate).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });

  it("returns null on rotation with an invalid clock", async () => {
    const repo = repository();
    const findActive = vi.fn(async () => null);
    const scoped: SessionRepositoryPort = { ...repo, findActive };
    await expect(
      rotateSession(
        header(TOKEN),
        { expiresInSeconds: 60 },
        scoped,
        new Date("invalid"),
      ),
    ).resolves.toBeNull();
    expect(findActive).not.toHaveBeenCalled();
  });

  it("fails closed when rotation is not configured", async () => {
    const repo = repository();
    const scoped: SessionRepositoryPort = {
      create: repo.create,
      findActive: async () => ({
        accountId: "account-1",
        accountStatus: "ACTIVE" as const,
        roles: [],
        scopes: [],
      }),
      revoke: repo.revoke,
    };
    await expect(
      rotateSession(header(TOKEN), { expiresInSeconds: 60 }, scoped, NOW),
    ).rejects.toThrow("session rotation is not configured");
  });

  it("honors injected factories on rotation", async () => {
    const repo = repository();
    const rotated: Array<unknown> = [];
    const scoped: SessionRepositoryPort = {
      ...repo,
      findActive: async () => ({
        accountId: "account-1",
        accountStatus: "ACTIVE" as const,
        roles: ["PARTICIPANT"],
        scopes: ["scope-1"],
      }),
      rotate: async (_hash, record) => {
        rotated.push(record);
      },
    };
    const next = await rotateSession(
      header(TOKEN),
      {
        expiresInSeconds: 60,
        tokenFactory: () => "rotated-token-0000000000000000000000",
        sessionIdFactory: () => "session-rotated-1",
      },
      scoped,
      NOW,
    );
    expect(next?.token).toBe("rotated-token-0000000000000000000000");
    expect(next?.sessionId).toBe("session-rotated-1");
    expect(rotated).toHaveLength(1);
  });

  it("revokes by hash and ignores invalid clock silently", async () => {
    const repo = repository();
    const revoked: Array<unknown> = [];
    let revokeCalls = 0;
    const scoped: SessionRepositoryPort = {
      ...repo,
      revoke: async (...args: unknown[]) => {
        revokeCalls += 1;
        revoked.push(args);
      },
    };
    await revokeSessionCookie(header(TOKEN), scoped, NOW);
    expect(revokeCalls).toBe(1);
    expect(revoked[0]).toMatchObject([hashSessionToken(TOKEN), NOW]);
    const findActive = vi.fn(async () => null);
    const guarded: SessionRepositoryPort = { ...repo, findActive };
    await expect(
      authenticateSessionCookie(header(TOKEN), guarded, new Date("invalid")),
    ).resolves.toBeNull();
    expect(findActive).not.toHaveBeenCalled();
    await expect(
      authenticateSessionCookie(header(TOKEN), scoped, new Date("invalid")),
    ).resolves.toBeNull();
    await revokeSessionCookie(header(TOKEN), scoped, new Date("invalid"));
    expect(revokeCalls).toBe(1);
  });

  it("rejects creation on an invalid clock", async () => {
    const repo = repository();
    await expect(
      createSession(
        {
          accountId: "account-1",
          expiresInSeconds: 60,
          tokenFactory: () => TOKEN,
        },
        repo,
        new Date("invalid"),
      ),
    ).rejects.toThrow("now is invalid");
    expect(repo.created).toHaveLength(0);
  });
});
