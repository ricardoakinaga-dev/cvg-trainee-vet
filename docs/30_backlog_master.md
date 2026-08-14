# BACKLOG MASTER — CVG

Backlog operacional vivo. Itens só podem avançar quando suas dependências e gates estiverem satisfeitos.

**Estado atual (2026-08-14):** `ENT95-PROGRAM` — programa, roadmap e backlog Premium Enterprise 95 em execução controlada sobre a baseline vigente de **83/100**; gates locais de construção e runtime passam, enquanto os gates externos/humanos permanecem `WAITING_HUMAN_APPROVAL`. O gate de rastreabilidade confirma 145/145 linhas com evidência local de módulo/contrato/teste/artefato, incluindo 87/87 RF P0/P1; 0/145 cadeias estão completas porque estado/release, artefato remoto e reauditoria ainda não foram aprovados. O scorecard ponderado permanece 83,24/100, com 1/16 itens no alvo. O relatório foi salvo em `docs/112_current_construction_report_2026-08-14.md`, o overlay BLK-01…BLK-08 foi incorporado ao plano `0305`, roadmap `0510` e backlog `0511`, e a fronteira segura de bundle clínico foi registrada na política, CI e `traceability.yml`. A auditoria local confirmou testes, E2E, Web Vitals delimitados, carga, failover, restore e runtime local sem promover score. Bundle licenciado, CI/registry/deploy, mobilização clínica, T0 e recursos externos aguardam aprovação.

**Baseline canônica:** `BRIEFING/04.AUDIT/0491_full_construction_audit.md` — 16 itens entre 65 e 95, nota ponderada 83/100, release/piloto/publicação clínica não aprovados.

## 2026-08-14T13:32:36-03:00 — RELEASE-PRIMITIVES-RECHECK-124

- **evidência:** `pnpm ops:verify-release-manifest` passou; `pnpm ops:deploy-release` e `pnpm ops:rollback-release` passaram em `DRY_RUN`; `pnpm ops:verify-production-security` permaneceu `NOT_EXECUTED` sem ambiente produtivo aprovado; worktree limpo no HEAD `eb3ad76ebbd7f9e189907fb263009bf6f3a9137a`;
- **interpretação:** manifesto, canário, digest e rollback possuem contrato local fail-safe; não há prova de CI remoto, registry, deploy ou rollback produtivos;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` e `0/145` cadeias completas preservados;
- **próxima ação:** Ricardo aprovar alvo/provider/FQDN/IdP/storage/registry e janela de mudança; depois executar o gate externo e reauditar o mesmo RC.

## 2026-08-14T13:39:26-03:00 — LIVE-CLINICAL-QUEUE-RUNTIME-126

- **evidência:** health live/ready/dependencies `200/200/200`; `pnpm ops:verify-ha` e `pnpm ops:verify-edge-security` passaram; fila PostgreSQL live `796` total, `763` pendentes/não revisados, `0` aprovados, `0` ajustes e `0` falhas técnicas;
- **gate estrito:** falhou corretamente com `clinical review queue is incomplete: 763 pending items` e exit `1`, sem publicar ou alterar conteúdo;
- **interpretação:** BLK-01 está tecnicamente pronto para beta, mas não resolvido; a revisão será executada por veterinários autorizados em lotes auditáveis;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` e `0/145` cadeias completas preservados;
- **próxima ação:** aprovar roster/T0/ambiente clínico, executar calibração e lotes, depois revalidar o gate estrito e os demais gates no mesmo RC.

## 2026-08-14T13:51:47-03:00 — LOCAL-RC-PROVENANCE-REBUILD-127

- **evidência:** o rehearsal foi auditado e a imagem `cvg-trainee-vet:local` com `CVG_SOURCE_SHA=unknown` foi descartada como prova; a imagem foi reconstruída do HEAD `2e7a96b39c60139fc0bd0c642fb77800f5c6c00a` como `cvg-trainee-vet:rc-head-2e7a96b39c60`, digest `sha256:6d0d64b722a45d307ea36b9bbfbb4946b3ba4d0e2d0255e00e3aebb610898e27`;
- **runtime:** API-A/API-B e worker-A/worker-B reportaram o mesmo SHA/digest; health `200/200/200`, `pnpm ops:verify-ha` e `pnpm ops:verify-edge-security` passaram;
- **clínico:** fila live `796` total, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; o gate estrito falhou corretamente, sem publicação;
- **interpretação:** BLK-06 local corrigido e reforçado; o rehearsal não prova CI/registry/deploy/rollback produtivos, e retenção Tempo continua somente local;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` e `0/145` cadeias completas preservados;
- **próxima ação:** não aceitar drift em novo probe; provisionar os gates externos/humanos e reauditar o mesmo RC.

## 2026-08-14T14:04:54-03:00 — LOCAL-REHEARSAL-SHA-GUARD-128

- **entrega:** `scripts/local-release-rehearsal.mjs` agora exige `CVG_SOURCE_SHA`, valida o label OCI da imagem e restaura por `image@digest`; `unknown`/mismatch falham antes de qualquer execução Docker;
- **checks:** testes focais `6/6`, ausência de SHA falhou fail-closed, rehearsal com SHA válido passou `deploy=PASS`, `rollback=PASS` e `runtimeRestored=true`;
- **runtime:** commit executável `e70d3f415f38a5443a059c9800d023f95949957f`, digest comum `sha256:63ac637774932b127f584745fda236bdc99a61c0a6a4c8ac12ca675ee7b6597c`, quatro processos alinhados e health `200/200/200`;
- **limite:** BLK-06 local reforçado; CI/registry/deploy/rollback produtivos, gates clínicos/externos, UAT e `0/145` continuam pendentes;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` preservada;
- **próxima ação:** usar o RC `e70d3f4` como referência somente após provisionar as autorizações/ambientes externos e a coorte beta.

## 2026-08-14T14:09:16-03:00 — REMOTE-CI-INVENTORY-129

- **evidência:** PR `#1` aberto no head remoto `d3964a9e45b624a4e3c3967ca8f684cb00210e8c`; dois checks `quality` em `FAILURE`; inventário GitHub com `0` secrets, `0` variables, `0` environments e `0` deployments;
- **interpretação:** BLK-05/B-G5 continuam sem CI/registry/deploy/rollback produtivos; RC `e70d3f4` não foi publicado;
- **restrição:** nenhuma escrita, push ou trigger remoto foi executado;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; baseline `83,24/100` e `0/145` cadeias preservados;
- **próxima ação:** aprovar/provisionar bundle licenciado, runner, variáveis, registry e ambiente de promoção, depois reexecutar e reauditar.

## 2026-08-14T07:42:06-03:00 — TRACEABILITY-EVIDENCE-BATCH-098

- **status:** RF-057/RF-058 implementados localmente com evidência focalizada; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** interação estruturada e dose/infusão com avaliação automática, caso digital M24 persistente e versionado, projeção pública segura, migration `0023`, RLS, API GET/POST e tela do participante para registrar o avanço da etapa;
- **checks:** 6 arquivos/79 testes focalizados, typecheck/build dos workspaces afetados, inventário da API, migrations 24/24, rastreabilidade e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `135/145` evidências locais, `82/87` P0/P1, `10` gaps de elo e `145/145` commits/SHA pendentes;
- **limite:** evidência local e sintética no worktree; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** reexecutar `pnpm verify` integral e executar os 10 gaps locais restantes (`RF-063`, `RF-072`, `RF-073`, `RF-093`, `RF-094`, `RNF-012`, `RNF-072`, `RNF-075`, `RNF-084`, `RNF-086`) com TDD e revisão de segurança.

## 2026-08-14T07:51:44-03:00 — FULL-LOCAL-VERIFICATION-099

- **status:** verificação integral pós-RF-057/RF-058 concluída com sucesso; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** 138 arquivos/639 testes/18 skips; cobertura 85,28% statements / 81,36% branches / 86,88% functions / 85,99% lines; migrations 24/24; todos os gates locais do `pnpm verify` passaram;
- **correções de consistência:** inventário M24 e ordem de risco atualizados, inventário da API ajustado para 50 rotas e lint/typecheck de tipos e fixtures corrigidos;
- **resultado:** `0/145` cadeias completas, `135/145` evidências locais, `82/87` P0/P1, `10` gaps de elo e `145/145` commits/SHA pendentes;
- **limite:** nenhum score, release, piloto ou publicação clínica foi promovido; os gates externos, clínicos, humanos, UAT/DR e RC/SHA continuam pendentes;
- **próxima ação:** executar os 10 gaps locais restantes com evidência requisito-específica e manter em paralelo BLK-01…BLK-08.

## 2026-08-14T08:24:53-03:00 — ACTIVE-HA-RUNTIME-100

- **status:** runtime HA local reconciliado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** teardown do fixture corrigido para estados curriculares, atribuições e caso digital; imagem consolidada em build único; web reconstruído para o edge loopback `:3182`; credencial local de métricas rotacionada após diagnóstico;
- **checks:** migração 0023 aplicada; quatro processos saudáveis no mesmo digest; readiness/dependencies 200; E2E ativo real 3/3 com teardown código 0; dashboard/acessibilidade 7/7; build dos 12 workspaces e `pnpm audit --prod --audit-level high` passaram;
- **resultado:** rastreabilidade continua em `135/145` evidências locais, `82/87` P0/P1, `10` gaps de elo, `0/145` cadeias completas e `145/145` commits/SHA pendentes;
- **limite:** worktree e origem continuam dirty; runtime local não substitui RC/SHA, CI, deploy, rollback, revisão clínica, UAT, DR ou gates externos;
- **próxima ação:** executar os 10 gaps locais restantes e manter os bloqueios externos, clínicos, humanos e de release explícitos.

## 2026-08-14T08:44:18-03:00 — FULL-LOCAL-VERIFICATION-102

- **status:** verificação integral após higiene do fixture concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** fixture E2E limitado ao namespace sintético `real-e2e-*`; runtime HA consolidado no digest `sha256:e9401f16ab08bcef018c916967990ef41cfb648fc4c055c49d40dab0702007f2`; E2E real 3/3 e resíduos sintéticos escopados em zero;
- **checks:** `pnpm verify` passou com 138 arquivos/639 testes/18 skips e cobertura 85,28% statements / 81,36% branches / 86,88% functions / 85,99% lines; contratos 66/66, worker 24/24, migrations 24/24, secrets, documentação, produto e fronteira pública passaram;
- **resultado:** `0/145` cadeias completas, `135/145` evidências locais, `82/87` P0/P1, `10` gaps de elo e `145/145` commits/SHA pendentes; score oficial 83,24/100 sem promoção;
- **limite:** limpeza sintética e verificação local não substituem worktree/SHA aprovado, revisão clínica dos 763 conteúdos, IdP/MFA, DNS/TLS, backup/DR, CI/registry/deploy/rollback, UAT, WCAG manual, Web Vitals, soak ou aprovação humana;
- **próxima ação:** executar os 10 gaps locais com TDD/evidência direta e aguardar os ambientes/autorizações dos gates externos, clínicos, humanos e de release.

## 2026-08-14T08:46:10-03:00 — WEB-RUNTIME-VERIFICATION-103

- **status:** confirmação web e de serviços concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** Playwright dashboard/acessibilidade 7/7; serviço web systemd ativo; web HTTP 200; `/health/dependencies` HTTP 200; API-A/API-B e worker-A/worker-B saudáveis no digest comum `sha256:e9401f16ab08bcef018c916967990ef41cfb648fc4c055c49d40dab0702007f2`;
- **resultado:** experiência web automatizada reproduzível no runtime local; score 83,24/100 e release/piloto/publicação clínica sem promoção;
- **limite:** não substitui WCAG manual, Web Vitals reais, UAT, soak, DR, CI/deploy/rollback, RC/SHA, revisão clínica ou aprovação humana;
- **próxima ação:** fechar os 10 gaps locais com TDD/evidência direta e aguardar os gates externos, clínicos, humanos e de release.

## 2026-08-14T04:56:03-03:00 — TRACEABILITY-EVIDENCE-BATCH-087

- **status:** RF-071 concluído localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** recomendações allowlisted no dashboard do participante, com contrato estrito, TDD e E2E ativo;
- **checks:** testes focalizados 6/6, E2E 1/1, typecheck, lint, Prettier, `pnpm verify:traceability` e `pnpm verify:premium-traceability` passaram;
- **resultado:** `0/145` cadeias completas, `127/145` evidências locais, `74/87` P0/P1, `18` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** nenhum score, release, piloto ou publicação clínica foi promovido; os gates externos, clínicos, humanos e de RC/SHA permanecem abertos;
- **próxima ação:** executar os 18 gaps locais restantes com evidência requisito-específica e revalidar integralmente antes de qualquer promoção.

## 2026-08-14T05:09:07-03:00 — TRACEABILITY-EVIDENCE-BATCH-089

- **status:** RF-082 concluído localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** leitura interna da trilha append-only com autorização de auditor/admin, contrato estrito, persistência RLS read-only e rota inventariada;
- **checks:** testes focalizados 56/56, typecheck, lint, Prettier e verificadores de rastreabilidade passaram;
- **resultado:** `0/145` cadeias completas, `128/145` evidências locais, `75/87` P0/P1, `17` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** reexecutar a suíte integral, atualizar a fotografia operacional e continuar os 17 gaps restantes.

## 2026-08-14T05:11:05-03:00 — FULL-LOCAL-VERIFICATION-090

- **status:** verificação integral pós-RF-082 concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 129 arquivos/589 testes/18 skips e cobertura 86,39% statements / 82,27% branches / 87,16% functions / 87,11% lines; `git diff --check` passou;
- **resultado:** `0/145` cadeias completas, `128/145` evidências locais, `75/87` P0/P1, `17` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; revisão dos 763 conteúdos, gates externos, UAT e RC/SHA continuam pendentes;
- **próxima ação:** executar os 17 gaps locais restantes com evidência requisito-específica e aguardar autorizações/ambientes para fechar BLK-01…BLK-08 no mesmo RC/SHA.

## 2026-08-14T05:23:31-03:00 — TRACEABILITY-EVIDENCE-BATCH-091

- **status:** RF-107 concluído localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** contexto técnico mínimo allowlisted no fluxo de relatos, com contrato estrito, validação de domínio, migração PostgreSQL 0019, mapeamento persistente e projeção HTTP;
- **checks:** testes focalizados 78/78, typecheck, lint, Prettier, migrações, rastreabilidade e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `129/145` evidências locais, `76/87` P0/P1, `16` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** query strings, campos arbitrários, identificadores de paciente/tutor e anexos não fazem parte do contrato; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** reexecutar a suíte integral, atualizar a fotografia operacional e continuar os 16 gaps restantes.

## 2026-08-14T05:27:19-03:00 — FULL-LOCAL-VERIFICATION-092

- **status:** verificação integral pós-RF-107 concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 132 arquivos/595 testes/18 skips e cobertura 86,40% statements / 82,25% branches / 87,21% functions / 87,09% lines; `git diff --check` passou;
- **resultado:** `0/145` cadeias completas, `129/145` evidências locais, `76/87` P0/P1, `16` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; revisão dos 763 conteúdos, gates externos, UAT, DR e RC/SHA continuam pendentes;
- **próxima ação:** executar os 16 gaps locais restantes com evidência requisito-específica e aguardar autorizações/ambientes para fechar BLK-01…BLK-08 no mesmo RC/SHA.

## 2026-08-14T05:56:10-03:00 — TRACEABILITY-EVIDENCE-BATCH-093

- **status:** RF-103/RF-104 concluídos localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** lista de feedback participant/staff por escopo, projeções com redaction, capability de leitura, RLS staff read-only e workflow de triagem com prioridade, atribuição, resposta e histórico imutável na migração 0020;
- **checks:** testes focalizados 83/83, typecheck, lint, Prettier, migrations 21/21, hotspots, rastreabilidade, cobertura integral 606/18 skips e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `131/145` evidências locais, `78/87` P0/P1, `14` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** RF-103/RF-104 permanecem `MAPPED_PARTIAL`; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** iniciar RF-105/RF-106 com TDD, revisão de segurança e evidência requisito-específica; manter os gates externos e de RC/SHA abertos.

## 2026-08-14T06:07:56-03:00 — FULL-LOCAL-VERIFICATION-094

- **status:** verificação integral pós-RF-103/RF-104 concluída com `exit 0`; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** 134 arquivos/606 testes/18 skips e cobertura 86,53% statements / 82,28% branches / 87,30% functions / 87,26% lines; migrações 21/21, decisões críticas, documentação, arquitetura, hotspots, rastreabilidade, lint, typecheck e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `131/145` evidências locais, `78/87` P0/P1, `14` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; revisão dos 763 conteúdos e gates externos, humanos, UAT/DR e RC/SHA continuam pendentes;
- **próxima ação:** iniciar RF-105/RF-106 com TDD e revisão de segurança, sem alterar a nota 83,24/100 nem o bloqueio de release/piloto.

## 2026-08-14T06:40:25-03:00 — TRACEABILITY-EVIDENCE-BATCH-095 / FULL-LOCAL-VERIFICATION-096

- **status:** RF-105/RF-106 implementados localmente com evidência direta; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** retirada emergencial clínica com motivo, aprovador, contagem e participantes afetados persistidos; feedback com limite de 2.000 caracteres, bloqueio/redaction conservador e auditoria sem conteúdo bruto; migração 0021;
- **checks:** RED 6 suítes/8 falhas esperadas; GREEN 9 arquivos/99 testes focados; `pnpm verify` passou com 135 arquivos/621 testes/18 skips e cobertura 86,25% statements / 82,37% branches / 86,95% functions / 86,99% lines; migrações 22/22 e decisões críticas passaram;
- **resultado:** `0/145` cadeias completas, `133/145` evidências locais, `80/87` P0/P1, `12` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** RF-105/RF-106 continuam `MAPPED_PARTIAL` por commit/SHA e gates externos pendentes; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** executar os 12 gaps locais restantes com TDD, revisão de segurança e evidência requisito-específica, mantendo em paralelo BLK-01…BLK-08 e os gates clínicos/externos.

## 2026-08-14T06:43:41-03:00 — BUILD-LOCAL-097

- **status:** build local completo confirmado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `CVG_API_INTERNAL_URL=http://127.0.0.1:3000 pnpm build` passou nos 12 workspaces, incluindo as sete rotas web estáticas, API, worker e pacotes TypeScript;
- **limite:** evidência é local e não fecha DNS/TLS, registry, deploy, rollback, runtime por SHA, gates clínicos ou operação externa;
- **próxima ação:** executar os 12 gaps locais restantes com evidência requisito-específica e manter os gates externos/RC/SHA abertos.

## 2026-08-14T04:58:37-03:00 — FULL-LOCAL-VERIFICATION-088

- **status:** verificação integral pós-RF-071 concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 128 arquivos/583 testes/18 skips e cobertura 86,50% statements / 82,41% branches / 87,46% functions / 87,24% lines; E2E focalizado do dashboard 1/1 e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `127/145` evidências locais, `74/87` P0/P1, `18` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; revisão dos 763 conteúdos, gates externos, UAT e RC/SHA continuam pendentes;
- **próxima ação:** executar os 18 gaps locais restantes com evidência requisito-específica e aguardar autorizações/ambientes para fechar BLK-01…BLK-08 no mesmo RC/SHA.

**Aviso de reconciliação:** entradas históricas abaixo podem registrar notas 95 em recortes ou linguagem anterior sobre publicação automática. Elas não substituem a auditoria atual. O caminho vigente exige aprovação clínica humana de Ricardo, mantém 763 pendências e não altera nota até nova auditoria no mesmo SHA.

## ENT95-PROGRAM — Programa Premium Enterprise 95

- título: elevar cada um dos 16 itens da auditoria vigente para pelo menos 95/100
- descrição: executar sete fases, 14 sprints e 70 tasks com produto P0/P1 integral, fábrica clínica paralela, segurança, acessibilidade, operação, CI/CD e rastreabilidade enterprise
- módulo: programa / produto / conteúdo / plataforma / operação / qualidade
- dependência: `D-ENT-01` equipe/T0, `D-ENT-07` capacidade clínica e `D-ENT-09` envelope orçamentário; gates externos D-ENT-02–06 por frente
  - fase: BUILD — Premium Enterprise 95 / E0–E2 execução local controlada
- risco: crítico — declarar 95 por média ou recorte deixaria gaps clínicos, funcionais e operacionais ocultos
- impacto: alto
- status: WAITING_HUMAN_APPROVAL
- baseline: 83/100; nenhum score foi alterado pelo planejamento
- evidência: `BRIEFING/03.BUILD/0304_premium_enterprise_95_program.md`; `BRIEFING/04.AUDIT/0492_score_95_roadmap.md`; `BRIEFING/04.AUDIT/0493_score_95_backlog.md`; artifact `PREMIUM-ENTERPRISE-95-PROGRAM`
  - próxima ação: manter `ENT95-04-C` até saturação, soak, failover/recuperação e perfil/SLO aprovados; manter `ENT95-13-B` até evidência manual; fechar `ENT95-01-C`, `ENT95-14-C` e `ENT95-14-D` somente com aprovação/SHA/CI; Ricardo aprovar equipe, capacidade clínica, T0 e gates D-ENT-02–06; não liberar release, piloto ou publicação clínica.

## P0 — CRÍTICO

