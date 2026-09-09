# 0300 — BUILD Engineer Master — Programa Premium AAA

**Revisão:** 2026-09-06
**Status:** `IN_PROGRESS` — execução técnica local bounded; próxima onda/live
continua `WAITING_HUMAN_APPROVAL`
**Plano executivo:** [STATE_OF_THE_ART_MASTER_PLAN.md](STATE_OF_THE_ART_MASTER_PLAN.md)
**Roadmap:** [0301_roadmap.md](0301_roadmap.md)
**Backlog:** [0302_backlog_master.md](0302_backlog_master.md)
**Fonte de produto:** `BRIEFING/09.PROJETO_CVG_TREINAMENTO`
**Gate SPEC:** `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md`

## 1. Mandato

Conduzir a evolução do CVG Trainee Vet para uma plataforma premium, State of
the Art e Triplo AAA, sem romper o produto existente, sem inventar regras fora
do PRD/SPEC e sem converter evidência sintética em claim de produção ou de
competência clínica.

O master é o contrato de execução. A visão executiva explica o porquê, o
roadmap explica a sequência e o backlog contém o trabalho verificável.

## 2. Baseline de engenharia

Já existe uma base funcional local:

- monorepo TypeScript strict com 12 workspaces;
- API, web, worker e pacotes de domínio/aplicação/contratos/persistência;
- PostgreSQL como fonte transacional e 54 migrations no worktree corrente;
- RLS, autorização server-side, auditoria, outbox, lease, retry e fencing;
- Qdrant derivado e IA server-side estruturada, assistiva e desligável;
- CI contract, testes unitários/contratuais/worker/integração/E2E sintético;
- `pnpm verify`, build e gates estáticos locais verdes no baseline auditado.

O estado não está pronto para release: a prova live corrente da jornada
diagnóstica completa, operação externa, deploy, restore/failover, conteúdo
clínico aprovado e piloto ainda são gaps.

A revalidação sintética final da jornada passou `43/43` em portas isoladas, com
evidência em `.agent/artifacts/aaa-200-201-e2e-final-2026-09-06.md`;
isso não substitui a prova browser → API → PostgreSQL/RLS.

## 3. Pré-condições e limites

As pré-condições canônicas do BUILD continuam válidas:

- Discovery, PRD e SPEC aprovados;
- documentação transversal 04–08 presente;
- `0300`, `0301` e `0302` coerentes;
- estado, log e backlog lidos antes de cada execução;
- nenhuma task iniciada sem requisito, SPEC, dependências, teste e critério de
  pronto definidos.

Este documento não autoriza deploy, produção, publicação clínica, secrets,
provider/MFA, participantes reais ou migrations irreversíveis sem autoridade
específica.

## 4. Modelo de execução

```text
PHASE → SPRINT → TASK → RED → GREEN → REFACTOR
      → REVIEW → SECURITY REVIEW → AUDIT → RELATÓRIO
```

Cada task deve registrar:

- objetivo observável e ID estável;
- requisito/PRD/SPEC/decisão que a origina;
- arquivos, módulos, migration e contrato afetados;
- dependências e recursos compartilhados;
- ameaça, risco e impacto;
- teste RED, implementação mínima GREEN e REFACTOR;
- evidência, rollback, status e próximo passo.

## 5. Barra de qualidade AAA

Nenhuma média compensa um defeito crítico. A execução só avança quando os
critérios aplicáveis passam:

| Domínio | Regra de saída |
| --- | --- |
| Produto | escopo e métricas aprovados; sem feature inventada durante BUILD |
| Domínio | invariantes puras, estados completos e decisão server-side |
| Dados | constraints, transações, CAS, idempotência, RLS e rollback provados |
| Segurança | deny-by-default, matriz negativa, secrets/supply-chain scan e revisão independente |
| Web | DTO público, loading/error/recovery, WCAG 2.2 AA e cross-scope negativo |
| Worker | lease, retry, replay, fencing, dead-letter e efeitos idempotentes |
| Integrações | Qdrant reconstruível; IA timeout/fallback/fake/evals; nenhuma decisão delegada |
| Operação | logs redigidos, métricas, traces, alertas, runbooks, restore e rollback |
| Clínica | conteúdo autoral, revisão humana e gate antes da publicação |
| Evidência | same-SHA, artefato atual, traceability, auditoria e state/log/backlog coerentes |

## 6. Gatilhos de bloqueio

Marcar `BLOCKED` e preservar a evidência quando ocorrer:

- P0/P1 aberto ou regressão de segurança/integridade;
- dependência externa sem autoridade, ambiente ou credencial autorizada;
- contrato público ou migration em conflito;
- teste vermelho, flaky ou não reprodutível;
- conteúdo clínico sem revisão humana;
- divergência entre plano, backlog, log, estado e código;
- tentativa de usar IA/Qdrant como autoridade do domínio.

## 7. Gates de fase

| Gate | Critério | Evidência |
| --- | --- | --- |
| G0 | plano AAA e quality bar aprovados | decisão de Ricardo + 0301/0302 |
| G1 | trust core sem gap crítico | testes RLS/constraints/idempotência + auditoria |
| G2 | jornada vertical real | browser → web → API → PostgreSQL/RLS |
| G3 | conteúdo aprovado | revisão clínica, pré-voo, versionamento e retirada |
| G4 | release/pilot readiness | CI same-SHA, segurança, observabilidade, DR, UX |
| G5 | piloto encerrado | métricas, incidentes, feedback, auditoria e decisão |
| G6 | AAA interno | relatório independente e todos os gaps tratados |

## 8. Rastreabilidade mínima

```text
PRD/SPEC/DECISÃO
  → AAA epic/task
  → módulo/contrato/migration/documento
  → teste/procedimento
  → resultado/artefato
  → auditoria/gap/remediação
```

O manifesto `traceability.yml` deve apontar para a origem e para a evidência;
um link ou nome de teste não prova comportamento por si só.

## 9. Próxima ação

`AAA-001` continua sendo o próximo passo executivo de governança: revisar e
aprovar a barra AAA, metas propostas e autoridade dos gates. A execução local
bounded de `AAA-101`–`AAA-106` e da fatia visual foi autorizada pela solicitação
atual; ela não libera `AAA-100` live, produção, deploy, publicação clínica ou
piloto. O guard server-side/proxy de operations/authoring foi implementado
localmente com RED/GREEN, revalidado no Round 7 bounded e recebeu crítica fresh
curta `PASS` sem severidade. `AAA-200/201` agora estão fechados localmente com
gaps e contrato `0561`; a crítica independente encontrou um P1 de
projeção/proveniência, corrigido em RED/GREEN, com foco `25/25` e foco ampliado
`108/108`. A releitura posterior retornou `REVISE` e não foi promovida a PASS.
`AAA-205` foi consolidado no contrato `0562` com evidência local bounded. A
próxima dependência de produto é `AAA-202`, somente em ambiente autorizado,
enquanto `AAA-203`/`AAA-204` podem ser selecionados como fatias locais
separadas.
