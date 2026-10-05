import { describe, expect, it } from "vitest";

import {
  acceptInvitationRequestSchema,
  createInvitationRequestSchema,
} from "./invitation.js";

const scopeId = "11111111-1111-4111-8111-111111111111";

describe("invitation contracts", () => {
  it("bounds the accepted session to 12 hours while preserving invitation validity", () => {
    expect(
      acceptInvitationRequestSchema.parse({
        token: "a".repeat(32),
        sessionExpiresInSeconds: 43_200,
      }).sessionExpiresInSeconds,
    ).toBe(43_200);
    for (const sessionExpiresInSeconds of [43_201, 604_800]) {
      expect(() =>
        acceptInvitationRequestSchema.parse({
          token: "a".repeat(32),
          sessionExpiresInSeconds,
        }),
      ).toThrow();
    }
    expect(
      createInvitationRequestSchema.parse({
        professionalEmail: "trainee@example.invalid",
        invitedRoles: ["PARTICIPANT"],
        invitedScopes: [scopeId],
        expiresInSeconds: 604_800,
      }).expiresInSeconds,
    ).toBe(604_800);
  });

  it("accepts bounded internal invitation commands", () => {
    expect(
      createInvitationRequestSchema.parse({
        professionalEmail: " trainee@cvg.example ",
        invitedRoles: ["PARTICIPANT"],
        invitedScopes: [scopeId],
        expiresInSeconds: 3600,
      }),
    ).toMatchObject({ professionalEmail: "trainee@cvg.example" });
    expect(
      acceptInvitationRequestSchema.parse({
        token: "a".repeat(32),
        sessionExpiresInSeconds: 3600,
      }),
    ).toEqual({ token: "a".repeat(32), sessionExpiresInSeconds: 3600 });
  });

  it("rejects extra fields, unsafe tokens, and invalid lifetime", () => {
    expect(() =>
      createInvitationRequestSchema.parse({
        professionalEmail: "trainee@cvg.example",
        invitedRoles: ["PARTICIPANT"],
        invitedScopes: [scopeId],
        expiresInSeconds: 30,
        token: "x",
      }),
    ).toThrow();
    expect(() =>
      acceptInvitationRequestSchema.parse({
        token: "short",
        sessionExpiresInSeconds: 3600,
      }),
    ).toThrow();
  });
});
