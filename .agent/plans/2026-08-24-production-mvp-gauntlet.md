# CVG production-candidate MVP — ExecPlan

## Purpose / Big Picture

Levar o CVG de uma fundação digital localmente verificada para um candidato a
MVP operacional, fechando as lacunas aprovadas no PRD/SPEC e mantendo explícitos
os gates que dependem de ambiente, autoridade operacional ou revisão clínica.
O resultado observável é uma jornada coerente de convite → diagnóstico
formativo → trilha derivada → estudo → avaliação → remediação/retensão →
reflexão/feedback, com operação interna segura, rastreabilidade e evidência
reproduzível. “100%” só será declarado se cada critério obrigatório tiver
evidência atual e autoridade compatível; completar o código local não equivale
a aprovação clínica, piloto ou release produtivo.

## Progress

- [x] (2026-08-24T00:00:00-03:00) Recuperar `AGENTS.md`, `apps/web/AGENTS.md`,
  `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`,
  `docs/30_backlog_master.md`, briefing, código, testes, Git e pesquisa.
- [x] (2026-08-24T00:00:00-03:00) Confirmar que o HEAD local era `9a2e07a`, o
  worktree estava limpo, `origin/main` estava 39 commits atrás e a pesquisa oficial
  foi revalidada em 2026-08-24.
- [x] (2026-08-24T04:15:00-03:00) Reconciliar `runtime_state`, backlog, log,
  manifesto e este plano com o HEAD real; congelar a Quality Bar `QB-01` a
  `QB-11`. A evidência local fresca em `9a2e07a` passou com cobertura
  84,50%/80,34%/85,91%/85,24%, 123 arquivos/560 testes, 28 testes skipped,
  contratos 70/70, worker 25/25, migrações 26/26 e gates estáticos limpos.
- [x] (2026-08-24T04:49:39-03:00) Fechar a primeira lacuna local prioritária:
  diagnóstico formativo → atribuição server-side da trilha, sem dispensa
  automática de conteúdo obrigatório ou claim clínico. `ADAPTIVE-044` passou por
  RED/GREEN, testes de aplicação/contrato/persistência/API, cobertura, build,
  E2E, gates estáticos e auditoria; o live PostgreSQL/RLS ficou explicitamente
  skipped sem ambiente.
- [x] (2026-08-24T05:17:52-03:00) Fechar `JOURNEY-045`: adicionar uma CTA
  client-side somente para o `nextActionTarget` calculado pelo servidor,
  atualizar o deep link codificado e preservar sessão/estado de tentativa.
  RED E2E, contrato relacional, aplicação/API, cobertura, build, integração
  configurada e 24/24 E2E passaram; live RLS e a relação real
  assignment→atividade continuam gaps.
- [x] (2026-08-24T05:39:00-03:00) Fechar `RESULT-FEEDBACK-046`: consultar a
  correção digital persistida na web, exibir score/outcome/feedback e a
  próxima ação server-side, e representar `not_found` como espera bounded.
  O RED dos dois novos cenários foi observado antes do cartão; GREEN focal,
  build web, lint/typecheck, cobertura e 13/13 E2E da superfície participante
  passaram. O endpoint e o contrato público existentes foram preservados.
- [x] (2026-08-24T06:04:35-03:00) Fechar localmente `JOURNEY-REL-001`: ligar
  atribuição adaptativa a atividades publicadas apenas por `moduleId` explícito,
  persistir provenance e reparar vínculo legado sem alterar progresso. RED/GREEN
  focal, migration 0026, typecheck de persistence/curriculum, seed M02, build,
  E2E e regressão completa passaram; o código está no commit
  `9b1b975d62760142238b6b19f03e207181f59a87`, e a prova live permanece skipped
  sem banco.
- [x] (2026-08-24T06:19:23-03:00) Fechar o commit documental de
  `JOURNEY-REL-001` (`2972fa0b64023551a5aaacd668b3c1ae5176409d`) e executar o
  gate release de rastreabilidade em worktree limpo; o gate passou. A próxima
  ação é preparar a prova live de RLS/rollback/concorrência.
- [x] (2026-08-24T06:38:13-03:00) Fechar o código de `JOURNEY-REL-002` no
  commit `73649cba9da168babb06a87c46cc8bd6bb580408`: sincronizar somente
  provenance explícita publicada, preservar legado/retirada e impedir downgrade
  de progresso por allowlist de estados predecessores. `pnpm verify` passou com
  125/575/31 skips e cobertura 84,50%/80,35%/85,95%/85,23%; build 12
  workspaces, E2E 26/26, integração 8/20 com 27/31 skips e audit high também
  passaram.
