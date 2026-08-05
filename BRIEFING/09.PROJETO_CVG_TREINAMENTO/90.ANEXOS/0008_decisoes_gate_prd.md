# Anexo 0008 — Decisões do Gate PRD: Opções e Recomendação

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data:** 2026-08-05  
**Status:** **DECIDIDO COMO INSUMO — recomendações confirmadas pelo patrocinador em 2026-08-05**. D-075 fechou B-04 e D-076 fechou B-03 para o MVP interno. B-05 e os demais bloqueios continuam em seus estados próprios; Discovery e PRD permanecem `REPROVADOS — EM CORREÇÃO` por razões independentes de B-03/B-04.
**Objetivo:** consolidar decisões de produto para a futura reexecução do gate `0090_prd_validation.md`, com opções objetivas e recomendação fundamentada no briefing (anexos 0002/0003, Discovery em correção e diretrizes do `sistema_treinamento_veterinarios_cvg.md`).
**Uso:** documento histórico da decisão; alterações futuras exigem novo registro de gate.

## 0. Decisão adicional de escopo — D-068

| Alternativa | Modalidade | Veredito |
|---|---|---|
| **1** | **Treinamento integralmente digital, com casos e simulações digitais; sem prática presencial associada à plataforma** | **recomendada e selecionada — permite treinar raciocínio sem confundir resultado digital com competência prática** |
| 2 | Treinamento digital somente expositivo e avaliativo, sem simulações | menor complexidade, porém reduz aplicação e tomada de decisão em cenários |
| 3 | Programa híbrido, com treinamento digital e prática presencial associada | fora da primeira versão; exige estrutura, avaliadores, segurança clínica e LGPD adicionais |

**Decisão do patrocinador em 2026-08-05:** a primeira versão será integralmente digital. Poderá conter conteúdo, casos fictícios e simulações clínicas digitais, inclusive cenários progressivos ou ramificados, decisões registradas e debriefing digital. Casos derivados de atendimentos reais permanecem bloqueados até B-05 aprovar anonimização e revisão de privacidade.

Ficam fora da primeira versão: treinamento prático presencial associado à plataforma, observação de trabalho real, prática em pacientes, cadáveres, manequins, equipamentos ou materiais físicos, avaliação psicomotora, registro de nível de supervisão, certificação prática e concessão de autonomia clínica. Resultado digital nunca será tratado como evidência prática.

Qualquer inclusão futura desses elementos exige o `GATE-EXP-PRAT-01` antes de produzir caso de uso, requisito, SPEC, backlog ou BUILD. Efeito: RN-018/RN-081 a RN-085; RF-027/RF-042/RF-043/RF-052 a RF-055; UC-005/UC-009/UC-011; escopo 0011 e PRD Master 0020.

### Evidência do checkpoint D-068

| Campo | Registro |
|---|---|
| Alternativa aprovada | Alternativa 1 |
| Commit do conteúdo revisado | `c570d62` — `docs: define digital-only training scope` |
| Tag do gate | `gate-d068-digital-scope-2026-08-05` |
| Aprovador | MV. Ricardo Akinaga — patrocinador executivo |
| Revisões | coerência documental + segurança/compliance |
| Validações | `git diff --check`; links Markdown relativos; unicidade de RN/RF/D; varredura de segredos; PDFs não versionados |
| Resultado | `APROVADO — D-068 FECHADA` |

Este registro documental posterior não altera o conteúdo aprovado identificado pelo commit e pela tag acima.

---

## 0.1 Decisão de conformidade dos gates — D-069

| Alternativa | Regra | Veredito |
|---|---|---|
| **1** | **Aplicar estritamente as engines canônicas: qualquer item obrigatório incompleto reprova o gate; decisões já confirmadas permanecem apenas como insumos** | **recomendada e selecionada — elimina a exceção informal e preserva a sequência Discovery → PRD → SPEC** |
| 2 | Alterar as engines canônicas para permitir aprovação condicional mediante waiver | rejeitada — ampliaria a mudança para todos os projetos e exigiria nova governança canônica |
| 3 | Manter estado gerencial aprovado e estado canônico reprovado em paralelo | rejeitada — aumenta ambiguidade operacional e risco de avanço indevido |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. Discovery e PRD ficam `REPROVADOS — EM CORREÇÃO`; o PRD existente é rascunho controlado; decisões D-* confirmadas permanecem como insumos; SPEC, inclusive preparação formal, e BUILD ficam bloqueados. Não existe waiver implícito ou aprovação automática após o fechamento das pendências: cada gate deve ser reexecutado, versionado e aprovado formalmente na ordem canônica.

