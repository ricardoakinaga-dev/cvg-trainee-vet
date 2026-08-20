import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { resolveBrowserLaunchOptions } from "../../playwright.config";
import { buildE2eEnvironment } from "../../scripts/build-e2e.mjs";

describe("disposable E2E build environment", () => {
  it("provides a local API target for the canonical mocked E2E command", () => {
    expect(buildE2eEnvironment({ NODE_ENV: "test" })).toMatchObject({
      CVG_API_INTERNAL_URL: "http://127.0.0.1:3101",
      CVG_WEB_DIST_DIR: ".next",
    });
  });

  it("keeps real and active HA build artifacts isolated", () => {
    expect(buildE2eEnvironment({ CVG_RUN_REAL_E2E: "true" })).toMatchObject({
      CVG_API_INTERNAL_URL: "http://127.0.0.1:3101",
      CVG_WEB_DIST_DIR: ".next-e2e-real",
    });
    expect(
      buildE2eEnvironment({ CVG_RUN_ACTIVE_HA_E2E: "true" }),
    ).toMatchObject({
      CVG_API_INTERNAL_URL: "http://127.0.0.1:3182",
      CVG_WEB_DIST_DIR: ".next-e2e-active",
    });
  });

  it("honors explicitly supplied build targets", () => {
    expect(
      buildE2eEnvironment({
        CVG_API_INTERNAL_URL: "http://127.0.0.1:9999",
        CVG_WEB_DIST_DIR: ".next-custom",
      }),
    ).toMatchObject({
      CVG_API_INTERNAL_URL: "http://127.0.0.1:9999",
      CVG_WEB_DIST_DIR: ".next-custom",
    });
  });

  it("allows browser E2E to use an isolated loopback web port", async () => {
    const playwrightConfig = await readFile("playwright.config.ts", "utf8");
    expect(playwrightConfig).toContain("CVG_E2E_WEB_PORT");
    expect(playwrightConfig).toContain("--port ${e2eWebPort}");
  });

  it("includes the Next production surface in coverage and declares the full browser matrix", async () => {
    const [vitestConfig, playwrightConfig] = await Promise.all([
      readFile("vitest.config.ts", "utf8"),
      readFile("playwright.config.ts", "utf8"),
    ]);

    expect(vitestConfig).toContain("apps/web/app/**/*.{ts,tsx}");
    expect(playwrightConfig).toContain("CVG_E2E_BROWSERS");
    expect(playwrightConfig).toContain('name: "firefox"');
    expect(playwrightConfig).toContain('name: "webkit"');
    expect(playwrightConfig).toContain('name: "mobile-chromium"');
  });

  it("does not pass Chromium-only launch flags to Firefox or WebKit", () => {
    expect(resolveBrowserLaunchOptions("chromium")?.args).toEqual([
      "--headless=new",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ]);
    expect(resolveBrowserLaunchOptions("mobile-chromium")?.args).toEqual([
      "--headless=new",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ]);
    expect(resolveBrowserLaunchOptions("firefox")).toBeUndefined();
    expect(resolveBrowserLaunchOptions("webkit")).toBeUndefined();
  });

  it("keeps local TLS certificate bypass explicit and opt-in", async () => {
    const playwrightConfig = await readFile("playwright.config.ts", "utf8");
    expect(playwrightConfig).toContain("CVG_E2E_IGNORE_HTTPS_ERRORS");
  });
});
