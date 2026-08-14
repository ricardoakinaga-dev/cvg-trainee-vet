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

O resultado atual é rastreável e honesto, mas ainda não é rastreabilidade fechada. O número correto para o gate permanece `0/145` cadeias completas, com `145/145` evidências locais, `87/87` requisitos P0/P1 com evidência local, `0/145` gaps de elos locais e nenhum `GAP:commit-pending` ou `GAP:worktree-sha-pending`. O vínculo local `HEAD → imagem → runtime → rollback` foi provado no digest `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`, mas isso não substitui estado/release aprovados, gates externos e reauditoria. Qualquer nota 100 ou autorização de piloto antes das ações acima seria evidência fabricada.

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

Resultado atualizado: `pnpm verify` passou com 161 arquivos/706 testes/18 skips e cobertura 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines; migrations 29/29, contratos 81/81 e worker 24/24 passaram. `pnpm verify:premium-traceability` passou com `145/145` evidências locais, `87/87` P0/P1, `0/145` gaps de módulo/contrato/teste/artefato, `0/145` cadeias completas e todas as linhas ancoradas no commit local `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`.

O fechamento local não promove `VERIFIED` ou `RELEASE_READY`: o worktree está limpo e o rollback local foi ensaiado, mas não há registry/deploy/rollback externos, entrega clínica externa, RC publicado ou reauditoria; e a janela hospitalar ainda não possui horários aprovados. A disposição permanece `PILOT_BLOCKED`.

## Commit local e ensaio de release — 2026-08-14T11:02:00-03:00

O worktree foi consolidado no commit `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`, sem push. A matriz não possui mais `GAP:commit-pending` ou `GAP:worktree-sha-pending`. O ensaio `CVG_RUN_LOCAL_RELEASE_REHEARSAL=true pnpm ops:rehearse-local-release` passou deploy, canário, rollback sintético e restauração com release digest `sha256:8c3b2acd13236eefed6f5d639f133eb9e0dc28acd63fd4c861cb9d81d0684524` e rollback digest `sha256:cf03cb172580d36c7eecb1f706bbf1605c46f0377ca55061a2c1b870b27143dd`.

Isso reduz o gap local de mudança/rollback, mas `completeChains=0` permanece correto: estado `VERIFIED`, release `RELEASE_READY`, revisão clínica, identidade real, edge público, backup externo, CI/registry, UAT, operação e reauditoria ainda não foram comprovados.

## Runtime RC local e rollback no mesmo artefato — 2026-08-14T11:15:28-03:00

O source SHA imutável `e3aff802fe7ec104917e8cc6aa77bb0aea4f6229` foi propagado por `CVG_SOURCE_SHA` para a imagem `cvg-trainee-vet:rc-local`; o snapshot documental posterior foi consolidado no commit `1501070`, sem mudança de código. API-A/API-B e worker-A/worker-B carregaram a mesma revisão e o mesmo digest `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`. Migrations `29/29`, health live/dependencies `200/200`, proteção das três superfícies internas `401/401/401`, E2E HA `3/3` e ensaio local `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true` foram confirmados. O rollback sintético usado no ensaio foi `sha256:76b84ecd58011cbbffca2594cd2ce75b23b7ab57e66ebc7ea384b8d30f7567a4`.

O fechamento é local e não promove as linhas para `VERIFIED`/`RELEASE_READY`: os gates de clínica, identidade, edge público, backup externo, CI/registry/deploy externo, UAT, operação, estado/release e reauditoria continuam pendentes. Disposição `PILOT_BLOCKED`.

## Probes operacionais e fila clínica — 2026-08-14T11:32:02-03:00

Evidência nova, ainda local: fila PostgreSQL com `796` conteúdos, `763` pendências não revisadas, `0` aprovações e `0` falhas técnicas; load smoke de `5000/5000` requests, concorrência `100`, p95 `300,56 ms`; backup externo ao repositório com manifest/SHA verificados; restore isolado de `32` objetos, `targetIsolated=true` e RTO observado `4583 ms`.

Isso melhora a prova de preparação do beta, capacidade e recuperação local, mas não altera `completeChains=0/145`: não há decisões veterinárias, retenção externa, RPO/RTO produtivos, IdP/MFA, DNS/TLS público, CI/registry/deploy/rollback remoto, UAT, operação ou reauditoria no mesmo RC.

## CI remoto e proveniência das fontes — 2026-08-14T11:38:12-03:00

