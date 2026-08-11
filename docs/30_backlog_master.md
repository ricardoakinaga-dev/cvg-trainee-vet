# BACKLOG MASTER — CVG

Backlog operacional vivo. Itens só podem avançar quando suas dependências e gates estiverem satisfeitos.

**Estado atual (2026-08-11):** `REMEDIATION-CURRICULUM-RUNTIME-VERIFIER` — catálogo estrutural de 24 módulos materializado e verificado no PostgreSQL HA ativo; o conteúdo clínico permanece `PASS_WITH_GAPS` até revisão/publicação. O código do verificador está no commit `0a36d1d`; os gaps externos permanecem explícitos.

**Item concluído mais recente da meta 95/100:** `CI-15-01` — Execução remota e reprodutibilidade, reavaliado em 95/100. Itens 1–12 foram reavaliados em 95/100 e os itens 13–14 em 96/100 nos escopos registrados.

## P0 — CRÍTICO

### PRE-SPEC-01 — Alinhamento de produto e arquitetura

- título: aprovar as decisões de conta, dashboards, feedback, KPIs e base técnica antes da SPEC
- descrição: congelar autenticação, papéis, cartões, fluxo de relatos, métricas, arquitetura proporcional, fronteira de RAG, observabilidade, acessibilidade e agente operacional de IA
- módulo: produto / arquitetura pré-SPEC
- dependência: direção D-090 confirmada; Anexo 0020 revisado
- fase: PRD — alinhamento anterior à SPEC
- risco: alto — iniciar SPEC sem essas fronteiras gera retrabalho e permissões inconsistentes
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0020_alinhamento_produto_pre_spec.md
- resultado: D-091 a D-100 aprovadas integralmente por MV. Ricardo Akinaga em 2026-08-06; alinhamento congelado como baseline da futura SPEC

### B07-01 — Blueprint diagnóstico

- título: validar blueprint das 120 questões diagnósticas
- descrição: revisar a matriz das três sessões, cobertura clínica, estrutura cognitiva, avaliabilidade, equidade e aderência à política D-077
- módulo: conteúdo / avaliação diagnóstica
- dependência: PRD 0017, os três livros registrados em `clinical-sources.json` e pré-voo automático
- fase: pré-piloto — conteúdo diagnóstico
- risco: alto — blueprint inadequado contamina a baseline e a personalização
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0012_blueprint_diagnostico_b07.md; `packages/curriculum/src/source-registry.ts`; `clinical-sources.json`; `docs/101_clinical_source_policy.md`
- resultado: blueprint e referências ativas foram normalizados para os três livros autorizados; o pré-voo rejeita fontes fora do registro. A prova semântica texto-a-texto de cada redação permanece um gap separado, sem criar gate humano de publicação.

### B07-02 — Produção dos itens diagnósticos

- título: produzir 120 itens originais em três sessões de 40
- descrição: escrever os itens conforme o blueprint, com cenários fictícios, gabaritos/rubricas testados, respostas aceitas e rastreabilidade interna por módulo/fonte
- módulo: conteúdo e avaliação
- dependência: B07-01 e pré-voo automático de fonte
- fase: pré-piloto — produção de conteúdo
- risco: crítico — erro clínico, ambiguidade ou cópia bloqueia a aplicação
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `packages/curriculum/src/authoring.ts`; `packages/curriculum/src/learning-runtime.ts`; `packages/application/src/authoring-use-cases.ts`; `packages/persistence/src/content-repository.ts`; testes de currículo/autoria/API
- resultado: banco B-07 de 120 itens, dividido em 40/40/40, está materializado no runtime e no caminho de publicação automática; nenhum gate clínico humano é requisito ativo. Permanecem apenas a verificação semântica integral dos textos contra os livros e a aplicação real da baseline.

### B07-03 — Revisão e pré-voo

- título: executar pré-voo automático e testar a avaliabilidade dos 120 itens
- descrição: verificar referências canônicas, redação registrada, scoring determinístico, respostas aceitas, feedback e comportamento de interrupção com dados sintéticos, sem aprovação clínica humana como dependência de software
- módulo: governança clínica e qualidade da avaliação
- dependência: B07-02 e registry imutável das três fontes
- fase: pré-piloto — qualidade de conteúdo
- risco: crítico
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `packages/curriculum/src/source-registry.test.ts`; `packages/curriculum/src/learning-runtime.test.ts`; `packages/application/src/authoring-use-cases.test.ts`; `pnpm verify:clinical-sources`; `docs/101_clinical_source_policy.md`
- resultado: o pré-voo automático valida fontes, publicação e projeção pública; B-07 sai do estado de rascunho técnico para `PUBLICADO` no runtime. A validação de campo/piloto e a checagem semântica completa dos textos ainda não foram executadas.

### CUR-24-01 — Fatia vertical do Mês 2

- título: produzir e validar um módulo completo de emergência
- descrição: criar quatro sessões, dois casos fictícios, quiz, questões objetivas, duas respostas abertas, rubricas, feedback e referências; medir carga do participante e correção por Ricardo
- módulo: programa curricular V3 / emergência
- dependência: aprovação humana do PRD 0017 e da carga mensal — satisfeita em D-087
- fase: PRD — validação da proposta curricular
- risco: alto — sem protótipo a carga de autoria e correção é apenas estimativa
- impacto: alto
- status: READY_FOR_NEXT_STEP
- evidência: PRD 0017; Anexos 0013 a 0019; commit curricular c1d3023; fatia vertical 91cb9e7; protocolo/T0/T1 2d0d608; aprovação D-088
- próxima ação: selecionar e agendar dois a três veterinários autorizados para executar T2 conforme o Anexo 0018

### CUR-24-02 — Catálogo executável e camada de eficácia hospitalar

- título: materializar a grade de 24 meses com questões, testes, retenção e transferência digital
- descrição: representar módulos, sessões, objetivos, audiência, comportamentos hospitalares, modalidades de avaliação, D+7/D+30/D+90, métrica de processo e regras de domínio; projetar alternativas simples/múltiplas sem campos internos; preparar seed versionado sem publicação automática
- módulo: programa curricular V3 / conteúdo / avaliação / participante
- dependência: PRD 0017, Anexo 0022, Anexo 0024 e `clinical-sources.json`
- fase: BUILD — Phase 3 / SCORE-95-03
- risco: alto — conteúdo incorreto ou publicação sem revisão pode causar dano educacional e clínico
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0495_pesquisa_praticas_mundiais_treinamento_hospitalar.md`; `BRIEFING/04.AUDIT/0496_curriculum_runtime_preflight.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0017_programa_curricular_24_meses.md`; artifact `CURRICULUM-HOSPITAL-DESIGN-003`
- código: `packages/curriculum/src/catalog.ts`; `packages/curriculum/src/learning-runtime.ts`; `packages/curriculum/src/projection.ts`; `packages/curriculum/src/content-seed.ts`; `packages/contracts/src/learning.ts`; `packages/application/src/curriculum-runtime-use-cases.ts`; `packages/persistence/src/activity-repository.ts`; `packages/persistence/src/curriculum-runtime-repository.ts`; `packages/persistence/src/schema.ts`; `packages/persistence/drizzle/0007_small_khan.sql`; `packages/persistence/drizzle/0008_abnormal_zzzax.sql`; `packages/persistence/drizzle/0009_nappy_nightcrawler.sql`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/web/app/page.tsx`
- testes: `tests/integration/curriculum-catalog.test.ts`; `packages/contracts/src/learning.test.ts`; `packages/persistence/src/activity-repository.test.ts`
- testes adicionais: `tests/e2e/participant-access.spec.ts`; `tests/integration/postgres-activity-content.test.ts`
- testes adicionais: `packages/curriculum/src/learning-runtime.test.ts`; `packages/application/src/curriculum-runtime-use-cases.test.ts`; `packages/persistence/src/curriculum-runtime-repository.test.ts`; `tests/integration/curriculum-catalog.test.ts`; `tests/integration/curriculum-runtime.test.ts`; 15 testes direcionados do runtime/catalog
- verificação: `pnpm verify`; `pnpm typecheck`; `pnpm build`; `pnpm --filter @cvg/curriculum typecheck`; 5 E2E sintéticos; 17 testes live PostgreSQL/Qdrant e 1 skip por configuração; migração 0009 aplicada
- resultado parcial: catálogo, B-07 120/40/40/40, packs dos 24 módulos, diagnóstico por tema, domínio/remediação/retenção, projeção pública com seleção simples/múltipla e seed versionado funcionam; fontes são limitadas aos três livros e a publicação automática está habilitada
- próxima ação: executar a verificação semântica automatizada e a aplicação da baseline quando o ambiente de piloto existir; não reintroduzir aprovação clínica humana como gate de software

