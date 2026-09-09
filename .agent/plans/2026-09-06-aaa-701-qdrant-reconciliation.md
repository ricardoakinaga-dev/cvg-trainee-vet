# ExecPlan — AAA-701: reconciliação Qdrant derivada

**Data:** 2026-09-06  
**Status:** IN_PROGRESS  
**Escopo:** endurecer a reconciliação local PostgreSQL → Qdrant sem alterar a
fonte transacional, contratos públicos, migrations, API ou UI.

## Objetivo

Garantir que o reconciliador observe todos os pontos internos aprovados,
inclusive pontos de versões antigas, compare identidade, escopo, hash, versão
do índice e modelo de embedding, e remova apenas pontos que não pertencem ao
conjunto esperado. PostgreSQL continua autoritativo; Qdrant permanece derivado
e reconstruível.

## Arquivos autorizados

- `packages/integrations/src/qdrant.ts`
- `packages/integrations/src/qdrant.test.ts`
- `packages/integrations/src/ai.ts`
- `packages/integrations/src/ai.test.ts`
- `packages/persistence/src/database.ts`
- `packages/persistence/src/database.test.ts`
- `apps/worker/src/reconcile.ts`
- `apps/worker/src/reconcile.test.ts`
- `apps/worker/src/handlers.test.ts`
- `apps/worker/src/main.ts`
- este plano, artefato, backlog, log, runtime state e `traceability.yml`

Não alterar migrations, schema transacional, rotas HTTP, projeções públicas,
conteúdo clínico ou configuração de produção.

## TDD e aceitação

1. RED: testes reproduzem ponto antigo que `list()` não devolve, drift de
   `indexVersion`/`embeddingModel`, hash/escopo divergente, órfão, idempotência,
   integração desligada e ausência de texto em payload/chamada.
2. RED adicional: concorrência deve compartilhar/executar sob exclusão
   PostgreSQL; um no-op não deve chamar o provider de embedding; o scroll deve
   usar allowlist de payload; o provider deve declarar o modelo que gera o
   vetor.
3. GREEN: o port interno expõe metadados de versão/modelo; `list()` observa
   pontos internos válidos de qualquer versão; o reconciliador serializa a
   operação, calcula metadados antes de embeddar, embeda apenas drift e
   remove órfãos/versões antigas com contadores determinísticos.
4. REFACTOR: manter filtros de busca restritos à versão/modelo operacional
   vigente, chamadas vazias sem mutação, payload allowlisted e tipos
   strict/imutáveis.
4. Verificar testes focais, typecheck/build dos workspaces, `pnpm verify`,
   documentação, rastreabilidade, diff-check e crítica independente read-only.

## Limites e rollback

- Não há execução Qdrant/PostgreSQL live disponível nesta rodada; testes usam
  fakes sintéticos e não promovem a task a `COMPLETED`.
- Rollback local: reverter a fatia dos quatro arquivos de código/teste por
  commit/fatia revisada, sem resetar o worktree inteiro.
- Falha de contrato, typecheck ou teste impede avanço e preserva o primeiro
  erro; nenhuma limpeza destrutiva é feita fora dos IDs retornados por `list()`.
