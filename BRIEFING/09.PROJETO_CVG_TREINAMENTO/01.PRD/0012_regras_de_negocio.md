# 0012 — Regras de Negócio

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-06
**Classificação:** `FATO INFORMADO` / `EVIDÊNCIA DOCUMENTAL` / `HIPÓTESE` / `PROPOSTA` / `PENDENTE`

Regra geral: decisões explicitamente aprovadas pelo patrocinador são baseline do produto. D-101 a D-108 e o gate PRD foram aprovados em 2026-08-07; itens ainda marcados `PROPOSTA` são metas provisórias para calibração, não pendências do gate.

---

## 1. Regras de identidade e acesso

| ID | Regra | Classificação |
|---|---|---|
| RN-001 | Todo usuário é identificado individualmente; contas compartilhadas são proibidas | FATO INFORMADO |
| RN-002 | Cada colaborador possui uma conta ativa por período; Ricardo atribui os módulos/trilhas sem exigir função, área, turno ou unidade no cadastro do MVP | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RN-003 | Acesso segue o princípio do mínimo necessário; matriz de capacidades do Anexo 0020 é a referência vigente | APROVADA PELO PATROCINADOR (D-092, 2026-08-06) |
| RN-004 | Administrador e moderador veem somente dados autorizados por finalidade e escopo; gestão de pessoas não recebe respostas detalhadas automáticas | APROVADA PELO PATROCINADOR (D-077/D-092, 2026-08-06) |
| RN-005 | Administrador não altera silenciosamente notas, gabaritos ou histórico | FATO INFORMADO |
| RN-006 | MV. Ricardo Akinaga acumula patrocínio, produto, coordenação educacional/clínica, operação, dados e segurança no MVP interno | APROVADA PELO PATROCINADOR COMO INSUMO (D-076); B-03 FECHADO PARA O MVP |
| RN-007 | Não são exigidos comitês, suplentes ou cargos segregados no MVP; as decisões são registradas por commit Git | APROVADA PELO PATROCINADOR COMO INSUMO (D-076) |
| RN-008 | Módulo clínico exige revisão e aprovação humana por MV. Ricardo Akinaga antes da publicação; não há segunda conferência obrigatória | APROVADA PELO PATROCINADOR EM D-083 (2026-08-06; substitui D-076 neste ponto) |
| RN-009 | Ricardo aprova os gates documentais do MVP sobre commits identificados; ausência de revisor clínico bloqueia somente a publicação do módulo correspondente | APROVADA PELO PATROCINADOR COMO INSUMO (D-076) |

## 2. Regras da jornada de aprendizagem

| ID | Regra | Classificação |
|---|---|---|
| RN-010 | Diagnóstico inicial é obrigatório para todo colaborador antes do início do treinamento | FATO INFORMADO |
| RN-011 | O diagnóstico é formativo e não punitivo; não gera nota de aprovação | FATO INFORMADO |
| RN-012 | O diagnóstico estabelece linha de base por tema e competência | FATO INFORMADO |
| RN-013 | A trilha inicial é atribuída conforme perfil do diagnóstico (personalização) | FATO INFORMADO |
| RN-014 | Conteúdos institucionais obrigatórios e temas críticos não podem ser dispensados por personalização | FATO INFORMADO |
| RN-015 | Progresso, avaliação e domínio usam dimensões separadas; `APROVADO` exige limiares e `CONCLUÍDO` exige atividades obrigatórias finalizadas, conforme D-102 | APROVADA EM 2026-08-07 (D-102) |
| RN-016 | Módulo só é desbloqueado quando pré-requisitos são atendidos | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-017 | Dispensa por domínio comprovado: **não aplicada no piloto**; reavaliar com dados após o piloto | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-018 | Aprovação em conteúdo, prova, caso ou simulação digital não comprova competência prática, não confere autonomia clínica nem autoriza procedimentos | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |

## 3. Regras de avaliação

