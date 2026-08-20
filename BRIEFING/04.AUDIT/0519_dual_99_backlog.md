# 0519 — Backlog Executivo Dual 99

**Programa:** `BRIEFING/03.BUILD/0309_dual_99_executive_program.md`
**Roadmap:** `BRIEFING/04.AUDIT/0518_dual_99_roadmap.md`
**Predecessor preservado:** `0517_dual_98_backlog.md`
**Estado:** `IN_PROGRESS / PILOT_BLOCKED`

## Regras do backlog

- IDs `B99-*` coordenam o overlay; IDs `U98-*` continuam como referências
  históricas/origem e não são apagados;
- toda task tem owner, boundary, dependência, teste e critério de pronto;
- RED precede GREEN; review e segurança não são feitos pelo implementador;
- `BLOCKED` registra causa, impacto, ação e dependência;
- `WAITING_HUMAN_APPROVAL` não é convertido em PASS técnico;
- nenhuma task promove nota, piloto ou publicação sozinha.

## F99-0 — verdade e planejamento

| ID | Pri | Estado | Owner | O que/onde | Teste e pronto |
|---|---|---|---|---|---|
| B99-000 | P0 | COMPLETED | Lead | congelar barra e baseline em `.gauntlet/state.md` | IDs, targets, evidência e validade presentes |
| B99-001 | P0 | COMPLETED | Lead/Runtime | publicar 0309, 0518, 0519, registry e manifesto executável | links consistentes; `verify:documentation` e `verify:dual99-program` |
| B99-002 | P0 | COMPLETED | Lead/QA | mapear 16+16+C1–C8+RH01–RH06 | matriz e manifesto com owner, baseline, alvo, gate e comando |
| B99-003 | P0 | WAITING_HUMAN_APPROVAL | Ricardo/Auditores | aprovar rubrica 99, T0, reviewers e capacidade | decisão assinada; sem nota autodeclarada |
| B99-004 | P0 | IN_PROGRESS | Lead/Runtime | reconciliar worktree, registry, estado, log e backlog | contagem/hash/next action coerentes |

## F99-1 — segurança e integridade local

| ID | Pri | Estado | Owner | Boundary | RED/GREEN e pronto |
|---|---|---|---|---|---|
| B99-101 | P0 | IN_PROGRESS | SEC/ENG | `scripts/secret-scanner.mjs` | testes adversariais de worktree/index/history; fail-closed sem falso PASS |
| B99-102 | P0 | IN_PROGRESS | SEC/ENG | `scripts/fetch-clinical-sources.mjs` e scanner | lint/format/type/secret scan; nenhum segredo ou dado real |
| B99-103 | P0 | IN_PROGRESS | SEC/ENG/DBA | sessão/senha/migrations 0031 | concorrência PostgreSQL, generation, TTL, logout e replay |
| B99-104 | P0 | IN_PROGRESS | ENG/CLINICAL | authoring/review/correction/assessment | aprovador corrente ativo/role/scope na transação; fail-closed |
| B99-105 | P0 | READY_FOR_NEXT_STEP | ENG/DBA | idempotência/0030/RLS | RED de corrida/TTL/legado; GREEN com lock/constraint/role |
| B99-106 | P1 | READY_FOR_NEXT_STEP | SEC/ENG | CSRF, authz, diagnostics, convite | negativos API, logs/URL redacted e catálogo alinhado |
| B99-107 | P1 | READY_FOR_NEXT_STEP | SEC | rate limit/headers/CORS | abuso repetido recebe 429 sem hang; config segura |

## F99-2 — worker, observabilidade e dados derivados

| ID | Pri | Estado | Owner | Boundary | Critério de pronto |
|---|---|---|---|---|---|
| B99-201 | P0 | READY_FOR_NEXT_STEP | ENG/DBA | outbox claim/lease/ack | probe SQL real, retry, poison/DLQ, cleanup e replay |
| B99-202 | P0 | READY_FOR_NEXT_STEP | SRE/ENG | worker health/readiness | heartbeat + dependency + claim→ack consecutivo A/B |
| B99-203 | P0 | READY_FOR_NEXT_STEP | SRE | Prometheus rules/targets | rules carregadas via API; down/absent/loss-of-signal firing |
| B99-204 | P1 | READY_FOR_NEXT_STEP | SRE/SEC | traces/logs/metrics | correlação, redaction, retenção e ack/resolve observados |
| B99-205 | P1 | READY_FOR_NEXT_STEP | ENG | Qdrant reconciliation | PostgreSQL→índice derivado, órfãos removidos, rebuild repetível |

## F99-3 — qualidade e medição

| ID | Pri | Estado | Owner | Boundary | Critério de pronto |
|---|---|---|---|---|---|
| B99-301 | P0 | COMPLETED | ENG | format/lint/type | `pnpm format:check`, `pnpm lint`, `pnpm typecheck` verdes |
| B99-302 | P0 | COMPLETED | ENG/QA | testes falhos atuais | cinco falhas reproduzidas em RED e corrigidas sem apagar teste |
| B99-303 | P0 | COMPLETED | QA | coverage/mutation | ≥95/95/95/90; critical mutation ≥90%; relatório retido |
| B99-304 | P0 | COMPLETED | QA | skip/flaky/evidence governance | skips classificados; 20 runs; zero skip crítico |
| B99-305 | P1 | IN_PROGRESS | ENG | hotspots/architecture | zero função >100 e ratchet sem falsificar métrica |
| B99-306 | P0 | BLOCKED | QA/Platform | Playwright ativo | Chromium/Firefox/WebKit/mobile contra API real; WebKit ambiente aprovado |
| B99-307 | P0 | READY_FOR_NEXT_STEP | ENG/DBA | migrations/compatibilidade | expand-contract, N/N-1, rollback/restore isolado |
| B99-308 | P1 | READY_FOR_NEXT_STEP | ENG | API/contracts/type safety | todas rotas schema/authz/erro/telemetria; fuzz/negative |

