import { describe, expect, it } from "vitest";

import {
  auditTrailQueryFingerprint,
  createAuditTrailRepository,
  decodeAuditTrailCursor,
  encodeAuditTrailCursor,
} from "./audit-trail-repository.js";
import { auditEntries } from "./schema.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const auditId = "33333333-3333-4333-8333-333333333333";
const occurredAt = new Date("2026-08-24T12:00:00.000Z");
const cursorKey = "test-audit-cursor-key-with-32-bytes-minimum";

const row = {
  id: auditId,
  actorKind: "AUTHENTICATED",
  principalId: "22222222-2222-4222-8222-222222222222",
  action: "CONTENT_PUBLISHED",
  resourceType: "content_version",
  resourceId: "44444444-4444-4444-8444-444444444444",
  scopeId,
  outcome: "SUCCESS",
  reasonCode: "clinical_approval",
  requestId: "55555555-5555-4555-8555-555555555555",
  correlationId: "66666666-6666-4666-8666-666666666666",
  beforeHash: "a".repeat(64),
  afterHash: "b".repeat(64),
  occurredAt,
};

function database(rows: ReadonlyArray<typeof row>) {
  const calls: string[] = [];
  const executor = {
    execute: async () => {
      calls.push("security-context");
      return [];
    },
    select: () => {
      let table: unknown;
      const builder = {
        from(source: unknown) {
          table = source;
          return builder;
        },
        where() {
          return builder;
        },
        orderBy() {
          return builder;
        },
        limit: async (limit: number) => {
          if (table !== auditEntries) throw new Error("unexpected table");
          calls.push(`limit:${limit}`);
          return [...rows];
        },
      };
      return builder;
    },
    transaction: async (work: (current: unknown) => Promise<unknown>) =>
      work(executor),
  };
  return { database: executor as never, calls };
}

describe("audit trail repository cursor", () => {
  it("round-trips an opaque deterministic cursor", () => {
    const query = { scopeId, action: "CONTENT_PUBLISHED", limit: 1 } as const;
    const queryHash = auditTrailQueryFingerprint(query);
    const cursor = encodeAuditTrailCursor(
      {
        version: 1,
        auditId,
        occurredAt,
        scopeId,
        queryHash,
      },
      cursorKey,
    );
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(decodeAuditTrailCursor(cursor, cursorKey)).toEqual({
      version: 1,
      auditId,
      occurredAt,
      scopeId,
      queryHash,
    });
  });

  it("rejects malformed or unsafe cursors", () => {
    expect(() => decodeAuditTrailCursor("not-valid!", cursorKey)).toThrow();
    expect(() => decodeAuditTrailCursor("", cursorKey)).toThrow();
    expect(() =>
      encodeAuditTrailCursor(
        {
          version: 1,
          auditId,
          occurredAt,
          scopeId,
          queryHash: "unsafe",
        },
        cursorKey,
      ),
    ).toThrow();
  });

  it("rejects cursor tampering and the wrong server secret", () => {
    const queryHash = auditTrailQueryFingerprint({ scopeId, limit: 1 });
    const cursor = encodeAuditTrailCursor(
      { version: 1, auditId, occurredAt, scopeId, queryHash },
      cursorKey,
    );
    const payload = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    payload.auditId = "77777777-7777-4777-8777-777777777777";
    const tampered = Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url",
    );

    expect(() => decodeAuditTrailCursor(tampered, cursorKey)).toThrow();
    expect(() =>
      decodeAuditTrailCursor(cursor, `${cursorKey}-wrong`),
    ).toThrow();
  });

  it("binds the cursor to scope and filters and pages with limit plus one", async () => {
    const query = { scopeId, action: "CONTENT_PUBLISHED", limit: 1 } as const;
    const fake = database([
      row,
      { ...row, id: "77777777-7777-4777-8777-777777777777" },
    ]);
    const repository = createAuditTrailRepository(fake.database, {
      cursorSecret: cursorKey,
    });
    const first = await repository.listAuditTrail(query);

    expect(first.items).toHaveLength(1);
    expect(first.hasNext).toBe(true);
    if (first.nextCursor === undefined) throw new Error("missing cursor");
    expect(fake.calls).toEqual(["security-context", "limit:2"]);

    await expect(
      repository.listAuditTrail({
        ...query,
        cursor: first.nextCursor,
      }),
    ).resolves.toMatchObject({ scopeId, hasNext: true });
    await expect(
      repository.listAuditTrail({
        ...query,
        resourceType: "other_resource",
        cursor: first.nextCursor,
      }),
    ).rejects.toThrow("cursor does not belong to this query");
  });

  it("validates scope, filters, windows, limits and empty pages before opening a transaction", async () => {
    const fake = database([]);
    const repository = createAuditTrailRepository(fake.database, {
      cursorSecret: cursorKey,
    });
    const invalidQueries = [
      { scopeId: "not-a-uuid", limit: 1 },
      { scopeId, action: "unsafe action", limit: 1 },
      { scopeId, resourceType: "unsafe type", limit: 1 },
      { scopeId, resourceId: " ", limit: 1 },
      { scopeId, principalId: "not-a-uuid", limit: 1 },
      { scopeId, from: "invalid", limit: 1 },
      { scopeId, to: "invalid", limit: 1 },
      {
        scopeId,
        from: "2026-08-25T00:00:00.000Z",
        to: "2026-08-24T00:00:00.000Z",
        limit: 1,
      },
      { scopeId, limit: 0 },
      { scopeId, limit: 101 },
      { scopeId, cursor: "not-valid!", limit: 1 },
    ] as const;

    for (const query of invalidQueries) {
      await expect(repository.listAuditTrail(query)).rejects.toThrow();
    }
    await expect(
      repository.listAuditTrail({ scopeId, limit: 1 }),
    ).resolves.toMatchObject({ items: [], hasNext: false });
    expect(fake.calls).toEqual(["security-context", "limit:2"]);
  });
});
