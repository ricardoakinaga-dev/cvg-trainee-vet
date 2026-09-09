import { describe, expect, it, vi } from "vitest";

import { handleApiRequest } from "../http.js";
import { attempt, dependencies } from "./fixtures.js";

describe("API HTTP boundary — session boundary", () => {
  it("revokes a session without revealing whether the cookie was active", async () => {
    const revokeSession = vi.fn(async () => undefined);
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/session/revoke",
        body: undefined,
        headers: { cookie: "__Host-cvg_session=" + "c".repeat(32) },
      },
      dependencies({ revokeSession }),
    );

    expect(response.status).toBe(200);
    expect(revokeSession).toHaveBeenCalledWith(
      "__Host-cvg_session=" + "c".repeat(32),
    );
    expect(response.headers?.["set-cookie"]).toContain("Max-Age=0");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "revoked" },
    });
  });
  it("returns a minimal active-session projection for browser rehydration", async () => {
    const authenticate = vi.fn(async () => ({
      principalId: attempt.participantId,
      accountStatus: "ACTIVE" as const,
      roles: ["PARTICIPANT"] as const,
      scopes: ["scope-1"] as const,
    }));
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/session/current",
        body: undefined,
        headers: { cookie: "__Host-cvg_session=" + "c".repeat(32) },
      },
      dependencies({ authenticate }),
    );

    expect(response.status).toBe(200);
    expect(authenticate).toHaveBeenCalledOnce();
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "active" },
    });
    expect(JSON.stringify(response.body)).not.toContain(attempt.participantId);
    expect(JSON.stringify(response.body)).not.toContain("PARTICIPANT");
  });
  it("does not disclose session state when the cookie is unauthenticated", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/session/current",
        body: undefined,
        headers: { cookie: "__Host-cvg_session=" + "x".repeat(32) },
      },
      dependencies({ authenticate: async () => null }),
    );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "unauthenticated" },
    });
  });
  it("rotates a session through a bounded contract and returns only a new cookie", async () => {
    const rotateSession = vi.fn(async () => ({
      sessionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      token: "d".repeat(32),
      expiresAt: new Date("2026-08-09T18:00:00.000Z"),
      cookie:
        "__Host-cvg_session=" +
        "d".repeat(32) +
        "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/session/rotate",
        body: { sessionExpiresInSeconds: 3600 },
        headers: { cookie: "__Host-cvg_session=" + "c".repeat(32) },
      },
      dependencies({ rotateSession }),
    );

    expect(response.status).toBe(200);
    expect(rotateSession).toHaveBeenCalledWith(
      "__Host-cvg_session=" + "c".repeat(32),
      3600,
    );
    expect(response.headers?.["set-cookie"]).toContain("HttpOnly");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "rotated" },
    });
    expect(JSON.stringify(response.body)).not.toContain("dddddddd");
  });
  it("returns only the authenticated internal session scopes", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/session/scopes",
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [
            "11111111-1111-4111-8111-111111111111",
            "22222222-2222-4222-8222-222222222222",
          ],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "internal_session_scopes",
        scopes: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
      },
    });

    const denied = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/session/scopes",
        body: undefined,
      },
      dependencies(),
    );
    expect(denied.status).toBe(403);
  });
});
