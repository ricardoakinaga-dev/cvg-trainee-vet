# Dependency Rules

Fonte executável: `architecture-boundaries.json` + `verify:architecture`
(graph de pacotes + imports proibidos por camada). Direções permitidas:

```mermaid
flowchart BT
    API[apps/api] --> APP[application]
    API --> CONT[contracts]
    API --> OBS[observability]
    API --> PERS[persistence]
    API --> CONF[config]
    API --> INT[integrations]
    WORKER[apps/worker] --> PERS
    WORKER --> OBS
    WORKER --> CONF
    WORKER --> INT
    PERS --> DOM[domain]
    PERS --> CUR[curriculum]
    APP --> DOM
    APP --> CUR
    WEB[apps/web] --> X[nada server-side]
```

Regras duras:

- `domain`/`curriculum`/`contracts`/`config`/`observability`/`ui` não importam
  runtime alheio (testado por padrão de import).
- `application` nunca importa persistência, integrações, config, contratos,
  observabilidade, Drizzle, Qdrant ou SDK de IA.
- `apps/web` nunca importa camadas server-side, Drizzle ou SDKs.
- Novos ciclos proibidos quebram o build (teste de boundaries, sem exceção
  silenciosa).
