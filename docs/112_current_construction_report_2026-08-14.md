# Relatório atual de construção e auditoria — CVG

**Data:** 2026-08-14
**Escopo:** documentação integral de `docs/`, código, testes, configuração e runtime local.
**Baseline canônica:** 83,24/100, arredondada para 83/100.

## 1. Conclusão executiva

O CVG está funcional e observável em ambiente local, mas ainda não está pronto para produção, piloto ou publicação clínica. A nota oficial permanece congelada em 83,24/100 porque a evidência atual é local/sintética, sem operação externa comprovada e sem os gates humanos/clínicos necessários. O runtime local foi reconstruído no SHA executável `16dcc2afda04866b1ecfaeb6017fe30bdadaa8be`, com digest comum `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`; qualquer commit posterior desta atualização é apenas documental e não altera o artefato executável. Isso não equivale a um RC publicado ou aprovado.

Estado: `WAITING_HUMAN_APPROVAL`.
Disposição de release/piloto/publicação clínica: `PILOT_BLOCKED`.

## 2. Evidências executadas

- Foram lidos e reconciliados os 20 arquivos da pasta `docs/`, incluindo estado, log, backlog, registro canônico e a nova evidência local de Web Vitals/carga.
- `pnpm verify` integral no SHA executável do RC `8cf40e567d02149b9f5714c8b1084b60bd291426`: passou com 161 arquivos, 706 testes aprovados, 18 skips governados; cobertura de 83,78% statements, 80,41% branches, 84,95% functions e 84,55% lines. Também passaram contratos 81/81, worker 24/24, migrations 29/29, lint, typecheck, decisões críticas, documentação, arquitetura, governanças, produto, fronteira pública e `git diff --check`.
- A fatia local adicional de RF-057/RF-058 e o recálculo de avaliações estão integrados: interação estruturada e dose/infusão, caso digital progressivo, projeção pública segura, persistência PostgreSQL versionada com RLS, recálculo/outbox/worker e rotas autenticadas. A matriz possui 145/145 linhas com evidência local e 87/87 P0/P1; isso não transforma as linhas em cadeias completas.
- A verificação integral subsequente passou após a atualização do inventário M24 e da expectativa de rotas: 138 arquivos de teste, 639 testes aprovados, 18 skips governados; cobertura de 85,28% statements, 81,36% branches, 86,88% functions e 85,99% lines; migrations 24/24 e todos os gates locais do `pnpm verify` verdes. A disposição continua `PILOT_BLOCKED`.
- Build dos 12 workspaces concluído.
- Build web de produção concluído com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182`; o serviço systemd foi reiniciado e voltou a servir a aplicação.
- E2E web sintético: 25/25 testes aprovados contra o serviço web ativo, incluindo axe, teclado, landmarks, reflow, zoom, jornadas do participante, administração e autoria; E2E HA com fixture real: 3/3 fluxos aprovados com teardown concluído.
- E2E HA ativo: 3/3 fluxos sintéticos aprovados com teardown código 0, incluindo caso digital persistente e ciclo administrativo.
- E2E ativo de dashboard e acessibilidade: 7/7 fluxos aprovados, incluindo axe, teclado, landmarks, reflow e zoom equivalente.
- Edge security: 7 diretivas estáticas e 2 destinos live aprovados.
- Smoke live: 200/200 requisições aprovadas, p95 de 186,68 ms.
- `pnpm audit --prod --audit-level high`: nenhuma vulnerabilidade conhecida.
- Runtime local: duas APIs, dois workers, PostgreSQL, Qdrant, Caddy, OTel, Tempo, Prometheus e Grafana ativos; API/worker no RC local comum `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`, com label `org.opencontainers.image.revision=16dcc2afda04866b1ecfaeb6017fe30bdadaa8be` e `CVG_SOURCE_SHA` correspondente.
- Failover controlado: `api-a` foi parado, o edge respondeu `500/500` requests com 100% de sucesso, média de 104,81 ms e p95 de 626,14 ms; `api-a` foi restaurado e voltou saudável no mesmo digest.
- Restore PostgreSQL live: `pnpm test:integration:restore` passou 2/2 com conexão administrativa e container Docker declarado; execução direta do marcador confirmou banco descartável isolado e RTO local de 3.832 ms. Isso não comprova backup externo nem RPO/RTO de produção.
- `pnpm ops:verify-ha`, `pnpm ops:verify-edge-security` e `pnpm ops:verify-release-manifest` passaram; o edge permanece interno/staging (`liveTargets=[]`) e o gate de segurança produtiva retorna `NOT_EXECUTED` sem ambiente aprovado.
- Rollback local no RC atual: `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`, com rollback sintético `sha256:56b55d205b8766097c0f07d51d9f216650de911c7af4ae9720f730b990f87f8c`.
- Gate de segurança produtiva: permanece `NOT_EXECUTED`/fail-closed fora do ambiente aprovado, sem as referências externas obrigatórias; não houve tentativa de contornar o gate.
- Rastreabilidade local: `PASS_WITH_GAPS`, com 145/145 linhas de evidência, 87/87 requisitos P0/P1 com evidência local, zero gaps de módulo/contrato/teste/artefato e 0/145 cadeias completas porque estado/release externos e gates clínicos ainda não estão aprovados; as linhas estão ancoradas no SHA local `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`.

## 3. Notas por item

| # | Item | Nota | Síntese da avaliação |
|---:|---|---:|---|
| 1 | Documentação, gates e governança | 90 | Estrutura documental forte e gates automatizados; aprovações e evidências externas continuam pendentes. |
| 2 | Discovery, PRD e definição do produto | 95 | Cadeia Discovery → PRD → SPEC consistente e produto bem definido. |
| 3 | Currículo e conteúdo clínico | 72 | Catálogo materializado com 24 módulos, 96 sessões e 796 conteúdos; 763 itens aguardam revisão clínica independente. |
| 4 | Arquitetura e modularidade | 92 | Monorepo modular e fronteiras PostgreSQL/Qdrant/IA adequadas; há hotspots de código grandes. |
| 5 | Domínio, contratos e regras | 88 | Invariantes e decisões críticas bem cobertos; faltam provas completas para todos os requisitos P0/P1. |
| 6 | Persistência, migrations e integridade | 90 | 29 migrations verificadas, incluindo estado persistente do caso digital e recálculo; evidência produtiva autorizada ainda ausente. |
| 7 | API e backend | 82 | API funcional e protegida; alguns entrypoints e fluxos operacionais têm cobertura inferior. |
| 8 | Segurança, identidade e privacidade | 86 | Autorização server-side, RLS, CSRF, cookies e redaction presentes; IdP/MFA real não executado. |
| 9 | Jornada do participante | 75 | Fluxos principais funcionam localmente; jornada integral, UAT e métricas reais não comprovados. |
| 10 | Autoria, revisão e governança clínica | 68 | Workflow técnico existe; revisão humana independente do corpus liberável ainda não foi concluída. |
| 11 | Worker, Qdrant, IA e resiliência | 88 | Worker, projeções derivadas, IA assistiva e failover local funcionam; DR externo falta. |
| 12 | Observabilidade e operação | 78 | Sinais, alertas e stack local existem; retenção e telemetria externas ainda não comprovadas. |
| 13 | Web, UX e acessibilidade | 78 | Rotas e fluxos principais funcionam; há cinco gaps manuais de WCAG e Web Vitals reais pendentes. |
| 14 | Testes, cobertura e evidências | 93 | Cobertura global forte e suíte ampla; skips e evidências sintéticas ainda não fecham o release. |
| 15 | CI e reprodutibilidade | 86 | Contratos, lint, typecheck e build locais passam; o PR remoto falhou porque o checkout não contém o bundle licenciado das três fontes, e registry, deploy e rollback externos continuam não comprovados. |
| 16 | Rastreabilidade e controle de mudanças | 65 | Existem 145 requisitos e 145 linhas de evidência local ancoradas no commit local `4d8618d`; 0/145 cadeias estão completas porque estado/release, gates externos e reauditoria ainda não foram aprovados. |

## 4. Bloqueios que exigem resolução

1. 763 conteúdos sem revisão clínica independente.
2. IdP, MFA e recuperação de conta reais não executados.
3. DNS público e TLS gerenciado não comprovados.
4. Backups externos, retenção e RPO/RTO produtivos pendentes.
5. CI, registry, deploy e rollback atuais não comprovados.
6. Worktree local agora limpo e commitado; o runtime local está vinculado ao SHA executável do RC, mas registry/deploy/rollback externo e publicação do RC ainda não foram comprovados.
7. UAT, acessibilidade manual, Web Vitals reais, soak e DR pendentes.
8. 0/145 cadeias de rastreabilidade completas porque o estado/release e os gates externos ainda não foram aprovados, apesar do commit local já estar ancorado.
9. Recálculo de avaliações integrado localmente; entrega clínica externa e produção ainda não comprovadas.
10. Horários hospitalares de manutenção ainda não foram configurados/aprovados.

## 5. Limites da evidência

O runtime local não representa produção: a imagem em execução está ancorada no SHA executável do RC local, mas o TLS live é interno/local, os dados do E2E são sintéticos e os gates produtivos permanecem fail-closed. A revisão clínica deve ocorrer em beta controlado com veterinários autorizados, sem prontuários, pacientes, tutores, fotos, PDFs de terceiros ou dados identificáveis.

## 6. Decisão

Não aprovar release, piloto ou publicação clínica nesta rodada. O plano executivo, roadmap e backlog suplementares de resolução dos oito bloqueios devem ser executados com gates binários, evidência no mesmo SHA, rollback documentado e reauditoria independente.

Referências canônicas: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`, `docs/99_runtime_state.md`, `docs/20_master_execution_log.md` e `docs/30_backlog_master.md`.

