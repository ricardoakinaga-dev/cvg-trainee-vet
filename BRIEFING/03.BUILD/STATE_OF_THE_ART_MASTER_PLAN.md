# CVG Trainee Vet — State of the Art Master Plan

**Data da revisão:** 2026-08-25
**Estado:** plano vivo de evolução incremental
**Fonte de verdade do produto:** `BRIEFING/09.PROJETO_CVG_TREINAMENTO`
**Control plane:** `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md` e `traceability.yml`

## 1. Objetivo e limites

Evoluir o CVG Trainee Vet existente para uma plataforma de desenvolvimento
clínico digital contínuo, confiável, segura, auditável, acessível e preparada
para aprendizagem adaptativa e IA assistiva.

Este plano preserva o monorepo, o modular monolith com worker, TypeScript
strict, PostgreSQL, Drizzle, Qdrant derivado, outbox, RLS, contratos strict,
TDD e os gates clínicos humanos. Não autoriza rewrite, microserviços,
publicação clínica, piloto, produção, fornecedor, credencial externa ou
declaração de competência prática.

O plano organiza a evolução; não transforma documentação ou testes sintéticos
em evidência de runtime produtivo.

## 2. Estado atual observado

### Evidência de 2026-08-25

- HEAD local: `29e990b0df33daf6fc3dfc24413f13cb2aaf9610`; worktree limpo; branch
  `main` está à frente de `origin/main`; não houve push ou deploy.
- `npm exec --package=node@22.22.0 --package=pnpm@10.33.0 -- pnpm verify` passou:
  141 arquivos, 695 testes PASS, 35 SKIPPED, cobertura de 84,36% statements,
  80,36% branches, 86,39% functions e 85,05% lines; contratos 86/86,
  worker 27/27, migrations 42/42 e gates estáticos PASS.
- `pnpm test:integration:live` não pôde iniciar sem
  `CVG_TEST_DATABASE_URL`; não há claim live de PostgreSQL, RLS, grants,
  trigger, concorrência ou browser→API→PostgreSQL.
- Conteúdo clínico e B-07/M02 continuam sujeitos a revisão e aprovação humana;
  nenhum código, seed, teste ou interface usa dado clínico real, prontuário,
  tutor, foto, PDF de terceiro ou segredo.

### Arquitetura real

| Camada | Estado observado | Regra preservada |
| --- | --- | --- |
| Web | Next.js 16, participante, autoria, operações e recuperação; projeções separadas | web não autoriza nem acessa banco |
| API | HTTP `/api/v1`, casos de uso e políticas server-side | entrada strict, deny-by-default e erros públicos |
| Worker | outbox, lease/fencing, retry, dead letter lógico e reconciliação | efeitos derivados idempotentes; PostgreSQL continua autoridade |
| Domínio | estados de conta, currículo, assignments, assessment, feedback e appeals | sem ORM, SDK ou infraestrutura |
| Persistência | PostgreSQL/Drizzle, migrations, constraints, auditoria e RLS | RLS é defesa adicional; conexão produtiva não é prova live nesta sessão |
| Integrações | Qdrant e IA por adapters/fake | Qdrant é reconstruível; IA é assistiva, server-side e desligável |
| Qualidade | typecheck, lint, cobertura, contratos, worker, migrations, exposição, arquitetura e CI contract | gates obrigatórios não são substituídos por score |

## 3. Gaps priorizados

| Prioridade | Gap | Evidência atual | Tratamento |
| --- | --- | --- | --- |
| P0 | Contexto de participante ainda herda `FOR ALL` em `feedback_tickets`; update/delete direto pode escapar da trilha/auditoria da aplicação | `0010_classy_kronos.sql`, `0041_feedback_triage_metadata.sql`, `learning-state-repository.ts` | `FEEDBACK-055`, correção imediata com RED, migration nova e prova live quando autorizada |
| P0 | RLS, grants, owners, trigger, CAS e rollback das migrations recentes sem prova no banco descartável | `CVG-TEST-DB-REMOTE-001` | preparar harness; executar somente com URLs/autoridade explícitas |
| P1 | Diagnóstico → assignment → atividade → próxima ação ainda não possui jornada completa de participante diagnosticando no browser | auditoria independente; fixtures reais ainda bypassam diagnóstico | `JOURNEY-056`, depois de segurança e contratos estabilizados |
| P1 | Feedback pode chegar a `AGUARDA_USUARIO`, mas não existe conversa/reply bounded | PRD RF-103/RF-104, UC-022/023, domínio e web atuais | `FEEDBACK-057`, após `FEEDBACK-055`; sem SLA/notificação nesta fase |
| P1 | Retenção possui sinal/CTA incompleto e cadência ainda precisa decisão de equivalência | backlog e resolver de jornada | `RETENTION-058`, após decisão de produto/PRD |
| P1 | Facilitador/preceptor e coordenação ainda não formam experiência completa | superfícies internas parciais | `STAFF-059`, analytics agregados e privacy-by-design |
| P1 | Autoria após `AJUSTES_SOLICITADOS` carece de edição/resubmissão consumível | state machine existe; UI/contrato incompletos | `AUTHORING-060`, mantendo four-eyes e gate clínico |
| P1 | Assurance operacional externa, same-SHA CI, carga, failover, restore e collector não têm evidência atual | auditorias 0505/0508 e estado canônico | `OPS-061`, dependente de ambiente/autoridade |
| P2 | Tutor/RAG/evals, notificações e busca podem evoluir sobre contratos aprovados | adapters existem; experiência completa não existe | `AI-062`, somente depois da fundação educacional |

