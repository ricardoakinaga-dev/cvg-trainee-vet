# Adversarial Review (§59) — 2026-09-09, papel: atacante interno

Método: revisão hostil do diff R2 + execução dos gates de segurança.
Evidência primária: `apps/api/src/security/http-access-negative.test.ts`
(51 testes), `verify-routes`, `verify-secrets`, `verify:architecture`,
`ai-governance`, `reconcile`, `server.test.ts` (trace+headers+shutdown).

## Resultado por vetor

| # | Vetor | Ataque tentado | Resultado |
|---|---|---|---|
| 1 | auth bypass | chamar 52 rotas privadas sem sessão | 51×401; lifecycle documentado (revoke 200 sem disclosure, current 401, rotate sem mint) |
| 2 | IDOR/BOLA | trocar `:attemptId`/`:accountId` entre principais | negado em `http.ts` por `ownerId`+`scopeId` server-side; testes de boundary existentes |
| 3 | scope escalation | `scopeId` de outro escopo no body/query | capability exige scope do servidor + RLS contextual; audit carrega scope autorizado, não o pedido |
| 4 | RLS bypass | conexão direta sem contexto | `setDatabaseSecurityContext` exige participant/scope; sem contexto = negado; matriz total tabela-a-tabela pendente de live (residual honesto, MOD-011) |
| 5 | cookie replay | reutilizar cookie revogado | `revokeSession` + `Max-Age=0`; rotate de sessão desconhecida → 401 sem mint (testado) |
| 6 | session fixation | fixar token antes do login | tokens mintados server-side com `crypto` (session.ts); cliente nunca escolhe token |
| 7 | CSRF bypass | POST com cookie sem origin/referer/sec-fetch-site | `isCsrfAllowed` nega; testes em `request-security.test.ts` |
| 8 | route classification bypass | handler sem registry ou vice-versa | `verify-routes` bidirecional (57↔57) + vocab de capability + matriz gerada com teste de frescura |
| 9 | rate-limit bypass | flood multi-rota / multi-instância | por-rota+principal+IP; single-node default documentado; Redis atômico existe mas sem backend operado = residual multi-instância (ADR-006) |
| 10 | trusted proxy spoof | `X-Forwarded-For` forjado | default sem proxies confiáveis = socket IP; só honra de proxy listado; testes spoof/trusted/direct/IPv4/IPv6/malformed |
| 11 | Redis failure bypass | backend fora em pico | fail-closed em todas as classes sensíveis; só `public-low-risk` fail-open (liveness); testado |
| 12 | SQL injection | IDs/paths maliciosos | Drizzle parametrizado; interpolação só em provisioning com `quoteIdentifier/quoteLiteral`; `isUuid`/schemas strict no boundary |
| 13 | SSRF | URL externa controlada pelo usuário | nenhuma rota aceita URL; Qdrant/OTLP/AI endpoints são config de operador validada (`http(s)`, fail-early) |
| 14 | header injection | CRLF em correlation-id/headers | `sanitizeCorrelationId` + `removeControlCharacters` + allowlist de chaves; trace/span hex-validados |
| 15 | log injection | `\n` em campos | mesma sanitização; redaction tests (`toLogContext` sem principal/IP/payload) |
| 16 | secret leakage | segredos em log/erro/artefato | `verify-secrets` limpo; erros AI embrulhados sem `cause` vazada (testado); cookies `HttpOnly;Secure;SameSite`; token fora da URL (`replaceState`) |
| 17 | AI prompt injection | diretiva injetada / PII plantada | evals `injection-001`/PII/groundedness; output só schema-validado; oversized (>64k) e HTML rejeitados (novo); ports sem side-effect (governance test) |
| 18 | Qdrant poisoning | retrieval malicioso alterando índice | reconcile nunca chama `search` (teste novo com throw); índice derivado com lock + orphan cleanup |
| 19 | audit tampering | forçar 500 via audit quebrado | `recordApiRejectionAudit` em try/catch fail-safe; append-only com actor/scope/outcome/requestId |

## Achado real desta rodada (FOUND → FIXED)

- **ADV-2026-09-01 (info/high-hygiene):** `handleAcceptAccountRecovery`
  validava a presença do port **antes** do schema, devolvendo 500 para token
  malformado quando o port estava unwired, enquanto `acceptInvitation`
  devolvia 404. Divulgação de estado de wiring + inconsistência fail-closed.
  **Fix:** parse primeiro, checagem depois (`http.ts`); coberto pelo teste
  negativo (51/51 verdes). Nenhum comportamento legítimo alterado.

## Veredito adversarial

Nenhum bypass explorável nos caminhos alcançáveis localmente. Residuais
**ambientais** (não são P0/P1 de código): prova live RLS total (MOD-011),
backend Redis operado, runs remotos same-SHA, provider IA real. Nada aqui
autoriza claim de produção.
