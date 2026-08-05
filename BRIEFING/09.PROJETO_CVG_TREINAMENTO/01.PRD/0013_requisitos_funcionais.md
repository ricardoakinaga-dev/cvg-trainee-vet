# 0013 — Requisitos Funcionais

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-05  
**Regra:** nenhuma tecnologia definida; requisitos descrevem capacidades do produto.

Legenda de prioridade: P0 (crítico para o piloto), P1 (alta), P2 (média), P3 (baixa).  
Legenda de classificação: `FATO INFORMADO` / `PROPOSTA` / `PENDENTE`.

---

## 1. Identidade e acesso

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-001 | O sistema deve autenticar usuários individualmente | P0 | FATO INFORMADO |
| RF-002 | O sistema deve identificar o vínculo do colaborador (função, área, turno, unidade) | P0 | FATO INFORMADO |
| RF-003 | O sistema deve atribuir papéis e permissões conforme a matriz de acesso | P0 | PROPOSTA |
| RF-004 | O sistema deve registrar quem criou/alterou cada dado relevante (responsável e data) | P0 | FATO INFORMADO |
| RF-005 | O sistema deve bloquear contas compartilhadas | P1 | PROPOSTA |
| RF-006 | O sistema deve suportar desativação de usuários sem excluir histórico | P1 | PROPOSTA |
| RF-007 | O sistema deve registrar consentimento e finalidade de uso dos dados (LGPD) | P1 | PENDENTE (B-05) |

## 2. Avaliação diagnóstica e linha de base

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-010 | O sistema deve exigir o diagnóstico inicial antes de liberar a trilha | P0 | FATO INFORMADO |
| RF-011 | O diagnóstico deve ser composto por questões organizadas por competência e casos curtos | P0 | FATO INFORMADO |
| RF-012 | O sistema deve calcular perfil por tema e competência, sem depender de nota global única | P0 | FATO INFORMADO |
| RF-013 | O diagnóstico deve ser não punitivo: sem reprovação nem nota pública | P0 | FATO INFORMADO |
| RF-014 | O sistema deve preservar a sessão em caso de interrupção | P1 | PROPOSTA |
| RF-015 | O sistema deve recomendar a trilha inicial com base no perfil | P0 | FATO INFORMADO |
| RF-016 | O sistema deve registrar a linha de base com data, versão dos itens e regra vigente | P0 | FATO INFORMADO |

## 3. Trilha e progressão

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-020 | O sistema deve organizar a jornada em níveis (básico, intermediário, avançado) | P0 | FATO INFORMADO |
| RF-021 | O sistema deve atribuir trilha personalizada por perfil | P0 | FATO INFORMADO |
| RF-022 | O sistema deve manter núcleo obrigatório não dispensável | P0 | FATO INFORMADO |
| RF-023 | O sistema deve gerenciar pré-requisitos entre módulos e níveis | P1 | PROPOSTA |
| RF-024 | O sistema deve gerenciar dispensa por domínio: **não aplicada no piloto**; regra futura | P2 | APROVADA (gate 2026-08-05) |
| RF-025 | O sistema deve controlar estados da trilha conforme vocabulário do anexo 0003 | P0 | PROPOSTA |
| RF-026 | O sistema deve tratar prazos, afastamentos e acomodações | P1 | PENDENTE (D-016/D-018) |
| RF-027 | O sistema deve registrar que aprovação teórica não desbloqueia autorização clínica (aviso explícito) | P0 | FATO INFORMADO |

## 4. Conteúdo

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-030 | O sistema deve exibir conteúdo em unidades curtas (8–15 min alvo) | P1 | PROPOSTA |
| RF-031 | O sistema deve marcar cada unidade com rastreabilidade completa (fonte, versão, validade) | P0 | FATO INFORMADO |
| RF-032 | O sistema deve bloquear exibição de conteúdo vencido ou retirado | P0 | PROPOSTA |
| RF-033 | O sistema deve registrar conclusão de unidades e progresso | P0 | FATO INFORMADO |
| RF-034 | O sistema deve suportar workflow de autoria → revisão clínica → revisão pedagógica → aprovação → publicação | P0 | FATO INFORMADO |
| RF-035 | O sistema deve impedir que autor publique o próprio conteúdo | P0 | FATO INFORMADO |
| RF-036 | O sistema deve versionar todo conteúdo e manter histórico | P0 | FATO INFORMADO |
| RF-037 | O sistema deve registrar data de corte científico e próxima revisão | P1 | PROPOSTA |
| RF-038 | O sistema deve bloquear publicação clínica derivada até resolução de licença (B-04) | P0 | CONDIÇÃO DE GATE |
| RF-039 | O sistema deve suportar retirada emergencial com registro de afetados | P0 | PROPOSTA |

