# 0491 — Relatório completo da auditoria atual do programa CVG

> **Baseline de maturidade congelada:** a nota `83,24/100` e as 16 linhas deste
> corte só mudam por reauditoria independente. O overlay executivo corrente é
> `../03.BUILD/0308_dual_98_executive_program.md`; a avaliação pós-hardening está
> em `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`. Dual 95 permanece
> histórico.

**Data da verificação:** 2026-08-11T22:15:31-03:00
**Projeto:** `cvg-trainee-vet`
**HEAD:** `9803c85ca62cda0684802aaa68a5dd3418f43c88`
**Estado do worktree:** há alterações locais não commitadas; a nota inclui o código e a documentação presentes no worktree.
**Ambiente:** runtime HA local/LAN/Tailscale, dados sintéticos, sem domínio público.
**Escopo:** documentação de `docs/`, Discovery, PRD, SPEC, BUILD, AUDIT, código, testes, CI, runtime local, segurança, dados, integrações, operação e experiência web.

## 1. Veredito executivo

**Nota geral ponderada: 83/100 (83,24/100 antes do arredondamento).**

**Resultado:** `PASS_WITH_GAPS`.
**Estado operacional:** `WAITING_HUMAN_APPROVAL`.
**Release/piloto/publicação clínica:** **não aprovado**.

O núcleo técnico está funcional e observável no ambiente local: `pnpm verify` passou, o E2E navegador→web→edge→API→PostgreSQL passou 2/2, a superfície web focada passou 15/15, a HA local está saudável, a carga respondeu 200/200 e o trace sintético sobreviveu ao restart do Tempo.

A nota não é uma declaração de prontidão hospitalar. O produto completo do PRD ainda não está entregue como jornada operacional de 24 meses, 763 conteúdos continuam sem revisão clínica independente, o provedor real de identidade/MFA/recovery não foi executado, domínio/TLS público, storage externo de traces/backups, RPO/RTO produtivo, CI remoto atual e deploy/rollback autorizado não têm prova nesta rodada. O worktree também não está congelado em um SHA que contenha todas as alterações auditadas.

Não foi observado P0 de segredo, acesso cruzado, exposição autoral, alteração indevida de nota/gabarito ou decisão de publicação pela IA. Os gaps P1 mantêm o release bloqueado.

## 2. Documentação lida

Foram lidos os 15 arquivos de `docs/`, incluindo estado, log, backlog, auditorias anteriores, política de fontes, evidências operacionais, fila clínica, backup/restore, IdP, revalidação local e ciclo de vida de identidade. Também foram confrontados:

- `AGENTS.md` e as regras operacionais do CVG;
- gates de Discovery, PRD e SPEC;
- `0300`, `0301`, `0302`, `0303`, `0390` e `0391` do BUILD;
- escopo, plano, auditorias 0410–0418, gaps, remediação e relatório do AUDIT;
- PRD/SPEC de requisitos, domínio, API, dados, segurança, integrações, observabilidade, web e testes;
- `traceability.yml`, workflow de CI, scripts de verificação e código executável.

Documentos históricos foram tratados como evidência de contexto, não como prova atual. A evidência desta rodada está nas verificações abaixo e neste relatório.

## 3. Evidências executadas

