# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: AUDIT ENGINE
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: AUDIT — remediação local fechada e handoff operacional
- current_sprint: BUILD-REMEDIATION-R6
- current_task: manter o handoff externo após fechar o ciclo provider-mediated de MFA/recovery e revalidar os gates locais, sem promover produção

## STATUS

- status: WAITING_HUMAN_APPROVAL

## PROGRESSO

- last_completed_action: commit `e93f4d774b80ca920122e7ed09ffd106b66a83b5` fechou localmente o ciclo provider-mediated de MFA/recovery: contrato, adapter HTTPS, rotas autenticadas, tela `/account`, testes RED/GREEN e E2E sintético 1/1; `pnpm verify` passou em 447 testes, 18 skips e cobertura 85,04%/80,34%/86,84%/85,78%
- next_action: obter IdP/sandbox, domínio/certificado, backend/retention de traces, backup externo e ambiente autorizado de deploy/rollback; em paralelo, executar revisão semântica/item a item dos 763 conteúdos com aprovador autorizado

## BLOQUEIOS

- blockers: revisão semântica/humana dos 796 itens e publicação clínica; provedor externo de MFA/recuperação; domínio/certificado TLS de produção; storage/retention de traces e backups de produção; ambiente autorizado para deploy/rollback e piloto

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: decidir provedor externo de identidade/MFA, domínio/DNS/TLS, backend de traces, destino de backup e ambiente autorizado de deploy; R0/R1/R2/R6 podem avançar com dados sintéticos

## TIMESTAMP

- last_update: 2026-08-11T14:00:27-03:00

## 2026-08-11T14:00:27-03:00 — REMEDIATION-IDENTITY-LIFECYCLE

### AÇÃO

Executado TDD e revisão de segurança para fechar a transição entre iniciar uma operação de identidade e confirmar o challenge emitido pelo provedor. Foram adicionados contratos bounded, métodos provider-mediated no adapter HTTPS, rotas API autenticadas e campos efêmeros na tela `/account` para recovery e confirmação MFA.

### RESULTADO

O commit `e93f4d774b80ca920122e7ed09ffd106b66a83b5` (`feat: complete provider mediated identity flows`) implementa `verifyMfaEnrollment` e `completeRecovery`. Códigos são aceitos somente em memória, com limite de 256 caracteres e rejeição de caracteres de controle; não entram em persistência, envelope ou mensagem de erro. O E2E sintético verificou as rotas, os corpos provider-mediated e o desaparecimento dos códigos da interface após sucesso. `pnpm verify` passou com 447 testes, 18 skips e cobertura 85,04% statements / 80,34% branches / 86,84% functions / 85,78% lines; build, lint, typecheck, format e secret scan passaram.

### EVIDÊNCIA

`docs/110_identity_provider_lifecycle_evidence_2026-08-11.md`; `tests/e2e/account-security.spec.ts`; manifesto `REMEDIATION-EVIDENCE-026` fixado no mesmo SHA.

### LIMITES

Esta é uma prova local/provider-neutral. Não foram executados IdP ou sandbox reais, enrollment/challenge/recovery code reais, step-up, revogação ou sincronização de papéis. Também continuam pendentes domínio/certificado público, traces/backups externos, RPO/RTO produtivo, deploy/rollback autorizado e revisão clínica dos 763 itens.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Escolher o provedor e política de identidade, fornecer credenciais pelo secret manager e executar o probe e E2E em sandbox; só então repetir os gates de produção e manter a publicação clínica bloqueada até revisão item a item.

## 2026-08-11 — REMEDIATION-LOCAL-RELEASE-REHEARSAL

### RESULTADO

O fluxo local de release passou em ambiente HA ativo: digest operacional `sha256:bf457ddf…cac475`, rollback versionado local distinto `sha256:6ca763bb…e6e570` construído do commit `b30c85d`, canário/promoção e rollback com `/health/ready` 200, seguida de restauração ao artefato `cvg-trainee-vet:local`. O manifesto fora do repositório foi removido; api-a/api-b e worker-a/worker-b ficaram saudáveis.

### LIMITES

Esta prova fecha o controlador local e não prova registry externo, versão histórica real, CI remoto, autorização de produção, RPO/RTO, domínio/TLS gerenciado, traces externos, MFA/recovery externo ou revisão clínica dos 796 itens.

### STATUS

IN_PROGRESS

### NEXT

`pnpm verify:traceability` e `pnpm verify:documentation` passaram no SHA `35d5c57`; manter o handoff em WAITING_HUMAN_APPROVAL para os gates externos.

## 2026-08-11 — AUD-2026-08-11-WORKTREE-LOGIN

### RESULTADO

A construção atual foi auditada contra o runtime local ativo. A nota ponderada ficou em **86/100**. A classificação é PASS_WITH_GAPS e o release permanece não aprovado. A evidência detalhada está em BRIEFING/04.AUDIT/0509_current_worktree_audit_2026-08-11.md.

### EVIDÊNCIA

O runtime web/edge/HA permaneceu saudável após a coleta. O banco ativo contém somente a fatia sintética M02: 1 conta ativa, 1 atividade publicada, 1 atribuição, 33 itens e 0 estados curriculares. O E2E sintético passou 12/12; o E2E real falhou no seed por RLS em activity_assignments. Nenhuma credencial foi registrada neste arquivo.

### LIMITES

Não há prova de conteúdo clínico completo, piloto, MFA/recuperação externa, TLS/headers, traces duráveis, restore/deployment/rollback de produção ou commit final do worktree. O próximo avanço requer decisão humana sobre remediação e congelamento.

## 2026-08-11 — REMEDIATION-PROJECT-01

### RESULTADO

O projeto de remediação integral foi criado em BRIEFING/03.BUILD/0303_remediation_program.md. Ele cobre E2E/RLS, 24 estados/atribuições, produção e revisão dos packs, identidade/MFA/recovery, headers/TLS, traces duráveis, deploy/rollback, restore, load smoke e commit final.

### STATUS

WAITING_HUMAN_APPROVAL

### PRÓXIMA AÇÃO

Executar R0-S1 e R1-S1/R1-S2 em TDD. R3–R5 permanecem dependentes de decisões/infraestrutura externa; nenhum adapter sintético será declarado como produção.

## 2026-08-11 — REMEDIATION-R1

### RESULTADO

O fixture E2E passou a receber `CVG_REAL_E2E_DATABASE_URL` para a API e `CVG_REAL_E2E_ADMIN_DATABASE_URL` somente para seed/cleanup. Em banco efêmero, a API usou papel `NOSUPERUSER`/`NOBYPASSRLS`; migrations, seed, login, leitura, tentativa, resposta, envio e limpeza passaram em **14/14** cenários Chromium. O seed ativa a conta sintética antes do login e não relaxa RLS.

O parser do load smoke foi extraído para configuração testável; o default numérico deixou de usar `5_000` como string. A execução sem override de timeout completou **200/200**, 100% de sucesso.

### EVIDÊNCIA

`scripts/real-e2e-fixture-server.mjs`; `playwright.config.ts`; `.github/workflows/quality.yml`; `packages/config/src/load-smoke.ts`; `packages/config/src/load-smoke.test.ts`; `tests/e2e/real-runtime.spec.ts`; `pnpm verify`; `pnpm verify:ci-contract`; `pnpm typecheck`; `pnpm build`; E2E real 14/14; load smoke 200/200.

### PRÓXIMA AÇÃO

Executar R2-S1 em banco descartável, com materialização idempotente do catálogo/authoring e estado inicial que não declare domínio antes de atividade do participante.

## 2026-08-11 — REMEDIATION-R2-R5-LOCAL

