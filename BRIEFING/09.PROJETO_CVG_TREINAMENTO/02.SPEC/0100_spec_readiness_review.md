# 0100 — SPEC Readiness Review

**Projeto:** Sistema CVG de Treinamento Veterinário
**Fase:** SPEC — Fase 0, leitura e validação
**Data:** 2026-08-07
**Responsável pelo produto e aprovação:** MV. Ricardo Akinaga
**Engine:** `BRIEFING/02.ESPEC/SPEC ENGINE ENTERPRISE`
**Baseline aprovada:** `f6fefa1`; checkpoint de evidência `e8abe6f`
**Checkpoint da Fase 0:** `f8e1e08` — `docs: approve gates and add spec readiness`
**Resultado:** `READY_FOR_SPEC_PHASE_1 — AUTORIZADA PELO PATROCINADOR EM 2026-08-09`

## 1. Objetivo e limite desta revisão

Esta revisão confirma que existe um PRD aprovado, compreensível e suficiente para iniciar a derivação de engenharia. Ela não define arquitetura detalhada, banco, API, telas implementáveis ou plano de BUILD.

O diretório canônico genérico `/docs/02_spec` é materializado neste projeto como `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC`, preservando a fonte da verdade e a numeração oficial sem alterar as engines compartilhadas.

## 2. Documentos lidos

### 2.1 Entrada de Discovery e gates

- [Discovery Master](../00.DISCOVERY/0009_discovery_master.md);
- [Discovery Validation](../00.DISCOVERY/0090_discovery_validation.md);
- [controle de versão dos gates](../90.ANEXOS/0010_controle_versao_gates.md);
- [pacote de fechamento D-101 a D-108](../90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md).

### 2.2 PRD aprovado

- [0010 — Casos de uso](../01.PRD/0010_casos_de_uso.md);
- [0011 — Escopo](../01.PRD/0011_escopo_fase.md);
- [0012 — Regras de negócio](../01.PRD/0012_regras_de_negocio.md);
- [0013 — Requisitos funcionais](../01.PRD/0013_requisitos_funcionais.md);
- [0014 — Requisitos não funcionais](../01.PRD/0014_requisitos_nao_funcionais_produto.md);
- [0015 — Métricas de sucesso](../01.PRD/0015_metricas_de_sucesso.md);
- [0016 — Programa curricular V2](../01.PRD/0016_programa_curricular_clinico.md), somente como histórico superado;
- [0017 — Programa curricular V3](../01.PRD/0017_programa_curricular_24_meses.md), versão vigente;
- [0020 — PRD Master](../01.PRD/0020_prd_master.md);
- [0090 — PRD Validation](../01.PRD/0090_prd_validation.md).

### 2.3 Anexos obrigatórios para a derivação

- [governança das fontes](../90.ANEXOS/0001_governanca_fonte_conhecimento.md);
- [política mínima de dados D-077](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md);
- [blueprint diagnóstico B-07](../90.ANEXOS/0012_blueprint_diagnostico_b07.md);
- [alinhamento de produto e arquitetura D-091 a D-100](../90.ANEXOS/0020_alinhamento_produto_pre_spec.md).

## 3. Confirmação da aprovação do PRD

| Condição | Evidência | Estado |
|---|---|---|
| Discovery aprovado | aprovação de MV. Ricardo Akinaga sobre `f6fefa1` em 2026-08-07 | satisfeita |
| PRD aprovado depois do Discovery | mesma manifestação, em ordem, sobre `f6fefa1` | satisfeita |
| checkpoint de evidência | `e8abe6f` reconhecido pelo aprovador | satisfeita |
| D-101 a D-108 | aprovadas integralmente em 2026-08-07 | satisfeita |
| autorização desta fase | autorização explícita do patrocinador nesta sessão, após o gate PRD técnico de 97%, para concluir a SPEC 0101–0190; BUILD executável continua condicionado ao gate final e à documentação 04–08 | satisfeita |

O PRD está formalmente aprovado. B-07 é conteúdo diagnóstico que pode ser concluído em paralelo; não bloqueia a SPEC, a construção nem o treinamento interno. O diagnóstico pode ser aprimorado depois sem criar uma etapa obrigatória de calibração.

