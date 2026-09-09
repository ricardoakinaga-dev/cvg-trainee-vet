# Component View — apps/api

```mermaid
flowchart LR
    S[server<br/>listen/close<br/>body-limit, CSRF, rate-limit] --> R[routing registry<br/>matchRoute + telemetry template]
    R --> M[middleware<br/>request-id, auth, security-headers<br/>error-boundary]
    M --> H[handlers por feature<br/>auth → content → audit → ...]
    H --> A[application use cases<br/>capabilities + transações]
    H --> C[contracts<br/>schemas strict]
    A --> P[persistence<br/>Drizzle + RLS]
    S --> O[observability<br/>logs redigidos + métricas + SLO]
```

Estado da modularização (honesto):

- Feito (fase 1): `routing/route-registry.ts` (fonte de classificação + paridade
  testada com `routeTemplate()`), `http/request-context.ts`,
  `security/rate-limit-store.ts`, `security/security-headers.ts`.
- Pendente (backlog): migrar o runtime de `server.ts` para o registry, extrair
  `http.ts` (4267 linhas) em `features/*` com handlers finos. Sem big-bang.
