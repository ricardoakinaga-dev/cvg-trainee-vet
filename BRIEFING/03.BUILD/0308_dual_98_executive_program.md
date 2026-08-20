# 0308 — Programa executivo Dual 98

- program_id: `CVG-DUAL-98`
- status_documental: `COMPLETED`
- status_execucao: `IN_PROGRESS` local / `PILOT_BLOCKED`
- planning_date: `2026-08-16`
- source_maturity: `BRIEFING/04.AUDIT/0491_full_construction_audit.md`
- source_code_quality: `docs/116_code_quality_audit_2026-08-16.md`
- assessment: `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`
- assessment_pre_hardening: `docs/131_dual_98_gap_assessment_2026-08-16.md`
- local_evidence: `docs/132_dual_98_local_hardening_evidence_2026-08-16.md`
- roadmap: `BRIEFING/04.AUDIT/0516_dual_98_roadmap.md`
- backlog: `BRIEFING/04.AUDIT/0517_dual_98_backlog.md`
- disposition: `PILOT_BLOCKED`

## 1. Mandato

O programa transforma as melhorias locais U95 em evidência sustentada para duas rubricas independentes. As notas `83,24/100` e `64,20/100` permanecem congeladas; hoje `0/32` células possuem nota oficial ≥98.

Sucesso exige simultaneamente:

- maturidade: `16/16 ≥98`;
- qualidade: `16/16 ≥98`;
- `32/32 ≥98` no mesmo release candidate;
- `145/145` cadeias completas;
- zero P0/P1 e zero P2 material sem aceite formal;
- nenhuma prova relevante baseada somente em worktree, mock, dry-run ou skip;
- duas reauditorias independentes sobre a mesma identidade de RC.

O número `98` é alvo de elegibilidade, não score autodeclarado. Os critérios
reconciliados em `docs/133` precisam ser congelados com sponsor e auditores
antes da reauditoria; `docs/131` permanece fotografia pré-hardening.

## 2. Identidade indivisível do RC

Toda evidência final deve apontar para o mesmo conjunto:

```text
commitSha
+ imageDigest
+ sbomDigest
+ releaseManifestDigest
+ migrationSetHash
+ curriculumSnapshotId
+ configurationRevision
+ environmentId
+ evidencePackDigest
```

Qualquer patch posterior ao freeze cria outro RC e invalida as provas afetadas. Um SHA local sem objeto Git, uma imagem sem attestation ou um rollback para a mesma versão não satisfazem o contrato.

## 3. Princípios

1. `TASK → RED → GREEN → REFACTOR → REVIEW → AUDIT` para toda mudança de código;
2. segurança, atomicidade, integridade clínica e proveniência são gates binários;
3. ausência de evidência é `NOT_EXECUTED` ou `BLOCKED`, nunca `PASS`;
4. PostgreSQL permanece fonte transacional; Qdrant/IA são derivados e não decidem nota, estado ou publicação;
5. revisão clínica, UAT, WCAG manual, risco e go/no-go preservam autoridade humana;
6. scanner verde, gate estrutural ou mock não substituem teste da propriedade declarada;
7. somente evidência do mesmo RC, ambiente e janela de validade entra na reauditoria;
8. nenhuma média compensa célula abaixo de 98;
9. somente P3 residual pode permanecer, sempre com owner, prazo e risco aceito;
10. `PILOT_BLOCKED` só pode ser reconsiderado em `G98-8`.

## 4. Linhas estratégicas

### L1 — Verdade e qualidade local

Fechar os gaps remanescentes de U95, os `D98-H01–H06` e os achados pós-hardening `D98-RH01–RH05`: scanner realmente fail-closed, idempotência HTTP/transacional sob concorrência PostgreSQL, revogação de sessão serializada, identidade clínica corrente global, readiness ligada à outbox real, loss-of-signal carregado no runtime, diagnostics e convite sem segredo em query. Completar risco, mutation, cobertura, skips, WebKit e hotspots. Gate verde só é aceito quando mede a propriedade declarada.

### L2 — Supply chain e RC-alpha

Revisar o worktree, criar commits intencionais mediante aprovação, congelar SHA alcançável, produzir SBOM/assinatura/attestation e executar deploy/canário/rollback entre duas versões distintas com API e worker estáveis.

### L3 — Fundação externa

Executar CI/registry/CD, IdP/MFA/recovery/step-up, DNS/TLS, telemetria/on-call/retention, backup offsite/PITR/DR e HA multi-host. Configuração local não fecha essa linha.

