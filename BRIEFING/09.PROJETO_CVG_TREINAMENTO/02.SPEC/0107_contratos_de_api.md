# 0107 — Contratos de API

**Base:** `/api/v1`  
**Estilo:** REST interno, nouns plurais, respostas envelopeadas e contratos Zod/OpenAPI compartilhados.  
**Fonte de autoridade:** API; web e worker são consumidores.

## 1. Envelope

Sucesso:

```json
{
  "success": true,
  "data": {},
  "meta": { "request_id": "..." }
}
```

Erro:

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Não foi possível processar a solicitação.",
    "details": []
  },
  "meta": { "request_id": "..." }
}
```

Detalhes internos, stack trace, SQL, token, senha, fonte, obra, PDF, foto, figura, tabela, capítulo, página e data de consulta nunca entram em resposta de participante.

## 2. Recursos e operações

| Método e rota | Caso de uso | Autorização |
|---|---|---|
| `GET /api/v1/me` | UC-021 | sessão própria |
| `PATCH /api/v1/me` | UC-021 | sessão própria + schema |
| `POST /api/v1/session/rotate` | rotação server-side | cookie de sessão + CSRF |
| `POST /api/v1/session/revoke` | logout/revogação | cookie de sessão + CSRF; resposta uniforme |
| `POST /api/v1/invitations` | UC-015 | administrador |
| `POST /api/v1/internal/accounts/:accountId/recovery` | recuperação controlada por link único | `MANAGE_ACCOUNT_LIFECYCLE` + conta interna ativa + escopo explícito |
| `POST /api/v1/recovery/accept` | aceita link único e cria nova sessão | anônimo; resposta uniforme para token inválido/expirado/consumido |
| `GET /api/v1/dashboard` | UC-009/016 | participante próprio; mod/admin escopado |
| `GET /api/v1/internal/reports/continuing-education` | UC-016 / RF-070/RF-073 | `VIEW_PROGRAM_METRICS` + papel interno ativo + escopo explícito |
| `GET /api/v1/learning-path` | UC-002/009 | participante próprio |
| `GET /api/v1/modules/:moduleId` | UC-003–008 | atividade elegível |
| `POST /api/v1/attempts` | UC-004–008 | participante elegível |
| `PATCH /api/v1/attempts/:attemptId/answers/:answerId` | UC-004–006 | dono, antes da submissão |
| `POST /api/v1/attempts/:attemptId/submit` | UC-004–006 | dono, uma vez |
| `GET /api/v1/corrections` | UC-005/006 | Ricardo/moderador escopado |
| `POST /api/v1/corrections/:correctionId` | UC-005/006 | Ricardo/moderador atribuído |
| `POST /api/v1/appeals` | UC-010 | participante próprio |
| `GET /api/v1/appeals?attemptId=<uuid>` | UC-010/018 | participante próprio, somente protocolos da tentativa própria |
| `POST /api/v1/appeals/:appealId/decision` | UC-018 | revisor autorizado |
| `GET /api/v1/feedback` | UC-022/023 | próprio ou escopo autorizado |
| `POST /api/v1/feedback` | UC-022 | sessão autenticada |
| `GET /api/v1/internal/feedback` | UC-023 | `VIEW_FEEDBACK_QUEUE` + escopo autorizado; leitura bounded |
| `PATCH /api/v1/internal/feedback/:ticketId` | UC-023 | `TRANSITION_FEEDBACK_TICKET` + escopo autorizado |
| `GET /api/v1/internal/feedback/:ticketId/history` | UC-023 / FEEDBACK-HISTORY-053 | `VIEW_FEEDBACK_QUEUE` + identidade interna ativa + escopo autorizado; leitura state-only bounded |
| `GET /api/v1/internal/appeals/:appealId/history` | UC-018 | `REVIEW_APPEAL` + escopo autorizado; somente leitura bounded |
| `GET /api/v1/internal/appeals/:appealId/impact-preview?decision=ANULAR_ITEM` | APPEAL-043 / UC-018 | `REVIEW_APPEAL` + escopo autorizado; preview candidato, somente leitura |
| `GET /api/v1/content/review-queue` | UC-013/014 | autor/revisor/admin |
| `POST /api/v1/content/drafts` | UC-012 | autor autorizado |
| `POST /api/v1/content/:contentId/review` | UC-013 | revisor/Ricardo |
| `POST /api/v1/content/:contentId/publish` | UC-014 | `CLINICAL_APPROVER` |
| `POST /api/v1/content/:contentId/withdraw` | UC-019 | `CLINICAL_APPROVER` |
| `GET /api/v1/audit` | UC-017 | auditor/admin/Ricardo |
| `GET /api/v1/authoring/:contentVersionId` | autoria interna | autor/revisor/Ricardo, nunca participante |

## 3. Projeções

`/dashboard`, `/learning-path`, `/modules`, `/attempts` e `/feedback` retornam DTOs de participante. Esses DTOs podem conter título autoral CVG, instrução, caso fictício, feedback e estado educacional; não podem conter a entidade editorial completa.

Rotas internas de autoria podem retornar fonte, localizador, protocolo e decisão clínica somente para papéis autorizados. Uma rota interna não pode ser chamada pelo navegador de participante por confiar apenas em ocultação visual; a autorização ocorre no servidor.

## 4. Paginação e filtros

- listas administrativas pequenas usam `page`/`per_page`, máximo 100;
- filas de auditoria, feedback interno e eventos usam cursor opaco;
- filtros são whitelisted por rota;
- `sort` não aceita coluna arbitrária;
- toda lista devolve `meta.total` ou `meta.has_next` conforme estratégia;
- resposta nunca inclui campos de outra organização/escopo.

### 4.1 — `GET /api/v1/audit` / UC-017

Entrada obrigatória: `scopeId` UUID e, opcionalmente, `action`, `resourceType`,
`resourceId`, `principalId`, `actorKind`, `outcome`, `from`, `to`, `cursor` e
`limit` (1–100, padrão 50). Chaves desconhecidas, datas inválidas, janela
invertida, cursor malformado e limite fora da faixa respondem `422`. O servidor
deriva a identidade da sessão e exige `VIEW_AUDIT_TRAIL` no escopo informado;
`scopeId` nunca é confiado como autorização só porque veio do navegador.

O `data` é uma projeção interna estrita `audit_trail` com ator, ação, recurso,
escopo, resultado, motivo, correlação, horário e hashes SHA-256 quando
existentes. Não contém corpo de requisição, cookie, token, prompt, conteúdo
clínico ou texto protegido. A resposta usa `meta.has_next` e
`meta.next_cursor`; o cursor é assinado com HMAC-SHA-256 por segredo
server-side e não é interpretado pelo cliente. A rota é somente leitura e não
habilita edição, exportação ou publicação.

## 5. Segurança operacional

- endpoints mutáveis exigem cookie de sessão seguro e CSRF;
- rate limit por IP e principal, mais restritivo em login, convite, recuperação, submissão e relatos;
- validação de papel e escopo em cada comando;
- respostas uniformes em login/recuperação para não enumerar contas;
- `request_id` é devolvido e correlacionado, sem revelar informações sensíveis;
- OpenAPI é gerado dos schemas, validado no CI e não documenta rotas internas para participantes.

## 6. Rotas materializadas no recorte F3-S2/F3-S3

As rotas abaixo são a implementação mínima verificável do núcleo atual. Rotas planejadas ainda não construídas permanecem no backlog e não são anunciadas como disponíveis.

| Método e rota | Entrada/saída | Regra de exposição |
|---|---|---|
| `POST /api/v1/internal/invitations` | schema estrito de e-mail, papéis, escopos e expiração; devolve o token uma única vez | somente sessão `ADMIN`; token não é logado nem persistido em claro |
| `POST /api/v1/invitations/accept` | token + duração da sessão; devolve `{status:"active"}` | não exige sessão anterior; responde `Set-Cookie` `__Host-cvg_session` com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` |
| `POST /api/v1/internal/accounts/:accountId/recovery` | `scopeId` + expiração entre 60 e 1.800 segundos; devolve token bruto somente uma vez | somente sessão autorizada por `MANAGE_ACCOUNT_LIFECYCLE`; a conta alvo deve estar `ACTIVE`; invalida links anteriores e revoga sessões |
| `POST /api/v1/recovery/accept` | token + duração bounded da nova sessão; devolve `{status:"active"}` | não exige sessão anterior; consome atomicamente o link e responde `Set-Cookie` `__Host-cvg_session` seguro |
| `POST /api/v1/internal/attempts/:attemptId/correct` | escopo, idempotência, nota, outcome, feedback e versão da rubrica | somente identidade clínica aprovada no escopo; resposta omite ator e IDs internos |
| `GET /api/v1/attempts/:attemptId/feedback` | nenhum corpo | somente participante dono; devolve feedback educacional, nunca autoria da correção |

