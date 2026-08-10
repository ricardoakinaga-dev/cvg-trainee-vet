# 0118 — Estratégia de Testes, Rastreabilidade e Verificação

## 1. Objetivo

Garantir que toda construção possa ser ligada ao requisito que a motivou, ao código que a implementa, ao teste que a prova, ao commit que a alterou e ao artefato de execução que a verificou.

## 2. Pirâmide de testes

| Camada | Ferramenta/ambiente | Escopo | Gate |
|---|---|---|---|
| unitário | Vitest, sem rede/DB | entidades, value objects, estados, políticas e funções puras | cada mudança de domínio |
| aplicação | Vitest com fakes | comandos, queries, autorização, idempotência e redaction | cada caso de uso |
| contrato | Vitest + Zod/OpenAPI | DTOs, erros, eventos e compatibilidade | cada alteração de contrato |
| integração | Vitest + PostgreSQL/Qdrant efêmeros | repositórios, migrações, RLS, outbox e busca filtrada | cada adapter/fluxo |
| worker | harness de jobs | lease, retry, crash, replay e circuit breaker | cada job |
| web | React Testing Library/DOM + axe | estados, formulário, acessibilidade e projeção | cada tela/componente crítico |
| E2E | Playwright | login, convite, trilha, tentativa, feedback, autoria e isolamento de papel | cada release |
| segurança | audit, secret scan, SAST e testes negativos | entrada, autorização, exposição, dependências e segredos | PR e release |
| smoke | ambiente de homologação | health, login sintético, leitura e submissão | pós-deploy |

## 3. Cobertura e qualidade

- mínimo global: 80% de linhas, funções, branches e statements;
- regras críticas de domínio (autorização, estados, idempotência, exposição e cálculo) devem ter cobertura de decisão completa;
- cobertura não substitui testes de contrato, integração e E2E;
- testes devem ser determinísticos, isolados e paralelizáveis;
- tempo alvo de unitários/contratos < 60 s e integração/E2E dividido em jobs paralelos;
- nenhum teste acessa serviço externo real ou usa segredo de produção;
- fixtures são sintéticas, pequenas e versionadas; não copiar PDF, foto, prontuário ou caso identificável.

## 4. TDD obrigatório

Para toda funcionalidade, bug ou refatoração:

1. registrar o cenário e IDs de rastreabilidade;
2. escrever teste RED que falha pelo motivo esperado;
3. implementar o mínimo GREEN;
4. refatorar mantendo imutabilidade e limites de módulo;
5. executar suíte afetada e regressão;
6. anexar resultado ao commit/PR.

## 5. Manifesto de rastreabilidade

Manter `traceability.yml` no projeto com entradas deste formato:

```yaml
- id: BLD-009
  requirements: [PRD-RN-..., SPEC-0105]
  code: [packages/domain/attempt, apps/api/attempts]
  contracts: [API-ATTEMPT-001, EVT-attempt.submitted.v1]
  tests: [UNIT-ATTEMPT-001, INT-ATTEMPT-002, E2E-LEARNING-001]
  verification: [ci-unit, ci-integration, ci-e2e]
  status: verified
```

Convenções:

- teste nomeado `UNIT-*`, `APP-*`, `CONTRACT-*`, `INT-*`, `WORKER-*`, `WEB-*`, `E2E-*` ou `SEC-*`;
- comentário `@trace` só quando o vínculo não puder ser expresso no manifesto/teste;
- commit convencional inclui ID do backlog quando aplicável;
- alteração sem entrada no manifesto falha a verificação de rastreabilidade;
- o manifesto não contém conteúdo bibliográfico ou dado de usuário, apenas IDs e caminhos técnicos.

## 6. Pipeline verificável

```text
pnpm format:check
→ pnpm lint
→ pnpm typecheck
→ pnpm test:unit --coverage
→ pnpm test:contract
→ pnpm test:integration
→ pnpm test:worker
→ pnpm test:e2e
→ pnpm verify:migrations
→ pnpm verify:traceability
→ pnpm verify:exposure
→ pnpm audit --prod
→ pnpm verify:secrets
→ build + artifact digest
```

