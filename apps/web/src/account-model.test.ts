import { describe, expect, it } from "vitest";

import { isOperation, isSecurity } from "../app/account-model.js";

describe("account web contracts", () => {
  it("accepts the bounded security projection and rejects unknown values", () => {
    expect(
      isSecurity({
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "AVAILABLE",
        mfa: "NOT_ENABLED",
        session: "ACTIVE",
      }),
    ).toBe(true);
    expect(
      isSecurity({
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "AVAILABLE",
        mfa: "NOT_ENABLED",
        session: "ACTIVE",
        internalToken: "secret",
      }),
    ).toBe(false);
  });

  it("requires an ISO expiration for identity-provider operations", () => {
    expect(
      isOperation({
        operationId: "recovery-1",
        expiresAt: "2026-08-16T12:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isOperation({ operationId: "recovery-1", expiresAt: "not-a-date" }),
    ).toBe(false);
  });
});