## 4. Arquitetura alvo incremental

```text
Participante
  -> diagnóstico formativo
  -> assignment determinístico e escopado
  -> atividade publicada/versionada
  -> tentativa e feedback
  -> remediação / retrieval / retenção
  -> próxima ação server-side explicável

Autor
  -> rascunho
  -> revisão clínica independente
  -> aprovação humana
  -> publicação versionada
  -> monitoramento / validade / retirada

Facilitador/Coordenação
  -> acompanhamento individual autorizado
  -> analytics agregados
  -> feedback e remediação sem ranking punitivo

Operação
  -> health / readiness / outbox / worker / Qdrant / IA redigidos
  -> logs, métricas, traces, alertas, backup/restore e rollback
```

As decisões de estado, nota, gabarito, publicação, papel, competência prática
e autonomia clínica permanecem no domínio, aplicação, PostgreSQL e autoridades
humanas apropriadas. IA e Qdrant nunca assumem essas decisões.

## 5. Fases, epics e tasks

### Phase 0 — Baseline e continuidade

- `BASELINE-000`: congelar Quality Bar QB-01…QB-11, ambiente, worktree,
  comandos e gaps; manter estado/log/backlog/manifesto recuperáveis.
- `PLAN-001`: manter este plano alinhado ao código e ao control plane.
- Aceite: `verify`, `git diff --check`, rastreabilidade e status atualizados;
  checks indisponíveis aparecem como BLOCKED/NOT RUN, nunca PASS.

### Phase 1 — Segurança e integridade do núcleo

- `FEEDBACK-055`: separar leitura/criação do participante de escritas staff em
  feedback; impedir update/delete de participante; manter transação, CAS,
  histórico e auditoria de status/metadata.
- `LIVE-056`: aplicar migrations em banco descartável autorizado; provar role
  `NOSUPERUSER/NOBYPASSRLS`, ACL, RLS, trigger, rollback e disputa CAS.
- `IDENTITY-057`: continuar hardening de sessões, capability e escopo apenas
  com regressão da matriz de autorização.
- Aceite: nenhum write de participante contorna governança; staff autorizado
  mantém o fluxo; testes negativos e positivos cobrem as duas fronteiras.

### Phase 2 — Jornada do participante

- `JOURNEY-056`: fechar diagnóstico formativo sintético → assignment
  server-side → atividade publicada → tentativa → feedback → próxima ação.
- `FEEDBACK-057`: resposta/reply bounded, plain text, owner/scope scoped,
  sem anexos, SLA, notificação ou conteúdo clínico novo.
- `RETENTION-058`: tornar revisão consumível somente após resolver a cadência
  e os critérios de equivalência no PRD/SPEC.
- Aceite: browser, API e PostgreSQL real atravessam a jornada quando o ambiente
  estiver autorizado; histórico não é reescrito e digital não vira competência.

### Phase 3 — Autoria e governança clínica

- `AUTHORING-060`: biblioteca, edição, preview, comentários, ajustes,
  resubmissão, versionamento, validade e retirada sem apagar histórico.
- `CLINICAL-061`: B-07/M02 somente após conteúdo autoral, pré-voo, revisão e
  decisão registrada de Ricardo; não criar guideline ou protocolo clínico por
  inferência.
- Aceite: autor não aprova o próprio conteúdo quando a policy exigir; publicação
  é humana, auditável e não abre claims de autonomia prática.

### Phase 4 — Facilitador e coordenação

- `STAFF-059`: acompanhamento por escopo, filas de atenção, feedback e
  remediação; perfis individuais somente com autorização.
- `ANALYTICS-063`: métricas agregadas de participação, retenção, mastery e
  efetividade, sem leaderboard público ou tracker invasivo.
- Aceite: papéis, escopo, privacy e agregação são testados no servidor e na UI.

### Phase 5 — Learning intelligence

- `MASTERY-064`: mastery cognitivo determinístico, explicável e separado de
  competência clínica prática.
- `RETRIEVAL-065`: prática de recuperação, confiança não oficial e
  remediação por erro/instabilidade.
