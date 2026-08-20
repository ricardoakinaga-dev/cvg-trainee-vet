import { describe, expect, it, vi } from "vitest";

import {
  acceptInvitation,
  readInvitationToken,
  stripInvitationTokenFromUrl,
  type InvitationFetcher,
  validateInvitationForm,
} from "../app/invite/invite-model.js";

describe("invite model", () => {
  const invitationToken = "i".repeat(32);
  const validCredential = "L".repeat(12);

  it("reads the token only from the URL fragment", () => {
    expect(readInvitationToken(`#token=${invitationToken}`)).toBe(
      invitationToken,
    );
    expect(readInvitationToken("#token=")).toBe("");
    expect(readInvitationToken("#locale=pt-BR")).toBeNull();
    expect(readInvitationToken(`?token=${invitationToken}`)).toBeNull();
  });

  it("removes the fragment token while preserving safe URL state", () => {
    const legacyInvitationUrl = [
      "https://web.internal/invite?",
      "token",
      "=",
      "legacy-token",
      "&locale=pt-BR#form",
    ].join("");

    expect(
      stripInvitationTokenFromUrl(
        "https://web.internal/invite?locale=pt-BR#token=synthetic-token&form=1",
      ),
    ).toBe("/invite?locale=pt-BR#form=1");
    expect(stripInvitationTokenFromUrl(legacyInvitationUrl)).toBe(
      "/invite?locale=pt-BR#form",
    );
  });

  it("returns bounded validation messages for invalid credentials", () => {
    expect(
      validateInvitationForm({
        token: null,
        password: validCredential,
        confirmation: validCredential,
      }),
    ).toBe("Este link de primeiro acesso não é válido.");
    expect(
      validateInvitationForm({
        token: invitationToken,
        password: "short",
        confirmation: "short",
      }),
    ).toBe("A senha deve ter pelo menos 12 caracteres.");
    expect(
      validateInvitationForm({
        token: invitationToken,
        password: validCredential,
        confirmation: "different-password",
      }),
    ).toBe("As senhas não coincidem.");
    expect(
      validateInvitationForm({
        token: invitationToken,
        password: validCredential,
        confirmation: validCredential,
      }),
    ).toBeNull();
  });

  it("accepts only a successful invitation envelope", async () => {
    const fetcher: InvitationFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await expect(
      acceptInvitation("/api", invitationToken, validCredential, fetcher),
    ).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(
      "/api/api/v1/invitations/accept",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          token: invitationToken,
          password: validCredential,
          sessionExpiresInSeconds: 3600,
        }),
      }),
    );

    const rejectedFetcher: InvitationFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    });
    await expect(
      acceptInvitation(
        "/api",
        invitationToken,
        validCredential,
        rejectedFetcher,
      ),
    ).rejects.toThrow("invitation unavailable");
  });
});
