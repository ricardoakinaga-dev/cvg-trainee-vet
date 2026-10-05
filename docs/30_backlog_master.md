# BACKLOG MASTER — CVG

Backlog operacional vivo. Itens só podem avançar quando suas dependências e gates estiverem satisfeitos.

## 2026-09-06 — Programa Premium / State of the Art / Triplo AAA

O backlog executável de evolução premium foi consolidado em:

- `BRIEFING/03.BUILD/STATE_OF_THE_ART_MASTER_PLAN.md` — plano executivo e
  barra de qualidade AAA;
- `BRIEFING/03.BUILD/0301_roadmap.md` — ondas, fases, gates, dependências e
  caminho crítico;
- `BRIEFING/03.BUILD/0302_backlog_master.md` — tasks `AAA-000`–`AAA-902`,
  critérios de aceite, validação e rollback.

### Estado de controle

- `AAA-000` — `COMPLETED`: plano, roadmap e backlog materializados e ligados
  ao baseline atual;
- `AAA-002` — `COMPLETED`: state, log, backlog operacional e manifesto de
  rastreabilidade sincronizados e verificados;
- `AAA-001` — `WAITING_HUMAN_APPROVAL`: aprovação da barra AAA, metas de
  SLO/RPO/RTO, capacidade, escopo do piloto e autoridade dos gates;
- `AAA-603` — `IN_PROGRESS`: contrato local de CI same-SHA, SBOM CycloneDX,
  manifesto SHA-256 e redaction implementados e testados; execução remota,
  retenção/ACL, assinatura, cache e inspeção do artefato continuam pendentes;
- `AAA-700` — `IN_PROGRESS`: retry bounded, abort, quotas/budget e fallback
  seguro local implementados para IA/embeddings; provider real, custo/latência,
  collector, evals e operação continuam pendentes;
- `AAA-701` — `IN_PROGRESS`: pontos antigos agora são observáveis, drift de
  versão/modelo/hash/escopo é reindexado, órfãos são removidos, no-op não chama
  embedding, payload do scroll é allowlisted e a reconciliação usa advisory lock;
  nova crítica fresh independente (Euler foi encerrado sem parecer) e prova
  PostgreSQL/Qdrant live ainda pendentes;
- execução técnica local corrente: `AAA-101`–`AAA-106`, incluindo migrations
  forward-only `0052`/`0053`, idempotência atômica, projeção de sessão corrente
  e reidratação web; status `IN_PROGRESS` por ausência de prova live;
- `AAA-106` permanece `IN_PROGRESS` com recorte local bounded validado: `/operations` e `/authoring` só renderizam
  a superfície interna após resposta autorizada server-side; a API permanece a
  autoridade e o cliente não recebe capability. Typecheck, build de produção
  e E2E focado `11/11` passam; o proxy server-side agora está implementado com
  teste focal `11/11`, foco de autorização `12/12` e E2E completo final `43/43` com
  upstream local que exige cookie; a crítica fresh curta do Round 7 retornou
  `PASS` sem severidade. Cookie HTTPS/expiração, cross-scope, upstream
  produtivo e browser→API→PostgreSQL permanecem gates live; o E2E completo
  atual também revalidou o rail visual e stress de 195px; as fatias locais
  `AAA-200/201` e `AAA-205` foram posteriormente consolidadas com gaps;
- `UI-VIS-001` permanece `IN_PROGRESS` no Gauntlet Round 8 após a matriz visual
  histórica `6/6` e E2E `39/39` contra o build anterior; o novo recorte focal
  de `/operations` adicionou um rail de oito âncoras com `Adicionar
  veterinário` e `Profissionais` em primeiro plano, compactou os estados de
  erro no desktop e os empilhou no mobile, e foi re-renderizado em 1440/768/390
  sem overflow; o stress bounded confirmou cinco rotas em
  390px, um `h1`, alvos >=40px incluindo radio/checkbox nativos associados e
  `.account-actions` populado, reflow em viewport de 195 CSS px como proxy de
  zoom, copy longa e CLS <=0.1. O pacote `.agent/artifacts/frontend-quality-packet.json`
  passou os quatro gates determinísticos. Loading prematuro, contraste P1,
  cabeçalho instável, disabled-state, agrupamento e hierarquia do authoring
  foram corrigidos e rerenderizados; `select:disabled` passa 5.99:1. A crítica
  crítica fresh same-SHA em `.agent/artifacts/ui-visual-critic-2026-09-06-final.md`
  retornou `PASS` para UI-VIS-08 sem P0/P1 visual no recorte; a crítica cega do
  Round 8 confirmou como gap principal a hierarquia de ações e não alterou
  arquivos; a primeira execução pós-mutação revelou clipping na viewport de
  195px, que foi corrigido com fallback responsivo de ações; build de produção
  e E2E completo final `43/43` passaram. Permanecem gaps proxy, live e produção e não
  há claim global de AAA;
- não há autorização implícita para código clínico publicado, deploy,
  produção, participantes reais ou claim de competência.

- `AAA-205` foi fechado localmente com gaps no contrato
  `BRIEFING/03.BUILD/0562_aaa_recovery_resilience_contract.md`: loading/error/empty,
  retry seguro, recuperação one-time, remoção do token da URL e sessão corrente
  estão ligados a testes web/API/E2E. Expiração e revogação em cookie HTTPS real,
  cross-scope, rede real, browser→API→PostgreSQL/RLS e revisão assistiva ainda
  dependem dos gates live e humanos.

- Gauntlet Round 7 foi registrado com evidência local `PASS`, live `BLOCKED` e
  crítica independente `REVISE`; após a reconciliação documental, o fingerprint
  foi rebaselineado e a validação de drift passou, mas a evidência permanece
  `STALE` porque o rebaseline invalida frescura até os gates requeridos serem
  reexecutados.
- Após `AAA-603`/`AAA-700`, um novo rebaseline controlado aceitou o fingerprint
  `aae0dd40f803cde16fcfad76840dbfce70975fd9d7ddc3a85cc897e0bfe61e9f`; a
  validação estrutural passou sem drift, e a evidência anterior continua
  `STALE` até reexecução dos gates remotos/live.
- Após a revalidação visual pós-ajuste e os gates documentais finais, o
  rebaseline do Gauntlet foi executado novamente; o fingerprint corrente foi
  aceito e `validate --check-drift` retornou `valid: true` sem erros. A frescura
  permanece `STALE` por desenho, até gates remotos/live repetidos.
- Depois desse rebaseline, alterações visuais concorrentes em operações,
  recovery e stylesheet produziram drift detectável; a matriz corrente foi
  reexecutada e passou `11/11` em `59,1 s`, com verificação ampla `149` arquivos/
  `808` testes/`42` skips. A evidência está em
  `.agent/artifacts/ui-visual-current-revalidation-2026-09-06.md`; o
  rebaseline controlado desta versão ainda é a próxima ação de governança.

### Quality bar AAA

O programa só avança com evidência corrente de segurança, integridade,
acessibilidade, jornada real, conteúdo clínico revisado, operação, recuperação,
traceability e auditoria independente. Cobertura ou build verdes não compensam
um P0/P1, um gap clínico ou ausência de prova no boundary correto.

Este overlay não reclassifica silenciosamente os itens históricos abaixo; os
gaps legados foram mapeados para as tasks `AAA-*` do backlog BUILD canônico.

### Trust core em execução local — `AAA-101`–`AAA-105`

- `AAA-101`/`AAA-102`: migration `0052` impede exclusão pós-finalização e
  permite leitura do participante em sessão `FINALIZADA`; a regressão de
  leitura fresca preservando resposta/contagem passa localmente; PostgreSQL/RLS
  live ainda não executado.
- `AAA-103`: attempts/answers usam insert atômico, lock transacional por chave,
  fingerprint vencedor, conflito CAS nomeado e resposta pública `409`;
  unit/application/API passam; concorrência PostgreSQL live ainda não executada.
- `AAA-104`: migration `0053` registra FKs compostas, orphan scan fail-closed,
  `FORCE RLS` e policies de `content_versions`/`ai_suggestions`; governance
  focal passa `3/3`, com um cenário live skipped.
- `AAA-105`: contrato strict da sessão corrente, limites/default de rotação,
  rota `GET /api/v1/session/current`, reidratação da sessão e E2E sintético de
  recovery passam; cookie, expiração, cross-scope e browser→API→PostgreSQL real
  permanecem gaps.

O grupo permanece `IN_PROGRESS`: evidência local não promove nenhuma task a
`COMPLETED` nem substitui a revisão independente e a prova live autorizada.

### AAA-205 — Resiliência de acesso e recuperação

- status: `COMPLETED_WITH_GAPS`;
- contrato: `BRIEFING/03.BUILD/0562_aaa_recovery_resilience_contract.md`;
- evidência: `.agent/artifacts/aaa-205-recovery-resilience-local-2026-09-06.md`;
- escopo fechado: estados loading/ready/empty/error, retries explícitos,
  recuperação com token removido da URL, sessão server-side e projeções públicas
  redigidas;
- validação: E2E sintético final `43/43` (artefato
  `.agent/artifacts/aaa-200-201-e2e-final-2026-09-06.md`), visual corrente
  `7/7`,
  `corepack pnpm verify` `149/800` e gates documentais/traceability PASS;
- gaps: expiração/revogação live, cross-scope, rede real, browser→API→PostgreSQL/RLS,
  operação externa e revisão assistiva com usuários.

### Execução bounded de experiência visual — `UI-VIS-001`

- status atual: `IN_PROGRESS`, Gauntlet Round 10 e revalidação corrente
  reexecutados bounded; a matriz corrente passou `11/11` em `59,1 s`; o recorte
  UI-VIS-08 histórico tem `PASS` independente bounded e o novo rail de
  `/operations` tem teste focal `1/1` com axe zero;
- escopo: shell, tokens, tipografia, estados, responsividade, motion e assets
  decorativos locais em `apps/web`, sem mudança de contrato, API, domínio,
  conteúdo clínico ou boundary público;
- evidência corrente: `next build`/typecheck web em workspace isolado e
  `tests/e2e/visual-gauntlet.spec.ts` `7/7` contra `next start` local isolado;
  o E2E sintético completo final `43/43` permanece registrado, axe zero nas cinco rotas em
  1440px/768px/390px e no fixture autenticado, loading inicial anunciado,
  estados preenchidos sintéticos de diagnóstico/operação/autoria, sem overflow
  global, traversal completo por Tab, reduced motion efetivo, stress 390px com
  um `h1`, alvos >=40px incluindo labels nativos e variante populada de
  operações, reflow em viewport de 195 CSS px como proxy de zoom, copy longa e
  CLS <=0.1, estados loading/empty/success, captura de falhas
  CSS/pageerror/console, assets HTTP 200 e o pacote de quality gates em `PASS`;
  Round 8: oito âncoras sem overflow em 1440/768/390 e renders hashados em
  `.agent/artifacts/ui-visual-operations-rail-round8.md`; a matriz pós-mutação
  corrente foi confirmada em produção-shaped local depois que o fixture
  sintético foi restaurado;
  a crítica fresh same-SHA confirmou ausência de P0/P1 visual; o relatório está
  em `.agent/artifacts/ui-visual-critic-2026-09-06-final.md`. O item continua
  `IN_PROGRESS` por não fechar AAA-001, live, produção ou clínica;
- Round 9: a crítica fresh encontrou gaps mobile de rail, composição de erro e
  legibilidade secundária; a implementação corrigiu esses pontos com RED/GREEN,
  foco `1/1`, axe zero, rail 2×4 em 390px, retry empilhado abaixo de 480px e
  piso de texto secundário de 14px/line-height 1,4. O build isolado e a suíte
  visual corrente passaram `7/7`; o critic fresh `Beauvoir` retornou `PASS`,
  confiança `0,92`, sem achados materiais. Hashes e limitações estão no mesmo
  artefato Round 8/9;
- Round 10: a revalidação inicial passou `9/9`, mas a crítica fresh `Boole`
  encontrou P1 de escaneamento comprimido em `/operations` mobile e P2s de
  densidade contínua em `/authoring`, selos de atualização repetidos e texto
  secundário fraco. RED/GREEN adicionou cartões de seção no mobile, headings e
  cabeçalhos de tabela mais legíveis, filtros full-width, empty states com
  superfície, agrupamento visual de autoria, contraste reforçado e ocultação
  dos selos derivados repetidos no mobile. O foco passou `2/2` com axe zero;
  `next build` e a matriz visual em `next start` passaram `10/10`; `Chandrasekhar`
  retornou `PASS`, confiança `0,95`, sem achados P0/P1/P2. Hashes, Blender,
  ComfyUI e a indisponibilidade de OpenDesign estão no artefato Round 10;
- Pós-ajuste de 2026-09-06: RED/GREEN corrigiu sticky rail em mobile, superfícies
  de painéis aninhados e nome acessível estável do toggle de autoria. O foco
  passou `3/3`; a matriz segmentada passou `7/7` antes do limite do runner e os
  três cenários finais passaram `3/3`, incluindo reidratação, variantes e stress;
  o artefato é `.agent/artifacts/ui-visual-postfix-2026-09-06.md`. A execução
  única de 44 testes recebeu `SIGTERM` antes do fim, portanto não há claim de
  `44/44`; o item permanece `IN_PROGRESS`.
- Revalidação corrente de 2026-09-06: a matriz completa
  `tests/e2e/visual-gauntlet.spec.ts` passou `11/11` em `59,1 s` após as
  alterações concorrentes; `corepack pnpm verify` passou `149` arquivos,
  `808` testes e `42` skips. Registro:
  `.agent/artifacts/ui-visual-current-revalidation-2026-09-06.md`.
- Round 11 final de 2026-09-06: os P2s da crítica fresh foram reduzidos com
  superfície consistente para vazios de autoria e uma única ação primária no
  command bar. A build/typecheck web passaram, `authoring-review` passou
  `5/5`, a matriz visual completa passou `11/11`, e o critic fresh `Raman`
  retornou `PASS` sem P0/P1, sem clipping/overflow visível. Capturas, hashes,
  Blender MCP, ComfyUI e o transporte fechado do OpenDesign estão registrados
  em `.agent/artifacts/ui-visual-round11-final.md`; o item permanece
  `IN_PROGRESS` por manter live, produção, clínica e AAA-001 fora do recorte.
- checkpoint de continuidade para reset: `.agent/checkpoint-2026-09-06-frontend-visual.md`;
  o runtime atual também mantém `AAA-701` ativo e requer nova crítica fresh
  independente, pois `Euler` foi encerrado sem parecer, antes do rebaseline
  controlado do Gauntlet;
- próxima ação: ler o checkpoint e o estado canônico, abrir nova crítica fresh
  de `AAA-701`, atualizar a evidência e rebaselinear o Gauntlet somente após o
  estado final. Ao retomar o frontend, considerar bounded o gap de
  hierarquia mobile em `/operations` e a ausência de renders canônicos de `/` e
  `/diagnostic`, mantendo `AAA-001`/`CVG_TEST_DATABASE_URL` como dependências
  dos gates live; não iniciar `AAA-203`/`AAA-204` sem contrato ou decisão de
  produto;
- limite: não fecha `AAA-001`, `AAA-400` ou `AAA-401`, nem autoriza produção,
  deploy, publicação clínica ou claim de AAA/perfeição.

### AAA-200/201 — jornada vertical diagnóstico → assignment

- status: `COMPLETED_WITH_GAPS` para a implementação local bounded;
- contrato congelado em `BRIEFING/03.BUILD/0561_aaa_vertical_journey_contract.md`,
  complementando o contrato de sessão `0560`;
- implementação existente finaliza a sessão, persiste o resultado e
  materializa `M01`/`M02`/`M11` mais recomendações válidas no mesmo caminho
  transacional; replay, unicidade `(participant, scope, module)`, promoção CAS,
  proveniência divergente fail-closed, vínculo de atividade publicada e
  projeção redigida sem internals estão cobertos;
- evidência focal pós-correção: `5` arquivos/`25` testes PASS; E2E final
  `43/43` em portas isoladas; `pnpm verify`
  corrente: `149` arquivos/`800` testes PASS, `42` skipped e cobertura
  `84,45%/80,18%/87,30%/85,19%`;
- correção Gauntlet: resposta do endpoint não contém `diagnosticResultId`,
  `assignmentId`, `moduleId`, `participantId` ou `scopeId`; replay com source
  diagnostic ou vínculo de atividade divergente falha fechado;
- gaps: `CVG_TEST_DATABASE_URL` ausente, portanto RLS/concorrência/rollback
  live e browser → web → API → PostgreSQL não foram comprovados; `AAA-202`,
  feedback/debrief, retenção, conteúdo clínico, produção, piloto e release
  permanecem separados e não são promovidos por esta evidência.

**Item concluído mais recente da meta 95/100:** `CI-15-01` — Execução remota e reprodutibilidade, reavaliado em 95/100. Itens 1–12 foram reavaliados em 95/100 e os itens 13–14 em 96/100 nos escopos registrados; o item 16 está liberado para abertura.

**Atualização operacional 2026-08-23:** `HARNESS-DB-2026-08-23` foi concluído com gaps controlados; o harness live PostgreSQL/RLS agora separa conexão da aplicação e conexão administrativa de teste, e não mascara ausência de capacidade administrativa. `TRAINING-MANAGEMENT-2026-08-23` foi ampliado com a trilha digital de 24 meses, acompanhamento de evolução no participante, perfil digital por competência/módulo e convite administrativo escopado. `DIAGNOSTIC-PROFILE-2026-08-23` adicionou persistência/RLS do agregado B-07, perfil por tema e rota interna de avaliação técnica sem publicação clínica. `STAFF-DIAGNOSTIC-PROFILE-024` levou o mesmo agregado formativo ao acompanhamento gerencial, com membership participante–escopo, matriz RLS e disclaimer explícito. `ADMIN-LIFECYCLE-025` fechou o ciclo de convite/reenvio/status/sessões com CAS, filtro de conta ativa e live PostgreSQL; o hardening posterior limitou reenvios ao escopo pedido, serializou concorrência por conta e corrigiu ações da UI em múltiplos escopos. `CPD-REPORTING-026` materializou o relatório interno de participação digital com filtros server-side e limites explícitos de não credenciamento. `REPORT-040` adicionou paginação bounded, tabela de participantes e exportação CSV da página autorizada; a validação completa local passou em 2026-08-24. `EDITORIAL-QUEUE-027` materializou a leitura backend da fila editorial por escopo, com contrato redigido, capability separada, limite explícito sem promessa de cursor, RLS editorial, ações role-aware e live PostgreSQL. `ACCOUNT-RECOVERY-028` fechou recuperação controlada por link único para contas ativas, com hash-only, revogação de sessões, consumo atômico, sessão nova, UI `/recovery`, live PostgreSQL e E2E 19/19; `IDENTITY-RLS-029`/`030` fecharam RLS direto de convites, recuperação, contas e sessões; `AUDIT-NEGATIVE-031` fechou a representação e a emissão centralizada de rejeições HTTP sem segredo; `DB-PRIVILEGE-032` ampliou o healthcheck para negar ownership e grants administrativos à role de aplicação. O pipeline pós-mudança passou com cobertura global acima de 80%, build dos 12 workspaces e E2E; workflow remoto, provedor/MFA/entrega externa, grant matrix do ambiente produtivo e gates clínicos/operacionais permanecem explícitos. A pesquisa atual está registrada em `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`.

**Atualização operacional 2026-08-23 (IDENTITY-RLS-029/030):** `account_invitations`, `account_recovery_requests`, `accounts` e `sessions` agora têm `ENABLE/FORCE RLS` com contextos transacionais de escopo, provisionamento ou hash apresentado; a aplicação continua sem `SUPERUSER`/`BYPASSRLS`. Os gates técnicos passaram; grants de produção, provedor/MFA, entrega externa e gates clínicos/operacionais permanecem explícitos. A auditoria negativa uniforme foi fechada em `AUDIT-NEGATIVE-031`.

**Atualização operacional 2026-08-24:** a verificação local fresca no HEAD `9a2e07a` passou com Node `22.22.0`/pnpm `10.33.0`, 123 arquivos/560 testes, 28 testes skipped, cobertura 84,50% statements/80,34% branches/85,91% functions/85,24% lines, contratos 70/70, worker 25/25, migrações 26/26 e gates estáticos limpos. `origin/main` está em `fbbc692`, 39 commits atrás; a evidência remota não cobre o SHA local. Três leituras independentes confirmaram a lacuna diagnóstico→atribuição; `ADAPTIVE-044` foi aberto para uma fatia bounded, sem liberar publicação, piloto ou produção.

**Abertura operacional 2026-08-24 (FEEDBACK-054):** após o fechamento documental de `APPEAL-043` no commit `4b79b695ad7ecf50d4468d484c11faa262c37777`, foi selecionada a próxima lacuna P1 local bounded: permitir que a fila interna registre prioridade e responsável opcional dentro do mesmo escopo, com versão otimista e histórico coerente. A fatia não cria resposta ao participante, SLA, notificação, anexos, retirada clínica, contestação, provider/MFA ou operação externa; PostgreSQL/RLS live, grants, workflow remoto, produção e aprovação clínica continuam gates separados.

**Abertura operacional 2026-08-25 (FEEDBACK-055):** baseline atual no HEAD `29e990b` passou `pnpm verify` sob Node `22.22.0`/pnpm `10.33.0` efêmeros; o preflight live continua sem banco autorizado. Crítica independente encontrou uma lacuna de integridade: a policy legada de `feedback_tickets` é `FOR ALL` para contexto de participante, enquanto o guard de metadata só protege o ramo staff. Foi aberta a correção bounded para negar UPDATE/DELETE do participante e separar o contexto de mutação staff, sem alterar a API pública ou inventar resposta/SLA/notificação.

**Fechamento local operacional 2026-08-26 (FEEDBACK-055):** RED/GREEN/REFACTOR passou no focal com 3 arquivos/28 testes; a migration 0042 substitui a policy participante por SELECT/INSERT explícitos, nega UPDATE/DELETE por ausência de policy, separa `LearningStateStaffContext` e atualiza o guard staff para status-only ou metadata-only. O commit local é `54b28f6c75a44408fe91b0d0f54689d86fd4a62f`; `pnpm verify:migrations` passou com 43/43; format, lint e typecheck passaram. O `pnpm verify` final passou com 141 arquivos de teste PASS, 29 skipped, 698 testes PASS, 35 skipped, cobertura 84,31%/80,33%/86,34%/85,00%, contratos 86/86 e worker 27/27. O preflight live encerrou com exit 2 por ausência de `CVG_TEST_DATABASE_URL`; não há evidência live. Item segue `COMPLETED_WITH_GAPS`/`READY_FOR_NEXT_STEP`, sem claim live, release, produção ou aprovação clínica. Auditoria: `BRIEFING/04.AUDIT/0539_feedback_ticket_write_isolation_audit.md`.

**Fechamento live operacional 2026-08-26 (FEEDBACK-055/LIVE-056):** os commits `16af141becf96616676fffcfdab6f31c1835b7a2` e `b66acc125fac0e022ce5837c4eb14d1eca862401` consolidaram as migrations 0048–0050, o oracle contextual participante+escopo, o histórico de feedback owner-scoped, a integridade de `activity_assignments`, a exclusão de conteúdo misto e a serialização adaptativa. Em banco PostgreSQL 16.15 descartável recriado, `pnpm test:integration:live` passou com 35 arquivos/75 testes; `pnpm verify` passou com 141 arquivos/708 testes PASS, 29 arquivos/37 testes skipped e cobertura 84,36%/80,35%/86,35%/85,05%, contratos 86/86, worker 27/27 e migrations 51/51. O item fica `COMPLETED_WITH_GAPS`: o teste usa grants DML amplos próprios do harness, portanto least privilege/owners produtivos, workflow remoto same-SHA, diagnóstico→assignment, cenário browser cross-scope, escala/failover/restore/collector, resposta/SLA/notificação e aprovação clínica continuam pendentes. A extensão browser→web→API→PostgreSQL foi fechada separadamente em `BRIEFING/04.AUDIT/0541_real_browser_api_postgres_e2e.md`; não há autorização de release.

**Decisão de próxima fatia 2026-08-26:** Ricardo aprovou a Opção A para `JOURNEY-056`: sessão diagnóstica pública própria com checkpoint/retomada, CAS, finalização server-side e atribuição inicial idempotente. O contrato bounded está em `BRIEFING/03.BUILD/0560_jornada_sessao_diagnostica_contract.md`; `FEEDBACK-057` continua separado, sem contrato executável ou schema de resposta. A decisão libera BUILD técnico local, não publicação clínica, piloto, produção, operação externa ou claim de competência.

**Fechamento técnico local 2026-08-26 (`JOURNEY-056`):** a Opção A foi implementada em contratos, domínio, aplicação, PostgreSQL/RLS, API, web e E2E sintético, com migration `0051_diagnostic_sessions`, snapshot imutável, CAS/idempotência, finalização transacional e atribuição inicial server-side. A revisão independente corrigiu a corrida de START concorrente, tornou o catálogo draft explicitamente opt-in, alinhou o replay de resposta atrasada após finalização e fechou DML de respostas pós-finalização e identidade composta sessão–resultado. `pnpm verify` passou com 147 arquivos/770 testes PASS, 30 skipped/39 testes, cobertura 84,31%/80,13%/87,08%/85,07%; build 12/12, E2E sintético 33/33, migrations 52/52 e gates estáticos passaram. Auditoria `BRIEFING/04.AUDIT/0550_diagnostic_session_audit.md` classificou `CONDITIONAL PASS / COMPLETED_WITH_GAPS`; os commits técnico `f247bd578abcd50ce7ecd85109fb567462c3c2f9`, documental `ca2bb58` e de verificação final `b77269ec8c45d1565524ff400ad74e11cc5acaa8` foram publicados em `origin/main`. O live PostgreSQL/RLS e o E2E browser→web→API→PostgreSQL desta jornada permanecem condicionais por ausência de banco autorizado. Não há autorização de publicação clínica, piloto, produção, deploy, release ou claim de competência.

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
- resultado: item 12 reavaliado em **95/100**; marcador sintético restaurado em destino isolado. A duração de 2.581 ms cobre dump, criação do destino, restore e leitura do marcador; é parcial e não representa RTO operacional.
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
- evidência de fechamento: focal ampliado `18/18`, worker `31/31`, `pnpm verify` `142` arquivos/`730` testes PASS com `29` arquivos/`38` testes skipped e cobertura `84,42%`/`80,33%`/`86,46%`/`85,15%`; build `12/12`, E2E `32/32`, audit high, diff-check e `verify:traceability:release` PASS. A coordenação entre boot e `reconcile:qdrant` foi verificada por barreira deferred e promessa compartilhada; Linnaeus revisou o SHA final sem P0/P1 e manteve `CONDITIONAL PASS`, registrando P2 de cenário integrado/close lento/retry bounded. Não há evidência live de outage.
- gaps remanescentes: verificação live com Qdrant indisponível, startup/restart/carga/failover e operação externa ainda não observados; retry de boot ainda não tem limite/backoff/jitter; readiness ainda não valida literalmente migration/schema; o achado separado de identidade em learning-state continua em análise
- próxima ação: aguardar a decisão humana A/B de `JOURNEY-056`; manter a operação de reconciliação sob o comando explícito e tratar retry limitado/backoff, migration/schema readiness e outage live como novas fatias bounded, sem declarar release

### OPS-061-READINESS-007 — Retry sem duplicação e encerramento do índice opcional

- título: impedir retry obsoleto após recuperação explícita e provar encerramento ordenado durante inicialização lenta
- descrição: coordenar o timer de retry do worker com o modo aguardável usado por `reconcile:qdrant`; uma recuperação explícita bem-sucedida deve cancelar retry pendente, enquanto `close()` deve aguardar a tentativa em voo e não deixar timer ou rejeição não tratada
- módulo: worker / integrações / operações / testes
- dependência: `OPS-061-READINESS-006`; auditoria `BRIEFING/04.AUDIT/0547_readiness_degraded_startup_audit.md`; SPEC 0112/0113/0118
- fase: BUILD — Phase 7 / hardening de assurance local
- risco: médio — tentativas redundantes podem pressionar o índice opcional e um encerramento sem drenagem pode deixar requisições ou rejeições em voo
- impacto: médio
- status: COMPLETED_WITH_GAPS
- critério de pronto: RED reproduz retry pendente e `close()` durante Qdrant deferred; GREEN cancela retry obsoleto após recuperação explícita, `close()` aguarda e o worker mantém falha opcional isolada; regressão, build, audit high, diff-check e rastreabilidade passam sem claim externo
- escopo: `apps/worker/src/main.ts`, `apps/worker/src/main.test.ts`, auditoria, backlog, runtime state, log, plano e manifesto
- fora desta fatia: API de jornada, `JOURNEY-056`, `FEEDBACK-057`, migrations, produto, produção, workflow remoto same-SHA, retry bounded completo/backoff/jitter, banco live e dados reais
- controles obrigatórios: PostgreSQL continua fonte autoritativa; Qdrant/IA não decidem estado; testes não usam dados reais; retry é cancelável; `close()` drena inicialização; RED/GREEN/REFACTOR, revisão independente e rastreabilidade
- evidência de abertura: parecer independente Linnaeus em `0547`; P2 de retry/close; commit de abertura documental e log/state de 2026-08-26
- evidência de fechamento: RED reproduziu a terceira chamada causada por callback obsoleto; a guarda de identidade foi implementada no commit técnico `3cf093e907f7653cac11647a4a604525fee4303c`; worker `5` arquivos/`34` testes PASS, `pnpm verify` `142` arquivos/`733` testes PASS com `29` arquivos/`38` testes skipped e cobertura `84,45%`/`80,34%`/`86,54%`/`85,16%`; build `12/12`, E2E `32/32`, audit high, diff-check e gates documentais PASS; Gauss retornou `CONDITIONAL PASS` sem P0/P1
- gaps remanescentes: integração completa boot+reconcile com PostgreSQL/Qdrant reais, combinação close lento + retry já enfileirado, política bounded de retry/backoff/jitter/classificação, migration/schema readiness e operação live continuam fora desta task
- próxima ação: concluir a nova fatia local bounded `OPS-061-RETRY-008` para fechar `Retry-After` e precedência fail-closed; a decisão humana A/B de `JOURNEY-056` continua separada e nenhum release é declarado

### OPS-061-RETRY-008 — Retry bounded e classificação do índice opcional

