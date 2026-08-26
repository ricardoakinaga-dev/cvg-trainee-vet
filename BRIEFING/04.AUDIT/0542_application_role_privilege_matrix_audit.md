# Auditoria da matriz de privilégios da role de aplicação

**Data:** 2026-08-26
**Escopo:** `OPS-061-GRANTS-001` — provisionamento PostgreSQL do harness
**Commit técnico verificado:** `464b0b8`
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo e limites

Substituir o DML global concedido à role de aplicação no banco descartável por
uma matriz explícita, manter os fluxos atuais do monólito modular e comprovar
uma negação conhecida para armazenamento interno que não pertence ao boundary
da aplicação.

Esta auditoria cobre o provisionador e sua governança de CI. Não aplica
migration, não altera produto ou `JOURNEY-056`, não provisiona produção e não
substitui revisão de owners/grants produtivos, workflow remoto same-SHA ou
aprovação clínica. Todas as referências e fixtures são sintéticas.

## 2. Requisitos e barra de aceite

- `SPEC-0109`: PostgreSQL como autoridade transacional e privilégios
  controlados no boundary de persistência.
- `SPEC-0111`: autorização server-side, deny-by-default, RLS como defesa
  adicional e governança/auditoria.
- `SPEC-0118`: RED → GREEN → REFACTOR, evidência reproduzível e
  rastreabilidade.
- `DB-PRIVILEGE-032`: a aplicação não pode ser `SUPERUSER`, `BYPASSRLS` ou
  administradora de roles.
- `QB-03`/`QB-04`: isolamento, deny-by-default e preservação dos invariantes
  de persistência.

Critério local: `app` não recebe DML global, default ACL amplo ou privilégios
de sequence; recebe apenas grants por tabela necessários ao schema atual;
`knowledge_documents` permanece fora da matriz; `PUBLIC` não recebe acesso;
admin e migration continuam roles distintas para fixture/cleanup e ownership.

## 3. Implementação verificada

O commit `464b0b8` alterou somente o provisionador e os testes de governança:

- `scripts/provision-ci-postgres.mjs` exporta a matriz imutável de 29 tabelas
  públicas e os privilégios por tabela. Tabelas de idempotência e histórico
  recebem somente `SELECT, INSERT`; `audit_entries` recebe o mesmo recorte.
  As demais tabelas atuais recebem os quatro DML necessários pelos fluxos
  existentes.
- `knowledge_documents` é uma exclusão explícita e não aparece na matriz nem
  nos grants gerados.
- O provisionamento revoga privilégios atuais de tabelas e sequences para
  `app` e `PUBLIC`, revoga defaults globais e do schema `public` para ambos e
  depois aplica somente os grants explícitos da allowlist.
- Não há concessão de sequence para `app`: o schema atual não possui sequences
  públicas, e o teste live exige que a aplicação continue sem esse privilégio.
  Uma futura tabela com sequence exigirá alteração explícita e revisada da
  matriz.
- Os nove helpers RLS continuam com `EXECUTE` direto para a aplicação e admin
  sintético; essa concessão não reabre acesso de tabela.
- `app` é provisionada com `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`.
  `admin` permanece `NOSUPERUSER BYPASSRLS CREATEROLE` apenas para o harness;
  não é a conexão usada pelo fluxo da aplicação.
- O script passou a ser importável sem executar `psql`, permitindo que a
  governança inspecione a mesma função geradora que será executada no CI.

## 4. Evidência TDD e verificações

### RED

Antes da implementação, o teste focal de governança falhou (`1/20`) porque o
provisionador ainda continha `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL
TABLES` e default DML amplo para `app`.

### GREEN/REFACTOR

Após a implementação e o endurecimento de ACL global/schema:

- `tests/integration/migration-governance.test.ts`: `20/20` PASS. O teste
  compara a allowlist com as 30 tabelas declaradas no schema, verifica a
  ausência de `knowledge_documents`, rejeita o grant global/default e valida
  o SQL gerado para cada tabela.
- `tests/integration/postgres-rls-function-privileges.test.ts`: o cenário novo
  de matriz live está implementado, mas foi `skipped` nesta sessão por falta
  de banco autorizado. Quando executado, ele verifica privilégios efetivos e
  ACL direta, ACL de `PUBLIC`, memberships, sequences, default ACL e o erro
  `permission denied` ao consultar `knowledge_documents`.
- `pnpm verify`: `141` arquivos PASS, `709` testes PASS, `29` arquivos e `38`
  testes skipped; cobertura global `84,36%` statements, `80,35%` branches,
  `86,35%` functions e `85,05%` lines. Contratos `86/86`, worker `27/27`,
  migrations `51/51` e gates de CI, arquitetura, documentação, product
  definition, exposição e traceability passaram.
- `pnpm build`: `12/12` workspaces construíveis passaram.
- `pnpm test:e2e --workers=1`: `32/32` cenários sintéticos passaram, incluindo
  build do artefato web.
- `pnpm audit --audit-level=high`: nenhum advisory conhecido.
- `git diff --check`: passou antes do commit técnico.

O preflight `pnpm test:integration:live` foi executado e encerrou com exit 2
antes da conexão, com a mensagem de que `CVG_TEST_DATABASE_URL` é obrigatória
e `DATABASE_URL` não é aceita. Portanto não há evidência live nova nesta
task; ausência de ambiente não foi convertida em PASS.

## 5. Crítica independente

A crítica independente pós-build de Huygens retornou `CONDITIONAL PASS`, sem
P0. Os pontos levantados foram tratados ou mantidos como limites explícitos:

1. herança/preexistência de ACL passou a ser observada por `relacl`, ACL de
   `PUBLIC`, `pg_auth_members` e `has_table_privilege`;
2. sequences passaram a ser verificadas; o schema atual não possui sequences
   públicas;
3. a cobertura não depende somente do source SQL, pois o teste live compara
   ACL efetiva e direta quando houver ambiente.

A revisão também confirmou o ordenamento SQL, a exclusão de
`knowledge_documents`, a segurança de quoting/import e os grants privados dos
helpers RLS. O resultado condicional não autoriza inferir a configuração de
um ambiente produtivo.

## 6. Gaps, riscos e próxima ação

- owners, grants efetivos, roles herdadas, default ACL e conexão least
  privilege de produção ainda precisam de execução por autoridade operacional;
- a matriz live não foi executada nesta rodada por falta de
  `CVG_TEST_DATABASE_URL`; a próxima execução deve recriar banco descartável,
  aplicar o provisionamento e guardar a saída sem credenciais;
- remote same-SHA, carga, failover/restore, collector/traces, operação
  externa, diagnóstico → assignment e browser cross-scope continuam gaps;
- `JOURNEY-056` ainda depende da decisão humana entre sessão diagnóstica
  própria e atividade especial; nenhum código dessa jornada foi iniciado;
- publicação clínica, piloto e qualquer claim de competência prática seguem
  bloqueados por revisão e aprovação humana.

## 7. Conclusão

O harness agora expressa uma matriz de privilégios por tabela e rejeita a
regressão do DML global no source e no SQL gerado. O desenho local é
`CONDITIONAL PASS / COMPLETED_WITH_GAPS`: a task pode ser encerrada no
control plane com o commit técnico rastreado, mas a prova live e a
configuração produtiva continuam pendentes. A próxima ação global é aguardar
Ricardo para `JOURNEY-056` ou abrir uma nova fatia bounded autorizada; não há
autorização de release.
