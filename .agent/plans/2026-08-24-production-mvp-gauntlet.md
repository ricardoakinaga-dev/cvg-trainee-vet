# CVG production-candidate MVP — ExecPlan

## Purpose / Big Picture

Levar o CVG de uma fundação digital localmente verificada para um candidato a
MVP operacional, fechando as lacunas aprovadas no PRD/SPEC e mantendo explícitos
os gates que dependem de ambiente, autoridade operacional ou revisão clínica.
O resultado observável é uma jornada coerente de convite → diagnóstico
formativo → trilha derivada → estudo → avaliação → remediação/retensão →
reflexão/feedback, com operação interna segura, rastreabilidade e evidência
reproduzível. “100%” só será declarado se cada critério obrigatório tiver
evidência atual e autoridade compatível; completar o código local não equivale
a aprovação clínica, piloto ou release produtivo.

## Progress

- [x] (2026-08-24T00:00:00-03:00) Recuperar `AGENTS.md`, `apps/web/AGENTS.md`,
  `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`,
  `docs/30_backlog_master.md`, briefing, código, testes, Git e pesquisa.
- [x] (2026-08-24T00:00:00-03:00) Confirmar que o HEAD local era `9a2e07a`, o
  worktree estava limpo, `origin/main` estava 39 commits atrás e a pesquisa oficial
  foi revalidada em 2026-08-24.
- [x] (2026-08-24T04:15:00-03:00) Reconciliar `runtime_state`, backlog, log,
  manifesto e este plano com o HEAD real; congelar a Quality Bar `QB-01` a
  `QB-11`. A evidência local fresca em `9a2e07a` passou com cobertura
  84,50%/80,34%/85,91%/85,24%, 123 arquivos/560 testes, 28 testes skipped,
  contratos 70/70, worker 25/25, migrações 26/26 e gates estáticos limpos.
- [x] (2026-08-24T04:49:39-03:00) Fechar a primeira lacuna local prioritária:
  diagnóstico formativo → atribuição server-side da trilha, sem dispensa
  automática de conteúdo obrigatório ou claim clínico. `ADAPTIVE-044` passou por
  RED/GREEN, testes de aplicação/contrato/persistência/API, cobertura, build,
  E2E, gates estáticos e auditoria; o live PostgreSQL/RLS ficou explicitamente
  skipped sem ambiente.
- [x] (2026-08-24T05:17:52-03:00) Fechar `JOURNEY-045`: adicionar uma CTA
  client-side somente para o `nextActionTarget` calculado pelo servidor,
  atualizar o deep link codificado e preservar sessão/estado de tentativa.
  RED E2E, contrato relacional, aplicação/API, cobertura, build, integração
  configurada e 24/24 E2E passaram; live RLS e a relação real
  assignment→atividade continuam gaps.
- [x] (2026-08-24T05:39:00-03:00) Fechar `RESULT-FEEDBACK-046`: consultar a
  correção digital persistida na web, exibir score/outcome/feedback e a
  próxima ação server-side, e representar `not_found` como espera bounded.
  O RED dos dois novos cenários foi observado antes do cartão; GREEN focal,
  build web, lint/typecheck, cobertura e 13/13 E2E da superfície participante
  passaram. O endpoint e o contrato público existentes foram preservados.
- [x] (2026-08-24T06:04:35-03:00) Fechar localmente `JOURNEY-REL-001`: ligar
  atribuição adaptativa a atividades publicadas apenas por `moduleId` explícito,
  persistir provenance e reparar vínculo legado sem alterar progresso. RED/GREEN
  focal, migration 0026, typecheck de persistence/curriculum, seed M02, build,
  E2E e regressão completa passaram; o código está no commit
  `9b1b975d62760142238b6b19f03e207181f59a87`, e a prova live permanece skipped
  sem banco.
- [x] (2026-08-24T06:19:23-03:00) Fechar o commit documental de
  `JOURNEY-REL-001` (`2972fa0b64023551a5aaacd668b3c1ae5176409d`) e executar o
  gate release de rastreabilidade em worktree limpo; o gate passou. A próxima
  ação é preparar a prova live de RLS/rollback/concorrência.
- [x] (2026-08-24T06:38:13-03:00) Fechar o código de `JOURNEY-REL-002` no
  commit `73649cba9da168babb06a87c46cc8bd6bb580408`: sincronizar somente
  provenance explícita publicada, preservar legado/retirada e impedir downgrade
  de progresso por allowlist de estados predecessores. `pnpm verify` passou com
  125/575/31 skips e cobertura 84,50%/80,35%/85,95%/85,23%; build 12
  workspaces, E2E 26/26, integração 8/20 com 27/31 skips e audit high também
  passaram.
- [x] (2026-08-24T06:41:52-03:00) Fechar a documentação de `JOURNEY-REL-002`
  no commit `e3acb37f6b6998564eb86dba2a6e82cb1486c9ed` e executar
  `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` em worktree limpo;
  o gate passou. A próxima ação é a prova live de RLS/rollback/concorrência.
- [x] (2026-08-24T07:10:00-03:00) Fechar o hardening live/CI no commit
  `5bfa530710171cf1299e8e60d4645796b3886465`: PostgreSQL efêmero passou
  31 arquivos/48 testes com app `NOSUPERUSER/NOBYPASSRLS` e fixture admin
  separada; o vínculo publicado com módulo incompatível falha fechada com
  rollback; `CVG_RUN_REAL_E2E=true pnpm test:e2e` passou 28/28; `pnpm verify`
  passou com 125/576/31 skips, cobertura 84,50%/80,34%/85,95%/85,22%,
  contratos 72/72, worker 25/25 e migrations 27/27. O CI agora provisiona
  roles distintas de migração, aplicação e fixture; workflow remoto, produção,
  concorrência, clínica e assurance operacional continuam gaps.
- [x] (2026-08-24T08:01:41-03:00) Fechar `OUTBOX-FENCE-001` nos commits
  `e3cfb6f4255928c50de3c67718195a0063cce3c9` e
  `8d03882cc2538f48b5f6c77d861fbaec90b65a75`: claim/reclaim agora usam
  token opaco, finalização/falha condicionais ao token e ao relógio do
  PostgreSQL, com trigger de rollout contra worker legado. O primeiro critic
  independente reprovou fake permissivo, ausência de `markFailed` live e
  relógio do processo; os pontos foram corrigidos. GREEN focal 32/32,
  PostgreSQL live 31/50, regressão `pnpm verify` 125/579/33 skips e
  cobertura 84,48%/80,37%/85,97%/85,22% passaram. Fencing não equivale a
  exatamente-once; a prova live ainda inclui a disputa de finalização por duas
  conexões; efeitos externos continuam exigindo idempotência.
- [x] (2026-08-24T08:47:00-03:00) Fechar o complemento local
  `AUTHORING-ACTIVITY-001` no commit `82ea6ab`: publicação editorial agora
  materializa atividade por `scopeId/moduleId/sessionId`, com migrations
  `0028`–`0030`, `ENABLE/FORCE RLS`, itens `PUBLICADO`, ordinal bounded,
  replay/convergência concorrente e falha fechada para conjunto inesperado.
  RED/GREEN focal 18/18, authoring live 1/1, worker live 4/4 e suíte live
  completa 31/50 passaram; cobertura unitária 84,57%/80,50%/86,08%/85,30%.
- [ ] (futuro) Completar as fatias digitais restantes e a assurance de
  segurança/operação conforme os marcos e gates abaixo.
- [ ] (futuro) Submeter conteúdo, piloto, credenciais, fornecedor e release a
  Ricardo/autoridade competente; não são decisões que o plano possa inferir.

- [ ] (2026-08-24T10:18:00-03:00) Recuperar o control plane e abrir
  `AUDIT-TRAIL-034`: a SPEC já declarava `GetAuditTrail` e `GET /api/v1/audit`,
  mas o código não possuía leitura, rota nem painel. A quality bar congelada
  exige capability escopada, cursor bounded, redaction e RLS contextual; live,
  produção e gates clínicos permanecem evidência separada.
- [x] (2026-08-24T12:05:26-03:00) Fechar o hardening HMAC de
  `AUDIT-TRAIL-034`: o cursor agora é assinado com HMAC-SHA-256, o segredo é
  server-side e obrigatório em produção, e desenvolvimento/teste usam somente
  um valor determinístico não produtivo. GREEN focal, `pnpm verify` (625/33,
  84,82%/80,97%/86,32%/85,56%), build, integração 25/33, E2E 26/26,
  audit high e secrets passaram; live PostgreSQL/RLS e browser→API→PostgreSQL
  continuam não observados.
