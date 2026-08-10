# 0700 — Governança de Agentes — CVG

## Princípio

O Codex opera este repositório como sistema de engenharia documentado, não como gerador solto de código. Toda ação precisa de escopo, evidência, teste/verificação proporcional e persistência no estado.

## Ordem obrigatória

```text
ler AGENTS.md → ler runtime state/log/backlog → identificar engine/gate
→ escolher skill/role → executar pequena unidade → validar
→ atualizar documentos e estado → continuar ou solicitar decisão
```

## Regras

- preservar mudanças existentes do usuário;
- usar `apply_patch` para editar arquivos;
- não executar ação destrutiva sem alvo explícito e verificação;
- não criar dependência, fornecedor ou burocracia não autorizada;
- protocolos são autoria interna baseada na literatura e revisão de Ricardo;
- Qdrant/IA são server-side, assistivos e sem autoridade;
- rastreabilidade de fonte é interna; participante recebe conteúdo autoral CVG sem fontes/fotos/PDFs/metadados;
- nenhum código de produto antes do gate documental 04–08 100%.

