# 0302 — Backlog Master Executável — Programa Premium AAA

**Revisão:** 2026-09-06
**Plano:** [STATE_OF_THE_ART_MASTER_PLAN.md](STATE_OF_THE_ART_MASTER_PLAN.md)
**Roadmap:** [0301_roadmap.md](0301_roadmap.md)
**Status global:** `IN_PROGRESS` — execução técnica local autorizada; G0
operacional/piloto continua aguardando aprovação humana
**Fonte funcional:** PRD/SPEC em `BRIEFING/09.PROJETO_CVG_TREINAMENTO`

## 1. Regras do backlog

Cada item precisa de requisito/SPEC ou gap de auditoria, dono, dependência,
arquivos/recursos, teste RED/GREEN/REFACTOR, revisão, evidência, rollback e
critério de pronto. O status só avança por evidência corrente.

Estados oficiais:

`READY_FOR_NEXT_STEP` · `IN_PROGRESS` · `WAITING_HUMAN_APPROVAL` · `BLOCKED` ·
`COMPLETED`

Os estados históricos `COMPLETED_WITH_GAPS`, `IMPLEMENTED_WITH_GAPS` e
`PARTIAL_IMPLEMENTED` não são considerados terminais neste backlog: seus gaps
foram absorvidos pelos itens AAA correspondentes.

Prioridades:

- **P0:** segurança, integridade, clínica ou gate cuja falha bloqueia tudo;
- **P1:** jornada, operação, UX ou governança necessária ao produto premium;
- **P2:** diferenciação, otimização ou evolução pós-piloto;
- **P3:** futuro, somente após evidência de necessidade.

## 2. Baseline já construído

Os itens `BLD-001`–`BLD-013` e as sprints F3 existentes representam a base
técnica observada: monorepo, domínio, contratos, API, PostgreSQL, RLS,
outbox/worker, Qdrant/IA, web participante, observabilidade local, hardening
de borda, reconciliação e sessões. Eles permanecem como histórico rastreável;
os gaps de release, jornada real, operação, acessibilidade e clínica não são
marcados como concluídos por esse baseline.

| Evidência base | Estado de uso no programa AAA |
| --- | --- |
| `pnpm verify`, build e E2E sintético verdes | capability local; não prova produção |
| 52 migrations e RLS | exige reexecução live da jornada crítica |
| API/web/worker/Qdrant/IA | exige boundary, observabilidade e evals atuais |
| conteúdo B-07/M02 | permanece sem publicação clínica autorizada |
| CI declarada | exige workflow remoto same-SHA e artefatos |

### Execução bounded de experiência visual — `UI-VIS-001`

Esta fatia visual foi autorizada diretamente para executar um subconjunto de
`AAA-400`/`AAA-401`: shell, tokens, tipografia, estados, responsividade,
reduced motion e assets decorativos locais. Ela não altera contratos, API,
domínio, conteúdo clínico, boundary público ou os status/gates do backlog AAA;
não fecha `AAA-001`, `AAA-400` ou `AAA-401`.

Evidência corrente da fatia: build web, suíte visual permanente `11/11` com cinco
rotas em 1440px/768px/390px, fixture autenticado reidratado, E2E sintético
`43/43` contra build local isolado, loading inicial anunciado, estados
preenchidos sintéticos de diagnóstico/operação/autoria, axe sem violações, sem
overflow global, traversal completo por Tab, reduced motion efetivo, captura
de falhas de stylesheet/pageerror/console, estados loading/empty/success,
assets locais HTTP 200, stress semântico/responsivo com alvos nativos e
variante populada de operações, reflow em viewport de 195 CSS px como proxy de
zoom e renders regeneráveis em `test-results/`. O pacote
`.agent/artifacts/frontend-quality-packet.json` passou os gates determinísticos
de accessibility, performance, typography e copy_stress. As críticas
independentes encontraram e a implementação corrigiu contraste do cartão de
privacidade, estabilidade do cabeçalho, disabled-state, agrupamento e
hierarquia do authoring; `select:disabled` passa 5.99:1. O Gauntlet Round 7
foi revalidado após `pnpm verify`, E2E sintético `43/43` e visual `7/7`; a
crítica fresh curta do proxy retornou `PASS` sem severidade. O Round 8 corrigiu
o clipping de ações na viewport de 195px e manteve as provas live ausentes.
A crítica fresh same-SHA em
`.agent/artifacts/ui-visual-critic-2026-09-06-final.md` retornou `PASS` para
UI-VIS-08 sem P0/P1 visual no recorte. A fatia continua bounded e não fecha
`AAA-001`, live, produção ou clínica; os demais gates do programa permanecem
inalterados.

