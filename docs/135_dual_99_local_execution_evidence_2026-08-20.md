# Evidência local de execução Dual99 — 2026-08-20

- programa: `CVG-DUAL-99`
- corte: `2026-08-20T13:51:48-03:00`
- última atualização: `2026-08-20T13:51:48-03:00`
- disposição: `IN_PROGRESS` / `PILOT_BLOCKED`
- commit publicado: `8440f09` em
  `origin/agent/publish-production-hardening`
- fonte de avaliação: `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`
- manifesto: `dual-99-program.json`
- limitação: esta evidência é de worktree local e não promove nota, release,
  piloto, decisão clínica ou reauditoria independente.

## Plano materializado

- programa executivo: `BRIEFING/03.BUILD/0309_dual_99_executive_program.md`
- roadmap: `BRIEFING/04.AUDIT/0518_dual_99_roadmap.md`
- backlog: `BRIEFING/04.AUDIT/0519_dual_99_backlog.md`
- gate estrutural: `pnpm verify:dual99-program`
- registry: `docs/canonical-document-registry.json`

## Implementações locais desta rodada

- scanner de segredos: enumeração de worktree/index/history, tags anotadas,
  referências `secret://`, expressões de código e placeholders sintéticos
  delimitados foram cobertos por testes adversariais; o scanner continua
  fail-closed e ainda acusa `infra/production/.env.local` sem imprimir valores.
- qualidade: dashboard, jornada, runner HA, fixture real sintético, authoring,
  política somativa e parser de interação foram decompostos com caracterização
  TDD; o ratchet passou em `144` funções longas / `113` linhas máximas, sem
  hotspot não classificado; conflito de fontes passou a cobrir normalização de
  domínio, persistência e aprovador ausente.
- mutation crítica: `scripts/verify-critical-mutation.mjs` executa baseline e
  sete mutações reais em diretório temporário; `7/7` foram mortas, score `100%`
  com mínimo `90%`; evidência em `docs/137_dual_99_critical_mutation_evidence_2026-08-20.md`.
- governança: manifesto executável Dual99 valida `16+16`, `C1–C8`,
  `RH01–RH06`, `145` requisitos, `9` gates e `46` tasks do backlog.
- worker: o inventário de skips foi atualizado de `20` para `21` testes e o
  teste PostgreSQL cobre claim→lease→ack→cleanup real, ACK stale após reclaim,
  retry e DLQ; o ambiente local sem banco live mantém os três testes guardados.
- identidade clínica corrente: `CLINICAL_APPROVER_ID` foi removido do runtime,
  API, Compose HA, `.env.example` e verificador de topologia; os fluxos de
  source-conflict, recalculation, correction e content withdrawal derivam o
  principal autenticado, revalidam a conta persistida como `ACTIVE` +
  `CLINICAL_APPROVER` + escopo e, quando aplicável, executam leitura e write no
  mesmo transaction executor com contexto de escopo.
- integridade de idempotência: B99-105 adicionou validação 16–128 no boundary
  HTTP/persistência, lock advisory namespaced, TTL/cleanup pelo
  `CURRENT_TIMESTAMP`, constraints e response hash SHA-256; a migration 0032
  rejeita legado, força RLS, revoga `PUBLIC` e permite cleanup somente pelo
  contexto de participante/escopo.
- revisão final: o default server-clock ausente no schema Drizzle de
  `authoringWorkflowIdempotency.expiresAt` foi corrigido para refletir a
  migration 0032; um probe somente leitura confirmou que o PostgreSQL HA ativo
  ainda está em migration count `30`, usa `cvg_admin` com
  `SUPERUSER/BYPASSRLS` e não tem RLS de authoring aplicado, portanto não é o
  RC desta rodada.
- diagnóstico/convite: B99-106 alinhou o catálogo de
  `/health/dependencies` a `VIEW_INTERNAL_AUDIT`/`INTERNAL`/`audit`, passou o
  convite para `/invite#token=...`, restringiu leitura ao fragmento e limpou
  tokens do fragmento e de query legada.
- observabilidade runtime: B99-203 adicionou verificador read-only da API
  Prometheus, fixture `promtool` e comandos operacionais; o source versionado
  contém 14 rules, e a execução local confirmou rules saudáveis, targets A/B,
  Alertmanager conectado e watchdog firing sem alterar o HA.
- B99-204: logs e spans passaram a compartilhar IDs técnicos sanitizados, o
  worker emite spans correlacionáveis por evento, OTLP não carrega payload,
  Tempo local tem retenção explícita de 14 dias e os verificadores live
  confirmaram persistência de trace sintético e o ciclo interno sintético
  fire→ack→resolve do Alertmanager.
