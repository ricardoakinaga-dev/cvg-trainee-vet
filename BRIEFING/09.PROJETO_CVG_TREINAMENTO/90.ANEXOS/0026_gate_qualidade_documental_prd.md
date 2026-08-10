# Anexo 0026 — Gate de Qualidade Documental do PRD

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data:** 2026-08-09  
**Escopo auditado:** `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD` + decisões e anexos de suporte  
**Resultado:** `97% — APTO PARA DERIVAÇÃO DA SPEC`  
**Regra:** o percentual é um proxy técnico de completude/coerência; não substitui a aprovação clínica nem mede satisfação subjetiva do patrocinador.

## 1. Método

Foram lidos integralmente os dez documentos canônicos do PRD (`0010`–`0017`, `0020` e `0090`) e confrontados com os Anexos 0001, 0010–0012, 0020–0025 e as decisões D-062, D-068, D-075, D-077, D-082–D-109.

O gate considera dez dimensões, ponderadas pelo risco de um erro chegar à arquitetura ou ao usuário. Um item só é considerado coberto quando existe regra explícita, classificação/status e vínculo com fluxo, decisão ou documento de suporte.

## 2. Matriz de cobertura

| Dimensão | Peso | Resultado | Evidência | Situação |
|---|---:|---:|---|---|
| problema, usuários, jornada e casos de uso | 15 | 15 | PRD 0010, 0020; Discovery 0004/0006/0009 | coberto |
| escopo, fora de escopo, futuro e modalidade | 15 | 15 | PRD 0011, 0017, 0020; D-068 | coberto |
| conta, login, área do participante, dashboards e evolução | 15 | 15 | PRD 0010, 0013, 0014; D-090–D-093 | coberto |
| avaliações, quiz, casos, dissertativas, remediação e retenção | 10 | 10 | PRD 0010, 0012, 0013, 0016/0017; D-070, D-082, D-085 | coberto |
| currículo de 24 meses e primeira onda | 10 | 9 | PRD 0017; Anexos 0022, 0025; D-062, D-084–D-088 | matriz pronta; autoria em escala ainda condicionada |
| regras, estados, exceções e correção auditável | 10 | 10 | PRD 0012/0013/0014; D-102–D-108 | coberto |
| privacidade, segurança, papéis e dados mínimos | 15 | 15 | PRD 0010, 0013, 0014; Anexo 0011; D-077, D-091–D-094 | coberto |
| fronteira autoral e exposição de fontes | 10 | 10 | PRD 0011–0014, 0017, 0020; Anexos 0022–0025; D-109 | coberto; somente workflow interno |
| métricas, riscos, gates e dependências | 5 | 4 | PRD 0015, 0020, 0090; Anexos 0010/0021 | metas são operacionais e B-07 é melhoria de diagnóstico, não gate técnico |
| handoff para engenharia e links/coerência | 5 | 4 | PRD 0020/0090; SPEC 0100 | pronto para SPEC; detalhes pertencem a 0101–0117 |
| **Total** | **100** | **97** |  | **APTO** |

## 3. Verificações executadas

- [x] documentos canônicos do PRD presentes e numerados;
- [x] links relativos do PRD apontam para documentos existentes;
- [x] `git diff --check` sem erro;
- [x] jornada do participante não exige pesquisar, citar ou indicar bibliografia;
- [x] a projeção do participante exclui fonte, autor, obra, capítulo, página, PDF, OCR, trecho, foto, figura, tabela, imagem, link e metadados reconstrutivos;
- [x] dados reais, prontuários, tutores, gravações, anexos e casos identificáveis permanecem proibidos;
- [x] login, conta, progresso, dashboards, avaliações, respostas abertas, feedback, remediação e retenção possuem requisitos;
- [x] a aprovação clínica, versionamento, retirada e auditoria estão definidos;
- [x] a sequência curricular da primeira onda está alinhada entre D-062, PRD 0016 e Anexo 0025;
- [x] as diferenças entre V2 e V3 estão identificadas, com V3 vigente no PRD 0017;
- [x] nenhum PDF ou derivado bibliográfico foi adicionado ao Git.

## 4. Resíduos que seguem para SPEC/BUILD

Os itens abaixo não são lacunas de produto que bloqueiem 0101, mas não podem ser tratados como resolvidos automaticamente:

1. aprovação, produção, pré-voo e aplicação do B-07 continuam como melhoria de diagnóstico, sem bloquear construção ou treinamento interno;
2. protocolos clínicos necessários serão redigidos internamente a partir da literatura e revisados por Ricardo;
3. metas podem ser observadas e ajustadas operacionalmente, mas não existe etapa obrigatória de calibração para iniciar ou operar o núcleo;
4. resolução do requisito de proteção do banco e segregação de gabaritos;
5. execução do T2 da M02, sem publicação geral ou escala;
6. decisões de implementação que não podem ampliar escopo, dados ou autonomia clínica.

## 5. Decisão do gate

```text
PRD: APTO PARA DERIVAÇÃO DA SPEC (97%)
PRD: NÃO É 100% DE EXECUÇÃO — detalhes de engenharia seguem para a SPEC
AUTORIA/FONTES: somente construção, revisão e auditoria internas
PARTICIPANTE: somente conteúdo autoral CVG, casos fictícios e estados educacionais
PRÓXIMA ETAPA: concluir 0101–0117, 0120 e 0190
BUILD EXECUTÁVEL: proibido até SPEC satisfatória, documentação 04–08 completa e gate final
```

Este gate registra a passagem documental para a SPEC. Não autoriza publicação clínica geral, aplicação de participantes ou código antes dos gates definidos; não cria dependência de fornecedor, consulta externa ou calibração.
