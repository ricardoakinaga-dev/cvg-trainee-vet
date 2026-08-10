# Evidência operacional — HA, telemetria e failover

**Data:** 2026-08-10
**Ambiente:** Docker Compose descartável, dados sintéticos, máquina local
**Objetivo:** verificar collector, retenção, traces, carga, failover e réplicas sem atribuir evidência local a uma implantação hospitalar

## Topologia verificada

```text
Caddy edge :8080
  ├── api-a :3000  (health-routed)
  └── api-b :3000  (health-routed)

worker-a + worker-b
PostgreSQL 16 + migration job
Qdrant 1.15.5
OTel Collector 0.136.0  (OTLP gRPC :4317 / HTTP :4318)
Prometheus 2.55.1       (retention 15d / 20GB)
Grafana 11.3.0
```

O topology check está automatizado por [`scripts/verify-ha-topology.mjs`](../scripts/verify-ha-topology.mjs):

```text
pnpm ops:verify-ha
PASS — api-a/api-b, worker-a/worker-b, migration dependency, collector OTLP,
Prometheus retention, metrics secret and Caddy failover topology
```

## Resultados executados

| Controle | Execução | Resultado |
| --- | --- | --- |
| Migração | Compose `migrate` antes dos APIs | exit 0; PostgreSQL saudável |
| Réplicas | `api-a`, `api-b`, `worker-a`, `worker-b` | quatro processos saudáveis; APIs bind em `0.0.0.0` |
| Métricas | Prometheus scraping `/internal/metrics/prometheus` | `api-a`, `api-b` e `otel-collector` `up`, sem erro de scrape |
| Collector | carga HTTP pelo edge e logs do collector | OTLP recebido; debug exporter registrou lotes de 5 e 4 spans |
| Carga normal | 200 requests, concorrência 20, timeout 5s | 200/200 HTTP 2xx; 100%; p95 96,69 ms; 419,72 req/s |
| Failover | `docker stop ...api-a-1`, depois 200 requests pelo edge | 200/200 HTTP 2xx; 100%; p95 66,22 ms; 468,47 req/s |
| Recuperação | `docker start ...api-a-1` | api-a e api-b voltaram a `healthy`; Prometheus voltou a observar as duas réplicas |
| Retenção | flags do Prometheus | `--storage.tsdb.retention.time=15d` e `--storage.tsdb.retention.size=20GB` |

O smoke de carga é reproduzível por [`scripts/run-load-smoke.mjs`](../scripts/run-load-smoke.mjs):

```text
CVG_LOAD_TARGET=http://127.0.0.1:8080/health/live
CVG_LOAD_REQUESTS=200 CVG_LOAD_CONCURRENCY=20 CVG_LOAD_TIMEOUT_MS=5000
pnpm ops:load-smoke
```

## Segurança da evidência

- O token de scrape foi sintético, fornecido por arquivo Docker temporário e não foi gravado no Git.
- O collector não recebe payload clínico: os spans registram método, rota, status, outcome e duração limitada.
- O ambiente usou PostgreSQL/Qdrant e tráfego sintéticos; nenhum prontuário, tutor, foto, PDF ou resposta real foi usado.
- Os containers e volumes dessa prova devem ser tratados como descartáveis; a prova não equivale a deployment de produção.

## Limites atuais

1. O collector recebeu e registrou traces, mas a topologia desta prova usa `debug` exporter; não há backend durável de traces configurado.
2. A retenção comprovada é a retenção de métricas do Prometheus. Retenção de traces e política de backup/restore de produção ainda exigem backend e runbook implantados.
3. MFA e recuperação de conta estão implementados como adapter server-side e permanecem `NOT_CONFIGURED` sem um provedor de identidade configurado; não foram simulados como concluídos.
4. Carga, failover e múltiplas réplicas foram comprovados em um ambiente local sintético, não em uma infraestrutura externa de produção.

## Deployment local ativo após publicação do código

Depois da prova descartável, a mesma topologia foi iniciada como Compose project `cvg-trainee-vet-ha` e permanece ativa com volumes nomeados. O edge externo foi movido para `:3180` porque `:8080` está reservado no inventário da máquina; a web Next.js está em `:3100` sob systemd user e reescreve `/health/*` e `/api/v1/*` para o edge.

Na validação final, a web retornou 200, o proxy web retornou 200, o edge retornou live/ready 200, e a carga final entregou 100/100 HTTP 200 em operação normal, 100/100 durante parada controlada de API-A e 100/100 depois da restauração. Prometheus reportou três targets `up`; Grafana respondeu `database: ok`; Qdrant respondeu `all shards are ready`; e o collector registrou lotes de spans.

Esta ativação continua sendo local/LAN/Tailscale: não é publicação hospitalar, não possui domínio/TLS, identidade externa nem backend durável de traces. A entrada do participante segue protegida por convite interno.