### Evidência do checkpoint D-069

| Campo | Registro |
|---|---|
| Fase e gates afetados | correção de Discovery e PRD; decisão de conformidade D-069 |
| Alternativa aprovada | Alternativa 1 |
| Commit do conteúdo revisado | `d96e14f` — `docs: enforce strict canonical gates` |
| Tag do checkpoint | `gate-d069-strict-gates-2026-08-05` |
| Artefatos incluídos | gates e masters de Discovery/PRD; escopo, regras e requisitos afetados; README; roadmap, matriz, decisões, roteiro e validação documental |
| Revisores | auditoria de coerência documental + revisão independente de qualidade + revisão de segurança/compliance |
| Validações | `git diff --check`; 56 links Markdown relativos sem quebra; nenhuma definição RN/RF/RNF/D duplicada no mesmo artefato; varredura de segredos sem achados; nenhum PDF alterado |
| Aprovador | MV. Ricardo Akinaga — patrocinador executivo |
| Decisão e data | `D-069 APROVADA — ALTERNATIVA 1`, em 2026-08-05; isso não aprova Discovery nem PRD |
| Pendências e riscos residuais | registro histórico do checkpoint D-069; a menção a B-04 foi posteriormente superada por D-075 |
| Próximo passo autorizado | registro histórico do checkpoint D-069; B-03 foi posteriormente fechado por D-076 |

Este registro documental posterior não altera o conteúdo aprovado identificado pelo commit e pela tag acima.

---

## 0.2 Decisão de governança — D-071

> **Histórico:** modelo substituído por D-076 para o MVP interno.

| Alternativa | Modelo | Veredito |
|---|---|---|
| **1** | **Governança mínima segregada: patrocinador, PO, responsável clínico/RT, coordenação educacional, comitê científico e responsável LGPD/segurança com autoridades e impedimentos definidos** | **recomendada e selecionada — distribui responsabilidade e impede revisão, voto ou aprovação do próprio trabalho** |
| 2 | Governança centralizada temporária, com o patrocinador acumulando PO | rejeitada — concentra decisões e contraria a segregação escolhida |
| 3 | Governança compartilhada com especialistas externos para educação, ciência e LGPD | rejeitada como modelo padrão — pode apoiar funções específicas, mas aumenta custo e coordenação |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. Ricardo permanece exclusivamente como patrocinador executivo nesta matriz. PO, responsável clínico/RT, coordenação educacional e responsável LGPD/segurança devem ser pessoas distintas. O comitê científico será formado pelo RT e por dois clínicos, um de Emergência e um de Internação/Medicina Interna. Autor ou preparador deverá se abster de revisar, votar ou aprovar o próprio trabalho, inclusive em decisão colegiada; silêncio nunca equivale a parecer ou aprovação.

Este parágrafo registrava o estado do checkpoint D-071, no qual B-03 ainda estava parcial por falta de nomeações. A decisão D-076 substituiu esse modelo e fechou B-03 para o MVP interno; portanto, as exigências de cadeiras segregadas, suplências e nomeações não são regras vigentes.

### Evidência do checkpoint D-071

| Campo | Registro |
|---|---|
| Fase e bloqueio afetados | correção de Discovery/PRD; B-03 — governança e nomeações |
| Alternativa aprovada | Alternativa 1 — governança mínima segregada |
| Commit do conteúdo revisado | `415fb2c` — `docs: define segregated governance model` |
| Tag do checkpoint | `gate-d071-governance-model-2026-08-05` |
| Artefatos incluídos | stakeholders e registro de nomeações; regras; gates; PRD Master; governança de fontes; roadmap; decisões; matriz, roteiro, validação e README |
| Revisores | mapeamento documental + arquitetura de governança + revisão independente de qualidade + segurança/compliance |
| Validações | `git diff --check`; 56 links Markdown relativos sem quebra; nenhuma definição RN/RF/RNF/D duplicada no mesmo artefato; varredura de segredos sem achados; nenhum PDF alterado |
| Aprovador | MV. Ricardo Akinaga — patrocinador executivo |
| Decisão e data | `D-071 APROVADA — ALTERNATIVA 1`, em 2026-08-05; aprova o modelo, não as nomeações nem os gates |
| Pendências e riscos residuais | titulares, suplentes, qualificações, aceites, conflitos, atos de instalação e mandatos; representantes de usuários do futuro parecer Discovery serão definidos em B-01/B-02 |
| Próximo passo autorizado | registro histórico; substituído por D-076 |

