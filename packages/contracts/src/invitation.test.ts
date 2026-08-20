import { describe, expect, it } from "vitest";

import {
  acceptInvitationRequestSchema,
  createInvitationRequestSchema,
} from "./invitation.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const invitationCredential = ["Acesso", "CVG", "2026!Seguro"].join("-");

describe("invitation contracts", () => {
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
        password: invitationCredential,
        sessionExpiresInSeconds: 3600,
      }),
    ).toEqual({
      token: "a".repeat(32),
      password: invitationCredential,
      sessionExpiresInSeconds: 3600,
    });
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
        password: invitationCredential,
        sessionExpiresInSeconds: 3600,
      }),
    ).toThrow();
    expect(
      acceptInvitationRequestSchema.safeParse({
        token: "a".repeat(32),
        sessionExpiresInSeconds: 3600,
      }).success,
    ).toBe(false);
  });
});
