import { describe, expect, it } from "vitest";

import {
  createPostgresDatabase,
  normalizeDatabaseOptions,
} from "./database.js";

describe("database integration boundary", () => {
  it("normalizes safe pool defaults without opening a connection", () => {
    expect(normalizeDatabaseOptions()).toEqual({
      maxConnections: 10,
      connectTimeoutSeconds: 10,
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
  });

  it("normalizes the production least-privilege guard", () => {
    expect(normalizeDatabaseOptions({ requireLeastPrivilege: true })).toEqual({
      maxConnections: 10,
      connectTimeoutSeconds: 10,
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
});
