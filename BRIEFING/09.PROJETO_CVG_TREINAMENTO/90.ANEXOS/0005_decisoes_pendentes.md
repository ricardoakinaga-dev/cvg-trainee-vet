# Anexo 0005 — Decisões Pendentes

**Objetivo:** transformar lacunas em perguntas acionáveis, com owner e gate.  
**Atualização:** 2026-08-06 — PRD elaborado e pacote técnico D-101 a D-108 preparado para aprovação humana sobre commit identificado.
**Atualização 2026-08-05 (decisões de produto):** o patrocinador confirmou D-016, D-020, D-021, D-022, D-040 a D-047, D-049, D-051 a D-053, D-055, D-060, D-061 e D-063 (ver anexo 0008). D-081 posteriormente substituiu D-016 e D-061. Essas decisões são insumos para reexecução do gate e não equivalem à aprovação do Discovery ou do PRD.

**Atualização 2026-08-06:** D-082 aprovada como remediação educativa de erro crítico, sem eliminação, punição, ranking ou reprovação definitiva.

**Atualização 2026-08-06 (pré-SPEC):** D-090 confirmou as superfícies obrigatórias; D-091 a D-100 foram aprovadas integralmente pelo patrocinador. O alinhamento pré-SPEC está encerrado, sem autorização para iniciar a SPEC antes dos gates canônicos.

## 1. Identidade e governança

| ID | Pergunta/decisão | Owner recomendado | Bloqueia | Status |
|---|---|---|---|---|
| D-001 | Qual será o nome oficial do produto? | patrocinador | PRD | proposta — "Sistema CVG de Treinamento Veterinário" (nome provisório, registro no README) |
| D-002 | Quem é o patrocinador executivo? | direção | Discovery | resolvida — MV. Ricardo Akinaga, CEO |
| D-003 | Quem será o product owner? | direção | Discovery | resolvida por D-076 — MV. Ricardo Akinaga no MVP interno |
| D-004 | Quem coordenará o programa educacional? | direção clínica | Discovery | resolvida por D-076 — MV. Ricardo Akinaga no MVP interno |
| D-005 | Quem revisa conteúdo clínico? | coordenação clínica | publicação do módulo | resolvida por D-083 — MV. Ricardo Akinaga é o único aprovador clínico obrigatório; revisão adicional é opcional |
| D-006 | Quem responde por dados e segurança? | direção | Discovery | resolvida para o MVP por D-076 — MV. Ricardo Akinaga; D-077/B-05 define o conjunto mínimo permitido |
| D-007 | Quem aprova cada gate? | patrocinador | Discovery | resolvida por D-076 — MV. Ricardo Akinaga, com decisão registrada sobre commit identificado |

## 2. Público e operação atual

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-010 | Quantos veterinários participarão? | gestão/coordenação | Discovery | resolvida por D-079 — aproximadamente 10; todos participam |
| D-011 | Quais áreas, turnos e unidades? | coordenação | Discovery | resolvida para o MVP por D-079 — uma equipe CVG, sem segmentação por setor ou turno |
| D-012 | Qual a distribuição de experiência? | gestão | Discovery | dispensada no MVP por D-079; o diagnóstico B-07 orientará a recomendação individual |
| D-013 | Como o treinamento ocorre hoje? | MV. Ricardo Akinaga | Discovery | resolvida por D-078 — aprendizado informal conforme disponibilidade dos profissionais, sem trilha, avaliação ou registro centralizado; B-01 fechado |
| D-014 | Quais ferramentas são usadas? | operação | Discovery | resolvida institucionalmente — não há plataforma, banco, trilha, progresso ou integração; eventuais ferramentas informais não são dependência do MVP |
| D-015 | Quais lacunas já são conhecidas? | coord. clínica | piloto | resolvida para a fase — falta de trilha, avaliação e registro centralizado; lacunas individuais serão observadas pelo B-07 antes do piloto completo |
| D-016 | Quanto tempo protegido será oferecido? | direção | PRD | substituída por D-084/D-085: trilha de 149 h em 24 meses, média aproximada de 1 h 30 min/semana |
| D-017 | Quais restrições de dispositivo/conectividade? | MV. Ricardo Akinaga | SPEC | resolvida para a baseline por D-104 aprovada — web responsiva em celular e computador; perda de conexão retoma o último estado confirmado |
| D-018 | Quais necessidades de acessibilidade? | MV. Ricardo Akinaga | SPEC/piloto | resolvida para a baseline por D-099 e D-104 aprovadas — WCAG 2.2 AA e acomodação autorizada quando houver necessidade concreta |