- [x] (2026-08-24T06:41:52-03:00) Fechar a documentação de `JOURNEY-REL-002`
  no commit `e3acb37f6b6998564eb86dba2a6e82cb1486c9ed` e executar
  `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` em worktree limpo;
  o gate passou. A próxima ação é a prova live de RLS/rollback/concorrência.
- [x] (2026-08-24T07:10:00-03:00) Fechar o hardening live/CI no commit
  `5bfa530710171cf1299e8e60d4645796b3886465`: PostgreSQL efêmero passou
  31 arquivos/48 testes com app `NOSUPERUSER/NOBYPASSRLS` e fixture admin
  separada; o vínculo publicado com módulo incompatível falha fechada com
  rollback; `CVG_RUN_REAL_E2E=true pnpm test:e2e` passou 28/28; `pnpm verify`
  passou com 125/576/31 skips, cobertura 84,50%/80,34%/85,95%/85,22%,
  contratos 72/72, worker 25/25 e migrations 27/27. O CI agora provisiona
  roles distintas de migração, aplicação e fixture; workflow remoto, produção,
  concorrência, clínica e assurance operacional continuam gaps.
- [x] (2026-08-24T08:01:41-03:00) Fechar `OUTBOX-FENCE-001` nos commits
  `e3cfb6f4255928c50de3c67718195a0063cce3c9` e
  `8d03882cc2538f48b5f6c77d861fbaec90b65a75`: claim/reclaim agora usam
  token opaco, finalização/falha condicionais ao token e ao relógio do
  PostgreSQL, com trigger de rollout contra worker legado. O primeiro critic
  independente reprovou fake permissivo, ausência de `markFailed` live e
  relógio do processo; os pontos foram corrigidos. GREEN focal 32/32,
  PostgreSQL live 31/50, regressão `pnpm verify` 125/579/33 skips e
  cobertura 84,48%/80,37%/85,97%/85,22% passaram. Fencing não equivale a
  exatamente-once; a prova live ainda inclui a disputa de finalização por duas
  conexões; efeitos externos continuam exigindo idempotência.
- [x] (2026-08-24T08:47:00-03:00) Fechar o complemento local
  `AUTHORING-ACTIVITY-001` no commit `82ea6ab`: publicação editorial agora
  materializa atividade por `scopeId/moduleId/sessionId`, com migrations
  `0028`–`0030`, `ENABLE/FORCE RLS`, itens `PUBLICADO`, ordinal bounded,
  replay/convergência concorrente e falha fechada para conjunto inesperado.
  RED/GREEN focal 18/18, authoring live 1/1, worker live 4/4 e suíte live
  completa 31/50 passaram; cobertura unitária 84,57%/80,50%/86,08%/85,30%.
- [ ] (futuro) Completar as fatias digitais restantes e a assurance de
  segurança/operação conforme os marcos e gates abaixo.
- [ ] (futuro) Submeter conteúdo, piloto, credenciais, fornecedor e release a
  Ricardo/autoridade competente; não são decisões que o plano possa inferir.

## Surprises & Discoveries

- Observation: `docs/99_runtime_state.md` ainda descrevia o bloqueio remoto de
  CI como vigente, embora o backlog/log registrem `origin`, workflow remoto
  verde e artifacts em `fbbc692`/`dd47909`/runs de 2026-08-10.
  Evidence: `git remote -v`, `git branch -vv`, `git log`,
  `docs/30_backlog_master.md`, `docs/20_master_execution_log.md`.
  Impact: o estado precisa ser reconciliado antes de selecionar tarefa; o
  histórico antigo será preservado e apenas a posição atual será corrigida.

- Observation: o HEAD contém diagnóstico B-07 persistido e perfil digital por
  tema, mas os `recommendedModuleIds` ainda são projeção de resultado; não há
  comando transacional que materialize a recomendação como `learning_assignments`.
  Evidence: `packages/application/src/diagnostic-use-cases.ts`,
  `packages/persistence/src/diagnostic-result-repository.ts`,
  `packages/application/src/learning-state-use-cases.ts`,
  `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0106_contratos_de_aplicacao.md`
  (`AssignCurriculum`) e UC-001/UC-002.
  Impact: esta é a candidata local mais direta para fechar a transição
  diagnóstico → trilha; requer contrato, idempotência, pré-requisitos, RLS e
  E2E antes de qualquer claim de jornada completa.

