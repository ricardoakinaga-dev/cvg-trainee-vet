# Runbook — Qdrant down

## Symptoms

`/health/dependencies` DEGRADED; alerta `qdrant_degraded` (warning).

## Detection

Saúde agregada; núcleo e readiness não são afetados por desenho.

## Immediate action

Nenhuma contenção necessária: o índice é derivado e opcional.

## Diagnosis

Distinguir: coleção ausente vs latência vs versão/modelo divergente
(reconciliação detecta drift de versão/modelo/hash/escopo).

## Recovery

Recriar coleção e rodar `pnpm reconcile:qdrant` (advisory lock, orphan cleanup,
no-op sem embedding quando nada mudou).

## Verification

Reconciliação limpa, zero órfãos, dependência volta a UP/DEGRADED conforme policy.

## Escalation

Divergência persistente após reconcile → investigar drift de modelo/versão
(AAA-701); nunca promover Qdrant a decisor transacional.
