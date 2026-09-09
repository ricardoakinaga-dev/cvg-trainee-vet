# Mutation Report — authorization.ts (AAA-FINAL-002 §16)

- **Comando:** `pnpm mutation:authorization` (StrykerJS 9, escopo: só `packages/application/src/authorization.ts`)
- **Data:** 2026-09-09 · **Config:** `stryker.authorization.mjs` (break: 0, sem gate)
- **Relatório bruto:** `reports/mutation/mutation.json` (gitignored; regenerável)

## Scores

| Run | Score | Killed | Survived |
|---|---|---:|---:|
| baseline (antes dos killers) | 64,84% | 142 | 77 |
| após 5 killer tests | **70,78%** | 155 | 64 |

## Alvo §16 (≥90%): NÃO ATINGIDO — gap P2 registrado

Análise dos 64 sobreviventes:

- ~48 `StringLiteral→""` + 1 `ArrayDeclaration→[]`: mutações no conjunto
  `CAPABILITIES` e em labels de `case`. Equivalentes na prática: o conjunto
  serve só para enumeração (comportamento de `canAccess` inalterado) e labels
  `""` nunca casam com capability real. Ruído do operador, não gap de teste.
- Fallthroughs entre arms de corpo idêntico (`VIEW_OWN_APPEALS`→`CREATE_*`,
  `VIEW_STAFF_DASHBOARD`→`VIEW_PROGRAM_METRICS`, `GRANT_CLINICAL_APPROVER`→
  `default`): equivalentes por construção.
- Restantes lógicos/condicionais: parte morta por artefato do runner
  (`coveredBy` vazio sob `vitest.related`), parte coberta pelos killer tests
  adicionados em `authorization.test.ts` ("mutation killers").

## Decisão

Não instalar mais operadores nem inflar o número. O valor real foi capturado:
5 killer tests que travam regressões de precedência, fallthrough, opcional
nulo e guardas de entrada. Re-medição completa fica como residual P2
(MOD-007): subir o scope do Stryker (session, rate-limit, idempotency) e
revisitar os sobreviventes não-equivalentes.
