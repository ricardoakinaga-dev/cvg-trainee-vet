# Timeout Policy (evidence-based)

Every external or potentially blocking operation has an explicit bound.
`RequestContext.deadlineMs` (default 30 s, cap 120 s) is the vehicle for
propagating request deadlines (§25).

| Operation | Timeout | Abort | Retry | Evidence |
|---|---|---|---|---|
| HTTP body read | `maxBodyBytes` 64 KiB + implicit socket close | yes (stream) | no | `server.ts` |
| PostgreSQL connect | 10 s | — | no | `database.ts` |
| PostgreSQL idle connection | 60 s reap | — | — | `idle_timeout` |
| PostgreSQL max connection life | 1800 s recycle | — | — | `max_lifetime` |
| PostgreSQL statement (app role) | 30 s server-enforced | yes (server cancels) | no | `ALTER ROLE ... SET statement_timeout` in provisioning |
| PostgreSQL idle transaction (app role) | 10 s server-enforced | yes | no | provisioning |
| PostgreSQL lock wait (app role) | 10 s server-enforced | yes | no | provisioning |
| Qdrant client call | 20 s | yes (client timeout) | bounded + jitter, 401 never retried | `qdrant.ts`, `retry.ts` |
| AI call | 20 s default, configurable | yes (`AbortSignal`) | bounded, quota + safe fallback | `ai.ts` |
| Rate-limit backend (Redis) | 500 ms default, configurable | yes | no (fail policy decides) | `rate-limit-store.ts` |
| OTLP export | 2000 ms default, configurable | yes | no (drop + count) | `tracing.ts` |
| Telemetry flush on shutdown | 2000 ms cap, best-effort | — | no | `server.ts` close |
| `executeWithRetry` sleeps | bounded backoff + cap + jitter | — | maxAttempts, non-retryable short-circuit | `retry-policy.ts` |

Never retried: validation, auth, forbidden, deterministic conflict, malformed
provider output (`NON_RETRYABLE_CODES`). No unbounded retry exists in the
runtime paths above. Live proof of role-level timeouts runs in CI
(`migration-governance` asserts the provisioning statements).
