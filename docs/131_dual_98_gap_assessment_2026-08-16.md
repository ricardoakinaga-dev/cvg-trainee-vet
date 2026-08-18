# Avaliação de gaps pós-U95 — programa Dual 98

> **Status:** fotografia pré-hardening, `SUPERSEDED_AS_ACTIVE_ASSESSMENT` por
> `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`. Baselines e
> achados históricos permanecem preservados; não usar este documento como
> estado corrente da execução.

- assessment_id: `DUAL98-GAP-ASSESSMENT-2026-08-16`
- corte técnico anterior ao plano: `2026-08-16T19:35:47-03:00`
- escopo: implementação local U95-003–114, testes, segurança, runtime, documentação e elegibilidade das duas rubricas
- disposição: `PILOT_BLOCKED`
- confiança: alta para código e gates locais reproduzidos; insuficiente para RC, produção, clínica, ambientes externos ou promoção de nota

## 1. Resultado executivo

A implementação local avançou materialmente e o relato do usuário é majoritariamente confirmado. O worktree, porém, já contém evidência até `U95-114`, não somente até `U95-106`. Esta avaliação considera o estado realmente presente.

As duas notas oficiais continuam independentes e congeladas:

| Trilha | Fonte congelada | Baseline | Itens ≥98 hoje | Meta de saída |
|---|---|---:|---:|---:|
| maturidade integral | `BRIEFING/04.AUDIT/0491_full_construction_audit.md` | `83,24/100` | `0/16` | `16/16 ≥98` |
| qualidade independente | `docs/116_code_quality_audit_2026-08-16.md` | `64,20/100` | `0/16` | `16/16 ≥98` |
| contrato Dual 98 | `0308` / `0516` / `0517` | sem média combinada | `0/32` | `32/32 ≥98` no mesmo RC |

Não existe promoção por média, quantidade de testes ou documentação local. A regra de `98` ainda não constava das rubricas congeladas; este documento define critérios de **elegibilidade propostos**, que precisam ser aceitos pelos responsáveis e aplicados por duas reauditorias independentes.

## 2. Evidência reproduzida

| Verificação | Resultado observado | Classificação |
|---|---|---|
| worktree antes deste pacote | `299`: `162` rastreadas/modificadas + `137` não rastreadas | `UNRELEASED` |
| worktree após os quatro artefatos Dual 98 | `303`: `162` rastreadas/modificadas + `141` não rastreadas | `UNRELEASED`; delta documental `+4` reconciliado |
| `pnpm verify` dentro do sandbox | `192` arquivos/`908` testes passaram; `13` falharam apenas por `listen EPERM 127.0.0.1` | `ENVIRONMENT_BLOCKED` |
| `pnpm verify` fora do sandbox | `194` arquivos/`921` testes passaram; `16` arquivos e `19` testes skipped pelo runner | `PASS_LOCAL` |
| cobertura | `90,73%` statements; `85,30%` branches; `93,70%` functions; `92,15%` lines | `PASS_LOCAL_WITH_98_GAP` |
| decisões críticas | `7/7`, branch coverage `100%` nos alvos declarados | `PASS_LOCAL` |
| matriz P0/P1 | success `87/87`; error `63/87`; denied `26/87`; conflict `36/87`; completas `11/87` | `PASS_WITH_GAPS` |
| skips/flakes | policy: `16` arquivos/`18` testes, `3/20` execuções observadas; runner: `19` testes skipped | `PASS_WITH_GAPS` e contagem a reconciliar |
| hotspots | `0` arquivos >800; `151` funções >50; `22` >100; máximo `128` | `PASS_WITH_DEBT_RATCHET` |
| build | `12/12` workspaces com `CVG_API_INTERNAL_URL` explícita | `PASS_LOCAL` |
| dependências de produção | `pnpm audit --prod --audit-level high`: nenhuma vulnerabilidade conhecida | `PASS_LOCAL_CURRENT_ADVISORY` |
| rastreabilidade | `145` requisitos inventariados; `0/145` cadeias completas | `PASS_WITH_GAPS` |

