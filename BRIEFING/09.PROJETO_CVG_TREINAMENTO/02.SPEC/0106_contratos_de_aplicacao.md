# 0106 — Contratos de Aplicação

**Padrão:** comandos e queries tipados, casos de uso pequenos e dependências injetadas.  
**Regra:** o domínio não conhece HTTP, React, SQL ou SDK de fornecedor.

## 1. Comandos principais

| Comando | Caso de uso | Resultado |
|---|---|---|
| `AcceptInvitation` | UC-001/021 | conta ativa e sessão solicitada ao adaptador de identidade |
| `UpdateAccount` | UC-021 | perfil permitido atualizado |
| `CreateInvitation` | UC-015 | convite único com expiração |
| `AssignCurriculum` | UC-015 | trilha atribuída e próxima ação calculada |
| `StartAttempt` | UC-004–008 | tentativa criada com versões congeladas |
| `SaveAnswer` | UC-004–006 | rascunho idempotente e retomável |
| `SubmitAttempt` | UC-004–006 | submissão única e evento de correção |
| `CorrectOpenResponse` | UC-005/006 | correção humana versionada |
| `CreateRemediation` | UC-007 | reforço somente no objetivo afetado |
| `ScheduleRetention` | UC-008 | revisão 30/60/90 elegível |
| `CreateContentDraft` | UC-012 | conteúdo autoral em rascunho |
| `ReviewContent` | UC-013 | decisão clínica e feedback interno |
| `PublishContent` | UC-014 | versão participante publicada após projeção |
| `WithdrawContent` | UC-019 | retirada emergencial e auditoria de afetados |
| `IndexInternalKnowledge` | autoria/revisão | cria ou substitui ponto versionado no Qdrant a partir de registro autoral autorizado |
| `GenerateAuthoringSuggestion` | autoria/revisão | solicita sugestão estruturada à IA, sempre como rascunho interno |
| `RotateSession` | identidade | revoga o hash de sessão atual e cria um novo cookie server-side em transação |
| `RevokeSession` | identidade | revoga a sessão por hash e retorna apenas resultado técnico uniforme |
| `ReconcileKnowledgeIndex` | operação | compara PostgreSQL e Qdrant e reprocessa itens ausentes de forma idempotente |
| `CreateAppeal` / `DecideAppeal` | UC-010/018 | contestação e recálculo controlados |
| `CreateFeedbackTicket` / `TransitionTicket` | UC-022/023 | relato validado e histórico |

## 2. Queries principais

- `GetNextAction(principal_id)`;
- `GetParticipantLearningJourney(principal_id, scope_ids)` — leitura agregada e contextual de atribuições, atividades/attempts, workflows de resultado e runtime curricular;
- `GetParticipantDashboard(principal_id)`;
- `GetModuleProjection(principal_id, module_id)`;
- `GetAttemptProjection(principal_id, attempt_id)`;
- `GetContentReviewQueue(scope)`;
- `GetCorrectionQueue(scope)`;
- `GetAdminDashboard(scope, period)`;
- `GetFeedbackTickets(scope, filters)`;
- `GetFeedbackTicketHistory(ticket_id, principal_context, limit)` — leitura interna, bounded e somente de estados versionados do ticket;
- `GetAuditTrail(scope, filters)`;
- `GetInternalAuthoringRecord(content_version_id)` — somente workflow interno autorizado.
- `SearchInternalKnowledge(principal_id, query, filters)` — somente autoria/revisão/Ricardo, com filtro de escopo antes da busca vetorial;
- `GetAiJob(job_id)` — somente solicitante autorizado e auditoria operacional; nunca expõe prompt, segredo ou payload interno a participante.

### 2.1 — Contrato executável de `GetAuditTrail`

