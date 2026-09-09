# AAA-205 — evidência local bounded de resiliência de acesso

## Escopo

Loading, erro, estado vazio, retry, reidratação da sessão e recuperação por
link de uso único nas superfícies web/API existentes. Evidência sintética e
local; não é prova de produção, RLS live, clínica, piloto ou competência.

## Evidência registrada

- `apps/web/app/page.tsx` mantém estados explícitos e retries por operação,
  consumindo apenas projeções públicas e a sessão atual server-side;
- `apps/web/app/recovery/page.tsx` valida o formato do token, remove o token da
  URL com `replaceState`, aceita o link uma vez e exibe estados loading/ready/error;
- `tests/e2e/experience-accessibility.spec.ts` cobre loading acessível, falha
  transitória, retry e estado vazio;
- `tests/e2e/participant-access.spec.ts` cobre erro público bounded, ausência de
  internals e retry de leitura de resultado;
- `tests/e2e/recovery-access.spec.ts` cobre consumo de link, sessão nova,
  remoção do token da URL e retorno à trilha;
- `corepack pnpm verify` PASS: `149` arquivos/`800` testes, `30` arquivos/`42`
  skipped, cobertura `84,45%/80,18%/87,30%/85,19%`;
- E2E sintético completo documentado `41/41` PASS; visual corrente `7/7` PASS;
- `verify:documentation`, `verify:traceability` e `git diff --check` PASS na
  rodada de fechamento documental.

## Limitações

Os cenários de navegador usam fixtures/rotas sintéticas. Não foram afirmados
expiração/revogação em cookie HTTPS real, cross-scope, falha de rede real,
browser → API → PostgreSQL/RLS, grants/owners produtivos, telemetria externa,
revisão assistiva com usuários, produção ou release.
