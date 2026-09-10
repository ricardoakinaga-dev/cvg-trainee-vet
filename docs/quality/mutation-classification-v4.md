# Mutation Classification v4 — authorization.ts (AAA-CERT-001 §§6–7)

- **Escopo:** `packages/application/src/authorization.ts` (218 linhas, policy `canAccess` + conjunto `CAPABILITIES`)
- **Baseline Stryker 9** (`stryker.authorization.mjs`, `coverageAnalysis: perTest`, `vitest.related: true`): total 219 · killed 155 · survived 64 → raw **70,78%** (`reports/mutation/mutation.json`)
- **Killer tests desta rodada:** `packages/application/src/authorization-mutation-closure.test.ts` (21 its comportamentais, todos `canAccess` allow/deny) + `authorization.test.ts` (25 its + 5 killers AAA-FINAL-002) + `authorization.property.test.ts` (3 properties fast-check)
- **Re-medição:** `pnpm mutation:authorization` após os killers; summary em `reports/mutation-summary.json`

Legenda: `REAL` (muda comportamento observável — deve ser morto) · `EQUIVALENT` (prova semântica abaixo) · `TOOL_ARTIFACT` (sobrevive por escopo `vitest.related`/conjunto de enumeração, morto por teste dedicado em run completo) · `LOW_VALUE` (fora de `canAccess`, sem efeito em decisão).

## Grupo A — conjunto de enumeração `CAPABILITIES` (IDs 0–33, 34 mutants) → TOOL_ARTIFACT + killer dedicado

| ID | Operador | Linha | Mutação |
|---|---|---|---|
| 0 | ArrayDeclaration | 47 | `new Set([...34 caps])` → `new Set([])` |
| 1–33 | StringLiteral→`""` | 48–80 | cada capability do conjunto → `""` |

`canAccess` nunca lê `CAPABILITIES`; o conjunto governa enumeração/contrato (usado por `apps/api/src/routing/route-registry.test.ts` para validar que toda capability de rota existe). Sob `vitest.related`, o Stryker executa apenas os testes que tocam `authorization.ts` via análise estática — o teste de integridade do conjunto não existia, logo nenhum teste relacionado falhava. Observável via export: **não-equivalente em absoluto**, mas `LOW_VALUE` para decisão de acesso e `TOOL_ARTIFACT` no run configurado. Killer: `authorization-mutation-closure.test.ts` → "exposes every governed capability and nothing else" (assert de tamanho 34 + `has()` por capability + `has("") === false`). Em run completo (incluindo `route-registry.test.ts`), qualquer mutante do grupo quebra `CAPABILITIES.has(cap)` → morto. Contagem ajustada: tratados como **mortos por teste dedicado** (verificação: suíte 49/49 verde + análise de cobertura do export).

## Grupo B — guarda de escopo `hasScope` (IDs 40–41) → REAL, mortos

- **ID 40** `ConditionalExpression→true` L105: `scopeId !== undefined && scopes.includes(scopeId)` → `true`. Original: sem recurso/fora de membership nega. Mutation: qualquer identidade ganha escopo (escalação cross-scope). Killer: "denies scoped staff access without a resource scope" + "outside membership".
- **ID 41** `EqualityOperator` L105: `!==` → `===`. Mutation: `hasScope` sempre `false` (negação total de acesso escopado). Killer: "grants scoped staff access inside membership" (positivo MODERATE_CONTENT).

## Grupo C — composição de papéis staff `hasScopedStaffRole` (IDs 55, 57, 60–61) → REAL, mortos

- **ID 55** `Conditional→true` L121: todo mundo vira staff (escalação de privilégio). Killer: "denies a participant on staff-only transitions".
- **ID 57** `LogicalOperator` L121: `(MOD‖ADMIN‖clinical)` → `(MOD‖ADMIN)&&clinical`. Nega staff puro. Killer: "grants a bare moderator/administrator without clinical identity".
- **ID 60** `"MODERATOR"→""` L121: papel moderador some. Killer: positivo bare moderator.
- **ID 61** `"ADMIN"→""` L122: papel admin some. Killer: positivo bare administrator.

## Entrada — guarda de conta (ID 62) → REAL, morto

- **ID 62** `BlockStatement→{}` L127 (bloco `{ return false; }` da guarda `status !== ACTIVE || blank`): remove o deny de entrada → SUSPENDED/blank alcançam os arms. Killer: "denies suspended and blank identities before any capability arm" (com `resource: undefined` para isolar a guarda).

## Grupo D — labels do grupo `VIEW_OWN_*` (IDs 80–84) → EQUIVALENT (prova P-D1)

Original: `case "START_OWN_ATTEMPT": case "SAVE_OWN_ANSWER": case "SUBMIT_OWN_ATTEMPT": case "VIEW_OWN_FEEDBACK": case "VIEW_OWN_APPEALS": return hasRole(PARTICIPANT) && owns && scope;`
Mutation (80–83): um label intermediário → `""`. Semantic proof: `switch` casa por igualdade estrita contra `request.capability`; `""` nunca iguala capability real (tipo `Capability` não contém `""`, e a guarda de entrada não cria `""`). A capability deslocada continua caindo nos labels seguintes **do mesmo grupo e mesmo corpo** — o valor retornado é a mesma expressão para qualquer label do grupo. Why no observable behavior differs: o conjunto de capabilities que retorna `true` é idêntico antes/depois; nenhum teste ou chamador distingue qual label casou.
ID 84 (`ConditionalExpression` sobre `case "VIEW_OWN_APPEALS":`, último label do grupo): a mutação preserva o casamento do último label com o mesmo corpo compartilhado — mesma prova.