`GetAuditTrail` recebe um único `scopeId` derivado da sessão e filtros
allowlisted (`action`, `resourceType`, `resourceId`, `principalId`, `actorKind`,
`outcome`, `from`, `to`, `cursor` e `limit`). O caso de uso exige a capability
`VIEW_AUDIT_TRAIL`, valida novamente identidade ativa, papel e pertencimento ao
escopo, e devolve somente metadados da entrada append-only. Somente eventos
globais anônimos sem `scopeId` (por exemplo, uma rejeição anônima de HTTP) podem
acompanhar o recorte; um evento autenticado sem escopo é inválido e entradas de
outro escopo são rejeitadas mesmo que o adaptador tente devolvê-las.

O cursor é opaco, bounded e ligado à ordenação determinística
`occurred_at DESC, id DESC`; o repositório busca `limit + 1` para calcular
`hasNext`, sem `COUNT(*)` nem ordenação arbitrária. O caso de uso não permite
edição, exportação ou emissão de achado nessa primeira leitura.

### 2.2 — Consulta state-only de histórico de feedback — FEEDBACK-HISTORY-053

`GetFeedbackTicketHistory` é uma query interna, read-only e bounded para
reconstruir somente a evolução de estado da triagem de um ticket. Recebe o
`ticketId` UUID, o contexto do principal autenticado (`principalId`, estado da
conta, papéis e escopos autorizados) e `limit` opcional entre 1 e 100, com
padrão 100. O caso de uso exige identidade interna ativa e a capability
`VIEW_FEEDBACK_QUEUE`; o ticket só é alcançado quando pertence a um escopo
autorizado. Ausência no escopo autorizado retorna `null` e é convertida em
`not_found` pela API.

O resultado de aplicação é uma cópia imutável contendo o `ticketId`, o escopo
validado apenas para a checagem de boundary e uma lista ordenada por
`ticketVersion`, `createdAt` e `historyId`. Cada evento contém somente:
`historyId`, `ticketId`, `ticketVersion`, `eventType`, `fromStatus` opcional,
`toStatus` e `createdAt`. Os tipos permitidos são `CRIADO` (versão 0, sem
`fromStatus`) e `STATUS_ALTERADO` (versão a partir de 1, com `fromStatus`);
versões duplicadas, estados desconhecidos, escopos não autorizados e payloads
acima do limite falham fechado. O vocabulário de estado é
`NOVO`, `TRIADO`, `EM_TRATAMENTO`, `AGUARDA_USUARIO`, `RESOLVIDO`, `DUPLICADO`,
`NAO_REPRODUZIDO` e `NAO_PLANEJADO`.

Esta query não é a trilha de auditoria completa nem registra o ator responsável.
Não aceita nem devolve `participantId`, descrição, resposta, prioridade,
responsável, SLA, correlação, request, fonte, conteúdo clínico ou qualquer
texto do relato. `GetAuditTrail`, definido em 0106/0111, permanece o contrato
separado para ações sensíveis, ator, recurso, escopo, resultado, versão e
correlação; o histórico state-only não satisfaz sozinho RF-004 nem substitui a
auditoria append-only. Nas gravações da API de criação/transição, o repositório
registra também uma entrada metadata-only em `audit_entries`, na mesma
transação, com `principalId`/ator, `requestId`, `correlationId`, recurso
`feedback_ticket`, escopo e resultado. Essa trilha é consultada pelo contrato
de auditoria, não é incorporada à projeção desta query.

A migration `0037_feedback_ticket_history.sql` registra o evento de criação ou
de mudança de estado na mesma transação que grava o ticket; as migrations
`0038_feedback_ticket_history_integrity.sql` e
`0039_feedback_ticket_history_event_lineage.sql` reforçam a relação
ticket/escopo, a versão/status do pai e a linhagem de eventos novos. Tickets
existentes
antes dessa migration não recebem backfill sintético: podem retornar uma lista
vazia ou um histórico incompleto, limitação que deve permanecer visível na
experiência interna.

