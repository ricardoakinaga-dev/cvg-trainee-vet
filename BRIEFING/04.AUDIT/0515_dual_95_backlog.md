# 0515 — Backlog executivo Dual 95

> **Registro histórico:** absorvido por `BRIEFING/04.AUDIT/0517_dual_98_backlog.md`; os IDs U95 preservam rastreabilidade, mas o estado executivo ativo vive no backlog U98.

**Programa:** `BRIEFING/03.BUILD/0307_dual_95_executive_program.md`
**Roadmap:** `BRIEFING/04.AUDIT/0514_dual_95_roadmap.md`
**Assessment:** `docs/117_dual_95_readiness_assessment_2026-08-16.md`
**Baseline:** maturidade `83,24/100`; qualidade `64,20/100`; `1/32` células ≥95; `0/145` cadeias completas
**Disposição:** `PILOT_BLOCKED`

## 1. Regras

- `U95-*` coordena execução; `ENT95-*`, `AUD-CQ-*` e `BLK-*` continuam como aliases/requisitos de origem;
- cada mudança de código segue `TASK → RED → GREEN → REFACTOR → REVIEW → AUDIT`;
- `COMPLETED` significa entrega e verificação do task, não promoção de nota;
- um task só é aceito com evidência positiva, negativa, ambiente, SHA/artefato aplicável, rollback e limitações;
- toda task atualiza state, log, backlog e rastreabilidade;
- nenhum task técnico substitui decisão clínica, UAT, ambiente externo ou reauditoria.

## 2. F0 — verdade e controle

| ID | Pri | Estado | Entrega | Dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U95-000` | P0 | COMPLETED | registrar duas rubricas e hierarquia Dual 95 | nenhuma | registry/plan/roadmap/backlog sem fonte concorrente; `32/32` explícito |
| `U95-001` | P0 | COMPLETED | reconciliar score, worktree, runtime, skips, cobertura e fila clínica | leitura das fontes | PostgreSQL comprova `796/763/0`; `212` entradas; Prometheus/E2E classificados honestamente |
| `U95-002` | P0 | WAITING_HUMAN_APPROVAL | aprovar T0, equipe, orçamento, revisores, ambientes, coorte e auditores | sponsor | decisão registrada com capacidade protegida e owners |
| `U95-003` | P0 | COMPLETED | revisar/classificar as `221` entradas correntes por origem, risco, segredo, dado proibido e intenção de commit | nenhuma | `docs/118_dual_95_worktree_inventory_2026-08-16.md` lista `116+105` entradas; `verify:secrets` e `git diff --check` passaram; ownership/lotes reversíveis; sem commit/release |
| `U95-004` | P0 | COMPLETED | congelar rubrica de 32 células, gates e schema de evidência | U95-000/001 | duas matrizes e `G95-0–7` publicados; nenhuma média combinada |

Evidência de `U95-003`: o inventário integral permanece local e não staged; os seis achados `D95-H01–H06`, as baselines `83,24/100` e `64,20/100`, `0/145` cadeias e `PILOT_BLOCKED` não foram promovidos ou alterados.

## 3. F1 — achados altos e fechamento local

**Revalidação pós-análise (`2026-08-16T19:12:11-03:00`):** o inventário U95-003 foi reconciliado com o worktree corrente: o snapshot documentava `221` entradas e o estado atual contém `299`, com `78` entradas posteriores classificadas no adendo de `docs/118`. As seis correções U95-101–106 continuam verdes localmente; `124/124` unitários críticos, `30/30` integrações críticas com um live guardado, `pnpm verify:secrets`, typecheck, lint, formato, diff-check, observabilidade, topologia, manifesto, rastreabilidade e documentação passaram. A cobertura atual é `194/921/16/19`, `90,73%/85,30%/93,70%/92,15%`. Nenhuma conclusão local substitui RC imutável, ambiente externo, decisão clínica, score, release ou `0/145`; `PILOT_BLOCKED` permanece.

| ID | Pri | Estado | Entrega | Origem | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U95-101` | P0 | COMPLETED | agrupar HELP/TYPE uma vez por família Prometheus e normalizar a exposição | `D95-H01` | RED/GREEN com múltiplas séries; contadores `_total`, histogramas `seconds`, ordering determinístico; `promtool check metrics` e testes focais passam |
| `U95-102` | P0 | COMPLETED | corrigir token/scrape e carregar API, workers, rules e Alertmanager | `D95-H02` | targets obrigatórios `up`; rules carregadas; alerta percorre fire→ack→resolve; teste de permissão negativa |
| `U95-103` | P0 | COMPLETED | tornar review+decisão e authorize+publish atômicos/idempotentes | `D95-H03` | fault injection em cada boundary; rollback integral; retry seguro; outbox/audit coerentes |
| `U95-104` | P0 | COMPLETED | vincular publicação ao `CLINICAL_APPROVER_ID` corrente e à decisão persistida | `D95-H04` | ausência, divergência, rotação e caminho correto testados fail-closed |
| `U95-105` | P0 | COMPLETED | corrigir fixture PostgreSQL autoral e adicionar caso negativo | `D95-H05` | suíte live sem skip passa; reviewer divergente falha antes de transição |
| `U95-106` | P0 | COMPLETED | bloquear deploy/rollback sem API A/B e worker A/B saudáveis | `D95-H06` | fault injection por processo; nenhuma promoção com worker unhealthy; rollback preserva saúde |

