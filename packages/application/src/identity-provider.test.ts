import { describe, expect, it, vi } from "vitest";

import {
  createHttpIdentityProvider,
  createUnavailableIdentityProvider,
} from "./identity-provider.js";

const testBearer = "synthetic-credential";

describe("identity provider boundary", () => {
  it("does not pretend recovery or MFA exists without a configured provider", async () => {
    const provider = createUnavailableIdentityProvider();

    await expect(provider.getSecurityStatus("account-1")).resolves.toEqual({
      provider: "NOT_CONFIGURED",
      recovery: "UNAVAILABLE",
      mfa: "UNAVAILABLE",
    });
    await expect(provider.beginRecovery("account-1")).rejects.toMatchObject({
      code: "state_conflict",
    });
    await expect(
      provider.beginMfaEnrollment("account-1"),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("validates principal ids on every unavailable operation", async () => {
    const provider = createUnavailableIdentityProvider();

    await expect(provider.getSecurityStatus(" ")).rejects.toMatchObject({
      code: "validation_error",
    });
    await expect(provider.beginRecovery(" ")).rejects.toMatchObject({
      code: "validation_error",
    });
    await expect(provider.beginMfaEnrollment(" ")).rejects.toMatchObject({
      code: "validation_error",
    });
  });

  it("calls the configured provider with redacted, method-specific requests", async () => {
    const responses = [
      new Response(
        JSON.stringify({
          provider: "EXTERNAL_IDENTITY_PROVIDER",
          recovery: "AVAILABLE",
          mfa: "ENABLED",
        }),
        { status: 200 },
      ),
      new Response(
        JSON.stringify({
          operationId: "recovery-operation",
          expiresAt: "2026-08-10T06:00:00.000Z",
        }),
        { status: 200 },
      ),
      new Response(
        JSON.stringify({
          operationId: "mfa-operation",
          expiresAt: "2026-08-10T06:00:00.000Z",
        }),
        { status: 200 },
      ),
    ];
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      calls.push(init === undefined ? { input } : { input, init });
      return responses.shift()!;
    });
    const provider = createHttpIdentityProvider({
      baseUrl: "https://identity.example/",
      bearerToken: testBearer,
      fetchImpl,
    });

    await expect(provider.getSecurityStatus("acct/1")).resolves.toEqual({
      provider: "EXTERNAL_IDENTITY_PROVIDER",
      recovery: "AVAILABLE",
      mfa: "ENABLED",
    });
    await expect(provider.beginRecovery("acct/1")).resolves.toEqual({
      operationId: "recovery-operation",
      expiresAt: "2026-08-10T06:00:00.000Z",
    });
    await expect(provider.beginMfaEnrollment("acct/1")).resolves.toEqual({
      operationId: "mfa-operation",
      expiresAt: "2026-08-10T06:00:00.000Z",
    });

    expect(calls).toHaveLength(3);
    expect(calls[0]).toMatchObject({
      input: "https://identity.example/v1/accounts/acct%2F1/security",
      init: {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${testBearer}`,
        },
      },
    });
    expect(calls[1]).toMatchObject({
      input: "https://identity.example/v1/accounts/acct%2F1/recovery",
      init: {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      },
    });
    expect(calls[2]?.input).toBe(
      "https://identity.example/v1/accounts/acct%2F1/mfa/enrollment",
    );
  });

  it("rejects invalid provider configuration and malformed successful responses", async () => {
    expect(() =>
      createHttpIdentityProvider({
        baseUrl: "http://identity.example",
        bearerToken: testBearer,
      }),
    ).toThrow("HTTPS");
    expect(() =>
      createHttpIdentityProvider({
        baseUrl: "ftp://identity.example",
        bearerToken: testBearer,
      }),
    ).toThrow("HTTPS");
    expect(() =>
      createHttpIdentityProvider({
        baseUrl: "https://identity.example",
        bearerToken: " ",
      }),
    ).toThrow("token is required");

    const invalidSecurity = createHttpIdentityProvider({
      baseUrl: "https://identity.example",
      bearerToken: testBearer,
      fetchImpl: async () => new Response("not-json", { status: 200 }),
    });
    await expect(
      invalidSecurity.getSecurityStatus("account-1"),
    ).rejects.toMatchObject({ code: "internal_error" });

    const invalidOperation = createHttpIdentityProvider({
      baseUrl: "https://identity.example",
      bearerToken: testBearer,
      fetchImpl: async () =>
        new Response(JSON.stringify({ operationId: "" }), { status: 200 }),
    });
    await expect(
      invalidOperation.beginRecovery("account-1"),
    ).rejects.toMatchObject({ code: "internal_error" });

    for (const payload of [
      { provider: "OTHER", recovery: "AVAILABLE", mfa: "ENABLED" },
      {
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "OTHER",
        mfa: "ENABLED",
      },
      {
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "AVAILABLE",
        mfa: "OTHER",
      },
    ]) {
      const invalid = createHttpIdentityProvider({
        baseUrl: "https://identity.example",
        bearerToken: testBearer,
        fetchImpl: async () =>
          new Response(JSON.stringify(payload), { status: 200 }),
      });
      await expect(
        invalid.getSecurityStatus("account-1"),
      ).rejects.toMatchObject({ code: "internal_error" });
    }

    const invalidOperationShape = createHttpIdentityProvider({
      baseUrl: "https://identity.example",
      bearerToken: testBearer,
      fetchImpl: async () => new Response(JSON.stringify([]), { status: 200 }),
    });
    await expect(
      invalidOperationShape.beginRecovery("account-1"),
    ).rejects.toMatchObject({ code: "internal_error" });
  });

  it("maps provider failures without exposing their response body", async () => {
    const conflict = createHttpIdentityProvider({
      baseUrl: "https://identity.example",
      bearerToken: testBearer,
      fetchImpl: async () =>
        new Response(JSON.stringify({ response: "must-not-leak" }), {
          status: 409,
        }),
    });
    await expect(conflict.beginRecovery("account-1")).rejects.toMatchObject({
      code: "state_conflict",
    });

    const failure = createHttpIdentityProvider({
      baseUrl: "https://identity.example",
      bearerToken: testBearer,
      fetchImpl: async () => new Response("not-json", { status: 503 }),
    });
    await expect(failure.beginMfaEnrollment("account-1")).rejects.toMatchObject(
      { code: "internal_error" },
    );
  });

  it("uses the platform fetch when no custom transport is supplied", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            provider: "EXTERNAL_IDENTITY_PROVIDER",
            recovery: "UNAVAILABLE",
            mfa: "NOT_ENABLED",
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const provider = createHttpIdentityProvider({
        baseUrl: "https://identity.example",
        bearerToken: testBearer,
      });
      await expect(provider.getSecurityStatus("account-1")).resolves.toEqual({
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "UNAVAILABLE",
        mfa: "NOT_ENABLED",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
