# 0544 — Auditoria do contrato da role de runtime

**Data:** 2026-08-26
**Escopo:** `OPS-061-GRANTS-003` — coerência de `DATABASE_URL` no contrato CI e no exemplo de ambiente
**Commit técnico:** `0bd71f2`
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo e limites

Verificar e corrigir a divergência em que `DATABASE_URL`, usada para inicializar
o runtime, não era validada pelo contrato CI e permanecia apontada para a role
de migração em `.env.example`. A correção é limitada ao validador, ao exemplo de
ambiente, aos testes de governança e ao control plane. Não altera produto,
migrations aplicadas, produção, deploy ou `JOURNEY-056`.

## 2. Achados confirmados e correção

- A crítica independente parcial encontrou que `scripts/verify-ci-contract.mjs`
  validava as quatro URLs `CVG_*`, mas ignorava `DATABASE_URL`.
- O runtime recebe `DATABASE_URL` em `packages/config/src/env.ts`, enquanto o
  exemplo usava a role de migração `cvg`; o workflow CI já usa `cvg_app` para o
  runtime e sobrescreve a URL de migração somente no passo de migrations.
- O validador agora analisa as cinco URLs documentadas, exige que
  `DATABASE_URL` use a mesma role da aplicação de
  `CVG_TEST_DATABASE_URL` e exige o mesmo banco para todas elas.
- `.env.example` agora deixa `DATABASE_URL` com a role sintética de aplicação
  `cvg_app`. Nenhuma credencial real foi usada.
- O ponteiro documental do runtime state deixou de declarar um commit técnico
  antigo como se fosse o HEAD atual; o estado distingue o último commit técnico
  do checkout corrente.

## 3. TDD e revisão

### RED

Foi adicionado um cenário que substitui `DATABASE_URL` por uma role de migração.
Antes da implementação, a suíte focal falhou `1/8`, pois o validador ignorava a
variável. O cenário de roles migration/application colapsadas também foi
preservado.

### GREEN/REFACTOR

- `tests/integration/ci-governance.test.ts`: `9/9` PASS, cobrindo runtime com
  role de migração, runtime em banco divergente, roles CVG colapsadas e o
  contrato aceito.
- O validador compara somente identificadores parseados; senhas e URLs não são
  impressas nos erros.
- A revisão independente parcial foi útil para localizar a falha, mas não
  retornou um parecer final de aceite dentro da janela. Ela não é tratada como
  aprovação independente.

## 4. Verificações

- `pnpm verify`: `141` arquivos PASS, `29` skipped; `716` testes PASS,
  `38` skipped; cobertura `84,36%` statements, `80,30%` branches, `86,35%`
  functions e `85,05%` lines.
- Contratos `86/86`, worker `27/27`, migrations `51/51`, secrets, arquitetura,
  documentação, product definition, exposição e traceability: PASS.
- `pnpm build`: `12/12` workspaces PASS.
- `pnpm test:e2e --workers=1`: `32/32` PASS.
- `pnpm audit --audit-level=high`: nenhum advisory conhecido.
- `git diff --check`: PASS.
- Não houve nova prova live: esta correção é estática e não requer migration;
  a prova PostgreSQL 16.15 descartável anterior de `OPS-061-GRANTS-002`
  permanece separada e não é reatribuída a esta task.

## 5. Resultado e limites

O contrato local agora falha fechado quando o runtime documentado usa a role de
migração ou outro banco, e o exemplo de ambiente orienta a role least-privilege
de aplicação. O resultado continua condicional: não prova configuração,
owners, ACLs, deployment ou workflow remoto do ambiente produtivo; também não
prova o fluxo diagnóstico → assignment, operação externa ou aprovação clínica.

O próximo passo é aguardar a decisão humana A/B de `JOURNEY-056`. Não há
autorização de release, piloto, publicação clínica ou claim de competência
prática.