### RESULTADO

R2-S1 foi concluído com o job administrativo idempotente `scripts/materialize-curriculum.mjs`. No banco ativo sintético, a primeira execução materializou 24 `learning_activities`, 796 `content_versions`, 796 registros editoriais, 796 itens, 24 `learning_assignments` e 24 `curriculum_runtime_states`; a segunda execução inseriu zero duplicatas. O estado dos 24 módulos é `PENDENTE`/`INICIAR_BASELINE`, as atribuições são `NAO_ATRIBUIDO` e nenhuma publicação nova foi feita. A base preservou a fatia M02 já existente: 1 atividade `PUBLISHED`, 33 conteúdos `PUBLICADO` e 23 atividades novas `WITHDRAWN`.

R2-S2/R2-S3 agora têm materialização, preflight, revisão clínica independente e gate de publicação implementados, mas a revisão semântica e a aprovação humana de Ricardo ainda não ocorreram. R3 permanece fail-closed (`NOT_CONFIGURED`) até um provedor externo ser escolhido e comprovado. R4 tem prova local de HTTP→HTTPS, TLS interno e headers; domínio/certificado gerenciado de produção continua pendente. R5 tem Tempo em volume local, trace consultável após restart, manifestos imutáveis, dry-run de deploy/rollback e backup PostgreSQL com checksum; storage externo, RPO/RTO e promoção de produção continuam pendentes.

### EVIDÊNCIA

`docs/104_remediation_evidence_2026-08-11.md`; `scripts/materialize-curriculum.mjs`; `scripts/verify-durable-traces.mjs`; `scripts/verify-edge-security.mjs`; `scripts/verify-production-security-config.mjs`; `scripts/verify-release-manifest.mjs`; `scripts/create-postgres-backup.mjs`; `infra/observability/tempo.yaml`; `infra/production/Caddyfile`.

### STATUS

WAITING_HUMAN_APPROVAL

### PRÓXIMA AÇÃO

Obter as decisões humanas de conteúdo e produção. Não promover nem publicar antes dos gates registrados.

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.

## 2026-08-11 — REMEDIATION-RUNTIME-ALIGNMENT

### ACTION

Reconstruída a imagem Docker do HA a partir do HEAD auditado `4a5aa676939102d8598365206bf42270e9cdd19b`, com ID `sha256:dd8b96026bf763f8cd030bb3a52bfb92b4b82fbd29b9770512c830cf89dc0e7c`. API-A/API-B e workers foram recriados e ficaram saudáveis; a migration terminou com exit 0. O ambiente local não secreto fixou edge HTTP `3180`, HTTPS interno `3181` e origem `https://localhost:3181`.

### RESULT

O web service permaneceu ativo em `3100`; web, edge HTTP e edge HTTPS retornaram 200. A verificação ao vivo confirmou headers, redirect HTTP 308, load smoke no alvo publicado `http://127.0.0.1:3180/health/live` com 200/200 e p95 de 66,91 ms, e trace sintético consultável após restart do Tempo. A decisão e o incidente foram sincronizados em `/home/ricardo/vps-truth` e no GBrain local, sem registrar segredos.

### LIMITES

O comando de load smoke sem `CVG_LOAD_TARGET` continua apontando para o default de desenvolvimento `:3000`; para o HA publicado usa-se explicitamente `CVG_LOAD_TARGET=http://127.0.0.1:3180/health/live`. Isso não reduz a correção do parser/timeout, mas é um requisito operacional documentado. MFA/recovery externo, domínio/certificado gerenciado, storage externo, backup/RPO/RTO de produção, deploy/rollback autorizado e aprovação clínica dos 796 itens continuam pendentes.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Obter as decisões humanas de conteúdo e produção; não publicar nem promover o runtime local como produção.

## 2026-08-10 — SCORE-95-03: integração vertical e reavaliação do item 3

### TIMESTAMP

2026-08-10 00:43:30 -03:00

### ACTION

Integrado o runtime educacional à aplicação, persistência e web em TDD. Criada a tabela `curriculum_runtime_states` e aplicada a migração `0009_nappy_nightcrawler.sql`; adicionados casos de uso, repositório versionado, contratos, GET público seguro, POST interno moderado e projeção web sem campos internos.

### RESULT

`pnpm typecheck`, `pnpm build` e `pnpm verify` passaram; cobertura: 58 arquivos/258 testes, 9 skips, 85,95% statements, 81,02% branches, 86,89% functions e 86,80% lines. `pnpm test:e2e` passou em 5 cenários sintéticos. Integração live passou em 12 arquivos/17 testes, com 1 skip. O item 3 foi reavaliado em **95/100 técnico/documental**; publicação clínica, RLS contextual e E2E navegador→API real permanecem pendentes.

### NEXT

Completar autoria e revisão clínica de M02/B-07 e demais packs, executar pré-voo, registrar decisão de Ricardo e manter o item 4 bloqueado até o gate de saída humano.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-11: fechamento do item 11 e abertura do item 12

### TIMESTAMP

2026-08-10 04:57:00 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 10 — Observabilidade e operação / item 12 do relatório 0491

### SPRINT

SCORE-95-12

### TASK

OBSERVABILITY-12-01 / provar health/dependencies, telemetria, alertas, traces, runbooks e restore

### ACTION

O item 11 foi implementado em TDD e auditado no `BRIEFING/04.AUDIT/0504_worker_resilience_audit.md`: o worker reconhece os eventos atuais, a reconciliação PostgreSQL→Qdrant foi exercitada com conjunto não vazio, divergência, órfão, replay, retirada, lease expirado, retry e dead-letter. O Qdrant permanece índice derivado e a IA permanece assistiva/desligável.

### RESULT

Item 11 reavaliado em **95/100**. `pnpm test:coverage` passou com 74 arquivos/343 testes e 14 skips; cobertura 84,70% statements, 80,08% branches, 85,76% functions e 85,38% lines. `pnpm typecheck`, lint, build, E2E 7/7, integração live 18 arquivos/25 testes sem skips, audit, secrets, exposure, documentação, traceability e `git diff --check` passaram. Nenhum dado clínico real, PDF, foto, prontuário, tutor ou fonte foi usado.

### DECISIONS

O score técnico do item 11 atingiu a meta, mas provider produtivo, restart observável, telemetria externa, carga, restore, CI com dependências live, aprovação clínica e E2E navegador→API real continuam pendentes. O item 12 é o único ativo; itens 13–16 permanecem bloqueados pela ordem.

### NEXT

Escrever RED para health/dependencies, exportação de métricas, alertas, traces, runbooks e restore descartável sem expor payloads ou dados internos.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-12: fechamento do item 12 e abertura do item 13

### TIMESTAMP

2026-08-10 05:29:53 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 11 — Web, UX e acessibilidade / item 13 do relatório 0491

### SPRINT

SCORE-95-13

### TASK

EXPERIENCE-13-01 / fechar jornada web, estados de experiência e acessibilidade verificável

### ACTION

O item 12 foi implementado em TDD e auditado no `BRIEFING/04.AUDIT/0505_observability_operations_audit.md`: `/health/dependencies`, exporter interno protegido, redaction, SLO/alertas, contrato operacional 0804, teste live de health PostgreSQL/Qdrant e restauração PostgreSQL sintética em banco descartável foram ligados. O marcador foi recuperado, o destino foi isolado e o RTO local medido foi 2.581 ms.

### RESULT

Item 12 reavaliado em **95/100** no recorte técnico/documental. Collector/OTel externo, retenção efetiva, dashboard provisionado, spans distribuídos, crash/failover, carga e múltiplas réplicas continuam gaps explícitos e bloqueiam release, mas não bloqueiam a abertura numérica do item 13.