## 5. Avaliações

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-040 | Quiz formativo: itens por objetivo, feedback imediato com justificativa e fonte, múltiplas tentativas | P0 | APROVADA (gate 2026-08-05) |
| RF-041 | Quiz formativo: peso zero na nota somativa | P0 | APROVADA (gate 2026-08-05) |
| RF-042 | Caso clínico: apresentação progressiva em etapas com decisões registradas | P0 | APROVADA (gate 2026-08-05) |
| RF-043 | Caso clínico: feedback formativo e/ou somativo; caso somativo participa com peso 30% | P1 | APROVADA (gate 2026-08-05) |
| RF-044 | Prova somativa: gerada do banco conforme blueprint, com seleção aleatória | P0 | APROVADA (gate 2026-08-05) |
| RF-045 | Prova somativa: tempo e janela definidos | P0 | APROVADA (gate 2026-08-05) |
| RF-046 | Prova somativa: cálculo por objetivo e aplicação dos limiares (70% geral / 80% críticos) | P0 | APROVADA (gate 2026-08-05) |
| RF-047 | Prova somativa: controle de tentativas (2 + remediação; intervalo mínimo de 7 dias; itens diferentes entre tentativas) | P0 | APROVADA (gate 2026-08-05) |
| RF-048 | Remediação: identificação de lacunas, atribuição de reforço, quiz/caso equivalente, intervalo mínimo, nova prova com itens diferentes; 2ª reprovação → plano individual com mentor, sem punição | P0 | APROVADA (gate 2026-08-05) |
| RF-049 | Retenção: avaliação em janela 30/60/90 dias com itens equivalentes | P1 | APROVADA (gate 2026-08-05) |
| RF-050 | Autoavaliação de confiança: escala 1–5 ou 0–100, peso zero, mostrada separada | P2 | APROVADA (gate 2026-08-05) |
| RF-051 | O sistema deve registrar toda tentativa de forma imutável | P0 | FATO INFORMADO |

## 6. Contestação e correção

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-060 | O sistema deve permitir contestação de questão/resultado com justificativa e protocolo | P0 | APROVADA (gate 2026-08-05) |
| RF-061 | O sistema deve rotear a contestação a revisor independente | P0 | APROVADA (gate 2026-08-05) |
| RF-062 | O sistema deve recalcular tentativas afetadas ao anular/alterar gabarito, preservando versão anterior | P0 | APROVADA (gate 2026-08-05) |
| RF-063 | O sistema deve identificar e notificar usuários afetados por alteração de gabarito | P0 | APROVADA (gate 2026-08-05) |
| RF-064 | O sistema deve registrar decisão e justificativa de cada contestação | P0 | APROVADA (gate 2026-08-05) |
| RF-065 | O sistema deve controlar prazo de resposta da contestação: 7 dias úteis | P1 | APROVADA (gate 2026-08-05) |

## 7. Painéis e métricas

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-070 | Painel do colaborador: progresso, domínio por competência, retenção, consistência, confiança, histórico | P0 | PROPOSTA |
| RF-071 | Painel do colaborador: recomendações de estudo | P1 | PROPOSTA |
| RF-072 | Painel do mentor: lacunas autorizadas da equipe e plano de reforço | P1 | PROPOSTA |
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
| RF-090 | Banco deve ser maior que a prova; seleção aleatória e embaralhamento de alternativas (banco ≥ 1,5× itens aplicados por tentativa; 10–15 itens por objetivo) | P0 | APROVADA (gate 2026-08-05) |
| RF-091 | Cada item deve ter: objetivo, competência, nível, fonte/versão, dificuldade esperada, justificativas, autor, revisores, status, estatísticas, histórico | P0 | FATO INFORMADO (anexo 0003 §6) |
| RF-092 | O sistema deve limitar exposição de respostas corretas após a prova | P1 | PROPOSTA |
| RF-093 | O sistema deve registrar estatísticas observadas por item (dificuldade, discriminação, distratores, contestação) | P1 | PROPOSTA |
| RF-094 | O sistema deve sinalizar itens com anomalia para revisão humana, sem decisão automática | P1 | PROPOSTA |

## 10. Requisitos não cobertos (pendências que impactam o PRD)

- Blueprint e número de itens do diagnóstico (UC-001, B-07) — demais itens por objetivo definidos em 10–15 (RN-078);
- Avaliadores e dupla correção de respostas construídas (D-063);
- Regra de repetição/atualização da linha de base;
- Equivalência das formas de avaliação;
- Política de certificação — resolvida: status de conclusão no piloto (RN-079);
- Notificações externas;
- Integrações externas (fora de escopo nesta fase).
