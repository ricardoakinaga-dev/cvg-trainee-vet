# 55 — Plano executivo State of Art

**Revisão:** 2026-09-17 · **Barra:** SOA-QB-v1 congelada para este programa.
**Planejamento:** criado e adotado. **Implementação SOA:** IN_PROGRESS; checkpoint prevalente em docs/57. Nenhuma certificação final.
**Fonte:** [auditoria de construção](audits/construction-assessment-2026-09-17.md), 40 itens na ordem original.
**Execução:** [roadmap](56_roadmap_state_of_art.md) e [backlog individual](57_backlog_state_of_art.md).
**Checkpoint corrente (2026-10-02):** remediação local em andamento; consulte [docs/57](57_backlog_state_of_art.md), [docs/59](59_backlog_repository_remediation_2026-10-01.md) e [runtime state](99_runtime_state.md). A scorecard v7 permanece evidência histórica; não há certificação corrente.

## Mandato e resultado esperado

Converter uma plataforma técnica substancial em um programa educacional integrado e demonstrável. Não perseguir aumento cosmético das notas: os 40 escores são avaliações consultivas do Lead, não percentuais de entrega. O sucesso exige decisões reproduzíveis, jornada real, conteúdo governado, experiência acessível e operação recuperável, sem média que compense gate ausente.

O escopo acima descreve a entrega documental original de 2026-09-17: ela criou somente os documentos 55–57 e não implementou nem encerrou itens. A execução posterior, autorizada e registrada nos checkpoints atuais, cabe ao Lead, que confirma contratos e mantém runtime, log, backlog e `traceability.yml`. IDs SOA complementam, não substituem nem reabrem automaticamente, IDs AAA/AUD históricos.

## Gates verificados por leitura

| Gate | Evidência canônica | Interpretação |
| --- | --- | --- |
| Discovery | `BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY/0090_discovery_validation.md:5–6` | Aprovado por Ricardo em 2026-08-07 |
| PRD | `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0090_prd_validation.md:5–6,38–52` | Aprovado; B-07 não bloqueia construção/treinamento interno |
| SPEC | `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md:3–23` | 100%, aprovada tecnicamente; BUILD após 0391 |
| BUILD | `BRIEFING/03.BUILD/0300_build_engineer_master.md`, `0301_roadmap.md`, `0302_backlog_master.md` | Masters presentes e lidos; execução por phase/sprint/task/test/review/audit |
| Transversais 04–08 | `BRIEFING/03.BUILD/0391_documentation_gate.md:9–33`; `0390_build_readiness.md:8–29` | Gate documental registra 100% e código autorizado; não prova live atual |
| Continuidade | `docs/99_runtime_state.md:14–24`; últimas entradas de `docs/20_master_execution_log.md` e `docs/30_backlog_master.md` | READY_FOR_NEXT_STEP; A01–A07 para triagem; revisão final não homologada por drift |

Os gates históricos autorizam construção técnica conforme escopo, não promoção. O master 0300 mantém limites para live/produção; o Lead deve registrar a seleção local bounded e confirmar autoridade do ambiente descartável antes de executá-la. AAA-001, RF-02 e RF-09 continuam abertos no que concerne a operação/certificação. O conflito editorial continua questão humana, não razão para invalidar retroativamente Discovery/PRD/SPEC.

## Baseline honesta

A auditoria de 17/09 registrou 1.409 testes passando e 68 ignorados, lint/typecheck passando, sob Node 24 fora do contrato. Não executou cobertura nova, mutação, Playwright, stack live, carga, restore, CI remoto ou build completo. Os números históricos 91,56/86,10/95,94/92,17 e 98,84% de mutação não são aceite atual. A01 questiona a própria validade da mutação; A07 questiona proveniência. O sentinel final divergente impede homologação independente, sem atribuir culpa a um crítico.

Toda afirmação do relatório é hipótese a confirmar contra requisito, contrato e artefato atual. Símbolo sem consumidor encontrado não prova fluxo inexistente; evento no-op pode ser intencional; autor diferente não deve ser imposto se contradiz a decisão de produto. Primeiro localizar e testar; depois corrigir somente divergência comprovada. Se a hipótese cair, encerrar a investigação com evidência, sem fabricar alteração para justificar a task.

## Barra congelada — SOA-QB-v1

