# Dual 95 — U95-110 — evidência local de contratos e segurança de tipos

**Data:** 2026-08-16T15:09:12-03:00 (BRT)  
**Estado:** `READY_FOR_NEXT_STEP` / `PILOT_BLOCKED`  
**Escopo:** remover double assertions evitáveis na persistência e derivar a guarda da superfície de dashboard web do contrato canônico compartilhado.

## RED

- A caracterização da guarda do dashboard falhou porque o guard antigo aceitava uma recomendação com rota não registrada.
- O teste de governança de segurança de tipos falhou listando `15` arquivos de produção com `22` ocorrências históricas de `transaction as unknown as DatabaseExecutor`.

## GREEN

- `apps/web/app/dashboard/dashboard-model.ts` passou a usar `parseParticipantDashboard` e `ParticipantDashboardProjection` de `@cvg/contracts`; a dependência e a regra de boundary foram declaradas no workspace.
- As `22` double assertions de transação foram removidas dos repositórios de persistência; uma assertion simples residual em `invitation-repository.ts` também foi eliminada. A inferência do callback transacional do Drizzle permaneceu tipada sem adapter inseguro.
- A guarda do dashboard agora rejeita formas fora do contrato canônico e preserva o envelope genérico da resposta HTTP apenas na fronteira necessária.

## Verificação

- Focais web: `7/7` (`dashboard-model` e `dashboard-page-content`).
- Persistência: `127/127` testes unitários.
- Governança/arquitetura: `3/3` (`type-safety-governance` e `architecture-boundaries`).
- `pnpm typecheck`, typecheck do workspace web, `pnpm lint` e `pnpm audit --audit-level=high`: passaram; nenhum advisory conhecido de alta severidade.
- Build web com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182`: passou. Sem essa configuração o build falha fechado porque a configuração de produção é obrigatória.
- `pnpm test:coverage`: `178` arquivos passaram, `16` arquivos guardados, `808` testes passaram, `18` testes guardados; `84,55%` statements, `80,05%` branches, `86,58%` functions e `85,36%` lines.
- `pnpm verify`: passou; decisões críticas `7/7`, contratos `81/81`, worker `25/25`, migrações `30/30`, arquitetura `2/2`, secrets limpos e hotspots `0` acima de `800`, `152` funções longas e maior função com `128` linhas.

## Limites e próximos passos

- Esta fatia saneou a superfície de dashboard; as demais superfícies web por papel ainda devem ser consolidadas no trabalho posterior de contratos/estados do dashboard e papéis (`U95-113`) quando aplicável.
- O worktree continua sujo e sem commit, SHA de RC, release, score ou fechamento de `0/145`; a evidência é local e não substitui reauditoria independente.
- U95-107 continua bloqueada por artefato histórico versionado compatível; U95-108 continua com `11/87` linhas completas sem `N/A` aprovado; U95-109 continua com `22` funções acima de `100` sem exceção com owner/prazo.
