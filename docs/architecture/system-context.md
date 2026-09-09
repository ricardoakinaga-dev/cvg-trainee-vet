# System Context

```mermaid
flowchart LR
    P[Participante / Staff browser] --> W[apps/web Next.js + proxy]
    W --> API[apps/api modular monolith]
    API --> PG[(PostgreSQL 16<br/>source of truth)]
    API --> Q[Qdrant<br/>derived index]
    API --> AI[AI provider<br/>assistive, off by default]
    WK[apps/worker] --> PG
    WK --> Q
    WK --> AI
    CI[GitHub Actions] --> ART[Evidence bundle<br/>SBOM + provenance]
```

- Usuários: participantes (trilha, diagnóstico, tentativas, feedback, apelações),
  staff (moderação, revisão clínica, relatórios), operador CI.
- Sistemas externos reais: nenhum em produção (sem IdP, sem e-mail/SMS, sem
  telemetria externa). Qdrant/IA são dependências internas opcionais.
- Decisão clínica sempre humana; IA e índice nunca decidem estado, nota,
  gabarito, publicação, papel ou autonomia.
