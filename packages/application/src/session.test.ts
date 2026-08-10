import { describe, expect, it } from "vitest";

import {
  authenticateSessionCookie,
  clearSessionCookie,
  createSession,
  hashSessionToken,
  rotateSession,
  type SessionRepositoryPort,
} from "./session.js";

function repository(): SessionRepositoryPort & {
  records: Array<Record<string, unknown>>;
} {
  const records: Array<Record<string, unknown>> = [];
  return {
    records,
    create: async (record) => {
      records.push(record);
    },
    findActive: async (tokenHash, now) =>
      (records.find(
        (record) =>
          record.tokenHash === tokenHash &&
          record.revokedAt === null &&
          (record.expiresAt as Date).getTime() > now.getTime(),
      ) as never) ?? null,
    revoke: async (tokenHash) => {
      const index = records.findIndex((item) => item.tokenHash === tokenHash);
      const record = records[index];
      if (index >= 0 && record !== undefined) {
        records[index] = { ...record, revokedAt: new Date() };
      }
    },
    rotate: async (tokenHash, record) => {
      const index = records.findIndex((item) => item.tokenHash === tokenHash);
      if (index < 0) throw new Error("session is no longer active");
      records[index] = { ...records[index], revokedAt: new Date() };
      records.push(record);
    },
  };
}

describe("server-side sessions", () => {
  it("stores only a hash and returns secure cookie attributes", async () => {
    const repo = repository();
    const session = await createSession(
      {
        accountId: "account-1",
        expiresInSeconds: 3600,
        tokenFactory: () => "token-that-is-never-stored-1234567890",
      },
      repo,
      new Date("2026-08-09T17:00:00.000Z"),
    );

    expect(repo.records[0]).not.toHaveProperty("token");
    expect(repo.records[0]?.tokenHash).toBe(hashSessionToken(session.token));
    expect(session.cookie).toContain("HttpOnly");
    expect(session.cookie).toContain("Secure");
    expect(session.cookie).toContain("SameSite=Lax");
  });

  it("authenticates a valid cookie and rejects absent, malformed, and expired cookies", async () => {
    const repo = repository();
    const now = new Date("2026-08-09T17:00:00.000Z");
    const session = await createSession(
      {
        accountId: "account-1",
        expiresInSeconds: 3600,
        tokenFactory: () => "token-that-is-never-stored-1234567890",
      },
      repo,
      now,
    );

    await expect(
      authenticateSessionCookie(undefined, repo, now),
    ).resolves.toBeNull();
    await expect(
      authenticateSessionCookie("cvg_session=short", repo, now),
    ).resolves.toBeNull();
    await expect(
      authenticateSessionCookie(session.cookie, repo, now),
    ).resolves.toMatchObject({
      accountId: "account-1",
    });
    await expect(
      authenticateSessionCookie(
        session.cookie,
        repo,
        new Date("2026-08-09T19:00:01.000Z"),
      ),
    ).resolves.toBeNull();
  });

  it("rejects invalid session creation inputs", async () => {
    const repo = repository();
    await expect(
      createSession(
        {
          accountId: "account-1",
          expiresInSeconds: 0,
          tokenFactory: () => "token-that-is-never-stored-1234567890",
        },
        repo,
      ),
    ).rejects.toThrow("expiresInSeconds");
    await expect(
      createSession(
        {
          accountId: "account-1",
          expiresInSeconds: 3600,
          tokenFactory: () => "too-short",
        },
        repo,
      ),
    ).rejects.toThrow("session token");
    await expect(
      createSession(
        {
          accountId: " ",
          expiresInSeconds: 3600,
          tokenFactory: () => "token-that-is-never-stored-1234567890",
        },
        repo,
      ),
    ).rejects.toThrow("accountId");
  });

  it("fails closed for an invalid clock and a repository miss", async () => {
    const repo = repository();
    await expect(
      authenticateSessionCookie(
        "__Host-cvg_session=token-that-is-never-stored-1234567890",
        repo,
        new Date("invalid"),
      ),
    ).resolves.toBeNull();
    await expect(
      authenticateSessionCookie(
        "__Host-cvg_session=another-token-that-is-never-stored-1234567890",
        repo,
        new Date("2026-08-09T17:00:00.000Z"),
      ),
    ).resolves.toBeNull();
  });

  it("generates a cryptographically random token when no factory is supplied", async () => {
    const repo = repository();
    const session = await createSession(
      { accountId: "account-1", expiresInSeconds: 60 },
      repo,
      new Date("2026-08-09T17:00:00.000Z"),
    );

    expect(session.token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(repo.records).toHaveLength(1);
  });

  it("rotates a valid session and provides a safe clearing cookie", async () => {
    const repo = repository();
    const now = new Date("2026-08-09T17:00:00.000Z");
    const current = await createSession(
      {
        accountId: "account-1",
        expiresInSeconds: 3600,
        roles: ["PARTICIPANT"],
        scopes: ["scope-1"],
        tokenFactory: () => "current-session-token-1234567890abcdefgh",
      },
      repo,
      now,
    );

    const rotated = await rotateSession(
      current.cookie,
      {
        expiresInSeconds: 3600,
        tokenFactory: () => "rotated-session-token-1234567890abcdefgh",
      },
      repo,
      now,
    );

    expect(rotated).not.toBeNull();
    await expect(
      authenticateSessionCookie(current.cookie, repo, now),
    ).resolves.toBeNull();
    if (rotated === null) throw new Error("rotation is required");
    await expect(
      authenticateSessionCookie(rotated.cookie, repo, now),
    ).resolves.toMatchObject({ accountId: "account-1" });
    expect(clearSessionCookie()).toContain("Max-Age=0");
    expect(clearSessionCookie()).toContain("HttpOnly");
  });
});
