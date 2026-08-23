import { describe, expect, it } from "vitest";

import {
  accountRecoveryAcceptRequestSchema,
  accountRecoveryIssueProjectionSchema,
  accountRecoveryIssueRequestSchema,
} from "./account-recovery.js";

describe("account recovery contracts", () => {
  it("accepts only a bounded, scoped issue request", () => {
    const parsed = accountRecoveryIssueRequestSchema.parse({
      scopeId: "22222222-2222-4222-8222-222222222222",
      expiresInSeconds: 1800,
    });
    expect(parsed.expiresInSeconds).toBe(1800);
    expect(() =>
      accountRecoveryIssueRequestSchema.parse({
        scopeId: "22222222-2222-4222-8222-222222222222",
        expiresInSeconds: 1801,
      }),
    ).toThrow();
    expect(() =>
      accountRecoveryIssueRequestSchema.parse({
        scopeId: "22222222-2222-4222-8222-222222222222",
        expiresInSeconds: 1800,
        token: "secret",
      }),
    ).toThrow();
  });

  it("keeps the acceptance token bounded and the projection redacted", () => {
    expect(
      accountRecoveryAcceptRequestSchema.parse({
        token: "a".repeat(32),
      }).sessionExpiresInSeconds,
    ).toBe(3600);
    expect(() =>
      accountRecoveryAcceptRequestSchema.parse({ token: "short" }),
    ).toThrow();
    const projection = accountRecoveryIssueProjectionSchema.parse({
      professionalEmail: "vet@example.invalid",
      token: "a".repeat(32),
      expiresAt: "2026-08-23T12:30:00.000Z",
      revokedSessions: 2,
    });
    expect(projection).not.toHaveProperty("tokenHash");
    expect(() =>
      accountRecoveryIssueProjectionSchema.parse({
        ...projection,
        tokenHash: "a".repeat(64),
      }),
    ).toThrow();
  });
});
