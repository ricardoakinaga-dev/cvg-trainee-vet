import { spawn } from "node:child_process";
import process from "node:process";

const composeFile = "infra/production/docker-compose.ha.yml";
const secretFile = process.env.METRICS_SCRAPE_TOKEN_FILE ?? "/dev/null";
const environment = {
  ...process.env,
  CVG_APP_IMAGE: process.env.CVG_APP_IMAGE ?? "cvg-trainee-vet:local",
  CVG_DB_ADMIN: process.env.CVG_DB_ADMIN ?? "cvg_admin",
  CVG_DB_ADMIN_PASSWORD:
    process.env.CVG_DB_ADMIN_PASSWORD ?? "synthetic-admin-password",
  CVG_DB_USER: process.env.CVG_DB_USER ?? "cvg_app",
  CVG_DB_APP_PASSWORD:
    process.env.CVG_DB_APP_PASSWORD ?? "synthetic-app-password",
  CVG_DB_NAME: process.env.CVG_DB_NAME ?? "cvg",
  WEB_ORIGINS: process.env.WEB_ORIGINS ?? "http://localhost:8080",
  METRICS_SCRAPE_TOKEN: process.env.METRICS_SCRAPE_TOKEN ?? "m".repeat(32),
  GRAFANA_ADMIN_PASSWORD:
    process.env.GRAFANA_ADMIN_PASSWORD ?? "synthetic-grafana-password",
  METRICS_SCRAPE_TOKEN_FILE: secretFile,
};

const output = await runComposeConfig(environment);
const model = JSON.parse(output);
const services = model.services ?? {};
const requiredServices = [
  "postgres",
  "migrate",
  "qdrant",
  "otel-collector",
  "api-a",
  "api-b",
  "worker-a",
  "worker-b",
  "edge",
  "prometheus",
  "grafana",
];
const missing = requiredServices.filter(
  (service) => services[service] === undefined,
);
if (missing.length > 0)
  throw new Error(`HA topology missing services: ${missing.join(", ")}`);

for (const service of ["api-a", "api-b"]) {
  const healthcheck = services[service].healthcheck;
  if (healthcheck === undefined)
    throw new Error(`${service} must have a healthcheck`);
  const dependsOn = services[service].depends_on ?? {};
  if (dependsOn.migrate?.condition !== "service_completed_successfully") {
    throw new Error(`${service} must wait for successful migrations`);
  }
}
for (const service of ["worker-a", "worker-b"]) {
  if (services[service].healthcheck === undefined) {
    throw new Error(`${service} must have a process healthcheck`);
  }
}

if (services.edge.depends_on?.["api-a"]?.condition !== "service_healthy") {
  throw new Error("edge must route only after api-a is healthy");
}
if (services.edge.depends_on?.["api-b"]?.condition !== "service_healthy") {
  throw new Error("edge must route only after api-b is healthy");
}
if (
  services.prometheus.command?.join(" ").includes("retention.time=15d") !== true
) {
  throw new Error("Prometheus retention must be configured to 15 days");
}
if (
  services.prometheus.secrets?.some(
    (secret) => secret.source === "metrics_scrape_token",
  ) !== true
) {
  throw new Error("Prometheus must use the dedicated metrics scrape secret");
}
if (
  services["api-a"].environment?.OTEL_EXPORTER_OTLP_ENDPOINT !==
  "http://otel-collector:4318"
) {
  throw new Error("api-a must export traces to the collector");
}
if (
  services["api-b"].environment?.OTEL_EXPORTER_OTLP_ENDPOINT !==
  "http://otel-collector:4318"
) {
  throw new Error("api-b must export traces to the collector");
}
for (const service of ["api-a", "api-b"]) {
  if (services[service].environment?.API_HOST !== "0.0.0.0") {
    throw new Error(`${service} must bind to the container network interface`);
  }
}

process.stdout.write(
  `${JSON.stringify({
    status: "PASS",
    composeFile,
    replicas: { api: ["api-a", "api-b"], worker: ["worker-a", "worker-b"] },
    retention: "15d",
    traceCollector: "OTLP HTTP :4318",
    failover: "Caddy health-routed edge across api-a/api-b",
  })}\n`,
);

function runComposeConfig(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      ["compose", "-f", composeFile, "config", "--format", "json"],
      { env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(stdout);
      else
        reject(new Error(`docker compose config failed (${code}): ${stderr}`));
    });
  });
}
