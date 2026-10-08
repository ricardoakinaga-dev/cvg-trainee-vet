# Auditoria de prontidão para produção — 2026-10-07

- Task: `AUDIT-PROD-READINESS-20261007`; solicitação direta de leitura da documentação, auditoria do sistema e relatório de melhorias para produção.
- HEAD `07532c2c949477489ed5c63362abd7ec97d1f5ad` (`main`), worktree sem alterações rastreadas. Nenhum arquivo de produto alterado.
- Documento editável de entrega: https://claude.ai/code/artifact/195a2eb3-c2b4-4686-91a2-d54d6e0ee0cd (este arquivo é a cópia registrada no repositório).
- Evidência bruta desta rodada: logs em scratchpad de sessão; resultados resumidos no anexo abaixo.

## Veredito

**NÃO PRONTO para produção.** O código está maduro e controlado por gates, mas o sistema nunca saiu de ambientes descartáveis locais: não há artefato implantável, ambiente provisionado, backup automatizado, alerta roteado, CI remota verde no SHA, conteúdo clínico publicado nem avaliação somativa funcional. Estimativa para piloto formativo controlado: 8 a 10 semanas, condicionadas às decisões humanas AAA-001, REM-06, same-UID, H-REMOTE e H-CONTENT.

| Área | Situação |
|---|---|
| Engenharia e qualidade | Forte: lint, typecheck, 2856 testes unitários e 11 gates estáticos verdes; cobertura 91,05/86,95/95,07/92,38 (verify de 2026-10-05) |
| Segurança aplicacional | Forte; 2 advisórios HIGH novos (`sharp` 0.35.4, `source-map-js` 1.2.1 via `next`) e 3 correções herdadas sem revisão |
| Produto | Incompleto: somativa não grava receipts (provedor retorna `null` por desenho); nenhum módulo clínico publicado |
| Infraestrutura e operação | Ausente: sem imagem, deploy, ambientes, backup automatizado, alertas ou entrega de convites |
| Evidência de release | Desatualizada: cadeia AAA aponta para `3cd7bc3`; `verify:triple-aaa` FAIL (1 fatal, 17 pendências); `verify:aaa-candidate` FAIL (11 gates) |
| Governança | Bloqueada por decisões humanas pendentes desde 2026-09-09 |

## Achados (31)

Severidade: P0 bloqueia go-live; P1 fecha antes de tráfego real; P2 entra com risco aceito. "Herdado" = aberto no backlog 61 desde a auditoria de 2026-10-03.

### Infraestrutura e operação

| ID | Sev. | Achado | Evidência |
|---|---|---|---|
| OP-01 | P0 | Sem artefato implantável (Dockerfile, imagem, compose, IaC, pipeline de deploy); 0802 exige artefato imutável com digest | busca por manifestos vazia; `docs/operations/artifact-signing.md` |
| OP-02 | P0 | Sem homologação ou produção provisionadas; staging é script local descartável | `scripts/run-staging.mjs`; contrato 0801 |
| OP-03 | P0 | Sem backup automatizado; RNF-015/D-107 exigem RPO ≤1 h e RTO ≤4 h; só drill sintético | `docs/operations/disaster-recovery.md` |
| OP-04 | P0 | CI remota nunca verde no SHA candidato; same-SHA não provado; `quality` vermelho sem diagnóstico (RF-09) | `release-evidence/triple-aaa-verdict.json`; RF-02/RF-09 |
| OP-05 | P1 | Alertas só em processo; sem collector, agregação de logs, pager ou dashboard fora do drill | `docs/operations/slo.md` |
| OP-06 | P1 | Convite e recuperação devolvem token na resposta da API; sem provedor de e-mail nem procedimento manual escrito | `apps/api/src/features/invitations/invitations.handler.ts:49,92` |
| OP-07 | P1 | RPO/RTO nunca medidos; k6 só histórico; capacidade do piloto (D4) não decidida | estado de runtime; `release-evidence/load-summary.json` |
| OP-08 | P1 | Topologia HTTPS real não testada (`__Host-` Secure, TLS, `TRUSTED_PROXIES`, `CVG_API_INTERNAL_URL`) | RF-10; `apps/web/proxy.ts:46` |
| OP-09 | P2 | Assinatura Cosign e provenance assinada aguardam primeiro artefato | `docs/operations/artifact-signing.md` |
| OP-10 | P2 | CODEOWNERS template; branch protection não aplicada | `.github/CODEOWNERS` |
| OP-11 | P2 | Shell local em Node 24 contra contrato `>=22.22 <23` | logs desta rodada |

