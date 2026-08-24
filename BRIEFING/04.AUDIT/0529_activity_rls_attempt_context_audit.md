# Auditoria ACTIVITY-RLS-047 — contexto RLS da jornada participante

**Data:** 2026-08-24

**Escopo:** resolvedor de escopo da atividade, preflight HTTP de tentativa,
política participante da projeção curricular e fixtures PostgreSQL sintéticos.

**Classificação:** CORRIGIDO LOCALMENTE COM EVIDÊNCIA UNITÁRIA; LIVE PENDENTE
POR AMBIENTE.

**Não é:** prova de produção, aprovação clínica, publicação de conteúdo real ou
prova de competência prática.

## 1. Achado independente

A crítica adversarial encontrou um P0: `createActivityScopeResolver` fazia uma
leitura raiz de `learning_activities`. Como a projeção usa `FORCE ROW LEVEL
SECURITY`, a consulta podia perder o contexto transacional do participante ou do
escopo e interromper início, resposta, submissão, feedback e contestação.

O mesmo parecer apontou dois riscos relacionados: a função participante não
verificava estado publicado/assignment ativo/membership aceito, e a constraint
permitia `session_id` sem `module_id`.

## 2. Correção TDD

- o teste `resolves activity scope only through a contextual transaction` foi
  escrito para falhar quando o executor raiz era usado;
- o resolver agora abre transação, estabelece `participantId` ou `scopeId` com
  `setDatabaseSecurityContext` e consulta pelo executor transacional;
- `apps/api/src/http.ts` exige contexto explícito em cada chamada do resolver,
  sempre derivado da identidade autenticada ou do escopo autorizado da rota;
- os casos de uso de tentativa e resposta já propagam `participantId` para a
  transação PostgreSQL, e o slice preserva essa fronteira.

## 3. Hardening de banco

A migration `0031_learning_activity_participant_rls_hardening.sql` substitui a
função participante para exigir simultaneamente:

- assignment da própria atividade e participante;
- status de assignment `DISPONIVEL`, `EM_ANDAMENTO` ou `EM_REFORCO`;
- atividade `PUBLISHED` e conta `ACTIVE`;
- convite com papel `PARTICIPANT`, escopo correspondente e `accepted_at` não
  nulo.

A mesma migration rejeita sessão sem módulo e mantém válidas atividades legadas
com ambos nulos. `schema.ts` e o journal Drizzle foram atualizados no mesmo
commit.

## 4. Evidência local

- commit técnico: `743b755b4a1143ed77f8e563fd1f79c9861d9b43`;
- 117 arquivos e 572 testes unitários passaram sob Node 22.22.0;
- `tsc -b`, ESLint, Prettier, `node --check`, `verify-migrations` (32/32) e
  `git diff --check` passaram;
- fixtures de `postgres-activity-content`, `postgres-adaptive-assignment` e
  `postgres-security-isolation` agora criam memberships sintéticos aceitos;
- o E2E real reconhece o fixture autoral e valida a proveniência
  `authoring-publication-v1`, mas não foi executado sem banco CVG descartável.

## 5. Evidência ausente e próxima ação

Não havia `CVG_TEST_DATABASE_URL` nem `CVG_REAL_E2E_DATABASE_URL`; o PostgreSQL
local disponível corresponde a outro schema e não foi alterado. Também não há
`pnpm` no `PATH`. Portanto, ainda falta aplicar a migration em banco descartável
autorizado, executar a suíte live com role `NOSUPERUSER/NOBYPASSRLS` e executar o
E2E navegador→web→API→PostgreSQL com a atividade criada pelo authoring.

O item permanece `COMPLETED_WITH_GAPS`. Workflow remoto same-SHA, grants/owners
produtivos, carga/failover, observabilidade/restore, provider/MFA e gates
clínicos continuam fora da evidência.
