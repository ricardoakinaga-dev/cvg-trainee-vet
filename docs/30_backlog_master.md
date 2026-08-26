# BACKLOG MASTER — CVG

Backlog operacional vivo. Itens só podem avançar quando suas dependências e gates estiverem satisfeitos.

**Item concluído mais recente da meta 95/100:** `CI-15-01` — Execução remota e reprodutibilidade, reavaliado em 95/100. Itens 1–12 foram reavaliados em 95/100 e os itens 13–14 em 96/100 nos escopos registrados; o item 16 está liberado para abertura.

**Atualização operacional 2026-08-23:** `HARNESS-DB-2026-08-23` foi concluído com gaps controlados; o harness live PostgreSQL/RLS agora separa conexão da aplicação e conexão administrativa de teste, e não mascara ausência de capacidade administrativa. `TRAINING-MANAGEMENT-2026-08-23` foi ampliado com a trilha digital de 24 meses, acompanhamento de evolução no participante, perfil digital por competência/módulo e convite administrativo escopado. `DIAGNOSTIC-PROFILE-2026-08-23` adicionou persistência/RLS do agregado B-07, perfil por tema e rota interna de avaliação técnica sem publicação clínica. `STAFF-DIAGNOSTIC-PROFILE-024` levou o mesmo agregado formativo ao acompanhamento gerencial, com membership participante–escopo, matriz RLS e disclaimer explícito. `ADMIN-LIFECYCLE-025` fechou o ciclo de convite/reenvio/status/sessões com CAS, filtro de conta ativa e live PostgreSQL; o hardening posterior limitou reenvios ao escopo pedido, serializou concorrência por conta e corrigiu ações da UI em múltiplos escopos. `CPD-REPORTING-026` materializou o relatório interno de participação digital com filtros server-side e limites explícitos de não credenciamento. `REPORT-040` adicionou paginação bounded, tabela de participantes e exportação CSV da página autorizada; a validação completa local passou em 2026-08-24. `EDITORIAL-QUEUE-027` materializou a leitura backend da fila editorial por escopo, com contrato redigido, capability separada, limite explícito sem promessa de cursor, RLS editorial, ações role-aware e live PostgreSQL. `ACCOUNT-RECOVERY-028` fechou recuperação controlada por link único para contas ativas, com hash-only, revogação de sessões, consumo atômico, sessão nova, UI `/recovery`, live PostgreSQL e E2E 19/19; `IDENTITY-RLS-029`/`030` fecharam RLS direto de convites, recuperação, contas e sessões; `AUDIT-NEGATIVE-031` fechou a representação e a emissão centralizada de rejeições HTTP sem segredo; `DB-PRIVILEGE-032` ampliou o healthcheck para negar ownership e grants administrativos à role de aplicação. O pipeline pós-mudança passou com cobertura global acima de 80%, build dos 12 workspaces e E2E; workflow remoto, provedor/MFA/entrega externa, grant matrix do ambiente produtivo e gates clínicos/operacionais permanecem explícitos. A pesquisa atual está registrada em `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`.

**Atualização operacional 2026-08-23 (IDENTITY-RLS-029/030):** `account_invitations`, `account_recovery_requests`, `accounts` e `sessions` agora têm `ENABLE/FORCE RLS` com contextos transacionais de escopo, provisionamento ou hash apresentado; a aplicação continua sem `SUPERUSER`/`BYPASSRLS`. Os gates técnicos passaram; grants de produção, provedor/MFA, entrega externa e gates clínicos/operacionais permanecem explícitos. A auditoria negativa uniforme foi fechada em `AUDIT-NEGATIVE-031`.

**Atualização operacional 2026-08-24:** a verificação local fresca no HEAD `9a2e07a` passou com Node `22.22.0`/pnpm `10.33.0`, 123 arquivos/560 testes, 28 testes skipped, cobertura 84,50% statements/80,34% branches/85,91% functions/85,24% lines, contratos 70/70, worker 25/25, migrações 26/26 e gates estáticos limpos. `origin/main` está em `fbbc692`, 39 commits atrás; a evidência remota não cobre o SHA local. Três leituras independentes confirmaram a lacuna diagnóstico→atribuição; `ADAPTIVE-044` foi aberto para uma fatia bounded, sem liberar publicação, piloto ou produção.

**Abertura operacional 2026-08-24 (FEEDBACK-054):** após o fechamento documental de `APPEAL-043` no commit `4b79b695ad7ecf50d4468d484c11faa262c37777`, foi selecionada a próxima lacuna P1 local bounded: permitir que a fila interna registre prioridade e responsável opcional dentro do mesmo escopo, com versão otimista e histórico coerente. A fatia não cria resposta ao participante, SLA, notificação, anexos, retirada clínica, contestação, provider/MFA ou operação externa; PostgreSQL/RLS live, grants, workflow remoto, produção e aprovação clínica continuam gates separados.

**Abertura operacional 2026-08-25 (FEEDBACK-055):** baseline atual no HEAD `29e990b` passou `pnpm verify` sob Node `22.22.0`/pnpm `10.33.0` efêmeros; o preflight live continua sem banco autorizado. Crítica independente encontrou uma lacuna de integridade: a policy legada de `feedback_tickets` é `FOR ALL` para contexto de participante, enquanto o guard de metadata só protege o ramo staff. Foi aberta a correção bounded para negar UPDATE/DELETE do participante e separar o contexto de mutação staff, sem alterar a API pública ou inventar resposta/SLA/notificação.

**Fechamento local operacional 2026-08-26 (FEEDBACK-055):** RED/GREEN/REFACTOR passou no focal com 3 arquivos/28 testes; a migration 0042 substitui a policy participante por SELECT/INSERT explícitos, nega UPDATE/DELETE por ausência de policy, separa `LearningStateStaffContext` e atualiza o guard staff para status-only ou metadata-only. O commit local é `54b28f6c75a44408fe91b0d0f54689d86fd4a62f`; `pnpm verify:migrations` passou com 43/43; format, lint e typecheck passaram. O `pnpm verify` final passou com 141 arquivos de teste PASS, 29 skipped, 698 testes PASS, 35 skipped, cobertura 84,31%/80,33%/86,34%/85,00%, contratos 86/86 e worker 27/27. O preflight live encerrou com exit 2 por ausência de `CVG_TEST_DATABASE_URL`; não há evidência live. Item segue `COMPLETED_WITH_GAPS`/`READY_FOR_NEXT_STEP`, sem claim live, release, produção ou aprovação clínica. Auditoria: `BRIEFING/04.AUDIT/0539_feedback_ticket_write_isolation_audit.md`.

**Fechamento live operacional 2026-08-26 (FEEDBACK-055/LIVE-056):** os commits `16af141becf96616676fffcfdab6f31c1835b7a2` e `b66acc125fac0e022ce5837c4eb14d1eca862401` consolidaram as migrations 0048–0050, o oracle contextual participante+escopo, o histórico de feedback owner-scoped, a integridade de `activity_assignments`, a exclusão de conteúdo misto e a serialização adaptativa. Em banco PostgreSQL 16.15 descartável recriado, `pnpm test:integration:live` passou com 35 arquivos/75 testes; `pnpm verify` passou com 141 arquivos/708 testes PASS, 29 arquivos/37 testes skipped e cobertura 84,36%/80,35%/86,35%/85,05%, contratos 86/86, worker 27/27 e migrations 51/51. O item fica `COMPLETED_WITH_GAPS`: o teste usa grants DML amplos próprios do harness, portanto least privilege/owners produtivos, workflow remoto same-SHA, diagnóstico→assignment, cenário browser cross-scope, escala/failover/restore/collector, resposta/SLA/notificação e aprovação clínica continuam pendentes. A extensão browser→web→API→PostgreSQL foi fechada separadamente em `BRIEFING/04.AUDIT/0541_real_browser_api_postgres_e2e.md`; não há autorização de release.

**Decisão de próxima fatia 2026-08-26 (aguarda Ricardo):** a análise independente confirmou que `FEEDBACK-057` ainda não possui item próprio, contrato executável ou schema de resposta; `JOURNEY-056` requer uma escolha de produto que altera contrato, persistência, API e UX: (A) sessão diagnóstica pública própria, recomendada, com checkpoint/retomada, ou (B) atividade especial. Nenhum código foi iniciado nessa próxima fatia. O item aguarda aprovação antes de novo BUILD; produção, operação externa e aprovação clínica permanecem gates separados.

**Evidência browser operacional 2026-08-26 (`LIVE-056`):** no commit `16caccc82ffc519b60a68e1a02850d40909737e1`, o comando real com Node `22.22.0`/pnpm `10.33.0` executou o build dos 12 workspaces e passou `34/34` E2E serial (`32` sintéticos + `2` reais). O cenário real observou browser→web/proxy `3100`→API `3101`→PostgreSQL `16.15`, health `READY`/`UP`, convite, atividade publicada, start/save/submit, request IDs, nova sessão com versão 3 e oracle administrativo de persistência. Cleanup verificável deixou zero artefatos mutáveis da fixture, preservou auditoria append-only, removeu o arquivo temporário e não deixou processos. Isso fecha a evidência local do caminho, não o fluxo diagnóstico→assignment nem produção; auditoria `BRIEFING/04.AUDIT/0541_real_browser_api_postgres_e2e.md`.

**Reabertura controlada 2026-08-26 (`OPS-061-GRANTS-002`):** a crítica independente de segurança encontrou lacunas P1/P2 no provisionamento, apesar do `pnpm verify`/build/E2E estáticos verdes: URL com senha em `argv`, ACL de database/schema/functions e defaults incompletos, SQL sem schema explícito, provisionamento sem transação e contrato CI sem todas as variáveis realmente exigidas. Foi aberta uma correção bounded no harness; não altera produto, migrations aplicadas, produção ou `JOURNEY-056`.

**Abertura operacional 2026-08-26 (`OPS-061-GRANTS-001`):** uma crítica independente confirmou que o provisionador do harness ainda concede `SELECT, INSERT, UPDATE, DELETE` globalmente à role da aplicação, reduzindo a capacidade de detectar violações de privilégio por tabela. Foi aberta uma task local bounded para trocar esse grant por uma matriz explícita, adicionar uma negação conhecida de acesso direto e preservar os fluxos autorizados. A task não altera produto, contrato de `JOURNEY-056`, migration aplicada ou ambiente produtivo; grants/owners produtivos continuam dependentes de autoridade operacional.

**Fechamento operacional 2026-08-26 (`OPS-061-GRANTS-001`):** o commit técnico `464b0b8` substituiu o DML global por allowlist imutável de 29 tabelas, excluiu `knowledge_documents`, revogou privilégios atuais/default de `app` e `PUBLIC` e manteve admin/migration separados. O RED falhou 1/20 antes da implementação; após GREEN/REFACTOR, o focal estático passou 20/20. `pnpm verify` passou com 141 arquivos/709 testes PASS, 29 arquivos/38 testes skipped e cobertura 84,36%/80,35%/86,35%/85,05%; build passou em 12 workspaces, E2E sintético em 32/32 e audit high sem vulnerabilidades. O preflight live foi tentado e encerrou com exit 2 por ausência de `CVG_TEST_DATABASE_URL`, portanto não há evidência live nova. Auditoria: `BRIEFING/04.AUDIT/0542_application_role_privilege_matrix_audit.md`. Item `COMPLETED_WITH_GAPS`; produção, remote same-SHA, escala/failover/restore/collector e gates clínicos permanecem fora do resultado.

**Reabertura controlada 2026-08-26 (`OPS-061-GRANTS-002`):** crítica independente pós-build encontrou URL com senha em `argv`, ACL de database/schema/functions e defaults incompletos, SQL de grants dependente de `search_path`, provisionamento sem transação e contrato CI sem todas as variáveis exigidas pelo próprio fluxo. A correção fica limitada ao harness/provisionador e sua governança; a matriz live permanece dependente de banco descartável autorizado e nenhuma evidência produtiva será inferida.

**Abertura controlada 2026-08-26 (`OPS-061-GRANTS-003`):** uma revisão independente parcial confirmou que o contrato não verificava `DATABASE_URL`, embora essa variável inicialize o runtime, e que `.env.example` a apontava para a role de migração. Foi aberta uma correção bounded para exigir a role de aplicação em `DATABASE_URL`, conferir o mesmo banco nas cinco URLs documentadas e corrigir o ponteiro `head` do runtime state. A task não altera produto, migrations aplicadas, `JOURNEY-056`, produção ou deploy.

**Fechamento controlado 2026-08-26 (`OPS-061-GRANTS-003`):** `DATABASE_URL` passou a ser validada com a role de aplicação de `CVG_TEST_DATABASE_URL` e o mesmo banco das cinco URLs; `.env.example` agora usa `cvg_app`. O focal passou `9/9`; `pnpm verify` passou com 141 arquivos/716 testes PASS, 29 skipped/38 testes, cobertura 84,36%/80,30%/86,35%/85,05%, build 12/12, E2E 32/32, audit high e diff-check. O resultado é `COMPLETED_WITH_GAPS`: não há prova produtiva, live nova, remote same-SHA, deploy ou aceitação independente final; auditoria `0544`.

**Reabertura controlada 2026-08-26 (`OPS-061-GRANTS-004`):** a crítica independente final confirmou dois gaps no perímetro do contrato: as URLs PostgreSQL efetivas do workflow não eram comparadas entre si, e valores vazios no `.env.example` podiam passar. Foram escritos três testes RED; a suíte focal falhou `3/12`. A correção continua limitada ao validador/workflow/testes e não altera produto, migrations aplicadas ou `JOURNEY-056`.

**Fechamento controlado 2026-08-26 (`OPS-061-GRANTS-004`):** o validador passou a comparar as cinco URLs job-level e o override de migration, rejeitar valores vazios e manter a role least-privilege. O focal passou `13/13`; `pnpm verify` passou com 141 arquivos/720 testes PASS, 29 skipped/38 testes, cobertura 84,36%/80,30%/86,35%/85,05%, build 12/12, E2E 32/32, audit high e diff-check. O item fica `COMPLETED_WITH_GAPS`; não há prova live nova, produtiva, remote same-SHA ou parecer independente final. Auditoria `0545`.

**Reabertura controlada 2026-08-26 (`OPS-061-GRANTS-005`):** a crítica independente pós-fix encontrou dois gaps P2 no mesmo perímetro: a URL da fixture real E2E não exigia a role administrativa separada e o override de `DATABASE_URL` podia ser capturado em outro step por mera indentação. A correção é bounded ao validador e aos testes de governança; não altera produto, migrations aplicadas, produção, deploy ou `JOURNEY-056`.

**GREEN focal 2026-08-26 (`OPS-061-GRANTS-005`):** os três cenários RED falharam `3/16` antes da correção; depois, o validador passou a exigir a role admin da fixture real E2E e a ancorar o override ao step `Apply migrations`. O focal passou `16/16`, `verify:ci-contract` e formatação passaram; regressão completa e auditoria final ainda estão pendentes.

**Fechamento controlado 2026-08-26 (`OPS-061-GRANTS-005`):** o commit técnico `400e22885ae22c1f03ed6c58c61a59d65719158d` e o documental `d4fa8af1f6dd3f282b1e27eb81f5f3c44335000b` fecharam os dois gaps P2. `pnpm verify` passou com 141 arquivos/723 testes PASS, 29 arquivos/38 testes skipped, cobertura 84,36%/80,30%/86,35%/85,05%; build 12/12, E2E sintético 32/32, audit high, diff-check e `verify:traceability:release` passaram. O parecer independente pós-fix não retornou veredito dentro da janela; o item fica `COMPLETED_WITH_GAPS`, sem evidência live nova ou claim externo. Auditoria `0546`.

**Atualização operacional 2026-08-24 (ADAPTIVE-044):** a fatia de diagnóstico persistido → atribuição server-side foi implementada e auditada em `BRIEFING/04.AUDIT/0523_adaptive_assignment_audit.md`. O `pnpm verify` final passou com 125 arquivos/570 testes, 29 skips, cobertura 84,49%/80,31%/85,98%/85,22%; build 12 workspaces, E2E 23/23, contratos 70/70, worker 25/25, migrações 26/26, audit de dependências, exposição, documentação, product-definition, traceability e diff-check passaram. A integração live do novo slice ficou skipped por ausência de `CVG_TEST_DATABASE_URL`; o item segue `COMPLETED_WITH_GAPS`, sem publicação clínica, aplicação real, release ou claim de competência prática.

