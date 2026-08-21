# BACKLOG MASTER — CVG

Backlog operacional vivo. Itens só podem avançar quando suas dependências e gates estiverem satisfeitos.

**Auditoria Dual99 — 2026-08-21T12:19:51-03:00 — U98-106 worker crash cleanup:**
uma inspeção independente read-only reproduziu que `runWorkerLoop` fechava
`health`, mas não `integrations`, quando initialize/processOnce lançava. RED
falhou nos dois caminhos; GREEN fecha ambos com `Promise.allSettled` e preserva
o erro original. Foco worker `54/54`; cobertura `205/1177/21` em
`95,04/90,95/95,32/95,74`; build `12/12`; hotspots `0`; typecheck, lint,
formato, exposure e diff-check passaram. Código/teste `357f265` está publicado
com `HEAD == origin`; evidência:
`docs/144_dual_99_u98_106_worker_cleanup_evidence_2026-08-21.md`.

**Disposição:** U98-106 segue `READY_FOR_NEXT_STEP` localmente e o programa
`IN_PROGRESS / PILOT_BLOCKED`. Qdrant com falha entre writes, replay de IA sem
contrato de idempotência, PostgreSQL live, RLS, RC, runtime, score, release,
clínica, `0/145`, gates externos, aprovação humana e reauditoria independente
permanecem abertos. O explorador independente encontrou os gaps, mas não há
`PASS` independente final.

**Auditoria Dual99 — 2026-08-21T12:10:51-03:00 — B99-201 worker persistence:**
uma inspeção independente read-only reproduziu que exceções de `markFailed`
interrompiam o lote e que exceções de `markProcessed` eram tratadas como falha
do handler. RED falhou nos dois cenários; GREEN separa handler, ACK e registro
de retry, preservando telemetria/cleanup e sem repetir o ACK. Foco worker
`53/53`, outbox `10/10`; cobertura `205/1176/21` em
`95,04/90,95/95,32/95,74`; build `12/12`; hotspots `0`; typecheck, lint,
formato, exposure e diff-check passaram. Código/teste `8bcbe58` está publicado
com `HEAD == origin`; evidência: `docs/143_dual_99_b99_201_worker_persistence_failure_evidence_2026-08-21.md`.

**Disposição:** B99-201 continua `READY_FOR_NEXT_STEP` localmente e o programa
`IN_PROGRESS / PILOT_BLOCKED`. PostgreSQL live com role restrita, concorrência,
RLS/permissões, RC, score, release, clínica, `0/145`, gates externos,
aprovação humana e reauditoria independente permanecem abertos. `pnpm
verify:secrets` segue fail-closed somente nos quatro assignments redigidos
preexistentes de `infra/production/.env.local`. O explorador independente
encontrou o gap corrigido, mas não há `PASS` independente final.

**Auditoria Dual99 — 2026-08-21T11:54:12-03:00 — B99-201:** uma revisão
read-only reproduziu que o ACK do outbox preservava `last_error_code` depois de
uma falha transitória. RED focal falhou no contrato SQL; GREEN limpa o marcador
quando `markProcessed` grava `PROCESSED`. O foco worker/persistência passou
`24/24`; cobertura `205/1174/21` em `95,03/90,95/95,31/95,73`; build `12/12`,
hotspots `0`, format/lint/typecheck/exposure/diff-check passaram. Código/teste
`0e0e2c8` está publicado com `HEAD == origin`; evidência:
`docs/142_dual_99_b99_201_outbox_ack_state_evidence_2026-08-21.md`.
`pnpm verify:secrets` permanece fail-closed somente nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`.

**Disposição:** B99-201 continua `READY_FOR_NEXT_STEP` localmente e o programa
`IN_PROGRESS / PILOT_BLOCKED`. PostgreSQL live com role restrita, concorrência,
RLS/permissões, RC, score, release, clínica, `0/145`, gates externos,
aprovação humana e reauditoria independente permanecem abertos. A crítica
independente expirou sem relatório; não há `PASS` independente.

**Auditoria Dual99 — 2026-08-21T11:27:43-03:00:** Rounds 88–89 fecharam
dois gaps adicionais de B99-101 sob RED→GREEN→REFACTOR: duplicidade de
object IDs no inventário `git rev-list` e framing terminal/sem registros vazios
no output textual. O parser foi extraído para o módulo de superfícies Git;
foco `77/77`, cobertura `1173/1194` em `95,03/90,95/95,31/95,73`, build
`12/12`, hotspots `0`, scanner em `779` linhas e format/lint/typecheck/
diff-check passaram. Código/teste `1fec40a` está publicado com `HEAD == origin`.
Evidência atualizada: `docs/141_dual_99_b99_101_growth_and_batch_completeness_evidence_2026-08-21.md`.
`pnpm verify:secrets` permanece fail-closed somente nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`.

**Disposição:** `IN_PROGRESS / PILOT_BLOCKED`. A primeira crítica focal foi
`BLOCKED` por uma limitação de evidência que foi corrigida; a tentativa
integrada final não devolveu veredito e não há aprovação independente final.
Secret manager/rotação, provider/CI, RC/proveniência, WebKit, runtime live,
clínica, `0/145`, gates externos, aprovação humana e reauditoria independente
continuam abertos. Não promover score, release ou piloto.

**Auditoria Dual99 — 2026-08-21T11:03:36-03:00:** Rounds 81–87 fecharam
sete gaps locais de B99-101 sob RED→GREEN→REFACTOR: URI sintética exata,
framing NUL staged, identidade bijetiva de objetos Git, arquivos especiais
com descriptor regular não bloqueante, registros staged vazios, crescimento
pós-`lstat` e completude de respostas Git.
O foco passou `76/76`; cobertura `1172/1193` em
`95,03/90,95/95,31/95,73`; build `12/12`; hotspots `0` com
`scripts/secret-scanner.mjs` em `793` linhas; format/lint/typecheck/diff-check
passaram. Commits `4fdf2b5`, `650b169`, `fb19a43`, `25233b6`, `dfbb01c`,
`7c70686`, `084e2d0`, `5790ce8` e `87ca28d` estão publicados, com
`HEAD == origin`.
`pnpm verify:secrets` permanece fail-closed somente nos quatro assignments
redigidos preexistentes de `infra/production/.env.local`. Evidência:
`docs/141_dual_99_b99_101_growth_and_batch_completeness_evidence_2026-08-21.md`.
Estado, backlog, roadmap, evidência, log e traceability foram reconciliados
após o commit de código/teste `87ca28d`; a publicação documental desta rodada
acompanha esta reconciliação.

**Disposição:** `IN_PROGRESS / PILOT_BLOCKED`. A crítica independente que
reproduziu os gaps foi `REJECT` antes das correções; a tentativa final não
devolveu veredito e foi encerrada, portanto não há aprovação independente
final. Secret manager/rotação, provider/CI, RC/proveniência, WebKit, runtime
live, clínica, `0/145`, gates externos, aprovação humana e reauditoria
independente continuam abertos. Não promover score, release ou piloto.

**Auditoria Dual99 pós-publicação — 2026-08-21T08:45:45-03:00:** `HEAD == origin`
foi confirmado em `ad9f026`; a reaudição read-only repetiu `65/65` no scanner,
confirmou zero truncamento por `&`/`#`, hotspots `0`, scanner em `799` linhas,
`git diff --check` limpo e worktree rastreado limpo. `pnpm verify:secrets`
permanece fail-closed somente nos quatro assignments redigidos preexistentes
de `infra/production/.env.local`; não houve finding novo. O estado global segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Próxima ação Dual99 — 2026-08-21T08:45:45-03:00:** obter autoridade/ambiente
para secret manager/rotação, provider/CI, RC/runtime, WebKit, clínica, `0/145`,
gates externos, aprovação humana e reauditoria independente; não promover
score, release ou piloto.

**Atualização Dual99 — 2026-08-21T08:34:48-03:00 — B99-101 placeholder suffix:**
auditoria/RED reproduziu o bypass em que `isSyntheticPlaceholder` truncava
`&`/`#` e escondia sufixos potencialmente secretos. GREEN exige correspondência
exata e preserva somente `&form=1`/`&locale=pt-BR` para URLs sintéticos
conhecidos. Foco `65/65`, cobertura `205/1161/21` em
`95,03/90,95/95,31/95,73`, build `12/12`, hotspots `0`, lint/typecheck/formato
passaram; `verify:secrets` acusa apenas os quatro assignments redigidos
preexistentes de `infra/production/.env.local`. Código/teste `2c0a35f` foi
publicado. Evidência: `docs/139_dual_99_b99_101_placeholder_boundary_evidence_2026-08-21.md`.
Estado global: `IN_PROGRESS / PILOT_BLOCKED`; gates externos, humanos e live
continuam pendentes.

**Auditoria Dual99 — 2026-08-21T08:07:39-03:00 — pós-Round 70:** auditoria read-only revisou worktree (`64 MiB`, `4096` entradas, `256` níveis), metadata Git (`1024` entradas por diretório), `rev-list`/listagem staged, `cat-file --batch-check`, batches de corpo (`8 MiB`/`256 MiB`) e staged `git show` (`2 MiB + 1`/`256 MiB`). `scripts/secret-scanner.mjs` está em `799` linhas, hotspots `0`, `HEAD == origin == bb14a4a`, diff-check limpo e nenhum novo gap local bounded justificável foi encontrado. A documentação inicial desta auditoria `4f49248` foi publicada; a reconciliação final não altera código ou estado externo. A disposição permanece `IN_PROGRESS / PILOT_BLOCKED`.

**Próxima ação Dual99 — 2026-08-21T08:07:39-03:00:** obter autoridade/ambiente para secret manager/rotação, provider/CI, RC/runtime, WebKit, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente; não promover score, release ou piloto.

**Atualização Dual99 local — 2026-08-21T07:59:41-03:00 — B99-101 staged oversized byte budget:** a auditoria read-only encontrou que arquivos staged maiores que o cap por arquivo faziam `git show` abortar depois de tentar `MAX_SCAN_BYTES + 1`, mas o catch emitia um finding por caminho sem descontar esses bytes do orçamento agregado. RED com `129 × (2 MiB + 2)` (`270532866` bytes) produziu `129` findings `staged:*` sem fallback `staged:<git>`; GREEN desconta `MAX_SCAN_BYTES + 1` em cada output-cap abortado e falha fechado ao esgotar `256 MiB`. Foco `64/64`, cobertura `205/1160/21` em `95,03/90,95/95,31/95,73`, build `12/12` com `CVG_API_INTERNAL_URL` local efêmero, CI contract, arquitetura `2/2`, hotspots `0` com maior função de `100`, lint, typecheck, formato, diff-check e audit passaram. Código/teste `c4a0cc9` e a documentação inicial `5ec5a63` foram publicados; `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T07:59:41-03:00 — B99-101 staged oversized byte budget:** o commit de código/teste `c4a0cc9` e a reconciliação documental inicial `5ec5a63` foram enviados a `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `5ec5a63`. A reconciliação final não altera código ou estado externo. `.gauntlet/` continua local e não rastreado; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T07:35:15-03:00 — B99-101 Git aggregate byte budget:** a auditoria read-only encontrou que `staged` lia até `2 MiB` por caminho e `history` processava batches de `8 MiB` sem limite agregado. RED com `33 × 2 MiB` (`69206016` bytes) reproduziu a ausência do finding genérico; GREEN limita cada superfície Git a `256 MiB`, decrementa staged durante a leitura e pré-valida history antes de materializar blobs. A regressão final usa `129 × 2 MiB` (`270532608` bytes) e retorna um finding genérico em staged e history. Foco `63/63`, cobertura `205/1159/21` em `95,03/90,95/95,31/95,73`, build `12/12` com `CVG_API_INTERNAL_URL` local efêmero, CI contract, arquitetura `2/2`, hotspots `0` com maior função de `100`, lint, typecheck, formato, diff-check e audit passaram. Código/teste `48e1014` e a documentação inicial `abb1657` foram publicados; `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T07:35:15-03:00 — B99-101 Git aggregate byte budget:** o commit de código/teste `48e1014` e a reconciliação documental inicial `abb1657` foram enviados a `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `abb1657`. A reconciliação final não altera código ou estado externo. `.gauntlet/` continua local e não rastreado; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T06:49:40-03:00 — B99-101 workspace total byte budget:** a auditoria read-only encontrou `65` arquivos sintéticos de `1 MiB`, totalizando `68157440` bytes, que atravessavam os limites anteriores e retornavam `65` findings. RED reproduziu a ausência do finding genérico; GREEN propaga um orçamento global imutável de `64 MiB`, reserva o tamanho declarado antes da leitura e falha fechado com `<workspace> / unreadable-file` em overflow, descartando findings parciais. Foco `62/62`, cobertura `205/1158/21` em `95,03/90,95/95,31/95,73`, build `12/12` com `CVG_API_INTERNAL_URL` local efêmero, CI contract, arquitetura `2/2`, hotspots `0` com maior função de `100`, lint, typecheck, formato, diff-check e audit passaram. Probe pós-fix produziu um único finding genérico. Código/teste `938bc41` e a documentação inicial `0b5ea42` foram publicados; `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T06:49:40-03:00 — B99-101 workspace total byte budget:** o commit de código/teste `938bc41` e a reconciliação documental inicial `0b5ea42` foram enviados a `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `0b5ea42`. A reconciliação final não altera código ou estado externo. `.gauntlet/` continua local e não rastreado; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T05:52:50-03:00 — B99-101 workspace recursion depth budget:** a auditoria read-only encontrou que uma árvore sintética com `300` níveis atravessava a recursão sem finding genérico. RED reproduziu a ausência; GREEN propaga a profundidade e falha fechado ao exceder `256` níveis, retornando `<workspace> / unreadable-file` sem findings parciais. Foco `61/61`, cobertura `205/1157/21` em `95,03/90,95/95,31/95,73`, build `12/12` com `CVG_API_INTERNAL_URL` local efêmero, CI contract, arquitetura `2/2`, hotspots `0` com maior função de `100`, lint, typecheck, formato, diff-check e audit passaram. Probe pós-fix em profundidade `300` produziu um único finding genérico. Código/teste `232ee11` e a documentação inicial `8fc9f0b` foram publicados; `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T05:52:50-03:00 — B99-101 workspace recursion depth budget:** o commit de código/teste `232ee11` e a reconciliação documental inicial `8fc9f0b` foram enviados a `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `8fc9f0b`. A reconciliação final não altera código ou estado externo. `.gauntlet/` continua local e não rastreado; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T05:39:56-03:00 — B99-101 workspace total entry budget:** a auditoria read-only encontrou que o cap de `1024` por diretório permitia atravessar uma árvore sintética distribuída com `2048` diretórios e `2048` arquivos. RED reproduziu a ausência do finding genérico; GREEN propaga um orçamento global imutável de `4096` entradas pela recursão e falha fechado com `<workspace> / unreadable-file` em overflow, descartando findings parciais. Foco `60/60`, cobertura `205/1156/21` em `95,03/90,95/95,31/95,73`, build `12/12` com `CVG_API_INTERNAL_URL` local efêmero, CI contract, arquitetura `2/2`, hotspots `0` com maior função de `100`, lint, typecheck, formato, diff-check e audit passaram. Probe pós-fix distribuído produziu um único finding genérico. Código/teste `e59d88c` e a documentação inicial `4ba2a70` foram publicados; a reconciliação final não altera código ou estado externo. `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T05:39:56-03:00 — B99-101 workspace total entry budget:** o código/teste `e59d88c` e a reconciliação documental inicial `4ba2a70` foram publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `4ba2a70`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T05:24:48-03:00 — B99-101 workspace entry budget:** a auditoria read-only encontrou que `openWorkspaceDirectory` materializava `2000` arquivos sintéticos do worktree por usar `readdir` sem orçamento. RED reproduziu a ausência do finding genérico; GREEN separa abertura no-follow da enumeração, lê incrementalmente com limite de `1024` entradas por diretório e falha fechado com `<workspace> / unreadable-file` em overflow. Foco `59/59`, cobertura `205/1155/21` em `95,03/90,95/95,31/95,73`, build `12/12` com `CVG_API_INTERNAL_URL` local efêmero, CI contract, arquitetura `2/2`, hotspots `0` com maior função de `100`, lint, typecheck, formato, diff-check e audit passaram. Probe pós-fix com `2000` arquivos produziu `workspaceEntriesStatus=unavailable`, `materializedWorkspaceEntries=0` e finding genérico. Código/teste `3deee2b` e a documentação inicial `3900713` foram publicados; a reconciliação final não altera código ou estado externo. `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T05:24:48-03:00 — B99-101 workspace entry budget:** o código/teste `3deee2b` e a reconciliação documental inicial `3900713` foram publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `3900713`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T05:11:16-03:00 — B99-101 Git metadata entry budget:** a auditoria read-only encontrou que o snapshot de metadata Git materializava `2000` entradas sintéticas em `.git/objects/info` por usar enumeração sem orçamento. RED reproduziu a ausência do finding genérico; GREEN separa abertura no-follow da enumeração, lê incrementalmente com limite de `1024` entradas e falha fechado em overflow, symlink ou `alternates`. Foco `58/58`, cobertura `205/1154/21` em `95,03/90,95/95,31/95,73`, build `12/12` com `CVG_API_INTERNAL_URL` local efêmero, CI contract, arquitetura `2/2`, hotspots `0` com maior função de `100`, lint, typecheck, formato, diff-check e audit passaram. Probe pós-fix com `2000` entradas produziu `gitObjectsStatus=unavailable`, `materializedSnapshotEntries=0` e finding genérico. Código/teste `ace0054` e a documentação inicial `f63547e` foram publicados; a reconciliação final não altera código ou estado externo. `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T05:11:16-03:00 — B99-101 Git metadata entry budget:** o código/teste `ace0054` e a reconciliação documental inicial `f63547e` foram publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `f63547e`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T04:54:57-03:00 — B99-101 Git metadata race boundary:** a auditoria read-only reproduziu leak de `history:victim.env` quando `objects/info/alternates` era criado/removido entre a validação e o uso; o RED focal acumulou `12` findings em `1000` tentativas. GREEN registra snapshot estrutural/`stat` de `objects`, `info` e `pack`, valida depois de cada comando/batch e descarta output quando a metadata muda. Foco `57/57`, cobertura `205/1153/21` em `95,03/90,95/95,31/95,73`, build `12/12`, CI contract, arquitetura `2/2`, hotspots `0`, lint, typecheck, formato, diff-check e audit passaram. Código/teste `50f22c7` foi publicado; `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Probe pós-fix `1000/1000` sem leak; Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T04:54:57-03:00 — B99-101 Git metadata race boundary:** o commit técnico `50f22c7` e a reconciliação documental `31ce669` foram publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `31ce669`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T04:26:53-03:00 — B99-101 Git internal metadata boundary:** a auditoria read-only reproduziu `staged:victim.env` externo por symlinks em `.git/index`/`.git/objects` e `history:victim.env` por `objects/info/alternates`. O RED focal falhou com os mesmos achados. GREEN passou a abrir `index` e `objects` no-follow, manter handles em fd 4/5, rejeitar symlinks em `objects`, `info` e `pack`, rejeitar `alternates` e falhar fechado nas superfícies Git inseguras. Foco `56/56`, cobertura `205/1152/21` em `95,03/90,95/95,31/95,73`, build `12/12`, CI contract, arquitetura `2/2`, hotspots `0`, lint, typecheck, formato, diff-check e audit passaram. Código/teste `3c3758c` foi publicado; `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria independente permanecem abertos.

**Publicação Dual99 — 2026-08-21T04:26:53-03:00 — B99-101 Git internal metadata boundary:** o commit técnico `3c3758c` e a reconciliação documental `de4563e` foram publicados em `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `de4563e`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T04:02:33-03:00 — B99-101 Git environment boundary:** a auditoria read-only reproduziu `staged:victim.env` externo quando `GIT_INDEX_FILE` e `GIT_OBJECT_DIRECTORY` herdados apontavam para um repositório sintético; o RED focal falhou com o mesmo finding. GREEN passou a remover todas as chaves `GIT_*` herdadas do ambiente do child e a fixar somente `GIT_DIR=/proc/self/fd/3` e `GIT_WORK_TREE=.`. Foco `54/54`, cobertura `205/1150/21` em `95,03/90,95/95,31/95,73`, probe com quatro redirecionadores Git sem finding sensível, build `12/12`, CI contract, arquitetura `2/2`, hotspots `0`, lint, typecheck, formato, diff-check e audit passaram. Código/teste `ae3d596` foi publicado; `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret rotation, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria permanecem abertos.

**Publicação Dual99 — 2026-08-21T04:02:33-03:00 — B99-101 Git environment boundary:** o commit técnico `ae3d596` e a reconciliação documental `efa1d9f` foram enviados para `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `efa1d9f`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T03:45:58-03:00 — B99-101 root identity boundary:** a auditoria reproduziu `207/1000` atravessamentos quando a raiz foi trocada por outro diretório real; o RED focal reproduziu `87/500` findings externos. GREEN consolidou `lstat` e abertura em `withWorkspaceRoot`, compara `dev/ino` com o descritor `O_DIRECTORY | O_NOFOLLOW` e falha fechado em divergência. Foco `53/53`, cobertura `205/1149/21` em `95,03/90,95/95,31/95,73`, dez swaps profundos determinísticos sem finding externo, build `12/12`, CI contract, arquitetura `2/2`, hotspots `0`, lint, typecheck, formato, diff-check e audit passaram. Código/teste `55dffa5` foi publicado; `pnpm verify:secrets` mantém somente os quatro assignments redigidos preexistentes. Windows/non-proc, secret rotation, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria permanecem abertos.

**Publicação Dual99 — 2026-08-21T03:51:59-03:00 — B99-101 root identity boundary:** o commit técnico `55dffa5` e a reconciliação documental `b306790` foram enviados para `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `b306790`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T03:31:23-03:00 — B99-101 Git metadata boundary:** a auditoria e o RED reproduziram que `.git` simbólico fazia Git ler índice/histórico externos, produzindo `staged:victim.env` e `history:victim.env`. GREEN abre o `.git` direto com `O_DIRECTORY | O_NOFOLLOW`, mantém o descritor e o entrega ao child Git em fd 3; o worktree usa a raiz já aberta. Foco `52/52`, cobertura `205/1148/21` em `95,03/90,95/95,31/95,73`, probe de `1000` trocas sem leakage/exceção, build `12/12`, CI contract, arquitetura `2/2`, hotspots `0`, lint, typecheck, formato, diff-check e audit passaram. Código/teste `5ea9281` foi publicado e `HEAD == origin` confirmado. `pnpm verify:secrets` permanece fail-closed nos quatro assignments redigidos preexistentes; a crítica é fresca/read-only, mas não independente. Windows/non-proc, secret rotation, RC/runtime, clínica, `0/145`, gates externos, aprovação humana e reauditoria permanecem abertos.

**Publicação Dual99 — 2026-08-21T03:35:55-03:00 — B99-101 Git metadata boundary:** o commit técnico `5ea9281` e a reconciliação documental `4d54d8b` foram enviados para `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `4d54d8b`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T03:05:17-03:00 — B99-101 parent path boundary:** a auditoria read-only reproduziu follow de componente-pai para árvore externa em `14/500` trocas; o RED focal reproduziu `15/500` vazamentos `victim.env`. GREEN caminha cada componente absoluto desde `/` com `O_DIRECTORY | O_NOFOLLOW`, mantendo a recursão interna em `/proc/self/fd/<fd>/child`; falhas retornam `<workspace> / unreadable-file`. Foco `50/50`, cobertura `205/1146/21` em `95,03/90,95/95,31/95,73`, probe pós-correção `5000` trocas sem vazamento nem exceção, build `12/12`, hotspots `0`, contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint, typecheck, formato e diff-check passaram. Código/teste `c69069b` foi publicado no branch remoto; a reconciliação documental será publicada em seguida. `pnpm verify` no SHA exato passou até migration safety e parou fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado. A crítica foi fresca e read-only, mas não independente; Windows/non-proc e gates externos permanecem abertos.

**Publicação Dual99 — 2026-08-21T03:08:46-03:00 — B99-101 parent path boundary:** a reconciliação documental `13f64f1` foi publicada em `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `13f64f1`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. A publicação não fecha Windows/non-proc, secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`. A próxima ação é nova auditoria read-only bounded.

**Atualização Dual99 local — 2026-08-21T02:47:53-03:00 — B99-101 Git cwd root boundary:** a auditoria read-only reproduziu follow de Git para um repositório externo em `3/300` trocas da raiz; o RED focal reproduziu `7/500` vazamentos `staged:victim.env`. GREEN abre a raiz com `O_DIRECTORY | O_NOFOLLOW`, mantém o descritor durante workspace/staged/history e passa `/proc/self/fd/<fd>` como `cwd` de Git; falhas retornam `<workspace> / unreadable-file`. Foco `49/49`, cobertura `205/1145/21` em `95,03/90,95/95,31/95,73`, probes staged `5000` e history `1000` sem vazamento nem exceção, build `12/12`, hotspots `0`, contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint, typecheck, formato e diff-check passaram. Código/teste `0f575d1` foi publicado no branch remoto; a reconciliação documental será publicada em seguida. `pnpm verify` no SHA exato passou até migration safety e parou fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado. A crítica foi fresca e read-only, mas não independente; parent path races, POSIX/procfs e gates externos permanecem abertos.

**Publicação Dual99 — 2026-08-21T02:51:17-03:00 — B99-101 Git cwd root boundary:** a reconciliação documental `22de927` foi publicada em `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `22de927`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. A publicação não fecha parent path races, POSIX/procfs, secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`. A próxima ação é nova auditoria read-only bounded.

**Atualização Dual99 local — 2026-08-21T02:16:26-03:00 — B99-101 workspace directory boundary:** a auditoria read-only reproduziu uma troca de `root/nested` para symlink: a travessia anterior encontrou `nested/victim.env` fora da raiz em `178` tentativas e também deixou escapar `ENOENT` durante `readdir`. GREEN passou a abrir cada diretório com `O_DIRECTORY | O_NOFOLLOW`, manter o descritor-pai aberto durante a recursão por `/proc/self/fd/<fd>` e retornar `<workspace> / unreadable-file` em falhas de abertura/enumeração. Foco `48/48`, cobertura `205/1144/21` em `95,03/90,95/95,31/95,73`, probe de profundidade pós-correção com `5000` trocas sem vazamento nem exceção, build sintético `12/12`, hotspots `0` com maior função de `98` linhas, contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint, typecheck, formato e diff-check passaram. Código/teste `4af5821` foi publicado no branch remoto; a reconciliação documental será publicada em seguida. `pnpm verify` passou até migration safety e parou fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado. A crítica foi fresca e read-only, mas não independente; a travessia depende de flags POSIX/`/proc` e falha fechado sem elas.

**Publicação Dual99 — 2026-08-21T02:22:29-03:00 — B99-101 workspace directory boundary:** a reconciliação documental `41cf20c` foi publicada em `origin/agent/publish-production-hardening`; o pós-push confirmou `HEAD == origin` em `41cf20c`. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. A publicação não fecha secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`. A próxima ação é nova auditoria read-only bounded.

**Publicação Dual99 local — 2026-08-21T01:59:25-03:00 — B99-101 workspace open boundary:** o pós-push confirmou `HEAD == origin/agent/publish-production-hardening` em `5998266`; o código/teste `ee0ebc9` e a reconciliação documental foram publicados. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. A publicação não fecha secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`. A próxima ação é nova auditoria read-only bounded.

**Atualização Dual99 local — 2026-08-21T01:56:15-03:00 — B99-101 workspace open boundary:** a auditoria read-only reproduziu uma troca TOCTOU entre `lstat` e `open`: um worker sintético alternou `victim.env` entre arquivo regular e symlink, e o scanner anterior seguiu o alvo externo em `164` tentativas. GREEN moveu `readScanBuffer` para `scripts/secret-scanner-workspace.mjs` e usa `O_RDONLY | O_NOFOLLOW`; symlink no componente final e plataformas sem `O_NOFOLLOW` falham fechado. O foco passou `47/47`, cobertura `205/1143/21` em `95,03/90,95/95,31/95,73`, probe pós-correção completou `5000` trocas sem vazamento, build sintético `12/12`, hotspots `0` com maior função de `98` linhas, contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint, typecheck, formato e diff-check passaram. Código/teste `ee0ebc9` foi publicado no branch remoto; a reconciliação documental será publicada em seguida. `pnpm verify` passou até migration safety e parou fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado. A crítica foi fresca e read-only, mas não independente; permanecem explicitamente fora da prova local as condições de corrida em componentes-pai, gaps externos e a reauditoria independente.