Para `GET /api/v1/attempts/:attemptId/feedback`, a API resolve a tentativa no
contexto do participante autenticado e retorna `404/not_found` quando ainda não
há resultado de correção disponível. Quando há resultado, `data` é exatamente a
projeção strict `{ attemptStatus, attemptVersion, resultVersion, score,
outcome, feedback }`; `feedback` é plain text bounded. `participantId`,
`scopeId`, `resultId`, `correctedBy`, `ruleVersion`, resposta, gabarito, fonte e
qualquer metadado editorial ficam fora do envelope. A web trata `not_found` como
estado público de espera, sem converter a ausência em erro de convite ou
inventar resultado no cliente.

O endpoint administrativo de convite existe para operação interna e não envia e-mail nem chama fornecedor externo. A entrega do token é uma ação interna controlada; a tabela guarda somente `SHA-256(token)`. Aceite, ativação da conta, consumo do convite e criação da sessão são uma transação PostgreSQL. Falhas de convite usam resposta uniforme `not_found` para não permitir enumeração.

A recuperação controlada segue a mesma fronteira semântica, mas não ativa contas:
o endpoint interno só emite para conta `ACTIVE`, invalida solicitações abertas e
revoga sessões existentes na transação; o aceite anônimo consome o hash uma única
vez e cria nova sessão com o snapshot de papéis/escopos autorizado. Contas
`INVITED`, `SUSPENDED` e `DEACTIVATED` não são reativadas por este fluxo. O MVP
não armazena senha nem simula provedor de identidade, MFA, e-mail ou entrega
externa; falhas de recuperação usam `not_found` uniforme e não revelam se o
token existiu.