Evidência de `U95-101`: `packages/observability/src/observability.ts` agrupa descritores, ordena labels/séries sem mutar o snapshot, normaliza contadores e histogramas; `packages/observability/src/observability.test.ts` passou `13/13`, worker `1/1`, API `71/71`, governança `PASS_WITH_EXTERNAL_OPERATIONAL_GAPS` e `promtool check metrics` passou. Nenhum commit, SHA, release ou score foi promovido.

Evidência de `U95-102`: `docs/119_dual_95_u95_102_observability_evidence_2026-08-16.md` registra o RED/GREEN, helper de segredo `65534:65534`/`0440`, negativos de permissão e bearer, cinco targets `up` sem erro, 7 rules `health=ok`, Alertmanager ativo e ciclo sintético `fire→ack→resolve`; build/runtime local foram reconstruídos sem commit, SHA, release, score ou publicação.

Evidência de `U95-103`: `docs/120_dual_95_u95_103_authoring_atomicity_evidence_2026-08-16.md` registra a fronteira transacional compartilhada de autoria, a migração `0029`, fault injection após a segunda transição em review/publicação, rollback sem decisão/outbox parcial, retry idempotente, teste live PostgreSQL `1/1`, `14/14` unitários e `pnpm verify` com `797` testes e `80,02%` de branches. O resultado é local e condicionado à revalidação em RC imutável; vínculo ao aprovador corrente, fixture negativa e gate de workers permanecem nos U95-104–106.

Evidência de `U95-104`: `docs/121_dual_95_u95_104_current_clinical_approver_evidence_2026-08-16.md` registra o contrato obrigatório do aprovador corrente, bloqueio HTTP sem configuração, validação de ID vazio, divergência/rotação fail-closed antes da transição e caminho correto com replay. O teste live PostgreSQL passou `1/1`, os focais `74/74`, `pnpm test:coverage` manteve `84,55%` de statements e `80,05%` de branches, e `pnpm verify` completo passou. A prova permanece local; fixture autoral negativa e gate de workers continuam nos U95-105–106.

Evidência de `U95-105`: `docs/122_dual_95_u95_105_postgres_authoring_fixture_evidence_2026-08-16.md` registra o fixture live com autor/aprovador/participante sintéticos, `approvedClinicalApproverId` designado, role administrativa restrita à preparação/limpeza e workflow com role da aplicação. O teste executado sem skip passou `1/1`; reviewer divergente retornou `forbidden` antes da transição e o caminho correto passou com teardown limpo. `pnpm verify` passou com `799` testes, `80,05%` de branches e migrações `30/30`; o resultado permanece local e condicionado ao RC.

