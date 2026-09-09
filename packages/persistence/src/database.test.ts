import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPostgresDatabase,
  normalizeDatabaseOptions,
} from "./database.js";

const lockHarness = vi.hoisted(() => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  let released = 0;
  let unlockThrows = false;
  let lockThrows = false;
  const connectionTag = (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => {
    const text = strings.join("?");
    queries.push({ text, values });
    if (text.includes("pg_advisory_lock") && lockThrows) {
      return Promise.reject(new Error("synthetic lock failure"));
    }
    if (text.includes("pg_advisory_unlock") && unlockThrows) {
      return Promise.reject(new Error("synthetic unlock failure"));
    }
    return Promise.resolve([]);
  };
  const connection = Object.assign(connectionTag, {
    release: () => {
      released += 1;
    },
  });
  return {
    queries,
    reset: () => {
      queries.length = 0;
      released = 0;
      unlockThrows = false;
      lockThrows = false;
    },
    setUnlockThrows: (value: boolean) => {
      unlockThrows = value;
    },
    setLockThrows: (value: boolean) => {
      lockThrows = value;
    },
    releasedCount: () => released,
    client: {
      options: { parsers: {}, serializers: {} },
      reserve: async () => connection,
      end: async () => undefined,
    },
  };
});

vi.mock("postgres", () => ({
  default: () => lockHarness.client,
}));

beforeEach(() => {
  lockHarness.reset();
});

describe("database integration boundary", () => {
  it("normalizes safe pool defaults without opening a connection", () => {
    expect(normalizeDatabaseOptions()).toEqual({
      maxConnections: 10,
      connectTimeoutSeconds: 10,
      idleTimeoutSeconds: 60,
      maxLifetimeSeconds: 1800,
      statementTimeoutMs: 30_000,
      prepareStatements: true,
      requireLeastPrivilege: false,
    });
  });

  it("rejects invalid pool limits before creating a client", () => {
    expect(() => normalizeDatabaseOptions({ maxConnections: 0 })).toThrow(
      "maxConnections",
    );
    expect(() =>
      normalizeDatabaseOptions({ connectTimeoutSeconds: 0 }),
    ).toThrow("connectTimeoutSeconds");
    expect(() => normalizeDatabaseOptions({ idleTimeoutSeconds: 0 })).toThrow(
      "idleTimeoutSeconds",
    );
    expect(() => normalizeDatabaseOptions({ maxLifetimeSeconds: 0 })).toThrow(
      "maxLifetimeSeconds",
    );
    expect(() => normalizeDatabaseOptions({ statementTimeoutMs: 0 })).toThrow(
      "statementTimeoutMs",
    );
  });

  it("normalizes the production least-privilege guard", () => {
    expect(normalizeDatabaseOptions({ requireLeastPrivilege: true })).toEqual({
      maxConnections: 10,
      connectTimeoutSeconds: 10,
      idleTimeoutSeconds: 60,
      maxLifetimeSeconds: 1800,
      statementTimeoutMs: 30_000,
      prepareStatements: true,
      requireLeastPrivilege: true,
    });
  });

  it("rejects a non-PostgreSQL URL before opening a client", () => {
    expect(() => createPostgresDatabase("https://not-postgres.test")).toThrow(
      "PostgreSQL",
    );
  });

  it("creates a lazy PostgreSQL handle and closes it explicitly", async () => {
    const handle = createPostgresDatabase(
      "postgresql://cvg_test:cvg_test@127.0.0.1:1/cvg_test",
    );

    expect(handle.db).toBeDefined();
    expect(handle.healthcheck).toBeTypeOf("function");
    await expect(handle.close()).resolves.toBeUndefined();
  });

  it("rejects an empty advisory lock key without opening a connection", async () => {
    const handle = createPostgresDatabase(
      "postgresql://cvg_test:cvg_test@127.0.0.1:1/cvg_test",
    );

    await expect(
      handle.withAdvisoryLock(" ", async () => undefined),
    ).rejects.toThrow("lock key");
    await handle.close();
  });

  it("holds the advisory lock around work and releases both lock and connection", async () => {
    const handle = createPostgresDatabase(
      "postgresql://cvg_test:cvg_test@127.0.0.1:1/cvg_test",
    );

    await expect(
      handle.withAdvisoryLock("cvg:qdrant:reconcile", async () => "done"),
    ).resolves.toBe("done");
    expect(lockHarness.queries).toHaveLength(2);
    expect(lockHarness.queries[0]?.text).toContain("pg_advisory_lock");
    expect(lockHarness.queries[0]?.values).toContain("cvg:qdrant:reconcile");
    expect(lockHarness.queries[1]?.text).toContain("pg_advisory_unlock");
    expect(lockHarness.releasedCount()).toBe(1);
    await handle.close();
  });

  it("releases the lock and connection when work throws, preserving the work error", async () => {
    const handle = createPostgresDatabase(
      "postgresql://cvg_test:cvg_test@127.0.0.1:1/cvg_test",
    );

    await expect(
      handle.withAdvisoryLock("cvg:qdrant:reconcile", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(lockHarness.queries[1]?.text).toContain("pg_advisory_unlock");
    expect(lockHarness.releasedCount()).toBe(1);
    await handle.close();
  });

  it("preserves the work error when unlock also fails, and still releases the connection", async () => {
    lockHarness.setUnlockThrows(true);
    const handle = createPostgresDatabase(
      "postgresql://cvg_test:cvg_test@127.0.0.1:1/cvg_test",
    );

    let caught: unknown;
    try {
      await handle.withAdvisoryLock("cvg:qdrant:reconcile", async () => {
        throw new Error("boom");
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("boom");
    expect((caught as Error).cause).toBeInstanceOf(Error);
    expect(lockHarness.releasedCount()).toBe(1);
    await handle.close();
  });

  it("surfaces a release failure instead of reporting silent success", async () => {
    lockHarness.setUnlockThrows(true);
    const handle = createPostgresDatabase(
      "postgresql://cvg_test:cvg_test@127.0.0.1:1/cvg_test",
    );

    await expect(
      handle.withAdvisoryLock("cvg:qdrant:reconcile", async () => "done"),
    ).rejects.toThrow("synthetic unlock failure");
    expect(lockHarness.releasedCount()).toBe(1);
    await handle.close();
  });

  it("returns the connection without unlocking when lock acquisition fails", async () => {
    lockHarness.setLockThrows(true);
    const handle = createPostgresDatabase(
      "postgresql://cvg_test:cvg_test@127.0.0.1:1/cvg_test",
    );

    await expect(
      handle.withAdvisoryLock("cvg:qdrant:reconcile", async () => "done"),
    ).rejects.toThrow("synthetic lock failure");
    expect(
      lockHarness.queries.some((query) =>
        query.text.includes("pg_advisory_unlock"),
      ),
    ).toBe(false);
    expect(lockHarness.releasedCount()).toBe(1);
    await handle.close();
  });
});
