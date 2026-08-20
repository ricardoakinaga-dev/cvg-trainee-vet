# 0306 — Plano executivo de remediação da auditoria de qualidade 2026-08-16

> **Overlay histórico absorvido:** este plano preserva a resposta inicial à baseline `64,20/100`, mas não é mais a fonte executiva de estado. A execução das duas rubricas e os achados pós-S4-173 são coordenados por `0307_dual_95_executive_program.md`, roadmap `../04.AUDIT/0514_dual_95_roadmap.md` e backlog `../04.AUDIT/0515_dual_95_backlog.md`.

## 1. Mandato

Este plano é o overlay executável da auditoria independente `docs/116_code_quality_audit_2026-08-16.md`. Ele não substitui a baseline histórica do programa `0304` nem reescreve as evidências anteriores. Seu objetivo é elevar **cada um dos 16 itens da auditoria atual para pelo menos 95/100**, com comportamento implementado, teste reproduzível, evidência no mesmo SHA e reauditoria independente.

Nenhuma nota será promovida por intenção, documentação isolada, média ponderada ou ausência de erro observado. Enquanto existir finding P1, cadeia incompleta, gate externo não executado ou divergência de SHA/ambiente, a disposição permanece `PILOT_BLOCKED`.

Fontes: `docs/116_code_quality_audit_2026-08-16.md`, `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`, `BRIEFING/03.BUILD/0300_build_engineer_master.md`, `BRIEFING/04.AUDIT/0491_full_construction_audit.md`, `BRIEFING/04.AUDIT/0512_code_quality_95_roadmap.md` e `BRIEFING/04.AUDIT/0513_code_quality_95_backlog.md`.

## 2. Baseline auditada e contrato de saída

| # | Item da auditoria | Peso | Nota atual | Meta | Principal evidência de saída |
|---:|---|---:|---:|---:|---|
| 1 | Documentação e governança | 3% | 78 | ≥95 | registro canônico sem supersessão ambígua, pesos reconciliados, snapshots etiquetados e gates reproduzíveis |
| 2 | Aderência ao PRD | 3% | 75 | ≥95 | matriz PRD→jornada→aceite→teste→runtime com métricas e UAT aplicável |
| 3 | Aderência à SPEC | 4% | 85 | ≥95 | matriz SPEC→módulo→contrato→operação sem divergência e revalidação do runtime |
| 4 | Arquitetura e boundaries | 7% | 84 | ≥95 | grafo acíclico, inventário ligado aos handlers e composition roots sem concentração crítica |
| 5 | Manutenibilidade e complexidade | 9% | 52 | ≥95 | ratchet executável, hotspots abaixo do limite acordado ou decomposição concluída, funções críticas <50 linhas |
| 6 | Type safety e imutabilidade | 7% | 84 | ≥95 | zero cast inseguro nas fronteiras, contratos compartilhados, typecheck e testes de imutabilidade |
| 7 | API, contratos e validação | 6% | 86 | ≥95 | uma fonte de rotas, schemas/erros uniformes, validação negativa e autorização server-side |
| 8 | Tratamento de erros | 6% | 48 | ≥95 | ciclo HTTP completo protegido, resposta terminal segura, logs sanitizados e zero rejeição não tratada |
| 9 | Persistência e integridade | 6% | 70 | ≥95 | transações tipadas, auditoria contextual, restore com invariantes e testes de concorrência |
| 10 | Segurança e controle de acesso | 10% | 68 | ≥95 | aprovador fail-closed, sessões revogadas, step-up, OTLP/containers endurecidos e rate limit correto |
| 11 | Frontend, UX e acessibilidade | 6% | 65 | ≥95 | logout/papéis/retomada, WCAG 2.2 AA manual, mobile/cross-browser e estados de erro completos |
| 12 | Testes, cobertura e E2E | 9% | 70 | ≥95 | E2E canônico verde, cobertura por camada incluindo web/scripts e matriz P0/P1 100% completa |
| 13 | Runtime e HA | 5% | 46 | ≥95 | proveniência Git válida, readiness no tráfego, canário version-aware, failover/soak medidos |
| 14 | Observabilidade, backup e DR | 5% | 40 | ≥95 | regras/Alertmanager ativos, workers visíveis, retenção, backup offsite, restore, RPO/RTO e drills |
| 15 | CI, reprodutibilidade e release | 7% | 47 | ≥95 | CI remoto verde, SBOM/proveniência, artefato por digest, deploy progressivo e rollback verificável |
| 16 | Rastreabilidade e proveniência | 7% | 42 | ≥95 | 145/145 cadeias requisito→SPEC→task→módulo→contrato→teste→commit→artefato |

**Regra de aceite:** o objetivo só é alcançado quando os 16 itens forem avaliados independentemente com nota ≥95 no mesmo RC, sem P0/P1, com `completeChains=145/145`, gates clínicos/humanos/externos aplicáveis executados e disposição liberada por decisão humana registrada.