- Observation: a disponibilidade inicialmente poderia ser repassada pelo port
  interno como dado já lido; a implementação foi endurecida para derivá-la de
  `diagnostic_results.completed_at` dentro da transação de materialização.
  Evidence: `packages/application/src/adaptive-assignment-use-cases.ts` e
  `packages/persistence/src/adaptive-assignment-repository.ts`.
  Impact: reduz a superfície de confiança do adapter e mantém identidade,
  escopo e disponibilidade ancorados na fonte transacional.

- Observation: a pesquisa oficial atual mantém a separação entre competência,
  milestones/EPAs e resultados digitais, reforça plan/do/record/reflect e
  valoriza atividades interativas, feedback e acesso flexível; a orientação
  regulatória de 2026 também diz que julgamento profissional não pode ser
  totalmente delegado à IA.
  Evidence: `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`;
  AAVMC CBVE 2.0, RCVS CPD/Academy e RCVS AI advice listados na seção de
  pesquisa.
  Impact: manter a barra de produto digital, reflexão e próxima ação, mas
  bloquear publicação/autonomia clínica e autoridade de IA.

- Observation: `learning_assignments.moduleId` e atividades publicadas são
  agregados relacionados por leituras distintas; a atribuição adaptativa não
  cria automaticamente `activity_assignments` nem provenance do diagnóstico.
  Evidence: crítica independente do repositório de jornada e auditoria
  `BRIEFING/04.AUDIT/0524_journey_cta_audit.md`.
  Impact: `JOURNEY-045` fecha apenas a CTA para um alvo já autorizado na
  projeção; a transição diagnóstico → assignment → atividade real continua
  gap P1 e não pode ser declarada como jornada completa.

- Observation: a relação foi fechada localmente por um mapeamento curricular
  explícito na atividade, não por slug. A operação grava a origem do diagnóstico
  na atribuição e o `learningAssignmentId` na atividade na mesma transação; linhas
  legadas sem módulo continuam inelegíveis.
  Evidence: migration `0026_assignment_activity_provenance.sql`,
  `packages/persistence/src/adaptive-assignment-repository.ts`, testes focais e
  auditoria `BRIEFING/04.AUDIT/0526_journey_assignment_activity_audit.md`.
  Impact: assignment→atividade/provenance agora tem implementação local
  verificável; RLS/rollback/concorrência live, sincronização de estados e
  pipeline de publicação continuam gaps sem autoridade de ambiente.

- Observation: o endpoint de feedback da tentativa já era owner-scoped e
  redigido, mas a web restaurava somente appeals e terminava a submissão sem
  apresentar correção digital ou espera.
  Evidence: `apps/api/src/http.ts`, `packages/contracts/src/correction.ts`,
  `apps/web/app/page.tsx`, RED E2E de `RESULT-FEEDBACK-046`.
  Impact: o participante podia receber uma tentativa corrigida sem debrief
  mínimo; a lacuna foi fechada apenas na projeção digital, sem alterar nota,
  gabarito, decisão humana ou competência prática.

- Observation: a projeção autoral não tinha identidade persistida de sessão;
  materializar por slug/título seria ambíguo e não permitiria convergência
  segura entre publicações concorrentes.
  Evidence: `packages/persistence/src/content-repository.ts`, migrations
  `0028`–`0030`, `tests/integration/postgres-authoring-workflow.test.ts`.
  Impact: a sessão passou a ser `moduleId` + `sessionId` explícitos, com
  unicidade, RLS e replay idempotente; atividade legada continua fora da
  projeção automática.

- Observation: as policies iniciais da projeção recursavam ao consultar
  `learning_activities`/`learning_activity_items` sob FORCE RLS.
  Evidence: probe PostgreSQL falhou com recursão infinita antes da migration
  `0030`; o probe sequencial após as functions booleanas passou.
  Impact: a migration histórica `0029` permanece imutável e `0030` troca as
  policies recursivas por functions SQL `SECURITY DEFINER` que retornam somente
  booleano; a role app continua sem bypass.

- Observation: replay inicialmente tolerava itens extras já persistidos.
  Evidence: crítica independente e caso unitário `with an unexpected persisted
  item`.
  Impact: o materializador agora falha fechado no conjunto não exato, sem
  exclusão silenciosa de histórico; a operação de limpeza/retirada continua
  dependente de uma política explícita futura.

## Decision Log

