# 0492 — Roadmap Premium Enterprise para 95/100 por item

> **Roadmap da trilha de maturidade:** os marcos `ENT95-*` permanecem válidos; o sequenciamento executivo corrente e os achados pós-S4-173 estão em `0514_dual_95_roadmap.md`.

- program_id: CVG-PREMIUM-ENTERPRISE-95
- status: IN_PROGRESS
- baseline_report: 0491_full_construction_audit.md
- baseline_date: 2026-08-11
- baseline_score: 83/100
- target: todos os 16 itens >=95/100
- horizon: 14 sprints de duas semanas, mais uma janela sem mudança planejada

## 1. Controle de versão do roadmap

Esta edição substitui integralmente o roadmap anterior de score 95, que usava baselines históricas e aceitava 95 em recortes com gaps materiais. A única baseline válida é a auditoria atual `0491_full_construction_audit.md`: **83/100**, com notas entre 65 e 95.

O roadmap é um plano para atingir a meta; ele não altera a nota atual. Somente uma nova auditoria independente pode reavaliar os itens.

## 2. Regras de execução

1. Todos os itens precisam atingir 95; a média global não compensa item abaixo do piso.
2. Trabalho técnico e revisão clínica operam em paralelo, respeitando dependências reais.
3. Cada sprint limita WIP a duas fatias funcionais técnicas por equipe, além da esteira clínica.
4. Cada fatia é vertical: regra, contrato, persistência, API, web, teste, observabilidade e documentação quando aplicáveis.
5. TDD é obrigatório; teste vermelho deve preceder implementação.
6. Nenhuma evidência sem SHA imutável entra no gate final.
7. Nenhum conteúdo clínico entra em release sem preflight e decisão humana registrada de Ricardo.
8. Falta de IdP, TLS, storage, backup ou ambiente autorizado mantém o respectivo gate fechado; valores não são inventados.
9. Dados e evidências permanecem sintéticos até piloto formalmente autorizado.
10. Toda regressão reabre o item e atualiza estado, log, backlog e traceability.

## 3. Matriz de chegada a 95

| ID | Baseline | Resultado necessário para propor 95 | Evidência mínima | Fase principal |
|---|---:|---|---|---|
| ENT95-01 | 90 | corpus canônico sem divergência, gates automáticos e decisões vigentes | verificador documental, review de diff e auditoria de consistência | E0/E6 |
| ENT95-02 | 95 | manter 100% do escopo aprovado rastreado, sem invenção ou redução silenciosa | matriz RF/RNF → SPEC → entrega, decision log e teste de drift | todas |
| ENT95-03 | 72 | 24 módulos/96 sessões completos e todo o corpus liberável revisado/aprovado | inventário, fila estrita em zero, preflight e amostra funcional por módulo | E3 |
| ENT95-04 | 92 | fronteiras e capacidade comprovadas para a superfície completa | ADRs, gate de dependências, testes de arquitetura e perfil de carga | E1/E5 |
| ENT95-05 | 88 | invariantes do ciclo educacional integral executáveis e completas | matriz de invariantes, testes de estado/propriedade e decisão crítica | E1/E2 |
| ENT95-06 | 90 | integridade, RLS, retenção, anonimização e recovery comprovados | migrations, testes live/concorrência, restore e lifecycle de dados | E1/E4 |
| ENT95-07 | 82 | API P0/P1 completa, versionada, paginada, idempotente e autorizada | OpenAPI/contratos, testes de contrato/live/E2E e perfil de latência | E2 |
| ENT95-08 | 86 | IdP/MFA/recovery reais, menor privilégio e privacidade operacionais | E2E provider-mediated, threat model, RLS, SAST/DAST e pentest focal | E1/E5 |
| ENT95-09 | 75 | jornada integral do diagnóstico à retenção sem intervenção manual indevida | E2E real, interrupção/retomada, remediação, recurso e histórico | E2/E5 |
| ENT95-10 | 68 | autoria/revisão/correção/recurso/publicação completos e corpus aprovado | fila zerada, trilha de decisão, retirada/recalculo/notificação testados | E3 |
| ENT95-11 | 88 | crash/replay/rebuild/fallback comprovados sob concorrência | chaos focal, worker live, reconstrução Qdrant e provider fallback | E4 |
| ENT95-12 | 78 | telemetria externa, alertas, retenção, DR e SLO comprovados | dashboards, incident drill, soak, backup/restore e RPO/RTO medidos | E4/E5 |
| ENT95-13 | 78 | superfícies completas, WCAG 2.2 AA e validação humana representativa | axe + auditoria manual + teclado/screen reader + teste de usabilidade | E2/E5 |
| ENT95-14 | 93 | evidência funcional equilibrada, >=90% global e decisões críticas completas | unit/integration/contract/worker/web/E2E/security, sem skip inexplicado | todas/E5 |
| ENT95-15 | 86 | CI remoto no SHA, supply chain, deploy progressivo e rollback ensaiados | run remoto, SBOM, provenance, assinatura/digest e rehearsal | E1/E6 |
| ENT95-16 | 65 | worktree limpo, cadeia de mudança integral e release reproduzível | commits intencionais, manifest, traceability 100% e reauditoria no SHA | E0/E6 |

## 4. Dependências e caminho crítico