### L4 — Produto e fábrica clínica

Completar 24 módulos/96 sessões/B-07, jornadas e métricas. Calibrar revisores, decidir cada item por autoridade clínica e zerar a fila liberável sem bulk approval ou IA.

### L5 — Aceitação e resiliência

Executar UAT, WCAG 2.2 AA manual, screen reader, RUM, DAST/pentest, capacity, soak, failover, restore e DR no RC final.

### L6 — Evidência e reauditoria

Completar `145/145`, reexecutar os gates em duas rodadas independentes, reter o evidence pack e submeter as 32 células aos dois auditores.

## 5. Gates binários

| Gate | Saída verificável | Condição que bloqueia |
|---|---|---|
| `G98-0` verdade | baselines, corte, rubrica, owners e aliases sem drift | contagem/status/fonte divergente ou critério 98 não aprovado |
| `G98-1` local | zero high/P1 local; `87/87`; quality gates, WebKit e fault/mutation verdes | scanner fraco, retry inseguro, readiness latch, gap de risco ou browser |
| `G98-2` RC-alpha | clean checkout; SHA/digest/SBOM/assinatura/manifest; rollback distinto | worktree, SHA ou artefato não atribuível; rollback same-version |
| `G98-3` externo | CI, registry, IdP/TLS, telemetria/on-call, backup e HA reais | fixture, configuração ou dry-run sem execução alvo |
| `G98-4` produto/clínico | produto essencial e fila liberável zero | conteúdo/decisão/autoridade/aceite pendente |
| `G98-5` aceitação | UAT/WCAG/RUM/pentest/soak/failover/DR verdes | P0/P1/P2 material, SLO ou aceite ausente |
| `G98-6` proveniência | `145/145`, validade e evidence pack sem drift | cadeia, link, digest, retenção ou reprodução incompleta |
| `G98-7` reauditoria | duas matrizes `16/16 ≥98` no mesmo RC | qualquer célula <98 ou RC divergente |
| `G98-8` go/no-go | decisão humana registrada e rollback disponível | ausência de autoridade, risco não aceito ou gate anterior aberto |

## 6. Metas quantitativas de prontidão

Estas metas são pisos do programa; não garantem automaticamente nota 98.

| Controle | Piso |
|---|---|
| cobertura global | ≥95% statements/functions/lines e ≥90% branches |
| camada crítica | ≥95% nas quatro métricas ou decisão formal mais forte por risco |
| decisões críticas | 100% branches e mutation score ≥90%, sem sobrevivente crítico não adjudicado |
| matriz P0/P1 | `87/87` aplicáveis com success/error/denied/conflict ou N/A aprovado |
| browsers | Chromium, Firefox, WebKit e mobile; caminho ativo no RC |
| skips/flakes | zero skip relevante; 20 execuções observadas; taxa dentro do limite aprovado |
| supply chain | SHA↔digest↔SBOM↔attestation↔manifest assinados |
| resiliência | pelo menos duas execuções; soak ≥24h, preferencialmente 72h |
| continuidade | `RPO≤1h`, `RTO≤4h`, rollback/failover/restore repetíveis |
| clínica | `763` decisões auditáveis no corte, fila liberável zero e QA independente |
| rastreabilidade | `145/145` completas, válidas e reproduzíveis |

## 7. Autoridades

| Papel | Responsabilidade | Autoridade |
|---|---|---|
| sponsor/product owner | T0, orçamento, equipe, escopo, risco e go/no-go | Ricardo |
| clinical approver atual | calibração, decisão, reabertura e publicação | identidade ativa, papel e escopo revalidados |
| engineering lead | arquitetura, código, integração e RC | aceita entrega técnica, não nota |
| security reviewer | threat model, auth/session/secrets/DAST e findings | bloqueia P0/P1/P2 material |
| SRE/platform/DBA | CI, runtime, observabilidade, backup, DR e capacity | aceita prova operacional externa |
| UX/a11y | UAT, WCAG, SR, RUM e dispositivos | aceita experiência por papel |
| auditor de maturidade | reaplica os 16 itens de `0491` | único que altera a trilha M |
| auditor de qualidade | reaplica os 16 itens de `docs/116` | único que altera a trilha Q |

Implementador não aprova a própria nota. Autor não aprova o próprio conteúdo. O aprovador corrente precisa estar ativo e autorizado no instante da decisão e da publicação.