Este registro documental posterior não altera o conteúdo aprovado identificado pelo commit e pela tag acima.

---

## 0.3 Decisão de coordenação interina — D-072

> **Histórico:** coordenação interina substituída pela responsabilidade efetiva definida em D-076.

| Alternativa | Tratamento transitório | Veredito |
|---|---|---|
| **1** | **MV. Ricardo Akinaga atua como patrocinador e coordenador geral interino das correções; cadeiras independentes permanecem vagas e gates bloqueados** | **recomendada e selecionada — documenta a responsabilidade operacional sem criar autoaprovação** |
| 2 | Ricardo acumula formalmente PO, RT, coordenação educacional e LGPD/segurança | rejeitada — viola a segregação D-071 e não cria parecer independente |
| 3 | Ricardo coordena e revisores externos independentes ocupam imediatamente as cadeiras formais | não selecionada nesta etapa — permitiria futura regularização, mas exige nomes, aceites e possíveis custos |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. MV. Ricardo Akinaga responderá provisoriamente pela coordenação das frentes, fila de pendências, reuniões, solicitação de evidências e consolidação administrativa dos rascunhos. Essa atribuição não o nomeia PO, RT, coordenação educacional, comitê científico ou LGPD/segurança e não lhe permite emitir parecer independente ou assinar por essas funções. Contribuição material de Ricardo em um artefato gera impedimento persistente para sua assinatura como patrocinador naquela versão/commit e exige suplente da cadeira do patrocinador formalmente nomeado, aceito e não impedido.

Este era o estado do checkpoint D-072. D-076 posteriormente fechou B-03 e tornou Ricardo responsável efetivo pelo MVP.

### Evidência do checkpoint D-072

| Campo | Registro |
|---|---|
| Fase e bloqueio afetados | registro histórico; B-03 posteriormente fechado por D-076 |
| Alternativa aprovada | Alternativa 1 — patrocinador e coordenador geral interino das correções, sem cadeira adicional |
| Commit do conteúdo revisado | `f11315e` — `docs: assign interim correction coordinator` |
| Tag do checkpoint | `gate-d072-interim-coordination-2026-08-05` |
| Artefatos incluídos | stakeholders/governança; gates; regras; PRD Master; roadmap; decisões; matriz, roteiro, validação e README |
| Revisores | mapeamento documental + revisão independente de qualidade + segurança/compliance |
| Validações | `git diff --check`; 56 links Markdown relativos sem quebra; nenhuma definição RN/RF/RNF/D duplicada no mesmo artefato; varredura de segredos e dados pessoais desnecessários sem achados; nenhum PDF alterado |
| Segregação | Ricardo forneceu a decisão empresarial; a redação e a consolidação documental foram executadas pela auditoria, sem assinatura de Ricardo em cadeira independente |
| Aprovador | MV. Ricardo Akinaga — patrocinador executivo |
| Decisão e data | `D-072 APROVADA — ALTERNATIVA 1`, em 2026-08-05; coordenação operacional sem aprovação de gate |
| Pendências e riscos residuais | registro histórico; substituído por D-076 |
| Próximo passo autorizado | registro histórico do checkpoint D-072; a dependência de B-04 foi posteriormente removida por D-075 |

Este registro documental posterior não altera o conteúdo aprovado identificado pelo commit e pela tag acima.

---

## 0.4 Decisão de preparação da política de dados — D-073

> **Atualização D-076:** Ricardo substitui o responsável independente no modelo vigente do MVP. B-05 continua parcial apenas porque a política mínima ainda não foi aprovada.

