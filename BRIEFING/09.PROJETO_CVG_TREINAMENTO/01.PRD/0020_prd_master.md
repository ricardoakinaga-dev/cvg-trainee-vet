# 0020 — PRD Master

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Organização:** Centro Veterinário Guarapiranga — CVG  
**Fase:** PRD — consolidação  
**Data:** 2026-08-05  
**Status:** rascunho consolidado em correção; gate PRD reprovado
**Base:** Discovery `REPROVADO — EM CORREÇÃO` (2026-08-05)

---

## 1. Visão geral

O Sistema CVG de Treinamento Veterinário é uma plataforma de **treinamento clínico integralmente digital** para aproximadamente 10 médicos-veterinários do CVG. A experiência principal combina diagnóstico amplo fracionado, trilha recomendada, unidades técnicas curtas dentro de módulos completos, casos/simulações digitais, recuperação ativa, feedback imediato, remediação e progresso visível. O conteúdo é original do CVG e revisado por humanos.

O produto **não** oferece treinamento prático presencial associado à plataforma, não avalia habilidade psicomotora ou competência prática, não confere autonomia clínica, não é instrumento disciplinar e não substitui protocolos internos. Resultados de casos ou simulações digitais representam apenas conhecimento e raciocínio em cenário simulado (D-068).

## 2. Problema

Hoje o aprendizado é informal e depende da disponibilidade dos profissionais. O produto deve dar ao colaborador um próximo passo claro, permitir prática digital com feedback e mostrar a evolução sem transformar o treinamento em burocracia.

Ver [0009 — Discovery Master](../00.DISCOVERY/0009_discovery_master.md).

## 3. Usuários

- **Primário:** médico-veterinário colaborador;
- **Responsável pelo MVP:** MV. Ricardo Akinaga administra o programa, produz/aprova conteúdos e responde pelos gates documentais;
- **Revisor:** outro médico-veterinário faz a segunda conferência de cada módulo clínico antes da publicação;
- **Apoio opcional:** mentor ou suporte técnico, somente quando Ricardo autorizar;

## 4. Fluxos principais

### 4.1 Jornada do colaborador

```text
entrar
→ fazer um diagnóstico de 120 itens em três sessões, sem aprovação ou reprovação
→ receber uma trilha recomendada
→ estudar unidades de 10–15 minutos dentro de módulos de 4–6 horas
→ praticar com questões e casos/simulações digitais contrastantes
→ receber feedback imediato
→ acompanhar o progresso e revisar apenas o necessário
```

### 4.2 Governança editorial

