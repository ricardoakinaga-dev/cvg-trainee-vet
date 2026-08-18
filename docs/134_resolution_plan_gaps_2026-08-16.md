# 134 — Plano de resolução dos gargalos de prontidão — 2026-08-16

> **Status:** documento de trabalho preparatório. Não altera notas, notas
> congeladas (`83,24/100`, `64,20/100`), `0/145`, `PILOT_BLOCKED`, nem aprova
> conteúdo clínico. Nenhum commit, push, segredo, RC ou publicação foi feito.

Escopo: organizar a resolução dos seis gargalos "não técnicos" conforme as
decisões humanas já coletadas. Produz artefatos de apoio, não evidência de
release.

## 0. Decisões registradas

| Gargalo | Decisão | Próximo passo |
|---|---|---|
| RC imutável | revisar e preparar commits (sem push) | inventário em lote abaixo |
| CI remoto | bundle clínico já existe (local externo) | necessário revelar caminho + credencial read-only |
| IdP/MFA/TLS | decidir depois | comparativo na seção 3 |
| Backup/DR | decidir depois | comparativo na seção 4 |
| UAT/WCAG | definir junto | roteiros na seção 5 |
| Revisão clínica | gerar relatório/tracking | seção 2 |

## 1. Inventário do worktree para commits (RC imutável)

Corte observado (`git status --porcelain` em 2026-08-16):

| Categoria | Entradas |
|---|---:|
| Modificadas (rastreadas) | 175 |
| Não rastreadas | 149 |
| **Total** | **324** |
| HEAD | `1579442f` (`docs: record CI log diagnosis`) |

Concentração (rastreadas + não rastreadas):

| Diretório | Rastreadas | Não rastreadas |
|---|---:|---:|
| packages/persistence | 38 | 18 |
| apps/web | 9 | 50 |
| apps/api | 5 | 26 |
| scripts | 23 | 7 |
| tests/integration | 21 | 5 |
| packages/application | 16 | 3 |
| packages/contracts | 7 | — |
| packages/domain | 5 | 1 |
| packages/curriculum | 4 | 8 |
| docs | 4 | 18 |
| infra/production | 5 | — |
| infra/observability | 3 | 1 |
| apps/worker | 4 | 2 |
| BRIEFING (BUILD/AUDIT/RUNTIME) | 11 | 9 |
| config / raiz (traceability, lockfiles, governance json) | ~10 | — |

**Leitura:** o trabalho acumulado cobre (a) persistência/autoria (idempotência,
0030, RLS), (b) segurança/sessão (senha, revogação), (c) observabilidade
(PromQL, loss-of-signal), (d) web (dashboard/a11y) e (e) documentação. O lote
`docs/` não rastreado (18) são os relatórios 117–133 desta rodada.

**Proposta de lotes de commit** (para sua revisão antes de qualquer `add`):

1. `docs:` relatórios de auditoria/avaliação 2026-08-16 (docs/ 116–133).
2. `fix(security):` scanner fail-closed, senha/sessão serializada (RH01/RH02).
3. `feat(authoring):` idempotência + 0030 + identidade clínica (RH03/RH05).
4. `feat(observability):` PromQL/rules/loss-of-signal (RH04).
5. `fix(web):` contrato/diagnostics/token sem query (RH06-adjacente).
6. `chore:` governança (traceability, risk matrix, skip/evidence).

> Regra: nenhum `git add`/`commit`/`push` executa sem sua aprovação explícita do
> diff de cada lote. Reset/checkout destrutivo continua proibido.

## 2. Fila clínica — priorização e tracking (763 itens)

Fonte autoritativa: `curriculum-inventory.json` (CVG-CURRICULUM-24M v3.0.0).

Total: **24 módulos, 96 sessões, 796 conteúdos, 763 pendentes**, 0 aprovados, 0
falhas técnicas (corte transacional `docs/106`).

Prioridade por **itens críticos** (mais críticos primeiro):

| # | Módulo | Itens | Críticos | Ordem |
|---:|---|---:|---:|---|
| 1 | M02 | 33 | 26 | 1 |
| 2 | M24 | 35 | 12 | 2 |
| 3 | M12 | 35 | 11 | 3 |
| 4 | M01 | 33 | 9 | 4 |
| 5 | M03–M11 | 33 cada | 9 cada | 5–13 |
| 6 | M13–M23 | 33 cada | 9 cada | 14–24 |

