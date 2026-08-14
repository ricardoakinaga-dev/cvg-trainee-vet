# 0305 — Plano executivo dos itens abaixo de 80 para elegibilidade 95

## 1. Mandato

Este documento é um recorte executivo suplementar do programa `0304`. Ele atua **somente** nos seis itens cuja nota oficial no `0491` é inferior a 80/100 e reutiliza as tasks canônicas do `0493`; não cria um segundo backlog concorrente, não reabre itens com nota igual ou superior a 80 e não altera a baseline auditada.

O objetivo é tornar cada um dos itens 3, 9, 10, 12, 13 e 16 **elegível a 95/100**, mediante implementação, prova em runtime autorizado, fechamento dos critérios de saída e reauditoria independente no mesmo SHA. Planejamento, código local ou evidência parcial não promovem nota.

Fontes obrigatórias: `0304_premium_enterprise_95_program.md`, `0491_full_construction_audit.md`, `0492_score_95_roadmap.md`, `0493_score_95_backlog.md`, `docs/99_runtime_state.md`, `docs/20_master_execution_log.md` e `traceability.yml`.

## 2. Baseline congelada e efeito esperado

| Item | Dimensão | Nota atual | Alvo | Gap | Peso | Ganho ponderado máximo |
|---:|---|---:|---:|---:|---:|---:|
| 3 | currículo e conteúdo clínico | 72 | 95 | 23 | 10% | 2,30 |
| 9 | jornada do participante | 75 | 95 | 20 | 8% | 1,60 |
| 10 | autoria, revisão e governança clínica | 68 | 95 | 27 | 8% | 2,16 |
| 12 | observabilidade e operação | 78 | 95 | 17 | 6% | 1,02 |
| 13 | web, UX e acessibilidade | 78 | 95 | 17 | 6% | 1,02 |
| 16 | rastreabilidade e controle de mudanças | 65 | 95 | 30 | 4% | 1,20 |
| **Total do recorte** | **6 itens / 42% do score** | — | **95 por item** | — | **42%** | **9,30** |

A baseline global oficial permanece **83,24/100**. Se — e somente se — a reauditoria conceder exatamente 95 aos seis itens e mantiver todas as outras notas, a projeção global será **92,54/100**. A declaração “programa inteiro ≥95” está fora deste recorte.

Snapshot das 29 tasks reutilizadas: **3 `COMPLETED`, 3 `IN_PROGRESS`, 12 `READY_FOR_NEXT_STEP` e 11 `WAITING_HUMAN_APPROVAL`**. As três concluídas são fundações já verificadas, não aceite dos itens.

## 3. Resultado executivo contratado

O programa termina quando todos os resultados abaixo coexistirem:

1. os seis itens recebem nota ≥95 em reauditoria independente;
2. cada critério de saída possui evidência verificável ligada ao mesmo SHA, ambiente e release candidate;
3. não existe finding P0/P1, pendência clínica liberável, cadeia de rastreabilidade incompleta ou evidência de ambiente divergente;
4. worktree, tag, digest, CI, SBOM, release manifest e relatório de auditoria apontam para o mesmo commit;
5. a disposição deixa de ser `PILOT_BLOCKED` apenas por decisão humana registrada após G-S80-9.

Até lá, o estado oficial é `WAITING_HUMAN_APPROVAL` e a disposição é `PILOT_BLOCKED`.

## 4. Estratégia de execução

### 4.1. WS-CLINICAL-CONTENT — item 3

- usar o inventário já concluído para priorizar risco e criticidade;
- calibrar 25 itens antes de escalar a produção;
- completar 24 módulos/96 sessões e revisar os 763 itens em lotes de 40–60 por semana;
- validar o blueprint B-07 sem caráter punitivo;
- medir eficácia no piloto, com anomalia apenas sinalizando revisão humana.

Saída: conteúdo estruturalmente completo, clinicamente decidido, reproduzível e sem autopublicação.

### 4.2. WS-PARTICIPANT-JOURNEY — item 9

- implementar diagnóstico, perfil e trilha recomendada;
- fechar avaliação, resultado, remediação, retenção D+30/60/90 e contestação;
- integrar os estados ao progresso de 24 meses já existente;
- executar UAT em celular, desktop e contexto 12x36 com dados sintéticos e consentimento.

Saída: jornada integral do convite ao histórico, com isolamento, retomada e próxima ação determinística.

### 4.3. WS-CLINICAL-GOVERNANCE — item 10

- conservar o workflow editorial atômico já concluído;
- compartilhar a fábrica de 763 decisões com o item 3, sem duplicar fila ou estado;
- fechar correção, recurso, anulação, recálculo, validade e retirada emergencial;
- executar QA editorial independente e amostragem pós-publicação.

Saída: corpus com decisão humana, versionamento, retirada segura e trilha append-only.

