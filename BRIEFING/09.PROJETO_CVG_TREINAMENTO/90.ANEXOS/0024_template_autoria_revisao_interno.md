# Anexo 0024 — Template Interno de Autoria, Revisão e Projeção

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data:** 2026-08-09
**Status:** `TEMPLATE_DOCUMENTAL_PRONTO; NÃO É ESQUEMA DE API OU BANCO`
**Uso:** equipe de conteúdo, revisão clínica, aprovação e auditoria
**Base:** Anexos 0001, 0016, 0017, 0022 e 0023; D-070, D-083, D-085, D-086 e D-109

## 1. Finalidade e limite

Este template organiza a criação de unidades, quizzes, questões objetivas, casos, respostas abertas, rubricas, feedback e remediação. Ele transforma a leitura técnica em conteúdo autoral do CVG antes da construção da plataforma.

O template é um instrumento editorial interno. Não cria rotas, tabelas, APIs, telas, integrações ou decisões de fornecedor. Esses contratos só podem ser derivados na SPEC após autorização para `0101`.

## 2. Contrato de exposição

O registro de autoria/revisão pode conter a rastreabilidade necessária para o desenvolvedor, revisor, aprovador e auditor. A projeção do participante deve conter somente conteúdo autoral do CVG, casos fictícios, feedback e estados educacionais necessários.

É proibido projetar para o participante, direta ou indiretamente:

- nome, autor, editora, edição, ISBN, código, capítulo, seção, página, data de consulta ou data de corte de qualquer obra;
- PDF, OCR, trecho, paráfrase próxima, foto, figura, tabela, imagem, reprodução ou link de terceiros;
- nome de diretriz externa ou qualquer metadado que permita localizar ou reconstruir a fonte;
- gabarito, resposta aceita interna, erro crítico ou nota de correção antes do momento educacional autorizado;
- versão, estado de revisão ou decisão interna da fonte.

O participante não cita bibliografia. A plataforma não deve oferecer uma biblioteca de obras nem uma função para pesquisar os PDFs.

## 3. Ficha de intenção pedagógica

Preencher antes de redigir o item ou a unidade:

| Campo | Preenchimento obrigatório |
|---|---|
| `content_id` | identificador estável do conteúdo CVG |
| `module_id` / `session_id` | módulo e sessão da trilha |
| `objective_id` | objetivo observável |
| `competency` | competência clínica ou comunicacional trabalhada |
| `species` | cão, gato, ambas ou não aplicável |
| `format` | unidade, quiz, melhor resposta, associação, interpretação, resposta curta, dissertativa, simulação ou reflexão |
| `cognitive_level` | reconhecimento, interpretação, aplicação, análise ou integração |
| `estimated_minutes` | tempo de estudo/atividade |
| `clinical_context` | emergência, internação, cirurgia, sistema ou integração |
| `participant_outcome` | o que o participante deverá reconhecer, decidir, justificar ou comunicar |
| `prerequisites` | conhecimentos ou sessões necessários |
| `remediation_target` | objetivo que será reforçado se houver erro |
| `retention_window` | revisão equivalente em 30, 60 ou 90 dias, quando aplicável |
| `hospital_behavior` | comportamento de rotina que o módulo pretende tornar observável |
| `team_audience` | veterinário, enfermagem/técnico ou multiprofissional |
| `team_behaviors` | comunicação fechada, handoff, monitoramento, apoio mútuo ou liderança |
| `assessment_modes` | recuperação ativa, raciocínio em caso, simulação digital, debriefing e retenção |
| `spaced_review_days` | padrão CVG: D+30, D+60 e D+90 |
| `transfer_metric` | indicador agregado/manual do piloto, sem prontuário ou dado identificável |
| `mastery_rule` | 70% geral, 80% em objetivo crítico e gate de comportamento crítico digital |

Regras de desenho:

1. o caso deve ser fictício e conter somente dados necessários para a decisão;
2. a pergunta deve avaliar uma decisão, não a memorização de uma página;
3. o enunciado deve separar fato, interpretação, incerteza e próxima ação;
4. uma alternativa insegura não pode vencer por ambiguidade linguística;
5. dose, concentração, infusão, transfusão, RCP ou critério regulatório exigem atualização contemporânea e protocolo identificado internamente;
6. se a conduta depender de protocolo CVG ainda inexistente, o autor deve redigir um protocolo interno original a partir da literatura consultada; a publicação depende somente da revisão clínica e aprovação de Ricardo, sem consulta ou dependência de fornecedor externo.

No MVP, as modalidades acima medem somente conhecimento, raciocínio, priorização e comunicação simulada. Observação de trabalho, prática presencial, avaliação psicomotora, nível de supervisão e autonomia são escopo futuro bloqueado pelo `GATE-EXP-PRAT-01`.

## 4. Registro interno de construção e fonte

Preencher somente no documento ou sistema interno de autoria/revisão:

| Campo | Valor |
|---|---|
| `source_id` | F-01, F-02, F-03, diretriz, bula, legislação ou protocolo interno |
| `work_title` | título interno da obra ou documento consultado |
| `edition_or_date` | edição/ano ou data da fonte |
| `chapter_locator` | capítulo, seção, parte ou localização interna |
| `pdf_page` | página do PDF local, quando aplicável |
| `source_url` | somente para controle interno; nunca para a projeção do participante |
| `source_hash` | hash local, quando necessário para integridade |
| `consulted_at` | data da consulta |
| `protocol_id` | protocolo CVG autoral/versionado ou `NAO_APLICAVEL` |
| `dynamic_topic` | sim/não; indicar RCP, fluido, dose, transfusão, antimicrobiano ou regulação |
| `scientific_cutoff` | data da última revisão clínica |
| `valid_until` | validade de 6, 12 ou 24 meses, conforme criticidade |
| `conflict_id` | conflito entre obras, diretriz, bula, legislação ou protocolo |
| `conflict_decision` | decisão documentada de Ricardo, quando houver |
| `content_status` | estado editorial vigente do item ou pack |
| `clinical_review` | `PENDENTE`, `EM_REVISAO`, `APROVADO` ou estado equivalente definido pelo workflow |
| `publication_authorized` | booleano interno; deve permanecer falso até aprovação de Ricardo |
| `remediation_target_objective` | objetivo que recebe reforço quando houver erro crítico |
| `retention_forms` | formas equivalentes previstas para D+30, D+60 e D+90 |
| `technical_preflight` | resultado de contagem, campos, correção, projeção e bloqueio de publicação |

A hierarquia interna é: legislação/bula aplicável, protocolo CVG aprovado, diretriz atual, fonte clínica atualizada e obras estáticas. A hierarquia orienta a construção; nunca aparece como bibliografia na experiência do participante.

## 5. Redação autoral

O autor deve confirmar:

- [ ] texto escrito do zero pelo CVG;
- [ ] nenhuma transcrição ou paráfrase próxima de obra protegida;
- [ ] nenhuma tabela, figura, foto, página, diagrama ou imagem de obra utilizada;
- [ ] exemplos, pacientes, tutores, horários, exames e evoluções são fictícios;
- [ ] o texto não afirma competência prática, autonomia ou autorização de procedimento;
- [ ] o material não depende de uma única afirmação estática quando o tema é atualizável;
- [ ] termos técnicos necessários foram redigidos sem revelar o identificador da fonte;
- [ ] qualquer ativo visual futuro é original do CVG ou possui autorização documental separada; na dúvida, publicar sem o ativo.

## 6. Avaliação e feedback

### 6.1 Questão objetiva ou quiz

| Campo | Definição interna |
|---|---|
| resposta correta | alternativa ou conjunto de alternativas |
| respostas equivalentes | formulações previamente aceitas |
| distratores | erro clínico plausível, sem pegadinha |
| criticidade | não crítica, crítica ou bloqueadora |
| justificativa | explicação técnico-clínica em redação própria CVG |
| feedback por erro | correção acionável e objetivo a revisar |
| remediação | conteúdo curto + caso/quiz equivalente |