Revalidação pós-ajuste em 2026-09-06: o rail sticky mobile, as superfícies de
painéis aninhados e o nome acessível estável do toggle de autoria passaram foco
RED/GREEN `3/3`; os segmentos restantes da matriz visual passaram `7/7` e
`3/3`. A execução única de 44 testes recebeu `SIGTERM` antes do fim e não é
reivindicada como `44/44`. O registro completo está em
`.agent/artifacts/ui-visual-postfix-2026-09-06.md`; a fatia segue bounded e
`AAA-400`/`AAA-401` não são reclassificados.

Revalidação corrente após alterações visuais concorrentes: a matriz completa
`tests/e2e/visual-gauntlet.spec.ts` passou `11/11` em `59,1 s`; a verificação
ampla passou `149` arquivos, `808` testes e `42` skips, com cobertura
`84,45%/80,18%/87,35%/85,20%`. O registro está em
`.agent/artifacts/ui-visual-current-revalidation-2026-09-06.md`; o
rebaseline do Gauntlet e a próxima fatia `AAA-701` continuam pendentes.

## 3. Governança e control plane

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-000 | P0 | COMPLETED | Consolidar plano executivo, roadmap, backlog, baseline e evidências em `BRIEFING/03.BUILD` | SPEC-0190; auditoria 0550 | links resolvem, diff-check passa e os quatro docs apontam para a mesma revisão |
| AAA-001 | P0 | WAITING_HUMAN_APPROVAL | Aprovar quality bar, metas de SLO/RPO/RTO, capacidade, escopo do piloto e autoridade dos gates | AAA-000 | decisão de Ricardo registrada; sem decisão, nenhuma prova live, publicação clínica, produção, deploy ou piloto começa; fatias locais bounded exigem registro explícito |
| AAA-002 | P0 | COMPLETED | Sincronizar `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md` e `traceability.yml` com HEAD atual | AAA-000 | `verify-documentation`, `verify-traceability`, `verify-product-definition` e `git diff --check` passaram; alterações externas foram preservadas |
| AAA-003 | P1 | READY_FOR_NEXT_STEP | Criar registro de evidência same-SHA para cada gate, com comando, artefato, hash, limitação e revisor | AAA-001 | auditor independente reproduz o índice sem depender da conversa |

