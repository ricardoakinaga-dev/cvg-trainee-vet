# JOURNEY-056 — Contrato da sessão diagnóstica própria

## Estado e decisão

- data: 2026-08-26
- estado: aprovado para BUILD técnico local
- decisão de produto: **A — sessão diagnóstica pública própria**
- escopo: B-07 formativo sintético, com checkpoint, retomada, finalização
  server-side e atribuição inicial idempotente
- gate clínico: permanece pendente; este contrato não publica o B-07, não
  autoriza aplicação real e não cria claim de competência prática

Este documento congela a fatia autorizada por Ricardo. A implementação deve
ser pequena, reversível e compatível com as portas existentes de avaliação,
atribuição e jornada. Qualquer expansão para repetição do baseline, debrief,
feedback, notificações, IA/Qdrant, prática presencial, retenção ou aplicação
clínica exige nova decisão e novo item.

## Objetivo observável

Um participante autenticado consegue:

1. iniciar ou recuperar a única sessão B-07 do seu escopo;
2. receber somente a projeção segura dos itens do catálogo técnico;
3. salvar respostas parciais e retomar sem perder checkpoints;
4. finalizar uma vez, com avaliação e atribuição derivadas no servidor;
5. continuar pela jornada pública até uma atividade publicada, quando existir
   uma atribuição materializada pelo catálogo curricular vigente.

O servidor é a autoridade para identidade, escopo, catálogo, respostas
válidas, avaliação, resultado, módulos recomendados e assignment. O cliente
nunca escolhe participante, escopo, módulo, resultado, nota, gabarito ou
próxima atividade.

## Limites de disponibilidade

O catálogo de itens usado pela fatia é uma projeção técnica/sintética. A
origem continua marcada como rascunho, `publicationAuthorized=false` e
`clinicalReview=PENDENTE`; nenhuma rota pode converter esses campos em
publicação clínica. A composição pode habilitar a sessão em fixture/local
para evidência técnica, mas não deve habilitar piloto ou produção por este
contrato.

## API pública versionada

Todas as entradas e saídas são envelopes JSON versionados, strict e sem
campos desconhecidos. O participante autentica por cookie de sessão existente.
As rotas exigem conta ativa, membership aceita e capability própria no escopo
resolvido server-side.

### Iniciar ou recuperar

`POST /api/v1/diagnostics/b07/sessions`

Body:

```json
{"idempotencyKey":"diagnostic-start-2026-08-26-0001"}
```

O corpo aceita somente `idempotencyKey`. O servidor resolve um único escopo
ativo do participante. Se houver zero escopos, a resposta é `403`; se houver
mais de um escopo elegível sem um seletor de produto definido, a resposta é
`409 state_conflict`, com detalhe redigido `diagnostic_scope_ambiguous`. O
endpoint cria a sessão ou retorna a
sessão canônica existente; uma sessão finalizada não é refeita nesta fatia.

### Ler a sessão atual

`GET /api/v1/diagnostics/b07/sessions/current`

Retorna a sessão própria mais recente do escopo resolvido. Não aceita
`participantId` ou `scopeId`. Ausência de sessão retorna `404`.

`GET /api/v1/diagnostics/b07/sessions/:sessionId`

Permite retomar uma sessão já apresentada ao próprio participante. O UUID é
tratado como identificador opaco; sessão de outro participante/escopo retorna
`404` indistinguível de ausência.

### Salvar checkpoint

`PUT /api/v1/diagnostics/b07/sessions/:sessionId/answers/:itemId`

Body:

```json
{
  "version": 4,
  "selectedChoiceIds": ["choice-a"],
  "idempotencyKey": "diagnostic-answer-2026-08-26-0004"
}
```

`version` é a versão CAS da sessão observada pelo cliente;
`selectedChoiceIds` é bounded, sem duplicatas, e `idempotencyKey` usa a regra
compartilhada de chaves com 16–128 caracteres
(`^[A-Za-z0-9][A-Za-z0-9._:-]*$`). O item deve pertencer à sessão e as
escolhas devem pertencer ao item. Uma resposta vazia é permitida para limpar
um checkpoint antes da finalização. O servidor incrementa a versão da sessão
com CAS. Replay da mesma chave com o mesmo comando retorna a mesma projeção;
reuso da chave com fingerprint diferente retorna `409 idempotency_conflict`.

### Finalizar

`POST /api/v1/diagnostics/b07/sessions/:sessionId/finalize`

Body:

```json
{
  "version": 7,
  "idempotencyKey": "diagnostic-finalize-2026-08-26-0007"
}
```

O servidor define `completedAt`; o cliente não fornece timestamp. A operação
usa CAS, é idempotente e, na mesma transação PostgreSQL, grava a sessão
finalizada, o agregado `diagnostic_results` e a atribuição inicial derivada
por `AssignCurriculumFromDiagnostic`. Replay de uma finalização válida retorna
o mesmo resultado público; versão obsoleta retorna `409 state_conflict`.

## Projeções públicas

O envelope de sessão contém apenas:

```text
sessionId, diagnosticId, diagnosticVersion, version, status, startedAt,
lastCheckpointAt, finalizedAt, itemCount, answeredItemCount,
currentOrdinal, items, answers, result?, nextAction?
```

`items` contém `itemId` público opaco, `ordinal`, `title`, `text`,
`responseMode`, `choices` e `selectionMode`. `answers` contém apenas o
`itemId` público e `selectedChoiceIds`. `result`, quando a sessão está
finalizada, contém apenas os cards formativos por tema, sem IDs de módulo, e a
próxima ação allowlisted. `nextAction` pode apontar para a jornada pública existente, mas
não revela `assignmentId`, `diagnosticResultId`, `participantId`, `scopeId`,
`sourceDiagnosticResultId` ou IDs internos de módulo.

