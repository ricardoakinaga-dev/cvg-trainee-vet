# Evidência local U95-113 — contratos web, estados e retry

- **ID:** `DUAL95-U95-113-WEB-CONTRACTS-STATES`
- **Data:** `2026-08-16`
- **Status local:** `READY_FOR_NEXT_STEP`
- **Disposição executiva:** `PILOT_BLOCKED`
- **Escopo:** contratos bounded nas superfícies por papel, estados do dashboard e recuperação por retry

## RED → GREEN

O RED caracterizou três riscos da superfície web:

1. guards locais de admin, moderator, authoring e account aceitavam campos desconhecidos, enumerações inválidas, ranges impossíveis, IDs vazios/duplicados e datas fora do contrato;
2. a página de dashboard confundia ausência de dados com carregamento e não tinha uma prova focal do ciclo loading → erro HTTP/JSON/projeção → retry → sucesso;
3. a cobertura e a verificação E2E anteriores não demonstravam o estado de retry da nova fronteira.

O GREEN implementado:

- `apps/web/app/admin/admin-model.ts` usa schemas canônicos para operações, dashboards administrativos e páginas de contas gerenciadas;
- `apps/web/app/moderator/moderator-model.ts` usa `parseModeratorDashboard` para validar a projeção completa na fronteira HTTP;
- `apps/web/app/authoring-model.ts` usa os schemas canônicos de registro interno e fila clínica paginada;
- `apps/web/app/account-model.ts` usa os contratos canônicos de segurança e operação, incluindo expiry ISO válido;
- `apps/web/app/dashboard/dashboard-state.ts` separa `loading`, `error` e `dashboard`, limpa a projeção após falha e expõe retry idempotente por chamada;
- `apps/web/app/dashboard/dashboard-view.tsx` e `page.tsx` expõem status acessível, `aria-busy`, `data-testid` estável e botão de retry desabilitado durante nova tentativa;
- o participante preserva os fluxos E2E existentes de logout e retomada, sem mover decisão de autorização para o frontend.

## Evidência executada

### Focais RED/GREEN

- guards e conteúdo do dashboard: `5` arquivos / `11` testes aprovados;
- negativos cobertos: enum/range, IDs vazios, IDs de módulo duplicados, `curriculumId`, status, paginação, token interno extra e data inválida;
- typecheck e lint: passaram;
- build com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182`: os `12` participantes do workspace passaram.

### Cobertura e governança

- `pnpm test:coverage`: `181` arquivos aprovados, `822` testes aprovados, `16` arquivos guardados e `19` testes guardados;
- cobertura: `84,65%` statements, `80,13%` branches, `86,79%` functions e `85,54%` lines;
- `pnpm verify`: passou com contratos `82/82`, worker `25/25`, migrações `30/30`, decisões críticas `7/7`, arquitetura `2/2`, secrets limpo, documentação consistente e exposição pública verificada;
- `verify:accessibility-governance`: `6/6` evidências automatizadas passam, com cinco lacunas manuais preservadas;
- `verify:web-performance-governance`: `3` evidências passam, `2` medições presentes e quatro gaps preservados;
- hotspots: `PASS_WITH_DEBT_RATCHET`, `152` funções longas, maior função `128` linhas.

### Playwright sintético

`CVG_E2E_WEB_PORT=3199 pnpm test:e2e` passou `27/27`, incluindo:

- carregamento acessível do dashboard;
- primeira resposta `503`, mensagem de erro e retry;
- segunda resposta com projeção bounded, recomendações renderizadas e `aria-busy=false`;
- logout/retomada do participante, acessibilidade automatizada, viewport estreito e fluxos de authoring/admin existentes.

Esse perfil mocka as respostas de aplicação. Os avisos de proxy para `127.0.0.1:3101` confirmam que a API real não estava ativa; portanto o resultado é evidência web sintética/local, não prova browser → API → banco, HA, cross-browser, mobile ou runtime de produção.

## Limites e decisão

Os schemas do frontend agora rejeitam projeções fora dos contratos canônicos. A superfície de participante continua usando seu contrato local específico onde as regras de retenção e runtime divergem do projection schema geral; essa divergência não foi mascarada por cast ou migração automática.

Esta rodada não fecha cobertura da camada `apps/web` no denominador global, screen reader/manual WCAG, UAT, RUM/Web Vitals, Firefox/WebKit/mobile, API ativa, RC imutável, CI/registry/deploy, revisão clínica, reauditoria ou `0/145` cadeias completas. Não houve commit, staging, push, release, alteração de score ou remoção de `PILOT_BLOCKED`.

## Arquivos principais

- `apps/web/app/admin/admin-model.ts`
- `apps/web/app/moderator/moderator-model.ts`
- `apps/web/app/authoring-model.ts`
- `apps/web/app/account-model.ts`
- `apps/web/app/dashboard/dashboard-state.ts`
- `apps/web/app/dashboard/dashboard-view.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/src/admin-model.test.ts`
- `apps/web/src/moderator-model.test.ts`
- `apps/web/src/authoring-model.test.ts`
- `apps/web/src/account-model.test.ts`
- `apps/web/src/dashboard-page-content.test.ts`
- `tests/e2e/participant-dashboard.spec.ts`