## 7. Verificação integral final desta rodada

Em 2026-08-14T06:07:56-03:00, `pnpm verify` terminou com `exit 0`. A suíte registrou 134 arquivos de teste, 606 testes passados e 18 skips governados; cobertura global de 86,53% statements / 82,28% branches / 87,30% functions / 87,26% lines. A rastreabilidade permaneceu em 0/145 cadeias completas, 131/145 evidências locais, 78/87 requisitos P0/P1 com evidência, 14 gaps locais e 145/145 commits/SHA pendentes. Nenhum score, release, piloto ou publicação clínica foi promovido.

## 8. Verificação integral anterior

Em 2026-08-14T06:40:25-03:00, `pnpm verify` terminou com `exit 0` após RF-105/RF-106. A suíte registrou 135 arquivos de teste, 621 testes passados e 18 skips governados; cobertura global de 86,25% statements / 82,37% branches / 86,95% functions / 86,99% lines. A migração 0021 elevou o total verificado para 22/22. A rastreabilidade está em 0/145 cadeias completas, 133/145 evidências locais, 80/87 requisitos P0/P1 com evidência, 12 gaps locais e 145/145 commits/SHA pendentes. Nenhum score, release, piloto ou publicação clínica foi promovido.

## 9. Build local mais recente

Em 2026-08-14T06:43:41-03:00, `CVG_API_INTERNAL_URL=http://127.0.0.1:3000 pnpm build` passou nos 12 workspaces. O Next.js compilou as sete rotas web estáticas e os pacotes de domínio, contratos, aplicação, persistência, integrações, API e worker concluíram sem erro. Essa evidência confirma compilação local; não prova DNS/TLS, registry, deploy, rollback ou runtime vinculado a SHA imutável.

