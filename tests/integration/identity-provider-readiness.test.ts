import { describe, expect, it, vi } from "vitest";

import {
  assertIdentityProviderSecurityStatus,
  probeIdentityProviderReadiness,
} from "../../scripts/verify-identity-provider-readiness.mjs";

const bearerValue = "fixture-bearer";

describe("identity provider production readiness contract", () => {
  it("accepts only an external provider with available recovery and enabled MFA", () => {
    expect(
      assertIdentityProviderSecurityStatus({
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "AVAILABLE",
        mfa: "ENABLED",
      }),
    ).toEqual({
      provider: "EXTERNAL_IDENTITY_PROVIDER",
      recovery: "AVAILABLE",
      mfa: "ENABLED",
    });
  });

  it("rejects a provider that is not ready for recovery or MFA", () => {
    for (const payload of [
      { provider: "NOT_CONFIGURED", recovery: "AVAILABLE", mfa: "ENABLED" },
      {
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "UNAVAILABLE",
        mfa: "ENABLED",
      },
      {
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "AVAILABLE",
        mfa: "NOT_ENABLED",
      },
    ]) {
      expect(() => assertIdentityProviderSecurityStatus(payload)).toThrow(
        "not ready",
      );
    }
  });

  it("probes an HTTPS provider with an encoded principal and never returns the token", async () => {
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      expect(input).toBe(
        "https://identity.example/v1/accounts/probe%2Faccount/security",
      );
      expect(init).toMatchObject({
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${bearerValue}`,
        },
      });
      return new Response(
        JSON.stringify({
          provider: "EXTERNAL_IDENTITY_PROVIDER",
          recovery: "AVAILABLE",
          mfa: "ENABLED",
        }),
        { status: 200 },
      );
    });

    const result = await probeIdentityProviderReadiness(
      {
        IDENTITY_PROVIDER_URL: "https://identity.example/",
        IDENTITY_PROVIDER_TOKEN: bearerValue,
        CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL: "probe/account",
        CVG_VERIFY_IDENTITY_PROVIDER: "true",
      },
      fetchImpl,
    );

    expect(result).toMatchObject({
      status: "PASS",
      provider: "EXTERNAL_IDENTITY_PROVIDER",
      recovery: "AVAILABLE",
      mfa: "ENABLED",
    });
    expect(JSON.stringify(result)).not.toContain(bearerValue);
  });

  it("fails closed for missing configuration, HTTP providers, bad responses and provider failures", async () => {
    await expect(
      probeIdentityProviderReadiness({ CVG_VERIFY_IDENTITY_PROVIDER: "true" }),
    ).rejects.toThrow("IDENTITY_PROVIDER_URL");
    await expect(
      probeIdentityProviderReadiness({
        IDENTITY_PROVIDER_URL: "http://identity.example",
        IDENTITY_PROVIDER_TOKEN: bearerValue,
        CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL: "probe-account",
        CVG_VERIFY_IDENTITY_PROVIDER: "true",
      }),
    ).rejects.toThrow("HTTPS");
    await expect(
      probeIdentityProviderReadiness({
        IDENTITY_PROVIDER_URL: [
          "https://",
          "user:password@identity.example",
        ].join(""),
        IDENTITY_PROVIDER_TOKEN: bearerValue,
        CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL: "probe-account",
        CVG_VERIFY_IDENTITY_PROVIDER: "true",
      }),
    ).rejects.toThrow("HTTPS");

    await expect(
      probeIdentityProviderReadiness(
        {
          IDENTITY_PROVIDER_URL: "https://identity.example",
          IDENTITY_PROVIDER_TOKEN: bearerValue,
          CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL: "probe-account",
          CVG_VERIFY_IDENTITY_PROVIDER: "true",
        },
        async () => new Response("invalid", { status: 200 }),
      ),
    ).rejects.toThrow("not ready");

    await expect(
      probeIdentityProviderReadiness(
        {
          IDENTITY_PROVIDER_URL: "https://identity.example",
          IDENTITY_PROVIDER_TOKEN: bearerValue,
          CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL: "probe-account",
          CVG_VERIFY_IDENTITY_PROVIDER: "true",
        },
        async () =>
          new Response(JSON.stringify({ error: "secret" }), { status: 503 }),
      ),
    ).rejects.toThrow("request failed");
  });

  it("does not call the provider when the readiness gate is not requested", async () => {
    const fetchImpl = vi.fn();

    await expect(
      probeIdentityProviderReadiness({}, fetchImpl),
    ).resolves.toEqual({
      status: "NOT_EXECUTED",
      reason:
        "set CVG_VERIFY_IDENTITY_PROVIDER=true in the approved environment",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
