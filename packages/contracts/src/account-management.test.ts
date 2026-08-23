import { describe, expect, it } from "vitest";

import {
  accountStatusChangeProjectionSchema,
  accountStatusChangeRequestSchema,
  resendAccountInvitationRequestSchema,
  resentAccountInvitationProjectionSchema,
} from "./account-management.js";

const scopeId = "11111111-1111-4111-8111-111111111111";

describe("account management contracts", () => {
  it("accepts scoped status transitions and redacted outcomes", () => {
    expect(
      accountStatusChangeRequestSchema.parse({
        scopeId,
        status: "SUSPENDED",
        expectedStatus: "ACTIVE",
      }),
    ).toEqual({ scopeId, status: "SUSPENDED", expectedStatus: "ACTIVE" });
    expect(
      accountStatusChangeProjectionSchema.parse({
        status: "DEACTIVATED",
        revokedSessions: 2,
      }),
    ).toEqual({ status: "DEACTIVATED", revokedSessions: 2 });
  });

  it("accepts a bounded resend request and one-time token projection", () => {
    expect(
      resendAccountInvitationRequestSchema.parse({
        scopeId,
        expiresInSeconds: 3600,
      }),
    ).toEqual({ scopeId, expiresInSeconds: 3600 });
    expect(
      resentAccountInvitationProjectionSchema.parse({
        professionalEmail: "vet@example.invalid",
        token: "a".repeat(32),
        expiresAt: "2026-08-23T18:00:00.000Z",
      }),
    ).toMatchObject({ professionalEmail: "vet@example.invalid" });
  });

  it("rejects missing scope, unsupported state, token leaks and extra fields", () => {
    expect(() =>
      accountStatusChangeRequestSchema.parse({ status: "ACTIVE" }),
    ).toThrow();
    expect(() =>
      accountStatusChangeRequestSchema.parse({ scopeId, status: "INVITED" }),
    ).toThrow();
    expect(() =>
      accountStatusChangeRequestSchema.parse({
        scopeId,
        status: "ACTIVE",
        expectedStatus: "ACTIVE",
        accountId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toThrow();
    expect(() =>
      resentAccountInvitationProjectionSchema.parse({
        professionalEmail: "vet@example.invalid",
        token: "short",
        expiresAt: "2026-08-23T18:00:00.000Z",
      }),
    ).toThrow();
  });
});