Evidência de `U95-106`: `docs/123_dual_95_u95_106_worker_health_gate_evidence_2026-08-16.md` registra a lista canônica de quatro réplicas, parser/asserção fail-closed do Compose, canário API/worker, promoção do edge somente após o gate completo e gate equivalente no rollback. O contrato focal passou `9/9`; cada processo foi injetado como `unhealthy`, `worker-a` foi parado live e o gate rejeitou a leitura; o rehearsal local passou `deploy=PASS`, `rollback=PASS` e `runtimeRestored=true`; `pnpm verify` passou com `801` testes, `80,05%` de branches e migrações `30/30`. O resultado é local e condicionado ao RC/ambiente aprovado.
Evidência de `U95-107`: `docs/124_dual_95_u95_107_release_provenance_evidence_2026-08-16.md` registra o manifesto com source/rollback SHA, digest esperado no runtime, três probes estáveis e rejeição de rollback same-version; o focal passou `20/20`, a cobertura global passou `177/805/18` com `80,05%` de branches e o rehearsal sintético foi restaurado. O rollback live entre versões distintas falhou fechado porque as imagens históricas disponíveis deixam os workers `unhealthy` sob o contrato atual; `worktree-uncommitted` não é atestado. U95-107 permanece bloqueado até existir artefato histórico imutável compatível com o health contract e SHA Git válido.
Evidência de `U95-108/U95-109`: `docs/125_dual_95_u95_108_109_risk_and_quality_evidence_2026-08-16.md` registra a auditoria honesta da matriz (`87/87` success, `63/87` error, `26/87` denied, `36/87` conflict e `11/87` completas), sem classificar `N/A` sem aprovação; registra também a decomposição do rehearsal/manifests/proveniência e o ratchet executável `152/128`, com `24/24` focais e `177/806/18` na cobertura. U95-109 ainda tem `22` funções acima de `100` sem exceção com owner/prazo; ambas permanecem abertas.

Evidência de `U95-110`: `docs/126_dual_95_u95_110_type_safety_contracts_evidence_2026-08-16.md` registra o RED da guarda permissiva do dashboard e da governança de `15` arquivos/`22` double assertions, seguido do GREEN com parser/tipo canônicos, dependência `@cvg/contracts`, boundary declarado e transações inferidas diretamente pelo Drizzle. Focais web passaram `7/7`, persistência `127/127`, arquitetura/governança `3/3` e `pnpm verify` passou com `178/808/16/18` e cobertura `84,55%`/`80,05%`/`86,58%`/`85,36%`. O status é `READY_FOR_NEXT_STEP` local / `PILOT_BLOCKED`; demais superfícies web por papel, RC, U95-107/U95-108/U95-109 e reauditoria continuam pendentes.

Evidência de `U95-111`: `docs/127_dual_95_u95_111_api_dispatcher_evidence_2026-08-16.md` registra o RED do inventário sem lookup/grupo de handler e o GREEN com `handlerGroup`, `findApiSurfaceRoute`, template de telemetria derivado do contrato e `API_ROUTE_GROUPS` no dispatcher. A seleção canônica confirmou `57/57` rotas ligadas a seis grupos; focais de contrato `4/4`, inventário `2/2`, API/server `72/72` e `pnpm verify` `178/810/16/18` passaram com cobertura `84,55%`/`80,06%`/`86,67%`/`85,40%`. O status é `READY_FOR_NEXT_STEP` local / `PILOT_BLOCKED`; matchers individuais, RC, U95-107/U95-108/U95-109 e reauditoria continuam pendentes.

Evidência de `U95-112`: `docs/128_dual_95_u95_112_persistence_integrity_evidence_2026-08-16.md` registra o RED/GREEN do contexto de auditoria no mesmo transaction executor, a normalização de conflitos de unicidade/versão para `state_conflict` e o restore fail-closed com dez invariantes de RLS, audit, append-only e unicidade. Focais passaram `audit 5/5`, persistência `24/24`, aplicação `17/17`, restore `9/9`; PostgreSQL temporário passou corrida/restore `5/5`, rollback `1/1`, RLS `1/1` e migrações `30/30`; `pnpm verify` passou com `178/816/16/19` e cobertura `84,65%`/`80,13%`/`86,79%`/`85,54%`. O status é `READY_FOR_NEXT_STEP` local / `PILOT_BLOCKED`; o mecanismo temporário não prova backup/PITR/RPO/RTO/DR, HA de produção ou RC, e U95-107/U95-108/U95-109, `0/145` e reauditoria continuam pendentes.

