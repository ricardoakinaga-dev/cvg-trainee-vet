# Anexo 0001 — Governança das Fontes de Conhecimento

**Status:** proposta para aprovação no PRD; atualizado em 2026-08-05 com inclusão do Fossum (F-03)  
**Objetivo:** definir como as fontes serão usadas sem produzir conteúdo nesta etapa.

## 1. Fontes canônicas

### F-01 — Tratado brasileiro

- **Título:** *Tratado de Medicina Interna de Cães e Gatos*;
- **Organizadores:** Márcia Marques Jericó, João Pedro de Andrade Neto e Márcia Mery Kogika;
- **Editora:** Roca/GEN;
- **Edição:** 1ª;
- **Ano:** 2015;
- **ISBN:** 978-85-277-2666-5;
- **Idioma:** português;
- **Arquivo local:** `Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf`;
- **PDF:** 7.047 páginas;
- **Estrutura:** dois volumes, 23 partes, 264 capítulos e apêndices.

**Papel proposto:** base curricular em português, recorte de temas e contextualização nacional.

### F-02 — Ettinger atualizado

- **Título:** *Ettinger’s Textbook of Veterinary Internal Medicine*;
- **Editores:** Etienne Côté, Stephen J. Ettinger e Edward C. Feldman;
- **Editora:** Elsevier;
- **Edição:** 9ª;
- **Ano:** 2024;
- **ISBN conjunto:** 978-0-323-77931-9;
- **Idioma:** inglês;
- **Arquivo local:** `Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf`;
- **PDF:** 2.801 páginas;
- **Estrutura:** dois volumes, 22 seções e 331 capítulos.

**Papel proposto:** referência clínica atualizada e complemento científico.

### F-03 — Fossum, Cirurgia de Pequenos Animais

- **Título:** *Cirurgia de Pequenos Animais*;
- **Autora:** Theresa Welch Fossum;
- **Editora:** Elsevier;
- **Edição:** 4ª;
- **Ano:** 2014 (© 2015 Elsevier Editora Ltda);
- **Idioma:** português;
- **Arquivo local:** `Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf`;
- **PDF:** 5.008 páginas;
- **Estrutura:** quatro partes — 1. Princípios Cirúrgicos Gerais, 2. Cirurgia do Tecido Mole, 3. Ortopedia, 4. Neurocirurgia — com capítulos de 1 a 44;
- **ISBN:** 978-85-352-6991-8.

**Papel proposto:** referência cirúrgica para a trilha de cirurgia e para conteúdos de emergência/internação relacionados a procedimentos (ex.: feridas, drenos, contenção de hemorragia, cuidados perioperatórios). A entrada no escopo do piloto depende de decisão do comitê clínico (B-06).

## 2. Hierarquia de autoridade

A expressão “fonte da verdade” será operacionalizada desta forma:

1. **Legislação, regulação, bula e alerta sanitário vigentes**;
2. **Protocolos internos do CVG aprovados e vigentes**;
3. **Diretrizes e consensos atuais selecionados pelo comitê clínico**;
4. **Ettinger, 9ª edição, 2024**;
5. **Fossum, 4ª edição, 2014** (temas cirúrgicos e perioperatórios);
6. **Tratado brasileiro, 1ª edição, 2015**.

O tratado define o eixo curricular, e o Ettinger atualiza e amplia. O Fossum entra como referência específica de cirurgia e procedimentos, sempre subordinado ao Ettinger para atualização e às camadas superiores da hierarquia. A posição superior de legislação, bula e protocolos evita que uma obra estática seja tratada como autoridade absoluta em assuntos que mudam.

## 3. Regra para divergências

Quando fontes divergirem:

1. Registrar `conflict_id`;
2. Identificar tema e risco;
3. Citar fonte, edição, capítulo, seção e página;
4. Verificar data e contexto;
5. Consultar protocolo CVG e norma brasileira;
6. Encaminhar ao revisor especialista;
7. Registrar decisão e justificativa;
8. Definir validade da decisão;
9. Atualizar itens afetados;
10. Preservar histórico.

Nenhuma divergência clínica crítica será resolvida automaticamente por IA.

## 4. Modelo de rastreabilidade

Cada unidade futura de conteúdo deverá possuir:

| Campo | Obrigatório |
|---|---:|
| `content_id` | sim |
| título | sim |
| objetivo de aprendizagem | sim |
| competência | sim |
| nível | sim |
| fonte principal | sim |
| edição/ano | sim |
| volume | sim |
| parte ou seção | sim |
| capítulo | sim |
| páginas | sim |
| fontes complementares | quando aplicável |
| protocolo CVG relacionado | quando aplicável |
| autor | sim |
| revisor clínico | sim |
| revisor pedagógico | sim |
| versão | sim |
| data de corte científico | sim |
| validade | sim |
| próxima revisão | sim |
| riscos/alertas | quando aplicável |
| status de publicação | sim |

Formato de identificador proposto:

- Tratado: `TMI-CG-2015-V{volume}-P{parte}-C{capitulo}`;
- Ettinger: `ETT-2024-V{volume}-S{secao}-C{capitulo}`;
- Fossum: `FOS-2014-V{volume}-P{parte}-C{capitulo}`;
- Protocolo CVG: `CVG-PROT-{area}-{versao}`.

## 5. Mapeamento macro do tratado brasileiro

