import { describe, expect, it, vi } from "vitest";

import { handleApiRequest } from "../http.js";
import { dependencies } from "./fixtures.js";

const routes = [
  "/api/v1/session/rotate",
  "/api/v1/invitations/accept",
  "/api/v1/recovery/accept",
] as const;
const token = "c".repeat(32);
const session = {
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  token: "d".repeat(32),
  expiresAt: new Date("2026-10-04T00:00:00.000Z"),
  cookie:
    "__Host-cvg_session=" +
    "d".repeat(32) +
    "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200",
};

describe("approved public session lifetime boundary", () => {
  it.each(routes)(
    "accepts the inclusive 12-hour limit through %s",
    async (path) => {
      const rotateSession = vi.fn(async () => session);
      const acceptInvitation = vi.fn(async () => ({
        accountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        session,
      }));
      const acceptAccountRecovery = vi.fn(async () => ({
        accountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        session,
      }));
      const response = await handleApiRequest(
        {
          method: "POST",
          path,
          body: {
            sessionExpiresInSeconds: 43_200,
            ...(path === routes[0] ? {} : { token }),
          },
          headers: { cookie: "__Host-cvg_session=" + token },
        },
        dependencies({
          rotateSession,
          acceptInvitation,
          acceptAccountRecovery,
        }),
      );
      expect(response.status).toBe(200);
      expect(response.headers?.["set-cookie"]).toContain("Max-Age=43200");
      if (path === routes[0])
        expect(rotateSession).toHaveBeenCalledWith(
          "__Host-cvg_session=" + token,
          43_200,
        );
      else if (path === routes[1])
        expect(acceptInvitation).toHaveBeenCalledWith(
          expect.objectContaining({ sessionExpiresInSeconds: 43_200 }),
        );
      else
        expect(acceptAccountRecovery).toHaveBeenCalledWith(
          expect.objectContaining({ sessionExpiresInSeconds: 43_200 }),
        );
      expect(JSON.stringify(response.body)).not.toMatch(
        /sessionId|expiresAt|token|createdAt|lastSeenAt|sessionLifetime/u,
      );
    },
  );

  it.each(routes)(
    "rejects one second beyond 12 hours before any session write through %s",
    async (path) => {
      const rotateSession = vi.fn(async () => session);
      const acceptInvitation = vi.fn(async () => ({
        accountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        session,
      }));
      const acceptAccountRecovery = vi.fn(async () => ({
        accountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        session,
      }));
      const response = await handleApiRequest(
        {
          method: "POST",
          path,
          body: {
            sessionExpiresInSeconds: 43_201,
            ...(path === routes[0] ? {} : { token }),
          },
          headers: { cookie: "__Host-cvg_session=" + token },
        },
        dependencies({
          rotateSession,
          acceptInvitation,
          acceptAccountRecovery,
        }),
      );
      expect(response.status).toBe(path === routes[0] ? 422 : 404);
      expect(response.body).toMatchObject({
        success: false,
        error: { code: path === routes[0] ? "validation_error" : "not_found" },
      });
      expect(rotateSession).not.toHaveBeenCalled();
      expect(acceptInvitation).not.toHaveBeenCalled();
      expect(acceptAccountRecovery).not.toHaveBeenCalled();
      expect(response.headers?.["set-cookie"]).toBeUndefined();
    },
  );
});