Um gate vermelho impede merge/release. Falhas intermitentes devem ser isoladas e corrigidas; não marcar teste como flaky para ocultar falha. Artefatos mínimos: relatório de cobertura, resultados JUnit, trace de E2E, diff OpenAPI, migração aplicada, scan de segredo/dependência, hash do commit e imagem.

## 7. Verificações de exposição

Testes negativos tentam introduzir e encontrar em DTOs, eventos, logs, notificações e telas: `source_id`, obra, autor, edição, capítulo, página, hash de fonte, PDF, OCR, foto, figura, tabela, link, prompt, resposta de IA, gabarito e dado real. O resultado esperado é rejeição ou ausência em toda superfície de participante.

## 8. Verificação contínua

- pre-commit: format, lint afetado, teste rápido e secret scan;
- pull request: suíte completa paralela e revisão do diff;
- nightly: E2E completo, migração/restauração sintética, reconciliação Qdrant e teste de carga pequeno;
- pós-deploy: smoke, health, logs redigidos e comparação de erro/latência;
- incidente: reproduzir com teste de regressão antes de encerrar.

## 9.1 Evidência adicional — BUILD F3-S4

- `tests/e2e/participant-access.spec.ts` cobre convite aceito, erro público limitado, projeção sem campos autorais/internos e o ciclo iniciar–salvar–submeter;
- `playwright.config.ts` fixa Chromium, servidor web local, artefatos de trace/screenshot/video e relatório JUnit/HTML;
- `.github/workflows/quality.yml` instala o navegador e executa `pnpm test:e2e` depois do build;
- a dependência `@playwright/test` está em `1.55.1`, versão sem o alerta de auditoria encontrado na versão anterior;
- os fixtures são sintéticos e as rotas da API são interceptadas; portanto esta evidência não substitui E2E contra API/PostgreSQL/Qdrant reais nem auditoria de acessibilidade completa.

## 9. Evidência materializada nesta construção

- contratos de convite: `packages/contracts/src/invitation.test.ts`;
- caso de uso de identidade: `packages/application/src/invitation-use-cases.test.ts`;
- mapeamento/repositorio: `packages/persistence/src/invitation-repository.test.ts`;
- API e cookie: `apps/api/src/http.test.ts` e `apps/api/src/server.test.ts`;
- integração PostgreSQL real, migração `0006` e aceite único: `tests/integration/postgres-invitation.test.ts`;
- resultado atual da suíte unitária/contratos: cobertura global acima de 80% em statements, branches, functions e lines; integração live é executada separadamente com banco efêmero.

## 10. Evidência adicional — BUILD F3-S6

- `apps/api/src/request-security.test.ts` cobre rate limit bounded, janela, expiração, limite de chaves, configuração inválida, métodos seguros, origem/referer/metadado Fetch permitido e rejeitado;
- `apps/api/src/server.test.ts` cobre rejeição cross-origin antes do caso de uso, `429` com `Retry-After` e exclusão de liveness do limite;
- `pnpm exec tsc -b --pretty false` e os testes API direcionados passaram após a integração;
- a política não lê nem registra payload de requisição rejeitada e não interfere no aceite anônimo de convite;
- a evidência anterior não fechava recuperação/rotação, rate limit compartilhado para múltiplas réplicas, E2E navegador→API real, RLS contextual ou auditoria integral de release; o item 8 agora cobre rotação/revogação existente, RLS contextual e rate limit PostgreSQL compartilhado no escopo registrado em `0501_security_isolation_audit.md`.

## 11. Evidência adicional — BUILD F3-S7

- `apps/worker/src/reconcile.test.ts` cobre reconstrução do conjunto esperado, atualização por hash, remoção de órfão, ausência de integração e ausência de texto no vetor;
- `packages/integrations/src/qdrant.test.ts` cobre a leitura paginada por `scroll/list` de metadados internos;
- `packages/persistence/src/content-repository.test.ts` cobre a porta PostgreSQL que lista somente versões `PUBLICADO` para o worker;
- `tests/integration/qdrant-live.test.ts` validou `list`/scroll junto com coleção, upsert, busca e remoção em Qdrant local;
- `pnpm reconcile:qdrant` é o comando operacional e imprime somente contadores técnicos; o cenário live conjunto não vazio foi fechado no item 11 por `tests/integration/worker-qdrant-live.test.ts`, enquanto a execução dentro do CI e a telemetria externa continuam pendentes.