**Atualização operacional 2026-08-24 (JOURNEY-045):** a CTA da próxima atividade foi implementada e auditada em `BRIEFING/04.AUDIT/0524_journey_cta_audit.md`. O servidor agora projeta `nextActionTarget` somente para iniciar/retomar uma atividade presente na jornada; a web mantém a sessão, codifica `?activityId` e não escolhe a próxima ação. `pnpm verify` passou com 125 arquivos/572 testes, 29 skips e cobertura 84,51%/80,33%/86,03%/85,23%; build, integração configurada e E2E 24/24 passaram. O item segue `COMPLETED_WITH_GAPS`: assignment→atividade real, live RLS, provenance/atomicidade e feedback/debrief permanecem pendentes.
**Atualização operacional 2026-08-24 (RESULT-FEEDBACK-046):** a web agora consulta o endpoint público de feedback da tentativa corrigida, exibe score/outcome/feedback e reutiliza a próxima ação server-side; `not_found` fica em estado bounded “ainda não disponível”. RED/GREEN focal, build web, lint/typecheck, cobertura, E2E participante 13/13 e gates estáticos passaram. O item segue `COMPLETED_WITH_GAPS`: assignment→atividade/proveniência/atomicidade, live RLS, debrief/remediação/retenção completos, gates clínicos e assurance operacional continuam pendentes.
**Atualização operacional 2026-08-24 (JOURNEY-REL-001):** a atribuição adaptativa agora materializa `activity_assignments` somente para atividades `PUBLISHED` com `learning_activities.module_id` explícito, grava `source_diagnostic_result_id`/`learning_assignment_id` e repara provenance nula sem alterar progresso. RED/GREEN focal, typecheck de persistence/curriculum, migration 0026 e seed M02 passaram localmente; os dois testes PostgreSQL live permanecem skipped sem `CVG_TEST_DATABASE_URL`. O item segue `COMPLETED_WITH_GAPS`: RLS/rollback/concorrência live, sincronização posterior de estados, pipeline de publicação curricular, gates clínicos e assurance operacional continuam pendentes.
**Fechamento local operacional 2026-08-24 (JOURNEY-REL-001):** o commit de código `9b1b975d62760142238b6b19f03e207181f59a87` passou `pnpm verify` com 125 arquivos/574 testes, 30 skips, cobertura 84,49%/80,34%/85,94%/85,22%, build nos 12 workspaces, E2E 26/26, integração 8/20 com 27/30 skips, migrations 27/27 e audit high sem vulnerabilidades. O commit documental `2972fa0b64023551a5aaacd668b3c1ae5176409d` também passou `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` em worktree limpo; nenhum resultado live é inferido.

**Atualização operacional 2026-08-24 (JOURNEY-REL-002 / AUD-P1-003):** o commit `5bfa530710171cf1299e8e60d4645796b3886465` fechou a prova live sintética de provenance/RLS e hardening de papéis: a suíte PostgreSQL passou 31 arquivos/48 testes com aplicação `NOSUPERUSER/NOBYPASSRLS` e fixture administrativa separada; o vínculo publicado com módulo incompatível falha fechada e sofre rollback transacional. `CVG_RUN_REAL_E2E=true pnpm test:e2e` passou 28/28 via navegador→web→API→PostgreSQL. O CI agora provisiona owner de migração, aplicação e admin distintos. `pnpm verify` passou com 125/576/31 skips, cobertura 84,50%/80,34%/85,95%/85,22%, contratos 72/72, worker 25/25 e migrations 27/27. Remanescem workflow remoto no mesmo SHA, concorrência, grants/owners produtivos, observabilidade/restore, pipeline curricular autoral e gates clínicos; não há declaração de release/100%.

**Atualização operacional 2026-08-24 (OUTBOX-FENCE-001):** o outbox agora grava
`lease_token` por claim, finaliza/falha somente com token correspondente e
lease válido no relógio do PostgreSQL, e rejeita no banco transições terminais de
worker antigo sem fencing. RED/GREEN focal passou 32/32; PostgreSQL live passou
31 arquivos/50 testes com aplicação `NOSUPERUSER/NOBYPASSRLS` e fixture admin
separada; `pnpm verify` passou com 125/579/33 skips, cobertura
84,48%/80,37%/85,97%/85,22%, migrações 28/28 e contrato CI 21 checks. O item
fica `COMPLETED_WITH_GAPS`: efeitos externos continuam at-least-once e
idempotentes; remote same-SHA, múltiplas réplicas/carga, collector/traces/
retention/restore produtivos, autoria curricular e gates clínicos permanecem.

**Atualização operacional 2026-08-24 (AUTHORING-ACTIVITY-001):** a publicação
editorial agora materializa uma atividade por `scopeId + moduleId + sessionId`
explícitos, com itens somente de versões `PUBLICADO`, ordinal bounded,
idempotência e validação do conjunto exato. As migrations `0028`–`0030` levam a
journal a 31 e aplicam `ENABLE/FORCE RLS` nas duas tabelas da projeção; a role de
aplicação não tem `SUPERUSER/BYPASSRLS`. RED/GREEN focal passou 18/18, o
authoring live passou 1/1 com replay/RLS/duas transações concorrentes e a suíte
live completa passou 31 arquivos/50 testes. `pnpm test:coverage` passou com
125/592/33 skips e cobertura 84,57%/80,50%/86,08%/85,30%. O complemento fica
`COMPLETED_WITH_GAPS`: E2E navegador usando o pipeline autoral, workflow remoto,
grants/owners produtivos, observabilidade/restore e gates clínicos continuam.

**Atualização operacional 2026-08-24 (AUTHORING-E2E-PIPELINE-001):** o fixture
real deixou de inserir diretamente a atividade e seus itens. Ele agora cria
conteúdo editorial sintético, executa revisão, projeção, autorização e
publicação pelos casos de uso de authoring, consulta a atividade materializada
por `scopeId/moduleId/sessionId` e só depois cria a atribuição participante. O
contrato E2E exige `source: authoring-publication-v1` e slug `authoring-*`.
Node 22.22.0 passou 117 arquivos/572 testes unitários, além de lint, typecheck,
formatação, sintaxe e descoberta dos dois cenários reais. O E2E browser→API→
PostgreSQL ainda não foi executado por falta de banco CVG descartável autorizado
e `pnpm` no ambiente; o item permanece `COMPLETED_WITH_GAPS`.

**Atualização operacional 2026-08-24 (ACTIVITY-RLS-047):** a crítica
independente encontrou e o TDD corrigiu uma leitura de `learning_activities`
fora do contexto transacional RLS. O resolver agora exige `participantId` ou
`scopeId` server-side em transação; as migrations `0031`/`0032` exigem
atividade publicada, conta ativa e membership participante aceito, preservam a
visibilidade de todos os estados persistidos da jornada e restringem itens a
assignments iniciáveis. A constraint `session_id` sem `module_id` também foi
fechada. Fixtures live sintéticos foram alinhados com memberships aceitos.
Unitário passou 117/572, contrato RLS 2/2, integração 23 pass/33 skips,
migrations 33/33, traceability release e typecheck/lint/formatação/diff-check
passaram; PostgreSQL live e E2E autoral continuam pendentes por falta de banco
CVG descartável autorizado.

**Atualização operacional 2026-08-24 (CURRICULUM-RUNTIME-AUTHZ-050):** a
avaliação curricular interna agora prova `participantId + scopeId` com
membership server-side antes de executar o caso de uso; a migration `0034`
repete a mesma invariável no `curriculum_runtime_states` e restringe a policy
staff quando há contexto de participante. RED reproduziu `200` antes da guarda;
GREEN passou 70/70 HTTP, 72/72 unitários focais, lint, typecheck e migrations
35/35. O hardening `6481add` revogou `EXECUTE` público da função
`SECURITY DEFINER`, concedeu-o somente à role de aplicação no provisionador e
adicionou 3/3 testes de governança. O teste PostgreSQL negativo foi preparado,
mas continua sem execução por ausência de `CVG_TEST_DATABASE_URL`; o item fica
`COMPLETED_WITH_GAPS`.

**Atualização operacional 2026-08-24 (RLS-FUNCTION-EXECUTE-051):** a crítica
independente encontrou que os helpers `SECURITY DEFINER` das migrations
`0030`–`0032` ainda tinham `PUBLIC EXECUTE`. A migration `0035` agora revoga o
privilégio dos cinco helpers atuais; o provisionador reaplica revoke + grant
idempotentes somente para a role de aplicação; a governança cobre todas as
assinaturas e o teste live negativo verifica ACL direta, role sem
`SUPERUSER/BYPASSRLS`, owner distinto e `permission denied`. RED/GREEN focal,
`pnpm verify` (131/637/34 skips), cobertura 84,90%/81,13%/86,41%/85,65%,
typecheck, lint, migrations 36/36 e gates estáticos passaram. O preflight live
saiu 2 sem `CVG_TEST_DATABASE_URL`; a fatia fica `COMPLETED_WITH_GAPS`, sem
release ou claim de produção.

**Abertura operacional 2026-08-24 (AUTHORING-DRAFT-052):** foi escolhida a
menor fatia vertical segura do fluxo autoral: criar conteúdo sintético em
`RASCUNHO`, com `AUTHOR_CONTENT`, identidade/versão/status/projeção participante
derivados no servidor, preflight recalculado e replay idempotente. A rota
canônica será a especificada em `SPEC-0107`, `POST /api/v1/content/drafts`;
as rotas internas de fila/revisão existentes permanecem compatíveis e não serão
duplicadas silenciosamente. Nenhum conteúdo clínico real, submissão clínica,
publicação, IA ou Qdrant entra nesta task.

**Fechamento operacional 2026-08-24 (AUTHORING-DRAFT-052):** a fatia foi
fechada nos commits `6630d8c`/`f6a1234` após RED/GREEN/REFACTOR, `pnpm verify` 131/647/35
skips, cobertura 84,33%/80,16%/86,04%/85,01%, build 12 workspaces, E2E
autoral 5/5 e E2E completa 31/31. A crítica independente final retornou `CONDITIONAL PASS`, sem
P0/P1 restantes; o teste live continua indisponível sem
`CVG_TEST_DATABASE_URL`, portanto não há release ou claim de produção.

**Abertura operacional 2026-08-24 (FEEDBACK-HISTORY-053):** foi selecionada
uma fatia local bounded para fechar a rastreabilidade operacional da fila de
relatos: timeline interna append-only por `ticketId` e escopo, read-only,
allowlisted e sem projeção ao participante. A implementação reutilizará o
padrão de histórico de apelações; prioridade, atribuição, SLA, resposta,
notificação e retirada clínica permanecem fora do recorte até existir contrato
e autoridade explícitos.

**Fechamento operacional 2026-08-24 (FEEDBACK-HISTORY-053):** a fatia foi
fechada no commit `5f93cbb55732da2b89c0d6322ccc2a00e76cbd40` após RED/GREEN/
REFACTOR. Contratos, caso de uso, repository, migration 0037, append-only/
RLS/provisionamento, API, template de rota, timeline web e E2E foram ligados;
`pnpm test:coverage` passou com 134 arquivos/660 testes/35 skips e cobertura
84,26%/80,07%/86,08%/84,97%, `pnpm build` passou nos 12 workspaces e
`pnpm test:e2e` passou 31/31. O item segue `COMPLETED_WITH_GAPS`: o preflight
live continua sem `CVG_TEST_DATABASE_URL`, logo não há claim de PostgreSQL/RLS/
grants live, browser→API→PostgreSQL, produção, workflow remoto ou aprovação
clínica; tickets anteriores à migration 0037 podem ter timeline vazia sem
backfill inventado.

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

### OUTBOX-FENCE-001 — Fencing de lease do outbox

- título: impedir que worker stale finalize ou falhe evento após reclaim
- descrição: atribuir token opaco por claim, guardar o token no PostgreSQL,
  exigir token e lease válido em sucesso/falha, usar relógio server-side e
  bloquear transição terminal de worker legado durante rollout
