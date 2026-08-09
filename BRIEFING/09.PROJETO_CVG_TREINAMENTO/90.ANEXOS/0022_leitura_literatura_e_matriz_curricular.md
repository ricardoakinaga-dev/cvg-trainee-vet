# Anexo 0022 — Leitura da Literatura e Matriz Curricular

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data da leitura:** 2026-08-09
**Status:** `LEITURA_INTEGRAL_PROCESSADA; MATRIZ_PRONTA_PARA_AUTORIA`
**Escopo:** três PDFs locais indicados pelo patrocinador, currículo V3 e fatia vertical M02
**Regra:** este documento registra síntese, localizadores e decisões de uso; não reproduz texto, tabela, figura ou página das obras.

## 1. Resultado executivo

Os três livros foram processados integralmente em ambiente local. A extração textual confirmou a quantidade de páginas informada pelo PDF e permitiu revisar metadados, sumários, capítulos e os trechos clínicos necessários para a primeira onda curricular.

O resultado não transforma os livros em conteúdo pronto para publicação. Eles funcionam como fontes internas de delimitação, comparação e revisão. Cada unidade educacional do CVG ainda precisa ser redigida em linguagem própria, vinculada a um objetivo de aprendizagem, revisada clinicamente e atualizada quando o tema for dinâmico.

As obras sustentam especialmente:

- raciocínio clínico, história, exame físico, medicina baseada em evidências e comunicação;
- triagem, ABCDE, estabilização, choque, fluidoterapia, eletrólitos e ácido-base;
- crises respiratórias, hemorragia, sepse, anafilaxia, toxicologia e RCP;
- dor, nutrição, transfusão, monitoramento e continuidade da internação;
- cirurgia, assepsia, esterilização, hemostasia, anestesia, analgesia e cuidados perioperatórios;
- doenças por sistemas, emergência, especialidades, encaminhamento e integração de casos.

### 1.1 Contrato de exposição

Este anexo é documentação interna para quem constrói, revisa, aprova e audita o treinamento. A rastreabilidade bibliográfica não é uma funcionalidade do participante.

Na experiência do participante, no payload/API, em exportações, notificações, analytics ou logs acessíveis a ele, é proibido entregar ou revelar:

- fonte, obra, autor, editora, ISBN, código interno, capítulo, seção, página ou data de consulta;
- PDF, OCR, trecho, reprodução, foto, figura, tabela, imagem ou link de terceiros;
- qualquer conjunto de metadados que permita reconstruir ou localizar o material protegido.

O participante recebe somente conteúdo autoral do CVG, casos fictícios, feedback, progresso e estados educacionais necessários. A resposta do participante não deve exigir citação bibliográfica. A equipe mantém os localizadores apenas no registro interno de construção e revisão.

## 2. Evidência de leitura e integridade

### 2.1 Método

1. Verificação de metadados com `pdfinfo`.
2. Extração local integral com `pdftotext -layout -enc UTF-8` para diretório temporário fora do Git.
3. Contagem de páginas por form-feed e comparação com o PDF.
4. Revisão dos sumários e dos capítulos/assuntos necessários ao currículo.
5. Busca de conceitos e títulos para validar os localizadores da M02 e a matriz macro dos 24 meses.
6. Exclusão do texto extraído após a análise; nenhum derivado do PDF foi adicionado ao repositório.

### 2.2 Inventário técnico

| Código | Obra | PDF | Páginas | Páginas com texto extraível | SHA-256 |
|---|---|---:|---:|---:|---|
| F-01 | *Tratado de Medicina Interna de Cães e Gatos*, Jericó, Kogika e Andrade Neto, 1ª ed., Roca, 2015 | local | 7.047 | 6.992 | `ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628` |
| F-02 | *Ettinger’s Textbook of Veterinary Internal Medicine*, Côté, Ettinger e Feldman, 9ª ed., Elsevier, 2024 | local | 2.801 | 2.797 | `429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8` |
| F-03 | *Cirurgia de Pequenos Animais*, Theresa Welch Fossum, 4ª ed., Elsevier, 2014/2015 | local | 5.008 | 4.946 | `df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0` |

Os hashes coincidem com o controle de versão do Anexo 0010. Qualquer mudança de arquivo exige interromper a autoria dependente, repetir a verificação e registrar nova decisão.

