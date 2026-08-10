# 0498 — Matriz de domínio, contratos e regras de negócio

**Auditoria:** `AUD-0491-FULL-CONSTRUCTION-AUDIT`  
**Item:** 5 — Domínio, contratos e regras de negócio implementadas  
**Baseline:** 66/100  
**Escopo desta rodada:** regras puras, máquinas de estado, contratos Zod, projeções públicas, idempotência e invariantes aplicáveis sem SQL, HTTP, cookie, fornecedor externo ou interface.  
**Fora do escopo:** persistência/RLS/migrações (item 6), rotas e superfície backend (item 7), identidade operacional e privacidade de produção (item 8), jornada web (item 9), publicação clínica e autoria real (item 10).

## 1. Resultado da implementação

O núcleo passou a ter regras executáveis para os estados descritos na SPEC 0104–0108. Cada transição retorna novo objeto versionado e congelado; entrada inválida falha antes de produzir próximo estado. Os identificadores, timestamps, textos livres, enums e payloads condicionais são validados novamente na fronteira de domínio mesmo quando a entrada já passou pelo contrato.

O trabalho não promove conteúdo clínico. Os packs curriculares continuam em rascunho/projeção técnica, a revisão/aprovação de Ricardo permanece um gate independente e nenhuma regra digital altera competência prática, autorização de procedimento ou autonomia clínica.

## 2. Matriz PRD/SPEC → código → teste

| Regra ou invariante | Implementação executável | Evidência de decisão |
|---|---|---|
| `Attempt` inicia em `CRIADA`, segue o fluxo permitido, incrementa versão e congela o estado | `packages/domain/src/attempt.ts` | `packages/domain/src/attempt.test.ts` |
| Resposta é texto simples, possui timestamp ISO completo e não pode ser alterada após submissão | `packages/domain/src/answer.ts`; transição de tentativa | `packages/domain/src/answer.test.ts`; `packages/application/src/answer-use-cases.test.ts` |
| Resultado é versionado, possui regra/ator/horário e score entre 0 e 100 | `packages/domain/src/assessment.ts` | `packages/domain/src/assessment.test.ts`; correção humana idempotente |
| Conteúdo só percorre a sequência editorial autorizada; publicação não salta revisão/projeção | `packages/domain/src/content.ts`; preflight curricular | `packages/domain/src/content.test.ts`; `packages/curriculum/src/learning-runtime.test.ts` |
| Diagnóstico não punitivo, sem aprovação/reprovação global | runtime curricular existente | `packages/curriculum/src/learning-runtime.test.ts` |
| Composição somativa 0% quiz + 30% caso + 70% prova | `packages/domain/src/assessment-policy.ts` | `packages/domain/src/assessment-policy.test.ts` |
| Aprovação exige 70% geral e 80% em objetivo crítico | `evaluateSummativeAssessment` | teste de limiar crítico e escore global |
| `DADO_INCOMPLETO` não vira zero; `NAO_APLICAVEL` é explicitamente excluído e renormalizado | `evaluateSummativeAssessment` | testes de dados incompletos e componente não aplicável |
| Segunda tentativa exige forma diferente, intervalo mínimo de 7 dias e remediação após duas tentativas | `evaluateSummativeAttemptEligibility` | testes de intervalo, itens repetidos e remediação |
| Atribuição futura não é elegível; pausa preserva estado anterior; bloqueio atinge apenas a atribuição | `packages/domain/src/learning-state.ts` | `packages/domain/src/learning-state.test.ts` |
| Progresso, avaliação e domínio permanecem estados separados | estados de atribuição + workflow de resultado + runtime curricular | testes de atribuição e resultado |
| Resultado segue `EM_PROCESSAMENTO → DISPONÍVEL → REVISÃO → CORRIGIDO/ANULADO` | `learning-state.ts` | teste de transições proibidas e versão |
| Relato não aceita HTML/anexo por contrato; triagem possui histórico fechado | estado de ticket e schemas estritos | `learning-state.test.ts`; `contracts/src/learning-state.test.ts` |
| Contestação tem protocolo, revisor independente, decisão, recálculo controlado e prazo de 7 dias úteis | `packages/domain/src/appeal.ts` | `packages/domain/src/appeal.test.ts` |
| Comandos mutáveis reutilizados com payload diferente entram em conflito; replay não duplica efeito | casos de uso de tentativa, resposta e correção | `attempt-use-cases.test.ts`, `answer-use-cases.test.ts`, `correction-use-cases.test.ts` |
| Entrada de contrato é estrita e a projeção pública não recebe fontes, gabaritos, autoria, IA ou IDs internos | schemas de assessment/learning/correction/learning-state + `public-boundary.ts` | testes de HTML, campos internos e payloads condicionais |

Os requisitos de persistência, autorização server-side, publicação clínica, rotas, notificações e dashboards continuam vinculados aos itens posteriores; a matriz não os declara como concluídos neste item.

