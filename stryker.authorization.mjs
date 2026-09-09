/**
 * StrykerJS — mutation testing SELETIVO (AAA-FINAL-002 §16).
 *
 * Escopo intencionalmente mínimo: apenas o policy de autorização, o invariante
 * mais crítico do sistema. Não rodar no repo inteiro (custo desproporcional).
 * Uso: pnpm mutation:authorization
 *
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
export default {
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: ["packages/application/src/authorization.ts"],
  testRunner: "vitest",
  reporters: ["clear-text", "json"],
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