### CUR-24-03 — Runtime educacional e pré-voo técnico

- título: conectar diagnóstico, domínio, remediação, retenção e trilha ao ciclo educacional
- descrição: manter B-07 e os packs internos versionados; persistir estado educacional na jornada autorizada, preservar correção humana para respostas abertas, validar formas equivalentes e preparar pré-voo de conteúdo sem publicação automática
- módulo: programa curricular V3 / diagnóstico / aprendizagem / avaliação
- dependência: CUR-24-02; pré-voo automático das três fontes
- fase: BUILD — Phase 3 / SCORE-95-03
- risco: alto — erro de conteúdo, scoring ou transição pode induzir aprendizado inseguro
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0496_curriculum_runtime_preflight.md`; artifact `CURRICULUM-RUNTIME-INTEGRATION-005`; `packages/curriculum/src/learning-runtime.ts`; `packages/application/src/curriculum-runtime-use-cases.ts`; `packages/persistence/src/curriculum-runtime-repository.ts`; `packages/contracts/src/learning.ts`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`; migração `0009_nappy_nightcrawler.sql`
- resultado: preflight técnico passa, B-07 tem 120 itens e packs versionados cobrem o catálogo; diagnóstico não punitivo, remediação dirigida e D+7/D+30/D+90 estão modelados; o estado digital é persistido, versionado e projetado com segurança na API/web; o caminho ativo publica após a verificação automática de fonte
- próxima ação: completar a persistência de cada atividade mensal e E2E de fluxo completo; não tratar aprovação clínica humana como dependência ativa

### ARCH-04-01 — Boundary arquitetural executável

- título: tornar o mapa de módulos, dependências e adapters verificável no código
- descrição: materializar a arquitetura SPEC 0101–0103 em uma policy de manifests e imports; bloquear dependência server-side na web, acesso direto a SQL/SDK na borda e imports inversos entre camadas; documentar rollback sem publicar conteúdo
- módulo: arquitetura / modularidade / build
- dependência: item 3 com score técnico >=95; nenhuma dependência de aprovação clínica para o artefato não publicador
- fase: BUILD — Phase 3 / SCORE-95-04
- risco: médio — acoplamento invisível gera retrabalho, quebra de isolamento e dificulta auditoria
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `architecture-boundaries.json`; `BRIEFING/04.AUDIT/0497_architecture_boundary_audit.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0103_mapa_de_modulos.md`
- testes: `tests/integration/architecture-boundaries.test.ts` (RED antes da policy; GREEN com 2 testes)
- verificação: `pnpm verify:architecture`; `pnpm verify` (63 arquivos/283 testes, 9 skips); `pnpm typecheck`; `pnpm build`; `pnpm test:e2e` (5/5); integração live (14 arquivos/20 testes, sem skips); `pnpm audit --audit-level=high`; `git diff --check`
- resultado: os 12 manifests e imports de produção são comparados com allowlist/denylist; domínio/currículo/contratos permanecem independentes de server-side; API/worker usam composição; web não importa banco, configuração ou SDK externo
- gap: extração futura de ports compartilhados, integração web com contratos/UI e cadeia commit/artefato permanecem nos itens próprios
- próxima ação: manter a policy no gate contínuo; item 4 já foi reavaliado em 95/100 e o item 5 foi liberado pela ordem

### DOMAIN-05-01 — Domínio, contratos e regras de negócio

- título: materializar invariantes e contratos do item 5 com TDD
- descrição: implementar regras puras para tentativa, conteúdo, avaliação, atribuição, resultado, ticket, contestação, remediação, retenção, idempotência, versionamento e fronteira pública, sem antecipar persistência/API/web
- módulo: domínio / contratos / regras de negócio
- dependência: ARCH-04-01 fechado em 95/100
- fase: BUILD — Phase 3 / SCORE-95-05
- risco: alto — regra incorreta de nota, estado ou exposição pode gerar aprendizagem insegura ou vazamento de informação interna
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0498_domain_contract_matrix.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `traceability.yml`
- código: `packages/domain/src/timestamp.ts`; `attempt.ts`; `answer.ts`; `assessment.ts`; `assessment-policy.ts`; `content.ts`; `learning-state.ts`; `appeal.ts`; `packages/contracts/src/assessment.ts`; `correction.ts`; `learning.ts`; `learning-state.ts`
- testes: testes de domínio/contratos e casos de uso de tentativa, resposta e correção; RED/GREEN/REFACTOR registrados na matriz 0498
- verificação: `pnpm verify` (63 arquivos/283 testes, 9 skips); cobertura 85,09%/80,27%/87,56%/85,82%; `pnpm build` (12 workspaces); `pnpm test:e2e` (5/5); integração live (14 arquivos/20 testes, sem skips); `pnpm audit --audit-level=high`; `git diff --check`
- resultado: item 5 reavaliado em **95/100**; os gaps de persistência, RLS contextual, rotas e telas foram transferidos aos itens próprios sem declarar conclusão indevida
- próxima ação: item 5 fechado em 95; manter limites de persistência e API nos itens próprios

### PERSISTENCE-06-01 — Baseline de persistência, migrações e integridade

- título: ligar regras do domínio às entidades e invariantes PostgreSQL
- descrição: revisar SPEC 0109–0111, modelar tabelas/relacionamentos, migrações, FK, unicidade, histórico, optimistic version, idempotência, transações, rollback e RLS contextual
- módulo: persistência / migrações / integridade / governança de dados
- dependência: DOMAIN-05-01 com score >=95
- fase: BUILD — Phase 4 / SCORE-95-06
- risco: crítico — inconsistência ou isolamento insuficiente pode corromper resultados ou permitir acesso cruzado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0499_persistence_integrity_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md` item 6; SPEC 0109–0111; `packages/persistence/src/schema.ts`; migrations `0000`–`0011`
- código: `packages/persistence/src/learning-state-repository.ts`; `packages/persistence/src/index.ts`; `packages/persistence/drizzle/0010_classy_kronos.sql`; `packages/persistence/drizzle/0011_daffy_nova.sql`
- testes: `packages/persistence/src/learning-state-repository.test.ts`; `tests/integration/postgres-learning-state.test.ts`
- verificação: `pnpm verify` (64 arquivos/289 testes, 10 skips); cobertura 85,23%/80,05%/87,48%/85,87%; `pnpm build` (12 workspaces); `pnpm test:e2e` (5/5); integração live (15 arquivos/21 testes, sem skips); `pnpm db:migrate`; `pnpm audit --audit-level=high`; `git diff --check`
- resultado: item 6 reavaliado em **95/100**; quatro entidades têm FK, índices, constraints condicionais, versionamento otimista, rollback e RLS contextual comprovados com papel live sem `SUPERUSER`/`BYPASSRLS`
- gap: RLS do domínio legado, usuário de produção sem privilégio amplo, retenção/anonimização, backup/restore e operação de recuperação permanecem nos itens próprios
- próxima ação: abrir `API-07-01` e escrever RED para contratos/rotas/autoridade server-side das entidades persistidas

### API-07-01 — API e superfície funcional backend

- título: expor a primeira fatia persistida por contratos e rotas seguras
- descrição: implementar contratos versionados, validação de entrada/saída, autorização server-side, escopo, envelopes, idempotência e integração API/PostgreSQL para atribuições, workflow de resultado, tickets e contestações
- módulo: API / aplicação / contratos / autorização
- dependência: `PERSISTENCE-06-01` fechado em 95/100
- fase: BUILD — Phase 5 / SCORE-95-07
- risco: alto — rota sem autorização ou sem controle de versão pode expor/alterar estado educacional indevidamente
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0500_api_surface_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md` item 7; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0106_contratos_de_aplicacao.md`; `0107_contratos_de_api.md`; `0111_permissoes_governanca_e_auditoria.md`; `0118_estrategia_de_testes_rastreabilidade_e_verificacao.md`
- código: `packages/application/src/learning-state-use-cases.ts`; `packages/application/src/authorization.ts`; `packages/contracts/src/learning-state.ts`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/api/src/server.ts`
- testes: `packages/application/src/learning-state-use-cases.test.ts`; `packages/application/src/authorization.test.ts`; `packages/contracts/src/learning-state.test.ts`; `apps/api/src/http.test.ts`; `apps/api/src/server.test.ts`
- verificação: `pnpm verify`/`pnpm test:coverage` (65 arquivos/299 testes, 10 skips; cobertura 85,11%/80,15%/87,02%/85,81%); `pnpm lint`; `pnpm typecheck`; `pnpm build` (12 workspaces); `pnpm test:e2e` (5/5); integração live (15 arquivos/21 testes, sem skips); `pnpm audit --audit-level=high`; gates de documentação/traceability; `git diff --check`
- resultado: item 7 reavaliado em **95/100** no escopo da primeira fatia backend persistida; oito operações têm contrato strict, autorização server-side por papel/escopo, projeções redigidas, versionamento e erros públicos consistentes
- gap: dashboard, trilha completa, filas editoriais, GETs paginados, E2E navegador→API real, idempotência distribuída e operação de produção permanecem nos itens próprios
- próxima ação: abrir `SECURITY-08-01` e escrever RED para RLS legado, conexão sem privilégio amplo, recuperação/rotação, rate limit e isolamento live

