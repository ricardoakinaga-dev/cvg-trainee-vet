# 0492 — Roadmap de elevação para 95/100

## Objetivo

Elevar cada item da matriz do relatório `0491_full_construction_audit.md` para nota mínima de **95/100**, trabalhando estritamente em ordem. O item seguinte só pode ser iniciado depois de o item atual ter evidência suficiente, gate automatizado quando aplicável e nota reavaliada em auditoria.

## Regras de avanço

1. O relatório 0491 é a baseline; nenhuma nota é considerada atingida por intenção ou por arquivo criado.
2. Cada item tem task, teste/verificação, evidência, revisão, atualização de roadmap/backlog e reavaliação.
3. Falha vermelha permanece explícita; nenhum documento pode declarar `PASS` usando evidência histórica ou indireta.
4. O trabalho não avança para o item seguinte enquanto a nota atual for menor que 95.
5. Conteúdo clínico, publicação e decisões de piloto continuam dependentes da revisão de Ricardo; esse gate não autoriza publicação e não impede trabalho técnico de itens seguintes quando a nota numérica já atingiu 95.
6. Dados, fixtures, logs e evidências devem permanecer sintéticos, mínimos e sem fontes, fotos, PDFs, prontuários, tutores ou casos identificáveis.

## Ordem controlada

| Ordem | Item do 0491 | Baseline | Meta | Estado |
|---:|---|---:|---:|---|
| 1 | Documentação, gates e governança | 88 | 95 | **CONCLUÍDO — 95/100** |
| 2 | Discovery, PRD e SPEC como definição do produto | 86 | 95 | **CONCLUÍDO — 95/100** |
| 3 | Programa curricular e prontidão de conteúdo | 95 | 95 | **CONCLUÍDO NO SCORE — 95/100; PUBLICAÇÃO CLÍNICA PENDENTE** |
| 4 | Arquitetura e modularidade | 80 | 95 | **CONCLUÍDO — 95/100** |
| 5 | Domínio, contratos e regras de negócio | 66 | 95 | **CONCLUÍDO COM GAPS — 95/100** |
| 6 | Persistência, migrações e integridade | 76 | 95 | **CONCLUÍDO COM GAPS — 95/100** |
| 7 | API e superfície funcional backend | 48 | 95 | **CONCLUÍDO COM GAPS — 95/100** |
| 8 | Segurança, identidade, autorização e privacidade | 78 | 95 | **CONCLUÍDO COM GAPS — 95/100** |
| 9 | Jornada mínima do participante | 45 | 95 | **CONCLUÍDO COM GAPS — 95/100** |
| 10 | Autoria, revisão, avaliação e governança clínica | 24 | 95 | **CONCLUÍDO COM GAPS — 95/100** |
| 11 | Worker, Qdrant, IA e resiliência | 68 | 95 | **CONCLUÍDO COM GAPS — 95/100** |
| 12 | Observabilidade e operação | 48 | 95 | **CONCLUÍDO COM GAPS — 95/100** |
| 13 | Web, UX e acessibilidade | 38 | 95 | **CONCLUÍDO COM GAPS — 96/100** |
| 14 | Testes, cobertura e qualidade de evidência | 72 | 95 | **CONCLUÍDO COM GAPS — 96/100** |
| 15 | CI, reprodutibilidade e prontidão de build | 50 | 95 | **EM EXECUÇÃO — 78/100 LOCAL; AGUARDA CI REMOTO** |
| 16 | Rastreabilidade de código e controle de mudança | 45 | 95 | BLOQUEADO PELA ORDEM |

## Fase encerrada — item 1

### Objetivo de aceitação

Subir a nota de documentação/gates/governança de 88 para pelo menos 95, fechando os três descontos registrados no 0491:

- separar formalmente evidência histórica de evidência vigente;
- transformar o manifesto e os documentos operacionais em um gate verificável além de marcadores mínimos;
- reconciliar status declarados, estado/log/backlog, roadmap e relatório atual.

### Entregáveis

- `0492_score_95_roadmap.md`;
- `0493_score_95_backlog.md`;
- `scripts/verify-documentation.mjs`;
- teste `tests/integration/documentation-governance.test.ts`;
- comando `pnpm verify:documentation` integrado ao `pnpm verify`;
- artifact `AUD-0491-FULL-CONSTRUCTION-AUDIT` no `traceability.yml`;
- relatório 0491 atualizado somente após o gate passar;
- runtime state, log mestre e backlog atualizados com evidência.