**Publicação Dual99 local — 2026-08-21T01:39:59-03:00 — B99-101 workspace root boundary:** o pós-push confirmou `HEAD == origin/agent/publish-production-hardening` em `3217e13`; o código/teste `1ab557e` e a reconciliação documental foram publicados. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. A publicação não fecha secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`. A próxima ação é nova auditoria read-only bounded.

**Atualização Dual99 local — 2026-08-21T01:32:38-03:00 — B99-101 workspace root boundary:** a auditoria read-only reproduziu que uma raiz sintética symlink fazia `scanProject` atravessar o alvo e localizar `config.env` fora da fronteira solicitada; com `includeStaged` e `includeHistory`, o scanner antigo também continuava nas superfícies Git. GREEN passou a validar a raiz com `lstat` antes de worktree/staged/history: symlink, ausência e arquivo regular retornam somente `<workspace> / unreadable-file`, sem invocar Git. O guard foi extraído para `scripts/secret-scanner-workspace.mjs`, mantendo o scanner principal em `800` linhas. Foco `46/46`, cobertura `205/1142/21` em `95,03/90,95/95,31/95,73`, build sintético `12/12`, hotspots `0` com maior função de `98` linhas, contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint, typecheck, formato e diff-check passaram. Código/teste `1ab557e` foi publicado no branch remoto; a reconciliação documental será publicada em seguida. `pnpm verify` passou até migration safety e parou fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado. A crítica foi fresca e read-only, mas não independente; B99-101 permanece `IN_PROGRESS` no escopo externo e o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T01:13:43-03:00 — B99-101 bounded workspace asset reads:** a auditoria read-only reproduziu que `scanFile` ainda chamava `readFile` sem teto para assets ignorados acima de `2 MiB`; RED usou um `.png` esparso, oversized e sem permissão, que antes virava `unreadable-file`. GREEN passou a descartar esses assets por metadata e a ler arquivos regulares com buffer máximo de `MAX_SCAN_BYTES + 1`, mantendo scan UTF-8 limitado e comportamento fail-closed em crescimento. Foco `43/43`, cobertura `205/1139/21` em `95,03/90,95/95,31/95,73`, build `12/12` com `CVG_API_INTERNAL_URL` sintético, hotspots `0` com maior função de `98` linhas, contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration safety `33/33`, audit, lint, typecheck, formato e diff-check passaram. Código/teste estão em `95adb51`, publicado no branch remoto; `pnpm verify:secrets` permanece fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado. A crítica fresca foi read-only e não independente; B99-101 permanece `IN_PROGRESS` no escopo externo e o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Publicação Dual99 local — 2026-08-21T01:17:22-03:00 — B99-101 bounded workspace reads:** o pós-push confirmou `HEAD == origin/agent/publish-production-hardening` em `22d1a97`; o código/teste `95adb51` e a reconciliação documental foram publicados. Estado, backlog, roadmap, evidência, log e traceability estavam alinhados nesse corte; `.gauntlet/` permanece local e não rastreado. A publicação não fecha secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T00:29:52-03:00 — B99-101 default do planner Git:** a auditoria read-only encontrou que o planner de baixo nível aceitava `maxBatchBytes` omitido como `Number.MAX_SAFE_INTEGER`; três objetos Git sintéticos de `3 MiB` formavam uma batch de `9 MiB`. RED/GREEN fixou default finito de `8 MiB`, rejeição fail-closed de limites não positivos/não seguros/`NaN`/infinitos e finding `git-object-unreadable` para objeto individual acima do orçamento, mantendo a composição de produção em `8 MiB` explícitos. O foco passou `40/40`, cobertura `205/1136/21` em `95,03/90,95/95,31/95,73`, build `12/12`, hotspots `0` com maior função de `97` linhas, contratos `87/87`, decisões `7/7`, mutation `7/7`, migration safety, lint, typecheck, formato e diff-check. A crítica fresca read-only confirmou batches omitidos `[6291456,3145728]`, limite explícito de `5 MiB` em três batches e finding redigido para objeto de `9 MiB`. Código/teste estão em `87717ed`, publicado no branch remoto; `pnpm verify:secrets` permanece fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado. B99-101 segue `IN_PROGRESS` no escopo externo; o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T00:44:50-03:00 — B99-101 caps explícitos do helper Git:** a auditoria read-only reproduziu que `runGitBatch` aceitava `maxOutputBytes: Infinity`, `maxOutputBytes: NaN` e `maxErrorBytes: Infinity`, permitindo alcançar o child apesar do contrato bounded. RED/GREEN passou a rejeitar ambos os caps antes do spawn, salvo inteiros seguros positivos, preservando defaults finitos, `onChunk`, caps válidos e mensagens genéricas/redigidas. Foco `41/41`, cobertura `205/1137/21` em `95,03/90,95/95,31/95,73`, build `12/12`, hotspots `0` com maior função de `97` linhas, contratos `87/87`, decisões `7/7`, mutation `7/7`, migration safety, lint, typecheck, formato e diff-check passaram. Probes sintéticos rejeitaram os caps inválidos e aceitaram `64` bytes; código/teste estão em `f79cce6`, publicado no branch remoto. `pnpm verify:secrets` permanece fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado; a crítica fresca foi read-only e não independente; o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-21T00:58:01-03:00 — B99-101 caps de scan/header do parser Git:** a auditoria read-only reproduziu que `planGitBatchRequests` aceitava `maxScanBytes: Infinity`, planejando objeto sintético de `9 MiB` sem finding, e que `createGitBatchStreamParser` aceitava `maxHeaderBytes: Infinity` em header incompleto. RED/GREEN passou a rejeitar caps de scan/header inválidos em planner, parser e reader antes de processar, preservando cap finito, framing bounded e `oversize-file`. Foco `42/42`, cobertura `205/1138/21` em `95,03/90,95/95,31/95,73`, build `12/12`, hotspots `0` com maior função de `98` linhas, contratos `87/87`, decisões `7/7`, mutation `7/7`, migration safety, lint, typecheck, formato e diff-check passaram. Cap finito de `2 MiB` produziu finding redigido para objeto de `9 MiB` sem batch; código/teste estão em `3410d52`, publicado no branch remoto. `pnpm verify:secrets` permanece fail-closed somente nos quatro assignments redigidos preexistentes de `infra/production/.env.local`, que não foi lido nem alterado; a crítica fresca foi read-only e não independente; o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

**Publicação Dual99 local — 2026-08-21T01:01:22-03:00 — B99-101 caps de scan/header:** o pós-push confirmou `HEAD == origin/agent/publish-production-hardening` em `4bd3d3e`; o código/teste `3410d52` e a reconciliação documental da rodada foram publicados. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. A publicação não fecha secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Publicação Dual99 local — 2026-08-21T00:48:02-03:00 — B99-101 caps explícitos:** o pós-push confirmou `HEAD == origin/agent/publish-production-hardening` em `167c4c4`; o código/teste `f79cce6` e a reconciliação documental da rodada foram publicados. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. A publicação não fecha secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Publicação Dual99 local — 2026-08-21T00:34:35-03:00 — B99-101:** o pós-push confirmou `HEAD == origin/agent/publish-production-hardening` em `717f1a9`; o código/teste `87717ed` e a reconciliação documental da rodada foram publicados. Estado, backlog, roadmap, evidência, log e traceability estão alinhados; `.gauntlet/` permanece local e não rastreado. A publicação não fecha secret manager/rotação, provider/CI, RC/runtime, clínica, `0/145`, gates externos, aprovação humana ou reauditoria independente; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Overlay executivo ativo — Dual 99 (2026-08-20T02:48:08-03:00):** assessment-base `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`, programa `0309`, roadmap `0518`, backlog `0519` e manifesto `dual-99-program.json`; `0308/0516/0517` permanecem histórico predecessor. A barra v1 exige `32/32 ≥99`, C1–C8 e RH01–RH06 fechados, `145/145` cadeias e gates críticos verdes. O plano e o gate estrutural estão verdes; execução local `IN_PROGRESS`/`PILOT_BLOCKED`. A primeira onda TDD de qualidade fechou sete focos e elevou a suíte para `199/1038/21`, cobertura `95,01/91,02/95,19/95,73`, build `12/12`, E2E sintético Chromium `27/27`, scanner focal `14/14` e ratchet `144/117`; `pnpm verify` para em B99-101 pelos quatro valores redigidos de `.env.local`, e os gaps live/externos/humanos seguem explícitos.

**Paridade final Dual99 local — 2026-08-21T00:12:22-03:00 — B99-308:** a
checagem pós-push confirmou a publicação da paridade documental em `392ac11`;
o corte de evidência está em `2026-08-21T00:12:22-03:00` e nenhum código,
segredo, runtime ou produção foi alterado. `.gauntlet/` permanece local e não
rastreado; o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Publicação Dual99 local — 2026-08-21T00:09:25-03:00 — B99-308:** o commit de
código/teste `9b3f71e` e a reconciliação documental `47b6a6c` foram publicados
em `origin/agent/publish-production-hardening`; `HEAD == origin` em
`47b6a6c`. Estado, backlog, roadmap, evidência, log e traceability estão
alinhados. `.gauntlet/` permanece local e não rastreado. O programa segue
`IN_PROGRESS / PILOT_BLOCKED` por secret manager/rotação, RC/runtime, clínica,
`0/145`, gates externos, aprovação humana e reauditoria independente.

**Atualização Dual99 local — 2026-08-21T00:04:17-03:00 — B99-308 fronteira de API:**
a auditoria read-only encontrou leitura direta de propriedades desconhecidas no
validador de superfície; o RED reproduziu exceção em getter hostil e o GREEN
introduziu `readUnknown`, que captura o acesso e falha fechado. A campanha
seeded executou `512` descritores malformados, incluindo accessors que lançam,
e `512` pares de método/path; nenhum caso lançou, cada descritor inválido
produziu erro, o inventário válido de `57` rotas permaneceu sem erro e lookup
malformado não resolveu. Foco `7/7`, integração `11/11`, contratos `28/87`,
cobertura `205/1135/21` em `95,03/90,95/95,31/95,73`, build `12/12`,
hotspots `0`, decisões `7/7`, mutation `7/7`, lint, typecheck, formato e
diff-check passaram. Código/teste estão em `9b3f71e`, publicado no branch
remoto; B99-308 fica concluído no escopo local. O `pnpm verify` oficial parou
fail-closed em `verify:secrets` nos quatro assignments redigidos preexistentes
de `infra/production/.env.local`, que não foi lido nem alterado. Secret
manager/rotação, RC/runtime, clínica, `0/145`, gates externos, aprovação
humana e reauditoria permanecem abertos; o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T21:54:57-03:00 — B99-004 paridade:**
no início da reconciliação, `HEAD` e origin estavam ambos em `2af57e6`; a
auditoria pós-publicação anterior havia observado `HEAD == origin` em
`6ddc37b`, antes do pacote documental que a registrou. Estado, roadmap,
backlogs, evidência, log e traceability agora distinguem esses SHAs históricos;
o log append-only preserva as entradas existentes e registra a ordem canônica
Round 45 → Round 46 → auditoria pós-publicação. B99-004 está concluído no
escopo local; secret manager/rotação, provider/CI, RC, runtime live, clínica,
`0/145`, gates externos, aprovação humana e reauditoria permanecem abertos.
O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T21:47:42-03:00 — pós-publicação:**
auditoria read-only observou `HEAD == origin` em `6ddc37b`, foco `39/39`,
hotspots `0` e caps finitos em todos os callsites de produção do scanner; o
pacote documental que registrou essa auditoria foi publicado depois em
`2af57e6`. O único override `Infinity` restante exige violação deliberada do
contrato da API interna e não é usado pela composição de produção. Não há novo
gap local justificável; os gates externos e humanos permanecem abertos.
O programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T22:25:53-03:00 — B99-305:** auditoria
de fonte encontrou `createGitBatchStreamParser` com `104` linhas apesar do
ratchet anterior permitir `117`. O RED adicionou a barra exata de `100` e o
GREEN extraiu `consumeGitBatchChunk` sem alterar framing, retenção bounded,
redaction, overflow/truncamento ou findings. Foco hotspot `6/6`, scanner
`39/39`, cobertura `205/1134/21` em `95,02/90,95/95,31/95,71`, maior função
`98`, `hotspotCount: 0`, mutation `7/7`, contratos `86/86`, worker `51/51`,
migrations `33/33`, migration safety, lint, typecheck, formato, diff-check,
CI contract e documentação passaram. O código/teste está em `593619e` e o
ratchet agora fixa `maxLongestFunctionLines: 100`. B99-305 fica concluído no
escopo local; `pnpm verify` parou fail-closed em `verify:secrets` nos quatro
assignments redigidos preexistentes de `infra/production/.env.local`, que não
foi lido nem alterado. Secret manager/rotação, RC, runtime, clínica, `0/145`,
gates externos e reauditoria permanecem abertos; o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Publicação Dual99 local — 2026-08-20T22:30:33-03:00 — B99-305:** o código e
teste de fechamento da barra estão em `593619e` e a reconciliação de estado,
backlog, roadmap, evidência, log e traceability foi publicada em `aebe16a` no
branch remoto. `.gauntlet/` permanece local e não rastreado. O programa segue
`IN_PROGRESS / PILOT_BLOCKED` por secret manager/rotação, RC/runtime, clínica,
`0/145`, gates externos, aprovação humana e reauditoria independente.

**Atualização Dual99 local — 2026-08-20T21:41:55-03:00 — B99-101:** a
auditoria read-only encontrou que o fallback de `runGitBatch` ainda usava
`maxOutputBytes = Infinity` quando o chamador omitia o limite. O RED adicionou
subprocesso sintético acima do default e falhou ao observar a resolução do
Buffer completo; o GREEN adotou cap default finito de `8 MiB`, preservando
limites explícitos preflightados. Foco `39/39`, cobertura `205/1133/21` em
`95,02/90,95/95,31/95,71`, scanner `774`, helper `415`, hotspots `0`,
lint/typecheck/formato/diff-check verdes; `pnpm verify` passou até migration
safety e parou somente nos quatro assignments redigidos preexistentes de
`.env.local`. Código/teste estão em `a6d7ce3`; evidência documental publicada
em `630509f`. Secret manager/rotação, provider/CI, RC, runtime live, clínica,
`0/145`, gates externos e reauditoria permanecem abertos. B99-101 e o programa
seguem `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T21:25:32-03:00 — B99-101:** a
auditoria read-only encontrou que o Round 44 ainda acumulava stderr do
subprocesso Git e devolvia o texto bruto em falhas não-zero. O RED adicionou
subprocesso sintético ruidoso e erro Git normal; o GREEN limitou stderr a
`4 KiB`, encerra overflow e usa mensagens genéricas redigidas. Foco `38/38`,
cobertura `205/1132/21` em `95,02/90,95/95,31/95,71`, scanner `774` linhas,
helper `414`, hotspots `0`, lint/typecheck/formato/diff-check verdes; o
`pnpm verify` passou até migration safety e parou somente nos quatro
assignments redigidos preexistentes de `.env.local`. Código/teste estão em
`208868b`; evidência documental publicada em `1685e63`. Secret manager/rotação,
provider/CI, RC, runtime live, clínica, `0/145`, gates externos e reauditoria
permanecem abertos. B99-101 e o programa seguem `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T20:55:39-03:00 — B99-101:** a
auditoria read-only confirmou que o cap por batch do Round 43 ainda deixava
`runGitBatch` armazenar todos os chunks e concatenar a saída completa antes do
parse. O RED cobriu callback incremental, header malformado e corpo truncado;
o GREEN passou a consumir stdout por chunks, reter somente o objeto bounded
corrente e descartar oversized durante o framing, sem expor bytes sintéticos.
Fixture Git descartável encontrou cinco findings em múltiplos chunks e duas
batches. Foco `36/36`, cobertura `205/1130/21` em
`95,02/90,95/95,31/95,71`, scanner `774` linhas, helper `397`, hotspots `0`,
lint/typecheck/formato/diff-check verdes; `pnpm verify` passou até migration
safety e parou somente nos quatro assignments redigidos preexistentes de
`.env.local`. Código/teste estão em `11a6d10`; evidência documental publicada
em `0b393d5`. O parser mantém um único corpo bounded por vez para scan textual;
secret manager/rotação, provider/CI, RC, runtime live, clínica, `0/145`, gates
externos e reauditoria permanecem abertos. B99-101 e o programa seguem
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T20:13:49-03:00 — B99-101:** a
auditoria read-only encontrou concatenação sem limite agregado para todos os
corpos históricos bounded. O RED falhou nos contratos de particionamento e
cap; o GREEN agrupou corpos em batches de até `8 MiB`, limitou stdout pelo
preflight, falhou fechado em overflow e extraiu a orquestração para o helper
Git. Fixture descartável encontrou cinco findings em duas batches e o cap
direto rejeitou output acima do limite. Foco `34/34`, cobertura `205/1128/21`
em `95,02/90,95/95,31/95,71`, scanner `774` linhas, helper `213`, hotspots
`0`; `pnpm verify` passou até migration safety e parou somente nos quatro
assignments redigidos preexistentes de `.env.local`. Código/teste estão em
`b15f171`; documentação publicada em `1572192`; streaming integral sem buffers e os
demais gates externos continuam abertos. B99-101 permanece `IN_PROGRESS` e o
programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T19:48:27-03:00 — B99-101:** a
auditoria read-only encontrou materialização de corpos históricos oversized
antes do descarte. O RED falhou ao exigir o plano `git cat-file --batch-check`;
o GREEN adicionou preflight estrito de framing/identidade/tipo/tamanho,
excluiu corpos oversized de assets do batch corporal e manteve
`oversize-file` fail-closed para não-assets, sem perder o scan UTF-8 limitado
de `text.png`. Fixture Git descartável confirmou o comportamento com asset
binário sintético acima de 2 MiB. Foco `31/31`, cobertura `205/1125/21` em
`95,02/90,95/95,31/95,71`, scanner `785` linhas, helper `108`, hotspots `0`;
`pnpm verify` passou até migration safety e parou somente nos quatro
assignments redigidos preexistentes de `.env.local`. Código/teste estão em
`69e5ff3`; documentação publicada em `67b7b40`; B99-101 permanece
`IN_PROGRESS` e o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T19:25:00-03:00 — B99-101:** a auditoria
read-only rejeitou a hipótese de vazamento em detalhes de respostas `error`
válidas porque findings `missing/error` já redigem evidence. Uma fixture Git
descartável reproduziu falso scan limpo para conteúdo textual secret-shaped sob
`worktree.png`, `staged.png` e `history.png`; o RED falhou com findings vazios.
O GREEN enumera todos os paths de worktree/index/history, escaneia texto UTF-8
limitado mesmo sob extensões de asset e não trata bytes binários/oversize de
assets como texto nem os copia para findings; paths não-asset seguem
fail-closed. O foco passou `30/30`, cobertura `205/1124/21` em
`95,02/90,95/95,31/95,71`, scanner `776` linhas, hotspots `0`, e
`verify:secrets` reportou somente os quatro valores redigidos preexistentes de
`infra/production/.env.local`; código/teste estão em `de8cbdd`, a evidência
documental foi publicada em `4a9d315` e o `pnpm verify` oficial passou todos os
gates anteriores antes do mesmo bloqueio em `verify:secrets`. O arquivo não
foi lido nem alterado; B99-101 permanece `IN_PROGRESS` até secret
manager/rotação e o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T19:01:02-03:00 — B99-101:** a
auditoria read-only reproduziu que um header com newline e primeiro token
malformado contendo marcador sintético contaminava o path do finding. O RED
falhou com a exposição; o GREEN aceita somente path conhecido ou object ID hex
válido e usa `history:<git>` para o restante, sem copiar/scanear/expor o token.
O foco passou `29/29`, cobertura `205/1123/21` em
`95,02/90,95/95,31/95,71`, scanner em `793` linhas, `verify:hotspots` reportou
`0`, e lint, typecheck, formato, audit, contratos `86/86`, worker `51/51`,
migrações `33/33`, migration safety, decisões `7/7`, mutation `7/7` e
diff-check passaram. O `pnpm verify` parou em `verify:secrets` somente nos
quatro valores redigidos preexistentes de `infra/production/.env.local`;
código/teste estão em `87f759a` e a evidência documental foi publicada em
`9cc102a`.
B99-101 permanece `IN_PROGRESS` até secret manager/rotação, e o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T18:50:39-03:00 — B99-101:** a
auditoria read-only reproduziu que um header `git cat-file --batch` sem newline
copiava o buffer restante, inclusive marcador de corpo sintético, para o path
do finding. O RED falhou com a exposição; o GREEN usa `history:<git>` e emite
`git-object-unreadable` sem copiar/scanear/expor os bytes. Headers válidos e os
demais casos de framing permanecem preservados. O foco passou `28/28`,
cobertura `205/1122/21` em `95,02/90,95/95,31/95,71`, scanner em `791` linhas,
`verify:hotspots` reportou `0`, e lint, typecheck, formato, audit, contratos
`86/86`, worker `51/51`, migrações `33/33`, migration safety, decisões `7/7`,
mutation `7/7` e diff-check passaram. O `pnpm verify` parou em
`verify:secrets` somente nos quatro valores redigidos preexistentes de
`infra/production/.env.local`; código/teste estão em `b528ff4` e a evidência
documental foi publicada em `3520f85`. B99-101 permanece `IN_PROGRESS` até secret
manager/rotação, e o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T18:36:22-03:00 — B99-101:** o RED
reproduziu resposta `blob` válida no framing, mas com object ID ausente do mapa
solicitado ao `git cat-file --batch`; como não havia path associado, o corpo
sensível era silenciosamente ignorado. O GREEN vincula cada resposta ao mapa de
objetos solicitados antes de consumir/scanear o corpo, emite
`git-object-unreadable` para resposta inesperada e encerra o lote sem expor o
valor sintético; respostas solicitadas, framing estrutural e `missing/error`
permanecem preservados. O foco passou `27/27`, cobertura `205/1121/21` em
`95,02/90,95/95,31/95,71`, scanner em `798` linhas, `verify:hotspots` reportou
`0`, e lint, typecheck, formato, audit, contratos `86/86`, worker `51/51`,
migrações `33/33`, migration safety, decisões `7/7`, mutation `7/7` e
diff-check passaram. O `pnpm verify` parou em `verify:secrets` somente nos
quatro valores redigidos preexistentes de `infra/production/.env.local`;
código/teste estão em `adc2b85` e a evidência documental foi publicada em
`66cf8bb`.
B99-101 permanece `IN_PROGRESS` até secret manager/rotação, e o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T18:21:57-03:00 — B99-101:** o RED
reproduziu falso scan limpo quando `.trim()` transformava o path textual
versionado `secret.png ` em `secret.png`, que era ignorado como asset binário.
O GREEN preserva exatamente o trecho de path após o separador do
`git rev-list --objects --all`, trata apenas a linha vazia de árvore como
marcador estrutural e encontra `history:secret.png ` sem expor o valor
sintético. O foco passou `26/26`, cobertura `205/1120/21` em
`95,02/90,95/95,31/95,71`, scanner em `793` linhas, `verify:hotspots` reportou
`0`, e lint, typecheck, formato, audit, contratos `86/86`, worker `51/51`,
migrações `33/33`, migration safety, decisões `7/7`, mutation `7/7` e
diff-check passaram. O `pnpm verify` parou em `verify:secrets` somente nos
quatro valores redigidos preexistentes de `infra/production/.env.local`;
código/teste estão em `53b96d8` e a evidência documental foi publicada em
`1c2a68e`. B99-101 permanece `IN_PROGRESS` até secret manager/rotação,
e o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T18:09:25-03:00 — B99-101:** o RED
reproduziu aceitação de headers malformados de `git cat-file --batch` — ID não
hexadecimal, campo extra e tamanho `+N` — com scan do corpo. O GREEN valida ID
de 40 hex, tipo/framing permitido e tamanho decimal antes de consumir o corpo,
preserva `missing/error`, emite `git-object-unreadable` e encerra o lote sem
expor o valor sintético. O foco passou `25/25`, cobertura `205/1119/21` em
`95,02/90,95/95,31/95,71`, scanner em `793` linhas, `verify:hotspots` reportou
`0`, e lint, typecheck, formato, audit, contratos `86/86`, worker `51/51`,
migrações `33/33`, migration safety, decisões `7/7`, mutation `7/7` e
diff-check passaram. O `pnpm verify` parou em `verify:secrets` somente nos
quatro valores redigidos preexistentes de `infra/production/.env.local`;
código/teste estão em `0b29af6` e a evidência documental foi publicada em
`adfacbc`. B99-101 permanece `IN_PROGRESS` até secret manager/rotação, e
o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T17:44:10-03:00 — B99-101:** o RED
reproduziu falso scan limpo quando `.trim()` confundia ` .env.local ` staged
com `.env.local`. O GREEN preserva exatamente cada path de `git ls-files -z`,
consulta o índice por `git show :<path>` sem alterar bytes e detecta o finding
staged com whitespace de borda, sem expor o valor sintético. O foco passou
`23/23`, cobertura `205/1117/21` em `95,02/90,95/95,31/95,71`, scanner em
`799` linhas, `verify:hotspots` reportou `0`, e lint, typecheck, formato, audit,
contratos `86/86`, worker `51/51`, migrações `33/33`, migration safety, decisões
`7/7`, mutation `7/7` e diff-check passaram. O `pnpm verify` parou em
`verify:secrets` somente nos quatro valores redigidos preexistentes de
`infra/production/.env.local`; código/teste estão em `4605371` e a evidência
documental foi publicada em `5604793`. B99-101 permanece `IN_PROGRESS`
até secret manager/rotação, e o programa segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T17:33:16-03:00 — B99-101:** o RED
reproduziu aceitação silenciosa de uma linha malformada do inventário
`git rev-list --objects --all`. O GREEN valida cada linha não vazia, aceita
IDs bare de 40 hex e IDs seguidos de path, preserva paths binários ignorados e
falha fechado para registros inválidos, convertendo o erro em
`git-object-unreadable` no scan de histórico. O foco passou `22/22`, cobertura
`205/1116/21` em `95,02/90,95/95,31/95,71`, o scanner ficou em `800` linhas,
`verify:hotspots` reportou `0`, e lint, typecheck, formato, audit, contratos
`86/86`, worker `51/51`, migrações `33/33`, migration safety, decisões `7/7`,
mutation `7/7` e diff-check passaram. O `pnpm verify` parou em
`verify:secrets` somente nos quatro valores redigidos preexistentes de
`infra/production/.env.local`; código/teste estão em `b2f2cc0` e a evidência
foi publicada em `3b35169`. B99-101 permanece `IN_PROGRESS` até secret
manager/rotação, e o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T17:20:12-03:00 — B99-101:** o RED
reproduziu falso scan limpo para corpos `blob` e `tag` completos, mas sem o
delimitador final `\n` do framing `git cat-file --batch`. O GREEN exige corpo
completo e delimitador, emite `git-object-unreadable` e encerra o lote inválido
antes de escanear ou expor o corpo; objetos válidos permanecem preservados. O
foco passou `21/21`, cobertura `205/1115/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `800` linhas,
`verify:hotspots` reportou `0`, e lint, typecheck, formato, audit, contratos
`86/86`, worker `51/51`, migrações `33/33`, migration safety, decisões `7/7`,
mutation `7/7` e diff-check passaram. O `pnpm verify` parou em
`verify:secrets` somente nos quatro valores redigidos preexistentes de
`infra/production/.env.local`; código/teste estão em `1adef42` e a evidência
foi publicada em `b114236`. B99-101 permanece `IN_PROGRESS` até secret
manager/rotação, e o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T17:07:01-03:00 — B99-101:** o RED
reproduziu falso scan limpo para `linked.env`, um symlink para arquivo
sensível fora da raiz. O GREEN enumera links sem segui-los, usa `lstat` e emite
`unreadable-file` sem expor o alvo. O foco passou `19/19`, cobertura
`205/1113/21` em `95,02/90,95/95,31/95,71`, o scanner ficou em `799` linhas,
`verify:hotspots` reportou `0` hotspots, e lint, typecheck, formato, audit e
diff-check passaram. O `pnpm verify` percorreu os gates até
`verify:secrets`, que reportou somente os quatro valores redigidos
preexistentes de `infra/production/.env.local`; código/teste estão em
`2bf5a45`; a evidência rastreada foi publicada em `c43034b`. B99-101 permanece
`IN_PROGRESS` até secret manager/rotação, e o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T16:52:54-03:00 — B99-101:** o RED
adicionou casos sintéticos de header `tree` não numérico, corpo `commit`
truncado e corpo `tree` sem delimitador no framing `git cat-file --batch`,
reproduzindo falso scan limpo. O GREEN valida tamanho seguro, corpo completo e
delimitador para `tree`/`commit`, emite `git-object-unreadable` e encerra o lote
inválido, mantendo objetos válidos e blobs/tags. O foco passou `18/18`, a
cobertura passou `205/1112/21` em `95,02/90,95/95,31/95,71`, e lint, typecheck,
formato, audit, hotspots `0` e diff-check passaram. O `pnpm verify` percorreu
os gates até `verify:secrets`, que reportou somente os quatro valores redigidos
preexistentes de `infra/production/.env.local`; código/teste estão no commit
`16a4f82`; a evidência rastreada foi publicada em `73ae862`. B99-101 permanece
`IN_PROGRESS` até secret manager/rotação, e o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T16:21:01-03:00 — B99-102:** o RED
adicionou testes adversariais para endpoint/bucket/prefixo/destino, SigV4,
redirect, timeout, limite declarado e streaming, symlink, hash mismatch e
gravação parcial. O GREEN tornou o downloader HTTPS origin-only, fail-closed,
sem redirects, com AbortController cobrindo headers/body, limite padrão de 2
GiB por arquivo, streaming para temp `0600`, hash antes de rename atômico e
proteção contra symlink em destino/ancestrais. O foco passou `20/20`, a
regressão de localização `5/5`, cobertura ampla `205/1111/21` em
`95,02/90,95/95,31/95,71`, build `12/12`, arquitetura `2/2`, scope drift,
migration safety, hotspots `0`, lint, typecheck, formato e diff-check. Os
testes usam apenas conteúdo sintético; o scanner final continua fail-closed
nos quatro valores já existentes de `infra/production/.env.local`. B99-102
implementação/teste estão no commit `7b06233`; permanece `IN_PROGRESS` até
secret manager/provedor autorizado e o programa
segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T15:52:02-03:00 — B99-308:** o RED
adicionou corpus bounded determinístico de descritores/lookup malformados e
reproduziu `TypeError` em `validateApiSurface` e `findApiSurfaceRoute`. O GREEN
fez a superfície falhar fechada, rejeitou inventário não-array e extraiu a
validação para `packages/contracts/src/api-surface-validation.ts`, mantendo as
57 rotas e o comportamento válido. Focais passaram `6/6`, inventário `11/11`,
contratos `86/86`, arquitetura `2/2`, build `12/12`, cobertura `204/1091/21`
em `95,02/90,95/95,31/95,71` e hotspots `0`; lint, typecheck, formato e
`git diff --check` passaram. A primeira cobertura ampla encontrou hotspot não
classificado, corrigido pela extração e repetido com gate verde. O corpus não
substitui property-based fuzz, HA/API/DB ativo, RC/SHA, secret manager,
clínica, `0/145`, gates externos ou reauditoria. O `pnpm verify` final passou
todos os gates até migration safety e parou fail-closed nos quatro valores
redigidos de `.env.local`. Código/testes estão no commit `7c46ad3` e a
documentação/evidence pack em `a4840eb`; B99-308 permanece
`READY_FOR_NEXT_STEP` localmente e o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T14:56:53-03:00 — B99-306:** a
matriz E2E ativa foi executada contra o web proxy `3100`, API/edge/HA e
PostgreSQL real local. O RED reproduziu base HTTP incorreta, chunk web 404
por processo antigo após rebuild e, depois do alinhamento do serviço, o
compartilhamento de sessão/caso entre projetos. O GREEN isolou cada browser
com `--project` e uma fixture nova: Chromium `3/3`, Firefox `3/3` e mobile
Chromium `3/3`; foco do orquestrador `9/9`, lint/typecheck/formato/diff-check
verdes; cobertura `204/1087/21` em `95,02/90,92/95,31/95,70`. WebKit foi executado separadamente e bloqueou os `3` testes por
`libavif16` ausente; teardown passou. B99-306 permanece `BLOCKED` até ambiente
WebKit aprovado, sem promover release, RC, score ou `PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T15:29:24-03:00 — B99-306:** o RED no
container Playwright pinado reproduziu flags Chromium-only no WebKit; depois da
separação por projeto, reproduziu cookie `Secure` rejeitado sobre HTTP e CSRF
`403` quando a origem HTTPS não estava na allowlist do HA. O GREEN escopou os
launch args a Chromium/mobile Chromium e tornou o bypass TLS local opt-in por
`CVG_E2E_IGNORE_HTTPS_ERRORS=true`. Com proxy HTTPS e allowlist HTTPS em
override descartável, WebKit passou `3/3`; a matriz HTTP repetida passou
Chromium/Firefox/mobile `3/3` cada, total `12/12`, e o foco passou `16/16`.
Cobertura `204/1089/21` em `95,02/90,92/95,31/95,70`; lint, typecheck, formato,
hotspots e diff-check verdes. Código publicado em `9959e44`. O host ainda não
tem `libavif16`, o container não equivale a ambiente aprovado/RC e B99-306
permanece `BLOCKED`; `pnpm verify` percorreu os gates até migration safety e
parou fail-closed nos quatro achados redigidos de `.env.local`; o programa
segue `IN_PROGRESS / PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T03:38:02-03:00:** B99-302, B99-303 e B99-304 foram concluídas no escopo local após RED/GREEN/REFACTOR, revisão, 17 repetições adicionais e mutation direcionada `7/7` (`100%`). A cobertura corrente é `200/1041/21` com floors `95,01/91,02/95,19/95,73`; build `12/12` e E2E Chromium sintético `27/27` passaram em porta isolada `3112`; a governança reporta `20/20` runs, zero falhas flaky e zero skips sem classificação. A barra técnica local foi mantida, mas mutation integral, browsers ativos, HA/API/DB reais, RC/proveniência, clínica, UAT, rastreabilidade ou reauditoria continuam abertas. O programa continua `IN_PROGRESS`/`PILOT_BLOCKED`.

