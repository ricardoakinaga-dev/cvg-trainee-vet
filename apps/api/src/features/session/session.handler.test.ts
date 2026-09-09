import { describe, expect, it, vi } from "vitest";

import type { ApiHttpDependencies, ApiHttpRequest } from "../../http.js";
import {
  handleCurrentSession,
  handleRevokeSession,
  handleRotateSession,
} from "./session.handler.js";

function baseRequest(overrides: Partial<ApiHttpRequest> = {}): ApiHttpRequest {
  return {
    method: "POST",
    path: "/api/v1/session/revoke",
    body: undefined,
    ...overrides,
  };
}

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    ...overrides,
  } as ApiHttpDependencies;
}

const principal = {
  principalId: "participant-1",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: ["scope-1"],
} as const;

describe("session feature handlers", () => {
  it("revokes without revealing whether the cookie was active", async () => {
    const revokeSession = vi.fn(async () => undefined);
    const response = await handleRevokeSession(
      baseRequest({ headers: { cookie: "__Host-cvg_session=c" } }),
      "request-1",
      baseDependencies({ revokeSession }),
    );
    expect(response.status).toBe(200);
    expect(revokeSession).toHaveBeenCalledWith("__Host-cvg_session=c");
    expect(response.headers?.["set-cookie"]).toContain("Max-Age=0");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "revoked" },
    });
  });

  it("revokes even when no revocation port is wired", async () => {
    const response = await handleRevokeSession(
      baseRequest(),
      "request-1",
      baseDependencies(),
    );
    expect(response.status).toBe(200);
  });

  it("projects a minimal active session without identity leakage", async () => {
    const response = await handleCurrentSession(
      baseRequest({ method: "GET", path: "/api/v1/session/current" }),
      "request-1",
      baseDependencies({ authenticate: async () => ({ ...principal }) }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "active" },
    });
    expect(JSON.stringify(response.body)).not.toContain("participant-1");
    expect(JSON.stringify(response.body)).not.toContain("PARTICIPANT");
  });

  it("rejects current-session reads without a principal", async () => {
    const response = await handleCurrentSession(
      baseRequest({ method: "GET", path: "/api/v1/session/current" }),
      "request-1",
      baseDependencies({ authenticate: async () => null }),
    );
    expect(response.status).toBe(401);
  });

  it("rotates through a bounded contract and returns only the new cookie", async () => {
    const cookie =
      "__Host-cvg_session=d; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600";
    const rotateSession = vi.fn(async () => ({
      sessionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      token: "d".repeat(32),
      expiresAt: new Date("2026-08-09T18:00:00.000Z"),
      cookie,
    }));
    const response = await handleRotateSession(
      baseRequest({
        path: "/api/v1/session/rotate",
        body: { sessionExpiresInSeconds: 3600 },
        headers: { cookie: "__Host-cvg_session=c" },
      }),
      "request-1",
      baseDependencies({ rotateSession }),
    );
    expect(response.status).toBe(200);
    expect(rotateSession).toHaveBeenCalledWith("__Host-cvg_session=c", 3600);
    expect(response.headers?.["set-cookie"]).toBe(cookie);
    expect(JSON.stringify(response.body)).not.toContain("dddddddd");
  });

  it("fails rotation closed on invalid body, missing port, or unknown session", async () => {
    const invalid = await handleRotateSession(
      baseRequest({ path: "/api/v1/session/rotate", body: "nope" }),
      "request-1",
      baseDependencies({ rotateSession: async () => null }),
    );
    expect(invalid.status).toBe(422);

    const missing = await handleRotateSession(
      baseRequest({
        path: "/api/v1/session/rotate",
        body: { sessionExpiresInSeconds: 60 },
      }),
      "request-1",
      baseDependencies(),
    );
    expect(missing.status).toBe(500);

    const unknown = await handleRotateSession(
      baseRequest({
        path: "/api/v1/session/rotate",
        body: { sessionExpiresInSeconds: 60 },
      }),
      "request-1",
      baseDependencies({ rotateSession: async () => null }),
    );
    expect(unknown.status).toBe(401);
  });
});