As tabelas de convite e recuperação usam RLS `ENABLE/FORCE` na migration `0019`,
e `accounts`/`sessions` usam RLS `ENABLE/FORCE` na migration `0020`.
Consultas internas estabelecem o `scopeId` em contexto transacional; os fluxos
anônimos estabelecem somente o hash SHA-256 do token apresentado; provisionamento
de conta e sessão usam contextos próprios na mesma transação da operação. A
policy não é usada como autorização única: a aplicação continua validando papel,
escopo, estado, expiração e consumo atômico.

## 7. Hardening de borda materializado no BUILD F3-S6

- `WEB_ORIGINS` configura as origens web permitidas; se ausente, API usa somente as origens locais derivadas de `API_HOST/API_PORT`;
- `GET`, `HEAD` e `OPTIONS` são seguros; uma mutação com cookie `__Host-cvg_session` exige `Origin` ou `Referer` permitido, ou metadado Fetch same-site/same-origin;
- a aceitação de convite continua possível sem sessão anterior e não é bloqueada pelo guard de CSRF;
- requisições não-health passam por rate limit por endereço remoto e rota, com janela e mapa limitados em memória; excesso responde `429` com `Retry-After`;
- `/health/live` e `/health/ready` permanecem disponíveis para liveness/readiness mesmo durante o limite de tráfego;
- rejeições de CSRF/rate limit não chegam ao caso de uso nem registram corpo, cookie, token ou payload;
- o rate limit é deliberadamente um controle por processo para o runtime interno atual. Se houver múltiplas réplicas, a política deve migrar para um armazenamento compartilhado antes de escalar horizontalmente.
- `POST /api/v1/session/rotate` revoga o hash antigo e cria o novo registro na mesma transação PostgreSQL; só devolve o novo cookie seguro;
- `POST /api/v1/session/revoke` revoga o hash recebido e sempre devolve cookie expirado sem revelar se havia sessão ativa;
- rotação/revogação não chamam Qdrant ou IA e não escrevem token em log, evento ou auditoria de payload.

## 8. Estado materializado no item 7 — estados de aprendizagem

A primeira fatia de API do item 7 materializa os estados persistidos do item 6 sem expor `participantId`, `scopeId`, `reviewerId`, regra interna ou autoria na projeção participante. Todos os corpos são schemas Zod estritos; transições carregam `version` e respondem `state_conflict` com HTTP 409 quando a versão está obsoleta ou o evento não é permitido.