| Alternativa | Tratamento de B-05 | Veredito |
|---|---|---|
| **1** | **Preparar política conservadora sem autorizar dados pessoais; permitir apenas agregados efetivamente anonimizados; manter B-05 pendente de validação independente** | **recomendada e selecionada — permite amadurecer o documento sem antecipar base legal, retenção ou aprovação** |
| 2 | Suspender toda preparação de B-05 até nomear o responsável independente | mais conservadora operacionalmente, mas adia o inventário de decisões e controles |
| 3 | Aplicar imediatamente as regras preliminares do patrocinador e coletar dados do piloto | rejeitada — confundiria insumo empresarial com validação LGPD e liberaria tratamento sem governança completa |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. Foi preparado o [Anexo 0011 — Política Conservadora de Dados e LGPD](0011_politica_conservadora_dados_lgpd.md), identificado como rascunho não aprovado. Até B-05 ser aprovado por Ricardo, o programa não pode coletar ou acessar dados pessoais de participantes, pacientes ou tutores, casos reais, prontuários, gravações, resultados individuais ou baseline.

A proposta de retenção `vínculo + 2 anos` e as permissões RN-063 a RN-067 permanecem insumos, não regras vigentes. D-073 prepara B-05, mas não o fecha.

### Evidência do checkpoint D-073

| Campo | Registro |
|---|---|
| Fase e bloqueio afetados | correção documental; preparação de B-05 |
| Alternativa aprovada | Alternativa 1 — rascunho conservador, sem dados identificáveis |
| Commit do conteúdo revisado | `9d6f70c` — `docs: draft conservative data policy` |
| Tag do checkpoint | `gate-d073-conservative-data-policy-2026-08-05` |
| Artefatos incluídos | política 0011 e documentos de decisão, requisitos, gates, roadmap, matriz, validação e README sincronizados |
| Revisores | mapeamento documental + arquitetura de governança; revisão independente de qualidade sem achados; revisão de segurança com 3 achados médios corrigidos e revalidados |
| Validações | `git diff --cached --check`; 66 links Markdown relativos sem quebra; nenhuma definição RN/RF/RNF/D duplicada no mesmo artefato; varredura de segredos sem achados; nenhum PDF alterado |
| Aprovador da alternativa | MV. Ricardo Akinaga — patrocinador executivo |
| Decisão e data | `D-073 APROVADA — ALTERNATIVA 1`, em 2026-08-05; B-05 continua parcial |
| Pendências e riscos residuais | simplificação e aprovação operacional da política mínima por Ricardo antes do piloto |
| Próximo passo autorizado | Ricardo revisar e aprovar B-05; nenhuma coleta pessoal de participante, paciente ou tutor foi autorizada |

Este registro documental posterior não altera o conteúdo revisado identificado pelo commit e pela tag acima e não transforma o rascunho em política aprovada.

---

## 0.5 Decisão de apresentação e rastreabilidade das fontes — D-074

> **Histórico:** o desenho abaixo foi posteriormente simplificado por D-075. Permanecem válidos apenas a separação da visão do aluno, a redação própria e a proibição de colocar PDFs na plataforma/Git.

| Alternativa | Modelo | Veredito |
|---|---|---|
| **1** | **Obras usadas somente para consulta e validação técnica; conteúdo integralmente autoral do CVG; aluno não vê nomes ou metadados das obras; workflow interno mantém rastreabilidade completa por F-01/F-02/F-03** | **recomendada e selecionada — atende à apresentação institucional sem perder auditabilidade clínica** |
| 2 | Exibir bibliografia geral ao final de cada módulo, sem citação no corpo | não selecionada — preserva transparência pública, mas contraria a apresentação solicitada |
| 3 | Não manter nomes ou referências nem para o aluno nem internamente | rejeitada — elimina proveniência, revisão de divergências e evidência de validação |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. A experiência do aluno apresentará apenas conteúdo institucional autoral do CVG, justificativa técnico-clínica, versão e estado de revisão. Nomes de obras, autores, editoras, ISBNs, arquivos e avisos de direitos autorais das obras consultadas não serão exibidos. O workflow interno restrito manterá fonte, edição, capítulo, páginas, afirmação validada, autores e revisores.

D-074 registrou controles mais rigorosos e manteve B-04 parcial naquele checkpoint. Esse estado foi substituído por D-075; não representa a regra vigente.

### Evidência do checkpoint D-074

