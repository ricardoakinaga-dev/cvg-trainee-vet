import { describe, expect, it } from "vitest";

import { buildSecurityHeaders } from "./security-headers.js";

describe("security headers", () => {
  it("emits the hardened baseline without secrets or HSTS outside production", () => {
    const headers = buildSecurityHeaders({ environment: "test" });
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("same-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["strict-transport-security"]).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("secret");
  });

  it("emits HSTS only when production HTTPS is guaranteed", () => {
    const production = buildSecurityHeaders({ environment: "production" });
    expect(production["strict-transport-security"]).toContain("max-age=");
    expect(production["strict-transport-security"]).toContain(
      "includeSubDomains",
    );
  });

  it("binds script execution to a per-request nonce when provided", () => {
    const headers = buildSecurityHeaders({
      environment: "production",
      cspNonce: "abc123DEF456ghi7",
    });
    expect(headers["content-security-policy"]).toContain(
      "'nonce-abc123DEF456ghi7'",
    );
  });

  it("rejects unsafe nonces fail-closed", () => {
    expect(() =>
      buildSecurityHeaders({
        environment: "production",
        cspNonce: '"><script',
      }),
    ).toThrow("nonce");
  });
});
