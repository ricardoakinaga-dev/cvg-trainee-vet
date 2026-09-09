# Runbook — Failed deploy

## Symptoms

Readiness falha pós-deploy, 5xx elevado, E2E pós-deploy vermelho.

## Detection

Release gate + E2E + alertas de availability/latência.

## Immediate action

Rollback ao SHA anterior com evidence bundle (commit+digest+provenance).

## Diagnosis

Config inválida (falha cedo no startup) vs migration vs código; comparar
manifests de release (SHA, migration head, digests).

## Recovery

Forward-fix em branch + gate completo; migrations seguem append-only
(rollback de schema = nova migration, nunca edição histórica).

## Verification

Release gate verde no SHA restaurado/corrigido antes de reabrir tráfego.

## Escalation

Falha de migration em produção → DR (corrupção) + decisão humana.