### NEXT

Escrever RED da jornada web contra API real e do contrato de acessibilidade, sem inserir dados clínicos reais ou campos internos na projeção pública.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-03: verificação serial final

### TIMESTAMP

2026-08-10 00:48:42 -03:00

### ACTION

Reexecutada a verificação completa de forma serial após a integração e a atualização dos documentos, eliminando a condição de corrida observada quando o Playwright removia `test-results` enquanto o ESLint enumerava o workspace. Também foram repetidos E2E, integração live e audit de dependências.

### RESULT

`pnpm verify` passou integralmente; `pnpm audit --audit-level=high` não encontrou vulnerabilidades; `pnpm test:e2e` passou em 5/5; integração live passou em 12 arquivos/17 testes, com 1 skip. Cobertura final: 85,95% statements, 81,02% branches, 86,89% functions e 86,80% lines. Documentação, rastreabilidade, exposição pública e definição do produto passaram.

### NEXT

Executar autoria/revisão clínica e pré-voo de M02/B-07 com Ricardo; não publicar conteúdo nem iniciar o item 4 antes do gate humano.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-04: arquitetura e modularidade

### TIMESTAMP

2026-08-10 01:05:00 -03:00

### ACTION

Iniciado o item 4 após o item 3 alcançar 95/100. Criados `architecture-boundaries.json`, `tests/integration/architecture-boundaries.test.ts` e `0497_architecture_boundary_audit.md`; o mapa SPEC 0103 passou a apontar para a policy executável e o gate `pnpm verify:architecture` foi integrado ao `pnpm verify`.

### RESULT

O teste foi RED por policy ausente e GREEN com 2 testes passando. A policy cobre os 12 manifests workspace e imports de produção proibidos por camada. Nenhum conteúdo clínico foi publicado; o gate humano do item 3 permanece separado.

### NEXT

Reexecutar todos os gates, atualizar traceability e reavaliar o item 4 em 95/100 antes de liberar o item 5.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-04: fechamento do item 4 e abertura do item 5

### TIMESTAMP

2026-08-10 01:05:26 -03:00

### ACTION

Reexecutados os gates do item 4 em série: `pnpm verify`, `pnpm build`, `pnpm test:e2e`, integração PostgreSQL/Qdrant live, `pnpm audit --audit-level=high`, `verify:architecture`, rastreabilidade, documentação, definição do produto e `git diff --check`.

### RESULT

Tudo passou: cobertura 59 arquivos/260 testes, 9 skips, 85,95% statements, 81,02% branches, 86,89% functions e 86,80% lines; build nos 12 workspaces; E2E 5/5; live 13 arquivos/19 testes, 1 skip; audit sem vulnerabilidades conhecidas. O item 4 foi reavaliado em **95/100** e o item 5 foi liberado pela ordem numérica.

### NEXT

Auditar domínio, contratos e regras de negócio contra SPEC 0104–0108; escrever testes RED para invariantes ausentes e implementar o menor incremento TDD sem antecipar persistência/API/segurança/web.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-05: fechamento do item 5 e abertura do item 6

### TIMESTAMP

2026-08-10 01:36:08 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 4 — Persistência, migrações e integridade transacional / item 6 do relatório 0491

### SPRINT

SCORE-95-06

### TASK

SCORE-21 / congelar baseline e invariantes persistidos do item 6

### ACTION

Executados os incrementos TDD do item 5 para domínio, contratos e regras de negócio; atualizados `0498_domain_contract_matrix.md`, relatório 0491, roadmap, backlog e `traceability.yml`. O item 5 foi reavaliado em 95/100 e o item 6 foi aberto pela ordem controlada.

### RESULT

`pnpm verify` passou com 63 arquivos/283 testes e 9 skips de configuração; cobertura 85,09% statements, 80,27% branches, 87,56% functions e 85,82% lines. `pnpm build` compilou 12 workspaces; `pnpm test:e2e` passou em 5/5; a integração PostgreSQL/Qdrant local passou em 14 arquivos/20 testes sem skips; audit de dependências e `git diff --check` passaram. Nenhum conteúdo clínico foi publicado e nenhum dado real foi usado.

### DECISIONS

O item 5 cobre somente regras puras e contratos; persistência das novas entidades, RLS contextual, rotas e telas permanecem nos itens próprios. O gate clínico do item 3 continua separado e nenhuma publicação/piloto foi autorizado.

### NEXT

Ler SPEC 0109–0111, congelar invariantes de banco, escrever testes RED de migração/FK/unicidade/versionamento/rollback/isolamento e implementar o menor incremento TDD do item 6.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-06: fechamento do item 6 e abertura do item 7

### TIMESTAMP

2026-08-10 02:10:00 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 5 — API e superfície funcional backend / item 7 do relatório 0491

### SPRINT

SCORE-95-07

### TASK

API-07-01 / baseline de contratos, rotas e autoridade server-side

### ACTION

Implementado e auditado o item 6 com migrations `0010_classy_kronos.sql` e `0011_daffy_nova.sql`, schema das quatro entidades de aprendizagem, repositório contextual versionado e RLS. Criada a auditoria `0499_persistence_integrity_audit.md`; relatório 0491, roadmap, backlog e manifesto foram atualizados.

### RESULT

Item 6 reavaliado em **95/100** no escopo de persistência das entidades novas. `pnpm verify` passou com 64 arquivos/289 testes e 10 skips de configuração; cobertura 85,23% statements, 80,05% branches, 87,48% functions e 85,87% lines. `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou em 5/5; integração PostgreSQL/Qdrant passou em 15 arquivos/21 testes sem skips; `pnpm db:migrate`, audit, traceability e `git diff --check` passaram. O teste live comprovou rollback, conflito otimista, FKs/constraints e negação de contexto com papel sem `SUPERUSER`/`BYPASSRLS`. Nenhum conteúdo clínico ou dado real foi usado.

### DECISIONS

O item 6 cobre persistência e integridade das quatro entidades entregues. RLS das tabelas legadas, usuário de produção sem privilégio amplo, retenção/anonimização, backup/restore e operação permanecem nos itens 8 e 12; rotas e telas permanecem no item 7 e seguintes. O gate clínico do item 3 continua separado e nenhuma publicação/piloto foi autorizado.

### NEXT

Auditar item 7 contra SPEC 0106–0108/0111/0118 e escrever testes RED de contratos, autorização, campos proibidos, conflitos de versão, erros públicos e rotas da primeira fatia.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-07: fechamento do item 7 e abertura do item 8

### TIMESTAMP

2026-08-10 02:50:00 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 6 — Segurança, identidade, autorização e privacidade / item 8 do relatório 0491

### SPRINT

SCORE-95-08

### TASK

SECURITY-08-01 / baseline de isolamento legado, identidade e proteção de dados

### ACTION

Implementado e auditado o item 7 com a auditoria `0500_api_surface_audit.md`: contratos strict, casos de uso por port, autorização server-side por papel/escopo, projeções redigidas e rotas da primeira fatia para atribuições, workflows, tickets e contestações. Relatório 0491, roadmap, backlog e manifesto foram atualizados.

### RESULT

Item 7 reavaliado em **95/100** no escopo da primeira fatia backend persistida. `pnpm verify`/coverage passou com 65 arquivos/299 testes e 10 skips de configuração; cobertura 85,11% statements, 80,15% branches, 87,02% functions e 85,81% lines. `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou em 5/5; integração PostgreSQL/Qdrant passou em 15 arquivos/21 testes sem skips; audit, documentação, traceability e `git diff --check` passaram. Nenhum conteúdo clínico ou dado real foi usado.

