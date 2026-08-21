# Evidência Dual99 — B99-201 — estado final do ACK do outbox

**Data:** 2026-08-21 11:54 -03:00
**Task:** B99-201 — outbox claim/lease/ack
**ID:** `DUAL99-B99-201-OUTBOX-ACK-STATE-308`
**Predecessora:** `docs/135_dual_99_local_execution_evidence_2026-08-20.md`
**Branch:** `agent/publish-production-hardening`

## Gap reproduzido

Uma revisão read-only do adapter de outbox encontrou que o ACK que transforma
um evento `PROCESSING` em `PROCESSED` limpava `locked_until`, mas preservava
`last_error_code`. Depois de uma falha transitória seguida de processamento
bem-sucedido, a linha terminal continuava exibindo o erro anterior, deixando o
estado persistido e a observabilidade inconsistentes.

Nenhum segredo real, prontuário, tutor, foto, PDF, fonte clínica ou banco de
produção foi usado.

## RED → GREEN → REFACTOR

- **RED:** o teste focal capturou a SQL gerada por `markProcessed` e falhou
  porque o `UPDATE` não continha `last_error_code = null`.
- **GREEN:** o ACK agora limpa explicitamente o marcador de erro junto com
  `status`, `processed_at` e `locked_until`.
- **REFACTOR:** o fake PostgreSQL do teste expõe apenas o executor SQL
  necessário; a regressão verifica o contrato do adapter sem simular a
  persistência fora da fronteira SQL.

## Código e teste

- `0e0e2c8` — `fix: clear outbox failure marker on ack`;
- `packages/persistence/src/outbox-repository.ts`;
- `packages/persistence/src/outbox-repository.test.ts`.

## Verificação local

- foco worker/persistência: `24/24` testes passantes;
- suíte com cobertura: `205` arquivos passantes, `17` arquivos e `21` testes
  guardados, `1174` testes passantes;
- cobertura: `95,03%` statements, `90,95%` branches, `95,31%` functions e
  `95,73%` lines;
- `CVG_API_INTERNAL_URL=http://127.0.0.1:4000 pnpm build`: PASS, `12/12`;
- `pnpm verify:hotspots`: PASS_WITH_DEBT_RATCHET, `0` hotspots;
- `pnpm format:check`: PASS;
- `pnpm lint`: PASS;
- `pnpm typecheck`: PASS;
- `pnpm verify:exposure`: PASS;
- `git diff --check`: PASS;
- `pnpm verify:secrets`: fail-closed somente nos quatro assignments redigidos
  preexistentes de `infra/production/.env.local`; o arquivo não foi lido nem
  alterado.

## Limites, decisão e rollback

B99-201 permanece `READY_FOR_NEXT_STEP` no escopo local. A prova PostgreSQL
live com role restrita, concorrência, RLS/permissões, RC imutável, runtime,
score, release, clínica, `0/145`, gates externos e reauditoria independente
continuam abertos. O crítico independente desta rodada expirou sem relatório e
foi encerrado; não há `PASS` independente.

O rollback do código é `git revert 0e0e2c8` somente mediante decisão registrada;
a regressão deve ser preservada se o contrato de estado terminal continuar
vigente.

O programa permanece `IN_PROGRESS / PILOT_BLOCKED`; não houve alteração live,
produção, score, release, decisão clínica ou piloto.