- [x] (2026-08-24T13:51:24-03:00) Fechar `JOURNEY-REMEDIATION-048` no código
  `c16c52ea9e80e1ac0a7740c404fe21ff923fdc6d`: CTA de remediação derivada por
  `nextAction`/target server-side, assignment/proveniência explícitos,
  conteúdo integralmente `PUBLICADO`, tentativa humana/terminal somente
  leitura, nova tentativa sem respostas/apelos/justificativa antigos e
  boundary HTTP defensivo. Einstein apontou cinco gaps e Bacon aprovou local
  após apontar três P2; todos foram fechados. `pnpm verify` passou 131/632/33
  skips, cobertura 84,92%/81,13%/86,46%/85,67%, build 12 workspaces, E2E
  28/28, integração 25/33 e audit high.
- [x] (2026-08-24T13:54:48-03:00) Fechar a auditoria/documentação de
  `JOURNEY-REMEDIATION-048` em `7a24051` e atualizar o runtime state em
  `95dc52a`; `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` passou
  em worktree limpo. A próxima ação continua sendo a prova live autorizada,
  gates clínicos/humanos e os gaps de retenção completa; nenhum release/100%
  foi declarado.
- [x] (2026-08-24T15:42:48-03:00) Fechar `RLS-FUNCTION-EXECUTE-051` no commit
  `425e8d657c2ab4b55af2e8512b54ac24a8ea2c04`: migration `0035` revoga
  `PUBLIC EXECUTE` dos cinco helpers RLS, o provisionador aplica revoke + grant
  direto à role de aplicação e o teste live negativo afirma ACL/owner/role sem
  bypass e cleanup resiliente. `pnpm verify` passou com 131/637/34 skips e
  cobertura 84,90%/81,13%/86,41%/85,65%; a prova PostgreSQL continua
  dependente de ambiente autorizado.
- [x] (2026-08-24T17:03:24-03:00) Fechar `AUTHORING-DRAFT-052` nos commits
  `6630d8ca4514ce49c34fd2f013c7cacaa83adab0` e
  `f6a123462a02fefbba9168cf974d9c824b78433b`: contrato strict, autorização,
  identidade/projeção/preflight server-side, persistência atômica, RLS,
  FKs compostas, replay idempotente, rota operacional, retry/timeout web e
  E2E autoral 5/5 (E2E completa 31/31). A crítica independente final retornou CONDITIONAL PASS,
  sem P0/P1 restantes; `pnpm verify` passou 131/647/35 skips com cobertura
  84,33%/80,16%/86,04%/85,01%. O live PostgreSQL segue pendente sem
  `CVG_TEST_DATABASE_URL`; publicação, clínica e produção permanecem fora.
- [x] (2026-08-24T17:30:40-03:00) Abrir `FEEDBACK-HISTORY-053`: timeline interna
  append-only de triagem por escopo, com leitura read-only, projeção allowlisted,
  sem resposta pública, notificação, decisão clínica ou alteração educacional.
- [x] (2026-08-24T18:01:46-03:00) Fechar `FEEDBACK-HISTORY-053` em
  `5f93cbb55732da2b89c0d6322ccc2a00e76cbd40`: contratos, aplicação, migration
  append-only/RLS, repository, API, operações web, migration governance e E2E
  concluídos; item permanece `COMPLETED_WITH_GAPS` sem prova live.
- [x] (2026-08-24T20:08:23-03:00) Fechar `FEEDBACK-043` no commit
  `ea9ee122676be620652f08019919ca59ed05fa02`: cursor HMAC bound a
  escopo/status/limite, keyset `limit + 1`, migration 0040 com índices,
  metadados HTTP, paginação anterior/próxima e retry/race web protegido por
  identidade de consulta. Goodall encontrou dois P1; ambos foram reproduzidos
  em E2E e corrigidos. Coverage 84,24%/80,14%/86,20%/84,95%, 667 testes
  passaram/35 skipped, build 12 workspaces, E2E 31/31 e gates estáticos passaram;
  live PostgreSQL/RLS/grants e produção continuam gaps.
- [x] (2026-08-24T20:20:00-03:00) Abrir `APPEAL-043` e registrar o enquadramento
  local: preview interno strict/read-only por `appealId`, escopo derivado do
  protocolo persistido, sem score/resposta/gabarito/fonte, sem decisão,
  recálculo, publicação ou mutação.
- [x] (2026-08-24T21:12:00-03:00) Fechar `APPEAL-043` no commit
  `2277a32cb2a88345903d7fd5a54b13f1da629601`: preview strict/read-only,
  `REVIEW_APPEAL`, escopo derivado, `REPEATABLE READ`, linhagem por atividade,
  conflito pós-decisão, template de rota, query duplicate rejection e race web.
  RED/GREEN/REFACTOR, critic independente, coverage 137/678/35 skips, build,
  32/32 E2E e gates estáticos passaram; auditoria 0537 e traceability foram
  atualizadas. PostgreSQL/RLS live, produção, remoto same-SHA e clínica seguem
  gaps explícitos.
- [x] (2026-08-24T21:19:55-03:00) Fechar o gate documental/release de
  `APPEAL-043` no commit `4b79b695ad7ecf50d4468d484c11faa262c37777` e abrir
  `FEEDBACK-054` como próxima lacuna local bounded: prioridade e responsável
  escopados, sem resposta, SLA, notificação ou retirada clínica.
- [x] (2026-08-24T22:20:59-03:00) Fechar localmente `FEEDBACK-054` após crítica
  independente Banach e RED focal: prioridade `BAIXA|NORMAL|ALTA|URGENTE`,
  autoatribuição/liberação bounded, capability dedicada, escopo/identidade
  server-side, membership ativa/aceita, CAS, histórico `METADATA_ALTERADO`,
  auditoria metadata-only, policy/trigger SQL, fila interna e E2E sem UUID.
  O código está em `ea81eed1b42f6807938c2c83520833f86b30a3f7` e o hardening E2E
  em `9eedb2518f7b777330fe1787825df64416827dac`; focal 13/140, coverage
  141/695, build 12 workspaces, migrations 42/42 e E2E 32/32 passaram.
  PostgreSQL/RLS live, produção, resposta/SLA/notificação, atribuição a
  terceiro e gates humanos continuam gaps explícitos.
- [x] (2026-08-24T22:30:46-03:00) Executar os gates estáticos finais, fechar
  auditoria/manifesto no commit documental `d460ba04bb459f502ef59875242a091a3c1a5beb`
  e passar `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` em worktree
  limpo. O próximo passo é prova live autorizada ou outra fatia bounded, sem
  declarar release.
- [x] (2026-08-25T23:46:19-03:00) Reconciliar o control plane no HEAD
  `29e990b`, executar o baseline com Node `22.22.0`/pnpm `10.33.0` efêmeros e
  receber três leituras independentes. A maior lacuna de segurança confirmada
  foi a policy participante `FOR ALL` de `feedback_tickets`; a próxima task
  bounded é `FEEDBACK-055`, sem alterar a API participante.
- [x] (2026-08-26T02:58:32-03:00) Fechar `FEEDBACK-055`/`LIVE-056` com RED/GREEN/REFACTOR:
  migrations 0048–0050 vinculam leituras participant-only ao scope resolvido por
  oracle privado, restringem feedback history ao ticket/participante, e a
  policy de `activity_assignments` valida assignment curricular ativo,
  membership aceita, status permitido e conjunto completo de conteúdo publicado.
  O adaptive repository exclui conteúdo misto e duas materializações concorrentes
  foram exercitadas com único assignment/vínculo. O commit final é
  `b66acc125fac0e022ce5837c4eb14d1eca862401`.
- [x] (2026-08-26T02:57:10-03:00) Recriar o banco descartável PostgreSQL 16.15,
  aplicar 51/51 migrations, provisionar app/admin/migration com roles distintas
  e executar o runner oficial: 35 arquivos/75 testes PASS. A role app foi
  observada sem `SUPERUSER`/`BYPASSRLS`/`CREATEROLE`; tabelas sensíveis têm
  `ENABLE/FORCE RLS` e o helper novo tem `PUBLIC EXECUTE = false`.
- [x] (2026-08-26T02:56:05-03:00) Executar `pnpm verify` no SHA final: 141
  arquivos, 708 testes PASS, 29 arquivos/37 testes skipped, cobertura
  84,36%/80,35%/86,35%/85,05%, contratos 86/86, worker 27/27, migrations 51/51
  e gates estáticos PASS.
