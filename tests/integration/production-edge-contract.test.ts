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

  it("exposes an external trace overlay without changing the local profile", async () => {
    const overlay = await readFile(
      "infra/production/docker-compose.external-traces.example.yml",
      "utf8",
    );
    const collector = await readFile(
      "infra/observability/otel-collector.production.example.yaml",
      "utf8",
    );

    expect(overlay).toContain(
      "../observability/otel-collector.production.example.yaml",
    );
    expect(overlay).toContain("CVG_TRACE_OTLP_HTTP_ENDPOINT");
    expect(overlay).toContain("CVG_TRACE_AUTHORIZATION");
    expect(overlay).toContain('profiles: ["local-traces"]');
    expect(overlay).toContain("depends_on: !override");
    expect(collector).toContain("otlphttp/durable:");
    expect(collector).toContain(
      "Base URL only; the exporter appends /v1/traces",
    );
    expect(collector).toContain("${env:CVG_TRACE_OTLP_HTTP_ENDPOINT}");
    expect(collector).toContain("insecure: false");
    expect(collector).toContain("${env:CVG_TRACE_AUTHORIZATION}");
  });

  it("propagates the source SHA into the application image and runtime", async () => {
    const [dockerfile, compose] = await Promise.all([
      readFile("infra/production/Dockerfile", "utf8"),
      readFile("infra/production/docker-compose.ha.yml", "utf8"),
    ]);

    expect(dockerfile).toContain("ARG SOURCE_SHA=unknown");
    expect(dockerfile).toContain(
      "org.opencontainers.image.revision=$SOURCE_SHA",
    );
    expect(dockerfile).toContain("CVG_SOURCE_SHA=$SOURCE_SHA");
    expect(compose).toContain("SOURCE_SHA: ${CVG_SOURCE_SHA:-unknown}");
    expect(compose).toContain("CVG_SOURCE_SHA: ${CVG_SOURCE_SHA:-unknown}");
  });

  it("uses health-check hysteresis for transient Docker DNS failures", async () => {
    const [localCaddyfile, productionCaddyfile] = await Promise.all([
      readFile("infra/production/Caddyfile", "utf8"),
      readFile("infra/production/Caddyfile.production.example", "utf8"),
    ]);

    for (const caddyfile of [localCaddyfile, productionCaddyfile]) {
      expect(caddyfile).toContain("health_fails 3");
      expect(caddyfile).toContain("health_passes 2");
      expect(caddyfile).toContain("lb_try_duration 5s");
    }
  });
});