## 10. Incremento local mais recente — RF-057/RF-058

Em 2026-08-14T07:42:06-03:00, a fatia adicional de aprendizagem rica passou nos testes focalizados de currículo, aplicação, persistência, contratos e API. O caso digital M24 agora possui definição sintética de três etapas, decisões ramificadas, consequências persistentes, revelação controlada de séries de exames e projeção pública que omite `nextStage`, `statePatch`, rubricas, gabaritos e IDs internos. A persistência usa a migration `0023_digital_case_runtime_states`, chave única participante/escopo/módulo, versão otimista, transação e RLS; a API não aceita `participantId` do cliente e infere o escopo somente quando há exatamente um escopo autorizado.

O incremento também passou o typecheck/build dos workspaces afetados, inventário de superfície da API, `verify:migrations` em 24/24 e rastreabilidade em `PASS_WITH_GAPS` com 135/145 linhas locais, 82/87 P0/P1 e 10 gaps de elo. Essa evidência é local, sintética e ainda está no worktree: não altera a nota oficial 83,24/100, não fecha commit/SHA, não prova operação externa e não libera piloto, publicação clínica ou release.

## 11. Verificação integral mais recente

Em 2026-08-14T07:50:05-03:00, `pnpm verify` terminou com sucesso após as correções de consistência do inventário e da superfície da API. Foram aprovados 138 arquivos de teste e 639 testes, com 18 skips governados; a cobertura global foi de 85,28% statements, 81,36% branches, 86,88% functions e 85,99% lines. Também passaram lint, typecheck, cobertura de decisões críticas, contratos (66/66), worker (24/24), migrations (24/24), secrets, rastreabilidade, governança de risco/skips/evidências, acessibilidade, capacidade, Web Performance, jornada/correção, arquitetura, hotspots, documentação, produto e fronteira pública.

O gate integral continua reportando `PASS_WITH_GAPS` para a rastreabilidade: 135/145 evidências locais, 82/87 P0/P1, 0/145 cadeias completas e 145/145 commits/SHA pendentes. A execução confirmou qualidade local, não comprova gates externos, revisão clínica independente, IdP/MFA real, DNS/TLS público, backup/DR, CI/deploy/rollback, UAT, Web Vitals reais ou release candidate imutável. A nota oficial permanece 83,24/100 e não há autorização de release, piloto ou publicação clínica.

## 12. Runtime ativo e verificação final da rodada

Em 2026-08-14T08:24:53-03:00, o runtime local foi reconstruído e reconciliado após a correção do teardown do E2E e da proveniência da imagem. A tag `cvg-trainee-vet:local`, originada do worktree `9803c85ca62cda0684802aaa68a5dd3418f43c88-dirty`, foi consolidada em um único build; API-A/API-B e worker-A/worker-B foram recriados no mesmo digest `sha256:51582f1cdfabf7deddd4a55c230526d19936ef139fc4171721c7cfafb43ccf01`. A migração 0023 foi aplicada, os quatro processos ficaram saudáveis, o endpoint de dependências retornou 200 e o serviço web systemd voltou a responder 200 pelo edge loopback `:3182`.

O E2E ativo real passou 3/3: proxy web/API, atividade persistente do participante com caso digital e ciclo administrativo sintético. O dashboard e a acessibilidade automatizada passaram 7/7, incluindo axe, landmarks, teclado, reflow e zoom equivalente. O build dos 12 workspaces passou, `pnpm audit --prod --audit-level high` não encontrou vulnerabilidades conhecidas e `git diff --check` passou. O teardown do fixture terminou com código 0 depois de limpar estados curriculares, atribuições e estados do caso digital; dados de auditoria sintética append-only continuam preservados por desenho.

Essa evidência fortalece a avaliação do runtime local, mas não altera a nota oficial 83,24/100: a origem continua dirty, não há commit/SHA de RC imutável, e permanecem os gates clínicos, externos, humanos, UAT, DR, CI/deploy/rollback e rastreabilidade 0/145. Uma credencial local de métricas exposta no diagnóstico foi rotacionada e não foi registrada em nenhum artefato.

## 13. Higiene final do E2E ativo

Em 2026-08-14T08:39:15-03:00, uma inspeção read-only encontrou oito fixtures sintéticos antigos deixados por execuções históricas com teardown incompleto. O fixture foi endurecido para purgar somente o namespace `real-e2e-*` e dependências mutáveis associadas, preservando a trilha append-only. A imagem foi reconstruída e os quatro processos HA foram recriados no digest comum `sha256:e9401f16ab08bcef018c916967990ef41cfb648fc4c055c49d40dab0702007f2`.

