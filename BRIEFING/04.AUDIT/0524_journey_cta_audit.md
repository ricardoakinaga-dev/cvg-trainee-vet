# Auditoria JOURNEY-045 — CTA da próxima atividade na jornada participante

**Data:** 2026-08-24
**Escopo:** projeção autorizada `GET /api/v1/learning-path` → alvo
`nextActionTarget` server-side → CTA client-side → leitura da atividade com
sessão preservada.
**Resultado:** **PASS LOCAL COM GAPS DE PRODUTO E AMBIENTE**.

Esta auditoria fecha somente a ação da próxima atividade já presente na
projeção da jornada. Ela não afirma que cada `learning_assignment` já possui
uma atividade publicada correspondente, não cria essa relação, não publica
conteúdo clínico e não transforma o deep link em autorização.

## 1. Regra materializada

O caso de uso da jornada calcula `nextAction` no servidor e, somente quando a
primeira ação elegível é `INICIAR_ATIVIDADE` ou `RETOMAR_ATIVIDADE`, retorna:

```json
{ "kind": "ACTIVITY", "activityId": "<atividade-da-projecao>" }
```

O contrato é strict e confirma que o alvo pertence à lista `activities`. Para
ações de runtime, correção, retenção, consulta ou assignment sem atividade, o
alvo fica ausente e a web não inventa uma CTA.

Na web, a CTA:

1. só é renderizada para o alvo server-side;
2. confere novamente que o identificador recebido continua sendo o alvo da
   jornada carregada;
3. reutiliza `loadActivity` e a restauração de tentativa/appeal;
4. codifica o identificador no `?activityId` via `URLSearchParams` e usa
   `history.replaceState`, sem recarregar ou perder a sessão;
5. mantém busy/erro públicos e não envia `participantId` ou `scopeId`.

## 2. Evidência de implementação

| Camada | Evidência | Resultado |
|---|---|---|
| Aplicação | `packages/application/src/journey-use-cases.ts` | alvo determinístico, prioridade server-side e ausência segura quando a prioridade não é atividade |
| Contratos | `packages/contracts/src/journey.ts` | `nextActionTarget` opcional, UUID, `kind` allowlisted, relação com atividade e rejeição de campos internos |
| API | `apps/api/src/http.ts` | projeção pública copia somente o alvo allowlisted; não há novo endpoint nem identidade do cliente |
| Web | `apps/web/app/page.tsx`, `apps/web/app/globals.css` | CTA acessível, seleção local, deep link codificado, tentativa preservada e erro bounded |
| Testes | aplicação, contrato, HTTP e Playwright | RED observado antes da CTA; GREEN focal e regressão completa |
| Manifesto | `traceability.yml` / `JOURNEY-045` | requisito → SPEC → código → teste → commit → artefato |

## 3. Verificação executada

| Verificação | Evidência observada |
|---|---|
| RED | o cenário E2E falhou antes da implementação ao não encontrar `Abrir atividade: Internação` |
| Foco unitário/contrato/API | 3 arquivos, 75 testes passaram |
| Cobertura | 125 arquivos; 572 testes passaram, 29 ficaram skipped; 84,51% statements, 80,33% branches, 86,03% functions, 85,23% lines |
| TypeScript/lint/formatação | `pnpm typecheck`, `pnpm lint` e `pnpm format:check` passaram |
| Build | `pnpm build`: 12 workspaces passaram |
| Contratos/worker/migrations | `test:contract`: 26 arquivos/72 testes; `test:worker`: 4 arquivos/25 testes; migrations 26/26 |
| Integração configurada | `pnpm test:integration`: 8 arquivos/20 testes passaram; 27 arquivos/29 testes ficaram skipped |
| E2E focal | cenário de CTA passou; sessão preservada, atividade carregada e URL atualizada |
| E2E completo | `pnpm exec playwright test`: 24/24 cenários passaram |
| Gaps live | `CVG_TEST_DATABASE_URL` não está configurado; nenhum PASS live é declarado |
| Gates | traceability, documentation, product-definition, exposure, secrets e architecture passaram; `git diff --check` passou |

## 4. Controles de segurança e experiência

- a web não escolhe novamente a próxima ação percorrendo atividades;
- o alvo só pode apontar para uma atividade da própria projeção pública;
- o handler rejeita seleção fora do alvo autorizado e falha com mensagem
  pública genérica;
- `activityId` é codificado antes de compor o request e o histórico do
  navegador;
- a leitura continua no endpoint participante autenticado, com autorização e
  RLS server-side existentes;
- o contrato não adiciona `participantId`, `scopeId`, `moduleId` interno,
  `href` arbitrário, gabarito, fonte ou conteúdo editorial;
- o botão não substitui a ação quando o servidor informa runtime/correção/
  retenção/consulta como prioridade;
- a tela mantém os avisos de que evidência digital não comprova competência
  prática nem autoriza procedimento.

## 5. Gaps e próxima ação

Este incremento não fecha:

- a correspondência real entre `learning_assignments.moduleId` e uma
  atividade/sessão publicada em `activity_assignments`;
- a prova end-to-end PostgreSQL/RLS de diagnóstico → assignment → atividade →
  `nextActionTarget`, concorrência e papel sem `BYPASSRLS`;
- proveniência persistida da atribuição, auditoria de sucesso e atomicidade
  entre salvar diagnóstico e materializar assignments;
- feedback/debrief da correção digital, remediação e retenção completas;
- autoria, revisão clínica, publicação e aplicação real do B-07;
- grants/owners produtivos, observabilidade externa, carga, failover,
  restore, provider/MFA, piloto e release.

Próxima fatia bounded: `RESULT-FEEDBACK-046`, exibir na atividade o feedback
digital já persistido e seu estado/next action, sem gerar gabarito, decisão
clínica, competência prática ou novo canal de autorização. O item fica
`COMPLETED_WITH_GAPS`; não é release nem 100% do produto.
