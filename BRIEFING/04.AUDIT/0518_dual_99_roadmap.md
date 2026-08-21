# 0518 — Roadmap Dual 99

**Programa:** `BRIEFING/03.BUILD/0309_dual_99_executive_program.md`
**Backlog:** `BRIEFING/04.AUDIT/0519_dual_99_backlog.md`
**Predecessor preservado:** `0516_dual_98_roadmap.md`
**Disposição:** `IN_PROGRESS / PILOT_BLOCKED`

## 1. Calendário relativo

As janelas contam a partir de T0 aprovado. Não são promessa de data. Trabalho
local reversível pode avançar; commits, providers, produção, decisões clínicas,
UAT e auditoria exigem suas autoridades.

| Fase | Janela indicativa | Resultado | Gate |
|---|---:|---|---|
| F99-0 — verdade e mobilização | W0–W1 | critérios 99, owners, corte, registry e baseline atualizados | G99-0 |
| F99-1 — fechamento local | W1–W5 | segurança, dados, worker, testes, WebKit e hotspots | G99-1 |
| F99-2 — RC-alpha | W4–W7 | clean checkout, artefatos assinados, canário e rollback | G99-2 |
| F99-3 — fundação externa | W4–W12 | CI/registry/IdP/TLS/observabilidade/backup/HA reais | G99-3 |
| F99-4 — produto e clínica | W1–W22+ | 24/96/B-07, fila liberável zero e QA humano | G99-4 |
| F99-5 — aceitação/resiliência | após F3/F4, 3–5 semanas | UAT, WCAG, RUM, pentest, soak, DR e failover | G99-5 |
| F99-6 — evidência | 1–2 semanas | 145/145, pacote congelado e validade | G99-6 |
| F99-7 — reauditoria/go-no-go | 1–2 semanas | duas matrizes ≥99 e decisão humana | G99-7/G99-8 |

Horizonte nominal: 20–28 semanas após T0. A fila clínica, providers e
descobertas P0/P1 podem ampliar o prazo; não reduzem a barra.

## 2. Ordem das ondas

### Onda A — segurança e gates que impedem medição

Executar primeiro: formato/lint, scanner, secrets, sessão, idempotência,
outbox/readiness e observabilidade. Sem isso não há evidência confiável.

### Onda B — qualidade e integração

Corrigir testes, cobertura, mutation, skips, hotspots, contratos, migrações,
WebKit e E2E real. Reexecutar `pnpm verify` completo.

### Onda C — release e runtime

Formar RC em checkout limpo, gerar SBOM/attestation/manifest, executar canário,
rollback distinto, restore, failover e alertas em ambiente autorizado.

### Onda D — produto e clínica

Completar corpus e jornadas; calibrar revisores; revisar e auditar fila item a
item; manter publicação fechada até decisão clínica válida.

### Onda E — aceitação e auditoria

Executar UAT por papel/dispositivo/turno, WCAG manual, RUM, security assessment,
soak, DR, pacote de evidências e duas reauditorias independentes.

## 3. Caminho crítico

```text
F99-0
  → scanner/sessão/idempotência/clínica/outbox/observabilidade
  → verify + coverage + browsers + hotspots + traceability
  → RC-alpha + N/N-1 + CI/SBOM/rollback
  → runtime externo + backup/DR + IdP/TLS + HA
  → produto/clínica + UAT/WCAG/RUM
  → 145/145 + duas reauditorias ≥99 + go/no-go
```

## 4. Paralelismo seguro

Podem ocorrer em paralelo com ownership disjunto: scanner, worker health,
observabilidade e documentação. Devem ser sequenciais: migrations/RLS,
composition roots, auth/session, máquina clínica, web global, manifesto e
qualquer alteração que mude o denominador de testes.

## 5. Métricas de controle

| Indicador | Baseline | Target |
|---|---:|---:|
| itens oficiais ≥99 | 0/32 | 32/32 |
| C1–C8 ≥99 | 0/8 | 8/8 |
| RH fechados | 0/6 | 6/6 |
| cadeias | 0/145 | 145/145 |
| risco completo | 11/87 | 87/87 |
| coverage S/F/L/B | 90,43/85,14/93,61/91,84 | ≥95/95/95/90 |
| funções >100 | 21 (22 ≥100) | 0 |
| runs E2E/flake | 3/20 | 20/20 |
| browsers ativos | Chromium parcial | Chromium/Firefox/WebKit/mobile |
| fila clínica | 763 pendentes documentados | liberável zero |
| release provenance | worktree sem RC | SHA/digest/SBOM/manifest coerentes |

## 6. Replanejamento

Replanejar apenas se houver mudança de requisito, autoridade, ambiente,
validade da medição ou descoberta de um gate obrigatório ausente. Nunca reduzir
99 para admitir implementação parcial.

## 7. Checkpoint de execução — 2026-08-20T02:48:08-03:00

A Onda B local avançou com sete focos TDD verdes: dashboard `4/4`, journey
`6/6`, authoring `12/12`, assessment `9/9`, parser `8/8`, runner HA `7/7` e
scanner `14/14`. A suíte ficou em `199/1038/21`, cobertura
`95,01/91,02/95,19/95,73` (statements/branches/functions/lines), contratos
`84/84`, worker `46/46`, build `12/12`, E2E sintético Chromium `27/27` e
hotspots `144` funções longas com ratchet `144/117`.

O resultado é evidência local e mantém o caminho crítico externo: mutation,
20 runs, Firefox/WebKit ativo, HA/API/DB, RC/SBOM/attestation, CI/registry,
IdP/TLS, backup/DR, produto/clínica, UAT/WCAG/RUM, `145/145` cadeias, duas
reauditorias e go/no-go. Portanto `F99-1` continua `IN_PROGRESS` e o produto
continua `PILOT_BLOCKED`.

## 8. Checkpoint de estabilidade — 2026-08-20T03:18:35-03:00

A janela local de skips/flakiness foi executada: 17 repetições adicionais de
`pnpm test:coverage` passaram sem falha, elevando a governança a `20/20` runs,
`0` flaky, zero skips sem classificação e `17` arquivos/`21` testes guardados
por dependências live. Isso conclui B99-304 localmente e libera a próxima
frente para mutation crítica, sem fechar o restante do caminho crítico.

F99-1 permanece `IN_PROGRESS`: browsers/HA/API/DB ativos, RC/SBOM/attestation,
CI/registry, IdP/TLS, backup/DR, produto/clínica, UAT/WCAG/RUM, `145/145`,
reauditorias e go/no-go ainda exigem ambiente e autoridade próprios.

## 9. Checkpoint de mutation crítica — 2026-08-20T03:27:03-03:00

B99-303 foi fechada localmente com baseline verde e sete mutações direcionadas
mortas (`7/7`, `100%`, mínimo `90%`), sem sobreviventes; o teste focal passou
`3/3` e a evidência está em `docs/137`. A próxima frente permanece mutation
integral e validação dos ambientes live/RC, pois os gates externos não são
substituídos por esta prova.

## 10. Reconciliação final — 2026-08-20T03:48:50-03:00

Os verificadores de documentação, programa, rastreabilidade, skips, mutation,
hotspots, formato, lint, typecheck e `git diff --check` passaram novamente após
a correção de `docs/135`. A medição corrente é `200/1041/21`, floors
`95,01/91,02/95,19/95,73`, ratchet `144/113`, mutation direcionada `7/7`,
skips `20/20`/`0` flaky, build `12/12` e E2E Chromium sintético `27/27`.

O roadmap continua condicionado aos gates que não podem ser simulados:
mutation integral, browsers/HA/API/DB ativos, RC/proveniência, clínica,
operação externa, `0/145`, aprovação humana e reauditoria. O parecer
independente compatível permanece `REJECT`; a nova tentativa read-only foi
encerrada sem evidência. Estado: `IN_PROGRESS` / `PILOT_BLOCKED`.

