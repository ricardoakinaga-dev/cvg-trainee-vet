import { describe, expect, it } from "vitest";

import type { AuditEntry } from "@cvg/application";

import {
  PersistenceMappingError,
  auditEntryToRow,
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

  it("rejects an authenticated entry without a scope", () => {
    const { scopeId: _scopeId, ...withoutScope } = entry;
    void _scopeId;
    expect(() => auditEntryToRow(withoutScope)).toThrow(
      PersistenceMappingError,
    );
  });

  it("keeps the append-only audit table explicit", () => {
    expect(auditEntries).toBeDefined();
  });

  it("maps anonymous HTTP rejection metadata without a fake UUID", () => {
    const row = auditEntryToRow({
      auditId: "11111111-1111-4111-8111-111111111111",
      actorKind: "ANONYMOUS",
      action: "HTTP_REQUEST_REJECTED",
      resourceType: "http_route",
      resourceId: "/api/v1/invitations/accept",
      outcome: "DENIED",
      reasonCode: "api_unauthenticated",
      requestId: "22222222-2222-4222-8222-222222222222",
      correlationId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-23T22:00:00.000Z",
    });

    expect(row).toMatchObject({
      actorKind: "ANONYMOUS",
      principalId: null,
      resourceId: "/api/v1/invitations/accept",
    });
  });
});