- `ADAPTIVE-066`: `NextBestLearningActionService` determinístico com
  reasonCode, prioridade, pré-requisitos e due reviews.
- Aceite: regras puras, fixtures sintéticas, clock injetável e cobertura de
  decisões críticas; IA não é a lógica única.

### Phase 6 — IA, RAG e busca interna

- `AI-062`: provider abstraction, timeout, retry, abort, quota, fake CI,
  structured output e desligamento seguro.
- `RAG-067`: somente conteúdo publicado/válido indexado; metadata filtrada
  server-side; citações correspondem ao contexto recuperado.
- `EVALS-068`: groundedness, citation, injection, PII leakage, safety e
  formato em dataset sintético determinístico.
- Aceite: conteúdo recuperado é dado, não instrução; IA nunca publica nem
  altera estado, nota, papel ou decisão clínica.

### Phase 7 — Operação e prontidão de release

- `OPS-061`: logs JSON redigidos, métricas, traces, alerts, SLOs, runbooks,
  health e graceful shutdown.
- `RECOVERY-069`: backup, restore, RPO/RTO, failover e rollback em ambiente
  descartável.
- `CI-070`: workflow same-SHA, artefatos, SBOM, dependency/security gates e
  browser/API/DB E2E.
- Aceite: evidência externa reproduzível; nenhuma operação produtiva sem
  autorização explícita.

## 6. Barra de qualidade e evidência

| ID | Target required | Evidência |
| --- | --- | --- |
| QB-01 | jornadas verticais funcionam no boundary público | E2E e request/response/persistência real |
| QB-02 | assignment/adaptive é determinístico, idempotente e escopado | unit/application/contract/integration/live |
| QB-03 | deny-by-default e isolamento por ator/recurso/ação | matriz negativa + RLS com role sem bypass |
| QB-04 | transações, constraints, CAS, outbox e recovery preservam invariantes | migration, rollback, concorrência e restore |
| QB-05 | digital não declara competência prática; publicação é humana | contratos, preflight e decisão humana |
| QB-06 | projeções strict, redigidas e acessíveis | exposure scan, browser, axe, keyboard e revisão visual |
| QB-07 | falhas são observáveis e operáveis | health, logs, metrics, traces, alerts e runbooks |
| QB-08 | build e release são reproduzíveis no mesmo SHA | CI remoto, artefatos, audit, coverage e traceability |
| QB-09 | conteúdo clínico passa gate humano item a item | revisão, pré-voo, protocolo e decisão registrada |
| QB-10 | continuidade canônica é recuperável | state/log/backlog/plan/manifesto coerentes |
| QB-11 | IA/Qdrant são derivados, assistivos e desligáveis | adapters, worker, evals e exposure tests |

Falha em segurança, corretude, integridade, clínica ou dados bloqueia o
resultado independentemente da cobertura ou de qualquer score médio.

## 7. Dependências, riscos e boundaries humanos

- `FEEDBACK-055` é predecessor de novas escritas de feedback e deve preservar
  o contrato público participante.
- `LIVE-056`, `OPS-061`, `RECOVERY-069` e `CI-070` exigem ambiente descartável,
  credenciais/URLs ou autoridade externa; preparar código/runbook é permitido,
  executar produção ou remoto não é inferido.
- `CLINICAL-061` e qualquer B-07/M02 publication/piloto exigem revisão e
  decisão humana de Ricardo.
- A cadência de retenção e qualquer regra de atribuição que altere produto
  exigem decisão explícita se não estiverem já fechadas em PRD/SPEC.
- Dados, secrets, PDFs, fotos, prontuários e fontes de terceiros não entram no
  repositório, fixtures, logs, prompts, UI ou seeds.

## 8. Ordem de execução e rollback

1. Reconciliar control plane e baseline.
2. Corrigir a fronteira de escrita `FEEDBACK-055` com RED → GREEN → REFACTOR.
3. Rodar regressão estática/local e registrar o gap live sem mascará-lo.
4. Obter crítica independente e corrigir o maior gap restante.
5. Executar `LIVE-056` somente quando o ambiente autorizado existir.
6. Fechar jornada de participante, depois feedback/retenção, autoria, staff,
   learning intelligence, IA/RAG e hardening operacional.

Cada migration é nova, revisável e forward-only; rollback de código prefere
reversão da fatia bounded autorizada ou correção forward. Dados de produção
nunca são resetados. Uma task só vira DONE com evidência atual, auditoria,
traceability, backlog, log, runtime state e diff coerentes.

## 9. Primeiro incremento autorizado

`FEEDBACK-055` será implementado agora porque a crítica independente encontrou
uma possibilidade de escrita direta do participante em `feedback_tickets`, com
risco de contornar histórico/auditoria. O incremento não adicionará resposta,
SLA, notificação, anexos, publicação clínica, provider, MFA, produção ou
atribuição arbitrária a terceiro.