| Método e rota | Contrato | Autorização |
|---|---|---|
| `POST /api/v1/internal/learning-assignments` | criação de atribuição com módulo, participante, escopo e disponibilidade | moderador/admin/identidade clínica aprovada no escopo |
| `POST /api/v1/internal/learning-assignments/:assignmentId/transition` | evento de atribuição com versão e contexto interno | moderador/admin/identidade clínica aprovada no escopo |
| `POST /api/v1/internal/assessment-workflows` | criação de workflow de resultado com regra versionada | moderador/admin/identidade clínica aprovada no escopo |
| `POST /api/v1/internal/assessment-workflows/:resultId/transition` | disponibilização/revisão/correção/anulação com versão | moderador/admin/identidade clínica aprovada no escopo |
| `POST /api/v1/feedback` | ticket participante com escopo, tipo e texto simples | participante dono do escopo |
| `PATCH /api/v1/internal/feedback/:ticketId` | triagem/tratamento/resolução com versão | moderador/admin/identidade clínica aprovada no escopo |
| `POST /api/v1/appeals` | contestação vinculada a tentativa própria | participante dono da tentativa e do escopo |
| `GET /api/v1/appeals?attemptId=<uuid>` | protocolos redigidos da tentativa própria; query estrita | participante dono da tentativa e do escopo |
| `POST /api/v1/internal/appeals/:appealId/transition` | autoatribuição, decisão ou solicitação de recálculo pendente com `appealId`, `scopeId`, `version` e evento strict | revisor/moderador/admin/identidade clínica aprovada no escopo; decisão e solicitação exigem o revisor persistido |

Na fila interna de feedback, `GET /api/v1/internal/feedback` aceita somente
`scopeId`, status opcional, `cursor` opaco e limite bounded; a projeção não inclui
`participantId`. O endpoint retorna os itens ordenados por `createdAt DESC, id
DESC` e usa `meta.has_next`/`meta.next_cursor` para avançar sem `COUNT(*)`. O
cursor é assinado server-side com HMAC-SHA-256 e vinculado a escopo, status e
limite; cursor malformado, adulterado ou pertencente a outro filtro responde
`422`. A resposta de dados não incorpora o token: ele permanece somente no
metadado do envelope. O `PATCH /api/v1/internal/feedback/:ticketId` aceita somente
`ticketId`, `scopeId`, `version` e evento. O participante do ticket é resolvido
no servidor por `ticketId + scopeId` sob contexto de escopo antes de reutilizar
o comando versionado; identidade enviada pelo navegador é rejeitada pelo
schema strict. A fila continua sem prioridade, assignment, SLA, resposta,
notificação ou decisão clínica.

### 8.1 Histórico state-only do ticket — FEEDBACK-HISTORY-053

`GET /api/v1/internal/feedback/:ticketId/history` é uma rota interna somente
de leitura. O path aceita somente `ticketId` UUID; o query string aceita somente
`limit` inteiro entre 1 e 100, padrão 100; o corpo é vazio. Chaves desconhecidas,
UUID inválido, limite fora da faixa ou valor não inteiro respondem `422`.

O servidor autentica a sessão, exige conta interna ativa, capability
`VIEW_FEEDBACK_QUEUE` e escopo autorizado, e resolve o ticket no PostgreSQL por
`ticketId + scopeId`. Participante não obtém acesso por alterar a URL. A rota
responde `401` sem sessão, `403` sem papel/capability/escopo, `404` quando o
ticket não existe no escopo autorizado, `422` para entrada inválida e `500`
para falha interna sem detalhes técnicos.

O sucesso usa o envelope comum e expõe somente a projeção abaixo, com no máximo
100 eventos ordenados por versão ascendente:

```json
{
  "success": true,
  "data": {
    "ticketId": "<uuid>",
    "events": [
      {
        "historyId": "<uuid>",
        "ticketId": "<uuid>",
        "ticketVersion": 0,
        "eventType": "CRIADO",
        "toStatus": "NOVO",
        "createdAt": "<iso-8601>"
      }
    ]
  },
  "meta": { "request_id": "<request-id>" }
}
```

`STATUS_ALTERADO` também contém `fromStatus`; os estados e tipos são
allowlisted. A resposta não contém `scopeId`, `participantId`, descrição,
resposta, prioridade, responsável, SLA, ator, correlação, fonte, conteúdo
clínico ou texto do relato. A operação não altera ticket, status ou auditoria.

Esta rota não é `/api/v1/audit` e não pretende cumprir o contrato de auditoria
completa com ator de 0106/0111. Ela oferece apenas uma linha do tempo técnica de
estado; a identificação do responsável e a correlação de ações permanecem na
trilha de auditoria própria quando aplicável. Tickets anteriores à migration
`0037_feedback_ticket_history.sql` não recebem evento sintético e podem exibir
histórico vazio/incompleto.

A disponibilidade local da rota não libera produção. O gate live deve demonstrar
PostgreSQL/RLS/grants efetivos, isolamento entre escopos, trigger append-only,
atomicidade e rollback da gravação, concorrência/versionamento e o percurso
browser→API→PostgreSQL em ambiente descartável/autorizado. Até esse preflight,
o contrato é apenas verificado localmente.

