# Auditoria JOURNEY-REL-002 — sincronização bounded assignment → atividade

**Data:** 2026-08-24

**Escopo:** coerência posterior do status entre `learning_assignments` e
`activity_assignments` explicitamente vinculados

**Classificação:** PASS LOCAL WITH GAPS

**Não é:** prova live de RLS, aprovação clínica, publicação, aplicação real do
B-07 ou declaração de competência prática

## 1. Resultado executivo

Depois da materialização adaptativa, uma transição otimista de
`learning_assignments` agora atualiza `activity_assignments.status` na mesma
transação, mas somente quando `learning_assignment_id` identifica a relação,
o participante e o escopo pertencem ao contexto transacional e a atividade
continua `PUBLISHED`. `NAO_ATRIBUIDO` não é projetado; vínculos legados sem
provenance e atividades `WITHDRAWN` ficam intocados.

Uma falha na atualização da relação permanece dentro da transação de
`saveLearningAssignment`; portanto, a alteração da atribuição não é confirmada
sem a sincronização correspondente. Essa propriedade ainda precisa de
confirmação em PostgreSQL com papel sem `SUPERUSER/BYPASSRLS`.

Para não rebaixar progresso concorrente, a escrita aceita somente o próprio
status ou estados predecessores permitidos pela máquina de atribuição. Uma
atividade já `EM_ANDAMENTO`, por exemplo, não volta para `DISPONIVEL` quando a
atribuição recebe uma transição atrasada.

## 2. Evidência implementada

| Camada | Evidência | Resultado |
|---|---|---|
| Persistência | `learning-state-repository.ts` consulta IDs de atividades publicadas no mesmo escopo e atualiza apenas participante + `learning_assignment_id` + estados predecessores permitidos | allowlist bounded sem downgrade |
| Transação | `syncBoundActivityAssignmentStatus` é chamado dentro de `withContext` após a escrita/versionamento da atribuição | falha aborta a transação |
| Legado | `learning_assignment_id` nulo não satisfaz o predicado | status legado preservado |
| Retirada | o conjunto de IDs elegíveis contém somente `PUBLISHED` | atividade retirada não é reativada nem atualizada |
| RLS | a migration `0026_assignment_activity_provenance.sql` já exige contexto, participante, escopo, atividade publicada e correspondência módulo–assignment no `UPDATE` | defesa server-side/database |

## 3. TDD e verificações

- RED focal: o teste de transição não observou atualização do vínculo explícito
  antes da implementação; a crítica independente também reproduziu o risco de
  downgrade de atividade já avançada.
- GREEN focal: `packages/persistence/src/learning-state-repository.test.ts`
  passou 8/8, incluindo a sincronização de status.
- Foi adicionado um cenário PostgreSQL condicional que cobre vínculo explícito
  publicado, atividade retirada e linha legada sem provenance;
  `CVG_TEST_DATABASE_URL` ausente mantém o cenário skipped, sem PASS inferido.
- `pnpm verify` passou com 125 arquivos/575 testes, 31 skips, cobertura
  84,50% statements/80,35% branches/85,95% functions/85,23% lines; contracts
  72/72, worker 25/25, migrations 27/27 e gates estáticos/documentais verdes.
- `pnpm build` passou nos 12 workspaces; `pnpm test:e2e` passou 26/26; a
  integração configurada passou 8/20 testes com 27/31 skips; `git diff --check`
  passou.

## 4. Limites e próxima ação

Ainda não há evidência live para RLS sem bypass, rollback provocado por falha
de policy, concorrência de duas transições, grants/owners produtivos,
observabilidade, carga, failover ou restore. O pipeline autoral que persiste
`moduleId`, E2E navegador→API→PostgreSQL curricular, revisão clínica, piloto,
provider/MFA e assurance operacional também permanecem pendentes.

Próxima ação: executar o cenário live com role da aplicação
`NOSUPERUSER/NOBYPASSRLS`, cleanup administrativo separado e uma falha de
sincronização observável quando o ambiente autorizado existir. Até lá,
`JOURNEY-REL-002` permanece `COMPLETED_WITH_GAPS`.