O primeiro `pnpm build` falhou fechado porque a URL interna obrigatória da API não estava definida. A repetição com valor local sintético explícito passou; isso confirma o contrato de configuração, não um ambiente produtivo.

## 3. Veredito sobre U95-003 e U95-101–114

| Task | Veredito | O que foi confirmado | Limite que impede 98 |
|---|---|---|---|
| `U95-003` | `PASS_LOCAL_WITH_CONTROL_GAP` | snapshot `221→299`, delta `78` classificado; nenhuma promoção/commit | scanner de segredos passa por construção lexical; worktree continua não imutável |
| `U95-101` | `PASS_LOCAL_WITH_GAPS` | HELP/TYPE agrupados, nomes `_total`/`seconds`, múltiplas séries e parser local | colisões após normalização/sufixo podem duplicar família; p95 é gauge local, não histograma distribuível |
| `U95-102` | `PASS_LOCAL_WITH_EXTERNAL_GAPS` | cinco targets `up`, sete rules saudáveis, Alertmanager e ciclo interno | não há alerta `up/absent`, receiver/on-call externo nem retenção/ack real |
| `U95-103` | `PARTIAL` | composição produtiva usa uma transação para review/publication, decisão, outbox e idempotência | transação ainda é opcional; retry HTTP não preserva chave; TTL/concurrency/payload de idempotência incompletos |
| `U95-104` | `PARTIAL` | publicação exige o ID corrente e rejeita ausência/divergência/rotação | não revalida conta/papel/escopo ativo; rotação deixa conteúdo aprovado sem caminho de reaprovação |
| `U95-105` | `PASS_PREVIOUS_LIVE_EVIDENCE` | fixture contém aprovador designado e caso negativo | suíte PostgreSQL live ficou guardada na reprodução corrente; precisa rodar no RC |
| `U95-106` | `PARTIAL` | deploy/rollback rejeitam API/worker ausente, parado ou unhealthy | readiness do worker é latch; um snapshot saudável basta; não há heartbeat/consumo sintético estável |
| `U95-107` | `BLOCKED` | SHA/digest/probes foram reforçados localmente | não há rollback entre duas versões imutáveis e compatíveis com o health contract |
| `U95-108` | `IN_PROGRESS` | inventário de `87` requisitos existe | somente `11/87` linhas têm quatro provas completas |
| `U95-109` | `IN_PROGRESS` | zero arquivos >800 e ratchet executável | `151` funções >50, `22` >100, máximo `128` |
| `U95-110–113` | `PASS_LOCAL_WITH_SCOPE_GAPS` | contratos, tipos, API, persistência e estados web melhoraram | matchers/contratos residuais, operação externa e produto integral permanecem |
| `U95-114` | `IN_PROGRESS` | cobertura atual honesta; Chromium/Firefox/mobile `81/81`; ativo HA `3/3` local | WebKit `27/27` bloqueado; ativo HA não pertence a RC; mutation/fault/flake window incompletos |

Conclusão: as correções originais são reais, mas `COMPLETED local` não equivale a controle sustentado ou elegibilidade de score. Nenhum item recebe nova nota nesta rodada.

## 4. Achados novos da revisão

Nenhum `CRITICAL` ou segredo real foi confirmado. Os achados abaixo precisam entrar no caminho crítico.