As rotas internas recebem somente o escopo necessário como contexto validado pelo
servidor; a capacidade e o escopo do principal são verificados antes do caso de
uso. Na transição de contestação, o `participantId` é resolvido do protocolo
persistido e o revisor é o `principalId` autenticado; nenhum dos dois é aceito
como identidade escolhida pelo navegador. A API não confia em ocultação visual e
nunca permite que o participante chame uma operação interna por alterar a URL.

Na primeira fatia de contestação, `POST /api/v1/appeals` só aceita tentativa
própria em estado corrigido (`CORRIGIDA_AUTOMATICAMENTE` ou
`CORRIGIDA_HUMANAMENTE`) e verifica no servidor que o `itemId` pertence à
atividade atribuída ao participante e que o conteúdo seja avaliável (`QUESTAO` ou
`CASO`). A consulta de item usa o vínculo participante–atividade sem depender de
a atribuição ainda estar em estado disponível, permitindo acompanhar um
resultado já concluído sem reabrir a atividade.

`GET /api/v1/appeals?attemptId=<uuid>` valida uma query strict, resolve a
tentativa no contexto do participante e retorna no máximo 100 protocolos
ordenados pela criação. A projeção contém apenas `appealId`, `attemptId`,
`itemId`, `createdAt`, `dueAt`, `status`, `version` e decisão allowlisted. Não
retorna justificativa, `reviewerId`, resposta, score, gabarito, fonte ou claim
de competência. A primeira fatia não simula a atribuição de revisor,
justificativa da decisão, recálculo versionado, identificação/notificação de
afetados ou entrega externa.

Após a fila interna, `POST /api/v1/internal/appeals/:appealId/transition`
materializa apenas o limite seguro de APPEAL-038: o revisor autenticado pode
assumir o protocolo, decidir e solicitar que o recálculo seja executado. A rota
não recebe `participantId`/`reviewerId`, não expõe o resultado interno e não
oferece `CONCLUIR_RECALCULO` ou `ENCERRAR` antes do motor de recálculo
versionado/idempotente. `RECALCULO_PENDENTE` é um estado de espera, não uma nova
nota ou aprovação clínica.

## 9. Jornada agregada materializada no item 9

### Avaliação curricular interna e contexto de participante

`POST /api/v1/internal/curriculum/modules/:moduleId/evaluate` é uma operação
moderada e nunca confia no `participantId` enviado pelo chamador apenas porque
o chamador possui capability no escopo. Antes de delegar ao caso de uso, a API
deve provar que a conta está ativa, possui membership aceita com papel
`PARTICIPANT` e pertence ao `scopeId` solicitado. Ausência do resolver ou
resposta negativa falha fechado com `403`, sem avaliar nem persistir o runtime.

O PostgreSQL repete a invariável com `FORCE RLS` em
`curriculum_runtime_states`: leituras, inserções e atualizações do contexto de
participante exigem a mesma membership; leitura staff só é elegível quando não
há `participant_id` no contexto transacional. Essa defesa não substitui a
autorização da API, e não altera a fronteira pública nem cria competência
prática. A função `SECURITY DEFINER` usada pela policy não tem `EXECUTE` para
`PUBLIC`; o bootstrap concede o privilégio apenas à role de aplicação
provisionada, e a migração não assume que a role exista antes do provisionador.

`GET /api/v1/learning-path` exige sessão ativa de participante, posse e pelo menos um escopo autorizado. O servidor passa os escopos da sessão ao caso de uso, consulta PostgreSQL com contexto transacional/RLS e publica somente:

- atribuições sem `participantId`/`scopeId`;
- atividades, status, tentativa mais recente e `nextAction`;
- workflows de resultado sem tentativa, participante, escopo ou regra interna;
- runtimes redigidos, sem objetivos internos, gabarito ou competência prática;
- uma `nextAction` agregada;
- opcionalmente, `nextActionTarget: { kind: "ACTIVITY", activityId }` quando a
  ação agregada é `INICIAR_ATIVIDADE`, `RETOMAR_ATIVIDADE` ou
  `EXECUTAR_REMEDIACAO`, desde que o alvo pertença à própria lista de
  atividades autorizadas; para remediação, o servidor exige o vínculo interno
  explícito do mesmo módulo e atividade em estado iniciável.

