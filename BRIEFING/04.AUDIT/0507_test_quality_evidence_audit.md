# 0507 — Auditoria de testes, cobertura e qualidade de evidência

**Data:** 2026-08-10, America/Sao_Paulo  
**Item:** 14 — Testes, cobertura e qualidade de evidência  
**Baseline:** 72/100  
**Resultado:** **96/100 — CONCLUÍDO COM GAPS**  
**Escopo:** qualidade técnica/documental da construção existente; não é aprovação clínica, piloto ou release.

## Veredito

O item 14 atingiu a meta. A suíte agora tem comandos nomeados para contrato, worker, integração live, restore, E2E, migrations e o gate completo; o fluxo participante real usa convite, atividade e persistência PostgreSQL sintéticos, sem interceptação do navegador; a integração live é separada em modo obrigatório PostgreSQL e modos opcionais Qdrant/restore; e o CI foi configurado para provisionar PostgreSQL, aplicar migrations, executar live integration, restore, E2E padrão e E2E contra API real.

O score permanece técnico e não declara cobertura integral do produto. A cobertura global passa de 80%, mas entrypoints de composição e alguns repositórios continuam abaixo de 80% por linha/decisão; o workflow do GitHub foi configurado, mas não foi executado nesta rodada no GitHub; e o restore local exige ferramentas PostgreSQL ou o container descartável explicitamente informado. Esses limites foram registrados, não convertidos em skips silenciosos.

## Matriz de avaliação

| Dimensão | Peso | Resultado | Evidência |
|---|---:|---:|---|
| Taxonomia, comandos e camadas de teste | 20 | 20 | `test:contract` 12 arquivos/36 testes; `test:worker` 4/24; unit/application/contract/integration/web/E2E/security nomeados no package e SPEC. |
| Cobertura global e invariantes críticas | 20 | 18 | 352 testes passaram na cobertura; statements 84,92%, branches 80,34%, functions 85,89%, lines 85,61%; módulos de entrada/composição fracos permanecem explícitos. |
| Integração live persistida | 20 | 20 | `test:integration:live`: 18 arquivos/26 testes, sem skips; cenários PostgreSQL com RLS, jornada, worker, autoria, migrations e health core. Qdrant estendido: 21/29 sem skips. |
| E2E real navegador→API→PostgreSQL | 20 | 20 | `pnpm test:e2e`: 12/12; `CVG_RUN_REAL_E2E=true pnpm test:e2e`: 14/14; convite, atividade, tentativa, resposta e submissão persistidos. |
| CI, migrations e reprodutibilidade | 15 | 13 | workflow provisiona PostgreSQL, roda `db:migrate`, live, restore, E2E padrão/real e audit; execução remota ainda não foi observada e restore depende de cliente/container. |
| Rastreabilidade, segurança e higiene de fixtures | 5 | 5 | migration governance RED/GREEN, fixture efêmera com limpeza, scan de segredos, fronteira pública e artefatos sem PDF, foto, prontuário, tutor ou dado real. |
| **Total** | **100** | **96** | — |

## RED → GREEN → REFACTOR

- **RED migration:** `tests/integration/migration-governance.test.ts` falhou antes de `scripts/verify-migrations.mjs` existir; o verificador foi implementado e os 2 testes passaram.
- **RED E2E real:** o primeiro modo real encontrou 404 no rewrite e ausência da atividade; `scripts/build-e2e.mjs` passou a injetar `CVG_API_INTERNAL_URL` no build real, e `scripts/real-e2e-fixture-server.mjs` passou a semear/limpar o cenário persistido.
- **GREEN:** o navegador completou aceite de convite, jornada, criação de tentativa, salvamento idempotente e submissão pela API real; nenhum campo `participantId`, `participantText` ou `tokenHash` apareceu na superfície pública.
- **REFACTOR:** o gate live separou PostgreSQL obrigatório de Qdrant/restore opcionais; a fixture Qdrant foi isolada por `scopeId` para não depender de conteúdo publicado residual de outros testes; o comando padrão não usa `describe.skip` para esconder dependência ausente.

## Comandos materializados

```text
pnpm test:contract
pnpm test:worker
pnpm test:integration:live
pnpm test:integration:restore
CVG_INCLUDE_LIVE_QDRANT=true pnpm exec node scripts/run-live-integration.mjs
pnpm test:e2e
CVG_RUN_REAL_E2E=true pnpm test:e2e
pnpm verify:migrations
pnpm verify
```

`test:integration:live` executa o conjunto PostgreSQL sem skips e exclui apenas os cenários explicitamente opcionais. `test:integration:extended` exige `CVG_TEST_QDRANT_URL` quando Qdrant é habilitado; a chave, se necessária pelo ambiente, permanece fora do repositório e dos logs. `test:integration:restore` exige cliente PostgreSQL instalado ou `CVG_RESTORE_DOCKER_CONTAINER` apontando para um container descartável.

## Gaps mantidos

- cobertura por módulo ainda é desigual: `apps/api/src/main.ts`, `apps/worker/src/main.ts`, entrypoint de reconciliação e alguns repositórios têm cobertura menor que 80%; a cobertura global não mascara esses números, que ficam no relatório V8;
- o workflow GitHub foi alterado, mas a execução desta rodada foi local; a prova remota depende do próximo job;
- não há teste de carga, failover, restart de processo ou múltiplas réplicas;
- a revisão manual com leitor de tela/usuários permanece no item 13;
- a completude curricular, a revisão clínica item a item, a aprovação de Ricardo e a aplicação hospitalar continuam gates clínicos independentes.

## Decisão

**Item 14 reavaliado em 96/100.** O gate numérico está fechado. O item 15 — CI, reprodutibilidade e prontidão de build — pode ser aberto pela ordem, mantendo release, piloto e publicação clínica bloqueados pelos gaps de produto, governança e operação.