```text
E0 baseline/equipe/decisões
 ├── E1 arquitetura + dados + IAM + CI
 │    ├── E2 produto/jornada/API/web
 │    │    └── E5 UX, segurança, performance e qualidade
 │    └── E4 worker/Qdrant/IA + observabilidade/DR
 └── E3 fábrica clínica (paralela, 13–20 semanas)
              └── E6 rehearsal/piloto/re-auditoria
```

O caminho crítico termina quando os três ramos convergem:

- produto P0/P1 integral e endurecido;
- corpus liberável com zero pendência clínica;
- integrações externas e operação com evidência.

## 5. Calendário de referência

As datas abaixo valem se `D-ENT-01` aprovar T0 em **2026-08-17**. Caso contrário, todos os intervalos deslocam sem comprimir gates. A pausa de 2026-12-21 a 2027-01-01 é janela sem mudança planejada, usada apenas para monitoramento e incidentes.

| Sprint | Datas | Fase | Objetivo dominante | Itens |
|---|---|---|---|---|
| S0 | 17–28 ago 2026 | E0 | mobilização, baseline, branch/SHA, decisões e lote clínico piloto | 01, 02, 03, 10, 16 |
| S1 | 31 ago–11 set | E1/E3 | arquitetura, invariantes, CI remoto, inventário e primeiro lote | 03, 04, 05, 10, 15, 16 |
| S2 | 14–25 set | E1/E3 | RLS/lifecycle de dados, IdP sandbox, contratos e segundo lote | 03, 05, 06, 08, 10 |
| S3 | 28 set–9 out | E2/E3 | mapa API P0/P1, lifecycle de conta e design system | 03, 07, 08, 10, 13 |
| S4 | 12–23 out | E2/E3 | diagnóstico completo, trilha/pré-requisitos e retomada | 03, 07, 09, 10, 13 |
| S5 | 26 out–6 nov | E2/E3 | avaliação, correção, resultado, recurso e remediação | 03, 05, 07, 09, 10 |
| S6 | 9–20 nov | E2/E3 | retenção, analytics, painéis e E2E da jornada integral | 03, 07, 09, 10, 13 |
| S7 | 23 nov–4 dez | E4/E3 | worker crash/replay, reconstrução Qdrant e telemetria externa | 03, 10, 11, 12 |
| S8 | 7–18 dez | E4/E3 | provider IA/fallback, alertas, backup externo e restore | 03, 10, 11, 12 |
| freeze | 21 dez–1 jan | operação | sem mudança planejada; monitoramento e triagem | 12 |
| S9 | 4–15 jan 2027 | E3/E4 | fechar corpus, retirada/recalculo e DR completo | 03, 06, 10, 12 |
| S10 | 18–29 jan | E5 | auditoria WCAG/manual, UX com usuários e segurança ofensiva focal | 08, 09, 13, 14 |
| S11 | 1–12 fev | E5 | carga, soak, failover, chaos e elevação de cobertura | 04, 11, 12, 14 |
| S12 | 15–26 fev | E5 | UAT, correção de gaps, release candidate e pre-audit | todos |
| S13 | 1–12 mar | E6 | rehearsal, piloto operacional controlado e auditoria final independente | todos |

## 6. Fases, entregáveis e gates

### E0 — Mobilização e baseline congelada

**Objetivo:** transformar o worktree atual em uma unidade de execução governada.

Entregas:

- aprovação de equipe, T0, RACI e cadência;
- revisão do diff existente e separação de commits intencionais;
- baseline 83 ligada ao SHA e ambiente atuais;
- matriz de 16 itens e backlog detalhado priorizado;
- decisões D-ENT-01–07 abertas com owner e prazo;
- lote clínico de calibração com 25 itens;
- testes documentais que rejeitam baseline divergente e backlog incompleto.

Gate de saída:

- `pnpm verify` e gates documentais verdes;
- worktree planejado sem alteração desconhecida;
- backlog pronto para S1;
- nenhuma nota alterada.

### E1 — Fundação enterprise

**Objetivo:** remover fragilidade estrutural antes de ampliar superfícies.

Entregas:

- ADRs de identidade, deploy, observabilidade e backup;
- matriz integral de invariantes e requisitos P0/P1;
- lifecycle de dados, RLS, retenção, anonimização e grants finais;
- adapter de IdP comprovado em sandbox autorizado;
- CI remoto por PR com gates, artefatos e ambiente reproduzível;
- traceability por task/commit;
- fábrica clínica calibrada e em cadência.

Gate de saída:

- nenhum boundary violation;
- testes de isolamento e concorrência passam com role sem privilégio amplo;
- MFA/recovery têm prova no sandbox ou o programa registra bloqueio externo real;
- score checkpoint identifica candidatos, mas não declara 95.

### E2 — Produto e jornada integral

**Objetivo:** entregar todas as capacidades P0/P1 do fluxo educacional definido.

Entregas:

- lifecycle administrativo completo de usuário e sessão;
- diagnóstico B-07, perfil por tema e trilha personalizada;
- 24 módulos, pré-requisitos, afastamento/acomodação e próxima ação;
- quiz, caso digital, prova, resposta aberta, correção e resultado;
- remediação, nova tentativa, retenção D+30/D+60/D+90 e retomada;
- contestação, revisor independente, recálculo e notificação interna;
- painéis participante/moderador/admin e feedback de produto;
- contratos/API versionados, paginação, idempotência e autorização contextual;
- E2E browser→web→edge→API→PostgreSQL para jornadas críticas.