O contrato é estrito, rejeita campos internos, rejeita tentativa publicada
parcialmente e rejeita alvo que não esteja na projeção de atividades. A API
rederiva `nextAction` e `nextActionTarget` no próprio boundary público, exigindo
para remediação o assignment/proveniência e módulo compatíveis já validados pelo
caso de uso. A web não calcula a próxima ação nem escolhe um módulo por
`moduleId`: usa o alvo server-side, mantém a sessão client-side e atualiza
`?activityId` apenas como ponteiro codificado. Deep links continuam compatíveis
com a atividade solicitada; autorização e leitura da atividade permanecem
server-side.

Na projeção interna de staff, cada participante também carrega `scopeIds` como
metadado de roteamento de ações administrativas. O servidor deriva esses
escopos do membership participante–escopo, valida que todos pertencem aos
escopos da sessão e a web não os renderiza. Reenvio de convite e transição de
conta escolhem somente um desses escopos autorizados; o navegador nunca pode
ampliar a lista nem confiar no primeiro escopo agregado.

## 10. Rotas internas de autoria materializadas no item 10

| Método e rota | Entrada/saída | Autorização e exposição |
|---|---|---|
| `GET /api/v1/internal/content/:contentId/versions/:version/authoring` | registro interno, preflight, última revisão, escolhas/gabarito, rubrica e referências internas | somente `AUTHOR`/identidade clínica aprovada no escopo; participante recebe 403 |
| `POST /api/v1/internal/content/:contentId/review` | versão, escopo, decisão e justificativa | `MODERATE_CONTENT` para ajustes ou `APPROVE_CLINICAL_CONTENT` para aprovação; o servidor impede autoaprovação |

As respostas internas são validadas pelo contrato `internalAuthoringRecordProjectionSchema`. A API não recebe gabarito no corpo público nem confia na tela para autorização. A publicação continua recusada enquanto o repositório não calcular `publicationReady` a partir do preflight e da revisão clínica aprovada.

## 11. Relatório interno de participação digital — CPD-REPORTING-026

`GET /api/v1/internal/reports/continuing-education` aceita somente query
estrita com `scopeId` obrigatório e filtros opcionais `moduleId` e
`accountStatus`. O servidor valida que o escopo pertence à sessão, aplica o
contexto PostgreSQL antes da leitura e deriva o resultado de
`learning_assignments` e dos minutos do catálogo curricular.

O contrato retorna, por escopo, participantes autorizados, módulos atribuídos
e concluídos, percentual quando o denominador existe, minutos concluídos,
horas digitais derivadas, status da conta e última atividade disponível. A
resposta carrega os marcadores `ATIVIDADE_MODULAR_DIGITAL`,
`NAO_CREDENCIADAS` e `PROIBIDO_MVP`. Esses minutos/horas são evidência interna
de participação na trilha; não são CPD válido/acreditado, certificado, nota
global, competência prática, autonomia clínica ou decisão de RH. O endpoint
não cria filtros de coorte, área ou nível enquanto esses atributos não
existirem no domínio persistido, não oferece ranking/exportação e não expõe
fontes, gabaritos, objetivos internos ou conteúdo clínico.

## 12. Fila interna de revisão clínica — EDITORIAL-QUEUE-027

`GET /api/v1/internal/session/scopes` exige sessão ativa de identidade editorial
e retorna somente os `scopeIds` já presentes na sessão, para que a superfície
interna não dependa de um UUID digitado manualmente. `GET
/api/v1/internal/content/review-queue` exige sessão ativa e query estrita:
`scopeId` UUID obrigatório, `status` opcional em
`EM_REVISAO_CLINICA|AJUSTES_SOLICITADOS` e `limit` opcional de 1–100 (padrão
50). O servidor valida `VIEW_CONTENT_REVIEW_QUEUE` e o pertencimento do
escopo antes do caso de uso; o frontend não pode ampliar escopos nem escolher
colunas/ordenação.

O envelope retorna `kind: content_review_queue`, filtros normalizados e itens
redigidos. Cada item limita-se a `contentId`, versão, escopo, módulo, sessão,
título, autor, estado, preflight, última decisão resumida, `canOpenAuthoring`,
`updatedAt` e `nextAction`; o endpoint não anuncia paginação sem cursor. Prompt,
gabarito, rubrica, fontes e conteúdo autoral completo ficam exclusivamente na
rota interna de autoria. A rota é somente leitura: não aprova, publica, altera
conteúdo ou consulta IA/Qdrant.

`GET /api/v1/internal/content/:contentId/versions/:version/authoring` exige
`scopeId` UUID na query antes da leitura. O servidor calcula
`availableActions`, aplica RLS transacional e impede que um autor consulte
registro de outro autor; a projeção completa continua restrita a papéis
internos autorizados.

