# AUDIT — FEEDBACK-HISTORY-053: timeline interna append-only de relatos

**Data:** 2026-08-24
**Item:** `FEEDBACK-HISTORY-053`
**Commit de código verificado nesta rodada:** `4680675555aac40246b80bc8ef099a7b2252ebfb` (sobre `06b8f3720a9841d6d2335e51b28a8eb156a9191f` e a base `5f93cbb55732da2b89c0d6322ccc2a00e76cbd40`)
**Status:** `verified-with-gaps`
**Veredito local:** `CONDITIONAL PASS`

## Objetivo e limite

Esta fatia fecha a rastreabilidade operacional mínima da fila interna de
relatos. Moderador, administrador ou identidade clínica aprovada podem ler
uma timeline bounded por `ticketId`, dentro de escopos autorizados, sem mutação
e sem receber texto livre, participante, prioridade, atribuição, SLA, resposta,
notificação, anexo ou decisão clínica.

O recorte não implementa resposta ao participante, priorização, assignment,
SLA, provider/MFA, retirada clínica, notificação externa, concorrência live,
operação produtiva ou workflow remoto.

## Aderência ao produto e à SPEC

- `PRD-RF-072`, `PRD-RF-073`, `PRD-RF-104` e `UC-023` são atendidos apenas no
  subfluxo de consulta interna escopada e reconstrução de status.
- `SPEC-0106`, `SPEC-0107`, `SPEC-0111`, `SPEC-0114` e `SPEC-0118` são
  materializados por contrato strict, capability server-side, projeção
  allowlisted, RLS contextual, testes e superfície web bounded.
- A IA, Qdrant e qualquer fonte bibliográfica não participam da decisão, do
  histórico ou da projeção.

## Implementação verificada

| Camada | Evidência |
| --- | --- |
| Contrato | `packages/contracts/src/feedback-ticket-history.ts`: path/query/projection strict, limite 1–100, eventos `CRIADO`/`STATUS_ALTERADO`, shape de status e sem `scopeId`, `participantId` ou `description`. |
| Aplicação | `packages/application/src/feedback-ticket-history-use-cases.ts`: `VIEW_FEEDBACK_QUEUE`, conta ativa, escopo autorizado, fail-closed para escopo/evento/limite inválidos, ordenação determinística e resposta nula fora do escopo. |
| Persistência | `0037_feedback_ticket_history.sql` mantém FK base, unicidade `(ticket_id, ticket_version)`, checks, trigger append-only, revoke de `UPDATE/DELETE`, `ENABLE/FORCE RLS` e policies por `cvg.scope_id`; `0038_feedback_ticket_history_integrity.sql` adiciona a FK composta e a validação do pai; `0039_feedback_ticket_history_event_lineage.sql` fecha a linhagem de eventos novos. |
| Transação | `saveTicket` lê a versão anterior, salva o ticket, insere o evento e grava uma entrada `audit_entries` metadata-only na mesma transação; ator/request/correlation são server-owned e não entram na projeção da timeline. |
| Repository | `createFeedbackTicketHistoryRepository` define contexto por escopo, confirma a existência do ticket pelo mesmo ticket/escopo, lê no máximo 100 eventos e mapeia somente metadados allowlisted. |
| HTTP | `GET /api/v1/internal/feedback/:ticketId/history`, autenticação, `401/403/404/422/500` bounded, template de rota para rate limit/telemetria e projeção sem campos internos. |
| Web | `apps/web/app/operations/page.tsx`: botão de leitura, estados loading/error/forbidden/empty, timeline sem identificadores internos e nenhuma ação de mutação. |
| E2E | `tests/e2e/operations-dashboard.spec.ts` consulta a rota histórica mockada, verifica criação/status, somente leitura e ausência de `participantId`/`scopeId`. |

## TDD e verificação

O ciclo RED foi observado com módulos/rota ausentes nos testes focalizados de
contrato, aplicação e persistência; o HTTP começou em `404/unmatched`; e o E2E
não encontrou a timeline antes da UI. O GREEN foi obtido após o contrato,
caso de uso, migration/repository, API, runtime e web serem ligados.

Evidências executadas nos commits de código `06b8f3720a9841d6d2335e51b28a8eb156a9191f` e `4680675555aac40246b80bc8ef099a7b2252ebfb`:

- `pnpm typecheck` — PASS.
- `pnpm build` — PASS, 12 workspaces.
- `pnpm lint` — PASS.
- `pnpm test:coverage` — **134 arquivos PASS, 29 arquivos skipped; 665 testes
  PASS, 35 skipped; 84,28% statements, 80,13% branches, 86,14% functions,
  84,99% lines**.
- `pnpm test:e2e` — **31/31 PASS**.
- `pnpm verify:migrations` — PASS, 40 migrations até `0039_feedback_ticket_history_event_lineage`.
- `pnpm verify:ci-contract` — PASS.
- `pnpm verify:secrets` — PASS, scan limpo.
- `pnpm verify:exposure` — PASS.
- `pnpm verify:architecture` — 2/2 PASS.
- `pnpm verify:documentation` — PASS.
- `pnpm verify:product-definition` — PASS.
- `pnpm audit --audit-level=high` — sem vulnerabilidades conhecidas.
- `git diff --cached --check` e `git diff --check` — PASS.

## P1 — integridade de banco e contexto de auditoria

Arquivos alterados nesta correção delimitada:

