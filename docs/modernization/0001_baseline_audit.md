# 0001 — Baseline Audit (Phase 0) — State of Art / Triplo AAA

- **Data:** 2026-09-09 (UTC)
- **HEAD auditado:** `e3501e4` (branch `aaa/round-10-verification`)
- **Prompt canônico:** `docs/46_codex_master_prompt_state_of_art_triple_aaa.md`
- **Método:** inspeção direta do worktree + `AGENTS.md` + `docs/99_runtime_state.md` +
  `docs/20_master_execution_log.md` + `docs/30_backlog_master.md` +
  `architecture-boundaries.json` + `pnpm audit` + medição de arquivos.
  Cobertura/testes citados são o baseline oficial registrado no runtime state
  (Round-10: 151 arquivos/835 testes, 84,49% stmt / 80,35% branch / 87,37% func /
  85,24% lines, E2E 45/45); não foram reexecutados integralmente neste documento.
- **Classificação:** P0 critical · P1 high · P2 medium · P3 low.
  Problemas estéticos não são P0/P1.

## 1. Arquitetura atual

Modular monolith real, não apenas declarado:

- `apps/api` (HTTP/CSRF/rate-limit/health), `apps/worker` (outbox, reconcile,
  retry bounded), `apps/web` (Next.js, proxy server-side `__Host-cvg_session`).
- `packages/domain` e `packages/curriculum` puros (sem imports `@cvg/`/node/drizzle,
  verificável por `architecture-boundaries.json` + `verify:architecture`).
- `packages/application` isolada de persistência/integrações por policy executável.
- `packages/persistence` (Drizzle, 56 migrations `0000→0054`, RLS contextual,
  least-privilege por allowlist de 29 tabelas), `packages/contracts` (schemas strict),
  `packages/config` (env validado), `packages/observability` (logs redigidos,
  métricas, SLO, alertas), `packages/integrations` (Qdrant/AI com fallback seguro).
- PostgreSQL = source of truth; Qdrant = índice derivado reconstruível
  (`reconcile:qdrant` com advisory lock, orphan cleanup); IA = assistiva,
  server-side, structured-output, desligável (`AI_ENABLED=false` por padrão).

Estado real ≈ documentação. Nenhuma divergência material encontrada neste corte.

## 2. Dependências (baseline)

- Node `>=22.22.0 <23` / pnpm `>=10.33.0 <11` declarados; shell local desta rodada
  usa Node `24.20.0`/pnpm `10.33.0` (desvio já registrado no runtime state; CI usa
  Node `22.22.0` — evidência local ≠ evidência CI).
- PostgreSQL 16 / Qdrant `v1.15.5` no CI; `next 16.3.0`, `react 19.2.0`.
- `@qdrant/js-client-rest@1.19.0` com patch local rastreável (`patches/`).
- `pnpm audit --audit-level=high` (2026-09-09, rede disponível) = **6 achados**:
  2 critical (Next.js RCE Windows-hosted; Next.js Image Optimization AVIF —
  ambos com patch `>=16.3.3`), 1 high (`sharp <0.35.4` via `next`), 1 high
  (`js-yaml <4.3.2` via `eslint`, dev-only) + 2 moderate. Ver §10.

## 3. Hotspots / tamanho / coupling

| Arquivo | Linhas | Diagnóstico |
| --- | ---: | --- |
| `apps/api/src/http.test.ts` | 5098 | God Test — espelha o God Module |
| `apps/api/src/http.ts` | 4267 | **God Module** — handlers+authz+validação+presenters |
| `packages/curriculum/src/catalog.ts` | 1595 | Sobre o budget; domínio puro, risco médio |
| `packages/persistence/src/schema.ts` | 1531 | Schema monolítico; aceitável, mas sem partição |
| `packages/persistence/src/learning-state-repository.ts` | 1406 | Sobre o budget |
| `packages/persistence/src/diagnostic-session-repository.ts` | 1282 | Sobre o budget |
| `packages/curriculum/src/learning-runtime.ts` | 1266 | Sobre o budget |
| `packages/integrations/src/ai.ts` | 650 | Limite; fallback/quota já implementados (AAA-700) |
| `apps/api/src/main.ts` | 552 | Bootstrap; verificar extração futura |
| `apps/api/src/server.ts` | 520 | `routeTemplate()` manual (~60 ramos) — segunda lista p/ telemetria |

Coupling: `http.ts` importa ~97 símbolos de `@cvg/application`; toda rota passa
pelo mesmo arquivo → blast radius máximo, review difícil, tendência a conflitos.
`server.ts`/`http.ts` duplicam conhecimento de rotas (`routeTemplate` × dispatch).
140 arquivos de teste; sem ciclos arquiteturais proibidos conhecidos
(`verify:architecture` verde no baseline oficial).

## 4. Cobertura / testes (baseline oficial Round-10)

151 arquivos / 835 testes, 42 skips, 84,49%/80,35%/87,37%/85,24%; E2E 45/45;
lives PG+Qdrant+restore verdes em descartável local (41/111); contrato CI 24 checks.
Pirâmide real: unit, application, domain, contract (86+), integration,
live integration (condicional a `CVG_TEST_DATABASE_URL`), security, worker, E2E
(sintético + real), restore. Ausentes: load baseline versionado, fault-injection
sistematizada, mutation score, property-based onde há ganho.

## 5. CI / release

`quality.yml` único: format→lint→typecheck→coverage→contract→worker→migrations→
secrets→traceability→architecture→documentation→product→exposure→migrate→
provision→live PG→live Qdrant→restore→build→playwright→real-E2E→audit→artifacts.
Sem workflow `security.yml`/`release.yml` separados; sem CodeQL, dependency-review,
OSV/Trivy; Actions com tags mutáveis (`checkout@v4`, `setup-node@v4`,
`upload-artifact@v4`); sem SBOM/provenance/assinatura; sem CODEOWNERS;
sem `SECURITY.md`/`CONTRIBUTING.md`. Release = 25/100 (dívida conhecida e honesta).