## 4. Trust core — segurança, identidade e integridade

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-100 | P0 | READY_FOR_NEXT_STEP | Mapear matriz ator × escopo × recurso × ação nos contratos, API e RLS | AAA-001 | matriz positiva/negativa cobre cada rota crítica e é ligada à SPEC |
| AAA-101 | P0 | IN_PROGRESS | Corrigir a policy DELETE de `diagnostic_session_answers` em `0051` para impedir exclusão após finalização | AAA-100 | migration `0052` registrada; unit/governance focal passa; teste live/RLS e auditoria independente ainda pendentes |
| AAA-102 | P0 | IN_PROGRESS | Garantir que finalização preserve `answeredItemCount` e respostas antes/depois do status `FINALIZADA` | AAA-101 | leitura autorizada antes e depois da transição implementada; regressão focal passa; prova live sob RLS ainda pendente |
| AAA-103 | P0 | IN_PROGRESS | Eliminar race de idempotência em attempts/answers com constraint/transação e retry seguro | AAA-100 | insert atômico, lock por chave, fingerprint vencedor, CAS nomeado e HTTP 409 cobertos; concorrência PostgreSQL live ainda pendente |
| AAA-104 | P0 | IN_PROGRESS | Fechar FKs de participante e policies de `content_versions`/`ai_suggestions` | AAA-100 | migration `0053`, FKs, RLS, orphan scan e governance focal passam; negative RLS live ainda pendente |
| AAA-105 | P0 | IN_PROGRESS | Fechar sessão, recovery, revogação e reidratação web após reload | AAA-100 | contrato/API/E2E sintético de sessão atual e recovery passam; cookie, expiração, cross-scope e E2E real ainda pendentes |
| AAA-106 | P1 | IN_PROGRESS | Provar login/role/capability de staff e admin na web, proxy e API; gate local impede o shell de operations/authoring antes da autorização server-side | AAA-105 | proxy RED/GREEN 11/11, foco de autorização 12/12, typecheck/build, E2E completo 43/43 e visual 7/7 passam com upstream local que exige cookie; upstream produtivo, cookie HTTPS/expiração, cross-scope e browser→API→PostgreSQL live permanecem pendentes |
| AAA-107 | P0 | READY_FOR_NEXT_STEP | Reexecutar harness PostgreSQL least-privilege, RLS, owners, grants e rollback | AAA-101..104; ambiente descartável | `test:integration:live` com roles separadas, artefato redigido e auditoria independente |

## 5. Jornada vertical do participante

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-200 | P0 | COMPLETED_WITH_GAPS | Congelar contrato da jornada diagnóstico → assignment → atividade → próxima ação; feedback permanece separado | AAA-101/102; contrato 0560 | contrato `0561` versionado; resumo allowlisted sem IDs/módulos internos; E2E final `43/43`; live, revisão independente pós-correção e G2 continuam pendentes |
| AAA-201 | P0 | COMPLETED_WITH_GAPS | Produzir assignment a partir do diagnóstico usando transação server-side e regra determinística | AAA-200 | `M01/M02/M11` + recomendações válidas, unicidade, replay, CAS, proveniência divergente fail-closed e atividade publicada cobertos localmente; E2E final `43/43`; PostgreSQL/RLS live e concorrência real pendentes |
| AAA-202 | P0 | READY_FOR_NEXT_STEP | E2E browser → web/proxy → API → PostgreSQL/RLS para a jornada completa | AAA-201; ambiente autorizado | Playwright real, oracle administrativo separado, cleanup zero e logs redigidos |
| AAA-203 | P1 | READY_FOR_NEXT_STEP | Implementar reply/resolução de feedback bounded, plain text e owner/scope scoped | AAA-002; FEEDBACK-055 | participante não altera decisão staff; histórico append-only e contrato público passam |
| AAA-204 | P1 | READY_FOR_NEXT_STEP | Fechar retenção, remediação e CTA com cadência aprovada no PRD | AAA-201; decisão de produto | clock injetável, due review e próxima ação explicável |
| AAA-205 | P1 | COMPLETED_WITH_GAPS | Tratar loading, timeout, retry, erro, sessão expirada e retomada sem perda | AAA-202 | contrato `0562`; loading/error/empty/retry, recovery one-time, sessão corrente e redaction cobertos localmente; E2E final `43/43`; expiração/cross-scope/browser→PostgreSQL/RLS e revisão manual permanecem pendentes |

