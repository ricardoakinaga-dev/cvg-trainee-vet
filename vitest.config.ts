import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: [
            "packages/**/src/**/*.test.{ts,tsx}",
            "apps/**/src/**/*.test.{ts,tsx}",
          ],
          environment: "node",
          clearMocks: true,
          restoreMocks: true,
          mockReset: true,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "packages/**/src/**/*.ts",
        "apps/**/src/**/*.ts",
        "apps/web/app/**/*.{ts,tsx}",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/index.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