### 4.4. WS-OPERATIONS — item 12

- provisionar telemetria externa redigida, retenção, RBAC e consulta correlacionada;
- completar SLOs, dashboards e alertas com acknowledgement e ruído medidos;
- provar backup/restore, RPO ≤1h e RTO ≤4h em ambiente autorizado;
- executar dois drills, soak de 24h e failover sem perda ou duplicidade.

Saída: operação observável, recuperável e ensaiada, sem declarar SLO/RPO/RTO antes da medição.

### 4.5. WS-EXPERIENCE — item 13

- completar design system, estados e superfícies das jornadas P0;
- ampliar axe/Playwright já verdes com checklist manual WCAG 2.2 AA;
- testar NVDA/VoiceOver e usuários representativos;
- validar budgets de LCP/INP/CLS, rede lenta, retry e preservação de resposta.

Saída: experiência consistente e demonstravelmente acessível, sem tratar automação como conformidade completa.

### 4.6. WS-EVIDENCE-CONTROL — item 16

- fechar alterações em commits intencionais após autorização e revisão do diff;
- completar requirement→SPEC→task→module→contract→test→commit→artifact para 100% do escopo P0/P1;
- manter change record e release manifest por incremento;
- congelar RC e reauditar sem drift de SHA ou ambiente.

Saída: evidência imutável, reprodutível e suficiente para decisão independente.

## 5. Organização e capacidade

### 5.1. Célula mínima protegida

| Papel | Capacidade de planejamento | Responsabilidade no recorte |
|---|---:|---|
| Product/Program | 1,0 FTE | sequência, escopo, decisões, UAT e gates |
| Backend/Domain | 2,0 FTE | jornada, governança, eventos e contratos |
| Frontend | 1,5 FTE | jornada, design system, acessibilidade e performance |
| QA/Automation | 2,0 FTE | TDD, integração, E2E, evidência e regressão |
| SRE/Security | 1,5 FTE | telemetria, DR, drills, soak, RC e segurança |
| Content/Instructional Design | 1,5 FTE | módulos, sessões, pré-revisão e rework |
| Ricardo/Clinical approver | 12 h/semana protegidas | calibração e decisão independente |
| Accessibility/UX research | 1,0 FTE nas S9–S11 | checklist manual, screen reader e UAT |
| Auditor independente | 0,25 FTE, maior em S12 | critérios, amostragem e nota final |

O manifesto executável reserva envelope de até 8 FTE de núcleo, 3,5 FTE especialistas e 20% de contingência. A capacidade clínica planejada é 50 itens/semana, faixa aceitável 40–60. A 50/semana, 763 decisões exigem aproximadamente 15,3 semanas antes de rework; por isso a fábrica clínica inicia após G-S80-1 e permanece no caminho crítico até S9.

### 5.2. Orçamento paramétrico

Enquanto `D-ENT-09` não registrar rates e teto, não existe valor financeiro aprovado. O forecast deve usar:

`custo = Σ(dias por papel × rate aprovado) + infraestrutura autorizada + 20% de contingência`

O steering atualiza consumo, previsão para concluir e variação semanalmente. Nenhuma contratação, fornecedor ou gasto externo é autorizado por este documento.

## 6. Fases e horizonte

| Fase | Semanas relativas | Sprints | Objetivo | Gate de saída |
|---|---|---|---|---|
| P-S80-0 | 0–1 | S0 | mobilizar, congelar recorte, owners, T0 e capacidade | G-S80-0 |
| P-S80-1 | 1–5 | S1–S2 | fundações de evidência, operação, design e calibração | G-S80-1 |
| P-S80-2 | 1–19 | S1–S9 | fábrica curricular e governança clínica | G-S80-3 |
| P-S80-3 | 5–13 | S3–S6 | jornada integral e experiência | G-S80-2 |
| P-S80-4 | 13–19 | S7–S9 | telemetria externa, DR e resiliência | G-S80-4 |
| P-S80-5 | 19–23 | S10–S11 | acessibilidade manual, UAT, soak e piloto | G-S80-7 |
| P-S80-6 | 23–24 | S12 | RC, SHA imutável e reauditoria | G-S80-9 |

T0 ocorre somente após G-S80-0. Atraso em decisão externa desloca o calendário; não comprime revisão clínica, soak, UAT ou reauditoria.

## 7. Gates decisórios

