# 0501 — Contrato de Estado Persistente

O arquivo `/docs/99_runtime_state.md` deve conter exatamente os campos operacionais abaixo, sem valores vazios:

```yaml
project: cvg-trainee-vet
current_engine: DISCOVERY|PRD|SPEC|BUILD|AUDIT
current_phase: texto
current_sprint: texto
current_task: texto
status: IN_PROGRESS|READY_FOR_NEXT_STEP|BLOCKED|WAITING_HUMAN_APPROVAL|COMPLETED
last_completed_action: texto verificável
next_action: ação executável
blockers: none ou lista
human_decision_required: yes|no
decision_description: texto ou none
last_update: ISO-8601 com timezone
```

## Invariantes

- `BLOCKED` exige causa raiz, impacto, ação e dependência;
- `WAITING_HUMAN_APPROVAL` exige pergunta objetiva e decisão necessária;
- `READY_FOR_NEXT_STEP` exige próximo item elegível;
- `COMPLETED` exige nenhum trabalho obrigatório restante;
- timestamp avança a cada atualização;
- `next_action` nunca pode ser “aguardar” sem explicar quem/qual decisão;
- o estado não guarda segredo, token, prompt, conteúdo clínico livre ou fonte protegida.

