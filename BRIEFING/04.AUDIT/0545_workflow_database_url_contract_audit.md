# 0545 — Auditoria das URLs PostgreSQL efetivas do workflow

**Data:** 2026-08-26
**Escopo:** `OPS-061-GRANTS-004` — contrato efetivo do workflow e rejeição de URLs vazias
**Commit técnico:** `489a336`
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo e limites

Responder à crítica independente que encontrou duas lacunas no contrato de
`OPS-061-GRANTS-003`: o validador não comparava as URLs efetivas do workflow e
aceitava uma URL documentada vazia. A correção fica limitada ao validador e aos
testes de governança. Não altera workflow, produto, migrations aplicadas,
produção, deploy ou `JOURNEY-056`.

## 2. Achados e correção

- O job-level do workflow agora é lido para `DATABASE_URL`, migration, app,
  admin e real E2E; as cinco identidades são validadas pelo mesmo contrato de
  role e banco usado no `.env.example`.
- O override `DATABASE_URL` do passo de migrations é verificado separadamente
  e precisa usar a identidade de `CVG_MIGRATION_DATABASE_URL`.
- Valores ausentes ou vazios deixam de retornar sucesso silencioso; o erro
  lista somente nomes de variáveis, nunca credenciais.
- O parser reutilizado valida protocolo PostgreSQL, role e database antes de
  comparar identidades. A configuração atual continua sintética e local.

## 3. TDD e crítica independente

### RED

Foram escritos cenários para runtime do workflow com role de migração, URL de
aplicação vazia e URL documentada vazia. Antes da implementação, o foco falhou
`3/12`; o cenário adicional do override também foi incluído no mesmo ciclo.

### GREEN/REFACTOR

`tests/integration/ci-governance.test.ts` passou `13/13`, cobrindo aceitação do
contrato, roles colapsadas, runtime divergente, banco divergente, valores
vazios, workflow job-level e override de migration. Lint e formatação do foco
passaram.

A crítica independente parcial localizou os gaps, mas não entregou parecer
final pós-correção. Portanto, nenhum agente é tratado como aprovação
independente; o resultado abaixo se apoia em testes e gates reproduzíveis.

## 4. Verificações

- `pnpm verify`: `141` arquivos PASS, `29` skipped; `720` testes PASS,
  `38` skipped; cobertura `84,36%` statements, `80,30%` branches, `86,35%`
  functions e `85,05%` lines.
- Contratos `86/86`, worker `27/27`, migrations `51/51`, secrets, arquitetura,
  documentação, product definition, exposição e traceability: PASS.
- `pnpm build`: `12/12` workspaces PASS.
- `pnpm test:e2e --workers=1`: `32/32` PASS.
- `pnpm audit --audit-level=high`: nenhum advisory conhecido.
- `git diff --check`: PASS.
- Não houve nova prova live: a alteração não possui migration e a evidência
  PostgreSQL descartável de `OPS-061-GRANTS-002` permanece separada. Nenhuma
  evidência de produção, remote same-SHA ou ambiente externo é inferida.

## 5. Resultado e próxima ação

O contrato local agora falha fechado para divergência de role/banco no workflow,
override de migration incorreto e URLs vazias. O resultado permanece
`COMPLETED_WITH_GAPS` porque não substitui a validação do ambiente produtivo,
owners/ACLs, operação externa ou aprovação clínica.

O próximo passo é aguardar a decisão humana A/B de `JOURNEY-056`. Não há
autorização de release, piloto, publicação clínica ou claim de competência
prática.