- título: impedir tempestade de inicialização Qdrant com política finita, fail-closed e consistente entre API e worker
- descrição: substituir o retry fixo e infinito do bootstrap por uma política compartilhada de classificação pura, limite de cinco tentativas incluindo a inicial, backoff exponencial com cap e jitter injetável, respeito bounded a `Retry-After`, exaustão sem novo timer e telemetria redigida; manter os coordenadores de ciclo de vida separados para API e worker
- módulo: integrações / API / worker / observabilidade / operações / testes
- dependência: `OPS-061-READINESS-007`; SPEC 0112/0113/0118; Runtime 0802/0804
- fase: BUILD — Phase 7 / hardening de assurance local
- risco: crítico — retry infinito e indiscriminado pode pressionar o índice derivado, esconder falha permanente e gerar tempestade entre processos; alterar readiness ou o encerramento pode retirar o núcleo PostgreSQL do tráfego
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: política pura classifica timeout, transporte, 429 e 5xx como retryáveis quando identificáveis; 4xx permanentes, configuração, incompatibilidade de dimensão/schema e desconhecidos não repetem; a sequência usa cinco tentativas totais, backoff exponencial capped, jitter determinístico em teste e `Retry-After` bounded preservado integralmente pela fronteira SDK; `ensureCollection()` aguarda todas as operações irmãs de índice antes de propagar, e uma falha permanente/unknown prevalece sobre qualquer falha retryable no conjunto, sem promessa órfã que possa sobrepor o próximo retry; API e worker mantêm bind/loop não bloqueante, uma promessa em voo, guarda de timer, recuperação explícita e `close()` seguro; exaustão emite evento redigido e não agenda novo timer; RED/GREEN/REFACTOR, focal, regressão, build, audit high, diff-check e rastreabilidade passam sem claim externo
- escopo: `packages/integrations/src/retry.ts`, `packages/integrations/src/retry.test.ts`, `packages/integrations/src/index.ts`, `packages/integrations/src/qdrant.ts`, `packages/integrations/src/qdrant.test.ts`, `apps/api/src/main.ts`, `apps/api/src/main.test.ts`, `apps/worker/src/main.ts`, `apps/worker/src/main.test.ts`, `packages/observability/src/observability.ts`, `package.json`, `pnpm-lock.yaml`, `patches/@qdrant__js-client-rest@1.19.0.patch`, auditoria, backlog, runtime state, log, plano e manifesto
- fora desta fatia: `JOURNEY-056`, `FEEDBACK-057`, migrations, contratos de domínio, health probe com retry interno, reconciliação automática de conteúdo, outbox/event retry, produção, deploy, workflow remoto same-SHA, fornecedor, provider/MFA, dados reais e aprovação clínica
- controles obrigatórios: PostgreSQL continua fonte autoritativa e `/health/ready` continua PostgreSQL-only; Qdrant/IA não decidem estado; classificador fail-closed não registra erro bruto, URL, segredo, stack ou payload; retry só repete `ensureCollection()`; coordenadores não compartilham executor nem orçamento entre processos; timers são canceláveis e callbacks obsoletos são ignorados; chamada explícita pode iniciar novo orçamento bounded após exaustão; testes usam erros/servidores sintéticos
- evidência de abertura: críticas independentes Locke, Tesla e Schrodinger após `OPS-061-READINESS-007`; todas confirmaram retry infinito/linear e classificação indiscriminada como gap P1, sem alterar arquivos
- evidência de fechamento: RED reproduziu o módulo ausente, sexta tentativa API/worker, retry de 401, propagação precoce de índice irmão e a corrida de rejeição concorrente do worker seguida de falha permanente. GREEN focal final passou `5` arquivos/`30` testes, incluindo prova HTTP real de `Retry-After: 120`, precedência fail-closed, cinco tentativas, exaustão, novo orçamento explícito, geração concorrente sem timer residual, close e redaction. Os commits técnicos são `df91513`/`2a95f5c`; `pnpm verify` passou `143` arquivos/`743` testes PASS, `29` arquivos/`38` testes skipped, cobertura `84,47%` statements/`80,35%` branches/`86,62%` functions/`85,24%` lines; contratos `86/86`, worker `37/37`, migrations `51/51`, build `12/12`, E2E sintético `32/32`, audit high, diff-check e gates estáticos passaram. Euclid retornou `CONDITIONAL PASS`, sem P0/P1.
- gaps remanescentes: não há Qdrant/PostgreSQL externo, outage/restart/carga/failover/restore, múltiplas réplicas, collector/retention, workflow remoto same-SHA, provider externo ou ACL/owners produtivos. O patch cobre `Retry-After` delta-seconds; HTTP-date, health probe, outbox e reconciliação automática permanecem fora desta task. Não há claim de release, publicação clínica ou competência prática.
- próxima ação: aguardar a decisão humana A/B de `JOURNEY-056`; não iniciar código, migration ou UX de jornada antes da decisão

### JOURNEY-056 — Sessão diagnóstica participante e atribuição inicial

- título: fechar a jornada participante de diagnóstico formativo sintético até assignment e atividade publicada
- descrição: iniciar, responder, retomar e finalizar o diagnóstico B-07 técnico; derivar identidade/escopo no servidor; persistir resultado de forma idempotente; chamar a atribuição existente e permitir seguir a atividade publicada já vinculada
- módulo: jornada do participante / diagnóstico / assignment / API / web / PostgreSQL
- dependência: `ADAPTIVE-044`; `JOURNEY-045`; `JOURNEY-REL-001`; `JOURNEY-REL-002`; `FEEDBACK-055`; `LIVE-056`; decisão de contrato desta entrada
- fase: BUILD — Phase 2 / jornada do participante
- risco: alto — expor o endpoint interno atual ou persistir resultado sem checkpoint pode vazar identidade/escopo ou deixar diagnóstico e assignment divergentes
- impacto: alto
- status: COMPLETED_WITH_GAPS
- decisão requerida: resolvida em 2026-08-26 por Ricardo: **A — sessão diagnóstica pública própria**, com checkpoint/retomada e finalização server-side
- escopo candidato: diagnóstico formativo sintético, sem pass/fail global, sem nota punitiva, sem publicação clínica, sem currículo completo e sem claim de competência prática; identidade, escopo, módulos e assignment são server-side
- fora desta fatia: conteúdo B-07 clinicamente aprovado, produção/piloto, retenção, notificações, IA/Qdrant, debriefing completo, prática presencial e qualquer autorização clínica
- controles obrigatórios: contrato strict; participante não envia `participantId`/`scopeId`/módulos; checkpoint e finalização idempotentes; PostgreSQL/RLS/CAS; assignment existente preserva provenance; projeção não expõe gabarito, fonte ou campos internos; RED/GREEN/REFACTOR, E2E e gates antes de `COMPLETED_WITH_GAPS`
- evidência de decisão: `docs/20_master_execution_log.md`; `docs/99_runtime_state.md`; `BRIEFING/03.BUILD/0560_jornada_sessao_diagnostica_contract.md`; análise independente do loop; `BRIEFING/03.BUILD/STATE_OF_THE_ART_MASTER_PLAN.md`
- resultado: RED/GREEN/REFACTOR, revisão independente, regressão global, build e E2E sintético concluídos. O caminho público usa apenas campos allowlisted; a atribuição inicial e a relação com o resultado ficam no servidor e na mesma transação.
- gaps remanescentes: prova PostgreSQL/RLS live, concorrência em banco real, browser→web→API→PostgreSQL, grants/owners produtivos, escala/failover/restore/collector, atividade publicada produzida pelo fluxo diagnóstico, revisão/publicação clínica, piloto, produção e release.
- próxima ação: após a revisão de Ricardo e a autoridade operacional correspondente, executar a matriz live em banco descartável e o E2E real. Manter o catálogo draft desligado por padrão e não declarar release.

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

## 2026-09-09 — Overlay Triple AAA (docs 40–43)

Relatório `docs/40_construction_audit_report_2026-09-09.md` (17 itens, média real ~72–75/100; release 25/100). Caminho operacional em `docs/41_executive_plan_triple_aaa.md`, `docs/42_roadmap_triple_aaa.md` e `docs/43_backlog_triple_aaa.md`; o backlog canônico `BRIEFING/03.BUILD/0302_backlog_master.md` permanece vigente.

- Ordem imediata: (1) crítica fresh `AAA-701` + rebaseline Gauntlet; (2) decisão `AAA-001` por Ricardo; (3) `AAA-107` + `AAA-202` em banco descartável autorizado; (4) `AAA-603` remoto same-SHA em paralelo; (5) `AAA-300–305` com Ricardo.
- `AAA-202` segue `BLOCKED` sem `AAA-001` + `CVG_TEST_DATABASE_URL`; `AAA-302–304` e `AAA-802/803` seguem `WAITING_HUMAN_APPROVAL`; nada sintético promove a `COMPLETED`, produção, publicação clínica ou piloto.

## 2026-09-09 — Execução AAA-701/702/703 (evidência fresca)

- Duas críticas fresh REVISE tratadas; `evals.ts` + HITL implementados; `pnpm verify` PASS (151 arq/831 testes, cobertura 84,49/80,3/87,37/85,24); E2E 45/45.
- `AAA-701/702/703` seguem `IN_PROGRESS` (falta 3ª revisão fresh + lives + provider real); `AAA-202` segue `BLOCKED`; clínica/piloto/produção seguem sob autoridade humana.

## 2026-09-10 — Round-10 (terceiro PASS + CI remoto + decisão AAA-001)

- Terceiro crítico PASS; 3 P2 fechados; `pnpm verify` PASS (151/835, 84,49/80,35/87,37/85,24); E2E 45/45 (2×); `docs/44` + `docs/45` (7 itens PROPOSED).
- Lives locais inviáveis (sem docker/postgres/sudo); snapshot no CI remoto via branch `aaa/round-10-verification` para prova same-SHA + lives (PG16/Qdrant). `.gauntlet/` intocado (helper oficial ausente).
- `AAA-603` segue `IN_PROGRESS` até o run remoto; com ele verde, reavaliar itens 6/11/15 e rodar rebaseline oficial.

## 2026-09-10 — Round-11 (0054 + lives 41/111 verdes)

- Migration 0054 + identidade `content-indexer` + source/sink sob a identidade; fixtures lives sob staff ctx; restore via URL operadora.
- Lives descartáveis PG16.15+Qdrant 1.15.5+restore: **41/111**; `verify` **151/840**; E2E 45/45; média **~78/100**.
- Snapshot no CI remoto (branch) com lives; se verde, reavaliar 6/8/9/11/12/14/15.

## REGRAS DE USO

- Atualizar este arquivo sempre que um item mudar de status, prioridade, dependência ou risco.
- Não marcar B-07 como concluído somente por criar o blueprint.
- Não tratar B-07 como bloqueio da SPEC; ele bloqueia baseline e piloto completo por D-101.
- Adicionar imediatamente qualquer nova pendência descoberta durante revisão ou aplicação.
- Usar este backlog junto com docs/99_runtime_state.md e docs/20_master_execution_log.md.

## 2026-09-09 — Overlay MOD-AAA Round-1 (residual exato, formato ID/Priority/Risk/Scope/Files/Acceptance/Tests/Evidence/Status)

### MOD-002 — Migrar runtime de `routeTemplate()` para o registry

- Priority: P1 · Risk: telemetria/rate-limit cegos em 6 rotas (F-REG-001…006)
- Scope: `apps/api/src/server.ts` passa a usar `matchRoute()`; remover lista dupla
- Files: `apps/api/src/server.ts`, `routing/route-registry.ts`
- Acceptance Criteria: gaps F-REG zerados; paridade preservada; E2E verde
- Tests: corpus existente + teste de runtime por rota
- Evidence: pendente · Status: PENDENTE

### MOD-003 — Wirear `RateLimitStore` + guard no servidor (fail-closed default)

- Priority: P1 · Risk: bypass multi-instância
- Scope: `createApiServer` aceita guard por risk class; métricas de rejeição
- Files: `apps/api/src/server.ts`, `security/rate-limit-store.ts`
- Acceptance Criteria: multi-instância com budget único; fail policy explícita
- Tests: teste de integração com fake store + outage simulada
- Evidence: pendente · Status: PENDENTE

### MOD-004 — Extrair primeira feature de `http.ts` (diagnostics)

- Priority: P2 · Risk: God Module 4267 linhas
- Scope: handlers diagnósticos → `features/diagnostics/` (route+handler+schema+policy+presenter+tests), sem regra de negócio no controller
- Files: `apps/api/src/http.ts`, `apps/api/src/features/diagnostics/*`
- Acceptance Criteria: `http.ts` reduzido; comportamento idêntico; coverage mantida
- Tests: mover/ampliar testes existentes · Evidence: pendente · Status: PENDENTE

### MOD-005 — Detector de drift registry↔dispatch

- Priority: P2 · Risk: nova rota sem classificação passa despercebida
- Scope: teste que extrai matchers do dispatch e exige entrada no registry
- Files: `apps/api/src/routing/*` · Acceptance: rota nova sem entrada quebra o gate
- Tests: novo teste de drift · Evidence: pendente · Status: PENDENTE

### MOD-006 — Testes adversariais dedicados (authz bypass, replay, session abuse)

- Priority: P2 · Risk: garantia hoje é documental em parte do perímetro
- Scope: suite `tests/security/*` contra API real sintética
- Files: novos · Acceptance: bypass/replay/cross-scope cobertos
- Tests: novos · Evidence: pendente · Status: PENDENTE

### MOD-007 — OTel tracing real + correlação traceId/spanId

- Priority: P2 · Risk: observabilidade sem traces distribuídos
- Scope: spans HTTP→use-case→transação, sampling configurável, sem payload sensível
- Files: `packages/observability/*`, `apps/api/*`, collector ref existente
- Acceptance: traces fim-a-fim em ambiente descartável · Tests: novos
- Evidence: pendente · Status: PENDENTE

### MOD-008 — Fault-injection test-only + k6 baseline medido

- Priority: P2/P3 · Risk: resiliência não provada sob stress
- Scope: camada de falhas só em teste; rodar k6 e registrar p50/p95/p99/erro
- Files: novos + `tests/load/k6-baseline.js` · Acceptance: baseline registrado
- Tests: novos · Evidence: pendente · Status: PENDENTE

### MOD-009 — Run remoto de `security.yml` + provenance/assinatura em CI

- Priority: P2 · Risk: supply-chain sem evidência remota
- Scope: executar CodeQL/review/SBOM no CI; provenance SLSA; Cosign keyless
- Files: `.github/workflows/*` · Acceptance: artefatos publicados e verificáveis
- Tests: gates existentes · Evidence: pendente · Status: PENDENTE

### MOD-010 — Residual de vulnerabilidades moderadas (vitest dev-only)

- Priority: P3 · Risk: path traversal via vitest browser/mocker (dev-only)
- Scope: acompanhar advisories; upgrade quando patch disponível
- Files: `package.json`, `pnpm-lock.yaml` · Acceptance: `pnpm audit` limpo
- Tests: gates existentes · Evidence: `pnpm audit` 2026-09-09 (2 moderates)
- Status: ACEITO-COM-GAP (dev-only, sem path produtivo)

### MOD-011 — Auditoria RLS tabela-a-tabela + testes live completos

- Priority: P2 · Risk: cobertura RLS por fatias, não total
- Scope: matriz completa + lives negativos (leitura/escrita/cross-scope/ownership)
- Files: migrations + harness · Acceptance: matriz 100% tabelas sensíveis
- Tests: live (requer `CVG_TEST_DATABASE_URL`/AAA-001) · Evidence: pendente
- Status: BLOQUEADO (ambiente live autorizado)

## 2026-09-09 — Overlay MOD-AAA R2 (status pós-closure; veredito NON-AAA honesto no audit v2 §30)

- MOD-002 (registry runtime, P1): CONCLUÍDO — `routeTemplate()` virou adapter, F-REG-001…006 zerados, `verify:routes` 57↔57 no `pnpm verify`.
- MOD-003 (rate-limit distribuído, P1): CONCLUÍDO_COM_GAPS — Redis atômico + guard + trusted proxy + ADR-006 + fail matrix testada; residual MOD-003R (P2): backend Redis operado.
- MOD-004 (decompor `http.ts`, P2): EM_PROGRESSO — error model + feature session extraídos (4267→4181); God Test/Module restantes como ratchets.
- MOD-005 (drift registry↔dispatch, P2): CONCLUÍDO — `verify:routes` bidirecional + vocab + witness, mutation-provado.
- MOD-006 (adversariais, P2): CONCLUÍDO — 51 testes negativos + `adversarial-review-2026-09-09.md` (ADV-2026-09-01 corrigido).
- MOD-007 (OTel, P2): CONCLUÍDO_COM_GAPS — tracing real + degradação + `verify:otel`; collector prod pendente.
- MOD-008 (fault/concurrency/load, P2/P3): CONCLUÍDO (recorte local) — faults test-only, concorrência determinística, pool isolation live (skip sem DB), k6 3000/3000 + `test:load`.
- MOD-009 (same-SHA remoto + assinatura, P2): EM_PROGRESSO — verifier fail-closed + bundle fechado + SBOM validado; runs remotos deste SHA pendentes; signing readiness sem fake.
- MOD-010 (vitest moderates, P3): ACEITO-COM-GAP (inalterado).
- MOD-011 (RLS live total, P2): BLOQUEADO (inalterado; 3 testes novos aguardam DB descartável autorizado).
- Novos gates no `pnpm verify`: routes, complexity, cycles, dead-code, security, otel, release-evidence. P0 = 0, P1 = 0 (justificativa no audit v2 §30).

## 2026-09-10 — Overlay FINAL CLOSURE R2 (docs/48) — status pós-veredito

- AAA-FINAL-001 (God Module): CONCLUÍDO — `http.ts` 4267→1166; 13 features;
  God Test 5099→11 suites (83 testes); budget de arquivo e função com ratchets.
- AAA-FINAL-002 (Coverage/Assurance): CONCLUÍDO_COM_GAP — branch closure,
  6 property tests, mutation 64,84→70,78%; cobertura 85,48/81,39/86,61/86,14
  ABAIXO da meta 90/85/90/90 (RF-01).
- AAA-FINAL-003 (RLS live): CONCLUÍDO — `pnpm test:rls:live` 7/7 em PostgreSQL
  descartável real; pool isolation 10×; owner/grants/FORCE auditados.
- AAA-FINAL-004 (Remote same-SHA): EM_PROGRESSO — push + correções; verde do
  HEAD `19d5ca8` pendente de verificação autenticada (rate limit GitHub API,
  sem `gh`/token) (RF-02).
- AAA-FINAL-005 (Redis multi-instance): CONCLUÍDO — 5/5 em Redis 7.4.1 real
  (5+5/11º, 50 paralelos exatos, fail policy, timeout, trusted/spoofed proxy).
- AAA-FINAL-006 (Staging-like): CONCLUÍDO — stack reproduzível; 5 drills PASS
  (incl. backup/restore RTO 1.375 ms, failover, otel-outage); integration 6/6;
  browser journey 1/1; k6 3000 reqs p95 25,6 ms; 3.018 traces no coletor.
- AAA-FINAL-007 (Adversarial + audit v3): CONCLUÍDO — veredito REVISE.

## Residuais (pós-closure)

- RF-01 P2 cobertura < 90/85/90/90 · RF-02 P2 same-SHA HEAD pendente (externo)
- RF-03 P2 mutation 70,78% < 90% · RF-04 P2 arquivos >1000 linhas
- RF-05 P3 4 advisories dev-only · RF-06 P2 Redis operado em runtime

## 2026-09-10 — Publicação AAA-PROMOTE-001

- RF-01: piso local 90/85/90/90 aprovado nesta revalidação de `7ba0114` com correções de formatação: 90,91/85,00/96,03/91,68; exclusões explícitas em `scripts/coverage-exclusions.mjs`. A evidência não fecha CI remoto nem promove o veredito AAA global.
- RF-02: permanece pendente de prova CI same-SHA; commit/push autorizados nesta rodada.
- RF-05: audit corrente registra 1 low e 3 moderate, sem high/critical; nenhuma dependência alterada.

## 2026-09-10 — FINAL AAA CERTIFICATION (docs/49, freeze `b58c11a`)

- AAA-CERT-001 (Mutation): CONCLUÍDO — raw 89.95%, adjusted 100% verificado, 0 real survivors (`reports/mutation-summary.json`, `docs/quality/mutation-classification-v4.md`).
- AAA-CERT-002 (Same-SHA): MECANISMO CONCLUÍDO, PROVA PENDENTE — verifier autenticado + candidate leg + remote-ci-summary; RF-02 aberto (sem runs/token).
- AAA-CERT-003 (Redis): CONCLUÍDO — Redis 8.10.1 real, 5/5 + restart 2/2 + HTTP A/B, sem fallback silencioso. RF-06 FECHADO.
- AAA-CERT-004 (Freshness): CONCLUÍDO — bundle 18 artefatos + strict validator + scorecard v4 + audit v4 JSON.
- AAA-CERT-005 (Staging+audit v4): CONCLUÍDO — staging --browser fresh, k6 p95 9.8ms, OTel 3017 traces, restore RTO 1,1s, E2E 45/45, audit v4 REVISE (Eng 93/Sec 95/Ops 89).
- Bugs reais corrigidos: restore createdb args (superuser), flagValue espaço, security counts.
- Residuais: RF-02 (remoto, bloqueia promoção), RF-03R (mutação 1 arquivo), RF-04 (arquivos grandes), RF-05 (dev-only), RF-07 (branches +0.03), RF-08 (CodeQL/OSV no SHA). RF-01 FECHADO (coverage PASS).
- AAA-001: segue WAITING_HUMAN_APPROVAL.

## 2026-09-10 — Publicação dos commits de certificação

- RF-02: os 13 commits locais pendentes foram publicados em `origin/main`; HEAD remoto confirmado em `d6d8c00fde661738bef0c4d518b979c23f93ca6c`. A prova same-SHA de CI ainda depende de runs autenticados e permanece aberta.
- AAA-CERT: código e documentação de certificação agora estão disponíveis no remoto; o veredito continua `TRIPLE AAA — REVISE` até RF-02 e aprovação de `AAA-001`.

## 2026-09-11 — FINAL STATE OF ART CLOSURE (docs/50, freeze `15ed926`)

- AAA-FINAL-001 (baseline 0005): CONCLUÍDO.
- AAA-FINAL-002 (mutation expandida): CONCLUÍDO — 5 escopos, adjusted 97.82%, 0 real survivors.
- AAA-FINAL-003 (coverage): CONCLUÍDO — 91.56/86.10/95.94/92.16 com margem.
- AAA-FINAL-004 (complexidade): CONCLUÍDO — 0 fail, preservar com rationale, 1 ratchet justificado.
- AAA-FINAL-005 (Redis runtime): CONCLUÍDO — RESP client + backend explícito + staging sobre Redis.
- AAA-FINAL-006 (same-SHA): BLOQUEADO — sem push/autorização; runs anteriores vermelhos (E2E indeterminado, OSV corrigido).
- AAA-FINAL-007 (evidence): CONCLUÍDO — 18 artefatos strict, self-audit verifier.
- AAA-FINAL-008 (audit v5): CONCLUÍDO — REVISE (Eng 94/Sec 95/Ops 91).
- RF-05 FECHADO (zero advisories). RF-02/RF-03R/RF-04/RF-07/RF-08 abertos. AAA-001 pendente.

## 2026-09-11 — Publicação dos commits de certificação v5

- RF-02: os 13 commits locais pendentes foram publicados em `origin/main`; HEAD remoto confirmado em `3ad480375bbc5f4d79099b1b9c703e6c351096d4`. A prova same-SHA de CI ainda depende de runs autenticados e permanece aberta.
- AAA-FINAL-001..009: código e documentação de certificação v5 agora estão disponíveis no remoto; o veredito continua `TRIPLE AAA — REVISE` até RF-02 e aprovação de `AAA-001`.

## 2026-09-11 — Publicação AAA-V6

- RF-02: os 8 commits pendentes e o commit AAA-V6 foram publicados em `origin/main`; HEAD remoto confirmado em `b3e67bdc731f7d4ff62c2658090b3cc981786e3e`. A prova same-SHA de CI ainda depende de runs autenticados e permanece aberta.
- AAA-V6: audit, baseline, scorecard, verificador e testes estão disponíveis no remoto; o veredito continua `TRIPLE AAA — REVISE` até RF-02/09 e aprovação de `AAA-001`.

## 2026-09-11 — AAA-V7 REMOTE CERTIFICATION (docs/52/53/54, HEAD `3cd7bc3`)

- AAA-V7-001 (baseline 0007): CONCLUÍDO — Node canônico 22.23.2+pnpm 10.33.0; evidência local stale-by-rule vs HEAD (scripts/tests).
- AAA-V7-002/003 (diagnóstico remoto): CONCLUÍDO como UNKNOWN honesto — sem token + API anônima rate-limit 0; último conhecido: quality E2E fail sem logs (RF-09), CodeQL/OSV PASS pós-fix; nada inferido.
- AAA-V7-004 (candidate executável): CONCLUÍDO — triggers + timeout 90 + conteúdo §22 verificados; nunca executado (falta dispatch/tag humano).
- Gate-config SSOT (`config/triple-aaa-gates.json`, G01–G73): CONCLUÍDO — 3 scripts fiados, sem duplicação; piso mutação 0.90→0.95 normativo.
- Verificador: bug real de arredondamento corrigido (raw-means); 25/25 self-tests; manifest sha256 cross-check (P2-EVID-SELF/RF-13 remediado).
- AAA-V7-007 (review v2 fresh): PASS no código, P0=0/P1=0, 4 P2s → RF-10/11/12 aceitos, RF-13 remediado.
- AAA-V7-008 (audit v7): CONCLUÍDO — REVISE (Eng 94.0/Sec 95.0/Ops 90.8; gates 21/52/0).
- AAA-V7-005/006/009: BLOQUEADOS em remoto (RF-02) — freeze e regeneração total sequenciados pós-remote-green.
- P2 agora 9 (RF-02/RF-09 materiais abertos). AAA-001 segue WAITING_HUMAN_APPROVAL. Sem commit nesta rodada (aguardando decisão de publicação).

## 2026-09-17 — Auditoria da construção real

Fonte: `docs/audits/construction-assessment-2026-09-17.md`. Itens novos para triagem; nenhum risco foi aceito ou encerrado automaticamente.

- AUD-0917-A01: IN_PROGRESS — harness fail-closed (histórico NOT_VERIFIED/exit 1) + validação estruturada + fluxo bounded em root isolado (20/20); summary histórico segue não-endorseado; regeneração pendente.
- AUD-0917-A02/A03: IN_PROGRESS — A02 investigado: policy sem consumidores runtime, StartAttempt sem modalidade, contrato UC-006/RF-041/RN-020 localizado; proposta mínima pendente sem impor elegibilidade ao quiz; jornada ponta a ponta e inventário B-07/24 módulos pendentes.
- AUD-0917-A04: WAITING_HUMAN_APPROVAL — reconciliar PRD que permite auto-revisão de Ricardo com SPEC/código que a impede. Qual regra editorial deve prevalecer?
- AUD-0917-A05/A06: IN_PROGRESS — p95 monotônico conectado (32/32) e gate de ciclos com parser TS (6/6) + `pnpm verify` exit 0 (1441/68); restam trustedProxies/deadline, skip inventory, denominador TSX e E2E real.
- AUD-0917-A07: IN_PROGRESS — reconciliação documental desta rodada (checkpoint único, contagens 1441/68, IDs, roadmap IN_PROGRESS); same-SHA remoto pendente.
- AUD-0917-REVIEW: READY_FOR_NEXT_STEP — nova revisão com sentinel estável; crítica final não homologada por drift não isolado. Sem promoção de produto; AAA-001/RF-02/RF-09 preservados.

## 2026-10-01 — Auditoria estática do repositório

Fonte: `docs/audits/repository-audit-2026-10-01.md`. Escopo estático; nenhum teste ou runtime executado. O objetivo da auditoria foi concluído com gaps abertos, sem aceitar riscos nem promover release.

- AUDIT-20261001-01 — IN_PROGRESS, P1: `.github/workflows/candidate.yml` chama `--write-summary`, opção removida dos verificadores de mutação; alinhar workflow e contrato bounded-manifest.
- AUDIT-20261001-02 — IN_PROGRESS, P1: cobertura declarada exclui páginas TSX de `apps/web/app`, em divergência com SOA-QB-v1; atualizar denominador e evidência.
- AUDIT-20261001-03 — IN_PROGRESS, P2: harness de mutação segue symlink em diretório intermediário; validar contenção antes de escrever.
- AUDIT-20261001-04 — IN_PROGRESS, P2: harness reutiliza o digest da primeira fonte para identidades em múltiplos arquivos; calcular e validar por fonte.
- AUDIT-20261001-05 — IN_PROGRESS, P2: `real-runtime.spec.ts` permanece em `testIgnore` também no modo real.
- AUDIT-20261001-06 — IN_PROGRESS: política somativa sem consumidor de runtime encontrado; continuar SOA-14/15 sem alterar o quiz formativo.
- AUDIT-20261001-07 — WAITING_HUMAN_APPROVAL: H-EDITORIAL e H-OPS seguem sem decisão; nenhum valor de PRD/SPEC/SLO foi escolhido.
- AUDIT-20261001-08/09 — IN_PROGRESS, P2: atualizar proveniência/estado após esta revisão; reconciliar ordem de migrations e restore antes de ensaio operacional.
- Evidência de 2026-09-17 permanece histórica; nada nesta entrada afirma testes, CI remoto, banco live ou produção atuais.

## 2026-10-01 — Roadmap e backlog de remediação da auditoria

Planejamento detalhado em [roadmap 58](58_roadmap_repository_remediation_2026-10-01.md)
e [backlog 59](59_backlog_repository_remediation_2026-10-01.md). A trilha
complementa SOA-01–40 e não inicia código.

- AUDIT-REM-01 — READY_FOR_NEXT_STEP, P1: corrigir o contrato bounded-manifest do workflow candidate.
- AUDIT-REM-02 — COMPLETED localmente, P1: denominador inclui TSX/páginas conforme SOA-QB-v1; Browser 61/61, pisos locais 90/85/90/90 atendidos e R05 fresh PASS. `verify:evidence-consistency` global ainda exige mutation run ID real de candidato committed compatível.
- AUDIT-REM-03/04 — WAITING_HUMAN_APPROVAL, P2: contenção/root rebind e caminhos relativos corrigidos; fresh review NOT PASS por adulteração de resultado/inputs sob mesmo UID. Threat model aguardando decisão explícita.
- AUDIT-REM-05 — COMPLETED localmente, P2: E2E selecionável e jornada browser→API→PostgreSQL sintética aprovada em serviço descartável; H-REMOTE segue separado.
- AUDIT-REM-06 — WAITING_HUMAN_APPROVAL: PRD UC-006 define o gatilho, mas SPEC/runtime não definem a fonte de modalidade, versão e histórico; proposta server-side registrada em `docs/decisions/2026-10-02-rem06-summative-eligibility.md`.
- AUDIT-REM-07A — COMPLETED (remediação local): decisão H-EDITORIAL, SPEC/código/testes e revisão fresh PASS alinhados; H-CONTENT continua bloqueando publicação.
- AUDIT-REM-07B — COMPLETED localmente (documental): RNF-015/D-107 RPO ≤1h/RTO ≤4h reconciliados com runbooks e SLO; D3/AAA-001 RPO ≤24h identificado como recomendação proposta que não altera o PRD. AAA-001 continua gate operacional/produção.
- AUDIT-REM-08 — IN_PROGRESS: checkpoint/manifesto atualizados; scorecard novo depende de candidato remediado e estável.
- AUDIT-REM-09 — IN_PROGRESS: contrato `cvg-restore-summary/v2` e drill descartável `0053 → restore → 0054` passaram. O cluster usa socket Unix privado sem listener TCP; marcador, prefixo exato do journal, head final, RLS `ENABLE/FORCE`, owners, role `NOSUPERUSER NOBYPASSRLS` e metadados/predicados das quatro policies foram verificados. O preflight `pg_restore --list`/decode passou para dump válido; um magic header corrompido foi rejeitado antes da criação do alvo, cuja ausência foi confirmada. O catálogo compara estrutura de `content_versions` e `ai_suggestions` com a origem sintética e rejeita drift com journal válido. O fixture também verifica a matriz do provisionador local, default-deny, app role sem ownership/capacidades administrativas e tabela excluída sem acesso. Restam grants e constraints de ambientes autorizados, compatibilidade semântica arbitrária, aprovação do principal privilegiado e prova operacional.
- AUDIT-REM-10 — READY_FOR_NEXT_STEP após dependências: reauditoria do candidato, scorecard atual e fechamento suportado por evidência.
- Dimensões restantes: seguir os critérios existentes SOA-13–40 apontados no crosswalk do roadmap 58; não duplicar nem encerrar tasks SOA.
- Execução desta rodada: documentação de planejamento apenas; testes, build, live e CI remoto não executados.