### PRE-SPEC-01 — Alinhamento de produto e arquitetura

- título: aprovar as decisões de conta, dashboards, feedback, KPIs e base técnica antes da SPEC
- descrição: congelar autenticação, papéis, cartões, fluxo de relatos, métricas, arquitetura proporcional, fronteira de RAG, observabilidade, acessibilidade e agente operacional de IA
- módulo: produto / arquitetura pré-SPEC
- dependência: direção D-090 confirmada; Anexo 0020 revisado
- fase: PRD — alinhamento anterior à SPEC
- risco: alto — iniciar SPEC sem essas fronteiras gera retrabalho e permissões inconsistentes
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0020_alinhamento_produto_pre_spec.md
- resultado: D-091 a D-100 aprovadas integralmente por MV. Ricardo Akinaga em 2026-08-06; alinhamento congelado como baseline da futura SPEC

### B07-01 — Blueprint diagnóstico

- título: validar blueprint das 120 questões diagnósticas
- descrição: revisar a matriz das três sessões, cobertura clínica, estrutura cognitiva, avaliabilidade, equidade e aderência à política D-077
- módulo: conteúdo / avaliação diagnóstica
- dependência: PRD 0017, os três livros registrados em `clinical-sources.json` e pré-voo automático
- fase: pré-piloto — conteúdo diagnóstico
- risco: alto — blueprint inadequado contamina a baseline e a personalização
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0012_blueprint_diagnostico_b07.md; `packages/curriculum/src/source-registry.ts`; `clinical-sources.json`; `docs/101_clinical_source_policy.md`
- resultado: blueprint e referências ativas foram normalizados para os três livros autorizados; o pré-voo rejeita fontes fora do registro. A prova semântica texto-a-texto de cada redação permanece um gap separado, sem criar gate humano de publicação.

### B07-02 — Produção dos itens diagnósticos

- título: produzir 120 itens originais em três sessões de 40
- descrição: escrever os itens conforme o blueprint, com cenários fictícios, gabaritos/rubricas testados, respostas aceitas e rastreabilidade interna por módulo/fonte
- módulo: conteúdo e avaliação
- dependência: B07-01 e pré-voo automático de fonte
- fase: pré-piloto — produção de conteúdo
- risco: crítico — erro clínico, ambiguidade ou cópia bloqueia a aplicação
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `packages/curriculum/src/authoring.ts`; `packages/curriculum/src/learning-runtime.ts`; `packages/application/src/authoring-use-cases.ts`; `packages/persistence/src/content-repository.ts`; testes de currículo/autoria/API
- resultado: banco B-07 de 120 itens, dividido em 40/40/40, está materializado no runtime e no caminho de publicação automática; nenhum gate clínico humano é requisito ativo. Permanecem apenas a verificação semântica integral dos textos contra os livros e a aplicação real da baseline.

### B07-03 — Revisão e pré-voo

- título: executar pré-voo automático e testar a avaliabilidade dos 120 itens
- descrição: verificar referências canônicas, redação registrada, scoring determinístico, respostas aceitas, feedback e comportamento de interrupção com dados sintéticos, sem aprovação clínica humana como dependência de software
- módulo: governança clínica e qualidade da avaliação
- dependência: B07-02 e registry imutável das três fontes
- fase: pré-piloto — qualidade de conteúdo
- risco: crítico
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `packages/curriculum/src/source-registry.test.ts`; `packages/curriculum/src/learning-runtime.test.ts`; `packages/application/src/authoring-use-cases.test.ts`; `pnpm verify:clinical-sources`; `docs/101_clinical_source_policy.md`
- resultado: o pré-voo automático valida fontes, publicação e projeção pública; B-07 sai do estado de rascunho técnico para `PUBLICADO` no runtime. A validação de campo/piloto e a checagem semântica completa dos textos ainda não foram executadas.

### CUR-24-01 — Fatia vertical do Mês 2

- título: produzir e validar um módulo completo de emergência
- descrição: criar quatro sessões, dois casos fictícios, quiz, questões objetivas, duas respostas abertas, rubricas, feedback e referências; medir carga do participante e correção por Ricardo
- módulo: programa curricular V3 / emergência
- dependência: aprovação humana do PRD 0017 e da carga mensal — satisfeita em D-087
- fase: PRD — validação da proposta curricular
- risco: alto — sem protótipo a carga de autoria e correção é apenas estimativa
- impacto: alto
- status: READY_FOR_NEXT_STEP
- evidência: PRD 0017; Anexos 0013 a 0019; commit curricular c1d3023; fatia vertical 91cb9e7; protocolo/T0/T1 2d0d608; aprovação D-088
- próxima ação: selecionar e agendar dois a três veterinários autorizados para executar T2 conforme o Anexo 0018

### CUR-24-02 — Catálogo executável e camada de eficácia hospitalar

- título: materializar a grade de 24 meses com questões, testes, retenção e transferência digital
- descrição: representar módulos, sessões, objetivos, audiência, comportamentos hospitalares, modalidades de avaliação, D+30/D+60/D+90, métrica de processo e regras de domínio; projetar alternativas simples/múltiplas sem campos internos; preparar seed versionado sem publicação automática
- módulo: programa curricular V3 / conteúdo / avaliação / participante
- dependência: PRD 0017, Anexo 0022, Anexo 0024 e `clinical-sources.json`
- fase: BUILD — Phase 3 / SCORE-95-03
- risco: alto — conteúdo incorreto ou publicação sem revisão pode causar dano educacional e clínico
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0495_pesquisa_praticas_mundiais_treinamento_hospitalar.md`; `BRIEFING/04.AUDIT/0496_curriculum_runtime_preflight.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0017_programa_curricular_24_meses.md`; artifact `CURRICULUM-HOSPITAL-DESIGN-003`
- código: `packages/curriculum/src/catalog.ts`; `packages/curriculum/src/learning-runtime.ts`; `packages/curriculum/src/projection.ts`; `packages/curriculum/src/content-seed.ts`; `packages/contracts/src/learning.ts`; `packages/application/src/curriculum-runtime-use-cases.ts`; `packages/persistence/src/activity-repository.ts`; `packages/persistence/src/curriculum-runtime-repository.ts`; `packages/persistence/src/schema.ts`; `packages/persistence/drizzle/0007_small_khan.sql`; `packages/persistence/drizzle/0008_abnormal_zzzax.sql`; `packages/persistence/drizzle/0009_nappy_nightcrawler.sql`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/web/app/page.tsx`
- testes: `tests/integration/curriculum-catalog.test.ts`; `packages/contracts/src/learning.test.ts`; `packages/persistence/src/activity-repository.test.ts`
- testes adicionais: `tests/e2e/participant-access.spec.ts`; `tests/integration/postgres-activity-content.test.ts`
- testes adicionais: `packages/curriculum/src/learning-runtime.test.ts`; `packages/application/src/curriculum-runtime-use-cases.test.ts`; `packages/persistence/src/curriculum-runtime-repository.test.ts`; `tests/integration/curriculum-catalog.test.ts`; `tests/integration/curriculum-runtime.test.ts`; 15 testes direcionados do runtime/catalog
- verificação: `pnpm verify`; `pnpm typecheck`; `pnpm build`; `pnpm --filter @cvg/curriculum typecheck`; 5 E2E sintéticos; 17 testes live PostgreSQL/Qdrant e 1 skip por configuração; migração 0009 aplicada
- resultado parcial: catálogo, B-07 120/40/40/40, packs dos 24 módulos, diagnóstico por tema, domínio/remediação/retenção, projeção pública com seleção simples/múltipla e seed versionado funcionam; fontes são limitadas aos três livros e a publicação automática está habilitada
- próxima ação: executar a verificação semântica automatizada e a aplicação da baseline quando o ambiente de piloto existir; não reintroduzir aprovação clínica humana como gate de software

### CUR-24-03 — Runtime educacional e pré-voo técnico

- título: conectar diagnóstico, domínio, remediação, retenção e trilha ao ciclo educacional
- descrição: manter B-07 e os packs internos versionados; persistir estado educacional na jornada autorizada, preservar correção humana para respostas abertas, validar formas equivalentes e preparar pré-voo de conteúdo sem publicação automática
- módulo: programa curricular V3 / diagnóstico / aprendizagem / avaliação
- dependência: CUR-24-02; pré-voo automático das três fontes
- fase: BUILD — Phase 3 / SCORE-95-03
- risco: alto — erro de conteúdo, scoring ou transição pode induzir aprendizado inseguro
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0496_curriculum_runtime_preflight.md`; artifact `CURRICULUM-RUNTIME-INTEGRATION-005`; `packages/curriculum/src/learning-runtime.ts`; `packages/application/src/curriculum-runtime-use-cases.ts`; `packages/persistence/src/curriculum-runtime-repository.ts`; `packages/contracts/src/learning.ts`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`; migração `0009_nappy_nightcrawler.sql`
- resultado: preflight técnico passa, B-07 tem 120 itens e packs versionados cobrem o catálogo; diagnóstico não punitivo, remediação dirigida e D+30/D+60/D+90 estão modelados; o estado digital é persistido, versionado e projetado com segurança na API/web; o caminho ativo publica após a verificação automática de fonte
- próxima ação: completar a persistência de cada atividade mensal e E2E de fluxo completo; não tratar aprovação clínica humana como dependência ativa

### ARCH-04-01 — Boundary arquitetural executável

- título: tornar o mapa de módulos, dependências e adapters verificável no código
- descrição: materializar a arquitetura SPEC 0101–0103 em uma policy de manifests e imports; bloquear dependência server-side na web, acesso direto a SQL/SDK na borda e imports inversos entre camadas; documentar rollback sem publicar conteúdo
- módulo: arquitetura / modularidade / build
- dependência: item 3 com score técnico >=95; nenhuma dependência de aprovação clínica para o artefato não publicador
- fase: BUILD — Phase 3 / SCORE-95-04
- risco: médio — acoplamento invisível gera retrabalho, quebra de isolamento e dificulta auditoria
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `architecture-boundaries.json`; `BRIEFING/04.AUDIT/0497_architecture_boundary_audit.md`; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0103_mapa_de_modulos.md`
- testes: `tests/integration/architecture-boundaries.test.ts` (RED antes da policy; GREEN com 2 testes)
- verificação: `pnpm verify:architecture`; `pnpm verify` (63 arquivos/283 testes, 9 skips); `pnpm typecheck`; `pnpm build`; `pnpm test:e2e` (5/5); integração live (14 arquivos/20 testes, sem skips); `pnpm audit --audit-level=high`; `git diff --check`
- resultado: os 12 manifests e imports de produção são comparados com allowlist/denylist; domínio/currículo/contratos permanecem independentes de server-side; API/worker usam composição; web não importa banco, configuração ou SDK externo
- gap: extração futura de ports compartilhados, integração web com contratos/UI e cadeia commit/artefato permanecem nos itens próprios
- próxima ação: manter a policy no gate contínuo; item 4 já foi reavaliado em 95/100 e o item 5 foi liberado pela ordem

### DOMAIN-05-01 — Domínio, contratos e regras de negócio

- título: materializar invariantes e contratos do item 5 com TDD
- descrição: implementar regras puras para tentativa, conteúdo, avaliação, atribuição, resultado, ticket, contestação, remediação, retenção, idempotência, versionamento e fronteira pública, sem antecipar persistência/API/web
- módulo: domínio / contratos / regras de negócio
- dependência: ARCH-04-01 fechado em 95/100
- fase: BUILD — Phase 3 / SCORE-95-05
- risco: alto — regra incorreta de nota, estado ou exposição pode gerar aprendizagem insegura ou vazamento de informação interna
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0498_domain_contract_matrix.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `traceability.yml`
- código: `packages/domain/src/timestamp.ts`; `attempt.ts`; `answer.ts`; `assessment.ts`; `assessment-policy.ts`; `content.ts`; `learning-state.ts`; `appeal.ts`; `packages/contracts/src/assessment.ts`; `correction.ts`; `learning.ts`; `learning-state.ts`
- testes: testes de domínio/contratos e casos de uso de tentativa, resposta e correção; RED/GREEN/REFACTOR registrados na matriz 0498
- verificação: `pnpm verify` (63 arquivos/283 testes, 9 skips); cobertura 85,09%/80,27%/87,56%/85,82%; `pnpm build` (12 workspaces); `pnpm test:e2e` (5/5); integração live (14 arquivos/20 testes, sem skips); `pnpm audit --audit-level=high`; `git diff --check`
- resultado: item 5 reavaliado em **95/100**; os gaps de persistência, RLS contextual, rotas e telas foram transferidos aos itens próprios sem declarar conclusão indevida
- próxima ação: item 5 fechado em 95; manter limites de persistência e API nos itens próprios

### PERSISTENCE-06-01 — Baseline de persistência, migrações e integridade

- título: ligar regras do domínio às entidades e invariantes PostgreSQL
- descrição: revisar SPEC 0109–0111, modelar tabelas/relacionamentos, migrações, FK, unicidade, histórico, optimistic version, idempotência, transações, rollback e RLS contextual
- módulo: persistência / migrações / integridade / governança de dados
- dependência: DOMAIN-05-01 com score >=95
- fase: BUILD — Phase 4 / SCORE-95-06
- risco: crítico — inconsistência ou isolamento insuficiente pode corromper resultados ou permitir acesso cruzado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0499_persistence_integrity_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md` item 6; SPEC 0109–0111; `packages/persistence/src/schema.ts`; migrations `0000`–`0011`
- código: `packages/persistence/src/learning-state-repository.ts`; `packages/persistence/src/index.ts`; `packages/persistence/drizzle/0010_classy_kronos.sql`; `packages/persistence/drizzle/0011_daffy_nova.sql`
- testes: `packages/persistence/src/learning-state-repository.test.ts`; `tests/integration/postgres-learning-state.test.ts`
- verificação: `pnpm verify` (64 arquivos/289 testes, 10 skips); cobertura 85,23%/80,05%/87,48%/85,87%; `pnpm build` (12 workspaces); `pnpm test:e2e` (5/5); integração live (15 arquivos/21 testes, sem skips); `pnpm db:migrate`; `pnpm audit --audit-level=high`; `git diff --check`
- resultado: item 6 reavaliado em **95/100**; quatro entidades têm FK, índices, constraints condicionais, versionamento otimista, rollback e RLS contextual comprovados com papel live sem `SUPERUSER`/`BYPASSRLS`
- gap: RLS do domínio legado, usuário de produção sem privilégio amplo, retenção/anonimização, backup/restore e operação de recuperação permanecem nos itens próprios
- próxima ação: abrir `API-07-01` e escrever RED para contratos/rotas/autoridade server-side das entidades persistidas

### API-07-01 — API e superfície funcional backend

- título: expor a primeira fatia persistida por contratos e rotas seguras
- descrição: implementar contratos versionados, validação de entrada/saída, autorização server-side, escopo, envelopes, idempotência e integração API/PostgreSQL para atribuições, workflow de resultado, tickets e contestações
- módulo: API / aplicação / contratos / autorização
- dependência: `PERSISTENCE-06-01` fechado em 95/100
- fase: BUILD — Phase 5 / SCORE-95-07
- risco: alto — rota sem autorização ou sem controle de versão pode expor/alterar estado educacional indevidamente
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0500_api_surface_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md` item 7; `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0106_contratos_de_aplicacao.md`; `0107_contratos_de_api.md`; `0111_permissoes_governanca_e_auditoria.md`; `0118_estrategia_de_testes_rastreabilidade_e_verificacao.md`
- código: `packages/application/src/learning-state-use-cases.ts`; `packages/application/src/authorization.ts`; `packages/contracts/src/learning-state.ts`; `apps/api/src/http.ts`; `apps/api/src/main.ts`; `apps/api/src/server.ts`
- testes: `packages/application/src/learning-state-use-cases.test.ts`; `packages/application/src/authorization.test.ts`; `packages/contracts/src/learning-state.test.ts`; `apps/api/src/http.test.ts`; `apps/api/src/server.test.ts`
- verificação: `pnpm verify`/`pnpm test:coverage` (65 arquivos/299 testes, 10 skips; cobertura 85,11%/80,15%/87,02%/85,81%); `pnpm lint`; `pnpm typecheck`; `pnpm build` (12 workspaces); `pnpm test:e2e` (5/5); integração live (15 arquivos/21 testes, sem skips); `pnpm audit --audit-level=high`; gates de documentação/traceability; `git diff --check`
- resultado: item 7 reavaliado em **95/100** no escopo da primeira fatia backend persistida; oito operações têm contrato strict, autorização server-side por papel/escopo, projeções redigidas, versionamento e erros públicos consistentes
- gap: dashboard, trilha completa, filas editoriais, GETs paginados, E2E navegador→API real, idempotência distribuída e operação de produção permanecem nos itens próprios
- próxima ação: abrir `SECURITY-08-01` e escrever RED para RLS legado, conexão sem privilégio amplo, recuperação/rotação, rate limit e isolamento live

### SECURITY-08-01 — Segurança, identidade, autorização e privacidade

- título: fechar isolamento, identidade e proteção de dados nas superfícies legadas e novas
- descrição: aplicar RLS contextual às tabelas legadas sensíveis, usar conexão sem privilégio amplo, provar recuperação/rotação de sessão e convite, reforçar rate limit e executar testes live negativos sem `SUPERUSER`/`BYPASSRLS`
- módulo: segurança / identidade / autorização / privacidade
- dependência: `API-07-01` fechado em 95/100
- fase: BUILD — Phase 6 / SCORE-95-08
- risco: crítico — falha de isolamento pode expor dados educacionais ou permitir alteração fora do escopo
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0501_security_isolation_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md` item 8; SPEC 0111–0113 e 0118; migrations 0012/0013
- código: `packages/persistence/src/security-context.ts`; `packages/persistence/src/database.ts`; `packages/persistence/src/rate-limit-repository.ts`; repositórios protegidos; `packages/application/src/transaction-context.ts`; `apps/api/src/request-security.ts`; `apps/api/src/server.ts`; `apps/api/src/main.ts`
- testes: `tests/integration/postgres-security-isolation.test.ts`; `packages/persistence/src/security-context.test.ts`; `packages/persistence/src/rate-limit-repository.test.ts`; `apps/api/src/request-security.test.ts`; `apps/api/src/server.test.ts`
- verificação: 67 arquivos/309 testes, 11 skips; cobertura 84,81%/80,03%/86,69%/85,48%; build 12 workspaces; E2E 5/5; live 15 arquivos/21 testes, 1 skip; migrations 0012/0013; audit e diff passaram
- resultado: item 8 reavaliado em **95/100**; RLS contextual, contexto vazio/cruzado, papel sem `SUPERUSER`/`BYPASSRLS`, menor privilégio e rate limit compartilhado passaram em teste live
- gaps: grants/provisionamento de produção, restore/RPO/RTO, tabelas editoriais/administrativas fora da fatia e E2E navegador→API real permanecem nos itens próprios

### JOURNEY-09-01 — Jornada mínima do participante

- título: fechar a jornada vertical de aprendizagem do participante
- descrição: ligar diagnóstico, trilha, atividade, tentativa, avaliação, resultado, remediação, retenção e retomada em contratos, persistência, API, web e autorização, sem expor campos internos ou declarar competência prática
- módulo: participante / currículo / avaliação / web / API
- dependência: `SECURITY-08-01` fechado em 95/100
- fase: BUILD — Phase 7 / SCORE-95-09
- risco: alto — sem jornada completa a construção não entrega o fluxo operacional prometido ao hospital
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0502_learning_journey_audit.md`; `packages/application/src/journey-use-cases.ts`; `packages/persistence/src/journey-repository.ts`; `packages/contracts/src/journey.ts`; `GET /api/v1/learning-path`; `apps/web/app/page.tsx`
- verificação: 70 arquivos/323 testes, 11 skips; cobertura 85,01%/80,19%/86,53%/85,72%; E2E 6/6; live 1/1 no cenário de jornada; typecheck/lint/build/audit/secrets/exposure/documentação/traceability/diff passaram
- resultado: item 9 reavaliado em **95/100**; a jornada agregada segura lê atribuições, atividades/tentativas, workflows, runtime e próxima ação, removendo campos internos e negando participante cruzado
- gaps: jornada completa de 24 meses, dashboard, autoria/contestação operacional, E2E navegador→API real, aprovação clínica e operação/restore permanecem nos itens próprios

### AUTHORING-10-01 — Banco autoral e revisão governada

- título: materializar autoria, revisão, avaliação somativa, contestação e publicação clínica controlada
- descrição: ligar registros autorais versionados a objetivos, gabaritos/rubricas internas, revisão item a item, correção, resultado e recurso, sem permitir publicação automática por IA
- módulo: autoria / avaliação / governança clínica / API / web
- dependência: `JOURNEY-09-01` fechado em 95/100; aprovação de Ricardo para conteúdo clínico
- fase: BUILD — Phase 8 / SCORE-95-10
- risco: crítico — conteúdo clínico sem revisão ou avaliação incorreta pode causar dano operacional
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0503_authoring_review_audit.md`; migration `0014_salty_penance.sql`; `packages/curriculum/src/authoring.ts`; `packages/application/src/authoring-use-cases.ts`; `packages/persistence/src/authoring-repository.ts`; `packages/contracts/src/authoring.ts`; `apps/api/src/http.ts`; `apps/web/app/authoring/page.tsx`
- testes: autoria/currículo/aplicação/persistência/contratos/API; `tests/integration/postgres-authoring-workflow.test.ts`; `tests/e2e/authoring-review.spec.ts`; worker handlers/loop
- verificação: 74 arquivos/341 testes, 12 skips; cobertura 84,69%/80,08%/85,74%/85,38%; E2E 7/7; integração live 16 arquivos/22 testes, 1 skip; migration 0014; typecheck/lint/build/audit/secrets/exposure/documentação/traceability/diff passaram
- resultado: item 10 reavaliado em **95/100**; autoria versionada, preflight, revisão independente, gate de publicação, persistência e superfície interna estão executáveis sem expor gabarito/fonte ao participante
- gaps: aprovação de Ricardo, revisão item a item/aplicação real dos bancos, tela completa de prova/recurso, E2E navegador→API real e transação única editorial permanecem pendentes
- próxima ação concluída: abrir `RESILIENCE-11-01`

