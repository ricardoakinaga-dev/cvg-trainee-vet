# 0500 — Agent Loop e Session Persistence — CVG

**Objetivo:** manter execução contínua, retomável e auditável sem depender de memória implícita.

## 1. Ciclo oficial

```text
LER ESTADO → CONFIRMAR ESCOPO → EXECUTAR PRÓXIMA AÇÃO
→ VALIDAR → ATUALIZAR ESTADO/LOG/BACKLOG → DECIDIR → RETOMAR
```

O agente não encerra uma rodada somente com texto narrativo. Toda rodada deixa `last_completed_action`, `next_action`, `status`, timestamp e evidência.

## 2. Arquivos canônicos

- `/docs/99_runtime_state.md`: posição única da execução;
- `/docs/20_master_execution_log.md`: histórico append-only;
- `/docs/30_backlog_master.md`: itens, prioridades, dependências e status;
- `BRIEFING/09.PROJETO_CVG_TREINAMENTO`: fonte documental do produto;
- `BRIEFING/03.BUILD` a `08.RUNTIME`: engines e contratos transversais.

## 3. Regras de continuidade

1. ler estado, log e backlog antes de qualquer ação relevante;
2. validar se `next_action` pertence ao gate atual;
3. executar uma ação pequena e verificável;
4. capturar resultado, comandos, arquivos e falhas;
5. atualizar estado e log imediatamente;
6. atualizar backlog se item, dependência, risco ou prioridade mudou;
7. continuar automaticamente quando não houver bloqueio nem decisão de negócio;
8. solicitar decisão somente quando a alteração ultrapassar autorização;
9. nunca marcar `COMPLETED` com artefato ou teste pendente.

## 4. Regra CVG deste projeto

Enquanto 04–08 não estiverem 100% documentados, o loop pode editar documentação/controle, mas não pode iniciar código de produto. B-07, T2, fornecedor e calibração não devem gerar bloqueio artificial da construção documental ou do núcleo autorizado.

