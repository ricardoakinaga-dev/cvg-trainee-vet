# Evidência Dual99 — B99-201 — falha de persistência isolada no worker

**Data:** 2026-08-21 12:10 -03:00
**Task:** B99-201 — outbox claim/lease/ack e resiliência do worker
**ID:** `DUAL99-B99-201-WORKER-PERSISTENCE-FAILURE-309`
**Predecessora:** `docs/142_dual_99_b99_201_outbox_ack_state_evidence_2026-08-21.md`
**Branch:** `agent/publish-production-hardening`

## Gap reproduzido

Uma inspeção independente read-only encontrou que uma exceção de
`markFailed` escapava de `processClaimedEvent`, interrompia o restante do lote
e impedia o registro de telemetria e cleanup. Também encontrou que uma exceção
de `markProcessed` entrava no caminho de falha do handler e tentava persistir
um retry novamente.

Nenhum segredo real, prontuário, tutor, foto, PDF, fonte clínica ou banco de
produção foi usado.

## RED → GREEN → REFACTOR

- **RED:** dois testes falharam: falha de persistência no retry rejeitava o
  lote, e falha no ACK chamava `markFailed` com o código do handler;
- **GREEN:** o worker separa execução do handler, ACK e registro do retry;
  erros de persistência viram resultados técnicos redigidos, o ACK não é
  repetido e o loop continua o lote para preservar telemetria/cleanup;
- **REFACTOR:** `recordEventFailure`, `leaseLostResult` e os resultados de
  erro de ACK concentram a política sem expor texto de exceção ou payload.

## Código e teste

- `8bcbe58` — `fix: isolate worker persistence failures`;
- `apps/worker/src/loop.ts`;
- `apps/worker/src/loop.test.ts`.

## Verificação local

- `pnpm test:worker`: `53/53` testes passantes;
- outbox focal: `10/10` testes passantes;
- cobertura: `205` arquivos passantes, `17` arquivos e `21` testes guardados,
  `1176` testes passantes;
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

B99-201 permanece `READY_FOR_NEXT_STEP` no escopo local. A prova PostgreSQL
live com role restrita, concorrência, RLS/permissões, RC imutável, runtime,
score, release, clínica, `0/145`, gates externos e reauditoria independente
continua aberta. O explorador independente encontrou o gap e não houve
`PASS` independente final; o papel `reviewer` não iniciou porque o modelo
fixado não é suportado nesta conta.

O rollback do código é `git revert 8bcbe58` somente mediante decisão
registrada; os testes de falha de persistência devem permanecer se o contrato
de resiliência do worker continuar vigente.

O programa permanece `IN_PROGRESS / PILOT_BLOCKED`; não houve alteração live,
produção, score, release, decisão clínica ou piloto.