- [x] (2026-08-26T03:06:11-03:00) Reexecutar `pnpm verify` após o fechamento
  documental e do manifesto: os mesmos 141/708 PASS, cobertura mínima,
  `LIVE-056` estruturalmente válido e documentation gate passaram.
- [x] (2026-08-26T03:12:56-03:00) Comparar `JOURNEY-056` e `FEEDBACK-057` com
  duas análises independentes read-only; ambas confirmaram que `FEEDBACK-057`
  carece de contrato/schema próprio e que `JOURNEY-056` exige escolher sessão
  diagnóstica pública própria (recomendado) ou atividade especial.
- [x] (2026-08-26T03:15:57-03:00) Versionar auditoria, estado, log, backlog,
  plano e manifesto no commit documental; o release gate
  `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` passou em worktree
  limpo.
- [x] (2026-08-26T04:11:41-03:00) Fechar a extensão E2E real de `LIVE-056` no
  commit `16caccc82ffc519b60a68e1a02850d40909737e1`: health estrito, método/
  rota/status/request ID, item exato, tentativa v1→v2→v3, nova sessão, oracle
  PostgreSQL separado, outbox/auditoria e cleanup verificável. A execução final
  passou `34/34` (`32` sintéticos + `2` reais); os gates estáticos também
  passaram. O `pnpm verify` passou com 141/708 PASS, 29 arquivos/37 testes
  skipped e cobertura 84,36%/80,35%/86,35%/85,05%. O resultado é
  local/sintético e mantém gaps de diagnóstico→assignment, produção e operação
  externa.
- [x] (2026-08-26T04:33:39-03:00) Abrir `OPS-061-GRANTS-001` como hardening local
  autônomo após duas críticas independentes confirmarem o DML global em
  `scripts/provision-ci-postgres.mjs:110-119` e a ausência de matriz negativa no
  teste de governança. O escopo é somente provisionamento/ACL do harness e
  teste live sintético; `JOURNEY-056`, produto, migrations aplicadas, produção,
  remote same-SHA, browser cross-scope, escala/failover/restore/collector e
  gates clínicos permanecem fora desta task.
- [x] (2026-08-26T04:54:46-03:00) Executar RED → GREEN → REFACTOR de
  `OPS-061-GRANTS-001`: a role `app` agora usa allowlist imutável de 29 tabelas,
  `knowledge_documents` ficou excluída, grants/default ACL de `app` e `PUBLIC`
  foram revogados, e o focal estático passou 20/20. O teste live foi ampliado
  para ACL direta/efetiva, memberships, sequences e negação conhecida; a
  crítica independente Huygens retornou `CONDITIONAL PASS` sem P0.
- [x] (2026-08-26T05:10:12-03:00) Reexecutar os gates finais de
  `OPS-061-GRANTS-001`: `pnpm verify` passou com 141/709 PASS e 38 skips,
  cobertura 84,36%/80,35%/86,35%/85,05%; build passou em 12 workspaces, E2E
  sintético em 32/32 e audit high sem vulnerabilidades. O preflight live foi
  tentado e encerrou com exit 2 por ausência de `CVG_TEST_DATABASE_URL`; o
  diff passou sem erro. Criar a auditoria `0542`, atualizar o manifesto e
  fechar o control plane sem declarar produção.
- [x] (2026-08-26T07:24:16-03:00) Atualizar auditoria/traceability, revisar o
  diff final e fechar documentalmente `OPS-061-GRANTS-001`; `verify:traceability`,
  `pnpm verify`, build, E2E sintético, audit high e diff-check passaram. A prova
  live continua pendente sem ambiente autorizado.
- [x] (2026-08-26T08:22:24-03:00) Responder à crítica independente de segurança
  em `OPS-061-GRANTS-002` no commit `36088ff`: remover URL/senha de
  argv/ambiente arbitrário, endurecer database/schema/function ACL e defaults,
  qualificar schema, transacionar o provisionamento, completar o contrato CI,
  executar migrations/provisionador/matriz live em banco PostgreSQL 16.15
  descartável e remover os recursos sintéticos. Focal `30/30`, live `35/35`
  arquivos e `82/82` testes; `pnpm verify`, build, E2E, audit high e
  diff-check passaram. Auditoria `0543`; resultado local `CONDITIONAL PASS`.
- [x] (2026-08-26T08:24:37-03:00) Fechar a documentação de `OPS-061-GRANTS-002`
  em `0543`/`traceability.yml` e validar o release traceability em worktree
  limpo; `pnpm verify:traceability:release` passou. O estado global permanece
  aguardando a decisão A/B de `JOURNEY-056`.
- [x] (2026-08-26T08:35:54-03:00) Abrir `OPS-061-GRANTS-003` após crítica
  independente parcial: o contrato agora precisa validar `DATABASE_URL` com a
  role de aplicação, `.env.example` não pode iniciar o runtime com a role de
  migração e o runtime state deve apontar para o HEAD real. O RED reproduziu a
  falha `1/8`; o GREEN focal passou `8/8`. Alterações ainda não estão commitadas.
- [x] (2026-08-26T08:45:00-03:00) Fechar `OPS-061-GRANTS-003` nos commits
  `703fe7c`/`0bd71f2`: adicionar cobertura de role/banco do runtime, executar
  `pnpm verify` (`141/716`, `38` skips), build `12/12`, E2E `32/32`, audit high,
  diff-check e registrar `0544`/manifesto. O resultado é conditional pass;
  a revisão independente parcial não retornou aceite final.
- [x] (2026-08-26T08:53:38-03:00) Reabrir `OPS-061-GRANTS-004` após a crítica
  independente final: adicionar RED para URLs efetivas do workflow e valores
  vazios; o focal falhou `3/12`. O perímetro continua limitado a
  `verify-ci-contract`, workflow e governança, sem tocar na jornada.
- [x] (2026-08-26T09:00:24-03:00) Fechar `OPS-061-GRANTS-004` no commit
  `489a336`: comparar URLs job-level e override de migration, rejeitar vazios,
  executar RED → GREEN → REFACTOR, regressão `141/720` com `38` skips, build
  `12/12`, E2E `32/32`, audit high, diff-check e registrar `0545`/manifesto.
  O resultado é conditional pass; não houve parecer independente final
  pós-correção.
- [x] (2026-08-26T09:27:30-03:00) Fechar `OPS-061-GRANTS-005` nos commits
  técnicos `400e228` e documentais `d4fa8af`/`2a4dc46`: role admin da fixture
  real E2E e ancoragem do override de migration foram endurecidas. O focal
  passou `16/16`, a regressão `141/723` com `38` skips, build `12/12`, E2E
  `32/32`, audit high, documentação, diff-check e release traceability passaram.
  A crítica independente pré-fix confirmou os dois P2; a tentativa pós-fix não
  retornou aceite final, então o resultado permanece condicional.
- [x] (2026-08-26T09:38:09-03:00) Concluir o reconhecimento independente
  bounded fora de `JOURNEY-056`: segurança não confirmou P0/P1/P2; a leitura
  de resiliência reproduziu a divergência de readiness com Qdrant; o achado de
  identidade de learning-state ficou separado para confirmação contratual.
- [x] (2026-08-26T09:49:44-03:00) Executar a crítica independente pós-fix:
  readiness pós-start e `DEGRADED` foram confirmados, mas o reviewer encontrou
  P1 no cold start Qdrant e um teste falso-positivo; o achado de
  learning-state foi rebaixado para P2 condicionado ao endpoint genérico.
- [x] (2026-08-26T10:40:30-03:00) Fechar `OPS-061-READINESS-006` nos commits
  técnicos `2b8bcae`/`4e46daf`/`8e8fb86`: readiness PostgreSQL-only, cold start
  sem bloqueio por Qdrant, retry cancelável, close aguardando inicialização em
  voo e `reconcile:qdrant` aguardando explicitamente a preparação da coleção.
  O focal ampliado passou `18/18`, `pnpm verify` passou `142/730` com `38`
  skips, cobertura `84,37/80,31/86,45/85,08`, build `12/12`, E2E `32/32`,
  audit high, diff-check e `verify:traceability:release` passaram. A crítica
  Euler encontrou o P1 operacional, o fix foi aplicado, o follow-up ficou
  `CONDITIONAL PASS` e a prova direta do runner cobriu a ordem
  `initialize → reconcile`; os gaps P2 estão em `0547`.
  O resultado é `COMPLETED_WITH_GAPS`, sem evidência live de outage ou claim
  externo.
