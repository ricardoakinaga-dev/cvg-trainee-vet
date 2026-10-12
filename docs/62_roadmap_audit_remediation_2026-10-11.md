# 62 — Roadmap de remediação da auditoria de 2026-10-11

**Entrega do planejamento:** COMPLETED nesta rodada. **Execução:** READY a partir
de SA-01, sem início automático; nenhuma correção, commit, push, deploy ou
publicação foi iniciada para produzir este documento.
**Origem:** [auditoria de sistema de 2026-10-11](audits/system-audit-2026-10-11.md)
(17 itens, média ponderada 84/100; achados AUD-S-01…AUD-S-10).
**Backlog detalhado:** [63 — tasks, dependências e aceite](63_backlog_audit_remediation_2026-10-11.md).
**Continuidade:** [estado](99_runtime_state.md), [log](20_master_execution_log.md)
e [backlog mestre](30_backlog_master.md).

## 1. Objetivo e precedência

Eliminar os achados AUD-S-01…AUD-S-10, renovar a evidência do candidato no HEAD
corrigido e levar o sistema à prontidão de piloto formativo controlado, sem
inventar produto, sem reduzir gates e sem transformar nota em autorização de
release.

Este recorte complementa — não substitui — o BUILD canônico 0300–0302, o
[roadmap 60](60_roadmap_repository_remediation_2026-10-03.md) e o
[backlog 61](61_backlog_repository_remediation_2026-10-03.md) e as melhorias
PROD-M01…M27 de `docs/30_backlog_master.md`. Onde há sobreposição, a task 63
declara o delta e o critério de revalidação, sem exigir segunda implementação
do mesmo comportamento. Requisitos e decisões aprovados do PRD/SPEC continuam
superiores a este plano; divergência funcional exige reconciliação explícita.

## 2. Baseline e gates de entrada

Baseline de entrada (auditoria de 2026-10-11, HEAD
`1ae1f8d53733be2afa8bcf9fc7a1dfcfdfe0fb34`, Node 22.23.2/pnpm 10.33.0):

- `pnpm verify` EXIT 0 (23 gates; 3.929 PASS/212 skip; cobertura
  91,07/86,97/95,07/92,40); audit de dependências 0 vulnerabilidades;
- integração live em PostgreSQL 18.4 descartável: 882 PASS/103 skip/0 FAIL
  (remediação CI-LIVE-01…05 de `2420ffb` confirmada localmente);
- browser 290/290; E2E mockado 45/45; E2E real browser→proxy→API→PostgreSQL 2/2;
- `verify:triple-aaa` FAIL (1 fatal + 16 REVISE; P0=0/P1=0/P2=9; Eng 94/Sec 95/
  Ops 90,8; readiness `NOT_VERIFIED`) e `verify:aaa-candidate` FAIL (9 gates),
  por cadeia de evidência obsoleta (candidato `3cd7bc3`) e same-SHA ausente;
- `origin/main` em `c5cb444`; commits `2420ffb` + `1ae1f8d` não publicados.

Gates de entrada documentais: SPEC 0190 aprovada; `0300`/`0301`/`0302` presentes;
documentos 04–08 completos; `verify:documentation`, `verify:traceability`,
`verify:product-definition` e `git diff --check` PASS no estado atual. Estes
números são a observação da auditoria, não resultados futuros do plano.

## 3. Fases, sprints e resultados

SA-xx são os IDs de `AUD-SYSTEM-20261011-SAxx` definidos no backlog 63.

