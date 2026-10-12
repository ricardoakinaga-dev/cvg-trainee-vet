# 63 — Backlog de remediação da auditoria de 2026-10-11

**Entrega do planejamento:** COMPLETED nesta rodada. **Execução:** não iniciada;
SA-01 é a primeira task selecionável.
**Roadmap:** [62](62_roadmap_audit_remediation_2026-10-11.md).
**Origem:** [auditoria de sistema de 2026-10-11](audits/system-audit-2026-10-11.md)
(AUD-S-01…AUD-S-10; matriz de 17 itens).
**Controle:** [backlog mestre](30_backlog_master.md) e [estado](99_runtime_state.md).

## 1. Regras e contratos de trabalho

São **23 tasks**: 22 de remediação/validação (SA-01…SA-32) e 1 de manutenção
(SA-40). `SAxx` é abreviação de `AUD-SYSTEM-20261011-SAxx`. Cada AUD-S tem pelo
menos uma task principal; compartilhar origem ou módulo não autoriza duas
implementações concorrentes. Sobreposição com `AUDIT-20261003-Txx/Gxx` e
`PROD-Mxx` exige delta ou revalidação, nunca segunda implementação do mesmo
comportamento.

READY_FOR_NEXT_STEP indica task preparada para seleção após dependências; não
significa início nem aprovação. WAITING_HUMAN_APPROVAL marca decisão pendente
(SA-05, SA-10/SA-11 parcialmente, SA-30). BLOCKED registra dependência crítica
(SA-02…04, SA-12/13/15, SA-20…25, SA-31/32). Na seleção, registrar IN_PROGRESS
ou BLOCKED com causa, impacto, ação e dependência conforme o estado observado.

Os donos são papéis propostos; o implementador não é o revisor independente da
sua evidência; estado/log/backlog têm um único escritor por rodada.

Para **toda task de código**, a definição de pronto inclui: RED discriminante,
GREEN mínimo, REFACTOR, testes proporcionais, lint/typecheck/formato, secrets,
diff-check, revisão técnica/segurança e traceability atualizada. Dependências
alteradas exigem audit e lockfile fixado. Invariantes de dados/autorização têm
testes positivos e negativos. Pisos de cobertura 90/85/90/90 preservados;
cenários críticos não dependem só da média. Tasks documentais/de decisão usam
inspeção, links, consistência e registro da decisão, sem inventar RED.

**Rollback comum:** reverter apenas a fatia isolável quando houver autorização
de execução/commit ou aplicar correção forward revisada; manter o gap aberto.
Não resetar banco, reescrever evidência histórica, reduzir a barra ou relaxar
autorização. Evidência de cada task registra snapshot, ambiente, comando,
resultado/skips, revisão, artefato e limitações.

### Referências usadas nas tasks

Aliases S-DOM…S-TEST como no backlog 61
(`BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/`). Decisões:
`docs/decisions/2026-10-02-rem06-summative-eligibility.md`,
`docs/decisions/2026-10-08-production-unblock.md`. Operação:
`docs/operations/*`, `deploy/*`. Evidência bruta da auditoria:
`.agent/artifacts/audit-20261011/`.

## 2. Índice de execução

