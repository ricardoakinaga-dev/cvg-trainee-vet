# Anexo 0005 — Decisões Pendentes

**Objetivo:** transformar lacunas em perguntas acionáveis, com owner e gate.  
**Atualização:** 2026-08-05 — PRD elaborado; as decisões abaixo marcadas como `proposta` foram incorporadas ao PRD como `PROPOSTA`.  
**Atualização 2026-08-05 (decisões de produto):** o patrocinador confirmou D-016, D-020, D-021, D-022, D-040 a D-047, D-049, D-051 a D-053, D-055, D-060, D-061 e D-063 (ver anexo 0008). Elas são insumos para reexecução do gate e não equivalem à aprovação do Discovery ou do PRD. Permanecem pendentes as decisões que dependem de levantamento, entrevistas, validações e nomeações.

**Atualização 2026-08-05 (validação documental):** D-040 a D-044 sincronizados com as decisões do patrocinador (ver anexo 0009); incluídas D-067 (licença do Fossum — F-03), D-068 (modalidade da primeira versão), D-069 (conformidade estrita dos gates), D-070 (avaliação de respostas construídas), D-071 (modelo de governança mínima segregada), D-072 (coordenação geral interina das correções) e D-073 (rascunho conservador de dados/LGPD).

## 1. Identidade e governança

| ID | Pergunta/decisão | Owner recomendado | Bloqueia | Status |
|---|---|---|---|---|
| D-001 | Qual será o nome oficial do produto? | patrocinador | PRD | proposta — "Sistema CVG de Treinamento Veterinário" (nome provisório, registro no README) |
| D-002 | Quem é o patrocinador executivo? | direção | Discovery | resolvida — MV. Ricardo Akinaga, CEO |
| D-003 | Quem será o product owner? | direção | Discovery | parcialmente resolvida por D-071: deve ser pessoa distinta do patrocinador e da coordenação educacional; nome, suplente e aceite pendentes (B-03) |
| D-004 | Quem coordenará o programa educacional? | direção clínica | Discovery | parcialmente resolvida por D-071: 1 titular distinto do PO + suplente; nomes e aceites pendentes (B-03) |
| D-005 | Quem compõe o comitê científico? | RT/direção clínica | Discovery | parcialmente resolvida por D-071: RT + clínico de Emergência + clínico de Internação/Medicina Interna; nomes, suplentes e aceites pendentes (B-03) |
| D-006 | Quem responde por LGPD e segurança? | direção | Discovery | parcialmente resolvida por D-071: 1 responsável interno ou externo + suplente; nomes e aceites pendentes (B-03) |
| D-007 | Quem aprova cada gate? | patrocinador | Discovery | matriz de aprovação definida por D-071; comitê não instalado enquanto houver função vaga (B-03) |

## 2. Público e operação atual

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-010 | Quantos veterinários participarão? | gestão/coordenação | Discovery | pendente |
| D-011 | Quais áreas, turnos e unidades? | coordenação | Discovery | parcialmente resolvida — unidade, setores, atendimento 24 horas e escala 12 × 36 informados; abrangência da primeira fase pendente |
| D-012 | Qual a distribuição de experiência? | gestão | Discovery | pendente |
| D-013 | Como o treinamento ocorre hoje? | coord. educacional | Discovery | parcialmente resolvida — não há método definido nem revisão clínica estruturada; práticas isoladas pendentes |
| D-014 | Quais ferramentas são usadas? | operação | Discovery | parcialmente resolvida — não há sistema de treinamento; ferramentas auxiliares pendentes |
| D-015 | Quais lacunas já são conhecidas? | coord. clínica | Discovery | pendente |
| D-016 | Quanto tempo protegido será oferecido? | direção | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 3 h/mês (RN-076) |
| D-017 | Quais restrições de dispositivo/conectividade? | usuários/TI | PRD | pendente (levantamento/entrevistas) |
| D-018 | Quais necessidades de acessibilidade? | RH/usuários | PRD | pendente (levantamento/entrevistas) |

