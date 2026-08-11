# Evidência da remediação — 2026-08-11

## Escopo

Este registro fecha as limitações técnicas observadas em `0509_current_worktree_audit_2026-08-11.md` sem transformar provas locais em aprovação de produção. Todos os dados usados foram sintéticos; nenhum prontuário, tutor, foto, PDF, segredo ou credencial foi registrado.

Implementação registrada no commit `e3cd966efb1d4d2a5596075d1d12f4101dd12492`; reauditoria e handoff documental em `31d54f6abb9bbc8e36ae40afea78538240fef79d` e `4a5aa676939102d8598365206bf42270e9cdd19b`; defaults de runtime e evidência final em `5cdcf6c`.

## Resultado por limitação

| Limitação | Resultado comprovado | Estado de produção |
| --- | --- | --- |
| E2E real/RLS | Fixture com conexão administrativa separada; API sem `SUPERUSER`/`BYPASSRLS`; E2E Chromium 14/14 e cleanup passaram | Fechado no ambiente de prova; CI remoto ainda precisa executar o workflow desta revisão |
| 24 módulos | Materialização idempotente: 24 atividades, 796 versões de conteúdo, 796 registros editoriais, 796 itens, 24 atribuições e 24 estados | Fechado tecnicamente no banco sintético; visibilidade depende de escopo autorizado |
| Estado honesto | 24 estados `PENDENTE` com `INICIAR_BASELINE`; 24 atribuições `NAO_ATRIBUIDO`; nenhum mastery foi inventado | Fechado tecnicamente |
| Conteúdo/revisão | 763 versões novas `PROJECAO_VERIFICADA`; conteúdo não revisado não é publicado; revisão independente e publicação exigem `APROVADO_CLINICAMENTE` | Revisão semântica/item a item e aprovação de Ricardo pendentes |
| MFA/recovery | Ausência de provedor é `NOT_CONFIGURED`; configuração obrigatória fail-closed e erros do adapter são cobertos por testes | Provedor, sandbox, enrollment, challenge, recovery e step-up reais pendentes |
| Headers/TLS | Caddy e Next configurados; HTTP health 200, HTTPS interno 200, rota HTTP não-health redireciona 308, headers verificados | Domínio/DNS/certificado gerenciado e E2E público pendentes |
| Traces | Collector OTLP → Tempo 3.0.0; trace sintético consultável depois de restart; volume `tempo-data` | Storage/retention externos e alertas de produção pendentes |
| Deploy/rollback | Manifesto com digests SHA-256, preflight, expand/contract, canário e rollback em dry-run | Promoção real em ambiente autorizado pendente |
| Backup/restore | `pg_dump` custom externo ao repositório, checksum SHA-256 e manifesto; prova sintética de backup passou | Backup externo agendado, restore de produção e medição RPO/RTO pendentes |
| Load smoke | Parser/timeout default corrigido; alvo HA publicado `:3180` retornou 200/200, 100% sucesso, p95 observado 66,91 ms em 200 requests/concurrency 10 | Carga de aceitação e failover de produção pendentes |

## Estado do banco ativo sintético

Após a execução idempotente de `scripts/materialize-curriculum.mjs`:

- `learning_activities`: 24 — 1 `PUBLISHED` preexistente (M02) e 23 `WITHDRAWN` novos;
- `content_versions`: 796 — 763 `PROJECAO_VERIFICADA` novos e 33 `PUBLICADO` preexistentes da fatia M02;
- `content_editorial_records`: 796;
- `learning_activity_items`: 796;
- `learning_assignments`: 24 — todos `NAO_ATRIBUIDO`;
- `curriculum_runtime_states`: 24 — todos `PENDENTE`.

A segunda execução não criou duplicatas. A materialização não publicou conteúdo novo nem atribuiu atividade publicável automaticamente.

## Gates executados

```text
CVG_RUN_REAL_E2E=true pnpm test:e2e                         PASS — 14/14
CVG_LOAD_TARGET=http://127.0.0.1:3180/health/live pnpm ops:load-smoke
                                                              PASS — 200/200, 100%, p95 66,91 ms
pnpm ops:verify-ha                                          PASS — api-a/api-b, worker-a/worker-b, Tempo
pnpm ops:verify-edge-security                               PASS — HTTP/HTTPS/redirect/headers
CVG_VERIFY_DURABLE_TRACES=true ... pnpm ops:verify-durable-traces
                                                              PASS — trace após restart
pnpm ops:verify-release-manifest                            PASS
pnpm ops:deploy-release                                     PASS — dry-run seguro
pnpm ops:rollback-release                                   PASS — dry-run seguro
pnpm ops:create-postgres-backup                             PASS — dump/checksum sintéticos
pnpm test:integration:restore                               PASS — marcador isolado, RTO 557 ms
pnpm verify                                                 PASS — 406 testes, 17 skips, cobertura >80%
pnpm verify:secrets                                         PASS
pnpm audit --audit-level=high                               PASS — sem vulnerabilidades
pnpm build                                                  PASS
```

O quality gate completo, o restore live, o E2E real, o build e os gates operacionais de R6 passaram. A imagem HA local foi reconstruída no HEAD `4a5aa676939102d8598365206bf42270e9cdd19b`, com ID `sha256:dd8b96026bf763f8cd030bb3a52bfb92b4b82fbd29b9770512c830cf89dc0e7c`, e o edge foi recriado em `3180/3181`. A promoção continua proibida sem as decisões humanas listadas abaixo.

Durante a repetição do E2E, o Next foi recompilado com o fallback local de `CVG_API_INTERNAL_URL=127.0.0.1:3101`, enquanto o serviço web usa `:3180`; o health 500 foi corrigido reconstruindo com `CVG_API_INTERNAL_URL=http://127.0.0.1:3180` e reiniciando o serviço. A primeira recriação HA com env files explícitos também selecionou o default TLS `8443`; os defaults versionados e o ambiente local não secreto foram corrigidos para `3181`/`https://localhost:3181`. Esse contrato de build-time/topologia fica registrado como pré-requisito do rollout.

## Decisões humanas obrigatórias

O release permanece `WAITING_HUMAN_APPROVAL` até Ricardo registrar:

1. provedor externo e política de MFA/recovery;
2. domínio, DNS, certificado e origem HTTPS;
3. backend/storage e retenção de traces;
4. destino, janela, retenção e responsáveis pelo backup;
5. ambiente autorizado para deploy/rollback;
6. revisão semântica e aprovação clínica dos packs que poderão ser publicados.

Sem essas decisões, o sistema permanece operacionalmente demonstrável em ambiente local/sintético, mas não é declarado publicado, clínico ou de produção.
