import { defineConfig } from "vitest/config";

import { COVERAGE_EXCLUSIONS } from "./scripts/coverage-exclusions.mjs";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["packages/**/src/**/*.test.ts", "apps/**/src/**/*.test.ts"],
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
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      include: ["packages/**/src/**/*.ts", "apps/**/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts", ...COVERAGE_EXCLUSIONS],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
