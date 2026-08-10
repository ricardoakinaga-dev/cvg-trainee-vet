# 0502 — Auditoria da jornada mínima do participante

**Data:** 2026-08-10, America/Sao_Paulo  
**Item:** 9 — Jornada mínima do participante  
**Baseline:** 45/100  
**Nota reavaliada:** **95/100**  
**Escopo:** diagnóstico/trilha já persistidos, atividade atribuída, tentativa, workflow de resultado, runtime de remediação/retenção, próxima ação, autorização contextual e projeção web participante.

## 1. Decisão

O item 9 é **CONCLUÍDO COM GAPS** em 95/100 no escopo da jornada mínima implementada. A construção agora entrega uma leitura única e segura da jornada do participante sem permitir que a IA, o frontend ou o índice vetorial decidam nota, estado, gabarito, publicação ou competência prática.

Isso não equivale ao produto completo de 24 meses. Dashboard, autoria/revisão clínica em escala, prova somativa integral, contestação operacional completa, E2E navegador→API real, operação/restore e aprovação clínica continuam nos itens próprios e não autorizam release, piloto ou publicação.

## 2. Entrega verificável

| Camada | Implementação | Evidência |
|---|---|---|
| Contrato | `packages/contracts/src/journey.ts` agrega atribuições, atividades, resultados, runtimes e `nextAction`; schema é estrito e rejeita identidade/escopo internos e tentativa parcial. | `packages/contracts/src/journey.test.ts` |
| Aplicação | `getParticipantLearningJourney` normaliza escopos, valida identidade, clona sem mutação e prioriza remediação/retenção, atividade retomável, atribuição disponível e workflow pendente. | `packages/application/src/journey-use-cases.ts`; `journey-use-cases.test.ts` |
| Persistência | `createParticipantJourneyRepository` lê atividade/attempt mais recente, atribuições e workflows por contexto de escopo e runtime por participante/escopo, restaurando contexto antes de encerrar a transação. | `packages/persistence/src/journey-repository.ts`; `journey-repository.test.ts` |
| API | `GET /api/v1/learning-path` exige sessão ativa, papel participante, posse e escopo; devolve envelope público sem `participantId`/`scopeId`. | `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/api/src/http.test.ts` |
| Web | Após aceitar convite, a web consulta a jornada; em fluxo sem deep link escolhe a atividade da próxima ação e mostra a ação em linguagem operacional. Deep links continuam abrindo a atividade solicitada. | `apps/web/app/page.tsx`; `tests/e2e/participant-access.spec.ts` |
| Segurança | Consulta usa contexto PostgreSQL, RLS e limite compartilhado já auditados no item 8; o agregado filtra os escopos permitidos antes da projeção pública. | `0501_security_isolation_audit.md`; `postgres-security-isolation.test.ts` |

## 3. Regras de jornada materializadas

1. `EXECUTAR_REMEDIACAO`, `REVISAR_RETENCAO` e `AGUARDAR_CORRECAO_HUMANA` têm precedência sobre a atividade comum.
2. Tentativa `CRIADA`, `EM_ANDAMENTO` ou `SALVA` retorna `RETOMAR_ATIVIDADE`; submissão aguardando correção retorna `AGUARDAR_CORRECAO`; correção concluída retorna `REVISAR_PROXIMO_CONTEUDO`.
3. Atribuição `ATRIBUIDO`/`DISPONIVEL` retorna `INICIAR_ATIVIDADE` quando não existe ação prioritária.
4. Ausência de ação elegível retorna `CONSULTAR_PROXIMO_PASSO`.
5. A consulta pública não recebe gabarito, rubrica, fonte, documento, foto, prompt, ID de participante, ID de escopo ou declaração de competência prática.

## 4. Evidência executada

- RED registrado para contrato e caso de uso antes da implementação; GREEN passou nos testes direcionados.
- `pnpm test:coverage`: **70 arquivos passaram, 11 foram ignorados; 323 testes passaram, 11 foram ignorados**; statements 85,01%, branches 80,19%, functions 86,53%, lines 85,72%.
- `pnpm typecheck`: passou.
- `pnpm lint`: passou.
- `pnpm --filter @cvg/web build` e `pnpm test:e2e`: passaram; **6/6** cenários Chromium, incluindo carregamento da jornada sem `activityId`.
- Teste live PostgreSQL de isolamento/jornada: **1/1** passou com papel sintético `NOSUPERUSER NOBYPASSRLS`; houve leitura do agregado, tentativa mais recente, workflow, atribuição e runtime, e participante cruzado retornou vazio.
- `pnpm test:integration` com PostgreSQL/Qdrant locais: passou na rodada live de referência dos 15 arquivos/21 testes, com 1 skip de configuração; a prova específica do item 9 está incluída no teste de isolamento live.
- `pnpm build`, `pnpm audit --audit-level=high`, `pnpm verify:secrets`, `pnpm verify:exposure`, `git diff --check` e gates documentais: passaram na reexecução desta fase.

## 5. Nota

| Critério | Nota |
|---|---:|
| Contrato e redaction público | 20/20 |
| Orquestração de próxima ação | 19/20 |
| Persistência contextual e leitura mais recente | 20/20 |
| API, autorização e composição | 18/20 |
| Web e E2E sintético | 10/10 |
| Limites, rastreabilidade e operação | 8/10 |
| **Total** | **95/100** |

O desconto restante é deliberado: a jornada mínima não é ainda a jornada completa do PRD, o navegador não está conectado à API real no E2E, não há dashboard/fluxo operacional completo de autoria/contestação e os gates clínicos/operacionais permanecem independentes.

## 6. Rastreabilidade

`JOURNEY-09-01` → SPEC 0106, 0107, 0109, 0111, 0112, 0114 e 0118 → `journey-use-cases.ts` → `journey-repository.ts` → `GET /api/v1/learning-path` → `apps/web/app/page.tsx` → testes de contrato, aplicação, persistência, API, live e E2E → item 9 = 95.
