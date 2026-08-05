# Anexo 0008 — Decisões do Gate PRD: Opções e Recomendação

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data:** 2026-08-05  
**Status:** **DECIDIDO COMO INSUMO — recomendações confirmadas pelo patrocinador em 2026-08-05**, incluindo D-068; D-069 fixou a conformidade estrita dos gates, D-071 aprovou o modelo de governança segregada e D-072 definiu coordenação geral interina sem preencher as vagas de B-03. As decisões de produto e governança não aprovam Discovery nem PRD. RN-015, RN-023, RN-074, o complemento de RN-075 e RF/RNF explicitamente pendentes continuam abertos; ambos os gates estão `REPROVADOS — EM CORREÇÃO`.
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
| Pendências e riscos residuais | B-01 a B-07 e requisitos explicitamente pendentes; B-05 precede coleta identificável e baseline; B-04 bloqueia conteúdo clínico |
| Próximo passo autorizado | tratar B-03 e demais correções documentais; reexecutar Discovery e depois PRD; SPEC e BUILD permanecem proibidos |

Este registro documental posterior não altera o conteúdo aprovado identificado pelo commit e pela tag acima.

---

## 0.2 Decisão de governança — D-071

| Alternativa | Modelo | Veredito |
|---|---|---|
| **1** | **Governança mínima segregada: patrocinador, PO, responsável clínico/RT, coordenação educacional, comitê científico e responsável LGPD/segurança com autoridades e impedimentos definidos** | **recomendada e selecionada — distribui responsabilidade e impede revisão, voto ou aprovação do próprio trabalho** |
| 2 | Governança centralizada temporária, com o patrocinador acumulando PO | rejeitada — concentra decisões e contraria a segregação escolhida |
| 3 | Governança compartilhada com especialistas externos para educação, ciência e LGPD | rejeitada como modelo padrão — pode apoiar funções específicas, mas aumenta custo e coordenação |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. Ricardo permanece exclusivamente como patrocinador executivo nesta matriz. PO, responsável clínico/RT, coordenação educacional e responsável LGPD/segurança devem ser pessoas distintas. O comitê científico será formado pelo RT e por dois clínicos, um de Emergência e um de Internação/Medicina Interna. Autor ou preparador deverá se abster de revisar, votar ou aprovar o próprio trabalho, inclusive em decisão colegiada; silêncio nunca equivale a parecer ou aprovação.

O modelo, as autoridades, os impedimentos, as suplências e a matriz dos gates estão definidos no documento `00.DISCOVERY/0006_usuarios_e_stakeholders.md`. Como apenas o patrocinador possui nome confirmado, B-03 fica `PARCIAL — MODELO APROVADO; NOMEAÇÕES PENDENTES`. Nenhuma cadeira será preenchida por inferência, e nenhuma função vaga poderá assinar gate.

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
| Próximo passo autorizado | obter e registrar as nomeações de B-03; B-06 somente será revalidado depois; Discovery/PRD, SPEC e BUILD não avançam |

Este registro documental posterior não altera o conteúdo aprovado identificado pelo commit e pela tag acima.

---

## 0.3 Decisão de coordenação interina — D-072

| Alternativa | Tratamento transitório | Veredito |
|---|---|---|
| **1** | **MV. Ricardo Akinaga atua como patrocinador e coordenador geral interino das correções; cadeiras independentes permanecem vagas e gates bloqueados** | **recomendada e selecionada — documenta a responsabilidade operacional sem criar autoaprovação** |
| 2 | Ricardo acumula formalmente PO, RT, coordenação educacional e LGPD/segurança | rejeitada — viola a segregação D-071 e não cria parecer independente |
| 3 | Ricardo coordena e revisores externos independentes ocupam imediatamente as cadeiras formais | não selecionada nesta etapa — permitiria futura regularização, mas exige nomes, aceites e possíveis custos |

**Decisão do patrocinador em 2026-08-05:** Alternativa 1. MV. Ricardo Akinaga responderá provisoriamente pela coordenação das frentes, fila de pendências, reuniões, solicitação de evidências e consolidação administrativa dos rascunhos. Essa atribuição não o nomeia PO, RT, coordenação educacional, comitê científico ou LGPD/segurança e não lhe permite emitir parecer independente ou assinar por essas funções. Contribuição material de Ricardo em um artefato gera impedimento persistente para sua assinatura como patrocinador naquela versão/commit e exige suplente da cadeira do patrocinador formalmente nomeado, aceito e não impedido.