| Gate | Decisão binária | Bloqueia se |
|---|---|---|
| G-S80-0 | scope/capacity ready | D-ENT-01/07/09 sem decisão, owner ou capacidade ausente |
| G-S80-1 | clinical calibration ready | lote de 25 sem concordância, checklist ou throughput |
| G-S80-2 | participant journey ready | 09-A–D incompletas ou P0/P1 técnico aberto |
| G-S80-3 | clinical release ready | 24/96 inválidos, pendência clínica ou B-07 sem aceite |
| G-S80-4 | operations ready | telemetria/retention/DR/drills/soak/failover sem prova externa |
| G-S80-5 | accessibility ready | WCAG manual, screen reader ou usuário representativo pendente |
| G-S80-6 | traceability ready | cadeia P0/P1, artifact ou path incompleto |
| G-S80-7 | UAT/pilot ready | coorte sem autorização ou finding P0/P1 |
| G-S80-8 | RC ready | CI, SHA, tag, digest, SBOM ou rollback divergente |
| G-S80-9 | independent re-audit passed | qualquer um dos seis itens abaixo de 95 |

## 8. Caminho crítico e paralelismo

O caminho clínico é G-S80-0 → 03-B → 03-D/10-B → 03-E → 09-A/09-C. O caminho humano de experiência é 09-A/09-C → 13-B → 13-C → UAT. O caminho externo é D-ENT-04/05 → 12-A/12-C → 12-D/12-E. Os três convergem em G-S80-7 → 16-A/16-B → 16-D → G-S80-9.

Podem avançar em paralelo, sem fingir fechamento de gate: 03-C, 10-C/D, 09-A/C/D, 13-A/D, 12-B/D/E e 16-B/C. Uma task dependente de ambiente ou decisão humana permanece `WAITING_HUMAN_APPROVAL` até a evidência real existir.

## 9. Modelo de execução e qualidade

Cada task segue `RED → GREEN → REFACTOR → REVIEW → AUDIT`:

1. registrar requisito, risco, owner, dependência e teste que falha;
2. implementar a menor fatia vertical;
3. executar unit, application, contract, integration, worker, web, E2E e security conforme risco;
4. manter cobertura global ≥80% e decisão crítica integral;
5. revisar segurança, privacidade, autorização server-side e rollback;
6. anexar evidência redigida ao SHA; atualizar backlog, log, runtime e `traceability.yml`;
7. somente auditor independente altera nota no `0491` ou sucessor canônico.

WIP máximo: três tasks de engenharia e um lote clínico simultâneos. Falha P0/P1 interrompe entrada de nova task no workstream afetado.

## 10. Riscos e respostas

| Risco | Indicador precoce | Resposta | Owner |
|---|---|---|---|
| capacidade clínica abaixo de 40 itens/semana | backlog cresce por duas semanas | reduzir WIP, ampliar pré-revisão, replanejar sem reduzir independência | Content + Ricardo |
| rework clínico >20% | lote retorna repetidamente | recalibrar checklist e amostra antes do próximo lote | Clinical lead |
| D-ENT-04/05 atrasadas | S7 inicia sem backend/storage | manter mocks locais apenas como prova parcial e escalar decisão | SRE + Program |
| jornada cresce além do PRD | RF/RNF novo sem decisão | bloquear scope creep e abrir change request | Product |
| automação mascara barreira | axe verde e checklist manual vermelho | manter item 13 aberto e corrigir por severidade | Accessibility |
| evidência deriva do RC | SHA/ambiente divergente | invalidar evidência afetada e reexecutar gate | QA + Auditor |
| pressão para promover nota | critério incompleto com pedido de aceite | preservar baseline e registrar exceção rejeitada | Auditor |

## 11. Governança e cadência

- daily de 15 minutos por workstream;
- triagem clínica duas vezes por semana;
- review de sprint com demonstração e evidência, não apresentação narrativa;
- steering semanal para decisões, capacidade, custo, risco e caminho crítico;
- auditoria de sprint independente do autor para P0;
- rebaseline apenas por change record aprovado, sem alterar retrospectivamente evidência.

KPIs: throughput/rework clínico, módulos/sessões válidos, tarefas críticas UAT, findings P0/P1, cobertura WCAG manual, success/latency/error, MTTD/MTTA/MTTR, RPO/RTO, completude de rastreabilidade, lead time e variação de capacidade.

## 12. Decisões requeridas para iniciar T0

Ricardo precisa registrar: equipe/T0 (`D-ENT-01`), 12 h/semana e 40–60 itens (`D-ENT-07`), rates/teto (`D-ENT-09`). Antes dos gates posteriores também são obrigatórios telemetria (`D-ENT-04`), backup (`D-ENT-05`), deploy/rollback (`D-ENT-06`) e piloto (`D-ENT-08`).

Enquanto essas decisões não forem tomadas, o plano está completo e executável no que é local, mas o programa permanece `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`.

## 13. Artefatos de controle

- manifesto executável: `sub80-to-95-program.json`;
- gate: `scripts/verify-sub80-to-95-program.mjs`;
- teste: `tests/integration/sub80-to-95-program.test.ts`;
- roadmap: `BRIEFING/04.AUDIT/0510_sub80_to_95_roadmap.md`;
- backlog filtrado: `BRIEFING/04.AUDIT/0511_sub80_to_95_backlog.md`.

