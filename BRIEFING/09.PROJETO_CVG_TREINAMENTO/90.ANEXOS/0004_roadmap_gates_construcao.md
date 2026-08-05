# Anexo 0004 — Roadmap e Gates de Construção

**Status:** Discovery e PRD `REPROVADOS — EM CORREÇÃO`; PRD existente é rascunho controlado; SPEC/BUILD bloqueados

## 1. Pipeline oficial

```text
FASE 0 — DISCOVERY
→ GATE 0090
→ FASE 1 — PRD
→ GATE 0090 PRD
→ FASE 2 — SPEC
→ GATE 0190
→ FASE 3 — BUILD
→ GATES DE SPRINT E FASE
→ FASE 4 — PILOTO CONTROLADO
→ FASE 5 — AUDIT
→ REMEDIAÇÃO E MELHORIA CONTÍNUA
```

## 2. Fase 0 — Discovery

### Objetivo

Validar problema, contexto, usuários, fluxo, valor e riscos.

### Artefatos

Produzidos neste briefing:

- `0000_trigger`;
- `0001_analise_da_dor`;
- `0002_contexto_operacional`;
- `0003_fluxo_atual`;
- `0004_problem_framing`;
- `0005_hipotese_de_valor`;
- `0006_usuarios_e_stakeholders`;
- `0007_riscos_e_hipoteses`;
- `0009_discovery_master`;
- `0090_discovery_validation`.

### Estado

**`REPROVADO — EM CORREÇÃO` (2026-08-05).** A autorização gerencial para elaborar um rascunho de PRD não substitui o gate canônico. B-01 e B-02 foram fechados por D-078 e D-079; os demais itens incompletos permanecem no [0090 — Discovery Validation](../00.DISCOVERY/0090_discovery_validation.md).

### Próximas atividades permitidas

- Correção dos artefatos de Discovery e do rascunho de PRD;
- Definição da baseline B-07 dentro do conjunto mínimo de dados aprovado por D-077, sem gravações, prontuários, tutores ou casos reais identificáveis;
- Priorização do piloto;
- Nomeação de responsáveis;
- Decisão de fontes, licenças e dados;
- Reexecução do gate Discovery após todas as evidências.

Não são permitidos: SPEC, preparação formal de SPEC, backlog de BUILD, arquitetura, código ou produção de conteúdo clínico.

## 3. Fase 1 — PRD

### Pré-condição

`0090_discovery_validation.md` aprovado canonicamente — **NÃO CUMPRIDA**. Os artefatos abaixo existem apenas como rascunho controlado para correção e futura submissão.

### Objetivo

Materializar o comportamento do produto sem definir tecnologia.

### Artefatos

- `0010_casos_de_uso.md`; ✅
- `0011_escopo_fase.md`; ✅
- `0012_regras_de_negocio.md`; ✅
- `0013_requisitos_funcionais.md`; ✅
- `0014_requisitos_nao_funcionais_produto.md`; ✅
- `0015_metricas_de_sucesso.md`; ✅
- `0020_prd_master.md`; ✅
- `0090_prd_validation.md`; ❌ reprovado — em correção.

### Conteúdo que o PRD deverá fechar

- MVP; ✅ (proposta)
- Usuários e permissões; ✅
- Fluxos; ✅
- Regras de trilha; ✅ (proposta)
- Estados de progresso; ✅ (vocabulário anexo 0003)
- Tipos de avaliação; ✅ (proposta)
- Aprovação, recuperação e retenção; ✅ (proposta)
- Contestação; ✅
- Governança editorial; ✅
- Fontes; ✅ D-075: governança enxuta para uso interno, B-04 fechado; automação dos PDFs permanece fora do MVP em D-033
- Métricas; ✅ (proposta; baseline B-07)
- Privacidade; ✅ D-077/Anexo 0011: política mínima aprovada e B-05 fechado
- Exceções. ✅

### Gate

