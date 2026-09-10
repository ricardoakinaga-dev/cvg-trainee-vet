# 0004 — Final AAA Certification Baseline (2026-09-10, HEAD `dec78f7`)

Prompt: `docs/49_codex_master_prompt_final_aaa_certification.md` (§4).
Leituras prévias (§4.1–4.13): `AGENTS.md`, `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`, `docs/audits/state-of-art-final-audit-v3.md`, `docs/quality/scorecard.md`, `reports/mutation/mutation.json`, `.github/workflows/{quality,security,candidate}.yml`, `scripts/verify-same-sha.mjs` (+ `scripts/same-sha.mjs`), `scripts/verify-aaa-candidate.mjs`, `release-evidence/` + `staging-evidence/`.
Comando canônico: Node `>=22.22.0 <23` / pnpm `10.33.0` (ambiente atual: Node v24.20.0/pnpm 10.33.0 — fora do intervalo declarado; CI canônico permanece Node 22.22.0).

## HEAD atual

- HEAD: `dec78f7f5b86ea2afbf3f754d5f39aaafd8df0ba` (branch `main`, worktree limpo salvo `docs/49` + este doc)
- Log recente: `dec78f7` (docs publish) · `101bb5d` (coverage promotion format) · `7ba0114` (AAA-PROMOTE-001 coverage floor) · `c6cd12d` · `0a41ad6` · `789f308` (audit v3) · `19d5ca8` (OSV fix, HEAD auditado na v3)

## Coverage (`coverage/coverage-summary.json`, pós AAA-PROMOTE-001)

- Statements 90.91% · Branches 85.00% · Functions 96.03% · Lines 91.68%
- Meta §12/§37 (90/85/90/90): **PASS** — `node scripts/verify-coverage-floor.mjs` PASS nos 4 eixos
- Exclusões documentadas em `scripts/coverage-exclusions.mjs` (schema Drizzle, test-support, fixtures, entrypoints `main.ts`/`reconcile-command.ts`); nenhum código útil de domínio excluído

## Mutation raw (`reports/mutation/mutation.json`, Stryker 9, escopo `packages/application/src/authorization.ts`)

- Total 219 · Killed 155 · Survived 64 → **raw 70.78%**
- Alvo §10 (adjusted critical ≥ 90%, real critical survivors = 0): **ABERTO** → AAA-CERT-001
- Distribuição dos 64 sobreviventes: ~34 `StringLiteral`/`ArrayDeclaration` no conjunto `CAPABILITIES` (linhas 47–80) · ~12 `StringLiteral` em labels de `case`/role strings · ~8 `ConditionalExpression`/`BlockStatement` (fallthroughs de corpo idêntico + `GRANT→default`) · ~6 `LogicalOperator`/`EqualityOperator` em guards (`hasScope`, `hasScopedStaffRole`, `VIEW_OWN_*`)
- Classificação mutant-por-mutant: `docs/quality/mutation-classification-v4.md` (AAA-CERT-001); killer tests comportamentais em `packages/application/src/authorization.*.test.ts`; summary machine-readable em `reports/mutation-summary.json`
- Mutation adjusted: calculado após os killer tests (fórmula: `killed / (total − equivalent)`; TOOL_ARTIFACT documentados separadamente, nunca somados como kills)

## Status quality / security / candidate (local, HEAD atual)

- `pnpm verify:coverage-floor`: PASS (90.91/85.00/96.03/91.68)
- `staging-evidence/test-summary.json`: 189 arquivos / 1091 testes PASS, 63 skips (fonte: `pnpm verify` em 2026-09-10)
- `staging-evidence/security-summary.json`: `pnpm audit --audit-level=high` PASS; residual 3 moderate dev-only (vitest) + 1 low; CodeQL remoto success; OSV reusable workflow; `verify:secrets` clean
- `pnpm verify` completo + `pnpm verify:aaa-candidate`: a reexecutar após AAA-CERT-001/002/004 (gate passa a exigir mutation JSON, Redis candidate, staging fresh e P0/P1 via JSON)

## Redis candidate status

- `apps/api/src/security/rate-limit-store.ts`: `createRedisRateLimitStore` (Lua INCR+PEXPIRE+PTTL atômico, timeout 500 ms, AbortSignal) + `Memory` (fallback explícito single-node/teste) + `Scripted` (fake determinístico); fail policy por classe de risco no guard
- `tests/integration/ratelimit-redis-live.test.ts` + `staging-evidence/multi-instance-summary.json`: PASS no SHA `19d5ca8` (5/5 contra Redis real) — **stale para o HEAD atual** → AAA-CERT-003 regenera `release-evidence/redis-candidate-summary.json` com backend/instances/atomicity/shared-budget/restart/timeout/spoof
- Staging atual usa PG shared limiter nas 2 réplicas (429 nas duas); Redis como backend efetivo do candidate ainda sem runtime evidence no HEAD → sem fallback silencioso para Memory

## Staging status

- `scripts/run-staging.mjs verify`: stack PG embarcado + API×2 + worker + fixture + web + TLS + coletor OTel; 5 drills JSON + 6 checks HTTP + 1 jornada browser→web→API→PostgreSQL + k6 baseline (3000 req, p95 25.6 ms, 0 checks failed) — evidência em `staging-evidence/` no SHA `19d5ca8`, **stale para o HEAD atual** → AAA-CERT-005 reexecuta e publica `staging-summary.json` fresh
- RLS live 7/7 (`staging-evidence/rls-live-summary.json`) igualmente stale → reexecutar no candidate SHA

## P0 / P1 / P2

- P0 = 0 · P1 = 0 (audit v3 §30/§38, sem achado crítico novo nesta base; a confirmar adversarialmente na v4)
- P2 residuais (v3 §36): RF-01 cobertura (FECHADO localmente por AAA-PROMOTE-001 — 90.91/85.00/96.03/91.68) · RF-02 remote same-SHA verde do HEAD não confirmado · RF-03 mutation 70.78% < 90% · RF-04 arquivos grandes remanescentes · RF-05 advisories dev-only · RF-06 Redis não operado como backend candidate
- AAA-001 segue `WAITING_HUMAN_APPROVAL` (metas SLO/RPO/RTO, piloto, autoridade de ambientes) — engenharia técnica não finge fechamento (§80)

## Gaps AAA-CERT (estado nesta base)

| Gap | Estado |
|---|---|
| AAA-CERT-001 Mutation Assurance Closure | ABERTO — raw 70.78%, sem classification 1-a-1, sem summary JSON, sem gate |
| AAA-CERT-002 Remote Same-SHA Proof | ABERTO — verifier só cobre quality/security, sem candidate, sem auth enforcement, sem bounded polling, sem remote-ci-summary |
| AAA-CERT-003 Durable Redis Candidate | ABERTO — live 5/5 stale (`19d5ca8`), staging usa PG shared, sem redis-candidate-summary no HEAD |
| AAA-CERT-004 Evidence Freshness & Scorecard | ABERTO — scorecard aponta `19d5ca8`/audit v3; release-evidence aponta `19d5ca8`; sem mutation/remote-ci/redis/staging summaries fresh |
| AAA-CERT-005 Independent Final Audit v4 | ABERTO — sem audit v4 md+json, sem staging revalidation no HEAD |

Nenhum deploy, dado real, conteúdo clínico publicado ou claim de produção nesta base.