## 3. Escopo clínico

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-020 | Quais áreas entram no piloto? | comitê clínico | Discovery | confirmada pelo patrocinador — núcleo comum + Emergência e Internação; B-06 fechado |
| D-021 | Qual é o núcleo obrigatório? | comitê clínico | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): núcleo comum obrigatório (0011 §2) |
| D-022 | O foco inicial será cães, gatos ou ambos? | coord. clínica | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): cães e gatos (RN-077) |
| D-023 | Quais conteúdos são eletivos? | coord. educacional | PRD | resolvida para a trilha completa — os 24 módulos são obrigatórios quando elegíveis; a onda piloto inicial cobre núcleo + Emergência + Internação e não há dispensa por diagnóstico (D-045/D-105 aprovadas) |
| D-024 | Quais competências definem básico/intermediário/avançado? | patrocinador/clínica | PRD | resolvida para o MVP pela V2: sem rótulos formais de nível; a complexidade progride dentro das trilhas; taxonomia fica para expansão |
| D-025 | Quais protocolos internos prevalecem? | MV. Ricardo Akinaga | publicação do módulo | proposta D-108 — registrar protocolo versionado, `NAO_APLICAVEL` ou `NAO_FORNECIDO`; nenhuma regra interna será presumida |
| D-026 | Quais temas exigem reciclagem obrigatória? | RT | conteúdo/piloto | resolvida para a fase — validade 6/12/24 meses por tipo e retenção 30/60/90 dias conforme regras aprovadas |

## 4. Fontes e direitos

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-030 | Como o tratado será usado no MVP interno? | patrocinador | conteúdo | resolvida por D-075 — consulta manual interna; PDF fora da plataforma/Git; sem cópia de material |
| D-031 | Como o Ettinger será usado no MVP interno? | patrocinador | conteúdo | resolvida por D-075 — consulta manual interna; PDF fora da plataforma/Git; sem cópia de material |
| D-032 | Como criar o material do CVG? | coordenação clínica | conteúdo | resolvida por D-075 — redação própria do CVG, com referência interna simples por módulo |
| D-033 | Os PDFs podem ser processados por ferramentas automatizadas? | produto/segurança | automação futura | pendente — não bloqueia o MVP ou a consulta/autoria manual; decidir somente se houver OCR, RAG, embeddings ou envio dos arquivos a IA |
| D-034 | Quais fontes atuais complementares são obrigatórias? | comitê | conteúdo | resolvida pela hierarquia D-086 — legislação, bula, protocolo CVG e diretriz atual prevalecem quando aplicáveis; seleção concreta ocorre por módulo |
| D-035 | Qual a validade por tipo de conteúdo? | comitê | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 6/12/24 meses (RN-047) |
| D-036 | Qual SLA de correção clínica? | comitê | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): retirada emergencial 24h/3 dias úteis (RN-048) |