Gate de saída:

- 100% dos RF P0/P1 da fase têm evidência;
- nenhuma tela administrativa é alcançável por papel indevido;
- interrupção não perde resposta;
- nenhuma simulação altera competência prática;
- testes funcionais, de segurança e acessibilidade da fase passam.

### E3 — Fábrica de conteúdo e governança clínica

**Objetivo:** converter 763 pendências em conteúdo liberável ou rejeitado de forma auditável.

Pipeline por item:

```text
inventário → validação estrutural → pré-revisão clínica →
ajuste autoral → decisão independente de Ricardo → preflight →
elegível para publicação → amostragem pós-publicação
```

Entregas:

- inventário de 796 registros e classificação por módulo/tipo/risco;
- lote de calibração e manual de revisão;
- revisão dos 763 pendentes em lotes de 40–60 decisões/semana;
- gabarito/rubrica testados, feedback, fonte/versão interna, data de corte e próxima revisão;
- B-07 com 120 itens e blueprint validado;
- retirada emergencial, itens afetados, recálculo e histórico;
- fila estrita em zero para todo o corpus do release.

Gate de saída:

- zero item em `PROJECAO_VERIFICADA` no corpus pretendido para release;
- zero item publicado automaticamente;
- 100% das decisões têm aprovador autorizado, data, versão e justificativa;
- nenhuma fonte, gabarito, rubrica ou metadado interno é projetado ao participante;
- amostra funcional de cada módulo passa.

### E4 — Resiliência, observabilidade e recuperação

**Objetivo:** provar que falhas não corrompem o núcleo nem ficam silenciosas.

Entregas:

- worker com lease, retry, dead-letter, replay e idempotência sob crash;
- Qdrant reconstruível a partir de PostgreSQL, com divergência e órfãos reconciliados;
- provider real de IA, se habilitado, somente assistivo e com timeout/circuit breaker/fallback; se desabilitado, prova de zero chamada externa;
- logs/traces/métricas externos, redigidos e correlacionados;
- dashboards e alertas por SLO;
- backup criptografado, restore isolado e drills de incidente;
- RPO <=1h e RTO <=4h medidos no ambiente-alvo.

Gate de saída:

- crash/restart/replay não duplica efeito;
- indisponibilidade de IA/Qdrant degrada de forma segura;
- incidentes simulados disparam alerta e runbook correto;
- restore recupera estado sintético verificável dentro dos limites.

### E5 — Experiência, segurança e hardening

**Objetivo:** fechar os gaps que somente aparecem na superfície completa.

Entregas:

- design system consistente para estados loading/empty/error/stale/offline;
- auditoria WCAG 2.2 AA automatizada e manual;
- teclado, foco, zoom, contraste, screen reader e reduced motion;
- testes com participantes/admin/moderador representativos e dispositivos-alvo;
- threat model atualizado, SAST, DAST, dependency/secret scan e pentest focal;
- carga de aceitação, soak, failover e chaos controlado;
- cobertura >=90% global e 100% nas decisões críticas;
- correção de todos os P0/P1 encontrados.

Gate de saída:

- zero finding crítico/alto aberto;
- zero violação WCAG A/AA nas jornadas críticas;
- SLOs passam no perfil aprovado;
- UAT registra aceite ou correção de cada achado material.

### E6 — Release candidate, piloto operacional e reauditoria

**Objetivo:** provar o sistema como uma unidade imutável.

Entregas:

- release candidate versionado, SBOM, provenance, assinatura/digest e manifest;
- CI remoto verde no mesmo SHA;
- deploy progressivo e rollback ensaiados no ambiente autorizado;
- piloto operacional controlado com dados autorizados e sem ampliar escopo;
- evidência final consolidada;
- auditoria independente dos 16 itens.

Gate de saída:

- G0–G8 verdes;
- worktree limpo e SHA congelado;
- cada item ENT95-01–ENT95-16 reavaliado em >=95;
- go/no-go humano registrado;
- qualquer item <95 devolve o programa ao backlog, sem arredondamento ou exceção silenciosa.

## 7. Marcos de controle

| Marco | Momento | Decisão | Evidência obrigatória |
|---|---|---|---|
| M0 — plano aprovado | fim S0 | iniciar construção enterprise | equipe, T0, backlog, riscos e decisões |
| M1 — fundação aceita | fim S2 | ampliar superfície P0/P1 | arquitetura, RLS/dados, IAM sandbox e CI |
| M2 — jornada completa | fim S6 | entrar em hardening funcional | matriz RF, contratos e E2E integral |
| M3 — corpus liberável | fim S9 | congelar conteúdo do RC | fila estrita zero e aprovações humanas |
| M4 — operação aceita | fim S10 | executar não funcionais finais | alertas, DR, RPO/RTO e runbooks |
| M5 — release candidate | fim S12 | autorizar rehearsal/piloto | UAT, segurança, a11y, carga e CI |
| M6 — score gate | fim S13 | go/no-go de release | auditoria independente, 16 itens >=95 |

Nenhum marco intermediário altera a nota oficial. Ele apenas autoriza a próxima fase.

## 8. Projeção de cobertura por marco