Após a correção, o E2E ativo passou 3/3 com `exit 0` e os contadores escopados de contas sintéticas, atividades, versões de conteúdo, estados de caso digital, estados curriculares e sessões ficaram em zero. Isso melhora a higiene local e a repetibilidade do teste; a nota oficial permanece 83,24/100 e os bloqueios externos, clínicos, humanos e de RC/SHA continuam abertos.

## 14. Verificação integral após a higiene do fixture

Em 2026-08-14T08:44:18-03:00, `pnpm verify` terminou com `exit 0`: 138 arquivos de teste, 639 testes, 18 skips governados e cobertura global de 85,28% statements / 81,36% branches / 86,88% functions / 85,99% lines. Passaram também lint, typecheck, decisões críticas, contratos 66/66, worker 24/24, migrations 24/24, secrets, governanças, arquitetura, documentação, produto e fronteira pública.

A rastreabilidade continua em `PASS_WITH_GAPS`: 135/145 evidências locais, 82/87 requisitos P0/P1, 10 gaps de elo, 0/145 cadeias completas e 145/145 commits/SHA pendentes. O resultado confirma qualidade local no worktree, mas não prova revisão clínica independente dos 763 conteúdos, IdP/MFA real, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback, UAT, WCAG manual, Web Vitals reais, soak, DR ou release candidate imutável. A nota oficial não foi promovida.

## 15. Confirmação final da experiência web e serviços

Em 2026-08-14T08:46:10-03:00, o dashboard do participante e o contrato automatizado de experiência/acessibilidade passaram 7/7 com Playwright contra o runtime HA ativo. O serviço web systemd estava `active`, a entrada web retornou HTTP 200, `/health/dependencies` retornou HTTP 200 e API-A/API-B/worker-A/worker-B estavam saudáveis no digest comum `sha256:e9401f16ab08bcef018c916967990ef41cfb648fc4c055c49d40dab0702007f2`.

Essa confirmação é local e automatizada. Não substitui WCAG manual com tecnologia assistiva, Web Vitals reais, UAT, soak, DR, CI/deploy/rollback, RC/SHA imutável, revisão clínica independente ou aprovação humana; a nota oficial permanece 83,24/100 e o disposition permanece `PILOT_BLOCKED`.

## 16. Fechamento local dos dez elos e verificação atual

Em 2026-08-14T10:42:04-03:00, a integração local do recálculo foi fechada com TDD: o fluxo passou a registrar candidatos em PostgreSQL com RLS, atualizar estado com controle otimista, publicar notificação em outbox e ser reconhecido pelo worker; a rota interna exige aprovação clínica. O lote também ligou `RF-063`, `RF-072`, `RF-073`, `RF-093`, `RF-094`, `RNF-012`, `RNF-072`, `RNF-075`, `RNF-084` e `RNF-086` a código, contratos, testes e artefatos locais.

`pnpm verify` passou com 161 arquivos de teste, 706 testes aprovados, 18 skips governados e cobertura global de 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines. Também passaram lint, typecheck, contratos 81/81, worker 24/24, migrations 29/29, secrets, decisões críticas, escopo, rastreabilidade, risco, skips, evidência, change control, acessibilidade automatizada, capacidade, Web Performance, jornada/correção, arquitetura, documentação, produto e fronteira pública.

`pnpm verify:premium-traceability` passou com 145/145 linhas de evidência local e 87/87 P0/P1, mas `completeChains=0`: as 145 linhas estão ancoradas no commit local `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`, enquanto estado/release e artefato de RC aprovado continuam pendentes. A migration `0028_assessment_recalculation_candidates` foi aplicada no PostgreSQL local; API-A/API-B e worker-A/worker-B foram recriados no digest comum `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`, com label `org.opencontainers.image.revision=e3aff802fe7ec104917e8cc6aa77bb0aea4f6229`; as rotas internas de recálculo, moderador e administração responderam 401 sem autenticação.

### Leitura atual da nota

A nota oficial permanece congelada em 83,24/100 (83 arredondada). O aumento de evidência local não autoriza recalcular ou promover a nota porque ainda faltam: revisão clínica independente dos 763 conteúdos; IdP/MFA/recovery real; DNS/TLS público; backup/RPO/RTO; CI/registry/deploy/rollback; worktree/SHA/manifesto; UAT, WCAG manual, Web Vitals reais, soak e DR. O recálculo está integrado localmente, mas sua entrega clínica externa/produção continua sem prova; a janela de manutenção aguarda horários hospitalares aprovados.

## 17. Correção do runtime web e E2E HA atual