**Reconciliação final Dual99 — 2026-08-20T03:48:50-03:00:** os verificadores de documentação, programa, rastreabilidade, skips, mutation, hotspots, formato, lint, typecheck e diff-check passaram após a correção do checkpoint de `docs/135` para `200/1041/21` e ratchet `144/113`. O parecer independente compatível permanece `REJECT`; a nova tentativa read-only foi encerrada sem resultado e sem alterar arquivos. B99-303/B99-304 seguem concluídas apenas no escopo local; `0/145`, mutation integral, live/RC, clínica, operação externa, aprovação humana e reauditoria mantêm `IN_PROGRESS`/`PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T08:35:37-03:00:** B99-101 foi endurecida contra literais hardcoded escondidos no RHS de atribuições sensíveis, com RED/GREEN, regressão de histórico e tolerância somente para combinações sintéticas delimitadas em fixtures. O focal passou `17/17`; `pnpm verify:secrets` falha apenas nos quatro valores redigidos de `infra/production/.env.local`. A cobertura corrente é `200/1049/21`, floors `95,06/91,06/95,35/95,77`, e as decisões `7/7`, mutation `7/7`, documentação, Dual99, rastreabilidade, skips, hotspots, lint, typecheck e diff-check passaram. B99-101 permanece `IN_PROGRESS` até secret manager/rotação/autorização; o programa segue `IN_PROGRESS`/`PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T08:55:50-03:00:** B99-103 foi corrigida sob RED/GREEN para executar o avanço de `session_generation` e a revogação em massa de sessões no mesmo transaction executor. O focal do repositório passou `8/8`; após um timeout transitório do teste existente de hotspots sob cobertura, a repetição passou `200/1050/21`, floors `95,06/91,06/95,35/95,77`, decisões `7/7`, mutation `7/7`, documentação, Dual99, rastreabilidade, skips `20/20`, hotspots, lint, typecheck, audit e diff-check. B99-103 permanece `IN_PROGRESS` até concorrência PostgreSQL/generation/TTL/logout/replay live autorizado; o programa segue `IN_PROGRESS`/`PILOT_BLOCKED`.

**Atualização Dual99 local — 2026-08-20T09:35:11-03:00:** B99-104 foi tratada sob RED/GREEN/REFACTOR. `CLINICAL_APPROVER_ID` saiu do runtime/API, Compose HA, `.env.example` e verificador de topologia; source-conflict, recalculation, correction e content withdrawal agora derivam o principal autenticado e revalidam conta persistida `ACTIVE` + `CLINICAL_APPROVER` + escopo antes do write. Source-conflict e recalculation compartilham transaction executor com contexto de escopo aplicado antes da leitura bloqueante. Focais passaram `13/171`; cobertura passou `200/1053/21` com floors `95,06/91,07/95,31/95,75`; build `12/12`, lint, typecheck, formato, audit, documentation, Dual99, traceability, skip `20/20`, decisões `7/7`, mutation `7/7`, hotspots e diff-check passaram. B99-104 permanece `IN_PROGRESS` até rotação/concurrency live, RC/proveniência, revisão clínica e gates externos; o programa segue `IN_PROGRESS`/`PILOT_BLOCKED`.

**Avaliação independente pós-hardening:** a implementação é relevante, mas o pacote é `PARTIAL`. U98-107–113 foram reabertas por seis achados altos: scanner com bypass, corrida de sessão, probe de outbox em memória, runtime Prometheus stale/sem API loss-of-signal, identidade clínica estática fora de authoring e rollout N/N-1 inseguro para mutações. Permanecem `11/87`, cobertura abaixo de `95/90/95/95`, worker abaixo de 80% nas quatro métricas, hotspots `152/21/128` (`22` ≥100), WebKit, `3/20`, RC, clínica, `0/145` e externos. Próxima ação: U98-005, U98-107–113/115–117 e só então U98-114.

**Hardening local Dual 98 (2026-08-16T21:26:09-03:00):** U98-107, U98-108 e U98-110–113 foram implementadas e verificadas localmente sob RED/GREEN/REFACTOR; U98-109 está `IN_PROGRESS` por limite explícito de escopo. `pnpm verify` passou com `195/947/19`, cobertura `90,43%/85,14%/93,61%/91,84%`, build `12/12`, migrações `31/31`, decisões `7/7`, contratos `82/82`, worker `31/31`, secrets limpo e hotspots sem violação. A evidência é `docs/132`; não houve commit, release, score ou promoção de `PILOT_BLOCKED`.

**Verificação final (2026-08-16T21:34:05-03:00):** o store de idempotência também adquiriu lock advisory transacional, e a rodada final repetiu `pnpm verify`, build `12/12`, audit de produção e diff-check com resultado verde. As baselines, `0/145`, `PILOT_BLOCKED`, WebKit, `11/87`, `152/22/128`, `763` decisões clínicas e `3/20` runs permanecem sem promoção.

**Reconciliação pós-análise (2026-08-16T19:12:11-03:00):** o snapshot U95-003 de `221` entradas foi confrontado com o `git status --short` corrente de `299` entradas; o delta de `78` itens posteriores (U95-110–114, evidências e cobertura) foi classificado por lote e risco em `docs/118_dual_95_worktree_inventory_2026-08-16.md`. U95-101–106 foram revalidados localmente: unitários críticos `124/124`, integração `30/30` com um live guardado, `pnpm verify:secrets` `PASS`, typecheck/lint/formato/diff-check e governanças relevantes `PASS`; cobertura `194/921/16/19`, `90,73%/85,30%/93,70%/92,15%`. Nenhuma baseline, `0/145`, score, release ou `PILOT_BLOCKED` foi promovido.

**Atualização U95-110 (2026-08-16T15:09:12-03:00):** a guarda do dashboard passou a usar `parseParticipantDashboard`/`ParticipantDashboardProjection` de `@cvg/contracts`, com dependência e boundary declarados; a governança RED listou `15` arquivos e `22` double assertions de transação, todas removidas na persistência, além de uma assertion residual no repositório de convites. Focais passaram `7/7`, persistência `127/127`, arquitetura/governança `3/3` e `pnpm verify` passou com `178/808/16/18` e cobertura `84,55%`/`80,05%`/`86,58%`/`85,36%`. U95-110 está pronta localmente para o próximo passo, sem promover score, release, `0/145` ou o estado `PILOT_BLOCKED`; U95-107, U95-108 e U95-109 continuam com os limites registrados.

**Atualização U95-111 (2026-08-16T15:35:39-03:00):** o `API_SURFACE` passou a derivar grupos de handler, `findApiSurfaceRoute` passou a resolver caminhos exatos/parametrizados, o template de telemetria deixou de duplicar tabelas e o dispatcher passou a selecionar um dos seis grupos canônicos antes de tratar a rota. O vínculo executável confirmou `57/57` rotas → grupo, focais de contrato `4/4`, inventário `2/2`, API/server `72/72` e `pnpm verify` verde com `178/810/16/18`, cobertura `84,55%`/`80,06%`/`86,67%`/`85,40%`. U95-111 está pronta localmente para o próximo passo, sem promover score, release, `0/145` ou `PILOT_BLOCKED`.

**Atualização U95-112 (2026-08-16T16:04:30-03:00):** o append de auditoria passou a manter contexto e inserção no mesmo executor transacional; conflitos de unicidade/versão passaram a `state_conflict`; e o restore passou a exigir dez invariantes de RLS, audit, append-only e unicidade, falhando fechado em forma inválida ou flag falsa. Focais passaram `audit 5/5`, persistência `24/24`, aplicação `17/17`, restore `9/9`; live temporário passou corrida/restore `5/5`, rollback `1/1`, RLS `1/1`, migrações `30/30`, e `pnpm verify` passou com `178/816/16/19` e cobertura `84,65%`/`80,13%`/`86,79%`/`85,54%`. U95-112 está pronta localmente para o próximo passo; a evidência não promove score, release, `0/145` ou `PILOT_BLOCKED`.

**Atualização U95-113 (2026-08-16T16:30:37-03:00):** os guards de admin, moderator, authoring e account passaram a usar schemas/projections canônicos de `@cvg/contracts`; o dashboard separa `loading`/`error`/projeção, limpa dados em falha, expõe `aria-busy` e bloqueia retry concorrente. Focais passaram `5/5` arquivos e `11/11` testes; build dos `12` workspaces, typecheck, lint, formato e `pnpm verify` passaram com `181/822/16/19`, cobertura `84,65%`/`80,13%`/`86,79%`/`85,54%`; Playwright sintético passou `27/27`. U95-113 está pronta localmente para o próximo passo; o E2E não prova API ativa/HA/produção, e a atualização não promove score, release, `0/145` ou `PILOT_BLOCKED`.

**Atualização U95-114 (2026-08-16T17:31:01-03:00):** o denominador do Vitest passou a incluir a produção de `apps/web`, a descoberta de `.test.tsx` foi corrigida, a matriz Playwright passou a ser controlável por browser e foram adicionados testes sintéticos das superfícies web. `pnpm test:coverage` passou com `191` arquivos / `855` testes passantes / `16` arquivos e `19` testes guardados, em `84,47%` statements / `80,29%` branches / `85,35%` functions / `85,77%` lines; Playwright sintético passou `27/27` em Chromium e o E2E ativo do worktree passou `3/3` em Chromium com PostgreSQL HA e fixture sintético limpo. U95-114 permanece `IN_PROGRESS`: a meta ≥90%, os floors críticos e Firefox/WebKit/mobile ainda não foram comprovados; não há promoção de score, release, `0/145` ou `PILOT_BLOCKED`.

**Continuação U95-114 (2026-08-16T18:28:19-03:00):** testes sintéticos de composição da API e dos repositórios de persistência reduziram os hotspots sem usar dados reais. `pnpm test:coverage` passou com `192` arquivos / `908` testes passantes / `16` arquivos e `19` testes guardados, em `90,15%` statements / `84,10%` branches / `93,57%` functions / `91,59%` lines. As funções críticas estão acima de `80%`; API e worker ainda têm branches em `73,45%` e `75,00%`. Typecheck, lint, formato e diff-check passaram. U95-114 continua `IN_PROGRESS` local / `PILOT_BLOCKED`: somente Chromium foi executado, o caminho ativo é temporário do worktree e não há promoção de score, release, `0/145` ou RC imutável.

**Continuação U95-114 (2026-08-16T18:56:56-03:00):** testes sintéticos de boundaries opcionais fecharam os hotspots da API; `pnpm test:coverage` passou com `194` arquivos / `921` testes passantes / `16` arquivos e `19` testes guardados, em `90,73%` statements / `85,30%` branches / `93,70%` functions / `92,15%` lines. API ficou em `89,40%/80,25%/95,63%/93,21%` e worker em `84,80%/84,14%/83,63%/84,64%` (statements/branches/functions/lines), com todas as camadas críticas acima de `80%` nas quatro métricas. Chromium, Firefox e mobile Chromium passaram `81/81` na matriz; WebKit ficou com `27` bloqueios ambientais por `libavif16` ausente. U95-114 segue `IN_PROGRESS` local / `PILOT_BLOCKED`: não há prova de WebKit em host aprovado, RC imutável, E2E ativo repetido no RC, score, release ou `0/145`.

**Estado atual (2026-08-16):** `CVG-DUAL-98` é o overlay ativo, coordenado por `docs/133` e `0308/0516/0517`; `0307/0514/0515` permanecem histórico/aliases. A execução está `IN_PROGRESS` em F98-0R/F98-1R, com U98-107–113 reabertas, U98-005/115–117 explícitas, U95-107, `11/87`, `152` funções >50/`21` >100 (`22` ≥100)/máximo `128`, WebKit, `322` entradas sem SHA, `763` decisões clínicas e ambientes externos pendentes. As baselines continuam congeladas, `0/32` itens têm nota oficial ≥98 e a rastreabilidade permanece `0/145`. Estado de produto: `PILOT_BLOCKED`.

**Atualização U95-106 (2026-08-16T13:40:08-03:00):** D95-H06 foi tratado localmente: deploy/rollback exigem `api-a`, `api-b`, `worker-a` e `worker-b` `running/healthy`, com fault injection live de `worker-a`, rehearsal `deploy=PASS`/`rollback=PASS`/`runtimeRestored=true` e `pnpm verify` verde; a conclusão depende de RC imutável/ambiente aprovado, sem alterar score, `0/145` ou `PILOT_BLOCKED`.

**Atualização U95-107 (2026-08-16T14:20:21-03:00):** warm-up/canário recuperável, source SHA↔digest↔runtime e rejeição de rollback same-version foram implementados sob TDD; focal `20/20`, cobertura `84,55%` statements / `80,05%` branches e rehearsal sintético passaram. O rollback live entre versões distintas permanece bloqueado: as imagens históricas disponíveis deixam os workers `unhealthy` sob o contrato atual e `worktree-uncommitted` não tem SHA Git válido; não houve promoção de score, release ou `0/145`.

**Atualização U95-108/U95-109 (2026-08-16T14:39:26-03:00):** U95-108 foi auditada sem inventar `N/A`: o gate reporta `87` success, `63` error, `26` denied, `36` conflict e `11` linhas completas, portanto permanecem provas por linha/justificativas aprovadas pendentes. U95-109 decompôs o rehearsal/manifests/proveniência e apertou o ratchet de `193/741` para `152/128`; focal `24/24`, cobertura `177/806/18`, typecheck/lint, dry-runs e atestação runtime passaram. Ainda há `22` funções acima de `100` sem exceção com owner/prazo; U95-108/109 não foram promovidas, e U95-107 continua bloqueada por artefato histórico compatível.

**Verificação U95-108/U95-109 (2026-08-16T14:45:38-03:00):** `pnpm verify` passou integralmente após a refatoração, incluindo cobertura `177/806/18`, contratos `81/81`, worker `25/25`, migrações `30/30`, decisões críticas `7/7`, typecheck/lint, governanças, documentação e ratchet `152/128`. O resultado não promove score, release, `0/145`, U95-108 ou U95-109; permanecem os gaps de prova por linha, as `22` funções >100 e o bloqueio versionado de U95-107.

**Verificação final (2026-08-16T14:50:01-03:00):** a revisão corrigiu a marcação do cleanup da imagem sintética após `docker commit`/`inspect`; os focais e `pnpm verify` passaram novamente com `177/806/18`, cobertura `84,55%`/`80,05%`/`86,58%`/`85,36%` e ratchet `152/128`. Nenhum status de produto, score, release ou `0/145` foi promovido.

**Verificação U95-111 (2026-08-16T15:35:39-03:00):** evidência local em `docs/127_dual_95_u95_111_api_dispatcher_evidence_2026-08-16.md`; a seleção canônica cobre `57/57` rotas → grupo do dispatcher, enquanto os matchers individuais e os gates de RC/reautoria permanecem explicitamente abertos.

**Verificação U95-112 (2026-08-16T16:04:30-03:00):** evidência local em `docs/128_dual_95_u95_112_persistence_integrity_evidence_2026-08-16.md`; a rodada cobre contexto de auditoria no mesmo transaction executor, conflitos concorrentes normalizados e restore com invariantes fail-closed. Os testes live foram somente temporários/sintéticos e não fecham backup/PITR/RPO/RTO/DR, HA de produção, RC, U95-107, U95-108, U95-109 ou `0/145`.

**Verificação U95-114 (2026-08-16T17:31:01-03:00):** evidência local em `docs/130_dual_95_u95_114_coverage_e2e_evidence_2026-08-16.md`; a cobertura agora mede a produção web e o caminho ativo atual foi exercitado até PostgreSQL HA local. O resultado é parcial: cobertura global `84,47%` statements e só Chromium foi executado; não fecha ≥90%, os pisos críticos, cross-browser/mobile, RC imutável, produção ou gates externos.

**Verificação U95-110 (2026-08-16T15:09:12-03:00):** evidência local em `docs/126_dual_95_u95_110_type_safety_contracts_evidence_2026-08-16.md`; o escopo de dashboard e transações está verde localmente, enquanto contratos das demais superfícies por papel, RC imutável, U95-108/U95-109, U95-107 e rastreabilidade `0/145` seguem abertos.

**Atualização U95-105 (2026-08-16T13:21:48-03:00):** D95-H05 foi tratado localmente com fixture live explícita e caso negativo do reviewer divergente; D95-H06 permanece aberto e a conclusão depende de RC imutável/ambiente aprovado, sem alterar score, `0/145` ou `PILOT_BLOCKED`.

**Baseline canônica:** `BRIEFING/04.AUDIT/0491_full_construction_audit.md` — 16 itens entre 65 e 95, nota ponderada 83/100, release/piloto/publicação clínica não aprovados.

**Baseline de qualidade independente:** `docs/116_code_quality_audit_2026-08-16.md` — 16 itens entre 40 e 86, nota `64,20/100`, segurança/operação/release em `FAIL` e sem promoção pós-corte.

**Atualização Dual99 — 2026-08-20T11:59:51-03:00:** B99-201 foi concluída
localmente sob RED/GREEN/REFACTOR. O outbox agora rejeita ACK/retry de tentativa
ou lease stale, usa relógio atual no ACK e executa cleanup bounded de eventos
terminais; a integração PostgreSQL cobre cleanup real e reclaim, mas permanece
guardada (`3` testes) sem ambiente live autorizado. Foco worker/persistência
`38/246`, cobertura `202/1067/21` (`95,03/90,99/95,32/95,71`), build `12/12`,
decisões `7/7`, mutation `7/7`, migrations `33/33`, skips `20/20`, documentação,
traceability, Dual99, risk, architecture, hotspots, exposição, edge security,
audit de dependências, lint, typecheck, formato e diff-check passaram. O código
foi publicado em `388db21d262eb10bbaebcaae25559997c04556ca`; B99-201 está
`READY_FOR_NEXT_STEP` localmente e o programa continua `IN_PROGRESS` /
`PILOT_BLOCKED`.

**Atualização Dual99 — 2026-08-20T12:09:09-03:00:** B99-202 recebeu
caracterização TDD de recuperação: durante falha de dependência o worker
permanece fechado e não processa; só após nova verificação saudável e novo
claim→ACK o batch é retomado. `pnpm test:worker` passou `50/50`, os focos
health/main/active-HA `28/28`, `pnpm test:coverage` passou `202/1068/21` com
`95,03/90,99/95,32/95,71`, build `12/12` e `pnpm ops:verify-ha` confirmou as
réplicas A/B. A prova contra runtime HA/API/DB ativo permanece pendente;
B99-202 está `READY_FOR_NEXT_STEP` localmente, programa
`IN_PROGRESS/PILOT_BLOCKED`, teste publicado em
`8f40c41ca090e26fe1ccb7e87e409c1cde8cd7b7`.

**Atualização Dual99 — 2026-08-20T12:25:25-03:00:** B99-203 adicionou o gate
read-only da API Prometheus e o teste semântico pinado. `promtool` confirmou
`14` rules e disparou cinco cenários sintéticos: API/worker down, API/worker
absent e Alertmanager desconectado. O runtime local confirmou `14/14`
`health=ok`, `cvg-api 2/2`, `cvg-worker 2/2`, `alertmanager 1/1`, Alertmanager
ativo e watchdog `firing`; os arquivos montados no container têm os mesmos
hashes do worktree. Foco `4/4`, cobertura `203/1072/21`, floors
`95,03/90,99/95,32/95,71`, build `12/12`, contrato CI, governança, topologia,
lint, typecheck e formato passaram. Sem fault injection no HA ativo, o
snapshot saudável não simula firing down/absent; notify→ack→resolve externo,
dead-man externo, RC, secret manager, clínica, `0/145` e reauditoria seguem
abertos. B99-203 está `READY_FOR_NEXT_STEP` localmente, programa
`IN_PROGRESS/PILOT_BLOCKED`, código publicado em `e913d23`; próxima ação
local: B99-204.

**Atualização Dual99 — 2026-08-20T12:50:47-03:00:** B99-204 fechou
localmente a correlação e redaction de observabilidade: logs e spans carregam
IDs técnicos sanitizados, API e worker compartilham trace ID derivado da
correlation, OTLP não exporta payload, Tempo fixa retenção local de `336h` e o
verificador live encontrou trace sintético persistido. O Alertmanager local
passou firing→silence acknowledgement→resolve com alerta sintético único e
sem alerta ativo ao final. Focos de observabilidade, worker, API, governança e
ciclo passaram; a retenção Prometheus local é `15d`. O runtime HA ativo ainda
monta configuração/SHA anterior, e notificação externa, RBAC/on-call,
retenção/acesso de fornecedor, PostgreSQL live, RC, secret manager, clínica,
`0/145` e reauditoria seguem abertos. B99-204 está `READY_FOR_NEXT_STEP`
localmente; programa `IN_PROGRESS/PILOT_BLOCKED`.

**Publicação B99-204 — 2026-08-20T13:10:31-03:00:** código, testes e
verificadores foram commitados como
`12f93266a3d8a1f5fd4e4a5a38d55b6e01e8a7ac` (`feat: verify observability
correlation lifecycle`) e enviados para `origin/agent/publish-production-hardening`.
O status permanece `IN_PROGRESS/PILOT_BLOCKED`; gaps externos, runtime HA
stale, PostgreSQL live, RC, clínica, `0/145` e reauditoria continuam abertos.

**Atualização Dual99 — 2026-08-20T13:30:56-03:00 — B99-205:** RED reproduziu
que o probe de readiness capturava o relógio antes do insert PostgreSQL,
podendo fazer claim antes de `available_at DEFAULT NOW()` ser elegível. GREEN
captura o relógio de claim depois do insert. O foco passou `14/14`; a
integração descartável PostgreSQL/Qdrant passou `4/4`, cobrindo claim/lease/ack,
cleanup, divergência, órfão, replay e retirada. `pnpm reconcile:qdrant` passou
duas vezes com `expected=1/upserted=1/removed=0` e depois
`expected=1/upserted=0/removed=0`, sem payload; coverage passou `204/1078/21`
com floors `95,00/90,87/95,29/95,69`. B99-205 está
`READY_FOR_NEXT_STEP` localmente; o programa permanece
`IN_PROGRESS/PILOT_BLOCKED` e os gates externos, RC, clínica, `0/145` e
reauditoria continuam abertos. Código publicado em
`43de2a2ff575c4fd9e11153a575c8dfbbb858008`.

**Atualização Dual99 — 2026-08-20T13:51:48-03:00 — B99-307:** o gate de
migrations agora rejeita `TRUNCATE`, `DELETE`, `SET NOT NULL` sem guarda de
backfill e coluna obrigatória sem `DEFAULT`; a checagem está no `pnpm verify`.
O foco passou `8/8`, as migrations passaram `33/33`, PostgreSQL descartável
aplicou a cadeia inteira e restore isolado passou `2/2`. Coverage passou
`204/1080/21` com floors `95,00/90,87/95,29/95,69`; build `12/12`, contratos
`84/84`, worker `51/51`, decisões `7/7` e mutation `7/7` passaram. B99-307 fica
`READY_FOR_NEXT_STEP` localmente; rollout N/N-1 no RC, produção e demais gates
externos permanecem abertos. Código publicado em `8440f09`; próxima frente
local: B99-308.

**Atualização Dual99 — 2026-08-20T14:04:49-03:00 — B99-308:** o inventário
canônico agora exige request contract, handler group válido e combinação
coerente de autenticação/escopo; as rotas de revogação e rotação de sessão
passam por `requirePrincipal`. A prova de integração percorreu as `57/57`
rotas na borda HTTP, confirmou zero fallthrough `404`, `401/403` sem principal,
`422` para as duas entradas públicas inválidas, templates de telemetria e
negativos de método/caminho. Focais `4/4` de contratos, `5/5` de inventário e
`60/60` de API passaram; cobertura `204/1083/21` em
`95,01/90,89/95,29/95,70`, build `12/12`, contratos `84/84`, decisões `7/7`,
mutation `7/7`, lint, typecheck, formato e hotspots passaram. B99-308 fica
`READY_FOR_NEXT_STEP` localmente; secret scan, HA/API/DB ativo, RC, clínica,
`0/145`, gates externos e reauditoria continuam abertos. Código publicado em
`31fed87`; próxima ação é obter os ambientes e aprovações externas sem alterar
`IN_PROGRESS / PILOT_BLOCKED`.

## 2026-08-16T11:49:35-03:00 — U95-101 / renderer Prometheus

- **concluído:** HELP/TYPE passou a ser único por família, séries/labels têm ordering determinístico, counters são expostos com `_total` e histogramas com tipo `histogram`/unidade `seconds`;
- **verificação:** RED/GREEN; observability `13/13`, worker `1/1`, API `71/71`, governança observability passou e `promtool check metrics` aceitou payload com duas séries/labels;
- **limite:** observabilidade runtime A/B, rules/Alertmanager efetivos e fire→ack→resolve continuam no U95-102; D95-H01 não promove score, release ou `PILOT_BLOCKED`.

## 2026-08-16T12:10:55-03:00 — U95-102 / observabilidade runtime