### Segurança

| ID | Sev. | Achado | Evidência |
|---|---|---|---|
| SE-01 | P1 | `sharp` 0.35.4 (CVE-2026-96889, ≥0.35.5) e `source-map-js` 1.2.1 (DoS, ≥1.2.2) em dependências de produção via `next` | `pnpm audit --prod` exit 1 |
| SE-02 | P1 | Rate limit geral 120/min não aplica classes auth 20 / recovery 10 (herdado T20) | backlog 61 |
| SE-03 | P1 | Recuperação de rascunho editorial sem vínculo a principal/escopo (herdado T16) | backlog 61 |
| SE-04 | P2 | Erro de banco no rate limiter de borda propaga 500 em vez de 429 fail-closed (RF-11) | registro de risco |
| SE-05 | P2 | Negações autenticadas sem escopo descartadas da trilha (herdado T24) | backlog 61 |
| SE-06 | P2 | Segredos só por ambiente; sem cofre, rotação ou dono | `.env.example` |

### Produto e jornada

| ID | Sev. | Achado | Evidência |
|---|---|---|---|
| PR-01 | P0 | Nenhum conteúdo clínico publicado; H-CONTENT e revisão item a item (AAA-304) abertas | backlog 30; N25 = 35 |
| PR-02 | P0 | Somativa incompleta: `summativeApproval` retorna `null`, sem produtor nativo do inventário, REM-06 pendente; PRD UC-006/RN-020–023 exigem somativa | log R63; `docs/decisions/2026-10-02-rem06-summative-eligibility.md` |
| PR-03 | P1 | Replay, última edição e reidratação corrigidos localmente sem crítica fresh (T13–T15) | backlog 61 |
| PR-04 | P1 | Progressão, ancoragem da avaliação e retenção com correções sem revisão (T17–T19) | backlog 61 |
| PR-05 | P1 | Sem aceitação manual, tecnologia assistiva real ou piloto; escopo D5 não aprovado | RF-AT; pacote AAA-001 |
| PR-06 | P2 | Páginas web acima de 2000 linhas; validação por campo e nome de progresso incompletos (T07, T31) | N31 = 58 |

### Dados e persistência

| ID | Sev. | Achado | Evidência |
|---|---|---|---|
| DA-01 | P1 | Dois testes live PostgreSQL editoriais vermelhos (herdado T01) | backlog 61 |
| DA-02 | P1 | Provisionamento de roles/grants só como script de CI; sem runbook de produção | `scripts/provision-ci-postgres.mjs` |
| DA-03 | P2 | LGPD sem procedimento de exclusão, anonimização, retenção ou atendimento a titular | `docs/security/data-classification.md` |
| DA-04 | P2 | Corrida delete/upsert no Qdrant sem prova (herdado T22) | backlog 61 |

### Qualidade, CI e evidência

| ID | Sev. | Achado | Evidência |
|---|---|---|---|
| QA-01 | P1 | E2E real 30/46 por mistura com auth mockada; workflows chamam esse comando (herdado T02) | backlog 61 |
| QA-02 | P1 | Stryker nunca executado no candidato atual | `verify:triple-aaa` |
| QA-03 | P1 | Cadeia de evidência aponta para `3cd7bc3`; bundle sem `k6-summary.json`; registro de risco divergente | `verify:aaa-candidate` |
| QA-04 | P2 | Freshness conta 110 screenshots gitignored como dirty runtime | `git check-ignore` |
| QA-05 | P2 | `verify:traceability:release` exige worktree limpo; 3,5 GB não rastreados na raiz | `git status` |
| QA-06 | P2 | Testes raiz fora do `tsc -b` principal (herdado T08) | backlog 61 |