- [x] (2026-08-26T10:55:57-03:00) Consolidar a correção final no commit
  técnico `d90393f`: a prova do runner passou a manter a inicialização
  deferred e a implementação do worker compartilha a promessa em voo entre o
  boot e o modo aguardável. O focal ampliado permaneceu `18/18`; o `pnpm
  verify` final passou `142` arquivos/`730` testes, `29` arquivos/`38` testes
  skipped, cobertura `84,42%/80,33%/86,46%/85,15%`, build `12/12`, E2E
  `32/32`, audit high e diff-check. A documentação corrente e o manifesto
  serão fechados com `verify:traceability:release`; não há novo parecer
  independente após esse commit e o item permanece `COMPLETED_WITH_GAPS`.
- [x] (2026-08-26T11:00:58-03:00) Fechar o control plane no commit documental
  `145d06e`: documentação, formatação, traceability estrutural e
  `git diff --check` passaram; depois, em worktree limpo,
  `verify:traceability:release` passou com artefatos alcançáveis e paths
  rastreados. O runtime permanece `WAITING_HUMAN_APPROVAL` e
  `JOURNEY-056` continua aguardando a escolha A/B.
- [x] (2026-08-26T11:09:05-03:00) Obter a crítica independente final de
  Linnaeus no SHA `d90393f`/estado documental corrente: `CONDITIONAL PASS`, sem
  P0/P1 novos. Os P2 de cenário integrado boot+reconcile, `close()` durante
  inicialização lenta e retry concorrente foram registrados na auditoria e
  tratados como nova fatia bounded, sem reabrir o código atual nem alterar o
  gate humano de `JOURNEY-056`.
- [x] (2026-08-26T11:13:17-03:00) Registrar o parecer Linnaeus no commit
  documental `5405eb7` e repetir `verify:traceability:release` em worktree
  limpo; o gate passou novamente. O ciclo desta fatia termina em
  `COMPLETED_WITH_GAPS`, sem P0/P1 novos, com os P2 explicitamente adiados a
  uma task bounded e `JOURNEY-056` preservado em `WAITING_HUMAN_APPROVAL`.
- [x] (2026-08-26T11:15:55-03:00) Abrir `OPS-061-READINESS-007` e executar a
  fatia bounded: o RED reproduziu o retry obsoleto com terceira chamada,
  `close()` lento e promessa compartilhada; a guarda de identidade e a
  coordenação de encerramento foram implementadas no worker, com focal `34/34`
  e auditoria `0548`. O escopo não alterou `JOURNEY-056`, migrations ou UX.
- [x] (2026-08-26T12:00:56-03:00) Fechar `OPS-061-READINESS-007` no commit
  técnico `3cf093e`: regressão `pnpm verify` passou com `142/733`, `38` skips
  e cobertura `84,45%/80,34%/86,54%/85,16%`; build `12/12`, E2E `32/32`, audit
  high, gates documentais e traceability foram registrados. Gauss retornou
  `CONDITIONAL PASS`, sem P0/P1; os gaps integrados, retry policy e live
  permanecem explícitos. O runtime retorna a `WAITING_HUMAN_APPROVAL` para
  `JOURNEY-056`.
- [x] (2026-08-26T12:16:21-03:00) Abrir `OPS-061-RETRY-008` como fatia
  operacional autônoma após Locke, Tesla e Schrodinger confirmarem que o
  bootstrap Qdrant ainda tinha retry infinito/linear e classificação
  indiscriminada. O escopo cobre somente política/classificação compartilhada,
  coordenadores API/worker, telemetria redigida e testes sintéticos; não altera
  `JOURNEY-056`, migrations ou UX.
- [x] (2026-08-26T12:34:51-03:00) Implementar `OPS-061-RETRY-008` por RED → GREEN:
  cinco tentativas totais, backoff capped, jitter injetável, classificação
  fail-closed, exaustão sem timer, close seguro e drenamento de operações irmãs
  em `ensureCollection()`. O focal inicial passou 5/27; typecheck, lint,
  formatação e diff-check passaram.
- [x] (2026-08-26T13:14:44-03:00) Responder ao P1 de corrida identificado por
  Ohm: capturar `attemptNumber` local, impedir que uma geração antiga agende
  retry depois de uma recuperação explícita e adicionar o cenário `503 →
  recuperação explícita → 401`. O commit técnico complementar é `2a95f5c` e o
  worker focal passou 10/10; o foco completo da task passou 5/30.
- [x] (2026-08-26T13:24:00-03:00) Reexecutar a evidência final sobre
  `2a95f5c`: `pnpm verify` passou 143/743 com 38 testes skipped e cobertura
  84,47%/80,35%/86,62%/85,24%; contratos 86/86, worker 37/37, migrations
  51/51, build 12/12, E2E 32/32, audit high e diff-check passaram. Euclid
  retornou `CONDITIONAL PASS`, sem P0/P1; o P2 documental foi reconciliado em
  `0549`, backlog, runtime state e traceability.
- [x] (2026-08-26T13:31:40-03:00) Fechar o control plane no commit documental
  `c272f1f` e passar `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability`
  em worktree limpo. O runtime retorna `WAITING_HUMAN_APPROVAL` e
  `JOURNEY-056` continua aguardando a escolha A/B.
- [ ] (aguardando Ricardo após a task autônoma) Aprovar a forma contratual de
  `JOURNEY-056` e abrir o BUILD bounded correspondente; não iniciar código,
  migration ou UX de jornada antes da decisão. Production owners/grants,
  workflow remoto same-SHA, diagnóstico→assignment, cenário browser
  cross-scope, escala/failover/restore/collector e gates clínicos permanecem
  fora da evidência atual.

## Surprises & Discoveries

- Observation: `docs/99_runtime_state.md` ainda descrevia o bloqueio remoto de
  CI como vigente, embora o backlog/log registrem `origin`, workflow remoto
  verde e artifacts em `fbbc692`/`dd47909`/runs de 2026-08-10.
  Evidence: `git remote -v`, `git branch -vv`, `git log`,
  `docs/30_backlog_master.md`, `docs/20_master_execution_log.md`.
  Impact: o estado precisa ser reconciliado antes de selecionar tarefa; o
  histórico antigo será preservado e apenas a posição atual será corrigida.

- Observation: o HEAD contém diagnóstico B-07 persistido e perfil digital por
  tema, mas os `recommendedModuleIds` ainda são projeção de resultado; não há
  comando transacional que materialize a recomendação como `learning_assignments`.
  Evidence: `packages/application/src/diagnostic-use-cases.ts`,
  `packages/persistence/src/diagnostic-result-repository.ts`,
  `packages/application/src/learning-state-use-cases.ts`,
  `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0106_contratos_de_aplicacao.md`
  (`AssignCurriculum`) e UC-001/UC-002.
  Impact: esta é a candidata local mais direta para fechar a transição
  diagnóstico → trilha; requer contrato, idempotência, pré-requisitos, RLS e
  E2E antes de qualquer claim de jornada completa.

- Observation: a disponibilidade inicialmente poderia ser repassada pelo port
  interno como dado já lido; a implementação foi endurecida para derivá-la de
  `diagnostic_results.completed_at` dentro da transação de materialização.
  Evidence: `packages/application/src/adaptive-assignment-use-cases.ts` e
  `packages/persistence/src/adaptive-assignment-repository.ts`.
  Impact: reduz a superfície de confiança do adapter e mantém identidade,
  escopo e disponibilidade ancorados na fonte transacional.

- Observation: a pesquisa oficial atual mantém a separação entre competência,
  milestones/EPAs e resultados digitais, reforça plan/do/record/reflect e
  valoriza atividades interativas, feedback e acesso flexível; a orientação
  regulatória de 2026 também diz que julgamento profissional não pode ser
  totalmente delegado à IA.
  Evidence: `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`;
  AAVMC CBVE 2.0, RCVS CPD/Academy e RCVS AI advice listados na seção de
  pesquisa.
  Impact: manter a barra de produto digital, reflexão e próxima ação, mas
  bloquear publicação/autonomia clínica e autoridade de IA.

- Observation: `learning_assignments.moduleId` e atividades publicadas são
  agregados relacionados por leituras distintas; a atribuição adaptativa não
  cria automaticamente `activity_assignments` nem provenance do diagnóstico.
  Evidence: crítica independente do repositório de jornada e auditoria
  `BRIEFING/04.AUDIT/0524_journey_cta_audit.md`.
  Impact: `JOURNEY-045` fecha apenas a CTA para um alvo já autorizado na
  projeção; a transição diagnóstico → assignment → atividade real continua
  gap P1 e não pode ser declarada como jornada completa.