| Controle | Resultado atual | Limite de interpretação |
|---|---|---|
| `pnpm verify` | **PASS** — 100 arquivos de teste, 475 testes passados, 18 skips; 84,93% statements, 80,05% branches, 86,70% functions, 85,71% lines | Skips são condicionais; cobertura não substitui completude do produto. |
| contratos/worker/migrações | **PASS** — contratos 48/48, worker 24/24, 16 migrações | Não prova todos os fluxos de negócio do PRD. |
| lint/typecheck/build web | **PASS**; build web com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182` | Build produtivo depende de URL interna configurada no ambiente. |
| secrets/dependências | **PASS** — secret scan limpo; `pnpm audit --audit-level=high` sem vulnerabilidades conhecidas | Não substitui threat model, pentest ou operação externa. |
| E2E HA ativo | **PASS** — Chromium 2/2, browser→web→edge→API→PostgreSQL; fixture removida | Fluxos testados são sintéticos e mínimos. |
| E2E web focado | **PASS** — 15/15 em participante, conta, autoria, fila, dashboard e convite | Não é teste manual com usuários nem valida todas as telas do PRD. |
| runtime | **PASS** — web 3100, edge 3180/3181/3182, APIs/workers/PostgreSQL saudáveis; health web/edge 200 | Ambiente local/LAN/Tailscale, não produção hospitalar. |
| HA/topologia | **PASS** — 2 APIs, 2 workers, Caddy health-routed, Qdrant, collector, Tempo, Prometheus e Grafana | Réplicas locais não provam capacidade ou failover produtivo. |
| carga | **PASS** — 200/200 HTTP 200, 100%, concorrência 20, p95 122,37 ms | Smoke curto; não é teste de capacidade, soak ou SLO produtivo. |
| traces | **PASS local** — ingestão e consulta após restart do Tempo | Backend, retenção e acesso externos não executados. |
| edge/headers | **PASS local** — HTTP não-health 308, HTTPS interno com SNI 200 e headers de segurança | Certificado é staging interno; domínio/ACME públicos não comprovados. |
| métricas | **PASS protegido** — edge público 308 e `/internal/metrics/prometheus` sem credencial 401 | Scrape, alertas e retenção externa não foram comprovados nesta execução. |
| logs | **PARTIAL** — JSON estruturado, `requestId`, `correlationId`, rota/status/outcome e redaction observados | Retenção, acesso controlado e incidente distribuído externo permanecem pendentes. |
| currículo/runtime | **PASS_WITH_GAPS** — leitura administrativa confirma 24 atividades, 796 conteúdos/editorial/itens, 24 atribuições e 24 estados | 763 conteúdos estão `PROJECAO_VERIFICADA`; 0 aprovações clínicas. |
| fila clínica | **PASS_WITH_GAPS** — 796 totais, 763 pendentes, 763 não revisados, 0 falhas técnicas | O modo estrito de publicação/revisão deve continuar falhando até decisão humana. |
| segurança de produção | **NOT_EXECUTED/FAIL-CLOSED** — configuração real, IdP/probe, origem pública, backup e digests autorizados ausentes | O bloqueio é intencional; não há autorização para inventar valores. |

### Nota sobre RLS na evidência curricular

O verificador curricular executado dentro da API com a role `cvg_app` retornou zero atribuições/estados porque a RLS filtrou corretamente uma consulta administrativa sem contexto. Isso não foi contado como falha do produto. A leitura administrativa read-only no PostgreSQL confirmou `learning_assignments=24` e `curriculum_runtime_states=24`, todos para o participante sintético autorizado, enquanto `cvg_app` permaneceu `rolsuper=false` e `rolbypassrls=false`.

## 4. Classificação oficial do AUDIT

| Artefato | Resultado vigente |
|---|---|
| 0410 — aderência ao PRD | `PARTIAL`: núcleo e recorte M02 funcionam; produto completo de 24 meses, dashboards, avaliação e jornada integral permanecem incompletos. |
| 0411 — aderência à SPEC | `PASS_WITH_GAPS`: arquitetura, contratos, PostgreSQL autoritativo, Qdrant derivado, IA assistiva e autorização têm prova local; integrações externas e operação completa não. |
| 0412 — runtime | `PASS_WITH_GAPS`: runtime local saudável e E2E real mínimo verde; produção, crash/recovery e carga de aceitação não executados. |
| 0413 — logs | `PARTIAL`: redaction/correlação local passam; retenção e backend operacional externo não. |
| 0414 — métricas | `PASS_WITH_GAPS`: métricas locais, smoke e HA passam; SLO/alertas/retensão externas não. |
| 0415 — integrações | `PASS_WITH_GAPS`: PostgreSQL/Qdrant/IA fake/edge/collector local passam; IdP, provider real e recovery externo não. |
| 0416 — integridade de dados | `PASS_WITH_GAPS`: constraints, RLS, contagens, auditoria e restore local têm prova; backup/RPO/RTO produtivos não. |
| 0417 — segurança/governança | `PARTIAL`: controles de sessão, autorização, CSRF, redaction e menor privilégio passam; identidade externa e hardening produtivo não. |
| 0418 — experiência operacional | `PARTIAL`: web focada e E2E passam; revisão manual, acessibilidade ampliada e experiência completa do PRD não. |

## 5. Matriz de notas 0–100

As notas medem a aderência/maturidade do programa inteiro no estado auditado. A média é ponderada por risco e escopo; uma nota alta em um recorte técnico não libera as dependências externas ou clínicas.

| Item analisado | Peso | Nota | Julgamento objetivo |
|---|---:|---:|---|
| 1. Documentação, gates e governança | 7% | **90** | Pipeline, gates, estado/log/backlog, política clínica, evidências e verificadores existem e passam; worktree e algumas provas externas ainda não estão fechados. |
| 2. Discovery, PRD e definição de escopo | 5% | **95** | Discovery→PRD→SPEC está aprovado, coerente e validado; a distância entre produto definido e produto entregue continua explícita. |
| 3. Currículo e conteúdo clínico | 10% | **72** | Catálogo de 24 módulos e 796 registros estão materializados; 763 itens aguardam revisão/aprovação semântica e não há prontidão clínica para coorte. |
| 4. Arquitetura e modularidade | 7% | **92** | Monorepo, limites de import, contratos, composição e fronteiras passam; superfícies completas e operação de release ainda não. |
| 5. Domínio, contratos e regras de negócio | 6% | **88** | Estados, idempotência, versionamento, projeções e autorização centrais estão fortes; ciclo educacional integral, analytics e lifecycle completo ainda faltam. |
| 6. Persistência, migrações e integridade | 7% | **90** | 16 migrações, constraints, RLS, auditoria, outbox e contagens live passam; retenção, backup/restore produtivo e grants finais não. |
| 7. API e backend funcional | 7% | **82** | Sessão, convite, jornada mínima, atividade, dashboard administrativo e health funcionam; API do produto completo e operações de ciclo de vida não. |
| 8. Segurança, identidade e privacidade | 9% | **86** | Deny-by-default, cookie seguro, CSRF, RLS, redaction, menor privilégio e scans passam; IdP/MFA/recovery reais, TLS público e escala distribuída não. |
| 9. Jornada do participante | 7% | **75** | Convite→login→atividade→resposta→submissão e próxima ação têm E2E; trilha de 24 meses, resultado completo, remediação, contestação e dashboard integral não. |
| 10. Autoria, revisão e governança clínica | 7% | **68** | Fila paginada, preflight, decisão independente e bloqueio de publicação existem; 763 itens ainda não foram revisados por aprovador humano. |
| 11. Worker, Qdrant, IA e resiliência | 6% | **88** | Worker/HA, Qdrant derivado, reconciliação e fallback local têm evidência; provider real, crash/replay operacional e escala externa não. |
| 12. Observabilidade e operação | 5% | **78** | Health, logs, métricas, collector/Tempo local, carga e restore local passam; retenção/dashboards/alertas/traces/backups externos e RPO/RTO não. |
| 13. Web, UX e acessibilidade | 4% | **78** | 15 E2E focados, axe em cenários existentes, estados públicos e telas administrativas passam; revisão manual, usuários reais e superfícies completas do PRD não. |
| 14. Testes, cobertura e evidência | 6% | **93** | `pnpm verify`, cobertura acima de 80%, E2E ativo e focado, audit de dependências e gates documentais passam; skips condicionais e cobertura funcional desigual permanecem. |
| 15. CI e reprodutibilidade | 5% | **86** | Contrato de CI, build, migrações, testes e ambiente fixado passam localmente; execução remota atual, registry, deploy/rollback autorizado e cache/soak não. |
| 16. Rastreabilidade e controle de mudanças | 2% | **65** | Manifesto, log, backlog e relatório estão conectados, mas as alterações auditadas permanecem sem commit final imutável no worktree. |

**Cálculo:** `83,24/100` → **83/100**.

## 6. Pontos fortes

- PostgreSQL permanece a fonte transacional; Qdrant é derivado e reconstruível; IA é server-side, estruturada, assistiva e desligável.
- Autorização é server-side e deny-by-default; a role transacional não tem `SUPERUSER` nem `BYPASSRLS`.
- Convites usam token hash-only e uso único; sessão usa cookie protegido; mutações passam por CSRF/origem.
- Projeções participantes/admin são separadas e os testes negativos não expõem fontes, gabaritos, rubricas, tokens, IDs internos ou dados clínicos.
- E2E ativo demonstrou browser→web→edge→API→PostgreSQL real; fixture sintética foi removida no teardown.
- O gate estrito de conteúdo continua fechado: nenhuma das 763 pendências foi promovida automaticamente.
- Testes, lint, typecheck, build, coverage, migrations, secrets, audit de dependências, arquitetura, documentação, produto e rastreabilidade passaram.

## 7. Gaps e plano de remediação

| ID | Prioridade | Gap | Critério de saída |
|---|---|---|---|
| AUD-2026-001 | P1 | Revisão clínica independente de 763 itens ainda não executada. | Fila estrita em zero pendências, decisões registradas por aprovador autorizado e preflight de publicação por item. |
| AUD-2026-002 | P1 | IdP/MFA/recovery externo, enrollment, challenge, step-up, revogação e sincronização de papéis não comprovados. | Sandbox autorizado e probe/E2E provider-mediated reais com segredo no secret manager. |
| AUD-2026-003 | P1 | Domínio/DNS/certificado público e headers/TLS externos não observados. | Origem HTTPS gerenciada, renovação e E2E público redigido em ambiente autorizado. |
| AUD-2026-004 | P1 | Traces/backups externos, retenção, criptografia, RPO/RTO e restore produtivo não comprovados. | Storage/retention/backup aprovados, drill de restore e RPO/RTO medidos. |
| AUD-2026-005 | P1 | Registry, CI remoto atual, deploy e rollback autorizados não executados nesta rodada. | Workflow remoto verde no mesmo SHA, artefatos guardados e rehearsal/deploy/rollback autorizados. |
| AUD-2026-006 | P1 | Worktree contém código/documentação não commitados. | Commit intencional com diff revisado, manifesto atualizado e reauditoria no SHA. |
| AUD-2026-007 | P1 | Produto completo de 24 meses, analytics histórico, lifecycle de usuários e fluxo educacional integral ainda não entregues. | Requisitos do PRD com E2E/API/persistência por fase, sem reduzir escopo silenciosamente. |
| AUD-2026-008 | P2 | Smoke de carga local não cobre capacidade, soak, failover e SLO de produção. | Plano de carga aprovado, critérios de erro/latência e evidência operacional persistente. |

## 8. Decisão final

**Não aprovar release, piloto ou publicação clínica.**

O sistema está tecnicamente demonstrável em desenvolvimento/ambiente local HA e pode continuar recebendo construção controlada. A transição para produção depende dos gaps P1, das decisões humanas registradas no estado do runtime e da reauditoria do mesmo artefato congelado. Nenhum dado real, prontuário, foto, PDF, segredo ou credencial foi usado ou registrado nesta auditoria.

## 8.1. Delta de execução local — 2026-08-12

Após a fotografia desta auditoria, a execução controlada do Programa Premium Enterprise 95 entregou duas tasks locais sem promover a nota oficial:

- `ENT95-00-C`: scorecard executável em `scripts/verify-premium-enterprise-scorecard.mjs`, com teste de governança e cálculo reproduzível de 16 itens/70 tasks; a baseline continua 83/100 (83,24 antes do arredondamento).
- `ENT95-07-B`: lifecycle administrativo de contas em contracts, application, persistence, API e web, com migração `0016_account_lifecycle_version.sql`, autorização por papel/escopo, proteção contra escalada para `ADMIN`, optimistic locking, auditoria redigida e revogação de sessões.

As evidências locais passaram `pnpm typecheck`, `pnpm format:check`, `pnpm verify:migrations`, 71 testes focados, E2E administrativo 4/4, `pnpm test:e2e:active-ha` 3/3 (incluindo lifecycle persistido), `pnpm ops:verify-ha`, `pnpm ops:verify-edge-security` e health live/ready do HA recriado. Este delta é evidência incremental, não uma reauditoria independente: os 763 itens clínicos, IdP/MFA/recovery, TLS público, observabilidade/backups externos, deploy/rollback, worktree imutável e demais gaps do relatório continuam impedindo nota 95, release, piloto ou publicação clínica.

Na mesma rodada, `ENT95-11-A` e `ENT95-11-B` foram verificadas contra o HA local: `tests/integration/postgres-worker.test.ts` e `tests/integration/worker-qdrant-live.test.ts` passaram 3/3 testes live, cobrindo lease expirado, retry/DLQ, replay, rebuild PostgreSQL→Qdrant, órfão, divergência, retirada e idempotência. A nota oficial do item 11 permanece 88 até reauditoria independente; provider real, carga, failover e operação externa continuam gaps.

Também foi criada a matriz canônica `PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX`: 145 RF/RNF foram listados com SPEC, task, decisão, estado e disposição de release. O gate TDD detecta omissão, drift e estado contraditório; a execução atual reporta `0/145` cadeias completas e `145` gaps explícitos de módulo/contrato/teste, portanto o item 16 continua em construção e a nota 65 não é promovida.

A frente de acessibilidade também recebeu evidência incremental: `tests/e2e/experience-accessibility.spec.ts` passou 6/6 no HA ativo, com axe sem violações nas superfícies de participante/autoria e provas de teclado, foco, labels, IDs únicos, estados de erro/vazio, viewport estreito e reflow equivalente a 200%/400%. Isso não fecha o item 13: checklist manual, cobertura de todas as jornadas P0, contraste/zoom real, motion e usuários com leitor de tela seguem pendentes.

Após esses incrementos, `pnpm audit --prod --audit-level high` não encontrou vulnerabilidades conhecidas; `pnpm test:e2e:active-ha` passou 3/3 novamente; e `pnpm verify` passou com 105 arquivos de teste, 505 testes, 18 skips condicionais, cobertura 85,32% statements / 80,55% branches / 87,13% functions / 86,11% lines, contratos 51/51 e worker 24/24. Isso reforça a evidência local, mas não muda a baseline oficial nem substitui os gates externos, clínicos, SHA e reauditoria independente.

`ENT95-06-C` recebeu prova live adicional no PostgreSQL HA: duas transições concorrentes da mesma versão produziram exatamente um sucesso e um conflito de optimistic locking, com estado final único e rollback transacional preservado. A cobertura integral de transações editoriais/educacionais e idempotência end-to-end continua pendente, portanto o item 6 não é reavaliado nesta rodada.

O escopo local foi então fechado no backlog como `ENT95-06-C COMPLETED`: a suíte PostgreSQL live passou 29/29 arquivos e 76/76 testes, incluindo workflow editorial, outbox, tentativa/resposta/correção, idempotência, RLS, rollback e corrida concorrente. A evidência fecha apenas a task local; a nota oficial do item 6 permanece 90 até reauditoria independente.

`ENT95-08-B` também foi fechada no backlog no escopo local: 48 testes focados de autorização/API, 1/1 integração PostgreSQL de isolamento com role sem `SUPERUSER/BYPASSRLS`, contexto ausente, escopo cruzado, caminho staff e projeções redigidas passaram; `pnpm verify:exposure` permaneceu verde. O item 8 continua em 86/100 até a reauditoria, pois IdP/MFA/recovery externos e outros gates permanecem abertos.

## 8.2. Atualização de evidência — matriz 12 campos e verificação 2026-08-12

O artefato `PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX` foi fortalecido para exigir, por linha, requisito, prioridade, SPEC, task, módulo, contrato, teste, decisão, estado, release, commit e artefato. RF-008 e RF-009 agora apontam para os módulos, contrato, testes e `PREMIUM-ENTERPRISE-95-AUTHORIZATION-030` existentes no worktree. O gate TDD passou 5/5 e `pnpm verify:premium-traceability` reportou `PASS_WITH_GAPS`, 145 requisitos, 0 cadeias completas e 145 gaps; a ausência de SHA final e o release bloqueado permanecem deliberados.

Após a atualização, `pnpm verify` passou com 105 arquivos/505 testes, 18 skips condicionais, cobertura 85,32% statements / 80,55% branches / 87,13% functions / 86,11% lines; contratos 51/51, worker 24/24, migrações 17/índice 16, lint, typecheck, arquitetura, documentação, definição de produto, secrets e fronteira pública passaram. O E2E HA real passou 3/3 e `pnpm audit --prod --audit-level high` não encontrou vulnerabilidades conhecidas. Esses resultados são evidência incremental no worktree local, não reauditoria independente; a nota oficial permanece 83/100.

## 8.3. Atualização de evidência — workflow editorial atômico 2026-08-12

`ENT95-10-A` foi fechada somente no escopo local verificável. O domínio/application/persistence mantém o fluxo autoria→revisão→ajuste→aprovação→autorização→publicação→retirada com versionamento, revisão independente, preflight, auditoria e outbox. A fronteira de publicação agora é fail-closed em dois níveis: exige contexto de aprovação clínica e confirma, na mesma transação, a decisão persistida `APROVAR_CLINICAMENTE` para o conteúdo, versão e revisor informados.

As provas passaram nos testes unitários de aplicação (15/15), nos workflows PostgreSQL de conteúdo/autoria e na suíte live HA (32 arquivos/79 testes); `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm verify:premium-scorecard` e `pnpm verify:premium-traceability` também passaram. O artifact `PREMIUM-ENTERPRISE-95-EDITORIAL-WORKFLOW-033` e os elos locais das linhas RF-034/RF-035/RF-036/RF-039/RF-096 foram registrados sem inventar SHA.

Esse incremento não reavalia o item 10 de 68 para outra nota: a auditoria oficial continua 83/100 (83,24 ponderado), com 8 tasks concluídas no scorecard, corpus de 763 itens pendente, release/piloto/publicação clínica bloqueados e worktree ainda sem SHA final. A evidência é local, sintética e não substitui revisão humana de Ricardo, gates externos ou reauditoria independente.

## 8.4. Atualização de evidência — matriz de invariantes críticas 2026-08-12

`ENT95-05-A` foi concluída no escopo local verificável do núcleo implementado. `packages/domain/src/invariant-catalog.ts` materializava 27 invariantes no fechamento da task; a fatia `ENT95-05-B` acrescentou quatro, totalizando 31 invariantes críticas atuais, cada uma com requisito, autoridade, código de falha, código, contrato e teste. O teste dedicado confirma caminhos existentes, rejeita duplicidade e rejeita registros sem teste. As máquinas de conteúdo, tentativa, resposta, aprendizagem e contestação, as políticas de avaliação, autorização, auditoria, privacidade, outbox, worker/Qdrant, sessão e projeções públicas estão ligadas à evidência executável.

Passaram `pnpm verify:invariants` (2/2), a suíte da fatia domínio/contratos/aplicação (46 arquivos/198 testes), `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm verify:documentation` e `pnpm verify:premium-traceability`. O artifact `PREMIUM-ENTERPRISE-95-INVARIANT-MATRIX-034` foi registrado. O resultado não significa que todas as capacidades do PRD já existam: lacunas de regras do ciclo integral, cobertura crítica e operação continuam em `ENT95-05-C` e tasks relacionadas; a nota oficial segue 83/100, sem release ou piloto.

## 8.5. Atualização de evidência — regras do ciclo educacional 2026-08-12

`ENT95-05-B` foi concluída no escopo local verificável. O domínio exige motivo explícito de pausa, preserva `pauseReason/resumeAt` e rejeita estado persistido fora da allowlist; o runtime aplica pré-requisito fail-closed e formas equivalentes distintas em D+30/D+60/D+90; a política de remediação usa reforço digital na primeira tentativa e plano individual com mentor a partir da segunda, sem punição. Appeal e withdrawal permanecem nas máquinas existentes.

O RED/GREEN passou em 7 arquivos/47 testes focados. A migration `0017_assignment_pause_context.sql` foi aplicada no PostgreSQL HA; `pnpm verify:migrations` confirmou 18 migrações/índice 17; `pnpm verify:invariants` confirmou 31 invariantes em 2/2; typecheck, lint e format check passaram. A integração live serial PostgreSQL/Qdrant passou 32 arquivos/79 testes, com 1 arquivo/2 testes condicionais pulados. O artefato `PREMIUM-ENTERPRISE-95-LEARNING-RULES-035` foi registrado em `traceability.yml`.

O scorecard reproduzível registra 10 `COMPLETED`, 38 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`; a nota ponderada permanece 83,24/100 e a baseline oficial 83/100. Esta é evidência local em worktree, não reauditoria independente: cobertura de decisão/mutation (`ENT95-05-C`), conteúdo clínico, calibração humana, corpus de 763 itens, SHA, release, piloto e gates externos continuam abertos.