| ID | Sev. | Achado | Impacto | Saída mínima |
|---|---|---|---|---|
| `D98-H01` | alta | `verify:secrets` cobre apenas três regex/dez extensões e os fixtures fragmentados demonstram bypass | verde cria falsa garantia de ausência de segredo | scanner dedicado; staged+history; entropia/provedores/URI/JWT; allowlist focal; regressões positivas e negativas |
| `D98-H02` | alta | idempotência autoral não chega ao HTTP; request ID muda a cada retry | commit com resposta perdida pode virar conflito, não replay | `Idempotency-Key` validada; chave/fingerprint estáveis; teste HTTP concorrente/timeout/replay |
| `D98-H03` | alta | aprovador suspenso/sem papel ainda pode sustentar aprovação; rotação não tem fluxo de recuperação | publicação indevida ou conteúdo preso sem transição auditável | revalidar conta/papel/escopo na transação; revogar/reabrir/reaprovar por máquina de estados |
| `D98-H04` | alta | worker marca ready uma vez e deploy aceita snapshot único | worker travado pode permitir promoção | readiness por heartbeat/dependências; janela estável A/B; evento sintético claim→ack antes da promoção |
| `D98-H05` | alta | rules não alertam `up==0`, ausência de séries ou desconexão do Alertmanager | perda de scrape pode ficar invisível com rules `health=ok` | alertas de ausência/target; watchdog/dead-man; teste de perda de scrape e rota externa |
| `D98-H06` | alta | troca de senha aceita apenas a nova senha, sem senha atual, MFA ou autenticação recente | sessão roubada pode tomar a conta e revogar a vítima | step-up/current-password; expiração de autenticação; cookie revogado limpo; E2E negativo |
| `D98-M01` | média | TTL é gravado, mas não filtrado/purgado; response/fingerprint duplicam payload interno em JSONB sem RLS | retenção indefinida, replay expirado e maior superfície de dados | TTL real/purge; payload mínimo; hash do fingerprint; RLS/grants/FK; parser de schema |
| `D98-M02` | média | duas transações podem inserir a mesma chave; transaction port continua opcional | PK pode vazar como erro e caller futuro reabre atomicidade | transação obrigatória; lock/upsert/releitura; same-key concorrente |
| `D98-M03` | média | normalização Prometheus pode colidir e PromQL usa `clamp_min(...,1)` | payload inválido ou SLO distorcido em baixo tráfego | agrupamento pelo nome final, rejeição de colisão e razão com guarda de denominador zero |
| `D98-M04` | média | `/health/dependencies` público e sem rate limit chama dependências | amplificação de carga e exposição operacional | readiness barata; diagnóstico interno autenticado, limitado e cacheado |
| `D98-M05` | média | token de convite continua na URL/histórico | exposição em histórico, screenshot ou telemetria do navegador | capturar e remover query com `history.replaceState` antes da chamada |
| `D98-M06` | média | sessão rotacionada pode renovar indefinidamente | sessão persistente sem reautenticação absoluta | `originalIssuedAt/absoluteExpiresAt` e step-up no limite |
| `D98-M07` | média | policy de skips declara `18`, mas o runner reporta `19`; somente `3/20` rodadas observadas | governança não mede integralmente o denominador real | reconciliar descoberta, zerar skip relevante no RC e completar janela de 20 execuções |

## 5. Matriz de elegibilidade — maturidade integral

As notas abaixo são a baseline congelada. A última coluna é o contrato proposto para candidatura a `98`, não uma nota nova.

