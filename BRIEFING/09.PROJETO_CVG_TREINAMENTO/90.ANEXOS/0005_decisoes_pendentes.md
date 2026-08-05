# Anexo 0005 — Decisões Pendentes

**Objetivo:** transformar lacunas em perguntas acionáveis, com owner e gate.  
**Atualização:** 2026-08-05 — PRD elaborado; as decisões abaixo marcadas como `proposta` foram incorporadas ao PRD como `PROPOSTA`.  
**Atualização 2026-08-05 (decisões de produto):** o patrocinador confirmou D-016, D-020, D-021, D-022, D-040 a D-047, D-049, D-051 a D-053, D-055, D-060, D-061 e D-063 (ver anexo 0008). Elas são insumos para reexecução do gate e não equivalem à aprovação do Discovery ou do PRD. Permanecem pendentes as decisões que dependem de levantamento, entrevistas, validações e nomeações.

**Atualização 2026-08-05 (validação documental):** D-040 a D-044 sincronizados com as decisões do patrocinador (ver anexo 0009); incluídas D-067 a D-076. D-075 simplifica fontes e D-076 simplifica a governança do MVP interno.

## 1. Identidade e governança

| ID | Pergunta/decisão | Owner recomendado | Bloqueia | Status |
|---|---|---|---|---|
| D-001 | Qual será o nome oficial do produto? | patrocinador | PRD | proposta — "Sistema CVG de Treinamento Veterinário" (nome provisório, registro no README) |
| D-002 | Quem é o patrocinador executivo? | direção | Discovery | resolvida — MV. Ricardo Akinaga, CEO |
| D-003 | Quem será o product owner? | direção | Discovery | resolvida por D-076 — MV. Ricardo Akinaga no MVP interno |
| D-004 | Quem coordenará o programa educacional? | direção clínica | Discovery | resolvida por D-076 — MV. Ricardo Akinaga no MVP interno |
| D-005 | Quem revisa conteúdo clínico? | coordenação clínica | publicação do módulo | resolvida por D-076 — outro médico-veterinário escolhido e registrado por módulo; sem comitê permanente |
| D-006 | Quem responde por dados e segurança? | direção | Discovery | resolvida para o MVP por D-076 — MV. Ricardo Akinaga; D-077/B-05 define o conjunto mínimo permitido |
| D-007 | Quem aprova cada gate? | patrocinador | Discovery | resolvida por D-076 — MV. Ricardo Akinaga, com decisão registrada sobre commit identificado |

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
| D-030 | Como o tratado será usado no MVP interno? | patrocinador | conteúdo | resolvida por D-075 — consulta manual interna; PDF fora da plataforma/Git; sem cópia de material |
| D-031 | Como o Ettinger será usado no MVP interno? | patrocinador | conteúdo | resolvida por D-075 — consulta manual interna; PDF fora da plataforma/Git; sem cópia de material |
| D-032 | Como criar o material do CVG? | coordenação clínica | conteúdo | resolvida por D-075 — redação própria do CVG, com referência interna simples por módulo |
| D-033 | Os PDFs podem ser processados por ferramentas automatizadas? | produto/segurança | automação futura | pendente — não bloqueia o MVP ou a consulta/autoria manual; decidir somente se houver OCR, RAG, embeddings ou envio dos arquivos a IA |
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
| D-051 | Quem vê resultados individuais? | Ricardo | PRD | resolvida por D-077: participante vê os próprios dados; Ricardo acessa o necessário; suporte delegado somente de forma excepcional e registrada |
| D-052 | Resultados podem ser usados em RH? | Ricardo | PRD | resolvida por D-077: proibido no MVP; ampliação exige nova decisão |
| D-053 | Qual retenção dos dados? | Ricardo | PRD | resolvida por D-077: durante o vínculo com o CVG + 2 anos; depois eliminar ou anonimizar, ressalvadas obrigações aplicáveis |
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
| D-067 | Como o Fossum será usado no MVP interno? | patrocinador | conteúdo | resolvida por D-075 — consulta manual interna; PDF fora da plataforma/Git; sem cópia de material |
| D-068 | Qual é a modalidade da primeira versão e a fronteira das simulações? | patrocinador/PO | PRD/SPEC | aprovada (2026-08-05): treinamento integralmente digital, com casos e simulações digitais; sem prática presencial associada à plataforma; expansão prática bloqueada pelo `GATE-EXP-PRAT-01` |
| D-069 | Como tratar gates com itens obrigatórios incompletos? | patrocinador/governança | Discovery/PRD | aprovada (2026-08-05): aplicar estritamente as engines; gates reprovados até checklist completo, reexecução, checkpoint Git e aprovação formal; sem waiver implícito |
| D-070 | Quem avalia respostas construídas e haverá dupla correção? | coord. pedagógica/comitê clínico | PRD | pendente — bloqueia definição completa de UC-005 e requisitos de avaliação |
| D-071 | Qual modelo de governança deve resolver B-03? | patrocinador | Discovery/PRD | substituída por D-076 quanto ao modelo vigente; preservada como histórico |
| D-072 | Como coordenar o trabalho enquanto as cadeiras de B-03 permanecem vagas? | patrocinador | plano de correção | substituída por D-076; não há mais cadeiras vagas no modelo do MVP |
| D-073 | Como preparar B-05 antes da política mínima? | patrocinador | plano de correção/B-05 | registro histórico; substituído por D-077 |
| D-074 | Como usar as obras como consulta/validação técnica sem expor referências ao aluno? | patrocinador | fontes | substituída por D-075 quanto ao nível de controle; mantida a separação entre aluno e referência interna |
| D-075 | Qual governança de fontes é proporcional a um treinamento digital exclusivamente interno do CVG? | patrocinador | fontes/B-04 | aprovada (2026-08-05): Alternativa 1, consulta manual interna, conteúdo original, PDFs fora da plataforma/Git e referência simples por módulo; B-04 fechado para o MVP interno; D-033 não bloqueante |
| D-076 | Qual governança organizacional é proporcional ao MVP interno? | patrocinador | governança/B-03 | aprovada (2026-08-05): Alternativa 1, Ricardo concentra as responsabilidades; outro MV revisa cada módulo clínico antes da publicação; sem comitês ou suplentes; B-03 fechado para o MVP |
| D-077 | Qual política de dados é proporcional ao MVP interno? | patrocinador | dados/B-05 | aprovada (2026-08-05): Alternativa 1, somente nome/login profissional, progresso, tentativas, notas e logs mínimos; prontuários, tutores, gravações e casos reais identificáveis proibidos; B-05 fechado para o MVP |

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
