# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: DISCOVERY
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: correção do gate Discovery
- current_sprint: B07-01 — blueprint diagnóstico
- current_task: validar clinicamente o blueprint das 120 questões do Anexo 0012

## STATUS

- status: WAITING_HUMAN_APPROVAL

## PROGRESSO

- last_completed_action: D-091 a D-100 aprovadas integralmente pelo patrocinador; PRE-SPEC-01 concluído sem iniciar SPEC ou construção
- next_action: MV. Ricardo Akinaga validar, ajustar ou rejeitar o blueprint diagnóstico do Anexo 0012 antes da produção dos 120 itens

## BLOQUEIOS

- blockers: B-07 e gates Discovery/PRD continuam abertos; T2 permanece pronto para agendamento em fluxo paralelo, sem bloqueio documental

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: validar, ajustar ou rejeitar o blueprint diagnóstico B-07; D-091 a D-100 já estão aprovadas

## TIMESTAMP

- last_update: 2026-08-06T17:30:19-03:00

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.
