# 0011 — Escopo da Fase

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-05  
**Classificação:** `FATO INFORMADO` / `EVIDÊNCIA DOCUMENTAL` / `HIPÓTESE` / `PROPOSTA` / `PENDENTE`

---

## 1. Escopo desta fase do projeto

Esta fase mantém a **documentação de briefing do produto** como rascunho controlado. Discovery e PRD estão `REPROVADOS — EM CORREÇÃO`; não há autorização para SPEC, sistema, conteúdo clínico ou avaliações reais.

## 2. IN SCOPE (o que será construído no produto)

**Proposta consolidada a partir dos insumos informados e das hipóteses aprovadas para discussão:**

### Núcleo do produto (MVP sugerido)

1. Cadastro e autenticação de médicos-veterinários colaboradores;
2. Avaliação diagnóstica inicial obrigatória, formativa e não punitiva;
3. Linha de base individual por tema e competência;
4. Atribuição de trilha personalizada (núcleo obrigatório + reforços por lacuna);
5. Consumo de conteúdo digital em unidades curtas e revisadas;
6. Quizzes formativos com feedback imediato;
7. Casos clínicos e simulações digitais, lineares ou ramificados, com decisões registradas e debriefing (formativos; somativos conforme regra aprovada);
8. Prova somativa por módulo;
9. Remediação estruturada após desempenho insuficiente;
10. Avaliação de retenção (janelas 30/60/90 dias);
11. Painel individual de progresso, domínio, retenção e confiança;
12. Painel gerencial agregado (escopo autorizado);
13. Gestão de conteúdo: autoria, revisão clínica, revisão pedagógica, aprovação, publicação, versionamento, validade e retirada;
14. Banco de questões com blueprint e rastreabilidade;
15. Contestação de questão/resultado com recálculo auditável;
16. Trilha de auditoria completa;
17. Papéis e permissões (matriz do 0006);
18. Vocabulário de estados (anexo 0003: `NÃO_INICIADO`, `EM_ANDAMENTO`, `EM_AVALIAÇÃO`, `EM_REMEDIAÇÃO`, `APROVADO`, `REPROVADO`, `RESULTADO_EM_REVISÃO`, `CONCLUÍDO`, `VENCIDO`, `DISPENSADO_POR_DOMÍNIO`, `BLOQUEADO_POR_PRÉ_REQUISITO`).

### Escopo clínico do piloto (APROVADO PELO PATROCINADOR COMO INSUMO em 2026-08-05)

- **Núcleo comum obrigatório** (anexo 0002, seção 5): segurança do paciente, responsabilidade profissional, comunicação, exame e história, medicina baseada em evidências, dor, fluidoterapia, segurança medicamentosa, antimicrobial stewardship, registro clínico e reconhecimento de emergência;
- **Áreas clínicas:** **Emergência e Internação**, confirmadas pelo patrocinador como insumo; revalidação formal pendente após B-03 (B-06);
- Espécies: **cães e gatos** (D-022 resolvido);
- Coorte: **10 a 15 veterinários** cobrindo os 3 turnos e os setores do piloto; número final conforme inventário (B-02); demais colaboradores entram em fases seguintes;
- Duração do piloto: **12 semanas** (D-061 resolvido);
- Tempo protegido: **3 h/mês por veterinário**; decomposição entre microlearning e atividades digitais de caso será reconciliada no item de carga (D-016 resolvido quanto ao total);
- Banco de questões: **10 a 15 itens por objetivo** (D-063 resolvido).

## 3. OUT OF SCOPE (o que NÃO será construído)

