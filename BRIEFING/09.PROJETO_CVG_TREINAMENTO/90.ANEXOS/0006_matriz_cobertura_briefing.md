# Anexo 0006 — Matriz de Cobertura do Briefing

**Objetivo:** demonstrar que todos os campos solicitados pelas engines foram preenchidos ou explicitamente marcados como pendentes.  
**Atualização:** 2026-08-05 — Discovery e PRD reclassificados como `REPROVADOS — EM CORREÇÃO`; PRD é rascunho controlado.

## 1. Discovery

| Campo canônico | Artefato | Situação |
|---|---|---|
| origem da ideia | 0000 | preenchido |
| tipo de gatilho | 0000 | preenchido |
| contexto inicial | 0000 | preenchido |
| descrição da percepção | 0000 | preenchido |
| quem identificou | 0000 | pendente com registro provisório |
| quem sofre a dor | 0001 | preenchido |
| quando ocorre | 0001 | preenchido |
| frequência | 0001 | contínua; frequência atual pendente |
| impacto | 0001 | qualitativo; quantitativo pendente |
| consequência | 0001 | preenchido |
| evidências | 0001 | disponíveis e ausentes |
| onde ocorre | 0002 | preenchido |
| etapa afetada | 0002 | preenchido |
| atores | 0002/0006 | preenchidos |
| ferramentas atuais | 0002 | pendente |
| processo atual | 0002/0003 | pendente |
| workaround | 0002 | pendente |
| sequência atual | 0003 | limite conhecido |
| decisões | 0003 | preenchidas |
| handoffs | 0003 | pendentes/propostos |
| gargalos | 0003 | confirmados e hipotéticos |
| falhas | 0003 | riscos, sem afirmar ocorrência |
| retrabalho | 0003 | pendente |
| exceções | 0003 | candidatas à validação |
| definição do problema | 0004 | preenchida |
| escopo | 0004 | preenchido |
| não resolvido | 0004 | preenchido |
| limites | 0004 | preenchidos |
| simplificação | 0004 | preenchida |
| o que melhora | 0005 | preenchido |
| para quem | 0005 | preenchido |
| impacto esperado | 0005 | preenchido |
| indicadores | 0005/anexo 0003 | preenchidos |
| valor | 0005 | preenchido |
| usuário primário | 0006 | preenchido |
| usuário secundário | 0006 | preenchido |
| operador | 0006 | preenchido |
| decisor | 0006 | papéis; nomes pendentes |
| impactados indiretos | 0006 | preenchido |
| hipóteses | 0007 | preenchidas |
| riscos operacionais | 0007 | preenchidos |
| riscos de adoção | 0007 | preenchidos |
| dependências | 0007 | preenchidas |
| limitações | 0007 | preenchidas |
| consolidação | 0009 | preenchida |
| gate | 0090 | reprovado com bloqueios |

## 2. Insumos de produto solicitados

| Requisito do solicitante | Documento | Situação |
|---|---|---|
| plataforma de treinamento digital, com casos e simulações digitais | 0000/0004/0009 + D-068 | modalidade confirmada pelo patrocinador como insumo; prática presencial excluída |
| básico ao avançado | anexo 0002 | hipóteses para validar |
| trilhas | anexo 0002 | perguntas e opções não aprovadas |
| provas | anexo 0003 | alternativas para futuro PRD |
| quizzes | anexo 0003 | alternativa formativa não aprovada |
| outras avaliações | anexo 0003 | catálogo de possibilidades |
| medir evolução | anexo 0003 | KPIs candidatos |
| remediação | anexos 0002/0003 | hipótese de fluxo |
| fonte brasileira | anexo 0001 | governança definida |
| fonte atualizada | anexo 0001 | Ettinger incorporado |
| fonte cirúrgica | anexo 0001 | Fossum incorporado (F-03) — 2026-08-05 |
| validação da documentação | anexo 0009 | verificações físicas e de consistência registradas — 2026-08-05 |
| sequência de construção | anexo 0004 | roadmap com gates |
| não criar programa | README | escopo respeitado |

