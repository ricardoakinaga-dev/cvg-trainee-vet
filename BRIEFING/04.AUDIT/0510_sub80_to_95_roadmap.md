# 0510 — Roadmap executivo dos itens abaixo de 80 para elegibilidade 95

## 1. Propósito e regra de calendário

Este roadmap operacionaliza o `0305` em 13 janelas de sprint, S0–S12, ao longo de 24 semanas. S0 e S12 têm uma semana; S1–S11 têm duas. O calendário é relativo a T0 porque `D-ENT-01`, `D-ENT-07` e `D-ENT-09` continuam humanos. Datas reais só podem ser registradas após G-S80-0; atraso de dependência desloca o marco sem comprimir revisão clínica, UAT, soak ou auditoria.

Escopo exclusivo: itens **3, 9, 10, 12, 13 e 16**. Tasks externas ao recorte podem aparecer apenas como dependência. Notas oficiais continuam 72, 75, 68, 78, 78 e 65 até reauditoria independente.

## 2. Linhas de execução

| Linha | Itens | Objetivo | Owner executivo | Indicador de fluxo |
|---|---|---|---|---|
| L1 — fábrica clínica | 3 e 10 | 24 módulos, 96 sessões, 763 decisões, B-07 e QA | Content/Clinical | 40–60 decisões/semana; rework ≤20% |
| L2 — jornada | 9 | diagnóstico ao histórico/UAT | Product/Full-stack | E2E crítico verde; zero P0/P1 |
| L3 — operação | 12 | telemetria, SLO, DR, drills, soak/failover | SRE/Security | RPO ≤1h; RTO ≤4h; soak 24h |
| L4 — experiência | 13 | design, WCAG manual, screen reader, performance | UX/Accessibility | 100% jornada P0 auditada; zero A/AA |
| L5 — evidência | 16 | SHA, cadeias completas, change/release e reauditoria | QA/Tech Lead | 100% P0/P1 completo; zero drift |

## 3. Sequência de 24 semanas

| Sprint | Semanas | Compromisso do recorte | Prova de saída | Gate/marco |
|---|---:|---|---|---|
| S0 | 0–1 | decidir T0/capacidade; executar 03-B; preparar fechamento intencional de 16-A | ata D-ENT-01/07/09; lote 25; diff revisado | G-S80-0 e G-S80-1 |
| S1 | 1–3 | iniciar 03-C/D, 10-B, 16-B/C; inventariar superfícies 13-A | primeiro lote clínico; verificador de módulos; delta de cadeias | M1 fábrica estável |
| S2 | 3–5 | continuar fábrica; concluir fundações de estado/design; critérios de correção | throughput/rework; component tests; RED de 10-C | M2 capacidade validada |
| S3 | 5–7 | construir 09-A; iniciar 03-E; avançar 13-A e 16-B | diagnóstico persistente; blueprint parcial; estados web | incremento jornada 1 |
| S4 | 7–9 | concluir 09-A; integrar progresso 09-B; continuar 03-C/D/E | E2E diagnóstico→trilha; módulo/sessão válidos | jornada diagnóstico |
| S5 | 9–11 | implementar 09-C/D e 10-C; continuar decisões clínicas | E2E avaliação/remediação/recurso; tentativa imutável | incremento jornada 2 |
| S6 | 11–13 | concluir 09-C/D e B-07; estabilizar jornada integral | E2E convite→histórico; cobertura blueprint | G-S80-2 parcial |
| S7 | 13–15 | provisionar 12-A; avançar 12-B; implementar 10-D | consulta externa correlacionada; retirada idempotente | operação externa ativa |
| S8 | 15–17 | executar 12-C; finalizar módulos/sessões; continuar 16-B/C | restore medido; 24/96 válidos; matriz sem paths falsos | DR medido |
| S9 | 17–19 | zerar 03-D/10-B; executar 10-E; iniciar 12-D e 13-B manual | fila release zero; QA editorial; findings WCAG | G-S80-3 |
| S10 | 19–21 | concluir 12-D; executar 12-E e 13-B/D; iniciar 09-E/13-C | segundo drill; soak/failover; checklist WCAG | G-S80-4 e G-S80-5 |
| S11 | 21–23 | concluir UAT 09-E, usuários 13-C, eficácia 03-F e piloto autorizado | UAT/piloto sem P0/P1; relatório de eficácia | G-S80-7 |
| S12 | 23–24 | concluir 16-A/B/C; congelar RC e executar 16-D | SHA/tag/digest/SBOM/CI/rollback/auditoria coerentes | G-S80-6/8/9 |

