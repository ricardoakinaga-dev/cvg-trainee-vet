import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/* global setTimeout */

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

function log(message) {
  console.log(`[ratelimit-live] ${message}`);
}

async function findRedisServer() {
  if (process.env.CVG_REDIS_SERVER_BIN?.trim()) {
    return process.env.CVG_REDIS_SERVER_BIN.trim();
  }
  try {
    const { stdout } = await execFileAsync("sh", [
      "-c",
      "command -v redis-server",
    ]);
    const found = stdout.trim().split("\n")[0]?.trim();
    return found === undefined || found === "" ? null : found;
  } catch {
    return null;
  }
}

async function waitForRedis(port, attempts = 50) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const net = await import("node:net");
      await new Promise((resolve, reject) => {
        const socket = net.connect({ host: "127.0.0.1", port });
        socket.once("connect", () => {
          socket.end();
          resolve();
        });
        socket.once("error", (error) => reject(error));
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("redis did not become ready");
}

async function main() {
  const providedUrl = process.env.CVG_TEST_REDIS_URL?.trim();
  let stop = async () => undefined;
  let redisUrl = providedUrl;

  if (redisUrl === undefined || redisUrl.length === 0) {
    const bin = await findRedisServer();
    if (bin === null) {
      log(
        "SKIP: no redis-server binary (set CVG_REDIS_SERVER_BIN or CVG_TEST_REDIS_URL)",
      );
      return;
    }
    const port = 6390 + Math.floor(Math.random() * 500);
    log(`booting disposable redis on 127.0.0.1:${port}`);
    const child = spawn(bin, [
      "--port",
      String(port),
      "--bind",
      "127.0.0.1",
      "--save",
      "",
      "--appendonly",
      "no",
    ]);
    child.stderr?.on("data", () => undefined);
    stop = async () => {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", () => resolve()));
    };
    try {
      await waitForRedis(port);
    } catch (error) {
      await stop();
      throw error;
    }
    redisUrl = `redis://127.0.0.1:${port}`;
  } else {
    log("using provided CVG_TEST_REDIS_URL");
  }

  const testFile =
    process.argv[2] ?? "tests/integration/ratelimit-redis-live.test.ts";
  log(`running ${testFile}`);
  try {
    const child = await execFileAsync(
      "pnpm",
      ["exec", "vitest", "run", "--project", "integration", testFile],
      {
        cwd: root,
        env: {
          ...process.env,
          CVG_TEST_REDIS_URL: redisUrl,
          CVG_RUN_LIVE_REDIS_TESTS: "true",
        },
        timeout: 600000,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    process.stdout.write(child.stdout ?? "");
  } catch (error) {
    process.stdout.write(error.stdout ?? "");
    process.stderr.write(error.stderr ?? "");
    await stop();
    process.exit(typeof error.code === "number" ? error.code : 1);
  }
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const evidenceDir = join(root, "staging-evidence");
    await mkdir(evidenceDir, { recursive: true });
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    }).catch(() => ({ stdout: "unknown" }));
    await writeFile(
      join(evidenceDir, "multi-instance-summary.json"),
      `${JSON.stringify({ status: "PASS", sha: stdout.trim(), suite: testFile }, null, 2)}\n`,
    );
  } catch {
    // evidence is best effort; the vitest result above is authoritative
  }
  await stop();
  log("disposable redis stopped");
}

await main();
