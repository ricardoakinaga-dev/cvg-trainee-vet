# 0414 — Metrics Audit

## Reauditoria vigente — 2026-08-11

O smoke de carga com timeout explícito passou com 100/100 respostas 200 e p95 aproximado de 115,47 ms. A topologia HA foi validada. O comando default do smoke falha antes das requisições porque o valor 5_000 é convertido de forma inválida; não há prova de SLO/alerta efetivo em ambiente externo ou traces duráveis.

Resultado: PARTIAL no recorte F3-S3 + complemento F3-S5 — contadores/histogramas em memória e instrumentação de API/worker passam em testes; não há collector persistente, alertas, SLOs publicados ou dashboards nesta fase.

## Métricas técnicas

Disponibilidade, taxa de erro, p95/p99, pool PostgreSQL, migração, outbox lag, retry/dead jobs, Qdrant index lag, IA latency/error/refusal, worker throughput, health e restauração.

## Métricas de produto

Ativação, próxima ação, conclusão, correção no SLA, remediação, retenção, feedback, conteúdo vencendo e incidentes de exposição. Não criar ranking ou métrica punitiva.

## Evidência F3-S5

- API registra `api.requests.total` e `api.request.duration_ms` por rota normalizada/status/resultado;
- worker registra eventos processados/falhos, lotes concluídos e duração do lote;
- labels são allowlistadas e rotas/identificadores são limitados; payloads não são métricas;
- `packages/observability/src/observability.test.ts`, `apps/api/src/server.test.ts` e `apps/worker/src/loop.test.ts` cobrem redaction, repetição, falha e correlação.

## Critério

Evidência disponível somente como comandos de verificação e resultados de testes; isso não constitui telemetria de produção.

É possível verificar o comportamento técnico do processo no recorte, mas ainda não acompanhar saúde histórica sem abrir o código/consultar o processo; collector, retenção e dashboards são lacuna em 0420. Métricas nunca devem revelar fonte ou dados internos ao participante.

## Resultado vigente — 2026-08-11

`PASS_WITH_GAPS`. Smoke no edge local: 200/200, 100%, concorrência 20, p95 122,37 ms. `/internal/metrics/prometheus` respondeu 401 sem credencial no edge interno e o edge público redirecionou 308. HA/topologia e Tempo local passaram; alertas, SLO publicado, retenção externa e capacidade de produção permanecem `NOT_EXECUTED`.