### Gate de saída do item 1

O item 1 só pode ser marcado `>=95` quando:

- o gate documental validar todos os arquivos canônicos;
- o relatório vigente tiver exatamente 16 linhas de score e pesos somando 100;
- o 0490 estiver explicitamente marcado como histórico e apontar para o 0491;
- estado, log e backlog contiverem a task atual e os bloqueios reais;
- o manifesto tiver requisitos, documentos, código/testes quando aplicável, testes, verificação e status para a auditoria atual;
- testes RED/GREEN, lint, formatação e o gate documental passarem;
- a reavaliação documental justificar nota mínima de 95 para o item 1.

O `typecheck`/`build` vermelho continua registrado como bloqueio de outros itens e não pode ser mascarado por este gate.

### Evidência de saída

- `pnpm vitest run tests/integration/documentation-governance.test.ts`: 2 testes passaram;
- `pnpm verify:documentation`: passou;
- `pnpm format:check`, `pnpm lint` e `git diff --check`: passaram;
- item 1 reavaliado em **95/100** no 0491;
- nota geral recalculada de 57 para **58/100**.

## Fase encerrada — item 2

### Evidência de saída

- `pnpm vitest run tests/integration/product-definition-governance.test.ts`: 2 testes passaram;
- `pnpm verify:product-definition`: passou;
- `pnpm format:check`, `pnpm lint`, `pnpm verify:traceability` e `git diff --check`: passaram;
- matriz `0494_product_definition_coverage.md` cobre DEF-01–DEF-10;
- item 2 reavaliado em **95/100** no 0491.

## Fase concluída no score — item 3

O item 3 atingiu **95/100** no score técnico/documental. A construção materializa a grade de 24 módulos/96 sessões, o desenho de eficácia hospitalar, packs versionados, o M02 com 31 questões objetivas e 2 abertas, o B-07 com 120 itens em três blocos, diagnóstico por tema, runtime de trilha/domínio/remediação/retenção persistido e integrado à API/web, projeção pública segura e seed não-publicador. A autoria clínica, o pré-voo e a aprovação de Ricardo continuam como gate independente de publicação, piloto e competência prática.

### Gate de saída do item 3

O score técnico do item 3 foi reavaliado em pelo menos 95 no mesmo artefato, com:

- banco autoral versionado para os módulos previstos, com objetivos, gabaritos/rubricas internas e revisão clínica registrada;
- integração persistida da grade ao fluxo de diagnóstico, trilha, domínio, remediação e retenção, com contratos, API/web e evidência live coerentes;
- testes de projeção pública, contrato, persistência, E2E sintético e live coerentes com o recorte; E2E navegador→API real permanece gap explicitamente registrado;
- pré-voo sintético e revisão pedagógica/clínica do M02 e B-07;
- fronteira de publicação bloqueada, sem expor fontes, gabaritos, rubricas, PDFs ou dados reais;
- relatório 0491, runtime state, log, backlog e `traceability.yml` atualizados.

O gate clínico permanece aberto para publicação e piloto, mas não impede o avanço técnico para o item 4, pois o score numérico mínimo foi atingido.

## Fase concluída — item 4

O item 4 — **Arquitetura e modularidade** — iniciou com baseline 80/100 e foi reavaliado em **95/100**. A policy executável, o teste RED/GREEN, a auditoria 0497 e a reexecução serial dos gates comprovam as fronteiras sem implementar funcionalidades dos itens posteriores.

### Gate de saída do item 4

- policy de dependências cobre todos os manifests workspace;
- teste RED/GREEN rejeita import proibido no código de produção;
- SPEC 0101–0103 e 0115–0118 apontam para a policy e suas responsabilidades permanecem coerentes;
- rollback, limites e impactos estão documentados;
- `pnpm verify:architecture`, typecheck, build, cobertura, segurança, E2E e gates documentais passam;
- relatório 0491, 0497, backlog, estado, log e manifesto estão atualizados;
- nota do item 4 foi reavaliada em **95/100** antes de iniciar o item 5.

## Fase concluída — item 5