### 2.3 Limitações da extração

Os PDFs são pesquisáveis, mas a extração preserva imperfeições de layout, ligaturas e páginas introdutórias ou ilustradas sem texto. O F-03 e o F-01 têm menor densidade média de texto extraído porque contêm muitas figuras, tabelas e páginas diagramadas. Portanto:

- a busca textual é evidência de localização, não prova de fidelidade visual palavra por palavra;
- item clínico crítico deve ser conferido na página visual do PDF pela pessoa aprovadora;
- doses, concentrações, intervalos, critérios regulatórios e algoritmos não podem ser publicados somente porque aparecem no livro;
- nenhum texto extraído, OCR, imagem, tabela, embedding ou índice do PDF deve ser versionado no Git ou enviado à aplicação no MVP.

## 3. Estrutura confirmada das fontes

### F-01 — Tratado brasileiro

O sumário confirma dois volumes, 23 partes, 264 capítulos e apêndices. Para o currículo do CVG, as áreas de maior utilidade são:

| Parte | Aplicação curricular |
|---:|---|
| 1 | responsabilidade profissional, atualização e documentação |
| 2 | medicina veterinária intensiva, emergência, vias aéreas, arritmias, edema pulmonar, nutrição e dor |
| 3 | fisiopatologia, avaliação e manejo da dor, incluindo UTI e emergência |
| 5–6 | imunologia, imunoprofilaxia e nutrição clínica |
| 7–9 | neonatos, oncologia e toxicologia |
| 10–11 | parasitologia e doenças infecciosas |
| 12 | fluidoterapia, desidratação/disnatremias, potássio, cálcio/fósforo e ácido-base |
| 13–19 | digestório, hepatobiliar, pâncreas, respiratório, urinário, reprodutivo e endócrino |
| 20 | hematologia, hemostasia, hemorragia, transfusão e doenças imunomediadas |
| 21 | neurologia e doenças do sistema nervoso |
| 22 | medicina veterinária legal, bem-estar, comportamento e documentação |

O F-01 é a âncora em português e ajuda a contextualizar a operação brasileira. É uma edição mais antiga; assuntos terapêuticos e regulatórios exigem atualização externa antes da publicação.

### F-02 — Ettinger, 9ª edição

O sumário confirma dois volumes, 22 seções e 331 capítulos. A estrutura é particularmente adequada para progressão por raciocínio:

- Seções I–V: comunicação, história, exame físico, evidência, stewardship, diferenciais, alterações clínico-patológicas, técnicas e terapias intervencionistas;
- Seção VI: medicina de emergência, capítulos 119–131;
- Seção VII: toxicologia;
- Seção VIII: farmacologia clínica e terapêutica;
- Seção IX: nutrição e terapia dietética;
- Seção X: doença hematológica e imunológica;
- Seção XI: doenças infecciosas;
- Seção XII: doença respiratória;
- Seção XIII: comorbidades;
- Seção XIV: doença cardiovascular;
- Seção XV: doença neurológica;
- Seções XVI–XVIII: gastrointestinal, hepatobiliar e pancreática;
- Seção XIX: endócrina;
- Seções XX–XXI: renal e trato urinário inferior;
- Seção XXII: câncer.

O F-02 é a principal referência bibliográfica de atualização clínica entre as três obras. Ainda assim, a hierarquia do Anexo 0001 permanece: diretriz atual, bula, legislação e protocolo CVG aprovado prevalecem quando aplicáveis.

### F-03 — Fossum, 4ª edição

O sumário confirma quatro partes e 44 capítulos:

| Parte | Capítulos | Aplicação curricular |
|---:|---:|---|
| 1 | 1–15 | assepsia, esterilização, ambiente, preparo, instrumentação, sutura, hemostasia, infecção, nutrição, reabilitação, anestesia e perioperatório |
| 2 | 16–31 | tecidos moles, abdômen, digestório, hepatobiliar, endócrino, hemolinfático, urinário, reprodutivo, cardiovascular e respiratório |
| 3 | 32–36 | ortopedia, fraturas, articulações, músculo e tendão |
| 4 | 37–44 | neurodiagnóstico, exame neurológico, cérebro, coluna e doenças/técnicas do sistema nervoso |

