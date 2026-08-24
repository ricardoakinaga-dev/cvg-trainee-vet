# BACKLOG MASTER — CVG

Backlog operacional vivo. Itens só podem avançar quando suas dependências e gates estiverem satisfeitos.

**Item concluído mais recente da meta 95/100:** `CI-15-01` — Execução remota e reprodutibilidade, reavaliado em 95/100. Itens 1–12 foram reavaliados em 95/100 e os itens 13–14 em 96/100 nos escopos registrados; o item 16 está liberado para abertura.

**Atualização operacional 2026-08-23:** `HARNESS-DB-2026-08-23` foi concluído com gaps controlados; o harness live PostgreSQL/RLS agora separa conexão da aplicação e conexão administrativa de teste, e não mascara ausência de capacidade administrativa. `TRAINING-MANAGEMENT-2026-08-23` foi ampliado com a trilha digital de 24 meses, acompanhamento de evolução no participante, perfil digital por competência/módulo e convite administrativo escopado. `DIAGNOSTIC-PROFILE-2026-08-23` adicionou persistência/RLS do agregado B-07, perfil por tema e rota interna de avaliação técnica sem publicação clínica. `STAFF-DIAGNOSTIC-PROFILE-024` levou o mesmo agregado formativo ao acompanhamento gerencial, com membership participante–escopo, matriz RLS e disclaimer explícito. `ADMIN-LIFECYCLE-025` fechou o ciclo de convite/reenvio/status/sessões com CAS, filtro de conta ativa e live PostgreSQL; o hardening posterior limitou reenvios ao escopo pedido, serializou concorrência por conta e corrigiu ações da UI em múltiplos escopos. `CPD-REPORTING-026` materializou o relatório interno de participação digital com filtros server-side e limites explícitos de não credenciamento. `EDITORIAL-QUEUE-027` materializou a leitura backend da fila editorial por escopo, com contrato redigido, capability separada, limite explícito sem promessa de cursor, RLS editorial, ações role-aware e live PostgreSQL. `ACCOUNT-RECOVERY-028` fechou recuperação controlada por link único para contas ativas, com hash-only, revogação de sessões, consumo atômico, sessão nova, UI `/recovery`, live PostgreSQL e E2E 19/19; `IDENTITY-RLS-029`/`030` fecharam RLS direto de convites, recuperação, contas e sessões; `AUDIT-NEGATIVE-031` fechou a representação e a emissão centralizada de rejeições HTTP sem segredo; `DB-PRIVILEGE-032` ampliou o healthcheck para negar ownership e grants administrativos à role de aplicação. O pipeline pós-mudança passou com 96 arquivos/455 testes, cobertura global acima de 80%, build dos 12 workspaces e E2E 19/19. Provedor/MFA/entrega externa, grant matrix do ambiente produtivo e gates clínicos/operacionais permanecem explícitos. A pesquisa atual está registrada em `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`.

**Atualização operacional 2026-08-23 (IDENTITY-RLS-029/030):** `account_invitations`, `account_recovery_requests`, `accounts` e `sessions` agora têm `ENABLE/FORCE RLS` com contextos transacionais de escopo, provisionamento ou hash apresentado; a aplicação continua sem `SUPERUSER`/`BYPASSRLS`. Os gates técnicos passaram; grants de produção, provedor/MFA, entrega externa e gates clínicos/operacionais permanecem explícitos. A auditoria negativa uniforme foi fechada em `AUDIT-NEGATIVE-031`.

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
- dependência: PRD 0017, D-070, D-077, D-082, D-083 a D-086
- fase: pré-piloto — conteúdo diagnóstico
- risco: alto — blueprint inadequado contamina a baseline e a personalização
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0012_blueprint_diagnostico_b07.md; conteúdo 8bed361; checkpoint ddc8383

### B07-02 — Produção dos itens diagnósticos

- título: produzir 120 itens originais em três sessões de 40
- descrição: escrever os itens conforme o blueprint, com cenários fictícios, gabaritos/rubricas testados, respostas aceitas e rastreabilidade interna por módulo/fonte
- módulo: conteúdo e avaliação
- dependência: B07-01 aprovado clinicamente por Ricardo
- fase: pré-piloto — produção de conteúdo
- risco: crítico — erro clínico, ambiguidade ou cópia bloqueia a aplicação
- impacto: alto
- status: PENDENTE

### B07-03 — Revisão e pré-voo

- título: executar revisão clínica de Ricardo e testar a avaliabilidade dos 120 itens
- descrição: verificar redação original, cobertura, fontes atuais, scoring determinístico, respostas aceitas, feedback e comportamento de interrupção com dados sintéticos
- módulo: governança clínica e qualidade da avaliação
- dependência: B07-02 concluído
- fase: pré-piloto — qualidade de conteúdo
- risco: crítico
- impacto: alto
- status: PENDENTE

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
- dependência: PRD 0017, Anexo 0022, Anexo 0024, pesquisa 0495 e revisão clínica antes de publicação
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
- resultado parcial: catálogo, B-07 120/40/40/40, packs dos 24 módulos, diagnóstico por tema, domínio/remediação/retenção, projeção pública com seleção simples/múltipla e seed `RASCUNHO` funcionam; publicação automática permanece impossível
- próxima ação: completar autoria clínica, executar pré-voo de Ricardo, fechar os gaps RLS/E2E real e só depois promover conteúdo aprovado para `PUBLICADO`

### CUR-24-03 — Runtime educacional e pré-voo técnico

- título: conectar diagnóstico, domínio, remediação, retenção e trilha ao ciclo educacional
- descrição: manter B-07 e os packs internos versionados; persistir estado educacional na jornada autorizada, preservar correção humana para respostas abertas, validar formas equivalentes e preparar pré-voo de conteúdo sem publicação automática
- módulo: programa curricular V3 / diagnóstico / aprendizagem / avaliação
- dependência: CUR-24-02; revisão clínica de Ricardo antes de qualquer conteúdo publicado
- fase: BUILD — Phase 3 / SCORE-95-03
- risco: alto — erro de conteúdo, scoring ou transição pode induzir aprendizado inseguro
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0496_curriculum_runtime_preflight.md`; artifact `CURRICULUM-RUNTIME-INTEGRATION-005`; `packages/curriculum/src/learning-runtime.ts`; `packages/application/src/curriculum-runtime-use-cases.ts`; `packages/persistence/src/curriculum-runtime-repository.ts`; `packages/contracts/src/learning.ts`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`; migração `0009_nappy_nightcrawler.sql`
- resultado: preflight técnico passa, B-07 tem 120 itens e packs versionados cobrem o catálogo; diagnóstico não punitivo, remediação dirigida e D+7/D+30/D+90 estão modelados; o estado digital é persistido, versionado e projetado com segurança na API/web; clínica, RLS contextual e E2E navegador→API real permanecem pendentes
- próxima ação: completar autoria/revisão clínica, executar pré-voo de M02/B-07, registrar aprovação de Ricardo e manter a publicação bloqueada

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