| ID | Item | Base | Gap dominante | Condição objetiva proposta para 98 |
|---|---|---:|---|---|
| `M1` | documentação, gates e governança | 90 | fonte/estado local e aprovações externas | zero conflito ou link inválido; todos os tasks com owner/validade/evidência; pacote assinado; duas verificações sem drift |
| `M2` | Discovery, PRD e escopo | 95 | métricas, UAT, B-07 e aceite real | 100% dos requisitos essenciais aceitos por papel; métricas PRD medidas; deferred aprovado; zero scope drift em dois ciclos |
| `M3` | currículo e conteúdo clínico | 72 | `763` pendentes, calibração e B-07 | 24/96/B-07 aprovados; calibração dupla; 763 decisões item a item; fila liberável zero; QA pós-revisão sem erro material |
| `M4` | arquitetura e modularidade | 92 | funções longas, matchers e mesmo failure domain | zero função >100; zero crítica >50; fonte canônica de rota; fitness tests; capacidade/falha multi-host e revisão independente |
| `M5` | domínio, contratos e regras | 88 | risco `11/87` e lifecycle incompleto | `87/87` aplicáveis; decisões críticas completas; model/property tests; mutation sem sobrevivente crítico; zero P1/P2 não aceito |
| `M6` | persistência e integridade | 90 | TTL/RLS autoral, offsite/PITR/DR | concorrência/fault sem write parcial; políticas/grants/retention; dois restores; `RPO≤1h`, `RTO≤4h` |
| `M7` | API e backend | 82 | superfícies e negativos incompletos | 100% rota→schema→authz→handler→erro→telemetria em fonte executável; zero órfão; fuzz/negativos P0/P1; SLO no RC |
| `M8` | segurança, identidade e privacidade | 86 | step-up, revogação, IdP/TLS e assurance | provider real; MFA/recovery/step-up/revogação/rotação; SAST/SCA/DAST/pentest sem P0/P1 ou P2 não aceito |
| `M9` | jornada do participante | 75 | ciclo 24 meses, correção/recurso e UAT | todos os fluxos críticos desktop/mobile e falhas/retomada; 100% tarefas críticas e ≥98% total em UAT; zero severo |
| `M10` | autoria e governança clínica | 68 | idempotência HTTP, rotação e fila humana | atomicidade obrigatória; replay externo; segregação; 763 decisões; trilha imutável e QA independente |
| `M11` | worker, Qdrant, IA e resiliência | 88 | readiness, crash/replay/backpressure/soak | matriz integral; heartbeat; zero perda/duplicidade; convergência; IA fail-safe; soak ≥24h e recovery no SLO |
| `M12` | observabilidade e operação | 78 | ausência de targets, baixo tráfego e operação externa | 100% serviços/SLOs; zero/<1/alto tráfego correto; duas rotas alerta→on-call→ack→resolve; MTTx e retenção aprovados |
| `M13` | web, UX e acessibilidade | 78 | WebKit, WCAG manual, UAT e RUM | Chromium/Firefox/WebKit/mobile; WCAG 2.2 AA, teclado/SR/zoom; UAT; RUM p75 LCP≤2,5s, INP≤200ms, CLS≤0,1 |
| `M14` | testes, cobertura e evidência | 93 | 11/87, skips, mutation e RC | global ≥95% statements/functions/lines e ≥90% branches; camada crítica ≥95%; `87/87`; mutation; zero skip/flake relevante |
| `M15` | CI e reprodutibilidade | 86 | RC, rollback versionado e supply chain | clean CI duas vezes; SHA↔digest↔SBOM↔attestation assinada; registry; deploy/rollback distinto e saudável |
| `M16` | rastreabilidade e mudança | 65 | `0/145` e worktree local | `145/145` sem placeholder até commit/digest/artefato; zero drift/link quebrado; pacote retido e reprodução independente |

## 6. Matriz de elegibilidade — qualidade independente

