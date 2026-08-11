# 0420 — Gap Analysis

## Reauditoria vigente — 2026-08-11

| ID | Gap atual | Severidade | Estado |
|---|---|---|---|
| GAP-2026-001 | Fixture E2E real usa usuário de aplicação para seed direto e é bloqueado pela RLS em activity_assignments | P1 | OPEN |
| GAP-2026-002 | CVG_API_INTERNAL_URL precisa ser injetada no build web, mas não está no contrato padrão do fluxo | P1 | OPEN |
| GAP-2026-003 | Default do load smoke usa 5_000 como string e falha antes das requisições | P2 | OPEN |
| GAP-2026-004 | Runtime ativo tem somente M02 atribuída e zero estados curriculares persistidos | P1 | OPEN |
| GAP-2026-005 | MFA/recuperação externa, TLS/headers, traces duráveis, deployment/rollback e restore de produção não foram comprovados | P1 | OPEN |
| GAP-2026-006 | Alterações de autenticação e documentação desta janela permanecem sem SHA final auditável | P1 | OPEN |

Estado: OPEN/PARTIAL; gaps abaixo são do recorte B0/F2-S2/F3-S2/F3-S3 + complementos F3-S4/F3-S5/F3-S6/F3-S7/F3-S8 e não foram mascarados.

## Classificação

### 🔴 CRÍTICOS

Segredo, acesso cruzado, exposição autoral, perda/duplicação de resposta/nota, dado inconsistente, rollback ausente, falha sem observabilidade ou decisão IA com autoridade.

### 🟠 IMPORTANTES

Cobertura abaixo de 80%, contrato incompatível, retry incorreto, Qdrant não reconstruível, SLO sem alerta, migração sem rollback ou fluxo de papel incompleto.

### 🟡 MELHORIAS

## Gaps observados nesta janela

| ID | Evidência | Impacto | Severidade | Estado |
|---|---|---|---|---|
| GAP-F2-001 | sessão server-side, convite/aceite único, CSRF, rate limit local e rotação/revogação foram materializados; recuperação além do convite administrativo, rate limit compartilhado e E2E de login contra API real faltam | identidade operacional incompleta | P1 | PARTIAL |
| GAP-F2-002 | auditoria append-only/RLS mínima e worker outbox foram materializados, mas RLS contextual completo, crash/replay operacional e reconciliação ainda faltam | defesa em profundidade e processamento assíncrono incompletos | P1 | PARTIAL |
| GAP-F2-003 | logger JSON redigido, correlação local e métricas em memória foram materializados, mas collector, retenção, alertas, dashboards e traces distribuídos ainda faltam | diagnóstico/SLO/incident response incompletos | P1 | PARTIAL |
| GAP-F2-004 | SaveAnswer, projeção, leitura, progresso mínimo, correção humana, feedback do dono e E2E sintético participante foram construídos, mas autoria web, currículo completo, remediação, contestação e E2E contra API real ainda não | produto educacional incompleto | P1 | PARTIAL |
| GAP-F2-005 | Qdrant foi inicializado, indexado/removido pelo worker e a reconciliação determinística desde a porta PostgreSQL foi construída/testada; IA externa, fallback operacional, execução conjunta com integrações habilitadas e métricas ainda não | integração assistiva sem prova operacional completa | P2 | PARTIAL |
| GAP-F3-001 | transição editorial por papel, publicação, retirada e auditoria metadata-only existem; criação web, revisão E2E, retirada live e RLS contextual ainda não | conteúdo não pode ser operado end-to-end | P1 | PARTIAL |
| GAP-F3-002 | identidade básica/sessão, convite de uso único, CSRF, rate limit local e rotação/revogação existem, mas recuperação além do convite, rate limit compartilhado e E2E contra API real não existem | acesso operacional incompleto | P1 | PARTIAL |
| GAP-F3-003 | correção humana versionada, feedback, idempotência, auditoria metadata-only e superfície participante E2E existem, mas rubrica automática, remediação, contestação, API web real e autoria/operação não | avaliação e progresso completos não estão disponíveis | P1 | PARTIAL |

UX, performance, dashboard, ergonomia editorial ou custo sem impacto de segurança/consistência.

Cada gap contém `gap_id`, evidência, requisito/SPEC, causa provável, impacto, severidade, owner, prazo e status. Auditoria sem sistema funcional registra `AUDIT_NOT_EXECUTED`, não gaps fictícios.