S0 e S12 são janelas de uma semana. S12 não absorve trabalho clínico, operacional ou de acessibilidade atrasado. Se qualquer gate anterior estiver vermelho, S12 não inicia.

## 4. Roadmap por item

### Item 3 — 72 → elegível a 95

| Marco | Sprint | Medida | Critério para avançar |
|---|---|---|---|
| inventário fechado | concluído | 24 módulos, 96 sessões, 796 registros | contagens e criticidade consistentes |
| calibração | S0 | 25 itens estratificados | checklist aceito; concordância/rework medidos |
| produção e revisão | S1–S9 | 40–60 decisões/semana | zero pendência de release e 24/96 válidos |
| B-07 | S3–S6 | 120 itens/3 blocos | cobertura/equivalência/exposição aprovadas |
| eficácia | S11 | dificuldade, discriminação, distratores, contestação, retenção | anomalias triadas por humano |

### Item 9 — 75 → elegível a 95

| Marco | Sprint | Medida | Critério para avançar |
|---|---|---|---|
| diagnóstico/trilha | S3–S4 | três blocos, pausa/retomada, perfil | E2E sem nota punitiva |
| avaliação/remediação | S5–S6 | duas tentativas e D+30/60/90 | invariantes e E2E verdes |
| contestação/histórico | S5–S7 | SLA, revisão independente, owner scope | acesso cruzado e decisão sem justificativa falham |
| UAT | S10–S11 | tarefas críticas por dispositivo/turno | 100% completas ou P0/P1 corrigidos |

### Item 10 — 68 → elegível a 95

| Marco | Sprint | Medida | Critério para avançar |
|---|---|---|---|
| workflow atômico | concluído | autoria→retirada | publicação sem aprovação falha fechada |
| corpus governado | S1–S9 | 763 decisões | zero decisão de IA e zero pendência de release |
| correção/recurso | S5–S7 | versões e afetados | tentativa original preservada |
| validade/retirada | S7–S9 | expiração/evento/projeção | drill sem vazamento |
| QA editorial | S9–S11 | amostra por módulo/tipo/risco | zero P0/P1 aberto |

### Item 12 — 78 → elegível a 95

| Marco | Sprint | Medida | Critério para avançar |
|---|---|---|---|
| telemetria externa | S7 | logs/métricas/traces, retenção, RBAC | consulta ponta a ponta e acesso auditado |
| SLO/alertas | S7–S8 | disponibilidade/latência/erro/fila/indexação/IA/UX | falha sintética alerta e acknowledgement é medido |
| DR | S8–S9 | restore e integridade | RPO ≤1h e RTO ≤4h medidos |
| drills | S9–S10 | MTTD/MTTA/MTTR | segundo drill fecha gaps do primeiro |
| soak/failover | S10 | 24h | SLO verde, zero perda/duplicidade, telemetria contínua |

### Item 13 — 78 → elegível a 95

| Marco | Sprint | Medida | Critério para avançar |
|---|---|---|---|
| design/estados | S1–S6 | loading/empty/error/stale/offline/success | todas as jornadas P0 cobertas |
| WCAG | S9–S10 | axe + checklist manual 2.2 AA | zero violação A/AA |
| screen reader/usuários | S10–S11 | NVDA/VoiceOver e tarefas críticas | P0/P1 corrigidos e reexecutados |
| performance/rede | S10 | LCP/INP/CLS, retry e interrupção | budgets aprovados; sem perda/duplicidade |