## 3. Escopo clínico

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-020 | Quais áreas entram no piloto? | comitê clínico | Discovery | proposta no PRD: núcleo comum + emergência e internação; confirmação pendente (B-06) |
| D-021 | Qual é o núcleo obrigatório? | comitê clínico | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): núcleo comum obrigatório (0011 §2) |
| D-022 | O foco inicial será cães, gatos ou ambos? | coord. clínica | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): cães e gatos (RN-077) |
| D-023 | Quais conteúdos são eletivos? | coord. educacional | PRD | pendente (detalhamento do conteúdo no piloto) |
| D-024 | Quais competências definem básico/intermediário/avançado? | comitê | PRD | pendente (blueprint com comitê) |
| D-025 | Quais protocolos internos prevalecem? | RT | PRD | pendente (inventário de protocolos — anexo 0007) |
| D-026 | Quais temas exigem reciclagem obrigatória? | RT | PRD | pendente (validade por tipo em RN-047) |

## 4. Fontes e direitos

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-030 | Há licença para uso institucional do tratado? | jurídico | conteúdo | pendente |
| D-031 | Há licença para uso institucional do Ettinger? | jurídico | conteúdo | pendente |
| D-032 | É permitido criar material derivado? | jurídico | conteúdo | pendente |
| D-033 | Os PDFs podem ser processados por ferramentas automatizadas? | jurídico/segurança | SPEC/conteúdo | pendente |
| D-034 | Quais fontes atuais complementares são obrigatórias? | comitê | PRD | pendente |
| D-035 | Qual a validade por tipo de conteúdo? | comitê | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 6/12/24 meses (RN-047) |
| D-036 | Qual SLA de correção clínica? | comitê | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): retirada emergencial 24h/3 dias úteis (RN-048) |

## 5. Avaliação

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-037 | Quais competências e temas compõem o blueprint do diagnóstico inicial? | comitê clínico/pedagógico | PRD | pendente |
| D-038 | Como o resultado diagnóstico determinará a trilha personalizada? | coord. educacional/clínica | PRD | requisito confirmado; regra pendente |
| D-039 | Quais conteúdos obrigatórios não poderão ser dispensados pelo diagnóstico? | RT/comitê clínico | PRD | pendente |
| D-040 | Qual limiar geral de aprovação? | comitê clínico/pedagógico | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 70% (RN-024; standard setting definitivo após baseline) |
| D-041 | Qual limiar para temas críticos? | comitê | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 80% (RN-025) |
| D-042 | Quantas tentativas? | coord. educacional | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 2 + remediação obrigatória (RN-026) |
| D-043 | Qual intervalo entre tentativas? | coord. educacional | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): mínimo 7 dias (RN-027) |
| D-044 | Quais pesos de quiz, caso e prova? | coord. educacional | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): quiz 0% + caso somativo 30% + prova somativa 70% (RN-022 — corrige a proposta anterior 20/30/50) |
| D-045 | Haverá dispensa por domínio? | coord. clínica | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): não no piloto (RN-017) |
| D-046 | Qual regra de contestação? | comitê | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 7 dias úteis, revisor independente (RN-053) |
| D-047 | Qual consequência de reprovação recorrente? | direção clínica | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): plano individual com mentor, sem punição (RN-034) |
| D-048 | Como proteger o banco de questões? | produto/segurança | SPEC | pendente |
| D-049 | Haverá certificação interna? | direção | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): status de conclusão no piloto (RN-079) |

## 6. Métricas e uso

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-050 | Quais metas finais após baseline? | patrocinador/PO | PRD | provisórias (calibrar no piloto — B-07) |
| D-051 | Quem vê resultados individuais? | LGPD/direção | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): RN-064 |
| D-052 | Resultados podem ser usados em RH? | direção/LGPD | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): proibido no piloto (RN-066) |
| D-053 | Qual retenção dos dados? | LGPD | PRD | proposta empresarial confirmada pelo patrocinador (2026-08-05): vínculo + 2 anos; prazo definitivo pendente de validação LGPD por finalidade/categoria (D-073/RN-065) |
| D-054 | Qual política para correção manual de nota? | governança | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): fluxo formal (RN-067) |
| D-055 | Qual periodicidade dos dashboards? | gestão | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): mensal; individual em tempo real (RN-080) |
| D-056 | Quais indicadores clínicos serão apenas correlacionados? | coord. clínica | piloto | pendente |
| D-057 | Qual fórmula de score do programa? | produto/auditoria | PRD | pendente |

