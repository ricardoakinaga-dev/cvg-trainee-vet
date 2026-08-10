# 0414 — Metrics Audit

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
