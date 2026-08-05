# 0012 — Regras de Negócio

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-05  
**Classificação:** `FATO INFORMADO` / `EVIDÊNCIA DOCUMENTAL` / `HIPÓTESE` / `PROPOSTA` / `PENDENTE`

Regra geral: nenhuma regra aqui está aprovada como definitiva. Itens marcados como `PROPOSTA` dependem de aprovação humana no gate 0090 do PRD; itens `PENDENTE` não podem ser inventados.

---

## 1. Regras de identidade e acesso

| ID | Regra | Classificação |
|---|---|---|
| RN-001 | Todo usuário é identificado individualmente; contas compartilhadas são proibidas | FATO INFORMADO |
| RN-002 | Cada colaborador possui exatamente um vínculo ativo por período; vínculo define áreas e trilhas elegíveis | HIPÓTESE |
| RN-003 | Acesso segue o princípio do mínimo necessário; matriz de acesso do 0006 é a referência | PROPOSTA |
| RN-004 | Gestão de pessoas vê somente dados autorizados por finalidade aprovada; nunca respostas detalhadas automáticas | PROPOSTA |
| RN-005 | Administrador não altera silenciosamente notas, gabaritos ou histórico | FATO INFORMADO |
| RN-006 | Papéis são nomeados pelo comitê de governança; nomeações atuais `PENDENTE` (B-03) | PENDENTE |

## 2. Regras da jornada de aprendizagem

| ID | Regra | Classificação |
|---|---|---|
| RN-010 | Diagnóstico inicial é obrigatório para todo colaborador antes do início do treinamento | FATO INFORMADO |
| RN-011 | O diagnóstico é formativo e não punitivo; não gera nota de aprovação | FATO INFORMADO |
| RN-012 | O diagnóstico estabelece linha de base por tema e competência | FATO INFORMADO |
| RN-013 | A trilha inicial é atribuída conforme perfil do diagnóstico (personalização) | FATO INFORMADO |
| RN-014 | Conteúdos institucionais obrigatórios e temas críticos não podem ser dispensados por personalização | FATO INFORMADO |
| RN-015 | Progressão segue o vocabulário de estados do anexo 0003; distinção `APROVADO` × `CONCLUÍDO` a definir no gate | PENDENTE |
| RN-016 | Módulo só é desbloqueado quando pré-requisitos são atendidos | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-017 | Dispensa por domínio comprovado: **não aplicada no piloto**; reavaliar com dados após o piloto | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-018 | Aprovação em conteúdo, prova, caso ou simulação digital não comprova competência prática, não confere autonomia clínica nem autoriza procedimentos | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |

## 3. Regras de avaliação

| ID | Regra | Classificação |
|---|---|---|
| RN-020 | Quizzes formativos têm peso zero na decisão somativa | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-021 | Caso clínico ou simulação digital formativa tem peso zero; a modalidade somativa participa da composição | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05; esclarecida por D-068) |
| RN-022 | Composição do escore do módulo: quiz 0% + caso/simulação digital somativa 30% + prova somativa 70% | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05 — corrige proposta anterior 20/30/50, alinhada a RN-020) |
| RN-023 | A média ponderada do módulo exige domínio mínimo em componentes críticos, quando definidos | PENDENTE |
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
| RN-040 | Toda unidade/item possui rastreabilidade completa: objetivo, competência, nível, fonte, edição, volume, parte/seção, capítulo, páginas, versão, data de corte, validade | FATO INFORMADO (anexo 0001) |
| RN-041 | Hierarquia de fontes: legislação/bula > protocolo CVG > diretriz atual > Ettinger 2024 > Fossum 2014 (temas cirúrgicos) > Tratado 2015 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05 — atualizada 2026-08-05: inclusão do Fossum, F-03) |
| RN-042 | Divergências entre fontes seguem fluxo com `conflict_id` e decisão humana documentada; críticas nunca resolvidas por IA | FATO INFORMADO |
| RN-043 | Conteúdo só é publicado após revisão clínica + pedagógica independentes e aprovação | FATO INFORMADO |
| RN-044 | Autor não publica o próprio conteúdo | FATO INFORMADO |
| RN-045 | Não reproduzir trechos extensos, tabelas, figuras ou capítulos das obras | FATO INFORMADO |
| RN-046 | Uso das obras no piloto: sínteses autorais curtas com citação (fonte, capítulo, páginas); PDFs não publicados; cada item marcado como "direitos verificados" no workflow editorial; verificação jurídica em andamento (B-04) | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
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
| RN-063 | Colaborador vê os dados utilizados sobre si | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-064 | Acesso restrito ao mínimo necessário: colaborador (próprio); mentor (lacunas dos mentorados); gestor educacional (agregado + individual autorizado); gestão de pessoas (somente status de conclusão); direção (agregado) | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-065 | Retenção dos dados: enquanto durar o vínculo + 2 anos; descarte auditável; ajustes conforme jurídico/LGPD | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-066 | Uso de resultados em RH: proibido no piloto; qualquer uso futuro exige política formal aprovada | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-067 | Correção manual de nota exige fluxo formal: justificativa + aprovação + versão + auditoria | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-068 | Não atribuir causalidade clínica sem desenho adequado | FATO INFORMADO |

