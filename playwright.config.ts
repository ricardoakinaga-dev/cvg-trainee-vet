import { defineConfig, devices } from "@playwright/test";

const runDisposableRealE2e = process.env.CVG_RUN_REAL_E2E === "true";
const runActiveHaE2e = process.env.CVG_RUN_ACTIVE_HA_E2E === "true";
if (runDisposableRealE2e && runActiveHaE2e) {
  throw new Error("disposable and active HA E2E modes are mutually exclusive");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore:
    runDisposableRealE2e || runActiveHaE2e ? [] : ["**/real-runtime.spec.ts"],
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
  ...(runActiveHaE2e
    ? {}
    : {
        webServer: runDisposableRealE2e
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
                  "CVG_WEB_DIST_DIR=.next-e2e-real CVG_API_INTERNAL_URL=http://127.0.0.1:3101 pnpm --dir apps/web start --hostname 127.0.0.1 --port 3100",
                url: "http://127.0.0.1:3100",
                reuseExistingServer: false,
                timeout: 120_000,
              },
            ]
          : {
              command:
                "pnpm --dir apps/web start --hostname 127.0.0.1 --port 3100",
              url: "http://127.0.0.1:3100",
              reuseExistingServer: false,
              timeout: 120_000,
            },
      }),
});