- B99-205: o probe de readiness passou a capturar o relógio de claim depois do
  insert PostgreSQL; a reconciliação PostgreSQL→Qdrant foi exercitada com
  conteúdo sintético não vazio, reparando divergência e órfão, replay e
  retirada sem expor payload.
- B99-307: o gate de migrations passou a rejeitar operações destrutivas,
  colunas obrigatórias sem default e `SET NOT NULL` sem guarda de backfill;
  a checagem entrou no `pnpm verify`, sem remover o bloqueio fail-closed para
  dados legados incompatíveis.

## Round 17 — B99-106 / diagnostics, authorization and invitation URL — 2026-08-20T10:53:52-03:00

### RED → GREEN

- RED reproduziu o catálogo canônico declarando `/health/dependencies` como
  público embora o handler exigisse capability interna ou credencial de scrape;
  também reproduziu convite administrativo com token em query;
- GREEN alinhou o catálogo a `VIEW_INTERNAL_AUDIT`/`INTERNAL`/`audit`, passou
  links para `/invite#token=...`, restringiu a leitura ao fragmento e sanitizou
  tokens do fragmento e de query legada no `replaceState`;
- os testes existentes do handler preservaram negativos 401/403/503 e o foco
  de contrato/modelo/estado/view/health passou `22/22`;
- Playwright sintético Chromium passou `3/3` na porta isolada `3213`, incluindo
  link em fragmento, ativação e remoção do token da URL.

### VERIFICAÇÃO TRANSVERSAL

- `pnpm test:coverage`: `202` arquivos, `1.060` testes, `17` arquivos e `21`
  testes guardados; `95,05%` statements, `91,06%` branches, `95,31%`
  functions e `95,75%` lines;
- typecheck, lint, formato, diff-check, migrations `33/33`, decisões críticas
  `7/7`, mutation dirigida `7/7`, documentation, traceability, Dual99,
  risk-matrix, skip-governance, architecture e public-boundary passaram;
- o teste de hotspots recebeu timeout explícito de `30s` para o scan AST sob
  instrumentação; nenhum critério de classificação foi relaxado.

### LIMITES

O E2E usou mocks sintéticos e a API em `3101` estava indisponível, logo não é
prova de HA/API/DB ativo. O runtime PostgreSQL observado continua stale em
relação ao worktree; `verify:secrets` permanece fail-closed somente nos quatro
valores redigidos do `infra/production/.env.local` ignorado. Não houve dado
real, alteração live, score, release ou promoção clínica; gates externos,
clínicos, RC e reauditoria independente continuam abertos.

### PUBLICAÇÃO

Código, testes e evidência desta rodada foram publicados no commit
`4e4cd4e04718ca26c0cd1979152225301fbd249a` em
`origin/agent/publish-production-hardening`. O diretório `.gauntlet/` continua
local e não versionado.

## Round 18 — B99-107 / rate limit, headers and CORS boundary — 2026-08-20T11:21:39-03:00

### RED → GREEN

- RED confirmou que `/health/dependencies` permanecia fora do rate limit,
  que a API direta não devolvia os headers de defesa já exigidos na borda e que
  `allowedOrigins` podia ser alterado pelo chamador depois da construção do
  servidor;
- GREEN limitou somente liveness/readiness como health probes não metrados,
  manteve diagnóstico interno com `429`/`Retry-After`, aplicou os headers
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, COOP, CORP e CSP às respostas da API e congelou uma
  cópia da política de origens. Não foi introduzido CORS permissivo: mutações
  com cookie continuam deny-by-default para origem não autorizada;
- os testes novos cobrem headers, abuso repetido e mutação da configuração;
  foco API passou `24/24`, regressão API `12/118` e E2E sintético Chromium
  passou `3/3` na porta isolada `3214`.

### VERIFICAÇÃO TRANSVERSAL

- `pnpm test:coverage`: `202` arquivos, `1.062` testes, `17` arquivos e `21`
  testes guardados; `95,05%` statements, `91,06%` branches, `95,31%`
  functions e `95,75%` lines;
- typecheck, lint, formato, build `12/12`, `pnpm audit --audit-level=high`,
  edge security estático (`7` diretivas), migrations `33/33`, decisões `7/7`,
  mutation `7/7`, documentation, traceability, Dual99, risk matrix,
  skip-governance `20/20`, architecture, hotspots, public-boundary e
  `git diff --check` passaram;
- Playwright administrativo sintético Chromium `3/3` passou em `3214`.
- publicação: implementação e testes desta rodada estão no commit
  `6e4dc60def99a83143a70f06e95ab2db33fff123` enviado para
  `origin/agent/publish-production-hardening`.

### LIMITES / STATUS