- módulo: worker / persistência / resiliência / operação
- dependência: `RESILIENCE-11-01`; SPEC 0108, 0113 e 0118
- fase: BUILD — Phase 9 / hardening local de resiliência
- risco: alto — corrida stale pode duplicar efeito, perder retry ou mascarar
  ownership do evento
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0504_worker_resilience_audit.md`;
  migração `0027_outbox_lease_fencing.sql`; `docs/99_runtime_state.md`
- código: `packages/persistence/src/outbox-repository.ts`,
  `packages/persistence/src/schema.ts`, `apps/worker/src/loop.ts`
- testes: `packages/persistence/src/outbox-repository.test.ts`,
  `apps/worker/src/loop.test.ts`,
  `tests/integration/postgres-worker.test.ts`
- verificação: RED focal com 9 falhas antes do slice; GREEN focal 32/32;
  PostgreSQL live 31 arquivos/50 testes; `pnpm verify` 125/579/33 skips,
  cobertura global acima de 80%, migrações 28/28, secrets, CI contract,
  documentação, exposição, typecheck, lint e build/E2E a repetir após o commit
- resultado: claim/reclaim renovam token; token antigo não finaliza nem falha;
  relógio do PostgreSQL evita clock skew do processo; worker registra
  `lease_lost` sem retry cego
- gaps: efeito externo iniciado antes da perda ainda exige idempotência;
  múltiplas réplicas/carga, workflow remoto, collector/traces/retention/restore
  produtivos, grants produtivos, autoria curricular e gates clínicos continuam
  nos itens próprios
- próxima ação: fechar commit/rastreabilidade local e então tratar pipeline
  autoral `moduleId` com E2E navegador→PostgreSQL quando o escopo clínico
  continuar bloqueado

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

### FEEDBACK-055 — Isolamento de escrita do participante em feedback

- título: impedir que contexto de participante altere ou apague feedback diretamente, contornando histórico e auditoria
- descrição: substituir a policy participante `FOR ALL` de `feedback_tickets` por políticas explícitas de leitura/criação; separar a persistência de transições staff do contexto que identifica o participante
- módulo: feedback / PostgreSQL / RLS / persistência / segurança
- dependência: `FEEDBACK-054`; migrations `0010` e `0041`; `SPEC-0109`; `SPEC-0111`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / hardening de segurança
- risco: crítico — update/delete direto pode mudar metadata/status/campos protegidos sem evento append-only ou auditoria
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: participante lê e cria apenas seus relatos; UPDATE/DELETE do participante falham na policy; transições staff autorizadas continuam usando contexto somente de escopo e produzem exatamente um histórico/auditoria; metadata `FEEDBACK-054` continua allowlisted e CAS; migrations 0042/0043/0048, governança estática, testes RED/GREEN/REFACTOR, regressão e prova live sintética passaram
- escopo: policy/RLS de `feedback_tickets`, contexto de escrita staff, repositório de estado, testes de migration/governança e fixture live sintética
- fora desta fatia: resposta ao participante, SLA, notificação, anexos, atribuição a terceiro, publicação clínica, provider/MFA, produção, least privilege produtivo e workflow remoto
- controles obrigatórios: não editar migration aplicada; correções posteriores são forward-only; não confiar em identidade do cliente; manter participant projection e contrato público; staff continua capability/role/scope/CAS; evidência live local não é evidência de produção
- evidência: `BRIEFING/04.AUDIT/0540_feedback_ticket_live_isolation_audit.md`; migrations `0042_feedback_ticket_participant_write_rls.sql`, `0043_feedback_history_participant_insert_rls.sql` e `0048_learning_participant_context_hardening.sql`; `packages/application/src/learning-state-use-cases.ts`; `packages/persistence/src/learning-state-repository.ts`; `tests/integration/postgres-learning-state.test.ts`; clean live 35/75; verify 141/708
- resultado: isolamento de escrita, histórico append-only, contexto staff e CAS continuam preservados; prova live confirmou own/cross-participant feedback, participant UPDATE/DELETE negados, rollback/trigger/CAS e ausência de execução pública dos helpers
- próxima ação: manter `FEEDBACK-057` separado e avançar para `JOURNEY-056` somente com escopo e gates explícitos; não declarar release

### LIVE-056 — Prova live de isolamento contextual e integridade adaptativa

- título: transformar a correção de isolamento em evidência runtime PostgreSQL reproduzível em banco descartável
- descrição: aplicar migrations 0043–0050, provisionar roles distintas, executar a matriz live de feedback, journey/activity/progress/attempt, adaptive assignment, privilégios dos helpers e o caminho browser→web→API→PostgreSQL em banco sintético
- módulo: PostgreSQL / RLS / integridade adaptativa / segurança / CI
- dependência: `FEEDBACK-055`; `ACTIVITY-RLS-047`; `RLS-FUNCTION-EXECUTE-051`; `DB-PRIVILEGE-032`; SPEC 0109/0111/0118
- fase: BUILD/AUDIT — Phase 3–5 / hardening de segurança
- risco: crítico — uma policy não exercitada pode parecer correta enquanto deixa atravessar participante, escopo, assignment, conteúdo ou helper privilegiado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: banco PostgreSQL 16.15 recriado sem resíduos antes da execução; 51/51 migrations; app `NOSUPERUSER/NOBYPASSRLS/NOCREATEROLE`; admin separado para cleanup; RLS/FORCE RLS nas tabelas sensíveis; helper `SECURITY DEFINER` privado; feedback próprio/cross-participant, writes proibidos, journey oracle, conteúdo misto/status inválido, replay e corrida concorrente cobertos; E2E real serial `34/34` no mesmo SHA, com health, request IDs, persistência independente, nova sessão e cleanup verificado
- escopo: ambiente local descartável `cvg_gauntlet_20260826`, roles sintéticas sem dados clínicos reais e runner oficial `pnpm test:integration:live`
- fora desta fatia: assignment produzido pelo fluxo diagnóstico, cenário browser cross-scope, produção, owners/grants least privilege produtivos, deployment, workflow remoto same-SHA, carga/failover/restore/collector e aprovação clínica
- controles obrigatórios: credenciais não entram no Git; admin não representa role de aplicação; migrations são forward-only; Qdrant/IA não participam da decisão; nenhum dado real é utilizado
- evidência: `BRIEFING/04.AUDIT/0540_feedback_ticket_live_isolation_audit.md`; `BRIEFING/04.AUDIT/0541_real_browser_api_postgres_e2e.md`; commits `b66acc125fac0e022ce5837c4eb14d1eca862401` e `16caccc82ffc519b60a68e1a02850d40909737e1`; migrations 51/51; live 35/75; E2E 34/34; `traceability.yml` / `LIVE-056`
- resultado: prova live PostgreSQL e browser vertical local concluídas com gaps de produto/produção explicitamente mantidos; o fixture pré-provisiona assignment e não prova diagnóstico→assignment; não é autorização de release/piloto
- próxima ação: avançar para `JOURNEY-056` ou `FEEDBACK-057` apenas como nova fatia bounded

### OPS-061-GRANTS-001 — Matriz explícita de privilégios do papel de aplicação

- título: retirar o DML global do papel da aplicação no harness PostgreSQL e tornar a allowlist verificável
- descrição: substituir o `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` por grants explícitos apenas para as tabelas usadas pela aplicação/worker, negar acesso direto à tabela interna não autorizada, bloquear privilégios default amplos para tabelas futuras e manter o admin sintético separado para fixture/cleanup
- módulo: operação / PostgreSQL / CI / segurança / governança de privilégios
- dependência: `LIVE-056`; `RLS-FUNCTION-EXECUTE-051`; `DB-PRIVILEGE-032`; SPEC 0109/0111/0118
- fase: BUILD/AUDIT — Phase 7 / hardening de assurance local
- risco: crítico — grant global pode mascarar acesso indevido e tornar o harness não representativo de deny-by-default
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: a role de aplicação não possui DML global nem privilégios default amplos; a allowlist explícita permite os fluxos atuais; uma tabela fora da allowlist falha com `permission denied`; os testes de governança rejeitam a regressão do grant global; `pnpm verify`, build e E2E sintético passam sem alterar `JOURNEY-056`. A execução live permanece requisito pendente quando houver ambiente autorizado.
- escopo: `scripts/provision-ci-postgres.mjs`, governança de CI/migrations e teste live sintético da matriz de grants
- fora desta fatia: owners/grants produtivos, deploy, workflow remoto, publicação clínica, contrato/API/UX de jornada, dados reais e alterações de migrations aplicadas
- controles obrigatórios: roles migration/application/admin distintas; nenhuma credencial em Git/log; SQL de identifiers validado; admin usado somente para provisionamento/cleanup; não remover RLS nem usar `SUPERUSER`/`BYPASSRLS` na aplicação; forward-only e cleanup de banco descartável
- evidência: crítica independente Ptolemy; crítica pós-build Huygens; `scripts/provision-ci-postgres.mjs`; `tests/integration/migration-governance.test.ts`; `tests/integration/postgres-rls-function-privileges.test.ts`; auditoria `0542`; commit `464b0b8`; Quality Bar `QB-03`/`QB-04`
- próxima ação: aguardar decisão humana para `JOURNEY-056`; quando houver `CVG_TEST_DATABASE_URL`, executar a matriz live em banco descartável e registrar owners/grants produtivos somente com autoridade operacional

### OPS-061-GRANTS-002 — Hardening do provisionamento e contrato de privilégios

- título: responder aos achados independentes de segredo, ACL, atomicidade e contrato do harness
- descrição: remover URL/senha de argumentos e ambiente herdado do `psql`, endurecer ACL de database/schema/functions e defaults, verificar grantability e identidade da role, qualificar todos os objetos, transacionar o provisionamento e declarar no contrato CI as variáveis efetivamente requeridas
- módulo: operação / PostgreSQL / CI / segurança / governança de privilégios
- dependência: `OPS-061-GRANTS-001`; SPEC 0109/0111/0118
- fase: BUILD/AUDIT — Phase 7 / hardening de assurance local
- risco: crítico — credencial observável, ACL residual ou falha parcial podem invalidar o deny-by-default e mascarar a evidência do harness
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: testes RED reproduzem cada achado; o processo não recebe URL/senha em `argv` nem herda URLs sensíveis; database/schema/functions e defaults ficam deny-by-default com grants explícitos sem grant option para `app`; SQL usa schema explícito e transação; roles declaram atributos seguros; contrato CI/.env.example cobrem as variáveis; foco, verify, build, E2E, audit e diff passam; live continua `NOT RUN` se o ambiente faltar
- escopo: `scripts/provision-ci-postgres.mjs`, `scripts/verify-ci-contract.mjs`, `.env.example`, governança estática/live e documentação de rastreabilidade
- fora desta fatia: migrations aplicadas, produto, `JOURNEY-056`, produção, deploy, workflow remoto same-SHA, fornecedor, publicação clínica e dados reais
- controles obrigatórios: pgpass temporário com limpeza; roles migration/application/admin distintas; nenhuma credencial em Git/log/argv; SQL parametrizado/identifiers validados; admin somente para fixture/cleanup; sem `SUPERUSER`/`BYPASSRLS` na aplicação; rollback transacional
- evidência: crítica independente Galileo; auditoria `0543`; `traceability.yml` / `OPS-061-GRANTS-002`; commit `36088ff`; migration governance `23/23`, CI governance `7/7`, banco sintético PostgreSQL 16.15 com live `35/35` arquivos e `82/82` testes; `pnpm verify`, build, E2E, audit high, diff-check e `verify:traceability:release` PASS
- próxima ação: manter a evidência local/sintética como conditional pass, aguardar decisão humana para `JOURNEY-056` e tratar ACL/owners produtivos, workflow remoto same-SHA e operação externa somente com autoridade própria

### OPS-061-GRANTS-003 — Coerência da role de runtime no contrato CI

- título: impedir que o runtime documentado use a role de migração e deixar o contrato CI coerente com a matriz least-privilege
- descrição: validar `DATABASE_URL` junto das URLs `CVG_*`, exigir que o runtime use a role de aplicação e o mesmo banco das fixtures documentadas, e corrigir o exemplo de ambiente
- módulo: operação / configuração / PostgreSQL / CI / segurança / governança
- dependência: `OPS-061-GRANTS-002`; SPEC 0109/0111/0118
- fase: BUILD/AUDIT — Phase 7 / hardening de assurance local
- risco: alto — uma configuração copiada do exemplo poderia iniciar a aplicação com privilégios de migração e o contrato CI não detectaria a divergência
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: teste RED reproduz runtime com role de migração; validador parseia as cinco URLs, exige `DATABASE_URL` na role de aplicação e mesmo banco, `.env.example` usa `cvg_app`, foco/regressão/gates documentais/security passam e nenhuma evidência externa é inferida
- escopo: `scripts/verify-ci-contract.mjs`, `.env.example`, `tests/integration/ci-governance.test.ts`, audit e control plane
- fora desta fatia: produto, migrations aplicadas, ACL/owners produtivos, deploy, workflow remoto same-SHA, `JOURNEY-056`, fornecedor, publicação clínica e dados reais
- controles obrigatórios: não expor credenciais em saída; comparar somente identificadores parseados; manter role migration separada; não aceitar URL runtime divergente da role de aplicação; preservar a decisão A/B pendente
- evidência: crítica independente parcial; RED `1/8` antes da correção; GREEN focal `9/9`; commits técnicos `703fe7c`/`0bd71f2`; auditoria `BRIEFING/04.AUDIT/0544_runtime_database_url_contract_audit.md`; `pnpm verify` `141/716` com `38` skips, build `12/12`, E2E `32/32`, audit high e diff-check PASS
- gaps remanescentes: owners/ACLs/deployment produtivos, workflow remoto same-SHA e operação externa não foram provados; a revisão independente parcial não retornou parecer final; não há nova evidência live ou clínica
- próxima ação: aguardar a decisão humana A/B de `JOURNEY-056`; não iniciar código, migration ou UX de jornada antes da decisão contratual

### OPS-061-GRANTS-004 — URLs efetivas do workflow e valores não vazios

- título: fazer o contrato CI validar as URLs PostgreSQL efetivamente usadas pelo workflow e rejeitar entradas vazias
- descrição: conferir a role/banco do `DATABASE_URL` job-level contra `CVG_TEST_DATABASE_URL`, `CVG_MIGRATION_DATABASE_URL`, admin e real E2E; conferir o override de migration e falhar para qualquer URL vazia
- módulo: operação / configuração / PostgreSQL / CI / segurança / governança
- dependência: `OPS-061-GRANTS-003`; SPEC 0109/0111/0118
- fase: BUILD/AUDIT — Phase 7 / hardening de assurance local
- risco: alto — uma divergência no workflow pode usar role privilegiada ou um valor vazio pode mascarar um job não reprodutível
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: testes RED reproduzem runtime de workflow com role incorreta, URL de aplicação vazia e URL documentada vazia; validador compara identidades parseadas do job-level, exige override de migration coerente, rejeita vazios, foco/regressão/gates e audit passam sem claim externo
- escopo: `scripts/verify-ci-contract.mjs`, `tests/integration/ci-governance.test.ts`, workflow efetivo e control plane
- fora desta fatia: produto, migrations aplicadas, ACL/owners produtivos, deploy, workflow remoto same-SHA, `JOURNEY-056`, fornecedor, publicação clínica e dados reais
- controles obrigatórios: não expor credenciais em saída; não confiar só em regex de role; separar runtime app do override de migration; falhar fechado para valor ausente/vazio; preservar a decisão A/B pendente
- evidência: crítica independente final parcial; RED `3/12` antes da implementação; GREEN focal `13/13`; commit técnico `489a336`; auditoria `BRIEFING/04.AUDIT/0545_workflow_database_url_contract_audit.md`; `pnpm verify` `141/720` com `38` skips, build `12/12`, E2E `32/32`, audit high e diff-check PASS
- gaps remanescentes: configuração/owners/ACLs/deployment produtivos, workflow remoto same-SHA e operação externa não foram provados; a revisão independente não retornou parecer final pós-correção; não há nova evidência live ou clínica
- próxima ação: aguardar a decisão humana A/B de `JOURNEY-056`; não iniciar código, migration ou UX de jornada antes da decisão contratual

### OPS-061-GRANTS-005 — Identidade da fixture real E2E e ancoragem do override

- título: impedir que a fixture de E2E real use a role de aplicação/migração e que o contrato aceite um override de migration fora do step correto
- descrição: exigir que `CVG_REAL_E2E_DATABASE_URL` use a identidade da role administrativa de fixture, preservar o mesmo banco e ler `DATABASE_URL` do escopo do step `Apply migrations`, com falha fechada para override ausente ou deslocado
- módulo: operação / configuração / PostgreSQL / CI / segurança / governança
- dependência: `OPS-061-GRANTS-004`; SPEC 0109/0111/0118
- fase: BUILD/AUDIT — Phase 7 / hardening de assurance local
- risco: médio — fixture com privilégios inadequados pode mascarar o comportamento do runtime e um scanner textual pode validar uma variável em step errado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: testes RED reproduzem role de fixture incorreta e override fora de `Apply migrations`; validador exige a role admin para as URLs local/workflow e ancora o override no step nomeado; focal/regressão/gates documentais/security passam sem claim externo
- escopo: `scripts/verify-ci-contract.mjs`, `tests/integration/ci-governance.test.ts`, audit e control plane
- fora desta fatia: produto, migrations aplicadas, ACL/owners produtivos, deploy, workflow remoto same-SHA, `JOURNEY-056`, fornecedor, publicação clínica e dados reais
- controles obrigatórios: não expor credenciais em saída; comparar somente identificadores parseados; manter runtime na role app, migrations na role owner e fixture real na role admin; preservar a decisão A/B pendente
- evidência: crítica independente pós-fix `Confucius`; findings P2 em `scripts/verify-ci-contract.mjs`; RED `3/16`; GREEN focal `16/16`; `verify:ci-contract`, `pnpm verify`, build, E2E sintético, audit high e diff-check PASS; auditoria `BRIEFING/04.AUDIT/0546_ci_fixture_role_and_migration_step_audit.md`; commit `400e22885ae22c1f03ed6c58c61a59d65719158d`
- gaps remanescentes: a tentativa de crítica independente pós-commit não retornou veredito final; não há nova prova live, configuração/owners/ACLs produtivos, workflow remoto same-SHA ou evidência clínica
- próxima ação: aguardar a decisão humana A/B de `JOURNEY-056`; não iniciar código, migration ou UX de jornada antes da decisão contratual

### OPS-061-READINESS-006 — Readiness essencial e dependências degradáveis

- título: impedir que a falha do índice Qdrant retire do tráfego o núcleo PostgreSQL
- descrição: separar a checagem de readiness essencial da saúde agregada de PostgreSQL/Qdrant; `/health/ready` deve falhar para PostgreSQL/configuração essencial e permanecer disponível quando Qdrant estiver degradado, enquanto `/health/dependencies` continua expondo somente `DEGRADED` redigido
- módulo: integrações / API / runtime / observabilidade / operações
- dependência: `OPS-061-GRANTS-005`; SPEC 0110/0112/0113; Runtime 0802
- fase: BUILD/AUDIT — Phase 7 / hardening de assurance local
- risco: crítico — uma dependência derivada pode causar remoção indevida do núcleo autoritativo PostgreSQL do tráfego e ocultar o estado degradado já previsto pelo contrato
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: testes RED reproduzem Qdrant indisponível com PostgreSQL disponível tanto após o bind quanto no cold start; a API binda sem aguardar a dependência opcional, tenta inicialização em background com retry cancelável; readiness essencial passa sem Qdrant; falha PostgreSQL continua 503; saúde detalhada mantém `DEGRADED`; `pnpm reconcile:qdrant` aguarda explicitamente `ensureCollection()` antes de reconciliar; focal/regressão, build, E2E, audit high, diff-check e rastreabilidade passam sem claim externo
- escopo: `packages/integrations/src/composition.ts`, `packages/integrations/src/composition.test.ts`, `apps/api/src/main.ts`, `apps/worker/src/main.ts`, `apps/worker/src/reconcile-command.ts`, `apps/worker/src/reconcile-command-runner.ts`, testes e documentação de auditoria/rastreabilidade
- fora desta fatia: `JOURNEY-056`, `FEEDBACK-057`, migrations aplicadas, alterações de contrato de domínio, produção, deploy, workflow remoto same-SHA, fornecedor, aprovação clínica e dados reais
- controles obrigatórios: PostgreSQL permanece fonte autoritativa; Qdrant/IA não decidem estado; respostas de health não expõem causa/URL/segredo; preservar a checagem agregada para diagnóstico; retry deve ser cancelável no close e não deixar timer/erro não tratado; o comando explícito de reconciliação deve aguardar a preparação do índice; RED/GREEN/REFACTOR e revisão independente
- evidência de abertura: crítica independente de resiliência `Beauvoir`; contrato `BRIEFING/08.RUNTIME/0802_deploy_health_recovery.md` e `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0113_observabilidade_runtime_e_operacao.md`; críticas finais `Euler`/follow-up; log/state de 2026-08-26; auditoria `BRIEFING/04.AUDIT/0547_readiness_degraded_startup_audit.md`; commits técnicos `2b8bcae`/`4e46daf`/`c79cb7a`/`d90393f`
- evidência de fechamento: focal ampliado `18/18`, worker `31/31`, `pnpm verify` `142` arquivos/`730` testes PASS com `29` arquivos/`38` testes skipped e cobertura `84,42%`/`80,33%`/`86,46%`/`85,15%`; build `12/12`, E2E `32/32`, audit high, diff-check e `verify:traceability:release` PASS. A coordenação entre boot e `reconcile:qdrant` foi verificada por barreira deferred e promessa compartilhada; não há evidência live de outage nem aceite independente posterior ao `d90393f`
- gaps remanescentes: verificação live com Qdrant indisponível, startup/restart/carga/failover e operação externa ainda não observados; retry de boot ainda não tem limite/backoff/jitter; readiness ainda não valida literalmente migration/schema; o achado separado de identidade em learning-state continua em análise
- próxima ação: aguardar a decisão humana A/B de `JOURNEY-056`; manter a operação de reconciliação sob o comando explícito e tratar retry limitado/backoff, migration/schema readiness e outage live como novas fatias bounded, sem declarar release

### JOURNEY-056 — Sessão diagnóstica participante e atribuição inicial

- título: fechar a jornada participante de diagnóstico formativo sintético até assignment e atividade publicada
- descrição: iniciar, responder, retomar e finalizar o diagnóstico B-07 técnico; derivar identidade/escopo no servidor; persistir resultado de forma idempotente; chamar a atribuição existente e permitir seguir a atividade publicada já vinculada
- módulo: jornada do participante / diagnóstico / assignment / API / web / PostgreSQL
- dependência: `ADAPTIVE-044`; `JOURNEY-045`; `JOURNEY-REL-001`; `JOURNEY-REL-002`; `FEEDBACK-055`; `LIVE-056`; decisão de contrato desta entrada
- fase: BUILD — Phase 2 / jornada do participante
- risco: alto — expor o endpoint interno atual ou persistir resultado sem checkpoint pode vazar identidade/escopo ou deixar diagnóstico e assignment divergentes
- impacto: alto
- status: WAITING_HUMAN_APPROVAL
- decisão requerida: escolher entre (A) sessão diagnóstica pública própria, recomendada, com checkpoint e retomada, ou (B) atividade especial; a escolha altera contrato, persistência, API, web e E2E
- escopo candidato: diagnóstico formativo sintético, sem pass/fail global, sem nota punitiva, sem publicação clínica, sem currículo completo e sem claim de competência prática; identidade, escopo, módulos e assignment são server-side
- fora desta fatia: conteúdo B-07 clinicamente aprovado, produção/piloto, retenção, notificações, IA/Qdrant, debriefing completo, prática presencial e qualquer autorização clínica
- controles obrigatórios: contrato strict; participante não envia `participantId`/`scopeId`/módulos; checkpoint e finalização idempotentes; PostgreSQL/RLS/CAS; assignment existente preserva provenance; projeção não expõe gabarito, fonte ou campos internos; RED/GREEN/REFACTOR, E2E e gates antes de `COMPLETED_WITH_GAPS`
- evidência de decisão: `docs/20_master_execution_log.md`; `docs/99_runtime_state.md`; análise independente do loop; `BRIEFING/03.BUILD/STATE_OF_THE_ART_MASTER_PLAN.md`
- próxima ação: Ricardo escolher A ou B; depois criar/validar o contrato correspondente e só então iniciar RED

### FEEDBACK-054 — Priorização e atribuição escopadas de relatos

- título: permitir que moderador/administrador organize e assuma responsabilidade por um relato autorizado sem alterar seu estado
- descrição: adicionar metadata operacional bounded à fila de feedback: prioridade explícita e responsável opcional, com atualização strict, contexto de escopo, versão otimista, histórico append-only e auditoria metadata-only
- módulo: feedback / triagem interna / contratos / aplicação / persistência / API / operações web
- dependência: `FEEDBACK-043`; `FEEDBACK-HISTORY-053`; `PRD-RF-103`; `PRD-RF-104`; `PRD-RF-105`; `PRD-RF-107`; `UC-023`; `SPEC-0104`; `SPEC-0106`; `SPEC-0107`; `SPEC-0109`; `SPEC-0111`; `SPEC-0114`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / governança operacional
- risco: alto — prioridade ou responsável controlados pelo cliente podem atravessar escopo, mascarar o dono do trabalho ou perder a ordem histórica sob concorrência
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: contrato interno strict para atualização de prioridade `BAIXA|NORMAL|ALTA|URGENTE` e ação `MANTER|ASSUMIR|LIBERAR`; capability `MANAGE_FEEDBACK_METADATA` server-side; principal ativo com membership aceita e papel `MODERATOR`/`ADMIN` no escopo; `participantId`, `scopeId` e `assigneeId` nunca entram no comando; versão otimista e atualização de metadata não alteram o status; fila interna exibe metadata allowlisted; histórico append-only e auditoria registram a mudança sem texto clínico/resposta; 401/403/404/409/422/500; testes RED/GREEN/REFACTOR, regressão, E2E e gates documentais
- escopo: `feedback_tickets.priority`, `feedback_tickets.assignee_id`; rota interna bounded dedicada para metadata; eventos de histórico versionados; leitura na fila interna e timeline somente para identidade autorizada; atribuição limitada ao próprio principal autenticado
- fora desta fatia: resposta ao participante, SLA/calendário, notificação, anexos, detecção automática de risco, retirada clínica, vinculação de duplicados, alteração de estado, contestação, provider/MFA, PostgreSQL/RLS live, grants/owners produtivos, workflow remoto, piloto e produção
- controles obrigatórios: escopo vem da sessão e da linha persistida; `ASSUMIR` deriva o principal autenticado e `LIBERAR` usa nulo; não há atribuição arbitrária a terceiro; a conta executora deve estar ativa, ter convite/membership aceita no escopo e papel de moderador ou administrador; replays com versão obsoleta falham com `state_conflict`; a web ignora respostas antigas ao trocar escopo/filtro; participante não recebe nenhum campo novo
- evidência: `BRIEFING/04.AUDIT/0538_feedback_triage_metadata_audit.md`, manifesto `FEEDBACK-054`, commits `ea81eed1b42f6807938c2c83520833f86b30a3f7` e `9eedb2518f7b777330fe1787825df64416827dac`; focal 13/140, coverage 141/695, 32/32 E2E, migrations 42/42 e gates estáticos finais registrados no fechamento documental
- resultado: prioridade e autoatribuição/liberação estão implementadas localmente com preservação de status, CAS, histórico `METADATA_ALTERADO`, auditoria metadata-only e projeção interna allowlisted; a prova live não foi executada sem `CVG_TEST_DATABASE_URL`
- gaps remanescentes: PostgreSQL/RLS/grants/trigger/concurrency live, browser→API→PostgreSQL, produção, workflow remoto same-SHA, observabilidade operacional, provider/MFA, resposta/SLA/notificação, atribuição a terceiro e aprovação clínica
- próxima ação: release gate `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` passou no commit `d460ba04bb459f502ef59875242a091a3c1a5beb`; preparar prova live autorizada ou selecionar a próxima fatia bounded; não declarar release

### CURRICULUM-RUNTIME-AUTHZ-050 — Isolamento de avaliação curricular por escopo

- título: impedir que a avaliação curricular interna grave runtime para participante fora do escopo autorizado
- descrição: validar membership ativa/aceita na API e repetir a defesa no PostgreSQL para leitura, inserção e atualização de `curriculum_runtime_states`
- módulo: avaliação curricular / autorização / persistência / RLS
- dependência: `CUR-24-03`; `SPEC-0106`; `SPEC-0107`; `SPEC-0109`; `SPEC-0111`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / hardening de jornada
- risco: crítico — um `participantId` controlado pelo chamador não pode atravessar escopo, criar estado educacional indevido ou contaminar dashboards
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério parcial atendido: RED/GREEN HTTP; capability de moderador continua obrigatória; membership ausente/negativa falha fechado; política SQL exige conta ativa, papel participante, convite aceito e escopo exato; leitura staff não se aplica quando há contexto de participante
- evidência: `BRIEFING/04.AUDIT/0532_curriculum_runtime_authorization_audit.md`; migration `0034_curriculum_runtime_membership_rls.sql`; commits técnicos `8edf560` e `6481add`
- código: `apps/api/src/http.ts`; `packages/persistence/drizzle/0034_curriculum_runtime_membership_rls.sql`; `packages/persistence/drizzle/meta/_journal.json`
- testes: `apps/api/src/http.test.ts`; `tests/integration/curriculum-runtime.test.ts`; `tests/integration/migration-governance.test.ts`; `scripts/provision-ci-postgres.mjs`
- resultado: o boundary HTTP retorna `403` sem chamar a avaliação quando a membership não é provada; fixture live cria membership sintética e tenta escopo estrangeiro; nenhum campo interno é projetado
- gaps explícitos: PostgreSQL/RLS live, browser→API→PostgreSQL, concorrência, grants/owners produtivos, workflow remoto same-SHA, operação externa e publicação clínica ainda aguardam ambiente/autoridade; retenção continua sem CTA enquanto a divergência 30/60/90 versus D+7/D+30/D+90 não for decidida
- próxima ação: aplicar `0034` em banco CVG descartável/autorizado, executar integração live e então decidir a cadência de retenção antes de construir revisão consumível

### RLS-FUNCTION-EXECUTE-051 — Privacidade dos helpers RLS `SECURITY DEFINER`

- título: impedir chamada direta dos oráculos booleanos RLS por `PUBLIC`
- descrição: revogar `EXECUTE` público de todos os helpers `SECURITY DEFINER` usados pelas policies, conceder execução explicitamente à role de aplicação e provar a negação com uma role sintética sem grant
- módulo: PostgreSQL / segurança / RLS / provisionamento / CI
- dependência: `ACTIVITY-RLS-047`; `CURRICULUM-RUNTIME-AUTHZ-050`; `DB-PRIVILEGE-032`; migrations `0030`–`0034`
- fase: BUILD/AUDIT — Phase 13 / hardening de privilégio
- risco: crítico — um role com conexão ao banco poderia consultar oráculos de escopo e inferir dados fora da fronteira HTTP
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-001`; `PRD-RF-006`; `PRD-RF-009`; `SPEC-0111`; `SPEC-0112`; `SPEC-0118`; `AGENTS-TDD`
- critério de pronto: os cinco helpers atuais não têm `PUBLIC EXECUTE`; a aplicação possui grant direto sem ser superusuária, bypass ou owner; role sem grant recebe negação; provisionamento é reexecutável; governança e journal permanecem alinhados
- evidência: `BRIEFING/04.AUDIT/0533_rls_helper_execute_hardening_audit.md`; `traceability.yml` / `RLS-FUNCTION-EXECUTE-051`; commit `425e8d657c2ab4b55af2e8512b54ac24a8ea2c04`
- código: `packages/persistence/drizzle/0035_rls_helper_execute_hardening.sql`; `packages/persistence/drizzle/meta/_journal.json`; `scripts/provision-ci-postgres.mjs`
- testes: `tests/integration/migration-governance.test.ts`; `tests/integration/postgres-rls-function-privileges.test.ts`
- resultado: RED por migration ausente; GREEN focal e regressão completa local passaram; cinco assinaturas cobertas; o teste PostgreSQL negativo está pronto, mas não executado sem `CVG_TEST_DATABASE_URL`
- gaps explícitos: aplicação das migrations em banco autorizado, ACL/RLS live, browser→API→PostgreSQL, grants/owners produtivos, workflow remoto same-SHA, operação externa e gates clínicos continuam pendentes
- próxima ação: executar `pnpm test:integration:live` em ambiente CVG descartável/autorizado e anexar os resultados redigidos; depois selecionar a próxima lacuna P1 sem inventar regra clínica