### RESILIENCE-11-01 — Worker, índice derivado e recuperação

- título: provar processamento não vazio, reconciliação, retry, replay e degradação segura
- descrição: cobrir todos os eventos emitidos, indexação/remoção/reconciliação no Qdrant, lease/retry/dead-letter, recovery e IA estruturada sem autoridade editorial
- módulo: worker / Qdrant / IA / resiliência / observabilidade
- dependência: `AUTHORING-10-01` fechado em 95/100
- fase: BUILD — Phase 9 / SCORE-95-11
- risco: alto — evento não tratado ou índice divergente pode atrasar publicação/retirada ou gerar sugestão inconsistente
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0504_worker_resilience_audit.md`; `apps/worker/src/handlers.ts`; `apps/worker/src/loop.ts`; `apps/worker/src/reconcile.ts`; `packages/integrations/src/qdrant.ts`; `packages/integrations/src/ai.ts`; `tests/integration/worker-qdrant-live.test.ts`; `tests/integration/postgres-worker.test.ts`
- verificação: cobertura 74 arquivos/343 testes/14 skips com 84,70%/80,08%/85,76%/85,38%; E2E 7/7; integração live 18 arquivos/25 testes sem skips; typecheck/lint/build/audit/documentação/traceability/exposure/diff passaram
- resultado: matriz de eventos completa, conteúdo não vazio, divergência/órfão/replay/retirada, lease expirado, retry e dead-letter passaram; item 11 reavaliado em **95/100**
- gaps: restart observável, provider produtivo, telemetria externa, carga, restore e CI com dependências live permanecem nos itens próprios
- próxima ação concluída: abrir `OBSERVABILITY-12-01`

### OBSERVABILITY-12-01 — Observabilidade e recuperação operacional

- título: provar observabilidade, dependências, alertas e recuperação operacional
- descrição: fechar health/dependencies, collector/exporter, correlação, redaction, métricas, SLO, traces, dashboards, runbooks, backup/restore e RPO/RTO
- módulo: observabilidade / API / worker / operação / banco
- dependência: `RESILIENCE-11-01` fechado em 95/100
- fase: BUILD — Phase 10 / SCORE-95-12
- risco: alto — falha silenciosa ou recuperação não testada pode ocultar degradação e impedir continuidade hospitalar
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0505_observability_operations_audit.md`; `BRIEFING/08.RUNTIME/0804_observability_operational_contract.md`; `apps/api/src/http.ts`; `apps/api/src/server.ts`; `packages/observability/src/observability.ts`; `packages/observability/src/operations.ts`; `scripts/verify-postgres-restore.mjs`; `tests/integration/api-health.test.ts`; `tests/integration/postgres-restore.test.ts`
- verificação: health/dependencies, exporter protegido, redaction, correlação, SLO/alertas, restore live, cobertura, typecheck, lint, build, E2E, integração live, audit, secrets, documentation, traceability, exposure e diff-check
- resultado: item 12 reavaliado em **95/100**; RTO local medido em 2.581 ms e marcador sintético restaurado em destino isolado
- gaps: collector/OTel externo, retenção efetiva, dashboard provisionado, traces distribuídos, crash/failover, carga e múltiplas réplicas permanecem pendentes

### EXPERIENCE-13-01 — Jornada web e acessibilidade verificáveis

- título: fechar as superfícies de treinamento, equipe e operação com experiência acessível
- descrição: ligar telas à API real, materializar loading/empty/error/forbidden/stale/retry, aplicar axe/revisão manual, teclado/foco/semântica/contraste e manter projeção pública redigida
- módulo: web / API / acessibilidade / experiência operacional
- dependência: `OBSERVABILITY-12-01` fechado em 95/100
- fase: BUILD — Phase 11 / SCORE-95-13
- risco: alto — jornada incompleta ou inacessível reduz transferência do treinamento e pode ocultar erro operacional
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: E2E navegador→API real, estados de experiência, axe/revisão manual, autorização e fronteira pública sem campos internos; nota >=95 no artifact de auditoria
- evidência: `BRIEFING/04.AUDIT/0506_web_ux_accessibility_audit.md`; `apps/web/app/page.tsx`; `apps/web/app/authoring/page.tsx`; `apps/web/app/operations/page.tsx`; `apps/web/app/layout.tsx`; `apps/web/next.config.ts`; `tests/e2e/experience-accessibility.spec.ts`; `tests/e2e/real-runtime.spec.ts`
- verificação: web typecheck/build; E2E mockado 12/12; E2E real 14/14 com API/PostgreSQL; axe, teclado/foco, retry, empty, stale, viewport estreito e fronteira pública
- resultado: item 13 reavaliado em **96/100**; proxy real validado sem expor URL, segredo ou payload; leitor de tela/usuários e superfícies completas do PRD permanecem gaps
- próxima ação concluída: abrir `QUALITY-14-01`

### QUALITY-14-01 — Gate de testes e evidência executável

- título: fechar cobertura, integração live, E2E real e evidência reprodutível
- descrição: transformar a suíte atual em gate por camadas, fortalecer módulos fracos, eliminar skips indevidos e ligar um fixture participante sintético ao API/PostgreSQL real
- módulo: testes / coverage / integração / E2E / segurança
- dependência: `EXPERIENCE-13-01` fechado em 96/100
- fase: BUILD — Phase 12 / SCORE-95-14
- risco: alto — teste parcial ou evidência mockada pode mascarar regressão clínica/operacional
- impacto: alto
- status: COMPLETED_WITH_GAPS
- critério de pronto: cobertura >=80%, comandos por camada, live sem skips indevidos, E2E participante real, falhas e limites auditados, nota >=95
- evidência: `BRIEFING/04.AUDIT/0507_test_quality_evidence_audit.md`; `scripts/real-e2e-fixture-server.mjs`; `scripts/build-e2e.mjs`; `scripts/run-live-integration.mjs`; `scripts/verify-migrations.mjs`; `tests/e2e/real-runtime.spec.ts`; `tests/integration/api-core-health.test.ts`; `tests/integration/migration-governance.test.ts`; `.github/workflows/quality.yml`
- verificação: coverage 352 pass/17 fora por configuração; contract 12/36; worker 4/24; live PostgreSQL 18/26 sem skips; Qdrant 21/29 sem skips; restore 1/1; E2E padrão 12/12; E2E real 14/14; verify/build/typecheck/lint/audit/secrets/documentação/traceability/exposure/diff verdes
- resultado: item 14 reavaliado em **96/100**; fluxo participante real mínimo persistido concluído sem exposição de campos internos
- gaps: cobertura por módulo desigual, execução remota do CI, carga/failover/restart e operação externa permanecem registrados
- próxima ação concluída: fechar `QUALITY-14-01` e abrir `CI-15-01`

### CI-15-01 — Execução remota e reprodutibilidade

- título: provar o workflow de qualidade e fechar o contrato de build
- descrição: executar o workflow alterado, anexar cobertura/JUnit/Playwright, validar migrations e reconciliar ambiente local/CI
- módulo: CI / build / runtime / release
- dependência: `QUALITY-14-01` fechado em 96/100
- fase: BUILD — Phase 13 / SCORE-95-15
- risco: alto — divergência entre local e CI pode esconder regressão antes do ambiente hospitalar
- impacto: alto
- status: COMPLETED_WITH_GAPS
- resultado: `BRIEFING/04.AUDIT/0508_ci_reproducibility_audit.md` reavaliou o item em **95/100**; o repositório privado foi publicado em `origin/main`, e o workflow `31380183984` passou no SHA `dd4790973e31e1c3799c58cf99701128367b055b` em 4m20s. O artifact `9059654877` preservou 99 arquivos, coverage, Playwright e JUnit, com digest `fe7e25c3701dd511bec0000397076b063c00cf5d115d155acefb6637f1f625ee`.
- evidência adicional: `.nvmrc`; `.env.example`; `scripts/verify-ci-contract.mjs`; `tests/integration/ci-governance.test.ts`; `.github/workflows/quality.yml`; `playwright.config.ts`; auditoria 0508; `https://github.com/ricardoakinaga-dev/cvg-trainee-vet/actions/runs/31380183984`
- verificação adicional: `pnpm verify` (77 arquivos/356 testes; 17 skips; cobertura 84,92%/80,34%/85,89%/85,61%); `pnpm build`; `pnpm audit --audit-level=high`; migrations; live estendido 23/32; E2E 12/12 e real 14/14; `pnpm verify:ci-contract`; `git diff --check`; CI remoto integralmente verde
- gaps: rollback de deployment, cache quente, carga, failover, restart e múltiplas réplicas não foram exercitados; falhas remotas anteriores e cache miss foram registrados sem apagar histórico
- critério de pronto: workflow remoto verde, artefatos redigidos, ambiente reproduzível e score >=95 no artifact do item 15
- próxima ação: abrir o item 16 — rastreabilidade de código e controle de mudança — sem misturar os gates clínicos, de piloto e de operação externa

### B07-04 — Aplicação da baseline

- título: aplicar o diagnóstico à coorte inicial
- descrição: aplicar as três sessões aos aproximadamente 10 veterinários e consolidar somente os dados permitidos, sem gravações, prontuários, tutores ou casos reais identificáveis
- módulo: piloto / baseline
- dependência: B07-03 aprovado; autorização de Ricardo; controles mínimos de D-077 prontos
- fase: piloto — baseline
- risco: crítico — envolve dados pessoais e decisão operacional externa
- impacto: alto
- status: PENDENTE

### AUD-C0-001 — Gate typecheck/build (encerrado)

- título: corrigir os dois erros estritos que impedem o gate de qualidade e o build monorepo
- descrição: corrigir o acesso potencialmente indefinido em `packages/integrations/src/ai.ts:211` e a asserção de fixture em `packages/integrations/src/ai.test.ts:226`; reexecutar `pnpm verify` e `pnpm build` sem mascarar a falha
- módulo: qualidade / integrações / CI
- dependência: nenhuma; execução técnica autorizada, sem decisão de produto
- fase: BUILD/AUDIT — bloqueio de release
- risco: encerrado — a falha estrita foi corrigida; manter os gates verdes em cada mudança
- impacto: alto
- status: COMPLETED
- evidência: `packages/integrations/src/ai.ts`, `packages/integrations/src/ai.test.ts`; `pnpm typecheck`; `pnpm build`
- resultado: acesso potencialmente indefinido do vetor determinístico e fixture indexada foram corrigidos; `pnpm typecheck`, `pnpm build` e `pnpm verify` passam sem mascarar a falha

### AUD-C0-002 — Conteúdo curricular e B-07

- título: fechar fonte, produção e pré-voo automático do diagnóstico e da primeira fatia curricular
- descrição: verificar B07-01, produzir B07-02/B07-03, executar o pré-voo automático dos três livros e separar a publicação digital da aplicação de baseline
- módulo: conteúdo / governança clínica / piloto
- dependência: registry/hash dos três livros; participantes autorizados continuam necessários somente para eventual piloto
- fase: pré-piloto / piloto
- risco: crítico — programa não pode ser aplicado sem conteúdo clínico autoral revisado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `docs/101_clinical_source_policy.md`; `clinical-sources.json`; B07-01, B07-02, B07-03; `pnpm verify:clinical-sources`; `packages/application/src/authoring-use-cases.ts`
- resultado: não existe aprovação clínica humana como bloqueio no caminho ativo; a rota, o contrato e o caso de uso de revisão de autoria foram removidos, e B-07/packs têm publicação automática condicionada ao registry técnico. A tabela histórica da migration 0014 não é lida nem escrita pelo caminho ativo. Piloto, competência prática e verificação semântica integral continuam fora da prova já executada.

## P1 — ALTA PRIORIDADE

### AUD-P1-001 — Fechamento da jornada de produto

- título: implementar e provar diagnóstico, trilha, avaliação completa, remediação, retenção, contestação e dashboards
- descrição: transformar os requisitos PRD ainda ausentes em fatias verticais com contratos, persistência, autorização, web e E2E
- módulo: produto / aplicação / web / API
- dependência: AUD-C0-001 e domínio base estável
- fase: BUILD — Phase 3–5
- risco: alto — a construção atual não entrega o produto declarado
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `packages/application/src/dashboard-use-cases.ts`; `packages/contracts/src/dashboard.ts`; `apps/api/src/http.ts`; `apps/web/app/dashboard/page.tsx`; `apps/web/app/account/page.tsx`; `apps/web/app/admin/page.tsx`
- resultado: dashboard do participante, roadmap de 24 meses, KPIs operacionais, conta/segurança, recuperação/MFA por adapter e superfície administrativa estão implementados e protegidos por projeções estritas. Fluxo mensal persistido completo e provedor externo de identidade permanecem gaps de integração.

### AUD-P1-002 — RLS contextual e isolamento live

