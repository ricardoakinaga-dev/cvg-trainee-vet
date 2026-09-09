import { describe, expect, it } from "vitest";

import { handleApiRequest, type ApiHttpDependencies } from "../http.js";
import { ROUTE_REGISTRY } from "../routing/route-registry.js";

const UUID = "11111111-1111-4111-8111-111111111111";

function concretePath(template: string): string {
  return template
    .replace(/:sessionId/g, UUID)
    .replace(/:itemId/g, UUID)
    .replace(/:activityId/g, UUID)
    .replace(/:attemptId/g, UUID)
    .replace(/:contentId/g, UUID)
    .replace(/:version/g, "3")
    .replace(/:moduleId/g, UUID)
    .replace(/:diagnosticResultId/g, UUID)
    .replace(/:assignmentId/g, UUID)
    .replace(/:resultId/g, UUID)
    .replace(/:ticketId/g, UUID)
    .replace(/:appealId/g, UUID)
    .replace(/:accountId/g, UUID);
}

function anonymousDependencies(): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-negative-test",
    authenticate: async () => null,
  } as unknown as ApiHttpDependencies;
}

describe("private routes deny anonymous access at the boundary", () => {
  const lifecycle = new Set([
    "POST /api/v1/session/revoke",
    "GET /api/v1/session/current",
    "POST /api/v1/session/rotate",
  ]);
  const privateRoutes = ROUTE_REGISTRY.filter(
    (definition) =>
      definition.auth !== "public" &&
      !lifecycle.has(`${definition.method} ${definition.template}`),
  );
  expect(privateRoutes.length).toBeGreaterThan(40);

  for (const definition of privateRoutes) {
    it(`${definition.method} ${definition.template} -> 401 without a session`, async () => {
      // Method-agnostic registry entries are probed with every method:
      // unhandled methods may 404, but no method may succeed or leak.
      const methods =
        definition.method === "*"
          ? ["GET", "POST", "PUT", "PATCH", "DELETE"]
          : [definition.method];
      let denials = 0;
      for (const method of methods) {
        const response = await handleApiRequest(
          {
            method,
            path: concretePath(definition.template),
            body: method === "GET" || method === "DELETE" ? undefined : {},
          },
          anonymousDependencies(),
        );
        if (response.status === 404) continue;
        denials += 1;
        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          success: false,
          error: { code: "unauthenticated" },
        });
      }
      expect(denials).toBeGreaterThan(0);
    });
  }

  it("session lifecycle never discloses or mints without cookie possession", async () => {
    const revoked = await handleApiRequest(
      { method: "POST", path: "/api/v1/session/revoke", body: undefined },
      anonymousDependencies(),
    );
    expect(revoked.status).toBe(200);
    expect(revoked.headers?.["set-cookie"]).toContain("Max-Age=0");

    const current = await handleApiRequest(
      { method: "GET", path: "/api/v1/session/current", body: undefined },
      anonymousDependencies(),
    );
    expect(current.status).toBe(401);

    const rotated = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/session/rotate",
        body: { sessionExpiresInSeconds: 3600 },
      },
      anonymousDependencies(),
    );
    expect([401, 422, 500]).toContain(rotated.status);
    expect(rotated.headers?.["set-cookie"] ?? "").not.toContain(
      "__Host-cvg_session=",
    );
  });

  it("token routes reject malformed invitations without touching sessions", async () => {
    for (const path of [
      "/api/v1/invitations/accept",
      "/api/v1/recovery/accept",
    ]) {
      const response = await handleApiRequest(
        { method: "POST", path, body: { token: "short" } },
        anonymousDependencies(),
      );
      expect(response.status).toBe(404);
    }
  });
});
