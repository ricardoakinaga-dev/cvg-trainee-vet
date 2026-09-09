# ADR-003 — Observabilidade OTel-compatível, sem acoplamento

- **Status:** aceito (migração gradual) · **Data:** 2026-09-09
- **Contexto:** observabilidade interna real (logs redigidos, métricas, SLO),
  mas sem traces distribuídos nem collector.
- **Decisão:** `RequestContext` carrega `requestId`/`correlationId` (e futuramente
  `traceId`/`spanId`); collector de referência OTel (OTLP → Prometheus/Tempo/Loki)
  sem acoplar a app ao Grafana; métricas `api.*` existentes preservadas até
  migração versionada (não quebrar SLO/alertas atuais).
- **Consequências:** instrumentação por span útil (HTTP → use case → transação),
  sampling configurável, sem payload sensível.
