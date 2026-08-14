# 0511 — Backlog executivo dos itens abaixo de 80 para elegibilidade 95

## 1. Contrato do backlog

Este é um **filtro executável** das tasks canônicas do `0493`, limitado aos itens 3, 9, 10, 12, 13 e 16. Os IDs e estados são preservados; alterações de status devem ser feitas primeiro na fonte canônica e reconciliadas aqui e em `sub80-to-95-program.json` na mesma rodada.

Baseline: item 3 = 72, item 9 = 75, item 10 = 68, item 12 = 78, item 13 = 78 e item 16 = 65. Alvo: **elegibilidade 95 por item**, sem promoção antes de reauditoria independente.

Snapshot: 29 tasks — 3 `COMPLETED`, 3 `IN_PROGRESS`, 12 `READY_FOR_NEXT_STEP`, 11 `WAITING_HUMAN_APPROVAL`.

## 2. Políticas de execução

- ordem: P0 desbloqueada → caminho crítico → P1; WIP máximo de três tasks de engenharia e um lote clínico;
- TDD obrigatório: RED reproduzível → GREEN mínimo → refactor → review independente → evidência;
- dados: somente sintéticos/autoriais autorizados; sem segredos, prontuários, fotos, PDFs ou links de terceiro;
- segurança: validação no boundary, autorização server-side deny-by-default, SQL parametrizado, IA/Qdrant sem autoridade;
- pronto: critério funcional + teste proporcional + rollback + artifact/SHA + docs/estado/log/backlog/traceability;
- score: status `COMPLETED` de task não altera nota do item; somente G-S80-9 pode fazê-lo.

## 3. Ordem inicial de puxada

1. decidir D-ENT-01/07/09 e executar `ENT95-03-B`;
2. continuar `ENT95-16-B`, `ENT95-12-B` e `ENT95-13-B` apenas nas fatias locais desbloqueadas;
3. puxar `ENT95-03-C`, `ENT95-10-C`, `ENT95-13-A` e `ENT95-09-A` conforme dependências;
4. iniciar `ENT95-12-A/C` somente após D-ENT-04/05;
5. manter `ENT95-03-D/10-B` como uma única fábrica de decisão, embora forneçam evidência a dois itens;
6. não iniciar RC/re-auditoria enquanto G-S80-0–8 não estiverem verdes.

## 4. Item 3 — Currículo e conteúdo clínico (72 → 95)

### ENT95-03-A — Inventariar e estratificar o corpus

- prioridade/status/owner/sprint: P0 / `COMPLETED` / Content Lead + QA / S0;
- dependências: nenhuma no recorte;
- entrega: inventário versionado de 24 módulos, 96 sessões, 796 registros e criticidade;
- RED→GREEN: divergência de contagem, objetivo ausente ou duplicidade falha; o gate fecha somente com reconciliação integral;
- aceite/evidência: `curriculum-inventory.json`, teste de governança e artifact 043 já verdes;
- rollback: reverter apenas a versão do inventário, nunca apagar histórico ou decisão clínica;
- próximo: usar a estratificação em `ENT95-03-B`; task concluída não aprova os 763 itens.

### ENT95-03-B — Calibrar padrão clínico em 25 itens

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Content + Ricardo / S0;
- dependências: 03-A e D-ENT-07;
- entrega: amostra estratificada, fonte interna, rubrica, gabarito, feedback, linguagem e criticidade calibrados;
- RED→GREEN: preflight reprova item incompleto/self-review; após correção, 25/25 têm decisão independente e concordância/rework medidos;
- aceite/evidência: ata de calibração assinada, checklist versionado, throughput 40–60/semana recalculado;
- rollback: congelar lote e restaurar checklist anterior; nenhuma decisão se converte automaticamente em publicação;
- pronto: G-S80-1 verde.

### ENT95-03-C — Completar 24 módulos e 96 sessões

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / Instructional Design + Content / S1–S8;
- dependências: 03-B;
- entrega: objetivos, carga, atividades, avaliação, remediação e retenção por módulo;
- RED→GREEN: fixture com módulo/sessão/carga ausente falha antes da fatia; implementar lote até 24/24 e 96/96;
- aceite/evidência: packs versionados, catálogo transacional, verificador estrutural/pedagógico e amostra funcional;
- rollback: retirar somente o pack defeituoso por versão e preservar o release anterior;
- pronto: zero inconsistência estrutural e nenhum conteúdo não autorizado.

### ENT95-03-D — Revisar e decidir 763 itens

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Pre-review + Ricardo / S1–S9;
- dependências: 03-B e D-ENT-07; execução compartilhada com 10-B;
- entrega: pré-revisão, rework, decisão e preflight em lotes de 40–60/semana;
- RED→GREEN: fila estrita permanece vermelha enquanto houver item liberável sem decisão; cada lote fecha actor/data/versão/justificativa;
- aceite/evidência: zero pendência de release, rejeições explícitas, rework ≤20% ou recalibração registrada;
- rollback: retirar o lote do release e reabrir nova versão; nunca sobrescrever decisão anterior;
- pronto: G-S80-3 não tem pendência clínica.

### ENT95-03-E — Validar B-07 e blueprint diagnóstico

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Clinical + Psychometrics + Ricardo / S3–S6;
- dependências: 03-B;
- entrega: 120 itens, três blocos, cobertura temática, equivalência, exposição e não-punitividade;
- RED→GREEN: forma com tamanho/cobertura/exposição inválidos falha; formas reproduzíveis passam contratos e E2E;
- aceite/evidência: blueprint assinado, seed/versão, resultados por tema e prova de ausência de nota punitiva;
- rollback: desabilitar versão do blueprint e manter diagnóstico anterior sem recalcular tentativa histórica;
- pronto: diagnóstico pode desbloquear 09-A.

### ENT95-03-F — Medir eficácia e saúde no piloto

- prioridade/status/owner/sprint: P1 / `WAITING_HUMAN_APPROVAL` / Product Analytics + Clinical / S11;
- dependências: 03-D, 03-E e D-ENT-08;
- entrega: conclusão, dificuldade, discriminação, distratores, contestação e retenção agregadas;
- RED→GREEN: limiar anômalo gera finding humano e nunca correção automática;
- aceite/evidência: relatório minimizado por versão, anomalias triadas e plano de ação aprovado;
- rollback: suspender item/forma por versão, preservar tentativas e retirar analytics não autorizado;
- pronto: eficácia clínica documentada no RC.