### Atualização de execução — remediação da auditoria (2026-10-01, 22:34)

- H-EDITORIAL resolvido por Ricardo: autorrevisão no MVP permitida quando a identidade ativa e autorizada coincide com `approvedClinicalApproverId` configurado no servidor. SPEC 0106 e adendo 0191 alinhados; teste de aplicação passou 10/10 em Node 22.23.2 após RED reproduzir o bloqueio. H-CONTENT ainda impede publicação.
- H-OPS resolvido quanto aos alvos: manter RPO ≤1h/RTO ≤4h de RNF-015/D-107. Nenhuma alteração ao PRD; AAA-001 continua gate para aceite operacional/produção.
- H-LIVE: Ricardo autorizou Docker local efêmero, PostgreSQL 16/Qdrant e dados sintéticos com testes e cleanup; H-REMOTE continua sem autorização.
- AUDIT-REM-03/04: correções e testes implementados na lane; 25/25 passou sob Node 24, mas validação canônica Node 22 e crítica independente pendentes. Limite residual: a checagem de caminho não é atômica contra troca maliciosa simultânea por outro processo.
- Follow-up producer REM-03/04 (2026-10-02): teste focal de filesystem passou 4/4 sob Node 22.23.2. Symlink inicial em `reports/` é rejeitado antes da criação de estado; troca observada do diretório pai é detectada por descritores Linux ancorados; falha tardia remove somente arquivos/diretórios identificados como próprios e a raiz temporária; sucesso preserva a raiz candidata. A fixture usa Git local sintético e comandos `pnpm` simulados. Revisão independente continua pendente; permanece a janela mínima entre validação do descritor e syscall contra rename simultâneo pelo mesmo UID.
- AUDIT-REM-05: configuração seleciona `real-runtime` somente no modo real e spec falha fechado sem readiness/PostgreSQL; listagem estática passou sob Node 24. Repetir listagem no Node 22 e executar E2E real somente em stack descartável autorizado.
- AUDIT-REM-01/02: em execução. Não conectar `--bounded-manifest` sem identificar produtor reproduzível; não reduzir floors para TSX.
- AUDIT-REM-09: runbook atualizado para identificar schema/journal, restaurar em destino vazio e aplicar migrations posteriores antes dos writes. O contrato v2 exige SHA válida alinhada ao candidato, marcador verificado, destino isolado e `verificationDurationMs` para o trecho técnico, sem rotulá-lo como RTO. Testes cobrem v1, alias, duração inválida, SHA ausente/stale e isolamento/integridade falsos. O script atual prova clone do schema corrente, não compatibilidade de snapshots históricos.
- O Gauntlet existente `aaa-2026-09-06-r1` foi rebaselineado; evidências anteriores foram invalidadas e AAA-v1 foi preservada. R01–R11 está congelada no ExecPlan desta remediação.
- Estado global: IN_PROGRESS; sem publicação clínica, deploy, produção, push ou workflow remoto.

### Atualização de execução — AUDIT-REM-06/07B/09 (2026-10-02, 12:00)

- AUDIT-REM-06: `WAITING_HUMAN_APPROVAL`; proposta server-side aguarda decisão
  porque PRD define regras, mas SPEC/runtime não contratam as fontes de
  modalidade, versão, módulo e histórico somativo.
- AUDIT-REM-07B: `COMPLETED` localmente; fontes operacionais mantêm RPO ≤1h e
  RTO ≤4h como normativos e distinguem o D3 de 24h como proposta AAA-001.
- AUDIT-REM-09: `IN_PROGRESS`; runbooks reconciliados. Evidência atual limita-se
  a clone sintético da origem no head 0054, sem restore de snapshot antigo ou
  migration posterior.
- Sem testes, live, commit, push, deploy, publicação ou aceite operacional.
  Estado global permanece `WAITING_HUMAN_APPROVAL` por decisões independentes.

### Drill sintético de restore/migration — AUDIT-REM-09 (2026-10-02, 13:25)

- `pnpm verify:restore-migrations` passou em PostgreSQL 16 descartável: a
  origem parou em `0053_aaa_content_integrity`; `pg_dump`/`pg_restore`
  restauraram o banco isolado com marcador; o journal persistido coincidiu
  com o prefixo por hash/timestamp; a migration pendente
  `0054_aaa_content_indexer_service` foi aplicada; o head final coincidiu com
  o repositório. Quatro policies, RLS habilitado/forçado e owners das tabelas
  `content_versions`/`ai_suggestions` foram confirmados. O role de destino é
  `NOSUPERUSER NOBYPASSRLS`. Duração do trecho: 1.764 ms, apenas
  `verificationDurationMs`, sem valor de RTO. Cleanup removeu cluster,
  bancos e arquivos temporários.
- RED/GREEN do planejador e teste live focal passaram 4/4; typecheck, ESLint
  focal, Prettier, `verify:migrations`, `verify:secrets`, sintaxe e
  `git diff --check` passaram. Runbook e traceability atualizados; gates
  documentais serão executados após sincronização.
- **Limitação encontrada:** rodar as migrations históricas com role sem
  `BYPASSRLS` reproduziu recursão na policy `learning_activities` durante a
  migration `0030`; a fixture foi construída pelo principal local
  `postgres`. A migration `0054` pós-restore passou sob o owner de destino
  não superusuário/sem bypass. O principal de migration aprovado em ambiente
  real ainda precisa ser confirmado. Grants de produção, constraints,
  snapshot corrompido e metas operacionais continuam sem prova.
- Estado global segue `WAITING_HUMAN_APPROVAL` por REM-06 e REM-03/04. Não
  houve acesso a banco externo, commit, push, deploy ou produção.

### Follow-up de segurança do drill — AUDIT-REM-09 (2026-10-02, 14:02)

- O critic fresh encontrou P1 de identidade do cluster e P2 de validação
  incompleta das policies. O executor local passou a usar somente socket Unix
  privado, verifica PID/diretório antes de DDL e confirma que a conexão não usa
  TCP; o writer local delega ao mesmo executor.
- As quatro policies agora são verificadas por tabela, comando, role,
  permissividade, contexto `content-indexer`, publicação e vínculo de versão.
  O teste RED reproduziu aceitação de `NOT`; a suíte também cobre `COALESCE`.
  GREEN rejeita ambos, `OR`, `CASE` e funções não permitidas.
- A suíte opt-in passou 7/7 e o script direto retornou PASS com
  `targetIsolated=true`, `privateSocketVerified=true` e
  `verificationDurationMs=1645` para o fixture integral, sem valor de RTO.
  Cleanup removeu cluster, bancos e temporários. A revisão fresh integrada e o
  helper Gauntlet ainda estão pendentes. Persistem grants, constraints,
  snapshot incompatível/corrompido e principal operacional.

### Escopo da policy de publicação — AUDIT-REM-09 (2026-10-02, 14:27)

- Novo teste RED reproduziu aceite quando o vínculo `content_id`/`version` e
  o status publicado apareciam em subconsultas `EXISTS` separadas. O contrato
  agora exige os dois vínculos e `status='PUBLICADO'` na mesma subconsulta da
  versão associada, pelo alias `version_record`.
- Testes de policy passaram 3/3; integração opt-in PG16 passou 7/7. Drill direto
  retornou PASS, socket privado verificado e `verificationDurationMs=1695` para
  o fixture completo. Revisão fresh e Gauntlet ainda pendentes.

### Expressão completa das policies — AUDIT-REM-09 (2026-10-02, 14:42)

- Um teste RED mostrou que a policy de `content_versions` aceitava uma
  subconsulta decoy contendo `status='PUBLICADO'`, sem restringir a própria
  linha. O helper agora compara a expressão catalogada completa, além dos
  metadados de tabela, comando, role e permissividade.
- `content_versions` exige status publicado na linha protegida;
  `ai_suggestions` exige `content_id`, `version` e status publicado na mesma
  `EXISTS`. A suíte opt-in passou 7/7 em Node 22.23.2 e o drill direto retornou
  PASS com `verificationDurationMs=1668` para o fixture histórico completo.
- A revisão fresh read-only ainda está pendente; os gaps de grants,
  constraints, snapshot incompatível/corrompido e principal operacional
  permanecem. Estado global `WAITING_HUMAN_APPROVAL`.

### Precisão da normalização da policy — AUDIT-REM-09 (2026-10-02, 14:50)

- RED adicional mostrou que descartar `::text` globalmente aceitava
  `status::text`, embora essa não seja a expressão catalogada. A normalização
  agora preserva casts e altera somente espaços, pontuação e caixa fora dos
  literais SQL.
- O teste focal passou 3/3; integração opt-in PG16 passou 7/7 em Node 22.23.2.
  O drill direto retornou PASS com `verificationDurationMs=1664` para o fixture
  completo. Permanecem pendentes o critic fresh e os gaps operacionais REM-09.

### Continuidade da revisão — AUDIT-REM-09 (2026-10-02, 15:08)

- A primeira tentativa de crítica fresh read-only foi encerrada sem veredito
  após permanecer `running` por aproximadamente seis minutos. Fingerprints
  antes/depois coincidiram; nenhum PASS foi inferido.
- Próxima ação: obter um novo parecer independente responsivo e, só então,
  sincronizar o helper oficial. REM-09 permanece `IN_PROGRESS`; Gauntlet
  global continua `ACTIVE/FIX_RETEST/STALE`.

### Preflight e rejeição de snapshot corrompido — AUDIT-REM-09 (2026-10-02, 15:19)

- RED exigiu que o drill expusesse preflight válido e rejeição de archive
  corrompido; a integração falhou antes da implementação por ausência dos dois
  resultados.
- GREEN executa `pg_restore --list` e extração/decompressão para SQL temporário
  antes de criar o banco-alvo. Um dump sintético com o primeiro byte do magic
  header alterado é rejeitado; o catálogo confirma que o alvo não existe. O
  arquivo de SQL é removido também em falha.
- Em Node 22.23.2, o teste opt-in de restore passou 4/4, o conjunto
  migration/policy passou 7/7 e o drill direto retornou PASS com
  `verificationDurationMs=1730`. O escopo continua sintético: incompatibilidade
  semântica, grants/constraints, principal operacional e RPO/RTO ainda exigem
  evidência própria.
- Revisor fresh anterior ficou sem veredito; não houve rebaseline. Estado
  global permanece `WAITING_HUMAN_APPROVAL`.

### Estado das críticas e próximo teste — AUDIT-REM-09 (2026-10-02, 15:46)

- A crítica fresh que retornou APPROVE alterou o cache ignorado do Vitest ao
  rodar a suíte; o fingerprint não coincidiu e o parecer foi classificado
  INVALID. O diff Git ficou igual e o cache foi mantido.
- A segunda crítica fresh não retornou veredito após espera/interrupção, mas
  manteve fingerprint idêntico. Não há aprovação independente válida e o
  Gauntlet permanece `ACTIVE/FIX_RETEST/STALE`.
- Próximo teste local bounded: conferir paridade e estado validado das
  constraints no restore das tabelas `content_versions` e `ai_suggestions`.
  Grants e principal privilegiado continuam dependentes de contrato/aprovação
  operacional.

### Paridade de constraints após restore — AUDIT-REM-09 (2026-10-02, 15:51)

- RED/GREEN agora valida estrutura do restore: colunas (tipo, default,
  nulabilidade, identidade/geração), constraints catalogadas/validadas e
  índices válidos/prontos de `content_versions` e `ai_suggestions` coincidem
  entre a origem `0053` e o alvo após `0054`.
- O teste focal de restore passou 4/4 e o drill direto retornou
  `constraintsVerified=true`, `status=PASS`, `verificationDurationMs=1723`.
  A verificação cobre as duas tabelas sintéticas; grants produtivos,
  constraints de outras tabelas e principal de migration seguem em aberto.
- C1 é INVALID por cache criado ao executar testes no review; C2 encerrou sem
  veredito com fingerprint estável. Gauntlet permanece `ACTIVE/FIX_RETEST/STALE`.

### Revalidação bounded — AUDIT-REM-09 (2026-10-02, 16:00)

- A suíte `restore-migrations` passou 4/4 e a suíte opt-in migration/policy
  passou 7/7 com Vitest `--no-cache`; o SHA do cache persistente preexistente
  permaneceu inalterado. O drill direto retornou `status=PASS`,
  `constraintsVerified=true`, `snapshotPreflightVerified=true`,
  `corruptSnapshotAbortVerified=true` e `verificationDurationMs=1762`.
- A evidência limita-se ao fixture PG16 descartável e à comparação das duas
  tabelas de conteúdo. REM-09 permanece `IN_PROGRESS`: grants, constraints do
  restante do banco, incompatibilidade semântica, principal de migration e
  prova operacional continuam abertos. Revisão fresh e sync oficial ainda
  pendem; Gauntlet fica `ACTIVE/FIX_RETEST/STALE`.

### Oracle de divergência estrutural — AUDIT-REM-09 (2026-10-02, 16:19)

- O SPEC 0118 §32 contratava comparação estrutural limitada às duas tabelas;
  RED falhou pela ausência do helper e GREEN passou com
  `restoreIntegrityCatalogMatches` ligado ao drill. Testes rejeitam diferença
  de tipo, definição de constraint/índice, metadados ausentes, constraints não
  validadas e índices não utilizáveis.
- Foco: 6/6 com o teste PG16 opt-in skipped. Conjunto PG16 migration/policy:
  10/10 sem cache persistente. Drill direto PASS em 1774 ms, sintético e sem
  alegação de RTO. Cache Vitest preservado no SHA registrado.
- Crítica fresh C3 terminou sem veredito após cerca de 150 s; fingerprint
  completo pré/pós coincidiu em
  `1175c8824ab98a2924e53d5c97764065a320118c81304cf41cbd5b540393b4c9`.
  Gauntlet permanece stale. Archive semanticamente incompatível, schema
  restante, grants e principal de migration continuam sem prova/contrato.

### Atualização de execução — autorização editorial (2026-10-01, 23:32)

- Contrato: revisor `CLINICAL_APPROVER` ativo e no escopo pode revisar conteúdo de outro autor, mesmo quando sua identidade difere do `approvedClinicalApproverId` configurado. A identidade configurada segue obrigatória para autorrevisão e para publicação. SPEC 0191 explicita esse limite.
- Implementação: capability de aprovação, leitura de autoria, fila e escopos internos permitem revisores clínicos com role e scope; fila mantém filtro por autor para contas apenas `AUTHOR`. A projeção `approveClinically` permanece falsa para autor sem a identidade configurada. `PUBLISH_CONTENT` conserva a comparação de identidade configurada.
- RED/GREEN: os novos testes falharam inicialmente (6 falhas/49 aprovados); após a correção, 5 arquivos unitários passaram, 55/55. `@cvg/application` build e `@cvg/api` typecheck passaram com Node 22.23.2/pnpm 10.33.0.
- Navegador: `tests/e2e/authoring-review.spec.ts` passou 5/5. Listagem Playwright: modo comum 45 specs; modo real 47, incluindo `real-runtime.spec.ts` somente com `CVG_RUN_REAL_E2E=true`. Nenhum runtime real ou serviço live foi iniciado.
- Formatação: Prettier nos arquivos alterados e `git diff --check` passaram. Parecer independente fresh ainda em execução.
- Artefatos: `.agent/artifacts/remediation/editorial-reviewer-red-20261001.log`, `editorial-reviewer-green-20261001.log`, `editorial-api-typecheck-20261001.log`, `authoring-review-e2e-20261001.log`, `playwright-common-list-20261001.log` e `playwright-real-list-20261001.log`.
- Próximo: incorporar o parecer independente; depois continuar REM-01–05, sem promover relatórios históricos de mutação como evidência atual.
- Estado: IN_PROGRESS; H-REMOTE, AAA-001 e H-CONTENT permanecem gates; nenhum commit, push, deploy, publicação ou teste real de runtime.

### Atualização após primeira crítica independente — autorização editorial (2026-10-01, 23:43)

- Parecer fresh: nenhum P0/P1. Um P2 observou que `CLINICAL_APPROVER` sem `MODERATOR`/`ADMIN` aprova conteúdo de outro autor, mas não solicita ajustes.
- Resolução contratual: SPEC 0111 já separa `APPROVE_CLINICAL_CONTENT` de `MODERATE_CONTENT`. O adendo 0191 e SPEC 0106 agora registram que revisor clínico distinto pode aprovar conteúdo de outro autor; `SOLICITAR_AJUSTES` continua exigindo `MODERATE_CONTENT` (`MODERATOR`/`ADMIN`). Nenhuma capacidade de moderação geral foi ampliada.
- Regressões: 56/56 focais em Node 22.23.2; incluem negação de ajustes ao papel clínico isolado, correspondência self-review divergente, campos de identidade forjados no corpo, linhas de fila com escopo cruzado e retorno de item de outro autor para `AUTHOR` isolado.
- Estado: IN_PROGRESS até segunda revisão fresh e registro dos gates de documentação/rastreabilidade.

### Atualização de execução — AUDIT-REM-07A (2026-10-01, 23:46)

- O parecer inicial está registrado em `.agent/artifacts/remediation/editorial-independent-review-20261001.md`: zero P0/P1; observação P2 tratada como esclarecimento da capability normativa, sem ampliar moderação geral.
- SPEC 0111, 0106 e 0191 agora descrevem a mesma fronteira: aprovação clínica distinta por role+scope; solicitação de ajustes por `MODERATE_CONTENT`; self-review sob identidade configurada; publicação com gate separado.
- Suíte focal: 56/56 passou em Node 22.23.2. A segunda revisão fresh da regra clarificada está em andamento; documentação/rastreabilidade ainda requer validação.
- Estado global: IN_PROGRESS; H-CONTENT, H-REMOTE e AAA-001 permanecem gates independentes.

### Revalidação integrada — 2026-10-02

- **REM-01:** o produtor de mutação executa a cópia arquivada de `HEAD`,
  verifica igualdade dos controles locais, registra hashes de entradas de
  teste/configuração e encadeia relatório → manifesto → fechamentos → resumo.
  Triple AAA e release evidence estrito exigem o run ID corrente. As integrações
  focais passaram 63/63; o produtor Stryker real ainda não foi executado porque
  os controles do worktree divergem de `HEAD`.
- **REM-02:** cobertura executou 209 arquivos, 1461 testes PASS e 68 skips; exit
  1 pelos pisos inalterados: 76,24% statements, 66,22% branches, 79,09%
  functions, 77,20% lines. Inventário: 174 incluídas/207 excluídas.
- **REM-03/04/05:** focais de harness e seleção comum/real foram verificados em
  Node 22; ausência de runtime real falhou fechado. O crítico fresh integrou
  a revisão de proveniência e não encontrou P0/P1/P2 após o ajuste standalone.
  Browser→API→PostgreSQL real segue pendente.
- **REM-07A:** projeção de `SOLICITAR_AJUSTES` é allowlisted; hold clínico é
  imposto na persistência/materialização; chamada interna direta não grava
  `PUBLICADO` (26/26 testes editoriais e de persistência). H-CONTENT permanece
  ativo. Parecer independente integrado retornou PASS após o fechamento do P2
  de replay de bundle strict; o diretório de candidato não é enviado para
  recomputação pós-job.
- Typecheck, Prettier, contrato CI, release evidence self-test, sintaxe Node e
  `git diff --check` passaram. Sem commit, push, workflow remoto ou publicação.

### Atualização de execução — 2026-10-02 (03:57)

- **AUDIT-REM-03/04 — IN_PROGRESS:** uma revisão fresh encontrou leitura de
  relatório sujeita a troca por symlink e entradas FIFO sem limite. Os caminhos
  de proveniência, manifesto CLI e controles do producer agora são lidos por
  descritores `O_NOFOLLOW|O_NONBLOCK`; focais passaram 29/29 em Node 22.23.2.
  A terceira revisão independente segue pendente; a janela mínima de rename
  simultâneo pelo mesmo UID permanece explícita.
- **AUDIT-REM-05 — COMPLETED localmente:** seleção comum/real passou em Node
  22.23.2 (45/8 e 46/9). A jornada browser→web/proxy→API→PostgreSQL 16
  descartável passou 1/1, com persistência, submissão e retomada verificadas.
  A fixture provisionou somente estado sintético sem revisão/publicação
  editorial; H-CONTENT permanece ativo. Dez eventos de auditoria append-only
  foram removidos junto com o container descartável `--rm`; portas liberadas.
- **AUDIT-REM-02:** continua IN_PROGRESS e vermelho; medição integrada atual
  85,88/77,95/88,99/87,18 contra 90/85/90/90, após incluir jornadas Chromium
  de participante (tentativa e feedback), operações e criação editorial
  sintética sem reduzir os pisos.
  **AUDIT-REM-01:** Stryker real aguarda candidato committed compatível;
  `verify:evidence-consistency` falha fechado enquanto não houver run ID de
  mutação corrente.
- Estado global IN_PROGRESS; sem commit, push, dispatch remoto, deploy ou
  publicação clínica. `.gauntlet/` não foi aberto nem alterado nesta execução.

### Atualização de execução — 2026-10-02 (04:17)

- **AUDIT-REM-03/04 — IN_PROGRESS:** nova crítica fresh encontrou P2 de root
  rebinding com restauração por descritor destacado e bypass de proveniência
  que podia retornar `KILLED`. Ambos foram reproduzidos em RED (1 falha/20
  skips cada) e corrigidos. A raiz agora é vinculada por dev/inode, restauração
  é recusada após deslocamento e fixture sem proveniência retorna
  `TEST_ONLY_KILLED`; write de resultado usa publicação atômica. Três suítes
  focais passaram 31/31; revisão fresh atual aguarda retorno.
- O lint focal, typecheck e testes de regressão passaram. A auditoria global de
  cobertura continua em 76,24/66,22/79,09/77,20 contra 90/85/90/90; REM-02 não
  avançou para PASS. REM-05 continua concluída localmente; H-REMOTE, AAA-001 e
  H-CONTENT permanecem gates.
- Estado global IN_PROGRESS, sem commit, push, dispatch remoto, deploy ou
  publicação clínica.
- Typecheck, ESLint sobre código, Prettier, traceability, documentation,
  ci-contract, product-definition, exposure, secrets, sintaxe, JSON do ledger
  e diff-check (com `.gauntlet/` excluído) passaram sob Node 22.23.2.

### Atualização de execução — 2026-10-02 (04:43)

- AUDIT-REM-03/04 permanece IN_PROGRESS: revisão fresh encontrou P1 de inputs
  de teste/configuração alteráveis entre baseline e mutantes e P2 de root
  substituível por diretório comum. RED reproduziu os dois cenários e o `KILLED`
  aninhado test-only misto; GREEN prendeu o root por descritor, ancorou o cwd
  do Vitest ao FD e compara todos os digests de runner inputs após baseline e
  cada mutante. A restauração verifica os bytes originais de todos os sources;
  erro de contenção encerra a sequência. Três suítes passaram 34/34.
- A nova crítica independente do estado corrigido está pendente. O limite de
  rename simultâneo pelo mesmo UID continua explícito; não há PASS atual de
  review.
- ESLint focal, typecheck, Prettier/`format:check`, CI contract, traceability,
  documentation, product-definition, exposure, secrets, audit-consistency,
  release-evidence self-test, sintaxe e diff-check excluindo `.gauntlet/`
  passaram sob Node 22.23.2.
- REM-02 segue abaixo dos pisos globais congelados; REM-01 aguarda candidato
  committed para Stryker real; REM-05 concluiu localmente o E2E descartável
  1/1. Estado global IN_PROGRESS; sem commit, push, dispatch, deploy ou
  publicação clínica.

### Atualização de execução — 2026-10-02 (05:06)

- A crítica fresh Bohr retornou NOT PASS (high) por `--config` absoluto que
  seguia um root substituto em uma troca temporária. RED reproduziu o carregamento
  do teste substituto mesmo com cwd preso ao descritor. GREEN rejeita config
  absoluta no modo descriptor-backed; provenance estrita usa Vitest e reporter
  por caminhos relativos ao root lease. Três suítes passaram 35/35.
- Nova revisão independente dos caminhos relativos está em andamento. O limite
  de snapshots por checkpoint contra alteração transitória revertida pelo mesmo
  UID permanece declarado; nenhuma conclusão de review foi promovida.
- ESLint focal, typecheck, Prettier, sintaxe Node e diff-check excluindo
  `.gauntlet/` passaram sob Node 22.23.2. REM-02 continua abaixo dos pisos;
  REM-01 aguarda candidato committed para Stryker real; REM-05 permanece
  concluída localmente. Estado global IN_PROGRESS.

### Atualização de execução — 2026-10-02 (05:21)

- **AUDIT-REM-03/04 — WAITING_HUMAN_APPROVAL:** Bernoulli concluiu fresh review
  como NOT PASS — P2. O root rebind por caminhos absolutos foi fechado; código
  sob o mesmo UID ainda pode trocar o relatório JSON temporário ou alterar e
  restaurar runner inputs entre leituras de digest. A task define contenção e
  integridade, mas não esclarece se testes candidatos são adversariais. O
  usuário foi consultado para escolher isolamento ou confiança explícita com
  limitação documentada. Nenhum teste foi executado pelo reviewer.
- A revisão não muda os resultados anteriores: suítes focadas 35/35; cobertura
  global continua 76,24/66,22/79,09/77,20 contra 90/85/90/90; Stryker real
  aguarda candidato committed compatível; REM-05 segue concluída localmente.
- Estado desta decisão: WAITING_HUMAN_APPROVAL; sem commit, push, dispatch
  remoto, deploy ou publicação clínica. `.gauntlet/` não foi acessado.
- next_action: obter a decisão de threat model, implementar e rever a alternativa
  escolhida, depois retomar os gates independentes de REM-02/01.

### Validação documental — 2026-10-02 (05:26)

- Sob Node 22.23.2 passaram traceability, documentation, audit-consistency, CI
  contract, release-evidence self-test, Prettier dos documentos, JSON do ledger
  e `git diff --check` (sem acessar `.gauntlet/`). O estado permanece
  WAITING_HUMAN_APPROVAL para a escolha do threat model REM-03/04.

### Atualização de execução — 2026-10-02 (08:07)

- **AUDIT-REM-02 — IN_PROGRESS:** Browser completo 38/38; três jornadas
  sintéticas de Operações cobrem projeção formativa individual, fila de
  contestação somente leitura e relatórios educacionais/agregados escopados.
  Cobertura integrada: 87,36/81,89/91,15/88,71 contra pisos congelados
  90/85/90/90; o piso de functions passa, enquanto statements, branches e
  lines seguem abaixo. Inventário mantém 174 incluídas/212 excluídas.
- Typecheck, ESLint focal, Prettier focal, secret scan e diff-check passaram.
  `verify:evidence-consistency` segue FAIL fechado porque o producer Stryker
  real aguarda candidato committed compatível e não há mutation run ID atual.
- Estado global WAITING_HUMAN_APPROVAL pelas decisões/gates já registrados;
  REM-02 continua em execução. Gauntlet sem round/critic novo e stale até
  sincronização/rebaseline. Sem commit, push, dispatch remoto, deploy ou
  publicação clínica.

### Validação e continuidade — 2026-10-02 (08:16)

- Traceability, documentation, audit-consistency, product-definition,
  exposure, CI contract, Prettier, secrets, JSON e diff-check passaram.
- `verify:coverage-floor` mantém inventory 174/212 e REM-02 abaixo em
  statements/branches/lines; functions passa. `verify:evidence-consistency`
  falha fechado porque não existe ID real de mutation run corrente.
- Gauntlet `aaa-2026-09-06-r1` rebaselined após esta sincronização;
  `validate --check-drift` retornou válido sem erros. Estado ACTIVE /
  FIX_RETEST / STALE em sete rounds; nenhum critic ou round novo. REM-02 segue
  IN_PROGRESS e o estado global segue WAITING_HUMAN_APPROVAL.

### Continuidade REM-02 — 2026-10-02 (08:32)

- Browser Mode passou 39/39 em cinco arquivos. A jornada do participante
  retoma uma tentativa sintética já `SALVA`, mostra a resposta persistida,
  aceita uma atualização e conclui a reflexão. A mesma projeção valida dados
  sintéticos de percurso, perfil, diagnóstico formativo e runtime M01.
- Cobertura: 215 arquivos, 1521 testes PASS e 68 skipped em 36 arquivos;
  87,53/82,41/91,59/88,88 contra pisos imutáveis 90/85/90/90. O inventário
  segue 174 incluídas/212 excluídas; functions passa e statements, branches e
  lines permanecem abaixo dos pisos. Typecheck, ESLint, Prettier, secrets e
  diff-check passaram. REM-02 continua IN_PROGRESS.
- O fingerprint do Gauntlet é sincronizado após o checkpoint, mantendo
  ACTIVE/FIX_RETEST/STALE em sete rounds, sem critic ou round novo.
  `verify:evidence-consistency` permanece
  fail-closed sem run ID de mutação real; a escolha humana same-UID REM-03/04
  segue aberta. Sem commit, push, dispatch, deploy ou publicação clínica.

### Validação documental — 2026-10-02 (08:36)

- Typecheck, ESLint focal, `format:check`, Prettier focal, secret scan,
  diff-check, traceability, documentation, audit-consistency,
  product-definition, exposure, CI contract e parse do ledger JSON passaram.
- `verify:coverage-floor` confirma 174 fontes incluídas/212 excluídas;
  functions passa em 91,59%, statements/branches/lines permanecem abaixo dos
  pisos. `verify:evidence-consistency` segue fail-closed sem um mutation run ID
  genuíno de candidato committed compatível.
- REM-02 e o estado global mantêm seus estados atuais: IN_PROGRESS e
  WAITING_HUMAN_APPROVAL, respectivamente. O Gauntlet continua
  ACTIVE/FIX_RETEST/STALE em sete rounds; helper oficial e
  `validate --check-drift` passaram sem erros. Rebaseline não é review nem
  PASS.

### Checkpoint Gauntlet — 2026-10-02 (08:43)

- `aaa-2026-09-06-r1` foi rebaselined pelo helper oficial após esta
  sincronização; `validate --check-drift` retornou `valid: true`, sem erros.
  O run continua ACTIVE/FIX_RETEST/STALE em sete rounds, sem critic fresh ou
  novo round. Nenhum status de remediação, piso ou decisão humana mudou.

### Continuidade REM-02 — 2026-10-02 (09:08)

- **AUDIT-REM-02 — IN_PROGRESS:** Browser completo 46/46 em cinco arquivos.
  As novas jornadas cobrem a fila editorial escopada somente leitura,
  exportação CSV com BOM e neutralização de fórmula, trilha de auditoria
  paginada, rejeição de contrato/retry, negação 401/403 redigida, recuperação
  de conta confirmada e reenvio de convite no escopo autorizado. Cobertura:
  88,40/84,03/92,47/89,76 contra os pisos congelados 90/85/90/90; functions
  passa e statements/branches/lines seguem abaixo. Inventário: 174/212.
- Typecheck, ESLint focal, Prettier focal, `format:check`, secrets e diff-check
  passaram. `verify:evidence-consistency` confirma cobertura e segue FAIL
  fechado somente sem mutation run ID real de candidato committed compatível.
