# Análise de gaps de rastreabilidade — 2026-08-14

## Objetivo e escopo

Este documento detalha o resultado do preflight local do artefato `PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX` em `traceability.yml`. A fotografia inicial foi somente leitura; o lote adicional documentado aqui apenas vinculou arquivos e testes existentes, sem promover requisito, release ou commit.

Fonte e verificação executada:

```text
pnpm verify:premium-traceability
```

Resultado observado: `PASS_WITH_GAPS`, com 145 requisitos, 0 cadeias completas, 145 linhas com evidência local, 87/87 requisitos P0/P1 com evidência e 53 linhas em `PRIORITY_PENDING_PRODUCT_DECISION` (58 RNF permanecem sem prioridade declarada no campo `priority`).

## Fotografia quantitativa

| Dimensão | Resultado | Interpretação operacional |
|---|---:|---|
| Requisitos na matriz | 145 | Cobertura estrutural presente |
| Cadeias completas | 0/145 | Nenhuma linha pode ser promovida a `VERIFIED`/`RELEASE_READY` |
| Linhas com evidência local | 145/145 | Há código, contrato, teste e artefato local explicitamente referenciados |
| Linhas P0/P1 com evidência local | 87/87 | Todos os P0/P1 possuem elo local; isso não substitui commit/SHA ou gate externo |
| Linhas com módulo/contrato/teste/artefato pendentes | 0/145 | O gap local de elo foi fechado; a cadeia ainda não é release-completa |
| Linhas com commit pendente | 145/145 | O worktree ainda não foi convertido em commit de release aprovado |
| Estado `MAPPED_PARTIAL` | 65/145 | Mapeamento existe, mas não fecha a cadeia |
| Estado `VERIFIED_LOCAL` | 27/145 | Evidência local existe, mas não é release aprovada |
| Estado `PRIORITY_PENDING_PRODUCT_DECISION` | 53/145 | RNFs dependem de decisão de produto antes da promoção |
| Release `PILOT_BLOCKED` | 145/145 | O bloqueio de piloto permanece correto |

As colunas têm o seguinte perfil de gaps:

| Campo | Gap explícito |
|---|---:|
| módulo | 0 |
| contrato | 0 |
| teste | 0 |
| commit | 145 |
| artefato | 0 |

Não há gap estrutural nas colunas de decisão, estado ou release; elas registram corretamente que o trabalho está parcial, bloqueado ou aguardando decisão. O problema é de fechamento de evidência, não de ocultação do bloqueio.

## Leitura do fechamento dos 10 gaps de evidência local

Os dez requisitos que estavam sem elo local foram ligados por evidência requisito-específica. O critério usado foi:

1. módulo implementado e existente no snapshot;
2. contrato de entrada/saída ou limite de integração;
3. teste adequado ao risco, incluindo integração/E2E quando aplicável;
4. artefato de execução, decisão ou governança reconhecido em `traceability.yml`.

O trabalho pode ser feito em lotes por capacidade para reduzir duplicação, mas cada requisito continua precisando de uma linha verificável. A ordem recomendada é:

Os dez requisitos fechados localmente foram `RF-063`, `RF-072`, `RF-073`, `RF-093`, `RF-094`, `RNF-012`, `RNF-072`, `RNF-075`, `RNF-084` e `RNF-086`. `RF-057` e `RF-058` continuam ligados ao artefato `RICH-DIGITAL-CASE-INTERACTIONS-057-058`, com testes de interação, aplicação, contrato, persistência, API e inventário de rotas; permanecem `MAPPED_PARTIAL` porque commit/SHA e gates de release continuam pendentes.

