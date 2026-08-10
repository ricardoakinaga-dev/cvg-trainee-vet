# 0499 — Auditoria de persistência e integridade transacional

**Data:** 2026-08-10, America/Sao_Paulo  
**Escopo:** item 6 do relatório `0491_full_construction_audit.md` — persistência, migrações, integridade transacional, versionamento otimista e isolamento contextual das entidades de aprendizagem.  
**Baseline:** 76/100.  
**Resultado:** **95/100 — concluído com gaps de escopo transferidos.**

## 1. Decisão

O item 6 pode ser encerrado em **95/100** e o item 7 pode ser aberto pela regra numérica da meta. A construção agora materializa as regras persistidas do item 5 em PostgreSQL com migrações versionadas, chaves estrangeiras, unicidade, constraints de estado, versionamento otimista, transações locais e RLS contextual. A evidência foi obtida com dados sintéticos e descartáveis; não houve conteúdo clínico, prontuário, tutor, foto, PDF ou dado identificável.

O score é técnico e limitado ao escopo desta fase. Não autoriza release, piloto, publicação clínica ou declaração de competência prática.

## 2. Entregas verificadas

| Área | Resultado | Evidência |
|---|---|---|
| Estados de aprendizagem | Quatro tabelas persistem atribuição, workflow de resultado, ticket e contestação, mantendo `participant_id`, `scope_id`, estado e versão. | `packages/persistence/src/schema.ts`; `learning-state-repository.ts` |
| Integridade relacional | FKs para contas/tentativas, índices por participante/escopo/status, unicidade por módulo e contestação aberta, e limites de módulo/status/texto. | `0010_classy_kronos.sql`; `0011_daffy_nova.sql` |
| Consistência semântica | Constraints condicionais exigem `block_reason`, `paused_from` e decisão quando o estado requer; a migração 0011 corrige explicitamente a semântica SQL de `NULL` da primeira versão. | migration 0011; `postgres-learning-state.test.ts` |
| Versionamento | Criação em versão 0, atualização somente se a versão anterior coincidir, leitura de retorno e erro explícito de conflito. | `createLearningStateRepository`; testes unitários/live |
| Contexto de banco | Cada operação abre transação e configura `cvg.participant_id`/`cvg.scope_id` com `set_config(..., true)` antes de ler ou gravar. | `withContext` em `learning-state-repository.ts` |
| Defesa em profundidade | As quatro tabelas têm `ENABLE/FORCE ROW LEVEL SECURITY` e policy `USING/WITH CHECK` por participante e escopo. | `0010_classy_kronos.sql`; papel live `NOSUPERUSER NOBYPASSRLS` |
| Atomicidade/rollback | Uma transação sintética lançada no meio não deixou linha persistida; FK, constraint inválida e conflito foram rejeitados. | `tests/integration/postgres-learning-state.test.ts` |

## 3. TDD e evidência executada

O ciclo foi RED → GREEN → REFACTOR:

1. O teste do repositório falhou inicialmente por módulo ausente.
2. O mapper/repositório mínimo foi implementado e os caminhos de criação, transição, leitura, conflito e validação passaram.
3. O teste PostgreSQL inicialmente revelou que `CHECK` com expressão `NULL` poderia passar; as constraints foram corrigidas na migration 0011, seguida de aplicação limpa e reexecução live.

Gates finais:

| Verificação | Resultado |
|---|---|
| `pnpm verify` | PASS; 64 arquivos, 289 testes, 10 skips de configuração; 85,23% statements, 80,05% branches, 87,48% functions, 85,87% lines |
| `pnpm build` | PASS nos 12 workspaces |
| `pnpm test:e2e` | PASS em 5/5 cenários Chromium sintéticos |
| `CVG_RUN_LIVE_DB_TESTS=true CVG_RUN_LIVE_QDRANT_TESTS=true pnpm test:integration` | PASS em 15/15 arquivos e 21/21 testes, sem skips |
| `pnpm db:migrate` | PASS com as migrations 0010 e 0011 aplicadas no PostgreSQL local |
| `pnpm audit --audit-level=high` | PASS; nenhuma vulnerabilidade conhecida |
| `pnpm verify:traceability` | PASS |
| `git diff --check` | PASS |

O teste live criou um papel temporário sem `SUPERUSER` e sem `BYPASSRLS`, concedeu somente privilégios nas quatro tabelas, verificou leitura vazia sem contexto e em contexto cruzado e confirmou `relrowsecurity=true`/`relforcerowsecurity=true`. O papel, as contas sintéticas e as linhas de teste foram removidos ao final.

## 4. Nota detalhada

| Dimensão | Nota | Justificativa |
|---|---:|---|
| Modelo e mapeamento de estados | 22/22 | As quatro entidades ligam domínio, contexto e linha persistida com validação de entrada/saída. |
| Migrações, FKs, índices e constraints | 24/25 | A estrutura é aditiva, versionada e aplicada; o desconto preserva a necessidade de ampliar o modelo completo do PRD em fases posteriores. |
| Transação, rollback e concorrência | 20/20 | `set_config` transacional, criação, atualização condicional, conflito otimista e rollback foram exercitados. |
| RLS contextual do escopo entregue | 18/18 | As quatro tabelas novas têm `FORCE RLS`, policies de leitura/escrita e prova com papel sem bypass. |
| Operação, rastreabilidade e limites | 11/15 | Migração/repositório/testes/traceability estão ligados; backup/restore, retenção/anonimização e RLS das tabelas legadas continuam em itens próprios. |
| **Total** | **95/100** | Fechado no escopo do item 6, com gaps explicitamente transferidos. |

## 5. Limites que permanecem abertos

- o papel `cvg` observado no container local é superusuário/bypass de RLS; a prova de policy foi feita com papel temporário sem esses privilégios, mas o contrato de produção ainda deve exigir usuário de conexão sem privilégio amplo;
- tabelas de negócio legadas, como tentativas, atividades e estado curricular já existente, ainda precisam do hardening contextual completo previsto no item 8;
- retenção, anonimização, backup/restore, RPO/RTO e recuperação operacional permanecem nos itens 8 e 12;
- as novas rotas e telas de atribuição, resultado, ticket e contestação permanecem no item 7 e nos itens de jornada/web;
- o working tree ainda não representa um commit de release rastreado; esse fechamento permanece no item 16.

## 6. Próxima ação

Abrir o item 7 — API e superfície funcional backend — com baseline 48/100, escrevendo RED para contratos/rotas/autoridade server-side das entidades já persistidas. Não antecipar autoria clínica, publicação, restore ou superfícies posteriores sem atualizar o estado e o backlog.