| Campo | Registro |
|---|---|
| Fase e bloqueio afetados | correção documental; preparação de B-04 |
| Alternativa aprovada | Alternativa 1 — apresentação institucional + proveniência interna restrita |
| Commit do conteúdo revisado | `6c9592e` — `docs: define internal source traceability` |
| Tag do checkpoint | `gate-d074-source-traceability-2026-08-05` |
| Artefatos incluídos | governança das fontes, decisões, escopo, casos de uso, regras, requisitos, gates, consolidação, matriz, validação e README |
| Revisores | revisão independente de qualidade: 2 achados médios e 2 baixos corrigidos; revisão independente de segurança/compliance: 1 achado médio corrigido; revalidações sem achado crítico, alto ou médio |
| Validações | `git diff --cached --check`; 66 links Markdown relativos sem quebra; nenhuma definição UC/RN/RF/RNF/D duplicada no mesmo artefato; varredura de segredos sem achados; nenhum PDF alterado ou rastreado |
| Aprovador da alternativa | MV. Ricardo Akinaga — patrocinador executivo |
| Decisão e data | registro histórico D-074; estado substituído por D-075 |
| Pendências e riscos residuais | registro histórico; controles vigentes estão em D-075 |
| Próximo passo autorizado | substituído por D-075 |

Este bloco preserva a evidência histórica do checkpoint D-074. A decisão vigente é D-075, que fecha B-04 para o MVP interno.

---

## 0.6 Recalibração para treinamento interno — D-075

| Alternativa | Modelo | Veredito |
|---|---|---|
| **1** | **Governança enxuta: consulta manual interna, conteúdo original CVG, PDFs fora da plataforma/Git e obra + capítulo/seção registrados por módulo** | **recomendada e selecionada — proporcional ao uso interno** |
| 2 | Controle mínimo, sem referência por módulo | não selecionada — dificulta atualização clínica |
| 3 | Manter D-074 integral, com rastreabilidade por afirmação e validação jurídica como gate | rejeitada — burocracia incompatível com o MVP interno |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. B-04 fica `FECHADO PARA O MVP INTERNO`. A equipe pode consultar manualmente as obras e produzir conteúdo original. Não é exigido `claim_id`, parecer jurídico ou contato com editora como condição do produto. D-033 permanece aberta somente para uma futura automação dos PDFs e não bloqueia o trabalho manual.

### Evidência do checkpoint D-075

| Campo | Registro |
|---|---|
| Commit do conteúdo revisado | `05d6aa6` — `docs: simplify internal source governance` |
| Tag | `gate-d075-lean-source-governance-2026-08-05` |
| Aprovador | MV. Ricardo Akinaga — patrocinador executivo |
| Escopo | sistema digital interno do Centro Veterinário Guarapiranga |
| Controles mantidos | conteúdo original; PDFs fora da plataforma/Git; sem material copiado; referência simples por módulo |
| Validações | auditoria direta do diff; `git diff --cached --check`; 66 links relativos válidos; zero IDs duplicados; zero segredos detectados; nenhum PDF alterado ou rastreado |

---

## 0.7 Governança enxuta do MVP interno — D-076

| Alternativa | Modelo | Veredito |
|---|---|---|
| **1** | **Ricardo concentra as responsabilidades; outro MV revisa cada módulo clínico antes da publicação; sem comitês ou suplentes** | **recomendada e selecionada — simples e com segunda conferência clínica** |
| 2 | Ricardo cria, revisa e publica tudo sozinho | não selecionada — elimina a segunda conferência clínica |
| 3 | Manter D-071/D-072, com cargos segregados, comitês e suplentes | rejeitada — desproporcional ao MVP interno |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. MV. Ricardo Akinaga responde por patrocínio, produto, coordenação clínica/educacional, operação, dados, segurança e gates documentais. Não são exigidos comitês, suplentes ou cargos separados. Outro médico-veterinário deve revisar cada módulo clínico antes da publicação e ser registrado na versão. B-03 fica `FECHADO PARA O MVP INTERNO`.

### Evidência do checkpoint D-076

| Campo | Registro |
|---|---|
| Commit do conteúdo revisado | `A REGISTRAR APÓS VALIDAÇÃO` |
| Tag | `A REGISTRAR APÓS VALIDAÇÃO` |
| Aprovador e responsável do MVP | MV. Ricardo Akinaga |
| Controle clínico mantido | segundo MV antes da publicação de cada módulo clínico |
| Validações | `PENDENTE` |

---

## 1. Avaliação (D-040 a D-044, D-063)

### D-040 — Limiar geral de aprovação