## 11. Checkpoint de contratos negativos — 2026-08-20T15:52:02-03:00

B99-308 recebeu uma frente local de fuzz bounded determinístico. O RED
reproduziu exceções para descritores incompletos e lookup com `path` inválido;
o GREEN adicionou rejeição fail-closed e isolou a validação em módulo coeso.
Focais `6/6`, inventário `11/11`, contratos `86/86`, arquitetura `2/2`, build
`12/12`, cobertura `204/1091/21` em `95,02/90,95/95,31/95,71` e hotspots `0`
passaram. A primeira execução ampla encontrou hotspot não classificado, que foi
removido por extração estrutural e revalidado.

O código/testes de B99-308 foram commitados em `7c46ad3` e a evidência rastreada
em `a4840eb`; o avanço permanece
local e não altera a disposição `IN_PROGRESS` / `PILOT_BLOCKED`.

O avanço é local e não fecha B99-306, RC/proveniência, secret manager,
HA/API/DB externo, clínica, `0/145`, gates externos, duas reauditorias ou
go/no-go. F99-1 permanece `IN_PROGRESS` e o produto permanece
`PILOT_BLOCKED`.

## 12. Checkpoint do downloader clínico — 2026-08-20T16:21:01-03:00

B99-102 avançou localmente sob RED/GREEN. O RED reproduziu os caminhos sem
contrato do downloader S3 privado; o GREEN passou a exigir endpoint HTTPS
origin-only, bucket/prefixo sem traversal, destino absoluto externo ao
repositório, `redirect: "error"`, timeout com AbortController, limite de corpo
declarado e durante streaming, temp `0600`, hash antes de rename atômico e
rejeição de symlink. O foco passou `20/20`, a regressão de localização `5/5`,
cobertura ampla `205/1111/21` em `95,02/90,95/95,31/95,71`, build `12/12`,
arquitetura `2/2`, scope drift, migration safety, hotspots `0`, lint, typecheck,
formato e diff-check.

O avanço não materializou fonte licenciada, não leu/alterou `.env.local`, não
provisionou provider/secret manager/CI e não substitui o scan de segredos, que
continua fail-closed pelos quatro valores locais redigidos. B99-102 segue
`IN_PROGRESS`; B99-306, RC/proveniência, runtime, clínica, `0/145`, gates
externos e reauditoria permanecem abertos. Estado: `IN_PROGRESS` /
`PILOT_BLOCKED`.

## 13. Checkpoint de parser de histórico do scanner — 2026-08-20T16:52:54-03:00

B99-101 recebeu uma redução local adicional sob RED/GREEN. O RED reproduziu
falso scan limpo para header `tree` sem tamanho numérico, corpo `commit`
truncado e corpo `tree` sem delimitador. O GREEN valida tamanho seguro, corpo
completo e delimitador do framing `git cat-file --batch`, emitindo
`git-object-unreadable` e interrompendo o lote inválido; objetos Git válidos,
blobs e tags permanecem preservados. O foco passou `18/18`, a cobertura passou
`205/1112/21` em `95,02/90,95/95,31/95,71`, e lint, typecheck, formato, audit,
hotspots `0` e diff-check passaram. Código/teste estão em `16a4f82`.

O `pnpm verify` percorreu os gates até `verify:secrets`, que continua
fail-closed somente nos quatro valores redigidos preexistentes de
`infra/production/.env.local`. B99-101 permanece `IN_PROGRESS`; secret
manager/rotação, RC/proveniência, runtime, clínica, `0/145`, gates externos,
aprovação humana e reauditoria continuam abertos. F99-1 segue
`IN_PROGRESS`/`PILOT_BLOCKED`; a evidência foi publicada em `73ae862`.

## 32. Checkpoint de boundary fuzz B99-308 — 2026-08-21T00:04:17-03:00

B99-308 recebeu RED/GREEN para a última lacuna local da fronteira de
descritores da API. A auditoria read-only encontrou leitura direta de
propriedades desconhecidas em `validateApiSurface`; o RED reproduziu exceção
em getter sintético hostil e o GREEN introduziu `readUnknown`, capturando
falhas de acesso e validando os valores como desconhecidos.

A campanha property-based seeded e determinística executou `512` descritores
malformados, incluindo accessors que lançam, e `512` pares de método/path. Todos
os casos permaneceram sem exceção, cada descritor inválido produziu erro, o
inventário válido de `57` rotas permaneceu sem erro e lookup malformado falhou
fechado. Foco `7/7`, integração `11/11`, contratos `28/87`, cobertura
`205/1135/21` em `95,03/90,95/95,31/95,73`, build `12/12`, hotspots `0`,
decisões `7/7`, mutation `7/7`, lint, typecheck, formato e diff-check passaram.
O código/teste está em `9b3f71e` e foi publicado no branch remoto.

B99-308 fica concluído no escopo local desta barra. O `pnpm verify` oficial
percorreu os gates até `verify:secrets` e parou fail-closed nos quatro
assignments redigidos preexistentes de `infra/production/.env.local`, que não
foi lido nem alterado. Secret manager/rotação, RC/proveniência, runtime live,
clínica, `0/145`, gates externos, aprovação humana e reauditoria independente
continuam abertos; o roadmap permanece `IN_PROGRESS / PILOT_BLOCKED` e não
promove score, release ou piloto.

## 33. Checkpoint de default bounded do planner Git B99-101 — 2026-08-21T00:29:52-03:00

Uma auditoria read-only encontrou que `planGitBatchRequests` aceitava
`maxBatchBytes` omitido como `Number.MAX_SAFE_INTEGER`; três objetos Git
sintéticos de `3 MiB` produziam uma batch de `9 MiB`. O RED adicionou a
regressão do limite finito e falhou; o GREEN adotou default de `8 MiB`, rejeitou
limites não positivos, não seguros, `NaN` e infinitos, e converteu objeto
individual acima do orçamento em `git-object-unreadable` sem criar batch
oversized. A composição de produção continua passando `8 MiB` explicitamente.

O foco passou `40/40`; a cobertura passou `205/1136/21` em
`95,03/90,95/95,31/95,73`, build `12/12`, `verify:hotspots` reporta `0`
hotspots e maior função de `97` linhas, contratos `87/87`, decisões `7/7`,
mutation `7/7`, migration safety, lint, typecheck, formato e diff-check
passaram. A prova sintética produziu batches omitidos
`[6291456,3145728]`, três batches de `3 MiB` com limite explícito de `5 MiB`
e finding redigido para objeto de `9 MiB`. O código/teste está em `87717ed`.

O gate `pnpm verify:secrets` permanece fail-closed nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem
alterado. A crítica desta rodada foi fresca, read-only e não independente; o
roadmap permanece `IN_PROGRESS / PILOT_BLOCKED` e não promove score, release,
clínica ou piloto.

## 62. Checkpoint de publicação da enumeração de metadados Git B99-101 — 2026-08-21T05:11:16-03:00

O código/teste `ace0054` e a reconciliação documental inicial `f63547e` foram
publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou
`HEAD == origin` em `f63547e`. A reconciliação final não altera runtime,
produção, segredos, score, release, clínica ou piloto.

## 61. Checkpoint da enumeração bounded de metadados Git B99-101 — 2026-08-21T05:11:16-03:00

Uma auditoria read-only encontrou que o snapshot de metadata Git materializava
`2000` entradas sintéticas em `.git/objects/info` por usar enumeração sem
limite. RED reproduziu a ausência do finding genérico; GREEN separa a abertura
no-follow da enumeração, lê incrementalmente com orçamento de `1024` entradas
em `objects`, `info` e `pack` e falha fechado em overflow, symlink ou
`alternates` inseguro.

