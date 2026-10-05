import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

import {
  COVERAGE_EXCLUDE,
  COVERAGE_FLOOR,
  COVERAGE_INCLUDE,
} from "./scripts/verify-coverage-floor.mjs";

export default defineConfig({
  define: {
    "process.env.NEXT_PUBLIC_CVG_API_BASE_URL": JSON.stringify(""),
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: [
            "packages/**/src/**/*.test.ts",
            "apps/**/src/**/*.test.ts",
            "apps/web/app/**/*.test.ts",
          ],
          environment: "node",
          clearMocks: true,
          restoreMocks: true,
          mockReset: true,
          sequence: { groupOrder: 1 },
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
          sequence: { groupOrder: 2 },
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["apps/web/tests/**/*.browser.test.tsx"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
          fileParallelism: false,
          sequence: { groupOrder: 3 },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      // Inventory production TS/TSX, including unimported Next app routes.
      // The shared verifier exports this contract and rejects broad TSX excludes.
      include: [...COVERAGE_INCLUDE],
      exclude: [...COVERAGE_EXCLUDE],
      thresholds: { ...COVERAGE_FLOOR },
    },
  },
});