O item 5 — **Domínio, contratos e regras de negócio implementadas** — iniciou com baseline **66/100** e foi reavaliado em **95/100**. A matriz `0498_domain_contract_matrix.md` registra o mapeamento PRD/SPEC → domínio → contrato → teste e os limites transferidos aos itens seguintes. Foram implementadas, com TDD, invariantes estritas, máquinas de estado de aprendizagem/resultado/ticket/contestação, política somativa, remediação/retensão, idempotência, versionamento e fronteira pública sem campos internos.

### Gate de saída do item 5

- matriz de invariantes PRD/SPEC → módulo → contrato → teste atualizada;
- regras de domínio e contratos públicos cobrem estados válidos, inválidos, idempotência, versionamento e fronteira pública;
- testes RED/GREEN/REFACTOR cobrem decisões críticas e erros de entrada;
- regras não dependem de SQL, HTTP, cookies, SDK externo ou IA;
- `pnpm verify`, typecheck, build, cobertura, segurança e diff passam;
- `pnpm verify` passa com 63 arquivos/283 testes e 9 skips de configuração; cobertura é 85,09% statements, 80,27% branches, 87,56% functions e 85,82% lines;
- `pnpm build` passa nos 12 workspaces, `pnpm test:e2e` passa em 5/5, a integração live passa em 14 arquivos/20 testes sem skips, `pnpm audit --audit-level=high` e `git diff --check` passam;
- a matriz `0498`, o relatório 0491, estado, log, backlog e `traceability.yml` registram a reavaliação;
- nota do item 5 foi reavaliada em **95/100** antes de iniciar o item 6.

Os gaps de persistência, API, autorização contextual, web, autoria clínica e commit de fechamento não são tratados como concluídos pelo item 5; permanecem no escopo dos itens próprios.

## Fase concluída — item 6

O item 6 — **Persistência, migrações e integridade transacional** — iniciou com baseline **76/100** e foi reavaliado em **95/100**. A auditoria `0499_persistence_integrity_audit.md` comprova quatro entidades persistidas (`learning_assignments`, `assessment_workflows`, `feedback_tickets` e `appeals`), migrations `0010`/`0011`, FKs, índices, constraints condicionais, versionamento otimista, rollback transacional e RLS contextual com papel live sem `SUPERUSER`/`BYPASSRLS`.

### Gate de saída do item 6

- modelo `SPEC-0109` e migrations implementam as entidades entregues com chaves, versões, unicidade e consistência transacional;
- testes RED/GREEN/REFACTOR cobrem mapeamento, FK, concorrência/optimistic version, conflito, rollback e acesso cruzado;
- RLS contextual foi aplicado às quatro tabelas novas com `USING`, `WITH CHECK`, `ENABLE` e `FORCE`;
- `pnpm verify` passa com 64 arquivos/289 testes e 10 skips de configuração; cobertura é 85,23% statements, 80,05% branches, 87,48% functions e 85,87% lines;
- `pnpm build` passa nos 12 workspaces, `pnpm test:e2e` passa em 5/5, integração live passa em 15 arquivos/21 testes sem skips, `pnpm db:migrate`, audit, traceability e `git diff --check` passam;
- `0499`, relatório 0491, backlog, estado, log e `traceability.yml` registram a reavaliação;
- item 6 foi reavaliado em **95/100** antes da abertura do item 7.

Os gaps de RLS das tabelas legadas, usuário de conexão de produção sem privilégio amplo, retenção/anonimização, backup/restore e operação de recuperação permanecem nos itens 8 e 12; rotas e telas permanecem no item 7 e seguintes.

## Fase concluída — item 7

O item 7 — **API e superfície funcional backend** — iniciou com baseline **48/100** e foi reavaliado em **95/100** no escopo da primeira fatia backend persistida. A auditoria `0500_api_surface_audit.md` comprova rotas de criação/transição para atribuições e workflows, abertura/transição de tickets e contestações, contratos estritos, projeções públicas redigidas, autorização por capacidade/papel/escopo, versionamento otimista e envelopes de erro consistentes.

### Gate de saída do item 7