Todos os campos obrigatórios devem estar completos; qualquer ausência bloqueia SPEC. **REPROVADO — EM CORREÇÃO em 2026-08-05**. B-01/B-02/B-03/B-04/B-05 foram fechados por D-078/D-079/D-076/D-075/D-077; B-07 e requisitos pendentes ainda exigem fechamento e nova execução do gate.

## 4. Fase 2 — SPEC

### Pré-condição

Discovery e PRD aprovados canonicamente, em sequência, por commits identificados — **NÃO CUMPRIDA**.

### Objetivo

Transformar produto aprovado em contrato técnico rastreável.

### Artefatos futuros

| ID | Tema |
|---|---|
| 0100 | readiness |
| 0101 | visão arquitetural |
| 0102 | bounded contexts |
| 0103 | módulos |
| 0104 | domínio |
| 0105 | estados e fluxos |
| 0106 | contratos de aplicação |
| 0107 | contratos de API |
| 0108 | eventos/assíncrono |
| 0109 | dados/persistência |
| 0110 | integridade/migrações |
| 0111 | permissões/governança |
| 0112 | integrações |
| 0113 | observabilidade/runtime |
| 0114 | frontend operacional |
| 0115 | plano de build |
| 0116 | dependências |
| 0117 | backlog |
| 0120 | spec master |
| 0190 | validação |

### Temas técnicos futuros

- Autenticação;
- RBAC;
- Trilhas e versões;
- Banco de questões;
- Tentativas imutáveis;
- Cálculo de notas;
- Métricas;
- Auditoria;
- Conteúdo e revisão;
- Notificações;
- Integrações;
- Segurança e LGPD;
- Recuperação e disponibilidade.

Nenhuma dessas decisões foi tomada agora.

## 5. Fase 3 — Build

### Pré-condição

SPEC 0190 aprovada.

### Método

```text
PHASE
→ SPRINT
→ TASK
→ IMPLEMENTAR
→ TESTAR
→ REVISAR
→ AUDITAR
→ REGISTRAR
```

### Artefatos futuros

- Build engineer master;
- Roadmap;
- Backlog operacional;
- Planos de sprint;
- Auditoria de sprint;
- Relatórios de fase;
- Log global;
- Estado de runtime.

### Qualidade obrigatória

- TDD;
- Testes unitários;
- Integração;
- E2E dos fluxos críticos;
- Cobertura mínima de 80%;
- Revisão de código;
- Revisão de segurança;
- Rastreabilidade PRD → SPEC → código → teste.

## 6. Fase 4 — Piloto

### Coorte

PENDENTE.

### Escopo recomendado

- Modalidade integralmente digital, conforme D-068;
- Um núcleo comum;
- Uma ou duas áreas clínicas;
- Número limitado de módulos;
- Conteúdo revisado;
- Banco suficiente;
- Diagnóstico, aprendizagem, prova, remediação e retenção;
- Duração recomendada pela matriz V2: 14 semanas; a faixa histórica de 8–12 semanas foi reaberta na D-081.

### Linha de base

- Perfil;
- Conhecimento;
- Processo atual;
- Engajamento;
- Tempo de coordenação;
- Percepção de utilidade;
- Indicadores selecionados.

### Critérios de continuar

- Segurança clínica/editorial;
- Ativação e conclusão aceitáveis;
- Ganho e retenção;
- Métricas confiáveis;
- Feedback dos usuários;
- Carga sustentável;
- Nenhum risco crítico aberto.

### Critérios de pausar

- Erro clínico crítico;
- Licença não resolvida;
- Falha de privacidade;
- Inconsistência de notas;
- Uso punitivo indevido;
- Baixa adesão sem mitigação;
- Conteúdo sem owner.

## 7. Fase 5 — Audit

### Pré-condição

Sistema funcional em ambiente definido e versão identificada.

### Escopo futuro

- Aderência ao PRD;
- Aderência à SPEC;
- Runtime;
- Logs;
- Métricas;
- Integrações;
- Integridade de dados;
- Segurança e governança;
- Experiência operacional;
- Gaps e remediação.

### Evidências

- Logs;
- Métricas;
- Testes;
- Observação da operação digital e da usabilidade;
- Dados de tentativas;
- Histórico de versões;
- Aprovações;
- Contestações;
- Alterações de notas e gabaritos.