## 8.6. Atualização de evidência — cobertura de decisão crítica 2026-08-12

`ENT95-05-C` foi concluída somente no escopo local verificável. A matriz `packages/domain/src/critical-decision-matrix.ts` materializa 13 casos para nota, gabarito, publicação, permissão, estado, replay idempotente e conflito de chave; a integração executa cada caso contra domínio, contratos, autorização e casos de uso reais. O caminho de publicação sem gate, a projeção de gabarito com chave interna, a permissão cross-scope, a transição ilegal e os erros de idempotência são rejeitados fail-closed.

As provas passaram em 3 arquivos/5 testes da matriz, `pnpm test:coverage` com 110 arquivos/530 testes e 18 skips condicionais, e `pnpm verify:critical-decisions`. O gate mediu branches críticos em nota 98,85%, publicação 100%, permissão 98,46%, estado 96,15%, idempotência 85%, contrato de estado 90,16% e matriz 100%; a cobertura global foi 86,40% statements, 82,35% branches, 87,30% functions e 87,18% lines. Também passaram `pnpm verify:premium-scorecard` (16 itens, 70 tasks, 11 concluídas, 37 prontas, 4 em andamento e 18 aguardando aprovação), `pnpm verify:premium-traceability` (`PASS_WITH_GAPS`, 145 requisitos, 0 cadeias completas, 145 gaps), `pnpm verify:documentation`, `pnpm verify:invariants` e `git diff --check`.

