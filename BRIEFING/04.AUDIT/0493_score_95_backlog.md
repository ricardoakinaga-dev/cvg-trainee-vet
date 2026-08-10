# 0493 — Backlog controlado da meta 95/100

**Roadmap:** `BRIEFING/04.AUDIT/0492_score_95_roadmap.md`  
**Baseline:** `BRIEFING/04.AUDIT/0491_full_construction_audit.md`  
**Item ativo:** 15 — CI, reprodutibilidade e prontidão de build  
**Itens 1–12:** score técnico/documental concluído em 95/100 nos escopos registrados; itens 13 e 14 foram reavaliados em 96/100; publicação clínica do item 3, aprovação humana do conteúdo e aplicação real continuam pendentes.  
**Regra:** cada item deve ser reavaliado em pelo menos 95/100 antes da abertura do seguinte. Aprovação clínica continua obrigatória para publicação/piloto, mas não bloqueia construção técnica não clínica.

## Item 1 — Documentação, gates e governança

### SCORE-01 — Congelar baseline e critérios

- status: `COMPLETED`
- evidência: 0491, 0492 e este backlog
- pronto quando: baseline, nota, descontos, meta e ordem de avanço estão escritos.

### SCORE-02 — Escrever teste RED do gate documental

- status: `COMPLETED`
- dependência: SCORE-01
- teste: `tests/integration/documentation-governance.test.ts`
- evidência: execução RED registrada antes de `scripts/verify-documentation.mjs` existir.

### SCORE-03 — Implementar verificador documental

- status: `COMPLETED`
- dependência: SCORE-02
- arquivo: `scripts/verify-documentation.mjs`
- pronto quando: valida arquivos canônicos, runtime state, log, backlog, report vigente, report histórico e traceability artifact.

### SCORE-04 — Integrar o gate ao pipeline

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-03
- arquivo: `package.json`
- pronto quando: `pnpm verify:documentation` existir e `pnpm verify` o executar sem alterar a ordem de falhas existentes. O comando direto e o `pnpm verify` atual passaram; a divergência restante é a cobertura de serviços live no CI.

### SCORE-05 — Reconciliar manifestos e evidência vigente

- status: `COMPLETED`
- dependência: SCORE-03
- arquivos: `traceability.yml`, `0490`, `0491`, `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`
- pronto quando: a auditoria atual tiver ID, requisitos, documentos, testes, comando de verificação e status sem declarar PASS para evidência histórica.

### SCORE-06 — Executar review documental

- status: `COMPLETED`
- dependência: SCORE-04 e SCORE-05
- verificações: teste direcionado, `pnpm verify:documentation`, format, lint e `git diff --check`.
- pronto quando: todas as verificações passarem e nenhuma inconsistência restar.

### SCORE-07 — Reavaliar e registrar nota do item 1

- status: `COMPLETED`
- dependência: SCORE-06
- pronto quando: o relatório 0491 registrar justificativa e nota >=95 para “Documentação, gates e governança”. Evidência: 0491 reavaliado em 95/100.

## Item 2 — Discovery, PRD e SPEC como definição do produto

### SCORE-08 — Congelar baseline do item 2

- status: `COMPLETED`
- dependência: SCORE-07 concluído
- escopo: auditar coerência entre Discovery aprovado, PRD aprovado, SPEC aprovado, decisões e requisitos executáveis.
- próximo teste: escrever RED para detectar requisitos ausentes, gates inconsistentes e links/documentos divergentes.
- regra: não implementar produto novo nesta task; primeiro medir e fechar a definição documental.

### SCORE-09 — Reavaliar item 2 e fechar a matriz

- status: `COMPLETED`
- dependência: SCORE-08
- evidência: `0494_product_definition_coverage.md`, `pnpm verify:product-definition`, teste direcionado, format, lint, traceability e diff-check
- resultado: item 2 reavaliado em **95/100** no relatório 0491.

## Item 3 — Programa curricular e prontidão de conteúdo

### SCORE-10 — Congelar baseline curricular e decisão humana

