# 0539 — Auditoria de isolamento de escrita em feedback — FEEDBACK-055

## Decisão

**CONDITIONAL PASS / COMPLETED_WITH_GAPS.** A fatia local está implementada e
verificada estaticamente, mas a efetividade de RLS, grants, trigger, CAS e
rollback ainda exige PostgreSQL live autorizado. Esta auditoria não libera
produção, piloto, publicação clínica ou qualquer claim de competência prática.

## Escopo e objetivo

FEEDBACK-055 corrige o risco identificado na policy legada de
`feedback_tickets`: o contexto de participante não pode atualizar ou apagar a
linha, pois essas operações poderiam contornar o histórico append-only e a
auditoria. O participante continua podendo criar e consultar o próprio relato.
Transições internas usam contexto somente de escopo; a autorização de
capability, papel, identidade e escopo continua na aplicação.

Ficam fora: resposta ao participante, SLA, notificação, anexos, atribuição a
terceiro, provider/MFA, produção, workflow remoto, aprovação clínica e teste
live sem ambiente explicitamente autorizado.

## Evidência RED → GREEN → REFACTOR

- RED: o teste de governança referenciando
  `0042_feedback_ticket_participant_write_rls.sql` falhou antes da migration
  existir (`ENOENT`); o baseline anterior também confirmou a policy
  participante `FOR ALL` em `0010`.
- GREEN focal: 3 arquivos de teste, 28 testes PASS; 1 arquivo live ficou
  skipped por ausência de ambiente. A governança verifica a migration nova, o
  journal e o contexto de staff.
- REFACTOR: a persistência foi extraída para um caminho comum com contexto de
  participante ou staff; o caminho participante rejeita versões maiores que
  zero antes do banco; o caminho staff usa `setDatabaseSecurityContext` com
  `scopeId` e não recebe `participantId`.
- `pnpm typecheck`, `pnpm format:check`, `pnpm lint` e
  `pnpm verify:migrations` foram executados com Node `22.22.0`/pnpm `10.33.0`;
  a cadeia local passou com 43 migrations até `0042`.
- `pnpm verify` passou no fechamento da rodada com 141 arquivos de teste PASS,
  29 arquivos skipped, 698 testes PASS e 35 testes skipped; cobertura de
  84,31% statements, 80,33% branches, 86,34% functions e 85,00% lines.
  Contratos 86/86, worker 27/27, migrations 43/43, format, lint, typecheck,
  secrets, arquitetura, documentação, product-definition, exposure e
  traceability estrutural também passaram.
- `pnpm test:integration:live` foi executado novamente e encerrou com exit 2
  no preflight porque `CVG_TEST_DATABASE_URL` é obrigatório e não está
  disponível; a ausência de conexão não é tratada como evidência live.

## Controles implementados

| Controle | Evidência local | Resultado local |
| --- | --- | --- |
| Participante SELECT/INSERT somente | `0042_feedback_ticket_participant_write_rls.sql` substitui `FOR ALL` por policies explícitas | PASS estático |
| Staff SELECT não vaza para participante | `0042` recria a policy staff com `cvg.participant_id = ''`; policies permissivas não se sobrepõem ao contexto participante | PASS estático; live pendente |
| Participante UPDATE/DELETE | nenhuma policy participante para essas operações; repository rejeita `version > 0` no contexto participante | PASS estático; live pendente |
| Transição staff | `LearningStateStaffContext`, `findFeedbackTicketAsStaff` e `saveFeedbackTicketAsStaff` usam apenas `scopeId` | PASS focal |
| Identidade do participante | o caso de uso compara `persisted.state.participantId` com o participante resolvido server-side | PASS focal |
| CAS/histórico/auditoria | update exige versão anterior; a transação grava um evento de histórico e uma entrada de auditoria | PASS por testes unitários; live pendente |
| Trigger staff | `0042` atualiza a função existente para permitir exatamente status-only ou metadata-only, sem campos protegidos combinados | PASS estático; live pendente |
| Migration governance | journal `idx 42`, teste de policy/contexto e `verify:migrations` | PASS |

## Teste live preparado

`tests/integration/postgres-learning-state.test.ts` agora prepara uma prova
sintética que:

1. cria e transiciona um ticket via repository staff com contexto somente de
   escopo;
2. tenta `UPDATE` e `DELETE` sob contexto de participante e papel sem
   `SUPERUSER`/`BYPASSRLS` quando o harness possui essa capacidade;
3. prova `INSERT`/`SELECT` do próprio participante, rejeita `SELECT` de outro
   participante no mesmo escopo e tenta um `INSERT` com participante forjado;
4. confirma pela conexão administrativa que a descrição, o status e a versão
   permanecem inalterados;
5. exerce CAS com uma transição staff obsoleta e preserva as verificações de
   histórico, auditoria, isolamento cross-scope e rollback já existentes.

O preflight live não conectou nesta rodada porque
`CVG_TEST_DATABASE_URL`/`CVG_TEST_ADMIN_DATABASE_URL` não estão disponíveis.
Portanto não há evidência de ACL/RLS/trigger efetivos, concorrência ou
browser→API→PostgreSQL.

## Gaps e remediação

- Executar a suíte PostgreSQL live em banco descartável autorizado, com role
  de aplicação `NOSUPERUSER/NOBYPASSRLS` e conexão administrativa separada.
- Confirmar que a migration 0042 é aplicada no ambiente alvo e que a policy
  `feedback_tickets_staff_scope_update_policy` continua compatível com a
  função substituída.
- Verificar concorrência real, rollback de histórico/auditoria e grants/owners
  do ambiente de destino.
- Manter FEEDBACK-057 separado para resposta ao participante; não ampliar este
  patch para resolver produto ou operação não solicitados.

## Artefatos auditados

- `packages/persistence/drizzle/0042_feedback_ticket_participant_write_rls.sql`
- `packages/persistence/drizzle/meta/_journal.json`
- `packages/application/src/learning-state-use-cases.ts`
- `packages/persistence/src/learning-state-repository.ts`
- `tests/integration/migration-governance.test.ts`
- `tests/integration/postgres-learning-state.test.ts`
- `packages/application/src/learning-state-use-cases.test.ts`
- `packages/persistence/src/learning-state-repository.test.ts`
- `docs/99_runtime_state.md`
- `docs/20_master_execution_log.md`
- `docs/30_backlog_master.md`
- `traceability.yml`
