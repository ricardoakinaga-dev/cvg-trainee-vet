# 0546 — Auditoria da role da fixture E2E e do escopo do override de migration

**Data:** 2026-08-26
**Escopo:** `OPS-061-GRANTS-005` — identidade da fixture real E2E e ancoragem do override
**Commit técnico:** `400e22885ae22c1f03ed6c58c61a59d65719158d`
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo e limites

Responder a dois gaps P2 encontrados pela crítica independente pós-fix de
`OPS-061-GRANTS-004` no contrato das URLs PostgreSQL. A correção é limitada ao
validador e aos testes de governança. Não altera produto, migrations aplicadas,
produção, deploy ou `JOURNEY-056`.

## 2. Achados confirmados e correção

- `CVG_REAL_E2E_DATABASE_URL` alimenta o servidor de fixture que cria e limpa
  registros sintéticos diretamente no PostgreSQL. O contrato agora exige que
  sua identidade de role seja a mesma de `CVG_TEST_ADMIN_DATABASE_URL`,
  preservando a separação do runtime `DATABASE_URL` na role `cvg_app`.
- O parser anterior selecionava qualquer `DATABASE_URL` com dez espaços de
  indentação. O contrato agora delimita o step nomeado `Apply migrations` e só
  lê o override dentro desse bloco.
- A comparação continua usando somente protocolo, role e database parseados;
  senhas e URLs completas não entram nas mensagens de erro.

## 3. TDD e implementação

### RED

Foram adicionados três cenários: role de fixture incorreta no `.env.example`,
role de fixture incorreta no job-level do workflow e override deslocado para o
step de provisionamento. O focal falhou `3/16` antes da implementação.

### GREEN/REFACTOR

`scripts/verify-ci-contract.mjs` passou a impor a identidade admin para a
fixture e introduziu a extração de variável por step. O focal passou `16/16`;
`verify:ci-contract` retornou `status=PASS`, com 16 chaves de ambiente, 21
checks de workflow e 1 check de runtime. A alteração foi commitada em
`400e22885ae22c1f03ed6c58c61a59d65719158d`.

## 4. Verificações

- `pnpm verify`: `141` arquivos PASS, `29` skipped; `723` testes PASS,
  `38` skipped; cobertura `84,36%` statements, `80,30%` branches, `86,35%`
  functions e `85,05%` lines.
- `pnpm build`: `12/12` workspaces PASS.
- `pnpm test:e2e`: `32/32` cenários sintéticos PASS.
- `pnpm audit --audit-level=high`: nenhum advisory conhecido.
- `git diff --check`: PASS.
- `pnpm verify:traceability:release`: PASS em worktree limpo; os artefatos
  correntes resolvem para commits alcançáveis e paths rastreados.
- Não houve nova prova live. As evidências PostgreSQL descartáveis anteriores
  continuam separadas e não são reatribuídas a este ciclo; não há evidência de
  produção, workflow remoto same-SHA, operação externa ou aprovação clínica.

## 5. Crítica independente e resultado

A crítica independente de `Confucius`, executada antes do fix, confirmou os
dois gaps P2 e nenhum P0/P1. Uma tentativa independente pós-commit (`Socrates`)
foi interrompida após expirar a janela e não produziu veredito final; portanto,
não é tratada como aceite independente. O resultado permanece condicional,
apoiado pelos testes focalizados, regressão e gates reproduzíveis.

`OPS-061-GRANTS-005` fica `COMPLETED_WITH_GAPS`. O próximo passo é aguardar a
decisão humana A/B de `JOURNEY-056`: (A) sessão diagnóstica pública própria,
recomendada, com checkpoint/retomada e finalização server-side; ou (B)
atividade especial. Não há autorização de release, piloto, publicação clínica
ou claim de competência prática.
