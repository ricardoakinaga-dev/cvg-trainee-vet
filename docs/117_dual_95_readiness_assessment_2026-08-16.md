# Avaliação de prontidão pós-S4-173 — programa Dual 95

> **Registro histórico:** esta avaliação permanece a fotografia do corte Dual 95 e foi sucedida por `docs/131_dual_98_gap_assessment_2026-08-16.md`. Nenhuma nota histórica foi alterada.

- assessment_id: `DUAL95-READINESS-2026-08-16`
- corte: `2026-08-16T11:15:29-03:00`
- escopo: código, testes, runtime local, documentação, segurança e prontidão de execução
- disposição: `PILOT_BLOCKED`
- confiança: evidência local forte para regressão; evidência insuficiente para release, HA produtiva ou promoção de nota

## 1. Resultado executivo

A S4-173 é aceita como melhoria estrutural do dashboard: `DashboardPage` caiu de `217` para `21` linhas, e modelo, estado, apresentação e composição foram separados sem regressão detectada nos testes focais. Ela não encerra, isoladamente, os itens de manutenibilidade, frontend ou testes.

Nenhuma nota oficial foi alterada. Permanecem duas rubricas independentes e congeladas:

| Trilha | Fonte | Baseline | Itens já ≥95 | Meta de saída |
|---|---|---:|---:|---:|
| maturidade integral | `0491` / programa `0304` | `83,24/100` | `1/16` | `16/16 ≥95` |
| qualidade independente | `docs/116` / plano `0306` | `64,20/100` | `0/16` | `16/16 ≥95` |
| contrato Dual 95 | `0307` / `0514` / `0515` | não calculado por média combinada | `1/32` | `32/32 ≥95` no mesmo RC |

Uma média não compensa uma célula abaixo de 95. A reauditoria só é elegível quando as duas matrizes forem executadas sobre o mesmo SHA, digest, manifesto, ambiente e pacote de evidência.

## 2. Evidência reproduzida nesta rodada

| Verificação | Resultado | Classificação correta |
|---|---|---|
| testes focais de dashboard | `2` arquivos, `6/6` testes | `PASS_LOCAL` |
| `pnpm verify` | `177` arquivos, `790` testes, `16` skips governados | `PASS_LOCAL` |
| cobertura agregada | `84,81%` statements; `80,18%` branches; `87,13%` functions; `85,65%` lines | `PASS_WITH_SCOPE_GAP` |
| build | `12/12` workspaces | `PASS_LOCAL` |
| Playwright | `26/26` | `PASS_LOCAL_WEB` |
| API em `127.0.0.1:3101` durante o Playwright | indisponível; proxy registrou `ECONNREFUSED` | `NOT_PROVEN` para browser→API/HA |
| dependências de produção | `pnpm audit --prod --audit-level high` sem vulnerabilidade conhecida | `PASS_LOCAL` |
| rastreabilidade premium | `145/145` linhas inventariadas; `0/145` cadeias completas | `PASS_WITH_GAPS` |
| matriz de risco P0/P1 | success `87/87`; error `63/87`; denied `26/87`; conflict `36/87`; completas `11/87` | `PASS_WITH_GAPS` |
| hotspots | `0` arquivos >800; `152` funções >50; maior função `128` | `PASS_WITH_DEBT` |
| worktree | `111` modificados + `101` não rastreados = `212` entradas | `UNRELEASED` |

Os `212` representam o corte técnico anterior à materialização deste pacote. Após criar os quatro novos artefatos e atualizar cinco fontes antes limpas, o estado pós-relatório passou a `116` entradas rastreadas/modificadas + `105` não rastreadas = `221`; `U95-003` deve revisar o conjunto corrente integral.

A cobertura agregada não inclui os módulos de produção em `apps/web/app/**`, pois o denominador configurado cobre `apps/**/src/**/*.ts`. Logo, os percentuais não provam cobertura da implementação da S4-173.

## 3. Avaliação específica da S4-173

### 3.1 Melhorias aceitas

- `page.tsx` tornou-se uma composition root pequena;
- loader/guard, hook de estado e componentes de apresentação ficaram separados;
- estados loading, erro e conteúdo preservam landmarks e semântica acessível;
- `response.ok` é validado antes do parsing;
- os testes de caracterização preservam os 24 itens do roadmap e os principais estados visuais;
- não foi encontrado segredo, dado clínico real ou regressão crítica nesta extração.

### 3.2 Limites que permanecem

| Severidade | Gap | Consequência | Aceite requerido |
|---|---|---|---|
| média | o guard local aceita strings/números genéricos e não replica allowlists, ranges, unicidade e `curriculumId` do contrato Zod canônico | resposta fora do contrato pode chegar à UI, inclusive `href` não allowlisted | consumir/derivar o contrato compartilhado; testes negativos para link, status, ranges, duplicidade e currículo |
| média | os módulos `apps/web/app/dashboard/**` estão fora do denominador de cobertura | o percentual global não mede esta task | incluir toda produção relevante ou publicar cobertura de camada equivalente com pisos explícitos |
| baixa | o hook não possui teste focal de `loading → error → retry → success` | regressões de retry/concorrência podem passar | montar o hook/composição e testar HTTP não-2xx, JSON inválido, projeção inválida e retry |

