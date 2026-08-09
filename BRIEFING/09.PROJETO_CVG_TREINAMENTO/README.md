# Briefing do Sistema CVG de Treinamento Veterinário

**Identificador do projeto:** `cvg-trainee-vet`  
**Nome provisório do produto:** Sistema CVG de Treinamento Veterinário  
**Organização:** Centro Veterinário Guarapiranga — CVG  
**Data de abertura:** 2026-07-29  
**Fase atual:** SPEC — Fase 0 concluída; aguarda autorização para 0101
**Status do gate Discovery:** `APROVADO EM 2026-08-07 SOBRE F6FEFA1`; ver [0090 — Discovery Validation](00.DISCOVERY/0090_discovery_validation.md)
**Status do gate PRD:** `APROVADO EM 2026-08-07 SOBRE F6FEFA1`, depois do Discovery; ver [0090 — PRD Validation](01.PRD/0090_prd_validation.md)
**Status da auditoria documental:** `CONCLUÍDA E APROVADA`
**Alinhamento pré-SPEC:** D-091 a D-108 aprovadas; somente a readiness da SPEC foi autorizada. BUILD permanece proibido.
**Regra de exposição (D-109, 2026-08-09):** a rastreabilidade bibliográfica é exclusivamente interna à construção, revisão e auditoria; a experiência do participante recebe somente conteúdo autoral do CVG e não expõe referências, metadados ou materiais das obras consultadas.
**Modalidade confirmada pelo patrocinador como insumo (D-068):** treinamento integralmente digital, com casos e simulações digitais; sem treinamento prático presencial associado à plataforma na primeira versão.
**Escopo desta entrega:** documentação de briefing, currículo V3 aprovado e fatia vertical documental do Mês 2; nenhuma plataforma, aplicação real ou código de produto foi criado.

**Princípio de produto (D-080):** o colaborador deve encontrar uma jornada clara e óbvia: entrar, receber uma recomendação, estudar unidades breves dentro de módulos clínicos completos, resolver casos digitais, obter feedback imediato e acompanhar o próprio progresso. Controles administrativos não devem criar etapas desnecessárias para quem está aprendendo.

## 1. Finalidade deste diretório

Este diretório materializa o briefing do projeto sem alterar os arquivos canônicos existentes em `BRIEFING/00.DiSCOVERY` a `BRIEFING/08.RUNTIME`.

O pacote foi organizado para seguir a sequência oficial:

```text
DISCOVERY
→ CHECKPOINT GIT
→ APROVAÇÃO HUMANA
→ PRD
→ CHECKPOINT GIT
→ APROVAÇÃO HUMANA
→ SPEC
→ CHECKPOINT GIT
→ APROVAÇÃO HUMANA
→ BUILD
→ CHECKPOINT GIT POR FASE
→ PILOTO
→ CHECKPOINT GIT
→ AUDIT
→ MELHORIA CONTÍNUA
```

Foram produzidos e aprovados o **Discovery documental**, o **PRD** e o pacote D-101 a D-108. A Fase 0 da SPEC foi autorizada e materializada no readiness 0100. BUILD, publicação geral e piloto completo continuam sujeitos aos gates posteriores. A fatia M02 permanece autorizada por D-087/D-088 para ensaio controlado; T2 está pronto por D-089.

## 2. Regra de interpretação dos dados

Todos os campos foram preenchidos segundo uma destas classificações:

- **FATO INFORMADO:** declarado diretamente pelo solicitante ou verificado nos arquivos locais;
- **EVIDÊNCIA DOCUMENTAL:** confirmado no tratado ou nos engines canônicos do briefing;
- **HIPÓTESE:** interpretação provisória que exige validação;
- **PROPOSTA:** decisão recomendada para discussão, ainda não aprovada;
- **PENDENTE:** informação que não foi fornecida e não pode ser inventada.

Nenhum campo desconhecido foi apresentado como certeza.

## 3. Artefatos produzidos