| Item | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|
| ENT95-01 | candidato | manter | manter | manter | fechar | auditar |
| ENT95-02 | manter | manter | manter | manter | fechar | auditar |
| ENT95-03 | em execução | em execução | candidato | manter | fechar | auditar |
| ENT95-04 | candidato | manter | manter | validar carga | fechar | auditar |
| ENT95-05 | candidato | candidato | manter | manter | fechar | auditar |
| ENT95-06 | parcial | candidato | manter | validar DR | fechar | auditar |
| ENT95-07 | parcial | candidato | manter | manter | fechar | auditar |
| ENT95-08 | parcial | parcial | manter | validar externo | candidato | auditar |
| ENT95-09 | parcial | candidato | manter | manter | candidato | auditar |
| ENT95-10 | em execução | em execução | candidato | manter | fechar | auditar |
| ENT95-11 | planejado | parcial | manter | candidato | fechar | auditar |
| ENT95-12 | parcial | parcial | manter | candidato | candidato | auditar |
| ENT95-13 | parcial | candidato | manter | manter | candidato | auditar |
| ENT95-14 | manter | manter | manter | manter | candidato | auditar |
| ENT95-15 | candidato | manter | manter | manter | candidato | auditar |
| ENT95-16 | parcial | manter | manter | manter | candidato | auditar |

`candidato` significa pronto para evidência/revisão, nunca nota 95 concedida.

## 9. Métricas de controle do roadmap

Atualizadas a cada sprint:

- tasks concluídas/planejadas e lead time por frente;
- RF P0/P1 com cobertura completa/total;
- itens clínicos pendentes, aprovados, rejeitados e em rework;
- taxa de retrabalho clínico e throughput semanal;
- defeitos P0/P1 abertos, idade e escape rate;
- cobertura por tipo e por decisão crítica;
- flakiness e skips condicionais;
- findings de segurança e acessibilidade por severidade;
- p95/p99, erro, disponibilidade e backlog do worker;
- sucesso de backup/restore e RPO/RTO medidos;
- CI remoto, tempo de pipeline e reprodutibilidade do artefato;
- completude de traceability e estado do worktree.

Métricas educacionais de piloto — conclusão, lacunas por objetivo, remediação e retenção — são interpretadas como sinais de aprendizagem digital. Não autorizam competência prática, ranking ou punição.

## 10. Política de atraso e mudança

- atraso de uma task crítica por mais de 3 dias aciona replanejamento do sprint;
- throughput clínico abaixo de 40/semana por duas semanas aciona recalibração do marco M3;
- decisão externa vencida mantém o gate como `WAITING_HUMAN_APPROVAL` e desloca o caminho dependente;
- finding P0 interrompe a frente afetada, aciona security/clinical review e impede release;
- mudança de escopo exige impacto em prazo, risco, teste, documentação e score antes da aprovação;
- prazo nunca é recuperado removendo teste, revisão clínica, segurança, acessibilidade ou recovery.

## 11. Handoff para execução

A execução começa por `ENT95-00-A` no backlog `0493_score_95_backlog.md`, depois da aprovação de `D-ENT-01`. As tasks externas podem permanecer `WAITING_HUMAN_APPROVAL`; tarefas locais independentes seguem em `READY_FOR_NEXT_STEP` sem fingir o fechamento dos gates externos.

## 12. Checkpoint de execução local — 2026-08-12

O roadmap já possui evidência executada para `ENT95-00-C` e `ENT95-07-B`: scorecard reproduzível sem alteração da baseline, lifecycle de contas com migração 0016 e prova browser→web→edge→API→PostgreSQL em E2E HA real 3/3. O checkpoint não fecha G0–G9 nem reavalia os 16 itens; as tasks externas e a reauditoria independente permanecem no caminho crítico.

O mesmo checkpoint fechou `ENT95-11-A` e `ENT95-11-B` no escopo local: 3/3 testes live verificaram lease/retry/DLQ/replay do outbox e reconstrução/reconciliação idempotente do índice derivado PostgreSQL→Qdrant. `ENT95-11-C/D`, observabilidade externa, DR produtivo e carga/failover continuam abertos.

O trabalho de `ENT95-02-A/B` e `ENT95-16-B` também começou com uma matriz estrutural de 145 RF/RNF e gate TDD de drift. A evidência é `PASS_WITH_GAPS` (`0` cadeias completas, `145` gaps explícitos), então o roadmap não considera a rastreabilidade fechada nem altera o item 16.

`ENT95-13-B` também entrou em execução local controlada: o E2E de acessibilidade no HA passou 6/6, incluindo axe nas superfícies de participante/autoria, teclado, foco, estados de erro/vazio, viewport estreito e reflow equivalente a 200%/400%. O roadmap mantém a task aberta até a checklist manual de todas as jornadas P0, contraste/zoom real, motion e leitores de tela.

O gate transversal da rodada permaneceu verde: auditoria de dependências sem vulnerabilidades conhecidas, E2E HA real 3/3 e `pnpm verify` com 105 arquivos/505 testes, 18 skips condicionais e cobertura global 85,32% statements / 80,55% branches / 87,13% functions / 86,11% lines. Esses resultados não alteram a baseline 83/100 nem autorizam release.