- título: aplicar defesa de escopo no banco para dados de negócio
- descrição: materializar contexto/policies para participante, autor, revisor e administrador; adicionar testes negativos de acesso cruzado em PostgreSQL real
- módulo: segurança / persistência
- dependência: contrato de papéis e escopos da SPEC
- fase: BUILD — hardening
- risco: alto — autorização somente na aplicação não fecha a defesa em profundidade
- impacto: alto
- status: PENDENTE — hardening operacional residual
- evidência: `BRIEFING/04.AUDIT/0501_security_isolation_audit.md`; `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; migrations 0012/0013; RLS contextual comprovado live na fatia participante/execução, com papel sem bypass
- resultado parcial: contexto transacional, policies `ENABLE/FORCE`, menor privilégio e rate limit compartilhado foram fechados no item 8; grants/provisionamento de produção, restore/RPO/RTO e tabelas fora da fatia ainda não foram executados

### AUD-P1-003 — E2E real e CI com dependências

- título: executar navegador contra API, PostgreSQL e Qdrant descartáveis no CI
- descrição: provisionar serviços sintéticos, subir API real, executar fluxos de convite/atividade/tentativa e registrar artefatos de smoke
- módulo: CI / E2E / integração
- dependência: AUD-C0-001
- fase: BUILD — Phase 6
- risco: alto — os E2E atuais interceptam a API e não provam integração real
- impacto: alto
- status: PENDENTE
- evidência: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `tests/e2e/participant-access.spec.ts`

### AUD-P1-004 — Operação, observabilidade e restore

- título: fechar collector, alertas, traces, retenção, backup/restauração e recuperação
- descrição: implementar a superfície operacional mínima, executar runbooks e comprovar RPO/RTO e reconciliação não vazia
- módulo: runtime / observabilidade / operação
- dependência: ambiente de homologação descartável
- fase: BUILD — Phase 6
- risco: alto — não há prova suficiente de operação ou recuperação
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `docs/102_operational_evidence_2026-08-10.md`; `infra/production/docker-compose.ha.yml`; `infra/observability/otel-collector-config.yaml`; `infra/observability/prometheus.yml`; `scripts/run-load-smoke.mjs`; `scripts/verify-ha-topology.mjs`
- resultado: collector OTLP, retenção de métricas, traces recebidos, carga, failover Caddy e múltiplas réplicas foram executados em Docker descartável com 100% de respostas no smoke normal e no smoke pós-failover. Backend durável de traces, deployment externo, alertas exercitados e restore de produção permanecem gaps.

### AUD-P1-005 — Congelamento e rastreabilidade da construção

- título: rastrear código, teste, commit e artefato do estado auditado
- descrição: incluir apps/packages/tests no commit intencional, atualizar traceability manifest e reauditar o mesmo SHA
- módulo: governança / release engineering
- dependência: AUD-C0-001
- fase: BUILD/AUDIT
- risco: alto — o HEAD auditado não contém os arquivos técnicos da construção
- impacto: alto
- status: IN_PROGRESS
- evidência: `traceability.yml`; `docs/99_runtime_state.md`; `docs/20_master_execution_log.md`; `docs/30_backlog_master.md`; `docs/100_full_program_audit_2026-08-10.md`; `docs/101_clinical_source_policy.md`; `docs/102_operational_evidence_2026-08-10.md`; `docs/103_followup_program_status_2026-08-10.md`; `git status --short`; `git diff --check`
- resultado: a reconciliação de requisito→SPEC→backlog→código→teste→artefato foi atualizada para a rodada atual; a remoção do gate executável está coberta por teste negativo de rota e suíte completa verde. O trabalho ainda está no worktree e não recebeu um novo commit final nesta rodada.

### GATE-01 — Aprovar reexecução do Discovery

- título: reexecutar e submeter 0090 Discovery Validation
- descrição: aprovar D-101 a D-108 e a reexecução técnica do gate sobre o checkpoint Git identificado
- módulo: governança de gates
- dependência: pacote técnico do Anexo 0021 e checkpoint Git revisado
- fase: Discovery
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: commit f6fefa1; BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY/0090_discovery_validation.md; BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md
- resultado: aprovado por MV. Ricardo Akinaga em 2026-08-07

### GATE-02 — Aprovar reexecução do PRD

- título: reexecutar e submeter 0090 PRD Validation
- descrição: depois do Discovery, aprovar o PRD tecnicamente validado no mesmo checkpoint Git
- módulo: governança de gates
- dependência: aprovação humana de GATE-01; pode ocorrer sequencialmente na mesma manifestação
- fase: PRD
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: commit f6fefa1; BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0090_prd_validation.md; BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md
- resultado: aprovado por MV. Ricardo Akinaga em 2026-08-07, depois do Discovery

### LIT-01 — Consolidar leitura da literatura e matriz curricular

- título: registrar a leitura dos três PDFs e a aplicação curricular por fonte
- descrição: validar páginas, hashes, estrutura, capítulos prioritários, matriz dos 24 meses e regras de conversão da literatura em conteúdo autoral do CVG
- módulo: conteúdo / governança de fontes
- dependência: D-075, D-086 e D-109 aprovadas/refinadas; PDFs locais disponíveis
- fase: PRD — preparação de conteúdo antes da autoria em escala
- risco: alto — fonte sem rastreabilidade aumenta risco clínico, autoral e de atualização
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0022_leitura_literatura_e_matriz_curricular.md; hashes conferidos contra Anexo 0010
- resultado: leitura integral processada; matriz pronta para autoria; rastreabilidade restrita ao workflow interno por D-109; nenhum PDF ou derivado foi versionado

### DOC-01 — Auditoria de requisitos e coerência pré-construção

- título: confirmar cobertura do objetivo do programa e remover contradições documentais antes da SPEC Fase 1
- descrição: auditar acesso, conta, área do participante, dashboards, trilha, avaliações, métodos pedagógicos, literatura, direitos autorais, dados e gates; alinhar toda superfície participante a D-109
- módulo: governança documental / produto
- dependência: PRD aprovado, Anexo 0022 e D-109
- fase: PRD — auditoria de prontidão antes da SPEC Fase 1
- risco: alto — requisito contraditório pode chegar ao domínio, à interface ou ao controle autoral
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0023_auditoria_requisitos_e_coerencia.md
- resultado: cobertura confirmada; RF-097 e formulações antigas de busca/citação/referência simples corrigidas; 0101 e BUILD continuam aguardando autorização/gate

### AUTH-01 — Template interno de autoria e revisão

- título: transformar a matriz literária em um fluxo repetível de conteúdo autoral
- descrição: definir ficha de intenção pedagógica, registro interno de fontes, rubricas, feedback, remediação, revisão clínica, projeção sem metadados e pré-voo sintético
- módulo: conteúdo / governança editorial
- dependência: LIT-01 e DOC-01 concluídos; autorização humana para 0101 não é necessária para o template documental
- fase: PRD — preparação editorial antes da construção
- risco: alto — autoria sem checklist pode gerar erro clínico, exposição autoral ou item não avaliável
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0024_template_autoria_revisao_interno.md
- resultado: template pronto para autoria controlada; não é esquema de API/banco e não autoriza produção em escala, B-07, publicação ou BUILD

## P2 — MÉDIO

### SPEC-01 — Preparar SPEC

- título: iniciar SPEC somente após aprovação canônica do PRD
- descrição: criar readiness, visão arquitetural, domínio, contratos, dados, segurança, observabilidade e plano de build derivados do PRD aprovado
- módulo: SPEC
- dependência: PRE-SPEC-01 concluído; aprovação humana sequencial de GATE-01/GATE-02
- fase: SPEC
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0100–0190; Anexo 0027; `0190_spec_validation.md` = `SPEC_APROVADA_TECNICAMENTE`
- resultado: arquitetura API/SPA/worker, PostgreSQL, Qdrant, IA, testes, rastreabilidade e backlog concluídos; documentação do BUILD liberada

### BUILD-DOC-01 — Documentação pré-execução do BUILD

- título: criar master, roadmap e backlog executável do BUILD
- descrição: materializar 0300, 0301 e 0302 com fases, sprints, tasks, critérios, riscos, rollback e validação
- módulo: BUILD / planejamento
- dependência: SPEC 0190 aprovada
- fase: BUILD — pré-execução
- risco: alto — começar código sem planejamento quebra o gate
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/03.BUILD

### DOC-04-08 — Completar documentação operacional

- título: fechar AUDIT, loop/persistência, skills, agents e runtime
- descrição: escrever instruções específicas do CVG, contratos de estado, critérios de auditoria, governança do Codex e operação de PostgreSQL/Qdrant/IA
- módulo: documentação transversal
- dependência: SPEC 0190; BUILD documental em andamento
- fase: documentação pré-código
- risco: alto — sem continuidade e verificação o código não deve começar
- impacto: alto
- status: COMPLETED
- critério de conclusão: todos os arquivos requeridos presentes, coerentes, revisados e registrados no gate final 0391

### B0-S1 — Scaffold e verificação inicial

- título: criar workspace TypeScript strict, testes, configuração segura e pipeline local
- descrição: materializar apps/packages da SPEC, schemas de ambiente sem segredos, PostgreSQL/migração, Qdrant, embeddings, IA server-side, composição e comandos de qualidade
- módulo: foundation/CI
- dependência: BUILD-DOC-01 e gate 0391 concluídos
- fase: BUILD — Phase 0
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/03.BUILD/0302_backlog_master.md; traceability.yml; packages/persistence; packages/integrations
- próximo passo: iniciar B1 com testes RED de domínio e contratos

### F2-S1 — API e persistência núcleo

- título: materializar PostgreSQL transacional, outbox e API HTTP mínima
- descrição: criar atividade/tentativa/idempotência, optimistic version, eventos redigidos, health e smoke live
- módulo: persistence / API
- dependência: B0-S1 e B1 concluídos
- fase: BUILD — Phase 2
- risco: crítico
- impacto: alto
- status: COMPLETED
- evidência: `packages/persistence/src/attempt-repository.ts`, `apps/api/src/http.ts`, teste live PostgreSQL/Qdrant e relatório scoped 0490

### F2-S2 — Sessão, resposta e auditoria

- título: fechar SaveAnswer, sessão server-side, auditoria mínima e health agregado de integrações
- descrição: persistir resposta e replay na mesma transação, usar cookie/hash server-side, proteger auditoria com RLS/append-only, expor somente projeção do participante e inicializar/verificar Qdrant habilitado
- módulo: application / persistence / API / integrations
- dependência: F2-S1
- fase: BUILD — Phase 2
- risco: crítico
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `traceability.yml`/`F2-S2-SESSION-ANSWER-AUDIT`, `tests/integration/postgres-answer-session.test.ts`, teste live Qdrant, `pnpm verify`
- gaps remanescentes: convite/recuperação, RLS contextual completo, worker/retry, observabilidade, web/E2E e IA externa real; consultar 0420/0421
- próximo passo: auditoria scoped F2-S2 e abertura de F3-S1

### F3-S1 — Conteúdo publicado e leitura de atividade

- título: disponibilizar atividade publicada por atribuição, com conteúdo versionado e projeção participante
- descrição: criar versões de conteúdo e itens de atividade no PostgreSQL; ler somente atividade atribuída, publicada e autorizada; ordenar itens e remover `scopeId`/metadados internos no contrato público
- módulo: aprendizagem / conteúdo / API
- dependência: F2-S2
- fase: BUILD — Phase 3
- risco: crítico — leitura fora de escopo ou exposição autoral
- impacto: alto
- status: COMPLETED_WITH_GAPS
- evidência: `traceability.yml`/`F3-S1-PUBLISHED-ACTIVITY`, migração `0003_fluffy_psylocke.sql`, `tests/integration/postgres-activity-content.test.ts`, `pnpm build`, `pnpm test:coverage`
- resultado: atividade atribuída com estado `DISPONIVEL`/`EM_ANDAMENTO`/`EM_REFORCO`, atividade `PUBLISHED` e conteúdo `PUBLICADO` é lida do PostgreSQL e exposta somente como projeção pública; dados sintéticos não carregam fonte, foto, PDF, OCR ou conteúdo clínico protegido
- gaps remanescentes: criação/revisão/publicação por papel, currículo completo, correção/progresso, RLS contextual, worker/outbox, observabilidade, web/E2E e IA real continuam fora desta fatia
- próximo passo: auditoria scoped F3-S1 e abertura de F3-S2 para identidade completa, correção/progresso e ciclo educacional

### F3-S2 — Conteúdo editorial, progresso e integrações

- título: materializar transição editorial, projeção de progresso e processamento assíncrono seguro;
- descrição: autorizar transições por papel e escopo, publicar/retirar versões com outbox redigido, derivar próxima ação do participante, processar eventos com lease/retry/dead-letter lógico, indexar Qdrant e persistir sugestões IA somente como `DRAFT_AI` interno;
- módulo: conteúdo / aprendizagem / worker / integrações;
- dependência: F3-S1;
- fase: BUILD — Phase 3;
- risco: alto — processamento assíncrono inconsistente ou exposição de conteúdo interno;
- impacto: alto;
- status: COMPLETED_WITH_GAPS;
- evidência: `traceability.yml`/`F3-S2-CONTENT-PROGRESS-WORKER-AI`, migrações `0003_fluffy_psylocke.sql` e `0004_outstanding_green_goblin.sql`, `tests/integration/postgres-content-workflow.test.ts`, `tests/integration/postgres-worker.test.ts`, `tests/integration/qdrant-live.test.ts`, `pnpm test:coverage`;
- resultado: PostgreSQL permanece autoridade; worker processa eventos sintéticos com lease/retry, Qdrant recebe apenas IDs/hash/escopo, IA fake grava rascunho revisável e as projeções públicas não carregam `participantId`, `scopeId`, fonte, foto, PDF, OCR ou prompt;
- gaps remanescentes: identidade completa, correção/feedback, RLS contextual, reconciliação, observabilidade, web/E2E, backup/restore e IA externa real;
- próximo passo: executar auditoria scoped F3-S2 e abrir a fatia de identidade/correção.

### F3-S3 — Identidade, correção e feedback

- título: materializar convite interno de uso único, ativação segura, correção humana versionada e feedback do participante;
- descrição: criar convite somente para `ADMIN`, persistir apenas hash, ativar conta e sessão em transação, corrigir resposta aberta com resultado versionado e expor feedback apenas ao dono;
- módulo: identidade / assessment / aprendizagem / API / persistence;
- dependência: F3-S2;
- fase: BUILD — Phase 3;
- risco: alto — acesso indevido, token reutilizado ou feedback cruzado;
- impacto: alto;
- status: IN_PROGRESS_WITH_VERIFIED_CORE;
- evidência: `traceability.yml`/`F3-S3-IDENTITY-CORRECTION-FEEDBACK`, migrações `0005_rapid_pixie.sql` e `0006_unknown_randall_flagg.sql`, testes unitários/API e `tests/integration/postgres-invitation.test.ts`/`postgres-correction.test.ts`;
- resultado: token hash-only e aceite único foram comprovados no PostgreSQL; correção humana e feedback por dono foram comprovados com idempotência e projeção redigida; cobertura global está acima de 80% em todas as métricas;
- gaps remanescentes: RLS contextual, currículo completo, remediação/contestação, observabilidade externa, web completo/API real, execução operacional conjunta da reconciliação, backup/restore e IA externa real;
- próximo passo: auditar os complementos F3-S4/F3-S5/F3-S6/F3-S7/F3-S8 e construir jornadas web reais em fatias TDD.

### F3-S4 — Web participante e E2E

- status: `COMPLETED_WITH_GAPS`;
- evidência: `traceability.yml`/`F3-S4-WEB-PARTICIPANT-E2E`, `apps/web/app/page.tsx`, `tests/e2e/participant-access.spec.ts`, `playwright.config.ts` e workflow de qualidade;
- resultado: aceite de convite, erro público limitado, projeção sem `participantId`/fonte/foto e ciclo iniciar–salvar–submeter passam em três cenários Playwright sintéticos; CI roda a suíte depois do build;
- gaps remanescentes: API real no navegador, autoria/operação, acessibilidade automatizada/manual, observabilidade externa, execução operacional conjunta da reconciliação, backup/restore e IA externa real;
- próximo passo: consolidar os complementos de auditoria e iniciar E2E contra serviços locais e jornadas de autoria/operação.

### F3-S5 — Observabilidade e redaction

- status: `COMPLETED_WITH_GAPS`;
- evidência: `traceability.yml`/`F3-S5-OBSERVABILITY-REDACTION`, `packages/observability`, telemetria do API server/worker e testes unitários;
- resultado: logs estruturados allowlisted, correlação local, contadores/histogramas em memória, eventos de request/batch e testes negativos sem payload passam;
- gaps remanescentes: exporter/collector OpenTelemetry, retenção/acesso, alertas/SLOs, dashboards, traces distribuídos, RLS contextual, execução operacional conjunta da reconciliação, backup/restore e rate limit compartilhado para escala horizontal;
- próximo passo: consolidar os complementos F3-S6/F3-S7/F3-S8 e materializar somente a observabilidade externa necessária ao runtime interno.

### F3-S6 — Hardening de borda

- status: `COMPLETED_WITH_GAPS`;
- evidência: `traceability.yml`/`F3-S6-EDGE-HARDENING`, `apps/api/src/request-security.ts`, `apps/api/src/server.ts`, `.env.example` e testes API;
- resultado: CSRF por origem/referer/metadado Fetch, `WEB_ORIGINS`, rate limit local bounded, `Retry-After`, health isento e bloqueio antes do caso de uso passam em testes unitários/HTTP; aceite anônimo de convite permanece funcional;
- gaps remanescentes: E2E navegador→API real, rate limit compartilhado para múltiplas réplicas, RLS contextual, execução operacional conjunta da reconciliação e observabilidade externa;
- próximo passo: executar o gate completo e, se ainda necessário ao runtime interno, iniciar recovery/reconciliação com TDD.

### F3-S7 — Reconciliação Qdrant desde PostgreSQL

- status: `IN_PROGRESS_WITH_VERIFIED_CORE`;
- evidência: `traceability.yml`/`F3-S7-INDEX-RECONCILIATION`, porta PostgreSQL publicada, `VectorStorePort.list`, `apps/worker/src/reconcile.ts` e testes TDD/live;
- resultado: conjunto esperado é derivado do PostgreSQL, embeddings seguem server-side, divergências são atualizadas por hash/metadado e pontos órfãos são removidos sem enviar texto ao Qdrant;
- gaps remanescentes: execução operacional automatizada PostgreSQL+Qdrant habilitados no mesmo comando, RLS contextual, observabilidade externa e backup/restore;
- próximo passo: executar o gate completo da fatia e consolidar AUDIT 0400–0490.

### F3-S8 — Rotação e revogação de sessão

- status: `COMPLETED_WITH_GAPS`;
- evidência: `traceability.yml`/`F3-S8-SESSION-ROTATION`, aplicação/persistência/contrato/API e teste live PostgreSQL;
- resultado: rotação revoga o hash anterior e cria o novo registro na mesma transação; revogação é uniforme e expira o cookie sem revelar estado;
- gaps remanescentes: E2E navegador→API real, RLS contextual, observabilidade externa e backup/restore; recuperação interna permanece baseada em convite administrativo controlado;
- próximo passo: consolidar o gate completo da fatia e AUDIT 0400–0490.

### ACCESS-21 — Login por credencial e jornada inicial do runtime

- título: substituir a entrada visual por convite por login/senha e entregar uma primeira atividade atribuída no ambiente ativo;
- descrição: criar autenticação local com hash scrypt e sessão server-side, restaurar sessão, manter convite somente como onboarding compatível, publicar a projeção M02 já existente e atribuí-la ao participante interno por job administrativo idempotente;
- módulo: identidade / conta / API / web / currículo / persistência;
- dependência: F3-S3, F3-S4, F3-S8 e runtime local HA;
- fase: BUILD — Phase 14;
- risco: alto — credencial e atribuição de aprendizagem precisam permanecer server-side, redigidas e isoladas por RLS;
- impacto: alto;
- status: COMPLETED_WITH_LIMITS;
- evidência: `packages/application/src/password-auth.ts`; `packages/persistence/src/password-auth-repository.ts`; migration `0015_lonely_shooting_star.sql`; `apps/api/src/http.ts`; `apps/web/app/page.tsx`; `tests/e2e/participant-access.spec.ts`; navegador contra `http://127.0.0.1:3100`;
- resultado: login 200, sessão 200, jornada 200 com M02 atribuída, 51 testes direcionados, suíte unitária 392/409 com cobertura global 84,98% statements / 80,13% branches / 86,50% functions / 85,71% lines e E2E 12/12; tentativa de escrita pelo usuário da aplicação foi negada por RLS e o seed foi executado pelo job administrativo;
- limites remanescentes: recuperação externa/MFA ainda `NOT_CONFIGURED`, deployment público/TLS não configurado e a atribuição automática deste ambiente cobre M02, não os 24 meses completos;
- próxima ação: adicionar rotação de senha na superfície de conta, integrar provedor externo quando autorizado e expandir atribuições por fase do programa.

## REAUDITORIA 2026-08-11 — AUD-2026-08-11-WORKTREE-LOGIN

### AUD-P1-006 — Fixture E2E real compatível com RLS

- título: fechar o seed do E2E real sem abrir bypass de autorização
- descrição: ajustar o fixture para usar job administrativo controlado ou contexto RLS autorizado; repetir navegador → web → API → PostgreSQL
- módulo: CI / E2E / persistence / security
- dependência: decisão de implementação e contrato de seed
- fase: AUDIT / BUILD hardening
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: `scripts/real-e2e-fixture-server.mjs`; banco efêmero com conexão administrativa separada; API `NOSUPERUSER`/`NOBYPASSRLS`; E2E real 14/14 e cleanup concluídos sem ampliar privilégios do participante
- critério de pronto: E2E real passa sem ampliar privilégios do usuário comum; cleanup preserva append-only

### AUD-P1-007 — Fechamento do worktree auditado

- título: congelar código, docs, testes e manifesto no mesmo SHA
- descrição: revisar diff, executar gates, criar commit intencional e repetir a reauditoria no SHA final
- módulo: governança / release engineering
- dependência: AUD-P1-006 e correções aprovadas
- fase: BUILD / AUDIT
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: materialização, gates de segurança/observabilidade e testes locais concluídos; implementação em `e3cd966efb1d4d2a5596075d1d12f4101dd12492`; reauditoria pós-commit no handoff `31d54f6abb9bbc8e36ae40afea78538240fef79d`; 0509_current_worktree_audit_2026-08-11.md permanece como registro histórico da limitação
- critério de pronto: nenhum código da janela fica fora do commit, manifesto aponta para SHA e a matriz de notas é reexecutada

### AUD-P2-008 — Harness de carga e contrato de proxy

- título: tornar load smoke e build web reproduzíveis no default
- descrição: corrigir o timeout default 5_000 e declarar CVG_API_INTERNAL_URL no contrato de build, serviço e CI
- módulo: runtime / CI / web
- dependência: AUD-P1-007
- fase: BUILD hardening
- risco: médio
- impacto: médio
- status: COMPLETED
- evidência: `scripts/run-load-smoke.mjs`, `packages/config/src/load-smoke.ts`, `apps/web/next.config.ts`; parser/timeout default passou testes, o alvo HA publicado `CVG_LOAD_TARGET=http://127.0.0.1:3180/health/live` passou 200/200 e build/proxy foram verificados
- critério de pronto: smoke default executa 100 requests e build limpo mantém proxy e health 200

## P3 — BAIXO

### FUT-01 — Decisões futuras

- título: avaliar automação de PDFs e expansão prática
- descrição: manter D-033 e GATE-EXP-PRAT-01 fora do MVP; qualquer abertura futura exige nova decisão, política, gate e checkpoint
- módulo: expansão e governança
- dependência: piloto, audit e decisão do patrocinador
- fase: backlog futuro
- risco: médio
- impacto: baixo
- status: BACKLOG FUTURO

## PROJETO DE REMEDIAÇÃO ATIVO

- plano canônico: BRIEFING/03.BUILD/0303_remediation_program.md;
- roadmap: BRIEFING/03.BUILD/0301_roadmap.md, PHASE R;
- backlog executável: BRIEFING/03.BUILD/0302_backlog_master.md, REMEDIAÇÃO R;
- estado atual: WAITING_HUMAN_APPROVAL para gates externos;
- próximo passo: revisão clínica, provedor MFA, domínio/certificado, storage e ambiente autorizado;
- decisões necessárias para R3–R5: provedor de identidade/MFA, domínio/DNS/TLS, backend de traces, storage de backup e ambiente de deploy.

## 2026-08-11 — REMEDIATION-ACTIVE-HA-E2E

- **item:** provar a jornada E2E contra o runtime HA ativo e fechar a limitação do proxy público/cleanup;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para produção;
- **evidência:** canal loopback `127.0.0.1:3182 → Caddy:8081`, serviço web em `3100`, edge público `3180/3181`, build descartável isolado em `.next-e2e-real`, `pnpm test:e2e:active-ha` final 2/2, E2E descartável 14/14, restore live 1/1, web dependencies 200 após teardown, cleanup com zero resíduos mutáveis e auditoria append-only preservada;
- **limites:** CI remoto, IdP/MFA/recovery externo, domínio/TLS gerenciado, storage externo, RPO/RTO de produção, deploy/rollback autorizado e revisão clínica continuam pendentes;
- **próximo passo:** aguardar decisões humanas dos gates externos; o rehearsal local de deploy/rollback passou com troca entre a imagem atual e a imagem construída do commit anterior, mas registry/ambiente de produção ainda não foram autorizados; a implementação de rehearsal está no commit `35d5c57` sobre `cfaeed3` e o manifesto foi atualizado para esse SHA.

## 2026-08-11 — REMEDIATION-CURRICULUM-RUNTIME-VERIFIER

- **item:** validar a projeção executável dos 24 módulos e tornar explícita a diferença entre estrutura materializada e publicação clínica;
- **status:** COMPLETED localmente / PASS_WITH_GAPS para conteúdo clínico;
- **evidência:** `scripts/verify-curriculum-runtime.mjs` e `pnpm ops:verify-curriculum-runtime` confirmaram 24 atividades, 796 conteúdos/editorial/itens, 24 atribuições, 24 estados, módulos M01–M24, `NAO_ATRIBUIDO` (24) e `PENDENTE` (24); 763 itens estão `PROJECAO_VERIFICADA` e 33 `PUBLICADO`; o modo clínico estrito falha com `clinical publication is incomplete: 763 items`;
- **commit:** `0a36d1d` (`feat: add live curriculum runtime verification`);
- **próximo passo:** revisão semântica e aprovação clínica de Ricardo; em paralelo, obter as decisões externas de identidade, TLS, traces, backup e deploy/rollback.

## 2026-08-11 — REMEDIATION-IDP-TRANSPORT-HARDENING

- **item:** impedir que o runtime aceite IdP sem transporte HTTPS em produção;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para provedor real;
- **evidência:** RED comprovado com `http://identity.example`; GREEN em `packages/application/src/identity-provider.ts` e `packages/config/src/env.ts`; commit `3793066`; `pnpm verify` passou com 421 testes e cobertura acima de 80%;
- **limite:** não há declaração de MFA/recovery disponível sem provedor, sandbox e segredo fornecidos por decisão humana;
- **próximo passo:** selecionar o provedor e executar enrollment, challenge, recovery, step-up e revogação em sandbox.

## 2026-08-11 — REMEDIATION-IDP-READINESS-PROBE

- **item:** impedir que URL/token presentes sejam confundidos com MFA e recuperação operacionais;
- **status:** COMPLETED tecnicamente / WAITING_HUMAN_APPROVAL para o IdP real;
- **evidência:** `scripts/verify-identity-provider-readiness.mjs` e `pnpm ops:verify-identity-provider` exigem flag explícita, principal de probe, HTTPS sem credenciais embutidas e resposta `EXTERNAL_IDENTITY_PROVIDER` + `AVAILABLE` + `ENABLED`; `tests/integration/identity-provider-readiness.test.ts` passou 5/5; o gate de produção agora executa o probe antes de retornar `PASS`;
- **limite:** nenhum provedor real foi consultado; enrollment, challenge, recovery codes, step-up, revogação, sincronização e E2E sandbox continuam pendentes;
- **próximo passo:** escolher o IdP/política, fornecer principal sintético e segredo pelo secret manager e executar a prova autorizada.

## 2026-08-11 — REMEDIATION-MANAGED-TLS-PROFILE

- **item:** preparar o edge para certificado gerenciado/automático sem fingir TLS produtivo no ambiente local;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para domínio e certificado;
- **evidência:** `infra/production/Caddyfile.production.example` validado pelo Caddy, sem `tls internal`; Compose produtivo sintético com FQDN e targets 80/443 passou; teste de contrato e `pnpm verify` passaram com 422 testes;
- **limite:** domínio, DNS, ACME/certificado, renovação, handshake público e E2E externo continuam pendentes;
- **próximo passo:** registrar FQDN e método de certificado autorizados, então executar o perfil fora do ambiente local.