| ID | Item | Base | Gap dominante | Condição objetiva proposta para 98 |
|---|---|---:|---|---|
| `Q1` | documentação e governança | 78 | snapshots/supersessões e worktree | todo documento CURRENT/HISTORICAL/SUPERSEDED; geração/verificação automatizada; zero fato divergente; auditoria documental do RC |
| `Q2` | aderência ao PRD | 75 | métricas/UAT/produto integral | 100% essenciais ligados a implementação, teste, métrica e aceite; zero redução não aprovada |
| `Q3` | aderência à SPEC | 85 | externo, segurança, DR e release | todas as cláusulas aplicáveis no mesmo RC; divergência via ADR; fault/capacidade/operação executados; zero mismatch material |
| `Q4` | arquitetura e boundaries | 84 | funções, matchers e single-host | zero ciclo/import proibido; roots/dispatchers pequenos; fitness completo; acoplamento/failure domains revisados |
| `Q5` | manutenibilidade e complexidade | 52 | `151` >50; `22` >100 | zero >100; zero crítica >50; restantes >50 justificadas sem exceção temporária; complexidade/duplicação com ratchet por dois ciclos |
| `Q6` | type safety, imutabilidade e legibilidade | 84 | casts/assertions e contratos locais residuais | zero `any`/double cast/assertion insegura em produção; schemas canônicos; unions exaustivas; type tests em boundaries |
| `Q7` | API, contratos e validação | 86 | múltiplas fontes e negativos | fonte única executável para request/response/error/authz/telemetria; zero órfão; fuzz/negativos e compatibilidade completos |
| `Q8` | erros e resiliência | 48 | fault matrix e retry externo | todas as boundaries sob fault; zero hang/unhandled/write parcial/retry inseguro; erros tipados/sanitizados; chaos/soak repetidos |
| `Q9` | persistência e integridade | 70 | idempotência, retenção e DR | isolamento/atomicidade/RLS/idempotência 100%; dois restores; PITR/offsite; RPO/RTO no mesmo RC |
| `Q10` | segurança, privacidade e acesso | 68 | scanner, step-up/revogação, IdP e pentest | threat/privacy review; scanner forte; provider real; revogação/rotação; zero P0/P1 e P2 não aceito em SAST/SCA/DAST/pentest |
| `Q11` | frontend, UX, a11y e performance | 65 | WebKit/WCAG/UAT/RUM | quatro projetos verdes; WCAG/SR; todas as jornadas; Vitals dentro do alvo; UAT ≥98% e 100% crítico; zero Sev1/2 |
| `Q12` | testes, cobertura e E2E | 70 | risco/skips/mutation/RC | pisos de M14; `87/87`; mutation crítico; 20 execuções sem flake; E2E ativo cross-browser no RC |
| `Q13` | runtime e HA | 46 | readiness/RC/multi-host/soak | RC imutável; readiness real; failover nó/zona; rollback versionado; soak ≥24h; duas rodadas chaos/recovery |
| `Q14` | observabilidade, backup e DR | 40 | alvo ausente, externo, PITR e RPO/RTO | telemetria correlacionada/RBAC; loss-of-signal; duas rotas on-call; dois drills offsite/PITR; RPO/RTO cumpridos |
| `Q15` | CI, reprodutibilidade e release | 47 | CI/registry/assinatura/rollback | CI limpo duas vezes no SHA; SBOM/attestation/assinatura; deploy/canário/rollback no alvo; auditor reproduz |
| `Q16` | rastreabilidade e proveniência | 42 | `0/145`, 299 entradas e nenhum RC | worktree limpo; `145/145`; SHA alcançável; artefatos content-addressed; zero link inválido; reprodução independente |

## 7. Ordem de ataque

1. corrigir `D98-H01–H06` e fechar U95-107–116 sem criar waiver material;
2. completar `87/87`, reduzir hotspots, fortalecer coverage/mutation/skips e executar WebKit;
3. formar RC-alpha limpo, assinado e com rollback entre versões;
4. executar identidade, CI/registry, telemetria/on-call, backup/PITR/DR e HA externos;
5. completar produto e revisão clínica humana;
6. congelar o RC final, completar `145/145` e repetir todos os controles duas vezes;
7. submeter as duas matrizes a auditores independentes; somente eles podem alterar as notas.

## 8. Decisão

O plano Dual 95 fica preservado como histórico/evidência antecedente e é absorvido pelo overlay Dual 98. O planejamento documental está `COMPLETED`; a execução segue `BLOCKED`/`PILOT_BLOCKED` por achados altos, RC inexistente, WebKit, `0/145`, fila clínica e dependências externas/humanas.
