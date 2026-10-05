# AUDIT-REM-06 — Proposta de contrato para elegibilidade somativa

- **Status:** `WAITING_HUMAN_APPROVAL` — proposta técnica, ainda não aprovada.
- **Responsável pela decisão:** Ricardo.
- **Origem:** AUDIT-20261001-06; PRD UC-006, RF-041/RF-043–047,
  RN-020–022/RN-026–029; SPEC 0104/0106/0107.

## Evidência atual

- **CURRENT — produto:** UC-006 exige módulo concluído e elegibilidade
  satisfeita. O PRD distingue atividades formativas e somativas, fixa limites
  de tentativas, remediação, intervalo e itens distintos.
- **CURRENT — SPEC:** 0104 exige congelar versões de item, rubrica e regra;
  0106 lista `StartAttempt` para UC-004–008 com resultado “tentativa criada
  com versões congeladas”, sem definir modalidade, origem dessas versões ou
  os dados que resolvem a elegibilidade.
- **CURRENT — runtime:** o POST recebe `activityId` e `idempotencyKey`;
  `AttemptActivityPort.isAvailable` retorna apenas booleano; o comando de
  aplicação não recebe contexto somativo. `AttemptState` não contém modalidade
  nem versão de avaliação.
- **CURRENT — domínio:** `evaluateSummativeAttemptEligibility` recebe horário,
  IDs dos itens e histórico de tentativas/remediação; não recebe modalidade,
  versão da avaliação ou conclusão do módulo.
- **UNKNOWN:** a fonte persistida e autoritativa para modalidade, versão
  imutável, conclusão do módulo, seleção de itens e histórico somativo no
  boundary de início.

## Proposta para decisão

Manter o corpo público atual (`activityId` e `idempotencyKey`) e resolver no
servidor o contexto canônico da atividade. A aplicação aplicaria a política
somativa apenas quando esse contexto classificar a atividade como somativa,
usando modalidade, versão congelada, elegibilidade do módulo, itens escolhidos
e histórico carregados de fontes internas. A tentativa registraria as versões
aprovadas usadas. A atividade formativa continuaria iniciável sem a barreira
somativa. Se dados obrigatórios estiverem ausentes numa atividade somativa, o
início falharia fechado.

Esta proposta requer contrato aprovado para as fontes e os dados do contexto;
não autoriza inferir modalidade pelo cliente nem amplia silenciosamente API,
modelo persistido ou SPEC.

## Decisão solicitada

Ricardo autoriza este boundary server-side para AUDIT-REM-06 — incluindo a
preservação do fluxo formativo e falha fechada quando faltar contexto somativo
obrigatório? Se não, indicar a fonte autoritativa ou o boundary desejado.

## Efeito enquanto aguarda

AUDIT-REM-06 permanece `WAITING_HUMAN_APPROVAL`. Não alterar código, contratos
ou persistência de elegibilidade somativa até a decisão; tarefas independentes
podem continuar.
