import { describe, expect, it } from "vitest";

import nextConfig, { resolveApiInternalUrl } from "../next.config.js";

describe("web build proxy contract", () => {
  it("uses the TypeScript compiler API during production builds", () => {
    expect(nextConfig.experimental?.useTypeScriptCli).toBe(false);
  });

  it("requires the API internal URL for production builds", () => {
    expect(() => resolveApiInternalUrl({ NODE_ENV: "production" })).toThrow(
      "CVG_API_INTERNAL_URL",
    );
  });

  it("accepts an absolute HTTP(S) API URL and removes trailing slashes", () => {
    expect(
      resolveApiInternalUrl({
        NODE_ENV: "production",
        CVG_API_INTERNAL_URL: "http://127.0.0.1:3182///",
      }),
    ).toBe("http://127.0.0.1:3182");
  });

  it("keeps development builds compatible with an intentionally disabled proxy", () => {
    expect(resolveApiInternalUrl({ NODE_ENV: "development" })).toBeUndefined();
  });

  it("rejects non-HTTP API URLs", () => {
    expect(() =>
      resolveApiInternalUrl({
        NODE_ENV: "production",
        CVG_API_INTERNAL_URL: "postgresql://db:5432/cvg",
      }),
    ).toThrow("HTTP(S)");
  });
});
