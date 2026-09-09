# OpenTelemetry Collector — referência (não acoplada à app)

A aplicação emite apenas contexto (`requestId`/`correlationId`, futuramente
`traceId`/`spanId` via `RequestContext`) e métricas/logs estruturados.
O Collector faz o fan-out para os backends. Outros exporters são permitidos.

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318
      grpc:
        endpoint: 127.0.0.1:4317

processors:
  batch: {}
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
  attributes/redact:
    actions:
      - key: http.request.body
        action: delete
      - key: user.id
        action: delete

exporters:
  prometheus:
    endpoint: 127.0.0.1:8889
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: false
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, attributes/redact, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, attributes/redact, batch]
      exporters: [loki]
```

Regras: nunca logar payload sensível (o processador `attributes/redact` é
segunda barreira; a primeira é `toLogContext()`); sampling configurável no
SDK quando o tracing real entrar (ADR-003).
