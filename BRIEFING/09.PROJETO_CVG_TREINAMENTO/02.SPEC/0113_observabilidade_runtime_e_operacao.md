# 0113 — Observabilidade, Runtime e Operação

## 1. Sinais

| Sinal | Implementação | Pergunta respondida |
|---|---|---|
| logs | JSON estruturado com `request_id`, `trace_id`, `service`, `environment`, `level`, `event` e duração | o que ocorreu e em qual componente |
| métricas | contadores, histogramas e gauges por rota, caso de uso, job e integração | com que frequência e latência |
| traces | OpenTelemetry API/SDK no web→API→worker→dependência | onde a operação ficou lenta ou falhou |
| auditoria | tabela append-only do domínio | quem alterou estado e com qual decisão |
| health | liveness/readiness/degraded | o processo pode receber tráfego? |

## 2. Redaction e privacidade

O logger recebe objetos tipados e aplica uma lista de campos proibidos antes do sink. Nunca registrar senha, token, cookie, API key, prompt completo, resposta completa de IA, texto clínico livre, PDF, foto, OCR, fonte, obra, capítulo, página, gabarito ou dado real. IDs e hashes técnicos podem ser registrados quando necessários para reconstrução interna.

`request_id` é criado na borda, propagado por API, outbox e worker, e devolvido ao cliente sem outros detalhes internos. Falhas públicas usam código estável; stack trace fica restrito ao log redigido.

## 3. SLIs/SLOs iniciais

| Serviço/fluxo | SLI | Alvo inicial |
|---|---|---:|
| API leitura | p95 de resposta sem dependência externa | < 800 ms |
| API mutação | p95 de conclusão de transação | < 1,5 s |
| disponibilidade núcleo | sucesso de login, leitura e submissão | ≥ 99,5% mensal |
| correção assíncrona | evento processado dentro de 5 min | ≥ 99% |
| indexação interna | item processado dentro de 15 min | ≥ 95% |
| IA assistiva | job concluído ou falha explícita em 60 s | ≥ 95% |
| exposição autoral | chaves internas em DTO participante | 0 ocorrências |

Esses alvos orientam a primeira operação; o sistema mede antes de otimizar. Falha de SLO do recurso assistivo não interrompe o núcleo educacional.

## 4. Healthchecks

- `/health/live`: processo responde sem testar dependências;
- `/health/ready`: PostgreSQL, migrações, pool e configuração essencial;
- `/health/dependencies`: estado redigido de PostgreSQL, Qdrant, IA, outbox e relógio;
- Qdrant/IA ausentes podem produzir `DEGRADED`; PostgreSQL indisponível produz `NOT_READY`;
- healthcheck nunca devolve URL, nome de coleção sensível, segredo, prompt ou stack trace.

## 5. Operação e recuperação

1. cada deploy publica SHA do commit, versão dos pacotes e migração aplicada;
2. backups PostgreSQL são verificados por restauração periódica em ambiente isolado;
3. Qdrant é reconstruído a partir de PostgreSQL/outbox e não exige backup como fonte de verdade;
4. jobs presos têm lease expirável, alerta e replay idempotente;
5. alteração de IA/embedding registra modelo, versão, dimensão e plano de rollback;
6. incidentes de exposição autoral suspendem a projeção afetada, preservam evidência redigida e executam retirada/versionamento;
7. runbook mantém comandos seguros, sem imprimir segredos ou dados de participante.

## 6. Implementação verificada no BUILD F3-S5

Foi materializado `@cvg/observability` como módulo pequeno e sem dependência de fornecedor: logger JSON tipado com allowlist de campos, sanitização de identificadores, duração limitada, contadores e histogramas em memória. A API registra somente rota normalizada, método, status, resultado, `request_id`, correlação e duração, inclusive rejeições de CSRF/rate limit; o worker registra tipo de evento e resultado sem payload. Os testes negativos confirmam a ausência de resposta, participante, token, fonte, foto e prompt.

O recorte é `implemented-verified-with-gaps`: ainda faltam exporter/collector OpenTelemetry, retenção e acesso ao sink, alertas/SLOs operacionais, traces distribuídos, dashboards e reconciliação de métricas entre processos. O núcleo não depende desses sinais para autorizar nota, publicar conteúdo ou expor dados ao participante.

## 7. Implementação verificada no BUILD F3-S6

`apps/api/src/request-security.ts` fornece CSRF por origem/referer/metadado Fetch e rate limit local com mapa e janela bounded. `apps/api/src/server.ts` executa essas verificações antes do caso de uso, drena corpos rejeitados, mantém health fora do limite e devolve `Retry-After` sem expor payload. A configuração `WEB_ORIGINS` é lida somente no processo API. Testes unitários e HTTP cobrem os cenários positivos e negativos; rate limit distribuído, recuperação/rotação e E2E contra API real permanecem fora desta fatia.