## 2026-08-11 — REMEDIATION-EXTERNAL-TRACE-PROFILE

- **item:** preparar o caminho de traces externos duráveis sem alterar o runtime local;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para backend e retenção reais;
- **evidência:** `infra/observability/otel-collector.production.example.yaml` usa exporter OTLP HTTP com `insecure: false`, URL-base e autorização vindas exclusivamente do ambiente; a configuração explicita que o exporter acrescenta `/v1/traces`; `infra/production/docker-compose.external-traces.example.yml` sobrepõe o collector e coloca Tempo no perfil opcional `local-traces`; teste de contrato 2/2, validação do collector, Compose sem/com perfil e `pnpm verify` com 423 testes passaram nos commits `b5e615c` e `8b03283`;
- **limite:** endpoint, autorização, fornecedor, retenção, consulta, alerta, persistência externa, RPO/RTO e promoção produtiva não foram configurados nem declarados;
- **próximo passo:** registrar backend/retention autorizados e executar o overlay em ambiente externo com credenciais fora do Git.

## 2026-08-11 — REMEDIATION-CLINICAL-REVIEW-UI

- **item:** tornar a revisão clínica humana executável e bloquear publicação até decisão explícita;
- **status:** COMPLETED tecnicamente / WAITING_HUMAN_APPROVAL para revisão dos 763 itens;
- **evidência:** `apps/web/app/authoring/page.tsx` exige justificativa, oferece `Aprovar clinicamente`/`Solicitar ajustes` e só habilita publicação em `APROVADO_CLINICAMENTE`; `tests/e2e/authoring-review.spec.ts` passou 1/1 com publicação desabilitada antes da aprovação e habilitada depois; typecheck web passou; commit `c7a591b`;
- **limite:** nenhum conteúdo foi aprovado automaticamente; 763 itens continuam `PROJECAO_VERIFICADA` e a revisão semântica/item a item de Ricardo permanece obrigatória;
- **próximo passo:** revisar os itens com aprovador independente e registrar cada decisão/rationale no PostgreSQL.

## 2026-08-11 — REMEDIATION-CLINICAL-REVIEW-QUEUE

- **item:** retirar a dependência operacional de `contentId` manual e medir de forma auditável os conteúdos aguardando revisão;
- **status:** COMPLETED tecnicamente / WAITING_HUMAN_APPROVAL para revisão dos 763 itens;
- **evidência:** `GET /api/v1/internal/authoring/review-queue` com paginação e capability `VIEW_CLINICAL_REVIEW_QUEUE`; `apps/web/app/authoring/page.tsx` lista a fila sem internals; `scripts/verify-clinical-review-queue.mjs` e `pnpm ops:verify-clinical-review-queue` observaram no PostgreSQL HA 796 itens, 763 pendentes, 763 sem revisão e 0 falhas de pré-voo; o modo estrito falhou com `clinical review queue is incomplete: 763 pending items`; E2E de autoria 2/2;
- **limite:** nenhum item foi aprovado ou publicado automaticamente; a revisão semântica independente e as decisões de Ricardo permanecem obrigatórias;
- **commit:** `8670def` (`feat: add clinical review queue`);

## 2026-08-11 — REMEDIATION-BACKUP-ARTIFACT-RESTORE

- **item:** validar o manifesto e o checksum do backup que será consumido, não apenas gerar um novo dump durante o drill;
- **status:** COMPLETED tecnicamente / WAITING_HUMAN_APPROVAL para backup e restore produtivos;
- **evidência:** `scripts/backup-artifact.mjs` valida nome, formato, tamanho, timestamp e SHA-256; `scripts/verify-postgres-restore.mjs` restaura `CVG_RESTORE_BACKUP_FILE` em banco descartável e confirma objetos restaurados; `tests/integration/backup-artifact.test.ts` passou 4/4; `pnpm test:integration:restore` passou 2/2 no HA ativo; execução direta observou artefato de 197.097 bytes, 27 objetos e RTO 2.357 ms;
- **limite:** agendamento, storage/criptografia/retenção externos, owner, RPO/RTO produtivo e autorização operacional continuam pendentes;
- **próximo passo:** registrar destino e política de backup aprovados e repetir o verificador com artefato do ambiente declarado.
- **plano:** `docs/106_clinical_review_queue_evidence_2026-08-11.md` e `BRIEFING/03.BUILD/0303_remediation_program.md`.

## 2026-08-11 — REMEDIATION-LOCAL-REVERIFICATION

- **item:** reexecutar os gates locais das limitações originais no runtime HA ativo e registrar evidência atual sem promover produção;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para gates externos e clínicos;
- **evidência:** `docs/109_remediation_local_reverification_2026-08-11.md`; E2E HA 2/2 com cleanup zero; `cvg_app` sem SUPERUSER/BYPASSRLS; 24 atribuições e 24 estados M01–M24; fila clínica com 763 pendentes e 0 falhas técnicas; headers live 200; trace após restart; HA e manifesto de release; load smoke 200/200 com p95 de 77,64 ms;
- **limite:** IdP/MFA/recovery real, domínio/certificado público, traces/backups externos, RPO/RTO produtivo, registry/deploy/rollback autorizado e aprovação clínica dos 763 itens permanecem sem prova;
- **próximo passo:** obter decisões/recursos externos e iniciar a revisão clínica item a item; depois executar os verificadores no ambiente declarado.

## 2026-08-11 — REMEDIATION-IDENTITY-LIFECYCLE

- **item:** completar o ciclo local provider-mediated de início e confirmação para recovery e MFA, sem armazenar códigos;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para IdP, sandbox e produção;
- **evidência:** `packages/application/src/identity-provider.ts` implementa `verifyMfaEnrollment` e `completeRecovery`; API autenticada e contratos bounded; `/account` mantém código somente em memória; `tests/e2e/account-security.spec.ts` passou 1/1; `docs/110_identity_provider_lifecycle_evidence_2026-08-11.md`; commit `e93f4d774b80ca920122e7ed09ffd106b66a83b5`;
- **limite:** não há prova de IdP/sandbox real, enrollment/challenge/recovery code real, step-up, revogação, sincronização de papéis, domínio/TLS público, traces/backups externos, RPO/RTO produtivo, deploy/rollback autorizado ou revisão dos 763 conteúdos;
- **próximo passo:** escolher provedor/política, fornecer segredo pelo secret manager e executar os fluxos autorizados em sandbox; manter o gate produtivo fechado até evidência externa.

## 2026-08-11 — REMEDIATION-CURRENT-AUDIT

- **item:** reauditar o estado atual das sete limitações originais após o hardening do boundary provider-mediated;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para publicação clínica e gates externos;
- **evidência:** `docs/111_current_remediation_audit_2026-08-11.md`; E2E HA real 2/2; `cvg_app` sem SUPERUSER/BYPASSRLS; 24 atribuições/24 estados M01–M24; fila 763 pendente/0 falhas; load 200/200; conta E2E 1/1; `pnpm verify` 448/18; commit `dfe58311156ca908082dbb2f16fa3a67b8b511c6`;
- **limite:** publicação clínica estrita permanece bloqueada por 763 itens; IdP/sandbox, domínio/certificado, traces/backups externos, RPO/RTO produtivo, deploy/rollback autorizado e aprovação clínica não têm prova;
- **próximo passo:** obter decisões e recursos externos, revisar os conteúdos com aprovador autorizado e repetir os gates estritos no ambiente declarado.

## 2026-08-11 — REMEDIATION-WEB-BUILD-CONTRACT

- **item:** impedir que um build web de produção pareça saudável sem o proxy server-side para API/health;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para ambiente produtivo;
- **evidência:** `apps/web/next.config.ts` falha fechado sem `CVG_API_INTERNAL_URL`; `apps/web/src/build-config.test.ts` passou 4/4; `.github/workflows/quality.yml` fixa o alvo CI; `scripts/verify-ci-contract.mjs` exige o contrato; build com URL explícita e E2E HA 2/2 passaram; commit `0db281bd3713f18ec2c05b06701750c69e202d7d`;
- **limite:** URL interna aprovada, domínio/TLS público, IdP, traces/backups externos, registry/deploy/rollback e restore produtivo continuam dependentes do ambiente declarado;
- **próximo passo:** propagar a URL interna aprovada ao pipeline/serviço web do ambiente real e repetir health, E2E e gates externos.

## 2026-08-11 — REMEDIATION-DOCKER-RESTORE-PASSWORD

- **item:** tornar o restore live compatível com PostgreSQL acessível somente pela rede Docker, sem expor senha nos argumentos;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para backup e restore produtivos;
- **evidência:** `scripts/postgres-command.mjs` valida o container e encaminha `PGPASSWORD` por ambiente; teste de contrato 6/6; `pnpm test:integration:restore` 2/2; execução direta com banco isolado observou RTO de 2,546 s; commit `fbc9591e6fe2b785d3d3fc50eaa4a096421c1351`;
- **limite:** agendamento, criptografia, storage/retenção externos, owner, RPO/RTO produtivo e autorização de restore continuam pendentes;
- **próximo passo:** repetir o drill usando artefato e política do ambiente produtivo declarado.

## 2026-08-11 — REMEDIATION-PRODUCTION-CONFIG-CONTRACT

- **item:** impedir que o gate produtivo aceite configuração semanticamente insegura antes da probe externa;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para recursos produtivos reais;
- **evidência:** `scripts/verify-production-security-config.mjs` valida IdP HTTPS sem credenciais, origem pública, storage de traces, retenção, URI de backup, referência de chave e digests distintos; `tests/integration/production-security-config.test.ts` passou 7/7; commit `7777876a86b8bef8dff5714d127281a25a4c8b6d`;
- **limite:** configuração válida não comprova probe do IdP, certificado/DNS, backend de traces, backup/restore, registry ou deploy/rollback;
- **próximo passo:** fornecer os valores por secret manager/ambiente aprovado e executar o gate produtivo completo.

## 2026-08-11 — REMEDIATION-WEB-TSC-CHECK-27

- **item:** fechar a falha reproduzida do `next build` na checagem TypeScript CLI do Next 16.3, mantendo typecheck obrigatório;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para validação manual do admin e ambiente produtivo;
- **evidência:** RED 1/5 no contrato antigo; `apps/web/next.config.ts` agora usa `experimental.useTypeScriptCli: false`; teste de build 5/5; build com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182` passou; cobertura elevada 475/18 com 84,93% statements, 80,05% branches, 86,70% functions e 85,71% lines; E2E HA real 2/2; `pnpm verify`, typecheck/lint/secrets/architecture/exposure/diff-check passaram;
- **limite:** o E2E genérico conflita com a web operacional em `3100`; o executor oficial HA foi usado. O worktree segue sem commit intencional e a validação visual/humana do dashboard permanece pendente;
- **próximo passo:** Ricardo validar `/admin`, `/invite` e uma atribuição sintética, rotacionar a senha temporária e escolher ciclo de vida de usuários ou analytics histórico.

## REGRAS DE USO

- Atualizar este arquivo sempre que um item mudar de status, prioridade, dependência ou risco.
- Não marcar B-07 como concluído somente por criar o blueprint.
- Não tratar B-07 como bloqueio da SPEC; ele bloqueia baseline e piloto completo por D-101.
- Adicionar imediatamente qualquer nova pendência descoberta durante revisão ou aplicação.
- Usar este backlog junto com docs/99_runtime_state.md e docs/20_master_execution_log.md.

## 2026-08-11 — ACCESS-22 — Primeiro acesso do operador

- **título:** desbloquear a entrada inicial sem permitir cadastro público em ambiente interno;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para rotação de senha e identidade externa;
- **evidência:** conta `ricardo@cvg.internal` ativa; credencial transitória provisionada fora do repositório; login real `200`, cookie HttpOnly emitido, jornada autenticada `200` e endpoint de rotação autenticada `200` com origem CSRF válida em `http://127.0.0.1:3100`;
- **limite:** senha não foi registrada em código, documentação, log ou Git; a superfície web de rotação ainda não foi implementada; MFA/recuperação externa e acesso público permanecem pendentes;
- **próximo passo:** operador visualizar M02, rotacionar a senha por fluxo autenticado e manter os gates externos/ clínicos aguardando aprovação.

## 2026-08-11 — ACCESS-23 — Redesign da entrada do participante

- **título:** transformar o login em uma entrada orientada para a jornada, sem abrir cadastro público;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para a próxima fase autenticada;
- **evidência:** `apps/web/app/page.tsx`, `apps/web/app/login-mascot.tsx`, `apps/web/app/globals.css` e `tests/e2e/participant-access.spec.ts`; build, typecheck, coverage 85,04% statements / 80,33% branches, E2E participante/acessibilidade 12/12 contra `3100`, health 200;
- **entrega:** missão inicial, mascote Caju, prévia da trilha, explicação de convite, senha visível/oculta e layout responsivo;
- **limite:** ainda não implementa falas dinâmicas do mascote, trilha persistida do participante, perfil completo, gerenciamento de usuários ou controle de treinamentos;
- **próximo passo:** validar visualmente a entrada e priorizar a área autenticada do participante antes de ampliar para administração.

## 2026-08-11 — ACCESS-24 — Fluxo de atividade em blocos

- **título:** orientar a resposta de atividades em blocos de até três questões, com salvamento e progresso visíveis;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para validação visual do operador;
- **evidência:** `apps/web/app/page.tsx`, `apps/web/app/globals.css`, `tests/e2e/participant-access.spec.ts`; build web reiniciada em `3100`; E2E participante/acessibilidade 13/13; coverage 462 testes, 85,04% statements e 80,33% branches;
- **entrega:** cartão de início no topo, barra de progresso, navegação por blocos, salvamento das respostas antes do avanço, validação de respostas vazias e correção do layout de rádio/checkbox;
- **limite:** não implementa ainda dashboard persistido da trilha, área de usuário, mascote interativo, gerenciamento de usuários ou controle editorial de treinamentos;
- **próximo passo:** Ricardo validar o fluxo em `http://localhost:3100/` e depois priorizar o dashboard do participante.

## 2026-08-11 — ACCESS-25 — Bootstrap do superadmin e criação controlada de usuários

- **título:** remover redundância do login e permitir que somente o superadmin crie o primeiro acesso dos demais usuários;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para validação manual e integração de envio de convite;
- **evidência:** `apps/web/app/page.tsx`, `apps/web/app/admin/page.tsx`, `apps/web/app/invite/page.tsx`, `apps/api/src/http.ts`, `packages/application/src/invitation-use-cases.ts`, testes unitários e E2E; 43/43 testes de autorização, 15/15 E2E, build web, health 200 e coverage 85,07% statements / 80,37% branches;
- **entrega:** entrada sem os selos duplicados, área `/admin`, convite individual de uso único, perfil limitado por escopo, bloqueio de convite `ADMIN`, definição de senha em `/invite` e bootstrap da conta interna existente como `ADMIN` + `PARTICIPANT` fora do repositório;
- **limite:** o link é copiado/enviado manualmente; não há ainda lista, edição, desativação ou auditoria de usuários, envio de e-mail, nem controle editorial completo de treinamentos;
- **próximo passo:** Ricardo abrir `/admin`, criar um convite sintético, validar `/invite` e priorizar gestão de ciclo de vida dos usuários e controle de treinamentos.

## 2026-08-11 — ACCESS-ADMIN-TRAINING-26 — Dashboard administrativo e avanço da trilha

- **título:** validar o acesso de admin e entregar acompanhamento dos veterinários, catálogo e customização controlada de treinamentos;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para autenticação real do superadmin e decisão da próxima fatia;
- **dependências:** SPEC aprovada em `0190`; BUILD master/roadmap/backlog e documentação transversal aprovados; runtime HA local ativo;
- **entrega:** capability `VIEW_ADMIN_DASHBOARD` exclusiva para `ADMIN`; `GET /api/v1/internal/admin/dashboard`; projeção interna estrita com resumo, participantes, progresso e catálogo M01–M24; lista limitada a 200 contas participantes nos escopos do admin; formulário para atribuir e disponibilizar módulos existentes;
- **evidência:** `packages/application/src/admin-dashboard-use-cases.ts`, `packages/contracts/src/admin-dashboard.ts`, `packages/persistence/src/admin-dashboard-repository.ts`, `apps/api/src/http.ts`, `apps/api/src/main.ts`, `apps/web/app/admin/page.tsx`, `tests/e2e/admin-dashboard.spec.ts`; 471 testes passantes, cobertura 84,93% statements / 80,17% branches, build Docker e web, API sem sessão `401`, `/admin` `200`, E2E novo `1/1` e regressão admin/participante `10/10`;
- **segurança:** jornada individual reutiliza contexto RLS do participante; não houve leitura staff direta das tabelas protegidas, nova política RLS, segredo, dado real, fonte, PDF, foto, gabarito ou alteração automática de estado clínico;
- **limites:** não cobre histórico analítico, exportação, edição de conteúdo, ciclo de vida completo de contas, auditoria visual ou envio automático de e-mail; o admin precisa validar manualmente a sessão e um acesso sintético;
- **próximo passo:** Ricardo validar `/admin` autenticado, convite `/invite` e atribuição de módulo; então escolher ciclo de vida de usuários ou analytics histórico.

## 2026-08-11 — ACCESS-ADMIN-TRAINING-26-CLOSE

- **status:** gates locais finais concluídos / WAITING_HUMAN_APPROVAL;
- **evidência:** `pnpm verify:secrets`, `pnpm verify:architecture`, `pnpm verify:exposure` e `git diff --check` passaram; portas existentes `3100`, `3180`, `3181` e `127.0.0.1:3182` preservadas; API, workers e PostgreSQL saudáveis;
- **limite:** ainda depende de autenticação e validação semântica manual do admin com dados sintéticos;
- **próximo passo:** validar `/admin`, `/invite` e uma atribuição sintética, sem iniciar outro processo local.

## 2026-08-11 — ACCESS-SUPERADMIN-CREDENTIAL-26

- **status:** credencial temporária provisionada e login/dashboard verificados / WAITING_HUMAN_APPROVAL;
- **entrega:** conta existente `ricardo@cvg.internal` confirmada como `ACTIVE` com `ADMIN` + `PARTICIPANT`; senha entregue diretamente ao operador, sem persistência do valor;
- **evidência:** login local `200`, cookie HttpOnly emitido e dashboard administrativo autenticado `200`; a sessão técnica da prova foi revogada após a validação;
- **limite:** MFA, recuperação e IdP externo continuam não configurados; a senha deve ser rotacionada após o teste;
- **próximo passo:** Ricardo validar visualmente `/admin` e uma atribuição sintética.

## 2026-08-11 — RUNTIME-LOCAL-VERIFY

- **item:** verificar o runtime local e preservar a topologia existente antes de iniciar qualquer processo;
- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para validação manual do onboarding;
- **evidência:** `cvg-trainee-vet-web.service` ativo em `3100`; edge em `3180/3181/3182`; APIs, workers e PostgreSQL `healthy`; probes HTTP de web, readiness, dependências e rotas principais `200`;
- **decisão:** o programa já estava ativo. Nenhum restart, `docker compose up`, nova porta, alteração de roteamento ou mudança de configuração foi executado;
- **próximo passo:** Ricardo validar `/admin` e `/invite` com a credencial transitória já entregue.

## 2026-08-11 — AUD-2026-08-11-CURRENT — Auditoria integral atual

- **status:** `COMPLETED` localmente / `WAITING_HUMAN_APPROVAL` para release, publicação clínica e gates externos;
- **resultado:** nota ponderada **83/100**; `PASS_WITH_GAPS`; nenhum P0 observado;
- **evidência:** `BRIEFING/04.AUDIT/0491_full_construction_audit.md`; `pnpm verify` com 475 testes passados e 18 skips, coverage 84,93%/80,05%/86,70%/85,71%; E2E HA 2/2; E2E web focado 15/15; smoke 200/200; trace local após restart; PostgreSQL read-only com 24 atribuições, 24 estados, 796 conteúdos e 763 pendências clínicas;
- **gaps P1:** revisão dos 763 itens; IdP/MFA/recovery real; domínio/TLS público; traces/backups externos; RPO/RTO produtivo; CI/deploy/rollback autorizado; produto integral de 24 meses; worktree sem SHA final;
- **próximo passo:** Ricardo validar `/admin`/`/invite`, rotacionar credencial transitória e escolher lifecycle ou analytics; nenhuma publicação clínica ou release é autorizada por esta nota.

## 2026-08-12 — ENT95-05-B — Regras do ciclo educacional

- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para cobertura de decisão, conteúdo clínico, release e reauditoria;
- **entrega:** pré-requisito fail-closed; pausa por afastamento/acomodação/janela operacional com retomada temporal persistida; formas equivalentes distintas em D+30/D+60/D+90; remediação digital na primeira tentativa e plano individual com mentor a partir da segunda, sem punição; contratos, repositório e migration `0017_assignment_pause_context.sql` sincronizados;
- **evidência:** catálogo atual com 31 invariantes e `pnpm verify:invariants` 2/2; fatia focada 7 arquivos/47 testes; migration gate com 18 migrações e índice 17; typecheck, lint e format check verdes; integração live serial PostgreSQL/Qdrant 32 arquivos/79 testes passantes, 1 arquivo/2 testes condicionais pulados; fixtures sintéticas removidas e zero role `cvg_rls_*`/conta `*.invalid` residual;
- **scorecard:** baseline 83,24/100, sem promoção; 10 tasks `COMPLETED`, 38 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; rastreabilidade permanece `PASS_WITH_GAPS`, 145 requisitos, 0 cadeias completas e 145 gaps explícitos;
- **próxima ação:** executar `ENT95-05-C` (cobertura de decisão crítica) e continuar `ENT95-02-A/B`, `ENT95-13-B` e `ENT95-16-B`, sem liberar release, piloto ou publicação clínica.