- Decision: usar os três documentos `docs/` como control plane de status,
  histórico e backlog, e este arquivo apenas como ExecPlan narrativo executável.
  Context: o projeto já possui um control plane operacional próprio; criar uma
  segunda fonte de status aumentaria a contradição.
  Alternatives: substituir os documentos por `.agent/state.json` ou não criar
  plano vivo.
  Reason: `AGENTS.md` exige os documentos existentes e o framework exige plano
  vivo para trabalho T3/T4; a separação de responsabilidades preserva ambos.
  Consequences: toda mudança de status continua em `docs/`; este plano recebe
  apenas progresso, decisões, descobertas e recuperação.
  Date/Author: 2026-08-24 / Codex.

- Decision: congelar o MVP digital sem importar acreditação, horas regulatórias,
  conteúdo protegido, provider/MFA, prática supervisionada ou competência
  prática como funcionalidade implícita.
  Context: PRD/SPEC e pesquisa oficial diferenciam evidência educacional de
  competência/autoridade clínica.
  Alternatives: copiar o comportamento de plataformas comerciais ou liberar
  publicação com base em score digital.
  Reason: isso violaria a fronteira pública e os gates clínicos do CVG.
  Consequences: alguns critérios permanecem `WAITING_HUMAN_APPROVAL` ou
  dependentes de ambiente mesmo quando o código local estiver verde.
  Date/Author: 2026-08-24 / Codex.

- Decision: a implementação selecionada é a atribuição adaptativa bounded
  `ADAPTIVE-044`, depois de três leituras independentes e do baseline local.
  Context: `AssignCurriculum` existe no contrato aprovado e o resultado
  diagnóstico hoje não materializa a recomendação como assignment.
  Alternatives: ampliar triagem de feedback, implementar `ANULAR_ITEM`/
  `ALTERAR_RESULTADO`, ou atacar observabilidade externa sem ambiente.
  Reason: a atribuição é uma lacuna central de jornada que pode ser fechada
  localmente com PostgreSQL/contratos/E2E sintéticos, sem simular autoridade
  clínica nem fornecedor.
  Consequences: a fatia não fecha o MVP pedagógico completo nem libera
  produção; feedback/debrief, gates clínicos, live RLS/grants, CI no mesmo SHA
  e hardening operacional continuam explícitos. A identidade da atribuição
  será resolvida pelo resultado persistido, nunca por `participantId` aceito
  nessa nova operação.
  Date/Author: 2026-08-24 / Codex, confirmado pelos scouts Galileo, Avicenna e
  Nietzsche.

- Decision: tratar a recomendação de hardening do scout Avicenna como Quality
  Bar de release, não como pré-requisito artificial para o slice de produto.
  Context: startup least-privilege, fencing de outbox, grants produtivos,
  observabilidade externa e restore não têm evidência no ambiente atual.
  Reason: ADAPTIVE-044 não publica conteúdo, não executa worker externo e pode
  ser coberto localmente com PostgreSQL/RLS quando a infraestrutura estiver
  disponível; declarar release agora seria incorreto.
  Consequences: qualquer relatório desta fatia deve separar `PASS` local de
  `RELEASE BLOCKED` por ambiente/autoridade.
  Date/Author: 2026-08-24 / Codex.

- Decision: abrir `JOURNEY-045` como a menor continuação observável de
  `ADAPTIVE-044`, sem criar endpoint ou mudar o contrato de identidade.
  Context: a jornada já fornece `activityId` e a página já entende o query
  string, porém não há ação explícita no estado em que uma atividade está
  carregada.
  Reason: uma CTA client-side fecha a transição assignment → estudo com baixo
  blast radius, permite prova E2E e mantém autorização/session/API existentes.
  Consequences: o deep link será um ponteiro codificado e não um mecanismo de
  autorização; feedback/debrief, live RLS e assurance de release continuam
  fora desta fatia.
  Date/Author: 2026-08-24 / Codex.

- Decision: limitar `JOURNEY-045` a uma única CTA cujo alvo é escolhido pelo
  servidor, em vez de transformar cada atividade listada em próxima ação.
  Context: `RF-028` pede uma única próxima ação e o scout independente apontou
  que a web não deve inferir prioridade nem resolver `moduleId` por slug.
  Reason: o contrato pode provar que o alvo pertence à jornada autorizada,
  preservando a sessão e evitando um novo mecanismo de autorização.
  Consequences: a fatia não materializa `activity_assignments` a partir de
  `learning_assignments`; a prova diagnóstico→atividade real, provenance,
  atomicidade e feedback/debrief continuam tarefas separadas.
  Date/Author: 2026-08-24 / Codex, após crítica independente.

