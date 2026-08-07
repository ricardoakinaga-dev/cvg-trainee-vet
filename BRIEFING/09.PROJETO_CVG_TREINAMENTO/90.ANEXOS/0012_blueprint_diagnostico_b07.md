# Anexo 0012 — Blueprint do Diagnóstico Inicial B-07

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data do rascunho:** 2026-08-06
**Status:** BLUEPRINT TÉCNICO PRONTO PARA REVISÃO CLÍNICA — B-07 PRE-PILOTO
**Checkpoint de origem:** D-070, commit 5e5b62c, tag gate-d070-adaptive-structured-scoring-2026-08-06
**Responsável pelo MVP:** MV. Ricardo Akinaga
**Natureza:** blueprint de avaliação, ainda não aprovado para aplicação

Este documento estrutura a matriz das 120 questões diagnósticas. Ele não contém questões clínicas, gabaritos de participantes ou dados pessoais. A criação do blueprint não fecha B-07 e não autoriza aplicação, baseline, BUILD ou publicação. Conforme D-101 aprovada, produção/aplicação de B-07 bloqueia o piloto completo e a calibração, não a elaboração da SPEC.

## 1. Objetivo e limites

O diagnóstico deve estabelecer uma linha de base educacional ampla, orientar reforços e permitir uma recomendação inicial de trilha sem funcionar como prova de aprovação, reprovação, competência prática, autonomia clínica ou decisão trabalhista.

Regras obrigatórias:

1. 120 itens em três sessões de 40, conforme o PRD 0016;
2. cobertura de Núcleo Clínico, Emergência, Internação e integração;
3. cães e gatos, com cenários fictícios e sem prontuários, tutores, gravações ou casos reais identificáveis;
4. nenhuma nota pública, ranking, punição automática ou dispensa no piloto;
5. resultado por domínio amplo e competência, sem alegar estimativa confiável para cada um dos 96 objetivos;
6. cada item com método de correção determinístico, testado antes da aplicação;
7. conteúdo original do CVG, com referência interna de fonte e revisão clínica;
8. coleta limitada à política D-077: identificação/login profissional, respostas, tentativas, notas, progresso e logs mínimos.

## 2. Estrutura do instrumento

| Sessão | Quantidade | Cobertura | Finalidade |
|---|---:|---|---|
| S1 | 40 | Núcleo Clínico e segurança | fundamentos, avaliação, raciocínio, terapêutica e suporte |
| S2 | 40 | Emergência e priorização | reconhecimento de instabilidade, decisão tempo-dependente e escalonamento |
| S3 | 40 | Internação, monitoramento e integração | plano hospitalar, tendências, continuidade e transferência de raciocínio |
| **Total** | **120** | **cobertura ampla** | **linha de base e recomendação inicial** |

Cada sessão deve poder ser interrompida e retomada sem perda de resposta. A V3 planeja 120 minutos por bloco, em janela assíncrona; o pré-voo validará instruções e a primeira aplicação medirá o tempo real. Acomodação segue D-104 e repetição segue D-105: interrupção retoma a sessão, mas baseline concluída não é refeita na primeira aplicação.

## 3. Distribuição por domínio e item

Os intervalos abaixo reservam IDs estáveis para a produção posterior. O código INT-01 é uma faixa diagnóstica transversal; não cria um décimo sétimo módulo curricular.

### 3.1 Sessão S1 — Núcleo Clínico e segurança

| Faixa de itens | Domínio do PRD 0016 | Itens | Decisão | Característica-chave | Interpretação | Conhecimento essencial | Críticos |
|---|---|---:|---:|---:|---:|---:|---:|
| S1-001 a S1-008 | NC-01 — avaliação clínica organizada | 8 | 4 | 2 | 1 | 1 | 0 |
| S1-009 a S1-016 | NC-02 — raciocínio, diagnóstico e evidência | 8 | 4 | 1 | 2 | 1 | 0 |
| S1-017 a S1-024 | NC-03 — terapêutica e prescrição seguras | 8 | 4 | 2 | 1 | 1 | 4 |
| S1-025 a S1-032 | NC-04 — dor, perfusão e fluidoterapia | 8 | 4 | 1 | 2 | 1 | 2 |
| S1-033 a S1-040 | NC-05 — eletrólitos, ácido-base e nutrição | 8 | 4 | 2 | 2 | 0 | 2 |
| **Total S1** |  | **40** | **20** | **8** | **8** | **4** | **8** |

### 3.2 Sessão S2 — Emergência e priorização

