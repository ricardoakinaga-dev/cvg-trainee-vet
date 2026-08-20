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
  TRUSTED_PROXY_CIDRS: process.env.TRUSTED_PROXY_CIDRS ?? "127.0.0.1/32",
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
  "tempo",
  "otel-collector",
  "api-a",
  "api-b",
  "worker-a",
  "worker-b",
  "edge",
  "prometheus-secret-init",
  "prometheus",
  "alertmanager",
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
if (services.tempo.image !== "grafana/tempo:3.0.0") {
  throw new Error("tempo must use the pinned local durable-trace image");
}
if (
  services["otel-collector"].depends_on?.tempo?.condition !== "service_started"
) {
  throw new Error("otel-collector must start after the durable trace backend");
}
if (
  services.tempo.volumes?.some((volume) =>
    String(volume.source).includes("tempo-data"),
  ) !== true
) {
  throw new Error("tempo must persist data in tempo-data");
}
const edgePorts = services.edge.ports ?? [];
const edgePortTargets = edgePorts.map((port) => String(port.target));
for (const targetPort of ["8080", "8081", "8443"]) {
  if (!edgePortTargets.includes(targetPort)) {
    throw new Error(`edge must expose target port ${targetPort}`);
  }
}
if (
  typeof services.edge.environment?.CVG_PUBLIC_HTTPS_ORIGIN !== "string" ||
  services.edge.environment.CVG_PUBLIC_HTTPS_ORIGIN.length === 0
) {
  throw new Error("edge must declare CVG_PUBLIC_HTTPS_ORIGIN");
}
if (
  services.prometheus.command?.join(" ").includes("retention.time=15d") !== true
) {
  throw new Error("Prometheus retention must be configured to 15 days");
}
const secretInit = services["prometheus-secret-init"];
if (
  secretInit.user !== "0:0" ||
  secretInit.restart !== "no" ||
  secretInit.read_only !== true ||
  secretInit.network_mode !== "none" ||
  secretInit.cap_drop?.includes("ALL") !== true ||
  ["CHOWN", "DAC_READ_SEARCH", "FOWNER"].some(
    (capability) => secretInit.cap_add?.includes(capability) !== true,
  ) ||
  secretInit.secrets?.some(
    (secret) => secret.source === "metrics_scrape_token",
  ) !== true
) {
  throw new Error(
    "Prometheus secret init must read the dedicated metrics scrape secret as a one-shot hardened root helper",
  );
}
if (
  secretInit.volumes?.some(
    (volume) =>
      String(volume.target) === "/output" &&
      String(volume.source).includes("prometheus-secret-data"),
  ) !== true
) {
  throw new Error(
    "Prometheus secret init must populate the secret data volume",
  );
}
if (String(secretInit.command).includes("65534") !== true) {
  throw new Error(
    "Prometheus secret init must assign the non-root runtime owner",
  );
}
if (
  services.prometheus.user !== "65534:65534" ||
  services.prometheus.healthcheck === undefined
) {
  throw new Error("Prometheus must run non-root with a readiness healthcheck");
}
if (
  services.prometheus.volumes?.some(
    (volume) =>
      String(volume.target) === "/run/secrets" &&
      String(volume.source).includes("prometheus-secret-data"),
  ) !== true
) {
  throw new Error("Prometheus must read the prepared secret data volume");
}
if (
  services.prometheus.depends_on?.["prometheus-secret-init"]?.condition !==
  "service_completed_successfully"
) {
  throw new Error(
    "Prometheus must wait for the secret preparation to complete",
  );
}
if (services.alertmanager.healthcheck === undefined) {
  throw new Error("Alertmanager must have a readiness healthcheck");
}
if (
  services.prometheus.depends_on?.alertmanager?.condition !== "service_healthy"
) {
  throw new Error("Prometheus must wait for a healthy Alertmanager");
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
    traceBackend: "Tempo 3.0.0 local volume with 14d default block retention",
    edge: {
      httpTargetPort: 8080,
      internalApiTargetPort: 8081,
      httpsTargetPort: 8443,
      publicHttpsOrigin: services.edge.environment.CVG_PUBLIC_HTTPS_ORIGIN,
    },
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
