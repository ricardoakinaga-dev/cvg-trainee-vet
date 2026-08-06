# 0020 — PRD Master

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Organização:** Centro Veterinário Guarapiranga — CVG  
**Fase:** PRD — consolidação  
**Data:** 2026-08-06
**Status:** consolidado e aprovado tecnicamente; gate aguarda aprovação humana do commit
**Base:** Discovery aprovado tecnicamente na reexecução de 2026-08-06, ainda sujeito ao checkpoint humano

---

## 1. Visão geral

O Sistema CVG de Treinamento Veterinário é uma plataforma de **treinamento clínico integralmente digital** para aproximadamente 10 médicos-veterinários do CVG. A experiência principal combina acesso individual seguro, diagnóstico amplo fracionado e uma trilha de 24 meses, dividida em duas partes, com casos fictícios, pesquisa aberta, recuperação ativa, respostas objetivas e dissertativas, feedback, remediação e progresso visível. Administradores e moderadores acompanham a operação em dashboards escopados, e todos os usuários podem relatar bugs, erros e melhorias.

O produto **não** oferece treinamento prático presencial associado à plataforma, não avalia habilidade psicomotora ou competência prática, não confere autonomia clínica, não é instrumento disciplinar e não substitui protocolos internos. Resultados de casos ou simulações digitais representam apenas conhecimento e raciocínio em cenário simulado (D-068).

## 2. Problema

Hoje o aprendizado é informal e depende da disponibilidade dos profissionais. O produto deve dar ao colaborador um próximo passo claro, permitir prática digital com feedback e mostrar a evolução sem transformar o treinamento em burocracia.

Ver [0009 — Discovery Master](../00.DISCOVERY/0009_discovery_master.md).

## 3. Usuários

- **Primário:** médico-veterinário colaborador;
- **Moderador:** acompanha participantes e filas atribuídos, sem administrar contas ou acessar infraestrutura;
- **Administrador:** administra contas, papéis, trilhas, operação e auditoria;
- **Responsável e aprovador clínico do MVP:** MV. Ricardo Akinaga administra o programa, produz/revisa/aprova conteúdos e responde pelos gates documentais;
- **Apoio opcional:** mentor, suporte técnico ou auditor como capacidade temporária e escopada, somente quando Ricardo autorizar;

## 4. Fluxos principais

### 4.1 Jornada do colaborador

```text
entrar
→ fazer um diagnóstico de 120 itens em três sessões, sem aprovação ou reprovação
→ receber um plano individual de reforço
→ percorrer 24 módulos mensais em duas partes
→ ativar conhecimento, pesquisar nas fontes e decidir em casos fictícios
→ responder quizzes, questões objetivas e dissertativas em janelas assíncronas
→ receber feedback e reencontrar os conceitos em revisão espaçada
```

### 4.2 Governança editorial

```text
seleção do tema
→ blueprint
→ pesquisa nas fontes
→ autoria
→ revisão clínica e aprovação de Ricardo
→ revisão clínica adicional ou pedagógica opcional
→ checagem simples: conteúdo original e PDF ausente
→ aprovação
→ publicação
→ monitoramento
→ revisão periódica/emergencial
```

### 4.3 Auditoria e correção

```text
contestações e alterações de gabarito → protocolo → revisor independente
→ decisão documentada → recálculo dos afetados → versão preservada → trilha de auditoria
```

## 5. Escopo

### IN (piloto/MVP proposto)

- Jornada do colaborador: diagnóstico amplo fracionado, trilha recomendada, unidades breves, módulos completos, questões, casos/simulações digitais, feedback, remediação e progresso;
- Acesso e conta: convite por e-mail profissional, login, recuperação, administração da própria conta e encerramento de sessões;
- Bastidores mínimos: dashboards de administrador/moderador, gestão de usuários, publicação com aprovação humana de Ricardo, controle de acesso e registro de alterações sensíveis;
- Canal interno de bugs, usabilidade, erros de conteúdo e melhorias, com protocolo e triagem;
- KPIs simples de aprendizagem, operação, conteúdo, correções e confiabilidade;
- Núcleo comum obrigatório + áreas **Emergência e Internação** (APROVADO PELO PATROCINADOR COMO INSUMO em 2026-08-05);
- Público/coorte: aproximadamente 10 veterinários, com participação de toda a equipe (D-079; B-02 fechado);
- Matriz curricular V3: 24 meses, duas partes, 24 módulos, 96 sessões e carga estimada de 149 horas (D-084/D-085; PRD 0017).