### DECISIONS

O item 7 cobre somente a primeira fatia backend persistida. Dashboard, trilha completa, filas editoriais, GETs paginados, E2E navegador→API real, idempotência distribuída e operação de produção permanecem nos itens próprios. O gate clínico do item 3 continua separado e nenhuma publicação/piloto foi autorizado.

### NEXT

Abrir o item 8 com baseline 78/100: mapear tabelas legadas sensíveis, escrever RED de RLS sem contexto/contexto cruzado com papel sem `SUPERUSER`/`BYPASSRLS`, eliminar privilégio amplo da conexão, testar recuperação/rotação e revisar rate limit.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-08: fechamento do item 8 e abertura do item 9

### TIMESTAMP

2026-08-10 03:15:00 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 7 — Jornada mínima do participante / item 9 do relatório 0491

### SPRINT

SCORE-95-09

### TASK

JOURNEY-09-01 / fechar a jornada vertical de aprendizagem do participante

### ACTION

Implementado e auditado o item 8 com `0501_security_isolation_audit.md`: contexto transacional, RLS contextual nos caminhos participantes/execução, guard de menor privilégio, migrations `0012_secure_participant_rls.sql` e `0013_shared_rate_limit.sql`, rate limit compartilhado PostgreSQL e teste live negativo com role sem `SUPERUSER`/`BYPASSRLS`. Atualizados 0491, 0492, 0493, backlog master, SPEC 0111/0112/0118 e rastreabilidade.

### RESULT

Item 8 reavaliado em **95/100**. `pnpm test:coverage` passou com 67 arquivos/309 testes e 11 skips; cobertura 84,81% statements, 80,03% branches, 86,69% functions e 85,48% lines. `pnpm typecheck`, lint, build dos 12 workspaces, E2E 5/5, integração live 15 arquivos/21 testes com 1 skip de configuração, migrations, audit de dependências, secrets e `git diff --check` passaram. O teste de isolamento comprovou contexto vazio/cruzado negado, participante/escopo isolados, menor privilégio e rate limit compartilhado entre duas instâncias; o papel sintético foi removido.

### DECISIONS

O item 8 cobre a fatia participante/execução e a proteção de requisições. Grants/provisionamento de produção, tabelas editoriais/administrativas fora da fatia, backup/restore, RPO/RTO e E2E navegador→API real continuam gaps operacionais. Nenhum conteúdo clínico, PDF, foto, prontuário, tutor ou dado real foi usado; o gate de publicação clínica permanece independente.

### NEXT

Abrir `JOURNEY-09-01` com baseline 45/100: escrever RED da jornada vertical completa e ligar diagnóstico, trilha, avaliação, resultado, remediação, retenção e retomada às projeções públicas seguras.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-09: fechamento do item 9 e abertura do item 10

### TIMESTAMP

2026-08-10 03:47:37 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 8 — Autoria, revisão, avaliação e governança clínica executável / item 10 do relatório 0491

### SPRINT

SCORE-95-10

### TASK

AUTHORING-10-01 / materializar autoria, revisão, avaliação somativa, contestação e publicação clínica controlada

### ACTION

O item 9 foi implementado em TDD e auditado no `BRIEFING/04.AUDIT/0502_learning_journey_audit.md`: contrato agregado, caso de uso contextual, repositório PostgreSQL, rota `GET /api/v1/learning-path`, projeção web da próxima ação e isolamento live foram ligados. SPEC 0106/0107/0109/0114/0118, 0491/0492/0493, backlog e manifesto foram atualizados.

### RESULT

Item 9 reavaliado em **95/100**. `pnpm test:coverage` passou com 70 arquivos/323 testes e 11 skips; cobertura 85,01% statements, 80,19% branches, 86,53% functions e 85,72% lines. `pnpm typecheck`, lint, build, E2E 6/6, teste live de jornada 1/1, audit, secrets, exposure, documentação, traceability e `git diff --check` passaram. Nenhum dado clínico real, PDF, foto, prontuário, tutor ou fonte foi usado.

### DECISIONS

O item 9 cobre a jornada mínima agregada, não o produto completo. Dashboard, autoria/revisão clínica, avaliação somativa integral, contestação operacional, E2E navegador→API real, restore e aprovação clínica permanecem nos itens próprios. O item 10 é o único item ativo; itens 11–16 permanecem bloqueados pela ordem.

### NEXT

Escrever RED do contrato de autoria/revisão e mapear o primeiro banco clínico interno sem publicar conteúdo.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-10: fechamento do item 10 e abertura do item 11

### TIMESTAMP

2026-08-10 04:38:24 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 9 — Worker, Qdrant, IA e resiliência / item 11 do relatório 0491

### SPRINT

SCORE-95-11

### TASK

RESILIENCE-11-01 / provar processamento não vazio, reconciliação, retry, replay e degradação segura

### ACTION

O item 10 foi implementado em TDD e auditado no `BRIEFING/04.AUDIT/0503_authoring_review_audit.md`: bancos autorais versionados M02/24/B-07, preflight determinístico, revisão clínica independente, migration 0014, gate de publicação, rotas internas, tela web e projeção pública redigida foram ligados. O worker passou a reconhecer `content.workflow.changed.v1` como evento editorial sem efeito de indexação.

### RESULT

Item 10 reavaliado em **95/100**. `pnpm test:coverage` passou com 74 arquivos/341 testes e 12 skips; cobertura 84,69% statements, 80,08% branches, 85,74% functions e 85,38% lines. `pnpm typecheck`, lint, build, E2E 7/7, integração live 16 arquivos/22 testes com 1 skip, migration 0014, audit, secrets, exposure, documentação, traceability e `git diff --check` passaram. Nenhum dado clínico real, PDF, foto, prontuário, tutor ou fonte foi usado.

### DECISIONS

O score técnico do item 10 atingiu a meta, mas aprovação de Ricardo, revisão item a item, aplicação clínica, prova/recurso completo, E2E real, restore e operação continuam pendentes. O item 11 é o único item ativo; itens 12–16 permanecem bloqueados pela ordem.

### NEXT

Escrever RED do cenário live não vazio e da matriz de eventos emitidos versus handlers; provar divergência, órfão, retry, replay e recovery sem alterar estado educacional ou editorial.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-14: fechamento do item 14 e abertura do item 15

### TIMESTAMP

2026-08-10 06:19:00 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 13 — CI, reprodutibilidade e prontidão de build / item 15 do relatório 0491

### SPRINT

SCORE-95-15

### TASK

CI-15-01 / executar workflow remoto e fechar o contrato de ambiente/build

### ACTION

O item 14 foi implementado em TDD e auditado no `BRIEFING/04.AUDIT/0507_test_quality_evidence_audit.md`: comandos por camada, fixture persistida real, live PostgreSQL/Qdrant/restore, migrations e workflow CI foram materializados.

### RESULT

Item 14 reavaliado em **96/100**. Coverage passou com 352 testes e 17 fora por configuração; `test:contract` 12/36, `test:worker` 4/24, live PostgreSQL 18/26 sem skips, Qdrant 21/29 sem skips, restore 1/1, E2E padrão 12/12 e E2E real 14/14. O navegador completou convite, atividade, tentativa, resposta e submissão contra API/PostgreSQL real. Nenhum segredo, URL, payload ou campo interno foi exposto.

### DECISIONS

A meta numérica libera o item 15; release, piloto e publicação clínica permanecem bloqueados. O item 15 é o único ativo; o item 16 aguarda a nota >=95.

### NEXT

Executar o workflow CI remoto, guardar SHA/artefatos redigidos e fechar o contrato de ambiente/build sem mascarar falhas de infraestrutura.

