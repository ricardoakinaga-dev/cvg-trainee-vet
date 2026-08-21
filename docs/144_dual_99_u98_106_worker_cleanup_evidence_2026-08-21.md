# Evidência Dual99 — U98-106 — cleanup do worker em crash

**Data:** 2026-08-21 12:19 -03:00
**Task:** U98-106 — fault/crash/replay/Qdrant/IA
**ID:** `DUAL99-U98-106-WORKER-CLEANUP-310`
**Predecessora:** `docs/143_dual_99_b99_201_worker_persistence_failure_evidence_2026-08-21.md`
**Branch:** `agent/publish-production-hardening`

## Gap reproduzido

Uma inspeção independente read-only encontrou que `runWorkerLoop` fechava o
health server, mas não fechava `integrations` quando `initialize` ou
`processOutboxOnce` lançava. O caminho de crash podia deixar conexões e handles
vivos durante o restart.

O mesmo relatório apontou questões ainda abertas de atomicidade entre writes no
Qdrant e de idempotência do evento de sugestão de IA; elas exigem contrato de
consistência/deduplicação antes de uma mudança segura e não foram inventadas.

Nenhum segredo real, prontuário, tutor, foto, PDF, fonte clínica ou banco de
produção foi usado.

## RED → GREEN → REFACTOR

- **RED:** os testes de falha na inicialização e no processamento confirmaram
  que `integrations.close()` não era chamado;
- **GREEN:** `runWorkerLoop` agora protege também `health.start()` e, em erro,
  executa `health.close()` e `integrations.close()` com `Promise.allSettled`,
  preservando o erro original;
- **REFACTOR:** o fechamento foi injetado como dependência explícita do loop,
  mantendo a composição e o fechamento normal idempotentes.

## Código e teste

- `357f265` — `fix: close worker integrations on crash`;
- `apps/worker/src/main.ts`;
- `apps/worker/src/main.test.ts`.

## Verificação local

- `pnpm test:worker`: `54/54` testes passantes;
- cobertura: `205` arquivos passantes, `17` arquivos e `21` testes guardados,
  `1177` testes passantes;
- cobertura: `95,04%` statements, `90,95%` branches, `95,32%` functions e
  `95,74%` lines;
- `CVG_API_INTERNAL_URL=http://127.0.0.1:4000 pnpm build`: PASS, `12/12`;
- `pnpm typecheck`: PASS;
- `pnpm lint`: PASS;
- `pnpm format:check`: PASS;
- `pnpm verify:hotspots`: PASS_WITH_DEBT_RATCHET, `0` hotspots;
- `pnpm verify:exposure`: PASS;
- `git diff --check`: PASS;
- `pnpm verify:secrets`: fail-closed somente nos quatro assignments redigidos
  preexistentes de `infra/production/.env.local`; o arquivo não foi lido nem
  alterado.

## Limites, decisão e rollback

U98-106 permanece `READY_FOR_NEXT_STEP` no escopo local. Qdrant com falha
entre writes, idempotência do replay de sugestão de IA, PostgreSQL live com
role restrita, concorrência, RLS, RC, runtime, score, release, clínica,
`0/145`, gates externos e reauditoria independente continuam abertos.

O explorador independente encontrou os gaps; não há `PASS` independente final.
O papel `reviewer` não iniciou porque o modelo fixado não é suportado nesta
conta. O rollback do código é `git revert 357f265` somente mediante decisão
registrada.

O programa permanece `IN_PROGRESS / PILOT_BLOCKED`; não houve alteração live,
produção, score, release, decisão clínica ou piloto.
