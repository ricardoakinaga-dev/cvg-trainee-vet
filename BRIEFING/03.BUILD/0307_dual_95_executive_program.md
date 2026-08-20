# 0307 — Programa executivo Dual 95

> **Registro histórico:** o planejamento Dual 95 foi absorvido pelo programa `BRIEFING/03.BUILD/0308_dual_98_executive_program.md`. O antigo `READY_FOR_NEXT_STEP` descrevia apenas a prontidão documental; a execução permaneceu `BLOCKED`/`PILOT_BLOCKED`.

- program_id: `CVG-DUAL-95`
- status: `HISTORICAL — ABSORBED_BY_DUAL_98`
- planning_date: `2026-08-16`
- source_maturity: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`
- source_code_quality: `docs/116_code_quality_audit_2026-08-16.md`
- readiness_assessment: `docs/117_dual_95_readiness_assessment_2026-08-16.md`
- roadmap: `BRIEFING/04.AUDIT/0514_dual_95_roadmap.md`
- backlog: `BRIEFING/04.AUDIT/0515_dual_95_backlog.md`
- disposition: `PILOT_BLOCKED`

## 1. Mandato

Este programa coordena, sem misturar notas, a recuperação das duas auditorias vigentes:

- maturidade integral: `83,24/100`, 16 itens, `1/16` no piso;
- qualidade independente: `64,20/100`, 16 itens, `0/16` no piso.

A definição única de sucesso é `32/32` células com nota individual ≥95 em duas reauditorias independentes sobre o mesmo release candidate. Não existe média Dual 95 e não há promoção por conclusão de task, volume de testes, documentação isolada ou evidência de outro SHA.

`0304` e `0491` permanecem a baseline da maturidade. `docs/116` permanece a baseline da qualidade. `0306/0512/0513` tornam-se overlay histórico absorvido por este programa; seus IDs continuam válidos como aliases de rastreabilidade, não como fonte concorrente de estado.

## 2. Princípios de execução

1. corrigir a verdade antes de ampliar o worktree;
2. TDD obrigatório para toda mudança de código: RED → GREEN → REFACTOR;
3. segurança e atomicidade clínica são gates, não dívida aceitável de release;
4. ausência de runtime real é `NOT_EXECUTED` ou `BLOCKED`, nunca `PASS`;
5. PostgreSQL é a fonte transacional; Qdrant e IA não decidem estado, nota ou publicação;
6. toda entrada externa é validada, autorização é server-side e deny-by-default;
7. evidência só pertence ao RC quando SHA, digest, manifesto, ambiente e artefato são coerentes;
8. nenhuma automação substitui revisão clínica, UAT, WCAG manual ou decisão go/no-go humana;
9. cada item abaixo de 95 mantém owner, gap, teste de saída, dependência e data de validade da evidência;
10. `PILOT_BLOCKED` só pode ser reconsiderado no `G95-7`.

## 3. Situação de partida

| Dimensão de controle | Estado no corte |
|---|---|
| worktree | corte técnico `212`; pós-relatório `221`: `116` rastreadas/modificadas e `105` não rastreadas |
| testes locais | `177` arquivos / `790` testes / `16` skips |
| cobertura agregada | `84,81 / 80,18 / 87,13 / 85,65`; web `app/**` omitido |
| estrutura | `0` arquivos >800; `152` funções >50; maior `128` |
| risco P0/P1 | `11/87` provas completas; error `63`, denied `26`, conflict `36` |
| browser | `26/26` web sintético; API `3101` ausente |
| runtime observado | Prometheus sem scrape das APIs, sem rules e sem Alertmanager efetivo |
| clínica | `796` versões; `763` pendentes; `0` decisões de revisão |
| rastreabilidade | `0/145` cadeias completas |
| novos achados | `6` altos e achados médios explicitados em `docs/117` |

## 4. Estrutura do programa

### F0 — Verdade, triagem e mobilização

Objetivo: estabelecer uma única fotografia operacional antes de novas mudanças amplas.

Saídas: duas baselines congeladas; fatos `763`, runtime e worktree reconciliados; 212 entradas classificadas; rubrica de 32 células; owners, T0, equipe, orçamento, ambientes e auditor definidos; achados altos com teste de reprodução.

### F1 — Fechamento técnico local

Objetivo: eliminar achados P1 locais e reduzir dívida que impede evidência confiável.

Saídas: métricas Prometheus parseáveis; observabilidade local funcional; fluxo clínico atômico e vinculado ao aprovador atual; fixture live corrigida; worker health obrigatório no release; matriz de risco completa; contratos web compartilhados; coverage denominator honesto; API/persistência/type safety/frontend ratcheados.

### F2 — RC-alpha local

Objetivo: transformar o conjunto revisado em release candidate reproduzível.

Saídas: worktree limpo; commits intencionais; SHA alcançável; imagem, digest, SBOM, attestation e manifesto vinculados; E2E browser→web→API→PostgreSQL; HA/failover; alertas; restore e rollback real entre versões.

### F3 — Fundação externa

Objetivo: provar propriedades que não existem apenas no laptop.

Saídas: CI remoto no mesmo SHA; registry/deploy/rollback; IdP/MFA/recovery/step-up; DNS/TLS; telemetria e Alertmanager externos; backup offsite/PITR; capacidade, soak e failure-domain HA.

### F4 — Produto e fábrica clínica

Objetivo: completar a experiência do PRD e tornar o corpus publicável com governança humana.

Saídas: 24 módulos/96 sessões/B-07; jornada diagnóstico→retenção; correção/recurso/autoria; calibração clínica; lotes auditáveis; fila liberável zero; nenhuma publicação automática.

### F5 — Aceitação e resiliência

Objetivo: validar experiência, segurança e operação sob uso/falha representativos.

Saídas: UAT por papel/turno/dispositivo; WCAG 2.2 AA manual e screen reader; RUM/Web Vitals; security assessment; soak 24h; failover, DR e RPO/RTO medidos; zero P0/P1.

### F6 — RC final, evidência e decisão

Objetivo: repetir tudo no artefato final e submeter as duas rubricas.

Saídas: RC congelado; `145/145` cadeias completas; pacote retido; duas reauditorias `16/16 ≥95`; decisão humana go/no-go registrada.

## 5. Gates binários

| Gate | Saída verificável | Falha que bloqueia |
|---|---|---|
| `G95-0` factual | fontes vigentes, fatos, owners e critérios sem divergência | baseline/contagem/status conflitante ou P1 sem owner |
| `G95-1` local | zero P1 local; verify/build/E2E ativo/fault injection verdes | qualquer high aberto, scope de teste omitido ou worktree não revisado |
| `G95-2` RC-alpha | SHA/digest/SBOM/manifest coerentes; rollback local real | SHA inexistente, attestation ausente ou probe incompleto |
| `G95-3` externo | CI/registry/IdP/TLS/telemetria/backup reais | fixture, dry-run ou declaração sem evidência externa |
| `G95-4` produto/clínico | jornada completa, 24/96/B-07 e fila liberável zero | conteúdo pendente, decisão ausente ou publicação não atômica |
| `G95-5` aceitação | UAT/WCAG/RUM/security/soak/DR sem P0/P1 | evidência manual/operacional ausente ou SLO não aprovado |
| `G95-6` evidência | `145/145`, retenção e zero drift | cadeia, artifact ou validade incompleta |
| `G95-7` auditoria | `16/16 ≥95` em cada rubrica no mesmo RC | qualquer célula <95 ou evidência de RC divergente |

## 6. Organização e autoridades

| Papel | Responsabilidade | Autoridade de aceite |
|---|---|---|
| sponsor/product owner | T0, recursos, escopo, risco e go/no-go | Ricardo |
| clinical approver atual | calibração, decisões item a item e publicação clínica | identidade configurada e auditada; nunca inferida |
| engineering lead | arquitetura, integração, RC e qualidade técnica | aceita evidência local, não nota de auditoria |
| security reviewer | threat model, authz, sessão, secrets, DAST e findings | bloqueia P0/P1 de segurança |
| SRE/operations | observabilidade, capacity, backup, DR, deploy/rollback | aceita evidência operacional externa |
| UX/a11y reviewers | UAT, WCAG, screen reader e turnos/dispositivos | aceitam experiência por papel |
| independent auditors | reaplicam as duas rubricas | únicos que podem alterar notas |

Separação mínima: implementador não aprova sua própria nota; autor não aprova clinicamente o próprio conteúdo; o aprovador corrente deve estar ligado à decisão usada na publicação.

## 7. Contrato do pacote de evidência

Cada task e cada célula da rubrica devem registrar:

```text
requirement/finding
→ PRD/SPEC/decision
→ module/contract
→ RED/GREEN/refactor/review
→ environment + timestamp
→ reachable commit SHA
→ image digest + source attestation
→ artifact + retention
→ runtime/log/metric result
→ rollback/teardown
→ limitations + approver
```

Estados aceitos de execução: `NOT_EXECUTED`, `FAIL`, `PASS_WITH_GAPS`, `PASS`. Somente `PASS`, no RC correto e dentro da validade, satisfaz um critério final. Dados reais, segredos, fontes licenciadas, fotos, PDFs, prontuários, prompts e gabaritos não entram no pacote.

## 8. Métricas executivas

- `itemsAt95.maturity / 16` e `itemsAt95.codeQuality / 16`;
- P0/P1 abertos, idade, owner e prazo;
- arquivos >800, funções >50/>100, maior função e casts duplos;
- cobertura de toda produção, mínimo por camada, skips/flakes e matriz `87/87`;
- E2E ativo, readiness, SHA/digest drift, worker health, canário, failover e soak;
- targets/rules/alerts, MTTD/MTTA/MTTR e fire→ack→resolve;
- RPO/RTO, idade e restore do backup;
- fila clínica `N`, throughput, concordância, rework e fila liberável;
- UAT, findings WCAG A/AA, RUM e Vitals;
- `completeChains / 145` e artefatos próximos de expirar.

Não haverá score projetado em relatório de status. A única evolução válida é a reauditoria registrada.

## 9. Capacidade e horizonte

As janelas do roadmap são relativas e dependem de autorização. A fábrica clínica é o maior risco de duração. Para `N=763`, o tempo mínimo de lotes é:

| Throughput protegido | Duração mínima de lotes |
|---:|---:|
| 60 itens/semana | `ceil(763/60) = 13` semanas |
| 50 itens/semana | `ceil(763/50) = 16` semanas |
| 40 itens/semana | `ceil(763/40) = 20` semanas |

Calibração, desacordos e retrabalho são adicionais. O cronograma deve ser recalculado com a fila transacional no T0; a pressão de calendário não reduz amostra, independência ou critério clínico.

## 10. Definition of Done do programa

O programa só termina quando:

- `32/32` células estão ≥95 no mesmo RC;
- não há P0/P1 aberto nem evidência expirada;
- `145/145` cadeias estão completas;
- CI, release, runtime, observabilidade, backup/DR, identidade e UX foram comprovados nos ambientes aprovados;
- corpus e jornada de produto satisfazem os gates humanos;
- go/no-go foi assinado e estado/log/backlogs foram atualizados;
- rollback e retirada permanecem executáveis.

Até lá: `PILOT_BLOCKED`, sem promoção de score, release ou publicação clínica.