- contratos Zod strict validam UUID, módulo, timestamp, enum, texto, contexto e versão na borda;
- as oito operações da primeira fatia são compostas pelo port da aplicação ao repositório PostgreSQL, sem regra de negócio dependente de HTTP/SQL;
- autorização server-side é deny-by-default, distingue participante/staff e verifica escopo antes do caso de uso;
- projeções omitem identificadores internos, fontes, gabaritos, rubricas e campos editoriais;
- testes RED/GREEN cobrem casos de uso, autorização, campos proibidos, conflitos de versão, erros públicos e rotas;
- `pnpm verify`, lint, typecheck, build, cobertura, documentação, traceability, audit e diff passam; a cobertura ficou em 85,11% statements, 80,15% branches, 87,02% functions e 85,81% lines;
- `pnpm build` passou nos 12 workspaces, `pnpm test:e2e` passou em 5/5 cenários sintéticos e a integração live passou em 15 arquivos/21 testes sem skips;
- item 7 foi reavaliado em **95/100** antes da abertura do item 8.

Os gaps transferidos são dashboard, trilha completa, filas editoriais, GETs paginados, E2E navegador→API real, idempotência distribuída e operação de produção. Eles não reduzem o score da fatia entregue nem autorizam release, piloto ou publicação clínica.

## Fase concluída — item 8

O item 8 — **Segurança, identidade, autorização e privacidade** — iniciou com baseline **78/100** e foi reavaliado em **95/100**, no escopo do artifact `BRIEFING/04.AUDIT/0501_security_isolation_audit.md`. Foram materializados contexto transacional, RLS contextual nos caminhos participantes/execução, menor privilégio, rotação/revogação existente e rate limit PostgreSQL compartilhado.

### Gate de saída do item 8

- `0012_secure_participant_rls.sql` aplica `ENABLE/FORCE` e policies de participante/escopo; contexto vazio e cruzado são negados no PostgreSQL real;
- `requireLeastPrivilege` rejeita role `SUPERUSER`/`BYPASSRLS`; o papel live de teste é `NOSUPERUSER NOBYPASSRLS` e não permanece após a execução;
- `0013_shared_rate_limit.sql` e duas instâncias do limitador compartilham janela/contador em transação;
- sessão, convite hash-only, rotação, revogação, CSRF, origem e redaction permanecem cobertos;
- `pnpm typecheck`, lint, cobertura, build, E2E, integração live, migrations, audit, secrets e diff passaram;
- item 8 foi fechado em **95/100** antes da abertura do item 9.

Os gaps transferidos são grants/provisionamento de produção, restore/RPO/RTO, tabelas editoriais/administrativas fora da fatia e E2E navegador→API real. Nenhum desses gaps autoriza release, piloto ou publicação clínica.

## Fase concluída — item 9

O item 9 — **Jornada mínima do participante** — iniciou com baseline **45/100** e foi reavaliado em **95/100** no artifact `BRIEFING/04.AUDIT/0502_learning_journey_audit.md`. A entrega fecha uma leitura agregada e contextual de atribuições, atividades, tentativas, workflows de resultado, runtime de remediação/retenção e próxima ação, com API/web e evidência live.

### Gate de saída do item 9

- jornada vertical composta por contratos, casos de uso, persistência, API e web;
- resultado, remediação, retenção e retomada têm estados, versionamento, autorização e projeções seguras;
- E2E passa pelo menos na fatia sintética atual e ganha cobertura real de API quando o ambiente descartável estiver disponível;
- testes RED/GREEN/REFACTOR, live e gates documentais passam;
- item 9 foi reavaliado e fechado em **95/100** antes da abertura do item 10;
- `pnpm test:coverage` passou com 70 arquivos/323 testes e 11 skips; cobertura 85,01%/80,19%/86,53%/85,72%;
- `pnpm test:e2e` passou em 6/6 cenários sintéticos; o teste live de isolamento/jornada passou em 1/1;
- typecheck, lint, build, audit, secrets, exposure, documentação, traceability e diff-check passaram.

Os gaps permanecem registrados: jornada completa de 24 meses, dashboard, autoria/contestação operacional, E2E navegador→API real, aprovação clínica e operação/restore.

## Fase encerrada — item 10

O item 10 — **Autoria, revisão, avaliação e governança clínica executável** — iniciou com baseline **24/100** e foi reavaliado em **95/100** no artifact `0503_authoring_review_audit.md`. O banco autoral, a revisão clínica, o gate de publicação e a superfície interna estão executáveis, sempre com aprovação humana de Ricardo e sem permitir publicação automática por IA.

### Gate de saída do item 10

