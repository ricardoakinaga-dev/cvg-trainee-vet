# 0804 — Contrato Operacional de Observabilidade

**Status:** implementado e verificado no HA local, com gaps de infraestrutura externa.
**Escopo:** sinais técnicos do CVG, sem payload clínico, prontuário, foto, PDF, tutor, participante identificável ou fonte protegida.

## Exporter e collector

- A API expõe GET /internal/metrics somente para AUDITOR/ADMIN com a capability VIEW_INTERNAL_AUDIT.
- A resposta contém um envelope interno com format: prometheus e texto Prometheus produzido por @cvg/observability; nomes e labels são normalizados por allowlist e não aceitam identificadores de participante.
- O collector de ambiente deve consultar a rota com credencial de serviço somente leitura, extrair data.text, rejeitar resposta sem format: prometheus e enviar os samples ao armazenamento de métricas do ambiente. O collector não deve encaminhar cookies de participante.
- Logs saem como JSON já redigido pelo sink do processo. O agente de coleta deve transportar stdout/stderr como registro estruturado, sem reidratar campos removidos.
- Métricas e logs de processo são sinais operacionais; PostgreSQL continua sendo a fonte dos estados educacionais e da auditoria de domínio.

No Compose HA, API A/B e worker A/B são coletados com bearer token somente de
leitura; rules são montadas explicitamente; Prometheus aguarda Alertmanager
saudável; e o token é preparado por `prometheus-secret-init` para o processo
não-root. A evidência local de targets, rules, permissão negativa e ciclo
`fire → ack → resolve` está em
[`docs/119_dual_95_u95_102_observability_evidence_2026-08-16.md`](../../docs/119_dual_95_u95_102_observability_evidence_2026-08-16.md).

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

## Loss of signal

Prometheus coleta explicitamente `cvg-api`, `cvg-worker` e `alertmanager` e
mantém sete regras de perda de sinal: API target down/ausente, worker target
down/ausente, Alertmanager desconectado, watchdog contínuo e watchdog ausente.
`up == 0` detecta uma réplica que deixou de responder; `absent(up{...})`
detecta o caso em que o target inteiro desapareceu. O watchdog é um dead-man
operacional e não contém dados de usuário. Cada regra usa este runbook, owner
SRE e janela de acknowledgement de cinco minutos.

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
| scrape, rules e Alertmanager HA | `scripts/verify-ha-topology.mjs`, `tests/integration/production-edge-contract.test.ts`, evidência U95-102 e `docs/133` | arquivo atual com 12 rules passa validação estática, mas o Prometheus ativo ainda expõe 7 rules antigas; cinco regras novas, API loss-of-signal e fire→notify→ack→resolve permanecem `NOT_EXECUTED` |
| SLO/alertas | packages/observability/src/operations.test.ts | PASS, BREACHED, NO_DATA, dependência crítica e degradação cobertos |
| backup/restore | scripts/verify-postgres-restore.mjs e tests/integration/postgres-restore.test.ts | marcador sintético restaurado em banco descartável isolado |
| Qdrant rebuild/reconcile | tests/integration/worker-qdrant-live.test.ts e pnpm reconcile:qdrant | fonte PostgreSQL, contadores técnicos, replay idempotente e remoção de órfão |

## Backup, RPO e RTO

O teste de restauração usa marcador sintético, `pg_dump` custom, `pg_restore` e banco temporário com nome aleatório. O modo adicional de artefato valida manifesto, tamanho e SHA-256 de um dump já armazenado fora do repositório antes de restaurá-lo; a execução live no HA ativo passou nos dois cenários, com artefato de 197.097 bytes, 27 objetos restaurados e RTO observado de 2.357 ms. O teste não grava dumps no repositório e remove os temporários ao final. O marcador inserido antes do dump fornece RPO observado de zero perda somente no cenário sintético. Isso é evidência de mecanismo e não substitui backup agendado, fornecedor, janela de retenção ou ensaio de produção.

## Gaps que continuam bloqueando release

- collector/OTel, dashboards e retenção precisam ser configurados e testados no ambiente operacional real;
- restart/crash de processo, carga, múltiplas réplicas e failover ainda não foram medidos;
- provider produtivo de embedding/IA, navegador contra API real, conteúdo clínico aprovado e commit rastreável continuam gates independentes;
- RPO/RTO medidos localmente não autorizam piloto ou publicação clínica.