## 5. Item 9 — Jornada do participante (75 → 95)

### ENT95-09-A — Diagnóstico, perfil e trilha recomendada

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / Product + Full-stack / S3–S4;
- dependências: 03-E e fundações canônicas 05-B/07-C;
- entrega: três blocos, pausa/retomada, perfil por tema e recomendação sem aprovação/reprovação;
- RED→GREEN: refresh/interrupção preservam respostas e nota global punitiva é impossível;
- aceite/evidência: domínio→persistence→API→web, contratos e E2E no PostgreSQL;
- rollback: feature flag server-side volta à trilha anterior sem apagar respostas;
- pronto: perfil seguro e trilha autorizada reproduzíveis.

### ENT95-09-B — Estudo, progresso e próxima ação

- prioridade/status/owner/sprint: P0 / `COMPLETED` / Full-stack + UX / S4;
- dependências: fundação 07-C já satisfeita no escopo local;
- entrega: progresso de 24 meses, pré-requisitos, deadlines, acomodação e uma próxima ação;
- RED→GREEN: estados empty/stale/error/offline e conflito de prioridade cobertos;
- aceite/evidência: aggregate e dashboard responsivo já verificados, sem campo administrativo;
- rollback: recompor projeção a partir da fonte transacional;
- próximo: integrar 09-A/C/D sem reabrir regra concluída.

### ENT95-09-C — Avaliação, resultado, remediação e retenção

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / Full-stack + QA / S5–S6;
- dependências: 03-D e fundações 05-B/07-C;
- entrega: prova/caso/aberta, limiares, duas tentativas, reforço e D+30/60/90;
- RED→GREEN: item repetido, prazo <7 dias, score incorreto e alteração prática falham;
- aceite/evidência: testes de domínio/aplicação/contrato/integração/E2E para sucesso, lacuna e rework;
- rollback: desabilitar nova regra por versão e manter tentativas imutáveis;
- pronto: resultado por objetivo e aviso de não competência prática.

### ENT95-09-D — Contestação, feedback e histórico

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / Full-stack + Product / S5–S7;
- dependências: 10-C e fundação 07-C;
- entrega: protocolo, acompanhamento, revisor independente, decisão, SLA e histórico pessoal;
- RED→GREEN: participante cruzado, payload sensível ou decisão sem justificativa falham;
- aceite/evidência: E2E owner-scoped, audit append-only, alertas de SLA e mensagens seguras;
- rollback: pausar abertura por flag mantendo consulta e histórico; nunca apagar recurso;
- pronto: fluxo integral e SLA observável.

### ENT95-09-E — UAT da jornada em turnos e dispositivos

- prioridade/status/owner/sprint: P1 / `WAITING_HUMAN_APPROVAL` / UX + Product + usuários / S10–S11;
- dependências: 09-A–D e D-ENT-08;
- entrega: roteiro consentido em celular/desktop e contexto 12x36, com dados sintéticos;
- RED→GREEN: erro/abandono/incompreensão vira finding; P0/P1 é corrigido e reexecutado;
- aceite/evidência: 100% das tarefas críticas concluídas ou findings críticos fechados;
- rollback: interromper sessão/coorte sem perder estado e revogar acessos temporários;
- pronto: G-S80-7 verde para a jornada.

## 6. Item 10 — Autoria, revisão e governança clínica (68 → 95)

### ENT95-10-A — Completar workflow editorial atômico

- prioridade/status/owner/sprint: P0 / `COMPLETED` / Backend + Database / S2;
- dependências: fundações 05-A/06-C já atendidas localmente;
- entrega: autoria→revisão→ajuste→aprovação→autorização→publicação→retirada;
- RED→GREEN: self-review, publicação sem decisão persistida e falha de outbox fazem rollback;
- aceite/evidência: domínio/aplicação/persistência/contratos, integração PostgreSQL e artifact 033 verdes;
- rollback: transação atômica e retirada versionada; sem edição destrutiva;
- próximo: manter invariantes enquanto 10-B–E avançam.

### ENT95-10-B — Executar governança clínica do corpus

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Ricardo + Content / S1–S9;
- dependências: 10-A, 03-B e D-ENT-07;
- entrega: a mesma fila de 03-D com 763 aprovações/rejeições independentes;
- RED→GREEN: modo estrito vermelho até zero pendência; decisão de IA ou mesmo autor/revisor falha;
- aceite/evidência: export de decisões, preflight, actor/data/versão/justificativa e nenhuma autopublicação;
- rollback: retirar lote por versão e reabrir em estado de ajuste, preservando decisão anterior;
- pronto: 100% do corpus liberável decidido por humano.

### ENT95-10-C — Correção, recurso, anulação e recálculo

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / Domain + Backend + Clinical / S5–S7;
- dependências: 10-A e fundação 05-B;
- entrega: rubrica humana, revisor independente, alteração de gabarito, afetados e comunicação;
- RED→GREEN: recálculo que edita tentativa original, perde versão ou ignora afetado falha;
- aceite/evidência: testes de caso, aplicação, integração e E2E com audit append-only;
- rollback: reverter regra futura por versão sem reverter fatos históricos;
- pronto: 09-D pode consumir decisão segura.

### ENT95-10-D — Validade e retirada emergencial

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / Content Ops + Backend / S7–S9;
- dependências: 10-A;
- entrega: corte, próxima revisão, expiração, retirada e participantes afetados;
- RED→GREEN: conteúdo vencido/retirado que permanece projetado ou evento duplicado falha;
- aceite/evidência: scheduler/worker idempotente, audit, dashboard e drill sem expor fonte/gabarito;
- rollback: restaurar apenas versão explicitamente aprovada, nunca ressuscitar automaticamente;
- pronto: retirada controlada em ambiente autorizado.

### ENT95-10-E — QA editorial pós-publicação