Evidência de `U95-113`: `docs/129_dual_95_u95_113_web_contracts_states_evidence_2026-08-16.md` registra o RED dos guards permissivos e da ausência de prova focal de loading/error/retry; o GREEN migrou admin, moderator, authoring e account para schemas canônicos e separou o estado do dashboard com `aria-busy`, status acessível, limpeza fail-closed e retry não concorrente. Focais passaram `5/5` arquivos e `11/11` testes; build dos `12` workspaces, `pnpm verify` com `181/822/16/19` e cobertura `84,65%`/`80,13%`/`86,79%`/`85,54%`, e Playwright sintético `27/27`. O status é `READY_FOR_NEXT_STEP` local / `PILOT_BLOCKED`; API ativa, browser→API→DB, cobertura integral de `apps/web`, manual WCAG, UAT, RUM, cross-browser/mobile, RC, gates externos e `0/145` continuam pendentes.

Evidência de `U95-114`: `docs/130_dual_95_u95_114_coverage_e2e_evidence_2026-08-16.md` registra o RED do denominador incompleto/testes `.test.tsx` não descobertos e o GREEN da inclusão de `apps/web`, da matriz Playwright controlável e das coberturas sintéticas web. `pnpm test:coverage` passou com `191` arquivos / `855` testes passantes / `16` arquivos e `19` testes guardados, em `84,47%`/`80,29%`/`85,35%`/`85,77%`; Playwright sintético passou `27/27` em Chromium e E2E ativo do worktree passou `3/3` em Chromium até PostgreSQL HA local. O status é `IN_PROGRESS` local / `PILOT_BLOCKED`: ≥90%, floors críticos, Firefox/WebKit/mobile, RC imutável, produção, UAT, WCAG manual, RUM e gates externos continuam pendentes.

Atualização complementar de `U95-114` (`2026-08-16T18:28:19-03:00`): a cobertura de API e persistência foi ampliada sob RED/GREEN com dados sintéticos; `pnpm test:coverage` passou com `192/908/16/19`, em `90,15%` statements / `84,10%` branches / `93,57%` functions / `91,59%` lines. As funções das camadas críticas passaram de `80%`, mas API e worker permanecem abaixo de `80%` em branches (`73,45%`/`75,00%`) se o piso se aplicar a toda métrica. Typecheck, lint, formato e diff-check passaram; o status segue `IN_PROGRESS`/`PILOT_BLOCKED`, com somente Chromium executado e sem prova de RC imutável.

Atualização complementar de `U95-114` (`2026-08-16T18:56:56-03:00`): boundaries opcionais da API foram cobertos com dados sintéticos; `pnpm test:coverage` passou com `194/921/16/19`, em `90,73%` statements / `85,30%` branches / `93,70%` functions / `92,15%` lines. Todas as camadas críticas ficaram acima de `80%` nas quatro métricas. Na matriz Playwright, Chromium, Firefox e mobile Chromium passaram `81/81`; WebKit teve `27` casos bloqueados pelo host sem `libavif16`, antes das asserções, e a instalação de dependências exigiria senha sudo. O status segue `IN_PROGRESS`/`PILOT_BLOCKED`; falta host aprovado para WebKit, RC imutável e repetição do E2E ativo no RC.
| `U95-107` | P1 | BLOCKED | corrigir janela de warm-up/canário, vínculo digest↔SHA e rollback entre versões | findings médios release; artefato histórico aprovado | falha transitória recupera conforme política; attestation local SHA↔digest verificada; versão anterior distinta restaurada sem degradar o health gate |
| `U95-108` | P0 | IN_PROGRESS | completar matriz de risco P0/P1 | `AUD-CQ-010`, `ENT95-14` | `87/87` aplicáveis com success/error/denied/conflict ou `N/A` aprovado; zero linha sem justificativa; atual `87/87` success, `63/87` error, `26/87` denied, `36/87` conflict, `11/87` completas |
| `U95-109` | P1 | IN_PROGRESS | apertar ratchet `152/128` e reduzir dívida funcional | `AUD-CQ-011/012`, qualidade 5 | ratchet atual `152/128`; ainda `22` funções >100 sem exceção temporária com owner/prazo; redução líquida registrada |
| `U95-110` | P1 | READY_FOR_NEXT_STEP | remover double assertions evitáveis, tipar transações e usar contratos compartilhados no web | qualidade 6/9 | zero cast duplo evitável; typecheck; guards web derivados do contrato canônico |
| `U95-111` | P1 | READY_FOR_NEXT_STEP | consolidar rota/schema/authz/error em fonte inventariada | qualidade 7/8; `ENT95-07` | 100% das rotas P0/P1 ligadas; testes de body/path/query/authz/erro; zero dispatcher órfão |
| `U95-112` | P0 | READY_FOR_NEXT_STEP | fechar transações, RLS/audit context, concorrência e restore | qualidade 9; `ENT95-06` | testes live de corrida/rollback; auditoria mantém contexto; restore preserva invariantes |
| `U95-113` | P1 | READY_FOR_NEXT_STEP | fechar contratos/estados/retry do dashboard e demais superfícies por papel | S4-173; qualidade 11 | link/status/ranges/IDs/curriculum bounded; hook error/retry; logout/retomada e a11y automatizada |
| `U95-114` | P0 | IN_PROGRESS | incluir toda produção na cobertura e ampliar E2E ativo | qualidade 12; `ENT95-14` | ≥90% global; nenhuma camada crítica <80%; Chromium/Firefox/WebKit/mobile; browser→API→DB no RC |
| `U95-115` | P0 | READY_FOR_NEXT_STEP | fault injection de API/DB/worker, crash/replay, Qdrant rebuild e fallback IA | qualidade 8/13; `ENT95-11` | zero hang/unhandled; retry/dead-letter/rebuild/fallback determinísticos e observáveis |
| `U95-116` | P1 | READY_FOR_NEXT_STEP | corrigir PromQL de baixo tráfego, proteger/cachear diagnostics e limpar token de convite da URL | findings médios | percentuais corretos com 0 e <1 req/s; diagnóstico sem amplificação; `replaceState` após captura |
| `U95-117` | P0 | BLOCKED | preauditoria local independente das 32 células sem alterar nota | U95-003, U95-101–116 | zero P1 local e evidence gaps explicitados; resultado é readiness, não score oficial |

