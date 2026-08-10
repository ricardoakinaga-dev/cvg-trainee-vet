# 0412 — Runtime Analysis

Resultado: PARTIAL — F3-S3 + complementos F3-S4/F3-S5/F3-S6/F3-S7/F3-S8.

## Perguntas obrigatórias

1. o sistema quebra em login, leitura, salvamento ou submissão?
2. depois de timeout/crash o comando é repetível sem duplicar efeito?
3. há tentativa, nota, progresso, outbox ou auditoria em estado inconsistente?
4. Qdrant fica atrasado e é reconciliado pelo PostgreSQL?
5. IA degradada deixa o núcleo funcional?
6. health/readiness distinguem PostgreSQL indisponível de integração degradada?
7. latência/error budget/SLOs são mensuráveis?

## Evidências

### Reproduções sintéticas desta janela

- API liveness/readiness: PASS com PostgreSQL e com Qdrant habilitado (evidência F2/AUD-F3-005);
- sessão server-side, SaveAnswer, revogação e replay: PASS (AUD-F2-009);
- atividade publicada, transição editorial e progresso: PASS em migração, repositórios e fluxos de caso de uso com atribuição/autorização sintética (AUD-F3-003);
- PostgreSQL indisponível no readiness: coberto por teste unitário, resposta 503 redigida;
- timeout/crash/replay de comando: idempotência e replay PASS no teste live PostgreSQL; crash real do processo NOT_EXECUTED;
- Qdrant divergente/reconciliação: filtro, inicialização, upsert/remoção, `list/scroll` e reconciliação determinística desde a porta PostgreSQL PASS em testes; execução operacional conjunta com integrações habilitadas, concorrência e recovery NOT_EXECUTED;
- worker/outbox: claim com lease, retry limitado, terminal `FAILED` e sink idempotente PASS com dados sintéticos; crash real, replay operacional e reconciliação formal NOT_EXECUTED;
- IA degradada: adaptadores têm erro explícito/fake e o núcleo não depende do worker; fallback operacional completo e chamada externa NOT_EXECUTED;
- logger/redaction, correlação local e contadores/histogramas em memória: PASS no complemento AUD-F3-009; collector, SLO/p95/p99 históricos, alertas e traces distribuídos: NOT_EXECUTED.
- CSRF/origens, rate limit local bounded, `Retry-After`, health isento, bloqueio antes do caso de uso e rotação/revogação: PASS nos complementos AUD-F3-010/F3-S8; rate limit distribuído e E2E navegador→API real: NOT_EXECUTED.

Traces por `request_id`/`correlation_id`, métricas p95/p99, eventos de erro, jobs presos, replay sintético, teste de concorrência, healthchecks e restore. Classificar causa raiz, frequência, impacto e condição de recuperação.
