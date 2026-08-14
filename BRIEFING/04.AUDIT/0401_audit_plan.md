# 0401 — Audit Plan — CVG

## Reauditoria vigente — 2026-08-11

O recorte foi reexecutado sobre o runtime local ativo e o worktree atual. A coleta incluiu leitura de BRIEFING/docs, pnpm verify, pnpm build, E2E sintético, tentativa de E2E real, smoke HTTP, smoke de carga com timeout explícito, verificação de topologia HA, audit de dependências, scanner de segredos, diff-check e consulta agregada do PostgreSQL. A classificação vigente é PARTIAL: o núcleo local funciona, mas a prova real foi interrompida pelo fixture incompatível com RLS e a rastreabilidade do worktree não está fechada.

**Execução atual:** `AUD-F3-S3-SCOPED` + complementos `AUD-F3-S4-WEB-E2E`/`AUD-F3-S5-OBSERVABILITY`/`AUD-F3-S6-EDGE-HARDENING`/`AUD-F3-S7-INDEX-RECONCILIATION`/`AUD-F3-S8-SESSION-ROTATION`; resultado em consolidação em `0490_audit_report.md` como `PASS_WITH_GAPS`, sem autorização de release.

## Método

1. congelar versão, ambiente, período e escopo em 0400;
2. coletar evidências por ID, sem conteúdo protegido;
3. comparar PRD→SPEC→BUILD→runtime;
4. executar testes read-only e reproduções sintéticas controladas;
5. classificar `PASS`, `PARTIAL`, `FAIL` ou `NOT_EXECUTED`;
6. registrar causa raiz, impacto, severidade, owner e prazo;
7. gerar 0420, 0421 e 0490;
8. atualizar runtime state, log e backlog.

## Prioridade

1. exposição autoral, segredo, acesso cruzado e alteração de nota;
2. perda/duplicação de resposta e inconsistência PostgreSQL/outbox/Qdrant;
3. indisponibilidade, recuperação, latência e alertas;
4. aderência funcional, acessibilidade e dívida de manutenção.

## Regra de evidência

Uma afirmação só é `PASS` com teste/telemetria/reprodução identificável. Ausência de evidência é `NOT_EXECUTED` ou `PARTIAL`, nunca presunção de conformidade.

## Coleta executada

| Bloco | Evidência | Resultado |
|---|---|---|
| qualidade/build | `AUD-F3-001/002` | `PASS` |
| PostgreSQL | `AUD-F3-003` | `PASS` para migrações, transações, atividade publicada/atribuída, resposta/sessão/outbox, transição editorial, progresso e RLS mínima da auditoria; backup `NOT_EXECUTED` |
| Qdrant | `AUD-F3-004/005` | `PASS` para coleção sintética, inicialização, health, filtro, upsert/remoção e readiness; reconstrução completa `PARTIAL` |
| API/health | `AUD-F3-005` + evidência F2 | `PASS` para contrato HTTP, projeção, transição/progresso e liveness/readiness; fluxo completo web `NOT_EXECUTED` |
| IA/worker | `AUD-F3-006`; fake e sink live, nenhuma chamada externa | `PARTIAL` |
| logs/métricas/traces | `AUD-F3-009` | `PARTIAL`: logger/redaction, correlação local e métricas em memória passam; collector, retenção, alertas e traces distribuídos pendentes |
| experiência web/E2E | `AUD-F3-007` | `PARTIAL`: 3 fluxos de participante passam em build de produção com fixtures sintéticas e API interceptada; API real, autoria/operação, axe e revisão manual permanecem pendentes |
| proteção de borda | `AUD-F3-010`/`F3-S8` | `PASS` para CSRF/origem, rate limit local, `Retry-After`, health isento, bloqueio antes do caso de uso e rotação/revogação; escala horizontal e E2E real permanecem pendentes |

## Reexecução vigente — 2026-08-11

| Fase | Execução atual | Resultado |
|---|---|---|
| congelamento/escopo | HEAD `9803c85`, worktree explicitamente não commitado | `PARTIAL` — score de rastreabilidade reduzido |
| documentação/gates | leitura de `docs/`, PRD, SPEC, BUILD, AUDIT; `pnpm verify` | `PASS` |
| runtime/integrações | systemd web, Docker HA, health, E2E real, PostgreSQL/Qdrant/Tempo | `PASS_WITH_GAPS` |
| logs/métricas/segurança | logs JSON, métricas protegidas, headers, edge, secret/dependency scan | `PASS_WITH_GAPS` |
| dados/conteúdo | contagens live, fila de 763 pendências, role sem bypass | `PASS_WITH_GAPS` |
| produto/experiência | 15 E2E focados e rotas administrativas | `PARTIAL` — produto completo não entregue |
| integração externa | IdP, domínio/TLS público, traces/backups externos, deploy/rollback autorizado | `NOT_EXECUTED`/`FAIL-CLOSED` |

O relatório e a matriz vigente estão em `0491_full_construction_audit.md`; gaps e remediações correspondentes foram atualizados nesta rodada.