| Sprint | Tasks | Responsável proposto | Dependência de integração |
| --- | --- | --- | --- |
| S0.1 | SA-01/SA-02 | Release engineering | H-REMOTE vigente; runs `quality`/`security` |
| S0.2 | SA-03/SA-04 | Release engineering + revisor independente | Árvore estável; summaries/mutação no HEAD |
| S0.3 | SA-05 | Ricardo + segurança | Decisão same-UID (G03) |
| S1.1 | SA-10/SA-11 | Ricardo/clínico + backend | Pacote M02→B-07; detalhamento REM-06 |
| S1.2 | SA-12/SA-13 | Backend/dados | SA-11; prova PostgreSQL 0058 |
| S1.3 | SA-14 | Backend + web | Holdovers T13–T24/T07/T31 (backlog 61) |
| S1.4 | SA-15 | Clínica + backend | SA-10; gate de publicação |
| S2.1 | SA-20 | Operação + Ricardo | VPS contratada e dados/acesso fornecidos |
| S2.2 | SA-21/SA-22/SA-23/SA-24 | Operação/QA | SA-20 |
| S2.3 | SA-25/SA-26/SA-27 | Web/ops + colaboradores CVG | SA-20; GitHub admin; provedor de e-mail |
| S3.1 | SA-30/SA-31 | Ricardo + operação | GA2; decisão D5 |
| S3.2 | SA-32 | Auditor independente + Ricardo | SA-31; GA0–GA2 |
| contínuo | SA-40 | Documentação/ambiente | janela livre |

### Dependências de encerramento

| Task | Dependência para encerrar | Condição adicional |
| --- | --- | --- |
| SA-01 | H-REMOTE (vigente) | Push autorizado; registrar run IDs por SHA |
| SA-02 | SA-01 | Só aplicável se run remoto vier vermelho |
| SA-03 | SA-01 (SA-02 quando houver) | Stryker/k6/RLS/Redis/staging no mesmo SHA |
| SA-04 | SA-02/SA-03 | `verify:same-sha --require-auth --require-candidate` |
| SA-05 | Decisão de Ricardo | G03/T34 |
| SA-10 | Nenhuma (revisão em andamento) | Aprovação de Ricardo por item |
| SA-11 | Detalhamento PRD/SPEC aceito | Boundary REM-06 já aprovado |
| SA-12 | SA-11 | Prova PostgreSQL da 0058 |
| SA-13 | SA-12 | Nota 30/70, limiares 70/80, receipts |
| SA-14 | G01 + fontes liberadas | Crítica fresh por task fechada |
| SA-15 | SA-10 | Audit de aprovação; D-109 |
| SA-20 | Dados/acesso da VPS | Contratação por Ricardo |
| SA-21…24 | SA-20 | Medições reais |
| SA-25 | SA-20 + colaboradores | Zero P0/P1 de UX |
| SA-26 | Decisão provedor/procedimento | Sem token na resposta da API |
| SA-27 | Autoridade GitHub + SA-20 | Rotação ensaiada |
| SA-30 | GA2 + decisão D5 | IA/Qdrant desligados |
| SA-31 | SA-30 | Dados sintéticos/consentidos |
| SA-32 | GA0–GA2 verdes | Aceite humano |
| SA-40 | Janela livre | Gate documental verde após arquivamento |

## 3. Tasks da fase A0 — Evidência remota e candidato

### AUD-SYSTEM-20261011-SA01 — Publicar o SHA remediado e obter quality/security same-SHA

- **Origem / prioridade / dono:** AUD-S-01; M07/T01/T02; P0; release engineering.
- **Estado:** READY_FOR_NEXT_STEP — H-REMOTE vigente; a sessão anterior teve o push negado por permissão, não por autorização.
- **O que:** publicar `2420ffb` + `1ae1f8d` em `origin/main` e disparar `quality`/`security`; acompanhar até verde no mesmo SHA e registrar run IDs.
- **Onde:** `origin/main`, workflows `quality`/`security`, `docs/operations/remote-ci-2026-10-08.md`.
- **Como:** executar `git push origin main` em sessão com permissão Git; colher URLs/IDs dos runs; não alterar código nesta task.
- **Dependências:** H-REMOTE (vigente).
- **Teste:** runs remotos concluídos com SUCCESS; SHA dos runs igual a `git rev-parse HEAD`; registrar em log.
- **Pronto:** `quality` e `security` SUCCESS no mesmo SHA com IDs no log; Qdrant/restore/E2E remotos não podem permanecer skipped por falha anterior.

### AUD-SYSTEM-20261011-SA02 — Remediar falhas residuais dos runs remotos