**Atualização B99-306 — 2026-08-20T14:56:53-03:00:** o E2E ativo foi
reexecutado contra o web proxy `3100` com fixture PostgreSQL sintética isolada
por browser. Chromium, Firefox e mobile Chromium passaram `3/3` cada; o
orquestrador passou `9/9` focais. O RED também identificou e o GREEN corrigiu
o compartilhamento de sessão/caso entre projetos, além de registrar o caso de
artefato web incoerente após rebuild. WebKit foi tentado separadamente e os
`3` casos foram bloqueados antes do launch por `libavif16` ausente no host.
O estado permanece `BLOCKED`: falta ambiente WebKit aprovado e a prova não
equivale a RC/produção.

**Atualização B99-306 — 2026-08-20T15:29:24-03:00:** o RED no container
Playwright pinado reproduziu flags Chromium-only no WebKit, cookie `Secure`
rejeitado sobre HTTP e, antes da allowlist temporária, `403` CSRF para a origem
HTTPS. O GREEN escopou launch args por browser e tornou o bypass de certificado
local opt-in por `CVG_E2E_IGNORE_HTTPS_ERRORS=true`. Com proxy TLS e origem
HTTPS autorizada somente no override descartável, WebKit passou `3/3`; a
repetição HTTP passou Chromium/Firefox/mobile `3/3` cada, total `12/12`, foco
`16/16`, coverage `204/1089/21` em `95,02/90,92/95,31/95,70`. Código
`9959e44` foi publicado. O host continua sem `libavif16` e o container não é
ambiente aprovado/RC; `pnpm verify` percorreu os gates até migration safety e
parou fail-closed nos quatro achados redigidos de `.env.local`. B99-306
permanece `BLOCKED`, sem promoção de release, score ou `PILOT_BLOCKED`.

**Atualização B99-308 — 2026-08-20T15:52:02-03:00:** o RED adicionou corpus
bounded determinístico para descritores e lookup malformados e reproduziu
`TypeError` em `validateApiSurface` e `findApiSurfaceRoute`. O GREEN fez a
validação falhar fechada, rejeitou inventário não-array e extraiu a lógica para
`packages/contracts/src/api-surface-validation.ts`, mantendo as 57 rotas e o
comportamento válido. Focais `6/6`, inventário `11/11`, contratos `86/86`,
arquitetura `2/2`, build `12/12`, cobertura `204/1091/21` em
`95,02/90,95/95,31/95,71` e hotspots `0` passaram, além de lint, typecheck,
formato e diff-check. A primeira cobertura ampla encontrou hotspot não
classificado; a extração foi aplicada e a repetição fechou o gate sem nova
dívida. B99-308 fica `READY_FOR_NEXT_STEP` localmente; o corpus não substitui
fuzz property-based, ambiente live/RC, secret manager, clínica, `0/145` ou
reauditoria. O `pnpm verify` final passou todos os gates até migration safety e
parou fail-closed nos quatro valores redigidos de `.env.local`. Código/testes
estão no commit `7c46ad3` e a documentação/evidence pack em `a4840eb`. Programa
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização B99-102 — 2026-08-20T16:21:01-03:00:** o RED criou a matriz
adversarial do downloader privado: endpoint HTTP/credentials/query/path,
bucket/prefixo com traversal, destino no repositório, redirects, timeout de
headers/body, `Content-Length`/stream acima do limite, symlink, SHA mismatch e
parcial. O GREEN adicionou validação HTTPS origin-only, SigV4 determinístico
testável, `redirect: "error"`, AbortController cobrindo fetch e pipeline,
limite configurável com padrão de 2 GiB por arquivo, streaming para temp `0600`,
hash antes de rename atômico e rejeição de symlink em destino/ancestrais. O
foco passou `20/20`, localização `5/5`, cobertura ampla `205/1111/21` em
`95,02/90,95/95,31/95,71`, build `12/12`, arquitetura `2/2`, scope drift,
migration safety, hotspots `0`, lint, typecheck, formato e diff-check. Não
houve acesso aos PDFs licenciados, segredo, produção ou CI; o verify final
permanece condicionado aos quatro valores já existentes em
`infra/production/.env.local` e ao provedor/secret manager autorizado.
B99-102 permanece `IN_PROGRESS`; o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

## Atualização de execução — 2026-08-20T16:52:54-03:00 — B99-101

- **RED/GREEN:** o RED reproduziu falso scan limpo para header `tree` sem
  tamanho numérico, corpo `commit` truncado e corpo `tree` sem delimitador. O
  GREEN passou a validar tamanho seguro, corpo completo e delimitador do
  protocolo `git cat-file --batch` para `tree`/`commit`, emitindo
  `git-object-unreadable` e interrompendo o lote inválido, sem alterar o
  comportamento válido de objetos Git, blobs ou tags;
