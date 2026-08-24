# 0513 — Auditoria do Agregado Gerencial de Reflexão Digital

**Data:** 2026-08-23
**Item:** REFLECTION-035 / AUD-P1-001
**Resultado:** `PASS_WITH_GAPS` — agregado local protegido e redigido; prova live e operação externa pendentes.

## Escopo

Esta rodada fecha a lacuna local do agregado gerencial de reflexão por
`scopeId`/`moduleId`. A superfície conta apenas `NAO_INICIADA`, `EM_ANDAMENTO` e
`CONCLUIDA`, mantém `totalAssignments` como denominador explícito e declara
`REFLEXAO_DIGITAL`/`PROIBIDO_MVP`. Não há score, gabarito, ranking, texto livre,
identidade de participante ou claim de competência prática.

## Implementação

- caso de uso imutável em `packages/application/src/reflection-management-use-cases.ts`;
- contrato strict e query allowlisted em `packages/contracts/src/reflection-management.ts`;
- repositório PostgreSQL em `packages/persistence/src/reflection-management-repository.ts`;
- rota interna `GET /api/v1/internal/reports/reflections?scopeId=<uuid>` em
  `apps/api/src/http.ts`, com `VIEW_PROGRAM_METRICS` e escopo server-side;
- wiring de runtime em `apps/api/src/main.ts`;
- seção interna redigida em `apps/web/app/operations/page.tsx`, com loading,
  vazio, erro/retry, forbidden e tabela acessível;
- sem migration: a consulta bounded usa contexto `{scopeId, participantId}` por
  participante porque `answers` permanece protegida por RLS de participante;
  `answers.response` não aparece no select.

## Barra de qualidade

| Critério | Resultado | Evidência |
|---|---|---|
| Contagem por escopo/módulo | PASS local | `aggregateReflectionManagement`, denominador consistente e módulos ordenados. |
| Três estados | PASS local | reutilização de `deriveReflectionStatus`; testes para ausência, andamento e submissão completa. |
| Tentativa mais recente | PASS local | mapper determina `updatedAt DESC`, `version DESC`, `id DESC`; respostas são contadas por `itemId`. |
| RLS e mínimo necessário | PASS por inspeção + unit | contexto transacional de escopo e participante; query seleciona `answers.itemId`, nunca `response`. |
| Contrato e autorização | PASS local | schema strict, query strict, 401/403/422, escopo cruzado bloqueado e projeção pública allowlisted. |
| Experiência web | PASS local | estados explícitos, sem identidade/texto, E2E sintético e axe sem violações. |
| Nota/competência clínica | PASS | não há score, gabarito, publicação, aprovação clínica ou competência prática. |
| PostgreSQL live/RLS real | GAP | teste preparado em `tests/integration/postgres-reflection-management.test.ts`, mas `CVG_TEST_DATABASE_URL` não está disponível nesta execução. |
| Escala e operação | GAP | custo O(participantes), collector/OTel, retenção, carga, failover, restore e execução navegador→API real continuam sem evidência autorizada. |

Uma crítica independente read-only, focada na fronteira de persistência e contrato,
confirmou `PASS`: o repositório seleciona somente `answers.itemId`, aplica
`scopeId` antes da leitura de membros e `{scopeId, participantId}` antes da leitura
de respostas, e os schemas strict rejeitam identidade e campos extras. A crítica não
substitui a prova live nem a revisão operacional completa.

## TDD e verificações locais

A primeira regra teve RED observável por módulo ausente e passou em GREEN após a
implementação; a refatoração extraiu a semântica de estado compartilhada. O mapper,
contrato, HTTP e E2E receberam testes focados.

- `pnpm exec vitest run --coverage --project unit` — PASS, 94 arquivos/466 testes;
  84,20% statements, 80,03% branches, 85,09% functions, 84,91% lines;
- `pnpm test:e2e -- tests/e2e/operations-dashboard.spec.ts` — PASS, 5/5;
- `pnpm exec tsc -b --pretty false` — PASS;
- `pnpm build` executado pelo build E2E — 12 workspaces PASS;
- `pnpm exec vitest run tests/integration/postgres-reflection-management.test.ts --project integration` — 1 teste skipped por ausência de banco live; não é evidência de PASS.

O gate completo (`pnpm verify`), audit de dependências, secrets, documentação,
exposição, migrations e traceability estrutural passaram após a implementação.
`CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` também passou em
worktree limpo, com `REFLECTION-MANAGEMENT-035` ligado ao commit de código
`9a618e9c6163f0a2e8056191481b8f1c71d1aea1`; o fechamento documental está em
`cf300fb`. Nenhum workflow remoto, push, publicação clínica ou piloto é inferido
nesta auditoria.

## Gaps e próxima ação

`REFLECTION-035` permanece `COMPLETED_WITH_GAPS`: o núcleo participante e o
agregado interno local estão materializados, mas a prova PostgreSQL/RLS real e a
operação externa permanecem pendentes. A próxima fatia local é apelação/contestação
ou filtros/paginação/exportação, conforme o backlog e a decisão de Ricardo; nenhum
desses caminhos pode expor resposta livre ou converter evidência digital em
competência prática.
