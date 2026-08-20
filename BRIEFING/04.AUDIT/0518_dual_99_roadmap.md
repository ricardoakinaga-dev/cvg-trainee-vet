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

O código/testes de B99-308 foram commitados em `7c46ad3`; o avanço permanece
local e não altera a disposição `IN_PROGRESS` / `PILOT_BLOCKED`.

O avanço é local e não fecha B99-306, RC/proveniência, secret manager,
HA/API/DB externo, clínica, `0/145`, gates externos, duas reauditorias ou
go/no-go. F99-1 permanece `IN_PROGRESS` e o produto permanece
`PILOT_BLOCKED`.
