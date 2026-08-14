import { describe, expect, it } from "vitest";

import { createAuditEntry, listAuditEntries } from "./audit.js";

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

  it("reads an immutable audit snapshot through the read-only port", async () => {
    const entry = createAuditEntry({
      auditId: "11111111-1111-4111-8111-111111111111",
      principalId: "22222222-2222-4222-8222-222222222222",
      action: "CONTENT_PUBLISHED",
      resourceType: "content_version",
      resourceId: "33333333-3333-4333-8333-333333333333",
      requestId: "44444444-4444-4444-8444-444444444444",
      correlationId: "55555555-5555-4555-8555-555555555555",
      occurredAt: "2026-08-14T08:00:00.000Z",
      outcome: "SUCCESS",
    });
    const repository = {
      list: async () => [entry],
    };

    const snapshot = await listAuditEntries(repository);

    expect(snapshot).toEqual([entry]);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("rejects a read port that returns a non-array result", async () => {
    await expect(
      listAuditEntries({ list: async () => null as never }),
    ).rejects.toThrow("audit entries");
  });
});