- status: `COMPLETED`
- dependência: SCORE-09 concluído
- escopo: auditar proposta V3, B-07, primeira fatia M02, regras de autoria, revisão, publicação, carga, itens e condições de piloto.
- evidência: `0495_pesquisa_praticas_mundiais_treinamento_hospitalar.md`, `0017_programa_curricular_24_meses.md`, `0022_leitura_literatura_e_matriz_curricular.md`, `0024_template_autoria_revisao_interno.md`
- resultado: pesquisa e limites do MVP digital foram congelados; literatura local F-01/F-02/F-03 permanece base interna, com diretrizes atuais/protocolos aprovados prevalecendo em temas dinâmicos.
- regra: não produzir ou publicar conteúdo clínico real sem revisão clínica; construção técnica usa somente artefatos sintéticos e templates.

### SCORE-11 — Pesquisar práticas mundiais e desenhar eficácia hospitalar

- status: `COMPLETED`
- dependência: SCORE-10
- evidência: `0495_pesquisa_praticas_mundiais_treinamento_hospitalar.md`
- resultado: ciclo baseline → recuperação ativa → caso progressivo → equipe/simulação → debriefing → transferência piloto → D+7/D+30/D+90 → auditoria/feedback; pesquisa institucional AHRQ, WHO, INACSL, RCVS, Cochrane, PubMed, AAHA e RECOVER registrada com links diretos.
- regra: transferência prática, habilidade psicomotora e autonomia ficam fora do MVP digital.

### SCORE-12 — Construir catálogo, blueprints, questões, projeção e seed

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-11
- evidência: pacote `packages/curriculum`, contratos, persistência, web, migrações `0007_small_khan.sql`/`0008_abnormal_zzzax.sql`, testes de catálogo/contrato/persistência/E2E/live e artifact `CURRICULUM-HOSPITAL-DESIGN-003`
- resultado: 24 módulos/96 sessões; M02 com 31 questões objetivas + 2 abertas; B-07 com 120 posições; alternativas simples/múltiplas; seed `PROJECAO_VERIFICADA` sem publicação automática.
- gap: os packs fora de M02 ainda são drafts parametrizados e o pré-voo clínico de conteúdo ainda não está concluído; a integração digital exige RLS contextual e E2E navegador→API real para ampliar a evidência.

### SCORE-14 — Materializar diagnóstico B-07 e runtime educacional técnico

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-12
- evidência: `BRIEFING/04.AUDIT/0496_curriculum_runtime_preflight.md`; `packages/curriculum/src/learning-runtime.ts`; `packages/curriculum/src/projection.ts`; `packages/curriculum/src/content-seed.ts`; testes do runtime e catálogo
- resultado: B-07 materializado com 120 itens em 3 blocos de 40; diagnóstico não punitivo por tema sem nota global; 24 packs versionados; domínio 70%/80%, erro crítico, remediação dirigida, trilha por pré-requisito, correção humana e D+7/D+30/D+90; preflight técnico passa e publicação permanece bloqueada
- gap: autoria clínica específica, ensaio de conteúdo e aprovação de Ricardo continuam pendentes; a integração persistida/API/web foi fechada no recorte digital, com RLS contextual e E2E navegador→API real mantidos como gaps explícitos.