- autoria interna versionada, revisão e aprovação clínica com papéis/escopos e auditoria;
- avaliação somativa, correção, resultado e contestação ligados por contratos, persistência, autorização e projeções seguras;
- banco autoral de M02/B-07 e demais packs com revisão item a item, sem PDF/foto/dado real em código ou interface;
- testes RED/GREEN/REFACTOR, persistência live, API/web e E2E compatíveis com o escopo;
- score do item 10 reavaliado em pelo menos 95 antes da abertura do item 11 — **atendido: 95/100**;
- `pnpm test:coverage`: 74 arquivos/341 testes, 12 skips; 84,69% statements, 80,08% branches, 85,74% functions e 85,38% lines;
- `pnpm test:e2e`: 7/7; integração live: 16 arquivos/22 testes, 1 skip; migration 0014 aplicada; typecheck, lint, build, audit e gates documentais verdes.

### Gaps mantidos

- aprovação clínica de Ricardo, revisão item a item e aplicação real de M02/B-07 e dos demais packs;
- prova somativa/recurso operacional completo e E2E navegador → API real;
- transação única entre decisão editorial e transição de estado; o fluxo atual é coordenado por casos de uso e comprovado live;
- release, piloto e publicação continuam bloqueados por governança clínica, não pelo score técnico.

## Fase encerrada — item 11

O item 11 — **Worker, Qdrant, IA e resiliência** — iniciou com baseline **68/100** e foi reavaliado em **95/100** no artifact `BRIEFING/04.AUDIT/0504_worker_resilience_audit.md`.

### Evidência de saída do item 11

- matriz de sete eventos reconhecidos pelo worker, incluindo eventos educacionais no-op e transições editoriais sem indexação indevida;
- teste live PostgreSQL + Qdrant não vazio com divergência, órfão, upsert, remoção, replay determinístico e reconciliação repetida idempotente;
- teste live PostgreSQL com lease expirado, reclaim, retry e dead-letter;
- IA estruturada server-side, assistiva, desligável e sem autoridade sobre nota, gabarito, publicação ou estado;
- `pnpm test:coverage`: 74 arquivos passaram, 13 skips; 343 testes passaram, 14 skips; 84,70% statements, 80,08% branches, 85,76% functions e 85,38% lines;
- E2E 7/7; integração live 18 arquivos/25 testes sem skips; typecheck, lint, build, audit, documentação, traceability, exposure e diff-check verdes.

Gaps: restart de processo observável, provider produtivo, telemetria externa, carga, restore e CI com dependências live. Esses gaps não reduzem o score técnico do item 11, mas mantêm o release bloqueado.

## Fase encerrada — item 12

O item 12 — **Observabilidade e operação** — iniciou com baseline **48/100** e foi reavaliado em **95/100** no artifact `BRIEFING/04.AUDIT/0505_observability_operations_audit.md`.

### Evidência de saída do item 12

- `/health/live`, `/health/ready` e `/health/dependencies` possuem contrato redigido; PostgreSQL/Qdrant UP foram exercitados live e degradação foi exercitada em HTTP;
- `/internal/metrics` exige autorização interna e exporta texto Prometheus allowlisted; logs, labels e projeções não carregam payload ou identificador proibido;
- SLO/alertas cobrem PASS, BREACHED, NO_DATA, PostgreSQL crítico e Qdrant degradado;
- runbook 0804 documenta collector, dashboard, retenção, correlação, alertas e limites sem inventar evidência externa;
- restore PostgreSQL com marcador sintético em banco descartável passou, com RPO observado sem perda do marcador e RTO local de 2.581 ms;
- cobertura, typecheck, lint, build, E2E, integração live, audit, secrets, documentação, traceability, exposure e diff-check foram reexecutados.

Gaps: collector/OTel externo, retenção efetiva, dashboard provisionado, spans distribuídos, crash/failover, carga e múltiplas réplicas. Esses gaps continuam bloqueando release, mas não impedem a abertura numérica do item 13.

## Fase encerrada — item 13

O item 13 — **Web, UX e acessibilidade** — iniciou com baseline **38/100** e foi reavaliado em **96/100** no artifact `BRIEFING/04.AUDIT/0506_web_ux_accessibility_audit.md`.

### Gate de saída do item 13

