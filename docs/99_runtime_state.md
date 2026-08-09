# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: SPEC ENGINE
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: SPEC — Fase 0 concluída; documentação de fontes em paralelo
- current_sprint: LIT-01 — leitura da literatura e matriz curricular
- current_task: registrar a leitura das três obras sem iniciar 0101 ou BUILD

## STATUS

- status: WAITING_HUMAN_APPROVAL

## PROGRESSO

- last_completed_action: checkpoint documental D-109 commitado em 669956e; RF/RN, M02 e Anexo 0022 alinhados; nenhum derivado foi versionado
- next_action: MV. Ricardo Akinaga aprovar o checkpoint da Fase 0 e autorizar, se desejar, somente o 0101; aprovar o blueprint B-07 antes da produção diagnóstica

## BLOQUEIOS

- blockers: nenhum técnico para 0101; falta autorização humana porque a permissão vigente limitou-se ao readiness; autoria em escala e B-07 seguem seus gates; BUILD segue bloqueado até 0190

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: aprovar o checkpoint do 0100 e autorizar somente a Fase 1/0101, sem BUILD

## TIMESTAMP

- last_update: 2026-08-09T12:20:48-03:00

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.
