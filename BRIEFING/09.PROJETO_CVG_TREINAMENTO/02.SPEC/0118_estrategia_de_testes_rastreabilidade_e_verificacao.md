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

### Evidência adicional — JOURNEY-045

- RED/GREEN: o cenário `opens another assigned activity without losing the participant session` falhou antes da CTA e passou após `nextActionTarget`, handler client-side e deep link codificado serem implementados;
- contrato/aplicação/API: `packages/contracts/src/journey.test.ts`, `packages/application/src/journey-use-cases.test.ts` e `apps/api/src/http.test.ts` cobrem alvo allowlisted, relação com a atividade, ausência de campos internos e prioridade sem CTA quando runtime/correção prevalece;
- web: `apps/web/app/page.tsx` usa somente o alvo server-side, preserva a sessão, restaura tentativa/appeal e atualiza `?activityId` sem recarregar; `tests/e2e/participant-access.spec.ts` cobre seleção e ausência de CTA em atividade fora da próxima ação;
- rodada: `pnpm verify` passou com 125 arquivos/572 testes, 29 skips; cobertura 84,51% statements, 80,33% branches, 86,03% functions, 85,23% lines; build 12 workspaces e E2E 24/24;
- limites: o teste E2E usa projeção sintética, portanto não prova diagnóstico→assignment→activity real, RLS live, provenance/atomicidade ou publicação clínica.

### Evidência adicional — RESULT-FEEDBACK-046

- RED/GREEN: os cenários `shows persisted digital correction feedback without internal fields` e `shows a bounded waiting state when digital correction is unavailable` falharam antes do cartão e passaram após a consulta do endpoint público, parser allowlisted e estados de espera/erro/retry;
- contrato/API: `packages/contracts/src/correction.test.ts` e `apps/api/src/http.test.ts` preservam o contrato strict, owner-scoped e redigido; o backend não ganhou novo endpoint ou mutação;
- web: `apps/web/app/page.tsx` restaura a tentativa a partir da jornada, consulta feedback somente para tentativa corrigida/pendente, ignora campos internos, mostra score/outcome/feedback e reutiliza a `nextAction` server-side;
- rodada: `pnpm verify` passou com 125 arquivos/572 testes, 29 skips; cobertura 84,51% statements, 80,33% branches, 86,03% functions, 85,23% lines; build web e 13/13 E2E participantes passaram;
- limites: as fixtures são sintéticas e não provam RLS/PostgreSQL live, provenance/atomicidade assignment→atividade, correção clínica, remediação/retensão completas ou release operacional.

### Evidência adicional — JOURNEY-REL-001

- RED/GREEN: `packages/persistence/src/adaptive-assignment-repository.test.ts` falhou antes da materialização da relação e passou com cinco cenários, cobrindo vínculo explícito, replay e reparo de linha legada sem alterar status;
- persistência: `learning_activities.module_id`, `learning_assignments.source_diagnostic_result_id` e `activity_assignments.learning_assignment_id` são aditivos na migration `0026_assignment_activity_provenance.sql`; o teste live dedicado cobre a cadeia, proveniência e replay quando configurado;
- currículo: `createM02ContentSeed` e drafts de módulo carregam `moduleId`, enquanto o seed diagnóstico permanece sem módulo;
- verificação focal: typecheck de persistence/curriculum, `verify:migrations` com 27 migrations, testes unitários focais e `git diff --check` passaram localmente;
- limite: sem `CVG_TEST_DATABASE_URL`, os dois cenários live permaneceram skipped; RLS sem bypass, rollback transacional sob erro, concorrência real, sincronização de estados posteriores e E2E navegador→PostgreSQL continuam não observados.

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

## 19. Evidência adicional — EDITORIAL-QUEUE-027

