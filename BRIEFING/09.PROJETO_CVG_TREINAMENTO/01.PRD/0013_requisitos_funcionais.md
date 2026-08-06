# 0013 — Requisitos Funcionais

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-06
**Regra:** os requisitos descrevem capacidades; recomendações arquiteturais pré-SPEC ficam no Anexo 0020.

> **Regra transversal de dados:** B-05 foi fechado por D-077. RFs que envolvam identificação, respostas, notas, personalização, painéis, logs ou auditoria devem respeitar estritamente o [Anexo 0011](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md). Prontuários, dados de tutores, gravações e casos reais identificáveis são proibidos.

Legenda de prioridade: P0 (crítico para o piloto), P1 (alta), P2 (média), P3 (baixa).  
Legenda de classificação: `FATO INFORMADO` / `PROPOSTA` / `PENDENTE`.

---

## 1. Identidade e acesso

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-001 | O sistema deve autenticar usuários individualmente | P0 | FATO INFORMADO |
| RF-002 | O sistema deve identificar o colaborador por nome, identificador interno e login/e-mail profissional; função, área, turno e unidade não entram no cadastro do MVP | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RF-003 | O sistema deve atribuir papéis e permissões conforme a matriz de capacidades aprovada | P0 | APROVADA PELO PATROCINADOR (D-092, 2026-08-06) |
| RF-004 | O sistema deve registrar quem criou/alterou cada dado relevante (responsável e data) | P0 | FATO INFORMADO |
| RF-005 | O sistema deve bloquear contas compartilhadas | P1 | APROVADA PELO PATROCINADOR (D-077/D-091, 2026-08-06) |
| RF-006 | O sistema deve suportar desativação de usuários sem excluir histórico | P1 | APROVADA PELO PATROCINADOR (D-077/D-091, 2026-08-06) |
| RF-007 | Antes do primeiro uso, a coordenação deve apresentar comunicação operacional simples sobre finalidade, dados mínimos, acesso e retenção; o T2 não depende de gate documental adicional | P1 | APROVADA PELO PATROCINADOR COMO INSUMO (D-077/D-089) |
| RF-008 | O participante deve administrar a própria conta: consultar nome, identificador interno, e-mail profissional e estado; alterar credencial e encerrar outras sessões sem acessar campos não autorizados | P0 | APROVADA PELO PATROCINADOR (D-090/D-091, 2026-08-06) |
| RF-009 | O administrador deve convidar usuários, reenviar convite, ativar/desativar conta, atribuir papel e trilha e revogar sessões, preservando o histórico | P0 | APROVADA PELO PATROCINADOR (D-090/D-091/D-092, 2026-08-06) |

## 2. Avaliação diagnóstica e linha de base

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-010 | O sistema deve apresentar um diagnóstico inicial amplo e fracionado antes da trilha, sem aprovação ou reprovação | P0 | PROPOSTA 0016: 120 itens em três sessões; blueprint clínico ainda deve ser validado em B-07 |
| RF-011 | O diagnóstico deve ser composto por questões organizadas por competência e casos curtos | P0 | FATO INFORMADO |
| RF-012 | O sistema deve calcular perfil por tema e competência, sem depender de nota global única | P0 | FATO INFORMADO |
| RF-013 | O diagnóstico deve ser não punitivo: sem reprovação nem nota pública | P0 | FATO INFORMADO |
| RF-014 | O sistema deve preservar a sessão em caso de interrupção | P1 | APROVADA COMO REGRA DE CONFIABILIDADE (D-096/D-098, 2026-08-06) |
| RF-015 | O sistema deve recomendar a trilha inicial com base no perfil | P0 | FATO INFORMADO |
| RF-016 | O sistema deve registrar a linha de base com data, versão dos itens e regra vigente | P0 | FATO INFORMADO |

## 3. Trilha e progressão

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-020 | O sistema deve permitir configurar a trilha de 24 meses em duas partes, 24 módulos mensais e 96 sessões, publicando somente os módulos autorizados | P0 | APROVADA PELO PATROCINADOR (D-084/D-085, 2026-08-06) |
| RF-021 | O sistema deve atribuir trilha personalizada por perfil | P0 | FATO INFORMADO |
| RF-022 | O sistema deve manter núcleo obrigatório não dispensável | P0 | FATO INFORMADO |
| RF-023 | O sistema deve gerenciar pré-requisitos entre módulos e trilhas | P1 | APROVADA NA TRILHA V3 (D-084/D-085; PRD 0017) |
| RF-024 | O sistema deve gerenciar dispensa por domínio: **não aplicada no piloto**; regra futura | P2 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-025 | O sistema deve controlar separadamente progresso, avaliação e domínio conforme D-102 | P0 | PROPOSTA PARA APROVAÇÃO DO GATE (D-102) |
| RF-026 | O sistema deve pausar/deslocar prazos em afastamentos/férias e aplicar acomodações autorizadas sem reduzir objetivos | P1 | PROPOSTA PARA APROVAÇÃO DO GATE (D-104) |
| RF-027 | O sistema deve exibir aviso explícito de que aprovação em prova, caso ou simulação digital não comprova competência prática nem desbloqueia autorização clínica | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RF-028 | A tela inicial deve mostrar o progresso e uma única próxima ação recomendada | P0 | APROVADA PELO PATROCINADOR COMO DIRETRIZ DE USABILIDADE (D-080) |