### SCORE-15 — Integrar runtime persistido, contratos, API e web

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-14
- evidência: `packages/application/src/curriculum-runtime-use-cases.ts`; `packages/persistence/src/curriculum-runtime-repository.ts`; `packages/persistence/src/schema.ts`; `packages/persistence/drizzle/0009_nappy_nightcrawler.sql`; `packages/contracts/src/learning.ts`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/web/app/page.tsx`; artifact `CURRICULUM-RUNTIME-INTEGRATION-005`
- testes: casos de uso, repositório, contratos, API, `tests/integration/curriculum-runtime.test.ts`, 5 cenários E2E sintéticos e 17 testes live/1 skip
- resultado: o estado digital é validado, persistido por participante/escopo/módulo, versionado, lido por projeção pública segura e avaliado somente em rota interna moderada; respostas abertas aguardam correção humana e nenhum campo interno chega ao participante
- gap: RLS contextual, E2E navegador→API real, autoria clínica e autorização de publicação continuam pendentes.

### SCORE-13 — Reavaliar e registrar a nota do item 3

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-12
- evidência: 0491 reavaliado em **95/100 técnico/documental**; 0496; `pnpm verify`, `pnpm typecheck`, `pnpm build`, cobertura, E2E, integração live e testes direcionados do runtime executados
- resultado: nota elevou-se de 18 para 95 após a integração persistida/API/web; o gate clínico permanece aberto para publicação/piloto, mas a régua numérica libera o item 4.
- próxima ação: manter autoria clínica, pré-voo e aprovação de Ricardo como gate de publicação/piloto enquanto o item 4 avança.

### SCORE-16 — Tornar a matriz arquitetural executável

- status: `COMPLETED`
- dependência: SCORE-13 com score técnico >=95
- escopo: transformar o mapa SPEC 0101–0103 em policy versionada de manifests, dependências permitidas e imports proibidos
- evidência: `architecture-boundaries.json`; `BRIEFING/04.AUDIT/0497_architecture_boundary_audit.md`; atualização de `0103_mapa_de_modulos.md`
- resultado: os 12 manifests workspace possuem allowlist explícita; a policy preserva PostgreSQL como fonte, adapters para Qdrant/IA e ausência de dependência server-side na web

### SCORE-17 — Testar, auditar e reavaliar item 4

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-16
- teste RED: `pnpm vitest run tests/integration/architecture-boundaries.test.ts` falhou antes da policy por arquivo ausente
- teste GREEN: o mesmo comando passou com 2 testes após a policy; gate permanente `pnpm verify:architecture`
- evidência: `tests/integration/architecture-boundaries.test.ts`; `0497_architecture_boundary_audit.md`; relatório 0491 item 4 = **95/100**; `pnpm verify` 59/260 com 9 skips; E2E 5/5; live 13/19 com 1 skip
- resultado: policy, teste RED/GREEN, gate integrado, build/typecheck/coverage, E2E, live, audit e documentação passaram serialmente; item 4 reavaliado em 95/100
- próxima ação: iniciar o baseline do item 5; gaps de ports compartilhados e commit rastreável permanecem registrados nos itens próprios

### SCORE-18 — Congelar baseline do item 5

- status: `COMPLETED`
- dependência: SCORE-17
- escopo: auditar domínio, contratos e regras de negócio implementadas contra o item 5 do 0491, sem antecipar persistência/API/segurança dos itens posteriores
- evidência: `BRIEFING/04.AUDIT/0498_domain_contract_matrix.md`; SPEC 0104–0108; `packages/domain`; `packages/contracts`; `packages/application`; testes unitários e contratos
- resultado: baseline, limites e critérios foram congelados; o domínio e os contratos passaram a ser tratados como o escopo ativo da fase.

### SCORE-19 — Implementar regras de domínio e contratos em TDD

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-18
- escopo: cobrir invariantes de timestamp/estado, imutabilidade, política somativa 0/30/70, limiares 70/80, dados incompletos/não aplicáveis, tentativas, atribuições, workflow de resultado, tickets e contestação sem depender de SQL, HTTP, SDK ou IA
- evidência: `packages/domain/src/timestamp.ts`; `attempt.ts`; `answer.ts`; `assessment.ts`; `assessment-policy.ts`; `content.ts`; `learning-state.ts`; `appeal.ts`; `packages/contracts/src/assessment.ts`; `correction.ts`; `learning.ts`; `learning-state.ts`
- testes: `packages/domain/src/*.test.ts`; `packages/contracts/src/*.test.ts`; testes de casos de uso de tentativa, resposta e correção
- resultado: testes RED/GREEN/REFACTOR passaram; objetos de domínio são versionados/congelados; contratos estritos rejeitam HTML, campos internos, escolha vazia e payload condicional inválido
- gap: persistência, rotas, autorização contextual e telas das novas entidades permanecem nos itens 6–9

### SCORE-20 — Reexecutar gates e reavaliar item 5

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-19
- evidência: `0498_domain_contract_matrix.md`; `0491_full_construction_audit.md`; `traceability.yml`; `pnpm verify`; `pnpm build`; `pnpm test:e2e`; integração PostgreSQL/Qdrant live; `pnpm audit --audit-level=high`; `git diff --check`
- resultado: 63 arquivos/283 testes passaram, com 9 skips de configuração; cobertura 85,09%/80,27%/87,56%/85,82%; build 12 workspaces; E2E 5/5; live 14 arquivos/20 testes, sem skips; item 5 reavaliado em **95/100**
- próxima ação: abrir o baseline do item 6 e implementar somente persistência, migrações, integridade e RLS contextual autorizadas pelo SPEC 0109–0111

## Item 6 — Persistência, migrações e integridade transacional

### SCORE-21 — Congelar baseline e invariantes persistidos do item 6

- status: `COMPLETED`
- dependência: SCORE-20 com item 5 >=95
- escopo: ligar as entidades e regras do item 5 ao PostgreSQL, revisar SPEC 0109–0111, migrações, versionamento, FK, unicidade, histórico, transações, RLS contextual e rollback
- evidência: baseline 76/100 no 0491; SPEC 0109–0111; `packages/persistence/src/schema.ts`; migrations `0000`–`0009`; `0499_persistence_integrity_audit.md`
- resultado: invariantes e critérios do item foram congelados; os gaps foram separados entre entidades novas, tabelas legadas, operação e API.

### SCORE-22 — Implementar schema e migrations das entidades de aprendizagem

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-21
- escopo: persistir atribuição, workflow de resultado, ticket e contestação com FK, índices, unicidade, constraints condicionais, `version` e RLS contextual
- evidência: `packages/persistence/src/schema.ts`; `packages/persistence/src/index.ts`; `packages/persistence/drizzle/0010_classy_kronos.sql`; `packages/persistence/drizzle/0011_daffy_nova.sql`
- resultado: migrations 0010 e 0011 aplicadas; 0011 corrigiu a semântica de `NULL` nas constraints condicionais sem editar migration já aplicada.
- gap: RLS das tabelas legadas, retenção/anonimização e restore permanecem nos itens próprios.

### SCORE-23 — Implementar repositório, contexto e concorrência em TDD

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-22
- escopo: mappers estritos, transação-local `set_config`, criação versão 0, atualização condicional, leitura contextual e conflito otimista
- evidência: `packages/persistence/src/learning-state-repository.ts`; `packages/persistence/src/learning-state-repository.test.ts`; `tests/integration/postgres-learning-state.test.ts`
- resultado: caminhos de criação, transição, leitura, conflito, rollback, FK, constraint e acesso cruzado passaram com dados sintéticos; papel live de teste não possui `SUPERUSER` nem `BYPASSRLS`.
- gap: o usuário de conexão do container local ainda é privilegiado; o contrato de produção deve usar usuário sem privilégio amplo.

### SCORE-24 — Reexecutar gates e fechar o item 6

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-23
- evidência: `BRIEFING/04.AUDIT/0499_persistence_integrity_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `traceability.yml`; `pnpm verify`; `pnpm build`; `pnpm test:e2e`; integração live; `pnpm db:migrate`; `pnpm audit --audit-level=high`; `git diff --check`
- resultado: 64 arquivos/289 testes passaram, com 10 skips de configuração; cobertura 85,23%/80,05%/87,48%/85,87%; build 12 workspaces; E2E 5/5; live 15 arquivos/21 testes, sem skips; migrations 0010/0011 aplicadas; item 6 reavaliado em **95/100**.
- próxima ação: abrir o item 7 e escrever RED para contratos/rotas/autoridade server-side das entidades já persistidas.

## Item 7 — API e superfície funcional backend

### API-07-01 — Baseline de rotas e contratos persistidos

- status: `COMPLETED_WITH_GAPS`
- dependência: SCORE-24 com item 6 >=95
- baseline: 48/100
- escopo: contratos, endpoints, validação, autorização server-side, envelopes, idempotência e integração API/PostgreSQL para a primeira fatia das entidades de aprendizagem
- evidência: `BRIEFING/04.AUDIT/0500_api_surface_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md` item 7; SPEC 0106–0108, 0111 e 0118; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/api/src/server.ts`; `packages/contracts`; `packages/application`
- código: `packages/application/src/learning-state-use-cases.ts`; `packages/application/src/authorization.ts`; `packages/contracts/src/learning-state.ts`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/api/src/server.ts`
- testes: `packages/application/src/learning-state-use-cases.test.ts`; `packages/application/src/authorization.test.ts`; `packages/contracts/src/learning-state.test.ts`; `apps/api/src/http.test.ts`; `apps/api/src/server.test.ts`
- resultado: a primeira fatia expõe criação/transição de atribuições e workflows, tickets e contestações com contrato strict, projeção redigida, autorização por papel/escopo, versionamento e erros públicos; item 7 reavaliado em **95/100**
- gap: dashboard, trilha completa, filas editoriais, GETs paginados, E2E navegador→API real, idempotência distribuída e operação de produção permanecem nos itens próprios

### API-07-02 — Implementar rotas e composição da primeira fatia

- status: `COMPLETED_WITH_GAPS`
- dependência: API-07-01
- escopo: ligar casos de uso aos contratos HTTP e ao repositório persistido sem expor IDs, fontes, gabaritos, rubricas ou detalhes de infraestrutura
- evidência: `BRIEFING/04.AUDIT/0500_api_surface_audit.md`; SPEC 0106/0107/0111/0118
- resultado: oito operações foram compostas no API com `401/403/404/409/422/500`, route template parametrizado e projeções públicas seguras; participante cria ticket/contestação apenas no contexto próprio e staff transiciona com escopo

### API-07-03 — Reexecutar gates e fechar item 7

- status: `COMPLETED_WITH_GAPS`
- dependência: API-07-02
- verificações: `pnpm verify`; `pnpm test:coverage`; `pnpm lint`; `pnpm typecheck`; `pnpm build`; `pnpm test:e2e`; integração PostgreSQL/Qdrant live; `pnpm audit --audit-level=high`; `pnpm verify:documentation`; `pnpm verify:traceability`; `git diff --check`
- resultado: 65 arquivos/299 testes passaram, 10 skips de configuração; cobertura 85,11%/80,15%/87,02%/85,81%; build 12 workspaces; E2E 5/5; live 15 arquivos/21 testes sem skips; item 7 reavaliado em **95/100**
- próxima ação concluída: abrir `SECURITY-08-01` com baseline 78/100 e escrever RED para RLS legado, conexão sem privilégio amplo, recuperação/rotação, rate limit e isolamento live

## Item 8 — Segurança, identidade, autorização e privacidade

### SECURITY-08-01 — Hardening de isolamento e identidade

- status: `COMPLETED_WITH_GAPS`
- dependência: API-07-03 com item 7 >=95
- baseline: 78/100
- escopo: RLS contextual das tabelas legadas sensíveis, usuário de conexão sem privilégio amplo, recuperação/rotação de sessão e convite, rate limit distribuído ou evidência de limite local, exposição pública e testes live negativos
- evidência: `BRIEFING/04.AUDIT/0501_security_isolation_audit.md`; item 8 do `0491`; SPEC 0111, 0112, 0113 e 0118; migrations 0012/0013
- código: `packages/persistence/src/security-context.ts`; `packages/persistence/src/database.ts`; `packages/persistence/src/rate-limit-repository.ts`; repositórios protegidos; `packages/application/src/transaction-context.ts`; `apps/api/src/request-security.ts`; `apps/api/src/server.ts`; `apps/api/src/main.ts`
- testes: `packages/persistence/src/security-context.test.ts`; `packages/persistence/src/rate-limit-repository.test.ts`; `apps/api/src/request-security.test.ts`; `apps/api/src/server.test.ts`; `tests/integration/postgres-security-isolation.test.ts`
- verificação: 67 arquivos/309 testes, 11 skips; cobertura 84,81%/80,03%/86,69%/85,48%; build 12 workspaces; E2E 5/5; live 15 arquivos/21 testes, 1 skip de configuração; migrations 0012/0013, audit e diff passaram
- resultado: item 8 reavaliado em **95/100**; contexto vazio/cruzado e escopo cruzado foram negados com papel live sem `SUPERUSER`/`BYPASSRLS`, menor privilégio foi validado e duas instâncias compartilharam o bucket de rate limit
- gaps: grants/provisionamento de produção, restore/RPO/RTO, tabelas editoriais/administrativas fora da fatia e E2E navegador→API real permanecem nos itens próprios

## Item 9 — Jornada mínima do participante

### JOURNEY-09-01 — Fechamento da jornada vertical

- status: `COMPLETED_WITH_GAPS`
- dependência: `SECURITY-08-01` fechado em 95/100
- baseline: 45/100
- escopo: diagnóstico, trilha, atividade, tentativa, avaliação, resultado, remediação, retenção e retomada com contratos, persistência, API, web e autorização
- evidência: `BRIEFING/04.AUDIT/0502_learning_journey_audit.md`; `packages/application/src/journey-use-cases.ts`; `packages/persistence/src/journey-repository.ts`; `packages/contracts/src/journey.ts`; `GET /api/v1/learning-path`; `apps/web/app/page.tsx`
- testes: contratos/aplicação/persistência/API; `tests/integration/postgres-security-isolation.test.ts`; `tests/e2e/participant-access.spec.ts`
- verificação: 70 arquivos/323 testes, 11 skips; cobertura 85,01%/80,19%/86,53%/85,72%; E2E 6/6; live 1/1 no cenário de jornada; typecheck/lint/build/audit/secrets/exposure/documentação/traceability/diff passaram
- resultado: item 9 reavaliado em **95/100**; jornada agregada segura lê atribuições, atividades/tentativas, workflows, runtime e próxima ação; campos internos são removidos e participante cruzado retorna vazio
- gaps: jornada completa de 24 meses, dashboard, autoria/contestação operacional, E2E navegador→API real, aprovação clínica e operação/restore permanecem nos itens próprios

## Item 10 — Autoria, revisão, avaliação e governança clínica executável

### AUTHORING-10-01 — Banco autoral e revisão governada

- título: materializar autoria, revisão, avaliação somativa, contestação e publicação clínica controlada
- descrição: ligar registros autorais versionados a objetivos, gabaritos/rubricas internas, revisão item a item, correção, resultado e recurso, sem permitir publicação automática por IA
- módulo: autoria / avaliação / governança clínica / API / web
- dependência: `JOURNEY-09-01` fechado em 95/100; aprovação de Ricardo para conteúdo clínico
- fase: BUILD — Phase 8 / SCORE-95-10
- risco: crítico — conteúdo clínico sem revisão ou avaliação incorreta pode causar dano operacional
- impacto: alto
- status: `COMPLETED_WITH_GAPS`
- evidência: `BRIEFING/04.AUDIT/0503_authoring_review_audit.md`; migration `0014_salty_penance.sql`; `packages/curriculum/src/authoring.ts`; `packages/application/src/authoring-use-cases.ts`; `packages/persistence/src/authoring-repository.ts`; `packages/contracts/src/authoring.ts`; `apps/api/src/http.ts`; `apps/web/app/authoring/page.tsx`
- testes: `packages/curriculum/src/authoring.test.ts`; `packages/application/src/authoring-use-cases.test.ts`; `packages/persistence/src/authoring-repository.test.ts`; `packages/contracts/src/authoring.test.ts`; `apps/api/src/http.test.ts`; `tests/integration/postgres-authoring-workflow.test.ts`; `tests/e2e/authoring-review.spec.ts`; worker handlers/loop
- verificação: 74 arquivos/341 testes, 12 skips; cobertura 84,69%/80,08%/85,74%/85,38%; E2E 7/7; integração live 16 arquivos/22 testes, 1 skip; migration 0014; typecheck/lint/build/audit/secrets/exposure/documentação/traceability/diff passaram
- resultado: item 10 reavaliado em **95/100**; autoria versionada, preflight, revisão independente, gate de publicação, persistência e superfície interna estão executáveis sem expor gabarito/fonte ao participante
- gaps: aprovação de Ricardo, revisão item a item/aplicação real dos bancos, tela completa de prova/recurso, E2E navegador→API real e transação única editorial permanecem pendentes
- próxima ação: abrir `RESILIENCE-11-01` para worker, Qdrant, IA assistiva e recovery

## Item 11 — Worker, Qdrant, IA e resiliência

### RESILIENCE-11-01 — Worker, índice derivado e recuperação

- título: provar processamento não vazio, reconciliação, retry, replay e degradação segura
- descrição: cobrir todos os eventos emitidos, indexação/remoção/reconciliação no Qdrant, lease/retry/dead-letter, recovery e IA estruturada sem autoridade editorial
- módulo: worker / Qdrant / IA / resiliência / observabilidade
- dependência: `AUTHORING-10-01` fechado em 95/100
- fase: BUILD — Phase 9 / SCORE-95-11
- risco: alto — evento não tratado ou índice divergente pode atrasar publicação/retirada ou gerar sugestão inconsistente
- impacto: alto
- status: `COMPLETED_WITH_GAPS`
- evidência: `BRIEFING/04.AUDIT/0504_worker_resilience_audit.md`; `apps/worker/src/handlers.ts`; `apps/worker/src/loop.ts`; `apps/worker/src/reconcile.ts`; `packages/integrations/src/qdrant.ts`; `packages/integrations/src/ai.ts`; `tests/integration/worker-qdrant-live.test.ts`; `tests/integration/postgres-worker.test.ts`
- verificações: `pnpm test:coverage`; `pnpm typecheck`; `pnpm lint`; `pnpm build`; `pnpm test:e2e`; integração live PostgreSQL/Qdrant; `pnpm audit --audit-level=high`; gates de documentação, traceability, exposure e `git diff --check`
- resultado: matriz de eventos completa, conteúdo não vazio, divergência/órfão/replay/retirada, lease expirado, retry e dead-letter passaram; cobertura 84,70%/80,08%/85,76%/85,38%, 7/7 E2E e 18 arquivos/25 testes live sem skips; item 11 reavaliado em **95/100**
- gaps: restart observável, provider produtivo, telemetria externa, carga, restore e CI com dependências live permanecem nos itens próprios
- próxima ação: abrir `OBSERVABILITY-12-01` para health/dependencies, métricas exportáveis, alertas, traces, runbooks e restore

## Item 12 — Observabilidade e operação

### OBSERVABILITY-12-01 — Operação verificável e recuperação

- título: provar observabilidade, dependências, alertas e recuperação operacional
- descrição: fechar health/dependencies, collector/exporter, correlação, redaction, métricas, SLO, traces, dashboards, runbooks, backup/restore e RPO/RTO
- módulo: observabilidade / API / worker / operação / banco
- dependência: `RESILIENCE-11-01` fechado em 95/100
- fase: BUILD — Phase 10 / SCORE-95-12
- risco: alto — falha silenciosa ou recuperação não testada pode ocultar degradação e impedir continuidade hospitalar
- impacto: alto
- status: `COMPLETED_WITH_GAPS`
- evidência: `BRIEFING/04.AUDIT/0505_observability_operations_audit.md`; `BRIEFING/08.RUNTIME/0804_observability_operational_contract.md`; `apps/api/src/http.ts`; `apps/api/src/server.ts`; `packages/observability/src/observability.ts`; `packages/observability/src/operations.ts`; `scripts/verify-postgres-restore.mjs`; `tests/integration/api-health.test.ts`; `tests/integration/postgres-restore.test.ts`
- verificações: cobertura, typecheck, lint, build, server/http/composição/observabilidade/SLO unitários, API health live, restore live, E2E, integração PostgreSQL/Qdrant, audit, secrets, documentation, traceability, exposure e diff-check
- resultado: health/dependencies, exporter protegido, redaction, correlação, SLO/alertas, runbooks e restore sintético passaram; item 12 reavaliado em **95/100**
- gaps: collector/OTel externo, retenção efetiva, dashboard provisionado, traces distribuídos, crash/failover, carga e múltiplas réplicas permanecem pendentes

## Item 13 — Web, UX e acessibilidade

### EXPERIENCE-13-01 — Jornada web e acessibilidade verificáveis

- título: fechar as superfícies de treinamento, equipe e operação com experiência acessível
- descrição: ligar telas à API real, materializar estados de loading/empty/error/forbidden/stale/retry, aplicar axe/revisão manual, teclado/foco/semântica/contraste e manter projeção pública redigida
- módulo: web / API / acessibilidade / experiência operacional
- dependência: `OBSERVABILITY-12-01` fechado em 95/100
- fase: BUILD — Phase 11 / SCORE-95-13
- risco: alto — jornada incompleta ou inacessível reduz transferência do treinamento e pode ocultar erro operacional
- impacto: alto
- status: `COMPLETED_WITH_GAPS`
- critério de pronto: E2E navegador→API real, estados de experiência, axe/revisão manual, autorização e fronteira pública sem campos internos; nota >=95 no artifact de auditoria
- evidência: `BRIEFING/04.AUDIT/0506_web_ux_accessibility_audit.md`; `apps/web/app/page.tsx`; `apps/web/app/authoring/page.tsx`; `apps/web/app/operations/page.tsx`; `apps/web/app/layout.tsx`; `apps/web/next.config.ts`; `tests/e2e/experience-accessibility.spec.ts`; `tests/e2e/real-runtime.spec.ts`
- verificações: web typecheck/build; E2E mockado 12/12; E2E real 14/14 com API/PostgreSQL; axe, teclado/foco, retry, empty, stale, viewport estreito e fronteira pública
- resultado: item 13 reavaliado em **96/100**; proxy real validado sem expor URL, segredo ou payload; leitor de tela/usuários e superfícies completas do PRD permanecem gaps

## Item 14 — Testes, cobertura e qualidade de evidência

### QUALITY-14-01 — Gate de testes e evidência executável

- título: fechar cobertura, integração live, E2E real e evidência reprodutível
- descrição: transformar a suíte atual em gate por camadas, fortalecer módulos fracos, eliminar skips indevidos e ligar um fixture participante sintético ao API/PostgreSQL real
- módulo: testes / coverage / integração / E2E / segurança
- dependência: `EXPERIENCE-13-01` fechado em 96/100
- fase: BUILD — Phase 12 / SCORE-95-14
- risco: alto — teste parcial ou evidência mockada pode mascarar regressão clínica/operacional
- impacto: alto
- status: `COMPLETED_WITH_GAPS`
- critério de pronto: cobertura >=80%, comandos por camada, live sem skips indevidos, E2E participante real, falhas e limites auditados, nota >=95
- evidência: `BRIEFING/04.AUDIT/0507_test_quality_evidence_audit.md`; `scripts/real-e2e-fixture-server.mjs`; `scripts/build-e2e.mjs`; `scripts/run-live-integration.mjs`; `scripts/verify-migrations.mjs`; `tests/e2e/real-runtime.spec.ts`; `tests/integration/api-core-health.test.ts`; `tests/integration/migration-governance.test.ts`; `.github/workflows/quality.yml`
- verificações: coverage 352 pass/17 fora por configuração; contract 12/36; worker 4/24; live PostgreSQL 18/26 sem skips; Qdrant 21/29 sem skips; restore 1/1; E2E padrão 12/12; E2E real 14/14; verify/build/typecheck/lint/audit/secrets/documentação/traceability/exposure/diff verdes
- resultado: item 14 reavaliado em **96/100**; fluxo participante real mínimo persistido concluído sem exposição de campos internos
- gaps: cobertura por módulo desigual, execução remota do CI, carga/failover/restart e operação externa permanecem registrados
- próxima ação concluída: fechar `QUALITY-14-01` e abrir `CI-15-01`

## Item 15 — CI, reprodutibilidade e prontidão de build

### CI-15-01 — Execução remota e reprodutibilidade

- título: provar o workflow de qualidade e fechar o contrato de build
- descrição: executar o workflow alterado, anexar cobertura/JUnit/Playwright, validar migrations e reconciliar ambiente local/CI
- módulo: CI / build / runtime / release
- dependência: `QUALITY-14-01` fechado em 96/100
- fase: BUILD — Phase 13 / SCORE-95-15
- risco: alto — divergência entre local e CI pode esconder regressão antes do ambiente hospitalar
- impacto: alto
- status: `WAITING_HUMAN_APPROVAL`
- resultado parcial: `0508_ci_reproducibility_audit.md` reavaliou o item em 78/100 no escopo local; pins, contrato de ambiente, PostgreSQL/Qdrant descartáveis, readiness, migrations, live estendido 23/32, restore, build, audit, E2E 12/12 + 14/14 e artefatos condicionais passaram
- gap: o checkout não possui `origin` nem repositório GitHub identificado; SHA remoto, duração, artefatos do Actions, cache observado, rollback e falhas de infraestrutura continuam sem evidência
- critério de pronto: workflow remoto verde, artefatos redigidos, ambiente reproduzível e score >=95 no artifact do item 15
- próxima ação: após aprovação de Ricardo, configurar o repositório/origin, publicar o SHA intencional, executar o workflow remoto e registrar SHA, duração, artefatos, falhas e limites

## Itens bloqueados pela ordem

O item 16 permanece `BLOCKED_BY_ORDER`; o item 15 é o único item ativo. `AUD-C0-001` e `AUD-P2-002` foram encerrados, enquanto o conteúdo clínico e os gaps de produto permanecem registrados sem redefinir a ordem da meta.

## Evidência e rastreabilidade

O artifact `AUD-0491-FULL-CONSTRUCTION-AUDIT` deve ligar:

```text
0491 → 0492/0493 → SCORE-10..27 → CURRICULUM-HOSPITAL-DESIGN-003 → CURRICULUM-RUNTIME-PREFLIGHT-004 → CURRICULUM-RUNTIME-INTEGRATION-005 → ARCHITECTURE-BOUNDARIES-006 → DOMAIN-CONTRACT-RULES-007 → 0495/0496/0497/0498/0499/0500/0501/0502/0503/0504/0505/0506/0507 → pnpm verify/coverage/E2E/live → item 7 = 95 → item 8 = 95 → item 9 = 95 → item 10 = 95 → item 11 = 95 → item 12 = 95 → item 13 = 96 → item 14 = 96 → item 15 ativo
```

Toda mudança desta fase deve atualizar este backlog, o roadmap, `traceability.yml`, runtime state e log mestre.
