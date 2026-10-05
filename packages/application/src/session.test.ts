import { describe, expect, it } from "vitest";

import {
  authenticateSessionCookie,
  clearSessionCookie,
  createSession,
  hashSessionToken,
  rotateSession,
  type SessionRepositoryPort,
  type SessionRecord,
} from "./session.js";

function repository(): SessionRepositoryPort & {
  records: SessionRecord[];
} {
  const records: SessionRecord[] = [];
  return {
    records,
    create: async (record) => {
      records.push(record);
    },
    findActive: async (tokenHash, now) => {
      const found = records.find(
        (record) =>
          record.tokenHash === tokenHash &&
          record.revokedAt === null &&
          record.expiresAt.getTime() > now.getTime(),
      );
      if (found === undefined) return null;
      return {
        ...found,
        sessionLifetime: {
          createdAt: found.createdAt,
          expiresAt: found.expiresAt,
          lastSeenAt: now,
        },
      };
    },
    revoke: async (tokenHash) => {
      const index = records.findIndex((item) => item.tokenHash === tokenHash);
      const record = records[index];
      if (index >= 0 && record !== undefined) {
        records[index] = { ...record, revokedAt: new Date() };
      }
    },
    rotate: async (tokenHash, record) => {
      const index = records.findIndex((item) => item.tokenHash === tokenHash);
      const previous = records[index];
      if (index < 0 || previous === undefined)
        throw new Error("session is no longer active");
      records[index] = { ...previous, revokedAt: new Date() };
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
      sessionId: session.sessionId,
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
    ).resolves.toMatchObject({
      accountId: "account-1",
      sessionId: rotated.sessionId,
    });
    expect(rotated.sessionId).not.toBe(current.sessionId);
    expect(clearSessionCookie()).toContain("Max-Age=0");
    expect(clearSessionCookie()).toContain("HttpOnly");
  });

  it("preserves the original absolute deadline during rotation and strips internal clock proof", async () => {
    const repo = repository();
    const start = new Date("2026-08-09T00:00:00.000Z");
    const current = await createSession(
      {
        accountId: "account-1",
        roles: ["PARTICIPANT"],
        scopes: ["scope-1"],
        expiresInSeconds: 12 * 60 * 60,
        tokenFactory: () => "current-session-token-1234567890abcdefgh",
      },
      repo,
      start,
    );
    const nearDeadline = new Date("2026-08-09T11:59:00.000Z");
    const rotated = await rotateSession(
      current.cookie,
      {
        expiresInSeconds: 3600,
        tokenFactory: () => "rotated-session-token-1234567890abcdefgh",
      },
      repo,
      nearDeadline,
    );
    expect(rotated?.expiresAt).toEqual(new Date("2026-08-09T12:00:00.000Z"));
    expect(rotated?.cookie).toContain("Max-Age=60");
    expect(repo.records[1]?.createdAt).toEqual(start);
    expect(
      await authenticateSessionCookie(rotated?.cookie, repo, nearDeadline),
    ).not.toHaveProperty("sessionLifetime");
  });

  it("requires trusted rotation clock proof while authenticating compatible old principal fixtures", async () => {
    const repo = repository();
    const oldPrincipal = {
      accountId: "account-1",
      accountStatus: "ACTIVE" as const,
      roles: ["PARTICIPANT"] as const,
      scopes: ["scope-1"],
    };
    const compatible: SessionRepositoryPort = {
      ...repo,
      findActive: async () => oldPrincipal,
    };
    const cookie =
      "__Host-cvg_session=current-session-token-1234567890abcdefgh";
    const now = new Date("2026-08-09T00:00:00.000Z");
    expect(await authenticateSessionCookie(cookie, compatible, now)).toEqual(
      oldPrincipal,
    );
    expect(
      await rotateSession(cookie, { expiresInSeconds: 60 }, compatible, now),
    ).toBeNull();
    expect(repo.records).toHaveLength(0);
  });

  it.each([
    { roles: ["AUTHOR"] as const, elapsed: 1 },
    { roles: ["MODERATOR"] as const, elapsed: 30 * 60 * 1_000 },
    { roles: ["PARTICIPANT"] as const, elapsed: 8 * 60 * 60 * 1_000 },
  ])(
    "does not rotate invalid trusted clock proof: $roles",
    async ({ roles, elapsed }) => {
      const repo = repository();
      const start = new Date("2026-08-09T00:00:00.000Z");
      const scoped: SessionRepositoryPort = {
        ...repo,
        findActive: async () => ({
          accountId: "account-1",
          accountStatus: "ACTIVE",
          roles,
          scopes: ["scope-1"],
          sessionLifetime: {
            createdAt: start,
            lastSeenAt: start,
            expiresAt: new Date(start.getTime() + 12 * 60 * 60 * 1_000),
          },
        }),
      };
      expect(
        await rotateSession(
          "__Host-cvg_session=current-session-token-1234567890abcdefgh",
          { expiresInSeconds: 60 },
          scoped,
          new Date(start.getTime() + elapsed),
        ),
      ).toBeNull();
      expect(repo.records).toHaveLength(0);
    },
  );
});