## 4. Resumo do produto aprovado

O produto é uma plataforma web responsiva interna para aproximadamente dez médicos-veterinários do CVG. A jornada oferece convite e login individual, diagnóstico formativo, recomendação de reforços, programa curricular digital de 24 meses, 24 módulos, 96 sessões e 149 horas, avaliações mistas, casos fictícios, remediação, retenção e acompanhamento da evolução.

Participante, moderador e administrador possuem superfícies e permissões separadas. Ricardo é o único aprovador clínico obrigatório; revisão veterinária adicional é opcional. Dashboards, feedback de bugs/erros/melhorias e KPIs simples fazem parte do MVP, sem ranking, uso punitivo ou inferência de competência prática.

A direção técnica da SPEC é um monorepo modular com `web`/SPA, API autoritativa, worker separado, PostgreSQL transacional, Qdrant auxiliar e adaptador de IA server-side. Qdrant/IA são recursos internos e assistivos: não são fonte de verdade, não recebem PDFs/fotos/cópias protegidas ou dados reais e não têm autoridade sobre workflow, permissões, notas, prazos ou mudanças de estado. Os fluxos educacionais determinísticos continuam operando quando esses recursos estão desligados.

## 5. Fronteiras obrigatórias

1. somente casos e dados clínicos fictícios podem entrar na plataforma;
2. prontuários, tutores, gravações, casos reais identificáveis e uso em RH permanecem proibidos;
3. PDFs-fonte, fotos, OCR, trechos protegidos e cópias ficam fora dos serviços; Qdrant pode manter embeddings de registros autorais internos autorizados, com payload mínimo e acesso restrito ao workflow de construção;
4. prática presencial, habilidade psicomotora, autonomia e certificação profissional ficam fora do produto;
5. aprovação digital nunca autoriza procedimento ou autonomia clínica;
6. toda publicação clínica exige aprovação registrada de Ricardo;
7. WCAG 2.2 AA vale para toda a jornada;
8. RPO inicial é de até uma hora e RTO de até quatro horas;
9. nenhuma integração pode ampliar dados, escopo ou autonomia aprovados; a baseline técnica é adotada diretamente, sem consulta ou seleção externa;
10. BUILD permanece proibido até aprovação integral do gate 0190.

## 6. Lacunas que a própria SPEC deve fechar

Nenhuma das lacunas abaixo exige reabrir o PRD para iniciar a Fase 1. Todas devem estar resolvidas antes do gate 0190 quando afetarem BUILD.

| ID | Lacuna | Classificação | Owner | Documento de resolução | Gate afetado |
|---|---|---|---|---|---|
| L-SPEC-01 | detalhar componentes, fronteiras e trade-offs do monólito modular | engenharia | engenharia | 0101–0103 | 0190 |
| L-SPEC-02 | definir proteção técnica do banco de questões e segregação de gabaritos (D-048) | segurança | engenharia/segurança | 0104, 0109 e 0111 | 0190 |
| L-SPEC-03 | fixar a baseline de execução para PostgreSQL, Qdrant e IA e manter adaptadores pequenos de infraestrutura | engenharia | equipe de construção | 0101, 0112 e 0116 | 0190 |
| L-SPEC-04 | definir modelo de dados, integridade, idempotência, versões e migrações | engenharia | engenharia | 0104–0110 | 0190 |
| L-SPEC-05 | derivar contratos de aplicação, API e eventos de cada caso de uso | engenharia | engenharia | 0106–0108 | 0190 |
| L-SPEC-06 | detalhar RBAC, escopos, RLS, auditoria e bootstrap de `CLINICAL_APPROVER` | segurança | engenharia/segurança | 0111 | 0190 |
| L-SPEC-07 | definir SLOs/SLIs, alertas, restauração e verificação de RPO/RTO | operação | engenharia/operação | 0113 | 0190 |
| L-SPEC-08 | traduzir as superfícies aprovadas em estados de tela, erro, vazio e carregamento | experiência | produto/engenharia | 0114 | 0190 |
| L-SPEC-09 | congelar dependências, versões, limites operacionais e variáveis de ambiente | dependência | engenharia | 0112/0116 | 0190 |
| L-SPEC-10 | estruturar fases, critérios, dependências e backlog do BUILD | planejamento | engenharia | 0115–0117 | 0190 |