## 12. Evidência adicional — BUILD F3-S8

- `packages/application/src/session.test.ts` cobre rotação válida, revogação do cookie antigo, preservação do principal e cookie de limpeza;
- `packages/contracts/src/session.test.ts` cobre duração padrão bounded e rejeição de campos desconhecidos;
- `apps/api/src/http.test.ts` cobre logout uniforme, rotação com novo cookie e ausência de token no envelope;
- `tests/integration/postgres-answer-session.test.ts` cobre rotação real e invalidação do cookie anterior no PostgreSQL;
- o contrato permanece independente de Qdrant/IA e os testes não usam dados reais.

## 13. Evidência adicional — BUILD item 9

- RED/GREEN: `packages/contracts/src/journey.test.ts` e `packages/application/src/journey-use-cases.test.ts` falharam antes da implementação por módulos ausentes e passaram após contrato/caso de uso;
- persistência: `packages/persistence/src/journey-repository.test.ts` cobre escopo vazio, agregação, tentativa mais recente, ausência de tentativa e metadados inválidos;
- API: `apps/api/src/http.test.ts` cobre autenticação, projeção agregada e ausência de identidade/escopo na resposta;
- live: `tests/integration/postgres-security-isolation.test.ts` lê a jornada por papel `NOSUPERUSER NOBYPASSRLS` e verifica participante cruzado vazio;
- web: `tests/e2e/participant-access.spec.ts` cobre o fluxo sem `activityId` e cinco regressões da superfície participante;
- cobertura da rodada: 323 testes passaram, 11 foram ignorados; statements 85,01%, branches 80,19%, functions 86,53%, lines 85,72%;
- o E2E permanece com API interceptada; a prova navegador→API/PostgreSQL/Qdrant real continua requisito de operação/CI posterior.

## 14. Evidência executável do item 10

- RED/GREEN: contratos, currículo, aplicação, persistência e API receberam testes antes dos módulos de autoria/revisão;
- integração: `tests/integration/postgres-authoring-workflow.test.ts` prova persistência da decisão, projeção redigida e sequência de publicação governada; `postgres-worker.test.ts` prova processamento de eventos com relógio determinístico;
- E2E: `tests/e2e/authoring-review.spec.ts` cobre a tela interna, gabarito/rubrica para revisor e decisão sem exposição ao participante;
- cobertura da rodada: 341 testes passaram, 12 foram ignorados por dependências live; statements 84,69%, branches 80,08%, functions 85,74%, lines 85,38%;
- integração live completa: 16 arquivos/22 testes passaram e 1 foi ignorado por configuração; migration 0014 aplicada;
- limites: revisão clínica humana, aplicação real, E2E navegador→API real, restore e transação editorial única não são declarados como concluídos.

## 15. Evidência executável do item 11

- RED/GREEN: `apps/worker/src/handlers.test.ts` primeiro falhou pela ausência da matriz de eventos e passou após `WORKER_RECOGNIZED_EVENT_TYPES` e os handlers no-op explícitos;
- worker: `apps/worker/src/loop.test.ts`, `apps/worker/src/handlers.test.ts` e `apps/worker/src/reconcile.test.ts` cobrem sucesso, falha parcial, backoff, dead-letter, redaction, fallback desligado, divergência e órfão;
- live: `tests/integration/worker-qdrant-live.test.ts` prova PostgreSQL→Qdrant não vazio, hash divergente, órfão, replay determinístico, retirada e reconciliação repetida; `tests/integration/postgres-worker.test.ts` prova lease expirado, reclaim, retry e dead-letter;
- resultado da rodada: `pnpm test:coverage` passou com 74 arquivos/343 testes e 14 skips; cobertura 84,70% statements, 80,08% branches, 85,76% functions e 85,38% lines; E2E 7/7; integração live 18 arquivos/25 testes sem skips;
- limites: restart observável, provider produtivo, telemetria externa, carga, restore e E2E navegador→API real continuam pendentes e não são declarados por esta evidência.