Conclusão da task: aceita como evidência parcial de `AUD-CQ-011`; ainda não é prova suficiente de `AUD-CQ-012`, contrato bounded ou experiência integrada.

## 4. Novos achados prioritários

Nenhum achado crítico foi confirmado. Os seis achados altos abaixo invalidam a afirmação de que `AUD-CQ-001–014` estariam prontos apenas para reauditoria.

| ID | Sev. | Achado comprovado | Impacto | Trilha afetada |
|---|---|---|---|---|
| `D95-H01` | alta | renderer Prometheus repete `# TYPE` após amostras quando há múltiplas séries da mesma família | payload pode ser recusado pelo scraper | qualidade 8/13/14; maturidade 12 |
| `D95-H02` | alta | Prometheus local roda como UID/GID `65534`, mas o token montado está `0600` para UID/GID `1000`; API A/B estão `down`, rules estão vazias e não há Alertmanager efetivo | observabilidade local declarada não funciona | qualidade 13/14/15; maturidade 12/15 |
| `D95-H03` | alta | revisão e publicação clínica usam transições/persistências separadas sem unidade transacional externa | falha intermediária pode deixar conteúdo em estado irrecuperável pelo fluxo normal | qualidade 3/8/9/10; maturidade 5/6/10 |
| `D95-H04` | alta | publicação valida uma aprovação independente, mas não a vincula ao `CLINICAL_APPROVER_ID` atual | aprovação legada ou anterior à rotação pode continuar publicável | qualidade 3/10; maturidade 8/10 |
| `D95-H05` | alta | fixture PostgreSQL do fluxo autoral omite o aprovador designado exigido pela regra atual | suíte live tende a falhar quando o skip é removido | qualidade 10/12; maturidade 10/14 |
| `D95-H06` | alta | deploy e rollback sondam API/edge, mas não bloqueiam promoção se worker A/B estiverem unhealthy | release pode declarar sucesso sem processamento assíncrono | qualidade 13/15; maturidade 11/15 |

Achados médios incorporados ao backlog: estado de erro do canário não é recuperado após warm-up; digest não é atestado contra source SHA; PromQL distorce percentuais em baixo tráfego; `/health/dependencies` público e isento pode amplificar carga; token de convite permanece no histórico do navegador; validação/cobertura/retry do dashboard são incompletos.

## 5. Fatos de runtime reconciliados

- runtime Docker local: API A/B e worker A/B reportam health, mas isso não torna a observabilidade íntegra;
- Prometheus: API A/B `down` por permissão no token; somente collector observado como `up`; `groups=[]`; nenhum Alertmanager descoberto;
- fila clínica PostgreSQL no corte: `796` versões totais, `763` pendentes na projeção verificada e `0` decisões de revisão;
- o valor corrente comprovado é `763`; menções recentes a `764` confundiram uma contagem de teste com a fonte transacional;
- Playwright padrão: web sintético/mocado, sem API em `3101`; não prova HA;
- evidência permanece local e não comitada; nenhum SHA/artefato final pode ser atribuído às `221` entradas correntes sem revisão e commits intencionais.

## 6. Matriz de elegibilidade — maturidade integral

As notas são a baseline congelada de `0491`; a última coluna é condição mínima de candidatura, não projeção de nota.

| ID | Item | Base | Condição objetiva para propor ≥95 |
|---|---|---:|---|
| `ENT95-01` | documentação, gates e governança | 90 | zero fonte corrente conflitante; duas rubricas registradas; estado/log/backlogs e pacote do RC sem drift |
| `ENT95-02` | Discovery, PRD e escopo | 95 | preservar gate aprovado e provar aceite/métricas sem ampliar escopo silenciosamente |
| `ENT95-03` | currículo e conteúdo clínico | 72 | 24 módulos/96 sessões/B-07 completos; calibração e fila liberável zerada com decisão humana |
| `ENT95-04` | arquitetura e modularidade | 92 | boundaries, composition roots, capacidade, failure domains e dívida crítica aceitos |
| `ENT95-05` | domínio, contratos e regras | 88 | invariantes e decisões aplicáveis com prova positiva/erro/denied/conflict e publicação atômica |
| `ENT95-06` | persistência e integridade | 90 | transações, RLS, concorrência, retenção e restore/PITR preservam invariantes |
| `ENT95-07` | API e backend | 82 | inventário único de rotas/contratos/authz/erros; negativos completos nas rotas P0/P1 |
| `ENT95-08` | segurança, identidade e privacidade | 86 | IdP/MFA/recovery/step-up, rotação, sessão e security assessment sem P0/P1 |
| `ENT95-09` | jornada do participante | 75 | diagnóstico→retenção, retomada, correção e recurso aceitos por usuários representativos |
| `ENT95-10` | autoria e governança clínica | 68 | revisão/publicação atômicas, aprovador atual obrigatório, trilha completa e corpus revisado |
| `ENT95-11` | worker, Qdrant, IA e resiliência | 88 | crash/replay/rebuild/fallback/backpressure e health de release comprovados |
| `ENT95-12` | observabilidade e operação | 78 | métricas parseáveis, targets/rules/alerts efetivos, fire→ack→resolve e retenção externa |
| `ENT95-13` | web, UX e acessibilidade | 78 | superfícies/estados completos, WCAG 2.2 AA manual, SR, mobile/cross-browser, UAT e RUM |
| `ENT95-14` | testes, cobertura e evidência | 93 | produção inteira no denominador; risco aplicável completo; live/E2E/fault injection no RC |
| `ENT95-15` | CI e reprodutibilidade | 86 | CI no SHA, SBOM/attestation, registry, deploy/rollback e worker gates reais |
| `ENT95-16` | rastreabilidade e mudança | 65 | `145/145` cadeias completas com SHA/digest/manifest/artefato/retention coerentes |