Este documento não substitui os canônicos `0304/0491/0492/0493`; é a visão executiva estrita do recorte sub-80.

## 14. Execução local registrada — 2026-08-12

Foram executadas duas fatias verticais sem alterar score, release ou critérios humanos:

- `ENT95-10-D`: validade editorial persistida (`valid_until`/`next_review_at`), expiração autorizada e idempotente, evento de retirada e composição no worker; migration 0018 e artefato `PREMIUM-ENTERPRISE-95-CONTENT-LIFECYCLE-062`.
- `ENT95-13-D`: budgets de bundle/LCP/INP/CLS/retry, medição sintética por viewport/rede e gaps manuais versionados; artefato `PREMIUM-ENTERPRISE-95-WEB-PERF-063`.

A cadeia passou com 126 arquivos/575 testes/18 skips condicionais, cobertura 86,52/82,53/87,31/87,28, build 12 workspaces e E2E HA 3/3. As tasks continuam `READY_FOR_NEXT_STEP` até scheduler/dashboard/drill autorizado, Web Vitals/CI/RC, UAT, SHA e reauditoria; o programa permanece `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`.

## 15. Execução local — jornada, contestação e correção — 2026-08-12

Foi executada a fatia local correspondente a `ENT95-09-A`, `ENT95-09-C`, `ENT95-09-D` e `ENT95-10-C` por meio de um gate de evidência dedicado. O manifesto valida quatro invariantes, quatro evidências sintéticas PASS, paths de domínio/aplicação/contrato/persistência/API, owner/scope boundary e cinco gaps: DB/RLS live autorizado, UAT representativo, SLA/alerta, comunicação clínica de afetados e proveniência por SHA.

RED reproduziu a ausência do verificador; GREEN passou 2/2 no teste focal e `pnpm verify:journey-correction-governance`. A bateria focal passou 33/35, com as duas integrações live condicionais mantidas como skips governados. O artifact `PREMIUM-ENTERPRISE-95-JOURNEY-CORRECTION-065` foi ligado ao `traceability.yml`.

Essa execução não altera baseline 83,24, notas, status das 29 tasks, release ou gates humanos. O programa segue `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED`.

## 16. Verificação final da rodada — 2026-08-12

`pnpm verify` passou com 127 arquivos/577 testes/18 skips e cobertura 86,53/82,52/87,31/87,28. Build dos 12 workspaces, E2E HA 3/3, audit de dependências e `git diff --check` passaram. O worktree continua sem commit intencional; baseline 83,24, status `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED` permanecem, pois a evidência externa/humana do backlog ainda não existe.

## 17. Addendum executivo — resolução dos oito bloqueios — 2026-08-14

Este addendum transforma os bloqueios do relatório `docs/112_current_construction_report_2026-08-14.md` em uma frente de execução única. Ele complementa o programa `0304` e não promove nota, fecha task ou libera release por documentação.

### 17.1 Resultado contratado

O programa só será considerado satisfatório quando os oito gates abaixo estiverem verdes no mesmo release candidate, sem P0/P1 aberto, com rollback ensaiado, evidência redigida e reauditoria independente:

| ID | Bloqueio | Resultado obrigatório | Gate |
|---|---|---|---|
| BLK-01 | 763 conteúdos | beta clínico controlado com veterinários autorizados, 763 decisões registradas e fila liberável zerada | B-G1 |
| BLK-02 | IdP/MFA/recovery | tenant autorizado, login real, MFA privilegiado, recovery de uso único, revogação e auditoria | B-G2 |
| BLK-03 | DNS/TLS | DNS público controlado, certificado gerenciado, HTTPS público, redirect, renovação e probes externos | B-G3 |
| BLK-04 | backup/RPO/RTO | backup externo criptografado, retenção aplicada, restore íntegro, RPO ≤1h e RTO ≤4h medidos | B-G4 |
| BLK-05 | CI/registry/deploy/rollback | pipeline remoto verde, imagem imutável com SBOM, deploy controlado e rollback pelo digest anterior | B-G5 |
| BLK-06 | SHA/runtime | worktree revisado e limpo, SHA/tag/digest/manifest alinhados e runtime comprovadamente derivado do mesmo SHA | B-G6 |
| BLK-07 | UAT/UX/operação | UAT autorizado, WCAG manual, screen reader, Web Vitals reais, soak de 24h e DR/failover aprovados | B-G7 |
| BLK-08 | rastreabilidade | 145/145 cadeias requisito→SPEC→task→módulo→contrato→teste→commit→artefato completas | B-G8 |

### 17.2 Beta clínico com veterinários