O contrato local não constitui evidência de produção. Antes de release, o gate
live deve provar em PostgreSQL descartável/autorizado a migration, grants e
owners efetivos, RLS e contexto de escopo, append-only, isolamento entre
escopos, atomicidade/rollback e concorrência; também deve haver evidência
browser→API→PostgreSQL. Sem esse preflight, a feature permanece verificada
localmente, sem claim de produção ou de auditoria completa.

### 2.3 — Consulta paginada da fila de triagem — FEEDBACK-043

`GetFeedbackTriageQueue` é uma query interna read-only para moderador,
administrador ou identidade clínica aprovada, sempre com capability
`VIEW_FEEDBACK_QUEUE` e escopo autorizado. O input normalizado é
`{ scopeId, status?, cursor?, limit }`, com `limit` entre 1 e 100 e padrão 50;
`cursor` é opaco, bounded e não pode ser interpretado ou fabricado pelo cliente.
O port retorna itens allowlisted, `hasNext` e, quando aplicável, `nextCursor`;
esses dois últimos campos são metadados internos da aplicação e não entram na
projeção de dados do ticket.

O repository usa ordenação keyset estável `created_at DESC, id DESC` e busca
`limit + 1`, sem `COUNT(*)`. O cursor assinado com HMAC-SHA-256 contém somente
versão, `ticketId`, `createdAt`, `scopeId` e fingerprint dos filtros
`scopeId/status/limit`; assinatura inválida, cursor de outro escopo ou cursor
de filtros diferentes falha como `validation_error`. O caso de uso valida
novamente o shape da página e exige que `hasNext` e `nextCursor` sejam
consistentes.

A query não cria prioridade, atribuição, SLA, resposta, notificação, histórico,
decisão clínica ou estado educacional. PostgreSQL continua sendo a fonte
transacional; a assinatura e os testes locais não constituem evidência de RLS,
grants, concorrência live ou produção.

## 3. Validação

1. toda entrada externa é `unknown` até passar por schema Zod;
2. IDs, enumerações, limites de texto, datas e paginação são validados na borda;
3. validação de domínio ocorre novamente no caso de uso;
4. conteúdo livre de relato é normalizado, limitado e submetido ao filtro de dados proibidos;
5. respostas e campos educacionais não aceitam HTML arbitrário;
6. nenhum schema participante contém campos de `internal-authorship`.
7. consultas semânticas validam o escopo antes de chegar ao Qdrant; o resultado é reidratado pelo PostgreSQL e redigido por papel;
8. a IA recebe apenas o contexto mínimo autorizado e sua saída passa por schema, regras de segurança e revisão humana antes de persistir/publicar;
9. dados para indexação e prompts são cópias imutáveis por versão, sem mutação de conteúdo publicado.

## 4. Erros públicos

| Código | HTTP | Uso |
|---|---:|---|
| `unauthenticated` | 401 | sessão ausente/expirada |
| `forbidden` | 403 | papel ou escopo insuficiente |
| `not_found` | 404 | recurso não encontrado no escopo |
| `validation_error` | 422 | entrada semanticamente inválida |
| `state_conflict` | 409 | transição ou versão incompatível |
| `idempotency_conflict` | 409 | chave reutilizada com payload diferente |
| `rate_limited` | 429 | limite excedido |
| `internal_error` | 500 | falha inesperada, sem detalhes internos |

## 5. Idempotência e transação

- comandos mutáveis recebem `idempotency_key` do cliente ou do worker;
- `SubmitAttempt`, `PublishContent`, `WithdrawContent`, `DecideAppeal` e jobs são idempotentes;
- `IndexInternalKnowledge` usa `content_version_id + embedding_model + embedding_version` como chave determinística;
- `GenerateAuthoringSuggestion` usa `job_id`/idempotency key, timeout e retry limitado; uma resposta duplicada nunca publica nem altera estado;
- tentativa, respostas, cálculo e evento de saída são gravados em uma transação;
- retry nunca executa novamente um efeito confirmado;
- retorno é um novo objeto/projeção, sem mutar entidade em memória compartilhada.