- **Origem / prioridade / dono:** AUD-S-01; M07; P0; release engineering + backend.
- **Estado:** BLOCKED — depende de SA-01; só aplicável se houver falha remota.
- **O que:** reproduzir localmente e corrigir, com TDD, qualquer falha do run remoto (etapas PG16, Qdrant live, restore, E2E padrão/real), mantendo a remediação CI-LIVE-01…05.
- **Onde:** conforme falha; provavelmente `tests/integration/**`, `tests/e2e/**`, `.github/workflows/quality.yml`.
- **Como:** RED local no ambiente equivalente; correção mínima; repetir `pnpm verify` e `test:integration:live` antes de novo push.
- **Dependências:** SA-01.
- **Teste:** falhas reproduzidas e fechadas localmente; novo run remoto verde no mesmo SHA.
- **Pronto:** nenhum teste live remoto vermelho; skips apenas os classificados em `docs/quality/skip-inventory.md`.

### AUD-SYSTEM-20261011-SA03 — Re-congelar o candidato no HEAD

- **Origem / prioridade / dono:** AUD-S-06; M13/QA-02/QA-03; P0; release engineering + QA.
- **Estado:** BLOCKED — depende de SA-01 (SA-02 quando houver).
- **O que:** executar Stryker (authorization/critical/worker), k6, RLS/Redis/staging no HEAD; regenerar o bundle com `k6-summary.json`, `otel-spans.json` e `ratelimit-live-results.json`; atualizar identidade/digests da auditoria candidata; `verify:triple-aaa` sem fatal e `verify:aaa-candidate` sem gate vermelho.
- **Onde:** `release-evidence/**`, `staging-evidence/**`, scripts `mutation:*`, `test:load`, `verify:*`.
- **Como:** congelar SHA; rodar suites na ordem do harness; atualizar sumários e digests; não inventar resultado nem reaproveitar summary de outro SHA.
- **Dependências:** SA-01; coordenação T09/T10/T11/T34.
- **Teste:** `pnpm verify:triple-aaa` sem fatal; `pnpm verify:aaa-candidate` sem FAIL; digests conferem com os bytes.
- **Pronto:** candidato novo com P0/P1=0 e P2 fechados ou reclassificados com justificativa registrada.

### AUD-SYSTEM-20261011-SA04 — Fechar same-SHA com candidato e revisão independente

- **Origem / prioridade / dono:** AUD-S-01; M07/G08/G10; P0; revisor independente.
- **Estado:** BLOCKED — depende de SA-02/SA-03.
- **O que:** dispatch do workflow `candidate` e revisão independente fresh do candidato; `verify:same-sha --require-auth --require-candidate` PASS.
- **Onde:** `.github/workflows/candidate.yml`, `staging-evidence/remote-ci-summary.json`, evidência de revisão.
- **Como:** disparar após quality/security verdes; revisor sem contexto de implementação; registrar parecer no log.
- **Dependências:** SA-02/SA-03.
- **Teste:** comando same-SHA PASS; parecer independente anexado ao SHA.
- **Pronto:** mesma identidade de SHA em quality/security/candidate e parecer que não reprova. O dispatch de `release` permanece decisão humana posterior.

### AUD-SYSTEM-20261011-SA05 — Resolver a confiança same-UID (G03/T34)

- **Origem / prioridade / dono:** same-UID pendente; G03/T34; P1; Ricardo + segurança.
- **Estado:** WAITING_HUMAN_APPROVAL — pergunta objetiva pendente.
- **O que:** decidir isolamento contra escrita same-UID ou limitação formal aceitável; validar hardening correspondente na mutação/evidência.
- **Onde:** documentação de decisão; `scripts/mutation-*`; harness de closure.
- **Como:** preparar opções com impacto de assurance; implementar somente o delta após decisão.
- **Dependências:** decisão humana.
- **Teste:** tampering same-UID no modelo aprovado, symlink/traversal, digest/restauração, revisor independente.
- **Pronto:** boundary e limites na evidência; adversário coberto não produz falsa aprovação.
- **Pergunta pendente:** exigir isolamento contra escrita same-UID ou aceitar limitação formal do modelo de confiança?