### Discovery

1. [0000 — Trigger](00.DISCOVERY/0000_trigger.md)
2. [0001 — Análise da dor](00.DISCOVERY/0001_analise_da_dor.md)
3. [0002 — Contexto operacional](00.DISCOVERY/0002_contexto_operacional.md)
4. [0003 — Fluxo atual](00.DISCOVERY/0003_fluxo_atual.md)
5. [0004 — Problem framing](00.DISCOVERY/0004_problem_framing.md)
6. [0005 — Hipótese de valor](00.DISCOVERY/0005_hipotese_de_valor.md)
7. [0006 — Usuários e stakeholders](00.DISCOVERY/0006_usuarios_e_stakeholders.md)
8. [0007 — Riscos e hipóteses](00.DISCOVERY/0007_riscos_e_hipoteses.md)
9. [0009 — Discovery master](00.DISCOVERY/0009_discovery_master.md)
10. [0090 — Validação](00.DISCOVERY/0090_discovery_validation.md)

### PRD

1. [0010 — Casos de uso](01.PRD/0010_casos_de_uso.md)
2. [0011 — Escopo da fase](01.PRD/0011_escopo_fase.md)
3. [0012 — Regras de negócio](01.PRD/0012_regras_de_negocio.md)
4. [0013 — Requisitos funcionais](01.PRD/0013_requisitos_funcionais.md)
5. [0014 — Requisitos não funcionais](01.PRD/0014_requisitos_nao_funcionais_produto.md)
6. [0015 — Métricas de sucesso](01.PRD/0015_metricas_de_sucesso.md)
7. [0016 — Programa curricular clínico](01.PRD/0016_programa_curricular_clinico.md)
8. [0017 — Programa curricular de 24 meses](01.PRD/0017_programa_curricular_24_meses.md)
9. [0020 — PRD Master](01.PRD/0020_prd_master.md)
10. [0090 — Validação do PRD](01.PRD/0090_prd_validation.md)

### SPEC

1. [0100 — SPEC Readiness Review](02.SPEC/0100_spec_readiness_review.md)

### Anexos de decisão, conteúdo e preparação

1. [Governança das fontes](90.ANEXOS/0001_governanca_fonte_conhecimento.md)
2. [Hipóteses pedagógicas](90.ANEXOS/0002_hipoteses_pedagogicas.md)
3. [Hipóteses de avaliações e métricas](90.ANEXOS/0003_hipoteses_avaliacoes_metricas.md)
4. [Roadmap e gates](90.ANEXOS/0004_roadmap_gates_construcao.md)
5. [Decisões pendentes](90.ANEXOS/0005_decisoes_pendentes.md)
6. [Matriz de cobertura](90.ANEXOS/0006_matriz_cobertura_briefing.md)
7. [Perguntas opcionais de validação](90.ANEXOS/0007_roteiro_entrevistas.md)
8. [Decisões do gate PRD — opções e recomendação](90.ANEXOS/0008_decisoes_gate_prd.md)
9. [Validação da documentação — baseline em auditoria](90.ANEXOS/0009_validacao_documentacao.md)
10. [Controle de versão e evidências dos gates](90.ANEXOS/0010_controle_versao_gates.md)
11. [Política mínima interna de dados — aprovada para o MVP](90.ANEXOS/0011_politica_conservadora_dados_lgpd.md)
12. [Blueprint do diagnóstico inicial B-07 — rascunho](90.ANEXOS/0012_blueprint_diagnostico_b07.md)
13. [Pesquisa de melhores práticas da trilha de 24 meses](90.ANEXOS/0013_pesquisa_melhores_praticas_trilha_24_meses.md)
14. [Critérios de aceite da fatia vertical do Mês 2](90.ANEXOS/0014_criterios_aceite_fatia_vertical_mes_2.md)
15. [Fatia vertical do Mês 2 — material do participante](90.ANEXOS/0015_fatia_vertical_mes_2_participante.md)
16. [Fatia vertical do Mês 2 — guia restrito do facilitador](90.ANEXOS/0016_fatia_vertical_mes_2_facilitador.md)
17. [Pré-voo da fatia vertical do Mês 2](90.ANEXOS/0017_prevoo_fatia_vertical_mes_2.md)
18. [Protocolo do ensaio controlado e cronometrado da M02](90.ANEXOS/0018_protocolo_ensaio_controlado_m02.md)
19. [Teste sintético das rubricas RA01 e RA02](90.ANEXOS/0019_teste_sintetico_rubricas_m02.md)
20. [Alinhamento de produto e arquitetura antes da SPEC](90.ANEXOS/0020_alinhamento_produto_pre_spec.md)
21. [Pacote de fechamento dos gates para iniciar a SPEC](90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md)
22. [Leitura da literatura e matriz curricular](90.ANEXOS/0022_leitura_literatura_e_matriz_curricular.md)