### AUTHORING-DRAFT-052 — Criação idempotente de conteúdo autoral em rascunho

- título: permitir que autor autorizado crie um item editorial sintético e rastreável em `RASCUNHO`
- descrição: aceitar somente o payload editorial estrito; derivar `authorId`, `contentId`, `contentVersionId`, `version`, `participant` e `preflight` no servidor; persistir `content_versions` + `content_editorial_records` atomicamente; proteger replay por chave idempotente
- módulo: autoria / conteúdo editorial / API / persistência / autorização
- dependência: `AUTHORING-GOVERNANCE-012`; `SPEC-0106`; `SPEC-0107`; `SPEC-0109`; `SPEC-0111`; `SPEC-0112`; `SPEC-0118`; `RLS-FUNCTION-EXECUTE-051`
- fase: BUILD — Phase 13 / authoring bounded
- risco: crítico — identidade ou estado editorial controlado pelo cliente pode atravessar escopo ou liberar material não revisado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-034`; `PRD-RF-035`; `PRD-RF-036`; `PRD-RF-038`; `PRD-RF-091`; `PRD-RF-096`; `SPEC-0106`; `SPEC-0107`; `SPEC-0109`; `SPEC-0111`; `SPEC-0112`; `SPEC-0118`; `AGENTS-TDD`
- critério de pronto: contrato estrito rejeita identidade/status/preflight/projeção do cliente; capability e membership são validadas; IDs e projeção pública são server-side; preflight permanece não publicável; replay da mesma chave retorna o mesmo registro e payload divergente falha com `idempotency_conflict`; falha entre tabelas faz rollback; sem atividade publicada, review clínico, IA ou Qdrant
- evidência: `BRIEFING/04.AUDIT/0534_authoring_draft_audit.md`; `traceability.yml` / `AUTHORING-DRAFT-052`; SHA final `f6a123462a02fefbba9168cf974d9c824b78433b` (base `6630d8ca4514ce49c34fd2f013c7cacaa83adab0`)
- código: contratos strict, caso de uso, migration `0036`, RLS/policies, FKs compostas, provisionamento, repositório transacional, API, tela web e E2E autoral
- testes: `packages/contracts/src/authoring.test.ts`; `packages/application/src/authoring-use-cases.test.ts`; `apps/api/src/http.test.ts`; `apps/api/src/server.test.ts`; `tests/integration/migration-governance.test.ts`; `tests/integration/postgres-authoring-draft.test.ts`; `tests/e2e/authoring-review.spec.ts`
- resultado: RED/GREEN/REFACTOR concluído; `pnpm verify` passou com 131 arquivos/647 testes e 35 skips; cobertura 84,33% statements, 80,16% branches, 86,04% functions e 85,01% lines; build 12 workspaces; E2E autoral 5/5 e E2E completa 31/31; a rota é reconhecida por rate limit/métricas/auditoria; replay retorna os mesmos IDs e fingerprint divergente falha fechado
- gaps explícitos: `CVG_TEST_DATABASE_URL` ausente impede PostgreSQL/RLS/grants live e browser→API→PostgreSQL; grants/owners produtivos, workflow remoto same-SHA, operação externa, publicação e conteúdo clínico continuam sem evidência/autoridade
- próxima ação: executar `pnpm test:integration:live` em banco CVG descartável/autorizado; depois selecionar a próxima fatia P1, mantendo publicação clínica sob revisão humana

### FEEDBACK-HISTORY-053 — Timeline interna append-only da triagem de relatos

- título: permitir que moderador/administrador reconstrua a evolução de um relato autorizado sem mutação e sem expor histórico interno ao participante
- descrição: consultar eventos append-only por `ticketId` e escopo, com ordenação determinística, limite bounded, contrato estrito e projeção redigida
- módulo: feedback / triagem interna / governança / API / persistência / operações web
- dependência: `FEEDBACK-043`; `APPEAL-042`; `PRD-RF-072`; `PRD-RF-073`; `PRD-RF-104`; `SPEC-0106`; `SPEC-0107`; `SPEC-0111`; `SPEC-0114`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / governança operacional
- risco: alto — histórico fora do escopo, conteúdo livre exposto ou leitura mutável pode comprometer a reconstrução de suporte
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN/REFACTOR para contrato interno strict, capability server-side, contexto de escopo, `401/403/404/422`, limite máximo 100, ordenação determinística, tabela append-only e E2E sintético; nenhuma mutação ou projeção participante — atendido localmente
- fora desta fatia: prioridade, atribuição, prazo/SLA, resposta ao participante, notificação externa, anexos, retirada clínica, provider/MFA, PostgreSQL/RLS live, concorrência real, workflow remoto, piloto e produção
- evidência: `BRIEFING/04.AUDIT/0535_feedback_history_audit.md`; `traceability.yml` / `FEEDBACK-HISTORY-053`; commits de hardening `06b8f3720a9841d6d2335e51b28a8eb156a9191f` e `4680675555aac40246b80bc8ef099a7b2252ebfb` sobre `5f93cbb55732da2b89c0d6322ccc2a00e76cbd40`
- resultado: contrato strict, autorização server-side, leitura contextual, projection redigida, migrations 0037/0038/0039 com append-only/RLS, integridade composta e linhagem de eventos, evento e `audit_entries` metadata-only atômicos, contexto server-owned de ator/request/correlation, API, telemetria, timeline web e E2E sintético concluídos; 31/31 E2E, 665 testes e todos os gates locais passaram
- gaps explícitos: `CVG_TEST_DATABASE_URL` ausente impede PostgreSQL/RLS/grants live e browser→API→PostgreSQL; a FK `0038` é `NOT VALID` e tickets/rows legados não recebem histórico retroativo; prioridade, assignment, SLA, resposta, notificação, anexos, retirada clínica, provider/MFA, workflow remoto, produção e aprovação clínica permanecem fora
- próxima ação: o preflight `pnpm test:integration:live` foi tentado e saiu 2 por ausência de `CVG_TEST_DATABASE_URL`; selecionar a próxima lacuna P1 local bounded e repetir o live somente em banco CVG descartável/autorizado, sem declarar release

**Abertura operacional 2026-08-24 (FEEDBACK-HISTORY-053 / P1-integrity):** a
crítica independente encontrou uma lacuna de defesa no banco: `scope_id` ainda
não participa da relação pai e o histórico aceita metadados que podem divergir
do `version/status` corrente do ticket. O recorte desta correção é somente uma
migration Drizzle aditiva, journal, declarações de persistência e assertions de
governança; a FK será `NOT VALID` para preservar legado, e não haverá alteração
de `0037`, actor/correlation, aplicação ou claims live.

**Fechamento local 2026-08-24 (FEEDBACK-HISTORY-053 / P1-integrity):** a
correção foi implementada sem commit em
`packages/persistence/drizzle/0038_feedback_ticket_history_integrity.sql`, no
journal e no schema Drizzle. A FK composta `(ticket_id, scope_id)` mantém
`ON DELETE RESTRICT` e `NOT VALID`; o trigger `BEFORE INSERT` exige o pai no
mesmo escopo, `ticket_version/status` correntes e o shape existente de
`CRIADO`/`STATUS_ALTERADO`. `0037` append-only/RLS, aplicação e
actor/correlation permanecem intocados. RED/ GREEN focal, typecheck,
`verify:migrations` 39/39 e Prettier passaram; sem evidência live e sem claim
de produção. Tickets legados sem histórico e rows antigos não recebem
backfill.

**Fechamento operacional 2026-08-24 (FEEDBACK-HISTORY-053 / audit-context):**
o hardening foi consolidado no commit
`06b8f3720a9841d6d2335e51b28a8eb156a9191f`. API, aplicação e persistência
propagam `actorId`, `requestId` e `correlationId` server-owned; cada criação ou
transição grava uma entrada metadata-only em `audit_entries` na mesma transação
do ticket e do evento. A integração configurada agora verifica histórico,
auditoria e rollback; segue skipped sem `CVG_TEST_DATABASE_URL`. A verificação
local passou com cobertura 84,28% statements / 80,15% branches / 86,15%
functions / 84,99% lines, build de 12 workspaces, lint, typecheck, 31/31 E2E,
39/39 migrations, gates documentais e audit de dependências. Permanece
`COMPLETED_WITH_GAPS`: sem PostgreSQL live, RLS/grants efetivos, produção,
workflow remoto same-SHA ou aprovação clínica não há claim de release.

**Fechamento da crítica independente 2026-08-24 (FEEDBACK-HISTORY-053):**
Wegener retornou `CONDITIONAL PASS`, sem P0, mas encontrou P1 na origem do
correlation ID, na linhagem `from_status`/`CRIADO → NOVO`, no `TRUNCATE` amplo do
fixture live e na ausência de asserts de IDs exatos. O commit
`4680675555aac40246b80bc8ef099a7b2252ebfb` corrigiu os gaps codificáveis:
correlation de feedback usa o request ID gerado pelo servidor, migration
`0039` valida a linhagem de eventos novos, cleanup é filtrado por
ticket/escopo e os IDs de auditoria são assertados. A rodada passou com
665 testes, coverage 84,28% / 80,13% / 86,14% / 84,99%, build, lint, typecheck,
31/31 E2E e 40/40 migrations. O banco live continua ausente; por isso o item
permanece `COMPLETED_WITH_GAPS` e não há claim de produção.

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
- próxima ação: release traceability passou em worktree limpo no commit de implementação `7ac18365998b1bdd5ff1f2600c783b1352c42f03` + documentação `d62e513`; quando houver ambiente autorizado executar live PostgreSQL e, localmente, escolher fila interna de decisão/recálculo ou filtros/paginação/exportação

### APPEAL-037 — Fila interna de revisão de contestação

- título: permitir a consulta interna, redigida e escopada dos protocolos de contestação
- descrição: materializar a leitura de protocolos por um escopo explícito, com filtro opcional de status, limite máximo 100 e ordenação determinística; a rota não atribui revisor, decide, recalcula, notifica, publica ou altera qualquer estado
- módulo: contestação / revisão interna / contratos / persistência / API / web
- dependência: `APPEAL-036`; estado `AppealState`; capability `REVIEW_APPEAL`; contexto RLS transacional separado do contexto de participante
- fase: BUILD — Phase 3–5 / governança de contestação
- risco: crítico — justificativa e identidade interna são dados sensíveis; leitura cruzada de escopo ou exposição de resposta/gabarito pode comprometer a revisão independente
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-061`; `PRD-RF-064`; `PRD-RF-065`; `PRD-RF-080`; `PRD-RF-102`; UC-018; RN-064; SPEC-0106; SPEC-0107; SPEC-0111
- critério de pronto: RED/GREEN/REFACTOR para query strict, status/limite, capability, isolamento por escopo, ordenação dueAt/createdAt/id, projeção allowlisted, contexto RLS dedicado, ausência de mutação, testes HTTP/persistência/aplicação, E2E/axe se houver superfície, full regression, traceability e release gate limpo
- projeção interna permitida: `appealId`, `participantId`, `attemptId`, `itemId`, `justification`, `createdAt`, `dueAt`, `status`, `version`, `reviewerId` opcional e `decision` opcional
- projeção proibida: `answer`, `response`, `score`, `answerKey`, `sourceRefs`, `prompt`, rubrica interna, claim de competência prática ou qualquer payload de conteúdo autoral; decisão e recálculo continuam fora desta fatia
- evidência: `BRIEFING/04.AUDIT/0515_appeal_review_queue_audit.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0106_contratos_de_aplicacao.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0107_contratos_de_api.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0111_permissoes_governanca_e_auditoria.md`; `packages/contracts/src/appeal-review-queue.ts`; `packages/application/src/appeal-review-queue-use-cases.ts`; `packages/persistence/src/appeal-review-queue-repository.ts`; `packages/persistence/drizzle/0022_appeal_review_queue_rls.sql`; `apps/api/src/http.ts`; `apps/web/app/operations/page.tsx`
- testes: `packages/contracts/src/appeal-review-queue.test.ts`; `packages/application/src/appeal-review-queue-use-cases.test.ts`; `packages/persistence/src/appeal-review-queue-repository.test.ts`; `packages/persistence/src/security-context.test.ts`; `apps/api/src/http.test.ts`; `apps/api/src/server.test.ts`; `tests/integration/postgres-appeal-review-queue.test.ts`; `tests/e2e/operations-dashboard.spec.ts`
- resultado: query strict e projeção allowlisted passam; `REVIEW_APPEAL` exige staff ativo e escopo; persistência usa contexto RLS dedicado, seleciona apenas metadados de `appeals` e ordena por prazo/criação/id; a rota interna e a UI são somente leitura, sem conteúdo protegido; foco 6 arquivos/78 testes, `pnpm verify` 106/508 com 26 skips, build 12 workspaces, E2E completo 22/22, integração configurada 8 arquivos/20 testes PASS com 24 arquivos/26 skips, audit de dependências sem vulnerabilidades e migration 23/23 passaram
- gaps explícitos: prova PostgreSQL/RLS live sem `CVG_TEST_DATABASE_URL`, atribuição humana, justificativa da decisão, recálculo versionado, preservação de versões, identificação/notificação, auditoria operacional consultável, entrega externa, provider/MFA, aprovação clínica, piloto e operação de produção
- próxima ação: disponibilizar `CVG_TEST_DATABASE_URL`/role autorizada para executar a prova PostgreSQL/RLS da fila ou selecionar a próxima lacuna local; não simular o live ausente