## 6. Autoria e governança clínica

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-300 | P0 | READY_FOR_NEXT_STEP | Completar fluxo draft → review → ajustes → resubmit → approval → publish → withdraw | AAA-100; authoring atual | state machine, API, UI, audit trail e four-eyes passam |
| AAA-301 | P0 | READY_FOR_NEXT_STEP | Versionar conteúdo, validade, checksum, compatibilidade e retirada sem apagar histórico | AAA-300 | migration, contrato, replay de versão e projeção pública passam |
| AAA-302 | P0 | WAITING_HUMAN_APPROVAL | Produzir B-07 autoral sintético e internamente rastreável conforme blueprint | B07-01; decisão de Ricardo | 120 itens e rubricas passam preflight; nenhuma publicação sem revisão |
| AAA-303 | P0 | WAITING_HUMAN_APPROVAL | Executar a fatia curricular M02 com cenários fictícios e instrumentos aprovados | CUR-24-01; AAA-302 | protocolo T2, carga, avaliabilidade e decisão humana registrados |
| AAA-304 | P0 | WAITING_HUMAN_APPROVAL | Revisar clinicamente itens, rubricas, feedback e fontes permitidas | AAA-302/303 | revisão item a item, conflitos resolvidos e gate clínico assinado |
| AAA-305 | P1 | READY_FOR_NEXT_STEP | Criar preflight automático de publicação, exposição, rastreabilidade e redaction | AAA-300/304 | publicação falha fechada para conteúdo incompleto ou proibido |

## 7. Experiência, acessibilidade e papéis

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-400 | P1 | READY_FOR_NEXT_STEP | Consolidar tokens, componentes, estados e linguagem visual premium sem reescrever domínio | AAA-200; packages/ui | visual review, responsive matrix e regressão de componentes |
| AAA-401 | P1 | READY_FOR_NEXT_STEP | Fazer WCAG 2.2 AA dos fluxos críticos: foco, teclado, contraste, labels e erros | AAA-400 | axe + teclado + revisão manual em navegador |
| AAA-402 | P1 | READY_FOR_NEXT_STEP | Melhorar jornada participante: progresso, resumo, feedback e próxima ação | AAA-202/204 | usability task pass, E2E e exposição pública sem internals |
| AAA-403 | P1 | READY_FOR_NEXT_STEP | Completar authoring/operations para facilitador e coordenação por capability | AAA-300; AAA-106 | cross-scope, loading/error, paginação bounded e ações role-aware |
| AAA-404 | P1 | READY_FOR_NEXT_STEP | Dashboard e relatórios agregados com privacy-by-design e exportação autorizada | AAA-403 | query server-side, limites, agregação e negative access passam |
| AAA-405 | P1 | READY_FOR_NEXT_STEP | Recovery UX, sessão expirada, rede instável e mensagens operacionais | AAA-105/205 | testes de falha e revisão de conteúdo sem segredo |
| AAA-406 | P1 | READY_FOR_NEXT_STEP | Revalidar public boundary, DTOs, headers, source/gabarito e bibliografia | AAA-300/400 | exposure scan + inspeção manual + testes negativos |

## 8. Learning intelligence e eficácia

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-500 | P1 | READY_FOR_NEXT_STEP | Definir mastery digital determinístico, explicável e separado de competência prática | AAA-201; PRD/SPEC | invariantes, casos limítrofes e revisão pedagógica |
| AAA-501 | P1 | READY_FOR_NEXT_STEP | Implementar retrieval, remediação e spaced review com clock injetável | AAA-204/500 | unit/application/contract/integration e replay passam |
| AAA-502 | P1 | READY_FOR_NEXT_STEP | Implementar `NextBestLearningActionService` com reasonCode, prioridade e pré-requisitos | AAA-500/501 | mesma entrada produz mesma saída; autorização e explicabilidade passam |
| AAA-503 | P1 | READY_FOR_NEXT_STEP | Criar métricas de processo, participação, retenção e eficácia digital | AAA-500/502 | eventos redigidos, agregação e dashboard sem ranking punitivo |
| AAA-504 | P2 | READY_FOR_NEXT_STEP | Avaliar outcomes e calibrar regras com dataset sintético e revisão independente | AAA-503; piloto | relatório de calibração sem claim de competência prática |