### OUT

- Treinamento prático presencial associado à plataforma, observação de trabalho real, prática em pacientes/manequins/equipamentos, habilidade psicomotora, competência prática, nível de supervisão, autonomia, certificação formal, integrações externas, decisões disciplinares, cópia/distribuição das obras e ranking público. Processamento automatizado dos PDFs fica fora do MVP e será decidido em D-033.

### FUTURE

- Trilhas por função, nível avançado, certificação interna, reciclagem programada, integrações e notificações. Qualquer treinamento ou evidência prática: `FUTURE — BLOQUEADO POR GATE-EXP-PRAT-01`.

Detalhes em [0011 — Escopo](0011_escopo_fase.md).

## 6. Regras de negócio essenciais

| Tema | Regra | Status |
|---|---|---|
| Diagnóstico | obrigatório, formativo, não punitivo, define linha de base | FATO INFORMADO |
| Trilha | personalizada, mas núcleo obrigatório não dispensável; dispensa não aplicada no piloto | FATO INFORMADO |
| Limiares | 70% geral / 80% críticos | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| Composição | quiz 0% + caso 30% + prova 70% | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| Tentativas | 2 + remediação obrigatória; intervalo mínimo 7 dias; itens diferentes na 2ª | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| Retenção | itens equivalentes; não revoga conclusão; nunca substitui limiar absoluto | APROVADA PELO PATROCINADOR COMO INSUMO (2026-08-05) |
| Fontes | D-075: consulta manual interna, PDFs fora da plataforma/Git e referência simples por módulo | APROVADA PELO PATROCINADOR COMO INSUMO; B-04 FECHADO PARA O MVP INTERNO |
| Conteúdo | rascunhos originais podem ser preparados; publicação exige aprovação clínica de Ricardo e os gates gerais | RASCUNHO/INSUMO — D-083 |
| Notas | alteração versionada, justificada e auditada; contestação em 7 dias úteis | FATO INFORMADO |
| Dados | somente nome/login profissional, progresso, tentativas, notas e logs mínimos; RH, prontuários, dados de tutores, gravações e casos reais identificáveis proibidos; retenção durante o vínculo + 2 anos | APROVADA PELO PATROCINADOR COMO INSUMO (D-077; B-05 FECHADO) |
| Modalidade | primeira versão integralmente digital; simulações medem apenas conhecimento/raciocínio; prática presencial e autonomia bloqueadas pelo `GATE-EXP-PRAT-01` | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| Erro crítico | reforço curto e novo caso equivalente; libera após decisão segura; sem eliminação, punição, ranking ou reprovação definitiva | APROVADA PELO PATROCINADOR (D-082, 2026-08-06) |
| Registro/passagem | campos estruturados e correção automática por rubrica; revisão humana por exceção ou se o piloto revelar falhas repetidas | APROVADA PELO PATROCINADOR (D-070, 2026-08-06) |
| Item avaliável | pergunta/caso sem correção definida e testada não pode ser publicado; deve ser redesenhado ou enviado previamente para correção humana | FATO INFORMADO; D-070 (2026-08-06) |

Detalhes em [0012 — Regras de negócio](0012_regras_de_negocio.md).

## 7. Requisitos funcionais (resumo)

P0 do colaborador: aceitar convite, entrar, administrar a própria conta, fazer o diagnóstico fracionado, ver a trilha, concluir unidades e módulos, resolver questões/casos com feedback imediato, revisar lacunas, acompanhar o progresso e relatar problema ou melhoria. Administradores e moderadores operam dashboards e filas conforme o papel; controles de publicação, permissão e auditoria ficam nos bastidores.
Detalhes em [0013 — Requisitos funcionais](0013_requisitos_funcionais.md).

