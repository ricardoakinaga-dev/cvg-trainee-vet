export type SecurityHeadersEnvironment =
  "production" | "staging" | "test" | "development";

export type SecurityHeadersOptions = Readonly<{
  readonly environment: SecurityHeadersEnvironment;
  readonly cspNonce?: string;
}>;

export type SecurityHeaders = Readonly<Record<string, string>>;

const NONCE_PATTERN = /^[a-zA-Z0-9+/=_-]{16,128}$/;

function assertNonce(value: string | undefined): string | null {
  if (value === undefined) return null;
  if (!NONCE_PATTERN.test(value)) {
    throw new RangeError(
      "nonce must be 16-128 chars of base64url-safe material",
    );
  }
  return value;
}

export function buildSecurityHeaders(
  options: SecurityHeadersOptions,
): SecurityHeaders {
  const nonce = assertNonce(options.cspNonce);
  const scriptSrc =
    nonce === null ? "script-src 'self'" : `script-src 'self' 'nonce-${nonce}'`;
  const contentSecurityPolicy = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  return Object.freeze({
    "content-security-policy": contentSecurityPolicy,
    "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "x-frame-options": "DENY",
    ...(options.environment === "production"
      ? {
          "strict-transport-security":
            "max-age=31536000; includeSubDomains; preload",
        }
      : {}),
  });
}
