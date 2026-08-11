# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: AUDIT ENGINE
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: AUDIT — remediação local fechada e handoff operacional
- current_sprint: BUILD-REMEDIATION-R6
- current_task: registrar a verificação live do catálogo curricular e manter o handoff externo sem promover produção

## STATUS

- status: WAITING_HUMAN_APPROVAL

## PROGRESSO

- last_completed_action: handoff final validado após o commit `3d3aa3d`: web-dependencies, edge-ready e api-live retornaram 200; verificador live manteve `PASS_WITH_GAPS` para 24/796/796/796 e 24/24, enquanto o modo clínico estrito falhou com 763 itens; traceability/documentation passaram e o gate produtivo permaneceu bloqueado por entradas externas ausentes
- next_action: obter decisões humanas para revisão clínica, provedor MFA/recovery, domínio/certificado, storage externo e ambiente autorizado de deploy/rollback; executar somente os gates externos correspondentes

## BLOQUEIOS

- blockers: revisão semântica/humana dos 796 itens e publicação clínica; provedor externo de MFA/recuperação; domínio/certificado TLS de produção; storage/retention de traces e backups de produção; ambiente autorizado para deploy/rollback e piloto

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: decidir provedor externo de identidade/MFA, domínio/DNS/TLS, backend de traces, destino de backup e ambiente autorizado de deploy; R0/R1/R2/R6 podem avançar com dados sintéticos

## TIMESTAMP

- last_update: 2026-08-11T11:32:33-03:00

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
