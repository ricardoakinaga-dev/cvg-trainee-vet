# Auditoria RESULT-FEEDBACK-046 — feedback digital na superfície do participante

**Data:** 2026-08-24  
**Escopo:** tentativa restaurada/submetida → `GET
/api/v1/attempts/:attemptId/feedback` → projeção web pública de resultado,
feedback, próxima ação e espera bounded.  
**Resultado:** **PASS LOCAL COM GAPS DE PRODUTO E AMBIENTE**.

Esta auditoria fecha somente a leitura de uma correção digital já persistida e
o estado público quando o resultado ainda não está disponível. Ela não cria
correção, nota, gabarito, decisão de contestação, competência prática ou
autorização clínica.

## 1. Regra materializada

Depois de aceitar o convite e carregar a jornada, a web restaura a tentativa
autorizada. Para tentativas corrigidas, consulta o endpoint participante já
existente e mostra somente:

- status público da correção, score, outcome e feedback textual plain text;
- a `nextAction` já calculada pelo servidor para a atividade/jornada;
- disclaimer de evidência digital formativa, sem competência prática ou
  autorização de procedimento;
- estado de carregamento, indisponibilidade (`not_found`), erro e retry.

Para `SUBMETIDA` ou `AGUARDA_CORRECAO_HUMANA`, a ausência de resultado vira
“A correção digital ainda não está disponível.”. O navegador não calcula nota,
não recebe identidade do corretor, regra, gabarito, fonte ou identificador
interno.

## 2. Evidência de implementação

| Camada | Evidência | Resultado |
|---|---|---|
| API existente | `apps/api/src/http.ts`, `packages/application/src/feedback-use-cases.ts` | owner-scoped, RLS contextual e projeção redigida já existente; nenhum endpoint novo |
| Contrato público | `packages/contracts/src/correction.ts` | schema strict com status, versões, score, outcome e feedback plain text |
| Web | `apps/web/app/page.tsx`, `apps/web/app/globals.css` | parser allowlisted, estado separado de correção, cartão público, espera, erro e retry |
| E2E | `tests/e2e/participant-access.spec.ts` | feedback corrigido, espera sem feedback, restauração e submissão corrigida |
| Manifesto | `traceability.yml` / `RESULT-FEEDBACK-046` | requisito → SPEC → código → teste → commit → artefato |

## 3. Verificação executada

| Verificação | Evidência observada |
|---|---|
| RED | os dois cenários novos falharam antes da implementação porque `correction-panel` não existia |
| GREEN focal | E2E de correção/espera/restauração: 3/3; lint, typecheck e build web passaram |
| E2E participante | 13/13 cenários passaram, incluindo os dois casos novos |
| Testes unitários e cobertura | 125 arquivos passaram, 27 ficaram skipped; 572 testes passaram, 29 ficaram skipped; 84,51% statements, 80,33% branches, 86,03% functions, 85,23% lines |
| Contratos/worker | 26 arquivos/72 testes; 4 arquivos/25 testes |
| Build e gates | build dos 12 workspaces, secrets, architecture, documentation, product-definition, exposure e diff-check passam localmente |
| Integração configurada | 8 arquivos/20 testes passam; 27 arquivos/29 testes permanecem skipped por configuração live |
| Limites live | `CVG_TEST_DATABASE_URL` não está configurado; nenhum PASS PostgreSQL/RLS live é declarado |

## 4. Controles de segurança e experiência

- `attemptId` é derivado da tentativa restaurada na jornada; não é aceito
  `participantId` ou `scopeId` do navegador;
- a resposta é rejeitada se não tiver somente as chaves públicas esperadas ou
  se o feedback não for plain text bounded;
- `not_found` não é tratado como falha de convite: vira estado de espera;
- o score e o outcome são apenas evidência digital da avaliação, não decisão
  clínica nem autorização;
- a próxima ação é reutilizada da projeção server-side, sem varrer atividades
  ou inferir módulo no browser;
- a tela não renderiza `resultId`, `correctedBy`, `ruleVersion`, respostas,
  gabarito, fonte, prompt ou dados reais.

## 5. Gaps e próxima ação

Este incremento não fecha:

- proveniência, atomicidade e materialização real de
  `learning_assignments` → `activity_assignments` → atividade publicada;
- prova PostgreSQL/RLS live, grants/owners produtivos e concorrência real da
  cadeia adaptativa;
- debrief/reflexão avaliativa completa, remediação, retenção e notificações;
- auditoria de sucesso da atribuição adaptativa e feedback de produto;
- autoria/revisão clínica/publicação do B-07 e M02, piloto, provider/MFA,
  observabilidade externa, carga/failover/restore e CI no mesmo SHA.

Próxima fatia bounded: priorizar a relação assignment→atividade e sua
proveniência/atomicidade quando o ambiente live estiver disponível, mantendo a
publicação clínica e o release atrás dos gates humanos e operacionais.