## 13. Reflexão digital materializada — REFLECTION-035

Atividades publicadas com itens `REFLEXAO` reutilizam a tentativa e a resposta
idempotente já existentes. A leitura participante de
`GET /api/v1/activities/:activityId` pode incluir um resumo `reflection` com
`NAO_INICIADA`, `EM_ANDAMENTO` ou `CONCLUIDA`, a próxima ação (`INICIAR_REFLEXAO`,
`RETOMAR_REFLEXAO`, `ENVIAR_REFLEXAO` ou `PROXIMA_ACAO`), contagens e somente as
respostas do próprio participante. A persistência lê a tentativa mais recente e
restringe as respostas aos itens `REFLEXAO` da atividade dentro da mesma transação
com contexto de participante.

O contrato não possui `score`, gabarito, rubrica ou competência prática; carrega
`evidence: REFLEXAO_DIGITAL` e `practicalCompetenceClaim: PROIBIDO_MVP`. A API
valida que cada resposta pertence a item `REFLEXAO` publicado, e a web reidrata a
resposta após refresh, salvamento ou submissão.

`GET /api/v1/internal/reports/reflections?scopeId=<uuid>` é a leitura interna do
agregado gerencial bounded. A query é strict e exige `scopeId`; o servidor exige
`VIEW_PROGRAM_METRICS` para conta `ACTIVE` com o escopo correspondente antes de
chamar o caso de uso. A resposta tem somente `kind:
reflection_management_aggregate`, `scopeId`, `generatedAt`, módulos `M01`–`M24`,
`totalAssignments`, contagens `NAO_INICIADA`/`EM_ANDAMENTO`/`CONCLUIDA`,
`evidence: REFLEXAO_DIGITAL` e `practicalCompetenceClaim: PROIBIDO_MVP`.

O repositório lê membros participantes dentro do escopo em uma transação, troca
o contexto PostgreSQL para `{scopeId, participantId}` por participante e seleciona
somente IDs de item respondido; nunca seleciona `answers.response`. A tentativa
mais recente é determinística por `updatedAt`, `version` e `id`. Cada par
`participantId/activityId` entra uma vez, e o denominador é a quantidade de
atribuições digitais publicadas naquele módulo. Esta primeira fatia aceita custo
O(participantes) por não ampliar a policy staff de `answers` nem criar migração;
uma consulta set-based futura exige evidência de escala e revisão de segurança.

Agregado gerencial, apelações e a jornada completa continuam itens separados do
backlog; esta fatia não altera schema, publicação clínica, estado de nota ou
competência prática.

## 14. Protocolo de contestação do participante — APPEAL-036

O boundary participante usa o domínio de `AppealState` e a persistência
existente de `appeals`, sem migration nova. O caso de uso de leitura exige
`participantId`, `scopeId` e `attemptId`, e o adapter PostgreSQL aplica o
contexto transacional antes de filtrar por participante, escopo e tentativa.
Uma consulta cruzada retorna vazio por RLS/contexto e não enumera protocolos de
outra identidade.

O endpoint de leitura exige a capability própria `VIEW_OWN_APPEALS`; a criação
usa `CREATE_APPEAL`. O servidor continua sendo a fonte de autorização e a
unicidade condicional de `appeals` impede mais de um protocolo aberto para a
mesma questão da mesma tentativa. Conflito de versão/duplicata permanece
`state_conflict` (409). A web participante oferece estados de carregamento,
vazio, erro/retry, terminal e formulário sem transportar identificadores
internos para o texto visual.

## 15. Fila interna de revisão de contestação — APPEAL-037

`GET /api/v1/internal/appeals/review-queue` exige sessão autenticada e query
strict `{ scopeId: uuid, status?: AppealStatus, limit?: 1..100 }`, com limite
padrão 50. O servidor valida `REVIEW_APPEAL` e o pertencimento do escopo antes
de chamar a aplicação. Chaves de query desconhecidas, status não allowlisted,
UUID inválido e limite fora da faixa retornam `422`; participante, autor,
conta inativa ou equipe fora do escopo retornam `403`; ausência da dependência
retorna `500` sem detalhes internos.