### APPEAL-038 — Transição interna segura de contestação

- título: permitir autoatribuição, decisão versionada e marcação controlada de recálculo pendente por revisor autenticado
- descrição: endurecer a rota interna de contestação para que o cliente não forneça `participantId` nem `reviewerId`; o ator autenticado é o único revisor usado na atribuição, somente o revisor atribuído decide ou solicita recálculo, e a persistência atualiza apenas a allowlist de estado da contestação sob contexto RLS dedicado
- módulo: contestação / revisão interna / contratos / persistência / API / segurança
- dependência: `APPEAL-037`; `AppealState`; capability `REVIEW_APPEAL`; migration 0022 e contexto `cvg.appeal_review_scope_id`
- fase: BUILD — Phase 3–5 / governança de contestação
- risco: crítico — identidade de participante não pode ser escolhida pelo revisor, decisão não pode ser feita por ator não atribuído e nenhum protocolo pode ser encerrado sem o recálculo real
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-061`; `PRD-RF-064`; `PRD-RF-065`; `PRD-RF-080`; `PRD-RF-102`; UC-018; RN-064; SPEC-0106; SPEC-0107; SPEC-0111
- critério de pronto: RED/GREEN/REFACTOR para contrato strict sem identidades confiadas do cliente, ator atribuído, versão otimista, update allowlisted, RLS de leitura/escrita dedicada, bloqueio de encerramento sem recálculo, HTTP matrix, persistência/application tests, integração live quando autorizada, full regression, audit, traceability e release gate
- escopo desta fatia: `ATRIBUIR_REVISOR` usa o `principalId` autenticado; `DECIDIR` e `SOLICITAR_RECALCULO` exigem o revisor atribuído; a última ação somente move para `RECALCULO_PENDENTE` e não altera nota, tentativa ou resultado
- fora desta fatia: justificativa persistida, motor/worker de recálculo versionado e idempotente, snapshot/versões anteriores, encerramento, notificação/identificação de afetados, trilha de auditoria consultável, provider/MFA, aprovação clínica, piloto e produção
- evidência: `BRIEFING/04.AUDIT/0516_appeal_review_transition_audit.md`; commit `91bd3e0`; `packages/contracts/src/learning-state.ts`; `packages/application/src/appeal-review-transition-use-cases.ts`; `packages/persistence/src/appeal-review-transition-repository.ts`; migration `0023_appeal_review_transition_rls.sql`; `apps/api/src/http.ts`; testes de contrato/application/persistência/HTTP e `tests/integration/postgres-appeal-review-transition.test.ts`; `pnpm verify`, build, E2E, integração configurada, audit e migration gate
- resultado: contrato strict aceita somente escopo, versão e as três ações allowlisted; o actor vem da sessão, o revisor atribuído é obrigatório para decidir/solicitar recálculo, optimistic locking e allowlist de colunas passam; o domínio não permite `DECIDIDA → ENCERRADA` direto, o use case legado foi removido e a policy do participante não autoriza UPDATE; `pnpm verify` passou com 109/522 e 27 skips, cobertura 84,69%/80,62%/85,81%/85,40%, build 12 workspaces e E2E 22/22
- gaps remanescentes: prova PostgreSQL/RLS live sem `CVG_TEST_DATABASE_URL`/role autorizada; justificativa da decisão, recálculo versionado/idempotente, snapshots/preservação de versões, `CONCLUIR_RECALCULO`, notificação/identificação de afetados, auditoria operacional consultável, provider/MFA, aprovação clínica, piloto e produção
- próxima ação: executar APPEAL-039 para exigir rationale e metadados server-side da decisão; manter a prova PostgreSQL/RLS live como gap sem simulação

### APPEAL-039 — Rationale e metadados auditáveis da decisão de contestação

- título: exigir justificativa interna bounded e persistir correlação/data da decisão do revisor
- descrição: completar o núcleo formal de `DECIDIR` sem recalcular nota, alterar tentativa, publicar aprovação ou encerrar; o rationale é validado server-side, interno e nunca exposto ao participante
- módulo: contestação / governança / contratos / persistência / API / segurança
- dependência: `APPEAL-038`; `PRD-RF-064`; `UC-018`; `RN-052`; `RN-067`; SPEC-0104/0106/0107/0111
- fase: BUILD — Phase 3–5 / governança de contestação
- risco: crítico — decisão sem justificativa bounded ou metadados de correlação enfraquece a revisão independente e a rastreabilidade
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN/REFACTOR para rationale strict obrigatório em `DECIDIR`, data/correlação geradas pelo servidor, persistência allowlisted/versionada, fila interna allowlisted, projeção participante inalterada, HTTP/persistência/application tests, regressão, auditoria, traceability e release gate
- escopo desta fatia: `DECIDIR` exige texto simples bounded; o servidor registra `decisionAt` e `decisionCorrelationId`; a fila interna pode ler apenas esses metadados allowlisted; nenhuma identidade, rationale ou correlação entra na projeção participante
- fora desta fatia: histórico append-only separado, snapshots, recálculo versionado/idempotente, alteração de nota/tentativa/resultado, notificação, `CONCLUIR_RECALCULO`, encerramento, provider/MFA, aprovação clínica, piloto e produção
- evidência local: `BRIEFING/04.AUDIT/0517_appeal_decision_rationale_audit.md`; commit técnico `3d11112`; `pnpm verify` 113/532 com 27 skips, cobertura 84,64%/80,71%/85,85%/85,33%, build 12 workspaces, E2E 22/22, migration 25/25 e integração configurada 8/20 com 25 arquivos/27 skips
- gaps remanescentes: duas tentativas de crítica independente read-only terminaram sem relatório; PostgreSQL/RLS live sem `CVG_TEST_DATABASE_URL`, backfill/validação de decisões legadas por migration `NOT VALID`, histórico append-only, snapshots, recálculo versionado/idempotente, nota/tentativa/resultado, notificação, `CONCLUIR_RECALCULO`, encerramento, provider/MFA, aprovação clínica, piloto e produção
- próxima ação: obter ambiente/autoridade para PostgreSQL/RLS live e backfill/validação de registros legados, ou selecionar a próxima lacuna local; não promover ausência de crítica, gap live, backfill ou histórico append-only a PASS

### REPORT-040 — Paginação e exportação do relatório de participação digital

- título: permitir acompanhamento de equipes maiores sem ampliar escopo ou prometer CPD
- descrição: evoluir `CPD-REPORTING-026` com paginação server-side bounded, metadados de página, tabela interna de participantes e exportação CSV somente da página autorizada já carregada
- módulo: gestão educacional / métricas / API / persistência / web
- dependência: `CPD-REPORTING-026`; autorização `VIEW_PROGRAM_METRICS`; contrato de projeção interna; catálogo digital
- fase: BUILD — Phase 5 / acompanhamento gerencial
- risco: alto — paginação não pode alterar o resumo global, atravessar escopos, expor campos internos ao participante ou introduzir fórmula CSV executável
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-070`; `PRD-RF-073`; `PRD-RF-074`; `UC-016`; `SPEC-0107`; `SPEC-0111`; `SPEC-0114`; `SPEC-0118`
- critério de pronto: RED/GREEN/REFACTOR em contrato, aplicação, persistência e HTTP; página limitada a 100 registros; resumo global separado das linhas; controles acessíveis; CSV com escape e proteção contra fórmula; E2E/axe e regressão completa
- escopo: `page` 1–10.000 e `pageSize` 1–100; default de aplicação 1/25; `totalParticipants`, `totalPages` e `hasNextPage`; consulta permanece dentro do contexto PostgreSQL do escopo; exportação ocorre no navegador para a página visualizada
- evidência: `BRIEFING/04.AUDIT/0518_report_pagination_audit.md`; commit `6fa662b`; `packages/contracts/src/continuing-education-report.ts`; `packages/application/src/continuing-education-report-use-cases.ts`; `packages/persistence/src/continuing-education-report-repository.ts`; `apps/api/src/http.ts`; `apps/web/app/operations/page.tsx`; testes de contrato/application/persistência/API e `tests/e2e/operations-dashboard.spec.ts`
- resultado: a equipe visualiza resumo global, módulos, participantes paginados, navegação anterior/próxima e download `cvg-participacao-digital-pagina-N.csv`; o CSV escapa aspas/quebras de linha e prefixa valores iniciados por `=`, `+`, `-` ou `@`; nenhum ID interno, gabarito, resposta, fonte ou claim clínico entra na superfície
- verificação local: `pnpm verify` passou com 113 arquivos/534 testes/27 skips explícitos; cobertura 84,64% statements, 80,77% branches, 85,85% functions e 85,34% lines; build dos 12 workspaces; E2E operations 5/5 com axe; migration, secrets, traceability, architecture, documentation, product-definition e exposure gates passaram; `git diff --check` limpo
- gaps remanescentes: paginação ainda agrega em memória após leitura escopada e não é prova de carga; exportação é da página, não relatório assíncrono completo; prova PostgreSQL/RLS live do recorte depende de ambiente autorizado; coorte/área/nível, CPD acreditado, certificado, ranking, integração externa e competência prática continuam fora
- próxima ação: validar o SHA em workflow remoto autorizado ou selecionar a próxima lacuna local — diagnóstico→trilha adaptada, contestação completa, filas/lembranças internas ou hardening operacional — sem liberar gates clínicos

### APPEAL-040 — Recálculo local idempotente de `MANTER_RESULTADO`

- título: preservar a tentativa anterior, gerar uma nova versão imutável e encerrar a contestação somente depois de um recálculo bounded concluído
- descrição: fechar uma única decisão segura da contestação com histórico append-only, outbox transacional e worker replay-safe; o recálculo repete o resultado vigente sem alterar score/outcome/feedback e não afirma competência clínica
- módulo: contestação / recálculo / histórico / worker / persistência
- dependência: `APPEAL-039`; `PRD-RF-064`; `PRD-RF-065`; `PRD-RF-080`; `UC-018`; `SPEC-0106`; `SPEC-0107`; `SPEC-0110`; `SPEC-0111`
- fase: BUILD — Phase 3–5 / governança de contestação
- risco: crítico — retry não pode duplicar versão, encerrar antes da escrita ou permitir que decisões ainda não implementadas alterem resultado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN/REFACTOR para transição, histórico, outbox, versão imutável, idempotência/replay, worker e ausência de exposição pública; migration e regressão completas
- escopo desta fatia: `SOLICITAR_RECALCULO` somente para `MANTER_RESULTADO`; histórico interno append-only da transição; evento `appeal.recalculation.requested.v1`; nova linha de `assessment_results` com mesmo score/outcome/feedback e regra bounded; `CONCLUIR_RECALCULO` somente após a nova versão existir; reprocessamento sem duplicar resultado
- fora desta fatia: `ANULAR_ITEM`, `ALTERAR_RESULTADO`, alteração de resposta/tentativa, recomputação clínica, notificação, identificação de afetados, provider/MFA, PostgreSQL/RLS live, workflow remoto, piloto e produção
- evidência: `BRIEFING/04.AUDIT/0519_appeal_recalculation_audit.md`; commit técnico `c57c8ca095019fb0715a75b5c595b50df25fd8eb`; código em `packages/domain`, `packages/application`, `packages/persistence`, `apps/worker`; testes unitários, aplicação, persistência, worker e integração configurada
- resultado local: RED observado antes da implementação; GREEN focado 5 arquivos/32 testes; `pnpm verify` 115 arquivos/541 testes/28 skips, cobertura 84,53%/80,49%/85,83%/85,22%; `pnpm build` 12 workspaces; `pnpm test:e2e` 22/22; `pnpm test:integration` 8 arquivos/20 testes PASS e 26 arquivos/28 testes SKIPPED; migration 26/26; gates de secrets, traceability, architecture, documentation, product-definition, exposure e diff-check limpos
- gaps conhecidos: ambiente live/RLS e workflow remoto ainda ausentes; decisão clínica, conteúdo B-07/M02 e operação real continuam atrás de revisão humana
- gaps remanescentes: PostgreSQL/RLS live, workflow remoto, concorrência real entre workers, observabilidade/retention/restore, `ANULAR_ITEM`, `ALTERAR_RESULTADO`, notificação, alteração de tentativa/resposta, recomputação clínica, provider/MFA, piloto e produção
- próxima ação: obter ambiente/autoridade para prova live e selecionar a próxima lacuna local — diagnóstico→trilha adaptada, contestação completa, filas/lembranças internas ou hardening operacional — sem promover ausência de crítica independente a PASS

### FEEDBACK-041 — Relato e acompanhamento de feedback do participante