## 9. Plataforma, operação e release

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-600 | P0 | READY_FOR_NEXT_STEP | Instrumentar logs redigidos, métricas, traces e correlation end-to-end | AAA-202; observability package | collector descartável recebe sinais sem payload proibido |
| AAA-601 | P0 | READY_FOR_NEXT_STEP | Definir SLOs, alertas, dashboards e ownership operacional | AAA-001/600 | thresholds aprovados, alert testado e runbook ligado |
| AAA-602 | P0 | READY_FOR_NEXT_STEP | Materializar deploy, env, secrets, roles, migrations e health/recovery | AAA-107; autoridade de ambiente | dry-run, least privilege e checklist sem segredo no Git |
| AAA-603 | P0 | IN_PROGRESS | Fechar CI same-SHA, cache seguro, artifacts, SBOM e dependency/security gates; fatia local adicionou verificação de checkout, SBOM CycloneDX, manifesto SHA-256 e redaction | AAA-003/602 | contrato e governança local passam; workflow remoto, cache, ACL/retention, assinatura e artefato same-SHA ainda pendentes |
| AAA-604 | P1 | READY_FOR_NEXT_STEP | Medir carga, concorrência, p95/p99 e limites de banco/worker | AAA-601/603; metas AAA-001 | cenário sintético, budget aprovado e relatório de capacidade |
| AAA-605 | P0 | READY_FOR_NEXT_STEP | Exercitar backup, restore, failover, rollback e RPO/RTO | AAA-602; metas AAA-001 | runbook executado, evidência e abort criteria registrados |
| AAA-606 | P1 | READY_FOR_NEXT_STEP | Criar incident response, on-call, triage, comunicação e postmortem | AAA-601/605 | tabletop/drill com owner e tempo de recuperação medido |
| AAA-607 | P0 | READY_FOR_NEXT_STEP | Definir retenção, minimização, exportação e eliminação conforme governança | AAA-001; PRD/SPEC | matriz de dados, jobs e testes de privacidade passam |

## 10. IA, Qdrant e evals

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-700 | P1 | IN_PROGRESS | Robustecer provider IA: timeout, abort, quota, custo, retry bounded e fallback; fatia local adicionou retry transient-only, abort, budget e composição desligável | AAA-600 | RED/GREEN local passa; provider real, custo/latência, collector, fallback operacional e evals permanecem pendentes |
| AAA-701 | P1 | IN_PROGRESS | Reconciliar Qdrant a partir do PostgreSQL por versão/hash/escopo; fatia local adicionou metadados de versão/modelo, allowlist de payload, no-op sem embedding e advisory lock | AAA-600; schema atual | focal `18/18` e `pnpm verify` passam; nova crítica fresh independente e lock/Qdrant live ainda pendentes; Euler foi encerrado sem parecer |
| AAA-702 | P0 | READY_FOR_NEXT_STEP | Executar evals de prompt injection, PII leakage, groundedness e formato | AAA-700/701 | dataset sintético versionado, thresholds aprovados e falha fechada |
| AAA-703 | P0 | READY_FOR_NEXT_STEP | Garantir human-in-the-loop para sugestão, autoria, publicação e correção | AAA-300/702 | IA nunca muda estado; aprovação e auditoria são server-side |
| AAA-704 | P2 | READY_FOR_NEXT_STEP | Medir custo, latência e valor incremental antes de liberar novo provider | AAA-700/702; decisão | relatório comparativo e decisão explícita de continuar/parar |

