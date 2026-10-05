# 60 — Roadmap de remediação da auditoria de 2026-10-03

**Entrega do planejamento:** COMPLETED. **Execução das correções:** IN_PROGRESS desde 2026-10-03; objetivo integral R0–R6 autorizado e registrado no ExecPlan.
**Origem:** [auditoria com 51 notas e 34 achados](audits/repository-audit-2026-10-03.md).
**Backlog detalhado:** [61 — tasks, dependências e aceite](61_backlog_repository_remediation_2026-10-03.md).
**Continuidade:** [estado](99_runtime_state.md), [log](20_master_execution_log.md) e [backlog mestre](30_backlog_master.md).

## 1. Objetivo e precedência

Eliminar os achados A01–A34, renovar a evidência do candidato corrigido e
encaminhar os gaps operacionais, somativos, de confiança e clínicos já abertos.
O resultado esperado é comportamento correto e demonstrado, não uma elevação
arbitrária das notas ou uma média que compense gates vermelhos.

Este é o recorte corrente de remediação derivado da auditoria de 2026-10-03.
Complementa o BUILD canônico 0300–0302 e detalha os onze épicos
AUDIT-20261003 registrados no backlog mestre. Os planos
[58](58_roadmap_repository_remediation_2026-10-01.md),
[59](59_backlog_repository_remediation_2026-10-01.md) e
[SOA](57_backlog_state_of_art.md) preservam o histórico e os estados REM/SOA.
Quando há sobreposição, a task abaixo especifica o delta ou o critério de
revalidação, sem exigir uma segunda implementação do mesmo comportamento.

As próximas ações deste recorte prevalecem sobre propostas antigas de seleção
de tasks; requisitos e decisões aprovados do PRD/SPEC continuam superiores ao
plano. Divergência funcional exige reconciliação explícita, não regra inventada.

## 2. Baseline e gates de entrada

O baseline observado usa Node 22.23.2/pnpm 10.33.0, HEAD
`3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff` mais worktree dirty. Coverage:
1.571 PASS/69 skipped, pisos 90/85/90/90 atingidos; E2E comum 45/45;
PostgreSQL live 245 PASS/2 FAIL/16 skipped; modo E2E real 30 PASS/16 FAIL,
incluindo participante real PASS. RLS, Redis e restore sintético passaram.
Complexidade, audit dev, candidate e evidência de certificação têm gaps.
Esses números são a observação da auditoria, não resultados futuros do plano.

O gate [SPEC 0190](../BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md)
está aprovado; 0300/0301/0302 existem; os gates
[0390](../BRIEFING/03.BUILD/0390_build_readiness.md) e
[0391](../BRIEFING/03.BUILD/0391_documentation_gate.md)
registram a aprovação documental transversal 04–08. Antes de executar código,
G01 reconfirma o snapshot, as dependências e os contratos da fatia selecionada.
Testes vermelhos conhecidos não impedem escrever o RED correspondente; impedem
promover a task ou o candidato como aprovado.

O pedido atual autoriza estes documentos de planejamento. A execução do produto
é uma próxima etapa; este roadmap não inicia correções, commit, CI remota,
deploy, piloto ou publicação clínica. H-LIVE previamente registrado permanece
válido no seu ambiente sintético local, sem pedir nova autorização equivalente.

## 3. Fases, sprints e resultados

T01–T34 significam `AUDIT-20261003-T01`–`T34`; G01–G10 significam
`AUDIT-20261003-G01`–`G10`, definidos no backlog 61. Todos os trabalhos abaixo
permanecem sem execução nova. R0 inclui a entrega documental já concluída;
G01 é o preflight obrigatório da futura fatia de código.