- título: permitir que o participante relate bug, erro de conteúdo, usabilidade ou melhoria e acompanhe somente seus próprios tickets
- descrição: fechar a superfície web do UC-022 sobre o backend de feedback já persistido; a criação aceita texto simples, o servidor deriva o escopo da sessão quando possível, a leitura retorna projeção allowlisted e nenhum campo de identidade ou operação interna atravessa a fronteira pública
- módulo: feedback / jornada participante / contratos / API / persistência / web
- dependência: `UC-022`; `UC-023`; `SPEC-0107`; `SPEC-0111`; `FEEDBACK_TICKETS` existente em `learning-state`
- fase: BUILD — Phase 3–5 / jornada de produto
- risco: alto — relato não pode atravessar escopo, expor dados internos, aceitar HTML ou prometer canal externo/SLA não contratado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN/REFACTOR para contrato opcional server-derived, listagem própria, persistência/RLS por escopo, HTTP, formulário acessível, estados loading/empty/error/retry, E2E sintético, regressão, traceability e release gate
- escopo desta fatia: `GET /api/v1/feedback` e `POST /api/v1/feedback` para participante autenticado; tipos `BUG_TECNICO`, `USABILIDADE`, `ERRO_CONTEUDO`, `MELHORIA` e `CONTESTACAO`; máximo bounded de 100 tickets; escopo enviado pelo cliente não é confiado e, quando omitido, é derivado somente de sessão participante de escopo único
- fora desta fatia: canal de e-mail/chat, notificações, anexos, dados clínicos reais, integração externa, decisão de suporte, SLA operacional, triagem automática, provider/MFA, PostgreSQL/RLS live, workflow remoto, piloto e produção
- evidência: `BRIEFING/04.AUDIT/0520_feedback_participant_audit.md`; commit técnico `568c9efd12ff27d56e4b5edf1ee4c4922fe0d55f`; contratos, aplicação, persistência, API, web, testes HTTP e E2E
- resultado local: RED observado antes da implementação; GREEN focado 4 arquivos/69 testes; `pnpm verify` passou com 117 arquivos/544 testes/26 skips de arquivos/28 skips de testes, cobertura 84,47%/80,45%/85,80%/85,20%; `pnpm build` 12 workspaces; `pnpm test:e2e` 23/23; `pnpm test:integration` 8 arquivos/20 testes PASS e 26 arquivos/28 testes SKIPPED; contracts 24/66; worker 4/25; migrations 26/26; audit sem vulnerabilidades conhecidas; gates de secrets, traceability, architecture, documentation, product-definition, exposure e diff-check limpos
- gaps conhecidos: múltiplos escopos exigirão seleção server-side explícita; triagem/moderação, resposta ao participante, notificações, operação de suporte, prova live/RLS, restore/retention e workflow remoto continuam fora da fatia
- próxima ação: implementar consulta interna read-only, bounded e escopada do histórico append-only de apelações, sem projetá-lo ao participante

### APPEAL-042 — Timeline interna do histórico append-only de apelações

- título: permitir que revisor autorizado consulte a linha do tempo interna de uma contestação
- descrição: fechar a lacuna de leitura do histórico já persistido em `appeal_review_history`, com contrato interno estrito, contexto de escopo e timeline operacional sem qualquer mutação
- módulo: apelação / revisão interna / contratos / API / persistência / operações web
- dependência: `APPEAL-040`; `UC-018`; `SPEC-0106`; `SPEC-0107`; `SPEC-0111`; migration `0025_appeal_recalculation_history`
- fase: BUILD — Phase 3–5 / governança operacional
- risco: alto — IDOR entre escopos, vazamento de rationale/revisor/correlação e confusão entre consulta histórica e decisão clínica
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN/REFACTOR para contrato interno bounded, leitura por `appealId` + escopo, 401/403/404/422, query read-only com contexto de revisão, timeline acessível, E2E sintético, regressão, traceability e release gate — cumprido localmente
- escopo desta fatia: `GET /api/v1/internal/appeals/:appealId/history`, limite máximo de 100 eventos, ordenação determinística por versão/data/ID, acesso somente a `REVIEW_APPEAL` no escopo autorizado
- fora desta fatia: decisão, atribuição, recálculo, anulação, alteração de resultado, notificação, resposta ao participante, publicação, dados clínicos reais, PostgreSQL/RLS live, workflow remoto, piloto e produção
- evidência: `BRIEFING/04.AUDIT/0521_appeal_history_timeline_audit.md`; commits técnicos `ba81a75f13df9bb1af5a753d423270ce452050df` e `e45b4677d651322e49fa1b2416dc0130c8778ee5`; contrato, aplicação, persistência, HTTP, operations web, testes de integração configurada e E2E
- resultado local: RED observado antes da implementação; GREEN focado 4 arquivos/68 testes; `pnpm verify` no HEAD final 120 arquivos/552 testes/26 skips de arquivos/28 skips de testes, cobertura 84,52%/80,36%/85,96%/85,22%; build 12 workspaces; E2E 23/23; integração 8 arquivos/20 testes PASS e 26 arquivos/28 testes SKIPPED; contratos 25/68; worker 4/25; migrations 26/26; audit sem vulnerabilidades conhecidas; gates de secrets, traceability, architecture, documentation, product-definition, exposure e diff-check limpos
- gaps conhecidos: as duas solicitações de crítica read-only independente expiraram sem relatório; prova live/RLS, grants, concorrência, observabilidade/retention/restore e operação remota seguem dependentes de ambiente/autoridade
- próxima ação: selecionar e abrir uma próxima lacuna local bounded — triagem interna de feedback, fila/lembranças ou hardening operacional — sem ampliar a projeção participante nem declarar o produto 100% concluído

### FEEDBACK-043 — Fila interna bounded de triagem de relatos

- título: permitir que moderador ou administrador consulte relatos autorizados e aplique somente transições de triagem já existentes
- descrição: materializar a leitura interna ausente do feedback participante, com query estrita por escopo/status/limite, projeção allowlisted e operação web com estados explícitos; reutilizar o comando de transição versionado sem aceitar identidade ou escopo fora da sessão
- módulo: feedback / triagem interna / contratos / aplicação / persistência / API / operações web
- dependência: `FEEDBACK-041`; `UC-023`; `PRD-RF-072`; `PRD-RF-073`; `PRD-RF-103`; `PRD-RF-104`; `SPEC-0105`; `SPEC-0106`; `SPEC-0107`; `SPEC-0111`; `SPEC-0114`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / governança operacional
- risco: alto — IDOR por escopo, vazamento de relato ao participante, transição fora da máquina de estados e falso encerramento de suporte
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN/REFACTOR para query bounded interna, capability server-side, contexto RLS de escopo, projeção strict, 401/403/422, estados loading/empty/error/retry, transição com versão otimista, cursor HMAC bound a escopo/status/limite, keyset `limit + 1`, metadados HTTP, navegação anterior/próxima, E2E sintético, regressão, traceability e release gate
- escopo desta fatia: `GET /api/v1/internal/feedback?scopeId=<uuid>&status=<status>&cursor=<opaque>&limit=<1..100>`; filtro opcional por status; projeção de ticket sem anexos ou dados clínicos; ações UI para eventos permitidos pelo estado, usando `PATCH /api/v1/internal/feedback/:ticketId`; retry e transições preservam somente a consulta ainda vigente
- fora desta fatia: prioridade, atribuição a responsável, resposta ao participante, notificações, alerta/retirada clínica, SLA, anexos, provider/MFA, PostgreSQL/RLS live, workflow remoto, piloto e produção
- evidência: `BRIEFING/04.AUDIT/0536_feedback_queue_pagination_audit.md` e `BRIEFING/04.AUDIT/0522_feedback_triage_queue_audit.md`; commit técnico `ea9ee122676be620652f08019919ca59ed05fa02`; contrato, aplicação, persistência, migration 0040, HTTP, operations web, testes negativos/concurrentes e E2E
- resultado local: RED observado antes da implementação; GREEN focal inicial 80/80; crítica Goodall `CONDITIONAL PASS` sem P0, com os dois P1 de retry/race web reproduzidos e corrigidos; coverage 134 arquivos PASS/29 SKIPPED, 667 testes PASS/35 SKIPPED e 84,24%/80,14%/86,20%/84,95%; build 12 workspaces; operations E2E 5/5; E2E completa 31/31; contratos 28/81; worker 4/27; migrations 41/41; audit high sem vulnerabilidades conhecidas; lint, typecheck, formato, CI contract, secrets, architecture, documentation, product-definition, exposure e diff-check limpos
- gaps conhecidos: a fila continua somente leitura/transição de estado; prioridade, atribuição, resposta e SLA exigem contrato/migration separados; keyset não fornece snapshot consistente nem total count, e esses limites permanecem explícitos
- gaps de assurance: prova PostgreSQL/RLS/grants/owner, plano real, concorrência live, observabilidade/retention/restore, browser→API→PostgreSQL, workflow remoto same-SHA, operação produtiva e aprovação clínica seguem dependentes de ambiente/autoridade
- próxima ação: abrir a próxima lacuna local bounded — preview de impacto para `ANULAR_ITEM` em `APPEAL-043` — sem declarar o produto 100% concluído

**Abertura operacional 2026-08-24 (FEEDBACK-043 / cursor-pagination):** a
próxima fatia local bounded foi aberta para remover o limite único da fila sem
inventar workflow de suporte. O contrato será cursor-based/keyset, com cursor
assinado e vinculado a escopo/status/limite, `limit + 1`, metadados HTTP e
navegação anterior/próxima na operations web. Prioridade, assignment, SLA,
resposta, notificação e histórico dedicado continuam fora deste recorte.

**Fechamento operacional 2026-08-24 (FEEDBACK-043 / cursor-pagination):** o
commit `ea9ee122676be620652f08019919ca59ed05fa02` entregou contrato strict,
cursor HMAC, binding, keyset, índices `0040`, meta HTTP, retry seguro e proteção
contra reload tardio após troca de filtro/escopo. O critic independente encontrou
dois P1 web; ambos foram cobertos por E2E sintético e corrigidos antes do
fechamento. A fatia está `COMPLETED_WITH_GAPS`: a evidência local está verde,
mas não há claim live/produtivo.

### APPEAL-043 — Preview interno de impacto para `ANULAR_ITEM`

- título: permitir que o revisor veja o impacto técnico mínimo de uma decisão candidata sem executar a decisão
- descrição: consultar, por `appealId`, o protocolo e os agregados já persistidos da tentativa para informar referências bounded do alvo e a disponibilidade/versionamento do resultado; declarar explicitamente que `ANULAR_ITEM` não possui recálculo automático nesta fatia
- módulo: apelação / revisão interna / avaliação versionada / contratos / API / persistência
- dependência: `APPEAL-040`; `APPEAL-042`; `UC-018`; `PRD-RF-064`; `PRD-RF-065`; `PRD-RF-080`; `SPEC-0104`; `SPEC-0106`; `SPEC-0107`; `SPEC-0111`
- fase: BUILD — Phase 3–5 / governança de contestação
- risco: crítico — um preview não pode ser confundido com decisão, alterar nota/tentativa, prometer recálculo ou vazar resposta, gabarito, fonte ou competência prática
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: contrato GET interno strict e read-only; `REVIEW_APPEAL` server-side; escopo derivado da linha persistida e conferido contra os escopos autorizados; fatos bounded da contestação/tentativa/resultado; `ANULAR_ITEM` como candidato explícito; `automaticMutation=NONE`, `scoreImpact=NOT_COMPUTED`, `recalculation=NOT_AVAILABLE_IN_THIS_SLICE`; 401/403/404/409/422/500; nenhum write de estado, resultado, outbox, histórico ou auditoria; query `REPEATABLE READ` com linhagem explícita pela atividade; testes focalizados, regressão e gates — cumprido localmente
- escopo desta fatia: preview de um único `appealId`, sem `scopeId` fornecido pelo cliente; referências internas necessárias para a revisão, status/version da apelação e da tentativa, presença/version do resultado mais recente e limites operacionais; resultado não contém score, outcome, feedback, resposta, gabarito, fonte, rationale ou competência prática
- fora desta fatia: `DECIDIR`, `SOLICITAR_RECALCULO`, execução de `ANULAR_ITEM`, alteração de resposta/tentativa/resultado, fórmula ou score projetado, criação de remediação/notificação, publicação, decisão clínica, snapshot/impacto acadêmico persistido, workflow remoto, PostgreSQL/RLS live, provider/MFA, piloto e produção
- evidência: `BRIEFING/04.AUDIT/0537_appeal_decision_impact_preview_audit.md`; commit funcional `2277a32cb2a88345903d7fd5a54b13f1da629601`; contrato, aplicação, persistência, HTTP, template de telemetria, operations web, testes negativos e E2E concorrente
- resultado local: RED observado antes da implementação; GREEN focal final 5 arquivos/94 testes; coverage 137 arquivos PASS/29 SKIPPED, 678 testes PASS/35 SKIPPED, 84,44%/80,40%/86,39%/85,15%; build 12 workspaces; operations E2E 6/6; E2E completa 32/32; contratos 29/83; worker 4/27; migrations 41/41; lint, typecheck, formato, secrets, CI contract, architecture, product-definition, exposure e audit high limpos
- crítica independente Carver: P1/P2 de acoplamento feedback, race de escopo/filtro, linhagem dependente de RLS, snapshot, estado terminal, template de rota e query duplicada foram corrigidos; a prova E2E da resposta antiga atrasada passou
- gaps conhecidos: não há PostgreSQL/RLS/grants/owner live, concorrência real, browser→API→PostgreSQL, workflow remoto same-SHA, produção, restore/failover, provider/MFA ou aprovação clínica/piloto; nenhuma migration foi necessária
- próxima ação: executar os gates documentais finais e selecionar a próxima lacuna local bounded sem declarar o produto 100% concluído

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

### ADAPTIVE-044 — Atribuição adaptativa derivada do diagnóstico formativo

