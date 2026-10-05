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
| backup/restore | scripts/verify-postgres-restore.mjs, scripts/verify-restore-migrations.mjs e testes de integração correspondentes | marcador sintético; fixture histórica 0053→restore→0054; journal, policies RLS e ownership no destino descartável |
| Qdrant rebuild/reconcile | tests/integration/worker-qdrant-live.test.ts e pnpm reconcile:qdrant | fonte PostgreSQL, contadores técnicos, replay idempotente e remoção de órfão |

## Backup, RPO e RTO

O contrato `cvg-restore-summary/v2` registra `verificationDurationMs` e nunca o classifica como RTO. No verificador com origem explicitamente fornecida, o intervalo abrange dump, criação do destino, restore e leitura do marcador; no modo local, o produtor delega ao drill histórico e o intervalo abrange o fixture completo `0053 → restore → 0054`. A execução local mais recente levou **2.172 ms** nesse intervalo sintético. Uma medição anterior de **2.581 ms** apareceu em um artefato v1 como `rtoMs` e permanece somente como histórico corrigido. Nenhum desses intervalos mede o procedimento operacional completo ou prova um RPO. Os testes usam marcador sintético, dump custom e destino isolado; removem origem auxiliar, destino e arquivos temporários. Eles não substituem backup agendado, fornecedor, janela de retenção ou ensaio de produção.

O drill histórico adicional `pnpm verify:restore-migrations` passou em cluster PostgreSQL 16 descartável acessível apenas por socket Unix privado, sem listener TCP. O snapshot sintético parou em `0053_aaa_content_integrity`; antes da criação do alvo, o preflight executa `pg_restore --list` e decodifica o archive para SQL temporário. Uma cópia sintética com o magic header adulterado é rejeitada e o teste confirma que o banco-alvo continua inexistente. O dump válido foi restaurado com `--no-owner`, o marcador e prefixo Drizzle foram verificados, a migration pendente `0054_aaa_content_indexer_service` foi aplicada e o head final coincidiu com o repositório. O catálogo confirmou a expressão completa das quatro policies por tabela, comando, modo permissivo e role. `content_versions` restringe o status publicado à própria linha; `ai_suggestions` liga `content_id`, `version` e `status='PUBLICADO'` na mesma subconsulta da versão associada. Também foram confirmados `ENABLE/FORCE RLS` e owners de `content_versions`/`ai_suggestions` iguais ao role restaurador `NOSUPERUSER NOBYPASSRLS`. Para essas duas tabelas, tipos, defaults, nulabilidade, constraints validadas e índices válidos/prontos coincidem com a origem sintética; testes do comparador rejeitam diferenças estruturais sintéticas. Uma segunda archive com coluna extra em `content_versions` e journal `0053` válido passa pelo preflight, restaura e aplica `0054`, mas a comparação com o catálogo de referência a rejeita (`semanticSnapshotMismatchRejected=true`). A duração do drill completo foi 2.172 ms em `verificationDurationMs`, medição técnica parcial. Isso cobre um drift estrutural sintético controlado, não archives externos nem incompatibilidades arbitrárias. A cadeia histórica exigiu o principal local privilegiado `postgres`: um role sem `BYPASSRLS` reproduziu recursão de policy na migration `0030`. Grants de produção, constraints fora dessas duas tabelas, aprovação do principal de migration e RPO/RTO operacional permanecem sem evidência.

Atualização do fixture local (2026-10-02): o drill aplica `roleProvisionSql` do
provisionador de CI após `0054` e compara privilégios efetivos de todas as
relações públicas com a matriz local. Confirma que `knowledge_documents` segue
sem acesso, que o app role não possui relações nem capacidades administrativas,
e que uma tabela criada após provisionamento continua sem grants. O run direto
mais recente levou 2.226 ms. Isso valida somente roles e grants sintéticos do
harness; grants produtivos, schema arbitrário, demais constraints, autoridade
do principal de migration e RPO/RTO seguem sem prova.

## Gaps que continuam bloqueando release

- O bridge `/internal/operations` é evidência local de derivação e não substitui o
  collector nem cria histórico; p95 permanece `NO_DATA` enquanto não houver buckets ou
  quantis.
- collector/OTel, dashboards e retenção precisam ser configurados e testados no ambiente operacional real;
- restart/crash de processo, carga, múltiplas réplicas e failover ainda não foram medidos;
- provider produtivo de embedding/IA, navegador contra API real, conteúdo clínico aprovado e commit rastreável continuam gates independentes;
- RPO/RTO medidos localmente não autorizam piloto ou publicação clínica.