## 4. Tasks da fase A1 — Produto e clínica

### AUD-SYSTEM-20261011-SA10 — Revisão clínica item a item M02→B-07

- **Origem / prioridade / dono:** AUD-S-02; M03/H-CONTENT; P0; Ricardo/clínico.
- **Estado:** IN_PROGRESS — pacote aberto, 0/153 revisados em 2026-10-08.
- **O que:** revisar item a item o pacote `docs/clinical/review-m02-b07-2026-10-08.md`, registrar decisão por item, corrigir conteúdo e manter a hold até aprovação.
- **Onde:** `docs/clinical/**`, packs do currículo, preflight `runAuthoringPreflight`.
- **Como:** trilha de decisão por item (aprovar/ajustar), sem publicar durante a revisão; nenhum dado real/foto/PDF de terceiro.
- **Dependências:** Ricardo (revisão).
- **Teste:** cada item com decisão registrada; preflight verde para os itens aprovados.
- **Pronto:** 153/153 decididos; nenhum item aprovado permanece `RASCUNHO` por engano; reprovações com correção ou descarte registrados.

### AUD-SYSTEM-20261011-SA11 — Detalhar fontes e contratos da somativa nativa (REM-06)

- **Origem / prioridade / dono:** AUD-S-04; M02/REM-06/G02/P1; P1; backend + Ricardo.
- **Estado:** READY_FOR_NEXT_STEP (PRD/SPEC) — boundary aprovado; fontes/contratos pendentes.
- **O que:** detalhar no PRD/SPEC a fonte autenticada de `criticalPercent`/`criticalItemCount`, o inventário imutável e o audit `CURRICULUM_MODULE_OBLIGATIONS_APPROVED`; registrar decisão antes de codificar.
- **Onde:** `docs/decisions/**`, `BRIEFING/.../01.PRD` e `02.SPEC` (delta autorizado), contratos em `packages/contracts`.
- **Como:** decompor subtasks da alternativa aprovada; nada de política pura sem fonte persistida; sem bloquear o fluxo formativo.
- **Dependências:** SA-10 não bloqueia; aceite do detalhamento por Ricardo.
- **Teste:** inspeção do delta documental; coerência com boundary REM-06.
- **Pronto:** contratos e fonte definidos, aprovados e rastreáveis; subtasks SA-12/SA-13 destravadas.

### AUD-SYSTEM-20261011-SA12 — Produtor nativo do inventário/audit e binding original

- **Origem / prioridade / dono:** AUD-S-04/P1; M02; P1; backend/dados.
- **Estado:** BLOCKED — depende de SA-11.
- **O que:** RED→GREEN do produtor nativo do inventário obrigatório, do audit de aprovação e do binding original da atribuição, com prova PostgreSQL da 0058.
- **Onde:** `packages/persistence/src/module-obligation-*`, migrations 0055–0058, `tests/integration/postgres-module-obligations.test.ts`.
- **Como:** contexto de staff autenticado; grants da matriz de provisionamento; cross-check com a linha de audit; rollback transacional.
- **Dependências:** SA-11.
- **Teste:** prova live com papel restrito; recusa sem evidência autenticada; concorrência e rollback.
- **Pronto:** inventário/audit gravados somente com evidência autenticada; nenhum UPDATE/DELETE indevido nas tabelas append-only.

### AUD-SYSTEM-20261011-SA13 — Receipts somativos e consumer histórico