A primeira execução da E2E HA após a integração falhou em 1/3 porque o processo Next servia um manifesto antigo enquanto `.next` havia sido regenerado; o chunk do `/admin` retornava HTTP 500. O web foi recompilado com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182` e o serviço local foi reiniciado.

Na repetição, `pnpm test:e2e:active-ha` passou 3/3: proxy real, atividade sintética persistida e ciclo administrativo completo de login, dashboard, suspensão, reativação e revogação de sessões. Essa evidência corrige o runtime local, mas não substitui produção, domínio/TLS gerenciado, IdP/MFA, backup externo, CI/deploy/rollback, UAT, WCAG manual, Web Vitals reais, soak, DR, beta clínico ou RC/SHA.

## 18. Verificação final

Às 10:51:57, a verificação integral repetida passou sem regressão: 161 arquivos, 706 testes, 18 skips, cobertura 83,78%/80,41%/84,95%/84,55%, 29 migrations, 145/145 linhas com evidência local e E2E HA 3/3. Depois, o commit local `4d8618d` limpou o worktree e o ensaio local de release/rollback passou. A nota oficial permanece 83,24/100 e o projeto permanece `PILOT_BLOCKED`, pois evidência local não fecha os gates externos nem aprova o RC.

## 19. Commit local, rastreabilidade e ensaio de release

O worktree foi consolidado no commit `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`, sem push. As 145 linhas da matriz agora apontam para esse SHA; não existem mais `GAP:commit-pending` ou `GAP:worktree-sha-pending`. O ensaio `CVG_RUN_LOCAL_RELEASE_REHEARSAL=true pnpm ops:rehearse-local-release` passou deploy, canário, rollback sintético e restauração do runtime com digest de release `sha256:8c3b2acd13236eefed6f5d639f133eb9e0dc28acd63fd4c861cb9d81d0684524` e rollback `sha256:cf03cb172580d36c7eecb1f706bbf1605c46f0377ca55061a2c1b870b27143dd`.

Essa evidência fecha o subproblema local de worktree/commit/rollback, mas não transforma as linhas em `VERIFIED`/`RELEASE_READY`: ainda faltam beta clínico, IdP/MFA, DNS/TLS público, backup externo/RPO/RTO, CI/registry/deploy externo, UAT, WCAG manual, Web Vitals reais, soak, DR, aprovação de manutenção e reauditoria.

## 20. Runtime RC local ancorado — 2026-08-14T11:15:28-03:00

Após o commit de implementação, o RC foi reconstruído com `CVG_SOURCE_SHA=e3aff802fe7ec104917e8cc6aa77bb0aea4f6229` e validado no digest `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`. API-A/API-B e worker-A/worker-B ficaram saudáveis com a mesma imagem e label de revisão; migrations `29/29` passaram. O snapshot documental posterior foi consolidado em `1501070` sem mudança de código. Health live/dependencies retornou `200/200`, enquanto as três superfícies internas sensíveis retornaram `401` sem autenticação. A E2E HA passou `3/3` e o ensaio local de release/rollback/restore passou com release digest `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea` e rollback sintético `sha256:76b84ecd58011cbbffca2594cd2ce75b23b7ab57e66ebc7ea384b8d30f7567a4`.

Às 11:20:56, `pnpm verify` integral final passou novamente com `161` arquivos, `706` testes, `18` skips governados, cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`, contratos `81/81`, worker `24/24`, migrations `29/29`, lint, typecheck, secrets, governanças e documentação verdes.

Essa evidência fecha o vínculo local entre source SHA imutável, imagem, runtime e rollback, mas não promove o RC. A nota permanece `83,24/100`, `completeChains=0/145` e `PILOT_BLOCKED`; continuam pendentes revisão clínica dos 763 conteúdos, IdP/MFA/recovery real, DNS/TLS público, backup externo/RPO/RTO, CI/registry/deploy externo, UAT, WCAG manual, Web Vitals reais, soak, DR, aprovação de manutenção e reauditoria independente.

## 21. Probes operacionais e preparação do beta — 2026-08-14T11:32:02-03:00

A fila clínica foi verificada contra o PostgreSQL live do runtime local: `796` conteúdos no escopo, `763` pendentes e não revisados, `0` aprovados e `0` falhas técnicas. A distribuição está pronta para a revisão clínica em beta com veterinários; isso não constitui aprovação clínica humana.

O load smoke local contra `/health/live` passou `5.000/5.000` requests com concorrência `100`, taxa de sucesso de `100%`, throughput `770,79 req/s`, média `127,19 ms` e p95 `300,56 ms`. Esse resultado amplia a evidência de capacidade local, mas não substitui soak produtivo de 24 horas.

Foi gerado backup PostgreSQL fora do repositório usando a conta administrativa de backup, com artefato `cvg-backup-20260814143123-a5642b64`, `284.640` bytes, SHA-256 `f7e45a90783fe1416133879cd148c466e9342199fa2cc2b59b39dc58bc9f83ea` e alvo RPO `PT1H`. O restore isolado passou com `artifactVerified=true`, `targetIsolated=true`, `32` objetos restaurados e RTO observado de `4.583 ms`. A tentativa com a conta de aplicação foi negada no schema `drizzle`, confirmando a separação de privilégios.

Os probes de IdP e segurança produtiva continuam `NOT_EXECUTED`; release manifest, traces locais e edge interno passam apenas em modo de exemplo/staging. A nota permanece `83,24/100`, a rastreabilidade `0/145` cadeias completas e o release `PILOT_BLOCKED` até os gates externos e humanos existirem.

## 22. Diagnóstico de CI remoto — 2026-08-14T11:38:12-03:00

O PR remoto `#1` possui runs `quality` falhos nos commits `d3964a9…`/`738906e…`. Os logs mostram que formato e contrato de CI passam, mas `pnpm verify:clinical-sources` falha porque o checkout do GitHub não contém os três PDFs licenciados registrados em `clinical-sources.json`. No workspace local, esses arquivos existem fora do Git e os hashes passam; `git ls-files` não contém PDFs.

A falha não deve ser resolvida versionando obras de terceiros nem removendo o gate. O caminho pendente é provisionar um bundle licenciado em armazenamento/artefato privado, com acesso CI read-only, materialização em diretório temporário e verificação dos hashes antes do `pnpm verify`. Até essa decisão/credencial existir, o CI remoto permanece não comprovado e a nota global não é promovida.

