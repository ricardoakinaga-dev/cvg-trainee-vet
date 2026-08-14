import { resolve } from "node:path";

import type { NextConfig } from "next";

type WebBuildEnvironment = Readonly<{
  readonly NODE_ENV?: string;
  readonly CVG_API_INTERNAL_URL?: string;
}>;

export function resolveApiInternalUrl(
  environment: WebBuildEnvironment = process.env,
): string | undefined {
  const rawValue = environment.CVG_API_INTERNAL_URL?.trim();
  const value = rawValue?.replace(/\/+$/u, "");
  if (value === undefined || value.length === 0) {
    if (environment.NODE_ENV === "production") {
      throw new Error(
        "CVG_API_INTERNAL_URL is required for production web builds",
      );
    }
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("CVG_API_INTERNAL_URL must be an absolute HTTP(S) URL");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throw new Error("CVG_API_INTERNAL_URL must be an absolute HTTP(S) URL");
  }
  return value;
}

const nextConfig: NextConfig = {
  distDir: process.env.CVG_WEB_DIST_DIR ?? ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    useTypeScriptCli: false,
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      },
    ];
    if (process.env.CVG_PUBLIC_HTTPS === "true") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  turbopack: {
    root: resolve(process.cwd(), "../.."),
  },
  async rewrites() {
    const apiInternalUrl = resolveApiInternalUrl();
    if (apiInternalUrl === undefined || apiInternalUrl.length === 0) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiInternalUrl}/api/v1/:path*`,
      },
      {
        source: "/health/:path*",
        destination: `${apiInternalUrl}/health/:path*`,
      },
    ];
  },
};

export default nextConfig;