O conteúdo, a sequência, a carga e as sessões da trilha vigente estão no [0017 — Programa curricular de 24 meses](0017_programa_curricular_24_meses.md). O [0016](0016_programa_curricular_clinico.md) preserva a proposta V2 como histórico.

## 8. Requisitos não funcionais (resumo)

Performance para uso assíncrono em escala 12×36; confiabilidade sem perda de respostas; referência simples das fontes por módulo; identidade gerenciada; autorização no servidor e mínimo privilégio; observabilidade sem conteúdo sensível; backups com restauração testada; governança editorial; WCAG 2.2 AA proposta; exceções (afastamento, interrupção, anulação, retirada, reprovação recorrente).
Detalhes em [0014 — Requisitos não funcionais](0014_requisitos_nao_funcionais_produto.md).

## 9. Métricas de sucesso

KPIs primários (PROPOSTA): ativação ≥ 90%/14 dias; conclusão ≥ 80%; abandono ≤ 15%; ganho mediano ≥ 15 p.p.; recuperação ≥ 75%; conteúdo válido 100%; itens rastreáveis 100%. O dashboard inicial usa um recorte simples de progresso, fila de correções, remediação, conteúdo, feedback e confiabilidade; metas restantes serão calibradas pela baseline (B-07).
Detalhes em [0015 — Métricas de sucesso](0015_metricas_de_sucesso.md).

## 10. Riscos e hipóteses

Riscos críticos: conteúdo incorreto/desatualizado, dependência de um único aprovador clínico, confusão entre teoria e autonomia clínica, cópia ou distribuição indevida dos PDFs, violação da política mínima de dados, IA sem revisão e alteração não auditada de notas. Riscos altos: tempo protegido, adesão, escopo, fila de correção dissertativa, métricas punitivas, banco frágil e conteúdo sem manutenção.
Regra de severidade e mitigação em [0007 — Riscos e hipóteses](../00.DISCOVERY/0007_riscos_e_hipoteses.md).

## 11. Fontes de conhecimento

As identificações abaixo pertencem à governança interna e não serão exibidas ao aluno. Na experiência educacional, a apresentação será `Conteúdo técnico CVG`, com versão, data de corte e estado de revisão.

- **Tratado brasileiro** (TMI-CG-2015, 1ª ed., Roca, 2 vol., 23 partes, 264 capítulos): base curricular em português;
- **Ettinger** (ETT-2024, 9ª ed., Elsevier, 2 vol., 22 seções, 331 capítulos): referência atualizada;
- **Fossum** (FOS-2014, 4ª ed., Elsevier, 4 partes, 44 capítulos): referência cirúrgica (F-03);
- Hierarquia e regras de divergência no [Anexo 0001](../90.ANEXOS/0001_governanca_fonte_conhecimento.md).

## 12. Fronteira dos gates

B-01 a B-06 estão fechados. A reexecução técnica de Discovery e PRD foi concluída segundo as engines canônicas. Por D-101 proposta, B-07 fornece insumos à SPEC e continua obrigatório antes da baseline/piloto completo, sem bloquear a especificação. A única pendência para iniciar a readiness da SPEC é a aprovação humana do commit consolidado.
Detalhes em [0090 — Discovery Validation](../00.DISCOVERY/0090_discovery_validation.md).

## 13. Decisões humanas e pacote para aprovação do gate PRD

Os itens confirmados pelo patrocinador formam a baseline do PRD. D-101 a D-108, descritas no Anexo 0021, completam a fronteira de gate, semântica, criticidade, exceções, diagnóstico, equivalência, recuperação e protocolos; aguardam aprovação no checkpoint final.