### SECURITY-08-01 — Segurança, identidade, autorização e privacidade

- título: fechar isolamento, identidade e proteção de dados nas superfícies legadas e novas
- descrição: aplicar RLS contextual às tabelas legadas sensíveis, usar conexão sem privilégio amplo, provar recuperação/rotação de sessão e convite, reforçar rate limit e executar testes live negativos sem `SUPERUSER`/`BYPASSRLS`
- módulo: segurança / identidade / autorização / privacidade
- dependência: `API-07-01` fechado em 95/100
- fase: BUILD — Phase 6 / SCORE-95-08
- risco: crítico — falha de isolamento pode expor dados educacionais ou permitir alteração fora do escopo
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0501_security_isolation_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md` item 8; SPEC 0111–0113 e 0118; migrations 0012/0013
- código: `packages/persistence/src/security-context.ts`; `packages/persistence/src/database.ts`; `packages/persistence/src/rate-limit-repository.ts`; repositórios protegidos; `packages/application/src/transaction-context.ts`; `apps/api/src/request-security.ts`; `apps/api/src/server.ts`; `apps/api/src/main.ts`
- testes: `tests/integration/postgres-security-isolation.test.ts`; `packages/persistence/src/security-context.test.ts`; `packages/persistence/src/rate-limit-repository.test.ts`; `apps/api/src/request-security.test.ts`; `apps/api/src/server.test.ts`
- verificação: 67 arquivos/309 testes, 11 skips; cobertura 84,81%/80,03%/86,69%/85,48%; build 12 workspaces; E2E 5/5; live 15 arquivos/21 testes, 1 skip; migrations 0012/0013; audit e diff passaram
- resultado: item 8 reavaliado em **95/100**; RLS contextual, contexto vazio/cruzado, papel sem `SUPERUSER`/`BYPASSRLS`, menor privilégio e rate limit compartilhado passaram em teste live
- gaps: grants/provisionamento de produção, restore/RPO/RTO, tabelas editoriais/administrativas fora da fatia e E2E navegador→API real permanecem nos itens próprios

### JOURNEY-09-01 — Jornada mínima do participante

- título: fechar a jornada vertical de aprendizagem do participante
- descrição: ligar diagnóstico, trilha, atividade, tentativa, avaliação, resultado, remediação, retenção e retomada em contratos, persistência, API, web e autorização, sem expor campos internos ou declarar competência prática
- módulo: participante / currículo / avaliação / web / API
- dependência: `SECURITY-08-01` fechado em 95/100
- fase: BUILD — Phase 7 / SCORE-95-09
- risco: alto — sem jornada completa a construção não entrega o fluxo operacional prometido ao hospital
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0502_learning_journey_audit.md`; `packages/application/src/journey-use-cases.ts`; `packages/persistence/src/journey-repository.ts`; `packages/contracts/src/journey.ts`; `GET /api/v1/learning-path`; `apps/web/app/page.tsx`
- verificação: 70 arquivos/323 testes, 11 skips; cobertura 85,01%/80,19%/86,53%/85,72%; E2E 6/6; live 1/1 no cenário de jornada; typecheck/lint/build/audit/secrets/exposure/documentação/traceability/diff passaram
- resultado: item 9 reavaliado em **95/100**; a jornada agregada segura lê atribuições, atividades/tentativas, workflows, runtime e próxima ação, removendo campos internos e negando participante cruzado
- gaps: jornada completa de 24 meses, dashboard, autoria/contestação operacional, E2E navegador→API real, aprovação clínica e operação/restore permanecem nos itens próprios

### AUTHORING-10-01 — Banco autoral e revisão governada

- título: materializar autoria, revisão, avaliação somativa, contestação e publicação clínica controlada
- descrição: ligar registros autorais versionados a objetivos, gabaritos/rubricas internas, revisão item a item, correção, resultado e recurso, sem permitir publicação automática por IA
- módulo: autoria / avaliação / governança clínica / API / web
- dependência: `JOURNEY-09-01` fechado em 95/100; aprovação de Ricardo para conteúdo clínico
- fase: BUILD — Phase 8 / SCORE-95-10
- risco: crítico — conteúdo clínico sem revisão ou avaliação incorreta pode causar dano operacional
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0503_authoring_review_audit.md`; migration `0014_salty_penance.sql`; `packages/curriculum/src/authoring.ts`; `packages/application/src/authoring-use-cases.ts`; `packages/persistence/src/authoring-repository.ts`; `packages/contracts/src/authoring.ts`; `apps/api/src/http.ts`; `apps/web/app/authoring/page.tsx`
- testes: autoria/currículo/aplicação/persistência/contratos/API; `tests/integration/postgres-authoring-workflow.test.ts`; `tests/e2e/authoring-review.spec.ts`; worker handlers/loop
- verificação: 74 arquivos/341 testes, 12 skips; cobertura 84,69%/80,08%/85,74%/85,38%; E2E 7/7; integração live 16 arquivos/22 testes, 1 skip; migration 0014; typecheck/lint/build/audit/secrets/exposure/documentação/traceability/diff passaram
- resultado: item 10 reavaliado em **95/100**; autoria versionada, preflight, revisão independente, gate de publicação, persistência e superfície interna estão executáveis sem expor gabarito/fonte ao participante
- gaps: aprovação de Ricardo, revisão item a item/aplicação real dos bancos, tela completa de prova/recurso, E2E navegador→API real e transação única editorial permanecem pendentes
- próxima ação concluída: abrir `RESILIENCE-11-01`

### RESILIENCE-11-01 — Worker, índice derivado e recuperação

- título: provar processamento não vazio, reconciliação, retry, replay e degradação segura
- descrição: cobrir todos os eventos emitidos, indexação/remoção/reconciliação no Qdrant, lease/retry/dead-letter, recovery e IA estruturada sem autoridade editorial
- módulo: worker / Qdrant / IA / resiliência / observabilidade
- dependência: `AUTHORING-10-01` fechado em 95/100
- fase: BUILD — Phase 9 / SCORE-95-11
- risco: alto — evento não tratado ou índice divergente pode atrasar publicação/retirada ou gerar sugestão inconsistente
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0504_worker_resilience_audit.md`; `apps/worker/src/handlers.ts`; `apps/worker/src/loop.ts`; `apps/worker/src/reconcile.ts`; `packages/integrations/src/qdrant.ts`; `packages/integrations/src/ai.ts`; `tests/integration/worker-qdrant-live.test.ts`; `tests/integration/postgres-worker.test.ts`
- verificação: cobertura 74 arquivos/343 testes/14 skips com 84,70%/80,08%/85,76%/85,38%; E2E 7/7; integração live 18 arquivos/25 testes sem skips; typecheck/lint/build/audit/documentação/traceability/exposure/diff passaram
- resultado: matriz de eventos completa, conteúdo não vazio, divergência/órfão/replay/retirada, lease expirado, retry e dead-letter passaram; item 11 reavaliado em **95/100**
- gaps: restart observável, provider produtivo, telemetria externa, carga, restore e CI com dependências live permanecem nos itens próprios
- próxima ação concluída: abrir `OBSERVABILITY-12-01`

