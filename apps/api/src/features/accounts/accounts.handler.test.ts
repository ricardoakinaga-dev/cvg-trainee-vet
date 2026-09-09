import { describe, expect, it, vi } from "vitest";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleAcceptAccountRecovery,
  handleAccountStatusChange,
  handleIssueAccountRecovery,
} from "./accounts.handler.js";

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
  return { method: "PATCH", path: "/api/v1/internal/accounts", body };
}

describe("accounts feature handlers", () => {
  it("branch=validation/risk=malformed-input: status change with invalid account id (422)", async () => {
    const changeAccountStatus = vi.fn();
    const response = await handleAccountStatusChange(
      request({
        scopeId: SCOPE,
        status: "SUSPENDED",
        expectedStatus: "ACTIVE",
      }),
      "not-an-id",
      "request-1",
      staff,
      baseDependencies({ changeAccountStatus }),
    );
    expect(response.status).toBe(422);
    expect(changeAccountStatus).not.toHaveBeenCalled();
  });

  it("branch=forbidden/risk=privilege-escalation: status change denied to participant (403)", async () => {
    const changeAccountStatus = vi.fn();
    const participant: ApiPrincipal = {
      ...staff,
      principalId: "99999999-9999-4999-8999-999999999999",
      roles: ["PARTICIPANT"],
    };
    const response = await handleAccountStatusChange(
      request({
        scopeId: SCOPE,
        status: "SUSPENDED",
        expectedStatus: "ACTIVE",
      }),
      ACCOUNT_ID,
      "request-1",
      participant,
      baseDependencies({ changeAccountStatus }),
    );
    expect(response.status).toBe(403);
    expect(changeAccountStatus).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: recovery issue with invalid body (422)", async () => {
    const issueAccountRecovery = vi.fn();
    const response = await handleIssueAccountRecovery(
      request({ scopeId: SCOPE }),
      ACCOUNT_ID,
      "request-1",
      staff,
      baseDependencies({ issueAccountRecovery }),
    );
    expect(response.status).toBe(422);
    expect(issueAccountRecovery).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=token-probing: recovery accept with malformed token (404)", async () => {
    const acceptAccountRecovery = vi.fn();
    const response = await handleAcceptAccountRecovery(
      request({ token: "short" }),
      "request-1",
      baseDependencies({ acceptAccountRecovery }),
    );
    expect(response.status).toBe(404);
    expect(acceptAccountRecovery).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: accepts recovery and sets the session cookie (200)", async () => {
    const cookie = `__Host-cvg_session=${"s".repeat(32)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;
    const acceptAccountRecovery = vi.fn(async () => ({
      accountId: ACCOUNT_ID,
      session: {
        sessionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        token: "s".repeat(32),
        expiresAt: new Date("2026-09-19T00:00:00.000Z"),
        cookie,
      },
    }));
    const response = await handleAcceptAccountRecovery(
      request({ token: TOKEN }),
      "request-1",
      baseDependencies({ acceptAccountRecovery }),
    );
    expect(response.status).toBe(200);
    expect(response.headers?.["set-cookie"]).toBe(cookie);
  });
});
