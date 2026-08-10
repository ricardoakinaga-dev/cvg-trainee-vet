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
- `GetAuditTrail(scope, filters)`;
- `GetInternalAuthoringRecord(content_version_id)` — somente workflow interno autorizado.
- `SearchInternalKnowledge(principal_id, query, filters)` — somente autoria/revisão/Ricardo, com filtro de escopo antes da busca vetorial;
- `GetAiJob(job_id)` — somente solicitante autorizado e auditoria operacional; nunca expõe prompt, segredo ou payload interno a participante.

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

`GetParticipantLearningJourney` recebe somente `participantId` e os `scopeIds` autorizados pela sessão. O port de leitura retorna atribuições, atividades com a tentativa mais recente, workflows de resultado e estados de runtime; o caso de uso valida identidade/escopo, clona sem mutar e calcula a `nextAction` com precedência para remediação, retenção e correção pendente. A composição PostgreSQL permanece fora da aplicação.

## 9. Autoria e revisão materializadas no item 10

`RunAuthoringPreflight` recebe um registro autoral interno e devolve checks determinísticos de campos, correção, fronteira pública e rastreabilidade. `ReviewAuthoringContent` exige principal ativo, papel/capacidade, escopo, revisor diferente do autor e registro em `EM_REVISAO_CLINICA`; persiste a decisão e chama a transição de conteúdo somente depois do preflight. `APROVAR_CLINICAMENTE` não torna o item publicável sozinho: a publicação ainda exige o gate de registro editorial + preflight + última aprovação clínica no repositório.

O registro autoral é versionado por `content_id + version`, liga módulo/sessão/objetivo/autor e mantém `correctChoiceIds` ou rubrica somente no limite interno. A projeção `participant` é uma cópia estrutural sem gabarito, rubrica, fontes ou autoria. IA e Qdrant permanecem adapters assistivos e nunca executam esse caso de uso nem alteram estado.
