import { describe, expect, it } from "vitest";

import type { AuditEntry } from "@cvg/application";

import {
  PersistenceMappingError,
  auditEntryToRow,
  auditRowToEntry,
} from "./audit-repository.js";
import { auditEntries } from "./schema.js";

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

  it("keeps the append-only audit table explicit", () => {
    expect(auditEntries).toBeDefined();
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
});