- título: materializar a conclusão diagnóstica em uma trilha inicial persistida, segura e acionável
- descrição: após um resultado B-07 sintético já persistido, derivar no servidor o participante e o escopo, combinar o conjunto obrigatório da onda piloto com `recommendedModuleIds`, criar ou atribuir `learning_assignments` sem duplicidade e deixar a jornada participante calcular a próxima ação; a atribuição não altera nota, gabarito, publicação, competência prática ou autonomia clínica
- módulo: diagnóstico / currículo / aprendizagem / contratos / aplicação / persistência / API / web
- dependência: `DIAGNOSTIC-PROFILE-023`; `LEARNING-PROFILE-2026-08-23`; `TRAINING-MANAGEMENT-2026-08-23`; `UC-001`; `UC-002`; `PRD-RF-012`; `PRD-RF-015`; `PRD-RF-021`; `PRD-RF-022`; `PRD-RN-010`; `PRD-RN-013`; `PRD-RN-014`; `PRD-RN-017`; `PRD-RN-072`; `PRD-RN-090`; `SPEC-0105`; `SPEC-0106`; `SPEC-0107`; `SPEC-0109`; `SPEC-0110`; `SPEC-0111`; `SPEC-0114`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / jornada adaptativa
- risco: crítico — uma atribuição pode atravessar escopos, dispensar núcleo obrigatório, duplicar progresso ou expor identificadores internos se a identidade vier do cliente
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED antes do código; comando recebe somente `diagnosticResultId` e `scopeId` resolvidos na operação interna, reidrata o resultado no PostgreSQL, deriva identidade server-side, aplica allowlist determinística do núcleo da onda e recomendações, preserva estados existentes, é idempotente sob replay, usa contexto RLS transacional, retorna projeção allowlisted, cobre 401/403/404/422/409, integração live quando `CVG_TEST_DATABASE_URL` estiver disponível, E2E sintético, exposição, traceability e regressão
- escopo: conclusão diagnóstica persistida → assignments `ATRIBUIDO` para a onda inicial + recomendações → path/next action participante; a tabela existente e o índice único participante/escopo/módulo são reutilizados; migration só será criada se a prova revelar necessidade de origem/versionamento
- fora desta fatia: publicação clínica ou aplicação real B-07; dispensa automática; resultado, nota, gabarito, rubrica, fontes ou objetivos internos; remediação/retensão completas; notificações; CPD acreditado; prática presencial; provider/MFA; grants produtivos; workflow remoto; carga/failover/restore operacional
- controles obrigatórios: `participantId` não entra no novo comando; o resultado é buscado por `diagnosticResultId + scopeId`; escopo/membership são verificados na borda autorizada; recomendação nunca remove módulo obrigatório; replay não cria segunda linha; estado `NAO_ATRIBUIDO` existente só avança por regra de domínio; conteúdo clínico continua atrás de Ricardo
- evidência: `BRIEFING/04.AUDIT/0523_adaptive_assignment_audit.md`; `.agent/plans/2026-08-24-production-mvp-gauntlet.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0106_contratos_de_aplicacao.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0107_contratos_de_api.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0109_dados_e_persistencia.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0111_permissoes_governanca_e_auditoria.md`; traceability item `ADAPTIVE-044`
- código: `packages/application/src/adaptive-assignment-use-cases.ts`; `packages/persistence/src/adaptive-assignment-repository.ts`; `packages/persistence/src/diagnostic-result-repository.ts`; `packages/contracts/src/learning-state.ts`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/api/src/server.ts`
- testes: `packages/application/src/adaptive-assignment-use-cases.test.ts`; `packages/persistence/src/adaptive-assignment-repository.test.ts`; `packages/contracts/src/learning-state.test.ts`; `apps/api/src/http.test.ts`; `apps/api/src/server.test.ts`; `tests/integration/postgres-adaptive-assignment.test.ts`
- resultado: a conclusão B-07 persistida materializa `M01`/`M02`/`M11` obrigatórios mais recomendações válidas em `ATRIBUIDO`; identidade e disponibilidade vêm do PostgreSQL; replay sequencial não duplica; promoção de `NAO_ATRIBUIDO` usa domínio + CAS; a rota interna rejeita identidade do cliente e a projeção remove `participantId` e campos editoriais; RED/GREEN, cobertura global, build, E2E 23/23, contratos, worker, migrations, exposure e documentação passaram localmente
- gaps explícitos: o teste PostgreSQL/RLS live foi skipped por ausência de `CVG_TEST_DATABASE_URL`; CTA/deep link de módulo, feedback/debrief/remediação/retensão completos, concorrência live, grants produtivos, observabilidade externa, publicação clínica, aplicação real do B-07, piloto e release continuam pendentes
- próxima ação: ligar a atribuição persistida a uma ação de módulo na jornada participante e fechar feedback/debrief; manter live RLS, gates clínicos e hardening operacional como dependências explícitas

### JOURNEY-045 — CTA e deep link da atividade na jornada participante

- título: tornar a atividade atribuída acionável sem perder a sessão do participante
- descrição: projetar uma única ação explícita para a próxima atividade já autorizada na jornada, com alvo escolhido no servidor; selecionar a atividade client-side usando o fluxo existente, atualizar `?activityId` como ponteiro deep link e manter a superfície sem `participantId`, `scopeId`, gabarito, fontes ou dados editoriais
- módulo: jornada participante / web / acessibilidade / contratos de exposição
- dependência: `ADAPTIVE-044`; `LEARNING-PROFILE-2026-08-23`; `UC-001`; `UC-002`; `PRD-RF-012`; `PRD-RF-015`; `PRD-RF-021`; `PRD-RF-022`; `SPEC-0107`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / jornada de produto
- risco: médio — ação incorreta ou perda de sessão pode impedir retomada; exposição indevida de identidade interna é bloqueador de segurança
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED E2E antes do código; `nextActionTarget` opcional e strict só aponta para uma atividade da projeção e só é emitido para iniciar/retomar; a atividade pode ser aberta a partir da jornada sem novo convite, o query string é atualizado com valor codificado, request permanece server-side e bounded, busy/erro são visíveis, a UI não exibe IDs internos além do ponteiro autorizado, e `pnpm verify`, build, E2E, exposição, documentação, traceability e diff-check passam
- escopo: CTA para atividades presentes em `learning-path`, seleção local, atualização de URL e regressão do fluxo de convite/atividade
- fora desta fatia: novo endpoint, alteração de assignments, feedback/debrief, remediação/retensão completas, conteúdo clínico, prática presencial, provider/MFA, live RLS, grants produtivos, CI remoto, piloto e release
- controles obrigatórios: o servidor é a fonte de `nextAction` e `activityId`; nenhum `participantId`/`scopeId` entra no handler; o identificador é codificado ao atualizar o histórico; atividade fora do alvo autorizado é rejeitada; não usar o cliente para autorizar a leitura
- evidência: `BRIEFING/04.AUDIT/0524_journey_cta_audit.md`; `traceability.yml` / `JOURNEY-045`; SPEC 0107/0114/0118
- código: `packages/application/src/journey-use-cases.ts`; `packages/application/src/index.ts`; `packages/contracts/src/journey.ts`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`; `apps/web/app/globals.css`; `scripts/verify-traceability.mjs`
- testes: `packages/application/src/journey-use-cases.test.ts`; `packages/contracts/src/journey.test.ts`; `apps/api/src/http.test.ts`; `tests/e2e/participant-access.spec.ts`
- resultado: RED observado antes da CTA; alvo server-side, contrato relacional, handler client-side, deep link codificado e restauração de atividade implementados; `pnpm verify` 125/572/29 skips, cobertura 84,51%/80,33%/86,03%/85,23%, build 12 workspaces, integração 8/20 +27/29 skips e E2E 24/24 passaram localmente
- gaps explícitos: assignments ainda não resolvem automaticamente para `activity_assignments`/atividade publicada; live RLS, provenance/atomicidade do diagnóstico→assignment, feedback/debrief/remediação/retensão completos, grants produtivos, observabilidade externa, publicação clínica, piloto e release continuam pendentes
- próxima ação: abrir `RESULT-FEEDBACK-046` para exibir feedback digital persistido e sua próxima ação, sem inventar gabarito ou claim clínico

### JOURNEY-REMEDIATION-048 — CTA segura para remediação digital