O secret scan fail-closed acusa apenas os quatro valores redigidos de
`infra/production/.env.local`, que não foi lido nem alterado. A rodada não
executou live HA/API/DB, migration 0032, role restrita, RC, score, release,
promoção clínica ou reauditoria independente. B99-107 está pronto localmente,
mas permanece `READY_FOR_NEXT_STEP`; o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 19 — B99-201 / outbox lease fencing and bounded cleanup — 2026-08-20T11:59:51-03:00

### RED → GREEN

- RED reproduziu ACK contado como processado mesmo quando a lease fence
  recusava a mutação, a assinatura de `markProcessed` não carregava a tentativa
  reclamada e não existia cleanup bounded no adapter SQL;
- GREEN passou tentativa + lease vigente no `UPDATE` de ACK/retry, retornou
  booleano de linhas afetadas, fez o worker usar o relógio atual no ACK/falha e
  adicionou cleanup terminal por lote com `FOR UPDATE SKIP LOCKED`; cleanup não
  toca eventos `PENDING`/`PROCESSING` ou leases ativas;
- a prova de integração PostgreSQL agora inclui cleanup real e rejeição de ACK
  de uma lease antiga depois do reclaim; poison/retry/DLQ existentes foram
  preservados e os focos passaram `2/19`.

### VERIFICAÇÃO TRANSVERSAL

- foco worker/persistência passou `38` arquivos / `246` testes; o teste
  PostgreSQL real ficou com `3` testes guardados por ausência de
  `CVG_RUN_LIVE_DB_TESTS` + `CVG_TEST_DATABASE_URL` autorizados;
- `pnpm test:coverage` passou `202` arquivos / `1.067` testes / `17` arquivos
  e `21` testes guardados, com `95,03%` statements, `90,99%` branches, `95,32%`
  functions e `95,71%` lines;
- typecheck, lint, formato, `git diff --check`, build `12/12`, decisões `7/7`,
  mutation dirigida `7/7`, migrations `33/33`, audit de dependências, edge
  security, documentação, traceability, Dual99, risk matrix, skips `20/20`,
  architecture, hotspots, public-boundary e Playwright sintético Chromium
  `3/3` em `3215` passaram.

### LIMITES / PUBLICAÇÃO / STATUS

`pnpm verify:secrets` falha fechado somente nos quatro valores redigidos de
`infra/production/.env.local`, que não foi lido nem alterado. A prova
PostgreSQL live, permissões/SQL fault, HA/API/DB ativo, RC, score, release,
promoção clínica e reauditoria independente permanecem sem evidência. O código
foi publicado no commit `388db21d262eb10bbaebcaae25559997c04556ca` em
`origin/agent/publish-production-hardening`; B99-201 está
`READY_FOR_NEXT_STEP` localmente e o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 20 — B99-202 / readiness recovery after dependency loss — 2026-08-20T12:09:09-03:00

### CARACTERIZAÇÃO TDD

- foi adicionada uma caracterização de recuperação que força a segunda
  verificação de dependência a falhar e confirma que nenhum batch é processado
  durante a janela fechada;
- após o ciclo de espera, o worker precisa executar novamente dependency health
  e claim→ACK antes de processar, preservando heartbeat, estado fail-closed e
  fechamento durante a indisponibilidade;
- a topologia declarativa mantém `worker-a` e `worker-b` com healthcheck de
  `/health/ready`, e `pnpm ops:verify-ha` confirmou as duas réplicas.

### VERIFICAÇÃO TRANSVERSAL

- `pnpm test:worker` passou `50/50`; health/main/active-HA focais passaram
  `28/28`;
- `pnpm test:coverage` passou `202` arquivos / `1.068` testes / `17` arquivos
  e `21` testes guardados, com `95,03%` statements, `90,99%` branches, `95,32%`
  functions e `95,71%` lines;
- build `12/12`, typecheck, lint, formato, `git diff --check`, topologia HA,
  documentation, traceability, Dual99, risk, skips, architecture, hotspots,
  public-boundary, edge security, dependency audit e gates críticos da rodada
  anterior permaneceram verdes.

### LIMITES / PUBLICAÇÃO / STATUS

Esta é evidência local/sintética de recuperação; não executa probes consecutivos
nos dois workers contra runtime HA/API/DB ativo. `verify:secrets` continua
fail-closed somente nos quatro valores redigidos de
`infra/production/.env.local`. O teste foi publicado em
`8f40c41ca090e26fe1ccb7e87e409c1cde8cd7b7`; B99-202 está
`READY_FOR_NEXT_STEP` localmente e o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 21 — B99-203 / Prometheus rules, targets and loss-of-signal — 2026-08-20T12:25:25-03:00

### RED → GREEN

- RED confirmou que a cobertura anterior validava somente o texto de
  `prometheus.yml`/`prometheus-alerts.yml`, sem verificar `/api/v1/rules`, a
  saúde dos targets, o destino Alertmanager ou o watchdog;