B-03 permanece `PARCIAL`; Discovery e PRD permanecem `REPROVADOS — EM CORREÇÃO`; SPEC e BUILD continuam bloqueados. A equipe pode avançar na resolução dos demais itens B-01 a B-07 conforme suas dependências, sem tratar esse trabalho como mudança de fase ou aprovação de gate. A atribuição interina termina automaticamente com o fechamento de B-03 ou por decisão anterior do patrocinador.

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

### B-03 — Modelo aprovado; nomeações pendentes (D-071)

| Papel | Opção recomendada | Observação |
|---|---|---|
| Patrocinador executivo | MV. Ricardo Akinaga (CEO) | já nomeado |
| Coordenador geral interino | **MV. Ricardo Akinaga** | ativo por D-072; organiza correções, sem cadeira, parecer independente ou assinatura de gate |
| Product owner | **pessoa distinta do patrocinador e da coordenação educacional** | `VAGO — BLOQUEIA B-03` |
| Responsável clínico/RT | **médico-veterinário formalmente autorizado** | `VAGO — BLOQUEIA B-03` |
| Coordenação educacional | **pessoa distinta do PO** | `VAGO — BLOQUEIA B-03` |
| Comitê científico | **RT + 2 clínicos (Emergência e Internação/Medicina Interna)** | `NÃO INSTALADO — BLOQUEIA B-03` |
| LGPD/segurança | **responsável interno ou externo distinto das demais funções de gate** | `VAGO — BLOQUEIA B-03` |
| Comitê de governança | **titulares acima, conforme matriz do documento 0006** | `NÃO INSTALADO — BLOQUEIA B-03` |

**Decisão:** o modelo foi confirmado como insumo por D-071. Sem titulares, suplentes, aceites e declarações de conflito, B-03 permanece `PARCIAL` e os comitês não podem operar.

### B-04 — Direitos de uso das obras

| Opção | Regra | Veredito |
|---|---|---|
| **A** | **Não publicar PDFs nem reproduzir trechos extensos; conteúdo do piloto como sínteses autorais curtas com citação (fonte, capítulo, páginas); obter autorização institucional por escrito antes de qualquer uso mais amplo; marcar cada item como "direitos verificados" no workflow editorial** | **recomendado — seguro e viável** |
| B | Aguardar contrato de licença para produzir qualquer conteúdo | atrasa o piloto; alternativa conservadora |
| C | Usar livremente com base em citação | risco jurídico — não recomendado |

**Recomendação: Opção A.** RF-038 permanece: publicação clínica derivada só após checagem de direitos (anexo 0001 §7).

### B-05 / D-051 a D-054 — Política de dados

| Decisão | Opção recomendada |
|---|---|
| Quem vê resultados individuais | **colaborador (tudo que é seu); mentor (lacunas dos mentorados); gestor educacional (agregado + individual autorizado); gestão de pessoas (somente status de conclusão/conformidade); direção (agregado)** |
| Uso em RH | **proibido no piloto; qualquer uso futuro exige política formal aprovada** (RN-066) |
| Retenção dos dados | **enquanto durar o vínculo + 2 anos; descarte auditável; ajuste conforme jurídico/LGPD** |
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
| Dados | mínimo necessário; RH proibido; retenção vínculo + 2 anos; correção formal; dashboards mensais |
| Licenças | sínteses autorais curtas + checagem de direitos; sem PDFs |
| Governança e nomeações | modelo mínimo segregado D-071 confirmado; titulares, suplentes, aceites e instalação dos comitês pendentes (B-03) |
| Coordenação interina | MV. Ricardo Akinaga coordena as correções por D-072, sem preencher cadeiras ou assinar gates |

---

## 6. Como fechar o gate

✅ **Decisões de produto confirmadas e aplicadas ao rascunho em 2026-08-05.** Isso não representa aprovação do gate.

**Remanescentes para fechamento total:**
1. Concluir B-03 — nomear titulares/suplentes de PO, responsável clínico/RT, coordenação educacional, comitê científico e LGPD/segurança; registrar aceites/conflitos e instalar os comitês;
2. Aplicar entrevistas/levantamento do anexo 0007 (B-01);
3. Inventário de usuários/coorte (B-02);
4. Concluir verificação jurídica das licenças (B-04);
5. Obter validação formal da política de dados pelo responsável LGPD (B-05);
6. Aplicar diagnóstico inicial e coletar baseline (B-07);
7. Resolver os requisitos marcados como pendentes no PRD.

Após isso, o Discovery deve ser reexecutado e aprovado; em seguida, o PRD deve ser reexecutado sobre um checkpoint Git identificado e submetido à aprovação humana. O status não muda automaticamente. A SPEC permanece bloqueada até ambas as aprovações formais.
