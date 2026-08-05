# 0020 — PRD Master

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Organização:** Centro Veterinário Guarapiranga — CVG  
**Fase:** PRD — consolidação  
**Data:** 2026-08-05  
**Status:** consolidado; aguardando gate humano `0090_prd_validation.md`  
**Base:** Discovery aprovado com condições (2026-08-05)

---

## 1. Visão geral

O Sistema CVG de Treinamento Veterinário é uma plataforma de **formação teórica contínua** para médicos-veterinários do CVG, com progressão básico → intermediário → avançado, avaliação diagnóstica inicial obrigatória, trilha personalizada, quizzes, casos clínicos, provas, remediação, avaliação de retenção e métricas individuais e gerenciais, com conteúdo rastreável e revisado por humanos.

O produto **não** avalia competência prática, não confere autonomia clínica, não é instrumento disciplinar e não substitui protocolos internos.

## 2. Problema

O CVG precisa garantir desenvolvimento teórico progressivo e mensurável dos veterinários. Não há processo institucional validado conectando diagnóstico inicial → linha de base → trilha → aprendizagem → avaliação → remediação → retenção → progressão → acompanhamento. Dimensões de medição: ativação, progresso, conclusão, domínio, ganho, retenção, recuperação, atraso, abandono, qualidade dos itens e governança do conteúdo.

Ver [0009 — Discovery Master](../00.DISCOVERY/0009_discovery_master.md).

## 3. Usuários

- **Primário:** médico-veterinário colaborador;
- **Secundários:** mentor/preceptor, autor/instrutor, revisor clínico, revisor pedagógico, gestor educacional, gestor clínico, gestão de pessoas (restrito);
- **Operadores:** administrador, auditor/compliance;
- **Decisores:** patrocinador (nomeado: MV. Ricardo Akinaga — CEO); PO, coordenação clínica/RT, coordenação educacional, LGPD/segurança — **PENDENTE (B-03)**.

## 4. Fluxos principais

### 4.1 Jornada do colaborador

```text
diagnóstico inicial obrigatório
→ linha de base por competência
→ trilha personalizada (núcleo obrigatório + reforços)
→ unidade de conteúdo
→ quiz formativo (feedback)
→ caso clínico
→ prova somativa
→ aprovação? → retenção (30/60/90 dias) → progressão
→ reprovação? → remediação → nova tentativa
```

### 4.2 Governança editorial