1. **P0/P1 abertos: zero** no recorte promovido e na certificação final. Severidade é de achado confirmado, não nota consultiva nem prioridade de task. P2/P3 exigem owner, justificativa, prazo e aceite quando cabível; não compensam gates.
2. **Ambiente:** Node `>=22.22.0 <23` e pnpm `10.33.0`, conforme `package.json`. Registrar versões exatas, lockfile, comandos, timestamp, exit code e hash do candidato. Node 24 não vale como evidência canônica.
3. **Cobertura:** statements ≥90%, branches ≥85%, functions ≥90%, lines ≥90%, sem arredondar para aprovar. Denominador: todo código de produção próprio em `apps/**` e `packages/**`, TS/TSX, incluindo páginas web e arquivos não importados pelos testes. Excluir somente testes/fixtures, declarações, saídas geradas/build e vendor, por lista nominal justificada e revisada; não excluir páginas difíceis. Registrar arquivos incluídos/excluídos e contagens cobertas/totais nas quatro dimensões. Scripts de gates/harness têm inventário e cobertura separados, nunca misturados para inflar produto. Invariantes críticas têm cobertura de decisão completa.
4. **Mutação válida ≥95%**, somente depois do aceite independente do harness em SOA-31. Publicar bruto e ajustado por identidade estável (arquivo, operador, localização e substituição). Denominador ajustado = mutantes válidos não equivalentes; sobreviventes e sem cobertura permanecem nele. Numerador = kills comprovados por falha de teste atribuível ao mutante. Baseline deve passar; infraestrutura, timeout indeterminado, crash ou falha de compilação não são kill por conveniência. Equivalência exige justificativa semântica individual revisada; erro/pendência de classificação impede fechar o gate, não melhora a taxa. Abranger invariantes críticas inventariadas, não selecionar só arquivos favoráveis.
5. **TDD e integração:** RED reproduzível → GREEN mínimo → REFACTOR → regressão. E2E atravessa browser → web/proxy → API → PostgreSQL descartável com RLS efetiva e worker quando necessário; oracle administrativo separado, identidade de runtime sem bypass e cleanup comprovado. Mocks são úteis, mas não contam como live. Skip obrigatório significa gate incompleto, nunca PASS.
6. **Fronteiras:** autorização server-side deny-by-default, transações/idempotência, dados exclusivamente sintéticos. PostgreSQL decide; Qdrant é reconstruível; IA é assistiva/desligável e não decide estado, nota, gabarito, publicação ou autonomia. Dados internos/bibliográficos/gabaritos não chegam ao participante.
7. **Proveniência e revisão:** parar escritores; executar verificações; aguardar término e estabilização de caches/artefatos; capturar sentinel inicial; revisão independente fresh-context somente leitura; capturar sentinel final sequencialmente. O conjunto inclui fontes, contratos, testes, configurações, docs relevantes, lockfile e manifestos de evidência; exclusões transitórias são nominais e fixadas antes. Drift invalida o parecer até causa isolada, novo freeze e nova revisão. Não capturar em paralelo com testes/typecheck. Auto-revisão do builder não é revisão independente.
8. **Certificação:** evidência atual do mesmo candidato; revisão de produto/SPEC, segurança, dados, integrações, experiência e operação. Local/sintético, live descartável e remoto/produção são categorias distintas. Sem remoto same-SHA autorizado, declarar certificação pendente, não inventar runs. Alteração da barra exige versão nova, justificativa e aprovação antes da medição, nunca downgrade para produzir PASS.

## Estratégia e investimento

Priorizar confiança nas medidas (SOA-29–33), confiança no contrato (SOA-01) e vertical educacional (SOA-08–17/21/25), antes de polimento ou claims operacionais. Conteúdo e integrações desligáveis evoluem em paralelo lógico ao núcleo; não comprar fornecedor nem esperar calibração para corrigir autorização, persistência ou progressão.

As sete fases não são calendário prometido. O Lead estima cada sprint após inspeção e RED, limitando a uma fatia mutável por contrato/recurso compartilhado. Responsáveis são papéis propostos para alocação, não pessoas contratadas ou agentes já iniciados. Ricardo decide produto/clínica/operação; engenharia implementa; QA prova; revisor independente não é o builder.

## Decisões humanas abertas

| ID | Pergunta objetiva | Bloqueia somente |
| --- | --- | --- |
| H-EDITORIAL | Prevalece RN-044/RF-034, permitindo Ricardo autor-revisor, ou segregação da SPEC 0106 §9? Qual exceção/matriz registrar? | Mudança da regra e publicação afetada; investigação e núcleo continuam |
| H-OPS | Ricardo confirma metas/owners/ambientes de AAA-001? RNF-015 já fixa RPO ≤1h/RTO ≤4h; quais metas adicionais ou alterações aprovar? | Aceite operacional, não instrumentação local sem compromisso de SLO novo |
| H-LIVE | Qual ambiente descartável e quais recursos locais estão autorizados para E2E, RLS, Redis/Qdrant, collector e drills, com duração e cleanup? | Execução dessas provas; planejamento/fakes e núcleo continuam |
| H-REMOTE | Há autorização específica para commit/push, dispatch/tag e credenciais por canal seguro? | RF-02/RF-09 e prova remota; não autorizados nesta entrega |
| H-CONTENT | Quais versões/módulos Ricardo revisará primeiro e quem registra aprovação clínica? | Publicação por conteúdo; B-07, T2 e calibração não bloqueiam núcleo |
| H-PROD | Quem autoriza piloto/produção/deploy e quais condições de abortar? | Operação real; o plano não concede autorização |

## Handoff

O Lead registra adoção, timestamp, last_completed_action, next_action e estados oficiais via runtime-controller; mantém requisito → SPEC → SOA → módulo/contrato → teste → commit quando autorizado → artefato. Esta fatia não altera arquivos canônicos. Não executar produção, deploy, push, gasto, instalação, consulta web ou publicação clínica. Próxima ação recomendada: triar SOA-01/02/06 e desenhar RED de SOA-31/33 no snapshot controlado.
