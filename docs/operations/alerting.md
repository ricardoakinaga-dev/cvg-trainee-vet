# Alertas e roteamento operacional

Fecha OP-05/M10 da auditoria de 2026-10-07 no que é configurável no
repositório. A aplicação já avalia alertas em processo
(`packages/observability/src/operations.ts`: `postgres_not_ready`,
`qdrant_degraded`, `slo_breached`, `slo_no_data`, `worker_*`); esta página
liga esses sinais a um canal com dono.

## Caminho dos sinais

| Sinal | Origem | Como chega ao operador |
|---|---|---|
| API viva / pronta / dependências | `/health/live`, `/health/ready`, `/health/dependencies` (públicos) | `blackbox` → `prometheus` → regras `deploy/observability/alert-rules.yml` → `alertmanager` → webhook `CVG_ALERT_WEBHOOK_URL` |
| Web no ar | `GET /` do web | idem |
| Traces | OTLP da API (`OTEL_TRACES_ENABLED=true`) | `otel-collector` com redaction → backend OTLP do provedor |
| Logs estruturados | stdout JSON de api/worker/backup | driver de logs do host → agregador do provedor; sem payload clínico por desenho |
| Métricas internas (`/internal/metrics`) | exigem sessão interna com `VIEW_INTERNAL_AUDIT` | consulta manual por staff; não são raspadas anonimamente (ver backlog: token de scrape dedicado é feature com PRD/SPEC) |

## Regras entregues

| Alerta | Condição | Severidade | Runbook |
|---|---|---|---|
| `CvgApiNotLive` | liveness falhando 2 min | critical | `docs/runbooks/api-down.md` |
| `CvgPostgresNotReady` | readiness falhando 2 min | critical | `docs/runbooks/database-down.md` |
| `CvgDependenciesDegraded` | dependências ≠ 200 por 10 min | warning | `docs/runbooks/qdrant-down.md` |
| `CvgWebDown` | web sem resposta 2 min | critical | `docs/runbooks/failed-deploy.md` |
| `CvgProbeLatencyHigh` | readiness > 1,5 s por 5 min | warning | `docs/operations/slo.md` |

## Dono e canal

- Dono do canal de alertas: Ricardo (responsável do produto) até existir
  escala de plantão; segundo contato a definir antes do piloto (AAA-001 D6).
- Canal: webhook em `CVG_ALERT_WEBHOOK_URL` (chat ou pager do CVG). O valor é
  segredo de ambiente (`docs/security/secrets-management.md`).
- Teste obrigatório antes do go-live: parar o container `api`
  (`docker compose stop api`), confirmar `CvgApiNotLive` no canal em menos de
  5 minutos, religar e confirmar `resolved`. Registrar no log mestre.

## Fora deste corte

Dashboards de SLO com tráfego real, alertas de backlog do worker por métrica
(hoje só por log) e integração com pager comercial dependem do provedor
escolhido em AAA-001 D6.
