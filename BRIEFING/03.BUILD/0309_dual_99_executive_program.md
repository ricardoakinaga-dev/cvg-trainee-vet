# 0309 — Programa Executivo Dual 99 — CVG

**Programa:** `CVG-DUAL-99`
**Data de planejamento:** 2026-08-19
**Predecessor:** `0308_dual_98_executive_program.md`
**Roadmap:** `BRIEFING/04.AUDIT/0518_dual_99_roadmap.md`
**Backlog:** `BRIEFING/04.AUDIT/0519_dual_99_backlog.md`
**Manifesto executável:** `dual-99-program.json`
**Gate estrutural:** `pnpm verify:dual99-program`
**Assessment de origem:** `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`
**Disposição inicial:** `IN_PROGRESS / PILOT_BLOCKED`

## 1. Mandato

Transformar o diagnóstico anterior em um caminho verificável para que todos os
itens analisados alcancem 99/100. O programa não promove nota por implementação:
as notas finais continuam pertencendo às reauditorias independentes no mesmo
release candidate.

O alvo é simultâneo:

1. `16/16` itens de maturidade ≥99;
2. `16/16` itens de qualidade de código ≥99;
3. `C1–C8` da auditoria atual ≥99;
4. `RH01–RH06` sem gap material e com evidência independente;
5. `145/145` cadeias completas e reproduzíveis;
6. zero P0/P1 e zero P2 material sem aceite formal;
7. release, runtime, clínica, UX e operação comprovados no mesmo RC.

Uma média não compensa falha de segurança, integridade clínica, dados,
proveniência ou autorização. `99` é alvo de elegibilidade, não nota
autodeclarada.

## 2. Barra de qualidade v1

| ID | Dimensão | Target | Evidência | Obrigatório | Prioridade |
|---|---|---|---|---|---|
| Q99-01 | Baselines | 32/32 itens oficiais ≥99 no mesmo RC | duas matrizes independentes | sim | crítica |
| Q99-02 | Auditoria atual | C1–C8 ≥99 | reauditoria com evidência atual | sim | crítica |
| Q99-03 | Achados RH | RH01–RH06 fechados | testes adversariais + critic | sim | crítica |
| Q99-04 | Segurança | scanner fail-closed, authz deny-by-default, sessão revogada | SAST/SCA/DAST, testes negativos, review | sim | crítica |
| Q99-05 | Dados/clínica | atomicidade, RLS, aprovador corrente, fila auditável | PostgreSQL live isolado + decisões humanas | sim | crítica |
| Q99-06 | Testes | verify verde, cobertura ≥95/90/95/95, mutation crítica ≥90% | CI reproduzível | sim | crítica |
| Q99-07 | E2E/UX | jornadas reais web→API→DB em Chromium/Firefox/WebKit/mobile | Playwright ativo, axe e revisão manual | sim | alta |
| Q99-08 | Operação | health/readiness, alerts, traces, backup/restore, RPO≤1h/RTO≤4h | runtime externo e drills repetidos | sim | crítica |
| Q99-09 | Release | SHA↔digest↔SBOM↔manifest, canário e rollback distinto | CI/registry/CD e rehearsal | sim | crítica |
| Q99-10 | Rastreabilidade | 145/145 completas e válidas | verifier + auditor diferente | sim | crítica |
| Q99-11 | Produto/clínica | 24 módulos/96 sessões/B-07 e fila liberável zero | inventário e decisões humanas | sim | alta |
| Q99-12 | Manutenibilidade | zero hotspot crítico >50/>100 e contratos coerentes | ratchet + architecture/type gates | sim | alta |

**Validade:** testes sintéticos, configurações declarativas, worktree sujo,
mock de fronteira real, dry-run e evidência de outro SHA são insuficientes para
fechar os gates correspondentes.

## 3. Gates de promoção