### OBSERVABILITY-12-01 — Observabilidade e recuperação operacional

- título: provar observabilidade, dependências, alertas e recuperação operacional
- descrição: fechar health/dependencies, collector/exporter, correlação, redaction, métricas, SLO, traces, dashboards, runbooks, backup/restore e RPO/RTO
- módulo: observabilidade / API / worker / operação / banco
- dependência: `RESILIENCE-11-01` fechado em 95/100
- fase: BUILD — Phase 10 / SCORE-95-12
- risco: alto — falha silenciosa ou recuperação não testada pode ocultar degradação e impedir continuidade hospitalar
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0505_observability_operations_audit.md`; `BRIEFING/08.RUNTIME/0804_observability_operational_contract.md`; `apps/api/src/http.ts`; `apps/api/src/server.ts`; `packages/observability/src/observability.ts`; `packages/observability/src/operations.ts`; `scripts/verify-postgres-restore.mjs`; `tests/integration/api-health.test.ts`; `tests/integration/postgres-restore.test.ts`
- verificação: health/dependencies, exporter protegido, redaction, correlação, SLO/alertas, restore live, cobertura, typecheck, lint, build, E2E, integração live, audit, secrets, documentation, traceability, exposure e diff-check
- resultado: item 12 reavaliado em **95/100**; RTO local medido em 2.581 ms e marcador sintético restaurado em destino isolado
- gaps: collector/OTel externo, retenção efetiva, dashboard provisionado, traces distribuídos, crash/failover, carga e múltiplas réplicas permanecem pendentes

### EXPERIENCE-13-01 — Jornada web e acessibilidade verificáveis

- título: fechar as superfícies de treinamento, equipe e operação com experiência acessível
- descrição: ligar telas à API real, materializar loading/empty/error/forbidden/stale/retry, aplicar axe/revisão manual, teclado/foco/semântica/contraste e manter projeção pública redigida
- módulo: web / API / acessibilidade / experiência operacional
- dependência: `OBSERVABILITY-12-01` fechado em 95/100
- fase: BUILD — Phase 11 / SCORE-95-13
- risco: alto — jornada incompleta ou inacessível reduz transferência do treinamento e pode ocultar erro operacional
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: E2E navegador→API real, estados de experiência, axe/revisão manual, autorização e fronteira pública sem campos internos; nota >=95 no artifact de auditoria
- evidência: `BRIEFING/04.AUDIT/0506_web_ux_accessibility_audit.md`; `apps/web/app/page.tsx`; `apps/web/app/authoring/page.tsx`; `apps/web/app/operations/page.tsx`; `apps/web/app/layout.tsx`; `apps/web/next.config.ts`; `tests/e2e/experience-accessibility.spec.ts`; `tests/e2e/real-runtime.spec.ts`
- verificação: web typecheck/build; E2E mockado 12/12; E2E real 14/14 com API/PostgreSQL; axe, teclado/foco, retry, empty, stale, viewport estreito e fronteira pública
- resultado: item 13 reavaliado em **96/100**; proxy real validado sem expor URL, segredo ou payload; leitor de tela/usuários e superfícies completas do PRD permanecem gaps
- próxima ação concluída: abrir `QUALITY-14-01`

### QUALITY-14-01 — Gate de testes e evidência executável

- título: fechar cobertura, integração live, E2E real e evidência reprodutível
- descrição: transformar a suíte atual em gate por camadas, fortalecer módulos fracos, eliminar skips indevidos e ligar um fixture participante sintético ao API/PostgreSQL real
- módulo: testes / coverage / integração / E2E / segurança
- dependência: `EXPERIENCE-13-01` fechado em 96/100
- fase: BUILD — Phase 12 / SCORE-95-14
- risco: alto — teste parcial ou evidência mockada pode mascarar regressão clínica/operacional
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: cobertura >=80%, comandos por camada, live sem skips indevidos, E2E participante real, falhas e limites auditados, nota >=95
- evidência: `BRIEFING/04.AUDIT/0507_test_quality_evidence_audit.md`; `scripts/real-e2e-fixture-server.mjs`; `scripts/build-e2e.mjs`; `scripts/run-live-integration.mjs`; `scripts/verify-migrations.mjs`; `tests/e2e/real-runtime.spec.ts`; `tests/integration/api-core-health.test.ts`; `tests/integration/migration-governance.test.ts`; `.github/workflows/quality.yml`
- verificação: coverage 352 pass/17 fora por configuração; contract 12/36; worker 4/24; live PostgreSQL 18/26 sem skips; Qdrant 21/29 sem skips; restore 1/1; E2E padrão 12/12; E2E real 14/14; verify/build/typecheck/lint/audit/secrets/documentação/traceability/exposure/diff verdes
- resultado: item 14 reavaliado em **96/100**; fluxo participante real mínimo persistido concluído sem exposição de campos internos
- gaps: cobertura por módulo desigual, execução remota do CI, carga/failover/restart e operação externa permanecem registrados
- próxima ação concluída: fechar `QUALITY-14-01` e abrir `CI-15-01`

### CI-15-01 — Execução remota e reprodutibilidade

- título: provar o workflow de qualidade e fechar o contrato de build
- descrição: executar o workflow alterado, anexar cobertura/JUnit/Playwright, validar migrations e reconciliar ambiente local/CI
- módulo: CI / build / runtime / release
- dependência: `QUALITY-14-01` fechado em 96/100
- fase: BUILD — Phase 13 / SCORE-95-15
- risco: alto — divergência entre local e CI pode esconder regressão antes do ambiente hospitalar
- impacto: alto
- status: COMPLETED_WITH_GAPS
- resultado: `BRIEFING/04.AUDIT/0508_ci_reproducibility_audit.md` reavaliou o item em **95/100**; o repositório privado foi publicado em `origin/main`, e o workflow `31380183984` passou no SHA `dd4790973e31e1c3799c58cf99701128367b055b` em 4m20s. O artifact `9059654877` preservou 99 arquivos, coverage, Playwright e JUnit, com digest `fe7e25c3701dd511bec0000397076b063c00cf5d115d155acefb6637f1f625ee`.
- evidência adicional: `.nvmrc`; `.env.example`; `scripts/verify-ci-contract.mjs`; `tests/integration/ci-governance.test.ts`; `.github/workflows/quality.yml`; `playwright.config.ts`; auditoria 0508; `https://github.com/ricardoakinaga-dev/cvg-trainee-vet/actions/runs/31380183984`
- verificação adicional: `pnpm verify` (77 arquivos/356 testes; 17 skips; cobertura 84,92%/80,34%/85,89%/85,61%); `pnpm build`; `pnpm audit --audit-level=high`; migrations; live estendido 23/32; E2E 12/12 e real 14/14; `pnpm verify:ci-contract`; `git diff --check`; CI remoto integralmente verde
- gaps: rollback de deployment, cache quente, carga, failover, restart e múltiplas réplicas não foram exercitados; falhas remotas anteriores e cache miss foram registrados sem apagar histórico
- critério de pronto: workflow remoto verde, artefatos redigidos, ambiente reproduzível e score >=95 no artifact do item 15
- próxima ação: abrir o item 16 — rastreabilidade de código e controle de mudança — sem misturar os gates clínicos, de piloto e de operação externa

### B07-04 — Aplicação da baseline

- título: aplicar o diagnóstico à coorte inicial
- descrição: aplicar as três sessões aos aproximadamente 10 veterinários e consolidar somente os dados permitidos, sem gravações, prontuários, tutores ou casos reais identificáveis
- módulo: piloto / baseline
- dependência: B07-03 aprovado; autorização de Ricardo; controles mínimos de D-077 prontos
- fase: piloto — baseline
- risco: crítico — envolve dados pessoais e decisão operacional externa
- impacto: alto
- status: PENDENTE

### AUD-C0-001 — Gate typecheck/build (encerrado)

