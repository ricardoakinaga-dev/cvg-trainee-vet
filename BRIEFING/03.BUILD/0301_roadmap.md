# 0301 — Roadmap de Construção — CVG

> **Extensão vigente:** este roadmap preserva as fases estruturais originais. A execução Premium Enterprise 95 derivada da auditoria atual está detalhada em `../04.AUDIT/0492_score_95_roadmap.md` e no programa `0304_premium_enterprise_95_program.md`.

## PHASE -1 — Fechamento documental

- **Objetivo:** concluir e verificar BUILD, AUDIT, loop, skills, agents e runtime.
- **Entregáveis:** 0300–0302; 0400–0490; 0500–0590; 0600–0690; 0700–0790; 0800–0890; gate final.
- **Dependências:** SPEC 0190.
- **Riscos:** iniciar código antes de contrato operacional.
- **Critério de sucesso:** todos os documentos presentes, coerentes, sem links quebrados e com estado/log/backlog atualizados.

## PHASE 0 — Fundação do repositório

- **Objetivo:** criar workspace, configuração, CI, ambientes sintéticos e regras de import.
- **Entregáveis:** `package.json`/workspace, TypeScript strict, lint/format, env schema, Docker de teste, pipeline.
- **Dependências:** fase -1.
- **Riscos:** segredo, versão flutuante, acoplamento inicial.
- **Critério de sucesso:** build vazio, lint, typecheck, teste smoke, secret scan e serviços efêmeros passam.

## PHASE 1 — Domínio e contratos

- **Objetivo:** implementar entidades, value objects, estados, políticas e schemas.
- **Entregáveis:** `domain`, `application`, `contracts`, manifesto de rastreabilidade e testes RED/GREEN.
- **Dependências:** Phase 0.
- **Riscos:** inventar regra ou duplicar cálculo no web.
- **Critério de sucesso:** invariantes, autorização, idempotência e DTOs cobertos.

## PHASE 2 — Dados e API núcleo

- **Objetivo:** persistir estado com PostgreSQL e expor a API autoritativa.
- **Entregáveis:** migrações, RLS, repositórios, outbox, sessão, `/api/v1`, health e auditoria.
- **Dependências:** Phase 1.
- **Riscos:** vazamento de escopo, migração destrutiva, transação parcial.
- **Critério de sucesso:** integração em banco efêmero, contrato OpenAPI, RLS e replay passam.

## PHASE 3 — Fluxos de aprendizagem

- **Objetivo:** entregar currículo, conteúdo, tentativa, correção, progresso, remediação, retenção e feedback.
- **Entregáveis:** casos de uso P0, rotas, estados, projeções e E2E dos fluxos críticos.
- **Dependências:** Phase 2.
- **Riscos:** nota/estado inconsistente e resposta perdida.
- **Critério de sucesso:** login→trilha→atividade→submissão→resultado→retomada funciona com falhas simuladas.

## PHASE 4 — Integrações e autoria interna

- **Objetivo:** conectar Qdrant e IA com isolamento e criar o workflow de autoria/protocolo CVG.
- **Entregáveis:** adaptadores, coleção versionada, embedding, busca filtrada, `FakeAiProvider`, jobs, redaction, revisão e auditoria.
- **Dependências:** Phase 2; conteúdo e protocolo interno autorizados.
- **Riscos:** enviar fonte protegida, IA publicar ou Qdrant virar fonte de verdade.
- **Critério de sucesso:** teste de escopo/exposição, Qdrant reconstruível, IA estruturada/desligável e nenhuma chamada externa no CI.

## PHASE 5 — Frontend Web/SPA

- **Objetivo:** entregar telas responsivas, acessíveis e separadas por papel.
- **Entregáveis:** login, conta, dashboard, trilha, tentativa, resultado, relatos, operação e autoria interna.
- **Dependências:** contratos/API das phases 2–4.
- **Riscos:** regra no cliente, a11y incompleta, DTO interno na tela.
- **Critério de sucesso:** Playwright + axe + teste de teclado + teste de acesso cruzado passam.

## PHASE 6 — Hardening, operação e auditoria pré-release

- **Objetivo:** verificar segurança, performance, backup, recuperação, observabilidade e rastreabilidade.
- **Entregáveis:** runbooks, métricas, traces, alertas, scan, carga pequena, restauração, relatório de phase e auditoria de sprint.
- **Dependências:** phases 0–5.
- **Riscos:** dívida escondida e falta de rollback.
- **Critério de sucesso:** todos os gates CI, cobertura ≥80%, smoke, RPO/RTO sintéticos e nenhum gap crítico.

## PHASE 7 — Rollout interno

- **Objetivo:** publicar para uso interno controlado com conteúdo autoral aprovado.
- **Entregáveis:** ambiente interno, seed sintético/permitido, checklist de release, monitoramento e plano de retirada.
- **Dependências:** Phase 6 e aprovação clínica do conteúdo que será publicado.
- **Riscos:** exposição indevida, incidente operacional ou conteúdo não aprovado.
- **Critério de sucesso:** smoke pós-deploy, observabilidade ativa, rollback testado, AUDIT 0490 emitido.

## PHASE R — Remediação integral pós-auditoria

- **Objetivo:** fechar as limitações AUD-2026-08-11 sem mascarar dependências externas.
- **Documento executável:** 0303_remediation_program.md.
- **R0:** baseline e controle de mudança;
- **R1:** fixture E2E real, seed administrativo segregado, RLS e cleanup;
- **R2:** 24 atribuições/estados e produção/revisão dos packs;
- **R3:** provedor externo, recovery e MFA;
- **R4:** headers, domínio e TLS;
- **R5:** traces duráveis, artefato versionado, rollback e restore;
- **R6:** load smoke, quality gate, commit e reauditoria no SHA.
- **Dependências:** R3/R4/R5 exigem decisões e infraestrutura autorizadas; R1/R2/R6 podem avançar localmente com dados sintéticos.
- **Critério de sucesso:** todos os gates de 0303 passam e nenhum item da reauditoria permanece sem evidência ou owner.

## Ordem de sprints

```text
DOC-01 → F0-S1 → F1-S1/S2 → F2-S1/S2 → F3-S1/S2/S3
→ F4-S1/S2 → F5-S1/S2 → F6-S1/S2 → F7-S1
```

Uma sprint pode ser paralelizada somente se suas dependências e contratos estiverem fechados. Cada sprint segue `TASK → TESTE → REVIEW → AUDIT → LOG`.