O foco passou `58/58`, a cobertura passou `205/1154/21` em
`95,03/90,95/95,31/95,73`, o build passou `12/12` com URL local efêmera, CI
contract, arquitetura `2/2`, hotspots `0` com maior função de `100`, lint,
typecheck, formato, diff-check e audit de dependências passaram. Probe pós-fix
com `2000` entradas produziu `gitObjectsStatus=unavailable`,
`materializedSnapshotEntries=0` e finding genérico. Código/teste `ace0054` e
documentação inicial `f63547e` foram publicados. `pnpm verify:secrets`
permanece fail-closed nos quatro assignments redigidos preexistentes;
Windows/non-proc, condições live, gates externos, crítica independente e
demais bloqueios do programa permanecem abertos.

## 60. Checkpoint de publicação da corrida de metadados Git B99-101 — 2026-08-21T04:54:57-03:00

O código/teste `50f22c7` e a reconciliação documental `31ce669` foram
publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou
`HEAD == origin` em `31ce669`. A publicação não altera runtime, produção,
segredos, score, release, clínica ou piloto.

## 59. Checkpoint da corrida de metadados Git B99-101 — 2026-08-21T04:54:57-03:00

B99-101 recebeu RED/GREEN para a corrida de metadata Git. Um worker criou e
removeu `objects/info/alternates` entre a validação e o uso; o scanner anterior
produziu `history:victim.env` em `1/1000` probes e o RED focal acumulou `12`
findings externos em `1000` tentativas. O GREEN registra snapshot estrutural e
de `stat` de `objects`, `info` e `pack`, valida depois de cada comando/batch e
descarta output/parser findings quando a superfície muda, retornando
`history:<git> / git-object-unreadable`.

O foco passou `57/57`, a cobertura passou `205/1153/21` em
`95,03/90,95/95,31/95,73`, o build passou `12/12`, CI contract, arquitetura
`2/2`, hotspots `0` com maior função de `100`, lint, typecheck, formato,
diff-check e audit de dependências passaram. Probe pós-fix de `1000` corridas
produziu `0` leaks; `.git/commondir` não expôs objeto externo e falhou fechado.
`pnpm verify:secrets` permanece fail-closed nos quatro assignments redigidos
preexistentes; Windows/non-proc, condições live, gates externos, crítica
independente e demais bloqueios de programa permanecem abertos.

## 58. Checkpoint de publicação de metadados Git internos B99-101 — 2026-08-21T04:26:53-03:00

O código/teste `3c3758c` e a reconciliação documental `de4563e` foram
publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou
`HEAD == origin` em `de4563e`. A publicação não altera runtime, produção,
segredos, score, release, clínica ou piloto.

## 57. Checkpoint de metadados Git internos B99-101 — 2026-08-21T04:26:53-03:00

B99-101 recebeu RED/GREEN para as superfícies internas de metadados Git. A
auditoria reproduziu `staged:victim.env` por symlinks em `.git/index`/
`.git/objects` e `history:victim.env` por `objects/info/alternates`; o RED
focal confirmou os dois atravessamentos. O GREEN abre `index` e `objects` com
no-follow, mantém handles em fd 4/5, rejeita symlinks em `objects`, `info` e
`pack`, rejeita `alternates` e falha fechado antes de invocar a superfície
insegura.

O foco passou `56/56`, a cobertura passou `205/1152/21` em
`95,03/90,95/95,31/95,73`, o build passou `12/12`, CI contract, arquitetura
`2/2`, hotspots `0`, lint, typecheck, formato, diff-check e audit de
dependências passaram. `pnpm verify:secrets` permanece fail-closed nos quatro
assignments redigidos preexistentes; Windows/non-proc, condições live, gates
externos, crítica independente e demais bloqueios de programa permanecem
abertos.

## 56. Checkpoint de publicação do ambiente Git B99-101 — 2026-08-21T04:02:33-03:00

O código/teste `ae3d596` foi publicado em
`origin/agent/publish-production-hardening`; a reconciliação documental
`efa1d9f` também foi publicada e o pós-push confirmou `HEAD == origin` em
`efa1d9f`. A publicação não altera runtime, produção, segredos, score, release,
clínica ou piloto.

## 55. Checkpoint do ambiente Git B99-101 — 2026-08-21T04:02:33-03:00

B99-101 recebeu RED/GREEN para o ambiente herdado do Git. Uma auditoria
read-only configurou `GIT_INDEX_FILE` e `GIT_OBJECT_DIRECTORY` para um
repositório externo e reproduziu `staged:victim.env` com
`sensitive-assignment`; o RED focal confirmou o vazamento. O GREEN remove todas
as chaves `GIT_*` herdadas do ambiente do child e fixa somente
`GIT_DIR=/proc/self/fd/3` e `GIT_WORK_TREE=.`.

O foco passou `54/54`, a cobertura passou `205/1150/21` em
`95,03/90,95/95,31/95,73`, o probe sintético com quatro redirecionadores Git
não produziu finding sensível, o build sintético passou `12/12`, CI contract e
arquitetura `2/2`, hotspots `0`, lint, typecheck, formato, diff-check e audit
de dependências passaram. `pnpm verify:secrets` permanece fail-closed nos
quatro assignments redigidos preexistentes; Windows/non-proc, condições live,
gates externos e crítica independente permanecem abertos.

## 54. Checkpoint de publicação da identidade da raiz B99-101 — 2026-08-21T03:51:59-03:00

O código/teste `55dffa5` foi publicado em
`origin/agent/publish-production-hardening`; a reconciliação documental
`b306790` também foi publicada e o pós-push confirmou `HEAD == origin` em
`b306790`. A publicação não altera runtime, produção, segredos, score, release,
clínica ou piloto.

## 53. Checkpoint da identidade da raiz B99-101 — 2026-08-21T03:45:58-03:00

B99-101 recebeu RED/GREEN para a corrida de identidade da raiz. Uma troca por
outro diretório real, sem symlink, fez a sequência `lstat`→open atravessar a
fronteira em `207/1000` tentativas; o focal RED reproduziu `87/500` findings.
O GREEN consolida a fronteira em `withWorkspaceRoot`, compara `dev/ino` do
`lstat` com o descritor aberto por `O_DIRECTORY | O_NOFOLLOW` e falha fechado
quando diverge; o scan usa somente o handle retido.

O foco passou `53/53`, a cobertura passou `205/1149/21` em
`95,03/90,95/95,31/95,73`, dez swaps profundos determinísticos pós-fix não
produziram finding externo, o build sintético passou `12/12`, CI contract e
arquitetura `2/2`, hotspots `0`, lint, typecheck, formato, diff-check e audit
de dependências passaram. `pnpm verify:secrets` permanece fail-closed nos
quatro assignments redigidos preexistentes; a solução local depende de
POSIX/procfs e as condições live, externas e independentes permanecem abertas.

## 52. Checkpoint de publicação do Git metadata bounded B99-101 — 2026-08-21T03:35:55-03:00

O código/teste `5ea9281` foi publicado em
`origin/agent/publish-production-hardening`; a reconciliação documental
`4d54d8b` também foi publicada e o pós-push confirmou `HEAD == origin` em
`4d54d8b`. A publicação não altera runtime, produção, segredos, score, release,
clínica ou piloto.

## 51. Checkpoint do Git metadata bounded B99-101 — 2026-08-21T03:31:23-03:00

B99-101 recebeu RED/GREEN para metadados Git simbólicos. Um `.git` apontando
para repositório externo produziu achados sensíveis em `staged:victim.env` e
`history:victim.env`. O GREEN abre o `.git` direto com
`O_DIRECTORY | O_NOFOLLOW`, mantém o descritor e o entrega ao child Git em fd
3; `runGitCommand`/`runGitBatch` preservam caps bounded, e o worktree usa a
raiz já aberta.