| Fase                                     | Sprints e tasks                                                  | Resultado esperado                                                                                          | Gate de saída                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| R0 — Preparar execução                   | S0: G01; roadmap/backlog entregues                               | Baseline, gates e responsável da fatia identificados                                                        | GR0: preflight atual válido; documentação ligada                                                                            |
| R1 — Respostas, identidade e regressões  | S1.1: T13/T14/T15/T16/T33; S1.2: T01/T02/T06/T08/T12/T25         | Replay estável, última edição submetida, respostas retomadas, rascunho isolado; testes PG/E2E coerentes     | GR1: casos discriminantes e comandos afetados passam, sem afrouxar autorização/publicação                                   |
| R2 — Coerência educacional               | S2.1: T17/T18/T19; S2.2: G02                                     | Conclusão separada de domínio; avaliação versionada; retenção conforme PRD; somativa no boundary aprovado   | GR2: cenário quiz completo/caso pendente, vínculo de tentativa e formas equivalentes provados; somativa somente com decisão |
| R3 — Resiliência, operação e experiência | S3.1: T20/T21/T22/T23/T24/T26/T27; S3.2: T28/T29/T30/T31/T32/T07 | Leases/indexação/shutdown seguros; auditoria e erros coerentes; navegação/relatórios/a11y robustos          | GR3: concorrência, falha parcial e UX discriminantes passam; complexidade dentro dos budgets                                |
| R4 — CI e integridade da evidência       | S4.1: T03/T09/T10/T04/T05; S4.2: T11/T34/G03/G04                 | Freshness correta, candidate sem circularidade, índice documental corrente e continuidade REM reconciliados | GR4: verificadores falham fechado; decisões de confiança registradas; revisão C10 válida no próprio snapshot                |
| R5 — Integrações, operação e candidato   | S5.1: G06/G07; S5.2: G05                                         | Integrações e operação avaliadas no recorte autorizado; candidato estável com mutação/evidência genuínas    | GR5: identidade/digests/IDs atuais, regressão local completa e revisão independente válidas                                 |
| R6 — Validação remota e aceite           | S6.1: G08/G09; S6.2: G10                                         | Runs same-SHA, revisão clínica no seu boundary e auditoria final com decisão de aceite                      | GR6: nenhum P0/P1 aberto no escopo promovido; evidência operacional e aprovações aplicáveis presentes                       |

Cada sprint encerra com testes, review técnico/segurança, auditoria da sprint,
relatório de entregas/gaps/riscos/ajustes/próxima ação e backlog atualizado.
Concluir uma sprint não conclui automaticamente a fase nem um gate remoto.

## 4. Ordem de seleção e dependências

A primeira task técnica recomendada continua sendo **T13 — replay**, depois
do preflight G01. T14/T15 dependem desse contrato estável. T16/T33 e a correção
dos testes editoriais podem avançar em uma frente independente; T01 e T02
devem fechar antes da certificação, mesmo quando a jornada participante passa.

O fluxo crítico de evidência é:

```text
G01 → correções locais aplicáveis → regressão e revisão das sprints
    → T03/T09/T10 + T04/T05 + T11/T34
    → G03/G04 + G06/G07 + G02 quando somativa estiver no escopo
    → G05 candidato estável/mutação → G08 remoto → G10 aceite final
                                              G09 clínica ↗
```

As fases ordenam a integração, não impõem uma fila artificial a toda task.
G02/G03/G09 podem coletar decisões em paralelo; ausência de decisão restringe
somente o boundary correspondente. O núcleo formativo, documentação, testes
locais e rascunhos internos podem continuar sem publicar conteúdo clínico.

## 5. Capacidade e paralelização

São 12 sprints de implementação/validação, além do preflight S0. Sprint aqui
é um agrupamento de entregas verificáveis, não uma duração fixa. Datas e esforço
serão estimados ao selecionar as tasks, após reprodução dos achados estáticos
e identificação da capacidade. Este plano não promete prazo de release.

Frentes possíveis: backend/dados; web; gates/CI. Um responsável integra o
resultado e escreve estado/log/backlog. Os donos no backlog são papéis sugeridos,
não pessoas já alocadas.

Pode haver paralelismo entre contratos independentes. Não compartilhar sem
coordenação `apps/web/app/page.tsx`, a página de autoria, contratos de tentativa,
migrations, lockfile ou scripts de candidate. T07 deve integrar após as
mudanças comportamentais dos módulos que decompor; T33 precede a regressão
de recuperação editorial. G05 ocorre depois da integração das correções que
compõem o candidato e renova evidência se esses bytes mudarem.