- GREEN adicionou `scripts/verify-prometheus-runtime.mjs`, com execução opt-in
  e somente leitura, e `scripts/verify-prometheus-rules.mjs`, com `promtool`
  pinado em `prom/prometheus:v2.55.1`;
- `infra/observability/prometheus-alerts.test.yml` prova semanticamente API e
  worker down, API e worker absent e Alertmanager desconectado sem parar,
  recarregar ou injetar falha no HA ativo.

### VERIFICAÇÃO TRANSVERSAL

- `pnpm ops:verify-prometheus-rules`: sintaxe `SUCCESS: 14 rules found` e
  semântica `SUCCESS` nos cinco cenários;
- `CVG_VERIFY_PROMETHEUS_RUNTIME=true CVG_PROMETHEUS_RUNTIME_URL=<runtime>
  pnpm ops:verify-prometheus-runtime`: `14/14` rules `health=ok`, `cvg-api`
  `2/2`, `cvg-worker` `2/2`, `alertmanager` `1/1`, um Alertmanager ativo,
  watchdog `firing` e `errors=[]`;
- os hashes dos dois arquivos montados no Prometheus coincidiram com os hashes
  do worktree; o foco de integração passou `4/4`, coverage passou `203/1072/21`
  com `95,03%` statements, `90,99%` branches, `95,32%` functions e `95,71%`
  lines;
- build `12/12`, typecheck, lint, formato, contrato CI, governança de
  observabilidade, topologia HA e gates documentais/estruturais da rodada
  passaram.

### LIMITES / PUBLICAÇÃO / STATUS

O snapshot live é saudável, portanto down/absent permanecem inativos nele; o
firing foi comprovado no teste semântico. Notify→ack→resolve externo, dead-man
externo, PostgreSQL live, RC/proveniência, secret manager, clínica, `0/145` e
reauditoria independente continuam sem evidência autorizada. B99-203 está
`READY_FOR_NEXT_STEP` localmente; o programa permanece `IN_PROGRESS /
PILOT_BLOCKED`. Código e testes foram publicados no commit `e913d23` em
`origin/agent/publish-production-hardening`.

## Checkpoint corrente — 2026-08-20T12:25:25-03:00

| Evidência | Resultado |
|---|---|
| cobertura oficial | `203` arquivos aprovados / `17` guardados; `1.072` testes aprovados / `21` guardados; `95,03%` statements, `90,99%` branches, `95,32%` functions, `95,71%` lines |
| gates técnicos | format, lint, typecheck, decisões críticas `7/7`, dependency audit, CI contract, Prometheus semantic rules e diff-check verdes |
| hotspots | `PASS_WITH_DEBT_RATCHET`, `113` funções >50 linhas, maior `76`, zero hotspot não classificado |
| scanner | focal `17/17`; execução integral falha somente nas quatro atribuições redigidas de `infra/production/.env.local` |
| mutation crítica | `7/7 killed`, `0` sobreviventes, score `100%` / mínimo `90%` |
| build/E2E | build `12/12`; E2E administrativo/convite sintético em porta alternativa `3215`, Chromium `3/3` |
| observabilidade runtime | `14/14` rules `health=ok`; API `2/2`, worker `2/2`, Alertmanager `1/1`, destino ativo e watchdog `firing`; hashes dos arquivos montados coincidentes |
| loss-of-signal | `promtool` `SUCCESS` em API/worker down, API/worker absent e Alertmanager desconectado; sem fault injection no HA ativo |
| governança Dual99 | `PASS_WITH_GAPS`, `eligibleForIndependentReaudit=false`, `PILOT_BLOCKED`; traceabilidade `0/145` cadeias, `145` evidências locais; skips `20/20` runs, `0` flaky, `17` arquivos guardados |

## Round 16 — B99-105 / schema contract and runtime boundary — 2026-08-20T10:32:23-03:00

- a revisão final corrigiu o default `CURRENT_TIMESTAMP + interval '24 hours'`
  no schema Drizzle de authoring, alinhando o contrato TypeScript à migration
  `0032`;
- `pnpm test:coverage` fresco passou `202` arquivos / `1.060` testes / `17`
  arquivos e `21` testes guardados, com `95,06%` statements, `91,06%`
  branches, `95,31%` functions e `95,76%` lines; typecheck, lint, formato,
  migrations `33/33` e diff-check passaram;
- após a correção do diff final, o comando foi repetido no worktree exato e
  retornou os mesmos números;
- o probe read-only no PostgreSQL HA ativo retornou migration count `30`,
  `cvg_admin` com `SUPERUSER/BYPASSRLS` e authoring idempotency sem RLS; isto
  confirma runtime stale, não prova live do RC B99-105;
