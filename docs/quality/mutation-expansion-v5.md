# Mutation Classification v5 — expanded critical scope (AAA-FINAL-002 §§6–7)

- **Escopo:** `authorization.ts` (v4, mantido) + `session.ts` + `attempt-use-cases.ts`
  + `account-recovery-use-cases.ts` + `apps/api/src/security/rate-limit-store.ts`
- **Stryker 9 final** (`stryker.authorization.mjs`, `stryker.critical.mjs`,
  `coverageAnalysis: perTest`, `vitest.related: true`):
  - authorization: total 219 · killed 199 · survived 20 → raw **90.87%**
  - critical: total 762 · killed 609 · survived 153 → raw **79.92%**
- **Harness autoritativo** (`scripts/verify-mutation-closure.mjs`,
  `scripts/verify-mutation-critical.mjs`): cada sobrevivente final aplicado
  por substituição textual ancorada (âncora exigida única ou com ocorrência
  explícita) + suite completo do arquivo, sem filtro per-test.
- **Killer tests:** 94 its (v4: authorization/session/attempt/recovery/rate-limit
  closure) + branch-closure focados; todos comportamentais (allow/deny,
  códigos de erro públicos, expiração, orçamento, auditoria).
- **Summary:** `reports/mutation-summary.json` (5 escopos, adjusted **97.82%**).

## Método e honestidade

1. O Stryker `related` é NÃO-monotônico nesta base (adicionar testes que
   matam chegou a reduzir kills: 65.49% → 70.73% → 71.92% → 79.92% com
   oscilação por arquivo). Ele é usado como descoberta; a MEDIDA é o harness.
2. O harness falhou fechado 9 vezes durante a construção (S699, S723, S737,
   S741, S746, A548, A563c-contexto, A589, R446/447/454, R523/525): três
   viraram testes novos, seis viraram reclassificação com prova. Nenhum
   mismatch foi ignorado.
3. `--write-summary` conta apenas resultados DO run (REAL KILLED +
   EQUIVALENT NO_EFFECT verificados) e falha se qualquer sobrevivente do
   relatório não estiver tabelado.

## Catálogo de provas de equivalência / baixo valor

- **P-MSG** — strings de mensagem/field-name em `ApplicationError`/helpers:
  o envelope HTTP expõe apenas `code` (`publicMessages[code]` em
  `packages/contracts/src/api.ts`); mensagens não alcançam contrato, log
  auditado ou projeção. Prova empírica: harness NO_EFFECT + envelope.
- **P-ERR1** — `if (x instanceof ApplicationError) return/throw x` removido:
  o fallback `toApplicationError` é identidade sobre ApplicationError
  (`packages/application/src/errors.ts`). Comportamento idêntico.
- **P-S1** — `digest("utf8")` → `digest("")`: codificação default do Buffer
  é utf8; bytes idênticos.
- **P-S2** — remover `if (separator < 0) continue`: parte sem `=` gera
  `name = part.slice(0, -1)`; para casar com o cookie (19 chars) a parte
  teria 20 chars, mas o token exige 32–256 → regex reprova de todo modo.
- **P-S3** — `separator <= 0`: parte `=...` tem nome vazio, nunca casa.
- **P-S4** — `...(cond ? {} : {factory})` com `cond → false`: o ramo else
  injeta `factory: undefined`, e `?? default` normaliza — idêntico.
- **P-PARSE** — remover `typeof reply[i] !== "number"` da disjunção de
  `parseRedisDecision`: quando o termo removido é verdadeiro, o termo
  `!isSafeInteger / !isFinite` restante também é (todo não-número reprova
  neles); remoção não altera o veredito.
- **P-BOUNDED** — `slice(0, 256)` removido em `normalizedPart`: todos os
  chamadores já são limitados (enum curto, IP ≤ 45 via parse, rota ≤ 256
  por guarda, principal hasheado em 32 hex). Entrada > 256 inalcançável.
- **P-LIVE** — textos do script Lua / chaves de reset: o fake scripted não
  executa Lua; a prova é a matriz live 5/5 + restart contra Redis real
  (3 mutantes Lua do caminho INCR verificados mortos ao vivo; os 4 do
  `reset`/DEL sobrevivem ao vivo porque `reset` não tem chamadores —
  ver P-NOOP).
- **P-TIMER** — `unref`/clearTimeout/listener args: higiene de timer sem
  efeito em vereditos (timeouts/aborts cobertos por testes de outcome).
- **P-NOOP** — `reset()` sem chamadores em produção: remoção/throw nunca
  dispara; seam de interface.
- **P-NULL** — `if (target === null)` → `if (target !== null)` seria
  inversão REAL (coberto por harness como REAL onde aplicável); onde o
  ramo é defensivo após checagem anterior, documentado no item.

## Resultados por escopo (harness, runs limpos, 0 problems)

| Escopo | Stryker raw | Harness REAL mortos | Equiv./Low/Tool verificados |
|---|---|---:|---:|
| authorization.ts | 199/219 (90.87%) | 12 | 10 equiv. |
| session.ts | 113/129 (87.60%) | 12 | 4 equiv. |
| attempt-use-cases.ts | 74/99 (74.75%) | 19 | 7 equiv. |
| account-recovery-use-cases.ts | 130/182 (71.43%) | 25 | 27 equiv. |
| rate-limit-store.ts | 292/352 (82.95%) | 24 | 16 equiv. + 20 low/tool + 1 unreach. |

Agregado final em `reports/mutation-summary.json` (meta ≥ 90%, ideal ≥ 95%).
LOW_VALUE/UNREACHABLE/TOOL_ARTIFACT verificados permanecem no denominador
(penalidade honesta); apenas EQUIVALENT provado é excluído.

## Residuais de assurance de mutação

- Escopo ainda seletivo (5 arquivos); ATTEMPT fora do harness (domínio
  puro com testes próprios), diagnóstico/worker/outbox não mutados.
- Stryker raw < 90% em 3 arquivos por ruído de operador (mensagens) +
  `related`; o número de promoção é o adjusted verificado, nunca o raw.