### STATUS

IN_PROGRESS

## 2026-08-10 — SCORE-95-15: contrato local fechado, CI remoto aguardando autorização

### TIMESTAMP

2026-08-10 06:51:42 -03:00

### ENGINE

BUILD / AUDIT / RUNTIME CONTROLLER

### PHASE

Phase 13 — CI, reprodutibilidade e prontidão de build / item 15 do relatório 0491

### SPRINT

SCORE-95-15

### TASK

CI-15-01 / executar workflow remoto e fechar o contrato de ambiente/build

### ACTION

Escrito o teste RED do contrato de CI e implementado o GREEN: `.nvmrc`, engines Node/pnpm, chaves de ambiente, `verify:ci-contract`, teste `ci-governance`, serviço PostgreSQL 16, serviço Qdrant 1.15.5, readiness no runner, migrations, live Qdrant, artifacts `always()` e caminhos de coverage/JUnit/Playwright. A chave opcional vazia de Qdrant foi retirada do ambiente do workflow após o teste live revelar a rejeição correta do schema; a imagem Qdrant foi verificada sem `curl` e os containers criados para a prova foram removidos ao final.

### RESULT

`0508_ci_reproducibility_audit.md` reavaliou o item 15 em **78/100 local**. O RED falhou 2/2 e o GREEN passou 2/2; `pnpm verify` passou com 77 arquivos/354 testes, 17 skips e cobertura 84,92%/80,34%/85,89%/85,61%; build e audit passaram; migrations passaram; live estendido passou 23/32 com PostgreSQL/Qdrant/restore; E2E padrão 12/12 e real 14/14; artefatos locais de coverage, Playwright e JUnit foram produzidos.

### DECISIONS

Não declarar 95/100: o checkout não possui `origin`, não há repositório `cvg-trainee-vet` identificado na conta GitHub autenticada e nenhum job remoto foi executado. O item 15 fica em `WAITING_HUMAN_APPROVAL`; o item 16 continua bloqueado pela ordem; release, piloto e publicação clínica permanecem bloqueados pelos gates próprios.

### NEXT

Ricardo deve informar/aprovar o repositório GitHub e a publicação deste checkout em branch/commit intencional; depois executar o workflow remoto, registrar SHA, duração, artefatos, falhas e limites.

### STATUS

WAITING_HUMAN_APPROVAL

## 2026-08-10 — RUNTIME-DEPLOY-19: stack local HA iniciada e validada

### TIMESTAMP

2026-08-10 12:07:23 -03:00

### ENGINE

RUNTIME CONTROLLER / AUDIT

### PHASE

Phase 14 — deployment local operacional

### TASK

DEPLOY-19-01 / subir programa web e dependências, verificar acesso, telemetria e failover

### ACTION

Subida a composição `cvg-trainee-vet-ha` a partir de `infra/production/docker-compose.ha.yml`: PostgreSQL, migration, Qdrant, collector OTLP, duas APIs, dois workers, Caddy, Prometheus e Grafana. A interface Next.js foi reconstruída com o edge final e registrada em `cvg-trainee-vet-web.service` com Node 22, porta 3100 e restart automático. A porta externa do edge foi fixada em 3180 para não conflitar com a reserva histórica da porta 8080.

### RESULT

Stack final ativa: PostgreSQL saudável; migration exit 0; Qdrant pronto; API-A/API-B saudáveis; worker-A/worker-B saudáveis; edge ativo; Prometheus e Grafana ativos; web ativa. `http://127.0.0.1:3100/` retornou 200, o proxy web `/health/live` retornou 200 e o edge `http://127.0.0.1:3180/health/live`/`ready` retornou 200. Carga final: 100/100 HTTP 200 normal, 100/100 durante parada controlada de API-A e 100/100 após restauração; API-A voltou a `healthy` em 3 segundos. Prometheus reportou três targets `up`, Qdrant/Grafana passaram readiness/health e o collector registrou spans.

### LIMITS

É deployment local/LAN/Tailscale, sem domínio público, TLS, provedor externo de identidade ou backend durável de traces. A entrada do participante continua protegida por convite; não foi criado token de acesso sintético nem bypass de autenticação.

### STATUS

READY_FOR_NEXT_STEP

### NEXT

Usar um convite interno autorizado para entrar no programa; quando aplicável, configurar identidade externa, traces duráveis e deployment público/rollback.

## 2026-08-10 — ACCESS-BOOTSTRAP-20: convite inicial de acesso emitido

### TIMESTAMP

2026-08-10 13:05:00 -03:00

### ENGINE

RUNTIME CONTROLLER / SECURITY REVIEW

### PHASE

Phase 14 — acesso inicial do ambiente local

### TASK

ACCESS-20-01 / emitir convite sintético de uso único para o operador

### ACTION

Verificado que o identity store estava vazio. Foi criado um convite sintético para a conta interna `ricardo@cvg.internal`, com papel `PARTICIPANT`, escopo técnico de demonstração e expiração de sete dias. O token bruto foi mantido somente na operação transitória e entregue ao operador; banco, logs, documentação e Git receberam apenas o digest/metadata operacional.

### RESULT

O banco confirmou 1 convite não aceito e dentro da validade, 1 convite expirado de uma tentativa de bootstrap que falhou antes da entrega do token, 1 conta convidada e 2 eventos de auditoria append-only. Nenhuma senha, hash ou token foi registrado neste arquivo.

### STATUS

READY_FOR_NEXT_STEP

### NEXT

Abrir a interface local e inserir o token de uso único. O aceite ativa a conta e cria a sessão HttpOnly; depois disso o convite não poderá ser reutilizado.

## 2026-08-10 — ACCESS-LOGIN-JOURNEY-21: runtime com credencial e M02 atribuída

### TIMESTAMP

2026-08-10 13:40:33 -03:00

### ENGINE

RUNTIME CONTROLLER / SECURITY REVIEW / TDD

### PHASE

Phase 14 — acesso e jornada inicial do ambiente local

### TASK

ACCESS-21-01 / substituir a tela de convite por login seguro e eliminar jornada vazia no runtime ativo

### ACTION

Aplicados a migração `0015_lonely_shooting_star.sql`, o contrato de login, o caso de uso de senha, o repositório PostgreSQL, as rotas `/api/v1/auth/login`, `/api/v1/session` e `/api/v1/account/password`, a tela web de login e a restauração de sessão. O seed administrativo idempotente publicou 33 itens da atividade M02 já existente e criou a atribuição `DISPONIVEL` para o participante interno no escopo técnico de demonstração.

### RESULT

O banco ativo confirma conta `ACTIVE` com papel/escopo de participante, uma atividade publicada e uma atribuição disponível. O login real retornou `200`, a sessão restaurada retornou `200`, a jornada retornou uma atividade M02 com próxima ação `INICIAR_ATIVIDADE`, e a verificação Playwright real não encontrou `empty-state`. A interface foi reconstruída com `CVG_API_INTERNAL_URL=http://127.0.0.1:3180` e o serviço `cvg-trainee-vet-web.service` está ativo em `3100`.

### SECURITY

Senha não é registrada em documentação, log, auditoria ou Git; somente hash scrypt é persistido. A tentativa de seed pelo usuário de aplicação foi negada por RLS e o seed final usou exclusivamente o job administrativo de migração. Convite continua disponível como onboarding administrativo compatível, mas não é mais a tela principal.

### STATUS

READY_FOR_NEXT_STEP

### NEXT

Operador deve entrar em `http://localhost:3100/`, usar o e-mail e a senha transitória entregues nesta rodada, trocar a senha e validar a atividade M02. Recuperação/MFA externo e atribuição de todos os 24 meses permanecem limites explícitos.