1. Avaliação de competência prática, autonomia clínica ou autorização de procedimentos;
2. Treinamento prático presencial associado à plataforma, prática em pacientes, cadáveres, manequins, equipamentos ou materiais físicos;
3. Observação direta do trabalho, envio de vídeo de procedimento real, checklist de execução prática ou registro de nível de supervisão;
4. Certificação formal (diplomas ou equivalentes profissionais) — decisão: somente status de conclusão no piloto (RN-079);
5. Emissão de diplomas ou equivalentes profissionais;
6. Integração com sistema de prontuário, RH, financeiro ou qualquer sistema externo (fase futura);
7. Avaliação trabalhista, decisões disciplinares ou uso de notas para sanções (uso em RH proibido no piloto — RN-066);
8. Reprodução ou adaptação da expressão dos livros-fonte — incluindo texto, tradução, capítulos, tabelas, figuras, diagramas ou estrutura distintiva — proibida; obras somente para consulta/validação interna, com conteúdo original CVG e rastreabilidade restrita (D-074/RN-046);
9. Publicação dos PDFs das obras na plataforma;
10. Processamento automatizado das obras — incluindo extração, OCR, indexação, embeddings, RAG, envio a IA ou geração assistida mesmo com revisão humana — bloqueado até decisão formal D-033/B-04; IA geral fora das obras continua sujeita aos demais gates e à revisão humana;
11. Notificações externas (e-mail/SMS) — `PENDENTE`;
12. Gamificação, ranking público ou comparativos entre colaboradores;

## 4. FUTURE SCOPE (possíveis expansões)

1. Trilhas por função/área (felinos, anestesia e dor, diagnóstico, clínica geral, especialidades);
2. Nível avançado com casos complexos e integração;
3. Organização ou registro de treinamento prático presencial e evidência prática em dimensão separada — `FUTURE — BLOQUEADO POR GATE-EXP-PRAT-01`;
4. Certificação interna com validade, se aprovada;
5. Reciclagem obrigatória programada por validade do conteúdo;
6. Integrações com sistemas de gestão;
7. Notificações e lembretes externos;
8. Análise psicométrica avançada do banco de questões (quando a amostra permitir);
9. Módulo de liderança/preceptoria;
10. Inclusão de outros públicos (técnicos, recepção, auxiliares) — sujeito a nova decisão de escopo.

## 5. Limites e regras de fronteira

1. O produto é **integralmente digital** na primeira versão e avalia conhecimento e raciocínio em cenários digitais simulados — nunca habilidade psicomotora, competência prática ou autonomia clínica;
2. Aprovação em conteúdo, prova, caso ou simulação digital **não autoriza** procedimentos ou autonomia (`FATO INFORMADO`, D-068);
3. Conteúdo clínico somente publicado após revisão humana (`FATO INFORMADO`);
4. No piloto, casos clínicos usarão somente dados fictícios; casos derivados de atendimentos reais ficam bloqueados até B-05 aprovar anonimização e revisão de privacidade;
5. Resultados usados para desenvolvimento, priorização e reforço — nunca punição automática (`HIPÓTESE` validada como diretriz);
6. Divergências entre fontes seguem hierarquia do anexo 0001 (legislação > protocolo CVG > diretriz > Ettinger > Tratado);
7. Dados pessoais e de desempenho permanecem bloqueados; o [Anexo 0011](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md) é `RASCUNHO CONSERVADOR — NÃO APROVADO`, e B-05 continua pendente (D-051 a D-053/D-073).
8. Qualquer prática presencial futura exige aprovação do `GATE-EXP-PRAT-01` antes de gerar UC, RF, SPEC, backlog ou BUILD.

## 6. Critérios de priorização para o piloto

**PROPOSTA** — pontuar por: risco clínico, frequência, variabilidade de conduta, disponibilidade de fonte, disponibilidade de revisor, facilidade de medir, valor percebido e esforço de produção (anexo 0002, seção 13). Núcleo + Emergência + Internação foram confirmados pelo patrocinador como insumo (B-06); a revalidação formal dependerá do comitê clínico após B-03.

## 7. Faseamento da entrega (PROPOSTA)

| Fase | Entrega | Condição |
|---|---|---|
| 0 | Corrigir e revalidar Briefing (Discovery + PRD) | gates 0090 Discovery e PRD aprovados, nessa ordem |
| 1 | SPEC | PRD aprovado |
| 2 | BUILD (MVP piloto) | SPEC aprovada |
| 3 | Piloto controlado (coorte de 10–15, 12 semanas) | build funcional |
| 4 | AUDIT | piloto em operação |
| 5 | Melhoria contínua e expansão | decisão do patrocinador |
