# 0516 — Roadmap Dual 98

**Programa:** `BRIEFING/03.BUILD/0308_dual_98_executive_program.md`
**Assessment corrente:** `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`
**Assessment pré-hardening:** `docs/131_dual_98_gap_assessment_2026-08-16.md`
**Backlog:** `BRIEFING/04.AUDIT/0517_dual_98_backlog.md`
**Evidência local:** `docs/132_dual_98_local_hardening_evidence_2026-08-16.md`
**Disposição:** `PILOT_BLOCKED`

## 1. Regra de calendário

As janelas são relativas ao `T0` aprovado e não constituem promessa de data. Trabalho técnico local seguro pode avançar antes do T0; commits, RC, providers, produção, revisão clínica, UAT e auditoria dependem das respectivas autoridades.

Cada sprint termina em `TESTE → REVIEW → SECURITY → AUDIT → STATE/LOG/BACKLOG/TRACEABILITY`.

## 2. Horizonte e fases

| Fase | Janela indicativa | Fluxo | Gate |
|---|---|---|---|
| F98-0R — verdade pós-hardening | W0, 2–5 dias úteis | governança | `G98-0` |
| F98-1R — fechamento técnico local | W1–W6, 3–6 semanas | engenharia/segurança/QA | `G98-1` |
| F98-2 — RC-alpha e supply chain | W5–W8, 1–2 semanas após autorização | release | `G98-2` |
| F98-3 — fundação externa | W5–W14, 6–10 semanas, paralela | plataforma/SRE/DBA | `G98-3` |
| F98-4 — produto e clínica | W1–W22+, paralela | produto/clínica | `G98-4` |
| F98-5 — freeze/aceitação/resiliência | após F3/F4, 3–4 semanas | validação | `G98-5` |
| F98-6 — evidência/reauditoria | após G98-0–5, 2 semanas | auditoria | `G98-6–8` |

Horizonte provável: `20–28` semanas depois de T0, com replanejamento para
`30+` quando clínica, providers ou um P0/P1 atrasarem o caminho crítico. O
caminho clínico domina: `763` decisões equivalem a aproximadamente `13`, `16`
ou `20` semanas a `60`, `50` ou `40` itens/semana, antes de calibração,
divergências e retrabalho.

## 3. Ondas de execução

### W0 — Verdade, rubrica e mobilização

- publicar a avaliação pós-hardening e manter `0308/0516/0517` como o único trio executivo Dual 98;
- congelar com sponsor/auditores o significado de `98` e os 32 critérios;
- preservar os snapshots `299→303` e reconciliar U98-005 de `303` para o corte pós-relatório;
- mapear cada evidência U95 a uma célula, ambiente, validade e rerun;
- aprovar T0, owners, capacidade, orçamento, providers, ambientes e auditores.

Saída: `G98-0`. Planejamento pronto não significa execução liberada.

### W1–W2 — Segurança e integridade clínica

- tornar o scanner realmente fail-closed, incluindo candidatos sensíveis,
  worktree/index/history e blobs não examinados;
- manter transaction port obrigatório e provar idempotência HTTP em PostgreSQL
  sob concorrência, timeout, replay, expiração e colisão cross-principal;
- aplicar namespace, clock/cleanup do banco, legado verificável, RLS por role e
  payload canônico mínimo;
- revalidar conta/papel/escopo do aprovador dentro da transação;
- criar transição auditável de revogação/reabertura/reaprovação;
- exigir a invariância de senha também no use case e serializar
  troca/rotação/revogação por generation/lock comum.

Saída parcial: `D98-H01/H02/H03/H06` fechados por RED/GREEN/fault/security review.

### W2–W3 — Operação local e release gates

- derivar readiness de worker de heartbeat, DB e claim/lease/ack na outbox real;
- exigir probes consecutivos A/B e evento sintético claim→ack;
- alertar API e worker down/absent, perda de Alertmanager e dead-man externo;
- corrigir PromQL zero/<1 req/s e colisões de família;
- restringir/cachear diagnostics e remover token de convite do histórico;
- recarregar o Prometheus e provar as regras novas via API/firing; executar fault
  matrix de API/DB/worker/Qdrant/IA.

Saída parcial: `D98-H04/H05` e findings médios fechados.

### W3–W5 — Risco, testes, WebKit e manutenibilidade

- completar `87/87` linhas ou N/A com aprovação explícita;
- elevar cobertura e mutation por risco, não só globalmente;
- manter o denominador reconciliado em `19` e completar `20/20` runs;
- executar Chromium/Firefox/WebKit/mobile e caminho ativo no futuro RC;
- reduzir para zero funções >100 e zero função crítica >50;
- consolidar rotas, schemas, autorização, erros e telemetry em fonte executável.

Saída: `G98-1`, zero P1 local.

### W4–W7 — RC-alpha

- revisar worktree por lote e obter aprovação para commits intencionais;
- provar expand/contract e compatibilidade N/N-1 ou drenar mutações durante o canário;
- formar clean checkout e SHA alcançável;
- produzir imagens release/rollback distintas, SBOM, assinatura, attestation e manifesto;
- executar migrations, E2E ativo, health/readiness, alertas, restore, canário e rollback;
- reter evidence pack alpha e provar reprodução por revisor diferente.

Saída: `G98-2`. `worktree-uncommitted` e rehearsal same-version permanecem inválidos.

