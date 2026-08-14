# Relatório atual de construção e auditoria — CVG

**Data:** 2026-08-14
**Escopo:** documentação integral de `docs/`, código, testes, configuração e runtime local.
**Baseline canônica:** 83,24/100, arredondada para 83/100.

## 1. Conclusão executiva

O CVG está funcional e observável em ambiente local, mas ainda não está pronto para produção, piloto ou publicação clínica. A nota oficial permanece congelada em 83,24/100 porque a evidência atual é local/sintética, sem operação externa comprovada e sem os gates humanos/clínicos necessários. O worktree agora está limpo no commit local `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`; isso não equivale a um RC publicado ou aprovado.

Estado: `WAITING_HUMAN_APPROVAL`.
Disposição de release/piloto/publicação clínica: `PILOT_BLOCKED`.

## 2. Evidências executadas

- Foram lidos e reconciliados os 19 arquivos da pasta `docs/`, incluindo estado, log, backlog e registro canônico.
- `pnpm verify` integral (após RF-105/RF-106 e reconciliação da matriz): passou com 135 arquivos, 621 testes aprovados, 18 skips governados; cobertura de 86,25% statements, 82,37% branches, 86,95% functions e 86,99% lines. Também passaram os gates de migrações 22/22, decisões críticas, documentação, arquitetura, hotspots, rastreabilidade e `git diff --check`.
- Após essa verificação integral, RF-057/RF-058 receberam uma fatia local adicional: interação estruturada e dose/infusão com avaliação automática, caso digital progressivo, projeção pública segura, persistência PostgreSQL versionada com RLS e rotas GET/POST autenticadas. A verificação focalizada passou em 6 arquivos/79 testes; a matriz passou a 135/145 evidências locais, 82/87 P0/P1 e 10 gaps de elo local. A suíte integral ainda precisa ser reexecutada antes de qualquer nova fotografia de cobertura.
- A verificação integral subsequente passou após a atualização do inventário M24 e da expectativa de rotas: 138 arquivos de teste, 639 testes aprovados, 18 skips governados; cobertura de 85,28% statements, 81,36% branches, 86,88% functions e 85,99% lines; migrations 24/24 e todos os gates locais do `pnpm verify` verdes. A disposição continua `PILOT_BLOCKED`.
- Build dos 12 workspaces concluído.
- E2E HA ativo: 3/3 fluxos sintéticos aprovados com teardown código 0, incluindo caso digital persistente e ciclo administrativo.
- E2E ativo de dashboard e acessibilidade: 7/7 fluxos aprovados, incluindo axe, teclado, landmarks, reflow e zoom equivalente.
- Edge security: 7 diretivas estáticas e 2 destinos live aprovados.
- Smoke live: 200/200 requisições aprovadas, p95 de 186,68 ms.
- `pnpm audit --prod --audit-level high`: nenhuma vulnerabilidade conhecida.
- Runtime local: duas APIs, dois workers, PostgreSQL, Qdrant, Caddy, OTel, Tempo, Prometheus e Grafana ativos.
- Gate de segurança produtiva: falhou fechado pela ausência das 11 referências externas obrigatórias; não houve tentativa de contornar o gate.
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
| 15 | CI e reprodutibilidade | 86 | Contratos, lint, typecheck e build locais passam; CI remoto, registry, deploy e rollback não comprovados. |
| 16 | Rastreabilidade e controle de mudanças | 65 | Existem 145 requisitos e 145 linhas de evidência local ancoradas no commit local `4d8618d`; 0/145 cadeias estão completas porque estado/release, gates externos e reauditoria ainda não foram aprovados. |

## 4. Bloqueios que exigem resolução

1. 763 conteúdos sem revisão clínica independente.
2. IdP, MFA e recuperação de conta reais não executados.
3. DNS público e TLS gerenciado não comprovados.
4. Backups externos, retenção e RPO/RTO produtivos pendentes.
5. CI, registry, deploy e rollback atuais não comprovados.
6. Worktree local agora limpo e commitado; falta vincular o runtime ao SHA do RC e comprovar registry/deploy externo.
7. UAT, acessibilidade manual, Web Vitals reais, soak e DR pendentes.
8. 0/145 cadeias de rastreabilidade completas porque o estado/release e os gates externos ainda não foram aprovados, apesar do commit local já estar ancorado.
9. Recálculo de avaliações integrado localmente; entrega clínica externa e produção ainda não comprovadas.
10. Horários hospitalares de manutenção ainda não foram configurados/aprovados.

## 5. Limites da evidência

O runtime local não representa produção: a imagem em execução ainda precisa ser reconstruída com o label do SHA do RC local, o TLS live é interno/local, os dados do E2E são sintéticos e o gate produtivo permanece fail-closed. A revisão clínica deve ocorrer em beta controlado com veterinários autorizados, sem prontuários, pacientes, tutores, fotos, PDFs de terceiros ou dados identificáveis.

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

`pnpm verify:premium-traceability` passou com 145/145 linhas de evidência local e 87/87 P0/P1, mas `completeChains=0`: as 145 linhas estão ancoradas no commit local `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`, enquanto estado/release e artefato de RC aprovado continuam pendentes. A migration `0028_assessment_recalculation_candidates` foi aplicada no PostgreSQL local; API-A/API-B e worker-A/worker-B foram recriados no digest comum `sha256:8c3b2acd13236eefed6f5d639f133eb9e0dc28acd63fd4c861cb9d81d0684524`, e as rotas internas de recálculo, moderador e administração responderam 401 sem autenticação.

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