- não houve alteração de migration aplicada, dados, role, container, score,
  release, commit ou push. Permanecem pendentes role restrita, migration sobre
  legado, same-key, TTL/RLS live e gates externos.

As refatorações alteraram apenas a decomposição, mantendo contratos, decisões
críticas e projeções imutáveis. O E2E permanece sintético: os avisos de proxy
para `127.0.0.1:3101` não constituem evidência de API/DB/HA real.

## Verificações reproduzidas

| Comando | Resultado |
|---|---|
| `pnpm test:coverage` (checkpoint anterior) | `197` arquivos passantes, `974` testes passantes, `17` arquivos/`21` testes guardados; `90,42%` statements, `85,38%` branches, `93,65%` functions, `91,78%` lines |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | PASS |
| `pnpm verify:critical-decisions` | PASS, `7/7` decisões críticas em `100%` de branches |
| `pnpm verify:dual99-program` | PASS_WITH_GAPS estrutural; `eligibleForIndependentReaudit=false` |
| `pnpm verify:documentation` | PASS |
| `pnpm verify:traceability` / `pnpm verify:premium-traceability` | PASS estrutural / `PASS_WITH_GAPS`, `0/145` cadeias completas |
| `pnpm verify:skip-governance` | PASS, `17` arquivos/`21` testes guardados, `20/20` runs observadas, `0` flaky |
| `pnpm verify` | FAIL fechado em `verify:secrets`; todas as etapas anteriores do encadeamento passaram, e o scanner acusa somente `infra/production/.env.local` |
| `pnpm verify:hotspots` | PASS_WITH_DEBT_RATCHET, limite atual preservado |
| `CVG_API_INTERNAL_URL=http://127.0.0.1:3182 pnpm build` | PASS, `12/12` workspaces |
| `CVG_E2E_WEB_PORT=3112 CVG_E2E_BROWSERS=chromium CVG_API_INTERNAL_URL=http://127.0.0.1:3182 pnpm test:e2e` | PASS, build `12/12` e `27/27` Chromium sintéticos |
| `pnpm test:e2e:active-ha` | FAIL controlado: fixture isolado iniciou e foi removido; runtime web não alcançou prontidão em `127.0.0.1:3100` |

## Round 12 — B99-101 / RHS expression hardening — 2026-08-20T08:35:37-03:00

- RED reproduziu literais hardcoded não detectados depois de fallback, chamada,
  concatenação e array em uma atribuição sensível; a mesma rodada identificou
  falsos positivos em comparações, campos adjacentes e concatenações sintéticas
  de blobs históricos;
- GREEN passou `17/17` no scanner focal, cobrindo os quatro formatos adversariais
  e a tolerância estreita de combinações sintéticas delimitadas em fixtures;
- `pnpm verify:secrets` agora falha somente nas quatro atribuições redigidas de
  `infra/production/.env.local`; o scanner não encontrou achados adicionais no
  worktree, index ou histórico alcançável;
- `pnpm test:coverage` passou `200` arquivos / `1.049` testes / `17` arquivos e
  `21` testes guardados, com cobertura `95,06%` / `91,06%` / `95,35%` /
  `95,77%` (statements / branches / functions / lines);
- decisões críticas `7/7`, mutation direcionada `7/7`, documentação, Dual99,
  rastreabilidade, skips `20/20`, hotspots, lint, typecheck e diff-check
  passaram. A resolução do `.env.local` continua dependente de secret manager,
  rotação e autorização; nenhum score ou release foi promovido.

## Round 13 — B99-103 / session revocation atomicity — 2026-08-20T08:55:50-03:00

- RED reproduziu que `revokeAll` não tinha uma transação observável envolvendo
  o avanço de `accounts.session_generation` e a revogação das linhas de
  `sessions`;
- GREEN colocou as duas atualizações no mesmo `db.transaction`, mantendo
  predicados de generation, SQL parametrizado, contagem retornada e validação
  fail-closed; o focal de persistência passou `8/8`;
- `pnpm test:coverage` teve um primeiro timeout de `5s` no teste existente de
  hotspots sob instrumentação; o foco isolado passou `3/3` e a repetição
  integral passou `200` arquivos / `1.050` testes / `21` guardados, com floors
  `95,06%` statements / `91,06%` branches / `95,35%` functions / `95,77%`
  lines;
- lint, typecheck, formato, audit, documentação, Dual99, rastreabilidade,
  skips `20/20`, decisões críticas `7/7`, mutation dirigida `7/7`, hotspots e
  diff-check passaram. `verify:secrets` permanece fail-closed somente nos
  quatro valores redigidos de `infra/production/.env.local`;