### Item 16 — 65 → elegível a 95

| Marco | Sprint | Medida | Critério para avançar |
|---|---|---|---|
| commits intencionais | S0/S12 | worktree e diff | limpo, aprovado, sem segredo/dado real |
| traceability | S1–S12 | 145 RF/RNF e tasks ENT95 | 100% P0/P1 com cadeia completa |
| change/release | S1–S12 | record/manifest por incremento | migration/flag/risco/rollback/owner completos |
| RC/auditoria | S12 | SHA/tag/digest/CI/evidência | seis itens ≥95 no mesmo SHA |

## 5. Dependências e decisões

| Decisão | Prazo relativo | Workstream bloqueado | Plano enquanto aguarda |
|---|---|---|---|
| D-ENT-01 equipe/T0 | antes de S0 | todos | apenas preparação local reversível |
| D-ENT-07 capacidade clínica | antes de 03-B | itens 3/10/9 | inventário e tooling, sem decisão simulada |
| D-ENT-09 orçamento | antes de S0 | compromisso de prazo/custo | forecast paramétrico, sem gasto |
| D-ENT-04 telemetria | antes de S7 | item 12 | instrumentação/config local como evidência parcial |
| D-ENT-05 backup | antes de S8 | item 12 | restore local, sem declarar RPO/RTO produtivo |
| D-ENT-06 deploy/registry | antes de S12 | itens 12/16 | rehearsal local, sem release externo |
| D-ENT-08 piloto | antes de S10 | itens 3/9/13 | dados sintéticos, sem alegar UAT/piloto real |

## 6. Caminho crítico

```text
G-S80-0
  → 03-B calibração
  → 03-D + 10-B decisões clínicas
  → 03-E blueprint
  → 09-A + 09-C jornada
  → 13-B + 13-C acessibilidade humana
  → G-S80-7 UAT/piloto
  → 16-A + 16-B + 16-C
  → 16-D RC/re-auditoria
  → G-S80-9

D-ENT-04/05
  → 12-A + 12-C
  → 12-D + 12-E
  → G-S80-4 ───────────────────────────┘
```

O caminho clínico consome no mínimo 13 semanas a 60 itens/semana e aproximadamente 19 semanas a 40 itens/semana, sem contar rework. A meta planejada de 50/semana cabe em 16 semanas; qualquer throughput inferior exige rebaseline explícito.

## 7. Gates e evidência mínima

| Gate | Evidência mínima | Autor da decisão |
|---|---|---|
| G-S80-0 | atas, owners, capacidade, orçamento paramétrico | Ricardo + Program |
| G-S80-1 | lote 25, checklist, concordância e rework | Ricardo + Clinical |
| G-S80-2 | contratos, integração e E2E da jornada | Product + QA independente |
| G-S80-3 | 24/96, fila zero, B-07 e QA editorial | Ricardo + Clinical QA |
| G-S80-4 | backend externo, alertas, restore, drills, soak/failover | SRE + Security + auditor |
| G-S80-5 | axe, checklist, screen reader e usuários | Accessibility + QA |
| G-S80-6 | relatório 100% de cadeias e manifests | QA + Tech Lead |
| G-S80-7 | UAT/piloto autorizado e findings fechados | Product + Ricardo |
| G-S80-8 | CI, tag, digest, SBOM e rollback | SRE + Security |
| G-S80-9 | relatório independente por item | auditor independente |

## 8. Score checkpoints sem promoção automática

Os checkpoints medem **elegibilidade**, não nota oficial:

| Checkpoint | Quando | Condição |
|---|---|---|
| C0 | T0 | baseline e escopo preservados |
| C1 | fim S4 | fábrica estável, jornada diagnóstica e evidência incremental |
| C2 | fim S8 | jornada funcional, DR medido e rastreabilidade avançando |
| C3 | fim S10 | conteúdo fechado, operação e WCAG prontos |
| C4 | fim S11 | UAT/piloto sem P0/P1 |
| C5 | S12 | auditor atribui ≥95 a cada um dos seis itens |

