import { describe, expect, it, vi } from "vitest";

import { handleApiRequest } from "../http.js";
import { attempt, dependencies } from "./fixtures.js";

describe("API HTTP boundary — accounts boundary", () => {
  it("keeps invitation creation internal and returns the one-time token only to an admin", async () => {
    const createInvitation = vi.fn(async (command) => ({
      invitationId: "99999999-9999-4999-8999-999999999999",
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      professionalEmail: command.professionalEmail,
      token: "a".repeat(32),
      expiresAt: new Date("2026-08-09T18:00:00.000Z"),
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/invitations",
        body: {
          professionalEmail: "trainee@cvg.example",
          invitedRoles: ["PARTICIPANT"],
          invitedScopes: ["11111111-1111-4111-8111-111111111111"],
          expiresInSeconds: 3600,
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        createInvitation,
      }),
    );

    expect(response.status).toBe(201);
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalEmail: "trainee@cvg.example",
        invitedRoles: ["PARTICIPANT"],
        correlationId: "request-123",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { token: "a".repeat(32) },
    });
    expect(JSON.stringify(response.body)).not.toContain("accountId");
  });
  it("changes a participant account only through an authorized scoped admin route", async () => {
    const changeAccountStatus = vi.fn(async () => ({
      accountId: attempt.participantId,
      status: "DEACTIVATED" as const,
      revokedSessions: 3,
    }));
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const response = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/accounts/${attempt.participantId}/status`,
        body: {
          scopeId,
          expectedStatus: "ACTIVE",
          status: "DEACTIVATED",
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
        }),
        changeAccountStatus,
      }),
    );

    expect(response.status).toBe(200);
    expect(changeAccountStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountId: attempt.participantId,
        scopeId,
        expectedStatus: "ACTIVE",
        status: "DEACTIVATED",
        correlationId: "request-123",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "DEACTIVATED", revokedSessions: 3 },
    });
    expect(JSON.stringify(response.body)).not.toContain("accountId");
  });
  it("resends an invitation only to a scoped administrator and never returns its hash", async () => {
    const resendAccountInvitation = vi.fn(async () => ({
      invitationId: "99999999-9999-4999-8999-999999999999",
      accountId: attempt.participantId,
      professionalEmail: "vet@example.invalid",
      token: "r".repeat(32),
      expiresAt: new Date("2026-08-30T12:00:00.000Z"),
    }));
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/accounts/${attempt.participantId}/invitation`,
        body: { scopeId, expiresInSeconds: 3600 },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
        }),
        resendAccountInvitation,
      }),
    );

    expect(response.status).toBe(200);
    expect(resendAccountInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountId: attempt.participantId,
        scopeId,
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { professionalEmail: "vet@example.invalid", token: "r".repeat(32) },
    });
    expect(JSON.stringify(response.body)).not.toContain("tokenHash");
    expect(JSON.stringify(response.body)).not.toContain("accountId");
  });
  it("rejects lifecycle actions from a moderator or malformed target before persistence", async () => {
    const changeAccountStatus = vi.fn();
    const response = await handleApiRequest(
      {
        method: "PATCH",
        path: "/api/v1/internal/accounts/not-a-uuid/status",
        body: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          expectedStatus: "ACTIVE",
          status: "SUSPENDED",
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        changeAccountStatus,
      }),
    );

    expect(response.status).toBe(422);
    expect(changeAccountStatus).not.toHaveBeenCalled();
  });
  it("accepts an invitation without authentication and sets a secure session cookie", async () => {
    const authenticate = vi.fn(async () => null);
    const acceptInvitation = vi.fn(async () => ({
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      session: {
        sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        token: "b".repeat(32),
        expiresAt: new Date("2026-08-09T18:00:00.000Z"),
        cookie:
          "__Host-cvg_session=" +
          "b".repeat(32) +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/invitations/accept",
        body: {
          token: "a".repeat(32),
          sessionExpiresInSeconds: 3600,
        },
      },
      dependencies({ authenticate, acceptInvitation }),
    );

    expect(response.status).toBe(200);
    expect(authenticate).not.toHaveBeenCalled();
    expect(acceptInvitation).toHaveBeenCalledWith({
      token: "a".repeat(32),
      sessionExpiresInSeconds: 3600,
      correlationId: "request-123",
    });
    expect(response.headers?.["set-cookie"]).toContain("HttpOnly");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "active" },
    });
    expect(JSON.stringify(response.body)).not.toContain("accountId");
    expect(JSON.stringify(response.body)).not.toContain("b".repeat(32));
  });
  it("keeps malformed invitation tokens indistinguishable from unavailable tokens", async () => {
    const acceptInvitation = vi.fn();
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/invitations/accept",
        body: { token: "short", sessionExpiresInSeconds: 3600 },
      },
      dependencies({ acceptInvitation }),
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "not_found" },
    });
    expect(acceptInvitation).not.toHaveBeenCalled();
  });
  it("issues scoped recovery only through the internal administrator route", async () => {
    const issueAccountRecovery = vi.fn(async () => ({
      recoveryId: "99999999-9999-4999-8999-999999999999",
      accountId: attempt.participantId,
      professionalEmail: "vet@example.invalid",
      token: "r".repeat(32),
      expiresAt: new Date("2026-08-23T12:30:00.000Z"),
      revokedSessions: 2,
    }));
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/accounts/${attempt.participantId}/recovery`,
        body: { scopeId, expiresInSeconds: 1800 },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
        }),
        issueAccountRecovery,
      }),
    );

    expect(response.status).toBe(200);
    expect(issueAccountRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountId: attempt.participantId,
        scopeId,
        expiresInSeconds: 1800,
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { professionalEmail: "vet@example.invalid", token: "r".repeat(32) },
    });
    expect(JSON.stringify(response.body)).not.toContain("tokenHash");
  });
  it("accepts a recovery link anonymously and creates only a new session cookie", async () => {
    const authenticate = vi.fn(async () => null);
    const acceptAccountRecovery = vi.fn(async () => ({
      accountId: attempt.participantId,
      session: {
        sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        token: "s".repeat(32),
        expiresAt: new Date("2026-08-23T12:30:00.000Z"),
        cookie:
          "__Host-cvg_session=" +
          "s".repeat(32) +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/recovery/accept",
        body: { token: "r".repeat(32), sessionExpiresInSeconds: 3600 },
      },
      dependencies({ authenticate, acceptAccountRecovery }),
    );

    expect(response.status).toBe(200);
    expect(authenticate).not.toHaveBeenCalled();
    expect(acceptAccountRecovery).toHaveBeenCalledWith({
      token: "r".repeat(32),
      sessionExpiresInSeconds: 3600,
      correlationId: "request-123",
    });
    expect(response.headers?.["set-cookie"]).toContain("HttpOnly");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "active" },
    });
    expect(JSON.stringify(response.body)).not.toContain("accountId");
  });
});