O foco passou `52/52`, a cobertura passou `205/1148/21` em
`95,03/90,95/95,31/95,73`, um probe `.git` completou `1000` trocas sem
vazamento ou exceção (`758` unreadable, `242` clean), o build sintético passou
`12/12`, CI contract e arquitetura `2/2`, hotspots `0`, lint, typecheck,
formato, diff-check e audit de dependências passaram. `pnpm verify:secrets`
permanece fail-closed nos quatro assignments redigidos preexistentes de
`infra/production/.env.local`; a solução local depende de POSIX/procfs e as
condições live, externas e independentes permanecem abertas.

## 50. Checkpoint de publicação do parent path bounded B99-101 — 2026-08-21T03:08:46-03:00

O código/teste `c69069b` foi publicado em
`origin/agent/publish-production-hardening`; a reconciliação documental
`13f64f1` também foi publicada no mesmo branch e o pós-push confirmou
`HEAD == origin` em `13f64f1`. A publicação não altera runtime, produção,
segredos, score, release, clínica ou piloto.

## 49. Checkpoint do parent path bounded B99-101 — 2026-08-21T03:05:17-03:00

B99-101 recebeu RED/GREEN para componentes-pai do caminho. O RED alternou
`slot` entre diretório e symlink externo; como `O_NOFOLLOW` protegia apenas o
componente final, a travessia encontrou `victim.env` fora da árvore em `14/500`
tentativas e o focal reproduziu `15/500` vazamentos. O GREEN caminha cada
componente absoluto desde `/` com `O_DIRECTORY | O_NOFOLLOW`; a recursão
`/proc/self/fd/<fd>/child` permanece ancorada no descritor já aberto.

O foco passou `50/50`, a cobertura passou `205/1146/21` em
`95,03/90,95/95,31/95,73`, o probe pós-correção completou `5000` trocas sem
vazamento nem exceção, o build sintético passou `12/12`, hotspots `0` com
maior função de `98` linhas, contratos `87/87`, worker `51/51`, decisões `7/7`,
mutation `7/7`, migration safety `33/33`, audit, lint, typecheck, formato e
diff-check passaram. O `pnpm verify` no SHA exato percorreu os gates até
migration safety e parou fail-closed somente nos quatro assignments redigidos
preexistentes de `infra/production/.env.local`, que não foi lido nem alterado.
A solução depende de flags POSIX/`/proc`; condições live e externas
permanecem abertas.

## 48. Checkpoint de publicação do Git cwd bounded B99-101 — 2026-08-21T02:51:17-03:00

O código/teste `0f575d1` foi publicado em
`origin/agent/publish-production-hardening`; a reconciliação documental
`22de927` também foi publicada no mesmo branch e o pós-push confirmou
`HEAD == origin` em `22de927`. A publicação não altera runtime, produção,
segredos, score, release, clínica ou piloto.

## 47. Checkpoint do Git cwd bounded B99-101 — 2026-08-21T02:47:53-03:00

B99-101 recebeu RED/GREEN para a corrida da própria raiz. O RED reproduziu que
a validação anterior era seguida por `cwd: root` mutável: um worker alternou a
raiz para symlink externo e encontrou `staged:victim.env` em `3/300` tentativas;
o focal reproduziu `7/500` vazamentos. O GREEN abre a raiz com
`O_DIRECTORY | O_NOFOLLOW`, mantém o descritor durante workspace, staged e
history e usa `/proc/self/fd/<fd>` em todos os comandos Git; falhas retornam
`<workspace> / unreadable-file`.

O foco passou `49/49`, a cobertura passou `205/1145/21` em
`95,03/90,95/95,31/95,73`, os probes staged `5000` e history `1000` não
encontraram vazamento nem exceção, o build sintético passou `12/12`, hotspots
`0` com maior função de `98` linhas, contratos `87/87`, worker `51/51`,
decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint,
typecheck, formato e diff-check passaram. O `pnpm verify` no SHA exato passou
até migration safety e parou fail-closed somente nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem
alterado. A solução depende de flags POSIX/`/proc`; parent path races,
condições live e externas permanecem abertas.

## 46. Checkpoint de publicação da travessia recursiva B99-101 — 2026-08-21T02:22:29-03:00

O código/teste `4af5821` foi publicado em
`origin/agent/publish-production-hardening`; a reconciliação documental
`41cf20c` também foi publicada no mesmo branch e o pós-push confirmou
`HEAD == origin` em `41cf20c`. A publicação não altera runtime, produção,
segredos, score, release, clínica ou piloto.

## 45. Checkpoint de travessia recursiva bounded B99-101 — 2026-08-21T02:16:26-03:00

B99-101 recebeu RED/GREEN para a abertura concorrente de diretórios. O RED
reproduziu que uma troca de `root/nested` para symlink fazia a travessia antiga
encontrar `nested/victim.env` fora da raiz em `178` tentativas, além de deixar
escapar `ENOENT` durante `readdir`. O GREEN abre cada diretório com
`O_DIRECTORY | O_NOFOLLOW`, enumera via `/proc/self/fd/<fd>` e mantém o
descritor-pai aberto durante a recursão; falhas retornam
`<workspace> / unreadable-file`.

O foco passou `48/48`, a cobertura passou `205/1144/21` em
`95,03/90,95/95,31/95,73`, o probe de profundidade pós-correção completou
`5000` trocas sem vazamento nem exceção, o build sintético passou `12/12`,
hotspots `0` com maior função de `98` linhas, contratos `87/87`, worker `51/51`,
decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint,
typecheck, formato e diff-check passaram. O `pnpm verify` oficial percorreu os
gates até migration safety e parou fail-closed somente nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem
alterado. A solução depende de flags POSIX/`/proc` e falha fechado sem elas;
condições live, externas e parentless permanecem abertas.

## 44. Publicação do checkpoint da abertura bounded B99-101 — 2026-08-21T01:59:25-03:00

O código/teste `ee0ebc9` e a reconciliação documental `5998266` foram
publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou
`HEAD == origin` em `5998266`. Estado, backlog, evidência, log e traceability
estão alinhados. A publicação não altera runtime, produção, segredos, score,
release, clínica ou piloto; `.gauntlet/` permanece local e não rastreado.

## 43. Checkpoint de abertura bounded do scanner B99-101 — 2026-08-21T01:56:15-03:00

B99-101 recebeu RED/GREEN para a janela entre a validação `lstat` e a abertura
do arquivo. O RED usou um worker sintético para alternar `victim.env` entre
arquivo regular e symlink; em `164` tentativas o scanner anterior seguiu o
alvo externo e emitiu `sensitive-assignment`. O GREEN moveu `readScanBuffer`
para `scripts/secret-scanner-workspace.mjs` e usa `O_RDONLY | O_NOFOLLOW`;
symlink no componente final e plataformas sem `O_NOFOLLOW` falham fechado.