- Estado global permanece WAITING_HUMAN_APPROVAL; REM-03/04 aguarda decisão
  same-UID. O Gauntlet não recebeu round ou crítica nova; após sincronizar os
  documentos, rebaselinear e validar drift. Sem commit, push, dispatch remoto,
  deploy ou publicação clínica.

### Validação documental e Gauntlet — 2026-10-02 (09:12)

- Traceability, documentation, audit-consistency, product-definition,
  exposure, CI contract, Prettier documental, `format:check`, secrets, ledger
  JSON e diff-check passaram. Browser 46/46, typecheck e ESLint focal passaram.
- Coverage-floor confirma 174/212; functions passa em 92,47%, enquanto
  statements 88,40%, branches 84,03% e lines 89,76% continuam abaixo dos
  pisos congelados. Evidence-consistency valida cobertura e falha somente
  pela ausência do mutation run ID genuíno.
- Gauntlet `aaa-2026-09-06-r1`: helper oficial e `validate --check-drift`
  passaram sem erros; estado ACTIVE/FIX_RETEST/STALE em sete rounds, sem
  critic ou round novo. REM-02 segue IN_PROGRESS; decisão same-UID mantém o
  estado global WAITING_HUMAN_APPROVAL.

### Continuidade REM-02 — 2026-10-02 (09:43)

- **AUDIT-REM-02 — IN_PROGRESS:** Browser Chromium 48/48 em cinco arquivos;
  nova jornada cobre 403 na solicitação de ajustes sem vazamento do detalhe,
  decisão ou publicação. Cobertura integrada 88,52/84,15/92,56/89,89 contra
  pisos congelados 90/85/90/90; functions passa, statements/branches/lines
  continuam abaixo. Inventário mantém 174 incluídas/212 excluídas.
- Typecheck, ESLint e Prettier focais passaram sob Node 22.23.2. A cobertura
  passou 1530 testes em 215 arquivos; 68 testes foram skipped em 36 arquivos.
  Evidence-consistency valida o resumo, mas continua fail-closed sem mutation
  run ID real de candidato committed compatível.
- REM-03/04 aguarda decisão same-UID; o helper oficial rebaselineou o
  Gauntlet e `validate --check-drift` retornou `valid: true`. O run permanece
  ACTIVE/FIX_RETEST/STALE em sete rounds, sem critic fresh, novo round ou
  PASS. Sem commit, push, dispatch, deploy ou publicação clínica.

### Continuidade REM-02 — 2026-10-02 (10:22)

- **AUDIT-REM-02 — IN_PROGRESS:** Browser Chromium passou 57/57 em cinco
  arquivos; nove cenários cobrem prévia de impacto negada, workflow de feedback
  em tratamento/estado terminal, remediação priorizada, atividade-alvo e
  recuperação de falhas de atividade e diagnóstico. A cobertura integrada
  atingiu 89,04/84,65/92,82/90,43 contra pisos imutáveis 90/85/90/90.
  Functions e lines passam; statements e branches permanecem abaixo.
- Typecheck, ESLint focal e Prettier passaram. Inventário de cobertura segue
  174 incluídas/212 excluídas. `verify:evidence-consistency` valida o resumo e
  falha somente sem mutation run ID real de candidato committed compatível.
- Estado global permanece WAITING_HUMAN_APPROVAL; REM-03/04 aguarda decisão
  same-UID. O Gauntlet ainda requer sincronização/rebaseline e validação de
  drift após estes registros; não há nova crítica R05 disponível.

### Validação documental e Gauntlet — 2026-10-02 (10:28)

- Documentation, traceability, audit-consistency, product-definition, exposure,
  CI contract, secrets, format, Prettier focal, JSON e diff-check passaram.
- Coverage-floor mantém statements/branches abaixo dos pisos congelados e
  functions/lines dentro dos pisos. Evidence-consistency falha somente sem o
  mutation run ID real de candidato committed compatível.
- O helper oficial rebaselineou `aaa-2026-09-06-r1` e
  `validate --check-drift` retornou válido sem erros. Freshness continua STALE
  em sete rounds; nenhuma crítica ou aprovação nova foi registrada.

### Continuidade REM-02 — 2026-10-02 (11:09)

- **AUDIT-REM-02 — IN_PROGRESS:** Browser Chromium passou 61/61 em cinco
  arquivos sob Node 22.23.2. Os cenários novos cobrem resposta malformada e
  retry do histórico de feedback, filtro de status e paginação cursorada
  seguinte/anterior. Typecheck, ESLint focal, Prettier e diff-check focal
  passaram.
- Cobertura integrada executou 215 arquivos: 1543 testes PASS e 68 skipped em
  36 arquivos. Statements 90,03% (9690/10762), branches 85,31% (8548/10019),
  functions 94,71% (2152/2272), lines 91,24% (9233/10119). `verify:coverage-floor`
  PASS; inventário permanece 174 incluídas/212 excluídas e nenhum piso mudou.
- `verify:evidence-consistency` confirma cobertura, percentuais e auditoria,
  mas falha em um gate pela ausência de mutation run ID genuíno de candidato
  committed compatível. REM-02 permanece IN_PROGRESS aguardando critic R05
  fresh; REM-03/04 continua aguardando decisão same-UID. Sem alteração de
  produção, commit, push, deploy ou publicação clínica.

### Fechamento local de AUDIT-REM-02 — 2026-10-02 (11:31)

- **AUDIT-REM-02 — COMPLETED localmente:** Browser 61/61, cobertura 90,03 /
  85,31 / 94,71 / 91,24 acima dos pisos congelados, inventário 174/212 e
  review R05 fresh PASS após corrigir a asserção da query na página anterior.
- `verify:evidence-consistency` permanece com uma falha global porque falta
  mutation run ID genuíno de candidato committed compatível. REM-03/04 mantém
  decisão same-UID pendente; o Gauntlet abrangente segue ACTIVE/FIX_RETEST/STALE
  em sete rounds. Nenhum claim de aceite global é feito.

### Remediação auxiliar de dependências de produção — 2026-10-02 (16:38)

- Audit inicial local: 11 advisories em dependências de produção, incluindo
  Next.js e `undici` transitivo. Pins atualizados para `next@16.3.6` e
  `undici@7.29.1`; `pnpm audit --prod` final sem vulnerabilidades conhecidas.
- A verificação local incluiu install congelado, lint/typecheck do workspace,
  typechecks de web/integrations, Browser de operações 23/23 e gates de
  migrations/secrets. Artefato: `.agent/artifacts/remediation/dependency-audit-remediation-20261002.md`.
- Item técnico concluído localmente e rastreado como
  `SECURITY-PRODUCTION-DEPENDENCY-AUDIT-20261002`; nenhuma alegação de deploy
  ou certificação global. O próximo trabalho do programa permanece REM-09 e os
  gates humanos existentes.

### Rejeição de archive sintético incompatível — 2026-10-02 (16:54)

- O caso REM-09 agora gera archive com coluna extra em `content_versions` e
  journal íntegro até `0053`; o preflight lê o dump, a restauração e a migration
  `0054` concluem, e o comparador rejeita o drift estrutural. TDD RED falhou
  pela ausência do sinal; GREEN passou o teste opt-in `7/7` e drill direto
  (`semanticSnapshotMismatchRejected=true`, `verificationDurationMs=2172`).
- C4 aprovou apenas o delta anterior; seu fingerprint pré/pós coincidiu, mas
  essa nova alteração exige review fresh próprio. Sem rebaseline. Archive
  externo, schema arbitrário, grants, principal de migration e operação seguem
  limitados; REM-09 permanece `IN_PROGRESS`.
- C5 fresh sealed aprovou a fixture sintética sem achados, com fingerprint
  completo pré/pós igual `673584d9c4ed3c2674a2fc53a6a99456212d899859ad840759fb541826c2a6da`.
  A revisão foi estática e não rebaselineia o Gauntlet global.

### Follow-up C6 — segurança dos diagnósticos de restore — 2026-10-02 (17:57)

- Crítica fresh C6 do delta de grants retornou `REVISE` P2 porque o `stderr`
  de `psql` poderia ecoar a linha SQL com senha sintética. Fingerprint oficial
  completo pré/pós coincidiu em
  `17f5373ca79eb7ffd36fb864427fc210a3dac4123a73f08da528a341fa9ef12a`; HEAD
  permaneceu `3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff`.
- O executor agora suprime `stderr` nessa invocação e os testes cobrem
  não-vazamento e linhas malformadas. Sob Node 22.23.2, restore-migrations +
  policy + migration-governance passaram 42/42 com `--no-cache`; drill PG16
  descartável passou com todos os flags verdadeiros em 2.215 ms. A revisão fresh
  do follow-up continua pendente.
- `AUDIT-REM-09` fica `IN_PROGRESS`; matriz continua local e sintética. O
  scorecard v7 permanece histórico, REM-08 segue `IN_PROGRESS`, o Gauntlet
  global permanece `ACTIVE/FIX_RETEST/STALE` e o estado operacional é
  `WAITING_HUMAN_APPROVAL`. Nenhuma promoção, commit ou rebaseline.

### Follow-up Kepler — cobrir o call-site — 2026-10-02 (18:24)

- Kepler retornou `REVISE` P2 porque o teste anterior não exercitava a opção de
  supressão na chamada de provisionamento. Fingerprint completo pré/pós
  coincidiu em `02afceb869730af4291e3c5e9fff255a63521bc7652e736e36b552a2e7437455`;
  HEAD não mudou.
- RED falhou com runner/caller ausente; GREEN extraiu ambos para
  `scripts/restore-tool-runner.mjs`. A regressão injeta falha do runner `psql`
  com senha sintética em stderr e verifica mensagem, cause e argv. Suite opt-in
  passou 42/42 e drill PG16 passou com todos os flags em 2.226 ms.
- Gates amplos devem ser repetidos após a extração; crítica fresh seguinte ainda
  está pendente. REM-08/09 continuam `IN_PROGRESS`; Gauntlet `STALE`, sem
  rebaseline ou mudança de estado humano.

### Gates documentais após extração do runner — AUDIT-REM-09 (2026-10-02, 18:36)

- A revisão pós-extração passou Prettier focal, `verify:documentation`,
  `verify:traceability`, `verify:audit-consistency`, parse do ledger JSON e
  `git diff --check`. Esses comandos rodaram sob Node v24.20.0, fora da faixa
  declarada; os testes focais da implementação foram executados anteriormente
  sob Node 22.23.2.
- A crítica fresh read-only do módulo injetável e do call-site é a próxima
  ação; nenhum veredito foi presumido. `verify:evidence-consistency` segue
  aberto somente pela ausência do mutation run ID de candidato committed.
- REM-09 permanece `IN_PROGRESS`, REM-08 sem scorecard nova, status global
  `WAITING_HUMAN_APPROVAL`; Gauntlet `ACTIVE/FIX_RETEST/STALE`, sem rebaseline.

### C7 — validação de linhas dos catálogos de restore (2026-10-02, 18:51)

- A crítica fresh encontrou P2 em `restoreIntegrityCatalogMatches`: catálogos
  fonte/alvo iguais podiam ser aceitos apesar de linhas incompletas. Fingerprint
  oficial repository+state pré/pós coincidiu em
  `183b1b9810604a6187f7306d2138fb84004de40129febf940e7be8353e7b3807`; reviewer
  não escreveu nem executou testes.
- RED falhou ao confirmar `false` para linhas incompletas idênticas. GREEN
  valida campos e tipos para colunas/constraints/índices, tabelas permitidas e
  chaves únicas; os testes também rejeitam tipos incorretos iguais em ambos os
  catálogos.
- Restore/policy/migration-governance passou 42 testes, com um skip live
  condicional; drill PG16 passou com todos os flags em 2.192 ms. Typecheck,
  lint focal e formato focal passaram. A próxima etapa é re-review fresh do
  snapshot sincronizado. REM-09 segue `IN_PROGRESS`; Gauntlet stale e sem
  rebaseline; a ausência de mutation run ID committed continua aberta.

### Gates pós-correção C7 — AUDIT-REM-09 (2026-10-02, 18:57)

- Após a sincronização, as suites restore/policy/migration-governance passaram
  42 testes com um skip live condicional. O drill PG16 direto passou em 3.313
  ms, duração técnica parcial, sem valor de RTO.
- Lint, typecheck, format, Prettier, CI contract, secrets, traceability,
  migrations, product-definition, exposure, documentation, audit-consistency,
  JSON do ledger e diff-check passaram sob Node 22.23.2.
- Solicitar revisão fresh do comparador atualizado após fingerprint oficial
  completo. `verify:evidence-consistency` segue sem mutation run ID committed;
  REM-09 permanece `IN_PROGRESS`, sem rebaseline global.

### C8/C9 — nome vazio no contrato de catálogo (2026-10-02, 19:03)

- A review fresh C8 encontrou P2: a API aceitava `tableNames: [""]` quando
  as rows de origem/destino também tinham nome vazio. Fingerprint oficial
  repository+state pré/pós coincidiu em
  `cc3fd50ba26b1a3a41da59328e7c31f0de2917e0d0e54a5c46796e221dbf0041`; reviewer
  não rodou testes ou escreveu arquivos.
- RED reproduziu `true`; GREEN exige nome não vazio e adiciona regressão para
  catalogs idênticos com nome vazio. Após C9, suites restore/policy/governance
  passaram 43 testes e um skip live condicional; typecheck, lint, format,
  Prettier e gates de documentação/CI passaram. Drill PG16 PASS em 2.343 ms.
- Re-review fresh de C9 aguarda sincronização e fingerprint. REM-09 permanece
  `IN_PROGRESS`; `verify:evidence-consistency` segue sem mutation run ID de
  candidato committed; sem rebaseline.

### Checkpoint de retomada C9 — 2026-10-02 (19:17)

- C9 permanece corrigido localmente; validações e limites constam no estado
  runtime prevalente e no log de execução. Nenhum status de task ou gate global
  foi promovido neste checkpoint.
- Próxima ação: fingerprint oficial repository+state, review fresh read-only
  C10 do comparador/caller com casos vazios e malformados, comparação pré/pós,
  registro de veredito válido e conclusão do inventário de hashes REM-08.
- Estado global `WAITING_HUMAN_APPROVAL`; `verify:evidence-consistency` ainda
  depende de mutation run ID genuíno de candidato committed.

## 2026-10-03 — Auditoria documental, código e runtime local

- **Task:** `AUDIT-REPOSITORY-20261003` — `COMPLETED` como entrega de auditoria,
  com veredito do repositório `REVISE`. Não encerra o programa State of Art.
- **Escopo:** 85 arquivos iniciais em docs, 40.445 linhas, inventário SHA-256;
  revisão em três lanes de leitura e verificações locais sintéticas sob
  Node 22.23.2/pnpm 10.33.0. Worktree anterior preservado, sem commit/deploy.
- **Entrega:** `docs/audits/repository-audit-2026-10-03.md`, 51 notas por
  dimensão, achados A01–A34, fases AUDIT, limites e plano de remediação.
  Evidência detalhada em `docs/audits/repository-audit-2026-10-03-evidence/`.
- **Resultados atuais:** cobertura 1.571 PASS/69 skipped em 217 arquivos,
  90,03/85,31/94,71/91,24 e coverage-floor PASS; E2E comum 45/45; modo real
  30 PASS/16 FAIL, com jornada participante real PASS; PostgreSQL 18
  provisionado 245 PASS/2 FAIL/16 skipped; RLS PASS; restore 0053→0054 PG16
  PASS; Redis descartável 5/5 + restart 2/2; produção audit 0, global dev audit
  4 high/3 moderate. Complexidade, release traceability, evidence-consistency,
  AAA candidate e Triple AAA não passaram.
- **Novos riscos confirmados por reprodução:** replay save/submit conflita
  quando só muda horário server-side; wrapper IA perde classificação timeout;
  M02 retorna DOMINIO_DIGITAL com duas respostas abertas ausentes; handlers
  simulados de publish/withdraw produzem delete seguido de upsert atrasado;
  CAS de conteúdo mapeia para 500; freshness aceita HEAD com 69 paths de
  runtime rastreados modificados. Reproduções com adapters não certificam
  serviço Qdrant/IA real. Cenários de UX/auth local classificados estaticamente
  permanecem explícitos no relatório.

| Item de revisão | Prioridade | Estado | Critério de pronto / dependência |
|---|---|---|---|
| AUDIT-20261003-REPLAY | P1 | READY_FOR_NEXT_STEP | Abrir fatia BUILD para A13; replay HTTP com mesma operação/chave permanece válido após novo horário, sem reduzir proteção contra payload diferente. |
| AUDIT-20261003-RESPONSES | P1 | READY_FOR_NEXT_STEP | A14/A15: edição pendente não é perdida na submissão; escolha/texto comum é reidratado antes do envio. Cenários browser discriminantes. |
| AUDIT-20261003-DRAFT-IDENTITY | P1 | READY_FOR_NEXT_STEP | A16: rascunho editorial recuperado somente após vínculo principal/escopo; troca de sessão não mostra conteúdo anterior. |
| AUDIT-20261003-CURRICULUM | P1 | READY_FOR_NEXT_STEP | A17–A19: separar domínio/conclusão, ancorar avaliação e alinhar retenção 30/60/90/formas equivalentes; preservar decisão REM-06. |
| AUDIT-20261003-LIVE-CONTRACTS | P1 | READY_FOR_NEXT_STEP | A01/A08: fixtures editoriais no contrato atual, typecheck de testes raiz e suíte PG sem falhas, sem afrouxar publicação. |
| AUDIT-20261003-E2E-SELECTION | P1 | READY_FOR_NEXT_STEP | A02: projetos/seleção/auth coerentes nos comandos comuns/reais; participante persistido preservado e staff real comprovado. |
| AUDIT-20261003-CANDIDATE-CHAIN | P1 | READY_FOR_NEXT_STEP | A04/A05: token na consulta de segurança e ausência de requisito circular de sucesso do próprio run; prova remota depende de H-REMOTE. |
| AUDIT-20261003-DEV-DEPENDENCIES | P1 | READY_FOR_NEXT_STEP | A06: atualizar tooling/lockfile compatíveis, audit global sem high/critical e regressão verde. |
| AUDIT-20261003-FRESHNESS | P1 | READY_FOR_NEXT_STEP | A03/A09/A10: vincular evidência medida ao snapshot real, incluir configurações e não emitir readiness stale. Complementa REM-08. |
| AUDIT-20261003-MAINTENANCE | P2 | READY_FOR_NEXT_STEP | A07/A11/A12/A33/A34: budgets preservados, índice corrente inequívoco, SKIP separado de PASS, testes isolados e equivalências comprovadas. |
| AUDIT-20261003-RUNTIME-UX | P2 | READY_FOR_NEXT_STEP | A20–A32: budgets por classe, leases, withdraw, shutdown, audit/erros, sessão, consultas/retry/navegação/a11y e justificativas; tasks coesas conforme relatório. |

Esses itens registram propostas de remediação; nenhuma implementação foi
iniciada nesta auditoria. REM-03/04, REM-06, REM-08/09, H-REMOTE/RF-02/RF-09,
AAA-001 e H-CONTENT mantêm seus estados/boundaries existentes. A próxima ação
técnica recomendada é a fatia `AUDIT-20261003-REPLAY` (A13). A scorecard v7
permanece histórica; as 51 notas consultivas não são rebaseline AAA.

## 2026-10-03 — Roadmap e backlog detalhados da auditoria

- **Entrega:** `PLAN-AUDIT-20261003` — COMPLETED; [roadmap 60](60_roadmap_repository_remediation_2026-10-03.md) e [backlog 61](61_backlog_repository_remediation_2026-10-03.md).
- **Escopo:** todos os achados A01–A34 têm task principal T01–T34; G01–G10 tratam preflight, continuidade REM, integrações, assurance e aceite. 44 tasks em R0–R6, 12 sprints mais S0; responsáveis são papéis propostos, sem prazo prometido.
- **Épicos:** os onze itens AUDIT-20261003 acima passam a usar o detalhamento do backlog 61. Nenhum épico de correção foi concluído; não foram alterados os status REM/SOA por esta entrega.
- **Próxima seleção:** `AUDIT-20261003-G01` → `AUDIT-20261003-T13`; confirmar snapshot e contrato, depois RED de replay. T01/T02/T16/T33 podem formar frentes independentes respeitando os arquivos compartilhados.
- **Dependências:** decisões somativas/same-UID/remoto/clínica/aceite permanecem específicas; preparação e correções locais sem essa dependência não aguardam aprovação geral artificial.
- **Evidência da entrega:** `docs/audits/repository-remediation-plan-2026-10-03-validation.json`, vínculos 0300–0302/traceability e checks documentais. Relatório/manifesto da auditoria anterior permanecem snapshots históricos imutáveis.

## 2026-10-03 — Execução integral do plano auditado

- EXEC-AUDIT-20261003: IN_PROGRESS; implementação completa R0–R6 autorizada por Ricardo com Gauntlet/orquestração/engenharia/design. Objetivo não reduzido à primeira onda.
- G01: COMPLETED com preflight atual, gates documentais e snapshot em `.agent/artifacts/remediation-20261003/preflight.json`.
- AUDIT-20261003-REPLAY/T13: IN_PROGRESS; Lead possui contratos aplicação/API e participante. Autoria T16/T33/T32 e CI T03/T09/T10/T04/T05 têm frentes disjuntas; controles duráveis somente pelo Lead.
- Barra AR03-v1 complementa AAA-v1 e mantém pisos 90/85/90/90, TDD, revisão fresh e evidência no caminho público. ExecPlan `.agent/plans/2026-10-03-remediation-execution.md` mantém todas as 44 tasks.
- Gates humanos anteriores continuam específicos; nenhuma nova decisão de produto/risco/publicação foi presumida pela autorização de implementação.

### Checkpoint de implementação — 2026-10-03T12:10:00Z

- T13/T14/T15 IN_PROGRESS: replay/dirty-submit/retomada implementados; RED/GREEN unit, HTTP e browser, E2E API/PG descartável 1/1 com concorrência/perda/reload. Review e checks integrados ainda necessários.
- T16/T32/T33 IN_PROGRESS: builder editorial 24/24; integração de vínculo principal/sessão possui RED 3/GREEN 24. Refactor T07 e critic pendentes.
- CI T03/T04/T05/T09/T10 IN_PROGRESS: 70/70 locais; critic fresh I1 REJECT nos quatro primeiros gaps materiais, T05 PASS local. Sentinel pré/pós limpo em 11 paths. Round 2 autorizado pela tarefa original; nenhuma promoção baseada só em testes verdes.
- T07 IN_PROGRESS: hotspots originais e crescimento das páginas decompostos sem elevar limites. Objetivo global R0–R6 continua IN_PROGRESS; próxima onda R1/S1.2 após integração.

## 2026-10-03T12:43:00Z — Integração strict, runtime e terceiro round CI

- EXEC-AUDIT-20261003 IN_PROGRESS integral; nenhum fechamento de phase/release.
- PG focal 4/4 e E2E browser→API→PG18.4 1/1: concorrência, resposta perdida, retry, reload, audit/outbox preservados. CSS lateral desktop/mobile real legível; critic core I1 fresh em andamento.
- O caminho produtivo de sessão omitia sessionId após a leitura PG. RED 2/GREEN 27 agora cobre autenticação/rotação e mantém binding interno, sem exposição na sessão pública.
- CI R2 REJECT: configuração/arquivos ignorados, completude de digests/summaries e caminho RLS no job de promoção. Sentinel histórico 11 pré=pós confere com pre independente do Lead; novos deltas R3 são posteriores. Ownership release-evidence e CI typings transferido explicitamente, com alterações anteriores preservadas.
- T01 RED PG real registrado; T08 strict root tests sem exclusões, probe idFactory rejeitado e comando oficial ligado. T12 PASS sintético do runner antigo com SHA unknown é inválido; novo runner deve registrar NOT_EXECUTED/nonzero quando não executa. Builders têm ownership disjunto; controles somente Lead.
- T06 audit RED 4 high/3 moderate, pins patched e lockfile atualizados, instalação/audit/regressão pendentes. T26 e guard CI T08 têm RED. Sanitização de literal conhecido sintético do artefato critic-ci-ar03 foi registrada com hashes antigo/novo; veredito/findings preservados e secrets global clean.
- Evidência: `.agent/artifacts/remediation-20261003/`; próximo passo instalação coordenada/Green/critics, T02/T25 e demais fases. H-CONTENT/H-REMOTE/AAA-001 e decisões específicas preservadas.

## 2026-10-03T13:24:00Z — Provas focais, recibo editorial e próximas frentes

- EXEC-AUDIT-20261003 permanece IN_PROGRESS integral; nenhum gate de release promovido.
- T01 handoff PG18.4 2/2 sem skips, root strict 75/75 arquivos e foco 88 PASS/1 restore opcional SKIP; hashes próprios conferidos. T12 contrato 9/9 e Redis host NOT_EXECUTED/exit2, sem evidência real Redis neste checkpoint.
- T06 instalação coordenada concluída; audit global/produtivo zero e regressão do harness 41/41. Build/checks integrados pós-frentes permanecem pendentes. T26 RED 5/GREEN 32 de causas encapsuladas, limites de retry preservados.
- T25 RED HTTP, primeiro GREEN falhou por dist anterior (log preservado), build aplicação e GREEN 22/22; PG18.4 concorrente 1/1 comprova um commit/um 409, um evento e um audit.
- Critic core I1 REJECT em T32: UI exigia registro privado completo embora API retorne recibo reduzido. RED 1/23 PASS reproduzido; GREEN 25/25 agora confirma justificativa, rejeita campos privados e mantém recibo após erro ao recarregar fila. Lint focal/web strict/diff PASS; review fresh pós-correção ainda necessário. Prova E2E real atual deve vincular fontes/build/dependências, sem relabel de histórico.
- CI R3 I1 REJECT: cobertura stale reidentificada, self-run sem vínculo ao executante, fase/auth/provenance incompletos no strict, identidades OTel/load e formatos opcionais, audit negativo contradiz readiness. 151 testes PASS não anulam achados; Lead confirmou 18 hashes pré=pós=atual antes de R4. Remote CI NOT_RUN/G08.
- R2 T17/T18/T19 tem fontes/contratos próprios em implementação. PG storage + binding ausente passou, mas nativePublishedAttemptEvaluation NOT_PROVEN; deny-by-default preservado. Fixtures HTTP e journey alinhados a 30 dias/data 2026-09-09. Não há fallback para draft atual. T21/T22 têm pacote worker delimitado antes de retorno do builder a CI R4.
- Evidência: `.agent/artifacts/remediation-20261003/lead-shared-fixtures-and-authoring-receipt.json`, reports/handoffs/logs citados no runtime. Próximo: CI R4, adapter nativo/snapshot T18, integração strict e E2E/review atuais, demais 44 tasks.

## 2026-10-03T13:36:14Z — T11 e contratos compartilhados curriculares

- T11 IN_PROGRESS: índice `docs/00_current_index.md`/`docs/current-index.json` publicado com ponteiros mutáveis correntes e digests fixos da auditoria histórica/barra. Validator usa somente único primeiro checkpoint prevalente; RED 7 falhas/1 PASS, GREEN 12/12 com histórico preservado. Lint focal/documentation/traceability/audit-consistency/secrets/diff PASS; review fresh pendente.
- Lead aplicou apenas literals compartilhados autorizados: journey day7→30/data2026-09-09T05 e catalog spacedReviewDays7/30/90→30/60/90; fixture HTTP já30/data2026-09-09T01. Export decoder curricular acordado; produtor SINGLEraw/MULTIPLEJSON/TEXTplain exige seleção congelada.
- PG curricular atual prova storage/negação sem binding, não avaliação nativa. Manifesto de forma/blueprint precisa origem servidor/publicação autorizada; nenhum draft atual ou PUBLICADO constante vira prova.
- Probe de complexidade encontrou função curricular transitória167>150; owner notificado para extração coesa, sem elevar limite. Log FAIL preservado; não é claim de regressão global verde.
- Evidência: `.agent/artifacts/remediation-20261003/current-continuity-{red.log,green-hardened.log,static-verified.log}` e `lead-shared-fixtures-and-authoring-receipt.json`. Próximo: review read-only T11/T32, T02 e integração nativa T18/CI R4. Objetivo integral IN_PROGRESS.

## 2026-10-03T14:20:28Z — Handoff R2 conferido e correções após review

- EXEC-AUDIT-20261003 IN_PROGRESS integral. Lead verificou 40 hashes sem divergência no handoff c060f2a1bc6999e4da8b18c37f36b1ff4b2bc0d6b0fc65d0170ca8156ba3e62d. Contagem corrigida pelo raw: 11 arquivos/117 testes PASS, não 111; seis novos casos Lead da jornada já entraram na medição. Nove fontes executáveis: 91.26% linhas/87.46% branches/93.93% funções; decoder 100% em todas.
- PG curricular final genuíno18.4 1/1 sem skips, appNOSUPER/NOBYPASS e adminNOSUPER/BYPASS separado; prova storage/versionamento/RLS e missing binding sem save. nativePublishedAttemptEvaluation NOT_PROVEN. R1 handoff permanece imutável; fonte publicada/snapshot atômico/chaves/read-save fenced/main T18 ainda necessários.
- Jornada T17 parcial RED 6/GREEN 17: atividade obrigatória autorizada e correção humana precedem retenção; não inventa target ausente/cross-scope. Retenção 30/60/90 mantém templates sem prova RASCUNHO/empty, sem publicação clínica.
- Review fresh T11/T32 REJECT preservado com sentinel independente16/16 conferido antes das correções. Política agora fixa âncoras históricas/barra além do índice e rejeita calendário impossível: RED 4/GREEN 16. Recibo permanece após Carregar autoria falho: RED 1/GREEN 25 browser. Novo review pendente.
- T02 seleção CLI real/staging exclusiva RED 2/GREEN 3; mock proxy cookie retirado desses modos. R5 prepara MODERATOR real/API cookie/PG e matrizes deny em /operations, mesmo arquivo real-runtime; build/PG/E2E custoso só após freeze coordenado das fontes/config/dependências.
- Produtor oficial de cobertura usa medição original/CI executante/digest raw; raw anterior é removido antes do child. Native staging/load/OTel/multi-instance preservam SHA medido no início, checam no fim, formatos explícitos e raw digest; checkout dirty/nogit/HEAD alterado deixa sha null/NOT_VERIFIED de provenance. Contratos focais22/22, lint e strict root PASS; cobertura global/carga/OTel/Redis reais não executados por esses contratos.
- Gate integrado de produção FAIL2 por três erros TS exclusivamente no fixture worker reliability.test.ts (getTime never/PENDING versus PROCESSING). Log lead-integration-1405-checks.log preservado; owner notificado, sem editar fonte congelada concorrente. Worker checkpoint38/38 ainda exige strict/lint/PG real/review.
- Evidência: .agent/artifacts/remediation-20261003/r2-curriculum-lead-handoff-verification.json, r2-curriculum-handoff.json, r2-curriculum-handoff-coverage.log, r2-curriculum-final-postgres.log, critic-continuity-receipt-r1-report.md/sentinel.json, current-continuity-r2-{red,green}.log, authoring-recall-r2-{red,green}.log, journey-partial-mastery-{red,green}.log, e2e-profile-selection-{red-isolated,green}.log, native-producer-{wiring-red,green,static-verified}.log. Sem autoaceite, promoção de phase/release, commit/push/deploy ou publicação. Próximo: critics fresh, CI R4, freeze/runtime R5, native T18 e demais 44 tasks.

