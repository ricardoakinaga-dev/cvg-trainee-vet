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

- status: WAITING_HUMAN_APPROVAL

## PROGRESSO

- last_completed_action: Ricardo aprovou clinicamente a M02 v0.1.0; D-088 foi registrada; T0 reexecutado e T1 documental passaram; revisão independente final do protocolo retornou PASS após correção de seis achados
- next_action: completar o aviso de privacidade do T2 com base legal aplicável, canal de direitos, versão e data; depois selecionar/agendar dois a três veterinários

## BLOQUEIOS

- blockers: B-07 ainda aberto e os 120 itens não foram produzidos nem aplicados; T2 está bloqueado até o aviso D-077 registrar base legal aplicável e canal de direitos, além da coordenação dos participantes

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: Ricardo, com suporte jurídico/DPO quando aplicável, deve definir a base legal e o canal do aviso de privacidade antes de qualquer coleta real; depois de T2 decidirá manter, revisar ou bloquear a M02

## TIMESTAMP

- last_update: 2026-08-06T08:20:28-03:00

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.