O artefato `PREMIUM-ENTERPRISE-95-DECISION-COVERAGE-036` foi registrado. A baseline oficial permanece 83/100 (83,24 ponderada antes do arredondamento), nenhum item foi reavaliado para 95 e release, piloto e publicação clínica continuam não aprovados. Mutation testing independente, idempotência persistida de todas as operações, produto integral, corpus clínico, gates externos, SHA, CI/deploy e reauditoria independente seguem gaps.

## 8.7. Atualização de evidência — drift de produto 2026-08-12

`ENT95-02-B` foi concluída somente no escopo local verificável. O bloco `scope_control` de `traceability.yml` registra dez capacidades, cinco fontes canônicas de decisão e 27 requisitos RF/RNF; `scripts/verify-scope-drift.mjs` verifica que cada capacidade possui decisão humana conhecida, requisito atual e status aprovado, e rejeita omissão, drift, duplicidade e status não aprovado.

O RED/GREEN passou em 3/3 testes TDD (`tests/integration/scope-drift-governance.test.ts`); `pnpm verify:scope-drift` passou com 10 capacidades, 26 decisões usadas e 27 requisitos. Também passaram typecheck, lint, format check e `git diff --check`; build com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182` e E2E HA real passaram, respectivamente, build dos 12 workspaces e 3/3 cenários.

O artefato `PREMIUM-ENTERPRISE-95-SCOPE-DRIFT-037` foi registrado. O scorecard continua 83/100 (83,24 ponderada), agora com 12 tasks concluídas, 3 em andamento, 37 prontas e 18 aguardando aprovação. `ENT95-02-A` permanece aberta porque a matriz de 145 requisitos ainda tem 0 cadeias completas e 145 gaps de módulo/contrato/teste, commit/SHA e release; nenhum score, release, piloto ou publicação clínica foi promovido.

## 8.8. Atualização de evidência — elos locais da matriz 2026-08-12

O gate `scripts/verify-premium-enterprise-traceability.mjs` foi endurecido para verificar a existência dos caminhos locais informados nos campos de módulo, contrato e teste, além da existência dos IDs de artefato no próprio manifesto. O teste TDD passou 6/6; `pnpm verify:premium-traceability` e `pnpm verify:traceability` passaram sem link inexistente. O resultado auditável é: 145 requisitos, 49 linhas com evidência local de módulo/contrato/teste/artefato, 43/87 RF P0/P1 com essa evidência, 0 cadeias completas e 145 gaps explícitos.

As linhas ainda não suportadas por evidência local permanecem `GAP`, e nenhuma disposição de estado, commit/SHA ou release foi inventada. A matriz continua `PASS_WITH_GAPS`; scorecard, scope drift, documentação, typecheck, lint e format check passaram. A rodada completa passou `pnpm verify` com 111 arquivos/534 testes, 16 arquivos/18 testes condicionais pulados e cobertura 86,40% statements / 82,35% branches / 87,30% functions / 87,18% lines; build dos 12 workspaces, E2E HA 3/3, audit de dependências e `git diff --check` também passaram. A baseline 83/100 (83,24 ponderada) permanece preservada. Isso melhora a auditabilidade local, mas não fecha ENT95-02-A/ENT95-16-B, não substitui o SHA congelado, revisão clínica, gates externos, piloto ou reauditoria independente.

## 9. Próxima ação obrigatória

1. Ricardo deve validar manualmente `/admin` e `/invite` com a credencial transitória, rotacioná-la e registrar o resultado.
2. Depois, escolher a próxima fatia de produto sem abrir publicação clínica: ciclo de vida de usuários ou analytics histórico.
3. Para qualquer release, fechar os gates clínicos/IdP/TLS/traces/backups/deploy e executar a reauditoria no SHA final.

## 10. Referências

- `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`;
- `docs/100_full_program_audit_2026-08-10.md` a `docs/111_current_remediation_audit_2026-08-11.md`;
- `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0020_prd_master.md`;
- `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0120_spec_master.md`;
- `BRIEFING/03.BUILD/0300_build_engineer_master.md`, `0301_roadmap.md`, `0302_backlog_master.md`, `0303_remediation_program.md`;
- `BRIEFING/04.AUDIT/0400_audit_scope.md` a `0421_remediation_plan.md` e auditorias 0497–0508;
- `traceability.yml`, `package.json`, workflow de CI, scripts de verificação e evidências do runtime ativo.

## 8.9. Atualização de evidência — inventário da API 2026-08-12

`ENT95-07-A` foi concluída no escopo local verificável. `packages/contracts/src/api-surface.ts` registra 46 rotas atualmente implementadas, cada uma ligada a método, caminho parametrizado, capability, autenticação, escopo, caso de uso, contrato de entrada e projeção de saída. A rota editorial `POST /api/v1/internal/content/:contentId/review` também foi adicionada ao template de telemetria, eliminando a classificação incorreta `unmatched`.

O RED/GREEN passou 13/13 testes focados de contrato/API/server e inventário runtime. Também passaram `pnpm --filter @cvg/contracts typecheck`, `pnpm lint`, `pnpm verify:traceability` e `pnpm verify:premium-traceability`. O artefato é `PREMIUM-ENTERPRISE-95-API-SURFACE-039`. A evidência fecha somente o inventário da superfície existente; a API do ciclo educacional integral, as capacidades ainda não implementadas, o SHA e a reauditoria independente continuam gaps. A baseline oficial permanece 83/100 (83,24 ponderada).

## 8.10. Atualização de evidência — hotspots e limites de tamanho 2026-08-12

`ENT95-04-B` foi concluída no escopo local verificável com inventário executável dos hotspots. Foram encontrados 7 arquivos de produção acima de 800 linhas: `apps/api/src/http.ts` (2625), `apps/web/app/admin/page.tsx` (1064), `apps/web/app/page.tsx` (1426), `packages/curriculum/src/catalog.ts` (1607), `packages/curriculum/src/learning-runtime.ts` (1282), `packages/persistence/src/learning-state-repository.ts` (1034) e `packages/persistence/src/schema.ts` (921). Cada hotspot possui owner, severidade, plano de decomposição, orçamento-alvo e testes de caracterização em `code-hotspot-policy.json`.

O RED/GREEN passou 2/2 em `tests/integration/code-hotspot-policy.test.ts`; `pnpm verify:hotspots`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram. O artefato `PREMIUM-ENTERPRISE-95-HOTSPOT-POLICY-040` registra a evidência. Isso fecha a classificação e a governança local, não a extração física dos módulos: os 7 planos permanecem abertos para execução incremental. A baseline oficial continua 83/100 (83,24 ponderada), sem promoção de item, release, piloto ou publicação clínica.

## 8.11. Atualização de evidência — documentos canônicos 2026-08-12

`ENT95-01-A` foi concluída no escopo local verificável. O registro `docs/canonical-document-registry.json` mantém uma única fonte `CURRENT` para programa (`BRIEFING/03.BUILD/0304...`), auditoria (`0491`), roadmap (`0492`) e backlog (`0493`), e liga `0490_audit_report.md` e `0303_remediation_program.md` a seus sucessores como históricos/substituídos. O gate também confirma que os caminhos existem e que um documento histórico contém marcador e `supersededBy`.

O RED/GREEN passou 3/3 em `tests/integration/canonical-document-governance.test.ts`; `pnpm verify:documentation`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram. O artefato `PREMIUM-ENTERPRISE-95-DOCUMENT-REGISTRY-042` registra a evidência. A governança de documentos está verificada localmente, mas não congela o worktree/SHA, não substitui reauditoria independente e não altera a baseline 83/100, release, piloto ou publicação clínica.

## 8.12. Atualização de evidência — inventário curricular 2026-08-12

`ENT95-03-A` foi concluída no escopo local verificável. `curriculum-inventory.json` versão 1 compara o `CVG-CURRICULUM-24M` versão `3.0.0` ao `createCurriculumMaterializationPlan` e confirma 24 módulos, 96 sessões e 796 registros; cada módulo declara quantidade de itens, objetivos, itens críticos, status `PROJECAO_VERIFICADA` e disposição `PILOT_BLOCKED`. A ordem de prioridade coloca os módulos com maior contagem de itens críticos primeiro (`M02`, `M12`, `M24`).

O RED/GREEN passou 2/2 em `tests/integration/curriculum-inventory-governance.test.ts`; `pnpm verify:curriculum-inventory`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram. O artefato `PREMIUM-ENTERPRISE-95-CURRICULUM-INVENTORY-043` registra a evidência. Isso fecha a reconciliação estrutural do corpus, não sua revisão/aprovação clínica: 763 itens continuam pendentes e não há promoção da baseline 83/100, release, piloto ou publicação clínica.

## 8.13. Atualização de evidência — observabilidade e alertas 2026-08-12

`ENT95-12-B` recebeu uma fatia local verificável e permanece `IN_PROGRESS`. `observability-governance.json` declara sete sinais operacionais e sete alertas com owner, escalation, runbook, acknowledgement/deduplicação e `piiSafe`; `infra/observability/prometheus-alerts.yml` mantém as expressões versionadas e redigidas; o dashboard Grafana cobre disponibilidade, p95, erros, fila, indexação, IA assistiva e experiência.

O RED/GREEN passou 2/2 em `tests/integration/observability-governance.test.ts` e 10/10 em `packages/observability/src/observability.test.ts`. O exporter Prometheus passou a publicar gauge p95 de amostras limitadas e o worker passou a contar eventos reclamados. `pnpm verify:observability-governance`, lint, typecheck e `git diff --check` passaram. Artefato: `PREMIUM-ENTERPRISE-95-OBSERVABILITY-GOVERNANCE-045`.

Resultado: `PASS_WITH_EXTERNAL_OPERATIONAL_GAPS`. A implementação local não comprova collector/backend externo, retenção efetiva, consulta ponta a ponta, acknowledgement real, baixo ruído em operação, RPO/RTO ou reauditoria. A nota oficial do item 12 permanece 78/100 e a baseline 83/100 (83,24 ponderada) não foi alterada.

## 8.14. Atualização de evidência — matriz de testes por risco 2026-08-12

`ENT95-14-A` avançou para `IN_PROGRESS` com `test-risk-matrix.json` e `scripts/verify-test-risk-matrix.mjs`. O gate deriva os 87 RF P0/P1 da matriz `PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX`, exige sucesso, erro, acesso negado e conflito e classifica as oito camadas de teste previstas.

RED/GREEN passou 2/2 em `tests/integration/test-risk-matrix-governance.test.ts`; `pnpm verify:test-risk-matrix`, lint, typecheck, formatação e `git diff --check` passaram. O relatório honesto é `PASS_WITH_GAPS`: 43/87 success, 0/87 error, 8/87 denied, 24/87 conflict e 0/87 linhas completas. Artefato: `PREMIUM-ENTERPRISE-95-TEST-RISK-MATRIX-046`.

Os 44 RF P0/P1 restantes, as tags de risco completas, commit/SHA, release e auditoria independente continuam pendentes. O item 14 mantém 93/100 e a baseline 83/100 (83,24 ponderada) não foi promovida.

## 8.15. Atualização de evidência — governança de skips e flakiness 2026-08-12

`ENT95-14-C` avançou para `IN_PROGRESS`. A policy `skip-governance.json` classifica os 16 arquivos/18 testes condicionais encontrados no código e declara as variáveis de guarda, a dependência de ambiente, a justificativa e a disposição `PILOT_BLOCKED`; o verificador falha para skip não classificado ou caminho inexistente.

RED/GREEN passou 2/2 em `tests/integration/skip-governance.test.ts`; `pnpm verify:skip-governance` reportou 0 skips inexplicados, 0 falhas flaky e 3 execuções observadas de 20. Em ambiente efêmero, `pnpm test:integration:live` passou 38/38 arquivos e 95/95 testes PostgreSQL; a variante Qdrant passou 41/41 arquivos e 98/98 testes; restore isolado passou 2/2.

O resultado é `PASS_WITH_GAPS`: 17 execuções qualificadas, CI remoto, worktree/SHA, release, operação externa e auditoria independente ainda faltam. A nota oficial do item 14 permanece 93/100 e a baseline ponderada 83,24/100 não foi alterada.

## 8.16. Verificação transversal após ENT95-14-C — 2026-08-12

`pnpm verify` passou com 119 arquivos de teste, 552 testes passantes, 18 skips condicionais e cobertura 86,63% statements / 82,61% branches / 87,34% functions / 87,39% lines. Scorecard, rastreabilidade (`145` requisitos, `0` cadeias completas e `145` gaps explícitos), matriz de risco, governança de skips, documentação, produto, secrets e exposição pública passaram em seus gates.

Build dos 12 workspaces, E2E HA 3/3 e `pnpm audit --prod --audit-level high` também passaram. A evidência live isolada PostgreSQL 95/95, PostgreSQL/Qdrant 98/98 e restore 2/2 permanece sintética/efêmera. O resultado da auditoria continua `WAITING_HUMAN_APPROVAL`: item 14 = 93/100, baseline ponderada = 83,24/100, sem release/piloto/publicação clínica.

O smoke HA `CVG_LOAD_TARGET=http://127.0.0.1:3180/health/live` passou 200/200 HTTP 200, 100% de sucesso, throughput 458,14 req/s e p95 102,37 ms; continua evidência local de smoke, não prova de saturação, soak, failover ou capacidade produtiva.

