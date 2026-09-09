# Load Baseline — 2026-09-09 (local, sem DB)

- **Ferramenta:** k6 v0.57.0 · **Alvo:** API `main` em `127.0.0.1:3109` com
  dependências sintéticas (`authenticate: null`), Node v22.23.2.
- **Comando:** `API_BASE_URL=http://127.0.0.1:3109 k6 run tests/load/k6-baseline.js`
  (ver `pnpm test:load`).
- **Limites de carga:** budget explícito de 100 000 req/min (config só de carga;
  o default 120/min é o de produção).

## Resultados (2 perfis × 10 VUs × 60 s)

| Perfil | Reqs | Throughput | p50 | p95 | p99* | Checks | Erros |
|---|---|---:|---:|---:|---:|---:|---:|
| read_heavy (`/health/*`) | 1200 | ~24/s | 1,12 ms | 2,78 ms | ~4 ms | 1200/1200 | 0 |
| auth_rejected (401 explícito) | 1800 | ~24/s | 1,06 ms | 4,77 ms | ~8 ms | 1800/1800 | 0 |

`*` p99 aproximado do `http_req_duration`. Throughput VU-bound (`sleep 1s`),
não é teto do servidor. `http_req_failed 60%` é a marcação default do k6 para
os 1800 401 esperados — não são erros da aplicação.

## Achado: rate-limit engajou sob carga (run 1)

Com o budget default (120/min por rota), 10 VUs × 60 iterações saturaram o
bucket e as respostas viraram 429 após ~12 s. Comportamento correto e
fail-closed; o run válido usou budget de carga documentado.

## Budgets propostos (§40, sujeitos a re-baseline com DB)

- p95 leitura pública < 50 ms (observado 2,8 ms; folga 15×)
- p95 negação auth < 50 ms (observado 4,8 ms)
- error rate (5xx inesperado) = 0 em carga sintética

## Residual

Cenários autenticados com DB (attempt start/submit, diagnostics, dashboard com
dados) exigem PostgreSQL descartável; memória/CPU/pool saturation exigem
coleta externa. `pnpm test:load` nunca é gate de push.