## 6. Contratos materializados de identidade e avaliação

`CreateInvitation` recebe identidade administrativa, e-mail, papéis, escopos, expiração e correlação; retorna o token apenas para a operação interna que o criou. `AcceptInvitation` recebe o token transitório, consulta somente o hash, ativa a conta, consome o convite e cria uma sessão server-side. Nenhum desses comandos aceita senha, foto, arquivo, fonte ou dado clínico protegido.

`CorrectOpenResponse` cria resultado humano versionado (`HUMANA`), persiste nota/outcome/feedback em PostgreSQL, publica evento metadata-only e deixa o feedback acessível somente ao participante dono. O evento não carrega feedback, resposta aberta ou identidade clínica.

## 7. Estados de aprendizagem materializados no item 7

Os comandos de atribuição, workflow de resultado, ticket e contestação foram ligados ao domínio por casos de uso pequenos e dependência abstrata de repositório. Cada comando recebe contexto de participante/escopo, cria em versão 0 ou busca a versão persistida antes de aplicar uma transição imutável; conflitos de concorrência e eventos inválidos são normalizados para `state_conflict`. A aplicação não importa SQL, Drizzle ou HTTP: a composição concreta do repositório ocorre no API.

As operações entregues são `CreateLearningAssignment`, `TransitionLearningAssignment`, `CreateAssessmentWorkflow`, `TransitionAssessmentWorkflow`, `CreateFeedbackTicket`, `TransitionFeedbackTicket`, `CreateAppeal` e `TransitionAppeal`. Falhas de entrada de domínio viram `validation_error`, recursos ausentes viram `not_found` e versão/estado incompatível vira `state_conflict`; detalhes internos não atravessam o envelope público.

## 8. Jornada agregada materializada no item 9

`GetParticipantLearningJourney` recebe somente `participantId` e os `scopeIds` autorizados pela sessão. O port de leitura retorna atribuições, atividades com a tentativa mais recente, workflows de resultado e estados de runtime; a atividade pode carregar internamente `moduleId` curricular e `learningAssignmentId` explícitos para resolver a ação de remediação, mas esses vínculos nunca são publicados ao participante. O caso de uso valida identidade/escopo, clona sem mutar e calcula a `nextAction` com precedência para remediação, retenção e correção pendente. Quando `EXECUTAR_REMEDIACAO` é a ação prioritária, o alvo só existe se houver atividade do mesmo módulo, com assignment explícito, em estado publicável/iniciável (`DISPONIVEL`, `EM_ANDAMENTO` ou `EM_REFORCO`); a persistência falha fechado se qualquer item/versão vinculada não estiver `PUBLICADO`; retenção não recebe CTA por inferência. A composição PostgreSQL permanece fora da aplicação e o boundary HTTP rederiva ação/alvo antes da projeção pública.

## 9.1 Protocolo de contestação do participante — APPEAL-036

`GetParticipantAppeals` recebe somente `{ participantId, scopeId, attemptId }` já
derivados da sessão e da tentativa resolvida no escopo próprio. O port de leitura
ordena por `createdAt`/identificador, limita a 100 registros e retorna uma cópia
imutável de `AppealState`; o caso de uso rejeita contexto incompleto e não aceita
`reviewerId`, justificativa, resposta, score, gabarito, fonte ou competência
clínica como entrada ou saída participante.

`CreateAppeal` só pode ser chamado para tentativa corrigida automaticamente ou
humanamente e item avaliável (`QUESTAO`/`CASO`). A API valida novamente
participante, escopo, atividade e item antes de delegar ao domínio; a persistência
mantém a unicidade condicional do protocolo aberto e normaliza duplicidade como
`idempotency_conflict`. A tela participante
expõe apenas o protocolo próprio, com estados de carregamento, vazio, erro/retry,
duplicidade e terminal. Fila de revisor, decisão fundamentada, recálculo
versionado e notificações de afetados continuam sendo contratos internos
posteriores e não são inferidos por esta fatia.