- `packages/persistence/drizzle/0038_feedback_ticket_history_integrity.sql`;
- `packages/persistence/drizzle/0039_feedback_ticket_history_event_lineage.sql`;
- `packages/persistence/drizzle/meta/_journal.json`;
- `packages/persistence/src/schema.ts`;
- `packages/persistence/src/learning-state-repository.ts`;
- `packages/persistence/src/learning-state-repository.test.ts`;
- `packages/application/src/learning-state-use-cases.ts`;
- `apps/api/src/http.ts` e `apps/api/src/http.test.ts`;
- `tests/integration/migration-governance.test.ts`;
- `tests/integration/postgres-learning-state.test.ts`.

Invariantes exatas:

1. `feedback_tickets(id, scope_id)` recebe índice único para ser a identidade
   composta do pai.
2. `feedback_ticket_history(ticket_id, scope_id)` passa a referenciar essa
   identidade composta com `ON DELETE RESTRICT`, substituindo a FK somente por
   `ticket_id`; a constraint é `NOT VALID` para não reescrever, apagar ou
   fabricar eventos para rows legados. Inserts novos continuam sujeitos à FK.
3. Um trigger `BEFORE INSERT`, com `SECURITY INVOKER` e o contexto RLS do
   chamador, lê o pai com `FOR UPDATE` e recusa pai inexistente ou escopado de
   forma divergente.
4. O mesmo trigger exige `ticket_version = feedback_tickets.version` e
   `to_status = feedback_tickets.status` no momento do insert.
5. O trigger preserva e reforça o shape existente: `CRIADO` somente na versão
   `0`, sem `from_status` e com `to_status = NOVO`; `STATUS_ALTERADO` somente a
   partir da versão `1`, com `from_status` e, quando existe, igual ao
   `to_status` do evento predecessor. O allowlist de eventos/status continua
   nos checks de `0037`.
6. O trigger append-only, `REVOKE UPDATE/DELETE`, `ENABLE/FORCE RLS` e as
   policies de `0037` não são removidos ou desabilitados. Tickets legados sem
   histórico continuam válidos; rows legados não recebem backfill.
7. As gravações de feedback exigem `actorId`, `requestId` e `correlationId`
   UUID server-owned; API e caso de uso propagam esses valores sem aceitar
   equivalentes do payload. A mesma transação grava `audit_entries` com ação,
   recurso, escopo, resultado, request e correlação, enquanto a timeline
   state-only continua sem esses campos.

Evidência local desta correção: RED por arquivo `0038`/`0039` ausente e RED
focal para o correlation header; GREEN em
`tests/integration/migration-governance.test.ts` com 9/9, nos testes de
persistência/API e na regressão completa; `pnpm typecheck`,
`pnpm verify:migrations` (40 migrações até `0039`) e Prettier passaram. Os
commits `06b8f3720a9841d6d2335e51b28a8eb156a9191f` e
`4680675555aac40246b80bc8ef099a7b2252ebfb` contêm o hardening; a prova live
continua ausente.

## Integridade, segurança e dados

- A leitura nunca aceita `scopeId` do cliente; o escopo vem da sessão e do
  contexto transacional.
- Ticket inexistente ou fora dos escopos autorizados retorna `404` sem
  enumeração; participante não recebe capability nem projeção interna.
- O banco impede update/delete por trigger e privilégios; a role de aplicação
  recebe revoke explícito no provisionador após os grants amplos de CI.
- O histórico não armazena descrição, resposta, participante, bibliografia,
  foto, PDF ou dado clínico.
- A persistência rejeita feedback writes sem `actorId`, `requestId` e
  `correlationId` UUID server-owned; a API grava ações metadata-only em
  `audit_entries`, e a projeção da timeline continua sem ator/correlation.
- Tickets criados antes de `0037` não ganham histórico retroativo inventado;
  sua timeline pode começar vazia até uma nova gravação/versionamento. Esse é
  um limite de compatibilidade explicitamente mantido para não falsificar
  eventos históricos.

## Gaps e evidência não obtida

- `pnpm test:integration:live` não foi executado: o ambiente não possui
  `CVG_TEST_DATABASE_URL`. Portanto não há claim live de PostgreSQL, RLS,
  grants, owners, trigger efetivo ou browser→API→PostgreSQL.
- Não há prova de produção, deploy, workflow remoto same-SHA, operação externa,
  carga/failover/restore, provider/MFA ou aprovação clínica.
- A timeline registra estados técnicos de triagem; não equivale a resposta ao
  participante, SLA, prioridade, atribuição, competência clínica ou publicação.

## Crítica independente final — Wegener

Wegener revisou o código e os testes em modo somente leitura e retornou
`CONDITIONAL PASS`, sem P0. A crítica encontrou quatro P1: correlation ID de
feedback aceitando header externo, ausência de validação de linhagem
`from_status`/`CRIADO → NOVO`, limpeza live com `TRUNCATE` amplo e asserts que
não comprovavam request/correlation IDs; também reiterou que a ausência do
banco live impede qualquer claim de produção.

Os P1 codificáveis foram corrigidos no commit
`4680675555aac40246b80bc8ef099a7b2252ebfb`: feedback usa somente o request ID
gerado no servidor como correlation, `0039` reforça a linhagem de eventos novos,
o fixture remove somente seus próprios recursos por ticket/escopo e verifica os
quatro IDs de auditoria. A limitação live permanece deliberadamente aberta;
testes textuais de migration não substituem PostgreSQL real. O sidecar sem
`ticket_version` explícito e a compatibilidade `NOT VALID`/legado permanecem
P2 documentados.

## Conclusão

O subfluxo local bounded está implementado e observável com cobertura acima do
gate, regressão completa e rastreabilidade de código/teste/migration. O item é
`verified-with-gaps` e `CONDITIONAL PASS` local: a ausência de ambiente live
impede afirmações de segurança/produção além das garantias estáticas e dos
testes sintéticos executados.