### 6.2 Resposta curta ou dissertativa

Antes da publicação, registrar rubrica, pesos, resposta aceita, limites, erro crítico, feedback e decisão de escalonamento para correção humana. A rubrica deve avaliar o raciocínio pedido — por exemplo, prioridade, meta, reavaliação, risco, comunicação e gatilho — e não estilo literário ou citação bibliográfica.

Se o item não puder ser corrigido com segurança, ele deve ser redesenhado, estruturado em campos avaliáveis ou encaminhado previamente para correção humana. Nunca publicar uma pergunta sem método de correção testado.

## 7. Revisão e aprovação

### 7.1 Autoverificação do autor

- [ ] objetivo e formato estão coerentes;
- [ ] caso contém dados suficientes e não contém dados reais;
- [ ] conteúdo está atualizado para o tema;
- [ ] fonte e conflito estão registrados somente internamente;
- [ ] gabarito/rubrica, respostas aceitas, erros e feedback estão completos;
- [ ] remediação e retenção estão definidas;
- [ ] projeção participante foi limpa de qualquer rastreabilidade ou ativo protegido.

### 7.2 Revisão clínica

Ricardo deve verificar correção, atualidade, segurança, espécie, contexto, protocolo, divergências e risco de interpretação. A publicação fica bloqueada quando houver conflito clínico crítico, protocolo ausente para conduta dependente dele, fonte vencida ou feedback inseguro.

### 7.3 Aprovação e estado editorial

Estados internos mínimos:

```text
RASCUNHO
→ AUTOVERIFICADO
→ EM_REVISAO_CLINICA
→ AJUSTES_SOLICITADOS (quando necessário)
→ APROVADO_CLINICAMENTE
→ PROJECAO_VERIFICADA
→ AUTORIZADO_PARA_PUBLICACAO
→ PUBLICADO
→ RETIRADO ou VENCIDO
```

Cada transição deve preservar autor, aprovador, data, versão, justificativa e decisão. Esses dados são internos e não devem ser exibidos ao participante.

## 8. Projeção do participante

Antes de liberar qualquer unidade, executar esta lista sobre o texto, os anexos, os metadados e o payload futuro:

- [ ] somente conteúdo autoral do CVG e casos fictícios;
- [ ] nenhum nome, código, obra, autor, capítulo, página, fonte ou data de consulta;
- [ ] nenhum PDF, OCR, trecho, foto, tabela, figura, imagem ou link de terceiros;
- [ ] nenhum nome de diretriz externa;
- [ ] nenhum gabarito ou metadado de revisão interna;
- [ ] nenhuma instrução para pesquisar, citar ou informar bibliografia;
- [ ] feedback explica o raciocínio sem apontar a localização da fonte;
- [ ] exportação, notificação, analytics e logs acessíveis ao participante passam pela mesma limpeza;
- [ ] material do facilitador e registro interno permanecem separados.

## 9. Pré-voo sintético

Executar antes da aprovação clínica:

1. aplicar o gabarito/rubrica a respostas corretas, incompletas, ambíguas e perigosas;
2. confirmar que todo erro crítico aciona o objetivo correto e uma remediação educativa;
3. verificar que uma resposta insegura nunca é aceita por equivalência semântica;
4. conferir pausa, retomada, submissão única e preservação de versões;
5. conferir que a publicação não projeta campos internos ou ativos de terceiros;
6. registrar resultado, achados, correções e decisão de repetir o pré-voo.

## 10. Handoff documental para a futura SPEC

Quando `0101` for autorizado, este template será usado como insumo para derivar contratos e dados, sem ampliar o escopo aprovado. A SPEC deverá decidir como representar, proteger e auditar os campos internos, além de separar rigorosamente a projeção do participante.

Este template não autoriza autoria em escala, aplicação de B-07, publicação geral, contratação de fornecedor, implementação ou BUILD.
