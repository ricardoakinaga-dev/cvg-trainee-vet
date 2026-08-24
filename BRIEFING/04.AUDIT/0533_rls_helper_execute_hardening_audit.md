# AUDIT — privacidade dos helpers RLS `SECURITY DEFINER`

## Escopo

Esta auditoria fecha o gap de privilégio identificado na revisão independente:
os helpers booleanos usados pelas policies RLS não podem ser invocados por
qualquer role através do privilégio implícito de `PUBLIC EXECUTE`. O recorte
cobre os cinco helpers atuais e o provisionamento explícito da role de
aplicação. Não altera as regras de escopo, não substitui autorização
server-side e não afirma evidência de ambiente produtivo.

## Falha RED

As migrations `0030`–`0032` e `0034` criavam ou redefiniam funções
`SECURITY DEFINER`; somente `0034` revogava `EXECUTE` de `PUBLIC`. A governança
não cobria a família completa e o provisionador concedia apenas o helper de
membership curricular.

O RED focal foi reproduzido ao exigir a migration `0035` antes de ela existir:
`tests/integration/migration-governance.test.ts` falhou com `ENOENT`.

## GREEN / REFACTOR

- `0035_rls_helper_execute_hardening.sql` revoga `EXECUTE` de `PUBLIC` para os
  cinco helpers: escopo de atividade, participante, inserção de item, conteúdo
  do participante e membership curricular;
- `scripts/provision-ci-postgres.mjs` reaplica o revoke e concede `EXECUTE`
  explicitamente somente à role de aplicação, de forma idempotente e após as
  migrations no workflow CI;
- a governança estática afirma todas as assinaturas e o vínculo migration →
  provisionamento;
- o teste live cria uma role sintética sem grant, confirma `NOSUPERUSER`/
  `NOBYPASSRLS`, owner distinto, ACL direta para a aplicação e ausência de ACL
  pública, e espera `permission denied` para a role negativa;
- a limpeza live tenta fechar conexões, revogar uso e remover a role mesmo se
  uma etapa de cleanup falhar; a URL de conexão restrita preserva seus
  parâmetros.

## Evidência executada

- RED focal: governança falhou antes da migration `0035`;
- GREEN focal: 4 testes de governança passaram e o teste live ficou skipped por
  configuração ausente;
- `pnpm verify` passou com 131 arquivos, 637 testes aprovados e 34 skips;
- cobertura global: 84,90% statements, 81,13% branches, 86,41% functions e
  85,65% lines;
- `pnpm typecheck`, ESLint, Prettier, `pnpm verify:migrations` (36 migrations),
  secrets, arquitetura, documentação, product-definition, exposure e
  `git diff --check` passaram;
- `pnpm test:integration:live` saiu com código 2 porque
  `CVG_TEST_DATABASE_URL` não está configurada; nenhuma prova PostgreSQL live
  foi inferida;
- crítica independente inicialmente rejeitou a evidência live por falso
  positivo potencial, cleanup incompleto e perda de parâmetros; os três
  pontos foram corrigidos antes do commit
  `425e8d657c2ab4b55af2e8512b54ac24a8ea2c04`.

## Limites e próximos gates

Ainda falta executar, em um banco CVG descartável e autorizado, as migrations,
o provisionamento das roles e o teste negativo browser/API/PostgreSQL. Também
permanecem sem evidência nesta sessão grants/owners produtivos, workflow remoto
no mesmo SHA, collector/retention/traces, carga, failover/restore, provider/MFA
e gates clínicos. Portanto esta fatia é `COMPLETED_WITH_GAPS`, não é release.

## Rastreabilidade

`RLS-FUNCTION-EXECUTE-051` · commit
`425e8d657c2ab4b55af2e8512b54ac24a8ea2c04` · PRD-RF-001 · PRD-RF-006 ·
PRD-RF-009 · SPEC-0111 · SPEC-0112 · SPEC-0118 · AGENTS-TDD.
