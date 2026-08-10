import { resolve } from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
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
