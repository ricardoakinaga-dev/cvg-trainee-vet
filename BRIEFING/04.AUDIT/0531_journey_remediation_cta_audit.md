# Auditoria JOURNEY-REMEDIATION-048 — CTA segura de remediação digital

**Data:** 2026-08-24

**Escopo:** runtime server-side `EXECUTAR_REMEDIACAO` → vínculo interno
`moduleId`/`learningAssignmentId`/escopo → atividade digital integralmente
publicada → projeção pública da jornada → CTA web e início/submissão de
tentativa.

**Resultado:** **PASS LOCAL COM GAPS DE AMBIENTE, PRODUTO E APROVAÇÃO CLÍNICA**.

Esta auditoria fecha somente a ação digital de remediação da jornada. Não cria
atividade de retenção, não publica conteúdo clínico, não autoriza procedimento,
não declara competência prática e não substitui revisão humana, piloto ou
evidência live.

## 1. Regra materializada

Quando o runtime server-side define `EXECUTAR_REMEDIACAO`, o caso de uso procura
uma atividade da própria projeção com o mesmo `scopeId`, o mesmo `moduleId`
curricular interno, `learningAssignmentId` explícito e status iniciável
(`EM_REFORCO`, `EM_ANDAMENTO` ou `DISPONIVEL`). A consulta de jornada exige
atividade `PUBLISHED` e que todos os itens/versões de conteúdo vinculados
estejam `PUBLICADO`; uma atividade legada sem módulo/proveniência ou com
vínculo inválido não vira alvo e conteúdo parcialmente publicado falha fechado.

O contrato permite `nextActionTarget` somente para `INICIAR_ATIVIDADE`,
`RETOMAR_ATIVIDADE` e `EXECUTAR_REMEDIACAO`, e exige que o alvo pertença à
lista de atividades da própria projeção. A API e a web não expõem o
`moduleId` interno nem `scopeId`/`participantId`; a autorização da atividade
continua no servidor.

`REVISAR_RETENCAO` não gera CTA inferida. A retenção D+7/D+30/D+90 permanece
somente como estado informativo até existir uma atividade de retenção e uma
transição bounded que a consuma. A API rederiva a ação e o alvo no boundary
público, sem confiar em `nextActionTarget` pré-calculado por wiring interno.

Uma tentativa terminal (`CORRIGIDA_AUTOMATICAMENTE`,
`CORRIGIDA_HUMANAMENTE` ou `ANULADA`) nunca recebe `Enviar tentativa`. Para a
atividade cujo runtime e alvo server-side autorizam remediação, a web oferece
`Iniciar nova tentativa` e reutiliza o endpoint existente; nos demais estados
terminais, em retenção e durante correção humana, ela mostra estado somente
leitura. Ao iniciar uma nova tentativa, respostas, apelos e justificativa local
são limpos, inclusive se a leitura da atividade ainda trouxer a reflexão
anterior.

O salvamento de uma resposta também é fechado por item: HTTP, aplicação e
persistência validam que o `itemId` pertence à atividade publicada atribuída ao
participante, no mesmo escopo e com a proveniência compatível de
`learningAssignmentId`/módulo. Somente `QUESTAO`, `CASO` e `REFLEXAO` podem
seguir pelo caminho de resposta; item inexistente ou de outra atividade retorna
`not_found` antes de persistir resposta ou evento.

## 2. Evidência de implementação

| Camada | Evidência | Resultado |
|---|---|---|
| Aplicação | `packages/application/src/journey-use-cases.ts`, `progress-use-cases.ts` | alvo server-side por módulo/escopo; `EM_REFORCO` sem tentativa é iniciável |
| Persistência | `packages/persistence/src/journey-repository.ts`, `activity-repository.ts`, `attempt-repository.ts`, `answer-repository.ts` | mapper validado, módulo/proveniência nulos fail-safe, todos os itens/versões `PUBLICADO`, item respondível vinculado à atividade e início fechado para conteúdo não publicado |
| Aplicação de resposta | `packages/application/src/answer-use-cases.ts` | guarda transacional do item antes de resposta/evento, com erro público `not_found` |
| Contrato/API | `packages/contracts/src/journey.ts`, `apps/api/src/http.ts`, `apps/api/src/http.test.ts` | compatibilidade action→target, rederivação no boundary e projeção redigida |
| Web | `apps/web/app/page.tsx` | CTA para alvo recebido; tentativa terminal não pode ser submetida |
| Testes | aplicação, persistência, contrato, HTTP e Playwright | RED/GREEN focal, regressão, browser e boundary |
| Especificação | `0106_contratos_de_aplicacao.md`, `0107_contratos_de_api.md` | vínculo interno e limites de retenção documentados |
| Manifesto | `traceability.yml` / `JOURNEY-REMEDIATION-048` | requisito → SPEC → módulo → contrato → teste → commit → artefato |