Qualquer checkpoint com critério vermelho retorna tarefas ao backlog; o score no `0491` não é recalculado pelo time de BUILD.

## 9. Métricas de steering

- clínica: decisões/semana, rework, concordância, pendências e idade da fila;
- produto: jornadas E2E verdes, abandono, retomada, próxima ação e SLA de recurso;
- experiência: superfícies auditadas, findings por severidade, conclusão com tecnologia assistiva e budgets web;
- operação: SLI/SLO, MTTD, MTTA, MTTR, RPO, RTO, sucesso de restore, soak e failover;
- evidência: RF/RNF completos, paths/artifacts inválidos, drift de SHA e findings de auditoria;
- entrega: lead time, WIP, bloqueio por decisão e variação de capacidade/custo.

## 10. Regra de encerramento

O roadmap é concluído somente quando G-S80-9 estiver verde. Se cinco itens chegarem a 95 e um permanecer em 94, o programa deste recorte continua aberto. Se os seis chegarem a 95, a projeção global passa a 92,54 apenas como consequência matemática; o produto completo não pode ser anunciado como 95 sem reavaliar os dez itens fora do escopo.

## 11. Execução local observada — 2026-08-12

As janelas futuras não foram comprimidas. Foram executadas apenas fatias locais seguras previstas para `ENT95-10-D` e `ENT95-13-D`: migration 0018/expiração editorial idempotente no worker e policy de performance web com budgets e gaps manuais. A evidência integral ficou verde (126 arquivos/575 testes/18 skips, build 12 workspaces, E2E HA 3/3), mas `G-S80-0`, decisões clínicas, operação externa, UAT, CI/RC e `G-S80-9` continuam fechados. O calendário relativo S0–S12/24 semanas permanece inalterado.

### 11.1 Execução local adicional — 2026-08-12

As fatias locais de `ENT95-09-A/C/D` e `ENT95-10-C` foram consolidadas em `journey-correction-governance.json`: 4 invariantes, 4 evidências sintéticas PASS e 5 gaps explícitos. O gate focal passou 2/2; a bateria de jornada/correção/feedback/contestação passou 33/35, com 2 integrações live condicionais puladas de forma governada. Nenhuma janela foi comprimida: DB live autorizado, UAT, SLA, comunicação clínica, SHA e reauditoria continuam bloqueando os gates correspondentes.

### 11.2 Verificação final — 2026-08-12

`pnpm verify` passou com 127 arquivos/577 testes/18 skips; build, E2E HA 3/3, audit de dependências e diff-check passaram. O roadmap não promove score nem encurta S0–S12/24 semanas: G-S80-0, revisão clínica, operação externa, UAT, SHA/RC e G-S80-9 continuam bloqueados.

## 12. Addendum de roadmap — oito bloqueios — 2026-08-14

Este overlay mantém o calendário relativo de 24 semanas e explicita a sequência para fechar os bloqueios do relatório `docs/112_current_construction_report_2026-08-14.md`. Nenhuma data civil será prometida antes de T0/G-S80-0.

### 12.1 Linhas e marcos de resolução

| Linha | Bloqueios | Janelas | Entrega de saída |
|---|---|---|---|
| B-L1 — beta clínico | BLK-01 | S0–S9 | calibração de 25 itens, revisão veterinária em lotes e 763 decisões auditáveis |
| B-L2 — identidade e borda | BLK-02, BLK-03 | S1–S7 | IdP real, MFA/recovery, DNS público, TLS gerenciado e probes externos |
| B-L3 — dados e recuperação | BLK-04 | S2–S10 | storage externo, backup, restore, RPO/RTO, DR e evidência de retenção |
| B-L4 — entrega imutável | BLK-05, BLK-06 | S0–S12 | CI, registry, SBOM, digest, worktree limpo, deploy e rollback |
| B-L5 — experiência e operação | BLK-07 | S3–S11 | UAT, WCAG manual, screen reader, Web Vitals, soak, failover e DR |
| B-L6 — prova e auditoria | BLK-08 | S1–S12 | 145/145 cadeias, manifests, change control e reauditoria independente |

