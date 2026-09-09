# UI-VIS-001 — revalidação visual corrente

**Data:** 2026-09-06 20:00 -03:00  
**Escopo:** revalidação da implementação visual corrente após alterações
concorrentes bounded em `apps/web/app/globals.css`,
`apps/web/app/operations/page.tsx` e `apps/web/app/recovery/page.tsx`.

## Evidência

| Gate | Comando | Resultado |
| --- | --- | --- |
| Matriz visual Chromium | `corepack pnpm exec playwright test tests/e2e/visual-gauntlet.spec.ts --workers=1 --timeout=60000` | **PASS — 11/11 em 59,1 s** |
| Verificação ampla | `corepack pnpm verify` | **PASS — 149 arquivos, 808 testes, 42 skips** |
| Cobertura | saída do `corepack pnpm verify` | **84,45% statements / 80,18% branches / 87,35% functions / 85,20% lines** |

A matriz visual cobriu a rota em 1440 px, 768 px e 390 px, a superfície
operacional, controles densos de autoria, escaneabilidade mobile, foco e
disclosure, recuperação inválida, reidratação, loading/empty/success e stress
de interação/reflow.

## Limitações

- A evidência é local, sintética e executada em worktree não commitado; não é
  evidência de release nem prova de workflow remoto same-SHA.
- Não foram provados nesta execução PostgreSQL/RLS live, Qdrant live, cookie
  HTTPS em rede real, tecnologia assistiva com usuário, zoom nativo, produção,
  publicação clínica, piloto ou competência prática.
- O `validate --check-drift` do Gauntlet precisou ser reaberto antes do
  rebaseline porque as alterações visuais foram feitas depois do fingerprint
  anterior. O rebaseline controlado deve ocorrer somente após o registro desta
  evidência e das atualizações de estado, log, backlog e rastreabilidade.