O foco passou `47/47`, a cobertura passou `205/1143/21` em
`95,03/90,95/95,31/95,73`, o probe pós-correção completou `5000` trocas sem
vazamento, o build sintético passou `12/12`, hotspots `0` com maior função de
`98` linhas, contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`,
migration safety `33/33`, audit, lint, typecheck, formato e diff-check
passaram. O `pnpm verify` oficial percorreu os gates até migration safety e
parou fail-closed somente nos quatro assignments redigidos preexistentes de
`infra/production/.env.local`, que não foi lido nem alterado. O foco local está
concluído com gaps externos; condições de corrida em componentes-pai não são
fechadas por esta alteração.

## 42. Publicação do checkpoint da fronteira da raiz B99-101 — 2026-08-21T01:39:59-03:00

O código/teste `1ab557e` e a reconciliação documental `3217e13` foram
publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou
`HEAD == origin` em `3217e13`. Estado, backlog, evidência, log e traceability
estão alinhados. A publicação não altera runtime, produção, segredos, score,
release, clínica ou piloto; `.gauntlet/` permanece local e não rastreado.

## 41. Checkpoint de fronteira da raiz do scanner B99-101 — 2026-08-21T01:32:38-03:00

B99-101 recebeu RED/GREEN para a raiz fornecida ao `scanProject`. O RED
reproduziu traversal quando a raiz era um symlink para diretório temporário
com `config.env` sintético, inclusive com superfícies staged/history ativadas.
O GREEN valida a raiz com `lstat` antes de worktree, staged ou history; symlink,
ausência e arquivo regular retornam somente `<workspace> / unreadable-file` e
não invocam Git. O guard foi extraído para
`scripts/secret-scanner-workspace.mjs`, mantendo o scanner principal em `800`
linhas.

O foco passou `46/46`, a cobertura passou `205/1142/21` em
`95,03/90,95/95,31/95,73`, o build sintético passou `12/12`, hotspots `0` com
maior função de `98` linhas, contratos `87/87`, worker `51/51`, decisões `7/7`,
mutation `7/7`, migration safety `33/33`, audit, lint, typecheck, formato e
diff-check passaram. O `pnpm verify` oficial percorreu os gates até migration
safety e parou fail-closed somente nos quatro assignments redigidos
preexistentes de `infra/production/.env.local`, que não foi lido nem alterado.
O foco local está concluído com gaps externos; B99-101 e o programa permanecem
`IN_PROGRESS / PILOT_BLOCKED`, sem score, release, piloto ou produção.

## 40. Publicação do checkpoint bounded workspace asset reads B99-101 — 2026-08-21T01:13:43-03:00

O código/teste `95adb51` e a reconciliação documental `22d1a97` foram publicados
em `origin/agent/publish-production-hardening`; a checagem pós-push confirmou
`HEAD == origin` em `22d1a97`. A rodada fechou o teto de leitura do
workspace: assets ignorados oversized são descartados pelo preflight e arquivos
regulares são lidos em buffer de `MAX_SCAN_BYTES + 1`. O foco passou `43/43`,
full coverage `205/1139/21`, build sintético `12/12`, hotspots `0`, contratos
`87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration safety
`33/33`, audit, lint, typecheck, formato e diff-check. O build sem
`CVG_API_INTERNAL_URL` permaneceu bloqueado pelo guard esperado.

O gate `pnpm verify:secrets` permanece fail-closed nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem
alterado. A crítica desta rodada foi fresca, read-only e não independente; o
roadmap permanece `IN_PROGRESS / PILOT_BLOCKED` e não promove score, release,
clínica ou piloto.

## 39. Checkpoint bounded workspace asset reads B99-101 — 2026-08-21T01:13:43-03:00

Uma auditoria read-only reproduziu a materialização sem teto em `scanFile` para
assets de extensão ignorada acima de `2 MiB`. O RED usou um `.png` esparso,
oversized e sem permissão; o GREEN passou a descartar o asset por metadata e a
usar `readScanBuffer` com máximo de `MAX_SCAN_BYTES + 1`, preservando o
comportamento de texto UTF-8 limitado e fail-closed se houver crescimento após
`lstat`.

O foco passou `43/43`; a cobertura passou `205/1139/21` em
`95,03/90,95/95,31/95,73`, build sintético `12/12`, `verify:hotspots` reporta
`0` hotspots e maior função de `98` linhas, contratos `87/87`, worker `51/51`,
decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint,
typecheck, formato e diff-check passaram. O código/teste está em `95adb51`.

O gate `pnpm verify:secrets` permanece fail-closed nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem
alterado. A crítica desta rodada foi fresca, read-only e não independente; o
roadmap permanece `IN_PROGRESS / PILOT_BLOCKED` e não promove score, release,
clínica ou piloto.

## 38. Publicação do checkpoint de caps scan/header B99-101 — 2026-08-21T01:01:22-03:00

O código/teste `3410d52` e a reconciliação documental `4bd3d3e` foram publicados
em `origin/agent/publish-production-hardening`; a checagem pós-push confirmou
`HEAD == origin` em `4bd3d3e`. Estado, backlog, evidência, log e traceability
estão alinhados. A publicação não promove score, release, clínica ou piloto e
não fecha os quatro findings locais de `.env.local`, secret manager/rotação,
provider/CI, RC/proveniência, runtime live, `0/145`, gates externos, aprovação
humana ou reauditoria independente. O roadmap permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## 37. Checkpoint de caps scan/header do parser B99-101 — 2026-08-21T00:58:01-03:00

Uma auditoria read-only reproduziu que `planGitBatchRequests` aceitava
`maxScanBytes: Infinity`, planejando objeto sintético de `9 MiB` sem finding,
e que `createGitBatchStreamParser` aceitava `maxHeaderBytes: Infinity` em
header incompleto. O RED adicionou a regressão; o GREEN passou a validar caps
de scan/header como inteiros seguros positivos em planner, parser e reader
antes de processar, preservando cap finito, framing bounded e
`git-object-unreadable`/`oversize-file`.

O foco passou `42/42`; a cobertura passou `205/1138/21` em
`95,03/90,95/95,31/95,73`, build `12/12`, `verify:hotspots` reporta `0`
hotspots e maior função de `98` linhas, contratos `87/87`, decisões `7/7`,
mutation `7/7`, migration safety, lint, typecheck, formato e diff-check
passaram. Cap finito de scan de `2 MiB` gerou finding redigido para objeto de
`9 MiB` sem batch e header finito de `128` bytes permaneceu válido. O
código/teste está em `3410d52`.

O gate `pnpm verify:secrets` permanece fail-closed nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem
alterado. A crítica desta rodada foi fresca, read-only e não independente; o
roadmap permanece `IN_PROGRESS / PILOT_BLOCKED` e não promove score, release,
clínica ou piloto.

## 36. Publicação do checkpoint de caps explícitos B99-101 — 2026-08-21T00:48:02-03:00

O código/teste `f79cce6` e a reconciliação documental `167c4c4` foram publicados
em `origin/agent/publish-production-hardening`; a checagem pós-push confirmou
`HEAD == origin` em `167c4c4`. Estado, backlog, evidência, log e traceability
estão alinhados. A publicação não promove score, release, clínica ou piloto e
não fecha os quatro findings locais de `.env.local`, secret manager/rotação,
provider/CI, RC/proveniência, runtime live, `0/145`, gates externos, aprovação
humana ou reauditoria independente. O roadmap permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## 35. Checkpoint de validação dos caps explícitos B99-101 — 2026-08-21T00:44:50-03:00

Uma auditoria read-only reproduziu que `runGitBatch` aceitava
`maxOutputBytes: Infinity`, `maxOutputBytes: NaN` e `maxErrorBytes: Infinity`,
permitindo alcançar o child apesar do contrato de memória bounded. O RED
adicionou a regressão; o GREEN passou a validar os dois caps como inteiros
seguros positivos dentro da Promise e antes do spawn, preservando defaults
finitos, `onChunk`, limites válidos e mensagens genéricas/redigidas.

O foco passou `41/41`; a cobertura passou `205/1137/21` em
`95,03/90,95/95,31/95,73`, build `12/12`, `verify:hotspots` reporta `0`
hotspots e maior função de `97` linhas, contratos `87/87`, decisões `7/7`,
mutation `7/7`, migration safety, lint, typecheck, formato e diff-check
passaram. Probes sintéticos rejeitaram os caps inválidos antes de `spawn` e
aceitaram cap finito de `64` bytes. O código/teste está em `f79cce6`.