```text
seleção do tema
→ blueprint
→ pesquisa nas fontes
→ autoria
→ revisão clínica
→ revisão pedagógica
→ checagem de direitos (B-04)
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

- Diagnóstico, trilha, conteúdo revisado, quizzes, casos, prova, remediação, retenção, painéis, banco de questões, governança editorial, contestações, auditoria, papéis e permissões;
- Núcleo comum obrigatório + áreas **Emergência e Internação** (APROVADO no gate 2026-08-05);
- Coorte: 10–15 veterinários (3 turnos); duração: 12 semanas; tempo protegido: 3 h/mês (APROVADOS no gate).

### OUT

- Competência prática, autonomia, certificação formal, integrações externas, decisões disciplinares, reprodução das obras, ranking público, IA sem revisão humana.

### FUTURE

- Trilhas por função, nível avançado, evidência prática em dimensão separada, certificação interna, reciclagem programada, integrações, notificações.

Detalhes em [0011 — Escopo](0011_escopo_fase.md).

## 6. Regras de negócio essenciais

| Tema | Regra | Status |
|---|---|---|
| Diagnóstico | obrigatório, formativo, não punitivo, define linha de base | FATO INFORMADO |
| Trilha | personalizada, mas núcleo obrigatório não dispensável; dispensa não aplicada no piloto | FATO INFORMADO |
| Limiares | 70% geral / 80% críticos | APROVADA (gate 2026-08-05) |
| Composição | quiz 0% + caso 30% + prova 70% | APROVADA (gate 2026-08-05) |
| Tentativas | 2 + remediação obrigatória; intervalo mínimo 7 dias; itens diferentes na 2ª | APROVADA (gate 2026-08-05) |
| Retenção | itens equivalentes; não revoga conclusão; nunca substitui limiar absoluto | APROVADA (gate 2026-08-05) |
| Fontes | legislação > protocolo CVG > diretriz > Ettinger 2024 > Fossum 2014 (cirurgia) > Tratado 2015; divergência = decisão humana documentada | APROVADA (gate 2026-08-05) |
| Conteúdo | só publica após revisão humana; autor não publica o próprio; rastreabilidade completa; sínteses autorais curtas com citação, sem PDFs (B-04 em verificação) | FATO INFORMADO + APROVADA |
| Notas | alteração versionada, justificada e auditada; contestação em 7 dias úteis | FATO INFORMADO |
| Dados | mínimo necessário; sem ranking; RH proibido no piloto; retenção vínculo + 2 anos; dashboards mensais | APROVADA (gate 2026-08-05) |

Detalhes em [0012 — Regras de negócio](0012_regras_de_negocio.md).

## 7. Requisitos funcionais (resumo)

P0: autenticação, diagnóstico, trilha, conteúdo com governança, quizzes, casos, prova, remediação, retenção, contestações, painéis, auditoria, banco de questões, permissões.  
Detalhes em [0013 — Requisitos funcionais](0013_requisitos_funcionais.md).

## 8. Requisitos não funcionais (resumo)

Performance para uso assíncrono em escala 12×36; confiabilidade sem perda de respostas; rastreabilidade completa; segurança por papéis + LGPD; governança editorial; acessibilidade (PENDENTE); exceções (afastamento, interrupção, anulação, retirada, reprovação recorrente).  
Detalhes em [0014 — Requisitos não funcionais](0014_requisitos_nao_funcionais_produto.md).

## 9. Métricas de sucesso

KPIs primários (PROPOSTA): ativação ≥ 90%/14 dias; conclusão ≥ 80%; abandono ≤ 15%; ganho mediano ≥ 15 p.p.; recuperação ≥ 75%; conteúdo válido 100%; itens rastreáveis 100%. Metas restantes calibradas por baseline (B-07).  
Detalhes em [0015 — Métricas de sucesso](0015_metricas_de_sucesso.md).

## 10. Riscos e hipóteses

Riscos críticos: conteúdo incorreto/desatualizado, confusão entre teoria e autonomia clínica, direitos autorais (B-04), uso inadequado de dados (B-05), IA sem revisão, alteração não auditada de notas. Riscos altos: tempo protegido, adesão, escopo, revisores, métricas punitivas, banco frágil, conteúdo sem manutenção.  
Regra de severidade e mitigação em [0007 — Riscos e hipóteses](../00.DISCOVERY/0007_riscos_e_hipoteses.md).

## 11. Fontes de conhecimento

- **Tratado brasileiro** (TMI-CG-2015, 1ª ed., Roca, 2 vol., 23 partes, 264 capítulos): base curricular em português;
- **Ettinger** (ETT-2024, 9ª ed., Elsevier, 2 vol., 22 seções, 331 capítulos): referência atualizada;
- **Fossum** (FOS-2014, 4ª ed., Elsevier, 4 partes, 44 capítulos): referência cirúrgica (F-03);
- Hierarquia e regras de divergência no [Anexo 0001](../90.ANEXOS/0001_governanca_fonte_conhecimento.md).

## 12. Condições do gate Discovery (compromissos)

B-01 entrevistas/fluxo → B-02 coorte/público → B-03 responsáveis → B-04 licenças (bloqueia conteúdo) → B-05 política de dados → B-06 áreas piloto → B-07 baseline.  
Detalhes em [0090 — Discovery Validation](../00.DISCOVERY/0090_discovery_validation.md).

## 13. Decisões humanas necessárias no gate PRD

1. Aprovação dos limiares, pesos e tentativas — ✅ **APROVADAS em 2026-08-05** (anexo 0008);
2. Escopo do piloto: núcleo + emergência/internação — ✅ **APROVADO em 2026-08-05**;
3. Nomeação de responsáveis (B-03) — ⏳ **PENDENTE — definir na reunião de gate**;
4. Política de dados (B-05) — ✅ **APROVADA em 2026-08-05** (RN-063 a RN-067);
5. Política de certificação (D-049) — ✅ **APROVADA: status de conclusão no piloto**;
6. Tratamento de reprovação recorrente (D-047) — ✅ **APROVADO: plano individual com mentor, sem punição**;
7. Calendário de baseline e coorte (B-02/B-07) — ⏳ **PENDENTE — inventário de usuários e aplicação do diagnóstico**. 
8. Verificação jurídica formal das licenças (B-04) — ⏳ **em andamento** (regra de uso aprovada em RN-046).

## 14. Documentos do PRD

| ID | Documento |
|---|---|
| 0010 | [Casos de uso](0010_casos_de_uso.md) |
| 0011 | [Escopo da fase](0011_escopo_fase.md) |
| 0012 | [Regras de negócio](0012_regras_de_negocio.md) |
| 0013 | [Requisitos funcionais](0013_requisitos_funcionais.md) |
| 0014 | [Requisitos não funcionais](0014_requisitos_nao_funcionais_produto.md) |
| 0015 | [Métricas de sucesso](0015_metricas_de_sucesso.md) |
| 0020 | Este documento |
| 0090 | [Validação (gate)](0090_prd_validation.md) |

## 15. Não feito nesta fase

- Nenhuma SPEC, BUILD, código, teste, tela, questão real, aula ou conteúdo clínico;
- Nenhuma decisão técnica (arquitetura, banco, API, framework);
- Nenhum conteúdo derivado das obras;
- Nenhuma integração.