## 2026-08-12 — ENT95-05-C — Cobertura de decisão crítica

- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para mutation independente, conteúdo clínico, release e reauditoria;
- **entrega:** matriz imutável com 13 casos de nota, gabarito, publicação, permissão, estado, replay idempotente e conflito de chave; integração contra as regras reais; gate de cobertura incorporado ao `package.json` e ao `pnpm verify`;
- **evidência:** 3 arquivos/5 testes focados da matriz passaram; `pnpm test:coverage` passou 110 arquivos/530 testes, com 16 arquivos/18 testes condicionais pulados; cobertura global 86,40% statements / 82,35% branches / 87,30% functions / 87,18% lines; branches dos alvos críticos: 98,85% nota, 100% publicação, 98,46% permissão, 96,15% estado, 85% idempotência, 90,16% contrato de estado e 100% matriz; `pnpm verify:critical-decisions`, scorecard, rastreabilidade, documentação, invariantes e diff check passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-DECISION-COVERAGE-036`;
- **scorecard:** baseline 83,24/100 sem promoção; 11 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; rastreabilidade `PASS_WITH_GAPS`, 145 requisitos, 0 cadeias completas e 145 gaps explícitos;
- **próxima ação:** iniciar `ENT95-02-A/B` para fechar elos locais de rastreabilidade sem inventar SHA/artefato; manter `ENT95-13-B` e `ENT95-16-B`, sem liberar release, piloto ou publicação clínica.

## 2026-08-12 — ENT95-02-B — Teste de drift de produto

- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para mudanças de escopo, SHA, release e reauditoria;
- **entrega:** `scope_control` em `traceability.yml` com cinco fontes de decisão, dez capacidades e 27 requisitos RF/RNF; gate `scripts/verify-scope-drift.mjs` para exigir decisão, requisito e status aprovado por capacidade;
- **evidência:** RED com verificador ausente; GREEN 3/3 testes TDD; `pnpm verify:scope-drift` passou com 10 capacidades, 26 decisões usadas e 27 requisitos; typecheck, lint, format check e `git diff --check` passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-SCOPE-DRIFT-037`;
- **scorecard:** baseline 83,24/100 sem promoção; 12 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; rastreabilidade permanece `PASS_WITH_GAPS`, 145 requisitos, 0 cadeias completas e 145 gaps explícitos;
- **próxima ação:** continuar `ENT95-02-A` para fechar elos reais de módulo/contrato/teste, sem inventar SHA/artefato nem liberar release, piloto ou publicação clínica.

## 2026-08-12 — ENT95-07-A — Inventário de API

- **status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para API integral, gates externos, SHA, release e reauditoria;
- **entrega:** inventário `API_SURFACE` com 46 rotas, capability, auth, escopo, use case, contratos e projeções; rota editorial de revisão reconciliada com o template de telemetria;
- **evidência:** RED/GREEN 13/13 testes focados; typecheck de contratos, lint, rastreabilidade estrutural/premium passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-API-SURFACE-039`;
- **scorecard:** baseline 83,24/100 sem promoção; 14 tasks `COMPLETED`, 35 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **próxima ação:** continuar `ENT95-02-A` e escolher a próxima task local independente, mantendo explicitamente as operações ainda faltantes no backlog.

## 2026-08-12 — ENT95-04-A/B — Arquitetura e governança de hotspots

- **status:** `ENT95-04-A` e `ENT95-04-B` `COMPLETED` no escopo local / `WAITING_HUMAN_APPROVAL` para capacidade enterprise, carga/failover e gates externos;
- **entrega:** a policy executável `code-hotspot-policy.json` classifica os 7 arquivos de produção acima de 800 linhas com owner, severidade, plano de decomposição, orçamento-alvo e testes de caracterização; o verificador impede hotspot não classificado, duplicidade, teste ausente e regressão abaixo do limiar;
- **evidência:** RED/GREEN 2/2 em `tests/integration/code-hotspot-policy.test.ts`; `pnpm verify:hotspots`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram; a policy arquitetural anterior permanece verificada em `pnpm verify:architecture` 2/2;
- **artefato:** `PREMIUM-ENTERPRISE-95-HOTSPOT-POLICY-040`;
- **scorecard:** baseline 83,24/100 sem promoção; 16 tasks `COMPLETED`, 33 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** a decomposição física dos 7 módulos continua planejada em fatias reversíveis; seguir com `ENT95-02-A` e outras tasks locais respaldadas, sem inventar SHA, release ou evidência clínica.

## 2026-08-12 — ENT95-01-A — Registro de documentos canônicos

- **status:** `COMPLETED` localmente / `WAITING_HUMAN_APPROVAL` para SHA, release e reauditoria;
- **entrega:** `docs/canonical-document-registry.json` define uma única fonte vigente para programa `0304`, auditoria `0491`, roadmap `0492` e backlog `0493`, e liga `0490`/`0303` aos sucessores;
- **evidência:** RED/GREEN 3/3 em `tests/integration/canonical-document-governance.test.ts`; `pnpm verify:documentation`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-DOCUMENT-REGISTRY-042`;
- **scorecard:** baseline 83,24/100 sem promoção; 17 tasks `COMPLETED`, 32 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** a governança canônica não congela worktree/SHA nem substitui auditoria independente; continuar `ENT95-02-A` e próximas tasks locais respaldadas.

## 2026-08-12 — ENT95-03-A — Inventário curricular versionado

- **status:** `COMPLETED` localmente / `WAITING_HUMAN_APPROVAL` para revisão clínica e publicação;
- **entrega:** `curriculum-inventory.json` reconcilia 24 módulos, 96 sessões e 796 registros, declara objetivos e itens críticos por módulo, ordena risco de maior para menor e mantém `PILOT_BLOCKED`;
- **evidência:** RED/GREEN 2/2 em `tests/integration/curriculum-inventory-governance.test.ts`; `pnpm verify:curriculum-inventory`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-CURRICULUM-INVENTORY-043`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 tasks `COMPLETED`, 31 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** inventário estrutural não aprova os 763 itens; `ENT95-03-B/C/D` e os gates clínicos permanecem abertos.

## 2026-08-12 — ENT95-12-B — Governança local de observabilidade e alertas

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para operação externa;
- **entrega:** policy versionada com sete sinais e sete alertas, dashboard Grafana, regras Prometheus redigidas, p95 exportado de amostras limitadas e contagem de eventos reclamados do worker;
- **evidência:** RED/GREEN 2/2 no gate de governança e 10/10 no módulo de observabilidade; `pnpm verify:observability-governance`, lint, typecheck e `git diff --check` passaram;
- **artefato:** `PREMIUM-ENTERPRISE-95-OBSERVABILITY-GOVERNANCE-045`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 tasks `COMPLETED`, 30 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** collector/backend externo, retenção efetiva, acknowledgement produtivo, ruído medido e D-ENT-04 continuam pendentes; não declarar SLO produtivo, release ou piloto.

## 2026-08-12 — ENT95-14-A — Matriz de testes por requisito e risco

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para fechamento de evidência;
- **entrega:** `test-risk-matrix.json` exige quatro provas por RF P0/P1 e oito camadas de teste; o verificador deriva 87 RF P0/P1 e reports cobertura por prova/camada;
- **evidência:** RED/GREEN 2/2 em `tests/integration/test-risk-matrix-governance.test.ts`; `pnpm verify:test-risk-matrix`, lint, typecheck e `git diff --check` passaram; resultado 43/87 success, 0/87 error, 8/87 denied, 24/87 conflict e 0/87 completo;
- **artefato:** `PREMIUM-ENTERPRISE-95-TEST-RISK-MATRIX-046`;
- **limite/próximo passo:** 44 RF P0/P1, tags de risco completas, SHA, release e reauditoria continuam pendentes; não promover nota, release ou piloto.

## 2026-08-12 — ENT95-14-C — Governança de skips e flakiness

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para CI remoto e fechamento de execução;
- **entrega:** `skip-governance.json` cataloga 16 arquivos/18 testes condicionais; `scripts/verify-skip-governance.mjs` falha para skip não classificado, caminho inexistente ou taxa flaky acima de 1%;
- **evidência:** RED/GREEN 2/2 em `tests/integration/skip-governance.test.ts`; `pnpm verify:skip-governance` passou com 0 skips inexplicados, 0 falhas flaky e 3 execuções observadas de 20; live isolado PostgreSQL 38/38 arquivos e 95/95 testes, PostgreSQL/Qdrant 41/41 e restore 2/2;
- **artefato:** `PREMIUM-ENTERPRISE-95-SKIP-GOVERNANCE-047`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 tasks `COMPLETED`, 28 `READY_FOR_NEXT_STEP`, 6 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** faltam 17 execuções qualificadas, CI remoto, SHA/worktree, release e reauditoria; não liberar piloto ou publicação clínica.

## 2026-08-12 — ENT95-14-D — Evidência imutável e governança de dados de teste

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para CI artifact, retention e SHA;
- **entrega:** `test-evidence-governance.json` declara três registros com requisito/task, artifact ID, comando, timestamp, ambiente, seed sintético, sanitização, teardown, retention, commit e paths; `scripts/verify-test-evidence-governance.mjs` bloqueia evidência inválida ou não redigida;
- **evidência:** RED/GREEN 2/2 em `tests/integration/test-evidence-governance.test.ts`; `pnpm verify:test-evidence-governance` passou com 3 evidências sintéticas, 3 teardowns verificados, 0 completas e 3 gaps explícitos;
- **artefato:** `PREMIUM-ENTERPRISE-95-TEST-EVIDENCE-049`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 tasks `COMPLETED`, 27 `READY_FOR_NEXT_STEP`, 7 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** CI artifact/retention, SHA imutável, ENT95-15-A/B, release e reauditoria permanecem pendentes.

## 2026-08-12 — ENT95-01-C — Governança de decisões, riscos e mudanças

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para mudanças materiais;
- **entrega:** `change-control-governance.json` registra 2 decisões, 2 riscos abertos e 2 change requests com owner, motivo, impacto, aceite, rollback, artifact e score impact por sprint;
- **evidência:** RED/GREEN 2/2 em `tests/integration/change-control-governance.test.ts`; `pnpm verify:change-control-governance` passou com 0 score changes e disposição `PILOT_BLOCKED`;
- **artefato:** `PREMIUM-ENTERPRISE-95-CHANGE-CONTROL-051`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** aprovação humana/independente, SHA/release e riscos externos continuam abertos; a policy local não autoriza piloto.

## 2026-08-12 — Verificação transversal após ENT95-14-C

- **resultado:** `pnpm verify` passou com 119 arquivos/552 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA 3/3 e audit de dependências passaram; live isolado PostgreSQL 95/95, PostgreSQL/Qdrant 98/98 e restore 2/2;
- **scorecard:** 83,24/100 sem promoção; 18 `COMPLETED`, 28 `READY_FOR_NEXT_STEP`, 6 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** rastreabilidade permanece 0/145 cadeias completas e 145 gaps, faltam 17 execuções qualificadas de `ENT95-14-C`, CI remoto, SHA/worktree, gates externos, revisão clínica, release, piloto e reauditoria.

## 2026-08-12 — Verificação transversal após ENT95-14-D

- **resultado:** `pnpm verify` passou com 120 arquivos/554 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **governança:** `ENT95-14-D` reportou 3 evidências sintéticas, 3 teardowns verificados, 0 completas e 3 gaps explícitos; rastreabilidade permanece 0/145 cadeias completas, 145 gaps e 49 linhas com evidência local;
- **scorecard:** 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 27 `READY_FOR_NEXT_STEP`, 7 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** permanecem CI artifact/retention, SHA/worktree, 17 execuções qualificadas de `ENT95-14-C`, `ENT95-15-A/B`, revisão clínica, gates externos, release, piloto e reauditoria independente; estado `WAITING_HUMAN_APPROVAL`.

## 2026-08-12 — Verificação transversal após ENT95-01-C

- **resultado:** `pnpm verify` passou com 121 arquivos/556 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **governança:** change control reportou 2 decisões, 2 riscos, 2 change requests, 2 impactos de sprint e 0 mudanças de score; documentação, scorecard e rastreabilidade passaram (`0/145` cadeias completas, 145 gaps, 49 linhas com evidência local);
- **scorecard:** 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** SHA/worktree, CI artifact/retention, 17 execuções qualificadas de `ENT95-14-C`, `ENT95-15-A/B`, revisão clínica, gates externos, release, piloto e reauditoria independente continuam pendentes.

## 2026-08-12 — Verificação final após manifesto 052

- **resultado:** `pnpm verify` reexecutado após o manifesto 052: 121 arquivos/556 testes/18 skips condicionais; cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram novamente;
- **scorecard:** baseline 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** 0/145 cadeias completas, 145 gaps, SHA/worktree, CI artifact/retention, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes; estado `WAITING_HUMAN_APPROVAL`.

## 2026-08-12 — ENT95-13-B — Governança automatizada de acessibilidade

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para evidência manual;
- **entrega:** `accessibility-governance.json` cataloga 6 critérios automatizados, 2 superfícies e 5 gaps manuais; o verificador valida WCAG-2.2-AA, paths, status PASS e dados sintéticos;
- **evidência:** RED/GREEN 2/2 em `tests/integration/accessibility-governance.test.ts`; `pnpm verify:accessibility-governance` passou com 6/6 automatizadas, 5 gaps manuais, `PASS_WITH_GAPS` e `PILOT_BLOCKED`;
- **artefato:** `PREMIUM-ENTERPRISE-95-ACCESSIBILITY-GOVERNANCE-054`;
- **limite/próximo passo:** checklist manual P0, contraste/zoom/motion, leitores de tela e usuários representativos continuam necessários; não promover nota ou liberar piloto.

## 2026-08-12 — Verificação final após ENT95-13-B

- **resultado:** `pnpm verify` passou com 122 arquivos/558 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **scorecard:** baseline 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 26 `READY_FOR_NEXT_STEP`, 8 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** `ENT95-13-B` conserva 5 gaps manuais; 0/145 cadeias completas, 145 gaps, SHA/worktree, CI artifact/retention, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes.

## 2026-08-12 — ENT95-04-C — Capacidade e escalabilidade local

- **status:** `IN_PROGRESS` localmente / `WAITING_HUMAN_APPROVAL` para aceitação enterprise;
- **entrega:** `capacity-governance.json` registra 200/200 HTTP 200, concorrência 20, throughput 458,14 req/s, p95 102,37 ms e teardown verificado;
- **evidência:** `tests/integration/capacity-governance.test.ts` passou 2/2; `pnpm verify:capacity-governance` passou com 100% de sucesso, `PASS_WITH_GAPS` e 4 gaps explícitos;
- **artefato:** `PREMIUM-ENTERPRISE-95-CAPACITY-GOVERNANCE-056`;
- **scorecard:** baseline 83,24/100 sem promoção; 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limite/próximo passo:** saturação, soak, failover/recuperação e perfil/SLO aprovado continuam pendentes; smoke local não libera piloto.

## 2026-08-12 — Verificação final após ENT95-04-C

- **resultado:** `pnpm verify` passou com 123 arquivos/560 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **scorecard:** baseline 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** `ENT95-04-C` mantém 4 gaps e `ENT95-13-B` 5 gaps manuais; 0/145 cadeias completas, 145 gaps, SHA/worktree, CI artifact/retention, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes.

## 2026-08-12 — ENT95-04-C — Evidência exploratória de carga e failover

- **evidência:** cargas HA sintéticas 200/20, 1.000/50 e 5.000/100 passaram 100% HTTP 200; com `api-a` parado, 1.000/50 passou 100% e a réplica foi restaurada saudável;
- **métricas:** p95 de 91,41 ms, 115,47 ms, 160,80 ms e 106,91 ms no failover; throughput de 466,72, 716,71, 1.014,10 e 565,82 req/s;
- **gate:** teste focal 3/3 e `pnpm verify:capacity-governance` passaram; `steppedLoadRuns=3`, failover 100%, `soakStatus=NOT_EXECUTED`, `PASS_WITH_GAPS` e `PILOT_BLOCKED`;
- **limites:** a evidência é exploratória e sintética; saturação, soak, perfil/SLO aprovado, CI/SHA, capacidade produtiva, release, piloto e reauditoria continuam pendentes;
- **artefato:** `PREMIUM-ENTERPRISE-95-CAPACITY-EXPLORATION-058`.

## 2026-08-12 — Verificação transversal final após ENT95-04-C

- **resultado:** `pnpm verify` passou com 123 arquivos/561 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **scorecard:** 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** `ENT95-04-C` conserva 4 gaps e `soakStatus=NOT_EXECUTED`; 0/145 cadeias completas, 145 gaps, 5 gaps manuais WCAG, CI artifact/retention, SHA/worktree, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes.

## 2026-08-12 — CVG-SUB80-TO-95 — Programa filtrado para itens abaixo de 80

- **status:** planejamento `COMPLETED` / execução `WAITING_HUMAN_APPROVAL`;
- **escopo:** somente itens 3 (72), 9 (75), 10 (68), 12 (78), 13 (78) e 16 (65); alvo de elegibilidade 95 por item;
- **backlog filtrado:** 29 tasks canônicas — 3 `COMPLETED`, 3 `IN_PROGRESS`, 12 `READY_FOR_NEXT_STEP` e 11 `WAITING_HUMAN_APPROVAL`; IDs e estado continuam governados pelo `0493`;
- **entrega:** `0305`, `0510`, `0511`, `sub80-to-95-program.json`, verificador e teste TDD; 13 janelas S0–S12, 24 semanas relativas, 10 gates, owners, dependências, evidência e rollback;
- **evidência:** RED por verificador ausente, drift de baseline/estado e calendário inconsistente; GREEN 5/5; `pnpm verify:sub80-program` passou com 6 itens/29 tasks/10 gates/alvo 95/`PILOT_BLOCKED`;
- **score:** baseline 83,24 preservada; seis itens exatamente em 95 projetam 92,54 global, portanto o recorte não autoriza declarar programa global em 95;
- **próximo passo:** decidir D-ENT-01/07/09, abrir G-S80-0 e executar `ENT95-03-B`; continuar apenas fatias desbloqueadas de 12-B/13-B/16-B até D-ENT-04/05/06/08 e gates humanos/externos.

## 2026-08-12 — CVG-SUB80-TO-95 — Verificação final

- **status:** tarefa documental/executável `COMPLETED`; execução do programa `WAITING_HUMAN_APPROVAL`;
- **evidência:** `pnpm verify` passou com 124 arquivos/566 testes/18 skips condicionais; cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines; gate sub-80 6 itens/29 tasks/13 janelas/24 semanas/10 gates;
- **disposição:** `PILOT_BLOCKED`; baseline e notas sem promoção;
- **próximo passo:** D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`.

## 2026-08-12 — CVG-SUB80-TO-95 — Execução local ENT95-10-D/13-D

- **status:** fatias locais implementadas e verificadas; tasks canônicas permanecem `READY_FOR_NEXT_STEP` até os critérios externos/humanos;
- **ENT95-10-D:** migration `0018_content_validity_window.sql`, `valid_until`/`next_review_at`, consulta de publicados vencidos por escopo, `expireDueContent` autorizado e idempotente, composição no worker, auditoria metadata-only e evento `content.withdrawn.v1`; artefato `PREMIUM-ENTERPRISE-95-CONTENT-LIFECYCLE-062`;
- **ENT95-13-D:** `web-performance-governance.json`, verificador e gate `verify:web-performance-governance`; budgets de bundle 250 KB, LCP 2.500 ms, INP 200 ms, CLS 0,1, retry máximo 2, duas medições sintéticas, três evidências PASS e quatro gaps manuais; artefato `PREMIUM-ENTERPRISE-95-WEB-PERF-063`;
- **TDD:** RED reproduziu os dois gaps de tooling; GREEN passou 4/4 no ciclo de vida, 7/7 no repositório e 3/3 na governança web;
- **verificação:** `pnpm verify` passou com 126 arquivos/575 testes/18 skips condicionais e cobertura 86,52%/82,53%/87,31%/87,28%; build dos 12 workspaces, E2E HA 3/3, migration 19/0018, contratos 55/55, worker 24/24, architecture 2/2, audit de dependências e `git diff --check` verdes;
- **limites:** não há scheduler produtivo autorizado, dashboard/drill operacional, Web Vitals reais, CI budget, offline/dispositivo representativo, SHA final ou reauditoria; `PASS_WITH_GAPS`, baseline 83,24 e `PILOT_BLOCKED` preservados;
- **próxima ação:** D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`; continuar 12-B/13-B/16-B somente nas fatias locais seguras.

## 2026-08-12 — ENT95-09-A/C/D + ENT95-10-C — jornada, contestação e correção

- **entrega:** `journey-correction-governance.json` e `scripts/verify-journey-correction-governance.mjs` consolidam quatro invariantes locais: jornada determinística owner/scope-scoped, runtime não punitivo, contestação com revisor independente e correção humana versionada/idempotente;
- **TDD:** RED reproduziu o verificador ausente; GREEN passou 2/2 no gate focal; a bateria de domínio/aplicação/contratos/persistência/API passou 33/35, com 2 integrações live condicionais mantidas como skip governado;
- **evidência:** 4/4 registros sintéticos PASS, 5 gaps explícitos, `PASS_WITH_GAPS`, `PILOT_BLOCKED`; artifact `PREMIUM-ENTERPRISE-95-JOURNEY-CORRECTION-065` ligado à rastreabilidade;
- **limites:** DB/RLS autorizado, UAT em turnos/dispositivos, alerta/SLA real, comunicação clínica de afetados, SHA e reauditoria permanecem pendentes; não alterar score ou status canônico;
- **próxima ação:** decidir D-ENT-01/07/09, abrir G-S80-0 e executar `ENT95-03-B`; continuar somente fatias locais seguras de 12-B/13-B/16-B.

## 2026-08-12 — Verificação final ENT95-FINAL-VERIFICATION-066

- **resultado:** `pnpm verify` passou com 127 arquivos/577 testes/18 skips; cobertura 86,53% statements, 82,52% branches, 87,31% functions e 87,28% lines;
- **runtime:** build dos 12 workspaces, E2E HA 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **governança:** jornada/correção 4/4 evidências PASS e 5 gaps; programa sub-80 6 itens/29 tasks/13 janelas/24 semanas/10 gates; baseline 83,24 e `PILOT_BLOCKED` preservados;
- **limites:** nenhum commit/RC/score promotion; DB/RLS autorizado, UAT, SLA, comunicação clínica, revisão clínica, WCAG manual, Web Vitals/CI, soak/DR e reauditoria independente seguem abertos;
- **próxima ação:** D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`.