`ENT95-06-C` foi concluída no escopo local: a suíte PostgreSQL live passou 29/29 arquivos e 76/76 testes, cobrindo corrida otimista, rollback, tentativa/resposta/correção, idempotência e workflow editorial com outbox redigido. O artefato `PREMIUM-ENTERPRISE-95-CONCURRENCY-028` foi registrado; a baseline e a nota do item 6 só mudam após reauditoria independente.

`ENT95-08-B` foi concluída no escopo local: autorização/API passou 48 testes focados e isolamento PostgreSQL passou 1/1 no HA com `SUPERUSER/BYPASSRLS` negado, ausência de contexto, escopo cruzado e projeções sem internals. O artefato `PREMIUM-ENTERPRISE-95-AUTHORIZATION-030` foi registrado; a task 08-A e os gates externos de identidade permanecem separados.

O checkpoint de rastreabilidade foi fortalecido: cada uma das 145 linhas da `PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX` agora possui 12 campos, incluindo commit e artefato; RF-008/RF-009 possuem links locais verificáveis e os demais gaps continuam explícitos. `pnpm verify:premium-traceability` passou com `0/145` cadeias completas e `145` gaps, preservando o bloqueio de SHA/release. A verificação transversal mais recente passou `pnpm verify` (105 arquivos/505 testes; cobertura 85,32%/80,55%/87,13%/86,11%), E2E HA 3/3 e audit de dependências sem vulnerabilidades; nenhuma nota foi promovida.

`ENT95-10-A` foi concluída no escopo local: os testes de aplicação passaram 15/15 e a suíte live HA passou 32 arquivos/79 testes, confirmando workflow editorial, aprovação clínica persistida, versionamento, outbox e retirada. O artefato `PREMIUM-ENTERPRISE-95-EDITORIAL-WORKFLOW-033` foi registrado e RF-034/RF-035/RF-036/RF-039/RF-096 receberam elos locais na matriz. O roadmap mantém `ENT95-10-B–E` abertas, não altera a nota 68 do item 10, não promove a baseline 83,24/100 e aponta `ENT95-05-A` como próxima fatia local; gates clínicos/externos, SHA e reauditoria seguem obrigatórios.

`ENT95-05-A` foi então concluída no escopo local: o catálogo `PREMIUM-ENTERPRISE-95-INVARIANT-MATRIX-034` registra 24 invariantes críticas com autoridade, erro, contrato e teste, e a prova dedicada passou 2/2, junto de 46 arquivos/198 testes de domínio, contratos e aplicação. O roadmap mantém as regras ainda não implementadas nas tasks 05-B/05-C e relacionadas, não promove a nota 88 do item 5 nem a baseline 83,24/100, e preserva os gates clínicos, externos, SHA e reauditoria.

## 13. Checkpoint ENT95-05-B — regras do ciclo educacional — 2026-08-12

`ENT95-05-B` foi concluída no escopo local verificável: pré-requisito fail-closed; pausa por afastamento/acomodação/janela operacional com `pauseReason/resumeAt` persistidos; formas equivalentes distintas em D+30/D+60/D+90; remediação digital na primeira tentativa e plano individual com mentor a partir da segunda, sem punição; appeal e withdrawal preservados nas máquinas existentes.

O RED/GREEN passou em 7 arquivos/47 testes focados. A migration `0017_assignment_pause_context.sql` foi aplicada no HA, o gate de migrações confirmou 18/índice 17, o catálogo de invariantes passou 2/2 com 31 registros e a integração serial PostgreSQL/Qdrant passou 32 arquivos/79 testes, com 1 arquivo/2 testes condicionais pulados. O artefato `PREMIUM-ENTERPRISE-95-LEARNING-RULES-035` foi registrado; scorecard: 10 `COMPLETED`, 38 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`, baseline 83,24/100 sem promoção.

O roadmap mantém `ENT95-05-C` aberta para cobertura de decisão/mutation e preserva como bloqueios a matriz de 145 requisitos com 0 cadeias completas/145 gaps, calibração e aprovação clínica, corpus de 763 itens, gates externos, SHA, release, piloto e reauditoria independente.

## 14. Checkpoint ENT95-05-C — cobertura de decisão crítica — 2026-08-12

`ENT95-05-C` foi concluída localmente com uma matriz imutável de 13 casos para as cinco decisões críticas do item: nota, gabarito, publicação, permissão e estado; os dois casos adicionais do estado exercitam replay idempotente e conflito de chave. A prova de integração executa os casos contra as regras reais, e o gate de cobertura exige branches mínimos por módulo antes de passar.

Evidências: 3 arquivos/5 testes focados da matriz passaram; `pnpm test:coverage` passou 110 arquivos/530 testes, 16 arquivos/18 testes condicionais pulados, 86,40% statements, 82,35% branches, 87,30% functions e 87,18% lines; `pnpm verify:critical-decisions` passou. O artefato é `PREMIUM-ENTERPRISE-95-DECISION-COVERAGE-036`. Scorecard: 83,24/100, 11 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`.

O checkpoint fecha a cobertura de decisão local prevista para a task, sem conceder nota ou release. Mutation testing independente, idempotência persistida integral, API/E2E completo, revisão clínica/calibração dos 763 itens, matriz de rastreabilidade (0/145 cadeias completas e 145 gaps), gates externos, SHA, piloto e reauditoria independente continuam no caminho crítico. A próxima fatia local é `ENT95-02-A/B`, mantendo `ENT95-13-B` e `ENT95-16-B` em andamento.