| ID | Regra | Classificação |
|---|---|---|
| RN-020 | Quizzes formativos têm peso zero na decisão somativa | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-021 | Caso clínico ou simulação digital formativa tem peso zero; a modalidade somativa participa da composição | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05; esclarecida por D-068) |
| RN-022 | Composição do escore do módulo: quiz 0% + caso/simulação digital somativa 30% + prova somativa 70% | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05 — corrige proposta anterior 20/30/50, alinhada a RN-020) |
| RN-023 | A média ponderada não compensa componente crítico: aprovação exige 70% geral e 80% em cada objetivo/componente crítico, conforme D-103 | APROVADA EM 2026-08-07 (D-103) |
| RN-024 | Limiar geral de aprovação: 70% | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-025 | Limiar para temas críticos: 80% | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-026 | Tentativas da prova somativa: 2 + remediação obrigatória | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-027 | Intervalo mínimo entre tentativas: 7 dias | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-028 | Após reprovação, remediação é obrigatória antes de nova tentativa | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-029 | Itens usados na segunda tentativa são diferentes da primeira | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-030 | Avaliação de retenção usa itens equivalentes, não repetição literal | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-031 | Retenção relativa nunca substitui o limiar absoluto de domínio | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-032 | Retenção baixa não revoga automaticamente conclusão anterior | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-033 | Autoavaliação de confiança tem peso zero na nota e é mostrada separadamente | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-034 | Falhas repetidas (2ª reprovação): revisão humana — mentor + coordenação educacional montam plano individual de reforço digital; sem punição automática nem validação prática | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05; esclarecida por D-068) |
| RN-035 | Aprovação/notas usam standard setting validado, não percentual arbitrário | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05 — limiares provisórios 70%/80% até standard setting) |

## 4. Regras de conteúdo e fontes

| ID | Regra | Classificação |
|---|---|---|
| RN-040 | Cada módulo registra internamente objetivo, competência, nível, obra e capítulo/seção consultados, autor, revisor, versão e data de revisão; esses dados não são exibidos ao aluno | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05) |
| RN-041 | Hierarquia de fontes: legislação/bula > protocolo CVG > diretriz atual > Ettinger 2024 > Fossum 2014 (temas cirúrgicos) > Tratado 2015 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05 — atualizada 2026-08-05: inclusão do Fossum, F-03) |
| RN-042 | Divergências entre fontes seguem fluxo com `conflict_id` e decisão humana documentada; críticas nunca resolvidas por IA | FATO INFORMADO |
| RN-043 | Conteúdo clínico só é publicado após revisão e aprovação humana de MV. Ricardo Akinaga | APROVADA PELO PATROCINADOR EM D-083 (2026-08-06) |
| RN-044 | Ricardo pode criar, revisar, aprovar e publicar o conteúdo do MVP interno; a revisão de outro MV é opcional, não obrigatória | APROVADA PELO PATROCINADOR EM D-083 (2026-08-06) |
| RN-045 | Não copiar texto, página, tabela, figura ou imagem das obras; todo material de treinamento deve ter redação própria do CVG | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05) |
| RN-046 | No MVP interno, as obras podem ser consultadas manualmente pela equipe; os PDFs ficam fora da plataforma e do Git; registra-se apenas obra e capítulo/seção por módulo; automação dos PDFs permanece pendente em D-033 sem bloquear a autoria manual | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05); B-04 FECHADO PARA O MVP INTERNO |
| RN-047 | Validade por tipo de conteúdo: crítico 6 meses, clínico geral 12, fundamentos 24; alerta = revisão imediata | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-048 | Retirada emergencial: crítico até 24h, alto até 3 dias úteis; registra afetados e ação corretiva | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-049 | Conteúdo vencido não é exibido como ativo | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |

## 5. Regras de integridade e auditoria

| ID | Regra | Classificação |
|---|---|---|
| RN-050 | Banco de questões maior que a prova; seleção aleatória e embaralhamento (banco ≥ 1,5× os itens aplicados por tentativa) | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-051 | Toda tentativa é registrada de forma imutável (item, resposta, horário, versão da regra) | FATO INFORMADO (anexo 0003) |
| RN-052 | Alteração de nota ou gabarito é versionada, com justificativa e responsável | FATO INFORMADO |
| RN-053 | Contestação gera protocolo; revisor independente avalia; anulação recalcula afetados; prazo de resposta: 7 dias úteis | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-054 | Compartilhamento de questões é violação; termo de uso registra proibição | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-055 | Detecção de padrões anômalos nunca gera penalidade automática; exige revisão humana | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-056 | Decisões de aprovação devem ser reproduzíveis a partir das evidências mínimas do anexo 0003 §12 | FATO INFORMADO |

