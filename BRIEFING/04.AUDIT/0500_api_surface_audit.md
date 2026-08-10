# 0500 — Auditoria da primeira fatia de API

**Data:** 2026-08-10, America/Sao_Paulo  
**Escopo:** item 7 do `0491_full_construction_audit.md` — contratos, rotas, autorização server-side, projeções públicas e integração dos estados persistidos no item 6.  
**Baseline:** 48/100.  
**Resultado:** **95/100 — concluído com gaps de escopo transferidos.**

## 1. Decisão

O item 7 pode ser encerrado em **95/100** no escopo da primeira fatia backend persistida e o item 8 pode ser aberto pela regra numérica. A API agora expõe criação/transição de atribuições, workflow de resultado, tickets e contestações, com schemas estritos, autorização server-side por papel/escopo, projeções redigidas e conversão pública de conflitos para HTTP 409.

Isso não declara o produto completo nem autoriza release/piloto/publicação clínica. Dashboard, trilha completa, filas editoriais, E2E navegador→API real, idempotência distribuída e operações de produção continuam pendentes nos itens próprios.

## 2. Entregas verificadas

| Área | Resultado | Evidência |
|---|---|---|
| Contratos de entrada | Schemas Zod strict para criação e transição; UUID, módulo, timestamp, enum, texto simples, contexto e versão são validados na borda. | `packages/contracts/src/learning-state.ts`; testes de contratos |
| Projeção pública | Respostas omitem `participantId`, `scopeId`, `reviewerId`, regra interna, autoria e campos editoriais; tickets/contestações continuam redigidos. | `participant*ProjectionSchema`; `apps/api/src/http.ts` |
| Atribuições | Criação interna e transição versionada com eventos de atribuir, disponibilizar, bloquear, pausar e retomada. | `/api/v1/internal/learning-assignments*` |
| Workflow de resultado | Criação interna e transição de disponibilização/revisão/correção/anulação. | `/api/v1/internal/assessment-workflows*` |
| Feedback | Participante abre ticket no escopo próprio; equipe autorizada faz transição com versão. | `/api/v1/feedback`; `/api/v1/internal/feedback/:ticketId` |
| Contestação | Participante abre contestação vinculada à tentativa própria; equipe/revisor autorizado transiciona. | `/api/v1/appeals`; `/api/v1/internal/appeals/:appealId/transition` |
| Autorização | Capacidades distintas para criar como participante e administrar/transicionar como staff; escopo é verificado no servidor. | `packages/application/src/authorization.ts`; testes de policy |
| Aplicação e persistência | Casos de uso não conhecem HTTP/SQL; composição conecta o port abstrato ao repositório PostgreSQL do item 6. | `learning-state-use-cases.ts`; `apps/api/src/main.ts` |
| Erros | Entrada inválida → 422, sem autenticação → 401, papel/escopo → 403, recurso ausente → 404, conflito de estado/versão → 409, falha interna → 500. | `apps/api/src/http.ts`; testes HTTP |

## 3. TDD e gates

O incremento seguiu RED → GREEN → REFACTOR:

1. o teste dos casos de uso começou vermelho por módulo ausente;
2. os casos de uso, contratos e policies foram implementados com portas abstratas;
3. testes HTTP foram adicionados para autorização, escopo, projeção, rotas de criação/transição e conflito 409;
4. `routeTemplate` foi atualizado para preservar telemetria por rota parametrizada;
5. a suíte global foi reexecutada após build, E2E e live.

| Verificação | Resultado |
|---|---|
| `pnpm test:coverage` | PASS; 65 arquivos, 299 testes, 10 skips de configuração |
| Cobertura | 85,11% statements; 80,15% branches; 87,02% functions; 85,81% lines |
| `pnpm lint` / `pnpm typecheck` | PASS |
| `pnpm build` | PASS nos 12 workspaces |
| `pnpm test:e2e` | PASS em 5/5 cenários Chromium sintéticos |
| Integração PostgreSQL/Qdrant live | PASS em 15 arquivos/21 testes, sem skips |
| `pnpm audit --audit-level=high` | PASS; nenhuma vulnerabilidade conhecida |
| `pnpm verify:traceability` / documentação | PASS |
| `git diff --check` | PASS |

O E2E continua com API interceptada, como já registrado no relatório principal; a evidência live prova o repositório e as migrations, não o caminho navegador→API real.

## 4. Nota detalhada

| Dimensão | Nota | Justificativa |
|---|---:|---|
| Contratos, validação e projeções | 20/20 | Entrada estrita e resposta pública redigida com testes positivos/negativos. |
| Rotas e composição dos casos de uso | 24/25 | Oito operações da primeira fatia foram ligadas ao port abstrato e à composição PostgreSQL; listas/queries do produto completo ficam em outras fases. |
| Autorização, papéis e escopo | 20/20 | Capacidades separadas, deny-by-default e escopo validado server-side antes do caso de uso. |
| Versionamento e erros | 16/18 | Conflito otimista e estado inválido chegam como 409; idempotência distribuída e replay durável dessas novas criações ainda não estão fechados. |
| Testes e evidência | 10/12 | HTTP, aplicação, contratos, build, live e E2E sintético passaram; navegador→API real continua pendente. |
| Compatibilidade e segurança da exposição | 5/5 | Envelopes, campos proibidos, request ID, sem detalhes de infraestrutura e route template preservados. |
| **Total** | **95/100** | Fechado no escopo da primeira fatia backend persistida. |

## 5. Limites transferidos

- dashboard, learning path, módulos completos, correções/filas, GET paginado de feedback e operações editoriais permanecem no produto completo;
- E2E navegador→API/PostgreSQL/Qdrant reais e CI com dependências permanecem no item 14/15;
- idempotência durável e rate limit distribuído para as novas criações permanecem nos itens de segurança/operabilidade;
- RLS do domínio legado e usuário de conexão de produção sem privilégio amplo permanecem no item 8;
- autoria clínica, revisão, gabarito e publicação continuam bloqueados pelo gate humano do item 3;
- commit rastreável de release permanece no item 16.

## 6. Próxima ação

Abrir o item 8 — segurança, identidade, autorização e privacidade — com baseline 78/100, priorizando RLS do domínio legado, hardening do usuário de conexão, recuperação/rotação, rate limit e isolamento live abrangente.