## 4. O que não foi criado

- Código, aplicação, site ou plataforma;
- Banco de dados, API, arquitetura implementada ou stack contratada; existe apenas uma recomendação pré-SPEC no Anexo 0020;
- Conteúdo dos demais 23 módulos e os 120 itens diagnósticos — somente a fatia vertical documental do Mês 2 foi produzida e aprovada clinicamente para ensaio controlado por D-088;
- Certificados;
- Protótipos de telas;
- Demais documentos da SPEC (0101 a 0190), backlog de BUILD ou sprints;
- Auditoria de um sistema inexistente;
- Conteúdo derivado extensivamente do livro.

## 4.1 Estado dos bloqueios após a reexecução

A autorização gerencial histórica para elaborar o PRD não substituiu os gates canônicos. A auditoria corrigiu a fronteira de B-07 sem waiver, conforme D-101 aprovada:

1. B-01 concluído por D-078: aprendizado atual informal, sem trilha, avaliação ou registro centralizado;
2. B-02 concluído por D-079: aproximadamente 10 veterinários, todos participam da primeira aplicação, sem inventário ou segmentação obrigatória;
3. B-03 concluído por D-076 e atualizado por D-083: Ricardo concentra as responsabilidades do MVP e é o único aprovador clínico obrigatório; revisão adicional é opcional;
4. B-04 concluído por D-075 para o MVP interno: consulta manual, conteúdo original, PDFs fora da plataforma/Git e referência simples por módulo;
5. B-05 concluído por D-077: política mínima aprovada; somente nome/login profissional, progresso, tentativas, notas e logs mínimos; prontuários, tutores, gravações e casos reais identificáveis proibidos;
6. áreas do piloto confirmadas: núcleo comum + emergência e internação (B-06);
7. B-07 está reposicionado como gate pré-piloto: o blueprint orienta a SPEC, enquanto aprovação clínica, produção, pré-voo e aplicação dos 120 itens continuam obrigatórios antes da baseline/piloto completo. O blueprint está no [Anexo 0012](90.ANEXOS/0012_blueprint_diagnostico_b07.md).

Os gates documentais estão formalmente fechados. B-07 permanece no fluxo pré-piloto e não bloqueia os documentos da SPEC.

## 4.2 Controle de versão obrigatório

Todo avanço de fase exige checkpoint Git, revisão do diff, validações aplicáveis, commit convencional e registro do commit no documento do gate. A aprovação humana somente será válida para o conteúdo exato identificado pelo commit revisado.

É terminantemente proibido commitar chaves, senhas, tokens, credenciais, certificados privados ou qualquer outro segredo. A detecção de um segredo bloqueia o gate e exige remoção segura e rotação antes da continuidade.

Os PDFs-fonte não serão versionados no Git. Sua integridade será controlada por hashes SHA-256, conforme o [Anexo 0010](90.ANEXOS/0010_controle_versao_gates.md).

## 5. Fontes clínicas principais