- Decision: implementar `RESULT-FEEDBACK-046` como uma projeção web sobre o
  endpoint público existente, com estados separados de correção e sem novo
  domínio, migration ou endpoint.
  Context: o backend já autorizava o dono e removia identidade interna, mas a
  página não mostrava resultado persistido nem ausência bounded.
  Reason: reduz o blast radius, preserva PostgreSQL/API como autoridade e
  materializa o mínimo de feedback/debrief observável sem inventar conteúdo.
  Consequences: score/outcome/feedback e next action ficam visíveis somente
  quando o contrato público é válido; `not_found` vira espera/retry, enquanto
  debrief completo, remediação, retenção e a relação assignment→atividade
  continuam fora do slice.
  Date/Author: 2026-08-24 / Codex.

- Decision: fechar `JOURNEY-REL-001` com `moduleId` explícito e provenance
  relacional, mantendo atividades legadas sem mapping fora da atribuição
  automática.
  Context: o slug não é uma autoridade curricular e a jornada só pode apontar
  para uma atividade que já esteja autorizada no banco.
  Reason: uma coluna opcional compatível, FKs e uma transação única resolvem a
  relação sem reescrever dados históricos ou inventar publicação clínica; o
  reparo só preenche provenance nula e preserva progresso.
  Consequences: múltiplas atividades publicadas do mesmo módulo podem ser
  materializadas, mas sincronização posterior de status, prova live e pipeline
  que grava mapping em conteúdo aprovado permanecem separados.
  Date/Author: 2026-08-24 / Codex.

## Outcomes & Retrospective

O Milestone 2 foi concluído no recorte local: a recomendação diagnóstica agora
vira estado persistido e acionável sem confiar identidade ou disponibilidade no
cliente, a jornada recebe um alvo server-side para a próxima atividade já
autorizada e a tela apresenta o mínimo de feedback digital persistido. A
cobertura global permaneceu acima da barra; a integração live continua uma
dependência real, não uma simulação. A principal lição foi separar claramente
`PASS LOCAL` de `RELEASE BLOCKED`, não inferir relações de catálogo pelo slug e
tratar feedback digital como projeção assistiva, não como decisão clínica.

## Context and Orientation

O projeto é um monorepo pnpm TypeScript strict. `apps/api` é a borda HTTP
autoritativa, `apps/web` é a superfície Next.js/SPA, `apps/worker` processa
outbox e tarefas derivadas, `packages/domain` contém máquinas imutáveis,
`packages/application` contém ports/use cases, `packages/contracts` valida
entrada/saída, `packages/persistence` contém Drizzle/PostgreSQL e RLS,
`packages/curriculum` contém catálogo/runtime draft, e
`packages/observability` contém telemetria redigida local. PostgreSQL é a
fonte transacional; Qdrant é índice interno reconstruível; IA é server-side,
estruturada, opcional e nunca decide estado, nota, gabarito, publicação,
permissão ou aprovação.

O HEAD atual (`2972fa0`) já contém, entre outras fatias, dashboard/trilha
digital, perfil diagnóstico formativo, ciclo administrativo, CPD interno
bounded, fila editorial, recovery controlado, RLS de identidade, auditoria
negativa, snapshot operacional, reflexão, apelações 036–042, relatório paginado
e fila interna de feedback. As auditorias correspondentes estão em
`BRIEFING/04.AUDIT/0500–0522`. A evidência é majoritariamente local/sintética;
vários testes live são explicitamente skipped sem `CVG_TEST_DATABASE_URL`.

As fontes de verdade do produto são `BRIEFING/09.PROJETO_CVG_TREINAMENTO` e os
gates canônicos; `docs/99_runtime_state.md` aponta a ação imediata,
`docs/30_backlog_master.md` possui IDs/status/dependências, e
`docs/20_master_execution_log.md` é append-only. `traceability.yml` liga
requisito → SPEC → paths → testes → commit → artefato.

## Scope and Constraints

- In scope: fechar lacunas aprovadas de produto/engenharia em fatias verticais;
  transformar diagnóstico em atribuições adaptativas seguras; completar
  contratos, persistência, autorização, UI, E2E, observabilidade e evidência;
  reconciliar control plane e manter regressão/recovery.
- Out of scope: inventar requisitos durante SPEC; publicar conteúdo clínico;
  aplicar B-07 a pessoas reais; afirmar competência/autonomia; armazenar
  prontuários, tutores, fotos, PDFs, segredos ou dados reais; simular provider,
  MFA, e-mail, grants de produção, collector externo ou aprovação humana.