## 7. Regras do piloto

| ID | Regra | Classificação |
|---|---|---|
| RN-070 | Coorte piloto: 10 a 15 veterinários cobrindo os 3 turnos e os setores do piloto (número final conforme inventário B-02); demais colaboradores entram em fases seguintes | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-071 | Duração do piloto: 12 semanas | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-072 | Piloto digital cobre: diagnóstico, núcleo obrigatório + Emergência + Internação, casos/simulações digitais, avaliação, remediação e retenção | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05; esclarecida por D-068) |
| RN-073 | Critérios de continuar/pausar seguem anexo 0004 §6 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-074 | Baseline coletada no início do piloto (perfil, conhecimento, engajamento, indicadores selecionados) | PENDENTE (B-07) |
| RN-075 | Conteúdo do piloto revisado por clínico + pedagógico | FATO INFORMADO |
| RN-076 | Tempo protegido: 3 h/mês por veterinário; decomposição entre microlearning e atividades digitais de casos será reconciliada no item de carga | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05; composição pendente de reconciliação) |
| RN-077 | Espécies do piloto: cães e gatos | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-078 | Banco do piloto: 10 a 15 itens por objetivo de aprendizagem | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-079 | Certificação no piloto: somente status de conclusão e histórico; certificado formal avaliado na expansão | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-080 | Dashboards: mensais para gestão; painel individual em tempo real | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RN-081 | Toda atividade da primeira versão é entregue por meio digital; a adoção de encontros síncronos, áudio, vídeo, chat ou gravação não foi decidida e exige requisito e análise LGPD próprios | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-082 | Simulação digital representa situação clínica e produz somente evidência de conhecimento, raciocínio, priorização, decisão ou comunicação simulada | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-083 | Resultado digital nunca atualiza competência prática, habilidade psicomotora, nível de supervisão, autorização de procedimento ou autonomia clínica | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-084 | A primeira versão não agenda, associa, registra nem avalia treinamento prático presencial ou observação de atividade clínica real | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RN-085 | Qualquer escopo prático presencial futuro permanece `BLOQUEADO_POR_GATE` até aprovação do `GATE-EXP-PRAT-01` e não pode originar UC, RF, SPEC, backlog ou BUILD antes disso | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |

## 8. Matriz de responsabilidades resumida (PROPOSTA)

| Decisão | Responsável | Status da nomeação |
|---|---|---|
| Patrocínio e orçamento | patrocinador executivo — MV. Ricardo Akinaga | nomeado |
| Escopo e prioridade | product owner | PENDENTE |
| Critério clínico | diretor/coordenação clínica ou RT | PENDENTE |
| Conteúdo e fonte | comitê científico | PENDENTE |
| Modelo pedagógico | coordenador educacional | PENDENTE |
| Dados e LGPD | encarregado/responsável | PENDENTE |
| Segurança | responsável de segurança | PENDENTE |
| Aprovação dos gates | comitê de governança | PENDENTE |

## 9. Regras confirmadas como insumos e pendências remanescentes

**Confirmadas pelo patrocinador como insumos em 2026-08-05** (conforme [Anexo 0008](../90.ANEXOS/0008_decisoes_gate_prd.md)): RN-016/017/018, RN-020 a RN-022, RN-024 a RN-035, RN-041, RN-046 a RN-055, RN-063 a RN-067, RN-070 a RN-073 e RN-076 a RN-085. Isso não aprova o gate. RN-023, RN-074 e as nomeações complementares de RN-075 permanecem pendentes.

**Pendências remanescentes (dependem de levantamento/entrevistas):**

1. RN-023 — domínio mínimo em componentes críticos (definir com dados do piloto);
2. RN-074 — baseline (B-07);
3. RN-075 — complemento: confirmar nomes dos revisores clínico/pedagógico (B-03);
4. Nomeações da seção 8 (B-03);
5. Verificação jurídica formal das licenças (B-04 — regra de uso já aprovada em RN-046).
