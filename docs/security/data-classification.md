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

A decisão aprovada D-091, em `BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0020_alinhamento_produto_pre_spec.md`, define inatividade de 30 minutos para ADMIN/MODERATOR, oito horas para PARTICIPANT e duração absoluta de 12 horas. Quando houver mais de um papel base, aplica-se o menor prazo aprovado; capabilities sem papel base não estabelecem uma sessão autenticável. O instante igual ao limite já está expirado. A expiração persistida pode encerrar a sessão antes desses limites.

Autenticação e rotação verificam revogação e relógios persistidos sob lock da sessão; uma atividade não retrocede `lastSeenAt` nem reativa uma sessão expirada. A rotação preserva `createdAt` e o prazo absoluto original, limitando também o cookie ao tempo restante. Os contratos de aceitação de convite, recuperação e rotação aceitam entre 60 e 43.200 segundos para a sessão; os prazos dos tokens de convite e recuperação seguem seus contratos próprios. A projeção pública de sessão continua contendo apenas `status: active`, sem clocks, identidade ou hash do token.