- Applicable instructions: `AGENTS.md`, `apps/web/AGENTS.md`,
  `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`,
  `docs/30_backlog_master.md`, `BRIEFING/03.BUILD/0300_build_engineer_master.md`,
  `BRIEFING/03.BUILD/0301_roadmap.md`,
  `BRIEFING/03.BUILD/0302_backlog_master.md` e skills
  `engineering-framework`, `gauntlet-loop`, `orchestrate`.
- Requirements/decisions: PRD UC-001/002/007/008/009/016/018/022/023;
  RF-060/064/065/070/072/073/074/080/103/104; SPEC 0104–0118; D-077,
  D-080, D-089, D-109; `traceability.yml`.
- Tier/risk/blast radius: T4/CROSS_SYSTEM para a meta global; cada slice
  deve declarar seu próprio risco e manter no mínimo T3 quando tocar API,
  banco, autorização, migração, worker ou superfície pública.
- Authorization constraints: mudanças locais reversíveis estão autorizadas;
  push, deploy, credenciais, alteração de ambiente, aplicação clínica,
  publicação e piloto exigem autoridade específica e registro humano.

## Architecture and Interfaces

Toda nova borda externa começa em schema `unknown` strict, repete validação no
use case e retorna envelope público redigido. O servidor deriva principal,
membership e escopo; o cliente não fornece `participantId`, `reviewerId` ou
identidade equivalente para operações internas. Repositórios aplicam contexto
RLS na mesma transação e usam SQL parametrizado. Mutação versionada usa
optimistic locking/idempotência e outbox quando atravessa worker. Migrações
devem ter constraints, índices, RLS `ENABLE/FORCE` quando aplicável, owner e
rollback/restore testável.

Para a atribuição adaptativa candidata, o contrato deve aceitar somente a
conclusão/resultado diagnóstico já resolvido no servidor, selecionar módulos
recomendados e obrigatórios por regras determinísticas, preservar
`learning_assignments` existentes, ser idempotente e não dispensar conteúdo
obrigatório/tema crítico automaticamente. A saída participante é o path já
redigido; não entram gabarito, fontes, prompt, resposta, rationale ou claim
clínico.

## Milestones

### Milestone 1 — Control plane e Quality Bar reconciliados

- Outcome: `runtime_state` aponta o HEAD/remote/plan reais; backlog/log/
  traceability não contradizem a posição atual; `QB-01..QB-11` estão congeladas.
- Scope/dependencies: somente documentação/planejamento; preservar histórico.
- Demonstration: `git status`, `git branch -vv`, gates de documentação e
  verificação do manifesto.
- Acceptance/evidence: estado `IN_PROGRESS` com próxima ação concreta,
  entrada append-only no log, plano rastreável e diff limpo após os commits.

### Milestone 2 — Diagnóstico formativo atribui trilha segura

- Outcome: conclusão de B-07 sintético deriva assignments persistidos, bounded e
  escopados; repetição não duplica; caminho público mostra próxima ação.
- Scope/dependencies: `diagnostic_results`, `learning_assignments`,
  `AssignCurriculum`, catálogo/runtime e membership existentes; não publicar
  B-07.
- Demonstration: RED antes do código, testes unit/application/contract,
  PostgreSQL live quando disponível, E2E sintético e rota real/mockada conforme
  o harness existente.
- Acceptance/evidence: `ADAPTIVE-044` no backlog, audit dedicado,
  `traceability.yml`, migration somente se necessária e todos os gates locais.

### Milestone 3 — Jornada digital e governança de avaliação completas no
recorte autorizado

- Outcome: completar somente contratos aprovados de feedback, contestação,
  remediação, retenção, histórico, notificações internas e versões; cada fluxo
  tem estados, erros, concorrência e boundary.
- Scope/dependencies: APPEAL/FEEDBACK existentes, decisão humana para qualquer
  mudança de resultado, sem `ANULAR_ITEM`/`ALTERAR_RESULTADO` automático.
- Demonstration: tests por camada, E2E, integração PostgreSQL/RLS e crítica
  independente separada do builder.
- Acceptance/evidence: auditorias 05xx e artefatos de release atualizados.

### Milestone 4 — Segurança, operação e release candidate

- Outcome: live RLS/grants/ownership, CI no mesmo SHA, collector/retention/
  traces, carga/failover/restart/restore e runbooks são observados ou ficam
  formalmente condicionados pela autoridade correta.
- Scope/dependencies: ambiente descartável/homologação/produção autorizado;
  nenhuma credencial ou URL secreta no repositório.
- Demonstration: workflow remoto, artifacts/digests, health, métricas,
  restore e testes de concorrência/carga com dados sintéticos.
