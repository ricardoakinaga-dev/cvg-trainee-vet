# 0400 — Audit Scope — CVG

## Reauditoria vigente — AUD-2026-08-11-WORKTREE-LOGIN

- status: PASS_WITH_GAPS; release, piloto e publicação clínica não aprovados;
- escopo adicional: autenticação local por senha, migração 0015, runtime HA ativo, leitura agregada do PostgreSQL, rotas protegidas, build web com proxy, smoke de carga e tentativa de E2E real;
- evidência principal: 0509_current_worktree_audit_2026-08-11.md;
- resultado: pnpm verify, pnpm build, E2E sintético 12/12, audit de dependências, secret scan, HA topology e smoke HTTP passaram; o E2E real falhou no seed por RLS em activity_assignments; o load smoke default falha por conversão de 5_000;
- limites: evidência local e sintética, somente M02 atribuída no banco ativo, nenhum SHA final para o worktree atual, sem MFA/recuperação externa, TLS, traces duráveis, deployment/rollback ou piloto.

**Status:** `ESCOPO_EXECUTADO_PARCIALMENTE; RELEASE NÃO APROVADO`  
**Janela:** 2026-08-09, desenvolvimento local, commit de trabalho não congelado; escopo atual F3-S3 + complementos F3-S4/F3-S5/F3-S6/F3-S7/F3-S8/B0–F3.

## Escopo

- versão auditada: fundação B0 + domínio/contratos B1 + persistência/API F2-S2 + leitura de atividade publicada F3-S1 + F3-S2 de conteúdo/progresso/worker/integrações + F3-S3 de identidade/correção/feedback + complementos F3-S4 de web participante/E2E, F3-S5 de observabilidade/redaction, F3-S6 de hardening de borda, F3-S7 de reconciliação Qdrant e F3-S8 de rotação/revogação;
- ambiente: PostgreSQL efêmero local, Qdrant local protegido, API Node compilada em `127.0.0.1`;
- fluxos reproduzidos: migrações 0000–0006, atividade/content version sintéticos, atribuição, leitura ordenada por rota/caso de uso, início/submissão, SaveAnswer, idempotência, outbox, auditoria, sessão/revogação, convite administrativo, aceite único, ativação, transição editorial, correção humana versionada, feedback por dono, progresso/retomada, worker claim/lease/retry, sink de IA, health, coleção Qdrant, filtro de escopo, remoção de versão, inicialização agregada e projeções públicas;
- segurança reproduzida: validação Zod, deny-by-default, cookie server-side com hash, RLS mínima da auditoria, scan de segredos, audit de dependências, rejeição de campos internos e redaction do sink;
- fora do escopo executado: API real atrás do navegador E2E, autoria/operação web, recuperação além do convite administrativo, rate limit compartilhado para múltiplas réplicas, rubrica automática/remediação/contestação, RLS contextual, collector/retention/alertas, traces distribuídos, dashboards, backup/restore, execução operacional conjunta da reconciliação com integrações habilitadas, axe/revisão manual de acessibilidade e chamada real de IA.

## Evidências aceitas

CI, commit/lockfile, relatórios de cobertura, OpenAPI, migrações, traces, logs redigidos, métricas, healthchecks, queries de integridade, testes E2E, restore sintético, configuração versionada e observação controlada. Nunca coletar PDF, foto, prontuário, dado real desnecessário, prompt completo ou resposta interna em evidência de participante.

## Limitações obrigatórias

O auditor não altera dados, nota, gabarito, papel ou conteúdo durante a coleta. Evidência sensível deve ser minimizada, redigida e armazenada no escopo interno autorizado. Se não houver runtime observável, marcar `NOT_EXECUTED`, não `PASS`.

## Evidências desta janela

