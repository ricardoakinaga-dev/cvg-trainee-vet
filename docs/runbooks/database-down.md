# Runbook — Database down

## Symptoms

`/health/ready` 503; alerta `postgres_not_ready` (critical); writes falham.

## Detection

Readiness = PostgreSQL-only por desenho; snapshot operacional `NOT_READY`.

## Immediate action

1. Parar o worker (evita outbox órfão e retry inútil).
2. API segue retornando 503 explícito (sem fallback silencioso).

## Diagnosis

Conectividade vs credencial vs saturação de pool (`db_pool_connections`,
`db_errors_total`); checar `DATABASE_URL` (role app, nunca migration/admin).

## Recovery

Ver `restore-database.md`/`disaster-recovery.md`: restaurar em destino vazio e
isolado, identificar schema/journal do snapshot, validar compatibilidade e
aplicar somente migrations posteriores antes dos checks. `verify:migrations`
valida o manifesto do repositório, não o estado do banco restaurado. Reabrir o
pool apenas depois das validações.

## Verification

`/health/ready` 200 + live integration + E2E real antes de reativar o worker.

## Escalation

Corrupção ou perda → DR completo. O alvo aprovado por RNF-015/D-107 é RPO ≤1h
e RTO ≤4h; métricas locais sintéticas não demonstram capacidade operacional.
RPO/RTO observados em operação e qualquer uso em produção continuam sujeitos
a AAA-001.
