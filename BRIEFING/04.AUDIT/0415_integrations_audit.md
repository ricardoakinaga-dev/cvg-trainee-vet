# 0415 — Integrations Audit

## Reauditoria vigente — 2026-08-11

PostgreSQL, API, worker, Caddy, Prometheus, Grafana e collector local responderam. Qdrant e integração HA têm evidência local/histórica. A tentativa de E2E real falhou no fixture ao inserir activity_assignments sob RLS; isso impede declarar a integração web→API→banco fechada nesta janela. Provedores externos, deployment e recovery permanecem não executados.

Resultado da janela: PASS_WITH_GAPS para B0/F2-S2/F3-S2/F3-S3 + complementos F3-S4/F3-S5/F3-S6/F3-S7/F3-S8; não é aprovação de release.

## Verificar por dependência

| Integração | Evidência | Critério |
|---|---|---|
| PostgreSQL | migrações 0000–0006, transação, atividade publicada, convite/aceite, sessão/rotação/revogação, correção, feedback, transição editorial, progresso, auditoria, outbox e sink `DRAFT_AI` | fonte única; backup/restore ainda não verificados |
| Qdrant | inicialização, coleção, filtro, hash, health, busca, upsert, `list/scroll`, remoção e reconciliação determinística | derivado, idempotente e sem acesso direto do web; execução operacional conjunta com integrações habilitadas e recovery pendentes |
| IA | adapter, schema, fake, worker e sink interno | server-side, timeout, retry, redaction e sem publicação automática; chamada externa não executada |

## Evidência disponível no B0

- PostgreSQL: `packages/persistence/src/database.ts`, `packages/persistence/src/schema.ts`, migrações 0000–0002, repositórios e teste live `AUD-F2-009`;
- Qdrant: `packages/integrations/src/qdrant.ts` e `qdrant.test.ts`, com filtro de escopo/status/versão e validação de dimensão/distância;
- IA/embeddings: `packages/integrations/src/ai.ts` e `ai.test.ts`, com saída estruturada, `store=false`, timeout, `maxRetries=0` e fakes;
- composição: `packages/integrations/src/composition.ts`, `apps/api/src/main.ts`, `apps/worker/src/main.ts`, health agregado e inicialização testada sem rede e em readiness live;
- verificação: `pnpm verify`, `pnpm build`, `pnpm audit` — execução real de serviço, indisponibilidade e recovery ainda dependem do ambiente de runtime.

Para cada integração registrar timeout, retry, fallback, circuit breaker, idempotência, segredo, health, impacto da falha e runbook. Testar indisponibilidade sem alterar estado educacional válido.

## Evidência de runtime

- PostgreSQL: migrações 0000–0006, atividade publicada/atribuída, resposta/sessão/auditoria append-only, convite com hash/aceite único, correção versionada, feedback por dono, transição editorial, progresso e worker/sink live AUD-F3-003;
- Qdrant: inicialização, filtro/healthcheck/upsert/search/delete sintético, teste live AUD-F3-004 e readiness AUD-F3-005;
- IA/embeddings: fake estruturado, `store=false`, timeout, `maxRetries=0`, handler e sink `DRAFT_AI`; chamada real NOT_EXECUTED;
- API/web: contratos de atividade/projeção/transição/progresso/convite/correção/feedback/sessão cobertos em AUD-F3-005/F3-S8; Playwright participante sintético passou em build de produção em AUD-F3-007; CSRF/origem, rate limit local e `Retry-After` passaram em AUD-F3-010; `list/scroll` e reconciliação determinística passaram em F3-S7; rotação/revogação passou em PostgreSQL live em F3-S8; crash real, navegador contra API real, recovery além do convite, execução operacional conjunta e observabilidade externa NOT_EXECUTED.

## Resultado vigente — 2026-08-11

`PASS_WITH_GAPS`. API/web real mínimo atravessou proxy e PostgreSQL no E2E HA 2/2; PostgreSQL, Qdrant, Caddy, collector, Tempo, Prometheus e Grafana permaneceram disponíveis; worker processou batches sem erro. O IdP, provider de IA/embedding real, domínio público, storage externo, backup produtivo, deploy e rollback autorizado não foram executados.