- limite: a concorrência PostgreSQL, generation, TTL, logout e replay seguem
  sem execução por falta de ambiente live autorizado; B99-103 continua
  `IN_PROGRESS` e o release `PILOT_BLOCKED`.

## Round 15 — B99-105 / idempotency integrity — 2026-08-20T10:19:27-03:00

- RED reproduziu a chave HTTP abaixo do piso, a ausência da migration 0032,
  adapters com `Date.now()`/sem lock same-key e cleanup incompatível com as
  policies RLS existentes;
- GREEN centralizou `assertIdempotencyKey` e
  `pg_advisory_xact_lock`, moveu leitura/TTL/cleanup para o relógio PostgreSQL,
  retirou `expiresAt` calculado da aplicação e adicionou conflito concorrente
  explícito na correção;
- `0032_idempotency_integrity_closure.sql` fecha constraints de operação,
  chave, fingerprint e expiry; torna `response_hash` não nulo/SHA-256; falha
  explicitamente diante de legado; força RLS, revoga `PUBLIC` e cria delete
  policies com contexto de participante/escopo;
- focais passaram `112/112`; coverage passou `202/1060/21` com floors
  `95,06/91,06/95,31/95,76`; migrations `33/33`, build `12/12`, audit,
  decisões `7/7`, mutation `7/7`, traceability, documentation, skips `20/20`,
  architecture, hotspots e diff-check passaram;
- limite: PostgreSQL live, aplicação da migration sobre legado, role restrita,
  concorrência same-key e RLS cleanup permanecem sem prova autorizada. O
  resultado segue local, sem score/release/commit/push adicional.

## Round 14 — B99-104 / current clinical identity — 2026-08-20T09:35:11-03:00

- RED reproduziu que a identidade clínica ainda era fornecida por configuração
  estática e que alguns fluxos não revalidavam o papel/estado/escopo persistidos
  no mesmo limite transacional antes da mutação;
- GREEN removeu `CLINICAL_APPROVER_ID` do schema de ambiente, composição do API,
  Compose HA, exemplo de ambiente e verificador de topologia. Handlers passam o
  principal autenticado, e application/persistence revalidam a conta corrente
  com lock, `ACTIVE`, papel `CLINICAL_APPROVER` e escopo;
- source-conflict e assessment recalculation passaram a compartilhar o executor
  transacional com contexto de escopo aplicado antes da leitura do aprovador e do
  write; correction e content withdrawal também falham fechado em suspensão,
  remoção de papel ou divergência de escopo;
- os focais de aplicação/persistência/API passaram `13` arquivos / `171`
  testes. A repetição integral passou `200` arquivos / `1.053` testes / `17`
  arquivos e `21` testes guardados, com floors `95,06%` statements /
  `91,07%` branches / `95,31%` functions / `95,75%` lines;
- build `12/12`, lint, typecheck, formato, audit, documentação, Dual99,
  traceability, skip governance `20/20`, decisões `7/7`, mutation `7/7`,
  hotspots e diff-check passaram. `verify:secrets` permanece fail-closed apenas
  nos quatro valores de `infra/production/.env.local`;
- limite: rotação/concurrency PostgreSQL live, RC/proveniência, revisão clínica,
  CI/release, reauditoria e gates externos continuam sem prova autorizada. B99-104
  permanece `IN_PROGRESS` e o release `PILOT_BLOCKED`.

## Round 22 — B99-204 / correlation, redaction, retention and alert lifecycle — 2026-08-20T12:50:47-03:00

### RED → GREEN

- RED reproduziu que o logger não carregava `traceId`, que o payload OTLP não
  carregava `requestId`/`correlationId` técnicos e que o Tempo local dependia do
  default de retenção em vez de uma configuração versionada;
- GREEN adicionou validação de trace/correlation IDs, derivação determinística
  de trace ID técnico por correlation ID, logs e spans API correlacionáveis e
  spans técnicos por evento no worker, sempre sem payload e com allowlist;
- `infra/observability/tempo.yaml` agora fixa
  `backend_worker.compaction.block_retention: 336h`; a imagem pinada passou
  `-config.verify`, e `pnpm verify` passou a executar o gate estático de traces;
- `scripts/verify-alertmanager-lifecycle.mjs` usa somente alerta/silence
  sintéticos, valida firing → acknowledgement → resolve e limpa o probe.

### VERIFICAÇÃO TRANSVERSAL

- focos de observabilidade, API, worker, governança e Alertmanager passaram
  localmente; o foco direto inicial passou `34/34` e a repetição transversal
  final passou `51/51`;
- `pnpm ops:verify-durable-traces` passou em modo estático e live: collector
  aceitou trace sintético e Tempo o devolveu pelo trace ID, sem restart;
