# AAA-701 — Remediação pós-crítica fresh (2026-09-09)

**Status:** `IN_PROGRESS` — P1/P2 das duas críticas tratados e verificados localmente; falta terceira revisão fresh, `AAA-001`, banco descartável autorizado e Qdrant live.
**Escopo:** `packages/integrations/src/qdrant.ts`, `apps/worker/src/reconcile.ts`, `packages/persistence/src/database.ts` + testes; `packages/integrations/src/evals.ts` (AAA-702), `ai-governance.test.ts` (AAA-703).

## 1. Primeira crítica fresh — REVISE (6 P1 + 4 P2)

- P1-1 busca servia vetores de modelo trocado; P1-2 `indexVersion`/`embeddingModel` vazios aceitos; P1-3 lock sem testes de erro e sem semântica documentada; P1-4 meio-configurado (XOR null) retornava sucesso silencioso; P1-5 drift só de hash/scope, wipe total e órfão de versão antiga sem testes isolados; P1-6 pontos com visibility/status desviados invisíveis ao scroll.
- P2-1 `sameMetadata` type-unsafe; P2-2 allowlist de search × scroll inconsistente; P2-3 precisão do artefato; P2-4 escopo do diff de `ai.ts`.

## 2. Correções aplicadas (RED → GREEN → REFACTOR)

- `qdrant.ts`: construtor rejeita modelo/versão vazios e com padding; `ensureCollection` indexa `embedding_model` (5 índices); filtro `must`, `with_payload` e pós-checagem do search exigem o modelo operacional; guard estrito no search (`isInternalPayload`) e tolerante no scroll (`isObservablePayload`, legado sem modelo mapeado para `""` para continuar observável); blind spot de visibility/status documentado no código.
- `reconcile.ts`: só `null/null` é no-op silencioso; XOR null/non-null falha fechado; `sameMetadata` com checagem explícita de `undefined`.
- `database.ts`: `withAdvisoryLock` reescrito por outcome — lock+unlock+release em todos os caminhos; erro do work prevalece com erro de release em `cause`; falha de release no caminho de sucesso vira rejeição (nunca sucesso silencioso); `release()` guardado; semântica bloqueante documentada no tipo.
- Testes novos: filtro de modelo com stale `score 0.95` × atual `0.9`; validação de vazio + padding; XOR fail-closed; drift só-hash; drift só-scope; wipe com fonte vazia sem chamar embedding; órfão de versão antiga; lock sucesso/erro/erro-duplo (com `cause`) / falha de release.

## 3. Segunda crítica fresh — REVISE com 1 P1 novo (procedente)

Encontrou: sucesso + falha de unlock engolia o erro (caminhos mortos). Corrigido com a reescrita por outcome + teste dedicado. Demais P2 (assert de `cause`, `release()` guardado, padding, documentação do blind spot) tratados. Confirmações do crítico: busca não serve mais modelo trocado com mesma versão; XOR não reporta mais sucesso silencioso.

## 4. Evidência corrente (fresca, local/sintética)

- `pnpm verify` — PASS ponta a ponta (format, ci-contract, lint, typecheck, coverage, contract 31 arq/95 testes, worker 5 arq/44 testes, migrations 54/54, secrets clean, traceability, architecture, documentation, product-definition, exposure).
- `pnpm test:coverage` — 151 arquivos PASS / 30 skipped; 831 testes PASS / 42 skipped; cobertura 84,49% stmts / 80,3% branch / 87,37% funcs / 85,24% lines (≥80 mínimo).
- `pnpm test:e2e` — 45/45.
- Focais do slice: 50 arquivos / 280 testes PASS; `tsc -b`, eslint e prettier limpos.

## 5. Gaps remanescentes (não fecháveis sem autoridade)

Terceira revisão fresh independente; `AAA-001` (Ricardo); `CVG_TEST_DATABASE_URL` descartável para lock cross-process live, RLS/concorrência e `AAA-202`; Qdrant live; provider IA real e evals sobre provider; workflow remoto same-SHA; clínica/piloto/produção. Nada aqui autoriza release, deploy, publicação clínica ou claim de competência.
