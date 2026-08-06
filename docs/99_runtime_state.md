# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: DISCOVERY
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: prototipação e validação operacional do currículo V3
- current_sprint: CUR-24-01 — trilha de 24 meses
- current_task: produzir e validar a fatia vertical do Mês 2 — Emergência e UTI

## STATUS

- status: WAITING_HUMAN_APPROVAL

## PROGRESSO

- last_completed_action: commit 91cb9e7 registrou a fatia vertical M02 v0.1.0 com quatro sessões, dois casos, 31 itens estruturados, duas respostas abertas, rubricas, fontes e pré-voo; revisão independente final retornou PASS
- next_action: Ricardo revisar clinicamente os Anexos 0015 e 0016 e decidir se a v0.1.0 pode seguir para ensaio controlado e cronometrado

## BLOQUEIOS

- blockers: B-07 ainda aberto e os 120 itens não foram produzidos nem aplicados; a fatia vertical está estruturalmente pronta, mas aplicação depende da aprovação clínica final de Ricardo e do ensaio autorizado

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: aprovar, solicitar ajustes ou rejeitar a fatia vertical M02 v0.1.0 para ensaio controlado; a aprovação não autoriza publicação geral

## TIMESTAMP

- last_update: 2026-08-06T08:05:06-03:00

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.