## 7. Pendências externas que não bloqueiam a SPEC

| Pendência | Bloqueia | Não bloqueia |
|---|---|---|
| aprovação clínica final do blueprint B-07 | melhoria do diagnóstico | SPEC, construção e treinamento interno |
| produzir, revisar e testar os 120 itens | aplicação específica da baseline | modelagem e construção do sistema |
| aplicar a baseline | observação futura do diagnóstico | gate 0100 e BUILD |
| equivalência quantitativa | comparação estatística futura, se desejada | SPEC, construção e treinamento interno |
| executar T2 da M02 | melhoria opcional do formato | SPEC e construção |
| redigir protocolo CVG autoral | publicação da unidade dependente do protocolo | arquitetura e construção |
| infraestrutura | configuração operacional da baseline escolhida | derivação da SPEC |
| validar custo/desempenho do agente de IA | ajuste operacional posterior; limites e desligamento já ficam especificados | produto determinístico e SPEC |
| D-033 sobre processamento dos PDFs | eventual OCR/RAG de ativos autorizados no futuro | núcleo autoral e índice interno controlado |

## 8. Hipóteses técnicas controladas

Estas hipóteses podem orientar a próxima fase, mas não substituem decisões registradas nos documentos indicados.

| ID | Hipótese | Evidência atual | Risco | Validação |
|---|---|---|---|---|
| H-SPEC-01 | uma aplicação web responsiva atende celular e computador sem app nativo | D-096/D-099 e coorte pequena | baixo | 0101 e 0114 |
| H-SPEC-02 | um monólito modular com um banco relacional atende a escala inicial | D-096; aproximadamente 10 usuários | baixo | 0101, 0102 e 0109 |
| H-SPEC-03 | processamento síncrono é padrão; tarefas assíncronas ficam restritas a filas justificadas | poucos fluxos de alta latência | médio | 0108 e 0113 |
| H-SPEC-04 | a porta de identidade escolhida suporta convite, recuperação, MFA e revogação exigidos | D-091 | médio | 0112 e 0116; sem consulta externa |
| H-SPEC-05 | PostgreSQL e autorização no servidor, com RLS como defesa adicional, atendem os escopos | D-092/D-096 | médio | 0109 e 0111 |
| H-SPEC-06 | o sistema principal funciona integralmente com IA e Qdrant desligados | D-100 e decisão desta SPEC | baixo | 0106, 0113 e testes futuros |
| H-SPEC-07 | Qdrant indexa somente registros autorais internos e pode ser reconstruído a partir do PostgreSQL | decisão desta SPEC | médio | 0108, 0109, 0112 e testes futuros |
| H-SPEC-08 | resultados de T2 podem ajustar estimativas/UX sem alterar o domínio aprovado | protocolo M02 separado | médio | revisar antes de 0114/0190 |

## 9. Bloqueios da readiness

| Verificação | Resultado |
|---|---|
| PRD formalmente aprovado | sim |
| escopo, usuários, fluxos e regras suficientes | sim |
| lacuna crítica de produto | nenhuma |
| conflito documental impeditivo | nenhum vigente |
| necessidade de inventar produto para iniciar 0101 | não |
| autorização para BUILD | não; explicitamente bloqueada |

## 10. Resultado da Fase 0

```text
SPEC READINESS: APROVADA TECNICAMENTE
BLOQUEIO PARA 0101: NENHUM TÉCNICO
PRÓXIMA ENTREGA: 0101_VISAO_ARQUITETURAL.MD
AUTORIZAÇÃO ATUAL: 0101–0190 autorizada; somente documentação de SPEC nesta etapa
BUILD EXECUTÁVEL: proibido até aprovação do 0190 e do gate documental 04–08/100%
PILOTO/USO INTERNO: conteúdo clínico deve passar pela revisão de Ricardo; B-07 e T2 não bloqueiam a construção
```

A Fase 1 está autorizada pela manifestação explícita do patrocinador em 2026-08-09. A autorização libera a conclusão da SPEC e a preparação do BUILD; a implementação executável ocorrerá depois do gate documental 04–08/100%, conforme a ordem definida pelo patrocinador.