- Observation: a relação foi fechada localmente por um mapeamento curricular
  explícito na atividade, não por slug. A operação grava a origem do diagnóstico
  na atribuição e o `learningAssignmentId` na atividade na mesma transação; linhas
  legadas sem módulo continuam inelegíveis.
  Evidence: migration `0026_assignment_activity_provenance.sql`,
  `packages/persistence/src/adaptive-assignment-repository.ts`, testes focais e
  auditoria `BRIEFING/04.AUDIT/0526_journey_assignment_activity_audit.md`.
  Impact: assignment→atividade/provenance agora tem implementação local
  verificável; RLS/rollback/concorrência live, sincronização de estados e
  pipeline de publicação continuam gaps sem autoridade de ambiente.

- Observation: o endpoint de feedback da tentativa já era owner-scoped e
  redigido, mas a web restaurava somente appeals e terminava a submissão sem
  apresentar correção digital ou espera.
  Evidence: `apps/api/src/http.ts`, `packages/contracts/src/correction.ts`,
  `apps/web/app/page.tsx`, RED E2E de `RESULT-FEEDBACK-046`.
  Impact: o participante podia receber uma tentativa corrigida sem debrief
  mínimo; a lacuna foi fechada apenas na projeção digital, sem alterar nota,
  gabarito, decisão humana ou competência prática.

- Observation: a projeção autoral não tinha identidade persistida de sessão;
  materializar por slug/título seria ambíguo e não permitiria convergência
  segura entre publicações concorrentes.
  Evidence: `packages/persistence/src/content-repository.ts`, migrations
  `0028`–`0030`, `tests/integration/postgres-authoring-workflow.test.ts`.
  Impact: a sessão passou a ser `moduleId` + `sessionId` explícitos, com
  unicidade, RLS e replay idempotente; atividade legada continua fora da
  projeção automática.

- Observation: as policies iniciais da projeção recursavam ao consultar
  `learning_activities`/`learning_activity_items` sob FORCE RLS.
  Evidence: probe PostgreSQL falhou com recursão infinita antes da migration
  `0030`; o probe sequencial após as functions booleanas passou.
  Impact: a migration histórica `0029` permanece imutável e `0030` troca as
  policies recursivas por functions SQL `SECURITY DEFINER` que retornam somente
  booleano; a role app continua sem bypass.

- Observation: replay inicialmente tolerava itens extras já persistidos.
  Evidence: crítica independente e caso unitário `with an unexpected persisted
  item`.
  Impact: o materializador agora falha fechado no conjunto não exato, sem
  exclusão silenciosa de histórico; a operação de limpeza/retirada continua
  dependente de uma política explícita futura.

- Observation: a recuperação de 2026-08-24 encontrou que UC-017/RF-080–082
  estava documentado, mas `AuditPort` só permitia append e não havia
  `GetAuditTrail`, `GET /api/v1/audit` ou leitura na tela de operações.
  Evidence: PRD 0010/0013, SPEC 0106/0107/0111, `packages/application/src/audit.ts`,
  `packages/persistence/src/audit-repository.ts` e `apps/api/src/http.ts`.
  Impact: a próxima fatia é `AUDIT-TRAIL-034`; a capability existente de
  operações não será reutilizada como autorização de leitura escopada.

## Decision Log

- Decision: usar os três documentos `docs/` como control plane de status,
  histórico e backlog, e este arquivo apenas como ExecPlan narrativo executável.
  Context: o projeto já possui um control plane operacional próprio; criar uma
  segunda fonte de status aumentaria a contradição.
  Alternatives: substituir os documentos por `.agent/state.json` ou não criar
  plano vivo.
  Reason: `AGENTS.md` exige os documentos existentes e o framework exige plano
  vivo para trabalho T3/T4; a separação de responsabilidades preserva ambos.
  Consequences: toda mudança de status continua em `docs/`; este plano recebe
  apenas progresso, decisões, descobertas e recuperação.
  Date/Author: 2026-08-24 / Codex.

- Decision: congelar o MVP digital sem importar acreditação, horas regulatórias,
  conteúdo protegido, provider/MFA, prática supervisionada ou competência
  prática como funcionalidade implícita.
  Context: PRD/SPEC e pesquisa oficial diferenciam evidência educacional de
  competência/autoridade clínica.
  Alternatives: copiar o comportamento de plataformas comerciais ou liberar
  publicação com base em score digital.
  Reason: isso violaria a fronteira pública e os gates clínicos do CVG.
  Consequences: alguns critérios permanecem `WAITING_HUMAN_APPROVAL` ou
  dependentes de ambiente mesmo quando o código local estiver verde.
  Date/Author: 2026-08-24 / Codex.

- Decision: a implementação selecionada é a atribuição adaptativa bounded
  `ADAPTIVE-044`, depois de três leituras independentes e do baseline local.
  Context: `AssignCurriculum` existe no contrato aprovado e o resultado
  diagnóstico hoje não materializa a recomendação como assignment.
  Alternatives: ampliar triagem de feedback, implementar `ANULAR_ITEM`/
  `ALTERAR_RESULTADO`, ou atacar observabilidade externa sem ambiente.
  Reason: a atribuição é uma lacuna central de jornada que pode ser fechada
  localmente com PostgreSQL/contratos/E2E sintéticos, sem simular autoridade
  clínica nem fornecedor.
  Consequences: a fatia não fecha o MVP pedagógico completo nem libera
  produção; feedback/debrief, gates clínicos, live RLS/grants, CI no mesmo SHA
  e hardening operacional continuam explícitos. A identidade da atribuição
  será resolvida pelo resultado persistido, nunca por `participantId` aceito
  nessa nova operação.
  Date/Author: 2026-08-24 / Codex, confirmado pelos scouts Galileo, Avicenna e
  Nietzsche.

- Decision: tratar a recomendação de hardening do scout Avicenna como Quality
  Bar de release, não como pré-requisito artificial para o slice de produto.
  Context: startup least-privilege, fencing de outbox, grants produtivos,
  observabilidade externa e restore não têm evidência no ambiente atual.
  Reason: ADAPTIVE-044 não publica conteúdo, não executa worker externo e pode
  ser coberto localmente com PostgreSQL/RLS quando a infraestrutura estiver
  disponível; declarar release agora seria incorreto.
  Consequences: qualquer relatório desta fatia deve separar `PASS` local de
  `RELEASE BLOCKED` por ambiente/autoridade.
  Date/Author: 2026-08-24 / Codex.

- Decision: abrir `JOURNEY-045` como a menor continuação observável de
  `ADAPTIVE-044`, sem criar endpoint ou mudar o contrato de identidade.
  Context: a jornada já fornece `activityId` e a página já entende o query
  string, porém não há ação explícita no estado em que uma atividade está
  carregada.
  Reason: uma CTA client-side fecha a transição assignment → estudo com baixo
  blast radius, permite prova E2E e mantém autorização/session/API existentes.
  Consequences: o deep link será um ponteiro codificado e não um mecanismo de
  autorização; feedback/debrief, live RLS e assurance de release continuam
  fora desta fatia.
  Date/Author: 2026-08-24 / Codex.

- Decision: limitar `JOURNEY-045` a uma única CTA cujo alvo é escolhido pelo
  servidor, em vez de transformar cada atividade listada em próxima ação.
  Context: `RF-028` pede uma única próxima ação e o scout independente apontou
  que a web não deve inferir prioridade nem resolver `moduleId` por slug.
  Reason: o contrato pode provar que o alvo pertence à jornada autorizada,
  preservando a sessão e evitando um novo mecanismo de autorização.
  Consequences: a fatia não materializa `activity_assignments` a partir de
  `learning_assignments`; a prova diagnóstico→atividade real, provenance,
  atomicidade e feedback/debrief continuam tarefas separadas.
  Date/Author: 2026-08-24 / Codex, após crítica independente.

- Decision: implementar `RESULT-FEEDBACK-046` como uma projeção web sobre o
  endpoint público existente, com estados separados de correção e sem novo
  domínio, migration ou endpoint.
  Context: o backend já autorizava o dono e removia identidade interna, mas a
  página não mostrava resultado persistido nem ausência bounded.
  Reason: reduz o blast radius, preserva PostgreSQL/API como autoridade e
  materializa o mínimo de feedback/debrief observável sem inventar conteúdo.
  Consequences: score/outcome/feedback e next action ficam visíveis somente
  quando o contrato público é válido; `not_found` vira espera/retry, enquanto
  debrief completo, remediação, retenção e a relação assignment→atividade
  continuam fora do slice.
  Date/Author: 2026-08-24 / Codex.

