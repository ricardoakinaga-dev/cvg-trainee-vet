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

  it("routes only ready replicas and loads worker alerting telemetry", async () => {
    const [
      compose,
      localCaddyfile,
      productionCaddyfile,
      dockerfile,
      prometheus,
      alerts,
      alertmanager,
    ] = await Promise.all([
      readFile("infra/production/docker-compose.ha.yml", "utf8"),
      readFile("infra/production/Caddyfile", "utf8"),
      readFile("infra/production/Caddyfile.production.example", "utf8"),
      readFile("infra/production/Dockerfile", "utf8"),
      readFile("infra/observability/prometheus.yml", "utf8"),
      readFile("infra/observability/prometheus-alerts.yml", "utf8"),
      readFile("infra/observability/alertmanager.yml", "utf8"),
    ]);

    for (const caddyfile of [localCaddyfile, productionCaddyfile]) {
      expect(caddyfile).toContain("health_uri /health/ready");
      expect(caddyfile).not.toContain("health_uri /health/live");
    }
    expect(dockerfile).toContain("/health/ready");
    expect(dockerfile).toContain("USER node");
    expect(compose).toContain("/health/ready");
    expect(compose).toContain("WORKER_METRICS_PORT");
    expect(compose).toContain("read_only: true");
    expect(compose).toContain("cap_drop: [ALL]");
    expect(compose).toContain("no-new-privileges:true");
    expect(compose).toContain("127.0.0.1:${CVG_OTEL_GRPC_PORT:-4317}:4317");
    expect(compose).toContain("127.0.0.1:${CVG_OTEL_HTTP_PORT:-4318}:4318");
    expect(compose).toContain("prometheus-alerts.yml");
    expect(compose).toContain("alertmanager.yml");
    expect(prometheus).toContain("rule_files:");
    expect(prometheus).toContain("worker-a:9091");
    expect(prometheus).toContain("worker-b:9091");
    expect(prometheus).toContain("job_name: alertmanager");
    expect(prometheus).toContain("/run/secrets/metrics_scrape_token");
    expect(alerts).toContain("CvgWorkerQueueBacklog");
    expect(alerts).toContain('expr: up{job="cvg-worker"} == 0');
    expect(alerts).toContain('expr: absent(up{job="cvg-worker"})');
    expect(alerts).not.toContain(
      "clamp_min(sum(rate(api_requests_total[5m])), 1)",
    );
    expect(alertmanager).toContain("route:");
  });

  it("keeps authenticated metrics operational with rules and a ready Alertmanager", async () => {
    const compose = await readFile(
      "infra/production/docker-compose.ha.yml",
      "utf8",
    );

    expect(compose).toContain("prometheus-secret-init:");
    expect(compose).toContain('user: "0:0"');
    expect(compose).toContain('entrypoint: ["/bin/sh"]');
    expect(compose).toContain("network_mode: none");
    expect(compose).toContain("cap_add: [CHOWN, DAC_READ_SEARCH, FOWNER]");
    expect(compose).toContain("prometheus-secret-data:/output");
    expect(compose).toContain("install");
    expect(compose).toContain('user: "65534:65534"');
    expect(compose).toContain("prometheus-secret-data:/run/secrets:ro");
    expect(compose).toContain("prometheus-alerts.yml");
    expect(compose).toContain("alertmanager.yml");
    expect(compose).toContain("condition: service_completed_successfully");
    expect(compose).toContain("condition: service_healthy");
    expect(compose).toContain("healthcheck:");
  });
});