O gate `pnpm verify:secrets` permanece fail-closed nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem
alterado. A crítica desta rodada foi fresca, read-only e não independente; o
roadmap permanece `IN_PROGRESS / PILOT_BLOCKED` e não promove score, release,
clínica ou piloto.

## 34. Publicação do checkpoint B99-101 — 2026-08-21T00:34:35-03:00

O código/teste `87717ed` e a reconciliação documental `717f1a9` foram publicados
em `origin/agent/publish-production-hardening`; a checagem pós-push confirmou
`HEAD == origin` em `717f1a9`. Estado, backlog, evidência, log e traceability
estão alinhados. A publicação não promove score, release, clínica ou piloto e
não fecha os quatro findings locais de `.env.local`, secret manager/rotação,
provider/CI, RC/proveniência, runtime live, `0/145`, gates externos, aprovação
humana ou reauditoria independente. O roadmap permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## 31. Checkpoint de fechamento da barra de funções B99-305 — 2026-08-20T22:25:53-03:00

Uma auditoria de fonte encontrou `createGitBatchStreamParser` com `104` linhas
em `scripts/secret-scanner-git-batch.mjs`, acima do critério explícito de zero
funções de produção acima de `100`; o ratchet anterior permitia `117`. O RED
adicionou uma regressão que fixa `maxLongestFunctionLines: 100` e rejeita
qualquer função acima da barra. O GREEN extraiu o consumo framed para
`consumeGitBatchChunk`, preservando framing Git, retenção bounded do objeto
corrente, redaction, overflow/truncamento e findings.

O foco hotspot passou `6/6`, scanner `39/39` e cobertura `205/1134/21` em
`95,02/90,95/95,31/95,71`; `verify:hotspots` reporta `0` hotspots e maior
função de `98` linhas. Decisões críticas `7/7`, mutation `7/7`, contratos
`86/86`, worker `51/51`, migrações `33/33`, migration safety, lint, typecheck,
formato, diff-check, CI contract e documentation passaram. O código/teste
está em `593619e` e a reconciliação documental foi publicada em `aebe16a`;
B99-305 fica concluído no escopo local da barra técnica.

O `pnpm verify` oficial chegou até `verify:secrets` e falhou fail-closed nos
quatro assignments redigidos preexistentes de `infra/production/.env.local`,
que não foi lido nem alterado. Secret manager/rotação, provider/CI,
RC/proveniência, WebKit aprovado, runtime live, clínica, `0/145`, gates
externos, aprovação humana e reauditoria independente continuam abertos. O
roadmap permanece `IN_PROGRESS / PILOT_BLOCKED` e não promove score, release
ou piloto.

## 30. Reconciliação B99-004 de paridade documental — 2026-08-20T21:54:57-03:00

No início desta reconciliação, `HEAD` e `origin/agent/publish-production-hardening`
estavam ambos em `2af57e6`. A auditoria pós-publicação anterior observou
`HEAD == origin` em `6ddc37b`; `2af57e6` é o pacote documental posterior que
registrou aquela observação. Estado, backlog, evidência, log e traceability
foram normalizados para não confundir o SHA observado com o pacote documental.

O log append-only não foi reordenado. A ordem canônica dos últimos eventos é
Round 45 (`21:25:32`) → Round 46 (`21:41:55`) → auditoria pós-publicação
(`21:47:42`) → esta reconciliação (`21:54:57`). B99-004 está concluído no
escopo documental local; o roadmap segue `IN_PROGRESS / PILOT_BLOCKED` e não
fecha nenhum gate externo, humano, clínico, de RC ou de release.

## 29. Auditoria pós-publicação do Dual99 local — 2026-08-20T21:47:42-03:00

No momento da execução, após a publicação do Round 46, `HEAD == origin` em
`6ddc37b`; o pacote documental que registrou a auditoria foi publicado depois
em `2af57e6`. O foco passou `39/39` e hotspots permaneceu `0`. A auditoria de
fonte confirmou caps finitos em todos os callsites de produção; o único
override `Infinity` restante exige violação deliberada da API interna e não é
usado pela composição do scanner.

Não há novo gap local de produção justificável. O roadmap segue
`IN_PROGRESS / PILOT_BLOCKED`, condicionado a secret manager/rotação,
provider/CI, RC/proveniência, runtime live, WebKit aprovado, clínica, `0/145`,
gates externos, aprovação humana e reauditoria independente.

## 28. Checkpoint de default stdout finito do batch Git — 2026-08-20T21:41:55-03:00

B99-101 recebeu uma auditoria read-only fresca sobre o fallback residual do
Round 45: embora os callsites de produção passassem caps, `runGitBatch`
mantinha `maxOutputBytes = Infinity` para chamadores genéricos e podia
acumular stdout em `chunks`. O RED adicionou subprocesso sintético acima do
default; o GREEN adotou cap finito de `8 MiB`, falhando antes de materializar o
chunk excedente e preservando limites explícitos preflightados.

Foco `39/39`, cobertura `205/1133/21` em `95,02/90,95/95,31/95,71`, scanner
`774`, helper `415`, hotspots `0`, lint/typecheck/formato/diff-check e todos
os gates oficiais até migration safety passaram. `verify:secrets` permanece
fail-closed somente nos quatro assignments redigidos preexistentes de
`infra/production/.env.local`, não lidos nem alterados. Código está em
`a6d7ce3`; a evidência documental foi publicada em `630509f`.

Secret manager/rotação, provider/CI, RC/proveniência, runtime live, WebKit
aprovado, clínica, `0/145`, gates externos e reauditoria independente seguem
abertos. F99-1 continua `IN_PROGRESS` e o produto `PILOT_BLOCKED`.

## 27. Checkpoint de stderr bounded do batch Git — 2026-08-20T21:25:32-03:00

B99-101 recebeu uma auditoria read-only fresca sobre o canal residual do
Round 44: `runGitBatch` já transmitia stdout por chunks, mas ainda acumulava
stderr e usava o texto bruto em processos Git não-zero. O RED cobriu um
subprocesso sintético ruidoso e uma falha Git normal. O GREEN passou a limitar
stderr independentemente a `4 KiB`, encerrar overflow e emitir mensagens
genéricas redigidas, sem manter o conteúdo original.

Foco `38/38`, cobertura `205/1132/21` em `95,02/90,95/95,31/95,71`, scanner
`774`, helper `414`, hotspots `0`, lint/typecheck/formato/diff-check e todos
os gates oficiais até migration safety passaram. `verify:secrets` permanece
fail-closed somente nos quatro assignments redigidos preexistentes de
`infra/production/.env.local`, não lidos nem alterados. Código está em
`208868b`; a evidência documental foi publicada em `1685e63`.

Secret manager/rotação, provider/CI, RC/proveniência, runtime live, WebKit
aprovado, clínica, `0/145`, gates externos e reauditoria independente seguem
abertos. F99-1 continua `IN_PROGRESS` e o produto `PILOT_BLOCKED`.

## 26. Checkpoint de consumo incremental do batch Git — 2026-08-20T20:55:39-03:00

B99-101 recebeu uma auditoria read-only fresca sobre o limite residual do
Round 43: apesar do cap por batch, `runGitBatch` ainda retinha todos os chunks
e concatenava stdout antes do parse. O RED cobriu callback de chunks, header
malformado e corpo truncado sem exposição de marcadores sintéticos. O GREEN
passou a consumir stdout incrementalmente, fazer framing entre chunks e reter
somente o corpo bounded corrente; oversized são descartados durante o consumo.