## 8. Contrato de evidência

Cada task e célula registra:

```text
requisito/finding
→ PRD/SPEC/decisão
→ módulo/contrato
→ teste RED/GREEN/negativo/fault
→ ambiente/dados sintéticos
→ commit/SHA
→ digest/SBOM/manifest
→ execução/resultados/logs
→ owner/validade/limitação
→ auditor/decisão
```

Evidência deve ser mínima, redigida, sem segredos, dados reais, PDFs/fotos de terceiros ou gabaritos públicos.

## 9. Critérios de parada

Suspender promoção quando surgir P0/P1, falha de autorização/atomicidade/integridade, drift de proveniência, dado proibido, score autodeclarado, evidência de outro RC ou tentativa de substituir aceite humano por automação. Trabalho local reversível pode continuar quando não agrava o risco.

## 10. Situação inicial

- implementação local avaliada até U95-114;
- `pnpm verify` e build `12/12` passam no ambiente adequado;
- cobertura `90,73/85,30/93,70/92,15`;
- `152` funções >50, `21` >100 (`22` ≥100), máximo `128`;
- risco `11/87` completo;
- WebKit bloqueado por `libavif16`;
- `0/145` cadeias completas;
- fila clínica `763` no corte transacional documentado;
- worktree pré-plano `299`, sem commit/RC;
- seis achados altos novos e dependências externas/humanas abertas.

Planejamento: `COMPLETED`. Execução local: `IN_PROGRESS`/`PILOT_BLOCKED`; os gates aplicáveis continuam obrigatórios.

### Checkpoint independente pós-hardening — 2026-08-16

`docs/132` confirma uma implementação local relevante e os gates gerais foram
reproduzidos (`195/947/19`, cobertura `90,43/85,14/93,61/91,84`, build
`12/12`). A revisão independente de `docs/133`, porém, reabriu U98-107–113:

- scanner fail-closed: `FAIL`, com bypasses sintéticos reproduzidos;
- idempotência/0030 e senha/sessão: `PARTIAL`, sem assurance concorrente live e
  com risco de sessão sobrevivente;
- authoring clínico: `PASS_LOCAL`; decisão clínica global: `PARTIAL`;
- heartbeat: `PASS_LOCAL`; claim→ack da outbox real: `FAIL_AS_CLAIMED`;
- arquivo Prometheus: `PASS_STATIC`; cinco regras novas no runtime:
  `NOT_EXECUTED`, com loss-of-signal de API ausente;
- diagnostics: `PASS_RUNTIME`; contrato e convite: `PARTIAL`.

O caminho crítico local agora é `RH01–RH05 → risco/testes/WebKit/hotspots →
preauditoria local`. Compatibilidade de mutações N/N-1 (`RH06`) antecede o
RC-alpha. As dependências externas, `0/145`, fila clínica, score e
`PILOT_BLOCKED` permanecem inalterados.

## 11. Plano executivo pós-hardening

| Fase | Janela após T0 | Objetivo | Gate de saída |
|---|---:|---|---|
| F98-0R | 2–5 dias úteis | aprovar rubrica/owners/T0 e reconciliar o worktree `303→322` | verdade única, U98-002/003/005 decididas |
| F98-1R | 3–6 semanas | fechar U98-102–117, seis achados altos, `87/87`, pisos, mutation, WebKit e hotspots | zero high/P1 local; preauditoria U98-114 |
| F98-2 | 1–2 semanas após autorização | commits intencionais, N/N-1, RC-alpha, assinatura e rollback distinto | G98-2 no mesmo SHA/digests |
| F98-3 | 6–10 semanas em paralelo | CI/CD, IdP/TLS, telemetria/on-call, backup/PITR/DR e multi-host | G98-3 executado, não configurado apenas |
| F98-4 | 15–23 semanas em paralelo | produto integral, calibração, `763` decisões e QA | fila liberável zero |
| F98-5 | 3–4 semanas | RC final, UAT/WCAG/RUM/pentest/soak/failover/DR | G98-5 sem bloqueante |
| F98-6 | 1–2 semanas | `145/145`, reprodução e duas reauditorias | `32/32 ≥98` e go/no-go humano |

Horizonte nominal: `20–28` semanas após T0; replanejar para `30+` se clínica,
providers ou P0/P1 atrasarem o caminho crítico. O backlog detalhado permanece
em `0517` e o roadmap em `0516`; não foi criado um segundo programa concorrente.
