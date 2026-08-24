# Auditoria ACTIVITY-RLS-047 — contexto RLS da jornada participante

**Data:** 2026-08-24

**Escopo:** resolvedor de escopo da atividade, preflight HTTP de tentativa,
política participante da projeção curricular e fixtures PostgreSQL sintéticos.

**Classificação:** CORRIGIDO LOCALMENTE COM EVIDÊNCIA UNITÁRIA E CONTRATO
ESTÁTICO; LIVE PENDENTE POR AMBIENTE.

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
- estado de assignment elegível para leitura da projeção;
- atividade `PUBLISHED` e conta `ACTIVE`;
- convite com papel `PARTICIPANT`, escopo correspondente e `accepted_at` não
  nulo.

A mesma migration rejeita sessão sem módulo e mantém válidas atividades legadas
com ambos nulos. A crítica de compatibilidade identificou que a jornada já
expõe `ATRIBUIDO` e estados históricos/terminais; restringir a função comum aos
três estados iniciáveis faria o teste live de jornada adaptativa perder a
atividade antes de calcular `INICIAR_ATIVIDADE`. Por isso, a migration
incremental `0032_learning_activity_journey_visibility.sql` mantém todos os
estados persistidos da atividade na função de metadados e cria a função separada
de conteúdo, que continua limitada a `DISPONIVEL`, `EM_ANDAMENTO` e
`EM_REFORCO`. A policy de `learning_activity_items` usa a função de conteúdo.
`schema.ts` e o journal Drizzle permanecem alinhados.

## 4. Evidência local

- commits técnicos: `743b755b4a1143ed77f8e563fd1f79c9861d9b43` e
  `b85b059`;
- 117 arquivos e 572 testes unitários passaram sob Node 22.22.0;
- contrato RLS estático passou 2/2; integração sem banco passou 23/56 (33
  cenários corretamente pulados); `tsc -b`, ESLint, Prettier,
  `verify-migrations` (33/33) e `git diff --check` passaram;
- fixtures de `postgres-activity-content`, `postgres-adaptive-assignment` e
  `postgres-security-isolation` agora criam memberships sintéticos aceitos;
- o E2E real reconhece o fixture autoral e valida a proveniência
  `authoring-publication-v1`, mas não foi executado sem banco CVG descartável.

## 5. Evidência ausente e próxima ação

Não havia `CVG_TEST_DATABASE_URL` nem `CVG_REAL_E2E_DATABASE_URL`; o PostgreSQL
local disponível corresponde a outro schema e não foi alterado. Também não há
`pnpm` no `PATH`. Portanto, ainda falta aplicar as migrations `0031` e `0032` em
banco descartável autorizado, executar a suíte live com role
`NOSUPERUSER/NOBYPASSRLS` e executar o E2E navegador→web→API→PostgreSQL com a
atividade criada pelo authoring.

O item permanece `COMPLETED_WITH_GAPS`. Workflow remoto same-SHA, grants/owners
produtivos, carga/failover, observabilidade/restore, provider/MFA e gates
clínicos continuam fora da evidência.