- **concluído:** helper de segredo sem rede prepara volume `0440` para Prometheus `65534:65534`; Prometheus/Alertmanager têm readiness gates e o Prometheus aguarda API/worker A/B saudáveis;
- **verificação:** RED `1/6` → GREEN `6/6`; `pnpm ops:verify-ha`, build local, `promtool` config/rules/metrics e `amtool` passaram; cinco targets `up`, 7 rules `health=ok`, bearer negativo `401` e fire→ack→resolve sintético;
- **evidência:** `docs/119_dual_95_u95_102_observability_evidence_2026-08-16.md`;
- **limite/status:** U95-102 e D95-H02 estão concluídos localmente, condicionados à revalidação em RC imutável/ambiente aprovado; próximo U95-103; H03–H06, score `64,20/100`, `0/145` e `PILOT_BLOCKED` permanecem.

## 2026-08-16T12:55:43-03:00 — U95-103 / atomicidade da autoria

- **concluído:** review + decisão e authorize + publish compartilham uma transação PostgreSQL; idempotência por `correlationId`/fingerprint impede duplicidade e conflito fail-closed;
- **verificação:** fault injection após a segunda transição fez rollback integral nos dois fluxos; retry retornou resposta igual; teste live PostgreSQL `1/1`, unitários `14/14`, migração `0029`, API/worker A/B `healthy` e `pnpm ops:verify-ha` passaram;
- **evidência:** `docs/120_dual_95_u95_103_authoring_atomicity_evidence_2026-08-16.md`;
- **limite/status:** U95-103 e D95-H03 estão concluídos localmente, condicionados à revalidação em RC imutável/ambiente aprovado; próximo U95-104; H04–H06, score `64,20/100`, `0/145` e `PILOT_BLOCKED` permanecem.

## 2026-08-16T13:13:20-03:00 — U95-104 / aprovador clínico corrente

- **concluído:** publicação exige `approvedClinicalApproverId`, a rota bloqueia ausência/vazio de `CLINICAL_APPROVER_ID` e o use case compara o ID corrente ao `reviewerId` persistido antes da transição; o ID também entra no fingerprint de idempotência;
- **verificação:** RED `3` falhas → GREEN; focais `74/74`, integração PostgreSQL `1/1`, divergência/rotação `state_conflict`, caminho correto + replay, `pnpm test:coverage` e `pnpm verify` passaram com `80,05%` de branches;
- **evidência:** `docs/121_dual_95_u95_104_current_clinical_approver_evidence_2026-08-16.md`;
- **limite/status:** U95-104 e D95-H04 estão concluídos localmente, condicionados à revalidação em RC imutável/ambiente aprovado; próximo U95-105; H05–H06, score `64,20/100`, `0/145` e `PILOT_BLOCKED` permanecem.

## 2026-08-16T13:21:48-03:00 — U95-105 / fixture PostgreSQL autoral

- **concluído:** fixture live declara autor/aprovador/participante sintéticos, usa `approvedClinicalApproverId` designado e separa role administrativa de setup/teardown da role da aplicação;
- **verificação:** suíte live `1/1` sem skip; reviewer divergente retorna `forbidden` antes de transição e o caminho correto passa com fault/replay/teardown; focais HTTP/aplicação `74/74` e `pnpm verify` passam;
- **evidência:** `docs/122_dual_95_u95_105_postgres_authoring_fixture_evidence_2026-08-16.md`;
- **limite/status:** U95-105 e D95-H05 estão concluídos localmente, condicionados à revalidação em RC imutável/ambiente aprovado; próximo U95-106; H06, score `64,20/100`, `0/145` e `PILOT_BLOCKED` permanecem.

## 2026-08-16T13:40:08-03:00 — U95-106 / gate de saúde de workers no release

- **concluído:** deploy e rollback compartilham a lista canônica de `api-a`, `api-b`, `worker-a` e `worker-b`; cada serviço precisa estar `running/healthy`, e o edge só é promovido depois do gate completo;
- **verificação:** RED/GREEN `9/9`; cada processo foi injetado como `unhealthy`, com casos adicionais de `worker-a` parado e `worker-b` ausente; rehearsal local passou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`; fault injection live de `worker-a` falhou fechado e a restauração ficou saudável; `pnpm verify` passou com `801` testes e `80,05%` de branches;
- **evidência:** `docs/123_dual_95_u95_106_worker_health_gate_evidence_2026-08-16.md`;
- **limite/status:** U95-106 e D95-H06 estão concluídos localmente, condicionados à revalidação no RC imutável/ambiente aprovado; próximo U95-107; score `64,20/100`, `0/145` e `PILOT_BLOCKED` permanecem.

## 2026-08-16T11:38:28-03:00 — U95-003 / inventário integral do worktree

- **evidência:** `docs/118_dual_95_worktree_inventory_2026-08-16.md` lista e classifica as `221` entradas correntes (`116` modificadas rastreadas + `105` não rastreadas) por origem, área, risco, segredo/dado, ownership, intenção de commit e lote reversível;
- **controles:** `pnpm verify:secrets` retornou `secret scan: clean`; `git diff --check` passou; nenhuma alteração foi staged ou commitada;
- **revalidação documental:** `verify:documentation`, `verify:traceability`, `verify:premium-traceability` e JSON do registry passaram; o registry canônico não aponta para o inventário enquanto ele permanece não rastreado;
- **resultado:** `U95-003` está `COMPLETED`; os seis `D95-H01–H06`, `0/145`, as baselines `83,24/100`/`64,20/100` e `PILOT_BLOCKED` permanecem sem promoção;
- **próximo:** executar `U95-101–106` com RED→GREEN→REFACTOR, security review e fault injection.

## 2026-08-16T11:25:39-03:00 — Gate documental Dual 95

- **checks:** documentation, traceability, premium traceability, product definition, Prettier focal e diff-check passaram;
- **estado corrente:** `221` entradas no worktree; `145/145` evidências locais; `0/145` cadeias completas;
- **status/next:** `READY_FOR_NEXT_STEP` / `PILOT_BLOCKED`; iniciar `U95-003`, depois `U95-101–106`.

## 2026-08-16T11:15:29-03:00 — DUAL95 / F0

- **concluído:** `U95-000`, `U95-001` e `U95-004` — rubricas separadas, fatos reconciliados, schema de evidência e gates `G95-0–7` publicados;
- **próximo:** `U95-003` — revisar/classificar as `221` entradas correntes do worktree, sem apagar alterações existentes;
- **P0 local pronto para execução:** `U95-101–106` — Prometheus multi-série, scrape/rules/Alertmanager, atomicidade clínica, vínculo ao aprovador atual, fixture PostgreSQL e health dos workers em deploy/rollback;
- **P1 local pronto:** `U95-108–116` — matriz de risco, hotspots, type safety, API, persistência, frontend, cobertura/E2E, resiliência e achados médios; `U95-107` permanece parcial por falta de artefato histórico versionado compatível;
- **bloqueado por dependência:** `U95-117`, `U95-202–204`, `U95-306`, `U95-405`, `U95-454/456`, `U95-501/502`;
- **aguarda aprovação humana/externa:** `U95-002`, `U95-201`, `U95-301–305`, `U95-401/402`, `U95-451–455`, `U95-503–505`;
- **limites:** `83,24/100`, `64,20/100`, `1/32`, `0/145` e `PILOT_BLOCKED` permanecem; E2E `26/26` sem API `3101` é regressão web, não HA.

## 2026-08-14T15:57:52-03:00 — 16.35 Rechecagem do CI remoto

- **evidência:** os runs `31402470511`/job `93500569913` e `31402464508`/job `93500550866` continuam `FAILURE` no head remoto `d3964a9e45b624a4e3c3967ca8f684cb00210e8c`, ambos em `verify:clinical-sources` por ausência de `BOOK_ETTINGER_9E`, `BOOK_FOSSUM_4E` e `BOOK_JERICO_CAES_GATOS`;
- **local:** a rechecagem encontrou o worktree limpo no commit documental `08c0aa8`; o registro foi consolidado depois sem publicação remota, o RC executável local segue no SHA `8859c6c1ae1f11ff9a0ae55f79027469aaf21ee6` e a correção para bundle externo/licenciado não foi publicada;
- **limite:** nenhum push, dispatch ou provisionamento foi executado; `0/145`, bundle/licença, CI/registry/deploy externo, revisão clínica, identidade, edge público, backup, UAT, soak, DR e reauditoria continuam abertos;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; aprovar insumos/provedores e autorização de publicação antes de executar o CI no mesmo RC.

## 2026-08-14T16:07:16-03:00 — 16.36 Auditoria live do RC vigente

- **evidência:** proveniência `PASS` nos quatro containers no SHA `8859c6c1ae1f11ff9a0ae55f79027469aaf21ee6`/digest `sha256:e5d9d7a2c6673f5988919a3708f8f7816aea97989fac8c0bf7b681f318f22b94`; HA, edge, health local `200/200/200`, HTTPS local `200/200`, `pnpm verify` `163/720/18` e E2E HA `3/3` passaram;
- **limite:** gates honestos continuam `PASS_WITH_GAPS`: `763` revisões clínicas planejadas, `0/145` cadeias completas, observabilidade externa não configurada, cinco gaps WCAG manuais, soak não executado, CI remoto falho e produção não comprovada;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; executar gates externos/humanos no mesmo RC após autorização e provisionamento.

## 2026-08-14T16:09:22-03:00 — 16.37 Prontidão dos gates externos

- **evidência:** `ops:verify-identity-provider` e `ops:verify-production-security` retornaram `NOT_EXECUTED` fora do ambiente aprovado, sem exibir segredos;
- **interpretação:** IdP/MFA/recovery, origem HTTPS pública, storage/retention, backup/chave e release/rollback produtivos continuam sem prova real;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; provisionar/aprovar provedores e executar os probes no mesmo RC.

## 2026-08-14T16:11:08-03:00 — 16.38 Inventário remoto de CI e release

- **evidência:** GitHub read-only retornou `0` secrets, `0` variables, `0` environments, `0` deployments e somente workflow `quality`;
- **interpretação:** manifesto local não equivale a registry/runner/deploy/rollback produtivos; os checks remotos seguem falhos no head antigo;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; definir provedor, ambientes e referências seguras e executar o mesmo RC após autorização.

## 2026-08-14T16:13:42-03:00 — 16.39 Diagnóstico detalhado do CI remoto

- **evidência:** `format:check` e `verify:ci-contract` passam nos logs remotos; `verify:clinical-sources` falha pelos três arquivos licenciados ausentes no head `d3964a9e…`;
- **limite:** passos posteriores foram pulados; a correção local de bundle externo não foi publicada nem validada remotamente;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; aprovar bundle/licença e push, executar CI no mesmo RC e reauditar.

## 2026-08-14T13:32:36-03:00 — RELEASE-PRIMITIVES-RECHECK-124

- **evidência:** `pnpm ops:verify-release-manifest` passou; `pnpm ops:deploy-release` e `pnpm ops:rollback-release` passaram em `DRY_RUN`; `pnpm ops:verify-production-security` permaneceu `NOT_EXECUTED` sem ambiente produtivo aprovado; worktree limpo no HEAD `eb3ad76ebbd7f9e189907fb263009bf6f3a9137a`;
- **interpretação:** manifesto, canário, digest e rollback possuem contrato local fail-safe; não há prova de CI remoto, registry, deploy ou rollback produtivos;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` e `0/145` cadeias completas preservados;
- **próxima ação:** Ricardo aprovar alvo/provider/FQDN/IdP/storage/registry e janela de mudança; depois executar o gate externo e reauditar o mesmo RC.

## 2026-08-14T13:39:26-03:00 — LIVE-CLINICAL-QUEUE-RUNTIME-126

- **evidência:** health live/ready/dependencies `200/200/200`; `pnpm ops:verify-ha` e `pnpm ops:verify-edge-security` passaram; fila PostgreSQL live `796` total, `763` pendentes/não revisados, `0` aprovados, `0` ajustes e `0` falhas técnicas;
- **gate estrito:** falhou corretamente com `clinical review queue is incomplete: 763 pending items` e exit `1`, sem publicar ou alterar conteúdo;
- **interpretação:** BLK-01 está tecnicamente pronto para beta, mas não resolvido; a revisão será executada por veterinários autorizados em lotes auditáveis;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` e `0/145` cadeias completas preservados;
- **próxima ação:** aprovar roster/T0/ambiente clínico, executar calibração e lotes, depois revalidar o gate estrito e os demais gates no mesmo RC.

## 2026-08-14T13:51:47-03:00 — LOCAL-RC-PROVENANCE-REBUILD-127

- **evidência:** o rehearsal foi auditado e a imagem `cvg-trainee-vet:local` com `CVG_SOURCE_SHA=unknown` foi descartada como prova; a imagem foi reconstruída do HEAD `2e7a96b39c60139fc0bd0c642fb77800f5c6c00a` como `cvg-trainee-vet:rc-head-2e7a96b39c60`, digest `sha256:6d0d64b722a45d307ea36b9bbfbb4946b3ba4d0e2d0255e00e3aebb610898e27`;
- **runtime:** API-A/API-B e worker-A/worker-B reportaram o mesmo SHA/digest; health `200/200/200`, `pnpm ops:verify-ha` e `pnpm ops:verify-edge-security` passaram;
- **clínico:** fila live `796` total, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; o gate estrito falhou corretamente, sem publicação;
- **interpretação:** BLK-06 local corrigido e reforçado; o rehearsal não prova CI/registry/deploy/rollback produtivos, e retenção Tempo continua somente local;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` e `0/145` cadeias completas preservados;
- **próxima ação:** não aceitar drift em novo probe; provisionar os gates externos/humanos e reauditar o mesmo RC.

## 2026-08-14T14:04:54-03:00 — LOCAL-REHEARSAL-SHA-GUARD-128

- **entrega:** `scripts/local-release-rehearsal.mjs` agora exige `CVG_SOURCE_SHA`, valida o label OCI da imagem e restaura por `image@digest`; `unknown`/mismatch falham antes de qualquer execução Docker;
- **checks:** testes focais `6/6`, ausência de SHA falhou fail-closed, rehearsal com SHA válido passou `deploy=PASS`, `rollback=PASS` e `runtimeRestored=true`;
- **runtime:** commit executável `e70d3f415f38a5443a059c9800d023f95949957f`, digest comum `sha256:63ac637774932b127f584745fda236bdc99a61c0a6a4c8ac12ca675ee7b6597c`, quatro processos alinhados e health `200/200/200`;
- **limite:** BLK-06 local reforçado; CI/registry/deploy/rollback produtivos, gates clínicos/externos, UAT e `0/145` continuam pendentes;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` preservada;
- **próxima ação:** usar o RC `e70d3f4` como referência somente após provisionar as autorizações/ambientes externos e a coorte beta.

## 2026-08-14T14:09:16-03:00 — REMOTE-CI-INVENTORY-129

- **evidência:** PR `#1` aberto no head remoto `d3964a9e45b624a4e3c3967ca8f684cb00210e8c`; dois checks `quality` em `FAILURE`; inventário GitHub com `0` secrets, `0` variables, `0` environments e `0` deployments;
- **interpretação:** BLK-05/B-G5 continuam sem CI/registry/deploy/rollback produtivos; RC `e70d3f4` não foi publicado;
- **restrição:** nenhuma escrita, push ou trigger remoto foi executado;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` e `0/145` cadeias preservados;
- **próxima ação:** aprovar/provisionar bundle licenciado, runner, variáveis, registry e ambiente de promoção, depois reexecutar e reauditar.

## 2026-08-14T07:42:06-03:00 — TRACEABILITY-EVIDENCE-BATCH-098

- **status:** RF-057/RF-058 implementados localmente com evidência focalizada; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** interação estruturada e dose/infusão com avaliação automática, caso digital M24 persistente e versionado, projeção pública segura, migration `0023`, RLS, API GET/POST e tela do participante para registrar o avanço da etapa;
- **checks:** 6 arquivos/79 testes focalizados, typecheck/build dos workspaces afetados, inventário da API, migrations 24/24, rastreabilidade e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `135/145` evidências locais, `82/87` P0/P1, `10` gaps de elo e `145/145` commits/SHA pendentes;
- **limite:** evidência local e sintética no worktree; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** reexecutar `pnpm verify` integral e executar os 10 gaps locais restantes (`RF-063`, `RF-072`, `RF-073`, `RF-093`, `RF-094`, `RNF-012`, `RNF-072`, `RNF-075`, `RNF-084`, `RNF-086`) com TDD e revisão de segurança.

## 2026-08-14T07:51:44-03:00 — FULL-LOCAL-VERIFICATION-099

- **status:** verificação integral pós-RF-057/RF-058 concluída com sucesso; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** 138 arquivos/639 testes/18 skips; cobertura 85,28% statements / 81,36% branches / 86,88% functions / 85,99% lines; migrations 24/24; todos os gates locais do `pnpm verify` passaram;
- **correções de consistência:** inventário M24 e ordem de risco atualizados, inventário da API ajustado para 50 rotas e lint/typecheck de tipos e fixtures corrigidos;
- **resultado:** `0/145` cadeias completas, `135/145` evidências locais, `82/87` P0/P1, `10` gaps de elo e `145/145` commits/SHA pendentes;
- **limite:** nenhum score, release, piloto ou publicação clínica foi promovido; os gates externos, clínicos, humanos, UAT/DR e RC/SHA continuam pendentes;
- **próxima ação:** executar os 10 gaps locais restantes com evidência requisito-específica e manter em paralelo BLK-01…BLK-08.

## 2026-08-14T08:24:53-03:00 — ACTIVE-HA-RUNTIME-100

- **status:** runtime HA local reconciliado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** teardown do fixture corrigido para estados curriculares, atribuições e caso digital; imagem consolidada em build único; web reconstruído para o edge loopback `:3182`; credencial local de métricas rotacionada após diagnóstico;
- **checks:** migração 0023 aplicada; quatro processos saudáveis no mesmo digest; readiness/dependencies 200; E2E ativo real 3/3 com teardown código 0; dashboard/acessibilidade 7/7; build dos 12 workspaces e `pnpm audit --prod --audit-level high` passaram;
- **resultado:** rastreabilidade continua em `135/145` evidências locais, `82/87` P0/P1, `10` gaps de elo, `0/145` cadeias completas e `145/145` commits/SHA pendentes;
- **limite:** worktree e origem continuam dirty; runtime local não substitui RC/SHA, CI, deploy, rollback, revisão clínica, UAT, DR ou gates externos;
- **próxima ação:** executar os 10 gaps locais restantes e manter os bloqueios externos, clínicos, humanos e de release explícitos.

## 2026-08-14T08:44:18-03:00 — FULL-LOCAL-VERIFICATION-102

- **status:** verificação integral após higiene do fixture concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** fixture E2E limitado ao namespace sintético `real-e2e-*`; runtime HA consolidado no digest `sha256:e9401f16ab08bcef018c916967990ef41cfb648fc4c055c49d40dab0702007f2`; E2E real 3/3 e resíduos sintéticos escopados em zero;
- **checks:** `pnpm verify` passou com 138 arquivos/639 testes/18 skips e cobertura 85,28% statements / 81,36% branches / 86,88% functions / 85,99% lines; contratos 66/66, worker 24/24, migrations 24/24, secrets, documentação, produto e fronteira pública passaram;
- **resultado:** `0/145` cadeias completas, `135/145` evidências locais, `82/87` P0/P1, `10` gaps de elo e `145/145` commits/SHA pendentes; score oficial 83,24/100 sem promoção;
- **limite:** limpeza sintética e verificação local não substituem worktree/SHA aprovado, revisão clínica dos 763 conteúdos, IdP/MFA, DNS/TLS, backup/DR, CI/registry/deploy/rollback, UAT, WCAG manual, Web Vitals, soak ou aprovação humana;
- **próxima ação:** executar os 10 gaps locais com TDD/evidência direta e aguardar os ambientes/autorizações dos gates externos, clínicos, humanos e de release.

## 2026-08-14T08:46:10-03:00 — WEB-RUNTIME-VERIFICATION-103

- **status:** confirmação web e de serviços concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** Playwright dashboard/acessibilidade 7/7; serviço web systemd ativo; web HTTP 200; `/health/dependencies` HTTP 200; API-A/API-B e worker-A/worker-B saudáveis no digest comum `sha256:e9401f16ab08bcef018c916967990ef41cfb648fc4c055c49d40dab0702007f2`;
- **resultado:** experiência web automatizada reproduzível no runtime local; score 83,24/100 e release/piloto/publicação clínica sem promoção;
- **limite:** não substitui WCAG manual, Web Vitals reais, UAT, soak, DR, CI/deploy/rollback, RC/SHA, revisão clínica ou aprovação humana;
- **próxima ação:** fechar os 10 gaps locais com TDD/evidência direta e aguardar os gates externos, clínicos, humanos e de release.

## 2026-08-14T04:56:03-03:00 — TRACEABILITY-EVIDENCE-BATCH-087

- **status:** RF-071 concluído localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** recomendações allowlisted no dashboard do participante, com contrato estrito, TDD e E2E ativo;
- **checks:** testes focalizados 6/6, E2E 1/1, typecheck, lint, Prettier, `pnpm verify:traceability` e `pnpm verify:premium-traceability` passaram;
- **resultado:** `0/145` cadeias completas, `127/145` evidências locais, `74/87` P0/P1, `18` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** nenhum score, release, piloto ou publicação clínica foi promovido; os gates externos, clínicos, humanos e de RC/SHA permanecem abertos;
- **próxima ação:** executar os 18 gaps locais restantes com evidência requisito-específica e revalidar integralmente antes de qualquer promoção.

## 2026-08-14T05:09:07-03:00 — TRACEABILITY-EVIDENCE-BATCH-089

- **status:** RF-082 concluído localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** leitura interna da trilha append-only com autorização de auditor/admin, contrato estrito, persistência RLS read-only e rota inventariada;
- **checks:** testes focalizados 56/56, typecheck, lint, Prettier e verificadores de rastreabilidade passaram;
- **resultado:** `0/145` cadeias completas, `128/145` evidências locais, `75/87` P0/P1, `17` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** reexecutar a suíte integral, atualizar a fotografia operacional e continuar os 17 gaps restantes.

## 2026-08-14T05:11:05-03:00 — FULL-LOCAL-VERIFICATION-090

- **status:** verificação integral pós-RF-082 concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 129 arquivos/589 testes/18 skips e cobertura 86,39% statements / 82,27% branches / 87,16% functions / 87,11% lines; `git diff --check` passou;
- **resultado:** `0/145` cadeias completas, `128/145` evidências locais, `75/87` P0/P1, `17` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; revisão dos 763 conteúdos, gates externos, UAT e RC/SHA continuam pendentes;
- **próxima ação:** executar os 17 gaps locais restantes com evidência requisito-específica e aguardar autorizações/ambientes para fechar BLK-01…BLK-08 no mesmo RC/SHA.

## 2026-08-14T05:23:31-03:00 — TRACEABILITY-EVIDENCE-BATCH-091

- **status:** RF-107 concluído localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** contexto técnico mínimo allowlisted no fluxo de relatos, com contrato estrito, validação de domínio, migração PostgreSQL 0019, mapeamento persistente e projeção HTTP;
- **checks:** testes focalizados 78/78, typecheck, lint, Prettier, migrações, rastreabilidade e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `129/145` evidências locais, `76/87` P0/P1, `16` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** query strings, campos arbitrários, identificadores de paciente/tutor e anexos não fazem parte do contrato; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** reexecutar a suíte integral, atualizar a fotografia operacional e continuar os 16 gaps restantes.

## 2026-08-14T05:27:19-03:00 — FULL-LOCAL-VERIFICATION-092

- **status:** verificação integral pós-RF-107 concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 132 arquivos/595 testes/18 skips e cobertura 86,40% statements / 82,25% branches / 87,21% functions / 87,09% lines; `git diff --check` passou;
- **resultado:** `0/145` cadeias completas, `129/145` evidências locais, `76/87` P0/P1, `16` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; revisão dos 763 conteúdos, gates externos, UAT, DR e RC/SHA continuam pendentes;
- **próxima ação:** executar os 16 gaps locais restantes com evidência requisito-específica e aguardar autorizações/ambientes para fechar BLK-01…BLK-08 no mesmo RC/SHA.

## 2026-08-14T05:56:10-03:00 — TRACEABILITY-EVIDENCE-BATCH-093

- **status:** RF-103/RF-104 concluídos localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** lista de feedback participant/staff por escopo, projeções com redaction, capability de leitura, RLS staff read-only e workflow de triagem com prioridade, atribuição, resposta e histórico imutável na migração 0020;
- **checks:** testes focalizados 83/83, typecheck, lint, Prettier, migrations 21/21, hotspots, rastreabilidade, cobertura integral 606/18 skips e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `131/145` evidências locais, `78/87` P0/P1, `14` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** RF-103/RF-104 permanecem `MAPPED_PARTIAL`; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** iniciar RF-105/RF-106 com TDD, revisão de segurança e evidência requisito-específica; manter os gates externos e de RC/SHA abertos.

## 2026-08-14T06:07:56-03:00 — FULL-LOCAL-VERIFICATION-094

- **status:** verificação integral pós-RF-103/RF-104 concluída com `exit 0`; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** 134 arquivos/606 testes/18 skips e cobertura 86,53% statements / 82,28% branches / 87,30% functions / 87,26% lines; migrações 21/21, decisões críticas, documentação, arquitetura, hotspots, rastreabilidade, lint, typecheck e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `131/145` evidências locais, `78/87` P0/P1, `14` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; revisão dos 763 conteúdos e gates externos, humanos, UAT/DR e RC/SHA continuam pendentes;
- **próxima ação:** iniciar RF-105/RF-106 com TDD e revisão de segurança, sem alterar a nota 83,24/100 nem o bloqueio de release/piloto.

## 2026-08-14T06:40:25-03:00 — TRACEABILITY-EVIDENCE-BATCH-095 / FULL-LOCAL-VERIFICATION-096

- **status:** RF-105/RF-106 implementados localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** retirada emergencial clínica com motivo, aprovador, contagem e participantes afetados persistidos; feedback com limite de 2.000 caracteres, bloqueio/redaction conservador e auditoria sem conteúdo bruto; migração 0021;
- **checks:** RED 6 suítes/8 falhas esperadas; GREEN 9 arquivos/99 testes focados; `pnpm verify` passou com 135 arquivos/621 testes/18 skips e cobertura 86,25% statements / 82,37% branches / 86,95% functions / 86,99% lines; migrações 22/22 e decisões críticas passaram;
- **resultado:** `0/145` cadeias completas, `133/145` evidências locais, `80/87` P0/P1, `12` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** RF-105/RF-106 continuam `MAPPED_PARTIAL` por commit/SHA e gates externos pendentes; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** executar os 12 gaps locais restantes com TDD, revisão de segurança e evidência requisito-específica, mantendo em paralelo BLK-01…BLK-08 e os gates clínicos/externos.

## 2026-08-14T06:43:41-03:00 — BUILD-LOCAL-097

- **status:** build local completo confirmado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `CVG_API_INTERNAL_URL=http://127.0.0.1:3000 pnpm build` passou nos 12 workspaces, incluindo as sete rotas web estáticas, API, worker e pacotes TypeScript;
- **limite:** evidência é local e não fecha DNS/TLS, registry, deploy, rollback, runtime por SHA, gates clínicos ou operação externa;
- **próxima ação:** executar os 12 gaps locais restantes com evidência requisito-específica e manter os gates externos/RC/SHA abertos.

## 2026-08-14T04:58:37-03:00 — FULL-LOCAL-VERIFICATION-088

- **status:** verificação integral pós-RF-071 concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 128 arquivos/583 testes/18 skips e cobertura 86,50% statements / 82,41% branches / 87,46% functions / 87,24% lines; E2E focalizado do dashboard 1/1 e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `127/145` evidências locais, `74/87` P0/P1, `18` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; revisão dos 763 conteúdos, gates externos, UAT e RC/SHA continuam pendentes;
- **próxima ação:** executar os 18 gaps locais restantes com evidência requisito-específica e aguardar autorizações/ambientes para fechar BLK-01…BLK-08 no mesmo RC/SHA.

**Aviso de reconciliação:** entradas históricas abaixo podem registrar notas 95 em recortes ou linguagem anterior sobre publicação automática. Elas não substituem a auditoria atual. O caminho vigente exige aprovação clínica humana de Ricardo, mantém 763 pendências e não altera nota até nova auditoria no mesmo SHA.

## ENT95-PROGRAM — Programa Premium Enterprise 95

- título: elevar cada um dos 16 itens da auditoria vigente para pelo menos 95/100
- descrição: executar sete fases, 14 sprints e 70 tasks com produto P0/P1 integral, fábrica clínica paralela, segurança, acessibilidade, operação, CI/CD e rastreabilidade enterprise
- módulo: programa / produto / conteúdo / plataforma / operação / qualidade
- dependência: `D-ENT-01` equipe/T0, `D-ENT-07` capacidade clínica e `D-ENT-09` envelope orçamentário; gates externos D-ENT-02–06 por frente
  - fase: BUILD — Premium Enterprise 95 / E0–E2 execução local controlada