- título: fechar aprovação humana, produção e pré-voo do diagnóstico e da primeira fatia curricular
- descrição: aprovar B07-01, produzir/revisar B07-02/B07-03, executar a fatia CUR-24-01/T2 e somente então considerar aplicação de baseline
- módulo: conteúdo / governança clínica / piloto
- dependência: decisão de Ricardo e participantes autorizados para T2
- fase: pré-piloto / piloto
- risco: crítico — programa não pode ser aplicado sem conteúdo clínico autoral revisado
- impacto: alto
- status: WAITING_HUMAN_APPROVAL
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; B07-01, B07-02, B07-03, CUR-24-01 e B07-04 neste backlog

## P1 — ALTA PRIORIDADE

### AUD-P1-001 — Fechamento da jornada de produto

- título: implementar e provar diagnóstico, trilha, avaliação completa, remediação, retenção, contestação e dashboards
- descrição: transformar os requisitos PRD ainda ausentes em fatias verticais com contratos, persistência, autorização, web e E2E
- módulo: produto / aplicação / web / API
- dependência: AUD-C0-001 e domínio base estável
- fase: BUILD — Phase 3–5
- risco: alto — a construção atual não entrega o produto declarado
- impacto: alto
- status: PENDENTE
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; gaps 0420/0421
- resultado parcial: jornada mínima, dashboard staff/participante, trilha digital de 24 meses, próximo passo, reforço, retenção, convite administrativo escopado, persistência técnica do agregado B-07, perfil formativo por tema e agregado gerencial de reflexão por escopo/módulo estão materializados com contratos, persistência, RLS, autorização server-side, E2E e integração PostgreSQL preparada; o dashboard staff exibe a baseline por tema somente para participantes pertencentes ao escopo autorizado e mantém explícito que ela não representa competência prática; filas editoriais completas, avaliação/contestação completas e relatórios CPD ainda não fecham o requisito integral
- próxima ação: executar a prova live autorizada do agregado de reflexão; depois tratar apelações e filtros/paginação/exportação, mantendo os gates de B-07, revisão clínica, prática supervisionada e operação externa independentes

### REFLECTION-035 — Reflexão digital e próxima ação

- título: fechar o ciclo digital de feedback, reflexão e próxima revisão
- descrição: materializar item `REFLEXAO` com salvar/retomar/submeter idempotente, status de próxima ação e agregado gerencial sem texto bruto
- módulo: aprendizagem / contratos / persistência / web / gestão
- dependência: atividade publicada sintética/autorizada, tentativa/resposta existentes e `AUD-P1-001`; nenhuma aprovação clínica é inferida
- fase: BUILD — Phase 3–5 / jornada de produto
- risco: alto — reflexão não pode virar nota, competência prática, decisão clínica, exposição de texto livre ou relatório individual indevido
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério parcial atendido: RED/GREEN/REFACTOR; refresh/interrupção preservam o estado; replay segue a idempotência de tentativa/resposta; participante vê próxima ação; gestão recebe contagens allowlisted por escopo/módulo sem texto bruto; boundary público, acessibilidade e E2E sintético cobrem os casos negativos
- evidência: `BRIEFING/04.AUDIT/0512_reflection_digital_audit.md`; `BRIEFING/04.AUDIT/0513_reflection_management_aggregate_audit.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0107_contratos_de_api.md`; `packages/application/src/reflection-use-cases.ts`; `packages/application/src/reflection-management-use-cases.ts`; `packages/contracts/src/reflection.ts`; `packages/contracts/src/reflection-management.ts`; `packages/persistence/src/activity-repository.ts`; `packages/persistence/src/reflection-management-repository.ts`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`; `apps/web/app/operations/page.tsx`; `tests/integration/postgres-reflection-management.test.ts`; `tests/e2e/participant-access.spec.ts`; `tests/e2e/operations-dashboard.spec.ts`
- resultado: ciclo participante `NAO_INICIADA → EM_ANDAMENTO → CONCLUIDA` e agregado interno `scopeId/moduleId` materializados sem score, gabarito, resposta livre ou competência prática; a leitura escolhe a tentativa mais recente, usa contexto `{scopeId, participantId}` e só conta IDs de itens respondidos; não houve migração
- gap explícito: prova live PostgreSQL/RLS da consulta, custo O(participantes), operação collector/OTel, retenção, carga, failover, restore e gates clínicos/externos continuam pendentes
- próxima ação: executar a integração live quando houver ambiente autorizado; em seguida tratar apelações e filtros/paginação/exportação sem ampliar a fronteira pública

### APPEAL-036 — Protocolo de contestação do participante

- título: permitir que o participante abra e acompanhe uma contestação própria de questão/resultado com isolamento e prazo explícitos
- descrição: fechar a primeira fronteira vertical de RF-060/RF-064/RF-065 sobre o domínio de apelação já existente, validando no servidor que tentativa e item pertencem à atividade do participante e expondo somente o protocolo redigido; a revisão independente, decisão, recálculo e notificação permanecem fases posteriores
- módulo: avaliação / contestação / contratos / persistência / API / web
- dependência: `AUD-P1-001`; máquina de estados de `packages/domain/src/appeal.ts`; tentativas e atividades publicadas; autorização server-side `CREATE_APPEAL`
- fase: BUILD — Phase 3–5 / jornada de produto
- risco: crítico — apelação não pode ser criada para item alheio, duplicada em aberto, usada para atravessar escopo ou expor justificativa/resposta/gabarito/identidade interna
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-060`; `PRD-RF-064`; `PRD-RF-065`; `PRD-RF-102`; UC-010; UC-018; RN-064
- critério de pronto da primeira fatia: RED/GREEN/REFACTOR para elegibilidade, vínculo tentativa/item, isolamento, duplicata aberta, contrato estrito e estados loading/empty/error/retry/terminal; POST participante e leitura do próprio protocolo persistem/consultam sob contexto de escopo; E2E sintético com axe; integração live quando ambiente autorizado; rastreabilidade atualizada
- projeção permitida: `appealId`, `attemptId`, `itemId`, `status`, `version`, `decision` e, se aprovado no contrato, prazo sem dados internos; justificativa, `reviewerId`, resposta, score, gabarito, fontes e competência prática são proibidos
- evidência: `BRIEFING/04.AUDIT/0514_appeal_participant_boundary_audit.md`; `traceability.yml`; `packages/application/src/appeal-use-cases.ts`; `packages/persistence/src/activity-repository.ts`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`; `tests/e2e/participant-access.spec.ts`
- verificação: `pnpm verify` (103 arquivos/495 testes, 25 skips; cobertura 84,33%/80,14%/85,58%/85,04%); `pnpm test:e2e` (22/22); build 12 workspaces; integração `postgres-learning-state` 1/1 skipped sem `CVG_TEST_DATABASE_URL`; lint/typecheck/contratos/worker/migrations/secrets/arquitetura/documentação/product-definition/exposure e diff-check passaram
- resultado atual: a primeira fatia foi implementada em TDD; `GET /api/v1/appeals` lista somente protocolos próprios redigidos, `POST` aceita apenas tentativas corrigidas e valida o item no servidor, a persistência mantém isolamento/ordenação e a tela acompanha o ciclo sem campos internos. Uma RED E2E adicional revelou a perda da tentativa corrigida após recarga; a jornada agora restaura essa projeção e reconsulta o protocolo persistido. O trabalho fecha este boundary sem ampliar as policies de `answers`.
- gaps explícitos: atribuição/queue de revisor, justificativa da decisão, recálculo versionado de tentativas afetadas, preservação e projeção de versões anteriores, identificação/notificação de afetados, auditoria operacional consultável, entrega externa, clinical review e piloto continuam fora da primeira fatia
- próxima ação: manifesto agora aponta o commit `7ac18365998b1bdd5ff1f2600c783b1352c42f03`; executar o release traceability gate em worktree limpo e depois escolher fila interna de decisão/recálculo ou filtros/paginação/exportação como próxima fatia local

### TRAINING-MANAGEMENT-2026-08-23 — Dashboard de gestão e pesquisa atual

- título: materializar o primeiro ciclo de acompanhamento da evolução dos profissionais
- descrição: transformar RF-070/072/073/074 em uma fatia vertical com agregado por escopo, próximos passos, progresso, reforço, retenção, correções, feedback, conteúdo e uma superfície web interna redigida
- módulo: produto / gestão / API / persistência / web
- dependência: domínio de jornada, autorização server-side, contratos públicos e migration baseline
- fase: BUILD — Phase 5 / hardening de dashboard
- risco: alto — indicadores de gestão não podem ampliar escopo, expor identidade indevida ou virar decisão clínica automática
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`; `packages/application/src/dashboard-use-cases.ts`; `packages/contracts/src/dashboard.ts`; `packages/persistence/src/dashboard-repository.ts`; `apps/api/src/http.ts`; `apps/web/app/operations/page.tsx`; `tests/integration/postgres-dashboard.test.ts`; `tests/e2e/operations-dashboard.spec.ts`
- resultado: endpoint `GET /api/v1/dashboard` diferencia participante e staff, capability `VIEW_STAFF_DASHBOARD` exige papel ativo e escopo, o PostgreSQL aplica políticas de leitura por `cvg.scope_id`, a tela interna exibe indicadores sem IDs internos, o participante recebe a trilha digital de 24 meses e o administrador pode criar convite de participante somente no escopo autorizado; `pnpm verify`, build, E2E 16/16, live PostgreSQL 20/31, audit e diff-check passaram
- gaps remanescentes: filtros/paginação/exports, filas editoriais e relatórios CPD completos ainda não foram implementados; o token de convite ainda exige entrega pelo canal interno aprovado; conteúdo B-07, aprovação clínica, operação externa e prática supervisionada continuam gates humanos
- próxima ação: manter o item em `COMPLETED_WITH_GAPS` e abrir `LEARNING-PROFILE-2026-08-23`/`STAFF-ONBOARDING-2026-08-23` como evidências derivadas; seguir para diagnóstico/perfil por competência sem declarar competência prática

