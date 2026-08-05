# 0009 — Discovery Master

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Organização:** Centro Veterinário Guarapiranga  
**Data:** 2026-07-29  
**Atualização:** 2026-08-05 — gate aprovado com condições  
**Status:** consolidado; gate aprovado com condições pelo patrocinador

## 1. Visão geral

O CVG pretende criar uma plataforma de formação teórica contínua para médicos-veterinários, com progressão do básico ao avançado, trilhas, quizzes, provas, casos e métricas de evolução.

Nesta etapa, somente o briefing foi produzido. As engines canônicas foram preservadas e nenhum elemento do programa foi implementado.

## 2. Problema definido

O CVG precisa assegurar desenvolvimento teórico progressivo e mensurável, mas ainda não há, dentro das informações coletadas, um processo institucional validado que conecte:

```text
diagnóstico inicial obrigatório
→ linha de base individual
→ trilha personalizada
→ aprendizagem
→ avaliação
→ remediação
→ retenção
→ progressão
→ acompanhamento
```

O problema será medido por ativação, progresso, conclusão, domínio, ganho de conhecimento, retenção, recuperação, atraso, abandono, qualidade dos itens e governança do conteúdo.

## 3. Contexto

### Conhecido

- Público primário: veterinários colaboradores;
- Unidade física: Centro Veterinário Guarapiranga, Avenida Guarapiranga, 1993 — Vila Socorro, São Paulo/SP;
- Setores informados: Clínica Médica, Internação, Cirurgia, Laboratório de Análises Clínicas e Ultrassonografia;
- Operação informada: atendimento 24 horas, com escala 12 × 36;
- Não existe atualmente sistema de treinamento, método alternativo definido ou processo definido de revisão clínica;
- Modalidade inicial: treinamento teórico em plataforma;
- Progressão: básico, intermediário e avançado;
- Avaliação diagnóstica obrigatória antes do treinamento, para estabelecer a linha de base individual;
- Personalização inicial da trilha conforme conhecimentos e lacunas identificados;
- Avaliações posteriores: quizzes, provas e outras formas;
- Necessidade de métricas individuais;
- Fonte nacional: *Tratado de Medicina Interna de Cães e Gatos*, 1ª edição, 2015;
- Fonte atualizada: *Ettinger’s Textbook of Veterinary Internal Medicine*, 9ª edição, 2024;
- Nenhuma implementação autorizada nesta etapa.

### Desconhecido

- Quantidade e perfil dos usuários;
- Eventuais práticas isoladas do processo atual;
- Ferramentas auxiliares atualmente utilizadas;
- Lacunas prioritárias;
- Áreas do piloto;
- Tempo protegido;
- Responsáveis;
- Política de dados;
- Licença das obras;
- Orçamento e prazo;
- Protocolos internos;
- Linha de base.

## 4. Fluxo atual

Foi informado que o CVG não possui sistema de treinamento, método alternativo definido nem processo definido de revisão clínica. O fluxo real de eventuais atividades isoladas de capacitação, entretanto, ainda não foi mapeado.

Esse mapeamento restante continua sendo um dos bloqueios do Discovery.

## 5. Recorte do problema

### Incluído no problema

- Organização progressiva do conhecimento;
- Avaliação teórica;
- Medição de domínio e retenção;
- Remediação;
- Governança científica;
- Rastreabilidade;
- Visibilidade individual e gerencial autorizada.

### Fora deste recorte

- Competência prática;
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
6. Casos clínicos teóricos;
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
- Casos clínicos progressivos;
- Prova final;
- Avaliação de retenção;
- Autoavaliação de confiança separada da nota;
- Hipótese de remediação após desempenho insuficiente;
- Banco de itens com rastreabilidade e análise de qualidade;
- Competência prática separada.

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

1. Entrevistas;
2. Fluxo atual;
3. Público e baseline;
4. Comitê e owners;
5. Direitos de uso;
6. Política de dados;
7. Áreas piloto;
8. Protocolos internos;
9. Tempo protegido;
10. Aprovação formal do Discovery.

## 13. Resultado do Discovery

O problema está recortado e os insumos estão organizados. A dor operacional e o fluxo atual ainda não foram validados com usuários, mas o patrocinador executivo aprovou o avanço ao PRD em 2026-08-05 com condições explícitas (bloqueios B-01 a B-07 de [0090 — Validation](0090_discovery_validation.md)), que devem ser resolvidas antes do gate do PRD.

```text
RESULTADO: APROVADO COM CONDIÇÕES (2026-08-05)
MOTIVO: DECISÃO DO PATROCINADOR EXECUTIVO, COM COMPROMISSOS B-01 A B-07
PRÓXIMA AÇÃO: PRD MANTENDO PENDÊNCIAS EXPLÍCITAS
```