- risco: crítico — declarar 95 por média ou recorte deixaria gaps clínicos, funcionais e operacionais ocultos
- impacto: alto
- status: WAITING_HUMAN_APPROVAL
- baseline: 83/100; nenhum score foi alterado pelo planejamento
- evidência: `BRIEFING/03.BUILD/0304_premium_enterprise_95_program.md`; `BRIEFING/04.AUDIT/0492_score_95_roadmap.md`; `BRIEFING/04.AUDIT/0493_score_95_backlog.md`; artifact `PREMIUM-ENTERPRISE-95-PROGRAM`
  - próxima ação: manter `ENT95-04-C` até saturação, soak, failover/recuperação e perfil/SLO aprovados; manter `ENT95-13-B` até evidência manual; fechar `ENT95-01-C`, `ENT95-14-C` e `ENT95-14-D` somente com aprovação/SHA/CI; Ricardo aprovar equipe, capacidade clínica, T0 e gates D-ENT-02–06; não liberar release, piloto ou publicação clínica.

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
- descrição: representar módulos, sessões, objetivos, audiência, comportamentos hospitalares, modalidades de avaliação, D+30/D+60/D+90, métrica de processo e regras de domínio; projetar alternativas simples/múltiplas sem campos internos; preparar seed versionado sem publicação automática
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
- resultado: preflight técnico passa, B-07 tem 120 itens e packs versionados cobrem o catálogo; diagnóstico não punitivo, remediação dirigida e D+30/D+60/D+90 estão modelados; o estado digital é persistido, versionado e projetado com segurança na API/web; o caminho ativo publica após a verificação automática de fonte
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

## 2026-08-11 — REMEDIATION-IDP-READINESS-PROBE

- **item:** impedir que URL/token presentes sejam confundidos com MFA e recuperação operacionais;
- **status:** COMPLETED tecnicamente / WAITING_HUMAN_APPROVAL para o IdP real;
- **evidência:** `scripts/verify-identity-provider-readiness.mjs` e `pnpm ops:verify-identity-provider` exigem flag explícita, principal de probe, HTTPS sem credenciais embutidas e resposta `EXTERNAL_IDENTITY_PROVIDER` + `AVAILABLE` + `ENABLED`; `tests/integration/identity-provider-readiness.test.ts` passou 5/5; o gate de produção agora executa o probe antes de retornar `PASS`;
- **limite:** nenhum provedor real foi consultado; enrollment, challenge, recovery codes, step-up, revogação, sincronização e E2E sandbox continuam pendentes;
- **próximo passo:** escolher o IdP/política, fornecer principal sintético e segredo pelo secret manager e executar a prova autorizada.

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

## 2026-08-11 — REMEDIATION-CLINICAL-REVIEW-UI

- **item:** tornar a revisão clínica humana executável e bloquear publicação até decisão explícita;
- **status:** COMPLETED tecnicamente / WAITING_HUMAN_APPROVAL para revisão dos 763 itens;
- **evidência:** `apps/web/app/authoring/page.tsx` exige justificativa, oferece `Aprovar clinicamente`/`Solicitar ajustes` e só habilita publicação em `APROVADO_CLINICAMENTE`; `tests/e2e/authoring-review.spec.ts` passou 1/1 com publicação desabilitada antes da aprovação e habilitada depois; typecheck web passou; commit `c7a591b`;
- **limite:** nenhum conteúdo foi aprovado automaticamente; 763 itens continuam `PROJECAO_VERIFICADA` e a revisão semântica/item a item de Ricardo permanece obrigatória;
- **próximo passo:** revisar os itens com aprovador independente e registrar cada decisão/rationale no PostgreSQL.

## 2026-08-11 — REMEDIATION-CLINICAL-REVIEW-QUEUE

- **item:** retirar a dependência operacional de `contentId` manual e medir de forma auditável os conteúdos aguardando revisão;
- **status:** COMPLETED tecnicamente / WAITING_HUMAN_APPROVAL para revisão dos 763 itens;
- **evidência:** `GET /api/v1/internal/authoring/review-queue` com paginação e capability `VIEW_CLINICAL_REVIEW_QUEUE`; `apps/web/app/authoring/page.tsx` lista a fila sem internals; `scripts/verify-clinical-review-queue.mjs` e `pnpm ops:verify-clinical-review-queue` observaram no PostgreSQL HA 796 itens, 763 pendentes, 763 sem revisão e 0 falhas de pré-voo; o modo estrito falhou com `clinical review queue is incomplete: 763 pending items`; E2E de autoria 2/2;
- **limite:** nenhum item foi aprovado ou publicado automaticamente; a revisão semântica independente e as decisões de Ricardo permanecem obrigatórias;
- **commit:** `8670def` (`feat: add clinical review queue`);

## 2026-08-11 — REMEDIATION-BACKUP-ARTIFACT-RESTORE

- **item:** validar o manifesto e o checksum do backup que será consumido, não apenas gerar um novo dump durante o drill;
- **status:** COMPLETED tecnicamente / WAITING_HUMAN_APPROVAL para backup e restore produtivos;
- **evidência:** `scripts/backup-artifact.mjs` valida nome, formato, tamanho, timestamp e SHA-256; `scripts/verify-postgres-restore.mjs` restaura `CVG_RESTORE_BACKUP_FILE` em banco descartável e confirma objetos restaurados; `tests/integration/backup-artifact.test.ts` passou 4/4; `pnpm test:integration:restore` passou 2/2 no HA ativo; execução direta observou artefato de 197.097 bytes, 27 objetos e RTO 2.357 ms;
- **limite:** agendamento, storage/criptografia/retenção externos, owner, RPO/RTO produtivo e autorização operacional continuam pendentes;
- **próximo passo:** registrar destino e política de backup aprovados e repetir o verificador com artefato do ambiente declarado.
- **plano:** `docs/106_clinical_review_queue_evidence_2026-08-11.md` e `BRIEFING/03.BUILD/0303_remediation_program.md`.

## 2026-08-11 — REMEDIATION-LOCAL-REVERIFICATION

- **item:** reexecutar os gates locais das limitações originais no runtime HA ativo e registrar evidência atual sem promover produção;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para gates externos e clínicos;
- **evidência:** `docs/109_remediation_local_reverification_2026-08-11.md`; E2E HA 2/2 com cleanup zero; `cvg_app` sem SUPERUSER/BYPASSRLS; 24 atribuições e 24 estados M01–M24; fila clínica com 763 pendentes e 0 falhas técnicas; headers live 200; trace após restart; HA e manifesto de release; load smoke 200/200 com p95 de 77,64 ms;
- **limite:** IdP/MFA/recovery real, domínio/certificado público, traces/backups externos, RPO/RTO produtivo, registry/deploy/rollback autorizado e aprovação clínica dos 763 itens permanecem sem prova;
- **próximo passo:** obter decisões/recursos externos e iniciar a revisão clínica item a item; depois executar os verificadores no ambiente declarado.

## 2026-08-11 — REMEDIATION-IDENTITY-LIFECYCLE

- **item:** completar o ciclo local provider-mediated de início e confirmação para recovery e MFA, sem armazenar códigos;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para IdP, sandbox e produção;
- **evidência:** `packages/application/src/identity-provider.ts` implementa `verifyMfaEnrollment` e `completeRecovery`; API autenticada e contratos bounded; `/account` mantém código somente em memória; `tests/e2e/account-security.spec.ts` passou 1/1; `docs/110_identity_provider_lifecycle_evidence_2026-08-11.md`; commit `e93f4d774b80ca920122e7ed09ffd106b66a83b5`;
- **limite:** não há prova de IdP/sandbox real, enrollment/challenge/recovery code real, step-up, revogação, sincronização de papéis, domínio/TLS público, traces/backups externos, RPO/RTO produtivo, deploy/rollback autorizado ou revisão dos 763 conteúdos;
- **próximo passo:** escolher provedor/política, fornecer segredo pelo secret manager e executar os fluxos autorizados em sandbox; manter o gate produtivo fechado até evidência externa.

## 2026-08-11 — REMEDIATION-CURRENT-AUDIT

- **item:** reauditar o estado atual das sete limitações originais após o hardening do boundary provider-mediated;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para publicação clínica e gates externos;
- **evidência:** `docs/111_current_remediation_audit_2026-08-11.md`; E2E HA real 2/2; `cvg_app` sem SUPERUSER/BYPASSRLS; 24 atribuições/24 estados M01–M24; fila 763 pendente/0 falhas; load 200/200; conta E2E 1/1; `pnpm verify` 448/18; commit `dfe58311156ca908082dbb2f16fa3a67b8b511c6`;
- **limite:** publicação clínica estrita permanece bloqueada por 763 itens; IdP/sandbox, domínio/certificado, traces/backups externos, RPO/RTO produtivo, deploy/rollback autorizado e aprovação clínica não têm prova;
- **próximo passo:** obter decisões e recursos externos, revisar os conteúdos com aprovador autorizado e repetir os gates estritos no ambiente declarado.

## 2026-08-11 — REMEDIATION-WEB-BUILD-CONTRACT

- **item:** impedir que um build web de produção pareça saudável sem o proxy server-side para API/health;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para ambiente produtivo;
- **evidência:** `apps/web/next.config.ts` falha fechado sem `CVG_API_INTERNAL_URL`; `apps/web/src/build-config.test.ts` passou 4/4; `.github/workflows/quality.yml` fixa o alvo CI; `scripts/verify-ci-contract.mjs` exige o contrato; build com URL explícita e E2E HA 2/2 passaram; commit `0db281bd3713f18ec2c05b06701750c69e202d7d`;
- **limite:** URL interna aprovada, domínio/TLS público, IdP, traces/backups externos, registry/deploy/rollback e restore produtivo continuam dependentes do ambiente declarado;
- **próximo passo:** propagar a URL interna aprovada ao pipeline/serviço web do ambiente real e repetir health, E2E e gates externos.

## 2026-08-11 — REMEDIATION-DOCKER-RESTORE-PASSWORD

- **item:** tornar o restore live compatível com PostgreSQL acessível somente pela rede Docker, sem expor senha nos argumentos;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para backup e restore produtivos;
- **evidência:** `scripts/postgres-command.mjs` valida o container e encaminha `PGPASSWORD` por ambiente; teste de contrato 6/6; `pnpm test:integration:restore` 2/2; execução direta com banco isolado observou RTO de 2,546 s; commit `fbc9591e6fe2b785d3d3fc50eaa4a096421c1351`;
- **limite:** agendamento, criptografia, storage/retenção externos, owner, RPO/RTO produtivo e autorização de restore continuam pendentes;
- **próximo passo:** repetir o drill usando artefato e política do ambiente produtivo declarado.

## 2026-08-11 — REMEDIATION-PRODUCTION-CONFIG-CONTRACT

- **item:** impedir que o gate produtivo aceite configuração semanticamente insegura antes da probe externa;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para recursos produtivos reais;
- **evidência:** `scripts/verify-production-security-config.mjs` valida IdP HTTPS sem credenciais, origem pública, storage de traces, retenção, URI de backup, referência de chave e digests distintos; `tests/integration/production-security-config.test.ts` passou 7/7; commit `7777876a86b8bef8dff5714d127281a25a4c8b6d`;
- **limite:** configuração válida não comprova probe do IdP, certificado/DNS, backend de traces, backup/restore, registry ou deploy/rollback;
- **próximo passo:** fornecer os valores por secret manager/ambiente aprovado e executar o gate produtivo completo.

## 2026-08-11 — REMEDIATION-WEB-TSC-CHECK-27

- **item:** fechar a falha reproduzida do `next build` na checagem TypeScript CLI do Next 16.3, mantendo typecheck obrigatório;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para validação manual do admin e ambiente produtivo;
- **evidência:** RED 1/5 no contrato antigo; `apps/web/next.config.ts` agora usa `experimental.useTypeScriptCli: false`; teste de build 5/5; build com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182` passou; cobertura elevada 475/18 com 84,93% statements, 80,05% branches, 86,70% functions e 85,71% lines; E2E HA real 2/2; `pnpm verify`, typecheck/lint/secrets/architecture/exposure/diff-check passaram;
- **limite:** o E2E genérico conflita com a web operacional em `3100`; o executor oficial HA foi usado. O worktree segue sem commit intencional e a validação visual/humana do dashboard permanece pendente;
- **próximo passo:** Ricardo validar `/admin`, `/invite` e uma atribuição sintética, rotacionar a senha temporária e escolher ciclo de vida de usuários ou analytics histórico.

## REGRAS DE USO

- Atualizar este arquivo sempre que um item mudar de status, prioridade, dependência ou risco.
- Não marcar B-07 como concluído somente por criar o blueprint.
- Não tratar B-07 como bloqueio da SPEC; ele bloqueia baseline e piloto completo por D-101.
- Adicionar imediatamente qualquer nova pendência descoberta durante revisão ou aplicação.
- Usar este backlog junto com docs/99_runtime_state.md e docs/20_master_execution_log.md.

## 2026-08-11 — ACCESS-22 — Primeiro acesso do operador

- **título:** desbloquear a entrada inicial sem permitir cadastro público em ambiente interno;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para rotação de senha e identidade externa;
- **evidência:** conta `ricardo@cvg.internal` ativa; credencial transitória provisionada fora do repositório; login real `200`, cookie HttpOnly emitido, jornada autenticada `200` e endpoint de rotação autenticada `200` com origem CSRF válida em `http://127.0.0.1:3100`;
- **limite:** senha não foi registrada em código, documentação, log ou Git; a superfície web de rotação ainda não foi implementada; MFA/recuperação externa e acesso público permanecem pendentes;
- **próximo passo:** operador visualizar M02, rotacionar a senha por fluxo autenticado e manter os gates externos/ clínicos aguardando aprovação.

## 2026-08-11 — ACCESS-23 — Redesign da entrada do participante

- **título:** transformar o login em uma entrada orientada para a jornada, sem abrir cadastro público;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para a próxima fase autenticada;
- **evidência:** `apps/web/app/page.tsx`, `apps/web/app/login-mascot.tsx`, `apps/web/app/globals.css` e `tests/e2e/participant-access.spec.ts`; build, typecheck, coverage 85,04% statements / 80,33% branches, E2E participante/acessibilidade 12/12 contra `3100`, health 200;
- **entrega:** missão inicial, mascote Caju, prévia da trilha, explicação de convite, senha visível/oculta e layout responsivo;
- **limite:** ainda não implementa falas dinâmicas do mascote, trilha persistida do participante, perfil completo, gerenciamento de usuários ou controle de treinamentos;
- **próximo passo:** validar visualmente a entrada e priorizar a área autenticada do participante antes de ampliar para administração.

## 2026-08-11 — ACCESS-24 — Fluxo de atividade em blocos

- **título:** orientar a resposta de atividades em blocos de até três questões, com salvamento e progresso visíveis;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para validação visual do operador;
- **evidência:** `apps/web/app/page.tsx`, `apps/web/app/globals.css`, `tests/e2e/participant-access.spec.ts`; build web reiniciada em `3100`; E2E participante/acessibilidade 13/13; coverage 462 testes, 85,04% statements e 80,33% branches;
- **entrega:** cartão de início no topo, barra de progresso, navegação por blocos, salvamento das respostas antes do avanço, validação de respostas vazias e correção do layout de rádio/checkbox;
- **limite:** não implementa ainda dashboard persistido da trilha, área de usuário, mascote interativo, gerenciamento de usuários ou controle editorial de treinamentos;
- **próximo passo:** Ricardo validar o fluxo em `http://localhost:3100/` e depois priorizar o dashboard do participante.

## 2026-08-11 — ACCESS-25 — Bootstrap do superadmin e criação controlada de usuários

- **título:** remover redundância do login e permitir que somente o superadmin crie o primeiro acesso dos demais usuários;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para validação manual e integração de envio de convite;
- **evidência:** `apps/web/app/page.tsx`, `apps/web/app/admin/page.tsx`, `apps/web/app/invite/page.tsx`, `apps/api/src/http.ts`, `packages/application/src/invitation-use-cases.ts`, testes unitários e E2E; 43/43 testes de autorização, 15/15 E2E, build web, health 200 e coverage 85,07% statements / 80,37% branches;
- **entrega:** entrada sem os selos duplicados, área `/admin`, convite individual de uso único, perfil limitado por escopo, bloqueio de convite `ADMIN`, definição de senha em `/invite` e bootstrap da conta interna existente como `ADMIN` + `PARTICIPANT` fora do repositório;
- **limite:** o link é copiado/enviado manualmente; não há ainda lista, edição, desativação ou auditoria de usuários, envio de e-mail, nem controle editorial completo de treinamentos;
- **próximo passo:** Ricardo abrir `/admin`, criar um convite sintético, validar `/invite` e priorizar gestão de ciclo de vida dos usuários e controle de treinamentos.

## 2026-08-11 — ACCESS-ADMIN-TRAINING-26 — Dashboard administrativo e avanço da trilha

- **título:** validar o acesso de admin e entregar acompanhamento dos veterinários, catálogo e customização controlada de treinamentos;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para autenticação real do superadmin e decisão da próxima fatia;
- **dependências:** SPEC aprovada em `0190`; BUILD master/roadmap/backlog e documentação transversal aprovados; runtime HA local ativo;
- **entrega:** capability `VIEW_ADMIN_DASHBOARD` exclusiva para `ADMIN`; `GET /api/v1/internal/admin/dashboard`; projeção interna estrita com resumo, participantes, progresso e catálogo M01–M24; lista limitada a 200 contas participantes nos escopos do admin; formulário para atribuir e disponibilizar módulos existentes;
- **evidência:** `packages/application/src/admin-dashboard-use-cases.ts`, `packages/contracts/src/admin-dashboard.ts`, `packages/persistence/src/admin-dashboard-repository.ts`, `apps/api/src/http.ts`, `apps/api/src/main.ts`, `apps/web/app/admin/page.tsx`, `tests/e2e/admin-dashboard.spec.ts`; 471 testes passantes, cobertura 84,93% statements / 80,17% branches, build Docker e web, API sem sessão `401`, `/admin` `200`, E2E novo `1/1` e regressão admin/participante `10/10`;
- **segurança:** jornada individual reutiliza contexto RLS do participante; não houve leitura staff direta das tabelas protegidas, nova política RLS, segredo, dado real, fonte, PDF, foto, gabarito ou alteração automática de estado clínico;
- **limites:** não cobre histórico analítico, exportação, edição de conteúdo, ciclo de vida completo de contas, auditoria visual ou envio automático de e-mail; o admin precisa validar manualmente a sessão e um acesso sintético;
- **próximo passo:** Ricardo validar `/admin` autenticado, convite `/invite` e atribuição de módulo; então escolher ciclo de vida de usuários ou analytics histórico.

## 2026-08-11 — ACCESS-ADMIN-TRAINING-26-CLOSE

- **status:** gates locais finais concluídos / WAITING_HUMAN_APPROVAL;
- **evidência:** `pnpm verify:secrets`, `pnpm verify:architecture`, `pnpm verify:exposure` e `git diff --check` passaram; portas existentes `3100`, `3180`, `3181` e `127.0.0.1:3182` preservadas; API, workers e PostgreSQL saudáveis;
- **limite:** ainda depende de autenticação e validação semântica manual do admin com dados sintéticos;
- **próximo passo:** validar `/admin`, `/invite` e uma atribuição sintética, sem iniciar outro processo local.

## 2026-08-11 — ACCESS-SUPERADMIN-CREDENTIAL-26

- **status:** credencial temporária provisionada e login/dashboard verificados / WAITING_HUMAN_APPROVAL;
- **entrega:** conta existente `ricardo@cvg.internal` confirmada como `ACTIVE` com `ADMIN` + `PARTICIPANT`; senha entregue diretamente ao operador, sem persistência do valor;
- **evidência:** login local `200`, cookie HttpOnly emitido e dashboard administrativo autenticado `200`; a sessão técnica da prova foi revogada após a validação;
- **limite:** MFA, recuperação e IdP externo continuam não configurados; a senha deve ser rotacionada após o teste;
- **próximo passo:** Ricardo validar visualmente `/admin` e uma atribuição sintética.

## 2026-08-11 — RUNTIME-LOCAL-VERIFY

- **item:** verificar o runtime local e preservar a topologia existente antes de iniciar qualquer processo;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para validação manual do onboarding;
- **evidência:** `cvg-trainee-vet-web.service` ativo em `3100`; edge em `3180/3181/3182`; APIs, workers e PostgreSQL `healthy`; probes HTTP de web, readiness, dependências e rotas principais `200`;
- **decisão:** o programa já estava ativo. Nenhum restart, `docker compose up`, nova porta, alteração de roteamento ou mudança de configuração foi executado;
- **próximo passo:** Ricardo validar `/admin` e `/invite` com a credencial transitória já entregue.

## 2026-08-11 — AUD-2026-08-11-CURRENT — Auditoria integral atual

- **status:** `COMPLETED` localmente / `WAITING_HUMAN_APPROVAL` para release, publicação clínica e gates externos;
- **resultado:** nota ponderada **83/100**; `PASS_WITH_GAPS`; nenhum P0 observado;
- **evidência:** `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `pnpm verify` com 475 testes passados e 18 skips, coverage 84,93%/80,05%/86,70%/85,71%; E2E HA 2/2; E2E web focado 15/15; smoke 200/200; trace local após restart; PostgreSQL read-only com 24 atribuições, 24 estados, 796 conteúdos e 763 pendências clínicas;
- **gaps P1:** revisão dos 763 itens; IdP/MFA/recovery real; domínio/TLS público; traces/backups externos; RPO/RTO produtivo; CI/deploy/rollback autorizado; produto integral de 24 meses; worktree sem SHA final;
- **próximo passo:** Ricardo validar `/admin`/`/invite`, rotacionar credencial transitória e escolher lifecycle ou analytics; nenhuma publicação clínica ou release é autorizada por esta nota.

## 2026-08-12 — ENT95-05-B — Regras do ciclo educacional

- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para cobertura de decisão, conteúdo clínico, release e reauditoria;
- **entrega:** pré-requisito fail-closed; pausa por afastamento/acomodação/janela operacional com retomada temporal persistida; formas equivalentes distintas em D+30/D+60/D+90; remediação digital na primeira tentativa e plano individual com mentor a partir da segunda, sem punição; contratos, repositório e migration `0017_assignment_pause_context.sql` sincronizados;
- **evidência:** catálogo atual com 31 invariantes e `pnpm verify:invariants` 2/2; fatia focada 7 arquivos/47 testes; migration gate com 18 migrações e índice 17; typecheck, lint e format check verdes; integração live serial PostgreSQL/Qdrant 32 arquivos/79 testes passantes, 1 arquivo/2 testes condicionais pulados; fixtures sintéticas removidas e zero role `cvg_rls_*`/conta `*.invalid` residual;
- **scorecard:** baseline 83,24/100, sem promoção; 10 tasks `COMPLETED`, 38 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; rastreabilidade permanece `PASS_WITH_GAPS`, 145 requisitos, 0 cadeias completas e 145 gaps explícitos;
- **próxima ação:** executar `ENT95-05-C` (cobertura de decisão crítica) e continuar `ENT95-02-A/B`, `ENT95-13-B` e `ENT95-16-B`, sem liberar release, piloto ou publicação clínica.

## 2026-08-12 — ENT95-05-C — Cobertura de decisão crítica

- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para mutation independente, conteúdo clínico, release e reauditoria;
- **entrega:** matriz imutável com 13 casos de nota, gabarito, publicação, permissão, estado, replay idempotente e conflito de chave; integração contra as regras reais; gate de cobertura incorporado ao `package.json` e ao `pnpm verify`;
- **evidência:** 3 arquivos/5 testes focados da matriz passaram; `pnpm test:coverage` passou 110 arquivos/530 testes, com 16 arquivos/18 testes condicionais pulados; cobertura global 86,40% statements / 82,35% branches / 87,30% functions / 87,18% lines; branches dos alvos críticos: 98,85% nota, 100% publicação, 98,46% permissão, 96,15% estado, 85% idempotência, 90,16% contrato de estado e 100% matriz; `pnpm verify:critical-decisions`, scorecard, rastreabilidade, documentação, invariantes e diff check passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-DECISION-COVERAGE-036`;
- **scorecard:** baseline 83,24/100 sem promoção; 11 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; rastreabilidade `PASS_WITH_GAPS`, 145 requisitos, 0 cadeias completas e 145 gaps explícitos;
- **próxima ação:** iniciar `ENT95-02-A/B` para fechar elos locais de rastreabilidade sem inventar SHA/artefato; manter `ENT95-13-B` e `ENT95-16-B`, sem liberar release, piloto ou publicação clínica.

## 2026-08-12 — ENT95-02-B — Teste de drift de produto

- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para mudanças de escopo, SHA, release e reauditoria;
- **entrega:** `scope_control` em `traceability.yml` com cinco fontes de decisão, dez capacidades e 27 requisitos RF/RNF; gate `scripts/verify-scope-drift.mjs` para exigir decisão, requisito e status aprovado por capacidade;
- **evidência:** RED com verificador ausente; GREEN 3/3 testes TDD; `pnpm verify:scope-drift` passou com 10 capacidades, 26 decisões usadas e 27 requisitos; typecheck, lint, format check e `git diff --check` passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-SCOPE-DRIFT-037`;
- **scorecard:** baseline 83,24/100 sem promoção; 12 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; rastreabilidade permanece `PASS_WITH_GAPS`, 145 requisitos, 0 cadeias completas e 145 gaps explícitos;
- **próxima ação:** continuar `ENT95-02-A` para fechar elos reais de módulo/contrato/teste, sem inventar SHA/artefato nem liberar release, piloto ou publicação clínica.

## 2026-08-12 — ENT95-07-A — Inventário de API

- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para API integral, gates externos, SHA, release e reauditoria;
- **entrega:** inventário `API_SURFACE` com 46 rotas, capability, auth, escopo, use case, contratos e projeções; rota editorial de revisão reconciliada com o template de telemetria;
- **evidência:** RED/GREEN 13/13 testes focados; typecheck de contratos, lint, rastreabilidade estrutural/premium passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-API-SURFACE-039`;
- **scorecard:** baseline 83,24/100 sem promoção; 14 tasks `COMPLETED`, 35 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **próxima ação:** continuar `ENT95-02-A` e escolher a próxima task local independente, mantendo explicitamente as operações ainda faltantes no backlog.

## 2026-08-12 — ENT95-04-A/B — Arquitetura e governança de hotspots

- **status:** `ENT95-04-A` e `ENT95-04-B` `COMPLETED` no escopo local / `WAITING_HUMAN_APPROVAL` para capacidade enterprise, carga/failover e gates externos;
- **entrega:** a policy executável `code-hotspot-policy.json` classifica os 7 arquivos de produção acima de 800 linhas com owner, severidade, plano de decomposição, orçamento-alvo e testes de caracterização; o verificador impede hotspot não classificado, duplicidade, teste ausente e regressão abaixo do limiar;
- **evidência:** RED/GREEN 2/2 em `tests/integration/code-hotspot-policy.test.ts`; `pnpm verify:hotspots`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram; a policy arquitetural anterior permanece verificada em `pnpm verify:architecture` 2/2;
- **artefato:** `PREMIUM-ENTERPRISE-95-HOTSPOT-POLICY-040`;
- **scorecard:** baseline 83,24/100 sem promoção; 16 tasks `COMPLETED`, 33 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** a decomposição física dos 7 módulos continua planejada em fatias reversíveis; seguir com `ENT95-02-A` e outras tasks locais respaldadas, sem inventar SHA, release ou evidência clínica.

## 2026-08-12 — ENT95-01-A — Registro de documentos canônicos

- **status:** `COMPLETED` localmente / `WAITING_HUMAN_APPROVAL` para SHA, release e reauditoria;
- **entrega:** `docs/canonical-document-registry.json` define uma única fonte vigente para programa `0304`, auditoria `0491`, roadmap `0492` e backlog `0493`, e liga `0490`/`0303` aos sucessores;
- **evidência:** RED/GREEN 3/3 em `tests/integration/canonical-document-governance.test.ts`; `pnpm verify:documentation`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-DOCUMENT-REGISTRY-042`;
- **scorecard:** baseline 83,24/100 sem promoção; 17 tasks `COMPLETED`, 32 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** a governança canônica não congela worktree/SHA nem substitui auditoria independente; continuar `ENT95-02-A` e próximas tasks locais respaldadas.

## 2026-08-12 — ENT95-03-A — Inventário curricular versionado

- **status:** `COMPLETED` localmente / `WAITING_HUMAN_APPROVAL` para revisão clínica e publicação;
- **entrega:** `curriculum-inventory.json` reconcilia 24 módulos, 96 sessões e 796 registros, declara objetivos e itens críticos por módulo, ordena risco de maior para menor e mantém `PILOT_BLOCKED`;
- **evidência:** RED/GREEN 2/2 em `tests/integration/curriculum-inventory-governance.test.ts`; `pnpm verify:curriculum-inventory`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-CURRICULUM-INVENTORY-043`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 tasks `COMPLETED`, 31 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** inventário estrutural não aprova os 763 itens; `ENT95-03-B/C/D` e os gates clínicos permanecem abertos.