### LEARNING-PROFILE-2026-08-23 — Trilha digital adaptada e evolução do participante

- título: exibir a evolução digital do participante ao longo dos 24 meses
- descrição: derivar estados de módulo a partir de atribuições e runtime persistido, distinguindo não atribuído, pré-requisito, em andamento, domínio digital, reforço e retenção, sem nota global punitiva ou alegação de competência prática
- módulo: currículo / evolução / contratos / web participante
- dependência: `TRAINING-MANAGEMENT-2026-08-23`; runtime educacional e contratos públicos existentes
- fase: BUILD — Phase 5 / jornada adaptativa
- risco: alto — o resumo não pode converter estado digital em autorização clínica nem exibir campos internos
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `packages/curriculum/src/learning-runtime.ts`; `packages/application/src/dashboard-use-cases.ts`; `packages/application/src/diagnostic-use-cases.ts`; `packages/contracts/src/dashboard.ts`; `packages/contracts/src/diagnostic.ts`; `packages/persistence/src/diagnostic-result-repository.ts`; `packages/persistence/drizzle/0016_diagnostic_result_profile.sql`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`
- testes: `packages/curriculum/src/learning-runtime.test.ts`; `packages/application/src/dashboard-use-cases.test.ts`; `packages/application/src/diagnostic-use-cases.test.ts`; `packages/contracts/src/dashboard.test.ts`; `packages/contracts/src/diagnostic.test.ts`; `packages/persistence/src/diagnostic-result-repository.test.ts`; `packages/persistence/src/journey-repository.test.ts`; `apps/api/src/http.test.ts`; `tests/integration/postgres-diagnostic-results.test.ts`; `tests/e2e/participant-access.spec.ts`
- resultado: path de 24 módulos, estados e ações de retomada/reforço/retenção/atribuição passaram nos testes; o participante recebe perfil digital por competência/módulo e três cartões de baseline formativa por tema derivados do último agregado B-07 persistido; a rota de avaliação é interna e escopada, a UI não expõe itens/gabarito/fontes/objetivos internos e os avisos mantêm explícito que evidência digital não comprova competência prática
- gaps remanescentes: B-07 continua `RASCUNHO`/`PENDENTE`/não autorizado para publicação, portanto não há aplicação pública da baseline; permanecem filas editoriais, relatório CPD, RLS de identidade, recuperação pós-revogação, operação externa, prática supervisionada e gates humanos

### STAFF-DIAGNOSTIC-PROFILE-024 — Baseline formativa no acompanhamento gerencial

- título: permitir que a gestão acompanhe a baseline digital por tema sem transformar sinal educacional em decisão clínica
- descrição: projetar o agregado B-07 no participante do dashboard staff somente quando houver resultado persistido em escopo autorizado; proteger membership, RLS, contrato público e acessibilidade
- módulo: gestão / evolução / segurança / web
- dependência: `DIAGNOSTIC-PROFILE-2026-08-23`; `TRAINING-MANAGEMENT-2026-08-23`; autorização server-side
- fase: BUILD — Phase 13 / acompanhamento gerencial
- risco: alto — dados de participante não podem atravessar escopo nem sugerir aprovação ou competência prática
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `traceability.yml` / `STAFF-DIAGNOSTIC-PROFILE-024`; `packages/persistence/drizzle/0016_diagnostic_result_profile.sql`; `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`
- código: `packages/persistence/src/dashboard-repository.ts`; `packages/persistence/src/attempt-repository.ts`; `packages/application/src/dashboard-use-cases.ts`; `packages/contracts/src/dashboard.ts`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/web/app/operations/page.tsx`; `apps/web/app/globals.css`
- testes: `packages/persistence/src/dashboard-repository.test.ts`; `packages/persistence/src/attempt-repository.db.test.ts`; `apps/api/src/http.test.ts`; `tests/integration/postgres-dashboard.test.ts`; `tests/integration/postgres-security-isolation.test.ts`; `tests/e2e/operations-dashboard.spec.ts`
- resultado: perfil opcional com três cartões por tema, membership participante–escopo obrigatório antes de avaliar, isolamento direto de `diagnostic_results` comprovado com papel sem `SUPERUSER/BYPASSRLS`, E2E de gestão 4/4 e live PostgreSQL 21 arquivos/32 testes passaram; UI exibe status, contagem, percentual, “sem nota global” e disclaimer de não competência prática
- gaps remanescentes: B-07 permanece draft sem publicação; filtros/paginação/exportação, filas editoriais, CPD, RLS de identidade, recuperação pós-revogação, operação externa e gates clínicos continuam pendentes
- próxima ação: abrir a fatia de gestão/CPD para filas, relatórios de educação continuada e recuperação controlada, sem ampliar a exposição do diagnóstico