A revisão dos 763 conteúdos será executada como beta clínico controlado, com veterinários autorizados e sem dados de pacientes, tutores, prontuários, fotos ou casos identificáveis.

- Antes da escala, um lote de 25 itens será revisado por pelo menos dois veterinários independentes e pelo aprovador clínico definido em `D-ENT-07`.
- A coorte beta operacional, a lista nominal de revisores, os conflitos de interesse, o horário protegido e a autorização de ambiente serão registrados em `D-ENT-07`/`D-ENT-08`; o plano recomenda 5–10 veterinários revisores, sem presumir contratação antes da decisão humana.
- Cada item terá decisão explícita `APROVAR`, `RETRABALHAR` ou `REJEITAR`, com revisor, data, versão, justificativa, risco e eventual conflito. A IA pode auxiliar a triagem, mas não decide, publica ou altera estado.
- O fluxo será em lotes de 40–60 decisões por semana. O lote de calibração exige concordância mínima de 90% e rework máximo de 20%; abaixo desses limites, a equipe recalibra antes de continuar.
- Conteúdo sem decisão clínica permanece fora da publicação. Rejeição ou retrabalho cria nova versão e preserva a decisão anterior.
- O beta só fecha quando os 763 itens tiverem decisão auditável, nenhum P0/P1 clínico estiver aberto, o preflight estrito estiver verde e a amostra pós-revisão estiver aprovada.

### 17.3 Critério comum de execução

Cada task do addendum seguirá `RED → GREEN → REFACTOR → REVIEW → AUDIT`, com teste proporcional, segurança, evidência no mesmo SHA, rollback e atualização de `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md` e `traceability.yml`. Qualquer ambiente externo indisponível mantém a task em `WAITING_HUMAN_APPROVAL`; nenhuma evidência sintética será apresentada como produção.

### 17.4 Dependências humanas

O início do T0 continua condicionado a `D-ENT-01` (equipe), `D-ENT-07` (capacidade clínica/revisores veterinários) e `D-ENT-09` (rates/teto). `D-ENT-02`/IdP, `D-ENT-04`/telemetria, `D-ENT-05`/backup, `D-ENT-06`/deploy e `D-ENT-08`/coorte beta serão gates posteriores. A existência dessa dependência não autoriza simular o resultado.

### 17.5 Definição de conclusão

O objetivo não é apenas reduzir a lista de gaps: é produzir evidência auditável suficiente para a reauditoria. Enquanto qualquer BLK-01…BLK-08 estiver vermelho, a baseline 83,24 permanece, o programa fica `WAITING_HUMAN_APPROVAL` e a disposição fica `PILOT_BLOCKED`.

## 17.6 Checkpoint operacional — 2026-08-14T11:32:02-03:00

Preparação local comprovada: fila clínica live `796/763` (total/pendentes), `0` falhas técnicas; carga `5000/5000` com p95 `300,56 ms`; backup/restore isolado com artefato verificado, `32` objetos e RTO observado `4583 ms`. O beta com veterinários, retenção externa, IdP, DNS/TLS, CI/registry/deploy, UAT, soak/DR e reauditoria continuam dependentes de decisões e ambientes externos. Nenhum gate foi promovido.

## 17.7 Checkpoint de CI remoto — 2026-08-14T11:38:12-03:00

O PR `#1` falhou nos runs `quality` porque o checkout remoto não possui os três PDFs licenciados exigidos pelo pré-voo de fontes. A ação planejada é provisionar bundle privado/licenciado e acesso CI read-only, mantendo hash-check e a proibição de versionar PDFs. O plano não considera o CI fechado até um run remoto verde no RC publicado.

## 17.8 Inventário de infraestrutura remota — 2026-08-14T11:42:45-03:00

O inventário read-only do GitHub não encontrou secrets, variables, environments ou deployments configurados; somente o workflow `quality` está listado. O plano permanece dependente de provedor/licença para o bundle de fontes, credencial CI read-only, registry imutável, ambiente de deploy e rollback por digest. Nenhuma alteração remota foi executada.

## 17.9 RC validado no SHA executável e rollback local — 2026-08-14T11:57:48-03:00

O runtime foi reconstruído e revalidado no SHA executável `8cf40e567d02149b9f5714c8b1084b60bd291426`, com digest `sha256:aa5dc1b767745734f92b10359bb35920b6ab2096ed7cc5c6ce4927e592ad92bb`; quatro processos HA carregaram a mesma revisão, health passou `200/200`, E2E HA `3/3` e o ensaio local passou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`. O rollback sintético foi `sha256:32a8b4dfca1e383354b439cb9118229ea4dcd3824c33496efee30d10af81d5a4`.

Este checkpoint fecha somente a evidência local de `HEAD → imagem → runtime → rollback`. Não promove score, release ou gate: `83,24/100`, `completeChains=0/145`, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED` permanecem até os gates externos, clínicos, humanos e a reauditoria independente.

