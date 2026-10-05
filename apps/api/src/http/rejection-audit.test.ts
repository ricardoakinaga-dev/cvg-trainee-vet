import { describe, expect, it, vi } from "vitest";

import { apiErrorResponse } from "@cvg/contracts";
import { createObservability, type LogRecord } from "@cvg/observability";

import { handleApiRequest } from "../http.js";
import { dependencies } from "../http-boundary/fixtures.js";
import type { ApiPrincipal } from "./contracts.js";
import { recordApiRejectionAudit } from "./rejection-audit.js";

const requestId = "11111111-1111-4111-8111-111111111111";
const ownScope = "22222222-2222-4222-8222-222222222222";
const otherOwnScope = "55555555-5555-4555-8555-555555555555";
const foreignScope = "33333333-3333-4333-8333-333333333333";
const principal: ApiPrincipal = {
  principalId: "44444444-4444-4444-8444-444444444444",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [ownScope, otherOwnScope],
};
const response = {
  status: 403,
  body: apiErrorResponse("forbidden", requestId),
};
const request = {
  method: "GET",
  path: "/api/v1/audit",
  route: "/api/v1/audit",
};

describe("API rejection audit trusted context", () => {
  it.each([undefined, foreignScope])(
    "records missing or foreign scope in an authorized scope (%s)",
    async (scopeId) => {
      const append = vi.fn(async () => undefined);
      const resolveActivityScope = vi.fn(async () => {
        throw new Error("forbidden resource lookup");
      });
      await recordApiRejectionAudit(
        dependencies({ audit: { append }, resolveActivityScope }),
        {
          ...request,
          ...(scopeId === undefined ? {} : { scopeId }),
          body: { privateDiagnostic: "synthetic body marker" },
        },
        response,
        principal,
      );
      expect(append).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          actorKind: "AUTHENTICATED",
          principalId: principal.principalId,
          scopeId: ownScope,
          action: "HTTP_REQUEST_REJECTED",
          outcome: "DENIED",
          resourceType: "http_route",
          resourceId: request.route,
        }),
      );
      expect(JSON.stringify(append.mock.calls)).not.toContain(foreignScope);
      expect(JSON.stringify(append.mock.calls)).not.toContain(
        "synthetic body marker",
      );
      expect(resolveActivityScope).not.toHaveBeenCalled();
    },
  );

  it.each(["scopeId", "body"])(
    "retains an authorized second scope selected through %s",
    async (source) => {
      const append = vi.fn(async () => undefined);
      await recordApiRejectionAudit(
        dependencies({ audit: { append } }),
        {
          ...request,
          ...(source === "scopeId"
            ? { scopeId: otherOwnScope }
            : { body: { scopeId: otherOwnScope } }),
        },
        response,
        principal,
      );
      expect(append).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ scopeId: otherOwnScope }),
      );
    },
  );

  it("does not attribute a foreign body scope to the actor", async () => {
    const append = vi.fn(async () => undefined);
    await recordApiRejectionAudit(
      dependencies({ audit: { append } }),
      { ...request, body: { scopeId: foreignScope } },
      response,
      principal,
    );
    expect(append).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ scopeId: ownScope }),
    );
    expect(JSON.stringify(append.mock.calls)).not.toContain(foreignScope);
  });

  it("observes append failure without leaking error or request data", async () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "api",
      sink: (record) => records.push(record),
    });
    const append = vi.fn(async () => {
      throw new Error("synthetic private database detail");
    });
    await expect(
      recordApiRejectionAudit(
        dependencies({ audit: { append }, observability }),
        {
          ...request,
          scopeId: ownScope,
          body: { privateDiagnostic: "synthetic body marker" },
        },
        response,
        principal,
      ),
    ).resolves.toBeUndefined();
    expect(append).toHaveBeenCalledOnce();
    expect(records).toEqual([
      expect.objectContaining({
        level: "error",
        event: "http.rejection.audit.failed",
        requestId,
        correlationId: requestId,
        fields: { outcome: "failure", error_code: "AUDIT_APPEND_FAILED" },
      }),
    ]);
    expect(observability.metrics.snapshot().counters).toEqual([
      {
        name: "api.rejection_audit.failures",
        value: 1,
        labels: { reason: "AUDIT_APPEND_FAILED" },
      },
    ]);
    expect(JSON.stringify(records)).not.toContain("synthetic private");
    expect(JSON.stringify(records)).not.toContain("synthetic body marker");
    expect(response.status).toBe(403);
  });

  it("reports missing trusted scope without inventing an anonymous actor", async () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "api",
      sink: (record) => records.push(record),
    });
    const append = vi.fn(async () => undefined);
    await recordApiRejectionAudit(
      dependencies({ audit: { append }, observability }),
      { ...request, scopeId: foreignScope },
      response,
      { ...principal, scopes: [] },
    );
    expect(append).not.toHaveBeenCalled();
    expect(records).toEqual([
      expect.objectContaining({
        event: "http.rejection.audit.failed",
        fields: { outcome: "failure", error_code: "AUDIT_SCOPE_UNAVAILABLE" },
      }),
    ]);
    expect(JSON.stringify(records)).not.toContain(foreignScope);
  });

  it.each(["logger", "metrics", "both"])(
    "preserves rejection when the %s observer throws",
    async (failure) => {
      const observability = createObservability({
        service: "api",
        sink: () => undefined,
      });
      const logger = vi.fn(observability.logger.error);
      const metrics = vi.fn(observability.metrics.increment);
      if (failure !== "metrics") {
        logger.mockImplementation(() => {
          throw new Error("sink failure");
        });
      }
      if (failure !== "logger") {
        metrics.mockImplementation(() => {
          throw new Error("metric failure");
        });
      }
      await expect(
        recordApiRejectionAudit(
          dependencies({
            observability: {
              logger: { ...observability.logger, error: logger },
              metrics: { ...observability.metrics, increment: metrics },
            },
            audit: {
              append: async () => {
                throw new Error("append failure");
              },
            },
          }),
          { ...request, scopeId: ownScope },
          response,
          principal,
        ),
      ).resolves.toBeUndefined();
      expect(logger).toHaveBeenCalledOnce();
      expect(metrics).toHaveBeenCalledOnce();
    },
  );

  it("retains anonymous audit behavior and suppresses success auditing", async () => {
    const append = vi.fn(async () => undefined);
    const deps = dependencies({ audit: { append } });
    await recordApiRejectionAudit(deps, request, response);
    expect(append).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ actorKind: "ANONYMOUS", outcome: "DENIED" }),
    );
    expect(append.mock.calls[0]).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ scopeId: ownScope })]),
    );
    append.mockClear();
    await recordApiRejectionAudit(
      deps,
      request,
      { ...response, status: 200 },
      principal,
    );
    expect(append).not.toHaveBeenCalled();
  });

  it("preserves the public rejection when both append and log sink fail", async () => {
    const audit = {
      append: vi.fn(async () => {
        throw new Error("synthetic private database detail");
      }),
    };
    const observability = createObservability({
      service: "api",
      sink: () => {
        throw new Error("synthetic private sink detail");
      },
    });
    const publicResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/content/drafts",
        body: { scopeId: foreignScope },
      },
      dependencies({ audit, observability, requestIdFactory: () => requestId }),
    );
    expect(publicResponse.status).toBe(422);
    expect(publicResponse.body).toMatchObject({
      success: false,
      error: { code: "validation_error" },
      meta: { request_id: requestId },
    });
    expect(audit.append).toHaveBeenCalledOnce();
    expect(JSON.stringify(publicResponse)).not.toContain("synthetic private");
    expect(JSON.stringify(publicResponse)).not.toContain(foreignScope);
  });
});