| Opção | Valor | Veredito |
|---|---|---|
| A | 60% | permissivo demais para domínio teórico |
| **B** | **70%** | **recomendado — equilíbrio para piloto** |
| C | 75% | mais rigoroso; eleva reprovações sem baseline |

**Recomendação: 70%**, com nota de que o padrão definitivo deve vir de *standard setting* validado (anexo 0003, A-04) quando houver dados do piloto. Efeito: confirma RN-024 e UC-006.

### D-041 — Limiar para temas críticos

| Opção | Valor | Veredito |
|---|---|---|
| A | 80% | **recomendado — segurança clínica exige padrão maior** |
| B | 85% | muito alto sem baseline; infla remediação |
| C | sem distinção | contraria a hipótese de segurança do briefing |

**Recomendação: 80%.** Temas críticos: doses, antimicrobianos, emergência, regulamentação (anexo 0001 §9). Efeito: confirma RN-025.

### D-044 — Composição do escore do módulo

⚠️ **Inconsistência detectada:** RN-020/anexo 0003 definem quiz formativo com peso zero; RN-022/0020 propõem quiz 20% + caso 30% + prova 50%.

| Opção | Composição | Veredito |
|---|---|---|
| **A** | **quiz 0% + caso somativo 30% + prova somativa 70%** | **recomendado — coerente com RN-020 e anexo 0003; separa formativo de somativo** |
| B | quiz 20% + caso 30% + prova 50% | contradiz RN-020 (quiz peso zero) — exigiria alterar RN-020 |
| C | prova 100% | simples, mas desvaloriza aplicação em casos |

**Recomendação: Opção A** (quiz 0% + caso 30% + prova 70%), mantendo RN-020 intacta. Corrige a inconsistência em RN-022, 0010 (UC-005), 0015 e 0020.

### D-042 / D-043 — Tentativas e intervalo

| Decisão | Opção | Recomendação |
|---|---|---|
| Tentativas | A: 2 + remediação obrigatória | **A — confirmar** (já no PRD como proposta) |
| Tentativas | B: 3 + remediação | mais tolerante, mas adia a remediação |
| Intervalo | A: mínimo 7 dias entre tentativas | **A — tempo razoável de estudo/reforço na rotina 12×36** |
| Intervalo | B: mínimo 3 dias | insuficiente para remediação de conteúdo |
| Intervalo | C: mínimo 14 dias | arrasta o módulo além da janela de 8–12 semanas |

**Recomendação: 2 tentativas + remediação obrigatória, intervalo mínimo de 7 dias** (RN-027 fecha o `PENDENTE`).

### D-063 — Questões por objetivo de aprendizagem

| Opção | Quantidade | Veredito |
|---|---|---|
| A | 8 itens por objetivo | mínimo aceitável para o piloto |
| **B** | **10 a 15 itens por objetivo** | **recomendado — sustenta 2 provas + remediação + variação (banco maior que a prova)** |
| C | 20+ | sobrecarrega autoria/revisão no piloto |

**Recomendação: 10 a 15 itens por objetivo** no piloto, com banco ≥ 1,5× o número de itens aplicados por tentativa (RF-090).

---

## 2. Jornada do colaborador (D-022, D-045 a D-049)

### D-022 — Foco de espécies no piloto

| Opção | Escopo | Veredito |
|---|---|---|
| **A** | **Cães e gatos (as fontes cobrem ambos)** | **recomendado — não restringe o hospital real** |
| B | Só cães | simplifica, mas não reflete a rotina do CVG |
| C | Só gatos | restritivo sem justificativa |

**Recomendação: cães e gatos**, conforme as fontes canônicas.

### D-045 — Dispensa por domínio comprovado

| Opção | Regra | Veredito |
|---|---|---|
| **A** | **Não dispensar no piloto** | **recomendado — mantém o fluxo simples; decisão com dados do piloto** |
| B | Dispensar só conteúdo não crítico e não obrigatório (≥ limiar crítico) | viável depois, com critério validado |
| C | Dispensa automática por diagnóstico | arriscado; sem validade estabelecida do diagnóstico |

**Recomendação: Opção A no piloto**; reavaliar com dados (RN-017 fica como regra futura).

### D-046 — Prazo de resposta de contestação