| Faixa de itens | Domínio do PRD 0016 | Itens | Decisão | Característica-chave | Interpretação | Conhecimento essencial | Críticos |
|---|---|---:|---:|---:|---:|---:|---:|
| S2-001 a S2-008 | EM-01 — triagem, ABCDE, choque e ressuscitação | 8 | 4 | 2 | 1 | 1 | 4 |
| S2-009 a S2-015 | EM-02 — emergências respiratórias e cardiovasculares | 7 | 4 | 1 | 2 | 0 | 2 |
| S2-016 a S2-021 | EM-03 — emergências neurológicas e tóxicas | 6 | 3 | 1 | 1 | 1 | 1 |
| S2-022 a S2-028 | EM-04 — emergências metabólicas, endócrinas e urinárias | 7 | 3 | 2 | 1 | 1 | 1 |
| S2-029 a S2-034 | EM-05 — trauma, hemorragia e transfusão | 6 | 3 | 1 | 2 | 0 | 1 |
| S2-035 a S2-040 | EM-06 — abdômen agudo, sepse e controle de foco | 6 | 3 | 1 | 1 | 1 | 1 |
| **Total S2** |  | **40** | **20** | **8** | **8** | **4** | **10** |

### 3.3 Sessão S3 — Internação, monitoramento e integração

| Faixa de itens | Domínio do PRD 0016 | Itens | Decisão | Característica-chave | Interpretação | Conhecimento essencial | Críticos |
|---|---|---:|---:|---:|---:|---:|---:|
| S3-001 a S3-008 | IN-01 — admissão, problemas e monitoramento | 8 | 4 | 2 | 1 | 1 | 1 |
| S3-009 a S3-015 | IN-02 — suporte hídrico, analgésico e nutricional | 7 | 3 | 2 | 1 | 1 | 1 |
| S3-016 a S3-022 | IN-03 — dispositivos, feridas, isolamento e prevenção de dano | 7 | 3 | 1 | 2 | 1 | 1 |
| S3-023 a S3-030 | IN-04 — tendências, deterioração e ajuste terapêutico | 8 | 4 | 1 | 2 | 1 | 2 |
| S3-031 a S3-036 | IN-05 — continuidade, tutor, alta e fim de vida | 6 | 3 | 1 | 2 | 0 | 1 |
| S3-037 a S3-040 | INT-01 — integração de raciocínio entre trilhas | 4 | 3 | 1 | 0 | 0 | 0 |
| **Total S3** |  | **40** | **20** | **8** | **8** | **4** | **6** |

### 3.4 Totais do blueprint

| Dimensão | Total |
|---|---:|
| Itens de decisão/vinheta clínica | 60 |
| Itens de característica-chave | 24 |
| Itens de interpretação | 24 |
| Itens de conhecimento essencial direto | 12 |
| Itens críticos sinalizados para análise separada | 24 |
| Itens vinculados a minicases | 36 |
| Itens independentes | 84 |
| Complexidade fundacional | 36 |
| Complexidade aplicada | 60 |
| Complexidade integrativa | 24 |

A distribuição cognitiva replica a matriz do PRD 0016: 50% decisão clínica, 20% característica-chave, 20% interpretação e 10% conhecimento essencial. Complexidade é uma etiqueta de amostragem do instrumento, não um nível de usuário nem uma autorização clínica.

## 4. Minicases e contrastes

Serão produzidos 12 minicases, quatro por sessão, com três itens relacionados a cada um. A tabela reserva os intervalos sem criar conteúdo clínico:

| Sessão | Minicase | Itens vinculados | Domínio | Contraste mínimo |
|---|---|---|---|---|
| S1 | S1-C01 | S1-001 a S1-003 | NC-01 | cão/gato e informação suficiente/incompleta |
| S1 | S1-C02 | S1-009 a S1-011 | NC-02 | apresentação típica/atípica |
| S1 | S1-C03 | S1-017 a S1-019 | NC-03 | paciente estável/risco terapêutico |
| S1 | S1-C04 | S1-033 a S1-035 | NC-05 | dado laboratorial isolado/tendência clínica |
| S2 | S2-C01 | S2-001 a S2-003 | EM-01 | estável/instável e priorização |
| S2 | S2-C02 | S2-009 a S2-011 | EM-02 | cão/gato e deterioração respiratória |
| S2 | S2-C03 | S2-022 a S2-024 | EM-04 | alteração isolada/ameaça imediata |
| S2 | S2-C04 | S2-035 a S2-037 | EM-06 | resposta esperada/piora e controle de foco |
| S3 | S3-C01 | S3-001 a S3-003 | IN-01 | admissão simples/risco elevado |
| S3 | S3-C02 | S3-009 a S3-011 | IN-02 | resposta adequada/sobrecarga ou intolerância |
| S3 | S3-C03 | S3-023 a S3-025 | IN-04 | valor isolado/tendência desfavorável |
| S3 | S3-C04 | S3-037 a S3-039 | INT-01 | dados completos/conflitantes e necessidade de escalonamento |

