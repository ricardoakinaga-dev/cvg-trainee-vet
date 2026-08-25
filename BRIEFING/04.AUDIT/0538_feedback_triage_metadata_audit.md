# 0538 — Auditoria de metadata de triagem de feedback — FEEDBACK-054

## 1. Resultado executivo

FEEDBACK-054 entrega uma fatia interna e bounded para organizar a fila de
relatos: prioridade allowlisted e responsabilidade operacional por
`MANTER`/`ASSUMIR`/`LIBERAR`. O participante não envia nem recebe esses campos,
`participantId` não entra no comando e `ASSUMIR` sempre deriva o principal
autenticado. A mutação preserva o estado do ticket, usa a mesma versão otimista,
grava `METADATA_ALTERADO` e uma auditoria metadata-only na mesma transação
PostgreSQL.

O resultado técnico local é **verified-with-gaps**. O commit funcional é
`ea81eed` (`feat(FEEDBACK-054): bound feedback triage metadata`) e a
estabilização do cenário E2E de loading é `9eedb25`. Não há evidência live nesta
sessão para PostgreSQL/RLS/grants/trigger/concorrência ou browser→API→banco;
portanto não há declaração de produção.

## 2. Escopo auditado

### Incluído

- prioridade `BAIXA`, `NORMAL`, `ALTA`, `URGENTE`, com legado recebendo default
  `NORMAL` sem backfill sintético;
- `PATCH /api/v1/internal/feedback/:ticketId/triage-metadata` com body strict
  `{ expectedVersion, priority, assignment }`;
- capability `MANAGE_FEEDBACK_METADATA`, restrita a conta ativa com
  `MODERATOR`/`ADMIN` e escopo da sessão;
- derivação server-side de escopo, ator, request e correlação;
- `ASSUMIR` para o próprio principal, `LIBERAR` para nulo e `MANTER` para
  conservar a responsabilidade atual;
- CAS por ticket/escopo/versão, histórico append-only e auditoria atômica;
- fila e timeline internas com projeções allowlisted, controles web nativos e
  proteção contra resposta obsoleta;
- validações negativas de participante, campos desconhecidos, escopo e IDs.

### Fora do escopo

Resposta ao participante, SLA/calendário, notificação, anexos, risco automático,
duplicidade, retirada clínica, contestação, provider/MFA, atribuição arbitrária a
terceiro, PostgreSQL/RLS live, grants/owners produtivos, workflow remoto,
piloto, produção e aprovação clínica.

## 3. Critério e decisões de segurança

O requisito aprovado RF-104 inclui priorizar, atribuir, responder e encerrar.
Esta rodada materializa somente prioridade e autoatribuição/liberação, deixando
resposta, SLA e encerramento para fatias posteriores. Essa redução foi
deliberada para evitar que o MVP inventasse um contrato de resposta ou aceitasse
uma identidade de responsável controlada pelo navegador.

O explorador independente Banach recomendou: não confiar em `scopeId`,
`participantId` ou assignee enviados pelo cliente; separar capability própria;
validar ator ativo/membership aceita; usar evento append-only; proteger update
staff por RLS/trigger; e aplicar CAS. Todas as recomendações foram incorporadas.

## 4. TDD e ciclos da rodada

### RED

Antes da implementação, o focal de contratos/domínio/aplicação falhou pelos
módulos de metadata inexistentes e pela função de domínio ausente. A falha foi
observada no comando:

```text
pnpm exec vitest run packages/contracts/src/feedback-triage-metadata.test.ts packages/domain/src/feedback-triage.test.ts packages/application/src/feedback-triage-metadata-use-cases.test.ts
```

### GREEN

Foram criados os contratos, domínio, caso de uso, repositório, migration, rota,
projeção web e testes. O focal final da fatia passou com 13 arquivos e 140
testes.

### REFACTOR e crítica independente

O primeiro E2E completo passou 31/32; a falha era uma janela de 150 ms no teste
de loading/retry, que podia terminar antes da asserção sob dois workers. O
cenário foi tornado determinístico com uma barreira explícita de resposta, sem
relaxar a asserção. O focused passou 1/1 e o E2E completo final passou 32/32.
Também foi adicionada validação de metadata corrente no domínio e validação de
array no port de persistência.

## 5. Implementação e controles

| Camada | Evidência | Controle principal |
|---|---|---|
| Domínio | `packages/domain/src/learning-state.ts` | prioridade default, status preservado, versão incrementada, UUID/null do responsável |
| Aplicação | `packages/application/src/feedback-triage-metadata-use-cases.ts` | capability dedicada, escopos da sessão, ator autenticado, erros `403/404/409/422` |
| Contratos | `packages/contracts/src/feedback-triage-metadata.ts` | path/body/projeção strict e allowlisted |
| Persistência | `packages/persistence/src/feedback-triage-metadata-repository.ts` | contexto de escopo, membership ativa/aceita, CAS, histórico/auditoria atômicos |
| Banco | `packages/persistence/drizzle/0041_feedback_triage_metadata.sql` | default/constraints, policy UPDATE staff, trigger de metadata, lineage |
| API | `apps/api/src/http.ts`, `apps/api/src/server.ts` | identidade server-side, rota exata, não enumeração e projeção interna |
| Web | `apps/web/app/operations/page.tsx` | prioridade, assumir/liberar, reload da página e view-key contra resposta antiga |
| Exposição | projeção participante existente e testes negativos | nenhum campo novo em `/api/v1/feedback` ou tela participante |