Fixture Git descartável com cinco blobs distintos de aproximadamente 1,8 MiB
preservou cinco findings através de múltiplos chunks e duas batches. Foco
`36/36`, cobertura `205/1130/21` em `95,02/90,95/95,31/95,71`, scanner `774`,
helper `397`, hotspots `0`, lint/typecheck/formato/diff-check e todos os gates
oficiais até migration safety passaram. `verify:secrets` permanece fail-closed
somente nos quatro assignments redigidos preexistentes de
`infra/production/.env.local`, não lidos nem alterados. O código está em
`11a6d10`; a evidência documental foi publicada em `0b393d5`.

O parser mantém um único corpo bounded por vez para permitir scan textual
limitado; isso não fecha secret manager/rotação, provider/CI, RC/proveniência,
runtime live, WebKit aprovado, clínica, `0/145`, gates externos ou reauditoria
independente. F99-1 continua `IN_PROGRESS` e o produto `PILOT_BLOCKED`.

## 25. Checkpoint de limite agregado do batch Git — 2026-08-20T20:13:49-03:00

B99-101 recebeu uma auditoria read-only fresca que identificou um segundo
limite de recurso: após o preflight, todos os blobs bounded ainda eram
enviados para uma única chamada e concatenados em memória. O RED falhou nos
contratos de particionamento e cap. O GREEN passou a agrupar corpos em batches
de até `8 MiB`, limitar stdout pelo tamanho preflightado e emitir
`git-object-unreadable` redigido em overflow; a orquestração foi extraída para
o helper Git e o scanner principal ficou em `774` linhas.

Uma fixture Git descartável com cinco blobs distintos de aproximadamente 1,8
MiB encontrou os cinco findings através de duas batches, e o teste de cap
rejeitou output acima do limite sem expor bytes. O foco passou `34/34`, a
cobertura `205/1128/21` em `95,02/90,95/95,31/95,71`, o helper ficou em `213`
linhas e hotspots em `0`. O código/teste está em `b15f171`; o `pnpm verify`
oficial passou até `verify:migration-safety` e parou em `verify:secrets` somente
nos quatro assignments redigidos preexistentes de `.env.local`.

O avanço permanece local: streaming integral sem buffers, secret
manager/rotação, provider/CI, RC/proveniência, runtime live, clínica, `0/145`,
gates externos e reauditoria independente continuam abertos. F99-1 permanece
`IN_PROGRESS` e o produto `PILOT_BLOCKED`. A evidência documental foi publicada
em `1572192`.

## 24. Checkpoint de preflight de corpos históricos — 2026-08-20T19:48:27-03:00

B99-101 recebeu uma auditoria read-only fresca que identificou materialização
desnecessária: `readGitBlobs` requisitava todos os objetos com
`git cat-file --batch` e concatenava corpos históricos antes de descartar
assets oversized. O RED falhou ao exigir um plano de requisições baseado em
`git cat-file --batch-check`; o GREEN passou a validar framing, identidade,
tipo e tamanho, omitir corpos oversized de assets e emitir `oversize-file`
redigido para paths não-asset.

Uma fixture Git descartável confirmou que texto UTF-8 limitado sob `text.png`
continua encontrando findings, enquanto um asset binário sintético acima de
2 MiB não é materializado nem produz finding. O foco passou `31/31`, a
cobertura `205/1125/21` em `95,02/90,95/95,31/95,71`, o scanner ficou em `785`
linhas, o helper em `108` e hotspots em `0`. O código/teste está em
`69e5ff3`; o `pnpm verify` oficial passou até `verify:migration-safety` e
parou em `verify:secrets` somente nos quatro assignments redigidos
preexistentes de `.env.local`.

O avanço permanece local: secret manager/rotação, limite agregado de corpos
bounded, provider/CI, RC/proveniência, runtime live, clínica, `0/145`, gates
externos e reauditoria independente continuam abertos. F99-1 permanece
`IN_PROGRESS` e o produto `PILOT_BLOCKED`. A evidência documental foi publicada
em `67b7b40`.

## 23. Checkpoint de conteúdo sob extensão binária — 2026-08-20T19:25:00-03:00

B99-101 recebeu uma auditoria read-only fresca. A hipótese de vazamento em
detalhes de respostas `error` válidas foi rejeitada: a evidência já é
redigida. A prova seguinte reproduziu falso scan limpo quando conteúdo textual
secret-shaped recebia os nomes exatos `worktree.png`, `staged.png` e
`history.png`; a enumeração por extensão descartava os três caminhos.

O RED falhou com o teste sintético das três superfícies. O GREEN passou a
enumerar todos os arquivos regulares, paths staged e paths do inventário
`git rev-list`; conteúdo UTF-8 limitado sob extensão de asset é escaneado,
enquanto bytes binários/oversize de assets não são tratados como texto nem
copiados para findings. Paths não-asset continuam fail-closed como
`binary-file`/`oversize-file`. O foco passou `30/30`, cobertura `205/1124/21`
em `95,02/90,95/95,31/95,71`, scanner em `776` linhas e hotspots `0`.

Código/teste estão em `de8cbdd` e a evidência documental foi publicada em
`4a9d315`. O `pnpm verify` oficial percorreu todos os gates até
`verify:secrets`, que continua fail-closed somente nos quatro
valores redigidos preexistentes de `infra/production/.env.local`, que não foi
lido nem alterado. B99-101 segue `IN_PROGRESS`; secret manager/rotação,
RC/proveniência, runtime, clínica, `0/145`, gates externos, aprovação humana e
reauditoria continuam abertos. F99-1 permanece `IN_PROGRESS` /
`PILOT_BLOCKED`.

## 22. Checkpoint de identidade de token malformado cat-file — 2026-08-20T19:01:02-03:00

B99-101 recebeu RED/GREEN para impedir que o primeiro token não confiável de
um header malformado com newline contamine o path ou o resumo de um finding.
O RED reproduziu marcador sintético no path; o GREEN aceita somente path
conhecido ou object ID de 40 hex e usa `history:<git>` para qualquer outro
token, emitindo `git-object-unreadable` sem copiar/scanear/expor a entrada.

O foco passou `29/29`, a cobertura passou `205/1123/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `793` linhas e
`verify:hotspots` reportou `0`; lint, typecheck, formato, audit, contratos,
worker, migrações, migration safety, decisões, mutation e diff-check passaram.
Código/teste estão em `87f759a`; a evidência documental foi publicada em
`9cc102a`. O `pnpm verify` parou em `verify:secrets` somente nos quatro
valores redigidos preexistentes de `infra/production/.env.local`; B99-101 segue
`IN_PROGRESS` e o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## 21. Checkpoint de redaction de header truncado cat-file — 2026-08-20T18:50:39-03:00

B99-101 recebeu RED/GREEN para impedir que bytes não confiáveis de um header
`git cat-file --batch` sem newline contaminem o path ou o resumo de um finding.
O RED reproduziu que o parser convertia o buffer restante inteiro em
`objectId`, incluindo marcador sintético de corpo. O GREEN emite
`history:<git>` com `git-object-unreadable`, sem copiar/scanear/expor o buffer;
headers válidos e o framing já coberto permanecem preservados.

O foco passou `28/28`, a cobertura passou `205/1122/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `791` linhas e
`verify:hotspots` reportou `0`; lint, typecheck, formato, audit, contratos,
worker, migrações, migration safety, decisões, mutation e diff-check passaram.
Código/teste estão em `b528ff4`; a evidência documental foi publicada em
`3520f85`. O `pnpm verify` parou em `verify:secrets` somente nos quatro
valores redigidos preexistentes de `infra/production/.env.local`; B99-101 segue
`IN_PROGRESS` e o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## 20. Checkpoint de identidade da resposta cat-file — 2026-08-20T18:36:22-03:00