| Opção | Prazo | Veredito |
|---|---|---|
| A | 5 dias úteis | apertado para revisão independente |
| **B** | **7 dias úteis** | **recomendado — razoável e monitorável** |
| C | 15 dias | longo demais; resultados ficam em revisão |

**Recomendação: 7 dias úteis** (fecha `PENDENTE` do RF-065 e KPI "contestações respondidas").

### D-047 — Reprovação recorrente (2ª reprovação na mesma prova)

| Opção | Consequência | Veredito |
|---|---|---|
| **A** | **Encaminhamento a revisão humana: mentor + coordenação educacional montam plano individual de reforço; sem punição; novo ciclo após plano** | **recomendado — cultura justa, sem punição automática (RN-034)** |
| B | Bloqueio do módulo até revisão humana | similar a A, porém sem plano estruturado |
| C | Reprovação definitiva do módulo | punitivo; contraria finalidade de desenvolvimento |

**Recomendação: Opção A.** Fecha o `PENDENTE` do UC-007/RF-048.

### D-049 — Certificação interna

| Opção | Regra | Veredito |
|---|---|---|
| **A** | **No piloto: somente status de conclusão e histórico; certificado formal avaliado após validação** | **recomendado — evita compromisso prematuro** |
| B | Certificado de conclusão teórica com validade 12 meses e advertência "não é título de especialista" | viável na expansão (futuro), não no piloto |
| C | Certificado sem validade | cria risco de interpretação indevida |

**Recomendação: Opção A no piloto**; regra de certificação na fase FUTURE (0011 §4).

---

## 3. Piloto (B-02, B-06, D-060, D-061, D-016)

### B-06 / D-020 — Áreas do piloto

| Opção | Áreas | Veredito |
|---|---|---|
| **A** | **Núcleo comum obrigatório + Emergência + Internação** | **recomendado — alta frequência e risco; alinhado à operação 24h do CVG; fontes cobrem bem** |
| B | Só núcleo comum | menos risco, mas não testa as trilhas por área |
| C | Núcleo + Clínica médica | válido, porém emergência/internação concentram mais lacunas de segurança |

**Recomendação: Opção A** (confirma proposta do PRD e anexo 0002 §13).

### B-02 / D-060 — Coorte piloto

| Opção | Coorte | Veredito |
|---|---|---|
| A | Até 10 veterinários (se houver mais: amostra estratificada por setor/turno) | conservador; amostra pequena para psicometria |
| **B** | **10 a 15 veterinários cobrindo os 3 turnos e os setores do piloto** | **recomendado — volume viável para autoria/revisão e dados úteis** |
| C | Todos os veterinários | escopo alto; sobrecarrega produção de conteúdo |

**Recomendação: 10 a 15 veterinários** (número final depende do inventário B-02). Como é um sistema de treinamento da própria equipe, o acesso da plataforma é para a equipe inteira, mas o **piloto formal de conteúdo é limitado à coorte**; os demais entram em fases seguintes.

### D-061 — Duração do piloto

| Opção | Duração | Veredito |
|---|---|---|
| A | 8 semanas | apertado para diagnóstico + módulos + retenção |
| **B** | **10 a 12 semanas** | **recomendado — cabe diagnóstico, 2–3 módulos, prova, remediação e 1 janela de retenção (30 dias)** |
| C | 16 semanas | posterga a decisão de expansão |

**Recomendação: 12 semanas** (alinhado ao piloto de 90 dias do `sistema_treinamento_veterinarios_cvg.md` §7).

### D-016 — Tempo protegido

| Opção | Carga | Veredito |
|---|---|---|
| A | 2 h/mês | mínimo (anexo 0002 §9) |
| **B** | **3 h/mês (≈ 45 min/semana: microlearning 10 min/dia + 1 round de 30–45 min quinzenal)** | **recomendado — dentro da faixa 2–4 h/mês e compatível com 12×36** |
| C | 4 h/mês | máximo da faixa; depende de escala |

**Recomendação: 3 h/mês protegidas**, com microlearning diário de 10 minutos.

---

## 4. Dados e governança (B-03, B-04, B-05, D-051 a D-055)

### B-03 — Governança do MVP interno

**Estado após D-076:** `FECHADO PARA O MVP INTERNO`. MV. Ricardo Akinaga concentra as responsabilidades e aprova os gates documentais sobre commits identificados. Não existem cadeiras, comitês ou suplentes pendentes. A segunda conferência por outro MV é requisito do módulo clínico antes da publicação, não uma vaga de governança.