## 17.10 Inventário do Hostinger candidato — 2026-08-14T12:17:30-03:00

O Hostinger foi inspecionado sem escrita. Caddy, 80/443 e certificados públicos de outros produtos estão operacionais, mas o host não possui projeto, imagem, container, route ou FQDN do Trainee Vet. Os backups observados são locais e de outro serviço; não há ferramenta/agendamento de backup externo do produto.

Decisão de execução: tratar o Hostinger apenas como candidato até Ricardo aprovar alvo, domínio, IdP, registry/CI, storage, retenção, janela e rollback. O plano mantém BLK-02/03/04/05/07 e B-G2/B-G3/B-G4/B-G5/B-G7 abertos; nenhuma operação remota será inferida a partir da infraestrutura de outros produtos.

## 17.11 RC atual e recuperação local — 2026-08-14T12:46:44-03:00

O RC local foi reconstruído no source SHA `16dcc2afda04866b1ecfaeb6017fe30bdadaa8be`, digest `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`. E2E web sintético `25/25`, E2E HA `3/3`, failover `500/500` com uma réplica parada, restore live `2/2` e RTO local direto `3.832 ms` passaram. Isso fortalece BLK-06-D localmente, mas não avança B-G1/B-G2/B-G3/B-G4/B-G5/B-G7/B-G8: o beta clínico, identidade real, edge público, backup externo, CI/deploy remoto, UAT manual, Web Vitals reais, soak, DR e reauditoria continuam sem evidência autorizada. O plano mantém baseline `83,24/100`, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED`.

## 17.12 Verificação integral pós-registro — 2026-08-14T12:51:24-03:00

`pnpm verify` passou com `161` arquivos/`706` testes/`18` skips e cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`; contratos `81/81`, worker `24/24`, migrations `29/29`, documentação, fontes clínicas locais, segurança e governanças passaram. O resultado confirma apenas a consistência local; os oito gates e a reauditoria continuam condicionados a decisões e ambientes autorizados.

## 17.13 Web Vitals e carga delimitada — 2026-08-14T13:00:56-03:00

Foi medida a aplicação no Chromium local em mobile/desktop, com LCP `232/172 ms`, CLS `0/0`, INP proxy `120/144 ms` e HTTP 200. Uma carga delimitada de `20.000` requests a concorrência `50` passou com p95 `119,82 ms` e 100% de sucesso. Isso fortalece BLK-07 localmente; não fecha RUM público, UAT manual, soak de 24 horas, SLO ou DR.

## 17.14 Reconsulta do CI remoto — 2026-08-14T13:07:52-03:00

O PR `#1` continua aberto no head remoto antigo `d3964a9…`; os checks `quality` falham e o repositório não possui secrets, variables, environments ou deployments. O plano mantém BLK-05/B-G5 aberto até bundle licenciado, CI verde no RC, registry, deploy e rollback por digest serem provisionados e autorizados.

## 17.15 Contrato local para bundle clínico privado — 2026-08-14T13:18:25-03:00

Foi implementado o contrato de materialização segura do bundle: `CVG_CLINICAL_SOURCES_DIRECTORY` é opcional, mas quando usado exige caminho absoluto fora do repositório; nomes de arquivo são basenames e traversal falha. O workflow expõe `vars.CVG_CLINICAL_SOURCES_DIRECTORY`, mantendo PDFs fora do Git e de artefatos públicos.

RED/GREEN passou `11/11`, `verify:ci-contract` e `verify:clinical-sources` localmente. Isso reduz o risco de integração do B-G5, mas não fecha o gate: ainda faltam provedor/licença, bundle, credencial read-only, retenção e run remoto verde no RC. Baseline `83,24/100`, `0/145`, `WAITING_HUMAN_APPROVAL` e `PILOT_BLOCKED` permanecem.

A mudança foi consolidada no commit local `9bfa2c1`, sem push.

## 17.16 Checkpoint live da fila clínica — 2026-08-14T13:39:26-03:00

