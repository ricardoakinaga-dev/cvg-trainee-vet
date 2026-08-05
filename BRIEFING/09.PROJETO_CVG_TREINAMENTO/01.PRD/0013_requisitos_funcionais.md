# 0013 — Requisitos Funcionais

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-05  
**Regra:** nenhuma tecnologia definida; requisitos descrevem capacidades do produto.

> **Regra transversal de dados:** B-05 foi fechado por D-077. RFs que envolvam identificação, respostas, notas, personalização, painéis, logs ou auditoria devem respeitar estritamente o [Anexo 0011](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md). Prontuários, dados de tutores, gravações e casos reais identificáveis são proibidos.

Legenda de prioridade: P0 (crítico para o piloto), P1 (alta), P2 (média), P3 (baixa).  
Legenda de classificação: `FATO INFORMADO` / `PROPOSTA` / `PENDENTE`.

---

## 1. Identidade e acesso

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-001 | O sistema deve autenticar usuários individualmente | P0 | FATO INFORMADO |
| RF-002 | O sistema deve identificar o colaborador por nome, identificador interno e login/e-mail profissional; função, área, turno e unidade não entram no cadastro do MVP | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RF-003 | O sistema deve atribuir papéis e permissões conforme a matriz de acesso | P0 | PROPOSTA |
| RF-004 | O sistema deve registrar quem criou/alterou cada dado relevante (responsável e data) | P0 | FATO INFORMADO |
| RF-005 | O sistema deve bloquear contas compartilhadas | P1 | PROPOSTA |
| RF-006 | O sistema deve suportar desativação de usuários sem excluir histórico | P1 | PROPOSTA |
| RF-007 | Antes do primeiro cadastro real, o sistema deve apresentar aviso simples com finalidade, dados, acesso, retenção e base legal aplicável | P1 | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |

## 2. Avaliação diagnóstica e linha de base

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-010 | O sistema deve apresentar um diagnóstico inicial amplo e fracionado antes da trilha, sem aprovação ou reprovação | P0 | PROPOSTA 0016: 120 itens em três sessões; blueprint clínico ainda deve ser validado em B-07 |
| RF-011 | O diagnóstico deve ser composto por questões organizadas por competência e casos curtos | P0 | FATO INFORMADO |
| RF-012 | O sistema deve calcular perfil por tema e competência, sem depender de nota global única | P0 | FATO INFORMADO |
| RF-013 | O diagnóstico deve ser não punitivo: sem reprovação nem nota pública | P0 | FATO INFORMADO |
| RF-014 | O sistema deve preservar a sessão em caso de interrupção | P1 | PROPOSTA |
| RF-015 | O sistema deve recomendar a trilha inicial com base no perfil | P0 | FATO INFORMADO |
| RF-016 | O sistema deve registrar a linha de base com data, versão dos itens e regra vigente | P0 | FATO INFORMADO |

## 3. Trilha e progressão

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-020 | O sistema deve permitir configurar as trilhas Núcleo Clínico, Emergência e Internação e publicar inicialmente somente os módulos autorizados do piloto; os 16 módulos formam o ciclo completo | P0 | PROPOSTA CURRICULAR V2 |
| RF-021 | O sistema deve atribuir trilha personalizada por perfil | P0 | FATO INFORMADO |
| RF-022 | O sistema deve manter núcleo obrigatório não dispensável | P0 | FATO INFORMADO |
| RF-023 | O sistema deve gerenciar pré-requisitos entre módulos e trilhas | P1 | PROPOSTA CURRICULAR V2 |
| RF-024 | O sistema deve gerenciar dispensa por domínio: **não aplicada no piloto**; regra futura | P2 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-025 | O sistema deve controlar estados da trilha conforme vocabulário do anexo 0003 | P0 | PROPOSTA |
| RF-026 | O sistema deve tratar prazos, afastamentos e acomodações | P1 | PENDENTE (D-016/D-018) |
| RF-027 | O sistema deve exibir aviso explícito de que aprovação em prova, caso ou simulação digital não comprova competência prática nem desbloqueia autorização clínica | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RF-028 | A tela inicial deve mostrar o progresso e uma única próxima ação recomendada | P0 | APROVADA PELO PATROCINADOR COMO DIRETRIZ DE USABILIDADE (D-080) |