## 7. MVP e piloto

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-060 | Qual coorte piloto? | coordenação | Discovery | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 10–15 veterinários, 3 turnos (RN-070); inventário pendente (B-02) |
| D-061 | Qual duração? | PO | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 12 semanas (RN-071) |
| D-062 | Quantos módulos? | PO/comitê | PRD | pendente |
| D-063 | Quantas questões por objetivo? | coord. pedagógica | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 10–15 itens (RN-078) |
| D-064 | Qual critério de continuar/pausar? | patrocinador | PRD | conceito definido |
| D-065 | Qual orçamento? | patrocinador | Discovery/PRD | pendente |
| D-066 | Qual prazo desejado? | patrocinador | PRD | pendente |
| D-067 | Há licença para uso institucional do Fossum (cirurgia)? | jurídico | conteúdo | pendente (B-04) |
| D-068 | Qual é a modalidade da primeira versão e a fronteira das simulações? | patrocinador/PO | PRD/SPEC | aprovada (2026-08-05): treinamento integralmente digital, com casos e simulações digitais; sem prática presencial associada à plataforma; expansão prática bloqueada pelo `GATE-EXP-PRAT-01` |
| D-069 | Como tratar gates com itens obrigatórios incompletos? | patrocinador/governança | Discovery/PRD | aprovada (2026-08-05): aplicar estritamente as engines; gates reprovados até checklist completo, reexecução, checkpoint Git e aprovação formal; sem waiver implícito |
| D-070 | Quem avalia respostas construídas e haverá dupla correção? | coord. pedagógica/comitê clínico | PRD | pendente — bloqueia definição completa de UC-005 e requisitos de avaliação |
| D-071 | Qual modelo de governança deve resolver B-03? | patrocinador | Discovery/PRD | aprovada como insumo (2026-08-05): Alternativa 1, governança mínima segregada; B-03 permanece parcial até nomeações, suplências, aceites e instalação dos comitês |
| D-072 | Como coordenar o trabalho enquanto as cadeiras de B-03 permanecem vagas? | patrocinador | plano de correção | aprovada (2026-08-05): MV. Ricardo Akinaga atua como coordenador geral interino, sem ocupar cadeiras independentes nem assinar gates; demais correções podem continuar, mas B-03 e os gates permanecem bloqueados |
| D-073 | Como preparar B-05 enquanto o responsável LGPD independente permanece vago? | patrocinador/responsável LGPD | plano de correção/B-05 | aprovada como diretriz de preparação (2026-08-05): Alternativa 1, rascunho conservador sem coleta identificável; B-05 permanece parcial até validação formal independente |

## 8. Perguntas para a primeira reunião

1. Quantos veterinários existem e como estão distribuídos?
2. Como treinamentos são realizados hoje?
3. Quais três lacunas mais preocupam a direção clínica?
4. Quais temas têm maior risco e frequência?
5. Há tempo protegido?
6. Quem será dono do produto?
7. Quem aprovará conteúdo?
8. Quem poderá ver notas individuais?
9. A finalidade é desenvolvimento, conformidade, certificação interna ou combinação?
10. Quais direitos de uso das obras estão disponíveis?
11. Quais protocolos internos existem?
12. Qual coorte e duração do piloto?

## 9. Regra de fechamento

Uma decisão somente muda de `pendente` para `aprovada` quando tiver:

- Decisão clara;
- Responsável;
- Data;
- Justificativa;
- Artefatos afetados;
- Validade;
- Registro do aprovador.
