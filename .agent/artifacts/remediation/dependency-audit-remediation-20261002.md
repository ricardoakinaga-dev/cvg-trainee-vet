# Production dependency audit remediation — 2026-10-02

## Finding

`pnpm audit --prod` reported 11 advisories in the worktree dependency graph:
one critical advisory for `next@16.3.4` and ten advisories for transitive
`undici@7.29.0` under `@qdrant/js-client-rest@1.19.0` (two high, five moderate,
three low). The GitHub-reviewed Next.js advisory marks `16.3.6` patched; the
undici advisories mark `7.29.1` patched.

## Remediation

- Pinned `apps/web` to `next@16.3.6`.
- Added the exact transitive override `undici@7.29.0` → `7.29.1` in the root
  pnpm overrides and refreshed the lockfile with pnpm 10.33.0.
- The initial `@cvg/web` typecheck exposed a narrowing issue in the synthetic
  CSV browser test. The test now checks the Blob captured by the object-URL spy,
  preserving the same download assertions.

## Verification

- `pnpm audit --prod`: no known vulnerabilities after the upgrades.
- `pnpm --filter @cvg/web typecheck`: PASS.
- `pnpm --filter @cvg/integrations typecheck`: PASS.
- `tests/operations.browser.test.tsx`: 23/23 PASS.
- Full workspace `pnpm typecheck`: PASS; full `pnpm lint`: PASS.
- Restore migration/policy integration: 10/10 PASS with Vitest `--no-cache`;
  the disposable PG16 drill returns `constraintsVerified=true` and
  `verificationDurationMs=1774`.

## Scope

This closes the advisories observed in the production dependency graph for
this worktree. It is not a production deployment or a claim about unrelated
development-only dependencies, external images, or future audit results.

## Advisory references

- [Next.js GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)
- [undici GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5)
- [undici GHSA-w293-vg96-wgc3](https://github.com/advisories/GHSA-w293-vg96-wgc3)