- contratos e autorização: `packages/contracts/src/content-review-queue.test.ts`, `packages/contracts/src/internal-context.test.ts`, `packages/contracts/src/authoring.test.ts` e `packages/application/src/authorization.test.ts` cobrem projeções estritas, memberships, capability clínica configurada e ações role-aware;
- aplicação/persistência: `packages/application/src/content-review-queue-use-cases.test.ts`, `packages/application/src/authoring-use-cases.test.ts`, `packages/persistence/src/content-review-queue-repository.test.ts` e `packages/persistence/src/authoring-repository.test.ts` cobrem filtro por autor, contexto de escopo, empate determinístico da última decisão e rollback compensatório;
- banco: a migration `0017_editorial_scope_rls.sql` habilita e força RLS em `content_editorial_records` e `content_review_decisions`, com índice de decisão mais recente; a integração live confirmou as duas políticas e o índice em PostgreSQL efêmero;
- API/web: `apps/api/src/http.test.ts`, `apps/api/src/server.test.ts` e `tests/e2e/authoring-review.spec.ts` cobrem `scopeId` obrigatório, sessão de memberships, redaction, link de autoria condicionado ao papel/estado, ações de revisão condicionadas pelo servidor e ausência de gabarito/fontes;
- resultado da rodada: `pnpm verify` passou com 430 testes e 22 skips explícitos, cobertura 84,46% statements, 80,10% branches, 85,32% functions e 85,20% lines; `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou 18/18; integração PostgreSQL live passou 24 arquivos/35 testes sem skips;
- limites: auditoria negativa uniforme, entrega externa, contestação completa, transação editorial única, aprovação clínica humana, carga/failover e operação produtiva continuam pendentes; o banco e o papel administrativo descartáveis foram removidos ao final da prova.

## 20. Evidência executável — ACCOUNT-RECOVERY-028

- RED/GREEN: `packages/contracts/src/account-recovery.test.ts` valida requests/projeções estritos, limites bounded e redaction; `packages/application/src/account-recovery-use-cases.test.ts` cobre emissão somente para alvo ativo/escopado, recusa de contas inativas, consumo único e sessão nova; `packages/persistence/src/account-recovery-repository.test.ts` cobre hash/data inválidos e lookup vazio;
- API: `apps/api/src/http.test.ts` cobre emissão interna e aceite anônimo, incluindo ausência de `tokenHash`/`accountId` na resposta pública; `apps/api/src/server.test.ts` cobre as duas rotas e `tests/e2e/recovery-access.spec.ts` cobre remoção do token da URL, aceite e estado de sessão;
- banco: a migration `0018_account_recovery.sql` cria solicitações com hash único, expiração, consumo/revogação e snapshot de papéis/escopos; `tests/integration/postgres-account-recovery.test.ts` comprovou revogação de sessões anteriores, hash-only, aceite único, autenticação da nova sessão e auditoria sintética em PostgreSQL efêmero;
- resultado da rodada: `pnpm verify` passou com 96 arquivos/448 testes/22 skips de arquivo e 23 skips de teste, cobertura 84,73% statements, 80,50% branches, 85,49% functions e 85,50% lines; `pnpm build` passou nos 12 workspaces; a integração PostgreSQL live passou 25 arquivos/36 testes com roles de aplicação/admin separadas; `pnpm test:e2e` passou 19/19 e o build da web materializou `/recovery`;
- limites: o MVP não implementa senha/MFA/provedor ou entrega externa, não reativa contas suspensas/desativadas; RLS direto de identidade/solicitações está materializado nos itens `IDENTITY-RLS-029`/`030`, mas não substitui revisão humana, piloto, grants/ownership de produção ou operação produtiva.

## 21. Evidência executável — IDENTITY-RLS-029

- contexto: `packages/persistence/src/security-context.test.ts` cobre contexto de escopo, hash de convite e hash de recuperação, rejeitando hash inválido; `packages/persistence/src/invitation-repository.test.ts`, `packages/persistence/src/account-recovery-repository.test.ts` e `packages/persistence/src/attempt-repository.db.test.ts` preservam os caminhos de persistência;
- banco: a migration `0019_identity_token_rls.sql` aplica `ENABLE/FORCE RLS` a `account_invitations` e `account_recovery_requests`; consultas sem contexto não retornam solicitações de recuperação e contexto de escopo retorna somente a linha autorizada;
- integração: `tests/integration/postgres-invitation.test.ts` executa criação/aceite com aplicação não privilegiada e cleanup administrativo; `tests/integration/postgres-account-recovery.test.ts` comprova convite/recuperação, leitura cruzada negada, policies RLS e autenticação da sessão nova;
- resultado da rodada: migration manifest 20/20, live PostgreSQL 25 arquivos/36 testes, role de aplicação sem `SUPERUSER`/`BYPASSRLS`, role administrativa de teste separada e removida; `pnpm verify` passou com 96 arquivos/449 testes/22 skips de arquivo e 23 skips de teste, cobertura 84,76% statements, 80,50% branches, 85,51% functions e 85,52% lines; `pnpm build` passou nos 12 workspaces e `pnpm test:e2e` passou 19/19;
- limites: o hardening direto de `accounts`/`sessions` está registrado no item `IDENTITY-RLS-030`; grants/ownership de produção permanecem pendentes e não são inferidos a partir do live sintético; a auditoria negativa uniforme foi fechada na evidência 23.

## 22. Evidência executável — IDENTITY-RLS-030

- contexto: `packages/persistence/src/security-context.test.ts` cobre provisionamento e hash de sessão; `packages/persistence/src/session-repository.ts` mantém criação, lookup, revogação e rotação em transações que incluem o `set_config` local; o aceite de convite mantém token malformado como `not_found` na borda HTTP;
- banco: a migration `0020_identity_accounts_sessions_rls.sql` aplica `ENABLE/FORCE RLS` a `accounts` e `sessions` com policies separadas para provisionamento, leitura/atualização por contexto e inserção escopada;
- integração: `tests/integration/postgres-account-recovery.test.ts` comprova leitura sem contexto vazia, inserção sem contexto negada, recovery/autenticação e as quatro tabelas com `relrowsecurity`/`relforcerowsecurity`; a suíte live usa role de aplicação sem `SUPERUSER`/`BYPASSRLS` e role administrativa separada;
- resultado da rodada: migration manifest 21/21, `pnpm verify` passou com 96 arquivos/451 testes/22 skips de arquivo e 23 skips de teste, cobertura 84,54% statements, 80,47% branches, 85,33% functions e 85,27% lines; `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou 19/19; integração PostgreSQL live passou 25 arquivos/36 testes, com role/banco descartáveis removidos;
- limites: grants/ownership de produção, operação produtiva, provider/MFA, entrega externa, revisão clínica, piloto e publicação continuam fora; a auditoria negativa uniforme foi tratada na evidência 23.

