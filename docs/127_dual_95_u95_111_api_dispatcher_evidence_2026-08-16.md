# Dual 95 — U95-111 — evidência local de API, dispatcher e fronteiras

**Data:** 2026-08-16T15:35:39-03:00 (BRT)  
**Estado:** `READY_FOR_NEXT_STEP` / `PILOT_BLOCKED`  
**Escopo:** ligar a superfície API canônica ao lookup de rota, ao template de telemetria e ao grupo concreto do dispatcher; revalidar as fronteiras negativas de body/path/query/authz/erro.

## RED

- As novas expectativas do contrato falharam porque `API_SURFACE` não expunha grupo de handler nem lookup por caminho; a unidade registrou `2` falhas.
- A integração falhou porque não existia `API_ROUTE_GROUPS` e o inventário não tinha vínculo executável ao dispatcher.

## GREEN

- `ApiSurfaceRoute` agora deriva um `handlerGroup` fail-closed para cada rota; a superfície canônica continua com `57` rotas e `validateApiSurface` preserva duplicidade, método, auth, escopo e campos obrigatórios.
- `findApiSurfaceRoute` resolve rotas exatas e parametrizadas por segmentos, rejeitando método/caminho não registrados.
- `apps/api/src/route-template.ts` deixou de manter tabelas paralelas e deriva o template de telemetria do `API_SURFACE`.
- `apps/api/src/http-router.ts` expõe `API_ROUTE_GROUPS` com os seis grupos concretos (`health`, `metrics`, `workflow`, `internal`, `participant`, `authoring`); `routeApiRequest` consulta o inventário antes de despachar e falha com `not_found` fora da superfície.

## Verificação

- RED/GREEN focal: contratos `4/4`, inventário/dispatcher `2/2`, API/server `72/72` e pacote de contratos `82/82`.
- A suíte API/server revalidou entradas inválidas de body, path e query, autenticação/autorização deny-by-default e envelopes de erro/503 sem regressão.
- `pnpm test:coverage`: `178` arquivos passaram, `16` arquivos guardados, `810` testes passaram, `18` testes guardados; `84,55%` statements, `80,06%` branches, `86,67%` functions e `85,40%` lines.
- `pnpm verify`: passou; decisões críticas `7/7`, contratos `82/82`, worker `25/25`, migrações `30/30`, arquitetura `2/2`, hotspots `152/128`, secrets limpos e documentação/rastreabilidade válidas.
- Build web com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182` e `pnpm audit --audit-level=high`: passaram.

## Limites e próximos passos

- O vínculo executável comprovado é `57/57` rotas canônicas → grupo do dispatcher. Os matchers individuais ainda vivem nos módulos `http-route-*`; não foram substituídos por geração automática a partir do contrato.
- A evidência é local em worktree sujo, sem commit, SHA de RC, release, score ou fechamento de `0/145`; não substitui reauditoria independente.
- U95-107 continua bloqueada por artefato histórico compatível; U95-108 tem `11/87` linhas completas sem `N/A` aprovado; U95-109 tem `22` funções acima de `100` sem owner/prazo. A próxima melhoria local é U95-112, condicionada aos gates externos já registrados.
