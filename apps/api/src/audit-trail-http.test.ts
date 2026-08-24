import { describe, expect, it, vi } from "vitest";

import type { ApiHttpDependencies, ApiHttpRequest } from "./http.js";
import { handleApiRequest } from "./http.js";
import type { AuditTrailState } from "@cvg/application";

const scopeId = "11111111-1111-4111-8111-111111111111";
const principalId = "22222222-2222-4222-8222-222222222222";

const state: AuditTrailState = {
  kind: "audit_trail",
  scopeId,
  filters: { scopeId, action: "CONTENT_PUBLISHED", limit: 25 },
  items: [
    {
      auditId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-24T12:00:00.000Z",
      actorKind: "AUTHENTICATED",
      principalId,
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
    },
  ],
  hasNext: true,
  nextCursor: "eyJvY2N1cnJlZF9hdCI6IjIwMjYtMDgtMjQifQ",
};

function dependencies(
  authenticate: ApiHttpDependencies["authenticate"],
  getAuditTrail: NonNullable<ApiHttpDependencies["getAuditTrail"]>,
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "77777777-7777-4777-8777-777777777777",
    authenticate,
    getAuditTrail,
    resolveActivityScope: async () => null,
    resolveAttempt: async () => null,
    createInvitation: async () => {
      throw new Error("not used");
    },
    acceptInvitation: async () => {
      throw new Error("not used");
    },
    getParticipantActivity: async () => {
      throw new Error("not used");
    },
    advanceContent: async () => {
      throw new Error("not used");
    },
    getParticipantProgress: async () => {
      throw new Error("not used");
    },
    getAttemptFeedback: async () => null,
    correctOpenResponse: async () => {
      throw new Error("not used");
    },
    startAttempt: async () => {
      throw new Error("not used");
    },
    saveAnswer: async () => {
      throw new Error("not used");
    },
    submitAttempt: async () => {
      throw new Error("not used");
    },
    healthcheck: async () => undefined,
  };
}

function auditRequest(
  query: Readonly<Record<string, string | undefined>> = { scopeId },
): ApiHttpRequest {
  return { method: "GET", path: "/api/v1/audit", query, body: undefined };
}

describe("audit trail HTTP boundary", () => {
  it("requires an authenticated scoped auditor and returns cursor metadata", async () => {
    const getAuditTrail = vi.fn(async () => state);
    const response = await handleApiRequest(
      auditRequest({ scopeId, action: "CONTENT_PUBLISHED", limit: "25" }),
      dependencies(
        async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [scopeId],
        }),
        getAuditTrail,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "audit_trail",
        scopeId,
        items: [{ action: "CONTENT_PUBLISHED" }],
      },
      meta: {
        has_next: true,
        next_cursor: state.nextCursor,
      },
    });
    expect(getAuditTrail).toHaveBeenCalledWith(
      expect.objectContaining({
        principalId,
        query: { scopeId, action: "CONTENT_PUBLISHED", limit: 25 },
      }),
    );
  });

  it("rejects anonymous, participant, cross-scope and unknown-filter requests", async () => {
    const getAuditTrail = vi.fn(async () => state);
    const unauthenticated = await handleApiRequest(
      auditRequest(),
      dependencies(async () => null, getAuditTrail),
    );
    const participant = await handleApiRequest(
      auditRequest(),
      dependencies(
        async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
        getAuditTrail,
      ),
    );
    const crossScope = await handleApiRequest(
      auditRequest({ scopeId: "99999999-9999-4999-8999-999999999999" }),
      dependencies(
        async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [scopeId],
        }),
        getAuditTrail,
      ),
    );
    const unknownFilter = await handleApiRequest(
      auditRequest({ scopeId, sort: "occurredAt" }),
      dependencies(
        async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [scopeId],
        }),
        getAuditTrail,
      ),
    );

    expect(unauthenticated.status).toBe(401);
    expect(participant.status).toBe(403);
    expect(crossScope.status).toBe(403);
    expect(unknownFilter.status).toBe(422);
    expect(getAuditTrail).not.toHaveBeenCalled();
  });

  it("does not expose protected payload-shaped keys in the response", async () => {
    const getAuditTrail = vi.fn(async () => state);
    const response = await handleApiRequest(
      auditRequest(),
      dependencies(
        async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
        }),
        getAuditTrail,
      ),
    );

    expect(response.body.success).toBe(true);
    if (response.body.success !== true) throw new Error("expected success");
    expect(JSON.stringify(response.body.data)).not.toContain("token");
    expect(JSON.stringify(response.body.data)).not.toContain("prompt");
    expect(JSON.stringify(response.body.data)).not.toContain("body");
  });
});