- `AUD-F3-001`: `pnpm test:coverage` — 49 arquivos passaram, 8 foram ignorados por ausência de serviço live; 212 testes passaram, 8 foram ignorados; cobertura global 85,56% statements / 81,44% branches / 84,45% functions / 86,64% lines;
- `AUD-F3-002`: `pnpm build`, `pnpm typecheck`, `pnpm lint`, scans de segredo, rastreabilidade e fronteira pública verdes nesta atualização;
- `AUD-F3-003`: teste live PostgreSQL — migrações 0000–0006, Start/Submit, SaveAnswer, idempotência, outbox, sessão, revogação, auditoria com RLS mínima, atividade publicada, transição editorial, convite/aceite/ativação, correção humana, feedback e progresso verdes;
- `AUD-F3-004`: teste live Qdrant — coleção sintética, dimensão, índices, upsert, busca filtrada e remoção de versão verdes; coleção temporária removida ao final;
- `AUD-F3-005`: API compilada e rotas de atividade, transição editorial e progresso cobertas por testes HTTP; readiness real com PostgreSQL/Qdrant habilitado permanece evidência complementar;
- `AUD-F3-006`: IA server-side fake — JSON Schema estrito, `store=false`, timeout, `maxRetries=0`, dimensionamento de embedding, worker e sink `DRAFT_AI` verdes; chamada externa real não executada;
- `AUD-F3-007`: Playwright — 3 cenários sintéticos passaram em build de produção (`next build` + `next start`) para aceite de convite, erro público limitado, projeção sem campos proibidos e ciclo iniciar–salvar–submeter; API foi interceptada e nenhum dado clínico real foi usado;
- `AUD-F3-008`: autoria/operação web, API real atrás do navegador, recuperação além do convite administrativo, rubrica automática/remediação, RLS contextual, collector/retention/alertas, traces distribuídos, dashboards, rate limit compartilhado, backup/restore, execução operacional conjunta da reconciliação com integrações habilitadas, axe/revisão manual de acessibilidade e IA externa real — `NOT_EXECUTED` nesta janela;
- `AUD-F3-009`: logger JSON allowlisted, correlação local API/worker, contadores/histogramas em memória e testes negativos de redaction — `PASS_WITH_GAPS`; exporter/collector, retenção, alertas e traces distribuídos não executados.
- `AUD-F3-010`: CSRF por origem/metadado Fetch, rate limit bounded, `Retry-After`, health isento e drenagem de corpo rejeitado — `PASS`; rate limit distribuído e E2E navegador→API real não executados; rotação/revogação foi coberta no complemento F3-S8.
- `AUD-F3-011`: quality gate pós-F3-S6 — verify, build, E2E, audit de dependências, 9 integrações live e diff-check — `PASS`; cobertura global 86,03% statements / 81,70% branches / 84,69% functions / 87,06% lines.
- `AUD-F3-012`: quality gate pós-F3-S7 — verify, build, E2E, audit de dependências, 9 integrações live, comando de reconciliação desabilitado com segurança e diff-check — `PASS`; cobertura global 85,82% statements / 81,12% branches / 85,14% functions / 86,79% lines.
- `AUD-F3-013`: quality gate pós-F3-S8 — `pnpm verify`, build de produção web, `pnpm build`, E2E, audit de dependências, 9 integrações live PostgreSQL/Qdrant, `git diff --check` e Prettier — `PASS`; 52 arquivos passaram, 224 testes passaram, 8 foram ignorados por configuração live da cobertura; cobertura global 85,03% statements / 80,38% branches / 84,45% functions / 86,24% lines; três cenários Playwright passaram com API interceptada e sem dados reais.

## Rodada vigente — 2026-08-11T22:15:31-03:00

Escopo congelado para a auditoria atual: documentação completa de `docs/`, gates Discovery→PRD→SPEC→BUILD→AUDIT, worktree no HEAD `9803c85`, runtime HA local/LAN/Tailscale, PostgreSQL/Qdrant/worker/API/web, segurança, dados, integrações, observabilidade, experiência e prontidão do programa curricular. Foram incluídos os incrementos administrativos e o contrato de build web presentes no worktree.

Evidências principais: `pnpm verify`, `pnpm audit --audit-level=high`, `pnpm test:e2e:active-ha` 2/2, E2E web focado 15/15, smoke 200/200, trace após restart do Tempo, health/headers/métricas, consultas administrativas read-only e logs redigidos. Dados reais, prontuários, tutores, fotos, PDFs, segredos, credenciais e publicação clínica não fazem parte do escopo.

Resultado de escopo: `PASS_WITH_GAPS`; release `WAITING_HUMAN_APPROVAL`.
