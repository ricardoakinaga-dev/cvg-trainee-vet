import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore:
    process.env.CVG_RUN_REAL_E2E === "true" ? [] : ["**/real-runtime.spec.ts"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/playwright.xml" }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer:
    process.env.CVG_RUN_REAL_E2E === "true"
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
            env: {
              ...process.env,
              ...(process.env.CVG_REAL_E2E_DATABASE_URL === undefined
                ? {}
                : { DATABASE_URL: process.env.CVG_REAL_E2E_DATABASE_URL }),
            },
          },
          {
            command:
              "CVG_API_INTERNAL_URL=http://127.0.0.1:3101 pnpm --dir apps/web start --hostname 127.0.0.1 --port 3100",
            url: "http://127.0.0.1:3100",
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]
      : {
          command: "pnpm --dir apps/web start --hostname 127.0.0.1 --port 3100",
          url: "http://127.0.0.1:3100",
          reuseExistingServer: false,
          timeout: 120_000,
        },
});