## 2026-10-03T14:52:49Z — Reviews independentes e runtime negativo preservado

- Objetivo integral EXEC-AUDIT-20261003 IN_PROGRESS. T11 COMPLETED no recorte documental após fresh critic ACCEPT: 21 probes próprios e 16 canônicos; Lead conferiu 16 hashes pré/pós/current independentes contra seu baseline e bytes atuais. Same-UID G03/candidato G05 não são aceites implícitos.
- T32 REJECT3: cliente aceita non-2xx com success envelope, decoder aceita rationale ausente e 30 de fevereiro. Canônicos browser25/25/web83/83/API14/14 passaram, mas sete asserts independentes falharam. Persistência HTTP/PG atual NOT_RUN. Report/sentinel negativos preservados, correção/review posteriores obrigatórios.
- Currículo R2: critic aceita domínio/dashboard T17, contrato T18 trusted-reader/HTTP409 sem save e funções T19 sintéticas. REJECT4: prioridade entre runtimes na jornada, target remediation sem assignment correto, runtime humano antigo após conclusão autoritativa e assertion catalog.test7/30/90. Run independente190PASS/4FAIL/1nativePGSKIP; Lead conferiu30 hashes pré/pós/current. 117PASS histórico não substitui seleção corrente vermelha; nativePublishedAttemptEvaluation NOT_PROVEN.
- CI R4 checkpoint205/205 com lint/formato/strict/secrets/diff focais; Lead verificou64 hashes sem divergência. Owner encerrou todos os processos e congelou15paths. Única transferência worker: annotation OutboxEventRecord[] aplicada sem alterar dados/assertions; pnpm typecheck produção/web/root atual PASS e worker3/3. Demais7 fontes worker permanecem congeladas; PG/fence/lease/review pendentes.
- R5 RED genuíno: fullbuild0, PG18.4 appNOSUPER/NOBYPASS/adminNOSUPER/BYPASS, Playwright1FAIL esperado por convite staff ausente, cleanup0 e fontes/build/deps pré=pós. GREEN atual é FAIL: participant1PASS/staff1FAIL/0skip, APIRequestContext não envia cookie Secure em127HTTP; nova limpeza tentou DELETE audit imutável e deixou accounts4. Launcher0 inconsistente decorre de async-exit-hook antes da saída; será corrigido no runner após flush/teardown. Nenhum falso PASS.
- Teardown read-only posterior confirma cluster/diretório ausentes e portas PG/runtime recusando conexão, sem relabel do cleanup original FAILED. Quatro PNGs participante são parciais; staff PNGs não executados. Reparos autorizados somente fixture/spec/runner, browser HTTP real sem fakeauth, auditoria retida até destruição do cluster; novo freeze obrigatório antes da execução.
- Lead preparou .agent/plans/2026-10-03-native-attempt-evaluation.md: associação publicada/blueprint completo explícitos, bindings imutáveis/atômicos ao start, respostas vinculadas, RLS privada, leitura/save fenced na mesma transação e main nativo. Não há schema/migration/publicação aplicada por esse plano.
- Evidência: .agent/artifacts/remediation-20261003/critic-continuity-receipt-r2-independent-report.md/sentinel.json, critic-curriculum-r2-report.md/sentinel.json, lead-independent-reviews-r2-verification.json, r4-ci-checkpoint-before-r5-runtime-proof.json, lead-worker-fixture-typing-green.log, r5-runtime-red-2026-10-03T14-44-37-721Z-12c9f97c-summary.json, r5-runtime-green-2026-10-03T14-45-32-374Z-38033f68-summary.json e r5-runtime-failed-green-teardown-20261003-1.json. Próximo: successor R5, correções T32/jornada/catalog, novos critics, native T18 e demais tasks. Sem phase/release/commit/push/deploy/publicação.

## 2026-10-03T15:10:35Z — R5 successor1 negativo e reparo mínimo

- IN_PROGRESS integral. Successor1 real: participant1PASS/staff1FAIL/0skip, CLIexit1 correto e fontes/build/dependências pré=pós. Convite staff browser200; assertion usa headers() que omite Set-Cookie segundo SDK local. Somente duas leituras allHeaders corrigidas, assertions mantidas; lint/format/strict PASS, specSHA931f1fc5857f5a792bb9a68d152fa7e483d02f0dc9384a142a27ae87d754e7b5.
- Cleanup deletável0, 14 audits imutáveis retidos/digest36d4f17dfcf408f0a491d804fa8b21156016870a665ec2b15431f5621d5f3fb9 até destruição do cluster; diretório ausente e quatro portas ECONNREFUSED. Isso não reclassifica os FAILs/cleanup anteriores. SummarySHAc0a45ee7decd69ecc770c261393add5b0f827c9420b18399b9ab6b99d523099a.
- Evidência: .agent/artifacts/remediation-20261003/r5-runtime-green-2026-10-03T15-07-51-443Z-d34fa66c-{summary,cleanup,teardown}.json e r5-runtime-repair2-{lint,format,strict}-20261003-1.log. Próximo: successor2 técnico com mesmos assets e nova prova; fresh critic CI R4 em inspeção read-only, testes depois da janela. T32/jornada/catalog REJECT permanecem; nativeT18 NOT_PROVEN. Sem phase/release/publicação.

## 2026-10-03T15:17:00Z — R5 successor2 e paint readiness

- R5 real successor2 FAIL preservado SHA2a2ec1cef6c17d934f5daaa45a8778ffe69a8a707a8fa493eb67c0efad744c93: participant1PASS/staff1FAIL/0skip e CLI1; source/build/deps pré=pós. Staff real convite200/cookiewire/session200/scopes200/dashboard200/headings/operations-ready passaram; primeiro screenshot parou no networkidle/timeout30s. Staff PNGs/deny/revoke NOT_EXECUTED.
- Cleanup deletável0,15 audits imutáveis digest3962ee8fbcd0f7aa37ddd0270e63aeeffc852101d2d8a89a2cd5eb9f5cf81bf6 retidos até destruição; directoryMissing/quatro portas ECONNREFUSED. Reparar somente spec paint readiness, mantendo gates explícitos/fonts/images/twoframes, sem elevar timeout; novo successor antes de rerun. Evidência: .agent/artifacts/remediation-20261003/r5-runtime-green-2026-10-03T15-15-29-392Z-52db6618-{summary,cleanup,teardown}.json. IN_PROGRESS integral; nenhum autoaceite, failures anteriores preservados.

## 2026-10-03T15:27:00Z — R5 successor3: negações passaram, landing divergente

- Successor3 real FAIL SHA b4f0095840f00ef05f9d2c59498203dcc356d156da1bc87dc880b143a8478355: participant1PASS/staff1FAIL/0skip/CLI1, identidades pré=pós. Staff cookie/session/scopes/dashboard/UI e PNGs pintados passaram; foreign scope403 e participant internal scopes/report403/dashboardkind200 confirmados. Redirect participante passou, assertion Token pressupunha anonimato embora sessão continue ativa. Revogação/prova final staff NOT_EXECUTED.
- Spec-only landing repair autorizado: sessão ativa, Token ausente, staff ausente, redirect preservado; sem alterar gates deny. Cleanup/teardown PASS. Evidência .agent/artifacts/remediation-20261003/r5-runtime-green-2026-10-03T15-23-12-478Z-af258458-{summary,cleanup,teardown}.json e e2e.log. Próximo successor4 com mesmos assets; nenhum retry sem checkpoint, nenhum relabel dos FAILs históricos, nenhuma promoção global.

## 2026-10-03T15:32:00Z — R5 successor4: typo no teste adicional

- Successor4 FAIL SHA7cfc41818adb06080661a66298695aa94693c7bfbeb1b6a312a4f8f8b1595165: participant1PASS/staff1FAIL/0skip/CLI1, identidades pré=pós. Landing participante ativo passou; GET adicional usou /api/v1/sessions/current (plural errado) e recebeu404. Apenas literal singular autorizado; nenhuma assertion relaxada. Revogação/finalstaffproof NOT_EXECUTED.
- Cleanup deletável0/audit19 append-only retido/digest0ea8c066dd0c7b20b07b05e0782aa87a516939f7ddddab910e473ad5c60f43e2 e teardownPASS. Evidência .agent/artifacts/remediation-20261003/r5-runtime-green-2026-10-03T15-30-44-202Z-b1e4b3bd-{summary,cleanup,teardown}.json/e2e.log. Próximo successor5 técnico com mesmos assets; critic CI testes aguardam janela. IN_PROGRESS integral e FAILs históricos preservados.

## 2026-10-03T16:06:08Z — R5 real positivo, revisões e coordenação T20

- EXEC-AUDIT-20261003 IN_PROGRESS integral. R5 successor5 CLI0, Playwright2PASS/0FAIL/0SKIP/0flaky; convite MODERATOR, cookie real, session/scopes/dashboard, matriz anon/participant/foreignscope/revoked e revogação concluídos. Seis PNGs atuais1280/390. PG18.4 appNOSUPER/NOBYPASS e admin separado; fontes/assets/deps pré=pós no intervalo controlado.
- Cleanup13 entidades deletáveis0; audit24 append-only retido/digest1174eaef4e9b8cc525e7d4686f7201f331220e0ae6a03bc723a27b9dff528927 até destruição real do cluster. Diretório ausente e runtime3100/3101/3102/PG58312 recusando conexão, processos encerrados. Lead conferiu20 referências mais summary. Handoff3496c35a26de1bd80775e8473c31bdd1c5a614be4107397dc07f9aa62215468b/summary605aa717c404be8fb72bc8b3aa1fb2cd1bddf9af7663bc65cf3e00e24d81fd51; fresh review em andamento, sem aceite global/candidato. Todos os FAILs históricos preservados.
- CI fresh REJECT6: 227 canônicos PASS, 13PASS/12FAIL discriminantes. Lead confirmou26 fontes pré/pós/current,45 rawlogs imutáveis,16 artefatos e4 probes; correções divididas entre owner CI F01/F02/F03/F04/F06 e Lead produtor F05. F05 RED5/GREEN11: GITHUB_SHA/ref/repository medidos desde início, head divergente/ausente ou ref distinto não promove cobertura. Nenhuma cobertura global/remota executada.
- Jornada T17 RED6/GREEN24, regressão ampliada201PASS/1nativePGopcionalSKIP; target exige assignment/participant/scope/status corretos, pendência entre runtimes precede retenção e conclusão autoritativa supera runtime humano obsoleto. Fixture público reconciliado com assignment UUID correspondente, assertions preservadas. Build exclusivo application0. Catalog assertion30/60/90 RED/GREEN; nativePublishedAttemptEvaluation NOT_PROVEN/T18 pendente.
- T32 RED8/GREEN31: response.ok obrigatório, rationale obrigatória e calendário real; caso GET503 com envelope de sucesso preserva recibo. Focal lint/webstrict/applicationnoemit/diff0. Novo review/persistência HTTP/PG ainda necessários. T20 owner58PASS5files/strict API+root/lint/format0; HTTP store sintético explicitamente não prova Redis/PG. API build exclusivo e PG18.4 duas instâncias aguardam checkpoint de persistência compartilhada, sem build global. Redis ausente NOT_EXECUTED, sem instalação/claim PASS. Worker R6 PG/fencing em execução coordenada.
- Evidência: `.agent/artifacts/remediation-20261003/r5-runtime-handoff-successor5-20261003-1.json`, `r5-runtime-lead-successor5-verification.json`, `lead-ci-r4-independent-verification.json`, `critic-ci-r4-report.md`, `journey-r3-critic-probes-regression-final.log`, `journey-r3-application-build.log`, `authoring-r3-independent-findings-{red,green}.log`, `coverage-ci-head-r5-{red,green}.log`, `r6-ratelimit-unit-green-20261003-2.log`. Próximo: fechar checkpoint/build/live T20, revisar R5, concluir CI e native T18/demais tasks. Sem phase/release/commit/push/deploy/publicação.

## 2026-10-03T16:53:33Z — Reviews delimitados, T20 PostgreSQL e jornada R4

- EXEC-AUDIT-20261003 permanece IN_PROGRESS integral. Fresh reviews R5 runtime e worker T21/T22 ACCEPT somente no recorte controlado: Lead conferiu respectivamente10 fontes/124 referências e17 fontes/75 referências; nenhum aceite global, provider ou built-current. R5 mantém2PASS/0skip/6PNGs, cleanup e teardown; worker PG18.4 mantém12PASS/0skip, Qdrant DOUBLE_NOT_REAL_QDRANT e dist histórico.
- T20 fresh ACCEPT:58 canônicos/21 probes próprios,13 fontes PRE=POST=CURRENT iguais ao baseline Lead,21 arquivos selecionados da prova e12 artefatos critic conferidos. PG18.4 genuíno: dois listeners HTTP no mesmo processo com handles separados, budgets20/10/120 e429 em ambas réplicas; outage fecha handles cliente, não simula partição de rede. Cleanup buckets0/diretório ausente/portas recusadas. Redis NOT_EXECUTED/exit2 permanece requisito aberto.
- Checkpoint T20: dois packets Lead inválidos contêm traceback preservado; API build0 executou uma vez sob mensagem explícita successor1 enquanto PG foi retido. Apenas successor2 válido, JSON/hashes conferidos, autorizou PG. Correção cronológica em r6-ratelimit-checkpoint-chronology-correction.json; nenhum relabel das falhas.
- Fresh jornada T17 REJECT P1: assignment agregado concluído ocultava atividade salva/humana e liberava M03. Lead reproduziu8FAIL/150PASS e corrigiu coerência entre todas as atribuições autorizadas e atividades presentes. GREEN162/162 em8 arquivos, incluindo novos casos permanentes dashboard/HTTP; fresh review novo e native E2E ainda necessários. T19 e T32 UI/decoder ACCEPT local; T32 persistência/resubmissão PG ainda não executada.
- T27 em implementação delimitada: decisão vigente D091 APPROVADO_INTEGRALMENTE fixa idle ADMIN/MODERATOR30min, PARTICIPANT8h e absoluto12h. Builder RED5 e rotationRED1 preservados, GREEN73/4files; expande negativos/provaPG, sem build/live. Minimal2exports application/index aplicados. Lint Lead0; strict root atual FAIL2 apenas exports ainda ausentes no dist application antigo, aguardando build coordenado. Nenhuma exclusão adicionada.
- Scanner oficial complexity FAIL2 worker: processOutboxOnce163>150 e createOutboxRepository155>150; owner notificado para extração coesa sem ratchet. Findings/FAILs preservados e task não fechada globalmente. Native T18 NOT_PROVEN; mapper respostas congeladas11/11 e precondição PG preparada, ainda sem integração nativa.
- Evidências: .agent/artifacts/remediation-20261003/lead-r5-runtime-independent-review-verification.json; lead-worker-r6-independent-verification.json; lead-ratelimit-r6-independent-verification.json; r6-ratelimit-handoff-20261003-1.json; critic-journey-receipt-r3-report.md; journey-completion-r4-red-owned.log; journey-completion-r4-permanent-green.log; journey-completion-r4-static.log; journey-completion-r4-complexity.log. Próximo: coordenar build application/persistence e PG T27 após pacote final, concluir CI/complexidade worker e native T18/review jornada. Sem phase/release/commit/push/deploy/publicação.

## 2026-10-03T17:50:13Z — T27 revisão delimitada, jornada R5 e T18/R8

- EXEC-AUDIT-20261003 permanece IN_PROGRESS integral. T27 freshACCEPT I1 independente verificado Lead:23 fontes PRE=POST=CURRENT,14 critic artefatos e52 raw referências sem divergência.91 canônicos+31 públicos/HTTP+62 probes critic PASS0skip; PG18.4 histórico11PASS0skip, builds exclusivos application/persistence0/0. Rotação conserva criação/deadline; cap público43200 e tokenTTL de convite/recovery separados. Não há novo HTTP nativo completo/built-current/globalaccept. Snapshot1469 histórico pré=pós preservado e posteriores5 fontes fora do freeze23 reconhecidas como drift legítimo.
- Jornada freshR4REJECT2P1 conferido13 fontes/24refs: hint opcional ausente escondia pendência e conclusão em outro escopo liberava pré-requisito. RED4/GREEN104 canônicos+51 probes históricos=155PASS; fixture positivo de retenção reconciliado com conclusão coerente, assertion mantida. Novo critic R5 fresco e freeze14 ativos, sem aceitar pelo builder.
- T18 RED real PG18.4: seis relações ausentes, testCLI1/orchestratorEXPECTED_RED0, cleanup/teardown/hashes8refs verificados. Expansão aditiva0055 com schema coeso e snapshottypes compatíveis reduz monólito a1522<1532; strict/lint/manifest56migrações/diff0. Nenhum backfill/publicação, tabelas FORCE RLS/defaultdeny, start/read-save/main/fullflow ainda pendentes; runtime da expansão ainda não executado.
- R8 T28 Chromium RED4 (A200/401/503 tardia e filtro editável), GREEN4 focal;23 skips correspondem ao filtro -t. Lifecycle helper/page4213<4296, regressões/delayedJSON/unmount em progresso. Lead inclui apenas apps/web/app/**/*.test.ts no projeto unit oficial, sem alterar browser/exclusões/pisos. Capturas RED novas preservadas com hashes próprios. CI/complexidade worker seguem owner; nenhuma exclusão/ratchet.
- Evidência: .agent/artifacts/remediation-20261003/lead-session-r7-independent-verification.json; r7-session-handoff-20261003-1.json; r7-session-public-contract-handoff.json; critic-session-r7-report.md; journey-completion-r5-final.log; journey-r5-lead-frozen-pre.json; native-attempt-binding-schema-red-lead-verification.json; native-attempt-schema-migrations-manifest.log; r8-operations-browser-red-20261003-1.log. Próximo: schema PG, captura e avaliação nativa, reviews/jornada/R8/CI/worker e demais44. Sem phase/release/commit/push/deploy/publicação.

## 2026-10-03T18:40:26Z — CI/reconcile REJECT; jornada/R8 review; start T18 RED

- EXEC-AUDIT-20261003 IN_PROGRESS integral44tasks. CI226/produtores27PASS e65/67discriminantes reproduzem recusa do k6legado false válido. Worker85canônicos/31probesPASS1FAIL reproduzem reconcile ressuscitando ponto retirado durante embedding. Lead33/18PRE=POST=CURRENT e4982/43rawrefs conferidos; narrativa inicial limita I1cego, rejeições executáveis válidas. Owners reparos delimitados consumer/reconcile/tests sem build/live.
- Jornada freshR5REJECT P1 corrigido RED2/GREEN111+47=158PASS; cyclesRED2/GREEN0 com extração exata8tipos/publicexports compatíveis. Strict/lint/complexity/secrets/diff0. R2handoffJSON imutável, três fontes supersedidas. Novo criticR6 freeze17 ativo. R8 43refs verificadas/35PASS reportados/freshcriticfreeze8. R9 T29–31 TDD em13fontes delimitadas, finalChromium33/unit25 reportados; pacote/freshreview pendentes. Lead somente fixture day30/dueAt2026-11-01, assertions intactas.
- T18 schemaPG18.4GREEN1 estrutural; startRED2 testCLI1/3FAIL1denialPASS0skip/orchestratorEXPECTED_RED0. Primeiro4FAIL inclui fixture esperando zero em vezACL42501; raw preservado/assertion corrigida reconheceACLouzeroRLS, jamais dados. Lead8refs/15checkpoint/1263 selectedPRE=POST=CURRENT verificados; appNOSUPER/NOBYPASS/adminNOSUPER/BYPASS. Dados imutáveis sintéticos retidos até destruição real do cluster, dirabsent/portrefused; não publicação clínica. Captura/contexto/RLS/read-save/main/fullnativeflow pendentes.
- Evidências: .agent/artifacts/remediation-20261003/lead-ci-r5-independent-review-verification.json; lead-worker-r7-independent-review-verification.json; journey-r6-lead-frozen-pre.json; journey-completion-r6-final-corrected.log; journey-completion-r6-final-secrets-diff.log; lead-operations-r8-precritic-verification.json; native-attempt-binding-schema-green-lead-verification.json; native-attempt-start-red2-lead-verification.json. RedisNOT_EXECUTED/nativeT18NOT_PROVEN; sem phase/release/commit/push/deploy/publicação. Próximo captura T18, reparos/reviews CI/worker/jornada/R8/R9 e demais44; REM-06/HCONTENT/provider/sameUID/remote específicos.

## 2026-10-03T19:43:39Z — Captura T18 real; reviews e reparos preservados

- EXEC-AUDIT-20261003 permanece IN_PROGRESS integral44tasks. Start T18 passou4/4 sem skips em PG18.4: captura33, replay imutável, subset/retirada com rollback e sigilo ordinário. AppNOSUPER/NOBYPASS, adminNOSUPER/BYPASS separado com CREATEROLE de fixture; contas/audit/forma retidos até destruição real. Lead conferiu24 fontes/checkpoint, todos selectedPRE=POST=CURRENT e8rawrefs; summary201420fde4c69a2364258c67373ccc293a00f4f435da574689371b3410583c2c. Três FAILs GREEN históricos mantidos (3FAIL/1PASS, coleta0 por import,1FAIL/3PASS); native avaliação/read-save/main NOT_PROVEN.
- Migração0056 contexto interno/locks/policies SELECT privadas e INSERT apenas bindings; setters7+audit limpam identidades. Forma/advisory fence e source rowlocks, cópias imutáveis, completude deferred SECURITY INVOKER. Legacy não recebe binding inferido. Unit189 e probes104 atuais PASS; rootstrict/persiststrict/lint/diff0, migration/complexitycontracts32PASS e scanner0. Validador R10 freshREJECT2P2 caller malformado reproduzido7FAIL corrigido; handoff histórico4b0b...c6df preservado. Não publicação clínica.
- Jornada freshR6REJECT5P1+1P2 conferido17fontes/39refs; reparos atuais113canônicos e114HTTP por source aliases PASS. RootHTTP antigo7FAIL/107PASS por dist histórico preservado. Scanner deixou de pular orçamento de função em arquivos excepcionados: RED2/GREEN4 e HTTPcore extraído sem mudar rotas; nenhum limite reduzido. Novo review/integração built-current pendentes.
- R8 review55PASS funcional/8PREPOSTCURRENT/38refs, CONDITIONAL por leitura inicial de narrativa;35builderPASS. R9 freshREJECT2 material com16PREPOSTCURRENT conferidos,58oficiaisPASS e27PASS/2FAIL probes: key original ambígua perdida após edição e envelope atividadeIDdivergente. Reparos R11 TDD3browser+16helperRED/cheapGREEN reportados, final/review pendentes; relatos clínicos não envolvidos.
- CI R6/worker R8 handoffs novos conferidos16/19sources mais91/66refs. Owner CI258canônicos+27produtoresPASS e worker105PASS reportados; fresh critics cegos novos ativos, sem aceitar pelo builder. Sem builds/install/live provider. Redis NOT_EXECUTED, HCONTENT/REM06/sameUID/remote/AAA001 específicos mantidos; sem phase/release/commit/push/deploy.
- Evidências: native-attempt-start-green4-lead-verification.json; lead-capture-r10-independent-review-verification.json; native-capture-unit-green-current.log; native-capture-reviewed-probes-current.log; native-capture-reviewed-probes-provenance.json; lead-participant-r9-independent-review-verification.json; lead-operations-r8-independent-review-verification.json; lead-ci-repair-precritic-current-verification.json; lead-worker-repair-precritic-current-verification.json. Próximo: vínculo público/respostas/read-save/main T18, fresh reviews/reparos R11/CI/worker/jornada e critérios44 restantes.

## 2026-10-03T20:14:43Z — Snapshot público T18, R11 selado e fresh reviews

- EXEC-AUDIT-20261003 continua IN_PROGRESS nas44tasks. PostgreSQL18.4 atual passou4/4/CLI0/0skip: captura33 e replay, respostas e projeções públicas congeladas sobrevivem edição de texto e remoção da lista atual, subset/retirada/participante alheio/chaves privadas negados. Summary9d97da417b8b249a9fbfe5518049ef51f9ad2203a10b7f0c00d7144e2ec18f46; Lead conferiu todas as fontes do checkpoint, snapshot pré/pós/corrente e8refsraw. Cluster destruído/diretório ausente/porta recusada, appNOSUPER/NOBYPASS. Prova exclusivamente técnica sintética, sem publicação clínica/nativeevaluation/save/main/globalaccept.
- TDD: inserção fora da transação RED1/GREEN190; leitura vinculada RED1FAIL3PASS e GREEN1FAIL3PASS/RLS antes do GREEN4; projeção pública RED1FAIL3PASS/GREEN4. Primeiro wrapper RED retornouCLI1 porque só reconhecia o RED antigo3FAIL1PASS; rawtest1FAIL3PASS permanece intacto. Fonte225unitPASS/strict/lint/format/diff/complexity0. CycleRED1/GREEN0 após extração compatível de ActivityRowShape; softwarnings permanecem, sem novo limite/exclusão.
- Fresh CI R6 REVISE5P1: contagens/RLS inventados, scanner stale/wrongrun, digests/migrations fictícios, prova sintética/denominadores falsos e k6thresholds ausentes/vazios. Lead16PREPOSTCURRENT e1053refs verificados;258canônicosPASS não anulam falsos positivos.11falhas unitárias fora do escopo preservadas. Reparo CI R7 delegado em fontes disjuntas, sem builds/install/live/globalgates.
- Fresh worker R8 SCOPED_ACCEPT_SOURCE_AND_DOUBLES:86focais+20independentes e3controles negativos;19PREPOSTCURRENT/36artefatos conferidos Lead. Não comprova PG fresco, providers, settlement remoto ou candidato/global. Critic fechado e fontes congeladas preservadas.
- R11 selado4fontes:44Chromium+45unit89PASS/0skip, strict/lint/format/diff0, página2039/2377/funções70/150 e warning teste818>800 preservado. Lead101referências recursivas conferidas (94verificador owner usa denominador distinto). Oracle critic antigo permanece28PASS1FAIL/CLI1; UNKNOWN422 e receiptFixed divergente não confirmam o payload original, teste permanente conserva key/bytes, rascunhoFixed e envio bloqueado. EXPECTED_CHANGED_ORACLE não é29PASS. Fresh critic cego18fontes ativo; handoff16b4b9431f8267ab98d07ca26bb72c2bc2ed34ad3c8eb0075cb6b6a417aea469 imutável.
- Evidências: native-bound-public-green1-lead-verification.json; native-bound-answer-green2-lead-verification.json; native-bound-public-unit-green1.log; native-bound-public-static-green2.log; lead-ci-r6-fresh-review-verification.json; lead-worker-r8-fresh-review-verification.json; r11-participant-handoff-final-1.json; lead-participant-r11-fresh-review-map.json. Próximo: integridade de respostas/captura no banco, autorização de itens vinculados, reader/evaluation/save/main transacional T18, CI/reviews/jornada e restante44. RedisNOT_EXECUTED/HCONTENT/REM06/sameUID/remote/AAA001 específicos; sem phase/release/commit/push/deploy/publicação.

## 2026-10-03T20:28:12Z — Captura obrigatória no commit e R11 fresh REVISE

- T18 realPG18.4 atual4PASS0skip/CLI0 inclui rejeição23514/zero committedattempts para SQL direto sem captura em atividade vinculada. Trigger deferred SECURITY INVOKER preserva legado sem vínculo e exige cópia completa aprovada antes de commit; normal pipeline33/public/answers/replay/isolamento permaneceGREEN. RED atual1FAIL3PASS provou commit indevido; GREEN1 preservado falhou só no shape do erro deferred nativo (code direto, não cause); GREEN2 summary532ee1fa0d2ec8203bb2209744a9308f40194506763442e36b0d8d6e0f516ead. Lead32checkpoint/1274selectedPREPOSTCURRENT/8rawrefs e teardown atual conferidos. Migrações57 e32governance/budgettestsPASS. Sem avaliação/save/main/publicação clínica/globalaccept.
- R11 fresh review REVISE P1 em dois caminhos: start/submit aceitam receipt de activity/attempt alheio, limpam snapshot original e anunciam sucesso.89canônicosPASS, combinado134PASS2FAIL0skip/CLI1;18PREPOSTCURRENT e1248artefatos verificados Lead. Bootstrap pnpm no cache próprio e duas capturas inicialmente fora do namespace/relocadas limitam isolamento perfeito; negativas executáveis preservadas e válidas. Oracle antigo unknown422 permanece EXPECTED_CHANGED_ORACLE28/1; não explica os dois novos defeitos.
- R12 repair packet delegado page/resilience e novo helperreceipt/test declarados; todas as outras fontes R9/R11 readonly. Verificar identidade/status/versão da operação original antes de complete, conservar retry/key/bytes/rascunho em divergência. Nenhum build/install/PG/config/backend pela lane web. CI R7 continua disjunto corrigindo freshREVISE5; worker scoped fonte/doubles positivo, provider/nativeglobal não aceitos.
- Evidências: native-capture-commit-green2-lead-verification.json; native-capture-commit-static-green2.log; lead-participant-r11-independent-review-verification.json; critic-participant-r11-i1-evidence/report.md; native-bound-public-green1-lead-verification.json; lead-ci-r6-fresh-review-verification.json; lead-worker-r8-fresh-review-verification.json. Próximo: autorização/integridade de respostas vinculadas, reader/evaluation/save/main na mesma transação, R12/CI/jornada reviews e critérios44 restantes. IN_PROGRESS integral; sem phase/release/commit/push/deploy/publicação.

## 2026-10-03T21:09:04Z — Respostas nativas vinculadas; CI e web novamente REVISE

- EXEC-AUDIT-20261003 permanece IN_PROGRESS integral44tasks. PG18.4 atual4PASS0skip/CLI0 inclui gravação/replay e resolução API por itens congelados depois de apagar a lista atual; SQL direto com item/choice inválido, alteração de identidade ou resposta submetida rejeita23514. Oito vetores MULTIPLE reais comprovam validação SQL sem inferir modo pelas chaves. Parentrowlock e form/content/assignment locks mantêm a verificação até commit; não há prova concorrente adicional nem avaliação/read-save/main completos nesta rodada. Summary3cbc5c48eb49e46a0d59ee1e8fa4bb363ba170293d858cf90370cd8a25c19de0, snapshot/checkpoint/raw/teardown conferidos Lead antes das novas fontes legítimas. Dados imutáveis sintéticos retidos até destruição física, appNOSUPER/NOBYPASS/admin separado; nenhuma publicação clínica.
- REDs/FAILs preservados: fixture inicial sem learningAssignment tornou o primeiro RED inconclusivo; fixture reconciliado e capturedbranch desabilitado reproduziu a falha antiga, depois restaurado byte-exato. DBguard RED comprovou commit de item alheio; primeiro GREEN falhou42501 por EXECUTE ausente; grant mínimo corrigido. Vetores MULTIPLE revelaram42883 por alias JSONB interno sombreando texto; aliases explícitos corrigiram e GREEN4 passou. Extração coesa do parentport mantém função abaixo do orçamento anterior;85unit/28migration-governance/strict/lint/scanner/cycles/migration57/diff PASS, sem ratchet/exclusão/build.
- CI R7 handoff18fontes/1020refs conferidos Lead,313canônicosPASS. Fresh21PREPOSTCURRENT/2158artefatos REVISE3: representação describe/list vs reporter recusa testes genuínos; collector aceita job de documentação com substring scanner e cronologia invertida.84observações78conformes6divergentes, limites de exposição de narrativa SPEC declarados. RLS produtor/raw e promoção/provenance ainda exigem integração; remote/certificação NOT_PROVEN. Reparo delimitado em fila, nenhum aceite geral.
- R12 handoff4fontes/183refs reportados e verificados Lead,151canônicosPASS. Fresh20PREPOSTCURRENT/refs REVISE P1 recovery torna replay original inacessível após mudança de identidade e P2 savereceipt aceita estado/versão incompatíveis:38independentesPASS6FAIL0skip. Narrativa/metadata exposure limitado declarado; falhas executáveis válidas. R13 autorizado nos mesmos4 arquivos e artefatos próprios, ledger/helpers antigos readonly, sem build/install/PG. Mapper puro T18 em nova lane2fontes declaradas, SQLreader/outertransaction/main Lead; dois builders máximos, sem descendentes.
- Evidências: native-answer-database-guard-green4-lead-verification.json; native-bound-answer-write-refactor-static-green1.log; lead-ci-r7-independent-review-verification.json; lead-participant-r12-independent-review-verification.json; lead-participant-r12-precritic-verification.json. Próximo: reader/evaluation/save/main T18 na mesma transação, R13/CI consumer+producer e revisão independente, jornada/current gates e restante44. RedisNOT_EXECUTED/REM06/HCONTENT/sameUID/remote/AAA001 específicos preservados; sem phase/release/commit/push/deploy/publicação.

