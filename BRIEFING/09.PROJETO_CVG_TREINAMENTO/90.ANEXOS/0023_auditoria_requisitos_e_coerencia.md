# Anexo 0023 — Auditoria de Requisitos, Coerência e Prontidão para Construção

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data:** 2026-08-09
**Status:** `AUDITORIA_DOCUMENTAL_CONCLUIDA; BUILD_NAO_AUTORIZADO`
**Escopo:** briefing completo materializado em `BRIEFING/09.PROJETO_CVG_TREINAMENTO`, matriz literária, currículo V3, fatia vertical M02 e gates da SPEC

## 1. Resultado executivo

Os requisitos explícitos do programa — acesso individual, conta, área do participante, dashboards, trilha de evolução, avaliações mistas e métodos modernos de aprendizagem — estão representados no Discovery, PRD e anexos canônicos. A literatura foi processada e convertida em matriz de autoria, sem transformar os PDFs em conteúdo publicável.

A auditoria encontrou e corrigiu uma contradição importante: o RF-097 antigo permitia consulta às fontes pelo participante e exigia que ele informasse a fonte utilizada. Isso foi substituído por estudo guiado em material autoral autorizado do CVG, sem citação bibliográfica. A regra D-109 agora prevalece sobre formulações anteriores de D-075.

Nenhuma arquitetura implementável, código, banco, API ou tela foi criada. A Fase 1 da SPEC continua condicionada à autorização humana sobre o checkpoint 0100.

## 2. Matriz de cobertura do objetivo

| Necessidade do programa | Evidência canônica | Situação atual |
|---|---|---|
| Login, senha, convite e conta individual | PRD 0013, RF-001 a RF-009; PRD 0014, RNF-037; UC-021 | Documentado; escolha técnica detalhada fica na SPEC 0101/0112 |
| Área do participante | PRD 0013, RF-008, RF-028, RF-070 e RF-071; métricas 0015 §3.1 | Documentado; estados de tela ainda serão derivados na SPEC |
| Dashboard de participante, moderador e administrador | PRD 0013, RF-070 a RF-076; métricas 0015 §§3.1–3.2; alinhamento 0020 | Documentado com escopos e ausência de ranking |
| Trilha de evolução | PRD 0013, RF-020 a RF-028; currículo 0017; regras D-102/D-105 | Documentado: 24 meses, 24 módulos, 96 sessões e dimensões separadas |
| Quiz e múltipla escolha | PRD 0013, RF-040, RF-041 e RF-099; Anexos 0014–0016 | Documentado; banco e scoring detalhados antes do BUILD |
| Questões dissertativas e respostas abertas | PRD 0013, RF-058 e RF-098; Anexos 0015–0019 | Documentado com rubrica, correção humana e SLA |
| Casos e simulações digitais | PRD 0013, RF-042, RF-052 a RF-059; currículo 0017 | Documentado; não mede prática, autonomia ou habilidade psicomotora |
| Métodos modernos de ensino | Anexo 0013; currículo 0017; métricas 0015 | Documentado: recuperação ativa, espaçamento, feedback, remediação, casos progressivos, retenção e reflexão |
| Uso técnico da literatura | Anexos 0001 e 0022; PRD 0017 e 0020 | Documentado: consulta interna, matriz curricular e atualização por diretrizes/protocolos |
| Proteção autoral e fronteira de exposição | D-109; RNF-022/RNF-085; Anexo 0001; participante 0015 | Documentado e verificado: nenhum identificador ou ativo da obra na experiência do participante |
| Privacidade e segurança operacional | Anexo 0011; D-077; RF-106; RNF-032, RNF-037 e RNF-063 | Documentado; implementação e testes dependem da SPEC/0190 |
| Governança antes da construção | 0100, Anexo 0021, backlog e runtime | Readiness técnica concluída; autorização para 0101 ainda pendente |

## 3. Correções realizadas nesta auditoria

1. RF-097 deixou de exigir consulta e indicação de fontes pelo participante.
2. A jornada de UC-001 e do material M02 passou a usar estudo guiado em conteúdo autoral do CVG.
3. O currículo V3 e os critérios de aceite M02 foram alinhados ao mesmo vocabulário.
4. README, PRD Master e governança de fontes deixaram de tratar a rastreabilidade como “referência simples” e passaram a exigir workflow interno completo.
5. Versão de fonte, data de corte, revisão, obra, capítulo, página, PDF, foto, tabela, figura, trecho, link e metadados continuam somente na documentação interna.
6. O material do participante não exige citação, não orienta busca nas obras e não contém identificadores das três fontes.

## 4. Pendências que permanecem legítimas

Estas pendências não são falhas de coerência; são gates ou decisões ainda não autorizados:

- autorização humana para iniciar `0101_visao_arquitetural.md`;
- blueprint B-07 e produção dos 120 itens antes da baseline;
- execução do T2 controlado da M02;
- confirmação de protocolos CVG ou registro explícito de `NAO_FORNECIDO`/`NAO_APLICAVEL`;
- seleção e contratação de identidade, banco, hospedagem e telemetria;
- derivação de domínio, contratos, modelo de dados, segurança, observabilidade, telas e plano de BUILD na SPEC;
- aprovação do gate `0190` antes de qualquer código ou implantação.

## 5. Regra de avanço

A preparação editorial interna pode continuar por meio do Anexo 0024 sem iniciar a Fase 1. O próximo avanço de engenharia é a autorização humana explícita para 0101. Depois dela, a documentação 0101–0117 deve derivar os requisitos aprovados sem ampliar dados, escopo ou exposição autoral. O BUILD só pode começar após a aprovação integral do gate 0190.

Até lá, qualquer conteúdo novo deve permanecer em documentação interna, usar redação própria do CVG, casos fictícios e materiais autorizados, sem inserir PDFs ou derivados no Git ou na plataforma.

## 6. Evidência de verificação

- `git status` estava limpo antes desta auditoria;
- a busca de requisitos confirmou cobertura de acesso, conta, dashboard, trilha, avaliações, feedback e retenção;
- a busca de exposição não encontrou nomes de obras, códigos F-01/F-02/F-03, ISBNs ou URLs no material do participante;
- a regra RF-097 foi comparada diretamente com D-109 e corrigida;
- a próxima ação permanece registrada em `docs/99_runtime_state.md` e `docs/20_master_execution_log.md`.
