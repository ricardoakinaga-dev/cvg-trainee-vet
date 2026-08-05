# Briefing do Sistema CVG de Treinamento Veterinário

**Identificador do projeto:** `cvg-trainee-vet`  
**Nome provisório do produto:** Sistema CVG de Treinamento Veterinário  
**Organização:** Centro Veterinário Guarapiranga — CVG  
**Data de abertura:** 2026-07-29  
**Fase atual:** correção dos gates Discovery e PRD
**Status do gate Discovery:** `REPROVADO — EM CORREÇÃO (2026-08-05)` — há itens obrigatórios incompletos; ver [0090 — Discovery Validation](00.DISCOVERY/0090_discovery_validation.md)
**Status do gate PRD:** `REPROVADO — EM CORREÇÃO (2026-08-05)` — o PRD existente é rascunho controlado; ver [0090 — PRD Validation](01.PRD/0090_prd_validation.md)
**Status da auditoria documental:** `EM AUDITORIA — BASELINE TÉCNICA NÃO APROVADA`  
**Modalidade confirmada pelo patrocinador como insumo (D-068):** treinamento integralmente digital, com casos e simulações digitais; sem treinamento prático presencial associado à plataforma na primeira versão.
**Escopo desta entrega:** documentação de briefing; nenhuma implementação, aula, prova real ou código foi criado.

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

Nesta etapa foram produzidos o **Discovery documental** e um **rascunho controlado do PRD**. Como ainda existem itens obrigatórios incompletos, ambos os gates estão `REPROVADOS — EM CORREÇÃO`. As decisões confirmadas pelo patrocinador, incluindo D-068, permanecem válidas como insumos para corrigir os documentos, mas não autorizam SPEC, BUILD, produção de conteúdo ou mudança de fase.

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
7. [0020 — PRD Master](01.PRD/0020_prd_master.md)
8. [0090 — Validação do PRD](01.PRD/0090_prd_validation.md)

### Anexos preparatórios, ainda não aprovados como PRD

1. [Governança das fontes](90.ANEXOS/0001_governanca_fonte_conhecimento.md)
2. [Hipóteses pedagógicas](90.ANEXOS/0002_hipoteses_pedagogicas.md)
3. [Hipóteses de avaliações e métricas](90.ANEXOS/0003_hipoteses_avaliacoes_metricas.md)
4. [Roadmap e gates](90.ANEXOS/0004_roadmap_gates_construcao.md)
5. [Decisões pendentes](90.ANEXOS/0005_decisoes_pendentes.md)
6. [Matriz de cobertura](90.ANEXOS/0006_matriz_cobertura_briefing.md)
7. [Roteiro de entrevistas e levantamento operacional](90.ANEXOS/0007_roteiro_entrevistas.md)
8. [Decisões do gate PRD — opções e recomendação](90.ANEXOS/0008_decisoes_gate_prd.md)
9. [Validação da documentação — baseline em auditoria](90.ANEXOS/0009_validacao_documentacao.md)
10. [Controle de versão e evidências dos gates](90.ANEXOS/0010_controle_versao_gates.md)
11. [Política mínima interna de dados — aprovada para o MVP](90.ANEXOS/0011_politica_conservadora_dados_lgpd.md)

## 4. O que não foi criado

- Código, aplicação, site ou plataforma;
- Banco de dados, API, arquitetura técnica ou stack;
- Aulas, resumos clínicos ou materiais didáticos;
- Questões reais, quizzes reais ou provas reais;
- Certificados;
- Protótipos de telas;
- SPEC, backlog de BUILD ou sprints;
- Auditoria de um sistema inexistente;
- Conteúdo derivado extensivamente do livro.

## 4.1 Bloqueios obrigatórios para nova submissão dos gates

A autorização gerencial histórica para elaborar o rascunho do PRD não substituiu os gates canônicos. Os itens abaixo devem ser fechados com evidência antes da nova submissão do Discovery e, depois, do PRD:

1. B-01 concluído por D-078: aprendizado atual informal, sem trilha, avaliação ou registro centralizado;
2. dimensionar o público e delimitar a coorte piloto (B-02);
3. B-03 concluído por D-076: Ricardo concentra as responsabilidades do MVP; outro MV revisa cada módulo clínico antes da publicação;
4. B-04 concluído por D-075 para o MVP interno: consulta manual, conteúdo original, PDFs fora da plataforma/Git e referência simples por módulo;
5. B-05 concluído por D-077: política mínima aprovada; somente nome/login profissional, progresso, tentativas, notas e logs mínimos; prontuários, tutores, gravações e casos reais identificáveis proibidos;
6. áreas do piloto confirmadas: núcleo comum + emergência e internação (B-06);
7. estabelecer baseline mínima com o diagnóstico inicial na coorte piloto (B-07).

## 4.2 Controle de versão obrigatório

Todo avanço de fase exige checkpoint Git, revisão do diff, validações aplicáveis, commit convencional e registro do commit no documento do gate. A aprovação humana somente será válida para o conteúdo exato identificado pelo commit revisado.

É terminantemente proibido commitar chaves, senhas, tokens, credenciais, certificados privados ou qualquer outro segredo. A detecção de um segredo bloqueia o gate e exige remoção segura e rotação antes da continuidade.

Os PDFs-fonte não serão versionados no Git. Sua integridade será controlada por hashes SHA-256, conforme o [Anexo 0010](90.ANEXOS/0010_controle_versao_gates.md).

## 5. Fontes clínicas principais

> **Registro interno:** os dados das obras abaixo não serão exibidos ao aluno. Por D-075, cada módulo mantém somente a referência interna simples à obra e ao capítulo/seção consultados.

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

O Ettinger será a **fonte clínica atualizada de referência** para complementar e revisar o tratado brasileiro. Quando houver divergência, o conteúdo não será escolhido automaticamente: um revisor clínico deverá avaliar data, contexto brasileiro, protocolo interno, diretrizes atuais e segurança, registrando a decisão.

**Obra cirúrgica:** *Cirurgia de Pequenos Animais*  
**Autora:** Theresa Welch Fossum  
**Edição:** 4ª edição  
**Publicação:** Elsevier, 2014  
**Arquivo local:** `Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf`  
**Estrutura verificada:** quatro partes (princípios cirúrgicos gerais, cirurgia do tecido mole, ortopedia e neurocirurgia) e capítulos de 1 a 44; o arquivo PDF possui 5.008 páginas.

O Fossum será a **referência cirúrgica complementar** para a trilha de cirurgia e para conteúdos perioperatórios de emergência/internação, na hierarquia definida no [Anexo 0001](90.ANEXOS/0001_governanca_fonte_conhecimento.md) (F-03), sob os controles internos simples de D-075.

## 6. Condição para avançar

O PRD foi elaborado como rascunho controlado em 2026-08-05. Fechar os itens abaixo não libera automaticamente a SPEC: primeiro será necessário reexecutar e aprovar formalmente os gates Discovery e PRD, com checkpoint Git identificado.

1. dimensionar o público e confirmar a coorte piloto;
2. levantar uma linha de base;
3. resolver os requisitos ainda pendentes;
4. aplicar a política mínima D-077 nos levantamentos e no futuro sistema;
5. reexecutar e aprovar formalmente `00.DISCOVERY/0090_discovery_validation.md` e, depois, `01.PRD/0090_prd_validation.md`.

Enquanto isso, são permitidas correção documental e preparação de rascunhos de conteúdo original. Entrevistas, inventário e baseline devem respeitar D-077; gravações, prontuários, dados de tutores e casos reais identificáveis continuam proibidos. SPEC, BUILD, arquitetura, código e publicação do programa continuam sujeitos aos gates.

**Política mínima de dados (D-077):** o Anexo 0011 está aprovado para o MVP e B-05 está fechado. O programa usa apenas dados de identificação/login profissional, progresso, tentativas, notas e segurança. Ricardo controla o acesso; os dados são mantidos durante o vínculo + 2 anos.

**Política de fontes (D-075):** governança enxuta para uso interno: consulta manual, conteúdo original CVG, PDFs fora da plataforma/Git e referência simples por módulo. B-04 está fechado; automação dos PDFs fica fora do MVP em D-033.

**Governança do MVP (D-076):** MV. Ricardo Akinaga responde pelas frentes do MVP e pelos gates documentais. Não há comitês ou suplentes obrigatórios; outro MV faz a segunda conferência antes da publicação de cada módulo clínico.
