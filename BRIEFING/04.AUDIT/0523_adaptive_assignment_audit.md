# Auditoria ADAPTIVE-044 — atribuição adaptativa derivada do diagnóstico

**Data:** 2026-08-24  
**Escopo:** diagnóstico B-07 sintético persistido → atribuições iniciais de
`learning_assignments` → leitura agregada da jornada.  
**Resultado:** **PASS LOCAL COM GAPS DE AMBIENTE E PRODUTO**.

Esta auditoria fecha somente a transição técnica autorizada por
`ADAPTIVE-044`. Ela não publica o B-07, não aplica o diagnóstico a pessoas
reais, não dispensa módulo obrigatório, não declara competência prática e não
substitui revisão clínica de Ricardo.

## 1. Decisão e regra materializada

O caso de uso recebe somente `{ diagnosticResultId, scopeId }`. O servidor:

1. reidrata o resultado pelo identificador e pelo escopo;
2. valida que o agregado é o B-07 formativo seguro (`0.1.0`, não punitivo e
   sem pass/fail global);
3. combina o núcleo obrigatório da onda piloto (`M01`, `M02`, `M11`) com
   `recommendedModuleIds`, remove duplicidades e ordena pelo catálogo V3;
4. passa apenas resultado/escopo/módulos ao adapter de atribuição;
5. deriva `participantId` e `availableAt` da linha `diagnostic_results` dentro
   da transação PostgreSQL;
6. cria `ATRIBUIDO` por meio da máquina de estados de domínio, preserva linhas
   existentes e usa a unicidade participante–escopo–módulo para replay seguro;
7. retorna uma projeção allowlisted, sem `participantId`, gabarito, nota,
   rubrica, fonte, objetivo interno ou claim clínico.

O endpoint interno é
`POST /api/v1/internal/diagnostics/:diagnosticResultId/assign`; o corpo aceita
somente `scopeId`, exige autenticação/capability
`MANAGE_LEARNING_ASSIGNMENTS` e mantém erros uniformes de autenticação,
autorização, validação, ausência e conflito.

## 2. Evidência de implementação

| Camada | Evidência | Resultado |
|---|---|---|
| Aplicação | `packages/application/src/adaptive-assignment-use-cases.ts` | reidratação, allowlist, ordenação, flags de segurança e normalização de erros |
| Domínio/persistência | `packages/persistence/src/adaptive-assignment-repository.ts` | transação, contexto RLS, identidade/data server-side, CAS para promoção e replay |
| Diagnóstico | `packages/persistence/src/diagnostic-result-repository.ts` | leitura por `resultId + scopeId` sob contexto de escopo |
| Contratos | `packages/contracts/src/learning-state.ts` | request strict sem identidade do participante e projeção pública bounded |
| API/composição | `apps/api/src/http.ts`, `apps/api/src/main.ts`, `apps/api/src/server.ts` | rota interna, capability, resposta redigida e wiring PostgreSQL |
| Testes | testes unitários, HTTP, contrato, persistência e integração live | RED/GREEN local; live fica explicitamente separado |
| Manifesto | `traceability.yml` / `ADAPTIVE-044` | requisito → SPEC → código → teste → commit → artefato |

Não foi criada migration: o índice único e as policies existentes de
`learning_assignments` já suportam a operação. PostgreSQL continua a fonte de
verdade; Qdrant e IA não participam da decisão ou da mutação.

## 3. Verificação executada

| Verificação | Evidência observada |
|---|---|
| RED | teste de aplicação inicialmente falhou por módulo de caso de uso ausente |
| Foco unitário/API | 5 arquivos, 86 testes passaram após a implementação |
| Cobertura | 125 arquivos; 570 testes passaram, 29 ficaram skipped por configuração; 84,49% statements, 80,31% branches, 85,98% functions, 85,22% lines |
| TypeScript/lint/formatação | `pnpm typecheck`, `pnpm lint` e `pnpm format:check` passaram |
| Build | `pnpm build`: 12 workspaces passaram |
| Contratos/worker/migrations | gates locais passaram: 70/70 contratos, 25/25 worker, 26/26 migrations |
| Integração configurada | `pnpm test:integration`: 8 arquivos/20 testes passaram; 27 arquivos/29 testes ficaram skipped |
| Integração ADAPTIVE live | não executada: `CVG_TEST_DATABASE_URL`/configuração live ausente; o teste permanece `skip`, não é contado como PASS |
| E2E | `pnpm test:e2e`: 23/23 cenários passaram |
| Exposição/segredos/traceability/documentação | gates locais passaram sem payload interno na projeção |
| Diff hygiene | `git diff --check` passou nesta rodada |

## 4. Controles de segurança e invariantes

- `participantId` não existe no novo comando, schema HTTP ou chamada de
  composição;
- resultado inexistente ou fora do escopo não revela a existência da linha;
- participante não possui capability para a rota interna;
- UUID de rota e corpo estrito são validados antes da mutação;
- o núcleo obrigatório não pode ser removido por recomendação vazia ou
  parcial;
- replay sequencial retorna os mesmos IDs e não cria segunda linha;
- `NAO_ATRIBUIDO` só avança por `transitionLearningAssignment(...,
  {type:"ATRIBUIR"})` e CAS de versão;
- contexto de escopo é aplicado antes da leitura do diagnóstico e contexto de
  participante+escopo antes da leitura/escrita das atribuições;
- a saída não serializa identidade do participante nem dados editoriais;
- falha de atribuição não altera nota, diagnóstico, publicação, runtime,
  competência prática ou autonomia clínica.

## 5. Gaps e próxima ação

Este incremento não fecha:

- prova PostgreSQL/RLS live, concorrência real e restauração operacional;
- CTA/deep link de cada módulo na UI participante;
- feedback/debrief/remediação e retenção completos após a atribuição;
- autoria, revisão clínica, publicação e aplicação real do B-07;
- provider/MFA, grants/owners produtivos, observabilidade externa, carga,
  failover e deploy/rollback.

Próxima fatia recomendada: ligar a atribuição persistida a uma ação de módulo
na jornada participante e fechar o ciclo de feedback/debrief, mantendo os
gates clínicos e live como dependências explícitas. O incremento fica
`COMPLETED_WITH_GAPS`, não como release ou 100% do produto.
