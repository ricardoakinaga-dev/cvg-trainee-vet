# 0421 — Remediation Plan

## Projeto vigente

O plano executável consolidado para todos os gaps da reauditoria 2026-08-11 está em BRIEFING/03.BUILD/0303_remediation_program.md. Este documento mantém os gaps históricos e deve ser lido junto com as tasks R0–R6 e seus gates.

## Reauditoria vigente — 2026-08-11

| Gap | Ação necessária | Prioridade | Critério de encerramento |
|---|---|---:|---|
| GAP-2026-001 | Ajustar o fixture para seed administrativo controlado ou aplicar contexto RLS autorizado sem abrir bypass no runtime; repetir E2E real completo | P1 | E2E real passa e o seed continua deny-by-default para usuário comum |
| GAP-2026-002 | Declarar e injetar CVG_API_INTERNAL_URL no contrato de build, serviço e CI; provar build limpo e health web/edge | P1 | build reproduzível com proxy e health 200 sem intervenção manual |
| GAP-2026-003 | Corrigir parsing/valor default do timeout e adicionar teste do script | P2 | load smoke default executa requisições e retorna relatório válido |
| GAP-2026-004 | Persistir atribuições/estados dos módulos autorizados e provar a jornada completa por escopo | P1 | banco e E2E demonstram a trilha operacional prevista, sem inventar conteúdo |
| GAP-2026-005 | Configurar identidade externa/MFA, TLS/headers, traces, backup/restore e rollback somente com infraestrutura autorizada | P1 | evidência live, redigida e reproduzível em ambiente apropriado |
| GAP-2026-006 | Revisar diff, criar commit intencional, atualizar manifesto e repetir a auditoria no mesmo SHA | P1 | SHA contém código, testes, docs e evidência da reauditoria |

Plano da janela F3-S3 + complementos F3-S4/F3-S6/F3-S7/F3-S8: nenhuma correção P0 identificada; F3-S3 fechou a fatia mínima de identidade/correção/feedback, F3-S4 adicionou a superfície participante E2E sintética, F3-S6 adicionou hardening de borda, F3-S7 reconciliação determinística e F3-S8 rotação/revogação, mantendo release bloqueado pelos gaps P1/P2 e pelas fases posteriores.

| Campo | Obrigatório |
|---|---|
| `gap_id` | sim |
| causa raiz | sim, não apenas sintoma |
| impacto | usuário, segurança, dados, operação ou autoria |
| ação | mudança concreta e reversível quando possível |
| prioridade | P0/P1/P2/P3 |
| owner | pessoa/equipe responsável |
| teste de regressão | ID obrigatório antes de fechar |
| rollback | passo de retorno |
| status | OPEN/IN_PROGRESS/VERIFIED/CLOSED |

Correção P0 interrompe release. Toda remediação atualiza backlog, teste, log e evidência; não fechar gap por aceite verbal sem registro.

## Ações

| gap_id | causa raiz | ação | prioridade | owner | teste de regressão | rollback | status |
|---|---|---|---|---|---|---|---|
| GAP-F2-001 | sessão, convite, CSRF, rate limit local e rotação/revogação foram construídos; faltam recuperação além do convite, E2E de login contra API real e contador compartilhado somente se houver réplicas | manter convite administrativo hash-only, adicionar E2E real e avaliar contador compartilhado antes de escala horizontal | P1 | API/identity | AUTH-*, SEC-SESSION-*, E2E auth | desabilitar rota mutável e revogar sessões | PARTIAL |
| GAP-F2-002 | RLS de auditoria e trigger append-only, worker lease/retry e sink básico foram fechados; RLS contextual/crash/replay/reconciliação faltam | materializar RLS por contexto, teste de mutação negativa, crash/replay e reconciliação desde PostgreSQL | P1 | persistence/worker | RLS-*, WORKER-*, AUDIT-*, RECOVERY-* | feature flag de jobs e replay idempotente | PARTIAL |
| GAP-F2-003 | logger/redaction/correlação local e métricas em memória existem, mas não há collector nem operação histórica | adicionar exporter/collector, retenção, alertas/SLOs, dashboards e traces distribuídos quando o runtime interno exigir | P1 | runtime/ops | OBS-*, SEC-LOG-*, HEALTH-* | desligar exporters sem alterar núcleo; manter sink redigido local | PARTIAL |
| GAP-F2-004 | resposta própria, leitura publicada, progresso mínimo, correção humana, feedback e E2E sintético participante existem, mas ciclo educacional ainda é mínimo | implementar currículo, autoria web, remediação/contestação, E2E contra API real e demais jornadas | P1 | learning/web | ASSESSMENT-*, WEB-*, E2E-* | manter API v1 anterior compatível | PARTIAL |
| GAP-F2-005 | adaptadores, job, smoke Qdrant/IA fake e reconciliação determinística existem, mas execução operacional conjunta habilitada, fallback e observabilidade faltam | materializar execução/runbook PostgreSQL+Qdrant habilitados, estados de degradação, métricas e smoke controlado; IA externa só quando autorizada pela configuração | P2 | worker/integrations | INT-*, RECOVERY-*, OBS-* | desligar feature flag assistiva | PARTIAL |
| GAP-F3-001 | transição editorial interna existe, mas criação web, revisão E2E e RLS contextual faltam | implementar autoria draft→revisão Ricardo→publicação/retirada, UI/API completa, auditoria e projeções de cada estado | P1 | content/authorization | CONTENT-*, SEC-AUTH-*, E2E-CONTENT-* | manter leitura da versão publicada anterior | PARTIAL |
| GAP-F3-002 | sessão, convite, CSRF, rate limit local e rotação/revogação existem; faltam E2E de login contra API real, recuperação além do convite e contador compartilhado somente se o runtime ganhar múltiplas réplicas | manter convite administrativo controlado, adicionar E2E real e avaliar contador compartilhado apenas com escala horizontal | P1 | API/identity | AUTH-*, SEC-SESSION-*, E2E auth | desabilitar rota mutável e revogar sessões | PARTIAL |
| GAP-F3-003 | correção humana/feedback mínimo, superfície participante E2E sintética e projeções existem, mas avaliação completa não existe | construir rubrica automática quando necessária, remediação, contestação, API web real, autoria/operação, E2E completo e progressão integral | P1 | assessment/learning | ASSESSMENT-*, PROGRESS-*, E2E-* | manter submissão em `AGUARDA_CORRECAO_HUMANA` | PARTIAL |