Cada minicase deve usar apenas dados fictícios, sem nomes, números de prontuário, datas reais, imagens reais ou informação que permita reconhecer paciente, tutor ou colaborador. O quarto item restante de cada domínio pode ser independente, mas deve manter a mesma matriz de conteúdo.

## 5. Espécie, urgência e criticidade

Estas são metas de amostragem para a autoria, não regras de segmentação do público:

| Sessão | Cão | Gato | Espécie neutra | Estável | Tempo-sensível | Crítico |
|---|---:|---:|---:|---:|---:|---:|
| S1 | 15 | 15 | 10 | 24 | 10 | 6 |
| S2 | 15 | 15 | 10 | 8 | 16 | 16 |
| S3 | 15 | 15 | 10 | 16 | 16 | 8 |
| **Total** | **45** | **45** | **30** | **48** | **42** | **30** |

Um item pode ser crítico sem estar na faixa de urgência crítica. O campo crítico identifica decisão cujo erro exige análise separada; não cria, sozinho, uma reprovação do diagnóstico. A regra de 80% para temas críticos pertence às avaliações somativas do PRD e não será usada para aprovar ou reprovar a baseline.

## 6. Formatos de resposta e correção

O diagnóstico inicial não usará resposta textual livre. Todos os 120 itens devem ser avaliáveis por um método que possa ser testado antes da aplicação:

| Formato | Por sessão | Total | Uso |
|---|---:|---:|---|
| Melhor resposta única | 24 | 72 | decisão clínica, característica-chave e conhecimento essencial |
| Ordenação/priorização estruturada | 8 | 24 | sequência de ações ou prioridades |
| Interpretação estruturada | 8 | 24 | leitura de tendência, exame, prescrição, registro ou dado seriado |

Regras de correção:

1. cada item possui gabarito ou rubrica versionada;
2. respostas aceitas e erros relevantes são definidos antes da aplicação;
3. a pontuação do diagnóstico é binária por item na primeira versão, salvo decisão humana explícita;
4. itens não avaliáveis automaticamente devem ser redesenhados ou previamente classificados para correção humana antes de uso;
5. uma pergunta sem feedback coerente, método testado ou alternativa não ambígua não entra no instrumento;
6. resposta não enviada deve ser distinguida de resposta incorreta;
7. a versão do item, a regra de correção e o horário da resposta devem ser preservados.

## 7. Saídas e regra de personalização

O diagnóstico produzirá:

- perfil de desempenho por sessão;
- perfil por domínio amplo;
- perfil por tipo cognitivo;
- sinalização de lacunas prioritárias;
- indicação de reforços recomendados;
- registro de itens não respondidos e interrupções.

O diagnóstico não produzirá:

- aprovação ou reprovação;
- certificado;
- autorização de procedimento;
- competência prática, nível de supervisão ou autonomia;
- ranking ou comparação pública;
- dispensa automática no piloto;
- decisão disciplinar ou trabalhista.

A regra proposta em D-105 converte o perfil apenas em prioridade de reforço: `<70%` prioritário, `70–79%` monitorado e `≥80%` sequência regular; erro crítico sempre gera reforço. O resultado continua sendo mapa diagnóstico, não corte de progressão. Na trilha V3 completa, os 24 módulos permanecem obrigatórios quando elegíveis; a onda piloto inicial valida núcleo, Emergência e Internação, sem criar dispensa para a expansão.

## 8. Metadados internos obrigatórios por item

Cada item produzido deve manter, em registro interno não exibido ao aluno:

| Campo | Obrigatoriedade |
|---|---:|
| diagnostic_item_id | sim |
| sessão e posição | sim |
| domínio e objetivo amplo | sim |
| referência ao módulo/competência do PRD 0016 | sim |
| tipo cognitivo e complexidade | sim |
| minicase, espécie, urgência e criticidade | quando aplicável |
| formato de resposta | sim |
| enunciado e alternativas/campos | sim |
| gabarito ou rubrica | sim |
| respostas aceitas e erros relevantes | sim |
| feedback técnico-clínico | sim |
| fonte interna e capítulo/seção consultados | sim, conforme D-075 |
| autor, aprovador clínico e data | sim antes da aplicação; aprovador obrigatório: MV. Ricardo Akinaga |
| versão, status e data de corte | sim |