## 2026-10-03T21:44:36Z — Native adapter parcial e fresh reviews

- EXEC-AUDIT-20261003 IN_PROGRESS integral44. NativePG GREEN2 histórico4PASS0skipCLI0 salva anchor33/31objetivas corretas e2TEXT humano, sem nota global. Lead raw8/selectedPREPOST conforme número exato no verificationJSON/42checkpoint measured de45 prechecked/teardown conferidos;3checkpoint históricos não pertenciam ao inventário selecionado, sem afirmar prepost desses3. Sem main/concorrência/currentbuilt/clinical/globalaccept. RED3 válido1FAIL3PASS falta reader; RED1/2 erros próprios de fixture SUBMIT antesSALVA/activityId ausente preservados. Unittransaction RED5/GREEN9; GREEN intermediário8FAIL por mockhistory do próprio teste corrigido.
- Native extensãoGREEN3 falhou na própria coleta: testes concorrentes aninhados,3PASS1FAIL em4collected; estrutura corrigida sem alteração de oracle/guard, inventory7 atual conferido. Fullmain HTTP com convite/cookie MODERATOR reais preparadoNOT_EXECUTED; main ainda readerless para RED discriminante. Mapper freshREVISE2 com15PREPOSTCURRENT/26refs:7public metadata viola limites/plaintext e choice-onlyFORMATIVE incompatível comguard de módulo completo. Reparo2files delegado sem mudar contratos/aplicação. Capturetime gap9RED corrigido,166unit+104probes270PASS.
- R13 handoff4sources/260refs conferidos Lead,182canônicos e18probes copiados builderPASS; fresh critic20paths ativo. Fixture readonly reflexão ONLYcounter0→2 alinhaGET SALVA2, assertions/POSTstartreset1 intactos; histórico67/1 preservado. CI R8 reparando3findings. Dois builders máximos, sem descendentes/build/live na lanes.
- Evidência: lead-native-evaluation-green2-historical-verification.json; native-evaluation-transaction-unit-green2.log; native-evaluation-seven-test-inventory-current.json; lead-native-evaluation-mapper-fresh-review-verification.json; native-capture-public-contract-red1.log/green1.log; r13-participant-handoff-final-1.json; lead-participant-r13-reflection-fixture-coordination.json. Próximo: freeze mapper; native7/mainRED→GREEN/concurrency; freshweb/CIreviews+producer e currentintegrated44gates. RedisNOT_EXECUTED/REM06/HCONTENT/sameUID/remote/AAA001 específicos; sem phase/release/commit/push/deploy/publicação.

## 2026-10-03T21:56:29Z — Native main compilado7PASS e três fresh critics

- EXEC-AUDIT-20261003 continua IN_PROGRESS integral44. T18 GREEN compiledmain atual7PASS0skipCLI0 genuinePG18.4, appNOSUPER/NOBYPASS/adminNOSUPER/BYPASS separado. API realaceita convite MODERATOR/cookie e GETsession200, anônimo401/foreignscope403/evaluate200; publicprojection semanchor/keys/fontes/respostas privadas. Catálogo congelado33/31objetivas31/31,2TEXT humano/semnota global, anchor exato persistido; missinglegacy/retiradas/stale/foreign negam semwrite. Duas queries realmente bloqueadas provam formwithdrawal aguardando pid da avaliação enquanto runtimeinsert bloqueado, locks sustentados atéoutercommit. Summaryc382505db8e3e7f5ceafeaf8b37063f719836f86a2869fc5e744af3a21c91cda;48checkpoint e2730selectedPRE=POST=CURRENT/raw9 e dirausente/portarecusada conferidos Lead.
- MainRED válido HTTPcookie/session200/evaluate409 eformfencePASS, total5PASS2FAIL; outroFAIL foi próprio fixture tentando apagar associação imutável, corrigido para atividade legada separada sem associação, nenhuma guard/oracle relaxada. Testes concorrentes anteriormente aninhados preservadoscomo harnessFAIL; coleta atual7conferida antesGREEN. Builds SOMENTEapplication/persistence/API0/0/0, rootstrict/lint/complexity/cycles/diff0; mainfunction ratchet inalterado. MapperR2 repaired178unit/503scopedregressions owner; capture166+104probes270PASS. Antigos pacotes/reviews negativos imutáveis, semclinicalpublication/globalwholecandidate/webassembly/remoteaccept.
- Freshnativecritic58sources+9rawobservations ativo, independente autorizado a reproduzir7emclusterpróprio sembuild. WebR13freshcritic20ativo após182canônicos/260refs; CI R8fresh21ativo após340canônicos/probes16 reportados. Leadvalidou2692refs CI recursivas/18sources/27indexes; primeiroparse0refs só procurava path/shaobjects, raw0preservado e scanner flatSHA/indexcorrigido, sem tiraracceptdezero. RLS/workflow produtores ainda readonly atéreviewterminar. Todosbuilders fechados; trêscritics semdescendentes, fontes/pacotesmain congelados.
- Evidência: lead-native-main-green1-current-verification.json; native-main-coordinated-three-builds.log; native-main-post-three-build-root-strict.log; native-main-fresh-review-map.json; lead-native-evaluation-mapper-r2-pre-native-verification.json; lead-participant-r13-precritic-verification.json; lead-ci-r8-precritic-verification.json. Próximo: verificarcritics/patchboundedseREVISE, reconciliarproducerCI depoisfreeze, jornada/currentassembledgates/restante44. RedisNOT_EXECUTED/REM06/HCONTENT/sameUID/remote/AAA001 específicos; semphase/release/commit/push/deploy/publicação.

## 2026-10-03T22:03:09Z — R13 fresh REVISE4 e R14 delimitado

- R13 fresh REVISE4 confirmado: 20PRE=POST=CURRENT/132artefatos;182canônicosPASS versus34PASS28assertionFAIL independentes. P1 normalização/diagnosticreceipt;P2 deadline/unmount/DTOguards. R14 reparo delimitado iniciado, sembuild/backend/config; históricos preservados, nenhuma aceitação global.
- Critic fechado antes do reparo; exposição incidental SPEC declarada limita cegueira perfeita, sem anular repros executáveis. Native58/CI21 críticos independentes continuam; seus pacotes source/dist congelados. R14 escreve apenas página/receipt/contracts/diagnostic e testes correspondentes, novos helpers declarados antes de editar; ledger/resource helpers anteriores readonly. Lead único escritor de controles.
- Evidência: .agent/artifacts/remediation-20261003/lead-participant-r13-independent-review-verification.json; critic-participant-r13-i1-evidence/review-report.txt; sentinel.json; sha256-artifact-manifest.json. Próximo: verificar native/CI reviews; R14 RED→GREEN→freshreview, producerCI/jornada/currentgates44. Status IN_PROGRESS; semcommit/push/deploy/publicação.

## 2026-10-03T22:12:45Z — Dist de contratos divergente e lanes disjuntas

- Regressão HTTP15files/114casos usando pacotes compilados atuais:111PASS3FAIL0skip/CLI1, exclusivamente session cap nas rotas rotate/invitation/recovery. Fontes max43200 e dist max604800 conferidos em6arquivos. Controle mínimo troca apenas @cvg/contracts para fonte e passa114/114/CLI0, sem alterar dist. Não se afirma candidato compilado inteiramente reconciliado. Rebuild SOMENTEcontracts e rerun114 pendentes após liberação do freeze nativecritic.
- FreshjourneyR7 critic22fontes ativo readonly/sourcealiases/doubles; mapa inicial tentava incluir projection.test.ts inexistente, falhou antes de gravar, corrigido para22 membros reais antes de prosseguir. Native58/CI21 permanecem readonly; R14 packet8existentes+2novosdiagnostic-client declarados. Segundo builder autorizado preparar APENAS novohelper RLS/evidence e novo teste, nenhuma integração às21fontes CI enquantocritic aberto; sem builds/install/PG/controles pelosbuilders.
- Evidência: .agent/artifacts/remediation-20261003/lead-current-built-http-regression-verification.json; lead-current-built-http-regression.results.json; lead-contract-source-http-control.results.json; lead-journey-r7-fresh-review-map.json. Status IN_PROGRESS integral44; nenhum aceite global/remote/clinical, RedisNOT_EXECUTED e holds específicos preservados.

## 2026-10-03T22:34:47Z — Reviews encerrados; reparos e metadados canônicos

- Native58/raw9/2730selected PRE=POST=CURRENT e662artefatos critic conferidos Lead. Fresh genuinePG18.4 reproduziu7PASS/mainHTTP;432unitPASS,25probesPASS1FAIL, REVISE P2: choiceID <id> aceito na publicação mas não no contrato plain de resposta. CURRENTprocessguard do critic encontrou4processos externos em checkouttemporário de outra lane e parou leituras; bytefreeze exato/ownhandles encerrados, sem attestation global de processos. Lead rejeita IDs não representáveis em publiclearning/capture/mapper, sem alterar assessment/decoder/SQLguards:6RED352PASS→358GREEN0skip, lint/format/rootstrict0; antigo teste aceitava idHTML e agora conserva somentecontrolelabelHTML legítimo.8sources+novoownrunner9cases preparados, NATIVE_AFTER_GUARD_NOT_EXECUTED; builds SOMENTEcontracts/persistence aguardam janela após browserfinal.
- CI21PREMIDPOSTCURRENT/7859regularfiles/17literal-symlinkdigests conferidos;340canônicosPASS e101probesPASS2FAIL. FreshREVISE P1 títulos RLS inventados passam endsWith, P2 archive antigo não vinculado à tentativa; gap produtorraw/inventory/execution permanece. Critic fechado, builderCI recebeupacketdisjunto expandido para correçõesconsumer e integraçãoRLS/workflow+novohelper/test. Sem remote/wholepromotionbypass demonstrado, sem aprovação inventada.
- Jornada22PREPOSTCURRENT/43refs conferidos;161PASS7FAIL0skip,5findings P2/P3: alvo pré-requisito bloqueado, runtimes multiversão divergentes, módulo de leitura incorreto, ação dashboard obsoleta e projector120/DTO100 incompatíveis. Criticclosed, reparo técnicoLead emfila; doubles não PG, confinamento loaderVite inicial não certificado.
- R14 backend/config/dist untouched; learningSRC9e27be3cb330c42cd9bc4e55b8267ee26cf2265dbb43178e3402f9fbd779d7a0 held através browserfinal. Leadfixture readonlyaccess atual4392826312223be63a5725861441949e4692da91919846a8306b7b7622881e9d:3emptyjourneyenums,4wireanswerprojections stripkey/addsavedAt,1restoredGETsavedAt,removeapelotargetobsoleto,activity terminalaction deriveProgressNextAction. Rawarrays/requestbodies/assertions inalterados. Inverseprimeira fatia comprovou1ecbaseline; hash incorreto em mensagemLead corrigido com bytes/provenanceauthoritative, sem fonteextra.
- Evidência: lead-native-main-independent-review-verification.json; lead-ci-r8-independent-review-verification.json; lead-journey-r7-independent-review-verification.json; native-choice-answerability-ready.json; native-choice-answerability-red.results.json/green.results.json; lead-r14-readonly-access-fixture-coordination.json. Status IN_PROGRESS integral44; native9/buildcompiled/current114/freshreviews/journey5/CIassembly/currentassembled ainda pendentes. RedisNOT_EXECUTED/REM06/HCONTENT/sameUID/remote/AAA001 específicos; semcommit/push/deploy/publicação.

## 2026-10-03T22:47:01Z — Native choice guard9 e HTTP compilado114; R14 congelado

- EXEC-AUDIT-20261003 continua IN_PROGRESS nas 44 tasks. Builds limitados a @cvg/contracts e @cvg/persistence retornaram 0/0. PG18.4 executou 9/9 testes sem skips/CLI0, incluindo main compilado com convite/cookie/autorização reais, avaliação transacional imutável e duas negativas SINGLE/MULTIPLE para IDs impossíveis no contrato de resposta. Summary05b4a2675af36d62f53e544c6d48614d0741c4ca7e47d8eb964b30af525ee1a0; 60 hashes do checkpoint, 2732 arquivos selecionados PRE=POST=CURRENT e 8 referências raw conferidos Lead. AppNOSUPER/NOBYPASS e adminNOSUPER/BYPASS separados; fixtures imutáveis retidos até destruição física do cluster, diretório ausente e porta34777 recusada em nova observação. Pending fresh review, sem publicação clínica/assembledweb/global/remote accept.
- Regressão das 15 suites HTTP com pacotes compilados correntes passou 114/114/CLI0/0skip após rebuild: fonte e dist usam limite de sessão43200. Resultado histórico111PASS3FAIL e controle mínimo aliascontracts114PASS preservados. Isso comprova essas suites, sem inferir candidato integral montado. Guards escolha tiveram6RED352PASS e358GREEN; nenhum contrato de resposta, decoder, SQL, piso ou ratchet enfraquecido.
- R14 owner informou freeze10 e240canônicos=79Chromium161unit/0skip; strict/lint/static0. Medidas atuais page2125/2377, diagnostic680/851, maxownedfunction112/150 (109 era históricoR13), resilience1487 com warningsoft800/hard2000. Probes critic copiados25PASS5FAIL/30 são EXPECTED_CHANGED_ORACLE reportado, não30PASS; fresh review/handoff verificado ainda pendentes. learningSRC9e27be3cb330c42cd9bc4e55b8267ee26cf2265dbb43178e3402f9fbd779d7a0 e access4392826312223be63a5725861441949e4692da91919846a8306b7b7622881e9d permanecem congelados.
- Novo critic nativo independente recebeu somente mapa literal60source/9raw e writes próprias; pacotes/config/locks/dist frozen até encerramento. CI R9 consumer/produtor/workflow em reparo disjunto; janela RLS live fechada até packet pronto. Jornada5 findings aguardam reparo coordenado; nenhum avanço silencioso a COMPLETED. RedisNOT_EXECUTED/REM06/HCONTENT/sameUID/remote/AAA001 específicos mantidos.
- Evidências: .agent/artifacts/remediation-20261003/lead-native-choice-green1-current-verification.json; native-choice-main-fresh-review-map.json; lead-current-built-http-after-choice-build-verification.json; r14-participant-static-proof-final-1.json. Próximo: verificar handoff/freshcriticR14, native freshreview, CI R9 assembly+proof+review e jornada5/currentgates44. Sem commit/push/deploy/publicação.

## 2026-10-03T23:32:18Z — R14 fresh REVISE e reparos delimitados nativo/CI/jornada

- EXEC-AUDIT-20261003 continua IN_PROGRESS nas 44 tasks. Handoff R14 SHA0d09484daeb6b11bdee24524b780f0db96cd865d00577356cf2c5e5d179ff559/246128bytes conferido. Lead verificou 737 ocorrências/622 caminhos distintos; o checklist owner625 usa denominador próprio. Copiados históricos:31unitPASS+25browserPASS5FAIL=61casos56PASS5FAIL; smoke/compatibilidade originais não executados. Nenhum contador convertido em aprovação.
- Fresh R14 REVISE1P2 validado:318artefatos e36PRE=POST=CURRENT.240canônicosPASS/78independentesPASS não anulam2FAIL reais: resposta local inválida é marcada ambígua semPOST e impede correção. Critic encerrado; Lead acrescentou RED2FAIL1controlePASS, valida resposta NOVA antes de alocar snapshot e conserva replay original realmente enviado. Regressão canônica R16 em execução, strict/lint0; conclusão/freshreview pendentes.
- Native fresh REVISE2 conferido237refs/60fontes9raw e2732fingerprints: pares MULTIPLE introduzem markup entre IDs e FORMATIVE semTEXT é aceito no capture mas negado no mapper. Reparo coeso8fontes:5RED/367GREEN pure e2RED/14GREEN contrato público, ambos0skip. Permutações verificadas sem proibir SINGLE com ângulos válidos; capture exigeTEXT nas duas modalidades. Primeiro helperRED tinha fixture própria inválida; strict inicialTS2307 corrigido por import relativo de teste para assessment dist existente; históricos preservados. Nenhum build/PG após esse reparo; native9 anterior permanece evidência histórica do escopo anterior.
- Fresh CI R9 REVISE4 conferido5034files/23PREPOSTCURRENT;412canônicos e51probes de observação não equivalem a segurança aprovada. Reparo CI-R10 disjunto: coerência produtor/collection/gates vivos, risk-register strict/counts, audit corrente antespreflight e mesmo --audit nosconsumers, contadores safeinteger não negativos. Jornada R8 reparando5findings em fontes disjuntas; nenhuma janela build/live aberta.
- Redis7.4.11 extraído de imagem local cached por container único nunca iniciado; runner R15 pronto com prova deownership PID/socket e8testes readonly, mas runtime NOT_EXECUTED e fingerprint deve ser atualizado após writers congelarem. RLS snapshot Git LOCAL próprio779files/SHA9cbc808a4e5c82efd61458414dc92cea0b33550b preparado, nenhumPGexecutado/remoteclaim. RootHEAD preservado. Scan secrets oficialCLI1 mantido:3artefatos históricos de testes sintéticos triados em metadata redigida; gate continua FAIL, sem alterar provas/excluir arquivos.
- Evidências: lead-participant-r14-independent-review-verification.json; lead-native-choice-independent-review-byte-verification.json; lead-ci-r9-independent-review-verification.json; native-publication-response-coherence-ready.json; r16-participant-preflight-red1-results.json; r15-redis-20261003-prep-7c91e4/ready-v2.json; lead-secret-scan-triage-metadata.json. Próximo: concluir R16/contratoformat/static e freshreview, freezeCI/jornada, coordenar builds/provas nativas/Redis/RLS e gates44 correntes. REM06/HCONTENT/sameUID/remote/AAA001 específicos; sem aprovação global/clínica/manualG07/release/commit/push/deploy.

## 2026-10-04T00:46:00.670329Z — R16 REVISE8, R17 parcial e native14 compilado

- EXEC-AUDIT-20261003 mantém IN_PROGRESS integral44tasks. Fresh R16 conferido:2898refs,36CURRENT e504sentinels;243canônicosPASS versus25probes15PASS10FAIL, oito findings reais F01–F08. Não são substituídos pelos oracles antigos R14. Lead reparou F04 draft acknowledgment e F07/F08 identidades duplicadas: contratos4RED/24GREEN, feedback1RED/1GREEN focal e regressão completa244PASS0skip/CLI0. Revogação mantém limpeza integral; primeiro patch atingiu reset errado, corrigido antes da regressão completa. Cinco findings F01/F02/F03/F05/F06 em execução SOURCE_WINDOW_OPEN R17 por builder web-only8paths, sem builds/backend/config/controles.
- CI-R10 congelado:512canônicos0skip,47sealrefs+3932rawfiles+26contextos bytes conferidos Lead; novo freshcritic somentefontes ativo. JornadaR8 owner163PASS e19sources/82durable refs conferidos antes da reconciliação de build; 1012caches contados pelo owner não foram hash-manifestados. Generic120 passa apenas pela fronteira interna explícita; currículo12existing+6new e1inalterado, sem aprovação clínica. Novo connected test não compilava por imports de pacotes não declarados: contratosbuild0/curriculumbuild2 preservados; caso exato de hashes catalog/seed/session movido para novo application diagnostic-catalog-boundary.test.ts, parser currículo usa contrato relativo já compilado. Nenhuma assertion/dependência pública alterada; handoff owner imutável agora histórico nesses arquivos e learning schema. Jornada canônica sucessora em verificação.
- Scoped builds sucessores curriculum/application/persistence/api0/0/0/0, contratos0 anterior conservado. Rootstrict pósbuildCLI0. Native14 genuinePG18.4/compiledmain passou14/14/CLI0/0skip;66checkpoint hashes e2782selectedPRE=POST=CURRENT/8rawrefs conferidos. AppNOSUPER/NOBYPASS e adminNOSUPER/BYPASS/CREATEROLE de fixtures separados. Dados técnicos e auditoria imutável retidos até destruição física; /tmp/cvg-live-pg-418A0U ausente e44593 recusada. Summaryfa9d1e1c10bb8ba3867f2d9f371954aee1a8c5a39266a26f0136d132e73ce462. Pendingfreshreview; não assembledweb/nativeclinical/fullcandidate/remote/release accept.
- Redis/RLS novos permanecem NOT_EXECUTED; produtores locais preparados requerem snapshots atualizados após fontes congelarem. Scan secrets oficialCLI1 por3probes sintéticos históricos mantém gateFAIL; nenhum histórico alterado/excluído. REM06/HCONTENT/sameUID/remote/AAA001 específicos permanecem, sem bloqueio artificial geral. Semcommit/push/deploy/publicação.
- Evidência: lead-participant-r16-independent-review-verification.json; r17-partial-canonical-final1-results.json; r17-public-identity-contract-final-results.json; r10-ci-final-seal.json; r8-journey-implementation/freeze-handoff.json; native-coherence-scoped-build-successor1-summary.json; lead-native-coherence14-current-verification.json. Próximo: R17 TDD/freshreview, CI/jornada freshreviews, produtoresRLS/Redis e checks44 correntes; Lead único escritor de continuidade.

## 2026-10-04T01:38:31.413489Z — Reviews atuais REVISE; CI R18, jornada R19 e proveniência R20

- EXEC-AUDIT-20261003 permanece IN_PROGRESS nas 44 tasks. Revisões fresh encerradas e bytes conferidos: CI-R10 quatro findings reais, native14 dois P1 de proveniência e jornada dois P1 de autoridade. Native14/169jornada/512CI são evidências históricas dos respectivos escopos; nenhuma aprovação global é inferida.
- CI-R18 declara arquivos externos ao consumer, rejeita scores não finitos/fora0–100 e usa lifecycle de recursos próprios desde bootstrap; o runner deixa de matar collectors por basename. TDD lifecycle7RED/7GREEN, claims21GREEN; primeira regressão540 teve537PASS3FAIL, preservada. Duas falhas eram pnpm exec em diretórios temporários sem package e uma fixture extraía nomes anteriores dos adaptadores; CLI Vitest instalado e nomes reconciliados sem mudar assertions. Focal3PASS/131selectionSKIP; lint2CLI0, regressão completa sucessora em execução. Correção de classificação: os sete FAILs dos probes CI anteriores contêm cinco assertions válidas e duas oracles inválidas, incluindo consumer sem declarar arquivo neutro; os quatro findings reais permanecem. Histórico original e primeira classificação preservados.
- JornadaR19 source-only277PASS0skip, quatro fontes alteradas dentre oito autorizadas, nenhum helper/export novo. Lead verificou1303arquivos do manifest e47refs source/supplemental, zero drift; handoff a7d10d117ea3daaee066e0f226a98e57e4076cc0882ccf4ad881c23030b0a111. Fresh I1 Bernoulli somente fonte/mapa atual ativo. J1 usa completion do produtor real; J2 impede ATRIBUIDO/staleactivity de contornar pré-requisito e conserva continuidade autorizada. Nenhuma prova nova de banco/mutação é atribuída a esse recorte.
- WorkerT23 candidato127PASS0skip e quatro fontes congeladas, evidência local/doubles. Não há orçamento numérico aprovado de drain nem hook OTLP próprio; freshreview e API/supervisor permanecem pendentes. WebR17 cinco guards em execução em oito caminhos exclusivos. Builder jornada encerrou escrita nesses caminhos e passa à lane nativa R20 disjunta: forward0057/proveniência/capture/read failclosed, source-only; builds/live fechados até checkpoint específico.
- Native review dois P1 são integridade de ingestão privilegiada: auditpublication não liga action/resource ao formulário; blueprintapproval não verifica actor/scope/outcome/time/resource. Novo guard não pode promover registros legados inválidos; fixtures técnicas/auditoria são preservadas e nunca aprovação clínica. ActualPG para essas negativas ainda NOT_EXECUTED. Redis/RLS novos NOT_EXECUTED; secretsgate oficialFAIL mantém histórico, sem exclusões. Dependency audit atual dev/prodCLI0/zero vulnerabilidades observadas. REM06/HCONTENT/sameUID/remote/AAA001 específicos mantidos.
- Evidência: lead-native-journey-worker-current-review-verification.json; lead-ci-r10-independent-review-verification.json; lead-r19-journey-handoff-verification.json; r18-ci-canonical-final1-results.json; r18-ci-boundaries-green1-results.json; r18-worker-shutdown-handoff.json. Próximo: CI540 sucessor/freshreview, R17/R19 reviews, nativeRED/forwardguard/GREEN, API shutdown e produtores Redis/RLS atuais. Semcommit/push/deploy/publicação/global/manualG07/release accept.

## 2026-10-04T02:27:42.833595Z — CI R22, jornada R23 e revisão API T23

- EXEC-AUDIT-20261003 permanece IN_PROGRESS integral44. CI R18 regressão540PASS0skip preservada; freshREVISE cinco findings: spawnENOENT sem cleanup, grupo próprio sobrevivente ao líder, counters reporter inválidos admitidos, candidate sem trustedClaims e P3 cardinality/identity incompletas. Lead conferiu1334artifactrefs/29sources, inclusive um hash de symlink literal: primeira verificação leu destino incorretamente e foi preservada, sucessora zero mismatch. Attestation I1 estrita NÃO satisfeita por tentativa inicial Corepackdownload e leituras transitive fora mapa; execuções corrigidas173canônicosPASS/84probesPASS9FAIL preservadas. Pauli R22 autorizado somente CI/source+own child proofs, sem providers/builds/PG.
- Web R17 handoff298PASS=193unit105browser, source8/6728artifactfiles/39current verificados Lead. Euler fresh readonly41 encerrado REVISE2P2: replay diagnóstico rebaixa checkpoint novo e acknowledgement participante pode reduzir versão aceita. Lead303artifactrefs/41sources zero mismatch;298canônicosPASS/41independentesPASS2FAIL, native reachabilityF02 não comprovada. Novo reparoLeadR25 delimitado segue TDD; semautoaccept. API T23 oito fontes congeladas, 40focais e421PASS2RedisNOT_EXECUTED/49files, strict/lint/format/diff/scanner0; main439/439 e server158/166, teste1061soft800warning. Boyle fresh readonly66/source-only ativo. Worker127 local permanece candidato; sem deadline global aprovado/hook OTLP próprio/OS-supervisor/new live claim.
- Jornada freshR19 REVISE2P2 verificada265refs/36PREPOSTCURRENT: retenção apagava progresso concluído e atribuição futura ficava disponível. LeadR23 seis fontes com helper de elegibilidade: RED6FAIL13PASS, GREEN112; adicional runtime obsoleto oferecia3ações para atribuição futura, RED3FAIL1controlePASS/112selectionSKIP, GREEN116. Regressão ampliada300PASS0skip e probes anteriores60PASS0skip sem alteração das assertions; strict/lint/format/diff0. buildScopePath147/150 e teste825soft800warning preservados. Source-only/synthetic relational SQLite, não nativePG ou E2E; freshreview continua pendente.
- NativeR20 oito fontes/1299artifacts verificados sem drift, handoffe51f2ae05de406be4c71b562e5653bfedead9618f71cf3f3843a7a94f266c55d. 570unitPASS0skip/strictlintformatdiff0; forward0057 mantém0055/56 imutáveis, capture/read negam proveniência ausente/inconsistente. Root17PGnegativas/controle preparados mas NOT_EXECUTED; R24 prepara apenas runner/legacyfixture próprios. Historical0..56 reconstruído deverá preservar RED real antes de forward0057GREEN, com roles appNOSUPER/NOBYPASS admin separado e immutablelegacy não promovido. Nenhum build/PG novo executado nessas lanes.
- Secrets gate oficial continua FAIL; novos artefatos exigem scan atualizado, não presumir número antigo3. Novos Redis/RLS NOT_EXECUTED; dependency audit dev/prod corrente0/zero observado. REM06/HCONTENT/sameUID/remote/AAA001 específicos preservados; nenhuma paralisação geral, commit/push/deploy/publicação/global/nativeclinical/G07/release accept.
- Evidência: lead-ci-r18-independent-review-verification-corrected.json; lead-r17-participant-handoff-verification.json; lead-r21-api-shutdown-handoff.json; r23-journey-canonical-final1-results.json; r23-journey-probes-final1-results.json; r23-journey-complexity1.json; lead-r20-native-source-handoff-verification.json. Próximo: R22 TDD/review, web/API reviews, journey freshreview, native frozencheckpoint/build/RED/forward/GREEN, worker/T24/Redis/RLS/current44gates.

## 2026-10-04T03:54:08.572938Z — R25/R26; fresh REVISE e native R24 RED confirmado

- status: IN_PROGRESS; EXEC-AUDIT-20261003 integral44. R14 SHA0d09484daeb6b11bdee24524b780f0db96cd865d00577356cf2c5e5d179ff559 e artefatos históricos intactos, oito fontes legitimamente supersedidas. Histórico240canônicos/copied61=56PASS5FAIL permanece semautoaccept.
- R25 atual308canônicosPASS0skip/43probes antigosPASS; freshREVISE P1 confirmaçãoA após GETC e P2 feedback/appeal DTOdrift.358artefatos41fontes conferidos0mismatch; fresh30=20PASS10FAIL agrupados2. Isolamento integral da sessãoINVALID por temporários iniciais externos declarado; findings funcionais preservados. Critic fechado, R27 segundo builder somente frontend autorizado/sourcealiases, sembuild/config/backend.
- R23 freshREVISE2P2: trilha oferece execuçãoPAUSADO/BLOQUEADO e retenção revoga pré-requisito concluído.88artefatos43fontes conferidos0mismatch;228regressõesPASS/fresh44=35PASS9FAIL. Evidência relacional/HTTPde fonte, nãoPG/RLS; reparo aguarda teardown nativefreeze.
- R26 API diagnóstico safe EADDRINUSE/CLI1 passou após REDreal1FAIL1controlePASS;432canônicosPASS2RedisNOT_EXECUTED/434;8probes OS/HTTP/TCP antigosPASS. Strict/lint/format/diff/scanner0;main439/439; freshreview pendente. Worker127fonte mantém gap deadline operacional/OTLP, T24pendente.
- R24 cinco scopedbuilds contracts/curriculum/application/persistence/api0, recibos reais; checkpointR24-NATIVE-20261004-LEAD1 SHA5932a6f79774c44d165baa113fd8dad6d84bc96ce8b5d52142741191a6774c4b. NativePG18.4 histórico0..56:17=6PASS11FAIL0skip/CLI1/HISTORICAL_RECONSTRUCTION_RED; summaryb19ac3171d8aec146e251244cac04887d5bb6b2dae2df9bebe8ed6b07fdbaa0a/14refs conferidos.1899source/2313build/39091dependencyPREPOSTCURRENT iguais; teardowndiretórioausente/porta36635refused. Não convertidoREDemPASS. Forward0057GREEN iniciado, ainda sem resultado; pacote fonte/build/deps permanece congelado.
- CI R22 segue disjunto; novos Redis/RLSNOT_EXECUTED, secretgateFAIL requer scan atual. REM06/HCONTENT/sameUID/remote/AAA001 específicos; semcommit/push/deploy/publicação/clinical/G07/release/globalaccept.
- last_completed_action: manifests/reviews e scopedbuilds verificados; históricoREDnativo esperado preservado. next_action: concluir forwardGREEN/teardown; CI R22/webR27/freshreviews; jornada após nativefreeze; worker/T24/Redis/RLS/current44gates.
- evidence: .agent/artifacts/remediation-20261003/lead-r25-r23-r14-review-artifact-verification.json; lead-r25-participant-handoff.json; lead-r26-api-diagnostic-handoff.json; lead-r24-historical-red-verification.json; lead-R24-NATIVE-20261004-LEAD1-checkpoint.json.