### ADMIN-LIFECYCLE-025 — Ciclo administrativo de contas e convites

- título: completar o ciclo administrativo seguro dos veterinários no escopo autorizado
- descrição: permitir reenvio de convite para conta `INVITED`, transição administrativa entre `ACTIVE`, `SUSPENDED` e `DEACTIVATED`, revogação das sessões ativas e preservação do histórico, com auditoria e sem alterar dados educacionais
- módulo: identidade / gestão / governança / API / web
- dependência: `STAFF-ONBOARDING-2026-08-23`; autorização server-side; sessão e auditoria persistidas
- fase: BUILD — Phase 13 / gestão operacional
- risco: crítico — reenvio não pode vazar token, estado não pode atravessar escopo e desativação não pode apagar histórico nem deixar sessão utilizável
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-009`; `PRD-RF-074`; `PRD-RF-080`; `PRD-RF-081`; UC-015
- evidência: `traceability.yml` / `ADMIN-LIFECYCLE-025`; contratos, caso de uso, persistência, API, tela de operações, testes unitários, integração live e E2E sintético
- critério de pronto: membership participante–escopo validado no servidor e no repositório; reenvio invalida convite ativo anterior e só expõe token na resposta autorizada; status e sessões mudam atomicamente; auditoria redigida registra ator/alvo/escopo/resultado; histórico educacional permanece; acesso cruzado, concorrência e sessão revogada têm testes negativos
- resultado: convite inicial e reenvio escopados, invalidação atômica do convite anterior, resposta redigida sem hash/IDs internos, transições com `expectedStatus`, revogação de sessões, filtro de autenticação para contas ativas, revogação de resíduos na reativação, auditoria append-only, API/web e confirmação destrutiva foram implementados. O reenvio agora persiste somente o escopo solicitado, usa lock transacional por conta para garantir um único convite não aceito vigente após concorrência, e a UI usa os escopos de membership retornados pelo dashboard em vez de assumir sempre o primeiro. A regressão live validou esses três casos; E2E operations passou 5/5 com axe.
- gaps explícitos: RLS contextual direto para tabelas de identidade, entrega externa, atribuição detalhada de papéis/trilhas, recuperação por provedor de identidade/novo acesso após revogação e operação remota continuam fora desta fatia; falhas de autorização/not-found/CAS ainda não geram auditoria negativa uniforme; `DEACTIVATED`/reativação precisam de política de recuperação validada antes do uso produtivo.
- próxima ação: abrir filas editoriais, educação continuada/CPD e recuperação controlada de acesso, mantendo o conteúdo clínico e B-07 atrás de revisão humana

### CPD-REPORTING-026 — Participação digital e horas de trilha por escopo

- título: consolidar um relatório interno de participação educacional digital
- descrição: derivar, a partir das atribuições PostgreSQL e do catálogo curricular, participantes, módulos atribuídos/concluídos, minutos/horas de atividade modular e progresso por escopo; permitir filtros server-side por escopo, módulo e status da conta, sem ranking, exportação pública, certificado ou claim de competência prática
- módulo: gestão educacional / métricas / API / persistência / web
- dependência: `TRAINING-MANAGEMENT-2026-08-23`, `STAFF-DIAGNOSTIC-PROFILE-024`, `ADMIN-LIFECYCLE-025`, `RF-070`, `RF-073`, `RF-074`, `UC-016`, catálogo curricular digital
- fase: BUILD — Phase 13 / acompanhamento gerencial
- risco: alto — horas digitais não podem ser apresentadas como CPD acreditado, certificação ou competência clínica; filtros não podem atravessar escopos
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `traceability.yml` / `CPD-REPORTING-026`; `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0010_casos_de_uso.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0013_requisitos_funcionais.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0015_metricas_de_sucesso.md`
- critério de pronto: contrato estrito, caso de uso, repositório transacional com contexto de escopo, endpoint interno autorizado, tela web redigida, testes RED/GREEN de contrato/API/persistência, integração PostgreSQL live, E2E/axe, cobertura global preservada e gaps documentados
- limites: `ATIVIDADE_MODULAR_DIGITAL` e minutos do catálogo são evidência educacional interna; não são horas válidas/acreditadas, certificado, nota global, competência prática, autonomia, autorização de procedimento ou decisão de RH
- código: `packages/contracts/src/continuing-education-report.ts`; `packages/application/src/continuing-education-report-use-cases.ts`; `packages/persistence/src/continuing-education-report-repository.ts`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/api/src/server.ts`; `apps/web/app/operations/page.tsx`; `apps/web/app/globals.css`
- testes: contratos, autorização, aplicação, persistência, API, integração PostgreSQL live e E2E/axe em `packages/**`, `apps/api/src/**`, `tests/integration/postgres-continuing-education-report.test.ts` e `tests/e2e/operations-dashboard.spec.ts`
- resultado: relatório interno por escopo, módulo e status da conta, com minutos/horas derivados do catálogo e marcadores `ATIVIDADE_MODULAR_DIGITAL`, `NAO_CREDENCIADAS` e `PROIBIDO_MVP`; verificação direcionada, live 23/34 e E2E 5/5 passaram
- gaps explícitos: não há coorte/área/nível porque não existem no domínio, nem exportação, ranking, certificado, CPD acreditado, decisão de RH, integração externa ou prova de competência prática; filas editoriais, recuperação controlada, RLS direto de identidade, auditoria negativa uniforme e gates clínicos permanecem fora deste slice
- verificação final: `pnpm verify` passou com 89 arquivos/411 testes/21 skips explícitos e cobertura 84,67%/80,11%/85,48%/85,41%; `pnpm build` passou; live PostgreSQL 23/34; E2E operations 5/5 com axe; banco e roles descartáveis removidos
- próxima ação: abrir a próxima fatia de filas editoriais ou hardening de identidade/recuperação sem liberar gates clínicos