O PR `#1` foi inspecionado por `gh`: os runs `quality` falharam no commit remoto `d3964a9…` durante `verify:clinical-sources`, com ausência dos três PDFs licenciados no checkout. O workspace local passa porque os arquivos estão fora do Git. O requisito de artefato da cadeia continua aberto: falta bundle privado/licenciado, retenção do artefato, acesso CI read-only e prova de execução no mesmo RC. `completeChains=0/145` permanece correto.

O inventário read-only do GitHub não encontrou secrets, variables, environments ou deployments configurados e listou somente o workflow `quality`. Assim, também falta a infraestrutura remota mínima para provar registry, credencial CI, deploy e rollback do RC; nenhuma alteração remota foi realizada.

## RC validado no SHA executável e rollback local — 2026-08-14T11:57:48-03:00

O RC local atual está ancorado no SHA executável `8cf40e567d02149b9f5714c8b1084b60bd291426`, digest `sha256:aa5dc1b767745734f92b10359bb35920b6ab2096ed7cc5c6ce4927e592ad92bb`, com quatro processos HA reportando a mesma revisão. Health `ready/dependencies` passou `200/200`, E2E HA passou `3/3` e o ensaio local reportou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`; rollback sintético: `sha256:32a8b4dfca1e383354b439cb9118229ea4dcd3824c33496efee30d10af81d5a4`.

Isso fecha a evidência local do elo `HEAD → imagem → runtime → rollback`, mas não altera a matriz: `completeChains=0/145`, `145/145` linhas com evidência local e `87/87` P0/P1 com evidência local. Estado/release aprovados, CI/registry/deploy externos, gates clínicos e reauditoria continuam ausentes.

## Inventário remoto do Hostinger — 2026-08-14T12:17:30-03:00

O acesso read-only ao Hostinger confirmou infraestrutura pública genérica: Caddy validado, portas 80/443 abertas e certificados Let's Encrypt para outros subdomínios. Não foi encontrado nenhum projeto, container, imagem, route ou FQDN do CVG Trainee Vet. Os projetos ativos pertencem a outros produtos.

Foram encontrados apenas backups locais de outro sistema em `/var/backups/cvg-his-v2`; não há ferramenta observada de backup externo (`restic`, `rclone` ou `aws`), timer/cron específico do Trainee Vet, registry, deployment ou rollback do produto. A capacidade genérica de Caddy não constitui DNS/TLS do Trainee Vet e os backups existentes não constituem RPO/RTO/DR do produto.

Classificação: evidência `NOT_EXECUTED` para B-G2/B-G3/B-G4/B-G5/B-G7; evidência de infraestrutura candidata, sem autorização de escrita. Nenhum recurso remoto foi criado ou alterado. `completeChains=0/145` e `PILOT_BLOCKED` permanecem.

## RC atual, E2E, failover e restore — 2026-08-14T12:46:44-03:00

O vínculo local `source SHA → imagem → réplicas → rollback` foi revalidado no source SHA `16dcc2afda04866b1ecfaeb6017fe30bdadaa8be`, digest `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`. API-A/API-B e worker-A/worker-B reportaram a mesma revisão; health live/dependencies retornou `200/200`. O E2E web sintético passou `25/25`, o E2E HA com fixture passou `3/3`, o failover com `api-a` parada passou `500/500` e o restore live passou `2/2`, com RTO local direto de `3.832 ms`.

Essa evidência completa os elos locais de execução e recuperação, mas não os elos de estado/release aprovados. O verifier atual permanece `PASS_WITH_GAPS`: `145/145` linhas com evidência local, `87/87` P0/P1 e `0/145` cadeias completas. Não alterar `VERIFIED` ou `RELEASE_READY` sem registry/deploy externo, artefato retido, revisão clínica, IdP/MFA, DNS/TLS, backup/RPO/RTO produtivos, UAT/operação e reauditoria.

## Verificação integral após o registro — 2026-08-14T12:51:24-03:00

`pnpm verify` passou com `161` arquivos/`706` testes/`18` skips, cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`, contratos `81/81`, worker `24/24`, migrations `29/29` e governanças locais verdes; `git diff --check` passou. A matriz não muda: `145/145` linhas com evidência local, `87/87` P0/P1 e `0/145` cadeias completas. O novo runtime/rollback local é evidência adicional de execução, não prova de estado/release aprovado ou dos gates externos.

## Verificação integral após o inventário — 2026-08-14T12:23:45-03:00

O `pnpm verify` subsequente passou com `161` arquivos/`706` testes/`18` skips e cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`; contratos `81/81`, worker `24/24`, migrations `29/29`, documentação e governanças passaram. A matriz permanece `145/145` linhas com evidência local e `0/145` cadeias completas. A execução não converte infraestrutura candidata em ambiente autorizado nem altera `PILOT_BLOCKED`.