- prioridade/status/owner/sprint: P1 / `WAITING_HUMAN_APPROVAL` / Clinical QA + QA / S9–S11;
- dependências: 10-B–D;
- entrega: amostra por módulo, tipo e risco em staging sintético;
- RED→GREEN: vazamento/incoerência reabre item e lote; reteste fecha finding;
- aceite/evidência: relatório assinado e zero P0/P1 sem correção;
- rollback: retirar lote afetado por versão e preservar evidência do finding;
- pronto: evidência de G-S80-3/G-S80-7.

## 7. Item 12 — Observabilidade e operação (78 → 95)

### ENT95-12-A — Telemetria externa, retenção e acesso

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + Security / S7;
- dependências: D-ENT-04;
- entrega: logs, métricas e traces correlacionados em backend aprovado, com RBAC, criptografia e retenção;
- RED→GREEN: probe/consulta/retenção falham sem backend; após provisionamento, correlação ponta a ponta passa sem PII;
- aceite/evidência: consulta auditada, política efetiva, teste de acesso negado e secret manager;
- rollback: desabilitar export e revogar credencial sem interromper telemetria local mínima;
- pronto: 12-B pode receber prova produtiva.

### ENT95-12-B — SLOs, dashboards e alertas acionáveis

- prioridade/status/owner/sprint: P0 / `IN_PROGRESS` / SRE + Product / S7–S8;
- dependências: 12-A para fechamento; policy local já verde;
- entrega: disponibilidade, latência, erros, fila, indexação, IA assistiva e experiência;
- RED→GREEN: falha sintética cruza threshold; alerta chega, é reconhecido e liga runbook sem PII;
- aceite/evidência: dashboards/rules versionados, acknowledgement, deduplicação e ruído medido;
- rollback: restaurar ruleset anterior e silenciar regra ruidosa com change record temporal;
- pronto: nenhum SLO é declarado sem janela real.

### ENT95-12-C — Backup/restore, RPO/RTO e DR

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + Database / S8–S9;
- dependências: D-ENT-05 e fundação 06-D;
- entrega: perda de nó/ambiente, restore isolado e retorno controlado;
- RED→GREEN: baseline mede perda/tempo antes da correção; restore passa integridade e jornada crítica;
- aceite/evidência: RPO ≤1h, RTO ≤4h, criptografia, cadeia de custódia e teardown;
- rollback: abortar retorno e manter ambiente anterior read-only até reconciliação;
- pronto: métricas medidas, nunca estimadas.

### ENT95-12-D — Incident drills e on-call readiness

- prioridade/status/owner/sprint: P1 / `READY_FOR_NEXT_STEP` / SRE + Security + Product / S9–S10;
- dependências: 12-B/C;
- entrega: cenários API down, backlog, IdP down, suspeita de vazamento e retirada clínica;
- RED→GREEN: primeiro drill mede gaps; runbooks/owners são corrigidos; segundo drill confirma;
- aceite/evidência: MTTD/MTTA/MTTR, decisões, comunicações e presença dos owners;
- rollback: encerrar injeção de falha pelo procedimento testado e validar saúde/dados;
- pronto: zero gap P0/P1 do primeiro drill.

### ENT95-12-E — Soak e failover de aceitação

- prioridade/status/owner/sprint: P1 / `READY_FOR_NEXT_STEP` / SRE + QA / S10;
- dependências: 12-A/B;
- entrega: 24h de carga sustentada, troca de réplica e restart controlado;
- RED→GREEN: baseline registra saturação/anomalia; tuning é seguido de execução integral verde;
- aceite/evidência: SLO aprovado, zero perda/duplicidade, telemetria contínua e recovery medido;
- rollback: abort automático no threshold e retorno à topologia/digest anterior;
- pronto: G-S80-4 verde.

## 8. Item 13 — Web, UX e acessibilidade (78 → 95)

### ENT95-13-A — Design system premium e estados completos

- prioridade/status/owner/sprint: P1 / `READY_FOR_NEXT_STEP` / UX + Frontend / S1–S6;
- dependências: inventário de superfícies do recorte;
- entrega: tokens/componentes e loading/empty/error/stale/offline/success em jornadas P0;
- RED→GREEN: component/visual tests falham para estado ou viewport ausente e passam após migração incremental;
- aceite/evidência: inventário 100%, mensagens acionáveis, responsividade e regra de auth apenas server-side;
- rollback: migrar por feature flag e restaurar componente anterior sem perder estado;
- pronto: 13-B pode auditar todas as superfícies reais.

### ENT95-13-B — Auditoria WCAG 2.2 AA automatizada e manual

- prioridade/status/owner/sprint: P0 / `IN_PROGRESS` / Accessibility Specialist + QA / S9–S10;
- dependências: 13-A e jornada 09-A/C;
- entrega: teclado, foco, semântica, contraste, zoom 200/400%, reflow, erros, labels e motion;
- RED→GREEN: registrar violações antes da correção; reexecutar axe, E2E e checklist manual;
- aceite/evidência: zero A/AA em todas as jornadas P0; cinco gaps manuais atuais fechados;
- rollback: reverter componente afetado por flag, preservando correção acessível anterior;
- pronto: evidence pack para G-S80-5.

### ENT95-13-C — Screen reader e usuários representativos

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / UX + Accessibility + usuários / S10–S11;
- dependências: 13-B e D-ENT-08;
- entrega: login, trilha, atividade, prova, resultado, conta, admin e autoria com NVDA/VoiceOver;
- RED→GREEN: barreira vira finding por severidade; P0/P1 é corrigido e tarefa reexecutada;
- aceite/evidência: roteiro, consentimento, ambiente/dispositivo e taxa de conclusão sem dados reais;
- rollback: interromper teste, revogar conta sintética e destruir artefatos não autorizados;
- pronto: tarefas críticas concluídas sem P0/P1.

### ENT95-13-D — Performance web e resiliência de rede

- prioridade/status/owner/sprint: P1 / `READY_FOR_NEXT_STEP` / Frontend + QA / S10;
- dependências: 13-A;
- entrega: budgets de bundle/LCP/INP/CLS, rede lenta, retry e preservação de resposta;
- RED→GREEN: medir baseline de budget e interrupção; otimizar sem alterar regra de negócio;
- aceite/evidência: relatório por viewport/rede, nenhuma perda/duplicidade e build budget verde;
- rollback: reverter asset/chunk por release e manter compatibilidade de contrato;
- pronto: performance aprovada no RC.