Lotes locais executados nesta retomada: `RF-003`, `RF-004`, `RF-006`, `RF-011`, `RF-012`, `RF-032`, `RF-037`, `RF-042`, `RF-051`, `RF-095`, `RF-098`, `RF-027`, `RF-028`, `RF-030`, `RF-074`, `RF-099`, `RF-101`, `RF-044`, `RF-045`, `RF-090`, `RF-091`, `RF-100`, `RF-071`, `RF-082`, `RF-103`, `RF-104`, `RF-107`, `RNF-004`, `RNF-016`, `RNF-032`, `RNF-038`, `RNF-052`, `RNF-060`, `RNF-061`, `RNF-062`, `RNF-063`, `RNF-064` e `RNF-065`, além das microfatias anteriores. As linhas têm links locais verificáveis; continuam bloqueadas para release porque o commit/SHA permanece pendente e os RNFs continuam aguardando decisão de prioridade.

| Lote | Foco | Critério de saída |
|---|---|---|
| T-01 | aprendizagem, estado, remediação e runtime | todas as linhas apontam para módulos/contratos/testes existentes e coerentes |
| T-02 | domínio de avaliação e decisões críticas | cobertura de decisão e testes de invariantes comprovados |
| T-03 | autoria, conteúdo e publicação | fluxo editorial e bloqueio de publicação comprovados |
| T-04 | autenticação, administração e autorização | contrato, autorização server-side e E2E comprovados |
| T-05 | RNFs técnicos, observabilidade e operação | prioridade decidida e evidência operacional específica |

## O que pode e o que não pode ser fechado localmente

Pode ser feito localmente, sem segredo ou ambiente externo:

- inventariar arquivos e testes já existentes;
- produzir o mapa requisito→SPEC→task→módulo→contrato→teste→artefato;
- corrigir links que apontem para arquivos reais;
- validar a matriz e os testes de governança;
- preparar o pacote de release e os critérios de aceite.

Não pode ser declarado resolvido somente pelo worktree:

- `commit` e SHA de release, porque há alterações pré-existentes e não há fronteira aprovada de commit;
- `VERIFIED`/`RELEASE_READY`, porque ainda faltam CI, registry, deploy, rollback e evidência de runtime do mesmo SHA;
- prioridade dos 58 RNFs, sem decisão de produto;
- evidência de produção para IdP/MFA, DNS/TLS, backup/RPO/RTO, traces duráveis e Web Vitals;
- revisão clínica independente dos 763 conteúdos, que depende do beta autorizado com veterinários;
- UAT, WCAG com tecnologia assistiva, soak/failover e DR reais.

## Próximas ações rastreáveis

1. Manter `BLK-08-A` reconciliado com este snapshot e preservar os dez vínculos locais com evidência direta.
2. Encerrar a parte local de `BLK-08-B`; não preencher `commit` ou promover `VERIFIED` sem RC/SHA e artefato de release.
3. Ricardo decidir as prioridades dos RNFs e a fronteira de commit (`D-ENT-01`, `D-ENT-07` e `D-ENT-09`, conforme o plano executivo).
4. Registrar o SHA em `BLK-06-B`, gerar manifesto de imagem por digest em `BLK-06-C` e provar o SHA em runtime em `BLK-06-D`.
5. Só então executar `BLK-08-C`/`BLK-08-D`, revalidar `145/145` e submeter o pacote aos gates externos e clínicos.

## Conclusão

O resultado atual é rastreável e honesto, mas ainda não é rastreabilidade fechada. O número correto para o gate permanece `0/145` cadeias completas, com `145/145` evidências locais, `87/87` requisitos P0/P1 com evidência local, `0/145` gaps de elos locais e `145/145` commits pendentes. A propagação local de `SOURCE_SHA` para a imagem e o runtime foi preparada e testada, mas não substitui um RC/commit aprovado e uma prova de runtime. Qualquer nota 100 ou autorização de piloto antes das ações acima seria evidência fabricada.