1. Limiares, pesos e tentativas — ✅ **CONFIRMADOS PELO PATROCINADOR COMO INSUMOS em 2026-08-05** (anexo 0008);
2. Escopo do piloto: núcleo + emergência/internação — ✅ **CONFIRMADO PELO PATROCINADOR COMO INSUMO em 2026-08-05**;
3. Governança (B-03) — ✅ **FECHADO PARA O MVP INTERNO POR D-076/D-083 — Ricardo concentra as responsabilidades e é o único aprovador clínico obrigatório**;
4. Política de dados (B-05) — ✅ **POLÍTICA MÍNIMA INTERNA APROVADA POR D-077; B-05 FECHADO** (RN-063 a RN-067 e Anexo 0011);
5. Política de certificação (D-049) — ✅ **CONFIRMADA COMO INSUMO: status de conclusão no piloto**;
6. Tratamento de reprovação recorrente (D-047) — ✅ **CONFIRMADO COMO INSUMO: plano individual com mentor, sem punição**;
7. Público (B-02) — ✅ **FECHADO POR D-079: aproximadamente 10 veterinários, todos participam**; baseline B-07 continua pendente.
8. Fontes (B-04) — ✅ **FECHADO PARA O MVP INTERNO POR D-075**; D-033 permanece futura e não bloqueante.
9. Modalidade da primeira versão (D-068) — ✅ **CONFIRMADA COMO INSUMO: integralmente digital, com simulações digitais e sem prática presencial associada à plataforma; expansão prática bloqueada pelo `GATE-EXP-PRAT-01`**.
10. Programa curricular V3 — ✅ **DIREÇÃO APROVADA EM D-084/D-085; 24 MESES, DUAS PARTES, 24 MÓDULOS E 96 SESSÕES NO PRD 0017**.
11. Remediação de erro crítico — ✅ **EDUCATIVA E NÃO PUNITIVA, APROVADA EM D-082**.
12. Ordem de produção — ✅ **PILOTO INTEGRADO PRIMEIRO; EXPANSÃO EM ONDAS, APROVADA EM D-062**.
13. Correção de registro/passagem — ✅ **ESTRUTURADA E AUTOMÁTICA NO INÍCIO, COM ESCALONAMENTO HUMANO POR EVIDÊNCIA, APROVADA EM D-070**.
14. Superfícies de conta e acompanhamento — ✅ **DIREÇÃO CONFIRMADA EM D-090**: login, conta, dashboards, evolução, feedback e KPIs simples.
15. Pacote pré-SPEC — ✅ **D-091 A D-100 APROVADAS INTEGRALMENTE EM 2026-08-06**: autenticação, papéis, dashboards, feedback, KPIs, arquitetura, fronteira de RAG, observabilidade, acessibilidade e agente operacional de IA, detalhados no [Anexo 0020](../90.ANEXOS/0020_alinhamento_produto_pre_spec.md).
16. Pacote de fechamento — ⏳ **D-101 A D-108 AGUARDAM APROVAÇÃO HUMANA DO COMMIT**; ver [Anexo 0021](../90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md).

## 14. Documentos do PRD

| ID | Documento |
|---|---|
| 0010 | [Casos de uso](0010_casos_de_uso.md) |
| 0011 | [Escopo da fase](0011_escopo_fase.md) |
| 0012 | [Regras de negócio](0012_regras_de_negocio.md) |
| 0013 | [Requisitos funcionais](0013_requisitos_funcionais.md) |
| 0014 | [Requisitos não funcionais](0014_requisitos_nao_funcionais_produto.md) |
| 0015 | [Métricas de sucesso](0015_metricas_de_sucesso.md) |
| 0016 | [Programa curricular clínico](0016_programa_curricular_clinico.md) |
| 0017 | [Programa curricular de 24 meses](0017_programa_curricular_24_meses.md) |
| 0020 | Este documento |
| 0090 | [Validação (gate)](0090_prd_validation.md) |

Documentos transversais: [Anexo 0020 — Produto e arquitetura antes da SPEC](../90.ANEXOS/0020_alinhamento_produto_pre_spec.md) e [Anexo 0021 — Fechamento dos gates](../90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md).

## 15. Não feito nesta fase

- Nenhuma SPEC, BUILD, código, teste, tela, questão ou aula clínica completa; a trilha V3 está definida no PRD 0017;
- Nenhuma implementação ou escolha de fornecedor; o Anexo 0020 registra arquitetura e roteamento de IA aprovados em D-091 a D-100;
- Nenhum conteúdo derivado das obras;
- Nenhuma integração.