É proibido na projeção pública: gabarito, `correctChoiceIds`, rubrica,
feedback interno, criticidade, remediação interna, `sourceRefs`, blueprint,
prompt clínico de revisão, notas globais, ranking, pass/fail ou campos de
auditoria.

## Máquina de estados e invariantes

Estados públicos: `EM_ANDAMENTO` e `FINALIZADA`.

- uma única sessão aberta por participante + escopo + diagnóstico + versão;
- a sessão é criada com versão `0`, sem respostas e com `status=EM_ANDAMENTO`;
- somente a própria identidade autenticada pode ler ou escrever;
- respostas e sessão ficam no mesmo escopo contextual no PostgreSQL;
- checkpoint em sessão finalizada falha com `409 session_finalized`;
- finalização sem todos os itens é permitida e preserva
  `answeredItemCount`; ausência não vira erro nem resposta correta;
- finalização não pode ser revertida, repetida como novo baseline ou editada;
- o resultado agregado é único por sessão e o assignment conserva a provenance
  do resultado;
- falha em avaliação/resultado/assignment faz rollback da transação inteira;
- replays não criam sessão, resposta, resultado ou assignment duplicados.

## Persistência e segurança

Adicionar migrations forward-only, sem editar migrations aplicadas, para:

- `diagnostic_sessions`: sessão, identidade derivada, escopo, diagnóstico,
  versão do catálogo, estado, versão CAS, relógios e vínculo único opcional
  com `diagnostic_results`;
- `diagnostic_session_answers`: sessão, item público/canônico, escolhas
  selecionadas, versão/relógio do checkpoint e unicidade por sessão + item;
- registro de idempotência scoped por operação, sessão e fingerprint, com
  resposta replayable sem armazenar segredo.

O snapshot imutável guarda, por sessão, a revisão técnica, o par
`publicItemId → canonicalItemId`, escolhas válidas, cardinalidade, objetivo e
gabarito somente no perímetro interno necessário à avaliação. Retomada e
finalização avaliam contra esse snapshot, nunca contra um singleton mutável do
catálogo atual.

As tabelas têm `ENABLE/FORCE ROW LEVEL SECURITY`, policies deny-by-default e
contexto transacional de participante + escopo. A role da aplicação não
recebe ownership, `BYPASSRLS` ou privilégios administrativos. A leitura e a
mutação também passam por guards server-side; RLS é defesa adicional, não a
única autorização.

## Concorrência, idempotência e auditoria

O fingerprint é a serialização JSON canônica UTF-8 do objeto ordenado por
campos: operação, `participantId`, `scopeId`, `sessionId` quando aplicável,
`expectedVersion`, item canônico e `selectedChoiceIds` em ordem lexicográfica.
Não inclui a própria chave, timestamp ou dados secretos. O registro é
namespaced por participante + escopo + operação + chave, tem TTL bounded de 24
horas e armazena somente fingerprint, vínculo e resposta replayable. Inserção
é atômica; em colisão concorrente vence um registro, o perdedor relê o vencedor
e fingerprint diferente falha com `idempotency_conflict`, sem revelar existência
para outra identidade.

A mutação de uma sessão usa ordem fixa `sessão → idempotência → respostas →
resultado → assignment`; o START primeiro serializa a resolução
participante+escopo e, ao encontrar sessão, adquire o lock da sessão antes de
construir a resposta replayable. Checkpoint, finalização, auditoria append-only
e eventual outbox de evento devem ser commitados na mesma transação. Os eventos são
`DIAGNOSTIC_SESSION_STARTED`, `DIAGNOSTIC_SESSION_CHECKPOINTED`,
`DIAGNOSTIC_SESSION_FINALIZED` e rejeições/replays metadata-only; nenhum evento
contém resposta, gabarito, fonte ou texto clínico.

## Critérios RED → GREEN → REFACTOR

RED deve demonstrar, no mínimo:

- schemas strict rejeitam identidade/escopo/módulo/gabarito e campos extras;
- criação/replay, checkpoint/replay, finalização/replay e fingerprint conflitante;
- item/escolha fora do catálogo, sessão finalizada e versão obsoleta;
- participante ou escopo cruzado não lê nem altera sessão;
- falha de assignment reverte resultado e finalização;
- projeção não contém campos internos ou clínicos proibidos.

GREEN deve cobrir contratos, domínio/aplicação, persistência/PostgreSQL/RLS,
API, web e E2E browser→web→API→PostgreSQL com fixture sintética. REFACTOR
mantém as invariantes, o comportamento idempotente e a separação entre
catálogo draft e autorização clínica. A regressão global deve preservar a
quality bar vigente: cobertura global mínima de 80%, build, lint, typecheck,
secrets, dependências, migrações, exposição, arquitetura, documentação,
traceability e E2E.

## Rastreabilidade inicial

- produto: `JOURNEY-056`, `BRIEFING/90.ANEXOS/0012_blueprint_diagnostico_b07.md`
- aplicação: `SPEC-0106`, `SPEC-0107`, `SPEC-0111`, `SPEC-0112`, `SPEC-0114`
- dados/operação: `SPEC-0109`, `SPEC-0110`, `SPEC-0118`
- dependências: `ADAPTIVE-044`, `JOURNEY-045`, `JOURNEY-REL-001`,
  `JOURNEY-REL-002`, `FEEDBACK-055`, `LIVE-056`
- implementação esperada: contracts → domain/application → persistence →
  API → web → E2E → auditoria

Este contrato não é autorização de release, publicação clínica, piloto,
aplicação real, aprovação de conteúdo ou claim de competência.
