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
| `GET /api/v1/dashboard` | UC-009/016 | participante próprio; mod/admin escopado |
| `GET /api/v1/learning-path` | UC-002/009 | participante próprio |
| `GET /api/v1/modules/:moduleId` | UC-003–008 | atividade elegível |
| `POST /api/v1/attempts` | UC-004–008 | participante elegível |
| `PATCH /api/v1/attempts/:attemptId/answers/:answerId` | UC-004–006 | dono, antes da submissão |
| `POST /api/v1/attempts/:attemptId/submit` | UC-004–006 | dono, uma vez |
| `GET /api/v1/corrections` | UC-005/006 | Ricardo/moderador escopado |
| `POST /api/v1/corrections/:correctionId` | UC-005/006 | Ricardo/moderador atribuído |
| `POST /api/v1/appeals` | UC-010 | participante próprio |
| `POST /api/v1/appeals/:appealId/decision` | UC-018 | revisor autorizado |
| `GET /api/v1/feedback` | UC-022/023 | próprio ou escopo autorizado |
| `POST /api/v1/feedback` | UC-022 | sessão autenticada |
| `PATCH /api/v1/feedback/:ticketId` | UC-023 | mod/admin escopado |
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
- filas de auditoria e eventos usam cursor opaco;
- filtros são whitelisted por rota;
- `sort` não aceita coluna arbitrária;
- toda lista devolve `meta.total` ou `meta.has_next` conforme estratégia;
- resposta nunca inclui campos de outra organização/escopo.

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
| `POST /api/v1/internal/attempts/:attemptId/correct` | escopo, idempotência, nota, outcome, feedback e versão da rubrica | somente identidade clínica aprovada no escopo; resposta omite ator e IDs internos |
| `GET /api/v1/attempts/:attemptId/feedback` | nenhum corpo | somente participante dono; devolve feedback educacional, nunca autoria da correção |

O endpoint administrativo de convite existe para operação interna e não envia e-mail nem chama fornecedor externo. A entrega do token é uma ação interna controlada; a tabela guarda somente `SHA-256(token)`. Aceite, ativação da conta, consumo do convite e criação da sessão são uma transação PostgreSQL. Falhas de convite usam resposta uniforme `not_found` para não permitir enumeração.

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
| `POST /api/v1/internal/appeals/:appealId/transition` | atribuição de revisor, decisão e recálculo com versão | revisor/moderador/admin/identidade clínica aprovada no escopo |

As rotas internas recebem o participante-alvo e o escopo somente como contexto validado pelo servidor; a capacidade e o escopo do principal são verificados antes do caso de uso. A API não confia em ocultação visual e nunca permite que o participante chame uma operação interna por alterar a URL.

## 9. Jornada agregada materializada no item 9

`GET /api/v1/learning-path` exige sessão ativa de participante, posse e pelo menos um escopo autorizado. O servidor passa os escopos da sessão ao caso de uso, consulta PostgreSQL com contexto transacional/RLS e publica somente:

- atribuições sem `participantId`/`scopeId`;
- atividades, status, tentativa mais recente e `nextAction`;
- workflows de resultado sem tentativa, participante, escopo ou regra interna;
- runtimes redigidos, sem objetivos internos, gabarito ou competência prática;
- uma `nextAction` agregada.

O contrato é estrito, rejeita campos internos e rejeita tentativa publicada parcialmente. A rota é consumida pela web após o aceite de convite; deep links continuam compatíveis com a atividade solicitada.

## 10. Rotas internas de autoria materializadas no item 10

| Método e rota | Entrada/saída | Autorização e exposição |
|---|---|---|
| `GET /api/v1/internal/content/:contentId/versions/:version/authoring` | registro interno, preflight, última revisão, escolhas/gabarito, rubrica e referências internas | somente `AUTHOR`/identidade clínica aprovada no escopo; participante recebe 403 |
| `POST /api/v1/internal/content/:contentId/review` | versão, escopo, decisão e justificativa | `MODERATE_CONTENT` para ajustes ou `APPROVE_CLINICAL_CONTENT` para aprovação; o servidor impede autoaprovação |

As respostas internas são validadas pelo contrato `internalAuthoringRecordProjectionSchema`. A API não recebe gabarito no corpo público nem confia na tela para autorização. A publicação continua recusada enquanto o repositório não calcular `publicationReady` a partir do preflight e da revisão clínica aprovada.
