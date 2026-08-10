# Anexo 0025 — Plano Interno da Primeira Onda Curricular

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data:** 2026-08-09  
**Status:** `PLANO_INTERNO_PRONTO; PRODUÇÃO NÃO AUTORIZADA`  
**Uso:** desenvolvimento, autoria, revisão clínica, aprovação e auditoria  
**Base:** PRD 0016, PRD 0017, Anexos 0010, 0012, 0014–0019, 0022–0024; D-062, D-082, D-087, D-088 e D-109

## 1. Finalidade e limite

Este anexo transforma a ordem da primeira onda já aprovada em um plano editorial verificável. O objetivo é validar o formato, a sequência pedagógica, a carga de autoria/revisão, a avaliabilidade e a segurança antes de expandir para os demais módulos da trilha de 24 meses.

O plano é somente interno. Ele não contém material para o participante, não publica conteúdo clínico, não autoriza a produção dos 120 itens diagnósticos, não amplia o ensaio controlado da M02, não inicia a SPEC 0101 e não autoriza código, contratação, aplicação ou BUILD.

A ordem canônica é a de D-062:

```text
NC-01
→ NC-02
→ NC-03
→ ponte NC-04/NC-05 + EM-01
→ ponte NC-04/NC-05 + IN-01
→ caso integrador
```

## 2. Regra absoluta de exposição e autoria

Os identificadores de fonte, localizadores, hashes, páginas, datas, conflitos e decisões clínicas podem existir somente no registro de construção e revisão destinado ao desenvolvedor, autor, revisor, aprovador e auditor.

A projeção do participante deve conter apenas conteúdo autoral do CVG, casos integralmente fictícios, feedback, remediação e estados educacionais necessários. É proibido projetar, inclusive por payload, exportação, notificação, analytics ou log acessível ao participante:

- nome da obra, autor, editora, edição, ISBN, código, capítulo, seção, página ou data de consulta;
- PDF, OCR, trecho, paráfrase próxima, foto, figura, tabela, imagem ou reprodução de terceiro;
- link de terceiro, nome de diretriz externa ou metadado que permita localizar ou reconstruir a fonte;
- gabarito, resposta aceita, erro crítico, nota, versão ou decisão interna antes do momento educacional autorizado;
- biblioteca de obras, busca bibliográfica, consulta dos PDFs, instrução para pesquisar ou exigência de citação.

O conteúdo é redigido do zero pelo CVG. A rastreabilidade serve para construir, revisar, atualizar e retirar o conteúdo com segurança; ela não é uma funcionalidade do usuário.

## 3. Composição da primeira onda

| Ordem | Pacote interno | Competência de saída/propósito | Dependência principal |
|---:|---|---|---|
| 1 | `W1-NC-01` — Avaliação clínica organizada | obter, selecionar e organizar dados; produzir história, exame dirigido, lista de problemas e registro coerentes | matriz de objetivos e fatia editorial autorizada |
| 2 | `W1-NC-02` — Raciocínio, diagnóstico e evidência | sintetizar problemas, priorizar diferenciais, escolher exames que alterem a conduta e revisar hipóteses | `W1-NC-01` revisado e aprovado |
| 3 | `W1-NC-03` — Terapêutica e prescrição seguras | formular plano justificável, detectar riscos e ajustar a conduta conforme paciente, resposta e contexto | `W1-NC-02` revisado e aprovado |
| 4 | `W1-PONTE-01` — NC-04/NC-05 + EM-01 | fornecer somente os fundamentos necessários de dor, perfusão, fluidos, eletrólitos, ácido-base e nutrição para reconhecer instabilidade, priorizar e reavaliar | `W1-NC-01` + `W1-NC-03`; a ponte não finge concluir NC-04/NC-05 |
| 5 | `W1-PONTE-02` — NC-04/NC-05 + IN-01 | aplicar os mesmos fundamentos à admissão, lista ativa, ordens, metas e monitoramento proporcional ao risco | `W1-PONTE-01` e decisão de continuidade |
| 6 | `W1-INTEGRADOR-01` — Caso integrador | integrar avaliação, raciocínio, terapêutica, estabilização, internação, comunicação e reavaliação em um caso fictício | todos os pacotes anteriores aceitos |

Os nomes acima são códigos de planejamento e não devem aparecer na experiência do participante como identificadores de fonte ou de construção. A nomenclatura pedagógica apresentada ao participante deve ser autoral, clara e independente deste registro interno.

## 4. Produção por estágios

### 4.1 Matriz interna antes da redação

Para cada pacote, registrar no [Anexo 0024](0024_template_autoria_revisao_interno.md):

- competência, objetivos observáveis, espécie, contexto e nível cognitivo;
- condições, contrastes, dados ausentes ou conflitantes e pontos de decisão;
- erros críticos, consequência simulada, regra de ocorrência e remediação;
- formato digital, tempo estimado, pré-requisitos, retenção e critérios de domínio;
- dependência de protocolo atualizável: quando necessário, o protocolo é redigido internamente a partir da literatura consultada, recebe versão e revisão clínica de Ricardo e segue junto do conteúdo; não há espera por fornecedor ou consulta externa.

Um módulo completo segue a definição de pronto do PRD 0016. Uma ponte ou caso integrador deve declarar explicitamente o subconjunto de objetivos usado; não deve ser apresentado como se tivesse concluído um módulo inteiro.

### 4.2 Redação e avaliação autorais