O runtime HA local foi revalidado com health `200/200/200`, HA/edge verdes e leitura somente leitura da fila clínica: `796` conteúdos, `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas. O modo estrito falhou de forma esperada enquanto houver pendências, impedindo publicação automática.

Este checkpoint confirma a prontidão técnica do beta com veterinários e não encerra BLK-01. O próximo passo é Ricardo aprovar roster, capacidade, T0 e ambiente; em seguida executar calibração, lotes de revisão, rework e preflight final, mantendo os itens sem decisão fora da publicação.

## 17.17 Correção de proveniência após rehearsal — 2026-08-14T13:51:47-03:00

O rehearsal local foi auditado após sua execução e revelou que havia restaurado `cvg-trainee-vet:local` com `CVG_SOURCE_SHA=unknown`. O drift foi corrigido antes de qualquer promoção: a imagem `cvg-trainee-vet:rc-head-2e7a96b39c60` foi reconstruída do HEAD `2e7a96b39c60139fc0bd0c642fb77800f5c6c00a`, com digest `sha256:6d0d64b722a45d307ea36b9bbfbb4946b3ba4d0e2d0255e00e3aebb610898e27`.

Os quatro processos HA reportam o mesmo SHA/digest e health `200/200/200`; HA/edge passaram. Isso fortalece BLK-06 localmente e mantém o gate fail-closed, mas não converte ensaio local em CI/registry/deploy/rollback produtivos nem fecha `0/145`, pois o estado/release ainda não foi aprovado.

## 17.18 Guardas de SHA no rehearsal — 2026-08-14T14:04:54-03:00

O rehearsal agora falha antes de alterar o runtime quando `CVG_SOURCE_SHA` está ausente, inválido ou não corresponde ao label OCI da imagem. A restauração usa `image@digest`; RED/GREEN passou `6/6` e o rehearsal real passou deploy, rollback e restauração no commit executável `e70d3f4`.

O RC local final está alinhado no SHA `e70d3f415f38a5443a059c9800d023f95949957f`, digest `sha256:63ac637774932b127f584745fda236bdc99a61c0a6a4c8ac12ca675ee7b6597c`, com os quatro processos HA e health `200/200/200`. BLK-06 local foi fortalecido; os gates externos e `0/145` permanecem abertos.

## 17.19 Reconsulta do CI remoto — 2026-08-14T14:09:16-03:00

O GitHub permanece sem capacidade de promoção: PR `#1` aberto no head remoto antigo, checks `quality` falhos e `0` secrets/variables/environments/deployments. O plano mantém BLK-05/B-G5 bloqueado até haver bundle clínico licenciado, runner/variáveis autorizadas, registry, deploy e rollback produtivos no RC `e70d3f4`.

## 17.20 Gate de proveniência do runtime — 2026-08-14T14:24:40-03:00

Foi implementado o gate reutilizável `scripts/verify-runtime-provenance.mjs` com TDD (`6/6`). Uma recriação por tag mutável foi rejeitada; o rehearsal local restaurou por digest e passou deploy, rollback e restauração. O RC executável atual é `be43fc8f7f410435a40550eb70e9b2a700882355`, digest `sha256:0ec956ffa267fd4534feaaf1000bd85adbacab77ce105775ea15a4af20b73fcf`, quatro processos HA alinhados e health `200/200/200`.

Esse marco reforça BLK-06-D somente no ambiente local e mantém BLK-01/BLK-05, gates externos, clínicos, UAT, operação e `0/145` abertos. Próximo passo: provisionar os ambientes autorizados e reauditar exatamente este RC.

## 17.21 Diagnóstico do CI remoto — 2026-08-14T14:38:49-03:00

O run remoto confirmou a causa de BLK-05: o head `d3964a9…` falha em `verify:clinical-sources` porque o checkout não possui os três PDFs licenciados. A correção local de `CVG_CLINICAL_SOURCES_DIRECTORY` já está pronta em `9bfa2c1`, mas o repositório não possui secrets, variables, environments ou deployments e o RC `be43fc8f` não foi publicado.

O plano não transforma esse diagnóstico em fechamento. A saída exige decisão de provider/licença, bundle privado, credencial read-only, autorização de push, run verde no mesmo RC, registry imutável, deploy/rollback por digest e reauditoria.

## 17.22 Revalidação live do edge — 2026-08-14T14:53:34-03:00

O Compose com `.env.local` confirmou a topologia local saudável e `60/60` probes HTTP readiness `200`; HTTPS local respondeu `200` com o hostname `localhost`, mas usa a autoridade interna do Caddy. Logs ainda mostram falhas transitórias de DNS Docker e `503` durante health checks, portanto o plano classifica o edge como `PARTIAL` e exige investigação controlada antes de promoção. DNS público, CA gerenciada, IdP, backup e demais gates externos continuam condicionados a autorização e provisionamento.

## 17.23 Reancoragem do RC no SHA executável atual — 2026-08-14T15:03:15-03:00

