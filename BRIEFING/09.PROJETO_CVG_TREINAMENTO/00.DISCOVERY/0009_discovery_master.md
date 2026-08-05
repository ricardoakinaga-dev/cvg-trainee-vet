# 0009 — Discovery Master

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Organização:** Centro Veterinário Guarapiranga  
**Data:** 2026-07-29  
**Atualização:** 2026-08-05 — reclassificação canônica pela Alternativa 1
**Status:** consolidado como rascunho; gate `REPROVADO — EM CORREÇÃO`

## 1. Visão geral

O CVG pretende criar uma plataforma de treinamento clínico digital contínuo para médicos-veterinários, com progressão do básico ao avançado, trilhas, quizzes, provas, casos, simulações digitais e métricas de evolução educacional.

Nesta etapa, somente o briefing foi produzido. As engines canônicas foram preservadas e nenhum elemento do programa foi implementado.

## 2. Problema definido

O CVG precisa transformar o aprendizado informal em uma experiência digital simples e acompanhável:

```text
entrar
→ fazer um diagnóstico curto, sem aprovação ou reprovação
→ receber uma trilha recomendada
→ concluir módulos breves com quiz e caso digital
→ receber feedback imediato
→ acompanhar o progresso e revisar apenas o necessário
```

O problema será medido por ativação, progresso, conclusão, domínio, ganho de conhecimento, retenção, recuperação, atraso, abandono, qualidade dos itens e governança do conteúdo.

## 3. Contexto

### Conhecido

- Público primário: veterinários colaboradores;
- Unidade física: Centro Veterinário Guarapiranga, Avenida Guarapiranga, 1993 — Vila Socorro, São Paulo/SP;
- Setores informados: Clínica Médica, Internação, Cirurgia, Laboratório de Análises Clínicas e Ultrassonografia;
- Operação informada: atendimento 24 horas, com escala 12 × 36;
- Público: aproximadamente 10 veterinários; todos participam da primeira aplicação (D-079);
- Não existe atualmente sistema de treinamento, método alternativo definido ou processo definido de revisão clínica;
- Modalidade inicial aprovada em D-068: treinamento integralmente digital, com casos e simulações digitais;
- Progressão: básico, intermediário e avançado;
- Avaliação diagnóstica obrigatória antes do treinamento, para estabelecer a linha de base individual;
- Personalização inicial da trilha conforme conhecimentos e lacunas identificados;
- Avaliações posteriores: quizzes, provas e outras formas;
- Necessidade de métricas individuais;
- Áreas iniciais: núcleo comum, Emergência e Internação;
- Responsável pelo MVP: MV. Ricardo Akinaga; outro MV confere cada módulo antes da publicação;
- Tempo protegido: 3 horas por mês;
- Políticas mínimas de fontes e dados definidas por D-075 e D-077;
- Fonte nacional: *Tratado de Medicina Interna de Cães e Gatos*, 1ª edição, 2015;
- Fonte atualizada: *Ettinger’s Textbook of Veterinary Internal Medicine*, 9ª edição, 2024;
- Nenhuma implementação autorizada nesta etapa.

### Desconhecido

- Formato e conteúdo do diagnóstico curto (B-07);
- Primeiro módulo a ser produzido;
- Restrição real de dispositivo ou acessibilidade, se houver;
- Protocolos internos relevantes para cada módulo.

## 4. Fluxo atual

**FATO INFORMADO — D-078:** o CVG não possui treinamento veterinário padronizado. O aprendizado ocorre informalmente, conforme a disponibilidade dos profissionais, sem trilha, avaliação ou registro centralizado. Esse registro fecha B-01; mapear atividades isoladas é opcional.

## 5. Recorte do problema

### Incluído no problema

- Organização progressiva do conhecimento;
- Avaliação teórica;
- Medição de domínio e retenção;
- Remediação;
- Governança científica;
- Rastreabilidade;
- Visibilidade individual e gerencial autorizada.
- Simulações digitais para avaliar conhecimento, raciocínio, priorização, decisão e comunicação simulada.

### Fora deste recorte

- Competência prática;
- Treinamento prático presencial associado à plataforma, observação de trabalho real e avaliação psicomotora;
- Autonomia clínica;
- Avaliação trabalhista completa;
- Código e arquitetura;
- Produção de conteúdo;
- Protocolos clínicos;
- Correlação causal com desfechos.

## 6. Usuários

### Primário

Médico-veterinário colaborador.

### Secundários

- Mentor/preceptor;
- Autor/instrutor;
- Revisor clínico;
- Revisor pedagógico;
- Gestor educacional;
- Gestor clínico;
- Gestão de pessoas;
- Administrador;
- Auditor/compliance.

### Decisores

Os papéis estão definidos, mas os nomes ainda precisam ser indicados.

