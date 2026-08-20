# Evidência local de execução Dual99 — 2026-08-20

- programa: `CVG-DUAL-99`
- corte: `2026-08-20T03:48:50-03:00`
- disposição: `IN_PROGRESS` / `PILOT_BLOCKED`
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
- worker: o inventário de skips foi atualizado de `20` para `21` testes e foi
  adicionada prova live de claim→lease→ack→cleanup PostgreSQL no teste de
  worker; o ambiente local sem banco live mantém essa prova guardada.

## Checkpoint corrente — 2026-08-20T03:48:50-03:00

| Evidência | Resultado |
|---|---|
| cobertura oficial | `200` arquivos aprovados / `17` guardados; `1.041` testes aprovados / `21` guardados; `95,01%` statements, `91,02%` branches, `95,19%` functions, `95,73%` lines |
| gates técnicos | format, lint, typecheck, decisões críticas `7/7`, contratos `84/84`, worker `46/46`, migrações `32/32`, dependency audit e diff-check verdes |
| hotspots | `PASS_WITH_DEBT_RATCHET`, `144` funções >50 linhas, maior `113`, zero arquivo >800 sem classificação |
| scanner | focal `14/14`; execução integral falha somente nas quatro atribuições redigidas de `infra/production/.env.local` |
| mutation crítica | `7/7 killed`, `0` sobreviventes, score `100%` / mínimo `90%` |
| build/E2E | build `12/12`; wrapper E2E com porta alternativa `3112`, Chromium sintético `27/27` |
| governança Dual99 | `PASS_WITH_GAPS`, `eligibleForIndependentReaudit=false`, `PILOT_BLOCKED`; traceabilidade `0/145`; skips `20/20` runs, `0` flaky, `17` arquivos guardados |

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
