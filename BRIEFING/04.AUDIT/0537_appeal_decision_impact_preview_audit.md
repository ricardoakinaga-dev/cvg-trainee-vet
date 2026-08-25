# AUDIT — APPEAL-043: preview read-only de impacto de `ANULAR_ITEM`

## Escopo e veredito local

Esta auditoria cobre a fatia vertical do preview interno candidato de
`ANULAR_ITEM`: contrato strict, caso de uso, persistência read-only, rota HTTP,
superfície web e proteção contra respostas fora de ordem. O recorte não decide
contestação, não altera `AttemptStatus`, não recalcula nota, não publica
resultado, não notifica participante e não afirma competência clínica.

Veredito local: **CONDITIONAL PASS / VERIFIED WITH GAPS**. A implementação está
consolidada em `2277a32cb2a88345903d7fd5a54b13f1da629601`; isso não é claim de
release, produção ou evidência PostgreSQL/RLS live.

## Base de produto e engenharia

- PRD: `UC-018`, `PRD-RF-064`, `PRD-RF-065` e `PRD-RF-080`;
- SPEC: `0104_dados_e_persistencia`, `0106_contratos_de_aplicacao`,
  `0107_contratos_de_api`, `0111_permissoes_governanca_e_auditoria` e
  `0118_estrategia_de_testes_rastreabilidade_e_verificacao`;
- dependências: fila de revisão e histórico interno de APPEAL-042, sem nova
  migration e sem alteração de estado transacional.

## Implementação auditada

- contrato em `packages/contracts/src/appeal-decision-impact.ts`: path UUID,
  query literal `ANULAR_ITEM`, projeção strict e invariantes de versão do
  resultado; campos de score, resposta, gabarito, fonte, rationale,
  participante, escopo e contagem/lista de afetados não existem;
- aplicação em
  `packages/application/src/appeal-decision-impact-use-cases.ts`: capability
  `REVIEW_APPEAL`, escopo derivado da sessão, validação de linhagem
  appeal→attempt→participant→result, saída congelada e `state_conflict` para
  protocolos que não estejam em `ABERTA`/`EM_REVISAO`;
- persistência em
  `packages/persistence/src/appeal-decision-impact-repository.ts`: transação
  `REPEATABLE READ`, contexto `cvg.appeal_review_scope_id`, joins explícitos de
  tentativa/resultado com `learning_activities.scope_id`, seleção apenas de
  metadados e nenhuma escrita;
- API em `apps/api/src/http.ts` e `apps/api/src/server.ts`: rota
  `GET /api/v1/internal/appeals/:appealId/impact-preview`, template próprio de
  telemetria/rate-limit, body vazio, query allowlisted e parâmetros duplicados
  rejeitados;
- web em `apps/web/app/operations/page.tsx`: painel junto da fila de
  contestações, apenas leitura, botão desabilitado após decisão, estados
  loading/erro/retry e invalidação de requests de fila/preview ao trocar
  escopo ou filtro;
- E2E em `tests/e2e/operations-dashboard.spec.ts`: payload sintético bounded,
  ausência de campos proibidos e interleaving de escopo com resposta antiga
  atrasada.

## TDD, crítica e evidência local

- RED observado antes da implementação: contratos/aplicação/persistência/API
  falharam por módulo/rota inexistente;
- GREEN focal após a fatia e hardening: 5 arquivos, 94 testes passando;
- cobertura final: 137 arquivos PASS, 29 SKIPPED; 678 testes PASS, 35 SKIPPED;
  84,44% statements, 80,40% branches, 86,39% functions e 85,15% lines;
- `pnpm test:contract`: 29 arquivos / 83 testes PASS;
- `pnpm test:worker`: 4 arquivos / 27 testes PASS;
- `pnpm typecheck`, `pnpm lint` e `pnpm format:check`: PASS;
- `pnpm build`: 12 workspaces PASS, observado durante a suíte E2E;
- `pnpm test:e2e -- tests/e2e/operations-dashboard.spec.ts`: 6/6 PASS;
- `pnpm test:e2e`: 32/32 PASS;
- `pnpm verify:migrations`: 41 migrations, última `0040_feedback_queue_keyset_indexes`;
- `pnpm verify:secrets`: clean;
- `pnpm verify:ci-contract`, `pnpm verify:architecture`,
  `pnpm verify:product-definition` e `pnpm verify:exposure`: PASS;
- `pnpm audit --audit-level=high`: nenhum advisory conhecido;
- crítica independente Carver: três P1 e quatro P2. Foram fechados o acoplamento
  visual ao feedback, a corrida de fila, a linhagem explícita de escopo, o
  snapshot consistente, a disponibilidade pós-decisão, o template de rota, a
  duplicidade de query e a evidência E2E da concorrência.

## Invariantes e segurança

O cliente não escolhe escopo, participante, tentativa, item ou ator. O adapter
resolve a apelação somente nos escopos autorizados, e o caso de uso falha
fechado para payload inconsistente. O resultado ausente permanece
`NOT_AVAILABLE`; não é convertido em zero. O preview explicita
`NOT_COMPUTED`, `NOT_AVAILABLE_IN_THIS_SLICE`, `NONE` e `NOT_PERFORMED`.

Nenhum dado clínico real, prontuário, tutor, foto, PDF de terceiro, segredo,
gabarito ou fonte bibliográfica foi adicionado ao código, seed, teste, log ou
interface.

## Gaps e limites de assurance

- não houve PostgreSQL live nesta sessão: `CVG_TEST_DATABASE_URL` está ausente;
  portanto RLS, grants/owners, efetividade do contexto, joins reais,
  concorrência transacional e browser→API→PostgreSQL permanecem não
  observados;
- o E2E usa fixtures sintéticas e não prova dados persistidos em ambiente
  autorizado;
- não houve workflow remoto same-SHA, deploy, carga, failover/restore,
  provider/MFA, aprovação clínica ou piloto;
- a consulta não calcula impacto acadêmico e não implementa decisão, recálculo,
  anulação efetiva, notificação ou publicação; essas são fatias posteriores.

## Resultado e próximo passo

APPEAL-043 pode ser marcado `COMPLETED_WITH_GAPS` no BUILD local. O próximo
passo deve escolher outra fatia bounded após atualizar traceability, backlog,
log e runtime state; nenhuma decisão de negócio foi inferida nesta auditoria.