## 9. Item 16 — Rastreabilidade e controle de mudanças (65 → 95)

### ENT95-16-A — Fechar worktree em commits intencionais

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Tech Lead + Ricardo / S0 e S12;
- dependências: revisão do diff e autorização humana;
- entrega: alterações separadas por escopo, commits convencionais e worktree limpo;
- RED→GREEN: `git status --short` prova baseline suja; scans/diff/review passam antes de cada commit;
- aceite/evidência: SHA aprovado, sem segredo/dado real e manifest apontando ao commit correto;
- rollback: `git revert` intencional; proibidos reset destrutivo e descarte de mudança do usuário;
- pronto: G-S80-8 pode congelar RC.

### ENT95-16-B — Traceability 100% automatizada

- prioridade/status/owner/sprint: P0 / `IN_PROGRESS` / QA + Tech Lead / S1–S12;
- dependências: 16-A para commit/artifact finais e fundações 02-A/14-A;
- entrega: requirement→SPEC→task→module→contract→test→commit→artifact;
- RED→GREEN: fixture sem cada elo e path inexistente falham com mensagem específica;
- aceite/evidência: 100% P0/P1 e cada ENT95 completo; baseline atual 0/145 não pode ser ocultada;
- rollback: restaurar versão anterior da matriz e reabrir gap; nunca inventar SHA/path;
- pronto: G-S80-6 verde.

### ENT95-16-C — Change control e release manifest por sprint

- prioridade/status/owner/sprint: P1 / `READY_FOR_NEXT_STEP` / Program + SRE / S1–S12;
- dependências: 16-B;
- entrega: escopo, migrations, flags, compatibilidade, risco, owner, rollback e evidência por incremento;
- RED→GREEN: manifest sem campo aplicável falha; gate passa apenas com referências existentes;
- aceite/evidência: change record aprovado, release manifest e log mestre reconciliados;
- rollback: executar procedimento versionado e abrir novo change record para a reversão;
- pronto: cada sprint possui cadeia auditável.

### ENT95-16-D — Congelar RC e reauditar no mesmo SHA

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / Auditor + QA + SRE / S12;
- dependências: G-S80-0–8;
- entrega: tag/digest/manifest, CI remoto, coleta imutável e reavaliação dos seis itens;
- RED→GREEN: qualquer drift de SHA/ambiente invalida evidência; reexecução integral usa o RC congelado;
- aceite/evidência: worktree limpo, artifacts verificáveis e relatório com itens 3/9/10/12/13/16 ≥95;
- rollback: bloquear release, preservar RC falho e criar correção em novo SHA/RC;
- pronto: G-S80-9 verde; caso contrário, backlog permanece aberto.

## 10. Matriz de dependência e desbloqueio

| Dependência | Tasks afetadas | Estado de execução permitido |
|---|---|---|
| D-ENT-01 | 16-A e T0 | somente leitura/preparação até aprovação |
| D-ENT-07 | 03-B/D e 10-B | tooling e inventário; nenhuma decisão simulada |
| D-ENT-04 | 12-A/B | configuração local parcial; sem aceite externo |
| D-ENT-05 | 12-C | restore local parcial; sem RPO/RTO produtivo |
| D-ENT-06 | 16-D | rehearsal local; sem RC/release real |
| D-ENT-08 | 03-F, 09-E, 13-C | dados sintéticos internos; sem alegar piloto/UAT humano |
| G-S80-0–8 | 16-D | task não inicia até todos verdes |

## 11. DoD comum e evidência de 95

Para cada task movida a `COMPLETED`:

1. critérios e dependências fechados ou limitação explicitamente excluída da task;
2. RED, GREEN e refactor registrados;
3. lint, typecheck, testes, coverage, segurança e diff check proporcionais verdes;
4. review independente sem finding CRITICAL/HIGH/P0/P1;
5. rollback executável ou ensaiado;
6. módulo, contrato, teste, commit e artifact ligados em `traceability.yml`;
7. runtime state, log e backlog canônico atualizados.

Para um **item** chegar a 95, todas as suas tasks e critérios de saída devem estar fechados e o auditor independente deve registrar a nota no SHA congelado. Não há arredondamento, média por documentação nem crédito por intenção.

## 12. Próxima ação executável

O próximo comando de governança é `pnpm verify:sub80-program`. A próxima ação humana é decidir D-ENT-01/07/09. Após G-S80-0, a primeira task operacional é `ENT95-03-B`; em paralelo, as fatias locais já autorizadas de `ENT95-12-B`, `ENT95-13-B` e `ENT95-16-B` podem continuar sem promover score ou release.

## 13. Registro de execução local — 2026-08-12

### ENT95-10-D — fatia local executada

- **entrega:** migration 0018, validade/next review, consulta por escopo, `expireDueContent`, autorização server-side, replay sem duplicidade, auditoria redigida, evento `content.withdrawn.v1` e composição no worker;
- **RED/GREEN:** 4/4 aplicação + 7/7 persistência; `pnpm verify:migrations`, `pnpm test:worker`, build e E2E HA verdes;
- **artefato:** `PREMIUM-ENTERPRISE-95-CONTENT-LIFECYCLE-062`;
- **limite:** dashboard/drill operacional e ambiente autorizado ainda não existem; task não é promovida a `COMPLETED`.

### ENT95-13-D — fatia local executada

- **entrega:** `web-performance-governance.json`, verificador, gate no `pnpm verify`, budgets bundle/LCP/INP/CLS/retry, duas medições sintéticas e quatro gaps manuais;
- **RED/GREEN:** 3/3 em `tests/integration/web-performance-governance.test.ts`; build web e E2E HA verdes;
- **artefato:** `PREMIUM-ENTERPRISE-95-WEB-PERF-063`;
- **limite:** Web Vitals reais, CI budget, offline, dispositivos representativos e RC permanecem gaps; task não é promovida a `COMPLETED`.

### Reconciliação