## 5. Avaliação

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-037 | Quais competências e temas compõem o blueprint do diagnóstico inicial? | Ricardo | piloto | blueprint técnico pronto no Anexo 0012; aguarda aprovação clínica antes da produção dos itens, sem bloquear a SPEC por D-101 aprovada |
| D-038 | Como o resultado diagnóstico determinará a trilha personalizada? | Ricardo | PRD | resolvida pela D-105 aprovada — faixas <70%, 70–79% e ≥80%, criticidade e dado insuficiente orientam reforço, sem dispensa |
| D-039 | Quais conteúdos obrigatórios não poderão ser dispensados pelo diagnóstico? | Ricardo | PRD | resolvida pela D-105 aprovada — os 24 módulos da trilha completa permanecem obrigatórios quando elegíveis; a onda piloto inicial não cria dispensa futura |
| D-040 | Qual limiar geral de aprovação? | comitê clínico/pedagógico | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 70% (RN-024; standard setting definitivo após baseline) |
| D-041 | Qual limiar para temas críticos? | comitê | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 80% (RN-025) |
| D-042 | Quantas tentativas? | coord. educacional | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 2 + remediação obrigatória (RN-026) |
| D-043 | Qual intervalo entre tentativas? | coord. educacional | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): mínimo 7 dias (RN-027) |
| D-044 | Quais pesos de quiz, caso e prova? | coord. educacional | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): quiz 0% + caso somativo 30% + prova somativa 70% (RN-022 — corrige a proposta anterior 20/30/50) |
| D-045 | Haverá dispensa por domínio? | coord. clínica | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): não no piloto (RN-017) |
| D-046 | Qual regra de contestação? | comitê | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 7 dias úteis, revisor independente (RN-053) |
| D-047 | Qual consequência de reprovação recorrente? | direção clínica | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): plano individual com mentor, sem punição (RN-034) |
| D-048 | Como proteger o banco de questões? | produto/segurança | SPEC | deliberadamente reservado à SPEC; não bloqueia readiness |
| D-049 | Haverá certificação interna? | direção | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): status de conclusão no piloto (RN-079) |

## 6. Métricas e uso

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-050 | Quais metas finais após baseline? | patrocinador/PO | piloto | metas provisórias aceitas para a SPEC; calibração permanece obrigatória antes do piloto completo por D-101 aprovada |
| D-051 | Quem vê resultados individuais? | Ricardo | PRD | resolvida por D-077: participante vê os próprios dados; Ricardo acessa o necessário; suporte delegado somente de forma excepcional e registrada |
| D-052 | Resultados podem ser usados em RH? | Ricardo | PRD | resolvida por D-077: proibido no MVP; ampliação exige nova decisão |
| D-053 | Qual retenção dos dados? | Ricardo | PRD | resolvida por D-077: durante o vínculo com o CVG + 2 anos; depois eliminar ou anonimizar, ressalvadas obrigações aplicáveis |
| D-054 | Qual política para correção manual de nota? | governança | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): fluxo formal (RN-067) |
| D-055 | Qual periodicidade dos dashboards? | gestão | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): mensal; individual em tempo real (RN-080) |
| D-056 | Quais indicadores clínicos serão apenas correlacionados? | coord. clínica | piloto | fora do MVP inicial; qualquer correlação futura exige nova decisão e dados permitidos |
| D-057 | Qual fórmula de score do programa? | produto/auditoria | PRD | resolvida sem score único — progresso, avaliação e domínio permanecem dimensões separadas por D-102 aprovada |

## 7. MVP e piloto