O inventário remoto read-only também retornou zero secrets, zero variables, zero environments e zero deployments configurados no repositório; `gh workflow list --all` mostrou somente `quality`. Portanto, não existe hoje evidência de registry, credencial de CI ou destino remoto de deploy/rollback. Nenhuma alteração remota foi executada.

## 23. RC validado no SHA executável e rollback local — 2026-08-14T11:57:48-03:00

O runtime foi reconstruído a partir do SHA executável `8cf40e567d02149b9f5714c8b1084b60bd291426`, com a imagem `cvg-trainee-vet:rc-head-8cf40e567d02` e digest `sha256:aa5dc1b767745734f92b10359bb35920b6ab2096ed7cc5c6ce4927e592ad92bb`. API-A/API-B e worker-A/worker-B ficaram saudáveis, todos reportando a mesma label `org.opencontainers.image.revision=8cf40e567d02149b9f5714c8b1084b60bd291426`; `/health/ready` e `/health/dependencies` retornaram `200/200` após a restauração.

`pnpm test:e2e:active-ha` passou `3/3` no RC atual. O ensaio local de release/rollback passou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`, com `releaseDigest=sha256:aa5dc1b767745734f92b10359bb35920b6ab2096ed7cc5c6ce4927e592ad92bb` e rollback sintético `sha256:32a8b4dfca1e383354b439cb9118229ea4dcd3824c33496efee30d10af81d5a4`.

Essa é a melhor evidência local de proveniência e reversibilidade até agora; não é CI/registry/deploy produtivo. A nota oficial permanece `83,24/100`, `completeChains=0/145` e `PILOT_BLOCKED`, pois revisão clínica dos `763` conteúdos, IdP/MFA/recovery real, DNS/TLS público, backup externo/RPO/RTO, CI remoto, UAT/WCAG manual, Web Vitals reais, soak, DR e reauditoria continuam sem prova autorizada.

## 24. Verificação integral no SHA do RC — 2026-08-14T12:03:46-03:00

`pnpm verify` passou integralmente no SHA do RC `8cf40e567d02149b9f5714c8b1084b60bd291426`: `161` arquivos de teste, `706` testes aprovados, `18` skips governados, cobertura `83,78%` statements / `80,41%` branches / `84,95%` functions / `84,55%` lines; contratos `81/81`, worker `24/24`, migrations `29/29`, lint, typecheck, secrets, governanças, arquitetura, documentação, produto e fronteira pública passaram. A documentação desta evidência foi consolidada depois, sem alteração de código executável.

É uma validação local automatizada. Ela não fecha revisão veterinária, identidade real, edge público, backup externo, CI/registry/deploy, UAT, WCAG manual, Web Vitals reais, soak, DR ou reauditoria; a nota e o disposition permanecem `83,24/100`, `completeChains=0/145` e `PILOT_BLOCKED`.

## 25. Inventário remoto do Hostinger — 2026-08-14T12:17:30-03:00

Foi feita inspeção read-only no Hostinger candidato. O host tem Ubuntu 24.04, Docker Compose, Caddy válido, UFW liberando 80/443 e certificados Let's Encrypt para outros subdomínios. Isso confirma capacidade genérica de edge, mas não a prontidão do Trainee Vet: não há projeto Compose, container, imagem, route ou FQDN do produto; os projetos existentes são de outros serviços.

Há backups locais de outro sistema em `/var/backups/cvg-his-v2`, mas não foram encontrados `restic`, `rclone`, `aws`, unidade específica do Trainee Vet nem agendamento de backup externo. Logo, não há prova de storage externo, retenção, RPO/RTO ou DR para este produto. O DNS existente aponta somente subdomínios já publicados; nenhum FQDN do Trainee Vet foi aprovado ou configurado.

Nenhuma escrita remota, criação de segredo, alteração de Caddy, deploy, restart ou modificação de backup foi realizada. A capacidade encontrada não muda as notas: a baseline permanece `83,24/100`, `completeChains=0/145` e `PILOT_BLOCKED`. O próximo passo é uma decisão humana sobre alvo, domínio, IdP, registry/CI, storage e rollback, seguida de provisionamento autorizado e reauditoria no mesmo RC.

## 26. Verificação integral após o inventário remoto — 2026-08-14T12:23:45-03:00

`pnpm verify` foi repetido depois das atualizações documentais e terminou com `exit 0`: `161` arquivos de teste, `706` testes aprovados, `18` skips governados, cobertura `83,78%` statements / `80,41%` branches / `84,95%` functions / `84,55%` lines, contratos `81/81`, worker `24/24`, migrations `29/29`, lint, typecheck, secrets, governanças, documentação, produto e fronteira pública aprovados.

Essa execução confirma consistência local, não prontidão externa. A baseline continua `83,24/100`, `completeChains=0/145` e `PILOT_BLOCKED`; os gates clínicos, IdP/MFA, DNS/TLS, backup externo, CI/registry/deploy, UAT, WCAG manual, Web Vitals reais, soak, DR e reauditoria seguem sem evidência autorizada.

## 27. RC atual, E2E web, failover e restore — 2026-08-14T12:46:44-03:00

O runtime HA foi reconstruído a partir do HEAD executável `16dcc2afda04866b1ecfaeb6017fe30bdadaa8be`, usando a imagem `cvg-trainee-vet:rc-head-16dcc2a` e digest `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`. API-A/API-B e worker-A/worker-B reportaram a mesma revisão, o mesmo digest e `health/ready=200` e `health/dependencies=200`.

O web foi recompilado com o proxy interno correto e reiniciado. A bateria sintética web passou `25/25`; os três testes dependentes do fixture de persistência passaram `3/3` em `pnpm test:e2e:active-ha`. A execução ampla que misturava o modo fixture com o modo ativo teve dois testes negativos por pré-condição de fixture ausente; ela foi descartada e os testes foram repetidos pelos comandos corretos, sem falha de produto. O failover controlado de uma réplica passou `500/500` requests, 100% de sucesso, média de `104,81 ms` e p95 de `626,14 ms`; a réplica foi restaurada no mesmo digest.

O restore live oficial passou `2/2` usando o procedimento do runbook, container PostgreSQL declarado e conexão administrativa fornecida somente por ambiente. A execução direta confirmou marcador sintético em banco isolado e RTO local de `3.832 ms`. O teste não fecha backup externo, retenção, RPO/RTO produtivos ou DR.

Os gates atuais de documentação e rastreabilidade permanecem verdes com gaps explícitos: `verify:documentation=PASS`, `verify:premium-traceability=PASS_WITH_GAPS`, `145/145` linhas locais, `87/87` P0/P1 e `0/145` cadeias completas; Web Performance permanece `PASS_WITH_GAPS` (`3` evidências, `2` medições, `4` gaps). O HA e o manifesto local passam, mas edge público, IdP/MFA, CI/registry/deploy externo, UAT manual, Web Vitals reais, soak, DR, revisão clínica e reauditoria ainda não têm evidência autorizada.

A baseline permanece `83,24/100`, estado `WAITING_HUMAN_APPROVAL` e disposição `PILOT_BLOCKED`. O próximo passo válido é provisionamento autorizado dos gates externos/humanos e reauditoria no mesmo RC; não há autorização para promoção por evidência local.

## 28. Verificação integral após o registro do RC atual — 2026-08-14T12:51:24-03:00

`pnpm verify` passou com `exit 0` após o registro do runtime atual e das evidências de failover/restore: `161` arquivos de teste, `706` testes aprovados, `18` skips governados, cobertura `83,78%` statements / `80,41%` branches / `84,95%` functions / `84,55%` lines; contratos `81/81`, worker `24/24`, migrations `29/29`, fontes clínicas locais, lint, typecheck, secrets, decisões críticas, arquitetura, governanças, documentação, produto e fronteira pública passaram. `git diff --check` também passou.

O resultado confirma a consistência do snapshot local e não promove a nota. `verify:premium-traceability` permanece `PASS_WITH_GAPS` com `145/145` linhas locais, `87/87` P0/P1 e `0/145` cadeias completas; o CI remoto, revisão clínica, produção pública, IdP/MFA, backup/RPO/RTO, UAT manual, Web Vitals reais, soak, DR e reauditoria continuam sem prova autorizada. Baseline `83,24/100`, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED` permanecem.