`traceability.yml` recebeu `ENT95-10-D-CONTENT-LIFECYCLE-062`, `ENT95-13-D-WEB-PERFORMANCE-063` e `CVG-SUB80-TO-95-EXECUTION-064`. O programa continua com 29 tasks canônicas, baseline 83,24, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`; a próxima sequência é D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`.

## 14. Registro adicional — ENT95-09-A/C/D + ENT95-10-C — 2026-08-12

- **entrega:** governança executável da jornada ordenada, avaliação/remediação/retenção, feedback/contestação e correção humana versionada/idempotente;
- **RED/GREEN:** verificador ausente no RED; 2/2 no gate focal GREEN; bateria focal 33/35, com 2 integrações live condicionais governadas como skip;
- **evidência:** 4 invariantes PASS, 4 evidências sintéticas PASS, 5 gaps explícitos e artifact `PREMIUM-ENTERPRISE-95-JOURNEY-CORRECTION-065` em `traceability.yml`;
- **limites:** DB/RLS autorizado, UAT de turnos/dispositivos, SLA/alerta real, comunicação clínica de afetados, SHA e reauditoria não foram alegados; tasks canônicas e score permanecem inalterados;
- **próxima ação:** D-ENT-01/07/09 → G-S80-0 → `ENT95-03-B`; manter as demais fatias locais sem fechar gates externos.

## 15. Verificação final da rodada — 2026-08-12

`pnpm verify` passou com 127 arquivos/577 testes/18 skips e cobertura 86,53/82,52/87,31/87,28; build dos 12 workspaces, E2E HA 3/3, audit de dependências e diff-check passaram. A governança adicional de jornada/correção permanece `PASS_WITH_GAPS`; nenhuma task canônica foi promovida, nenhum score foi alterado e o programa continua `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED`.

## 16. Overlay de backlog — oito bloqueios — 2026-08-14

Este overlay converte os oito bloqueios do relatório `docs/112_current_construction_report_2026-08-14.md` em tasks executáveis. Ele complementa as 29 tasks do recorte `CVG-SUB80-TO-95`, não altera seus IDs/estados e não autoriza release por si só.

### 16.1 Regras do overlay

- toda task usa `RED → GREEN → REFACTOR → REVIEW → AUDIT`;
- conteúdo clínico só pode ser decidido no beta por veterinários autorizados e nunca por IA;
- dados de beta/UAT são sintéticos e não contêm pacientes, tutores, prontuários, fotos ou PDFs de terceiros;
- task externa ou dependente de decisão humana fica `WAITING_HUMAN_APPROVAL`;
- `COMPLETED` exige teste, review, rollback, evidência redigida, SHA, artifact e atualização de estado/log/backlog/traceability;
- nenhum gate aceita evidência de runtime divergente do release candidate;
- o overlay encerra somente com `B-G1`…`B-G8` e `G-S80-9` verdes.

## 16.2 BLK-01 — Beta clínico com veterinários / 763 conteúdos

### BLK-01-A — Aprovar protocolo e coorte beta

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Ricardo + Clinical Lead + Product / S0;
- dependências: D-ENT-07, D-ENT-08 e inventário `curriculum-inventory.json`;
- entrega: protocolo beta, critérios de inclusão, conflito de interesse, consentimento, papéis, ambiente, calendário e política de dados sintéticos; coorte recomendada de 5–10 veterinários, sujeita à aprovação humana;
- aceite/evidência: ata assinada, roster autorizado, matriz de responsabilidade e checklist de proteção de dados;
- rollback: cancelar coorte, revogar acessos e preservar somente metadados de decisão autorizados.

### BLK-01-B — Calibrar 25 itens com revisão independente

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Clinical Lead + veterinários beta + Ricardo / S0–S1;
- dependências: BLK-01-A;
- entrega: lote estratificado por módulo, risco e tipo, com pelo menos dois veterinários independentes por item e decisão clínica final autorizada;
- RED/GREEN/aceite: RED em item sem fonte/rubrica/risco; GREEN com concordância mínima de 90%, rework máximo de 20% e justificativa por decisão;
- rollback: congelar a calibração e reabrir o checklist anterior sem converter o lote em publicação.

### BLK-01-C — Executar revisão clínica em lotes de 40–60 por semana

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Clinical Ops + veterinários beta / S1–S9;
- dependências: BLK-01-B;
- entrega: decisões `APROVAR`, `RETRABALHAR` ou `REJEITAR` para os 763 itens, com revisor, data, versão, risco, conflito e justificativa;
- RED/GREEN/aceite: fila estrita permanece vermelha enquanto houver item liberável sem decisão; 763/763 decisões auditáveis e nenhum item sem estado final;
- rollback: retirar lote por versão, preservar decisão anterior e impedir autopublicação.

### BLK-01-D — QA clínico e preflight de liberação

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Clinical QA + QA / S8–S9;
- dependências: BLK-01-C;
- entrega: amostragem pós-beta por módulo, risco e tipo, comparação de decisões, preflight estrito e lista de afetados/rework;
- aceite/evidência: zero pendência clínica liberável, zero P0/P1 aberto, relatório assinado e `B-G1` candidato;
- rollback: reabrir lote defeituoso e retirar sua versão sem apagar o histórico.

### BLK-01-E — Relatório de eficácia e feedback do beta

- prioridade/status/owner/sprint: P1 / `WAITING_HUMAN_APPROVAL` / Product Analytics + Clinical / S9–S11;
- dependências: BLK-01-C, BLK-01-D e D-ENT-08;
- entrega: taxa de conclusão, concordância, rework, dificuldade, contestação e feedback agregado, sem ranking punitivo;
- aceite/evidência: anomalias triadas por humanos e plano aprovado; IA não altera conteúdo, nota ou publicação;
- rollback: suspender item/forma por versão e preservar tentativas e decisões históricas.

## 16.3 BLK-02 — IdP, MFA e recuperação reais

### BLK-02-A — Selecionar e provisionar IdP autorizado

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Security + Ricardo / S1–S2;
- dependências: D-ENT-02, tenant e contrato autorizados;
- entrega: IdP real em staging controlado, issuer, client, redirect allowlist, secret manager e contas de teste;
- aceite/evidência: readiness probe HTTPS, contrato de claims e acesso negado para configuração incompleta;
- rollback: desabilitar integração e revogar credenciais sem abrir fallback inseguro.