## 6. Rastreabilidade

| Requisito/contrato | Implementação/teste |
|---|---|
| `PRD-RF-072`, `PRD-RF-073`, `PRD-RF-103`, `PRD-RF-104`, `PRD-RF-107` | fila interna escopada, participante isolado, prioridade/atribuição parcial e contexto técnico mínimo |
| `UC-023` | fluxo bounded de triagem, sem resposta/SLA/encerramento nesta rodada |
| `SPEC-0104`, `SPEC-0105` | agregado e metadata ortogonal ao autômato |
| `SPEC-0106` | `UpdateFeedbackTriageMetadata`, `METADATA_ALTERADO`, port e erros |
| `SPEC-0107` | rota PATCH strict e projeção interna |
| `SPEC-0109`, `SPEC-0111` | migration, RLS/trigger, auditoria e capability |
| `SPEC-0114` | controles web, labels, reload e race guard |
| `SPEC-0118`, `AGENTS-TDD` | RED→GREEN→REFACTOR, coverage, contrato, integração estática e E2E |

## 7. Segurança e integridade

- `scopeId` não aparece no body nem é confiado pelo handler; o servidor deriva
  escopos da sessão e o repositório itera somente escopos autorizados;
- tickets fora do escopo autorizado retornam ausência sem enumeração;
- a conta executora é revalidada no banco como `ACTIVE`, membership aceita e
  papel `MODERATOR`/`ADMIN` no escopo;
- o cliente não escolhe `assigneeId`; o único alvo possível de `ASSUMIR` é o
  próprio principal autenticado;
- CAS com versão exata evita sobrescrita silenciosa e responde `409`;
- a transação não pode confirmar ticket sem seu evento e auditoria;
- `METADATA_ALTERADO` conserva o status e não recebe texto, resposta, fonte,
  prompt, gabarito ou dado clínico;
- a policy/trigger SQL restringe o update staff ao escopo e à metadata, mas sua
  efetividade ainda não foi executada em PostgreSQL nesta sessão;
- testes de contrato e API rejeitam `participantId`, `assigneeId`, `scopeId` e
  chaves desconhecidas no body, e o E2E confirma ausência de UUID no rótulo da
  web.

## 8. Verificação executada

- focal FEEDBACK-054: 13 arquivos / 140 testes PASS;
- cobertura global: 141 arquivos PASS, 29 arquivos skipped; 695 testes PASS,
  35 skipped; 84,36% statements, 80,36% branches, 86,39% functions e 85,05%
  lines;
- `pnpm format:check`: PASS;
- `pnpm lint`: PASS;
- `pnpm typecheck`: PASS;
- `pnpm build`: 12 workspaces PASS, observado na execução E2E;
- `pnpm verify:migrations`: 42 migrations alinhadas até
  `0041_feedback_triage_metadata`;
- E2E focused de operações: 6/6 PASS;
- E2E completo final: 32/32 PASS;
- E2E de loading/retry após hardening: 1/1 PASS;
- `git diff --check`: PASS antes dos commits funcional e de teste.

`pnpm verify` passou com 141 arquivos/695 testes PASS e 29 arquivos/35 testes
skipped, coverage 84,36% statements, 80,36% branches, 86,39% functions e
85,05% lines; contratos 86/86, worker 27/27, migrations 42/42, secrets, CI
contract, architecture, documentation, product-definition, exposure e
traceability estrutural passaram. `pnpm audit --audit-level=high` não encontrou
vulnerabilidades conhecidas. O build final dos 12 workspaces e
`git diff --check` também passaram. O release mode do traceability será
repetido após o commit documental em worktree limpo.

## 9. Gaps e remediação

1. Executar `pnpm test:integration:live` com `CVG_TEST_DATABASE_URL` e role de
   aplicação sem `SUPERUSER/BYPASSRLS`; provar migration 0041 aplicada, RLS,
   grants/owners, policy/trigger, rollback, isolamento e duas escritas CAS.
2. Executar browser→web→API→PostgreSQL com fixture sintética e cleanup.
3. Decidir e implementar, em fatia separada, resposta ao participante, SLA,
   notificação e atribuição a terceiro com regra de negócio aprovada.
4. Validar observabilidade, carga, failover, restore, workflow remoto same-SHA,
   produção e revisão humana antes de qualquer piloto.

## 10. Veredito da fatia

**CONDITIONAL PASS / VERIFIED-WITH-GAPS** para implementação local bounded.
O núcleo é coerente, testado e rastreável; não é autorização para release,
produção, piloto ou publicação clínica enquanto os gates live e humanos acima
não forem executados.