### 12.2 Sequência por sprint

| Sprint | Bloqueios e ações | Evidência de passagem |
|---|---|---|
| S0 | decidir D-ENT-01/07/09; inventariar worktree; aprovar protocolo beta e owners | ata T0, protocolo beta, roster pendente/aprovado, baseline de SHA |
| S1 | calibrar 25 itens com veterinários; provisionar tenant IdP; fechar contrato de DNS/TLS; iniciar matriz 145 | lote calibrado, tenant de staging, change records e delta de rastreabilidade |
| S2 | iniciar lotes clínicos; integrar login real; configurar storage externo e retenção; pipeline CI RED | primeiro lote 40–60, OIDC/SAML em staging, backup de teste, falha CI reproduzível |
| S3 | MFA privilegiado, recovery e revogação; DNS/TLS em ambiente autorizado; CI GREEN; UAT/assessibilidade RED | testes negativos de identidade, probe HTTPS, pipeline verde, findings classificados |
| S4 | revisão clínica contínua; deploy por digest em staging; backup/restore medido; correções UAT/WCAG | decisões cumulativas, digest registrado, restore íntegro, findings priorizados |
| S5 | validar recuperação de conta e step-up; renovação TLS; matriz de evidência por requisito; Web Vitals reais RED | E2E real de identidade, certificado/expiração, paths válidos, baseline de performance |
| S6 | continuar corpus, QA independente, rollback de release; screen reader e UAT com dados sintéticos | QA sem P0/P1, rollback ensaiado, checklist assistiva parcial |
| S7 | fechar IdP/DNS/TLS; ativar telemetria externa; completar deploy/rollback autorizado | B-G2/B-G3 candidatos, traces externos correlacionados, release manifest |
| S8 | completar lotes clínicos; DR e RPO/RTO; soak preliminar; rastreabilidade P0/P1 | fila clínica residual explícita, RPO/RTO medidos, soak sem perda, P0/P1 rastreado |
| S9 | zerar fila liberável; QA clínico pós-beta; primeiro drill operacional; fechamento WCAG | B-G1 candidato, zero pendência clínica de release, drill com remediação |
| S10 | soak 24h, failover e DR final; UAT representativo; Web Vitals/CI budgets finais | B-G4/B-G7 candidatos, SLO medido, UAT assinado, zero A/AA aberto |
| S11 | correções finais, coorte beta autorizada, evidência de comunicação e recuperação | findings P0/P1 fechados, aprovação da coorte, dossier de release |
| S12 | limpar worktree por commits autorizados; congelar RC; completar 145/145; reauditar | B-G5/B-G6/B-G8 e G-S80-9 verdes no mesmo SHA |

### 12.3 Gates do overlay

| Gate | Critério binário | Autor de aceite |
|---|---|---|
| B-G1 | 763 decisões veterinárias auditáveis, sem pendência liberável e sem P0/P1 | Clinical lead + Ricardo |
| B-G2 | IdP real, MFA privilegiado, recovery/revogação e auditoria E2E | Security + Ricardo |
| B-G3 | DNS público, certificado gerenciado, HTTPS externo e renovação/probes | SRE + Security |
| B-G4 | backup externo, retenção efetiva, restore, RPO ≤1h, RTO ≤4h e DR | SRE + Database + auditor |
| B-G5 | CI remoto, registry imutável, SBOM, deploy e rollback por digest | SRE + Security |
| B-G6 | worktree limpo, SHA/tag/digest/runtime/manifest correspondentes | Tech Lead + Ricardo |
| B-G7 | UAT, WCAG manual, screen reader, Web Vitals, soak e failover verdes | Product + UX + SRE |
| B-G8 | 145/145 cadeias completas, change control e artifact retention comprovados | QA + auditor independente |