| ID | Pergunta/decisão | Owner | Bloqueia | Status |
|---|---|---|---|---|
| D-060 | Qual coorte piloto? | coordenação | Discovery | substituída por D-079: aproximadamente 10 veterinários, todos participam; sem inventário ou segmentação obrigatória |
| D-061 | Qual duração? | PO | PRD | substituída por D-084: trilha de 24 meses em duas partes |
| D-062 | Quantos módulos e qual ordem de produção? | patrocinador/clínica | PRD | resolvida por D-084/D-085/D-087: 24 módulos; validar primeiro a fatia vertical do Mês 2 e expandir em ondas |
| D-063 | Quantas questões por objetivo? | coord. pedagógica | PRD | confirmada pelo patrocinador (2026-08-05; insumo para reexecução do gate): 10–15 itens (RN-078) |
| D-064 | Qual critério de continuar/pausar? | patrocinador | PRD | conceito definido |
| D-065 | Qual orçamento? | patrocinador | fornecedor/BUILD | não informado e não exigido pelos gates canônicos; custo deverá ser comparado antes da contratação |
| D-066 | Qual prazo desejado? | patrocinador | programa | resolvida para o treinamento por D-084: 24 meses; cronograma de software será estimado após a SPEC |
| D-067 | Como o Fossum será usado no MVP interno? | patrocinador | conteúdo | resolvida por D-075 — consulta manual interna; PDF fora da plataforma/Git; sem cópia de material |
| D-068 | Qual é a modalidade da primeira versão e a fronteira das simulações? | patrocinador/PO | PRD/SPEC | aprovada (2026-08-05): treinamento integralmente digital, com casos e simulações digitais; sem prática presencial associada à plataforma; expansão prática bloqueada pelo `GATE-EXP-PRAT-01` |
| D-069 | Como tratar gates com itens obrigatórios incompletos? | patrocinador/governança | Discovery/PRD | aprovada (2026-08-05): aplicar estritamente as engines; gates reprovados até checklist completo, reexecução, checkpoint Git e aprovação formal; sem waiver implícito |
| D-070 | Como corrigir registro/passagem sem burocracia? | patrocinador/clínica | PRD | aprovada (2026-08-06), Alternativa 2 adaptativa: campos estruturados e correção automática por rubrica; revisão humana por ambiguidade, contestação, possível erro crítico ou falhas repetidas; pergunta sem avaliação funcional é bloqueada antes do uso e deve ser redesenhada ou destinada à correção humana |
| D-071 | Qual modelo de governança deve resolver B-03? | patrocinador | Discovery/PRD | substituída por D-076 quanto ao modelo vigente; preservada como histórico |
| D-072 | Como coordenar o trabalho enquanto as cadeiras de B-03 permanecem vagas? | patrocinador | plano de correção | substituída por D-076; não há mais cadeiras vagas no modelo do MVP |
| D-073 | Como preparar B-05 antes da política mínima? | patrocinador | plano de correção/B-05 | registro histórico; substituído por D-077 |
| D-074 | Como usar as obras como consulta/validação técnica sem expor referências ao aluno? | patrocinador | fontes | substituída por D-075 quanto ao nível de controle; mantida a separação entre aluno e referência interna |
| D-075 | Qual governança de fontes é proporcional a um treinamento digital exclusivamente interno do CVG? | patrocinador | fontes/B-04 | aprovada (2026-08-05): Alternativa 1, consulta manual interna, conteúdo original, PDFs fora da plataforma/Git e referência simples por módulo; B-04 fechado para o MVP interno; D-033 não bloqueante |
| D-076 | Qual governança organizacional é proporcional ao MVP interno? | patrocinador | governança/B-03 | aprovada em 2026-08-05 e parcialmente substituída por D-083: Ricardo concentra as responsabilidades; a segunda conferência deixou de ser obrigatória |
| D-077 | Qual política de dados é proporcional ao MVP interno? | patrocinador | dados/B-05 | aprovada (2026-08-05): Alternativa 1, somente nome/login profissional, progresso, tentativas, notas e logs mínimos; prontuários, tutores, gravações e casos reais identificáveis proibidos; B-05 fechado para o MVP |
| D-078 | Como funciona atualmente o treinamento veterinário no CVG? | patrocinador | Discovery/B-01 | confirmada (2026-08-05): não existe treinamento padronizado; o aprendizado é informal, conforme disponibilidade dos profissionais, sem trilha, avaliação ou registro centralizado; B-01 fechado |
| D-079 | Qual é o público da primeira aplicação? | patrocinador | Discovery/B-02 | aprovada (2026-08-05): aproximadamente 10 veterinários; todos participam; sem inventário nominal ou segmentação por setor, turno ou perfil; B-02 fechado |
| D-080 | Qual princípio deve orientar a experiência do colaborador? | patrocinador | PRD/usabilidade | aprovada (2026-08-05) e refinada sem mudar o princípio: jornada prática e fluida, com unidades breves dentro de módulos completos, casos digitais, feedback imediato, progresso visível e uma próxima ação clara; controles administrativos ficam nos bastidores |
| D-081 | Qual carga/cadência deve executar a matriz curricular clínica V2? | patrocinador | PRD/conteúdo | preservada como histórico e substituída por D-084/D-085: trilha V3 de 24 meses/149 h |
| D-082 | Como tratar erro crítico em caso digital? | patrocinador/clínica | PRD/avaliação | aprovada (2026-08-06), Alternativa 1: somente o objetivo afetado fica em reforço; explicação + conteúdo curto + novo caso equivalente; decisão segura libera; persistência recebe orientação individual; sem eliminação, punição, ranking ou reprovação definitiva |
| D-083 | Quem aprova clinicamente módulos e questões no MVP interno? | patrocinador | governança/conteúdo | aprovada (2026-08-06): MV. Ricardo Akinaga é o único aprovador clínico obrigatório; revisão por outro MV é opcional; substitui a segunda conferência obrigatória de D-076 |
| D-084 | Qual a duração e arquitetura da trilha? | patrocinador | PRD/conteúdo | aprovada definitivamente (2026-08-06): 24 meses, duas partes, 24 módulos mensais, 96 sessões e 149 horas; detalhamento no PRD 0017 |
| D-085 | Como ocorrerá a aprendizagem e a avaliação ao longo da trilha? | patrocinador | PRD/avaliação | aprovada definitivamente (2026-08-06): casos fictícios, pesquisa aberta, quiz, múltipla escolha, respostas dissertativas, feedback e revisão espaçada; respostas abertas corrigidas em até cinco dias úteis |
| D-086 | Como as três obras serão usadas? | patrocinador/clínica | fontes/conteúdo | aprovada (2026-08-06): Tratado, Ettinger e Fossum são a base bibliográfica; legislação, bula, protocolo CVG e diretriz atual prevalecem em divergência |
| D-087 | A fatia vertical do Mês 2 pode ser produzida? | patrocinador/clínica | conteúdo/validação | aprovada (2026-08-06): produzir as quatro sessões de Emergência e UTI, com dois casos fictícios, avaliação mista, rubricas, feedback e pré-voo; a produção dos demais módulos continua condicionada ao aprendizado desta fatia |
| D-088 | A M02 v0.1.0 pode seguir para ensaio controlado e cronometrado? | patrocinador/aprovador clínico | validação operacional | aprovada clinicamente por MV. Ricardo Akinaga em 2026-08-06 para ensaio controlado e cronometrado; não autoriza publicação geral, uso somativo, certificação ou produção em escala |
| D-089 | O T2 depende do gate documental adicional criado durante a revisão? | patrocinador | validação operacional | aprovada (2026-08-06): não; o gate adicional fica descartado e T2 está pronto para agendamento com dois a três veterinários; permanecem a comunicação operacional simples, a coleta mínima de D-077 e as proibições de dados clínicos reais, gravações, ranking, RH e punição |
| D-090 | Quais superfícies de produto são obrigatórias antes da SPEC? | patrocinador | PRD/SPEC readiness | direção confirmada (2026-08-06): login, administração de conta, dashboard de administrador/moderador, resumo e evolução do participante, feedback de bugs/erros/melhorias e KPIs simples |
| D-091 | Qual modelo de autenticação será usado? | patrocinador/produto | SPEC readiness | aprovada integralmente (2026-08-06): convite + provedor gerenciado + MFA admin/mod + cookies seguros, CSRF, sessão rotativa, recuperação de 30 min e rate limiting |
| D-092 | Quais papéis entram no MVP? | patrocinador/produto | SPEC readiness | aprovada integralmente (2026-08-06): participante, moderador e administrador; concessão/revogação auditada por autorização de Ricardo e `CLINICAL_APPROVER` impossível de delegar |
| D-093 | Qual conteúdo mínimo dos dashboards? | patrocinador/produto | SPEC readiness | aprovada integralmente (2026-08-06): próxima ação e evolução individual; administração/moderação por escopo com progresso, correções, conteúdo, feedback e operação |
| D-094 | Como registrar bugs, erros e melhorias? | patrocinador/produto | SPEC readiness | aprovada integralmente (2026-08-06): formulário sem anexo, prevenção/remoção auditada de dado proibido, triagem por estado/prioridade e contestação separada |
| D-095 | Quais KPIs simples entram no MVP? | patrocinador/produto | SPEC readiness | aprovada integralmente (2026-08-06): conjunto e dicionário da seção 8 do Anexo 0020, com escopo, frescor, faltantes/zero denominador e sem ranking |
| D-096 | Qual arquitetura é proporcional ao MVP? | patrocinador/arquitetura | SPEC readiness | aprovada integralmente (2026-08-06): monólito modular web responsivo, autenticação gerenciada e PostgreSQL gerenciado |
| D-097 | RAG entra no MVP? | patrocinador/produto/clínica | SPEC readiness/D-033 | aprovada integralmente (2026-08-06): não; preparar somente metadados de fonte e reavaliar automação futura após D-033 |
| D-098 | Qual observabilidade e recuperação mínimas? | patrocinador/arquitetura | SPEC readiness | aprovada integralmente (2026-08-06): logs estruturados, captura de erros, alertas, backups e restauração testada, sem session replay |
| D-099 | Qual padrão de acessibilidade? | patrocinador/produto | SPEC readiness | aprovada integralmente (2026-08-06): WCAG 2.2 nível AA em toda a jornada |
| D-100 | Como a IA deve apoiar a operação e qual modelo usar? | patrocinador/produto | SPEC readiness | aprovada integralmente (2026-08-06): workflow determinístico; Luna adaptativa, ferramentas escopadas, proteção contra prompt injection, mínimo de dados e aprovação auditada |
| D-101 | Qual é a fronteira canônica entre gates e B-07? | patrocinador/governança | Discovery/PRD | aprovada em 2026-08-07 — B-07 bloqueia baseline e piloto, não a SPEC |
| D-102 | Como separar progresso, avaliação, domínio, aprovação e conclusão? | patrocinador/produto | PRD | aprovada em 2026-08-07 conforme Anexo 0021 |
| D-103 | Como aplicar os limiares geral e crítico? | patrocinador/clínica | PRD | aprovada em 2026-08-07 — 70% geral e 80% em cada componente crítico, sem compensação |
| D-104 | Quais exceções operacionais entram no MVP? | patrocinador/produto | PRD | aprovada em 2026-08-07 — afastamento, acessibilidade, conexão, desativação, retirada e contestação |
| D-105 | Como o diagnóstico personaliza e quando é repetido? | patrocinador/clínica | PRD | aprovada em 2026-08-07 — reforço por faixa/criticidade, sem dispensa e baseline única |
| D-106 | O que torna duas formas equivalentes? | patrocinador/clínica | PRD | aprovada em 2026-08-07 — mesmo blueprint, distribuição comparável, rubrica testada, aprovação e pré-voo |
| D-107 | Quais RPO/RTO e critérios de fornecedor orientam a SPEC? | patrocinador/arquitetura | SPEC readiness | aprovada em 2026-08-07 — RPO ≤1h, RTO ≤4h e requisitos de segurança/portabilidade |
| D-108 | Como registrar protocolos internos, owners e prazos de risco? | patrocinador/clínica | Discovery/PRD | aprovada em 2026-08-07 — estado explícito por módulo e Ricardo como owner |

## 8. Próximas perguntas úteis

1. D-101 a D-108 e os gates foram aprovados; a próxima decisão ocorrerá somente se o readiness 0100 encontrar bloqueio real de produto.

B-07 continua como trabalho obrigatório antes da baseline e do piloto completo, mas não é pendência para iniciar a SPEC.

## 9. Regra de fechamento

Uma decisão somente muda de `pendente` para `aprovada` quando tiver:

- Decisão clara;
- Responsável;
- Data;
- Justificativa;
- Artefatos afetados;
- Validade;
- Registro do aprovador.
