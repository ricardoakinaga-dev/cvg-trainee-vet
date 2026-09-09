# Runbook — Worker backlog

## Symptoms

Fila cresce; `worker_jobs`/`retries` sobem; dead-letters aparecem.

## Detection

Métricas do worker + alerta de backlog/dead-letter.

## Immediate action

1. Inspecionar dead-letter primeiro (poison messages isoladas, sem replay cego).
2. Não escalar réplicas antes de entender a causa (duplo worker compete por lease).

## Diagnosis

Lentidão downstream (Qdrant/IA) vs mensagem venenosa vs crash-loop
(visibility timeout devolve a mensagem; fencing impede duplo efeito).

## Recovery

Corrigir a causa, replay idempotente da fila; `AI_ENABLED=false` se o gargalo
for o provider (caminho degradado explícito).

## Verification

Backlog drenado, dead-letter zerada/explicada, sem duplicação de efeitos.

## Escalation

Backlog por saturação de DB → `database-down.md`; bug de handler → backlog + fix TDD.