## 2026-08-10 — ACCESS-LOGIN-VERIFY-23: gates finais do login e da jornada

### TIMESTAMP

2026-08-10 13:49:16 -03:00

### ACTION

Reexecutados os gates após a reconstrução final do web com o proxy interno do edge. A verificação cobriu formato, lint, TypeScript, scanner de segredos, cobertura, build dos workspaces, serviço systemd e navegação contra o runtime ativo.

### RESULT

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm verify:secrets`, `pnpm test:coverage` e `pnpm build` passaram. A suíte registrou 392 testes passantes e 17 skips, com 84,98% statements, 80,13% branches, 86,50% functions e 85,71% lines. O serviço `cvg-trainee-vet-web.service` está ativo; o navegador real confirmou tela de login, atividade M02, 33 cartões, botão `Iniciar tentativa` e zero ocorrências de `empty-state`.

### SECURITY

O scanner de segredos ficou limpo; a senha transitória não foi gravada em código, documentação, logs ou Git. `git diff --check` passou.

### STATUS

READY_FOR_NEXT_STEP

### NEXT

Usar as credenciais transitórias diretamente na interface local. Rotação de senha na superfície de conta, MFA/recuperação externos e expansão de atribuições continuam itens posteriores explícitos.

## 2026-08-11 — REMEDIATION-ACTIVE-HA-E2E

### AÇÃO

Adicionado o orquestrador `scripts/active-ha-e2e.mjs` e a fixture Compose `real-e2e-fixture`. O Caddy ganhou `:8081`, publicado somente em `127.0.0.1:3182`; o serviço web e o E2E HA usam esse canal, mantendo `3180` público e `3181` TLS interno. O cleanup deixou de tentar apagar `audit_entries`, que é append-only, e passou a relatar etapa segura em caso de falha.

### RESULTADO

Após recriar API-A/API-B e workers com a imagem final, `pnpm test:e2e:active-ha` passou 2/2. A consulta pós-teardown encontrou zero contas, atividades, itens, conteúdo, sessões, atribuições e estados sintéticos mutáveis; 11 registros recentes de auditoria sintética foram preservados. `CVG_RUN_REAL_E2E=true pnpm test:e2e` passou 14/14 em PostgreSQL efêmero. O restore live passou 1/1 em banco HA com marcador isolado e cleanup confirmado. `pnpm verify` passou com 410 testes e cobertura 84,85% statements / 80,07% branches.

### LIMITES

O runtime é local/LAN/Tailscale. MFA/recovery externo, domínio/certificado gerenciado, storage externo de traces/backups, RPO/RTO de produção, deploy/rollback autorizado, CI remoto e aprovação clínica dos 796 itens permanecem pendentes. `pnpm ops:verify-production-security` foi mantido em `NOT_EXECUTED` fora de ambiente aprovado.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Build descartável isolado, pin de rastreabilidade `9c585a9` e sincronização do VPS truth source concluídos; manter `WAITING_HUMAN_APPROVAL` para os gates externos.

## 2026-08-11 — REMEDIATION-CURRICULUM-RUNTIME-VERIFIER

### AÇÃO

Criado o verificador read-only `scripts/verify-curriculum-runtime.mjs`, com expectativa derivada da fonte `curriculumV3`, conexão administrativa explicitamente opt-in e teste TDD em `tests/integration/curriculum-runtime-verifier.test.ts`. O comando foi adicionado como `pnpm ops:verify-curriculum-runtime`.

### RESULTADO

Contra o PostgreSQL HA ativo, o verificador retornou `PASS_WITH_GAPS`: 24 atividades, 796 versões/editorial/itens, 24 atribuições e 24 estados; módulos M01–M24; atribuições `NAO_ATRIBUIDO` (24); estados `PENDENTE` (24); conteúdo `PROJECAO_VERIFICADA` (763) e `PUBLICADO` (33). Com `CVG_CURRICULUM_REQUIRE_CLINICAL_PUBLICATION=true`, falhou de forma esperada com `clinical publication is incomplete: 763 items`.

### EVIDÊNCIA

O commit `0a36d1d` contém o código e os testes. `pnpm verify` passou com 420 testes, 17 skips e cobertura acima de 80%. A prova estrutural do catálogo está fechada localmente; a revisão semântica e a publicação clínica dos 763 itens continuam dependentes de Ricardo.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Obter decisões sobre revisão/publicação clínica, IdP/MFA/recovery, domínio/DNS/TLS, storage externo de traces, backup/RPO/RTO e ambiente autorizado para deploy/rollback.

## 2026-08-11 — REMEDIATION-FINAL-HANDOFF-CHECK

### RESULTADO

Após os commits `0a36d1d` e `3d3aa3d`, os endpoints locais `http://127.0.0.1:3100/health/dependencies`, `http://127.0.0.1:3180/health/ready` e `http://127.0.0.1:3182/health/live` retornaram `200`. `pnpm verify:traceability`, `pnpm verify:documentation` e `git diff --check` passaram. A execução live do currículo permaneceu `PASS_WITH_GAPS`, e o modo `CVG_CURRICULUM_REQUIRE_CLINICAL_PUBLICATION=true` retornou `FAIL` por 763 itens não publicados.

### GATE EXTERNO

`CVG_VERIFY_PRODUCTION_SECURITY=true pnpm ops:verify-production-security` permaneceu bloqueado por `IDENTITY_PROVIDER_REQUIRED`, `IDENTITY_PROVIDER_URL`, `IDENTITY_PROVIDER_TOKEN`, `CVG_PUBLIC_HTTPS_ORIGIN`, `CVG_TRACE_STORAGE_BACKEND`, `CVG_TRACE_RETENTION`, `CVG_BACKUP_URI`, `CVG_BACKUP_ENCRYPTION_KEY_REF`, `CVG_RELEASE_IMAGE_DIGEST` e `CVG_ROLLBACK_IMAGE_DIGEST`.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Não promover produção nem publicar conteúdo clínico. A próxima ação exige as decisões humanas e os recursos externos listados no bloco `BLOQUEIOS`.

## 2026-08-11 — REMEDIATION-IDP-TRANSPORT-HARDENING

### AÇÃO

Aplicado TDD no adapter de identidade e no carregamento de configuração: o teste inicialmente falhou porque `http://identity.example` era aceito; o GREEN passou após o adapter exigir `https://` e a configuração de produção rejeitar transporte inseguro.

### RESULTADO

O commit `3793066` fecha o gap local de transporte do IdP. `pnpm verify` passou com 421 testes, 17 skips e cobertura global de 84,86% statements, 80,10% branches, 86,55% functions e 85,61% lines. A mudança não declara MFA/recovery disponíveis: o provedor, sandbox e jornada real continuam ausentes.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Escolher e configurar o provedor externo autorizado; então executar sandbox, enrollment, challenge, recovery, step-up e revogação com segredos fora do Git.

## 2026-08-11 — REMEDIATION-LOCAL-QUALITY-RECHECK

### RESULTADO

Após o commit `3793066`, `pnpm verify` passou com 421 testes, 17 skips e cobertura 84,86% statements, 80,10% branches, 86,55% functions e 85,61% lines. `pnpm build` passou usando `CVG_WEB_DIST_DIR=.next-verify-build` e `CVG_API_INTERNAL_URL=http://127.0.0.1:3182`, sem substituir o artefato web operacional; `pnpm audit --audit-level=high` não encontrou vulnerabilidades conhecidas.

### LIMPEZA E LIMITES