Os artefatos desta atualização foram consolidados no commit local convencional desta rodada, sem push e sem alteração do código executável; o worktree ficou limpo.

## 29. Web Vitals observados e carga delimitada — 2026-08-14T13:00:56-03:00

Foi executada medição real no navegador Chromium contra o web local atual: mobile `390×844` com HTTP 200, LCP `232 ms`, CLS `0` e INP proxy `120 ms`; desktop `1440×900` com HTTP 200, LCP `172 ms`, CLS `0` e INP proxy `144 ms`. A medição está dentro dos budgets locais, mas não é RUM de produção.

Uma carga delimitada adicional passou `20.000/20.000` requests HTTP 200 com concorrência `50`, throughput `889,41 req/s`, média `56,04 ms` e p95 `119,82 ms`. Isso fortalece a prova local de estabilidade, mas não fecha soak de 24 horas, saturação, SLO produtivo, UAT manual, screen reader, DR ou Web Vitals públicos. A evidência detalhada está em [`docs/115_local_web_vitals_capacity_evidence_2026-08-14.md`](115_local_web_vitals_capacity_evidence_2026-08-14.md).

A baseline permanece `83,24/100`, estado `WAITING_HUMAN_APPROVAL` e disposição `PILOT_BLOCKED`.

## 30. Reconsulta read-only do CI remoto — 2026-08-14T13:07:52-03:00

O GitHub foi reconsultado sem escrita. O PR `#1` continua aberto e seu head remoto permanece `d3964a9e45b624a4e3c3967ca8f684cb00210e8c`, anterior ao commit local atual. Os dois checks `quality` mais recentes continuam `FAILURE`; o checkout remoto segue sem o bundle licenciado das três fontes clínicas. A API do repositório confirmou `0` secrets, `0` variables, `0` environments e `0` deployments.