O F-03 complementa a clínica médica nos conteúdos cirúrgicos e perioperatórios. Não deve ser usado como autorização de procedimento: a primeira versão do produto é digital e não avalia habilidade psicomotora.

## 4. Matriz da trilha de 24 meses

Esta matriz é um mapa de autoria, não uma lista de módulos publicados. A indicação de parte/seção evita inventar um capítulo quando a seleção detalhada ainda dependerá do objetivo e do protocolo CVG.

| Mês | Módulo | F-01 | F-02 | F-03 | Prioridade de produção |
|---:|---|---|---|---|---|
| 1 | Diagnóstico, raciocínio e uso das fontes | Partes 1–3 e fundamentos | Seções I–IV | apoio perioperatório quando necessário | núcleo comum |
| 2 | Emergência e terapia intensiva | Parte 2; Partes 3 e 12; Parte 20 | Seção VI, caps. 119–131; técnicas dos caps. 72–112 | caps. 4, 8, 12, 19, 24 e 29–31 | fatia vertical aprovada |
| 3 | Cardiologia | Parte 14 | Seção XIV | cap. 28 | segunda onda |
| 4 | Sistema respiratório | Parte 15 | Seção XII | caps. 29–31 | segunda onda |
| 5 | Nefrologia e urologia | Partes 16–17 | Seções XX–XXI | caps. 25–26 | segunda onda |
| 6 | Endocrinologia e metabolismo | Parte 19 | Seção XIX | cap. 23 | segunda onda |
| 7 | Gastroenterologia, fígado e pâncreas | Parte 13 | Seções XVI–XVIII | caps. 19–23 | segunda onda |
| 8 | Hematologia, imunologia e transfusão | Parte 20 | Seção X | cap. 24 | segunda onda |
| 9 | Infectologia, parasitologia e One Health | Partes 10–11 | Seção XI | caps. 9, 16 e 18 quando relacionados | segunda onda |
| 10 | Neurologia e toxicologia | Partes 9 e 21 | Seções VII e XV | Parte 4, caps. 37–44 | segunda onda |
| 11 | Internação, dor, nutrição e continuidade | Partes 2, 3 e 6 | Seções I, IV e IX | caps. 4, 10–12 | segunda onda |
| 12 | Integração da Parte 1 | integração das partes aplicáveis | integração das seções aplicáveis | apoio conforme caso | integrador |
| 13 | Princípios cirúrgicos, anestesia e perioperatório | Partes 2–3 e 12 | Seções IV, V e VIII | Parte 1, caps. 1–15 | terceira onda |
| 14 | Cirurgia abdominal e tecidos moles | Parte 13 | Seções XVI–XVIII | Parte 2, caps. 16–24 | terceira onda |
| 15 | Cirurgia torácica e urogenital | Partes 15–18 | Seções XII, XIV e XXI | Parte 2, caps. 25–31 | terceira onda |
| 16 | Ortopedia e trauma musculoesquelético | Partes 2, 3 e 21 quando aplicável | seções de trauma, dor e diferenciais | Parte 3, caps. 32–36 | terceira onda |
| 17 | Neurocirurgia e reabilitação | Parte 21 | Seção XV | Parte 4, caps. 37–44 e cap. 11 | terceira onda |
| 18 | Dermatologia e otologia | Partes 5, 10–11 e 19 quando aplicável | diferenciais, imunologia e infecção | cap. 16 e cap. 18 | terceira onda |
| 19 | Oftalmologia | Partes 5, 11 e 21 quando aplicável | diferenciais e manifestações sistêmicas | cap. 17 | terceira onda |
| 20 | Oncologia | Parte 8 | Seção XXII | caps. 16, 20–24 e 39 quando aplicável | terceira onda |
| 21 | Reprodução, neonatologia e pediatria | Partes 7 e 18 | nutrição, endocrinologia, infecciosas e seções específicas | cap. 27 | quarta onda |
| 22 | Prevenção, odontologia, nutrição e comportamento | Partes 1, 5, 6 e 22 | Seções I, IX e XI | cap. 20 e conteúdos aplicáveis | quarta onda |
| 23 | Geriatria, multimorbidade e paliativos | Partes 3, 13–21 e 22 | Seção XIII e capítulos por sistema | suporte perioperatório quando aplicável | quarta onda |
| 24 | Capstone e plano de desenvolvimento seguinte | integração | integração | integração | integrador |

