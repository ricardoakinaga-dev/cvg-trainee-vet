# Disaster Recovery

Princípios: PostgreSQL é a verdade (restore = reconstruir tudo o mais);
Qdrant é derivado (rebuild via `reconcile:qdrant`); IA é opcional (desligar não
quebra o núcleo). RPO/RTO de produção dependem de AAA-001; abaixo, procedimentos
validados apenas em ambiente descartável local.

## Perda total do PostgreSQL

- Detection: `/health/ready` 503 + alerta `postgres_not_ready` (critical).
- Containment: parar worker (evita outbox órfão), API segue servindo 503 explícito.
- Recovery: provisionar PG 16, aplicar migrations `0000→head` (`pnpm db:migrate`),
  restaurar backup sintético mais recente, `verify:migrations`, checar RLS/owners.
- Verification: `/health/ready` 200, live integration, E2E real.
- Post-incident: registrar RTO medido, causa, gap de backup.

## Corrupção de dados

- Detection: integrity checks / live tests vermelhos.
- Containment: congelar writes (read-only se possível), preservar snapshot.
- Recovery: restore isolado + reconciliação; nunca editar produção à mão.
- Verification: consistency checks + auditoria de divergência.

## Perda do Qdrant

- Detection: `/health/dependencies` DEGRADED + `qdrant_degraded` (warning).
- Containment: nenhuma — núcleo segue (índice é opcional por desenho).
- Recovery: recriar coleção + `pnpm reconcile:qdrant` (advisory lock, orphan cleanup).
- Verification: contagem reconciliada, zero órfãos, readiness volta a UP/DEGRADED conforme policy.

## Worker failure / backlog

- Detection: `worker_jobs`/`dead_letters` + SLO worker (quando instrumentado).
- Containment: drenar fila, inspecionar dead-letter (poison messages isoladas).
- Recovery: replay idempotente (lease/fencing impedem duplo efeito).
- Verification: backlog zerado sem duplicação de efeitos externos.

## Bad deploy

- Detection: readiness falha, 5xx elevado, E2E pós-deploy vermelho.
- Containment: rollback ao SHA anterior (migrations são forward-only: rollback =
  forward-fix, nunca down invisível).
- Recovery: re-deploy do bundle com evidence (commit+digest+provenance).
- Verification: release gate completo no SHA restaurado.

## Compromised credential

- Detection: audit trail anômalo, alerta de auth failures.
- Containment: revogar sessões/tokens afetados, rodar segredos (fora do Git).
- Recovery: reemitir, revalidar ACLs/owners, revisar `verify:secrets`.
- Verification: matriz de privilégios + live negativo; ver runbook dedicado.

## Provider outage (IA/embeddings)

- Detection: timeout/quota + fallback seguro logado.
- Containment: `AI_ENABLED=false` (caminho degradado explícito).
- Recovery: reativar após health do provider; reprocessar fila pendente.
- Verification: evals + schema validation do output; nenhuma decisão automática
  da IA é aceita retroativamente.