O commit local desta rodada não foi publicado, portanto não há evidência de CI, registry, deploy ou rollback do RC atual. Nenhuma alteração remota foi realizada. A nota permanece `83,24/100`, `completeChains=0/145`, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`.

As evidências desta reconsulta e da medição local foram consolidadas em commit local, sem alteração do código executável.

## 31. Fronteira segura para bundle clínico privado — 2026-08-14T13:18:25-03:00

Foi implementada uma fronteira parametrizada para que o CI autorizado materialize os três PDFs licenciados fora do checkout: `CVG_CLINICAL_SOURCES_DIRECTORY` aceita somente caminho absoluto externo ao repositório; os nomes de arquivo são tratados como basenames e traversal é rejeitado. O workflow `quality` expõe a variável opcional `vars.CVG_CLINICAL_SOURCES_DIRECTORY`, sem incluir conteúdo protegido no Git, no log ou em artefato público.

RED/GREEN passou com `11/11` testes focados (`ci-governance` e `clinical-source-location`), `pnpm verify:ci-contract` e `pnpm verify:clinical-sources` local. Essa mudança torna o contrato de bundle reproduzível, mas não inventa o bundle remoto: a execução GitHub ainda não foi repetida no RC, não há provider/credencial configurado e o CI continua `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED`. A baseline permanece `83,24/100` e `0/145` cadeias completas.

O código e a documentação desta melhoria foram consolidados no commit local `9bfa2c1` (`fix: support external clinical source bundle`), sem push.

## 32. Revalidação das primitivas de release — 2026-08-14T13:32:36-03:00

`pnpm ops:verify-release-manifest` passou no manifesto de exemplo, validando estratégia `EXPAND_CONTRACT`, canário `api-a/health/ready`, digest imutável do release e digest distinto de rollback. `pnpm ops:deploy-release` e `pnpm ops:rollback-release` passaram em `DRY_RUN`, portanto não fizeram pull, migração, restart, deploy, rollback ou escrita externa. `pnpm ops:verify-production-security` permaneceu `NOT_EXECUTED` sem ambiente produtivo aprovado.

O probe foi executado no HEAD `eb3ad76ebbd7f9e189907fb263009bf6f3a9137a`; o worktree permaneceu limpo e o registro foi consolidado em commit documental posterior, sem alteração executável. Esta verificação fortalece a prontidão local de release, mas não prova CI remoto, registry, deploy ou rollback produtivos; a nota permanece `83,24/100`, `0/145` cadeias completas, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`.

## 33. Revalidação live da fila clínica e do runtime — 2026-08-14T13:39:26-03:00

O edge local respondeu `200` em `/health/live`, `/health/ready` e `/health/dependencies`; `pnpm ops:verify-ha` e `pnpm ops:verify-edge-security` passaram. Dentro da rede do PostgreSQL HA, a fila clínica foi lida em modo somente leitura: `796` conteúdos, `763` pendentes, `763` não revisados, `0` aprovados, `0` ajustes solicitados e `0` falhas técnicas. O modo estrito falhou com `clinical review queue is incomplete: 763 pending items` e exit `1`, preservando o bloqueio de publicação.

Essa evidência confirma que a infraestrutura do beta está preparada para revisão por veterinários, mas não substitui as decisões clínicas humanas. Nenhum conteúdo foi aprovado, alterado ou publicado; a nota permanece `83,24/100`, o estado `WAITING_HUMAN_APPROVAL`, `0/145` cadeias completas e `PILOT_BLOCKED`.

## 34. Correção de drift e reconstrução do RC no SHA atual — 2026-08-14T13:51:47-03:00

O ensaio local de release havia restaurado a imagem `cvg-trainee-vet:local` com `CVG_SOURCE_SHA=unknown`; a divergência foi detectada antes de qualquer promoção e não foi tratada como prova de proveniência. A imagem foi reconstruída do HEAD `2e7a96b39c60139fc0bd0c642fb77800f5c6c00a`, com tag local `cvg-trainee-vet:rc-head-2e7a96b39c60` e digest `sha256:6d0d64b722a45d307ea36b9bbfbb4946b3ba4d0e2d0255e00e3aebb610898e27`.

API-A/API-B e worker-A/worker-B carregam exatamente o mesmo SHA e digest; health `200/200/200`, HA e edge passaram. A fila live permaneceu em `796` conteúdos, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; o modo estrito continua falhando para impedir publicação sem decisão clínica. A nota permanece `83,24/100`, `0/145` cadeias completas, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`.

O resultado fecha o subproblema local de proveniência no RC atual, mas não prova CI/registry/deploy/rollback produtivos, retenção externa, IdP/MFA, DNS/TLS público, beta veterinário, UAT, WCAG manual, Web Vitals reais, soak, DR ou reauditoria independente.

## 35. Rehearsal fail-closed por SHA e digest — 2026-08-14T14:04:54-03:00

O controlador `scripts/local-release-rehearsal.mjs` foi corrigido no commit executável `e70d3f415f38a5443a059c9800d023f95949957f`. Ele agora exige `CVG_SOURCE_SHA` explícito, valida o label OCI da imagem contra esse SHA e rejeita `unknown` ou mismatch antes de tocar no Docker; a restauração usa `image@digest`, não uma tag mutável.

Os testes focais passaram `6/6`; sem SHA o comando falhou antes de alterar o runtime. Com o SHA atual, o rehearsal passou `deploy=PASS`, `rollback=PASS` e `runtimeRestored=true`. O RC final local foi reconstruído no SHA `e70d3f415f38a5443a059c9800d023f95949957f`, com digest comum `sha256:63ac637774932b127f584745fda236bdc99a61c0a6a4c8ac12ca675ee7b6597c`; API-A/API-B e worker-A/worker-B reportaram o mesmo SHA/digest e health `200/200/200`.

Isso corrige o subproblema local de proveniência/reversibilidade, mas não transforma rehearsal em CI/registry/deploy/rollback produtivo. A nota permanece `83,24/100`, a rastreabilidade `0/145`, o estado `WAITING_HUMAN_APPROVAL` e a disposição `PILOT_BLOCKED`.