- `CVG_VERIFY_ALERTMANAGER_LIFECYCLE=true ... pnpm ops:verify-alertmanager-lifecycle`
  passou com `firing`, `acknowledged` e `resolved` observados; consulta final
  não encontrou o alerta sintético ativo;
- `pnpm test:coverage` passou `204` arquivos, `1.077` testes e `21` testes
  guardados, com `95,00%` statements, `90,87%` branches, `95,29%`
  functions e `95,69%` lines; build com `CVG_API_INTERNAL_URL` passou
  `12/12` workspaces, e typecheck, lint, formato, hotspots, documentação,
  traceability, Dual99, mutation dirigida `7/7` e demais gates locais passaram;
- `traceId`/correlation IDs aparecem apenas como identificadores técnicos, e
  os testes confirmam que resposta clínica, payload e identificadores de
  participante não chegam ao log/OTLP.

### LIMITES / STATUS / NEXT

A retenção local declarada é Prometheus `15d` e Tempo `336h`; o container HA
ativo ainda monta a configuração/SHA anterior e não foi reiniciado. O ciclo de
acknowledgement validado é interno ao Alertmanager; notificação externa,
on-call, RBAC, retenção/acesso do fornecedor, dead-man externo, PostgreSQL live,
RC, secret manager, clínica, `0/145` e reauditoria continuam sem evidência
autorizada. B99-204 está `READY_FOR_NEXT_STEP` localmente; o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

### PUBLICAÇÃO

O código e os testes B99-204 foram commitados como
`12f93266a3d8a1f5fd4e4a5a38d55b6e01e8a7ac` (`feat: verify observability
correlation lifecycle`) e enviados para
`origin/agent/publish-production-hardening`. A publicação não promove a
evidência local para notificação externa, RBAC/retenção de fornecedor,
PostgreSQL live, RC, clínica, `0/145` ou reauditoria independente.

## Round 23 — B99-205 / readiness clock and Qdrant reconciliation — 2026-08-20T13:30:56-03:00

### RED → GREEN

- RED adicionou uma reprodução de insert atrasado: antes da correção, o
  resultado era `claimed=0`, `processed=0`, `acknowledged=false`; a execução
  operacional descartável expôs o mesmo efeito como `qdrant reconciliation
  failed` no readiness probe;
- GREEN preservou `occurredAt` antes do insert e passou a capturar `claimNow`
  depois do `insertProbe`, sem alterar payload, autorização ou estado
  educacional;
- a migração descartável PostgreSQL `33` + integração worker/Qdrant passou
  `2` arquivos e `4/4` testes: claim/lease/ack/cleanup PostgreSQL e
  divergência/orphan, replay e withdrawal no Qdrant com dados sintéticos não
  vazios;
- `pnpm reconcile:qdrant` passou duas vezes: primeira execução
  `expected=1/upserted=1/removed=0`; segunda
  `expected=1/upserted=0/removed=0`; a saída ficou limitada a contadores
  técnicos e não incluiu texto, payload ou dado de participante.

### VERIFICAÇÃO TRANSVERSAL

- foco unitário worker/reconcile passou `14/14`; cobertura passou `204`
  arquivos, `1.078` testes e `21` guardados, com floors `95,00%` statements,
  `90,87%` branches, `95,29%` functions e `95,69%` lines;
- integração descartável corrigida passou PostgreSQL worker + Qdrant live em
  `2` arquivos e `4/4` testes; build passou `12/12`, com lint, typecheck,
  formato, migrations `33/33`, decisões `7/7`, mutation crítica `7/7`,
  hotspots e diff-check verdes;
- `pnpm verify` percorreu os gates até `verify:secrets` e parou somente nos
  quatro valores redigidos de `infra/production/.env.local`; uma tentativa
  anterior de harness omitiu `DATABASE_URL` durante a migration e foi
  descartada, com a repetição explícita passando `4/4`.

### LIMITES / STATUS / NEXT

Os containers PostgreSQL/Qdrant foram temporários, usaram apenas fixtures
sintéticas e foram removidos. Isto não prova HA ativo, PostgreSQL restrito,
RLS/TTL/concurrency live, retenção/RBAC/notificação externa, secret manager,
RC/proveniência, clínica, `0/145` ou reauditoria independente. B99-205 está
`READY_FOR_NEXT_STEP` localmente; o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

### PUBLICAÇÃO

O código e os testes foram commitados como
`43de2a2ff575c4fd9e11153a575c8dfbbb858008` (`fix: stabilize worker readiness
probe clock`) e enviados para `origin/agent/publish-production-hardening`.
Esta evidência documental segue para publicação separada e não promove
qualquer gate externo.

## Round 24 — B99-307 / migration compatibility and isolated restore — 2026-08-20T13:51:48-03:00

### RED → GREEN