## 3. TDD, crítica e verificações

### RED observado

Antes da implementação, 3 arquivos focalizados produziram 4 falhas: alvo de
remediação ausente, `EM_REFORCO` derivando consulta em vez de início, módulo da
atividade não materializado e vínculo de módulo inválido não rejeitado.

Uma crítica independente posterior (Einstein) encontrou cinco pontos: CTA de
retenção sem guarda suficiente, respostas antigas reutilizadas, conteúdo
parcialmente `PUBLICADO`, ações editáveis durante `AGUARDA_CORRECAO_HUMANA` e
proveniência de assignment implícita. A implementação corrigiu esses pontos
no primeiro hardening. Bacon aprovou o estado local anterior e registrou três
P2: rederivação defensiva no boundary, E2E clicando a nova tentativa e limpeza
da justificativa; o commit `c16c52e` fechou essa rodada.

Na revisão independente posterior ao `c16c52e`, Hilbert encontrou um P1: o
`itemId` ainda podia chegar ao caminho de persistência sem pertencer à
atividade publicada do participante. Também registrou P2 sobre compatibilidade
de provenance, guarda do CTA genérico e evidência E2E da limpeza da
justificativa. O commit `de8d8bccbce13e3e4d10597f4b88245ae42601f` adicionou a
guarda em HTTP/aplicação/persistência, reforçou o vínculo
`participant/module/scope`, limitou o CTA a ações compatíveis e tornou o E2E
assertivo sobre a justificativa vazia após a nova tentativa. Kuhn revisou essa
versão como **PASS local condicionado**, sem P0 funcional; a certificação de
produção continua **FAIL** sem evidência live e rastreabilidade release.

### GREEN e regressão

- focal pós-hardening: 5 arquivos / 102 testes passaram, incluindo a rejeição
  de item fora da atividade em HTTP e aplicação;
- `pnpm verify`: 131 arquivos / 634 testes passaram, 27 arquivos / 33 testes
  ignorados;
- cobertura global: 84,90% statements, 81,11% branches, 86,41% functions e
  85,64% lines;
- `pnpm build`: 12 workspaces passaram no rebuild final após o commit
  `de8d8bc`;
- `pnpm test:e2e`: 28/28 cenários browser sintéticos passaram, incluindo CTA
  server-selected, nova tentativa com limpeza de estado e retenção sem CTA;
- `pnpm test:integration`: 10 arquivos / 25 testes passaram, 27 arquivos / 33
  testes foram ignorados por ausência do banco CVG autorizado;
- `pnpm audit --audit-level=high`: nenhum problema conhecido encontrado;
- gates de formato, lint, typecheck, contrato, worker, migrations, secrets,
  architecture, documentation, product-definition, exposure,
  `git diff --check` e traceability estrutural passaram.

## 4. Segurança e experiência

- o browser não escolhe a atividade por `moduleId`, score, gabarito ou fonte;
- o alvo é derivado do runtime autorizado e limitado ao mesmo escopo;
- a atividade legada sem módulo não é promovida silenciosamente;
- conteúdo sem versão pública não entra na jornada materializada;
- todos os itens/versões vinculados precisam estar públicos, sem aceitar mistura
  de rascunho e publicação;
- `moduleId` interno não cruza a projeção participante;
- `learningAssignmentId` é somente vínculo interno e não cruza a API pública;
- tentativa terminal não pode ser enviada novamente;
- `AGUARDA_CORRECAO_HUMANA` permanece somente leitura;
- nova tentativa não reutiliza respostas, apelos ou justificativa de contestação;
- a remediação é digital e assistiva, sem alegação de autonomia clínica;
- nenhum segredo, prontuário, tutor, paciente, foto, PDF ou dado clínico real foi
  usado em código, seed, teste, log ou interface.

## 5. Limites e próxima ação

Não houve PostgreSQL/RLS live, browser→API→PostgreSQL com banco CVG, teste de
concorrência real, grants/owners produtivos, workflow remoto same-SHA, carga,
failover, restore, collector/retention/traces externos, provider/MFA, piloto ou
revisão clínica. Os testes de persistência e a prova de limpeza da nova
tentativa continuam sintéticos/localmente isolados; a ausência de banco não é
convertida em PASS.

O item permanece `COMPLETED_WITH_GAPS`: a próxima ação é executar a prova live
em ambiente CVG descartável/autorizado e, em paralelo, submeter M02/B-07 e os
protocolos à revisão clínica/humana antes de qualquer publicação ou declaração
de treinamento médico completo.