O envelope `kind: appeal_review_queue` contém `scopeId`, `generatedAt`, filtros
normalizados e itens ordenados por prazo, criação e identificador. Cada item
limita-se a `appealId`, `participantId`, `attemptId`, `itemId`, `justification`,
`createdAt`, `dueAt`, `status`, `version`, `reviewerId` opcional e `decision`
opcional. A rota é somente leitura e não retorna `answer`, `response`, `score`,
`answerKey`, `sourceRefs`, `prompt`, rubrica, fonte ou claim de competência
prática. A superfície de operações usa somente o necessário para triagem e não
renderiza UUIDs internos; não há botão ou comando de mutação nesta fatia.

## 15.1 Transição de decisão com rationale — APPEAL-039

`POST /api/v1/internal/appeals/:appealId/transition` mantém o corpo strict com
`appealId`, `scopeId`, `version`, `event`, `decision` quando aplicável e
`decisionRationale` somente para `DECIDIR`. `participantId`, `reviewerId`,
`decisionAt` e `decisionCorrelationId` são rejeitados como entrada. O servidor
usa o principal autenticado como ator, encaminha o `request_id` como correlação
interna e gera a data no caso de uso.

O retorno segue a projeção pública allowlisted e não inclui rationale, data,
correlação ou revisor, mesmo quando a transição ocorre numa rota interna. A
fila interna é o único contrato desta fatia que pode ler os metadados de decisão
com autorização e escopo; a rota não recalcula nota, altera tentativa, publica
aprovação ou encerra protocolo.

## 15.2 Preview candidato de `ANULAR_ITEM` — APPEAL-043

`GET /api/v1/internal/appeals/:appealId/impact-preview` aceita somente o path
UUID, query strict `{ decision: "ANULAR_ITEM" }` e corpo vazio. O servidor não
aceita `scopeId`, `participantId`, `attemptId`, `itemId`, ator ou versão no
request. A autenticação exige conta interna ativa, `REVIEW_APPEAL` e algum
escopo autorizado; o escopo efetivo é resolvido pelo protocolo persistido.
Parâmetro scalar repetido é rejeitado, inclusive quando um dos valores é
válido.

O sucesso usa o envelope comum e retorna uma projeção bounded com o cenário
candidato, status/versão da contestação, referências do alvo, status/versão da
tentativa, presença/versão do resultado mais recente e limites operacionais.
Não há score, delta, outcome, regra, peso, denominador, lista/contagem de
afetados, resposta, feedback, gabarito, fonte, rationale, participante ou
escopo. O valor `decision` não significa que `DECIDIR` foi executado.

`401` representa ausência de sessão; `403`, falta de capability/escopo; `404`,
protocolo não visível; `409`, protocolo já decidido, em recálculo ou encerrado;
`422`, path/query/body inválido; e `500`, inconsistência referencial ou falha
interna. A operação não grava estado, resultado, outbox, histórico, auditoria,
notificação ou publicação. Não existe, nesta fatia, recálculo ou consequência
acadêmica para `ANULAR_ITEM`.

## 15.3 Atribuição inicial a partir do diagnóstico — ADAPTIVE-044

`POST /api/v1/internal/diagnostics/:diagnosticResultId/assign` é uma rota
interna para materializar a trilha inicial de um resultado B-07 já persistido.
O corpo é strict e aceita somente `{ scopeId }`; `participantId` e qualquer
lista de módulos fornecida pelo cliente são rejeitados. A sessão precisa estar
ativa, possuir `MANAGE_LEARNING_ASSIGNMENTS` e conter o escopo solicitado.

O servidor valida UUID, reidrata o diagnóstico pelo identificador + escopo e
chama `AssignCurriculumFromDiagnostic`. A resposta contém somente
`diagnosticResultId` e atribuições públicas (`assignmentId`, `moduleId`,
`availableAt`, `status`, `version` e eventual `blockReason`); identidade do
participante, dados editoriais, gabarito, fonte, prompt e competência prática
ficam fora do envelope. A avaliação B-07 pode disparar a mesma operação após
persistir o resultado, e o endpoint permite retry operacional seguro.

As respostas de 401/403/404/409/422 seguem o envelope comum. A rota não publica
conteúdo, não decide nota, não dispensa núcleo obrigatório e não autoriza IA,
Qdrant ou frontend a alterar estado.

Quando a atribuição é materializada, o servidor também pode criar os vínculos
internos em `activity_assignments` para atividades publicadas que carreguem
`moduleId` curricular explícito. Essa relação não altera a resposta pública da
rota: `participantId`, `sourceDiagnosticResultId`, `learningAssignmentId`,
proveniência, conteúdo interno e status de banco continuam fora do envelope.
Atividades sem mapeamento explícito não são escolhidas por slug e não recebem
atribuição adaptativa automaticamente.
