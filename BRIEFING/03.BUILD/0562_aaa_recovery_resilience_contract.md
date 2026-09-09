# AAA-205 — Contrato de resiliência de acesso e recuperação

**Revisão:** 2026-09-06  
**Versão:** `AAA-RECOVERY-1.0`  
**Estado:** `COMPLETED_WITH_GAPS` — slice web/API local bounded; expiração
live, RLS e operação produtiva continuam fora do gate local

## Objetivo

Fechar a experiência de falha controlada da jornada participante: carregamento,
erro público, estado vazio, retry seguro, reidratação da sessão e recuperação
por link de uso único. O contrato consolida comportamento já implementado em
`/`, `/recovery` e nas superfícies internas; não cria provedor, MFA, e-mail,
senha, publicação clínica ou uma nova decisão de produto.

## Invariantes congeladas

1. O servidor continua autoridade sobre sessão, identidade, escopo e expiração.
   A web não fabrica principal, `participantId`, scope ou capability.
2. A interface expõe estados `loading`, `ready`, `empty` e `error` com
   `role=status`/`role=alert` quando aplicável. Retry é explícito, limitado à
   operação que falhou e só repete comandos já protegidos por contrato.
3. A recuperação aceita somente token sintaticamente válido, remove o token da
   URL antes de renderizar o resultado e recebe do servidor somente uma
   projeção mínima de sessão ativa. O cookie de sessão é emitido pelo servidor;
   token bruto e material interno não aparecem no DOM ou na resposta pública.
4. Falhas de convite, jornada, atividade, feedback e correção permanecem
   redigidas, acionáveis e sem stack, hash, gabarito, fonte ou payload interno.
5. A retomada usa a sessão atual e projeções públicas escopadas; ausência de
   sessão não é convertida em uma identidade inferida pelo cliente.

## Interfaces e evidência

| Camada | Contrato/implementação | Evidência local |
| --- | --- | --- |
| Web participante | `apps/web/app/page.tsx` | loading/error/empty, retry por ação e reidratação por `/api/v1/session/current` |
| Web recovery | `apps/web/app/recovery/page.tsx` | validação sintática, `replaceState`, consumo de link único, estado pronto/erro e retorno à trilha |
| API/sessão | `apps/api/src/http.ts`, `apps/api/src/server.ts` | envelopes redigidos, autenticação bounded, sessão atual, rotação/revogação e limite de corpo/origem |
| Contratos/domínio | `packages/contracts/src/session.ts`, `packages/application/src/session.ts` | projeção mínima, cookie seguro, token hash-only, expiração e falha fechada |
| Jornada browser | `tests/e2e/experience-accessibility.spec.ts`, `tests/e2e/participant-access.spec.ts`, `tests/e2e/recovery-access.spec.ts` | retry/erro/estado vazio, erro público, retomada e recuperação em navegador sintético |

## Critério de saída desta versão

- contrato estrito e rastreável, sem ampliação silenciosa do produto;
- cobertura existente ligada a web, API, contratos, aplicação e persistência;
- `corepack pnpm verify` local PASS: `149` arquivos/`800` testes, `42`
  skipped, cobertura `84,45%` statements, `80,18%` branches, `87,30%`
  functions e `85,19%` lines;
- E2E sintético completo final `43/43` e matriz visual corrente `7/7` PASS;
  a execução está registrada em
  `.agent/artifacts/aaa-200-201-e2e-final-2026-09-06.md`;
- nenhum segredo, dado real, foto, PDF ou fonte de terceiro introduzido.

## Gaps que permanecem explícitos

Expiração e revogação em cookie HTTPS real, rede instável fora do mock,
abort/timeout em browser real, cross-scope, browser → web → API → PostgreSQL/RLS,
roles/grants/owners produtivos, observabilidade externa, revisão assistiva com
usuário e operação de produção ainda exigem evidência própria. `AAA-202` é o
gate de integração live da jornada e não é fechado por este contrato.

## Próxima decisão

Com `AAA-001` aprovado e ambiente descartável autorizado, executar a matriz
browser → web/proxy → API → PostgreSQL/RLS. Sem essa autorização, manter este
slice como `COMPLETED_WITH_GAPS` e não inferir readiness global, release,
competência prática ou publicação clínica.