## 2026-10-04T04:27:51.560664Z — R28 native corrente, R27 e reviews delimitados

- status: IN_PROGRESS; EXEC-AUDIT-20261003 integral44. NativeR24 históricoRED17=6PASS11FAIL/CLI1 preservado; GREEN1 CLI1 comparou Array com Result(57), seed2PASS; conserto representação do runner RED7PASS1FAIL/GREEN8PASS usa Result instalado e mantém rejeição de hash/time/order/row. GREEN2 real23PASS8FAIL/31 expôs SQL correlatedDrizzle; nenhum teste foi substituído por skip.
- LeadR28 supersede EXATAMENTE provenance.ts/test do R20: Drizzle removia qualificação Column em single-table SELECT, subquery confundia auditid com id interno. SQL outeraudit explicitamente qualificado; discriminator fullDrizzle RED49PASS1FAIL, GREEN50; regressão571PASS0skip, persistence strict/lint0 e rootstrict0. R20 handoff/1299artifacts permanecem históricos imutáveis, novas duas fontes declaradas no checkpoint sourceSupersessions; nenhum SQL0055/56/57,rootfixture/assertion/provenancecriterion enfraquecido.
- Novo scopedbuild contracts/curriculum/application/persistence/api0/0/0/0/0 e checkpointR24-NATIVE-20261004-LEAD3 SHA636896ad7f5ba40e1e5eb6c6d224bd9da0404cf0f442dd593281f88276ae31c0. ActualPG18.4 CLI0 seed2PASS,current-original31PASS,legacyDENY4PASS,0skip: normal0057 preserva57trackingrows e acrescenta1; legado immutable inválido continua negado/no writes. Summary21bf50e6498a4b57ec0998b381ec66628a7f413983824a7fd16e770e75148dcc e23refs conferidos;1899source/2313build/39091dependencies PREPOSTCURRENT iguais. AppNOSUPER/NOBYPASS, adminNOSUPER/BYPASS separado; guardsenabled/SECURITYINVOKER. Teardowndiretórioausente/porta34969refused; todoshandles settled. Técnica sintética, não clínica/fullweb/publicação/globalaccept. Freshnative83source/9rawFaraday ativo.
- CI R22 final9sources frozen: full576PASS/original540preserved anterior ao delta saída; successor39focal+3installedexitcontractsPASS/cheapchecks0. Lead23artifactrefs9sources conferidos0mismatch. FreshCI35sourceNewton ativo; sem Redis/RLS/remote/globalgreen inventado.
- R27 builder source4/5229artifacts41source conferidos0mismatch; novos44PASS=22unit22browser; full351PASS1FAIL/352 por fixtureABERTOinvalid. Lead alterou somente readonlyaccessABERTO->NOVO; inversebyte-exact439baseline/current4e578287a012d1ccfd87e2a787730161869a3e10325029821bf5db5ef7aad4a8, assertions intactas. Focal1PASS14selectionSKIP. Nova full351PASS1FAIL preservada por ownedlocator alertambíguo; espera operação concluída+últimoalertamutation+textoexato acrescentadas semprod/timeoutchange, focal10PASS65selectionSKIP. Fullcurrentfinal2 emexecução, nenhum352PASS antecipado.
- API432PASS2RedisNOT_EXECUTED/434 e worker127fonte em freshreview80sourceEpicurus; contratos drain/OTLP/deadline operacional não aprovados globalmente. JornadaREVISE2 operacionalpaused/blocked e retenção perde pré-requisito continua pendente; sem desbloqueio por quiz. RedisR29 apenas prepara namespace novo/copiacachedbinary/CLIoffline; live aindaNOT_EXECUTED. RLSprodutor current pendente/secretgateFAIL requer scan novo. REM06/HCONTENT/sameUID/remote/AAA001 específicos.
- last_completed_action: native atual e histories/hash proofs verificados; CI/webhandoffs conferidos e fixture corrigida. next_action: terminar fullweb/freshreview; verificar criticCI/APIworker/native; Rediscurrentrecipe/checkpoint/liverun; jornada após sourceholds; T24/RLS/gates44. Semcommit/push/deploy/publicação/clinical/G07/release/globalaccept.
- evidence: .agent/artifacts/remediation-20261003/lead-r28-native-final-verification.json; lead-r24-native-green2-failure-verification.json; lead-r24-runner-ledger-repair-provenance.json; lead-r22-ci-successor-verification.json; lead-r27-handoff-pre-fixture-verification.json; lead-r27-feedback-fixture-coordination.json; lead-r27-appeal-alert-measurement-coordination.json.

## 2026-10-04T04:42:05.551966+00:00 — R28 scoped PASS; CI PASS, web352 e APIworker REVISE4

- status: IN_PROGRESS; EXEC-AUDIT-20261003 integral44. Lead conferiu R28 critic36refs/83sources e APIworker1059artifacts/80sources, zero drift; R29prep932refs conferidos, liveNOT_EXECUTED. Critics encerrados; nenhum aceite global/clínico/G07/release.
- Native freshI1 R28 PASS restrito:539 próprias assertions de fonte (516originais+23novas), CLI0;37assertions PG autorizadas revisadas, sem nova execução PG pelo critic e sem observação independente do exit do child Lead. Prova técnica Lead seed2/current31/legacyDENY4 atual já conferida, não publicação clínica.
- CI freshI1 R22 PASS restrito, Lead2832refs35source conferidos:576assertion occurrences/556unique fullNames em12files,27controles novos; sem claim wholebundle/Redis/RLS/remote/global.
- Web atual352PASS0fail0skip (224unit+128Chromium),12files CLI0; rootstrict/webstrict0. Lead alterou somente fixture ABERTO->NOVO e measurement de alerta do novo teste (sem prod/timeout/guardchange); históricos351/1 intactos. Novo freshI1 Hypatia source41 ativo, sourcealiases/owncache/no builds.
- APIworker freshI1 FAIL: P0=0,P1=1,P2=3. Cliente desconectado permite fechar adapters antes do callback; traces já em exportação não são aguardados; falha fatal claim worker sem diagnóstico redigido; bind síncrono inválido deixa listeners no helper (API valida port, alcance limitado). Originais145PASS; final167=163PASS4FAIL, worker fatal observado em harness separado. Nenhuma perda/corrupção de dados ou deadline total numérico inferida.
- RedisR29 caché7.4.11/CLI e contratos9PASS preparados; liveNOT_EXECUTED. Próximo Lead atualiza/valida trace e congela pacote para oito testes originais once; sem RedisPASS antecipado. Depois reparar T23 com TDD e freshreview, jornadaREVISE2/T24/RLS/secrets/current44gates.
- last_completed_action: hashes/reviews conferidos e fullweb352 atual; next_action: Redis freeze/checkpoint/live8, T23 quatro reparos/freshreview; status IN_PROGRESS. Semcommit/push/deploy/publicação/globalaccept.
- evidence: .agent/artifacts/remediation-20261003/lead-r28-r26-r29-independent-verification.json; lead-r22-ci-independent-review-verification.json; lead-r27-current-regression-verification.json; critic-native-r28-i1/manifest.json; critic-api-worker-r26-i1/report.md; r29-redis-proof/recipe.md.

## 2026-10-04T04:54:00.012186+00:00 — Redis R29 actual8GREEN e novos RED/scan

- status: IN_PROGRESS; local Redis7.4.11 original8PASS0FAIL0SKIP/CLI0, snapshot13446PREPARED/PRE/POST/CURRENT iguais/4PIDs ausentes/ports refused; freshcritic ativo, sem candidato distribuído/CI ordinário/globalaccept. Summary7e787445eab0be56af34ec5eb6416c7f4655ee6d8815ade64141ac067bc5ad5f; lead-r29-live-current-verification.json.
- T24 sourcealiases RED2FAIL/1controlePASS; inicial0tests por import incorreto do harness preservado. Sem alteração produtiva/queries proibidas. R30 só prepara T23 até release; R31 scoutreadonly busca autoridade de conclusão anterior sem permissiveEM_REFORCO.
- Scan atualCLI1/11files. Contextos inspecionados são marcadores sintéticos de testes lease/auth/processownership; não valor real divulgado/não scan clean. Fontes e evidência histórica intactas, nenhum allowlist/exclusion/deletion.
- last_completed_action: Redis8 actual/hash/teardown e T24RED/secretcontext verificados; next_action: freshreviews/R30 apóshold/jornada/T24/RLS/current44gates. Lead sole controlwriter, semcommit/push/deploy/publicação/globalaccept.

## 2026-10-04T04:59:58.790023+00:00 — Redis fresh scoped PASS; R30 source-go

- status IN_PROGRESS. FreshI1 Redis original8 scopedPASS;14source (correção do anúncio13),6raw,2transitive estáveis;21artifacts conferidos.14purecontrolesPASS/22badraw cases rejeitados. Original8 não rerodado pelo critic; exit0 observado Lead, não reconstruído de invocation. DoisHTTPlisteners mesmoOS/syntheticoutage/restartnonpersistent limites retidos. Lead sourcehold liberado após encerramento/cleanup; R29 técnico não encerra T12/T20/G05 global.
- R30 preparation1496artifacts conferidos;181cases175PASS6RED0skip,145APIworkeroriginais+12tracing originaisPASS;6nativechildren4PASS2RED esperados. Packet12rootpaths máximo:APIserver/lifecycle/novo requestdrainhelper+tests, OBS tracing/test, worker main/test/lifecycle se necessário. Source-go explícito, sem builds/config/deps/PG/Redis/schema; T24Lead espera terminar regressão R30.
- Critic web41 e scoutdurablejourney continuamreadonly. HistóricoR29prova é boundao candidato de04:43; qualquer novo drift pertinente deve ser identificado e revalidado antes de aceite candidato/global. Nenhum source-only PASS prova clínica/publicação/G07/release.
- evidence: lead-r29-fresh-and-r30-prep-verification.json; critic-redis-r29-i1/report.md; r30-shutdown-repair/prepared-scope.md. last_completed_action: freshRedisverificação/sourceholdrelease; next_action: R30TDD/nativeprocessclosure/freshreview, webreview/journey/T24/RLS/secrets/current44gates.


## 2026-10-04T05:36:34Z — R30/T24 e geometria R33, fontes congeladas para revisão

- status: IN_PROGRESS; objetivo integral44. R14 manifesto246128bytes/SHA0d09484daeb6b11bdee24524b780f0db96cd865d00577356cf2c5e5d179ff559 intacto;737refoccurrences/622pares únicos,726matches e11ocorrências de fonte legitimamente supersedidas; zero divergência durável. Histórico240PASS/copied61=56PASS5FAIL permanece histórico, semsmoke/compatibility/globalaccept.
- R30 dez fontes alteradas de12autorizadas; Lead2049artifacts/12refs fonte conferidos e mainAPI byte-idêntico. RED83PASS13FAIL; GREEN614PASS2RedisNOT_EXECUTED; novechildren/59checks reais com IPCunref, callback antes de fechamento, inflightOTLP e diagnósticos redigidos/CLI1. Sem deadline total numérico/build/provider/durabilidade presumida.
- Lead T24 altera somente rejection-audit.ts/newtest/ops.http.test.ts: escopo pedido autorizado preservado; missing/foreign usa primeiro scope confiável sem consultar recurso proibido. Appendfailure gera contador/diagnóstico fixo; métricas/logger quebrados não alteram rejeição pública. Principal scopes[] não recebe autoridade inventada: diagnostic AUDIT_SCOPE_UNAVAILABLE, sem row audit; permanece limite explícito. RootRED8FAIL3PASS após corrigir três spies de logger imutável; firstRED5behavioral+3harnessFAIL retido. Current626PASS/0FAIL/2RedisNOT_EXECUTED/68files CLI0; strict/lint/format0. Source snapshot começou DURING a execução, não declarar fullPRE. FreshI1 APIworker85 Peirce ativo; artefatos antigos imutáveis.
- FreshwebR27 REVISE P2 geometria,352regressões+19functionalPASS mas3candidategeometryFAIL; blindness inicial compromissada por narrativa dos controles, não aceitar como I1 cego. Lead R33 CSSEXATAMENTE height/padding/width do input e novo teste canonicalSINGLE/MULTIPLE 1440/768/390: RED6FAIL, GREEN6PASS; full358PASS0skip/13files e reproductiongeometry5PASS(2controles+3candidates). Strict/lint0;43fontes congeladas/freshI1 Erdos ativo. PNGmobile inspecionado como cropfieldset, sem alegar viewport/fullassembledruntime ou certificação Tab.
- RedisR29 prova oito local/freshscope14controls anteriormente conferida permanece válida para candidato04:43; R30/T24 alteraram inputs e exigem prova integrada renovada. R34 prepara somente defaultmatrix7, sem selector/mock/nativePG executado; trace/source/build/deps devem congelar antes de checkpoint. Jornada paused/blocked e perda de conclusão após reforço ainda pendentes; scout mostrou estados idênticos com/sem conclusão anterior e ausência de inventário imutável de obrigações, não fabricar completedboolean/receipt/backfill.
- Secrets scan11patternsCLI1 preservado e necessita renovação após novas cópias; contexto sintético não equivale a scannerclean. REM06/HCONTENT/sameUID/remote/AAA001 específicos mantidos, sem bloqueio geral ou commit/push/deploy/publicação/clínica/G07/globalaccept.
- last_completed_action: handoffs/manifests e regressões atuais conferidos; next_action: reviewsfrontend43/APIworker85, frozencheckpoint/defaultRLS7, jornada/Redis integrado/coverage/secrets/current44gates.
- evidence: .agent/artifacts/remediation-20261003/lead-r30-implementation-verification.json; r32-current/handoff.json; lead-r33-diagnostic-choice-handoff.json; lead-r14-historical-handoff-current-verification.json; lead-r35-api-worker-fresh-review-map.json.


## 2026-10-04T05:47:31Z — R33 review REVISE visual; R36 corrigido, R34 preparado

- status IN_PROGRESS. Lead308artifacts/43sources conferiu freshR33:385PASS6FAIL/391, P2 participanteSINGLE/MULTIPLE deformado nas três larguras. Filtro do critic deixou narrativa após head/status e comprometeu cegueira; tetoconditional, não I1 aceito. Histórico intacto, critic encerrado.
- R36 modifica somente CSS com novas regras específicas de seleções do participante e NEWparticipant-choice.browser.test.tsx; inverseCSS equivale exatamente ao baselineR33. RED6layoutFAIL; firstGREEN6FAIL por expectativa incorreta focus-visible após clique; teste usa agora Tab/ShiftTab reais, GREEN6. Full364PASS0FAIL0SKIP/14filesCLI0,44PREPOSTCURRENT iguais; copiedpaint14PASS/147unselected, dozePNG atuais da página inteira com CSS real e dois controles conhecidos. Captura mobileSINGLE inspecionada; bitmap281 para CSS390 devido escala Vitest, não alegar1:1. Lint/webstrict/format/diff0. Handoffc5bfde128c3c75451279d0acc011ad3b1fafa0a9d02edbc064f8d5adbbf221d8/2213refs; freshreview limpa pendente.
- R34 somente prep:24manifestrefs conferidos,23purePASS/8helperssyntax/lint0, cache cincofiles+134libraryentries e13raízes/3312oldRLSentries preservados. Nenhum PG/build/service/nativeversion executado, nenhum mapa final corrente selado. Lead concluirá freeze e prepare/checkpoint para defaultproducer sete casos sem selector/dependency override. RootHEAD3cd e isolado futuro distintos, classeLOCAL_MEASURED/NOT_VERIFIED, não GHA/globalaccept.
- T24/R30 current626PASS/2RedisNOTEXEC continuam sourcefrozen para freshAPIworker85. Nenhuma nova escrita backend/config/deps/build. SecretsFAIL/jornada/inventoryproof/integratedRedis/coverage e critérios44 pendentes; REM06/HCONTENT/sameUID/remote/AAA001 específicos.
- last_completed_action: geometryrepair/regressões/hashes e prepRLS conferidos; next_action: freeze/defaultRLS7 e freshfrontend44/APIworker85, depois jornada/gates44; semcommit/push/deploy/publicação/clínica/G07/globalaccept.
- evidence: .agent/artifacts/remediation-20261003/lead-r33-fresh-review-verification.json; lead-r36-participant-choice-handoff.json; lead-r34-preparation-verification.json; lead-r36-participant-fresh-review-map.json.


## 2026-10-04T05:58:16Z — RLS pré-check RED sem PG; R35 observadores REVISE

- status IN_PROGRESS. R34 prepareCLI0 criou snapshot271b75472bd57fcbf7016b6cae4761cba95f36e0/816source/2392build/39143deps/1079tool entries; root3cd permanece distinto. Precheckpoint originalfreshness detectou19symlinks de diretórios gerados como runtimeuntracked. Nenhum checkpoint/claim/PG iniciado; prepared/13oldRLSroots e firstFAILEDprecheck intactos, não declarar checkoutclean.
- R38 novo pacote irmão copia24helpers/records anteriores; reparo somente layout de containers reais dist/node_modules com links para folhas medidas. Defaultproducer e freshnessoriginals intactos. RED1directoryshape e RED2originaldirtyguard preservados; GREEN24pure/0skip +syntax/lint0. Nova fonte real não rastreada continua rejeitada no controle. Novo prepare/validcheckpoint aindaNOT_EXECUTED até resetfreeze.
- R35fresh scopedREVISE:108artifacts/85sources Leadconferidos0drift;175canônicosPASS/independent20=14PASS6FAIL. P1HTTP completionobserver suprime403;P2workerobserver converte sucesso processado em failure;P2diagnóstico substitui erro original. Novo reparo após esta janela RLS sem promoter626PASS para aceite. Liveness unrefadapter é gap limitado: produçãoPG mantém conexão/timer e não houve prova de perda/saída prematura nela. Frozenbar baseline exposto inicialmente comprometeu I1 pristine; findings executáveis mantidos, critic encerrado.
- FrontendR36 source44/364PASS continuafrozen em freshI1 Hume com requiredcontinuity por script sanitizado. ScopeT24handler audit passou independentemente, mas não prova HTTPcompletion sob falha de observador. Redisintegrado/coverage/secrets/jornada/44gates ainda pendentes, nenhum global/G07/release/clínico/nativepublicationaccept.
- last_completed_action: handoff/reviews/failedfreshness e layoutTDD conferidos; next_action: successorR38 frozenprepare/defaultRLS7/teardown, reparo observers atual e freshreviews/gates44.
- evidence: .agent/artifacts/remediation-20261003/lead-r34-precheckpoint-review1.json; lead-r34-default-freshness-preflight-red.json; lead-r38-copy-provenance.json; r38-rls-proof-successor/contracts-green1.log; lead-r35-fresh-review-verification.json.


## 2026-10-04T06:33:24.408083+00:00 — R38 medição local suportada; R39 observadores GREEN; R40 foco em execução

- status: IN_PROGRESS; objetivo integral44. R38 successor executou uma única vez o producerdefault original:7PASS/0FAIL/0SKIP, CLI0 observado Lead; original collection/argv/migrations58 intactos e PostgreSQL18.4 appNOSUPER/NOBYPASS.27rawrefs e teardown PID/diretório ausentes/porta40425refused conferidos. Snapshot fonte825/build2392/deps39143/tools1079 igual na janela, histórico após alterações legítimas R39; não restampar candidato inteiro atual.
- Freshcritic R38 SUPPORTED_LOCAL_MEASUREMENT_WITH_LIMITS / LOCAL_MEASURED / NOT_VERIFIED:41 controles offline, sete assertions originais e27rawrefs recomputados. Grants receipt contém273 registros admin e zero registros app, sem certificar effectivegrants/owner/RLS de todas as tabelas. Fonte/kernel/helpers/raw estáveis; exposição inicial de baseline genérico declarada, sem pristineI1. Não rerodou PG/CLI original; manifesto e fontes conferidos Lead.
- R39 Lead isolou somente falhas síncronas de writers de logger/métricas; readers preservam erro real, sem retry/durabilidade inventada. API RED2 controle403PASS/3observerFAIL, GREEN13; helper RED7FAIL2PASS/GREEN9. Worker RED24FAIL8PASS, GREEN32/regressão145/nativecomdoubles20PASS. Combined atual647PASS/0FAIL/2RedisNOT_EXECUTED em69files CLI0; strict0,118fontes PREPOST iguais.222refs conjuntos Lead conferidos0mismatch. MainAPI byte-idêntico, fontes nove congeladas; freshI1 atual90fontes iniciado sem narrativas anteriores.
- R37 freshfrontend encontrou P2 foco: salvar/avançar por teclado deixa BODY ativo e próximo Tab vai para Finalizar diagnóstico em1440/768/390.59artifacts/44source já conferidos; exposição baseline qualifica I1, FAIL preservado. R40 builder somente diagnostic/page.tsx + novo diagnostic-focus.browser.test.tsx e artifacts próprios, TDD Chromium e foco heading bound ao receipt/identidade, sem foco em hidratação passiva/dirtydraft/rejeição. Nenhum GREEN antecipado.
- Jornada paused/blocked e prova imutável de obrigações permanecem pendentes; Rediscurrent integrado/coverage/scansecrets/44gates também. Secrets scan anteriorCLI1 não vira clean por classificação sintética. REM06/HCONTENT/sameUID/remote/AAA001 específicos preservados; nenhum build/install/PG adicional durante R39/R40, commit/push/deploy/publicação/clínica/G07/globalaccept.
- last_completed_action: R38 raw/review/hash/teardown e R39 combined647/strict0 conferidos; next_action: concluir R40/freshfrontend e freshAPIworker90; reparar jornada com autoridade explícita, candidato integrado/Redis/coverage/secrets/gates44.
- evidence: .agent/artifacts/remediation-20261003/lead-r38-default-live-verification.json; lead-r38-review-r39-worker-verification.json; critic-rls-r38-i1/report.md; r39-integrated-observers/verification.json; r39-worker-observers/handoff-final.json; lead-r37-fresh-review-verification.json.


## 2026-10-04T06:49:20.313556+00:00 — R40 foco GREEN e T34 correção histórica; serviços R42 somente preparados

- status IN_PROGRESS. R40 RED7PASS3FAIL no teclado1440/768/390 → GREEN10; canonical374PASS/0FAIL/0SKIP,224unit+150browser/15files. Official/sourcealias executam os mesmos374, não748. Lead139refs conferidos0mismatch;43fontes originais intactas e somente página diagnostic supersedida + teste novo. Dois fontes congeladas em freshI145. Foco heading aplicado somente após receipt válido/advance efetivo/sem nova edição; controles passive/rejection/noadvance mantidos. Página716/851/maxnamed81/150, strict/lint/format/diff/static/Ajv0; nenhum assembledruntime/G07manual/globalaccept.
- Complexidade oficial globalCLI0: budgets atuais mantidos sem ratchet/exceção adicional; avisos soft retidos. Secrets atualCLI1 em22arquivos,22matches; metadata redigida preserva valores viahash e classificação REQUIRES_CONTEXT_REVIEW, sem scannerPASS/allowlist/delete/historicalrewrite.
- T34 Lead corrigiu justificativa histórica em docs/quality/mutation-classification-v4.md preservando texto anterior. OriginalreportSHAef1d0fb2373bf31ca236a8853d59d4b94a241c9055ffd028f10e2c81a8bf337e/sourceSHA1b502dd4d6e56b2c17d75966f7eb03b287dc23f8f555d7299287e6462c1f3e92 idêntico ao blob14b97.1.216.512entradas por variante, dez mutantes:80/81/82/83/94/102 REAL,84/175/214/215 equivalentes somente na fonte histórica/domínio válido. Score100 anterior não sustentado; Survived histórico intacto, nenhum novoStryker/currentclosure. Primeirocomparador supôs34capabilities e falhou; ASTcorrigido demonstra33, execução0. Freshcritic adendo emexecução; task aindaIN_PROGRESS.
- R42 G06 preparação apenas: imagem oficial workflowQdrant1.15.5 puxadaCLI0 e digestsha256:0fb8897412abc81d1c0430a899b9a81eb8328aa634e7242d1bc804c1fe8fe863 observado. Nenhum container/PG/service/build iniciado. Builder somente ownr42-integration-proof-prep, feasibility de duas suítes originais, fontealias/roles/ownership/teardown/checkpoint; nenhuma fixture/source mutação autorizada nele. FreshAPIworker90 continua com fontes congeladas.
- last_completed_action: R40hash/canonical374 e T34 comparação/adendo/scan22/complexidade0; next_action: freshreviews frontend45/APIworker90/T34, repararjornada e preparar checkpoint G06/native, depois candidato integrado/Redis/coverage/secrets/current44gates. Nenhumcommit/push/deploy/publicação/clínica/global/release/manualG07accept.
- evidence: .agent/artifacts/remediation-20261003/lead-r40-diagnostic-focus-verification.json; r40-diagnostic-focus/handoff.json; lead-r40-complexity-current.log; lead-r39-secrets-current-metadata.json; r41-historical-mutation-review/handoff.json; r42-services-preparation/qdrant-image-inspect.json.


## 2026-10-04T07:03:10.923013+00:00 — T34 histórico concluído; R39 callback REVISE e R43 drain GREEN

- status geral IN_PROGRESS. FreshT34 PASS restrito e Lead102refs/797ocorrências conjuntas0mismatch: prova própria3.784.704entradas por variante/135.168combinações de predicados, seis labelsREAL e quatro corpos/negações equivalentes históricos. Fonte/raw/Git/doc/comparadores estáveis; initial34cap INVALIDCLI1 preservado e comparadorASTcorrigido0. TaskT34 documental concluída, sem promover score/candidato/Stryker/G03/G05; texto antigo preservado/adendo autoritativo.
- FreshR39 APIworker REVISE1P2 de contrato callback/liveness, nenhum P0/P1 estabelecido.665PASS/10RedisNOT_EXECUTED,67criticartifacts e90authority+448additionalhashes conferidos. Sourcecomments históricos qualificam I1; não usou oldcritic/builderoutputs. Callback unref termina naturalmente antes de efeito/close quando não há handles; impacto concretoPG/provider UNKNOWN, não alegar perda de job/dados.
- LeadR43 altera somente worker/lifecycle.ts + novo lifecycle-process.test.ts. RED1/2 três falhas comportamentais naturais; mínimo reference durante close e finallyrelease, sem deadline/cancellation. GREEN3 nativos + combined650PASS/0FAIL/2RedisNOT_EXECUTED/70filesCLI0.119fontes PREPOST iguais; três receiptsstdout capturam ordemefeito→resources→drained/failure,erro original/closeoriginal preservados/idempotência/admissão negada/Timeout0. Exactexported ASTdeclarations da fonte executadas emchildren, não fullworkerPG/provider. Strict/lint/format/complexidade/diff0; source2 frozen/freshcritic91 iniciado. Warning assertpromise unawaited originalHTTP test preservado, sem ampliar garantia para futura major.
- FrontendR40/fresh45 em execução e sourceheld; canonical374 histórico corrente daquela fatia. R42 artifact-only prepG06 aguarda finalfreezes/checkpoint concreto, nenhuma fixture/migration/runtime/container/PG/build executada nesta preparação; imagem workflow1.15.5 digest observado. Secrets22CLI1 permanecem contexto em revisão, sem allowlist/historydelete/gate clean.
- last_completed_action: freshT34/currenthash e nativeR43 source650/cheap0 conferidos; next_action: freshfrontend45/APIworker91, R42ready/checkpoint, repararjornada com inventárioautoridade e candidato integrado/Redis/coverage/secrets/44gates. Semcommit/push/deploy/publicação/clínica/manualG07/globalaccept.
- evidence: .agent/artifacts/remediation-20261003/lead-r39-r41-fresh-review-verification-final2.json; critic-historical-mutation-r41-i1/final-ref-manifest.json; critic-api-worker-r39-i1/report.md; r43-worker-drain/handoff.json; lead-r43-api-worker-fresh-review-map.json.

## 2026-10-04T07:33:11Z — Fresh REVISE conferidos; R45/R46/R47 e G06 preparado

- status: IN_PROGRESS; todas44 tasks mantidas. HandoffR14 SHA0d09484/246128bytes reconferido, histórico240PASS/copied61=56PASS5FAIL intacto; fontes posteriores legitimamente supersedidas, nenhum novo aceite R14.
- FreshfrontendR40:264artefatos/45fontes conferidos0mismatch. Independente44native=40PASS4FAIL +19unitPASS; originalCSS372PASS2locatorFAIL e native-declared diagnostic20PASS separados. P1 alternativa canônica1760sem espaços oculta ações em1440/768/390; P2 422 diagnóstico sem associação/foco. Root.vite-temp inicial e broadtrace drift qualificam isolamento, incompletosaxe/AT não certificados. R45 somente diagnostic/page.tsx/CSS/newrecoverytest: RED7PASS6FAIL, GREEN13 e original374PASS separados; finalmanifest/static pending, sem autoaccept.
- FreshAPIworkerR43:140artefatos/91fontes conferidos0mismatch, closure235 estável.241original+25ownPASS;17nativechildren16exit0/1SIGTERMcontainment recolhido. DoisP2 de callback: APIclose com unref perde completion; limiterthrow deixa request sem resposta. Impacto concretoPG/Redis/provider não reproduzido. LeadR46 source4: RED5FAIL, GREEN5, atual655PASS/0FAIL/2RedisNOT_EXECUTED/72files,93PREPOSTequal/strictsourcealias/lint/format/officialcomplexity0. FirstGREEN3PASS2FAIL por próprio fixture requestId nãoUUID/oracle preauth scope corrigido; erronomecomplexityCLI1 preservado. Fonte4 congelada/fresh93 emexecução. Rootstrict originalCLI2 por OBSdist sem exportisolateObservabilityWrites; sem build durantehold e sem declarar rootPASS.
- C10freshR44:20artefatos conferidos,76inputs estáveis;110checks102PASS8FAIL. DoisP2 sintéticos de códigos/definições/primaryindex inválidos, nenhum catálogoPGreal incorreto demonstrado. Lead comparator/test apenas RED24PASS8FAIL1liveNOTEXEC ->GREEN32PASS0FAIL1liveNOTEXEC. OriginaldrillPG16.15 antes/depois do reparo CLI0,58migrations até0057/flagsRLS/grants/marker verdadeiros; Unixsocket privado/PIDdir ausentes observados. Durações parciais2677ms/novo raw não são RPO/RTO nem alltable restore. R47selected76PREPOSTcurrent e fresh critic emexecução; dependency/library wholecandidate PRE não medido no runner, limite explícito.
- R42prep final1030unique selectedrefs0mismatch,12purePASS/syntaxlintformat0. Runtime permaneceCLOSED/NOT_EXECUTED; três deltas mínimos de fixture worker foram identificados (fence real/UUID órfão/RETIRADO anteswithdraw). Sem rootfixturewrite/PG/container/build na prep, snapshot/checkpoint só após freezes finais. Imagem workflow1.15.5 cache observada não prova serviço.
- last_completed_action: três reviews/hashes e source/native fixes delimitados conferidos; next_action: selar R45/freshfrontend, concluir fresh93/C10, coordfixturesG06 e scopedOBSbuild apóshold, jornada/inventário e candidato integrado/Redis/coverage/secrets/current44gates.
- evidence: .agent/artifacts/remediation-20261003/lead-r40-fresh-review-verification.json; lead-r43-fresh-review-verification.json; lead-r44-fresh-review-verification.json; r46-api-callbacks/handoff.json; r47-restore-comparator/native-launcher.log; lead-r42-final-prep-verification.json.
- Semcommit/push/deploy/publicação/AT/clínica/globalaccept. Secrets22CLI1 permanece revisão de contexto; REM06/HCONTENT/sameUID/remote/AAA001 específicos, nenhum bloqueio geral.

