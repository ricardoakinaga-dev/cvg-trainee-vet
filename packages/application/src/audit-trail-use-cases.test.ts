import { describe, expect, it, vi } from "vitest";

import { getAuditTrail, type AuditTrailReadPort } from "./index.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const otherScopeId = "99999999-9999-4999-8999-999999999999";
const principalId = "22222222-2222-4222-8222-222222222222";

const record = {
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

function withoutScopeId(value: typeof record): Omit<typeof record, "scopeId"> {
  const { scopeId, ...result } = value;
  void scopeId;
  return result;
}

function asAnonymousGlobal(value: typeof record) {
  const { principalId, scopeId, ...result } = value;
  void principalId;
  void scopeId;
  return { ...result, actorKind: "ANONYMOUS" as const };
}

const command = {
  principalId,
  accountStatus: "ACTIVE" as const,
  roles: ["AUDITOR"] as const,
  scopes: [scopeId] as const,
  query: { scopeId, action: "CONTENT_PUBLISHED", limit: 25 },
};

describe("getAuditTrail", () => {
  it("authorizes one scope and returns a frozen bounded page", async () => {
    const listAuditTrail = vi.fn(async () => ({
      scopeId,
      items: [record],
      hasNext: true,
      nextCursor: "eyJvY2N1cnJlZF9hdCI6IjIwMjYtMDgtMjQifQ",
    }));
    const result = await getAuditTrail(command, {
      listAuditTrail,
    } satisfies AuditTrailReadPort);

    expect(result).toMatchObject({
      kind: "audit_trail",
      scopeId,
      hasNext: true,
      nextCursor: expect.any(String),
      items: [record],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(listAuditTrail).toHaveBeenCalledWith({
      scopeId,
      action: "CONTENT_PUBLISHED",
      limit: 25,
    });
  });

  it("denies inactive, participant and cross-scope access", async () => {
    const port: AuditTrailReadPort = {
      listAuditTrail: async () => ({
        scopeId,
        items: [],
        hasNext: false,
      }),
    };
    await expect(
      getAuditTrail({ ...command, accountStatus: "SUSPENDED" }, port),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      getAuditTrail({ ...command, roles: ["PARTICIPANT"] }, port),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      getAuditTrail(
        { ...command, query: { scopeId: otherScopeId, limit: 25 } },
        port,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects a repository result outside the requested scope", async () => {
    const port: AuditTrailReadPort = {
      listAuditTrail: async () => ({
        scopeId,
        items: [{ ...record, scopeId: otherScopeId }],
        hasNext: false,
      }),
    };

    await expect(getAuditTrail(command, port)).rejects.toMatchObject({
      code: "internal_error",
    });
  });

  it("rejects authenticated global records while allowing anonymous global rejections", async () => {
    const port: AuditTrailReadPort = {
      listAuditTrail: async () => ({
        scopeId,
        items: [withoutScopeId(record)],
        hasNext: false,
      }),
    };
    await expect(getAuditTrail(command, port)).rejects.toMatchObject({
      code: "internal_error",
    });

    const anonymousPort: AuditTrailReadPort = {
      listAuditTrail: async () => ({
        scopeId,
        items: [
          {
            ...asAnonymousGlobal(record),
          },
        ],
        hasNext: false,
      }),
    };
    await expect(getAuditTrail(command, anonymousPort)).resolves.toMatchObject({
      items: [{ actorKind: "ANONYMOUS" }],
    });
  });

  it("forwards every supported filter and cursor to the read port", async () => {
    const listAuditTrail = vi.fn(async () => ({
      scopeId,
      items: [record],
      hasNext: false,
    }));
    const query = {
      scopeId,
      action: record.action,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      principalId,
      actorKind: "AUTHENTICATED" as const,
      outcome: "SUCCESS" as const,
      from: "2026-08-24T00:00:00.000Z",
      to: "2026-08-24T23:59:59.999Z",
      cursor: "cursor-token",
      limit: 1,
    };

    await expect(
      getAuditTrail({ ...command, query }, { listAuditTrail }),
    ).resolves.toMatchObject({
      filters: {
        scopeId,
        action: record.action,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        principalId,
        actorKind: "AUTHENTICATED",
        outcome: "SUCCESS",
        from: query.from,
        to: query.to,
        limit: 1,
      },
      items: [record],
    });
    expect(listAuditTrail).toHaveBeenCalledWith(query);
  });

  it("rejects malformed queries before calling the repository", async () => {
    const listAuditTrail = vi.fn(async () => ({
      scopeId,
      items: [],
      hasNext: false,
    }));
    const invalidQueries: readonly unknown[] = [
      { ...command.query, scopeId: " " },
      { ...command.query, scopeId: "not-a-uuid" },
      { ...command.query, action: "unsafe action" },
      { ...command.query, resourceType: "unsafe type" },
      { ...command.query, resourceId: " " },
      { ...command.query, resourceId: "x".repeat(257) },
      { ...command.query, principalId: "not-a-uuid" },
      { ...command.query, actorKind: "SYSTEM" },
      { ...command.query, outcome: "MAYBE" },
      { ...command.query, from: "invalid" },
      { ...command.query, to: "invalid" },
      {
        ...command.query,
        from: "2026-08-25T00:00:00.000Z",
        to: "2026-08-24T00:00:00.000Z",
      },
      { ...command.query, cursor: "unsafe cursor!" },
      { ...command.query, limit: 0 },
      { ...command.query, limit: 101 },
    ];

    for (const query of invalidQueries) {
      await expect(
        getAuditTrail(
          { ...command, query: query as typeof command.query },
          { listAuditTrail },
        ),
      ).rejects.toMatchObject({ code: "validation_error" });
    }
    expect(listAuditTrail).not.toHaveBeenCalled();
  });

  it("classifies malformed repository pages as internal errors", async () => {
    const invalidPages: readonly unknown[] = [
      { scopeId: otherScopeId, items: [], hasNext: false },
      { scopeId, items: [record, record], hasNext: false },
      { scopeId, items: [], hasNext: true },
      { scopeId, items: [], hasNext: false, nextCursor: "cursor-token" },
    ];

    for (const page of invalidPages) {
      await expect(
        getAuditTrail(
          { ...command, query: { scopeId, limit: 1 } },
          { listAuditTrail: async () => page as never },
        ),
      ).rejects.toMatchObject({ code: "internal_error", status: 500 });
    }
  });

  it("maps semantic repository cursor failures to validation errors", async () => {
    const port: AuditTrailReadPort = {
      listAuditTrail: async () => {
        throw new TypeError("cursor payload is invalid");
      },
    };

    await expect(getAuditTrail(command, port)).rejects.toMatchObject({
      code: "validation_error",
      status: 422,
    });
  });

  it("rejects malformed or non-matching records as internal errors", async () => {
    const invalidRecords: readonly unknown[] = [
      { ...record, auditId: "not-a-uuid" },
      { ...record, occurredAt: "invalid" },
      { ...record, action: "unsafe action" },
      { ...record, resourceType: "unsafe type" },
      { ...record, principalId: "not-a-uuid" },
      { ...record, scopeId: otherScopeId },
      { ...withoutScopeId(record) },
      { ...record, outcome: "MAYBE" },
      { ...record, actorKind: "SYSTEM" },
      { ...record, beforeHash: "unsafe" },
      { ...record, afterHash: "unsafe" },
      { ...record, actorKind: "ANONYMOUS" },
    ];

    for (const value of invalidRecords) {
      await expect(
        getAuditTrail(
          { ...command, query: { scopeId, limit: 25 } },
          {
            listAuditTrail: async () => ({
              scopeId,
              items: [value as never],
              hasNext: false,
            }),
          },
        ),
      ).rejects.toMatchObject({ code: "internal_error" });
    }
  });

  it("applies time, actor and outcome filters to returned records", async () => {
    const listAuditTrail = vi.fn(async () => ({
      scopeId,
      items: [record],
      hasNext: false,
    }));
    const query = {
      scopeId,
      principalId,
      actorKind: "AUTHENTICATED" as const,
      outcome: "SUCCESS" as const,
      from: "2026-08-24T00:00:00.000Z",
      to: "2026-08-24T23:59:59.999Z",
      limit: 25,
    };

    await expect(
      getAuditTrail({ ...command, query }, { listAuditTrail }),
    ).resolves.toMatchObject({ items: [record] });
  });
});