## 4. Conteúdo

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-030 | O sistema deve exibir conteúdo em unidades curtas (10–15 min alvo) dentro de módulos clínicos completos de 4–6 horas | P1 | PROPOSTA CURRICULAR V2 |
| RF-031 | Cada módulo deve registrar internamente a obra e o capítulo/seção consultados, sem exibir esses metadados ao aluno | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05) |
| RF-032 | O sistema deve bloquear exibição de conteúdo vencido ou retirado | P0 | PROPOSTA |
| RF-033 | O sistema deve registrar conclusão de unidades e progresso | P0 | FATO INFORMADO |
| RF-034 | O sistema deve suportar autoria → segunda conferência por outro MV → aprovação de Ricardo → publicação | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-076) |
| RF-035 | O sistema deve impedir a publicação de módulo clínico sem o registro da segunda conferência veterinária | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-076) |
| RF-036 | O sistema deve versionar todo conteúdo e manter histórico | P0 | FATO INFORMADO |
| RF-037 | O sistema deve registrar data de corte científico e próxima revisão | P1 | PROPOSTA |
| RF-038 | O sistema não deve armazenar, distribuir ou exibir os PDFs; eventual OCR, indexação, embeddings, RAG ou envio dos arquivos a IA depende de decisão futura D-033, sem bloquear conteúdo original produzido manualmente | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05) |
| RF-039 | O sistema deve suportar retirada emergencial com registro de afetados | P0 | PROPOSTA |

## 5. Avaliações

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-040 | Quiz formativo: itens por objetivo, feedback imediato com justificativa técnico-clínica e múltiplas tentativas; referência bibliográfica completa somente no workflow interno | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-074, 2026-08-05) |
| RF-041 | Quiz formativo: peso zero na nota somativa | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-042 | Caso clínico/simulação digital: apresentação progressiva em etapas, com cenário integralmente fictício e decisões registradas; casos reais identificáveis são proibidos no MVP | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-068/D-077) |
| RF-043 | Caso clínico/simulação digital: feedback e debriefing formativo e/ou somativo; modalidade somativa participa com peso 30% | P1 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05; esclarecida por D-068) |
| RF-044 | Prova somativa: gerada do banco conforme blueprint, com seleção aleatória | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-045 | Prova somativa: tempo e janela definidos | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-046 | Prova somativa: cálculo por objetivo e aplicação dos limiares (70% geral / 80% críticos) | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-047 | Prova somativa: controle de tentativas (2 + remediação; intervalo mínimo de 7 dias; itens diferentes entre tentativas) | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-048 | Remediação: identificação de lacunas, atribuição de reforço, quiz/caso equivalente, intervalo mínimo, nova prova com itens diferentes; 2ª reprovação → plano individual com mentor, sem punição | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-049 | Retenção: avaliação em janela 30/60/90 dias com itens equivalentes | P1 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-050 | Autoavaliação de confiança: escala 1–5 ou 0–100, peso zero, mostrada separada | P2 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-051 | O sistema deve registrar toda tentativa de forma imutável | P0 | FATO INFORMADO |
| RF-052 | O sistema deve identificar visualmente toda simulação como digital e classificar seu resultado apenas como conhecimento/raciocínio em cenário simulado | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RF-053 | O sistema deve impedir que resultado de simulação digital atualize competência prática, nível de supervisão, permissão de procedimento ou autonomia clínica | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RF-054 | O sistema não deve oferecer na primeira versão cadastro, agenda, checklist, upload ou aprovação de evidência de treinamento prático presencial ou procedimento real | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RF-055 | O sistema deve limitar a remediação a conteúdo, quiz, caso/simulação e orientação digitais | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RF-056 | Em atividade autocorrigível, o sistema deve dar feedback imediato; se houver revisão humana, deve mostrar imediatamente o status e a próxima ação | P0 | APROVADA PELO PATROCINADOR COMO DIRETRIZ DE USABILIDADE (D-080) |
| RF-057 | Casos digitais devem suportar ramificações, estado persistente, consequências, exames seriados, radiografias, POCUS e ECG | P0 | PROPOSTA CURRICULAR V2 |
| RF-058 | Atividades devem suportar cálculo de dose/infusão e resposta construída por rubrica para registro e passagem de caso | P0 | PROPOSTA CURRICULAR V2; correção humana depende da D-070 |
| RF-059 | O sistema deve suportar formas equivalentes, revisão espaçada, retomada da atividade e resultado por objetivo, competência e trilha | P0 | PROPOSTA CURRICULAR V2 |

