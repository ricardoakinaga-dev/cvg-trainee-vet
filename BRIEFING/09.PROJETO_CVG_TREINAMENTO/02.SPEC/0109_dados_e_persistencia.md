# 0109 — Dados e Persistência

## 1. Armazenamento

O sistema usa PostgreSQL como fonte transacional. O monorepo possui repositórios tipados e queries explícitas; nenhum componente de apresentação consulta SQL diretamente.

| Área lógica | Dados | Acesso |
|---|---|---|
| `app` | contas educacionais, currículo, conteúdo publicado, tentativas, progresso, feedback | API autorizada; RLS adicional |
| `audit` | ações sensíveis, decisões, correlações e versões | somente auditoria/admin/Ricardo |
| `internal` | autoria, fontes, localizadores, conflitos, protocolos internos e revisão | somente autoria/revisão/Ricardo |
| `outbox` | eventos ainda não processados e estado de retry | API/worker |
| `integration` | configuração não secreta, estado de jobs, versões de embedding e referências de integração | API/worker/operação escopados |

No núcleo materializado, `accounts` contém somente e-mail profissional normalizado e estado (`INVITED`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`). `account_invitations` contém `account_id`, hash SHA-256 do token, papéis/escopos concedidos, expiração, aceite e criador. Não há coluna de senha, token bruto, foto, PDF ou fonte.

As áreas podem ser schemas PostgreSQL separados ou tabelas com políticas equivalentes, conforme o adaptador de execução. PostgreSQL é a fonte de verdade. Qdrant é um índice derivado e reconstruível; guarda vetores e payload mínimo de registros autorais internos autorizados, nunca PDFs, fotos, OCR, cópias protegidas ou dados reais. A IA não é armazenamento: prompts e respostas completas não são persistidos por padrão; ficam apenas hash, modelo, versão, status, uso e decisão de retenção técnica.

## 2. Estratégia de leitura/escrita

- comandos escrevem por repositórios e transações explícitas;
- queries de dashboard usam views/projeções somente leitura;
- tentativas e respostas são append-only após submissão;
- conteúdo publicado é imutável por versão;
- auditoria é append-only;
- cache é opcional e nunca fonte de verdade;
- Qdrant é atualizado somente por outbox/worker, com `point_id` determinístico, filtro de escopo e reconciliação periódica;
- o adaptador de IA é chamado somente por casos de uso internos, com contexto redigido, schema de saída e chave server-side;
- joins e agregações continuam no PostgreSQL na escala inicial para manter consistência.

## 2.1 Leitura agregada da jornada — item 9

`createParticipantJourneyRepository` executa uma transação de leitura com três contextos controlados: participante para atividades/attempts/runtime e participante+escopo para `learning_assignments` e `assessment_workflows`. Os escopos são normalizados e deduplicados; uma consulta sem escopo retorna vazio. A atividade publicada é ligada à tentativa mais recente por `updated_at`/versão, enquanto atribuições, resultados e runtime são mapeados pelos mappers versionados já existentes. O contexto é restaurado para participante antes do fim da transação. PostgreSQL continua sendo a fonte de verdade; a agregação não é cacheada nem delegada ao Qdrant/IA.

## 3. Transações obrigatórias

| Fluxo | Unidade transacional |
|---|---|
| salvar resposta | resposta + checkpoint de tentativa + idempotência |
| submeter tentativa | submissão + congelamento de versão + outbox |
| corrigir | correção + resultado + remediação/retensão + outbox |
| publicar | projeção aprovada + estado publicado + auditoria + outbox |
| retirar | estado retirado + alcance de exposição + auditoria + outbox |
| decidir contestação | decisão + recálculo + versões + auditoria + outbox |
| conceder/revogar papel | assignment + auditoria |
| criar convite | conta convidada + convite com hash + auditoria operacional futura, na mesma transação |
| aceitar convite | validação de expiração + ativação da conta + consumo único + sessão server-side |
| indexar autoria interna | registro aprovado/permitido + evento de indexação + versão do vetor no PostgreSQL; ponto no Qdrant é derivado |
| gerar sugestão de autoria | job + auditoria técnica + resultado estruturado interno; nenhum efeito publicado automático |

## 4. Retenção e dados mínimos

Persistir somente nome, login profissional, estado da conta, progresso, tentativas, notas, feedback mínimo, auditoria e dados operacionais necessários. Respeitar vínculo + dois anos para dados previstos no PRD; depois eliminar ou anonimizar conforme política interna. Respostas abertas devem ser retidas apenas pelo tempo necessário para feedback, contestação e melhoria do treinamento.

## 5. Proteção contra exposição autoral

O repositório interno pode manter `source_record_id`, obra, edição, capítulo, página, hash, protocolo e decisão porque isso é necessário à construção. O serializer público não tem esses campos no tipo. A API mantém consultas separadas e testes negativos que falham se qualquer chave interna aparecer na projeção participante.

## 6. Contrato das integrações

| Dependência | Papel | Fonte de verdade | Falha | Limite de exposição |
|---|---|---|---|---|
| PostgreSQL | estado, relações, auditoria, outbox e jobs | sim | erro transacional bloqueia a operação correspondente | API redige por papel |
| Qdrant | busca semântica interna e índice de embeddings | não | marcar `INDEX_PENDING`, retry/reconciliação; não perder estado educacional | somente autoria/revisão/operação autorizadas |
| IA server-side | sugestão estruturada de autoria/revisão | não | fallback manual, retry limitado ou recurso indisponível | sem fonte bruta, foto, PDF, dado real ou acesso do participante |

Configuração mínima por ambiente, sempre via segredo/variável de ambiente e nunca no Git:

```text
DATABASE_URL
QDRANT_URL
QDRANT_API_KEY             # obrigatório apenas quando o endpoint exigir
QDRANT_COLLECTION
AI_PROVIDER=openai
AI_API_KEY
AI_MODEL
EMBEDDING_MODEL
```

O adaptador deve permitir Qdrant local em desenvolvimento/teste e endpoint protegido em produção, sem alterar o domínio. A coleção é criada/migrada por comando operacional versionado; o worker verifica dimensão/distância/modelo antes de indexar. Um teste de contrato impede que a integração seja inicializada sem configuração válida ou que um payload interno seja aceito em rota participante.

## 7. Estado implementado e verificável

- PostgreSQL permanece a autoridade para conta, convite, sessão, tentativa, resultado, auditoria e outbox;
- migração `0006_unknown_randall_flagg.sql` adiciona `account_invitations`, FK para conta, hash único, índices de expiração/aceite e check de digest hexadecimal;
- token bruto existe somente no retorno imediato da operação administrativa e no fluxo transitório de aceite; não é escrito no banco, outbox, Qdrant, IA ou log;
- Qdrant recebe apenas ponto derivado com identificadores, hash, escopo, versão e status; texto participante e material de origem ficam no PostgreSQL interno;
- IA é chamada somente pelo worker server-side, com schema estruturado; no CI o adaptador é fake determinístico e o resultado permanece `DRAFT_AI`.

## 8. Persistência editorial materializada no item 10

`content_editorial_records` guarda a versão autoral, escopo, módulo, sessão, objetivo, autor, item interno e preflight. `content_review_decisions` guarda cada decisão clínica com revisor, justificativa, correlação e data. A migration `0014_salty_penance.sql` aplica as FKs para `content_versions`/`accounts`, unicidade de `content_id + version`, índices por escopo/versão e checks de versão/decisão.

O repositório lê a última decisão clínica, calcula motivos de bloqueio e nunca coloca o JSON editorial na projeção participante. A atualização do preflight e o registro da decisão são persistidos com mapeamento estrito; a transição de conteúdo permanece coordenada pelo caso de uso e deve ser tornada transação única antes de uma publicação operacional em escala.

## 8.1 Atribuição adaptativa derivada — ADAPTIVE-044

Não há migration nova para esta fatia. `learning_assignments` já possui
unicidade em `(participant_id, scope_id, module_id)`, checks de módulo/estado,
versionamento e policies RLS contextualizadas. O repositório adaptativo abre
uma transação, aplica primeiro o contexto de escopo para ler
`diagnostic_results`, deriva `participant_id` e `completed_at` da linha
encontrada e então troca para `{ participantId, scopeId }` antes de ler/escrever
atribuições.

Inserções usam `onConflictDoNothing` e uma releitura bounded para tornar retry
sequencial idempotente. Uma atribuição `NAO_ATRIBUIDO` existente só é promovida
com predicado de versão/status; qualquer conflito é exposto como erro de estado
e não como sobrescrita silenciosa. O índice único é a garantia de não duplicar
progresso, enquanto PostgreSQL continua a autoridade e a jornada agregada
continua calculando a próxima ação a partir das linhas persistidas.

## 8.2 Relação explícita assignment → atividade — JOURNEY-REL-001

`learning_assignments` e `activity_assignments` são agregados distintos. A
materialização adaptativa só atravessa essa fronteira quando
`learning_activities.module_id` está preenchido com um identificador curricular
válido, a atividade está `PUBLISHED` e o escopo coincide. Slug, título, ordem ou
qualquer convenção textual não são usados para inferir o módulo; atividades
legadas com `module_id` nulo continuam fora da atribuição automática.

A migration `0026_assignment_activity_provenance.sql` adiciona, de forma
compatível, `learning_assignments.source_diagnostic_result_id` e
`activity_assignments.learning_assignment_id`, ambos com FK. A operação lê o
diagnóstico, cria/promove a atribuição de módulo e insere ou repara o vínculo da
atividade na mesma transação, usando `on conflict` bounded: uma linha legada sem
proveniência pode receber o `learning_assignment_id`, mas seu status de progresso
não é sobrescrito. Replays preservam os IDs e não duplicam linhas.

O seed curricular transporta `moduleId` somente para atividades derivadas de um
módulo conhecido; o campo não publica conteúdo nem substitui aprovação clínica.
A prova live de RLS/concorrência e a auditoria append-only detalhada continuam
requisitos de operação antes de release.

## 8.3 Sincronização posterior bounded — JOURNEY-REL-002

Quando uma atribuição curricular já persistida muda de estado por transição
otimista, `saveLearningAssignment` atualiza, na mesma transação e sob o mesmo
contexto `{ participantId, scopeId }`, apenas as linhas de
`activity_assignments` cujo `learning_assignment_id` é igual ao assignment e
cuja atividade permanece `PUBLISHED` no escopo. A consulta não usa slug, não
aceita identidade do cliente e não toca linhas legadas com provenance nula.

`NAO_ATRIBUIDO` não é um status válido de atividade e não é projetado. Uma
atividade retirada fica fora do conjunto elegível; se a sincronização falhar,
a transação da atribuição falha junto. A migration `0026` fornece a policy de
`UPDATE` adicional para exigir contexto, participante, escopo, atividade
publicada e correspondência de módulo/assignment. A prova live de RLS,
rollback induzido e concorrência continua gate de ambiente.

Uma relação explícita `PUBLISHED` com `module_id` diferente do assignment é
inválida e falha fechada antes do commit: a transação reverte tanto a transição
do assignment quanto qualquer projeção de atividade. O workflow de integração
mantém owner de migração, role de aplicação e role administrativa de fixture
separados, sem colocar credenciais no repositório; a matriz produtiva de grants,
rotação e ownership ainda exige inspeção operacional autorizada.

## 8.4 Materialização authoring → atividade publicada — AUTHORING-ACTIVITY-001

Quando a transição editorial chega a `PUBLICADO`, o repositório materializa a
atividade pela identidade explícita `{ scopeId, moduleId, sessionId }` dentro da
transação do caso de uso. `moduleId` aceita somente `M01`–`M24` e `sessionId`
deve corresponder exatamente a `Mxx-S1`–`Mxx-S4`; atividades legadas podem manter
`sessionId` nulo e não são agrupadas retroativamente.

As migrations `0028_authoring_activity_session.sql`,
`0029_learning_activity_projection_rls.sql` e
`0030_learning_activity_projection_rls_functions.sql` adicionam a identidade
da sessão, unicidade por escopo/módulo/sessão, check de correspondência e
`ENABLE/FORCE RLS` em `learning_activities` e `learning_activity_items`. A
role de aplicação só pode inserir a projeção publicada no escopo transacional;
leituras são limitadas ao escopo ou à atribuição do participante. As funções
`SECURITY DEFINER` usadas pelas policies retornam somente booleano e evitam
recursão de RLS; não substituem autorização server-side.

O materializador lê apenas registros editoriais cujo `content_versions.status`
é `PUBLICADO`, valida identidade conteúdo/versão/escopo, exige ordinal de
participante entre 1 e 100 e rejeita ordinais duplicados. A atividade recebe
slug derivado não semântico, título controlado e estado `PUBLISHED`; os itens
usam `on conflict` bounded para replay idempotente. Mismatch, atividade ausente,
status incompatível, vínculo em outra atividade, escrita incompleta ou item
inesperado falham fechado. A validação do conjunto exato ocorre antes do
retorno e qualquer erro aborta a transação externa; não há exclusão implícita de
histórico.

Essa projeção técnica não autoriza publicação clínica: a transição continua
dependendo do caso de uso, capability e decisão humana configurada. PostgreSQL
permanece a autoridade; Qdrant/IA não criam atividade, escolhem item ou alteram
estado.

## 8.5 Histórico state-only de feedback — FEEDBACK-HISTORY-053

`feedback_ticket_history` é uma tabela interna append-only para a linha do tempo
bounded de estados da triagem. Ela não é a tabela de auditoria de ações e não
pretende registrar ator, request ou correlação.

| Coluna | Tipo/regra | Finalidade |
|---|---|---|
| `id` | UUID, PK, `defaultRandom()` | identificador técnico do evento |
| `ticket_id` | UUID, obrigatório, FK para `feedback_tickets.id`, `ON DELETE RESTRICT` | vínculo ao ticket |
| `scope_id` | UUID, obrigatório | contexto de escopo para autorização/RLS |
| `ticket_version` | inteiro, obrigatório, `>= 0`, único por ticket | ordenação e concorrência do estado |
| `event_type` | `CRIADO`, `STATUS_ALTERADO` ou `METADATA_ALTERADO` | natureza da mudança |
| `from_status` | nulo para criação; obrigatório para mudança | estado anterior, quando aplicável |
| `to_status` | status allowlisted, obrigatório | estado resultante |
| `from_priority` / `to_priority` | prioridade allowlisted; obrigatória nos eventos de metadata | linhagem da prioridade interna |
| `from_assignee_id` / `to_assignee_id` | UUID ou nulo; usados nos eventos de metadata | linhagem da responsabilidade interna |
| `created_at` | timestamp com timezone, obrigatório, default `now()` | momento do evento |

As invariantes são: `(ticket_id, ticket_version)` único; `CRIADO` somente na
versão 0 e sem `from_status`; `STATUS_ALTERADO` somente a partir da versão 1 e
com estado anterior; `to_status` e `from_status` pertencem ao vocabulário do
ticket. O índice de consulta é `(scope_id, created_at, id)`, enquanto a leitura
do histórico usa ticket, escopo, versão, data e id para ordenação determinística
e limite máximo de 100 eventos. O vocabulário de status é
`NOVO`, `TRIADO`, `EM_TRATAMENTO`, `AGUARDA_USUARIO`, `RESOLVIDO`, `DUPLICADO`,
`NAO_REPRODUZIDO` e `NAO_PLANEJADO`.

Ao criar ou alterar um ticket, o evento correspondente é inserido na mesma
transação PostgreSQL: a criação gera `CRIADO` na versão 0; uma transição gera
`STATUS_ALTERADO`; e a triagem interna gera `METADATA_ALTERADO` com o mesmo
status, prioridade e responsabilidade anterior/nova. Falha na inserção do
evento, do ticket ou da auditoria reverte a unidade inteira. Nas gravações feitas
pela API, a mesma unidade insere também uma entrada metadata-only em
`audit_entries` com ator, request, correlação, recurso, escopo e resultado. O trigger
`cvg_prevent_feedback_ticket_history_mutation` bloqueia `UPDATE` e `DELETE`, e
`REVOKE UPDATE, DELETE` reforça a fronteira de escrita.

A migration `0037_feedback_ticket_history.sql` habilita e força RLS; a
`0038_feedback_ticket_history_integrity.sql` adiciona a identidade composta
`ticket_id + scope_id` e um trigger invoker que compara versão/status do evento
com o ticket pai e repete as invariantes de forma fail-closed. A
`0039_feedback_ticket_history_event_lineage.sql` reforça a função do trigger
para exigir `CRIADO → NOVO` e, quando disponível, `from_status` igual ao evento
anterior. A leitura e a
inserção exigem `current_setting('cvg.scope_id', true)` igual ao `scope_id`; o
repositório, antes de ler eventos, também resolve o ticket por
`ticket_id + scope_id`. A efetividade dos grants, owners, RLS e resistência a
um escritor SQL direto ainda exigem o preflight live; as declarações estáticas
não são convertidas em evidência de produção.

O modelo da timeline deliberadamente não possui `principal_id`, ator, papel,
request ID, correlation ID, descrição, resposta, SLA ou conteúdo clínico. Os
eventos `METADATA_ALTERADO` possuem apenas a linhagem allowlisted de prioridade
e responsabilidade, não o ator nem um texto do relato. A
trilha de auditoria completa e actor-aware permanece separada, conforme 0111 e
o contrato `GetAuditTrail`; para gravações da API ela é vinculada ao ticket e
persistida atomicamente em `audit_entries`, enquanto o endpoint state-only
continua redigindo esses campos. Assim, o histórico de estado não satisfaz
sozinho RF-004, mas a operação não perde a responsabilidade auditável quando
passa pelo boundary autenticado.

Tickets criados antes da migration não recebem backfill sintético. Por isso,
um ticket legado pode ter histórico vazio ou incompleto; a aplicação não deve
inventar eventos para preencher a lacuna. Antes de release, o gate live exige
executar em PostgreSQL descartável/autorizado a migration e verificar
efetivamente RLS, grants/owners, isolamento entre escopos, trigger append-only,
unicidade/concorrência, rollback transacional e o percurso browser→API→banco.
Sem essa evidência, a tabela permanece uma implementação local verificada, não
uma garantia de produção ou de auditoria completa.

### 8.5.1 Persistência bounded da metadata de triagem — FEEDBACK-054

A migration `0041_feedback_triage_metadata.sql` adiciona `priority` com default
`NORMAL` a `feedback_tickets` e `assignee_id` com FK restritiva para
`accounts`; não faz backfill sintético de histórico. A tabela de histórico
recebe os quatro campos de linhagem e aceita `METADATA_ALTERADO` mantendo
`(ticket_id, ticket_version)` único. As constraints e o trigger de linhagem
exigem que o ticket pai esteja na mesma versão/status e que a metadata anterior
seja coerente com o evento anterior quando essa evidência existir.

Para o contexto staff, a migration cria policy de `UPDATE` limitada ao escopo
transacional e trigger que rejeita alterações de participante, escopo, tipo,
descrição, estado, criação ou incremento de versão diferente de exatamente um;
transições existentes que usam contexto de participante continuam separadas.
O repositório executa CAS por `ticket_id + scope_id + version`, valida no
PostgreSQL a conta ativa/membership aceita/papel `MODERATOR` ou `ADMIN`, e grava
ticket, histórico e auditoria na mesma transação. A efetividade de RLS, grants,
ownership, trigger e concorrência continua dependente do gate PostgreSQL live.

## 8.6 Paginação keyset da fila de feedback — FEEDBACK-043

`feedback_tickets` permanece a fonte de verdade da fila. A leitura escopada
instala `cvg.scope_id` na mesma transação, filtra opcionalmente `status` e
ordena por `created_at DESC, id DESC`. A página busca uma linha além do limite,
descarta essa linha da projeção e deriva `hasNext`/`nextCursor`; não há contagem
total nem offset, evitando páginas instáveis quando novos relatos entram.

O cursor é um envelope base64url assinado com HMAC-SHA-256 por segredo
server-side. Seu fingerprint inclui `scope_id`, `status` e `limit`, portanto a
reutilização com outro escopo, filtro ou tamanho de página falha antes da
query. O token não é persistido, logado ou renderizado no item; pode ser
reconstruído pelo último `(created_at, id)` da página. Esta estratégia é
somente leitura e não muda as invariantes de criação/transição/histórico.

A migration `0040_feedback_queue_keyset_indexes.sql` mantém índices alinhados
às duas formas autorizadas de leitura: `(scope_id, created_at, id)` quando o
status não é filtrado e `(scope_id, status, created_at, id)` quando o filtro de
status é aplicado. Esses índices reduzem o risco de sort/scan não bounded na
fila administrativa, mas sua eficácia e plano real ainda exigem preflight
PostgreSQL autorizado.

O teste local cobre assinatura, adulteração, segredo incorreto, binding de
filtros, limite adicional, segunda página e contexto transacional. A prova
efetiva de RLS, owner/grants e concorrência PostgreSQL ainda depende de banco
CVG descartável/autorizado e não é substituída por fake ou fixture.