> **Registro interno:** os dados das obras abaixo não serão exibidos ao aluno. Por D-109, qualquer referência, localizador, metadado ou material derivado permanece somente no workflow interno de construção, revisão e auditoria.

**Obra:** *Tratado de Medicina Interna de Cães e Gatos*  
**Organizadores:** Márcia Marques Jericó, João Pedro de Andrade Neto e Márcia Mery Kogika  
**Edição:** 1ª edição  
**Publicação:** Editora Roca, 2015  
**Arquivo local:** `Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf`  
**Estrutura verificada:** dois volumes, 23 partes, 264 capítulos e apêndices; o arquivo PDF possui 7.047 páginas.

O tratado será a **fonte curricular canônica primária** para delimitar temas e fundamentar o conteúdo. Por segurança clínica e conforme advertência da própria obra, informações sujeitas a mudança deverão passar por revisão atual antes da publicação.

**Obra atualizada:** *Ettinger’s Textbook of Veterinary Internal Medicine*  
**Editores:** Etienne Côté, Stephen J. Ettinger e Edward C. Feldman  
**Edição:** 9ª edição  
**Publicação:** Elsevier, 2024  
**Arquivo local:** `Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf`  
**Estrutura verificada:** dois volumes, 22 seções e 331 capítulos; o arquivo PDF possui 2.801 páginas.

O Ettinger será a **fonte clínica atualizada de referência** para complementar e revisar o tratado brasileiro. Quando houver divergência, o conteúdo não será escolhido automaticamente: Ricardo deverá avaliar data, contexto brasileiro, protocolo interno, diretrizes atuais e segurança, registrando a decisão.

**Obra cirúrgica:** *Cirurgia de Pequenos Animais*  
**Autora:** Theresa Welch Fossum  
**Edição:** 4ª edição  
**Publicação:** Elsevier, 2014  
**Arquivo local:** `Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf`  
**Estrutura verificada:** quatro partes (princípios cirúrgicos gerais, cirurgia do tecido mole, ortopedia e neurocirurgia) e capítulos de 1 a 44; o arquivo PDF possui 5.008 páginas.

O Fossum será a **referência cirúrgica complementar** para a trilha de cirurgia e para conteúdos perioperatórios de emergência/internação, na hierarquia definida no [Anexo 0001](90.ANEXOS/0001_governanca_fonte_conhecimento.md) (F-03), sob os controles internos simples de D-075.

## 6. Condição para avançar

O fechamento documental foi aprovado em 2026-08-07. A sequência cumprida foi:

1. D-101 a D-108 e gate Discovery aprovados sobre `f6fefa1`;
2. gate PRD aprovado em seguida no mesmo checkpoint;
3. readiness 0100 da SPEC autorizada;
4. a SPEC aplica D-091 a D-108 como baseline aprovada de produto e arquitetura;
5. B-07 prossegue em paralelo como conteúdo pré-piloto e deve estar concluído antes da baseline/aplicação completa.

Durante a SPEC são permitidos somente documentos de engenharia derivados do PRD. Gravações, prontuários, dados de tutores e casos reais identificáveis continuam proibidos. BUILD, código e publicação do programa permanecem bloqueados até o gate 0190.

**Política mínima de dados (D-077):** o Anexo 0011 está aprovado para o MVP e B-05 está fechado. O programa usa apenas dados de identificação/login profissional, progresso, tentativas, notas e segurança. Ricardo controla o acesso; os dados são mantidos durante o vínculo + 2 anos.

**Política de fontes (D-075):** governança enxuta para uso interno: consulta manual, conteúdo original CVG, PDFs fora da plataforma/Git e referência simples por módulo. B-04 está fechado; automação dos PDFs fica fora do MVP em D-033.

**Governança do MVP (D-076/D-083):** MV. Ricardo Akinaga responde pelas frentes do MVP, pelos gates documentais e pela aprovação clínica. Não há comitês, suplentes ou segunda conferência veterinária obrigatória; revisão adicional permanece opcional.
