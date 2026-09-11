import { readFile } from "node:fs/promises";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

/**
 * AAA-V6 §13 — failure diagnostics reporter (additive, zero green-path cost).
 *
 * On any failed/skipped-flaky test, captures a redacted snapshot:
 * Playwright trace/screenshots/video already exist via config; this adds
 * API/web/fixture health snapshots, listening-port state and process
 * context. Secrets are redacted (cookie/token/authorization values).
 */
function redact(value: string): string {
  return value
    .replace(/__Host-cvg_session=[^;\s]*/gu, "__Host-cvg_session=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*?/giu, "Bearer [redacted]")
    .replace(/"token"\s*:\s*"[^"]*"/gu, '"token":"[redacted]"')
    .replace(/password=[^&\s]*/giu, "password=[redacted]");
}

async function healthSnapshot(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const text = await response.text().catch(() => "");
      return `${url} -> ${response.status} ${redact(text.slice(0, 300))}`;
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return `${url} -> unreachable (${String(error).slice(0, 120)})`;
  }
}

async function listeningPorts(): Promise<string> {
  try {
    const tcp = await readFile("/proc/net/tcp", "utf8").catch(() => "");
    const tcp6 = await readFile("/proc/net/tcp6", "utf8").catch(() => "");
    const ports = new Set<string>();
    for (const content of [tcp, tcp6]) {
      for (const line of content.split("\n").slice(1)) {
        const parts = line.trim().split(/\s+/);
        const state = parts[3];
        const local = parts[1] ?? "";
        if (state === "0A" && local.includes(":")) {
          const portHex = local.split(":")[1] ?? "";
          const port = Number.parseInt(portHex, 16);
          if (Number.isSafeInteger(port) && port > 0) ports.add(String(port));
        }
      }
    }
    return `listening: ${[...ports].sort((a, b) => Number(a) - Number(b)).join(",")}`;
  } catch {
    return "listening: unavailable";
  }
}

class FailureDiagnosticsReporter implements Reporter {
  private failures = 0;

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.failures = 0;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== "failed" && result.status !== "timedOut") return;
    this.failures += 1;
    const title = test.titlePath().slice(2).join(" > ");
    void (async () => {
      const health = await Promise.all(
        [
          "http://127.0.0.1:3100/",
          "http://127.0.0.1:3101/health/ready",
          "http://127.0.0.1:3102/ready",
          "http://127.0.0.1:3103/ready",
        ].map((url) => healthSnapshot(url)),
      );
      const ports = await listeningPorts();
      console.log(
        `\n[diagnostics] FAILED: ${redact(title)}\n` +
          `[diagnostics] retry=${result.retry} duration=${result.duration}ms\n` +
          health.map((entry) => `[diagnostics] ${entry}`).join("\n") +
          `\n[diagnostics] ${ports}\n` +
          `[diagnostics] stdout_tail=${redact(
            result.stdout
              .map((chunk) => chunk.toString())
              .join("")
              .slice(-500),
          )}\n` +
          `[diagnostics] stderr_tail=${redact(
            result.stderr
              .map((chunk) => chunk.toString())
              .join("")
              .slice(-500),
          )}\n`,
      );
    })();
  }

  onEnd(_result: FullResult): void {
    if (this.failures > 0) {
      console.log(
        `[diagnostics] ${this.failures} failed test(s); traces/screenshots/video in playwright-report/`,
      );
    }
  }
}

export default FailureDiagnosticsReporter;