Se um gate vermelho persistir, as tarefas seguintes não são comprimidas nem declaradas concluídas; o atraso desloca T0/RC e mantém `PILOT_BLOCKED`.

## 12.4 Checkpoint de evidência local — 2026-08-14T11:32:02-03:00

O roadmap agora tem evidência local adicional para as linhas B-L1, B-L3 e B-L5: fila clínica `796` total/`763` pendentes sem falha técnica, load smoke `5000/5000` com p95 `300,56 ms`, e backup/restore isolado com `32` objetos e RTO `4583 ms`. Esses dados não avançam S0–S12 nem os gates B-G1/B-G4/B-G7, pois revisão veterinária, retenção externa, produção, UAT, soak, DR e aceite humano continuam ausentes.

## 12.5 Dependência de CI para fontes licenciadas — 2026-08-14T11:38:12-03:00

O gate B-G5 ganhou uma dependência explícita: os PDFs licenciados não serão versionados; o CI deverá baixar um bundle privado autorizado, verificar os três SHA-256 e executar o pré-voo em diretório temporário. Até existir provedor, credencial read-only e run remoto verde no RC, B-G5 e G-S80-9 permanecem abertos.

## 12.6 Inventário remoto do CI — 2026-08-14T11:42:45-03:00

Read-only no GitHub: nenhum secret, variable, environment ou deployment configurado; somente `quality` aparece como workflow. B-G5 continua vermelho até haver bundle licenciado acessível, credencial read-only, registry, deploy e rollback por digest comprovados no RC.

## 12.7 RC validado no SHA executável e rollback local — 2026-08-14T11:57:48-03:00

O RC local foi reconstruído no SHA executável `8cf40e567d02149b9f5714c8b1084b60bd291426`, com digest `sha256:aa5dc1b767745734f92b10359bb35920b6ab2096ed7cc5c6ce4927e592ad92bb`. API-A/API-B e worker-A/worker-B ficaram saudáveis na mesma revisão; health `ready/dependencies=200/200`, E2E HA `3/3` e ensaio local `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`. O rollback sintético foi `sha256:32a8b4dfca1e383354b439cb9118229ea4dcd3824c33496efee30d10af81d5a4`.

O marco fortalece B-L4/B-G6 somente no ambiente local. B-G1–B-G5 e B-G7–B-G8 continuam abertos: não há aprovação clínica dos `763`, IdP/MFA, DNS/TLS público, backup externo/RPO/RTO, CI/registry/deploy remoto, UAT, WCAG manual, Web Vitals reais, soak, DR ou reauditoria.

## 12.8 Inventário do Hostinger candidato — 2026-08-14T12:17:30-03:00

