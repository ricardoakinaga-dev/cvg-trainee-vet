# ADR-002 — Distributed rate limit via port + risk classes

- **Status:** aceito (implementação incremental) · **Data:** 2026-09-09
- **Contexto:** limiter em memória é single-node; multi-instância divide o budget
  sem perceber (P1-03). Sem Redis operado neste corte.
- **Decisão:** port `RateLimitStore` (`apps/api/src/security/rate-limit-store.ts`)
  com `MemoryRateLimitStore` (fallback local/teste/single-node explícito) e store
  scripted determinístico; 7 classes de risco; chave = hash de principal + IP
  normalizado + rota + classe; fail policy explícita; sem confiar em
  `X-Forwarded-For` sem trusted proxies.
- **Consequências:** implementação futura (Redis ou equivalente) pluga sem mudar
  chamadas; métricas de rejeição por classe desde já.
