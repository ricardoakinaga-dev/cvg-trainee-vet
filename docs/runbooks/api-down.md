# Runbook — API down

## Symptoms

`/health/live` sem resposta; E2E e readiness falham; 5xx ou timeout no edge.

## Detection

Probe `/health/live` (liveness, sem dependências) + alerta de availability breach.

## Immediate action

1. Confirmar se é o processo (porta/host) ou a máquina.
2. Não reiniciar em loop: capturar log estruturado recente (`event`, `route`, `outcome`).

## Diagnosis

- `listen` falhou (porta em uso, `port` inválido) vs crash em runtime (exceção fora do error-boundary).
- Dependência bloqueando cold start? API não deve aguardar Qdrant/IA (ver `OPS-061-READINESS`).

## Recovery

Reiniciar o processo com a mesma configuração validada no startup
(`packages/config` falha cedo; nunca fallback inseguro silencioso).

## Verification

`/health/live` 200 → `/health/ready` → E2E sintético.

## Escalation

Se readiness segue 503, escalar para `database-down.md`.
