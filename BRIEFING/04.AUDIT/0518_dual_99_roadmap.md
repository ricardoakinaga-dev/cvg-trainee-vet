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
Código/teste estão em `adc2b85`; a evidência documental será reconciliada em
commit separado. O `pnpm verify` parou em `verify:secrets` somente nos quatro
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
