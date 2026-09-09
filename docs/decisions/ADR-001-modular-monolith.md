# ADR-001 — Modular monolith (sem microserviços)

- **Status:** aceito · **Data:** 2026-09-09
- **Contexto:** necessidade de modularidade sem custo operacional distribuído.
- **Decisão:** manter modular monolith fortemente modularizado + worker separado;
  boundaries executáveis em `architecture-boundaries.json`.
- **Consequências:** deploys simples; rate-limit distribuído e tracing exigem
  disciplina extra (registry, store port, OTel). Revisitar só com prova objetiva
  (carga/falha isolada) — nunca por estética.
