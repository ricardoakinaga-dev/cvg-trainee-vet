# 0503 — Protocolo de Retomada e Recuperação

## Retomada normal

1. ler estado;
2. verificar último log;
3. localizar `next_action` e dependência;
4. conferir diff/worktree e não repetir ação já concluída;
5. continuar da menor unidade pendente;
6. validar e persistir.

## Interrupção/crash do agente

Se houver estado `IN_PROGRESS`, inspecionar evidência parcial e repetir somente comandos idempotentes. Se não for possível provar o resultado, marcar a task para verificação/reexecução, nunca assumir sucesso.

## Falha de ferramenta/integração

- erro transitório: retry limitado e registrar tentativa;
- erro persistente: `BLOCKED` com causa e próximo diagnóstico;
- mudança de escopo: `WAITING_HUMAN_APPROVAL`;
- conflito documental: parar a fase e registrar os arquivos conflitantes;
- segredo encontrado: parar, remover com operação segura e acionar revisão de segurança/rotação.

## Continuação automática

Permitida quando a próxima ação está documentada, não destrutiva, dentro do escopo e sem decisão de negócio. Não usar loop para contornar gate ou aprovação humana.

