import { defineConfig, devices } from "@playwright/test";

const runDisposableRealE2e = process.env.CVG_RUN_REAL_E2E === "true";
const runActiveHaE2e = process.env.CVG_RUN_ACTIVE_HA_E2E === "true";
const e2eWebPort = Number(process.env.CVG_E2E_WEB_PORT ?? "3100");
if (!Number.isInteger(e2eWebPort) || e2eWebPort < 1 || e2eWebPort > 65_535) {
  throw new Error("CVG_E2E_WEB_PORT must be an integer between 1 and 65535");
}
const e2eWebBaseUrl = `http://127.0.0.1:${e2eWebPort}`;
if (runDisposableRealE2e && runActiveHaE2e) {
  throw new Error("disposable and active HA E2E modes are mutually exclusive");
}

const browserProjectDefinitions = {
  chromium: { name: "chromium", device: "Desktop Chrome" },
  firefox: { name: "firefox", device: "Desktop Firefox" },
  webkit: { name: "webkit", device: "Desktop Safari" },
  "mobile-chromium": { name: "mobile-chromium", device: "Pixel 5" },
} as const;
type BrowserProjectName = keyof typeof browserProjectDefinitions;

function resolveBrowserProjects(
  requested: string | undefined,
): readonly { name: string; use: ReturnType<typeof devices>[string] }[] {
  const names =
    requested === undefined || requested.trim().length === 0
      ? (["chromium"] as const)
      : requested.split(",").map((value) => value.trim());
  const invalid = names.filter(
    (name): name is string =>
      !(name in browserProjectDefinitions) || name.length === 0,
  );
  if (invalid.length > 0) {
    throw new Error(
      `CVG_E2E_BROWSERS contains unsupported projects: ${invalid.join(", ")}`,
    );
  }
  const uniqueNames = [...new Set(names)] as BrowserProjectName[];
  return uniqueNames.map((name) => {
    const definition = browserProjectDefinitions[name];
    return {
      name: definition.name,
      use: { ...devices[definition.device] },
    };
  });
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
    baseURL: process.env.BASE_URL ?? e2eWebBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    launchOptions: {
      args: [
        "--headless=new",
        "--disable-gpu",
        "--disable-software-rasterizer",
      ],
    },
  },
  projects: resolveBrowserProjects(process.env.CVG_E2E_BROWSERS),
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
                command: `NODE_ENV=development API_HOST=127.0.0.1 API_PORT=3101 WEB_ORIGINS=${e2eWebBaseUrl} pnpm --filter @cvg/api start`,
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
                command: `CVG_WEB_DIST_DIR=.next-e2e-real CVG_API_INTERNAL_URL=http://127.0.0.1:3101 pnpm --dir apps/web start --hostname 127.0.0.1 --port ${e2eWebPort}`,
                url: e2eWebBaseUrl,
                reuseExistingServer: false,
                timeout: 120_000,
              },
            ]
          : {
              command: `pnpm --dir apps/web start --hostname 127.0.0.1 --port ${e2eWebPort}`,
              url: e2eWebBaseUrl,
              reuseExistingServer: false,
              timeout: 120_000,
            },
      }),
});