## 7. Matriz de elegibilidade — qualidade independente

| # | Item | Base | Condição objetiva para propor ≥95 |
|---:|---|---:|---|
| 1 | documentação e governança | 78 | registry sem ambiguidade, snapshots rotulados, fatos reconciliados e auditoria documental independente |
| 2 | aderência ao PRD | 75 | requisitos essenciais ligados a jornada, métrica, UAT e aceite por papel |
| 3 | aderência à SPEC | 85 | matriz SPEC→runtime/release no mesmo RC, incluindo fluxo clínico atômico |
| 4 | arquitetura e boundaries | 84 | inventário→handler/composição completos, boundaries e capacidade reavaliados |
| 5 | manutenibilidade e coesão | 52 | zero função crítica >50, zero >100 ou exceção temporária com owner/prazo; redução líquida sustentável |
| 6 | type safety e imutabilidade | 84 | remover casts duplos evitáveis, tipar transações e compartilhar contratos com a web |
| 7 | API e validação | 86 | uma fonte de rotas/schema/authz/erros e negativos completos da superfície P0/P1 |
| 8 | erros e resiliência | 48 | fault injection sem hang/unhandled rejection/estado parcial; causas sanitizadas |
| 9 | persistência e integridade | 70 | atomicidade clínica, RLS/auditoria, concorrência, rollback e restore comprovados |
| 10 | segurança e acesso | 68 | aprovador atual fail-closed, sessão/step-up/segredos/container/DAST sem P0/P1 |
| 11 | frontend, UX e a11y | 65 | contratos bounded, estados/retry, papéis, WCAG/SR/mobile/cross-browser/UAT/RUM |
| 12 | testes, cobertura e E2E | 70 | produção inteira medida, ≥90% global, camada crítica ≥80%, risco completo e E2E ativo |
| 13 | runtime e HA | 46 | readiness/failure domains/canário/failover/soak e health de API+workers no RC |
| 14 | observabilidade, backup e DR | 40 | scrape válido, targets/rules/alerts, offsite/PITR e RPO≤1h/RTO≤4h medidos |
| 15 | CI e release | 47 | CI verde, digest↔SHA atestado, SBOM, assinatura, deploy e rollback ensaiados |
| 16 | rastreabilidade e proveniência | 42 | worktree limpo e `145/145` cadeias completas no artefato final retido |

## 8. Gates para nova auditoria

1. `G95-0` — verdade: zero conflito de baseline, contagem, documento vigente, owner ou estado.
2. `G95-1` — local: zero achado P1 local; testes, build, cobertura honesta, E2E ativo e fault injection verdes.
3. `G95-2` — RC-alpha: worktree revisado, commits intencionais, SHA/digest/SBOM/manifest alinhados e rollback local real entre versões.
4. `G95-3` — externo: CI, registry, IdP/MFA, DNS/TLS, telemetria e backup reais.
5. `G95-4` — produto/clínico: jornada, 24/96/B-07 e fila clínica liberável concluídos.
6. `G95-5` — aceitação/resiliência: UAT, WCAG, RUM, segurança, soak, failover e DR sem P0/P1.
7. `G95-6` — evidência: `145/145` cadeias completas e sem drift.
8. `G95-7` — auditoria: duas reauditorias independentes, `16/16 ≥95` em cada trilha, no mesmo RC.

## 9. Disposição

`READY_FOR_NEXT_STEP` para executar o programa técnico local iniciado por `U95-003`, `U95-101` e os achados `D95-H01–H06`. `WAITING_HUMAN_APPROVAL` permanece apenas nos gates que realmente exigem equipe, orçamento, revisão clínica, ambientes externos, publicação ou auditor independente.

O produto permanece `PILOT_BLOCKED`. Não há base para alterar `83,24/100`, `64,20/100`, `1/32` células no piso ou `0/145` cadeias completas.