## 15. Checkpoint ENT95-02-B — teste de drift de produto — 2026-08-12

`ENT95-02-B` foi concluída localmente com catálogo explícito de dez capacidades, cinco fontes canônicas de decisão e 27 requisitos RF/RNF. O gate `pnpm verify:scope-drift` bloqueia capacidade sem decisão, decisão/requisito inexistente, capacidade duplicada e status fora de `APPROVED_BASELINE`; os testes TDD cobrem omissão, drift e duplicidade em 3/3 casos.

O artefato é `PREMIUM-ENTERPRISE-95-SCOPE-DRIFT-037`. Scorecard: 83,24/100, 12 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`. A task `ENT95-02-A` continua no caminho local para completar os elos de módulo/contrato/teste da matriz de 145 requisitos; SHA, release, gates externos, revisão clínica, piloto e reauditoria continuam bloqueados.

## 16. Checkpoint ENT95-02-A — elos locais verificáveis — 2026-08-12

O trabalho local de `ENT95-02-A` avançou sem alterar a baseline. O verificador premium passou a conferir a existência dos caminhos referenciados em módulo/contrato/teste e dos IDs de artefato; a suíte TDD de rastreabilidade passou 6/6. O gate transversal reporta 145 RF/RNF estruturalmente presentes, 49 linhas com evidência local de módulo/contrato/teste/artefato e 43/87 RF P0/P1 com essa evidência.

O resultado permanece `PASS_WITH_GAPS`, com `0/145` cadeias completas, porque commit/SHA e release elegível continuam deliberadamente abertos. As 44 linhas P0/P1 restantes sem evidência local continuam classificadas como gap e não foram preenchidas por inferência. Também passaram `pnpm verify:traceability`, `pnpm verify:scope-drift`, `pnpm verify:premium-scorecard`, `pnpm verify:documentation`, `pnpm typecheck`, `pnpm lint` e `pnpm format:check`; a rodada completa `pnpm verify` passou 111 arquivos/534 testes, 16 arquivos/18 testes condicionais pulados, cobertura 86,40%/82,35%/87,30%/87,18%, build dos 12 workspaces e E2E HA 3/3. A próxima fatia local é revisar somente requisitos com artefato/código/teste já existente; qualquer fechamento de SHA, release ou nota depende das aprovações previstas.

## 17. Checkpoint ENT95-07-A — inventário da API — 2026-08-12

`ENT95-07-A` foi concluída no escopo local: `API_SURFACE` enumera 46 rotas existentes e registra método, caminho parametrizado, capability, autenticação, escopo, caso de uso, contrato de entrada e resposta. A prova de integração materializa cada parâmetro e confirma que `routeTemplate` não deixa nenhuma rota inventariada como `unmatched`; a rota editorial de revisão foi corrigida no mesmo slice.

O RED/GREEN passou 13/13 testes focados. O artefato `PREMIUM-ENTERPRISE-95-API-SURFACE-039` foi registrado; typecheck do pacote de contratos, lint e gates de rastreabilidade passaram. Scorecard local: 14 tasks `COMPLETED`, 35 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`, baseline 83,24/100 sem promoção. A task não fecha as operações ainda faltantes do ciclo educacional integral nem os gates de produto, clínicos, SHA, release e reauditoria.

## 18. Checkpoint ENT95-04-B — hotspots e limites de tamanho — 2026-08-12

`ENT95-04-B` foi concluída como inventário e governança local. O policy executável classifica 7 arquivos de produção acima de 800 linhas, com owner, severidade, plano, orçamento-alvo e testes de caracterização; o gate não permite hotspot crítico sem plano ou teste referenciado ausente. RED/GREEN passou 2/2, e `pnpm verify:hotspots`, formatação, lint, typecheck e `git diff --check` passaram.

O artefato `PREMIUM-ENTERPRISE-95-HOTSPOT-POLICY-040` foi registrado. Scorecard local: 16 tasks `COMPLETED`, 33 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`, baseline 83,24/100 sem promoção. A decomposição física dos 7 módulos segue como plano incremental; capacidade, failover, gates externos, SHA, release, piloto e reauditoria continuam no caminho crítico.

## 19. Checkpoint ENT95-01-A — documentos canônicos — 2026-08-12

`ENT95-01-A` foi concluída localmente com `docs/canonical-document-registry.json`: programa `0304`, auditoria `0491`, roadmap `0492` e backlog `0493` são as únicas fontes `CURRENT` de seus papéis; `0490` e `0303` estão ligados como histórico/substituído. O gate valida caminhos existentes, papéis únicos, status válidos e sucessores/marcadores para documentos não vigentes.

RED/GREEN passou 3/3 em `tests/integration/canonical-document-governance.test.ts`; documentação, formatação, lint, typecheck e `git diff --check` passaram. O artefato é `PREMIUM-ENTERPRISE-95-DOCUMENT-REGISTRY-042`. Scorecard local: 17 tasks `COMPLETED`, 32 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`, baseline 83,24/100 sem promoção. SHA, release, gates externos, revisão clínica, piloto e reauditoria permanecem abertos.

## 20. Checkpoint ENT95-03-A — inventário curricular — 2026-08-12

