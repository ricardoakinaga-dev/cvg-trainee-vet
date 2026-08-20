# 0803 — Segredos, Configuração e Observabilidade

## Configuração mínima

```text
API_HOST
API_PORT
WEB_ORIGINS
DATABASE_URL
QDRANT_URL
QDRANT_API_KEY
QDRANT_COLLECTION
QDRANT_INDEX_VERSION
EMBEDDING_MODEL
EMBEDDING_DIMENSION
EMBEDDING_API_KEY
AI_PROVIDER
AI_API_KEY
AI_MODEL
AI_ENABLED
OTEL_EXPORTER_OTLP_ENDPOINT
```

`.env.example` contém nomes vazios. Segredos entram por secret manager/ambiente seguro, não por Git, issue, log ou prompt. Rotacionar imediatamente qualquer segredo exposto e procurar cópias.

## Observabilidade

Logs JSON com `request_id`, `trace_id`, `correlation_id`, serviço, evento, status e duração. Métricas: disponibilidade, erro, p95/p99, PostgreSQL pool, outbox lag, retry, Qdrant index lag, IA latency/refusal e smoke. Traces atravessam web→API→worker→dependência.

Redaction bloqueia senha, token, cookie, API key, prompt, resposta IA, texto clínico, fonte, obra, PDF, foto, gabarito e dado real. Auditoria registra hashes/IDs técnicos e decisão, sem conteúdo bruto por padrão.

## Implementação atual

`@cvg/observability` fornece o logger JSON redigido, correlação validada, contadores e histogramas em memória. A API emite eventos por rota normalizada e o worker emite eventos de lote/resultado, sempre com allowlist e sem payload. O sink padrão escreve somente o registro já redigido.

`WEB_ORIGINS` é uma lista separada por vírgula de origens web autorizadas. A borda API exige origem/referer permitido ou contexto Fetch same-site para mutações com cookie de sessão. O rate limit atual é local ao processo, bounded e com `Retry-After`; health não é limitado. Em escala horizontal, substituir por contador compartilhado antes de liberar múltiplas réplicas.

O item 12 materializou o exporter interno Prometheus, health/dependencies redigido, avaliação de SLO/alertas e o contrato operacional 0804. Exportação OpenTelemetry externa, retenção efetiva, dashboards provisionados e traces distribuídos continuam dependentes da configuração do ambiente operacional.

No perfil HA local, o Prometheus permanece `65534:65534` e não lê diretamente o
arquivo de segredo do host. O serviço one-shot
`prometheus-secret-init` prepara um volume derivado `0440`, de propriedade do
UID/GID do processo, com rede desabilitada e capacidades mínimas. A rotação
autorizada deve executar novamente o helper antes de reiniciar o Prometheus;
nenhum valor do token deve aparecer em log, Git ou evidência.
