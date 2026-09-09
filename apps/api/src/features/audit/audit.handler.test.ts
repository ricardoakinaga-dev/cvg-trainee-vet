import { describe, expect, it, vi } from "vitest";

import type { AuditTrailState } from "@cvg/application";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import { handleAuditTrail } from "./audit.handler.js";

const SCOPE = "11111111-1111-4111-8111-111111111111";
const PRINCIPAL_ID = "22222222-2222-4222-8222-222222222222";

const auditor: ApiPrincipal = {
  principalId: PRINCIPAL_ID,
  accountStatus: "ACTIVE",
  roles: ["AUDITOR"],
  scopes: [SCOPE],
};

const participant: ApiPrincipal = {
  principalId: PRINCIPAL_ID,
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [SCOPE],
};

const state: AuditTrailState = {
  kind: "audit_trail",
  scopeId: SCOPE,
  filters: { scopeId: SCOPE, action: "CONTENT_PUBLISHED", limit: 25 },
  items: [],
  hasNext: false,
};

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    ...overrides,
  } as ApiHttpDependencies;
}

function getRequest(query: Record<string, string | undefined>): ApiHttpRequest {
  return { method: "GET", path: "/api/v1/audit", query, body: undefined };
}

describe("audit feature handlers", () => {
  it("branch=validation/risk=malformed-input: rejects unknown query keys (422)", async () => {
    const getAuditTrail = vi.fn();
    const response = await handleAuditTrail(
      getRequest({ scopeId: SCOPE, evil: "1" }),
      "request-1",
      auditor,
      baseDependencies({ getAuditTrail }),
    );
    expect(response.status).toBe(422);
    expect(getAuditTrail).not.toHaveBeenCalled();
  });

  it("branch=forbidden/risk=privilege-escalation: denies participant without audit scope (403)", async () => {
    const getAuditTrail = vi.fn();
    const response = await handleAuditTrail(
      getRequest({ scopeId: SCOPE }),
      "request-1",
      participant,
      baseDependencies({ getAuditTrail }),
    );
    expect(response.status).toBe(403);
    expect(getAuditTrail).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: returns the scoped trail with cursor metadata (200)", async () => {
    const getAuditTrail = vi.fn(async () => ({
      ...state,
      hasNext: true as const,
      nextCursor: "cursor-1",
    }));
    const response = await handleAuditTrail(
      getRequest({ scopeId: SCOPE }),
      "request-1",
      auditor,
      baseDependencies({ getAuditTrail }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { kind: "audit_trail", scopeId: SCOPE },
    });
  });
});
