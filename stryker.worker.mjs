/**
 * StrykerJS — mutation testing seletivo: worker loop (AAA-V6 §29).
 *
 * loop.ts orquestra claim/lease/process/ack do outbox: mutação
 * sobrevivente aqui significa duplicate side effect ou lost work.
 * Uso: pnpm mutation:worker-loop
 *
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
export default {
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: ["apps/worker/src/loop.ts"],
  testRunner: "vitest",
  reporters: ["clear-text", "json"],
  jsonReporter: { fileName: "reports/mutation-worker/mutation.json" },
  coverageAnalysis: "perTest",
  thresholds: { high: 90, low: 75, break: 0 },
  timeoutMS: 20000,
  concurrency: 4,
  vitest: {
    related: true,
  },
  checkers: [],
  ignorePatterns: ["node_modules", "dist", "coverage"],
};