## 2026-08-12 — ENT95-12-B — Governança local de observabilidade e alertas

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para operação externa;
- **entrega:** policy versionada com sete sinais e sete alertas, dashboard Grafana, regras Prometheus redigidas, p95 exportado de amostras limitadas e contagem de eventos reclamados do worker;
- **evidência:** RED/GREEN 2/2 no gate de governança e 10/10 no módulo de observabilidade; `pnpm verify:observability-governance`, lint, typecheck e `git diff --check` passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-OBSERVABILITY-GOVERNANCE-045`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 tasks `COMPLETED`, 30 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** collector/backend externo, retenção efetiva, acknowledgement produtivo, ruído medido e D-ENT-04 continuam pendentes; não declarar SLO produtivo, release ou piloto.

## 2026-08-12 — ENT95-14-A — Matriz de testes por requisito e risco

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para fechamento de evidência;
- **entrega:** `test-risk-matrix.json` exige quatro provas por RF P0/P1 e oito camadas de teste; o verificador deriva 87 RF P0/P1 e reports cobertura por prova/camada;
- **evidência:** RED/GREEN 2/2 em `tests/integration/test-risk-matrix-governance.test.ts`; `pnpm verify:test-risk-matrix`, lint, typecheck e `git diff --check` passaram; resultado 43/87 success, 0/87 error, 8/87 denied, 24/87 conflict e 0/87 completo;
- **artefato:** `PREMIUM-ENTERPRISE-95-TEST-RISK-MATRIX-046`;
- **limite/próximo passo:** 44 RF P0/P1, tags de risco completas, SHA, release e reauditoria continuam pendentes; não promover nota, release ou piloto.

## 2026-08-12 — ENT95-14-C — Governança de skips e flakiness

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para CI remoto e fechamento de execução;
- **entrega:** `skip-governance.json` cataloga 16 arquivos/18 testes condicionais; `scripts/verify-skip-governance.mjs` falha para skip não classificado, caminho inexistente ou taxa flaky acima de 1%;
- **evidência:** RED/GREEN 2/2 em `tests/integration/skip-governance.test.ts`; `pnpm verify:skip-governance` passou com 0 skips inexplicados, 0 falhas flaky e 3 execuções observadas de 20; live isolado PostgreSQL 38/38 arquivos e 95/95 testes, PostgreSQL/Qdrant 41/41 e restore 2/2;
- **artefato:** `PREMIUM-ENTERPRISE-95-SKIP-GOVERNANCE-047`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 tasks `COMPLETED`, 28 `READY_FOR_NEXT_STEP`, 6 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** faltam 17 execuções qualificadas, CI remoto, SHA/worktree, release e reauditoria; não liberar piloto ou publicação clínica.

## 2026-08-12 — ENT95-14-D — Evidência imutável e governança de dados de teste

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para CI artifact, retention e SHA;
- **entrega:** `test-evidence-governance.json` declara três registros com requisito/task, artifact ID, comando, timestamp, ambiente, seed sintético, sanitização, teardown, retention, commit e paths; `scripts/verify-test-evidence-governance.mjs` bloqueia evidência inválida ou não redigida;
- **evidência:** RED/GREEN 2/2 em `tests/integration/test-evidence-governance.test.ts`; `pnpm verify:test-evidence-governance` passou com 3 evidências sintéticas, 3 teardowns verificados, 0 completas e 3 gaps explícitos;
- **artefato:** `PREMIUM-ENTERPRISE-95-TEST-EVIDENCE-049`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 tasks `COMPLETED`, 27 `READY_FOR_NEXT_STEP`, 7 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** CI artifact/retention, SHA imutável, ENT95-15-A/B, release e reauditoria permanecem pendentes.

## 2026-08-12 — ENT95-01-C — Governança de decisões, riscos e mudanças

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para mudanças materiais;
- **entrega:** `change-control-governance.json` registra 2 decisões, 2 riscos abertos e 2 change requests com owner, motivo, impacto, aceite, rollback, artifact e score impact por sprint;
- **evidência:** RED/GREEN 2/2 em `tests/integration/change-control-governance.test.ts`; `pnpm verify:change-control-governance` passou com 0 score changes e disposição `PILOT_BLOCKED`;
- **artefato:** `PREMIUM-ENTERPRISE-95-CHANGE-CONTROL-051`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** aprovação humana/independente, SHA/release e riscos externos continuam abertos; a policy local não autoriza piloto.

## 2026-08-12 — Verificação transversal após ENT95-14-C

- **resultado:** `pnpm verify` passou com 119 arquivos/552 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA 3/3 e audit de dependências passaram; live isolado PostgreSQL 95/95, PostgreSQL/Qdrant 98/98 e restore 2/2;
- **scorecard:** 83,24/100 sem promoção; 18 `COMPLETED`, 28 `READY_FOR_NEXT_STEP`, 6 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** rastreabilidade permanece 0/145 cadeias completas e 145 gaps, faltam 17 execuções qualificadas de `ENT95-14-C`, CI remoto, SHA/worktree, gates externos, revisão clínica, release, piloto e reauditoria.

## 2026-08-12 — Verificação transversal após ENT95-14-D

- **resultado:** `pnpm verify` passou com 120 arquivos/554 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **governança:** `ENT95-14-D` reportou 3 evidências sintéticas, 3 teardowns verificados, 0 completas e 3 gaps explícitos; rastreabilidade permanece 0/145 cadeias completas, 145 gaps e 49 linhas com evidência local;
- **scorecard:** 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 27 `READY_FOR_NEXT_STEP`, 7 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** permanecem CI artifact/retention, SHA/worktree, 17 execuções qualificadas de `ENT95-14-C`, `ENT95-15-A/B`, revisão clínica, gates externos, release, piloto e reauditoria independente; estado `WAITING_HUMAN_APPROVAL`.

## 2026-08-12 — Verificação transversal após ENT95-01-C

- **resultado:** `pnpm verify` passou com 121 arquivos/556 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **governança:** change control reportou 2 decisões, 2 riscos, 2 change requests, 2 impactos de sprint e 0 mudanças de score; documentação, scorecard e rastreabilidade passaram (`0/145` cadeias completas, 145 gaps, 49 linhas com evidência local);
- **scorecard:** 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** SHA/worktree, CI artifact/retention, 17 execuções qualificadas de `ENT95-14-C`, `ENT95-15-A/B`, revisão clínica, gates externos, release, piloto e reauditoria independente continuam pendentes.

## 2026-08-12 — Verificação final após manifesto 052

- **resultado:** `pnpm verify` reexecutado após o manifesto 052: 121 arquivos/556 testes/18 skips condicionais; cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram novamente;
- **scorecard:** baseline 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** 0/145 cadeias completas, 145 gaps, SHA/worktree, CI artifact/retention, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes; estado `WAITING_HUMAN_APPROVAL`.

## 2026-08-12 — ENT95-13-B — Governança automatizada de acessibilidade

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para evidência manual;
- **entrega:** `accessibility-governance.json` cataloga 6 critérios automatizados, 2 superfícies e 5 gaps manuais; o verificador valida WCAG-2.2-AA, paths, status PASS e dados sintéticos;
- **evidência:** RED/GREEN 2/2 em `tests/integration/accessibility-governance.test.ts`; `pnpm verify:accessibility-governance` passou com 6/6 automatizadas, 5 gaps manuais, `PASS_WITH_GAPS` e `PILOT_BLOCKED`;
- **artefato:** `PREMIUM-ENTERPRISE-95-ACCESSIBILITY-GOVERNANCE-054`;
- **limite/próximo passo:** checklist manual P0, contraste/zoom/motion, leitores de tela e usuários representativos continuam necessários; não promover nota ou liberar piloto.

## 2026-08-12 — Verificação final após ENT95-13-B

- **resultado:** `pnpm verify` passou com 122 arquivos/558 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **scorecard:** baseline 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** `ENT95-13-B` conserva 5 gaps manuais; 0/145 cadeias completas, 145 gaps, SHA/worktree, CI artifact/retention, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes.

## 2026-08-12 — ENT95-04-C — Capacidade e escalabilidade local

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para aceitação enterprise;
- **entrega:** `capacity-governance.json` registra 200/200 HTTP 200, concorrência 20, throughput 458,14 req/s, p95 102,37 ms e teardown verificado;
- **evidência:** `tests/integration/capacity-governance.test.ts` passou 2/2; `pnpm verify:capacity-governance` passou com 100% de sucesso, `PASS_WITH_GAPS` e 4 gaps explícitos;
- **artefato:** `PREMIUM-ENTERPRISE-95-CAPACITY-GOVERNANCE-056`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** saturação, soak, failover/recuperação e perfil/SLO aprovado continuam pendentes; smoke local não libera piloto.

## 2026-08-12 — Verificação final após ENT95-04-C

- **resultado:** `pnpm verify` passou com 123 arquivos/560 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **scorecard:** baseline 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** `ENT95-04-C` mantém 4 gaps e `ENT95-13-B` 5 gaps manuais; 0/145 cadeias completas, 145 gaps, SHA/worktree, CI artifact/retention, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes.

## 2026-08-12 — ENT95-04-C — Evidência exploratória de carga e failover

- **evidência:** cargas HA sintéticas 200/20, 1.000/50 e 5.000/100 passaram 100% HTTP 200; com `api-a` parado, 1.000/50 passou 100% e a réplica foi restaurada saudável;
- **métricas:** p95 de 91,41 ms, 115,47 ms, 160,80 ms e 106,91 ms no failover; throughput de 466,72, 716,71, 1.014,10 e 565,82 req/s;
- **gate:** teste focal 3/3 e `pnpm verify:capacity-governance` passaram; `steppedLoadRuns=3`, failover 100%, `soakStatus=NOT_EXECUTED`, `PASS_WITH_GAPS` e `PILOT_BLOCKED`;
- **limites:** a evidência é exploratória e sintética; saturação, soak, perfil/SLO aprovado, CI/SHA, capacidade produtiva, release, piloto e reauditoria continuam pendentes;
- **artefato:** `PREMIUM-ENTERPRISE-95-CAPACITY-EXPLORATION-058`.

## 2026-08-12 — Verificação transversal final após ENT95-04-C

- **resultado:** `pnpm verify` passou com 123 arquivos/561 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **scorecard:** 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** `ENT95-04-C` conserva 4 gaps e `soakStatus=NOT_EXECUTED`; 0/145 cadeias completas, 145 gaps, 5 gaps manuais WCAG, CI artifact/retention, SHA/worktree, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes.

## 2026-08-12 — CVG-SUB80-TO-95 — Programa filtrado para itens abaixo de 80

- **status:** planejamento `COMPLETED` / execução `WAITING_HUMAN_APPROVAL`;
- **escopo:** somente itens 3 (72), 9 (75), 10 (68), 12 (78), 13 (78) e 16 (65); alvo de elegibilidade 95 por item;
- **backlog filtrado:** 29 tasks canônicas — 3 `COMPLETED`, 3 `IN_PROGRESS`, 12 `READY_FOR_NEXT_STEP` e 11 `WAITING_HUMAN_APPROVAL`; IDs e estado continuam governados pelo `0493`;
- **entrega:** `0305`, `0510`, `0511`, `sub80-to-95-program.json`, verificador e teste TDD; 13 janelas S0–S12, 24 semanas relativas, 10 gates, owners, dependências, evidência e rollback;
- **evidência:** RED por verificador ausente, drift de baseline/estado e calendário inconsistente; GREEN 5/5; `pnpm verify:sub80-program` passou com 6 itens/29 tasks/10 gates/alvo 95/`PILOT_BLOCKED`;
- **score:** baseline 83,24 preservada; seis itens exatamente em 95 projetam 92,54 global, portanto o recorte não autoriza declarar programa global em 95;
- **próximo passo:** decidir D-ENT-01/07/09, abrir G-S80-0 e executar `ENT95-03-B`; continuar apenas fatias desbloqueadas de 12-B/13-B/16-B até D-ENT-04/05/06/08 e gates humanos/externos.

## 2026-08-12 — CVG-SUB80-TO-95 — Verificação final

- **status:** tarefa documental/executável `COMPLETED`; execução do programa `WAITING_HUMAN_APPROVAL`;
- **evidência:** `pnpm verify` passou com 124 arquivos/566 testes/18 skips condicionais; cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines; gate sub-80 6 itens/29 tasks/13 janelas/24 semanas/10 gates;
- **disposição:** `PILOT_BLOCKED`; baseline e notas sem promoção;
- **próximo passo:** D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`.

## 2026-08-12 — CVG-SUB80-TO-95 — Execução local ENT95-10-D/13-D

- **status:** fatias locais implementadas e verificadas; tasks canônicas permanecem `READY_FOR_NEXT_STEP` até os critérios externos/humanos;
- **ENT95-10-D:** migration `0018_content_validity_window.sql`, `valid_until`/`next_review_at`, consulta de publicados vencidos por escopo, `expireDueContent` autorizado e idempotente, composição no worker, auditoria metadata-only e evento `content.withdrawn.v1`; artefato `PREMIUM-ENTERPRISE-95-CONTENT-LIFECYCLE-062`;
- **ENT95-13-D:** `web-performance-governance.json`, verificador e gate `verify:web-performance-governance`; budgets de bundle 250 KB, LCP 2.500 ms, INP 200 ms, CLS 0,1, retry máximo 2, duas medições sintéticas, três evidências PASS e quatro gaps manuais; artefato `PREMIUM-ENTERPRISE-95-WEB-PERF-063`;
- **TDD:** RED reproduziu os dois gaps de tooling; GREEN passou 4/4 no ciclo de vida, 7/7 no repositório e 3/3 na governança web;
- **verificação:** `pnpm verify` passou com 126 arquivos/575 testes/18 skips condicionais e cobertura 86,52%/82,53%/87,31%/87,28%; build dos 12 workspaces, E2E HA 3/3, migration 19/0018, contratos 55/55, worker 24/24, architecture 2/2, audit de dependências e `git diff --check` verdes;
- **limites:** não há scheduler produtivo autorizado, dashboard/drill operacional, Web Vitals reais, CI budget, offline/dispositivo representativo, SHA final ou reauditoria; `PASS_WITH_GAPS`, baseline 83,24 e `PILOT_BLOCKED` preservados;
- **próxima ação:** D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`; continuar 12-B/13-B/16-B somente nas fatias locais seguras.

## 2026-08-12 — ENT95-09-A/C/D + ENT95-10-C — jornada, contestação e correção

- **entrega:** `journey-correction-governance.json` e `scripts/verify-journey-correction-governance.mjs` consolidam quatro invariantes locais: jornada determinística owner/scope-scoped, runtime não punitivo, contestação com revisor independente e correção humana versionada/idempotente;
- **TDD:** RED reproduziu o verificador ausente; GREEN passou 2/2 no gate focal; a bateria de domínio/aplicação/contratos/persistência/API passou 33/35, com 2 integrações live condicionais mantidas como skip governado;
- **evidência:** 4/4 registros sintéticos PASS, 5 gaps explícitos, `PASS_WITH_GAPS`, `PILOT_BLOCKED`; artifact `PREMIUM-ENTERPRISE-95-JOURNEY-CORRECTION-065` ligado à rastreabilidade;
- **limites:** DB/RLS autorizado, UAT em turnos/dispositivos, alerta/SLA real, comunicação clínica de afetados, SHA e reauditoria permanecem pendentes; não alterar score ou status canônico;
- **próxima ação:** decidir D-ENT-01/07/09, abrir G-S80-0 e executar `ENT95-03-B`; continuar somente fatias locais seguras de 12-B/13-B/16-B.

## 2026-08-12 — Verificação final ENT95-FINAL-VERIFICATION-066

- **resultado:** `pnpm verify` passou com 127 arquivos/577 testes/18 skips; cobertura 86,53% statements, 82,52% branches, 87,31% functions e 87,28% lines;
- **runtime:** build dos 12 workspaces, E2E HA 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **governança:** jornada/correção 4/4 evidências PASS e 5 gaps; programa sub-80 6 itens/29 tasks/13 janelas/24 semanas/10 gates; baseline 83,24 e `PILOT_BLOCKED` preservados;
- **limites:** nenhum commit/RC/score promotion; DB/RLS autorizado, UAT, SLA, comunicação clínica, revisão clínica, WCAG manual, Web Vitals/CI, soak/DR e reauditoria independente seguem abertos;
- **próxima ação:** D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`.

## 2026-08-14 — AUDIT-LOCAL-067

- **status:** auditoria local concluída; estado `WAITING_HUMAN_APPROVAL`, release/piloto/publicação clínica `PILOT_BLOCKED`;
- **evidência:** 15 documentos de `docs/` lidos; `pnpm verify` 127 arquivos/577 testes/18 skips; cobertura 86,53%/82,52%/87,31%/87,28%; build 12 workspaces; E2E HA 3/3; edge security PASS; smoke 200/200, p95 186,68 ms; audit de dependências limpo;
- **gaps confirmados:** gate produtivo fechado por 11 referências externas ausentes; ausência de SHA imutável do worktree/runtime, IdP/MFA real, operação pública/externa, revisão clínica de 763 itens, CI/deploy/rollback atuais, WCAG manual, Web Vitals/soak/DR e reauditoria independente;
- **score:** baseline 83,24/100 preservada, sem promoção;
- **próxima ação:** Ricardo decidir D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`; não liberar release, piloto ou publicação clínica.

## 2026-08-14 — BLOCKER-PLAN-068 — Plano para os oito bloqueios

- **status:** plano/roadmap/backlog atualizados; execução `WAITING_HUMAN_APPROVAL`, release/piloto/publicação clínica `PILOT_BLOCKED`;
- **relatório:** `docs/112_current_construction_report_2026-08-14.md` salvo com a nota 83,24/100 e as 16 notas por item;
- **plano executivo:** `BRIEFING/03.BUILD/0305_sub80_to_95_executive_plan.md` agora contém BLK-01…BLK-08, resultado contratado, beta clínico com veterinários e critérios de encerramento;
- **roadmap:** `BRIEFING/04.AUDIT/0510_sub80_to_95_roadmap.md` agora contém linhas B-L1…B-L6, sequência S0–S12 e gates B-G1…B-G8;
- **backlog:** `BRIEFING/04.AUDIT/0511_sub80_to_95_backlog.md` agora contém tasks de beta clínico, IdP/MFA/recovery, DNS/TLS, backup/RPO/RTO/DR, CI/registry/deploy/rollback, SHA/runtime, UAT/WCAG/Web Vitals/soak e rastreabilidade 145/145;
- **próxima ação:** D-ENT-01/07/09 → G-S80-0; preparar BLK-06-A/BLK-08-A sem commit destrutivo e depois iniciar BLK-01-B/ENT95-03-B.

## 2026-08-14 — BLOCKER-PREFLIGHT-069 — BLK-06-A e BLK-08-A

- **status:** preflight local executado; tasks permanecem `IN_PROGRESS`, estado geral `WAITING_HUMAN_APPROVAL`, `PILOT_BLOCKED`;
- **BLK-06-A:** 95 alterações rastreadas, 81 arquivos não rastreados, 176 entries no worktree, SHA atual registrado e `git diff --check` verde; runtime ainda sem vínculo source SHA declarado;
- **BLK-08-A:** matriz premium estruturalmente reconhecida com 145 requisitos, 49 linhas de evidência local, 43/87 RF P0/P1 e 0/145 cadeias completas;
- **evidência:** `docs/113_blocker_preflight_2026-08-14.md` e `pnpm verify:premium-traceability` (`PASS_WITH_GAPS`);
- **limite:** não houve commit, reset, limpeza destrutiva, deploy ou promoção de score; revisão humana do diff e RC continuam necessários;
- **próxima ação:** classificar os 176 entries, completar owner/risco/task da matriz sem placeholders e aguardar D-ENT-01/07/09 → G-S80-0.

## 2026-08-14 — BLOCKER-EXTERNAL-READINESS-070

- **status:** readiness externo auditado sem credenciais; nenhum gate promovido; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`;
- **IdP:** `pnpm ops:verify-identity-provider` retornou `NOT_EXECUTED` por ausência de ambiente aprovado;
- **segurança produtiva:** `pnpm ops:verify-production-security` retornou `NOT_EXECUTED` sem flag/autorização; a execução autorizada anterior permaneceu fail-closed por referências ausentes;
- **release manifest:** `pnpm ops:verify-release-manifest` passou somente no manifesto de exemplo local, sem provar registry/deploy/rollback reais;
- **evidência:** `docs/113_blocker_preflight_2026-08-14.md`;
- **próxima ação:** fornecer ambientes/decisões autorizados para BLK-02/03/04/05/07 e continuar preflight local sem declarar conclusão.

## 2026-08-14 — BLOCKER-TRACEABILITY-GAP-071

- **status:** análise local de BLK-08-B executada; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **evidência:** `docs/114_traceability_gap_analysis_2026-08-14.md` e análise do artefato `PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX`;
- **resultado:** 145 requisitos na matriz, 0/145 cadeias completas, 49/145 linhas com evidência local, 43/87 P0/P1 com evidência local, 96/145 linhas com módulo/contrato/teste/artefato pendentes e 145/145 commits pendentes;
- **execução:** definidos lotes T-01 aprendizagem/runtime, T-02 avaliação/decisões, T-03 autoria/publicação, T-04 identidade/administração e T-05 RNFs/operação;
- **limite:** nenhuma linha foi promovida e nenhum placeholder foi substituído por inferência; commit, release, prioridades dos RNFs, gates externos e revisão clínica continuam dependentes de decisão/evidência autorizada;
- **próxima ação:** executar BLK-08-B por lotes com evidência real e só depois BLK-08-C/D no mesmo SHA de RC.

## 2026-08-14 — BLOCKER-TRACEABILITY-VALIDATION-072

- **status:** validação documental pós-BLK-08-B passou; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify:documentation`, `pnpm verify:premium-traceability` e `git diff --check` passaram;
- **resultado:** a matriz permanece `PASS_WITH_GAPS`, com 145 requisitos, 0/145 cadeias completas, 49 evidências locais, 43/87 P0/P1 com evidência local e 145 commits pendentes;
- **limite:** nenhum requisito, score, release ou piloto foi promovido;
- **próxima ação:** executar BLK-08-B por lotes com evidência real e aguardar ambientes/decisões para BLK-02/03/04/05/07.

## 2026-08-14 — GOVERNANCE-ARTIFACTS-VALIDATION-073

- **status:** validação dos artefatos passou; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify:sub80-program` passou com 6 itens/29 tasks/13 sprints/24 semanas/10 gates; Prettier, documentação, rastreabilidade e `git diff --check` também passaram;
- **resultado:** relatório, plano executivo, roadmap, backlog e matriz seguem consistentes, sem promoção de score ou release;
- **limite:** os checks documentais não substituem execução clínica, ambientes externos, RC/SHA, UAT, DR, Web Vitals ou reauditoria;
- **próxima ação:** continuar apenas evidência local não ambígua e aguardar decisões/ambientes autorizados para BLK-01/02/03/04/05/07.

## 2026-08-14 — FINAL-LOCAL-VALIDATION-074

- **status:** rodada local encerrada por dependência externa/humana; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks finais:** `pnpm verify:documentation`, `pnpm verify:premium-traceability` e `git diff --check` passaram;
- **resultado:** pacote documental consistente; matriz `PASS_WITH_GAPS`, 0/145 cadeias completas, 49/145 evidências locais, 43/87 P0/P1 com evidência local e 145 commits pendentes;
- **limite:** não há 100% global, nem promoção de score/release/piloto/publicação clínica; faltam decisões, ambientes externos, veterinários beta e fronteira de commit;
- **retomada:** executar BLK-01/02/03/04/05/07 e BLK-08-B/C/D no mesmo RC/SHA após disponibilização dos inputs autorizados.

## 2026-08-14 — TRACEABILITY-EVIDENCE-BATCH-075

- **status:** primeiro lote local de BLK-08-B executado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **requisitos mapeados:** RF-003, RF-004, RF-011, RF-012, RF-032, RF-037, RF-051, RF-095, RF-098 e RNF-085;
- **checks:** testes focalizados passaram 80/80, com 5 skips condicionais; `pnpm verify:traceability` passou;
- **resultado:** rastreabilidade local subiu para 59/145 linhas e 52/87 P0/P1; 86 linhas ainda têm gaps de módulo/contrato/teste/artefato; 145 commits/SHA continuam pendentes;
- **limite:** nenhuma linha foi promovida a `RELEASE_READY`; RNF-085 permanece aguardando prioridade de produto;
- **próxima ação:** continuar o mapeamento apenas com evidência direta e resolver worktree/RC e gates externos antes de BLK-08-C/D.

## 2026-08-14 — TRACEABILITY-EVIDENCE-BATCH-076

- **status:** microfatia local de BLK-08-B executada; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **requisito mapeado:** RF-006;
- **checks:** `pnpm verify:premium-traceability`, `pnpm verify:traceability`, `pnpm verify:documentation` e `git diff --check` passaram;
- **resultado:** rastreabilidade local subiu para 60/145 linhas e 53/87 P0/P1; 85 linhas ainda têm gaps de módulo/contrato/teste/artefato; 145 commits/SHA continuam pendentes;
- **limite:** nenhuma linha foi promovida a `RELEASE_READY`; o lote não autoriza release, piloto ou publicação clínica;
- **próxima ação:** continuar o mapeamento apenas com evidência direta e resolver worktree/RC e gates externos antes de BLK-08-C/D.

## 2026-08-14 — TRACEABILITY-EVIDENCE-BATCH-077

- **status:** nova microfatia local de BLK-08-B executada; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **requisito mapeado:** RF-042, com módulos de catálogo/runtime, contrato de aprendizagem, teste focal dos três estágios progressivos e artifact curricular existente;
- **checks:** teste focal do runtime passou 15/15; `pnpm verify:premium-traceability` e `pnpm verify:traceability` passaram;
- **resultado:** rastreabilidade local subiu para 97/145 linhas e 60/87 P0/P1; 48 linhas ainda têm gaps de módulo/contrato/teste/artefato; 145 commits/SHA continuam pendentes;
- **limite:** nenhuma linha foi promovida a `RELEASE_READY`; o lote não autoriza release, piloto ou publicação clínica;
- **próxima ação:** continuar o mapeamento apenas com evidência direta e resolver worktree/RC e gates externos antes de BLK-08-C/D.

## 2026-08-14 — FULL-LOCAL-VERIFICATION-078

- **status:** verificação local completa concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 127 arquivos de teste, 578 testes passados, 18 skips condicionais e cobertura 86,53% statements / 82,52% branches / 87,31% functions / 87,28% lines;
- **resultado:** não houve regressão; a matriz permanece em 0/145 cadeias completas, 97/145 evidências locais, 60/87 P0/P1 e 48 gaps de evidência; 145 commits/SHA continuam pendentes;
- **limite:** checks locais não substituem IdP/MFA real, DNS/TLS público, backups/RPO/RTO, CI/registry/deploy/rollback, clinical beta, UAT/WCAG/Web Vitals/soak/DR ou fechamento de worktree;
- **próxima ação:** executar gates externos, clínicos, release, UAT, DR e BLK-08-C/D somente com decisões, ambientes e RC/SHA autorizados.

## 2026-08-14 — REPORT-RECONCILIATION-079

- **status:** relatório e handoff documental reconciliados; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **resultado:** relatório atualizado para 19 documentos, 578 testes passados, 97/145 evidências locais, 60/87 P0/P1 e 48 gaps de evidência; baseline 83,24/100 e item 16 em 65/100 permanecem sem promoção;
- **checks:** `pnpm verify:documentation` e `git diff --check` passaram;
- **limite:** o pacote documental não fecha commit/SHA, release, revisão clínica, identidade/edge/backup/CI, UAT, DR ou 145/145;
- **próxima ação:** disponibilizar decisões, ambientes autorizados e fronteira de commit para continuar BLK-01…BLK-08.

## 2026-08-14 — EXTERNAL-READINESS-PREFLIGHT-080

- **status:** preflight externo reexecutado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **evidência:** fonte operacional e runtime confirmam stack local/LAN/Tailscale em `:3180`, `:3181` com `tls internal` e `:3182` loopback; sem FQDN público ou certificado gerenciado;
- **checks:** IdP e segurança produtiva retornaram `NOT_EXECUTED`; manifesto de exemplo passou, sem representar registry/deploy/rollback reais;
- **decisão:** não ativar DNS/TLS, não provisionar credenciais, não publicar imagem e não alterar Caddy/deploy sem autorização e ambiente;
- **próxima ação:** obter domínio, IdP, storage, registry, CI, coorte clínica e decisões D-ENT-01/04/05/06/07/08/09 para executar BLK-02…BLK-07 e BLK-08-C/D no mesmo RC/SHA.

## 2026-08-14 — TRACEABILITY-SHA-PREFLIGHT-081

- **status:** microfatia local de BLK-08-B e preparação do contrato de SHA concluídas; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **requisitos mapeados:** `RF-005`, `RF-052`, `RF-054`, `RF-055`, `RF-075`, `RF-076`, `RNF-031`, `RNF-040`, `RNF-042` e `RNF-081`;
- **checks:** `pnpm verify:premium-traceability`, `pnpm verify:traceability`, `pnpm ops:verify-ha`, teste focal de contrato de produção e `git diff --check` passaram;
- **resultado:** rastreabilidade local em 107/145 linhas e 66/87 P0/P1; 0/145 cadeias completas e 38 linhas ainda têm gaps de módulo/contrato/teste/artefato; 145 commits/SHA continuam pendentes;
- **implementação auxiliar:** Dockerfile/Compose HA propagam `SOURCE_SHA` para label OCI e `CVG_SOURCE_SHA`; isso prepara o caminho, mas não prova RC/commit/runtime imutável;
- **limite:** nenhuma linha foi promovida a `RELEASE_READY`; gates externos, revisão clínica dos 763 itens, UAT/WCAG/Web Vitals/soak/DR, release e piloto continuam bloqueados;
- **próxima ação:** reexecutar `pnpm verify`/`pnpm verify:documentation` e, após autorização, executar BLK-02…BLK-07 e BLK-08-C/D no mesmo RC/SHA.

## 2026-08-14 — FULL-LOCAL-VERIFICATION-082