```text
seleção do tema
→ blueprint
→ pesquisa nas fontes
→ autoria
→ segunda conferência por outro MV
→ revisão pedagógica opcional
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
- Bastidores mínimos: login, publicação com segunda conferência veterinária, controle de acesso e registro de alterações sensíveis;
- Núcleo comum obrigatório + áreas **Emergência e Internação** (APROVADO PELO PATROCINADOR COMO INSUMO em 2026-08-05);
- Público/coorte: aproximadamente 10 veterinários, com participação de toda a equipe (D-079; B-02 fechado);
- Matriz curricular V2: ciclo completo de 34 semanas e faixa de planejamento de 90–115 horas; piloto aprovado de 14 semanas com cinco módulos/partes curriculares, caso integrador e 30–40 horas (D-081).

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
| Conteúdo | rascunhos originais podem ser preparados; publicação do programa depende dos gates gerais, não de B-04 | RASCUNHO/INSUMO |
| Notas | alteração versionada, justificada e auditada; contestação em 7 dias úteis | FATO INFORMADO |
| Dados | somente nome/login profissional, progresso, tentativas, notas e logs mínimos; RH, prontuários, dados de tutores, gravações e casos reais identificáveis proibidos; retenção durante o vínculo + 2 anos | APROVADA PELO PATROCINADOR COMO INSUMO (D-077; B-05 FECHADO) |
| Modalidade | primeira versão integralmente digital; simulações medem apenas conhecimento/raciocínio; prática presencial e autonomia bloqueadas pelo `GATE-EXP-PRAT-01` | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |

Detalhes em [0012 — Regras de negócio](0012_regras_de_negocio.md).

## 7. Requisitos funcionais (resumo)

P0 do colaborador: entrar, fazer o diagnóstico fracionado, ver a trilha, concluir unidades e módulos, resolver questões/casos com feedback imediato, revisar lacunas e acompanhar o progresso. Controles de publicação, permissão e registro ficam nos bastidores.
Detalhes em [0013 — Requisitos funcionais](0013_requisitos_funcionais.md).

O conteúdo, a sequência, a carga, os casos e o blueprint de avaliação estão no [0016 — Programa curricular clínico](0016_programa_curricular_clinico.md).

## 8. Requisitos não funcionais (resumo)

Performance para uso assíncrono em escala 12×36; confiabilidade sem perda de respostas; referência simples das fontes por módulo; segurança por papéis + LGPD; governança editorial; acessibilidade (PENDENTE); exceções (afastamento, interrupção, anulação, retirada, reprovação recorrente).
Detalhes em [0014 — Requisitos não funcionais](0014_requisitos_nao_funcionais_produto.md).

## 9. Métricas de sucesso

KPIs primários (PROPOSTA): ativação ≥ 90%/14 dias; conclusão ≥ 80%; abandono ≤ 15%; ganho mediano ≥ 15 p.p.; recuperação ≥ 75%; conteúdo válido 100%; itens rastreáveis 100%. Metas restantes calibradas por baseline (B-07).  
Detalhes em [0015 — Métricas de sucesso](0015_metricas_de_sucesso.md).

## 10. Riscos e hipóteses

Riscos críticos: conteúdo incorreto/desatualizado, confusão entre teoria e autonomia clínica, cópia ou distribuição indevida dos PDFs, violação da política mínima de dados, IA sem revisão e alteração não auditada de notas. Riscos altos: tempo protegido, adesão, escopo, revisores, métricas punitivas, banco frágil e conteúdo sem manutenção.
Regra de severidade e mitigação em [0007 — Riscos e hipóteses](../00.DISCOVERY/0007_riscos_e_hipoteses.md).

## 11. Fontes de conhecimento

As identificações abaixo pertencem à governança interna e não serão exibidas ao aluno. Na experiência educacional, a apresentação será `Conteúdo técnico CVG`, com versão, data de corte e estado de revisão.

- **Tratado brasileiro** (TMI-CG-2015, 1ª ed., Roca, 2 vol., 23 partes, 264 capítulos): base curricular em português;
- **Ettinger** (ETT-2024, 9ª ed., Elsevier, 2 vol., 22 seções, 331 capítulos): referência atualizada;
- **Fossum** (FOS-2014, 4ª ed., Elsevier, 4 partes, 44 capítulos): referência cirúrgica (F-03);
- Hierarquia e regras de divergência no [Anexo 0001](../90.ANEXOS/0001_governanca_fonte_conhecimento.md).

## 12. Bloqueios obrigatórios dos gates

B-01, B-02, B-03, B-04 e B-05 estão fechados por D-078, D-079, D-076, D-075 e D-077. A baseline pode usar somente os dados permitidos pela política mínima. Depois do fechamento dos demais bloqueios, Discovery e PRD devem ser reexecutados.
Detalhes em [0090 — Discovery Validation](../00.DISCOVERY/0090_discovery_validation.md).

## 13. Decisões humanas e insumos para nova submissão do gate PRD

Os itens confirmados pelo patrocinador são insumos do rascunho; não aprovam o gate enquanto existirem campos obrigatórios incompletos.

1. Limiares, pesos e tentativas — ✅ **CONFIRMADOS PELO PATROCINADOR COMO INSUMOS em 2026-08-05** (anexo 0008);
2. Escopo do piloto: núcleo + emergência/internação — ✅ **CONFIRMADO PELO PATROCINADOR COMO INSUMO em 2026-08-05**;
3. Governança (B-03) — ✅ **FECHADO PARA O MVP INTERNO POR D-076 — Ricardo concentra as responsabilidades; segundo MV por módulo antes da publicação**;
4. Política de dados (B-05) — ✅ **POLÍTICA MÍNIMA INTERNA APROVADA POR D-077; B-05 FECHADO** (RN-063 a RN-067 e Anexo 0011);
5. Política de certificação (D-049) — ✅ **CONFIRMADA COMO INSUMO: status de conclusão no piloto**;
6. Tratamento de reprovação recorrente (D-047) — ✅ **CONFIRMADO COMO INSUMO: plano individual com mentor, sem punição**;
7. Público (B-02) — ✅ **FECHADO POR D-079: aproximadamente 10 veterinários, todos participam**; baseline B-07 continua pendente.
8. Fontes (B-04) — ✅ **FECHADO PARA O MVP INTERNO POR D-075**; D-033 permanece futura e não bloqueante.
9. Modalidade da primeira versão (D-068) — ✅ **CONFIRMADA COMO INSUMO: integralmente digital, com simulações digitais e sem prática presencial associada à plataforma; expansão prática bloqueada pelo `GATE-EXP-PRAT-01`**.
10. Programa curricular V2 — ✅ **DESENHADO NO PRD 0016; CARGA/CADÊNCIA APROVADA EM D-081**.

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
| 0020 | Este documento |
| 0090 | [Validação (gate)](0090_prd_validation.md) |

## 15. Não feito nesta fase

- Nenhuma SPEC, BUILD, código, teste, tela, questão ou aula clínica completa; a matriz curricular e os blueprints estão definidos no PRD 0016;
- Nenhuma decisão técnica (arquitetura, banco, API, framework);
- Nenhum conteúdo derivado das obras;
- Nenhuma integração.
