# Container View

```mermaid
flowchart TB
    subgraph edge [Edge]
        WEB[apps/web<br/>Next.js, proxy server-side<br/>só encaminha __Host-cvg_session]
    end
    subgraph runtime [Runtime]
        API[apps/api<br/>server + routing registry<br/>middleware + handlers]
        WORKER[apps/worker<br/>outbox, reconcile, retry bounded<br/>lease + fencing + dead-letter]
    end
    subgraph data [Data]
        PG[(PostgreSQL 16<br/>transacional + RLS)]
        QDRANT[(Qdrant<br/>índice derivado)]
    end
    subgraph ext [Externo opcional]
        OTel[OTel Collector<br/>referência]
        AIProv[AI provider<br/>desligável]
    end
    WEB --> API
    API --> PG
    API -.-> QDRANT
    API -.-> AIProv
    WORKER --> PG
    WORKER --> QDRANT
    WORKER -.-> AIProv
    API -.-> OTel
    WORKER -.-> OTel
```

- API e worker são processos separados; web nunca acessa dados diretamente.
- Setas tracejadas = opcional/degradável (falha não derruba o núcleo).
- Sem orquestrador prescrito (sem Kubernetes por §83 até necessidade provada).