- **status:** verificação transversal pós-microfatia concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 127 arquivos de teste, 579 testes, 18 skips condicionais e cobertura 86,53% statements / 82,52% branches / 87,31% functions / 87,28% lines; documentação, rastreabilidade e `git diff --check` também passaram;
- **resultado:** não houve regressão local; a matriz permanece em 0/145 cadeias completas, 107/145 evidências locais, 66/87 P0/P1 e 38 gaps locais; o score 83,24/100 e o item 16 em 65/100 não foram promovidos;
- **limite:** os gates locais não substituem IdP/MFA real, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback, revisão clínica dos 763 itens, UAT/WCAG/Web Vitals/soak/DR ou RC/SHA;
- **próxima ação:** obter decisões e ambientes autorizados para executar BLK-02…BLK-07 e BLK-08-C/D no mesmo RC/SHA, mantendo release, piloto e publicação clínica bloqueados.

## 2026-08-14 — DOCUMENTATION-RECONCILIATION-083

- **status:** snapshot documental reconciliado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** `docs/114_traceability_gap_analysis_2026-08-14.md` agora lista nominalmente os 38 requisitos sem elo local verificável;
- **checks:** `pnpm verify:documentation` e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `107/145` evidências locais, `66/87` P0/P1, `38` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** nenhum requisito, score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** retomar somente evidência direta ou aguardar autorizações/ambientes para gates externos, clínicos e RC/SHA.

## 2026-08-14T04:08:04-03:00 — TRACEABILITY-EVIDENCE-BATCH-084

- **status:** BLK-08-B microfatia local concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** RF-007, RF-092, RF-075 e RNF-083 receberam evidência direta em código/contrato/teste/artefato, sem preencher campos por proximidade;
- **resultado:** `110/145` linhas com evidência local, `68/87` P0/P1, `35` gaps explícitos, `0/145` cadeias completas e `145/145` commits/SHA pendentes;
- **próxima ação:** continuar BLK-08-B nos 35 gaps restantes com TDD e manter os gates externos/clínicos bloqueados até autorização.

## 2026-08-14T04:13:59-03:00 — FULL-LOCAL-VERIFICATION-085

- **status:** verificação transversal pós-microfatia concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 127 arquivos de teste, 579 testes, 18 skips condicionais e cobertura 86,53% statements / 82,52% branches / 87,31% functions / 87,28% lines; gates encadeados passaram;
- **resultado:** nenhuma regressão local; matriz em `0/145` cadeias completas, `110/145` evidências locais, `68/87` P0/P1, `35` gaps e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; IdP/MFA, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback, beta clínico, UAT/WCAG/Web Vitals/soak/DR e RC/SHA permanecem pendentes;
- **próxima ação:** executar a próxima microfatia de BLK-08-B somente com RED/GREEN e evidência requisito-específica.

## 2026-08-14T04:42:52-03:00 — FULL-LOCAL-VERIFICATION-086

- **status:** verificação integral concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 128 arquivos de teste, 583 testes, 18 skips condicionais e cobertura 86,51% statements / 82,42% branches / 87,44% functions / 87,25% lines; gates encadeados passaram;
- **resultado:** matriz em `0/145` cadeias completas, `126/145` evidências locais, `73/87` P0/P1, `19` gaps de módulo/contrato/teste/artefato e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; os 763 conteúdos, IdP/MFA real, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback, UAT/WCAG/Web Vitals/soak/DR e RC/SHA permanecem pendentes;
- **próxima ação:** executar os 19 gaps somente com evidência direta e obter autorizações/ambientes para os gates externos, clínicos e de release no mesmo RC/SHA.

## 2026-08-14T10:15:55-03:00 — LOCAL-GAPS-AND-TRACEABILITY-104

- **status:** BLK-08-B local encerrado em evidência; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** RF-063, RF-072, RF-073, RF-093, RF-094, RNF-012, RNF-072, RNF-075, RNF-084 e RNF-086 agora apontam para módulos, contratos, testes e artefatos locais existentes; a janela de manutenção ganhou contrato Zod em RED/GREEN;
- **checks:** `pnpm verify` passou com 160 arquivos/701 testes/18 skips e cobertura 84,26% statements / 80,62% branches / 85,64% functions / 85,06% lines; migrations 28/28, contratos 81/81 e worker 24/24 passaram;
- **resultado:** rastreabilidade subiu para 145/145 linhas com evidência local e 87/87 P0/P1; cadeias completas continuam 0/145, pois 145/145 commits/SHA e artefatos de release no mesmo SHA ainda não existem;
- **limite:** o recálculo permanece port local sem adapter PostgreSQL/rota/worker; horários hospitalares de manutenção ainda não foram configurados; não há promoção de score, release ou piloto;
- **próxima ação:** revisar o diff completo, obter a fronteira autorizada de commit/RC e executar gates externos, clínicos, humanos, UAT, DR e reauditoria no mesmo SHA.

## 2026-08-14T10:42:04-03:00 — ASSESSMENT-RECALCULATION-LOCAL-INTEGRATION-105

- **status:** BLK-08-B local encerrado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** recálculo determinístico agora possui persistência PostgreSQL/RLS, registro de candidatos, atualização otimista, outbox `assessment.recalculated.v1`, rota interna protegida e reconhecimento no worker; migration 0028 aplicada localmente;
- **checks:** `pnpm verify` passou com 161 arquivos/706 testes/18 skips e cobertura 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines; migrations 29/29, contratos 81/81 e worker 24/24 passaram;
- **resultado:** rastreabilidade em 145/145 linhas com evidência local e 87/87 P0/P1; cadeias completas continuam 0/145, pois 145/145 commits/SHA e artefatos de release no mesmo SHA ainda não existem;
- **limite:** integração local não substitui revisão clínica dos 763 conteúdos, entrega clínica externa, IdP/MFA, DNS/TLS, backup/RPO/RTO, CI/registry/deploy/rollback, UAT, WCAG manual, Web Vitals reais, soak, DR ou aprovação humana;
- **próxima ação:** revisar o diff completo, obter a fronteira autorizada de commit/RC e executar os gates externos, clínicos e operacionais no mesmo SHA.

## 2026-08-14T10:48:35-03:00 — WEB-RUNTIME-REPAIR-106

- **status:** inconsistência local de build/runtime corrigida; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **evidência:** web recompilado com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182`, serviço reiniciado e `pnpm test:e2e:active-ha` passou 3/3;
- **escopo coberto:** proxy real, atividade sintética persistida e ciclo administrativo de login, dashboard, suspensão, reativação e revogação de sessões;
- **limite:** a evidência continua local; não fecha os gates de domínio/TLS, IdP/MFA, backup/RPO/RTO, CI/registry/deploy/rollback, UAT/WCAG/Web Vitals/soak/DR, beta clínico ou RC/SHA;
- **próxima ação:** revisar o diff completo e obter a fronteira autorizada de commit/RC antes da execução externa no mesmo SHA.

## 2026-08-14T10:51:57-03:00 — FINAL-LOCAL-VERIFICATION-107

- **status:** verificação local integral encerrada sem regressão; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 161 arquivos/706 testes/18 skips, cobertura 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines; migrations 29/29; E2E HA 3/3; `git diff --check` passou;
- **rastreabilidade:** 145/145 linhas com evidência local, 87/87 P0/P1, 0/145 cadeias completas e 145/145 commits/SHA pendentes;
- **limite:** os gates externos, clínicos, humanos e de release continuam abertos; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** revisar o diff completo e obter autorização explícita para commit/RC antes de qualquer execução externa no mesmo SHA.

## 2026-08-14T11:02:00-03:00 — LOCAL-RC-COMMIT-AND-ROLLBACK-108

- **status:** worktree local limpo no commit `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **rastreabilidade:** 145/145 linhas ancoradas no SHA local, sem `GAP:commit-pending` ou `GAP:worktree-sha-pending`; 0/145 cadeias completas porque estado/release e gates externos continuam bloqueados;
- **evidência:** ensaio local de release/deploy/rollback passou e restaurou o runtime com release digest `sha256:8c3b2acd13236eefed6f5d639f133eb9e0dc28acd63fd4c861cb9d81d0684524` e rollback digest `sha256:cf03cb172580d36c7eecb1f706bbf1605c46f0377ca55061a2c1b870b27143dd`;
- **limite:** isso não comprova registry/deploy externo, IdP/MFA, DNS/TLS público, backup/RPO/RTO, beta clínico, UAT, WCAG manual, Web Vitals reais, soak, DR ou reauditoria;
- **próxima ação:** reconstruir o runtime com `CVG_SOURCE_SHA` do RC e executar apenas os gates externos autorizados.

## 2026-08-14T11:15:28-03:00 — LOCAL-RC-RUNTIME-109

- **status:** snapshot documental `1501070`, worktree limpo; implementação da matriz ancorada no commit `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **runtime:** `cvg-trainee-vet:rc-local` comum em API-A/API-B e worker-A/worker-B, source SHA `e3aff802fe7ec104917e8cc6aa77bb0aea4f6229`, digest `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`, migrations `29/29`;
- **checks:** health live/dependencies `200/200`, três superfícies internas sensíveis `401/401/401` sem sessão, E2E HA `3/3`;
- **rollback:** ensaio local passou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`, rollback sintético `sha256:76b84ecd58011cbbffca2594cd2ce75b23b7ab57e66ebc7ea384b8d30f7567a4`;
- **verificação final:** `pnpm verify` passou com `161` arquivos, `706` testes, `18` skips governados, cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`, contratos `81/81`, worker `24/24` e migrations `29/29`;
- **rastreabilidade:** `145/145` evidências locais, `87/87` P0/P1, `0/145` cadeias completas; não há gaps de commit/worktree, mas estado/release e gates externos continuam pendentes;
- **próxima ação:** provisionar e executar os gates externos, clínicos, humanos e operacionais sem promover o piloto por inferência local.

## 2026-08-14T11:32:02-03:00 — LOCAL-OPERATING-EVIDENCE-110

- **fila clínica live:** `796` conteúdos, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; beta com veterinários preparado, revisão humana não executada;
- **capacidade local:** load smoke `5000/5000`, concorrência `100`, sucesso `100%`, throughput `770,79 req/s`, p95 `300,56 ms`;
- **backup/restore local:** backup administrativo fora do repositório verificado por SHA `f7e45a90783fe1416133879cd148c466e9342199fa2cc2b59b39dc58bc9f83ea`; restore isolado `PASS`, `32` objetos, RTO `4583 ms`; a conta de aplicação foi negada no schema `drizzle`;
- **gates:** IdP e segurança produtiva `NOT_EXECUTED`; manifest, traces e edge somente exemplo/staging;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`, `0/145` cadeias completas; próximos itens dependem de veterinários e ambientes/provedores externos.

## 2026-08-14T11:38:12-03:00 — REMOTE-CI-SOURCE-BUNDLE-111

- **evidência:** PR `#1` e runs `quality` remotos falharam em `verify:clinical-sources` por ausência de `BOOK_ETTINGER_9E`, `BOOK_FOSSUM_4E` e `BOOK_JERICO_CAES_GATOS` no checkout;
- **causa:** os PDFs licenciados existem somente fora do Git local; o gate local passa e o checkout remoto não consegue reproduzir a fonte;
- **ação necessária:** aprovar bundle privado/licenciado, armazenamento/artefato, credencial read-only e diretório temporário no CI; validar hashes antes do `pnpm verify`;
- **restrição:** não versionar PDF de terceiros e não remover o gate de fontes;
- **status:** CI remoto `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; nenhum push ou alteração remota executado.

## 2026-08-14T11:42:45-03:00 — REMOTE-CI-INFRASTRUCTURE-INVENTORY-112

- **evidência:** inventário read-only do GitHub encontrou zero secrets, zero variables, zero environments e zero deployments; o único workflow listado é `quality`;
- **impacto:** não há prova de registry, credencial CI, bundle licenciado acessível, ambiente de deploy ou alvo remoto de rollback;
- **ação necessária:** aprovar e provisionar essas dependências, sem versionar PDFs de terceiros e sem remover `verify:clinical-sources`;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; nenhum recurso remoto foi criado ou alterado.

## Snapshot operacional — RC no SHA executável e rollback local — 2026-08-14T11:57:48-03:00

BLK-06-D foi revalidado localmente: imagem `cvg-trainee-vet:rc-head-8cf40e567d02`, source SHA executável `8cf40e567d02149b9f5714c8b1084b60bd291426`, digest `sha256:aa5dc1b767745734f92b10359bb35920b6ab2096ed7cc5c6ce4927e592ad92bb`, quatro processos HA na mesma revisão, health `200/200`, E2E HA `3/3` e ensaio `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`.

O rollback local usa uma cópia sintética (`sha256:32a8b4dfca1e383354b439cb9118229ea4dcd3824c33496efee30d10af81d5a4`) e não prova registry, deploy, rollback ou RPO/RTO externos. BLK-01–BLK-05, BLK-07 e BLK-08-D permanecem dependentes de revisão veterinária, provedores, ambientes autorizados, UAT/operação e reauditoria; `completeChains=0/145`, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED` permanecem.

## Verificação integral no HEAD — 2026-08-14T12:03:46-03:00

`pnpm verify` passou com `161` arquivos/`706` testes/`18` skips, cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`, contratos `81/81`, worker `24/24`, migrations `29/29` e todos os verificadores locais previstos. O resultado não fecha os gates externos nem promove a baseline; `completeChains=0/145` e `PILOT_BLOCKED` permanecem.

## 2026-08-14 — HOSTINGER-REMOTE-INVENTORY-115

- **item:** verificar se o Hostinger disponível pode fechar os gates externos do Trainee Vet;
- **evidência:** SSH read-only; Ubuntu 24.04; Docker Compose; Caddy válido; UFW com 80/443; certificados Let's Encrypt e routes de outros produtos; ausência de projeto/container/imagem/route/FQDN do Trainee Vet; backups locais somente de outro sistema; ausência observada de `restic`, `rclone`, `aws` e agendamento específico de backup externo;
- **resultado:** Hostinger é candidato técnico, não ambiente autorizado. A capacidade genérica de edge não fecha DNS/TLS do produto; backups locais não fecham retenção externa, RPO/RTO ou DR; CI/registry/deploy/rollback continuam sem prova;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`;
- **owner/dependência:** Ricardo + SRE; decisão de alvo, FQDN, IdP, registry/CI, storage externo, retenção, janela de mudança e rollback;
- **critério de saída:** provisionamento autorizado no mesmo RC, HTTPS público renovável, IdP/MFA/recovery real, backup externo/restore/RPO/RTO, pipeline/registry/deploy/rollback por digest, UAT/DR e reauditoria;
- **restrição:** nenhuma escrita remota foi realizada; não ler ou registrar segredos; não reutilizar os backups de outro produto.

## 2026-08-14 — FULL-VERIFY-DOC-116

- **evidência:** `pnpm verify` após o inventário remoto passou com 161 arquivos/706 testes/18 skips, cobertura 83,78%/80,41%/84,95%/84,55%, contratos 81/81, worker 24/24, migrations 29/29 e gate de documentação consistente;
- **resultado:** qualidade e governança locais preservadas; `145/145` linhas têm evidência local, mas `0/145` cadeias completas;
- **status:** gates externos e humanos continuam `WAITING_HUMAN_APPROVAL`; disposição `PILOT_BLOCKED`;
- **próxima ação:** aprovar/provisionar alvo, FQDN, IdP, registry/CI, storage, retenção, janela e rollback antes de qualquer escrita remota.

## 2026-08-14 — LOCAL-RC-REBUILD-E2E-FAILOVER-RESTORE-117

- **evidência:** runtime HA reconstruído no source SHA `16dcc2afda04866b1ecfaeb6017fe30bdadaa8be`, digest `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`; APIs e workers na mesma revisão, health `200/200`;
- **checks:** build/restart web; E2E web sintético `25/25`; E2E HA com fixture `3/3`; failover com `api-a` parada `500/500`, 100% e p95 `626,14 ms`; restore live `2/2`, RTO local direto `3.832 ms`;
- **governança:** documentação `PASS`, rastreabilidade `PASS_WITH_GAPS` (`145/145` linhas, `0/145` cadeias), Web Performance `PASS_WITH_GAPS`; edge permanece interno/staging;
- **limite:** evidência não fecha revisão clínica, IdP/MFA, DNS/TLS público, backup externo/RPO/RTO, CI/registry/deploy/rollback remoto, UAT/WCAG manual/Web Vitals reais, soak, DR ou reauditoria;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; próxima ação é revisão final do diff e provisionamento autorizado.

## 2026-08-14 — FULL-VERIFY-POST-RC-DOC-118

- **evidência:** `pnpm verify` passou com 161 arquivos/706 testes/18 skips, cobertura 83,78%/80,41%/84,95%/84,55%, contratos 81/81, worker 24/24, migrations 29/29 e gates locais verdes; `git diff --check` passou;
- **rastreabilidade:** `verify:premium-traceability=PASS_WITH_GAPS`, 145/145 linhas locais, 87/87 P0/P1 e 0/145 cadeias completas;
- **limite:** a execução não fecha revisão clínica, IdP/MFA, DNS/TLS, backup/RPO/RTO, CI/registry/deploy/rollback remoto, UAT/manual WCAG/Web Vitals, soak, DR ou reauditoria;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; próxima ação é revisão final e provisionamento autorizado no mesmo RC.

## 2026-08-14 — DOCUMENTATION-COMMIT-119

- **resultado:** relatório, estado, log, backlog, roadmap, plano executivo, remediação e análise de rastreabilidade consolidados no commit local convencional desta rodada;
- **restrição:** nenhuma alteração de código executável, push ou escrita remota; worktree limpo;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; provisionar os ambientes/provedores autorizados e reauditar o mesmo RC.

## 2026-08-14 — LOCAL-WEB-VITALS-BOUNDED-LOAD-120

- **evidência:** Chromium local mediu LCP `232/172 ms`, CLS `0/0` e INP proxy `120/144 ms` em mobile/desktop, HTTP 200;
- **capacidade:** carga delimitada `20.000/20.000`, concorrência `50`, throughput `889,41 req/s`, p95 `119,82 ms`, zero erros;
- **artefato:** `docs/115_local_web_vitals_capacity_evidence_2026-08-14.md`;
- **limite:** não fecha RUM público, UAT/manual WCAG, screen reader, soak de 24 horas, SLO, DR ou CI de budgets;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`.

## 2026-08-14 — REMOTE-CI-READONLY-RECHECK-121

- **evidência:** PR `#1` aberto, head remoto `d3964a9e45b624a4e3c3967ca8f684cb00210e8c`, dois checks `quality` mais recentes falhos;
- **infraestrutura:** `0` secrets, `0` variables, `0` environments e `0` deployments no repositório;
- **limite:** o RC local atual não foi publicado; bundle licenciado, CI verde, registry, deploy e rollback remoto permanecem pendentes;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`.

## 2026-08-14 — DOCUMENTATION-COMMIT-122

- **resultado:** novo artefato de Web Vitals/carga, reconciliação do preflight e inventário CI foram consolidados com relatório, estado, log, backlog, roadmap, plano e rastreabilidade;
- **restrição:** nenhum push, alteração de código executável ou escrita remota; worktree limpo;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; provisionar dependências externas/humanas e reauditar o mesmo RC.

## 2026-08-14T13:18:25-03:00 — CLINICAL-SOURCE-BUNDLE-BOUNDARY-123

- **entrega:** fronteira segura para bundle privado/licenciado em `CVG_CLINICAL_SOURCES_DIRECTORY`, com caminho absoluto externo, basename sem traversal, variável documentada no CI e PDFs mantidos fora do Git;
- **checks:** testes focais `11/11`, `pnpm verify:ci-contract` e `pnpm verify:clinical-sources` passaram localmente;
- **resultado:** prepara a resolução de BLK-05 sem alegar CI remoto; `0/145` cadeias completas, baseline `83,24/100` e `PILOT_BLOCKED` permanecem;
- **próxima ação:** aprovar/provisionar bundle, credencial read-only, retenção, runner, registry, deploy e rollback; executar o pipeline e reauditar no mesmo RC.
- **commit local:** `9bfa2c1` (`fix: support external clinical source bundle`), sem push.

## 2026-08-14T14:38:49-03:00 — REMOTE-CI-DIAGNOSTIC-131

- **evidência:** GitHub Actions run `31402470511`/job `93500569913` no PR `#1` falhou em `verify:clinical-sources` por ausência dos três arquivos licenciados no checkout remoto;
- **head:** remoto `d3964a9e45b624a4e3c3967ca8f684cb00210e8c`, enquanto o worktree local está em `67552e4` e o RC executável está em `be43fc8f`;
- **infraestrutura:** `0` secrets, `0` variables, `0` environments e `0` deployments; nenhum push, dispatch ou provisionamento foi executado;
- **correção local:** `9bfa2c1` implementa `CVG_CLINICAL_SOURCES_DIRECTORY` absoluto, externo e hash-verificado, mas ainda aguarda publicação autorizada e bundle privado/licenciado;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; aprovar provider/bundle/push, publicar o RC, executar CI/registry/deploy/rollback e reauditar.

## 2026-08-14T14:24:40-03:00 — RUNTIME-PROVENANCE-GATE-130

- **entrega:** `scripts/verify-runtime-provenance.mjs` e testes focais `6/6`; o gate exige SHA explícito, `running/healthy`, imagem `@sha256`, digest comum, label OCI e `CVG_SOURCE_SHA` alinhados;
- **evidência:** recriação direta por tag foi rejeitada; rehearsal local passou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`; runtime final no SHA `be43fc8f7f410435a40550eb70e9b2a700882355`, digest `sha256:0ec956ffa267fd4534feaaf1000bd85adbacab77ce105775ea15a4af20b73fcf`, quatro processos HA e health `200/200/200`;
- **clínico:** fila live `796` total, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; modo estrito falhou de forma esperada, sem publicação;
- **aceite:** reforça somente BLK-06 local; não fecha revisão clínica, IdP/MFA, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback externo, UAT, WCAG manual, Web Vitals reais, soak, DR ou `0/145`;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; provisionar dependências externas e reauditar o mesmo RC sem drift;
- **commit local:** `be43fc8` (`feat: add runtime provenance gate`), sem push.

## 2026-08-14T14:46:03-03:00 — FINAL-LOCAL-REVALIDATION-132

- **evidência:** proveniência, HA, edge security, documentação, rastreabilidade baseline e rastreabilidade premium passaram; runtime no SHA `be43fc8f7f410435a40550eb70e9b2a700882355`, digest `sha256:0ec956ffa267fd4534feaaf1000bd85adbacab77ce105775ea15a4af20b73fcf`, quatro containers alinhados;
- **estado:** worktree limpo no commit documental final; nenhuma escrita externa foi realizada;
- **aceite:** confirma apenas a fatia local; `0/145` cadeias, `83,24/100`, gates externos, clínicos e humanos permanecem abertos;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; obter autorizações/dependências e reauditar o mesmo RC.

## 2026-08-14T14:53:34-03:00 — EDGE-LIVE-REVALIDATION-133

- **evidência:** Compose executado com `infra/production/.env.local`; quatro processos de aplicação `healthy` no digest comum; `60/60` probes HTTP readiness retornaram `200`; HTTPS local respondeu `200` com hostname `localhost`;
- **limite:** certificado é `Caddy Local Authority - ECC Intermediate`; não comprova CA pública, DNS público ou TLS gerenciado;
- **risco observado:** logs do edge registram falhas intermitentes de resolução Docker de `api-a/api-b` e janelas `503 no upstreams available`, não reproduzidas na amostra curta;
- **status/next:** `PARTIAL` / `WAITING_HUMAN_APPROVAL`; investigar a intermitência e provisionar/verificar o edge público autorizado antes de promover BLK-03/BLK-07.

## 2026-08-14T15:03:15-03:00 — RUNTIME-HEAD-REANCHOR-134

- **entrega:** RC reconstruído no source SHA `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa`; rehearsal local passou `deploy`, `rollback` e `runtimeRestored=true`;
- **proveniência:** release digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b`; rollback sintético `sha256:b293b4235e2c2b614bfeec1887a509dbf0d1dcbb51d55344ba591f72a144ebc9`; quatro containers alinhados no mesmo digest/SHA;
- **health:** Compose `healthy`; live/ready/dependencies `200/200/200`; `ops:verify-ha` e `ops:verify-edge-security` passaram;
- **aceite:** fecha somente BLK-06 local; não prova promoção produtiva, edge público, CI remoto, backup, IdP/MFA, beta, UAT, soak/DR ou `0/145`;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; manter o RC imutável, investigar a intermitência do edge e aguardar as autorizações/provisionamentos externos.

## 2026-08-14T15:10:35-03:00 — FULL-VERIFY-CURRENT-RC-135

- **evidência:** `pnpm verify` passou com `163` arquivos/`719` testes/`18` skips e cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`; contratos `81/81`, worker `24/24`, migrations `29/29`, lint, typecheck, secrets e governanças passaram;
- **proveniência:** gate continuou `PASS` para os quatro containers no source SHA executável `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa` e digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b`;
- **aceite:** confirma qualidade local; `0/145` cadeias completas e gates externos/clínicos/humanos continuam abertos;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; executar a reauditoria do mesmo RC somente após provisionamento e autorização.

## 2026-08-14T15:16:10-03:00 — REMOTE-CI-BETA-RECHECK-136

- **beta local:** fila escopada/paginada, `CLINICAL_APPROVER`, rota de decisão, persistência e bloqueio de publicação estão implementados nos commits `c7a591b` e `8670def`;
- **evidência live:** `796` conteúdos, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; revisão veterinária efetiva ainda não executada;
- **CI remoto:** PR `#1` continua no head `d3964a9e…`; runs `31402470511` e `31402464508` falham por ausência dos três arquivos licenciados; `0` secrets/variables/environments/deployments;
- **divergência:** o head remoto é ancestral do worktree local; as correções locais posteriores não foram publicadas e não houve push/dispatch;
- **status/next:** `READY_FOR_HUMAN_EXECUTION` para o beta técnico, `FAIL` para o CI remoto e `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED`; aprovar veterinários, bundle/licença, variável/runner e publicação do RC.

## 2026-08-14T15:21:52-03:00 — BETA-E2E-REVALIDATION-137

- **build:** web reconstruído com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182`;
- **E2E:** `tests/e2e/authoring-review.spec.ts` passou `2/2` contra o web local ativo: publicação condicionada e fila paginada sem exposição de internals;
- **limite:** prova técnica local; não comprova roster, revisão humana dos `763`, calibração, CI/registry/deploy produtivo ou publicação;
- **status/next:** `PASS` para a superfície técnica, `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` para o beta e release.

## 2026-08-14T15:27:56-03:00 — LOCAL-RUNTIME-RECHECK-138

- **evidência:** proveniência explícita passou nos quatro containers no SHA `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa`, digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b`; HA, edge estático, fontes clínicas, premium traceability e diff-check passaram;
- **health:** live/ready/dependencies `200` em `127.0.0.1:3182` e HTTPS local live/ready `200` em `localhost:3181`;
- **limite:** `145/145` linhas locais e `0/145` cadeias completas; revisão dos `763` itens, CI/registry/deploy externo, edge público, identidade, backup, UAT e reauditoria permanecem abertos;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; aguardar autorização/provisionamento e executar somente os gates reais no mesmo RC.

## 2026-08-14T15:47:15-03:00 — EDGE-RC-REANCHOR-139

- **correção:** TDD RED/GREEN adicionou `health_fails 3`, `health_passes 2` e `lb_try_duration 5s` ao Caddy local e ao perfil produtivo; Caddy validate passou;
- **RC:** commit `8859c6c`, source SHA `8859c6c1ae1f11ff9a0ae55f79027469aaf21ee6`, digest `sha256:e5d9d7a2c6673f5988919a3708f8f7816aea97989fac8c0bf7b681f318f22b94`, rehearsal deploy/rollback/restauração `PASS`, rollback `sha256:b24ae6ca5a12f3833982edd80f4b7b226e20163f4fb10c0edcec0e821fb9e7d2`;
- **verificação:** `pnpm verify` `163/720/18`, cobertura `83,78%/80,41%/84,95%/84,55%`, E2E HA `3/3`, proveniência HA `PASS`, live/ready/dependencies `200`, HTTPS `200/200` e probes `200/200`;
- **gaps:** edge público/CA, CI/registry/deploy externo, IdP/MFA, backup/RPO/RTO, revisão dos `763`, UAT/WCAG manual, Web Vitals reais, soak, DR e `0/145` permanecem abertos;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; executar gates autorizados no mesmo RC.

## 2026-08-14T15:51:33-03:00 — FULL-VERIFY-EDGE-RC-140

- **evidência:** `git diff --check` e `pnpm verify` passaram com `163/720/18`, cobertura `83,78%/80,41%/84,95%/84,55%`, contratos `81/81`, worker `24/24`, migrations `29/29`, lint, typecheck, secrets, governanças, arquitetura, documentação e produto;
- **runtime:** source SHA `8859c6c1ae1f11ff9a0ae55f79027469aaf21ee6`, digest `sha256:e5d9d7a2c6673f5988919a3708f8f7816aea97989fac8c0bf7b681f318f22b94`, proveniência PASS e E2E HA `3/3`;
- **limite:** `145/145` evidências locais, `87/87` P0/P1 e `0/145` cadeias; gates clínicos, humanos, externos e produtivos continuam abertos;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; executar gates reais no mesmo RC após autorização.

