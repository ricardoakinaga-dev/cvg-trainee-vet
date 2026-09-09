import { describe, expect, it, vi } from "vitest";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleAcceptInvitation,
  handleCreateInvitation,
  handleResendAccountInvitation,
} from "./invitations.handler.js";

const SCOPE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STAFF_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TOKEN = "d".repeat(32);

const staff: ApiPrincipal = {
  principalId: STAFF_ID,
  accountStatus: "ACTIVE",
  roles: ["ADMIN"],
  scopes: [SCOPE],
};

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    ...overrides,
  } as ApiHttpDependencies;
}

function request(body: unknown): ApiHttpRequest {
  return { method: "POST", path: "/api/v1/internal/invitations", body };
}

describe("invitations feature handlers", () => {
  it("branch=validation/risk=malformed-input: create with invalid body (422)", async () => {
    const createInvitation = vi.fn();
    const response = await handleCreateInvitation(
      request({ professionalEmail: "not-an-email" }),
      "request-1",
      staff,
      baseDependencies({ createInvitation }),
    );
    expect(response.status).toBe(422);
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: creates an invitation (201)", async () => {
    const created = {
      invitationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      accountId: ACCOUNT_ID,
      professionalEmail: "vet@example.com",
      token: TOKEN,
      expiresAt: new Date("2026-09-19T00:00:00.000Z"),
    };
    const createInvitation = vi.fn(async () => created);
    const response = await handleCreateInvitation(
      request({
        professionalEmail: "vet@example.com",
        invitedRoles: ["PARTICIPANT"],
        invitedScopes: [SCOPE],
        expiresInSeconds: 3600,
      }),
      "request-1",
      staff,
      baseDependencies({ createInvitation }),
    );
    expect(response.status).toBe(201);
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        principalId: STAFF_ID,
        professionalEmail: "vet@example.com",
      }),
    );
  });

  it("branch=validation/risk=token-probing: accept with malformed token (404)", async () => {
    const acceptInvitation = vi.fn();
    const response = await handleAcceptInvitation(
      request({ token: "short", sessionExpiresInSeconds: 3600 }),
      "request-1",
      baseDependencies({ acceptInvitation }),
    );
    expect(response.status).toBe(404);
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: accepts an invitation and sets the session cookie (200)", async () => {
    const cookie = `__Host-cvg_session=${"s".repeat(32)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;
    const acceptInvitation = vi.fn(async () => ({
      accountId: ACCOUNT_ID,
      session: {
        sessionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        token: "s".repeat(32),
        expiresAt: new Date("2026-09-19T00:00:00.000Z"),
        cookie,
      },
    }));
    const response = await handleAcceptInvitation(
      request({ token: TOKEN, sessionExpiresInSeconds: 3600 }),
      "request-1",
      baseDependencies({ acceptInvitation }),
    );
    expect(response.status).toBe(200);
    expect(response.headers?.["set-cookie"]).toBe(cookie);
  });

  it("branch=validation/risk=malformed-input: resend with invalid account id (422)", async () => {
    const resendAccountInvitation = vi.fn();
    const response = await handleResendAccountInvitation(
      request({ scopeId: SCOPE, expiresInSeconds: 3600 }),
      "not-an-id",
      "request-1",
      staff,
      baseDependencies({ resendAccountInvitation }),
    );
    expect(response.status).toBe(422);
    expect(resendAccountInvitation).not.toHaveBeenCalled();
  });

  it("branch=forbidden/risk=privilege-escalation: resend denied to participant (403)", async () => {
    const resendAccountInvitation = vi.fn();
    const participant: ApiPrincipal = {
      ...staff,
      principalId: "99999999-9999-4999-8999-999999999999",
      roles: ["PARTICIPANT"],
    };
    const response = await handleResendAccountInvitation(
      request({ scopeId: SCOPE, expiresInSeconds: 3600 }),
      ACCOUNT_ID,
      "request-1",
      participant,
      baseDependencies({ resendAccountInvitation }),
    );
    expect(response.status).toBe(403);
    expect(resendAccountInvitation).not.toHaveBeenCalled();
  });
});