## 8. Reconciliação operacional F3-S7

O worker disponibiliza `runtime.reconcile()` para comparar o conjunto publicado no PostgreSQL com os metadados do Qdrant, reindexar somente pontos ausentes/alterados e remover órfãos. A operação devolve apenas contadores técnicos (`expected`, `upserted`, `removed`), não texto nem conteúdo clínico. Falha é explícita e repetível; não há autorização por vetor nem mudança de nota/publicação.

## 9. Evidência adicional de resiliência — item 11

O worker registra somente `event_type`, resultado, códigos técnicos, correlação e contadores de lote; falhas não carregam mensagem ou payload livre. A integração live prova reclaim após lease expirado, retry e dead-letter no PostgreSQL. A reconciliação live prova contadores não vazios, divergência, órfão, replay e retirada sem duplicação indevida no Qdrant.

Essa evidência fecha o comportamento do item 11, mas não substitui o item 12: collector/exporter, alertas, SLO, dashboards, traces distribuídos, retenção, runbook de restart e backup/restore ainda precisam de execução operacional.

## 10. Evidência adicional do item 12

O item 12 materializou e verificou /health/dependencies, com estado agregado e redigido para PostgreSQL, Qdrant e IA. PostgreSQL indisponível produz NOT_READY; Qdrant indisponível produz DEGRADED; nenhuma causa, URL, segredo ou payload é devolvido. A evidência está em apps/api/src/http.ts, apps/api/src/server.ts, packages/integrations/src/composition.ts, tests/integration/api-health.test.ts e BRIEFING/04.AUDIT/0505_observability_operations_audit.md.

@cvg/observability agora renderiza contadores/histogramas allowlisted em formato Prometheus e a rota interna exige VIEW_INTERNAL_AUDIT. evaluateSlo e evaluateOperationalAlerts tratam PASS, BREACHED, NO_DATA, falha crítica do PostgreSQL e degradação do Qdrant. Testes confirmam redaction de participant/source/photo/prompt/token e ausência de payload clínico nos labels.

O bridge local `deriveOperationalSnapshot` liga os contadores `api.requests.total` ao
estado de dependências e expõe `GET /internal/operations` para a mesma capability
interna. A disponibilidade é calculada somente de eventos `success`; p95 de leitura e
mutação permanece `NO_DATA` até o runtime ter buckets/quantis, abrindo alerta explícito
em vez de inferir latência a partir de `min/max`. A resposta contém apenas estado
redigido, avaliações e códigos de alerta; o handler rejeita query/body inesperados,
valida os enums em runtime e aplica allowlist explícita a `postgres`, `qdrant` e `ai`.
Não é collector, retenção ou tracing distribuído.

O runbook BRIEFING/08.RUNTIME/0804_observability_operational_contract.md define collector, retenção, dashboard agregado, alertas, correlação e limites de trace. scripts/verify-postgres-restore.mjs e tests/integration/postgres-restore.test.ts executam pg_dump/pg_restore em destino temporário isolado com marcador sintético; a execução local desta janela recuperou o marcador e mediu RTO de 2.581 ms. Essa prova é local e descartável: collector/OTel externo, retenção efetiva, dashboard, traces distribuídos, crash/failover, carga e múltiplas réplicas continuam pendentes.

## 11. Interface operacional web verificável

O item 13 adicionou `apps/web/app/operations/page.tsx`, que consome somente o estado agregado de `/health/dependencies` e mantém URLs, segredos, payloads e identificadores fora da tela. O proxy em `apps/web/next.config.ts` é habilitado por `CVG_API_INTERNAL_URL` server-side; `tests/e2e/real-runtime.spec.ts` comprovou o caminho navegador→web→API→PostgreSQL. A tela é complementar ao contrato de observabilidade, não substitui autenticação/autorização da API nem inventa estado operacional no cliente.

## 12. Evidência e operação de fencing de lease

O claim do outbox usa `statement_timestamp()` no PostgreSQL para selecionar
eventos disponíveis, expirar leases e calcular o novo `locked_until`. As
atualizações de sucesso/falha exigem `status = PROCESSING`, `lease_token`
correspondente e lease ainda válido; uma atualização sem linha afetada é
telemetria `outcome=lease_lost`, sem retry cego do worker antigo.

A migração instala uma barreira de rollout: transições terminais de um registro
em `PROCESSING` sem lease válido são rejeitadas no banco. Portanto, a troca de
worker deve ser coordenada; uma versão antiga não pode finalizar silenciosamente
um evento reclamado. O token não entra em log, métrica pública, DTO ou payload.

O teste live PostgreSQL cobre claim, reclaim, token antigo em
`markProcessed`, token antigo em `markFailed`, retry/dead-letter e a barreira
de transição legada com role de aplicação `NOSUPERUSER/NOBYPASSRLS`; o efeito de
consumidores externos continua at-least-once e depende de idempotência.