| Gate | Saída | Bloqueio |
|---|---|---|
| G99-0 | verdade única, critérios, owners, dependências e corte reconciliados | baseline ou contagem divergente |
| G99-1 | gates locais verdes e seis RH fechados | qualquer P0/P1, scanner fraco, teste inválido ou hotspot crítico |
| G99-2 | RC-alpha limpo, assinado e reversível | worktree/SHA/digest/SBOM/rollback inválidos |
| G99-3 | CI, registry, IdP/TLS, telemetria, backup/DR e HA reais | `NOT_EXECUTED`, fixture ou dry-run |
| G99-4 | produto completo e fila clínica liberável zero | conteúdo/decisão/aceite pendente |
| G99-5 | UAT, WCAG, RUM, security, soak, failover e restore verdes | P0/P1/P2 material ou SLO não aceito |
| G99-6 | 145/145 e pacote de evidência reproduzível | cadeia, digest, validade ou link incompleto |
| G99-7 | duas reauditorias independentes com 32/32 ≥99 | qualquer célula <99 ou RC divergente |
| G99-8 | go/no-go humano e rollback disponível | autoridade, risco ou gate anterior ausente |

## 4. Workstreams

### WS-01 — Verdade, governança e rastreabilidade

Congelar o corte, mapear os 32 itens e C1–C8/RH01–RH06, corrigir o registry,
manter aliases históricos e ligar requisito→SPEC→módulo→teste→commit→artefato.

### WS-02 — Segurança, sessão e fronteiras

Fechar scanner fail-closed, secrets, autenticação/autorização, CSRF, rate
limit, session generation/revocation, diagnostics e ausência de token em URL,
logs ou telemetria.

### WS-03 — Dados, clínica e worker

Provar idempotência transacional, RLS contextual, aprovador corrente, outbox
real claim/lease/ack, readiness, retries, DLQ e reconstrução de derivados.

### WS-04 — Testes e qualidade

Eliminar falhas de format/lint/testes/hotspots/skips, elevar cobertura e
mutation por risco, validar contratos, migrations, API e browsers ativos.

### WS-05 — Runtime e supply chain

Carregar rules reais, loss-of-signal, traces, backups, restore, HA, CI,
registry, SBOM, attestation, canário e rollback entre versões.

### WS-06 — Produto, UX e clínica

Completar jornadas, 24 módulos/96 sessões/B-07, UAT, WCAG 2.2 AA manual,
screen reader, RUM e revisão humana de toda fila publicável.

## 5. Regras de execução

- `TASK → RED → GREEN → REFACTOR → REVIEW → SECURITY → AUDIT → STATE`;
- alterações em migrations, composition roots, authz, clínica, web global ou
  manifesto são sequenciais e têm um único owner;
- workers só alteram arquivos explicitamente atribuídos;
- nenhuma task reduz limiar, remove teste, transforma falha em skip ou chama
  mock de fronteira real de evidência suficiente;
- commits, push, deploy, escolha de IdP/backup e decisões clínicas aguardam
  autorização humana registrada;
- o estado oficial só muda com evidência, nunca por narrativa.

## 6. Critério de conclusão

O programa termina apenas quando G99-0…G99-8 passarem, as duas rubricas e a
auditoria atual confirmarem 99/100, o RC for reproduzível, a operação real for
observada e o go/no-go humano estiver registrado. Até lá, o status é
`IN_PROGRESS` ou `PILOT_BLOCKED`.

## 7. Checkpoint de execução — 2026-08-20T02:48:08-03:00

A primeira onda local de qualidade foi executada sob RED/GREEN/REFACTOR e
revisão, com sete decomposições focais: dashboard, journey, authoring,
assessment, parser de atividade, runner HA e scanner. A suíte autoritativa
passou em `199` arquivos, `1038` testes, `17` arquivos guardados e `21` testes
guardados, com cobertura `95,01%` statements / `91,02%` branches / `95,19%`
functions / `95,73%` lines; contratos `84/84`, worker `46/46`, build `12/12`,
E2E sintético Chromium `27/27` e ratchet `144/117` também passaram.

Esse checkpoint alcança o piso técnico local, não os gates de release. Ainda
faltam mutation, 20 runs, browsers e HA/API/DB reais, clínica, RC/proveniência,
UAT, rastreabilidade `0/145`, operação externa, aprovação humana e reauditoria;
por isso o manifesto segue `PASS_WITH_GAPS`, inelegível para reauditoria e
`PILOT_BLOCKED`.