- **Origem / prioridade / dono:** AUD-S-04/P2/P3; M02; P1; backend.
- **Estado:** BLOCKED — depende de SA-12.
- **O que:** compor `summativeApproval` fail-closed no caminho produtivo; gravar receipts 30/70 com limiares 70/80; implementar o consumer histórico; nenhum receipt sem evidência crítica.
- **Onde:** `apps/api/src/composition/correction-completion-options.ts`, `packages/persistence/src/module-obligation-*`, jornada.
- **Como:** TDD RED→GREEN; provedor nunca lança na transação de correção; prova live de nota e recusa.
- **Dependências:** SA-12.
- **Teste:** cenário completo quiz/caso; 30/70; limiares; ausência de receipt sem evidência; replay idempotente.
- **Pronto:** módulo concluído gera receipt e nota somativa em prova PostgreSQL; débitos P2/P3 encerrados no backlog 30.

### AUD-SYSTEM-20261011-SA14 — Fechar holdovers T13–T24/T07/T31 com crítica fresh

- **Origem / prioridade / dono:** AUD-S-05; M12/M23/M25; P1; backend + web.
- **Estado:** READY_FOR_NEXT_STEP — fontes sob hold de rodadas concorrentes devem ser liberadas na ordem do backlog 61.
- **O que:** concluir as tasks T13–T22 (replay/retomada, domínio/quiz, retenção, rate limit por classe, lease, retirada, drenagem, trilha de negações), T24 e T07/T31 conforme critérios do backlog 61, cada uma com crítica fresh.
- **Onde:** conforme backlog 61 §3; arquivos de coordenação da seção 5 do roadmap 62.
- **Como:** uma task por vez com RED/GREEN/REFACTOR e revisor independente; não reimplementar o já fechado.
- **Dependências:** G01 do backlog 61; liberação de hold.
- **Teste:** critérios específicos de cada Txx no backlog 61.
- **Pronto:** tasks COMPLETED com evidência fresca no backlog 61 e M12/M23/M25 atualizadas no backlog 30.

### AUD-SYSTEM-20261011-SA15 — Publicar o primeiro módulo clínico com audit

- **Origem / prioridade / dono:** AUD-S-02; M03/D-109; P0; clínica + backend.
- **Estado:** BLOCKED — depende de SA-10.
- **O que:** promover a `PUBLICADO` o primeiro módulo clínico aprovado, com audit de aprovação e projeção pública sem fonte/gabarito/rubrica.
- **Onde:** `packages/persistence/src/clinical-publication-hold.ts`, repositório editorial, projeções do currículo.
- **Como:** somente com revisão item a item concluída e gate de publicação verde; retirada preserva histórico.
- **Dependências:** SA-10.
- **Teste:** publicação com audit; participante não vê campos internos; retirada permanece reversível.
- **Pronto:** ≥1 módulo `PUBLICADO` com audit de aprovação e teste negativo de exposição.

## 5. Tasks da fase A2 — Ambiente e operação

### AUD-SYSTEM-20261011-SA20 — Provisionar homologação na VPS

- **Origem / prioridade / dono:** AUD-S-03; M05; P0; operação + Ricardo.
- **Estado:** BLOCKED — VPS “ainda vou contratar”; dados/acesso pendentes.
- **O que:** provisionar PostgreSQL 16 gerenciado/equivalente, Redis, DNS, TLS (Caddy), segredos por cofre, roles por runbook e deploy via `deploy/compose.yml`; `/health/ready` 200 pela borda; E2E real por HTTPS.
- **Onde:** `deploy/**`, `docs/operations/homologation-vps.md`, `scripts/deploy-smoke.mjs`.
- **Como:** seguir runbooks; sem dados reais; smoke fail-closed; registrar versões/digests.
- **Dependências:** contratação + dados de Ricardo.
- **Teste:** deploy, smoke pela borda, 401 sem sessão, worker processando, E2E real em homologação.
- **Pronto:** ambiente observável com evidência anexada; nenhum segredo no Git ou em log.

### AUD-SYSTEM-20261011-SA21 — Backup, restore e RPO/RTO medidos