## 8.17. Atualização de evidência — evidência imutável e dados de teste 2026-08-12

`ENT95-14-D` avançou para `IN_PROGRESS`. O manifest `test-evidence-governance.json` declara três registros com vínculo de requisito/task, timestamp, ambiente, seed sintético, sanitização redigida, teardown verificado, retenção, commit e artifact; o gate verifica caminhos e comandos sem aceitar SHA/artifact inventados.

RED/GREEN passou 2/2 em `tests/integration/test-evidence-governance.test.ts`; `pnpm verify:test-evidence-governance` reportou 3 evidências sintéticas, 3 teardowns verificados, 0 registros completos e 3 gaps explícitos de worktree SHA, CI artifact e retention. O item 14 permanece 93/100; a baseline ponderada permanece 83,24/100 e a disposição continua `PILOT_BLOCKED`.

## 8.18. Atualização de evidência — decisões, riscos e mudanças 2026-08-12

`ENT95-01-C` avançou para `IN_PROGRESS`. `change-control-governance.json` mantém dois decision records, dois riscos abertos e dois change requests com owner, motivo, impacto, aceite, rollback, artifact e vínculo de sprint; os dois impactos de sprint registram baseline/weighted `83,24`, `scoreChanged: false` e `PILOT_BLOCKED`.

