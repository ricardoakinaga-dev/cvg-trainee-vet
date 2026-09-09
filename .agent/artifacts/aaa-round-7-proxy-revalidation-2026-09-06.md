# Gauntlet Round 7 — AAA-106 proxy revalidation

## Escopo

Revalidar a remediação do P1 encontrado pela crítica fresh do Round 7: o
fixture sintético não pode autorizar uma requisição sem sessão nem substituir o
guard server-side. O recorte cobre somente `/operations`, `/authoring` e o
forwarding do cookie para as projeções internas.

## Correções verificadas

- `apps/web/proxy.ts` não possui flag/header de bypass; exige
  `__Host-cvg_session`, `CVG_API_INTERNAL_URL`, resposta envelope válida e
  projeção compatível;
- somente o par `__Host-cvg_session=<valor>` é encaminhado ao upstream; cookies
  não relacionados são removidos;
- escopos vazios ou em branco falham fechados;
- `scripts/e2e-proxy-fixture-server.mjs` exige o cookie e é iniciado somente
  como upstream descartável do modo E2E mockado;
- `tests/e2e/proxy-auth-boundary.spec.ts` prova redirect `307` para as duas
  rotas sem cookie;
- `apps/web/app/authoring/page.tsx` usa requests same-origin e não depende de
  `NEXT_PUBLIC_CVG_API_BASE_URL`.

## Evidência

| Verificação                                                               | Resultado                                                                                                                                     |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm exec vitest run --project unit apps/web/src/proxy.test.ts` | **11/11 PASS**                                                                                                                                |
| `corepack pnpm --filter @cvg/web typecheck`                               | **PASS**                                                                                                                                      |
| `corepack pnpm --filter @cvg/web build`                                   | **PASS**; Next reporta `ƒ Proxy (Middleware)`                                                                                                 |
| foco E2E com `next start` + upstream local que exige cookie               | **12/12 PASS**                                                                                                                                |
| E2E completo com o mesmo proxy/upstream fixture                           | **40/40 PASS**, incluindo visual `6/6`                                                                                                        |
| `corepack pnpm verify`                                                    | **149 arquivos/798 testes PASS**, 30 arquivos/42 testes skipped; cobertura 84,44% statements, 80,16% branches, 87,29% functions, 85,18% lines |
| `git diff --check`                                                        | **PASS**                                                                                                                                      |
| crítica fresh curta                                                       | **PASS**, nenhuma severidade; limitada à inspeção dos quatro arquivos e sem execução de runtime                                               |
| `corepack pnpm test:integration:live`                                     | **BLOCKED**, exit 2: `CVG_TEST_DATABASE_URL` ausente; `DATABASE_URL` não é aceito                                                             |

## Veredito e limites

O recorte local do proxy está **PASS bounded** após a correção do P1. Isso não
é aprovação do programa AAA global. Continuam sem evidência: upstream real,
cookie seguro/HTTPS, expiração e revogação, cross-scope real, PostgreSQL/RLS,
concorrência, browser→API→PostgreSQL, workflow remoto same-SHA, produção,
operação, publicação clínica, piloto e competência prática. A crítica não
executou runtime e o upstream usado é um fixture local descartável.