- título: corrigir os dois erros estritos que impedem o gate de qualidade e o build monorepo
- descrição: corrigir o acesso potencialmente indefinido em `packages/integrations/src/ai.ts:211` e a asserção de fixture em `packages/integrations/src/ai.test.ts:226`; reexecutar `pnpm verify` e `pnpm build` sem mascarar a falha
- módulo: qualidade / integrações / CI
- dependência: nenhuma; execução técnica autorizada, sem decisão de produto
- fase: BUILD/AUDIT — bloqueio de release
- risco: encerrado — a falha estrita foi corrigida; manter os gates verdes em cada mudança
- impacto: alto
- status: COMPLETED
- evidência: `packages/integrations/src/ai.ts`, `packages/integrations/src/ai.test.ts`; `pnpm typecheck`; `pnpm build`
- resultado: acesso potencialmente indefinido do vetor determinístico e fixture indexada foram corrigidos; `pnpm typecheck`, `pnpm build` e `pnpm verify` passam sem mascarar a falha

### AUD-C0-002 — Conteúdo curricular e B-07

- título: fechar fonte, produção e pré-voo automático do diagnóstico e da primeira fatia curricular
- descrição: verificar B07-01, produzir B07-02/B07-03, executar o pré-voo automático dos três livros e separar a publicação digital da aplicação de baseline
- módulo: conteúdo / governança clínica / piloto
- dependência: registry/hash dos três livros; participantes autorizados continuam necessários somente para eventual piloto
- fase: pré-piloto / piloto
- risco: crítico — programa não pode ser aplicado sem conteúdo clínico autoral revisado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `docs/101_clinical_source_policy.md`; `clinical-sources.json`; B07-01, B07-02, B07-03; `pnpm verify:clinical-sources`; `packages/application/src/authoring-use-cases.ts`
- resultado: não existe aprovação clínica humana como bloqueio no caminho ativo; a rota, o contrato e o caso de uso de revisão de autoria foram removidos, e B-07/packs têm publicação automática condicionada ao registry técnico. A tabela histórica da migration 0014 não é lida nem escrita pelo caminho ativo. Piloto, competência prática e verificação semântica integral continuam fora da prova já executada.

## P1 — ALTA PRIORIDADE

### AUD-P1-001 — Fechamento da jornada de produto

- título: implementar e provar diagnóstico, trilha, avaliação completa, remediação, retenção, contestação e dashboards
- descrição: transformar os requisitos PRD ainda ausentes em fatias verticais com contratos, persistência, autorização, web e E2E
- módulo: produto / aplicação / web / API
- dependência: AUD-C0-001 e domínio base estável
- fase: BUILD — Phase 3–5
- risco: alto — a construção atual não entrega o produto declarado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `packages/application/src/dashboard-use-cases.ts`; `packages/contracts/src/dashboard.ts`; `apps/api/src/http.ts`; `apps/web/app/dashboard/page.tsx`; `apps/web/app/account/page.tsx`; `apps/web/app/admin/page.tsx`
- resultado: dashboard do participante, roadmap de 24 meses, KPIs operacionais, conta/segurança, recuperação/MFA por adapter e superfície administrativa estão implementados e protegidos por projeções estritas. Fluxo mensal persistido completo e provedor externo de identidade permanecem gaps de integração.

### AUD-P1-002 — RLS contextual e isolamento live