- **Origem / prioridade / dono:** AUD-S-07; M06/M14; P1; operação/dados.
- **Estado:** BLOCKED — depende de SA-20.
- **O que:** ligar backup automatizado (WAL/PITR ou horário) e executar restore cronometrado em alvo isolado: RTO ≤4 h e RPO ≤1 h demonstrados.
- **Onde:** `deploy/backup/**`, `docs/runbooks/backup-postgres.md`, `scripts/verify-postgres-restore.mjs`.
- **Como:** medição real com relatório; retenção e logs JSON; sem serviço de produção afetado.
- **Dependências:** SA-20.
- **Teste:** restore completo cronometrado; contagem/hash conferidos; RPO do cenário registrado.
- **Pronto:** medição anexada ao log com valores dentro das metas D1/D4.

### AUD-SYSTEM-20261011-SA22 — Observabilidade ligada e alerta real

- **Origem / prioridade / dono:** AUD-S-03; M10/OP-05; P1; operação.
- **Estado:** BLOCKED — depende de SA-20.
- **O que:** subir collector OTel, dashboards de SLO e alertas roteados; provar alerta sintético recebido no canal em <5 min, com segundo contato.
- **Onde:** `deploy/observability/**`, `docs/operations/alerting.md`, `docs/operations/slo.md`.
- **Como:** redaction preservada; regras com runbook; teste de ponta a ponta registrado.
- **Dependências:** SA-20 + segundo contato definido.
- **Teste:** alerta sintético cronometrado; dashboards acessíveis; nenhum payload clínico.
- **Pronto:** alerta recebido em <5 min com evidência; dono e escalonamento registrados.

### AUD-SYSTEM-20261011-SA23 — Carga k6 a 3× da capacidade aprovada (D4)

- **Origem / prioridade / dono:** AUD-S-07; M14; P1; QA/operação.
- **Estado:** BLOCKED — depende de SA-20.
- **O que:** executar k6 no cenário baseline a 3× da capacidade aprovada; registrar p95/p99 e erro; ajustar recursos se necessário.
- **Onde:** `tests/load/k6-baseline.js`, `release-evidence/load-summary.json` (novo SHA).
- **Como:** ambiente de homologação; sem mascarar limite; resultados anexados.
- **Dependências:** SA-20.
- **Teste:** carga completa dentro do SLO D2; degradação documentada.
- **Pronto:** sumário k6 no bundle do SHA com capacidade recomendada.

### AUD-SYSTEM-20261011-SA24 — HTTPS real e TRUSTED_PROXIES

- **Origem / prioridade / dono:** AUD-S-03; M15; P1; operação/web.
- **Estado:** BLOCKED — depende de SA-20.
- **O que:** validar topologia HTTPS real com proxy anexando XFF, cookies `__Host-` Secure, `TRUSTED_PROXIES` e `CVG_API_INTERNAL_URL`; E2E real por HTTPS.
- **Onde:** `deploy/caddy/Caddyfile`, `apps/web/proxy.ts`, `packages/config`.
- **Como:** teste negativo de XFF não confiável; sem relaxar CSRF/origem.
- **Dependências:** SA-20.
- **Teste:** E2E real por HTTPS; XFF falso rejeitado; cookies corretos.
- **Pronto:** evidência anexada; RF-10 fechado.

### AUD-SYSTEM-20261011-SA25 — Aceitação manual e leitor de tela

- **Origem / prioridade / dono:** AUD-S-03; M16; P1; web + colaboradores CVG.
- **Estado:** BLOCKED — depende de SA-20 e disponibilidade de pessoas.
- **O que:** executar aceitação manual das jornadas com colaboradores do CVG e leitor de tela real; corrigir P0/P1 de UX.
- **Onde:** roteiro de aceitação em `tests/`/docs; correções em `apps/web`.
- **Como:** sem dados reais; roteiro mínimo inclui teclado, foco, contraste e mensagens de erro.
- **Dependências:** SA-20 + participantes.
- **Teste:** roteiro documentado com achados; regressão browser/E2E após correções.
- **Pronto:** zero P0/P1 de UX; correções com teste de regressão.