## 9. Autoria e revisão materializadas no item 10

`RunAuthoringPreflight` recebe um registro autoral interno e devolve checks determinísticos de campos, correção, fronteira pública e rastreabilidade. `ReviewAuthoringContent` exige principal ativo, papel/capacidade, escopo, revisor diferente do autor e registro em `EM_REVISAO_CLINICA`; persiste a decisão e chama a transição de conteúdo somente depois do preflight. `APROVAR_CLINICAMENTE` não torna o item publicável sozinho: a publicação ainda exige o gate de registro editorial + preflight + última aprovação clínica no repositório.

O registro autoral é versionado por `content_id + version`, liga módulo/sessão/objetivo/autor e mantém `correctChoiceIds` ou rubrica somente no limite interno. A projeção `participant` é uma cópia estrutural sem gabarito, rubrica, fontes ou autoria. IA e Qdrant permanecem adapters assistivos e nunca executam esse caso de uso nem alteram estado.

## 10. Fila interna de revisão clínica — EDITORIAL-QUEUE-027

`GetContentReviewQueue` é uma query imutável e escopada. Recebe principal ativo,
escopos autorizados e `{ scopeId, status?, limit? }`; `status` aceita somente
`EM_REVISAO_CLINICA` ou `AJUSTES_SOLICITADOS`, e `limit` é limitado a 1–100
com padrão 50. `AUTHOR` recebe somente seus próprios registros, enquanto
`MODERATOR`, `ADMIN` e a identidade clínica aprovada podem ler o escopo
operacional completo. A capability `VIEW_CONTENT_REVIEW_QUEUE` não concede
alteração, aprovação ou publicação.

O port PostgreSQL aplica contexto transacional de `scopeId`, fica protegido por
RLS `ENABLE/FORCE` nas tabelas editoriais, restringe ambas ao escopo pedido,
ordena por atualização/identificador/versão de forma determinística e retorna
no máximo `limit` linhas. A projeção contém apenas identificadores
operacionais, módulo, sessão, título, autor, estado, preflight, última decisão
resumida, acesso calculado à autoria, data de atualização e `nextAction`; não
há `hasMore` sem cursor implementado. Prompt, gabarito, rubrica, fontes,
conteúdo autoral completo e dados de participante não atravessam o contrato da
fila; eles continuam protegidos pela query interna de autoria. A fila não
decide por IA/Qdrant nem executa transição de estado.

## 9.2 Fila interna de revisão de contestação — APPEAL-037

`GetAppealReviewQueue` é uma query imutável que recebe a identidade completa da
sessão e `{ scopeId, status?, limit? }`. O caso de uso exige a capability
`REVIEW_APPEAL`, conta `ACTIVE` e o escopo solicitado presente na sessão. O
limite padrão é 50 e o máximo é 100; o status, quando informado, pertence à
máquina de estados de `AppealState`. O resultado do port retorna registros
escopados e o caso de uso falha fechado para escopo, status ou identificador
duplicado inesperado.

O port `AppealReviewQueueReadPort` é separado dos comandos de transição e não
expõe método de escrita. O adapter PostgreSQL estabelece, dentro da mesma
transação, o contexto dedicado `cvg.appeal_review_scope_id`, seleciona somente
metadados da tabela `appeals`, filtra o escopo/status e ordena por
`dueAt`/`createdAt`/`appealId`. O caso de uso congela a projeção allowlisted com
justificativa, datas, estado, versão e metadados internos opcionais; resposta,
nota, gabarito, fontes, prompt, rubrica e alegação de competência prática não
entram no contrato. A query não atribui revisor, decide, recalcula, notifica,
publica ou altera o estado da contestação.

## 9.3 Transição interna segura de contestação — APPEAL-038