- Decision: fechar `JOURNEY-REL-001` com `moduleId` explícito e provenance
  relacional, mantendo atividades legadas sem mapping fora da atribuição
  automática.
  Context: o slug não é uma autoridade curricular e a jornada só pode apontar
  para uma atividade que já esteja autorizada no banco.
  Reason: uma coluna opcional compatível, FKs e uma transação única resolvem a
  relação sem reescrever dados históricos ou inventar publicação clínica; o
  reparo só preenche provenance nula e preserva progresso.
  Consequences: múltiplas atividades publicadas do mesmo módulo podem ser
  materializadas, mas sincronização posterior de status, prova live e pipeline
  que grava mapping em conteúdo aprovado permanecem separados.
  Date/Author: 2026-08-24 / Codex.

## Outcomes & Retrospective

O Milestone 2 foi concluído no recorte local: a recomendação diagnóstica agora
vira estado persistido e acionável sem confiar identidade ou disponibilidade no
cliente, a jornada recebe um alvo server-side para a próxima atividade já
autorizada e a tela apresenta o mínimo de feedback digital persistido. A
cobertura global permaneceu acima da barra; a integração live continua uma
dependência real, não uma simulação. A principal lição foi separar claramente
`PASS LOCAL` de `RELEASE BLOCKED`, não inferir relações de catálogo pelo slug e
tratar feedback digital como projeção assistiva, não como decisão clínica.

## Context and Orientation

O projeto é um monorepo pnpm TypeScript strict. `apps/api` é a borda HTTP
autoritativa, `apps/web` é a superfície Next.js/SPA, `apps/worker` processa
outbox e tarefas derivadas, `packages/domain` contém máquinas imutáveis,
`packages/application` contém ports/use cases, `packages/contracts` valida
entrada/saída, `packages/persistence` contém Drizzle/PostgreSQL e RLS,
`packages/curriculum` contém catálogo/runtime draft, e
`packages/observability` contém telemetria redigida local. PostgreSQL é a
fonte transacional; Qdrant é índice interno reconstruível; IA é server-side,
estruturada, opcional e nunca decide estado, nota, gabarito, publicação,
permissão ou aprovação.

O HEAD atual (`29e990b`) já contém, entre outras fatias, dashboard/trilha
digital, perfil diagnóstico formativo, ciclo administrativo, CPD interno
bounded, fila editorial, recovery controlado, RLS de identidade, auditoria
negativa, snapshot operacional, reflexão, apelações 036–042, relatório paginado
e fila interna de feedback. As auditorias correspondentes estão em
`BRIEFING/04.AUDIT/0500–0522`. A evidência é majoritariamente local/sintética;
vários testes live são explicitamente skipped sem `CVG_TEST_DATABASE_URL`.

As fontes de verdade do produto são `BRIEFING/09.PROJETO_CVG_TREINAMENTO` e os
gates canônicos; `docs/99_runtime_state.md` aponta a ação imediata,
`docs/30_backlog_master.md` possui IDs/status/dependências, e
`docs/20_master_execution_log.md` é append-only. `traceability.yml` liga
requisito → SPEC → paths → testes → commit → artefato.

## Scope and Constraints

- In scope: fechar lacunas aprovadas de produto/engenharia em fatias verticais;
  transformar diagnóstico em atribuições adaptativas seguras; completar
  contratos, persistência, autorização, UI, E2E, observabilidade e evidência;
  reconciliar control plane e manter regressão/recovery.
- Out of scope: inventar requisitos durante SPEC; publicar conteúdo clínico;
  aplicar B-07 a pessoas reais; afirmar competência/autonomia; armazenar
  prontuários, tutores, fotos, PDFs, segredos ou dados reais; simular provider,
  MFA, e-mail, grants de produção, collector externo ou aprovação humana.
- Applicable instructions: `AGENTS.md`, `apps/web/AGENTS.md`,
  `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`,
  `docs/30_backlog_master.md`, `BRIEFING/03.BUILD/0300_build_engineer_master.md`,
  `BRIEFING/03.BUILD/0301_roadmap.md`,
  `BRIEFING/03.BUILD/0302_backlog_master.md` e skills
  `engineering-framework`, `gauntlet-loop`, `orchestrate`.
- Requirements/decisions: PRD UC-001/002/007/008/009/016/018/022/023;
  RF-060/064/065/070/072/073/074/080/103/104; SPEC 0104–0118; D-077,
  D-080, D-089, D-109; `traceability.yml`.
- Tier/risk/blast radius: T4/CROSS_SYSTEM para a meta global; cada slice
  deve declarar seu próprio risco e manter no mínimo T3 quando tocar API,
  banco, autorização, migração, worker ou superfície pública.
- Authorization constraints: mudanças locais reversíveis estão autorizadas;
  push, deploy, credenciais, alteração de ambiente, aplicação clínica,
  publicação e piloto exigem autoridade específica e registro humano.

## Architecture and Interfaces

Toda nova borda externa começa em schema `unknown` strict, repete validação no
use case e retorna envelope público redigido. O servidor deriva principal,
membership e escopo; o cliente não fornece `participantId`, `reviewerId` ou
identidade equivalente para operações internas. Repositórios aplicam contexto
RLS na mesma transação e usam SQL parametrizado. Mutação versionada usa
optimistic locking/idempotência e outbox quando atravessa worker. Migrações
devem ter constraints, índices, RLS `ENABLE/FORCE` quando aplicável, owner e
rollback/restore testável.

Para a atribuição adaptativa candidata, o contrato deve aceitar somente a
conclusão/resultado diagnóstico já resolvido no servidor, selecionar módulos
recomendados e obrigatórios por regras determinísticas, preservar
`learning_assignments` existentes, ser idempotente e não dispensar conteúdo
obrigatório/tema crítico automaticamente. A saída participante é o path já
redigido; não entram gabarito, fontes, prompt, resposta, rationale ou claim
clínico.

## Milestones

### Milestone 1 — Control plane e Quality Bar reconciliados

- Outcome: `runtime_state` aponta o HEAD/remote/plan reais; backlog/log/
  traceability não contradizem a posição atual; `QB-01..QB-11` estão congeladas.
- Scope/dependencies: somente documentação/planejamento; preservar histórico.
- Demonstration: `git status`, `git branch -vv`, gates de documentação e
  verificação do manifesto.
- Acceptance/evidence: estado `IN_PROGRESS` com próxima ação concreta,
  entrada append-only no log, plano rastreável e diff limpo após os commits.

### Milestone 2 — Diagnóstico formativo atribui trilha segura

- Outcome: conclusão de B-07 sintético deriva assignments persistidos, bounded e
  escopados; repetição não duplica; caminho público mostra próxima ação.
- Scope/dependencies: `diagnostic_results`, `learning_assignments`,
  `AssignCurriculum`, catálogo/runtime e membership existentes; não publicar
  B-07.
- Demonstration: RED antes do código, testes unit/application/contract,
  PostgreSQL live quando disponível, E2E sintético e rota real/mockada conforme
  o harness existente.
- Acceptance/evidence: `ADAPTIVE-044` no backlog, audit dedicado,
  `traceability.yml`, migration somente se necessária e todos os gates locais.

### Milestone 3 — Jornada digital e governança de avaliação completas no
recorte autorizado

- Outcome: completar somente contratos aprovados de feedback, contestação,
  remediação, retenção, histórico, notificações internas e versões; cada fluxo
  tem estados, erros, concorrência e boundary.
- Scope/dependencies: APPEAL/FEEDBACK existentes, decisão humana para qualquer
  mudança de resultado, sem `ANULAR_ITEM`/`ALTERAR_RESULTADO` automático.
- Demonstration: tests por camada, E2E, integração PostgreSQL/RLS e crítica
  independente separada do builder.
- Acceptance/evidence: auditorias 05xx e artefatos de release atualizados.

### Milestone 4 — Segurança, operação e release candidate

- Outcome: live RLS/grants/ownership, CI no mesmo SHA, collector/retention/
  traces, carga/failover/restart/restore e runbooks são observados ou ficam
  formalmente condicionados pela autoridade correta.
- Scope/dependencies: ambiente descartável/homologação/produção autorizado;
  nenhuma credencial ou URL secreta no repositório.
- Demonstration: workflow remoto, artifacts/digests, health, métricas,
  restore e testes de concorrência/carga com dados sintéticos.
- Acceptance/evidence: auditoria operacional completa, verification records
  atuais e gaps explicitamente não-PASS quando não executados.

### Milestone 5 — Conteúdo, pré-voo e piloto sob governança clínica

- Outcome: B-07/M02 autorais, revisados e aprovados por Ricardo; ensaio T2 e
  baseline somente com protocolo, aviso, coorte e dados sintéticos/autorizados.