### EDITORIAL-QUEUE-027 — Fila interna de revisão clínica por escopo

- título: permitir que autores e revisores encontrem conteúdo aguardando revisão sem atravessar escopos
- descrição: materializar `GetContentReviewQueue(scope)` como leitura interna limitada a versões editoriais em `EM_REVISAO_CLINICA` ou `AJUSTES_SOLICITADOS`, com filtros estritos, ordenação determinística e payload de metadados operacionais; a abertura do item completo continua na rota interna de autoria e a decisão continua humana
- módulo: autoria / revisão clínica / API / persistência / web
- dependência: `AUTHORING-GOVERNANCE-012`; `ADMIN-LIFECYCLE-025`; autorização server-side; registros editoriais e preflight persistidos
- fase: BUILD — Phase 13 / governança editorial
- risco: alto — fila fora de escopo, conteúdo autoral exposto a papel indevido ou ordenação instável pode causar revisão errada e perda de rastreabilidade
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-034`; `PRD-RF-036`; `PRD-RF-037`; `PRD-RF-091`; `PRD-RF-094`; UC-013; UC-014
- evidência: `traceability.yml` / `EDITORIAL-QUEUE-027`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0106_contratos_de_aplicacao.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0107_contratos_de_api.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0111_permissoes_governanca_e_auditoria.md`; `docs/99_runtime_state.md`; `docs/20_master_execution_log.md`
- critério de pronto: contrato estrito, capability de leitura interna, caso de uso imutável, repositório PostgreSQL com contexto de escopo, query limitada e determinística, endpoint interno, testes RED/GREEN de escopo/campos/status, integração live, E2E/axe se houver superfície web e rastreabilidade atualizada
- limites: a fila não aprova, publica, altera conteúdo, decide por IA/Qdrant, expõe fontes/gabaritos ao participante ou transforma preflight em aprovação clínica; não inclui contestação completa nem notificações externas
- resultado: contrato Zod estrito, capability `VIEW_CONTENT_REVIEW_QUEUE`, caso de uso imutável, filtro por autor, identidade clínica configurada, repositório PostgreSQL com contexto transacional, RLS `ENABLE/FORCE` em tabelas editoriais, filtro de status limitado, ordenação determinística sem `hasMore` fictício, projeção sem prompt/gabarito/fontes, endpoint de fila, endpoint de memberships da sessão e autoria com `scopeId` obrigatório foram implementados. A integração live comprovou dois escopos isolados, leitura sem contexto negada, filtro de status, desempate da última decisão, compensação de review após falha de transição e ausência de campos autorais.
- gaps explícitos: auditoria negativa uniforme, notificações/entrega externas e contestação completa permanecem fora da fatia; a transação editorial ainda usa compensação explícita entre persistência da decisão e transição de conteúdo, não uma única transação de composição. Nenhuma decisão clínica ou publicação foi liberada.
- verificação final: `pnpm verify` passou com 430 testes/22 skips explícitos e cobertura 84,46%/80,10%/85,32%/85,20%; `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou 18/18; integração live passou 24 arquivos/35 testes com role de aplicação sem `BYPASSRLS`, RLS/índice editorial confirmados e role/banco descartáveis removidos.
- resultado web: `/authoring` consulta memberships retornadas pela sessão, valida a projeção `unknown`, lista somente metadados da fila, mostra última decisão e abre autoria apenas quando `canOpenAuthoring`/`nextAction` permitem; o E2E confirma ausência de gabarito/fontes na fila.
- próxima ação: abrir recuperação controlada de acesso sem liberar gates clínicos; manter auditoria negativa uniforme, entrega externa, contestação completa e transação editorial única como gaps explícitos.

### ACCOUNT-RECOVERY-028 — Recuperação controlada de acesso por link único

- título: permitir que a operação gere um acesso temporário para uma conta ativa sem armazenar senha nem reativar conta automaticamente
- descrição: emitir um token aleatório, expirável e de uso único para uma conta `ACTIVE` em escopo autorizado, revogar sessões existentes, aceitar o token anonimamente e criar uma nova sessão server-side; a entrega do link permanece ação interna até haver provedor aprovado
- módulo: identidade / segurança / API / persistência / web / governança
- dependência: `ADMIN-LIFECYCLE-025`; `STAFF-ONBOARDING-2026-08-23`; capability `MANAGE_ACCOUNT_LIFECYCLE`; decisão de não simular provedor de senha/MFA/entrega externa
- fase: BUILD — Phase 13 / identidade e segurança operacional
- risco: alto — token exposto, reativação indevida, reutilização ou revogação incompleta pode conceder acesso indevido
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-008`; `PRD-RF-009`; UC-015; UC-021
- evidência: `traceability.yml` / `ACCOUNT-RECOVERY-028`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0107_contratos_de_api.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0111_permissoes_governanca_e_auditoria.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0114_superficie_web_spa_e_acessibilidade.md`; `docs/99_runtime_state.md`; `docs/20_master_execution_log.md`
- critério de pronto: contrato estrito, emissão autorizada e self-deny, conta ativa/escopada, token hash-only, expiração/consumo/revogação atômicos, sessões antigas revogadas, sessão nova com snapshot server-side, resposta pública redigida, UI com remoção do token da URL, RED/GREEN de contrato/aplicação/persistência/API, integração PostgreSQL live, E2E e rastreabilidade atualizada
- limites: não criar senha, não simular provedor/MFA/e-mail, não reativar `INVITED`/`SUSPENDED`/`DEACTIVATED`, não expor token a participante, não liberar publicação clínica; consulta operacional/retention/alertas da auditoria, grants/ownership de produção, entrega externa e operação produtiva continuam gaps; o RLS direto foi materializado nos itens `IDENTITY-RLS-029` e `IDENTITY-RLS-030`
- resultado: contrato, caso de uso, migration `0018_account_recovery.sql`, transação PostgreSQL, endpoints interno/anônimo, UI `/recovery` e testes RED/GREEN foram implementados. A integração live completa passou em banco descartável com 25 arquivos/36 testes; a role da aplicação ficou sem `SUPERUSER`/`BYPASSRLS`, a role administrativa foi separada com `BYPASSRLS`, e ambas foram removidas ao final. O E2E completo passou 19/19, incluindo a remoção do token da URL.
- verificação final: `pnpm verify` passou com 96 arquivos/448 testes/22 skips de arquivo e 23 skips de teste, cobertura 84,73%/80,50%/85,49%/85,50%; `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou 19/19; `pnpm verify:migrations` confirmou 19 migrações e `0018_account_recovery`; `verify:secrets`, `verify:traceability`, `verify:documentation`, `verify:product-definition`, `verify:exposure` e `git diff --check` foram executados sem falhas.
- gaps explícitos: não há senha, MFA, provedor gerenciado, e-mail ou entrega externa; contas inativas não são reativadas; consulta operacional/retention/alertas da auditoria, grants/ownership de produção, operação produtiva e gates clínicos/piloto continuam pendentes; RLS direto de identidade/recuperação foi tratado pelos itens `IDENTITY-RLS-029` e `IDENTITY-RLS-030`.
- próxima ação: manter o hardening de identidade fechado e aplicar o grant matrix/owner de migration/rotação de credenciais em ambiente autorizado, sem ampliar o escopo para fornecedor ou decisão clínica.