- título: aplicar defesa de escopo no banco para dados de negócio
- descrição: materializar contexto/policies para participante, autor, revisor e administrador; adicionar testes negativos de acesso cruzado em PostgreSQL real
- módulo: segurança / persistência
- dependência: contrato de papéis e escopos da SPEC
- fase: BUILD — hardening
- risco: alto — autorização somente na aplicação não fecha a defesa em profundidade
- impacto: alto
- status: PENDENTE — hardening operacional residual
- evidência: `BRIEFING/04.AUDIT/0501_security_isolation_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; migrations 0012/0013; RLS contextual comprovado live na fatia participante/execução, com papel sem bypass
- resultado parcial: contexto transacional, policies `ENABLE/FORCE`, menor privilégio e rate limit compartilhado foram fechados no item 8; grants/provisionamento de produção, restore/RPO/RTO e tabelas fora da fatia ainda não foram executados

### AUD-P1-003 — E2E real e CI com dependências

- título: executar navegador contra API, PostgreSQL e Qdrant descartáveis no CI
- descrição: provisionar serviços sintéticos, subir API real, executar fluxos de convite/atividade/tentativa e registrar artefatos de smoke
- módulo: CI / E2E / integração
- dependência: AUD-C0-001
- fase: BUILD — Phase 6
- risco: alto — os E2E atuais interceptam a API e não provam integração real
- impacto: alto
- status: PENDENTE
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `tests/e2e/participant-access.spec.ts`

### AUD-P1-004 — Operação, observabilidade e restore

- título: fechar collector, alertas, traces, retenção, backup/restauração e recuperação
- descrição: implementar a superfície operacional mínima, executar runbooks e comprovar RPO/RTO e reconciliação não vazia
- módulo: runtime / observabilidade / operação
- dependência: ambiente de homologação descartável
- fase: BUILD — Phase 6
- risco: alto — não há prova suficiente de operação ou recuperação
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `docs/102_operational_evidence_2026-08-10.md`; `infra/production/docker-compose.ha.yml`; `infra/observability/otel-collector-config.yaml`; `infra/observability/prometheus.yml`; `scripts/run-load-smoke.mjs`; `scripts/verify-ha-topology.mjs`
- resultado: collector OTLP, retenção de métricas, traces recebidos, carga, failover Caddy e múltiplas réplicas foram executados em Docker descartável com 100% de respostas no smoke normal e no smoke pós-failover. Backend durável de traces, deployment externo, alertas exercitados e restore de produção permanecem gaps.

### AUD-P1-005 — Congelamento e rastreabilidade da construção

- título: rastrear código, teste, commit e artefato do estado auditado
- descrição: incluir apps/packages/tests no commit intencional, atualizar traceability manifest e reauditar o mesmo SHA
- módulo: governança / release engineering
- dependência: AUD-C0-001
- fase: BUILD/AUDIT
- risco: alto — o HEAD auditado não contém os arquivos técnicos da construção
- impacto: alto
- status: IN_PROGRESS
- evidência: `traceability.yml`; `docs/99_runtime_state.md`; `docs/20_master_execution_log.md`; `docs/30_backlog_master.md`; `docs/100_full_program_audit_2026-08-10.md`; `docs/101_clinical_source_policy.md`; `docs/102_operational_evidence_2026-08-10.md`; `docs/103_followup_program_status_2026-08-10.md`; `git status --short`; `git diff --check`
- resultado: a reconciliação de requisito→SPEC→backlog→código→teste→artefato foi atualizada para a rodada atual; a remoção do gate executável está coberta por teste negativo de rota e suíte completa verde. O trabalho ainda está no worktree e não recebeu um novo commit final nesta rodada.

### GATE-01 — Aprovar reexecução do Discovery

- título: reexecutar e submeter 0090 Discovery Validation
- descrição: aprovar D-101 a D-108 e a reexecução técnica do gate sobre o checkpoint Git identificado
- módulo: governança de gates
- dependência: pacote técnico do Anexo 0021 e checkpoint Git revisado
- fase: Discovery
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: commit f6fefa1; BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY/0090_discovery_validation.md; BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md
- resultado: aprovado por MV. Ricardo Akinaga em 2026-08-07

### GATE-02 — Aprovar reexecução do PRD

- título: reexecutar e submeter 0090 PRD Validation
- descrição: depois do Discovery, aprovar o PRD tecnicamente validado no mesmo checkpoint Git
- módulo: governança de gates
- dependência: aprovação humana de GATE-01; pode ocorrer sequencialmente na mesma manifestação
- fase: PRD
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: commit f6fefa1; BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0090_prd_validation.md; BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md
- resultado: aprovado por MV. Ricardo Akinaga em 2026-08-07, depois do Discovery

### LIT-01 — Consolidar leitura da literatura e matriz curricular

- título: registrar a leitura dos três PDFs e a aplicação curricular por fonte
- descrição: validar páginas, hashes, estrutura, capítulos prioritários, matriz dos 24 meses e regras de conversão da literatura em conteúdo autoral do CVG
- módulo: conteúdo / governança de fontes
- dependência: D-075, D-086 e D-109 aprovadas/refinadas; PDFs locais disponíveis
- fase: PRD — preparação de conteúdo antes da autoria em escala
- risco: alto — fonte sem rastreabilidade aumenta risco clínico, autoral e de atualização
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0022_leitura_literatura_e_matriz_curricular.md; hashes conferidos contra Anexo 0010
- resultado: leitura integral processada; matriz pronta para autoria; rastreabilidade restrita ao workflow interno por D-109; nenhum PDF ou derivado foi versionado

### DOC-01 — Auditoria de requisitos e coerência pré-construção

- título: confirmar cobertura do objetivo do programa e remover contradições documentais antes da SPEC Fase 1
- descrição: auditar acesso, conta, área do participante, dashboards, trilha, avaliações, métodos pedagógicos, literatura, direitos autorais, dados e gates; alinhar toda superfície participante a D-109
- módulo: governança documental / produto
- dependência: PRD aprovado, Anexo 0022 e D-109
- fase: PRD — auditoria de prontidão antes da SPEC Fase 1
- risco: alto — requisito contraditório pode chegar ao domínio, à interface ou ao controle autoral
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0023_auditoria_requisitos_e_coerencia.md
- resultado: cobertura confirmada; RF-097 e formulações antigas de busca/citação/referência simples corrigidas; 0101 e BUILD continuam aguardando autorização/gate

### AUTH-01 — Template interno de autoria e revisão

- título: transformar a matriz literária em um fluxo repetível de conteúdo autoral
- descrição: definir ficha de intenção pedagógica, registro interno de fontes, rubricas, feedback, remediação, revisão clínica, projeção sem metadados e pré-voo sintético
- módulo: conteúdo / governança editorial
- dependência: LIT-01 e DOC-01 concluídos; autorização humana para 0101 não é necessária para o template documental
- fase: PRD — preparação editorial antes da construção
- risco: alto — autoria sem checklist pode gerar erro clínico, exposição autoral ou item não avaliável
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0024_template_autoria_revisao_interno.md
- resultado: template pronto para autoria controlada; não é esquema de API/banco e não autoriza produção em escala, B-07, publicação ou BUILD

## P2 — MÉDIO

### SPEC-01 — Preparar SPEC

- título: iniciar SPEC somente após aprovação canônica do PRD
- descrição: criar readiness, visão arquitetural, domínio, contratos, dados, segurança, observabilidade e plano de build derivados do PRD aprovado
- módulo: SPEC
- dependência: PRE-SPEC-01 concluído; aprovação humana sequencial de GATE-01/GATE-02
- fase: SPEC
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0100–0190; Anexo 0027; `0190_spec_validation.md` = `SPEC_APROVADA_TECNICAMENTE`
- resultado: arquitetura API/SPA/worker, PostgreSQL, Qdrant, IA, testes, rastreabilidade e backlog concluídos; documentação do BUILD liberada

### BUILD-DOC-01 — Documentação pré-execução do BUILD

- título: criar master, roadmap e backlog executável do BUILD
- descrição: materializar 0300, 0301 e 0302 com fases, sprints, tasks, critérios, riscos, rollback e validação
- módulo: BUILD / planejamento
- dependência: SPEC 0190 aprovada
- fase: BUILD — pré-execução
- risco: alto — começar código sem planejamento quebra o gate
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/03.BUILD

### DOC-04-08 — Completar documentação operacional

- título: fechar AUDIT, loop/persistência, skills, agents e runtime
- descrição: escrever instruções específicas do CVG, contratos de estado, critérios de auditoria, governança do Codex e operação de PostgreSQL/Qdrant/IA
- módulo: documentação transversal
- dependência: SPEC 0190; BUILD documental em andamento
- fase: documentação pré-código
- risco: alto — sem continuidade e verificação o código não deve começar
- impacto: alto
- status: COMPLETED
- critério de conclusão: todos os arquivos requeridos presentes, coerentes, revisados e registrados no gate final 0391

### B0-S1 — Scaffold e verificação inicial

- título: criar workspace TypeScript strict, testes, configuração segura e pipeline local
- descrição: materializar apps/packages da SPEC, schemas de ambiente sem segredos, PostgreSQL/migração, Qdrant, embeddings, IA server-side, composição e comandos de qualidade
- módulo: foundation/CI
- dependência: BUILD-DOC-01 e gate 0391 concluídos
- fase: BUILD — Phase 0
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/03.BUILD/0302_backlog_master.md; traceability.yml; packages/persistence; packages/integrations
- próximo passo: iniciar B1 com testes RED de domínio e contratos

### F2-S1 — API e persistência núcleo

- título: materializar PostgreSQL transacional, outbox e API HTTP mínima
- descrição: criar atividade/tentativa/idempotência, optimistic version, eventos redigidos, health e smoke live
- módulo: persistence / API
- dependência: B0-S1 e B1 concluídos
- fase: BUILD — Phase 2
- risco: crítico
- impacto: alto
- status: COMPLETED
- evidência: `packages/persistence/src/attempt-repository.ts`, `apps/api/src/http.ts`, teste live PostgreSQL/Qdrant e relatório scoped 0490

### F2-S2 — Sessão, resposta e auditoria

- título: fechar SaveAnswer, sessão server-side, auditoria mínima e health agregado de integrações
- descrição: persistir resposta e replay na mesma transação, usar cookie/hash server-side, proteger auditoria com RLS/append-only, expor somente projeção do participante e inicializar/verificar Qdrant habilitado
- módulo: application / persistence / API / integrations
- dependência: F2-S1
- fase: BUILD — Phase 2
- risco: crítico
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `traceability.yml`/`F2-S2-SESSION-ANSWER-AUDIT`, `tests/integration/postgres-answer-session.test.ts`, teste live Qdrant, `pnpm verify`
- gaps remanescentes: convite/recuperação, RLS contextual completo, worker/retry, observabilidade, web/E2E e IA externa real; consultar 0420/0421
- próximo passo: auditoria scoped F2-S2 e abertura de F3-S1

### F3-S1 — Conteúdo publicado e leitura de atividade

- título: disponibilizar atividade publicada por atribuição, com conteúdo versionado e projeção participante
- descrição: criar versões de conteúdo e itens de atividade no PostgreSQL; ler somente atividade atribuída, publicada e autorizada; ordenar itens e remover `scopeId`/metadados internos no contrato público
- módulo: aprendizagem / conteúdo / API
- dependência: F2-S2
- fase: BUILD — Phase 3
- risco: crítico — leitura fora de escopo ou exposição autoral
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `traceability.yml`/`F3-S1-PUBLISHED-ACTIVITY`, migração `0003_fluffy_psylocke.sql`, `tests/integration/postgres-activity-content.test.ts`, `pnpm build`, `pnpm test:coverage`
- resultado: atividade atribuída com estado `DISPONIVEL`/`EM_ANDAMENTO`/`EM_REFORCO`, atividade `PUBLISHED` e conteúdo `PUBLICADO` é lida do PostgreSQL e exposta somente como projeção pública; dados sintéticos não carregam fonte, foto, PDF, OCR ou conteúdo clínico protegido
- gaps remanescentes: criação/revisão/publicação por papel, currículo completo, correção/progresso, RLS contextual, worker/outbox, observabilidade, web/E2E e IA real continuam fora desta fatia
- próximo passo: auditoria scoped F3-S1 e abertura de F3-S2 para identidade completa, correção/progresso e ciclo educacional

### F3-S2 — Conteúdo editorial, progresso e integrações

- título: materializar transição editorial, projeção de progresso e processamento assíncrono seguro;
- descrição: autorizar transições por papel e escopo, publicar/retirar versões com outbox redigido, derivar próxima ação do participante, processar eventos com lease/retry/dead-letter lógico, indexar Qdrant e persistir sugestões IA somente como `DRAFT_AI` interno;
- módulo: conteúdo / aprendizagem / worker / integrações;
- dependência: F3-S1;
- fase: BUILD — Phase 3;
- risco: alto — processamento assíncrono inconsistente ou exposição de conteúdo interno;
- impacto: alto;
- status: COMPLETED_WITH_GAPS;
- evidência: `traceability.yml`/`F3-S2-CONTENT-PROGRESS-WORKER-AI`, migrações `0003_fluffy_psylocke.sql` e `0004_outstanding_green_goblin.sql`, `tests/integration/postgres-content-workflow.test.ts`, `tests/integration/postgres-worker.test.ts`, `tests/integration/qdrant-live.test.ts`, `pnpm test:coverage`;
- resultado: PostgreSQL permanece autoridade; worker processa eventos sintéticos com lease/retry, Qdrant recebe apenas IDs/hash/escopo, IA fake grava rascunho revisável e as projeções públicas não carregam `participantId`, `scopeId`, fonte, foto, PDF, OCR ou prompt;
- gaps remanescentes: identidade completa, correção/feedback, RLS contextual, reconciliação, observabilidade, web/E2E, backup/restore e IA externa real;
- próximo passo: executar auditoria scoped F3-S2 e abrir a fatia de identidade/correção.

### F3-S3 — Identidade, correção e feedback

- título: materializar convite interno de uso único, ativação segura, correção humana versionada e feedback do participante;
- descrição: criar convite somente para `ADMIN`, persistir apenas hash, ativar conta e sessão em transação, corrigir resposta aberta com resultado versionado e expor feedback apenas ao dono;
- módulo: identidade / assessment / aprendizagem / API / persistence;
- dependência: F3-S2;
- fase: BUILD — Phase 3;
- risco: alto — acesso indevido, token reutilizado ou feedback cruzado;
- impacto: alto;
- status: IN_PROGRESS_WITH_VERIFIED_CORE;
- evidência: `traceability.yml`/`F3-S3-IDENTITY-CORRECTION-FEEDBACK`, migrações `0005_rapid_pixie.sql` e `0006_unknown_randall_flagg.sql`, testes unitários/API e `tests/integration/postgres-invitation.test.ts`/`postgres-correction.test.ts`;
- resultado: token hash-only e aceite único foram comprovados no PostgreSQL; correção humana e feedback por dono foram comprovados com idempotência e projeção redigida; cobertura global está acima de 80% em todas as métricas;
- gaps remanescentes: RLS contextual, currículo completo, remediação/contestação, observabilidade externa, web completo/API real, execução operacional conjunta da reconciliação, backup/restore e IA externa real;
- próximo passo: auditar os complementos F3-S4/F3-S5/F3-S6/F3-S7/F3-S8 e construir jornadas web reais em fatias TDD.

### F3-S4 — Web participante e E2E

- status: `COMPLETED_WITH_GAPS`;
- evidência: `traceability.yml`/`F3-S4-WEB-PARTICIPANT-E2E`, `apps/web/app/page.tsx`, `tests/e2e/participant-access.spec.ts`, `playwright.config.ts` e workflow de qualidade;
- resultado: aceite de convite, erro público limitado, projeção sem `participantId`/fonte/foto e ciclo iniciar–salvar–submeter passam em três cenários Playwright sintéticos; CI roda a suíte depois do build;
- gaps remanescentes: API real no navegador, autoria/operação, acessibilidade automatizada/manual, observabilidade externa, execução operacional conjunta da reconciliação, backup/restore e IA externa real;
- próximo passo: consolidar os complementos de auditoria e iniciar E2E contra serviços locais e jornadas de autoria/operação.

### F3-S5 — Observabilidade e redaction

- status: `COMPLETED_WITH_GAPS`;
- evidência: `traceability.yml`/`F3-S5-OBSERVABILITY-REDACTION`, `packages/observability`, telemetria do API server/worker e testes unitários;
- resultado: logs estruturados allowlisted, correlação local, contadores/histogramas em memória, eventos de request/batch e testes negativos sem payload passam;
- gaps remanescentes: exporter/collector OpenTelemetry, retenção/acesso, alertas/SLOs, dashboards, traces distribuídos, RLS contextual, execução operacional conjunta da reconciliação, backup/restore e rate limit compartilhado para escala horizontal;
- próximo passo: consolidar os complementos F3-S6/F3-S7/F3-S8 e materializar somente a observabilidade externa necessária ao runtime interno.

### F3-S6 — Hardening de borda

- status: `COMPLETED_WITH_GAPS`;
- evidência: `traceability.yml`/`F3-S6-EDGE-HARDENING`, `apps/api/src/request-security.ts`, `apps/api/src/server.ts`, `.env.example` e testes API;
- resultado: CSRF por origem/referer/metadado Fetch, `WEB_ORIGINS`, rate limit local bounded, `Retry-After`, health isento e bloqueio antes do caso de uso passam em testes unitários/HTTP; aceite anônimo de convite permanece funcional;
- gaps remanescentes: E2E navegador→API real, rate limit compartilhado para múltiplas réplicas, RLS contextual, execução operacional conjunta da reconciliação e observabilidade externa;
- próximo passo: executar o gate completo e, se ainda necessário ao runtime interno, iniciar recovery/reconciliação com TDD.

### F3-S7 — Reconciliação Qdrant desde PostgreSQL

- status: `IN_PROGRESS_WITH_VERIFIED_CORE`;
- evidência: `traceability.yml`/`F3-S7-INDEX-RECONCILIATION`, porta PostgreSQL publicada, `VectorStorePort.list`, `apps/worker/src/reconcile.ts` e testes TDD/live;
- resultado: conjunto esperado é derivado do PostgreSQL, embeddings seguem server-side, divergências são atualizadas por hash/metadado e pontos órfãos são removidos sem enviar texto ao Qdrant;
- gaps remanescentes: execução operacional automatizada PostgreSQL+Qdrant habilitados no mesmo comando, RLS contextual, observabilidade externa e backup/restore;
- próximo passo: executar o gate completo da fatia e consolidar AUDIT 0400–0490.

### F3-S8 — Rotação e revogação de sessão

- status: `COMPLETED_WITH_GAPS`;
- evidência: `traceability.yml`/`F3-S8-SESSION-ROTATION`, aplicação/persistência/contrato/API e teste live PostgreSQL;
- resultado: rotação revoga o hash anterior e cria o novo registro na mesma transação; revogação é uniforme e expira o cookie sem revelar estado;
- gaps remanescentes: E2E navegador→API real, RLS contextual, observabilidade externa e backup/restore; recuperação interna permanece baseada em convite administrativo controlado;
- próximo passo: consolidar o gate completo da fatia e AUDIT 0400–0490.

### ACCESS-21 — Login por credencial e jornada inicial do runtime

- título: substituir a entrada visual por convite por login/senha e entregar uma primeira atividade atribuída no ambiente ativo;
- descrição: criar autenticação local com hash scrypt e sessão server-side, restaurar sessão, manter convite somente como onboarding compatível, publicar a projeção M02 já existente e atribuí-la ao participante interno por job administrativo idempotente;
- módulo: identidade / conta / API / web / currículo / persistência;
- dependência: F3-S3, F3-S4, F3-S8 e runtime local HA;
- fase: BUILD — Phase 14;
- risco: alto — credencial e atribuição de aprendizagem precisam permanecer server-side, redigidas e isoladas por RLS;
- impacto: alto;
- status: COMPLETED_WITH_LIMITS;
- evidência: `packages/application/src/password-auth.ts`; `packages/persistence/src/password-auth-repository.ts`; migration `0015_lonely_shooting_star.sql`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`; `tests/e2e/participant-access.spec.ts`; navegador contra `http://127.0.0.1:3100`;
- resultado: login 200, sessão 200, jornada 200 com M02 atribuída, 51 testes direcionados, suíte unitária 392/409 com cobertura global 84,98% statements / 80,13% branches / 86,50% functions / 85,71% lines e E2E 12/12; tentativa de escrita pelo usuário da aplicação foi negada por RLS e o seed foi executado pelo job administrativo;
- limites remanescentes: recuperação externa/MFA ainda `NOT_CONFIGURED`, deployment público/TLS não configurado e a atribuição automática deste ambiente cobre M02, não os 24 meses completos;
- próxima ação: adicionar rotação de senha na superfície de conta, integrar provedor externo quando autorizado e expandir atribuições por fase do programa.