## 4. F2 — RC-alpha e proveniência

| ID | Pri | Estado | Entrega | Dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U95-201` | P0 | WAITING_HUMAN_APPROVAL | aprovar lotes e criar commits intencionais; congelar RC-alpha | U95-003, G95-1 | worktree limpo; SHA alcançável; review de segurança/diff aprovado |
| `U95-202` | P0 | BLOCKED | gerar imagem, digest, SBOM, assinatura/attestation e manifesto | U95-201 | source SHA↔digest verificável; artifact retido; mismatch falha |
| `U95-203` | P0 | BLOCKED | executar E2E/HA/alert/restore/deploy/rollback no RC-alpha | U95-202 | browser→DB, API+workers, canário e rollback entre versões passam; teardown limpo |
| `U95-204` | P0 | BLOCKED | fechar `G95-2` e registrar evidence pack alpha | U95-203 | zero drift e todas as limitações/validades/owners registradas |

## 5. F3 — fundação externa

| ID | Pri | Estado | Entrega | Autoridade/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U95-301` | P0 | WAITING_HUMAN_APPROVAL | bundle licenciado, CI, registry, assinatura, deploy e rollback | provider/credenciais/janela | CI verde no SHA; promotion/rollback reais; artifacts retidos |
| `U95-302` | P0 | WAITING_HUMAN_APPROVAL | IdP/MFA/recovery/step-up, DNS e TLS | provider/FQDN/política | fluxos positivo/negativo/rotação/recovery; TLS gerenciado e expiry monitorado |
| `U95-303` | P0 | WAITING_HUMAN_APPROVAL | telemetria externa, Alertmanager, RBAC, retenção e ack | backend/destino/on-call | trace/log/metric correlacionados; fire→ack→resolve; acesso e retenção auditados |
| `U95-304` | P0 | WAITING_HUMAN_APPROVAL | backup offsite/PITR, restore, RPO/RTO e DR | storage/chave/janela | restore isolado; RPO≤1h e RTO≤4h medidos; runbook exercitado |
| `U95-305` | P0 | WAITING_HUMAN_APPROVAL | capacity/failure-domain HA/soak/failover | ambiente/SLO/custo | soak ≥24h, saturação e falhas de nó/zona; SLO aprovado |
| `U95-306` | P0 | BLOCKED | fechar `G95-3` | U95-301–305 | todas as provas pertencem ao mesmo RC e ambiente declarado |

## 6. F4 — produto e clínica