## 3. Contratos materializados

As regras de borda foram alinhadas com os invariantes do domínio:

- `assessment.ts` rejeita HTML em respostas e mantém idempotency key com tamanho/alfabeto limitado;
- `correction.ts` usa a mesma política de chave mínima de 16 caracteres do restante da avaliação;
- `learning.ts` rejeita texto marcado, escolha vazia e projeção com campos editoriais;
- `learning-state.ts` exige `now`, `reason`, `to`, `reviewerId` e `decision` somente nos eventos que os suportam;
- schemas são `.strict()` e não aceitam `source_record_id`, `answer_key`, anexos ou campos desconhecidos;
- a camada pública continua sem fonte, obra, página, PDF, rubrica interna, gabarito, prompt ou resposta de IA.

## 4. TDD e verificações

Os incrementos foram feitos em RED → GREEN:

1. testes de imutabilidade/timestamp/estado inválido falharam antes das correções do domínio;
2. testes de HTML, chave de idempotência e payloads condicionais falharam antes do endurecimento dos schemas;
3. testes de composição, tentativas, atribuição, resultado, ticket e contestação falharam por módulo ausente antes da implementação;
4. cada fatia foi reexecutada com typecheck do pacote correspondente;
5. a suíte ampla e o gate integrado passaram.

Evidência da execução atual:

| Verificação | Resultado |
|---|---|
| `pnpm vitest run` | 63 arquivos passaram, 9 foram omitidos por configuração; 283 testes passaram, 9 foram omitidos |
| `pnpm verify` | PASS; formatação, lint, typecheck, cobertura, secrets, traceability, architecture, documentation, product definition e exposure |
| Cobertura global | 85,09% statements; 80,27% branches; 87,56% functions; 85,82% lines |
| `pnpm --filter @cvg/domain typecheck` | PASS |
| `pnpm --filter @cvg/contracts typecheck` | PASS |
| `pnpm build` | PASS; 12 workspaces compilados |
| `pnpm test:e2e` | PASS; 5/5 cenários Chromium com fixtures sintéticos e API interceptada |
| Integração PostgreSQL/Qdrant local | PASS; 14 arquivos e 20 testes live, sem skips, usando dados sintéticos e credenciais efêmeras do ambiente local |
| `pnpm audit --audit-level=high` | PASS; nenhuma vulnerabilidade conhecida reportada |
| `git diff --check` | PASS após a consolidação desta matriz e dos documentos de estado |

## 5. Limites e riscos remanescentes

1. A persistência da nova contestação/ticket/atribuição ainda será ligada às tabelas e transações no item 6; o estado puro não é evidência de execução live.
2. A exposição das novas operações em rotas e telas permanece nos itens 7 e 9.
3. A correção humana existente continua sendo a fonte da nota de resposta aberta; a política somativa é um núcleo determinístico pronto para integração, não uma publicação automática.
4. A aprovação clínica e o pré-voo dos bancos continuam obrigatórios antes de `PUBLICADO` ou piloto.
5. A lista de dias úteis não incorpora feriados locais; o prazo do domínio usa fins de semana como calendário mínimo e deve receber calendário institucional quando a contestação for persistida.

## 6. Reavaliação do item

| Dimensão | Nota | Fundamentação |
|---|---:|---|
| Modelo de domínio e máquinas de estado | 23/23 | Tentativa, conteúdo, atribuição, resultado, ticket, contestação, resposta e avaliação possuem invariantes e transições testadas. |
| Regras de avaliação e progressão | 23/25 | 0/30/70, 70/80, dados ausentes, remediação, retenção, intervalo e formas diferentes estão determinísticos; integração persistida da nova política fica para o item 6/7. |
| Contratos e fronteira pública | 20/20 | Schemas estritos, campos condicionais, texto simples, timestamp e bloqueio de internals têm testes negativos. |
| Imutabilidade, versionamento e replay | 12/12 | Estados de domínio são novos/congelados; casos de uso existentes cobrem idempotência e conflito. |
| Compatibilidade com a aplicação atual | 9/10 | Fluxos atuais continuam verdes e erros são mapeados; tickets/contestações novas ainda não possuem caso de uso persistido. |
| Evidência e rastreabilidade | 8/10 | RED/GREEN, suíte, cobertura, verify, build, E2E, integração live, audit, diff-check, estado/log/backlog e manifesto estão registrados; o desconto restante é a ausência de commit de fechamento, pertencente ao item 16. |
| **Total** | **95/100** | **Score técnico do item 5: concluído com gaps de integração explicitamente transferidos aos itens seguintes.** |

Os gates finais desta rodada passaram e o score de **95/100** libera numericamente a abertura do item 6. Isso não autoriza release, piloto ou publicação clínica: a persistência/RLS, as rotas, a jornada web, a autoria clínica e os demais limites continuam nos itens próprios.
