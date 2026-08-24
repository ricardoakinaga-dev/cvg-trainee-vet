# AUDIT — FEEDBACK-043: paginação por cursor da fila interna

## Escopo e veredito local

Esta auditoria cobre a implementação local da paginação keyset da fila interna
`GET /api/v1/internal/feedback`. O recorte mantém a fila somente leitura para
consulta, preserva `scopeId`/status/limite e não introduz prioridade, assignment,
SLA, resposta ao participante, notificação, decisão clínica ou alteração
educacional.

Veredito local: **CONDITIONAL PASS / VERIFIED WITH GAPS**. O código funcional
está consolidado em `ea9ee122676be620652f08019919ca59ed05fa02`; isso não é um
claim de release, produção ou evidência PostgreSQL live.

## Implementação rastreável

- contrato: cursor bounded allowlisted; projeção de ticket permanece sem token;
- aplicação: cursor é normalizado, encaminhado e páginas exigem consistência
  entre `hasNext` e `nextCursor`; somente o erro tipado de consulta/cursor do
  repository vira `validation_error`, sem mascarar falhas internas;
- persistência: cursor HMAC-SHA-256 base64url, fingerprint de
  `scopeId/status/limit`, binding de escopo/filtros e query keyset
  `createdAt DESC, id DESC` com `limit + 1`; migration 0040 adiciona índices
  para a leitura com e sem filtro de status;
- API: somente `scopeId`, `status`, `cursor` e `limit`; metadados no envelope
  `meta.has_next`/`meta.next_cursor`;
- web: estado `unknown`/allowlisted, proteção contra respostas fora de ordem,
  identidade de consulta para impedir reload tardio após troca de filtro/escopo,
  retry que preserva o cursor solicitado e controles acessíveis de página
  anterior/próxima;
- E2E: avanço e retorno entre duas páginas sintéticas, retry após falha com
  cursor obsoleto e transição concorrente com troca de filtro, sem campos
  internos ou token renderizado.

## Evidência executada

RED foi observado nos contratos, aplicação, repository e HTTP antes da
implementação. A verificação focal passou:

- `packages/contracts/src/feedback-triage-queue.test.ts`;
- `packages/application/src/feedback-triage-queue-use-cases.test.ts`;
- `packages/persistence/src/feedback-triage-queue-repository.test.ts`;
- `apps/api/src/http.test.ts` — 80/80 testes nesses quatro arquivos;
- `@cvg/web` typecheck;
- `pnpm build` — 12 workspaces;
- `pnpm test:e2e -- tests/e2e/operations-dashboard.spec.ts` — 5/5, incluindo
  as interleavings de retry/transição.
- `pnpm test:e2e` — 31/31;
- `pnpm test:coverage` — 134 arquivos PASS/29 SKIPPED, 667 testes PASS/35
  SKIPPED, 84,24% statements, 80,14% branches, 86,20% functions e 84,95%
  lines;
- `pnpm verify:migrations` — 41/41, latest `0040_feedback_queue_keyset_indexes`;
- `pnpm audit --audit-level=high` — nenhum advisory conhecido.

Os testes de persistência cobrem round-trip, adulteração, segredo incorreto,
binding de filtro, segunda página, limite adicional e contexto transacional.

## Segurança e invariantes

O cursor não é aceito como autorização: o servidor deriva a capability e o
escopo da sessão, e o repository valida assinatura, escopo e fingerprint antes
da query. A ordenação tem desempate por UUID, evitando duplicação/omissão por
empates de timestamp em condições normais. O `limit + 1` não atravessa a
projeção. A web não interpreta o payload nem o coloca em tela.

## Gaps explícitos

- não houve PostgreSQL live nesta sessão: `CVG_TEST_DATABASE_URL` continua
  ausente; portanto RLS, grants/owners, efetividade do contexto, concorrência
  real, browser→API→PostgreSQL e operação produtiva permanecem não observados;
- não há workflow remoto same-SHA, deploy, carga, failover/restore, provider/MFA
  ou aprovação clínica/piloto;
- o E2E é sintético e não prova a fila com dados persistidos de um ambiente
  autorizado;
- a estratégia não fornece total count nem salto arbitrário de página, decisão
  deliberada para manter a fila estável e bounded.

Nenhum dado clínico real, prontuário, tutor, foto, PDF de terceiro, segredo ou
fonte bibliográfica foi adicionado ao código, seed, teste, log ou interface.
