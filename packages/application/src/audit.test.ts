import { describe, expect, it } from "vitest";

import { createAuditEntry } from "./audit.js";

describe("audit entry contract", () => {
  it("creates immutable metadata-only traceability", () => {
    const entry = createAuditEntry({
      auditId: "audit-1",
      principalId: "participant-1",
      action: "ANSWER_SAVED",
      resourceType: "attempt",
      resourceId: "attempt-1",
      scopeId: "scope-1",
      requestId: "request-1",
      correlationId: "correlation-1",
      occurredAt: "2026-08-09T17:00:00.000Z",
      outcome: "SUCCESS",
      reasonCode: "draft_saved",
    });

    expect(entry).toMatchObject({
      action: "ANSWER_SAVED",
      resourceType: "attempt",
      outcome: "SUCCESS",
    });
    expect(Object.isFrozen(entry)).toBe(true);
    expect(JSON.stringify(entry)).not.toMatch(/"response"\s*:/u);
    expect(JSON.stringify(entry)).not.toMatch(/"photo"\s*:/u);
    expect(JSON.stringify(entry)).not.toMatch(/"source"\s*:/u);
  });

  it("does not mutate caller input and rejects unsafe metadata", () => {
    const input = {
      auditId: "audit-1",
      principalId: "participant-1",
      action: "ANSWER_SAVED",
      resourceType: "attempt",
      resourceId: "attempt-1",
      scopeId: "scope-1",
      requestId: "request-1",
      correlationId: "correlation-1",
      occurredAt: "2026-08-09T17:00:00.000Z",
      outcome: "SUCCESS" as const,
    };
    createAuditEntry(input);

    expect(input).toEqual({
      auditId: "audit-1",
      principalId: "participant-1",
      action: "ANSWER_SAVED",
      resourceType: "attempt",
      resourceId: "attempt-1",
      scopeId: "scope-1",
      requestId: "request-1",
      correlationId: "correlation-1",
      occurredAt: "2026-08-09T17:00:00.000Z",
      outcome: "SUCCESS",
    });
    expect(() =>
      createAuditEntry({ ...input, action: "answer<script>" }),
    ).toThrow("action");
    expect(() => createAuditEntry({ ...input, occurredAt: "invalid" })).toThrow(
      "occurredAt",
    );
    expect(() =>
      createAuditEntry({ ...input, beforeHash: "not-a-hash" }),
    ).toThrow("beforeHash");
    expect(() =>
      createAuditEntry({ ...input, reasonCode: "unsafe reason" }),
    ).toThrow("reasonCode");
    expect(() => createAuditEntry({ ...input, scopeId: " " })).toThrow(
      "scopeId",
    );
    expect(() => {
      const { scopeId: _scopeId, ...withoutScope } = input;
      void _scopeId;
      createAuditEntry(withoutScope);
    }).toThrow("scopeId is required");
  });

  it("represents an anonymous rejection without inventing a principal", () => {
    const entry = createAuditEntry({
      auditId: "11111111-1111-4111-8111-111111111111",
      actorKind: "ANONYMOUS",
      action: "HTTP_REQUEST_REJECTED",
      resourceType: "http_route",
      resourceId: "/api/v1/invitations/accept",
      requestId: "22222222-2222-4222-8222-222222222222",
      correlationId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-23T22:00:00.000Z",
      outcome: "DENIED",
      reasonCode: "api_unauthenticated",
    });

    expect(entry).toMatchObject({
      actorKind: "ANONYMOUS",
      resourceType: "http_route",
      resourceId: "/api/v1/invitations/accept",
      outcome: "DENIED",
    });
    expect(entry.principalId).toBeUndefined();
  });
});