| ID | Pri | Estado | Entrega | Autoridade/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U95-401` | P0 | WAITING_HUMAN_APPROVAL | calibrar 25 itens e aprovar limiar de concordância/rework | revisores clínicos/T0 | dupla revisão; divergências adjudicadas; threshold aprovado |
| `U95-402` | P0 | WAITING_HUMAN_APPROVAL | revisar `N` itens em lotes e zerar fila liberável | U95-401/capacidade clínica | decisões item a item auditáveis; contagem PostgreSQL zero; sem bulk/IA approval |
| `U95-403` | P0 | IN_PROGRESS | completar 24 módulos/96 sessões, B-07 e QA estrutural | produto/clínica | inventário íntegro; critérios de conteúdo/versão/preflight; publicação ainda gated |
| `U95-404` | P0 | IN_PROGRESS | completar jornada, correção, recurso, retenção e autoria | U95-103/104, U95-403 | E2E por papel e estados; métricas/aceite PRD; transações/authorizations seguras |
| `U95-405` | P0 | BLOCKED | fechar `G95-4` | U95-402–404 | fila liberável zero, jornada e conteúdo aprovados, sem gap P0/P1 |

## 7. F5 — aceitação e resiliência

| ID | Pri | Estado | Entrega | Autoridade/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U95-451` | P0 | WAITING_HUMAN_APPROVAL | UAT por papel, turno e dispositivo | ambiente/coorte | critérios PRD assinados; erros e retomada observados |
| `U95-452` | P0 | WAITING_HUMAN_APPROVAL | WCAG 2.2 AA manual, screen reader, cross-browser/mobile e RUM | reviewers/usuários | zero finding A/AA P0/P1; Vitals/SLO de UX aceitos |
| `U95-453` | P0 | WAITING_HUMAN_APPROVAL | DAST/pentest focal e revisão de threat model | ambiente/auditor | zero P0/P1; correções revalidadas |
| `U95-454` | P0 | BLOCKED | repetir soak/failover/DR sob jornada representativa | G95-3/G95-4 | SLO, RPO/RTO e recovery sem perda/corrupção |
| `U95-455` | P1 | WAITING_HUMAN_APPROVAL | piloto controlado e avaliação de eficácia/QA clínico | G95-0–5/go-no-go parcial | coorte, retirada, monitoramento e critérios éticos aprovados |
| `U95-456` | P0 | BLOCKED | fechar `G95-5` | U95-451–455 aplicáveis | zero P0/P1 e aceites humanos/operacionais assinados |

## 8. F6 — evidência, reauditoria e decisão

| ID | Pri | Estado | Entrega | Dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U95-501` | P0 | BLOCKED | congelar RC final e repetir todos os gates | G95-0–5 | nenhum patch posterior; CI/runtime/security/UX/DR verdes no mesmo RC |
| `U95-502` | P0 | BLOCKED | concluir `145/145` cadeias | U95-501 | requisito→SPEC→módulo→contrato→teste→SHA→artifact completo e verificável |
| `U95-503` | P0 | WAITING_HUMAN_APPROVAL | reauditoria independente da maturidade | U95-501/502 | `16/16 ≥95`, relatório assinado, sem compensação por média |
| `U95-504` | P0 | WAITING_HUMAN_APPROVAL | reauditoria independente da qualidade | U95-501/502 | `16/16 ≥95`, relatório assinado, sem compensação por média |
| `U95-505` | P0 | WAITING_HUMAN_APPROVAL | decisão go/no-go e eventual retirada de `PILOT_BLOCKED` | U95-503/504 | `32/32`, zero P0/P1, 145/145 e rollback disponível |

## 9. Mapa de aliases

| Fonte antiga | Coordenação Dual 95 |
|---|---|
| `ENT95-01–16` | células da trilha maturidade; atendidas transversalmente por U95 |
| `AUD-CQ-001–015` | workstreams históricos da qualidade; absorvidos por U95-101–117 e gates finais |
| `BLK-01–08` | dependências clínicas/externas; preservadas em U95-002, U95-301–305 e U95-401–455 |
| S4-173 | evidência parcial de U95-109/U95-113/U95-114; não fecha score |

Nenhum alias deve manter status concorrente. O status executivo corrente vive neste backlog e é resumido no backlog master.

## 10. Próxima ação

Obter/aprovar um artefato histórico imutável, com SHA Git válido e health de worker compatível, e repetir `U95-107` sob TDD/revisão de segurança até o rollback versionado passar. `U95-117` permanece bloqueado até o fechamento local. Não solicitar nova nota enquanto `G95-6` não estiver completo.