## 11. Readiness, piloto e auditoria

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-800 | P0 | READY_FOR_NEXT_STEP | Montar release-readiness pack com todos os gates, owners e evidências | AAA-300/603/605/607 | checklist completo sem claim não sustentado |
| AAA-801 | P0 | READY_FOR_NEXT_STEP | Executar auditoria independente de PRD, SPEC, runtime, dados, segurança e UX | AAA-800 | relatório com PASS/FAIL/BLOCKED e remediação ligada ao backlog |
| AAA-802 | P0 | WAITING_HUMAN_APPROVAL | Aprovar protocolo, população, escopo, duração e critérios de aborto do piloto | AAA-801; decisão de Ricardo | autorização documentada; sem participante real antes disso |
| AAA-803 | P0 | WAITING_HUMAN_APPROVAL | Executar piloto controlado com dados e autoridades permitidos | AAA-802 | observabilidade, consentimento/autoridade, incident log e cleanup |
| AAA-804 | P1 | READY_FOR_NEXT_STEP | Analisar resultados, usabilidade, retenção, segurança e gaps do piloto | AAA-803 | relatório sem transformar sinal digital em competência prática |
| AAA-805 | P0 | READY_FOR_NEXT_STEP | Emitir auditoria final AAA e decisão de expandir, corrigir ou parar | AAA-804 | G6 somente com zero P0/P1 e evidência atual independente |

## 12. Continuidade e manutenção

| ID | P | Status | O que / onde / como | Dependências | Validação e pronto |
| --- | --- | --- | --- | --- | --- |
| AAA-900 | P1 | READY_FOR_NEXT_STEP | Manter traceability requisito → SPEC → task → código → teste → commit → artefato | todos os epics | checker e revisão bidirecional sem órfãos |
| AAA-901 | P1 | READY_FOR_NEXT_STEP | Reauditar mensalmente segurança, exposição, dependências, migrations e estado | G1 em diante | relatório de drift e task de remediação criada |
| AAA-902 | P2 | READY_FOR_NEXT_STEP | Revisar trimestralmente custo, UX, aprendizagem, IA, operação e necessidade de arquitetura | G5; métricas | decisão de manter, simplificar ou evoluir documentada |

## 13. Mapa de dependências

```text
AAA-001
  ├─ AAA-002/003
  ├─ AAA-100..107
  │    └─ AAA-200..205
  │         ├─ AAA-400..406
  │         └─ AAA-500..504
  ├─ AAA-300..305
  ├─ AAA-600..607
  └─ AAA-700..704
       └─ AAA-800..805
```

## 14. Critério comum de encerramento

Uma task só pode ir para `COMPLETED` quando:

1. o requisito e o contrato estão atuais;
2. RED falhou pela razão correta e GREEN corrigiu sem enfraquecer o teste;
3. testes proporcionais e revisão independente passaram;
4. migration, código, docs e traceability estão ligados;
5. rollback/limitação estão registrados;
6. state, log e backlog foram atualizados na ordem canônica;
7. não existe blocker ou aprovação humana pendente na própria task.

## 15. Próxima ação do backlog

As fatias locais bounded `AAA-603` e `AAA-700` estão em `IN_PROGRESS`: os
contratos e testes locais passam, mas não há promoção para `COMPLETED` sem a
prova remota/operacional correspondente. `AAA-001` continua aguardando Ricardo
para aprovar a barra AAA, metas SLO/RPO/RTO, capacidade, piloto e autoridade de
ambiente. Com ambiente autorizado, o próximo gate crítico é `AAA-202` (E2E
browser → web → API → PostgreSQL/RLS); sem `CVG_TEST_DATABASE_URL`, ele
permanece bloqueado e a evidência sintética não é reclassificada.

Após o rebaseline controlado da mutação visual corrente, a próxima execução
local autorizada é `AAA-701`: primeiro RED para pontos Qdrant antigos,
divergentes e órfãos; depois GREEN/REFACTOR e auditoria independente bounded.

`AAA-701` está agora em `IN_PROGRESS`: RED/GREEN/REFACTOR local e verificação
ampla passaram, mas uma nova crítica fresh independente, PostgreSQL/Qdrant
live, lock cross-process observado e operação same-SHA permanecem pendentes.
O crítico `Euler` foi encerrado sem parecer e não representa `PASS`. Não marcar
`COMPLETED` por inferência sintética.
