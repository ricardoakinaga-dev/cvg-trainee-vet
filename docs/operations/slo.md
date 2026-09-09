# SLOs

Implementados em `packages/observability/src/operations.ts`
(`DEFAULT_OPERATIONAL_SLOS`, `evaluateSlo`, `deriveOperationalSnapshot`).
Alvos iniciais realistas para piloto local/sintético; produção exige re-baseline
com tráfego real (AAA-001).

| SLO | Alvo | Justificativa |
|---|---|---|
| `core.availability` (fração success/total) | ≥ 0,995 | monolito + PG único; 99,9% seria impraticável sem multi-AZ |
| `api.read.p95` | < 800 ms | leituras com RLS + projeção; medido localmente |
| `api.mutation.p95` | < 1500 ms | transações + reconciliação; sem IA no caminho crítico |

Error budget: `availabilityBudget`/`latencyBudget` embutidos; `BREACHED` gera
alerta `slo_breached` (critical p/ availability, warning p/ latência); sem dados
→ `slo_no_data` (warning, evita alert fatigue com `NO_DATA` explícito).

Fora deste corte (backlog): SLOs de worker backlog/dead-letter, backup/restore
(RPO/RTO dependem de AAA-001), latência de IA (desligável, fora do caminho).
