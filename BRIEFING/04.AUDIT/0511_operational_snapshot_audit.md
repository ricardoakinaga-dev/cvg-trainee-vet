# 0511 — Auditoria do Snapshot Operacional Local

**Data:** 2026-08-23
**Item:** AUD-P1-004 / OPS-034
**Resultado:** `PASS_WITH_GAPS` — bridge local verificado; operação externa continua pendente.

## Escopo

Esta rodada verificou a ligação executável entre métricas de processo, estado redigido
de dependências, SLOs e alertas. Não houve provider, produção, credencial, push,
collector externo, retenção efetiva, tracing distribuído, carga, failover ou dado
clínico.

## Barra e evidência

| Critério | Resultado | Evidência |
|---|---|---|
| Derivação de disponibilidade | PASS | `deriveOperationalSnapshot` soma somente `api.requests.total` e classifica `success` como evento bom. |
| SLOs sem amostra | PASS | `api.read.p95` e `api.mutation.p95` ficam `NO_DATA`; cada ausência abre `slo_no_data`. Nenhum p95 é inferido de `min/max`. |
| Estados de dependência | PASS | `READY`, `DEGRADED` e `NOT_READY` preservam `qdrant_degraded` e `postgres_not_ready` com severidade definida. |
| Boundary HTTP | PASS | `GET /internal/operations` usa `VIEW_INTERNAL_AUDIT`; testes cobrem 401, 403, 200 redigido, 422 para query/body inesperados e 503 em falha da dependência. |
| Redaction | PASS | O handler valida os enums em runtime e projeta somente `postgres`, `qdrant` e `ai`; snapshot e respostas não carregam participante, e-mail, token, cookie, prompt, fonte, foto, PDF ou texto clínico. |
| Operação externa | GAP | collector/OTel, retenção, dashboard histórico, restart/crash, carga, múltiplas réplicas e failover dependem de ambiente autorizado. |

## TDD

- RED: teste do bridge falhou porque `deriveOperationalSnapshot` não existia.
- GREEN: funções puras, rota HTTP e normalização de rota foram implementadas; os testes
  direcionados passaram.
- REFACTOR: contrato foi mantido pequeno, sem introduzir fornecedor ou amostra não
  bounded; o limite p95 foi documentado como `NO_DATA`.

## Evidência executada nesta rodada

- `PATH=/tmp:$PATH pnpm typecheck` — PASS;
- `PATH=/tmp:$PATH pnpm lint` — PASS;
- testes direcionados API/observabilidade — PASS, incluindo matriz 401/403/422/503;
- `PATH=/tmp:$PATH pnpm verify` — PASS, 99 arquivos/474 testes, 22 skips de arquivo/24 skips de teste; cobertura 84,49% statements, 80,22% branches, 85,64% functions e 85,18% lines;
- `PATH=/tmp:$PATH pnpm exec vitest run apps/api/src/http.test.ts apps/api/src/server.test.ts packages/observability/src --project unit` — PASS, 67 testes;
- `PATH=/tmp:$PATH pnpm build` — PASS nos 12 workspaces;
- `PATH=/tmp:$PATH pnpm test:e2e` — PASS, 20/20 cenários;
- `PATH=/tmp:$PATH pnpm audit --audit-level=high` — nenhum advisory conhecido;
- `pnpm verify:ci-contract`, `verify:migrations`, `verify:documentation`, `verify:traceability` e `verify:exposure` — PASS;
- `git diff --check` — PASS.

## Decisão

O bridge local pode ser usado como sinal técnico interno e como base para um collector
futuro. Ele não fecha `AUD-P1-004`, não comprova disponibilidade histórica, RPO/RTO de
produção ou recuperação operacional, e não autoriza release, piloto ou publicação
clínica.