### Loop

```text
AUDIT
→ GAP
→ FIX
→ VALIDATE
→ AUDIT
```

## 8. Governança de gates

### 8.1 Pré-condição universal de versionamento

Antes de qualquer aprovação ou avanço de fase, é obrigatório:

1. Revisar o `git diff` da fase;
2. Executar validações e testes aplicáveis;
3. Verificar segredos, dados pessoais e direitos autorais; chaves, senhas, tokens e credenciais são terminantemente proibidos no Git;
4. Criar commit convencional com escopo único;
5. Registrar o commit, o revisor, o aprovador e a decisão no artefato do gate;
6. Manter a fase seguinte bloqueada até a aprovação humana do commit registrado.

A ausência desse checkpoint reprova o gate, independentemente da completude narrativa dos documentos. Regras e evidências obrigatórias estão no [Anexo 0010](0010_controle_versao_gates.md).

### 8.2 `GATE-EXP-PRAT-01` — inclusão de treinamento ou evidência prática

Até a aprovação deste gate, treinamento prático presencial associado à plataforma, observação de trabalho real, avaliação psicomotora, registro de nível de supervisão e concessão de autonomia permanecem `FUTURE — BLOQUEADO POR GATE-EXP-PRAT-01` e não podem gerar UC, RF, SPEC, backlog ou BUILD.

Condições mínimas para abertura: evidência do piloto digital; PRD revisado com dimensão prática separada; modelo de competência e avaliadores; análise de segurança clínica e responsabilidade profissional; política LGPD para pacientes, tutores, imagens e gravações; recursos e protocolos aprovados; SPEC de impacto; aprovação do patrocinador, RT/coordenação clínica, coordenação educacional e LGPD/segurança; checkpoint Git conforme o Anexo 0010.

| Gate | Quem prepara | Quem revisa | Quem aprova |
|---|---|---|---|
| Discovery | MV. Ricardo Akinaga | evidências do levantamento | MV. Ricardo Akinaga sobre commit identificado |
| PRD | MV. Ricardo Akinaga | consistência com Discovery | MV. Ricardo Akinaga sobre commit identificado |
| SPEC/Build | responsável técnico da implementação, quando a fase abrir | testes e segurança aplicáveis | MV. Ricardo Akinaga |
| Conteúdo clínico | autor | outro médico-veterinário escolhido por módulo | MV. Ricardo Akinaga após a segunda conferência |
| Piloto/Audit | MV. Ricardo Akinaga | resultados e problemas observados | MV. Ricardo Akinaga |
| Expansão prática (`GATE-EXP-PRAT-01`) | MV. Ricardo Akinaga | análise específica futura | decisão futura registrada |

D-076 define a governança enxuta do MVP e fecha B-03. Não há cargos, comitês ou suplentes pendentes; a única segunda conferência obrigatória é clínica, por outro MV, antes da publicação de cada módulo.

## 9. Estado e persistência futuros

Quando a execução começar, cada rodada deverá registrar:

- Projeto;
- Engine;
- Fase;
- Sprint;
- Tarefa;
- Status;
- Última ação;
- Próxima ação;
- Bloqueios;
- Decisão humana necessária;
- Timestamp ISO 8601 com fuso.

Estados:

- `IN_PROGRESS`;
- `READY_FOR_NEXT_STEP`;
- `BLOCKED`;
- `WAITING_HUMAN_APPROVAL`;
- `COMPLETED`.

## 10. Divergências dos engines preservadas

Decisões futuras deverão normalizar:

- Colisão de numeração entre Discovery e PRD;
- Variação de nomes de arquivos SPEC;
- Roadmap SPEC de fases 0–6 versus Build 0–7;
- Backlog global versus backlog do Build;
- Uso de `SYSTEM` no log;
- Nomenclatura de Audit;
- Registro antes/depois da execução.

Neste pacote adotou-se:

- Discovery canônico em `0000–0090`;
- PRD futuro iniciado em `0010`;
- Nenhum arquivo canônico original alterado.
