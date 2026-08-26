# Auditoria do hardening do provisionamento de privilégios

**Data:** 2026-08-26
**Escopo:** `OPS-061-GRANTS-002` — provisionamento, ACLs e contrato CI do
harness PostgreSQL
**Commit técnico verificado:** `36088ff`
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo e limites

Responder aos achados independentes sobre exposição de credenciais, ACLs
residuais, grantability, dependência de `search_path`, falha parcial e
variáveis incompletas do harness. A alteração é limitada ao provisionador,
governança de CI, healthcheck de least privilege e provas PostgreSQL. Não
altera migrations aplicadas, produto, `JOURNEY-056`, produção ou workflow
remoto. Foram usados somente nomes, credenciais e registros sintéticos.

## 2. Correções verificadas

- `scripts/provision-ci-postgres.mjs` separa parsing de conexão, argumentos do
  `psql`, ambiente filho e arquivos temporários. URL/senha não entram em
  `argv`; a senha fica em `.pgpass` temporário `0600`, o SQL fica em arquivo
  `0600`, ambos são removidos após `close`/`error`, e o processo usa
  `--no-psqlrc`, `--no-password`, `ON_ERROR_STOP` e `--file`.
- O ambiente filho usa allowlist mínima (`PATH`, locale e contexto seguro),
  remove URLs de banco e variáveis `PG*` herdadas e reintroduz somente
  `PGPASSFILE` e o `PGSSLMODE` validado da conexão.
- O SQL de roles é transacional (`BEGIN`/`COMMIT`), qualifica tabelas com
  `public.`, valida roles/banco distintos antes de executar e declara
  `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE` e
  `NOREPLICATION` para `app`. A role `admin` é `NOSUPERUSER`,
  `NOCREATEDB`, `NOREPLICATION`, mantém `BYPASSRLS`/`CREATEROLE` somente para
  fixture e recebe grant option somente para delegar grants ao harness.
- Database/schema/functions e defaults revogam acesso de `PUBLIC` e da
  aplicação; `app` recebe apenas `CONNECT`, `USAGE`, a allowlist explícita de
  29 tabelas e nove helpers RLS. Seus grants não são delegáveis. `admin`
  recebe delegação explícita para criar roles efêmeras, inclusive `CONNECT`,
  sem ampliar a role de aplicação.
- O healthcheck de conexão produtiva também rejeita replication, `CREATE` ou
  `TEMPORARY` no database, ausência de `USAGE` ou `CREATE` no schema público e
  ownership de relações.
- O contrato CI passou a declarar 16 chaves, incluindo migration, admin e
  fixture URL, e rejeita `.env.example` com roles colapsadas ou bancos
  divergentes.

## 3. TDD e crítica independente

### RED

Os novos testes inicialmente falharam por ausência de `postgresProvisionArgs`
e da variável `CVG_MIGRATION_DATABASE_URL`. A crítica independente também
reproduziu a falha do teste de cleanup assíncrono e observou herança de
`AWS_SECRET_ACCESS_KEY`/`PGHOSTADDR` no processo filho. O cenário de
grantability do `admin` foi identificado como incompatível com as roles
efêmeras usadas pelo próprio harness.

### GREEN/REFACTOR

As correções foram implementadas e o foco passou a verificar o comportamento
real da invocação, em vez de apenas strings:

- `migration-governance.test.ts`: `23/23` PASS, incluindo `argv` sem URL ou
  senha, pgpass/SQL `0600`, limpeza eventual, transação, ACL, schema
  qualification e separação de grant option.
- `ci-governance.test.ts`: `7/7` PASS, incluindo presença e coerência das
  URLs documentadas.
- As provas live de RLS/security/ACL foram atualizadas para conceder
  `CONNECT` somente às roles efêmeras, usando a delegação controlada de
  `admin`; a aplicação continua sem grant option.

## 4. Evidência de runtime local

Foi criado um banco PostgreSQL `16.15` novo e descartável, com uma role de
migration sintética e roles `app`/`admin` criadas pelo provisionador. O fluxo
executado foi migrations → provisionador → runner oficial
`pnpm test:integration:live`. Resultado: **35 arquivos, 82 testes PASS**.

Uma consulta administrativa independente, antes da limpeza, confirmou:

- `app`: `NOSUPERUSER`, sem `BYPASSRLS`, `CREATEROLE`, `CREATEDB` ou
  `REPLICATION`; `CONNECT=true`, `CREATE=false`, `TEMPORARY=false`,
  schema `USAGE=true` e `CREATE=false`;
- `PUBLIC`: ACL vazia no database e no schema `public`;
- `app`: `0` grants delegáveis em `102` ACLs diretas de tabela e `0` em `9`
  ACLs diretas de função; `0` relações próprias;
- `admin`: `BYPASSRLS`/`CREATEROLE` para o harness e grant option observada
  apenas nas ACLs administrativas necessárias à criação de fixtures;
- o healthcheck com `requireLeastPrivilege: true` passou para `app`;
- banco e as três roles foram removidos ao fim da prova; uma consulta posterior
  não retornou nenhum dos nomes sintéticos.

## 5. Gates finais

- `pnpm verify`: `141` arquivos PASS, `29` skipped; `714` testes PASS,
  `38` skipped; cobertura global `84,36%` statements, `80,30%` branches,
  `86,35%` functions e `85,05%` lines.
- Contratos: `86/86`; worker: `27/27`; migrations: `51/51`; secrets,
  arquitetura, documentação, product definition, exposição e traceability:
  PASS.
- `pnpm build`: `12/12` workspaces PASS.
- `pnpm test:e2e`: `32/32` cenários sintéticos PASS.
- `pnpm audit --audit-level=high`: nenhum advisory conhecido.
- `git diff --check`: PASS.

## 6. Resultado, gaps e próxima ação

O harness local agora prova o desenho de privilégios efetivo e o caminho de
provisionamento sem credencial em `argv`/ambiente herdado. O resultado é
condicional porque não comprova owners, ACLs, roles herdadas, defaults,
deployment ou same-SHA do ambiente produtivo/remoto. Também permanecem fora
da evidência carga, escala, failover, restore, collector/retention/traces,
operação externa, fluxo diagnóstico → assignment, cenário browser cross-scope,
feedback conversacional e aprovação clínica.

O próximo passo autorizado é atualizar o control plane e aguardar a decisão
humana de `JOURNEY-056` entre sessão diagnóstica pública própria e atividade
especial. Não há autorização de release, piloto, publicação clínica ou claim
de competência prática.