`ENT95-03-A` foi concluída localmente. O inventário versionado confirma 24 módulos, 96 sessões e 796 registros do currículo `CVG-CURRICULUM-24M` versão `3.0.0`, com objetivos, criticidade por módulo e ordem de risco; toda a disposição permanece `PILOT_BLOCKED`.

RED/GREEN passou 2/2 em `tests/integration/curriculum-inventory-governance.test.ts`; `pnpm verify:curriculum-inventory`, formatação, lint, typecheck e `git diff --check` passaram. O artefato é `PREMIUM-ENTERPRISE-95-CURRICULUM-INVENTORY-043`. Scorecard local: 18 tasks `COMPLETED`, 31 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`, baseline 83,24/100 sem promoção. A task não fecha revisão clínica, publicação, `ENT95-03-B/C/D`, SHA, release, piloto ou reauditoria.

## 21. Checkpoint ENT95-12-B — observabilidade e alertas — 2026-08-12

`ENT95-12-B` entrou em `IN_PROGRESS` com uma fatia local executável. A policy `observability-governance.json` mapeia sete sinais a sete alertas, painéis Grafana, owners, escalation, runbooks, acknowledgement/deduplicação e redaction; as regras Prometheus estão versionadas em `infra/observability/prometheus-alerts.yml`. O exporter expõe p95 derivado de amostras limitadas e o worker registra eventos reclamados.

RED/GREEN passou 2/2 em `tests/integration/observability-governance.test.ts` e 10/10 em `packages/observability/src/observability.test.ts`; o gate dedicado, lint, typecheck e `git diff --check` passaram. Artefato: `PREMIUM-ENTERPRISE-95-OBSERVABILITY-GOVERNANCE-045`.

O checkpoint não promove item 12: collector/backend externo, retenção efetiva, acknowledgement produtivo, baixo ruído medido, falha sintética em ambiente autorizado, D-ENT-04, SHA, release, piloto e reauditoria continuam pendentes. O scorecard passa a registrar 18 `COMPLETED`, 30 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`; baseline 83,24/100 permanece.

## 22. Checkpoint ENT95-14-A — matriz de testes por risco — 2026-08-12

`ENT95-14-A` entrou em `IN_PROGRESS` com `test-risk-matrix.json`, que exige quatro provas por RF P0/P1 — sucesso, erro, acesso negado e conflito — e oito camadas de teste. O verificador deriva 87 RF P0/P1 da matriz canônica e reports gaps sem converter a existência de um arquivo de teste em cobertura completa.

RED/GREEN passou 2/2 em `tests/integration/test-risk-matrix-governance.test.ts`; `pnpm verify:test-risk-matrix`, lint, typecheck, formatação e `git diff --check` passaram. Artefato: `PREMIUM-ENTERPRISE-95-TEST-RISK-MATRIX-046`. Resultado: `PASS_WITH_GAPS`, 43/87 success, 0/87 error, 8/87 denied, 24/87 conflict e 0/87 linhas completas.

O checkpoint mantém explícitos os 44 RF P0/P1 sem evidência local suficiente, as tags de risco, SHA, release, gates externos, piloto e reauditoria. Scorecard: 18 `COMPLETED`, 27 `READY_FOR_NEXT_STEP`, 7 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; baseline 83,24/100 permanece.

## 23. Checkpoint ENT95-14-C — governança de skips e flakiness — 2026-08-12

`ENT95-14-C` avançou para `IN_PROGRESS`. `skip-governance.json` e `scripts/verify-skip-governance.mjs` materializam a política de 20 execuções, limite flaky inferior a 1%, 16 arquivos/18 testes guardados e bloqueio de skip inexplicado.

RED/GREEN passou 2/2; o gate reporta `PASS_WITH_GAPS`, 0 skips inexplicados, 0 flaky failures e 3 execuções qualificadas. As suítes live isoladas passaram PostgreSQL 38/38 arquivos e 95/95 testes, PostgreSQL/Qdrant 41/41 e restore 2/2, sempre com dados sintéticos.

O scorecard local passa a registrar 18 `COMPLETED`, 28 `READY_FOR_NEXT_STEP`, 6 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`, sem promoção da baseline 83,24/100. Faltam 17 execuções qualificadas, CI remoto, SHA, release, gates externos e reauditoria independente.

## 24. Verificação transversal do checkpoint 047 — 2026-08-12

Após `ENT95-14-C`, `pnpm verify` passou com 119 arquivos/552 testes/18 skips condicionais e cobertura 86,63%/82,61%/87,34%/87,39%. Build dos 12 workspaces, E2E HA 3/3 e audit de dependências sem vulnerabilidades conhecidas passaram; as suítes live efêmeras PostgreSQL, Qdrant e restore também estão registradas.

O roadmap conserva `PASS_WITH_GAPS` nos controles locais, scorecard 83,24/100 e disposição `PILOT_BLOCKED`. Os gates externos, clínicos, remotos, SHA/worktree, release e reauditoria independente continuam obrigatórios antes de qualquer score final.

## 25. Checkpoint ENT95-14-D — evidência imutável e dados de teste — 2026-08-12

`ENT95-14-D` avançou para `IN_PROGRESS`. O manifest executável exige campos de requisito/task, artifact ID, comando, timestamp, ambiente, seed, `syntheticData`, sanitização, teardown, retention, commit e paths; o verificador mantém gaps explícitos quando SHA, artifact ou retention ainda dependem de CI/commit.

RED/GREEN passou 2/2; o gate reporta `PASS_WITH_GAPS`, 3 evidências sintéticas, 3 teardowns verificados, 0 completas e 3 gaps. Scorecard: 18 `COMPLETED`, 27 `READY_FOR_NEXT_STEP`, 7 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; baseline 83,24/100 sem promoção.

## 26. Checkpoint ENT95-01-C — decisões, riscos e mudanças — 2026-08-12

`ENT95-01-C` avançou para `IN_PROGRESS`. `change-control-governance.json` versiona decisões, riscos, change requests e score impact por sprint; o gate exige owner, motivo, impacto, aceite, rollback, artifact e aprovação explícita para qualquer mudança de score.

RED/GREEN passou 2/2; `pnpm verify:change-control-governance` reportou 2 decisões, 2 riscos abertos, 2 change requests, 2 impactos de sprint e 0 mudanças de score. O resultado é `PASS_WITH_GAPS`, baseline 83,24/100 e `PILOT_BLOCKED`. Scorecard: 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`.