O material deve ser redigido pelo CVG. É proibido copiar texto, tabela, figura, imagem ou página das obras. O aluno deve receber somente conteúdo institucional e o retorno educacional aprovado; a referência interna das obras não será exposta.

## 9. Plano de validação antes da aplicação

### 9.1 Revisão de conteúdo

- Ricardo confere a aderência do blueprint ao programa curricular vigente e realiza a aprovação clínica;
- a segunda conferência por outro médico-veterinário deixa de ser obrigatória por D-083; consulta adicional é opcional;
- cada item é verificado quanto a correção, atualidade, espécie, urgência, risco e ausência de ambiguidade;
- revisão pedagógica é opcional no MVP, mas pode ser usada para clareza e carga cognitiva;
- divergências de fonte recebem conflito registrado e decisão humana.

### 9.2 Pré-voo de avaliabilidade

- executar o gabarito/rubrica com respostas esperadas, aceitas, inválidas e críticas;
- verificar que cada item produz um resultado determinístico;
- testar o cálculo por sessão e domínio;
- verificar que nenhum item publicado expõe metadados restritos das fontes;
- executar o fluxo com dados sintéticos, incluindo salvar, retomar, duplicação e interrupção;
- confirmar que dados ausentes não são convertidos silenciosamente em zero;
- registrar versão do instrumento e da regra de correção.

### 9.3 Validade e comparabilidade

- registrar a matriz de cobertura e a justificativa de cada domínio;
- manter o diagnóstico como instrumento de baseline ampla, sem alegar precisão por objetivo individual;
- não comparar com pós-teste ou retenção até existir forma equivalente ou regra de equacionamento;
- registrar acessibilidade, acomodações e exclusões no cálculo;
- não usar estatística psicométrica instável da coorte pequena como decisão isolada;
- usar revisão qualitativa e evidência acumulada para corrigir itens.

## 10. Estados de execução de B-07

| Etapa | Entrega | Estado atual |
|---|---|---|
| B07.1 | blueprint das 120 questões | PRONTO PARA APROVAÇÃO CLÍNICA |
| B07.2 | produção dos 120 itens originais | PENDENTE |
| B07.3 | revisão clínica e aprovação por Ricardo | PENDENTE — executar durante a produção e antes da aplicação |
| B07.4 | pré-voo de avaliabilidade e fluxo | PENDENTE |
| B07.5 | autorização humana da aplicação | PENDENTE |
| B07.6 | aplicação às aproximadamente 10 pessoas | PENDENTE |
| B07.7 | relatório de baseline e atualização dos gates | PENDENTE |

B-07 só poderá ser marcado como fechado quando houver evidência das etapas B07.2 a B07.7, respeitando o checkpoint Git do Anexo 0010. Por D-101 aprovada, esse fechamento é pré-condição do piloto completo e da calibração definitiva, não da SPEC.

## 11. Pendências que permanecem abertas

1. aprovação clínica de Ricardo para o blueprint e, depois, para os itens produzidos;
2. autorização e controles mínimos de D-077 para a aplicação real;
3. produção, revisão e pré-voo dos 120 itens;
4. aplicação e relatório da baseline antes do piloto completo;
5. D-105/D-106 aprovadas no gate para personalização, repetição e equivalência.

## 12. Critérios de aceite do blueprint

- [x] três sessões totalizam exatamente 120 itens;
- [x] cada sessão contém 40 itens;
- [x] domínios e faixas de IDs são rastreáveis ao PRD 0016;
- [x] matriz cognitiva totaliza 50/20/20/10;
- [x] composição por espécie e urgência foi explicitada;
- [x] itens críticos são identificados sem criar reprovação diagnóstica;
- [x] formatos de resposta são estruturados e avaliáveis;
- [x] casos usam somente dados fictícios;
- [x] dados permitidos e dados proibidos estão explícitos;
- [x] revisão clínica, pré-voo e aplicação estão separados;
- [ ] Ricardo aprovou clinicamente a versão aplicável do instrumento;
- [ ] 120 itens foram produzidos;
- [ ] 120 itens foram revisados e testados;
- [ ] baseline foi aplicada e consolidada;
- [ ] B-07 foi revalidado no gate de prontidão do piloto.

## 13. Rastreamento e próximo passo

Este anexo deve ser referenciado no D-037, no gate de prontidão do piloto e no backlog. O próximo passo é obter aprovação clínica de Ricardo e produzir uma fatia diagnóstica antes da escala completa. Sem revisão, produção, pré-voo e aplicação, B-07 permanece aberto para o piloto, mas a SPEC pode avançar após D-101 e os gates documentais serem aprovados.