### IA e índice derivado

| ID | Sev. | Achado | Evidência |
|---|---|---|---|
| IA-01 | P1 | Provedor de IA real nunca avaliado (G06); lançar com `AI_ENABLED=false` | backlog 61 |
| IA-02 | P2 | Qdrant live só em fixture; lançar com `QDRANT_ENABLED=false` | backlog 61 |

### Governança

| ID | Sev. | Achado | Evidência |
|---|---|---|---|
| GO-01 | P1 | Pacote AAA-001 sem resposta desde 2026-09-09 | `docs/45_aaa001_decision_packet.md` |
| GO-02 | P2 | Estado de runtime 160 KB e log 16 mil linhas; retomada cara | `docs/99_runtime_state.md` |

## Melhorias necessárias (27)

### P0

| # | Melhoria | Achados | Critério de pronto | Esforço |
|---|---|---|---|---|
| M01 | Responder AAA-001 (D1–D7) | GO-01, OP-07 | documento 45 decidido item a item; PRD atualizado se RPO mudar | 1 dia (humano) |
| M02 | Decidir REM-06 e fechar somativa nativa (produtor de inventário/audit, `criticalPercent` autenticado, receipts) | PR-02 | módulo concluído gera receipt e nota 30/70 com limiares 70/80; prova PostgreSQL | 2–3 semanas |
| M03 | Publicar conteúdo clínico do piloto (revisão item a item, H-CONTENT) | PR-01 | ≥1 módulo `PUBLICADO` com audit de aprovação e sem fonte exposta (D-109) | 1–2 semanas (clínico) |
| M04 | Artefato implantável: Dockerfile multi-stage por app, Node 22.22, non-root, healthcheck, digest | OP-01 | imagens construídas na CI e registradas em `provenance.json` | 3–5 dias |
| M05 | Provisionar homologação e produção (PG 16 gerenciado, Redis, TLS, DNS, segredos, roles por runbook) | OP-02, OP-08, DA-02 | deploy em homologação, `/health/ready` 200, E2E real passa | 1–2 semanas |
| M06 | Backup automatizado (WAL/PITR ou horário) e restore ensaiado | OP-03 | restore em alvo isolado ≤4 h registrado no log | 3–5 dias |
| M07 | CI remota verde no mesmo SHA (RF-09, T02, T01, dispatch do `candidate`) | OP-04, QA-01, DA-01 | `verify:same-sha --require-auth --require-candidate` PASS | 1 semana |
| M08 | Pipeline de deploy com rollback e assinatura Cosign | OP-01, OP-09 | deploy e rollback ensaiados em homologação conforme 0802 | 1 semana |

### P1

| # | Melhoria | Achados | Critério de pronto | Esforço |
|---|---|---|---|---|
| M09 | Corrigir `sharp` e `source-map-js` | SE-01 | `pnpm audit --prod --audit-level=high` exit 0 | meio dia |
| M10 | Observabilidade ligada (collector, logs, dashboard SLO, alertas roteados) | OP-05 | alerta sintético chega ao canal em <5 min | 3–5 dias |
| M11 | Entrega de convite/recuperação (provedor ou procedimento) | OP-06 | participante sintético ativa conta sem engenharia | 2–3 dias |
| M12 | Fechar correções de jornada herdadas T13–T22 com crítica fresh | PR-03, PR-04, SE-02, SE-03, DA-04 | tasks COMPLETED no backlog 61 | 1–2 semanas |
| M13 | Re-congelar candidato no HEAD (Stryker, k6, RLS, Redis, staging, bundle, risco) | QA-02, QA-03 | `verify:triple-aaa` sem fatal | 2–3 dias |
| M14 | Medir RPO/RTO e carga a 3× da capacidade (D4) | OP-07 | RTO ≤4 h; p95 dentro do SLO D2 | 2 dias |
| M15 | Topologia HTTPS real com `TRUSTED_PROXIES` testado | OP-08 | E2E real por HTTPS; RF-10 fechado | 2 dias |
| M16 | Aceitação manual e leitor de tela com colaboradores do CVG | PR-05 | zero P0/P1 de UX | 3 dias |
| M17 | Política de IA/Qdrant no lançamento (desligados; avaliar provedor em homologação) | IA-01, IA-02 | decisão registrada; evals com provedor real | 2 dias |

