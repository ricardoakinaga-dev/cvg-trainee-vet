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
  });
});