`TransitionAppealReview` é um comando separado da query da fila. A entrada
contém somente `{ appealId, scopeId, version, event }`; `participantId` e
`reviewerId` não são aceitos do cliente. O caso de uso recebe o `principalId`
autenticado fora do corpo, usa-o como revisor na autoatribuição e exige que ele
seja o revisor persistido para `DECIDIR` ou `SOLICITAR_RECALCULO`. O participante
é sempre obtido do protocolo persistido no escopo solicitado.

O contrato materializado permite somente `ATRIBUIR_REVISOR`, `DECIDIR` e
`SOLICITAR_RECALCULO`. A sequência verificável é
`ABERTA → EM_REVISAO → DECIDIDA → RECALCULO_PENDENTE`; cada escrita exige a
versão corrente e retorna `state_conflict` em concorrência. Esta fatia não
calcula nota, altera tentativa/resultado, publica decisão clínica, conclui
recálculo ou encerra protocolo. A justificativa fundamentada, snapshots de
versão, idempotência de worker e notificações são contratos posteriores.

O port `AppealReviewTransitionRepositoryPort` é diferente do repositório do
participante. Ele instala `cvg.appeal_review_scope_id` em transação, lê o
protocolo por `appealId + scopeId` e atualiza somente `status`, `version`,
`reviewer_id`, `decision` e `updated_at` com predicado da versão anterior. A
policy `UPDATE` da migration `0023_appeal_review_transition_rls.sql` exige o
mesmo contexto de revisor; nenhuma coluna de participante, tentativa, item ou
justificativa é escrita pelo port. A mesma migration reduz a policy antiga do
participante a `SELECT`/`INSERT`, sem `UPDATE` ou `DELETE` pelo contexto de
participante.

## 9.4 Rationale e metadados da decisão — APPEAL-039

`TransitionAppealReview` exige `decisionRationale` bounded e plain text quando
o evento é `DECIDIR`; o campo é proibido nos demais eventos. O comando recebe
`correlationId` somente do servidor e o caso de uso gera `decisionAt` no
instante da transição. O domínio persiste `decisionRationale`, `decisionAt` e
`decisionCorrelationId` junto com a decisão, preservando-os nas transições
posteriores.

O port de transição atualiza esses três campos somente no mesmo update
allowlisted de `status`/`version`/`reviewerId`/`decision`, sob o contexto RLS
dedicado. A fila interna pode projetá-los para revisão escopada; a projeção
participante continua explicitamente sem rationale, data/correlação de decisão
ou identidade interna. Histórico append-only separado, snapshot, recálculo,
notificação e encerramento são contratos posteriores.

## 9.5 Atribuição adaptativa derivada do diagnóstico — ADAPTIVE-044

`AssignCurriculumFromDiagnostic` recebe somente `{ diagnosticResultId, scopeId }`.
Ele reidrata o resultado B-07 persistido pelo port de leitura escopado, valida
as flags formativas não punitivas e combina o núcleo obrigatório da onda
(`M01`, `M02`, `M11`) com `recommendedModuleIds`, sem permitir dispensa ou
alteração de nota. O participante não é parâmetro do comando.

O port de escrita recebe resultado, escopo e módulos já ordenados. O adapter
PostgreSQL deriva participante e `availableAt` da linha diagnóstica dentro da
mesma transação em que aplica o contexto RLS das atribuições. Cada nova linha é
criada pela máquina de estados (`NAO_ATRIBUIDO → ATRIBUIDO`); linha existente
é preservada ou promovida com versionamento otimista, e replay utiliza a
unicidade participante–escopo–módulo. Conflito concorrente vira
`state_conflict`; ausência fora do escopo vira `not_found`.

O retorno de aplicação é interno e a projeção participante é allowlisted. Ela
não contém `participantId`, gabarito, fonte, rubrica, objetivos internos,
prompt, nota global ou competência prática. A falha ou sucesso desta operação
não altera publicação, resultado diagnóstico, runtime, aprovação clínica ou
autonomia.