## 2.1 Cobertura do PRD

| Campo canônico da engine | Artefato | Situação |
|---|---|---|
| casos de uso (ator, objetivo, gatilho, fluxo, exceções, resultado) | 01.PRD/0010 | preenchido — 20 casos |
| IN SCOPE | 01.PRD/0011 | preenchido (proposta) |
| OUT OF SCOPE | 01.PRD/0011 | preenchido |
| FUTURE SCOPE | 01.PRD/0011 | preenchido |
| regras operacionais | 01.PRD/0012 | rascunho preenchido — RN-001 a RN-085, com itens pendentes explícitos |
| restrições | 01.PRD/0012 | preenchidas |
| permissões de negócio | 01.PRD/0012 §8 | preenchidas |
| validações obrigatórias | 01.PRD/0012 §9 | preenchidas |
| requisitos funcionais (sem tecnologia) | 01.PRD/0013 | preenchidos — RF-001 a RF-094 |
| requisitos não funcionais | 01.PRD/0014 | preenchidos — RNF-001 a RNF-084 |
| KPIs e metas | 01.PRD/0015 | preenchidos (propostas; baseline pendente B-07) |
| critérios de sucesso | 01.PRD/0015 §4 | preenchidos (proposta) |
| consolidação | 01.PRD/0020 | preenchido |
| gate | 01.PRD/0090 | reprovado — em correção; decisões do patrocinador preservadas como insumos; B-01/B-02/B-03/B-04/B-05/B-07 e requisitos pendentes bloqueiam nova submissão |
| rastreabilidade Discovery → PRD | 0010 §5, 0012, 0020 | mantida |

## 3. Campos que só podem ser fechados no PRD

Registrados como decisões pendentes, sem antecipar tecnologia:

- Casos de uso completos; ✅ fechado (como proposta)
- IN/OUT/FUTURE documentados no rascunho; — aguardando correção e nova submissão dos gates
- Regras definitivas; — decisões do patrocinador são insumos, gate reprovado
- Requisitos funcionais; ✅ fechados (como proposta)
- Requisitos não funcionais; ✅ fechados (como proposta)
- Metas definitivas; — dependem de baseline (B-07)
- Critério final de aprovação; — decisões D-040 a D-044 confirmadas como insumos; baseline/standard setting pendentes
- Política de certificação; — decisão D-049 confirmada como insumo; gate reprovado
- Escopo do MVP; — áreas B-06 confirmadas como insumo; inventário da coorte B-02 pendente
- Política de acesso aos dados; — PENDENTE (B-05)

## 4. Campos que só podem ser fechados na SPEC

- Arquitetura;
- Domínio;
- Módulos técnicos;
- Dados e persistência;
- APIs;
- Eventos;
- Integrações;
- Observabilidade;
- Telas;
- Segurança técnica;
- Plano de build.

## 5. Campos que só existem após Build

- Código;
- Testes executáveis;
- Evidência de cobertura;
- Versão funcional;
- Logs reais;
- Métricas reais;
- Auditoria real;
- Gaps observados;
- Remediação técnica.

## 6. Resultado de cobertura

```text
CAMPOS DE DISCOVERY: REGISTRADOS; GATE DISCOVERY REPROVADO — EM CORREÇÃO (2026-08-05)
CAMPOS DESCONHECIDOS: REGISTRADOS COMO PENDENTES, SEM INVENÇÃO
REQUISITOS DECLARADOS: MATERIALIZADOS NO PRD COMO PROPOSTA
FONTES CLÍNICAS: REGISTRADAS E GOVERNADAS
PROGRAMA/IMPLEMENTAÇÃO: NÃO CRIADO
GATE DISCOVERY: REPROVADO — B-01 A B-07 DEVEM SER FECHADOS E O GATE REEXECUTADO
GATE PRD: REPROVADO — RASCUNHO CONTROLADO; DECISÕES CONFIRMADAS SÃO INSUMOS
SPEC/BUILD/AUDIT: BLOQUEADOS / NÃO INICIADOS
```