| Fase | Sprints e tasks | Resultado esperado | Gate de saída |
| --- | --- | --- | --- |
| **A0 — Evidência remota e candidato** | S0.1: SA-01/SA-02; S0.2: SA-03/SA-04; S0.3: SA-05 | `quality`+`security` verdes no mesmo SHA; candidato re-congelado com mutação/k6/RLS/Redis/staging e bundle completo; revisão independente fresh; same-SHA provado | **GA0:** `verify:same-sha --require-auth --require-candidate` PASS e `verify:triple-aaa` sem fatal no SHA do candidato; decisão same-UID registrada |
| **A1 — Produto e clínica** | S1.1: SA-10/SA-11; S1.2: SA-12/SA-13; S1.3: SA-14; S1.4: SA-15 | Revisão clínica item a item M02→B-07; produtor nativo do inventário/audit e receipts somativos com prova PostgreSQL; holdovers T13–T24/T07/T31 fechadas com crítica fresh; ≥1 módulo clínico `PUBLICADO` com audit | **GA1:** módulo `PUBLICADO` com audit de aprovação e sem fonte exposta (D-109); somativa 30/70 com limiares 70/80 gravando receipts em prova live; holdovers COMPLETED |
| **A2 — Ambiente e operação** | S2.1: SA-20; S2.2: SA-21/SA-22/SA-23/SA-24; S2.3: SA-25/SA-26/SA-27 | Homologação provisionada e implantada; backup/restore cronometrados (RPO ≤1 h / RTO ≤4 h); alerta sintético recebido em <5 min; k6 a 3× D4; HTTPS real com `TRUSTED_PROXIES`; aceitação manual/AT; branch protection e rotação de segredos ensaiada | **GA2:** deploy com smoke em homologação, alerta recebido, restore medido, carga dentro do SLO, E2E real por HTTPS, zero P0/P1 de UX na aceitação |
| **A3 — Piloto e reauditoria** | S3.1: SA-30/SA-31; S3.2: SA-32 (+SA-40 em qualquer janela) | Coorte formativa controlada com IA/Qdrant desligados e métricas de produto; reauditoria completa com runtime real e matriz 0–100 atualizada | **GA3:** auditoria final sem P0/P1 abertos no escopo promovido e decisão humana de aceite/produção registrada |

Cada sprint encerra com testes, review técnico/segurança, auditoria da sprint,
relatório de entregas/gaps/riscos/ajustes/próxima ação e backlog atualizado.
Concluir uma sprint não conclui automaticamente a fase nem um gate remoto.

## 4. Ordem de seleção e dependências

Primeira task recomendada: **SA-01** (publicar `2420ffb`+`1ae1f8d` e disparar
`quality`/`security` same-SHA; H-REMOTE vigente). SA-02 depende do resultado
remoto; SA-03 pode preparar Stryker/k6/summaries em paralelo quando a árvore
estiver estável, mas só congela o candidato após SA-01/SA-02. SA-05 é decisão
humana independente e não bloqueia SA-01…SA-04; condiciona a promoção da
assurance.

Fluxo crítico de evidência:

```text
SA-01 → SA-02 → SA-03 → SA-04 → GA0
SA-05 (decisão same-UID) ─────────↗ (condição de promoção)
SA-11 → SA-12 → SA-13 ─┐
SA-10 → SA-15 ─────────┼→ GA1
SA-14 ─────────────────┘
SA-20 → SA-21/22/23/24 → SA-25/26/27 → GA2
SA-30 → SA-31 → SA-32 → GA3
```

## 5. Capacidade e paralelização

Frentes possíveis: release/CI (SA-01…04), clínica/produto (SA-10…15), operação
(SA-20…27) e reauditoria (SA-32). Um responsável integra o resultado e escreve
estado/log/backlog; o implementador não é o revisor independente da própria
evidência; estado/log/backlog têm um único escritor por rodada.

Arquivos de coordenação (não editar concorrentemente sem combinação):
`apps/web/app/page.tsx`, página de autoria, contratos de tentativa,
`packages/persistence/drizzle/**`, `pnpm-lock.yaml`, `traceability.yml`,
checkpoint do candidato e workflows. SA-14 (holdovers) deve integrar após as
mudanças comportamentais dos módulos que toca; SA-32 corre depois de todo o
escopo que compõe o ambiente auditado.

## 6. Gates humanos e dependências externas