## 5. Matriz validada da M02

### 5.1 Conteúdo e objetivos

| Objetivo da M02 | Fonte primária | Complementos | Regra de atualização |
|---|---|---|---|
| reconhecer instabilidade e priorizar ABCDE | F-02, caps. 119–122 | F-01, Parte 2, caps. 2–5 | confrontar protocolo de triagem do CVG |
| prescrever fluidoterapia com meta e reavaliação | F-02, cap. 120 | F-01, Parte 12, caps. 107–111 | diretriz atual de fluidoterapia prevalece |
| reconhecer tipos de choque e resposta | F-02, cap. 121 | F-01, Parte 2 e Parte 12 | condutas vasoativas/doses exigem revisão atual |
| investigar sem atrasar estabilização | F-02, caps. 119, 122 e 123 | F-01, caps. 2–5; Fossum, cap. 4 | separar exame que muda conduta de exame postergável |
| lidar com crise respiratória e pleural | F-02, cap. 123 e técnicas 90–94 | F-01, Parte 15; Fossum, caps. 29–31 | protocolo local e diretriz atual |
| reconhecer hemorragia e necessidade de controle de fonte | F-02, cap. 124 | F-01, Parte 20, caps. 205–211; Fossum, caps. 8, 19 e 24 | transfusão e hemostasia exigem atualização |
| executar mentalmente BLS/ALS em simulação | F-02, cap. 131 como base histórica | RECOVER 2024 | RECOVER atual prevalece sobre o capítulo do livro |
| comunicar situação, resposta e gatilho | F-02, cap. 119 e seção I | F-01, Partes 1–2 | usar formato definido pelo CVG |

### 5.2 Localizadores internos já usados na fatia

Os localizadores abaixo são referências internas de trabalho. O número é a página do PDF local, não a paginação impressa da obra.

| Fonte | Localizador usado | Uso na M02 |
|---|---|---|
| F-02 | caps. 119–124, PDF aproximadamente 830–862 | triagem, fluidos, choque, diagnóstico, crise respiratória e hemorragia |
| F-02 | caps. 90–96, PDF aproximadamente 579–607 | oxigenoterapia, pressão, toracocentese, traqueostomia, pericardiocentese e ECG |
| F-02 | cap. 131, PDF aproximadamente 889–895 | referência histórica de RCP; não substitui RECOVER 2024 |
| F-01 | Parte 2, caps. 2–5, 7, 8 e 11 | emergência, vias aéreas, arritmia, edema, trauma e urgência felina |
| F-01 | Parte 3, cap. 20; Parte 12, caps. 107–111 | dor em UTI, fluidos, eletrólitos e ácido-base |
| F-01 | Parte 20, caps. 205–211 | hemostasia, paciente hemorrágico, transfusão e reações |
| F-03 | caps. 4, 8, 12, 19, 24 e 29–31 | estabilização, hemostasia, analgesia, perioperatório, abdômen e tórax/pleura |

Os localizadores e a matriz já estão refletidos na documentação interna da M02. Antes de publicar qualquer item, o autor deve registrar o capítulo/seção e confirmar a página visual quando houver risco clínico; essa informação nunca é projetada para o participante.

## 6. Conversão da literatura em aprendizagem

O processo de autoria deve fazer a transformação abaixo:

```text
capítulo/seção consultado
→ competência e objetivo observável
→ caso fictício com dados suficientes
→ decisão que o participante precisa justificar
→ gabarito/rubrica e feedback acionável
→ remediação e reapresentação espaçada
```

### 6.1 Formatos recomendados

| Conhecimento a observar | Formato digital | Critério de qualidade |
|---|---|---|
| reconhecimento e sequência de prioridades | múltipla escolha de melhor resposta | uma opção inequivocamente mais segura no contexto apresentado |
| comparação de diferenciais | associação estendida ou tabela estruturada | cada associação deve ter justificativa verificável |
| interpretação de dados | resposta curta/campos estruturados | avaliar achado, significado, incerteza e próxima ação |
| plano diagnóstico/terapêutico | questão dissertativa com rubrica | exigir prioridade, meta, reavaliação, risco e escalonamento |
| comunicação e passagem | simulação digital de decisão e resposta aberta | separar fato, interpretação, ação, resposta e gatilho |
| retenção | quiz curto e revisão 30/60/90 dias | recuperar e aplicar em caso equivalente, não apenas reconhecer texto |