## 6. Segurança (baseline)

Forte: `__Host-` cookie, CSRF origin/referer/`sec-fetch-site`, rate-limit (memória,
single-node), body-limit 64 KiB, duplicate-query detection, RLS contextual + FORCE
em tabelas sensíveis, app sem `SUPERUSER`/`BYPASSRLS`, secrets só placeholders,
audit trail append-only, exposure gate. Lacunas: rate-limit não distribuído
(multi-instância insegura por omissão); sem `RateLimitStore` port; sem threat model;
sem authorization matrix gerada; sem security headers completos (CSP/HSTS avaliados,
não implementados); sem SSRF/outbound policy reutilizável; sem testes adversariais
dedicados além dos existentes; auditoria RLS cobre fatias, não 100% das tabelas.

## 7. Observabilidade / resiliência / operação

Reais: logs estruturados redigidos, métricas internas + Prometheus, SLO
(`core.availability` 0.995, read p95 800 ms, mutation p95 1500 ms), alertas,
`/health/live|ready|dependencies` com semântica correta (ready = PG-only,
Qdrant = DEGRADED), retry bounded com jitter/`Retry-After`, worker idempotente com
lease/fencing/dead-letter, graceful close parcial. Lacunas: sem OpenTelemetry real
(trace/span IDs, sampling, exporter); sem collector de referência; sem dashboard
provisionado; métricas nomeadas `api.*` (não no padrão OTel `http_*` — migração
avaliada, não aplicada para não quebrar SLO existente); sem timeout/deadline
propagado end-to-end documentado; sem DR plan; sem runbooks; sem fault-injection
layer; sem k6/autocannon baseline; sem circuit-breaker documentado (decisão pendente).

## 8. Deployability

Sem containers, sem manifestos de deploy, sem migração de runtime state para
`docs/runtime-history/` (state com ~637 linhas, histórico junto do corrente).
Deploy real, secrets reais, ACLs reais, telemetria prod, backup/restore prod,
tráfego prod e aprovação clínica: sem evidência (declarado; não é gap oculto).

## 9. Blockers externos (não viram desculpa p/ o verificável local)

`AAA-001` (definição operacional Triplo AAA, SLO/RPO/RTO, piloto, autoridade de
ambientes) aguarda Ricardo; run remoto same-SHA em acompanhamento; provider IA
real, collector prod, carga, failover, owners produtivos, conteúdo clínico publicado.

## 10. Achados classificados

- **P0 — nenhum.** Nenhum critical explorável no path de produção Linux atual com
  evidência de exploração; nenhum bypass de auth/RLS conhecido aberto.
- **P1 — 4:**
  - P1-01 `next 16.3.0` < `16.3.3`: 2 advisories critical (RCE Windows-hosted;
    Image Optimization AVIF). Severidade efetiva neste repo: high (deploy Linux,
    sem evidência de uso AVIF) → tratar como upgrade patch proporcional.
  - P1-02 `sharp <0.35.4` (via next): high (libheif). Resolve junto com P1-01.
  - P1-03 Rate-limit single-node sem abstração distribuída: bypass por
    multi-instância; fail policy e métricas de rejeição incompletas.
  - P1-04 `routeTemplate()` manual duplicado do dispatch: rota sem classificação
    passa despercebida (telemetria/autorização por listas paralelas).
- **P2 — 12:** P2-01 `js-yaml` dev-only; P2-02 sem threat model; P2-03 sem
  authorization matrix gerada; P2-04 sem security headers (CSP/HSTS);
  P2-05 sem SSRF/outbound policy; P2-06 sem OTel tracing real; P2-07 sem collector
  de referência; P2-08 sem DR plan/runbooks; P2-09 sem fault-injection layer;
  P2-10 sem load baseline; P2-11 Actions sem SHA-pin + sem security/release
  workflows; P2-12 sem SBOM/provenance/evidence bundle.
- **P3 — 6:** P3-01 runtime state com histórico acoplado; P3-02 `catalog.ts`/
  repositories >1000 linhas sem partição; P3-03 métricas `api.*` fora do padrão
  OTel; P3-04 sem CODEOWNERS/`SECURITY.md`/`CONTRIBUTING.md`; P3-05 sem mutation/
  property-based nas invariantes; P3-06 sem circuit-breaker decision record.

## 11. Oportunidades (ordem de valor/risco)

1. Registry declarativo de rotas + teste anti-drift (mata P1-04, prepara fases 1–2).
2. `RateLimitStore` port + memory/fake + risk classes (mata P1-03 sem Redis obrigatório).
3. `RequestContext` tipado + redaction (fases 1, 7, 25).
4. Security headers + threat model + authorization matrix (fase 2).
5. Upgrade `next 16.3.0 → ≥16.3.3` (mata P1-01/P1-02).
6. `security.yml` (CodeQL, dependency-review, OSV) + script de SHA-pin (fase 3).
7. SBOM (CycloneDX) + provenance + evidence bundle (fases 3, 7, 18, 58).
8. OTel tracing mínimo + collector de referência + SLO doc (fase 4).
9. Fault-injection test-only + k6 baseline separado (fase 6).
10. Runbooks + DR + ADRs + arquitetura `docs/architecture/` (fase 8).

## 12. Veredito Phase 0

Baseline congelado neste documento. Implementação autorizada a prosseguir em
fatias aditivas, TDD, sem big-bang em `http.ts`, sem upgrades em massa, sem dados
reais, sem claims de produção. Próximo: Phase 1 (registry, context, middleware).
