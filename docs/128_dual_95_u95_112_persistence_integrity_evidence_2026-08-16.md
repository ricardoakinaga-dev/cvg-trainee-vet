# Evidência local U95-112 — persistência, RLS, concorrência e restore

- **ID:** `DUAL95-U95-112-PERSISTENCE-INTEGRITY`
- **Data:** `2026-08-16`
- **Status local:** `READY_FOR_NEXT_STEP`
- **Disposição executiva:** `PILOT_BLOCKED`
- **Escopo:** transação de auditoria, contexto RLS, conflitos concorrentes e verificação de invariantes no restore PostgreSQL

## RED → GREEN

1. `audit.append` configurava `cvg.audit_write` numa chamada e executava o `INSERT` noutra. O teste focal reproduziu a ausência de transação compartilhada com `TypeError: db.execute is not a function` no fake que expõe somente executor transacional.
2. O verificador de restore confirmava marcador/objetos, mas não confirmava invariantes de RLS, auditoria append-only ou índices de concorrência.
3. A inserção de tentativa aberta e o update otimista de tentativa no salvamento de resposta podiam propagar conflitos PostgreSQL como erro inesperado, em vez de `state_conflict`/409.

O GREEN implementado:

- `createAuditRepository.append` configura `cvg.audit_write` e grava em uma única transação, preservando atomicidade e o escopo transacional do RLS;
- `PersistenceConflictError` é um `ApplicationError` de `state_conflict`; violações `23505`, misses de versão otimista e corridas de idempotência são normalizadas sem expor erro SQL;
- o restore executa uma sonda fail-closed em banco isolado para confirmar RLS `FORCE` de auditoria/attempts/answers/idempotências, policies de leitura/escrita da auditoria, trigger append-only e os índices únicos de tentativa aberta/resposta por item;
- o resultado do restore só pode ser `PASS` quando `invariantsVerified=true`.

## Evidência executada

### Focais locais

- auditoria: `5/5`;
- adapters de attempts/answers e conflitos concorrentes: `24/24` nos focais de persistência, além de `17/17` nos use cases de attempts/answers;
- restore/artefato: `9/9`;
- `pnpm test:coverage`: `178` arquivos aprovados, `816` testes aprovados, `16` arquivos guardados, `19` testes guardados;
- cobertura: `84,65%` statements, `80,13%` branches, `86,79%` functions, `85,54%` lines;
- hotspots: `PASS_WITH_DEBT_RATCHET`, `152` funções longas, maior função `128` linhas.

### PostgreSQL live temporário

Foram usados somente containers PostgreSQL temporários, banco vazio, dados sintéticos e cleanup automático; nenhum banco do runtime HA foi alterado.

- corrida de início de tentativa, resposta/auditoria e restore sintético + artefato checksummed: `5/5`;
- corrida: exatamente um vencedor, um conflito `state_conflict`/`409`, uma tentativa aberta e um snapshot de idempotência;
- restore sintético e por artefato: `PASS`, `targetIsolated=true`, `invariantsVerified=true`;
- rollback transacional de learning state: `1/1`, falha injetada sem linha persistida;
- isolamento PostgreSQL/RLS sem contexto, contexto próprio e contexto cruzado: `1/1`;
- migrações no banco temporário: `30/30`.

### Gate integral

`pnpm verify` passou no worktree atual com cobertura `84,65%/80,13%/86,79%/85,54%`, contratos `82/82`, worker `25/25`, migrações `30/30`, decisões críticas `7/7`, arquitetura `2/2`, secrets limpo e hotspots `152/128`. A matriz de rastreabilidade permanece honestamente em `145` requisitos, `0` cadeias completas, `145` gaps explícitos, `145` linhas de evidência local e `87/87` linhas P0/P1.

## Limites

Esta evidência fecha o mecanismo local e a regressão em PostgreSQL descartável. Não comprova backup agendado/offsite, PITR, retenção, RPO/RTO produtivos, DR, restore de produção, RC imutável, SHA/digest, CI/registry/deploy, revisão humana ou reauditoria independente. Não houve commit, staging, push, release, alteração de score ou remoção de `PILOT_BLOCKED`.

## Arquivos principais

- `packages/persistence/src/audit-repository.ts`
- `packages/persistence/src/attempt-repository.ts`
- `packages/persistence/src/answer-repository.ts`
- `scripts/verify-postgres-restore.mjs`
- `scripts/verify-postgres-restore-support.mjs`
- `tests/integration/postgres-attempt-repository.test.ts`
- `tests/integration/postgres-learning-state.test.ts`
- `tests/integration/postgres-security-isolation.test.ts`
- `tests/integration/postgres-restore.test.ts`
