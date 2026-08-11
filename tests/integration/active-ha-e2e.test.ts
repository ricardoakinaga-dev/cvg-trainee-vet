import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  ACTIVE_HA_FIXTURE_SERVICE,
  buildActiveHaComposeArgs,
  buildActiveHaPlaywrightEnvironment,
} from "../../scripts/active-ha-e2e.mjs";

describe("active HA E2E orchestration", () => {
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