### IDENTITY-RLS-029 — RLS direto para memberships e solicitações de acesso

- título: aplicar defesa de banco aos registros de convite/recuperação sem quebrar aceite anônimo
- descrição: materializar `ENABLE/FORCE ROW LEVEL SECURITY` em `account_invitations` e `account_recovery_requests`, permitindo somente contexto transacional de escopo ou hash de token; atualizar consultas internas para estabelecer o contexto antes de ler/gravar
- módulo: identidade / segurança / persistência / integração
- dependência: `ACCOUNT-RECOVERY-028`; `ADMIN-LIFECYCLE-025`; harness PostgreSQL com role de aplicação sem `BYPASSRLS`
- fase: BUILD — Phase 13 / hardening de identidade
- risco: crítico — policy ampla pode bloquear login/convite/recuperação ou permitir leitura cruzada de credenciais efêmeras
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-001`; `PRD-RF-003`; `PRD-RF-006`; `PRD-RF-009`; UC-015; UC-021
- evidência: `traceability.yml` / `IDENTITY-RLS-029`; migration `0019_identity_token_rls.sql`; `packages/persistence/src/security-context.ts`; `docs/99_runtime_state.md`; `docs/20_master_execution_log.md`
- critério de pronto: contexto de escopo/hash validado, RLS `ENABLE/FORCE`, convite administrativo e aceite anônimo funcionando, recuperação funcionando, leitura sem contexto vazia, role de aplicação sem bypass, testes unitários/live e documentação atualizada
- resultado: migration `0019` e contexto token-aware foram implementados; convites, resolutor de membership, dashboard e recuperação estabelecem contexto; live em banco limpo confirmou 20 migrações, `ENABLE/FORCE RLS` nas duas tabelas, leitura sem contexto isolada, role de aplicação sem bypass, 25 arquivos/36 testes e remoção dos recursos descartáveis
- gaps explícitos: o RLS direto de `accounts`/`sessions` foi deliberadamente separado no item `IDENTITY-RLS-030`; auditoria negativa uniforme, grants de produção, provedor/MFA e entrega externa permanecem fora
- verificação final: `pnpm verify` passou com 96 arquivos/449 testes/22 skips de arquivo e 23 skips de teste, cobertura 84,76% statements, 80,50% branches, 85,51% functions e 85,52% lines; `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou 19/19; `pnpm verify:migrations` confirmou 20 migrações e `0019_identity_token_rls`; `verify:traceability`, `verify:documentation`, `verify:product-definition`, `verify:exposure` e `git diff --check` passaram.
- próxima ação: manter `accounts`/`sessions` como hardening residual explícito, desenhar sua matriz de contexto antes de qualquer policy nova e não avançar fornecedor, entrega externa ou gates clínicos sem autoridade correspondente.

### IDENTITY-RLS-030 — RLS direto de accounts e sessions

- título: fechar a defesa de banco para contas e sessões sem quebrar provisionamento, autenticação, rotação ou revogação
- descrição: aplicar `ENABLE/FORCE ROW LEVEL SECURITY` a `accounts` e `sessions`, com inserção de conta somente por contexto de provisionamento, lookup de sessão por hash, operações internas por escopo e todos os contextos estabelecidos na mesma transação da operação protegida
- módulo: identidade / segurança / persistência / integração
- dependência: `IDENTITY-RLS-029`; contexto token-aware; harness PostgreSQL com role de aplicação sem `BYPASSRLS`
- fase: BUILD — Phase 13 / hardening residual de identidade
- risco: crítico — contexto fora da transação pode negar autenticação ou abrir leitura cruzada de identidades/sessões
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-001`; `PRD-RF-003`; `PRD-RF-006`; `PRD-RF-009`; UC-015; UC-021
- evidência: `traceability.yml` / `IDENTITY-RLS-030`; migration `0020_identity_accounts_sessions_rls.sql`; `packages/persistence/src/security-context.ts`; `packages/persistence/src/session-repository.ts`; `docs/99_runtime_state.md`; `docs/20_master_execution_log.md`
- critério de pronto: matriz de contexto documentada, `ENABLE/FORCE RLS` em `accounts`/`sessions`, provisionamento/aceite/recovery/autenticação/rotação/revogação funcionando, leitura e escrita sem contexto negadas, role de aplicação sem bypass, live PostgreSQL e rastreabilidade atualizada
- resultado: migration `0020` materializou policies separadas para leitura/atualização/provisionamento de contas e leitura/atualização/inserção de sessões; o contexto de provisionamento e sessão foi validado; `create`, `findActive`, `revoke` e `rotate` de sessão passaram a manter `set_config(..., true)` na mesma transação da operação; aceite de convite e recovery continuam funcionais
- gaps explícitos: grants de produção, rotação de credenciais, provedor/MFA, entrega externa, operação produtiva e gates clínicos/piloto permanecem fora; a auditoria negativa uniforme foi tratada por `AUDIT-NEGATIVE-031`; o RLS usa contexto transacional como defesa complementar e não substitui autorização server-side
- verificação final: `pnpm verify` passou com 96 arquivos/451 testes/22 skips de arquivo e 23 skips de teste, cobertura 84,54% statements, 80,47% branches, 85,33% functions e 85,27% lines; `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou 19/19; `pnpm verify:migrations` confirmou 21 migrações; integração live PostgreSQL passou 25 arquivos/36 testes com `accounts`, `sessions`, `account_invitations` e `account_recovery_requests` em `ENABLE/FORCE RLS`, leitura/escrita sem contexto negadas, role de aplicação sem `SUPERUSER`/`BYPASSRLS` e recursos descartáveis removidos; gates de traceability/documentation/product-definition/exposure e `git diff --check` passaram.
- próxima ação: aplicar o grant matrix/owner de migration/rotação de credenciais em ambiente autorizado e anexar evidência redigida; manter fornecedor, entrega externa e gates clínicos atrás das dependências próprias.