## 2026-08-14 — AUDIT-LOCAL-067

- **status:** auditoria local concluída; estado `WAITING_HUMAN_APPROVAL`, release/piloto/publicação clínica `PILOT_BLOCKED`;
- **evidência:** 15 documentos de `docs/` lidos; `pnpm verify` 127 arquivos/577 testes/18 skips; cobertura 86,53%/82,52%/87,31%/87,28%; build 12 workspaces; E2E HA 3/3; edge security PASS; smoke 200/200, p95 186,68 ms; audit de dependências limpo;
- **gaps confirmados:** gate produtivo fechado por 11 referências externas ausentes; ausência de SHA imutável do worktree/runtime, IdP/MFA real, operação pública/externa, revisão clínica de 763 itens, CI/deploy/rollback atuais, WCAG manual, Web Vitals/soak/DR e reauditoria independente;
- **score:** baseline 83,24/100 preservada, sem promoção;
- **próxima ação:** Ricardo decidir D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`; não liberar release, piloto ou publicação clínica.

## 2026-08-14 — BLOCKER-PLAN-068 — Plano para os oito bloqueios

- **status:** plano/roadmap/backlog atualizados; execução `WAITING_HUMAN_APPROVAL`, release/piloto/publicação clínica `PILOT_BLOCKED`;
- **relatório:** `docs/112_current_construction_report_2026-08-14.md` salvo com a nota 83,24/100 e as 16 notas por item;
- **plano executivo:** `BRIEFING/03.BUILD/0305_sub80_to_95_executive_plan.md` agora contém BLK-01…BLK-08, resultado contratado, beta clínico com veterinários e critérios de encerramento;
- **roadmap:** `BRIEFING/04.AUDIT/0510_sub80_to_95_roadmap.md` agora contém linhas B-L1…B-L6, sequência S0–S12 e gates B-G1…B-G8;
- **backlog:** `BRIEFING/04.AUDIT/0511_sub80_to_95_backlog.md` agora contém tasks de beta clínico, IdP/MFA/recovery, DNS/TLS, backup/RPO/RTO/DR, CI/registry/deploy/rollback, SHA/runtime, UAT/WCAG/Web Vitals/soak e rastreabilidade 145/145;
- **próxima ação:** D-ENT-01/07/09 → G-S80-0; preparar BLK-06-A/BLK-08-A sem commit destrutivo e depois iniciar BLK-01-B/ENT95-03-B.

## 2026-08-14 — BLOCKER-PREFLIGHT-069 — BLK-06-A e BLK-08-A

- **status:** preflight local executado; tasks permanecem `IN_PROGRESS`, estado geral `WAITING_HUMAN_APPROVAL`, `PILOT_BLOCKED`;
- **BLK-06-A:** 95 alterações rastreadas, 81 arquivos não rastreados, 176 entries no worktree, SHA atual registrado e `git diff --check` verde; runtime ainda sem vínculo source SHA declarado;
- **BLK-08-A:** matriz premium estruturalmente reconhecida com 145 requisitos, 49 linhas de evidência local, 43/87 RF P0/P1 e 0/145 cadeias completas;
- **evidência:** `docs/113_blocker_preflight_2026-08-14.md` e `pnpm verify:premium-traceability` (`PASS_WITH_GAPS`);
- **limite:** não houve commit, reset, limpeza destrutiva, deploy ou promoção de score; revisão humana do diff e RC continuam necessários;
- **próxima ação:** classificar os 176 entries, completar owner/risco/task da matriz sem placeholders e aguardar D-ENT-01/07/09 → G-S80-0.

## 2026-08-14 — BLOCKER-EXTERNAL-READINESS-070

- **status:** readiness externo auditado sem credenciais; nenhum gate promovido; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`;
- **IdP:** `pnpm ops:verify-identity-provider` retornou `NOT_EXECUTED` por ausência de ambiente aprovado;
- **segurança produtiva:** `pnpm ops:verify-production-security` retornou `NOT_EXECUTED` sem flag/autorização; a execução autorizada anterior permaneceu fail-closed por referências ausentes;
- **release manifest:** `pnpm ops:verify-release-manifest` passou somente no manifesto de exemplo local, sem provar registry/deploy/rollback reais;
- **evidência:** `docs/113_blocker_preflight_2026-08-14.md`;
- **próxima ação:** fornecer ambientes/decisões autorizados para BLK-02/03/04/05/07 e continuar preflight local sem declarar conclusão.

## 2026-08-14 — BLOCKER-TRACEABILITY-GAP-071

- **status:** análise local de BLK-08-B executada; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **evidência:** `docs/114_traceability_gap_analysis_2026-08-14.md` e análise do artefato `PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX`;
- **resultado:** 145 requisitos na matriz, 0/145 cadeias completas, 49/145 linhas com evidência local, 43/87 P0/P1 com evidência local, 96/145 linhas com módulo/contrato/teste/artefato pendentes e 145/145 commits pendentes;
- **execução:** definidos lotes T-01 aprendizagem/runtime, T-02 avaliação/decisões, T-03 autoria/publicação, T-04 identidade/administração e T-05 RNFs/operação;
- **limite:** nenhuma linha foi promovida e nenhum placeholder foi substituído por inferência; commit, release, prioridades dos RNFs, gates externos e revisão clínica continuam dependentes de decisão/evidência autorizada;
- **próxima ação:** executar BLK-08-B por lotes com evidência real e só depois BLK-08-C/D no mesmo SHA de RC.

## 2026-08-14 — BLOCKER-TRACEABILITY-VALIDATION-072

- **status:** validação documental pós-BLK-08-B passou; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify:documentation`, `pnpm verify:premium-traceability` e `git diff --check` passaram;
- **resultado:** a matriz permanece `PASS_WITH_GAPS`, com 145 requisitos, 0/145 cadeias completas, 49 evidências locais, 43/87 P0/P1 com evidência local e 145 commits pendentes;
- **limite:** nenhum requisito, score, release ou piloto foi promovido;
- **próxima ação:** executar BLK-08-B por lotes com evidência real e aguardar ambientes/decisões para BLK-02/03/04/05/07.

## 2026-08-14 — GOVERNANCE-ARTIFACTS-VALIDATION-073

- **status:** validação dos artefatos passou; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify:sub80-program` passou com 6 itens/29 tasks/13 sprints/24 semanas/10 gates; Prettier, documentação, rastreabilidade e `git diff --check` também passaram;
- **resultado:** relatório, plano executivo, roadmap, backlog e matriz seguem consistentes, sem promoção de score ou release;
- **limite:** os checks documentais não substituem execução clínica, ambientes externos, RC/SHA, UAT, DR, Web Vitals ou reauditoria;
- **próxima ação:** continuar apenas evidência local não ambígua e aguardar decisões/ambientes autorizados para BLK-01/02/03/04/05/07.

## 2026-08-14 — FINAL-LOCAL-VALIDATION-074

- **status:** rodada local encerrada por dependência externa/humana; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks finais:** `pnpm verify:documentation`, `pnpm verify:premium-traceability` e `git diff --check` passaram;
- **resultado:** pacote documental consistente; matriz `PASS_WITH_GAPS`, 0/145 cadeias completas, 49/145 evidências locais, 43/87 P0/P1 com evidência local e 145 commits pendentes;
- **limite:** não há 100% global, nem promoção de score/release/piloto/publicação clínica; faltam decisões, ambientes externos, veterinários beta e fronteira de commit;
- **retomada:** executar BLK-01/02/03/04/05/07 e BLK-08-B/C/D no mesmo RC/SHA após disponibilização dos inputs autorizados.

## 2026-08-14 — TRACEABILITY-EVIDENCE-BATCH-075

- **status:** primeiro lote local de BLK-08-B executado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **requisitos mapeados:** RF-003, RF-004, RF-011, RF-012, RF-032, RF-037, RF-051, RF-095, RF-098 e RNF-085;
- **checks:** testes focalizados passaram 80/80, com 5 skips condicionais; `pnpm verify:traceability` passou;
- **resultado:** rastreabilidade local subiu para 59/145 linhas e 52/87 P0/P1; 86 linhas ainda têm gaps de módulo/contrato/teste/artefato; 145 commits/SHA continuam pendentes;
- **limite:** nenhuma linha foi promovida a `RELEASE_READY`; RNF-085 permanece aguardando prioridade de produto;
- **próxima ação:** continuar o mapeamento apenas com evidência direta e resolver worktree/RC e gates externos antes de BLK-08-C/D.

## 2026-08-14 — TRACEABILITY-EVIDENCE-BATCH-076

- **status:** microfatia local de BLK-08-B executada; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **requisito mapeado:** RF-006;
- **checks:** `pnpm verify:premium-traceability`, `pnpm verify:traceability`, `pnpm verify:documentation` e `git diff --check` passaram;
- **resultado:** rastreabilidade local subiu para 60/145 linhas e 53/87 P0/P1; 85 linhas ainda têm gaps de módulo/contrato/teste/artefato; 145 commits/SHA continuam pendentes;
- **limite:** nenhuma linha foi promovida a `RELEASE_READY`; o lote não autoriza release, piloto ou publicação clínica;
- **próxima ação:** continuar o mapeamento apenas com evidência direta e resolver worktree/RC e gates externos antes de BLK-08-C/D.

## 2026-08-14 — TRACEABILITY-EVIDENCE-BATCH-077

- **status:** nova microfatia local de BLK-08-B executada; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **requisito mapeado:** RF-042, com módulos de catálogo/runtime, contrato de aprendizagem, teste focal dos três estágios progressivos e artifact curricular existente;
- **checks:** teste focal do runtime passou 15/15; `pnpm verify:premium-traceability` e `pnpm verify:traceability` passaram;
- **resultado:** rastreabilidade local subiu para 97/145 linhas e 60/87 P0/P1; 48 linhas ainda têm gaps de módulo/contrato/teste/artefato; 145 commits/SHA continuam pendentes;
- **limite:** nenhuma linha foi promovida a `RELEASE_READY`; o lote não autoriza release, piloto ou publicação clínica;
- **próxima ação:** continuar o mapeamento apenas com evidência direta e resolver worktree/RC e gates externos antes de BLK-08-C/D.

## 2026-08-14 — FULL-LOCAL-VERIFICATION-078

- **status:** verificação local completa concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 127 arquivos de teste, 578 testes passados, 18 skips condicionais e cobertura 86,53% statements / 82,52% branches / 87,31% functions / 87,28% lines;
- **resultado:** não houve regressão; a matriz permanece em 0/145 cadeias completas, 97/145 evidências locais, 60/87 P0/P1 e 48 gaps de evidência; 145 commits/SHA continuam pendentes;
- **limite:** checks locais não substituem IdP/MFA real, DNS/TLS público, backups/RPO/RTO, CI/registry/deploy/rollback, clinical beta, UAT/WCAG/Web Vitals/soak/DR ou fechamento de worktree;
- **próxima ação:** executar gates externos, clínicos, release, UAT, DR e BLK-08-C/D somente com decisões, ambientes e RC/SHA autorizados.

## 2026-08-14 — REPORT-RECONCILIATION-079

- **status:** relatório e handoff documental reconciliados; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **resultado:** relatório atualizado para 19 documentos, 578 testes passados, 97/145 evidências locais, 60/87 P0/P1 e 48 gaps de evidência; baseline 83,24/100 e item 16 em 65/100 permanecem sem promoção;
- **checks:** `pnpm verify:documentation` e `git diff --check` passaram;
- **limite:** o pacote documental não fecha commit/SHA, release, revisão clínica, identidade/edge/backup/CI, UAT, DR ou 145/145;
- **próxima ação:** disponibilizar decisões, ambientes autorizados e fronteira de commit para continuar BLK-01…BLK-08.

## 2026-08-14 — EXTERNAL-READINESS-PREFLIGHT-080

- **status:** preflight externo reexecutado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **evidência:** fonte operacional e runtime confirmam stack local/LAN/Tailscale em `:3180`, `:3181` com `tls internal` e `:3182` loopback; sem FQDN público ou certificado gerenciado;
- **checks:** IdP e segurança produtiva retornaram `NOT_EXECUTED`; manifesto de exemplo passou, sem representar registry/deploy/rollback reais;
- **decisão:** não ativar DNS/TLS, não provisionar credenciais, não publicar imagem e não alterar Caddy/deploy sem autorização e ambiente;
- **próxima ação:** obter domínio, IdP, storage, registry, CI, coorte clínica e decisões D-ENT-01/04/05/06/07/08/09 para executar BLK-02…BLK-07 e BLK-08-C/D no mesmo RC/SHA.

## 2026-08-14 — TRACEABILITY-SHA-PREFLIGHT-081

- **status:** microfatia local de BLK-08-B e preparação do contrato de SHA concluídas; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **requisitos mapeados:** `RF-005`, `RF-052`, `RF-054`, `RF-055`, `RF-075`, `RF-076`, `RNF-031`, `RNF-040`, `RNF-042` e `RNF-081`;
- **checks:** `pnpm verify:premium-traceability`, `pnpm verify:traceability`, `pnpm ops:verify-ha`, teste focal de contrato de produção e `git diff --check` passaram;
- **resultado:** rastreabilidade local em 107/145 linhas e 66/87 P0/P1; 0/145 cadeias completas e 38 linhas ainda têm gaps de módulo/contrato/teste/artefato; 145 commits/SHA continuam pendentes;
- **implementação auxiliar:** Dockerfile/Compose HA propagam `SOURCE_SHA` para label OCI e `CVG_SOURCE_SHA`; isso prepara o caminho, mas não prova RC/commit/runtime imutável;
- **limite:** nenhuma linha foi promovida a `RELEASE_READY`; gates externos, revisão clínica dos 763 itens, UAT/WCAG/Web Vitals/soak/DR, release e piloto continuam bloqueados;
- **próxima ação:** reexecutar `pnpm verify`/`pnpm verify:documentation` e, após autorização, executar BLK-02…BLK-07 e BLK-08-C/D no mesmo RC/SHA.

## 2026-08-14 — FULL-LOCAL-VERIFICATION-082

- **status:** verificação transversal pós-microfatia concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 127 arquivos de teste, 579 testes, 18 skips condicionais e cobertura 86,53% statements / 82,52% branches / 87,31% functions / 87,28% lines; documentação, rastreabilidade e `git diff --check` também passaram;
- **resultado:** não houve regressão local; a matriz permanece em 0/145 cadeias completas, 107/145 evidências locais, 66/87 P0/P1 e 38 gaps locais; o score 83,24/100 e o item 16 em 65/100 não foram promovidos;
- **limite:** os gates locais não substituem IdP/MFA real, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback, revisão clínica dos 763 itens, UAT/WCAG/Web Vitals/soak/DR ou RC/SHA;
- **próxima ação:** obter decisões e ambientes autorizados para executar BLK-02…BLK-07 e BLK-08-C/D no mesmo RC/SHA, mantendo release, piloto e publicação clínica bloqueados.

## 2026-08-14 — DOCUMENTATION-RECONCILIATION-083

- **status:** snapshot documental reconciliado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** `docs/114_traceability_gap_analysis_2026-08-14.md` agora lista nominalmente os 38 requisitos sem elo local verificável;
- **checks:** `pnpm verify:documentation` e `git diff --check` passaram;
- **resultado:** `0/145` cadeias completas, `107/145` evidências locais, `66/87` P0/P1, `38` gaps locais e `145/145` commits/SHA pendentes;
- **limite:** nenhum requisito, score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** retomar somente evidência direta ou aguardar autorizações/ambientes para gates externos, clínicos e RC/SHA.

## 2026-08-14T04:08:04-03:00 — TRACEABILITY-EVIDENCE-BATCH-084

- **status:** BLK-08-B microfatia local concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** RF-007, RF-092, RF-075 e RNF-083 receberam evidência direta em código/contrato/teste/artefato, sem preencher campos por proximidade;
- **resultado:** `110/145` linhas com evidência local, `68/87` P0/P1, `35` gaps explícitos, `0/145` cadeias completas e `145/145` commits/SHA pendentes;
- **próxima ação:** continuar BLK-08-B nos 35 gaps restantes com TDD e manter os gates externos/clínicos bloqueados até autorização.

## 2026-08-14T04:13:59-03:00 — FULL-LOCAL-VERIFICATION-085

- **status:** verificação transversal pós-microfatia concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 127 arquivos de teste, 579 testes, 18 skips condicionais e cobertura 86,53% statements / 82,52% branches / 87,31% functions / 87,28% lines; gates encadeados passaram;
- **resultado:** nenhuma regressão local; matriz em `0/145` cadeias completas, `110/145` evidências locais, `68/87` P0/P1, `35` gaps e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; IdP/MFA, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback, beta clínico, UAT/WCAG/Web Vitals/soak/DR e RC/SHA permanecem pendentes;
- **próxima ação:** executar a próxima microfatia de BLK-08-B somente com RED/GREEN e evidência requisito-específica.

## 2026-08-14T04:42:52-03:00 — FULL-LOCAL-VERIFICATION-086

- **status:** verificação integral concluída; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 128 arquivos de teste, 583 testes, 18 skips condicionais e cobertura 86,51% statements / 82,42% branches / 87,44% functions / 87,25% lines; gates encadeados passaram;
- **resultado:** matriz em `0/145` cadeias completas, `126/145` evidências locais, `73/87` P0/P1, `19` gaps de módulo/contrato/teste/artefato e `145/145` commits/SHA pendentes;
- **limite:** não houve promoção de score, release, piloto ou publicação clínica; os 763 conteúdos, IdP/MFA real, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback, UAT/WCAG/Web Vitals/soak/DR e RC/SHA permanecem pendentes;
- **próxima ação:** executar os 19 gaps somente com evidência direta e obter autorizações/ambientes para os gates externos, clínicos e de release no mesmo RC/SHA.

## 2026-08-14T10:15:55-03:00 — LOCAL-GAPS-AND-TRACEABILITY-104

- **status:** BLK-08-B local encerrado em evidência; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** RF-063, RF-072, RF-073, RF-093, RF-094, RNF-012, RNF-072, RNF-075, RNF-084 e RNF-086 agora apontam para módulos, contratos, testes e artefatos locais existentes; a janela de manutenção ganhou contrato Zod em RED/GREEN;
- **checks:** `pnpm verify` passou com 160 arquivos/701 testes/18 skips e cobertura 84,26% statements / 80,62% branches / 85,64% functions / 85,06% lines; migrations 28/28, contratos 81/81 e worker 24/24 passaram;
- **resultado:** rastreabilidade subiu para 145/145 linhas com evidência local e 87/87 P0/P1; cadeias completas continuam 0/145, pois 145/145 commits/SHA e artefatos de release no mesmo SHA ainda não existem;
- **limite:** o recálculo permanece port local sem adapter PostgreSQL/rota/worker; horários hospitalares de manutenção ainda não foram configurados; não há promoção de score, release ou piloto;
- **próxima ação:** revisar o diff completo, obter a fronteira autorizada de commit/RC e executar gates externos, clínicos, humanos, UAT, DR e reauditoria no mesmo SHA.

## 2026-08-14T10:42:04-03:00 — ASSESSMENT-RECALCULATION-LOCAL-INTEGRATION-105