## 3. Frentes executivas

| Frente | Itens | Resultado executivo |
|---|---|---|
| F1 — Evidência e governança | 1, 2, 3, 16 | baseline, pesos, snapshots e cadeias reconciliados; nenhuma evidência sem SHA/artefato |
| F2 — Plataforma e resiliência | 4, 5, 6, 7, 8, 9 | módulos coesos, contratos únicos, erros terminais, transações e diagnóstico confiáveis |
| F3 — Segurança e acesso | 10 | autorização fail-closed, sessão atualizada, hardening e abuso controlado |
| F4 — Experiência | 11 | fluxos completos, responsivos, acessíveis e testados por papel/navegador |
| F5 — Qualidade | 12 | testes de risco completos, E2E canônico e cobertura honesta por superfície |
| F6 — Operação | 13, 14, 15 | runtime atribuível, observável, recuperável e liberável |

## 4. Estratégia e ordem de execução

1. **Congelar baseline e planejar:** manter o relatório, capturar o estado inicial e registrar o overlay sem alterar notas históricas.
2. **Remediar P1 local em TDD:** `AUD-CQ-001`–`AUD-CQ-010`, começando por proveniência, autorização clínica, sessão, request lifecycle e E2E canônico.
3. **Fechar operação local:** readiness, alertas, workers, canário, OTLP, container hardening e rate limit por principal.
4. **Eliminar gaps de qualidade:** decomposição incremental, cobertura por superfície, matriz de decisão crítica, frontend e documentação.
5. **Executar dependências externas/humanas:** CI remoto, IdP/MFA, DNS/TLS, backup/DR, UAT, acessibilidade manual, soak e revisão clínica; sem fabricar evidência.
6. **Congelar RC e reauditar:** mesmo commit, digest, ambiente, logs e artefatos; qualquer drift invalida a evidência afetada.

Cada task usa `RED → GREEN → REFACTOR → REVIEW → AUDIT`, com rollback explícito e atualização do estado, log, backlog e manifesto de rastreabilidade.

## 5. Critérios de governança

- PostgreSQL continua fonte transacional; Qdrant é derivado e reconstruível; IA permanece assistiva e desligável.
- Autorização é server-side, deny-by-default e fail-closed; o frontend nunca decide papel, aprovação ou publicação.
- Dados de teste, logs e documentação usam apenas dados sintéticos/minimizados; não entram fontes, PDFs, fotos, prontuários, tutores ou segredos.
- A cobertura agregada ≥80% é piso; decisões críticas P0/P1 exigem 100% de sucesso, erro, negado e conflito quando aplicável.
- Todo artefato de release precisa de SHA Git existente/alcançável, digest, ambiente, timestamp, teardown e vínculo de rastreabilidade.
- Gates externos/humanos ausentes são `WAITING_HUMAN_APPROVAL` ou `NOT_EXECUTED`, nunca `PASS`.

## 6. Recursos, dependências e risco

Trabalho local seguro pode avançar sem aprovar fornecedor, deploy ou conteúdo clínico. O caminho externo depende de equipe/T0, aprovador clínico, IdP/MFA, storage/backup, registry/deploy, DNS/TLS, usuários representativos e auditor independente. A indisponibilidade dessas dependências desloca o roadmap; não reduz a meta de 95 nem autoriza promoção parcial.

Riscos principais: evidência em SHA divergente, revisão clínica insuficiente, automação mascarando barreiras de UX, falsa cobertura por escopo omitido, canário sondando réplica antiga, restauração sem invariantes e pressão para alterar pesos. Respostas: freeze de RC, gates fail-closed, ratchet, amostragem manual, testes negativos e registro de change control.

## 7. Definition of Done executiva

- [ ] `AUD-CQ-001`–`AUD-CQ-014` concluídos com teste e evidência local.
- [ ] `AUD-CQ-015` concluído apenas com ambiente, autorização e evidência externa reais.
- [ ] `pnpm verify`, build, E2E canônico, integração live, segurança, cobertura por camada, `git diff --check` e verificadores operacionais passam.
- [ ] nenhum P0/P1, nenhum segredo/dado proibido, nenhum erro não tratado e nenhum link documental quebrado.
- [ ] 145/145 cadeias completas no mesmo SHA/artefato; worktree e release manifest coerentes.
- [ ] CI/registry/deploy/rollback, IdP, backup/DR, UAT, WCAG, soak e revisão clínica têm evidência adequada ao escopo.
- [ ] auditor independente registra ≥95/100 em cada um dos 16 itens; Ricardo registra go/no-go.

Enquanto algum checkbox estiver aberto, o estado é `IN_PROGRESS` para trabalho local ou `WAITING_HUMAN_APPROVAL` para dependência externa, e a disposição continua `PILOT_BLOCKED`.
