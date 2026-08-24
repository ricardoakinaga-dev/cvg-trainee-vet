# 0515 — Auditoria da Fila Interna de Revisão de Contestação

**Data:** 2026-08-23
**Item:** APPEAL-037 / AUD-P1-001
**Resultado:** `PASS_WITH_GAPS` — leitura interna redigida, escopada e somente leitura materializada localmente; prova PostgreSQL live, decisão humana, recálculo e operação externa permanecem pendentes.

## Escopo

Esta rodada materializa somente a consulta interna dos protocolos de
contestação. A fila recebe um escopo explícito, status opcional e limite
bounded, exige `REVIEW_APPEAL`, ordena deterministicamente e devolve o mínimo
necessário para triagem. Ela não atribui revisor, decide, recalcula, notifica,
publica ou altera o estado de `appeals`.

A projeção interna allowlisted pode conter `appealId`, `participantId`,
`attemptId`, `itemId`, `justification`, `createdAt`, `dueAt`, `status`, `version`,
`reviewerId` opcional e `decision` opcional. Resposta, score, gabarito, fontes,
prompt, rubrica, dados autorais e claim de competência prática são proibidos.

## Evidência de implementação

- `packages/contracts/src/appeal-review-queue.ts` define query/projeção strict,
  status allowlisted, limite 1–100 e parser de resposta;
- `packages/application/src/appeal-review-queue-use-cases.ts` exige
  `REVIEW_APPEAL`, valida identidade/escopo, congela a projeção e falha fechado
  para registro fora do escopo, status incorreto, duplicata ou excesso;
- `packages/persistence/src/appeal-review-queue-repository.ts` seleciona apenas
  colunas de protocolo, usa `cvg.appeal_review_scope_id` dentro da transação,
  filtra escopo/status e ordena por `dueAt`/`createdAt`/`id`;
- `packages/persistence/drizzle/0022_appeal_review_queue_rls.sql` adiciona o
  índice bounded e policy `SELECT` dedicada, sem policy de mutação;
- `apps/api/src/http.ts` autentica, rejeita chaves desconhecidas, aplica
  capability, serializa a allowlist e preserva o envelope de erro sem detalhes;
- `apps/web/app/operations/page.tsx` acrescenta estados loading, vazio,
  forbidden, erro/retry e tabela sem renderizar UUIDs brutos, resposta,
  pontuação, chave de correção, fonte ou claim prático;
- `tests/integration/postgres-appeal-review-queue.test.ts` prepara a prova com
  fixtures sintéticas e deixa explícito o skip quando não há PostgreSQL live.

## Barra de qualidade

| Critério | Resultado | Evidência |
|---|---|---|
| Contrato de entrada/saída | PASS local | 14 testes strict para default, enum, limite, campos extras e projeção allowlisted. |
| Autorização | PASS local | caso de uso e HTTP negam participante, escopo cruzado e conta sem capability antes da persistência. |
| Isolamento/RLS | PASS local; live GAP | contexto transacional dedicado, reset dos demais GUCs e policy `SELECT`; cenário live preparado, sem `CVG_TEST_DATABASE_URL`. |
| Projeção interna | PASS local | `SELECT` explícito e schema rejeitam resposta, score, gabarito, fontes, prompt e campos extras. |
| Ordenação/limite | PASS local | port aplica limite 1–100 e `dueAt`/`createdAt`/`id`; aplicação rejeita excesso/escopo inesperado. |
| Ausência de mutação | PASS local | port somente leitura, rota `GET`, sem comando de atribuição/decisão/recálculo/notificação. |
| Experiência web | PASS local | operações apresenta estados de carregamento, vazio, erro/retry e forbidden; axe sem violações. |
| Regressão | PASS local | `pnpm verify` passou com 106 arquivos/508 testes e 26 skips; cobertura 84,50% statements, 80,35% branches, 85,64% functions e 85,21% lines; `pnpm build` e E2E completo passaram; gates de documentação, definição do produto, exposição e audit de dependências também passaram. |
| Operação/autoridade | GAP explícito | provider/MFA, auditoria consultável, collector/OTel, carga, failover, restore, aprovação clínica e piloto não foram simulados. |

## TDD e verificações locais

O RED inicial encontrou as ausências esperadas de contrato, caso de uso,
contexto RLS, persistência e rota. Após GREEN/REFACTOR, o foco passou:

- `pnpm exec vitest run packages/contracts/src/appeal-review-queue.test.ts packages/application/src/appeal-review-queue-use-cases.test.ts packages/persistence/src/appeal-review-queue-repository.test.ts packages/persistence/src/security-context.test.ts apps/api/src/http.test.ts apps/api/src/server.test.ts --project unit` — PASS, 6 arquivos/78 testes;
- `pnpm build` — PASS, 12 workspaces;
- `pnpm test:e2e -- tests/e2e/operations-dashboard.spec.ts` — PASS, 5/5, incluindo axe e ausência de campos protegidos na superfície;
- `pnpm test:e2e` — PASS, 22/22, incluindo operações, autor/revisor, participante, recuperação e axe;
- `pnpm test:integration` — 8 arquivos/20 testes PASS, 24 arquivos/26 testes skipped por configuração live; o novo cenário `postgres-appeal-review-queue` permanece 1/1 skipped sem `CVG_TEST_DATABASE_URL` e não constitui evidência live;
- `pnpm verify:migrations` — PASS, 23 migrations, latest `0022_appeal_review_queue_rls`;
- `pnpm verify` — PASS, 106 arquivos/508 testes, 26 skips; cobertura 84,50% statements, 80,35% branches, 85,64% functions e 85,21% lines;
- `pnpm audit --audit-level=high` — PASS, no known vulnerabilities;
- `pnpm typecheck`, `pnpm format:check`, `pnpm lint`, `pnpm verify:traceability`, `pnpm verify:documentation`, `pnpm verify:product-definition`, `pnpm verify:exposure` e `git diff --check` — PASS no gate completo.

Nenhum prontuário, tutor, foto, PDF, resposta real, fonte protegida ou dado
clínico real foi usado. A separação entre evidência digital, feedback,
avaliação longitudinal e competência prática permanece coerente com o CBVE da
AAVMC e com o uso de reflexão/feedback no VetGDP do RCVS; esta fila não converte
um protocolo em decisão clínica.

## Crítica independente

A crítica read-only do APPEAL-037 foi solicitada com escopo de contrato,
autorização, RLS, projeção e regressão. A tentativa atingiu a janela de 30
segundos sem produzir relatório e foi encerrada; isso não foi contado como
PASS. A auditoria mantém a revisão local, os testes e os gaps explícitos como
base de decisão.

## Gaps e próxima ação

`APPEAL-037` permanece `COMPLETED_WITH_GAPS` apenas para esta fatia local.
Permanecem fora: atribuição humana, decisão
fundamentada, recálculo versionado e idempotente, preservação de versões,
identificação/notificação, trilha de auditoria consultável, entrega externa,
provider/MFA, aprovação clínica, piloto e prova live sem ambiente autorizado.

Próxima ação: revisar o diff documental, commitar o audit/SPEC/estado/log/backlog/
manifesto e executar o release traceability gate em worktree limpo. Depois,
quando houver ambiente autorizado, executar a prova PostgreSQL/RLS live sem
converter o skip em PASS.