### B-04 — Direitos de uso das obras

**Estado após D-075:** `FECHADO PARA O MVP INTERNO`. As obras podem ser consultadas manualmente; o CVG produz material próprio; os PDFs não entram na plataforma nem no Git; cada módulo registra apenas obra e capítulo/seção. D-033 continua aberta somente para eventual automação dos arquivos.

### B-05 / D-051 a D-054 — Política de dados

**Estado após D-073:** `PARCIAL — RASCUNHO CONSERVADOR ELABORADO; VALIDAÇÃO FORMAL PENDENTE`. As linhas abaixo são insumos para a futura validação, não autorização de tratamento. Até o fechamento de B-05, prevalece o bloqueio integral de dados pessoais do Anexo 0011.

| Decisão | Opção recomendada |
|---|---|
| Quem vê resultados individuais | **colaborador (tudo que é seu); mentor (lacunas dos mentorados); gestor educacional (agregado + individual autorizado); gestão de pessoas (somente status de conclusão/conformidade); direção (agregado)** |
| Uso em RH | **proibido no piloto; qualquer uso futuro exige política formal aprovada** (RN-066) |
| Retenção dos dados | **proposta empresarial: enquanto durar o vínculo + 2 anos; prazo não validado e inaplicável até parecer LGPD por finalidade/categoria** |
| Correção manual de nota | **somente via fluxo formal: justificativa + aprovação + versão + auditoria** (RN-067) |
| Dashboards | **mensais para gestão; tempo real apenas para o próprio colaborador** (D-055) |

### D-055 — Periodicidade dos dashboards

| Opção | Periodicidade | Veredito |
|---|---|---|
| A | Semanal | ruído em coorte pequena |
| **B** | **Mensal** | **recomendado para gestão; individual em tempo real** |
| C | Trimestral | tardio para o piloto de 12 semanas |

**Recomendação: mensal** (painel individual em tempo real).

---

## 5. Resumo das recomendações (decisões rápidas)

| Decisão | Recomendação |
|---|---|
| Modalidade (D-068) | Alternativa 1: integralmente digital, com simulações digitais; sem prática presencial associada |
| Limiar geral / crítico | 70% / 80% |
| Composição | quiz 0% + caso 30% + prova 70% (corrige inconsistência) |
| Tentativas / intervalo | 2 + remediação / 7 dias |
| Itens por objetivo | 10–15 |
| Espécies | cães e gatos |
| Dispensa por domínio | não no piloto |
| Contestação | 7 dias úteis |
| Reprovação recorrente | plano individual com mentor; sem punição |
| Certificação | status no piloto; certificado na expansão |
| Áreas do piloto | núcleo + emergência + internação |
| Coorte | 10–15 veterinários (3 turnos) |
| Duração | 12 semanas |
| Tempo protegido | 3 h/mês; composição das atividades digitais ainda será reconciliada |
| Dados | D-073: nenhum dado pessoal de participante/paciente/tutor antes de B-05; RH proibido; acesso, retenção `vínculo + 2 anos`, correção e dashboards são propostas a validar |
| Fontes/B-04 | D-075: governança enxuta aprovada; B-04 fechado para o MVP interno; D-033 futura e não bloqueante |
| Governança/B-03 | D-076: Ricardo concentra as responsabilidades; B-03 fechado; segundo MV somente antes da publicação de cada módulo clínico |

---

## 6. Como fechar o gate

✅ **Decisões de produto confirmadas e aplicadas ao rascunho em 2026-08-05.** Isso não representa aprovação do gate.

**Remanescentes para fechamento total:**
1. Aplicar entrevistas/levantamento do anexo 0007 (B-01);
2. Inventário de usuários/coorte (B-02);
3. Manter os controles operacionais de fontes definidos em D-075;
4. Simplificar e aprovar a política de dados mínima antes do piloto (B-05);
5. Aplicar diagnóstico inicial e coletar baseline (B-07);
6. Resolver os requisitos marcados como pendentes no PRD.

Após isso, o Discovery deve ser reexecutado e aprovado; em seguida, o PRD deve ser reexecutado sobre um checkpoint Git identificado e submetido à aprovação humana. O status não muda automaticamente. A SPEC permanece bloqueada até ambas as aprovações formais.