### Projeção de calendário (roadmap `0516`)

| Itens/semana | Semanas p/ 763 | Observação |
|---:|---:|---|
| 40 | ~20 | sem folga p/ calibração/retrabalho |
| 50 | ~16 | alvo nominal |
| 60 | ~13 | requer mais de 1 revisor dedicado |

> A calibração (25 itens por dupla revisão) e a taxa de divergência/rework são
> medidos no PostgreSQL; a projeção não substitui o throughput real.

### Painel de tracking (métricas a medir por lote)

```
pendentes, aprovados, ajustes_solicitados, falhas_técnicas
divergência (decisões 1ª vs 2ª revisão)
rework (itens reabertos)
fila liberável (aprovados sem QA pendente)
```

Próxima ação: executar `pnpm ops:verify-clinical-review-queue` (read-only) e
registrar o snapshot inicial deste tracking; nenhum item é aprovado nesta etapa.

## 3. Comparativo — Identidade (IdP/MFA/recovery)

| Critério | Keycloak self-hosted | Provedor gerenciado (ex. Auth0/Clerk/WorkOS) |
|---|---|---|
| Custo | infra própria (VM + tempo de SRE) | assinatura por MAU |
| MFA/step-up/recovery | nativo, configurável | nativo, pronto |
| Controle de dados | total (on-prem/hospitalar) | dados em nuvem do provedor |
| Esforço p/ G98-3 | alto (deploy+operação) | baixo (integração) |
| Governança/auditoria | integralmente sua | depende do SLA/logs do provedor |
| Aderência ao PRD (server-side, desligável) | alta | média (fora do seu domínio) |

Recomendação neutra para decisão sua: avaliar **Keycloak** se a exigência for
dado sob controle próprio (contexto hospitalar); **gerenciado** se o objetivo é
fechar G98-3 mais rápido com risco de dependência externa. O probe
`verify-identity-provider-readiness.mjs` já suporta ambos (HTTPS + `/v1/.../security`).

## 4. Comparativo — Backup offsite / PITR / DR

| Critério | restic + storage (S3/Wasabi) | rclone + storage | AWS RDS (PITR gerenciado) |
|---|---|---|---|
| PITR | via WAL archive próprio | igual | nativo |
| RPO ≤ 1h | alcançável (WAL) | alcançável | nativo (5 min) |
| RTO ≤ 4h | depende do restore drill | igual | nativo + snapshot |
| Custo | storage + automação | storage | maior (RDS instance) |
| Controle | total | total | parcial (gerenciado) |
| Esforço | médio (script já existe) | médio | baixo (config) |

> Os scripts locais (`backup-artifact.mjs`, `verify-postgres-restore.mjs`) já
> cobrem dump+manifest+SHA-256+restore isolado. Falta só destino/agendamento/
> retenção + 2 drills para medir RPO/RTO reais.

## 5. UAT e WCAG manual — roteiro inicial

**UAT por papel** (a validar com você): participante, aprovador clínico,
moderador, administrador. Por turno/dispositivo (desktop Chromium/Firefox,
WebKit/Safari, mobile).

**WCAG 2.2 AA manual (checklist mínimo):**

- [ ] teclado completo (tab order, focus visível, sem trap);
- [ ] screen reader (NVDA/VoiceOver) nas jornadas críticas;
- [ ] zoom 200%/300% sem perda de função (reflow);
- [ ] contraste ≥4,5:1 texto (hoje há ~2,91:1 e ~3,1:1 a corrigir);
- [ ] motion/timing ajustáveis (prefers-reduced-motion);
- [ ] labels/erros/estados anunciados.

**Metas de Vitals (do PRD):** p75 LCP ≤2,5s, INP ≤200ms, CLS ≤0,1 via RUM real.

## 6. Próximas ações imediatas

1. Você revisa os lotes de commit da seção 1 → autoriza (ou não) o `git add`.
2. Você fornece caminho + credencial do bundle clínico (CI) e escolhe IdP/backup.
3. Eu executo `verify-clinical-review-queue` e registro o snapshot de tracking.

Nenhuma das ações acima promove nota, RC, piloto ou publicação clínica.