O RC foi reconstruído no source SHA `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa`. O rehearsal local passou `deploy`, `rollback` e `runtimeRestored=true`, com release digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b` e rollback sintético `sha256:b293b4235e2c2b614bfeec1887a509dbf0d1dcbb51d55344ba591f72a144ebc9`.

O gate de proveniência pós-restauração confirmou os quatro containers no mesmo digest/SHA; Compose, health `200/200/200`, HA e edge security passaram. Isso encerra somente a evidência local de BLK-06. O plano mantém `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED`: edge público, CI/registry/deploy/rollback produtivos, IdP/MFA, backup externo, revisão veterinária, UAT, WCAG manual, Web Vitals reais, soak/DR e `0/145` continuam abertos.

## 17.24 Verificação integral pós-reancoragem — 2026-08-14T15:10:35-03:00

`pnpm verify` passou com `163` arquivos/`719` testes/`18` skips e cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`; contratos `81/81`, worker `24/24`, migrations `29/29`, lint, typecheck, secrets, governanças, arquitetura, documentação, produto e fronteira pública passaram. A proveniência do RC continuou PASS no source SHA `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa` e digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b`.

A verificação confirma qualidade local, mas não promove `0/145`, revisão clínica, CI/registry/deploy/rollback produtivos, identidade, edge público, backup, UAT, performance real, soak, DR ou reauditoria.

## 17.25 Rechecagem do beta clínico e CI remoto — 2026-08-14T15:16:10-03:00

O código local está pronto para a revisão beta com veterinários: fila escopada/paginada, `CLINICAL_APPROVER`, decisão persistida, interface de autoria e gate de publicação antes da aprovação, sustentados por `c7a591b` e `8670def`. A evidência live ainda mostra `763` pendências; nenhuma revisão humana foi simulada ou inferida.

O PR remoto permanece no head antigo `d3964a9e…`; os checks falham por ausência do bundle licenciado e o repositório continua sem secrets, variables, environments ou deployments. O plano mantém `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED` até autorização do beta, bundle/runner, push e infraestrutura de promoção.

## 17.26 E2E focal do beta local — 2026-08-14T15:21:52-03:00

O build web com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182` passou e o Playwright passou `2/2` em `tests/e2e/authoring-review.spec.ts` contra o web local ativo. A evidência comprova a superfície técnica de autoria/revisão e publicação condicionada; não executa a revisão veterinária dos `763` itens nem fecha os gates externos.

## 17.27 Rechecagem do RC local vigente — 2026-08-14T15:27:56-03:00

Após corrigir a âncora do relatório, os verificadores condicionais foram executados com flags explícitas. A proveniência passou nos quatro containers no source SHA `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa` e digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b`; HA, edge estático, fontes clínicas, rastreabilidade premium e `git diff --check` passaram; health local retornou `200` nas três superfícies e no HTTPS local.

O plano permanece fail-closed: isso confirma somente o RC local. Não promove revisão humana, `0/145`, CI/registry/deploy/rollback produtivos, IdP/MFA, DNS/TLS público, backup/RPO/RTO, UAT, WCAG manual, Web Vitals reais, soak, DR ou reauditoria.

## 17.28 Histerese do edge e reancoragem do RC — 2026-08-14T15:47:15-03:00

O diagnóstico de logs revelou falhas transitórias do resolver Docker durante os health-checks do Caddy. O plano aplicou TDD no contrato de edge: RED sem proteção, GREEN com `health_fails 3`, `health_passes 2` e `lb_try_duration 5s`, Caddy validate, `pnpm verify` verde e E2E HA `3/3`.

O RC foi reconstruído no SHA `8859c6c1ae1f11ff9a0ae55f79027469aaf21ee6`, digest `sha256:e5d9d7a2c6673f5988919a3708f8f7816aea97989fac8c0bf7b681f318f22b94`; rehearsal deploy/rollback/restauração passou. O plano fecha somente a lacuna local de resiliência; mantém os gates externos/humanos e `0/145` abertos.

## 17.29 Verificação integral final do RC do edge — 2026-08-14T15:51:33-03:00

`git diff --check` e `pnpm verify` passaram no RC do edge: `163` arquivos/`720` testes/`18` skips, cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`, contratos `81/81`, worker `24/24`, migrations `29/29`, lint, typecheck, secrets e governanças verdes; E2E HA `3/3` e proveniência no SHA `8859c6c1ae1f11ff9a0ae55f79027469aaf21ee6` também passaram.

O plano mantém `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED`: o resultado não substitui revisão clínica, CI/registry/deploy/rollback externo, IdP/MFA, DNS/TLS público, backup/RPO/RTO, UAT, WCAG manual, Web Vitals reais, soak, DR ou reauditoria.

## 17.30 Rechecagem read-only do CI remoto — 2026-08-14T15:57:52-03:00

Os dois runs `quality` remotos continuam falhando em `verify:clinical-sources` no head `d3964a9e…`, pela ausência das três fontes licenciadas. A correção de boundary para `CVG_CLINICAL_SOURCES_DIRECTORY` permanece local e o worktree está limpo; não houve push/dispatch. O plano mantém `WAITING_HUMAN_APPROVAL`/`PILOT_BLOCKED` até bundle/licença, variável autorizada e publicação do mesmo RC.