## 8. Checkpoint de estabilidade — 2026-08-20T03:18:35-03:00

Foram executadas 17 repetições adicionais e seriais de `pnpm test:coverage`.
Todas passaram com `199` arquivos, `1038` testes e cobertura
`95,01/91,02/95,19/95,73`; a governança de skips passou a `20/20` runs,
`0` falhas flaky, `17` arquivos/`21` testes guardados e zero skips sem
classificação. `B99-304` está concluída no escopo local, com evidência em
`docs/136_dual_99_skip-governance-20-runs-2026-08-20.md`.

Essa conclusão não altera o status do programa: mutation crítica, browsers e
HA/API/DB ativos, RC/proveniência, clínica, UAT, rastreabilidade `0/145`,
operação externa, reauditoria e go/no-go continuam pendentes; o manifesto segue
`PASS_WITH_GAPS` / `PILOT_BLOCKED`.

## 9. Checkpoint de mutation crítica — 2026-08-20T03:27:03-03:00

O verificador local de `B99-303` passou baseline e sete mutações direcionadas:
`NOTA`, `PUBLICACAO`, `PERMISSAO`, `ESTADO`, `IDEMPOTENCIA`,
`CONTRATO_ESTADO` e `MATRIZ`. Resultado `7/7 killed`, `0` sobreviventes,
score `100%` contra mínimo `90%`, com teste focal `3/3`; evidência em `docs/137`.

O resultado fecha a prova crítica direcionada, não mutation integral. Permanecem
abertos browsers/HA/API/DB, RC/proveniência, clínica, UAT, `0/145`, operação
externa, reauditoria e go/no-go; o status continua `IN_PROGRESS` /
`PILOT_BLOCKED`.

## 10. Reconciliação final — 2026-08-20T03:48:50-03:00

Os verificadores de documentação, programa, rastreabilidade, skips, mutation
crítica, hotspots, formato, lint, typecheck e `git diff --check` passaram após
a correção do checkpoint em `docs/135`. A medição corrente é `200/1041/21`,
com floors `95,01/91,02/95,19/95,73`, ratchet `144/113`, mutation direcionada
`7/7 killed`, skips `20/20`/`0` flaky, build `12/12` e Chromium sintético
`27/27`.

Esse resultado encerra as ondas locais autorizadas, não o programa Dual99:
`0/145`, mutation integral, live/RC, browsers/HA/API/DB, clínica, operação
externa, aprovação humana e reauditoria permanecem abertos. O parecer
independente compatível continua `REJECT`; uma nova tentativa read-only foi
encerrada sem produzir evidência. O manifesto permanece `PASS_WITH_GAPS`,
inelegível para reauditoria e `PILOT_BLOCKED`.

## 11. Checkpoint local de fronteira de placeholders — 2026-08-21T08:34:48-03:00

Uma auditoria fresca do B99-101 reproduziu um bypass na allowlist de fixtures:
o valor era truncado em `&`/`#` antes da comparação e um sufixo potencialmente
secreto passava sem finding. Sob RED/GREEN, o scanner passou a exigir
placeholder exato e preservou somente `&form=1` e `&locale=pt-BR` após tokens
sintéticos conhecidos. O foco passou `65/65`, cobertura `205/1161/21` em
`95,03/90,95/95,31/95,73`, build `12/12`, hotspots `0` com `799` linhas,
lint, typecheck, formato e diff-check passaram; `verify:secrets` acusa apenas
os quatro assignments redigidos preexistentes de `.env.local`.

O código/teste `2c0a35f` foi publicado e a evidência está em
`docs/139_dual_99_b99_101_placeholder_boundary_evidence_2026-08-21.md`. Isso
fecha apenas a propriedade local desta rodada; crítica independente,
secret-manager/rotação, RC/runtime, browsers aprovados, CI/registry, clínica,
`0/145`, gates externos, aprovação humana e reauditoria continuam abertos. O
manifesto permanece `PASS_WITH_GAPS` / `IN_PROGRESS` / `PILOT_BLOCKED`.