- **status:** BLK-08-B local encerrado; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **entrega:** recálculo determinístico agora possui persistência PostgreSQL/RLS, registro de candidatos, atualização otimista, outbox `assessment.recalculated.v1`, rota interna protegida e reconhecimento no worker; migration 0028 aplicada localmente;
- **checks:** `pnpm verify` passou com 161 arquivos/706 testes/18 skips e cobertura 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines; migrations 29/29, contratos 81/81 e worker 24/24 passaram;
- **resultado:** rastreabilidade em 145/145 linhas com evidência local e 87/87 P0/P1; cadeias completas continuam 0/145, pois 145/145 commits/SHA e artefatos de release no mesmo SHA ainda não existem;
- **limite:** integração local não substitui revisão clínica dos 763 conteúdos, entrega clínica externa, IdP/MFA, DNS/TLS, backup/RPO/RTO, CI/registry/deploy/rollback, UAT, WCAG manual, Web Vitals reais, soak, DR ou aprovação humana;
- **próxima ação:** revisar o diff completo, obter a fronteira autorizada de commit/RC e executar os gates externos, clínicos e operacionais no mesmo SHA.

## 2026-08-14T10:48:35-03:00 — WEB-RUNTIME-REPAIR-106

- **status:** inconsistência local de build/runtime corrigida; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **evidência:** web recompilado com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182`, serviço reiniciado e `pnpm test:e2e:active-ha` passou 3/3;
- **escopo coberto:** proxy real, atividade sintética persistida e ciclo administrativo de login, dashboard, suspensão, reativação e revogação de sessões;
- **limite:** a evidência continua local; não fecha os gates de domínio/TLS, IdP/MFA, backup/RPO/RTO, CI/registry/deploy/rollback, UAT/WCAG/Web Vitals/soak/DR, beta clínico ou RC/SHA;
- **próxima ação:** revisar o diff completo e obter a fronteira autorizada de commit/RC antes da execução externa no mesmo SHA.

## 2026-08-14T10:51:57-03:00 — FINAL-LOCAL-VERIFICATION-107

- **status:** verificação local integral encerrada sem regressão; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **checks:** `pnpm verify` passou com 161 arquivos/706 testes/18 skips, cobertura 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines; migrations 29/29; E2E HA 3/3; `git diff --check` passou;
- **rastreabilidade:** 145/145 linhas com evidência local, 87/87 P0/P1, 0/145 cadeias completas e 145/145 commits/SHA pendentes;
- **limite:** os gates externos, clínicos, humanos e de release continuam abertos; nenhum score, release, piloto ou publicação clínica foi promovido;
- **próxima ação:** revisar o diff completo e obter autorização explícita para commit/RC antes de qualquer execução externa no mesmo SHA.

## 2026-08-14T11:02:00-03:00 — LOCAL-RC-COMMIT-AND-ROLLBACK-108

- **status:** worktree local limpo no commit `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **rastreabilidade:** 145/145 linhas ancoradas no SHA local, sem `GAP:commit-pending` ou `GAP:worktree-sha-pending`; 0/145 cadeias completas porque estado/release e gates externos continuam bloqueados;
- **evidência:** ensaio local de release/deploy/rollback passou e restaurou o runtime com release digest `sha256:8c3b2acd13236eefed6f5d639f133eb9e0dc28acd63fd4c861cb9d81d0684524` e rollback digest `sha256:cf03cb172580d36c7eecb1f706bbf1605c46f0377ca55061a2c1b870b27143dd`;
- **limite:** isso não comprova registry/deploy externo, IdP/MFA, DNS/TLS público, backup/RPO/RTO, beta clínico, UAT, WCAG manual, Web Vitals reais, soak, DR ou reauditoria;
- **próxima ação:** reconstruir o runtime com `CVG_SOURCE_SHA` do RC e executar apenas os gates externos autorizados.

## 2026-08-14T11:15:28-03:00 — LOCAL-RC-RUNTIME-109

- **status:** snapshot documental `1501070`, worktree limpo; implementação da matriz ancorada no commit `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`; `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` preservados;
- **runtime:** `cvg-trainee-vet:rc-local` comum em API-A/API-B e worker-A/worker-B, source SHA `e3aff802fe7ec104917e8cc6aa77bb0aea4f6229`, digest `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`, migrations `29/29`;
- **checks:** health live/dependencies `200/200`, três superfícies internas sensíveis `401/401/401` sem sessão, E2E HA `3/3`;
- **rollback:** ensaio local passou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`, rollback sintético `sha256:76b84ecd58011cbbffca2594cd2ce75b23b7ab57e66ebc7ea384b8d30f7567a4`;
- **verificação final:** `pnpm verify` passou com `161` arquivos, `706` testes, `18` skips governados, cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`, contratos `81/81`, worker `24/24` e migrations `29/29`;
- **rastreabilidade:** `145/145` evidências locais, `87/87` P0/P1, `0/145` cadeias completas; não há gaps de commit/worktree, mas estado/release e gates externos continuam pendentes;
- **próxima ação:** provisionar e executar os gates externos, clínicos, humanos e operacionais sem promover o piloto por inferência local.

## 2026-08-14T11:32:02-03:00 — LOCAL-OPERATING-EVIDENCE-110

- **fila clínica live:** `796` conteúdos, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; beta com veterinários preparado, revisão humana não executada;
- **capacidade local:** load smoke `5000/5000`, concorrência `100`, sucesso `100%`, throughput `770,79 req/s`, p95 `300,56 ms`;
- **backup/restore local:** backup administrativo fora do repositório verificado por SHA `f7e45a90783fe1416133879cd148c466e9342199fa2cc2b59b39dc58bc9f83ea`; restore isolado `PASS`, `32` objetos, RTO `4583 ms`; a conta de aplicação foi negada no schema `drizzle`;
- **gates:** IdP e segurança produtiva `NOT_EXECUTED`; manifest, traces e edge somente exemplo/staging;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`, `0/145` cadeias completas; próximos itens dependem de veterinários e ambientes/provedores externos.

## 2026-08-14T11:38:12-03:00 — REMOTE-CI-SOURCE-BUNDLE-111

- **evidência:** PR `#1` e runs `quality` remotos falharam em `verify:clinical-sources` por ausência de `BOOK_ETTINGER_9E`, `BOOK_FOSSUM_4E` e `BOOK_JERICO_CAES_GATOS` no checkout;
- **causa:** os PDFs licenciados existem somente fora do Git local; o gate local passa e o checkout remoto não consegue reproduzir a fonte;
- **ação necessária:** aprovar bundle privado/licenciado, armazenamento/artefato, credencial read-only e diretório temporário no CI; validar hashes antes do `pnpm verify`;
- **restrição:** não versionar PDF de terceiros e não remover o gate de fontes;
- **status:** CI remoto `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; nenhum push ou alteração remota executado.

## 2026-08-14T11:42:45-03:00 — REMOTE-CI-INFRASTRUCTURE-INVENTORY-112

- **evidência:** inventário read-only do GitHub encontrou zero secrets, zero variables, zero environments e zero deployments; o único workflow listado é `quality`;
- **impacto:** não há prova de registry, credencial CI, bundle licenciado acessível, ambiente de deploy ou alvo remoto de rollback;
- **ação necessária:** aprovar e provisionar essas dependências, sem versionar PDFs de terceiros e sem remover `verify:clinical-sources`;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; nenhum recurso remoto foi criado ou alterado.

## Snapshot operacional — RC no SHA executável e rollback local — 2026-08-14T11:57:48-03:00

BLK-06-D foi revalidado localmente: imagem `cvg-trainee-vet:rc-head-8cf40e567d02`, source SHA executável `8cf40e567d02149b9f5714c8b1084b60bd291426`, digest `sha256:aa5dc1b767745734f92b10359bb35920b6ab2096ed7cc5c6ce4927e592ad92bb`, quatro processos HA na mesma revisão, health `200/200`, E2E HA `3/3` e ensaio `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`.

O rollback local usa uma cópia sintética (`sha256:32a8b4dfca1e383354b439cb9118229ea4dcd3824c33496efee30d10af81d5a4`) e não prova registry, deploy, rollback ou RPO/RTO externos. BLK-01–BLK-05, BLK-07 e BLK-08-D permanecem dependentes de revisão veterinária, provedores, ambientes autorizados, UAT/operação e reauditoria; `completeChains=0/145`, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED` permanecem.

## Verificação integral no HEAD — 2026-08-14T12:03:46-03:00

`pnpm verify` passou com `161` arquivos/`706` testes/`18` skips, cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`, contratos `81/81`, worker `24/24`, migrations `29/29` e todos os verificadores locais previstos. O resultado não fecha os gates externos nem promove a baseline; `completeChains=0/145` e `PILOT_BLOCKED` permanecem.

## 2026-08-14 — HOSTINGER-REMOTE-INVENTORY-115

- **item:** verificar se o Hostinger disponível pode fechar os gates externos do Trainee Vet;
- **evidência:** SSH read-only; Ubuntu 24.04; Docker Compose; Caddy válido; UFW com 80/443; certificados Let's Encrypt e routes de outros produtos; ausência de projeto/container/imagem/route/FQDN do Trainee Vet; backups locais somente de outro sistema; ausência observada de `restic`, `rclone`, `aws` e agendamento específico de backup externo;
- **resultado:** Hostinger é candidato técnico, não ambiente autorizado. A capacidade genérica de edge não fecha DNS/TLS do produto; backups locais não fecham retenção externa, RPO/RTO ou DR; CI/registry/deploy/rollback continuam sem prova;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`;
- **owner/dependência:** Ricardo + SRE; decisão de alvo, FQDN, IdP, registry/CI, storage externo, retenção, janela de mudança e rollback;
- **critério de saída:** provisionamento autorizado no mesmo RC, HTTPS público renovável, IdP/MFA/recovery real, backup externo/restore/RPO/RTO, pipeline/registry/deploy/rollback por digest, UAT/DR e reauditoria;
- **restrição:** nenhuma escrita remota foi realizada; não ler ou registrar segredos; não reutilizar os backups de outro produto.

## 2026-08-14 — FULL-VERIFY-DOC-116

- **evidência:** `pnpm verify` após o inventário remoto passou com 161 arquivos/706 testes/18 skips, cobertura 83,78%/80,41%/84,95%/84,55%, contratos 81/81, worker 24/24, migrations 29/29 e gate de documentação consistente;
- **resultado:** qualidade e governança locais preservadas; `145/145` linhas têm evidência local, mas `0/145` cadeias completas;
- **status:** gates externos e humanos continuam `WAITING_HUMAN_APPROVAL`; disposição `PILOT_BLOCKED`;
- **próxima ação:** aprovar/provisionar alvo, FQDN, IdP, registry/CI, storage, retenção, janela e rollback antes de qualquer escrita remota.

## 2026-08-14 — LOCAL-RC-REBUILD-E2E-FAILOVER-RESTORE-117

- **evidência:** runtime HA reconstruído no source SHA `16dcc2afda04866b1ecfaeb6017fe30bdadaa8be`, digest `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`; APIs e workers na mesma revisão, health `200/200`;
- **checks:** build/restart web; E2E web sintético `25/25`; E2E HA com fixture `3/3`; failover com `api-a` parada `500/500`, 100% e p95 `626,14 ms`; restore live `2/2`, RTO local direto `3.832 ms`;
- **governança:** documentação `PASS`, rastreabilidade `PASS_WITH_GAPS` (`145/145` linhas, `0/145` cadeias), Web Performance `PASS_WITH_GAPS`; edge permanece interno/staging;
- **limite:** evidência não fecha revisão clínica, IdP/MFA, DNS/TLS público, backup externo/RPO/RTO, CI/registry/deploy/rollback remoto, UAT/WCAG manual/Web Vitals reais, soak, DR ou reauditoria;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; próxima ação é revisão final do diff e provisionamento autorizado.

## 2026-08-14 — FULL-VERIFY-POST-RC-DOC-118

- **evidência:** `pnpm verify` passou com 161 arquivos/706 testes/18 skips, cobertura 83,78%/80,41%/84,95%/84,55%, contratos 81/81, worker 24/24, migrations 29/29 e gates locais verdes; `git diff --check` passou;
- **rastreabilidade:** `verify:premium-traceability=PASS_WITH_GAPS`, 145/145 linhas locais, 87/87 P0/P1 e 0/145 cadeias completas;
- **limite:** a execução não fecha revisão clínica, IdP/MFA, DNS/TLS, backup/RPO/RTO, CI/registry/deploy/rollback remoto, UAT/manual WCAG/Web Vitals, soak, DR ou reauditoria;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; próxima ação é revisão final e provisionamento autorizado no mesmo RC.

## 2026-08-14 — DOCUMENTATION-COMMIT-119

- **resultado:** relatório, estado, log, backlog, roadmap, plano executivo, remediação e análise de rastreabilidade consolidados no commit local convencional desta rodada;
- **restrição:** nenhuma alteração de código executável, push ou escrita remota; worktree limpo;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; provisionar os ambientes/provedores autorizados e reauditar o mesmo RC.

## 2026-08-14 — LOCAL-WEB-VITALS-BOUNDED-LOAD-120

- **evidência:** Chromium local mediu LCP `232/172 ms`, CLS `0/0` e INP proxy `120/144 ms` em mobile/desktop, HTTP 200;
- **capacidade:** carga delimitada `20.000/20.000`, concorrência `50`, throughput `889,41 req/s`, p95 `119,82 ms`, zero erros;
- **artefato:** `docs/115_local_web_vitals_capacity_evidence_2026-08-14.md`;
- **limite:** não fecha RUM público, UAT/manual WCAG, screen reader, soak de 24 horas, SLO, DR ou CI de budgets;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`.

## 2026-08-14 — REMOTE-CI-READONLY-RECHECK-121

- **evidência:** PR `#1` aberto, head remoto `d3964a9e45b624a4e3c3967ca8f684cb00210e8c`, dois checks `quality` mais recentes falhos;
- **infraestrutura:** `0` secrets, `0` variables, `0` environments e `0` deployments no repositório;
- **limite:** o RC local atual não foi publicado; bundle licenciado, CI verde, registry, deploy e rollback remoto permanecem pendentes;
- **status:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`.

## 2026-08-14 — DOCUMENTATION-COMMIT-122

- **resultado:** novo artefato de Web Vitals/carga, reconciliação do preflight e inventário CI foram consolidados com relatório, estado, log, backlog, roadmap, plano e rastreabilidade;
- **restrição:** nenhum push, alteração de código executável ou escrita remota; worktree limpo;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; provisionar dependências externas/humanas e reauditar o mesmo RC.

## 2026-08-14T13:18:25-03:00 — CLINICAL-SOURCE-BUNDLE-BOUNDARY-123

- **entrega:** fronteira segura para bundle privado/licenciado em `CVG_CLINICAL_SOURCES_DIRECTORY`, com caminho absoluto externo, basename sem traversal, variável documentada no CI e PDFs mantidos fora do Git;
- **checks:** testes focais `11/11`, `pnpm verify:ci-contract` e `pnpm verify:clinical-sources` passaram localmente;
- **resultado:** prepara a resolução de BLK-05 sem alegar CI remoto; `0/145` cadeias completas, baseline `83,24/100` e `PILOT_BLOCKED` permanecem;
- **próxima ação:** aprovar/provisionar bundle, credencial read-only, retenção, runner, registry, deploy e rollback; executar o pipeline e reauditar no mesmo RC.
- **commit local:** `9bfa2c1` (`fix: support external clinical source bundle`), sem push.

## 2026-08-14T14:38:49-03:00 — REMOTE-CI-DIAGNOSTIC-131

- **evidência:** GitHub Actions run `31402470511`/job `93500569913` no PR `#1` falhou em `verify:clinical-sources` por ausência dos três arquivos licenciados no checkout remoto;
- **head:** remoto `d3964a9e45b624a4e3c3967ca8f684cb00210e8c`, enquanto o worktree local está em `67552e4` e o RC executável está em `be43fc8f`;
- **infraestrutura:** `0` secrets, `0` variables, `0` environments e `0` deployments; nenhum push, dispatch ou provisionamento foi executado;
- **correção local:** `9bfa2c1` implementa `CVG_CLINICAL_SOURCES_DIRECTORY` absoluto, externo e hash-verificado, mas ainda aguarda publicação autorizada e bundle privado/licenciado;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; aprovar provider/bundle/push, publicar o RC, executar CI/registry/deploy/rollback e reauditar.

## 2026-08-14T14:24:40-03:00 — RUNTIME-PROVENANCE-GATE-130

- **entrega:** `scripts/verify-runtime-provenance.mjs` e testes focais `6/6`; o gate exige SHA explícito, `running/healthy`, imagem `@sha256`, digest comum, label OCI e `CVG_SOURCE_SHA` alinhados;
- **evidência:** recriação direta por tag foi rejeitada; rehearsal local passou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`; runtime final no SHA `be43fc8f7f410435a40550eb70e9b2a700882355`, digest `sha256:0ec956ffa267fd4534feaaf1000bd85adbacab77ce105775ea15a4af20b73fcf`, quatro processos HA e health `200/200/200`;
- **clínico:** fila live `796` total, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; modo estrito falhou de forma esperada, sem publicação;
- **aceite:** reforça somente BLK-06 local; não fecha revisão clínica, IdP/MFA, DNS/TLS público, backup/RPO/RTO, CI/registry/deploy/rollback externo, UAT, WCAG manual, Web Vitals reais, soak, DR ou `0/145`;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; provisionar dependências externas e reauditar o mesmo RC sem drift;
- **commit local:** `be43fc8` (`feat: add runtime provenance gate`), sem push.

## 2026-08-14T14:46:03-03:00 — FINAL-LOCAL-REVALIDATION-132

- **evidência:** proveniência, HA, edge security, documentação, rastreabilidade baseline e rastreabilidade premium passaram; runtime no SHA `be43fc8f7f410435a40550eb70e9b2a700882355`, digest `sha256:0ec956ffa267fd4534feaaf1000bd85adbacab77ce105775ea15a4af20b73fcf`, quatro containers alinhados;
- **estado:** worktree limpo no commit documental final; nenhuma escrita externa foi realizada;
- **aceite:** confirma apenas a fatia local; `0/145` cadeias, `83,24/100`, gates externos, clínicos e humanos permanecem abertos;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; obter autorizações/dependências e reauditar o mesmo RC.

## 2026-08-14T14:53:34-03:00 — EDGE-LIVE-REVALIDATION-133

- **evidência:** Compose executado com `infra/production/.env.local`; quatro processos de aplicação `healthy` no digest comum; `60/60` probes HTTP readiness retornaram `200`; HTTPS local respondeu `200` com hostname `localhost`;
- **limite:** certificado é `Caddy Local Authority - ECC Intermediate`; não comprova CA pública, DNS público ou TLS gerenciado;
- **risco observado:** logs do edge registram falhas intermitentes de resolução Docker de `api-a/api-b` e janelas `503 no upstreams available`, não reproduzidas na amostra curta;
- **status/next:** `PARTIAL` / `WAITING_HUMAN_APPROVAL`; investigar a intermitência e provisionar/verificar o edge público autorizado antes de promover BLK-03/BLK-07.

## 2026-08-14T15:03:15-03:00 — RUNTIME-HEAD-REANCHOR-134

- **entrega:** RC reconstruído no source SHA `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa`; rehearsal local passou `deploy`, `rollback` e `runtimeRestored=true`;
- **proveniência:** release digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b`; rollback sintético `sha256:b293b4235e2c2b614bfeec1887a509dbf0d1dcbb51d55344ba591f72a144ebc9`; quatro containers alinhados no mesmo digest/SHA;
- **health:** Compose `healthy`; live/ready/dependencies `200/200/200`; `ops:verify-ha` e `ops:verify-edge-security` passaram;
- **aceite:** fecha somente BLK-06 local; não prova promoção produtiva, edge público, CI remoto, backup, IdP/MFA, beta, UAT, soak/DR ou `0/145`;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; manter o RC imutável, investigar a intermitência do edge e aguardar as autorizações/provisionamentos externos.

## 2026-08-14T15:10:35-03:00 — FULL-VERIFY-CURRENT-RC-135

- **evidência:** `pnpm verify` passou com `163` arquivos/`719` testes/`18` skips e cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`; contratos `81/81`, worker `24/24`, migrations `29/29`, lint, typecheck, secrets e governanças passaram;
- **proveniência:** gate continuou `PASS` para os quatro containers no source SHA executável `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa` e digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b`;
- **aceite:** confirma qualidade local; `0/145` cadeias completas e gates externos/clínicos/humanos continuam abertos;
- **status/next:** `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; executar a reauditoria do mesmo RC somente após provisionamento e autorização.

## 2026-08-14T15:16:10-03:00 — REMOTE-CI-BETA-RECHECK-136

- **beta local:** fila escopada/paginada, `CLINICAL_APPROVER`, rota de decisão, persistência e bloqueio de publicação estão implementados nos commits `c7a591b` e `8670def`;
- **evidência live:** `796` conteúdos, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; revisão veterinária efetiva ainda não executada;
- **CI remoto:** PR `#1` continua no head `d3964a9e…`; runs `31402470511` e `31402464508` falham por ausência dos três arquivos licenciados; `0` secrets/variables/environments/deployments;
- **divergência:** o head remoto é ancestral do worktree local; as correções locais posteriores não foram publicadas e não houve push/dispatch;
- **status/next:** `READY_FOR_HUMAN_EXECUTION` para o beta técnico, `FAIL` para o CI remoto e `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED`; aprovar veterinários, bundle/licença, variável/runner e publicação do RC.