### AUD-SYSTEM-20261011-SA26 — Entrega de convite/recuperação sem token na resposta

- **Origem / prioridade / dono:** AUD-S-03; M11/OP-06; P1; backend/operação.
- **Estado:** READY_FOR_NEXT_STEP — procedimento documentado; provedor é feature com PRD/SPEC.
- **O que:** decidir provedor de e-mail ou manter procedimento controlado; remover o token da resposta da API e registrar a operação.
- **Onde:** `apps/api/src/features/invitations/invitations.handler.ts`, `docs/runbooks/invitation-delivery.md`.
- **Como:** se provedor: feature com PRD/SPEC e adapter com timeout/retry; se manual: procedimento com segregação e registro.
- **Dependências:** decisão Ricardo; sem dados reais.
- **Teste:** fluxo sintético de ativação sem engenharia; token ausente da resposta.
- **Pronto:** participante sintético ativa conta pelo procedimento; teste negativo de token.

### AUD-SYSTEM-20261011-SA27 — Governança: branch protection, segredos e LGPD operacional

- **Origem / prioridade / dono:** AUD-S-03; M18/M24/DA-03; P2; operação/segurança.
- **Estado:** READY_FOR_NEXT_STEP — CODEOWNERS preenchido; regras do GitHub exigem autoridade remota.
- **O que:** aplicar branch protection com revisão obrigatória; ensaiar rotação de segredos; validar procedimentos LGPD operacionais no ambiente.
- **Onde:** GitHub settings, `docs/security/secrets-management.md`, `docs/security/lgpd-procedures.md`.
- **Como:** registrar configuração por captura redigida; nenhum segredo em evidência.
- **Dependências:** autoridade GitHub + SA-20 (rotação).
- **Teste:** PR bloqueado sem review; rotação ensaiada sem downtime; titular/exclusão exercitados em dados sintéticos.
- **Pronto:** configurações e ensaios registrados no log.

## 6. Tasks da fase A3 — Piloto e reauditoria

### AUD-SYSTEM-20261011-SA30 — Definir e registrar o piloto formativo (D5)

- **Origem / prioridade / dono:** AUD-S-08; M17; P1; Ricardo + operação.
- **Estado:** WAITING_HUMAN_APPROVAL — escopo/coorte D5 não decididos.
- **O que:** registrar escopo da coorte, métricas de produto, canal de suporte, consentimento e a configuração `AI_ENABLED=false`/`QDRANT_ENABLED=false` no go-live.
- **Onde:** `docs/decisions/**`, `deploy/.env.example`, `docs/operations/production-readiness-checklist.md`.
- **Como:** decisão antes da execução; sem dados reais além do consentido; IA/Qdrant desligados.
- **Dependências:** GA2 + decisão de Ricardo.
- **Teste:** inspeção da decisão e da configuração; checklist atualizada.
- **Pronto:** decisão registrada com métricas e limites do piloto.

### AUD-SYSTEM-20261011-SA31 — Executar a coorte formativa controlada

- **Origem / prioridade / dono:** AUD-S-08/09; P1; operação + clínica.
- **Estado:** BLOCKED — depende de SA-30.
- **O que:** executar o piloto com dados sintéticos/consentidos; monitorar SLO/alertas; registrar fricção e achados; correções bounded com TDD.
- **Onde:** ambiente de homologação, telemetria, registro de incidentes.
- **Como:** interromper e preservar evidência diante de incidente; nenhum ranking ou uso punitivo.
- **Dependências:** SA-30.
- **Teste:** sessões reais da coorte; SLO observado; achados com severidade.
- **Pronto:** relatório da coorte com achados, correções e limitações explícitas.

