# ADR-005 — Resilience policy (timeout, retry, shutdown)

- **Status:** aceito · **Data:** 2026-09-09
- **Contexto:** retry infinito já foi eliminado do bootstrap Qdrant (bounded +
  jitter + `Retry-After`); faltam deadlines propagados e shutdown documentado.
- **Decisão:** toda operação externa/bloqueante tem timeout (`RequestContext.deadlineMs`
  como veículo); retry só para transitória + idempotente/chave de idempotência,
  backoff exponencial limitado + jitter, nunca infinito; graceful shutdown
  (SIGTERM → drenar → fechar pool → flush telemetria → sair); sem circuit breaker
  indiscriminado (decisão registrada por integração quando necessária).
- **Consequências:** comportamento sob falha previsível e testável (fault
  injection só em testes, nunca em produção).
