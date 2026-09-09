# 0301 — Roadmap Executivo e Operacional — Programa AAA

**Revisão:** 2026-09-06
**Status:** `IN_PROGRESS` — execução técnica local bounded; G0 operacional
continua `WAITING_HUMAN_APPROVAL`
**Plano executivo:** [STATE_OF_THE_ART_MASTER_PLAN.md](STATE_OF_THE_ART_MASTER_PLAN.md)
**Backlog:** [0302_backlog_master.md](0302_backlog_master.md)

## 1. Como ler este roadmap

Este é um roadmap de gates, não uma promessa de calendário. As durações são
indicativas e dependem da capacidade da equipe, de ambiente autorizado e da
revisão clínica de Ricardo. Uma fase só termina com evidência; completar código
sem teste, revisão e auditoria não fecha a fase.

O horizonte de referência é de 18–27 semanas com uma equipe pequena, podendo
ser encurtado por paralelização segura ou ampliado por decisões clínicas,
ambiente e incidentes.

## 2. Visão por ondas

| Onda | Janela indicativa | Resultado | Gate |
| --- | --- | --- | --- |
| 0 — Controle | semanas 0–2 | plano, barra, estado e evidência sincronizados | G0 |
| 1 — Trust core | semanas 2–6 | integridade, RLS, auth e dados sem P1 crítico | G1 |
| 2 — Jornada | semanas 5–10 | diagnóstico até próxima ação no boundary real | G2 |
| 3 — Conteúdo | semanas 8–14 | autoria e conteúdo clínico revisados | G3 |
| 4 — Experiência | semanas 10–16 | UX por papel, acessibilidade e métricas | revisão F4 |
| 5 — Intelligence | semanas 13–19 | mastery/retrieval/adaptive/IA segura | revisão F5 |
| 6 — Plataforma | semanas 14–21 | observabilidade, DR, performance e release | G4 |
| 7 — Piloto | semanas 21–27 | piloto controlado, auditoria e decisão | G5/G6 |

As janelas não autorizam uso de dados reais nem modificam gates humanos.

## 3. Fases executáveis

### Phase 0 — Rebaseline, control plane e barra AAA

**Tasks:** `AAA-000`, `AAA-001`, `AAA-002`, `AAA-003`
**Objetivo:** retirar drift dos documentos, aprovar quality bar e controlar a
primeira onda. A solicitação atual também autoriza fatias técnicas locais
bounded, sem converter isso em aprovação de metas operacionais ou piloto.
**Saídas:** plano executivo, roadmap, backlog, matriz de evidência, decisão de
metas e estado/log atualizados.
**Dependências:** nenhuma além dos gates já aprovados.
**Saída:** G0 aprovado.

### Phase 1 — Trust core: integridade, segurança e identidade

**Tasks:** `AAA-100`–`AAA-107`
**Objetivo:** eliminar defeitos de RLS e consistência descobertos na auditoria,
provar idempotência/concurrency e fechar reidratação/auth.
**Saídas:** migrations forward-only, testes negativos, harness live, matriz de
autorização e surfaces internas protegidas antes da autorização.
**Dependências:** G0; ambiente PostgreSQL descartável para provas live.
**Saída:** G1, sem P1 de segurança/integridade aberto.

### Phase 2 — Jornada vertical do participante

**Tasks:** `AAA-200`–`AAA-205`
**Objetivo:** provar diagnóstico formativo → assignment server-side → atividade
→ tentativa → feedback → próxima ação, com retomada e falhas observáveis.
**Saídas:** contrato de jornada, E2E real, assignment produzido pelo fluxo,
replay/idempotência e UX de loading/error/recovery.
**Dependências:** G1 e contratos `0560`/`0561`/`0562` revisados.
**Saída:** G2.

### Phase 3 — Autoria, conteúdo e governança clínica

**Tasks:** `AAA-300`–`AAA-305`
**Objetivo:** tornar autoria, revisão, ajustes, resubmissão, publicação,
retirada e validade auditáveis; fechar B-07/M02 somente com revisão humana.
**Saídas:** workflow four-eyes, conteúdo interno, pré-voo, seed permitido e
decisão de publicação.
**Dependências:** G1; decisões humanas de escopo clínico.
**Saída:** G3.

### Phase 4 — Experiência, acessibilidade e operação por papel

**Tasks:** `AAA-400`–`AAA-406`
**Objetivo:** elevar participante, autor, facilitador e coordenação a uma
experiência premium, sem colocar autorização no cliente.
**Saídas:** design system coerente, WCAG 2.2 AA crítica, error recovery,
dashboard agregado e boundary público revisado.
**Dependências:** contratos das phases 1–3.
**Saída:** revisão UX/privacidade aprovada.

### Phase 5 — Learning intelligence explicável

**Tasks:** `AAA-500`–`AAA-504`
**Objetivo:** medir e melhorar aprendizagem digital sem simular competência
prática.
**Saídas:** mastery determinístico, retrieval, remediação, retenção,
`NextBestLearningActionService` e métricas de efetividade.
**Dependências:** jornada e conteúdo aprovados; PRD/SPEC complementados se a
regra alterar o produto.
**Saída:** revisão pedagógica e técnica.

