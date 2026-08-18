# ADR — M02 como recorte piloto de desenvolvimento (seed sintético)

- decision_id: `DEC-ENT95-M02-PILOT-003`
- change_request_id: `CR-ENT95-M02-PILOT-004`
- date: `2026-08-16`
- owner: Ricardo (sponsor/product owner)
- status: `RECORDED_LOCAL` / aprovação clínica pendente
- scope: reabilitar a leitura da fila clínica e do inventário curricular

## 1. Contexto

O snapshot read-only da fila clínica (PostgreSQL HA ativo) identificou que o
módulo `M02` possui `33` itens com `status=PUBLICADO`, todos com o mesmo
timestamp `2026-08-10 16:35:26 UTC`, e **zero** registros em
`content_review_decisions` (nenhuma `APROVAR_CLINICAMENTE`). Os demais `763`
itens permanecem `PROJECAO_VERIFICADA`.

O `curriculum-inventory.json` lista M02 (33 itens, 26 críticos) como pendente,
produzindo um drift entre o inventário (`796` pendentes) e o banco transacional
(`763` pendentes reais + `33` PUBLICADO).

## 2. Decisão

M02 é reconhecido como **recorte piloto de desenvolvimento com dados
sintéticos**, publicado por operação em lote de seed, **não** por decisão
clínica independente. O status `PUBLICADO` é mantido como evidência de recorte
técnico, sem atribuir aprovação clínica.

## 3. Consequências

- A fila clínica liberável real é **763** itens (`PROJECAO_VERIFICADA`), não 796.
- Nenhum item de M02 é contado como "aprovado clinicamente"; o gate estrito
  (`CVG_CLINICAL_REVIEW_REQUIRE_COMPLETE=true`) permanece fechado em `763`.
- Antes de qualquer publicação clínica real de M02, os 33 itens devem ser
  submetidos à revisão independente pela máquina editorial.

## 4. Rollback

Reverter o reconhecimento e resetar os 33 itens para `PROJECAO_VERIFICADA`,
retornando a fila liberável ao denominador `796` e reintegrando M02 ao fluxo de
revisão clínica normal.

## 5. Rastreabilidade

- snapshot read-only: `pnpm ops:verify-clinical-review-queue` (equivalente SELECT);
- inventário: `curriculum-inventory.json` (v1, CVG-CURRICULUM-24M 3.0.0);
- estado registrado em `docs/134_resolution_plan_gaps_2026-08-16.md`.