## 4. Conteúdo

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-030 | O sistema deve organizar cada módulo mensal em quatro sessões, com carga regular de 6 horas e janelas assíncronas para pesquisa e casos | P1 | APROVADA PELO PATROCINADOR (D-084/D-085, 2026-08-06) |
| RF-031 | Cada módulo deve registrar internamente a obra e o capítulo/seção consultados, sem exibir esses metadados ao aluno | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05) |
| RF-032 | O sistema deve bloquear exibição de conteúdo vencido ou retirado | P0 | APROVADA COMO REGRA DE CONTEÚDO (RN-047 a RN-049) |
| RF-033 | O sistema deve registrar conclusão de unidades e progresso | P0 | FATO INFORMADO |
| RF-034 | O sistema deve suportar autoria → revisão clínica de Ricardo → aprovação → publicação, mantendo revisão adicional opcional | P0 | APROVADA PELO PATROCINADOR EM D-083 (2026-08-06) |
| RF-035 | O sistema deve impedir a publicação de módulo clínico sem fonte, versão, rubrica/gabarito testado e aprovação humana registrada de Ricardo | P0 | APROVADA PELO PATROCINADOR EM D-083 (2026-08-06) |
| RF-036 | O sistema deve versionar todo conteúdo e manter histórico | P0 | FATO INFORMADO |
| RF-037 | O sistema deve registrar data de corte científico e próxima revisão | P1 | APROVADA COMO REGRA DE CONTEÚDO (RN-040/RN-047) |
| RF-038 | O sistema não deve armazenar, distribuir ou exibir os PDFs; eventual OCR, indexação, embeddings, RAG ou envio dos arquivos a IA depende de decisão futura D-033, sem bloquear conteúdo original produzido manualmente | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05) |
| RF-039 | O sistema deve suportar retirada emergencial com registro de afetados | P0 | APROVADA COMO REGRA DE CONTEÚDO (RN-048) |

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
| RF-057 | Casos digitais devem suportar ramificações, estado persistente, consequências, exames seriados, radiografias, POCUS e ECG | P0 | PROPOSTA CURRICULAR V3 |
| RF-058 | Atividades devem suportar cálculo de dose/infusão, campos estruturados e respostas abertas; campos avaliáveis usam rubrica automática e respostas dissertativas usam rubrica com correção humana de Ricardo | P0 | APROVADA PELO PATROCINADOR EM D-070/D-083/D-085 (2026-08-06) |
| RF-059 | O sistema deve suportar formas equivalentes pelo mesmo blueprint, revisão espaçada, retomada e resultado por objetivo/competência/trilha | P0 | PROPOSTA PARA APROVAÇÃO DO GATE (D-106) |

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
| RF-070 | Painel do colaborador: próxima ação, progresso da trilha/módulo, sessões, correções pendentes, remediação, retenção, evolução por competência e histórico | P0 | APROVADA PELO PATROCINADOR (D-090/D-093, 2026-08-06) |
| RF-071 | Painel do colaborador: recomendações de estudo e acesso rápido à conta e ao relato de problema/melhoria | P1 | FATO INFORMADO PELO PATROCINADOR (D-090) |
| RF-072 | Painel do moderador: somente participantes e filas atribuídos, com progresso, lacunas, correções, feedback e plano de reforço digital, sem registro ou validação de prática | P0 | APROVADA PELO PATROCINADOR (D-090/D-092/D-093, 2026-08-06) |
| RF-073 | Painel do administrador: contas, ativação, progresso, conclusão, inatividade, correções/SLA, remediação, validade de conteúdo, feedback e falhas técnicas | P0 | APROVADA PELO PATROCINADOR (D-090/D-093/D-095, 2026-08-06) |
| RF-074 | O sistema deve restringir painéis por papel e escopo | P0 | FATO INFORMADO |
| RF-075 | O sistema não deve exibir ranking público | P0 | FATO INFORMADO |
| RF-076 | O sistema deve tratar `DADO_INCOMPLETO`, `NAO_APLICAVEL`, exclusões e acomodações sem converter ausência em zero | P1 | APROVADA EM D-095; acomodação detalhada em D-104 |

## 8. Auditoria

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-080 | O sistema deve registrar trilha de auditoria de ações sensíveis (alterações de nota/gabarito, aprovações, retiradas, alterações de permissão) | P0 | FATO INFORMADO |
| RF-081 | O sistema deve permitir reconstruir qualquer decisão de aprovação (item, resposta, horário, versão, regra, cálculo, resultado) | P0 | FATO INFORMADO |
| RF-082 | Auditor tem acesso de leitura à trilha, sem edição | P0 | APROVADA NA MATRIZ DE CAPACIDADES (D-092) |