### AUD-SYSTEM-20261011-SA32 — Reauditoria completa com runtime real

- **Origem / prioridade / dono:** AUD-S-02…09; P0; auditor independente + Ricardo.
- **Estado:** BLOCKED — depende de SA-31 e GA0–GA2.
- **O que:** executar audit-engine sobre o ambiente real (0410–0418), atualizar a matriz 0–100 e emitir go/no-go com aceite humano.
- **Onde:** `docs/audits/**`, `BRIEFING/04.AUDIT/**`; estado/log/backlog.
- **Como:** congelar versão/ambiente; evidência real; classificar PASS/PARTIAL/FAIL/NOT_EXECUTED; sem mascarar falha.
- **Dependências:** SA-31 + GA0–GA2.
- **Teste:** procedimento de auditoria completo com evidência anexada.
- **Pronto:** relatório final sem P0/P1 abertos no escopo promovido; decisão de produção registrada por Ricardo.

## 7. Task de manutenção

### AUD-SYSTEM-20261011-SA40 — Node 22 nos shells e arquivamento do estado

- **Origem / prioridade / dono:** AUD-S-09; M27/GO-02; P2; documentação/ambiente.
- **Estado:** READY_FOR_NEXT_STEP — `.nvmrc` existe; shell padrão do host em Node 24.
- **O que:** padronizar Node 22.22 nos comandos documentados/shells e arquivar checkpoints antigos do runtime state em `docs/runtime-history/`, mantendo o checkpoint prevalente enxuto.
- **Onde:** `.nvmrc`, `docs/99_runtime_state.md`, `docs/runtime-history/**`, runbooks.
- **Como:** mover blocos históricos sem editar o conteúdo; revalidar `verify:documentation`.
- **Dependências:** janela livre.
- **Teste:** estado menor e prevalente único; gate documental verde.
- **Pronto:** arquivamento registrado; comandos dos runbooks usam o Node do contrato.

## 8. Crosswalk de rastreabilidade

| Task 63 | Auditoria 2026-10-11 | Backlog 61 / PROD-M | Decisões |
| --- | --- | --- | --- |
| SA-01 | AUD-S-01 | M07; T01/T02 | H-REMOTE |
| SA-02 | AUD-S-01 | M07; T01/T02 | H-REMOTE |
| SA-03 | AUD-S-06/07 | M13; QA-02/03; T09/T10/T11 | — |
| SA-04 | AUD-S-01 | M07; G08 | H-REMOTE |
| SA-05 | same-UID | G03; T34 | decisão pendente |
| SA-10 | AUD-S-02 | M03 | H-CONTENT |
| SA-11 | AUD-S-04 | M02; G02 | REM-06 |
| SA-12 | AUD-S-04 | M02 | REM-06 |
| SA-13 | AUD-S-04 | M02 | REM-06 |
| SA-14 | AUD-S-05 | M12/M23/M25; T13–T24/T07/T31 | — |
| SA-15 | AUD-S-02 | M03 | H-CONTENT |
| SA-20 | AUD-S-03 | M05 | VPS |
| SA-21 | AUD-S-07 | M06/M14 | — |
| SA-22 | AUD-S-03 | M10 | — |
| SA-23 | AUD-S-07 | M14 | D4 |
| SA-24 | AUD-S-03 | M15 | — |
| SA-25 | AUD-S-03 | M16 | — |
| SA-26 | AUD-S-03 | M11; OP-06 | provedor de e-mail |
| SA-27 | AUD-S-03 | M18/M24/M21 | — |
| SA-30 | AUD-S-08 | M17 | D5 |
| SA-31 | AUD-S-08/09 | M17 | D5 |
| SA-32 | AUD-S-02…09 | G10; checklist | AAA-001 |
| SA-40 | AUD-S-09 | M27; GO-02 | — |

**Próximo passo:** SA-01. O planejamento solicitado está concluído.