- título: tornar a remediação digital acionável a partir da jornada do participante
- descrição: ligar `EXECUTAR_REMEDIACAO` a uma atividade publicada do mesmo módulo somente quando `learningAssignmentId`, escopo e estado iniciável forem explícitos; exigir que todos os itens/versões estejam `PUBLICADO`, corrigir a próxima ação da atividade `EM_REFORCO` sem expor vínculos internos ou transformar a CTA em autorização
- módulo: jornada participante / progresso / remediação / persistência / web
- dependência: `JOURNEY-045`; `JOURNEY-REL-001`; `ACTIVITY-RLS-047`; runtime curricular digital existente
- fase: BUILD — Phase 3–5 / ciclo de aprendizagem
- risco: alto — um alvo errado pode permitir acesso fora do escopo, confundir revisão com retenção ou afirmar uma competência não demonstrada
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN/REFACTOR para módulo correspondente, estados `DISPONIVEL`/`EM_ANDAMENTO`/`EM_REFORCO`, atividade legada sem módulo/proveniência, conteúdo parcialmente não publicado, runtime de retenção sem CTA indevida, tentativa terminal/humana somente leitura, nova tentativa sem estado antigo, contrato público sem vínculos internos, regressão global, documentação e rastreabilidade
- escopo: somente `EXECUTAR_REMEDIACAO`; o alvo é escolhido server-side entre atividades já presentes na jornada e publicadas/autorizadas; retenção permanece sem CTA até existir atividade equivalente própria e consumo de revisão
- fora desta fatia: nova avaliação clínica, prova prática, consumo de `D+7/D+30/D+90`, seleção de itens equivalentes, publicação B-07/M02, aprovação clínica, provider/MFA, operação externa, live RLS e release
- requisitos: `PRD-RF-015`; `PRD-RF-055`; `PRD-RF-070`; `PRD-UC-007`; `SPEC-0106`; `SPEC-0107`; `SPEC-0109`; `SPEC-0114`; `SPEC-0118`; `JOURNEY-09-01`; `AGENTS-TDD`
- evidência: `BRIEFING/04.AUDIT/0531_journey_remediation_cta_audit.md`; `traceability.yml` / `JOURNEY-REMEDIATION-048`; feature inicial `b950825`; hardening `c16c52ea9e80e1ac0a7740c404fe21ff923fdc6d`; correção de item/provenance `de8d8bccbce13e3e4d10597f4b88245ae42601f`
- código: `packages/application/src/journey-use-cases.ts`; `packages/application/src/progress-use-cases.ts`; `packages/application/src/answer-use-cases.ts`; `packages/persistence/src/journey-repository.ts`; `packages/persistence/src/activity-repository.ts`; `packages/persistence/src/answer-repository.ts`; `packages/persistence/src/attempt-repository.ts`; `packages/contracts/src/journey.ts`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`
- testes: `packages/application/src/journey-use-cases.test.ts`; `packages/application/src/progress-use-cases.test.ts`; `packages/application/src/answer-use-cases.test.ts`; `packages/persistence/src/journey-repository.test.ts`; `packages/persistence/src/activity-repository.test.ts`; `packages/persistence/src/answer-repository.test.ts`; `packages/persistence/src/attempt-repository.db.test.ts`; `packages/contracts/src/journey.test.ts`; `apps/api/src/http.test.ts`; `tests/e2e/participant-access.spec.ts`
- resultado: RED inicial 4 falhas; Einstein encontrou 5 P1/P2 e Bacon fechou a rodada local anterior; Hilbert encontrou o P1 de `itemId` fora da atividade e três P2 de provenance/CTA/E2E; Kuhn fez a revisão final como PASS local condicionado, sem P0 funcional. `de8d8bc` adicionou validação server-side em HTTP/aplicação/persistência, compatibilidade participant/module/scope, CTA condicionada a `nextAction` e E2E assertivo da limpeza da justificativa. `pnpm verify` passou com 131 arquivos/634 testes e 27 arquivos/33 testes ignorados; cobertura 84,90%/81,11%/86,41%/85,64%; build 12 workspaces; E2E 28/28; integração 25/33 sem banco CVG; audit high sem vulnerabilidades conhecidas; gates estáticos e documentais passaram
- gaps explícitos: PostgreSQL/RLS live, browser→API→PostgreSQL, concorrência, grants/owners, workflow remoto same-SHA, observabilidade/retention/traces externos, publicação/revisão clínica, piloto, fluxo completo de retenção e release continuam pendentes
- próxima ação: executar a prova live em ambiente CVG descartável/autorizado e submeter M02/B-07/protocolos à revisão clínica/humana; manter `REVISAR_RETENCAO` sem CTA até existir atividade própria e transição consumível

### RESULT-FEEDBACK-046 — Feedback digital e debrief bounded na atividade

- título: exibir o resultado de correção digital persistido e orientar a próxima ação do participante
- descrição: após restauração ou submissão de uma tentativa já corrigida, consultar o endpoint público existente de feedback, exibir resultado/feedback e o estado “aguardando correção” em uma projeção redigida, sem criar gabarito, decisão clínica ou competência prática
- módulo: avaliação digital / feedback / debrief / jornada participante / web
- dependência: `JOURNEY-045`; `FEEDBACK-041`; `APPEAL-042`; `PRD-RF-028`; `PRD-RF-070`; `SPEC-0107`; `SPEC-0114`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / ciclo de aprendizagem
- risco: alto — resultado, feedback ou próxima ação incorretos podem induzir aprendizagem insegura; a fronteira pública não pode vazar regra, corretor, gabarito ou fonte
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED E2E; GET de feedback permanece owner-scoped e strict, `not_found` vira estado público “ainda não disponível”, resultado/feedback/next action são renderizados sem identidade interna, tentativa corrigida é restaurada após atualização e `pnpm verify`, E2E, exposição e diff-check passam
- escopo: somente a projeção de correção digital já persistida, estados de espera/erro/retry e debrief/reflexão já modelados; nenhuma correção nova é inventada no browser
- fora desta fatia: autocorreção, IA geradora, alteração de nota/gabarito, decisão de appeal, remediação/retensão automáticas, prática clínica, publicação, provider/MFA, live RLS, grants produtivos, piloto e release
- controles obrigatórios: `attemptId` só vem da tentativa restaurada na jornada; API continua autorizando o dono; não renderizar `participantId`, `scopeId`, `correctedBy`, `ruleVersion`, gabarito, fonte ou claim prático
- evidência: `BRIEFING/04.AUDIT/0525_result_feedback_participant_audit.md`; `traceability.yml` / `RESULT-FEEDBACK-046`; SPEC 0107/0114/0118
- código: `apps/web/app/page.tsx`; `apps/web/app/globals.css`; endpoint existente em `apps/api/src/http.ts`
- testes: `tests/e2e/participant-access.spec.ts` (feedback corrigido, espera, restauração e submissão); `apps/api/src/http.test.ts` (owner/redaction existente); `packages/contracts/src/correction.test.ts`
- resultado: RED observado antes do cartão; parser client-side allowlisted e plain-text, consulta após restauração/submissão corrigida, espera bounded para `not_found`, erro/retry e próxima ação server-side implementados; 3/3 E2E focal e 13/13 E2E participante passaram; `pnpm verify` manteve 125/572/29 skips e cobertura 84,51%/80,33%/86,03%/85,23%
- gaps explícitos: assignment→atividade publicada/proveniência/atomicidade, live RLS e concorrência, debrief/reflexão completa, remediação/retensão/notificações, grants produtivos, observabilidade externa, publicação clínica, piloto e release continuam pendentes
- próxima ação: priorizar a relação assignment→atividade e sua proveniência/atomicidade quando `CVG_TEST_DATABASE_URL` e autoridade de ambiente estiverem disponíveis; manter o feedback digital limitado à projeção já persistida

### JOURNEY-REL-001 — Relação explícita assignment → atividade

- título: materializar o vínculo entre a trilha adaptativa e as atividades publicadas sem inferência textual
- descrição: ligar `learning_assignments` a `activity_assignments` por módulo curricular explícito, preservar provenance do diagnóstico e manter a operação idempotente/atômica; atividades legadas sem `moduleId` não são escolhidas automaticamente
- módulo: jornada participante / currículo / persistência / segurança
- dependência: `ADAPTIVE-044`; `JOURNEY-045`; `RESULT-FEEDBACK-046`; `SPEC-0109`; `SPEC-0111`; `SPEC-0118`; migration/RLS PostgreSQL autorizados
- fase: BUILD — Phase 3–5 / jornada adaptativa
- risco: crítico — uma resolução ambígua pode atribuir conteúdo errado, atravessar escopo ou perder a relação entre diagnóstico, módulo e estudo
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED antes do código; somente atividades publicadas com `module_id` válido e mesmo escopo são elegíveis; FKs e índices de provenance existem; atribuição e vínculo são escritos na mesma transação; replay não duplica; reparo não altera status; contratos públicos não expõem IDs internos; integração live é separada, explícita e passou no banco sintético autorizado
- escopo: `learning_activities.module_id`; `learning_assignments.source_diagnostic_result_id`; `activity_assignments.learning_assignment_id`; materialização/reparo bounded; seed curricular; testes unitários e live
- fora desta fatia: inferência por slug; publicação clínica; alteração de nota/gabarito; sincronização de estados posteriores; concorrência/policy failure live; E2E navegador→banco curricular; provider/MFA; grants produtivos; observabilidade externa; piloto; release
- controles obrigatórios: `participantId` continua derivado do diagnóstico; escopo é validado na consulta e no contexto RLS; `moduleId` não entra de cliente; `onConflictDoUpdate` só preenche provenance nula; atividade sem mapping explícito permanece não atribuída
- evidência: `BRIEFING/04.AUDIT/0526_journey_assignment_activity_audit.md`; `traceability.yml` / `JOURNEY-REL-001`; SPEC 0109/0107/0111/0118; migration `0026_assignment_activity_provenance.sql`
- código: `packages/persistence/src/schema.ts`; `packages/persistence/src/adaptive-assignment-repository.ts`; `packages/curriculum/src/types.ts`; `packages/curriculum/src/projection.ts`; `packages/curriculum/src/content-seed.ts`
- testes: `packages/persistence/src/adaptive-assignment-repository.test.ts` (5/5); `tests/integration/postgres-adaptive-assignment.test.ts` (2 live); `tests/integration/curriculum-catalog.test.ts`
- resultado: vínculo explícito, provenance do resultado diagnóstico, replay e reparo legado foram confirmados no live sintético; a suíte PostgreSQL passou 31/48 com aplicação sem `SUPERUSER/BYPASSRLS` e admin separado; migration manifest passou 27/27; regressão completa passou com 125/576/31 skips
- gaps explícitos: concorrência e policy failure live independente; pipeline autoral que persiste `moduleId` em atividade aprovada; E2E navegador→API→PostgreSQL curricular; grants/owners produtivos; conteúdo/revisão clínica, B-07 real, piloto, provider/MFA e assurance operacional
- próxima ação: executar o workflow remoto no SHA `5bfa530710171cf1299e8e60d4645796b3886465` e, com autoridade de ambiente, provar concorrência e a jornada curricular persistida; não declarar release/100%

### AUTHORING-ACTIVITY-001 — Materialização authoring → atividade publicada

- título: criar a atividade publicada a partir de autoria aprovada por módulo e sessão explícitos
- descrição: ao salvar uma versão `PUBLICADO`, materializar ou recuperar a atividade única do escopo/módulo/sessão, ligar os itens publicados por ordinal e falhar fechado diante de mismatch, duplicidade, vínculo cruzado, escrita incompleta ou item extra
- módulo: autoria / publicação / currículo / persistência / segurança
- dependência: `JOURNEY-REL-001`; SPEC 0109/0110/0111/0118; capability clínica e transação do caso de uso existentes
- fase: BUILD — Phase 3–5 / pipeline autoral
- risco: crítico — projeção incompleta ou identidade implícita pode publicar conteúdo errado, duplicar atividade ou atravessar escopo
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN focal; `moduleId` M01–M24 e `sessionId` Mxx-S1..S4 coerentes; unicidade e RLS `ENABLE/FORCE`; publicação somente para conteúdo `PUBLICADO`; replay e concorrência idempotentes; conjunto exato validado; regressão live e traceability atualizados — cumprido localmente
- escopo: migrations `0028`–`0030`; `content-repository.ts`; `learning_activities.session_id`; materialização de `learning_activity_items`; policies de escopo/participante/autoria; testes unitários e PostgreSQL live
- fora desta fatia: limpeza destrutiva de itens históricos, alteração de nota/gabarito, publicação clínica sem capability, E2E navegador criado pelo pipeline, workflow remoto, grants produtivos, observabilidade/restore, provider/MFA, piloto e release
- controles obrigatórios: identidade vem do registro editorial e do contexto transacional; atividade legada com sessão nula não é agrupada; RLS não pode ser bypassado pela role app; IA/Qdrant não participam da decisão
- evidência: `BRIEFING/04.AUDIT/0526_journey_assignment_activity_audit.md`; SPEC 0109/0110/0118; `traceability.yml` / `AUTHORING-ACTIVITY-001`
- código: `packages/persistence/src/content-repository.ts`; `packages/persistence/src/schema.ts`; migrations `0028_authoring_activity_session.sql`, `0029_learning_activity_projection_rls.sql`, `0030_learning_activity_projection_rls_functions.sql`
- testes: `packages/persistence/src/content-repository.test.ts` (18/18); `tests/integration/postgres-authoring-workflow.test.ts` (1/1 live); `tests/integration/postgres-content-workflow.test.ts`; `tests/integration/postgres-worker.test.ts` (4/4 live)
- resultado: commit `82ea6ab` criou a projeção com validação fail-closed e duas transações concorrentes convergindo para uma atividade/dois itens; cobertura e migrations passaram; nenhum dado real, PDF, foto, prontuário, tutor ou segredo foi usado
- gaps explícitos: E2E curricular navegador→API→PostgreSQL com atividade criada pelo pipeline; workflow remoto no mesmo SHA; grants/owners produtivos; collector/retention/traces; carga/failover/restore; revisão clínica/B-07/piloto; provider/MFA
- próxima ação: executar workflow remoto e E2E curricular do pipeline somente com autoridade de ambiente; não declarar release/100%

### AUTHORING-E2E-PIPELINE-001 — E2E real com atividade criada pelo authoring

- título: provar que a atividade consumida pelo navegador nasce da publicação editorial materializada
- descrição: substituir o seed direto do fixture por conteúdo editorial sintético, revisão, projeção, publicação, descoberta da atividade e atribuição antes da navegação participante
- módulo: E2E / autoria / currículo / persistência / segurança
- dependência: `AUTHORING-ACTIVITY-001`; SPEC 0109/0110/0111/0118; banco PostgreSQL descartável e workflow autorizados
- fase: BUILD — Phase 3–5 / prova de jornada
- risco: crítico — E2E de atividade pré-inserida pode mascarar quebra entre autoria, publicação, atribuição e participante
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED contratual para proveniência; fixture sem insert direto de atividade/item; revisão/projeção/autorização/publicação executadas; assignment após materialização; cleanup completo; E2E real browser→web→API→PostgreSQL; artefato same-SHA — implementação e gates locais estáticos/unitários cumpridos, E2E live pendente
- escopo: `scripts/real-e2e-fixture-server.mjs`; `tests/e2e/real-runtime.spec.ts`; fixture JSON temporária; auditoria e manifesto de rastreabilidade
- fora desta fatia: conteúdo clínico real; publicação de B-07/M02; alteração de nota/gabarito; provider/MFA; grants produtivos; observabilidade/restore; carga/failover; workflow remoto; piloto; release
- controles obrigatórios: apenas dados sintéticos; revisor e autor distintos; capability clínica confinada ao fixture; origem não entra na projeção participante; IA/Qdrant não participam; falha parcial remove artefatos do fixture
- evidência: `BRIEFING/04.AUDIT/0528_authoring_e2e_pipeline_audit.md`; SPEC 0118 seção 27; `traceability.yml` / `AUTHORING-E2E-PIPELINE-001`
- código: `scripts/real-e2e-fixture-server.mjs`
- testes: `tests/e2e/real-runtime.spec.ts`; suíte unitária dos 117 arquivos/572 testes; lint, typecheck, Prettier, Node syntax e Playwright `--list`
- resultado: o fixture usa `reviewAuthoringContent` e `advanceContent` para materializar `M02-S1`; o contrato exige slug `authoring-<hash>`; todos os gates locais disponíveis passaram
- gaps explícitos: E2E real ainda não executado sem `CVG_TEST_DATABASE_URL`/`CVG_REAL_E2E_DATABASE_URL`; `pnpm` ausente no ambiente; workflow remoto same-SHA, grants/owners, collector/retention/traces, carga/failover/restore, revisão clínica/B-07/piloto e provider/MFA
- próxima ação: executar `CVG_RUN_REAL_E2E=true pnpm test:e2e` em banco descartável autorizado e registrar artefatos; não declarar PASS/release por inferência

### ACTIVITY-RLS-047 — Contexto transacional e membership da atividade

- título: impedir preflight e leitura participante fora do contexto RLS autorizado
- descrição: corrigir o resolver de escopo para usar transação contextual e restringir a função participante a atividade publicada, conta ativa e membership aceito no escopo, preservando metadados da jornada e limitando itens a assignment iniciável
- módulo: jornada participante / persistência / API / segurança
- dependência: `AUTHORING-ACTIVITY-001`; `AUTHORING-E2E-PIPELINE-001`; SPEC 0109/0110/0111/0118; migration e banco PostgreSQL autorizados
- fase: BUILD — Phase 3–5 / hardening RLS
- risco: crítico — leitura fora do contexto pode quebrar a jornada ou atravessar isolamento; membership pendente pode abrir projeção indevida
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED/GREEN focal; resolver contextual; chamadas HTTP com contexto derivado server-side; migrations `0031`/`0032`; constraint de sessão coerente; estados da jornada preservados; itens bounded a assignment iniciável; fixtures live atualizados; live PostgreSQL com role sem bypass e regressão atualizada — parte local cumprida, live pendente
- escopo: `createActivityScopeResolver`; `apps/api/src/http.ts`; policies participant de `learning_activities`/`learning_activity_items`; `account_invitations.accepted_at`; `learning_activities_session_module_check`
- fora desta fatia: autorização clínica, alteração de nota/gabarito, provider/MFA, grants/owners produtivos, carga/failover, observabilidade/restore, workflow remoto, piloto e release
- controles obrigatórios: contexto não vem de campo participante; PostgreSQL continua autoridade; RLS é defesa adicional; IA/Qdrant não participam; fixtures são sintéticos e limpos
- evidência: `BRIEFING/04.AUDIT/0529_activity_rls_attempt_context_audit.md`; SPEC 0118 seção 28; `traceability.yml` / `ACTIVITY-RLS-047`
- código: `packages/persistence/src/attempt-repository.ts`; `apps/api/src/http.ts`; `packages/persistence/drizzle/0031_learning_activity_participant_rls_hardening.sql`; `packages/persistence/drizzle/0032_learning_activity_journey_visibility.sql`; `packages/persistence/src/schema.ts`
- testes: `packages/persistence/src/attempt-repository.db.test.ts`; `tests/integration/activity-rls-governance.test.ts`; `tests/integration/postgres-security-isolation.test.ts`; `tests/integration/postgres-activity-content.test.ts`; `tests/integration/postgres-adaptive-assignment.test.ts`
- resultado: commits `743b755` e `b85b059` corrigiram o P0, endureceram o P1/P2 e preservaram o contrato de jornada; unitário 117/572, contrato RLS 2/2, integração 23/56, migrations 33/33 e traceability release passaram; nenhuma execução live foi inferida
- gaps explícitos: aplicação da migration e suíte PostgreSQL live em banco descartável, E2E autoral navegador→API→PostgreSQL, workflow same-SHA, operação produtiva e gates clínicos
- próxima ação: executar `CVG_RUN_LIVE_DB_TESTS=true` e `CVG_RUN_REAL_E2E=true` em ambiente autorizado, registrando resultado PASS ou falha sem mascaramento

### JOURNEY-REL-002 — Sincronização bounded assignment → atividade

- título: manter o status da atividade explicitamente vinculada coerente com a atribuição curricular
- descrição: após uma transição otimista de `learning_assignments`, atualizar somente `activity_assignments` com `learning_assignment_id` correspondente, participante/escopo autorizados e atividade `PUBLISHED`; não inferir vínculos legados nem escrever em atividade retirada
- módulo: jornada participante / currículo / persistência / segurança
- dependência: `JOURNEY-REL-001`; `SPEC-0109`; `SPEC-0111`; `SPEC-0118`
- fase: BUILD — Phase 3–5 / jornada adaptativa
- risco: alto — status divergente pode exibir próxima ação errada; uma sincronização ampla poderia atravessar escopo ou reativar vínculo legado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED antes do código; escrita na mesma transação da transição da atribuição; somente provenance explícita; atividade retirada ignorada; legado sem provenance preservado; conflito otimista mantém rollback atômico; testes unitários/persistência e regressão completa — cumprido localmente
- escopo: `saveLearningAssignment`, atualização bounded de `activity_assignments.status`, predicado de atividade publicada e testes de isolamento/legado/retirada
- fora desta fatia: novas relações, inferência por slug, alteração de tentativa/nota, sincronização assíncrona, publicação clínica, concorrência/policy failure live, grants produtivos, piloto e release
- controles obrigatórios: `participantId` e `scopeId` vêm do contexto transacional; `learning_assignment_id` é a única chave de relação; status `NAO_ATRIBUIDO` não é projetado; falha na sincronização aborta a transação inteira
- evidência: `BRIEFING/04.AUDIT/0527_journey_assignment_status_sync_audit.md`; SPEC 0109/0111/0118; `packages/persistence/src/learning-state-repository.ts`; testes unitários e integração condicional; manifesto `JOURNEY-REL-002`
- resultado: transição otimista atualiza somente vínculos explícitos de atividades `PUBLISHED` do mesmo escopo; `NAO_ATRIBUIDO`, legado sem provenance e atividade retirada ficam fora; allowlist de predecessores impede downgrade; mismatch de módulo falha fechada com rollback; live passou 31/48 com app sem `SUPERUSER/BYPASSRLS` e admin separado; regressão passou com 125/576/31 skips, build 12 workspaces e E2E real 28/28
- gaps explícitos: rollback provocado por policy distinta, concorrência live, workflow remoto no mesmo SHA, grants/owners, pipeline autoral de `moduleId`, E2E navegador→PostgreSQL curricular, conteúdo/revisão clínica, piloto, provider/MFA e assurance operacional
- próxima ação: executar o workflow remoto e, com autoridade, completar concorrência, grants produtivos, observabilidade e restore; não declarar release/100%

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
- gaps explícitos: não há coorte/área/nível porque não existem no domínio; `REPORT-040` adicionou exportação somente da página autorizada, mas não há exportação assíncrona completa, ranking, certificado, CPD acreditado, decisão de RH, integração externa ou prova de competência prática; filas editoriais, recuperação controlada, RLS direto de identidade, auditoria negativa uniforme e gates clínicos permanecem fora deste slice
- verificação final: `pnpm verify` passou com 89 arquivos/411 testes/21 skips explícitos e cobertura 84,67%/80,11%/85,48%/85,41%; `pnpm build` passou; live PostgreSQL 23/34; E2E operations 5/5 com axe; banco e roles descartáveis removidos
- próxima ação: manter paginação/exportação sob prova live e abrir a próxima fatia de diagnóstico→trilha adaptada, contestação completa ou hardening de identidade/recuperação sem liberar gates clínicos

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

### AUDIT-TRAIL-034 — Consulta escopada da trilha de auditoria

- título: materializar a leitura operacional do UC-017 sem permitir edição ou vazamento entre escopos
- descrição: criar contrato estrito, caso de uso, repositório PostgreSQL com cursor opaco, RLS contextual, rota `GET /api/v1/audit` e painel interno bounded para auditor/admin/Ricardo
- módulo: governança / API / aplicação / PostgreSQL / web
- dependência: `AUDIT-NEGATIVE-031`; `DB-PRIVILEGE-032`; sessão ativa; capability server-side; `SPEC-0106`, `SPEC-0107` e `SPEC-0111`
- fase: BUILD — Phase 3–9 / gestão e governança
- risco: crítico — auditoria sem leitura operacional não permite reconstruir decisões; filtro permissivo pode expor outro escopo ou dados protegidos
- impacto: alto
- status: COMPLETED_WITH_GAPS
- requisitos: `PRD-RF-080`; `PRD-RF-081`; `PRD-RF-082`; `PRD-UC-017`; `SPEC-0106`; `SPEC-0107`; `SPEC-0111`; `SPEC-0118`
- quality bar congelada: capability `VIEW_AUDIT_TRAIL` exige conta ativa, papel autorizado e escopo da sessão; query estrita rejeita chaves/limites/datas/cursor inválidos; repository aplica `limit + 1`, ordenação fixa, filtro de escopo e HMAC-SHA-256 sobre o cursor; produção exige `AUDIT_CURSOR_SECRET` server-side; RLS exige `cvg.audit_read` + `cvg.audit_scope_id`; projeção não expõe corpo/cookie/token/prompt/conteúdo protegido; operações cobre loading/empty/error/retry e acessibilidade
- arquivos esperados: `packages/contracts/src/audit-trail.ts`; `packages/application/src/audit-trail-use-cases.ts`; `packages/persistence/src/audit-trail-repository.ts`; `packages/persistence/src/security-context.ts`; `packages/persistence/drizzle/0033_audit_read_scope_hardening.sql`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/api/src/server.ts`; `apps/web/app/operations/page.tsx`
- testes esperados: contratos e caso de uso; API auth/filters/cursor/redaction; persistence mapping/query; migration governance/RLS static; integração PostgreSQL com role `NOSUPERUSER NOBYPASSRLS` quando autorizada; E2E operations sintético e real quando houver banco CVG
- evidência inicial: ausência confirmada de `GetAuditTrail`, `/api/v1/audit` e surface de auditoria no HEAD `106dc42`; a implementação local não autoriza release nem substitui prova live
- gaps explícitos: live PostgreSQL/RLS, workflow same-SHA, grants/owners produtivos, retenção/collector/alertas, exportação auditada, provider/MFA, revisão clínica e piloto continuam separados
- resultado: contrato, capability, caso de uso, repository cursorizado, HMAC server-side, contexto RLS, migration 0033, rota, painel de operações, writer escopado, testes focais, regressão global (625 pass / 33 skips; 84,82% statements / 80,97% branches), build, integração (25 pass / 33 skips), E2E sintético (26/26), audit high e secrets passaram localmente; a crítica independente encontrou e a implementação corrigiu o vazamento potencial de linhas globais autenticadas, a classificação de invariantes, o vínculo do cursor a escopo/filtros, a resposta web obsoleta, o cursor semântico inválido e a ausência de assinatura do cursor
- próxima ação: executar PostgreSQL/RLS live com role `NOSUPERUSER NOBYPASSRLS`, E2E browser→API→PostgreSQL e grants/owners em ambiente CVG descartável/autorizado; não transformar ausência de ambiente em PASS

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
- risco: alto — o smoke real existe localmente, mas o workflow remoto no mesmo SHA e a matriz completa de dependências ainda não foram observados
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0527_journey_assignment_status_sync_audit.md`; `tests/e2e/real-runtime.spec.ts`; `scripts/real-e2e-fixture-server.mjs`; `.github/workflows/quality.yml`; `scripts/provision-ci-postgres.mjs`
- resultado: `CVG_RUN_REAL_E2E=true pnpm test:e2e` passou 28/28 com navegador→web→API→PostgreSQL; o workflow declara PostgreSQL/Qdrant, migrations, live integration, restore, E2E mock/real e audit; roles de migração, aplicação e fixture são provisionadas separadamente
- gaps remanescentes: executar o workflow remoto no SHA atual, verificar artifacts/digests e completar Qdrant/restore/observabilidade no ambiente autorizado; a prova local não é release produtivo

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
- resultado: o harness e o workflow agora separam aplicação, fixture administrativa e owner de migração; a execução local role-provisioned passou 31 arquivos/48 testes, preservando skips explícitos quando as URLs live não existem; roles e banco foram descartados após a validação
- gaps remanescentes: executar o workflow remoto no mesmo SHA e validar grants/ownership do ambiente produtivo; o fallback sem capacidade administrativa continua reduzindo a cobertura por skip explícito
- próxima ação: executar/revisar o workflow CI autorizado e preservar os gates clínicos independentes

### AUD-P1-004 — Operação, observabilidade e restore

- título: fechar collector, alertas, traces, retenção, backup/restauração e recuperação
- descrição: implementar a superfície operacional mínima, executar runbooks e comprovar RPO/RTO e reconciliação não vazia
- módulo: runtime / observabilidade / operação
- dependência: ambiente de homologação descartável
- fase: BUILD — Phase 6
- risco: alto — não há prova suficiente de operação ou recuperação
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; 0412–0418 e 0421; `BRIEFING/08.RUNTIME/0805_operational_snapshot_contract.md`
- recorte atual: snapshot operacional local protegido, derivação de SLO/alertas a partir de sinais redigidos e testes negativos; não fecha collector/OTel, retenção, carga, failover, restore agendado ou ambiente produtivo
- critério desta iteração: endpoint interno com autorização server-side, `NO_DATA` explícito, estados de dependência redigidos, ausência de payload sensível e regressão completa verde
- resultado atual: `OPS-034` implementou `deriveOperationalSnapshot` e `GET /internal/operations`; `READY`/`DEGRADED` retornam 200, `NOT_READY` retorna 503 com snapshot seguro; p95 sem quantis permanece `NO_DATA`; query/body inesperados retornam 422 e a resposta aplica allowlist runtime das dependências
- verificação: `pnpm verify` passou com 99 arquivos/474 testes, 22 skips de arquivo/24 skips de teste e cobertura 84,49% statements, 80,22% branches, 85,64% functions e 85,18% lines; build 12 workspaces; E2E 20/20; testes OPS direcionados 67/67; documentação, exposure, migrations, secrets, architecture e audit de dependências passaram
- próxima ação: manter o recorte local `OPS-034` em `COMPLETED_WITH_GAPS`; executar collector/OTel, retenção, carga, failover, restore e workflow remoto somente em ambiente operacional autorizado

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