- **evidência:** foco `18/18`, cobertura `205/1112/21` em
  `95,02/90,95/95,31/95,71`, lint, typecheck, formato, audit, hotspots `0` e
  diff-check passaram. O `pnpm verify` passou todos os gates até
  `verify:secrets`, que falhou somente nos quatro valores redigidos
  preexistentes de `infra/production/.env.local`;
- **limite/status:** código/teste no commit `16a4f82`, evidência publicada em
  `73ae862`; nenhum segredo, dado
  real, PDF, rotação, provider, CI, produção, score, release, clínica, `0/145`
  ou piloto foi tocado. B99-101 permanece `IN_PROGRESS` até secret
  manager/rotação/autorização; o programa permanece `IN_PROGRESS /
  PILOT_BLOCKED`.

## Atualização de execução — 2026-08-20T17:07:01-03:00 — B99-101 symlink

- **RED/GREEN:** o RED reproduziu falso scan limpo para `linked.env`, symlink
  que apontava para um arquivo sensível fora da raiz. O GREEN enumera symlinks
  sem segui-los, usa `lstat` e emite `unreadable-file` sem expor o alvo;
- **evidência:** foco `19/19`, cobertura `205/1113/21` em
  `95,02/90,95/95,31/95,71`, scanner em `799` linhas, `verify:hotspots` com
  `0` hotspots, lint, typecheck, formato, audit e diff-check passaram. O
  `pnpm verify` parou somente nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`;
- **limite/status:** código/teste no commit `2bf5a45`; nenhum segredo, dado
  real, PDF, rotação, provider, CI, produção, score, release, clínica, `0/145`
  ou piloto foi tocado. B99-101 permanece `IN_PROGRESS` até secret
  manager/rotação/autorização; o programa permanece `IN_PROGRESS /
  PILOT_BLOCKED`.

## F99-4 — RC e supply chain

| ID | Pri | Estado | Owner | Critério de pronto |
|---|---|---|---|---|
| B99-401 | P0 | WAITING_HUMAN_APPROVAL | Ricardo/Release | lotes revisados e commits intencionais autorizados |
| B99-402 | P0 | BLOCKED | Release/Security | clean checkout, SHA alcançável, SBOM, assinatura, attestation e manifest |
| B99-403 | P0 | BLOCKED | Release/SRE | canário API/worker, migration, health e rollback para versão distinta |
| B99-404 | P0 | BLOCKED | Audit/Release | evidence pack content-addressed e reexecutado por reviewer |

## F99-5 — fundação externa e operação

| ID | Pri | Estado | Owner | Critério de pronto |
|---|---|---|---|---|
| B99-501 | P0 | WAITING_HUMAN_APPROVAL | Platform | CI/registry/CD reais no mesmo SHA |
| B99-502 | P0 | WAITING_HUMAN_APPROVAL | Security/Platform | IdP/MFA/recovery/step-up, DNS/TLS, rotação/revogação |
| B99-503 | P0 | WAITING_HUMAN_APPROVAL | SRE/Security | telemetria externa, RBAC, retenção, on-call e alert ack |
| B99-504 | P0 | WAITING_HUMAN_APPROVAL | DBA/SRE | backup offsite/PITR, dois restores, RPO≤1h/RTO≤4h |
| B99-505 | P0 | WAITING_HUMAN_APPROVAL | SRE | multi-host, capacity, soak ≥24h e failover repetido |

## F99-6 — produto, UX e clínica

| ID | Pri | Estado | Owner | Critério de pronto |
|---|---|---|---|---|
| B99-601 | P0 | IN_PROGRESS | Product/Clinical | 24 módulos, 96 sessões, B-07 e preflight |
| B99-602 | P0 | IN_PROGRESS | Product/Eng | jornada diagnóstico→retenção, correção, recurso e autoria |
| B99-603 | P0 | WAITING_HUMAN_APPROVAL | Clinical | calibração dupla de 25 itens e threshold aprovado |
| B99-604 | P0 | WAITING_HUMAN_APPROVAL | Clinical | decisões item a item dos 763 pendentes, sem bulk/IA |
| B99-605 | P0 | WAITING_HUMAN_APPROVAL | Clinical/QA | QA independente e fila liberável zero |
| B99-606 | P0 | WAITING_HUMAN_APPROVAL | UX/A11y | UAT por papel/turno/dispositivo, WCAG manual e screen reader |
| B99-607 | P1 | WAITING_HUMAN_APPROVAL | UX/SRE | RUM e Web Vitals dentro das metas do PRD |

## F99-7 — evidência e auditoria

| ID | Pri | Estado | Owner | Critério de pronto |
|---|---|---|---|---|
| B99-701 | P0 | IN_PROGRESS | Lead/Trace | 145/145 chains completas, válidas e reproduzíveis |
| B99-702 | P0 | BLOCKED | Security/Audit | SAST/SCA/DAST/pentest sem P0/P1/P2 material |
| B99-703 | P0 | BLOCKED | SRE/DBA | soak, failover, restore e DR no RC final |
| B99-704 | P0 | BLOCKED | Audit-M/Audit-Q | duas reauditorias 16/16 ≥99 no mesmo RC |
| B99-705 | P0 | BLOCKED | Ricardo | go/no-go, risco aceito, rollback e estado final registrados |

## Atualização de execução — 2026-08-20T01:09:45-03:00

- `B99-001`, `B99-002` e `B99-301` foram concluídas localmente com os artefatos
  versionados, manifesto/gates estruturais e verificações reproduzidas em
  `docs/135_dual_99_local_execution_evidence_2026-08-20.md`.
- Os testes de conflito de fontes fecharam `7/7` com cobertura focal completa;
  a página operacional fechou `2/2`; esses resultados são evidência local de
  implementação, não reauditoria nem promoção de score.
- `B99-101`, `B99-201`, `B99-305`, `B99-306`, `B99-701` e todos os
  itens de RC, operação, clínica, auditoria e aprovação permanecem abertos ou
  bloqueados conforme a tabela; `B99-304` foi concluída no escopo local, com
  `20/20` runs e zero falhas flaky. A crítica independente foi `REJECT`.
- a verificação composta oficial `pnpm verify` percorreu os gates prévios e
  parou em `verify:secrets` pelos quatro valores redigidos do
  `infra/production/.env.local`; não há PASS global ou promoção de release.
- a reconciliação final repetiu formato, lint, typecheck, documentação, gate
  Dual99, decisões críticas e diff-check com resultado verde; o worktree ficou
  preservado e sem staging.

## Atualização de execução — 2026-08-20T02:48:08-03:00

- A onda TDD local fechou os focos `dashboard 4/4`, `journey 6/6`, `authoring
  persistence 12/12`, `assessment policy 9/9`, `activity parser 8/8`, `active
  HA runner 7/7` e `secret scanner 14/14`; o scanner focal cobre a nova exceção
  estreita para fixtures sintéticas de idempotência, sem alterar a política
  fail-closed para valores reais.
- A suíte autoritativa ficou em `199` arquivos passantes, `1038` testes
  passantes, `17` arquivos guardados e `21` testes guardados, com cobertura
  `95,01%` statements / `91,02%` branches / `95,19%` functions / `95,73%`
  lines. Contratos `84/84`, worker `46/46`, build `12/12`, E2E sintético
  Chromium `27/27`, migrações `32/32`, decisões críticas `7/7` e ratchet de
  hotspots `144/117` passaram.
- `B99-302` está `COMPLETED` no escopo local; `B99-303` está
  `READY_FOR_NEXT_STEP` para mutation; `B99-304`, `B99-305`, `B99-306` e
  `B99-701` permanecem abertos por runs, dívida, browsers/HA e rastreabilidade.
  `B99-101` continua `IN_PROGRESS` porque os quatro valores de
  `infra/production/.env.local` não foram tocados sem autoridade.
- O status global permanece `IN_PROGRESS`/`PILOT_BLOCKED`: a barra técnica
  local foi atingida, mas mutation crítica, 20 runs, WebKit/Firefox ativo,
  HA/API/DB reais, RC/proveniência, clínica, UAT, cadeia `0/145`, auditoria
  externa e go/no-go humano continuam sem evidência válida.

## Atualização de execução — 2026-08-20T03:18:35-03:00

- `B99-304` foi concluída no escopo local: 17 repetições adicionais de
  `pnpm test:coverage` passaram serialmente, sem falhas flaky, e o inventário
  agora registra `20/20` execuções, `0` falhas flaky, `17` arquivos guardados,
  `21` testes guardados e zero skips sem classificação.
- A evidência durável está em
  `docs/136_dual_99_skip-governance-20-runs-2026-08-20.md`; o verificador e o
  teste focal reportam status `PASS`. Os 17 arquivos continuam guardados por
  dependerem de PostgreSQL/Qdrant/restore live, portanto isso não é prova de
  execução desses ambientes.
- O status global continua `IN_PROGRESS`/`PILOT_BLOCKED`: mutation crítica,
  browsers/HA/API/DB ativos, RC/proveniência, clínica, UAT, `0/145`, operação
  externa e reauditoria permanecem sem evidência válida.

## Atualização de execução — 2026-08-20T03:27:03-03:00

- `B99-303` foi concluída no escopo local. O novo verificador executou baseline
  obrigatório e sete mutações reais nos caminhos `NOTA`, `PUBLICACAO`,
  `PERMISSAO`, `ESTADO`, `IDEMPOTENCIA`, `CONTRATO_ESTADO` e `MATRIZ`;
  resultado `7/7 killed`, `0` sobreviventes, score `100%` com mínimo `90%`.
- Evidência durável: `docs/137_dual_99_critical_mutation_evidence_2026-08-20.md`;
  o teste focal de governança passou `3/3`, e lint/typecheck/formato/diff-check
  permaneceram verdes.
- A prova é direcionada aos sete caminhos críticos; mutation integral de todo
  o sistema, browsers/HA/API/DB ativos, RC/proveniência, clínica, `0/145`,
  operação externa e reauditoria continuam abertas. Estado global
  `IN_PROGRESS`/`PILOT_BLOCKED`.

## Atualização de execução — 2026-08-20T03:48:50-03:00

- A reconciliação final repetiu os verificadores de documentação, programa,
  rastreabilidade, skips, mutation crítica, hotspots, formato, lint, typecheck
  e `git diff --check`; todos passaram com o resultado esperado.
- A medição corrente é cobertura `200/1041/21`, floors
  `95,01/91,02/95,19/95,73`, ratchet `144/113`, mutation direcionada `7/7`
  (`100%`), skips `20/20`/`0` flaky, build `12/12` e E2E Chromium sintético
  `27/27`. O checkpoint divergente de `docs/135` foi corrigido e o histórico
  anterior foi preservado como histórico.
- O parecer independente compatível permanece `REJECT`; uma nova tentativa
  read-only foi encerrada sem produzir evidência. B99-303 e B99-304 permanecem
  concluídas somente no escopo local; `0/145`, mutation integral, live/RC,
  clínica, operação externa, aprovação humana e reauditoria continuam abertos.
  Estado global: `IN_PROGRESS` / `PILOT_BLOCKED`.

## Atualização de execução — 2026-08-20T08:35:37-03:00

- `B99-101` recebeu RED/GREEN/REFACTOR para detectar literais hardcoded em
  fallback, concatenação, array e chamada no RHS de chaves sensíveis; a
  expressão de atribuição agora não confunde comparações/setas com assignment;
- o teste focal passou `17/17`, e a execução de worktree/index/history não
  encontrou achados além das quatro atribuições redigidas do
  `infra/production/.env.local`; o scanner continua fail-closed;
- `pnpm test:coverage` passou `200/1049/21`, com floors
  `95,06/91,06/95,35/95,77`; decisões críticas `7/7`, mutation direcionada
  `7/7`, documentação, Dual99, rastreabilidade, skips, hotspots, lint,
  typecheck e diff-check passaram;
- a parte local de código/teste está pronta para revisão, mas `B99-101` fica
  `IN_PROGRESS` até secret manager, rotação e autorização do ambiente. Nenhum
  score, release, piloto ou decisão clínica foi promovido.

## Atualização de execução — 2026-08-20T08:55:50-03:00

- `B99-103` recebeu RED/GREEN para a atomicidade de `revokeAll`: o incremento
  de `accounts.session_generation` e a revogação de `sessions` agora usam o
  mesmo transaction executor, preservando predicados, parametrização, retorno
  e validação fail-closed;
- o teste focal do repositório passou `8/8`. A primeira execução de cobertura
  excedeu o timeout fixo de `5s` do teste existente de hotspots sob
  instrumentação; o teste isolado passou `3/3` e a repetição integral passou
  `200` arquivos / `1.050` testes / `21` guardados, com floors
  `95,06/91,06/95,35/95,77`;
- lint, typecheck, formato, audit, documentação, Dual99, rastreabilidade,
  skips `20/20`, decisões críticas `7/7`, mutation dirigida `7/7`, hotspots e
  diff-check passaram. `verify:secrets` segue fail-closed pelos quatro valores
  redigidos de `infra/production/.env.local`;
- B99-103 continua `IN_PROGRESS`: concorrência PostgreSQL, generation, TTL,
  logout e replay dependem de ambiente live autorizado. O estado global segue
  `IN_PROGRESS` / `PILOT_BLOCKED`.

## Atualização de execução — 2026-08-20T09:35:11-03:00

- `B99-104` recebeu RED/GREEN/REFACTOR para remover a identidade clínica
  estática do runtime: `CLINICAL_APPROVER_ID` saiu do schema de ambiente, API,
  Compose HA, `.env.example` e verificador de topologia;
- source-conflict, assessment recalculation, correction e content withdrawal
  agora passam o principal autenticado, revalidam a conta persistida como
  `ACTIVE` + `CLINICAL_APPROVER` + escopo e falham fechado quando há suspensão,
  remoção de papel ou divergência de escopo;
- source-conflict e recalculation compartilham transaction executor com o
  contexto de escopo aplicado antes da leitura bloqueante e do write. Os focais
  passaram `13` arquivos / `171` testes; a cobertura integral passou
  `200/1053/21`, com floors `95,06/91,07/95,31/95,75`;
- build `12/12`, lint, typecheck, formato, audit, documentação, Dual99,
  rastreabilidade, skips `20/20`, decisões `7/7`, mutation `7/7`, hotspots e
  diff-check passaram. `verify:secrets` continua fail-closed apenas nos quatro
  valores redigidos de `infra/production/.env.local`;
- `B99-104` permanece `IN_PROGRESS` até concorrência/rotação PostgreSQL live,
  RC/proveniência, revisão clínica, CI/release e gates externos. O estado global
  continua `IN_PROGRESS` / `PILOT_BLOCKED`.

## Atualização de execução — 2026-08-20T10:19:27-03:00 — B99-105

- **RED:** boundary HTTP, migration governance, adapters e RLS reproduziram
  respectivamente chave abaixo do piso, ausência de `0032`, TTL por relógio da
  aplicação/sem lock same-key e cleanup sem policy `FOR DELETE`;
- **GREEN:** `idempotency-policy.ts` centraliza chave 16–128 e
  `pg_advisory_xact_lock` namespaced; authoring, attempt, answer e correction
  usam `CURRENT_TIMESTAMP`, cleanup de escrita e conflitos concorrentes
  fail-closed; a migration `0032_idempotency_integrity_closure.sql` fecha
  constraints, `response_hash NOT NULL`/SHA-256, legado, `FORCE RLS`, revoke e
  delete policies por participante/escopo;
- **evidência:** focais `112/112`, coverage `202/1060/21`, floors
  `95,06/91,06/95,31/95,76`, migrations `33/33`, build `12/12`, typecheck,
  lint, format, audit, decisions `7/7`, mutation `7/7`, traceability,
  documentation, skips `20/20`, architecture, hotspots e diff-check passaram;
- **status:** B99-105 segue `READY_FOR_NEXT_STEP` localmente com
  `IN_PROGRESS/PILOT_BLOCKED` global. PostgreSQL live/role restrita, migration
  sobre legado, concorrência same-key, TTL/RLS live, RC, score e gates
  externos continuam dependentes de ambiente/autorização. `verify:secrets`
  acusa somente os quatro valores redigidos do `.env.local` ignorado.

## Atualização de execução — 2026-08-20T10:32:23-03:00 — B99-105 revisão final

- **correção:** a revisão estática encontrou e corrigiu o default
  `CURRENT_TIMESTAMP + interval '24 hours'` ausente no schema Drizzle de
  `authoringWorkflowIdempotency.expiresAt`, alinhando schema e migration 0032;
- **verificação:** cobertura fresca `202/1060/21`, floors
  `95,06/91,06/95,31/95,76`, migration governance `33/33`, typecheck, lint,
  formato e diff-check passaram;
- após a revisão final remover um efeito colateral não relacionado no schema de
  rate limit, a cobertura foi repetida no worktree exato e manteve os mesmos
  resultados;
- **runtime:** o probe read-only encontrou o PostgreSQL HA em migration count
  `30`, usuário `cvg_admin` com `SUPERUSER/BYPASSRLS` e authoring idempotency
  sem RLS; o runtime é stale e não comprova o RC B99-105;
- **status:** segue `READY_FOR_NEXT_STEP` localmente e
  `IN_PROGRESS/PILOT_BLOCKED` globalmente; não houve alteração live, score,
  release, commit ou push. A execução autorizada em alvo restrito permanece
  necessária.

## Atualização de execução — 2026-08-20T10:53:52-03:00 — B99-106

- **RED/GREEN:** o catálogo de `/health/dependencies` falhou por declarar
  acesso público; o convite falhou por colocar token em query. A correção
  alinhou `VIEW_INTERNAL_AUDIT`/`INTERNAL`/`audit`, migrou o token para
  fragmento, restringiu a leitura ao hash e limpou query legada;
- **evidência:** foco de contrato/modelo/estado/view/health `22/22`, negativos
  401/403/503 preservados, E2E sintético Chromium `3/3` em `3213`, coverage
  `202/1060/21` com `95,05/91,06/95,31/95,75`, migrations `33/33`, decisões
  `7/7`, mutation `7/7`, typecheck/lint/format/diff-check e gates documentais
  verdes; timeout do hotspot AST explicitado em `30s` sob cobertura;
- **status:** B99-106 está `READY_FOR_NEXT_STEP` localmente. O E2E não prova
  HA/API/DB porque usa mocks e a API `3101` estava indisponível; runtime stale,
  secrets redigidos, RC, gates externos/clínicos, `0/145` e reauditoria seguem
  pendentes. Commit `4e4cd4e04718ca26c0cd1979152225301fbd249a` foi enviado para
  `origin/agent/publish-production-hardening`. Programa
  `IN_PROGRESS / PILOT_BLOCKED`.

## Atualização de execução — 2026-08-20T11:21:39-03:00 — B99-107

- **RED/GREEN:** RED reproduziu diagnóstico interno sem rate limit, ausência de
  headers de defesa na API direta e política de origens mutável após o bind;
  GREEN limitou `/health/dependencies` com `429`/`Retry-After`, manteve apenas
  liveness/readiness sem janela, aplicou headers alinhados à borda e congelou
  uma cópia da configuração de origens sem introduzir CORS permissivo;
- **evidência:** foco API `24/24`, regressão API `12/118`, Playwright sintético
  Chromium `3/3` em `3214`, coverage `202/1062/21` com
  `95,05/91,06/95,31/95,75`, build `12/12`, migrations `33/33`, decisions
  `7/7`, mutation `7/7`, documentação, traceability, Dual99, risk matrix,
  skips `20/20`, architecture, hotspots, public-boundary, edge security,
  dependency audit e diff-check verdes;
- **limite/status:** `verify:secrets` acusa somente os quatro valores redigidos
  de `infra/production/.env.local`; nenhum live HA/API/DB, RC, score, release
  ou promoção clínica foi alegado. B99-107 está `READY_FOR_NEXT_STEP` localmente
  e o programa permanece `IN_PROGRESS / PILOT_BLOCKED`. Commit publicado:
  `6e4dc60def99a83143a70f06e95ab2db33fff123` em
  `origin/agent/publish-production-hardening`.

## Atualização de execução — 2026-08-20T11:59:51-03:00 — B99-201

- **RED/GREEN:** o RED reproduziu ACK contado após recusa da lease, assinatura
  sem a tentativa reclamada e ausência de cleanup SQL bounded. O GREEN adicionou
  fencing por `attempts` + `locked_until`, booleano de linhas afetadas, relógio
  atual no ACK/falha e exclusão bounded de eventos terminais antigos com
  `FOR UPDATE SKIP LOCKED`;
- **integração:** o teste PostgreSQL agora cobre cleanup real, reclaim e rejeição
  de ACK stale, além dos fluxos existentes de retry/poison/DLQ. A execução local
  mantém `3` testes guardados por ausência de banco live autorizado;
- **evidência:** foco worker/persistência `38/246`, foco direto `2/19`, coverage
  `202/1067/21` com floors `95,03/90,99/95,32/95,71`, build `12/12`, E2E
  sintético Chromium `3/3` em `3215`, migrations `33/33`, decisões `7/7`,
  mutation `7/7`, documentação, traceability, Dual99, risk, skips `20/20`,
  architecture, hotspots, public-boundary, edge security, dependency audit,
  lint, typecheck, formato e diff-check verdes;
- **status:** B99-201 está `READY_FOR_NEXT_STEP` localmente; a prova live de
  PostgreSQL/permissão-SQL, RC, score, release, clínica, `0/145` e reauditoria
  permanecem abertas. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.
- **publicação:** código e testes em
  `388db21d262eb10bbaebcaae25559997c04556ca` foram enviados para
  `origin/agent/publish-production-hardening`.

## Atualização de execução — 2026-08-20T12:09:09-03:00 — B99-202

- **caracterização:** foi adicionada uma prova de recuperação que força uma
  falha transitória de dependência, confirma readiness fechada e impede o
  processamento até nova dependência saudável + novo claim→ACK;
- **evidência:** worker `50/50`, health/main/active-HA `28/28`, topologia
  declarativa A/B `PASS`, cobertura `202/1068/21` com floors
  `95,03/90,99/95,32/95,71`, build `12/12`, typecheck, lint, formato,
  diff-check, documentation, traceability, Dual99, risk, skips, architecture,
  hotspots, public-boundary, edge security e dependency audit verdes;
- **limite/status:** não houve execução dos dois workers contra HA/API/DB ativo;
  B99-202 está `READY_FOR_NEXT_STEP` localmente, com `IN_PROGRESS /
  PILOT_BLOCKED` global. Teste publicado em
  `8f40c41ca090e26fe1ccb7e87e409c1cde8cd7b7`.

## Atualização de execução — 2026-08-20T12:25:25-03:00 — B99-203

- **RED/GREEN:** a cobertura anterior só validava strings estáticas. Foi criado
  um verificador read-only da API Prometheus e uma fixture `promtool` com
  cenários de API/worker down, API/worker absent e Alertmanager desconectado;
- **evidência:** `promtool` passou sintaxe com `14 rules` e os cinco cenários;
  o runtime local passou `14/14` rules `health=ok`, API `2/2`, worker `2/2`,
  Alertmanager `1/1`, destino Alertmanager ativo e watchdog `firing`. Os
  arquivos de configuração montados no container coincidiram por SHA com o
  worktree. Foco `4/4`, coverage `203/1072/21`, floors
  `95,03/90,99/95,32/95,71`, build `12/12`, contrato CI, governança,
  topologia, lint, typecheck e formato passaram;
- **limite/status:** não houve fault injection, parada ou reload no HA ativo;
  portanto down/absent firing foi provado sem mutar o runtime, por testes
  semânticos, enquanto o snapshot saudável mantém esses alertas inativos.
  Notify→ack→resolve externo, dead-man externo, PostgreSQL live, RC, secrets,
  clínica, `0/145` e reauditoria continuam pendentes. B99-203 está
  `READY_FOR_NEXT_STEP` localmente; programa `IN_PROGRESS / PILOT_BLOCKED`;
- **publicação:** código e testes foram publicados no commit `e913d23`
  (`feat: verify prometheus runtime observability`) em
  `origin/agent/publish-production-hardening`. Próxima ação local: B99-204.

## Atualização de execução — 2026-08-20T12:50:47-03:00 — B99-204

- **RED/GREEN:** o RED reproduziu que logs não carregavam `traceId`, spans OTLP
  não carregavam os IDs técnicos de request/correlation e a retenção local do
  Tempo não estava explicitamente versionada; o GREEN adicionou sanitização,
  correlação determinística por ID técnico, spans API/worker, atributos OTLP
  sem payload, retenção Tempo `336h` e o verificador de ciclo Alertmanager;
- **evidência:** os focos de observabilidade, worker, API, governança e ciclo
  Alertmanager passaram; `ops:verify-durable-traces` passou configuração pinada
  e live com trace sintético no Tempo; o ciclo live sintético observou firing,
  acknowledgement por silence e resolve, sem alerta sintético ativo ao final;
  `pnpm verify` agora inclui a checagem estática de retenção do Tempo;
- **limite/status:** Prometheus local mantém retenção declarada de 15 dias e
  Tempo de 14 dias, mas o HA ativo continua no SHA/configuração anterior, sem
  reload/redeploy. O ciclo de ack é interno ao Alertmanager e não prova
  notificação externa, on-call, RBAC, retenção/acesso de fornecedor ou dead-man
  externo. PostgreSQL live, RC, secret manager, clínica, `0/145` e reauditoria
  continuam pendentes. B99-204 está `READY_FOR_NEXT_STEP` localmente; o
  programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

### Publicação — 2026-08-20T13:10:31-03:00

O código, testes e verificadores de B99-204 foram commitados como
`12f93266a3d8a1f5fd4e4a5a38d55b6e01e8a7ac` (`feat: verify observability
correlation lifecycle`) e enviados para
`origin/agent/publish-production-hardening`. A publicação não fecha os gates
externos nem altera a disposição `IN_PROGRESS / PILOT_BLOCKED`.

## Atualização de execução — 2026-08-20T13:30:56-03:00 — B99-205

- **RED/GREEN:** o probe de readiness podia capturar o relógio antes do
  `insertProbe`, enquanto PostgreSQL preenchia `available_at` com
  `DEFAULT NOW()`. O RED reproduziu `claimed=0/processed=0`; o GREEN captura
  o relógio de claim depois do insert, preservando o horário do evento antes
  dele;
- **evidência:** foco worker/reconcile `14/14`; integração descartável com
  migration `33` passou `4/4` em PostgreSQL worker + Qdrant e cobriu
  divergência, órfão, replay e retirada; `pnpm reconcile:qdrant` passou com
  `expected=1/upserted=1/removed=0` e depois
  `expected=1/upserted=0/removed=0`, sem payload; coverage `204/1078/21`,
  build `12/12`, migrations `33/33`, decisões `7/7` e mutation crítica
  `7/7` passaram;
- **limite/status:** containers foram temporários e sintéticos; HA ativo,
  PostgreSQL restrito/RLS/TTL/concurrency live, secret manager, RC, clínica,
  `0/145`, gates externos e reauditoria seguem abertos. B99-205 está
  `READY_FOR_NEXT_STEP` localmente e o programa permanece
  `IN_PROGRESS/PILOT_BLOCKED`;
- **publicação:** código e testes em
  `43de2a2ff575c4fd9e11153a575c8dfbbb858008`, enviado para
  `origin/agent/publish-production-hardening`.

## Atualização de execução — 2026-08-20T13:51:48-03:00 — B99-307

- **RED/GREEN:** o safety gate anterior deixava passar `TRUNCATE`, `DELETE`,
  `SET NOT NULL` sem guarda de backfill e coluna `NOT NULL` sem `DEFAULT`;
  o GREEN adicionou rejeição fail-closed e conectou
  `pnpm verify:migration-safety` ao `pnpm verify`;
- **evidência:** foco de migrations `2` arquivos / `8/8` testes, cadeia
  `33/33`, PostgreSQL descartável com aplicação do zero e restore isolado
  `2/2` com marcador, artefato checksummed e invariantes preservados;
  coverage `204/1080/21`, build `12/12`, contratos `84/84`, worker `51/51`,
  decisões `7/7`, mutation `7/7`, lint/typecheck/formato e hotspots passaram;
- **limite/status:** não houve rollout misto N/N-1 no RC autorizado nem
  alteração de produção; CI/registry, secret manager, clínica, `0/145` e
  reauditoria seguem abertos. B99-307 está `READY_FOR_NEXT_STEP` localmente;
  próxima frente local: B99-308;
- **publicação:** código em `8440f09`, enviado para
  `origin/agent/publish-production-hardening`.

## Atualização de execução — 2026-08-20T14:04:49-03:00 — B99-308

- **RED/GREEN:** `validateApiSurface` aceitava request contract vazio e as
  rotas de sessão declaradas como `SESSION` não exigiam `requirePrincipal`;
  o GREEN adicionou validação de request contract, handler group,
  compatibilidade auth/escopo e autenticação para revogação/rotação;
- **evidência:** o inventário passou `5/5` e percorreu `57/57` rotas pela borda
  HTTP sem 404; rotas protegidas sem principal retornaram `401/403`, entradas
  públicas inválidas retornaram `422/422`, telemetria ficou coberta e
  métodos/caminhos negativos foram rejeitados. Contratos passaram `4/4`, API
  `60/60`, cobertura `204/1083/21` em `95,01/90,89/95,29/95,70`, build `12/12`,
  contratos `84/84`, decisões `7/7`, mutation `7/7`, lint/typecheck/formato e
  hotspots passaram;
- **limite/status:** a prova é local e determinística; não há fuzz
  property-based, HA/API/DB ativo, RC imutável, secret manager, clínica,
  `0/145` ou reauditoria independente. B99-308 está
  `READY_FOR_NEXT_STEP` localmente e o programa permanece
  `IN_PROGRESS / PILOT_BLOCKED`;
- **publicação:** código em `31fed87` (`fix: harden API route contracts and
  authz`), enviado para `origin/agent/publish-production-hardening`.

## Atualização de execução — 2026-08-20T14:28:58-03:00 — B99-305

- **RED/GREEN:** `startAttempt` e `submitAttempt` excediam o bar local com 76
  linhas; o teste novo de política também encontrou `dependencyResponse` com
  75 linhas depois da primeira extração. O GREEN separou as operações
  transacionais de tentativa e as etapas de autorização, cache e leitura de
  dependências. Uma regressão real de coalescimento in-flight foi encontrada
  (`dependencyStatus` chamado duas vezes) e corrigida antes do fechamento;
  foco de política `5/5` e health `10/10` ficaram verdes.
- **evidência:** fluxos relacionados de API/servidor/tentativa `97/97`,
  cobertura `204/1085/21` em `95,02/90,92/95,31/95,70`, build `12/12`, contratos
  `84/84`, worker `51/51`, decisões `7/7`, mutation crítica `7/7`, arquitetura,
  lint, typecheck, formato, hotspots e diff-check passaram. O hotspot scan
  reportou `0` hotspots acima do limite, `111` funções longas e máximo de `75`;
  a política crítica bloqueia regressão acima de `50` nos três comandos.
- **verify oficial:** passou todos os gates até migration safety e parou
  fail-closed em `verify:secrets` nos quatro valores redigidos de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado.
- **limite/status:** B99-305 está `READY_FOR_NEXT_STEP` localmente; não há
  prova de Playwright/WebKit/HA/API/DB ativo, RC imutável, rollout N/N-1,
  secret manager, clínica, `0/145`, gates externos ou reauditoria. O programa
  permanece `IN_PROGRESS / PILOT_BLOCKED`.
- **publicação:** código em `90f0a21`, enviado para
  `origin/agent/publish-production-hardening`; `.gauntlet/` continua local e
  não rastreado.

## Definition of Done

Nenhuma task é `COMPLETED` sem teste, review, evidência, rastreabilidade,
rollback/limitação e atualização de estado/log/backlog. O backlog inteiro só é
concluído após G99-0…G99-8 e decisão humana; até lá, `PILOT_BLOCKED`.
