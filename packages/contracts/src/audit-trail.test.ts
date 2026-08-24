import { describe, expect, it } from "vitest";

import {
  auditTrailProjectionSchema,
  auditTrailQuerySchema,
  parseAuditTrailProjection,
} from "./audit-trail.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const principalId = "22222222-2222-4222-8222-222222222222";

const item = {
  auditId: "33333333-3333-4333-8333-333333333333",
  occurredAt: "2026-08-24T12:00:00.000Z",
  actorKind: "AUTHENTICATED" as const,
  principalId,
  action: "CONTENT_PUBLISHED",
  resourceType: "content_version",
  resourceId: "44444444-4444-4444-8444-444444444444",
  scopeId,
  outcome: "SUCCESS" as const,
  reasonCode: "clinical_approval",
  requestId: "55555555-5555-4555-8555-555555555555",
  correlationId: "66666666-6666-4666-8666-666666666666",
  beforeHash: "a".repeat(64),
  afterHash: "b".repeat(64),
};

describe("audit trail contract", () => {
  it("accepts bounded allowlisted filters and a cursor", () => {
    const query = auditTrailQuerySchema.parse({
      scopeId,
      action: "CONTENT_PUBLISHED",
      resourceType: "content_version",
      actorKind: "AUTHENTICATED",
      outcome: "SUCCESS",
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z",
      cursor: "eyJvY2N1cnJlZF9hdCI6IjIwMjYtMDgtMjQifQ",
      limit: 25,
    });

    expect(query).toMatchObject({ scopeId, limit: 25 });
  });

  it("rejects unknown filters, unsafe cursors, invalid limits and inverted windows", () => {
    expect(() =>
      auditTrailQuerySchema.parse({ scopeId, sort: "occurredAt" }),
    ).toThrow();
    expect(() =>
      auditTrailQuerySchema.parse({ scopeId, cursor: "not opaque!" }),
    ).toThrow();
    expect(() =>
      auditTrailQuerySchema.parse({ scopeId, limit: 101 }),
    ).toThrow();
    expect(() =>
      auditTrailQuerySchema.parse({
        scopeId,
        from: "2026-08-25T00:00:00.000Z",
        to: "2026-08-24T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("parses an allowlisted projection and rejects protected payload keys", () => {
    const projection = parseAuditTrailProjection({
      kind: "audit_trail",
      scopeId,
      filters: { scopeId, limit: 50 },
      items: [item],
    });

    expect(projection.items).toHaveLength(1);
    expect(() =>
      auditTrailProjectionSchema.parse({
        kind: "audit_trail",
        scopeId,
        filters: { scopeId, limit: 50 },
        items: [{ ...item, token: "secret" }],
      }),
    ).toThrow();
    expect(() =>
      auditTrailProjectionSchema.parse({
        kind: "audit_trail",
        scopeId,
        filters: { scopeId, limit: 50 },
        items: [{ ...item, scopeId: undefined }],
      }),
    ).toThrow();
  });
});
