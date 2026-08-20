import { describe, expect, it } from "vitest";

import type { AuditEntry } from "@cvg/application";

import {
  PersistenceMappingError,
  auditEntryToRow,
  auditRowToEntry,
  createAuditRepository,
} from "./audit-repository.js";
import { auditEntries } from "./schema.js";
import type * as schema from "./schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

const entry: AuditEntry = {
  auditId: "11111111-1111-4111-8111-111111111111",
  principalId: "22222222-2222-4222-8222-222222222222",
  action: "ANSWER_SAVED",
  resourceType: "attempt",
  resourceId: "33333333-3333-4333-8333-333333333333",
  scopeId: "44444444-4444-4444-8444-444444444444",
  outcome: "SUCCESS",
  reasonCode: "draft_saved",
  requestId: "55555555-5555-4555-8555-555555555555",
  correlationId: "66666666-6666-4666-8666-666666666666",
  occurredAt: "2026-08-09T17:00:00.000Z",
};

describe("audit PostgreSQL mapping", () => {
  it("maps only audit metadata to the append-only row", () => {
    const row = auditEntryToRow(entry);

    expect(row).toMatchObject({
      id: entry.auditId,
      principalId: entry.principalId,
      resourceId: entry.resourceId,
      outcome: "SUCCESS",
      occurredAt: new Date(entry.occurredAt),
    });
    expect(row).not.toHaveProperty("response");
    expect(row).not.toHaveProperty("source");
  });

  it("rejects invalid outcome metadata", () => {
    expect(() =>
      auditEntryToRow({ ...entry, outcome: "UNKNOWN" as never }),
    ).toThrow(PersistenceMappingError);
  });

  it.each([
    "auditId",
    "principalId",
    "action",
    "resourceType",
    "resourceId",
    "requestId",
    "correlationId",
  ])("rejects an empty %s", (field) => {
    expect(() =>
      auditEntryToRow({ ...entry, [field]: "   " } as AuditEntry),
    ).toThrow(`${field} must not be empty`);
  });

  it("rejects an invalid occurrence timestamp", () => {
    expect(() =>
      auditEntryToRow({ ...entry, occurredAt: "not-a-timestamp" }),
    ).toThrow("occurredAt must be a valid timestamp");
  });

  it("keeps the append-only audit table explicit", () => {
    expect(auditEntries).toBeDefined();
  });

  it("keeps the audit RLS context and append in one transaction", async () => {
    const calls: string[] = [];
    const transaction = {
      execute: async () => {
        calls.push("transaction:set-audit-write");
      },
      insert: () => ({
        values: async () => {
          calls.push("transaction:insert");
        },
      }),
    };
    const database = {
      transaction: async (
        work: (tx: typeof transaction) => Promise<unknown>,
      ) => {
        calls.push("begin");
        const result = await work(transaction);
        calls.push("commit");
        return result;
      },
    } as unknown as PostgresJsDatabase<typeof schema>;

    await createAuditRepository(database).append(entry);

    expect(calls).toEqual([
      "begin",
      "transaction:set-audit-write",
      "transaction:insert",
      "commit",
    ]);
  });

  it("maps a stored row back to a read-only metadata projection", () => {
    const mapped = auditRowToEntry({
      id: entry.auditId,
      principalId: entry.principalId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      scopeId: entry.scopeId ?? null,
      outcome: entry.outcome,
      reasonCode: entry.reasonCode ?? null,
      requestId: entry.requestId,
      correlationId: entry.correlationId,
      beforeHash: null,
      afterHash: null,
      occurredAt: new Date(entry.occurredAt),
    });

    expect(mapped).toEqual(entry);
    expect(Object.isFrozen(mapped)).toBe(true);
  });

  it("lists rows in the transaction read context and preserves optional metadata", async () => {
    const row = {
      id: entry.auditId,
      principalId: entry.principalId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      scopeId: entry.scopeId,
      outcome: entry.outcome,
      reasonCode: entry.reasonCode,
      requestId: entry.requestId,
      correlationId: entry.correlationId,
      beforeHash: "before-hash",
      afterHash: "after-hash",
      occurredAt: new Date(entry.occurredAt),
    };
    const calls: string[] = [];
    const transaction = {
      execute: async () => {
        calls.push("read-context");
      },
      select: () => ({
        from: () => ({
          orderBy: () => ({
            limit: async () => [row],
          }),
        }),
      }),
    };
    const database = {
      transaction: async (work: (tx: typeof transaction) => Promise<unknown>) =>
        work(transaction),
    } as unknown as PostgresJsDatabase<typeof schema>;

    await expect(createAuditRepository(database).list()).resolves.toEqual([
      {
        ...entry,
        beforeHash: "before-hash",
        afterHash: "after-hash",
      },
    ]);
    expect(calls).toEqual(["read-context"]);
  });

  it("rejects unsupported outcomes returned by storage", async () => {
    const transaction = {
      execute: async () => undefined,
      select: () => ({
        from: () => ({
          orderBy: () => ({
            limit: async () => [
              {
                ...entry,
                id: entry.auditId,
                scopeId: null,
                reasonCode: null,
                beforeHash: null,
                afterHash: null,
                occurredAt: new Date(entry.occurredAt),
                outcome: "BROKEN",
              },
            ],
          }),
        }),
      }),
    };
    const database = {
      transaction: async (work: (tx: typeof transaction) => Promise<unknown>) =>
        work(transaction),
    } as unknown as PostgresJsDatabase<typeof schema>;

    await expect(createAuditRepository(database).list()).rejects.toThrow(
      "audit outcome is not supported",
    );
  });
});