## 6. Regras de métricas e uso de dados

| ID | Regra | Classificação |
|---|---|---|
| RN-060 | Não usar nota isolada como avaliação total do colaborador | FATO INFORMADO |
| RN-061 | Não fazer ranking público; não comparar áreas com dificuldade diferente sem ajuste | FATO INFORMADO |
| RN-062 | Separar desenvolvimento de disciplina | FATO INFORMADO |
| RN-063 | Colaborador vê os próprios dados, progresso, tentativas, notas e contestações | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RN-064 | Acesso restrito ao mínimo necessário: colaborador acessa os próprios dados; Ricardo acessa o necessário; mentor autorizado acessa somente lacunas/remediação dos participantes atribuídos; suporte delegado é excepcional e registrado; demais gestores recebem somente agregados | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RN-065 | Dados permitidos são mantidos durante o vínculo com o CVG + 2 anos; depois devem ser eliminados ou anonimizados, ressalvadas obrigações aplicáveis | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RN-066 | Uso de resultados em RH, punição automática ou ranking público é proibido no MVP; ampliação exige nova decisão e atualização da política | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RN-067 | Correção manual de nota exige justificativa, aprovação, versão e registro de auditoria | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RN-068 | Não atribuir causalidade clínica sem desenho adequado | FATO INFORMADO |

## 7. Regras do piloto

| ID | Regra | Classificação |
|---|---|---|
| RN-070 | Público inicial: aproximadamente 10 veterinários; todos participam da primeira aplicação, sem segmentação por setor ou turno | APROVADA PELO PATROCINADOR COMO INSUMO (D-079; B-02 FECHADO) |
| RN-071 | Duração da trilha: 24 meses em duas partes, com 24 módulos mensais e 96 sessões | APROVADA COMO DIREÇÃO PELO PATROCINADOR EM D-084 (2026-08-06; substitui D-081) |
| RN-072 | A onda piloto inicial valida diagnóstico, núcleo obrigatório + Emergência + Internação, casos/simulações digitais, avaliação, remediação e retenção; a trilha V3 completa mantém 24 módulos obrigatórios, produzidos/publicados em ondas | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05; esclarecida por D-068/D-084/D-105) |
| RN-073 | Critérios de continuar/pausar seguem anexo 0004 §6 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-074 | Baseline será coletada antes do piloto completo e da calibração definitiva; orienta personalização, mas não bloqueia a SPEC, conforme D-101 | APROVADA EM 2026-08-07 (D-101); B-07 PRÉ-PILOTO |
| RN-075 | Módulo clínico revisado e aprovado por Ricardo antes da publicação; revisão clínica adicional e revisão pedagógica são opcionais no MVP | APROVADA PELO PATROCINADOR EM D-083 (2026-08-06) |
| RN-076 | Carga da trilha: 149 horas em 24 meses, com 6 horas nos meses regulares, 7 horas no diagnóstico e 8 horas nos meses integradores | PROPOSTA V3 APROVADA COMO DIREÇÃO EM D-084/D-085 (2026-08-06) |
| RN-077 | Espécies do piloto: cães e gatos | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-078 | Banco do piloto: 10 a 15 itens por objetivo de aprendizagem | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-079 | Certificação no piloto: somente status de conclusão e histórico; certificado formal avaliado na expansão | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-080 | Dashboards: mensais para gestão; painel individual em tempo real | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-081 | Toda atividade da primeira versão é entregue por meio digital; a adoção de encontros síncronos, áudio, vídeo, chat ou gravação não foi decidida e exige requisito e análise LGPD próprios | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-082 | Simulação digital representa situação clínica e produz somente evidência de conhecimento, raciocínio, priorização, decisão ou comunicação simulada | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-083 | Resultado digital nunca atualiza competência prática, habilidade psicomotora, nível de supervisão, autorização de procedimento ou autonomia clínica | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-084 | A primeira versão não agenda, associa, registra nem avalia treinamento prático presencial ou observação de atividade clínica real | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-085 | Qualquer escopo prático presencial futuro permanece `BLOQUEADO_POR_GATE` até aprovação do `GATE-EXP-PRAT-01` e não pode originar UC, RF, SPEC, backlog ou BUILD antes disso | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-086 | Erro crítico em caso digital não gera eliminação, punição ou reprovação definitiva: o objetivo fica `EM_REMEDIAÇÃO`, recebe explicação e reforço curto e é concluído após decisão segura em novo caso equivalente; persistência direciona a orientação individual, sem ranking | APROVADA PELO PATROCINADOR EM D-082 (2026-08-06) |
| RN-087 | Registro e passagem de caso começam com campos estruturados e correção automática por rubrica; revisão humana somente para ambiguidade, contestação, possível erro crítico ou falhas repetidas verificadas no piloto; a atividade afetada migra para correção especializada se o método automático não ensinar ou classificar adequadamente | APROVADA PELO PATROCINADOR EM D-070 (2026-08-06) |
| RN-088 | Nenhuma pergunta ou decisão de caso pode ser publicada sem método de avaliação definido e testado: gabarito ou rubrica, respostas aceitas, erros relevantes e feedback. Se o sistema não conseguir avaliar a resposta, o item deve ser redesenhado, estruturado ou encaminhado para correção humana antes do uso | FATO INFORMADO PELO PATROCINADOR; INCORPORADO À D-070 (2026-08-06) |
| RN-089 | Afastamento/férias pausam prazo e preservam progresso; mudança de setor/turno não altera a trilha da primeira aplicação; acomodação autorizada ajusta tempo/formato/prazo sem reduzir o objetivo e registra somente os campos mínimos da extensão D-104 da política D-077 | APROVADA EM 2026-08-07 (D-104) |
| RN-090 | Diagnóstico abaixo de 70% gera reforço prioritário; 70–79% gera monitoramento; ≥80% mantém sequência regular; erro crítico sempre gera reforço; não há dispensa | APROVADA EM 2026-08-07 (D-105) |
| RN-091 | Baseline ocorre uma vez na entrada; sessão interrompida é retomada e, após conclusão, evolução usa avaliações de módulo e retenção, sem reaplicar a baseline no piloto | APROVADA EM 2026-08-07 (D-105) |
| RN-092 | Formas equivalentes seguem o mesmo blueprint, objetivos, distribuição cognitiva/criticidade e pré-voo, sem repetição literal e com aprovação clínica | APROVADA EM 2026-08-07 (D-106) |