Os arquivos temporários gerados pelo Next foram removidos para a lixeira e o worktree voltou a ficar limpo. Esta é uma revalidação local: não altera a ausência de provedor MFA/recovery, domínio TLS público, storage externo, backup produtivo ou ambiente autorizado.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Aguardar as decisões humanas e executar os gates externos correspondentes; não promover produção nem publicar conteúdo clínico.

## 2026-08-11 — REMEDIATION-MANAGED-TLS-PROFILE

### AÇÃO

Escrito primeiro o teste de contrato do edge gerenciado; o RED confirmou a ausência do perfil. O GREEN adicionou `infra/production/Caddyfile.production.example`, seleção de arquivo via `CVG_CADDYFILE`, FQDN via `CVG_CADDY_HTTPS_SITE` e targets de porta parametrizáveis no Compose.

### RESULTADO

O commit `9386e21` mantém os defaults locais (`Caddyfile`, `3180/3181/3182`) e permite o perfil externo com `CVG_CADDY_HTTPS_SITE=<FQDN>`, `CVG_EDGE_PORT=80`, `CVG_EDGE_TLS_PORT=443` e `CVG_EDGE_TLS_TARGET_PORT=443`. `caddy validate` passou com FQDN sintético; Compose também passou com credenciais sintéticas não persistidas; o teste de contrato e `pnpm verify` passaram.

### LIMITES

O perfil é preparação executável, não prova de TLS produtivo: ainda faltam domínio/DNS, ACME ou certificado gerenciado, exposição pública 80/443, handshake/renovação e E2E externo autorizados.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Selecionar o domínio e o método de certificado; somente então executar o perfil fora do ambiente local e registrar evidência pública redigida.

## 2026-08-11 — REMEDIATION-EXTERNAL-TRACE-PROFILE

### AÇÃO

Foi escrito primeiro o contrato em `tests/integration/production-edge-contract.test.ts`; o RED falhou pela ausência do overlay e do collector externo. O GREEN adicionou `infra/observability/otel-collector.production.example.yaml` e `infra/production/docker-compose.external-traces.example.yml`. O overlay injeta endpoint OTLP e autorização somente por ambiente, troca o exporter local por OTLP HTTP com TLS obrigatório e coloca Tempo atrás do perfil opcional `local-traces`.

### RESULTADO

O teste de contrato passou 2/2. O binário oficial do OpenTelemetry Collector validou a configuração com endpoint HTTPS-base e autorização sintéticos; a configuração registra que `/v1/traces` é acrescentado pelo exporter. `docker compose config --quiet` passou com o overlay externo, sem ativar `local-traces`, e também com `--profile local-traces`; `pnpm verify` passou com 423 testes, 17 skips e cobertura 84,86% statements / 80,10% branches / 86,55% functions / 85,61% lines. Commits: `b5e615c` e `8b03283`.

### LIMITES

O perfil é genérico e não ativo: nenhum fornecedor, endpoint, token, retenção, consulta, alerta ou prova de persistência externa foi configurado. O backend real, política de retenção, RPO/RTO e autorização de produção continuam pendentes; o perfil local Tempo não foi alterado.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Obter o backend de traces e a política de retenção aprovados, então executar o collector em ambiente autorizado com credenciais fornecidas fora do repositório; não promover o overlay com valores sintéticos.

## 2026-08-11 — REMEDIATION-EXTERNAL-TRACE-ENDPOINT-SEMANTICS

### AÇÃO

A documentação oficial do OpenTelemetry Collector Contrib foi consultada para confirmar a semântica do exporter `otlphttp`. O comentário e o contrato foram ajustados para exigir uma URL-base HTTPS, deixando `/v1/traces` para o caminho padrão do exporter. A correção foi registrada no commit `8b03283`.

### RESULTADO

O teste de contrato passou 2/2; a validação do Collector passou com `https://traces.example.org` sintético (sem caminho duplicado); `pnpm verify` passou com 423 testes, 17 skips e cobertura 84,86% statements / 80,10% branches / 86,55% functions / 85,61% lines. O Compose externo e o runtime local permaneceram inalterados.

### LIMITES

Esta correção melhora a interoperabilidade do perfil, mas não configura fornecedor, credencial, retenção, consulta, alerta ou persistência externa. O gate de produção continua aguardando decisões e ambiente autorizados.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Selecionar backend e retenção de traces; então executar o overlay em ambiente autorizado com credenciais fora do repositório.

## 2026-08-11 — REMEDIATION-PRODUCTION-GATE-RECHECK

### AÇÃO

Reexecutados `pnpm verify:traceability`, `pnpm verify:documentation`, `git diff --check`, health do HA (`web-dependencies`, edge ready e API live) e `CVG_VERIFY_PRODUCTION_SECURITY=true pnpm ops:verify-production-security`.

### RESULTADO

O worktree permaneceu limpo; API-A/API-B e workers estão saudáveis; health web/edge/API retornou sucesso; rastreabilidade e documentação passaram. O gate produtivo falhou de forma esperada e explícita por `IDENTITY_PROVIDER_REQUIRED`, `IDENTITY_PROVIDER_URL`, `IDENTITY_PROVIDER_TOKEN`, `CVG_PUBLIC_HTTPS_ORIGIN`, `CVG_TRACE_STORAGE_BACKEND`, `CVG_TRACE_RETENTION`, `CVG_BACKUP_URI`, `CVG_BACKUP_ENCRYPTION_KEY_REF`, `CVG_RELEASE_IMAGE_DIGEST` e `CVG_ROLLBACK_IMAGE_DIGEST` ausentes.

### LIMITES

As entradas ausentes exigem decisões, credenciais e ambiente externos; não devem ser preenchidas com valores sintéticos para forçar aprovação. A revisão clínica dos 763 itens não publicados também continua humana.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Registrar as decisões de provedor MFA/recovery, domínio/certificado, traces/retenção, backup e ambiente de release; depois executar os gates externos correspondentes.

## 2026-08-11 — REMEDIATION-CLINICAL-REVIEW-UI

### AÇÃO

O E2E de autoria foi alterado primeiro para exigir justificativa, aprovação clínica e só depois publicação. O RED falhou porque a tela não possuía o campo nem o botão de revisão. O GREEN adicionou `apps/web/app/authoring/page.tsx` com decisão `APROVAR_CLINICAMENTE`/`SOLICITAR_AJUSTES`, justificativa obrigatória e publicação desabilitada até `APROVADO_CLINICAMENTE`.

### RESULTADO

`pnpm --filter @cvg/web typecheck` passou. O E2E Chromium passou 1/1 contra um web server Next isolado: publicação inicialmente desabilitada, justificativa registrada, aprovação clínica enviada e publicação habilitada em seguida. Commit: `c7a591b`.

### LIMITES

O fluxo agora torna o gate humano aplicável, mas não aprova automaticamente nenhum item. Os 763 conteúdos permanecem `PROJECAO_VERIFICADA` até revisão semântica e decisão de Ricardo; não houve publicação clínica nesta ação.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Usar a superfície interna para revisar os 763 itens com aprovador independente; em paralelo, fornecer as decisões e recursos externos de R3–R5.

## 2026-08-11 — REMEDIATION-CLINICAL-REVIEW-BUILD-RECHECK

### AÇÃO

Executado `CVG_WEB_DIST_DIR=.next-verify-build2 CVG_API_INTERNAL_URL=http://127.0.0.1:3182 CVG_PUBLIC_HTTPS=true pnpm build`, com remoção recuperável do artefato temporário e restauração dos arquivos gerados pelo Next.

### RESULTADO

O build dos 12 workspaces passou; a rota `/authoring` foi compilada em produção e o web manteve o artefato operacional intacto. O typecheck, o E2E de revisão 1/1, `pnpm verify` 423/17 e `git diff --check` permanecem verdes.

