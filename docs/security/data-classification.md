# Data Classification

Classes: `public` · `internal` · `confidential` · `sensitive` · `clinical/personal`
(esta última: apenas sintética em teste; dado real é proibido por `AGENTS.md`).

| Classe | Exemplos | Log | Storage | Retention | Acesso | Redação |
|---|---|---|---|---|---|---|
| public | health status, catálogo publicado | livre | — | — | anônimo | — |
| internal | métricas agregadas, SLO, filas editoriais | agregados sem identidade | PostgreSQL | operacional | staff autenticado | requestId/correlationId ok |
| confidential | tokens hash, audit trail, convites | nunca valor; só evento/outcome | hash-only + expiração | mínima (expiração) | capability + scope | `toLogContext()` (sem principal/IP) |
| sensitive | sessão (`__Host-`), recovery secrets | nunca | cookie HttpOnly/SameSite; sem localStorage | idle+absolute timeout | posse + revogação | redaction tests |
| clinical/personal | respostas, diagnósticos, gabaritos | nunca payload | PostgreSQL + RLS | regra do produto (humana) | capability + scope + RLS | projeções públicas allowlisted |

Regras:

- Nenhum label de métrica carrega identidade (`userId`, `ticketId`, `requestId` proibidos como label; ver `packages/observability`).
- Erros públicos usam códigos (`validation_error`, `forbidden`) sem detalhe interno; sem stacktrace na API.
- Testes usam fixtures sintéticas; `verify:secrets` e `verify:exposure` no gate.
