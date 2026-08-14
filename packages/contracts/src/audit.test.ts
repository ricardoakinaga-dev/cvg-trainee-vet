import { describe, expect, it } from "vitest";

import { parseAuditTrail } from "./audit.js";

const entry = {
  auditId: "11111111-1111-4111-8111-111111111111",
  principalId: "22222222-2222-4222-8222-222222222222",
  action: "CONTENT_PUBLISHED",
  resourceType: "content_version",
  resourceId: "33333333-3333-4333-8333-333333333333",
  scopeId: "44444444-4444-4444-8444-444444444444",
  outcome: "SUCCESS" as const,
  reasonCode: "approved",
  requestId: "55555555-5555-4555-8555-555555555555",
  correlationId: "66666666-6666-4666-8666-666666666666",
  occurredAt: "2026-08-14T08:00:00.000Z",
};

describe("internal audit projection contract", () => {
  it("accepts metadata-only audit entries", () => {
    expect(parseAuditTrail({ entries: [entry] })).toEqual({
      entries: [entry],
    });
  });

  it("rejects participant payloads and malformed identifiers", () => {
    expect(() =>
      parseAuditTrail({
        entries: [{ ...entry, response: "must not cross the boundary" }],
      }),
    ).toThrow();
    expect(() =>
      parseAuditTrail({ entries: [{ ...entry, resourceId: "not-a-uuid" }] }),
    ).toThrow();
  });
});
