# Skip Inventory (§69) — 2026-09-09

Inventário completo dos testes pulados. Comando de reprodução (Node 22.22.x):

```bash
pnpm test:coverage   # relata arquivos/testes skipped no resumo v8
```

## Classificação

| Classe | Definição | Contagem nesta rodada |
|---|---|---:|
| expected | pulo determinístico por desenho (ex.: matriz parametrizada) | 0 |
| environmental | pulo por ausência de dependência externa descartável | todos os skips |
| debt | pulo por dívida técnica conhecida | 0 |
| blocker | pulo por bloqueador externo com ação pendente | 0 (environmental com ação = AAA-001/live) |

## Skips ambientais (única categoria presente)

Todos os 32 `describe.skipIf` em `tests/integration/` + skips internos via
`skip(liveAdminCapabilityMessage)` pertencem a esta classe:

- **Live PostgreSQL** (`CVG_RUN_LIVE_DB_TESTS=true` + `CVG_TEST_DATABASE_URL` +
  `CVG_TEST_ADMIN_DATABASE_URL` distintos): ~28 arquivos, incluindo o novo
  `postgres-pool-context-isolation.test.ts` (3 testes). Sem banco descartável
  autorizado, pulam sem falhar — por desenho, nunca mascaram regressão unitária.
- **Live Qdrant** (`CVG_INCLUDE_LIVE_QDRANT=true` + `CVG_TEST_QDRANT_URL`):
  `qdrant-live.test.ts`, `worker-qdrant-live.test.ts`.
- **Restore sintético** (`CVG_INCLUDE_LIVE_RESTORE=true`):
  `postgres-restore.test.ts`.
- **Health live** (`api-core-health`, `api-health`): exigem API + DB reais.

## Declarações verificáveis

- Nenhum `it.only` / `describe.only` / `test.only` no repositório (gate:
  `grep -rn "\.only" apps packages tests` vazio fora de `node_modules`).
- Nenhum `it.skip` / `describe.skip` incondicional em `apps/` ou `packages/`.
- Nenhum skip crítico silencioso: todo skip carrega a mensagem do harness
  (`liveAdminCapabilityMessage`) ou a condição `skipIf` explícita.
- Skips **não** promovem release: o contrato same-SHA (§42) exige runs
  `quality`/`security` verdes no CI com serviços live provisionados.