### P2

| # | Melhoria | Achados | Esforço |
|---|---|---|---|
| M18 | Branch protection, CODEOWNERS reais, revisão obrigatória | OP-10 | meio dia |
| M19 | Freshness ignorar artefatos gitignored | QA-04 | meio dia |
| M20 | Evidência pesada fora do worktree | QA-05 | meio dia |
| M21 | Procedimentos LGPD operacionais | DA-03 | 2 dias |
| M22 | Rate limiter fail-closed com 429 | SE-04 | 1 dia |
| M23 | Trilha para negações sem escopo (T24) | SE-05 | 1 dia |
| M24 | Gestão de segredos com dono e rotação | SE-06 | 2 dias |
| M25 | Decompor páginas web extensas | PR-06 | 1 semana |
| M26 | Typecheck dos testes raiz no `tsc -b` (T08) | QA-06 | 1 dia |
| M27 | Node 22 nos shells; arquivar checkpoints antigos | OP-11, GO-02 | 1 dia |

## Plano em quatro fases com gates fail-closed

| Fase | Janela | Conteúdo | Gate de saída |
|---|---|---|---|
| 1. Decidir | semana 1 | M01, M02 (decisão), M09; revisão clínica inicia (M03) | G-A: AAA-001 D1–D7 e REM-06 assinados |
| 2. Construir | semanas 2–4 | M02 (nativa), M04, M07, M08, M12 | G-B: Triple AAA sem fatal, same-SHA verde |
| 3. Homologação | semanas 5–7 | M05, M06, M10, M11, M14, M15, M16 | G-C: RTO medido, alerta recebido, E2E real por HTTPS |
| 4. Piloto | semanas 8–10 | 1 coorte formativa (D5), IA/Qdrant desligados (M17), P2 em operação | G-D: conteúdo clínico publicado e aprovado |

Critérios objetivos de pronto: ver documento editável, seção "Plano de remediação e critérios de pronto" (14 itens).

## Anexo — verificações executadas em 2026-10-07

| Verificação | Resultado |
|---|---|
| `pnpm lint`, `pnpm typecheck` | PASS |
| `pnpm test:unit` | PASS: 2856 testes / 255 arquivos / 2 skips, 22 s |
| `verify:complexity`, `verify:secrets`, `verify:migrations` (59, head 0058), `verify:cycles`, `verify:dead-code`, `verify:routes` (58/58), `verify:exposure`, `verify:documentation`, `verify:evidence-consistency`, `verify:ci-contract` | PASS |
| `verify:traceability:release` | FAIL — exige worktree limpo (diretórios não rastreados) |
| `pnpm audit` global e `--prod` | FAIL — 2 HIGH (`sharp` 0.35.4, `source-map-js` 1.2.1) |
| `verify:triple-aaa` | FAIL — 1 fatal (digests), 17 pendências; readiness NOT_VERIFIED |
| `verify:aaa-candidate` | FAIL — 11 gates |
| `git diff --check` | PASS |

Não executados nesta rodada (lidos do registro de 2026-10-05 e da auditoria de 2026-10-03): `pnpm verify` completo, cobertura, E2E, browser, integração live, RLS, Redis, restore, Stryker, k6, staging, workflows remotos.
