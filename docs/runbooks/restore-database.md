# Runbook — Restore database

## Symptoms

Necessidade de restore (DR, corrupção, ambiente descartável).

## Detection

Decisão humana/operacional; nunca automática em produção sem AAA-001.

## Immediate action

1. Restore sempre em instância isolada primeiro.
2. Usar apenas backups com integrity verification registrada.

## Diagnosis

Compatibilidade backup ↔ migration head (`verify:migrations`); divergência de
schema/owner/RLS.

## Recovery

Restore isolado → migrations até o head → consistency checks → promover.

## Verification

Live integration + E2E real + RLS negativo no restaurado; registrar duração
do restore (base do RTO).

## Escalation

Incompatibilidade de migration → forward-fix revisado; nunca `down` invisível.
