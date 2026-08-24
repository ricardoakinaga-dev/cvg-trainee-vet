# 0804 — Contrato Operacional de Observabilidade

**Status:** implementado e verificado com gaps de infraestrutura externa.  
**Escopo:** sinais técnicos do CVG, sem payload clínico, prontuário, foto, PDF, tutor, participante identificável ou fonte protegida.

## Exporter e collector

- A API expõe GET /internal/metrics somente para AUDITOR/ADMIN com a capability VIEW_INTERNAL_AUDIT.
- A API expõe GET /internal/operations somente para a mesma capability; o snapshot liga
  dependências redigidas, disponibilidade e alertas sem devolver amostras individuais.
- A resposta contém um envelope interno com format: prometheus e texto Prometheus produzido por @cvg/observability; nomes e labels são normalizados por allowlist e não aceitam identificadores de participante.
- O collector de ambiente deve consultar a rota com credencial de serviço somente leitura, extrair data.text, rejeitar resposta sem format: prometheus e enviar os samples ao armazenamento de métricas do ambiente. O collector não deve encaminhar cookies de participante.
- Logs saem como JSON já redigido pelo sink do processo. O agente de coleta deve transportar stdout/stderr como registro estruturado, sem reidratar campos removidos.
- Métricas e logs de processo são sinais operacionais; PostgreSQL continua sendo a fonte dos estados educacionais e da auditoria de domínio.

## SLOs e alertas mínimos

| Sinal | Alvo | Alerta |
|---|---:|---|
| disponibilidade do núcleo | ≥ 99,5% | postgres_not_ready crítico ou slo_breached crítico |
| p95 de leitura API | < 800 ms | slo_breached de atenção |
| p95 de mutação API | < 1,5 s | slo_breached de atenção |
| processamento de correção/outbox | ≥ 99% em 5 min | slo_breached crítico quando o núcleo for afetado |
| Qdrant/IA assistiva | degradação explícita | qdrant_degraded de atenção; IA pode ser desligada |
| ausência de amostra | dados insuficientes | slo_no_data de atenção |

evaluateSlo e evaluateOperationalAlerts são funções puras, testadas e redigidas. NO_DATA não é tratado como sucesso. Nenhum alerta altera nota, gabarito, publicação ou estado educacional.

## Dashboard mínimo

O dashboard de operação deve apresentar somente agregados por serviço/rota/evento:

1. disponibilidade e status READY/DEGRADED/NOT_READY;
2. p50/p95/p99 de leitura, mutação e lote do worker;
3. taxa de erro, retry, dead-letter e atraso de outbox;
4. divergência Qdrant (expected, upserted, removed);
5. uso/erro/latência da IA, sem prompt ou resposta;
6. orçamento de erro e alertas abertos.

Não há ranking de veterinários nem métrica punitiva.

## Correlação e limites de trace

request_id e correlation_id são validados na borda, propagados ao worker quando presentes e aparecem somente em logs técnicos. A correlação local API→outbox→worker está verificada. Exportação OpenTelemetry, spans distribuídos entre processos e retenção/acesso no fornecedor de telemetria ainda dependem da configuração de homologação/produção e permanecem gap explícito.

## Retenção e acesso

- Dados educacionais seguem a política aprovada de vínculo + 2 anos, com eliminação/anonimização posterior conforme obrigação aplicável.
- Logs operacionais não são fonte de auditoria de domínio; o collector deve aplicar retenção mínima necessária e acesso por papel de operação, sem retenção de payload bruto.
- Auditoria de domínio é append-only, metadata-only e permanece sob autorização server-side/RLS.

## Runbooks exercitados

| Runbook | Evidência | Resultado |
|---|---|---|
| health/readiness/dependencies | tests/integration/api-health.test.ts e apps/api/src/server.test.ts | PostgreSQL/Qdrant UP live; degradação redigida em teste HTTP |
| exportação e redaction | apps/api/src/http.test.ts e packages/observability/src/observability.test.ts | auditor autorizado recebe métrica; participante recebe 401/403; campos proibidos não aparecem |
| SLO/alertas | packages/observability/src/operations.test.ts | PASS, BREACHED, NO_DATA, dependência crítica e degradação cobertos |
| backup/restore | scripts/verify-postgres-restore.mjs e tests/integration/postgres-restore.test.ts | marcador sintético restaurado em banco descartável isolado |
| Qdrant rebuild/reconcile | tests/integration/worker-qdrant-live.test.ts e pnpm reconcile:qdrant | fonte PostgreSQL, contadores técnicos, replay idempotente e remoção de órfão |

## Backup, RPO e RTO

O teste de restauração usa somente um marcador sintético, pg_dump custom, pg_restore e banco temporário com nome aleatório. A execução local desta rodada verificou o marcador, isolou o destino e mediu **RTO de 2.581 ms**; o teste não grava o dump no repositório e remove origem auxiliar, destino e arquivo temporário ao final. O marcador inserido antes do dump foi recuperado, fornecendo RPO observado de zero perda nesse cenário. Isso é evidência de mecanismo e não substitui backup agendado, fornecedor, janela de retenção ou ensaio de produção.

## Gaps que continuam bloqueando release

- O bridge `/internal/operations` é evidência local de derivação e não substitui o
  collector nem cria histórico; p95 permanece `NO_DATA` enquanto não houver buckets ou
  quantis.
- collector/OTel, dashboards e retenção precisam ser configurados e testados no ambiente operacional real;
- restart/crash de processo, carga, múltiplas réplicas e failover ainda não foram medidos;
- provider produtivo de embedding/IA, navegador contra API real, conteúdo clínico aprovado e commit rastreável continuam gates independentes;
- RPO/RTO medidos localmente não autorizam piloto ou publicação clínica.
