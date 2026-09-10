/**
 * Documented coverage exclusions for the unit coverage floor (90/85/90/90).
 *
 * Only non-runtime categories are excluded:
 * - `schema.ts`: Drizzle structural table declarations (runtime logic lives in
 *   repositories, which are covered by their own suites).
 * - `test-support/`: shared test fixtures (like `*.test.ts`).
 * - `http-boundary/fixtures.ts`: test-support fixtures (like `*.test.ts`).
 * - Process entrypoints (`main.ts`, `reconcile-command.ts`): composition roots
 *   whose wiring is exercised by the staging-like and integration suites
 *   (`tests/integration/staging-stack.test.ts`), analogous to `index.ts`.
 *
 * This list is shared by `vitest.config.ts`, `verify:coverage-floor` and
 * `verify:aaa-candidate` so the gate cannot drift from the report.
 */
export const COVERAGE_EXCLUSIONS = Object.freeze([
  "packages/persistence/src/schema.ts",
  "packages/persistence/src/test-support/**",
  "apps/api/src/http-boundary/fixtures.ts",
  "apps/api/src/main.ts",
  "apps/worker/src/main.ts",
  "apps/worker/src/reconcile-command.ts",
]);