### AUDIT-NEGATIVE-031 — Auditoria negativa uniforme na borda HTTP

- título: registrar rejeições de autenticação, autorização, não enumeração e borda sem expor credencial
- descrição: representar ator anônimo explicitamente, registrar erro do handler e rejeição pré-handler com rota normalizada, correlação segura e falha de auditoria não mascarante
- módulo: API / segurança / governança / observabilidade
- dependência: `IDENTITY-RLS-030`; auditoria append-only existente; autorização server-side
- fase: BUILD — Phase 13 / hardening de identidade e borda
- risco: alto — ausência de trilha negativa dificulta detecção de enumeração e abuso; registrar token/caminho bruto criaria vazamento
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-001`; `PRD-RF-003`; `PRD-RF-006`; `PRD-RF-009`; `SPEC-0111`; `SPEC-0118`
- evidência: `traceability.yml` / `AUDIT-NEGATIVE-031`; migration `0021_audit_anonymous_rejections.sql`; `packages/application/src/audit.ts`; `packages/persistence/src/audit-repository.ts`; `apps/api/src/http.ts`; `apps/api/src/server.ts`
- testes: `packages/application/src/audit.test.ts`; `packages/persistence/src/audit-repository.test.ts`; `apps/api/src/http.test.ts`; `apps/api/src/server.test.ts`; `tests/integration/postgres-account-recovery.test.ts`
- resultado: `actor_kind=ANONYMOUS` elimina UUID sentinela; `401/403/404` viram `DENIED`, demais rejeições viram `FAILURE`; o recurso usa rota normalizada e nenhuma auditoria recebe corpo, cookie ou token; live PostgreSQL persistiu a linha anônima com `principal_id` nulo
- gaps explícitos: consulta operacional de auditoria por papel, retenção/alertas e evidência no ambiente produtivo ainda dependem de operação; não há autorização clínica, fornecedor, MFA ou entrega externa nesta fatia
- verificação da rodada: typecheck, testes unitários direcionados e integração live PostgreSQL 25/37 passaram; `pnpm verify` passou com 96 arquivos/455 testes e cobertura 84,56%/80,28%/85,41%/85,30%; `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou 19/19; `pnpm audit --audit-level=high` não encontrou vulnerabilidades; migrações, secrets, traceability, architecture, documentation, product-definition, exposure e `git diff --check` passaram

### DB-PRIVILEGE-032 — Guard de grants e ownership da role de aplicação

