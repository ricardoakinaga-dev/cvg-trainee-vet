/**
 * StrykerJS — mutation testing seletivo expandido (AAA-FINAL-002 §5).
 *
 * Escopo intencional: componentes críticos além de authorization.ts —
 * session lifecycle, rate-limit policy, recovery token lifecycle e attempt
 * lifecycle (idempotency). Nunca o monorepo inteiro.
 * Uso: pnpm mutation:critical
 *
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
export default {
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: [
    "packages/application/src/session.ts",
    "apps/api/src/security/rate-limit-store.ts",
    "packages/application/src/account-recovery-use-cases.ts",
    "packages/application/src/attempt-use-cases.ts",
  ],
  testRunner: "vitest",
  reporters: ["clear-text", "json"],
  jsonReporter: { fileName: "reports/mutation-critical/mutation.json" },
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
