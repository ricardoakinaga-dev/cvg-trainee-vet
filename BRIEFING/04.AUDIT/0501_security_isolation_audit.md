# 0501 — Auditoria de isolamento, menor privilégio e proteção de requisições

**Data:** 2026-08-10, America/Sao_Paulo  
**Escopo:** item 8 do `0491_full_construction_audit.md` — Segurança, identidade, autorização e privacidade.  
**Baseline:** 78/100.  
**Resultado:** **95/100 — CONCLUÍDO COM GAPS OPERACIONAIS**.

## 1. Decisão

O item 8 foi reavaliado em **95/100**. A construção pode avançar para o item 9 pela regra numérica da meta. Este resultado não autoriza release, piloto, publicação clínica ou uso de dados reais: aprovação de conteúdo, jornada completa, E2E navegador→API real, backup/restore e operação de produção continuam nos itens próprios.

## 2. Entregas verificadas

### 2.1 Contexto transacional e RLS

- `setDatabaseSecurityContext` grava `cvg.participant_id` e `cvg.scope_id` com `set_config(..., true)` dentro da transação;
- repositórios de atividade, progresso, runtime curricular, respostas, tentativas e correção aplicam o contexto antes de ler ou alterar dados protegidos;
- a migração `0012_secure_participant_rls.sql` habilita e força RLS nas tabelas legadas participantes e nos caminhos de tentativa/resultado/idempotência cobertos;
- políticas sem contexto negam acesso; o contexto de participante limita por participante e o contexto de escopo limita a leitura/alteração operacional autorizada;
- o contexto é fornecido pela aplicação, mas a policy no PostgreSQL é a defesa adicional e não depende de um `scope_id` confiado pelo navegador.

### 2.2 Menor privilégio

- `createPostgresDatabase({ requireLeastPrivilege: true })` verifica `pg_roles` no `healthcheck` e falha fechado para `rolsuper` ou `rolbypassrls`;
- produção habilita essa exigência pela configuração de runtime;
- a integração live cria um papel sintético `NOSUPERUSER NOBYPASSRLS`, concede somente os privilégios do cenário e confirma a operação; a prova com a conexão administrativa é rejeitada pelo guard;
- o teste remove o papel sintético e seus dados ao final; nenhuma role `cvg_rls_*` permanece no banco local.

### 2.3 Rate limit compartilhado

- `0013_shared_rate_limit.sql` cria `rate_limit_buckets` com chave, janela, contador, expiração, constraints e revogação de privilégios públicos;
- `createPostgresRateLimiter` executa limpeza e upsert dentro de transação PostgreSQL, permitindo que duas instâncias compartilhem a mesma janela;
- `apps/api` usa o limitador PostgreSQL compartilhado quando composto pela aplicação, preservando o limitador local apenas como fallback/test harness;
- o teste live comprova duas instâncias consumindo a mesma chave: duas requisições permitidas e a terceira bloqueada com `remaining=0`.

### 2.4 Identidade e borda HTTP

- rotação/revogação de sessão, convite hash-only, CSRF, origem/referer e respostas uniformes já possuíam testes e permanecem ativos;
- nenhum token, segredo, fonte, PDF, foto, prontuário, tutor ou conteúdo clínico real foi incluído no código, fixture, log ou evidência;
- o rate limit não é aplicado a liveness/readiness, evitando bloquear diagnóstico operacional.

## 3. Evidência executada

| Verificação | Resultado |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test:coverage` | PASS — 67 arquivos, 309 testes, 11 skips; 84,81% statements, 80,03% branches, 86,69% functions, 85,48% lines |
| `pnpm build` | PASS — 12 workspaces |
| `pnpm test:e2e` | PASS — 5/5 cenários sintéticos; API interceptada |
| integração PostgreSQL/Qdrant live | PASS — 15 arquivos, 21 testes, 1 skip de configuração |
| teste live de isolamento | PASS — participante próprio, participante cruzado, escopo próprio, escopo cruzado, contexto vazio, menor privilégio e rate limit compartilhado |
| `pnpm db:migrate` | PASS — migrations 0012 e 0013 aplicadas no banco local descartável |
| `pnpm audit --audit-level=high` | PASS — nenhuma vulnerabilidade conhecida |
| `pnpm verify:secrets` | PASS |
| `git diff --check` | PASS |

O RED inicial do contexto de segurança falhou pela ausência do módulo esperado; a implementação mínima foi adicionada e os testes passaram em GREEN. Os doubles unitários antigos que não modelavam `transaction()` foram atualizados para a nova fronteira transacional, preservando a exigência de contexto no código de produção.

## 4. Nota detalhada

| Dimensão | Nota | Justificativa |
|---|---:|---|
| RLS contextual e isolamento de participante/escopo | 28/30 | Policies, `ENABLE/FORCE`, contexto transacional e acesso cruzado negativo live nas tabelas protegidas da fatia legada. |
| Menor privilégio e deny-by-default | 20/20 | Guard de role, papel live sem `SUPERUSER`/`BYPASSRLS`, grants restritos e contexto vazio negado. |
| Sessão, convite, rotação e revogação | 15/15 | Fluxos server-side hash-only, expiração/revogação e rotação permanecem cobertos. |
| CSRF, origem e rate limit distribuído | 15/15 | Borda HTTP e bucket PostgreSQL compartilhado testados; rate local permanece fallback controlado. |
| Redaction, testes e evidência | 12/12 | Campos internos/segredos não são expostos; cobertura, live, build, audit e diff passaram. |
| Operação de produção e rollout | 5/8 | Grants do usuário de aplicação, backup/restore, múltiplas réplicas em ambiente de produção e runbook ainda precisam ser executados fora do banco local. |
| **Total** | **95/100** | **Concluído com gaps operacionais**. |

## 5. Limites transferidos

- a política não é uma afirmação de que todas as tabelas editoriais, administrativas e de auditoria do produto completo já tenham RLS específico;
- provisionamento do usuário de aplicação, rotação de credenciais e restore em homologação/produção ainda exigem execução operacional;
- o E2E continua com API interceptada, sem prova navegador→API→PostgreSQL real;
- o item 9 ainda precisa fechar a jornada vertical do participante, inclusive resultado, remediação e retomada;
- o gate clínico de publicação continua independente e exige revisão e aprovação de Ricardo.

## 6. Rastreabilidade

- SPEC: `0111_permissoes_governanca_e_auditoria.md`, `0112_integracoes.md`, `0113_observabilidade_runtime_e_operacao.md`, `0118_estrategia_de_testes_rastreabilidade_e_verificacao.md`;
- migrações: `packages/persistence/drizzle/0012_secure_participant_rls.sql`, `packages/persistence/drizzle/0013_shared_rate_limit.sql`;
- código: `packages/persistence/src/security-context.ts`, `database.ts`, `rate-limit-repository.ts`, repositórios protegidos, `packages/application/src/transaction-context.ts`, `apps/api/src/request-security.ts`, `server.ts`, `main.ts`;
- testes: `packages/persistence/src/security-context.test.ts`, `rate-limit-repository.test.ts`, `apps/api/src/request-security.test.ts`, `apps/api/src/server.test.ts`, `tests/integration/postgres-security-isolation.test.ts`;
- auditoria principal: item 8 do `0491`; roadmap `0492`; backlog `0493`; manifesto `traceability.yml`.