- título: impedir que a conexão de runtime seja superusuária, bypass, criadora ou dona das relações públicas
- descrição: fazer o healthcheck produtivo rejeitar `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, `CREATEDB`, `CREATE` no schema `public` e ownership de relações; provar a separação com owner de migration e role de aplicação descartáveis
- módulo: PostgreSQL / segurança / operação / deployment
- dependência: `AUDIT-NEGATIVE-031`; `SECURITY-08-01`; provisionamento seguro de ambiente
- fase: BUILD/AUDIT — Phase 13 / hardening operacional
- risco: crítico — owner ou grant administrativo permite contornar RLS e alterar políticas/esquema
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-001`; `PRD-RF-006`; `PRD-RF-009`; `SPEC-0111`; `SPEC-0112`; `SPEC-0118`
- evidência: `traceability.yml` / `DB-PRIVILEGE-032`; `packages/persistence/src/database.ts`; `tests/integration/postgres-security-isolation.test.ts`; banco descartável com owner separado
- testes: `packages/persistence/src/database.test.ts`; `tests/integration/postgres-security-isolation.test.ts`; `tests/integration/postgres-account-recovery.test.ts`
- resultado: a role live de aplicação passou sem `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, `CREATEDB`, `CREATE` público e ownership; as tabelas de identidade e auditoria mantiveram `ENABLE/FORCE RLS`; a role administrativa ficou separada e o banco é descartável
- gap explícito: o grant matrix, owner de migration, rotação de credenciais e inspeção do ambiente produtivo real ainda exigem execução operacional autorizada; o healthcheck é guard, não provisionamento automático
- próxima ação: aplicar o runbook de roles em homologação/produção descartável, com owner de migration separado e rotação de credenciais, e anexar evidência sem registrar URL ou segredo

### STAFF-ONBOARDING-2026-08-23 — Convite administrativo escopado

- título: permitir entrada controlada de veterinários no programa
- descrição: consumir o endpoint administrativo existente para criar convite de participante com e-mail profissional, papel fixo `PARTICIPANT` e primeiro escopo autorizado, exibindo token somente após resposta autorizada
- módulo: identidade / gestão / web / governança
- dependência: `TRAINING-MANAGEMENT-2026-08-23`; capacidade `MANAGE_ROLES` e sessão staff ativa
- fase: BUILD — Phase 5 / onboarding administrativo
- risco: alto — token de convite é credencial efêmera e não pode ser logado, exportado ou ampliado para outro escopo
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `apps/web/app/operations/page.tsx`; `apps/web/app/globals.css`; `apps/api/src/http.ts`; `packages/application/src/invitation-use-cases.ts`
- testes: `apps/api/src/http.test.ts`; `tests/e2e/operations-dashboard.spec.ts`; `tests/integration/postgres-invitation.test.ts`
- resultado: convite escopado, validação de payload, token de 32–256 caracteres, expiração e erro 403 foram preservados; E2E de criação e axe passaram
- gaps remanescentes: lista administrativa completa de contas, RLS direto das tabelas de identidade, recuperação pós-revogação e entrega externa segura permanecem nos itens de identidade/operação

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

### HARNESS-DB-2026-08-23 — Harness live PostgreSQL/RLS

- título: corrigir fixtures, cleanup e bootstrap administrativo dos testes live sem alterar o produto
- descrição: separar conexão da aplicação e conexão administrativa sintética, evitar inserts protegidos sem contexto implícito, remover estados runtime antes de contas e preservar a asserção de isolamento quando `CREATE ROLE` não estiver disponível
- módulo: testes de integração / CI / segurança
- dependência: PostgreSQL descartável migrado e URL administrativa de teste quando o caso exigir cleanup
- fase: BUILD — hardening do harness
- risco: controlado — sem alteração de domínio, UI ou schema de produto; ausência de administração pode reduzir cobertura live por skip explícito
- impacto: médio
- status: COMPLETED_WITH_GAPS
- evidência: `tests/integration/live-postgres-harness.ts`; `tests/integration/postgres-activity-content.test.ts`; `tests/integration/postgres-answer-session.test.ts`; `tests/integration/postgres-attempt-repository.test.ts`; `tests/integration/postgres-correction.test.ts`; `tests/integration/curriculum-runtime.test.ts`; `tests/integration/postgres-learning-state.test.ts`; `tests/integration/postgres-security-isolation.test.ts`; `scripts/run-live-integration.mjs`; `.github/workflows/quality.yml`
- resultado: com URL administrativa, live PostgreSQL passou 19 arquivos/30 testes; sem ela, o runner informa a limitação e 23 testes passam com 7 skips explícitos; role e banco locais descartáveis foram removidos após a validação
- gaps remanescentes: executar o workflow remoto após a integração; provisionamento administrativo de teste continua obrigatório para cleanup completo, e o fallback sem `CREATEROLE` cobre somente a asserção de isolamento com uma conexão de aplicação não privilegiada
- próxima ação: executar/revisar o workflow CI autorizado e preservar os gates clínicos independentes

### AUD-P1-004 — Operação, observabilidade e restore

- título: fechar collector, alertas, traces, retenção, backup/restauração e recuperação
- descrição: implementar a superfície operacional mínima, executar runbooks e comprovar RPO/RTO e reconciliação não vazia
- módulo: runtime / observabilidade / operação
- dependência: ambiente de homologação descartável
- fase: BUILD — Phase 6
- risco: alto — não há prova suficiente de operação ou recuperação
- impacto: alto
- status: IN_PROGRESS
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; 0412–0418 e 0421; `BRIEFING/08.RUNTIME/0805_operational_snapshot_contract.md`
- recorte atual: snapshot operacional local protegido, derivação de SLO/alertas a partir de sinais redigidos e testes negativos; não fecha collector/OTel, retenção, carga, failover, restore agendado ou ambiente produtivo
- critério desta iteração: endpoint interno com autorização server-side, `NO_DATA` explícito, estados de dependência redigidos, ausência de payload sensível e regressão completa verde
- resultado atual: `OPS-034` implementou `deriveOperationalSnapshot` e `GET /internal/operations`; `READY`/`DEGRADED` retornam 200, `NOT_READY` retorna 503 com snapshot seguro; p95 sem quantis permanece `NO_DATA`; query/body inesperados retornam 422 e a resposta aplica allowlist runtime das dependências
- verificação: `pnpm verify` passou com 99 arquivos/474 testes, 22 skips de arquivo/24 skips de teste e cobertura 84,49% statements, 80,22% branches, 85,64% functions e 85,18% lines; build 12 workspaces; E2E 20/20; testes OPS direcionados 67/67; documentação, exposure, migrations, secrets, architecture e audit de dependências passaram
- próxima ação: fechar a atualização do artefato rastreável no SHA desta rodada; collector/OTel, retenção, carga, failover, restore e workflow remoto continuam gaps externos

### AUD-P1-005 — Congelamento e rastreabilidade da construção

- título: rastrear código, teste, commit e artefato do estado auditado
- descrição: incluir apps/packages/tests no commit intencional, atualizar traceability manifest e reauditar o mesmo SHA
- módulo: governança / release engineering
- dependência: AUD-C0-001
- fase: BUILD/AUDIT
- risco: alto — o HEAD auditado não contém os arquivos técnicos da construção
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `BRIEFING/04.AUDIT/0510_traceability_control_audit.md`; `scripts/verify-traceability.mjs`; `tests/integration/traceability-governance.test.ts`; commits locais `1e4e1792f45bb49e9b8019b0a4b8e1036ead9622` e `b4bf8b9946578faf2d1f65053587a382efdc5a6c`
- resultado: os 125 paths atuais foram congelados; o manifesto foi ligado ao SHA alcançável; o gate `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` passou no HEAD local limpo
- verificação: `pnpm verify` passou com 97 arquivos/458 testes/22 skips de arquivo/24 skips de teste e cobertura 84,56%/80,28%/85,41%/85,30%; build passou nos 12 workspaces; E2E passou 19/19; `pnpm audit --audit-level=high` não encontrou vulnerabilidades; `pnpm verify:ci-contract` passou com 20 checks
- gap explícito: workflow remoto, digest de artifact e reauditoria remota do SHA local ainda não foram executados; não há push nesta rodada
- próxima ação: workflow remoto autorizado no mesmo SHA ou avanço para `AUD-P1-004` em ambiente operacional autorizado

### TRACEABILITY-033 — Gate executável de rastreabilidade de release

- título: impedir que a auditoria declare rastreável um worktree sujo ou um commit histórico
- descrição: validar artefatos atuais, commits alcançáveis, paths de código/teste rastreados e gate de release no workflow CI
- módulo: governança / release engineering / CI
- dependência: `AUD-P1-005`; commit local `1e4e1792f45bb49e9b8019b0a4b8e1036ead9622`
- fase: BUILD/AUDIT — Phase 13
- risco: alto — evidência remota histórica pode ser confundida com o estado atual e liberar código não auditado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `AUD-P1-005`; `SPEC-0118`; `AGENTS-TDD`
- evidência: `traceability.yml` / `TRACEABILITY-033`; `BRIEFING/04.AUDIT/0510_traceability_control_audit.md`; `scripts/verify-traceability.mjs`; `.github/workflows/quality.yml`
- testes: `tests/integration/traceability-governance.test.ts`; `tests/integration/ci-governance.test.ts`
- resultado: modo estrutural local passa; modo release rejeitou 116 findings antes do congelamento e passou após os commits locais; o CI passa a executar `pnpm verify:traceability:release`
- gap explícito: workflow remoto, digest de artifact e reauditoria do SHA local ainda não foram executados; não há push nesta rodada
- próxima ação: workflow remoto autorizado no mesmo SHA, com digest de artifacts, ou evidência operacional de `AUD-P1-004`

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

## REGRAS DE USO

- Atualizar este arquivo sempre que um item mudar de status, prioridade, dependência ou risco.
- Não marcar B-07 como concluído somente por criar o blueprint.
- Não tratar B-07 como bloqueio da SPEC; ele bloqueia baseline e piloto completo por D-101.
- Adicionar imediatamente qualquer nova pendência descoberta durante revisão ou aplicação.
- Usar este backlog junto com docs/99_runtime_state.md e docs/20_master_execution_log.md.
