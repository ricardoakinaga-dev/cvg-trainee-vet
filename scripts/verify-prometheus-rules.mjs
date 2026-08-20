import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const observabilityDirectory = resolve(projectRoot, "infra/observability");
const image = "prom/prometheus:v2.55.1";

function runPromtool(args) {
  return new Promise((resolveOutput, reject) => {
    const child = spawn(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "--entrypoint",
        "promtool",
        "-v",
        `${observabilityDirectory}:/workspace:ro`,
        image,
        ...args,
      ],
      { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolveOutput(stdout.trim());
        return;
      }
      reject(new Error(`promtool failed (${code}): ${stderr.trim()}`));
    });
  });
}

async function main() {
  const syntax = await runPromtool([
    "check",
    "rules",
    "/workspace/prometheus-alerts.yml",
  ]);
  const semantic = await runPromtool([
    "test",
    "rules",
    "/workspace/prometheus-alerts.test.yml",
  ]);
  console.log(
    JSON.stringify({
      status: "PASS",
      image,
      syntax,
      semantic,
      scenarios: [
        "api target down",
        "api target absent",
        "worker target down",
        "worker target absent",
        "Alertmanager disconnected",
      ],
    }),
  );
}

const invokedFile =
  process.argv[1] === undefined ? undefined : fileURLToPath(import.meta.url);
if (process.argv[1] === invokedFile) {
  try {
    await main();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Prometheus rule verification failed",
    );
    process.exitCode = 1;
  }
}
