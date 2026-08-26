# CVG Trainee Vet — State of the Art Master Plan

**Data da revisão:** 2026-08-26
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

### Evidência de 2026-08-26

- Código e E2E real verificados no commit `16caccc82ffc519b60a68e1a02850d40909737e1`; o hardening local de
  privilégios foi fechado no commit técnico `36088ff`; branch `main` está à
  frente de `origin/main`; não houve push ou deploy.
- `npm exec --package=node@22.22.0 --package=pnpm@10.33.0 -- pnpm verify` passou:
  141 arquivos, 714 testes PASS, 29 arquivos/38 testes SKIPPED, cobertura de
  84,36% statements, 80,30% branches, 86,35% functions e 85,05% lines;
  contratos 86/86, worker 27/27, migrations 51/51 e gates estáticos PASS.
- `OPS-061-GRANTS-001` agora mantém uma allowlist imutável de 29 tabelas para
  `app`, exclui `knowledge_documents`, revoga ACL atual/default de `app` e
  `PUBLIC` e verifica a matriz no source, no SQL gerado e no cenário live
  disponível quando houver banco autorizado. A evidência está em
  `BRIEFING/04.AUDIT/0542_application_role_privilege_matrix_audit.md`.
- A crítica independente pós-build identificou uma nova fatia bounded de
  assurance (`OPS-061-GRANTS-002`): o provisionamento ainda precisa eliminar
  URL/senha de `argv`, fechar ACL de database/schema/functions e defaults,
  qualificar o schema, usar transação, verificar grantability/identidade e
  declarar todas as variáveis do contrato CI. Esta fatia não altera produto,
  migrations aplicadas ou ambiente produtivo.
- `OPS-061-GRANTS-002` foi implementado no commit `36088ff` e auditado em
  `BRIEFING/04.AUDIT/0543_application_grant_provisioning_hardening_audit.md`:
  `psql` não recebe URL/senha em `argv`, o ambiente é allowlist, arquivos são
  temporários `0600`, o SQL é transacional e o contrato CI valida roles/banco.
- Em banco PostgreSQL 16.15 novo e descartável, com migrations 51/51, roles
  separadas e o provisionador atual, `pnpm test:integration:live` passou 35
  arquivos/82 testes; a consulta administrativa confirmou ACL efetiva,
  grantability, ownership e healthcheck least privilege. Isso prova o recorte
  live local de RLS, ACL, trigger/CAS, rollback, isolamento contextual e
  concorrência adaptativa; não prova produção ou o fluxo
  diagnóstico→assignment.
- No mesmo SHA `16caccc82ffc519b60a68e1a02850d40909737e1`, o E2E real serial
  passou `34/34` (`32` cenários sintéticos + `2` reais), incluindo build dos
  12 workspaces. O slice real observou browser→web/proxy→API→PostgreSQL,
  health `READY`/PostgreSQL `UP`, request IDs, nova sessão com tentativa v3,
  oracle administrativo de persistência e cleanup com zero artefatos mutáveis;
  a evidência está em `BRIEFING/04.AUDIT/0541_real_browser_api_postgres_e2e.md`.
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
| P1 | Least privilege, owners e grants do ambiente produtivo ainda não foram provados; a matriz e o provisionamento do harness local foram verificados, mas produção continua sem evidência | `scripts/provision-ci-postgres.mjs`, auditorias 0540/0542/0543, crítica independente, live PostgreSQL 16.15 | matriz produtiva e revisão operacional com autoridade própria |
| P1 | Diagnóstico → assignment → atividade → próxima ação ainda não possui jornada completa de participante diagnosticando no browser | auditoria independente; fixtures reais ainda bypassam diagnóstico | `JOURNEY-056`, depois de segurança e contratos estabilizados |
| P1 | Feedback pode chegar a `AGUARDA_USUARIO`, mas não existe conversa/reply bounded | PRD RF-103/RF-104, UC-022/023, domínio e web atuais | `FEEDBACK-057`, após `FEEDBACK-055`; sem SLA/notificação nesta fase |
| P1 | Retenção possui sinal/CTA incompleto e cadência ainda precisa decisão de equivalência | backlog e resolver de jornada | `RETENTION-058`, após decisão de produto/PRD |
| P1 | Facilitador/preceptor e coordenação ainda não formam experiência completa | superfícies internas parciais | `STAFF-059`, analytics agregados e privacy-by-design |
| P1 | Autoria após `AJUSTES_SOLICITADOS` carece de edição/resubmissão consumível | state machine existe; UI/contrato incompletos | `AUTHORING-060`, mantendo four-eyes e gate clínico |
| P1 | Assurance operacional externa, same-SHA CI, carga, failover, restore e collector não têm evidência atual | auditorias 0505/0508 e estado canônico | `OPS-061`, dependente de ambiente/autoridade |
| P2 | A matriz negativa por tabela foi verificada no PostgreSQL descartável; produção, remote same-SHA e operação externa continuam sem prova | `tests/integration/postgres-rls-function-privileges.test.ts`, auditoria 0543, live 35/82 | manter evidência local e abrir apenas a revisão operacional autorizada |
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