## 27. Verificação transversal após ENT95-01-C — 2026-08-12

`pnpm verify` passou com 121 arquivos/556 testes/18 skips condicionais e cobertura 86,63%/82,61%/87,34%/87,39%. Build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram. O roadmap conserva baseline 83,24/100, 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`; SHA, gates externos, release, piloto e reauditoria continuam obrigatórios.

## 28. Checkpoint ENT95-13-B — governança automatizada de acessibilidade — 2026-08-12

`ENT95-13-B` avançou localmente com `accessibility-governance.json`: seis critérios automatizados, duas superfícies, cinco gaps manuais e disposição `PILOT_BLOCKED`. RED/GREEN passou 2/2; `pnpm verify:accessibility-governance` reportou 6/6 PASS automatizadas, 5 gaps manuais e `PASS_WITH_GAPS`. A task permanece `IN_PROGRESS` até revisão manual, screen reader e usuários autorizados; baseline 83,24/100 sem promoção.

## 29. Verificação transversal após ENT95-13-B — 2026-08-12

`pnpm verify` passou com 122 arquivos/558 testes/18 skips condicionais e cobertura 86,63%/82,61%/87,34%/87,39%. Build dos 12 workspaces, E2E HA real 3/3 e audit de dependências sem vulnerabilidades conhecidas passaram. O roadmap conserva 83,24/100, 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`; os 5 gaps manuais, SHA, gates externos, release e reauditoria continuam obrigatórios.

## 30. Checkpoint ENT95-04-C — capacidade e escalabilidade local — 2026-08-12

`ENT95-04-C` avançou para `IN_PROGRESS` com o smoke HA sintético 200/200 HTTP 200, concorrência 20, 458,14 req/s e p95 102,37 ms. RED/GREEN passou 2/2; `pnpm verify:capacity-governance` reportou `PASS_WITH_GAPS`, quatro gaps de saturação/soak/failover/perfil-SLO e `PILOT_BLOCKED`. Scorecard: 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; baseline 83,24/100 sem promoção.

## 31. Verificação transversal após ENT95-04-C — 2026-08-12

`pnpm verify` passou com 123 arquivos/560 testes/18 skips condicionais e cobertura 86,63%/82,61%/87,34%/87,39%. Build dos 12 workspaces, E2E HA real 3/3 e audit de dependências sem vulnerabilidades conhecidas passaram. O roadmap conserva 83,24/100, 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`; capacidade enterprise, gaps manuais, SHA, gates externos, release e reauditoria continuam obrigatórios.

## 32. Evidência exploratória de capacidade — 2026-08-12

`ENT95-04-C` adicionou três cargas escalonadas locais com 100% HTTP 200 e failover controlado com `api-a` parado/restaurado, também com 100% HTTP 200. O gate passou 3/3 no teste focal, conserva quatro gaps e `soakStatus=NOT_EXECUTED`; a baseline 83,24/100 e `PILOT_BLOCKED` não mudam. Artefato: `PREMIUM-ENTERPRISE-95-CAPACITY-EXPLORATION-058`.

## 33. Verificação transversal final — 2026-08-12

`pnpm verify` passou com 123 arquivos/561 testes/18 skips condicionais e cobertura 86,63%/82,61%/87,34%/87,39%; build dos 12 workspaces, E2E HA 3/3, audit de dependências e `git diff --check` também passaram. O roadmap conserva 83,24/100, 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`, 0/145 cadeias completas e `PILOT_BLOCKED`; soak, SLO, gates externos, SHA, release e reauditoria continuam obrigatórios.

## 34. Roadmap suplementar dos itens abaixo de 80 — 2026-08-12

O roadmap executivo `0510_sub80_to_95_roadmap.md` filtra este documento para os itens 3/9/10/12/13/16, preserva os IDs do backlog 0493 e organiza 29 tasks em 13 janelas S0–S12/24 semanas e 10 gates. O manifesto `sub80-to-95-program.json` e seu teste TDD passaram 5/5.

O recorte não substitui este roadmap canônico, não altera nenhuma nota e não autoriza release. Seu alvo é cada um dos seis itens em 95 por reauditoria independente; matematicamente, isso projetaria 92,54 global se os demais itens permanecessem na baseline.
