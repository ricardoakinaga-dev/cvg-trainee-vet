# 0505 — Auditoria de Observabilidade e Operação

**Data:** 2026-08-10  
**Item:** 12 — Observabilidade e operação  
**Baseline:** 48/100  
**Resultado técnico/documental:** **95/100 — CONCLUÍDO COM GAPS OPERACIONAIS**

## Escopo e critério

A auditoria verificou health live/ready/dependencies, exportação de métricas, redaction, correlação, avaliação de SLO/alertas, runbooks e restauração PostgreSQL descartável. Não confunde evidência local sintética com autorização de release, piloto ou publicação clínica.

## Evidências

| Dimensão | Nota | Evidência |
|---|---:|---|
| health e dependências | 20/20 | GET /health/live, GET /health/ready e GET /health/dependencies; composição redigida de PostgreSQL/Qdrant/IA; teste HTTP de degradação e teste live com PostgreSQL/Qdrant UP. |
| métricas, exporter e redaction | 20/20 | contadores/histogramas em memória, renderização Prometheus allowlisted, endpoint interno protegido por capability, teste de auditoria e rejeição de participante; labels não carregam payload ou identificador proibido. |
| SLO, alertas e dashboard contract | 15/15 | evaluateSlo/evaluateOperationalAlerts com PASS/BREACHED/NO_DATA, alertas de PostgreSQL/Qdrant/SLO e contrato de painéis agregados em 0804. |
| logs, correlação e traces | 12/15 | JSON redigido, request_id/correlation_id API→outbox→worker e telemetria de rota/lote; spans distribuídos OpenTelemetry ainda dependem do ambiente externo. |
| backup, restore, RPO e RTO | 20/20 | scripts/verify-postgres-restore.mjs com pg_dump custom, pg_restore e banco descartável isolado; teste live restaurou marcador sintético, limpou origem auxiliar/destino/arquivo e mediu RTO local de 2.581 ms, abaixo do alvo de 4 h. RPO observado foi zero perda do marcador neste cenário. |
| runbooks, retenção e acesso | 8/10 | 0802/0803/0804 documentam health, reconciliação, IA desligável, restore, retenção aprovada, collector e acesso mínimo; retenção/collector/dashboards ainda precisam de configuração e ensaio no ambiente operacional real. |

## Testes executados

- RED do endpoint de dependências: rota inexistente falhou antes da implementação; GREEN em http/server/composição.
- RED da exportação Prometheus: método ausente falhou antes da implementação; GREEN em observabilidade/API/server.
- RED do restore: script inexistente/sem implementação falhou; GREEN em tests/integration/postgres-restore.test.ts com container PostgreSQL descartável.
- RED de SLO/alertas: módulo ausente falhou; GREEN com cobertura de definições válidas, inválidas, degradação, breach e ausência de dados.
- live API: tests/integration/api-health.test.ts, PostgreSQL/Qdrant reais locais e resposta sem URL, segredo, password ou api_key.
- verificação final: 75 arquivos Vitest passaram, 15 foram ignorados; 350 testes passaram, 16 foram ignorados; cobertura 84,92% statements, 80,34% branches, 85,89% functions e 85,61% lines; E2E 7/7; integração live 20 arquivos/27 testes sem skips.

## Limitações mantidas

- o endpoint interno usa envelope JSON para permitir o contrato API; o collector de produção precisa extrair somente data.text com credencial de serviço;
- não houve Prometheus/OTel externo, dashboard provisionado, retenção efetiva no fornecedor, teste de carga, crash real, failover ou múltiplas réplicas;
- a medição de RPO/RTO é local, sintética e descartável; não comprova backup agendado em produção;
- provider produtivo, conteúdo clínico aprovado, E2E navegador→API real e commit rastreável continuam bloqueios independentes.

## Decisão

O item 12 atinge a meta numérica de 95 no recorte técnico/documental e libera a abertura controlada do item 13. O release continua BLOCKED até collector/retention/traces/recovery de ambiente, produto completo, governança clínica e demais gates serem comprovados.