- `FEEDBACK-055` + `LIVE-056`: separar leitura/criação do participante de
  escritas staff, provar isolamento contextual em PostgreSQL descartável e
  preservar transação, CAS, histórico, auditoria e bindings adaptativos.
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
  health e graceful shutdown; `OPS-061-GRANTS-001` fecha a matriz local de
  privilégios do harness; `OPS-061-GRANTS-002` fecha o provisionamento e o
  contrato local, sem encerrar a revisão produtiva.
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
5. `LIVE-056` foi executado em banco local descartável; repetir somente para
   ambiente produtivo/remote quando houver autoridade e critérios explícitos.
6. A extensão browser→web→API→PostgreSQL de `LIVE-056` foi executada no mesmo
   SHA, com oracle de persistência e cleanup verificável; ainda não cobre
   diagnóstico→assignment nem cenário browser cross-scope.
7. Fechar jornada de participante, depois feedback/retenção, autoria, staff,
   learning intelligence, IA/RAG e hardening operacional.

Cada migration é nova, revisável e forward-only; rollback de código prefere
reversão da fatia bounded autorizada ou correção forward. Dados de produção
nunca são resetados. Uma task só vira DONE com evidência atual, auditoria,
traceability, backlog, log, runtime state e diff coerentes.

## 9. Primeiro incremento autorizado — encerrado com gaps

`FEEDBACK-055` foi implementado e ampliado com `LIVE-056` porque a crítica
independente encontrou uma possibilidade de escrita direta do participante em
`feedback_tickets`, além de lacunas de contexto nas projeções participant-only
e de integridade em bindings adaptativos. As migrations 0048–0050 e o runner
live fecharam o recorte técnico local. O incremento não adicionou resposta,
SLA, notificação, anexos, publicação clínica, provider, MFA, produção ou
atribuição arbitrária a terceiro. A próxima fatia autorizada é `JOURNEY-056` ou
`FEEDBACK-057`, com os gates humanos e operacionais mantidos. Antes do BUILD,
`JOURNEY-056` exige decisão entre sessão diagnóstica pública própria
(recomendada) e atividade especial; `FEEDBACK-057` ainda exige contrato próprio
para resposta/resolução. Nenhuma dessas fatias foi iniciada nesta rodada.

Como extensão de `LIVE-056`, o commit `16caccc82ffc519b60a68e1a02850d40909737e1`
agora tem evidência local do participante atravessando browser, web/proxy, API
e PostgreSQL real, com request IDs, nova sessão, oracle de persistência e
cleanup verificável. A fixture pré-provisiona o assignment; por isso o gap
diagnóstico→assignment e os gates de produção/operacional/clínico permanecem
abertos.