| Parte | Tema | Uso curricular inicial |
|---:|---|---|
| 1 | Responsabilidade profissional | básico obrigatório |
| 2 | Medicina veterinária intensiva | avançado |
| 3 | Manejo e controle da dor | básico a avançado |
| 4 | Genética e biologia molecular | avançado/eletivo |
| 5 | Imunologia e imunoprofilaxia | básico/intermediário |
| 6 | Nutrição clínica | básico/intermediário |
| 7 | Neonatos e filhotes | intermediário |
| 8 | Oncologia | avançado |
| 9 | Toxicologia | intermediário/avançado |
| 10 | Doenças parasitárias | intermediário |
| 11 | Doenças infecciosas | intermediário |
| 12 | Desequilíbrios eletrolíticos e acidobásicos | básico a avançado |
| 13 | Sistema digestório | intermediário/avançado |
| 14 | Cardiovascular | intermediário/avançado |
| 15 | Respiratório | intermediário/avançado |
| 16 | Trato urinário superior | intermediário/avançado |
| 17 | Trato urinário inferior | intermediário/avançado |
| 18 | Genital e reprodutor | intermediário/avançado |
| 19 | Endócrino e metabolismo | intermediário/avançado |
| 20 | Hematologia e imunomediadas | intermediário/avançado |
| 21 | Neurologia | avançado |
| 22 | Medicina veterinária legal | básico obrigatório + aprofundamento |
| 23 | Apêndices | referência controlada; doses exigem atualização |

Esse mapeamento não representa módulos prontos.

## 6. Mapeamento macro do Ettinger

O índice verificado inclui:

- Comunicação, história, exame físico e medicina baseada em evidências;
- Uso responsável de antimicrobianos;
- Diagnóstico diferencial por sinais;
- Diagnóstico diferencial de alterações laboratoriais;
- Técnicas diagnósticas e terapêuticas;
- Intervenções minimamente invasivas;
- Emergência;
- Nutrição;
- Toxicologia;
- Doenças infecciosas;
- Imunologia e hematologia;
- Doenças respiratórias, cardiovasculares e neurológicas;
- Gastroenterologia, hepatologia e pâncreas;
- Endocrinologia;
- Doenças renais e do trato urinário;
- Oncologia.

Recomenda-se usar o Ettinger especialmente para:

- Medicina baseada em evidências;
- Stewardship de antimicrobianos;
- Diagnóstico diferencial;
- Atualização de condutas;
- Emergência;
- Procedimentos;
- Casos avançados e integração entre sistemas.

## 6.1 Mapeamento macro do Fossum

O índice verificado inclui quatro partes:

| Parte | Tema | Uso curricular inicial |
|---:|---|---|
| 1 | Princípios cirúrgicos gerais (assepsia, esterilização, instrumentação, suturas, infecções cirúrgicas, anestesia e terapia perioperatória, nutrição, reabilitação, cirurgia minimamente invasiva, medicina regenerativa) | básico obrigatório (princípios); avançado (anestesia/reabilitação) |
| 2 | Cirurgia do tecido mole (tegumento, olho, ouvido, abdômen, digestório, fígado, biliar, endócrino, hemolinfático, renal, urogenital, cardiovascular, respiratório) | avançado/trilha de cirurgia |
| 3 | Ortopedia (fraturas, articulações, músculo e tendão) | avançado/trilha de cirurgia |
| 4 | Neurocirurgia (exame neurológico, neurodiagnóstico, cérebro, coluna cervical e toracolombar) | avançado/trilha de cirurgia |

Recomenda-se usar o Fossum especialmente para:

- Princípios de assepsia, esterilização e biossegurança cirúrgica;
- Procedimentos e cuidados perioperatórios;
- Feridas, drenos e contenção de hemorragia (aplicáveis a emergência/internação);
- Conteúdo das trilhas de cirurgia.

Esse mapeamento não representa módulos prontos.

## 7. Direitos autorais

### Regras

- Não reproduzir capítulos, tabelas, figuras ou trechos extensos;
- Não publicar os PDFs dentro da plataforma sem licença;
- Não usar imagens sem permissão;
- Criar materiais autorais e sínteses originais;
- Referenciar a fonte;
- Confirmar se a licença permite uso institucional;
- Confirmar se permite material derivado;
- Restringir acesso aos arquivos;
- Registrar origem e permissão.

O Ettinger declara proteção inclusive para mineração de texto e treinamento de IA. A utilização em fluxos automatizados ou geração de conteúdo exige verificação jurídica e contratual.

O Fossum possui proteção expressa de direitos autorais (© 2015 Elsevier Editora Ltda; copyright original © 2013 Mosby/Elsevier). Aplica-se a mesma regra: verificação jurídica antes de qualquer uso institucional, material derivado ou processamento automatizado (B-04).

## 8. Ciclo editorial proposto

```text
seleção do tema
→ blueprint
→ pesquisa nas fontes
→ autoria
→ revisão clínica
→ revisão pedagógica
→ checagem de direitos
→ aprovação
→ publicação
→ monitoramento
→ revisão periódica ou emergencial
```

## 9. Frequência de revisão

Proposta:

- Conteúdo crítico — doses, antimicrobianos, emergência e regulamentação: a cada 6 meses;
- Conteúdo clínico geral: a cada 12 meses;
- Fundamentos estáveis: a cada 24 meses;
- Alerta regulatório ou risco identificado: revisão imediata.

## 10. Retirada emergencial

- Crítico: retirar ou bloquear imediatamente; decisão em até 24 horas;
- Alto: revisar em até 3 dias úteis;
- Médio: revisar na próxima janela editorial;
- Toda retirada deve registrar conteúdo e questões afetadas, usuários expostos e ação corretiva.

## 11. Responsabilidades

| Função | Responsabilidade | Nome |
|---|---|---|
| Comitê científico | hierarquia de fontes e divergências | PENDENTE |
| Especialista da área | correção clínica | PENDENTE |
| Revisor pedagógico | qualidade educacional | PENDENTE |
| Jurídico/licenças | direitos autorais | PENDENTE |
| Gestor de conteúdo | versão e calendário | PENDENTE |
| Auditor | rastreabilidade | PENDENTE |