- Acceptance/evidence: auditoria operacional completa, verification records
  atuais e gaps explicitamente não-PASS quando não executados.

### Milestone 5 — Conteúdo, pré-voo e piloto sob governança clínica

- Outcome: B-07/M02 autorais, revisados e aprovados por Ricardo; ensaio T2 e
  baseline somente com protocolo, aviso, coorte e dados sintéticos/autorizados.
- Scope/dependencies: B07-02/B07-03/CUR-24-01/B07-04 e autoridade humana.
- Demonstration: pré-voo item a item, decisão registrada, protocolo executado.
- Acceptance/evidence: artefatos de conteúdo/gate clínico e auditoria; sem
  inferência técnica de aprovação.

## Plan of Work

Primeiro reconciliar o control plane, congelar a barra e transformar a
contradição do CI em fato documentado. Depois selecionar uma única fatia
vertical local, começando pelo RED da atribuição adaptativa se os scouts não
encontrarem uma lacuna de maior severidade. O builder altera somente sua
superfície disjunta; o coordenador integra contratos, persistência, API, web,
tests, auditoria, backlog, log, estado e manifesto. A crítica independente
recebe a barra e o artefato sem a justificativa do builder. Achados críticos de
correção, autorização, exposição, integridade ou recuperação têm prioridade
sobre polish. Cada fatia termina com regressão, release traceability local e
próxima ação concreta.

## Concrete Steps

From `/home/ricardo/cvg-trainee-vet`:

1. Confirm `git status --short --branch`, `git branch -vv`, `git log -12` and
   `git diff --check`; preserve the current clean baseline.
2. Update `docs/99_runtime_state.md` to the observed HEAD/origin/plan and set
   the current task to the reconciliation/quality-bar action; append the
   corresponding entry to `docs/20_master_execution_log.md`.
3. Add the selected bounded item to `docs/30_backlog_master.md` only after its
   PRD/SPEC binding and task contract are frozen; never mark it done before
   current verification evidence.
4. For each implementation slice, write RED first, run the focused RED, make
   the smallest code/migration/API/web change, run GREEN, refactor, then run
   relevant `pnpm` gates and inspect the diff.
5. Run an independent read-only critique with the frozen Quality Bar, record
   `PASS`, `CONDITIONAL PASS`, or `FAIL` honestly, fix the largest material gap,
   and rerun regressions.
6. Update the audit artifact, SPEC links, `traceability.yml`, backlog/log/plan
   and runtime state in the project’s canonical mutation order; commit only
   reversible, intentional changes and rerun the release traceability gate.

## Validation and Acceptance

| Criterion | Required | Procedure/environment | Expected observation | Evidence destination |
| --- | --- | --- | --- | --- |
| QB-01 Core journey | yes | current E2E + API/PostgreSQL live where configured | invite → diagnosis → path → activity → assessment → next action works or each unavailable boundary is explicit | audit 05xx, E2E artifact, log |
| QB-02 Adaptive assignment | yes | unit/application/contract/persistence/API/E2E; live DB when available | diagnostic completion creates only deterministic, idempotent, scoped assignments; mandatory modules are not auto-dispensed | `ADAPTIVE-044` audit and traceability |
| QB-03 Authorization/isolation | yes | negative HTTP tests, RLS integration with non-bypass role, cross-scope cases | deny-by-default; server derives identity/scope; no cross-scope read/write; `ENABLE/FORCE RLS` where required | security audit, integration artifact |
| QB-04 Data integrity/recovery | yes | migrations, constraints, optimistic locking, outbox, restore/rollback | PostgreSQL remains authority; no partial state; retry/replay safe; restore evidence current | persistence/restore audit |
| QB-05 Assessment/governance | yes | domain/application/worker/API tests and human-gate records | digital evidence is separated from practical competence; clinical publication and result changes require human authority | authoring/appeal audit, authority record |
| QB-06 Public boundary/UX | yes | strict schemas, exposure scan, E2E/axe, keyboard/manual review | no internal source/gabarito/IDs/secrets/real data in participant projection; loading/error/forbidden/retry are usable | web audit, exposure gate |
| QB-07 Operations | yes for release | health/dependencies, redacted metrics, collector/retention/traces, load/failover/restart/restore | dependencies and failures are observable; RTO/RPO and runbooks are measured, not asserted | runtime audit, live artifacts |
| QB-08 CI/release | yes for release | same-SHA remote workflow, artifacts/digests, clean worktree, coverage/scans | reproducible workflow green with traceability and no known high vulnerabilities; coverage remains ≥80% globally | CI audit, traceability gate |
| QB-09 Clinical/content gate | yes for publication/pilot | item-by-item review, preflight, human decision, approved protocol/T2 | B-07/M02 only become publishable/application-ready after Ricardo’s decision and evidence | content/gate artifacts |
| QB-10 Continuity/governance | yes | state/log/backlog/plan/manifest consistency and diff review | next action, blockers, evidence, status and rollback are recoverable by another agent | `docs/`, plan, manifest |
| QB-11 AI/derived-index boundary | yes | integration contracts, worker tests, exposure scan, RCVS/AAVMC constraint review | Qdrant/IA remain derived/assistive and cannot alter state, grading, publication, roles or clinical decisions | resilience audit, SPEC, research 0509 |

