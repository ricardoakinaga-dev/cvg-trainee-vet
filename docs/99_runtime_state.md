# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: DISCOVERY
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: B-07 — correção do Discovery e preparação da baseline
- current_sprint: B-07-01 — blueprint diagnóstico
- current_task: criar e validar o blueprint das 120 questões

## STATUS

- status: WAITING_HUMAN_APPROVAL

## PROGRESSO

- last_completed_action: commit 8bed361 registrou o blueprint B-07, a sincronização documental e os arquivos de runtime após git diff --check, contagem 40/40/40 e varredura de segredos
- next_action: revisão clínica independente do blueprint e autorização para produzir os 120 itens originais e planejar a aplicação

## BLOQUEIOS

- blockers: B-07 ainda aberto; os 120 itens não foram produzidos nem aplicados; revisão clínica por outro médico-veterinário e aprovação humana para a aplicação permanecem pendentes

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: confirmar o blueprint, nomear o segundo médico-veterinário revisor e autorizar a produção/aplicação da baseline dentro da política D-077

## TIMESTAMP

- last_update: 2026-08-06T06:39:22-03:00

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.
