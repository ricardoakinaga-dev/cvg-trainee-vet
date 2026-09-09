# UI visual Gauntlet — Round 1 revalidation

**Data:** 2026-09-06
**Escopo:** `UI-VIS-001`, somente superfícies web e evidência visual local
**Limite:** não prova PostgreSQL/RLS live, CI remoto, produção, conteúdo
clínico publicado, piloto ou competência prática.

## Matriz executada

Comando:

```text
corepack pnpm exec playwright test tests/e2e/visual-gauntlet.spec.ts
```

Resultado atual: **4 testes PASS**.

- cinco rotas: `/`, `/diagnostic`, `/operations`, `/authoring` e `/recovery`;
- viewports: 1440×900, 768×1024 e 390×844;
- axe sem violações nas 15 combinações rota × viewport;
- overflow horizontal global ausente;
- assets locais sem resposta HTTP ≥400;
- traversal completo por Tab até o fim dos stops alcançáveis, com tratamento
  visível de foco nos alvos alcançados;
- `prefers-reduced-motion` sem animação efetiva ou transformação;
- falhas de stylesheet, document/script, `pageerror` e console capturadas;
- estados adicionais renderizados e fotografados: recovery loading, recovery
  success e jornada participante empty, usando envelopes sintéticos.

Renders da execução ficam nos diretórios regeneráveis `test-results/` e não
contêm dados de pessoas, prontuários, fotos, PDFs ou conteúdo clínico real.

## Revisor independente

A primeira crítica fresca foi `REVISE` porque a matriz cobria somente o
primeiro Tab, não mostrava estados adicionais e a inspeção encontrou
fingerprint instável durante uma reconstrução concorrente. A suíte foi então
ampliada e o webapp foi reconstruído isoladamente. A aceitação final depende
de nova crítica fresca, sem editar o artefato.

## Pendências

- manter a matriz vinculada ao build atual e ao fingerprint da rodada;
- concluir a crítica visual independente pós-revalidação;
- não promover esta fatia para `AAA-400`/`AAA-401` completos sem revisão
  manual WCAG e sem fechar os demais gates do programa.
