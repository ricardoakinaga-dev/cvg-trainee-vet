# Evidência UI-VIS-001 — pós-ajuste de responsividade e acessibilidade

## Escopo

Revalidação local e sintética das superfícies web após três correções bounded:

- rail de operações com `position: sticky` e alvo móvel acima de 44 px;
- painéis de operações estilizados também quando aninhados nas lanes;
- toggle de autoria com nome acessível estável durante a expansão.

Arquivos funcionais alterados nesta fatia: `apps/web/app/globals.css` e
`apps/web/app/authoring/page.tsx`. Nenhuma API, regra de domínio, persistência,
conteúdo clínico ou boundary público foi alterado.

## RED/GREEN e verificação

- A execução inicial do E2E encontrou 3 falhas reais nos contratos visuais:
  sticky ausente, nome acessível mutável e painel móvel sem superfície mínima.
- O foco pós-correção passou `3/3` em 6,3 s:
  `operational surface`, `dense authoring controls` e `operations sections`.
- A matriz visual production-shaped foi dividida pelo limite operacional do
  runner: os 7 primeiros cenários passaram antes de o processo receber
  `SIGTERM` no limite de uma execução longa; os três últimos passaram `3/3` em
  39,4 s, incluindo reidratação, variantes loading/empty/success e stress de
  interação/reflow. O cenário de variantes também passou isoladamente `1/1` em
  17,9 s com timeout de 60 s.
- Viewports cobertos: 1440 px, 768 px, 390 px e stress em 195 px, conforme os
  testes existentes; axe permaneceu sem violações nos cenários executados.
- `node scripts/build-e2e.mjs`: PASS nos 12 workspaces.
- `corepack pnpm verify`: PASS, 149 arquivos, 808 testes, 42 skips; cobertura
  84,45% statements, 80,18% branches, 87,35% functions e 85,20% lines.
- `git diff --check`, lint, typecheck, format, contratos, migrations,
  secrets, traceability, documentation, product-definition e public-boundary:
  PASS dentro de `verify`.

## Limitações honestas

O E2E usa Chromium, fixture sintética e `next start`; a execução única completa
de 44 testes não foi reivindicada porque o runner recebeu `SIGTERM` antes do
fim. A matriz visual foi fechada por segmentos verificáveis, sem assertion
vermelha nos cenários concluídos. Não há prova de PostgreSQL/RLS live, provider
IA real, workflow remoto, produção, deploy, zoom nativo, tecnologia assistiva,
publicação clínica, piloto ou competência prática.

O worktree permanece sujo e o artefato é evidência local não-release. O shell
local usa Node 24.20.0/pnpm 10.33.0, enquanto o contrato CI declara Node
22.22.0/pnpm 10.33.0.
