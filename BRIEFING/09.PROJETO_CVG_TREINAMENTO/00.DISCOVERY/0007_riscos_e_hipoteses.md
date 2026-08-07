# 0007 — Riscos e Hipóteses

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Status:** registro inicial

## Hipóteses não validadas

| ID | Hipótese | Como validar |
|---|---|---|
| H-01 | O processo atual não permite medir evolução com consistência | CONFIRMADA POR D-078: não há avaliação nem registro centralizado |
| H-02 | Os veterinários valorizam uma trilha progressiva | pesquisa e piloto |
| H-03 | Existe tempo protegido suficiente | análise de escala e liderança |
| H-04 | O conhecimento pode ser organizado em três níveis úteis | painel clínico e blueprint |
| H-05 | As áreas prioritárias podem ser selecionadas por risco e frequência | dados clínicos e coordenação |
| H-06 | O tratado e o Ettinger cobrem o núcleo necessário do piloto | matriz curricular comparativa |
| H-07 | O CVG possui direito de uso compatível para as três obras (Tratado, Ettinger e Fossum) | análise jurídica/licença |
| H-08 | Gestores utilizarão métricas para desenvolvimento | política e treinamento |
| H-09 | Avaliações digitais representarão domínio teórico de forma válida | piloto e análise de itens |
| H-10 | O ganho teórico poderá ser acompanhado sem uso punitivo | governança e pesquisa de segurança psicológica |

## Riscos operacionais

| ID | Risco | Severidade inicial | Mitigação proposta |
|---|---|---:|---|
| R-01 | Falta de tempo protegido | alta | carga realista, microlearning e apoio formal |
| R-02 | Baixa adesão | alta | comunicação, utilidade percebida e piloto |
| R-03 | Escopo excessivo | alta | coorte e áreas limitadas no MVP |
| R-04 | Sobrecarga de autores/revisores | alta | calendário, papéis e SLA |
| R-05 | Aprendizado atual informal e dependente da disponibilidade individual | alta | implantar trilha, avaliação e registro centralizado no futuro sistema |
| R-06 | Métrica sem ação associada | média | owner e regra de ação por KPI |
| R-07 | Dependência de uma pessoa | alta | documentação, versionamento, fila visível e revisão adicional opcional quando Ricardo julgar necessária |

## Riscos clínicos

| ID | Risco | Severidade inicial | Mitigação proposta |
|---|---|---:|---|
| R-08 | Conteúdo de 2015 usado sem atualização | crítica | confronto com Ettinger 2024 e fontes vigentes |
| R-09 | Erro em dose, fármaco ou protocolo | crítica | aprovação clínica registrada de Ricardo, confronto com fonte atual e retirada emergencial; consulta adicional opcional |
| R-10 | Confundir aprovação em conteúdo, caso ou simulação digital com competência prática ou autonomia clínica | crítica | aviso explícito, métricas separadas e bloqueio de funcionalidades práticas pelo `GATE-EXP-PRAT-01` |
| R-11 | Questão clinicamente ambígua | alta | blueprint, gabarito/rubrica testados e aprovação clínica de Ricardo; revisão adicional opcional |
| R-12 | IA introduzir conteúdo incorreto | crítica | IA apenas como apoio; aprovação humana |
| R-13 | Protocolo CVG divergir da fonte | alta | registro de decisão e versão |

## Riscos pedagógicos

- Foco em memorização;
- Ensino massivo sem espaçamento;
- Quiz usado apenas como barreira;
- Prova desconectada dos objetivos;
- Banco de questões pequeno;
- Feedback insuficiente;
- Métrica única e opaca;
- Nível “avançado” definido apenas pela dificuldade percebida;
- Incentivo a clicar rapidamente;
- Sobrecarga cognitiva;
- Falta de retenção tardia;
- Ausência de remediação.

## Riscos de adoção e cultura

- Percepção de vigilância;
- Uso disciplinar de notas;
- Ranking público;
- Comparação injusta entre áreas;
- Falta de confidencialidade;
- Liderança não utilizar os resultados para apoiar;
- Punição por relatar dúvida;
- Falta de acessibilidade.

## Riscos legais, privacidade e segurança

- Reprodução indevida de obra protegida;
- Uso do PDF do Ettinger sem licença institucional comprovada;
- Uso de casos com dados identificáveis;
- Tratamento de dados de desempenho sem finalidade clara;
- Acesso excessivo de gestores;
- Vazamento do banco de provas;
- Alteração não auditada de nota;
- Falta de retenção e descarte;
- Conta compartilhada;
- Ausência de canal de contestação.

## Dependências externas

- Controles internos de consulta das obras definidos por D-075;
- Protocolos internos;
- Fontes clínicas atualizadas;
- MV. Ricardo Akinaga como responsável pelo MVP, dados e segurança;
- aplicação da política mínima D-077;
- Tempo protegido;
- Orçamento;
- Decisão sobre integrações futuras;
- Política de certificação interna.

## Limitações conhecidas

- Necessidade de conciliar fonte nacional de 2015 com referência internacional de 2024 e normas brasileiras vigentes;
- Ausência de baseline;
- Preferências de dispositivo e acessibilidade podem ser confirmadas somente se afetarem o MVP;
- Público aproximado de 10 veterinários confirmado; perfis individuais não são necessários no MVP;
- Plataforma e simulações digitais não medem habilidade psicomotora, competência prática ou autonomia clínica;
- Correlação educacional não prova causalidade clínica;
- Metas iniciais ainda não calibradas.

## Regra de tratamento dos riscos

- **Crítico:** bloqueia publicação, certificação ou gate até mitigação/aprovação;
- **Alto:** exige owner, plano e prazo antes da fase relacionada;
- **Médio:** pode avançar com mitigação registrada e monitoramento;
- **Baixo:** registrar no backlog e revisar.

## Owners e prazos de mitigação

Por D-076, MV. Ricardo Akinaga é owner dos riscos do MVP. Os prazos são vinculados ao momento de exposição:

| Severidade | Prazo obrigatório |
|---|---|
| crítica | antes de publicar, aplicar ou liberar o artefato afetado |
| alta | plano e controle implementados antes da fase relacionada |
| média | item no backlog e controle definido antes do piloto completo |
| baixa | revisão na auditoria ou no ciclo de melhoria |

Riscos técnicos de autenticação, autorização, observabilidade e agente de IA seguem D-091 a D-100. Riscos de conteúdo seguem D-075/D-083 e a revisão adicional permanece opcional.

## Riscos que condicionam as próximas fases

1. D-101 a D-108 e os gates ainda dependem de aprovação humana sobre commit identificado;
2. B-07 condiciona baseline, calibração e piloto completo, mas não a SPEC conforme D-101 aprovada;
3. protocolo interno nunca é presumido: cada módulo registra protocolo versionado, `NAO_APLICAVEL` ou `NAO_FORNECIDO`;
4. BUILD continua condicionado à aprovação da SPEC.
