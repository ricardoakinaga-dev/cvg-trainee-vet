# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: DISCOVERY
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: prototipação e validação operacional do currículo V3
- current_sprint: CUR-24-01 — trilha de 24 meses
- current_task: executar T2 — ensaio controlado e cronometrado da M02 v0.1.0

## STATUS

- status: READY_FOR_NEXT_STEP

## PROGRESSO

- last_completed_action: commit b85184b registrou D-089, descartou o gate documental adicional do T2 e manteve a coleta mínima de D-077
- next_action: selecionar e agendar dois a três veterinários autorizados para executar T2 conforme o Anexo 0018

## BLOQUEIOS

- blockers: B-07 ainda aberto e os 120 itens não foram produzidos nem aplicados; T2 não possui bloqueio documental e depende somente da coordenação dos participantes

## DECISÃO HUMANA

- human_decision_required: no
- decision_description: nenhuma decisão adicional é necessária antes de T2; após os resultados, Ricardo decidirá manter, revisar ou bloquear a M02

## TIMESTAMP

- last_update: 2026-08-06T08:53:02-03:00

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.
