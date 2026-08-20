# Evidência de mutation crítica — Dual99

- programa: `CVG-DUAL-99`
- task: `B99-303`
- data: `2026-08-20`
- comando: `pnpm verify:critical-mutation`
- implementado em: `scripts/verify-critical-mutation.mjs`
- governança focal: `tests/integration/critical-mutation-governance.test.ts`

## Método

O verificador carrega os sete módulos críticos com um plugin Vitest em
diretório temporário. Antes dos mutantes, executa a mesma matriz focal sem
mutação e exige baseline verde. Em seguida aplica uma substituição sintética,
única e validada por módulo, executa os testes focais correspondentes e conta o
mutante como morto somente quando a suíte falha. O diretório temporário é
removido ao final; nenhum arquivo de produção do worktree é alterado.

| Alvo | Mutação exercitada | Resultado |
|---|---|---|
| `NOTA` | limiar de objetivo crítico `< 80` → `<= 80` | killed |
| `PUBLICACAO` | gate `nextStatus === undefined` invertido | killed |
| `PERMISSAO` | conta corrente `!== ACTIVE` invertida | killed |
| `ESTADO` | transição de assignment `nextStatus` invertida | killed |
| `IDEMPOTENCIA` | replay nulo invertido | killed |
| `CONTRATO_ESTADO` | versão `nonnegative` → `positive` | killed |
| `MATRIZ` | ausência de casos `=== 0` → `> 0` | killed |

## Resultado

```text
status: PASS
mutationCount: 7
killedCount: 7
survivedCount: 0
mutationScorePercent: 100
minimumMutationScorePercent: 90
```

Também passaram `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, o teste
focal `3/3` e `git diff --check`. Isso conclui a prova direcionada dos sete
caminhos críticos locais; não equivale a mutation integral de todo o sistema,
nem fecha runtime live, RC, rastreabilidade, clínica ou reauditoria.
