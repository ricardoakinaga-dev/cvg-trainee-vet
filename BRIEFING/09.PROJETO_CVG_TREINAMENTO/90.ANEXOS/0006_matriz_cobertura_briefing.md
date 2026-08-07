# Anexo 0006 — Matriz de Cobertura do Briefing

**Objetivo:** demonstrar que todos os campos solicitados pelas engines foram preenchidos ou explicitamente marcados como pendentes.  
**Atualização:** 2026-08-07 — Discovery e PRD aprovados formalmente; SPEC readiness 0100 autorizada.

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
| ferramentas atuais | 0002 | confirmado que não há sistema ou registro centralizado; auxiliares são opcionais |
| processo atual | 0002/0003 | confirmado por D-078; B-01 fechado |
| workaround | 0002 | aprendizado informal conforme disponibilidade dos profissionais |
| sequência atual | 0003 | validada em nível institucional por D-078 |
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
| decisor | 0006 | MV. Ricardo Akinaga por D-076/D-083 |
| impactados indiretos | 0006 | preenchido |
| hipóteses | 0007 | preenchidas |
| riscos operacionais | 0007 | preenchidos |
| riscos de adoção | 0007 | preenchidos |
| dependências | 0007 | preenchidas |
| limitações | 0007 | preenchidas |
| consolidação | 0009 | preenchida |
| gate | 0090 | aprovado formalmente em 2026-08-07 sobre `f6fefa1` |

## 2. Insumos de produto solicitados

| Requisito do solicitante | Documento | Situação |
|---|---|---|
| plataforma de treinamento digital, com casos e simulações digitais | 0000/0004/0009 + D-068 | modalidade confirmada pelo patrocinador como insumo; prática presencial excluída |
| básico ao avançado | PRD 0017 + anexo 0002 | progressão de complexidade ao longo de 24 meses; sem rótulos formais no MVP |
| trilhas | PRD 0017 | 24 módulos/96 sessões aprovados em D-084/D-085 |
| provas | PRD 0012/0017 | composição e janelas aprovadas |
| quizzes | PRD 0012/0017 | uso formativo definido |
| outras avaliações | PRD 0012/0017 | casos, múltipla escolha e dissertativas definidos |
| medir evolução | PRD 0015 + D-095 | KPIs e dicionário aprovados; metas calibradas após baseline |
| remediação | PRD 0012 + D-082/D-105 | fluxo educativo e não punitivo definido |
| fonte brasileira | anexo 0001 + D-075 | consulta manual interna aprovada; referência simples por módulo; B-04 fechado |
| fonte atualizada | anexo 0001 + D-075 | consulta manual interna aprovada; referência simples por módulo; B-04 fechado |
| fonte cirúrgica | anexo 0001 + D-075 | consulta manual interna aprovada; referência simples por módulo; B-04 fechado |
| validação da documentação | anexo 0009 | verificações físicas e de consistência registradas — 2026-08-05 |
| sequência de construção | anexo 0004 | roadmap com gates |
| programa ainda não executado | README + PRD 0017 | trilha V3 criada; aulas, casos e questões completas ainda não produzidos |

## 2.1 Cobertura do PRD

| Campo canônico da engine | Artefato | Situação |
|---|---|---|
| casos de uso (ator, objetivo, gatilho, fluxo, exceções, resultado) | 01.PRD/0010 | preenchido — 20 casos |
| IN SCOPE | 01.PRD/0011 | preenchido (proposta) |
| OUT OF SCOPE | 01.PRD/0011 | preenchido |
| FUTURE SCOPE | 01.PRD/0011 | preenchido |
| regras operacionais | 01.PRD/0012 | preenchidas; complementos D-102 a D-106 aprovados em 2026-08-07 |
| restrições | 01.PRD/0012 | preenchidas |
| permissões de negócio | 01.PRD/0012 §8 | preenchidas |
| validações obrigatórias | 01.PRD/0012 §9 | preenchidas |
| requisitos funcionais (sem tecnologia) | 01.PRD/0013 | preenchidos — RF-001 a RF-096 |
| requisitos não funcionais | 01.PRD/0014 | preenchidos — RNF-001 a RNF-084 |
| KPIs e metas | 01.PRD/0015 + D-095 | KPIs definidos; metas provisórias permitidas no PRD e calibração pré-piloto mantida |
| critérios de sucesso | 01.PRD/0015 §4 | preenchidos (proposta) |
| programa curricular, módulos, casos e blueprint | 01.PRD/0017 + 90.ANEXOS/0012 | V3 aprovada; blueprint B-07 tecnicamente pronto e mantido como gate pré-piloto |
| consolidação | 01.PRD/0020 | preenchido |
| gate | 01.PRD/0090 | aprovado formalmente em 2026-08-07; readiness 0100 autorizada |
| rastreabilidade Discovery → PRD | 0010 §5, 0012, 0020 | mantida |

## 3. Campos que só podem ser fechados no PRD

Registrados como decisões pendentes, sem antecipar tecnologia:

- Casos de uso completos; ✅ fechado (como proposta)
- IN/OUT/FUTURE documentados; ✅ fechado
- Regras principais; ✅ fechadas tecnicamente, com D-102 a D-106 no checkpoint humano
- Requisitos funcionais; ✅ fechados (como proposta)
- Requisitos não funcionais; ✅ fechados (como proposta)
- Metas definitivas; — calibração depende de baseline B-07, sem bloquear a SPEC
- Critério final de aprovação; ✅ 70% geral + 80% em cada crítico por D-103 aprovada
- Política de certificação; ✅ status de conclusão interno no piloto
- Escopo do MVP; — áreas B-06 confirmadas e público de aproximadamente 10 veterinários fechado por D-079
- Política de acesso aos dados; — FECHADA PARA O MVP (D-077/Anexo 0011: dados mínimos e acesso controlado por Ricardo)

## 4. Campos que só podem ser fechados na SPEC

- Arquitetura detalhada e escolha de fornecedor; a direção proporcional foi aprovada em D-096;
- Domínio;
- Módulos técnicos;
- Dados e persistência;
- APIs;
- Eventos;
- Integrações;
- Observabilidade detalhada; baseline aprovada em D-098;
- Telas detalhadas; superfícies e conteúdo mínimo aprovados em D-090/D-093;
- Segurança técnica detalhada; baseline de identidade/permissões aprovada em D-091/D-092;
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
CAMPOS DE DISCOVERY: REGISTRADOS; GATE APROVADO TECNICAMENTE EM 2026-08-06
CAMPOS DESCONHECIDOS: REGISTRADOS COMO PENDENTES, SEM INVENÇÃO
REQUISITOS DECLARADOS: MATERIALIZADOS NO PRD; D-101 A D-108 AGUARDAM CHECKPOINT HUMANO
FONTES CLÍNICAS: GOVERNANÇA ENXUTA D-075 REGISTRADA; B-04 FECHADO PARA O MVP INTERNO
PROGRAMA: V3 DOCUMENTADA; IMPLEMENTAÇÃO NÃO CRIADA
GATE DISCOVERY: APROVADO FORMALMENTE EM 2026-08-07 SOBRE F6FEFA1
GATE PRD: APROVADO FORMALMENTE DEPOIS DO DISCOVERY NO MESMO CHECKPOINT
SPEC: READINESS 0100 AUTORIZADA; BUILD/AUDIT NÃO INICIADOS
```