- Scope/dependencies: B07-02/B07-03/CUR-24-01/B07-04 e autoridade humana.
- Demonstration: pré-voo item a item, decisão registrada, protocolo executado.
- Acceptance/evidence: artefatos de conteúdo/gate clínico e auditoria; sem
  inferência técnica de aprovação.

## Plan of Work

Primeiro reconciliar o control plane, congelar a barra e transformar a
contradição do CI em fato documentado. Depois selecionar uma única fatia
vertical local, começando pelo RED da atribuição adaptativa se os scouts não
encontrarem uma lacuna de maior severidade. O builder altera somente sua
superfície disjunta; o coordenador integra contratos, persistência, API, web,
tests, auditoria, backlog, log, estado e manifesto. A crítica independente
recebe a barra e o artefato sem a justificativa do builder. Achados críticos de
correção, autorização, exposição, integridade ou recuperação têm prioridade
sobre polish. Cada fatia termina com regressão, release traceability local e
próxima ação concreta.

## Concrete Steps

From `/home/ricardo/cvg-trainee-vet`:

1. Confirm `git status --short --branch`, `git branch -vv`, `git log -12` and
   `git diff --check`; preserve the current clean baseline.
2. Update `docs/99_runtime_state.md` to the observed HEAD/origin/plan and set
   the current task to the reconciliation/quality-bar action; append the
   corresponding entry to `docs/20_master_execution_log.md`.
3. Add the selected bounded item to `docs/30_backlog_master.md` only after its
   PRD/SPEC binding and task contract are frozen; never mark it done before
   current verification evidence.
4. For each implementation slice, write RED first, run the focused RED, make
   the smallest code/migration/API/web change, run GREEN, refactor, then run
   relevant `pnpm` gates and inspect the diff.
5. Run an independent read-only critique with the frozen Quality Bar, record
   `PASS`, `CONDITIONAL PASS`, or `FAIL` honestly, fix the largest material gap,
   and rerun regressions.
6. Update the audit artifact, SPEC links, `traceability.yml`, backlog/log/plan
   and runtime state in the project’s canonical mutation order; commit only
   reversible, intentional changes and rerun the release traceability gate.

## Validation and Acceptance

| Criterion | Required | Procedure/environment | Expected observation | Evidence destination |
| --- | --- | --- | --- | --- |
| QB-01 Core journey | yes | current E2E + API/PostgreSQL live where configured | invite → diagnosis → path → activity → assessment → next action works or each unavailable boundary is explicit | audit 05xx, E2E artifact, log |
| QB-02 Adaptive assignment | yes | unit/application/contract/persistence/API/E2E; live DB when available | diagnostic completion creates only deterministic, idempotent, scoped assignments; mandatory modules are not auto-dispensed | `ADAPTIVE-044` audit and traceability |
| QB-03 Authorization/isolation | yes | negative HTTP tests, RLS integration with non-bypass role, cross-scope cases | deny-by-default; server derives identity/scope; no cross-scope read/write; `ENABLE/FORCE RLS` where required | security audit, integration artifact |
| QB-04 Data integrity/recovery | yes | migrations, constraints, optimistic locking, outbox, restore/rollback | PostgreSQL remains authority; no partial state; retry/replay safe; restore evidence current | persistence/restore audit |
| QB-05 Assessment/governance | yes | domain/application/worker/API tests and human-gate records | digital evidence is separated from practical competence; clinical publication and result changes require human authority | authoring/appeal audit, authority record |
| QB-06 Public boundary/UX | yes | strict schemas, exposure scan, E2E/axe, keyboard/manual review | no internal source/gabarito/IDs/secrets/real data in participant projection; loading/error/forbidden/retry are usable | web audit, exposure gate |
| QB-07 Operations | yes for release | health/dependencies, redacted metrics, collector/retention/traces, load/failover/restart/restore | dependencies and failures are observable; RTO/RPO and runbooks are measured, not asserted | runtime audit, live artifacts |
| QB-08 CI/release | yes for release | same-SHA remote workflow, artifacts/digests, clean worktree, coverage/scans | reproducible workflow green with traceability and no known high vulnerabilities; coverage remains ≥80% globally | CI audit, traceability gate |
| QB-09 Clinical/content gate | yes for publication/pilot | item-by-item review, preflight, human decision, approved protocol/T2 | B-07/M02 only become publishable/application-ready after Ricardo’s decision and evidence | content/gate artifacts |
| QB-10 Continuity/governance | yes | state/log/backlog/plan/manifest consistency and diff review | next action, blockers, evidence, status and rollback are recoverable by another agent | `docs/`, plan, manifest |
| QB-11 AI/derived-index boundary | yes | integration contracts, worker tests, exposure scan, RCVS/AAVMC constraint review | Qdrant/IA remain derived/assistive and cannot alter state, grading, publication, roles or clinical decisions | resilience audit, SPEC, research 0509 |

## Risks and Human Decisions

| Risk/decision | Evidence/confidence | Controls | Residual/authority | Trigger |
| --- | --- | --- | --- | --- |
| State/backlog contradiction | confirmed by HEAD vs state | preserve history; reconcile current pointers only; rerun gates | project control-plane owner / Codex until human review | any later conflicting status |
| Adaptive assignment can overrule mandatory content | high risk from UC-002 | deterministic allowlist, no auto-dispensation, critical-topic tests, server-side membership | clinical/product decision remains human | request to skip or publish |
| RLS/live evidence unavailable | confirmed skips in integration reports | explicit skip, disposable admin harness, no PASS inference | environment operator | `CVG_TEST_DATABASE_URL` + authorized role available |
| Provider/MFA/external delivery | intentionally not simulated | adapter boundary, recovery link hash-only, no secrets/logs | operational/vendor authority | approved provider and contract exist |
| B-07/M02 clinical safety | content still draft/pending | preflight, human review, no public route/publication | Ricardo | item-by-item approval and protocol ready |
| Remote mutation/release | local branch is ahead of origin | no push/deploy by inference; same-SHA workflow only when authorized | repository owner | explicit authorization for target/branch |

## Idempotence and Recovery

Before any implementation, verify a clean worktree and current HEAD. If a test
or migration fails, preserve the failed evidence, do not rewrite status to PASS,
and append a correction or new verification after the cause is fixed. A slice
must be retryable against a disposable database; mutations use existing
optimistic version/idempotency rules and do not depend on in-memory process
state. If a session ends mid-slice, read this plan, the current runtime state,
latest backlog item, last log entry, latest audit and `git status`; resume only
the exact `next_action`. Never run destructive cleanup against a broad path or
non-disposable database. Roll back code by reverting the bounded commit only
with explicit authorization; prefer forward-fix or disposable database
recreation for migrations.

## Artifacts and Evidence

- `docs/99_runtime_state.md`: current pointer, status, blocker and next action;
  it must be updated last in each control-plane transaction.
- `docs/30_backlog_master.md`: stable item IDs, dependencies, status and
  evidence links; it is not replaced by this plan.
- `docs/20_master_execution_log.md`: append-only chronology and decisions.
- `traceability.yml`: requirement/SPEC/module/contract/test/commit/artifact
  links and release gate.
- `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`: current
  official research and product implications, not clinical authorization.
- `pnpm verify`, `pnpm build`, `pnpm test:integration`, `pnpm test:e2e`,
  `pnpm verify:traceability:release`, `pnpm audit --audit-level=high` and
  `git diff --check`: executable evidence with environment limitations.

Plan revision note, 2026-08-24: initial living plan created after complete
document recovery, HEAD/remote inspection and official research refresh. Three
scouts independently confirmed that diagnostic completion does not materialize
assignments; one also identified that local release assurance remains blocked
by live grants/RLS, worker fencing, external observability and same-SHA CI.
`ADAPTIVE-044`, `JOURNEY-045`, `RESULT-FEEDBACK-046` and the local implementation
of `JOURNEY-REL-001` are now closed with gaps; no release or clinical approval
is inferred. The next priority is the live assignment→activity provenance,
rollback, RLS and concurrency proof, followed by state synchronization and
the remaining digital/operational slices.

Plan revision note, 2026-08-24 (AUTHORING-ACTIVITY-001): the bounded authoring
projection was closed locally after the independent critique; RLS recursion and
unexpected persisted items were fixed and live concurrency was re-run. The
remaining next action is the remote same-SHA workflow plus browser evidence for
an activity created by the authoring pipeline, with production and clinical
gates still explicit.