### BLK-02-B — Integrar login, papéis e step-up

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Backend + Security / S2–S4;
- dependências: BLK-02-A;
- entrega: OIDC/SAML conforme decisão, mapeamento deny-by-default, MFA obrigatório para papéis privilegiados e step-up para operações sensíveis;
- aceite/evidência: E2E real, testes de claim inválida, sessão revogada, escopo cruzado e CSRF;
- rollback: feature flag server-side para o fluxo anterior aprovado, sem bypass de autorização.

### BLK-02-C — Recovery, revogação e ciclo de vida

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Identity + Security / S3–S5;
- dependências: BLK-02-B;
- entrega: recovery de uso único, expiração, revogação de sessão, troca de fator e auditoria redigida;
- aceite/evidência: testes de replay, enumeração, token expirado, lockout e notificação segura;
- rollback: revogar tokens e retornar à configuração anterior sem recuperar segredo em texto claro.

### BLK-02-D — Prova externa e gate de identidade

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Security + auditor / S5–S7;
- dependências: BLK-02-A–C;
- entrega: dossier de probes, logs, matriz de papéis, evidência de MFA/recovery e `B-G2`;
- aceite/evidência: identidade real verificada no mesmo RC, sem dados de usuário real;
- rollback: bloquear release e preservar o RC não aprovado.

## 16.4 BLK-03 — DNS público e TLS gerenciado

### BLK-03-A — Provisionar DNS e certificado gerenciado

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + Security / S1–S3;
- dependências: D-ENT-03, domínio e conta autorizados;
- entrega: zona DNS controlada, certificado gerenciado, renovação automática e registros sem credencial embutida;
- aceite/evidência: cadeia certificada válida, expiração monitorada e origem pública registrada;
- rollback: retirar registro/certificado novo e manter origem anterior protegida.

### BLK-03-B — Publicar edge HTTPS e hardening

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + Security / S3–S5;
- dependências: BLK-03-A;
- entrega: HTTP→HTTPS, HSTS, headers, TLS aprovado e origem pública sem endpoint interno exposto;
- aceite/evidência: probes externos, teste de redirect, cipher/protocol policy e ausência de certificado interno;
- rollback: voltar ao digest/topologia anterior e remover DNS novo com change record.

### BLK-03-C — Probes, renovação e aceitação do edge

- prioridade/status/owner/sprint: P1 / `WAITING_HUMAN_APPROVAL` / SRE + auditor / S5–S7;
- dependências: BLK-03-B;
- entrega: monitor de disponibilidade, expiração/renovação, redirect e erro seguro;
- aceite/evidência: janela de observação aprovada e `B-G3` verde;
- rollback: desabilitar rota nova sem interromper a origem de contingência.

## 16.5 BLK-04 — Backup externo, retenção, RPO/RTO e DR

### BLK-04-A — Configurar storage externo e retenção

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + Database + Security / S2–S4;
- dependências: D-ENT-05, storage e KMS autorizados;
- entrega: bucket/contêiner externo, criptografia, retenção, lifecycle, RBAC e cadeia de custódia;
- aceite/evidência: política efetiva verificada por leitura, acesso negado testado e nenhum segredo no Git;
- rollback: suspender export e revogar a referência sem apagar a cópia anterior.

### BLK-04-B — Backup agendado e verificação de integridade

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Database + SRE / S3–S6;
- dependências: BLK-04-A;
- entrega: backup automático, checksum, manifest, retenção e alerta de falha;
- aceite/evidência: execução repetida, checksum consistente e métrica de idade do último backup;
- rollback: voltar ao job anterior e manter backup anterior íntegro.

### BLK-04-C — Restore e medição RPO/RTO

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Database + QA / S6–S9;
- dependências: BLK-04-B;
- entrega: restore isolado, validação de migrations, dados, contratos e jornada crítica;
- aceite/evidência: RPO ≤1h, RTO ≤4h medidos, teardown e relatório assinado;
- rollback: abortar retorno, manter ambiente anterior read-only e reconciliar antes de reabrir escrita.

### BLK-04-D — Drill de DR e retenção efetiva

- prioridade/status/owner/sprint: P1 / `WAITING_HUMAN_APPROVAL` / SRE + auditor / S9–S10;
- dependências: BLK-04-C;
- entrega: cenário de perda de nó/ambiente, restauração, reconciliação e confirmação da retenção;
- aceite/evidência: zero perda/duplicidade não explicada, RPO/RTO repetidos e `B-G4` verde;
- rollback: preservar o ambiente conhecido e bloquear release se o drill falhar.

## 16.6 BLK-05 — CI, registry, deploy e rollback

### BLK-05-A — Pipeline remoto de qualidade e segurança

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / QA + SRE + Security / S1–S4;
- dependências: D-ENT-06 e contrato CI;
- entrega: lint, typecheck, unit/application/contract/integration/worker/web/E2E/security, secrets, dependency audit e budgets;
- aceite/evidência: pipeline remoto reproduzível, artefatos retidos e falhas negativas verificadas;
- rollback: manter pipeline anterior até a nova cadeia passar em paralelo.

### BLK-05-B — Registry, digest, assinatura e SBOM

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + Security / S3–S6;
- dependências: BLK-05-A;
- entrega: imagem sem tag mutável como autoridade, digest imutável, SBOM, assinatura e scan;
- aceite/evidência: digest em release manifest, proveniência e retenção de artifact verificadas;
- rollback: selecionar digest anterior aprovado, nunca retaggear imagem não verificada.

### BLK-05-C — Deploy controlado e health gates

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE / S6–S8;
- dependências: BLK-05-B, BLK-03 e BLK-02;
- entrega: deploy por digest, migração controlada, canário/health check, observabilidade e autorização de promoção;
- aceite/evidência: runtime reporta digest esperado e nenhum secret/PII no log;
- rollback: abortar promoção e manter release anterior saudável.

