import { resolve } from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
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
    const apiInternalUrl = process.env.CVG_API_INTERNAL_URL?.replace(
      /\/+$/u,
      "",
    );
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
