# Data Flow

```mermaid
flowchart LR
    B[Browser] -->|cookie __Host + CSRF| API
    API -->|authenticate| SES[(sessions)]
    API -->|authorize capability+scope| UC[use case]
    UC -->|transação + RLS context| PG[(PostgreSQL)]
    PG -->|projeção allowlisted| API
    API -->|envelope público| B
    UC -->|evento| OUT[outbox]
    WK[worker] -->|lease + fencing| OUT
    WK -->|reconcile/reindex| Q[(Qdrant)]
    WK -.->|structured output| AI[IA assistiva]
```

Invariantes:

- Autorização é server-side e deny-by-default; RLS é defesa adicional, nunca a única.
- Projeções públicas nunca contêm IDs internos, tokens, segredos ou payload clínico além do necessário (schemas + `verify:exposure`).
- Escrita crítica usa CAS/idempotency key; conflito → 409, nunca sobrescrita silenciosa.
- Auditoria é append-only com actor/scope/action/outcome, sem conteúdo sensível.