Plan revision note, 2026-08-24 (AUTHORING-E2E-PIPELINE-001 / ACTIVITY-RLS-047):
the real fixture now materializes its activity through authoring publication;
the adversarial critique then found a P0 root-context activity lookup and a P1
participant-policy gap. The bounded fix added contextual resolver transactions,
server-derived HTTP contexts, accepted-membership checks and the session/module
constraint, with RED/GREEN and static local evidence. The remaining next action
is live PostgreSQL/RLS and browser E2E in an authorized disposable environment;
remote same-SHA, productive operations and clinical gates remain explicit.

Plan revision note, 2026-08-24 (ACTIVITY-RLS-047 compatibility correction):
the final inspection found that the active-only list in migration 0031 would hide
`ATRIBUIDO` and historical assignment states from the existing participant
journey contract. Migration 0032 now separates journey metadata visibility from
startable content visibility, with a static RLS contract and the existing live
adaptive-journey regression retained. The next action remains applying both
migrations and running PostgreSQL/RLS plus browser E2E in an authorized
disposable environment.

Plan revision note, 2026-08-24 (AUDIT-TRAIL-034 local closure): the audit read
slice was implemented with a separate capability, strict query/projection,
cursor pagination bound to scope and filter fingerprint, contextual RLS,
redacted API metadata and an operations panel. Independent read-only critique
found four issues; the global-anonymous predicate, authenticated-scope
invariant, internal-error classification, cursor binding and stale web
response guard were corrected. The final local evidence passed `pnpm verify`,
`pnpm build`, `pnpm test:integration`, `pnpm test:e2e` (26/26) and
`pnpm audit --audit-level=high`; coverage was 84.78% statements and 80.79%
branches. The slice is `COMPLETED_WITH_GAPS`; live PostgreSQL/RLS, real browser
persistence, same-SHA remote workflow, production grants/owners and clinical
gates remain the next authorized evidence.

Plan revision note, 2026-08-24 (AUDIT-TRAIL-034 invariant correction): the
second independent critique found that authenticated audit writers could still
omit scope, cursor parse failures could surface as 500, and the UI checked the
request version only before response parsing. The writer and PostgreSQL mapper
now reject authenticated global entries; attempt/answer/rejection paths carry
scope; semantic cursor failures map to 422; and the UI checks the request
version after parsing and when the selected scope disappears. The final local
slice remains `COMPLETED_WITH_GAPS`: HMAC cursor signing and live PostgreSQL/RLS
evidence remain separate hardening/evidence work.

Plan revision note, 2026-08-24 (JOURNEY-REMEDIATION-048 boundary correction):
the independent Hilbert critique found that an arbitrary `itemId` could reach
answer persistence without proving membership in the participant's published
activity. Commit `de8d8bccbce13e3e4d10597f4b88245ae42601f` added the same-scope,
same-participant, same-module/provenance guard in HTTP, application and
transactional persistence; the web CTA now requires a compatible `nextAction`;
the E2E restores a new attempt and verifies the old justification is gone.
The final independent Kuhn critique is PASS local conditioned with no
functional P0, while production remains unqualified because PostgreSQL/RLS,
browser→API→PostgreSQL, real persistence-negative tests and external operation
are not observed.

Final local evidence for this slice: `pnpm verify` passed with 131 files/634
tests and 27 files/33 tests skipped; coverage 84.90% statements, 81.11%
branches, 86.41% functions and 85.64% lines; build 12 workspaces; E2E 28/28;
integration 25 pass/33 skips; high-severity dependency audit clean; release
traceability passed after the control-plane update. The final live preflight
still exits 2 because `CVG_TEST_DATABASE_URL` is absent. The next authorized
action is the live preflight with a disposable CVG database and
human clinical/repository approval, not a production declaration.

Plan revision note, 2026-08-24 (RLS-FUNCTION-EXECUTE-051): independent
security scouting found that the boolean `SECURITY DEFINER` RLS helpers from
migrations 0030–0032 remained callable through `PUBLIC EXECUTE`. The bounded
fix added migration 0035, explicit application-role provisioning, complete
static governance and a live negative test. A second independent critique
rejected the first live-test draft for possible owner/bypass false positive,
incomplete cleanup and dropped URL parameters; all three were corrected before
commit `425e8d6`. The local release bar is green, but ACL/RLS live,
browser→API→PostgreSQL, productive grants/owners, external operations,
clinical approval and same-SHA remote evidence remain unavailable.

Plan revision note, 2026-08-24 (AUTHORING-DRAFT-052): the bounded authoring
draft slice was completed locally after RED/GREEN/REFACTOR. Independent critics
found and the implementation corrected route telemetry, scope retry, timeout
and session recovery, idempotency UPDATE/DELETE privileges, composed replay
identity, scoped audit policy and the post-conflict new-attempt action. Final
critique is CONDITIONAL PASS with no P0/P1; live PostgreSQL/RLS/grants,
browser→API→DB, productive operations, same-SHA remote evidence and clinical
approval remain explicit gaps. Next authorized action is the live preflight in
a disposable CVG environment, not a release declaration.

Plan revision note, 2026-08-24 (FEEDBACK-HISTORY-053): the next local bounded
slice is the append-only internal timeline of feedback triage, selected after
two independent read-only scouts converged on the remaining RF-104 gap. It
must preserve scope isolation and participant redaction; priority, assignment,
SLA, response delivery, clinical withdrawal and external notification remain
outside this slice until their vocabulary and authority are explicitly frozen.

Plan revision note, 2026-08-24 (FEEDBACK-HISTORY-053 closure): the bounded
timeline was implemented in `5f93cbb55732da2b89c0d6322ccc2a00e76cbd40` after
RED/GREEN/REFACTOR. It has strict contracts, capability/scope checks, atomic
status-event persistence, append-only/RLS migration, API route telemetry,
redacted operations UI and synthetic browser evidence. The local bar passed
typecheck, lint, build, coverage, all static gates and 31/31 E2E. The final
limitation remains the absent CVG test database and the resulting lack of
live PostgreSQL/RLS/grants/browser-to-API evidence, production operation and
clinical approval.

Plan revision note, 2026-08-24 (FEEDBACK-HISTORY-053 P1 integrity): the
database-only hardening remains an uncommitted local patch by request. Migration
`0038_feedback_ticket_history_integrity.sql` adds the composite parent FK as
`NOT VALID` to preserve legacy rows/tickets and a caller-RLS `BEFORE INSERT`
trigger with `FOR UPDATE` for current parent version/status and the existing event shape. The
Drizzle schema, journal and focused migration-governance test are aligned;
`7/7` focal governance tests, typecheck, Prettier and `verify:migrations` 39/39
passed. No actor/correlation propagation or live claim was added.

Plan revision note, 2026-08-24 (FEEDBACK-HISTORY-053 audit-context hardening):
the code is consolidated in `06b8f3720a9841d6d2335e51b28a8eb156a9191f`.
Server-owned actor/request/correlation context now reaches feedback writes;
`saveTicket` records a metadata-only `audit_entries` sidecar atomically with
the ticket and state event, and the live fixture asserts history, audit and
rollback when configured. The local bar passed with 134/663/35 skips,
84.28%/80.15%/86.15%/84.99% coverage, 12-workspace build, typecheck, lint,
31/31 E2E, 39/39 migrations and static/documentation gates. The live database,
productive ACL/RLS, browser-to-API-to-PostgreSQL, remote same-SHA workflow,
operations and clinical approval remain unobserved; the final independent
critic is still pending.

Plan revision note, 2026-08-25 (FEEDBACK-055 opening): a fresh security scout
found that the legacy participant `FOR ALL` policy on `feedback_tickets` can
permit direct UPDATE/DELETE in participant context, while the FEEDBACK-054
metadata guard only constrains scope-only staff updates. This is a static
security finding, not live PostgreSQL evidence. The bounded next step is a new
migration plus a distinct staff persistence context, with participant create/
read preserved and response/SLA/notification deliberately out of scope.

Plan revision note, 2026-08-24 (FEEDBACK-HISTORY-053 final critique/remediation):
Wegener returned `CONDITIONAL PASS` without P0 and identified P1 in
client-supplied feedback correlation, event lineage, broad live-fixture
cleanup and weak audit-ID assertions. Commit
`4680675555aac40246b80bc8ef099a7b2252ebfb` made correlation server-owned for
feedback, added migration `0039` for `CRIADO → NOVO` and predecessor status,
scoped cleanup to ticket/scope and asserted request/correlation IDs. GREEN
verification now reports 134/665/35 skips, 84.28%/80.13%/86.14%/84.99%
coverage, build, lint, typecheck, 31/31 E2E and 40/40 migrations. Live
PostgreSQL/RLS/grants, production, remote same-SHA workflow and clinical
approval remain unobserved; the next step is a clean control-plane commit and
selection of the next local P1, not a release declaration.