## 6. Gates humanos existentes

| Boundary                     | Trabalho preparável agora                                 | Condição para fechar/promover                                                                    |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| REM-06 / somativa            | G02: consolidar opções, fontes e testes propostos         | Ricardo decide fonte/contexto e contrato; implementação segue a SPEC atualizada                  |
| REM-03/04 / same-UID         | G03 e T34: revisar threat model e classificações          | Ricardo define isolamento ou limitação explícita aceitável; hardening e prova refletem a decisão |
| REM-09 / operação de restore | G04: C10 read-only e drill sintético atual                | Contrato de roles/grants e ambiente operacional definidos; RPO ≤1h/RTO ≤4h mantidos              |
| H-REMOTE / RF-02/RF-09       | T04/T05 e G08: corrigir configuração e preparar evidência | Autoridade remota existente ou decisão explícita; runs concluídos do mesmo SHA                   |
| H-CONTENT                    | G09: preparar pacote autoral e revisão                    | Revisão de Ricardo e autorização clínica antes de publicação                                     |
| AAA-001 / aceite operacional | G07/G10: medir e preparar decisão                         | Metas e autoridade registradas; aceite humano específico                                         |

Essas dependências não são novas perguntas de aprovação nesta entrega.
Autorrevisão MVP e metas normativas já decididas permanecem preservadas.

## 7. Cobertura das 51 dimensões

| Dimensões da auditoria                                             | Destino / preservação                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| N01–N09: gates, produto, SPEC, planejamento e governança           | G01, T11, T03/T09/T10, R2, G02/G03/G05/G10                                |
| N10–N15: arquitetura, domínio, API e validação                     | T07/T08, T17/T18/T19, T25; regressão de fronteiras/rotas/exposição em G05 |
| N16–N21: identidade, segurança, PostgreSQL/RLS/migrations          | T16/T20/T24/T27, T01/T02, G04/G05; RLS e contratos preservados            |
| N22–N26: respostas, somativa, currículo, clínica e autoria         | T13–T19, T01/T25/T32/T33, G02/G09                                         |
| N27–N29: worker, Qdrant e IA                                       | T21/T22/T23/T26, G06                                                      |
| N30–N32: experiência, manutenção e acessibilidade                  | T07/T14/T15/T16/T28–T33, G07                                              |
| N33–N41: testes, cobertura, mutação, qualidade e supply chain      | T01/T02/T06/T07/T08/T12/T33/T34, G03/G05; pisos sem redução               |
| N42–N48: logs, observabilidade, operação, resiliência e capacidade | T20–T29, G04/G06/G07                                                      |
| N49–N51: CI, proveniência e produção                               | T03/T04/T05/T09/T10/T11, G05/G08/G09/G10                                  |

Dimensão forte também participa da regressão. A nota não autoriza dispensar
RLS, validação, exposição pública ou invariantes do candidato corrigido.

## 8. Critérios comuns de encerramento e rollback

Tasks de código seguem RED → GREEN → REFACTOR, com caso que detecta o defeito,
checks proporcionais e revisão independente. Fixar o relógio não pode mascarar
replay; apagar teste não pode corrigir seleção; aumentar budget não pode corrigir
complexidade; inventar ID não pode satisfazer mutação. Cobertura mantém os pisos
atuais 90/85/90/90 e cobertura de decisão dos invariantes críticos.

Toda task associa origem → SPEC → módulo/contrato → teste → resultado → artefato;
commit é registrado quando houver, nunca presumido. O fechamento usa evidência
nova; SKIP/NOT_EXECUTED não viram PASS. Escopo não observado permanece gap.

Rollback local reverte somente a fatia identificada ou usa correção forward
revisada; migrations nunca resetam dados reais. Índice deriva de PostgreSQL;
retirada clínica preserva histórico. Falha ou incidente interrompe a promoção,
preserva evidência e reabre a task aplicável. Aceite de piloto/produção exige
os gates do programa original, além dos testes deste recorte.

**Próximo passo:** G01, seguido de T13, quando a execução das correções for
selecionada. O planejamento solicitado está concluído.