### BLK-05-D — Rollback e release rehearsal

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + QA + auditor / S8–S10;
- dependências: BLK-05-C;
- entrega: ensaio de rollback por digest, migração compatível, comunicação e reconciliação pós-rollback;
- aceite/evidência: RTO de rollback medido, zero perda/duplicidade e `B-G5` candidato;
- rollback: o próprio procedimento deve interromper e voltar à versão anterior sem reset destrutivo.

## 16.7 BLK-06 — Worktree e runtime vinculados ao SHA

### BLK-06-A — Inventariar e revisar alterações do worktree

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / Tech Lead + QA / S0;
- dependências: autorização de revisão do diff;
- entrega: classificação de cada alteração em produto, teste, docs, infra, generated ou descarte explícito; scan de secrets e dados reais;
- aceite/evidência: lista reconciliada, `git diff --check`, nenhum arquivo desconhecido sem decisão;
- rollback: nenhuma remoção automática; preservar alteração do usuário e pedir decisão para alvo ambíguo.

### BLK-06-B — Criar commits intencionais e tag de release

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Ricardo + Tech Lead / S0/S12;
- dependências: BLK-06-A, BLK-05-A e change control;
- entrega: commits convencionais por escopo, tag/RC e worktree limpo;
- aceite/evidência: revisão independente do diff, SHA único e ausência de mudança não registrada;
- rollback: `git revert` intencional; proibidos reset destrutivo e descarte silencioso.

### BLK-06-C — Gerar imagem e manifest com SHA/digest

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + QA / S12;
- dependências: BLK-06-B e BLK-05-B;
- entrega: label de source SHA, digest, SBOM, migration set, config fingerprint e release manifest;
- aceite/evidência: manifest aponta para o mesmo commit, digest e artifact armazenados;
- rollback: preservar RC anterior e criar novo RC para qualquer correção.

### BLK-06-D — Provar runtime derivado do mesmo SHA

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + auditor / S12;
- dependências: BLK-06-C;
- entrega: probe de runtime, imagem, containers, web build e source manifest alinhados;
- aceite/evidência: zero divergência de SHA/digest/ambiente e `B-G6` verde;
- rollback: invalidar todo evidence pack divergente e reexecutar no RC correto.

## 16.8 BLK-07 — UAT, acessibilidade, performance, soak e DR

### BLK-07-A — UAT com dados sintéticos e turnos/dispositivos

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Product + QA + veterinários beta / S9–S11;
- dependências: BLK-01, jornada 09-A–E e D-ENT-08;
- entrega: roteiros de participante, autoria, administração, recuperação, interrupção e contestação em celular/desktop/turnos;
- aceite/evidência: 100% tarefas críticas concluídas ou findings P0/P1 fechados, consentimento e teardown;
- rollback: interromper a sessão, revogar contas sintéticas e manter o release anterior.

### BLK-07-B — Auditoria manual WCAG e screen reader

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / Accessibility + QA / S9–S11;
- dependências: 13-A/B, BLK-07-A;
- entrega: teclado, foco, contraste, zoom/reflow, labels, motion, NVDA/VoiceOver e findings por severidade;
- aceite/evidência: zero A/AA aberto nas jornadas P0 e cinco gaps manuais atuais fechados;
- rollback: feature flag para componente anterior acessível, preservando estado e histórico.

### BLK-07-C — Web Vitals reais e rede degradada

- prioridade/status/owner/sprint: P1 / `WAITING_HUMAN_APPROVAL` / Frontend + QA / S5–S10;
- dependências: 13-D e BLK-05-A;
- entrega: LCP, INP, CLS, bundle, rede lenta, offline/retry por dispositivo e viewport;
- aceite/evidência: budgets aprovados em RC, sem perda/duplicidade e artefato retido;
- rollback: reverter asset/chunk por digest sem alterar contratos.

### BLK-07-D — Soak 24h, failover e recuperação

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / SRE + QA / S10;
- dependências: BLK-03, BLK-04, BLK-05 e BLK-07-C;
- entrega: carga sustentada, restart, troca de réplica, degradação de dependência e recuperação;
- aceite/evidência: SLO aprovado, zero perda/duplicidade, telemetria contínua, RPO/RTO medidos;
- rollback: abortar no threshold, voltar ao digest/topologia anterior e abrir finding.

### BLK-07-E — Fechar findings e repetir UAT/DR

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / QA + auditor / S10–S11;
- dependências: BLK-07-A–D;
- entrega: reteste dos findings, relatório de aceite e `B-G7`;
- aceite/evidência: nenhum P0/P1 aberto e artefatos coerentes com o RC;
- rollback: manter release bloqueado e preservar evidência do teste falho.

## 16.9 BLK-08 — Rastreabilidade 145/145

### BLK-08-A — Fechar matriz de requisitos

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / QA + Product + Tech Lead / S1–S4;
- dependências: PRD/SPEC, `0491`, `traceability.yml` e backlog canônico;
- entrega: cada um dos 145 requisitos com owner, risco, task e critério de aceite;
- aceite/evidência: nenhum requisito sem path, nenhum requisito inventado e escopo reconciliado;
- rollback: reabrir linha divergente e registrar change record.

### BLK-08-B — Mapear módulo, contrato, teste e evidência

- prioridade/status/owner/sprint: P0 / `READY_FOR_NEXT_STEP` / QA + engenharia / S2–S9;
- dependências: BLK-08-A e execução das tasks;
- entrega: cadeia completa até teste, commit, artifact, timestamp, ambiente e teardown;
- aceite/evidência: verifier rejeita path ausente, teste genérico e artifact sem vínculo; meta 145/145;
- rollback: restaurar matriz anterior e manter gaps explícitos, nunca preencher com placeholders.

### BLK-08-C — Change control, release manifest e retenção

- prioridade/status/owner/sprint: P1 / `READY_FOR_NEXT_STEP` / Program + SRE / S4–S12;
- dependências: BLK-05-B/C e BLK-06-B/C;
- entrega: change request, risco, rollback, migration/flag, owner, artifact retention e manifest por sprint/RC;
- aceite/evidência: log, backlog, state, manifest e traceability apontam ao mesmo SHA;
- rollback: registrar reversão como novo change request e preservar o manifest anterior.

### BLK-08-D — Gate de completude e reauditoria independente