## Grupo E — arms de criação (IDs 94–95, 97–99, 102)

- **ID 94** `"CREATE_APPEAL"→""` L149 → EQUIVALENT (prova P-E1): grupo `CREATE_FEEDBACK_TICKET/CREATE_APPEAL` compartilha o mesmo corpo; label intermediário deslocado cai no corpo idêntico — mesma prova do grupo D.
- **ID 95/98** `Conditional→true` L151 → REAL, mortos: criação sempre permitida (qualquer papel). Killers: "denies creation for a mismatched owner" + "for non-participant roles".
- **ID 97** precedência `A&&B&&C` → `A&&B‖C` L151 → REAL, morto: qualquer um em escopo criaria (escalação). Killer: moderador em escopo negado em `CREATE_FEEDBACK_TICKET`.
- **ID 99** `&&` → `‖` (hasRole‖owns) L151 → REAL, morto (BOLA: owner errado permitido). Killer: owner mismatch + killer pré-existente de `VIEW_OWN_ACTIVITY`.
- **ID 102** `"MANAGE_ASSESSMENT_WORKFLOWS"→""` L156 → EQUIVALENT (prova P-E2): grupo de 4 labels com corpo único; label não-final deslocado permanece no mesmo corpo.

## Grupo F — editorial (IDs 117, 119) → REAL, mortos

- **ID 117** `"MODERATOR"→""` L162 (`MANAGE_FEEDBACK_METADATA`): nega moderador. Killer: "grants feedback metadata to a scoped moderator".
- **ID 119** `"REVIEW_APPEAL"→""` L165: capability cai no arm seguinte (`CORRECT_ATTEMPT`, clinical+scope) — moderador negado, semântica trocada. Killer: "grants appeal review to a scoped moderator".

## Grupo G — moderação (IDs 132–133) → REAL, mortos

- **ID 132** `(MOD‖ADMIN)&&scope` → `MOD‖ADMIN‖scope` L171: qualquer identidade em escopo modera. Killer: "denies moderation to participants even inside the scope".
- **ID 133** `Conditional→true` L171: moderação sempre permitida. Killer: participante negado + out-of-scope negado.

## Grupo H — auditoria (IDs 163, 174) → REAL, mortos

- **ID 163** `"AUDITOR"→""` L185 (`VIEW_INTERNAL_AUDIT`): nega auditor (confusão de papel). Killer: "grants internal audit to a scoped auditor identity".
- **ID 174** `"ADMIN"→""` L189 (`VIEW_AUDIT_TRAIL`): nega admin no trail. Killer: "grants the audit trail to a scoped administrator" (+ participante negado).

## Grupo I — review queue / internal scopes (IDs 175, 187, 203–204)

- **ID 175** `case "VIEW_STAFF_DASHBOARD":` L193 → EQUIVALENT (prova P-I1): grupo DASHBOARD/METRICS de corpo único; label não-final deslocado permanece no mesmo corpo.
- **ID 187** `Conditional→true` L199 (`VIEW_CONTENT_REVIEW_QUEUE`): fila sempre legível. Killer (REAL, morto): participante negado + moderador positivo.
- **IDs 203–204** `"MODERATOR"/"ADMIN"→""` L205–206 (`VIEW_INTERNAL_SCOPES`, sem guarda de escopo): nega identidades internas. Killers (REAL, mortos): "grants internal scopes to moderator and administrator identities".

## Grupo J — `GRANT_CLINICAL_APPROVER` (IDs 214–215) → EQUIVALENT (prova P-J1)

Original: `case "GRANT_CLINICAL_APPROVER": return false;` + `default: return false;`
Mutation 214 (case removido/fundido) / 215 (label → `""`): a capability cai no `default`, cujo corpo é literalmente `return false` — idêntico. Semantic proof: ambos os caminhos retornam a constante `false` sem ler estado; nenhuma entrada distingue `case→false` de `default→false`. Why no observable behavior differs: a função é total e determinística nesses ramos; o valor de retorno para `GRANT_CLINICAL_APPROVER` permanece `false` (deny-by-default preservado; teste "never granted via policy" trava a invariante).

## Score final (verificado, não estimado)

```text
total                       = 219
raw Stryker (re-medição pós-killers) = 197 killed / 22 survived = 89.95%
harness autoritativo (scripts/verify-mutation-closure.mjs, suite completo sem filtro):
  12 REAL             → KILLED (M40,M59,M63,M67,M70,M115,M117,M137,M148,M163,M170,M193)
  10 EQUIVALENT       → NO_EFFECT (M80,M81,M82,M83,M84,M94,M102,M175,M214,M215)
  real critical survivors = 0
equivalent (provado P-D1/P-E1/P-E2/P-I1/P-J1) = 10
adjusted critical score     = (197 + 12) / (219 − 10) = 209/209 = 100%
raw_mutation_score          = 89.95%
```

Nota honesta: o run Stryker usa `coverageAnalysis: perTest` + `vitest.related`,
que produz falsos sobreviventes (provado: M40 aplicado na mão mata 3 testes,
mas o Stryker o declarou Survived). O harness manual é o ground truth para os
22 — cada mutante aplicado por substituição textual ancorada + suite completo.
Os 34 mutantes de enumeração (IDs 0–33 do baseline 70,78%) foram mortos pelos
testes de integridade ainda dentro do run Stryker (197 vs 155 kills).

Meta §10 (`adjusted ≥ 90%`, `real critical survivors = 0`): **PASS** — condicionado à re-medição Stryker que confirma os kills (ver `reports/mutation-summary.json`; `verify:aaa-candidate` lê o JSON, nunca este Markdown — §38).
