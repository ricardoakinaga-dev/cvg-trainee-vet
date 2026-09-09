# AAA-106 — guard server-side/proxy

## Escopo

Fechamento local bounded da lacuna encontrada na crítica I0: `/operations` e
`/authoring` agora passam por `apps/web/proxy.ts` antes de renderizar a
superfície interna. O proxy não recebe capability do cliente, consulta a API
interna com o cookie de sessão e só encaminha o cookie necessário. O
`authoring` usa chamadas same-origin relativas; `NEXT_PUBLIC_CVG_API_BASE_URL`
não participa mais do bundle do participante interno.

## Implementação

- `apps/web/proxy.ts`
  - protege apenas os caminhos exatos `/operations` e `/authoring`, com e sem
    barra final;
  - exige `__Host-cvg_session`, configuração `CVG_API_INTERNAL_URL` com
    protocolo permitido e resposta envelope/projeção compatível;
  - consulta somente `/api/v1/dashboard` ou
    `/api/v1/internal/session/scopes`, usa `cache: no-store`, timeout de
    1.500 ms e encaminha somente o par `__Host-cvg_session` no header
    `cookie`;
  - falha fechada para ausência de configuração, rede, timeout, status não-2xx,
    JSON inválido, projeção de participante ou escopo vazio;
  - redireciona para a entrada pública sem expor detalhes internos;
- `scripts/e2e-proxy-fixture-server.mjs`
  - upstream HTTP descartável somente para E2E mockado;
  - exige `__Host-cvg_session` e retorna apenas projeções sintéticas
    allowlisted para os dois endpoints consultados pelo proxy.
- `apps/web/app/authoring/page.tsx` usa `fetch(path, ...)` same-origin.
- `playwright.config.ts` inicia o upstream descartável e injeta somente o
  cookie de fixture no harness mockado; o proxy continua exercitando cookie,
  configuração, fetch e projeção sem bypass sintético.

## Evidência

- RED/GREEN focal: `corepack pnpm exec vitest run --project unit
apps/web/src/proxy.test.ts` — **11/11 PASS**; cobre rota pública, cookie,
  projeções staff/authoring, forwarding somente do cookie de sessão, status upstream, rede, configuração
  ausente e escopo vazio.
- `corepack pnpm --filter @cvg/web typecheck` — **PASS**.
- `corepack pnpm --filter @cvg/web build` — **PASS**; Next reporta `ƒ Proxy
(Middleware)`.
- `corepack pnpm exec playwright test --config /tmp/cvg-e2e.config.ts
tests/e2e/proxy-auth-boundary.spec.ts tests/e2e/operations-dashboard.spec.ts
tests/e2e/authoring-review.spec.ts` — **12/12 PASS** contra `next start` e
  upstream local, incluindo redirect real sem cookie.
- `corepack pnpm exec playwright test --config /tmp/cvg-e2e.config.ts` —
  **40/40 PASS** contra `next start`, com proxy real e upstream local de
  fixture, sem dados reais.
- `corepack pnpm verify` — **149 arquivos/798 testes PASS**, 30 arquivos/42
  testes skipped, cobertura 84,44% statements, 80,16% branches, 87,29%
  functions e 85,18% lines; gates de contrato, worker, migrations, secrets,
  traceability, architecture, documentation, product definition e public
  boundary passaram.

## Limites

Esta evidência não prova o upstream real da API, cookie seguro em HTTPS,
expiração/revogação, cross-scope, PostgreSQL/RLS live, browser→API→PostgreSQL,
produção, piloto, revisão clínica ou competência prática. O upstream é um
fixture local descartável e não substitui esses gates.