## 23. Evidência executável — auditoria negativa uniforme e boundary de privilégios

- RED/GREEN: `packages/application/src/audit.test.ts` passou a exigir `actor_kind=ANONYMOUS` sem `principal_id`; `packages/persistence/src/audit-repository.test.ts` prova o mapeamento sem UUID sentinela; `apps/api/src/http.test.ts` e `apps/api/src/server.test.ts` cobrem rejeição do handler e rejeição de CSRF antes da leitura do corpo, sempre com rota normalizada e sem token;
- banco: a migration `0021_audit_anonymous_rejections.sql` mantém `audit_entries` append-only, adiciona a constraint de ator, permite recurso textual/nulo e mantém `ENABLE/FORCE RLS`; `tests/integration/postgres-account-recovery.test.ts` persiste e lê uma rejeição anônima em PostgreSQL real;
- borda: `apps/api/src/http.ts` registra `401/403/404` como `DENIED` e outras rejeições como `FAILURE`, com correlação UUID válida e fallback seguro ao `request_id`; falha da própria auditoria não altera o erro público nem expõe segredo;
- privilégio: `packages/persistence/src/database.ts` com `requireLeastPrivilege=true` rejeita `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, `CREATEDB`, `CREATE` no schema público e ownership de relações públicas; a integração live foi executada com owner de migration separado, role de aplicação `NOSUPERUSER/NOBYPASSRLS` e role administrativa de teste isolada;
- resultado da rodada: typecheck e testes unitários direcionados passaram; integração PostgreSQL passou 25 arquivos/37 testes no banco descartável, incluindo a nova auditoria anônima e o healthcheck de role sem ownership; o pipeline completo passou com 96 arquivos/455 testes, 22 skips de arquivo/24 skips de teste, cobertura 84,56% statements/80,28% branches/85,41% functions/85,30% lines, build dos 12 workspaces, E2E 19/19, migrações 22/22, secrets, traceability, architecture, documentation, product-definition e exposure; `pnpm audit --audit-level=high` e `git diff --check` também passaram;
- limites: o grant matrix e o ownership do ambiente produtivo real ainda exigem provisionamento/inspeção operacional com autoridade; a prova descartável não autoriza release, fornecedor, MFA, entrega externa, aprovação clínica ou piloto.

## 24. Evidência executável — congelamento e rastreabilidade de release

- `tests/integration/traceability-governance.test.ts` falhou em RED antes dos validadores e passou 3/3 no GREEN; o teste rejeita manifesto incompleto, commit inalcançável, worktree sujo e paths não rastreados;
- `scripts/verify-traceability.mjs` mantém um modo estrutural local e um modo `CVG_TRACEABILITY_RELEASE=true` que exige SHA alcançável, paths de código/teste presentes no índice e worktree limpo;
- `.github/workflows/quality.yml` executa `pnpm verify:traceability:release` após `pnpm verify`; `pnpm verify:ci-contract` passou com 20 checks de workflow;
- os 125 paths da construção atual foram congelados no commit de código `1e4e1792f45bb49e9b8019b0a4b8e1036ead9622`; o fechamento documental ocorreu em `b4bf8b9946578faf2d1f65053587a382efdc5a6c`; `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` passou com worktree limpo;
- a reexecução pós-fechamento passou com `pnpm verify` em 97 arquivos/458 testes, build nos 12 workspaces, E2E 19/19 e audit de dependências sem vulnerabilidades conhecidas; o workflow remoto e digest de artifact do HEAD local ainda não foram executados;
- a evidência remota anterior (`dd47909`/run `31380183984`) é mantida como histórica e não é usada para aprovar o worktree atual.