## 7. Hipótese de valor

Uma trilha progressiva, avaliada e revisada permitirá:

- Dar clareza ao colaborador;
- Identificar lacunas;
- Direcionar reforços;
- Medir ganho e retenção;
- Padronizar critérios;
- Governar conteúdo e provas;
- Priorizar treinamento.

As hipóteses de métricas e metas estão centralizadas em [0005 — Hipótese de valor](0005_hipotese_de_valor.md) e no [anexo de avaliações](../90.ANEXOS/0003_hipoteses_avaliacoes_metricas.md). Nenhuma meta ou nota de corte foi aprovada; todas dependem de baseline, validade e decisão humana.

## 8. Fontes de conhecimento

### Tratado brasileiro

Papel:

- Estrutura curricular em português;
- Contextualização brasileira;
- Base de temas e conceitos;
- Rastreabilidade por volume, parte e capítulo.

### Ettinger, 9ª edição

Papel:

- Atualização científica de 2024;
- Complemento de medicina baseada em evidências, diagnóstico diferencial, técnicas e especialidades;
- Rastreabilidade por volume, seção e capítulo;
- Referência para revisar divergências.

### Fossum, 4ª edição

Papel:

- Referência cirúrgica (princípios, tecido mole, ortopedia, neurocirurgia);
- Complemento para conteúdos perioperatórios de emergência/internação;
- Rastreabilidade por volume, parte e capítulo (F-03 do anexo 0001).

### Regra de segurança

Nenhuma obra prevalece sobre legislação, bula, alerta regulatório, protocolo interno aprovado ou diretriz atual validada. Divergências exigem decisão humana documentada.

## 9. Hipóteses pedagógicas para validação

Nenhum item abaixo foi adotado como regra do programa. Sem criar aulas, esta sequência é apenas uma hipótese conceitual a validar no Discovery e, se aprovada, detalhar futuramente no PRD:

1. Diagnóstico inicial;
2. Núcleo básico obrigatório;
3. Nível intermediário por sistemas e problemas frequentes;
4. Nível avançado com casos complexos e integração;
5. Avaliações formativas ao longo do módulo;
6. Casos clínicos e simulações digitais;
7. Prova somativa;
8. Hipótese de remediação;
9. Avaliação de retenção em 30, 60 e/ou 90 dias;
10. Progressão;
11. Reciclagem por validade.

Hipóteses para validação em [Anexo 0002](../90.ANEXOS/0002_hipoteses_pedagogicas.md).

## 10. Hipóteses de avaliação para validação

Nenhum item abaixo foi aprovado como modelo de avaliação:

- Diagnóstico sem caráter punitivo;
- Quizzes com feedback;
- Casos clínicos e simulações digitais progressivas;
- Prova final;
- Avaliação de retenção;
- Autoavaliação de confiança separada da nota;
- Hipótese de remediação após desempenho insuficiente;
- Banco de itens com rastreabilidade e análise de qualidade;
- Competência prática não inferida nem registrada na primeira versão; expansão futura bloqueada pelo `GATE-EXP-PRAT-01`.

Hipóteses para validação em [Anexo 0003](../90.ANEXOS/0003_hipoteses_avaliacoes_metricas.md).

## 11. Principais riscos

### Críticos

- Informação clínica incorreta ou desatualizada;
- Confundir conhecimento teórico com autonomia clínica;
- Direitos autorais;
- Uso inadequado de dados;
- IA sem revisão;
- Alteração não auditada de notas.

### Altos

- Falta de tempo protegido;
- Baixa adesão;
- Escopo excessivo;
- Falta de revisores;
- Métricas punitivas;
- Banco de questões frágil;
- Conteúdo sem manutenção.

## 12. Dependências

1. Definir e aplicar o diagnóstico curto para a baseline (B-07);
2. Confirmar somente restrições reais de dispositivo ou acessibilidade;
3. Informar os protocolos internos relevantes quando cada módulo for criado;
4. Reexecutar e aprovar formalmente o gate Discovery.

## 13. Resultado do Discovery

O problema está recortado; D-078 fechou B-01 e D-079 confirmou o público de aproximadamente 10 veterinários, fechando B-02 sem inventário nominal ou segmentação. O Discovery continua em correção por B-07 e outros itens ainda incompletos.

```text
RESULTADO: REPROVADO — EM CORREÇÃO (2026-08-05)
MOTIVO: ITENS OBRIGATÓRIOS INCOMPLETOS; ENGINES CANÔNICAS NÃO ADMITEM APROVAÇÃO CONDICIONAL
PRÓXIMA AÇÃO: FECHAR B-07 E DEMAIS ITENS PENDENTES, ATUALIZAR EVIDÊNCIAS E REEXECUTAR O GATE DISCOVERY
```