RED/GREEN passou 2/2 em `tests/integration/change-control-governance.test.ts`; `pnpm verify:change-control-governance` reportou 2 decisões, 2 riscos, 2 mudanças, 2 impactos e 0 alterações de score. O item 1 permanece 90/100; a baseline ponderada permanece 83,24/100 e a disposição continua `PILOT_BLOCKED`. O artefato é `PREMIUM-ENTERPRISE-95-CHANGE-CONTROL-051`.

O gate não fecha aprovação humana/independente, worktree/SHA, release, riscos externos ou reauditoria; nenhuma promoção foi inferida.

## 8.19. Verificação transversal após ENT95-01-C — 2026-08-12

`pnpm verify` passou com 121 arquivos/556 testes/18 skips condicionais e cobertura 86,63% statements / 82,61% branches / 87,34% functions / 87,39% lines. Build dos 12 workspaces, E2E HA 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` também passaram.

O item 1 permanece 90/100; item 14 permanece 93/100; baseline ponderada 83,24/100 e disposição `PILOT_BLOCKED` permanecem inalteradas. Rastreabilidade continua `0/145` cadeias completas e 145 gaps explícitos; worktree/SHA, gates externos, revisão clínica, release, piloto e reauditoria independente continuam pendentes.

## 8.20. Atualização de evidência — governança automatizada de acessibilidade 2026-08-12

`ENT95-13-B` avançou localmente. `accessibility-governance.json` registra seis evidências automatizadas PASS nas superfícies de participante/autoria e cinco gaps manuais explícitos para checklist P0, contraste, zoom/motion, leitores de tela e usuários representativos.

RED/GREEN passou 2/2 em `tests/integration/accessibility-governance.test.ts`; `pnpm verify:accessibility-governance` reportou 6/6 automatizadas, 5 gaps manuais, `PASS_WITH_GAPS` e `PILOT_BLOCKED`. O item 13 permanece 78/100; baseline 83,24/100 não foi promovida. Artefato: `PREMIUM-ENTERPRISE-95-ACCESSIBILITY-GOVERNANCE-054`.

## 8.21. Verificação transversal após ENT95-13-B — 2026-08-12

`pnpm verify` passou com 122 arquivos/558 testes/18 skips condicionais e cobertura 86,63% statements / 82,61% branches / 87,34% functions / 87,39% lines. Build dos 12 workspaces, E2E HA 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram.

O item 13 permanece 78/100; baseline ponderada 83,24/100, `PILOT_BLOCKED`, 0/145 cadeias completas e 145 gaps explícitos permanecem inalterados. Revisão manual WCAG, usuários, SHA/worktree, gates externos, release, piloto e reauditoria continuam pendentes.

## 8.22. Atualização de evidência — capacidade e escalabilidade local 2026-08-12

`ENT95-04-C` avançou para `IN_PROGRESS`. `capacity-governance.json` formaliza o smoke HA sintético 200/200 HTTP 200, concorrência 20, throughput 458,14 req/s, p95 102,37 ms e teardown verificado, sem atribuir essa prova a capacidade produtiva.

RED/GREEN passou 2/2 em `tests/integration/capacity-governance.test.ts`; `pnpm verify:capacity-governance` reportou 100% de sucesso e quatro gaps de saturação, soak, failover/recuperação e perfil/SLO aprovado. O item 4 permanece 92/100; baseline 83,24/100 e `PILOT_BLOCKED` não foram promovidos. Artefato: `PREMIUM-ENTERPRISE-95-CAPACITY-GOVERNANCE-056`.

## 8.23. Verificação transversal após ENT95-04-C — 2026-08-12

`pnpm verify` passou com 123 arquivos/560 testes/18 skips condicionais e cobertura 86,63% statements / 82,61% branches / 87,34% functions / 87,39% lines. Build dos 12 workspaces, E2E HA 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram.

O item 4 permanece 92/100; baseline ponderada 83,24/100, `PILOT_BLOCKED`, 0/145 cadeias completas e 145 gaps explícitos permanecem inalterados. Saturação/soak/failover, revisão manual WCAG, SHA/worktree, gates externos, release, piloto e reauditoria continuam pendentes.

## 8.24. Evidência exploratória de carga e failover — 2026-08-12

`ENT95-04-C` registra três cargas HA locais sintéticas — 200/20, 1.000/50 e 5.000/100 — com 100% HTTP 200; os p95 foram 91,41 ms, 115,47 ms e 160,80 ms. Durante a parada controlada de `api-a`, 1.000/50 também passou 100% HTTP 200, e a réplica foi restaurada saudável.

O verificador passou 3/3 no teste focal e reporta 3 execuções escalonadas, failover 100% e `soakStatus=NOT_EXECUTED`. Isso é evidência exploratória local, não aceitação enterprise: o item 4 continua 92/100, baseline 83,24/100, quatro gaps explícitos, `PILOT_BLOCKED`, sem promoção de score ou SLO produtivo. Artefato: `PREMIUM-ENTERPRISE-95-CAPACITY-EXPLORATION-058`.

## 8.25. Verificação transversal final após ENT95-04-C — 2026-08-12

`pnpm verify` passou com 123 arquivos/561 testes/18 skips condicionais e cobertura 86,63% statements / 82,61% branches / 87,34% functions / 87,39% lines. Build dos 12 workspaces, E2E HA 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram.

O item 4 permanece 92/100; scorecard 83,24/100, 1/16 itens no alvo, `PILOT_BLOCKED`, 0/145 cadeias completas e 145 gaps explícitos continuam inalterados. Soak, SLO/perfil aprovado, revisão clínica, SHA/worktree, gates externos, release, piloto e reauditoria continuam pendentes.
