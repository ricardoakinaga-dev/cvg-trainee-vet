import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function selectedFiles(value: unknown): readonly string[] {
  if (!record(value)) throw new Error("Invalid Playwright list report");
  const files = new Set<string>();
  function visit(suite: unknown): void {
    if (!record(suite)) throw new Error("Invalid Playwright suite");
    if (Array.isArray(suite.specs) && suite.specs.length > 0) {
      if (typeof suite.file !== "string") throw new Error("Missing suite file");
      files.add(suite.file.replaceAll("\\", "/").split("/").at(-1) ?? "");
    }
    if (Array.isArray(suite.suites)) suite.suites.forEach(visit);
  }
  if (!Array.isArray(value.suites))
    throw new Error("Missing Playwright suites");
  value.suites.forEach(visit);
  return [...files].sort();
}

async function listProfile(real: boolean, staging = false) {
  const environment = { ...process.env };
  for (const key of [
    "CVG_RUN_REAL_E2E",
    "CVG_STAGING_BROWSER",
    "PLAYWRIGHT_JSON_OUTPUT_NAME",
    "PLAYWRIGHT_JSON_OUTPUT_DIR",
    "PLAYWRIGHT_JSON_OUTPUT_FILE",
  ])
    delete environment[key];
  environment.CVG_RUN_REAL_E2E = real ? "true" : "false";
  environment.BASE_URL = "http://127.0.0.1:3100";
  if (staging) environment.CVG_STAGING_BROWSER = "1";
  const { stdout } = await execute(
    "pnpm",
    ["exec", "playwright", "test", "--list", "--reporter=json"],
    { env: environment, timeout: 30_000, maxBuffer: 8 * 1024 * 1024 },
  ).catch((error: unknown) => {
    if (!record(error) || typeof error.stdout !== "string") throw error;
    const failed: unknown = JSON.parse(error.stdout);
    if (!record(failed)) throw error;
    throw new Error(`Playwright list failed: ${JSON.stringify(failed.errors)}`);
  });
  const report: unknown = JSON.parse(stdout);
  return selectedFiles(report);
}

it("keeps the common mocked suite separate from persisted runtime tests", async () => {
  const selected = await listProfile(false);
  expect(selected).toContain("operations-dashboard.spec.ts");
  expect(selected).toContain("participant-access.spec.ts");
  expect(selected).not.toContain("real-runtime.spec.ts");
  expect(selected).not.toContain("staging-journey.spec.ts");
}, 40_000);

it("selects only the genuine runtime suite in real mode", async () => {
  expect(await listProfile(true)).toEqual(["real-runtime.spec.ts"]);
}, 40_000);

it("keeps the externally provisioned staging journey selectable", async () => {
  expect(await listProfile(true, true)).toEqual(["staging-journey.spec.ts"]);
}, 40_000);
