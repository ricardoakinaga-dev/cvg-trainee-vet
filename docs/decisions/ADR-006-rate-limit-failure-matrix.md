# ADR-006 — Distributed rate-limit failure matrix

- **Status:** aceito · **Data:** 2026-09-09
- **Contexto:** com backend distribuído, a indisponibilidade do backend não pode
  virar nem bypass silencioso nem indisponibilidade total sem decisão explícita.
- **Decisão (`FAIL_POLICY_BY_RISK_CLASS`):** todas as classes sensíveis falham
  fechadas (`authentication`, `recovery`, `mutation`, `expensive-read`,
  `internal`, `ai-assisted`); apenas `public-low-risk` (health probes) falha
  aberta para preservar liveness/readiness. Backend Redis via script Lua atômico
  (INCR+PEXPIRE+PTTL em um EVAL); timeout padrão 500 ms configurável;
  cancelamento via AbortSignal; `MemoryRateLimitStore` permanece fallback
  single-node/teste. O driver de transporte é injetado (`RedisScriptClient`);
  nenhuma dependência nova foi adicionada sem consumidor com servidor real —
  a prova live contra Redis real é residual documentado.
- **Trusted proxy:** `TRUSTED_PROXIES` (lista explícita, default vazia);
  `X-Forwarded-For`/`X-Real-IP`/`Forwarded` só valem de proxy confiável;
  spoof cai no IP do socket (fail-closed).
- **Consequências:** multi-réplica com budget único quando o backend existir;
  sem backend, comportamento explícito por classe + métricas de rejeição.
