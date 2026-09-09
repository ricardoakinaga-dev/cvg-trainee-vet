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

Restaurar PG 16, aplicar migrations até o head (`verify:migrations`), reabrir pool
com timeout; ver `disaster-recovery.md` (perda total/corrupção).

## Verification

`/health/ready` 200 + live integration + E2E real antes de reativar o worker.

## Escalation

Corrupção ou perda → DR completo; RPO/RTO reais exigem AAA-001.