## 16. Evidência executável do item 12

- RED/GREEN: o teste HTTP de health/dependencies falhou com 404 antes da rota existir e passou após composição redigida, classificação READY/DEGRADED/NOT_READY e wiring no runtime;
- RED/GREEN: o teste de exportação falhou quando MetricsPort não possuía prometheus e passou após renderização Prometheus allowlisted, autenticação interna e projeção sem campos proibidos;
- SLO/alertas: packages/observability/src/operations.test.ts cobre definições válidas/ inválidas, PASS, BREACHED, NO_DATA, PostgreSQL crítico, Qdrant degradado e ausência de amostras;
- live health: tests/integration/api-health.test.ts iniciou API real com PostgreSQL/Qdrant locais, verificou ready/dependencies e confirmou resposta sem URL, segredo, password ou api_key;
- restore: tests/integration/postgres-restore.test.ts chamou scripts/verify-postgres-restore.mjs, restaurou marcador sintético em banco isolado e limpou os artefatos; RTO local da rodada: 2.581 ms;
- limites: collector/OTel externo, retenção efetiva, dashboard provisionado, spans distribuídos, crash/failover, carga, múltiplas réplicas e E2E navegador→API real continuam pendentes.

## 17. Evidência executável do item 13

- web: `apps/web/app/page.tsx` mantém loading/empty/error/stale/retry e projeção pública limitada; `apps/web/app/authoring/page.tsx` e `apps/web/app/operations/page.tsx` separam a superfície interna da participante;
- acessibilidade: `tests/e2e/experience-accessibility.spec.ts` cobre skip link, foco de `main`, labels/descrições, IDs únicos, axe, retry, jornada vazia e viewport estreito de 390×844;
- proxy real: `apps/web/next.config.ts` usa `CVG_API_INTERNAL_URL` somente server-side e `tests/e2e/real-runtime.spec.ts` comprova navegador→web→API→PostgreSQL em health e no fluxo participante persistido sem interceptação;
- resultado: E2E mockado 12/12 e modo real 14/14, sem skips; `pnpm --filter @cvg/web typecheck` e build passaram;
- limites: leitor de tela/usuários, contraste em todos os estados e superfícies completas do PRD permanecem pendentes e são tratados nos itens próprios.

## 18. Evidência executável — item 14

- comandos por camada: `pnpm test:contract` (12 arquivos/36 testes), `pnpm test:worker` (4/24), `pnpm test:integration:live` (18/26 sem skips), `pnpm test:integration:restore` (1/1), `pnpm verify:migrations` e `pnpm verify`;
- cobertura: 352 testes passaram e 17 testes live ficaram fora do gate unitário por configuração; statements 84,92%, branches 80,34%, functions 85,89% e lines 85,61%; entrypoints de composição e alguns repositórios continuam com cobertura de módulo menor e permanecem visíveis no relatório;
- fixture real: `scripts/real-e2e-fixture-server.mjs` cria convite/atividade/conta/atribuição sintéticos em PostgreSQL, escreve fixture temporária, é usado por `tests/e2e/real-runtime.spec.ts` e remove os artefatos no shutdown;
- E2E: `pnpm test:e2e` passa 12/12; `CVG_RUN_REAL_E2E=true pnpm test:e2e` passa 14/14 com convite, jornada, tentativa, resposta e submissão persistidos; a projeção pública não exibe `participantId`, `participantText` ou `tokenHash`;
- migrations/CI: `scripts/verify-migrations.mjs` alinha 15 SQLs ao journal 0000–0014; `.github/workflows/quality.yml` declara PostgreSQL, aplica migrations, roda live/restore/E2E padrão/E2E real e audit;
- limites: execução remota do workflow, carga/failover/restart, múltiplas réplicas, leitor de tela e aprovação clínica continuam pendentes; nenhum teste usa PDF, foto, prontuário, tutor ou dado real.
