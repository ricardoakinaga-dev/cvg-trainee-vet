import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";

const collectorConfig = await readFile(
  "infra/observability/otel-collector-config.yaml",
  "utf8",
);
const tempoConfig = await readFile("infra/observability/tempo.yaml", "utf8");
const compose = await readFile(
  "infra/production/docker-compose.ha.yml",
  "utf8",
);

for (const required of [
  "otlp/tempo:",
  "endpoint: tempo:4317",
  "exporters: [otlp/tempo]",
]) {
  if (!collectorConfig.includes(required)) {
    throw new Error(
      `collector durable trace configuration missing: ${required}`,
    );
  }
}
for (const required of [
  "target: all",
  "backend: local",
  "path: /var/tempo/wal",
  "path: /var/tempo/blocks",
]) {
  if (!tempoConfig.includes(required)) {
    throw new Error(`Tempo configuration missing: ${required}`);
  }
}
for (const required of [
  "image: grafana/tempo:3.0.0",
  "tempo-data:/var/tempo",
  "CVG_TEMPO_PORT:-3320",
]) {
  if (!compose.includes(required)) {
    throw new Error(`HA topology missing durable trace setting: ${required}`);
  }
}

const collectorTarget =
  process.env.CVG_TRACE_COLLECTOR_TARGET ?? "http://127.0.0.1:4318/v1/traces";
const tempoTarget =
  process.env.CVG_TEMPO_QUERY_TARGET ?? "http://127.0.0.1:3320";
const shouldRestart = process.env.CVG_VERIFY_DURABLE_TRACE_RESTART === "true";
const restartContainer =
  process.env.CVG_TEMPO_CONTAINER ?? "cvg-trainee-vet-ha-tempo-1";

const live =
  process.env.CVG_VERIFY_DURABLE_TRACES === "true" ||
  process.env.CVG_TRACE_COLLECTOR_TARGET !== undefined ||
  process.env.CVG_TEMPO_QUERY_TARGET !== undefined;

if (!live) {
  console.log(
    JSON.stringify({
      status: "PASS",
      mode: "static",
      storage: "tempo-data local volume",
      retention:
        "14d default block retention for local staging; production retention is a separate gate",
    }),
  );
  process.exit(0);
}

await expectReady(tempoTarget);
const traceId = randomBytes(16).toString("hex");
const spanId = randomBytes(8).toString("hex");
const now = Date.now();
const body = {
  resourceSpans: [
    {
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: "cvg-trace-probe" } },
        ],
      },
      scopeSpans: [
        {
          scope: { name: "cvg.remediation.probe" },
          spans: [
            {
              traceId,
              spanId,
              name: "remediation.trace.persistence.probe",
              kind: 2,
              startTimeUnixNano: String(BigInt(now) * 1_000_000n),
              endTimeUnixNano: String(BigInt(now + 2) * 1_000_000n),
              attributes: [
                {
                  key: "cvg.request_id",
                  value: { stringValue: "synthetic-trace-probe" },
                },
                {
                  key: "cvg.correlation_id",
                  value: { stringValue: "synthetic-trace-correlation" },
                },
              ],
              status: { code: 1 },
            },
          ],
        },
      ],
    },
  ],
};

const ingestResponse = await fetch(collectorTarget, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify(body),
  signal: globalThis.AbortSignal.timeout(5_000),
});
if (!ingestResponse.ok) {
  throw new Error(
    `collector rejected synthetic trace (${ingestResponse.status})`,
  );
}

await waitForTrace(tempoTarget, traceId);
let restarted = false;
if (shouldRestart) {
  await runCommand("docker", ["restart", restartContainer]);
  restarted = true;
  await expectReady(tempoTarget);
  await waitForTrace(tempoTarget, traceId);
}

console.log(
  JSON.stringify({
    status: "PASS",
    mode: "live",
    traceId,
    collectorTarget,
    tempoTarget,
    restarted,
    storage: "tempo-data local volume",
    retention:
      "14d default block retention for local staging; production retention is a separate gate",
  }),
);

async function expectReady(target) {
  const deadline = Date.now() + 30_000;
  let lastError = "unknown readiness failure";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${target.replace(/\/$/u, "")}/ready`, {
        signal: globalThis.AbortSignal.timeout(5_000),
      });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request failed";
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Tempo is not ready: ${lastError}`);
}

async function fetchTrace(target, traceIdValue) {
  const base = target.replace(/\/$/u, "");
  for (const path of [
    `/api/v2/traces/${traceIdValue}`,
    `/api/traces/${traceIdValue}`,
  ]) {
    const response = await fetch(`${base}${path}`, {
      signal: globalThis.AbortSignal.timeout(5_000),
    });
    if (response.ok) {
      return await response.text();
    }
  }
  return null;
}

async function waitForTrace(target, traceIdValue) {
  const deadline = Date.now() + 45_000;
  const encodedTraceId = Buffer.from(traceIdValue, "hex").toString("base64");
  while (Date.now() < deadline) {
    const trace = await fetchTrace(target, traceIdValue);
    if (
      trace !== null &&
      (trace.includes(traceIdValue) || trace.includes(encodedTraceId))
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Tempo did not return synthetic trace ${traceIdValue}`);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
