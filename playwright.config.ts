import { defineConfig, devices } from "@playwright/test";

const runRealE2E = process.env.CVG_RUN_REAL_E2E === "true";
// Staging-like runs boot the full stack externally (scripts/run-staging.mjs)
// and only need Playwright to reuse it instead of spawning CI-shaped servers.
const externalServers = process.env.CVG_STAGING_EXTERNAL === "1";
const mockedProxyCookie = "__Host-cvg_session=synthetic-e2e-session";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore:
    process.env.CVG_STAGING_BROWSER === "1"
      ? ["**/real-runtime.spec.ts"]
      : ["**/real-runtime.spec.ts", "**/staging-journey.spec.ts"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["./tests/e2e/diagnostics-reporter.ts"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/playwright.xml" }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3100",
    ...(runRealE2E ? {} : { extraHTTPHeaders: { cookie: mockedProxyCookie } }),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalServers
    ? undefined
    : runRealE2E
      ? [
          {
            command: "node scripts/real-e2e-fixture-server.mjs",
            url: "http://127.0.0.1:3102/ready",
            reuseExistingServer: false,
            timeout: 120_000,
          },
          {
            command:
              "NODE_ENV=development API_HOST=127.0.0.1 API_PORT=3101 WEB_ORIGINS=http://127.0.0.1:3100 pnpm --filter @cvg/api start",
            url: "http://127.0.0.1:3101/health/ready",
            reuseExistingServer: false,
            timeout: 120_000,
          },
          {
            command:
              "CVG_API_INTERNAL_URL=http://127.0.0.1:3101 pnpm --dir apps/web start --hostname 127.0.0.1 --port 3100",
            url: "http://127.0.0.1:3100",
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]
      : [
          {
            command: "node scripts/e2e-proxy-fixture-server.mjs",
            url: "http://127.0.0.1:3103/ready",
            reuseExistingServer: false,
            timeout: 120_000,
          },
          {
            command:
              "CVG_API_INTERNAL_URL=http://127.0.0.1:3103 pnpm --dir apps/web start --hostname 127.0.0.1 --port 3100",
            url: "http://127.0.0.1:3100",
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ],
});