## 8. Matriz de responsabilidades resumida (D-076)

| Decisão | Responsável | Status da nomeação |
|---|---|---|
| Patrocínio, produto e prioridade | MV. Ricardo Akinaga | ativo |
| Coordenação educacional e clínica | MV. Ricardo Akinaga | ativo |
| Operação, dados e segurança do MVP | MV. Ricardo Akinaga | ativo |
| Aprovação dos gates documentais | MV. Ricardo Akinaga, sobre commit identificado | ativo |
| Aprovação clínica | MV. Ricardo Akinaga | exigida antes da publicação de cada módulo |

D-076 substitui D-071/D-072 quanto ao modelo vigente e fecha B-03 para o MVP interno.

Por D-077, RN-063 a RN-067 e a [Política Mínima Interna de Dados](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md) estão aprovadas como insumo do MVP. B-05 está fechado. Prontuários, dados de tutores, gravações e casos reais identificáveis continuam proibidos.

## 9. Regras confirmadas como insumos e pendências remanescentes

**Confirmadas pelo patrocinador como insumos** (conforme [Anexo 0008](../90.ANEXOS/0008_decisoes_gate_prd.md)): RN-006 a RN-009, RN-016/017/018, RN-020 a RN-022, RN-024 a RN-035, RN-041, RN-046 a RN-055, RN-063 a RN-067, RN-070 a RN-073 e RN-075 a RN-088. D-090 a D-100 também estão aprovadas. RN-015, RN-023, RN-074 e RN-089 a RN-092 integram o pacote final D-101 a D-106.

**Controles remanescentes por fase:**

1. D-101 a D-108 e os gates foram aprovados sobre `f6fefa1`;
2. manter data, fonte, versão e registro da aprovação clínica de Ricardo em cada módulo;
3. produzir, revisar e aplicar B-07 antes do piloto completo e da calibração definitiva;
4. processamento automatizado dos PDFs permanece futuro em D-033 e não bloqueia a SPEC/MVP manual.