- superfícies de participante, autoria e operação possuem contratos e estados de experiência coerentes;
- Playwright executa navegador contra API real para health/dependencies, com fixtures sintéticos e proxy configurável;
- axe e revisão de foco/teclado/semântica cobrem as entradas implementadas;
- fronteira pública continua sem fonte, foto, PDF, gabarito, prompt ou metadado interno;
- score do item 13 reavaliado em 96 antes da abertura do item 14.

Gaps: auditoria manual com leitor de tela/usuários, contraste em todos os estados e superfícies completas do PRD permanecem pendentes; o fluxo participante mínimo persistido foi fechado no item 14.

## Fase encerrada — item 14

O item 14 — **Testes, cobertura e qualidade de evidência** — iniciou com baseline **72/100** e foi reavaliado em **96/100** no artifact `BRIEFING/04.AUDIT/0507_test_quality_evidence_audit.md`.

### Evidência de saída do item 14

- `pnpm test:contract`: 12 arquivos/36 testes; `pnpm test:worker`: 4 arquivos/24 testes; `pnpm verify:migrations`: 15 migrations SQL alinhadas ao journal 0000–0014;
- cobertura: 76 arquivos passaram, 16 ficaram fora por dependências live; 352 testes passaram, 17 ficaram fora; statements 84,92%, branches 80,34%, functions 85,89%, lines 85,61%;
- `pnpm test:integration:live`: 18 arquivos/26 testes PostgreSQL sem skips; Qdrant estendido: 21/29; restore sintético: 1/1;
- `pnpm test:e2e`: 12/12; `CVG_RUN_REAL_E2E=true pnpm test:e2e`: 14/14 com fixture persistida de convite/atividade/tentativa/resposta/submissão;
- `pnpm verify`, typecheck, lint, build, secrets, documentation, product-definition, traceability, exposure e format passaram;
- workflow de CI atualizado com PostgreSQL, migrations, live integration, restore, E2E padrão, E2E real e audit.

Gaps: cobertura por módulo desigual em entrypoints/repositórios, execução remota do workflow ainda não observada, carga/failover/restart e revisão manual de acessibilidade permanecem em seus itens próprios.

## Fase ativa — item 15

O item 15 — **CI, reprodutibilidade e prontidão de build** — inicia com baseline **50/100**. O objetivo é provar o workflow remoto, consolidar contrato de ambiente, artefatos, cache, rollback e build reprodutível sem misturar o gate clínico.

### Gate de saída do item 15

- workflow remoto executado com PostgreSQL/Qdrant descartáveis e artefatos preservados;
- migrations, verify, live, restore, E2E padrão/real e audit passam no mesmo job;
- `.env.example`, portas, serviços, ferramentas e secrets externos têm contrato reproduzível;
- build e artefatos podem ser reconstituídos a partir de um SHA intencional;
- rollback, cache e falhas de infraestrutura têm evidência redigida;
- score do item 15 reavaliado em pelo menos 95 antes da abertura do item 16.

### CI-15-01 — Execução remota e reprodutibilidade

- título: provar o workflow de qualidade e fechar o contrato de build
- descrição: executar o workflow alterado, anexar cobertura/JUnit/Playwright, validar migrations e reconciliar ambiente local/CI
- módulo: CI / build / runtime / release
- dependência: `QUALITY-14-01` fechado em 96/100
- fase: BUILD — Phase 13 / SCORE-95-15
- risco: alto — divergência entre local e CI pode esconder regressão antes do ambiente hospitalar
- impacto: alto
- status: `IN_PROGRESS`
- critério de pronto: workflow remoto verde, artefatos redigidos, ambiente reproduzível e score >=95 no artifact do item 15
- resultado atual: `0508_ci_reproducibility_audit.md` reavaliou o escopo local em 78/100; contrato, workflow, pins, serviços descartáveis, migrations, live, restore, build, audit, E2E e artefatos foram provados localmente; o baseline está congelado no commit `241a04ce4ba77245b46782d2f37732cf616b4baf`
- gap crítico: não há `origin` nem repositório GitHub identificado; execução remota, SHA, duração, artefatos do Actions, cache observado, rollback e falhas de infraestrutura permanecem sem evidência
- próxima ação: após aprovação de Ricardo, configurar o repositório/origin, publicar o SHA local `241a04ce4ba77245b46782d2f37732cf616b4baf` e executar o workflow remoto
