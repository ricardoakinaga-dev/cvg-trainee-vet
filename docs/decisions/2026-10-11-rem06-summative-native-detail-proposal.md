# AUD-SYSTEM-20261011-SA11 — Proposta de detalhamento da somativa nativa (REM-06)

- **Status:** `WAITING_HUMAN_APPROVAL` — proposta de detalhamento PRD/SPEC do
  boundary aprovado em 2026-10-08; **não implementa** e não destrava SA-12/SA-13
  até aprovação explícita de Ricardo.
- **Task:** `AUD-SYSTEM-20261011-SA11` (plano 62/63). **Origem:** AUD-S-04;
  PROD-M02; backlog 61 G02.
- **Decisões anteriores:** boundary aprovado em
  [`2026-10-08-production-unblock.md`](2026-10-08-production-unblock.md) e
  [`2026-10-02-rem06-summative-eligibility.md`](2026-10-02-rem06-summative-eligibility.md).
- **Implementação atual:** `packages/persistence/src/module-obligation-summative-approval.ts`
  (P3 compõe política aprovada; P2 retorna `null` fail-closed),
  `module-obligation-grade-policy.ts` (RN-022 30/70; RN-023/D-103 70/80),
  `module-obligation-completion*.ts` (receipt transacional) e
  `apps/api/src/composition/correction-completion-options.ts` (ligação em `main.ts`).

## 1. Estado atual comprovado

- A política somativa aprovada já é composta exclusivamente do manifesto
  autenticado + linha de audit `CURRICULUM_MODULE_OBLIGATIONS_APPROVED`
  (cross-check de ator, escopo, recurso e instante); captura divergente lança
  `state_conflict`.
- O produtor de produção retorna `null` por desenho: o contrato de correção
  **não carrega evidência crítica autenticada** (`criticalPercent`,
  `criticalItemCount`), então nenhum receipt somativo é gravado hoje.
- `assessment_results` persiste `score`, `outcome`, `kind`, `feedback`,
  `ruleVersion`, `correctedBy`, `correctedAt` — não persiste contagem de itens,
  contagem de itens críticos nem percentuais.
- O gatilho de conclusão (`module-obligation-completion-trigger.ts`) já lê, na
  mesma transação, tentativa/atribuição/binding/manifesto/blueprint, resultados
  e decisões — mas `ApprovedSummativeGradeEvidence.results` termina vazio na
  produção.

## 2. Delta proposto (para aprovação)

### 2.1 Fonte persistida e autenticada da evidência crítica (recomendado A1)

Estender o resultado de correção com evidência imutável, **computada e
persistida server-side na mesma transação da correção** a partir das versões
congeladas da tentativa (`curriculum_attempt_items`/itens com `critical`):

| Campo | Regra |
| --- | --- |
| `item_count` | inteiro > 0, igual aos itens avaliados na versão congelada |
| `critical_item_count` | inteiro > 0 e ≤ `item_count` |
| `critical_percent` | inteiro 0–100, derivado dos acertos/ajustes aceitos nos itens críticos |
| `overall_percent` | inteiro 0–100, derivado do resultado global da correção |

- Migration nova (0059) com constraints (`critical_item_count <= item_count`,
  percentuais em faixa, contagens positivas) e `SELECT, INSERT` para o papel de
  aplicação (append-only, sem UPDATE/DELETE), alinhada à matriz de
  `scripts/provision-ci-postgres.mjs`.
- Linhas legadas ficam `NULL` e **não** produzem elegibilidade somativa
  (fail-closed); nenhum backfill inventado.
- Alternativa A2 (sem migration, derivação em leitura) fica rejeitada enquanto a
  correção humana de itens `TEXT` não persistir o desfecho por item crítico —
  sem isso, a derivação não teria fonte autenticada.

### 2.2 Contrato de correção (decisão de produto necessária)

- A correção automática calcula os quatro valores a partir do gabarito congelado.
- A correção humana passa a registrar o desfecho por item crítico (aceito/
  rejeitado ou pontuação por item) na mesma transação que grava
  `assessment_results`; sem esse registro, o resultado nasce sem evidência
  crítica e o caminho somativo permanece fechado.
- Este é um delta de PRD/SPEC (UC-006, RF-041/RF-043–047, RN-020–022/RN-026–029);
  exige aprovação específica antes de SA-12.

### 2.3 Produtor e consumidor

- Implementar `createProductionSummativeApproval` para ler `results` das linhas
  autenticadas da própria transação, validando vínculo
  tentativa→atribuição→obrigação→binding, `recordedAt`, `kind`/`outcome` e
  faixas; compor a política P3; decidir por `decideSummativeGrade`; gravar o
  receipt via `recordModuleCompletion` somente em `APROVADO_SOMATIVO`.
- Consumer histórico: expor receipts/nota somativa na leitura de jornada já
  existente (`module-obligation-receipt-reader.ts`, `journey-repository.ts`),
  sem novos campos públicos além do contrato aprovado.
- Publicação clínica permanece bloqueada até H-CONTENT; nenhum receipt é gravado
  sem evidência autenticada.

## 3. Testes de aceitação (RED antes de codificar)

1. Resultado sem evidência (legado/NULL) → nenhum receipt; política não decide.
2. Evidência completa válida → receipt gravado com 30/70 e limiares 70/80.
3. Evidência parcial/tampered (contagens incoerentes, percentual fora da faixa,
   vínculo cruzado) → `state_conflict`/fail-closed, sem receipt.
4. Correção humana sem desfecho por item crítico → sem evidência crítica.
5. RLS/grants: papel de aplicação sem UPDATE/DELETE nas novas colunas; migração
   e `migration-governance` verdes; prova em PostgreSQL descartável.

## 4. Perguntas objetivas para Ricardo (decisão necessária)

1. Aprova o desenho A1 (colunas de evidência persistidas na correção, com
   legado `NULL` fail-closed) como fonte autenticada da somativa?
2. Aprova o delta de contrato da correção humana (desfecho por item crítico)
   no PRD/SPEC, habilitando SA-12/SA-13?
3. Confirma que a aprovação de manifesto/blueprint em produção permanece no
   fluxo editorial interno já existente (papel autorizado), sem novo ator?

Enquanto as respostas não existirem, SA-12/SA-13 permanecem `BLOCKED` e o
sistema segue sem gravar receipts somativos — estado honesto já registrado no
backlog 30 (PROD-M02) e no checkpoint prevalente.