## REAUDITORIA 2026-08-11 — AUD-2026-08-11-WORKTREE-LOGIN

### AUD-P1-006 — Fixture E2E real compatível com RLS

- título: fechar o seed do E2E real sem abrir bypass de autorização
- descrição: ajustar o fixture para usar job administrativo controlado ou contexto RLS autorizado; repetir navegador → web → API → PostgreSQL
- módulo: CI / E2E / persistence / security
- dependência: decisão de implementação e contrato de seed
- fase: AUDIT / BUILD hardening
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: `scripts/real-e2e-fixture-server.mjs`; banco efêmero com conexão administrativa separada; API `NOSUPERUSER`/`NOBYPASSRLS`; E2E real 14/14 e cleanup concluídos sem ampliar privilégios do participante
- critério de pronto: E2E real passa sem ampliar privilégios do usuário comum; cleanup preserva append-only

### AUD-P1-007 — Fechamento do worktree auditado

- título: congelar código, docs, testes e manifesto no mesmo SHA
- descrição: revisar diff, executar gates, criar commit intencional e repetir a reauditoria no SHA final
- módulo: governança / release engineering
- dependência: AUD-P1-006 e correções aprovadas
- fase: BUILD / AUDIT
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: materialização, gates de segurança/observabilidade e testes locais concluídos; implementação em `e3cd966efb1d4d2a5596075d1d12f4101dd12492`; reauditoria pós-commit no handoff `31d54f6abb9bbc8e36ae40afea78538240fef79d`; 0509_current_worktree_audit_2026-08-11.md permanece como registro histórico da limitação
- critério de pronto: nenhum código da janela fica fora do commit, manifesto aponta para SHA e a matriz de notas é reexecutada