## 6. Contestação e correção

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-060 | O sistema deve permitir contestação de questão/resultado com justificativa e protocolo | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-061 | O sistema deve rotear a contestação a revisor independente | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-062 | O sistema deve recalcular tentativas afetadas ao anular/alterar gabarito, preservando versão anterior | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-063 | O sistema deve identificar e notificar usuários afetados por alteração de gabarito | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-064 | O sistema deve registrar decisão e justificativa de cada contestação | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-065 | O sistema deve controlar prazo de resposta da contestação: 7 dias úteis | P1 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |

## 7. Painéis e métricas

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-070 | Painel do colaborador: progresso, domínio por competência, retenção, consistência, confiança, histórico | P0 | PROPOSTA |
| RF-071 | Painel do colaborador: recomendações de estudo | P1 | PROPOSTA |
| RF-072 | Painel do mentor: lacunas autorizadas da equipe e plano de reforço digital, sem registro ou validação de prática | P1 | PROPOSTA |
| RF-073 | Painel gerencial: ativação, progresso, conclusão, abandono, lacunas, retenção, validade de conteúdo | P0 | PROPOSTA |
| RF-074 | O sistema deve restringir painéis por papel e escopo | P0 | FATO INFORMADO |
| RF-075 | O sistema não deve exibir ranking público | P0 | FATO INFORMADO |
| RF-076 | O sistema deve tratar dados faltantes, exclusões e acomodações no cálculo das métricas | P1 | PENDENTE |

## 8. Auditoria

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-080 | O sistema deve registrar trilha de auditoria de ações sensíveis (alterações de nota/gabarito, aprovações, retiradas, alterações de permissão) | P0 | FATO INFORMADO |
| RF-081 | O sistema deve permitir reconstruir qualquer decisão de aprovação (item, resposta, horário, versão, regra, cálculo, resultado) | P0 | FATO INFORMADO |
| RF-082 | Auditor tem acesso de leitura à trilha, sem edição | P0 | PROPOSTA |

## 9. Integridade do banco de questões

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-090 | Banco deve ser maior que a prova; seleção aleatória e embaralhamento de alternativas (banco ≥ 1,5× itens aplicados por tentativa; 10–15 itens por objetivo) | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-091 | Cada item deve ter: objetivo, competência, nível, fonte/versão, dificuldade esperada, justificativas, autor, revisores, status, estatísticas, histórico | P0 | FATO INFORMADO (anexo 0003 §6) |
| RF-092 | O sistema deve limitar exposição de respostas corretas após a prova | P1 | PROPOSTA |
| RF-093 | O sistema deve registrar estatísticas observadas por item (dificuldade, discriminação, distratores, contestação) | P1 | PROPOSTA |
| RF-094 | O sistema deve sinalizar itens com anomalia para revisão humana, sem decisão automática | P1 | PROPOSTA |

## 10. Requisitos não cobertos (pendências que impactam o PRD)

- Validação clínica da matriz detalhada e do blueprint de 120 itens do diagnóstico (UC-001, B-07) — demais itens por objetivo definidos em 10–15 (RN-078);
- Avaliadores e dupla correção de respostas construídas (D-070);
- Regra de repetição/atualização da linha de base;
- Equivalência das formas de avaliação;
- Política de certificação — resolvida: status de conclusão no piloto (RN-079);
- Notificações externas;
- Integrações externas (fora de escopo nesta fase).