## 2026-10-04T08:08:24.506316+00:00 — R14 histórico recebido; fresh frontend REVISE, API local verificado e restore R49

- status: IN_PROGRESS; todas44tasks mantidas. R14 handoff246128bytes/SHA0d09484 reconferido; 737ocorrências/622pares,726matches/11fontes posteriormente supersedidas,0mismatch durável. Raws79browser+161unit=240PASS e copied31unit+25browser/5FAIL=61cases preservados; não625fontes atuais nem aceite R14 atual.
- FreshfrontendR45:74artefatos/46fontes PREPOSTCURRENT conferidos. P1 erro422 sem mensagem/blank libera snapshot ambíguo; P2 alternativa QUESTAO canônica1990sem espaços recortada1440/768/390. Originais228unitPASS e162browserPASS1FAIL; isolatedF03PASS não fecha regressão completa. I1 qualificado por relatório temporário escrito na raiz/recolhido sem mutation de fonte. R50 builder recebeu somente helperdiagnostic/test/CSS/recoverytest/newparticipantcontenttest; fontes históricas preservadas.
- FreshAPIworkerR46:75artefatos/93fontes conferidos0mismatch;246original+8own=254PASS,10nativechildren concluídos/12attempts e recursos0. Sourcecallback slice verificado localmente; provider/RLS/buildcurrent/globalrelease não aceitos. Holds encerrados antes de scopedOBSbuild autorizadoCLI0;16fontes/configs inalterados e pnpm typecheck:test oficial atualCLI0. APIs/workers/web compiledoutputs restantes stale.
- C10freshR47:23artefatos conferidos,146PASS2FAIL em148checks; P2 default vazio e P3runbook histórico. R49 mínimo helper/test/runbook: RED33PASS2FAIL1liveNOTEXEC →GREEN35PASS0FAIL1liveNOTEXEC. Drill originalPG16.15CLI0,0053→0057 todas4pendentes/flags true,76PREPOSTCURRENT;2610ms parcial nãoRPO/RTO. PID3169354/dataDir ausentes reconferidos. Novo criticI1 C10 independente emexecução,76HOLD. WholeinstalleddepsPRE não medido nesse wrapper.
- G06 original R42 REDCLI1/1PASS1FAIL em PG18.4+Qdrant1.15.5 verdadeiro: workerfixture sem fence; QdrantadapterPASS. Fullinventories source4063/outputs3186/deps47633/tools1034/helpers17/preserved974 PREPOSTCURRENT iguais e teardown4CLOSED/zerochildren/dirsports ausentes; raw histórico não green. Lead fixture reconciliou fence nativo com guard/UUID órfão/RETIRADO anteswithdraw, assertions/prod unchanged. R48 protocolo sucessor12PASS/strictlintfmt0, checkpoint/runtimeCLOSED até R50sourcefreeze e todoswriterssettled.
- last_completed_action: R14raw/hashrecepção e três freshreviews/scopedOBSbuild/rootstrict/C10nativecurrent conferidos; next_action: R50RED/GREEN/fullregression/freshreview, C10fresh76, G06 successor concreto apósholds, jornada/inventário e candidato integrado/Redis/coverage/secrets/44gates.
- evidence: .agent/artifacts/remediation-20261003/lead-r14-handoff-receipt-20261004.json; lead-r45-fresh-review-verification.json; lead-r46-fresh-review-verification.json; lead-r47-fresh-review-verification.json; r49-restore-comparator/handoff.json; r49-restore-comparator/root-strict-final1.log; lead-r42-original-red-verification.json.
- Semcommit/push/deploy/publicação/clínica/manualAT/G07/globalaccept. Secrets22FAIL/contexto pendente, jornada sem inventário autoritativo e integratedgates abertos; REM06/HCONTENT/sameUID/remote/AAA001 específicos, nenhum bloqueio geral.

## 2026-10-04T08:34:43.849276+00:00 — R50/R51/R52 congelados; C10 verificado e G06 sucessor pronto

- status: IN_PROGRESS, todas44tasks. R50source49/artifacts283/425PASS conferidos;387nomes anteriores presentes e38novos, focused85 não somado. RED61/24 e initial49/36 preservados; F03fullcurrentPASS não resolve causa histórica. Fonte5 frozen/freshcritic, sourcealias/CSS/Chromium, sem native/G07/globalaccept.
- R51F01 pausa/bloqueio precedem path/globalaction com orientação neutra e scope disponível preferido; resumelegítimo preservado, evidências digitais semmutação. RED46/4 e contrato52/2→GREEN54, expansãofocal63. Extrai helper, buildScopePath119/150 warning80. Sharedpage3labels/dashboardenum+refine via supersessionhashes, sem assertionsoriginais alteradas.
- Related730 inicial727/3 expôs legacyserverclock oracle/7dayfixture e recoveryapp guard antigo. R52 app recovery só troca cap pelo D09112hconstant antestransação; RED39/1 demonstra43201internalerror→GREEN40validation_error/no newtransaction; tokenTTL1800 intacto. Submitproducer intocado; tests provam replayoriginalstate/date/eventonce e changedattemptconflict. Currentrelated730/0/0, allpackages/APIworker sourcealiasstrict/lint/format/diff/officialcomplexity0, warnings/oldFAILs preservados. Source12 frozen/freshcritic. F02 immutablefullmandatoryinventory/history permanece pendente, nenhum receipt fabricado.
- C10freshR49 refs21/source76/41ownPASS+35original2liveNOTEXEC conferidos. CONDITIONAL PASS técnico; suppliedPG16CLI0/2610ms parcial/teardown inspectedafterseal, não criticPGpróprio/RPO/RTO/fullbackup/release.
- G06R48 novo protocolo12PASS/syntax16/format0; lintinitial7Nodeglobals configuraçãosemdeclaração preservado e invocaçãocorrigida declara globals reais Node22, nenhum rootconfig/rulewaiver. Próximo checkpoint singleuse/fullsource+outputs+installeddeps+tools+helpers; sourcewriters e packagehandles0, critics readonly ownnamespaces. Runtime atéagora CLOSED no sucessor. R42genuinePG18.4/Qdrant1.15.5 RED1PASS1FAIL/cleanup histórico intacto; fixturefence/UUID/RETIRADO reconciliada peloLead mantendoassertions/prodguards. Holds atéexit/summary/teardown/CURRENT; semrootwrites/build/install durante janela.
- last_completed_action: source425/730 e freshC10 verificados; next_action: abrirconsumirG06checkpoint/STOPunexpectedFAIL/cleanup, concluirfreshreviews, F02 e integrated44gates.
- evidence: .agent/artifacts/remediation-20261003/lead-r50-handoff-verification.json; r51-journey-availability/handoff.json; r52-application-contract-reconciliation/red1.results.json; lead-r49-fresh-review-verification.json; lead-r42-original-red-verification.json; r48-qdrant-fixture-proof/protocol-final.tap.
- Semcommit/push/deploy/publicação/clinical/manualAT/G07/globalaccept. Secrets22FAIL/contextreview; REM06/HCONTENT/sameUID/remote/AAA001 específicos, sem bloqueio geral.

## 2026-10-04T08:49:53.823996+00:00 — G06 local sucessor medido e conferido

- status: IN_PROGRESS; todas44tasks e qualidade congelada preservadas.
- G06 R48 checkpoint a0169299-2047-43c4-8508-2c51b1ab0307 consumido uma vez: runnerCLI0/childCLI0, duas suítes originais2PASS0FAIL0SKIP em PG18.4/Qdrant1.15.5 reais. Embeddings assistivos determinísticos fake/IA não invocada; source aliases, não candidato montado nem fornecedor remoto.
- Lead independente confirmou57rawrefs,134imports/source exata, PREPOSTCURRENT e recaptura iguais:4072source/3194outputs/47633dependencies/1034tools/18helpers/974preserved. AppNOSUPER/NOBYPASS e demaisflags elevadosfalse; migratorSUPER somenteDDL, admin separadoNOSUPER/BYPASS. Cleanup4CLOSED/failures[]/children0; PG3548791 e Qdrant3550253 ausentes, diretório/contêiner exato ausentes, portas42047/32812 recusadas.
- LOCAL_MEASURED_PENDING_FRESH_REVIEW/NOT_VERIFIED, não aceite global/clínico/G07/release. R42 originalRED1PASS1FAIL intacto. R48 lintinitial7Nodeglobals e tentativaCLIglobal ineficaz preservados; imports qualificados node:url/node:timers/globalThis corrigiram somentehelpers antescheckpoint; lint-final3/format-final2/protocol-final2 12PASS atuais0, semrootconfig/rulewaiver.
- R14 handoff246128bytes/SHA0d09484daeb6b11bdee24524b780f0db96cd865d00577356cf2c5e5d179ff559 reconferido;240canônicos e copied61=56PASS5FAIL históricos, nenhuma reclassificação para fonte atual. R50/R51 freshreviews mantêm49/44fontes congeladas; capacidade do critic journey inicialmente indisponível, retry enviado, nenhum verdict inventado.
- last_completed_action: G06 execução/teardown/fullmaps/raws conferidos peloLead; next_action: concluir freshreviews frontend/journey e G06; implementar inventário imutável obrigatório/histórico F02 com produtor nativo, depois gates integrados44/Redis/coverage/secrets. F02 e secrets22FAIL permanecem abertos.
- evidence: .agent/artifacts/remediation-20261003/lead-r48-local-verification.json; r48-qdrant-fixture-proof/runs/a0169299-2047-43c4-8508-2c51b1ab0307-596d437a-e53e-49a4-b51e-9b571cc65192/summary.json; lead-r14-handoff-receipt-20261004.json.
- Root runtime-window HOLD encerrado após verificação independente; holds específicos49/44 continuam. Sembuild/install/rootcommit/push/deploy/publicação; REM06/HCONTENT/sameUID/remote/AAA001 específicos, sem bloqueio geral.

## 2026-10-04T09:17:46.003047+00:00 — R54/R55 reparos selados; F02 em implementação separada

- status: IN_PROGRESS, todas44tasks; critérios/pisos/ratchets congelados.
- FreshfrontendR50:156artefatos/49PREPOSTCURRENT conferidos. P1 CASO canônico19990 semespaços expande texto/textarea;425originaisPASS nãoanula15PASS5FAIL independente. InitialdeadlineharnessFAIL corrigido em5focaisPASS, trêsasserts17.6pixel sembarreira AT demonstrada continuamrawFAIL; não20PASS. Fonte/paint/I1 limitações preservadas.
- R54 mínimoCSS/test2: REDcanonical27PASS6FAIL (19990/20000tokens x3widths) →GREEN33 →canonical440PASS0skip/17files=425anteriores+15novos, semsomarfocal.350digests/fontes2/other47current verificadas. QuatroCSSdecl inversas reproduzembaseline; schemas/texto/controles/overflowglobal nãoalterados. Source49 congelada para novo criticI1 Rawls emnamespacepróprio. CapturaVitest PNG281px difereviewport390: geometria/nativeactivation separadas, não certificação1:1 de toda pintura; novo critic deve capturarnativeactual.
- FreshjourneyR51: manifestrefs/source44 conferidos;354originaisPASS, refined32PASS1FAIL/33; recomenda runtime remediação mesmoM02 pathBLOQUEADO_PRE_REQUISITO/targetausente. ProceduralI1 LIMITED/INVALID para aceitefullyreadonly: node_modules/.vite-temp foraowned e sequência producerread/incidentaltestsnippets; nenhum aceite. Capacity erro transient não bloqueia, criticsettled/fechado.
- LeadR55 exatojourneyguard +NEWtest: REDválido4FAIL4PASS →focal8PASS →related738PASS0skip/CLI0;app/API/domainreal sourceHTTP/canonicals+trustedread-port doubles, nãoPG. Guardunstartedprereq integrado à disponibilidade antes seleção, startedlegítimo e predecessor same-scope positivos preservados. InitialRED6FAIL inclui2ownfixtureerrors corrigidos antesprod, initialstrict somentefixturetipos corrigidos; históricos intactos. Strict/lint/format/diff/officialcomplexity0, source2sealed/handoff pendingfullyisolatedfreshreview. Reverseproductiondelta equals oldR51hash.
- G06R48 continuaobservação histórica genuína2PASS0skip/CLI0/teardown/fullmaps igualnomomento. R55 alterou importcarregadojourney e R54CSS/fullsource; prova não écurrentcandidate/integratedG06. Repetir checkpoint novo no candidato final, não reutilizarUUID consumido nemrescreverraw2PASS/57refs.
- F02 contrato decisãoartifacts-only r53-module-completion/decision.md: inventário obrigatório completo aprovado/imutável independente de formisolada, bindingoriginal e receipttransacional, nãobooleano/status/empty.every/backfill. BuilderKant exclusivoNEWpersistence validator/test2 eownnamespace; schema/publisher/binding/nativewriter/reader/consumer futurosLeadcoordenação. SemnativeF02/clinicalpublicationclaim.
- last_completed_action: freshREVISEs conferidos e R54/R55TDD/regressões/hashseals; next_action: freshfrontend49, integrarF02 produtor/inventário/receipt/reader/consumer comnativeproof e criticfullyisolated, depoiscurrent44gates/build/Redis/G06/coverage/secrets. Secrets22FAIL contexto aindaaberto; RPO/RTO/AT/G07/remote/HCONTENT/REM06 específicos.
- evidence: .agent/artifacts/remediation-20261003/lead-r50-fresh-review-verification.json; lead-r51-fresh-review-verification.json; lead-r54-handoff-verification.json; lead-r54-painted-inspection.json; r55-journey-prerequisite/handoff.json; r53-module-completion/decision.md.
- Semrootcommit/push/deploy/publicação/manualG07/globalaccept; callbacks/natives anteriores sóno candidato/slice original, builtoutputs restantesSTALE. TodosLeadR55handles0, ownerR54handles0; source49 critic e R53validator separados.

## 2026-10-04T10:03:25.788240+00:00 — FreshR54 REVISE e F02 captura/finalização seladas

- status: IN_PROGRESS; todas44tasks ebarra/pisos/ratchets preservados; runtime-controller explícito, controles Lead-only.
- FreshR54I1:342refs/source49PREPOSTCURRENT verificados antes transferwrites. Originais440PASS, mas31probesdistintos24PASS7FAIL (33assertsbrutos24PASS9FAIL/2ownharness). P1 títulos300/bodydiagnóstico10000 cortados1440/768/390, PNG nativo390 inspecionado peloLead; P2 dashboardguard aceita extra source rejeitado canônico, não prova vazamento backendlegítimo. Closures fora49 first-load, smokesummaryreutilizado/semrawcompleto setup, fullPNGblank qualificado por viewports reais, axe incompletes/manualAT não aceitos. Zeroownservers/browsers reportados. Source49hold liberado apenaspacketR58 apóscriticseal; Aristotle exclusivoCSS/guard/testes+ownnamespace, sembuild/install/native/desc.
- R53M1 Kant:95PASS0skip e2sources48ef4819.../c5fec5e2... congeladas; handoff38f72e... refs conferidas0mismatch. Valida capture integral/blueprint/manifest/provenance, não origem nativa nemterminal/nota/receipt. R56schema/migration5files emhandoff/nativeNOT_EXECUTED; quatro tabelas privadasappend-only/RLSFORCE/FKsversões+auditmicroseconds; journal59/0058 invalida atualidade dasprovas nativas0057 nesseescopo, semrewrite histórico/backfill/clinicalpublication.
- R57 Lead source3sealed: REDdenyall3FAIL52PASS→GREEN55→63; REDauditduplicado1FAIL63PASS→final64. Seis suítes sourcealiases573PASS0FAIL0SKIP (64novos incluídos; focais não somados). Strict/lint/format/importgraphfinal0; static-final2 reteve2ciclos TYPE introduzidosduranteR56, owner eliminou schema→validator semwaiver. CLI0 observado ali nãoéPASS: rawFAIL prevalece; checkerfocal agora sai apósflush. Fontefinalização305ish abaixo800/maxfn68 abaixo150, fixturehelpers109/91 soft80warnings preservadas; apoio test-support jáclassificado, nenhuma exclusão nova. Handoff95ae1d0d.../26refs verificados0mismatch.
- D102 literal distingueATIVIDADES_FINALIZADAS deCONCLUIDO: aprovação somativa aplicável éobrigatória. R57aceitaatividade corrigidaREFORCO semfabricar aprovação/nota/domínio. RN022/023/D103 composição30/70, geral70/críticos80 precisa producer/policy/prova antesreceipt; resultadoescalaresingle nãoassumido comoprova detodoscomponentescríticos.
- F02writer/producer/originalbinding/consumer/gradepolicy ePG/races/rollback/RLS/history pendentes; semnative/build/install/globalcov/freshacceptance/clínica/G07/release. R55related738 pendingfullyisolatedfresh; G06R48local2 eC10technical antigas seleções permanecemhistóricas, candidateoutputsSTALE após0058/R58. Secrets22FAIL contextual e44gates integrados pendentes, decisões humanas/remotas específicas não bloqueiam núcleo autorizado.
- last_completed_action: freshR54 verificado e sealsM1/R57; next_action: R58TDD/fresh, native0058 eF02producer/policy/transação/consumer, depoiscurrent44gates.
- evidence: .agent/artifacts/remediation-20261003/lead-r54-fresh-review-verification.json; r53-module-completion/builder/handoff.json; r56-module-storage/builder/handoff.md; r57-module-finalization/handoff.json.

## 2026-10-04T10:06:03.830626+00:00 — Correção de métrica R57

- A estimativa informal `305ish` da entrada imediatamente anterior não é evidência de gate. O raw strict-static-final-3 registra exatamente301linhas no scanner/300linhas físicas para module-obligation-finalization.ts; maior função de produção68linhas, abaixo150. Apoios sintéticos109/91 mantêm os avisossoft80.
- Resultado final permanece64novos/573relacionados0FAIL0SKIP; nenhum hash de fonte/handoff/raw mudou. Documentation/traceability/audit-consistency Lead atuais CLI0. F02nativo/D102somativa/integração eR58 permanecemIN_PROGRESS.

## 2026-10-04T10:45:00.000Z — R59 gates oficiais reparados e seam D-102 criado

- status: IN_PROGRESS; objetivo integral 44 tasks mantido. Nenhum aceite de rodada anterior, nenhuma prova nativa, nenhuma publicação clínica.
- **F02 — autoridade de conclusão e preservação do histórico** permanece `IN_PROGRESS`. Avanço desta rodada: o seam puro `packages/persistence/src/module-obligation-grade-policy.ts` decide a aprovação somativa aplicável conforme D-102/RN-022/RN-023/D-103 (composição 30/70, geral 70, críticos 80), com RED e GREEN 16/16 e 98,46% statements / 96,34% branches / 100% functions. Continua pendente e **não** implementado: produtor nativo do inventário obrigatório completo, binding original da atribuição, writer transacional de conclusão com receipt no mesmo commit, reader privado, consumer histórico e prova PostgreSQL da migration 0058 (races, rollback, RLS, papéis, teardown). O seam ainda não está ligado a use case, handler ou endpoint.
- **R59-01 a R59-09** corrigidos: `pnpm typecheck` (ciclo application→api→persistence por teste em `packages/application/src`, realocado para `apps/api/src/http-boundary/`), `pnpm lint` (332238 erros por `.agent/**` não ignorado), `pnpm build`/`next build` (10 erros de resolução porque o web importava a fonte de outro pacote; agora usa `@cvg/contracts` declarado e registrado em `architecture-boundaries.json`), `verify:secrets` (19 snapshots de evidência e 3 literais sintéticos; isenções literais revisadas e impressas, com controle negativo ainda falhando), `test:unit` (regressão pré-existente do double de `attempt-repository.db.test.ts` frente a `.for()`/`.orderBy()` e identidades não-UUID), `test:integration` (matriz de autorização regenerada pelo comando oficial e `lastIndex` fixado no journal real 58/0058), `test:browser` (três corridas de amostragem: `scroll-behavior: smooth` anima o scroll de foco e dois testes amostravam o DOM antes do commit do controle; `settleScrolling` e polls determinísticos, sete execuções consecutivas verdes), `verify:evidence-consistency` (skip apenas no caminho sem run id de candidato; controle negativo continua falhando) e `format:check` (cinco fontes formatadas e dumps de geometria de browser ignorados).
- **R59-10** removidos 60 artefatos compilados não rastreados dentro de `apps/api/src` (0 órfãos, 0 rastreados), que eram inputs do tsc e podiam sombrear módulos atuais.
- **`verify:release-evidence`** é o único gate oficial ainda em FAIL e a causa é exclusivamente as migrations 0055–0058 não commitadas (`git ls-files` vê 55 SQL contra journal de 59). Requer commit autorizado; não é defeito de código.
- last_completed_action: nove defeitos de gate corrigidos com evidência e seam D-102 criado com TDD; next_action: produtor nativo, binding original, writer transacional, reader, consumer e prova 0058.
- evidence: .agent/artifacts/remediation-20261003/r59-gate-repair/verification.json.
- Sem commit/push/deploy/publicação/clínica/G07/global accept; mutação do candidato, Redis/RLS nativos, RPO/RTO, AT manual e REM-06/H-CONTENT/same-UID/remote/AAA-001 seguem NOT_PROVEN ou específicos.

## 2026-10-04T17:19:55Z — R60 writer/reader F02 e pnpm verify completo

- status: IN_PROGRESS; todas44tasks; critérios/pisos/ratchets congelados.
- **F02 — autoridade de conclusão e preservação do histórico** permanece `IN_PROGRESS`. Avanço desta rodada: writer transacional `packages/persistence/src/module-obligation-completion.ts` (`recordModuleCompletion`, validação pré-transação, negações dentro da transação, receipt no mesmo commit, resultado congelado de12chaves) e reader privado `packages/persistence/src/module-obligation-receipt-reader.ts` (`readModuleCompletionReceipts`, uma única consulta, fatos congelados de6chaves, `PersistenceMappingError` em entrada inválida), com o reader ligado a `journey-repository.ts` nos dois retornos. Continua pendente e **não** implementado: produtor nativo do inventário obrigatório completo, consumer histórico, integração do writer em use case/handler/endpoint e prova PostgreSQL da migration 0058 (races, rollback, RLS, papéis, teardown).
- Gates: `pnpm verify` exit0 com os23 gates encadeados em11m21s e `pnpm test` exit0 com301arquivos/3886testes PASS e0FAIL. typecheck saiu de45erros para0; lint, format, complexity (após extrair `readJourneyActivityRows` para caber no ratchet de180 linhas), cycles, dead-code, architecture, secrets e traceability PASS. Cobertura91,20% statements /87,22% branches /95,00% functions /92,30% lines contra90/85/90/90.
- RN-032 corrigida nas fronteiras HTTP: `curriculum.http.test.ts` e `journey-prerequisite.http.test.ts` provavam conclusão pelo status da atribuição e viram `REVISAR_RETENCAO`/`CONSULTAR_PROXIMO_PASSO`; as fixtures agora publicam `completionReceipts` coerentes com a versão da atribuição, sem afrouxar asserção de produção e sem expor receipt na projeção pública.
- **`verify:release-evidence`** deixou de ser o único gate em FAIL: as migrations 0055–0058 foram staged (`git add`, sem commit) e o self-test passa com59SQL contra journal de59. Continua exigindo o commit autorizado para não repousar sobre o índice git.
- last_completed_action: writer/reader/integração/correções de gate com `pnpm verify` exit0; next_action: produtor nativo do inventário obrigatório completo, consumer histórico, integração do writer em use case/handler/endpoint e prova PostgreSQL da 0058.
- evidence: .agent/artifacts/remediation-20261003/r60-f02-writer-reader/verification.json.
- Sem commit/push/deploy/publicação/clínica/G07/global accept; mutação do candidato, Redis/RLS nativos, RPO/RTO, AT manual e REM-06/H-CONTENT/same-UID/remote/AAA-001 seguem NOT_PROVEN ou específicos.

## 2026-10-05T03:43:26Z — R61 encadeamento F02 e R62 autoridade condicional + e2e 45/45

- status: IN_PROGRESS; todas44tasks; critérios/pisos/ratchets congelados.
- **F02 — autoridade de conclusão e preservação do histórico** avançou de `IN_PROGRESS` para encadeada ponta a ponta, com autoridade condicional. R61 ligou os quatro pontos de costura (publicação na criação da atribuição, binding no INICIAR, receipt na transação da correção humana, leitura consumida pela jornada) — relatório `r61-f02-wiring/report.md`, alvos 47/47. R62 implementou a decisão **Autoridade condicional** aprovada pelo usuário: receipt é a única prova quando o inventário está vinculado à atribuição; vínculo sem receipt nega; sem vínculo o fallback pré-receipt decide e é registrado como débito condicional (`journey-module-authority.ts` + `readBoundAssignmentIds` + ligação em `journey-repository`/`journey-use-cases`; alvos 22/22 com RED em sessão).
- **Débitos explícitos desta rodada (P1–P3):** (P1) nenhum produtor nativo de linhas de blueprint/form nem do audit `CURRICULUM_MODULE_OBLIGATIONS_APPROVED` — Step A fail-closed por design e a feature de autoria/aprovação de manifesto exige PRD/SPEC antes de ser construída; (P2) `apps/api/src/main.ts:157` monta as dependências de correção sem `summativeApproval`, portanto nenhum receipt é gravado no caminho produtivo; (P3) não existe `SummativeGradePolicy` aprovada composta no caminho produtivo (o seam de R59 não é instanciado). Enquanto P1 não avançar, o fallback pré-receipt mantém a jornada destravada; com o primeiro binding real o fallback desaparece.
- **e2e reparado: 10 falhas → 45/45 exit 0.** Causa-raiz: fixtures defasadas vs contratos atuais (specs/fixture-server inalterados desde 2026-09-09) — 7 respostas sem `savedAt`, 4 testes sem `GET /api/v1/attempts/:attemptId`, `day` fora de 30/60/90 (×2), `outcome` fora de APROVADO/REFORCO, `nextActionTarget` incompatível com `REVISAR_RETENCAO`, justificativa de revisão obrigatória do T32 não preenchida. Somente specs tocados; zero linhas `await expect` alteradas. Corridas de browser (3) resolvidas com polls: 290/290.
- **Gates:** `pnpm verify` exit 0 (23 gates); unit 2841 pass/2 skip; suíte principal do coverage 3907 pass/212 skip; browser 290/290; e2e 45/45. Cobertura91,03% statements /86,92% branches /95,05% functions /92,36% lines contra90/85/90/90.
- **Próximos do backlog:** (1) prova PostgreSQL da migration 0058 via `r59-module-storage-native` (checkpoint RED58 → runner → GREEN59); (2) commit completo do worktree já autorizado + `verify:release-evidence` pós-commit; (3) P1/P2/P3 acima; (4) consumer histórico de receipts, integração do writer em use case/handler/endpoint; (5) mutação do candidato, Redis/RLS nativos, RPO/RTO, AT manual, fresh critic.
- last_completed_action: cadeia F02 R61, autoridade condicional R62, e2e 45/45, browser 290/290, `pnpm verify` exit0; next_action: prova 0058, commit autorizado, depois P1–P3 e pendências live.
- evidence: .agent/artifacts/remediation-20261003/r61-f02-wiring/report.md; r62-conditional-authority/report.md; r62-conditional-authority/green/verify-full.log.
- Sem push/deploy/publicação/clínica/G07/global accept; commit completo autorizado e pendente de execução; REM-06/H-CONTENT/same-UID/remote/AAA-001 seguem decisões humanas específicas.

## 2026-10-05T04:52:00Z — R62: re-selo M1 e prova nativa da 0058 concluídos

- status: IN_PROGRESS; todas44tasks; critérios/pisos/ratchets congelados.
- **Prova PostgreSQL da migration 0058** — `DONE`. Preparação 50787 caminhos/drift 0/selos 7+58 mismatch 0; `R59-RED58-20261005-001` EXPECTED_RED (42P01 em `curriculum_module_blueprint_versions`, teardown limpo); `R59-GREEN59-20261005-001` MEASURED_GREEN 86/86 exit 0 com 59 migrações, papéis/RLS/append-only/rollback nativos. Escopo `PROPOSED_NATIVE_STORAGE_ONLY`; `acceptance NOT_PERFORMED`, `D102 NOT_PROVEN` permanecem.
- **Re-selo M1 adjudicado** — `DONE` com aprovação explícita do usuário ("Re-selar com registro"): `module-obligation-validation.ts` havia sido estendido pela R60 (+3007 bytes, `ApprovedModuleObligationCaptureInput`/`assertApprovedModuleObligationCapture`) sem atualizar o selo R53/R56; manifesto re-selado `55a9cb2f…`→`bd1cae4e…` com `resealHistory`, pin de `inventory.mjs` atualizado e registro em `lead-r62-reseal-validation.json`; registros históricos preservados. Deriva semelhante futura volta a travar `prepare.mjs`.
- **Commit completo do worktree** — autorizado ("Commit completo do worktree"); pendente de execução nesta entrada; `verify:release-evidence` depende dele para sair do índice git para o commit real.
- last_completed_action: re-selo M1 + prova nativa RED58→GREEN59 (86/86); next_action: commit autorizado e `verify:release-evidence` pós-commit, depois P1–P3 (produtor de inventário/audit, `summativeApproval` em main.ts, política somativa composta), consumer histórico, integração live, mutação, fresh critic.
- evidence: .agent/artifacts/remediation-20261003/lead-r62-reseal-validation.json; r62-conditional-authority/report.md §6; r59-module-storage-native/runs/R59-RED58-20261005-001-488b1525-*/summary.json; r59-module-storage-native/runs/R59-GREEN59-20261005-001-d6a3f271-*/summary.json.
- Sem push/deploy/publicação/clínica/G07/global accept; REM-06/H-CONTENT/same-UID/remote/AAA-001 seguem decisões humanas específicas.