B99-101 recebeu RED/GREEN para vincular a identidade das respostas de
`git cat-file --batch` ao mapa de objetos efetivamente solicitado. O RED
reproduziu falso scan limpo quando uma resposta `blob` válida carregava um
object ID inesperado: sem path associado, seu corpo sensível era ignorado. O
GREEN valida a presença do ID no mapa antes de consumir/scanear o corpo, emite
`git-object-unreadable`, encerra o lote inesperado e não expõe o valor;
respostas solicitadas, framing estrutural e `missing/error` permanecem válidos.

O foco passou `27/27`, a cobertura passou `205/1121/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `798` linhas e
`verify:hotspots` reportou `0`; lint, typecheck, formato, audit, contratos,
worker, migrações, migration safety, decisões, mutation e diff-check passaram.
Código/teste estão em `adc2b85`; a evidência documental foi publicada em
`66cf8bb`. O `pnpm verify` parou em `verify:secrets` somente nos quatro
valores redigidos preexistentes de `infra/production/.env.local`; B99-101 segue
`IN_PROGRESS` e o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## 19. Checkpoint de path whitespace no rev-list do scanner — 2026-08-20T18:21:57-03:00

B99-101 recebeu RED/GREEN para preservar o path exato produzido por
`git rev-list --objects --all`. O RED reproduziu falso scan limpo quando um
arquivo textual `secret.png ` era aparado para `secret.png` e ignorado como
asset binário. O GREEN mantém os bytes do trecho após o separador, trata só a
linha vazia de árvore como marcador estrutural e encontra
`history:secret.png ` sem expor o valor sintético.

O foco passou `26/26`, a cobertura passou `205/1120/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `793` linhas e
`verify:hotspots` reportou `0`; lint, typecheck, formato, audit, contratos,
worker, migrações, migration safety, decisões, mutation e diff-check passaram.
O `pnpm verify` parou em `verify:secrets` somente nos quatro valores redigidos
preexistentes de `infra/production/.env.local`, que não foi lido nem alterado.
Código/teste estão em `53b96d8` e a evidência foi publicada em `1c2a68e`.
B99-101 segue `IN_PROGRESS` e o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## 18. Checkpoint de integridade cat-file batch do scanner — 2026-08-20T18:09:25-03:00

B99-101 recebeu RED/GREEN para o header estrutural de `git cat-file --batch`.
O RED reproduziu aceitação de object ID não hexadecimal, campo extra e tamanho
`+N`, seguida de scan do corpo. O GREEN valida ID de 40 hex, tipo permitido e
tamanho decimal antes de consumir o corpo; `missing/error` permanecem válidos,
enquanto header inválido emite `git-object-unreadable`, encerra o lote e não
expõe o valor sintético.

O foco passou `25/25`, a cobertura passou `205/1119/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `793` linhas e
`verify:hotspots` reportou `0`; lint, typecheck, formato, audit, contratos,
worker, migrações, migration safety, decisões, mutation e diff-check passaram.
O `pnpm verify` parou em `verify:secrets` somente nos quatro valores redigidos
preexistentes de `infra/production/.env.local`, que não foi lido nem alterado.
Código/teste estão em `0b29af6` e a evidência foi publicada em `adfacbc`.
B99-101 segue `IN_PROGRESS` e o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## 17. Checkpoint de staged path whitespace do scanner — 2026-08-20T17:44:10-03:00

B99-101 recebeu RED/GREEN para a identidade exata dos paths staged. O RED
reproduziu falso scan limpo quando `.trim()` transformava ` .env.local ` em
`.env.local` e colidia com um path aparado não sensível. O GREEN preserva os
bytes de cada path retornado por `git ls-files -z`, consulta o índice com
`git show :<path>` e detecta o finding staged com whitespace de borda sem
expor o valor sintético.

O foco passou `23/23`, a cobertura passou `205/1117/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `799` linhas e
`verify:hotspots` reportou `0`; lint, typecheck, formato, audit, contratos,
worker, migrações, migration safety, decisões, mutation e diff-check passaram.
O `pnpm verify` parou em `verify:secrets` somente nos quatro valores redigidos
preexistentes de `infra/production/.env.local`, que não foi lido nem alterado.
Código/teste estão em `4605371` e a evidência foi publicada em `5604793`.
B99-101 segue `IN_PROGRESS` e o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## 16. Checkpoint de framing rev-list do scanner — 2026-08-20T17:33:16-03:00

B99-101 recebeu RED/GREEN para o inventário produzido por
`git rev-list --objects --all`. O RED reproduziu uma linha malformada sendo
silenciosamente ignorada, o que poderia remover um objeto do histórico e
produzir falso PASS. O GREEN valida cada linha não vazia, aceita IDs bare de 40
hex para estrutura e IDs seguidos de path para conteúdo, preserva paths binários
ignorados e falha fechado para registros inválidos; `scanProject` converte a
falha em `git-object-unreadable` de histórico.

O foco passou `22/22`, a cobertura passou `205/1116/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `800` linhas e
`verify:hotspots` reportou `0`; lint, typecheck, formato, audit, contratos,
worker, migrações, migration safety, decisões, mutation e diff-check passaram.
Código/teste estão em `b2f2cc0` e a evidência foi publicada em `3b35169`. O
`pnpm verify` parou em `verify:secrets`
somente nos quatro valores redigidos preexistentes de
`infra/production/.env.local`; B99-101 segue `IN_PROGRESS` e o programa
permanece `IN_PROGRESS / PILOT_BLOCKED`.

## 15. Checkpoint de framing blob/tag do scanner — 2026-08-20T17:20:12-03:00

B99-101 recebeu RED/GREEN para o framing de objetos de conteúdo do histórico
Git. O RED reproduziu falso scan limpo em `blob` e `tag` com tamanho completo,
mas sem o delimitador final `\n`; o parser anterior escaneava o corpo e emitia
somente `sensitive-assignment`. O GREEN exige corpo completo e delimitador,
emite `git-object-unreadable` e encerra o lote inválido sem escanear ou expor o
corpo, preservando registros válidos.

O foco passou `21/21`, a cobertura passou `205/1115/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `800` linhas e
`verify:hotspots` reportou `0`; lint, typecheck, formato, audit, contratos,
worker, migrações, migration safety, decisões, mutation e diff-check passaram.
Código/teste estão em `1adef42` e a evidência foi publicada em `b114236`. O
`pnpm verify` parou em `verify:secrets`
somente nos quatro valores redigidos preexistentes de
`infra/production/.env.local`; B99-101 segue `IN_PROGRESS` e o programa
permanece `IN_PROGRESS / PILOT_BLOCKED`.

## 14. Checkpoint de symlink do scanner — 2026-08-20T17:07:01-03:00

B99-101 recebeu uma segunda redução local sob RED/GREEN. O RED reproduziu
falso scan limpo para um symlink `linked.env` apontando para arquivo sensível
fora da raiz. O GREEN enumera symlinks sem segui-los, usa `lstat` e emite
`unreadable-file` sem ler/expor o alvo. O foco passou `19/19`, a cobertura
passou `205/1113/21` em `95,02/90,95/95,31/95,71`, o scanner ficou em `799`
linhas e `verify:hotspots` reportou `0`; lint, typecheck, formato, audit e
diff-check passaram. Código/teste estão em `2bf5a45` e a evidência foi publicada
em `c43034b`.

O `pnpm verify` parou em `verify:secrets` somente nos quatro valores redigidos
preexistentes de `infra/production/.env.local`. B99-101 segue `IN_PROGRESS`;
secret manager/rotação, RC/proveniência, runtime, clínica, `0/145`, gates
externos, aprovação humana e reauditoria permanecem abertos. F99-1 segue
`IN_PROGRESS`/`PILOT_BLOCKED`.