Cada pacote deve ser escrito com casos fictícios e dados mínimos para a decisão. A produção pode combinar unidade técnica, quiz de recuperação, questão objetiva, interpretação, resposta curta, resposta dissertativa, registro/passagem e simulação digital, conforme o objetivo.

Toda atividade avaliável precisa ter, antes da publicação autorizada, gabarito ou rubrica, respostas equivalentes previamente definidas quando aplicável, distratores plausíveis, erro crítico, feedback acionável, remediação e teste sintético. Pergunta sem método de correção seguro fica bloqueada.

Conduta dependente de dose, concentração, infusão, transfusão, RCP, antimicrobiano, regulação ou protocolo interno será redigida em protocolo CVG autoral, usando a literatura consultada como base técnica e revisão clínica interna. O conteúdo não é copiado; a unidade só avança depois da revisão clínica e da projeção participante, sem depender de fornecedor ou calibração externa.

### 4.3 Revisão, projeção e controle

O fluxo editorial mínimo é:

```text
RASCUNHO
→ AUTOVERIFICADO
→ EM_REVISAO_CLINICA
→ APROVADO_CLINICAMENTE
→ PROJECAO_VERIFICADA
→ AUTORIZADO_PARA_PUBLICACAO
```

`AJUSTES_SOLICITADOS`, `RETIRADO` e `VENCIDO` continuam disponíveis conforme o Anexo 0024. Nenhum estado interno é mostrado ao participante.

Antes de cada mudança de estado, verificar texto, anexos, metadados, payload, exportação, notificação, analytics e logs da projeção. A inspeção deve confirmar que não há obra, fonte, página, imagem, reprodução, citação ou metadado reconstrutivo.

## 5. Critérios de aceite de cada pacote

Um pacote da primeira onda só pode ser considerado pronto para a próxima etapa quando houver:

1. objetivos e competência de saída aprovados;
2. casos fictícios, redação original e ausência de dados reais;
3. gabaritos/rubricas, feedback, remediação e retenção testados;
4. registro interno das fontes e conflitos, sem projeção desses campos;
5. revisão clínica de Ricardo, incluindo espécie, atualidade, segurança e protocolo;
6. pré-voo sintético com respostas corretas, incompletas, ambíguas e perigosas;
7. projeção participante limpa em todas as superfícies acessíveis;
8. versão, autor, aprovador, decisão e justificativa preservados somente no controle interno;
9. decisão registrada sobre avançar, corrigir, pausar ou retirar o pacote.

O aceite editorial não equivale a publicação geral, aplicação do diagnóstico ou autorização de prática clínica. A primeira versão avalia conhecimento e raciocínio em cenários digitais; não comprova habilidade manual, execução de procedimento ou autonomia profissional.

## 6. Uso da M02 dentro da onda

Os Anexos 0014–0019 representam uma fatia vertical documental da M02, utilizada para aprender sobre autoria, correção, carga e pré-voo. O T2 foi autorizado por D-088 apenas como ensaio controlado e cronometrado.

O T2 não libera publicação geral, uso somativo, certificação, coorte completa ou produção em escala. Seus achados podem ajustar o formato da ponte `W1-PONTE-01`, mas não alteram por si só a ordem D-062 nem substituem os gates humanos e clínicos.

## 7. Evidências de decisão e métricas internas

Registrar por pacote, sem coletar material protegido ou dados clínicos reais:

- horas de autoria, revisão, correção e ajuste;
- clareza do enunciado, avaliabilidade e consistência do gabarito/rubrica;
- frequência e natureza de erros críticos em dados sintéticos ou ensaio autorizado;
- tempo e carga percebida do participante, pausa/retomada e compreensão do feedback;
- necessidade de remediação, retenção e nova versão;
- incidentes de projeção indevida de metadados, fontes ou ativos, cujo resultado esperado é zero.

Com a coorte pequena prevista, os números são evidência operacional exploratória. A decisão de expansão deve combinar revisão clínica, qualidade dos casos, correção, segurança, esforço e ausência de exposição autoral; não deve depender somente de uma taxa de acerto.

## 8. Portas para a expansão

A expansão para a onda seguinte exige cumulativamente:

- pacotes anteriores aceitos conforme este anexo e o Anexo 0024;
- aprendizado documentado do T2 da M02, sem transformar o ensaio em publicação;
- blueprint B-07 aprovado antes da produção dos seus 120 itens;
- protocolos clínicos necessários redigidos internamente a partir da literatura e revisados por Ricardo;
- autorização humana para a fase documental/engenharia correspondente;
- confirmação de que os contratos futuros separam registro interno e projeção participante.

Enquanto essas condições não forem satisfeitas, o documento permanece como plano interno e não dispara produção, SPEC, BUILD ou publicação.

## 9. Registro de estado

- `artifact_id`: `CUR-25-01`
- `status`: `COMPLETED` para o plano documental; produção dos pacotes: `PENDENTE_DE_AUTORIZACAO`
- `evidence`: PRD 0016/0017; D-062; Anexos 0010, 0012, 0014–0019, 0022, 0023 e 0024
- `next_action`: usar a SPEC 0190 e o Anexo 0027 como entrada da documentação do BUILD; produção editorial continua dependente da revisão clínica de Ricardo, sem espera por fornecedor ou calibração
- `out_of_scope`: conteúdo participante, catálogo de fontes, fotos, figuras, tabelas, PDFs, OCR, API, banco, telas, contratação, B-07 aplicado, publicação geral e BUILD