Uma simulação digital demonstra conhecimento, raciocínio, priorização, comunicação e tomada de decisão no cenário fictício. Não demonstra habilidade manual, competência psicomotora ou autorização para executar procedimento em paciente.

### 6.2 Regras para questões clínicas

1. Toda questão recebe `content_id`, objetivo, espécie, nível de complexidade, fonte interna, autor, versão, data de corte, validade e aprovador.
2. Condutas críticas e atualizáveis recebem fonte contemporânea adicional, além da obra local.
3. Não usar transcrição, paráfrase próxima, tabela, figura ou imagem protegida.
4. Não construir alternativa “pegadinha” que premie uma conduta insegura por detalhe linguístico.
5. Doses e cálculos só entram após protocolo CVG, unidade, concentração, via, arredondamento e fonte atual serem definidos.
6. Divergência entre obras ou entre obra e diretriz cria `conflict_id` e bloqueia a publicação até decisão de Ricardo.
7. Erro crítico deve gerar remediação educativa do objetivo afetado, conforme D-082.
8. Resposta aberta deve possuir rubrica testada antes do uso; se não houver correção funcional, o item fica bloqueado.

## 7. Registro mínimo de fonte por unidade

O registro interno do conteúdo deve manter, no mínimo:

| Campo | Exemplo de intenção |
|---|---|
| `content_id` | item ou unidade autoral CVG |
| `objective_id` | objetivo observável da trilha |
| `source_id` | F-01, F-02, F-03 ou diretriz/protocolo |
| `edition_year` | edição/ano consultados |
| `volume_section_part` | volume, seção ou parte |
| `chapter_locator` | capítulo/seção consultados |
| `pdf_page` | opcional, página do PDF local |
| `protocol_id` | protocolo CVG, ou `NAO_FORNECIDO`/`NAO_APLICAVEL` |
| `dynamic_topic` | sim/não; doses, RCP, transfusão etc. |
| `scientific_cutoff` | data de corte da revisão |
| `valid_until` | validade 6/12/24 meses conforme regra |
| `author` | autor do conteúdo CVG |
| `clinical_approver` | Ricardo no MVP |
| `version` | versão publicável |
| `publication_state` | rascunho, revisão, aprovado, publicado, retirado |
| `conflict_id` | quando houver divergência |

Esse registro é restrito à equipe autorizada. O aluno recebe somente o material autoral do CVG e as informações educacionais necessárias, nunca o catálogo de fontes, PDFs, fotos, tabelas, figuras, trechos, links ou metadados equivalentes.

## 8. Pendências antes da produção em escala

- Aprovar clinicamente o blueprint B-07 antes de produzir os 120 itens diagnósticos.
- Confirmar protocolos CVG para triagem, fluidos, RCP, transfusão, analgesia, antimicrobianos e encaminhamento; quando não existirem, registrar `NAO_FORNECIDO` em vez de inventar regra interna.
- Selecionar e registrar as diretrizes atuais por módulo, começando por fluidoterapia, RECOVER, dor e transfusão na M02.
- Executar o T2 controlado da M02 e usar tempo, clareza, avaliabilidade e correção para ajustar o formato.
- Criar o template definitivo de autoria/revisão antes da onda seguinte; a SPEC deve traduzir esse registro para o modelo de dados, sem armazenar PDFs.
- Fazer revisão visual de páginas críticas quando a extração textual estiver incompleta ou ambígua.

## 9. Decisão e fronteiras

Este anexo fecha a etapa de leitura e matriz bibliográfica, mas não autoriza:

- construir a plataforma, API, banco ou telas;
- publicar conteúdo clínico sem revisão e aprovação;
- aplicar o diagnóstico B-07;
- ampliar o ensaio M02 para a coorte completa;
- criar OCR, RAG, embeddings ou automação dos PDFs;
- inferir competência prática ou autonomia clínica.

O template interno de autoria/revisão recomendado foi criado no [Anexo 0024](0024_template_autoria_revisao_interno.md). A derivação de contratos da SPEC 0101–0111 continua condicionada à autorização humana já registrada no runtime.