| Boundary | Trabalho preparável agora | Condição para fechar/promover |
| --- | --- | --- |
| H-REMOTE (push/dispatch) | SA-01/SA-02: executar push e acompanhar runs | Autoridade vigente; registrar run IDs por SHA |
| Same-UID (G03) | SA-05: consolidar opções de isolamento do harness | Ricardo decide isolamento ou limitação formal aceitável |
| H-CONTENT / revisão clínica | SA-10/SA-15: pacote M02→B-07, revisão item a item | Aprovação de Ricardo por item; ≥1 módulo antes de publicar |
| REM-06 / somativa | SA-11/SA-12/SA-13: detalhar fontes/contratos conforme boundary aprovado | Detalhamento PRD/SPEC aceito; implementação com prova live |
| VPS/homologação | SA-20: contratação e dados não secretos (host, DNS, acessos) | Ricardo fornece dados e acesso; GA2 medido |
| Piloto D5 | SA-30: escopo da coorte, métricas e consentimento | Decisão de Ricardo sobre escopo/coorte antes de executar |
| Aceite de produção | SA-32: decisão final | GA0–GA3 verdes, P0/P1 zerados, aceite humano registrado |

Essas dependências não são novas perguntas de aprovação desta entrega; as
decisões já registradas permanecem válidas.

## 7. Metas de nota por item (referência, não promessa)

Alvo pós-remediação, referente à matriz da auditoria de 2026-10-11:
item 3 (conteúdo clínico) 52→≥85; item 9 (jornada/produto) 70→≥85; item 10
(somativa/governança clínica) 62→≥85; item 12 (observabilidade/operação)
72→≥90; item 15 (CI/release) 52→≥90; item 16 (infraestrutura) 55→≥85; item 17
(rastreabilidade) 72→≥90; itens 1–8, 11, 13 e 14 mantêm ≥90 com a regressão.
Média ponderada esperada ≥92 **se e somente se** os gates GA0–GA3 tiverem
evidência real; a nota não autoriza dispensar gate, RLS, validação ou aceite.

## 8. Cobertura dos achados

| Achados (auditoria 2026-10-11; PROD-M/OP/SE/PR/DA/QA/IA/GO) | Destino |
| --- | --- |
| AUD-S-01, QUALITY/security same-SHA (M07/T01/T02) | SA-01/SA-02/SA-04 |
| AUD-S-06, mutação/k6/otel/ratelimit/digests (M13/QA-02/QA-03) | SA-03 |
| AUD-S-02, conteúdo clínico 0/153 (M03/H-CONTENT) | SA-10/SA-15 |
| AUD-S-04, somativa/receipts (M02/REM-06/P1/P2) | SA-11/SA-12/SA-13 |
| AUD-S-05, holdovers T13–T24/T07/T31 (M12/M23/M25) | SA-14 |
| AUD-S-03, ambiente/observabilidade/convites (M05/M06/M10/M11/M14/M15/M16/M18/OP-05/OP-06) | SA-20…SA-27 |
| AUD-S-07, RPO/RTO/carga (M14) | SA-21/SA-23 |
| AUD-S-08, Qdrant/Redis/IA (M17/G06) | SA-03/SA-30 |
| AUD-S-09, Node 22/estado extenso (M27/GO-02) | SA-40 |
| same-UID pendente (G03/T34) | SA-05 |

## 9. Critérios comuns de encerramento e rollback

Toda task de código segue RED → GREEN → REFACTOR, com caso que detecta o
defeito, checks proporcionais, review técnico/segurança e revisão independente.
Pisos de cobertura 90/85/90/90 mantidos; invariantes críticos com cobertura de
decisão completa. Fixar relógio não pode mascarar replay; apagar teste não pode
corrigir seleção; inventar ID não pode satisfazer mutação; nenhuma task fecha
com gate vermelho, SKIP ou NOT_EXECUTED convertido em PASS.

Rollback comum: reverter somente a fatia isolável quando houver autorização de
execução/commit, ou aplicar correção forward revisada, mantendo o gap aberto.
Migrations nunca resetam dados reais; índice derivado reconstruído do
PostgreSQL; retirada clínica preserva histórico. Falha ou incidente interrompe
a promoção, preserva evidência e reabre a task aplicável. Aceite de piloto
depende dos gates deste plano **e** das decisões humanas da seção 6.

**Próximo passo:** SA-01, quando a execução for selecionada. O planejamento
solicitado está concluído.