- RED adicionou casos de contract incompatível e o verificador anterior
  aceitou `TRUNCATE`, `DELETE`, `SET NOT NULL` sem pré-condição e coluna
  `NOT NULL` sem `DEFAULT`;
- GREEN passou a rejeitar essas operações, aceitar somente `SET NOT NULL`
  precedido por guarda explícita de backfill/legado e expôs o comando
  `pnpm verify:migration-safety` no pipeline oficial `pnpm verify`;
- a alteração é fail-closed: a migration `0032` mantém a rejeição explícita de
  linhas legadas inválidas, em vez de transformar chaves ou snapshots de
  replay sem decisão segura.

### VERIFICAÇÃO TRANSVERSAL

- foco de governança/safety passou `2` arquivos e `8/8` testes; a cadeia
  versionada passou `33/33` (`0000`–`0032`) e o novo gate reportou
  `checkedMigrations=33`, `destructiveMigrations=0`;
- PostgreSQL descartável aplicou as `33` migrations do zero e o restore
  isolado passou `2/2`, cobrindo marcador sintético, artefato checksummed e
  invariantes de RLS/auditoria/índices;
- cobertura global passou `204` arquivos, `1.080` testes e `21` guardados, com
  floors `95,00%` statements, `90,87%` branches, `95,29%` functions e
  `95,69%` lines; build `12/12`, contratos `84/84`, worker `51/51`, decisões
  `7/7`, mutation crítica `7/7`, hotspots, lint, typecheck, formato e
  diff-check passaram;
- `pnpm verify` percorreu o novo gate e parou somente em
  `verify:secrets`, pelos quatro valores redigidos de
  `infra/production/.env.local`, que não foi lido nem alterado.

### LIMITES / STATUS / NEXT

O restore e a aplicação das migrations foram executados em container
PostgreSQL temporário com fixtures sintéticas e limpeza automática. Ainda não
há prova de rollout misto N/N-1 no RC autorizado, migração/rollback em
produção, backup externo, secret manager, CI/registry, clínica, `0/145` ou
reauditoria independente. B99-307 está `READY_FOR_NEXT_STEP` localmente; a
próxima frente local é B99-308, e o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

### PUBLICAÇÃO

O código foi commitado como `8440f09` (`fix: harden migration compatibility
gate`) e enviado para `origin/agent/publish-production-hardening`. A publicação
não promove a prova descartável para um RC ou rollout externo.

## Gaps que permanecem abertos

- `pnpm verify:secrets` acusa quatro entradas reais de
  `infra/production/.env.local`; o arquivo não foi alterado nem seus valores
  expostos. A resolução exige secret manager/rotação/autorização de ambiente.
- a barra técnica local `95/90/95/95` foi atingida nesta medição e a janela
  local de skips/flakiness passou `20/20`; mutation crítica, browser/HA ativos,
  API/DB live e os gates de release ainda não foram comprovados.
- A mutation direcionada dos sete caminhos críticos passou `7/7`; mutation
  integral de todo o sistema e os gates de release ainda não foram comprovados.
- `0/145` cadeias completas, `763` decisões clínicas, B-07, revisão manual
  WCAG, WebKit/mobile ativo, CI/registry, IdP/TLS, backup/DR, soak/failover,
  SBOM/attestation, RC imutável, duas reauditorias e go/no-go humano não foram
  inventados nem fechados.
- o E2E acima é sintético/Chromium; o E2E contra API/DB real e a operação HA
  exigem ambiente live autorizado.

## Crítica independente

A crítica read-only compatível concluiu `REJECT` com alta confiança. Ela
confirmou que as baselines permanecem `83,24/64,20`, que `C1–C8` e `RH01–RH06`
estão `OPEN`, que a rastreabilidade está em `0/145`, que o secret scan falha
por quatro entradas redigidas do `.env.local`, que o runtime ativo usa SHA
antigo e que TLS/IdP/RC/HA/clinical/DR/UAT/reauditorias permanecem sem prova.
O resultado independente não alterou arquivos, thresholds, score ou release.

## Verificação composta final — 2026-08-20T01:06:45-03:00

`pnpm verify` percorreu formato, CI contract, fontes clínicas, inventário,
observabilidade, configuração HA, lint, typecheck, cobertura (`197/974/21`,
`90,42/85,38/93,65/91,78`), decisões críticas `7/7`, scope drift, contratos
`82/82`, worker `31/31` e migrações `32/32`. O comando parou, como deve, em
`verify:secrets` com quatro achados redigidos do `.env.local`; não houve
supressão, rotação ou alteração do arquivo.

A reconciliação final às `01:09:45-03:00` repetiu formato, lint, typecheck,
documentação, gate Dual99, decisões críticas e `git diff --check` com PASS.
