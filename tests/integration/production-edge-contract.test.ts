import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("production edge contract", () => {
  it("keeps local defaults while exposing a managed TLS profile", async () => {
    const compose = await readFile(
      "infra/production/docker-compose.ha.yml",
      "utf8",
    );
    const productionCaddyfile = await readFile(
      "infra/production/Caddyfile.production.example",
      "utf8",
    );

    expect(compose).toContain("CVG_CADDYFILE");
    expect(compose).toContain("CVG_EDGE_TLS_TARGET_PORT");
    expect(compose).toContain("CVG_EDGE_HTTP_TARGET_PORT");
    expect(productionCaddyfile).toContain("{$CVG_CADDY_HTTPS_SITE}");
    expect(productionCaddyfile).not.toContain("tls internal");
    expect(productionCaddyfile).toContain("Strict-Transport-Security");
  });
});
