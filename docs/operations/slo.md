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

## Medição local conectada — SOA-36

`api.slo.duration_ms` recebe durações monotônicas de respostas 2xx das rotas
registradas `/api/v1/`, excluindo `ai-assisted`: GET é leitura; demais métodos
permitidos são mutação. Health, rotas desconhecidas e erros ficam fora desta
população de latência; a disponibilidade mantém sua população própria.
A janela é a vida do processo, desde o último boot: não é uma janela móvel nem
uma agregação entre instâncias. A medição termina antes da serialização/escrita
HTTP; não representa latência de rede ou duração percebida pelo navegador.

O p95 é uma estimativa interpolada de histograma cumulativo com buckets fixos
em milissegundos, não a média de count/sum. No bucket +Inf usa o limite inferior
finito, conforme convenção de quantil de histograma; valores extremos não são
uma medição exata. Sem amostras ou com estrutura de buckets inconsistente,
retorna NO_DATA. Exportação Prometheus inclui buckets cumulativos com `le`.
Os alvos do código continuam inclusivos (≤800 e ≤1500 ms); as expressões `<`
da tabela anterior são históricas e não alteram esse comportamento.

Testes: `packages/observability/src/operations.test.ts`,
`packages/observability/src/observability.test.ts`, `apps/api/src/server.test.ts`.
Não houve comprovação de SLO produtivo nem propagação de deadlines nesta fatia.

Error budget: `availabilityBudget`/`latencyBudget` embutidos; `BREACHED` gera
alerta `slo_breached` (critical p/ availability, warning p/ latência); sem dados
→ `slo_no_data` (warning, evita alert fatigue com `NO_DATA` explícito).

Fora deste corte (backlog): SLOs de worker backlog/dead-letter e latência de IA
(desligável, fora do caminho). Backup/restore deve atender aos alvos aprovados
no PRD/RNF-015 e D-107 (RPO ≤1h, RTO ≤4h); demonstrar a capacidade operacional
e qualquer uso em produção continua sujeito a AAA-001.