### W4–W12 — Fundação externa paralela

1. CI/registry/CD e retenção de artefatos;
2. IdP/MFA/recovery/step-up, DNS e TLS gerenciado;
3. logs/métricas/traces externos, RBAC, retenção, on-call e ack;
4. backup offsite, PITR, restore isolado e DR;
5. multi-host/failure domains, capacity, soak e failover.

Saída: `G98-3`. Nenhum item recebe PASS por configuração não executada.

### W1–W22+ — Produto e fábrica clínica paralelos

- completar 24 módulos, 96 sessões e B-07;
- concluir diagnóstico→trilha→tentativa→correção→recurso→retenção;
- calibrar 25 itens por dupla revisão com threshold aprovado;
- processar lotes de 40–60/semana, conforme capacidade autorizada;
- medir divergência, rework e fila no PostgreSQL;
- aplicar QA independente pós-revisão e zerar fila liberável.

Saída: `G98-4`. Seed, bulk approval ou IA não reduzem a fila válida.

### Após convergência — RC final, aceitação e resiliência

- congelar conteúdo, migrations, configuração e artefatos;
- UAT por papel, turno, dispositivo e estados de falha;
- WCAG 2.2 AA manual, teclado, screen reader, zoom e RUM;
- threat model, SAST/SCA/DAST e pentest independente;
- soak ≥24h, preferencialmente 72h; capacity, failover, restore e DR duas vezes;
- piloto controlado somente se os gates o autorizarem.

Saída: `G98-5`, sem P0/P1 ou P2 material não aceito.

### F98-6 — Proveniência, reauditoria e decisão

- completar `145/145` cadeias no RC final;
- reexecutar verificadores e validar links/digests/validade;
- reter evidence pack content-addressed;
- auditor de maturidade reaplica 16 itens;
- auditor de qualidade reaplica 16 itens;
- qualquer célula <98 reabre o workstream e cria novo RC quando houver patch;
- registrar go/no-go humano.

Saídas: `G98-6`, `G98-7` e `G98-8`.

## 4. Caminho crítico

```text
TÉCNICO
U98-000–005
→ U98-102–117 (U98-114 preauditoria local)
→ U98-201
→ U98-101/202–204
→ U98-301–306
──────────────┐
              ├→ U98-501–507 → U98-601/602 → U98-603/604 → U98-606
CLÍNICO       │
U98-003       │
→ U98-401     │
→ U98-402–405 │
→ U98-406 ────┘
```

O WebKit pertence à plataforma/QA. A fila pertence à autoridade clínica. CI, identidade, TLS, telemetria, backup e HA externos continuam `NOT_EXECUTED` até execução real.

## 5. Paralelismo seguro

- scanner, idempotência, observabilidade e readiness podem avançar em fatias separadas com ownership explícito;
- produto/clínica avança sem publicar enquanto plataforma/RC amadurece;
- IdP, telemetria, backup e CI podem ser provisionados em paralelo após aprovação;
- UAT começa apenas sobre RC estável e dados autorizados;
- reauditorias usam o mesmo RC, embora sejam executadas por autoridades diferentes.

Serializar alterações que compartilhem migration, máquina de estados clínica, composition root, manifesto ou fixture live.

## 6. Métricas de acompanhamento

| Indicador | Partida | Meta de gate |
|---|---:|---:|
| células oficiais ≥98 | `0/32` | `32/32` |
| cadeias completas | `0/145` | `145/145` |
| matriz de risco completa | `11/87` | `87/87` |
| funções >100 | `21` (`22` ≥100) | `0` |
| funções críticas >50 | não inventariado integralmente | `0` |
| cobertura S/B/F/L | `90,43/85,14/93,61/91,84` | pisos de `0308` |
| browser ativo no RC | `0/4` | `4/4` |
| runs de flake observadas | `3/20` | `20/20` |
| decisões clínicas pendentes | `763` no corte | fila liberável `0` |
| achados altos Dual 98 | `6` | `0` |
| rollback versionado | bloqueado | duas execuções válidas |

## 7. Critérios de replanejamento

Replanejar quando throughput clínico real diferir do aprovado, provider/ambiente atrasar o caminho crítico, um P0/P1 surgir, o RC mudar, o denominator de teste mudar materialmente ou um auditor alterar o critério. Não mascarar atraso com redução silenciosa de escopo ou N/A não aprovado.

## 8. Checkpoint pós-hardening — 2026-08-16

A implementação de `docs/132` passou nos gates agregados, mas a revisão de
`docs/133` encontrou propriedades não demonstradas. U98-107–113 ficam
`IN_PROGRESS`; U98-109 continua parcial fora de authoring. A primeira onda é:

```text
U98-005
→ U98-107 scanner
→ U98-108 idempotência live/RLS/legado
→ U98-109 identidade clínica global
→ U98-110 concorrência de sessão
→ U98-111 outbox real
→ U98-112 rules carregadas + API LoS
→ U98-113 contrato/token sem query
→ U98-102–106/115–117
→ U98-114 preauditoria local
```

U98-101 migra para F98-2: depende de commits/artefatos autorizados por U98-201.
Compatibilidade N/N-1 é U98-117 e antecede canário/rollback. O horizonte não é
encurtado; permanecem `PILOT_BLOCKED`, `0/145`, WebKit, fila clínica, RC e
aprovações humanas.