Referências: [preflight dos bloqueadores](113_blocker_preflight_2026-08-14.md), [plano executivo](../BRIEFING/03.BUILD/0305_sub80_to_95_executive_plan.md), [roadmap](../BRIEFING/04.AUDIT/0510_sub80_to_95_roadmap.md) e [backlog](../BRIEFING/04.AUDIT/0511_sub80_to_95_backlog.md).

## Verificação integral subsequente

Em 2026-08-14T07:50:05-03:00, `pnpm verify` passou com 138 arquivos/639 testes/18 skips e cobertura 85,28% statements / 81,36% branches / 86,88% functions / 85,99% lines. A matriz permaneceu em `PASS_WITH_GAPS` com 135/145 evidências locais, 82/87 P0/P1, 10 gaps de elo, 0/145 cadeias completas e 145/145 commits/SHA pendentes. Esta execução valida o worktree local; não substitui o RC/SHA, CI, deploy, operação externa, revisão clínica ou aprovação humana requeridos para release.

## Evidência de runtime subsequente — 2026-08-14T08:24:53-03:00

O runtime ativo foi reconciliado no mesmo digest local após build único e recriação dos quatro processos: `sha256:51582f1cdfabf7deddd4a55c230526d19936ef139fc4171721c7cfafb43ccf01`, com origem `worktree-9803c85ca62cda0684802aaa68a5dd3418f43c88-dirty`. O E2E real passou 3/3, dashboard/acessibilidade 7/7, build dos 12 workspaces passou e o teardown do fixture terminou com código 0.

Esse fato melhora a evidência local de runtime, mas não preenche os campos `commit`/`SHA` nem promove as linhas a `VERIFIED`/`RELEASE_READY`: a matriz continua em 135/145 evidências locais, 82/87 P0/P1, 10 gaps de elo e 0/145 cadeias completas. O mesmo RC/SHA, CI, registry, deploy, rollback e gates externos continuam necessários.

## Higiene do fixture e verificação integral — 2026-08-14T08:44:18-03:00

O fixture E2E agora remove somente o namespace sintético `real-e2e-*` e suas dependências mutáveis. A execução ativa passou 3/3, o teardown terminou com `exit 0` e a inspeção read-only posterior confirmou zero resíduos sintéticos escopados nas tabelas de contas, atividades, conteúdo, caso digital, estado curricular e sessões.

Após a alteração, `pnpm verify` passou com 138 arquivos/639 testes/18 skips e cobertura 85,28% statements / 81,36% branches / 86,88% functions / 85,99% lines. A matriz permanece em 135/145 evidências locais, 82/87 P0/P1, 10 gaps de elo, 0/145 cadeias completas e 145/145 commits/SHA pendentes. A limpeza melhora a evidência operacional, mas não fecha rastreabilidade, RC/SHA, CI, deploy, rollback, gates externos ou aprovação humana.

## Fechamento local dos dez elos — 2026-08-14T10:42:04-03:00

O lote seguinte fechou os dez gaps de módulo/contrato/teste/artefato com mudanças requisito-específicas: dashboards de moderador e administração, estatística/anomalia de item, decisão de conflito de fontes, governança de IA operacional, recálculo/notificação integrado localmente e policy/contrato de janela de manutenção. O último contrato foi validado em RED antes da implementação e GREEN depois.

Resultado atualizado: `pnpm verify` passou com 161 arquivos/706 testes/18 skips e cobertura 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines; migrations 29/29, contratos 81/81 e worker 24/24 passaram. `pnpm verify:premium-traceability` passou com `145/145` evidências locais, `87/87` P0/P1, `0/145` gaps de módulo/contrato/teste/artefato, `0/145` cadeias completas e `145/145` commits/SHA pendentes.

O fechamento local não promove `VERIFIED` ou `RELEASE_READY`: o worktree permanece dirty; não há RC/SHA, manifesto, registry, deploy ou rollback externos; a entrega clínica externa do recálculo não foi exercitada; e a janela hospitalar ainda não possui horários aprovados. A disposição permanece `PILOT_BLOCKED`.