## 9. Integridade do banco de questões

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-090 | Banco deve ser maior que a prova; seleção aleatória e embaralhamento de alternativas (banco ≥ 1,5× itens aplicados por tentativa; 10–15 itens por objetivo) | P0 | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| RF-091 | Cada item deve ter: objetivo, competência, nível, fonte/versão, dificuldade esperada, justificativas, autor, revisores, status, estatísticas, histórico | P0 | FATO INFORMADO (anexo 0003 §6) |
| RF-092 | O sistema deve limitar exposição de respostas corretas após a prova | P1 | PROPOSTA |
| RF-093 | O sistema deve registrar estatísticas observadas por item (dificuldade, discriminação, distratores, contestação) | P1 | PROPOSTA |
| RF-094 | O sistema deve sinalizar itens com anomalia para revisão humana, sem decisão automática | P1 | PROPOSTA |
| RF-095 | Ao registrar erro crítico em caso digital, o sistema deve explicar a decisão, marcar somente o objetivo afetado para reforço, atribuir conteúdo curto e novo caso equivalente e impedir apenas a conclusão desse objetivo até uma decisão segura; não pode gerar ranking, punição ou reprovação definitiva | P0 | APROVADA PELO PATROCINADOR EM D-082 (2026-08-06) |
| RF-096 | O sistema deve impedir a publicação de pergunta/caso sem gabarito ou rubrica testados, respostas aceitas, erros relevantes e feedback; se a resposta não puder ser avaliada automaticamente, o item deve ser redesenhado ou marcado previamente para correção humana | P0 | FATO INFORMADO PELO PATROCINADOR; D-070 (2026-08-06) |
| RF-097 | Atividades de pesquisa e casos abertos devem permitir consulta às fontes, pausa/retomada e janela assíncrona, exigindo indicação da fonte usada | P0 | APROVADA COMO DIREÇÃO EM D-085 (2026-08-06) |
| RF-098 | O sistema deve suportar respostas curtas e dissertativas com rubrica, status de correção pendente, feedback humano e histórico da decisão | P0 | APROVADA COMO DIREÇÃO EM D-083/D-085 (2026-08-06) |
| RF-099 | O sistema deve combinar quiz, múltipla escolha/associação, resposta aberta, interpretação e reflexão sem depender de um único formato para avaliar desenvolvimento | P0 | APROVADA COMO DIREÇÃO EM D-085 (2026-08-06) |

## 10. Feedback de produto e melhoria contínua

| ID | Requisito | Prioridade | Classificação |
|---|---|---|---|
| RF-100 | O sistema deve manter ação visível para relatar problema ou melhoria | P0 | FATO INFORMADO PELO PATROCINADOR (D-090) |
| RF-101 | O relato deve distinguir bug técnico, usabilidade, erro de conteúdo, melhoria e contestação | P0 | APROVADA PELO PATROCINADOR (D-094, 2026-08-06) |
| RF-102 | Contestação de questão, gabarito ou nota deve permanecer no fluxo auditável de RF-060 a RF-065 | P0 | FATO INFORMADO |
| RF-103 | Participante deve acompanhar somente seus relatos e respectivas respostas; moderador e administrador veem o escopo autorizado | P1 | APROVADA PELO PATROCINADOR (D-092/D-094, 2026-08-06) |
| RF-104 | Administrador/moderador deve triar, priorizar, atribuir, responder e encerrar relatos com histórico de estado | P0 | APROVADA PELO PATROCINADOR (D-090/D-094, 2026-08-06) |
| RF-105 | Erro clínico ou de conteúdo deve permitir alerta imediato e retirada conforme RF-039 | P0 | FATO INFORMADO |
| RF-106 | O relato não deve ter anexos nem capturar automática ou manualmente respostas, prontuários, parâmetros sensíveis de URL, áudio, vídeo, gravação de tela ou dado de paciente/tutor; conteúdo suspeito é bloqueado e eventual escape é redigido com auditoria | P0 | APROVADA PELO PATROCINADOR (D-094, 2026-08-06) |
| RF-107 | O sistema deve associar ao relato somente contexto técnico mínimo: página lógica, versão da aplicação, datas e código de erro quando existente | P1 | APROVADA PELO PATROCINADOR (D-094, 2026-08-06) |

## 11. Requisitos não cobertos (pendências que impactam o PRD)

- Aprovação conjunta de D-101 a D-108 e dos gates sobre commit identificado;
- Validação clínica da matriz e produção dos 120 itens do diagnóstico (B-07) antes da baseline/piloto completo; não bloqueia a SPEC se D-101 for aprovada;
- Qualidade da correção estruturada deve ser verificada no piloto; D-070 permite migrar a atividade afetada para correção humana se surgirem lacunas ou erros repetidos;
- Repetição/atualização da baseline e equivalência são definidas em D-105/D-106 no pacote de gate;
- Notificações e integrações externas permanecem fora do escopo e não bloqueiam o MVP.