## 2026-08-16T00:57:25-03:00 — CODE-QUALITY-AUDIT-146

- **resultado:** auditoria independente `64,20/100`; recorte interno `70,62/100`; runtime/operação/release/proveniência `43,88/100`; nenhum P0; `PILOT_BLOCKED` preservado;
- **evidência:** `docs/116_code_quality_audit_2026-08-16.md`; HEAD auditado `1579442fa3dcf9a32bf5e7e1ce73977f2d8a60cd`; `pnpm verify` e build verdes; E2E canônico vermelho; SHA do runtime inexistente no Git; CI remoto vermelho;
- **decisão:** as tarefas locais abaixo precedem qualquer promoção, push de RC ou execução de gates produtivos.

| ID | Prioridade | Estado | Entrega/aceite resumido |
|---|---|---|---|
| AUD-CQ-001 | P1 | READY_FOR_NEXT_STEP | Proveniência Git fail-closed implementada; build/verify locais passam; runtime/RC e reauditoria permanecem. |
| AUD-CQ-002 | P1 | READY_FOR_NEXT_STEP | Aprovador designado e publicação fail-closed implementados; revisão clínica/RC permanece. |
| AUD-CQ-003 | P1 | READY_FOR_NEXT_STEP | Role/scope e senha revogam sessões; step-up/prova de runtime e reauditoria permanecem. |
| AUD-CQ-004 | P1 | READY_FOR_NEXT_STEP | Fallback `500/503`, log sanitizado e zero hang/unhandled rejection local verificados; runtime permanece. |
| AUD-CQ-005 | P1 | READY_FOR_NEXT_STEP | Build atualizado e E2E completo passaram `26/26`; CI remoto/artefatos retidos e reauditoria permanecem. |
| AUD-CQ-006 | P1 | READY_FOR_NEXT_STEP | Readiness, regras, workers e Alertmanager local verificados; ack externo e runtime descartável permanecem. |
| AUD-CQ-007 | P1 | READY_FOR_NEXT_STEP | Canário `api-a` direto e janela local implementados; execução real/rollback por digest e reauditoria permanecem. |
| AUD-CQ-008 | P1 | READY_FOR_NEXT_STEP | OTLP loopback, `0600` e hardening local verificados; scanner/rotação/RC externo permanecem. |
| AUD-CQ-009 | P1 | READY_FOR_NEXT_STEP | Logout, sessão por capacidade, convite transacional, account security e retry de atribuição com o mesmo assignment ID implementados; reauditoria no RC permanece. |
| AUD-CQ-010 | P1 | READY_FOR_NEXT_STEP | Gate `7/7` de decisões críticas a `100%` passou; matriz de risco reporta `63/87` error, `26/87` denied, `36/87` conflict e `11/87` linhas completas; provas restantes e reauditoria permanecem. |
| AUD-CQ-011 | P2 | READY_FOR_NEXT_STEP | API, currículo, persistência, frontend, observabilidade, publicação clínica, governança de observabilidade, configuração de runtime, correção de resposta aberta, materialização curricular, verificador de restore, definição de produto, jornada de convite, governança da jornada de correção, persistência de convites e governança de capacidade decompostos; `0` hotspots >800, `153` funções longas, maior função `130` linhas e debt ratchet verificados; reauditoria permanece. |
| AUD-CQ-012 | P2 | READY_FOR_NEXT_STEP | Cobertura integral passou `784` testes com `18` skips governados (`84,81%` statements / `80,18%` branches / `87,13%` functions / `85,65%` lines) e E2E pós-refatoração `26/26`; cross-browser/mobile/a11y manual permanecem. |
| AUD-CQ-013 | P2 | READY_FOR_NEXT_STEP | Documentos históricos/supersedidos e gate documental global verificados; reauditoria de governança permanece. |
| AUD-CQ-014 | P2 | READY_FOR_NEXT_STEP | Rate limit atrás de proxy confiável implementado/testado; prova distribuída/por rota e reauditoria permanecem. |
| AUD-CQ-015 | P2 | WAITING_HUMAN_APPROVAL | Executar CI/registry/deploy, IdP, TLS, backup/DR, UAT, WCAG, RUM, soak e beta no mesmo RC. |

## 2026-08-16T05:18:37-03:00 — CODE-QUALITY-REVALIDATION-S4-152

- **entregas locais:** Account, Authoring, Participant/Admin e os agregados de `learning-state-repository` foram extraídos sob TDD; o teste de composição passou `9/9` após o RED inicial;
- **verificação:** build nos `12` workspaces, E2E canônico `26/26`, `pnpm verify` com `168` arquivos de teste, `750` testes aprovados, `18` skips governados, cobertura `84,59%`/`80,60%`/`86,00%`/`85,38%`, decisões críticas `7/7`, contratos `81/81`, worker `25/25`, migrations `29/29` e secrets limpo;
- **estrutura:** `verify:hotspots` em `PASS_WITH_DEBT_RATCHET`, sem arquivo acima de `800` linhas, `175` funções longas e maior função de `346` linhas; `git diff --check`, documentação e rastreabilidade passaram;
- **limite:** o worktree está não comitado; a evidência HA/proveniência anterior às últimas extrações não é promovida para este estado sem repetição no mesmo RC; não houve alteração externa nem promoção de score;
- **status/next:** AUD-CQ-001–014 permanecem `READY_FOR_NEXT_STEP` para runtime audit/reauditoria; AUD-CQ-015 permanece `WAITING_HUMAN_APPROVAL`; score histórico `64,20/100`, `0/145` cadeias completas e `PILOT_BLOCKED` continuam explícitos.

## 2026-08-16T05:29:57-03:00 — ACTIVE-HA-REVALIDATION-S4-153

- **evidência funcional:** imagem descartável `cvg-trainee-vet:worktree-s4` reconstruída do worktree, quatro serviços HA recriados, live/ready/dependencies `200/200/200` e `pnpm test:e2e:active-ha` `3/3` (browser via proxy real, atividade persistida e lifecycle administrativo persistido);
- **teardown:** fixture real removido com sucesso; web server/build temporários encerrados e nenhum serviço externo ou dado real alterado;
- **limite:** `SOURCE_SHA=worktree-uncommitted` não é commit Git; esta prova não fecha proveniência, release, rollback ou `0/145` cadeias;
- **status/next:** AUD-CQ-005–008 continuam `READY_FOR_NEXT_STEP` para runtime/release audit; `AUD-CQ-015` permanece `WAITING_HUMAN_APPROVAL`; gerar RC com SHA real e executar os gates externos antes da reauditoria.

## 2026-08-16T06:36:55-03:00 — CODE-QUALITY-REVALIDATION-S4-154

- **evidência:** extrações TDD de `api-runtime-resources`/`api-http-dependencies` e decomposição de `advanceContent`; build nos `12` workspaces; `pnpm verify` com `170` arquivos, `754` testes, `18` skips, cobertura `84,68%`/`80,63%`/`86,35%`/`85,50%`, decisões `7/7`, contratos `81/81`, worker `25/25`, migrations `29/29`; hotspots `0`, maior função `222` linhas;
- **E2E:** `CVG_E2E_WEB_PORT=3123 pnpm exec playwright test` passou `26/26`; o 403 investigado no HA era CSRF por origem `WEB_ORIGINS` incompatível, antes do handler, e os diagnósticos temporários foram removidos;
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T10:39:29-03:00 — CODE-QUALITY-REVALIDATION-S4-173

- **entregas locais:** `DashboardPage` foi reduzido de `217` para `21` linhas; modelo/loader, estado, apresentação e composição dos estados foram separados em `apps/web/app/dashboard/{dashboard-model.ts,dashboard-state.ts,dashboard-view.tsx}`; o teste de composição RED/GREEN passou `3/3` e a caracterização focal passou `6/6`;
- **verificação:** `pnpm verify` passou com `177` arquivos, `790` testes, `16` skips e cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%`; build nos `12` workspaces; E2E web `26/26` em `21,2s`; hotspots `0`, `152` funções longas e maior função `128` linhas;
- **limite/status:** a execução integral precisou ocorrer fora da restrição do sandbox para abrir listeners; a API não estava ativa em `3101`, então o E2E não é evidência HA. O worktree continua não comitado, `AUD-CQ-001–014` segue pronto para runtime audit/reauditoria, `AUD-CQ-015` segue `WAITING_HUMAN_APPROVAL`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T07:50:30-03:00 — CODE-QUALITY-REVALIDATION-S4-158

- **entregas locais:** `test-risk-matrix.json` passou a manter referências explícitas para destinos de testes de erro; o verificador exige que cada destino esteja ligado à matriz canônica e o teste de governança passou `3/3` após RED/GREEN;
- **verificação:** `pnpm verify` passou com `171` arquivos, `765` testes, `18` skips e cobertura `84,65%`/`80,01%`/`86,76%`/`85,47%`; matriz de risco `87` requisitos, `63` error, `26` denied, `36` conflict e `11` linhas completas, sem promoção (`PASS_WITH_GAPS`/`PILOT_BLOCKED`);
- **build/E2E:** build nos `12` workspaces; `CVG_E2E_WEB_PORT=3126 pnpm exec playwright test` passou `26/26` em `16,0s`; sem API local em `3101`, não é evidência HA;
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem; `24` RF P0/P1 ainda não têm error proof e os demais gates externos/humanos continuam abertos.

## 2026-08-16T10:11:24-03:00 — CODE-QUALITY-REVALIDATION-S4-172

- **entregas locais:** `scripts/verify-capacity-governance.mjs::validateCapacityGovernanceSnapshot` foi decomposto sob TDD em validadores de metadados, smoke, exploração/failover/soak e gaps em `scripts/verify-capacity-governance-support.mjs`; o teste focal passou `4/4`;
- **verificação:** `pnpm verify` passou com `175` arquivos, `784` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%`; o gate reportou `200/200`, `3` cargas escalonadas, failover `100%`, soak `NOT_EXECUTED` e `4` gaps; hotspots `0`, `153` funções longas, maior função `130` linhas; build nos `12` workspaces e E2E `26/26` em `16,6s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `apps/web/app/dashboard/page.tsx::DashboardPage` sob TDD.

## 2026-08-16T10:04:15-03:00 — CODE-QUALITY-REVALIDATION-S4-171

- **entregas locais:** `packages/persistence/src/invitation-repository.ts::createInvitationUseCaseDependencies` foi decomposto sob TDD em composição fina de operações; `packages/persistence/src/invitation-repository-support.ts` separa mapeamentos, port de conta, port de convite e composição de sessão/auditoria; o teste focal passou `4/4`;
- **verificação:** `pnpm verify` passou com `175` arquivos, `783` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%`; hotspots `0`, `154` funções longas, maior função `131` linhas; build nos `12` workspaces e E2E `26/26` em `15,9s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `scripts/verify-capacity-governance.mjs::validateCapacityGovernanceSnapshot` sob TDD.

## 2026-08-16T09:53:20-03:00 — CODE-QUALITY-REVALIDATION-S4-170

- **entregas locais:** `scripts/verify-journey-correction-governance.mjs::validateJourneyCorrectionGovernance` foi decomposto sob TDD em validadores de metadados, invariantes, evidências e gaps em `scripts/journey-correction-governance-support.mjs`; o teste focal passou `3/3`, preservando os contratos e gaps explícitos;
- **verificação:** `pnpm verify` passou com `174` arquivos, `782` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; o gate reportou `4` tasks, `4` invariantes, `4` evidências e `5` gaps; hotspots `0`, `154` funções longas, maior função `135` linhas; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `packages/persistence/src/invitation-repository.ts::createInvitationUseCaseDependencies` sob TDD.

## 2026-08-16T09:44:23-03:00 — CODE-QUALITY-REVALIDATION-S4-169

- **entregas locais:** `apps/web/app/invite/page.tsx::InvitePage` foi decomposto sob TDD em hook de estado, modelo HTTP/validação e componentes visuais; o teste focal passou `3/3`, preservando token, validação, envelope de sucesso, sessão, mensagens bounded e acessibilidade;
- **verificação:** `pnpm verify` passou com `174` arquivos, `781` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `155` funções longas, maior função `140` linhas; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram após o build;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; o build inicialmente encontrou imports locais `.js` não resolvidos pelo Turbopack e passou após a correção para imports extensionless; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `scripts/verify-journey-correction-governance.mjs::validateJourneyCorrectionGovernance` sob TDD.

## 2026-08-16T09:32:29-03:00 — CODE-QUALITY-REVALIDATION-S4-168

- **entregas locais:** `scripts/verify-product-definition.mjs::validateProductDefinitionSnapshot` foi decomposto sob TDD em validadores de arquivos, gates, conteúdo, cobertura e baseline de rastreabilidade; `scripts/verify-product-definition-support.mjs` concentra as regras, preservando o gate Discovery→PRD→SPEC e o contrato de diagnóstico; o teste focal passou `3/3`;
- **verificação:** `pnpm verify` passou com `173` arquivos, `778` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `156` funções longas, maior função `141` linhas; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram após o build;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a tentativa concorrente com o build falhou apenas pela corrida de criação de `.next` e foi repetida com sucesso; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `apps/web/app/invite/page.tsx::InvitePage` sob TDD.

## 2026-08-16T09:24:00-03:00 — CODE-QUALITY-REVALIDATION-S4-167

- **entregas locais:** `scripts/verify-postgres-restore.mjs` foi decomposto sob TDD em parsing, alvos, fases de restore/verificação e teardown; o teste focal passou `2/2`, preservando modos de artefato sintético e armazenado, isolamento e cleanup;
- **verificação:** `pnpm verify` passou com `173` arquivos, `777` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `157` funções longas, maior função `145` linhas; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; restore PostgreSQL live depende de banco/artefato externo e não foi executado neste ciclo; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `scripts/verify-product-definition.mjs::validateProductDefinitionSnapshot` sob TDD.

## 2026-08-16T09:14:43-03:00 — CODE-QUALITY-REVALIDATION-S4-166

- **entregas locais:** `scripts/materialize-curriculum.mjs` foi decomposto sob TDD em entrypoint, suporte puro e persistência por agregado; o teste focal passou `3/3`, preservando IDs, escopo, preflight, transação e relatório;
- **verificação:** `pnpm verify` passou com `172` arquivos, `775` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `158` funções longas, maior função `170` linhas; build nos `12` workspaces e E2E `26/26` em `15,9s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `scripts/verify-postgres-restore.mjs::main` sob TDD.

## 2026-08-16T09:06:16-03:00 — CODE-QUALITY-REVALIDATION-S4-165

- **entregas locais:** `correctOpenResponse` foi decomposto sob TDD em validação, autorização, carregamento/estado, resultado, evento, auditoria e aplicação transacional; a idempotência e os invariantes de correção foram preservados e o teste focal passou `3/3`;
- **verificação:** `pnpm verify` passou com `171` arquivos, `772` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `160` funções longas, maior função `179` linhas; build nos `12` workspaces e E2E `26/26` em `16,1s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir a próxima função longa sob TDD.

## 2026-08-16T08:53:02-03:00 — CODE-QUALITY-REVALIDATION-S4-164

- **entregas locais:** `loadRuntimeConfig` foi separado em parsing, validações por capability e builders imutáveis; a caracterização do pacote de configuração passou `13/13`;
- **verificação:** `pnpm test:coverage` passou com `171` arquivos, `772` testes, `18` skips e cobertura `84,79%`/`80,18%`/`87,07%`/`85,62%`; hotspots `0`, `161` funções longas, maior função `179` linhas;
- **verificação:** `pnpm verify` passou com `171` arquivos, `772` testes, `18` skips e cobertura `84,79%`/`80,18%`/`87,07%`/`85,62%`; build nos `12` workspaces e E2E `26/26` em `16,1s` também passaram;
- **limite/status:** sem API local em `3101`, o E2E não é evidência HA; worktree não comitado, AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, a próxima redução local é `correctOpenResponse`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T08:46:53-03:00 — CODE-QUALITY-REVALIDATION-S4-163

- **entregas locais:** `validateObservabilityGovernance` foi decomposto em validadores de metadados, sinais, alertas e regras; o teste de composição passou `3/3` e os marcadores da camada HTTP continuam cobertos;
- **verificação:** `pnpm verify` passou com `171` arquivos, `772` testes, `18` skips e cobertura `84,80%`/`80,18%`/`86,99%`/`85,63%`; hotspots `0`, `162` funções longas, maior função `179` linhas;
- **build/E2E:** build nos `12` workspaces; após o build, `CVG_E2E_WEB_PORT=3132 pnpm exec playwright test` passou `26/26` em `16,0s`; sem API local em `3101`, não é evidência HA;
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP` para runtime audit/reauditoria, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, a próxima redução local é `loadRuntimeConfig`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T08:39:24-03:00 — CODE-QUALITY-REVALIDATION-S4-162

- **entregas locais:** `createApiServer` foi reduzido a composição fina e a camada HTTP foi extraída para `apps/api/src/server-http.ts`; o contrato de observabilidade passou a incluir a fonte extraída e o teste focal passou `2/2`;
- **verificação:** `pnpm verify` passou com `171` arquivos, `771` testes, `18` skips e cobertura `84,80%`/`80,18%`/`86,99%`/`85,63%`; hotspots `0`, `163` funções longas, maior função `179` linhas;
- **build/E2E:** build nos `12` workspaces; após o build, `CVG_E2E_WEB_PORT=3130 pnpm exec playwright test` passou `26/26` em `16,0s`; sem API local em `3101`, não é evidência HA;
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP` para runtime audit/reauditoria, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, a próxima redução local é `validateObservabilityGovernance`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T08:24:37-03:00 — CODE-QUALITY-REVALIDATION-S4-161

- **entregas locais:** `publishAuthoringContent` foi separado em `packages/application/src/authoring-publication.ts`, com aprovação clínica independente, preflight, transições e projeção imutáveis; RED/GREEN passou `9/9` no authoring e cobriu rejeições fail-closed;
- **verificação:** `pnpm verify` passou com `171` arquivos, `770` testes, `18` skips e cobertura `84,79%`/`80,16%`/`86,94%`/`85,62%`; hotspots `0`, `165` funções longas, maior função `179` linhas;
- **build/E2E:** build nos `12` workspaces; após o build, `CVG_E2E_WEB_PORT=3129 pnpm exec playwright test` passou `26/26` em `16,0s`; sem API local em `3101`, não é evidência HA;
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T08:14:08-03:00 — CODE-QUALITY-REVALIDATION-S4-160

- **entregas locais:** `reviewAuthoringContent` foi separado em `packages/application/src/authoring-review.ts`, com autorização clínica, preflight, transições e persistência imutáveis; RED/GREEN passou `7/7` no pacote de aplicação e preservou o bloqueio de autoaprovação/publicação;
- **verificação:** `pnpm verify` passou com `171` arquivos, `768` testes, `18` skips e cobertura `84,66%`/`80,03%`/`86,87%`/`85,49%`; hotspots `0`, `166` funções longas, maior função `179` linhas;
- **build/E2E:** build nos `12` workspaces; após o build, `CVG_E2E_WEB_PORT=3128 pnpm exec playwright test` passou `26/26` em `16,0s`; sem API local em `3101`, não é evidência HA;
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T08:04:01-03:00 — CODE-QUALITY-REVALIDATION-S4-159

- **entregas locais:** `preflightCurriculumDrafts` foi separado em verificadores de preflight de módulo/diagnóstico e checks puros; RED/GREEN passou `18/18` no teste curricular;
- **verificação:** `pnpm verify` passou com `171` arquivos, `767` testes, `18` skips e cobertura `84,65%`/`80,03%`/`86,78%`/`85,48%`; hotspots `0`, `167` funções longas, maior função `179` linhas;
- **build/E2E:** build nos `12` workspaces; `CVG_E2E_WEB_PORT=3127 pnpm exec playwright test` passou `26/26` em `16,1s`; sem API local em `3101`, não é evidência HA;
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T06:36:55-03:00 — ACTIVE-HA-REVALIDATION-S4-155

- **evidência funcional:** imagem `cvg-trainee-vet:worktree-s8`, quatro serviços API/worker saudáveis, live/ready/dependencies `200/200/200` e `BASE_URL=http://127.0.0.1:3121 ... pnpm test:e2e:active-ha` `3/3`;
- **teardown/configuração:** atividade participante e lifecycle administrativo persistiram; fixture e web/build temporários foram removidos; runtime local foi reconciliado para `WEB_ORIGINS` em `:3100`;
- **limite/status:** `worktree-uncommitted` não é SHA Git; AUD-CQ-005–008 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`; gerar RC com SHA real e executar os gates externos antes da reauditoria.

## 2026-08-16T07:23:44-03:00 — CODE-QUALITY-REVALIDATION-S4-156

- **entregas locais:** extrações TDD de Qdrant, content repository, avaliação curricular, template de rotas, frontend de moderador/login e repositórios answer/assessment/attempt/correction/authoring; dados sintéticos do caso digital isolados em módulo imutável; correção do import local do dashboard para o Turbopack;
- **verificação:** build nos `12` workspaces; `pnpm verify` com `171` arquivos, `763` testes aprovados, `18` skips governados, cobertura `84,63%`/`80,00%`/`86,68%`/`85,46%`, decisões `7/7`, contratos `81/81`, worker `25/25`, migrations `29/29` e secrets limpo;
- **estrutura/E2E:** `verify:hotspots` passou com `0` hotspots, `170` funções longas e maior função `179` linhas; `CVG_E2E_WEB_PORT=3124 pnpm exec playwright test` passou `26/26` em `17,5s` (sem API local em `3101`, logo sem valor de evidência HA);
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-16T07:37:04-03:00 — CODE-QUALITY-REVALIDATION-S4-157

- **entregas locais:** núcleo de métricas isolado em `packages/observability/src/metrics.ts`, com store imutável e composição explícita; `observability.ts` reduziu a `599` linhas; teste de composição RED/GREEN e branch global faltante coberto;
- **verificação:** `pnpm verify` com `171` arquivos, `764` testes, `18` skips, cobertura `84,65%`/`80,01%`/`86,76%`/`85,47%`, decisões `7/7`, contratos `81/81`, worker `25/25`, migrations `29/29` e secrets limpo; hotspots `0`, `169` funções longas, maior função `179` linhas;
- **build/E2E:** build nos `12` workspaces; `CVG_E2E_WEB_PORT=3125 pnpm exec playwright test` passou `26/26` em `18,7s`; sem API local em `3101`, não é evidência HA;
- **limite/status:** worktree não comitado; AUD-CQ-001–014 seguem `READY_FOR_NEXT_STEP`, AUD-CQ-015 segue `WAITING_HUMAN_APPROVAL`, score `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` permanecem.

## 2026-08-20T10:19:27-03:00 — DUAL99-B99-105-IDEMPOTENCY-INTEGRITY

- **entrega:** B99-105 fechou localmente o contrato de idempotência nos quatro
  adapters: chave 16–128, lock advisory namespaced por transação,
  `CURRENT_TIMESTAMP` para TTL/leitura/cleanup, conflito concorrente explícito
  e nenhuma expiração calculada por `Date.now()`;
- **persistência:** migration `0032_idempotency_integrity_closure.sql` adiciona
  defaults server-clock, constraints de operação/chave/fingerprint/expiry,
  `response_hash NOT NULL` com SHA-256, rejeição fail-closed de legado, `FORCE
  RLS`, `REVOKE ALL FROM PUBLIC` e policies `FOR DELETE` com contexto de
  participante/escopo;
- **verificação:** focais `112/112`, coverage `202/1060/21`, floors
  `95,06/91,06/95,31/95,76`, migration governance `33/33`, build `12/12`,
  typecheck/lint/format/audit, decisões `7/7`, mutation `7/7`, traceability,
  documentation, skips `20/20`, architecture, hotspots e diff-check verdes;
- **limite/status:** `verify:secrets` acusa apenas os quatro valores redigidos
  de `infra/production/.env.local`, sem leitura/alteração do arquivo; migration
  live, concorrência PostgreSQL, role restrita, RLS cleanup live, RC, score e
  release permanecem pendentes. Estado `IN_PROGRESS` / `PILOT_BLOCKED`.

## 2026-08-20T10:32:23-03:00 — DUAL99-B99-105-SCHEMA-RUNTIME-REVIEW

- **correção:** schema Drizzle de authoring agora declara o mesmo default
  server-clock de TTL presente na migration 0032;
- **verificação:** coverage fresca `202/1060/21`, floors
  `95,06/91,06/95,31/95,76`, migrations `33/33`, typecheck, lint, formato e
  diff-check passaram;
- a cobertura foi repetida após a revisão final do diff no worktree exato e
  manteve os mesmos números;
- **evidência runtime:** probe somente leitura encontrou migration count `30`,
  `cvg_admin` com `SUPERUSER/BYPASSRLS` e authoring idempotency sem RLS; o HA
  ativo está stale e não representa o RC desta rodada;
- **limite/status:** nenhuma alteração live, migration aplicada, score,
  release, commit ou push; B99-105 permanece localmente pronto e globalmente
  `IN_PROGRESS` / `PILOT_BLOCKED`, com role restrita e provas same-key/TTL/RLS
  ainda pendentes.

## 2026-08-20T10:53:52-03:00 — DUAL99-B99-106-DIAGNOSTICS-INVITE

- **entrega:** `/health/dependencies` foi alinhado no catálogo canônico a
  `VIEW_INTERNAL_AUDIT`/`INTERNAL`/`audit`; o fluxo administrativo passou a
  gerar `/invite#token=...`, ler token somente do fragmento e limpar também
  query legada;
- **RED/GREEN:** o contrato focal falhou com o descriptor público e o modelo
  falhou com query token; após a correção, contrato/modelo/estado/view/health
  passaram `22/22`, e os negativos 401/403/503 permaneceram cobertos;
- **E2E/gates:** Playwright sintético Chromium `3/3` em porta isolada `3213`;
  coverage `202/1060/21`, `95,05/91,06/95,31/95,75`; typecheck, lint, formato,
  diff-check, migrations `33/33`, decisions `7/7`, mutation `7/7`, documentação,
  traceability, Dual99, risk matrix, skips, architecture e public-boundary
  passaram. O timeout do hotspot AST foi explicitado em `30s` sob cobertura;
- **limite/status:** E2E sintético com mocks e API `3101` indisponível não prova
  HA/API/DB ativo; runtime PostgreSQL stale, secrets redigidos, RC, gates
  externos/clínicos, `0/145` e reauditoria permanecem. B99-106 segue
  `READY_FOR_NEXT_STEP` localmente; commit
  `4e4cd4e04718ca26c0cd1979152225301fbd249a` foi enviado para
  `origin/agent/publish-production-hardening`; estado global
  `IN_PROGRESS/PILOT_BLOCKED`.

## 2026-08-20T11:21:39-03:00 — DUAL99-B99-107-RATE-LIMIT-HEADERS-CORS

- **entrega:** diagnósticos internos agora entram no rate limit e retornam
  `429`/`Retry-After` sob abuso repetido; somente liveness/readiness permanecem
  sem janela. A API direta repete os headers de defesa da borda e o servidor
  congela uma cópia da política `allowedOrigins`, sem abrir CORS permissivo;
- **RED/GREEN e evidência:** o RED reproduziu os três gaps; o foco API passou
  `24/24`, a regressão `12/118`, o E2E sintético Chromium `3/3` em `3214`, e
  a cobertura passou `202/1062/21` com floors `95,05/91,06/95,31/95,75`;
- **gates/status:** build `12/12`, migrations `33/33`, decisions `7/7`,
  mutation `7/7`, documentation, traceability, Dual99, risk matrix, skips
  `20/20`, architecture, hotspots, public-boundary, edge security, audit de
  dependências e diff-check passaram. O secret scan acusa somente os quatro
  valores redigidos de `.env.local`; B99-107 está `READY_FOR_NEXT_STEP`
  localmente e o programa permanece `IN_PROGRESS/PILOT_BLOCKED`. Commit
  publicado: `6e4dc60def99a83143a70f06e95ab2db33fff123` em
  `origin/agent/publish-production-hardening`.

**Atualização Dual99 — 2026-08-20T14:28:58-03:00 — B99-305:** o RED
reproduziu `startAttempt`/`submitAttempt` em 76 linhas e, na etapa seguinte,
`dependencyResponse` em 75 linhas. O GREEN extraiu as fronteiras de
orquestração, autorização, projeção/cache e carregamento de dependências;
também corrigiu a regressão que duplicava `dependencyStatus` em requisições
in-flight. O foco de política passou `5/5`, a regressão relacionada passou
`97/97`, o hotspot verifier passou com `0` hotspots acima do limite, `111`
funções longas e maior função de `75` linhas. A barra crítica de `50` linhas
agora é testada para os três comandos sensíveis.

Cobertura `204/1085/21` passou em `95,02/90,92/95,31/95,70`; build `12/12`,
contratos `84/84`, worker `51/51`, decisões `7/7`, mutation `7/7`, arquitetura,
lint, typecheck, formato e diff-check passaram. B99-305 fica
`READY_FOR_NEXT_STEP` localmente; B99-306, Playwright ativo e os demais gates
de HA/RC/produção/clínica continuam abertos. O código publicado é `90f0a21`;
o `pnpm verify` oficial parou fail-closed em `verify:secrets` nos quatro
valores redigidos de `infra/production/.env.local`, que não foi lido nem
alterado; o programa permanece `IN_PROGRESS / PILOT_BLOCKED`.