## Risks and Human Decisions

| Risk/decision | Evidence/confidence | Controls | Residual/authority | Trigger |
| --- | --- | --- | --- | --- |
| State/backlog contradiction | confirmed by HEAD vs state | preserve history; reconcile current pointers only; rerun gates | project control-plane owner / Codex until human review | any later conflicting status |
| Adaptive assignment can overrule mandatory content | high risk from UC-002 | deterministic allowlist, no auto-dispensation, critical-topic tests, server-side membership | clinical/product decision remains human | request to skip or publish |
| RLS/live evidence unavailable | confirmed skips in integration reports | explicit skip, disposable admin harness, no PASS inference | environment operator | `CVG_TEST_DATABASE_URL` + authorized role available |
| Provider/MFA/external delivery | intentionally not simulated | adapter boundary, recovery link hash-only, no secrets/logs | operational/vendor authority | approved provider and contract exist |
| B-07/M02 clinical safety | content still draft/pending | preflight, human review, no public route/publication | Ricardo | item-by-item approval and protocol ready |
| Remote mutation/release | local branch is ahead of origin | no push/deploy by inference; same-SHA workflow only when authorized | repository owner | explicit authorization for target/branch |

## Idempotence and Recovery

Before any implementation, verify a clean worktree and current HEAD. If a test
or migration fails, preserve the failed evidence, do not rewrite status to PASS,
and append a correction or new verification after the cause is fixed. A slice
must be retryable against a disposable database; mutations use existing
optimistic version/idempotency rules and do not depend on in-memory process
state. If a session ends mid-slice, read this plan, the current runtime state,
latest backlog item, last log entry, latest audit and `git status`; resume only
the exact `next_action`. Never run destructive cleanup against a broad path or
non-disposable database. Roll back code by reverting the bounded commit only
with explicit authorization; prefer forward-fix or disposable database
recreation for migrations.

## Artifacts and Evidence

- `docs/99_runtime_state.md`: current pointer, status, blocker and next action;
  it must be updated last in each control-plane transaction.
- `docs/30_backlog_master.md`: stable item IDs, dependencies, status and
  evidence links; it is not replaced by this plan.
- `docs/20_master_execution_log.md`: append-only chronology and decisions.
- `traceability.yml`: requirement/SPEC/module/contract/test/commit/artifact
  links and release gate.
- `BRIEFING/04.AUDIT/0509_pesquisa_atual_plataformas_e_praticas.md`: current
  official research and product implications, not clinical authorization.
- `pnpm verify`, `pnpm build`, `pnpm test:integration`, `pnpm test:e2e`,
  `pnpm verify:traceability:release`, `pnpm audit --audit-level=high` and
  `git diff --check`: executable evidence with environment limitations.

Plan revision note, 2026-08-24: initial living plan created after complete
document recovery, HEAD/remote inspection and official research refresh. Three
scouts independently confirmed that diagnostic completion does not materialize
assignments; one also identified that local release assurance remains blocked
by live grants/RLS, worker fencing, external observability and same-SHA CI.
`ADAPTIVE-044`, `JOURNEY-045`, `RESULT-FEEDBACK-046` and the local implementation
of `JOURNEY-REL-001` are now closed with gaps; no release or clinical approval
is inferred. The next priority is the live assignment→activity provenance,
rollback, RLS and concurrency proof, followed by state synchronization and
the remaining digital/operational slices.

Plan revision note, 2026-08-24 (AUTHORING-ACTIVITY-001): the bounded authoring
projection was closed locally after the independent critique; RLS recursion and
unexpected persisted items were fixed and live concurrency was re-run. The
remaining next action is the remote same-SHA workflow plus browser evidence for
an activity created by the authoring pipeline, with production and clinical
gates still explicit.