O Hostinger tem capacidade genérica de edge (Caddy válido, 80/443 e certificados Let's Encrypt para outros subdomínios), porém não possui projeto/container/route/FQDN do Trainee Vet. Os backups existentes são locais e de outro produto; não foi observada ferramenta ou agenda de backup externo. O roadmap, portanto, não avança B-G2/B-G3/B-G4/B-G5/B-G7: a próxima janela depende de decisões de alvo, domínio, IdP, registry/CI, storage, retenção e rollback.

## 12.9 RC atual, failover e restore local — 2026-08-14T12:46:44-03:00

O RC foi reconstruído no source SHA `16dcc2afda04866b1ecfaeb6017fe30bdadaa8be`, digest `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`. O web sintético passou `25/25`, o E2E HA passou `3/3`, o failover controlado passou `500/500` com 100% de sucesso e o restore live passou `2/2`, com RTO local direto de `3.832 ms`. O dado melhora a evidência local de B-L4/B-L5, mas não promove gates: produção pública, revisão veterinária, backup externo, CI/deploy/rollback remoto, UAT manual, Web Vitals reais, soak, DR e reauditoria continuam pendentes.

## 12.10 Verificação integral pós-registro — 2026-08-14T12:51:24-03:00

`pnpm verify` passou com `161` arquivos/`706` testes/`18` skips e cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`; o roadmap permanece sem promoção de gate, pois `145/145` cadeias completas, revisão clínica, operação pública e aceite humano ainda não existem.

## 12.11 Web Vitals e carga delimitada — 2026-08-14T13:00:56-03:00

O runtime local passou medição Chromium em dois viewports (LCP `232/172 ms`, CLS `0/0`, INP proxy `120/144 ms`) e carga delimitada `20.000/20.000` com concorrência `50`, p95 `119,82 ms`. O roadmap mantém `PASS_WITH_GAPS`: a janela de RUM público, UAT manual, screen reader, soak 24h, SLO, DR e CI de budgets ainda depende de autorização.

## 12.12 Reconsulta do CI remoto — 2026-08-14T13:07:52-03:00

O GitHub continua sem infraestrutura de promoção: PR `#1` aberto no head remoto anterior, checks `quality` falhos e `0` secrets/variables/environments/deployments. B-G5 e G-S80-9 permanecem abertos; o próximo passo exige bundle licenciado, CI read-only, registry imutável, ambiente de deploy e rollback autorizado.

## 12.13 Contrato de bundle clínico privado — 2026-08-14T13:18:25-03:00

O CI agora declara `vars.CVG_CLINICAL_SOURCES_DIRECTORY` e o verificador aceita um diretório absoluto externo, validando nomes exatos e SHA-256 sem copiar PDFs para o repositório. Os testes focais passaram `11/11` e o pré-voo local passou.

Critério de saída do B-G5 continua: bundle licenciado provisionado, acesso read-only, materialização temporária, retenção, run remoto verde no mesmo RC e depois registry/deploy/rollback por digest. A mudança não promove o gate nem a baseline.

O contrato local foi consolidado no commit `9bfa2c1`; falta evidência do provedor e do run remoto no mesmo RC.

## 12.14 Checkpoint BLK-01/RUNTIME — 2026-08-14T13:39:26-03:00

Health local `200/200/200`, HA e edge passaram. A fila live contém `796` conteúdos, com `763` pendentes/não revisados, `0` aprovados e `0` falhas técnicas; o gate estrito falha até que o beta registre decisões veterinárias auditáveis. O marco técnico do beta está preparado, mas BLK-01/B-G1 continua aberto. A próxima janela depende de roster, T0, ambiente e capacidade clínica aprovados.

## 12.15 Correção de drift e RC alinhado ao HEAD — 2026-08-14T13:51:47-03:00

O rehearsal local restaurou uma imagem com `CVG_SOURCE_SHA=unknown`; a inspeção detectou o drift e a evidência foi descartada. O RC foi reconstruído no HEAD `2e7a96b39c60139fc0bd0c642fb77800f5c6c00a`, tag `cvg-trainee-vet:rc-head-2e7a96b39c60`, digest `sha256:6d0d64b722a45d307ea36b9bbfbb4946b3ba4d0e2d0255e00e3aebb610898e27`. API-A/API-B e worker-A/worker-B estão alinhados, com health `200/200/200`, HA e edge verdes.

O marco fecha somente a proveniência/reversibilidade local de BLK-06; os gates externos, clínicos, UAT/operação e a reauditoria continuam abertos.

## 12.16 Guardas fail-closed de SHA no rehearsal — 2026-08-14T14:04:54-03:00

O controlador local exige SHA explícito, compara o label da imagem e restaura por digest imutável. Testes focais `6/6`, ausência de SHA falhou antes de qualquer alteração e rehearsal real passou no commit executável `e70d3f4`; o RC final reporta digest comum `sha256:63ac637774932b127f584745fda236bdc99a61c0a6a4c8ac12ca675ee7b6597c` e health `200/200/200`.

Esse resultado fecha apenas a correção local de BLK-06; não fecha prova produtiva de CI/registry/deploy/rollback nem os gates externos/humanos.

## 12.17 Reconsulta do CI remoto — 2026-08-14T14:09:16-03:00

PR `#1` continua aberto no head remoto anterior; os checks `quality` continuam falhos e não há secrets, variables, environments ou deployments. B-G5 e G-S80-9 permanecem abertos; o próximo marco exige provisionamento autorizado e run verde no mesmo RC.

## 12.18 Gate de proveniência do runtime — 2026-08-14T14:24:40-03:00

O gate local de proveniência passou após rejeitar uma recriação por tag mutável: source SHA `be43fc8f7f410435a40550eb70e9b2a700882355`, imagem `cvg-trainee-vet@sha256:0ec956ffa267fd4534feaaf1000bd85adbacab77ce105775ea15a4af20b73fcf`, quatro processos HA alinhados e health `200/200/200`; rehearsal `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`.

O roadmap não promove B-G6/G-S80-9: CI/registry/deploy/rollback externo, identidade, edge público, backup/RPO/RTO, revisão veterinária, UAT, WCAG manual, RUM/Web Vitals, soak, DR e reauditoria continuam necessários.

## 12.19 Diagnóstico do CI remoto — 2026-08-14T14:38:49-03:00

O PR `#1` continua apontando para o head remoto antigo, e o run `31402470511` falhou porque os três arquivos licenciados não estão no checkout. B-G5/G-S80-9 permanecem abertos: a correção local de bundle externo está pronta, mas faltam provider/licença, credencial, autorização de publicação, CI verde no RC, registry, deploy/rollback e reauditoria.

## 12.20 Revalidação live do edge — 2026-08-14T14:53:34-03:00

O edge local respondeu `60/60` probes HTTP de readiness com `200` e HTTPS local com `200` sob `localhost`, porém o certificado é interno do Caddy e os logs evidenciam falhas intermitentes de resolução Docker com janelas `503`. O roadmap mantém B-G3/B-G7 como `PARTIAL`: reproduzir e resolver a intermitência, depois validar FQDN público e CA gerenciada no ambiente autorizado.

## 12.21 Reancoragem do RC no SHA executável atual — 2026-08-14T15:03:15-03:00

O RC local foi reconstruído no source SHA `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa`; rehearsal `PASS` em deploy/rollback/restauração, release digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b` e rollback sintético `sha256:b293b4235e2c2b614bfeec1887a509dbf0d1dcbb51d55344ba591f72a144ebc9`. Proveniência confirmou quatro containers alinhados e health `200/200/200`.

O roadmap marca BLK-06 local como `PASS`, sem promover B-G5/G-S80-9 nem os gates humanos/externos. Edge público/CA, CI/registry/deploy/rollback, IdP/MFA, backup/RPO/RTO, beta clínico, UAT, WCAG manual, Web Vitals reais, soak/DR e `0/145` continuam abertos.

## 12.22 Verificação integral pós-reancoragem — 2026-08-14T15:10:35-03:00

`pnpm verify` passou com `163` arquivos/`719` testes/`18` skips e cobertura `83,78%`/`80,41%`/`84,95%`/`84,55%`; contratos, worker, migrations, lint, typecheck, secrets, governanças, arquitetura, documentação, produto e fronteira pública passaram. O roadmap mantém `0/145`, `PILOT_BLOCKED` e todos os gates externos/humanos não comprovados como abertos.

## 12.23 Rechecagem do beta clínico e CI remoto — 2026-08-14T15:16:10-03:00

O roadmap classifica a fatia técnica do beta como `READY_FOR_HUMAN_EXECUTION`: fila, escopo, papel, decisão persistida e gate de publicação estão presentes; a revisão efetiva dos `763` itens continua `NOT_EXECUTED`. O CI remoto permanece `FAIL` no head `d3964a9e…` por ausência do bundle licenciado; B-G1/B-G5/G-S80-9 continuam abertos.
