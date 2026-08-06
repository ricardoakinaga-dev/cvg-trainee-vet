# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: PRD
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: alinhamento de produto anterior à SPEC
- current_sprint: PRE-SPEC-01 — superfícies, dados e arquitetura
- current_task: aprovar ou ajustar o pacote D-091 a D-100

## STATUS

- status: WAITING_HUMAN_APPROVAL

## PROGRESSO

- last_completed_action: pacote pré-SPEC D-091 a D-100 consolidado, validado e aprovado em revisão independente; nenhuma SPEC ou construção iniciada
- next_action: MV. Ricardo Akinaga aprovar ou ajustar D-091 a D-100 como pacote; nenhuma SPEC será iniciada antes disso

## BLOQUEIOS

- blockers: D-091 a D-100 aguardam decisão; B-07 e gates Discovery/PRD continuam abertos; T2 permanece pronto para agendamento em fluxo paralelo, sem bloqueio documental

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: aprovar ou ajustar o pacote D-091 a D-100; a decisão não interfere na autorização já concedida para agendar T2

## TIMESTAMP

- last_update: 2026-08-06T10:11:11-03:00

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.