- prioridade/status/owner/sprint: P0 / `WAITING_HUMAN_APPROVAL` / QA + auditor independente / S12;
- dependências: BLK-01–BLK-08-C e B-G1…B-G7;
- entrega: `traceability` 145/145, evidence pack, relatório de gaps zero e reauditoria dos itens afetados;
- aceite/evidência: `B-G8` e `G-S80-9` verdes no mesmo SHA, sem promoção por média ou arredondamento;
- rollback: bloquear release, preservar RC falho e abrir correção em novo SHA.

## 16.10 Ordem de puxada

1. BLK-06-A e BLK-08-A: inventário do worktree e matriz de requisitos, sem commit destrutivo.
2. BLK-01-A e BLK-02-A/BLK-03-A/BLK-04-A: decisões, acessos e contratos externos.
3. BLK-01-B, BLK-05-A e BLK-07-A: calibração veterinária, pipeline e preparação de UAT.
4. BLK-01-C/D em paralelo com BLK-02-B/C, BLK-03-B/C, BLK-04-B/C e BLK-05-B/C.
5. BLK-07-B/C/D e BLK-08-B/C após os ambientes autorizados estarem disponíveis.
6. BLK-06-B/C/D e BLK-08-D somente no RC final, após todos os gates anteriores.

## 16.11 Condição final do backlog

O backlog não pode ser encerrado por documentação, intenção, smoke local ou beta parcial. O encerramento exige 763 decisões clínicas auditáveis, identidade/edge/backup/CI/deploy reais, runtime no SHA do RC, UAT e operação aprovados, 145/145 cadeias completas e reauditoria independente. Até lá, o estado é `WAITING_HUMAN_APPROVAL` e a disposição é `PILOT_BLOCKED`.

## 16.12 Snapshot operacional — fechamento dos elos locais — 2026-08-14T10:42:04-03:00

O lote local de `BLK-08-B` foi executado com TDD e evidência direta para os dez requisitos que ainda tinham gaps de módulo/contrato/teste/artefato: `RF-063`, `RF-072`, `RF-073`, `RF-093`, `RF-094`, `RNF-012`, `RNF-072`, `RNF-075`, `RNF-084` e `RNF-086`. A matriz agora registra `145/145` linhas com evidência local e `87/87` P0/P1; `0/145` cadeias completas permanece correto até haver commit/SHA e artefato de release no mesmo RC.

Entregas locais: recálculo determinístico com persistência PostgreSQL/RLS, atualização otimista, notificação transacional em outbox e reconhecimento no worker; painéis internos de moderador e administração com escopo server-side; estatística de item e anomalias para revisão humana; decisão de conflito de fontes; governança de IA operacional com confirmação humana e teto de custo; policy fail-closed e contrato Zod de janela de manutenção. Migrations `0024`–`0028` foram aplicadas no PostgreSQL local.

O lote não altera os estados de `BLK-01`–`BLK-07`, não fecha `BLK-06`/`BLK-08-C/D`, não promove score, release ou piloto e não substitui a revisão clínica dos 763 conteúdos. O recálculo está integrado localmente, mas a entrega clínica externa, UAT e produção ainda não foram exercitadas; a janela hospitalar requer horários aprovados. Evidência integral: `pnpm verify` com 161 arquivos/706 testes/18 skips e cobertura 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines.

## 16.13 Commit local e ensaio de rollback — 2026-08-14T11:02:00-03:00

O worktree foi limpo no commit local `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`, sem push. As 145 linhas da matriz estão ancoradas no SHA e não há `GAP:commit-pending` ou `GAP:worktree-sha-pending`. O ensaio local de release/deploy/rollback passou com release digest `sha256:8c3b2acd13236eefed6f5d639f133eb9e0dc28acd63fd4c861cb9d81d0684524`, rollback digest `sha256:cf03cb172580d36c7eecb1f706bbf1605c46f0377ca55061a2c1b870b27143dd` e runtime restaurado.

Esse resultado fecha somente a parte local de mudança/rollback. O backlog permanece `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED` até haver 763 decisões clínicas auditáveis, identidade/edge/backup/CI/deploy reais, UAT/operação aprovados, 145/145 cadeias em `VERIFIED`/`RELEASE_READY` e reauditoria independente.

## 16.14 Runtime RC ancorado e rollback local — 2026-08-14T11:15:28-03:00

O RC local foi reconstruído com source SHA `e3aff802fe7ec104917e8cc6aa77bb0aea4f6229` e `CVG_SOURCE_SHA` idêntico. API-A/API-B e worker-A/worker-B carregaram o digest comum `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`; o snapshot documental posterior foi consolidado em `1501070` sem alteração de código; migrations `29/29`, health live/dependencies `200/200`, proteção interna `401/401/401` e E2E HA `3/3` foram confirmados. O ensaio local passou `deploy=PASS`, `rollback=PASS` e `runtimeRestored=true`, com rollback sintético `sha256:76b84ecd58011cbbffca2594cd2ce75b23b7ab57e66ebc7ea384b8d30f7567a4`.

O backlog continua `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`: a prova local não substitui 763 decisões clínicas auditáveis, identidade/edge/backup/CI/deploy reais, UAT/operação aprovados, estado/release `VERIFIED`/`RELEASE_READY`, Web Vitals/soak/DR e reauditoria independente.

## 16.15 Probes operacionais locais — 2026-08-14T11:32:02-03:00

BLK-01 agora possui fila live confirmada para o beta: `796` conteúdos, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas. BLK-04 possui evidência local adicional: backup administrativo externo ao repositório, manifest/SHA válidos e restore isolado de `32` objetos com RTO observado `4583 ms`. BLK-07 possui carga local de `5000/5000` requests, concorrência `100` e p95 `300,56 ms`.

Essas evidências não fecham os gates: veterinários ainda precisam revisar, retenção externa/RPO/RTO produtivos não foram provados, IdP/DNS/TLS/CI/deploy/UAT/WCAG manual/Web Vitals/soak/DR permanecem abertos e `0/145` cadeias continuam corretas. Estado `WAITING_HUMAN_APPROVAL`; disposição `PILOT_BLOCKED`.
