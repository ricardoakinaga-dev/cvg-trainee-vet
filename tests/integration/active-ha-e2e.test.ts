import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  ACTIVE_HA_FIXTURE_SERVICE,
  buildActiveHaComposeArgs,
  buildActiveHaFixtureUrl,
  buildActiveHaPlaywrightArgs,
  buildActiveHaPlaywrightEnvironment,
  buildActiveHaReadinessUrl,
  resolveActiveHaBrowsers,
} from "../../scripts/active-ha-e2e.mjs";

describe("active HA E2E orchestration", () => {
  it("normalizes the requested browser matrix for isolated fixture runs", () => {
    expect(
      resolveActiveHaBrowsers({
        CVG_E2E_BROWSERS: "firefox,chromium,firefox",
      }),
    ).toEqual(["firefox", "chromium"]);
    expect(resolveActiveHaBrowsers({})).toEqual(["chromium"]);
    expect(() =>
      resolveActiveHaBrowsers({ CVG_E2E_BROWSERS: "chromium,unknown" }),
    ).toThrow("CVG_E2E_BROWSERS contains unsupported projects: unknown");
  });

  it("runs one Playwright project per fresh fixture lifecycle", () => {
    expect(buildActiveHaPlaywrightArgs("firefox")).toEqual([
      "exec",
      "playwright",
      "test",
      "tests/e2e/real-runtime.spec.ts",
      "--project=firefox",
    ]);
  });

  it("starts only the isolated fixture service through the HA compose project", () => {
    const args = buildActiveHaComposeArgs({
      composeFile: "/workspace/infra/production/docker-compose.ha.yml",
      envFile: "/workspace/infra/production/.env.local",
      projectName: "cvg-trainee-vet-ha",
    });

    expect(args).toEqual([
      "compose",
      "--project-name",
      "cvg-trainee-vet-ha",
      "--env-file",
      "/workspace/infra/production/.env.local",
      "--file",
      "/workspace/infra/production/docker-compose.ha.yml",
      "--profile",
      "e2e",
      "up",
      "--detach",
      "--no-deps",
      ACTIVE_HA_FIXTURE_SERVICE,
    ]);
  });

  it("keeps active HA browser execution separate from disposable real E2E", () => {
    const environment = buildActiveHaPlaywrightEnvironment({
      baseUrl: "http://127.0.0.1:3100",
      fixtureFile: "/tmp/cvg-active-ha-fixture.json",
      inherited: { PATH: "/usr/bin", CVG_RUN_REAL_E2E: "false" },
    });

    expect(environment).toMatchObject({
      BASE_URL: "http://127.0.0.1:3100",
      CVG_REAL_E2E_FIXTURE_FILE: "/tmp/cvg-active-ha-fixture.json",
      CVG_RUN_ACTIVE_HA_E2E: "true",
    });
    expect(environment.CVG_RUN_REAL_E2E).toBeUndefined();
  });

  it("rejects non-local browser targets by default", () => {
    expect(() =>
      buildActiveHaPlaywrightEnvironment({
        baseUrl: "https://example.invalid",
        fixtureFile: "/tmp/cvg-active-ha-fixture.json",
        inherited: {},
      }),
    ).toThrow("active HA E2E base URL must be local");
  });

  it("waits for active web dependency health before browser tests", async () => {
    expect(buildActiveHaReadinessUrl("http://127.0.0.1:3100")).toBe(
      "http://127.0.0.1:3100/health/ready",
    );

    const activeRunner = await readFile("scripts/active-ha-e2e.mjs", "utf8");
    expect(activeRunner).toContain(
      "await waitForActiveRuntime(configuration.baseUrl)",
    );
  });

  it("retrieves fixture credentials through the loopback fixture endpoint", async () => {
    expect(buildActiveHaFixtureUrl(3102)).toBe("http://127.0.0.1:3102/fixture");

    const [fixtureServer, activeRunner] = await Promise.all([
      readFile("scripts/real-e2e-fixture-server.mjs", "utf8"),
      readFile("scripts/active-ha-e2e.mjs", "utf8"),
    ]);

    expect(fixtureServer).toContain('request.url === "/fixture"');
    expect(activeRunner).toContain("buildActiveHaFixtureUrl");
    expect(activeRunner).not.toContain('"docker", ["cp"');
  });

  it("keeps disposable E2E Next builds isolated from the operational artifact", async () => {
    const [nextConfig, buildScript, playwrightConfig] = await Promise.all([
      readFile("apps/web/next.config.ts", "utf8"),
      readFile("scripts/build-e2e.mjs", "utf8"),
      readFile("playwright.config.ts", "utf8"),
    ]);

    expect(nextConfig).toContain("CVG_WEB_DIST_DIR");
    expect(buildScript).toContain(".next-e2e-real");
    expect(playwrightConfig).toContain("CVG_WEB_DIST_DIR=.next-e2e-real");
  });

  it("keeps the web-to-API channel on a loopback port separate from public HTTP redirect", async () => {
    const [caddyfile, compose, fixtureServer, activeRunner] = await Promise.all(
      [
        readFile("infra/production/Caddyfile", "utf8"),
        readFile("infra/production/docker-compose.ha.yml", "utf8"),
        readFile("scripts/real-e2e-fixture-server.mjs", "utf8"),
        readFile("scripts/active-ha-e2e.mjs", "utf8"),
      ],
    );

    expect(caddyfile).toMatch(/:8081\s*\{[\s\S]*import common_proxy/u);
    expect(compose).toContain("127.0.0.1:${CVG_EDGE_INTERNAL_PORT:-3182}:8081");
    expect(fixtureServer).toContain("server.closeAllConnections?.()");
    expect(fixtureServer).not.toContain("delete(auditEntries)");
    expect(fixtureServer.indexOf("await cleanup()")).toBeLessThan(
      fixtureServer.indexOf("server.closeAllConnections?.()"),
    );
    expect(activeRunner).toContain("State.ExitCode");
  });
});