### Phase 6 — Plataforma operacional e release engineering

**Tasks:** `AAA-600`–`AAA-607`
**Objetivo:** operar, detectar, recuperar e liberar com confiança.
**Saídas:** OTel/metrics/alerts, SLOs aprovados, manifests, CI same-SHA,
SBOM, carga, backup/restore, rollback, incident runbooks e privacy/retention.
**Dependências:** superfície crítica integrada; autoridade de ambiente.
**Saída:** G4.

### Phase 7 — IA, Qdrant e evals de segurança

**Tasks:** `AAA-700`–`AAA-704`
**Objetivo:** maximizar assistência de autoria/revisão sem transferir decisão
ao modelo ou ao índice derivado.
**Saídas:** provider adapter robusto, quotas, timeout, fallback, reconciliação,
evals de injection/PII/groundedness e aprovação humana.
**Dependências:** G1, conteúdo versionado e observabilidade.
**Saída:** revisão de segurança/IA.

### Phase 8 — Readiness, piloto e auditoria AAA

**Tasks:** `AAA-800`–`AAA-805`
**Objetivo:** executar um piloto controlado, medir, aprender e decidir se o
programa pode avançar.
**Saídas:** readiness pack, protocolo, baseline, piloto, relatório de gaps,
plano de remediação e auditoria independente.
**Dependências:** G3 e G4; autorização humana e operacional.
**Saída:** G5/G6.

## 4. Paralelização segura

Podem ocorrer em paralelo depois de G0:

- `AAA-400` UX, sem alterar contratos/API;
- `AAA-600` observabilidade/CI, sem tocar migrations de produto;
- `AAA-700` adapters/evals, sem mudar decisão de domínio;
- conteúdo em rascunho, desde que permaneça fora da publicação e use somente
  dados permitidos.

Não podem ocorrer em paralelo no mesmo recurso:

- duas migrations ou alterações na mesma tabela;
- dois donos do mesmo contrato público;
- mudança de estado/backlog/log/runtime por escritores diferentes;
- publicação clínica e implementação de regra clínica não aprovada.

## 5. Sprints e cadência

Cada sprint deve conter 5–10 tasks coesas e seguir:

```text
planejar → RED → GREEN → REFACTOR → review independente
→ checks proporcionais → auditoria de sprint → relatório → próximo gate
```

Cerimônias mínimas:

- início: dependências, contratos, risco e evidência esperada;
- checkpoint: status, blocker, drift e consumo de recursos;
- encerramento: diff, testes, auditoria, rollback e decisão;
- recuperação: revalidar state/log/backlog antes de repetir uma hipótese.

## 6. Caminho crítico de aprovação

```text
G0 → AAA-100/101/102 → AAA-103/104/105
   → AAA-200/201/202 → AAA-300/301/302
   → AAA-600/603/604/605 → AAA-800/801/805
```

Se `AAA-101` ou `AAA-102` confirmar defeito em produção, o caminho para G2
volta para `IN_PROGRESS` e a jornada não é promovida por causa de testes
sintéticos verdes.

## 7. Rollback e stop conditions

- Código: rollback por commit/fatia ou correção forward revisada.
- Banco: migration nova e compatível; nunca resetar dados reais.
- Worker/Qdrant: replay/reconcile a partir do PostgreSQL.
- Conteúdo: retirar versão publicada sem apagar histórico.
- Piloto: abortar em incidente P0, exposição, perda de integridade ou sinal
  clínico não previsto.
- Qualquer stop mantém artefatos, falha e evidência; não reclassifica como
  `PASS`.

## 8. Próxima ação

A rodada técnica corrente corrigiu o P1 encontrado no Gauntlet Round 6 e foi
revalidada no Round 7 bounded e no Round 8 visual: os testes focais do proxy
passaram `11/11`, o foco de autorização `12/12`, `pnpm verify` passou, o E2E
final passou `43/43` (artefato
`.agent/artifacts/aaa-200-201-e2e-final-2026-09-06.md`) e a visual corrente
`7/7`, usando upstream local que
exige cookie. `AAA-200/201` foram congelados no contrato `0561`; uma crítica
independente encontrou um P1 de projeção/proveniência, corrigido em RED/GREEN,
com focal pós-correção `25/25` e foco ampliado `108/108`. A releitura posterior
retornou `REVISE` por não inspecionar sob a restrição declarada, portanto não é
registrada como PASS. A resiliência de acesso/recuperação foi consolidada no
contrato `0562`, usando os estados e E2E já existentes. O preflight live ainda
exige `CVG_TEST_DATABASE_URL`. A decisão de G0 em `AAA-001`, o ambiente
descartável autorizado e revisão independente adequada continuam necessários
antes de `AAA-202`, live, produção, publicação clínica, deploy ou piloto.