### LIMITES

O build comprova o mecanismo de revisão, não a aprovação clínica dos itens. A produção continua sem domínio, IdP, storage externo, backup produtivo e ambiente de release autorizados.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Iniciar a revisão humana rastreável dos 763 itens; depois executar os gates externos somente com decisões e credenciais autorizadas.

## 2026-08-11 — REMEDIATION-CLINICAL-REVIEW-QUEUE

### RESULTADO

A revisão clínica deixou de depender de `contentId` conhecido manualmente. A API ganhou a fila interna paginada e protegida por `VIEW_CLINICAL_REVIEW_QUEUE`; a web lista itens pendentes e abre a autoria sem projetar gabarito, rubrica, feedback ou fontes. O verificador live confirmou no PostgreSQL HA 796 registros, 763 pendentes, 763 sem revisão e 0 falhas de pré-voo técnico.

### EVIDÊNCIA

`tests/e2e/authoring-review.spec.ts` passou 2/2; `tests/integration/clinical-review-queue-verifier.test.ts` passou 3/3; `pnpm lint`, `pnpm typecheck` e `pnpm build` passaram. `pnpm ops:verify-clinical-review-queue` retornou `PASS_WITH_GAPS`; com `CVG_CLINICAL_REVIEW_REQUIRE_COMPLETE=true`, falhou com exit code 1 e `clinical review queue is incomplete: 763 pending items`. Evidência detalhada: `docs/106_clinical_review_queue_evidence_2026-08-11.md`.

### LIMITES

A fila torna a revisão humana executável, mas não aprova conteúdo nem substitui a decisão clínica de Ricardo. Os 763 itens continuam fora de publicação clínica; os gates externos de IdP/MFA/recovery, domínio/certificado, traces, backup/RPO/RTO e deploy/rollback seguem aguardando decisão e ambiente autorizados.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Usar a fila com aprovador independente e registrar as decisões/justificativas no fluxo editorial; depois executar os gates externos somente com credenciais e recursos autorizados.

## 2026-08-11 — REMEDIATION-BACKUP-ARTIFACT-RESTORE

### AÇÃO

Foi implementada a validação independente de artefato de backup: manifesto custom-format, nome do dump, tamanho, timestamp, SHA-256 e caminho externo ao repositório. O verificador de restore agora pode consumir o dump já armazenado por `CVG_RESTORE_BACKUP_FILE` + `CVG_RESTORE_BACKUP_MANIFEST`, mantendo o destino descartável isolado.

### RESULTADO

O RED do contrato falhou antes da implementação; o GREEN passou em 4/4. `pnpm lint`, `pnpm typecheck` e o restore live oficial passaram. No HA ativo, o dump de 197.097 bytes foi validado e restaurado com 27 objetos e RTO observado de 2.357 ms; o teste oficial cobriu marcador sintético e artefato existente em 2/2.

### LIMITES

Isso fecha a lacuna de consumir/verificar um artefato local, não o gate de produção. Agendamento, storage externo, criptografia, retenção, owner, RPO/RTO produtivo, failover e autorização continuam pendentes. Nenhum dump ou segredo foi versionado.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Obter as decisões humanas de destino/retensão/criptografia e ambiente autorizado; então repetir o verificador com backup do ambiente declarado e registrar RPO/RTO medidos.

## 2026-08-11 — REMEDIATION-FINAL-LOCAL-GATE

### AÇÃO

Reexecutado o gate completo no estado final dos commits `cafba44890efc2a5b99e5af10faf79a95c9be59d` e `2ade105`. Também foi mantida a separação entre prova local e produção: o adapter de identidade continua `NOT_CONFIGURED` sem provedor autorizado, e nenhum endpoint sintético foi tratado como MFA/step-up real.

### RESULTADO

`pnpm verify` passou com 436 testes, 18 skips e cobertura global de 84,94% statements, 80,26% branches, 86,66% functions e 85,69% lines. Build, audit de dependências, secret scan, migrações, arquitetura, documentação, produto, exposição pública e `git diff --check` passaram. O restore live oficial permanece 2/2 e a prova de artefato restaurou 27 objetos com RTO local observado de 2.357 ms.

### LIMITES

O conjunto local está auditável, mas a rodada não possui provedor MFA/recovery, domínio/certificado público, storage externo de traces/backups, RPO/RTO produtivo, registry/ambiente de deploy ou revisão clínica dos 763 itens. Esses gates não podem ser preenchidos com credenciais, endpoints ou decisões inventados.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Ricardo deve decidir provedor/política MFA-recovery, domínio/TLS, backend e retenção de traces, destino/criptografia/owner de backup, ambiente de release e fluxo de revisão clínica; depois executar os verificadores externos correspondentes.

## 2026-08-11 — REMEDIATION-IDP-READINESS-PROBE

### AÇÃO

Foi criado `scripts/verify-identity-provider-readiness.mjs` e o comando `pnpm ops:verify-identity-provider`. O gate exige execução explícita, URL HTTPS sem credenciais embutidas, token em ambiente, principal técnico de probe e status externo com recuperação disponível e MFA habilitado. `ops:verify-production-security` agora executa esse probe antes de aceitar a configuração.

### RESULTADO

O RED falhou pela ausência do módulo; o GREEN passou em 5/5 com respostas HTTP sintéticas. `pnpm lint`, `pnpm typecheck`, `pnpm verify:secrets`, format, documentação e rastreabilidade passaram. `pnpm verify` passou com 441 testes, 18 skips e cobertura 84,94% statements, 80,26% branches, 86,66% functions e 85,69% lines. Sem flag, o comando retorna `NOT_EXECUTED`; com flag e sem provedor, retorna `FAIL` sem expor token ou corpo de erro.

### LIMITES

Nenhum IdP real foi consultado. Enrollment, challenge, recovery codes, step-up, revogação, sincronização de papéis e E2E em sandbox continuam pendentes; o probe não é uma declaração de MFA produtivo.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Escolher o IdP e a política, fornecer principal sintético/segredo pelo secret manager e executar o probe e o E2E autorizado; manter o gate fechado até `PASS` real.

## 2026-08-11T13:36:41-03:00 — REMEDIATION-LOCAL-REVERIFICATION

### AÇÃO

Reexecutados os gates locais de R1, R2, R4, R5 e R6 no HA ativo: `pnpm test:e2e:active-ha`, verificador live de currículo, fila clínica, headers live, Tempo após restart, topologia HA, manifesto de release e smoke de carga.

### RESULTADO

O E2E Chromium passou 2/2 e deixou zero contas, atividades, atribuições, tentativas e sessões da fixture. A role `cvg_app` está sem `SUPERUSER` e `BYPASSRLS`. O runtime observou 24 atividades, 796 conteúdos/editorial/itens, 24 atribuições e 24 estados M01–M24; a fila clínica observou 763 pendências, 763 não revisados e 0 falhas técnicas. Edge live retornou 200 com headers, o trace sintético sobreviveu ao restart do Tempo e o load smoke passou 200/200 com p95 de 77,64 ms.

### EVIDÊNCIA

`docs/109_remediation_local_reverification_2026-08-11.md`.

### LIMITES

Os resultados são locais/sintéticos. Não provam IdP/MFA/recovery real, domínio/certificado público, traces ou backups externos, RPO/RTO produtivo, registry/deploy/rollback autorizado ou aprovação clínica dos 763 itens.

### STATUS

WAITING_HUMAN_APPROVAL

### NEXT

Obter as decisões e recursos externos autorizados e iniciar a revisão clínica item a item; então executar os gates correspondentes no ambiente declarado.