### AUD-P2-008 — Harness de carga e contrato de proxy

- título: tornar load smoke e build web reproduzíveis no default
- descrição: corrigir o timeout default 5_000 e declarar CVG_API_INTERNAL_URL no contrato de build, serviço e CI
- módulo: runtime / CI / web
- dependência: AUD-P1-007
- fase: BUILD hardening
- risco: médio
- impacto: médio
- status: COMPLETED
- evidência: `scripts/run-load-smoke.mjs`, `packages/config/src/load-smoke.ts`, `apps/web/next.config.ts`; parser/timeout default passou testes, o alvo HA publicado `CVG_LOAD_TARGET=http://127.0.0.1:3180/health/live` passou 200/200 e build/proxy foram verificados
- critério de pronto: smoke default executa 100 requests e build limpo mantém proxy e health 200

## P3 — BAIXO

### FUT-01 — Decisões futuras

- título: avaliar automação de PDFs e expansão prática
- descrição: manter D-033 e GATE-EXP-PRAT-01 fora do MVP; qualquer abertura futura exige nova decisão, política, gate e checkpoint
- módulo: expansão e governança
- dependência: piloto, audit e decisão do patrocinador
- fase: backlog futuro
- risco: médio
- impacto: baixo
- status: BACKLOG FUTURO

## PROJETO DE REMEDIAÇÃO ATIVO

- plano canônico: BRIEFING/03.BUILD/0303_remediation_program.md;
- roadmap: BRIEFING/03.BUILD/0301_roadmap.md, PHASE R;
- backlog executável: BRIEFING/03.BUILD/0302_backlog_master.md, REMEDIAÇÃO R;
- estado atual: WAITING_HUMAN_APPROVAL para gates externos;
- próximo passo: revisão clínica, provedor MFA, domínio/certificado, storage e ambiente autorizado;
- decisões necessárias para R3–R5: provedor de identidade/MFA, domínio/DNS/TLS, backend de traces, storage de backup e ambiente de deploy.

## 2026-08-11 — REMEDIATION-ACTIVE-HA-E2E

- **item:** provar a jornada E2E contra o runtime HA ativo e fechar a limitação do proxy público/cleanup;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para produção;
- **evidência:** canal loopback `127.0.0.1:3182 → Caddy:8081`, serviço web em `3100`, edge público `3180/3181`, build descartável isolado em `.next-e2e-real`, `pnpm test:e2e:active-ha` final 2/2, E2E descartável 14/14, restore live 1/1, web dependencies 200 após teardown, cleanup com zero resíduos mutáveis e auditoria append-only preservada;
- **limites:** CI remoto, IdP/MFA/recovery externo, domínio/TLS gerenciado, storage externo, RPO/RTO de produção, deploy/rollback autorizado e revisão clínica continuam pendentes;
- **próximo passo:** aguardar decisões humanas dos gates externos; o rehearsal local de deploy/rollback passou com troca entre a imagem atual e a imagem construída do commit anterior, mas registry/ambiente de produção ainda não foram autorizados; a implementação de rehearsal está no commit `35d5c57` sobre `cfaeed3` e o manifesto foi atualizado para esse SHA.

## 2026-08-11 — REMEDIATION-CURRICULUM-RUNTIME-VERIFIER

- **item:** validar a projeção executável dos 24 módulos e tornar explícita a diferença entre estrutura materializada e publicação clínica;
- **status:** COMPLETED localmente / PASS_WITH_GAPS para conteúdo clínico;
- **evidência:** `scripts/verify-curriculum-runtime.mjs` e `pnpm ops:verify-curriculum-runtime` confirmaram 24 atividades, 796 conteúdos/editorial/itens, 24 atribuições, 24 estados, módulos M01–M24, `NAO_ATRIBUIDO` (24) e `PENDENTE` (24); 763 itens estão `PROJECAO_VERIFICADA` e 33 `PUBLICADO`; o modo clínico estrito falha com `clinical publication is incomplete: 763 items`;
- **commit:** `0a36d1d` (`feat: add live curriculum runtime verification`);
- **próximo passo:** revisão semântica e aprovação clínica de Ricardo; em paralelo, obter as decisões externas de identidade, TLS, traces, backup e deploy/rollback.

## 2026-08-11 — REMEDIATION-IDP-TRANSPORT-HARDENING

- **item:** impedir que o runtime aceite IdP sem transporte HTTPS em produção;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para provedor real;
- **evidência:** RED comprovado com `http://identity.example`; GREEN em `packages/application/src/identity-provider.ts` e `packages/config/src/env.ts`; commit `3793066`; `pnpm verify` passou com 421 testes e cobertura acima de 80%;
- **limite:** não há declaração de MFA/recovery disponível sem provedor, sandbox e segredo fornecidos por decisão humana;
- **próximo passo:** selecionar o provedor e executar enrollment, challenge, recovery, step-up e revogação em sandbox.

## 2026-08-11 — REMEDIATION-MANAGED-TLS-PROFILE

- **item:** preparar o edge para certificado gerenciado/automático sem fingir TLS produtivo no ambiente local;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para domínio e certificado;
- **evidência:** `infra/production/Caddyfile.production.example` validado pelo Caddy, sem `tls internal`; Compose produtivo sintético com FQDN e targets 80/443 passou; teste de contrato e `pnpm verify` passaram com 422 testes;
- **limite:** domínio, DNS, ACME/certificado, renovação, handshake público e E2E externo continuam pendentes;
- **próximo passo:** registrar FQDN e método de certificado autorizados, então executar o perfil fora do ambiente local.

## 2026-08-11 — REMEDIATION-EXTERNAL-TRACE-PROFILE

- **item:** preparar o caminho de traces externos duráveis sem alterar o runtime local;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para backend e retenção reais;
- **evidência:** `infra/observability/otel-collector.production.example.yaml` usa exporter OTLP HTTP com `insecure: false`, URL-base e autorização vindas exclusivamente do ambiente; a configuração explicita que o exporter acrescenta `/v1/traces`; `infra/production/docker-compose.external-traces.example.yml` sobrepõe o collector e coloca Tempo no perfil opcional `local-traces`; teste de contrato 2/2, validação do collector, Compose sem/com perfil e `pnpm verify` com 423 testes passaram nos commits `b5e615c` e `8b03283`;
- **limite:** endpoint, autorização, fornecedor, retenção, consulta, alerta, persistência externa, RPO/RTO e promoção produtiva não foram configurados nem declarados;
- **próximo passo:** registrar backend/retention autorizados e executar o overlay em ambiente externo com credenciais fora do Git.

## REGRAS DE USO

- Atualizar este arquivo sempre que um item mudar de status, prioridade, dependência ou risco.
- Não marcar B-07 como concluído somente por criar o blueprint.
- Não tratar B-07 como bloqueio da SPEC; ele bloqueia baseline e piloto completo por D-101.
- Adicionar imediatamente qualquer nova pendência descoberta durante revisão ou aplicação.
- Usar este backlog junto com docs/99_runtime_state.md e docs/20_master_execution_log.md.
